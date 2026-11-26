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

  const now = new Date();
  const nowIso = now.toISOString();
  const purgeDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const purgeAfterIso = purgeDate.toISOString();
  const formattedPurgeDate = purgeDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  try {
    // 2. Capture full 60-day recovery snapshot (profile, orders, guests, mysteries + child records)
    const [
      { data: profileRow },
      { data: ordersRows },
      { data: guestsRows },
      { data: guestConnectionsRows },
      { data: userMysteries },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      (supabase as any).from('orders').select('*').eq('user_id', user.id),
      supabase.from('guests').select('*').eq('user_id', user.id),
      (supabase as any).from('guest_connections').select('*').eq('user_id', user.id),
      (supabase.from('mysteries') as any).select('*').eq('author_id', user.id),
    ]);

    const customerMysteries = (userMysteries || []).filter(
      (m: any) => m?.id && !PROTECTED_BASE_IDS.includes(String(m.id))
    );
    const mysteryIds: string[] = customerMysteries.map((m: any) => String(m.id));

    let charactersRows: any[] = [];
    let cluesRows: any[] = [];
    let relationshipsRows: any[] = [];
    let motivesRows: any[] = [];
    let beatsRows: any[] = [];
    let subplotsRows: any[] = [];

    if (mysteryIds.length > 0) {
      const [cRes, clRes, rRes, mRes, bRes, sRes] = await Promise.all([
        supabase.from('characters').select('*').in('mystery_id', mysteryIds),
        supabase.from('clues').select('*').in('mystery_id', mysteryIds),
        supabase.from('relationships').select('*').in('mystery_id', mysteryIds),
        supabase.from('motives').select('*').in('mystery_id', mysteryIds),
        supabase.from('plot_beats').select('*').in('mystery_id', mysteryIds),
        (supabase as any).from('subplots').select('*').in('mystery_id', mysteryIds),
      ]);
      charactersRows = cRes.data || [];
      cluesRows = clRes.data || [];
      relationshipsRows = rRes.data || [];
      motivesRows = mRes.data || [];
      beatsRows = bRes.data || [];
      subplotsRows = sRes.data || [];
    }

    const snapshotPayload = {
      version: 1,
      userId: user.id,
      email: user.email || (profileRow as any)?.email || null,
      fullName:
        user.user_metadata?.full_name || (profileRow as any)?.full_name || null,
      deletedAt: nowIso,
      purgeAfter: purgeAfterIso,
      retentionDays: 60,
      userMetadata: user.user_metadata || {},
      profile: profileRow || null,
      orders: ordersRows || [],
      guests: guestsRows || [],
      guestConnections: guestConnectionsRows || [],
      mysteries: customerMysteries,
      characters: charactersRows,
      clues: cluesRows,
      relationships: relationshipsRows,
      motives: motivesRows,
      plotBeats: beatsRows,
      subplots: subplotsRows,
    };

    // Upload 60-day recovery snapshot to Supabase Storage
    await supabase.storage
      .from('character-images')
      .upload(
        `system/deleted-accounts/${user.id}.json`,
        Buffer.from(JSON.stringify(snapshotPayload, null, 2), 'utf8'),
        { contentType: 'application/json', upsert: true }
      )
      .catch(() => {});

    // 3. Stamp 60-day soft-delete quarantine status onto profiles.avatar_config & user_metadata
    //    (Leaves mysteries, characters, clues, guests, and orders intact for 60 days so 1-click reinstatement is instant!)
    const existingConfig =
      profileRow &&
      typeof (profileRow as any).avatar_config === 'object' &&
      (profileRow as any).avatar_config !== null
        ? (profileRow as any).avatar_config
        : {};

    await Promise.allSettled([
      (supabase as any)
        .from('profiles')
        .update({
          avatar_config: {
            ...existingConfig,
            soft_deleted: true,
            is_deleted: false,
            deleted_at: nowIso,
            purge_after: purgeAfterIso,
            deletion_source: 'customer_self_delete',
          },
        })
        .eq('id', user.id),
      supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          account_deleted: true,
          deleted_at: nowIso,
          purge_after: purgeAfterIso,
        },
      }),
    ]);

    // 4. Sync 60-day hold into Customer CRM store
    try {
      const adminUsersMod: any = await import('@/app/actions/admin-users');
      if (typeof adminUsersMod.recordSystemCustomerSoftDelete === 'function') {
        await adminUsersMod.recordSystemCustomerSoftDelete({
          targetUserId: user.id,
          deletedAt: nowIso,
          purgeAfter: purgeAfterIso,
          mysteriesCount: customerMysteries.length,
          guestsCount: (guestsRows || []).length,
        });
      }
    } catch {
      // non-fatal
    }

    // 5. Send Customer Confirmation + Admin Alert Emails via Resend
    if (process.env.RESEND_API_KEY && user.email) {
      const { Resend } = await import('resend');
      const { buildBrandedEmailShell } = await import('@/lib/branded-email-template');
      const resend = new Resend(process.env.RESEND_API_KEY);
      const displayName =
        user.user_metadata?.full_name ||
        (profileRow as any)?.full_name ||
        user.email.split('@')[0];

      const customerEmailPayload = {
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: [user.email],
        replyTo: 'Hello@backpocketgames.com',
        subject: `Account Deactivated • 60-Day Recovery Window Until ${formattedPurgeDate}`,
        html: buildBrandedEmailShell({
          preheader: `Your Back Pocket Mysteries account has been deactivated and scheduled for permanent erasure on ${formattedPurgeDate}.`,
          kicker: 'ACCOUNT DEACTIVATED • 60-DAY HOLD',
          headline: `Your Account Is Scheduled for Deletion`,
          bodyHtml: `
            <p style="margin:0 0 16px 0;color:#1e191c;font-size:15px;line-height:1.6;">
              Hi <strong>${displayName}</strong>,
            </p>
            <p style="margin:0 0 16px 0;color:#4b5563;font-size:15px;line-height:1.6;">
              As requested, your Back Pocket Mysteries account, purchased mystery packs (${customerMysteries.length}), and saved guest roster (${(guestsRows || []).length}) have been deactivated and locked.
            </p>
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:18px 22px;border-radius:12px;margin-bottom:18px;">
              <p style="margin:0 0 6px 0;color:#fe04c6;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                60-DAY SAFETY RETENTION WINDOW
              </p>
              <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;line-height:1.6;">
                To protect against accidental deletions before a party, we securely quarantine your encrypted account backup until <strong>${formattedPurgeDate}</strong> (60 days). If you change your mind before that date, simply reply to this email or contact <a href="mailto:hello@backpocketgames.com" style="color:#fe04c6;text-decoration:none;font-weight:800;">hello@backpocketgames.com</a> and our team can reinstate your account and mysteries in one click.
              </p>
            </div>
            <p style="margin:0;color:#71717a;font-size:13px;line-height:1.6;">
              If we don't hear from you by <strong>${formattedPurgeDate}</strong>, all account data, mysteries, and guest profiles will be permanently purged.
            </p>
          `,
          ctaText: 'Need to Reinstate? Email Support →',
          ctaUrl: 'mailto:hello@backpocketgames.com?subject=Please%20Reinstate%20My%20Back%20Pocket%20Mysteries%20Account',
        }),
      };

      const adminEmailPayload = {
        from: 'Back Pocket Mysteries Alerts <alerts@backpocketgames.com>',
        to: ['hello@backpocketgames.com', 'hello@studiogvb.com'],
        replyTo: user.email,
        subject: `⏳ Account Scheduled for 60-Day Deletion: ${displayName} (${user.email})`,
        html: buildBrandedEmailShell({
          preheader: `${displayName} (${user.email}) deactivated their account (60-day recovery window until ${formattedPurgeDate}).`,
          kicker: 'CUSTOMER SELF-DELETE • 60-DAY RECOVERY HOLD',
          headline: `Account Deactivated (60-Day Hold)`,
          bodyHtml: `
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Customer</span><br/>
                  <span style="color:#1e191c;font-size:15px;font-weight:800;">${displayName} (${user.email})</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-bottom:1px solid #f4f4f5;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">Quarantined Assets</span><br/>
                  <span style="color:#1e191c;font-size:14px;font-weight:700;">${customerMysteries.length} Mystery Pack(s) • ${(guestsRows || []).length} Saved Guest(s) • ${(ordersRows || []).length} Order(s)</span>
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;">
                  <span style="color:#71717a;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;">60-Day Purge Date</span><br/>
                  <span style="color:#fe04c6;font-size:14px;font-weight:800;">${formattedPurgeDate}</span>
                </td>
              </tr>
            </table>
            <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #fe04c6;padding:16px 20px;border-radius:12px;">
              <p style="margin:0;color:#ffffff;font-size:13px;line-height:1.6;">
                ✓ Full snapshot archived for 60 days. If this customer contacts you to restore their account, open their profile in Admin and click <strong>"♻️ Reinstate Account &amp; Mysteries"</strong>.
              </p>
            </div>
          `,
          ctaText: 'Open Customer in Admin (1-Click Reinstate) →',
          ctaUrl: `https://backpocketmysteries.com/en/admin/users/${user.id}`,
        }),
      };

      await resend.batch.send([customerEmailPayload, adminEmailPayload]).catch(() => {});
    }
  } catch (err) {
    console.error('Error soft-deleting user account for 60-day retention:', err);
  }

  // 6. Sign out and clear all auth cookies
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith('sb-')) {
      cookieStore.set(c.name, '', { path: '/', sameSite: 'lax', maxAge: 0 });
    }
  }

  return { success: true, redirectTo: '/' };
}

