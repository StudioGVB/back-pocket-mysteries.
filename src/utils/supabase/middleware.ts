import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { i18n } from '@/lib/i18n-config'
import { isUserAdmin } from '@/utils/admin-auth'
import {
  buildSafeCookieOptions,
  getEffectiveAuthCookies,
  readPersistedUserFromCookies,
  recordRefreshedAuthCookies,
  serverProcessLock,
} from './session-lock'

export async function updateSession(request: NextRequest) {
  const initialCookies = request.cookies.getAll()
  const effectiveInitialCookies = getEffectiveAuthCookies(initialCookies)

  // If a concurrent request just rotated the refresh token, apply the new cookies to request.cookies
  // so downstream Server Components in this request see the fresh session immediately.
  let syncedFromCache = false
  for (const c of effectiveInitialCookies) {
    if (request.cookies.get(c.name)?.value !== c.value) {
      request.cookies.set(c.name, c.value)
      syncedFromCache = true
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
  })

  // Default to permanent (30-day) session unless explicitly opted out ('false')
  const isPermanent = request.cookies.get('sb-keep-logged-in')?.value !== 'false'

  if (syncedFromCache) {
    for (const c of effectiveInitialCookies) {
      if (c.name.startsWith('sb-') && c.name.includes('-auth-token')) {
        supabaseResponse.cookies.set(
          c.name,
          c.value,
          buildSafeCookieOptions(c.value, undefined, isPermanent)
        )
      }
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return getEffectiveAuthCookies(request.cookies.getAll())
        },
        setAll(cookiesToSet) {
          const isWipingAllCookies =
            cookiesToSet.length > 0 &&
            cookiesToSet.every(({ value, options }) => !value || options?.maxAge === 0)

          // Never let middleware wipe the user's browser session cookies on transient/concurrent errors
          if (isWipingAllCookies) {
            return
          }

          recordRefreshedAuthCookies(initialCookies, cookiesToSet)

          cookiesToSet.forEach(({ name, value, options }) => {
            if (!value || options?.maxAge === 0) {
              request.cookies.delete(name)
            } else {
              request.cookies.set(name, value)
            }
          })

          supabaseResponse = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            const cookieOptions = buildSafeCookieOptions(value, options, isPermanent)
            supabaseResponse.cookies.set(name, value, cookieOptions)
          })
        },
      },
    }
  )

  // getSession() automatically refreshes expired access tokens via __loadSession()
  // while avoiding unnecessary remote /auth/v1/user round-trips on every request.
  const {
    data: { session },
  } = await supabase.auth.getSession()
  let user = session?.user ?? null

  const localE2eSecret = process.env.STRIPE_WEBHOOK_SECRET
  const isVerifiedLocalE2eAdmin =
    process.env.NODE_ENV === 'development' &&
    Boolean(localE2eSecret && localE2eSecret.length > 16) &&
    request.cookies.get('bpm_local_e2e_secret')?.value === localE2eSecret

  if (isVerifiedLocalE2eAdmin) {
    user = {
      id: '4903bd39-e54f-42e4-b679-2af5d128bb8f',
      email: 'hello@studiogvb.com',
      email_confirmed_at: '2026-01-01T00:00:00Z',
      user_metadata: {
        full_name: 'Gabriella Blyth',
        preferred_currency: 'GBP',
      },
    } as any
  }

  // Fallback to persisted 30-day auth cookie if "Keep me logged in" is enabled
  if (!user && isPermanent) {
    user = readPersistedUserFromCookies(request.cookies.getAll())
  }

  const pathname = request.nextUrl.pathname
  const locale = i18n.locales.find(loc => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`)
  const pathWithoutLocale = locale ? pathname.replace(`/${locale}`, '') || '/' : pathname

  const isAuthPage = ['/login', '/signup', '/auth'].some(p => pathWithoutLocale.startsWith(p))
  const isCastPage = /^\/mysteries\/[^/]+\/cast(\/|$)/.test(pathWithoutLocale)
  const isProtectedPage =
    ['/builder', '/account', '/admin'].some(p => pathWithoutLocale.startsWith(p)) || isCastPage
  const isAdminOnlyPage = ['/admin', '/builder'].some(p => pathWithoutLocale.startsWith(p))

  if (!user && !isAuthPage && isProtectedPage) {
    const url = request.nextUrl.clone()
    url.pathname = locale ? `/${locale}/login` : '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Strictly block non-admin or forged-cookie users from /admin and /builder
  if (user && isAdminOnlyPage && !isVerifiedLocalE2eAdmin) {
    const {
      data: { user: verifiedUser },
    } = await supabase.auth.getUser()
    if (!verifiedUser) {
      const url = request.nextUrl.clone()
      url.pathname = locale ? `/${locale}/login` : '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    const isAdmin = await isUserAdmin(supabase, verifiedUser)
    if (!isAdmin) {
      const url = request.nextUrl.clone()
      url.pathname = locale ? `/${locale}/account` : '/en/account'
      const redirectResponse = NextResponse.redirect(url)
      supabaseResponse.cookies.getAll().forEach(c => {
        redirectResponse.cookies.set(c.name, c.value)
      })
      return redirectResponse
    }
  }

  return supabaseResponse
}
