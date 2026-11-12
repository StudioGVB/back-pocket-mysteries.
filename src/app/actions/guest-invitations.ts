'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash');
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://backpocketmysteries.com';

// --- Create or reuse a shareable invite link (no email required) ---
export async function createShareableInviteLink(options?: {
  manualGuestId?: string;
  guestName?: string;
  note?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const manualGuestId = options?.manualGuestId || undefined;
  const guestName = options?.guestName?.trim() || undefined;
  const note = options?.note?.trim() || undefined;

  // If tied to a specific manual guest card, reuse any existing active pending invite so links stay valid
  if (manualGuestId) {
    const { data: existing } = await (supabase as any)
      .from('guest_invitations')
      .select('*')
      .eq('inviter_user_id', user.id)
      .eq('manual_guest_id', manualGuestId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      if (note && note !== existing.personal_note) {
        await (supabase as any)
          .from('guest_invitations')
          .update({ personal_note: note })
          .eq('id', existing.id);
      }
      return {
        success: true,
        reused: true,
        inviteId: existing.id as string,
        inviteToken: existing.invite_token as string,
        inviteEmail: existing.invite_email as string,
        expiresAt: existing.expires_at as string,
        manualGuestId: existing.manual_guest_id as string | null,
      };
    }
  }

  const labelEmail = guestName ? `link:${guestName}` : 'link:Friend';

  const { data: invite, error: insertError } = await (supabase as any)
    .from('guest_invitations')
    .insert({
      inviter_user_id: user.id,
      invite_email: labelEmail,
      personal_note: note || null,
      manual_guest_id: manualGuestId || null,
    })
    .select()
    .single();

  if (insertError || !invite) {
    return { error: insertError?.message || 'Failed to generate invite link' };
  }

  return {
    success: true,
    reused: false,
    inviteId: invite.id as string,
    inviteToken: invite.invite_token as string,
    inviteEmail: invite.invite_email as string,
    expiresAt: invite.expires_at as string,
    manualGuestId: (invite.manual_guest_id as string | null) ?? null,
  };
}

// --- Send an invitation via email ---
export async function sendGuestInvitation(email: string, note?: string, manualGuestId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const hostName = user.user_metadata?.full_name || user.email || 'Someone';

  // Check if already pending for this email
  const { data: existing } = await (supabase as any)
    .from('guest_invitations')
    .select('id, status, invite_token, expires_at')
    .eq('inviter_user_id', user.id)
    .eq('invite_email', email.toLowerCase())
    .in('status', ['pending', 'accepted'])
    .maybeSingle();

  if (existing) {
    return {
      error:
        existing.status === 'accepted'
          ? 'This guest is already linked to your account.'
          : 'An invite is already pending for this email.',
    };
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
            <img src="https://backpocketmysteries.com/logo-horizontal-white.png" width="200" alt="Back Pocket Mysteries" style="display:block;margin:0 auto;" />
          </td>
        </tr>

        <tr>
          <td style="padding:48px 48px 32px;">
            <p style="color:#fe04c6;font-size:12px;font-weight:700;margin:0 0 12px;letter-spacing:2.5px;text-transform:uppercase;">You're invited</p>
            <h1 style="color:#111;font-size:28px;font-weight:900;margin:0 0 20px;letter-spacing:-0.5px;">${hostName} wants to connect with you.</h1>
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 16px;">
              They're using Back Pocket Mysteries to build custom murder mystery nights and have invited you to collaborate! Create your own player profile so you can join their roster, connect your profiles, and be cast perfectly in their upcoming mysteries.
            </p>
            ${note ? `<div style="background:#f9f9f9;border-left:3px solid #fe04c6;border-radius:4px;padding:16px 20px;margin:0 0 24px;"><p style="color:#555;font-size:15px;line-height:1.7;margin:0;font-style:italic;">"${note}"</p><p style="color:#aaa;font-size:12px;margin:8px 0 0;font-weight:700;"> - ${hostName}</p></div>` : ''}
            <p style="color:#555;font-size:16px;line-height:1.7;margin:0 0 36px;">
              Create your free account, build your avatar, set your character preferences and dietary needs, then you're on the list for future mystery nights.
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
                <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">🤝</td>
                <td><p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">Connect with friends</p><p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Link your profile to their account so you can see each other's details.</p></td>
              </tr></table></td></tr>
              <tr><td><table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:22px;padding-right:14px;vertical-align:top;padding-top:2px;">📦</td>
                <td><p style="margin:0 0 2px;color:#222;font-size:14px;font-weight:700;">One account, every event</p><p style="margin:0;color:#888;font-size:13px;line-height:1.6;">Build your avatar and preferences once, and use them across all your friend's games.</p></td>
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
            <a href="${APP_URL}" style="color:#fe04c6;font-size:12px;text-decoration:none;">backpocketmysteries.com</a>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  });

  if (emailError) {
    // Still created the DB record, soft fail on email
    console.error('Invite email failed:', emailError);
  }

  return {
    success: true,
    inviteId: invite.id as string,
    inviteToken: invite.invite_token as string,
    expiresAt: invite.expires_at as string,
  };
}

// --- Internal helper to finalize an invitation for a known userId ---
async function finalizeInvitationForUser(
  supabase: any,
  invite: any,
  userId: string,
  fallbackFullName?: string
) {
  if (invite.inviter_user_id === userId) {
    return { error: "You're currently signed in as the host who created this invite. Sign in or create an account as your guest to claim it!" };
  }

  // Ensure the guest's profile has a full_name if we know it
  const invitedNameFromLink = invite.invite_email?.startsWith('link:')
    ? invite.invite_email.replace(/^link:/, '').trim()
    : '';
  const effectiveName =
    fallbackFullName?.trim() ||
    (invitedNameFromLink && invitedNameFromLink !== 'Friend' ? invitedNameFromLink : '');

  if (effectiveName) {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile && !existingProfile.full_name) {
      await supabase
        .from('profiles')
        .update({ full_name: effectiveName })
        .eq('id', userId);
    }
  }

  // 1. Mark invitation as accepted
  const { data: updatedInvite, error: updateError } = await supabase
    .from('guest_invitations')
    .update({
      status: 'accepted',
      invited_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)
    .select()
    .single();

  if (updateError) {
    return { error: updateError.message || 'Failed to accept invitation.' };
  }

  // 2. Create the connection (if not already connected)
  const { data: existingConn } = await supabase
    .from('guest_connections')
    .select('id')
    .eq('host_user_id', invite.inviter_user_id)
    .eq('guest_user_id', userId)
    .maybeSingle();

  if (!existingConn) {
    const { error: connectionError } = await supabase
      .from('guest_connections')
      .insert({
        host_user_id: invite.inviter_user_id,
        guest_user_id: userId,
        invitation_id: invite.id,
      });

    if (connectionError) {
      return { error: connectionError.message || 'Failed to link guest connection.' };
    }
  }

  // 3. Best-effort cleanup of manual_guest_id (also cleaned up on host's ProfilePage load)
  if (updatedInvite?.manual_guest_id) {
    await supabase
      .from('guests')
      .delete()
      .eq('id', updatedInvite.manual_guest_id)
      .eq('user_id', invite.inviter_user_id);
  }

  // Clear pending invite cookie if present
  try {
    const cookieStore = await cookies();
    cookieStore.delete('bpm_pending_invite_token');
  } catch {
    // Ignore cookie errors
  }

  return { success: true, hostId: invite.inviter_user_id };
}

// --- Accept an invitation (called when user is already signed in) ---
export async function acceptInvitation(token: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: invite } = await (supabase as any)
    .from('guest_invitations')
    .select('*')
    .eq('invite_token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) return { error: 'This invitation has expired or is no longer valid.' };

  return finalizeInvitationForUser(
    supabase,
    invite,
    user.id,
    user.user_metadata?.full_name
  );
}

// --- Seamless in-page Sign Up or Sign In + Accept Invitation in one step ---
export async function claimInvitationWithAuthAction(input: {
  token: string;
  mode: 'signup' | 'login';
  fullName?: string;
  email: string;
  password: string;
}) {
  const supabase = await createClient(true);
  const email = input.email.trim().toLowerCase();
  const password = input.password;
  const fullName = input.fullName?.trim() || '';

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' };
  }

  // Verify invite is valid first
  const { data: invite } = await (supabase as any)
    .from('guest_invitations')
    .select('*')
    .eq('invite_token', input.token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (!invite) {
    return { error: 'This invitation has expired or has already been claimed.' };
  }

  // Save token in cookie so even if email confirmation is required, logging in later auto-links them
  try {
    const cookieStore = await cookies();
    cookieStore.set('bpm_pending_invite_token', input.token, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch {
    // Ignore
  }

  let userId: string | null = null;
  let hasActiveSession = false;

  if (input.mode === 'signup') {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || (invite.invite_email?.startsWith('link:') ? invite.invite_email.replace(/^link:/, '') : 'Guest'),
        },
      },
    });

    if (signUpErr) {
      // If user already exists, seamlessly attempt sign-in with the provided password!
      if (signUpErr.message?.toLowerCase().includes('already registered')) {
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInErr || !signInData.user) {
          return {
            error: 'An account with this email already exists. Please switch to "Sign In" or check your password.',
          };
        }
        userId = signInData.user.id;
        hasActiveSession = Boolean(signInData.session);
      } else {
        return { error: signUpErr.message };
      }
    } else {
      userId = signUpData.user?.id || null;
      hasActiveSession = Boolean(signUpData.session);

      // If signUp didn't return a session, try immediate signInWithPassword in case auto-confirm is enabled
      if (userId && !hasActiveSession) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInData?.session) {
          hasActiveSession = true;
        }
      }
    }
  } else {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr || !signInData.user) {
      return { error: signInErr?.message || 'Invalid email or password.' };
    }
    userId = signInData.user.id;
    hasActiveSession = Boolean(signInData.session);
  }

  if (!userId) {
    return { error: 'Could not authenticate account. Please try again.' };
  }

  const finalizeResult = await finalizeInvitationForUser(
    supabase,
    invite,
    userId,
    fullName
  );

  if (finalizeResult.error) {
    return { error: finalizeResult.error };
  }

  return {
    success: true,
    hasActiveSession,
  };
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

