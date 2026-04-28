'use client'

import React, { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { createPaymentIntentAction } from '@/app/actions/stripe'
import { formatCurrency } from '@/utils/localization'
import { Locale } from '@/lib/i18n-config'

// Make sure to call loadStripe outside of a component’s render to avoid
// recreating the Stripe object on every render.
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

function CheckoutForm({ mysteryId, locale }: { mysteryId: string, locale: Locale }) {
  const stripe = useStripe()
  const elements = useElements()
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stripe || !elements) {
      return
    }

    setIsLoading(true)
    setErrorMessage(undefined)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/create/generating/${mysteryId}?checkout=success`,
      },
    })

    if (error) {
      setErrorMessage(error.message)
    }

    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {errorMessage && <div className="text-red-500 text-sm font-bold mt-2">{errorMessage}</div>}
      <button
        disabled={isLoading || !stripe || !elements}
        className="w-full bg-brand-pink text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-brand-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  )
}

export default function CheckoutClient({
  mysteryId,
  initialTier,
  guests,
  locale,
  currency,
  mysteryTitle
}: {
  mysteryId: string;
  initialTier: 'basic' | 'premium' | 'grand';
  guests: number;
  locale: Locale;
  currency: string;
  mysteryTitle: string;
}) {
  const [isPro, setIsPro] = useState(false)
  const [clientSecret, setClientSecret] = useState<string>('')
  const [totals, setTotals] = useState<{totalCost: number, basePrice: number, extraGuestCost: number, proCost: number} | null>(null)
  const [isLoadingSecret, setIsLoadingSecret] = useState(true)

  useEffect(() => {
    let active = true;
    setIsLoadingSecret(true)

    createPaymentIntentAction({
      tier: initialTier,
      isPro,
      locale,
      currency,
      mysteryId,
      guests
    }).then(res => {
      if (!active) return;
      if (res.error) {
        console.error(res.error)
      } else if (res.clientSecret) {
        setClientSecret(res.clientSecret)
        setTotals({
          totalCost: res.totalCost!,
          basePrice: res.basePrice!,
          extraGuestCost: res.extraGuestCost!,
          proCost: res.proCost!
        })
      }
      setIsLoadingSecret(false)
    }).catch(err => {
      if (!active) return;
      console.error(err);
      setIsLoadingSecret(false)
    })

    return () => { active = false }
  }, [initialTier, isPro, locale, currency, mysteryId, guests])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row gap-12">
        
        {/* Left Column: Payment Details */}
        <div className="flex-1 lg:w-3/5 order-2 lg:order-1">
          <h1 className="text-3xl font-black uppercase tracking-tight text-brand-dark mb-8">Checkout</h1>
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 mb-8">
            <h2 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-4">Enhance Your Mystery</h2>
            <label className={`flex items-center justify-between p-6 rounded-2xl border-2 cursor-pointer transition-all ${isPro ? 'border-brand-pink bg-brand-pink/5' : 'border-gray-200 hover:border-gray-300'}`}>
              <div>
                <h3 className={`text-lg font-black uppercase tracking-tight mb-1 ${isPro ? 'text-brand-pink' : 'text-brand-dark'}`}>Pro Customizer</h3>
                <p className="text-sm font-bold text-gray-500">Unlocks AI evidence images matching your group and weaves inside jokes into the story.</p>
              </div>
              <div className="flex items-center gap-4 pl-4">
                <span className="text-sm font-black text-brand-pink uppercase">+$10</span>
                <input 
                  type="checkbox" 
                  checked={isPro} 
                  onChange={(e) => setIsPro(e.target.checked)} 
                  className="w-6 h-6 rounded text-brand-pink focus:ring-brand-pink border-gray-300"
                />
              </div>
            </label>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-6">Payment</h2>
            {isLoadingSecret ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-full"></div>
                <div className="h-10 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : clientSecret ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm mysteryId={mysteryId} locale={locale} />
              </Elements>
            ) : (
              <p className="text-red-500 font-bold">Failed to initialize payment gateway.</p>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="flex-1 lg:w-2/5 order-1 lg:order-2">
          <div className="sticky top-8 bg-gray-50 p-8 rounded-3xl border border-gray-200">
            <h2 className="text-2xl font-black uppercase tracking-tight text-brand-dark mb-6">Order Summary</h2>
            
            <div className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Mystery Package</h3>
              <p className="text-xl font-black text-brand-dark">{mysteryTitle}</p>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6 mb-6">
              <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                <span>{initialTier.charAt(0).toUpperCase() + initialTier.slice(1)} Base ({guests} guests)</span>
                <span>{totals ? formatCurrency(totals.basePrice, currency, locale) : '...'}</span>
              </div>
              
              {totals && totals.extraGuestCost > 0 && (
                <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                  <span>Extra Guests</span>
                  <span>{formatCurrency(totals.extraGuestCost, currency, locale)}</span>
                </div>
              )}
              
              {isPro && totals && (
                <div className="flex justify-between items-center text-sm font-black text-brand-pink">
                  <span>Pro Customizer</span>
                  <span>{formatCurrency(totals.proCost, currency, locale)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-end">
                <span className="text-sm font-black uppercase tracking-widest text-brand-dark">Total</span>
                <span className="text-4xl font-black tracking-tighter text-brand-dark">
                  {totals ? formatCurrency(totals.totalCost, currency, locale) : '...'}
                </span>
              </div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  )
}
