import { NextResponse, type NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const { searchParams, origin } = new URL(request.url);
  const rawCode = (
    searchParams.get('c') ||
    searchParams.get('code') ||
    searchParams.get('promo') ||
    ''
  )
    .trim()
    .toUpperCase();

  if (rawCode) {
    const dest = new URL(
      `/${locale}/login?promo=${encodeURIComponent(rawCode)}&step=signup`,
      origin
    );
    const response = NextResponse.redirect(dest);
    response.cookies.set('BPM_PROMO_CODE', rawCode, {
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
      sameSite: 'lax',
    });
    return response;
  }

  return NextResponse.redirect(new URL(`/${locale}/login`, origin));
}
