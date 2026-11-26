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
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user || userError) {
    return { error: 'Not authenticated.' };
  }

  // 1. Safety Lock: Prevent Founder / Admin accounts from self-deleting and wiping master Mystery Base Packs
  const { isUserAdmin } = await import('@/utils/admin-auth');
  const isAdmin = await isUserAdmin(supabase, user);
  if (isAdmin) {
    return {
      error:
        'Safety Lock: Founder & Admin accounts cannot be deleted from Account Settings because they own the master Mystery Base Packs.',
    };
  }

  const PROTECTED_BASE_IDS = [
    '69b65a91-1cc2-4267-94a4-59297428af28', // Love On The Rocks
    '61196e53-09c3-427f-8862-30151f2ca75b', // Christmas Nightmare
  ];

  try {
    // 2. Find all customer-owned mysteries (never touch canonical base packs)
    const { data: userMysteries } = await (supabase.from('mysteries') as any)
      .select('id')
      .eq('author_id', user.id);

    const mysteryIds: string[] = (userMysteries || [])
      .map((m: any) => String(m.id))
      .filter((id: string) => Boolean(id) && !PROTECTED_BASE_IDS.includes(id));

    if (mysteryIds.length > 0) {
      await Promise.allSettled([
        supabase.from('clues').delete().in('mystery_id', mysteryIds),
        supabase.from('relationships').delete().in('mystery_id', mysteryIds),
        supabase.from('motives').delete().in('mystery_id', mysteryIds),
        supabase.from('plot_beats').delete().in('mystery_id', mysteryIds),
        (supabase as any).from('subplots').delete().in('mystery_id', mysteryIds),
      ]);
      await supabase.from('characters').delete().in('mystery_id', mysteryIds);
      await supabase.from('mysteries').delete().in('id', mysteryIds);
    }

    // 3. Delete saved guests, guest connections, orders, and profile row
    await Promise.allSettled([
      (supabase as any).from('guest_connections').delete().eq('user_id', user.id),
      supabase.from('guests').delete().eq('user_id', user.id),
      (supabase as any).from('orders').delete().eq('user_id', user.id),
      supabase.from('profiles').delete().eq('id', user.id),
    ]);

    // 4. If service role key is configured, also delete the auth.users record
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient: createServiceClient } = await import('@supabase/supabase-js');
      const adminSb = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      await adminSb.auth.admin.deleteUser(user.id).catch(() => {});
    }
  } catch (err) {
    console.error('Error cleaning up user data during account deletion:', err);
  }

  // 5. Sign out and clear all auth cookies
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith('sb-')) {
      cookieStore.set(c.name, '', { path: '/', sameSite: 'lax', maxAge: 0 });
    }
  }

  return { success: true, redirectTo: '/' };
}

