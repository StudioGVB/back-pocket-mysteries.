import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { i18n } from '@/lib/i18n-config'

const NOINDEX_PREFIXES = [
  '/login',
  '/signup',
  '/reset-password',
  '/auth',
  '/account',
  '/mysteries',
  '/admin',
  '/builder',
  '/play',
  '/create',
  '/checkout',
  '/invite',
  '/coming-soon',
]

function getLocale(request: NextRequest): string {
  // Only use locale from an explicit cookie set by the user via the language switcher.
  // Never auto-detect from accept-language - that causes redirect loops.
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value
  if (cookieLocale && i18n.locales.includes(cookieLocale as any)) {
    return cookieLocale
  }
  return i18n.defaultLocale
}

function stripLocalePrefix(pathname: string): string {
  for (const locale of i18n.locales) {
    if (pathname === `/${locale}`) return '/'
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1)
    }
  }
  return pathname
}

function isNoIndexPath(pathname: string): boolean {
  const cleanPath = stripLocalePrefix(pathname)
  return NOINDEX_PREFIXES.some(
    (prefix) => cleanPath === prefix || cleanPath.startsWith(`${prefix}/`)
  )
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next()
  }

  // Check if the pathname is missing a locale
  const pathnameIsMissingLocale = i18n.locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  )

  // Redirect if there is no locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request)
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`
    return NextResponse.redirect(redirectUrl)
  }

  // Proceed with Supabase session update
  const response = await updateSession(request)

  // Apply explicit X-Robots-Tag header: block login/portal/admin/builder routes, index public domain pages
  if (isNoIndexPath(pathname)) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive')
  } else {
    response.headers.set('X-Robots-Tag', 'index, follow')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Public assets like logos, hero images, and generated mystery audio
     */
    '/((?!api|mystery-audio|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|xml|txt|mp3|wav|ogg|m4a)$).*)',
  ],
}
