import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { isUserAdmin } from '@/utils/admin-auth'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as any
  const next = searchParams.get('next') ?? ''
  const locale = searchParams.get('locale') || 'en'

  const supabase = await createClient(true)

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=${encodeURIComponent(error.message)}`
      )
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    })
    if (error) {
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=${encodeURIComponent(error.message)}`
      )
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}/login`)
  }

  // If this OAuth login created a brand-new account within the last 90 seconds, notify Admin
  try {
    const createdMs = user.created_at ? new Date(user.created_at).getTime() : 0
    if (createdMs > 0 && Date.now() - createdMs < 90_000) {
      const { sendAdminNewAccountNotificationEmail } = await import('@/lib/branded-email-template')
      await sendAdminNewAccountNotificationEmail({
        userId: user.id,
        email: user.email || '',
        fullName:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split('@')[0] ||
          null,
        source: `OAuth Sign-Up (${user.app_metadata?.provider || 'Google'})`,
      })
    }
  } catch (err) {
    console.error('Failed to send OAuth new account notification:', err)
  }

  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(`${origin}${next}`)
  }

  const isAdmin = await isUserAdmin(supabase, user)
  if (isAdmin) {
    return NextResponse.redirect(`${origin}/${locale}/admin`)
  }

  return NextResponse.redirect(`${origin}/${locale}/account/orders`)
}
