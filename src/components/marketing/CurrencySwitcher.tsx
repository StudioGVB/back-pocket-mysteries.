'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export const AVAILABLE_CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'GBP', symbol: '£', label: 'GBP' },
  { code: 'AUD', symbol: 'A$', label: 'AUD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'CAD', symbol: 'C$', label: 'CAD' },
]

export default function CurrencySwitcher({ currentCurrency }: { currentCurrency: string }) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const switchCurrency = (currencyCode: string) => {
    setIsOpen(false)
    if (currencyCode === currentCurrency) return

    // Persist the user's explicit choice in a cookie
    document.cookie = `NEXT_CURRENCY=${currencyCode}; path=/; max-age=31536000; SameSite=Lax`

    // Refresh the page so server components re-render with new cookie
    router.refresh()
  }

  const activeCurrency = AVAILABLE_CURRENCIES.find(c => c.code === currentCurrency) || AVAILABLE_CURRENCIES[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all bg-gray-50 border-gray-100 hover:border-gray-300 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
      >
        <span>{activeCurrency.symbol}</span>
        <span>{activeCurrency.code}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full right-0 mt-2 w-32 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="py-1">
            {AVAILABLE_CURRENCIES.map((currency) => (
              <button
                key={currency.code}
                role="option"
                aria-selected={currentCurrency === currency.code}
                onClick={() => switchCurrency(currency.code)}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-brand-gray transition-colors ${
                  currentCurrency === currency.code ? 'text-brand-pink' : 'text-brand-dark'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold w-4 text-left">{currency.symbol}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {currency.label}
                  </span>
                </div>
                {currentCurrency === currency.code && (
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-pink"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
