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

export async function getSubscriberGiftPassStateForUser(userId: string): Promise<SubscriberGiftPassState> {
  const currentMonthKey = getCurrentMonthKey();
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
        .select('id, amount, created_at')
        .eq('user_id', userId)
        .eq('status', 'succeeded')
        .gte('created_at', thirtyTwoDaysAgo);

      if (subOrders && subOrders.some((o: any) => Number(o.amount) >= 3800)) {
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

        const subject = `🎁 ${senderDisplay} gifted you a Free Murder Mystery Party!`;
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 24px; border-radius: 12px; border-top: 5px solid #F02882;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px;">
                🎁 You Received a Free Murder Mystery Gift Pass!
              </p>
            </div>

            <div style="background-color: #ffffff; padding: 24px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
              <p style="color: #1a1a1a; font-size: 16px; line-height: 1.6; margin-top: 0;">
                Hi ${recipientName || 'there'},
              </p>
              <p style="color: #444; font-size: 15px; line-height: 1.6;">
                <strong>${senderDisplay}</strong> used their monthly VIP Gift Pass to send you a <strong>100% Free Murder Mystery Party Package</strong> (good for any mystery up to 16 players)!
              </p>

              ${
                personalMessage
                  ? `<div style="background-color: #fdf2f8; border-left: 4px solid #F02882; padding: 14px 16px; border-radius: 6px; margin: 20px 0; font-style: italic; color: #333;">
                      "${personalMessage}"
                    </div>`
                  : ''
              }

              <div style="background-color: #1a1a1a; color: #ffffff; text-align: center; padding: 20px; border-radius: 10px; margin: 24px 0;">
                <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #F02882; font-weight: bold;">Your 100% Off Gift Code</p>
                <p style="margin: 8px 0 0 0; font-size: 28px; font-family: monospace; font-weight: 900; letter-spacing: 3px;">${code}</p>
                <p style="margin: 8px 0 0 0; font-size: 12px; color: #aaa;">Valid for 1 full mystery package (Basic, Premium, or Grand — up to 16 players)</p>
              </div>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${siteUrl}/en/mysteries" style="display: inline-block; background-color: #F02882; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                  Choose Your Free Mystery →
                </a>
              </div>
            </div>
          </div>
        `;

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
