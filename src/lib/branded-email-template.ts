const BASE_URL = 'https://backpocketmysteries.com';
const LOGO_COLOR_URL = `${BASE_URL}/logo-horizontal.png`;
const EMAIL_FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export interface BrandedEmailShellOptions {
  preheader?: string;
  badgeText?: string;
  kicker?: string;
  headline: string;
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
 * Generates the signature Back Pocket Mysteries branded email HTML.
 * Includes the vibrant hot-pink & royal-blue official Back Pocket Games logo,
 * optional Mystery Package Cover Photo showcase, hot-pink accent rule, and branded footer.
 */
export function buildBrandedEmailShell(options: BrandedEmailShellOptions): string {
  const year = new Date().getFullYear();
  const topBadge = options.badgeText || 'CASE FILE BRIEFING';

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
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f4f5;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 36px rgba(17,17,17,0.10);border:1px solid #e4e4e7;">
          <!-- TOP BRAND BAR WITH OFFICIAL PINK & BLUE BACK POCKET GAMES LOGO -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 36px 20px 36px;border-bottom:4px solid #fe04c6;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${BASE_URL}/en" target="_blank" style="text-decoration:none;display:inline-block;">
                      <img src="${LOGO_COLOR_URL}" width="190" alt="Back Pocket Games" style="display:block;border:0;max-width:190px;height:auto;font-family:${EMAIL_FONT};font-size:18px;font-weight:900;color:#fe04c6;" />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;background-color:#141115;border:1px solid #fe04c6;color:#fe04c6;font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:6px 12px;border-radius:999px;">
                      ${topBadge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DARK HERO HEADLINE + OPTIONAL MYSTERY PACKAGE PHOTO CARD -->
          <tr>
            <td style="background-color:#141115;padding:32px 36px 34px 36px;">
              ${
                options.kicker
                  ? `<p style="font-size:11px;font-weight:900;letter-spacing:2.2px;color:#fe04c6;text-transform:uppercase;margin:0 0 10px 0;">${options.kicker}</p>`
                  : ''
              }
              <h1 style="font-size:27px;font-weight:900;color:#ffffff;margin:0;line-height:1.25;letter-spacing:-0.4px;">
                ${options.headline}
              </h1>
              ${
                options.heroImageUrl
                  ? `<div style="margin-top:24px;border-radius:16px;overflow:hidden;border:2px solid rgba(254,4,198,0.45);background-color:#1e191c;box-shadow:0 10px 25px rgba(0,0,0,0.45);">
                      <img src="${options.heroImageUrl}" width="524" alt="${(options.heroImageAlt || 'Mystery Package Cover').replace(/"/g, '&quot;')}" style="display:block;width:100%;max-width:524px;height:auto;object-fit:cover;border:0;" />
                      ${
                        options.heroImageBadge || options.heroImageCaption
                          ? `<div style="padding:14px 18px;background-color:#1e191c;border-top:1px solid rgba(255,255,255,0.08);">
                              ${
                                options.heroImageBadge
                                  ? `<span style="display:inline-block;background-color:#fe04c6;color:#ffffff;font-size:10px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;padding:4px 10px;border-radius:999px;margin-bottom:${options.heroImageCaption ? '6px' : '0'};">${options.heroImageBadge}</span>`
                                  : ''
                              }
                              ${
                                options.heroImageCaption
                                  ? `<p style="margin:0;color:#e4e4e7;font-size:13px;font-weight:700;line-height:1.45;">${options.heroImageCaption}</p>`
                                  : ''
                              }
                            </div>`
                          : ''
                      }
                    </div>`
                  : ''
              }
            </td>
          </tr>

          <!-- MAIN CONTENT -->
          <tr>
            <td style="padding:36px 36px 24px 36px;color:#1e191c;font-size:15px;line-height:1.7;">
              ${options.bodyHtml}
            </td>
          </tr>

          ${
            options.ctaText && options.ctaUrl
              ? `<!-- PRIMARY CTA -->
          <tr>
            <td align="center" style="padding:4px 36px 34px 36px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="background-color:#fe04c6;border-radius:999px;box-shadow:0 8px 20px rgba(254,4,198,0.35);">
                    <a href="${options.ctaUrl}" target="_blank" style="display:inline-block;padding:16px 34px;color:#ffffff;font-family:${EMAIL_FONT};font-size:13px;font-weight:900;letter-spacing:1.4px;text-transform:uppercase;text-decoration:none;">
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

          <!-- BRANDED SIGNATURE FOOTER -->
          <tr>
            <td align="center" style="background-color:#141115;padding:32px 36px;border-top:3px solid #fe04c6;">
              <div style="display:inline-block;background-color:#ffffff;padding:10px 18px;border-radius:12px;margin-bottom:14px;">
                <a href="${BASE_URL}/en" target="_blank" style="text-decoration:none;display:inline-block;">
                  <img src="${LOGO_COLOR_URL}" width="140" alt="Back Pocket Games" style="display:block;border:0;margin:0 auto;max-width:140px;height:auto;" />
                </a>
              </div>
              <p style="margin:0 0 14px 0;font-size:12px;color:#d4d4d8;line-height:1.6;max-width:440px;">
                Custom-built murder mystery parties with personalized characters, crime-scene photos, and mobile voice wiretaps, ready to play in ~20 minutes.
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
                © ${year} Back Pocket Mysteries · <a href="${BASE_URL}/en" target="_blank" style="color:#a1a1aa;text-decoration:none;">backpocketmysteries.com</a>
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
      from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
      to: ['Hello@backpocketgames.com'],
      replyTo: params.email,
      subject: `👤 New Member Account Created: ${displayName} (${params.email})`,
      html,
    });
  } catch (err) {
    console.error('[NEW ACCOUNT EMAIL] Failed to send admin notification:', err);
  }
}

