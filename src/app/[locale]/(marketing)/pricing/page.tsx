import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { getFormattedPrice } from '@/utils/localization';
import PricingCalculator from '@/components/marketing/PricingCalculator';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import PricingComparison from '@/components/marketing/PricingComparison';
import JsonLd from '@/components/marketing/JsonLd';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);
  
  return {
    title: `${dict.common.pricing} | Back Pocket Mysteries`,
    description: dict.pricing.subtitle,
    alternates: {
      canonical: `https://backpocketmysteries.com/en/pricing`,
    }
  }
}

export default async function PricingPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  // Currency is handled client-side in components to allow static rendering

  const tiers = [
    {
      id: 'basic' as const,
      name: 'Basic',
      tagline: 'UP TO 6 CHARACTERS • 1–6 PLAYERS.',
      desc: 'Includes 6 interlocking character dossiers — play as an intimate 6-guest dinner party OR solve it solo, as a couple, or in a small group!',
      features: [
        '6 interlocking character roles & booklets (1 Victim + 5 Suspects)',
        'Play 2 Ways: Dinner Party Roleplay OR Couch Detective / Case-File Mode',
        '3 Cast Options: All Friends, Hybrid (Friends + Fictional Strangers), or 100% Fictional Cast',
        'Interactive clues (texts, receipts, CCTV photos, voice memos)',
        'Guest names, avatars & real-life quirks woven into the story',
        'Kahoot-style 6-digit Game PIN & Spoiler-Free Host Mode',
        'Print character booklets or inspect the full case file on phones',
      ],
      cta: 'Browse Mysteries',
      featured: false,
      bestFor: 'SOLO/COUPLE CASE FILES OR INTIMATE PARTIES (1–6 PLAYERS)',
      billingPeriod: 'event' as const
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      tagline: 'UP TO 10 CHARACTERS • 1–10 PLAYERS.',
      desc: 'Our most popular package, ideal for birthdays, hens nights, and dinner parties up to 10 guests (or an expanded 10-suspect detective case file).',
      features: [
        'Up to 10 custom character roles & booklets',
        'Expanded relationship web, rival alliances & tangled side-plots',
        'Play 2 Ways: Dinner Party Roleplay OR Couch Detective / Case-File Mode',
        '3 Cast Options: All Friends, Hybrid (Friends + Fictional Strangers), or 100% Fictional Cast',
        'Interactive clues (group chats, audio wiretaps, visual CCTV)',
        'Kahoot-style 6-digit Game PIN & Spoiler-Free Host Mode',
        'Print character booklets or play 100% on phones',
      ],
      cta: 'Browse Mysteries',
      featured: true,
      bestFor: 'BIRTHDAYS, HENS NIGHTS & DINNER PARTIES (UP TO 10 PLAYERS)',
      billingPeriod: 'event' as const
    },
    {
      id: 'grand' as const,
      name: 'Grand',
      tagline: 'UP TO 16 CHARACTERS • 1–16 PLAYERS.',
      desc: 'Built for big celebrations, weekend getaways, and large groups of up to 16 suspects with interlocking alibis.',
      features: [
        'Up to 16 custom character roles & booklets',
        'Full-house conflict graph, multi-faction subplots & red herrings',
        '3 Cast Options: All Friends, Hybrid (Friends + Fictional Strangers), or 100% Fictional Cast',
        'Interactive clues (group chats, audio wiretaps, visual CCTV)',
        'Guest names, avatars & real-life quirks woven into the story',
        'Kahoot-style 6-digit Game PIN & Spoiler-Free Host Mode',
        'Print character booklets or play 100% on phones',
      ],
      cta: 'Browse Mysteries',
      featured: false,
      bestFor: 'LARGE PARTIES & GETAWAYS (UP TO 16 PLAYERS)',
      billingPeriod: 'event' as const
    },
  ];

  return (
    <div className="bg-white">
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.common.pricing}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.9]">
              {dict.pricing.title.split('.')[0]}. <br />
              <span className="text-brand-pink italic">{dict.pricing.title.split('.')[1]}</span>.
            </h1>
            <p className="text-lg lg:text-xl text-gray-500 font-bold max-w-2xl mx-auto border-l-4 border-brand-pink pl-6 text-left">
              {dict.pricing.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 lg:pb-32">

        <PricingCalculator 
          basicTier={tiers[0]}
          premiumTier={tiers[1]}
          grandTier={tiers[2]}
          locale={locale as Locale}
        />

        {/* Value anchoring note */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 font-bold text-sm max-w-2xl mx-auto leading-relaxed">
            For context: hiring a human to write a custom mystery costs $500+ and takes weeks. <br />
            A generic boxed kit costs $40–$80 and has zero personalization. <br />
            We deliver a human-written, AI-tailored experience for your whole group in ~20 minutes.
          </p>
        </div>
        
        <PricingComparison />
        
        {/* FAQ CTA */}
        <div className="mt-48 pt-32 max-w-5xl mx-auto border-t-2 border-gray-100">
          <div className="text-center mb-12">
             <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
               Have a <span className="text-brand-pink italic">Question?</span>
             </h2>
             <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto">
               We've compiled answers to the most common questions. If you can't find what you're looking for, our team is ready to help.
             </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Link href={`/${locale}/faq`} className="px-10 py-5 bg-brand-dark text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-pink transition-all shadow-xl hover:translate-y-[-2px] active:scale-95 text-center">
              Read the FAQs
            </Link>
            <Link href={`/${locale}/contact`} className="px-10 py-5 bg-white border-2 border-gray-200 text-brand-dark rounded-full font-black uppercase tracking-[0.2em] text-sm hover:border-brand-pink hover:text-brand-pink transition-all shadow-sm hover:translate-y-[-2px] active:scale-95 text-center">
              Contact Us
            </Link>
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-40 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tight">
            Still on the fence? <span className="text-brand-pink italic">Don't be.</span>
          </h2>
          <p className="text-gray-500 font-bold text-lg max-w-xl mx-auto mb-12">
            Your party is happening either way. Make it one people actually talk about.
          </p>
          <Link href={`/${locale}/themes`} className="inline-block px-14 py-6 bg-brand-pink text-white rounded-full font-black uppercase tracking-[0.2em] text-sm hover:bg-brand-dark transition-all shadow-2xl hover:translate-y-[-4px] active:scale-95">
            {dict.common.browseThemes}
          </Link>
        </div>
      </div>
    </div>
  );
}
