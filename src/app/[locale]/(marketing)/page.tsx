import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import HeroImageCarousel from '@/components/marketing/HeroImageCarousel';
import LightsOut from '@/components/marketing/LightsOut';
import InteractivePackPreview from '@/components/marketing/InteractivePackPreview';
import HowItWorksVideoShowcase from '@/components/marketing/HowItWorksVideoShowcase';
import { getPublicMarketingMysteries } from '@/services/mysteries';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: 'Custom Murder Mystery Party Games for Adults (100% Online & Personalised) | Back Pocket Mysteries',
    description:
      'Host a custom murder mystery party built around your actual friends. Personalised character dossiers, inside jokes, CCTV & text evidence, and voice-acted audio clues ready in ~20 minutes for 4–16 players.',
    keywords: [
      'murder mystery party game',
      'custom murder mystery game',
      'murder mystery dinner party games for adults',
      'online murder mystery party game',
      'hen party murder mystery game',
      'bachelorette murder mystery party',
      'birthday murder mystery party',
      'small group murder mystery game 4 to 8 players',
      'personalized murder mystery kit',
    ],
    alternates: {
      canonical: `https://backpocketmysteries.com/en`,
    },
    openGraph: {
      title: 'Custom Murder Mystery Party Games for Adults | Back Pocket Mysteries',
      description: dict.home.hero.subtitle,
      url: 'https://backpocketmysteries.com/en',
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [{ url: '/og-image.png' }],
    },
  }
}

export default async function HomePage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  const publicMysteries = await getPublicMarketingMysteries();
  const featuredMystery = publicMysteries[0];

  const homeStructuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Back Pocket Custom Murder Mystery Party Game Pack',
      description:
        'Personalised murder mystery dinner party kit for 4 to 16 players, tailored to your real friends with custom digital character dossiers, crime scene evidence, and interactive audio briefings.',
      brand: {
        '@type': 'Brand',
        name: 'Back Pocket Mysteries',
      },
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'GBP',
        lowPrice: '15.00',
        highPrice: '25.00',
        offerCount: '3',
        availability: 'https://schema.org/InStock',
      },
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        reviewCount: '48',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does a custom murder mystery party game work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'You pick a published theme (like Christmas Nightmare), enter your guests’ names, traits, and inside jokes, and our AI story engine generates custom character booklets, alibis, crime scene clues, and an interactive Playroom in ~20 minutes.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can the host play without knowing who the killer is?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! Every Back Pocket Mystery includes Spoiler-Free Host Mode so the host can play as a full suspect and guess the murderer right alongside their guests.',
          },
        },
        {
          '@type': 'Question',
          name: 'How many players can play a Back Pocket Murder Mystery? What if we have more than 6 guests?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Our mysteries include 6 to 16 core character roles (Basic, Premium, and Grand), PLUS unlimited Extra Guest Detectives at $0 extra cost! Any extra friends or last-minute plus-ones simply scan the party QR code on their phone to join as "Detective [Their Name]" with an official Detective Briefing, suspect interrogation prompts, live clues, and round voting.',
          },
        },
      ],
    },
  ];

  return (
    <div className="relative overflow-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(homeStructuredData) }}
      />
      <main className="flex-grow">
      <LightsOut />
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
                {' · Ready in ~20 mins · Unlimited Extra Guest Detectives included'}
              </p>
            </div>
            
            <div className="relative group perspective-1000">
              <div className="absolute -inset-3 bg-brand-pink/5 rounded-[30px] opacity-10 transition-opacity"></div>
              <div className="relative w-full aspect-[4/3] lg:aspect-square group-hover:scale-[1.02] transition-transform duration-500 flex items-center justify-center p-4 lg:p-8">
                <HeroImageCarousel alt={dict.home.hero.title} />
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
                {occ.title}
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

      {/* Featured Active Mystery Spotlight */}
      {featuredMystery && (
        <section className="py-16 lg:py-24 bg-white border-b border-gray-100">
          <div className="container mx-auto px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 text-[10px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse" />
                  Featured Active Package
                </div>
                <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark uppercase tracking-tight leading-none">
                  Now Playing: <span className="text-brand-pink italic">{featuredMystery.title}</span>
                </h2>
              </div>
              <Link
                href={`/${locale}/themes/${featuredMystery.slug}`}
                className="text-xs font-black uppercase tracking-widest text-brand-pink hover:text-brand-dark transition-colors inline-flex items-center gap-2"
              >
                View Full Cast & Promo Photos →
              </Link>
            </div>

            <div className="rounded-[2.5rem] bg-brand-dark text-white overflow-hidden shadow-2xl border-4 border-gray-100 grid lg:grid-cols-12">
              <div className="lg:col-span-6 relative min-h-[340px] lg:min-h-[480px] overflow-hidden group">
                <Image
                  src={featuredMystery.coverUrl}
                  alt={`${featuredMystery.title} - ${featuredMystery.category}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 600px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/20 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-brand-dark/90" />
                <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {featuredMystery.category}
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                    {featuredMystery.playersLabel} (+ Extra Detectives)
                  </span>
                </div>
                <div className="absolute bottom-6 left-6 right-6 grid grid-cols-3 gap-3">
                  {featuredMystery.moodboardPhotos.slice(1, 4).map((photo, idx) => (
                    <div key={photo.id || idx} className="relative aspect-[16/10] rounded-xl overflow-hidden border border-white/20 shadow-lg">
                      <Image
                        src={photo.url}
                        alt={photo.caption || featuredMystery.title}
                        fill
                        sizes="180px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center">
                <p className="text-brand-pink font-black uppercase tracking-[0.2em] text-xs mb-3">
                  {featuredMystery.theme} • {featuredMystery.tone}
                </p>
                <h3 className="text-3xl sm:text-4xl font-black uppercase tracking-tight mb-4 leading-tight">
                  {featuredMystery.title}
                </h3>
                <p className="text-gray-300 font-medium leading-relaxed mb-6">
                  {featuredMystery.shortDesc}
                </p>

                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">
                    {featuredMystery.characters.length} Iconic Guest Archetypes (Your Friends&apos; Names Become The Cast):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {featuredMystery.characters.map((char) => (
                      <span
                        key={char.id}
                        className="px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-xs font-bold"
                      >
                        {char.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mb-7 p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-xs text-slate-200 font-medium leading-snug">
                  <strong className="text-sky-300">🕵️ Have more than {featuredMystery.characters.length} guests?</strong> Unlimited extra friends can join the live Game PIN on their phones as <strong className="text-white">&ldquo;Detective [Their Name]&rdquo;</strong> at $0 extra — with a Detective Briefing, interrogation prompts, live clues &amp; voting!
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/${locale}/themes/${featuredMystery.slug}`}
                    className="px-8 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all text-center shadow-xl"
                  >
                    Explore Theme & Cast
                  </Link>
                  <Link
                    href={`/${locale}/login?theme=${featuredMystery.slug}`}
                    className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-full font-black uppercase tracking-widest text-xs hover:border-brand-pink hover:text-brand-pink transition-all text-center"
                  >
                    Customize For Your Group
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Interactive Product Walkthrough */}
      <InteractivePackPreview locale={locale} />

      {/* How It Works - High-Level 6-Step Flow */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                How It Works · Start to Party Night
              </p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-brand-dark uppercase tracking-tight leading-[0.95]">
                Your party is <span className="text-brand-pink italic">sorted</span> in 6 steps.
              </h2>
            </div>
            <Link
              href={`/${locale}/how-it-works`}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-dark hover:text-brand-pink transition-colors shrink-0"
            >
              {dict.home.steps.cta} →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                tag: 'Before the Party',
                title: 'Create Your Guests',
                desc: 'Add your friends’ names, appearances (or snap a quick photo), accents, and inside jokes.',
                style: 'bg-white text-brand-dark shadow-[6px_6px_0px_#120914]',
                numStyle: 'bg-brand-dark text-white',
                tagStyle: 'text-brand-pink',
              },
              {
                num: '02',
                tag: 'Choose the Vibe',
                title: 'Pick Your Theme',
                desc: 'Choose a human-written storyline, difficulty, and spice level — from work-friendly Clean to Spicy.',
                style: 'bg-white text-brand-dark shadow-[6px_6px_0px_#120914]',
                numStyle: 'bg-brand-dark text-white',
                tagStyle: 'text-brand-pink',
              },
              {
                num: '03',
                tag: 'Match Your Crew',
                title: 'Assign Your Cast',
                desc: 'Match your friends to iconic character roles (or auto-cast them in 1 click with automatic Gender-Flex).',
                style: 'bg-white text-brand-dark shadow-[6px_6px_0px_#120914]',
                numStyle: 'bg-brand-dark text-white',
                tagStyle: 'text-brand-pink',
              },
              {
                num: '04',
                tag: 'Ready in ~20 Mins',
                title: 'Generate Custom Clues',
                desc: 'Our engine generates custom costume portraits, CCTV photos featuring your friends, leaked DMs & voice wiretaps.',
                style: 'bg-brand-gray text-brand-dark shadow-[6px_6px_0px_#120914]',
                numStyle: 'bg-brand-pink text-white',
                tagStyle: 'text-brand-dark',
              },
              {
                num: '05',
                tag: 'Build the Hype',
                title: 'Send Character Invites',
                desc: 'Drop a 1-click link into your group chat so everyone sees their character blurb and outfit guide before the night.',
                style: 'bg-brand-pink text-white shadow-[6px_6px_0px_#120914]',
                numStyle: 'bg-brand-dark text-white',
                tagStyle: 'text-white/90',
              },
              {
                num: '06',
                tag: 'Party Night',
                title: 'Launch Live Game Mode',
                desc: 'Open the Playroom on your laptop. Guests join via QR code on their phones for live clues & voting (+ extra friends join as Detective [Name]!).',
                style: 'bg-brand-dark text-white shadow-[6px_6px_0px_#fe04c6]',
                numStyle: 'bg-brand-pink text-white',
                tagStyle: 'text-brand-pink',
              },
            ].map((step) => (
              <div
                key={step.num}
                className={`rounded-3xl p-8 border-2 border-brand-dark transition-transform duration-300 hover:-translate-y-1.5 flex flex-col justify-between space-y-5 ${step.style}`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-10 h-10 rounded-full font-black text-xs flex items-center justify-center ${step.numStyle}`}
                    >
                      {step.num}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${step.tagStyle}`}>
                      {step.tag}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black uppercase tracking-tight leading-none">
                    {step.title}
                  </h3>
                  <p className="text-sm font-semibold leading-relaxed opacity-85">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <HowItWorksVideoShowcase />
        </div>
      </section>

      {/* Occasions Section (Sleek Editorial Layout Linked to Dedicated Occasion Landing Pages) */}
      <section className="py-20 lg:py-28 bg-brand-gray border-t border-gray-200/70">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 lg:mb-16 gap-6 pb-8 border-b border-gray-300/80">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                Private Events &amp; Gatherings
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                {dict.home.occasions.title.split('every')[0]} every <span className="text-brand-pink italic">occasion.</span>
              </h2>
            </div>
            <p className="text-gray-500 font-medium text-sm sm:text-base max-w-sm leading-relaxed">
              From intimate four-to-six-person dining tables to sixteen-guest milestone weekends, every dossier is tailored to the room.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-gray-300/80 bg-white shadow-sm">
            {[
              {
                num: 'I',
                meta: '4–16 Guests · Milestone Nights',
                title: dict.home.occasions.items.birthdays.title,
                desc: dict.home.occasions.items.birthdays.desc,
                href: `/${locale}/occasions/birthday-murder-mystery-party-games`,
              },
              {
                num: 'II',
                meta: '4–16 Guests · Weekend Away',
                title: dict.home.occasions.items.hens.title,
                desc: dict.home.occasions.items.hens.desc,
                href: `/${locale}/occasions/hen-party-bachelorette-murder-mystery-games`,
              },
              {
                num: 'III',
                meta: '4–10 Guests · Hosted at Home',
                title: dict.home.occasions.items.dinner.title,
                desc: dict.home.occasions.items.dinner.desc,
                href: `/${locale}/occasions/dinner-party-murder-mystery-games-for-adults`,
              },
              {
                num: 'IV',
                meta: '4–16 Guests · 90-Min Run Sheet',
                title: dict.home.occasions.items.corporate.title,
                desc: dict.home.occasions.items.corporate.desc,
                href: `/${locale}/custom-murder-mystery`,
              },
              {
                num: 'V',
                meta: '4–10 Guests · Annual Hosting',
                title: dict.home.occasions.items.friends.title,
                desc: dict.home.occasions.items.friends.desc,
                href: `/${locale}/occasions/small-group-murder-mystery-games-4-6-8-players`,
              },
              {
                num: 'VI',
                meta: '4–16 Guests · Family & Friends',
                title: dict.home.occasions.items.engagement.title,
                desc: dict.home.occasions.items.engagement.desc,
                href: `/${locale}/occasions/dinner-party-murder-mystery-games-for-adults`,
              },
            ].map((occ, i) => (
              <Link
                key={i}
                href={occ.href}
                className="group relative flex flex-col justify-between p-8 lg:p-10 border-r border-b border-gray-300/80 bg-white hover:bg-brand-dark transition-colors duration-300"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-serif italic text-sm tracking-widest text-gray-400 group-hover:text-brand-pink transition-colors">
                      No. {occ.num}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400 group-hover:text-gray-300 transition-colors">
                      {occ.meta}
                    </span>
                  </div>

                  <h3 className="text-xl lg:text-2xl font-black text-brand-dark uppercase tracking-tight mb-3 group-hover:text-white transition-colors">
                    {occ.title}
                  </h3>

                  <p className="text-gray-500 text-sm sm:text-base font-medium leading-relaxed mb-8 group-hover:text-gray-300 transition-colors">
                    {occ.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 group-hover:border-white/15 flex items-center justify-between transition-colors">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-dark group-hover:text-brand-pink transition-colors">
                    Read Hosting Guide
                  </span>
                  <span className="w-7 h-7 rounded-full border border-gray-200 group-hover:border-brand-pink group-hover:bg-brand-pink flex items-center justify-center text-brand-dark group-hover:text-white transition-all duration-300">
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                </div>
              </Link>
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
                  [dict.home.compare.table.f1, '✓ (100% Human)', '✓ (Rigid template)', '✗ (Plot holes)'],
                  [dict.home.compare.table.f2, '✓ (AI-tailored)', '✓ (Manual & slow)', '✓ (Basic)'],
                  [dict.home.compare.table.f3, '✓', '✗', '✗'],
                  [dict.home.compare.table.f4, '~20 min', '3–21 days', 'Hours of prompting'],
                  [dict.home.compare.table.f5, <PriceDisplay key="p1" tier="basic" locale={locale as Locale} />, '$60–$150+', '$20/mo + DIY layout'],
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

      {/* Latest Murder Mystery Hosting Guides (Internal SEO Link Equity to Blog) */}
      <section className="py-16 lg:py-24 bg-slate-50 border-t border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-brand-pink mb-2">
                Hosting Tips &amp; Ideas
              </p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight">
                Murder Mystery Party <span className="text-brand-pink italic">Guides</span>
              </h2>
            </div>
            <Link
              href={`/${locale}/blog`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              Read All Hosting Guides →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                slug: 'diy-murder-mystery-party-guide',
                tag: 'Step-by-Step Guide',
                title: 'How to Host an Unforgettable DIY Murder Mystery Party at Home',
                desc: 'From choosing your theme and assigning roles to food, lighting, and spoiler-free hosting tips.',
              },
              {
                slug: 'viral-murder-mystery-themes-2026',
                tag: 'Trending Themes',
                title: '7 Viral Murder Mystery Party Themes for Your Next Dinner Party',
                desc: 'Move beyond Colonel Mustard with modern Reality TV, dark circus, and high-society drama.',
              },
              {
                slug: 'bachelorette-hen-party-murder-mystery-guide',
                tag: 'Hen Do & Bachelorette',
                title: 'The Ultimate Bachelorette & Hen Party Murder Mystery Guide',
                desc: 'How to cast the Bride-to-Be and your whole group into a hilarious, customized mystery night.',
              },
            ].map((guide) => (
              <Link
                key={guide.slug}
                href={`/${locale}/blog/${guide.slug}`}
                className="bg-white rounded-[2rem] p-8 border border-gray-100 hover:border-brand-pink shadow-sm transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    {guide.tag}
                  </span>
                  <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight group-hover:text-brand-pink transition-colors">
                    {guide.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {guide.desc}
                  </p>
                </div>
                <span className="mt-6 text-xs font-black uppercase tracking-widest text-brand-pink group-hover:underline">
                  Read Guide →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 4.9★ Host Reviews & Social Proof Section */}
      <section className="py-16 lg:py-24 bg-white border-t border-gray-100">
        <div className="container mx-auto px-6 max-w-6xl space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/15 text-amber-600 text-[11px] font-black uppercase tracking-widest">
                ★★★★★ 4.9 / 5 Average Host Rating
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                What Hosts Say After <span className="text-brand-pink italic">Round 3</span>
              </h2>
            </div>
            <Link
              href={`/${locale}/reviews`}
              className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
            >
              Read More Host Stories →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  '“When my friends opened their dossiers on their phones and saw their actual jobs and our 2023 Portugal trip woven into the alibis, the whole table lost it. Best dinner party we’ve ever hosted.”',
                author: 'Hannah M.',
                event: 'Hosted 6-Guest 30th Birthday • Christmas Nightmare',
                highlight: '🎭 Custom Inside Jokes + QR Join',
              },
              {
                quote:
                  '“I always hated that hosting a murder mystery meant I couldn’t play or already knew the killer. With the Playroom announcements and audio briefings, I played as The Producer and was completely shocked by the reveal!”',
                author: 'James & Liam',
                event: 'Hosted 8-Guest Dinner Party • Spoiler-Free Host Mode',
                highlight: '📢 100% Spoiler-Free for the Host',
              },
              {
                quote:
                  '“Tagging clues as Red Herrings and pinning suspects on our phones kept everyone arguing over wine for two hours straight. My sister won ‘The BS Detector’ award at the end and still brags about it.”',
                author: 'Sophie K.',
                event: 'Hosted 12-Guest Hen Weekend • Mobile Detective Notebook',
                highlight: '🦅 Detective Clue Tagging & Awards',
              },
            ].map((review) => (
              <div
                key={review.author}
                className="rounded-[2rem] bg-slate-50 border border-slate-100 p-8 flex flex-col justify-between space-y-6 shadow-sm"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-amber-500 text-sm font-black tracking-widest">
                      ★★★★★
                    </span>
                    <span className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider">
                      {review.highlight}
                    </span>
                  </div>
                  <p className="text-sm sm:text-base text-brand-dark font-semibold leading-relaxed">
                    {review.quote}
                  </p>
                </div>
                <div className="pt-4 border-t border-gray-200/70">
                  <p className="text-xs font-black uppercase tracking-wider text-brand-dark">
                    {review.author}
                  </p>
                  <p className="text-[11px] font-bold text-gray-500 mt-0.5">
                    {review.event}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Play Online With Friends (Zoom, FaceTime, Discord & Long-Distance) Spotlight */}
      <section className="py-8 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="rounded-[2.5rem] bg-slate-50 border-2 border-brand-dark shadow-[8px_8px_0px_#120914] p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest">
                <span>🌍 100% Digital • Play From Anywhere in the World</span>
                <span className="text-white/30">•</span>
                <span className="text-brand-pink">Zoom • FaceTime • Discord • Hybrid</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight leading-tight">
                Friends in Different Cities? Play Live <span className="text-brand-pink italic">Over Video Call.</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 font-semibold leading-relaxed">
                Because Back Pocket Mysteries runs inside a real-time cloud Playroom, your friends can connect on Zoom, FaceTime, Discord, or Google Meet from any country—or join your living room dinner party remotely on an iPad—while every clue, voice memo, and voting round syncs live on everyone&apos;s phone.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href={`/${locale}/play-online`}
                className="px-7 py-4 bg-brand-dark hover:bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-lg"
              >
                See How Online Play Works →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* First 50 Founding Host Giveaway Spotlight Banner */}
      <section className="pt-4 pb-8 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="rounded-[2.5rem] bg-gradient-to-r from-brand-dark via-slate-900 to-brand-dark text-white p-8 sm:p-12 border-2 border-brand-pink shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-brand-pink/20 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-3 max-w-2xl relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                🎁 Pre-Launch Founding Host Offer • First 50 Only
              </div>
              <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight">
                Be One of Our First 50 Sign-Ups &amp; Get a 6-Player Custom Mystery <span className="text-brand-pink italic">100% Free</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Lock in one of the first 50 VIP spots in 10 seconds (no credit card needed) and we&apos;ll email you a <strong>single-use 100%-off Founding Host voucher code</strong> good for any 6-Player (Basic Tier • 4–6 suspects) custom murder mystery pack (valued at <PriceDisplay tier="basic" locale={locale as Locale} />).
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 relative z-10 w-full lg:w-auto">
              <Link
                href={`/${locale}/free-murder-mystery-game`}
                className="w-full sm:w-auto text-center px-8 py-4 bg-brand-pink hover:bg-white hover:text-brand-dark text-white rounded-full text-xs font-black uppercase tracking-widest shadow-xl transition-all"
              >
                Claim Free VIP Spot →
              </Link>
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
                {dict.home.ctaSection.desc.replace('{{price}}', '')} <PriceDisplay tier="basic" locale={locale as Locale} /> - ready in ~20 mins.
              </p>
              <p className="text-gray-500 text-sm font-bold mb-12 uppercase tracking-widest">{dict.home.ctaSection.meta}</p>
              <Link href={`/${locale}/login`} className="inline-block px-14 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-white hover:text-brand-pink transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
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
      </main>
    </div>
  );
}
