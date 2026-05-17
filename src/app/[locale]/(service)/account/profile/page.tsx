import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import ProfileClient from './ProfileClient';

export const metadata = { title: 'My Profile — Back Pocket Mysteries' };

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
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return (
    <ProfileClient
      user={{
        name: user.user_metadata?.full_name ?? '',
        email: user.email ?? '',
      }}
      profile={profile ?? null}
    />
  );
}
