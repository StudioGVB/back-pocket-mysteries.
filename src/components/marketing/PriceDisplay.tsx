'use client'

import { useState, useEffect } from 'react'
import { Locale } from '@/lib/i18n-config'
import {
  getFormattedPrice,
  getRegionalPrice,
  formatCurrency,
  detectBrowserCurrency,
  DEFAULT_CURRENCY,
  PriceTierKey,
} from '@/utils/localization'
import { useActiveDiscounts } from '@/utils/use-active-discounts'
import { findBestAutoDiscountForTarget } from '@/utils/discounts'

export function PriceDisplay({
  tier,
  locale,
  currency,
  mysteryId,
  mysterySlug,
  mysteryTitle,
  className = '',
}: {
  tier: PriceTierKey
  locale: Locale
  currency?: string
  mysteryId?: string | null
  mysterySlug?: string | null
  mysteryTitle?: string | null
  className?: string
}) {
  const [activeCurrency, setActiveCurrency] = useState(DEFAULT_CURRENCY)
  const [mounted, setMounted] = useState(false)
  const activeDiscounts = useActiveDiscounts()

  useEffect(() => {
    setMounted(true)
    const cookieMatch = typeof document !== 'undefined' ? document.cookie.match(/(^| )NEXT_CURRENCY=([^;]+)/) : null
    if (cookieMatch && cookieMatch[2]) {
      setActiveCurrency(cookieMatch[2].toUpperCase())
      return
    }
    if (currency) {
      setActiveCurrency(currency)
      return
    }
    setActiveCurrency(detectBrowserCurrency(locale))
  }, [currency, locale])

  const effectiveCurrency = mounted ? activeCurrency : DEFAULT_CURRENCY
  const intlLocale = locale === 'en' ? 'en-US' : 'fr-FR'

  const baseAmount = getRegionalPrice(tier, effectiveCurrency)

  const autoMatch = mounted
    ? findBestAutoDiscountForTarget(activeDiscounts, baseAmount, {
        tier,
        mysteryId,
        mysterySlug,
        mysteryTitle,
      })
    : null

  if (autoMatch && autoMatch.discount && autoMatch.finalPrice < baseAmount) {
    const badgeLabel =
      autoMatch.discount.discount_type === 'percentage'
        ? `-${autoMatch.discount.discount_value}%`
        : `-${formatCurrency(autoMatch.discountAmount, effectiveCurrency, intlLocale)}`

    return (
      <span className="inline-flex items-baseline gap-2 flex-wrap">
        <span className={className}>
          {formatCurrency(autoMatch.finalPrice, effectiveCurrency, intlLocale)}
        </span>
        <span className="text-sm font-bold text-gray-400 line-through">
          {formatCurrency(baseAmount, effectiveCurrency, intlLocale)}
        </span>
        <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest self-center">
          {badgeLabel}
        </span>
      </span>
    )
  }

  // Render default currency during SSR to match hydration
  const priceToRender = mounted
    ? getFormattedPrice(tier, locale, activeCurrency)
    : getFormattedPrice(tier, locale, DEFAULT_CURRENCY)

  return <span className={className}>{priceToRender}</span>
}

export default PriceDisplay
