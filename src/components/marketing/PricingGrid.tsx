'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import PriceDisplay from '@/components/marketing/PriceDisplay'
import { Locale } from '@/lib/i18n-config'

type Tier = {
  id: 'basic' | 'premium' | 'grand' | 'subscribe'
  name: string
  tagline: string
  desc: string
  features: string[]
  proFeatures?: string[]
  cta: string
  featured: boolean
  bestFor: string
  billingPeriod: 'event' | 'month'
}

export default function PricingGrid({
  basicTier,
  premiumTier,
  grandTier,
  subscribeTier,
  locale,
  currency,
  dict
}: {
  basicTier: Tier
  premiumTier: Tier
  grandTier: Tier
  subscribeTier: Tier
  locale: Locale
  currency: string
  dict: any
}) {
  const [isPro, setIsPro] = useState(false)

  const coreTiers = [basicTier, premiumTier, grandTier]

  return (
    <div className="max-w-[90rem] mx-auto">
      {/* Global Pro Toggle */}
      <div className="flex justify-center mb-16">
        <div 
          onClick={() => setIsPro(!isPro)}
          className="relative inline-flex items-center p-2 bg-gray-100 rounded-full cursor-pointer shadow-inner border-2 border-transparent hover:border-brand-pink transition-colors"
        >
          {/* Sliding pill */}
          <div 
            className={`absolute z-0 top-2 bottom-2 w-[calc(50%-8px)] bg-brand-pink rounded-full shadow-md transition-transform duration-300 ease-out left-2`}
            style={{ transform: isPro ? 'translateX(100%)' : 'translateX(0)' }}
          />

          <div className="relative z-10 flex items-center justify-center w-48 sm:w-64 px-2 py-3 lg:px-4 lg:py-4 text-center">
            <span className={`text-xs sm:text-sm font-black uppercase tracking-widest transition-colors ${!isPro ? 'text-white' : 'text-gray-500'}`}>
              Standard Base
            </span>
          </div>
          <div className="relative z-10 flex items-center justify-center w-48 sm:w-64 px-2 py-3 lg:px-4 lg:py-4 text-center">
            <span className={`text-xs sm:text-sm font-black uppercase tracking-widest transition-colors ${isPro ? 'text-white' : 'text-gray-500'}`}>
              Go Pro <span className="hidden lg:inline">(+Visuals)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 3 Core Tiers Grid */}
      <div className="grid lg:grid-cols-3 gap-8 mb-16">
        {coreTiers.map((tier, i) => {
          const activeFeatures = (isPro && tier.proFeatures) ? tier.proFeatures : tier.features
          
          return (
            <div key={i} className={`relative p-8 lg:p-12 rounded-[3rem] border-4 flex flex-col group transition-all duration-500 ${tier.featured ? 'bg-brand-dark border-brand-dark shadow-2xl scale-[1.04] z-10' : 'bg-white border-gray-100 hover:border-brand-pink shadow-lg hover:shadow-2xl'}`}>
              {tier.featured && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-8 py-3 bg-brand-pink text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl whitespace-nowrap">
                  {dict.pricing.mostPopular}
                </div>
              )}
              
              <div className="mb-10">
                <h3 className={`text-4xl font-black mb-2 uppercase tracking-tighter ${tier.featured ? 'text-white' : 'text-brand-dark'}`}>{tier.name}</h3>
                <p className={`text-sm font-black uppercase tracking-widest mb-6 ${tier.featured ? 'text-brand-pink' : 'text-gray-400'}`}>{tier.tagline}</p>
                <div className="flex items-baseline gap-2 mb-6">
                  <PriceDisplay 
                    tier={tier.id} 
                    locale={locale as Locale} 
                    currency={currency}
                    isPro={isPro}
                    className={`text-7xl font-black tracking-tighter ${tier.featured ? 'text-white' : 'text-brand-dark'}`} 
                  />
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>
                    / {tier.billingPeriod === 'month' ? 'MONTH' : 'EVENT'}
                  </span>
                </div>
                <p className={`font-bold text-base leading-snug h-16 ${tier.featured ? 'text-gray-400' : 'text-gray-500'}`}>{tier.desc}</p>
              </div>
              
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>
                {dict.pricing.bestFor} <span className={tier.featured ? 'text-brand-pink' : 'text-brand-dark'}>{tier.bestFor}</span>
              </div>

              <ul className="space-y-5 mb-12 flex-grow">
                {activeFeatures.map((feature, j) => (
                  <li key={j} className="flex items-start gap-4">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-pink flex items-center justify-center text-white text-xs shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-sm font-bold leading-snug ${tier.featured ? 'text-gray-300' : 'text-brand-dark'}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link href={`/${locale}/create?complexity=${tier.id}${isPro ? '&pro=true' : ''}`} className={`btn-pill w-full py-6 text-center text-sm ${tier.featured ? 'bg-brand-pink text-white hover:bg-white hover:text-brand-pink shadow-2xl' : 'bg-brand-dark text-white hover:bg-brand-pink hover:text-white'}`}>
                {tier.cta}
              </Link>
            </div>
          )
        })}
      </div>

      {/* Unlimited Subscription Tier */}
      <div className="relative p-12 lg:p-16 rounded-[3rem] border-4 bg-brand-pink border-brand-pink shadow-2xl flex flex-col lg:flex-row gap-12 items-center group transition-all duration-500">
        <div className="absolute top-0 right-12 transform -translate-y-1/2 px-8 py-3 bg-brand-dark text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
          FOR EVENT PLANNERS
        </div>
        
        <div className="flex-1">
          <h3 className="text-5xl lg:text-6xl font-black mb-2 uppercase tracking-tighter text-white">{subscribeTier.name}</h3>
          <p className="text-sm font-black uppercase tracking-widest mb-6 text-white/80">{subscribeTier.tagline}</p>
          <div className="flex items-baseline gap-2 mb-6">
            <PriceDisplay 
              tier={subscribeTier.id} 
              locale={locale as Locale} 
              currency={currency}
              isPro={false} 
              className="text-7xl lg:text-8xl font-black tracking-tighter text-brand-dark" 
            />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
              / {subscribeTier.billingPeriod === 'month' ? 'MONTH' : 'EVENT'}
            </span>
          </div>
          <p className="font-bold text-lg leading-snug text-white/90 max-w-xl">{subscribeTier.desc}</p>
        </div>

        <div className="flex-1 w-full">
          <ul className="space-y-4 mb-10 bg-white/10 p-8 rounded-[2rem] border border-white/20">
            {subscribeTier.features.map((feature, j) => (
              <li key={j} className="flex items-start gap-4">
                <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center text-white text-xs shrink-0">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-sm font-bold leading-snug text-white">{feature}</span>
              </li>
            ))}
          </ul>

          <Link href={`/${locale}/create?complexity=grand`} className="btn-pill w-full py-6 text-center text-sm bg-brand-dark text-white hover:bg-white hover:text-brand-dark shadow-2xl">
            {subscribeTier.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}
