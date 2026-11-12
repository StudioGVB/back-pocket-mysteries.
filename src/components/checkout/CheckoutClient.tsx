'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import {
  createPaymentIntentAction,
  createCheckoutSessionAction,
  confirmMysteryOrderAction,
} from '@/app/actions/stripe'
import { formatCurrency, getRegionalPrice, detectBrowserCurrency, PriceTierKey } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
const stripePromise =
  publishableKey && !publishableKey.includes('YOUR_') ? loadStripe(publishableKey) : null

export interface CastMemberPreview {
  characterId: string
  roleTitle: string
  guestName: string
  isVictim: boolean
}

function StripeElementsForm({
  mysteryId,
  slug,
  locale,
  orderId,
  tier,
  currency,
  totalCost,
  formattedTotal,
}: {
  mysteryId: string
  slug: string
  locale: Locale
  orderId?: string
  tier: PriceTierKey
  currency: string
  totalCost: number
  formattedTotal: string
}) {
  const router = useRouter()
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return

    setIsLoading(true)
    setErrorMessage(undefined)

    const returnUrl = `${window.location.origin}/${locale}/mysteries/${slug}/cast?checkout=success&orderId=${orderId || ''}`

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: returnUrl,
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
        orderId,
        paymentIntentId: result.paymentIntent.id,
        tier,
        amount: totalCost,
        currency,
      })
      router.push(
        `/${locale}/mysteries/${slug}/cast?checkout=success&payment_intent=${encodeURIComponent(
          result.paymentIntent.id
        )}`
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
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
}) {
  const router = useRouter()
  const targetSlug = slug || mysteryId

  const [selectedPlan, setSelectedPlan] = useState<'single' | 'subscribe'>('single')
  const [activeCurrency, setActiveCurrency] = useState(initialCurrency || 'USD')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | undefined>(undefined)
  const [checkoutMode, setCheckoutMode] = useState<'stripe' | 'test_simulation'>('stripe')
  const [isLoadingSecret, setIsLoadingSecret] = useState(true)
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false)
  const [isRedirectingHosted, setIsRedirectingHosted] = useState(false)
  const [paymentMethodTab, setPaymentMethodTab] = useState<'card' | 'apple_google'>('card')

  // Promo code & discount state
  const [promoInput, setPromoInput] = useState(initialPromoCode || '')
  const [appliedPromoCode, setAppliedPromoCode] = useState<string | undefined>(
    initialPromoCode ? initialPromoCode.trim().toUpperCase() : undefined
  )
  const [discountAmount, setDiscountAmount] = useState(0)
  const [discountLabel, setDiscountLabel] = useState<string | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)

  // Auto-detect native currency from cookie or browser timezone/locale
  useEffect(() => {
    setActiveCurrency(detectBrowserCurrency(locale))
  }, [locale])

  const activeTier: PriceTierKey = selectedPlan === 'subscribe' ? 'subscribe' : initialTier
  const singlePackPrice = getRegionalPrice(initialTier, activeCurrency)
  const subscribePrice = getRegionalPrice('subscribe', activeCurrency)
  const subtotalCost = selectedPlan === 'subscribe' ? subscribePrice : singlePackPrice
  const totalCost = Math.max(0, subtotalCost - discountAmount)
  const formattedSubtotal = formatCurrency(subtotalCost, activeCurrency, locale)
  const formattedTotal = formatCurrency(totalCost, activeCurrency, locale)

  useEffect(() => {
    let active = true
    setIsLoadingSecret(true)

    createPaymentIntentAction({
      tier: activeTier,
      locale,
      currency: activeCurrency,
      mysteryId,
      slug: targetSlug,
      mysteryTitle,
      guests,
      promoCode: appliedPromoCode,
    })
      .then((res) => {
        if (!active) return
        setOrderId(res.orderId)
        setDiscountAmount(res.discountAmount || 0)
        setDiscountLabel(res.discountLabel || null)
        setPromoError(res.promoError || null)

        if (res.mode === 'stripe' && res.clientSecret) {
          setClientSecret(res.clientSecret)
          setCheckoutMode('stripe')
        } else {
          setClientSecret(null)
          setCheckoutMode('test_simulation')
        }
        setIsLoadingSecret(false)
      })
      .catch((err) => {
        if (!active) return
        console.error(err)
        setCheckoutMode('test_simulation')
        setIsLoadingSecret(false)
      })

    return () => {
      active = false
    }
  }, [activeTier, locale, activeCurrency, mysteryId, targetSlug, mysteryTitle, guests, appliedPromoCode])

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault()
    setPromoError(null)
    setAppliedPromoCode(promoInput.trim() || undefined)
  }

  const handleClearPromo = () => {
    setPromoInput('')
    setPromoError(null)
    setAppliedPromoCode(undefined)
  }

  const handleTestSimulationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
      router.push(`/${locale}/mysteries/${targetSlug}/cast?checkout=success`)
    } else {
      setIsSimulatingPayment(false)
      setPromoError(res.error || 'Payment verification failed.')
    }
  }

  const handleHostedStripeCheckout = async () => {
    setIsRedirectingHosted(true)
    const res = await createCheckoutSessionAction({
      tier: activeTier,
      locale,
      currency: activeCurrency,
      mysteryId,
      slug: targetSlug,
      mysteryTitle,
      guests,
      promoCode: appliedPromoCode,
    })
    if (res.url) {
      window.location.href = res.url
    } else {
      setIsRedirectingHosted(false)
    }
  }

  const tierLabel =
    initialTier === 'basic'
      ? 'Basic Package (4–6 Players)'
      : initialTier === 'grand'
      ? 'Grand Package (4–16 Players)'
      : 'Premium Package (4–10 Players)'

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 sm:px-6 lg:px-8">
      {/* Top Back Navigation & Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          href={`/${locale}/mysteries/${targetSlug}/cast`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors"
        >
          ← Back to Cast Lineup
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
            1. Cast Locked ({guests} Guests) ✓
          </span>
          <span className="text-slate-300">→</span>
          <span className="px-3 py-1 rounded-full bg-brand-pink text-white">
            2. Pay &amp; Start Generation
          </span>
          <span className="text-slate-300">→</span>
          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-400">
            3. Ready in 20 Mins in My Mysteries
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* LEFT COLUMN: Plan Choice & Stripe Payment */}
        <div className="lg:col-span-7 space-y-8 order-2 lg:order-1">
          {/* 1. Choose Purchase Option (Single Pack vs Unlimited Monthly) */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                Step 1 • Select Your Package
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Flat Price - All {guests} Cast Guests Included
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Single Mystery Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan('single')}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'single'
                    ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-slate-900 text-white">
                      Single Event
                    </span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatCurrency(singlePackPrice, activeCurrency, locale)}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">{mysteryTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium leading-snug">
                    Lifetime access to this mystery, {guests} personalized guest roles, 6-digit Kahoot lobby &amp; printable kit.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-emerald-600 uppercase tracking-wider">
                  <span>✓ Full AI Personalization Included</span>
                  <span>One-Time</span>
                </div>
              </button>

              {/* Unlimited Monthly Pass Option */}
              <button
                type="button"
                onClick={() => setSelectedPlan('subscribe')}
                className={`p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlan === 'subscribe'
                    ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-pink text-white">
                      Unlimited Pass
                    </span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-slate-900">
                        {formatCurrency(subscribePrice, activeCurrency, locale)}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">/mo</span>
                    </div>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mb-1">All Mysteries + 1 Monthly Gift Pass</h3>
                  <p className="text-xs text-slate-500 font-medium leading-snug">
                    Unlocks <strong>{mysteryTitle}</strong> tonight, unlimited access to every mystery in our catalog, plus <strong>1 Free Monthly Gift Pass</strong> to send a mystery to a friend every month.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black text-brand-pink uppercase tracking-wider">
                  <span>✓ Up to 16 Players + 1 Gift Pass/Mo</span>
                  <span>Cancel Anytime</span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Stripe Payment Box */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  Step 2 • Secure Payment
                </span>
                <h2 className="text-xl font-black text-slate-900">Complete Your Order</h2>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <span>🔒 Powered by</span>
                <span className="font-black text-slate-800 tracking-tight">Stripe</span>
              </div>
            </div>

            {isLoadingSecret ? (
              <div className="animate-pulse space-y-4 py-4">
                <div className="h-12 bg-slate-100 rounded-2xl w-full" />
                <div className="h-12 bg-slate-100 rounded-2xl w-full" />
                <div className="h-14 bg-slate-200 rounded-2xl w-full" />
              </div>
            ) : totalCost === 0 ? (
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
            ) : checkoutMode === 'stripe' && clientSecret && stripePromise ? (
              <div className="space-y-4">
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <StripeElementsForm
                    mysteryId={mysteryId}
                    slug={targetSlug}
                    locale={locale}
                    orderId={orderId}
                    tier={activeTier}
                    currency={activeCurrency}
                    totalCost={totalCost}
                    formattedTotal={formattedTotal}
                  />
                </Elements>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={isRedirectingHosted}
                    onClick={handleHostedStripeCheckout}
                    className="text-xs font-bold text-slate-400 hover:text-brand-pink underline transition-colors cursor-pointer"
                  >
                    {isRedirectingHosted
                      ? 'Redirecting to Stripe Checkout...'
                      : 'Prefer Stripe Hosted Checkout page? Click here ↗'}
                  </button>
                </div>
              </div>
            ) : (
              /* Seamless Stripe-styled Checkout Form when running in local/sandbox test mode before live keys are added */
              <form onSubmit={handleTestSimulationSubmit} className="space-y-5">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="text-base mt-0.5">⚡</span>
                  <div className="text-xs text-amber-900 leading-relaxed">
                    <span className="font-black uppercase tracking-wider block mb-0.5">
                      Stripe Sandbox / Instant Test Mode Active
                    </span>
                    You can test the complete purchase &amp; lobby unlock flow right now with one click below.
                  </div>
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('card')}
                    className={`p-3.5 rounded-xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'card'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>💳</span> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodTab('apple_google')}
                    className={`p-3.5 rounded-xl border-2 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      paymentMethodTab === 'apple_google'
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>🍎</span> Apple Pay / Google Pay
                  </button>
                </div>

                {paymentMethodTab === 'card' ? (
                  <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                        Card Number (Stripe Test Card)
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
                    <p className="text-sm font-black text-slate-900">Express One-Tap Wallet</p>
                    <p className="text-xs text-slate-500 font-medium">
                      Click below to simulate instant Apple Pay / Google Pay confirmation.
                    </p>
                  </div>
                )}

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
                    ? 'Confirming Payment & Starting 20-Min Generation...'
                    : `Pay ${formattedTotal} & Generate My Mystery →`}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Order Summary, Promo Code & Cast Preview */}
        <div className="lg:col-span-5 order-1 lg:order-2">
          <div className="sticky top-8 bg-[#070b13] text-white p-8 rounded-[2.25rem] border border-white/10 shadow-2xl space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  {mysteryTheme || 'Murder Mystery Kit'}
                </span>
                <h2 className="text-2xl font-black tracking-tight text-white">{mysteryTitle}</h2>
                <p className="text-xs text-slate-400 font-bold mt-1">{tierLabel}</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-white shrink-0">
                {guests} Guests
              </span>
            </div>

            {/* Cast Roster Preview */}
            {castMembers.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tonight&apos;s Cast Lineup ({castMembers.length})
                  </span>
                  <Link
                    href={`/${locale}/mysteries/${targetSlug}/cast`}
                    className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline"
                  >
                    Edit Cast ✎
                  </Link>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {castMembers.map((cm) => (
                    <div
                      key={cm.characterId}
                      className="px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-black text-white truncate">{cm.guestName}</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          cm.isVictim
                            ? 'bg-brand-pink text-white'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {cm.isVictim ? `💀 ${cm.roleTitle}` : cm.roleTitle}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promo Code Input */}
            <div className="border-t border-white/10 pt-5 space-y-2">
              <form onSubmit={handleApplyPromo} className="flex items-center gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Promo code"
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
                    className="px-4 py-2.5 rounded-xl bg-brand-pink hover:opacity-90 text-xs font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                  >
                    Apply
                  </button>
                )}
              </form>
              {promoError && (
                <p className="text-[11px] font-bold text-red-400">{promoError}</p>
              )}
              {discountAmount > 0 && discountLabel && (
                <p className="text-[11px] font-bold text-emerald-400">
                  ✓ {discountLabel} applied (-{formatCurrency(discountAmount, activeCurrency, locale)})
                </p>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between items-center font-bold text-slate-200">
                <span>
                  {selectedPlan === 'subscribe'
                    ? 'Unlimited Monthly Pass'
                    : `${initialTier.charAt(0).toUpperCase() + initialTier.slice(1)} Mystery Pack`}
                </span>
                <span>{formattedSubtotal}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>Personalized Cast ({guests} Players)</span>
                <span>Included ($0)</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>6-Digit Kahoot Game PIN &amp; Live Lobby</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-emerald-400">
                <span>Guest Links, Audio Clues &amp; Printables</span>
                <span>Included</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-xs font-black text-brand-pink pt-2 border-t border-white/10">
                  <span>🏷️ {discountLabel || 'Discount'}</span>
                  <span>-{formatCurrency(discountAmount, activeCurrency, locale)}</span>
                </div>
              )}
            </div>

            {/* Total Due */}
            <div className="border-t border-white/15 pt-5 flex justify-between items-end">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {selectedPlan === 'subscribe' ? 'Total Due Today (Monthly)' : 'Flat One-Time Total'}
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
