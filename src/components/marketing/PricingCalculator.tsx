'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Locale } from '@/lib/i18n-config'
import { getRegionalPrice, formatCurrency, DEFAULT_CURRENCY } from '@/utils/localization'

type Tier = {
  id: 'basic' | 'premium' | 'grand' | 'subscribe'
  name: string
  tagline: string
  desc: string
  features: string[]
  proFeatures?: string[]
}

export default function PricingCalculator({
  basicTier,
  premiumTier,
  grandTier,
  locale,
}: {
  basicTier: Tier
  premiumTier: Tier
  grandTier: Tier
  locale: Locale
}) {
  const [activeCurrency, setActiveCurrency] = useState(DEFAULT_CURRENCY)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const match = document.cookie.match(/(^| )NEXT_CURRENCY=([^;]+)/)
      if (match) {
        setActiveCurrency(match[2])
      }
    } catch (e) {}
  }, [])

  const [complexity, setComplexity] = useState<'basic' | 'premium' | 'grand'>('premium')
  const [guests, setGuests] = useState(8)
  const [isPro, setIsPro] = useState(false)

  // Caps and limits based on complexity
  const limits = {
    basic: { min: 4, max: 10, included: 6, extraTier: 'basicExtra' as const },
    premium: { min: 4, max: 12, included: 8, extraTier: 'premiumExtra' as const },
    grand: { min: 4, max: 16, included: 10, extraTier: 'grandExtra' as const },
  }

  const currentLimit = limits[complexity]

  // Enforce limits when complexity changes
  useEffect(() => {
    if (guests > currentLimit.max) setGuests(currentLimit.max)
    if (guests < currentLimit.min) setGuests(currentLimit.min)
  }, [complexity, currentLimit.max, currentLimit.min, guests])

  // Pricing calculations
  const basePrice = getRegionalPrice(complexity, activeCurrency)
  const extraGuests = Math.max(0, guests - currentLimit.included)
  const extraGuestFee = getRegionalPrice(currentLimit.extraTier, activeCurrency)
  const totalExtraGuestCost = extraGuests * extraGuestFee
  const proCost = isPro ? getRegionalPrice('plusAddon', activeCurrency) : 0
  
  const totalCost = basePrice + totalExtraGuestCost + proCost

  const activeTier = complexity === 'basic' ? basicTier : complexity === 'premium' ? premiumTier : grandTier
  const activeFeatures = (isPro && activeTier.proFeatures) ? activeTier.proFeatures : activeTier.features


  return (
    <div className="max-w-6xl mx-auto mb-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-4 uppercase tracking-tight">
          Build Your <span className="text-brand-pink italic">Mystery</span>
        </h2>
        <p className="text-gray-400 font-bold text-lg">Calculate your exact package cost below.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-3 space-y-12">
          
          {/* Complexity Selection */}
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-4">1. Select Complexity</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { id: 'basic', name: 'Easy', time: '1-2 Hrs', tier: basicTier },
                { id: 'premium', name: 'Standard', time: '2-3 Hrs', tier: premiumTier },
                { id: 'grand', name: 'Epic', time: '3-4 Hrs', tier: grandTier }
              ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setComplexity(opt.id as 'basic'|'premium'|'grand')}
                  className={`relative p-6 rounded-3xl border-4 cursor-pointer transition-all duration-300 ${complexity === opt.id ? 'border-brand-pink bg-brand-pink/5 scale-[1.02] shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                >
                  {opt.id === 'premium' && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-dark text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
                      Popular
                    </div>
                  )}
                  <h4 className={`text-lg font-black uppercase tracking-tight mb-1 ${complexity === opt.id ? 'text-brand-pink' : 'text-brand-dark'}`}>{opt.name}</h4>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{opt.time}</p>
                  <p className="text-xs font-bold text-gray-500 leading-tight">{opt.tier.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Guest Count Slider */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-dark">2. Number of Guests</h3>
              <div className="text-sm font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                Max {currentLimit.max} for {complexity}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm">
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setGuests(Math.max(currentLimit.min, guests - 1))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-brand-dark hover:bg-gray-200 hover:text-brand-pink transition-colors font-black text-xl"
                >
                  -
                </button>
                
                <div className="flex-1 text-center">
                  <div className="text-6xl font-black text-brand-dark tracking-tighter mb-2">{guests}</div>
                  <div className="text-xs font-bold text-brand-pink uppercase tracking-widest">
                    {guests <= currentLimit.included 
                      ? 'All Included' 
                      : `${extraGuests} Extra Guest${extraGuests > 1 ? 's' : ''} (+${formatCurrency(totalExtraGuestCost, activeCurrency, locale)})`}
                  </div>
                </div>

                <button 
                  onClick={() => setGuests(Math.min(currentLimit.max, guests + 1))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-brand-dark hover:bg-gray-200 hover:text-brand-pink transition-colors font-black text-xl"
                >
                  +
                </button>
              </div>
              
              <input 
                type="range" 
                min={currentLimit.min} 
                max={currentLimit.max} 
                value={guests} 
                onChange={(e) => setGuests(parseInt(e.target.value))}
                className="w-full mt-8 accent-brand-pink h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Pro Customizer Toggle */}
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-4">3. Pro Customizer</h3>
            <div 
              onClick={() => setIsPro(!isPro)}
              className={`p-6 sm:p-8 rounded-3xl border-4 cursor-pointer transition-all duration-300 flex items-center justify-between gap-6 ${isPro ? 'border-brand-pink bg-brand-pink/5 shadow-lg' : 'border-gray-100 bg-white hover:border-gray-200'}`}
            >
              <div>
                <h4 className={`text-lg font-black uppercase tracking-tight mb-2 ${isPro ? 'text-brand-pink' : 'text-brand-dark'}`}>
                  Add Custom Visuals & Inside Jokes
                </h4>
                <p className="text-sm font-bold text-gray-500 leading-relaxed">
                  Every mystery already includes your guests&apos; real names. This upgrade unlocks AI evidence images that match your group&apos;s actual appearances, and weaves personal inside jokes directly into the storyline.
                </p>
                <div className="mt-3 text-xs font-black uppercase tracking-widest text-brand-pink">
                  +{mounted ? formatCurrency(getRegionalPrice('plusAddon', activeCurrency), activeCurrency, locale) : formatCurrency(getRegionalPrice('plusAddon', DEFAULT_CURRENCY), DEFAULT_CURRENCY, locale)} Flat Fee
                </div>
              </div>
              
              <div className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 ${isPro ? 'bg-brand-pink' : 'bg-gray-300'}`}>
                <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-md ${isPro ? 'translate-x-7' : 'translate-x-1'}`} />
              </div>
            </div>
          </div>
          
        </div>

        {/* Right Column: Receipt & Features */}
        <div className="lg:col-span-2">
          <div className="sticky top-32 bg-brand-dark rounded-[3rem] p-8 lg:p-10 shadow-2xl border-4 border-brand-dark flex flex-col h-full lg:h-auto">
            
            <h3 className="text-2xl font-black uppercase tracking-tight text-white mb-8 border-b border-white/10 pb-6">
              Your Package
            </h3>

            {/* Receipt Lines */}
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center text-white/90 font-bold">
                <span>{activeTier.name} Base ({currentLimit.included} guests)</span>
                <span>{mounted ? formatCurrency(basePrice, activeCurrency, locale) : formatCurrency(getRegionalPrice(complexity, DEFAULT_CURRENCY), DEFAULT_CURRENCY, locale)}</span>
              </div>
              
              {extraGuests > 0 && (
                <div className="flex justify-between items-center text-white/90 font-bold">
                  <span>Extra Guests ({extraGuests} &times; {mounted ? formatCurrency(extraGuestFee, activeCurrency, locale) : formatCurrency(getRegionalPrice(currentLimit.extraTier, DEFAULT_CURRENCY), DEFAULT_CURRENCY, locale)})</span>
                  <span>{mounted ? formatCurrency(totalExtraGuestCost, activeCurrency, locale) : formatCurrency(extraGuests * getRegionalPrice(currentLimit.extraTier, DEFAULT_CURRENCY), DEFAULT_CURRENCY, locale)}</span>
                </div>
              )}
              
              {isPro && (
                <div className="flex justify-between items-center text-brand-pink font-bold">
                  <span>Pro Customizer</span>
                  <span>{mounted ? formatCurrency(proCost, activeCurrency, locale) : formatCurrency(isPro ? getRegionalPrice('plusAddon', DEFAULT_CURRENCY) : 0, DEFAULT_CURRENCY, locale)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-white/20 pt-6 mb-10 flex justify-between items-end">
              <div>
                <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Total Due</span>
                <span className="text-5xl font-black tracking-tighter text-white">
                  {mounted ? formatCurrency(totalCost, activeCurrency, locale) : formatCurrency(
                    getRegionalPrice(complexity, DEFAULT_CURRENCY) + 
                    (extraGuests * getRegionalPrice(currentLimit.extraTier, DEFAULT_CURRENCY)) + 
                    (isPro ? getRegionalPrice('plusAddon', DEFAULT_CURRENCY) : 0), 
                    DEFAULT_CURRENCY, locale)}
                </span>
              </div>
            </div>

            {/* Feature List */}
            <div className="bg-white/5 rounded-3xl p-6 mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">What&apos;s Included:</p>
              <ul className="space-y-3">
                {activeFeatures.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-brand-pink text-sm mt-0.5">✓</span>
                    <span className="text-xs font-bold leading-snug text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link 
              href={`/${locale}/login?next=/${locale}/create?complexity=${complexity}${isPro ? '%26pro=true' : ''}`}
              className="btn-pill block w-full px-8 py-6 text-center text-sm bg-brand-pink text-white hover:bg-white hover:text-brand-pink shadow-xl mt-auto"
            >
              Start Building Now
            </Link>

          </div>
        </div>

      </div>
    </div>
  )
}
