import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getDictionary } from '@/lib/get-dictionary';
import { Locale } from '@/lib/i18n-config';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import InteractivePackPreview from '@/components/marketing/InteractivePackPreview';

export async function generateMetadata(props: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  return {
    title: `${dict.common.howItWorks} | ${dict.common.siteTitle}`,
    description:
      'Create your guests, pick a human-crafted mystery theme, assign roles, generate fully custom clues in ~20 minutes, send character invites before the party, and launch Live Game Mode when everyone arrives.',
    alternates: {
      canonical: `https://backpocketmysteries.com/en/how-it-works`,
    },
  };
}

export default async function HowItWorksPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const flowSteps = [
    {
      num: '01',
      badge: 'Before the Party',
      title: 'Create Your Guests',
      desc: 'Add the friends coming to your party — enter their names, appearances (or upload a quick photo), accents, and a real-life quirk or inside joke so the mystery feels unmistakably like your crowd.',
      highlights: [
        'Save your friends once and reuse them for future mystery nights',
        'Add fun traits & inside jokes that get woven straight into the story',
      ],
    },
    {
      num: '02',
      badge: 'Choose the Vibe',
      title: 'Pick Your Mystery Theme',
      desc: 'Browse our human-written mystery themes and pick the setting, difficulty, and spice level that fits your occasion — from work-friendly Clean mysteries to Spicy reality-TV drama.',
      highlights: [
        '100% human-architected plots with watertight clue logic',
        'Clear Difficulty (Easy, Medium, Hard) & Spice ratings on every story',
      ],
    },
    {
      num: '03',
      badge: 'Match Your Crew',
      title: 'Assign Your Guests to Characters',
      desc: 'Cast your friends into iconic character archetypes — or let our AI auto-match them in one click. Don’t have enough people for every role? Use Hybrid Mode or a 100% Fictional Cast!',
      highlights: [
        'Gender-Flex Casting automatically adapts roles & outfits to any gender mix',
        'Cast all real friends, a hybrid mix, or ready-made fictional suspects',
      ],
    },
    {
      num: '04',
      badge: 'Ready in ~20 Mins',
      title: 'Generate Your Custom Mystery & Clues',
      desc: 'Our engine builds your entire mystery pack around your specific cast in ~20 minutes — generating custom character portraits, crime-scene CCTV photos featuring your friends, leaked text threads, and voice-acted audio clues.',
      highlights: [
        'Visual CCTV clues, iMessage chats & multi-speaker voice wiretaps tailored to your guests',
        'Includes both the interactive Live Game Room and print-ready PDF booklets',
      ],
    },
    {
      num: '05',
      badge: 'Build the Hype',
      title: 'Send Character Invites Before the Night',
      desc: 'Drop a single 1-click link into your group chat (or send individual links) before the party so guests can tap their name, read their spoiler-free character blurb, and see their outfit & dress code guide!',
      highlights: [
        'Guests see their character vibe & costume guide days before the party',
        'Zero spoilers — all clues and secrets stay locked until party night',
      ],
    },
    {
      num: '06',
      badge: 'Party Night',
      title: 'Launch Live Game Mode When Everyone Arrives',
      desc: 'Open the Live Playroom on your laptop and pop up the QR code or 6-digit Game PIN. Guests join on their phones to view their role cheat-sheet, get live clue drops each round, and vote on who did it!',
      highlights: [
        'You control when each round’s clues and voting unlock from your laptop',
        'Extra friends show up? They can join on the spot as “Detective [Their Name]”!',
      ],
    },
  ];

  const coolFeatures = [
    {
      icon: '🕵️',
      tag: 'Have More Than 6 Guests?',
      title: 'Extra Guest Players (“Detective [Name]”)',
      desc: 'Have extra friends or last-minute plus-ones come along? They can scan the QR code and join as “Detective [Their Name]” — getting interrogation prompts, live clues on their phone, and round voting at $0 extra!',
    },
    {
      icon: '📢',
      tag: 'Host Plays Too',
      title: '100% Spoiler-Free Host Mode',
      desc: 'The killer’s identity stays sealed until the final reveal round, so you can take on a suspect role, sip your drink, and guess the murderer right alongside your guests.',
    },
    {
      icon: '💻',
      tag: 'Simple & Clean UI',
      title: 'Host on a Laptop · Guests on Phones',
      desc: 'You pace the rounds and decide when voting opens from your laptop, while everyone else gets a super clean, distraction-free mobile screen for their role and clues.',
    },
    {
      icon: '📸',
      tag: 'Tailored to Your Cast',
      title: 'Custom CCTV, Texts & Voice Wiretaps',
      desc: 'Your friends don’t just get a name swap — their custom costume portraits appear inside the crime-scene evidence photos, leaked group chats, and regional-accent audio clues.',
    },
    {
      icon: '✨',
      tag: 'Works for Any Group',
      title: 'Automatic Gender-Flex Casting',
      desc: 'Hosting an all-girls hen party, a couples dinner, or a mixed group? Every role automatically adapts pronouns, titles, and costume guides to match the guest playing it.',
    },
    {
      icon: '🛋️',
      tag: '1 to 16+ Players',
      title: 'Dinner Party OR Couch Detective Mode',
      desc: 'Play as a full-cast dinner party where everyone acts out a character — or solve all the suspect dossiers and clues together on the sofa with 1–5 players (no acting required!).',
    },
  ];

  const packIcons: Record<string, string> = {
    hostGuide: '📖',
    characterPackets: '🎭',
    clues: '🕵️‍♀️',
    evidence: '💬',
    reveal: '🏆',
    ready: '🖨️',
  };

  return (
    <div className="bg-white">
      {/* Hero Header */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.howItWorks.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-6 tracking-tighter uppercase leading-[0.95]">
              How It Works,
              <br />
              <span className="text-brand-pink italic">Start to Party Night.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
              From creating your guests and generating custom clues to sending out pre-party character invites and launching Live Game Mode when everyone arrives.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: THE 6-STEP HIGH-LEVEL FLOW
      ===================================================================== */}
      <section className="pb-24 lg:pb-32">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {flowSteps.map((step) => (
              <div
                key={step.num}
                className="card-branded p-8 sm:p-9 border-2 border-gray-100 hover:border-brand-pink transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-5xl font-black text-gray-100 group-hover:text-brand-pink/25 transition-colors leading-none">
                      {step.num}
                    </span>
                    <span className="px-3.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                      {step.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight leading-snug">
                    {step.title}
                  </h2>

                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <ul className="space-y-2 pt-5 mt-6 border-t border-gray-100">
                  {step.highlights.map((h, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs font-bold text-brand-dark leading-snug"
                    >
                      <span className="text-brand-pink font-black shrink-0">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: INTERACTIVE CUSTOM MYSTERY PREVIEW
      ===================================================================== */}
      <InteractivePackPreview locale={locale} />

      {/* =====================================================================
          SECTION 3: COOL FEATURES BUILT FOR PARTY NIGHT
      ===================================================================== */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="container mx-auto px-6 max-w-6xl space-y-24">
          <div className="space-y-14">
            <div className="text-center max-w-3xl mx-auto space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-[0.2em]">
                Built for Effortless Hosting
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                Cool Features That Make It <span className="text-brand-pink italic">Unforgettable.</span>
              </h2>
              <p className="text-gray-500 font-semibold text-base sm:text-lg leading-relaxed">
                Everything is designed so you spend zero time stressing over rules and 100% of the night laughing, mingling, and accusing your friends.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {coolFeatures.map((feat) => (
                <div
                  key={feat.title}
                  className="card-branded p-8 border-2 border-gray-100 hover:border-brand-pink transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-brand-pink/10 text-brand-pink flex items-center justify-center text-2xl group-hover:bg-brand-pink group-hover:text-white transition-colors">
                        {feat.icon}
                      </div>
                      <span className="px-3 py-1 rounded-full bg-brand-gray text-brand-dark text-[10px] font-black uppercase tracking-widest">
                        {feat.tag}
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">
                      {feat.title}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* =================================================================
              SECTION 4: WHAT'S IN THE PACK
          ================================================================== */}
          <div className="py-14 sm:py-20 px-8 sm:px-12 lg:px-20 bg-brand-gray rounded-[2.5rem] lg:rounded-[3rem] border-2 border-gray-100">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark mb-4 uppercase tracking-tight">
                {dict.howItWorks.packContents.title.split(',').map((part, i) => (
                  <span key={i} className={i === 1 ? 'text-brand-pink italic' : ''}>
                    {part}
                  </span>
                ))}
              </h2>
              <p className="text-gray-500 font-bold max-w-xl mx-auto">
                {dict.howItWorks.packContents.subtitle}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Object.entries(dict.howItWorks.packContents.items).map(([key, item], i) => (
                <div key={i} className="card-branded p-9 group hover:border-brand-pink">
                  <div className="w-12 h-12 bg-brand-pink rounded-2xl mb-6 group-hover:scale-110 transition-transform flex items-center justify-center shadow-lg shadow-brand-pink/20 text-xl">
                    {packIcons[key] || '✨'}
                  </div>
                  <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-500 font-semibold leading-relaxed text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center bg-brand-dark rounded-[2.5rem] lg:rounded-[3rem] p-10 sm:p-16 lg:p-24 relative overflow-hidden shadow-2xl">
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.95]">
                {dict.howItWorks.cta.title.split(',')[0]}
                <br />
                <span className="text-brand-pink italic">{dict.howItWorks.cta.title.split(',')[1]}</span>
              </h2>
              <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-bold">
                {dict.howItWorks.cta.desc.split('{{price}}')[0]}
                <PriceDisplay tier="basic" locale={locale as Locale} />
                {dict.howItWorks.cta.desc.split('{{price}}')[1]}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
                <Link
                  href={`/${locale}/themes`}
                  className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center"
                >
                  {dict.howItWorks.cta.ctaThemes}
                </Link>
                <Link
                  href={`/${locale}/pricing`}
                  className="px-10 py-5 bg-white/10 text-white border-2 border-white/20 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center"
                >
                  {dict.howItWorks.cta.ctaPricing}
                </Link>
              </div>
            </div>
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px]"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
