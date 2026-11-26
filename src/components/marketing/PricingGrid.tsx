'use client'

import React from 'react'
import Link from 'next/link'
import PriceDisplay from '@/components/marketing/PriceDisplay'
import { Locale } from '@/lib/i18n-config'

type Tier = {
  id: 'basic' | 'premium' | 'grand'
  name: string
  tagline: string
  desc: string
  features: string[]
  cta: string
  featured: boolean
  bestFor: string
  billingPeriod: 'event'
}

export default function PricingGrid({
  basicTier,
  premiumTier,
  grandTier,
  locale,
  currency,
  dict
}: {
  basicTier: Tier
  premiumTier: Tier
  grandTier: Tier
  locale: Locale
  currency: string
  dict: any
}) {
  const coreTiers = [basicTier, premiumTier, grandTier]

  return (
    <div className="max-w-[90rem] mx-auto">
      {/* 3 Core Tiers Grid */}
      <div className="grid lg:grid-cols-3 gap-8 mb-16">
        {coreTiers.map((tier, i) => {
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
                    className={`text-7xl font-black tracking-tighter ${tier.featured ? 'text-white' : 'text-brand-dark'}`} 
                  />
                  <span className={`text-xs font-black uppercase tracking-[0.2em] ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>
                    / EVENT
                  </span>
                </div>
                <p className={`font-bold text-base leading-snug h-16 ${tier.featured ? 'text-gray-400' : 'text-gray-500'}`}>{tier.desc}</p>
              </div>
              
              <div className={`text-[10px] font-black uppercase tracking-[0.2em] mb-4 ${tier.featured ? 'text-gray-500' : 'text-gray-400'}`}>
                {dict.pricing.bestFor} <span className={tier.featured ? 'text-brand-pink' : 'text-brand-dark'}>{tier.bestFor}</span>
              </div>

              <ul className="space-y-5 mb-12 flex-grow">
                {tier.features.map((feature, j) => (
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

              <Link href={`/${locale}/mysteries`} className={`btn-pill w-full py-6 text-center text-sm ${tier.featured ? 'bg-brand-pink text-white hover:bg-white hover:text-brand-pink shadow-2xl' : 'bg-brand-dark text-white hover:bg-brand-pink hover:text-white'}`}>
                {tier.cta}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
