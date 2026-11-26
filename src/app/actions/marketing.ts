'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';
import {
  saveDiscountAction,
  mintSingleUseGuestSleuthCodeInternal,
} from '@/app/actions/discounts';
import { requireAdmin } from '@/utils/admin-auth';
import { buildVipWelcomeEmailHtml } from '@/lib/vip-welcome-email';
import { buildBrandedEmailShell } from '@/lib/branded-email-template';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

const FIRST_50_VIP_CAP = 50;
// Dedicated Resend Audience for Back Pocket Mysteries Newsletter & First 50 VIP Sign-Ups
const BPM_RESEND_AUDIENCE_ID = '9bd62d9b-d06c-4eac-b4a4-195bb9f7efe8';
const BPM_RESEND_AUDIENCE_NAME = 'Back Pocket Mysteries Newsletter & VIPs';

export interface MarketingLeadRecord {
  id: string;
  email: string;
  full_name: string | null;
  source: string;
  vip_rank: number;
  qualifies_for_free_mystery: boolean;
  free_mystery_code: string | null;
  code_sent_at: string | null;
  marketing_consent: boolean;
  created_at: string;
  resend_contact_id?: string | null;
  country?: string | null;
  ip_address?: string | null;
}

export interface UnifiedNewsletterRecipient {
  email: string;
  full_name: string | null;
  recipient_type: 'newsletter_lead' | 'customer' | 'both';
  vip_rank: number | null;
  qualifies_for_free_mystery: boolean;
  free_mystery_code: string | null;
  code_sent_at: string | null;
  source: string;
  marketing_consent: boolean;
  created_at: string;
  customer_user_id?: string | null;
  country?: string | null;
  ip_address?: string | null;
}

function isoCountryToFlagAndName(countryCode?: string | null, city?: string | null): string | null {
  const code = (countryCode || '').trim().toUpperCase();
  if (!code || code.length !== 2 || code === 'XX' || code === 'T1') return null;
  const flag = String.fromCodePoint(
    ...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
  let fullName = code;
  try {
    const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    fullName = regionNames.of(code) || code;
  } catch {
    fullName = code;
  }
  const cleanCity = city ? city.trim() : '';
  return cleanCity ? `${flag} ${fullName} (${cleanCity})` : `${flag} ${fullName}`;
}

/**
 * Resolves the newsletter subscriber's IP address and country from:
 * 1. Vercel / Cloudflare Edge geolocation headers (`x-vercel-ip-country`, `x-forwarded-for`, `cf-ipcountry`)
 * 2. Fast Geo-IP lookup fallback (`ipapi.co` / `ip-api.com`) when headers are absent or on local dev
 */
async function detectSubscriberIpAndCountry(): Promise<{
  ip_address: string | null;
  country: string | null;
}> {
  let rawIp: string | null = null;
  let countryCode: string | null = null;
  let city: string | null = null;

  try {
    const hdrs = await headers();
    const forwardedFor = hdrs.get('x-forwarded-for');
    if (forwardedFor) {
      rawIp = forwardedFor.split(',')[0]?.trim() || null;
    }
    if (!rawIp) {
      rawIp =
        hdrs.get('x-real-ip')?.trim() ||
        hdrs.get('cf-connecting-ip')?.trim() ||
        hdrs.get('x-client-ip')?.trim() ||
        null;
    }

    countryCode =
      hdrs.get('x-vercel-ip-country')?.trim() ||
      hdrs.get('cf-ipcountry')?.trim() ||
      null;

    const rawCity = hdrs.get('x-vercel-ip-city')?.trim();
    if (rawCity) {
      try {
        city = decodeURIComponent(rawCity);
      } catch {
        city = rawCity;
      }
    }
  } catch {
    // headers() not available outside request context
  }

  const isLocalIp =
    !rawIp ||
    rawIp === '127.0.0.1' ||
    rawIp === '::1' ||
    rawIp.startsWith('192.168.') ||
    rawIp.startsWith('10.') ||
    rawIp.startsWith('::ffff:127.');

  let formattedCountry = isoCountryToFlagAndName(countryCode, city);

  // If edge headers didn't give us the country (or we're testing locally without a public IP header),
  // perform a fast Geo-IP lookup so we still resolve the public IP and country.
  if (!formattedCountry || isLocalIp) {
    try {
      const targetUrl = isLocalIp
        ? 'http://ip-api.com/json/?fields=status,country,countryCode,city,query'
        : `http://ip-api.com/json/${encodeURIComponent(rawIp!)}?fields=status,country,countryCode,city,query`;
      const res = await fetch(targetUrl, {
        signal: AbortSignal.timeout(1800),
        cache: 'no-store',
      });
      if (res.ok) {
        const geo = await res.json();
        if (geo && geo.status === 'success') {
          if (isLocalIp && geo.query) {
            rawIp = String(geo.query);
          }
          if (!formattedCountry && geo.countryCode) {
            formattedCountry = isoCountryToFlagAndName(geo.countryCode, geo.city || null);
          }
        }
      }
    } catch {
      // Fallback to ipapi.co over HTTPS if ip-api is unreachable
      try {
        const fallbackUrl = isLocalIp
          ? 'https://ipapi.co/json/'
          : `https://ipapi.co/${encodeURIComponent(rawIp!)}/json/`;
        const res2 = await fetch(fallbackUrl, {
          signal: AbortSignal.timeout(1800),
          cache: 'no-store',
        });
        if (res2.ok) {
          const geo2 = await res2.json();
          if (isLocalIp && geo2?.ip) {
            rawIp = String(geo2.ip);
          }
          if (!formattedCountry && geo2?.country_code) {
            formattedCountry = isoCountryToFlagAndName(geo2.country_code, geo2.city || null);
          }
        }
      } catch {
        // ignore geo-ip network errors
      }
    }
  }

  return {
    ip_address: rawIp,
    country: formattedCountry,
  };
}

interface LeadsStoreData {
  leads: Record<string, MarketingLeadRecord>;
}

const LEADS_STORE_FILENAME = '.leads-store.json';

function getLeadsStorePath(): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', LEADS_STORE_FILENAME);
  try {
    const dir = path.dirname(cwdPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join('/tmp', LEADS_STORE_FILENAME);
  }
}

let cachedLocalLeadsStore: { mtimeMs: number; data: LeadsStoreData } | null = null;
let cachedMarketingLeads: { fetchedAt: number; data: MarketingLeadRecord[] } | null = null;
const MARKETING_LEADS_CACHE_TTL_MS = 45_000;

function readLocalLeadsStore(): LeadsStoreData {
  const filePath = getLeadsStorePath();
  try {
    const stat = fs.statSync(filePath);
    if (cachedLocalLeadsStore && cachedLocalLeadsStore.mtimeMs === stat.mtimeMs) {
      return cachedLocalLeadsStore.data;
    }
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    const data: LeadsStoreData = {
      leads: parsed.leads || {},
    };
    cachedLocalLeadsStore = { mtimeMs: stat.mtimeMs, data };
    return data;
  } catch {
    if (cachedLocalLeadsStore) return cachedLocalLeadsStore.data;
  }
  return { leads: {} };
}

function writeLocalLeadsStore(data: LeadsStoreData): void {
  cachedMarketingLeads = null;
  const filePath = getLeadsStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    cachedLocalLeadsStore = { mtimeMs: fs.statSync(filePath).mtimeMs, data };
  } catch {
    // ignore in read-only serverless environment
  }
}

/**
 * Encodes lead metadata into Resend Contact `last_name` field so serverless environments
 * without a `public.leads` table still persist source, timestamp, promo code, country, and IP across deploys.
 */
function encodeResendLeadMeta(meta: {
  source?: string;
  ts?: string;
  code?: string | null;
  sentAt?: string | null;
  country?: string | null;
  ip?: string | null;
}): string {
  const parts: string[] = [];
  if (meta.source) parts.push(`source:${meta.source}`);
  if (meta.ts) parts.push(`ts:${meta.ts}`);
  if (meta.code) parts.push(`code:${meta.code}`);
  if (meta.sentAt) parts.push(`sent:${meta.sentAt}`);
  if (meta.country) parts.push(`country:${meta.country.replace(/\|/g, '/')}`);
  if (meta.ip) parts.push(`ip:${meta.ip.replace(/\|/g, '/')}`);
  return parts.join('|');
}

function decodeResendLeadMeta(rawLastName?: string | null): {
  source?: string;
  ts?: string;
  code?: string;
  sentAt?: string;
  country?: string;
  ip?: string;
} {
  if (!rawLastName || !rawLastName.includes(':')) return {};
  const result: Record<string, string> = {};
  for (const part of rawLastName.split('|')) {
    const idx = part.indexOf(':');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      result[k] = v;
    }
  }
  return {
    source: result.source,
    ts: result.ts,
    code: result.code,
    sentAt: result.sent,
    country: result.country,
    ip: result.ip,
  };
}

async function resolveResendAudienceId(): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return BPM_RESEND_AUDIENCE_ID;
}

async function fetchResendAudienceContacts(): Promise<MarketingLeadRecord[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return [];
  const audienceId = await resolveResendAudienceId();
  if (!audienceId) return [];

  try {
    const res = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    const rows = Array.isArray(json?.data) ? json.data : [];

    return rows
      .filter((r: any) => r && r.email)
      .map((r: any) => {
        const meta = decodeResendLeadMeta(r.last_name);
        const createdIso =
          meta.ts ||
          (r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString());
        return {
          id: String(r.id || crypto.randomUUID()),
          email: String(r.email).toLowerCase().trim(),
          full_name: r.first_name || null,
          source: meta.source || 'website_vip_waitlist',
          vip_rank: 0,
          qualifies_for_free_mystery: true,
          free_mystery_code: meta.code || null,
          code_sent_at: meta.sentAt || null,
          marketing_consent: r.unsubscribed !== true,
          created_at: createdIso,
          resend_contact_id: String(r.id),
          country: meta.country || null,
          ip_address: meta.ip || null,
        } satisfies MarketingLeadRecord;
      });
  } catch {
    return [];
  }
}

async function upsertResendAudienceContact(lead: MarketingLeadRecord): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const audienceId = await resolveResendAudienceId();
  if (!audienceId) return;

  const encodedMeta = encodeResendLeadMeta({
    source: lead.source,
    ts: lead.created_at,
    code: lead.free_mystery_code,
    sentAt: lead.code_sent_at,
    country: lead.country,
    ip: lead.ip_address,
  });

  try {
    if (lead.resend_contact_id) {
      await fetch(`https://api.resend.com/audiences/${audienceId}/contacts/${lead.resend_contact_id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: lead.full_name || '',
          last_name: encodedMeta,
          unsubscribed: !lead.marketing_consent,
        }),
      });
    } else {
      await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: lead.email,
          first_name: lead.full_name || '',
          last_name: encodedMeta,
          unsubscribed: !lead.marketing_consent,
        }),
      });
    }
  } catch {
    // ignore
  }
}

/**
 * Retrieves all newsletter / VIP waitlist leads merged from:
 * 1. Resend Cloud Audience (`Back Pocket Mysteries Newsletter & VIPs`) — works across all Vercel serverless instances!
 * 2. Local persistent store (`data/.leads-store.json`)
 * 3. Supabase `leads` table (if present)
 * Ordered chronologically by `created_at` so VIP rank #1 -> #50 is 100% deterministic.
 */
async function fetchAllMarketingLeadsInternal(): Promise<MarketingLeadRecord[]> {
  const now = Date.now();
  if (cachedMarketingLeads && now - cachedMarketingLeads.fetchedAt < MARKETING_LEADS_CACHE_TTL_MS) {
    return cachedMarketingLeads.data;
  }

  const store = readLocalLeadsStore();
  const byEmail = new Map<string, MarketingLeadRecord>();

  // 1. Seed from local store
  for (const lead of Object.values(store.leads)) {
    if (lead.email) {
      byEmail.set(lead.email.toLowerCase().trim(), lead);
    }
  }

  // 2 & 3. Fetch Resend Cloud Audience and Supabase `leads` table concurrently
  const [resendContacts, supabaseRows] = await Promise.all([
    fetchResendAudienceContacts(),
    (async (): Promise<any[]> => {
      try {
        const supabase = await createClient();
        const { data, error } = await (supabase as any)
          .from('leads')
          .select('*')
          .order('created_at', { ascending: true });
        if (!error && Array.isArray(data)) return data;
      } catch {
        // Table may not be migrated yet
      }
      return [];
    })(),
  ]);

  for (const contact of resendContacts) {
    const emailKey = contact.email.toLowerCase().trim();
    const existing = byEmail.get(emailKey);
    byEmail.set(emailKey, {
      id: existing?.id || contact.id,
      email: emailKey,
      full_name: contact.full_name || existing?.full_name || null,
      source: existing?.source || contact.source || 'website_vip_waitlist',
      vip_rank: existing?.vip_rank || 0,
      qualifies_for_free_mystery: existing?.qualifies_for_free_mystery ?? true,
      free_mystery_code: contact.free_mystery_code || existing?.free_mystery_code || null,
      code_sent_at: contact.code_sent_at || existing?.code_sent_at || null,
      marketing_consent: contact.marketing_consent,
      created_at:
        existing?.created_at && existing.created_at < contact.created_at
          ? existing.created_at
          : contact.created_at,
      resend_contact_id: contact.resend_contact_id || existing?.resend_contact_id || null,
      country: existing?.country || contact.country || null,
      ip_address: existing?.ip_address || contact.ip_address || null,
    });
  }

  for (const row of supabaseRows) {
    if (!row.email) continue;
    const emailKey = String(row.email).toLowerCase().trim();
    const existing = byEmail.get(emailKey);
    byEmail.set(emailKey, {
      id: existing?.id || String(row.id || crypto.randomUUID()),
      email: emailKey,
      full_name: row.full_name ?? existing?.full_name ?? null,
      source: row.source || existing?.source || 'website',
      vip_rank: existing?.vip_rank || Number(row.vip_rank) || 0,
      qualifies_for_free_mystery:
        existing?.qualifies_for_free_mystery ??
        Boolean(row.qualifies_for_free_mystery),
      free_mystery_code: existing?.free_mystery_code || row.free_mystery_code || null,
      code_sent_at: existing?.code_sent_at || row.code_sent_at || null,
      marketing_consent: row.marketing_consent !== false,
      created_at: row.created_at || existing?.created_at || new Date().toISOString(),
      country: existing?.country || row.country || null,
      ip_address: existing?.ip_address || row.ip_address || null,
    });
  }

  // Sort oldest-first to assign accurate 1..N VIP ranks (#1 -> #50)
  const chronological = Array.from(byEmail.values()).sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  );

  let updatedLocal = false;
  chronological.forEach((item, index) => {
    const rank = index + 1;
    const qualifies = rank <= FIRST_50_VIP_CAP;
    if (
      item.vip_rank !== rank ||
      item.qualifies_for_free_mystery !== qualifies ||
      !store.leads[item.email]
    ) {
      item.vip_rank = rank;
      item.qualifies_for_free_mystery = qualifies;
      store.leads[item.email] = item;
      updatedLocal = true;
    }
  });

  if (updatedLocal) {
    writeLocalLeadsStore(store);
  }

  // Return newest first for admin display, while preserving each lead's deterministic vip_rank
  const result = [...chronological].reverse();
  cachedMarketingLeads = { fetchedAt: Date.now(), data: result };
  return result;
}

export async function getAllMarketingLeadsAction(): Promise<MarketingLeadRecord[]> {
  await requireAdmin();
  return fetchAllMarketingLeadsInternal();
}

/**
 * Returns the combined Newsletter Audience:
 * - Separate Newsletter / VIP Waitlist Leads (email-only signups without customer accounts/guests)
 * - Registered Customer Accounts (`profiles`), who also receive the newsletter automatically
 */
export async function getUnifiedNewsletterDirectoryAction(): Promise<{
  newsletterLeads: MarketingLeadRecord[];
  customerSubscribers: {
    id: string;
    email: string;
    full_name: string | null;
    country: string | null;
    created_at: string;
    also_in_vip_leads: boolean;
    vip_rank: number | null;
  }[];
  combinedActiveEmails: { email: string; full_name: string | null; source_type: 'vip_lead' | 'customer' }[];
}> {
  await requireAdmin();
  const newsletterLeads = await fetchAllMarketingLeadsInternal();
  const leadByEmail = new Map<string, MarketingLeadRecord>();
  for (const l of newsletterLeads) {
    leadByEmail.set(l.email.toLowerCase().trim(), l);
  }

  const customerSubscribers: {
    id: string;
    email: string;
    full_name: string | null;
    country: string | null;
    created_at: string;
    also_in_vip_leads: boolean;
    vip_rank: number | null;
  }[] = [];

  try {
    const supabase = await createClient();
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name, country, created_at')
      .order('created_at', { ascending: false });

    if (Array.isArray(profiles)) {
      for (const p of profiles) {
        if (!p.email) continue;
        const clean = String(p.email).toLowerCase().trim();
        const matchingLead = leadByEmail.get(clean);
        customerSubscribers.push({
          id: String(p.id),
          email: clean,
          full_name: p.full_name || matchingLead?.full_name || null,
          country: p.country || null,
          created_at: p.created_at || new Date().toISOString(),
          also_in_vip_leads: Boolean(matchingLead),
          vip_rank: matchingLead?.vip_rank ?? null,
        });
      }
    }
  } catch {
    // ignore
  }

  // Build deduplicated combined list of everyone who receives the Weekly EDM newsletter
  const combinedMap = new Map<
    string,
    { email: string; full_name: string | null; source_type: 'vip_lead' | 'customer' }
  >();
  const unsubscribedEmails = new Set<string>();

  for (const lead of newsletterLeads) {
    const cleanEmail = (lead.email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) continue;
    if (lead.marketing_consent === false) {
      unsubscribedEmails.add(cleanEmail);
      continue;
    }
    combinedMap.set(cleanEmail, {
      email: cleanEmail,
      full_name: lead.full_name,
      source_type: 'vip_lead',
    });
  }

  for (const cust of customerSubscribers) {
    const cleanEmail = (cust.email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) continue;
    if (unsubscribedEmails.has(cleanEmail)) continue;
    if (!combinedMap.has(cleanEmail)) {
      combinedMap.set(cleanEmail, {
        email: cleanEmail,
        full_name: cust.full_name,
        source_type: 'customer',
      });
    } else {
      // If they are on both lists and the customer profile has a full_name when the lead record didn't, enrich it in place
      const existing = combinedMap.get(cleanEmail)!;
      if (!existing.full_name && cust.full_name) {
        combinedMap.set(cleanEmail, {
          ...existing,
          full_name: cust.full_name,
        });
      }
    }
  }

  return {
    newsletterLeads,
    customerSubscribers,
    combinedActiveEmails: Array.from(combinedMap.values()),
  };
}

/**
 * Public action for the website banner/popup & footer to display live "X of 50 free mystery spots remaining".
 */
export async function getLaunchWaitlistStatusAction(): Promise<{
  totalLeads: number;
  vipCap: number;
  spotsRemaining: number;
  isFirst50Open: boolean;
}> {
  const all = await fetchAllMarketingLeadsInternal();
  const totalLeads = all.length;
  const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - totalLeads);
  return {
    totalLeads,
    vipCap: FIRST_50_VIP_CAP,
    spotsRemaining,
    isFirst50Open: spotsRemaining > 0,
  };
}

/**
 * Submits a lead into the First 50 VIP Launch Waitlist & Newsletter Directory.
 * Stored separately from Customer accounts, persisted to Resend Cloud Audience + local store,
 * and tallied 1..50 so the admin can dispatch their 100%-Off Promo Code at launch.
 */
export async function submitEmailLead(
  email: string,
  fullName?: string,
  source = 'website_vip_waitlist'
): Promise<{
  success: boolean;
  alreadyRegistered?: boolean;
  vipRank?: number;
  qualifiesForFreeMystery?: boolean;
  spotsRemaining?: number;
  error?: string;
}> {
  const { getCallerIpAddress, checkRateLimitBucket } = await import('@/utils/rate-limit');
  const callerIp = await getCallerIpAddress();
  const limit = checkRateLimitBucket({
    key: `lead-form:${callerIp}`,
    maxCount: 10,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return {
      success: false,
      error: `Too many requests in a short window. Please wait ${limit.retryAfterSeconds} seconds and try again.`,
    };
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim() || null;

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const [all, geoInfo] = await Promise.all([
    fetchAllMarketingLeadsInternal(),
    detectSubscriberIpAndCountry(),
  ]);
  const existing = all.find((l) => l.email.toLowerCase() === cleanEmail);

  const resolvedCountry = geoInfo.country || existing?.country || null;
  const resolvedIp = geoInfo.ip_address || existing?.ip_address || null;
  const countryAndIpSummary = resolvedCountry
    ? `${resolvedCountry}${resolvedIp ? ` • IP: ${resolvedIp}` : ''}`
    : resolvedIp
    ? `IP: ${resolvedIp}`
    : 'Unknown location';

  const buildAdminLeadAlertPayload = (
    rank: number,
    qualifies: boolean,
    remaining: number,
    leadName: string | null,
    isRepeat = false
  ) => ({
    from: 'Back Pocket Mysteries Alerts <alerts@backpocketgames.com>',
    to: ['hello@backpocketgames.com', 'hello@studiogvb.com'],
    replyTo: cleanEmail,
    subject: qualifies
      ? `🎉 Free Mystery VIP Signup #${rank}/50${isRepeat ? ' (Re-checked)' : ''}: ${leadName || cleanEmail}${resolvedCountry ? ` [${resolvedCountry}]` : ''}`
      : `New Launch Waitlist Lead (#${rank}): ${leadName || cleanEmail}${resolvedCountry ? ` [${resolvedCountry}]` : ''}`,
    html: buildBrandedEmailShell({
      preheader: `${leadName || cleanEmail} (${countryAndIpSummary}) just claimed VIP Spot #${rank} of ${FIRST_50_VIP_CAP} (${remaining} spots left).`,
      kicker: qualifies
        ? `FIRST 50 FREE MYSTERY VIP SPOT #${rank} OF ${FIRST_50_VIP_CAP}`
        : `NEWSLETTER & WAITLIST SIGNUP #${rank}`,
      headline: `New Free Mystery VIP Signup!`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Subscriber Email</span><br/>
              <a href="mailto:${cleanEmail}" style="color:#fe04c6;text-decoration:none;font-size:16px;font-weight:800;">${cleanEmail}</a>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Name</span><br/>
              <span style="color:#1e191c;font-size:15px;font-weight:700;">${leadName || 'Not provided (Email-only Lead)'}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Country &amp; IP Address</span><br/>
              <span style="color:#1e191c;font-size:14px;font-weight:700;">${countryAndIpSummary}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Signup Source</span><br/>
              <span style="color:#1e191c;font-size:14px;font-weight:600;">${source}</span>
            </td>
          </tr>
        </table>
        <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:18px 22px;border-radius:12px;">
          <p style="margin:0 0 4px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
            FIRST 50 VIP TALLY STATUS
          </p>
          <p style="margin:0;color:#ffffff;font-size:14px;font-weight:700;line-height:1.6;">
            ${
              qualifies
                ? `✓ Qualifies for First 50 FREE Mystery (Spot #${rank} of 50 — ${remaining} spots remaining). Open Admin → Leads to dispatch their 100%-off promo code whenever you're ready.`
                : `Registered after the first 50 spots (#${rank}). Added to your Newsletter Subscribers list.`
            }
          </p>
        </div>
      `,
      ctaText: 'Open Admin → Leads & Send Free Code →',
      ctaUrl: 'https://backpocketmysteries.com/en/admin/leads',
    }),
  });

  if (existing) {
    // Backfill country & IP if not previously recorded
    if ((!existing.country && resolvedCountry) || (!existing.ip_address && resolvedIp)) {
      const updatedExisting: MarketingLeadRecord = {
        ...existing,
        country: existing.country || resolvedCountry,
        ip_address: existing.ip_address || resolvedIp,
      };
      const store = readLocalLeadsStore();
      store.leads[cleanEmail] = updatedExisting;
      writeLocalLeadsStore(store);
      await upsertResendAudienceContact(updatedExisting);
    }

    const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - all.length);
    try {
      if (process.env.RESEND_API_KEY) {
        const firstName = (cleanName || existing.full_name || '').split(' ')[0] || 'there';
        const subPayload = {
          from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
          to: [cleanEmail],
          replyTo: 'Hello@backpocketgames.com',
          subject: existing.qualifies_for_free_mystery
            ? `🎉 You're In! VIP Spot #${existing.vip_rank}/50 Locked In (Your Free Mystery Awaits)`
            : `🎉 You're In! Welcome to the Back Pocket Mysteries VIP Launch List`,
          html: buildVipWelcomeEmailHtml({
            firstName,
            vipRank: existing.vip_rank,
            vipCap: FIRST_50_VIP_CAP,
            qualifiesForFreeMystery: existing.qualifies_for_free_mystery,
            spotsRemaining,
          }),
        };
        const admPayload = buildAdminLeadAlertPayload(
          existing.vip_rank,
          existing.qualifies_for_free_mystery,
          spotsRemaining,
          cleanName || existing.full_name,
          true
        );
        await resend.batch.send([subPayload, admPayload]);
      }
    } catch (err) {
      console.error('Failed to resend VIP welcome email:', err);
    }
    return {
      success: true,
      alreadyRegistered: true,
      vipRank: existing.vip_rank,
      qualifiesForFreeMystery: existing.qualifies_for_free_mystery,
      spotsRemaining,
    };
  }

  const vipRank = all.length + 1;
  const qualifiesForFreeMystery = vipRank <= FIRST_50_VIP_CAP;
  const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - vipRank);
  const nowIso = new Date().toISOString();

  const newLead: MarketingLeadRecord = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    full_name: cleanName,
    source,
    vip_rank: vipRank,
    qualifies_for_free_mystery: qualifiesForFreeMystery,
    free_mystery_code: null,
    code_sent_at: null,
    marketing_consent: true,
    created_at: nowIso,
    country: resolvedCountry,
    ip_address: resolvedIp,
  };

  // 1. Save to local persistent store
  const store = readLocalLeadsStore();
  store.leads[cleanEmail] = newLead;
  writeLocalLeadsStore(store);

  // 2. Save to Resend Cloud Audience (persists across all Vercel serverless invocations!)
  await upsertResendAudienceContact(newLead);

  // 3. Best-effort insert into Supabase `leads` table if present
  try {
    const supabase = await createClient();
    await (supabase as any).from('leads').insert([
      {
        email: cleanEmail,
        full_name: cleanName,
        marketing_consent: true,
      },
    ]);
  } catch {
    // Non-fatal if `leads` table is not migrated yet
  }

  // 4. Send Subscriber "You're In!" Welcome Email + Fully Branded Admin Notification via Resend
  try {
    if (process.env.RESEND_API_KEY) {
      const firstName = cleanName ? cleanName.split(' ')[0] : 'there';

      const subscriberEmailPayload = {
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: [cleanEmail],
        replyTo: 'Hello@backpocketgames.com',
        subject: qualifiesForFreeMystery
          ? `🎉 You're In! VIP Spot #${vipRank}/50 Locked In (Your Free Mystery Awaits)`
          : `🎉 You're In! Welcome to the Back Pocket Mysteries VIP Launch List`,
        html: buildVipWelcomeEmailHtml({
          firstName,
          vipRank,
          vipCap: FIRST_50_VIP_CAP,
          qualifiesForFreeMystery,
          spotsRemaining,
        }),
      };

      const adminEmailPayload = buildAdminLeadAlertPayload(
        vipRank,
        qualifiesForFreeMystery,
        spotsRemaining,
        cleanName,
        false
      );

      // Dispatch both emails in a single atomic Resend batch call (avoids 2 req/sec rate limit drops)
      const batchRes = await resend.batch.send([subscriberEmailPayload, adminEmailPayload]);
      if (batchRes.error) {
        console.warn('[VIP LEAD EMAIL] Batch send returned error, retrying individually:', batchRes.error);
        const subRes = await resend.emails.send(subscriberEmailPayload);
        if (subRes.error) {
          console.error('[VIP LEAD EMAIL] Subscriber welcome email error:', subRes.error);
        }
        await new Promise((r) => setTimeout(r, 650));
        const admRes = await resend.emails.send(adminEmailPayload);
        if (admRes.error) {
          console.error('[VIP LEAD EMAIL] Admin notification email error:', admRes.error);
        }
      }
    }
  } catch (err) {
    console.error('Failed to send marketing lead email notification:', err);
  }

  revalidatePath('/', 'layout');

  return {
    success: true,
    vipRank,
    qualifiesForFreeMystery,
    spotsRemaining,
  };
}

/**
 * Admin Action: Sends a test preview of the "You're In!" VIP Welcome Email OR the Branded Admin Lead Alert to any email address.
 */
export async function adminSendTestVipWelcomeEmailAction(
  toEmail: string,
  sampleName = 'Gabby',
  sampleRank = 1
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();
  const cleanEmail = (toEmail || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid recipient email.' };
  }
  try {
    if (!process.env.RESEND_API_KEY) {
      return { success: false, error: 'RESEND_API_KEY is not configured in .env.local.' };
    }
    await resend.emails.send({
      from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
      to: cleanEmail,
      subject: `🎉 You're In! VIP Spot #${sampleRank}/50 Locked In (Your Free Mystery Awaits)`,
      html: buildVipWelcomeEmailHtml({
        firstName: sampleName,
        vipRank: sampleRank,
        vipCap: FIRST_50_VIP_CAP,
        qualifiesForFreeMystery: true,
        spotsRemaining: Math.max(0, FIRST_50_VIP_CAP - sampleRank),
      }),
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send test welcome email.' };
  }
}

/**
 * Admin Action: Manually add a newsletter subscriber / VIP lead from the Admin dashboard.
 */
export async function adminAddNewsletterLeadAction(
  email: string,
  fullName?: string
): Promise<{ success: boolean; error?: string; lead?: MarketingLeadRecord }> {
  await requireAdmin();
  const res = await submitEmailLead(email, fullName, 'admin_manual_entry');
  if (!res.success) {
    return { success: false, error: res.error || 'Could not add subscriber.' };
  }
  const all = await getAllMarketingLeadsAction();
  const lead = all.find((l) => l.email.toLowerCase() === email.trim().toLowerCase());
  return { success: true, lead };
}

/**
 * Admin Action: Generates a single-use 100%-Off Free Mystery code for a specific VIP lead
 * and emails it directly to them when you are ready to launch!
 */
export async function adminSendFreeMysteryCodeToLeadAction(leadEmail: string): Promise<{
  success: boolean;
  code?: string;
  error?: string;
}> {
  await requireAdmin();
  const cleanEmail = (leadEmail || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Missing lead email.' };
  }

  const store = readLocalLeadsStore();
  const all = await getAllMarketingLeadsAction();
  const target = all.find((l) => l.email.toLowerCase() === cleanEmail);

  if (!target) {
    return { success: false, error: 'Lead not found.' };
  }

  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const rankTag = String(target.vip_rank || 1).padStart(2, '0');
  const code = target.free_mystery_code || `VIP50-${rankTag}-${suffix}`;

  // Register a 100% off single-use 6-Player (Basic) discount code in the Discounts Store
  await saveDiscountAction({
    name: `First 50 VIP Free 6-Player Mystery (#${target.vip_rank} - ${target.full_name || cleanEmail})`,
    code,
    auto_apply: false,
    discount_type: 'percentage',
    discount_value: 100,
    applies_to: 'packages',
    target_packages: ['basic'],
    target_mysteries: [],
    starts_at: new Date().toISOString(),
    ends_at: null,
    usage_limit: 'max_uses',
    max_uses: 1,
    is_active: true,
  });

  const nowIso = new Date().toISOString();
  target.free_mystery_code = code;
  target.code_sent_at = nowIso;
  store.leads[cleanEmail] = target;
  writeLocalLeadsStore(store);

  // Persist promo code status into Resend Cloud Audience contact metadata
  await upsertResendAudienceContact(target);

  // Email the 100%-Off VIP Code to the lead via Resend with full Back Pocket Mysteries branding
  try {
    if (process.env.RESEND_API_KEY) {
      const firstName = target.full_name ? target.full_name.split(' ')[0] : 'there';
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: cleanEmail,
        subject: `🎁 Your FREE 6-Player Murder Mystery Code is Here! (VIP #${target.vip_rank}/50)`,
        html: buildBrandedEmailShell({
          preheader: `Your 100%-Off Founding Host VIP code (${code}) for a 6-Player Mystery Pack is ready to redeem.`,
          kicker: `FIRST 50 VIP FOUNDING HOST • SPOT #${target.vip_rank} OF 50`,
          headline: `We're Live — Claim Your Complimentary 6-Player Mystery Pack.`,
          bodyHtml: `
            <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${firstName},</p>
            <p style="margin:0 0 24px 0;color:#374151;">
              Thank you for being one of the first 50 founding hosts on the Back Pocket Mysteries launch list. Below is your personal single-use code for a <strong>100% FREE 6-Player Custom Murder Mystery Game Pack (Basic Tier)</strong>:
            </p>
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="color:#fe04c6;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2.2px;margin:0 0 8px 0;">YOUR 100% OFF VIP 6-PLAYER PROMO CODE</p>
              <p style="color:#ffffff;font-size:28px;font-weight:900;font-family:monospace;letter-spacing:3px;margin:0 0 8px 0;">${code}</p>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">Valid for 1 complete 6-Player (Basic) custom mystery package • Single-use • Locked to your email</p>
            </div>
            <p style="margin:0;color:#52525b;font-size:14px;line-height:1.6;">
              Click the button below to create your account, cast up to 6 players, and apply your code directly at checkout.
            </p>
          `,
          ctaText: 'Redeem Your Free 6-Player Mystery →',
          ctaUrl: `https://backpocketmysteries.com/en/login?promo=${encodeURIComponent(code)}&step=signup`,
        }),
      });
    }
  } catch (err) {
    console.error('Failed to email VIP free mystery code:', err);
  }

  revalidatePath('/en/admin/leads');
  return {
    success: true,
    code,
  };
}

/**
 * Post-Party Guest Finale Action:
 * When a guest finishes Round 3 and enters their email on the Stage 4 Finale screen,
 * this action:
 * 1. Mints a random, strictly single-use (`max_uses: 1`) 15% Off Next-Host promo code (`SLEUTH-XXXXXX`)
 *    tied to their email (or returns their existing code if they already claimed one).
 * 2. Adds the guest to the unified Newsletter / Marketing Leads store & Resend Cloud Audience
 *    with `marketing_consent: true` and `source: 'playroom_finale_guest_reward'`.
 * 3. Sends them a branded email with their personal single-use promo code and their Detective Wrapped recap.
 */
export async function claimGuestPostPartyRewardAction(params: {
  email: string;
  playerName?: string | null;
  characterRole?: string | null;
  mysteryTitle?: string | null;
  awardLabel?: string | null;
  correctVotes?: number;
  totalVotes?: number;
}): Promise<{
  success: boolean;
  code?: string;
  email?: string;
  error?: string;
}> {
  const cleanEmail = (params.email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const cleanPlayerName = (params.playerName || '').trim() || null;
  const mysteryTitle = (params.mysteryTitle || '').trim() || 'Back Pocket Mysteries';
  const characterRole = (params.characterRole || '').trim() || 'Suspect';
  const awardLabel = (params.awardLabel || '').trim() || 'Certified Detective';
  const correctVotes = typeof params.correctVotes === 'number' ? params.correctVotes : 0;
  const totalVotes = typeof params.totalVotes === 'number' ? params.totalVotes : 3;

  try {
    const [all, geoInfo] = await Promise.all([
      getAllMarketingLeadsAction(),
      detectSubscriberIpAndCountry(),
    ]);
    const existing = all.find((l) => l.email.toLowerCase() === cleanEmail);

    const existingSleuthCode =
      existing?.free_mystery_code && existing.free_mystery_code.startsWith('SLEUTH-')
        ? existing.free_mystery_code
        : null;

    const { code } = await mintSingleUseGuestSleuthCodeInternal({
      email: cleanEmail,
      playerName: cleanPlayerName || existing?.full_name || cleanEmail,
      existingCode: existingSleuthCode,
    });

    const nowIso = new Date().toISOString();
    const store = readLocalLeadsStore();
    const resolvedCountry = geoInfo.country || existing?.country || null;
    const resolvedIp = geoInfo.ip_address || existing?.ip_address || null;

    // Preserve VIP50-* code on the lead record if they were already a First 50 VIP Founding Host;
    // otherwise store their SLEUTH-XXXXXX code in free_mystery_code so it syncs to Resend Cloud Audience.
    const preservedLeadCode =
      existing?.free_mystery_code && existing.free_mystery_code.startsWith('VIP50-')
        ? existing.free_mystery_code
        : code;

    const leadRecord: MarketingLeadRecord = existing
      ? {
          ...existing,
          full_name: existing.full_name || cleanPlayerName,
          free_mystery_code: preservedLeadCode,
          code_sent_at: existing.code_sent_at || nowIso,
          marketing_consent: true,
          country: existing.country || resolvedCountry,
          ip_address: existing.ip_address || resolvedIp,
        }
      : {
          id: crypto.randomUUID(),
          email: cleanEmail,
          full_name: cleanPlayerName,
          source: 'playroom_finale_guest_reward',
          vip_rank: all.length + 1,
          qualifies_for_free_mystery: all.length + 1 <= FIRST_50_VIP_CAP,
          free_mystery_code: code,
          code_sent_at: nowIso,
          marketing_consent: true,
          created_at: nowIso,
          country: resolvedCountry,
          ip_address: resolvedIp,
        };

    store.leads[cleanEmail] = leadRecord;
    writeLocalLeadsStore(store);
    await upsertResendAudienceContact(leadRecord);

    try {
      const supabase = await createClient();
      if (!existing) {
        await (supabase as any).from('leads').insert([
          {
            email: cleanEmail,
            full_name: cleanPlayerName,
            marketing_consent: true,
          },
        ]);
      }
    } catch {
      // Non-fatal if leads table is not migrated
    }

    // Email the guest their single-use 15% Off code + Detective Wrapped scorecard recap
    if (process.env.RESEND_API_KEY) {
      const firstName = (cleanPlayerName || existing?.full_name || 'Detective').split(' ')[0];
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: cleanEmail,
        replyTo: 'Hello@backpocketgames.com',
        subject: `🎁 Your 15% Off Next-Host Code (${code}) + Detective Wrapped Recap`,
        html: buildBrandedEmailShell({
          preheader: `Your personal single-use 15% Off Host Code (${code}) and your Detective Wrapped scorecard from ${mysteryTitle}.`,
          kicker: `POST-PARTY DETECTIVE REWARD • SINGLE-USE VOUCHER`,
          headline: `Ready to Host Your Group's Next Mystery Night?`,
          bodyHtml: `
            <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${firstName},</p>
            <p style="margin:0 0 20px 0;color:#374151;line-height:1.7;">
              Thanks for playing <strong>${mysteryTitle}</strong> tonight as <strong>${characterRole}</strong>! Below is your personal single-use <strong>15% Off Next-Host Promo Code</strong> plus your official Detective Wrapped summary.
            </p>

            <!-- PERSONAL SINGLE-USE PROMO CODE BOX -->
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;border-radius:12px;padding:24px;text-align:center;margin-bottom:22px;">
              <p style="color:#fe04c6;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2.2px;margin:0 0 8px 0;">
                YOUR PERSONAL SINGLE-USE 15% OFF HOST CODE
              </p>
              <p style="color:#ffffff;font-size:28px;font-weight:900;font-family:monospace;letter-spacing:3px;margin:0 0 8px 0;">
                ${code}
              </p>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">
                Valid for 15% off any Back Pocket Mysteries package • Single-use • Unlocks any theme
              </p>
            </div>

            <!-- DETECTIVE WRAPPED RECAP CARD -->
            <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin-bottom:16px;">
              <p style="margin:0 0 6px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:1.8px;text-transform:uppercase;">
                TONIGHT'S DETECTIVE WRAPPED SCORECARD
              </p>
              <p style="margin:0 0 6px 0;color:#1e191c;font-size:16px;font-weight:900;">
                ${awardLabel} • ${correctVotes}/${totalVotes} Rounds Correct
              </p>
              <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">
                Mystery: <strong>${mysteryTitle}</strong> · Role Played: <strong>${characterRole}</strong>
              </p>
            </div>
          `,
          ctaText: 'Browse Mystery Themes & Host Next →',
          ctaUrl:
            'https://backpocketmysteries.com/en/themes?utm_source=playroom_finale&utm_medium=email&utm_campaign=guest_to_host_reward',
          footerNote:
            'You are receiving this email because you requested your Detective Wrapped scorecard and Next-Host reward code after playing a Back Pocket Mysteries party.',
        }),
      });
    }

    revalidatePath('/en/admin/leads');
    return {
      success: true,
      email: cleanEmail,
    };
  } catch (err: any) {
    console.error('Error claiming guest post-party reward code:', err);
    return {
      success: false,
      error: err?.message || 'Could not generate your reward code. Please try again.',
    };
  }
}
