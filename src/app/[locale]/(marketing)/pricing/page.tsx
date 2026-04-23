import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import { resolveCurrency, getFormattedPrice } from '@/utils/localization';
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
  }
}

export default async function PricingPage(props: {
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


  const tiers = [
    {
      id: 'basic' as const,
      name: 'Basic',
      tagline: 'QUICK SETUP, SORTED PARTY.',
      desc: 'Best for small groups, casual hosts, or first-timers who want to see what we\'re about.',
      features: [
        'Easy Difficulty (1-2 Hours)',
        'Up to 6 players included (Max 10)',
        `+${getFormattedPrice('basicExtra', locale as Locale, currency)} per extra player`,
        '~15 clues / photos',
        'Theme-based mystery with 4 structured rounds',
        'Guest names inserted throughout the story',
        'Host guide + character packets',
        'Print or share digitally',
        'Instant download',
      ],
      proFeatures: [
        'Easy Difficulty (1-2 Hours)',
        'Up to 6 players included (Max 10)',
        `+${getFormattedPrice('basicExtra', locale as Locale, currency)} per extra player`,
        '~15 clues / photos',
        'Theme-based mystery with 4 structured rounds',
        'Custom character appearances (hair, eyes, style)',
        'Inside jokes & character traits',
        'AI evidence images perfectly match your group',
        'Host guide + character packets',
        'Print or share digitally',
        'Instant download',
      ],
      cta: 'Get Started',
      featured: false,
      bestFor: 'CASUAL DINNER PARTIES',
      billingPeriod: 'event' as const
    },
    {
      id: 'premium' as const,
      name: 'Premium',
      tagline: 'THE MAIN EVENT PACK.',
      desc: 'Best for birthdays, hens parties, and evenings where you want it to feel really special.',
      features: [
        'Standard Difficulty (2-3 Hours)',
        'Up to 8 players included (Max 12)',
        `+${getFormattedPrice('premiumExtra', locale as Locale, currency)} per extra player`,
        '~22 clues / photos',
        'Tailored to your specific event',
        '8–12 AI-generated evidence images',
        'Optional confessional prompts',
        'Host guide + sealed per-guest packets',
        'Instant download',
      ],
      proFeatures: [
        'Standard Difficulty (2-3 Hours)',
        'Up to 8 players included (Max 12)',
        `+${getFormattedPrice('premiumExtra', locale as Locale, currency)} per extra player`,
        '~22 clues / photos',
        'Tailored to your specific event',
        'Custom character appearances (hair, eyes, style)',
        'Inside jokes & character traits',
        '8–12 AI evidence images perfectly match your group',
        'Optional confessional prompts',
        'Host guide + sealed per-guest packets',
        'Instant download',
      ],
      cta: 'Get Premium',
      featured: true,
      bestFor: 'HENS NIGHTS, MILESTONES',
      billingPeriod: 'event' as const
    },
    {
      id: 'grand' as const,
      name: 'Grand',
      tagline: 'FOR THE PERFECTIONIST.',
      desc: 'A full 8-beat film-quality mystery. Extended story, more evidence, maximum drama.',
      features: [
        'Epic Difficulty (3-4 Hours)',
        'Up to 10 players included (Max 16)',
        `+${getFormattedPrice('grandExtra', locale as Locale, currency)} per extra player`,
        '~30 clues / photos',
        'Tailored to your specific event',
        '12–15 AI-generated evidence images',
        'Optional confessional prompts',
        'Host guide + sealed per-guest packets',
        'Instant download',
      ],
      proFeatures: [
        'Epic Difficulty (3-4 Hours)',
        'Up to 10 players included (Max 16)',
        `+${getFormattedPrice('grandExtra', locale as Locale, currency)} per extra player`,
        '~30 clues / photos',
        'Tailored to your specific event',
        'Custom character appearances (hair, eyes, style)',
        'Inside jokes & character traits',
        '12–15 AI evidence images perfectly match your group',
        'Optional confessional prompts',
        'Host guide + sealed per-guest packets',
        'Instant download',
      ],
      cta: 'Go Grand',
      featured: false,
      bestFor: 'WEEKEND GETAWAYS',
      billingPeriod: 'event' as const
    },
    {
      id: 'subscribe' as const,
      name: 'Unlimited',
      tagline: 'FOR EVENT PROS.',
      desc: 'Generate unlimited mysteries every month. Pro Customizer always included.',
      features: [
        'Unlimited mysteries (1/day)',
        'Choose any difficulty level',
        'Up to 16 players included per mystery',
        'Tailored to your specific events',
        'Custom character appearances (hair, eyes, style)',
        'Inside jokes & character traits',
        'Unlimited AI-generated evidence images',
        'Commercial use license',
        'Priority Generation',
      ],
      cta: 'Subscribe Now',
      featured: false,
      bestFor: 'EVENT PLANNERS, VENUES',
      billingPeriod: 'month' as const
    }
  ];



  return (
    <div className="bg-white">
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.common.pricing}
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.9]">
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
          currency={currency}
        />

        {/* Unlimited Subscription Tier */}
        <div className="relative p-12 lg:p-16 mt-16 max-w-[90rem] mx-auto rounded-[3rem] border-4 bg-brand-pink border-brand-pink shadow-2xl flex flex-col lg:flex-row gap-12 items-center group transition-all duration-500">
          <div className="absolute top-0 right-12 transform -translate-y-1/2 px-8 py-3 bg-brand-dark text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-xl">
            FOR EVENT PLANNERS
          </div>
          
          <div className="flex-1">
            <h3 className="text-5xl lg:text-6xl font-black mb-2 uppercase tracking-tighter text-white">{tiers[3].name}</h3>
            <p className="text-sm font-black uppercase tracking-widest mb-6 text-white/80">{tiers[3].tagline}</p>
            <div className="flex items-baseline gap-2 mb-6">
              <PriceDisplay 
                tier={tiers[3].id} 
                locale={locale as Locale} 
                currency={currency}
                isPro={false} 
                className="text-7xl lg:text-8xl font-black tracking-tighter text-brand-dark" 
              />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-white/80">
                / {tiers[3].billingPeriod === 'month' ? 'MONTH' : 'EVENT'}
              </span>
            </div>
            <p className="font-bold text-lg leading-snug text-white/90 max-w-xl">{tiers[3].desc}</p>
          </div>

          <div className="flex-1 w-full">
            <ul className="space-y-4 mb-10 bg-white/10 p-8 rounded-[2rem] border border-white/20">
              {tiers[3].features.map((feature, j) => (
                <li key={j} className="flex items-start gap-4">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-brand-dark flex items-center justify-center text-white text-xs shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold leading-snug text-white">{feature}</span>
                </li>
              ))}
            </ul>

            <Link href={`/${locale}/coming-soon`} className="btn-pill block w-full px-8 py-6 text-center text-sm bg-brand-dark text-white hover:bg-white hover:text-brand-dark shadow-2xl">
              {tiers[3].cta}
            </Link>
          </div>
        </div>

        {/* Value anchoring note */}
        <div className="mt-20 text-center">
          <p className="text-gray-400 font-bold text-sm max-w-2xl mx-auto leading-relaxed">
            For context: hiring a human to write a custom mystery costs $500+ and takes weeks. <br />
            A generic boxed kit costs $40–$80 and has zero personalization. <br />
            We deliver a fully customized, film-quality experience — for your whole group — in under 20 minutes.
          </p>
        </div>
        
        <PricingComparison />
        
        {/* FAQ CTA */}
        <div className="mt-48 pt-32 max-w-5xl mx-auto border-t-2 border-gray-100">
          <div className="text-center mb-12">
             <h2 className="text-4xl lg:text-6xl font-black text-brand-dark mb-6 uppercase tracking-tight">
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
          <h2 className="text-4xl lg:text-5xl font-black text-brand-dark mb-6 uppercase tracking-tight">
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
