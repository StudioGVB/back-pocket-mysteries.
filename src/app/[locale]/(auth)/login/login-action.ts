'use server'

import { createClient } from '@/utils/supabase/server'
import { isUserAdmin } from '@/utils/admin-auth'
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
    sameSite: 'lax',
    maxAge: isPermanent ? 60 * 60 * 24 * 30 : undefined,
  })

  // Clean up any leftover empty-value sb-*-auth-token* chunk cookies from previous sessions
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith('sb-') && c.name.includes('-auth-token') && !c.value) {
      cookieStore.set(c.name, '', { path: '/', sameSite: 'lax', maxAge: 0 })
    }
  }

  const supabase = await createClient(isPermanent)
  const locale = await getLocaleFromHeaders()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const nextPath = (formData.get('next') as string | null)?.trim() || ''

  const { data: authData, error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    const params = new URLSearchParams({
      error: error.message,
      email: data.email || '',
      step: 'login',
    })
    if (nextPath) params.set('next', nextPath)
    return redirect(`/${locale}/login?${params.toString()}`)
  }

  const isAdmin = await isUserAdmin(supabase, authData.user)

  // Block login for accounts in the 60-day soft-delete quarantine (unless reinstated by Admin)
  if (!isAdmin && authData.user) {
    const { data: profileRow } = await (supabase as any)
      .from('profiles')
      .select('avatar_config')
      .eq('id', authData.user.id)
      .maybeSingle()

    const cfg = (profileRow?.avatar_config || {}) as any
    const meta = (authData.user.user_metadata || {}) as any
    const isSoftDeleted = Boolean(cfg.soft_deleted || cfg.is_deleted || meta.account_deleted)

    if (isSoftDeleted) {
      await supabase.auth.signOut()
      const purgeIso = cfg.purge_after || meta.purge_after
      const purgeLabel = purgeIso
        ? new Date(purgeIso).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : '60 days after deletion'
      const params = new URLSearchParams({
        error: `This account was deactivated and is in our 60-day recovery hold until ${purgeLabel}. To reinstate your account and purchased mysteries, please email hello@backpocketgames.com.`,
        email: data.email || '',
        step: 'login',
      })
      return redirect(`/${locale}/login?${params.toString()}`)
    }
  }

  revalidatePath('/', 'layout')

  const isNextAdminRoute = /^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(nextPath)
  if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
    if (isNextAdminRoute && !isAdmin) {
      redirect(`/${locale}/account`)
    }
    redirect(nextPath)
  }

  if (isAdmin) {
    redirect(`/${locale}/admin`)
  } else {
    redirect(`/${locale}/account/orders`)
  }
}
