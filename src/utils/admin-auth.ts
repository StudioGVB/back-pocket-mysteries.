import { cache } from 'react';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const ADMIN_EMAIL_ALLOWLIST = ['hello@studiogvb.com'];
export const ADMIN_UID_ALLOWLIST = ['4903bd39-e54f-42e4-b679-2af5d128bb8f'];
export const VALID_ADMIN_ROLES = ['admin', 'superadmin', 'super_admin'];

/**
 * Checks whether a given Supabase user is an authorized Admin / Superadmin.
 * Checks both the owner email/UID allowlist and the `public.user_roles` table.
 */
export async function isUserAdmin(supabase: any, user: { id: string; email?: string | null } | null): Promise<boolean> {
  if (!user) return false;

  const email = (user.email || '').toLowerCase().trim();
  if (ADMIN_EMAIL_ALLOWLIST.includes(email) || ADMIN_UID_ALLOWLIST.includes(user.id)) {
    return true;
  }

  try {
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = ((roleData?.role as string) || '').toLowerCase().trim();
    if (VALID_ADMIN_ROLES.includes(role)) {
      return true;
    }
  } catch {
    // continue to invited email check
  }

  // Check if this user's email was invited as a Super Admin via platform_settings
  if (email) {
    try {
      const { data: settingsRow } = await supabase
        .from('platform_settings')
        .select('config_json')
        .eq('id', 'global')
        .maybeSingle();

      const invitedList = Array.isArray(settingsRow?.config_json?.invitedSuperAdmins)
        ? settingsRow.config_json.invitedSuperAdmins
        : [];

      const matchedInvite = invitedList.find(
        (inv: any) => String(inv?.email || '').toLowerCase().trim() === email
      );

      if (matchedInvite) {
        // Auto-provision their user_roles row in the background so future checks are instant
        try {
          await supabase
            .from('user_roles')
            .upsert(
              { user_id: user.id, role: 'superadmin' },
              { onConflict: 'user_id' }
            );
        } catch {}
        return true;
      }
    } catch {
      // platform_settings optional
    }
  }

  return false;
}

const getCachedAdminSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false };
  }

  const isAdmin = await isUserAdmin(supabase, user);
  return { supabase, user, isAdmin };
});

/**
 * Server-side guard for Server Actions and API Routes.
 * Throws an error if the current session is not an authenticated Admin.
 */
export async function requireAdmin() {
  const { supabase, user, isAdmin } = await getCachedAdminSession();

  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  if (!isAdmin) {
    throw new Error('Forbidden: Admin privileges required.');
  }

  return { supabase, user };
}

/**
 * Server Component / Layout guard.
 * Redirects unauthenticated users to `/login` and non-admin customers to `/account`.
 */
export async function requireAdminOrRedirect(locale: string = 'en') {
  const { supabase, user, isAdmin } = await getCachedAdminSession();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  if (!isAdmin) {
    redirect(`/${locale}/account`);
  }

  return { supabase, user };
}
