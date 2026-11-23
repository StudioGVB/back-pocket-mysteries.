'use client';

import React, { useState } from 'react';
import Link from 'next/link';

type ClueTag = 'key' | 'alibi' | 'decoy';

interface SampleClue {
  id: string;
  round: string;
  time: string;
  typeBadge: string;
  title: string;
  body: string;
  suspectMentioned: string;
  correctTag: ClueTag;
  verdictTitle: string;
  verdictExplanation: string;
}

const SAMPLE_CLUES: SampleClue[] = [
  {
    id: 'clue-1',
    round: 'Round 1 Evidence',
    time: '7:25 PM',
    typeBadge: '📹 Backstage CCTV Frame',
    title: 'Penthouse Terrace Surveillance Still',
    body: 'Timestamp 19:25:14 — Security camera #3 captures "The Ex" slipping a silver monogrammedhip flask into the champagne bucket on the VIP terrace, ten minutes before the toast.',
    suspectMentioned: 'Marco ("The Ex")',
    correctTag: 'decoy',
    verdictTitle: '🐟 It’s a Red Herring (+15 Detective Bonus Pts!)',
    verdictExplanation:
      'Sharp eye! Lab analysis in Round 2 proves the flask only contained cheap tequila Marco snuck in to avoid the cash bar—not the poison. Spotting this earns +15 pts toward the "🦅 The BS Detector" award!',
  },
  {
    id: 'clue-2',
    round: 'Round 2 Evidence',
    time: '8:10 PM',
    typeBadge: '💬 Intercepted Group Chat',
    title: 'Deleted WhatsApp Voice-to-Text Log',
    body: '8:10 PM — From "The Producer": "Delete the call sheet right now. If anyone finds out I was in the dressing room between 8:00 and 8:20, we both lose the network deal."',
    suspectMentioned: 'Sam ("The Producer")',
    correctTag: 'key',
    verdictTitle: '🔑 Critical Key Clue (+10 Detective Bonus Pts!)',
    verdictExplanation:
      'Bingo! Sam claimed during Round 1 introductions that they were downstairs with the sound crew at 8:10 PM. Tagging this as a Key Clue and pinning Sam locks in the timeline contradiction!',
  },
  {
    id: 'clue-3',
    round: 'Round 3 Evidence',
    time: '8:12 PM',
    typeBadge: '🧾 Smart-Lock Access Log',
    title: 'VIP Green Room Keycard Audit',
    body: '20:12:03 — Keycard #04 (assigned to "The Star") badged into the ground-floor hair & makeup suite and remained locked inside until 20:40:19.',
    suspectMentioned: 'Chloe ("The Star")',
    correctTag: 'alibi',
    verdictTitle: '🛡️ Verified Alibi (+15 Detective Bonus Pts!)',
    verdictExplanation:
      'Spot on! Even though Chloe had the loudest argument with the victim at 7:45 PM, the keycard log clears her during the 8:15 PM murder window.',
  },
];

const QUICK_CHIPS = [
  '⏱️ Timeline Gap',
  '💔 Affair Motive',
  '💰 Blackmail / Debt',
  '🔪 Murder Weapon',
  '🤥 Fake Alibi',
];

export default function InteractivePackPreview({ locale }: { locale: string }) {
  const [activeTab, setActiveTab] = useState<'clues' | 'dossier'>('clues');
  const [selectedClueIdx, setSelectedClueIdx] = useState(0);
  const [clueTags, setClueTags] = useState<Record<string, ClueTag>>({});
  const [selectedChips, setSelectedChips] = useState<Record<string, string[]>>({});

  // Custom Dossier tab state
  const [guestName, setGuestName] = useState('Sarah');
  const [guestTrait, setGuestTrait] = useState(
    'Always 15 minutes late holding an iced oat latte & knows everyone’s group-chat gossip'
  );
  const [dossierMode, setDossierMode] = useState<'custom' | 'generic'>('custom');

  const activeClue = SAMPLE_CLUES[selectedClueIdx];
  const currentTag = clueTags[activeClue.id];
  const currentChips = selectedChips[activeClue.id] || [];

  const handleTagClue = (tag: ClueTag) => {
    setClueTags((prev) => ({ ...prev, [activeClue.id]: tag }));
  };

  const handleToggleChip = (chip: string) => {
    setSelectedChips((prev) => {
      const existing = prev[activeClue.id] || [];
      const next = existing.includes(chip)
        ? existing.filter((c) => c !== chip)
        : [...existing, chip];
      return { ...prev, [activeClue.id]: next };
    });
  };

  const cleanName = guestName.trim() || 'Sarah';
  const cleanTrait =
    guestTrait.trim() ||
    'Always 15 minutes late holding an iced oat latte & knows everyone’s group-chat gossip';

  return (
    <section className="py-16 lg:py-24 bg-brand-dark text-white relative overflow-hidden border-y-4 border-brand-pink">
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-6 max-w-6xl relative z-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
              Interactive Live Demo • Try the Playroom Experience
            </div>
            <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-none">
              Peek Inside a <span className="text-brand-pink italic">Real Party Pack</span>
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Test-drive how your guests tag clues in their mobile Detective Notebook—or type a friend&apos;s name and inside joke to see how our AI customises a human-written suspect dossier.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="inline-flex p-1.5 rounded-full bg-white/10 border border-white/15 self-start">
            <button
              type="button"
              onClick={() => setActiveTab('clues')}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'clues'
                  ? 'bg-brand-pink text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🕵️‍♀️ 1. Try Clue Tagging
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'dossier'
                  ? 'bg-brand-pink text-white shadow-lg'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              🎭 2. Custom Dossier Preview
            </button>
          </div>
        </div>

        {activeTab === 'clues' ? (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: 3 Sample Clues Selector + Chronological Timeline */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400 px-1">
                <span>⏱️ Chronological Crime Timeline</span>
                <span className="text-brand-pink">Tap a Clue to Inspect</span>
              </div>

              <div className="space-y-3">
                {SAMPLE_CLUES.map((clue, idx) => {
                  const isSelected = idx === selectedClueIdx;
                  const tag = clueTags[clue.id];
                  return (
                    <button
                      key={clue.id}
                      type="button"
                      onClick={() => setSelectedClueIdx(idx)}
                      className={`w-full text-left p-5 rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                        isSelected
                          ? 'bg-white/10 border-brand-pink shadow-[0_0_25px_rgba(254,4,198,0.2)]'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase tracking-wider">
                            ⏱️ {clue.time}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {clue.round}
                          </span>
                        </div>
                        <h3 className="text-sm sm:text-base font-black text-white">
                          {clue.title}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          📌 Pinned Suspect: <strong className="text-slate-200">{clue.suspectMentioned}</strong>
                        </p>
                      </div>

                      <div className="shrink-0">
                        {tag === 'key' && (
                          <span className="px-2.5 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                            🔑 Key
                          </span>
                        )}
                        {tag === 'alibi' && (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase">
                            🛡️ Alibi
                          </span>
                        )}
                        {tag === 'decoy' && (
                          <span className="px-2.5 py-1 rounded-full bg-rose-400/20 border border-rose-400/40 text-rose-300 text-[10px] font-black uppercase">
                            🐟 Decoy
                          </span>
                        )}
                        {!tag && (
                          <span className="px-2.5 py-1 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold uppercase">
                            Untagged
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Interactive Evidence Card + Detective Notebook Tagging */}
            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-900 border border-white/15 p-6 sm:p-8 shadow-2xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                    {activeClue.typeBadge}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-white/10 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                    ⏱️ Logged at {activeClue.time}
                  </span>
                </div>
                <span className="text-xs font-bold text-slate-400">
                  Clue {selectedClueIdx + 1} of {SAMPLE_CLUES.length}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  {activeClue.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium bg-black/40 p-5 rounded-2xl border border-white/10">
                  &ldquo;{activeClue.body}&rdquo;
                </p>
              </div>

              {/* Step 1: Label This Clue */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                    1. Tag This Clue in Your Detective Notebook:
                  </span>
                  <span className="text-[11px] font-bold text-brand-pink">
                    Tap a label below to test your deduction ↓
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => handleTagClue('key')}
                    className={`py-3 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      currentTag === 'key'
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg scale-[1.02]'
                        : 'bg-white/5 border-white/15 text-amber-300 hover:bg-amber-400/15'
                    }`}
                  >
                    🔑 Key Clue
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTagClue('alibi')}
                    className={`py-3 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      currentTag === 'alibi'
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300 shadow-lg scale-[1.02]'
                        : 'bg-white/5 border-white/15 text-emerald-300 hover:bg-emerald-400/15'
                    }`}
                  >
                    🛡️ Alibi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTagClue('decoy')}
                    className={`py-3 px-3 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                      currentTag === 'decoy'
                        ? 'bg-rose-400 text-slate-950 border-rose-300 shadow-lg scale-[1.02]'
                        : 'bg-white/5 border-white/15 text-rose-300 hover:bg-rose-400/15'
                    }`}
                  >
                    🐟 Red Herring
                  </button>
                </div>
              </div>

              {/* Step 2: One-Tap Quick Deduction Chips */}
              <div className="space-y-2.5">
                <span className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
                  2. One-Tap Quick Deduction Notes (For Drinking &amp; Mingling):
                </span>
                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((chip) => {
                    const active = currentChips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleToggleChip(chip)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                          active
                            ? 'bg-brand-pink text-white border-brand-pink'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instant Verdict Feedback */}
              {currentTag && (
                <div
                  className={`p-5 rounded-2xl border animate-in fade-in duration-200 space-y-1.5 ${
                    currentTag === activeClue.correctTag
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wider">
                    {currentTag === activeClue.correctTag
                      ? `✓ Correct Deduction! ${activeClue.verdictTitle}`
                      : `Not Quite! ${activeClue.verdictTitle}`}
                  </p>
                  <p className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                    {activeClue.verdictExplanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Dossier vs Generic PDF Script Preview */
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 rounded-[2.5rem] bg-white/5 border border-white/10 p-6 sm:p-8 space-y-5 flex flex-col justify-between">
              <div className="space-y-5">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    Try the AI Casting Engine
                  </span>
                  <h3 className="text-2xl font-black uppercase tracking-tight">
                    Put Your Friend in the Crime Scene
                  </h3>
                  <p className="text-xs text-slate-300 font-medium">
                    Type a friend&apos;s first name and a real-life quirk below to see how their suspect booklet and conversation prompts transform:
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

                  {/* AI Photo-to-Trait Scanner Feature Highlight */}
                  <div className="p-3.5 rounded-2xl bg-brand-pink/10 border border-brand-pink/30 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        📸 AI Photo-to-Character Scanner Included
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                        🔒 Ephemeral &amp; Private
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-medium leading-snug">
                      Inside the Guest Builder, upload a quick photo of your friend—our AI scans their hair, eye colour, glasses, and build in 3 seconds to generate their custom suspect portrait &amp; CCTV crime-scene clues (then auto-deletes the raw photo).
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
                    Back Pocket Custom
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

            <div className="lg:col-span-7 rounded-[2.5rem] bg-slate-900 border border-white/15 p-6 sm:p-8 shadow-2xl flex flex-col justify-between space-y-6">
              {dossierMode === 'custom' ? (
                <>
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                          👤 Cast for {cleanName}
                        </span>
                        <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                          🕵️ Suspect Role: The VIP Publicist
                        </span>
                      </div>
                      <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">
                        ✓ AI-Tailored Dossier
                      </span>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-brand-pink">
                        Secret Character Backstory &amp; Alibi
                      </h4>
                      <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-medium bg-black/40 p-5 rounded-2xl border border-white/10">
                        &ldquo;Everyone at the villa knows <strong className="text-brand-pink">{cleanName}</strong> runs crisis PR for the cast—and true to form ({cleanTrait}), you strolled onto the penthouse terrace at 7:55 PM acting like nothing was wrong. What nobody knows yet is that the victim threatened to leak your private client ledger before midnight.&rdquo;
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-brand-pink/10 border border-brand-pink/30 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        💬 Icebreaker / Ask {cleanName} Tonight (Shown on Guests&apos; Phones)
                      </span>
                      <p className="text-xs sm:text-sm text-white font-semibold">
                        &ldquo;Ask {cleanName} why they were spotted near the champagne bucket at 7:55 PM—and whether their notorious habit ({cleanTrait}) is actually covering up a 15-minute gap in their alibi!&rdquo;
                      </p>
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
                      ✕ Zero Personalisation
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed font-mono bg-black/40 p-6 rounded-2xl border border-white/10">
                    &ldquo;CHARACTER #4: LADY VICTORIA. You are a wealthy socialite from London. At 8:00 PM you were in the drawing room speaking with Colonel Mustard about the stolen necklace. Read Line 4B when prompted by the Host Manual.&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 font-medium">
                    Notice the difference? Generic scripts force your friends to read stiff lines about strangers, whereas Back Pocket Mysteries makes <strong className="text-white">{cleanName}</strong> the centre of the comedy and intrigue.
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                <span className="text-xs text-slate-300 font-semibold">
                  Want a pack built around your friends for free?
                </span>
                <Link
                  href={`/${locale}/free-murder-mystery-game`}
                  className="px-6 py-3 rounded-full bg-brand-pink hover:bg-white hover:text-brand-dark text-white text-xs font-black uppercase tracking-widest transition-all"
                >
                  Claim 1 of 50 Free Custom Packs →
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
