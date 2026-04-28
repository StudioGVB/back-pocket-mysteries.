const { Resend } = require('resend');
const resend = new Resend('re_cLjxv47E_N7dyBwjy5DALFfKXLgQupexF');

const year = new Date().getFullYear();

// In production this would be passed in dynamically
const mysteryTitle = 'The Gilded Gala Murders';
const customerName = 'Gabriella';

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="background:#f9f9f9;margin:0;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;border-bottom:4px solid #fe04c6;">
            <img src="https://mysteries.backpocketgames.com/logo-horizontal-white.png" width="200" alt="Back Pocket Mysteries" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:48px 48px 32px;">
            <p style="color:#fe04c6;font-size:12px;font-weight:700;margin:0 0 12px;letter-spacing:2.5px;text-transform:uppercase;">Mystery Ready</p>
            <h1 style="color:#111;font-size:28px;font-weight:900;margin:0 0 8px;letter-spacing:-0.5px;">The suspects have assembled. 🎭</h1>
            <p style="color:#888;font-size:16px;font-weight:600;margin:0 0 24px;font-style:italic;">${mysteryTitle}</p>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${customerName},</p>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 36px;">Great news — your custom mystery is fully built and waiting for you! Head to your account to review everything, download your host guide, and get ready for the big night.</p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:0 0 44px;">
                  <a href="https://mysteries.backpocketgames.com/account/orders" style="background:#fe04c6;color:#fff;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;display:inline-block;letter-spacing:0.5px;">
                    View My Mystery →
                  </a>
                </td>
              </tr>
            </table>

            <!-- Divider with label -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td style="border-top:1px solid #f0f0f0;width:42%;"></td>
                <td style="text-align:center;padding:0 12px;white-space:nowrap;">
                  <span style="color:#bbb;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">What's in your account</span>
                </td>
                <td style="border-top:1px solid #f0f0f0;width:42%;"></td>
              </tr>
            </table>

            <!-- Feature bullets -->
            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:40px;">
              <tr>
                <td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">📋</td>
                    <td>
                      <p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Host guide & run sheet</p>
                      <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Everything you need to run the evening smoothly.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 0 16px;">
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">🕵️</td>
                    <td>
                      <p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Character sheets ready to send</p>
                      <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Send your guests their secret roles straight from your account.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="0"><tr>
                    <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">🔍</td>
                    <td>
                      <p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Clues, scripts & reveal notes</p>
                      <p style="margin:0;color:#888;font-size:13px;line-height:1.6;">All your mystery materials, downloadable and print-ready.</p>
                    </td>
                  </tr></table>
                </td>
              </tr>
            </table>

            <p style="color:#aaa;font-size:13px;line-height:1.7;margin:0 0 20px;">If you have any questions, just reply to this email — we're always happy to help.</p>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0;">Happy sleuthing,<br/><strong>The Back Pocket Mysteries Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr><td style="padding:0 48px;"><div style="border-top:1px solid #eee;"></div></td></tr>
        <tr>
          <td style="background:#fafafa;padding:24px 48px;text-align:center;">
            <p style="color:#aaa;font-size:12px;margin:0 0 6px;">© ${year} Back Pocket Games. All rights reserved.</p>
            <a href="https://mysteries.backpocketgames.com" style="color:#fe04c6;font-size:12px;text-decoration:none;">mysteries.backpocketgames.com</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

resend.emails.send({
  from: 'Back Pocket Mysteries <noreply@backpocketgames.com>',
  to: 'Hello@backpocketgames.com',
  subject: `[Test] Your mystery is ready — ${mysteryTitle}`,
  html
}).then(r => {
  if (r.error) { console.error('FAILED:', JSON.stringify(r.error)); process.exit(1); }
  else { console.log('SENT! ID:', r.data.id); }
}).catch(e => { console.error(e.message); process.exit(1); });
