import { Locale } from '@/lib/i18n-config'
import { getFormattedPrice } from '@/utils/localization'

export default function PriceDisplay({ 
  tier, 
  locale, 
  currency,
  isPro = false,
  className = "" 
}: { 
  tier: 'basic' | 'premium' | 'grand' | 'subscribe', 
  locale: Locale,
  currency?: string,
  isPro?: boolean,
  className?: string
}) {
  const price = getFormattedPrice(tier, locale, currency, isPro)
  
  return (
    <span className={className}>
      {price}
    </span>
  )
}
