import React from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { getPublishedMysteries } from '@/services/mysteries';
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

  // Run all 5 dashboard queries in parallel instead of sequentially
  const [
    { count: guestCount },
    { data: guests },
    { count: orderCount },
    publishedMysteries,
    { data: allSales },
  ] = await Promise.all([
    supabase
      .from('guests')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    supabase
      .from('guests')
      .select('id, name, gender, avatar_url, traits')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    getPublishedMysteries(),
    supabase
      .from('orders')
      .select('mystery_id')
      .eq('status', 'succeeded'),
  ]);

  const salesCountMap = (allSales ?? []).reduce<Record<string, number>>((acc, sale: any) => {
    if (sale.mystery_id) {
      acc[sale.mystery_id] = (acc[sale.mystery_id] || 0) + 1;
    }
    return acc;
  }, {});

  const popularMysteries = (publishedMysteries ?? [])
    .sort((a: any, b: any) => (salesCountMap[b.id] || 0) - (salesCountMap[a.id] || 0))
    .slice(0, 3);

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
      popularMysteries={popularMysteries}
      locale={locale}
    />
  );
}
