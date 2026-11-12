'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function updateProfile(name: string, email: string, phone?: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const updatePayload: { email?: string; data: Record<string, any> } = {
    data: {
      ...user.user_metadata,
      full_name: name,
      contact_phone: phone ?? '',
    },
  };

  if (email && email !== user.email) {
    updatePayload.email = email;
  }

  const { error } = await supabase.auth.updateUser(updatePayload);

  if (error) {
    return { error: error.message };
  }

  // Also sync full_name to profiles table if row exists
  await supabase
    .from('profiles')
    .update({ full_name: name })
    .eq('id', user.id);

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateRegionalSettings(settings: {
  currency: string;
  locale: string;
  country: string;
  timezone: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const cookieStore = await cookies();
  cookieStore.set('NEXT_CURRENCY', settings.currency, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  cookieStore.set('NEXT_LOCALE', settings.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      preferred_currency: settings.currency,
      preferred_locale: settings.locale,
      country: settings.country,
      timezone: settings.timezone,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateBillingDetails(billing: {
  companyName: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  billingCountry: string;
  taxId: string;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      billing_details: billing,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateHostingPreferences(prefs: {
  defaultDelivery: 'email' | 'print' | 'both';
  complexityDefault: 'easy' | 'medium' | 'hard';
  spiceDefault: 'clean' | 'mild' | 'spicy' | 'filthy';
  largePrintPdf: boolean;
  dyslexiaFont: boolean;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      hosting_preferences: prefs,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateNotificationSettings(notifs: {
  mysteryUpdates: boolean;
  guestRsvpAlerts: boolean;
  eventReminders: boolean;
  referralRewards: boolean;
  marketingOffers: boolean;
  hostingTips: boolean;
}) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      notification_settings: notifs,
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updatePassword(currentPassword: string, newPassword: string) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  // Re-authenticate with current password first
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email!,
    password: currentPassword,
  });

  if (signInError) {
    return { error: 'Current password is incorrect.' };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function signOutOtherSessions() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function deleteAccount() {
  const supabase = await createClient(undefined, { allowCookieClear: true });
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  // Delete user data first (guests, etc.) - RLS policies will scope this to the user
  await supabase.from('guests').delete().eq('user_id', user.id);

  // Sign out first so the session is cleared
  await supabase.auth.signOut();

  return { success: true, redirectTo: '/' };
}
