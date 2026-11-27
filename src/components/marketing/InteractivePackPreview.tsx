'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type PreviewTab = 'cheatsheet' | 'clues' | 'detective' | 'host';

interface SampleClueItem {
  id: string;
  round: string;
  time: string;
  format: 'sms' | 'cctv' | 'audio';
  kicker: string;
  title: string;
  messages?: { from: string; text: string; time: string; isRight?: boolean }[];
  imageUrl?: string;
  caption?: string;
  transcript?: string;
  takeaway: string;
}

const SAMPLE_CLUES: SampleClueItem[] = [
  {
    id: 'clue-sms',
    round: 'Round 1 · Clue 1 of 6',
    time: '7:32 PM',
    format: 'sms',
    kicker: '💬 Leaked iMessage Thread',
    title: 'Private Text to The Victim',
    messages: [
      {
        from: 'Kiri (The Mistress)',
        text: "Sneak into the coat closet before dinner. I can't keep smiling across the table like nothing happened.",
        time: '7:32 PM · Delivered ✓✓',
      },
      {
        from: 'Luke (The Husband)',
        text: 'Not tonight. Someone left a printed bank transfer in my coat pocket — someone in this house knows.',
        time: '7:34 PM · Read',
        isRight: true,
      },
    ],
    takeaway:
      'Places The Mistress and The Victim meeting secretly near the hallway coat closet 25 minutes before the murder window.',
  },
  {
    id: 'clue-cctv',
    round: 'Round 1 · Clue 2 of 6',
    time: '7:55 PM',
    format: 'cctv',
    kicker: '📹 Hallway Cam 02',
    title: 'Bar Cart Surveillance Photo',
    imageUrl: '/moodboard/lotr/caught-on-camera.jpg',
    caption:
      '7:55 PM — Captures Jason (The Co-Worker) standing alone by the crystal decanter while everyone else was in the living room for the toast.',
    takeaway:
      'Directly contradicts Jason’s Round 1 alibi that he never left the living room between 7:45 PM and 8:15 PM.',
  },
  {
    id: 'clue-audio',
    round: 'Round 1 · Clue 3 of 6',
    time: '8:04 PM',
    format: 'audio',
    kicker: '🎙️ Voice Wiretap (0:24)',
    title: 'Kitchen Smart-Speaker Recording',
    transcript:
      '“Put the bottle back under the sink right now! If Gabby sees that label before dessert, we are both finished.”',
    takeaway:
      'Multi-speaker AI voice recording matched to your guests’ regional accents — play it out loud or on every phone!',
  },
];

const SAMPLE_SUSPECTS = [
  { id: 'gabby', name: 'Gabby', role: 'The Wife' },
  { id: 'elia', name: 'Elia', role: 'The Sister-in-Law' },
  { id: 'kiri', name: 'Kiri', role: 'The Mistress' },
  { id: 'jason', name: 'Jason', role: 'The Co-Worker' },
  { id: 'matt', name: 'Matt', role: 'The Bestie' },
];

const HOST_STAGES = [
  {
    id: 0,
    short: '1. Mingle',
    phase: 'Stage 1 · Welcome Drinks & Mingle',
    status: 'Clues Safely Locked',
    mcScript:
      '“Welcome everyone! Scan the QR code on your phone to claim your character card — or join at the bottom as Detective [Your Name] if you’re an extra guest! Read your Role Cheat-Sheet and mingle while we grab a drink.”',
    guestState:
      'Guests view their Character Cheat-Sheet & icebreakers. Clues and voting stay locked.',
    ctaLabel: 'Unlock Round 1 Clues →',
  },
  {
    id: 1,
    short: '2. R1 Clues',
    phase: 'Stage 2 · Round 1 Clues Drop',
    status: 'Round 1 Clues Live on Phones',
    mcScript:
      '“Round 1 Clues are now unlocked on your phones! Inspect the leaked texts, CCTV photo, and voice memo, and grill the suspects named in each clue.”',
    guestState:
      'Guest phones automatically jump to the Round 1 Clue Feed. Voting waits for your signal.',
    ctaLabel: 'Open Round 1 Voting →',
  },
  {
    id: 2,
    short: '3. Vote 1',
    phase: 'Stage 3 · Round 1 Suspect Vote',
    status: 'Voting Open · 7/8 Votes In',
    mcScript:
      '“Round 1 Voting is open on your phones! Lock in who you suspect most right now and why. Once all 8 votes are in, we’ll unlock Round 2!”',
    guestState:
      'The Round 1 Vote card pops up at the top of every guest’s phone (including Extra Detectives).',
    ctaLabel: 'Unlock Round 2 Clues →',
  },
  {
    id: 3,
    short: '4. Next Rounds',
    phase: 'Stage 4 · Subsequent Rounds (3–5 Rounds by Tier)',
    status: 'Forensic & Alibi Clues Live',
    mcScript:
      '“New forensic reports and keycard logs have just dropped to your phones! Cross-check the 15-minute alibi gaps before our final vote.”',
    guestState:
      'Guests inspect each round of clues (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds) on their phones to catch the killer in a lie.',
    ctaLabel: 'Open Final Killer Vote →',
  },
  {
    id: 4,
    short: '5. Reveal',
    phase: 'Stage 5 · The Final Killer Reveal',
    status: 'Solution Unlocked on All Phones',
    mcScript:
      '“The final votes are locked! Check your phones now for the Killer’s Confession, the full crime timeline, and our Detective Leaderboard!”',
    guestState:
      'Every phone unlocks the Killer Reveal, Personal Scorecard, and Combined Room Leaderboard.',
    ctaLabel: 'Replay Demo ↻',
  },
];

export default function InteractivePackPreview({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('cheatsheet');

  // Tab 1 state
  const [guestName, setGuestName] = useState('Sarah');
  const [guestTrait, setGuestTrait] = useState(
    'Always 15 minutes late holding an espresso martini & knows everyone’s group-chat gossip'
  );
  const [guestPhotoUrl, setGuestPhotoUrl] = useState(
    '/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg'
  );
  const [dossierMode, setDossierMode] = useState<'custom' | 'generic'>('custom');
  const [openPromptIdx, setOpenPromptIdx] = useState<number | null>(0);

  // Sync with any guest created in LandingGuestCreator right above this section
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const applyLandingGuest = (payload: any) => {
      if (!payload || typeof payload !== 'object') return;
      if (payload.name || payload.first_name) {
        setGuestName(payload.name || payload.first_name);
      }
      if (Array.isArray(payload.traits) && payload.traits.length > 0) {
        setGuestTrait(payload.traits.join(' · '));
      }
      if (payload.aiPhotoUrl) {
        setGuestPhotoUrl(payload.aiPhotoUrl);
      }
    };

    try {
      const saved = window.localStorage.getItem('bpm_pending_landing_guest_v1');
      if (saved) {
        applyLandingGuest(JSON.parse(saved));
      }
    } catch {
      // ignore
    }

    const handleCustomEvent = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce?.detail) {
        applyLandingGuest(ce.detail);
      }
    };
    window.addEventListener('bpm-landing-guest-updated', handleCustomEvent);
    return () => window.removeEventListener('bpm-landing-guest-updated', handleCustomEvent);
  }, []);

  // Tab 2 state
  const [selectedClueIdx, setSelectedClueIdx] = useState(0);
  const [votedSuspectId, setVotedSuspectId] = useState<string>('jason');
  const [isVoteLocked, setIsVoteLocked] = useState(false);

  // Tab 3 state
  const [detectiveInputName, setDetectiveInputName] = useState('Alex');

  // Tab 4 state
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
    <section
      id="interactive-pack-preview"
      className="py-20 lg:py-28 bg-brand-gray border-y-2 border-gray-100 relative overflow-hidden"
    >
      <div className="container mx-auto px-6 max-w-6xl space-y-10">
        {/* Fun, Punchy Header + Single-Row Rounded Pill Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/10 text-brand-pink text-[11px] font-black uppercase tracking-[0.2em]">
              <span className="w-2 h-2 rounded-full bg-brand-pink" />
              Interactive Live Preview
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
              Peek Inside the <span className="text-brand-pink italic">Live Game Room.</span>
            </h2>
            <p className="text-gray-500 font-semibold text-sm sm:text-base leading-relaxed">
              Test-drive what your guests see on their phones and how you run the rounds from your laptop on party night.
            </p>
          </div>

          {/* Clean Single-Row Pill Switcher */}
          <div className="inline-flex flex-wrap sm:flex-nowrap p-1.5 rounded-3xl sm:rounded-full bg-white border-2 border-gray-200/80 shadow-sm gap-1 self-start">
            {[
              { id: 'cheatsheet' as const, label: '🎭 1. Role Card' },
              { id: 'clues' as const, label: '🔍 2. Clues & Vote' },
              { id: 'detective' as const, label: '🕵️ 3. Extra Guests' },
              { id: 'host' as const, label: '💻 4. Host Laptop' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    isActive
                      ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/25'
                      : 'text-brand-dark hover:text-brand-pink'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            TAB 1: GUEST ROLE CHEAT-SHEET
        ===================================================================== */}
        {activeTab === 'cheatsheet' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Card: Bright White Rounded Card */}
            <div className="lg:col-span-5 bg-white rounded-[2.25rem] border-2 border-gray-100 p-7 sm:p-9 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-3">
                    Guest Phone Screen · Role Cheat-Sheet
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-2">
                    Put Your Friends in the Crime Scene
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                    No 10-page essays to memorize at the table. Guests get a fun, scannable mobile cheat-sheet with their roleplay cues, hidden secret, and icebreakers. Type a friend&apos;s name below:
                  </p>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="preview-guest-name"
                      className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5"
                    >
                      Friend&apos;s First Name
                    </label>
                    <input
                      id="preview-guest-name"
                      type="text"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      maxLength={30}
                      className="w-full px-4 py-3 rounded-2xl bg-brand-gray border-2 border-gray-200 text-brand-dark text-sm font-bold focus:outline-none focus:border-brand-pink transition-colors"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="preview-guest-trait"
                      className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5"
                    >
                      Their Real-Life Habit or Inside Joke
                    </label>
                    <textarea
                      id="preview-guest-trait"
                      rows={2}
                      value={guestTrait}
                      onChange={(e) => setGuestTrait(e.target.value)}
                      maxLength={140}
                      className="w-full px-4 py-3 rounded-2xl bg-brand-gray border-2 border-gray-200 text-brand-dark text-xs font-semibold focus:outline-none focus:border-brand-pink transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-5 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-gray-400">
                  Compare against old kits:
                </span>
                <div className="inline-flex p-1 rounded-full bg-brand-gray border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setDossierMode('custom')}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      dossierMode === 'custom'
                        ? 'bg-brand-pink text-white shadow-sm'
                        : 'text-gray-500 hover:text-brand-dark'
                    }`}
                  >
                    Back Pocket Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setDossierMode('generic')}
                    className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer transition-all ${
                      dossierMode === 'generic'
                        ? 'bg-brand-dark text-white'
                        : 'text-gray-500 hover:text-brand-dark'
                    }`}
                  >
                    Old PDF Kit
                  </button>
                </div>
              </div>
            </div>

            {/* Right Card: Sleek Mobile Device Mockup */}
            <div className="lg:col-span-7 bg-brand-dark text-white rounded-[2.25rem] p-6 sm:p-8 shadow-2xl border-4 border-white flex flex-col justify-between space-y-5">
              {dossierMode === 'custom' ? (
                <>
                  {/* Phone Status Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider">
                        👤 {cleanName}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider">
                        The Sister-in-Law
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-brand-pink uppercase tracking-widest">
                      PIN 146 492
                    </span>
                  </div>

                  {/* Character Hero Row with Real Portrait */}
                  <div className="flex items-start gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={guestPhotoUrl}
                      alt={cleanName}
                      className="w-16 h-20 object-cover object-top rounded-xl border-2 border-brand-pink shrink-0"
                    />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        Playable Suspect · Cast for {cleanName}
                      </span>
                      <h4 className="text-lg sm:text-xl font-black text-white">
                        The Sister-in-Law
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        The sharp-witted younger sibling who knows all the old street history—and true to form (<em>{cleanTrait}</em>), arrived tonight determined to keep the family secrets under wraps.
                      </p>
                    </div>
                  </div>

                  {/* 2-Column Cheat-Sheet */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                          🎭 How to Act Tonight
                        </p>
                        <ul className="space-y-1.5 text-xs text-gray-200 leading-snug">
                          <li className="flex items-start gap-2">
                            <span className="text-brand-pink font-black">•</span>
                            <span>Back up your sister (The Wife) during holiday toasts while watching The Co-Worker.</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-brand-pink font-black">•</span>
                            <span>Blame your trademark habit ({cleanTrait}) if anyone asks why you were in the hallway at 7:50 PM.</span>
                          </li>
                        </ul>
                      </div>

                      <div className="p-4 rounded-2xl bg-brand-pink/15 border border-brand-pink/35 space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                          🤫 Your Hidden Secret
                        </p>
                        <p className="text-xs text-white leading-snug">
                          You quietly borrowed £15,000 from The Victim six months ago—and at 7:45 PM he threatened to announce it at dinner.
                        </p>
                      </div>
                    </div>

                    {/* Right: Tap-to-Reveal Icebreakers */}
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                      <div className="pb-2 border-b border-white/10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white">
                          💬 Who to Talk to First
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Tap a friend below to reveal your icebreaker
                        </p>
                      </div>

                      {[
                        {
                          name: 'Gabby (The Wife)',
                          rel: 'Your Older Sister',
                          prompt:
                            '“Ask Gabby why she looked so shaken after checking Luke’s coat pocket before dinner.”',
                        },
                        {
                          name: 'Jason (The Co-Worker)',
                          rel: 'Childhood Neighbour',
                          prompt:
                            '“Ask Jason why he was standing alone by the hallway bar cart at 7:55 PM during the toast.”',
                        },
                      ].map((conn, idx) => {
                        const isOpen = openPromptIdx === idx;
                        return (
                          <div
                            key={conn.name}
                            onClick={() => setOpenPromptIdx(isOpen ? null : idx)}
                            className="p-3 rounded-xl bg-black/40 border border-white/10 hover:border-brand-pink transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs font-black text-white">{conn.name}</p>
                                <p className="text-[10px] text-gray-400 font-semibold">{conn.rel}</p>
                              </div>
                              <span className="px-2.5 py-1 rounded-full bg-brand-pink/20 text-brand-pink text-[9px] font-black uppercase">
                                {isOpen ? 'Hide' : 'Ask Them →'}
                              </span>
                            </div>
                            {isOpen && (
                              <p className="text-xs text-gray-200 italic pt-2 border-t border-white/10 leading-snug">
                                {conn.prompt}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 my-auto p-4">
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-[10px] font-black uppercase tracking-widest">
                      Standard Boxed / PDF Script
                    </span>
                    <span className="text-xs font-bold text-brand-pink">
                      Zero Personalisation
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed font-mono bg-black/40 p-6 rounded-2xl border border-white/10">
                    &ldquo;CHARACTER #4: LADY VICTORIA. You are a wealthy socialite from London. At 8:00 PM you were in the drawing room speaking with Colonel Mustard about the stolen necklace. Read Line 4B when prompted by the Host Manual.&rdquo;
                  </p>
                  <p className="text-xs text-gray-300 font-medium">
                    Generic kits force your friends to read stiff paragraphs about strangers. Back Pocket Mysteries builds the story around <strong className="text-white">{cleanName}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 2: PHONE CLUES & HOST-GATED VOTING
        ===================================================================== */}
        {activeTab === 'clues' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left White Card */}
            <div className="lg:col-span-5 bg-white rounded-[2.25rem] border-2 border-gray-100 p-7 sm:p-9 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-3">
                    Guest Phone Screen · Clues &amp; Voting
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-2">
                    Live Clues on Phones. Voting When You Say So.
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                    Guests inspect leaked text messages, crime-scene CCTV photos, and voice memos right on their phone—and when the Host opens voting for that round, the Suspect Ballot pops up at the top!
                  </p>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Tap a Clue Format to Preview:
                  </p>
                  {SAMPLE_CLUES.map((clue, idx) => {
                    const isSelected = idx === selectedClueIdx;
                    return (
                      <button
                        key={clue.id}
                        type="button"
                        onClick={() => setSelectedClueIdx(idx)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-brand-pink/5 border-brand-pink shadow-sm'
                            : 'bg-brand-gray border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-wider text-brand-pink mb-0.5">
                            {clue.kicker} · {clue.time}
                          </p>
                          <p className="text-sm font-black text-brand-dark">{clue.title}</p>
                        </div>
                        <span className="text-xs font-black text-brand-pink shrink-0">
                          View →
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-gray-400 font-semibold pt-4 border-t border-gray-100">
                Every text thread, CCTV still, and voice wiretap is generated around your actual cast.
              </p>
            </div>

            {/* Right Dark Phone Mockup */}
            <div className="lg:col-span-7 bg-brand-dark text-white rounded-[2.25rem] p-6 sm:p-8 shadow-2xl border-4 border-white flex flex-col justify-between space-y-5">
              {/* Host-Gated Vote Card */}
              <div className="p-5 rounded-3xl bg-white/5 border-2 border-brand-pink space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                    🗳️ Round 1 Suspect Vote Open
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Unlocked by Host
                  </span>
                </div>

                <h4 className="text-base sm:text-lg font-black text-white">
                  Who Do You Think Did It?
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
                            ? 'bg-brand-pink text-white border-brand-pink shadow-md'
                            : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/30'
                        }`}
                      >
                        <p className="text-xs font-black">{sus.name}</p>
                        <p
                          className={`text-[9px] font-bold uppercase ${
                            isPicked ? 'text-white/90' : 'text-gray-400'
                          }`}
                        >
                          {sus.role}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setIsVoteLocked(true)}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-all ${
                    isVoteLocked
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-brand-pink hover:bg-white hover:text-brand-dark text-white'
                  }`}
                >
                  {isVoteLocked ? '✓ Vote Locked In Room Tally!' : 'Lock In Round 1 Vote'}
                </button>
              </div>

              {/* Active Clue Feed Card */}
              <div className="p-5 rounded-3xl bg-white/5 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    {activeClue.round} · {activeClue.kicker}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400">
                    🕓 {activeClue.time}
                  </span>
                </div>

                {activeClue.format === 'sms' && activeClue.messages && (
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2.5">
                    {activeClue.messages.map((m, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${
                          m.isRight ? 'items-end' : 'items-start'
                        }`}
                      >
                        <span className="text-[9px] font-bold text-gray-400 mb-0.5 px-1">
                          {m.from}
                        </span>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-snug ${
                            m.isRight
                              ? 'bg-brand-pink text-white'
                              : 'bg-white/10 text-gray-100'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeClue.format === 'cctv' && (
                  <div className="rounded-2xl bg-black/50 border border-white/10 overflow-hidden">
                    {activeClue.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeClue.imageUrl}
                        alt={activeClue.title}
                        className="w-full h-36 object-cover"
                      />
                    )}
                    <div className="p-3.5">
                      <p className="text-xs text-gray-200 leading-snug">{activeClue.caption}</p>
                    </div>
                  </div>
                )}

                {activeClue.format === 'audio' && (
                  <div className="p-4 rounded-2xl bg-black/50 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-brand-pink">
                        ▶️ Play Voice Wiretap (0:24)
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        Matched to Guest Accents
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 italic leading-relaxed">
                      {activeClue.transcript}
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-gray-300 font-medium">
                  <strong className="text-brand-pink">Why it matters:</strong> {activeClue.takeaway}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: EXTRA GUEST PLAYERS ("DETECTIVE [NAME]")
        ===================================================================== */}
        {activeTab === 'detective' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left White Card */}
            <div className="lg:col-span-5 bg-white rounded-[2.25rem] border-2 border-gray-100 p-7 sm:p-9 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-3">
                    Have More Than 6 Guests? · $0 Extra
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-2">
                    Extra Friends Play Along as &ldquo;Detective [Name]&rdquo;
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                    Have 6 people originally and extra friends or partners show up? They don&apos;t need a pre-assigned suspect role to join the fun! They scan the party QR code, type their name, and play as <strong className="text-brand-pink">{cleanDetectiveName}</strong>:
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="preview-detective-name"
                    className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5"
                  >
                    Try Typing an Extra Friend&apos;s Name:
                  </label>
                  <input
                    id="preview-detective-name"
                    type="text"
                    value={detectiveInputName}
                    onChange={(e) => setDetectiveInputName(e.target.value)}
                    maxLength={30}
                    placeholder="e.g. Alex"
                    className="w-full px-4 py-3 rounded-2xl bg-brand-gray border-2 border-gray-200 text-brand-dark text-sm font-bold focus:outline-none focus:border-brand-pink transition-colors"
                  />
                </div>

                <ul className="space-y-2.5 text-xs text-brand-dark font-bold">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      ✓
                    </span>
                    <span>Official Detective Briefing &amp; Suspect Interrogation Lineup</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      ✓
                    </span>
                    <span>Receives every live clue drop &amp; votes in every round</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      ✓
                    </span>
                    <span>Competes on the final room Detective Leaderboard</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-brand-pink/5 border border-brand-pink/20 text-xs font-bold text-brand-dark">
                ✨ Included free on every mystery pack — bring as many extra detectives as you like!
              </div>
            </div>

            {/* Right Dark Phone Mockup */}
            <div className="lg:col-span-7 bg-brand-dark text-white rounded-[2.25rem] p-6 sm:p-8 shadow-2xl border-4 border-white flex flex-col justify-between space-y-5">
              {/* Official Guest Detective Hero Card */}
              <div className="p-5 rounded-3xl bg-white/5 border border-brand-pink/40 flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-pink text-white flex items-center justify-center text-2xl shrink-0 shadow-lg shadow-brand-pink/30">
                  🕵️
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    Official Guest Detective · Airtight Alibi
                  </span>
                  <h4 className="text-xl sm:text-2xl font-black text-white">
                    {cleanDetectiveName}
                  </h4>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    You aren&apos;t one of the suspects tonight! Roam the party, grill the suspects below using your interrogation questions, inspect every live clue drop, and vote in each round to catch the killer.
                  </p>
                </div>
              </div>

              {/* Suspect Interrogation Lineup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-white">
                    💬 Suspect Interrogation Lineup (Walk Up &amp; Ask Them)
                  </span>
                  <span className="text-[10px] font-bold text-brand-pink uppercase">
                    6 Suspects in Room
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3.5">
                  {[
                    {
                      name: 'Gabby',
                      role: 'The Wife',
                      avatar: '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91.jpg',
                      question:
                        '“Ask Gabby (The Wife) to walk you through her exact alibi timeline tonight and who in the room can vouch for her.”',
                    },
                    {
                      name: 'Jason',
                      role: 'The Co-Worker',
                      avatar: '/generated-avatars/da18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
                      question:
                        '“Ask Jason (The Co-Worker) what his last private conversation with Luke was really about—and who else overheard it.”',
                    },
                  ].map((sus) => (
                    <div
                      key={sus.name}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={sus.avatar}
                          alt={sus.name}
                          className="w-11 h-14 object-cover object-top rounded-xl border border-white/15 shrink-0"
                        />
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
                            👤 Played by {sus.name}
                          </span>
                          <p className="text-sm font-black text-white">{sus.role}</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-gray-200 italic leading-snug">
                        <strong className="text-brand-pink not-italic uppercase text-[9px] tracking-wider block mb-0.5">
                          🕵️ Ask Them Tonight:
                        </strong>
                        {sus.question}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 4: HOST LAPTOP CONTROLLER
        ===================================================================== */}
        {activeTab === 'host' && (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left White Card */}
            <div className="lg:col-span-5 bg-white rounded-[2.25rem] border-2 border-gray-100 p-7 sm:p-9 shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-3">
                    Host Laptop View · 100% Spoiler-Free
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-2">
                    You Pace the Party &amp; Play Along as a Suspect
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
                    We recommend the <strong>Host uses a laptop</strong> while everyone else uses their phone. Only you see the stage bar and decide when clues drop and when voting opens for each round!
                  </p>
                </div>

                <ul className="space-y-2.5 text-xs text-brand-dark font-bold">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      1
                    </span>
                    <span>Unlock each round&apos;s clues in 1 click when the table is ready</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      2
                    </span>
                    <span>Decide when voting opens &amp; track live votes (Cast + Detectives)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-brand-pink text-white flex items-center justify-center text-[10px] shrink-0">
                      3
                    </span>
                    <span>The killer is sealed until the Final Reveal so you play spoiler-free</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-brand-gray text-xs font-bold text-brand-dark">
                👉 Click any stage pill on the right to test the Host Laptop bar!
              </div>
            </div>

            {/* Right Dark Laptop Mockup */}
            <div className="lg:col-span-7 bg-brand-dark text-white rounded-[2.25rem] p-6 sm:p-8 shadow-2xl border-4 border-white flex flex-col justify-between space-y-5">
              <div className="space-y-5">
                {/* Laptop Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider">
                      💻 Host Mode: ON
                    </span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-bold">
                      👥 6/6 Cast + 🕵️ 2 Detectives
                    </span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-gray-300 text-[10px] font-black uppercase">
                    📲 Show QR Poster
                  </span>
                </div>

                {/* Clickable Stage Pills */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Host-Only Stage Bar (Tap a Stage to Preview):
                  </p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {HOST_STAGES.map((st, idx) => {
                      const isCurrent = idx === hostStageIdx;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setHostStageIdx(idx)}
                          className={`py-2.5 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                            isCurrent
                              ? 'bg-brand-pink text-white shadow-md shadow-brand-pink/30'
                              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {st.short}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Host Stage Card */}
                <div className="p-5 rounded-3xl bg-white/5 border border-white/15 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-black uppercase tracking-tight text-white">
                      {activeHostStage.phase}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase">
                      {activeHostStage.status}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                      🎙️ Read-Aloud Host Script (Spoiler-Free):
                    </span>
                    <p className="text-xs sm:text-sm text-gray-100 italic leading-relaxed">
                      {activeHostStage.mcScript}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-gray-300 font-medium">
                      <strong className="text-white">📱 On Guests&apos; Phones:</strong>{' '}
                      {activeHostStage.guestState}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setHostStageIdx((prev) =>
                          prev < HOST_STAGES.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="px-5 py-2.5 rounded-full bg-brand-pink hover:bg-white hover:text-brand-dark text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-md"
                    >
                      {activeHostStage.ctaLabel}
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-4">
                <span className="text-xs text-gray-400 font-semibold">
                  Ready to build a pack for your group?
                </span>
                <Link
                  href={`/${locale}/themes`}
                  className="text-xs font-black uppercase tracking-widest text-brand-pink hover:text-white transition-colors"
                >
                  Browse Mysteries →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
