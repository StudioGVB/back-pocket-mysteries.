import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import JsonLd from '@/components/marketing/JsonLd';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale);
  
  return {
    title: `${dict.common.themes} | Back Pocket Mysteries`,
    description: dict.themes.subtitle,
  }
}

export default async function ThemesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale);

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Back Pocket Mysteries - Personalised Packs",
    "description": "AI-Personalised murder mystery packs built for your specific guest list.",
    "brand": {
      "@type": "Brand",
      "name": "Back Pocket Mysteries"
    },
    "offers": {
      "@type": "Offer",
      "price": "19.00",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  };

  const themes = [
    {
      ...dict.themes.list.loveOnTheRocks,
      players: '6-12',
      slug: 'love-on-the-rocks',
      accent: 'text-brand-pink bg-brand-pink/10',
    },
    {
      ...dict.themes.list.inheritance,
      players: '6-10',
      slug: 'the-inheritance',
      accent: 'text-amber-500 bg-amber-500/10',
    },
    {
      ...dict.themes.list.galaHeist,
      players: '8-14',
      slug: 'the-gala-heist',
      accent: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      ...dict.themes.list.deadSpace,
      players: '10-16',
      slug: 'dead-space',
      accent: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      ...dict.themes.list.speakeasy,
      players: '8-14',
      slug: 'speakeasy-scandal',
      accent: 'text-orange-500 bg-orange-500/10',
    },
    {
      ...dict.themes.list.offTheGrid,
      players: '6-12',
      slug: 'off-the-grid',
      accent: 'text-teal-500 bg-teal-500/10',
    }
  ];

  return (
    <div className="py-24 lg:py-40 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mb-24">
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
            {dict.themes.badge}
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-brand-dark mb-10 tracking-tighter uppercase leading-[0.9]">
            {dict.themes.title.split('.')[0]}. <br />
            <span className="text-brand-pink italic">{dict.themes.title.split('.')[1]}</span>.
          </h1>
          <p className="text-xl lg:text-2xl text-gray-500 leading-relaxed font-bold max-w-2xl border-l-4 border-brand-pink pl-6">
            {dict.themes.subtitle}
          </p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-12">
          {themes.map((theme, i) => (
            <Link 
              key={i} 
              href={`/${locale}/themes/${theme.slug}`} 
              className="group card-branded p-10 lg:p-12 flex flex-col gap-6"
            >
              {/* Theme image placeholder */}
              <div className="w-full aspect-video bg-brand-gray rounded-[24px] flex items-center justify-center shadow-inner overflow-hidden border-2 border-gray-100 group-hover:border-brand-pink transition-colors relative">
                <div className="w-16 h-16 bg-brand-dark rounded-full flex items-center justify-center text-white font-black text-xs uppercase tracking-widest group-hover:rotate-12 transition-transform duration-500">
                  Art
                </div>
                <div className="absolute top-4 right-4 px-3 py-1.5 bg-brand-dark/80 backdrop-blur-sm rounded-full">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{theme.tone}</span>
                </div>
              </div>
              
              <div className="flex flex-col flex-grow">
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${theme.accent}`}>
                    {theme.category}
                  </span>
                  <span className="px-4 py-1.5 bg-gray-100 text-gray-400 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {theme.difficulty}
                  </span>
                </div>
                <h3 className="text-3xl lg:text-4xl font-black text-brand-dark mb-4 uppercase tracking-tight group-hover:text-brand-pink transition-colors leading-[1.1]">
                  {theme.title}
                </h3>
                <p className="text-gray-500 font-bold text-base mb-6 leading-snug flex-grow">
                  {theme.desc}
                </p>
                
                <div className="bg-brand-gray rounded-2xl px-5 py-4 mb-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">{dict.themes.bestFor}</p>
                  <p className="text-sm font-black text-brand-dark">{theme.bestFor}</p>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                  <span className="text-gray-400 text-[11px] font-black uppercase tracking-[0.15em]">
                    {dict.themes.guests.replace('{{count}}', theme.players)}
                  </span>
                  <div className="flex items-center gap-2 text-brand-pink font-black text-xs uppercase tracking-widest group-hover:gap-4 transition-all">
                    {dict.themes.viewTheme}
                    <div className="w-10 h-10 rounded-full bg-brand-dark text-white flex items-center justify-center group-hover:bg-brand-pink transition-all group-hover:translate-x-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        {/* Custom theme callout */}
        <div className="mt-32">
          <div className="bg-brand-gray rounded-[4rem] p-16 lg:p-24 text-center border-4 border-dashed border-gray-200 hover:border-brand-pink transition-colors group">
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6">{dict.themes.custom.badge}</p>
            <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tighter">
              {dict.themes.custom.title.split('built')[0]} <span className="text-brand-pink italic">built {dict.themes.custom.title.split('built')[1]}</span>
            </h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto mb-12 text-lg leading-relaxed">
              {dict.themes.custom.desc}
            </p>
            <Link href={`/${locale}/how-it-works`} className="inline-flex items-center gap-4 px-12 py-6 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95">
              {dict.themes.custom.cta}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
