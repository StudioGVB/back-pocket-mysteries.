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

  // Fetch guests for preview row (up to 8)
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, gender, avatar_url, traits')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(8);

  // Fetch order count
  const { count: orderCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch published mysteries and order counts to rank by most popular selling
  const { data: publishedMysteries } = await supabase
    .from('mysteries')
    .select('id, title, theme, description, image_url, min_players, max_players, complexity')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  const { data: allSales } = await supabase
    .from('orders')
    .select('mystery_id')
    .eq('status', 'succeeded');

  const salesCountMap = (allSales ?? []).reduce<Record<string, number>>((acc, sale: any) => {
    if (sale.mystery_id) {
      acc[sale.mystery_id] = (acc[sale.mystery_id] || 0) + 1;
    }
    return acc;
  }, {});

  const popularMysteries = (publishedMysteries ?? [])
    .sort((a, b) => (salesCountMap[b.id] || 0) - (salesCountMap[a.id] || 0))
    .slice(0, 3);

  const { getSubscriberGiftPassStateForUser } = await import('@/app/actions/subscriber-perks');
  const giftPassState = await getSubscriberGiftPassStateForUser(user.id);

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
      giftPassState={giftPassState}
    />
  );
}
