import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { buildBrandedEmailShell } from '@/lib/branded-email-template';

export interface PurchaseNotificationPayload {
  dedupeKey?: string;
  eventType: 'mystery_purchase' | 'subscription_started';
  customerName?: string | null;
  customerEmail?: string | null;
  userId?: string | null;
  mysteryId?: string | null;
  mysteryTitle?: string | null;
  tier?: string | null;
  amount: number; // in major currency units (e.g. 25.00)
  currency?: string;
  promoCode?: string | null;
  discountAmount?: number;
  orderId?: string | null;
}

const ADMIN_NOTIFICATION_EMAIL = 'hello@backpocketgames.com';
const PRIMARY_FROM_EMAIL = 'Back Pocket Mysteries <hello@backpocketgames.com>';
const VERIFIED_FALLBACK_FROM = 'Back Pocket Mysteries <support@lancii.com>';
const SENT_LOG_PATH = path.join(process.cwd(), 'data', 'sent-purchase-notifications.json');
const OUTBOX_LOG_PATH = path.join(process.cwd(), 'data', 'purchase-notification-outbox.json');
const memoryDedupe = new Set<string>();

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

function hasAlreadySent(key: string): boolean {
  if (!key) return false;
  if (memoryDedupe.has(key)) return true;
  try {
    if (fs.existsSync(SENT_LOG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(SENT_LOG_PATH, 'utf8'));
      if (Array.isArray(raw) && raw.includes(key)) {
        memoryDedupe.add(key);
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

function markAsSent(key: string): void {
  if (!key) return;
  memoryDedupe.add(key);
  try {
    const dir = path.dirname(SENT_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let existing: string[] = [];
    if (fs.existsSync(SENT_LOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(SENT_LOG_PATH, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed;
    }
    if (!existing.includes(key)) {
      existing.unshift(key);
      fs.writeFileSync(SENT_LOG_PATH, JSON.stringify(existing.slice(0, 500), null, 2), 'utf8');
    }
  } catch {
    // non-fatal
  }
}

function appendToOutboxLog(entry: Record<string, unknown>): void {
  try {
    const dir = path.dirname(OUTBOX_LOG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    let existing: Record<string, unknown>[] = [];
    if (fs.existsSync(OUTBOX_LOG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(OUTBOX_LOG_PATH, 'utf8'));
      if (Array.isArray(parsed)) existing = parsed;
    }
    existing.unshift(entry);
    fs.writeFileSync(OUTBOX_LOG_PATH, JSON.stringify(existing.slice(0, 200), null, 2), 'utf8');
  } catch {
    // non-fatal
  }
}

export async function sendAdminPurchaseNotificationEmail(
  payload: PurchaseNotificationPayload
): Promise<{ sent: boolean; id?: string; skipped?: boolean; queuedInOutbox?: boolean; error?: string }> {
  const dedupeKey =
    payload.dedupeKey ||
    payload.orderId ||
    `${payload.eventType}:${payload.userId || payload.customerEmail || 'guest'}:${payload.mysteryId || 'sub'}:${Math.floor(Date.now() / 60000)}`;

  if (hasAlreadySent(dedupeKey)) {
    return { sent: false, skipped: true };
  }

  const isSubscription =
    payload.eventType === 'subscription_started' || payload.tier === 'subscribe';
  const currency = (payload.currency || 'USD').toUpperCase();
  const formattedAmount = `$${Number(payload.amount || 0).toFixed(2)} ${currency}`;
  const customerDisplay =
    payload.customerName || payload.customerEmail || 'Guest Customer';
  const productDisplay = isSubscription
    ? 'Unlimited Monthly Subscription Pass'
    : payload.mysteryTitle || 'Murder Mystery Package';
  const tierDisplay = isSubscription
    ? `Monthly Subscription (${formattedAmount}/mo • +1 Monthly Gift Pass)`
    : (payload.tier || 'standard').toUpperCase();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://mysteries.backpocketgames.com';
  const adminLink = payload.userId
    ? `${siteUrl}/en/admin/users/${payload.userId}`
    : `${siteUrl}/en/admin`;

  const subject = isSubscription
    ? `👑 New Monthly Subscription (${formattedAmount}) - ${customerDisplay}`
    : `🎉 New Mystery Purchase: ${productDisplay} (${formattedAmount}) - ${customerDisplay}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 24px; border-radius: 12px; border-top: 5px solid #F02882;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
        <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px;">
          ${isSubscription ? '👑 New Monthly Subscription Started' : '🎉 New Murder Mystery Purchase'}
        </p>
      </div>

      <div style="background-color: #ffffff; padding: 24px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
        <div style="border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 16px;">
          <p style="margin: 0; color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">Amount Paid</p>
          <p style="margin: 4px 0 0 0; color: #1a1a1a; font-size: 28px; font-weight: 900;">${formattedAmount}</p>
          ${
            payload.promoCode
              ? `<p style="margin: 4px 0 0 0; color: #F02882; font-size: 12px; font-weight: bold;">Promo Applied: ${payload.promoCode}${
                  payload.discountAmount ? ` (-$${Number(payload.discountAmount).toFixed(2)})` : ''
                }</p>`
              : ''
          }
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Type</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: bold; text-align: right;">
              ${isSubscription ? 'Monthly Subscription (IN)' : 'Single Mystery Purchase'}
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Mystery / Plan</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: bold; text-align: right;">${productDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Package Tier</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: bold; text-align: right;">${tierDisplay}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Customer</td>
            <td style="padding: 8px 0; color: #1a1a1a; font-weight: bold; text-align: right;">${customerDisplay}</td>
          </tr>
          ${
            payload.customerEmail
              ? `<tr>
                  <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Customer Email</td>
                  <td style="padding: 8px 0; text-align: right;">
                    <a href="mailto:${payload.customerEmail}" style="color: #F02882; text-decoration: none; font-weight: bold;">${payload.customerEmail}</a>
                  </td>
                </tr>`
              : ''
          }
          ${
            payload.orderId
              ? `<tr>
                  <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Order ID</td>
                  <td style="padding: 8px 0; color: #666; font-family: monospace; font-size: 12px; text-align: right;">${payload.orderId}</td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding: 8px 0; color: #888; font-weight: bold; text-transform: uppercase; font-size: 11px;">Time</td>
            <td style="padding: 8px 0; color: #666; font-size: 12px; text-align: right;">${new Date().toUTCString()}</td>
          </tr>
        </table>

        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #eee;">
          <a href="${adminLink}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            ${payload.userId ? 'View Customer Profile in Admin →' : 'Open Admin Dashboard →'}
          </a>
        </div>
      </div>
    </div>
  `;

  try {
    const apiKey = resolveResendApiKey();
    if (!apiKey) {
      appendToOutboxLog({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject,
        payload,
        status: 'pending_resend_api_key',
        createdAt: new Date().toISOString(),
      });
      markAsSent(dedupeKey);
      console.warn(
        `[PURCHASE NOTIFICATION] RESEND_API_KEY is empty in .env.local. Logged notification to data/purchase-notification-outbox.json: ${subject}`
      );
      return {
        sent: false,
        queuedInOutbox: true,
        error: 'RESEND_API_KEY is empty in .env.local',
      };
    }

    const resend = new Resend(apiKey);
    const replyTo = payload.customerEmail || ADMIN_NOTIFICATION_EMAIL;

    // 1. Try sending from Back Pocket Mysteries <hello@backpocketgames.com>
    let res = await resend.emails.send({
      from: PRIMARY_FROM_EMAIL,
      to: ADMIN_NOTIFICATION_EMAIL,
      replyTo,
      subject,
      html,
    });

    // 2. If backpocketgames.com domain is still pending verification in Resend DNS,
    // automatically fall back to verified sender domain so hello@backpocketgames.com always receives the email
    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: ADMIN_NOTIFICATION_EMAIL,
        replyTo,
        subject,
        html,
      });
    }

    if (res.error) {
      console.error('[PURCHASE NOTIFICATION] Resend error:', res.error);
      appendToOutboxLog({
        to: ADMIN_NOTIFICATION_EMAIL,
        subject,
        payload,
        status: 'resend_error',
        error: res.error.message,
        createdAt: new Date().toISOString(),
      });
      return { sent: false, error: res.error.message };
    }

    markAsSent(dedupeKey);
    appendToOutboxLog({
      to: ADMIN_NOTIFICATION_EMAIL,
      subject,
      payload,
      status: 'sent',
      id: res.data?.id,
      createdAt: new Date().toISOString(),
    });
    console.log(
      `[PURCHASE NOTIFICATION] Sent email to ${ADMIN_NOTIFICATION_EMAIL} (ID: ${res.data?.id}): ${subject}`
    );
    return { sent: true, id: res.data?.id };
  } catch (err: any) {
    console.error('[PURCHASE NOTIFICATION] Unexpected error:', err);
    return { sent: false, error: err?.message || 'Failed to send email' };
  }
}

export interface CustomerMysteryEmailPayload {
  customerEmail: string;
  customerName?: string | null;
  mysteryId: string;
  mysterySlug?: string | null;
  mysteryTitle: string;
  pin?: string | null;
  locale?: string;
}

export async function sendCustomerGenerationStartedEmail(
  payload: CustomerMysteryEmailPayload
): Promise<{ sent: boolean; id?: string; queuedInOutbox?: boolean; error?: string }> {
  const email = (payload.customerEmail || '').trim();
  if (!email) {
    return { sent: false, error: 'Missing customerEmail' };
  }

  const dedupeKey = `customer_gen_started:${email}:${payload.mysteryId}`;
  if (hasAlreadySent(dedupeKey)) {
    return { sent: false };
  }

  const locale = payload.locale || 'en';
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const myStoriesUrl = `${siteUrl}/${locale}/account/orders`;
  const greetingName = payload.customerName ? payload.customerName.split(' ')[0] : 'Detective';

  const subject = `☕ We're Brewing Your Mystery Package! ("${payload.mysteryTitle}") - Ready in ~20 Mins`;

  const html = buildBrandedEmailShell({
    preheader: `Your custom cast for "${payload.mysteryTitle}" is locked in — your mystery pack will be ready in ~20 minutes.`,
    kicker: 'CUSTOM PACKAGE GENERATING (~20 MINS)',
    headline: `Go Grab a Coffee, ${greetingName} — Your Case Is Being Built.`,
    bodyHtml: `
      <p style="margin:0 0 16px 0;color:#374151;">
        Your cast for <strong style="color:#1e191c;">${payload.mysteryTitle}</strong> is locked in. Our story engine is now generating your personalized character dossiers, outfit guides, CCTV stills, and multi-speaker audio clues.
      </p>
      <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #10b981;padding:20px 24px;border-radius:12px;margin-bottom:8px;">
        <p style="margin:0 0 6px 0;color:#34d399;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px;">
          ✓ SAFE TO CLOSE YOUR BROWSER
        </p>
        <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:1.65;">
          Your complete package will be ready in <strong>~20 minutes</strong>. You can safely close your browser while our servers build everything in the background. We will email you the moment it is ready, and it will be waiting for you inside <strong>My Mysteries</strong>.
        </p>
      </div>
    `,
    ctaText: 'Open My Mysteries →',
    ctaUrl: myStoriesUrl,
  });

  try {
    const apiKey = resolveResendApiKey();
    if (!apiKey) {
      appendToOutboxLog({
        to: email,
        subject,
        type: 'customer_generation_started',
        payload,
        status: 'pending_resend_api_key',
        createdAt: new Date().toISOString(),
      });
      markAsSent(dedupeKey);
      return { sent: false, queuedInOutbox: true };
    }

    const resend = new Resend(apiKey);
    let res = await resend.emails.send({
      from: PRIMARY_FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: email,
        subject,
        html,
      });
    }
    markAsSent(dedupeKey);
    appendToOutboxLog({
      to: email,
      subject,
      type: 'customer_generation_started',
      payload,
      status: res.error ? 'resend_error' : 'sent',
      id: res.data?.id,
      error: res.error?.message,
      createdAt: new Date().toISOString(),
    });
    return { sent: !res.error, id: res.data?.id };
  } catch (err: any) {
    return { sent: false, error: err?.message };
  }
}

export async function sendCustomerMysteryReadyEmail(
  payload: CustomerMysteryEmailPayload
): Promise<{ sent: boolean; id?: string; queuedInOutbox?: boolean; error?: string }> {
  const email = (payload.customerEmail || '').trim();
  if (!email) {
    return { sent: false, error: 'Missing customerEmail' };
  }

  const dedupeKey = `customer_mystery_ready:${email}:${payload.mysteryId}`;
  if (hasAlreadySent(dedupeKey)) {
    return { sent: false };
  }

  const locale = payload.locale || 'en';
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://backpocketmysteries.com';
  const targetSlug = payload.mysterySlug || payload.mysteryId;
  const myStoriesUrl = `${siteUrl}/${locale}/account/orders`;
  const readyHubUrl = `${siteUrl}/${locale}/mysteries/${targetSlug}/ready`;
  const greetingName = payload.customerName ? payload.customerName.split(' ')[0] : 'Host';
  const formattedPin = payload.pin
    ? `${payload.pin.slice(0, 3)} ${payload.pin.slice(3)}`
    : 'Ready in Hub';

  const subject = `🎉 Your Murder Mystery Package is Ready! - "${payload.mysteryTitle}"`;

  const html = buildBrandedEmailShell({
    preheader: `Your custom dossiers, clues, and 6-digit Game PIN (${formattedPin}) for "${payload.mysteryTitle}" are ready!`,
    kicker: 'CASE FILE COMPLETE • READY TO HOST',
    headline: `${greetingName}, "${payload.mysteryTitle}" Is Ready to Play.`,
    bodyHtml: `
      <p style="margin:0 0 20px 0;color:#374151;">
        Your custom character dossiers, outfit guides, visual evidence, and 6-digit Live Game PIN are ready inside your Pre-Party Ready Hub.
      </p>
      <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:22px;border-radius:12px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 6px 0;color:#fe04c6;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:2px;">
          6-DIGIT LIVE GAME PIN
        </p>
        <p style="margin:0;color:#ffffff;font-size:28px;font-family:monospace;font-weight:900;letter-spacing:4px;">
          ${formattedPin}
        </p>
      </div>
      <h3 style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:#1e191c;margin:0 0 12px 0;">
        Waiting Inside Your Ready Hub
      </h3>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.6;">
            <strong style="color:#1e191c;">01 · 1-Click Group Chat Character Link:</strong> Drop one link into your group chat so guests can view their character bio and outfit brief.
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.6;">
            <strong style="color:#1e191c;">02 · Individual Character Invites:</strong> Public character outlines, dress code, and pre-party instructions.
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#374151;font-size:14px;line-height:1.6;">
            <strong style="color:#1e191c;">03 · Spoiler-Free Host Run Sheet:</strong> Everything you need before guests arrive, without spoiling who did it.
          </td>
        </tr>
      </table>
    `,
    ctaText: 'Open Your Pre-Party Ready Hub →',
    ctaUrl: readyHubUrl,
    secondaryCtaText: 'Or view all your mysteries in My Stories →',
    secondaryCtaUrl: myStoriesUrl,
  });

  try {
    const apiKey = resolveResendApiKey();
    if (!apiKey) {
      appendToOutboxLog({
        to: email,
        subject,
        type: 'customer_mystery_ready',
        payload,
        status: 'pending_resend_api_key',
        createdAt: new Date().toISOString(),
      });
      markAsSent(dedupeKey);
      console.log(`[MYSTERY READY EMAIL] Queued ready email in outbox for ${email}: ${subject}`);
      return { sent: false, queuedInOutbox: true };
    }

    const resend = new Resend(apiKey);
    let res = await resend.emails.send({
      from: PRIMARY_FROM_EMAIL,
      to: email,
      subject,
      html,
    });
    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: email,
        subject,
        html,
      });
    }
    markAsSent(dedupeKey);
    appendToOutboxLog({
      to: email,
      subject,
      type: 'customer_mystery_ready',
      payload,
      status: res.error ? 'resend_error' : 'sent',
      id: res.data?.id,
      error: res.error?.message,
      createdAt: new Date().toISOString(),
    });
    return { sent: !res.error, id: res.data?.id };
  } catch (err: any) {
    return { sent: false, error: err?.message };
  }
}
