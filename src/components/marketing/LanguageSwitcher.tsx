'use client'

import React, { useState, useRef, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { i18n, Locale } from '@/lib/i18n-config'

export default function LanguageSwitcher({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const languages: Record<Locale, { name: string; flag: string; code: string }> = {
    en: { name: 'English', flag: '🇬🇧', code: 'EN' },
    fr: { name: 'Français', flag: '🇫🇷', code: 'FR' },
  }

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

  const switchLocale = (locale: Locale) => {
    setIsOpen(false)
    if (locale === currentLocale) return

    // Persist the user's explicit choice in a cookie
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`

    // Navigate to the same page in the new locale
    const segments = (pathname || '/').split('/')
    segments[1] = locale
    router.push(segments.join('/'))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all bg-gray-50 border-gray-100 hover:border-gray-300 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500"
      >
        <span>{languages[currentLocale].flag}</span>
        <span>{languages[currentLocale].code}</span>
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
            {i18n.locales.map((locale) => (
              <button
                key={locale}
                role="option"
                aria-selected={currentLocale === locale}
                onClick={() => switchLocale(locale as Locale)}
                className={`w-full flex items-center justify-between px-4 py-2.5 hover:bg-brand-gray transition-colors ${
                  currentLocale === locale ? 'text-brand-pink' : 'text-brand-dark'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs">{languages[locale as Locale].flag}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {languages[locale as Locale].name}
                  </span>
                </div>
                {currentLocale === locale && (
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
