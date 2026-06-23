import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileAndGuestsClient from './ProfileAndGuestsClient';

export const metadata = { title: 'My Roster — Back Pocket Mysteries' };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  // Fetch manually-created guests
  const { data: manualGuests } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch linked guests (via accepted invitations)
  const { data: connections } = await (supabase as any)
    .from('guest_connections')
    .select(`
      id,
      guest_user_id,
      profiles!guest_user_id (
        bio,
        location,
        pronouns,
        avatar_config,
        dietary_needs,
        character_preferences
      )
    `)
    .eq('host_user_id', user.id);

  // Fetch pending invitations
  const { data: pendingInvites } = await (supabase as any)
    .from('guest_invitations')
    .select('id, invite_email, personal_note, created_at, expires_at, manual_guest_id')
    .eq('inviter_user_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString());

  const linkedGuestIds: string[] = (connections ?? []).map((c: any) => c.guest_user_id);
  let linkedGuestNames: Record<string, string> = {};
  if (linkedGuestIds.length > 0) {
    const { data: linkedProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', linkedGuestIds);
    (linkedProfiles ?? []).forEach((p: any) => {
      linkedGuestNames[p.id] = p.full_name || 'Guest';
    });
  }

  const linkedGuests = (connections ?? []).map((c: any) => ({
    id: c.id,
    connectionId: c.id,
    guestUserId: c.guest_user_id,
    name: linkedGuestNames[c.guest_user_id] || 'Linked Guest',
    isLinked: true,
    profile: c.profiles,
  }));

  return (
    <ProfileAndGuestsClient
      user={{
        name: user.user_metadata?.full_name ?? '',
        email: user.email ?? '',
      }}
      profile={profile ?? null}
      initialGuests={manualGuests ?? []}
      linkedGuests={linkedGuests}
      pendingInvites={pendingInvites ?? []}
      locale={locale}
    />
  );
}
