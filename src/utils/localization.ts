import { Locale, i18n } from '@/lib/i18n-config'

export const CURRENCY_MAP: Record<string, string> = {
  US: 'USD',
  GB: 'GBP',
  AU: 'AUD',
  CA: 'CAD',
  EU: 'EUR',
}

export const DEFAULT_CURRENCY = 'USD'

// Pricing tiers in base USD
const BASE_PRICES = {
  basic: 19,
  premium: 25,
  grand: 33,
  subscribe: 85,
  plusAddon: 10,
  basicExtra: 2,
  premiumExtra: 3,
  grandExtra: 4,
}

// Fixed regional pricing (as approved in plan or fallback to conversion)
// For now, let's use a mapping for major regions
export const REGIONAL_PRICES: Record<string, Record<string, number>> = {
  USD: { basic: 19, premium: 25, grand: 33, subscribe: 85, plusAddon: 10, basicExtra: 2, premiumExtra: 3, grandExtra: 4 },
  GBP: { basic: 15, premium: 20, grand: 25, subscribe: 65, plusAddon: 8, basicExtra: 2, premiumExtra: 2, grandExtra: 3 },
  AUD: { basic: 29, premium: 39, grand: 49, subscribe: 129, plusAddon: 15, basicExtra: 3, premiumExtra: 4, grandExtra: 5 },
  EUR: { basic: 18, premium: 23, grand: 30, subscribe: 79, plusAddon: 9, basicExtra: 2, premiumExtra: 3, grandExtra: 4 },
  CAD: { basic: 25, premium: 34, grand: 45, subscribe: 115, plusAddon: 14, basicExtra: 3, premiumExtra: 4, grandExtra: 5 },
}

export function getCurrencyForCountry(countryCode: string | null, locale: Locale): string {
  if (!countryCode) return getCurrencyForLocale(locale)

  const code = countryCode.toUpperCase()
  if (code === 'GB' || code === 'UK') return 'GBP'
  if (code === 'AU' || code === 'NZ') return 'AUD'
  if (code === 'CA') return 'CAD'
  
  // Eurozone countries
  const eurozone = ['FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'FI', 'IE', 'GR', 'CY', 'EE', 'LV', 'LT', 'LU', 'MT', 'SK', 'SI']
  if (eurozone.includes(code)) return 'EUR'
  
  if (code === 'US') return 'USD'

  // Default fallback based on locale if we don't have a specific mapping
  return getCurrencyForLocale(locale)
}

export function resolveCurrency(countryCode: string | null, cookieCurrency: string | undefined | null, locale: Locale): string {
  if (cookieCurrency) {
    return cookieCurrency.toUpperCase();
  }
  return getCurrencyForCountry(countryCode, locale);
}

export function getCurrencyForLocale(locale: Locale): string {
  // Simplistic mapping for demo purposes
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

export function getRegionalPrice(tier: keyof typeof BASE_PRICES, currency: string) {
  const prices = REGIONAL_PRICES[currency] || REGIONAL_PRICES[DEFAULT_CURRENCY]
  return prices[tier]
}

export function formatDateTime(date: Date | string, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions) {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale, options).format(d)
}

export function getFormattedPrice(tier: keyof typeof BASE_PRICES, locale: Locale, currency?: string, isPro: boolean = false) {
  const activeCurrency = currency || getCurrencyForLocale(locale)
  let amount = getRegionalPrice(tier, activeCurrency)
  
  if (isPro) {
    amount += getRegionalPrice('plusAddon', activeCurrency)
  }
  
  return formatCurrency(amount, activeCurrency, locale === 'en' ? 'en-US' : 'fr-FR')
}
