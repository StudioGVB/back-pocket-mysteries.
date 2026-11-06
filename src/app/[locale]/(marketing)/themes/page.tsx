import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import JsonLd from '@/components/marketing/JsonLd';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { MysteryMoodboard } from '@/components/mysteries/MysteryMoodboard';
import { ACTIVE_MYSTERIES } from '@/data/active-mysteries';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const title = `Murder Mystery Party Themes & Storylines | Back Pocket Mysteries`;
  const description =
    'Explore our active, human-crafted murder mystery party themes. Cast your real friends into iconic roles — personalized with their names, avatars, and quirks in ~30 minutes.';

  return {
    title,
    description: dict.themes?.subtitle || description,
    keywords: [
      'murder mystery party themes',
      'custom murder mystery game',
      'reality tv murder mystery party',
      'love on the rocks murder mystery',
      'bachelorette murder mystery game',
      'hen party murder mystery kit',
      'personalized murder mystery dinner party',
      'printable murder mystery kit',
    ],
    openGraph: {
      title,
      description,
      url: `https://backpocketmysteries.com/${locale}/themes`,
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [
        {
          url: 'https://backpocketmysteries.com/moodboard/lotr/main-promo-murder.jpg',
          width: 1200,
          height: 630,
          alt: 'Love On The Rocks — Reality TV Reunion Murder Mystery Theme',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['https://backpocketmysteries.com/moodboard/lotr/main-promo-murder.jpg'],
    },
    alternates: {
      canonical: `https://backpocketmysteries.com/${locale}/themes`,
      languages: {
        en: 'https://backpocketmysteries.com/en/themes',
        fr: 'https://backpocketmysteries.com/fr/themes',
        'x-default': 'https://backpocketmysteries.com/en/themes',
      },
    },
  };
}

export default async function ThemesPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const activeMysteries = ACTIVE_MYSTERIES;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `https://backpocketmysteries.com/${locale}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: dict.common.themes,
            item: `https://backpocketmysteries.com/${locale}/themes`,
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Back Pocket Mysteries — Active Murder Mystery Party Themes',
        description:
          'Personalized murder mystery party kits built around your real guest list, names, relationships, and quirks.',
        numberOfItems: activeMysteries.length,
        itemListElement: activeMysteries.map((m, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          url: `https://backpocketmysteries.com/${locale}/themes/${m.slug}`,
          item: {
            '@type': 'Product',
            name: `${m.title} — ${m.theme} Murder Mystery Kit`,
            description: m.description,
            image: `https://backpocketmysteries.com${m.coverUrl}`,
            brand: {
              '@type': 'Brand',
              name: 'Back Pocket Mysteries',
            },
            offers: {
              '@type': 'AggregateOffer',
              lowPrice: '15.00',
              highPrice: '25.00',
              priceCurrency: 'GBP',
              availability: 'https://schema.org/InStock',
              url: `https://backpocketmysteries.com/${locale}/themes/${m.slug}`,
            },
          },
        })),
      },
    ],
  };

  return (
    <div className="bg-white">
      <JsonLd data={structuredData} />

      {/* Hero Header */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-16 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.themes.badge}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.9]">
              {dict.themes.title.split('.')[0]}. <br />
              <span className="text-brand-pink italic">{dict.themes.title.split('.')[1]}</span>.
            </h1>
            <p className="text-xl lg:text-2xl text-gray-500 leading-relaxed font-bold max-w-2xl border-l-4 border-brand-pink pl-6">
              {dict.themes.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Active Mystery Packages */}
      <div className="container mx-auto px-6 pb-24 lg:pb-32 space-y-20">
        {activeMysteries.map((mystery) => (
          <article
            key={mystery.slug}
            className="space-y-12"
            itemScope
            itemType="https://schema.org/Product"
          >
            {/* Main Featured Active Package Card */}
            <div className="card-branded p-6 sm:p-10 lg:p-14 border-2 border-gray-100 hover:border-brand-pink transition-all duration-500 shadow-xl">
              <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
                {/* Left: Promo Cover Image + Mini Moodboard Strip */}
                <div className="lg:col-span-7">
                  <Link
                    href={`/${locale}/themes/${mystery.slug}`}
                    className="group relative block w-full aspect-[16/10] bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl border-2 border-gray-100 group-hover:border-brand-pink transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mystery.coverUrl}
                      alt={`${mystery.title} — ${mystery.theme} Murder Mystery Party Promo Photo`}
                      itemProp="image"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          'linear-gradient(to top, rgba(24,8,28,0.88) 0%, rgba(254,4,198,0.14) 45%, rgba(0,0,0,0.2) 100%)',
                      }}
                    />

                    {/* Top Floating Badges */}
                    <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3.5 py-1.5 bg-brand-pink text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                          💋 {mystery.category} • Active Release
                        </span>
                        <span className="px-3.5 py-1.5 bg-emerald-50/95 backdrop-blur-sm border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-widest text-emerald-700">
                          Ready in ~30 Mins
                        </span>
                      </div>
                      <span className="px-3.5 py-1.5 bg-brand-dark/85 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-widest text-white">
                        {mystery.tone} 🔥
                      </span>
                    </div>

                    {/* Bottom Title + Moodboard Thumbnail Strip */}
                    <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-amber-400 text-[11px] font-black uppercase tracking-widest mb-1">
                          <span>★ ★ ★ ★ ★</span>
                          <span className="text-white/90">
                            #1 Pick for Girls&apos; Nights, Birthdays &amp; Hens
                          </span>
                        </div>
                        <h2
                          itemProp="name"
                          className="text-3xl sm:text-4xl lg:text-5xl font-black text-white uppercase tracking-tight leading-none"
                        >
                          {mystery.title}
                        </h2>
                      </div>

                      {mystery.moodboardPhotos.length > 0 && (
                        <div className="flex items-center gap-2.5 shrink-0">
                          <div className="flex items-center -space-x-2">
                            {mystery.moodboardPhotos.slice(0, 4).map((photo) => (
                              <div
                                key={photo.id}
                                className="w-9 h-9 rounded-xl overflow-hidden border-2 border-white shadow-md bg-slate-800"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={photo.url}
                                  alt={photo.caption || photo.tag || mystery.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                          <span className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                            📸 {mystery.moodboardPhotos.length} Promo Photos
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </div>

                {/* Right: Story Details, Specs & CTA */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <span className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-pink bg-brand-pink/10">
                        {mystery.category}
                      </span>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block">
                          From
                        </span>
                        <PriceDisplay
                          tier="basic"
                          locale={locale as Locale}
                          mysteryId={mystery.id}
                          mysterySlug={mystery.slug}
                          mysteryTitle={mystery.title}
                          className="text-2xl font-black text-brand-dark"
                        />
                      </div>
                    </div>

                    <Link href={`/${locale}/themes/${mystery.slug}`}>
                      <h3 className="text-3xl lg:text-4xl font-black text-brand-dark mb-4 uppercase tracking-tight hover:text-brand-pink transition-colors leading-[1.05]">
                        {mystery.title}
                      </h3>
                    </Link>

                    <p
                      itemProp="description"
                      className="text-gray-600 font-semibold text-sm sm:text-base mb-6 leading-relaxed"
                    >
                      {mystery.description}
                    </p>

                    {/* 2x2 Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Players
                        </p>
                        <p className="text-sm font-black text-brand-dark">
                          {mystery.playersLabel} ({mystery.characters.length} Roles)
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Difficulty
                        </p>
                        <p className="text-sm font-black text-brand-dark uppercase">
                          {mystery.difficultyLabel}
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Vibe / Spice
                        </p>
                        <p className="text-sm font-black text-brand-dark uppercase">
                          {mystery.spice_level} 🔥
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">
                          Game Time
                        </p>
                        <p className="text-sm font-black text-brand-dark">{mystery.gameTime}</p>
                      </div>
                    </div>

                    {/* Best For */}
                    <div className="bg-brand-gray rounded-2xl px-5 py-4 mb-6">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">
                        {dict.themes.bestFor}
                      </p>
                      <p className="text-sm font-black text-brand-dark">{mystery.bestFor}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                    <Link
                      href={`/${locale}/themes/${mystery.slug}`}
                      className="flex-1 px-6 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-lg text-center flex items-center justify-center gap-2"
                    >
                      Explore Full Theme &amp; Cast
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                    <Link
                      href={`/${locale}/mysteries/${mystery.slug}`}
                      className="px-6 py-4 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-pink transition-all text-center"
                    >
                      Cast Your Guests →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Preview of the 9 Guest-Named Roles */}
              <div className="mt-10 pt-8 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <p className="text-xs font-black uppercase tracking-widest text-brand-dark">
                    🎭 {mystery.characters.length} Iconic Archetypes — Named After Your Actual Guests
                  </p>
                  <p className="text-xs font-bold text-gray-400">
                    No pre-set character names — your friends play stylized versions of themselves
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {mystery.characters.map((char) => (
                    <Link
                      key={char.id}
                      href={`/${locale}/themes/${mystery.slug}#cast-roster`}
                      className={`px-4 py-2 rounded-full text-xs font-black tracking-wide border transition-colors ${
                        char.is_victim
                          ? 'bg-pink-50 border-pink-200 text-brand-pink hover:bg-brand-pink hover:text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-brand-pink hover:text-brand-pink'
                      }`}
                    >
                      {char.is_victim ? '💀 ' : '🕵️ '}
                      {char.roleTitle}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Promo Photos & Mood Board Gallery */}
            <MysteryMoodboard
              photos={mystery.moodboardPhotos}
              mysteryTitle={mystery.title}
              theme={mystery.theme}
            />
          </article>
        ))}

        {/* Custom theme / How It Works callout */}
        <div className="mt-20">
          <div className="bg-brand-gray rounded-[4rem] p-12 lg:p-20 text-center border-4 border-dashed border-gray-200 hover:border-brand-pink transition-colors group">
            <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] mb-6">
              {dict.themes.custom.badge}
            </p>
            <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tighter">
              {dict.themes.custom.title.split('built')[0]}{' '}
              <span className="text-brand-pink italic">
                built {dict.themes.custom.title.split('built')[1]}
              </span>
            </h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto mb-10 text-lg leading-relaxed">
              {dict.themes.custom.desc}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/${locale}/themes/love-on-the-rocks`}
                className="inline-flex items-center gap-4 px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-xl hover:translate-y-[-2px]"
              >
                Explore Love On The Rocks
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href={`/${locale}/how-it-works`}
                className="inline-flex items-center gap-4 px-10 py-5 bg-brand-dark text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-pink transition-all shadow-xl hover:translate-y-[-2px]"
              >
                {dict.themes.custom.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
