import fs from 'fs';
import path from 'path';
import { Resend } from 'resend';
import { buildBrandedEmailShell } from '@/lib/branded-email-template';
import { getEffectiveCoverUrl } from '@/utils/moodboard';
import { getCachedMysterySnapshot } from '@/lib/live-session-store';

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
  mysteryImageUrl?: string | null;
  mysteryTheme?: string | null;
  pin?: string | null;
  locale?: string;
}

const PUBLIC_BRAND_DOMAIN = 'https://backpocketmysteries.com';

function resolvePublicMysteryCoverUrl(payload: CustomerMysteryEmailPayload): string {
  const cached = payload.mysteryId ? getCachedMysterySnapshot(payload.mysteryId) : null;
  const rawImg = payload.mysteryImageUrl || cached?.image_url || null;
  const theme = payload.mysteryTheme || cached?.theme || null;
  const cover = getEffectiveCoverUrl(rawImg, theme, payload.mysteryTitle);

  if (cover && !cover.startsWith('data:')) {
    if (cover.startsWith('http://') || cover.startsWith('https://')) {
      return cover;
    }
    const cleanRel = cover.startsWith('/') ? cover : `/${cover}`;
    return `${PUBLIC_BRAND_DOMAIN}${cleanRel}`;
  }

  return `${PUBLIC_BRAND_DOMAIN}/hero-mystery-playing.png`;
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
    process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
      ? process.env.NEXT_PUBLIC_SITE_URL
      : PUBLIC_BRAND_DOMAIN;
  const myStoriesUrl = `${siteUrl}/${locale}/account/orders`;
  const greetingName = payload.customerName ? payload.customerName.split(' ')[0] : 'Detective';
  const coverPhotoUrl = resolvePublicMysteryCoverUrl(payload);

  const subject = `☕ Grab a Coffee, ${greetingName}! We're Brewing "${payload.mysteryTitle}" (~20 Mins)`;

  const html = buildBrandedEmailShell({
    preheader: `Your custom cast for "${payload.mysteryTitle}" is locked in! Your mystery pack will be ready in ~20 minutes.`,
    badgeText: '🎬 CAST LOCKED IN',
    kicker: 'CUSTOM MYSTERY STUDIO • READY IN ~20 MINS',
    headline: `Go Grab a Coffee, ${greetingName}! Your Crime Scene Is Being Built ☕🕵️‍♀️`,
    heroImageUrl: coverPhotoUrl,
    heroImageAlt: payload.mysteryTitle,
    heroImageBadge: `🎭 YOUR MYSTERY PACK: ${payload.mysteryTitle.toUpperCase()}`,
    heroImageCaption: `Starring your custom cast in "${payload.mysteryTitle}" - our AI detective studio is dressing your suspects and planting the clues right now!`,
    bodyHtml: `
      <p style="margin:0 0 18px 0;color:#374151;font-size:15px;">
        Cue the dramatic music! Your cast for <strong style="color:#1e191c;">${payload.mysteryTitle}</strong> is officially locked in. Behind the scenes, our studio is tailoring every alibi, suspect portrait, and piece of forensic evidence around your lineup.
      </p>

      <!-- FUN 4-STEP WHAT WE'RE COOKING UP CARD -->
      <div style="background-color:#fdf2f8;border:2px solid #fbcfe8;border-radius:16px;padding:20px 22px;margin-bottom:20px;">
        <p style="margin:0 0 12px 0;color:#fe04c6;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px;">
          ✨ WHAT OUR DETECTIVE LAB IS COOKING UP RIGHT NOW
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13px;color:#1e191c;">
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #fce7f3;">
              <strong>🎭 1. Custom Character Costume Portraits:</strong> Styling every suspect in their signature theme outfit.
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #fce7f3;">
              <strong>📸 2. Crime-Scene &amp; CCTV Stills:</strong> Placing your cast directly into caught-on-camera evidence photos.
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0;border-bottom:1px solid #fce7f3;">
              <strong>🎙️ 3. Multi-Accent Voice Wiretaps:</strong> Recording dramatic leaked audio clues &amp; alibis.
            </td>
          </tr>
          <tr>
            <td style="padding:7px 0 0 0;">
              <strong>🛡️ 4. Pre-Delivery Quality Check:</strong> Running our 4-Gate QA inspection so every clue arrives spotless.
            </td>
          </tr>
        </table>
      </div>

      <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #10b981;padding:20px 24px;border-radius:14px;margin-bottom:8px;">
        <p style="margin:0 0 6px 0;color:#34d399;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:1.8px;">
          ✓ SAFE TO CLOSE YOUR BROWSER (~20 MINS)
        </p>
        <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:1.65;">
          Your complete package takes <strong>~20 minutes</strong> to build and QA-verify. Feel free to close your browser and go grab a coffee or pour a drink! We will email you the exact moment your pack is unlocked in <strong>My Mysteries</strong>.
        </p>
      </div>
    `,
    ctaText: 'Peek at My Mysteries →',
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
    process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('localhost')
      ? process.env.NEXT_PUBLIC_SITE_URL
      : PUBLIC_BRAND_DOMAIN;
  const targetSlug = payload.mysterySlug || payload.mysteryId;
  const myStoriesUrl = `${siteUrl}/${locale}/account/orders`;
  const readyHubUrl = `${siteUrl}/${locale}/account/orders/${targetSlug}`;
  const greetingName = payload.customerName ? payload.customerName.split(' ')[0] : 'Host';
  const formattedPin = payload.pin
    ? `${payload.pin.slice(0, 3)} ${payload.pin.slice(3)}`
    : 'Ready in Hub';
  const coverPhotoUrl = resolvePublicMysteryCoverUrl(payload);

  const subject = `🎉 Pop the Champagne, ${greetingName}! "${payload.mysteryTitle}" Is Ready to Host 🥂🕵️‍♀️`;

  const html = buildBrandedEmailShell({
    preheader: `Your custom dossiers, crime-scene photos, voice wiretaps, and 6-digit Game PIN (${formattedPin}) for "${payload.mysteryTitle}" are QA-verified and unlocked!`,
    badgeText: '🛡️ 100% QA-VERIFIED',
    kicker: 'CASE FILE COMPLETE • READY FOR PARTY NIGHT',
    headline: `It's Showtime, ${greetingName}! "${payload.mysteryTitle}" Is Unlocked 🎉`,
    heroImageUrl: coverPhotoUrl,
    heroImageAlt: payload.mysteryTitle,
    heroImageBadge: `🥂 READY TO HOST: ${payload.mysteryTitle.toUpperCase()}`,
    heroImageCaption: `Every character portrait, crime-scene photo, and voice recording has passed our 4-Gate Quality Check and is waiting in your Pre-Party Host Hub.`,
    bodyHtml: `
      <p style="margin:0 0 20px 0;color:#374151;font-size:15px;">
        Your custom character dossiers, outfit guides, caught-on-camera clue photos, and voice wiretaps for <strong style="color:#1e191c;">${payload.mysteryTitle}</strong> are officially ready! Here is your secret 6-digit Party PIN for game night:
      </p>

      <!-- VIP 6-DIGIT GAME PIN TICKET -->
      <div style="background-color:#141115;border:2px solid #fe04c6;padding:24px;border-radius:16px;margin-bottom:24px;text-align:center;">
        <span style="display:inline-block;background-color:rgba(16,185,129,0.18);border:1px solid rgba(16,185,129,0.4);color:#34d399;font-size:10px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:10px;">
          🛡️ 100% QA-TESTED BEFORE DELIVERY
        </span>
        <p style="margin:0 0 6px 0;color:#fe04c6;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:2.2px;">
          🎟️ YOUR 6-DIGIT LIVE PARTY PIN
        </p>
        <p style="margin:0;color:#ffffff;font-size:34px;font-family:monospace;font-weight:900;letter-spacing:5px;">
          ${formattedPin}
        </p>
        <p style="margin:8px 0 0 0;color:#a1a1aa;font-size:12px;">
          Zero app downloads or guest logins needed on party night!
        </p>
      </div>

      <h3 style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:1.4px;color:#fe04c6;margin:0 0 12px 0;">
        🥂 Your 3-Step Pre-Party Game Plan
      </h3>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td style="padding:12px 14px;background-color:#fdf2f8;border-radius:12px;color:#374151;font-size:13.5px;line-height:1.55;">
            <strong style="color:#1e191c;">💬 01 · Drop the Hype in Your Group Chat:</strong> Copy the ready-to-send teaser message inside your Host Hub to get everyone buzzing about their costumes.
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 14px;background-color:#f4f4f5;border-radius:12px;color:#374151;font-size:13.5px;line-height:1.55;">
            <strong style="color:#1e191c;">👗 02 · Send Each Suspect Their Character Link:</strong> Every guest gets their spoiler-free character blurb and outfit guide in one tap.
          </td>
        </tr>
        <tr><td style="height:8px;"></td></tr>
        <tr>
          <td style="padding:12px 14px;background-color:#f4f4f5;border-radius:12px;color:#374151;font-size:13.5px;line-height:1.55;">
            <strong style="color:#1e191c;">🍸 03 · Check the Party Toolkit (Drinks &amp; Playlist):</strong> Cue up the themed Spotify playlist, dim the lights, and let the accusations fly!
          </td>
        </tr>
      </table>
    `,
    ctaText: 'Open Your Pre-Party Host Hub →',
    ctaUrl: readyHubUrl,
    secondaryCtaText: 'Or view all your mysteries in My Mysteries (Stories) →',
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
