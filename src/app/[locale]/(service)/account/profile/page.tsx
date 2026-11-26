import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { acceptInvitation } from '@/app/actions/guest-invitations';
import { getAllCachedMysteries } from '@/lib/live-session-store';
import ProfileAndGuestsClient from './ProfileAndGuestsClient';

export const metadata = { title: 'My Roster - Back Pocket Mysteries' };

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

  // Run all 5 profile & guest queries in parallel instead of sequentially
  const [
    { data: acceptedWithManual },
    { data: profile },
    { data: rawManualGuests },
    { data: connections },
    { data: pendingInvites },
  ] = await Promise.all([
    (supabase as any)
      .from('guest_invitations')
      .select('id, manual_guest_id')
      .eq('inviter_user_id', user.id)
      .eq('status', 'accepted')
      .not('manual_guest_id', 'is', null),
    (supabase as any)
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('guests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    (supabase as any)
      .from('guest_connections')
      .select(`
        id,
        guest_user_id,
        profiles!guest_user_id (
          full_name,
          bio,
          location,
          pronouns,
          avatar_config,
          dietary_needs,
          character_preferences
        )
      `)
      .eq('host_user_id', user.id),
    (supabase as any)
      .from('guest_invitations')
      .select('id, invite_email, invite_token, personal_note, created_at, expires_at, manual_guest_id')
      .eq('inviter_user_id', user.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString()),
  ]);

  const manualIdsToRemoveSet = new Set<string>(
    (acceptedWithManual || [])
      .map((inv: any) => inv.manual_guest_id)
      .filter(Boolean)
  );
  if (manualIdsToRemoveSet.size > 0) {
    // Non-blocking cleanup of accepted manual_guest_id rows
    supabase
      .from('guests')
      .delete()
      .in('id', Array.from(manualIdsToRemoveSet))
      .eq('user_id', user.id)
      .then(() => {}, () => {});
  }

  const filteredManualGuests = (rawManualGuests || []).filter(
    (g: any) => !manualIdsToRemoveSet.has(g.id)
  );

  const ownGuestIdSet = new Set(filteredManualGuests.map((g: any) => String(g.id)));
  const cachedMysteries = getAllCachedMysteries();
  const cachedAvatarByGuestId = new Map<string, string>();
  for (const m of Object.values(cachedMysteries || {})) {
    if ((m as any)?.created_by && (m as any).created_by !== user.id) continue;
    for (const c of (m as any)?.characters || []) {
      const pd = c.profile_data || {};
      if (
        pd.guest_id &&
        ownGuestIdSet.has(String(pd.guest_id)) &&
        String(pd.avatar_url || '').includes('aiPhotoUrl=')
      ) {
        cachedAvatarByGuestId.set(pd.guest_id, pd.avatar_url);
      }
    }
  }

  const { upgradeLegacyCloneAvatarUrl } = await import('@/utils/avatar');
  const manualGuests = filteredManualGuests.map((mg: any) => {
    let avatarUrl = String(mg.avatar_url || '');
    if (!avatarUrl.includes('aiPhotoUrl=')) {
      const cachedUrl = cachedAvatarByGuestId.get(mg.id);
      if (cachedUrl) {
        avatarUrl = cachedUrl;
      }
    }
    const upgradedUrl = upgradeLegacyCloneAvatarUrl({
      id: mg.id,
      name: mg.name,
      avatar_url: avatarUrl,
    });
    if (upgradedUrl && upgradedUrl !== mg.avatar_url) {
      // Non-blocking background persistence so page render returns immediately
      supabase
        .from('guests')
        .update({ avatar_url: upgradedUrl })
        .eq('id', mg.id)
        .eq('user_id', user.id)
        .then(() => {}, () => {});
      return { ...mg, avatar_url: upgradedUrl };
    }
    return mg;
  });

  const linkedGuestNames: Record<string, string> = {};
  for (const c of connections ?? []) {
    if (c.guest_user_id && c.profiles?.full_name) {
      linkedGuestNames[c.guest_user_id] = c.profiles.full_name;
    }
  }

  const linkedGuests = (connections ?? []).map((c: any) => ({
    id: c.id,
    connectionId: c.id,
    guestUserId: c.guest_user_id,
    name: linkedGuestNames[c.guest_user_id] || 'Linked Guest',
    isLinked: true,
    profile: c.profiles,
  }));

  const resolvedHostName =
    profile?.full_name?.trim() ||
    user.user_metadata?.full_name?.trim() ||
    (user.id === '4903bd39-e54f-42e4-b679-2af5d128bb8f' ||
    String(user.email || '').toLowerCase().includes('studiogvb') ||
    String(user.email || '').toLowerCase().includes('gabriella')
      ? 'Gabriella Blyth'
      : user.email?.split('@')[0] || 'Gabriella Blyth');

  return (
    <ProfileAndGuestsClient
      user={{
        name: resolvedHostName,
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

