'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Locale } from '@/lib/i18n-config';
import CurrencySwitcher from '@/components/marketing/CurrencySwitcher';

interface MobileNavProps {
  locale: Locale;
  dict: any;
}

export default function MobileNav({ locale, dict }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background page scroll when menu is open
  useEffect(() => {
    if (!mounted) return;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, mounted]);

  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen((prev) => !prev);

  const mobileOverlay =
    isOpen && mounted
      ? createPortal(
          <div
            className="lg:hidden fixed inset-0 z-[250] bg-brand-dark text-white flex flex-col overflow-y-auto animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
          >
            {/* Top Bar inside Drawer: Logo + Close Button */}
            <div className="px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <Link href={`/${locale}`} onClick={closeMenu} className="flex items-center">
                <Image
                  src="/logo-horizontal-white.png"
                  alt="Back Pocket Mysteries"
                  width={200}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
              </Link>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Scrollable Navigation Links */}
            <div className="flex flex-col justify-between flex-1 p-6 sm:p-8 pb-12">
              <nav className="flex flex-col gap-5 text-xl sm:text-2xl font-black uppercase tracking-[0.08em] text-white mt-2">
                <Link
                  href={`/${locale}/how-it-works`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  {dict.common.howItWorks}
                </Link>
                <Link
                  href={`/${locale}/themes`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  {dict.common.themes}
                </Link>
                <Link
                  href={`/${locale}/pricing`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  {dict.common.pricing}
                </Link>
                <Link
                  href={`/${locale}/blog`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  Blog &amp; Guides
                </Link>
                <Link
                  href={`/${locale}/faq`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  {dict.common.faq}
                </Link>
                <Link
                  href={`/${locale}/contact`}
                  onClick={closeMenu}
                  className="py-1.5 hover:text-brand-pink transition-all w-fit"
                >
                  {dict.common.contact}
                </Link>
                <Link
                  href={`/${locale}/free-murder-mystery-game`}
                  onClick={closeMenu}
                  className="mt-1 inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-brand-pink/15 border border-brand-pink/40 text-brand-pink hover:bg-brand-pink hover:text-white transition-all text-base sm:text-lg w-fit"
                >
                  <span>🎁 Free Mystery Giveaway</span>
                </Link>
              </nav>

              <div className="mt-10 border-t border-white/10 pt-8 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                    Currency
                  </span>
                  <CurrencySwitcher />
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    href={`/${locale}/login`}
                    onClick={closeMenu}
                    className="w-full py-4 rounded-full border border-white/20 text-center text-xs font-black uppercase tracking-widest text-white hover:border-brand-pink hover:text-brand-pink transition-colors"
                  >
                    {dict.common.login}
                  </Link>
                  <Link
                    href={`/${locale}/login`}
                    onClick={closeMenu}
                    className="w-full py-4 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest text-center hover:bg-white hover:text-brand-dark transition-colors shadow-2xl"
                  >
                    {dict.common.getStarted}
                  </Link>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="lg:hidden flex items-center">
      <button
        type="button"
        onClick={toggleMenu}
        className="p-2.5 ml-2 rounded-xl text-brand-dark hover:bg-gray-100 focus:outline-none cursor-pointer transition-colors"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {mobileOverlay}
    </div>
  );
}
