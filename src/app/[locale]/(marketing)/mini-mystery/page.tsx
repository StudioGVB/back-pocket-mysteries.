import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import MiniMysteryInteractiveClient from '@/components/marketing/MiniMysteryInteractiveClient';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { OCCASION_SEO_PAGES } from '@/data/occasion-seo-pages';
import { Locale } from '@/lib/i18n-config';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const canonicalUrl = `https://backpocketmysteries.com/${locale}/mini-mystery`;

  return {
    title: '60-Second Mini Murder Mystery Game ("Spot The Lie" Online Quiz) | Back Pocket Mysteries',
    description:
      'Play a free 60-second online mini murder mystery! Inspect leaked group chats, forensic Wi-Fi & EXIF logs, and 3 suspect alibis to catch the killer in a lie.',
    keywords: [
      'free mini murder mystery game online',
      '60 second murder mystery quiz',
      'spot the lie detective game',
      'online murder mystery riddle for adults',
      'murder mystery logic puzzle with answers',
      'free online detective game no download',
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: 'Can You Spot the Lie in 60 Seconds? Free Mini Murder Mystery | Back Pocket Mysteries',
      description:
        'Inspect the leaked group chat, check the forensic timestamps, and tap the suspect who is lying.',
      url: canonicalUrl,
      siteName: 'Back Pocket Mysteries',
      type: 'website',
      images: [{ url: '/og-image.png' }],
    },
  };
}

export default async function MiniMysteryPage(props: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await props.params;

  const jsonLd = {
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
            name: '60-Second Mini Murder Mystery ("Spot The Lie")',
            item: `https://backpocketmysteries.com/${locale}/mini-mystery`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How does the 60-Second Mini Murder Mystery work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Each mini case gives you 1 recovered group-chat screenshot, 1 forensic timestamp log, and 3 suspect statements. Cross-reference the clock timestamps to catch which suspect is lying.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is a full Back Pocket Mystery party game different from the 60-second mini case?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Our full multi-round party packs (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds) cast 4 to 16 of your real friends into the story with their actual names, inside jokes, custom AI costume portraits, CCTV stills, and multi-speaker ElevenLabs audio wiretaps inside a live 6-digit PIN mobile Playroom.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="pt-16 pb-10 px-6">
        <div className="container mx-auto max-w-5xl text-center space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-[0.2em]">
            🕵️‍♀️ Interactive 60-Second Detective Challenge
          </span>
          <h1 className="text-4xl sm:text-6xl font-black text-brand-dark uppercase tracking-tight leading-[0.95]">
            Can You Spot <span className="text-brand-pink italic">The Lie?</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-600 font-medium max-w-2xl mx-auto">
            Test your detective instincts on two bite-sized forensic puzzles from our live mobile Playroom. Inspect the recovered group chat, cross-check the timestamps, and tap the suspect who is lying.
          </p>
        </div>
      </section>

      {/* Interactive Mini-Mystery Board */}
      <section className="px-6">
        <div className="container mx-auto max-w-5xl">
          <MiniMysteryInteractiveClient locale={locale} />
        </div>
      </section>

      {/* Bridge CTA to Full Custom Mystery Packs */}
      <section className="px-6 pt-16">
        <div className="container mx-auto max-w-5xl">
          <div className="bg-white rounded-[32px] p-8 sm:p-12 border border-gray-200 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">
                Want Your Real Friends Inside the Crime Scene?
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight">
                Turn Your Next Dinner Party Into a Multi-Round <span className="text-brand-pink italic">Live Investigation.</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-600 font-medium leading-relaxed">
                In a full Back Pocket Mystery, those leaked group chats, CCTV photos, and voice-acted audio wiretaps are generated around <strong>your actual guest list</strong>—with their real names, inside jokes, and a live 6-digit Game PIN lobby from just <strong><PriceDisplay tier="basic" locale={locale as Locale} /></strong>.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full sm:w-auto">
              <Link
                href={`/${locale}/themes`}
                className="px-8 py-4 rounded-full bg-brand-pink text-white font-black uppercase tracking-widest text-xs text-center hover:bg-brand-dark transition-all shadow-lg"
              >
                Browse Full Mystery Themes →
              </Link>
              <Link
                href={`/${locale}/free-murder-mystery-game`}
                className="px-8 py-4 rounded-full bg-brand-dark text-white font-black uppercase tracking-widest text-xs text-center hover:bg-brand-pink transition-all"
              >
                🎁 Claim First-50 Free VIP Pack
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Internal Link Hub: Occasions & Player Counts */}
      <section className="px-6 pt-16">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
              Explore By Group Size &amp; Occasion
            </span>
            <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
              Find the Perfect Murder Mystery for Your Group
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OCCASION_SEO_PAGES.map((occ) => (
              <Link
                key={occ.slug}
                href={`/${locale}/occasions/${occ.slug}`}
                className="p-5 rounded-2xl bg-white border border-gray-100 hover:border-brand-pink/40 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <span className="text-xl">{occ.emoji}</span>
                  <h3 className="text-xs font-black uppercase tracking-wider text-brand-dark group-hover:text-brand-pink transition-colors">
                    {occ.navLabel}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 font-medium line-clamp-2">
                  {occ.subtitle}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
