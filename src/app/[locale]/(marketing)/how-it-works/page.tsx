import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
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
      numBg: 'bg-brand-pink text-white shadow-lg shadow-brand-pink/30',
      badgeClass: 'bg-brand-pink/10 text-brand-pink',
      topBar: 'from-brand-pink via-fuchsia-500 to-rose-500',
      borderHover: 'hover:border-brand-pink',
      isDark: false,
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
      numBg: 'bg-brand-blue text-white shadow-lg shadow-brand-blue/30',
      badgeClass: 'bg-brand-blue/10 text-brand-blue',
      topBar: 'from-brand-blue via-indigo-500 to-sky-400',
      borderHover: 'hover:border-brand-blue',
      isDark: false,
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
      numBg: 'bg-purple-600 text-white shadow-lg shadow-purple-600/30',
      badgeClass: 'bg-purple-100 text-purple-700',
      topBar: 'from-purple-600 via-fuchsia-500 to-brand-pink',
      borderHover: 'hover:border-purple-500',
      isDark: false,
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
      numBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      topBar: 'from-emerald-400 via-teal-500 to-cyan-500',
      borderHover: 'hover:border-emerald-500',
      isDark: false,
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
      numBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
      badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
      topBar: 'from-amber-400 via-orange-500 to-brand-pink',
      borderHover: 'hover:border-amber-500',
      isDark: false,
    },
    {
      num: '06',
      badge: 'Party Night Finale',
      title: 'Launch Live Game Mode When Everyone Arrives',
      desc: 'Open the Live Playroom on your laptop and pop up the QR code or 6-digit Game PIN. Guests join on their phones to view their role cheat-sheet, get live clue drops each round, and vote on who did it!',
      highlights: [
        'You control when each round’s clues and voting unlock from your laptop',
        'Extra friends show up? They can join on the spot as “Detective [Their Name]”!',
      ],
      numBg: 'bg-brand-pink text-white shadow-lg shadow-brand-pink/40',
      badgeClass: 'bg-brand-pink text-white',
      topBar: 'from-brand-pink via-purple-500 to-amber-400',
      borderHover: 'hover:border-brand-pink',
      isDark: true,
    },
  ];

  const coolFeatures = [
    {
      icon: '🕵️',
      tag: 'Have More Than 6 Guests?',
      title: 'Extra Guest Players (“Detective [Name]”)',
      desc: 'Have extra friends or last-minute plus-ones come along? They can scan the QR code and join as “Detective [Their Name]” — getting interrogation prompts, live clues on their phone, and round voting at $0 extra!',
      iconBg: 'bg-brand-pink text-white shadow-lg shadow-brand-pink/30',
      tagBg: 'bg-brand-pink/20 text-brand-pink border border-brand-pink/30',
      cardStyle:
        'bg-brand-dark text-white border-2 border-brand-pink shadow-[0_20px_40px_-15px_rgba(254,4,198,0.28)]',
      isDark: true,
    },
    {
      icon: '📢',
      tag: 'Host Plays Too',
      title: '100% Spoiler-Free Host Mode',
      desc: 'The killer’s identity stays sealed until the final reveal round, so you can take on a suspect role, sip your drink, and guess the murderer right alongside your guests.',
      iconBg: 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25',
      tagBg: 'bg-brand-blue/10 text-brand-blue',
      cardStyle: 'bg-white border-2 border-gray-100 hover:border-brand-blue',
      isDark: false,
    },
    {
      icon: '💻',
      tag: 'Simple & Clean UI',
      title: 'Host on a Laptop · Guests on Phones',
      desc: 'You pace the rounds and decide when voting opens from your laptop, while everyone else gets a super clean, distraction-free mobile screen for their role and clues.',
      iconBg: 'bg-purple-600 text-white shadow-lg shadow-purple-600/25',
      tagBg: 'bg-purple-100 text-purple-700',
      cardStyle: 'bg-white border-2 border-gray-100 hover:border-purple-500',
      isDark: false,
    },
    {
      icon: '📸',
      tag: 'Tailored to Your Cast',
      title: 'Custom CCTV, Texts & Voice Wiretaps',
      desc: 'Your friends don’t just get a name swap — their custom costume portraits appear inside the crime-scene evidence photos, leaked group chats, and regional-accent audio clues.',
      iconBg: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25',
      tagBg: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      cardStyle: 'bg-white border-2 border-gray-100 hover:border-emerald-500',
      isDark: false,
    },
    {
      icon: '✨',
      tag: 'Works for Any Group',
      title: 'Automatic Gender-Flex Casting',
      desc: 'Hosting an all-girls hen party, a couples dinner, or a mixed group? Every role automatically adapts pronouns, titles, and costume guides to match the guest playing it.',
      iconBg: 'bg-amber-500 text-white shadow-lg shadow-amber-500/25',
      tagBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      cardStyle: 'bg-white border-2 border-gray-100 hover:border-amber-500',
      isDark: false,
    },
    {
      icon: '🛋️',
      tag: '1 to 16+ Players',
      title: 'Dinner Party OR Couch Detective Mode',
      desc: 'Play as a full-cast dinner party where everyone acts out a character — or solve all the suspect dossiers and clues together on the sofa with 1–5 players (no acting required!).',
      iconBg: 'bg-brand-pink text-white shadow-lg shadow-brand-pink/25',
      tagBg: 'bg-brand-pink/10 text-brand-pink',
      cardStyle: 'bg-white border-2 border-gray-100 hover:border-brand-pink',
      isDark: false,
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
    <div className="bg-white overflow-hidden">
      {/* Hero Header with Ambient Glow */}
      <div className="relative pt-10 pb-12 lg:pt-16 lg:pb-16 overflow-hidden bg-white">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-pink/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 -left-24 w-80 h-80 bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
              {dict.howItWorks.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-6 tracking-tighter uppercase leading-[0.95]">
              How It Works,
              <br />
              <span className="text-brand-pink italic">Start to Party Night.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-semibold max-w-2xl border-l-4 border-brand-pink pl-6">
              From creating your guests and generating custom clues to sending out pre-party character invites and launching Live Game Mode when everyone arrives.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: THE 6-STEP HIGH-LEVEL FLOW (WITH COLOUR, VISUALS & MOVEMENT)
      ===================================================================== */}
      <section className="relative py-12 lg:py-20 bg-gradient-to-b from-white via-brand-gray/70 to-white">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-tr from-brand-pink/10 via-brand-blue/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container mx-auto px-6 max-w-6xl relative z-10">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {flowSteps.map((step, idx) => (
              <div
                key={step.num}
                className={`group relative rounded-[2.25rem] overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between ${
                  step.isDark
                    ? 'bg-brand-dark text-white border-2 border-brand-pink shadow-[0_20px_45px_-15px_rgba(254,4,198,0.35)]'
                    : `bg-white text-brand-dark border-2 border-gray-100 shadow-xl ${step.borderHover}`
                }`}
              >
                {/* Vibrant Top Gradient Accent Strip */}
                <div className={`h-2 w-full bg-gradient-to-r ${step.topBar}`} />

                <div className="p-7 sm:p-8 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    {/* Top Row: Solid Coloured Step Badge + Animated Connector Pill */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ${step.numBg}`}
                        >
                          {step.num}
                        </span>
                        {idx < 5 && (
                          <span className="text-xs font-black uppercase tracking-widest text-gray-300 group-hover:text-brand-pink group-hover:translate-x-1 transition-all">
                            →
                          </span>
                        )}
                      </div>
                      <span
                        className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${step.badgeClass}`}
                      >
                        {step.badge}
                      </span>
                    </div>

                    {/* Visual Mini-Preview Banner inside Each Step Card */}
                    {idx === 0 && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-pink-50 via-fuchsia-50 to-rose-50 border border-brand-pink/20 flex items-center justify-between gap-3">
                        <div className="flex items-center -space-x-2.5">
                          {[
                            '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg',
                            '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
                            '/generated-avatars/5f9b36e0-44ae-4c3d-9762-432c5bb17783-5518cb6b6215.jpg',
                          ].map((src, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={i}
                              src={src}
                              alt="Guest profile"
                              className="w-10 h-10 rounded-full object-cover object-top border-2 border-white shadow-md group-hover:scale-105 transition-transform"
                            />
                          ))}
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-white text-brand-pink text-[10px] font-black uppercase tracking-wider shadow-sm">
                          + Add Traits &amp; Jokes
                        </span>
                      </div>
                    )}

                    {idx === 1 && (
                      <div className="relative h-16 rounded-2xl overflow-hidden border border-brand-blue/20 shadow-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/moodboard/lotr/main-promo-murder.jpg"
                          alt="Mystery Theme"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/80 via-brand-dark/40 to-transparent flex items-center justify-between px-4">
                          <span className="text-[11px] font-black uppercase tracking-wider text-white">
                            ✨ Clean · 🌶️ Mild · 🌶️🌶️ Spicy
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase">
                            Themes
                          </span>
                        </div>
                      </div>
                    )}

                    {idx === 2 && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200/80 flex items-center justify-between gap-2">
                        <span className="px-2.5 py-1 rounded-xl bg-white text-brand-dark text-[11px] font-black shadow-sm">
                          👤 Sarah
                        </span>
                        <span className="text-purple-600 font-black text-xs group-hover:translate-x-1 transition-transform">
                          ⚡ AI Match →
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          🎭 The Sister-in-Law
                        </span>
                      </div>
                    )}

                    {idx === 3 && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-1 rounded-lg bg-white text-emerald-700 text-[10px] font-black shadow-sm">
                            📹 CCTV
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white text-emerald-700 text-[10px] font-black shadow-sm">
                            💬 DMs
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white text-emerald-700 text-[10px] font-black shadow-sm">
                            🎙️ Audio
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          ~20 Mins
                        </span>
                      </div>
                    )}

                    {idx === 4 && (
                      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-black text-amber-900">
                          👗 Outfit Guide + Role Blurb
                        </span>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                          💬 1-Click Share
                        </span>
                      </div>
                    )}

                    {idx === 5 && (
                      <div className="p-3.5 rounded-2xl bg-white/10 border border-brand-pink/40 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span className="text-xs font-black tracking-wider text-white">
                            PIN: 146 492
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider">
                          + Detective [Name]
                        </span>
                      </div>
                    )}

                    {/* Title & Description */}
                    <div className="space-y-2.5">
                      <h2
                        className={`text-2xl font-black uppercase tracking-tight leading-snug ${
                          step.isDark ? 'text-white' : 'text-brand-dark'
                        }`}
                      >
                        {step.title}
                      </h2>
                      <p
                        className={`text-sm font-medium leading-relaxed ${
                          step.isDark ? 'text-gray-300' : 'text-gray-500'
                        }`}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* Bottom Checkmark Highlights */}
                  <ul
                    className={`space-y-2 pt-5 border-t ${
                      step.isDark ? 'border-white/15' : 'border-gray-100'
                    }`}
                  >
                    {step.highlights.map((h, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-xs font-bold leading-snug ${
                          step.isDark ? 'text-gray-100' : 'text-brand-dark'
                        }`}
                      >
                        <span className="text-brand-pink font-black shrink-0">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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
      <section className="py-24 lg:py-32 bg-white relative overflow-hidden">
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
                  className={`rounded-[2.25rem] p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl flex flex-col justify-between space-y-4 group ${feat.cardStyle}`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 ${feat.iconBg}`}
                      >
                        {feat.icon}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${feat.tagBg}`}
                      >
                        {feat.tag}
                      </span>
                    </div>
                    <h3
                      className={`text-xl font-black uppercase tracking-tight ${
                        feat.isDark ? 'text-white' : 'text-brand-dark'
                      }`}
                    >
                      {feat.title}
                    </h3>
                    <p
                      className={`text-sm font-medium leading-relaxed ${
                        feat.isDark ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
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
                <div
                  key={i}
                  className="card-branded p-9 group hover:border-brand-pink hover:-translate-y-1.5 transition-all"
                >
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
