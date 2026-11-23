'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type PreviewTab = 'cheatsheet' | 'clues' | 'detective' | 'host';

interface SampleClueItem {
  id: string;
  round: string;
  time: string;
  format: 'sms' | 'cctv' | 'audio';
  badge: string;
  title: string;
  sender?: string;
  messages?: { from: string; text: string; time: string; isRight?: boolean }[];
  caption?: string;
  transcript?: string;
  takeaway: string;
}

const SAMPLE_CLUES: SampleClueItem[] = [
  {
    id: 'clue-sms',
    round: 'Round 1 • Clue 1 of 6',
    time: '7:32 PM',
    format: 'sms',
    badge: '💬 Intercepted iMessage Thread',
    title: 'Private Text Message to The Victim',
    sender: '❤️ Private Message',
    messages: [
      {
        from: 'The Mistress (Kiri)',
        text: "Sneak into the coat closet before dinner. I can't keep smiling across the table like we're all just one big happy street.",
        time: '7:32 PM • Delivered ✓✓',
      },
      {
        from: 'The Husband (Luke)',
        text: 'Not tonight. Someone left a printed bank transfer in my coat pocket — someone in this house knows.',
        time: '7:34 PM • Read',
        isRight: true,
      },
    ],
    takeaway:
      'Places The Mistress and The Victim meeting secretly near the hallway coat closet 25 minutes before the murder window.',
  },
  {
    id: 'clue-cctv',
    round: 'Round 1 • Clue 2 of 6',
    time: '7:55 PM',
    format: 'cctv',
    badge: '📹 Hallway Nest Cam Frame',
    title: 'Bar Cart Surveillance Still (19:55:14)',
    caption:
      'CAM 02 • DINING HALLWAY — Captures The Co-Worker (Jason) standing alone by the crystal decanter at 7:55 PM while everyone else was in the living room for the holiday toast.',
    takeaway:
      'Contradicts Jason’s claim during Round 1 introductions that he never left the living room between 7:45 PM and 8:15 PM.',
  },
  {
    id: 'clue-audio',
    round: 'Round 1 • Clue 3 of 6',
    time: '8:04 PM',
    format: 'audio',
    badge: '🎙️ Smart-Speaker Voice Memo',
    title: 'Kitchen Alexa Accidental Recording (0:24)',
    transcript:
      '🔊 [VOICE WIRETAP — 8:04 PM]: "Put the bottle back under the sink right now! If Gabby sees that label before dessert, we are both finished."',
    takeaway:
      'Multi-speaker AI audio clue matched to your cast’s regional accents — playable out loud on a Bluetooth speaker or on every guest’s phone.',
  },
];

const SAMPLE_SUSPECTS = [
  { id: 'gabby', name: 'Gabby', role: 'The Wife', tag: 'Hostess • Inheritor' },
  { id: 'elia', name: 'Elia', role: 'The Sister-in-Law', tag: 'Matching Hairpin Alibi' },
  { id: 'kiri', name: 'Kiri', role: 'The Mistress', tag: '7:32 PM Closet Text' },
  { id: 'jason', name: 'Jason', role: 'The Co-Worker', tag: 'Spotted on 7:55 PM CCTV' },
  { id: 'matt', name: 'Matt', role: 'The Bestie', tag: 'Business Debt Motive' },
];

const HOST_STAGES = [
  {
    round: 0,
    short: '0. Mingle',
    title: 'Stage 0: Pre-Party Mingle & Character Claim Lobby',
    badge: '🔒 Clues & Voting Locked',
    mcScript:
      '“Welcome everyone! Scan the QR code or enter our 6-digit Game PIN on your phone to claim your character card — or join at the bottom as Detective [Your Name] if you’re an extra guest! Read your Party Cheat-Sheet and mingle using your Who to Talk to First prompts.”',
    guestViewSummary:
      'Guests see their Character Cheat-Sheet (or Detective Briefing) and mingle. Future clues and voting are hidden.',
    nextBtn: '🔍 Unlock Round 1 Clues →',
  },
  {
    round: 1,
    short: '1. R1 Clues',
    title: 'Stage 1: Round 1 Investigation & Evidence Drop',
    badge: '🔍 Round 1 Clues Live on Phones',
    mcScript:
      '“Round 1 Clues are now unlocked on your phones! Inspect the leaked text messages, CCTV stills, and voice wiretaps, and grill the suspects mentioned in each clue. Voting stays locked until everyone has examined the evidence.”',
    guestViewSummary:
      'Guests’ phones automatically switch to the Round 1 Clues tab. Voting is still locked by the Host.',
    nextBtn: '🗳️ Open Round 1 Voting →',
  },
  {
    round: 2,
    short: '2. Vote 1',
    title: 'Stage 2: Round 1 Suspect Voting Open',
    badge: '🗳️ Round 1 Voting Open (7/8 Votes In)',
    mcScript:
      '“Round 1 Voting is now open on your phones! Lock in who you suspect most right now and why. I can see the live vote counter on my screen as your votes come in!”',
    guestViewSummary:
      'The Round 1 Suspect Vote card unlocks at the top of every guest’s phone (including Extra Guest Detectives).',
    nextBtn: '🔍 Unlock Round 2 Clues →',
  },
  {
    round: 3,
    short: '3. R2 Clues',
    title: 'Stage 3: Round 2 Forensic & Timeline Evidence',
    badge: '🔍 Round 2 Clues Live on Phones',
    mcScript:
      '“Round 2 Clues have just dropped! Check your phones for the new forensic reports and 15-minute alibi contradictions.”',
    guestViewSummary:
      'Guests view Round 2 clues (with Round 1 clues available via a simple round pill).',
    nextBtn: '🗳️ Open Round 2 Voting →',
  },
  {
    round: 4,
    short: '6. Final Vote',
    title: 'Stage 6: Round 3 Clues & Final Killer Accusation',
    badge: '🗳️ Final Killer Vote Open',
    mcScript:
      '“All Round 3 evidence is on the table! Lock in your Final Killer Accusation on your phone before we trigger the Final Reveal.”',
    guestViewSummary:
      'Every suspect and Guest Detective locks in their final killer accusation on their phone.',
    nextBtn: '🏆 Trigger Final Reveal & Leaderboard →',
  },
  {
    round: 5,
    short: '7. Reveal',
    title: 'Stage 7: Final Killer Reveal & Combined Leaderboard',
    badge: '🏆 Truth Unlocked on All Phones',
    mcScript:
      '“The votes are locked! Check your phones now for the Killer’s Confession, the complete Crime Timeline solution, and our final Detective Leaderboard!”',
    guestViewSummary:
      'Every phone displays the Killer Reveal, Personal Detective Scorecard, and Combined Room Leaderboard.',
    nextBtn: '✓ Mystery Complete',
  },
];

export default function InteractivePackPreview({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('cheatsheet');

  // Tab 1 (Guest Role Cheat-Sheet) state
  const [guestName, setGuestName] = useState('Sarah');
  const [guestTrait, setGuestTrait] = useState(
    'Always 15 minutes late holding an espresso martini & knows everyone’s group-chat gossip'
  );
  const [dossierMode, setDossierMode] = useState<'custom' | 'generic'>('custom');
  const [revealedIcebreakerIdx, setRevealedIcebreakerIdx] = useState<number | null>(0);
  const [showBackstoryDrawer, setShowBackstoryDrawer] = useState(false);

  // Tab 2 (Live Phone Clues & Round Voting) state
  const [selectedClueIdx, setSelectedClueIdx] = useState(0);
  const [votedSuspectId, setVotedSuspectId] = useState<string>('jason');
  const [voteReason, setVoteReason] = useState(
    'Caught on the 7:55 PM hallway CCTV standing by the decanter during the toast!'
  );
  const [isVoteLocked, setIsVoteLocked] = useState(false);

  // Tab 3 (Extra Guest Detective Mode) state
  const [detectiveInputName, setDetectiveInputName] = useState('Alex');

  // Tab 4 (Host Laptop Controller) state
  const [hostStageIdx, setHostStageIdx] = useState(2);

  const cleanName = guestName.trim() || 'Sarah';
  const cleanTrait =
    guestTrait.trim() ||
    'Always 15 minutes late holding an espresso martini & knows everyone’s group-chat gossip';
  const cleanDetectiveName = detectiveInputName.trim()
    ? /^detective\s+/i.test(detectiveInputName.trim())
      ? detectiveInputName.trim()
      : `Detective ${detectiveInputName.trim()}`
    : 'Detective Alex';

  const activeClue = SAMPLE_CLUES[selectedClueIdx];
  const activeHostStage = HOST_STAGES[hostStageIdx];

  return (
    <section className="py-16 lg:py-24 bg-brand-dark text-white relative overflow-hidden border-y-4 border-brand-pink">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10 space-y-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
              Interactive Live Walkthrough • Host on Laptop, Guests on Phones
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none">
              See Exactly What Your <span className="text-brand-pink italic">Live Game Room</span> Looks Like
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Click through the 4 live screens below to test-drive what your guests see on their phones (and what you see on your laptop as the Host) on party night.
            </p>
          </div>

          {/* 4-Tab Interactive Switcher */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 p-1.5 rounded-2xl sm:rounded-full bg-white/10 border border-white/15 self-start w-full sm:w-auto">
            {[
              { id: 'cheatsheet' as const, label: '🎭 1. Guest Role Cheat-Sheet' },
              { id: 'clues' as const, label: '🔍 2. Phone Clues & Vote' },
              { id: 'detective' as const, label: '🕵️ 3. Extra Guest Detective' },
              { id: 'host' as const, label: '💻 4. Host Laptop Controls' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2.5 rounded-xl sm:rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer text-center ${
                  activeTab === tab.id
                    ? 'bg-brand-pink text-white shadow-lg'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* =====================================================================
            TAB 1: GUEST ROLE & PARTY CHEAT-SHEET (MOBILE PHONE VIEW)
        ===================================================================== */}
        {activeTab === 'cheatsheet' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Column: Friend Personalization Controls */}
            <div className="lg:col-span-5 rounded-[2.5rem] bg-white/5 border border-white/10 p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    Screen 1 of 4 • Guest Mobile Role Cheat-Sheet
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight">
                    Built for Mingling With a Drink in Hand
                  </h3>
                  <p className="text-xs text-slate-300 font-medium leading-relaxed">
                    Instead of reading a 10-page PDF essay at the dinner table, guests open a scannable <strong>Party Action Cheat-Sheet</strong> on their phone with their roleplay cues, hidden secret, and tap-to-reveal icebreakers. Type a friend&apos;s name below to test it:
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="demo-friend-name"
                      className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
                    >
                      Friend&apos;s First Name
                    </label>
                    <input
                      id="demo-friend-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/15 text-white text-sm font-bold focus:outline-none focus:border-brand-pink"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="demo-friend-trait"
                      className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1"
                    >
                      Their Real-Life Quirk or Inside Joke
                    </label>
                    <textarea
                      id="demo-friend-trait"
                      rows={2}
                      value={guestTrait}
                      onChange={(e) => setGuestTrait(e.target.value)}
                      maxLength={140}
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/15 text-white text-xs font-medium focus:outline-none focus:border-brand-pink"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-brand-pink/10 border border-brand-pink/30 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        ✨ Bidirectional Gender-Flex &amp; AI Portraits
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        Any Group Mix
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Every role automatically adapts pronouns, titles, outfit guides, and AI costume portraits to your guest&apos;s gender — whether your party is 3M/3F, 4F/2M, or an all-female 6F Hen Night!
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-400">
                  Compare against old PDF kits:
                </span>
                <div className="inline-flex p-1 rounded-full bg-black/40 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setDossierMode('custom')}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      dossierMode === 'custom'
                        ? 'bg-brand-pink text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    Back Pocket Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierMode('generic')}
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                      dossierMode === 'generic'
                        ? 'bg-white text-brand-dark'
                        : 'text-slate-400'
                    }`}
                  >
                    Generic PDF
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Live Playroom Cheat-Sheet Preview */}
            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-950 border border-white/15 p-5 sm:p-7 shadow-2xl flex flex-col justify-between space-y-4">
              {dossierMode === 'custom' ? (
                <>
                  {/* Simulated Mobile Top Bar */}
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider">
                        👤 {cleanName}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-[10px] font-black uppercase tracking-wider">
                        🕵️ Playable Suspect
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
                      📱 Guest Phone View
                    </span>
                  </div>

                  {/* Character Hero Banner */}
                  <div className="bg-slate-900/90 border border-white/15 rounded-2xl p-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                          The Sister-in-Law
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          • Played by {cleanName}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        Play the sharp-witted, loyal younger sibling who grew up on the street with everyone at the table — known for your trademark habit (<em>{cleanTrait}</em>).
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Party Action Cheat-Sheet */}
                  <div className="grid sm:grid-cols-2 gap-3.5">
                    {/* Left: How to Play + Hidden Secret */}
                    <div className="space-y-3">
                      <div className="bg-slate-900/70 border border-brand-pink/30 rounded-2xl p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-brand-pink">
                            🎭 How to Play Your Role
                          </h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-pink/15 text-brand-pink">
                            Roleplay Cues
                          </span>
                        </div>
                        <div className="space-y-1.5 text-[11px] text-slate-200">
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-start gap-1.5">
                            <span className="text-brand-pink font-black">✦</span>
                            <span>Back up your sister (The Wife) during holiday toasts while keeping an eye on The Co-Worker.</span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/5 border border-white/10 flex items-start gap-1.5">
                            <span className="text-brand-pink font-black">✦</span>
                            <span>Lean into your real-life reputation ({cleanTrait}) if anyone asks why you were near the hallway at 7:50 PM.</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-rose-950/40 border border-rose-500/35 rounded-2xl p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                            🤫 Your Hidden Secret
                          </h4>
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                            Keep Guarded
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200 leading-snug">
                          You borrowed $15,000 from The Victim six months ago without telling your sister — and at 7:45 PM he threatened to announce it during dinner.
                        </p>
                      </div>
                    </div>

                    {/* Right: Who to Talk to First (Interactive Icebreakers) */}
                    <div className="bg-slate-900/70 border border-white/10 rounded-2xl p-3.5 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="border-b border-white/10 pb-2">
                          <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                            💬 Who to Talk to First
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Tap a guest below to reveal your icebreaker prompt
                          </p>
                        </div>

                        {[
                          {
                            person: 'Gabby (The Wife)',
                            rel: 'Your Older Sister',
                            prompt: `"Ask Gabby why she looked so shaken after checking Luke's coat pocket before dinner — and remind her you always have her back."`,
                          },
                          {
                            person: 'Jason (The Co-Worker)',
                            rel: 'Childhood Neighbour',
                            prompt: `"Ask Jason why he was lingering by the hallway bar cart at 7:55 PM while everyone else was in the living room."`,
                          },
                        ].map((conn, idx) => {
                          const isOpen = revealedIcebreakerIdx === idx;
                          return (
                            <div
                              key={conn.person}
                              onClick={() =>
                                setRevealedIcebreakerIdx(isOpen ? null : idx)
                              }
                              className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 hover:border-emerald-400/40 cursor-pointer transition-all space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-black text-white">{conn.person}</p>
                                  <p className="text-[10px] text-emerald-400 font-bold">{conn.rel}</p>
                                </div>
                                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                                  {isOpen ? 'Hide' : '💬 Ask Them'}
                                </span>
                              </div>
                              {isOpen && (
                                <p className="text-[11px] text-slate-200 italic bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 leading-snug">
                                  {conn.prompt}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Collapsible Full Backstory & Costume Guide Drawer Toggle */}
                      <button
                        type="button"
                        onClick={() => setShowBackstoryDrawer(!showBackstoryDrawer)}
                        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center justify-between cursor-pointer"
                      >
                        <span>📖 Full Backstory &amp; 👗 Costume Guide</span>
                        <span>{showBackstoryDrawer ? '▲ Hide' : '▼ Expand'}</span>
                      </button>
                      {showBackstoryDrawer && (
                        <div className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-[10px] text-slate-300 leading-snug">
                          <strong className="text-brand-pink">👗 Outfit Vibe:</strong> Sleek winter chic — a shimmering silver sweater dress or satin blouse, your matching sterling silver snowflake hairpin (shared with your sister The Wife), and dark berry lipstick.
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 my-auto">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-[10px] font-black uppercase tracking-widest">
                      Standard Off-The-Shelf PDF Script
                    </span>
                    <span className="text-xs font-bold text-rose-400">
                      ✕ Wall of Text • Zero Personalisation
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-mono bg-black/40 p-6 rounded-2xl border border-white/10">
                    &ldquo;CHARACTER #4: LADY VICTORIA. You are a wealthy socialite from London. At 8:00 PM you were in the drawing room speaking with Colonel Mustard about the stolen necklace. Read Line 4B when prompted by the Host Manual.&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    Old PDF kits force guests to read a wall of text about strangers. Back Pocket Mysteries gives <strong className="text-white">{cleanName}</strong> a clean mobile Cheat-Sheet built around your actual friends.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: LIVE MOBILE CLUES & HOST-GATED ROUND VOTING
        ===================================================================== */}
        {activeTab === 'clues' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Select Sample Clue Format */}
            <div className="lg:col-span-5 space-y-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Screen 2 of 4 • Clean Mobile Clue Feed &amp; Voting
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  Simple on Phones. Controlled by the Host.
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Guests never see a cluttered dashboard or future locked rounds. They simply view the current round&apos;s evidence on their phone — and when the Host opens voting for that round, the <strong>Suspect Vote Card</strong> appears right at the top!
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Tap an Evidence Format Below to Preview:
                </p>
                {SAMPLE_CLUES.map((clue, idx) => {
                  const isSelected = idx === selectedClueIdx;
                  return (
                    <button
                      key={clue.id}
                      type="button"
                      onClick={() => setSelectedClueIdx(idx)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-white/10 border-brand-pink shadow-lg'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[9px] font-black uppercase">
                            {clue.badge}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-400">
                            🕓 {clue.time}
                          </span>
                        </div>
                        <p className="text-sm font-black text-white">{clue.title}</p>
                      </div>
                      <span className="text-brand-pink font-black text-xs shrink-0">
                        Preview →
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Simulated Guest Mobile Clues + Host-Gated Vote Card */}
            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-950 border border-white/15 p-5 sm:p-7 shadow-2xl space-y-5">
              {/* Host-Gated Round 1 Suspect Vote Card */}
              <div className="rounded-3xl bg-slate-900/90 border-2 border-brand-pink p-5 space-y-3.5 shadow-[0_0_30px_rgba(254,4,198,0.18)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                    🗳️ Round 1 Suspect Vote Open
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    Unlocked by Host
                  </span>
                </div>
                <h4 className="text-lg font-black text-white">
                  Who Do You Think Did It &amp; Why?
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SAMPLE_SUSPECTS.map((sus) => {
                    const isPicked = votedSuspectId === sus.id;
                    return (
                      <button
                        key={sus.id}
                        type="button"
                        onClick={() => {
                          setVotedSuspectId(sus.id);
                          setIsVoteLocked(false);
                        }}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isPicked
                            ? 'bg-brand-pink/20 border-brand-pink text-white'
                            : 'bg-slate-950/80 border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <p className="text-xs font-black text-white">{sus.name}</p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          {sus.role}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={voteReason}
                    onChange={(e) => {
                      setVoteReason(e.target.value);
                      setIsVoteLocked(false);
                    }}
                    placeholder="Why do you suspect them? (Optional)"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-xs text-white focus:outline-none focus:border-brand-pink"
                  />
                  <button
                    type="button"
                    onClick={() => setIsVoteLocked(true)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
                      isVoteLocked
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-brand-pink hover:opacity-95 text-white'
                    }`}
                  >
                    {isVoteLocked ? '✓ Round 1 Vote Locked!' : '🗳️ Lock Round 1 Vote'}
                  </button>
                </div>
              </div>

              {/* Active Clue Card Preview */}
              <div className="rounded-3xl bg-slate-900/75 border border-white/10 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase">
                      {activeClue.round}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-black">
                      🕓 {activeClue.time}
                    </span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    {activeClue.badge}
                  </span>
                </div>

                {activeClue.format === 'sms' && activeClue.messages && (
                  <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-black text-emerald-400">
                        ● {activeClue.sender}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 uppercase">
                        SMS / iMessage
                      </span>
                    </div>
                    <div className="space-y-2.5">
                      {activeClue.messages.map((m, i) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            m.isRight ? 'items-end' : 'items-start'
                          }`}
                        >
                          <span className="text-[9px] font-bold text-slate-400 mb-0.5 px-1">
                            {m.from}
                          </span>
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-snug ${
                              m.isRight
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-100'
                            }`}
                          >
                            {m.text}
                          </div>
                          <span className="text-[9px] text-slate-500 mt-0.5 px-1">
                            {m.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeClue.format === 'cctv' && (
                  <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-rose-400">
                      <span>● REC • CAM 02 HALLWAY BAR CART</span>
                      <span>19:55:14 PM</span>
                    </div>
                    <p className="text-xs text-slate-200 font-medium leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/10">
                      {activeClue.caption}
                    </p>
                  </div>
                )}

                {activeClue.format === 'audio' && (
                  <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-brand-pink">
                        ▶️ AI Multi-Speaker Voice Wiretap (0:24)
                      </span>
                      <span className="text-[10px] font-bold text-emerald-400">
                        Matched to Guest Accents
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 italic leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/10">
                      {activeClue.transcript}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-slate-300 font-medium">
                  <strong className="text-brand-pink">🕵️ Detective Note:</strong>{' '}
                  {activeClue.takeaway}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: EXTRA GUEST PLAYER ("DETECTIVE [NAME]") MODE
        ===================================================================== */}
        {activeTab === 'detective' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Explanation + Name Input */}
            <div className="lg:col-span-5 rounded-[2.5rem] bg-white/5 border border-white/10 p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-sky-400 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                  Screen 3 of 4 • Have More Than 6 Guests?
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  Unlimited Extra Friends Play as &ldquo;Detective [Name]&rdquo;
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  Originally planned for 6 people and 2 extra friends or partners come along? They don&apos;t need a pre-assigned character to play! They simply scan the party QR code, type their name at the bottom of the Lobby, and join as <strong className="text-sky-300">🕵️ {cleanDetectiveName}</strong>:
                </p>

                <div>
                  <label
                    htmlFor="demo-detective-name"
                    className="block text-[10px] font-black uppercase tracking-widest text-sky-300 mb-1"
                  >
                    Try Typing an Extra Guest&apos;s Name:
                  </label>
                  <input
                    id="demo-detective-name"
                    type="text"
                    value={detectiveInputName}
                    onChange={(e) => setDetectiveInputName(e.target.value)}
                    maxLength={30}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-sky-400/40 text-white text-sm font-bold focus:outline-none focus:border-sky-400"
                  />
                </div>

                <ul className="space-y-2 text-xs text-slate-200 font-semibold pt-1">
                  <li className="flex items-center gap-2">
                    <span className="text-sky-400 font-black">✓</span>
                    Gets an Official Guest Detective Briefing &amp; Airtight Alibi
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-sky-400 font-black">✓</span>
                    Tailored &ldquo;🕵️ Ask Them&rdquo; interrogation prompts for every suspect
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-sky-400 font-black">✓</span>
                    Receives every live clue drop, votes each round &amp; ranks on the leaderboard
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-[11px] text-sky-200 font-semibold">
                💡 Included free on every mystery pack — $0 extra per-player fees!
              </div>
            </div>

            {/* Right Preview: Detective Briefing & Suspect Interrogation Lineup */}
            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-950 border border-sky-400/30 p-5 sm:p-7 shadow-2xl space-y-4">
              {/* Official Guest Detective Hero Card */}
              <div className="rounded-2xl bg-gradient-to-br from-sky-950/60 via-slate-900 to-slate-900 border border-sky-400/35 p-4 sm:p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-400/15 border border-sky-400/40 flex items-center justify-center text-2xl shrink-0">
                  🕵️
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[9px] font-black uppercase tracking-wider">
                      🕵️ Official Guest Detective
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                      ✓ Airtight Alibi • Not a Suspect
                    </span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white">
                    {cleanDetectiveName}
                  </h4>
                  <p className="text-xs text-slate-300 leading-snug">
                    You are an official Guest Investigator at tonight&apos;s party! Roam the room, grill the suspects below using your interrogation prompts, inspect every live clue drop, and vote in every round.
                  </p>
                </div>
              </div>

              {/* Suspect Interrogation Lineup */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black uppercase tracking-widest text-sky-300">
                    💬 Suspect Interrogation Lineup (Walk Up &amp; Ask Them)
                  </h5>
                  <span className="text-[10px] font-bold text-slate-400">
                    Shown on {cleanDetectiveName}&apos;s Phone
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    {
                      name: 'Gabby',
                      role: 'The Wife',
                      blurb: 'Poised Christmas party hostess welcoming old friends back for the holidays.',
                      question: `"Ask Gabby (The Wife) to walk you through her exact alibi timeline tonight and who in the room can actually vouch for her."`,
                    },
                    {
                      name: 'Jason',
                      role: 'The Co-Worker',
                      blurb: 'Observant neighbour sibling who works at the same company as The Husband.',
                      question: `"Ask Jason (The Co-Worker) what his last private conversation with Luke was really about — and who else overheard it."`,
                    },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="rounded-2xl bg-slate-900/80 border border-white/10 p-3.5 space-y-2.5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200 text-[9px] font-black uppercase">
                            🕵️ Suspect
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                            👤 {item.name}
                          </span>
                        </div>
                        <p className="text-sm font-black text-white">{item.role}</p>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                          {item.blurb}
                        </p>
                      </div>

                      <div className="rounded-xl bg-sky-400/10 border border-sky-400/25 p-2.5 text-[11px] text-slate-200 italic leading-snug">
                        <strong className="text-sky-300 not-italic uppercase text-[9px] tracking-wider mr-1">
                          🕵️ Ask them:
                        </strong>
                        {item.question}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: HOST LAPTOP 8-STAGE CONTROLLER (SPOILER-FREE HOST MODE)
        ===================================================================== */}
        {activeTab === 'host' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Explanation */}
            <div className="lg:col-span-5 rounded-[2.5rem] bg-white/5 border border-white/10 p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                  Screen 4 of 4 • Host Laptop Controller
                </span>
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  You Control the Rounds &amp; Play Along Spoiler-Free
                </h3>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">
                  We recommend the <strong>Host uses a laptop</strong> while everyone else uses their phone. Only the Host sees the <strong>8-Stage Timeline Bar</strong> and decides when clues unlock and when voting opens for each round!
                </p>

                <ul className="space-y-2.5 text-xs text-slate-200 font-semibold">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">1.</span>
                    <span>
                      <strong>Host-Gated Voting:</strong> Guests can inspect clues at their own pace, and only access voting when you tap <em>Open Round Voting</em>.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">2.</span>
                    <span>
                      <strong>Live Room Vote Counter:</strong> See how many Cast Members &amp; Extra Guest Detectives have locked in their vote before advancing.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-black">3.</span>
                    <span>
                      <strong>100% Spoiler-Free:</strong> The killer&apos;s identity stays sealed until Stage 7, so you play as a suspect alongside your friends.
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-200 font-semibold">
                👉 Tap any stage pill on the right to test the Host Stage Stepper!
              </div>
            </div>

            {/* Right Interactive Host Laptop Preview */}
            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-950 border border-amber-400/30 p-5 sm:p-7 shadow-2xl space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Simulated Host Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                      👑 Host Mode: ON
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white/10 text-emerald-300 text-[10px] font-black">
                      👥 6/6 Cast + 🕵️ 2 Detectives
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase">
                    📲 Invite / QR Poster
                  </span>
                </div>

                {/* Clickable 8-Stage Timeline Stepper */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Host-Only Stage Timeline (Tap a Stage to Preview):
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {HOST_STAGES.map((st, idx) => {
                      const isCurrent = idx === hostStageIdx;
                      const isDone = idx < hostStageIdx;
                      return (
                        <button
                          key={st.short}
                          type="button"
                          onClick={() => setHostStageIdx(idx)}
                          className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer truncate ${
                            isCurrent
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md'
                              : isDone
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                          }`}
                        >
                          {isDone ? '✓ ' : ''}
                          {st.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Inline Host MC Bar */}
                <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-400/35 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                      📢 {activeHostStage.title}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black">
                      {activeHostStage.badge}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 block">
                      🎙️ Read Aloud to the Room (Spoiler-Free MC Script):
                    </span>
                    <p className="text-xs text-slate-100 italic leading-relaxed">
                      {activeHostStage.mcScript}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[11px] text-slate-300 font-medium">
                      <strong className="text-emerald-400">📱 On Guests&apos; Phones:</strong>{' '}
                      {activeHostStage.guestViewSummary}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setHostStageIdx((prev) =>
                          prev < HOST_STAGES.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-[11px] font-black uppercase tracking-wider cursor-pointer shrink-0"
                    >
                      {activeHostStage.nextBtn}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-300 font-semibold">
                  Ready to host your own custom mystery night?
                </span>
                <div className="flex items-center gap-3">
                  <Link
                    href={`/${locale}/how-it-works`}
                    className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white underline"
                  >
                    Full How to Play Guide
                  </Link>
                  <Link
                    href={`/${locale}/themes`}
                    className="px-5 py-2.5 rounded-full bg-brand-pink hover:bg-white hover:text-brand-dark text-white text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Browse Mysteries →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
