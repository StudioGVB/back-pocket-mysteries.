import { buildBrandedEmailShell } from '@/lib/branded-email-template';

export interface VipWelcomeEmailParams {
  firstName?: string | null;
  vipRank?: number;
  vipCap?: number;
  qualifiesForFreeMystery?: boolean;
  spotsRemaining?: number;
}

const BASE_URL = "https://backpocketmysteries.com";
const LOGO_WHITE_URL = `${BASE_URL}/logo-horizontal-white.png`;

export function buildVipWelcomeEmailBlocks(params: VipWelcomeEmailParams = {}) {
  const firstName = params.firstName || "{{first_name}}";
  const vipRank = params.vipRank ?? 12;
  const vipCap = params.vipCap ?? 50;
  const qualifies = params.qualifiesForFreeMystery !== false;

  return [
    {
      id: "hero",
      type: "text",
      data: {
        content: `<div style='margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid rgba(255,255,255,0.12);'><img src='${LOGO_WHITE_URL}' width='175' alt='Back Pocket Mysteries' style='display:block;max-width:175px;height:auto;' /></div><p style='font-size:11px;font-weight:800;letter-spacing:2.2px;color:#fe04c6;text-transform:uppercase;margin:0 0 10px 0;'>${
          qualifies
            ? `FIRST ${vipCap} VIP FOUNDING HOST • SPOT #${vipRank} OF ${vipCap}`
            : `VIP LAUNCH WAITLIST • OFFICIAL CONFIRMATION`
        }</p><h1 style='font-size:27px;font-weight:900;color:#ffffff;margin:0;line-height:1.22;'>You're In — Your Free Mystery Spot Is Locked In.</h1>`,
        fontSize: 16,
        textAlign: "left",
        textColor: "#ffffff",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "#141115",
          paddingTop: 36,
          paddingBottom: 32,
          paddingLeft: 36,
          paddingRight: 36,
        },
      },
    },
    {
      id: "intro",
      type: "text",
      data: {
        content: `<p style='margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;'>Hi ${firstName},</p><p style='margin:0 0 14px 0;color:#374151;line-height:1.75;'>Welcome to the inner circle. You are officially registered on the <strong>Back Pocket Mysteries VIP Launch List</strong>${
          qualifies
            ? ` with <strong>Founding Host Spot #${vipRank} of ${vipCap}</strong>.`
            : `.`
        }</p><p style='margin:0;color:#374151;line-height:1.75;'>Because you joined among our first ${vipCap} founding hosts, you have locked in a <strong>100% FREE Custom Murder Mystery Game Pack</strong> (up to $49 value) the moment public doors open.</p>`,
        fontSize: 15,
        textAlign: "left",
        textColor: "#1e191c",
        lineHeight: 1.7,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 32,
          paddingBottom: 14,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
    {
      id: "vip-pass-card",
      type: "text",
      data: {
        content: `<div style='background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;border-radius:12px;padding:24px;text-align:left;'><p style='margin:0 0 6px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;'>FOUNDING HOST CREDENTIAL</p><h2 style='margin:0 0 8px 0;color:#ffffff;font-size:20px;font-weight:900;'>1× Complete Murder Mystery Pack (100% Complimentary)</h2><p style='margin:0 0 16px 0;color:#a1a1aa;font-size:13px;line-height:1.6;'>Your single-use 100%-Off Promo Code is reserved under this email address and will be dispatched directly to your inbox on Launch Day.</p><span style='display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:10px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;padding:6px 14px;border-radius:999px;'>SPOT #${vipRank} OF ${vipCap} CONFIRMED ✓</span></div>`,
        fontSize: 14,
        textAlign: "left",
        textColor: "#ffffff",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 12,
          paddingBottom: 16,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
    {
      id: "what-to-expect",
      type: "text",
      data: {
        content: `<h3 style='font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#1e191c;margin:0 0 14px 0;'>Inside Your Complimentary Mystery Pack:</h3><table role='presentation' width='100%' cellspacing='0' cellpadding='0' border='0'><tr><td style='padding:10px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.65;'><strong style='color:#1e191c;'>01 · Your Friends Cast in the Story (4–16 Players):</strong> Real guest names, traits, and inside jokes woven into custom character dossiers, CCTV stills, and multi-speaker audio wiretaps.</td></tr><tr><td style='padding:10px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.65;'><strong style='color:#1e191c;'>02 · Spoiler-Free Host Mode:</strong> Run the rounds from your phone via a 6-digit Game PIN lobby without ever seeing the killer—so you play as a full suspect.</td></tr><tr><td style='padding:10px 0;color:#374151;font-size:14px;line-height:1.65;'><strong style='color:#1e191c;'>03 · Ready in ~30 Mins (Mobile Lobby + Print-Ready PDFs):</strong> Play live on phones via your 6-digit Game PIN or print the formatted suspect booklets and evidence cards at home.</td></tr></table>`,
        fontSize: 14,
        textAlign: "left",
        textColor: "#1e191c",
        lineHeight: 1.7,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 8,
          paddingBottom: 12,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
    {
      id: "cta-themes",
      type: "button",
      data: {
        text: "Explore Our Mystery Themes →",
        url: "https://backpocketmysteries.com/en/themes?utm_source=edm&utm_medium=email&utm_campaign=vip_welcome_youre_in",
        backgroundColor: "#fe04c6",
        textColor: "#ffffff",
        borderRadius: 999,
        align: "center",
        padding: { x: 32, y: 15 },
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 16,
          paddingBottom: 32,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
    {
      id: "footer-text",
      type: "text",
      data: {
        content: `<div style='margin-bottom:12px;'><img src='${LOGO_WHITE_URL}' width='145' alt='Back Pocket Mysteries' style='display:block;margin:0 auto;max-width:145px;height:auto;' /></div><p style='margin:0 0 12px 0;font-size:12px;color:#a1a1aa;line-height:1.6;max-width:420px;display:inline-block;'>Custom-built murder mystery parties with personalized characters, CCTV evidence, and mobile audio clues — sorted in 30 minutes.</p><p style='margin:0;font-size:11px;color:#71717a;'>© 2026 Back Pocket Mysteries · <a href='https://backpocketmysteries.com/en' style='color:#fe04c6;text-decoration:none;'>backpocketmysteries.com</a></p>`,
        fontSize: 12,
        textAlign: "center",
        textColor: "#a1a1aa",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "#141115",
          paddingTop: 32,
          paddingBottom: 32,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
  ];
}

export function buildVipWelcomeEmailHtml(params: VipWelcomeEmailParams = {}): string {
  const firstName = params.firstName || "there";
  const vipRank = params.vipRank ?? 12;
  const vipCap = params.vipCap ?? 50;
  const qualifies = params.qualifiesForFreeMystery !== false;

  const bodyHtml = `
    <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${firstName},</p>
    <p style="margin:0 0 14px 0;color:#374151;">
      Welcome to the inner circle. You are officially registered on the <strong>Back Pocket Mysteries VIP Launch List</strong>${
        qualifies
          ? ` with <strong>Founding Host Spot #${vipRank} of ${vipCap}</strong>.`
          : `.`
      }
    </p>
    <p style="margin:0 0 24px 0;color:#374151;">
      ${
        qualifies
          ? `Because you joined among our first ${vipCap} founding hosts, you have locked in a <strong>100% FREE Custom Murder Mystery Game Pack</strong> (up to $49 value) the moment we open public checkout.`
          : `You will be the very first to receive early access, behind-the-scenes mystery previews, and launch-day perks.`
      }
    </p>

    <!-- FOUNDING HOST CREDENTIAL CARD -->
    <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;border-radius:12px;padding:24px;margin-bottom:28px;">
      <p style="margin:0 0 6px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;">
        FOUNDING HOST CREDENTIAL
      </p>
      <h2 style="margin:0 0 8px 0;color:#ffffff;font-size:20px;font-weight:900;">
        1× Complete Murder Mystery Pack (100% Complimentary)
      </h2>
      <p style="margin:0 0 16px 0;color:#a1a1aa;font-size:13px;line-height:1.6;">
        Your personal single-use 100%-Off Promo Code is reserved under this email address and will be dispatched directly to your inbox on Launch Day.
      </p>
      <span style="display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:10px;font-weight:900;letter-spacing:1.8px;text-transform:uppercase;padding:6px 14px;border-radius:999px;">
        SPOT #${vipRank} OF ${vipCap} CONFIRMED ✓
      </span>
    </div>

    <h3 style="font-size:14px;font-weight:900;text-transform:uppercase;letter-spacing:1.2px;color:#1e191c;margin:0 0 12px 0;">
      Inside Your Complimentary Mystery Pack
    </h3>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.65;">
          <strong style="color:#1e191c;">01 · Your Friends Cast in the Story (4–16 Players):</strong> Real guest names, traits, and inside jokes woven into custom character dossiers, CCTV stills, and multi-speaker audio wiretaps.
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;color:#374151;font-size:14px;line-height:1.65;">
          <strong style="color:#1e191c;">02 · Spoiler-Free Host Mode:</strong> Run the rounds from your phone via a 6-digit Game PIN lobby without ever seeing the killer—so you play as a full suspect.
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;color:#374151;font-size:14px;line-height:1.65;">
          <strong style="color:#1e191c;">03 · Ready in ~30 Mins (Mobile Lobby + Print-Ready PDFs):</strong> Play live on phones via your 6-digit Game PIN or print the formatted suspect booklets and evidence cards at home.
        </td>
      </tr>
    </table>
  `;

  return buildBrandedEmailShell({
    preheader: qualifies
      ? `VIP Founding Host Spot #${vipRank} of ${vipCap} is confirmed — your 100% Free Murder Mystery Pack is reserved.`
      : `Welcome to the Back Pocket Mysteries VIP Launch List.`,
    kicker: qualifies
      ? `FIRST ${vipCap} VIP FOUNDING HOST • SPOT #${vipRank} OF ${vipCap}`
      : `VIP LAUNCH WAITLIST • OFFICIAL CONFIRMATION`,
    headline: `You're In — Your Free Mystery Spot Is Locked In.`,
    bodyHtml,
    ctaText: 'Explore Our Mystery Themes →',
    ctaUrl: 'https://backpocketmysteries.com/en/themes?utm_source=edm&utm_medium=email&utm_campaign=vip_welcome_youre_in',
    footerNote: 'You are receiving this email because you registered for the Back Pocket Mysteries VIP Launch List.',
  });
}
