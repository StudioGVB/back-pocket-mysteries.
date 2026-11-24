const BASE_URL = 'https://mysteries.backpocketgames.com';
const LOGO_WHITE_URL = `${BASE_URL}/logo-horizontal-white.png?v=5`;
const EMAIL_FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export interface BrandedEmailShellOptions {
  preheader?: string;
  badgeText?: string;
  kicker?: string;
  headline: string;
  subheadline?: string;
  heroImageUrl?: string | null;
  heroImageAlt?: string;
  heroImageBadge?: string;
  heroImageCaption?: string;
  bodyHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerNote?: string;
}

/**
 * Generates the signature Back Pocket Mysteries EDM-style email HTML:
 * 1. Dark top brand bar (#141115) with transparent white logo (logo-horizontal-white.png) & hot-pink bottom border
 * 2. Dark hero headline section (#1e191c)
 * 3. Optional full-width 600px Mystery Package Cover Photo row
 * 4. Editorial white content body + pink CTA button
 * 5. Dark footer (#141115) with transparent white logo sitting directly against the dark background
 */
export function buildBrandedEmailShell(options: BrandedEmailShellOptions): string {
  const year = new Date().getFullYear();
  const topBadge = options.badgeText || 'THE MYSTERY GAZETTE';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${options.headline.replace(/<[^>]+>/g, '')}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${EMAIL_FONT};-webkit-font-smoothing:antialiased;">
  ${
    options.preheader
      ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${options.preheader}</div>`
      : ''
  }
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(17,17,17,0.08);border:1px solid #e4e4e7;">
          <!-- 1. TOP BRAND BAR WITH TRANSPARENT WHITE LOGO (EDM STYLE) -->
          <tr>
            <td style="background-color:#141115;padding:24px 32px 20px 32px;border-bottom:4px solid #fe04c6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${BASE_URL}/en" target="_blank" style="text-decoration:none;display:inline-block;">
                      <img src="${LOGO_WHITE_URL}" width="180" alt="Back Pocket Mysteries" style="display:block;border:0;max-width:180px;height:auto;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;background-color:rgba(254,4,198,0.14);border:1px solid rgba(254,4,198,0.35);color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;padding:5px 10px;border-radius:999px;">
                      ${topBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. DARK HERO HEADLINE SECTION (EDM STYLE) -->
          <tr>
            <td style="background-color:#1e191c;padding:32px 32px 30px 32px;">
              ${
                options.kicker
                  ? `<p style="font-size:11px;font-weight:800;letter-spacing:2.2px;color:#fe04c6;text-transform:uppercase;margin:0 0 10px 0;">${options.kicker}</p>`
                  : ''
              }
              <h1 style="font-size:26px;font-weight:900;color:#ffffff;margin:0;line-height:1.25;letter-spacing:-0.4px;">
                ${options.headline}
              </h1>
            </td>
          </tr>

          ${
            options.heroImageUrl
              ? `<!-- 3. FULL-WIDTH 600x230 WIDESCREEN MYSTERY PACKAGE BANNER -->
          <tr>
            <td style="padding:0;background-color:#141115;line-height:0;font-size:0;">
              <div style="width:100%;max-width:600px;max-height:230px;overflow:hidden;">
                <img src="${options.heroImageUrl}" width="600" height="230" alt="${(options.heroImageAlt || 'Mystery Package Cover').replace(/"/g, '&quot;')}" style="display:block;width:100%;max-width:600px;height:230px;max-height:230px;object-fit:cover;object-position:center 38%;border:0;" />
              </div>
            </td>
          </tr>`
              : ''
          }

          <!-- 4. MAIN EDITORIAL CONTENT -->
          <tr>
            <td style="padding:30px 32px 20px 32px;color:#1e191c;font-size:15px;line-height:1.7;">
              ${options.bodyHtml}
            </td>
          </tr>

          ${
            options.ctaText && options.ctaUrl
              ? `<!-- 5. PRIMARY CTA BUTTON -->
          <tr>
            <td align="center" style="padding:6px 32px 34px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="background-color:#fe04c6;border-radius:999px;">
                    <a href="${options.ctaUrl}" target="_blank" style="display:inline-block;padding:15px 32px;color:#ffffff;font-family:${EMAIL_FONT};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;text-decoration:none;">
                      ${options.ctaText}
                    </a>
                  </td>
                </tr>
              </table>
              ${
                options.secondaryCtaText && options.secondaryCtaUrl
                  ? `<div style="margin-top:14px;">
                      <a href="${options.secondaryCtaUrl}" target="_blank" style="color:#6b7280;font-size:12px;font-weight:700;text-decoration:underline;">
                        ${options.secondaryCtaText}
                      </a>
                    </div>`
                  : ''
              }
            </td>
          </tr>`
              : ''
          }

          <!-- 6. BRANDED DARK FOOTER WITH TRANSPARENT WHITE LOGO -->
          <tr>
            <td align="center" style="background-color:#141115;padding:32px 32px;border-top:1px solid #27272a;">
              <a href="${BASE_URL}/en" target="_blank" style="text-decoration:none;display:inline-block;margin-bottom:14px;">
                <img src="${LOGO_WHITE_URL}" width="150" alt="Back Pocket Mysteries" style="display:block;border:0;margin:0 auto;max-width:150px;height:auto;" />
              </a>
              <p style="margin:0 0 14px 0;font-size:12px;color:#a1a1aa;line-height:1.6;max-width:440px;">
                Custom-built murder mystery parties with personalized characters, clue photos, and mobile voice recordings, ready to play in ~20 minutes.
              </p>
              <p style="margin:0 0 12px 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">
                <a href="${BASE_URL}/en/mysteries" target="_blank" style="color:#fe04c6;text-decoration:none;margin:0 8px;">Browse Mysteries</a>
                <span style="color:#52525b;">•</span>
                <a href="${BASE_URL}/en/how-it-works" target="_blank" style="color:#e4e4e7;text-decoration:none;margin:0 8px;">How It Works</a>
                <span style="color:#52525b;">•</span>
                <a href="${BASE_URL}/en/blog" target="_blank" style="color:#e4e4e7;text-decoration:none;margin:0 8px;">The Mystery Gazette</a>
              </p>
              ${
                options.footerNote
                  ? `<p style="margin:12px 0 0 0;font-size:11px;color:#71717a;line-height:1.5;">${options.footerNote}</p>`
                  : ''
              }
              <p style="margin:12px 0 0 0;font-size:11px;color:#71717a;">
                © ${year} <a href="${BASE_URL}/en" target="_blank" style="color:#a1a1aa;text-decoration:none;">Back Pocket Games</a> · All rights reserved
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

/**
 * Converts HTML email content into a clean, readable plain-text multipart fallback
 * so mail servers (iCloud, Gmail, Outlook) never penalize emails for MIME_HTML_ONLY.
 */
export function htmlToPlainTextEmail(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h1|h2|h3|h4|tr|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&rarr;/gi, '->')
    .replace(/&middot;/gi, '·')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface NewAccountNotificationParams {
  userId?: string | null;
  email: string;
  fullName?: string | null;
  country?: string | null;
  currency?: string | null;
  timezone?: string | null;
  howFoundUs?: string | null;
  promoCode?: string | null;
  source?: string;
}

/**
 * Sends a fully branded Admin Notification email to Hello@backpocketgames.com whenever
 * a new user creates an account (via standard onboarding or guest invitation link).
 */
export async function sendAdminNewAccountNotificationEmail(
  params: NewAccountNotificationParams
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const displayName = (params.fullName || '').trim() || params.email;
    const adminProfileUrl = params.userId
      ? `${BASE_URL}/en/admin/users/${params.userId}`
      : `${BASE_URL}/en/admin/users`;

    const html = buildBrandedEmailShell({
      preheader: `${displayName} (${params.email}) just created a Back Pocket Mysteries customer account.`,
      kicker: 'NEW CUSTOMER ACCOUNT CREATED',
      headline: `New Member Joined: ${displayName}`,
      bodyHtml: `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Full Name</span><br/>
              <span style="color:#1e191c;font-size:16px;font-weight:800;">${displayName}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Account Email</span><br/>
              <a href="mailto:${params.email}" style="color:#fe04c6;text-decoration:none;font-size:16px;font-weight:800;">${params.email}</a>
            </td>
          </tr>
          ${
            params.country
              ? `<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                    <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Country · Currency · Timezone</span><br/>
                    <span style="color:#1e191c;font-size:14px;font-weight:700;">${params.country} (${params.currency || 'GBP'} · ${params.timezone || 'UTC'})</span>
                  </td>
                </tr>`
              : ''
          }
          ${
            params.howFoundUs
              ? `<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                    <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">How They Heard About Us</span><br/>
                    <span style="color:#1e191c;font-size:14px;font-weight:700;">${params.howFoundUs}</span>
                  </td>
                </tr>`
              : ''
          }
          ${
            params.promoCode
              ? `<tr>
                  <td style="padding:12px 0;border-bottom:1px solid #f4f4f5;">
                    <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Promo / Referral Code Entered</span><br/>
                    <span style="color:#fe04c6;font-size:15px;font-family:monospace;font-weight:900;">${params.promoCode}</span>
                  </td>
                </tr>`
              : ''
          }
          <tr>
            <td style="padding:12px 0;">
              <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Registration Path</span><br/>
              <span style="color:#1e191c;font-size:13px;font-weight:600;">${params.source || 'Website Onboarding (/en/login)'}</span>
            </td>
          </tr>
        </table>
        <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:16px 20px;border-radius:12px;">
          <p style="margin:0;color:#d4d4d8;font-size:13px;line-height:1.6;">
            ✓ This member now has an active Customer profile and is automatically included in your Weekly EDM Newsletter audience.
          </p>
        </div>
      `,
      ctaText: 'View Customer in Admin →',
      ctaUrl: adminProfileUrl,
    });

    await resend.emails.send({
      from: 'Back Pocket Mysteries Alerts <alerts@backpocketgames.com>',
      to: ['hello@backpocketgames.com', 'hello@studiogvb.com'],
      replyTo: params.email,
      subject: `New Member Account Created: ${displayName} (${params.email})`,
      html,
      text: htmlToPlainTextEmail(html),
    });
  } catch (err) {
    console.error('[NEW ACCOUNT EMAIL] Failed to send admin notification:', err);
  }
}

