'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { processRefund } from '@/services/admin';
import { requireAdmin } from '@/utils/admin-auth';

const VERIFIED_FALLBACK_FROM = 'Back Pocket Mysteries <support@lancii.com>';
const SUPPORT_EMAIL = 'hello@backpocketgames.com';

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
  } catch {}
  return null;
}

export async function refundOrderAction(id: string) {
  await requireAdmin();
  await processRefund(id);
  revalidatePath('/en/admin/transactions');
}

export async function resendOrderAccessEmailAction(params: {
  orderId: string;
  mysteryId?: string | null;
  mysteryTitle: string;
  customerName: string;
  customerEmail?: string | null;
  pin?: string | null;
  grossGbp?: number;
}): Promise<{
  success: boolean;
  sentTo?: string;
  error?: string;
}> {
  await requireAdmin();

  const apiKey = resolveResendApiKey();
  if (!apiKey) {
    return {
      success: false,
      error: 'Missing RESEND_API_KEY in environment.',
    };
  }

  const recipient = (params.customerEmail || SUPPORT_EMAIL).trim();
  const mId = params.mysteryId || params.orderId;
  const hostHubUrl = `https://backpocketmysteries.com/en/account/orders/${mId}`;
  const prepInviteUrl = `https://backpocketmysteries.com/en/play/${mId}?prep=1`;
  const liveLobbyUrl = `https://backpocketmysteries.com/en/play/${mId}`;
  const pinDisplay = params.pin ? `${params.pin.slice(0, 3)} ${params.pin.slice(3)}` : 'Available in Host Hub';

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Your Mystery Pack &amp; Host Access Links</title>
  </head>
  <body style="background-color:#faf8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;margin:0;padding:40px 16px;">
    <div style="background-color:#ffffff;margin:0 auto;max-width:600px;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid #f0eaf5;">
      <div style="background-color:#1e191c;padding:28px 40px;text-align:center;">
        <img src="https://backpocketmysteries.com/logo-horizontal-white.png" width="180" height="36" alt="Back Pocket Mysteries" style="display:block;margin:0 auto;object-fit:contain;" />
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:11px;font-weight:800;color:#fe04c6;letter-spacing:0.15em;margin:0 0 6px;text-transform:uppercase;">
          HOST ACCESS &amp; PARTY LINKS
        </p>
        <h1 style="font-size:22px;font-weight:900;color:#1e191c;margin:0 0 12px;line-height:1.3;">
          Your Mystery Pack: ${params.mysteryTitle}
        </h1>
        <p style="font-size:14px;color:#4a434a;margin:0 0 22px;line-height:1.6;">
          Hi ${params.customerName || 'Host'}, here are your direct links and Party Access PIN for <strong>${params.mysteryTitle}</strong>:
        </p>
        <div style="background-color:#faf8fc;border-radius:12px;padding:18px 22px;border:1px solid #ede5f3;font-size:13px;color:#1e191c;line-height:1.8;margin-bottom:24px;">
          <div><strong>Order Ref:</strong> #${String(params.orderId || '').slice(0, 8).toUpperCase()}</div>
          <div><strong>6-Digit Party PIN:</strong> <span style="font-family:monospace;font-weight:900;color:#fe04c6;">${pinDisplay}</span></div>
          <div><strong>Pre-Party Guest Invite Link:</strong> <a href="${prepInviteUrl}" style="color:#fe04c6;font-weight:700;">${prepInviteUrl}</a></div>
          <div><strong>Live Game Night Lobby:</strong> <a href="${liveLobbyUrl}" style="color:#1e191c;font-weight:700;">${liveLobbyUrl}</a></div>
        </div>
        <div style="margin-top:20px;">
          <a href="${hostHubUrl}" style="background-color:#fe04c6;border-radius:12px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;display:inline-block;padding:13px 26px;">
            Open Your Host Hub &amp; Invites →
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const resend = new Resend(apiKey);
  try {
    let res = await resend.emails.send({
      from: `Back Pocket Mysteries <${SUPPORT_EMAIL}>`,
      to: recipient,
      replyTo: SUPPORT_EMAIL,
      subject: `Your Mystery Pack & Host Access Links — ${params.mysteryTitle}`,
      html,
    });

    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: recipient,
        replyTo: SUPPORT_EMAIL,
        subject: `Your Mystery Pack & Host Access Links — ${params.mysteryTitle}`,
        html,
      });
    }

    if (res.error) {
      return {
        success: false,
        error: res.error.message || 'Could not send access email.',
      };
    }

    return {
      success: true,
      sentTo: recipient,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Unexpected error sending access email.',
    };
  }
}
