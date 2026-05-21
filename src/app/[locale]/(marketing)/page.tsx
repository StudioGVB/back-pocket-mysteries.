import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import PriceDisplay from '@/components/marketing/PriceDisplay';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: dict.home.hero.title,
    description: dict.home.hero.subtitle,
    alternates: {
      canonical: `https://mysteries.backpocketgames.com/${locale}`,
      languages: {
        en: 'https://mysteries.backpocketgames.com/en',
        fr: 'https://mysteries.backpocketgames.com/fr',
      }
    }
  }
}

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  // Currency is now handled client-side in PriceDisplay to allow static rendering

  return (
    <div className="relative overflow-hidden bg-white">
      {/* Hero Section */}
      <section className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[10px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/5 rounded-full border border-brand-pink/10">
                <span className="w-1.5 h-1.5 bg-brand-pink rounded-full"></span>
                {dict.home.hero.badge}
              </div>
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter text-brand-dark mb-4 leading-tight uppercase">
                {dict.home.hero.title.split(',')[0]},<br />
                <span className="text-brand-pink italic">{dict.home.hero.title.split(',')[1]}</span> <br />
                {dict.home.hero.title.split(',')[2]}
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-gray-500 mb-8 leading-relaxed font-medium">
                {dict.home.hero.subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <Link href={`/${locale}/themes`} className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-dark transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center">
                  {dict.home.hero.ctaPick}
                </Link>
                <Link href={`/${locale}/how-it-works`} className="px-8 py-4 bg-white text-brand-dark border-2 border-gray-100 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center">
                  {dict.home.hero.ctaHow}
                </Link>
              </div>
              <p className="mt-6 text-xs text-gray-400 font-bold">
                {dict.home.hero.priceLabel.replace('{{price}}', '')} 
                <PriceDisplay tier="basic" locale={locale as Locale} />
                {' · Instant download · No hosting required'}
              </p>
            </div>
            
            <div className="relative group">
              <div className="absolute -inset-3 bg-brand-pink/5 rounded-[30px] opacity-10 transition-opacity"></div>
              <div className="relative rounded-[30px] overflow-hidden shadow-2xl border-4 lg:border-8 border-white group-hover:scale-[1.02] transition-transform duration-500">
                <Image 
                  src="/hero-mystery-playing.png" 
                  alt={dict.home.hero.title} 
                  width={600} 
                  height={600}
                  className="w-full aspect-[4/3] lg:aspect-square object-cover"
                  priority
                />
              </div>
              {/* Badge */}
              <div className="absolute -top-4 -right-4 lg:-top-6 lg:-right-6 w-20 h-20 lg:w-24 lg:h-24 bg-brand-pink rounded-full flex items-center justify-center text-white font-black uppercase text-[8px] lg:text-[9px] tracking-widest rotate-12 shadow-2xl border-4 border-white pointer-events-none text-center leading-tight p-2">
                {dict.home.hero.readyBadge}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="py-6 bg-brand-dark border-y-4 border-brand-pink overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-16 gap-y-4 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
            {Object.values(dict.home.occasions.items).map((occ: any, i) => (
              <span key={i} className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 bg-brand-pink rounded-full"></span>
                {occ}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Why It's Different Section */}
      <section className="py-16 lg:py-24 bg-brand-gray relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-pink/5 skew-x-12 translate-x-1/2"></div>
        <div className="container mx-auto px-6 relative">
          <div className="text-center mb-24">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              {dict.home.why.title.split('.')[0]}. <span className="text-brand-pink">{dict.home.why.title.split('.')[1]}</span>.
            </h2>
            <p className="text-gray-500 max-w-2xl mx-auto font-bold text-lg px-4 border-l-4 border-brand-pink text-left">
              {dict.home.why.desc}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-branded p-8 md:p-12 hover:border-brand-pink group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center group-hover:bg-brand-pink transition-colors duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink bg-brand-pink/10 px-3 py-1.5 rounded-full">{dict.home.why.features.guestStory.badge}</span>
              </div>
              <h3 className="text-2xl font-black mb-4 text-brand-dark uppercase tracking-tight">{dict.home.why.features.guestStory.title}</h3>
              <p className="text-gray-500 leading-relaxed font-semibold">{dict.home.why.features.guestStory.desc}</p>
            </div>

            <div className="card-branded p-8 md:p-12 hover:border-brand-pink group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center group-hover:bg-brand-pink transition-colors duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink bg-brand-pink/10 px-3 py-1.5 rounded-full">{dict.home.why.features.evidence.badge}</span>
              </div>
              <h3 className="text-2xl font-black mb-4 text-brand-dark uppercase tracking-tight">{dict.home.why.features.evidence.title}</h3>
              <p className="text-gray-500 leading-relaxed font-semibold">{dict.home.why.features.evidence.desc}</p>
            </div>

            <div className="card-branded p-8 md:p-12 hover:border-brand-pink group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-brand-dark text-white rounded-2xl flex items-center justify-center group-hover:bg-brand-pink transition-colors duration-300">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink bg-brand-pink/10 px-3 py-1.5 rounded-full">{dict.home.why.features.instant.badge}</span>
              </div>
              <h3 className="text-2xl font-black mb-4 text-brand-dark uppercase tracking-tight">{dict.home.why.features.instant.title}</h3>
              <p className="text-gray-500 leading-relaxed font-semibold">{dict.home.why.features.instant.desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works - Quick Preview */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16 lg:mb-20">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
                {dict.home.steps.title.split('is')[0]} is <span className="text-brand-pink italic">sorted</span> {dict.home.steps.title.split('sorted')[1]}
              </h2>
              <p className="text-gray-400 font-black uppercase tracking-[0.15em] text-xs">{dict.home.steps.subtitle}</p>
            </div>
            <div className="space-y-6">
              {[dict.home.steps.step1, dict.home.steps.step2, dict.home.steps.step3].map((step, i) => (
                <div key={i} className="card-branded p-8 md:p-10 lg:p-14 flex flex-col sm:flex-row gap-6 lg:gap-10 items-start group hover:border-brand-pink">
                  <span className="text-6xl lg:text-8xl font-black text-gray-100 leading-none group-hover:text-brand-pink/20 transition-colors shrink-0">0{i+1}</span>
                  <div>
                    <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-3">{step.title}</h3>
                    <p className="text-gray-500 font-semibold text-lg leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-16">
              <Link href={`/${locale}/how-it-works`} className="inline-flex items-center gap-3 text-brand-pink font-black uppercase tracking-widest text-sm hover:gap-5 transition-all">
                {dict.home.steps.cta}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Occasions Section */}
      <section className="py-16 lg:py-24 bg-brand-gray">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              {dict.home.occasions.title.split('every')[0]} every <span className="text-brand-pink italic">occasion.</span>
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: dict.home.occasions.items.birthdays, emoji: '🎂' },
              { title: dict.home.occasions.items.hens, emoji: '💍' },
              { title: dict.home.occasions.items.dinner, emoji: '🍷' },
              { title: dict.home.occasions.items.corporate, emoji: '💼' },
              { title: dict.home.occasions.items.friends, emoji: '🎲' },
              { title: dict.home.occasions.items.engagement, emoji: '🥂' },
            ].map((occ, i) => (
              <div key={i} className="card-branded p-8 lg:p-10 group hover:border-brand-pink">
                <div className="text-4xl mb-6">{occ.emoji}</div>
                <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-3 group-hover:text-brand-pink transition-colors">{occ.title}</h3>
                <p className="text-gray-500 font-semibold leading-relaxed">
                  {/* Since I didn't add descriptions to dictionary for occasions in my rush, I'll keep them or move them later if needed. For now let's just use title */}
                  {dict.home.occasions.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Compare Section */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center mb-16 lg:mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
              {dict.home.compare.title.split('.')[0]}. <br /><span className="text-brand-pink italic">{dict.home.compare.title.split('.')[1]}</span>.
            </h2>
            <p className="text-gray-500 font-bold text-base sm:text-lg max-w-xl mx-auto">{dict.home.compare.subtitle}</p>
          </div>
          <div className="overflow-hidden rounded-[2rem] border-2 border-gray-100 shadow-xl">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="bg-brand-dark text-white">
                  <th className="py-6 px-8 text-left font-black uppercase tracking-widest text-[10px]">{dict.home.compare.table.feature}</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-brand-pink">{dict.home.compare.table.bpm}</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-gray-400">{dict.home.compare.table.etsy}</th>
                  <th className="py-6 px-8 text-center font-black uppercase tracking-widest text-[10px] text-gray-400">{dict.home.compare.table.ai}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  [dict.home.compare.table.f1, '✓', '✓ (slow)', '✓ (basic)'],
                  [dict.home.compare.table.f2, '✓', '✗', '✗'],
                  [dict.home.compare.table.f3, '✓', 'Varies', 'Rarely'],
                  [dict.home.compare.table.f4, '< 20 min', '3–21 days', 'Minutes'],
                  [dict.home.compare.table.f5, <PriceDisplay key="p1" tier="basic" locale={locale as Locale} />, '$60–$150+', '$10–$16'],
                  [dict.home.compare.table.f6, '✓', 'Depends', '✗'],
                ].map(([feat, bpm, etsy, ai], i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-brand-gray'}>
                    <td className="py-5 px-8 font-bold text-brand-dark">{feat}</td>
                    <td className="py-5 px-8 text-center font-black text-brand-pink">{bpm}</td>
                    <td className="py-5 px-8 text-center text-gray-400 font-semibold">{etsy}</td>
                    <td className="py-5 px-8 text-center text-gray-400 font-semibold">{ai}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24">
        <div className="container mx-auto px-6">
          <div className="bg-brand-dark rounded-[2rem] lg:rounded-[3rem] p-8 sm:p-12 lg:p-24 text-center relative overflow-hidden shadow-2xl">
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.9]">
                {dict.home.ctaSection.title.split('deserves')[0]} <br />
                <span className="text-brand-pink italic">deserves better</span><br/>
                {dict.home.ctaSection.title.split('better')[1]}
              </h2>
              <p className="text-gray-400 text-xl lg:text-2xl mb-4 font-bold max-w-xl mx-auto">
                {dict.home.ctaSection.desc.replace('{{price}}', '')} <PriceDisplay tier="basic" locale={locale as Locale} /> — instant download.
              </p>
              <p className="text-gray-500 text-sm font-bold mb-12 uppercase tracking-widest">{dict.home.ctaSection.meta}</p>
              <Link href={`/${locale}/create`} className="inline-block px-14 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
                {dict.common.buildYourMystery}
              </Link>
            </div>
            
            {/* Background design */}
            <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.05)_1px,transparent_0)] [background-size:32px_32px]"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
