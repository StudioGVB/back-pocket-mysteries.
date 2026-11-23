'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadStripe, PaymentRequest } from '@stripe/stripe-js'
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import {
  createPaymentIntentAction,
  confirmMysteryOrderAction,
} from '@/app/actions/stripe'
import { formatCurrency, getRegionalPrice, PriceTierKey } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const isTestPublishableKey = !publishableKey || publishableKey.startsWith('pk_test_')
const stripePromise =
  publishableKey && !publishableKey.includes('YOUR_') ? loadStripe(publishableKey) : null

export interface CastMemberPreview {
  characterId: string
  roleTitle: string
  guestName: string
  isVictim: boolean
}

const STRIPE_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '15px',
      color: '#0f172a',
      fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontWeight: '700',
      '::placeholder': {
        color: '#94a3b8',
        fontWeight: '500',
      },
    },
    invalid: {
      color: '#dc2626',
    },
  },
}

function InstantCheckoutForm({
  mysteryId,
  mysteryTitle,
  slug,
  locale,
  orderId,
  promoCode,
  tier,
  currency,
  totalCost,
  formattedTotal,
  paymentMethodTab,
  setPaymentMethodTab,
  ensureClientSecret,
  onSimulateSuccess,
}: {
  mysteryId: string
  mysteryTitle: string
  slug: string
  locale: Locale
  orderId?: string
  promoCode?: string
  tier: PriceTierKey
  currency: string
  totalCost: number
  formattedTotal: string
  paymentMethodTab: 'card' | 'apple_pay'
  setPaymentMethodTab: (tab: 'card' | 'apple_pay') => void
  ensureClientSecret: () => Promise<{ clientSecret: string | null; orderId?: string; mode: 'stripe' | 'test_simulation' }>
  onSimulateSuccess: () => Promise<void>
}) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null)
  const [canUseNativeApplePay, setCanUseNativeApplePay] = useState(false)

  // Initialize Stripe PaymentRequest for native Apple Pay / Wallet sheet
  useEffect(() => {
    if (!stripe || totalCost <= 0) return

    const countryMap: Record<string, string> = {
      GBP: 'GB',
      AUD: 'AU',
      CAD: 'CA',
      EUR: 'IE',
      NZD: 'NZ',
      USD: 'US',
    }
    const pr = stripe.paymentRequest({
      country: countryMap[currency.toUpperCase()] || 'US',
      currency: currency.toLowerCase(),
      total: {
        label: `${mysteryTitle} Package`,
        amount: Math.max(50, Math.round(totalCost * 100)),
      },
      requestPayerName: true,
      requestPayerEmail: true,
    })

    let mounted = true
    pr.canMakePayment().then((result) => {
      if (!mounted) return
      if (result) {
        setPaymentRequest(pr)
        setCanUseNativeApplePay(true)
      } else {
        setPaymentRequest(null)
        setCanUseNativeApplePay(false)
      }
    })

    pr.on('paymentmethod', async (ev) => {
      setIsLoading(true)
      setErrorMessage(undefined)
      try {
        const { clientSecret: secret, orderId: resolvedOrderId } = await ensureClientSecret()
        if (!secret) {
          ev.complete('fail')
          setErrorMessage('Could not initialize payment session.')
          setIsLoading(false)
          return
        }

        const { paymentIntent, error: confirmError } = await stripe.confirmCardPayment(
          secret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        )

        if (confirmError) {
          ev.complete('fail')
          setErrorMessage(confirmError.message)
          setIsLoading(false)
          return
        }

        ev.complete('success')

        if (paymentIntent && paymentIntent.status === 'requires_action') {
          const { error: actionError } = await stripe.confirmCardPayment(secret)
          if (actionError) {
            setErrorMessage(actionError.message)
            setIsLoading(false)
            return
          }
        }

        if (paymentIntent) {
          await confirmMysteryOrderAction({
            mysteryId,
            slug,
            orderId: resolvedOrderId || orderId,
            paymentIntentId: paymentIntent.id,
            promoCode,
            tier,
            amount: totalCost,
            currency,
          })
          router.push(
            `/${locale}/account/orders?checkout=success&payment_intent=${encodeURIComponent(
              paymentIntent.id
            )}`
          )
        }
      } catch (err: any) {
        ev.complete('fail')
        setErrorMessage(err?.message || 'Apple Pay payment failed.')
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [stripe, currency, totalCost, mysteryTitle, mysteryId, slug, locale, orderId, promoCode, tier, ensureClientSecret, router])

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    const cardNumberEl = elements.getElement(CardNumberElement)
    if (!cardNumberEl) return

    setIsLoading(true)
    setErrorMessage(undefined)

    try {
      const { clientSecret: secret, orderId: resolvedOrderId, mode } = await ensureClientSecret()
      if (mode === 'test_simulation' || !secret) {
        await onSimulateSuccess()
        return
      }

      const result = await stripe.confirmCardPayment(secret, {
        payment_method: {
          card: cardNumberEl,
        },
      })

      if (result.error) {
        setErrorMessage(result.error.message)
        setIsLoading(false)
        return
      }

      if (result.paymentIntent) {
        await confirmMysteryOrderAction({
          mysteryId,
          slug,
          orderId: resolvedOrderId || orderId,
          paymentIntentId: result.paymentIntent.id,
          promoCode,
          tier,
          amount: totalCost,
          currency,
        })
        router.push(
          `/${locale}/account/orders?checkout=success&payment_intent=${encodeURIComponent(
            result.paymentIntent.id
          )}`
        )
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Payment could not be completed.')
      setIsLoading(false)
    }
  }

  const handleApplePayClick = async () => {
    setErrorMessage(undefined)
    if (canUseNativeApplePay && paymentRequest) {
      paymentRequest.show()
      return
    }

    // In local/test mode when native Apple Pay domain/Safari wallet isn't active in the current browser,
    // allow testing the full Apple Pay unlock flow seamlessly.
    if (isTestPublishableKey) {
      setIsLoading(true)
      try {
        await onSimulateSuccess()
      } catch (err: any) {
        setErrorMessage(err?.message || 'Apple Pay test confirmation failed.')
        setIsLoading(false)
      }
      return
    }

    setErrorMessage(
      'Apple Pay requires Safari on an iPhone, iPad, or Mac with an active card in Apple Wallet. Please open this page in Safari or select Card above.'
    )
  }

  return (
    <div className="space-y-5">
      {/* Payment Method Selector: Card vs Apple Pay */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            setErrorMessage(undefined)
            setPaymentMethodTab('card')
          }}
          className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-between gap-2 transition-all cursor-pointer ${
            paymentMethodTab === 'card'
              ? 'border-brand-pink bg-brand-pink/5 text-slate-900 shadow-sm'
              : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span>💳</span>
            <span>Card</span>
          </span>
          <span className="flex items-center gap-1 text-[9px] font-black tracking-tight text-slate-500">
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">VISA</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">MC</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">AMEX</span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setErrorMessage(undefined)
            setPaymentMethodTab('apple_pay')
          }}
          className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-between gap-2 transition-all cursor-pointer ${
            paymentMethodTab === 'apple_pay'
              ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
              : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="text-base leading-none"></span>
            <span>Apple Pay</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
              paymentMethodTab === 'apple_pay'
                ? 'bg-white/15 text-white'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            1-Tap
          </span>
        </button>
      </div>

      {paymentMethodTab === 'card' ? (
        <form onSubmit={handleCardSubmit} className="space-y-4">
          <div className="space-y-3.5 p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                Card Number
              </label>
              <div className="w-full bg-white border border-slate-200 focus-within:border-brand-pink focus-within:ring-2 focus-within:ring-brand-pink/15 rounded-xl px-4 py-3.5 transition-all">
                <CardNumberElement options={{ ...STRIPE_ELEMENT_OPTIONS, showIcon: true }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Expiry Date
                </label>
                <div className="w-full bg-white border border-slate-200 focus-within:border-brand-pink focus-within:ring-2 focus-within:ring-brand-pink/15 rounded-xl px-4 py-3.5 transition-all">
                  <CardExpiryElement options={STRIPE_ELEMENT_OPTIONS} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Security Code (CVC)
                </label>
                <div className="w-full bg-white border border-slate-200 focus-within:border-brand-pink focus-within:ring-2 focus-within:ring-brand-pink/15 rounded-xl px-4 py-3.5 transition-all">
                  <CardCvcElement options={STRIPE_ELEMENT_OPTIONS} />
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !stripe || !elements}
            className="w-full py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
              boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
            }}
          >
            {isLoading ? 'Confirming Payment & Unlocking Lobby...' : `Pay ${formattedTotal} & Unlock Mystery →`}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md">
              
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black text-slate-900">
                Express Checkout with Apple Pay
              </p>
              <p className="text-xs text-slate-500 font-medium max-w-md mx-auto">
                Confirm your {formattedTotal} one-time package instantly with Touch ID or Face ID and start generating your mystery right away.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              {errorMessage}
            </div>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={handleApplePayClick}
            className="w-full py-4 px-8 rounded-2xl bg-black hover:bg-slate-900 text-white font-black text-base tracking-tight transition-all shadow-xl active:scale-[0.99] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="text-sm uppercase tracking-widest">
                Confirming Apple Pay &amp; Unlocking Lobby...
              </span>
            ) : (
              <>
                <span className="text-xl leading-none"></span>
                <span>Pay {formattedTotal} with Apple Pay</span>
              </>
            )}
          </button>
        </div>
      )}

      <div className="pt-2 flex items-center justify-center sm:justify-start text-[11px] text-slate-400 font-bold border-t border-slate-100">
        <span>
          🔒 Instant unlock • Swap or edit your cast anytime before party night
        </span>
      </div>
    </div>
  )
}

export default function CheckoutClient({
  mysteryId,
  slug,
  initialTier,
  guests,
  castMembers = [],
  locale,
  currency: initialCurrency,
  mysteryTitle,
  mysteryTheme,
  initialPromoCode,
  initialPaymentIntent,
}: {
  mysteryId: string
  slug?: string
  initialTier: 'basic' | 'premium' | 'grand'
  guests: number
  castMembers?: CastMemberPreview[]
  locale: Locale
  currency: string
  mysteryTitle: string
  mysteryTheme?: string | null
  initialPromoCode?: string
  initialPaymentIntent?: {
    clientSecret: string | null
    orderId?: string
    mode: 'stripe' | 'test_simulation'
    discountAmount?: number
    discountLabel?: string | null
    promoError?: string | null
  }
}) {
  const router = useRouter()
  const targetSlug = slug || mysteryId

  const [activeCurrency, setActiveCurrency] = useState(initialCurrency || 'USD')
  const [clientSecret, setClientSecret] = useState<string | null>(
    initialPaymentIntent?.clientSecret ?? null
  )
  const [orderId, setOrderId] = useState<string | undefined>(
    initialPaymentIntent?.orderId
  )
  const [checkoutMode, setCheckoutMode] = useState<'stripe' | 'test_simulation'>(
    initialPaymentIntent?.mode ?? (stripePromise ? 'stripe' : 'test_simulation')
  )
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false)
  const [paymentMethodTab, setPaymentMethodTab] = useState<'card' | 'apple_pay'>('card')

  // Promo code & discount state (collapsible unless a promo code is pre-applied)
  const [showPromoBox, setShowPromoBox] = useState(Boolean(initialPromoCode))
  const [promoInput, setPromoInput] = useState(initialPromoCode || '')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | undefined>(
    initialPromoCode ? initialPromoCode.trim().toUpperCase() : undefined
  )
  const [discountAmount, setDiscountAmount] = useState(
    initialPaymentIntent?.discountAmount ?? 0
  )
  const [discountLabel, setDiscountLabel] = useState<string | null>(
    initialPaymentIntent?.discountLabel ?? null
  )
  const [promoError, setPromoError] = useState<string | null>(
    initialPaymentIntent?.promoError ?? null
  )

  const [isApplyingPromo, setIsApplyingPromo] = useState(false)

  const activeTier: PriceTierKey = initialTier
  const subtotalCost = getRegionalPrice(initialTier, activeCurrency)
  const totalCost = Math.max(0, subtotalCost - discountAmount)
  const formattedSubtotal = formatCurrency(subtotalCost, activeCurrency, locale)
  const formattedTotal = formatCurrency(totalCost, activeCurrency, locale)

  const pendingIntentPromiseRef = useRef<Promise<{
    clientSecret: string | null
    orderId?: string
    mode: 'stripe' | 'test_simulation'
  }> | null>(null)

  const refreshPaymentIntent = async (opts?: {
    currencyOverride?: string
    promoOverride?: string | undefined
  }) => {
    const nextCurrency = opts?.currencyOverride ?? activeCurrency
    const nextPromo =
      opts && 'promoOverride' in opts ? opts.promoOverride : appliedPromoCode

    const promise = createPaymentIntentAction({
      tier: activeTier,
      locale,
      currency: nextCurrency,
      mysteryId,
      slug: targetSlug,
      mysteryTitle,
      guests,
      promoCode: nextPromo,
      skipTierLookup: true,
    })
      .then((res) => {
        const resultMode: 'stripe' | 'test_simulation' =
          res.mode === 'stripe' && res.clientSecret ? 'stripe' : 'test_simulation'
        setOrderId(res.orderId)
        setDiscountAmount(res.discountAmount || 0)
        setDiscountLabel(res.discountLabel || null)
        setPromoError(res.promoError || null)
        setClientSecret(res.clientSecret || null)
        setCheckoutMode(resultMode)
        return {
          clientSecret: res.clientSecret || null,
          orderId: res.orderId,
          mode: resultMode,
        }
      })
      .catch((err) => {
        console.error(err)
        setCheckoutMode('test_simulation')
        return {
          clientSecret: null,
          orderId: undefined,
          mode: 'test_simulation' as const,
        }
      })

    pendingIntentPromiseRef.current = promise
    return await promise
  }

  // Only fetch on mount if initialPaymentIntent was not pre-loaded on the server
  useEffect(() => {
    if (!initialPaymentIntent) {
      refreshPaymentIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync activeCurrency if the server prop changes (e.g. via CurrencySwitcher in header)
  useEffect(() => {
    if (initialCurrency && initialCurrency !== activeCurrency) {
      setActiveCurrency(initialCurrency)
      setClientSecret(null)
      refreshPaymentIntent({ currencyOverride: initialCurrency })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCurrency])

  const ensureClientSecret = async (): Promise<{
    clientSecret: string | null
    orderId?: string
    mode: 'stripe' | 'test_simulation'
  }> => {
    if (clientSecret) {
      return { clientSecret, orderId, mode: checkoutMode }
    }
    if (pendingIntentPromiseRef.current) {
      return await pendingIntentPromiseRef.current
    }
    return await refreshPaymentIntent()
  }

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = promoInput.trim().toUpperCase()
    if (!cleanCode) {
      setPromoError('Please enter a promo or gift code.')
      return
    }
    setPromoError(null)
    setClientSecret(null)
    setAppliedPromoCode(cleanCode)
    setIsApplyingPromo(true)
    await refreshPaymentIntent({ promoOverride: cleanCode })
    setIsApplyingPromo(false)
  }

  const handleClearPromo = async () => {
    setPromoInput('')
    setPromoError(null)
    setClientSecret(null)
    setAppliedPromoCode(undefined)
    setIsApplyingPromo(true)
    await refreshPaymentIntent({ promoOverride: undefined })
    setIsApplyingPromo(false)
  }

  const executeSimulationUnlock = async () => {
    setIsSimulatingPayment(true)
    const res = await confirmMysteryOrderAction({
      mysteryId,
      slug: targetSlug,
      orderId,
      promoCode: appliedPromoCode,
      tier: activeTier,
      amount: totalCost,
      currency: activeCurrency,
    })
    if (res.verified) {
      router.push(`/${locale}/account/orders?checkout=success`)
    } else {
      setIsSimulatingPayment(false)
      setPromoError(res.error || 'Payment verification failed.')
    }
  }

  const handleTestSimulationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await executeSimulationUnlock()
  }

  const tierLabel =
    initialTier === 'basic'
      ? 'Basic Package • 5–6 Suspects (1–6 Players)'
      : initialTier === 'grand'
      ? 'Grand Package • 5–16 Suspects (1–16 Players)'
      : 'Premium Package • 5–10 Suspects (1–10 Players)'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Back Navigation & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
        <Link
          href={`/${locale}/mysteries/${targetSlug}/cast`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors"
        >
          ← Back to Cast Lineup
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            1. {guests} Suspects Selected ✓
          </span>
          <span className="text-slate-300">→</span>
          <span className="px-3 py-1 rounded-full bg-brand-pink text-white">
            2. Unlock Package ({formattedTotal})
          </span>
          <span className="text-slate-300">→</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400">
            3. Ready in ~20 Mins in My Mysteries
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Compact Value Header + Instant Card & Apple Pay Checkout */}
        <div className="lg:col-span-7 space-y-6 order-2 lg:order-1">
          {/* Compact Flat-Price Value Banner */}
          <div className="bg-white p-5 sm:p-6 rounded-[1.75rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink">
                  One-Time Package
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  ✓ Guests Pay $0
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-black text-slate-900">
                {mysteryTitle} - All {guests} Suspect Roles Included
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Includes {guests}{' '}personalized suspect booklets, audio wiretaps &amp; text clues, 6-digit Kahoot live lobby, and both Party Mode &amp; Solo/Duo Case File play.
              </p>
            </div>
            <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
              <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Flat Group Total
              </span>
              <span className="text-3xl font-black tracking-tight text-slate-900">
                {formattedTotal}
              </span>
              <span className="block text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Lifetime Access
              </span>
            </div>
          </div>

          {/* Instant Payment Box (Card + Apple Pay + Always-Visible Promo Code) */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  Secure Instant Checkout
                </span>
                <h2 className="text-xl font-black text-slate-900">Complete Your Order</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>🔒 256-Bit Encrypted</span>
              </div>
            </div>

            {/* Always-Visible Promo / Gift Code Box inside Complete Your Order */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  🏷️ Promo or Gift Code
                </label>
                {discountAmount > 0 && (appliedPromoCode || discountLabel) && (
                  <span className="text-[11px] font-black text-emerald-600">
                    ✓ {appliedPromoCode ? `Code ${appliedPromoCode} applied` : discountLabel} (-{formatCurrency(discountAmount, activeCurrency, locale)})
                  </span>
                )}
              </div>
              <form onSubmit={handleApplyPromo} autoComplete="off" className="flex items-center gap-2">
                <input
                  type="text"
                  name="bpm_v_token"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo or gift code"
                  className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/15"
                />
                {appliedPromoCode ? (
                  <button
                    type="button"
                    onClick={handleClearPromo}
                    className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-black uppercase tracking-wider text-slate-700 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isApplyingPromo}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                  >
                    {isApplyingPromo ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </form>
              {promoError && (
                <p className="text-[11px] font-bold text-red-500">{promoError}</p>
              )}
            </div>

            {totalCost === 0 ? (
              /* 100% Discount Applied - Free Unlock */
              <form onSubmit={handleTestSimulationSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                  🎉 Your promotion reduced the total to {formattedTotal}! Click below to unlock your mystery and 6-digit Kahoot Game PIN immediately.
                </div>
                <button
                  type="submit"
                  disabled={isSimulatingPayment}
                  className="w-full py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  {isSimulatingPayment
                    ? 'Unlocking Your Mystery & Game PIN...'
                    : 'Unlock Mystery & Game PIN Now →'}
                </button>
              </form>
            ) : stripePromise && checkoutMode === 'stripe' ? (
              <Elements stripe={stripePromise}>
                <InstantCheckoutForm
                  mysteryId={mysteryId}
                  mysteryTitle={mysteryTitle}
                  slug={targetSlug}
                  locale={locale}
                  orderId={orderId}
                  promoCode={appliedPromoCode}
                  tier={activeTier}
                  currency={activeCurrency}
                  totalCost={totalCost}
                  formattedTotal={formattedTotal}
                  paymentMethodTab={paymentMethodTab}
                  setPaymentMethodTab={setPaymentMethodTab}
                  ensureClientSecret={ensureClientSecret}
                  onSimulateSuccess={executeSimulationUnlock}
                />
              </Elements>
            ) : (
              /* Fallback when running in local/sandbox test mode without Stripe publishable key */
              <form onSubmit={handleTestSimulationSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('card')}
                    className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'card'
                        ? 'border-brand-pink bg-brand-pink/5 text-slate-900'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>💳</span> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('apple_pay')}
                    className={`p-3.5 rounded-2xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'apple_pay'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span></span> Apple Pay
                  </button>
                </div>

                {paymentMethodTab === 'card' ? (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Card Number
                      </label>
                      <input
                        type="text"
                        defaultValue="4242 •••• •••• 4242"
                        readOnly
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Expiry
                        </label>
                        <input
                          type="text"
                          defaultValue="12 / 28"
                          readOnly
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          CVC
                        </label>
                        <input
                          type="text"
                          defaultValue="424"
                          readOnly
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono font-bold text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-2">
                    <p className="text-sm font-black text-slate-900">Express Checkout with Apple Pay</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Click below to confirm your order with Apple Pay.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSimulatingPayment}
                  className="w-full py-4 px-8 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                  style={
                    paymentMethodTab === 'apple_pay'
                      ? { background: '#000000' }
                      : {
                          background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                          boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                        }
                  }
                >
                  {isSimulatingPayment
                    ? 'Confirming Payment & Starting 20-Min Generation...'
                    : paymentMethodTab === 'apple_pay'
                    ? ` Pay ${formattedTotal} with Apple Pay`
                    : `Pay ${formattedTotal} & Unlock Mystery →`}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary, Always-Open Promo Code & Cast Preview */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="sticky top-8 bg-[#070b13] text-white p-7 sm:p-8 rounded-[2.25rem] border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  {mysteryTheme || 'Murder Mystery Kit'}
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">{mysteryTitle}</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">{tierLabel}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-white shrink-0">
                {guests} Suspects
              </span>
            </div>

            {/* Cast Roster Preview */}
            {castMembers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Active Suspect Lineup ({castMembers.length})
                  </span>
                  <Link
                    href={`/${locale}/mysteries/${targetSlug}/cast`}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline"
                  >
                    Edit Cast ✎
                  </Link>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {castMembers.map((cm) => {
                    const hasCustomName =
                      cm.guestName &&
                      cm.guestName.trim().toLowerCase() !== cm.roleTitle.trim().toLowerCase()
                    return (
                      <div
                        key={cm.characterId}
                        className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="font-black text-white truncate">
                          {hasCustomName ? cm.guestName : cm.roleTitle}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                            cm.isVictim
                              ? 'bg-brand-pink text-white'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {cm.isVictim
                            ? `💀 ${hasCustomName ? cm.roleTitle : 'The Victim'}`
                            : hasCustomName
                            ? cm.roleTitle
                            : 'Suspect Role'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Always-Visible Promo Code Input in Order Summary */}
            <div className="border-t border-white/10 pt-4 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Promo or Gift Code
              </label>
              <form onSubmit={handleApplyPromo} autoComplete="off" className="flex items-center gap-2">
                <input
                  type="text"
                  name="bpm_v_token_summary"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  spellCheck={false}
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Enter promo or gift code"
                  className="flex-1 bg-white/5 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-pink"
                />
                {appliedPromoCode ? (
                  <button
                    type="button"
                    onClick={handleClearPromo}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider text-slate-300 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isApplyingPromo}
                    className="px-4 py-2.5 rounded-xl bg-brand-pink hover:opacity-90 disabled:opacity-50 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                  >
                    {isApplyingPromo ? 'Applying...' : 'Apply'}
                  </button>
                )}
              </form>
              {promoError && (
                <p className="text-[11px] font-bold text-red-400">{promoError}</p>
              )}
              {discountAmount > 0 && (appliedPromoCode || discountLabel) && (
                <p className="text-[11px] font-bold text-emerald-400">
                  ✓ {appliedPromoCode ? `Code ${appliedPromoCode}` : discountLabel} applied (-{formatCurrency(discountAmount, activeCurrency, locale)})
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>
                  {initialTier.charAt(0).toUpperCase() + initialTier.slice(1)} Mystery Package
                </span>
                <span>{formattedSubtotal}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>Personalized Cast ({guests} Suspects)</span>
                <span>Included ($0)</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>6-Digit Kahoot Game PIN &amp; Live Lobby</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>Party Mode + Solo/Duo Case File Mode</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>Guest Links, Audio Clues &amp; Printables</span>
                <span>Included</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs font-black text-brand-pink pt-2 border-t border-white/10">
                  <span>🏷️ {appliedPromoCode ? `Promo Code (${appliedPromoCode})` : (discountLabel || 'Discount')}</span>
                  <span>-{formatCurrency(discountAmount, activeCurrency, locale)}</span>
                </div>
              )}
            </div>

            {/* Total Due */}
            <div className="border-t border-white/15 pt-5 flex justify-between items-end">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Flat One-Time Total
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  Ready in ~20 mins • We&apos;ll email you when ready
                </span>
              </div>
              <div className="text-right">
                {discountAmount > 0 && (
                  <span className="block text-sm font-bold text-slate-500 line-through">
                    {formattedSubtotal}
                  </span>
                )}
                <span className="text-4xl font-black tracking-tighter text-white">
                  {formattedTotal}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 font-medium leading-relaxed">
              ☕ <strong>How it works after payment:</strong> Your custom package takes ~20 minutes to generate. You can close your browser window, grab a coffee, and we&apos;ll email you as soon as it&apos;s ready in <strong>My Mysteries (Stories)</strong>!
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
