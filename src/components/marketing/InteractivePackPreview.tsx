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
    round: 'Round 01 · Clue 1 of 6',
    time: '7:32 PM',
    format: 'sms',
    kicker: 'Intercepted Text Thread',
    title: 'Private Message to The Victim',
    messages: [
      {
        from: 'Kiri (The Mistress)',
        text: "Meet me by the coat closet before dinner. I can't keep smiling across the table like nothing happened.",
        time: '7:32 PM · Delivered',
      },
      {
        from: 'Luke (The Husband)',
        text: 'Not tonight. Someone left a printed bank transfer in my coat pocket. Someone in this house knows.',
        time: '7:34 PM · Read',
        isRight: true,
      },
    ],
    takeaway:
      'Places The Mistress and The Victim meeting privately near the hallway coat closet 25 minutes before the incident.',
  },
  {
    id: 'clue-cctv',
    round: 'Round 01 · Clue 2 of 6',
    time: '7:55 PM',
    format: 'cctv',
    kicker: 'Hallway Camera 02',
    title: 'Bar Cart Surveillance Frame (19:55:14)',
    imageUrl: '/moodboard/lotr/caught-on-camera.jpg',
    caption:
      'CAM 02 · DINING HALLWAY — Captures Jason (The Co-Worker) standing alone by the crystal decanter at 7:55 PM while the rest of the room was gathered for the toast.',
    takeaway:
      'Directly contradicts Jason’s Round 1 alibi that he never left the living room between 7:45 PM and 8:15 PM.',
  },
  {
    id: 'clue-audio',
    round: 'Round 01 · Clue 3 of 6',
    time: '8:04 PM',
    format: 'audio',
    kicker: 'Audio Wiretap · 0:24',
    title: 'Kitchen Smart-Speaker Recording',
    transcript:
      '“Put the bottle back under the sink right now. If Gabby sees that label before dessert, we are both finished.”',
    takeaway:
      'Synthesized with multi-speaker voices matched to your guests’ regional accents—playable out loud or on every phone.',
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
    short: '01 · Mingle',
    phase: 'Stage 01 of 06 · Pre-Party Mingle',
    status: 'Clues & Voting Locked',
    mcScript:
      '“Scan the QR code or enter our 6-digit Game PIN on your phone to claim your character card—or join at the bottom as Detective [Your Name] if you are an extra guest. Read your role summary and use your conversation prompts while we have our first drink.”',
    guestState:
      'Guests view their Character Cheat-Sheet (or Detective Briefing). All clues and voting ballots remain locked.',
    ctaLabel: 'Unlock Round 1 Clues →',
  },
  {
    id: 1,
    short: '02 · R1 Clues',
    phase: 'Stage 02 of 06 · Round 1 Investigation',
    status: 'Round 1 Clues Live on Phones',
    mcScript:
      '“Round 1 Clues are now unlocked on your phones. Examine the leaked text thread, hallway surveillance photo, and voice recording, and question the suspects named in each clue.”',
    guestState:
      'Guest phones automatically display the Round 1 Clue Feed. Voting remains locked until the Host opens the ballot.',
    ctaLabel: 'Open Round 1 Voting →',
  },
  {
    id: 2,
    short: '03 · R1 Vote',
    phase: 'Stage 03 of 06 · Round 1 Accusations',
    status: 'Round 1 Ballot Open · 7 of 8 Votes In',
    mcScript:
      '“Round 1 Voting is now open on your phones. Lock in who you suspect most right now and why. Once all 8 votes are in, we will move to Round 2.”',
    guestState:
      'The Round 1 Suspect Ballot appears at the top of every guest’s phone (including Extra Guest Detectives).',
    ctaLabel: 'Unlock Round 2 Clues →',
  },
  {
    id: 3,
    short: '04 · R2 & R3',
    phase: 'Stage 04 of 06 · Rounds 2 & 3 Evidence',
    status: 'Forensic & Timeline Clues Live',
    mcScript:
      '“New forensic reports and keycard logs have just dropped to your phones. Cross-examine the 15-minute alibi gaps before our final accusation ballot.”',
    guestState:
      'Guests cross-reference Round 2 and Round 3 evidence drops on their phones to eliminate the decoys.',
    ctaLabel: 'Open Final Accusation Vote →',
  },
  {
    id: 4,
    short: '05 · Final Vote',
    phase: 'Stage 05 of 06 · Final Accusation Ballot',
    status: 'Final Ballot Open · 8 of 8 Votes Locked',
    mcScript:
      '“Every clue is on the table. Lock in your final accusation on your phone before we reveal the truth.”',
    guestState:
      'All Cast Members and Extra Guest Detectives lock in their final killer accusation on their phones.',
    ctaLabel: 'Trigger Final Reveal →',
  },
  {
    id: 5,
    short: '06 · Reveal',
    phase: 'Stage 06 of 06 · The Confession & Scores',
    status: 'Solution Broadcast to All Phones',
    mcScript:
      '“The votes are locked. Check your phones now for the killer’s confession, the complete timeline breakdown, and our final Detective Leaderboard.”',
    guestState:
      'Every phone unlocks the Killer Reveal, Personal Scorecard, and Combined Room Leaderboard.',
    ctaLabel: 'Restart Demo',
  },
];

export default function InteractivePackPreview({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<PreviewTab>('cheatsheet');

  // Tab 1 state
  const [guestName, setGuestName] = useState('Sarah');
  const [guestTrait, setGuestTrait] = useState(
    'Always 15 minutes late holding an espresso martini and knows everyone’s group-chat gossip'
  );
  const [dossierMode, setDossierMode] = useState<'custom' | 'generic'>('custom');
  const [openPromptIdx, setOpenPromptIdx] = useState<number | null>(0);

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
    'Always 15 minutes late holding an espresso martini and knows everyone’s group-chat gossip';
  const cleanDetectiveName = detectiveInputName.trim()
    ? /^detective\s+/i.test(detectiveInputName.trim())
      ? detectiveInputName.trim()
      : `Detective ${detectiveInputName.trim()}`
    : 'Detective Alex';

  const activeClue = SAMPLE_CLUES[selectedClueIdx];
  const activeHostStage = HOST_STAGES[hostStageIdx];

  return (
    <section className="py-20 lg:py-28 bg-brand-gray border-y border-gray-300/80">
      <div className="container mx-auto px-6 max-w-6xl">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 pb-8 border-b border-gray-300/80">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-brand-pink mb-3">
              Interactive Product Walkthrough
            </p>
            <h2 className="text-3xl sm:text-5xl font-black text-brand-dark uppercase tracking-tight leading-none">
              Inside the <span className="text-brand-pink italic">Live Portal.</span>
            </h2>
          </div>
          <p className="text-gray-500 font-medium text-sm sm:text-base max-w-md leading-relaxed">
            We recommend the <strong>Host uses a laptop</strong> to pace the rounds while <strong>guests use their phones</strong>. Click through the four views below to see how it works on the night.
          </p>
        </div>

        {/* Clean Architectural 4-Tab Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-gray-300/80 bg-white">
          {[
            { id: 'cheatsheet' as const, num: '01', title: 'Guest Role View', sub: 'Mobile Cheat-Sheet' },
            { id: 'clues' as const, num: '02', title: 'Clues & Voting', sub: 'Host-Gated Mobile Feed' },
            { id: 'detective' as const, num: '03', title: 'Extra Guest Players', sub: 'Play as Detective [Name]' },
            { id: 'host' as const, num: '04', title: 'Host Laptop View', sub: 'Stage & Voting Controls' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`p-5 sm:p-6 text-left border-r border-b border-gray-300/80 transition-colors cursor-pointer relative ${
                  isActive
                    ? 'bg-brand-dark text-white'
                    : 'bg-white text-brand-dark hover:bg-gray-50'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 inset-x-0 h-1 bg-brand-pink" />
                )}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-serif italic text-xs tracking-widest ${
                      isActive ? 'text-brand-pink' : 'text-gray-400'
                    }`}
                  >
                    No. {tab.num}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-[0.18em] ${
                      isActive ? 'text-gray-300' : 'text-gray-400'
                    }`}
                  >
                    {tab.sub}
                  </span>
                </div>
                <p className="text-base sm:text-lg font-black uppercase tracking-tight">
                  {tab.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Main Split Showcase Box */}
        <div className="bg-white border-x border-b border-gray-300/80 shadow-sm">
          {/* =================================================================
              VIEW 01: GUEST ROLE CHEAT-SHEET
          ================================================================== */}
          {activeTab === 'cheatsheet' && (
            <div className="grid lg:grid-cols-12">
              {/* Left Editorial Controls */}
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-300/80 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-2">
                      View 01 · Guest Mobile Screen
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-3">
                      Scannable at the Table. Built Around Your Friends.
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                      Instead of forcing guests to read a dense 10-page script at the dinner table, each player opens a clean mobile cheat-sheet with their roleplay cues, their hidden secret, and who to talk to first.
                    </p>
                  </div>

                  <div className="space-y-4 pt-2 border-t border-gray-200">
                    <div>
                      <label
                        htmlFor="preview-guest-name"
                        className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-1.5"
                      >
                        Try Typing a Friend&apos;s Name
                      </label>
                      <input
                        id="preview-guest-name"
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        maxLength={30}
                        className="w-full px-4 py-3 bg-brand-gray border border-gray-300 text-brand-dark text-sm font-bold focus:outline-none focus:border-brand-dark"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="preview-guest-trait"
                        className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-1.5"
                      >
                        Their Real-Life Habit or Inside Joke
                      </label>
                      <textarea
                        id="preview-guest-trait"
                        rows={2}
                        value={guestTrait}
                        onChange={(e) => setGuestTrait(e.target.value)}
                        maxLength={140}
                        className="w-full px-4 py-3 bg-brand-gray border border-gray-300 text-brand-dark text-xs font-medium focus:outline-none focus:border-brand-dark"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 flex items-center justify-between gap-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Compare Format
                  </span>
                  <div className="inline-flex border border-gray-300 bg-brand-gray p-0.5">
                    <button
                      type="button"
                      onClick={() => setDossierMode('custom')}
                      className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
                        dossierMode === 'custom'
                          ? 'bg-brand-dark text-white'
                          : 'text-gray-500 hover:text-brand-dark'
                      }`}
                    >
                      Back Pocket Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setDossierMode('generic')}
                      className={`px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors ${
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

              {/* Right Phone Frame Preview */}
              <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-brand-gray/50 flex items-center justify-center">
                {dossierMode === 'custom' ? (
                  <div className="w-full max-w-xl bg-brand-dark text-white rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                    {/* Minimal Mobile Top Bar */}
                    <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black uppercase tracking-widest text-white">
                          {cleanName} · The Sister-in-Law
                        </span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                        PIN 146 492
                      </span>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Character Header with Real Portrait */}
                      <div className="flex items-start gap-4 pb-6 border-b border-white/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/generated-avatars/44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg"
                          alt={cleanName}
                          className="w-16 h-20 object-cover object-top rounded-xl border border-white/15 shrink-0"
                        />
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-pink">
                              Playable Suspect
                            </span>
                            <span className="text-white/25">·</span>
                            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                              Played by {cleanName}
                            </span>
                          </div>
                          <h4 className="text-xl font-black tracking-tight text-white">
                            The Sister-in-Law
                          </h4>
                          <p className="text-xs text-gray-300 leading-relaxed">
                            The sharp-witted younger sibling who grew up on the street with everyone at the table—and true to form (<em>{cleanTrait}</em>), arrived tonight determined to keep the family secrets under wraps.
                          </p>
                        </div>
                      </div>

                      {/* Clean 2-Column Cheat-Sheet */}
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-5">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink mb-2">
                              01 / How to Play Your Role
                            </p>
                            <ul className="space-y-2 text-xs text-gray-300 leading-relaxed">
                              <li className="pl-3 border-l-2 border-brand-pink">
                                Back up your older sister (The Wife) during holiday toasts while keeping a close eye on The Co-Worker.
                              </li>
                              <li className="pl-3 border-l-2 border-white/20">
                                Use your trademark habit ({cleanTrait}) as your excuse if anyone asks why you were near the hallway at 7:50 PM.
                              </li>
                            </ul>
                          </div>

                          <div className="p-4 bg-white/5 border-l-2 border-brand-pink space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                              02 / Your Hidden Secret
                            </p>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              You quietly borrowed £15,000 from The Victim six months ago—and at 7:45 PM he threatened to bring it up in front of your sister.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            03 / Who to Talk to First
                          </p>
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
                                className="p-3.5 bg-white/5 border border-white/10 hover:border-white/25 transition-colors cursor-pointer space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-black text-white">{conn.name}</p>
                                    <p className="text-[10px] text-gray-400 font-medium">{conn.rel}</p>
                                  </div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                                    {isOpen ? 'Close' : 'Prompt →'}
                                  </span>
                                </div>
                                {isOpen && (
                                  <p className="text-xs text-gray-200 italic pt-2 border-t border-white/10 leading-relaxed">
                                    {conn.prompt}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-xl bg-white border border-gray-300 p-8 sm:p-10 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                        Standard Boxed / Etsy PDF Script
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        Zero Personalisation
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed font-mono bg-brand-gray p-6 border border-gray-200">
                      &ldquo;CHARACTER #4: LADY VICTORIA. You are a wealthy socialite from London. At 8:00 PM you were in the drawing room speaking with Colonel Mustard about the stolen necklace. Read Line 4B when prompted by the Host Manual.&rdquo;
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Standard kits force your friends to memorize stiff paragraphs about strangers. Back Pocket Mysteries casts <strong className="text-brand-dark">{cleanName}</strong> directly into the story.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 02: MOBILE CLUES & HOST-GATED VOTING
          ================================================================== */}
          {activeTab === 'clues' && (
            <div className="grid lg:grid-cols-12">
              {/* Left Column: Evidence Selector */}
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-300/80 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-2">
                      View 02 · Mobile Clues &amp; Voting
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-3">
                      Clean Evidence Feed. Host-Gated Voting.
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                      Guests never see a cluttered dashboard or future locked rounds. They simply view the current round&apos;s evidence on their phone—and when the Host opens voting for that round, the accusation ballot appears at the top.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-3">
                      Select an Evidence Format to Preview
                    </p>
                    {SAMPLE_CLUES.map((clue, idx) => {
                      const isSelected = idx === selectedClueIdx;
                      return (
                        <button
                          key={clue.id}
                          type="button"
                          onClick={() => setSelectedClueIdx(idx)}
                          className={`w-full text-left p-4 border transition-colors cursor-pointer flex items-center justify-between gap-4 ${
                            isSelected
                              ? 'bg-brand-dark text-white border-brand-dark'
                              : 'bg-brand-gray/60 text-brand-dark border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          <div>
                            <p
                              className={`text-[10px] font-black uppercase tracking-[0.18em] mb-1 ${
                                isSelected ? 'text-brand-pink' : 'text-gray-400'
                              }`}
                            >
                              {clue.kicker} · {clue.time}
                            </p>
                            <p className="text-sm font-black">{clue.title}</p>
                          </div>
                          <span
                            className={`text-xs font-black uppercase tracking-widest shrink-0 ${
                              isSelected ? 'text-brand-pink' : 'text-gray-400'
                            }`}
                          >
                            View →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-gray-400 font-medium pt-4 border-t border-gray-200">
                  Every clue is automatically hydrated with your guests&apos; real names, pronouns, portraits, and regional voice accents.
                </p>
              </div>

              {/* Right Column: Simulated Mobile Clue & Vote Screen */}
              <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-brand-gray/50 flex items-center justify-center">
                <div className="w-full max-w-xl bg-brand-dark text-white rounded-3xl border border-gray-800 overflow-hidden shadow-2xl p-6 space-y-6">
                  {/* Host-Gated Suspect Vote Ballot */}
                  <div className="p-5 bg-white/5 border border-white/15 space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                        Round 01 Ballot · Unlocked by Host
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Who Do You Suspect?
                      </span>
                    </div>

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
                            className={`p-3 border text-left transition-colors cursor-pointer ${
                              isPicked
                                ? 'bg-brand-pink text-white border-brand-pink'
                                : 'bg-black/40 border-white/10 text-gray-300 hover:border-white/30'
                            }`}
                          >
                            <p className="text-xs font-black">{sus.name}</p>
                            <p
                              className={`text-[9px] font-bold uppercase tracking-wider ${
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
                      className={`w-full py-3 text-xs font-black uppercase tracking-[0.18em] cursor-pointer transition-colors ${
                        isVoteLocked
                          ? 'bg-white text-brand-dark'
                          : 'bg-brand-pink text-white hover:bg-white hover:text-brand-dark'
                      }`}
                    >
                      {isVoteLocked ? 'Vote Recorded in Room Tally' : 'Lock In Round 1 Vote'}
                    </button>
                  </div>

                  {/* Active Evidence Card */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      <span>{activeClue.round}</span>
                      <span className="text-brand-pink">Logged at {activeClue.time}</span>
                    </div>

                    {activeClue.format === 'sms' && activeClue.messages && (
                      <div className="p-5 bg-black/50 border border-white/10 space-y-3">
                        {activeClue.messages.map((m, i) => (
                          <div
                            key={i}
                            className={`flex flex-col ${
                              m.isRight ? 'items-end' : 'items-start'
                            }`}
                          >
                            <span className="text-[10px] font-bold text-gray-400 mb-1">
                              {m.from}
                            </span>
                            <div
                              className={`max-w-[85%] px-4 py-2.5 text-xs leading-relaxed ${
                                m.isRight
                                  ? 'bg-brand-pink text-white'
                                  : 'bg-white/10 text-gray-100'
                              }`}
                            >
                              {m.text}
                            </div>
                            <span className="text-[9px] text-gray-500 mt-1">{m.time}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {activeClue.format === 'cctv' && (
                      <div className="bg-black/50 border border-white/10 overflow-hidden">
                        {activeClue.imageUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={activeClue.imageUrl}
                            alt={activeClue.title}
                            className="w-full h-44 object-cover opacity-90"
                          />
                        )}
                        <div className="p-4 space-y-1">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-brand-pink">
                            REC · 19:55:14 PM
                          </p>
                          <p className="text-xs text-gray-200 leading-relaxed">
                            {activeClue.caption}
                          </p>
                        </div>
                      </div>
                    )}

                    {activeClue.format === 'audio' && (
                      <div className="p-5 bg-black/50 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                            Audio Wiretap · 0:24
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase">
                            Multi-Speaker Voice Clue
                          </span>
                        </div>
                        <p className="text-xs text-gray-200 italic leading-relaxed">
                          {activeClue.transcript}
                        </p>
                      </div>
                    )}

                    <p className="text-xs text-gray-400 leading-relaxed pt-2 border-t border-white/10">
                      <strong className="text-white uppercase tracking-wider text-[10px] mr-1.5">
                        Evidence Note:
                      </strong>
                      {activeClue.takeaway}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 03: EXTRA GUEST PLAYERS ("DETECTIVE [NAME]")
          ================================================================== */}
          {activeTab === 'detective' && (
            <div className="grid lg:grid-cols-12">
              {/* Left Column */}
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-300/80 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-2">
                      View 03 · Have More Than 6 Guests?
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-3">
                      Unlimited Extra Friends Join as &ldquo;Detective [Name]&rdquo;
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                      Originally planned for 6 people and extra friends or plus-ones arrive? They never sit on the sidelines. They scan the same party QR code, enter their first name, and join the room as an official Guest Detective.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <label
                      htmlFor="preview-detective-name"
                      className="block text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-1.5"
                    >
                      Type an Extra Guest&apos;s First Name
                    </label>
                    <input
                      id="preview-detective-name"
                      type="text"
                      value={detectiveInputName}
                      onChange={(e) => setDetectiveInputName(e.target.value)}
                      maxLength={30}
                      placeholder="e.g. Alex"
                      className="w-full px-4 py-3 bg-brand-gray border border-gray-300 text-brand-dark text-sm font-bold focus:outline-none focus:border-brand-dark"
                    />
                  </div>

                  <div className="space-y-2.5 text-xs text-gray-600 font-medium">
                    <p className="pl-3 border-l-2 border-brand-pink">
                      <strong className="text-brand-dark">Suspect Interrogation Lineup:</strong> Tailored questions to walk up and ask every character in the room.
                    </p>
                    <p className="pl-3 border-l-2 border-gray-300">
                      <strong className="text-brand-dark">Live Clues &amp; Round Voting:</strong> Receives every clue drop on their phone and votes in every round.
                    </p>
                    <p className="pl-3 border-l-2 border-gray-300">
                      <strong className="text-brand-dark">Combined Leaderboard:</strong> Competes alongside the main cast for the top detective score at the end of the night.
                    </p>
                  </div>
                </div>

                <p className="text-xs font-bold uppercase tracking-widest text-brand-pink pt-4 border-t border-gray-200">
                  Included Free on Every Pack · $0 Extra Per-Player Fees
                </p>
              </div>

              {/* Right Column: Simulated Detective Briefing Screen */}
              <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-brand-gray/50 flex items-center justify-center">
                <div className="w-full max-w-xl bg-brand-dark text-white rounded-3xl border border-gray-800 overflow-hidden shadow-2xl p-6 space-y-6">
                  {/* Detective Header */}
                  <div className="pb-5 border-b border-white/10 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                        Official Guest Investigator · Airtight Alibi
                      </span>
                      <h4 className="text-2xl font-black tracking-tight text-white">
                        {cleanDetectiveName}
                      </h4>
                      <p className="text-xs text-gray-300 leading-relaxed">
                        You are not a suspect tonight. Your job is to roam the room, question the suspects below using your interrogation prompts, inspect every live clue drop, and vote in each round.
                      </p>
                    </div>
                  </div>

                  {/* Suspect Interrogation Lineup */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                      <span>Suspect Interrogation Lineup</span>
                      <span>6 Cast Members in Room</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
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
                          className="p-4 bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between"
                        >
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sus.avatar}
                              alt={sus.name}
                              className="w-11 h-14 object-cover object-top rounded-lg border border-white/15 shrink-0"
                            />
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-pink">
                                Played by {sus.name}
                              </p>
                              <p className="text-sm font-black text-white">{sus.role}</p>
                            </div>
                          </div>

                          <p className="text-xs text-gray-200 italic pt-3 border-t border-white/10 leading-relaxed">
                            {sus.question}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              VIEW 04: HOST LAPTOP CONTROLLER
          ================================================================== */}
          {activeTab === 'host' && (
            <div className="grid lg:grid-cols-12">
              {/* Left Column */}
              <div className="lg:col-span-5 p-8 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-gray-300/80 flex flex-col justify-between space-y-8">
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-2">
                      View 04 · Host Laptop Screen
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight leading-tight mb-3">
                      One-Click Round Control. 100% Spoiler-Free.
                    </h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">
                      Only the Host sees the stage progression bar on their laptop. You decide when each round&apos;s clues drop and when voting opens—while the killer&apos;s identity remains completely hidden so you can play as a suspect.
                    </p>
                  </div>

                  <div className="space-y-3 pt-2 border-t border-gray-200 text-xs text-gray-600 font-medium">
                    <p className="pl-3 border-l-2 border-brand-pink">
                      <strong className="text-brand-dark">Host-Gated Voting:</strong> Guests cannot rush ahead—voting for each round only opens when you click to unlock it.
                    </p>
                    <p className="pl-3 border-l-2 border-gray-300">
                      <strong className="text-brand-dark">Live Room Vote Counter:</strong> Track how many Cast Members and Guest Detectives have locked in their vote in real time.
                    </p>
                    <p className="pl-3 border-l-2 border-gray-300">
                      <strong className="text-brand-dark">Read-Aloud MC Scripts:</strong> Every stage includes a short, spoiler-free announcement to read to the room.
                    </p>
                  </div>
                </div>

                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 pt-4 border-t border-gray-200">
                  Click any stage on the right to test the Host Controller →
                </p>
              </div>

              {/* Right Column: Clean Laptop Frame */}
              <div className="lg:col-span-7 p-8 sm:p-10 lg:p-12 bg-brand-gray/50 flex items-center justify-center">
                <div className="w-full max-w-xl bg-brand-dark text-white rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                  {/* Laptop Window Top Bar */}
                  <div className="px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                        Host Controller · Laptop View
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-400">
                      6/6 Cast Joined · +2 Extra Detectives
                    </span>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Clean Monochromatic + Pink Stage Stepper */}
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 mb-2.5">
                        Select Party Stage
                      </p>
                      <div className="grid grid-cols-3 sm:grid-cols-6 border-t border-l border-white/15">
                        {HOST_STAGES.map((st, idx) => {
                          const isCurrent = idx === hostStageIdx;
                          return (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setHostStageIdx(idx)}
                              className={`py-2.5 px-2 text-[10px] font-black uppercase tracking-wider border-r border-b border-white/15 transition-colors cursor-pointer truncate ${
                                isCurrent
                                  ? 'bg-brand-pink text-white'
                                  : 'bg-white/5 text-gray-400 hover:text-white'
                              }`}
                            >
                              {st.short}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Stage Card */}
                    <div className="p-5 bg-white/5 border border-white/10 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10">
                        <span className="text-xs font-black uppercase tracking-wider text-white">
                          {activeHostStage.phase}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-pink">
                          {activeHostStage.status}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 block">
                          Read-Aloud Host Script (Spoiler-Free)
                        </span>
                        <p className="text-xs sm:text-sm text-gray-200 italic leading-relaxed">
                          {activeHostStage.mcScript}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <p className="text-xs text-gray-400 leading-relaxed">
                          <strong className="text-white">On Guests&apos; Phones:</strong>{' '}
                          {activeHostStage.guestState}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            setHostStageIdx((prev) =>
                              prev < HOST_STAGES.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="px-5 py-2.5 bg-brand-pink hover:bg-white hover:text-brand-dark text-white text-[10px] font-black uppercase tracking-[0.18em] transition-colors cursor-pointer shrink-0"
                        >
                          {activeHostStage.ctaLabel}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
