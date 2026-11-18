'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';
import { saveDiscountAction } from '@/app/actions/discounts';
import { requireAdmin } from '@/utils/admin-auth';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');

export const FIRST_50_VIP_CAP = 50;

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
    // ignore in read-only env
  }
}

/**
 * Retrieves all marketing leads merged from the local store and Supabase `leads` table,
 * ordered chronologically by created_at so VIP rank #1 -> #50 is deterministic.
 */
export async function getAllMarketingLeadsAction(): Promise<MarketingLeadRecord[]> {
  const store = readLocalLeadsStore();
  const byEmail = new Map<string, MarketingLeadRecord>();

  for (const lead of Object.values(store.leads)) {
    if (lead.email) {
      byEmail.set(lead.email.toLowerCase().trim(), lead);
    }
  }

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('leads')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && Array.isArray(data)) {
      for (const row of data) {
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
    }
  } catch {
    // Table may not be migrated yet; local store handles everything seamlessly
  }

  // Sort oldest-first to assign accurate 1..N VIP ranks
  const chronological = Array.from(byEmail.values()).sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  );

  let updatedLocal = false;
  chronological.forEach((item, index) => {
    const rank = index + 1;
    const qualifies = rank <= FIRST_50_VIP_CAP;
    if (item.vip_rank !== rank || item.qualifies_for_free_mystery !== qualifies) {
      item.vip_rank = rank;
      item.qualifies_for_free_mystery = qualifies;
      store.leads[item.email] = item;
      updatedLocal = true;
    }
  });

  if (updatedLocal) {
    writeLocalLeadsStore(store);
  }

  // Return newest first for admin display, while preserving each lead's vip_rank
  return [...chronological].reverse();
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
 * Submits a lead into the First 50 VIP Launch Waitlist.
 * Does NOT auto-issue a free mystery code immediately — saves them to the VIP list in Admin Leads
 * so the admin can send out their free mystery code when ready to launch.
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

  // 2. Best-effort insert into Supabase `leads` table if present
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

  // 3. Send Admin Notification & Lead Confirmation Email via Resend
  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: qualifiesForFreeMystery
          ? `🎉 VIP Lead #${vipRank}/50 (Free Mystery Spot): ${cleanName || cleanEmail}`
          : `New Launch Waitlist Lead (#${vipRank}): ${cleanName || cleanEmail}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 12px; border-top: 4px solid #fe04c6;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #fe04c6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">
                ${qualifiesForFreeMystery ? `First 50 VIP Spot #${vipRank} of ${FIRST_50_VIP_CAP}` : `Waitlist Signup #${vipRank}`}
              </p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</strong><br/><a href="mailto:${cleanEmail}" style="color: #fe04c6; text-decoration: none; font-size: 16px; font-weight: bold;">${cleanEmail}</a></p>
              ${cleanName ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/><span style="color: #1a1a1a; font-size: 14px; font-weight: bold;">${cleanName}</span></p>` : ''}
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Source</strong><br/><span style="color: #1a1a1a; font-size: 13px;">${source}</span></p>
              <div style="background-color: #fdf2fa; padding: 14px; border-radius: 8px; margin-top: 16px; border-left: 3px solid #fe04c6;">
                <p style="margin: 0; color: #1a1a1a; font-size: 13px; font-weight: bold;">
                  ${
                    qualifiesForFreeMystery
                      ? `✅ Qualifies for First 50 FREE Mystery (#${vipRank} of 50 — ${spotsRemaining} spots remaining). Go to Admin → Leads to send their free mystery code at launch!`
                      : `Signed up after the first 50 spots (#${vipRank}).`
                  }
                </p>
              </div>
            </div>
          </div>
        `,
      });
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

  // Best-effort email to the VIP lead via Resend
  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: cleanEmail,
        subject: `🎁 Your FREE Murder Mystery Code is Here! (VIP #${target.vip_rank}/50)`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1e191c; color: #ffffff; padding: 36px; border-radius: 24px;">
            <p style="color: #fe04c6; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; margin: 0 0 8px 0;">
              FIRST 50 VIP FOUNDING HOST • SPOT #${target.vip_rank} OF 50
            </p>
            <h1 style="font-size: 28px; font-weight: 900; text-transform: uppercase; margin: 0 0 16px 0; line-height: 1.15;">
              We're Live! Claim Your <span style="color: #fe04c6;">Free Mystery</span>
            </h1>
            <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
              Hi ${target.full_name ? target.full_name.split(' ')[0] : 'there'}, thank you for being one of the first 50 people to join the Back Pocket Mysteries launch list! Here is your exclusive single-use code for a <strong>100% FREE Custom Murder Mystery Game Pack</strong>:
            </p>
            <div style="background-color: #000000; border: 2px dashed #fe04c6; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 24px;">
              <p style="color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 6px 0;">YOUR 100% OFF VIP PROMO CODE</p>
              <p style="color: #fe04c6; font-size: 28px; font-weight: 900; font-family: monospace; letter-spacing: 3px; margin: 0;">${code}</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5;">
              Simply enter this code when creating your account or at checkout on <a href="https://backpocketmysteries.com/en/login?promo=${encodeURIComponent(code)}&step=signup" style="color: #fe04c6; font-weight: bold;">backpocketmysteries.com</a>.
            </p>
          </div>
        `,
      });
    }
  } catch (err) {
    console.error('Failed to email VIP free mystery code:', err);
  }

  revalidatePath('/en/admin/leads');
  return { success: true, code };
}
