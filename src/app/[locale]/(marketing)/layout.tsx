// @ts-nocheck
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import LanguageSwitcher from '@/components/marketing/LanguageSwitcher';
import CurrencySwitcher from '@/components/marketing/CurrencySwitcher';
import { headers, cookies } from 'next/headers';
import { resolveCurrency } from '@/utils/localization';

export default async function MarketingLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const headersList = await headers();
  const cookiesList = await cookies();
  const countryCode = headersList.get('x-vercel-ip-country');
  const cookieCurrency = cookiesList.get('NEXT_CURRENCY')?.value;
  const currency = resolveCurrency(countryCode, cookieCurrency, locale as Locale);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 py-2">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="group flex items-center">
            <Image 
              src="/logo-horizontal.png" 
              alt="Back Pocket Mysteries" 
              width={240} 
              height={40} 
              className="h-10 w-auto object-contain group-hover:scale-105 transition-all duration-300 origin-left"
              priority
            />
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8 text-xs font-black uppercase tracking-[0.15em] text-brand-dark/60">
            <Link href={`/${locale}/how-it-works`} className="hover:text-brand-pink transition-all hover:scale-110">{dict.common.howItWorks}</Link>
            <Link href={`/${locale}/themes`} className="hover:text-brand-pink transition-all hover:scale-110">{dict.common.themes}</Link>
            <Link href={`/${locale}/pricing`} className="hover:text-brand-pink transition-all hover:scale-110">{dict.common.pricing}</Link>
            <Link href={`/${locale}/contact`} className="hover:text-brand-pink transition-all hover:scale-110">{dict.common.contact}</Link>
          </nav>
          
          <div className="flex gap-4 items-center">
            <div className="flex gap-2 items-center">
              <LanguageSwitcher currentLocale={locale as Locale} />
              <CurrencySwitcher currentCurrency={currency} />
            </div>

            <Link href={`/${locale}/login`} className="text-xs font-black uppercase tracking-widest text-brand-dark/60 hover:text-brand-pink px-4 py-2 transition-colors">
              {dict.common.login}
            </Link>
            <Link href={`/${locale}/coming-soon`} className="px-8 py-4 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-dark transition-all duration-300 shadow-xl shadow-brand-pink/10 hover:shadow-brand-pink/20 hover:translate-y-[-2px] active:scale-95">
              Coming Soon
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">{props.children}</main>
      
      <footer className="bg-brand-dark text-white py-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
            <div className="col-span-1 md:col-span-1 lg:col-span-1">
              <Link href={`/${locale}`} className="flex items-center mb-8 hover:opacity-90 transition-opacity">
                <Image 
                  src="/logo-horizontal-white.png" 
                  alt="Back Pocket Mysteries" 
                  width={200} 
                  height={40} 
                  className="h-10 w-auto object-contain"
                />
              </Link>
              <p className="text-gray-400 leading-relaxed mb-8 font-medium">
                {dict.common.footer.desc}
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">{dict.common.product}</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link href={`/${locale}/themes`} className="hover:text-brand-pink transition-colors">{dict.common.themes}</Link></li>
                <li><Link href={`/${locale}/how-it-works`} className="hover:text-brand-pink transition-colors">{dict.common.howItWorks}</Link></li>
                <li><Link href={`/${locale}/pricing`} className="hover:text-brand-pink transition-colors">{dict.common.pricing}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">{dict.common.company}</h4>
              <ul className="space-y-4 text-sm font-bold text-gray-400">
                <li><Link href={`/${locale}/blog`} className="hover:text-brand-pink transition-colors">{dict.common.blog}</Link></li>
                <li><Link href={`/${locale}/about`} className="hover:text-brand-pink transition-colors">{dict.common.aboutUs}</Link></li>
                <li><Link href={`/${locale}/faq`} className="hover:text-brand-pink transition-colors">{dict.common.faq}</Link></li>
                <li><Link href={`/${locale}/contact`} className="hover:text-brand-pink transition-colors">{dict.common.contact}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-white mb-8 uppercase tracking-[0.2em] text-[10px]">{dict.common.newsletter.title}</h4>
              <p className="text-sm text-gray-400 mb-6 font-medium">{dict.common.newsletter.desc}</p>
              <div className="flex gap-2">
                <input type="email" placeholder={dict.common.newsletter.placeholder} className="bg-white/5 border border-white/10 rounded-full px-4 py-3 text-sm focus:outline-none focus:border-brand-pink w-full" />
                <button className="bg-brand-pink p-3 rounded-full hover:bg-white hover:text-brand-pink transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-8 text-[11px] font-black uppercase tracking-widest text-gray-500">
            <p>&copy; {new Date().getFullYear()} {dict.common.footer.rights}</p>
            <div className="flex gap-8 items-center">
              <a href="#" className="hover:text-brand-pink transition-colors">Twitter</a>
              <a href="#" className="hover:text-brand-pink transition-colors">Instagram</a>
              <a href="#" className="hover:text-brand-pink transition-colors">LinkedIn</a>
              <span className="w-1 h-1 rounded-full bg-white/10 hidden md:block"></span>
              <Link href={`/${locale}/admin`} className="text-white/20 hover:text-white transition-colors lowercase font-medium">{dict.common.footer.admin}</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
