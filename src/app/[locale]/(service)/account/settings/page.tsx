import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import SettingsClient from './SettingsClient';

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/auth/login`);
  }

  const userData = {
    name: user.user_metadata?.full_name ?? '',
    email: user.email ?? '',
    emailVerified: !!user.email_confirmed_at,
  };

  return <SettingsClient user={userData} />;
}
