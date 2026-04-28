import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { redirect } from 'next/navigation'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import { getCurrencyForLocale } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'

export default async function CheckoutPage(props: {
  params: Promise<{ locale: Locale, id: string }>
}) {
  const { locale, id: mysteryId } = await props.params;

  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login?next=/${locale}/checkout/${mysteryId}`)
  }

  // Fetch the mystery
  const { data: mystery, error: mysteryError } = await supabase
    .from('mysteries')
    .select('title, complexity')
    .eq('id', mysteryId)
    .single()

  if (mysteryError || !mystery) {
    return <div className="p-12 text-center font-bold text-red-500">Mystery not found.</div>
  }

  // Count the characters to determine guests
  const { count, error: countError } = await supabase
    .from('characters')
    .select('id', { count: 'exact', head: true })
    .eq('mystery_id', mysteryId)

  const guests = count || 0

  // Map complexity to tier
  let tier: 'basic' | 'premium' | 'grand' = 'premium'
  if (mystery.complexity === 'easy') tier = 'basic'
  if (mystery.complexity === 'hard') tier = 'grand'

  const currency = getCurrencyForLocale(locale)

  return (
    <div className="min-h-screen bg-white">
      {/* Minimal Header for checkout */}
      <header className="border-b border-gray-100 py-6 px-8">
        <div className="max-w-7xl mx-auto flex items-center">
          <div className="font-black text-xl tracking-tighter uppercase text-brand-dark">
            Back Pocket <span className="text-brand-pink italic">Mysteries</span>
          </div>
        </div>
      </header>

      <CheckoutClient 
        mysteryId={mysteryId}
        initialTier={tier}
        guests={guests}
        locale={locale}
        currency={currency}
        mysteryTitle={mystery.title}
      />
    </div>
  )
}
