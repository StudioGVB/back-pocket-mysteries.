import { Locale } from '@/lib/i18n-config'
import { getFormattedPrice } from '@/utils/localization'

export default function PriceDisplay({ 
  tier, 
  locale, 
  className = "" 
}: { 
  tier: 'basic' | 'premium' | 'deluxe', 
  locale: Locale,
  className?: string
}) {
  const price = getFormattedPrice(tier, locale)
  
  return (
    <span className={className}>
      {price}
    </span>
  )
}
