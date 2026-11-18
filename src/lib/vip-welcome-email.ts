export interface VipWelcomeEmailParams {
  firstName?: string | null;
  vipRank?: number;
  vipCap?: number;
  qualifiesForFreeMystery?: boolean;
  spotsRemaining?: number;
}

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
        content: `<p style='font-size:12px;font-weight:800;letter-spacing:2px;color:#fe04c6;text-transform:uppercase;margin:0 0 12px 0;'>${
          qualifies
            ? `FIRST ${vipCap} VIP FOUNDING HOST • SPOT #${vipRank} OF ${vipCap}`
            : `VIP LAUNCH WAITLIST • OFFICIAL CONFIRMATION`
        }</p><h1 style='font-size:28px;font-weight:900;color:#ffffff;margin:0;line-height:1.2;'>You're In! Your Free Mystery Spot Is Locked In 🕵️‍♀️</h1>`,
        fontSize: 16,
        textAlign: "left",
        textColor: "#ffffff",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "#1e191c",
          paddingTop: 40,
          paddingBottom: 32,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
    {
      id: "intro",
      type: "text",
      data: {
        content: `<p style='margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;'>Hi ${firstName},</p><p style='margin:0 0 14px 0;color:#374151;line-height:1.7;'>Welcome to the inner circle! You're officially on the <strong>Back Pocket Mysteries VIP Launch List</strong>${
          qualifies
            ? ` and you snagged <strong>VIP Spot #${vipRank} of ${vipCap}</strong>.`
            : `.`
        }</p><p style='margin:0;color:#374151;line-height:1.7;'>Because you joined among our first ${vipCap} founding hosts, you've locked in a <strong>100% FREE Custom Murder Mystery Game Pack</strong> (up to $49 value) the moment we open the doors.</p>`,
        fontSize: 15,
        textAlign: "left",
        textColor: "#1e191c",
        lineHeight: 1.7,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 28,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },
    {
      id: "vip-pass-card",
      type: "text",
      data: {
        content: `<div style='background-color:#1e191c;border:2px dashed #fe04c6;border-radius:14px;padding:24px;text-align:center;'><p style='margin:0 0 6px 0;color:#fe04c6;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;'>🎟️ YOUR VIP FOUNDING HOST PASS</p><h2 style='margin:0 0 8px 0;color:#ffffff;font-size:22px;font-weight:900;'>1x Complete Murder Mystery Pack (100% FREE)</h2><p style='margin:0 0 14px 0;color:#d1d5db;font-size:13px;line-height:1.5;'>Your personal single-use 100%-Off Promo Code is reserved under this email address and will be sent straight to your inbox on Launch Day.</p><span style='display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:999px;'>STATUS: SPOT #${vipRank} OF ${vipCap} RESERVED ✓</span></div>`,
        fontSize: 14,
        textAlign: "center",
        textColor: "#ffffff",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 12,
          paddingBottom: 16,
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },
    {
      id: "what-to-expect",
      type: "text",
      data: {
        content: `<h3 style='font-size:18px;font-weight:800;color:#1e191c;margin:0 0 12px 0;'>What You Can Do With Your Free Mystery Pack:</h3><ul style='margin:0;padding-left:20px;color:#374151;line-height:1.75;font-size:14px;'><li style='margin-bottom:10px;'><strong style='color:#1e191c;'>📸 Put Your Friends in the Crime Scene:</strong> Cast your real friends and watch their faces appear inside custom CCTV stills, Polaroids, and multi-speaker voice wiretaps.</li><li style='margin-bottom:10px;'><strong style='color:#1e191c;'>📱 Zero-Stress Mobile Clues:</strong> No 40-page PDFs to print. Every guest gets a private, spoiler-free character brief and live round-by-round evidence right on their phone.</li><li style='margin-bottom:0;'><strong style='color:#1e191c;'>🍷 Built for Dinner Parties (5 to 16+ Players):</strong> Three rounds of secrets and clues that align effortlessly with Entrée, Main, and Dessert.</li></ul>`,
        fontSize: 14,
        textAlign: "left",
        textColor: "#1e191c",
        lineHeight: 1.7,
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 8,
          paddingBottom: 12,
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },
    {
      id: "cta-themes",
      type: "button",
      data: {
        text: "Sneak Peek: Explore Our Mystery Themes →",
        url: "https://backpocketmysteries.com/en/themes?utm_source=edm&utm_medium=email&utm_campaign=vip_welcome_youre_in",
        backgroundColor: "#fe04c6",
        textColor: "#ffffff",
        borderRadius: 8,
        align: "center",
        padding: { x: 28, y: 14 },
        sectionStyles: {
          backgroundColor: "transparent",
          paddingTop: 12,
          paddingBottom: 28,
          paddingLeft: 24,
          paddingRight: 24,
        },
      },
    },
    {
      id: "footer-text",
      type: "text",
      data: {
        content: `<p style='margin:0 0 4px 0;font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;text-transform:uppercase;'>Back Pocket <span style='color:#fe04c6;'>Mysteries</span></p><p style='margin:0;font-size:13px;color:#d1d5db;line-height:1.6;max-width:420px;display:inline-block;'>Custom-built murder mystery parties with personalized characters, CCTV evidence, and mobile audio clues — sorted in 30 minutes.</p>`,
        fontSize: 13,
        textAlign: "center",
        textColor: "#d1d5db",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "#1e191c",
          paddingTop: 28,
          paddingBottom: 28,
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're In! Back Pocket Mysteries VIP List</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);">
          <!-- HERO -->
          <tr>
            <td style="background-color:#1e191c;padding:40px 32px 32px 32px;">
              <p style="font-size:12px;font-weight:800;letter-spacing:2px;color:#fe04c6;text-transform:uppercase;margin:0 0 12px 0;">
                ${
                  qualifies
                    ? `FIRST ${vipCap} VIP FOUNDING HOST • SPOT #${vipRank} OF ${vipCap}`
                    : `VIP LAUNCH WAITLIST • OFFICIAL CONFIRMATION`
                }
              </p>
              <h1 style="font-size:28px;font-weight:900;color:#ffffff;margin:0;line-height:1.2;">
                You're In! Your Free Mystery Spot Is Locked In 🕵️‍♀️
              </h1>
            </td>
          </tr>

          <!-- INTRO -->
          <tr>
            <td style="padding:28px 28px 12px 28px;color:#1e191c;font-size:15px;line-height:1.7;">
              <p style="margin:0 0 14px 0;font-size:16px;font-weight:700;color:#1e191c;">Hi ${firstName},</p>
              <p style="margin:0 0 14px 0;color:#374151;">
                Welcome to the inner circle! You're officially on the <strong>Back Pocket Mysteries VIP Launch List</strong>${
                  qualifies
                    ? ` and you snagged <strong>VIP Spot #${vipRank} of ${vipCap}</strong>.`
                    : `.`
                }
              </p>
              <p style="margin:0;color:#374151;">
                ${
                  qualifies
                    ? `Because you joined among our first ${vipCap} founding hosts, you've locked in a <strong>100% FREE Custom Murder Mystery Game Pack</strong> (up to $49 value) the moment we open public checkout.`
                    : `You'll be the very first to get early access, behind-the-scenes mystery previews, and launch-day perks.`
                }
              </p>
            </td>
          </tr>

          <!-- VIP PASS CARD -->
          <tr>
            <td style="padding:12px 28px 16px 28px;">
              <div style="background-color:#1e191c;border:2px dashed #fe04c6;border-radius:14px;padding:24px;text-align:center;">
                <p style="margin:0 0 6px 0;color:#fe04c6;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                  🎟️ YOUR VIP FOUNDING HOST PASS
                </p>
                <h2 style="margin:0 0 8px 0;color:#ffffff;font-size:21px;font-weight:900;">
                  1x Complete Murder Mystery Pack (100% FREE)
                </h2>
                <p style="margin:0 0 16px 0;color:#d1d5db;font-size:13px;line-height:1.55;">
                  Your personal single-use 100%-Off Promo Code is reserved under this email address and will be sent straight to your inbox on Launch Day.
                </p>
                <span style="display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;padding:7px 16px;border-radius:999px;">
                  STATUS: SPOT #${vipRank} OF ${vipCap} RESERVED ✓
                </span>
              </div>
            </td>
          </tr>

          <!-- WHAT TO EXPECT -->
          <tr>
            <td style="padding:12px 28px 12px 28px;">
              <h3 style="font-size:17px;font-weight:800;color:#1e191c;margin:0 0 12px 0;">
                What You Can Do With Your Free Mystery Pack:
              </h3>
              <ul style="margin:0;padding-left:20px;color:#374151;line-height:1.75;font-size:14px;">
                <li style="margin-bottom:10px;">
                  <strong style="color:#1e191c;">📸 Put Your Friends in the Crime Scene:</strong> Cast your real friends and watch their faces appear inside custom CCTV stills, Polaroids, and multi-speaker voice wiretaps.
                </li>
                <li style="margin-bottom:10px;">
                  <strong style="color:#1e191c;">📱 Zero-Stress Mobile Clues:</strong> No 40-page PDFs to print. Every guest gets a private, spoiler-free character brief and live round-by-round evidence right on their phone.
                </li>
                <li style="margin-bottom:0;">
                  <strong style="color:#1e191c;">🍷 Built for Dinner Parties (5 to 16+ Players):</strong> Three rounds of secrets and clues that align effortlessly with Entrée, Main, and Dessert.
                </li>
              </ul>
            </td>
          </tr>

          <!-- CTA BUTTON -->
          <tr>
            <td align="center" style="padding:16px 28px 32px 28px;">
              <a href="https://backpocketmysteries.com/en/themes?utm_source=edm&utm_medium=email&utm_campaign=vip_welcome_youre_in" style="display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:14px 28px;border-radius:8px;">
                Sneak Peek: Explore Our Mystery Themes →
              </a>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="background-color:#1e191c;padding:28px 32px;">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;text-transform:uppercase;">
                Back Pocket <span style="color:#fe04c6;">Mysteries</span>
              </p>
              <p style="margin:0;font-size:12px;color:#d1d5db;line-height:1.6;">
                Custom-built murder mystery parties with personalized characters, CCTV evidence, and mobile audio clues — sorted in 30 minutes.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
