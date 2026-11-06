import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { acceptInvitation } from '@/app/actions/guest-invitations';
import ProfileAndGuestsClient from './ProfileAndGuestsClient';

export const metadata = { title: 'My Roster — Back Pocket Mysteries' };

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContentLoader params={params} />
    </Suspense>
  );
}

async function ProfileContentLoader({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  return <ProfileContent user={user} supabase={supabase} locale={locale} />;
}

async function ProfileContent({
  user,
  supabase,
  locale,
}: {
  user: any;
  supabase: any;
  locale: string;
}) {
  // 0. If this user has a pending invite token cookie from signing up via a share link, auto-accept it
  try {
    const cookieStore = await cookies();
    const pendingToken = cookieStore.get('bpm_pending_invite_token')?.value;
    if (pendingToken) {
      await acceptInvitation(pendingToken);
    }
  } catch {
    // Ignore cookie errors in Server Component render
  }

  // 0B. Clean up any manual_guest_id rows that have already been accepted by a linked friend
  const { data: acceptedWithManual } = await (supabase as any)
    .from('guest_invitations')
    .select('id, manual_guest_id')
    .eq('inviter_user_id', user.id)
    .eq('status', 'accepted')
    .not('manual_guest_id', 'is', null);

  if (acceptedWithManual && acceptedWithManual.length > 0) {
    const manualIdsToRemove = acceptedWithManual
      .map((inv: any) => inv.manual_guest_id)
      .filter(Boolean);
    if (manualIdsToRemove.length > 0) {
      await supabase
        .from('guests')
        .delete()
        .in('id', manualIdsToRemove)
        .eq('user_id', user.id);
    }
  }

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

  // Fetch pending invitations (including invite_token so host can copy link anytime)
  const { data: pendingInvites } = await (supabase as any)
    .from('guest_invitations')
    .select('id, invite_email, invite_token, personal_note, created_at, expires_at, manual_guest_id')
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

function ProfileSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 bg-slate-200 rounded w-1/3 mb-8"></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-slate-200 rounded-3xl h-96"></div>
        <div className="lg:col-span-2 bg-slate-200 rounded-3xl h-96"></div>
      </div>
    </div>
  );
}

