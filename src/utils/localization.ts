import { Locale, i18n } from '@/lib/i18n-config'

export type { Locale }
export { i18n }

export const CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  EU: 'EUR',
}

export const DEFAULT_CURRENCY = 'USD'

// Pricing tiers in base USD — priced strictly by player count:
// basic: 4–6 players ($19)
// premium: 4–10 players ($25)
// grand: 4–16 players ($33)
// subscribe: Unlimited monthly pass ($39/mo USD / $59/mo AUD)
export const BASE_PRICES = {
  basic: 19,
  premium: 25,
  grand: 33,
  subscribe: 39,
}

export type PriceTierKey = keyof typeof BASE_PRICES

export const PLAYER_TIER_LIMITS: Record<
  'basic' | 'premium' | 'grand',
  { min: number; max: number; label: string; bracketLabel: string }
> = {
  basic: { min: 5, max: 6, label: '5–6 Suspects (1–6 Players)', bracketLabel: '5–6 Suspects' },
  premium: { min: 5, max: 10, label: '5–10 Suspects (1–10 Players)', bracketLabel: '7–10 Suspects' },
  grand: { min: 5, max: 16, label: '5–16 Suspects (1–16 Players)', bracketLabel: '11–16 Suspects' },
}

// Fixed regional pricing across supported currencies
export const REGIONAL_PRICES: Record<string, Record<PriceTierKey, number>> = {
  USD: { basic: 19, premium: 25, grand: 33, subscribe: 39 },
  GBP: { basic: 15, premium: 20, grand: 25, subscribe: 30 },
  AUD: { basic: 29, premium: 39, grand: 49, subscribe: 59 },
  EUR: { basic: 18, premium: 23, grand: 30, subscribe: 36 },
  CAD: { basic: 25, premium: 34, grand: 45, subscribe: 55 },
  NZD: { basic: 32, premium: 42, grand: 55, subscribe: 65 },
}

export const STRIPE_PRODUCT_IDS: Record<PriceTierKey, string> = {
  basic: 'prod_VZJreupMPp4aPD',
  premium: 'prod_VZJrNTnOuWyTIx',
  grand: 'prod_VZJrAUMODWZBdF',
  subscribe: 'prod_VZJrlaKesck9tc',
}

export const STRIPE_PRICE_IDS: Record<PriceTierKey, Record<string, string>> = {
  basic: {
    USD: 'price_1UYBDmLci6gVVJa0bmmqxgeM',
    GBP: 'price_1UYBDmLci6gVVJa0OhATZAHS',
    AUD: 'price_1UYBDmLci6gVVJa0sLcC4Cfr',
    EUR: 'price_1UYBDnLci6gVVJa0WDhrCrwk',
    CAD: 'price_1UYBDnLci6gVVJa0C9XSxPRS',
    NZD: 'price_1UYBDnLci6gVVJa0c84fn8JB',
  },
  premium: {
    USD: 'price_1UYBDoLci6gVVJa0hx8386Ca',
    GBP: 'price_1UYBDoLci6gVVJa05RA499vM',
    AUD: 'price_1UYBDoLci6gVVJa0riwENCyN',
    EUR: 'price_1UYBDoLci6gVVJa09yMvcp14',
    CAD: 'price_1UYBDpLci6gVVJa0kR2MJRPd',
    NZD: 'price_1UYBDpLci6gVVJa0Z7D7yxFB',
  },
  grand: {
    USD: 'price_1UYBDqLci6gVVJa0dbwI6vxp',
    GBP: 'price_1UYBDqLci6gVVJa01YumFi7Z',
    AUD: 'price_1UYBDqLci6gVVJa00oaq0cRi',
    EUR: 'price_1UYBDqLci6gVVJa0b3DGFsXT',
    CAD: 'price_1UYBDrLci6gVVJa0bCFzt3C3',
    NZD: 'price_1UYBDrLci6gVVJa0vvvKiRbs',
  },
  subscribe: {
    USD: 'price_1UYBDsLci6gVVJa0cbXVCce4',
    GBP: 'price_1UYBDsLci6gVVJa0IkzdAXA6',
    AUD: 'price_1UYBDsLci6gVVJa0ffwibhoN',
    EUR: 'price_1UYBDsLci6gVVJa0LOtYjweN',
    CAD: 'price_1UYBDtLci6gVVJa0oSXFMk5y',
    NZD: 'price_1UYBDtLci6gVVJa02b54zUDv',
  },
}

/**
 * Determines the package pricing tier strictly from the number of active suspects in the cast:
 * - 5–6 suspects -> 'basic'
 * - 7–10 suspects (5–10 suspect tier) -> 'premium'
 * - 11–16+ suspects (5–16 suspect tier) -> 'grand'
 */
export function getTierForPlayerCount(playerCount?: number | null): 'basic' | 'premium' | 'grand' {
  const count = typeof playerCount === 'number' && !isNaN(playerCount) ? playerCount : 8
  if (count <= 6) return 'basic'
  if (count <= 10) return 'premium'
  return 'grand'
}

export function getPackageInfoForMaxPlayers(maxPlayers?: number | null): {
  tier: 'basic' | 'premium' | 'grand'
  label: string
  rangeLabel: string
  requiredCharacters: number
  baseUsd: number
} {
  const tier = getTierForPlayerCount(maxPlayers)
  if (tier === 'basic') {
    return {
      tier: 'basic',
      label: 'Basic Package',
      rangeLabel: '5–6 Suspects (1–6 Players)',
      requiredCharacters: 6,
      baseUsd: 19,
    }
  }
  if (tier === 'premium') {
    return {
      tier: 'premium',
      label: 'Premium Package',
      rangeLabel: '5–10 Suspects (1–10 Players)',
      requiredCharacters: 10,
      baseUsd: 25,
    }
  }
  return {
    tier: 'grand',
    label: 'Grand Package',
    rangeLabel: '5–16 Suspects (1–16 Players)',
    requiredCharacters: 16,
    baseUsd: 33,
  }
}

/**
 * Kept as a backwards-compatible alias if any caller passes complexity or player count.
 */
export function getTierForComplexity(
  complexityOrCount?: string | number | null
): 'basic' | 'premium' | 'grand' {
  if (typeof complexityOrCount === 'number') {
    return getTierForPlayerCount(complexityOrCount)
  }
  if (complexityOrCount === 'basic') return 'basic'
  if (complexityOrCount === 'grand') return 'grand'
  if (complexityOrCount === 'premium') return 'premium'
  return 'basic'
}

export function getCurrencyForCountry(countryCode: string | null, locale: Locale): string {
  if (!countryCode) return getCurrencyForLocale(locale)

  const code = countryCode.toUpperCase()
  if (code === 'GB' || code === 'UK') return 'GBP'
  if (code === 'AU') return 'AUD'
  if (code === 'NZ') return 'NZD'
  if (code === 'CA') return 'CAD'

  // Eurozone countries
  const eurozone = [
    'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE',
    'GR', 'CY', 'EE', 'LV', 'LT', 'LU', 'MT', 'SK', 'SI',
  ]
  if (eurozone.includes(code)) return 'EUR'

  if (code === 'US') return 'USD'

  return getCurrencyForLocale(locale)
}

export function resolveCurrency(
  countryCode: string | null,
  cookieCurrency: string | undefined | null,
  locale: Locale
): string {
  if (cookieCurrency) {
    return cookieCurrency.toUpperCase()
  }
  return getCurrencyForCountry(countryCode, locale)
}

export function getCurrencyForLocale(locale: Locale): string {
  if (locale === 'fr') return 'EUR'
  return 'USD'
}

export function formatCurrency(amount: number, currency: string, locale: string = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getRegionalPrice(tier: PriceTierKey, currency: string) {
  const prices = REGIONAL_PRICES[currency] || REGIONAL_PRICES[DEFAULT_CURRENCY]
  return prices[tier] ?? REGIONAL_PRICES[DEFAULT_CURRENCY][tier]
}

export function formatDateTime(
  date: Date | string,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function getFormattedPrice(tier: PriceTierKey, locale: Locale, currency?: string) {
  const activeCurrency = currency || getCurrencyForLocale(locale)
  const amount = getRegionalPrice(tier, activeCurrency)
  return formatCurrency(amount, activeCurrency, locale === 'en' ? 'en-US' : 'fr-FR')
}

/**
 * Client-side helper: reads NEXT_CURRENCY cookie if set, otherwise auto-detects
 * native currency from the user's browser timezone / language (GBP, AUD, NZD, CAD, EUR, USD).
 */
export function detectBrowserCurrency(fallbackLocale: Locale = 'en'): string {
  if (typeof window === 'undefined') {
    return getCurrencyForLocale(fallbackLocale)
  }
  try {
    const match = document.cookie.match(/(^| )NEXT_CURRENCY=([^;]+)/)
    if (match && match[2]) {
      const code = match[2].toUpperCase()
      if (REGIONAL_PRICES[code]) return code
    }

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.startsWith('Australia/')) return 'AUD'
    if (tz.startsWith('Pacific/Auckland') || tz.startsWith('Pacific/Chatham')) return 'NZD'
    if (tz === 'Europe/London' || tz === 'Europe/Belfast') return 'GBP'
    if (
      tz.startsWith('America/Toronto') ||
      tz.startsWith('America/Vancouver') ||
      tz.startsWith('America/Montreal') ||
      tz.startsWith('America/Edmonton') ||
      tz.startsWith('America/Winnipeg') ||
      tz.startsWith('America/Halifax')
    ) {
      return 'CAD'
    }
    if (tz.startsWith('Europe/')) return 'EUR'

    const lang = (navigator.language || '').toUpperCase()
    if (lang.endsWith('-GB') || lang.endsWith('-UK')) return 'GBP'
    if (lang.endsWith('-AU')) return 'AUD'
    if (lang.endsWith('-NZ')) return 'NZD'
    if (lang.endsWith('-CA')) return 'CAD'
  } catch {
    // ignore
  }
  return getCurrencyForLocale(fallbackLocale)
}
