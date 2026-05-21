'use server';

import { createClient } from '@/utils/supabase/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://mysteries.backpocketgames.com';

// --- Send an invitation ---
export async function sendGuestInvitation(email: string, note?: string, manualGuestId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const hostName = user.user_metadata?.full_name || user.email || 'Someone';

  // Check if already pending
  const { data: existing } = await (supabase as any)
    .from('guest_invitations')
    .select('id, status')
    .eq('inviter_user_id', user.id)
    .eq('invite_email', email.toLowerCase())
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (existing) {
    return { error: existing.status === 'accepted' ? 'This guest is already linked to your account.' : 'An invite is already pending for this email.' };
  }

  // Create the invitation record
  const { data: invite, error: insertError } = await (supabase as any)
    .from('guest_invitations')
    .insert({
      inviter_user_id: user.id,
      invite_email: email.toLowerCase(),
      personal_note: note || null,
      manual_guest_id: manualGuestId || null,
    })
    .select()
    .single();

  if (insertError || !invite) return { error: insertError?.message || 'Failed to create invitation' };

  const inviteUrl = `${APP_URL}/en/invite/${invite.invite_token}`;
  const year = new Date().getFullYear();

  // Send the branded invite email
  const { error: emailError } = await resend.emails.send({
    from: 'Back Pocket Mysteries <noreply@backpocketgames.com>',
    to: email,
    subject: `${hostName} invited you to join Back Pocket Mysteries`,
    html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="background:#f9f9f9;margin:0;padding:0;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);max-width:600px;width:100%;">

        <tr>
          <td style="background:#111111;padding:32px 40px;text-align:center;border-bottom:4px solid #fe04c6;">
            <img src="https://mysteries.backpocketgames.com/logo-horizontal-white.png" width="200" alt="Back Pocket Mysteries" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <tr>
          <td style="padding:48px 48px 32px;">
            <p style="color:#fe04c6;font-size:12px;font-weight:700;margin:0 0 12px;letter-spacing:2.5px;text-transform:uppercase;">You're invited</p>
            <h1 style="color:#111;font-size:28px;font-weight:900;margin:0 0 20px;letter-spacing:-0.5px;">${hostName} wants you on their guest list.</h1>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 16px;">
              They're building custom murder mystery nights on Back Pocket Mysteries and have invited you to create your own player profile — so they can cast you perfectly, every time.
            </p>
            ${note ? `<div style="background:#f9f9f9;border-left:3px solid #fe04c6;border-radius:4px;padding:16px 20px;margin:0 0 24px;"><p style="color:#555;font-size:15px;line-height:1.7;margin:0;font-style:italic;">"${note}"</p><p style="color:#aaa;font-size:12px;margin:8px 0 0;font-weight:700;">— ${hostName}</p></div>` : ''}
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 36px;">
              Create your free account, build your avatar, set your character preferences and dietary needs — then you're on the list for future mystery nights.
            </p>

            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:0 0 44px;">
                  <a href="${inviteUrl}" style="background:#fe04c6;color:#fff;font-size:16px;font-weight:900;text-decoration:none;padding:16px 40px;border-radius:50px;display:inline-block;letter-spacing:0.5px;">
                    Accept Invitation →
                  </a>
                </td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
              <tr>
                <td style="border-top:1px solid #f0f0f0;width:42%;"></td>
                <td style="text-align:center;padding:0 12px;white-space:nowrap;">
                  <span style="color:#bbb;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">What you get</span>
                </td>
                <td style="border-top:1px solid #f0f0f0;width:42%;"></td>
              </tr>
            </table>

            <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:40px;">
              <tr><td style="padding:0 0 16px;"><table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">🎭</td>
                <td><p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Your own player profile</p><p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Build your avatar, set preferences, and be ready for any mystery night.</p></td>
              </tr></table></td></tr>
              <tr><td style="padding:0 0 16px;"><table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">🕵️</td>
                <td><p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Get cast in mysteries</p><p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Hosts can cast you based on your character preferences and personality.</p></td>
              </tr></table></td></tr>
              <tr><td><table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">📦</td>
                <td><p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">One account, every event</p><p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Be on multiple hosts' rosters with a single profile you control.</p></td>
              </tr></table></td></tr>
            </table>

            <p style="color:#aaa;font-size:13px;line-height:1.7;margin:0 0 20px;">This invite expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0;">Happy sleuthing,<br/><strong>The Back Pocket Mysteries Team</strong></p>
          </td>
        </tr>

        <tr><td style="padding:0 48px;"><div style="border-top:1px solid #eee;"></div></td></tr>
        <tr>
          <td style="background:#fafafa;padding:24px 48px;text-align:center;">
            <p style="color:#aaa;font-size:12px;margin:0 0 6px;">© ${year} Back Pocket Games. All rights reserved.</p>
            <a href="${APP_URL}" style="color:#fe04c6;font-size:12px;text-decoration:none;">mysteries.backpocketgames.com</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (emailError) {
    // Still created the DB record — soft fail on email
    console.error('Invite email failed:', emailError);
  }

  return { success: true, inviteId: invite.id };
}

// --- Accept an invitation (called after user signs up/logs in via invite link) ---
export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Find the valid (non-expired) invite
  const { data: invite } = await (supabase as any)
    .from('guest_invitations')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) return { error: 'This invitation has expired or is no longer valid.' };
  if (invite.inviter_user_id === user.id) return { error: "You can't accept your own invitation." };

  // 3. Mark invitation as accepted
  const { data: updatedInvite, error: updateError } = await (supabase as any)
    .from('guest_invitations')
    .update({
      status: 'accepted',
      invited_user_id: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // 4. Create the connection
  const { error: connectionError } = await (supabase as any)
    .from('guest_connections')
    .insert({
      host_user_id: invite.inviter_user_id,
      guest_user_id: user.id,
      invitation_id: invite.id,
    });

  if (connectionError) throw connectionError;

  // 5. If this invite was tied to a manual guest, delete the manual guest
  if (updatedInvite.manual_guest_id) {
    await (supabase as any)
      .from('guests')
      .delete()
      .eq('id', updatedInvite.manual_guest_id)
      .eq('user_id', invite.inviter_user_id);
  }

  return { success: true, hostId: invite.inviter_user_id };
}

// --- Remove a guest connection (from host side) ---
export async function removeGuestConnection(connectionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await (supabase as any)
    .from('guest_connections')
    .delete()
    .eq('id', connectionId)
    .eq('host_user_id', user.id);

  return { success: true };
}

// --- Cancel a pending invite ---
export async function cancelInvitation(inviteId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await (supabase as any)
    .from('guest_invitations')
    .update({ status: 'cancelled' })
    .eq('id', inviteId)
    .eq('inviter_user_id', user.id);

  return { success: true };
}
