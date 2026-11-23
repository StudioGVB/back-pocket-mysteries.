'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';
import { saveDiscountAction } from '@/app/actions/discounts';
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

function readLocalLeadsStore(): LeadsStoreData {
  const filePath = getLeadsStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        leads: parsed.leads || {},
      };
    }
  } catch {
    // ignore
  }
  return { leads: {} };
}

function writeLocalLeadsStore(data: LeadsStoreData): void {
  const filePath = getLeadsStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore in read-only serverless environment
  }
}

/**
 * Encodes lead metadata into Resend Contact `last_name` field so serverless environments
 * without a `public.leads` table still persist source, timestamp, and promo code state across deploys.
 */
function encodeResendLeadMeta(meta: {
  source?: string;
  ts?: string;
  code?: string | null;
  sentAt?: string | null;
}): string {
  const parts: string[] = [];
  if (meta.source) parts.push(`source:${meta.source}`);
  if (meta.ts) parts.push(`ts:${meta.ts}`);
  if (meta.code) parts.push(`code:${meta.code}`);
  if (meta.sentAt) parts.push(`sent:${meta.sentAt}`);
  return parts.join('|');
}

function decodeResendLeadMeta(rawLastName?: string | null): {
  source?: string;
  ts?: string;
  code?: string;
  sentAt?: string;
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

  try {
    await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: lead.email,
        first_name: lead.full_name || '',
        last_name: encodeResendLeadMeta({
          source: lead.source,
          ts: lead.created_at,
          code: lead.free_mystery_code,
          sentAt: lead.code_sent_at,
        }),
        unsubscribed: !lead.marketing_consent,
      }),
    });
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
export async function getAllMarketingLeadsAction(): Promise<MarketingLeadRecord[]> {
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
  return [...chronological].reverse();
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
  const newsletterLeads = await getAllMarketingLeadsAction();
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

  for (const lead of newsletterLeads) {
    if (lead.marketing_consent !== false && lead.email) {
      combinedMap.set(lead.email.toLowerCase().trim(), {
        email: lead.email.toLowerCase().trim(),
        full_name: lead.full_name,
        source_type: 'vip_lead',
      });
    }
  }

  for (const cust of customerSubscribers) {
    if (cust.email && !combinedMap.has(cust.email)) {
      combinedMap.set(cust.email, {
        email: cust.email,
        full_name: cust.full_name,
        source_type: 'customer',
      });
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
  const all = await getAllMarketingLeadsAction();
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
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim() || null;

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const all = await getAllMarketingLeadsAction();
  const existing = all.find((l) => l.email.toLowerCase() === cleanEmail);

  if (existing) {
    const spotsRemaining = Math.max(0, FIRST_50_VIP_CAP - all.length);
    // Still send the subscriber their "You're In!" confirmation email if they re-submit to check their spot
    try {
      if (process.env.RESEND_API_KEY) {
        const firstName = (cleanName || existing.full_name || '').split(' ')[0] || 'there';
        await resend.emails.send({
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
        });
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

      const adminEmailPayload = {
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: ['Hello@backpocketgames.com'],
        replyTo: cleanEmail,
        subject: qualifiesForFreeMystery
          ? `🎉 VIP Lead #${vipRank}/50 (Free Mystery Spot): ${cleanName || cleanEmail}`
          : `New Launch Waitlist Lead (#${vipRank}): ${cleanName || cleanEmail}`,
        html: buildBrandedEmailShell({
          preheader: `${cleanName || cleanEmail} just claimed VIP Spot #${vipRank} of ${FIRST_50_VIP_CAP} (${spotsRemaining} spots left).`,
          kicker: qualifiesForFreeMystery
            ? `FIRST 50 VIP SPOT #${vipRank} OF ${FIRST_50_VIP_CAP}`
            : `NEWSLETTER & WAITLIST SIGNUP #${vipRank}`,
          headline: `New VIP Launch Waitlist Registration`,
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
                  <span style="color:#1e191c;font-size:15px;font-weight:700;">${cleanName || 'Not provided (Email-only Lead)'}</span>
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
                  qualifiesForFreeMystery
                    ? `✓ Qualifies for First 50 FREE Mystery (Spot #${vipRank} of 50 — ${spotsRemaining} spots remaining). Open Admin → Newsletter & VIP Leads to dispatch their 100%-off promo code on launch day.`
                    : `Registered after the first 50 spots (#${vipRank}). Added to your Newsletter Subscribers list.`
                }
              </p>
            </div>
          `,
          ctaText: 'Open Newsletter & VIP Leads →',
          ctaUrl: 'https://backpocketmysteries.com/en/admin/leads',
        }),
      };

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

  // Register a 100% off single-use discount code in the Discounts Store
  await saveDiscountAction({
    name: `First 50 VIP Free Mystery (#${target.vip_rank} - ${target.full_name || cleanEmail})`,
    code,
    auto_apply: false,
    discount_type: 'percentage',
    discount_value: 100,
    applies_to: 'all',
    target_packages: [],
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
        subject: `🎁 Your FREE Murder Mystery Code is Here! (VIP #${target.vip_rank}/50)`,
        html: buildBrandedEmailShell({
          preheader: `Your 100%-Off Founding Host VIP code (${code}) is ready to redeem.`,
          kicker: `FIRST 50 VIP FOUNDING HOST • SPOT #${target.vip_rank} OF 50`,
          headline: `We're Live — Claim Your Complimentary Mystery Pack.`,
          bodyHtml: `
            <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${firstName},</p>
            <p style="margin:0 0 24px 0;color:#374151;">
              Thank you for being one of the first 50 founding hosts on the Back Pocket Mysteries launch list. Below is your personal single-use code for a <strong>100% FREE Custom Murder Mystery Game Pack</strong>:
            </p>
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="color:#fe04c6;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2.2px;margin:0 0 8px 0;">YOUR 100% OFF VIP PROMO CODE</p>
              <p style="color:#ffffff;font-size:28px;font-weight:900;font-family:monospace;letter-spacing:3px;margin:0 0 8px 0;">${code}</p>
              <p style="color:#a1a1aa;font-size:12px;margin:0;">Valid for 1 complete custom mystery package on backpocketmysteries.com</p>
            </div>
            <p style="margin:0;color:#52525b;font-size:14px;line-height:1.6;">
              Click the button below to create your account or apply your code directly at checkout.
            </p>
          `,
          ctaText: 'Redeem Your Free Mystery →',
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
