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
    },
    {
      ...dict.howItWorks.steps.guests,
      step: '02',
    },
    {
      ...dict.howItWorks.steps.download,
      step: '03',
    },
  ];

  const partyRunOfShow = [
    {
      num: 'I',
      stage: 'Stage 00 · Pre-Party Mingle',
      title: 'QR Join, Character Claim & Extra Guest Detectives',
      hostAction:
        'Open the Playroom on your laptop and display the full-screen QR Poster or 6-digit Game PIN while guests arrive with welcome drinks.',
      guestView:
        'Guests tap their character card in the mobile Lobby—or extra friends type their name at the bottom to join as Detective [Their Name]. Everyone reads their Role Cheat-Sheet and icebreakers while clues stay locked.',
    },
    {
      num: 'II',
      stage: 'Stages 01 & 02 · Round 1',
      title: 'Round 1 Evidence Drop & First Suspect Ballot',
      hostAction:
        'Click “Unlock Round 1 Clues” on your laptop and read the brief spoiler-free Round 1 script. Once the room has mingled and inspected the evidence, click “Open Round 1 Voting”.',
      guestView:
        'Guest phones automatically open the clean Round 1 Clue Feed (leaked text threads, hallway CCTV stills, and voice wiretaps). When you open voting, the Round 1 Suspect Ballot appears at the top of their screen.',
    },
    {
      num: 'III',
      stage: 'Stages 03 & 04 · Round 2',
      title: 'Forensic Contradictions & 15-Minute Alibi Gaps',
      hostAction:
        'Over the main course or second round of drinks, unlock Round 2 Clues on your laptop to drop deeper forensic evidence and timeline contradictions, then open the Round 2 Ballot.',
      guestView:
        'Round 2 evidence drops straight onto every phone (with Round 1 clues accessible in one tap). Suspects and Extra Guest Detectives cross-examine each other and lock in their Round 2 vote.',
    },
    {
      num: 'IV',
      stage: 'Stages 05 & 06 · Round 3 & Final Vote',
      title: 'Decisive Proof & Final Killer Accusation',
      hostAction:
        'Unlock the decisive Round 3 clues and open the Final Accusation Ballot. Watch the live vote counter on your laptop (e.g. 8 of 8 Votes In) as every player locks in their final theory.',
      guestView:
        'Players align the final timestamps to eliminate the remaining decoys and lock in their Final Killer Accusation and motive on their phones.',
    },
    {
      num: 'V',
      stage: 'Stage 07 · Final Reveal',
      title: 'The Confession & Combined Room Leaderboard',
      hostAction:
        'Click “Trigger Final Reveal” on your laptop to broadcast the solution to every phone in the room—and discover who the killer is right alongside your guests.',
      guestView:
        'Every phone unlocks the Killer’s Confession, the complete Crime Timeline Breakdown, each player’s Personal Detective Scorecard, and the Combined Cast + Guest Detective Leaderboard.',
    },
  ];

  const portalCapabilities = [
    {
      num: '01',
      meta: 'Instant Table Access',
      title: 'QR Code & 6-Digit PIN Join',
      desc: 'No app downloads or guest accounts required. Guests scan once with their phone camera to enter the lobby and claim their character.',
    },
    {
      num: '02',
      meta: 'Mobile Role Dossier',
      title: 'Scannable Party Cheat-Sheet',
      desc: 'Each guest sees how to play their role, their hidden secret at eye level, and tap-to-reveal conversation prompts for specific friends in the room.',
    },
    {
      num: '03',
      meta: 'Have More Than 6 Guests?',
      title: 'Unlimited “Detective [Name]” Players',
      desc: 'Extra friends or last-minute plus-ones join free on their phones as Detective [Their Name] with a Suspect Interrogation Lineup, live clues, and round voting.',
    },
    {
      num: '04',
      meta: 'Multi-Modal Evidence',
      title: 'Texts, CCTV & Voice Wiretaps',
      desc: 'Clues drop round by round onto guest phones—including intercepted iMessage threads, crime-scene CCTV photos, and regional-accent audio wiretaps.',
    },
    {
      num: '05',
      meta: 'Laptop Pacing Controls',
      title: 'Host-Gated Clues & Voting',
      desc: 'Only the host sees the stage controller on their laptop and decides when voting opens for each round, while playing spoiler-free as a suspect.',
    },
    {
      num: '06',
      meta: 'End-of-Night Scoring',
      title: 'Combined Detective Leaderboard',
      desc: 'At the Final Reveal, both character suspects and extra Guest Detectives are scored across Rounds 1–3 on the shared room leaderboard.',
    },
  ];

  return (
    <div className="bg-white">
      {/* Editorial Hero Header */}
      <div className="pt-10 pb-14 lg:pt-16 lg:pb-20 border-b border-gray-200">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="max-w-4xl">
            <p className="text-[11px] font-black tracking-[0.25em] uppercase text-brand-pink mb-5">
              {dict.howItWorks.badge} · Host on Laptop, Guests on Phones
            </p>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-brand-dark mb-8 tracking-tighter uppercase leading-[0.92]">
              {dict.howItWorks.title.split(',')[0]},
              <br />
              <span className="text-brand-pink italic">{dict.howItWorks.title.split(',')[1]}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-medium max-w-2xl border-l-4 border-brand-pink pl-6">
              {dict.howItWorks.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: 3-STEP PRE-PARTY SETUP (~20 MINUTES)
      ===================================================================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-6 max-w-6xl space-y-24">
          {steps.map((item, i) => (
            <div
              key={i}
              className={`grid lg:grid-cols-12 gap-12 lg:gap-16 items-center ${
                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              {/* Copy Column */}
              <div className="lg:col-span-6 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="font-serif italic text-base tracking-widest text-brand-pink">
                    Step {item.step}
                  </span>
                  <span className="h-px w-12 bg-gray-300" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                    {i === 0
                      ? 'Theme, Spice & Difficulty'
                      : i === 1
                      ? 'Flexible Cast & Gender-Flex'
                      : 'Live Game PIN & Print PDFs'}
                  </span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tight leading-[1.05]">
                  {item.title}
                </h2>

                <p className="text-base sm:text-lg text-gray-500 leading-relaxed font-medium">
                  {item.desc}
                </p>

                <ul className="space-y-3 pt-2 border-t border-gray-200">
                  {item.bullets.map((feat, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base"
                    >
                      <span className="text-brand-pink font-black">—</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {i === 1 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <span className="text-brand-pink font-black">—</span>
                      <span>
                        Bidirectional Gender-Flex Casting adapts pronouns, titles, and outfits to any group mix
                      </span>
                    </li>
                  )}
                  {i === 2 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <span className="text-brand-pink font-black">—</span>
                      <span>
                        Have more than 6 guests? Unlimited extra friends join free as &ldquo;Detective [Their Name]&rdquo;
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Visual Column */}
              <div className="lg:col-span-6">
                {i === 0 && (
                  <div className="border border-gray-300/80 bg-white shadow-sm overflow-hidden">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-brand-dark">
                      <Image
                        src="/moodboard/lotr/main-promo-murder.jpg"
                        alt="Murder Mystery Theme & Vibe Selection"
                        fill
                        sizes="(max-width: 1024px) 100vw, 600px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent" />
                      <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1">
                            4 Spice Tiers · 3 Complexity Brackets
                          </p>
                          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                            Pick Your Story &amp; Tone
                          </h3>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-300">
                          6–16 Roles + Extra Detectives
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-300/80 divide-y sm:divide-y-0 sm:divide-x divide-gray-300/80 bg-white">
                      {[
                        { tier: 'Clean (SFW)', sub: '0 Affairs · 0 Cussing' },
                        { tier: 'Mild', sub: 'Affairs · Clean Dialog' },
                        { tier: 'Spicy', sub: 'Cussing & Scandal' },
                        { tier: 'Filthy', sub: '18+ Unfiltered' },
                      ].map((s) => (
                        <div key={s.tier} className="p-4">
                          <p className="text-xs font-black uppercase tracking-tight text-brand-dark">
                            {s.tier}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium mt-0.5">{s.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {i === 1 && (
                  <div className="border border-gray-300/80 bg-white shadow-sm">
                    <div className="p-6 border-b border-gray-300/80 flex items-center justify-between bg-brand-gray">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block">
                          4-Step Casting Roster
                        </span>
                        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                          Your Friends Become the Suspects
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                        Gender-Flex Enabled
                      </span>
                    </div>

                    <div className="divide-y divide-gray-200">
                      {[
                        {
                          guest: 'Luke (Host)',
                          role: 'The Husband',
                          detail: 'Custom studio portrait · Spoiler-Free Host Mode enabled',
                          tag: 'Story Catalyst',
                        },
                        {
                          guest: 'Gabby',
                          role: 'The Wife',
                          detail: 'Emerald silk dress code · Matching silver hairpin clue',
                          tag: 'Suspect',
                        },
                        {
                          guest: 'Jason',
                          role: 'The Co-Worker',
                          detail: 'Placed into the 7:55 PM hallway surveillance photo',
                          tag: 'Suspect',
                        },
                        {
                          guest: '+ Extra Guests (Sarah, Alex…)',
                          role: 'Detective [Name]',
                          detail: 'Join free on party night with a Suspect Interrogation Lineup',
                          tag: 'Extra Detective',
                        },
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          className="p-5 flex items-center justify-between gap-4 bg-white"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-brand-dark text-sm">
                                {row.guest}
                              </span>
                              <span className="text-gray-300">—</span>
                              <span className="font-black text-brand-pink text-sm uppercase">
                                {row.role}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                              {row.detail}
                            </p>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 shrink-0">
                            {row.tag}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {i === 2 && (
                  <div className="border border-gray-300/80 bg-brand-dark text-white p-8 sm:p-10 shadow-sm space-y-8">
                    <div className="flex items-end justify-between pb-6 border-b border-white/15">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-1">
                          Ready in ~20 Minutes
                        </span>
                        <h3 className="text-2xl font-black uppercase tracking-tight">
                          Live Game PIN: 146 492
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                        Digital + Print PDFs
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                          01 / Live Digital Portal
                        </p>
                        <ul className="space-y-2.5 text-xs text-gray-300 font-medium leading-relaxed">
                          <li className="pl-3 border-l border-white/25">
                            1-Click Group Chat link for pre-party outfit &amp; role previews
                          </li>
                          <li className="pl-3 border-l border-white/25">
                            Host controls the 8 stages &amp; voting gates from a laptop
                          </li>
                          <li className="pl-3 border-l border-white/25">
                            Unlimited extra friends join as Detective [Their Name]
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                          02 / Print-Ready PDF Kit
                        </p>
                        <ul className="space-y-2.5 text-xs text-gray-300 font-medium leading-relaxed">
                          <li className="pl-3 border-l border-white/25">
                            Formatted Character Booklets &amp; Spoiler-Free Host Guide
                          </li>
                          <li className="pl-3 border-l border-white/25">
                            Printable crime-scene photos, chat logs &amp; receipts
                          </li>
                          <li className="pl-3 border-l border-white/25">
                            Tailored Spotify playlist &amp; signature cocktail guide
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
      </section>

      {/* =====================================================================
          SECTION 2: INTERACTIVE PRODUCT WALKTHROUGH (WHAT IT LOOKS LIKE)
      ===================================================================== */}
      <InteractivePackPreview locale={locale} />

      {/* =====================================================================
          SECTION 3: HOW PARTY NIGHT RUNS (ARCHITECTURAL HAIRLINE TABLE)
      ===================================================================== */}
      <section className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 lg:mb-16 gap-6 pb-8 border-b border-gray-300/80">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                Party Night Run Sheet · 5 Phases
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                Host on a <span className="text-brand-pink italic">Laptop.</span> Guests on <span className="text-brand-pink italic">Phones.</span>
              </h2>
            </div>
            <p className="text-gray-500 font-medium text-sm sm:text-base max-w-md leading-relaxed">
              Guest phones stay clean and distraction-free while you mingle. Only the <strong>Host</strong> sees the round controller on their laptop and decides when each round&apos;s clues and voting unlock.
            </p>
          </div>

          {/* Architectural Hairline Run-of-Show Grid */}
          <div className="border-t border-l border-gray-300/80 bg-white shadow-sm">
            {partyRunOfShow.map((phase) => (
              <div
                key={phase.num}
                className="grid lg:grid-cols-12 border-r border-b border-gray-300/80 bg-white hover:bg-brand-gray/40 transition-colors"
              >
                {/* Col 1: Phase Number & Title */}
                <div className="lg:col-span-4 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-300/80 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-serif italic text-sm tracking-widest text-brand-pink">
                      No. {phase.num}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      {phase.stage}
                    </span>
                  </div>
                  <h3 className="text-xl lg:text-2xl font-black text-brand-dark uppercase tracking-tight leading-snug">
                    {phase.title}
                  </h3>
                </div>

                {/* Col 2: On the Host's Laptop */}
                <div className="lg:col-span-4 p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-gray-300/80 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-dark">
                    On the Host&apos;s Laptop
                  </p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {phase.hostAction}
                  </p>
                </div>

                {/* Col 3: On Guests' Phones */}
                <div className="lg:col-span-4 p-8 lg:p-10 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                    On Guests&apos; Phones
                  </p>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed">
                    {phase.guestView}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 4: THREE WAYS TO HOST (ARCHITECTURAL 3-COLUMN GRID)
      ===================================================================== */}
      <section className="py-20 lg:py-28 bg-brand-gray border-t border-gray-300/80">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 lg:mb-16 gap-6 pb-8 border-b border-gray-300/80">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                Flexible Group Formats · 1 to 16+ People
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                Built for <span className="text-brand-pink italic">Any Group Size.</span>
              </h2>
            </div>
            <p className="text-gray-500 font-medium text-sm sm:text-base max-w-md leading-relaxed">
              Every mystery story features at least 6 interlocking characters so the alibis and motives tangle properly—plus unlimited Extra Guest Detectives if more friends arrive.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 border-t border-l border-gray-300/80 bg-white shadow-sm">
            {[
              {
                num: 'I',
                meta: '6–16 Players · Full Roleplay',
                title: 'Dinner Party Roleplay',
                desc: 'Assign each guest attending your dinner party, birthday, or hen night to their own custom character role with personalized outfit guides, secret alibis, and round-by-round talking points.',
                foot: 'Everyone Plays a Suspect Around the Table',
              },
              {
                num: 'II',
                meta: 'Unlimited Extra Guests · $0 Extra',
                title: 'Extra Guest Detectives',
                desc: 'Have more than 6 guests coming (or last-minute plus-ones)? Any additional friends simply scan the party QR code and join as Detective [Their Name]—complete with a Suspect Interrogation Lineup, live clues, and round voting.',
                foot: 'No One Ever Sits on the Sidelines',
              },
              {
                num: 'III',
                meta: '1–5 Players · Zero Acting Required',
                title: 'Couch Detective Case File',
                desc: 'Playing solo, on a date night, or with a small group? Cast yourselves + fictional suspects (or a 100% Fictional Cast in one click) and inspect all suspect dossiers, texts, CCTV photos, and voice wiretaps together.',
                foot: 'Solve It Together Over Wine',
              },
            ].map((fmt) => (
              <div
                key={fmt.num}
                className="p-8 lg:p-10 border-r border-b border-gray-300/80 flex flex-col justify-between bg-white"
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-serif italic text-sm tracking-widest text-brand-pink">
                      No. {fmt.num}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      {fmt.meta}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight mb-4">
                    {fmt.title}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-500 font-medium leading-relaxed mb-8">
                    {fmt.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <span className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-dark">
                    {fmt.foot}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 5: 6 CORE PORTAL CAPABILITIES (ARCHITECTURAL 3x2 GRID)
      ===================================================================== */}
      <section className="py-20 lg:py-28 bg-white border-t border-gray-200">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 lg:mb-16 gap-6 pb-8 border-b border-gray-300/80">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
                What&apos;s Included in Every Pack
              </p>
              <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
                Every Detail <span className="text-brand-pink italic">Handled.</span>
              </h2>
            </div>
            <p className="text-gray-500 font-medium text-sm sm:text-base max-w-md leading-relaxed">
              Every mystery includes both our interactive live portal and formatted printable PDFs.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-gray-300/80 bg-white shadow-sm">
            {portalCapabilities.map((cap) => (
              <div
                key={cap.num}
                className="p-8 lg:p-10 border-r border-b border-gray-300/80 bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-serif italic text-sm tracking-widest text-gray-400">
                      {cap.num}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-pink">
                      {cap.meta}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight mb-3">
                    {cap.title}
                  </h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Final CTA Banner */}
          <div className="mt-20 bg-brand-dark text-white p-10 sm:p-16 lg:p-20 text-center">
            <div className="max-w-2xl mx-auto">
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-4">
                Ready in ~20 Minutes
              </p>
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white mb-6 uppercase tracking-tighter leading-[0.95]">
                {dict.howItWorks.cta.title.split(',')[0]},
                <br />
                <span className="text-brand-pink italic">{dict.howItWorks.cta.title.split(',')[1]}</span>
              </h2>
              <p className="text-base sm:text-lg text-gray-400 mb-10 font-medium">
                {dict.howItWorks.cta.desc.split('{{price}}')[0]}
                <PriceDisplay tier="basic" locale={locale as Locale} />
                {dict.howItWorks.cta.desc.split('{{price}}')[1]}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={`/${locale}/themes`}
                  className="px-10 py-5 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all"
                >
                  {dict.howItWorks.cta.ctaThemes}
                </Link>
                <Link
                  href={`/${locale}/pricing`}
                  className="px-10 py-5 bg-white/10 text-white border border-white/20 rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-dark transition-all"
                >
                  {dict.howItWorks.cta.ctaPricing}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
