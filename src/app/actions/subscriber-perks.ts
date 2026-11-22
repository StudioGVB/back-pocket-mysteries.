'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import { DiscountRecord } from '@/utils/discounts';

export interface MonthlyGiftPassRecord {
  monthKey: string; // e.g. "2026-11"
  code: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  personalMessage?: string | null;
  createdAt: string;
}

export interface SubscriberGiftPassState {
  isSubscribed: boolean;
  currentMonthKey: string;
  currentMonthPass: MonthlyGiftPassRecord | null;
  history: MonthlyGiftPassRecord[];
}

const CRM_PATH = path.join(process.cwd(), 'data', 'customer-crm.json');
const DISCOUNTS_PATH = path.join(process.cwd(), 'data', 'discounts.json');
const PRIMARY_FROM_EMAIL = 'Back Pocket Mysteries <hello@backpocketgames.com>';
const VERIFIED_FALLBACK_FROM = 'Back Pocket Mysteries <support@lancii.com>';

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function resolveResendApiKey(): string | null {
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 10) {
    return process.env.RESEND_API_KEY.trim();
  }
  try {
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/^RESEND_API_KEY=(.+)$/m);
      if (match) {
        const key = match[1].trim().replace(/^["']|["']$/g, '');
        if (key.length > 10) return key;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

function readCrmStore(): Record<string, any> {
  try {
    if (fs.existsSync(CRM_PATH)) {
      return JSON.parse(fs.readFileSync(CRM_PATH, 'utf8'));
    }
  } catch {
    // ignore
  }
  return {};
}

function writeCrmStore(store: Record<string, any>): void {
  try {
    const dir = path.dirname(CRM_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CRM_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch {
    // non-fatal
  }
}

function registerGiftPassInDiscountsStore(code: string, senderEmail: string, recipientEmail?: string | null): void {
  try {
    const dir = path.dirname(DISCOUNTS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let discounts: DiscountRecord[] = [];
    if (fs.existsSync(DISCOUNTS_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(DISCOUNTS_PATH, 'utf8'));
      if (Array.isArray(parsed)) discounts = parsed;
    }

    const now = new Date().toISOString();
    const newDiscount: DiscountRecord = {
      id: `giftpass_${crypto.randomBytes(6).toString('hex')}`,
      name: recipientEmail
        ? `Subscriber Monthly Gift Pass (${senderEmail} → ${recipientEmail})`
        : `Subscriber Monthly Gift Pass (${senderEmail})`,
      code,
      auto_apply: false,
      discount_type: 'percentage',
      discount_value: 100,
      applies_to: 'packages',
      target_packages: ['basic', 'premium', 'grand'],
      target_mysteries: [],
      starts_at: now,
      ends_at: null,
      usage_limit: 'max_uses',
      max_uses: 1,
      times_used: 0,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    discounts.unshift(newDiscount);
    fs.writeFileSync(DISCOUNTS_PATH, JSON.stringify(discounts, null, 2), 'utf8');
  } catch (err) {
    console.error('[GIFT PASS] Failed to register gift code in discounts.json:', err);
  }
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function getSubscriberGiftPassStateForUser(userId: string): Promise<SubscriberGiftPassState> {
  const currentMonthKey = getCurrentMonthKey();

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { isUserAdmin } = await import('@/utils/admin-auth');
    const isAdmin = user ? await isUserAdmin(supabase, user) : false;
    if (!user || (user.id !== userId && !isAdmin)) {
      return {
        isSubscribed: false,
        currentMonthKey,
        currentMonthPass: null,
        history: [],
      };
    }
  } catch {
    return {
      isSubscribed: false,
      currentMonthKey,
      currentMonthPass: null,
      history: [],
    };
  }

  const store = readCrmStore();
  const rec = store[userId] || {};

  let isSubscribed = Boolean(rec?.membership?.isActive);

  // Also check if user has a recent succeeded subscription order in Supabase
  if (!isSubscribed) {
    try {
      const supabase = await createClient();
      const thirtyTwoDaysAgo = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();
      const { data: subOrders } = await supabase
        .from('orders')
        .select('id, amount, mystery_id, created_at')
        .eq('user_id', userId)
        .eq('status', 'succeeded')
        .gte('created_at', thirtyTwoDaysAgo);

      if (
        subOrders &&
        subOrders.some(
          (o: any) =>
            String(o.mystery_id || '').toLowerCase() === 'subscription' ||
            Number(o.amount) >= 3800
        )
      ) {
        isSubscribed = true;
      }
    } catch {
      // ignore
    }
  }

  const history: MonthlyGiftPassRecord[] = Array.isArray(rec.monthlyGiftPasses)
    ? rec.monthlyGiftPasses
    : [];
  const currentMonthPass = history.find((p) => p.monthKey === currentMonthKey) || null;

  return {
    isSubscribed,
    currentMonthKey,
    currentMonthPass,
    history,
  };
}

export async function claimSubscriberMonthlyGiftPassAction(params: {
  recipientEmail?: string;
  recipientName?: string;
  personalMessage?: string;
}): Promise<{
  success: boolean;
  pass?: MonthlyGiftPassRecord;
  emailSent?: boolean;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'You must be signed in to claim your Monthly Gift Pass.' };
  }

  const state = await getSubscriberGiftPassStateForUser(user.id);
  if (!state.isSubscribed) {
    return {
      success: false,
      error: 'An active Unlimited Monthly Subscription is required to claim a Monthly Gift Pass.',
    };
  }

  if (state.currentMonthPass) {
    return {
      success: true,
      pass: state.currentMonthPass,
      emailSent: false,
    };
  }

  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  const code = `GIFT-${suffix}`;
  const now = new Date().toISOString();
  const recipientEmail = params.recipientEmail?.trim() || null;
  const recipientName = params.recipientName?.trim() || null;
  const personalMessage = params.personalMessage?.trim() || null;

  const newPass: MonthlyGiftPassRecord = {
    monthKey: state.currentMonthKey,
    code,
    recipientEmail,
    recipientName,
    personalMessage,
    createdAt: now,
  };

  // Save in CRM store
  const store = readCrmStore();
  const rec = store[user.id] || { userId: user.id };
  const existingPasses: MonthlyGiftPassRecord[] = Array.isArray(rec.monthlyGiftPasses)
    ? rec.monthlyGiftPasses
    : [];
  rec.monthlyGiftPasses = [newPass, ...existingPasses];
  store[user.id] = rec;
  writeCrmStore(store);

  // Register 100%-off single-use gift code in discounts.json
  const senderDisplay =
    user.user_metadata?.full_name || user.email || 'A Back Pocket Mysteries Member';
  registerGiftPassInDiscountsStore(code, user.email || user.id, recipientEmail);

  // Send gift email if recipientEmail was provided
  let emailSent = false;
  if (recipientEmail) {
    const apiKey = resolveResendApiKey();
    if (apiKey) {
      try {
        const resend = new Resend(apiKey);
        const siteUrl =
          process.env.NEXT_PUBLIC_SITE_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'https://mysteries.backpocketgames.com';

        const safeRecipientName = escapeHtml(recipientName || 'there');
        const safeSenderDisplay = escapeHtml(senderDisplay);
        const safePersonalMessage = personalMessage ? escapeHtml(personalMessage) : '';

        const subject = `🎁 ${senderDisplay} gifted you a Free Murder Mystery Party!`;
        const { buildBrandedEmailShell } = await import('@/lib/branded-email-template');
        const html = buildBrandedEmailShell({
          preheader: `${senderDisplay} sent you a 100%-Off Complimentary Murder Mystery Gift Pass (${code}).`,
          kicker: 'COMPLIMENTARY VIP GIFT PASS',
          headline: `${safeSenderDisplay} Gifted You a Murder Mystery Party.`,
          bodyHtml: `
            <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${safeRecipientName},</p>
            <p style="margin:0 0 20px 0;color:#374151;">
              <strong>${safeSenderDisplay}</strong> used their monthly VIP Gift Pass to send you a <strong>100% Free Murder Mystery Party Package</strong> (valid for any mystery up to 16 players).
            </p>
            ${
              safePersonalMessage
                ? `<div style="background-color:#fdf2fa;border-left:4px solid #fe04c6;padding:16px 20px;border-radius:10px;margin:0 0 24px 0;font-style:italic;color:#1e191c;">
                    "${safePersonalMessage}"
                  </div>`
                : ''
            }
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;color:#ffffff;text-align:center;padding:24px;border-radius:12px;margin:0 0 8px 0;">
              <p style="margin:0 0 8px 0;font-size:10px;text-transform:uppercase;letter-spacing:2.2px;color:#fe04c6;font-weight:800;">YOUR 100% OFF GIFT CODE</p>
              <p style="margin:0 0 8px 0;font-size:28px;font-family:monospace;font-weight:900;letter-spacing:3px;color:#ffffff;">${code}</p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Valid for 1 complete mystery package (Basic, Premium, or Grand, up to 16 players)</p>
            </div>
          `,
          ctaText: 'Choose Your Free Mystery →',
          ctaUrl: `${siteUrl}/en/themes`,
        });

        let res = await resend.emails.send({
          from: PRIMARY_FROM_EMAIL,
          to: recipientEmail,
          replyTo: user.email || 'hello@backpocketgames.com',
          subject,
          html,
        });

        if (res.error) {
          res = await resend.emails.send({
            from: VERIFIED_FALLBACK_FROM,
            to: recipientEmail,
            replyTo: user.email || 'hello@backpocketgames.com',
            subject,
            html,
          });
        }

        if (!res.error) {
          emailSent = true;
        }
      } catch (err) {
        console.error('[GIFT PASS] Error sending gift email:', err);
      }
    }
  }

  revalidatePath('/en/account');
  return {
    success: true,
    pass: newPass,
    emailSent,
  };
}
