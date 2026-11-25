import { cookies, headers } from 'next/headers'
import CheckoutClient, { CastMemberPreview } from '@/components/checkout/CheckoutClient'
import CurrencySwitcher from '@/components/marketing/CurrencySwitcher'
import { resolveCurrency, getTierForPlayerCount } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'
import { getMysteryById, getPublishedMysteryByIdOrSlug } from '@/services/mysteries'
import { getRelationshipsByMysteryId } from '@/services/relationships'
import { ensureIsolatedCustomerMysteryInstance } from '@/lib/live-session-store'
import { createClient } from '@/utils/supabase/server'
import { getCharacterRoleTitle } from '@/utils/hydration'

export const unstable_instant = false;

export default async function CheckoutPage(props: {
  params: Promise<{ locale: Locale; id: string }>
  searchParams: Promise<{ slug?: string; guests?: string; promo?: string }>
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

  // If the customer is signed in, resolve their isolated customer mystery instance
  // so their custom cast lineup and isolated mystery ID are used on checkout
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user && mystery.created_by !== user.id) {
      const templateId = String(mystery.template_mystery_id || mystery.id)
      const rels = await getRelationshipsByMysteryId(templateId)
      const isolated = ensureIsolatedCustomerMysteryInstance(mystery, rels || [], user.id)
      mystery = isolated.mystery
    }
  } catch {
    // Non-fatal if unauthenticated
  }

  const rawCharacters: any[] = mystery.characters || []
  const activeCharacters = rawCharacters.filter(
    (c: any) => (c.profile_data as any)?.is_active_in_session !== false
  )

  const castMembers: CastMemberPreview[] = activeCharacters.map((c: any) => {
    const roleTitle = getCharacterRoleTitle(c)
    const profile = (c.profile_data || {}) as any
    const assignedGuestName = profile.guest_id
      ? String(profile.guest_name || profile.name || '').trim()
      : ''
    const guestName =
      assignedGuestName && assignedGuestName.toLowerCase() !== roleTitle.toLowerCase()
        ? assignedGuestName
        : roleTitle
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

  const tier = getTierForPlayerCount(guests)
  const cookieCurrency = cookieStore.get('NEXT_CURRENCY')?.value
  const countryCode = headerStore.get('x-vercel-ip-country')
  const currency = resolveCurrency(countryCode, cookieCurrency, locale)
  const slug = resolvedSearch?.slug || mysteryId

  // Auto-resolve any promo/referral code from URL query (?promo=), cookie, or referral wallet
  let initialPromoCode =
    resolvedSearch?.promo?.trim().toUpperCase() ||
    cookieStore.get('BPM_PROMO_CODE')?.value ||
    ''
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

  let initialPaymentIntent:
    | {
        clientSecret: string | null
        orderId?: string
        mode: 'stripe' | 'test_simulation'
        discountAmount?: number
        discountLabel?: string | null
        promoError?: string | null
      }
    | undefined = undefined

  try {
    const { createPaymentIntentAction } = await import('@/app/actions/stripe')
    const piRes = await createPaymentIntentAction({
      tier,
      locale,
      currency,
      mysteryId: mystery.id,
      slug,
      mysteryTitle: mystery.title,
      guests,
      promoCode: initialPromoCode || undefined,
      skipTierLookup: true,
    })
    initialPaymentIntent = {
      clientSecret: piRes.clientSecret || null,
      orderId: piRes.orderId,
      mode: piRes.mode === 'stripe' && piRes.clientSecret ? 'stripe' : 'test_simulation',
      discountAmount: piRes.discountAmount || 0,
      discountLabel: piRes.discountLabel || null,
      promoError: piRes.promoError || null,
    }
  } catch {
    // Non-fatal; CheckoutClient will fall back gracefully
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
        initialPaymentIntent={initialPaymentIntent}
      />
    </div>
  )
}
