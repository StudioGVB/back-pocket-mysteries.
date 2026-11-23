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
      'See how Back Pocket Mysteries works from 3-step AI cast customization to party night: Host on a laptop, guests on their phones, host-gated round voting, and unlimited Extra Guest Detectives.',
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
      imageLabel: 'Theme Selection',
    },
    {
      ...dict.howItWorks.steps.guests,
      step: '02',
      accent: 'bg-brand-blue',
      imageLabel: 'Guest Personalisation',
    },
    {
      ...dict.howItWorks.steps.download,
      step: '03',
      accent: 'bg-emerald-500',
      imageLabel: 'Pack Download',
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
      stagePill: 'Stage 0 • Pre-Party Mingle',
      title: 'Guests Scan QR & Claim Their Role (or Join as “Detective [Name]”)',
      hostAction:
        'Open the Playroom on your laptop and pop open the full-screen QR Poster / 6-digit Game PIN while guests arrive with welcome drinks.',
      guestView:
        'Guests tap their character card in the 2-column mobile Lobby (or extra friends type their name at the bottom to join as 🕵️ Detective [Their Name]). Everyone sees their Party Action Cheat-Sheet & “Who to Talk to First” icebreakers while clues stay locked.',
      badge: '🔒 Clues & Voting Safely Locked',
      accent: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
    },
    {
      stagePill: 'Stages 1 & 2 • Round 1 Clues → Vote 1',
      title: 'Round 1 Evidence Drops & Host-Gated First Vote',
      hostAction:
        'Tap “Unlock Round 1 Clues” on your laptop and read the spoiler-free Round 1 announcement script. Once the room has mingled and inspected the clues, tap “Open Round 1 Voting”.',
      guestView:
        'Guests’ phones automatically open the clean Round 1 Clue Feed (leaked iMessage threads, CCTV photos, receipts & voice wiretaps). When you open voting, the Round 1 Suspect Vote card unlocks at the top of their phones!',
      badge: '🗳️ Host Decides When Voting Opens',
      accent: 'border-brand-pink/40 bg-brand-pink/15 text-brand-pink',
    },
    {
      stagePill: 'Stages 3 & 4 • Round 2 Clues → Vote 2',
      title: 'Round 2 Forensic Contradictions & Alibi Cracks',
      hostAction:
        'Over the main course or second round of drinks, tap “Unlock Round 2 Clues” on your laptop to drop deeper forensic evidence and 15-minute timeline gaps, then open Round 2 Voting.',
      guestView:
        'New Round 2 evidence drops straight onto every phone (with Round 1 clues accessible in 1 tap). Suspects and Extra Guest Detectives grill each other and lock in their Round 2 vote.',
      badge: '🔍 Multi-Modal Texts, CCTV & Audio',
      accent: 'border-sky-400/40 bg-sky-500/15 text-sky-300',
    },
    {
      stagePill: 'Stages 5 & 6 • Round 3 Clues → Final Vote',
      title: 'Round 3 Decisive Proof & Final Killer Accusation',
      hostAction:
        'Unlock the final Round 3 evidence and open the Final Accusation Vote. Watch the live vote counter on your laptop (e.g. 🗳️ 8/8 Votes In) as every player locks in their final theory.',
      guestView:
        'Players cross-reference the decisive Round 3 clues to eliminate the final red herrings and lock in their Final Killer Accusation & motive.',
      badge: '⏱️ Watertight Forensic Clue Logic',
      accent: 'border-amber-400/40 bg-amber-500/15 text-amber-300',
    },
    {
      stagePill: 'Stage 7 • Final Reveal & Leaderboard',
      title: 'The Killer’s Confession & Combined Detective Leaderboard',
      hostAction:
        'With 1 click on “Trigger Final Reveal”, broadcast the solution to every phone in the room — and discover who the killer is right alongside your guests!',
      guestView:
        'Every phone unlocks the Killer’s Dramatic Confession, the complete Crime Timeline Breakdown, each player’s Personal Detective Scorecard, and the Combined Cast + Guest Detective Leaderboard.',
      badge: '🏆 100% Spoiler-Free Until Stage 7',
      accent: 'border-purple-400/40 bg-purple-500/15 text-purple-300',
    },
  ];

  return (
    <div className="bg-white">
      {/* Hero Header */}
      <div className="relative pt-8 pb-12 lg:pt-16 lg:pb-16 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 text-[11px] font-black tracking-[0.2em] uppercase text-brand-pink bg-brand-pink/10 rounded-full">
              {dict.howItWorks.badge} • Host on Laptop, Guests on Phones
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-brand-dark mb-6 tracking-tighter uppercase leading-[0.95]">
              {dict.howItWorks.title.split(',')[0]},
              <br />
              <span className="text-brand-pink italic">{dict.howItWorks.title.split(',')[1]}</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed font-medium max-w-3xl">
              {dict.howItWorks.subtitle}
            </p>
          </div>

          {/* Quick Jump Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            {[
              { href: '#setup-steps', label: '1. 3-Step Pre-Party Setup (~20m)' },
              { href: '#live-preview', label: '2. Interactive Game Room Preview' },
              { href: '#how-to-play-night', label: '3. How to Play on Party Night (8 Stages)' },
              { href: '#group-formats', label: '4. Extra Guests & Group Formats' },
              { href: '#pack-contents', label: '5. What’s Included in the Kit' },
            ].map((pill) => (
              <a
                key={pill.href}
                href={pill.href}
                className="px-4 py-2 rounded-full bg-slate-100 hover:bg-brand-pink hover:text-white text-brand-dark text-xs font-black uppercase tracking-wider transition-colors"
              >
                {pill.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: 3-STEP PRE-PARTY SETUP
      ===================================================================== */}
      <div id="setup-steps" className="container mx-auto px-6 pb-20 lg:pb-28">
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
                    <li key={j} className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                  {i === 0 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>
                        4-Tier Spice Rubric (Clean ✨ SFW, Mild 🌶️, Spicy 🌶️🌶️, Filthy 🔥🔥🔥) &amp; 3 Difficulty Tiers
                      </span>
                    </li>
                  )}
                  {i === 1 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>
                        Bidirectional Gender-Flex Casting — any role seamlessly adapts pronouns, titles &amp; outfits to any guest gender
                      </span>
                    </li>
                  )}
                  {i === 2 && (
                    <li className="flex items-start gap-3 text-brand-dark font-bold text-sm sm:text-base">
                      <div
                        className={`mt-0.5 w-5 h-5 rounded-full ${item.accent} flex items-center justify-center text-[10px] text-white shrink-0`}
                      >
                        ✓
                      </div>
                      <span>
                        Have more than 6 guests? Unlimited extra friends join free as &ldquo;🕵️ Detective [Their Name]&rdquo;
                      </span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex-1">
                {i === 0 && (
                  <div className="space-y-4">
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
                          <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-widest border border-white/15">
                            6–16 Roles (+ Unlimited Extra Detectives)
                          </span>
                        </div>
                        <div className="absolute bottom-4 left-6 right-6">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-1">
                            Reality TV Reunion • Holiday • Noir
                          </p>
                          <h3 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                            Pick Your Story, Spice &amp; Difficulty
                          </h3>
                        </div>
                      </div>
                      <div className="p-5 bg-brand-dark border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                        {[
                          { badge: '✨ Clean (SFW)', sub: '0 Affairs • 0 Cussing' },
                          { badge: '🌶️ Mild', sub: 'Affairs • Clean Dialog' },
                          { badge: '🌶️🌶️ Spicy', sub: 'Cussing & Scandal' },
                          { badge: '🔥🔥🔥 Filthy', sub: '18+ After-Dark' },
                        ].map((s) => (
                          <div
                            key={s.badge}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10"
                          >
                            <p className="text-[10px] font-black text-white">{s.badge}</p>
                            <p className="text-[9px] font-bold text-slate-400 mt-0.5">{s.sub}</p>
                          </div>
                        ))}
                      </div>
                    </Link>
                  </div>
                )}

                {i === 1 && (
                  <div className="rounded-[2rem] border-2 border-gray-100 bg-brand-gray p-6 sm:p-8 shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue block">
                          Step 2 • 4-Step Casting Quiz &amp; Gender-Flex Engine
                        </span>
                        <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                          Real Friends → Custom Costume Portraits &amp; Clues
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                        📸 AI Photo Scanner
                      </span>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          guest: 'Luke (Host)',
                          role: 'The Husband',
                          note: 'AI studio portrait + Spoiler-Free Host Mode enabled',
                          badge: '💀 Victim Catalyst',
                        },
                        {
                          guest: 'Gabby',
                          role: 'The Wife',
                          note: 'Emerald silk dress outfit guide + matching silver hairpin clue',
                          badge: '🕵️ Suspect',
                        },
                        {
                          guest: 'Jason',
                          role: 'The Co-Worker',
                          note: 'Placed directly into the 7:55 PM hallway CCTV surveillance photo',
                          badge: '🕵️ Suspect',
                        },
                        {
                          guest: '+ Extra Friends (Sarah, Alex…)',
                          role: 'Detective [Name]',
                          note: 'Join on party night in 1 tap with a Suspect Interrogation Lineup!',
                          badge: '🕵️ Extra Detective',
                        },
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-2xl p-3.5 border border-gray-100 flex items-center justify-between gap-3 shadow-sm"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black text-brand-dark text-xs sm:text-sm">
                                {row.guest}
                              </span>
                              <span className="text-gray-300">→</span>
                              <span className="font-black text-brand-pink text-xs sm:text-sm uppercase">
                                {row.role}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                              &ldquo;{row.note}&rdquo;
                            </p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-brand-gray text-brand-dark text-[9px] font-black uppercase tracking-widest shrink-0">
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
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                            1-Click Group Chat Link + Live Game PIN
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
                          💻 Host on Laptop + 📱 Guests on Phones
                        </p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> Host controls the 8 stages &amp; voting gates
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> Clean mobile Role Cheat-Sheet &amp; Clue Feed
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> Extra friends join as &ldquo;Detective [Name]&rdquo;
                          </li>
                        </ul>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-blue mb-2">
                          🖨️ Print-Ready PDF Kit + Party Toolkit
                        </p>
                        <ul className="space-y-2 text-xs text-gray-300 font-semibold">
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> Formatted Suspect Booklets &amp; Host Guide
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> 1-Click Group Chat Character Invite Link
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-emerald-400 font-black">✓</span> Spotify Playlist &amp; Signature Drink Recipes
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
          SECTION 2: INTERACTIVE LIVE PLAYROOM WALKTHROUGH (WHAT IT LOOKS LIKE)
      ===================================================================== */}
      <div id="live-preview">
        <InteractivePackPreview locale={locale} />
      </div>

      {/* =====================================================================
          SECTION 3: HOW TO PLAY ON PARTY NIGHT (8-STAGE RUN OF SHOW)
      ===================================================================== */}
      <div id="how-to-play-night" className="container mx-auto px-6 py-24 lg:py-32 space-y-20">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-[0.2em]">
            🎉 How to Play on Party Night • Step-by-Step Run of Show
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-brand-dark uppercase tracking-tight leading-none">
            Host on Your <span className="text-brand-pink italic">Laptop.</span> Guests on Their <span className="text-brand-pink italic">Phones.</span>
          </h2>
          <p className="text-gray-500 font-medium text-base sm:text-lg leading-relaxed max-w-3xl mx-auto">
            We designed the Live Playroom so guest phones stay super clean and simple while you mingle with a drink in hand. Only the <strong>Host</strong> sees the 8-stage controller on their laptop and decides when each round&apos;s clues and voting unlock:
          </p>
        </div>

        {/* 5-Phase Visual Run of Show Timeline */}
        <div className="max-w-5xl mx-auto space-y-5">
          {partyRunOfShow.map((phase, idx) => (
            <div
              key={phase.stagePill}
              className="rounded-[2rem] bg-slate-900 text-white border border-slate-800 p-6 sm:p-8 shadow-xl space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-brand-pink text-white text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                    {phase.stagePill}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${phase.accent}`}
                >
                  {phase.badge}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {phase.title}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/25 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                    💻 What the Host Does (On Laptop)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {phase.hostAction}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                    📱 What Guests &amp; Extra Detectives See (On Phones)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {phase.guestView}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* =====================================================================
            SECTION 4: FLEXIBLE GROUP FORMATS (ROLEPLAY, EXTRA DETECTIVES, CASE FILE)
        ===================================================================== */}
        <div
          id="group-formats"
          className="p-8 sm:p-12 lg:p-16 bg-brand-dark text-white rounded-[2rem] lg:rounded-[3rem] shadow-2xl border-2 border-brand-pink/30"
        >
          <div className="max-w-3xl mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest mb-4">
              Flexible Format • 1 to 16+ People
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight leading-[1.05] mb-4">
              Host a Full-Cast Party - Or Bring <span className="text-brand-pink italic">Extra Guest Detectives</span>
            </h2>
            <p className="text-gray-300 font-medium text-base sm:text-lg leading-relaxed">
              Every mystery story features at least <strong>6 interlocking characters</strong> (1 Victim + 5 Suspects) so the alibis, motives, and backstories tangle properly — plus <strong>unlimited Extra Guest Detectives (&ldquo;Detective [Name]&rdquo;)</strong> if more friends come along!
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🎭 Option 1 • Dinner Party Roleplay (6–16 Players)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Everyone Plays a Character Around the Table
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Having friends over for a dinner party, birthday, or hen night? Cast your guests into their own custom character roles with personalized outfit guides, secret alibis, and round-by-round talking points.
              </p>
            </div>

            <div className="bg-sky-500/10 border border-sky-400/35 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-sky-300 block">
                🕵️ Have More Than 6 Guests? • Unlimited Extra Detectives
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Extra Friends Join Free as &ldquo;Detective [Name]&rdquo;
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Have 7, 8, or 10+ friends coming to a 6-character mystery (or last-minute plus-ones)? Any extra guests simply scan the QR code and join as <strong className="text-sky-300">Detective [Their Name]</strong> — getting an official Detective Briefing with suspect interrogation questions, live phone clues, and round voting!
              </p>
            </div>

            <div className="bg-brand-pink/10 border border-brand-pink/30 rounded-3xl p-8 space-y-3">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink block">
                🕵️‍♀️ Option 2 • Couch Detective / Case-File Mode (1–5 Players)
              </span>
              <h3 className="text-2xl font-black uppercase tracking-tight text-white">
                Solve the Whole Package Together Over Wine
              </h3>
              <p className="text-sm text-gray-300 font-medium leading-relaxed">
                Playing solo, on a date night, or with a small group? Cast your friends, a <strong>Hybrid mix of you + fictional suspects</strong>, or generate a <strong>100% Fictional Mystery Cast</strong> in one click — then inspect all suspect dossiers, group chats, CCTV photos, and audio wiretaps together to catch the killer!
              </p>
            </div>
          </div>
        </div>

        {/* =====================================================================
            SECTION 5: INSIDE THE LIVE PLAYROOM FEATURE GRID
        ===================================================================== */}
        <div className="space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-[0.2em]">
              📱 Built for Party Night • Zero App Store Download
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
              Every Feature Inside the <span className="text-brand-pink italic">Live Hosting Portal</span>
            </h2>
            <p className="text-gray-500 font-medium text-sm sm:text-base leading-relaxed">
              Whether your guests prefer holding printed booklets or playing 100% on their phones, our live Playroom keeps the night effortless, structured, and spoiler-free.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: '📷',
                tag: 'Instant Table Join',
                title: '1-Scan QR Code & 6-Digit Game PIN',
                desc: 'Open the full-screen QR code modal on your laptop or TV. Guests scan once with their phone camera to enter the room and claim their character card.',
              },
              {
                icon: '🎭',
                tag: '2-Column Mobile Cheat-Sheet',
                title: 'Roleplay Cues, Secrets & Icebreakers',
                desc: 'Guests see “How to Play Your Role Tonight”, “Your Hidden Secret” at eye level, and tap-to-reveal “Who to Talk to First” conversation starters.',
              },
              {
                icon: '🕵️',
                tag: 'Have More Than 6 Guests?',
                title: 'Extra Friends Play as “Detective [Name]”',
                desc: 'Unlimited extra guests join on their phone as “Detective [Their Name]” with an official Detective Briefing, Suspect Interrogation Lineup, live clues, and voting.',
              },
              {
                icon: '📱',
                tag: 'Clean Mobile Clue Feed',
                title: 'Live Texts, CCTV & Audio Wiretaps',
                desc: 'Guests receive round-by-round evidence drops right on their phone — leaked iMessage threads, crime-scene CCTV photos, and multi-speaker voice wiretaps.',
              },
              {
                icon: '💻',
                tag: 'Host Laptop Controller',
                title: 'Host-Gated Round Clues & Voting',
                desc: 'Only the host sees the 8-stage timeline bar and decides when voting opens for each round, with a live room vote counter and spoiler-free read-aloud scripts.',
              },
              {
                icon: '🏆',
                tag: 'Final Reveal & Awards',
                title: 'Combined Cast & Detective Leaderboard',
                desc: 'At the Final Reveal, every phone unlocks the Killer’s Confession, Crime Timeline Breakdown, Personal Scorecard, and the Combined Room Leaderboard.',
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="rounded-[2rem] bg-slate-50 border border-slate-100 p-8 flex flex-col justify-between space-y-4 hover:border-brand-pink transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-3xl">{feat.icon}</span>
                    <span className="px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[9px] font-black uppercase tracking-widest">
                      {feat.tag}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* =====================================================================
            SECTION 6: WHAT'S IN THE PACK
        ===================================================================== */}
        <div
          id="pack-contents"
          className="py-12 sm:py-20 px-8 sm:px-12 lg:px-24 bg-brand-gray rounded-[2rem] lg:rounded-[3rem] border-2 border-gray-100"
        >
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
              <div key={i} className="card-branded p-10 group hover:border-brand-pink">
                <div className="w-12 h-12 bg-brand-pink rounded-xl mb-6 group-hover:scale-110 transition-transform flex items-center justify-center shadow-lg shadow-brand-pink/20 text-xl">
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
        <div className="text-center bg-brand-dark rounded-[2rem] lg:rounded-[3rem] p-8 sm:p-12 lg:p-24 relative overflow-hidden shadow-2xl">
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
