'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/i18n-config';
import LanguageSwitcher from '@/components/marketing/LanguageSwitcher';
import CurrencySwitcher from '@/components/marketing/CurrencySwitcher';

interface MobileNavProps {
  locale: Locale;
  dict: any;
}

export default function MobileNav({ locale, dict }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="lg:hidden flex items-center">
      <button 
        onClick={toggleMenu}
        className="p-2 ml-2 text-brand-dark focus:outline-none"
        aria-label="Toggle menu"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Full screen overlay menu */}
      {isOpen && (
        <div className="fixed inset-0 top-[64px] z-40 bg-brand-dark overflow-y-auto animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex flex-col h-full p-8 pb-32">
            
            <nav className="flex flex-col gap-8 text-2xl font-black uppercase tracking-[0.1em] text-white mt-10">
              <Link href={`/${locale}/how-it-works`} className="hover:text-brand-pink transition-all w-fit">
                {dict.common.howItWorks}
              </Link>
              <Link href={`/${locale}/themes`} className="hover:text-brand-pink transition-all w-fit">
                {dict.common.themes}
              </Link>
              <Link href={`/${locale}/pricing`} className="hover:text-brand-pink transition-all w-fit">
                {dict.common.pricing}
              </Link>
              <Link href={`/${locale}/contact`} className="hover:text-brand-pink transition-all w-fit">
                {dict.common.contact}
              </Link>
            </nav>

            <div className="mt-16 border-t border-white/10 pt-10 flex flex-col gap-8">
              <div className="flex gap-4 items-center">
                <LanguageSwitcher currentLocale={locale as Locale} />
                <CurrencySwitcher />
              </div>

              <div className="flex flex-col gap-6 items-start">
                <Link href={`/${locale}/login`} className="text-lg font-black uppercase tracking-widest text-white/80 hover:text-brand-pink transition-colors">
                  {dict.common.login}
                </Link>
                <Link href={`/${locale}/coming-soon`} className="px-10 py-5 bg-brand-pink text-white rounded-full text-sm font-black uppercase tracking-widest w-full text-center hover:bg-white hover:text-brand-dark transition-colors shadow-2xl">
                  Coming Soon
                </Link>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
