'use client';

import React, { useState, useMemo } from 'react';
import { ClueRenderer } from '@/components/clues/ClueRenderer';
import {
  inferClueFormat,
  stripCustomerFacingTitle,
  stripFormatTagFromNotes,
  shuffleRoundCluesDeterministically,
} from '@/utils/clue-format';
import {
  hydrateTextWithCharacters,
  getCharacterRoleTitle,
} from '@/utils/hydration';

export interface FriendRosterItem {
  id: string;
  name: string;
  gender: string;
  avatar_url: string;
  photoUrl: string | null;
  bio?: string;
}

interface PackScreenerClientProps {
  mystery: any;
  relationships: any[];
  subplots: any[];
  friendRoster: FriendRosterItem[];
}

type ScreenerStep = 'cast' | 'round1' | 'round2' | 'round3' | 'reveal' | 'all_clues';

interface RoundGuess {
  suspectId: string;
  motiveGuess: string;
}

function buildDefaultFriendAssignments(
  rawCharacters: any[],
  friendRoster: FriendRosterItem[],
  shuffleSeed = 0
): Record<string, string> {
  const assignments: Record<string, string> = {};
  const usedFriendIds = new Set<string>();

  const rotate = <T,>(arr: T[], offset: number): T[] => {
    if (arr.length <= 1) return arr;
    const k = ((offset % arr.length) + arr.length) % arr.length;
    return [...arr.slice(k), ...arr.slice(0, k)];
  };

  const maleFriends = rotate(
    friendRoster.filter((f) => f.gender === 'male' || f.gender === 'masculine'),
    shuffleSeed
  );
  const femaleFriends = rotate(
    friendRoster.filter((f) => f.gender === 'female' || f.gender === 'feminine'),
    shuffleSeed
  );
  const allFriends = rotate(friendRoster, shuffleSeed);

  // 1. First respect any friend already assigned to the character when shuffleSeed === 0
  if (shuffleSeed === 0) {
    for (const c of rawCharacters) {
      const existingName = String(c?.profile_data?.guest_name || '').trim().toLowerCase();
      const existingId = String(c?.profile_data?.guest_id || '').trim().toLowerCase();
      const match = friendRoster.find(
        (f) =>
          (existingId && String(f.id).toLowerCase() === existingId) ||
          (existingName && f.name.toLowerCase() === existingName)
      );
      if (match && !usedFriendIds.has(match.id)) {
        assignments[c.id] = match.id;
        usedFriendIds.add(match.id);
      }
    }
  }

  // 2. Auto-assign remaining characters from the user's friend roster matched by gender
  for (const c of rawCharacters) {
    if (assignments[c.id]) continue;
    const g = String(c.gender || '').toLowerCase();
    const pool =
      g === 'male'
        ? [...maleFriends, ...allFriends]
        : g === 'female'
        ? [...femaleFriends, ...allFriends]
        : allFriends;

    const chosen = pool.find((f) => !usedFriendIds.has(f.id)) || pool[0];
    if (chosen) {
      assignments[c.id] = chosen.id;
      usedFriendIds.add(chosen.id);
    }
  }

  return assignments;
}

export function PackScreenerClient({
  mystery,
  relationships,
  subplots,
  friendRoster = [],
}: PackScreenerClientProps) {
  const rawCharacters: any[] = mystery?.characters || [];
  const rawClues: any[] = mystery?.clues || [];
  const plotBeats: any[] = mystery?.plot_beats || [];

  const [step, setStep] = useState<ScreenerStep>('round1');
  // Default to ON so test mode automatically uses the user's friends!
  const [useFriendNames, setUseFriendNames] = useState<boolean>(true);
  const [xRayMode, setXRayMode] = useState<boolean>(false);
  const [showCastPanel, setShowCastPanel] = useState<boolean>(true);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);

  const [friendAssignments, setFriendAssignments] = useState<Record<string, string>>(() =>
    buildDefaultFriendAssignments(rawCharacters, friendRoster, 0)
  );

  const [selectedPovCharId, setSelectedPovCharId] = useState<string>(
    rawCharacters.find((c) => !c.is_victim)?.id || rawCharacters[0]?.id || ''
  );

  // Solo player notebook state: tag clues & record round guesses
  const [clueTags, setClueTags] = useState<Record<string, 'key' | 'red_herring' | 'alibi' | undefined>>({});
  const [clueNotes, setClueNotes] = useState<Record<string, string>>({});
  const [guesses, setGuesses] = useState<Record<number, RoundGuess>>({
    1: { suspectId: '', motiveGuess: '' },
    2: { suspectId: '', motiveGuess: '' },
    3: { suspectId: '', motiveGuess: '' },
  });

  const handleShuffleFriends = () => {
    const nextSeed = shuffleSeed + 1;
    setShuffleSeed(nextSeed);
    setFriendAssignments(buildDefaultFriendAssignments(rawCharacters, friendRoster, nextSeed));
  };

  // Build hydrated characters using the user's real friends from My Roster (or Role Titles when toggled off)
  const activeCharacters = useMemo(() => {
    return rawCharacters.map((c) => {
      const roleTitle = getCharacterRoleTitle(c) || c.name;
      const assignedFriendId = friendAssignments[c.id];
      const friend = friendRoster.find((f) => f.id === assignedFriendId);

      if (!useFriendNames || !friend) {
        return {
          ...c,
          assignedFriend: null,
          displayRoleTitle: roleTitle,
          displayName: roleTitle,
          profile_data: {
            ...(c.profile_data || {}),
            guest_name: '',
          },
        };
      }

      return {
        ...c,
        assignedFriend: friend,
        name: `${friend.name} | ${roleTitle}`,
        displayRoleTitle: roleTitle,
        displayName: `${friend.name} (${roleTitle})`,
        profile_data: {
          ...(c.profile_data || {}),
          guest_id: friend.id,
          guest_name: friend.name,
          avatar_url: friend.avatar_url || c.profile_data?.avatar_url,
          friend_photo_url: friend.photoUrl,
        },
      };
    });
  }, [rawCharacters, friendRoster, friendAssignments, useFriendNames]);

  const hydrate = (text?: string | null) => {
    if (!text) return '';
    return hydrateTextWithCharacters(
      text,
      activeCharacters,
      useFriendNames ? 'print' : 'role'
    );
  };

  // Group and deterministically shuffle clues per round so real & fake are interleaved
  const cluesByRound = useMemo(() => {
    const r1 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => (c.round_number || 1) === 1),
      1
    );
    const r2 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => c.round_number === 2),
      2
    );
    const r3 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => c.round_number === 3),
      3
    );
    return { 1: r1, 2: r2, 3: r3 };
  }, [rawClues]);

  // Automated Pack QA Scorecard
  const qaStats = useMemo(() => {
    const total = rawClues.length;
    const realCount = rawClues.filter((c) => c.evidence_status !== 'fake' && c.implication_type !== 'red_herring').length;
    const fakeCount = total - realCount;

    const visualFormats = new Set(['physical_prop', 'cctv', 'social_post']);
    const visualClues = rawClues.filter(
      (c) =>
        visualFormats.has(c.format || inferClueFormat(c)) ||
        Boolean(c.static_image_url)
    );
    const missingImages = rawClues.filter(
      (c) =>
        visualFormats.has(c.format || inferClueFormat(c)) && !c.static_image_url
    );
    const audioClues = rawClues.filter((c) => (c.format || inferClueFormat(c)) === 'audio');
    const missingAudio = audioClues.filter((c) => !c.audio_url);

    const beatCounts = plotBeats.map((b: any) => {
      const count = rawClues.filter((c) => c.linked_plot_beat_id === b.id).length;
      return { beat: b, count };
    });
    const underCoveredBeats = beatCounts.filter((bc) => bc.count < 1);

    return {
      total,
      realCount,
      fakeCount,
      visualCount: visualClues.length,
      visualPct: total > 0 ? Math.round((visualClues.length / total) * 100) : 0,
      missingImagesCount: missingImages.length,
      missingAudioCount: missingAudio.length,
      underCoveredBeatsCount: underCoveredBeats.length,
      beatCounts,
    };
  }, [rawClues, plotBeats]);

  const killerChar = activeCharacters.find((c) => c.plot_role === 'killer');
  const victimChar = activeCharacters.find((c) => c.is_victim);
  const povChar = activeCharacters.find((c) => c.id === selectedPovCharId) || activeCharacters[0];

  const povRelationships = useMemo(() => {
    if (!povChar) return [];
    return relationships.filter(
      (r: any) => r.character_a_id === povChar.id || r.character_b_id === povChar.id
    );
  }, [relationships, povChar]);

  const getCharById = (id: string) => activeCharacters.find((c) => c.id === id);

  const getPortraitUrl = (c: any) => {
    if (useFriendNames && c?.profile_data?.friend_photo_url) {
      return c.profile_data.friend_photo_url;
    }
    return (
      c?.profile_data?.standard_character_photo_url ||
      c?.profile_data?.outfit_image_url ||
      c?.profile_data?.outfit_reference_images?.[0] ||
      c?.profile_data?.avatar_url ||
      null
    );
  };

  const renderClueCard = (clue: any, idx: number, roundNum: number) => {
    const cleanTitle = stripCustomerFacingTitle(clue.title) || clue.title;
    const hydratedTitle = hydrate(cleanTitle);
    const hydratedDesc = hydrate(clue.description);
    const tag = clueTags[clue.id];
    const isFake = clue.evidence_status === 'fake' || clue.implication_type === 'red_herring';
    const linkedBeat = plotBeats.find((b: any) => b.id === clue.linked_plot_beat_id);
    const cleanInternalNotes = stripFormatTagFromNotes(clue.internal_notes);

    return (
      <div
        key={clue.id || idx}
        className={`rounded-2xl bg-slate-900 border transition-all flex flex-col justify-between overflow-hidden shadow-lg ${
          xRayMode
            ? isFake
              ? 'border-rose-500/60 ring-1 ring-rose-500/30'
              : 'border-emerald-500/60 ring-1 ring-emerald-500/30'
            : tag === 'key'
            ? 'border-amber-400 ring-1 ring-amber-400/40'
            : tag === 'red_herring'
            ? 'border-rose-400/60'
            : tag === 'alibi'
            ? 'border-sky-400/60'
            : 'border-slate-800'
        }`}
      >
        {/* Top Card Header (Player-Safe by default; X-Ray reveals Real/Fake) */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-black uppercase tracking-wider shrink-0">
              R{roundNum} • #{idx + 1}
            </span>
            <span className="text-xs font-bold text-slate-200 truncate">
              {hydratedTitle}
            </span>
          </div>

          {xRayMode ? (
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0 ${
                isFake
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {isFake
                ? '🎭 Fake / Subplot'
                : linkedBeat
                ? `✓ Real • Beat ${linkedBeat.beat_number}`
                : '✓ Real / Canon'}
            </span>
          ) : (
            /* Solo Player Deduction Tag Buttons */
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setClueTags((prev) => ({
                    ...prev,
                    [clue.id]: prev[clue.id] === 'key' ? undefined : 'key',
                  }))
                }
                title="Mark as Key Evidence"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  tag === 'key'
                    ? 'bg-amber-400 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🔑 Key
              </button>
              <button
                type="button"
                onClick={() =>
                  setClueTags((prev) => ({
                    ...prev,
                    [clue.id]: prev[clue.id] === 'red_herring' ? undefined : 'red_herring',
                  }))
                }
                title="Mark as Red Herring / Decoy"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  tag === 'red_herring'
                    ? 'bg-rose-500 text-white font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🐟 Decoy
              </button>
              <button
                type="button"
                onClick={() =>
                  setClueTags((prev) => ({
                    ...prev,
                    [clue.id]: prev[clue.id] === 'alibi' ? undefined : 'alibi',
                  }))
                }
                title="Mark as Alibi / Clears Suspect"
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                  tag === 'alibi'
                    ? 'bg-sky-400 text-slate-950 font-black'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                🛡️ Alibi
              </button>
            </div>
          )}
        </div>

        {/* Actual Customer-Facing Clue View */}
        <div className="p-4 flex-grow flex flex-col justify-center">
          <ClueRenderer
            clue={clue}
            hydratedTitle={hydratedTitle}
            hydratedDescription={hydratedDesc}
            characters={activeCharacters}
            showImage={true}
          />
        </div>

        {/* Footer: Solo Player Scratchpad OR Admin X-Ray Notes */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800/80 space-y-2">
          {xRayMode && cleanInternalNotes && (
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 leading-relaxed">
              <span className="font-black uppercase tracking-wider mr-1.5">
                X-Ray Note:
              </span>
              {hydrate(cleanInternalNotes)}
            </div>
          )}
          <input
            type="text"
            value={clueNotes[clue.id] || ''}
            onChange={(e) =>
              setClueNotes((prev) => ({ ...prev, [clue.id]: e.target.value }))
            }
            placeholder="Your detective note on this clue (e.g. 'Matches Shelf B lights at 7:52 PM')..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-brand-pink"
          />
        </div>
      </div>
    );
  };

  const renderRoundGuessBox = (roundNum: number) => {
    const currentGuess = guesses[roundNum] || { suspectId: '', motiveGuess: '' };
    const suspectList = activeCharacters.filter((c) => !c.is_victim);

    return (
      <div className="mt-8 rounded-2xl bg-slate-900 border border-brand-pink/30 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
              End of Round {roundNum} Check-In
            </span>
            <h3 className="text-base font-black uppercase tracking-tight mt-0.5">
              Lock In Your Round {roundNum} Theory (Before Advancing)
            </h3>
          </div>
          {roundNum < 3 ? (
            <button
              type="button"
              onClick={() =>
                setStep(roundNum === 1 ? 'round2' : 'round3')
              }
              className="px-4 py-2 rounded-xl bg-brand-pink hover:opacity-90 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Advance to Round {roundNum + 1} →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep('reveal')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Reveal Final Solution & Score My Theory →
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Who is your #1 Suspect after Round {roundNum}?
            </label>
            <select
              value={currentGuess.suspectId}
              onChange={(e) =>
                setGuesses((prev) => ({
                  ...prev,
                  [roundNum]: { ...currentGuess, suspectId: e.target.value },
                }))
              }
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-brand-pink"
            >
              <option value="">-- Select Suspect --</option>
              {suspectList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Why & how did they do it? (Your Motive / Method Theory)
            </label>
            <input
              type="text"
              value={currentGuess.motiveGuess}
              onChange={(e) =>
                setGuesses((prev) => ({
                  ...prev,
                  [roundNum]: { ...currentGuess, motiveGuess: e.target.value },
                }))
              }
              placeholder="e.g. Caught the affair in the closet and used the 25-ft Christmas lights..."
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-pink"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Screener Control Deck */}
      <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                🕵️ Solo Playtest & Pack Screener
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                Cast with your friends from My Roster ({friendRoster.length} loaded)
              </span>
            </div>
          </div>

          {/* Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setUseFriendNames((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                useFriendNames
                  ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {useFriendNames ? '👯 My Friends Roster: ON' : '🏷️ Role Titles Only'}
            </button>

            {useFriendNames && (
              <button
                type="button"
                onClick={handleShuffleFriends}
                className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
              >
                🔀 Shuffle Friends
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowCastPanel((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                showCastPanel
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {showCastPanel ? '📸 Cast Reference Strip: ON' : '📸 Show Cast Strip'}
            </button>

            <button
              type="button"
              onClick={() => setXRayMode((v) => !v)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                xRayMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {xRayMode ? '🔬 Admin X-Ray: ON (Spoilers)' : '🙈 Blind Player Mode'}
            </button>
          </div>
        </div>

        {/* Automated Pack QA Health Bar (Visible when X-Ray Mode is ON or on Reveal tab) */}
        {(xRayMode || step === 'reveal') && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-slate-800 text-xs">
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Total Clues</div>
              <div className="text-sm font-black text-white mt-0.5">
                {qaStats.total} ({qaStats.realCount} Real / {qaStats.fakeCount} Fake)
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Visual Photo Ratio</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">
                {qaStats.visualCount}/{qaStats.total} ({qaStats.visualPct}%)
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Main Beat Coverage</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  qaStats.underCoveredBeatsCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {plotBeats.length - qaStats.underCoveredBeatsCount}/{plotBeats.length} Beats Linked
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Visual Images Ready</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  qaStats.missingImagesCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {qaStats.missingImagesCount === 0
                  ? '✓ 100% Rendered'
                  : `${qaStats.missingImagesCount} Missing`}
              </div>
            </div>
            <div className="rounded-xl bg-slate-950/90 border border-slate-800 px-3 py-2">
              <div className="text-[10px] font-bold uppercase text-slate-400">Audio Voice Memos</div>
              <div
                className={`text-sm font-black mt-0.5 ${
                  qaStats.missingAudioCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {qaStats.missingAudioCount === 0
                  ? '✓ 100% Synthesized'
                  : `${qaStats.missingAudioCount} Pending`}
              </div>
            </div>
          </div>
        )}

        {/* Step Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
          {[
            { id: 'cast', label: '1. Pre-Party Cast & POV' },
            { id: 'round1', label: `2. Round 1 (${cluesByRound[1].length} Clues)` },
            { id: 'round2', label: `3. Round 2 (${cluesByRound[2].length} Clues)` },
            { id: 'round3', label: `4. Round 3 (${cluesByRound[3].length} Clues)` },
            { id: 'all_clues', label: `All ${rawClues.length} Clues Grid` },
            { id: 'reveal', label: '5. Final Solution & Score' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStep(tab.id as ScreenerStep)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                step === tab.id
                  ? 'bg-brand-pink text-white shadow-md'
                  : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pinned Cast Reference Strip (Shows your Friends + their AI Portraits & Role Outfits!) */}
      {showCastPanel && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                📸 Cast Visual Reference Strip (Your Friends Cast in Each Role)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-bold text-slate-500">Playing POV As:</span>
              <select
                value={selectedPovCharId}
                onChange={(e) => setSelectedPovCharId(e.target.value)}
                className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-900"
              >
                {activeCharacters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.displayName} {c.is_victim ? '(Victim)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {activeCharacters.map((char) => {
              const photo = getPortraitUrl(char);
              const isSelectedPov = char.id === selectedPovCharId;
              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedPovCharId(char.id)}
                  className={`cursor-pointer rounded-xl border p-2.5 transition-all flex flex-col justify-between gap-2 ${
                    isSelectedPov
                      ? 'border-brand-pink bg-brand-pink/5 ring-2 ring-brand-pink/20'
                      : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900">
                      {photo ? (
                        <img
                          src={photo}
                          alt={char.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          No Photo
                        </div>
                      )}
                      {char.is_victim && (
                        <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-red-600 text-white text-[9px] font-black uppercase">
                          💀 Victim
                        </span>
                      )}
                      {xRayMode && char.plot_role === 'killer' && (
                        <span className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                          🔪 Killer
                        </span>
                      )}
                      {char.profile_data?.color && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-black/75 text-white text-[9px] font-bold">
                          🎨 {char.profile_data.color}
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-black text-slate-900 leading-tight">
                        {char.displayName}
                      </div>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1 leading-snug">
                        {char.profile_data?.outfit_advice}
                      </p>
                    </div>
                  </div>

                  {/* Friend Picker Dropdown per Role */}
                  {useFriendNames && friendRoster.length > 0 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-1.5 border-t border-slate-200/80"
                    >
                      <select
                        value={friendAssignments[char.id] || ''}
                        onChange={(e) =>
                          setFriendAssignments((prev) => ({
                            ...prev,
                            [char.id]: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-[10px] font-bold text-slate-700"
                      >
                        {friendRoster.map((f) => (
                          <option key={f.id} value={f.id}>
                            👤 {f.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 1: PRE-PARTY CAST & POV BRIEFING */}
      {step === 'cast' && povChar && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 rounded-2xl bg-slate-900 text-white p-6 border border-slate-800 space-y-4">
            <span className="px-2.5 py-1 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              Your Character Dossier
            </span>
            <h2 className="text-xl font-black uppercase tracking-tight">
              {povChar.displayName}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {hydrate(povChar.profile_data?.act_summary)}
            </p>
            {Array.isArray(povChar.profile_data?.act_bullets) && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  How to Act Tonight:
                </div>
                {povChar.profile_data.act_bullets.map((b: string, i: number) => (
                  <div key={i} className="text-xs text-slate-200 flex items-start gap-2">
                    <span className="text-brand-pink font-black">•</span>
                    <span>{hydrate(b)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Your Connections to the Room
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  How {povChar.displayName} Knows Everyone Else
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStep('round1')}
                className="px-4 py-2 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider cursor-pointer"
              >
                Start Round 1 Clues →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {povRelationships.map((rel: any) => {
                const otherId =
                  rel.character_a_id === povChar.id
                    ? rel.character_b_id
                    : rel.character_a_id;
                const otherChar = getCharById(otherId);
                return (
                  <div
                    key={rel.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900">
                        {otherChar?.displayName || 'Guest'}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-bold">
                        {hydrate(rel.relationship_type)}
                      </span>
                    </div>
                    {rel.backstory && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {hydrate(rel.backstory)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2, 3, 4: ROUND-BY-ROUND SOLO PLAYTEST */}
      {(step === 'round1' || step === 'round2' || step === 'round3') && (
        <div>
          {(() => {
            const rNum = step === 'round1' ? 1 : step === 'round2' ? 2 : 3;
            const roundClues = cluesByRound[rNum as 1 | 2 | 3] || [];
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roundClues.map((clue, idx) => renderClueCard(clue, idx, rNum))}
                </div>
                {renderRoundGuessBox(rNum)}
              </>
            );
          })()}
        </div>
      )}

      {/* ALL CLUES SIDE-BY-SIDE VIEW */}
      {step === 'all_clues' && (
        <div className="space-y-8">
          {[1, 2, 3].map((rNum) => (
            <div key={rNum} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                  Round {rNum} Evidence ({cluesByRound[rNum as 1 | 2 | 3].length} Clues)
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cluesByRound[rNum as 1 | 2 | 3].map((clue, idx) =>
                  renderClueCard(clue, idx, rNum)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* STEP 5: FINAL SOLUTION & SOLO PLAYER SCORECARD */}
      {step === 'reveal' && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-slate-900 text-white p-6 border border-emerald-500/40 shadow-xl space-y-4">
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              Official Case Solution
            </span>
            <h2 className="text-xl font-black uppercase">
              The Killer: {killerChar?.displayName || 'Unknown'} • Victim:{' '}
              {victimChar?.displayName || 'Unknown'}
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed">
              {hydrate(
                killerChar?.motive?.notes ||
                  killerChar?.profile_data?.bio ||
                  mystery?.description
              )}
            </p>

            {/* Compare Solo Player's Round 1, 2, 3 Guesses */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
              {[1, 2, 3].map((rNum) => {
                const g = guesses[rNum];
                const guessedChar = getCharById(g?.suspectId);
                const isCorrect =
                  guessedChar && killerChar && guessedChar.id === killerChar.id;
                return (
                  <div
                    key={rNum}
                    className={`rounded-xl p-4 border ${
                      !guessedChar
                        ? 'bg-slate-950 border-slate-800'
                        : isCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/50'
                        : 'bg-rose-950/30 border-rose-500/40'
                    }`}
                  >
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Your Round {rNum} Accusation
                    </div>
                    <div className="text-sm font-black mt-1">
                      {guessedChar ? (
                        <span>
                          {guessedChar.displayName}{' '}
                          {isCorrect ? '✅ (Correct Killer!)' : '❌ (Decoy / Innocent)'}
                        </span>
                      ) : (
                        <span className="text-slate-500">No suspect selected</span>
                      )}
                    </div>
                    {g?.motiveGuess && (
                      <div className="text-xs text-slate-300 mt-1.5 italic">
                        &ldquo;{g.motiveGuess}&rdquo;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Plot Beats & Fake Subplots Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Main Plot Beats (True Murder Timeline)
              </h3>
              {plotBeats.map((b: any) => (
                <div
                  key={b.id}
                  className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3.5 space-y-1"
                >
                  <div className="text-xs font-black text-emerald-950">
                    Beat {b.beat_number}: {hydrate(b.title)}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {hydrate(b.description)}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Red-Herring Subplots & Why They Are Cleared
              </h3>
              {subplots.map((sp: any) => (
                <div
                  key={sp.id}
                  className="rounded-xl bg-rose-50/60 border border-rose-200 p-3.5 space-y-1"
                >
                  <div className="text-xs font-black text-rose-950">
                    {hydrate(sp.title)}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {hydrate(sp.description)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
