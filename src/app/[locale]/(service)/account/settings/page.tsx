import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import SettingsClient from './SettingsClient';

export const unstable_instant = false;

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const meta = user.user_metadata || {};
  const cookieCurrency = cookieStore.get('NEXT_CURRENCY')?.value;

  // Fetch user's orders for Purchase History
  const { data: rawOrders } = await (supabase as any)
    .from('orders')
    .select(`
      id,
      mystery_id,
      amount,
      currency,
      status,
      created_at,
      mysteries:mystery_id (title, theme)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Fetch user's guests for Data Export
  const { data: guests } = await supabase
    .from('guests')
    .select('id, name, gender, eye_color, height, ethnicity, traits, bio, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const orders = (rawOrders ?? []).map((o: any) => ({
    id: o.id,
    mysteryId: o.mystery_id,
    mysteryTitle: o.mysteries?.title || 'Custom Murder Mystery',
    mysteryTheme: o.mysteries?.theme || 'Mystery Pack',
    amount: o.amount,
    currency: (o.currency || 'USD').toUpperCase(),
    status: o.status || 'succeeded',
    createdAt: o.created_at,
  }));

  const { getOrRegisterUserReferralWalletAction } = await import('@/app/actions/referrals');
  const referralWallet = await getOrRegisterUserReferralWalletAction();

  const userData = {
    id: user.id,
    name: meta.full_name ?? '',
    email: user.email ?? '',
    phone: meta.contact_phone ?? '',
    emailVerified: !!user.email_confirmed_at,
    currency: cookieCurrency || meta.preferred_currency || 'USD',
    country: meta.country || 'United States',
    timezone: meta.timezone || 'Europe/London',
    referralCode: referralWallet.referralCode,
    referralLink: referralWallet.referralLink,
    referralsCompletedCount: referralWallet.referralsCompletedCount,
    rewardVouchers: referralWallet.rewardVouchers,
    appliedSignupPromo: referralWallet.appliedSignupPromo || null,
    billing: meta.billing_details || {
      companyName: '',
      addressLine1: '',
      city: '',
      postalCode: '',
      billingCountry: meta.country || 'United States',
      taxId: '',
    },
    hostingPreferences: meta.hosting_preferences || {
      defaultDelivery: 'both',
      complexityDefault: 'medium',
      spiceDefault: 'mild',
      largePrintPdf: false,
      dyslexiaFont: false,
    },
    notificationSettings: meta.notification_settings || {
      mysteryUpdates: true,
      guestRsvpAlerts: true,
      eventReminders: true,
      referralRewards: true,
      marketingOffers: true,
      hostingTips: false,
    },
  };

  return (
    <SettingsClient
      user={userData}
      orders={orders}
      guests={guests ?? []}
      locale={locale}
    />
  );
}
