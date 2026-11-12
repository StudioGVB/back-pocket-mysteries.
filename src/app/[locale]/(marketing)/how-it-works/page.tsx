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
    title: `${dict.common.howItWorks} | ${dict.common.siteTitle}`,
    description: dict.howItWorks.subtitle,
    alternates: {
      canonical: `https://backpocketmysteries.com/${locale}/how-it-works`,
      languages: {
        en: 'https://backpocketmysteries.com/en/how-it-works',
        fr: 'https://backpocketmysteries.com/fr/how-it-works',
        'x-default': 'https://backpocketmysteries.com/en/how-it-works',
      }
    }
  };
}

export default async function HowItWorksPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const locale = params.locale;
  const dict = await getDictionary(locale as Locale);

  const steps = [
    {
      ...dict.howItWorks.steps.pick,
      step: '01',
      accent: 'bg-brand-pink',
      imageLabel: 'Theme Selection'
    },
    {
      ...dict.howItWorks.steps.guests,
      step: '02',
      accent: 'bg-brand-blue',
      imageLabel: 'Guest Personalisation'
    },
    {
      ...dict.howItWorks.steps.download,
      step: '03',
      accent: 'bg-emerald-500',
      imageLabel: 'Pack Download'
    }
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
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.howItWorks.badge}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.95]">
              {dict.howItWorks.title.split(',')[0]}<br />
              <span className="text-brand-pink italic">{dict.howItWorks.title.split(',')[1]}</span>
            </h1>
            <p className="text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
              {dict.howItWorks.subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 pb-24 lg:pb-32">
        {/* Steps */}
        <div className="space-y-32">
          {steps.map((item, i) => (
            <div key={i} className={`flex flex-col lg:flex-row gap-16 lg:items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <div className={`inline-block px-4 py-1 rounded-full text-white font-bold text-sm ${item.accent} mb-6`}>
                  STEP {item.step}
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-dark mb-6 uppercase tracking-tight leading-[1.1]">{item.title}</h2>
                <p className="text-lg text-gray-500 leading-relaxed font-medium mb-8">
                  {item.desc}
                </p>
                <ul className="space-y-4">
                  {item.bullets.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-brand-dark font-bold">
                      <div className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}>✓</div>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1">
                {i === 0 && (
                  <Link href={`/${locale}/themes/love-on-the-rocks`} className="block rounded-[2rem] border-2 border-gray-100 bg-brand-dark overflow-hidden shadow-2xl group hover:border-brand-pink transition-all">
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src="/moodboard/lotr/main-promo-murder.jpg"
                        alt="Love On The Rocks - Reality TV Reunion Murder Mystery"
                        fill
                        sizes="(max-width: 1024px) 100vw, 600px"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/30 to-transparent" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                          Active Package
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                          5–12 Suspects (1–12 Players)
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-6 right-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1">Reality TV Reunion</p>
                        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Love On The Rocks</h3>
                      </div>
                    </div>
                    <div className="p-6 bg-brand-dark border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {['The Star', 'The Villain', 'The Ex', 'The Producer', '+5 Roles'].map((role) => (
                          <span key={role} className="px-2.5 py-1 rounded-full bg-white/10 text-white/80 text-[10px] font-bold">
                            {role}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink group-hover:translate-x-1 transition-transform">
                        Explore Theme →
                      </span>
                    </div>
                  </Link>
                )}

                {i === 1 && (
                  <div className="rounded-[2rem] border-2 border-gray-100 bg-brand-gray p-6 sm:p-8 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">Step 2 • Cast Your Guests</span>
                        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Real Friends → Iconic Roles</h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                        🌶️ Spice: Spicy
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { guest: 'Chloe (Bride-to-be)', role: 'The Star', note: 'Loves espresso martinis & dramatic toasts', badge: 'Catalyst' },
                        { guest: 'Marco (Best Man)', role: 'The Ex', note: 'Still brings up the 2022 Ibiza holiday', badge: 'Suspect' },
                        { guest: 'Jess (Maid of Honour)', role: 'The Villain', note: 'Knows everyone’s secrets in the group chat', badge: 'Suspect' },
                        { guest: 'Sam (Host)', role: 'The Producer', note: 'Spoiler-Free Host Mode enabled', badge: 'Host Playing' },
                      ].map((row, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-brand-dark text-sm">{row.guest}</span>
                              <span className="text-gray-300">→</span>
                              <span className="font-black text-brand-pink text-sm uppercase">{row.role}</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">&ldquo;{row.note}&rdquo;</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-brand-gray text-brand-dark text-[10px] font-black uppercase tracking-widest shrink-0">
                            {row.badge}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {i === 2 && (
                  <div className="rounded-[2rem] border-2 border-gray-100 bg-brand-dark text-white p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-lg">
                          📱
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">Live Digital Playroom + PDFs</span>
                          <h3 className="text-lg font-black uppercase tracking-tight">Game PIN: 849 201</h3>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                        Ready in ~30m
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">Interactive Mobile Lobby</p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Join via 6-digit PIN or QR code</li>
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Live Round 1–3 secret objectives</li>
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Group-chat &amp; audio wiretap clues</li>
                        </ul>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">Print-Ready PDF Kit</p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Spoiler-Free Host Guide PDF</li>
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Custom Suspect Booklets</li>
                          <li className="flex items-center gap-2"><span className="text-emerald-400 font-black">✓</span> Printable Crime Scene Evidence</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Two Ways To Play: Theatrical Party vs Detective Case File */}
        <div className="mt-28 lg:mt-36 p-8 sm:p-12 lg:p-16 bg-brand-dark text-white rounded-[2rem] lg:rounded-[3rem] shadow-2xl border-2 border-brand-pink/30">
          <div className="max-w-3xl mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest mb-4">
              Flexible Format • 1 to 16 People
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.05] mb-4">
              Host a Full-Cast Party - Or Solve It <span className="text-brand-pink italic">Like a Detective Case File</span>
            </h2>
            <p className="text-gray-300 font-medium text-base sm:text-lg leading-relaxed">
              Every mystery story requires at least <strong>5 characters</strong> so the alibis, motives, and backstories tangle properly, but the player count in the room is purely for theatrics! You don&apos;t need to act out a character to get information.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🎭 Option 1 • Theatrical Party Mode (5–16 Guests)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                1 Role Per Guest - Zero Random Side Characters
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Having friends over for a dinner party, birthday, or hen night? Select the exact number of guests attending (minimum 5). Every guest plays 1 suspect, and we never include unplayed side characters that nobody in the room is playing.
              </p>
            </div>

            <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                📁 Option 2 • Detective Case-File Mode (Solo, Couple or 3–4 Friends)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Solve the Whole Package Together Over Wine
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Want to solve the mystery by yourself or on a date night? Simply select 5–9 characters for the story (cast your friends just for the hilarious personalized DMs!) and inspect all of their suspect booklets, group chats, and audio wiretaps together to deduce who did it.
              </p>
            </div>
          </div>
        </div>

        {/* What's In The Pack */}
        <div className="mt-24 lg:mt-36 py-12 sm:py-20 px-8 sm:px-12 lg:px-24 bg-brand-gray rounded-[2rem] lg:rounded-[3rem] border-2 border-gray-100">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark mb-4 uppercase tracking-tight">
              {dict.howItWorks.packContents.title.split(',').map((part, i) => (
                <span key={i} className={i === 1 ? 'text-brand-pink italic' : ''}>
                  {part}
                </span>
              ))}
            </h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto">{dict.howItWorks.packContents.subtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Object.entries(dict.howItWorks.packContents.items).map(([key, item], i) => (
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <div className="w-12 h-12 bg-brand-pink rounded-xl mb-6 group-hover:scale-110 transition-transform flex items-center justify-center shadow-lg shadow-brand-pink/20 text-xl">
                  {packIcons[key] || '✨'}
                </div>
                <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-3">{item.title}</h3>
                <p className="text-gray-500 font-semibold leading-relaxed text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="mt-32 lg:mt-40 text-center bg-brand-dark rounded-[2rem] lg:rounded-[3rem] p-8 sm:p-12 lg:p-24 relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.95]">
              {dict.howItWorks.cta.title.split(',')[0]}<br />
              <span className="text-brand-pink italic">{dict.howItWorks.cta.title.split(',')[1]}</span>
            </h2>
            <p className="text-lg text-gray-400 mb-12 max-w-xl mx-auto font-bold">
              {dict.howItWorks.cta.desc.split('{{price}}')[0]}
              <PriceDisplay tier="basic" locale={locale as Locale} />
              {dict.howItWorks.cta.desc.split('{{price}}')[1]}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center w-full">
              <Link href={`/${locale}/themes`} className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-sm hover:bg-white hover:text-brand-pink transition-all shadow-xl hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center">
                {dict.howItWorks.cta.ctaThemes}
              </Link>
              <Link href={`/${locale}/pricing`} className="px-10 py-5 bg-white/10 text-white border-2 border-white/20 rounded-full font-black uppercase tracking-widest text-sm hover:border-brand-pink transition-all hover:translate-y-[-4px] active:scale-95 w-full sm:w-auto text-center">
                {dict.howItWorks.cta.ctaPricing}
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_2px_2px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:24px_24px]"></div>
          </div>
        </div>

      </div>
    </div>
  );
}
