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
    title: `How It Works & How to Play | ${dict.common.siteTitle}`,
    description:
      'See how Back Pocket Mysteries works from 3-step cast customization to party night: Host on a laptop, guests on their phones, host-gated round voting, and unlimited Extra Guest Detectives.',
    alternates: {
      canonical: `https://backpocketmysteries.com/en/how-it-works`,
    },
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
    },
    {
      ...dict.howItWorks.steps.guests,
      step: '02',
      accent: 'bg-brand-blue',
    },
    {
      ...dict.howItWorks.steps.download,
      step: '03',
      accent: 'bg-emerald-500',
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

  const partyRunOfShow = [
    {
      num: '01',
      stage: 'Welcome Drinks & Mingle',
      title: 'Guests Scan the QR Code & Claim Their Role (or Join as “Detective [Name]”)',
      hostAction:
        'Open the Playroom on your laptop and pop up the full-screen QR Poster or 6-digit Game PIN while everyone arrives and grabs a drink.',
      guestView:
        'Guests tap their character card in the mobile Lobby — or extra friends type their name at the bottom to join as Detective [Their Name]. Everyone gets their Role Cheat-Sheet and icebreakers while clues stay locked.',
    },
    {
      num: '02',
      stage: 'Round 1 · Clues & First Vote',
      title: 'Round 1 Evidence Drops & You Open the First Suspect Ballot',
      hostAction:
        'Tap “Unlock Round 1 Clues” on your laptop and read the brief spoiler-free Round 1 script. Once everyone has mingled and inspected the clues, tap “Open Round 1 Voting”.',
      guestView:
        'Guest phones automatically open the Round 1 Clue Feed (leaked texts, CCTV photos & voice wiretaps). When you open voting, the Round 1 Suspect Ballot pops up right at the top of their screen!',
    },
    {
      num: '03',
      stage: 'Rounds 2 & 3 · Deeper Secrets',
      title: 'Forensic Contradictions, Alibi Cracks & Final Accusations',
      hostAction:
        'Over dinner or the next round of drinks, unlock Round 2 and Round 3 clues on your laptop, then open the Final Accusation Vote and watch the live vote counter (e.g. 8/8 Votes In).',
      guestView:
        'New forensic reports and 15-minute timeline gaps drop onto every phone. Suspects and Extra Guest Detectives grill each other and lock in their final killer accusation.',
    },
    {
      num: '04',
      stage: 'The Big Finale',
      title: 'The Killer’s Confession & Combined Detective Leaderboard',
      hostAction:
        'Tap “Trigger Final Reveal” on your laptop to broadcast the solution to every phone in the room — and find out who the killer is right alongside your friends!',
      guestView:
        'Every phone unlocks the Killer’s Dramatic Confession, the full crime timeline solution, Personal Scorecards, and the Combined Cast + Guest Detective Leaderboard.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Fun, High-Energy Hero Header */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.howItWorks.badge} · Ready in ~20 Mins
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-6 tracking-tighter uppercase leading-[0.95]">
              {dict.howItWorks.title.split(',')[0]},
              <br />
              <span className="text-brand-pink italic">{dict.howItWorks.title.split(',')[1]}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl">
              {dict.howItWorks.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: 3-STEP PRE-PARTY SETUP
      ===================================================================== */}
      <div className="container mx-auto px-6 max-w-6xl pb-24 lg:pb-32">
        <div className="space-y-28">
          {steps.map((item, i) => (
            <div
              key={i}
              className={`flex flex-col lg:flex-row gap-14 lg:items-center ${
                i % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className="flex-1">
                <div
                  className={`inline-block px-4 py-1 rounded-full text-white font-bold text-sm ${item.accent} mb-5`}
                >
                  STEP {item.step}
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-brand-dark mb-5 uppercase tracking-tight leading-[1.1]">
                  {item.title}
                </h2>
                <p className="text-base sm:text-lg text-gray-500 leading-relaxed font-medium mb-6">
                  {item.desc}
                </p>
                <ul className="space-y-3.5">
                  {item.bullets.map((feat, j) => (
                    <li key={j} className="flex items-start gap-3 text-brand-dark font-bold">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {i === 1 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>
                        Gender-Flex Casting adapts pronouns, titles &amp; outfits to any group mix
                      </span>
                    </li>
                  )}
                  {i === 2 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>
                        Have more than 6 guests? Extra friends join free as &ldquo;Detective [Their Name]&rdquo;
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex-1">
                {i === 0 && (
                  <Link
                    href={`/${locale}/themes/love-on-the-rocks`}
                    className="block rounded-[2rem] border-2 border-gray-100 bg-brand-dark overflow-hidden shadow-2xl group hover:border-brand-pink transition-all"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src="/moodboard/lotr/main-promo-murder.jpg"
                        alt="Love On The Rocks - Reality TV Reunion Murder Mystery"
                        fill
                        sizes="(max-width: 1024px) 100vw, 600px"
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/30 to-transparent" />
                      <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                        <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                          Active Package
                        </span>
                        <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                          6–16 Roles (+ Extra Detectives)
                        </span>
                      </div>
                      <div className="absolute bottom-4 left-6 right-6">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1">
                          Reality TV Reunion · Holiday · Noir
                        </p>
                        <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                          Love On The Rocks
                        </h3>
                      </div>
                    </div>
                    <div className="p-6 bg-brand-dark border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap gap-1.5">
                        {['✨ Clean (SFW)', '🌶️ Mild', '🌶️🌶️ Spicy', '🔥🔥🔥 Filthy'].map((spice) => (
                          <span
                            key={spice}
                            className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-bold"
                          >
                            {spice}
                          </span>
                        ))}
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink group-hover:translate-x-1 transition-transform">
                        Explore Themes →
                      </span>
                    </div>
                  </Link>
                )}

                {i === 1 && (
                  <div className="rounded-[2rem] border-2 border-gray-100 bg-brand-gray p-6 sm:p-8 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">
                          Step 2 · Cast Your Crew
                        </span>
                        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                          Real Friends → Iconic Roles
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                        ✨ Gender-Flex
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          guest: 'Chloe (Bride-to-be)',
                          role: 'The Star',
                          note: 'Loves espresso martinis & dramatic toasts',
                          badge: 'Catalyst',
                        },
                        {
                          guest: 'Marco (Best Man)',
                          role: 'The Ex',
                          note: 'Still brings up the 2023 Ibiza holiday',
                          badge: 'Suspect',
                        },
                        {
                          guest: 'Sam (Host)',
                          role: 'The Producer',
                          note: 'Spoiler-Free Host Mode enabled',
                          badge: 'Host Playing',
                        },
                        {
                          guest: '+ Extra Friends (Sarah, Alex…)',
                          role: 'Detective [Name]',
                          note: 'Join free on party night with interrogation prompts!',
                          badge: 'Extra Detective',
                        },
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between gap-4 shadow-sm"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-brand-dark text-sm">
                                {row.guest}
                              </span>
                              <span className="text-gray-300">→</span>
                              <span className="font-black text-brand-pink text-sm uppercase">
                                {row.role}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              &ldquo;{row.note}&rdquo;
                            </p>
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
                        <div className="w-10 h-10 rounded-xl bg-brand-pink/20 border border-brand-pink/40 flex items-center justify-center text-brand-pink text-lg">
                          📱
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                            Live Digital Playroom + PDFs
                          </span>
                          <h3 className="text-lg font-black uppercase tracking-tight">
                            Game PIN: 146 492
                          </h3>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">
                        Ready in ~20m
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2">
                          Interactive Mobile Lobby
                        </p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Join via 6-digit PIN or QR code
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Host-gated clues &amp; round voting
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Extra friends play as Detective [Name]
                          </li>
                        </ul>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">
                          Print-Ready PDF Kit
                        </p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Spoiler-Free Host Guide PDF
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Custom Suspect Booklets
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-brand-pink font-black">✓</span> Printable Crime Scene Evidence
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =====================================================================
          SECTION 2: INTERACTIVE LIVE GAME ROOM PREVIEW
      ===================================================================== */}
      <InteractivePackPreview locale={locale} />

      {/* =====================================================================
          SECTION 3: HOW TO PLAY ON PARTY NIGHT (ROUNDED BRANDED CARDS)
      ===================================================================== */}
      <div className="container mx-auto px-6 max-w-6xl py-24 lg:py-32 space-y-28">
        <div className="space-y-14">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-[0.2em]">
              How to Play on Party Night
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-brand-dark uppercase tracking-tight leading-none">
              Host on Your <span className="text-brand-pink italic">Laptop.</span> Guests on Their <span className="text-brand-pink italic">Phones.</span>
            </h2>
            <p className="text-gray-500 font-semibold text-base sm:text-lg leading-relaxed">
              We recommend the <strong>Host uses a laptop</strong> while everyone else uses their phone. That way guest phones stay super simple and clean while only you control when each round&apos;s clues and voting unlock:
            </p>
          </div>

          <div className="space-y-6 max-w-5xl mx-auto">
            {partyRunOfShow.map((phase) => (
              <div
                key={phase.num}
                className="card-branded p-7 sm:p-10 border-2 border-gray-100 hover:border-brand-pink transition-all flex flex-col lg:flex-row gap-6 lg:gap-10 items-start group"
              >
                <span className="text-6xl lg:text-7xl font-black text-gray-100 leading-none group-hover:text-brand-pink/20 transition-colors shrink-0">
                  {phase.num}
                </span>

                <div className="flex-1 space-y-5 w-full">
                  <div>
                    <span className="inline-block px-3.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-2">
                      {phase.stage}
                    </span>
                    <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                      {phase.title}
                    </h3>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-brand-gray border border-gray-200/70 space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-brand-dark">
                        💻 On the Host&apos;s Laptop
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                        {phase.hostAction}
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-brand-pink/5 border border-brand-pink/20 space-y-1.5">
                      <p className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                        📱 On Guests&apos; Phones
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                        {phase.guestView}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================================
            SECTION 4: 3 FLEXIBLE WAYS TO PLAY (INCLUDING EXTRA GUEST DETECTIVES)
        ===================================================================== */}
        <div className="p-8 sm:p-12 lg:p-16 bg-brand-dark text-white rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border-2 border-brand-pink/30">
          <div className="max-w-3xl mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest mb-4">
              Flexible Format · 1 to 16+ People
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.05] mb-4">
              Host a Full-Cast Party — Or Bring <span className="text-brand-pink italic">Extra Guest Detectives</span>
            </h2>
            <p className="text-gray-300 font-medium text-base sm:text-lg leading-relaxed">
              Every mystery story features at least <strong>6 interlocking characters</strong> (1 Victim + 5 Suspects) so the alibis and motives tangle properly — plus <strong>unlimited Extra Guest Detectives (&ldquo;Detective [Name]&rdquo;)</strong> if more friends come along!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🎭 1 · Dinner Party Roleplay (6–16 Players)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Everyone Plays a Suspect Around the Table
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Having friends over for a dinner party, birthday, or hen night? Cast your guests into their own custom character roles with personalized outfit guides, secret alibis, and round-by-round talking points.
              </p>
            </div>

            <div className="bg-brand-pink/15 border-2 border-brand-pink rounded-3xl p-8 space-y-3 shadow-lg">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🕵️ 2 · Have More Than 6 Guests? ($0 Extra)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Extra Friends Join as &ldquo;Detective [Name]&rdquo;
              </h3>
              <p className="text-sm text-gray-200 font-medium leading-relaxed">
                Have 7, 8, or 10+ friends coming to a 6-character mystery (or last-minute plus-ones)? Any extra guests simply scan the QR code and join as <strong className="text-white">Detective [Their Name]</strong> — getting a Suspect Interrogation Lineup, live phone clues, and round voting!
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🕵️‍♀️ 3 · Couch Detective Mode (1–5 Players)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Solve the Whole Case File Together Over Wine
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Playing solo, on a date night, or with a small group? Cast your friends, a <strong>Hybrid mix of you + fictional suspects</strong>, or generate a <strong>100% Fictional Cast</strong> in one click — then inspect all suspect dossiers, texts, CCTV photos, and voice wiretaps together!
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 5: WHAT'S IN THE PACK
        ===================================================================== */}
        <div className="py-12 sm:py-20 px-8 sm:px-12 lg:px-20 bg-brand-gray rounded-[2.5rem] lg:rounded-[3rem] border-2 border-gray-100">
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
    </div>
  );
}
