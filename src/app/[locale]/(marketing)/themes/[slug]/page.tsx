import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import JsonLd from '@/components/marketing/JsonLd';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { MysteryMoodboard } from '@/components/mysteries/MysteryMoodboard';
import {
  ACTIVE_MYSTERIES,
  getCanonicalActiveMysteryBySlugOrId,
} from '@/data/active-mysteries';
import { getCleanCharacterPresentation } from '@/utils/character-display';

export async function generateStaticParams() {
  const locales = ['en', 'fr'];
  const paramsList: { locale: string; slug: string }[] = [];
  for (const locale of locales) {
    for (const mystery of ACTIVE_MYSTERIES) {
      paramsList.push({ locale, slug: mystery.slug });
    }
  }
  return paramsList;
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await props.params;
  const mystery = getCanonicalActiveMysteryBySlugOrId(slug);

  if (!mystery) {
    return {
      title: 'Theme Not Found | Back Pocket Mysteries',
      robots: { index: false, follow: false },
    };
  }

  const title = `${mystery.title} - ${mystery.theme} Murder Mystery Party Game | Back Pocket Mysteries`;
  const description = `${mystery.shortDesc} Cast your real friends into 9 iconic roles, personalized with their names, avatars, and quirks in ~30 minutes.`;
  const ogImageUrl = `https://backpocketmysteries.com${mystery.coverUrl}`;

  return {
    title,
    description,
    keywords: [
      mystery.title,
      `${mystery.title} murder mystery`,
      'reality tv murder mystery party',
      'bachelorette murder mystery game',
      'hen party murder mystery kit',
      'girls night murder mystery',
      'custom murder mystery party',
      'personalized murder mystery dinner party',
    ],
    openGraph: {
      title,
      description,
      url: `https://backpocketmysteries.com/${locale}/themes/${mystery.slug}`,
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${mystery.title} - ${mystery.theme} Murder Mystery Party Promo Photo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `https://backpocketmysteries.com/${locale}/themes/${mystery.slug}`,
      languages: {
        en: `https://backpocketmysteries.com/en/themes/${mystery.slug}`,
        fr: `https://backpocketmysteries.com/fr/themes/${mystery.slug}`,
        'x-default': `https://backpocketmysteries.com/en/themes/${mystery.slug}`,
      },
    },
  };
}

function formatGenderBadge(gender: string | null | undefined): { label: string; colorClass: string } {
  const g = (gender || 'adaptable').toLowerCase();
  if (g === 'male' || g === 'masculine') {
    return { label: 'Masculine Role', colorClass: 'bg-sky-50 text-sky-600 border-sky-100' };
  }
  if (g === 'female' || g === 'feminine') {
    return { label: 'Feminine Role', colorClass: 'bg-pink-50 text-brand-pink border-pink-100' };
  }
  return { label: 'Adaptable (Any Gender)', colorClass: 'bg-purple-50 text-purple-600 border-purple-100' };
}

export default async function ThemeDetailPage(props: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await props.params;
  const dict = await getDictionary(locale as Locale);
  const mystery = getCanonicalActiveMysteryBySlugOrId(slug);

  if (!mystery) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-white text-brand-dark">
        <div className="text-center p-8 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-6">
            🕵️‍♀️
          </div>
          <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">Theme Not Available</h1>
          <p className="mb-8 font-bold text-gray-500">
            This mystery theme is not currently active. Browse our active themes below to start planning your party.
          </p>
          <Link
            href={`/${locale}/themes`}
            className="inline-block px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-colors shadow-lg"
          >
            Back to Active Themes
          </Link>
        </div>
      </div>
    );
  }

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
          {
            '@type': 'ListItem',
            position: 3,
            name: mystery.title,
            item: `https://backpocketmysteries.com/${locale}/themes/${mystery.slug}`,
          },
        ],
      },
      {
        '@type': 'Product',
        name: `${mystery.title} - ${mystery.theme} Custom Murder Mystery Party Kit`,
        description: mystery.description,
        image: mystery.moodboardPhotos.map((p) => `https://backpocketmysteries.com${p.url}`),
        brand: {
          '@type': 'Brand',
          name: 'Back Pocket Mysteries',
        },
        category: 'Murder Mystery Party Game',
        offers: {
          '@type': 'AggregateOffer',
          lowPrice: '15.00',
          highPrice: '25.00',
          priceCurrency: 'GBP',
          availability: 'https://schema.org/InStock',
          url: `https://backpocketmysteries.com/${locale}/themes/${mystery.slug}`,
        },
      },
      {
        '@type': 'Game',
        name: mystery.title,
        description: mystery.description,
        genre: mystery.theme,
        numberOfPlayers: {
          '@type': 'QuantitativeValue',
          minValue: mystery.min_players,
          maxValue: mystery.max_players,
        },
        characterAttribute: mystery.characters.map((c) => c.roleTitle),
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `Why don't the characters in ${mystery.title} have pre-set first names?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Because every role is named after your actual guests! Instead of playing a generic stranger, your friends are cast into iconic archetypes like The Star, The Ex, The Host, and The Superfan, and our engine weaves their real names, pronouns, avatars, and personal quirks directly into the character booklets and story.`,
            },
          },
          {
            '@type': 'Question',
            name: `Can the host play along in ${mystery.title} without spoilers?`,
            acceptedAnswer: {
              '@type': 'Answer',
              text: `Yes! The killer's identity is sealed until the final reveal round, so the host can take on a suspect role, sip cocktails, and solve the crime completely spoiler-free alongside their guests.`,
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="bg-slate-50/50 min-h-screen pb-24">
      <JsonLd data={structuredData} />

      <div className="container mx-auto px-6 pt-10 lg:pt-14 space-y-12">
        {/* Top Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
          <Link href={`/${locale}/themes`} className="hover:text-brand-pink transition-colors inline-flex items-center gap-1.5">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            {dict.common.themes}
          </Link>
          <span>/</span>
          <span className="text-slate-900">{mystery.title}</span>
        </nav>

        {/* Hero Section with Main Promo Photo */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left Promo Cover Photo */}
            <div className="lg:col-span-7 relative min-h-[340px] sm:min-h-[460px] bg-slate-900 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mystery.coverUrl}
                alt={`${mystery.title} - ${mystery.theme} Murder Mystery Party Promo Photo`}
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(24,8,28,0.86) 0%, rgba(254,4,198,0.14) 45%, transparent 100%)',
                }}
              />

              <div className="absolute top-6 left-6 right-6 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  <span
                    className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest text-white shadow-lg"
                    style={{ background: '#fe04c6' }}
                  >
                    💋 {mystery.theme} • XOXO
                  </span>
                  <span className="px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-black/65 text-white backdrop-blur-md">
                    {mystery.playersLabel}
                  </span>
                </div>
                <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50/95 text-emerald-700 border border-emerald-200 shadow-sm">
                  Ready in ~30 Mins
                </span>
              </div>

              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-black uppercase tracking-widest mb-2">
                  <span>★ ★ ★ ★ ★</span>
                  <span className="text-white/90">
                    Spotted: #1 Pick for Girls&apos; Night, Hens &amp; Birthdays
                  </span>
                </div>
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-none uppercase">
                  {mystery.title}
                </h1>
              </div>
            </div>

            {/* Right Build & Package Summary */}
            <div className="lg:col-span-5 p-8 sm:p-10 flex flex-col justify-between bg-white">
              <div>
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Full Custom Mystery Kit - Starting From
                    </p>
                    <PriceDisplay
                      tier="basic"
                      locale={locale as Locale}
                      mysteryId={mystery.id}
                      mysterySlug={mystery.slug}
                      mysteryTitle={mystery.title}
                      className="text-3xl font-black text-slate-900"
                    />
                  </div>
                  <span className="px-3.5 py-1.5 rounded-xl bg-pink-50 text-brand-pink text-[10px] font-black uppercase tracking-widest border border-pink-100">
                    {mystery.characters.length} Guest Roles
                  </span>
                </div>

                {/* 2x2 Specs Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Players
                    </p>
                    <p className="text-sm font-black text-slate-900">{mystery.playersLabel}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Difficulty
                    </p>
                    <p className="text-sm font-black text-slate-900 uppercase">{mystery.difficultyLabel}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Vibe / Spice
                    </p>
                    <p className="text-sm font-black text-slate-900 uppercase">{mystery.spice_level} 🔥</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                      Game Time
                    </p>
                    <p className="text-sm font-black text-slate-900">{mystery.gameTime}</p>
                  </div>
                </div>

                {/* Personalization Highlight */}
                <div
                  className="p-4 rounded-2xl mb-6 border"
                  style={{ background: 'rgba(254,4,198,0.04)', borderColor: 'rgba(254,4,198,0.15)' }}
                >
                  <p className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                    <span style={{ color: '#fe04c6' }}>✦</span> Your Group Chat, Main-Character Edition
                  </p>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    Characters don&apos;t have pre-set names, because they are named after <strong>your actual guests</strong>. Cast your friends as the bombshells, exes, and producers, and their real names, pronouns, avatars, and quirks drop straight into the story.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <Link
                  href={`/${locale}/mysteries/${mystery.slug}/cast`}
                  className="block w-full py-4 rounded-2xl font-black text-sm text-white text-center transition-all hover:opacity-95 shadow-lg active:scale-[0.99] uppercase tracking-wider"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  Cast Your Guests &amp; Build Kit →
                </Link>
                <Link
                  href={`/${locale}/pricing`}
                  className="block w-full py-3 rounded-2xl font-bold text-xs text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 text-center transition-colors"
                >
                  Compare Basic, Premium &amp; Grand Packages →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Promo Photos & Visual Mood Board */}
        <MysteryMoodboard
          photos={mystery.moodboardPhotos}
          mysteryTitle={mystery.title}
          theme={mystery.theme}
        />

        {/* Official Story Blurb + Perfect For + What's Included */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm">
            <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>
              📱 &ldquo;I&apos;ve Got A Text!&rdquo; • The Official Tea
            </p>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-5">
              Spotted at the Reunion...
            </h2>
            <div className="space-y-4 text-slate-600 font-medium leading-relaxed text-base">
              {mystery.description
                .split('\n')
                .filter(Boolean)
                .map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
            </div>

            {/* How Your Guests Fit In */}
            <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50">
                <p className="text-xs font-black text-slate-900 mb-1">1. Couple Up Your Cast</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Assign your friends to the {mystery.characters.length} iconic reality-TV roles below, from The Star to The Ex and The Superfan.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50">
                <p className="text-xs font-black text-slate-900 mb-1">2. Personalize Every Role</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Their real names, initials, pronouns, avatars, and real-life quirks are woven directly into the character booklets and story rounds.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50">
                <p className="text-xs font-black text-slate-900 mb-1">3. Main-Character Reveal</p>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  The killer is sealed until Round 4, so the host can sip martinis, stir the pot, and play completely spoiler-free.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Perfect For + What's Included */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                Perfect For
              </h3>
              <div className="flex flex-wrap gap-2">
                {mystery.occasions.map((occ) => (
                  <span
                    key={occ}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700"
                  >
                    {occ}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">
                What&apos;s Included in the Kit
              </h3>
              <ul className="space-y-3 text-xs font-bold text-slate-700">
                {mystery.whatIsIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shrink-0 mt-0.5"
                      style={{ background: '#fe04c6' }}
                    >
                      ✓
                    </span>
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Character Archetypes / Cast Roster Section (Role-Only, No Pre-Set Names) */}
        <section id="cast-roster" className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: '#fe04c6' }}>
                💋 Meet The Bombshells &amp; Villains ({mystery.characters.length} Roles)
              </p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                The Reunion Cast &amp; Dress Code
              </h2>
              <p className="text-sm text-slate-500 font-medium mt-1 max-w-2xl">
                Characters only use role titles here because <strong>each role takes the real name of the guest you assign to it</strong>. When you build your kit, their name, pronouns, avatar, and quirks are woven throughout their dossier.
              </p>
            </div>
            <span className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-100 text-xs font-black text-slate-600 shrink-0">
              🔒 100% Spoiler-Free Preview
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mystery.characters.map((char) => {
              const pres = getCleanCharacterPresentation(char, mystery.characters, { mode: 'generic' });
              const genderBadge = formatGenderBadge(char.gender);

              return (
                <div
                  key={char.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between transition-all hover:shadow-md ${
                    pres.isVictim
                      ? 'bg-pink-50/35 border-pink-200/80'
                      : 'bg-slate-50/60 border-slate-100 hover:bg-white'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Badges */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          pres.isVictim
                            ? 'bg-brand-pink text-white'
                            : 'bg-slate-900 text-white'
                        }`}
                      >
                        {pres.isVictim ? '💀 The Story Catalyst' : '🕵️ Playable Suspect'}
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${genderBadge.colorClass}`}
                      >
                        {genderBadge.label}
                      </span>
                    </div>

                    {/* Role Title Only (No pre-set character first name) */}
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {pres.roleTitle}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                        {char.vibeTag}
                      </p>
                    </div>

                    {/* Clean Character Blurb */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        📖 The Role Backstory
                      </p>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {char.profile_data.bio}
                      </p>

                      {pres.actBullets.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            🎭 How Your Guest Plays Them
                          </p>
                          <ul className="space-y-1">
                            {pres.actBullets.slice(0, 3).map((bullet, idx) => (
                              <li
                                key={idx}
                                className="text-[11px] text-slate-600 font-medium flex items-start gap-1.5 leading-snug"
                              >
                                <span className="text-brand-pink font-black">•</span>
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clean Wardrobe / Costume Box */}
                  <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200/70 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        👗 What to Wear (Outfit Vibe)
                      </p>
                    </div>

                    {pres.outfitVariants ? (
                      <div className="space-y-2 text-xs text-slate-600 font-medium leading-snug">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink mr-1.5">
                            ♀ Feminine:
                          </span>
                          <span>{pres.outfitVariants.feminine}</span>
                        </div>
                        <div className="pt-1.5 border-t border-slate-100">
                          <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 mr-1.5">
                            ♂ Masculine:
                          </span>
                          <span>{pres.outfitVariants.masculine}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {pres.outfitAdvice}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom CTA Block */}
        <div className="bg-brand-dark rounded-[3rem] p-10 sm:p-16 lg:p-20 text-center text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10 max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase tracking-[0.2em] mb-6 border border-brand-pink/30">
              Ready in ~30 Minutes
            </span>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-6 uppercase tracking-tight leading-none">
              Ready to Cast Your Friends in <br />
              <span className="text-brand-pink italic">{mystery.title}?</span>
            </h2>
            <p className="text-gray-300 text-base lg:text-lg mb-10 max-w-xl mx-auto font-medium">
              Add your guest list, assign them to the {mystery.characters.length} reunion roles above, weave in their real-life quirks, and launch your personalized mystery.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href={`/${locale}/mysteries/${mystery.slug}/cast`}
                className="inline-flex items-center justify-center gap-3 px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-2px]"
              >
                Cast Your Guests Now
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
              <Link
                href={`/${locale}/pricing`}
                className="inline-flex items-center justify-center px-10 py-5 bg-white/10 text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all border border-white/15"
              >
                View Pricing Brackets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
