'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { headers, cookies } from 'next/headers'
import { Resend } from 'resend'
import { getDiscountsAction } from '@/app/actions/discounts'
import { getDiscountComputedStatus } from '@/utils/discounts'

const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key_to_prevent_crash')

// Helper to extract the current locale from the request headers
async function getLocaleFromHeaders(): Promise<string> {
  const headersList = await headers()
  const referer = headersList.get('referer') || ''
  const match = referer.match(/\/([a-z]{2})\//)
  return match ? match[1] : 'en'
}

async function getOriginFromHeaders(): Promise<string> {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host') || 'localhost:3033'
  const proto = headersList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function checkEmailAccountAction(email: string): Promise<{
  exists: boolean
  firstName?: string
}> {
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { exists: false }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .ilike('email', normalized)
      .maybeSingle()

    if (!error && data) {
      const fullName = (data as any).full_name || ''
      const firstName = fullName.split(' ')[0] || undefined
      return { exists: true, firstName }
    }
  } catch (err) {
    console.error('Error checking email account:', err)
  }

  return { exists: false }
}

export async function sendMagicLinkAction(
  email: string,
  nextPath?: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = (email || '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = await createClient(true)
    const locale = await getLocaleFromHeaders()
    const origin = await getOriginFromHeaders()

    const callbackUrl = new URL(`/${locale}/auth/callback`, origin)
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      callbackUrl.searchParams.set('next', nextPath)
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: callbackUrl.toString(),
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not send magic link. Please try again.',
    }
  }
}

export async function verifyMagicLinkOtpAction(
  email: string,
  token: string,
  nextPath?: string
): Promise<{ success: boolean; redirectTo?: string; error?: string }> {
  const normalized = (email || '').trim().toLowerCase()
  const cleanToken = (token || '').trim()

  if (!normalized || !cleanToken) {
    return { success: false, error: 'Please enter the login code from your email.' }
  }

  try {
    const supabase = await createClient(true)
    const locale = await getLocaleFromHeaders()

    let { data: authData, error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleanToken,
      type: 'email',
    })

    if (error) {
      const retry = await supabase.auth.verifyOtp({
        email: normalized,
        token: cleanToken,
        type: 'magiclink',
      })
      authData = retry.data
      error = retry.error
    }

    if (error || !authData?.user) {
      return {
        success: false,
        error: error?.message || 'Invalid or expired code. Please try again.',
      }
    }

    const { isUserAdmin } = await import('@/utils/admin-auth')
    const isAdmin = await isUserAdmin(supabase, authData.user)

    revalidatePath('/', 'layout')

    const isNextAdminRoute = /^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(nextPath || '')
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      if (isNextAdminRoute && !isAdmin) {
        return { success: true, redirectTo: `/${locale}/account` }
      }
      return { success: true, redirectTo: nextPath }
    }

    return {
      success: true,
      redirectTo: isAdmin ? `/${locale}/admin` : `/${locale}/account/orders`,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not verify code. Please try again.',
    }
  }
}

export async function verifySignupPromoCodeAction(code: string): Promise<{
  valid: boolean
  code?: string
  label?: string
  error?: string
}> {
  const cleanCode = (code || '').trim().toUpperCase()
  if (!cleanCode) {
    return { valid: false, error: 'Please enter a promo or referral code.' }
  }

  try {
    const { validatePromoCodeAction } = await import('@/app/actions/discounts')
    const validation = await validatePromoCodeAction({ code: cleanCode })

    if (validation.valid && validation.discount) {
      const d = validation.discount
      const valueDesc =
        d.discount_type === 'percentage'
          ? `${d.discount_value}% Off`
          : `£${d.discount_value} Off`
      return {
        valid: true,
        code: cleanCode,
        label: `Code ${cleanCode} applied (${valueDesc})`,
      }
    }

    return {
      valid: false,
      error: validation.error || 'Invalid or expired promo/referral code.',
    }
  } catch {
    return {
      valid: false,
      error: 'Could not verify promo code.',
    }
  }
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const locale = await getLocaleFromHeaders()
  const cookieStore = await cookies()

  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string
  const firstName = (formData.get('first_name') as string || '').trim()
  const lastName = (formData.get('last_name') as string || '').trim()
  const fullNameInput = (formData.get('full_name') as string || '').trim()
  const fullName = fullNameInput || `${firstName} ${lastName}`.trim()
  const country = (formData.get('country') as string || '').trim()
  const currency = (formData.get('currency') as string || 'GBP').trim()
  const timezone = (formData.get('timezone') as string || 'Europe/London').trim()
  const howFoundUs = (formData.get('how_found_us') as string || '').trim()
  const promoCode = (formData.get('promo_code') as string || '').trim().toUpperCase()
  const marketingOptIn = formData.get('marketing_opt_in') !== 'false'
  const nextPath = (formData.get('next') as string | null)?.trim() || ''

  if (currency) {
    cookieStore.set('NEXT_CURRENCY', currency, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    })
  }

  if (promoCode) {
    cookieStore.set('BPM_PROMO_CODE', promoCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
      sameSite: 'lax',
    })
  }

  const data = {
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        country,
        preferred_currency: currency,
        timezone,
        how_found_us: howFoundUs,
        promo_code: promoCode || null,
        notification_settings: {
          mysteryUpdates: true,
          guestRsvpAlerts: true,
          eventReminders: true,
          referralRewards: true,
          marketingOffers: marketingOptIn,
          hostingTips: marketingOptIn,
        },
      },
    },
  }

  const { data: signUpData, error } = await supabase.auth.signUp(data)

  if (error) {
    const isSignupDisabled =
      (error as any)?.code === 'signup_disabled' ||
      String(error.message || '').toLowerCase().includes('signups not allowed')

    if (isSignupDisabled) {
      try {
        const { submitEmailLead } = await import('@/app/actions/marketing')
        const vipRes = await submitEmailLead(
          email,
          fullName || firstName || undefined,
          'signup_page_prelaunch'
        )
        const rankText = vipRes.vipRank ? ` (VIP Spot #${vipRes.vipRank}/50)` : ''
        const params = new URLSearchParams({
          message: `🚀 We are so close to launch! Host accounts open on launch day — we've locked in your VIP Launch Spot${rankText} and emailed your confirmation!`,
          email,
          step: 'signup',
        })
        if (nextPath) params.set('next', nextPath)
        return redirect(`/${locale}/login?` + params.toString())
      } catch {
        // fallback below
      }
    }

    const params = new URLSearchParams({
      error: error.message,
      email,
      step: 'signup',
    })
    if (nextPath) params.set('next', nextPath)
    return redirect(`/${locale}/login?` + params.toString())
  }

  // Register the new user's own "Give 20%, Get 20%" referral code in the store immediately
  if (signUpData?.user?.id) {
    try {
      const { getOrRegisterUserReferralWalletAction } = await import('@/app/actions/referrals')
      await getOrRegisterUserReferralWalletAction()
    } catch {
      // ignore
    }
  }

  // Send Fully Branded Admin Notification Email whenever a new member creates an account
  try {
    const { sendAdminNewAccountNotificationEmail } = await import('@/lib/branded-email-template')
    await sendAdminNewAccountNotificationEmail({
      userId: signUpData?.user?.id || null,
      email,
      fullName,
      country,
      currency,
      timezone,
      howFoundUs,
      promoCode,
      source: 'Website Account Onboarding (/en/login)',
    })
  } catch (err) {
    console.error('Failed to send new account email notification:', err)
  }

  revalidatePath('/', 'layout')

  // If Supabase auto-signed them in (e.g. email confirmation disabled or immediate session), redirect straight in
  let hasSession = Boolean(signUpData?.session)
  if (!hasSession) {
    try {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (signInData?.session) {
        hasSession = true
      }
    } catch {
      // ignore if email confirmation is required
    }
  }

  if (hasSession) {
    const isNextAdminRoute = /^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(nextPath)
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      if (isNextAdminRoute) {
        const { isUserAdmin } = await import('@/utils/admin-auth')
        const isAdmin = await isUserAdmin(supabase, signUpData?.user || null)
        if (!isAdmin) {
          redirect(`/${locale}/account`)
        }
      }
      redirect(nextPath)
    }
    redirect(`/${locale}/account/orders?welcome=1`)
  }

  const params = new URLSearchParams({
    message: 'Welcome to Back Pocket Mysteries! Check your email to confirm your account, then sign in below.',
    email,
    step: 'login',
  })
  if (nextPath) params.set('next', nextPath)
  redirect(`/${locale}/login?` + params.toString())
}

export async function signOut() {
  const supabase = await createClient(undefined, { allowCookieClear: true })
  const locale = await getLocaleFromHeaders()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  for (const c of cookieStore.getAll()) {
    if (c.name.startsWith('sb-')) {
      cookieStore.set(c.name, '', { path: '/', sameSite: 'lax', maxAge: 0 })
    }
  }
  revalidatePath('/', 'layout')
  redirect(`/${locale}/login`)
}
