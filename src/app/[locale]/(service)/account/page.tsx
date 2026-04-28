import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import DashboardClient from './DashboardClient';

export default async function AccountDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Fetch guest count
  const { count: guestCount } = await supabase
    .from('guests')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch guests for preview row (up to 4)
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, gender, avatar_url, traits')
    .eq('user_id', user.id)
    .limit(4);

  // Fetch order count
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  return (
    <DashboardClient
      user={{
        name: user.user_metadata?.full_name ?? '',
        email: user.email ?? '',
        emailVerified: !!user.email_confirmed_at,
      }}
      guestCount={guestCount ?? 0}
      orderCount={orderCount ?? 0}
      guests={(guests ?? []).map(g => ({ ...g, gender: g.gender ?? undefined, avatar_url: g.avatar_url ?? undefined, traits: g.traits ?? undefined }))}
      locale={locale}
    />
  );

}
