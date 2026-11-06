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
    return VALID_ADMIN_ROLES.includes(role);
  } catch {
    return false;
  }
}

/**
 * Server-side guard for Server Actions and API Routes.
 * Throws an error if the current session is not an authenticated Admin.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Authentication required.');
  }

  const isAdmin = await isUserAdmin(supabase, user);
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const isAdmin = await isUserAdmin(supabase, user);
  if (!isAdmin) {
    redirect(`/${locale}/account`);
  }

  return { supabase, user };
}
