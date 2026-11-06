import { cookies, headers } from 'next/headers'
import CheckoutClient, { CastMemberPreview } from '@/components/checkout/CheckoutClient'
import CurrencySwitcher from '@/components/marketing/CurrencySwitcher'
import { resolveCurrency, getTierForPlayerCount } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'
import { getMysteryById, getPublishedMysteryByIdOrSlug } from '@/services/mysteries'

export const unstable_instant = false;

export default async function CheckoutPage(props: {
  params: Promise<{ locale: Locale; id: string }>
  searchParams: Promise<{ slug?: string; guests?: string }>
}) {
  const { locale, id: mysteryId } = await props.params
  const resolvedSearch = await props.searchParams
  const cookieStore = await cookies()
  const headerStore = await headers()

  // Resolve mystery from DB or cached snapshot (works with UUID or slug)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mysteryId)
  let mystery: any = isUuid
    ? await getMysteryById(mysteryId)
    : await getPublishedMysteryByIdOrSlug(mysteryId)

  if (!mystery) {
    mystery = await getPublishedMysteryByIdOrSlug(mysteryId)
  }

  if (!mystery) {
    return (
      <div className="p-16 text-center font-bold text-red-500">
        Mystery not found. Please return to the mysteries catalog and try again.
      </div>
    )
  }

  const rawCharacters: any[] = mystery.characters || []
  const activeCharacters = rawCharacters.filter(
    (c: any) => (c.profile_data as any)?.is_active_in_session !== false
  )

  const castMembers: CastMemberPreview[] = activeCharacters.map((c: any) => {
    const parts = (c.name || '').split('|')
    const roleTitle = (parts[1] || parts[0] || 'Suspect').trim()
    const profile = (c.profile_data || {}) as any
    const guestName = profile.guest_name || profile.name || parts[0] || 'Guest'
    return {
      characterId: c.id,
      roleTitle,
      guestName,
      isVictim: Boolean(c.is_victim || c.plot_role === 'victim'),
    }
  })

  const parsedGuests = resolvedSearch?.guests ? parseInt(resolvedSearch.guests, 10) : NaN
  const guests =
    !isNaN(parsedGuests) && parsedGuests > 0
      ? parsedGuests
      : activeCharacters.length || rawCharacters.length || 6

  const tier = getTierForPlayerCount(mystery.max_players || rawCharacters.length || guests)
  const cookieCurrency = cookieStore.get('NEXT_CURRENCY')?.value
  const countryCode = headerStore.get('x-vercel-ip-country')
  const currency = resolveCurrency(countryCode, cookieCurrency, locale)
  const slug = resolvedSearch?.slug || mysteryId

  // Auto-resolve any promo/referral code saved during sign-up or unlocked via "Give 20%, Get 20%"
  let initialPromoCode = cookieStore.get('BPM_PROMO_CODE')?.value || ''
  try {
    const { getOrRegisterUserReferralWalletAction } = await import('@/app/actions/referrals')
    const wallet = await getOrRegisterUserReferralWalletAction()
    const unusedReward = wallet.rewardVouchers.find((v) => !v.used)
    if (!initialPromoCode && unusedReward) {
      initialPromoCode = unusedReward.code
    } else if (!initialPromoCode && wallet.appliedSignupPromo) {
      initialPromoCode = wallet.appliedSignupPromo
    }
  } catch {
    // ignore
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Minimal Header for Checkout */}
      <header className="bg-white border-b border-slate-100 py-5 px-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="font-black text-xl tracking-tighter uppercase text-slate-900">
            Back Pocket <span className="text-brand-pink italic">Mysteries</span>
          </div>
          <div className="flex items-center gap-4">
            <CurrencySwitcher />
            <span className="hidden sm:inline text-xs font-black uppercase tracking-widest text-slate-400">
              🔒 256-Bit SSL Encrypted Checkout
            </span>
          </div>
        </div>
      </header>

      <CheckoutClient
        mysteryId={mystery.id}
        slug={slug}
        initialTier={tier}
        guests={guests}
        castMembers={castMembers}
        locale={locale}
        currency={currency}
        mysteryTitle={mystery.title}
        mysteryTheme={mystery.theme}
        initialPromoCode={initialPromoCode}
      />
    </div>
  )
}
