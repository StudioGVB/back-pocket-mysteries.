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

    revalidatePath('/', 'layout')

    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      return { success: true, redirectTo: nextPath }
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    const role = ((userRole?.role as string) || '').toLowerCase()
    const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role)
    const isAdminByEmail = authData.user.email?.toLowerCase() === 'hello@studiogvb.com'
    const isAdmin = isAdminByRole || isAdminByEmail

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
        label: `${cleanCode} applied (${valueDesc} - ${d.name})`,
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

  // Send Admin Notification Email
  try {
    if (process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
        to: 'Hello@backpocketgames.com',
        subject: `New User Signed Up: ${fullName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px; border-top: 4px solid #F02882;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #1a1a1a; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Back Pocket Mysteries</h2>
              <p style="color: #F02882; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">New Account Created</p>
            </div>
            <div style="background-color: #ffffff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Name</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${fullName}</span></p>
              <p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Email</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${email}</span></p>
              ${country ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Country / Currency / Timezone</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${country} (${currency} • ${timezone})</span></p>` : ''}
              ${howFoundUs ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">How they found us</strong><br/><span style="color: #1a1a1a; font-size: 16px; font-weight: bold;">${howFoundUs}</span></p>` : ''}
              ${promoCode ? `<p style="margin: 0 0 10px 0;"><strong style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">Promo / Referral Code</strong><br/><span style="color: #F02882; font-size: 16px; font-weight: bold;">${promoCode}</span></p>` : ''}
            </div>
          </div>
        `
      })
      console.log(`[EMAIL NOTIFICATION] Sent new account notification for ${email}`)
    }
  } catch (err) {
    console.error('Failed to send new account email notification:', err)
  }

  revalidatePath('/', 'layout')

  // If Supabase auto-signed them in (e.g. email confirmation disabled or immediate session), redirect straight in
  if (signUpData?.session) {
    if (nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')) {
      redirect(nextPath)
    }
    redirect(`/${locale}/account/orders?welcome=1`)
  }

  const params = new URLSearchParams({
    message: 'Welcome to Back Pocket Mysteries! Check your email to confirm your account, our new mysteries are coming soon, so check back shortly!',
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
