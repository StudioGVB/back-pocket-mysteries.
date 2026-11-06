import React from 'react';
import { createClient } from '@/utils/supabase/server';
import InviteClient from './InviteClient';

interface Props {
  params: Promise<{ locale: string; token: string }>;
}

export const unstable_instant = false;

export const metadata = { title: 'You\'re Invited — Back Pocket Mysteries' };

export default async function InvitePage({ params }: Props) {
  const { locale, token } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  // Look up the invite (without accepting it yet)
  const { data: invite } = await (supabase as any)
    .from('guest_invitations')
    .select('invite_email, personal_note, status, expires_at, inviter_user_id')
    .eq('invite_token', token)
    .maybeSingle();

  let hostName = 'Someone';
  let isValid = false;
  let isExpired = false;
  let isAlreadyUsed = false;
  let invitedGuestName: string | null = null;
  let invitedEmail: string | null = null;

  if (invite) {
    isAlreadyUsed = invite.status !== 'pending';
    isExpired = !isAlreadyUsed && new Date(invite.expires_at) < new Date();
    isValid = !isAlreadyUsed && !isExpired;

    if (typeof invite.invite_email === 'string') {
      if (invite.invite_email.startsWith('link:')) {
        const extracted = invite.invite_email.replace(/^link:/, '').trim();
        if (extracted && extracted.toLowerCase() !== 'friend') {
          invitedGuestName = extracted;
        }
      } else if (invite.invite_email.includes('@')) {
        invitedEmail = invite.invite_email;
      }
    }

    if (isValid) {
      // Get inviter's display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', invite.inviter_user_id)
        .maybeSingle();
      hostName = (profile as any)?.full_name || 'A mystery host';
    }
  }

  const isHostPreview = Boolean(user && invite && user.id === invite.inviter_user_id);

  return (
    <InviteClient
      token={token}
      locale={locale}
      hostName={hostName}
      personalNote={invite?.personal_note ?? null}
      invitedGuestName={invitedGuestName}
      invitedEmail={invitedEmail}
      isLoggedIn={Boolean(user)}
      currentUserEmail={user?.email ?? null}
      isHostPreview={isHostPreview}
      isValid={isValid}
      isExpired={isExpired}
      isAlreadyUsed={isAlreadyUsed}
      notFound={!invite}
    />
  );
}
