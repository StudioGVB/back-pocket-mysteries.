'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Locale } from '@/lib/i18n-config'
import {
  getRegionalPrice,
  getTierForPlayerCount,
  formatCurrency,
  DEFAULT_CURRENCY,
} from '@/utils/localization'
import { useActiveDiscounts } from '@/utils/use-active-discounts'
import { findBestAutoDiscountForTarget } from '@/utils/discounts'

type Tier = {
  id: 'basic' | 'premium' | 'grand' | 'subscribe'
  name: string
  tagline: string
  desc: string
  features: string[]
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
  const activeDiscounts = useActiveDiscounts()

  useEffect(() => {
    setMounted(true)
    try {
      const match = document.cookie.match(/(^| )NEXT_CURRENCY=([^;]+)/)
      if (match) {
        setActiveCurrency(match[2])
      }
    } catch {}
  }, [])

  const [guests, setGuests] = useState(8)
  const selectedTierId = getTierForPlayerCount(guests)

  const handleSelectPackageBracket = (tierId: 'basic' | 'premium' | 'grand') => {
    if (tierId === 'basic' && guests > 6) setGuests(6)
    if (tierId === 'premium' && (guests < 7 || guests > 10)) setGuests(8)
    if (tierId === 'grand' && guests < 11) setGuests(12)
  }

  const effectiveCurrency = mounted ? activeCurrency : DEFAULT_CURRENCY

  // Flat package pricing calculations based strictly on player count + automatic discounts
  const basePrice = getRegionalPrice(selectedTierId, effectiveCurrency)

  const baseDiscountMatch = mounted
    ? findBestAutoDiscountForTarget(activeDiscounts, basePrice, { tier: selectedTierId })
    : { discount: null, originalPrice: basePrice, finalPrice: basePrice, discountAmount: 0 }

  const totalDiscountAmount = baseDiscountMatch.discountAmount
  const originalSubtotal = basePrice
  const totalCost = Math.max(0, originalSubtotal - totalDiscountAmount)

  const activeTier =
    selectedTierId === 'basic'
      ? basicTier
      : selectedTierId === 'premium'
      ? premiumTier
      : grandTier

  return (
    <div className="max-w-6xl mx-auto mb-20">
      <div className="text-center mb-16">
        <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-4 uppercase tracking-tight">
          Priced By <span className="text-brand-pink italic">Group Size</span>
        </h2>
        <p className="text-gray-400 font-bold text-lg">
          Every complexity and spice level is included — you only pay for your player bracket.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
        {/* Left Column: Inputs */}
        <div className="lg:col-span-3 space-y-12">
          {/* Step 1: Guest Count Slider */}
          <div>
            <div className="flex justify-between items-end mb-4">
              <h3 className="text-xl font-black uppercase tracking-widest text-brand-dark">
                1. How Many Players Are Coming?
              </h3>
              <div className="text-sm font-bold text-brand-pink bg-brand-pink/10 px-3.5 py-1 rounded-full uppercase tracking-wider">
                {selectedTierId === 'basic'
                  ? 'Basic (4–6 Players)'
                  : selectedTierId === 'premium'
                  ? 'Premium (4–10 Players)'
                  : 'Grand (4–16 Players)'}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border-2 border-gray-100 shadow-sm">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setGuests(Math.max(4, guests - 1))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-brand-dark hover:bg-gray-200 hover:text-brand-pink transition-colors font-black text-xl cursor-pointer"
                >
                  -
                </button>

                <div className="flex-1 text-center">
                  <div className="text-6xl font-black text-brand-dark tracking-tighter mb-2">
                    {guests}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                    ✓ {activeTier.name} Package — All {guests} Players Included
                  </div>
                </div>

                <button
                  onClick={() => setGuests(Math.min(16, guests + 1))}
                  className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-brand-dark hover:bg-gray-200 hover:text-brand-pink transition-colors font-black text-xl cursor-pointer"
                >
                  +
                </button>
              </div>

              <input
                type="range"
                min={4}
                max={16}
                value={guests}
                onChange={(e) => setGuests(parseInt(e.target.value, 10))}
                className="w-full mt-8 accent-brand-pink h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400 mt-3">
                <span>4–6 Basic</span>
                <span>7–10 Premium</span>
                <span>11–16 Grand</span>
              </div>
            </div>
          </div>

          {/* Step 2: Package Brackets */}
          <div>
            <h3 className="text-xl font-black uppercase tracking-widest text-brand-dark mb-4">
              2. Your Player Count Bracket
            </h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { id: 'basic' as const, name: 'Basic', players: '4–6 Players', tier: basicTier },
                { id: 'premium' as const, name: 'Premium', players: '4–10 Players', tier: premiumTier },
                { id: 'grand' as const, name: 'Grand', players: '4–16 Players', tier: grandTier },
              ].map((opt) => {
                const optBase = getRegionalPrice(opt.id, effectiveCurrency)
                const optDisc = mounted
                  ? findBestAutoDiscountForTarget(activeDiscounts, optBase, { tier: opt.id })
                  : null
                const hasOptSale = Boolean(optDisc?.discount && optDisc.finalPrice < optBase)
                const isSelected = selectedTierId === opt.id

                return (
                  <div
                    key={opt.id}
                    onClick={() => handleSelectPackageBracket(opt.id)}
                    className={`relative p-6 rounded-3xl border-4 cursor-pointer transition-all duration-300 ${
                      isSelected
                        ? 'border-brand-pink bg-brand-pink/5 scale-[1.02] shadow-lg'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    {hasOptSale ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-pink text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full whitespace-nowrap shadow">
                        {optDisc!.discount!.discount_type === 'percentage'
                          ? `SAVE ${optDisc!.discount!.discount_value}%`
                          : `SAVE ${formatCurrency(optDisc!.discountAmount, effectiveCurrency, locale)}`}
                      </div>
                    ) : opt.id === 'premium' ? (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-brand-dark text-white text-[9px] font-black uppercase tracking-[0.2em] rounded-full">
                        Most Popular
                      </div>
                    ) : null}
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <h4
                        className={`text-lg font-black uppercase tracking-tight ${
                          isSelected ? 'text-brand-pink' : 'text-brand-dark'
                        }`}
                      >
                        {opt.name}
                      </h4>
                      <span className="text-lg font-black text-brand-dark">
                        {formatCurrency(optDisc?.finalPrice ?? optBase, effectiveCurrency, locale)}
                      </span>
                    </div>
                    <p className="text-xs font-black text-brand-pink uppercase tracking-widest mb-3">
                      {opt.players}
                    </p>
                    <p className="text-xs font-bold text-gray-500 leading-tight">{opt.tier.desc}</p>
                  </div>
                )
              })}
            </div>

            {/* Package Difference Callout */}
            <div className="mt-6 p-6 rounded-3xl bg-slate-50 border border-slate-200/80">
              <p className="text-xs font-black uppercase tracking-widest text-brand-dark mb-2">
                💡 What&apos;s the difference between Basic, Premium &amp; Grand?
              </p>
              <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                <strong>Every single-event package includes 100% of our features</strong> — AI guest personalization, custom text/audio clues, Kahoot-style live mobile lobby, Spoiler-Free Host Mode, and any complexity or spice level. Your package bracket simply scales the <strong>number of custom character booklets (4–6, 4–10, or 4–16 suspects)</strong> and expands the <strong>interlocking web of relationships, motives, and red-herring subplots</strong> generated so every guest in the room is woven into the crime.
              </p>
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
                <span>
                  {activeTier.name} Package ({guests} players)
                </span>
                <span>{formatCurrency(basePrice, effectiveCurrency, locale)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold text-sm">
                <span>Any Complexity &amp; Spice Level</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold text-sm">
                <span>AI Guest Casting &amp; Custom Clues</span>
                <span>Included</span>
              </div>

              {totalDiscountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-400 font-black pt-2 border-t border-white/10">
                  <span>
                    🏷️ {baseDiscountMatch.discount?.name || 'Special Promotion'}
                  </span>
                  <span>-{formatCurrency(totalDiscountAmount, effectiveCurrency, locale)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="border-t border-white/20 pt-6 mb-10 flex justify-between items-end">
              <div>
                <span className="block text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                  Flat Total Due
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-5xl font-black tracking-tighter text-white">
                    {formatCurrency(totalCost, effectiveCurrency, locale)}
                  </span>
                  {totalDiscountAmount > 0 && (
                    <span className="text-xl font-bold text-gray-500 line-through">
                      {formatCurrency(originalSubtotal, effectiveCurrency, locale)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Feature List */}
            <div className="bg-white/5 rounded-3xl p-6 mb-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-4">
                What&apos;s Included:
              </p>
              <ul className="space-y-3">
                {activeTier.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="text-brand-pink text-sm mt-0.5">✓</span>
                    <span className="text-xs font-bold leading-snug text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={`/${locale}/mysteries`}
              className="btn-pill block w-full px-8 py-6 text-center text-sm bg-brand-pink text-white hover:bg-white hover:text-brand-pink shadow-xl mt-auto"
            >
              Browse Mysteries &amp; Cast Guests →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
