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
  premium: 33,
  deluxe: 49,
}

// Fixed regional pricing (as approved in plan or fallback to conversion)
// For now, let's use a mapping for major regions
export const REGIONAL_PRICES: Record<string, Record<string, number>> = {
  USD: { basic: 19, premium: 33, deluxe: 49 },
  GBP: { basic: 15, premium: 25, deluxe: 40 },
  AUD: { basic: 29, premium: 49, deluxe: 75 },
  EUR: { basic: 18, premium: 30, deluxe: 45 },
}

export function getCurrencyForLocale(locale: Locale): string {
  // Simplistic mapping for demo purposes
  // In a real app, this might come from a GeoIP header
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

export function getFormattedPrice(tier: keyof typeof BASE_PRICES, locale: Locale, currency?: string) {
  const activeCurrency = currency || getCurrencyForLocale(locale)
  const amount = getRegionalPrice(tier, activeCurrency)
  return formatCurrency(amount, activeCurrency, locale === 'en' ? 'en-US' : 'fr-FR')
}
