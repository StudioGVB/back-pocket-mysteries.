'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n-config'
import { getFormattedPrice, DEFAULT_CURRENCY } from '@/utils/localization'

export default function PriceDisplay({ 
  tier, 
  locale, 
  currency,
  isPro = false,
  className = "" 
}: { 
  tier: 'basic' | 'premium' | 'grand' | 'subscribe' | 'plusAddon' | 'basicExtra' | 'premiumExtra' | 'grandExtra', 
  locale: Locale,
  currency?: string,
  isPro?: boolean,
  className?: string
}) {
  const [activeCurrency, setActiveCurrency] = useState(DEFAULT_CURRENCY)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (currency) {
      setActiveCurrency(currency)
      return
    }
    
    // Try to read from cookie on client
    try {
      const match = document.cookie.match(/(^| )NEXT_CURRENCY=([^;]+)/)
      if (match) {
        setActiveCurrency(match[2])
      }
    } catch (e) {
      // Ignore
    }
  }, [currency])
  
  // Render default currency during SSR to match hydration
  const priceToRender = mounted ? getFormattedPrice(tier, locale, activeCurrency, isPro) : getFormattedPrice(tier, locale, DEFAULT_CURRENCY, isPro)
  
  return (
    <span className={className}>
      {priceToRender}
    </span>
  )
}
