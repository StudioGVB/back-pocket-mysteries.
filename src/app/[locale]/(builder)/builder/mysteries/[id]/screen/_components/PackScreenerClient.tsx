'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';
import { GuestModal } from '@/components/account/GuestModal';
import { saveGuestAction } from '@/app/actions/guests';

export interface FriendRosterItem {
  id: string;
  name: string;
  gender: string;
  avatar_url: string;
  photoUrl: string | null;
  hasAiPhoto?: boolean;
  eye_color?: string;
  height?: string;
  ethnicity?: string;
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

  const [liveFriends, setLiveFriends] = useState<FriendRosterItem[]>(friendRoster);
  const [generatingFriendIds, setGeneratingFriendIds] = useState<Set<string>>(new Set());

  const [step, setStep] = useState<ScreenerStep>('round1');
  // Default to ON so test mode automatically uses the user's friends!
  const [useFriendNames, setUseFriendNames] = useState<boolean>(true);
  const [xRayMode, setXRayMode] = useState<boolean>(false);
  const [showCastPanel, setShowCastPanel] = useState<boolean>(true);
  const [shuffleSeed, setShuffleSeed] = useState<number>(0);
  const [isAddFriendOpen, setIsAddFriendOpen] = useState<boolean>(false);

  const [friendAssignments, setFriendAssignments] = useState<Record<string, string>>(() =>
    buildDefaultFriendAssignments(rawCharacters, friendRoster, 0)
  );

  const [selectedPovCharId, setSelectedPovCharId] = useState<string>(
    rawCharacters.find((c) => !c.is_victim)?.id || rawCharacters[0]?.id || ''
  );

  // Solo player notebook state: tag clues, pin suspects, & record round guesses (persisted to localStorage per mystery)
  const [clueTags, setClueTags] = useState<Record<string, 'key' | 'red_herring' | 'alibi' | undefined>>({});
  const [clueNotes, setClueNotes] = useState<Record<string, string>>({});
  const [clueSuspects, setClueSuspects] = useState<Record<string, string[]>>({});
  const [tagFilter, setTagFilter] = useState<'all' | 'key' | 'alibi' | 'red_herring' | 'untagged'>('all');
  const [notebookSortMode, setNotebookSortMode] = useState<'round' | 'timeline'>('round');
  const [guesses, setGuesses] = useState<Record<number, RoundGuess>>({
    1: { suspectId: '', motiveGuess: '' },
    2: { suspectId: '', motiveGuess: '' },
    3: { suspectId: '', motiveGuess: '' },
  });
  const [notebookLoaded, setNotebookLoaded] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !mystery?.id) return;
    try {
      const savedTags = window.localStorage.getItem(`bpm_clue_tags_${mystery.id}`);
      if (savedTags) {
        const parsed = JSON.parse(savedTags);
        if (parsed && typeof parsed === 'object') setClueTags(parsed);
      }
      const savedNotes = window.localStorage.getItem(`bpm_clue_notes_${mystery.id}`);
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        if (parsed && typeof parsed === 'object') setClueNotes(parsed);
      }
      const savedSuspects = window.localStorage.getItem(`bpm_clue_suspects_${mystery.id}`);
      if (savedSuspects) {
        const parsed = JSON.parse(savedSuspects);
        if (parsed && typeof parsed === 'object') setClueSuspects(parsed);
      }
      const savedGuesses = window.localStorage.getItem(`bpm_round_guesses_${mystery.id}`);
      if (savedGuesses) {
        const parsed = JSON.parse(savedGuesses);
        if (parsed && typeof parsed === 'object') {
          setGuesses((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setNotebookLoaded(true);
    }
  }, [mystery?.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_tags_${mystery.id}`, JSON.stringify(clueTags));
    } catch {
      // Non-fatal
    }
  }, [clueTags, notebookLoaded, mystery?.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_notes_${mystery.id}`, JSON.stringify(clueNotes));
    } catch {
      // Non-fatal
    }
  }, [clueNotes, notebookLoaded, mystery?.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_suspects_${mystery.id}`, JSON.stringify(clueSuspects));
    } catch {
      // Non-fatal
    }
  }, [clueSuspects, notebookLoaded, mystery?.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.setItem(`bpm_round_guesses_${mystery.id}`, JSON.stringify(guesses));
    } catch {
      // Non-fatal
    }
  }, [guesses, notebookLoaded, mystery?.id]);

  const handleClearNotebook = useCallback(() => {
    setClueTags({});
    setClueNotes({});
    setClueSuspects({});
    setGuesses({
      1: { suspectId: '', motiveGuess: '' },
      2: { suspectId: '', motiveGuess: '' },
      3: { suspectId: '', motiveGuess: '' },
    });
    if (typeof window !== 'undefined' && mystery?.id) {
      window.localStorage.removeItem(`bpm_clue_tags_${mystery.id}`);
      window.localStorage.removeItem(`bpm_clue_notes_${mystery.id}`);
      window.localStorage.removeItem(`bpm_clue_suspects_${mystery.id}`);
      window.localStorage.removeItem(`bpm_round_guesses_${mystery.id}`);
    }
  }, [mystery?.id]);

  const toggleClueSuspect = useCallback((clueId: string, charId: string) => {
    setClueSuspects((prev) => {
      const current = prev[clueId] || [];
      const exists = current.includes(charId);
      const nextList = exists ? current.filter((id) => id !== charId) : [...current, charId];
      return { ...prev, [clueId]: nextList };
    });
  }, []);

  const extractClueTimestampInfo = useCallback((clue: any): { label: string | null; minutes: number } => {
    const combined = `${clue?.title || ''} ${clue?.description || ''}`;
    const match = combined.match(/\b(\d{1,2}):(\d{2})\s*([AP]M)\b/i);
    if (!match) return { label: null, minutes: 99999 };
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const mer = match[3].toUpperCase();
    if (mer === 'PM' && hours < 12) hours += 12;
    if (mer === 'AM' && hours === 12) hours = 0;
    return {
      label: `${match[1]}:${match[2]} ${mer}`,
      minutes: hours * 60 + mins,
    };
  }, []);

  // Custom dropdown menu state ('suspect-1' | 'suspect-2' | 'suspect-3' | 'pov' | 'friend-<charId>' | null)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-custom-dropdown]')) {
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdownId(null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdownId]);

  const triggerFriendAiPhoto = useCallback(async (friend: FriendRosterItem) => {
    if (!friend?.id || generatingFriendIds.has(friend.id)) return;
    setGeneratingFriendIds((prev) => new Set(prev).add(friend.id));
    try {
      const res = await generateGuestAvatarAction(friend.id, {
        id: friend.id,
        name: friend.name,
        gender: friend.gender,
        eye_color: friend.eye_color,
        height: friend.height,
        ethnicity: friend.ethnicity,
        avatar_url: friend.avatar_url,
      });
      if (res?.publicUrl) {
        const extractedPhoto = resolveDisplayAvatarUrl(res.publicUrl);
        setLiveFriends((prev) =>
          prev.map((f) =>
            f.id === friend.id
              ? {
                  ...f,
                  avatar_url: res.publicUrl,
                  photoUrl: extractedPhoto,
                  hasAiPhoto: true,
                }
              : f
          )
        );
      }
    } catch (err) {
      console.error(`Failed to generate AI headshot for ${friend.name}:`, err);
    } finally {
      setGeneratingFriendIds((prev) => {
        const next = new Set(prev);
        next.delete(friend.id);
        return next;
      });
    }
  }, [generatingFriendIds]);

  // Automatically generate AI headshot for any friend in the roster missing one (e.g. Charley)
  useEffect(() => {
    const missing = liveFriends.filter(
      (f) =>
        f.id &&
        (!f.hasAiPhoto || !f.photoUrl || f.photoUrl.includes('api.dicebear.com'))
    );
    for (const f of missing) {
      void triggerFriendAiPhoto(f);
    }
  }, [liveFriends, triggerFriendAiPhoto]);

  const handleShuffleFriends = () => {
    const nextSeed = shuffleSeed + 1;
    setShuffleSeed(nextSeed);
    setFriendAssignments(buildDefaultFriendAssignments(rawCharacters, liveFriends, nextSeed));
  };

  // Build hydrated characters using the user's real friends from My Roster (or Role Titles when toggled off)
  const activeCharacters = useMemo(() => {
    return rawCharacters.map((c) => {
      const roleTitle = getCharacterRoleTitle(c) || c.name;
      const assignedFriendId = friendAssignments[c.id];
      const friend = liveFriends.find((f) => f.id === assignedFriendId);

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
          friend_photo_url: friend.photoUrl ? resolveDisplayAvatarUrl(friend.photoUrl) : null,
        },
      };
    });
  }, [rawCharacters, liveFriends, friendAssignments, useFriendNames]);

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
    const rawChar = rawCharacters.find((rc) => rc.id === c?.id);
    const isSameGuestAsRendered =
      rawChar?.profile_data?.guest_id &&
      c?.profile_data?.guest_id &&
      String(rawChar.profile_data.guest_id) === String(c.profile_data.guest_id);

    if (useFriendNames) {
      if (isSameGuestAsRendered && rawChar?.profile_data?.standard_character_photo_url) {
        return rawChar.profile_data.standard_character_photo_url;
      }
      if (c?.profile_data?.friend_photo_url) {
        return c.profile_data.friend_photo_url;
      }
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

        {/* Footer: Solo Player Scratchpad, Quick Deduction Chips, Suspect Pinning & Admin X-Ray Notes */}
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

          {/* 1-Tap Quick Deduction Chips */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              '⏱️ Timeline Gap',
              '💔 Affair Motive',
              '💰 Money / Blackmail',
              '🔪 Murder Weapon',
              '🤥 Fake Alibi',
            ].map((chip) => {
              const curNote = clueNotes[clue.id] || '';
              const isChipActive = curNote.includes(chip);
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() =>
                    setClueNotes((prev) => {
                      const existing = (prev[clue.id] || '').trim();
                      if (existing.includes(chip)) {
                        const cleaned = existing
                          .replace(chip, '')
                          .replace(/^\s*•\s*|\s*•\s*$/g, '')
                          .replace(/\s*•\s*•\s*/g, ' • ')
                          .trim();
                        return { ...prev, [clue.id]: cleaned };
                      }
                      return {
                        ...prev,
                        [clue.id]: existing ? `${existing} • ${chip}` : chip,
                      };
                    })
                  }
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    isChipActive
                      ? 'bg-brand-pink/25 text-brand-pink border border-brand-pink/50'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Pin Suspects to Clue */}
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-900">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mr-1">
              📌 Pin Suspect:
            </span>
            {activeCharacters
              .filter((c) => !c.is_victim)
              .map((s) => {
                const pinnedList = clueSuspects[clue.id] || [];
                const isPinned = pinnedList.includes(s.id);
                const shortLabel = s.assignedFriend?.name || s.displayRoleTitle || s.displayName;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleClueSuspect(clue.id, s.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                      isPinned
                        ? tag === 'alibi'
                          ? 'bg-sky-400 text-slate-950 font-black'
                          : tag === 'red_herring'
                          ? 'bg-rose-500 text-white font-black'
                          : 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {isPinned ? '✓ ' : ''}
                    {shortLabel}
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderRoundGuessBox = (roundNum: number) => {
    const currentGuess = guesses[roundNum] || { suspectId: '', motiveGuess: '' };
    const suspectList = activeCharacters.filter((c) => !c.is_victim);
    const dropdownKey = `suspect-${roundNum}`;
    const isOpen = openDropdownId === dropdownKey;
    const selectedSuspect = suspectList.find((s) => s.id === currentGuess.suspectId);

    // Compute per-suspect linked Key clues & Alibi clues from the player's pinned clues up through roundNum
    const suspectClueTallies: Record<
      string,
      { keyCount: number; alibiCount: number; decoyCount: number }
    > = {};
    for (const s of suspectList) {
      suspectClueTallies[s.id] = { keyCount: 0, alibiCount: 0, decoyCount: 0 };
    }

    // Collect all clues up through roundNum that the player tagged, pinned a suspect to, or wrote a note on
    const annotatedEntries: Array<{
      clue: any;
      round: number;
      indexInRound: number;
      tag?: 'key' | 'red_herring' | 'alibi';
      note: string;
      pinnedSuspectIds: string[];
      timeInfo: { label: string | null; minutes: number };
    }> = [];

    for (let r = 1; r <= roundNum; r++) {
      const rClues = cluesByRound[r as 1 | 2 | 3] || [];
      rClues.forEach((c: any, idx: number) => {
        const t = clueTags[c.id];
        const n = (clueNotes[c.id] || '').trim();
        const pinned = clueSuspects[c.id] || [];
        for (const sId of pinned) {
          if (suspectClueTallies[sId]) {
            if (t === 'alibi') suspectClueTallies[sId].alibiCount++;
            else if (t === 'red_herring') suspectClueTallies[sId].decoyCount++;
            else suspectClueTallies[sId].keyCount++;
          }
        }
        if (t || n || pinned.length > 0) {
          annotatedEntries.push({
            clue: c,
            round: r,
            indexInRound: idx + 1,
            tag: t,
            note: n,
            pinnedSuspectIds: pinned,
            timeInfo: extractClueTimestampInfo(c),
          });
        }
      });
    }

    const sortedAnnotatedEntries =
      notebookSortMode === 'timeline'
        ? [...annotatedEntries].sort((a, b) => a.timeInfo.minutes - b.timeInfo.minutes)
        : annotatedEntries;

    return (
      <div className="mt-8 rounded-2xl bg-slate-900 border border-brand-pink/30 p-6 text-white shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
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

        {/* Detective Notebook Summary Strip (Shows Tagged Clues, Timestamps & Notes to help formulate theory) */}
        <div className="rounded-xl bg-slate-950/90 border border-slate-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                📓 Your Detective Notebook ({annotatedEntries.length} Pinned)
              </span>
              <span className="text-[11px] text-slate-400">
                Saved automatically • Sort by round or chronological crime timeline
              </span>
            </div>
            <div className="flex items-center gap-2">
              {annotatedEntries.length > 1 && (
                <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setNotebookSortMode('round')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      notebookSortMode === 'round'
                        ? 'bg-brand-pink text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🔢 By Round
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotebookSortMode('timeline')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      notebookSortMode === 'timeline'
                        ? 'bg-amber-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⏱️ Crime Timeline
                  </button>
                </div>
              )}
              {annotatedEntries.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearNotebook}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Clear Notebook
                </button>
              )}
            </div>
          </div>

          {sortedAnnotatedEntries.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              Tip: Tag any clue card above as <strong className="text-amber-300">🔑 Key</strong>, <strong className="text-rose-300">🐟 Decoy</strong>, or <strong className="text-sky-300">🛡️ Alibi</strong>, pin a suspect, or tap a quick deduction chip—your pinned deductions will collect right here for voting and final scoring!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {sortedAnnotatedEntries.map(({ clue: c, round, indexInRound, tag, note, pinnedSuspectIds, timeInfo }) => {
                const cTitle = hydrate(stripCustomerFacingTitle(c.title) || c.title);
                return (
                  <div
                    key={c.id}
                    className={`rounded-lg border px-3 py-2 text-xs flex flex-col justify-between gap-1.5 ${
                      tag === 'key'
                        ? 'bg-amber-500/10 border-amber-400/40'
                        : tag === 'red_herring'
                        ? 'bg-rose-500/10 border-rose-400/40'
                        : tag === 'alibi'
                        ? 'bg-sky-500/10 border-sky-400/40'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {timeInfo.label && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase shrink-0">
                            🕒 {timeInfo.label}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase shrink-0">
                          R{round} • #{indexInRound}
                        </span>
                        <span className="font-bold text-white truncate">{cTitle}</span>
                      </div>
                      {tag && (
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                            tag === 'key'
                              ? 'bg-amber-400 text-slate-950'
                              : tag === 'red_herring'
                              ? 'bg-rose-500 text-white'
                              : 'bg-sky-400 text-slate-950'
                          }`}
                        >
                          {tag === 'key' ? '🔑 Key' : tag === 'red_herring' ? '🐟 Decoy' : '🛡️ Alibi'}
                        </span>
                      )}
                    </div>

                    {pinnedSuspectIds.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        {pinnedSuspectIds.map((sId) => {
                          const sChar = getCharById(sId);
                          if (!sChar) return null;
                          return (
                            <span
                              key={sId}
                              className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200 text-[9px] font-bold"
                            >
                              👤 {sChar.assignedFriend?.name || sChar.displayName}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {note && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <p className="text-[11px] text-slate-300 italic truncate">&ldquo;{note}&rdquo;</p>
                        <button
                          type="button"
                          onClick={() =>
                            setGuesses((prev) => ({
                              ...prev,
                              [roundNum]: {
                                ...currentGuess,
                                motiveGuess: currentGuess.motiveGuess
                                  ? `${currentGuess.motiveGuess}; ${note}`
                                  : note,
                              },
                            }))
                          }
                          className="px-2 py-0.5 rounded bg-brand-pink/20 hover:bg-brand-pink text-brand-pink hover:text-white text-[9px] font-black uppercase tracking-wider shrink-0 transition-colors cursor-pointer"
                        >
                          + Use in Theory
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <div className="relative" data-custom-dropdown>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
              Who is your #1 Suspect after Round {roundNum}?
            </label>
            <button
              type="button"
              onClick={() => setOpenDropdownId(isOpen ? null : dropdownKey)}
              className={`w-full rounded-xl bg-slate-950 border px-3.5 py-2.5 text-xs font-bold text-white flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                isOpen
                  ? 'border-brand-pink ring-2 ring-brand-pink/25'
                  : selectedSuspect
                  ? 'border-brand-pink/50 hover:border-brand-pink'
                  : 'border-slate-700/90 hover:border-slate-500'
              }`}
            >
              {selectedSuspect ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  {getPortraitUrl(selectedSuspect) ? (
                    <img
                      src={getPortraitUrl(selectedSuspect)}
                      alt={selectedSuspect.displayName}
                      className="w-6 h-6 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <span className="w-6 h-6 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink flex items-center justify-center text-[10px] font-black shrink-0">
                      {(selectedSuspect.assignedFriend?.name || selectedSuspect.displayName || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="text-white font-black truncate">
                    {selectedSuspect.assignedFriend?.name || selectedSuspect.displayName}
                  </span>
                  {selectedSuspect.assignedFriend && selectedSuspect.displayRoleTitle && (
                    <span className="px-2 py-0.5 rounded-md bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-bold shrink-0">
                      {selectedSuspect.displayRoleTitle}
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-sm leading-none">🕵️</span>
                  <span className="font-semibold">Select your #1 suspect...</span>
                </div>
              )}

              <svg
                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-brand-pink' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-2 z-50 rounded-2xl bg-slate-950/98 backdrop-blur-xl border border-slate-700/90 shadow-2xl shadow-black/80 p-1.5 space-y-1 max-h-72 overflow-y-auto">
                <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-800/80 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Suspect Lineup ({suspectList.length})
                  </span>
                  {selectedSuspect && (
                    <button
                      type="button"
                      onClick={() => {
                        setGuesses((prev) => ({
                          ...prev,
                          [roundNum]: { ...currentGuess, suspectId: '' },
                        }));
                        setOpenDropdownId(null);
                      }}
                      className="text-[10px] font-bold text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {suspectList.map((s) => {
                  const isSelected = s.id === currentGuess.suspectId;
                  const avatar = getPortraitUrl(s);
                  const guestLabel = s.assignedFriend?.name || s.displayName;
                  const roleLabel = s.assignedFriend ? s.displayRoleTitle : null;
                  const tally = suspectClueTallies[s.id] || { keyCount: 0, alibiCount: 0, decoyCount: 0 };

                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setGuesses((prev) => ({
                          ...prev,
                          [roundNum]: { ...currentGuess, suspectId: s.id },
                        }));
                        setOpenDropdownId(null);
                      }}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-brand-pink/15 border border-brand-pink/40 text-white'
                          : 'hover:bg-slate-800/90 text-slate-200 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={ s.displayName }
                            className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center text-[11px] font-black shrink-0">
                            {(guestLabel || '?').charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          <span className="text-xs font-black text-white truncate">
                            {guestLabel}
                          </span>
                          {roleLabel && (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                                isSelected
                                  ? 'bg-brand-pink/25 text-brand-pink'
                                  : 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {roleLabel}
                            </span>
                          )}
                          {tally.keyCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[9px] font-black uppercase shrink-0">
                              🔑 {tally.keyCount} Key
                            </span>
                          )}
                          {tally.alibiCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 border border-sky-400/40 text-[9px] font-black uppercase shrink-0">
                              🛡️ {tally.alibiCount} Alibi
                            </span>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider shrink-0">
                          ✓ Suspect
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
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
              className="w-full rounded-xl bg-slate-950 border border-slate-700/90 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-pink"
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
              onClick={() => setIsAddFriendOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border bg-brand-pink/20 border-brand-pink/50 text-brand-pink hover:bg-brand-pink hover:text-white transition-all cursor-pointer"
            >
              + Add Friend
            </button>

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
            <div className="flex items-center gap-2 text-xs relative" data-custom-dropdown>
              <span className="font-bold text-slate-500">Playing POV As:</span>
              <button
                type="button"
                onClick={() =>
                  setOpenDropdownId(openDropdownId === 'pov' ? null : 'pov')
                }
                className="rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-900 flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
              >
                <span>
                  {povChar?.displayName || 'Select Role'}{' '}
                  {povChar?.is_victim ? '(Victim)' : ''}
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                    openDropdownId === 'pov' ? 'rotate-180 text-brand-pink' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {openDropdownId === 'pov' && (
                <div className="absolute right-0 top-full mt-1.5 w-64 z-50 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-2xl p-1.5 space-y-1">
                  {activeCharacters.map((c) => {
                    const isSelected = c.id === selectedPovCharId;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedPovCharId(c.id);
                          setOpenDropdownId(null);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-brand-pink/20 border border-brand-pink/40 text-white'
                            : 'hover:bg-slate-800 text-slate-200 border border-transparent'
                        }`}
                      >
                        <span className="truncate">
                          {c.displayName} {c.is_victim ? '💀' : ''}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-black text-brand-pink">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {activeCharacters.map((char) => {
              const photo = getPortraitUrl(char);
              const isSelectedPov = char.id === selectedPovCharId;
              const isGeneratingPhoto =
                Boolean(char.assignedFriend?.id) &&
                generatingFriendIds.has(char.assignedFriend.id);
              const friendDropKey = `friend-${char.id}`;
              const isFriendDropOpen = openDropdownId === friendDropKey;

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
                          onError={() => {
                            if (char.assignedFriend) {
                              void triggerFriendAiPhoto(char.assignedFriend);
                            }
                          }}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-500 text-xs">
                          No Photo
                        </div>
                      )}
                      {isGeneratingPhoto && (
                        <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center gap-1.5 z-10">
                          <span className="w-5 h-5 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
                          <span className="text-[9px] font-black uppercase tracking-wider text-white">
                            Rendering AI Photo...
                          </span>
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
                  {useFriendNames && liveFriends.length > 0 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="pt-1.5 border-t border-slate-200/80 relative"
                      data-custom-dropdown
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setOpenDropdownId(isFriendDropOpen ? null : friendDropKey)
                        }
                        className="w-full rounded-lg border border-slate-200 hover:border-slate-300 bg-white px-2 py-1 text-[10px] font-bold text-slate-700 flex items-center justify-between gap-1 transition-all cursor-pointer"
                      >
                        <span className="truncate">
                          👤 {char.assignedFriend?.name || 'Select Friend'}
                        </span>
                        <svg
                          className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                            isFriendDropOpen ? 'rotate-180 text-brand-pink' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isFriendDropOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl bg-slate-950 text-white border border-slate-800 shadow-xl p-1 max-h-48 overflow-y-auto space-y-0.5">
                          {liveFriends.map((f) => {
                            const isSelected = friendAssignments[char.id] === f.id;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => {
                                  setFriendAssignments((prev) => ({
                                    ...prev,
                                    [char.id]: f.id,
                                  }));
                                  setOpenDropdownId(null);
                                }}
                                className={`w-full flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-left text-[10px] font-bold transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-pink/20 text-brand-pink'
                                    : 'hover:bg-slate-800 text-slate-200'
                                }`}
                              >
                                <span className="truncate">👤 {f.name}</span>
                                {isSelected && <span>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      )}
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
                const dynamicsList: string[] = Array.isArray(rel.dynamics) && rel.dynamics.length > 0
                  ? rel.dynamics
                  : rel.relationship_type
                  ? [rel.relationship_type]
                  : ['Connected'];
                const breakdownText = rel.notes || rel.backstory || '';

                return (
                  <div
                    key={rel.id}
                    onClick={() => otherChar && setSelectedPovCharId(otherChar.id)}
                    title="Click to switch POV to this character"
                    className="cursor-pointer rounded-xl border border-slate-200 hover:border-brand-pink/50 bg-slate-50 hover:bg-brand-pink/[0.03] p-4 space-y-2 transition-all group"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900 group-hover:text-brand-pink transition-colors">
                        {otherChar?.displayName || 'Guest'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {dynamicsList.map((dyn, dIdx) => (
                          <span
                            key={dIdx}
                            className="px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 text-[10px] font-bold"
                          >
                            {hydrate(dyn)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {breakdownText && (
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {hydrate(breakdownText)}
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
            const matchesTagFilter = (c: any) => {
              const t = clueTags[c.id];
              if (tagFilter === 'all') return true;
              if (tagFilter === 'untagged') return !t;
              return t === tagFilter;
            };
            const filteredClues = roundClues.filter(matchesTagFilter);
            const countForTag = (filter: 'all' | 'key' | 'alibi' | 'red_herring' | 'untagged') =>
              roundClues.filter((c: any) => {
                const t = clueTags[c.id];
                if (filter === 'all') return true;
                if (filter === 'untagged') return !t;
                return t === filter;
              }).length;

            return (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 border border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    🔍 Filter Round {rNum} Evidence by Tag:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'all', label: 'All Clues' },
                        { id: 'key', label: '🔑 Key' },
                        { id: 'alibi', label: '🛡️ Alibi' },
                        { id: 'red_herring', label: '🐟 Decoy' },
                        { id: 'untagged', label: '❓ Untagged' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setTagFilter(opt.id)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          tagFilter === opt.id
                            ? 'bg-brand-pink text-white shadow'
                            : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {opt.label} ({countForTag(opt.id)})
                      </button>
                    ))}
                  </div>
                </div>

                {filteredClues.length === 0 ? (
                  <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center text-white space-y-2">
                    <div className="text-sm font-black uppercase">
                      No Round {rNum} clues match this tag filter
                    </div>
                    <button
                      type="button"
                      onClick={() => setTagFilter('all')}
                      className="px-3 py-1.5 rounded-lg bg-brand-pink text-white text-[11px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      Show All Round {rNum} Clues
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {roundClues.map((clue, idx) =>
                      matchesTagFilter(clue) ? renderClueCard(clue, idx, rNum) : null
                    )}
                  </div>
                )}
                {renderRoundGuessBox(rNum)}
              </>
            );
          })()}
        </div>
      )}

      {/* ALL CLUES SIDE-BY-SIDE VIEW */}
      {step === 'all_clues' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-900 text-white px-4 py-2.5 border border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              🔍 Filter All Clues by Tag:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All Clues' },
                  { id: 'key', label: '🔑 Key' },
                  { id: 'alibi', label: '🛡️ Alibi' },
                  { id: 'red_herring', label: '🐟 Decoy' },
                  { id: 'untagged', label: '❓ Untagged' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTagFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    tagFilter === opt.id
                      ? 'bg-brand-pink text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {[1, 2, 3].map((rNum) => {
            const roundList = cluesByRound[rNum as 1 | 2 | 3] || [];
            const matchesTagFilter = (c: any) => {
              const t = clueTags[c.id];
              if (tagFilter === 'all') return true;
              if (tagFilter === 'untagged') return !t;
              return t === tagFilter;
            };
            return (
              <div key={rNum} className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                    Round {rNum} Evidence ({roundList.filter(matchesTagFilter).length} / {roundList.length} Clues)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {roundList.map((clue, idx) =>
                    matchesTagFilter(clue) ? renderClueCard(clue, idx, rNum) : null
                  )}
                </div>
              </div>
            );
          })}
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

          {/* Clue Tagging & Detective Notes Accuracy Scorecard */}
          {(() => {
            const allOrderedClues: Array<{ clue: any; round: number; indexInRound: number }> = [];
            for (const r of [1, 2, 3] as const) {
              (cluesByRound[r] || []).forEach((c: any, idx: number) => {
                allOrderedClues.push({ clue: c, round: r, indexInRound: idx + 1 });
              });
            }

            const taggedOrNoted = allOrderedClues.filter(
              ({ clue: c }) =>
                Boolean(clueTags[c.id]) ||
                Boolean((clueNotes[c.id] || '').trim()) ||
                (clueSuspects[c.id] || []).length > 0
            );
            const taggedItems = allOrderedClues.filter(({ clue: c }) => Boolean(clueTags[c.id]));

            let correctKeyCount = 0;
            let totalKeyTagged = 0;
            let trickedByDecoyCount = 0;
            let correctDecoyOrAlibiCount = 0;
            let totalDecoyOrAlibiTagged = 0;

            for (const { clue: c } of taggedItems) {
              const t = clueTags[c.id];
              const isFake = c.evidence_status === 'fake' || c.implication_type === 'red_herring';
              if (t === 'key') {
                totalKeyTagged++;
                if (!isFake) correctKeyCount++;
                else trickedByDecoyCount++;
              } else if (t === 'red_herring' || t === 'alibi') {
                totalDecoyOrAlibiTagged++;
                if (isFake) correctDecoyOrAlibiCount++;
              }
            }

            const totalTagged = totalKeyTagged + totalDecoyOrAlibiTagged;
            const totalCorrectTags = correctKeyCount + correctDecoyOrAlibiCount;
            const bonusPoints = correctKeyCount * 10 + correctDecoyOrAlibiCount * 15;
            const accuracyPct =
              totalTagged > 0 ? Math.round((totalCorrectTags / totalTagged) * 100) : null;
            const notesWrittenCount = allOrderedClues.filter(({ clue: c }) =>
              Boolean((clueNotes[c.id] || '').trim())
            ).length;

            return (
              <div className="rounded-2xl bg-slate-900 text-white p-6 border border-amber-400/40 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                      📓 Detective Notebook Scorecard
                    </span>
                    <h3 className="text-lg font-black uppercase mt-1">
                      How Your Clue Tags &amp; Notes Stacked Up Against the Truth
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {bonusPoints > 0 && (
                      <div className="px-3.5 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-right">
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300">
                          Clue Tag Bonus
                        </div>
                        <div className="text-base font-black text-emerald-300">
                          +{bonusPoints} Detective Pts
                        </div>
                      </div>
                    )}
                    {accuracyPct !== null && (
                      <div className="px-4 py-2 rounded-xl bg-slate-950 border border-amber-400/40 text-right">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tag Accuracy
                        </div>
                        <div className="text-base font-black text-amber-300">
                          {accuracyPct}% ({totalCorrectTags}/{totalTagged} Clues Right)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Party Awards Preview */}
                {(correctDecoyOrAlibiCount > 0 || trickedByDecoyCount > 0) && (
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    {correctDecoyOrAlibiCount > 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-200 text-xs font-black">
                        🦅 Earned Party Award: &ldquo;The BS Detector&rdquo; ({correctDecoyOrAlibiCount}{' '}
                        {correctDecoyOrAlibiCount === 1 ? 'Red Herring' : 'Red Herrings'} Spotted)
                      </div>
                    )}
                    {trickedByDecoyCount > 0 && (
                      <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-black">
                        🎣 Party Award Risk: &ldquo;Hook, Line &amp; Sinker&rdquo; (Baited by {trickedByDecoyCount}{' '}
                        {trickedByDecoyCount === 1 ? 'Decoy' : 'Decoys'})
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                      🔑 Key Evidence Tagged (+10 pts each)
                    </div>
                    <div className="text-sm font-black text-white mt-1">
                      {totalKeyTagged > 0
                        ? `${correctKeyCount}/${totalKeyTagged} were Real Murder Clues`
                        : 'No clues tagged 🔑 Key'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                      🐟 Decoys &amp; 🛡️ Alibis Spotted (+15 pts each)
                    </div>
                    <div className="text-sm font-black text-white mt-1">
                      {totalDecoyOrAlibiTagged > 0
                        ? `${correctDecoyOrAlibiCount}/${totalDecoyOrAlibiTagged} were Red Herrings`
                        : 'No clues tagged Decoy/Alibi'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                      ✍️ Detective Notes Written
                    </div>
                    <div className="text-sm font-black text-white mt-1">
                      {notesWrittenCount} {notesWrittenCount === 1 ? 'Note' : 'Notes'} Recorded
                    </div>
                  </div>
                </div>

                {taggedOrNoted.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">
                    You didn&apos;t tag any clues or write any notes during this run. In Rounds 1–3, use the <strong className="text-amber-300">🔑 Key</strong>, <strong className="text-rose-300">🐟 Decoy</strong>, and <strong className="text-sky-300">🛡️ Alibi</strong> buttons and the note field on any clue card to track your deductions!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    {taggedOrNoted.map(({ clue: c, round, indexInRound }) => {
                      const t = clueTags[c.id];
                      const note = (clueNotes[c.id] || '').trim();
                      const pinnedCharNames = (clueSuspects[c.id] || [])
                        .map((sId) => getCharById(sId)?.displayName)
                        .filter(Boolean);
                      const isFake =
                        c.evidence_status === 'fake' || c.implication_type === 'red_herring';
                      const tagWasCorrect =
                        t === 'key'
                          ? !isFake
                          : t === 'red_herring' || t === 'alibi'
                          ? isFake
                          : null;
                      const cTitle = hydrate(stripCustomerFacingTitle(c.title) || c.title);

                      return (
                        <div
                          key={c.id}
                          className={`rounded-xl p-3.5 border space-y-1.5 ${
                            tagWasCorrect === true
                              ? 'bg-emerald-950/30 border-emerald-500/40'
                              : tagWasCorrect === false
                              ? 'bg-rose-950/30 border-rose-500/40'
                              : 'bg-slate-950 border-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase shrink-0">
                                R{round} • #{indexInRound}
                              </span>
                              <span className="text-xs font-black text-white truncate">
                                {cTitle}
                              </span>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                isFake
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              }`}
                            >
                              {isFake ? '🎭 Fake / Subplot' : '✓ Real Clue'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            {t ? (
                              <span className="font-bold text-slate-300">
                                Your Tag:{' '}
                                <strong className="text-white">
                                  {t === 'key'
                                    ? '🔑 Key'
                                    : t === 'red_herring'
                                    ? '🐟 Decoy'
                                    : '🛡️ Alibi'}
                                </strong>{' '}
                                {tagWasCorrect
                                  ? '✅ Spot-on!'
                                  : isFake
                                  ? '❌ Tricked by a decoy!'
                                  : '❌ Dismissed real evidence!'}
                              </span>
                            ) : (
                              <span className="text-slate-500">Untagged (Note / Suspect Pin only)</span>
                            )}
                          </div>

                          {pinnedCharNames.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {pinnedCharNames.map((sName, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-brand-pink/20 text-brand-pink text-[9px] font-black uppercase"
                                >
                                  📌 {sName}
                                </span>
                              ))}
                            </div>
                          )}

                          {note && (
                            <p className="text-xs text-slate-300 italic pt-1 border-t border-white/10">
                              Your Note: &ldquo;{note}&rdquo;
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

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
                    Beat {b.beat_number}: {hydrate(b.event_title || b.title)}
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

      <GuestModal
        isOpen={isAddFriendOpen}
        onClose={() => setIsAddFriendOpen(false)}
        onSave={async (guestData: any) => {
          const res = await saveGuestAction(guestData);
          const created = res?.guest || {
            id: guestData.id || `temp-${Date.now()}`,
            name: guestData.name,
            gender: guestData.gender,
            avatar_url: guestData.avatarUrl || guestData.avatar_url || '',
            eye_color: guestData.eyeColor,
            height: guestData.height,
            ethnicity: guestData.ethnicity,
          };
          const newItem: FriendRosterItem = {
            id: created.id,
            name: created.name,
            gender: String(created.gender || 'adaptable').toLowerCase(),
            avatar_url: created.avatar_url || '',
            photoUrl: resolveDisplayAvatarUrl(created.avatar_url) || null,
            hasAiPhoto: String(created.avatar_url || '').includes('aiPhotoUrl='),
            eye_color: created.eye_color,
            height: created.height,
            ethnicity: created.ethnicity,
          };
          setLiveFriends((prev) => [newItem, ...prev]);
        }}
      />
    </div>
  );
}
