'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers, cookies } from 'next/headers'

// Helper to extract the current locale from the request headers
async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const match = referer.match(/\/([a-z]{2})\//)
  return match ? match[1] : 'en'
}

export async function signInAction(formData: FormData) {
  const isPermanent = formData.get('remember') === 'true' || formData.get('remember') === 'on'
  
  const cookieStore = await cookies()
  cookieStore.set('sb-keep-logged-in', isPermanent ? 'true' : 'false', {
    path: '/',
    maxAge: isPermanent ? 60 * 60 * 24 * 30 : undefined,
  })

  const supabase = await createClient(isPermanent)
  const locale = await getLocaleFromHeaders()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return redirect(`/${locale}/login?error=` + encodeURIComponent(error.message))
  }

  // Once logged in, check the user's role in the user_roles table
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authData.user.id)
    .single()

  revalidatePath('/', 'layout')

  const role = (userRole?.role as string || '').toLowerCase();
  const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role);
  const isAdminByEmail = authData.user.email?.toLowerCase() === 'hello@studiogvb.com';

  const isAdmin = isAdminByRole || isAdminByEmail;

  // Conditional Redirect based on role
  if (isAdmin) {
    redirect(`/${locale}/admin`)
  } else {
    // Append debug info to the customer portal URL to diagnose the role mismatch
    const debugParams = new URLSearchParams({
      role: role || 'no_role_detected',
      email: authData.user.email || 'no_email'
    }).toString();
    
    redirect(`/${locale}/account/orders?${debugParams}`)
  }
}
