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
import {
  applyScreenerCastAssignmentAction,
  generateStandardCharacterPhotoAction,
  generateClueImageAction,
  auditAndHealCustomerPackAction,
  CustomerPackQaGateResult,
} from '@/app/actions/generator';
import { generateAudioClueAction } from '@/app/actions/audio-generator';
import { GuestModal } from '@/components/account/GuestModal';
import { saveGuestAction } from '@/app/actions/guests';
import { MysteryPreLaunchQaPanel } from '@/components/builder/MysteryPreLaunchQaPanel';
import { downloadFullMysteryPackHtml } from '@/utils/export-full-mystery-pack';

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

type ScreenerStep = 'cast' | 'round1' | 'round2' | 'round3' | 'reveal' | 'all_clues' | 'qa_20x';

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
  const initialCharacters: any[] = mystery?.characters || [];
  const initialClues: any[] = mystery?.clues || [];
  const plotBeats: any[] = mystery?.plot_beats || [];

  const [rawCharacters, setRawCharacters] = useState<any[]>(initialCharacters);
  const [rawClues, setRawClues] = useState<any[]>(initialClues);

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
    buildDefaultFriendAssignments(initialCharacters, friendRoster, 0)
  );
  const [hasUnsavedRecast, setHasUnsavedRecast] = useState<boolean>(false);
  const [isGeneratingCastMedia, setIsGeneratingCastMedia] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [latestQaReport, setLatestQaReport] = useState<CustomerPackQaGateResult | null>(null);
  const [isQaDetailsOpen, setIsQaDetailsOpen] = useState<boolean>(false);
  const [regeneratingClueIds, setRegeneratingClueIds] = useState<Set<string>>(new Set());
  const [selectedRevealClue, setSelectedRevealClue] = useState<any | null>(null);
  const [selectedPortraitModal, setSelectedPortraitModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  const [selectedPovCharId, setSelectedPovCharId] = useState<string>(
    initialCharacters.find((c) => !c.is_victim)?.id || initialCharacters[0]?.id || ''
  );

  // Solo player notebook state: tag clues, pin suspects, & record round guesses (persisted to localStorage per mystery)
  const [clueTags, setClueTags] = useState<Record<string, 'key' | 'red_herring' | 'alibi' | undefined>>({});
  const [clueNotes, setClueNotes] = useState<Record<string, string>>({});
  const [clueSuspects, setClueSuspects] = useState<Record<string, string[]>>({});
  const [tagFilter, setTagFilter] = useState<'all' | 'key' | 'alibi' | 'red_herring' | 'untagged'>('all');
  const [stickyClueIds, setStickyClueIds] = useState<Set<string>>(new Set());
  const [notebookSortMode, setNotebookSortMode] = useState<'round' | 'timeline'>('round');
  const [guesses, setGuesses] = useState<Record<number, RoundGuess>>({
    1: { suspectId: '', motiveGuess: '' },
    2: { suspectId: '', motiveGuess: '' },
    3: { suspectId: '', motiveGuess: '' },
  });
  const [notebookLoaded, setNotebookLoaded] = useState<boolean>(false);

  useEffect(() => {
    setStickyClueIds(new Set());
  }, [tagFilter, step]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const reqStep = params.get('step') as ScreenerStep | null;
    if (
      reqStep &&
      ['cast', 'round1', 'round2', 'round3', 'reveal', 'all_clues', 'qa_20x'].includes(
        reqStep
      )
    ) {
      setStep(reqStep);
    }
  }, []);

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
    const match = combined.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*([AP]M)\b/i);
    if (!match) return { label: null, minutes: 99999 };
    let hours = parseInt(match[1], 10);
    const minsStr = match[2] || '00';
    const mins = parseInt(minsStr, 10);
    const mer = match[3].toUpperCase();
    if (mer === 'PM' && hours < 12) hours += 12;
    if (mer === 'AM' && hours === 12) hours = 0;
    const sortMinutes = hours < 6 ? (hours + 24) * 60 + mins : hours * 60 + mins;
    return {
      label: `${match[1]}:${minsStr} ${mer}`,
      minutes: sortMinutes,
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

  // Load & persist custom friendAssignments per mystery so your selected cast is remembered
  useEffect(() => {
    if (typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.removeItem(`bpm_friend_assignments_${mystery.id}`);
      const savedCast = window.localStorage.getItem(`bpm_friend_assignments_v2_${mystery.id}`);
      if (savedCast) {
        const parsed = JSON.parse(savedCast);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setFriendAssignments((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore
    }
  }, [mystery?.id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.setItem(
        `bpm_friend_assignments_v2_${mystery.id}`,
        JSON.stringify(friendAssignments)
      );
    } catch {
      // ignore
    }
  }, [friendAssignments, mystery?.id]);

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
    setHasUnsavedRecast(true);
  };

  const handleRegenerateSingleCluePhoto = useCallback(
    async (clue: any) => {
      if (!clue?.id || !mystery?.id || regeneratingClueIds.has(clue.id)) return;
      const fmt = clue.format || inferClueFormat(clue);
      if (fmt === 'chat' || fmt === 'audio') return;
      setRegeneratingClueIds((prev) => new Set(prev).add(clue.id));
      try {
        // First ensure current friendAssignments are synced to server cache
        const assignmentsPayload = rawCharacters
          .map((c) => {
            const fId = friendAssignments[c.id];
            const friend = liveFriends.find((f) => f.id === fId);
            if (!friend) return null;
            return {
              characterId: c.id,
              friend: {
                id: friend.id,
                name: friend.name,
                gender: friend.gender,
                avatar_url: friend.avatar_url,
                photoUrl: friend.photoUrl,
                eye_color: friend.eye_color,
                height: friend.height,
                ethnicity: friend.ethnicity,
                standard_character_photo_url: c?.profile_data?.standard_character_photo_url || null,
                standard_character_photo_hash: c?.profile_data?.standard_character_photo_hash || null,
              },
            };
          })
          .filter(Boolean) as any[];

        if (assignmentsPayload.length > 0) {
          await applyScreenerCastAssignmentAction(mystery.id, assignmentsPayload);
        }

        const res = await generateClueImageAction(
          clue.id,
          mystery.id,
          clue.generation_prompt || clue.prompt_template || '',
          true,
          undefined,
          assignmentsPayload
        );
        if (res?.imageUrl) {
          const freshUrl = res.imageUrl.startsWith('data:')
            ? res.imageUrl
            : `${res.imageUrl.split('?')[0]}?t=${Date.now()}`;
          setRawClues((prev) =>
            prev.map((item) =>
              item.id === clue.id ? { ...item, static_image_url: freshUrl } : item
            )
          );
          if (typeof window !== 'undefined' && !freshUrl.startsWith('data:')) {
            try {
              const key = `bpm_screener_clue_images_v2_${mystery.id}`;
              const existing = JSON.parse(window.localStorage.getItem(key) || '{}');
              existing[clue.id] = freshUrl;
              window.localStorage.setItem(key, JSON.stringify(existing));
            } catch {
              // ignore storage quota errors
            }
          }
        }
      } catch (err) {
        console.error('Failed to regenerate clue photo:', err);
      } finally {
        setRegeneratingClueIds((prev) => {
          const next = new Set(prev);
          next.delete(clue.id);
          return next;
        });
      }
    },
    [mystery?.id, rawCharacters, friendAssignments, liveFriends, regeneratingClueIds]
  );

  // Restore any persisted screener clue images from localStorage on mount (never for chat/audio clues)
  useEffect(() => {
    if (typeof window === 'undefined' || !mystery?.id) return;
    try {
      window.localStorage.removeItem(`bpm_screener_clue_images_${mystery.id}`);
      const savedMap = JSON.parse(
        window.localStorage.getItem(`bpm_screener_clue_images_v2_${mystery.id}`) || '{}'
      );
      if (savedMap && typeof savedMap === 'object' && Object.keys(savedMap).length > 0) {
        setRawClues((prev) =>
          prev.map((c) => {
            const fmt = c.format || inferClueFormat(c);
            if (fmt === 'chat' || fmt === 'audio') {
              return { ...c, static_image_url: null };
            }
            return savedMap[c.id] ? { ...c, static_image_url: savedMap[c.id] } : c;
          })
        );
      }
    } catch {
      // ignore
    }
  }, [mystery?.id]);

  const handleGenerateForSelectedCast = useCallback(async () => {
    if (!mystery?.id || isGeneratingCastMedia) return;
    setIsGeneratingCastMedia(true);

    try {
      // 1. Build payload of currently selected friends for each character
      const assignmentsPayload = rawCharacters
        .map((c) => {
          const fId = friendAssignments[c.id];
          const friend = liveFriends.find((f) => f.id === fId);
          if (!friend) return null;
          const prevGuestId = String(c?.profile_data?.guest_id || '');
          const hasExistingPortrait = Boolean(c?.profile_data?.standard_character_photo_url);
          const needsNewPortrait = prevGuestId !== String(friend.id) || !hasExistingPortrait;
          return {
            characterId: c.id,
            roleTitle: getCharacterRoleTitle(c) || c.name,
            needsNewPortrait,
            friend: {
              id: friend.id,
              name: friend.name,
              gender: friend.gender,
              avatar_url: friend.avatar_url,
              photoUrl: friend.photoUrl,
              eye_color: friend.eye_color,
              height: friend.height,
              ethnicity: friend.ethnicity,
              standard_character_photo_url: !needsNewPortrait
                ? (c?.profile_data?.standard_character_photo_url as string | null)
                : null,
              standard_character_photo_hash: !needsNewPortrait
                ? (c?.profile_data?.standard_character_photo_hash as string | null)
                : null,
            },
          };
        })
        .filter(Boolean) as Array<{
        characterId: string;
        roleTitle: string;
        needsNewPortrait: boolean;
        friend: {
          id: string;
          name: string;
          gender?: string;
          avatar_url?: string;
          photoUrl?: string | null;
          eye_color?: string;
          height?: string;
          ethnicity?: string;
          standard_character_photo_url?: string | null;
          standard_character_photo_hash?: string | null;
        };
      }>;

      const charsToRegenPortrait = assignmentsPayload.filter((a) => a.needsNewPortrait);

      // Identify all visual clues (CCTV, physical props, Polaroids, photos — NEVER chat or audio)
      const visualCluesToRegen = rawClues.filter((c) => {
        const prompt = String(c.generation_prompt || c.prompt_template || '');
        const fmt = c.format || inferClueFormat(c);
        if (
          fmt === 'audio' ||
          fmt === 'chat' ||
          fmt === 'search_log' ||
          fmt === 'receipt' ||
          fmt === 'call_sheet'
        ) {
          return false;
        }
        const isVisualFormat =
          fmt === 'physical_prop' || fmt === 'cctv' || fmt === 'social_post' || Boolean(c.static_image_url);
        return isVisualFormat && Boolean(prompt || c.static_image_url);
      });

      // Identify all audio clues so their voice notes are re-synthesized with the newly cast friends' names & voices
      const audioCluesToRegen = rawClues.filter((c) => {
        const fmt = c.format || inferClueFormat(c);
        return fmt === 'audio' && Boolean((c.description || '').trim());
      });

      const totalSteps =
        1 + charsToRegenPortrait.length + visualCluesToRegen.length + audioCluesToRegen.length;
      let currentStep = 1;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      setGenerationProgress({
        current: currentStep,
        total: Math.max(1, totalSteps),
        label: 'Locking in selected friends & updating relationships...',
      });

      await applyScreenerCastAssignmentAction(
        mystery.id,
        assignmentsPayload.map((a) => ({
          characterId: a.characterId,
          friend: a.friend,
        }))
      );

      // Update local rawCharacters with the new guest_id and guest_name right away
      setRawCharacters((prev) =>
        prev.map((c) => {
          const match = assignmentsPayload.find((a) => a.characterId === c.id);
          if (!match) return c;
          const nextProfile = {
            ...(c.profile_data || {}),
            guest_id: match.friend.id,
            guest_name: match.friend.name,
            gender: match.friend.gender || c.profile_data?.gender,
            avatar_url: match.friend.avatar_url || c.profile_data?.avatar_url,
          };
          if (match.needsNewPortrait) {
            delete nextProfile.standard_character_photo_url;
            delete nextProfile.standard_character_photo_hash;
            delete nextProfile.outfit_image_url;
          }
          return {
            ...c,
            profile_data: nextProfile,
          };
        })
      );

      // 2. STAGE 1: Generate Standard Character Costume Portraits sequentially
      for (let pIdx = 0; pIdx < charsToRegenPortrait.length; pIdx++) {
        const item = charsToRegenPortrait[pIdx];
        currentStep++;
        setGenerationProgress({
          current: currentStep,
          total: totalSteps,
          label: `Stage 1: Generating character costume portrait: ${item.friend.name} (${item.roleTitle})...`,
        });

        let charRes: any = null;
        for (let attempt = 1; attempt <= 2; attempt++) {
          charRes = await generateStandardCharacterPhotoAction(
            mystery.id,
            item.characterId,
            true,
            item.friend
          );
          if (charRes?.imageUrl) break;
          if (attempt < 2) await sleep(3500);
        }

        if (charRes?.imageUrl) {
          item.friend.standard_character_photo_url = charRes.imageUrl;
          item.friend.standard_character_photo_hash = charRes.identityHash || null;

          const freshPortrait = charRes.imageUrl.startsWith('data:')
            ? charRes.imageUrl
            : `${charRes.imageUrl.split('?')[0]}?t=${Date.now()}`;
          setRawCharacters((prev) =>
            prev.map((c) =>
              c.id === item.characterId
                ? {
                    ...c,
                    profile_data: {
                      ...(c.profile_data || {}),
                      guest_id: item.friend.id,
                      guest_name: item.friend.name,
                      standard_character_photo_url: freshPortrait,
                      standard_character_photo_hash: charRes.identityHash,
                      outfit_image_url: freshPortrait,
                    },
                  }
                : c
            )
          );
        }

        if (pIdx < charsToRegenPortrait.length - 1) {
          await sleep(2000);
        }
      }

      const castOverridesForClues = assignmentsPayload.map((a) => ({
        characterId: a.characterId,
        friend: a.friend,
      }));

      // 3. STAGE 2: Generate Visual Clue Photos featuring the selected cast's Stage 1 Reference Portraits
      const failedVisualClues: any[] = [];
      const persistClueImgLocal = (cId: string, url: string) => {
        if (typeof window === 'undefined' || url.startsWith('data:')) return;
        try {
          const key = `bpm_screener_clue_images_${mystery.id}`;
          const existing = JSON.parse(window.localStorage.getItem(key) || '{}');
          existing[cId] = url;
          window.localStorage.setItem(key, JSON.stringify(existing));
        } catch {
          // ignore
        }
      };

      for (let i = 0; i < visualCluesToRegen.length; i++) {
        const clue = visualCluesToRegen[i];
        const clueTitle = stripCustomerFacingTitle(clue.title) || clue.title;
        currentStep = Math.min(totalSteps, currentStep + 1);
        setGenerationProgress({
          current: currentStep,
          total: totalSteps,
          label: `Stage 2: Generating crime-scene photo (${i + 1}/${visualCluesToRegen.length}): ${clueTitle}...`,
        });
        setRegeneratingClueIds((prev) => new Set(prev).add(clue.id));

        let generatedOk = false;
        try {
          const clueRes = await generateClueImageAction(
            clue.id,
            mystery.id,
            clue.generation_prompt || clue.prompt_template || '',
            true,
            undefined,
            castOverridesForClues
          );
          if (clueRes?.imageUrl && !clueRes?.error) {
            generatedOk = true;
            const freshClueUrl = clueRes.imageUrl.startsWith('data:')
              ? clueRes.imageUrl
              : `${clueRes.imageUrl.split('?')[0]}?t=${Date.now()}`;
            setRawClues((prev) =>
              prev.map((item) =>
                item.id === clue.id ? { ...item, static_image_url: freshClueUrl } : item
              )
            );
            persistClueImgLocal(clue.id, freshClueUrl);
          }
        } catch (err) {
          console.warn('Stage 2 clue generation error:', err);
        } finally {
          setRegeneratingClueIds((prev) => {
            const next = new Set(prev);
            next.delete(clue.id);
            return next;
          });
        }

        if (!generatedOk) {
          failedVisualClues.push(clue);
        }

        if (i < visualCluesToRegen.length - 1) {
          await sleep(1800);
        }
      }

      // Dedicated Recovery Sweep if any visual clue hit a temporary Gemini rate limit
      if (failedVisualClues.length > 0) {
        setGenerationProgress({
          current: currentStep,
          total: totalSteps,
          label: `Stage 2 Recovery: Retrying ${failedVisualClues.length} crime-scene photo(s)...`,
        });
        await sleep(3500);
        for (const retryClue of failedVisualClues) {
          setRegeneratingClueIds((prev) => new Set(prev).add(retryClue.id));
          try {
            const retryRes = await generateClueImageAction(
              retryClue.id,
              mystery.id,
              retryClue.generation_prompt || retryClue.prompt_template || '',
              true,
              undefined,
              castOverridesForClues
            );
            if (retryRes?.imageUrl && !retryRes?.error) {
              const freshClueUrl = retryRes.imageUrl.startsWith('data:')
                ? retryRes.imageUrl
                : `${retryRes.imageUrl.split('?')[0]}?t=${Date.now()}`;
              setRawClues((prev) =>
                prev.map((item) =>
                  item.id === retryClue.id ? { ...item, static_image_url: freshClueUrl } : item
                )
              );
              persistClueImgLocal(retryClue.id, freshClueUrl);
            }
          } catch {
            // Keep existing clue photo if retry fails
          } finally {
            setRegeneratingClueIds((prev) => {
              const next = new Set(prev);
              next.delete(retryClue.id);
              return next;
            });
          }
          await sleep(2000);
        }
      }

      // 4. STAGE 3: Regenerate Multi-Speaker Audio Clues with the newly cast friends' names & voices
      for (const audioClue of audioCluesToRegen) {
        currentStep = Math.min(totalSteps, currentStep + 1);
        const audioTitle = stripCustomerFacingTitle(audioClue.title) || audioClue.title;
        setGenerationProgress({
          current: currentStep,
          total: totalSteps,
          label: `Stage 3: Synthesizing audio wiretap with your cast's names: ${audioTitle}...`,
        });
        setRegeneratingClueIds((prev) => new Set(prev).add(audioClue.id));
        try {
          const audioRes = await generateAudioClueAction({
            clueId: audioClue.id,
            mysteryId: mystery.id,
            transcript: audioClue.description || '',
            title: audioClue.title,
          });
          if (audioRes?.success && audioRes.audioUrl) {
            const freshAudioUrl = `${audioRes.audioUrl.split('?')[0]}?v=${Date.now()}`;
            setRawClues((prev) =>
              prev.map((item) =>
                item.id === audioClue.id ? { ...item, audio_url: freshAudioUrl } : item
              )
            );
          }
        } catch (audioErr) {
          console.error('Failed to regenerate audio clue:', audioErr);
        } finally {
          setRegeneratingClueIds((prev) => {
            const next = new Set(prev);
            next.delete(audioClue.id);
            return next;
          });
        }
      }

      setHasUnsavedRecast(false);
    } catch (err) {
      console.error('Error generating cast & clues for selected friends:', err);
    } finally {
      setIsGeneratingCastMedia(false);
      setGenerationProgress(null);
    }
  }, [mystery?.id, isGeneratingCastMedia, rawCharacters, rawClues, friendAssignments, liveFriends]);

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
    const visualClues = rawClues.filter((c) => {
      const fmt = c.format || inferClueFormat(c);
      if (fmt === 'audio' || fmt === 'chat' || fmt === 'search_log' || fmt === 'receipt' || fmt === 'call_sheet') {
        return false;
      }
      return visualFormats.has(fmt) || Boolean(c.static_image_url);
    });
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
    const rawGuestId = String(rawChar?.profile_data?.guest_id || '').trim().toLowerCase();
    const rawGuestName = String(rawChar?.profile_data?.guest_name || '').trim().toLowerCase();
    const currentGuestId = String(c?.profile_data?.guest_id || '').trim().toLowerCase();
    const currentGuestName = String(c?.profile_data?.guest_name || '').trim().toLowerCase();

    const hasExplicitRenderedGuest = Boolean(rawGuestId || rawGuestName);
    const isSameGuestAsRendered = hasExplicitRenderedGuest
      ? (Boolean(rawGuestId && currentGuestId && rawGuestId === currentGuestId) ||
          Boolean(rawGuestName && currentGuestName && rawGuestName === currentGuestName))
      : true;

    if (useFriendNames) {
      if (isSameGuestAsRendered && rawChar?.profile_data?.standard_character_photo_url) {
        return rawChar.profile_data.standard_character_photo_url;
      }
      if (c?.profile_data?.friend_photo_url) {
        return c.profile_data.friend_photo_url;
      }
      if (!isSameGuestAsRendered && c?.assignedFriend?.avatar_url) {
        return resolveDisplayAvatarUrl(c.assignedFriend.avatar_url);
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
    const isRegeneratingThisClue = regeneratingClueIds.has(clue.id);
    const resolvedClueFormat = clue.format || inferClueFormat(clue);
    const hasVisualPhotoOrPrompt =
      resolvedClueFormat !== 'chat' &&
      resolvedClueFormat !== 'audio' &&
      resolvedClueFormat !== 'search_log' &&
      resolvedClueFormat !== 'receipt' &&
      resolvedClueFormat !== 'call_sheet' &&
      Boolean(
        clue.static_image_url ||
          resolvedClueFormat === 'physical_prop' ||
          resolvedClueFormat === 'cctv' ||
          resolvedClueFormat === 'social_post'
      );

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

          <div className="flex items-center gap-1.5 shrink-0">
            {hasVisualPhotoOrPrompt && (
              <button
                type="button"
                disabled={isRegeneratingThisClue || isGeneratingCastMedia}
                onClick={() => void handleRegenerateSingleCluePhoto(clue)}
                title="Regenerate this clue photo with your currently selected friends"
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-brand-pink text-slate-300 hover:text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                {isRegeneratingThisClue ? '⏳...' : '🔄 Photo'}
              </button>
            )}

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
                  onClick={() => {
                    if (tagFilter !== 'all') {
                      setStickyClueIds((prev) => new Set(prev).add(clue.id));
                    }
                    setClueTags((prev) => ({
                      ...prev,
                      [clue.id]: prev[clue.id] === 'key' ? undefined : 'key',
                    }));
                  }}
                  title="Mark as Key Evidence"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    tag === 'key'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🔑 Key
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tagFilter !== 'all') {
                      setStickyClueIds((prev) => new Set(prev).add(clue.id));
                    }
                    setClueTags((prev) => ({
                      ...prev,
                      [clue.id]: prev[clue.id] === 'red_herring' ? undefined : 'red_herring',
                    }));
                  }}
                  title="Mark as Red Herring / Decoy"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    tag === 'red_herring'
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🐟 Decoy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (tagFilter !== 'all') {
                      setStickyClueIds((prev) => new Set(prev).add(clue.id));
                    }
                    setClueTags((prev) => ({
                      ...prev,
                      [clue.id]: prev[clue.id] === 'alibi' ? undefined : 'alibi',
                    }));
                  }}
                  title="Mark as Alibi / Clears Suspect"
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
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
        </div>

        {/* Actual Customer-Facing Clue View */}
        <div className="p-4 flex-grow flex flex-col justify-center relative">
          {isRegeneratingThisClue && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-20 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <span className="w-7 h-7 border-2 border-brand-pink border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-black uppercase tracking-wider text-white">
                Rendering Clue Scene with Your Selected Cast...
              </span>
            </div>
          )}
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

    // Compute per-suspect linked Key clues, Alibi clues, Decoy clues & total Pinned clues up through roundNum
    const suspectClueTallies: Record<
      string,
      { keyCount: number; alibiCount: number; decoyCount: number; pinCount: number }
    > = {};
    for (const s of suspectList) {
      suspectClueTallies[s.id] = { keyCount: 0, alibiCount: 0, decoyCount: 0, pinCount: 0 };
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
            suspectClueTallies[sId].pinCount++;
            if (t === 'key') suspectClueTallies[sId].keyCount++;
            else if (t === 'alibi') suspectClueTallies[sId].alibiCount++;
            else if (t === 'red_herring') suspectClueTallies[sId].decoyCount++;
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
              {annotatedEntries.length > 0 && (
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
                            <button
                              key={sId}
                              type="button"
                              onClick={() =>
                                setGuesses((prev) => ({
                                  ...prev,
                                  [roundNum]: { ...currentGuess, suspectId: sId },
                                }))
                              }
                              title="Click to select this suspect as your accusation"
                              className="px-1.5 py-0.5 rounded bg-brand-pink/20 hover:bg-brand-pink text-brand-pink hover:text-white text-[9px] font-black uppercase transition-colors cursor-pointer"
                            >
                              📌 {sChar.assignedFriend?.name || sChar.displayName}
                            </button>
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
                  const tally = suspectClueTallies[s.id] || {
                    keyCount: 0,
                    alibiCount: 0,
                    decoyCount: 0,
                    pinCount: 0,
                  };

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
                          {tally.decoyCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-black uppercase shrink-0">
                              🐟 {tally.decoyCount} Decoy
                            </span>
                          )}
                          {tally.keyCount === 0 &&
                            tally.alibiCount === 0 &&
                            tally.decoyCount === 0 &&
                            tally.pinCount > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[9px] font-black uppercase shrink-0">
                                📌 {tally.pinCount} Pinned
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
      {/* Top Screener Control Deck — Streamlined 2-Row Header */}
      <div className="rounded-2xl bg-slate-900 text-white p-4 sm:p-5 border border-slate-800 shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Badge + Active POV Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              🕵️ Playtest Screener
            </span>

            <div className="flex items-center gap-2 text-xs relative" data-custom-dropdown>
              <span className="font-bold text-slate-400">POV:</span>
              <button
                type="button"
                onClick={() =>
                  setOpenDropdownId(openDropdownId === 'pov' ? null : 'pov')
                }
                className="rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/90 px-3 py-1.5 text-xs font-black text-white flex items-center gap-2 transition-all cursor-pointer"
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
                <div className="absolute left-0 top-full mt-1.5 w-64 z-50 rounded-2xl bg-slate-950 text-white border border-slate-800 shadow-2xl p-1.5 space-y-1">
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

          {/* Right: Grouped Actions (Single Primary Generate CTA + Compact View/Export Utilities) */}
          <div className="flex flex-wrap items-center gap-2">
            {useFriendNames && (
              <>
                <button
                  type="button"
                  onClick={handleShuffleFriends}
                  disabled={isGeneratingCastMedia}
                  title="Shuffle which friends are cast in each role"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  🔀 Shuffle
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddFriendOpen(true)}
                  title="Add a new friend to your roster"
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
                >
                  + Friend
                </button>

                <button
                  type="button"
                  disabled={isGeneratingCastMedia}
                  onClick={() => void handleGenerateForSelectedCast()}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 ${
                    hasUnsavedRecast
                      ? 'bg-gradient-to-r from-brand-pink via-fuchsia-500 to-amber-500 text-white border-white/30 shadow-lg shadow-brand-pink/30 animate-pulse'
                      : 'bg-brand-pink text-white border-brand-pink hover:opacity-90 shadow-md'
                  }`}
                >
                  {isGeneratingCastMedia ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Cast &amp; Clues...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>
                        {hasUnsavedRecast
                          ? 'Generate Cast & Clues (New Cast)'
                          : 'Generate Cast & Clues'}
                      </span>
                    </>
                  )}
                </button>
              </>
            )}

            <div className="hidden sm:block h-5 w-px bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={() => setShowCastPanel((v) => !v)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                showCastPanel
                  ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {showCastPanel ? '📸 Hide Cast' : '📸 Show Cast'}
            </button>

            <button
              type="button"
              onClick={() => setXRayMode((v) => !v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                xRayMode
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {xRayMode ? '🔬 X-Ray: ON' : '🙈 Blind Mode'}
            </button>

            <a
              href={`/en/builder/mysteries/${mystery?.id}/compile/print-all`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (typeof window !== 'undefined' && mystery?.id) {
                  try {
                    window.localStorage.setItem(
                      `bpm_friend_assignments_${mystery.id}`,
                      JSON.stringify(friendAssignments)
                    );
                  } catch {
                    // ignore
                  }
                }
              }}
              title="Opens the Master Pack page in a new tab where you can inspect everything or Save as PDF"
              className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-1.5"
            >
              <span>🖨️</span>
              <span>Full Pack PDF ↗</span>
            </a>

            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && mystery?.id) {
                  try {
                    window.localStorage.setItem(
                      `bpm_friend_assignments_${mystery.id}`,
                      JSON.stringify(friendAssignments)
                    );
                  } catch {
                    // ignore
                  }
                }
                downloadFullMysteryPackHtml({
                  mystery,
                  activeCharacters,
                  relationships,
                  subplots,
                  plotBeats,
                  cluesByRound,
                  useFriendNames,
                  includeXRaySpoilers: true,
                  getPortraitUrl,
                });
              }}
              title="Download offline .HTML file"
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              📥 .HTML
            </button>
          </div>
        </div>

        {/* Single Live Cast & Clue Generation Progress Bar */}
        {generationProgress && (
          <div className="rounded-xl bg-slate-950 border border-brand-pink/50 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-brand-pink flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-brand-pink border-t-transparent rounded-full animate-spin inline-block" />
                <span>{generationProgress.label}</span>
              </span>
              <span className="text-slate-400 font-mono">
                Step {generationProgress.current} / {generationProgress.total} (
                {Math.round(
                  (generationProgress.current / Math.max(1, generationProgress.total)) * 100
                )}
                %)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-pink to-amber-400 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((generationProgress.current / generationProgress.total) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

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
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          {[
            { id: 'cast', label: '1. Cast & POV' },
            { id: 'round1', label: `2. Round 1 (${cluesByRound[1].length})` },
            { id: 'round2', label: `3. Round 2 (${cluesByRound[2].length})` },
            { id: 'round3', label: `4. Round 3 (${cluesByRound[3].length})` },
            { id: 'all_clues', label: `All ${rawClues.length} Clues` },
            { id: 'reveal', label: '5. Final Solution' },
            { id: 'qa_20x', label: '🧪 6. Pre-Launch QA' },
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

      {/* Pinned Cast Reference Strip (Clean 1-Line Header without Duplicate Buttons or Progress Bars) */}
      {showCastPanel && (
        <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                📸 Cast Reference Strip ({activeCharacters.length} Suspects)
              </span>

              {latestQaReport && !isGeneratingCastMedia && (
                <button
                  type="button"
                  onClick={() => setIsQaDetailsOpen((prev) => !prev)}
                  className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center gap-1.5 ${
                    latestQaReport.passed
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                      : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  <span>🛡️</span>
                  <span>
                    QA: {latestQaReport.overallScore}/100{' '}
                    {latestQaReport.passed ? '• Passed' : '• Review'}
                  </span>
                  <span>{isQaDetailsOpen ? '▴' : '▾'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUseFriendNames((v) => !v)}
                className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                  useFriendNames
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {useFriendNames ? '👯 Friend Names: ON' : '🏷️ Role Titles Only'}
              </button>
            </div>
          </div>

          {latestQaReport && isQaDetailsOpen && !isGeneratingCastMedia && (
            <div className="mb-3 rounded-xl bg-slate-950 text-white p-4 border border-emerald-500/30 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-black uppercase tracking-wider">
                    🛡️ 4-Gate Customer Pack QA Report ({latestQaReport.overallScore}/100)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {latestQaReport.narrativeSanityNote}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    Gate 1 Text Fixes: {latestQaReport.textIssuesRepaired}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    Gate 2 Portraits: {latestQaReport.portraitsAudited} audited ({latestQaReport.portraitsRegenerated} self-healed)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    Gate 3 Visual Clues: {latestQaReport.visualCluesAudited} audited ({latestQaReport.visualCluesRegenerated} self-healed)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200">
                    Gate 4 Audio: {latestQaReport.audioCluesAudited} audited ({latestQaReport.audioCluesRegenerated} self-healed)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto">
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                    Gate 2: Character Costume Portraits
                  </div>
                  {latestQaReport.portraitScores.map((p) => (
                    <div key={p.characterId} className="text-[11px] text-slate-300 flex items-start justify-between gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg">
                      <span className="font-bold text-white truncate">{p.name}</span>
                      <span className={p.passed ? 'text-emerald-400 font-black shrink-0' : 'text-amber-400 font-black shrink-0'}>
                        {p.finalScore}/100 {p.regenerated ? '⚡' : '✓'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Gate 3: Side-by-Side Visual Clue Critic
                  </div>
                  {latestQaReport.clueScores.map((c) => (
                    <div key={c.clueId} className="text-[11px] text-slate-300 flex items-start justify-between gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg" title={c.note}>
                      <span className="truncate">{stripCustomerFacingTitle(c.title) || c.title}</span>
                      <span className={c.passed ? 'text-emerald-400 font-black shrink-0' : 'text-amber-400 font-black shrink-0'}>
                        {c.finalScore}/100 {c.regenerated ? '⚡' : '✓'}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-black uppercase tracking-wider text-purple-400">
                    Gate 4: Audio Wiretap Listener Critic
                  </div>
                  {latestQaReport.audioScores.map((a) => (
                    <div key={a.clueId} className="text-[11px] text-slate-300 flex items-start justify-between gap-2 bg-slate-900/90 px-2.5 py-1.5 rounded-lg" title={a.note}>
                      <span className="truncate">{stripCustomerFacingTitle(a.title) || a.title}</span>
                      <span className={a.passed ? 'text-emerald-400 font-black shrink-0' : 'text-amber-400 font-black shrink-0'}>
                        {a.finalScore}/100 {a.regenerated ? '⚡' : '✓'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-900 group">
                      {photo ? (
                        <>
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
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPortraitModal({
                                url: photo,
                                title: char.displayName,
                                subtitle: hydrate(char.profile_data?.outfit_advice || ''),
                              });
                            }}
                            title="Enlarge character portrait"
                            className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded bg-black/80 hover:bg-brand-pink text-white text-[9px] font-black uppercase tracking-wider border border-white/20 transition-colors cursor-zoom-in z-10"
                          >
                            🔍 Zoom
                          </button>
                        </>
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
                                  setHasUnsavedRecast(true);
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
            {getPortraitUrl(povChar) && (
              <div
                onClick={() =>
                  setSelectedPortraitModal({
                    url: getPortraitUrl(povChar)!,
                    title: povChar.displayName,
                    subtitle: hydrate(povChar.profile_data?.outfit_advice || ''),
                  })
                }
                className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-brand-pink bg-slate-950 cursor-zoom-in shadow-xl"
              >
                <img
                  src={getPortraitUrl(povChar)!}
                  alt={povChar.displayName}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[10px] font-black uppercase tracking-wider border border-white/20">
                  🔍 Click to Enlarge
                </span>
              </div>
            )}
            <h2 className="text-xl font-black uppercase tracking-tight">
              {povChar.displayName}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              {hydrate(povChar.profile_data?.bio || povChar.profile_data?.act_summary)}
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
              if (tagFilter === 'all') return true;
              if (stickyClueIds.has(c.id)) return true;
              const t = clueTags[c.id];
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
                        onClick={() => {
                          setStickyClueIds(new Set());
                          setTagFilter(opt.id);
                        }}
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
                  onClick={() => {
                    setStickyClueIds(new Set());
                    setTagFilter(opt.id);
                  }}
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
              if (tagFilter === 'all') return true;
              if (stickyClueIds.has(c.id)) return true;
              const t = clueTags[c.id];
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

      {/* STEP 5: FINAL SOLUTION & SOLO PLAYER SCORECARD (SIMPLIFIED 3-SECTION FLOW) */}
      {step === 'reveal' &&
        (() => {
          // 1. Index all clues in round order
          const allOrderedClues: Array<{
            clue: any;
            round: number;
            indexInRound: number;
            isFake: boolean;
            cleanTitle: string;
            cleanProofText: string;
            beatNum: number | null;
            formatLabel: string;
          }> = [];

          const cleanInternalNoteProof = (rawNotes?: string | null, fallbackDesc?: string | null) => {
            const stripped = stripFormatTagFromNotes(rawNotes || '')
              .replace(/\[CODE:[^\]]+\]/gi, '')
              .replace(/\[AUDIO_URL:[^\]]+\]/gi, '')
              .replace(/\[VOICE_REGION:[^\]]+\]/gi, '')
              .trim()
              .replace(
                /^(REAL\s*\/\s*CANON|Fake\s*Arc\s*Step\s*\d+(?:\s*&\s*Fatal\s*Hole)?)\s*(?:\([^)]*\))?\s*[-—:]?\s*/i,
                ''
              )
              .trim();
            if (stripped) return hydrate(stripped);
            const descLine = String(fallbackDesc || '')
              .split('\n')
              .map((l) => l.trim())
              .filter(Boolean)[0];
            return descLine ? hydrate(descLine) : 'Corroborating case evidence.';
          };

          for (const r of [1, 2, 3] as const) {
            (cluesByRound[r] || []).forEach((c: any, idx: number) => {
              const isFake =
                c.evidence_status === 'fake' || c.implication_type === 'red_herring';
              const rawNotes = String(c.internal_notes || '');
              const noteBeatMatch = rawNotes.match(/Beat\s*(\d+)/i);
              let beatNum: number | null =
                typeof c.beatNumber === 'number'
                  ? c.beatNumber
                  : typeof c.beat_number === 'number'
                  ? c.beat_number
                  : noteBeatMatch
                  ? parseInt(noteBeatMatch[1], 10)
                  : null;

              if (!beatNum && c.linked_plot_beat_id) {
                const matchedBeat = plotBeats.find((b: any) => b.id === c.linked_plot_beat_id);
                if (matchedBeat?.beat_number) beatNum = Number(matchedBeat.beat_number);
              }
              if (!isFake && !beatNum && plotBeats.length > 0) {
                beatNum = r === 1 ? 1 : r === 2 ? 3 : 5;
              }

              const fmt = String(c.format || inferClueFormat(c) || 'document')
                .replace(/_/g, ' ')
                .toUpperCase();

              allOrderedClues.push({
                clue: c,
                round: r,
                indexInRound: idx + 1,
                isFake,
                cleanTitle: hydrate(stripCustomerFacingTitle(c.title) || c.title),
                cleanProofText: cleanInternalNoteProof(c.internal_notes, c.description),
                beatNum,
                formatLabel: fmt,
              });
            });
          }

          const realClues = allOrderedClues.filter((item) => !item.isFake);
          const fakeClues = allOrderedClues.filter((item) => item.isFake);

          // 2. Concise 1-sentence WHO, WHY, and HOW
          const killerPortrait = killerChar ? getPortraitUrl(killerChar) : null;
          const victimPortrait = victimChar ? getPortraitUrl(victimChar) : null;
          const innocentSuspects = activeCharacters.filter(
            (c) => !c.is_victim && (!killerChar || c.id !== killerChar.id)
          );

          const rawMotiveNotes =
            killerChar?.motive?.notes ||
            killerChar?.motives?.[0]?.notes ||
            plotBeats.find((b: any) => b.beat_number === 3)?.description ||
            plotBeats[0]?.description ||
            mystery?.description;
          const whyOneSentence = hydrate(rawMotiveNotes);

          const murderExecutionBeat =
            plotBeats.find((b: any) => b.beat_number === 4) ||
            plotBeats[plotBeats.length - 2] ||
            plotBeats[0];
          const clincherClue = realClues.find((rc) => rc.round === 3) || realClues[realClues.length - 1];
          const howOneSentence = [
            murderExecutionBeat ? hydrate(murderExecutionBeat.description) : '',
            clincherClue ? clincherClue.cleanProofText : '',
          ]
            .filter(Boolean)
            .join(' ');

          // 3. Map each subplot to its exact 3 clues (R1, R2, R3)
          const getCluesForSubplot = (sp: any, spIdx: number) => {
            const titleTokens = Array.from(
              String(sp.title || '').matchAll(/\{\{([^}]+)\}\}/g)
            ).map((m) => m[1].trim().toLowerCase());

            const descTokens = Array.from(
              String(sp.description || '').matchAll(/\{\{([^}]+)\}\}/g)
            )
              .map((m) => m[1].trim().toLowerCase())
              .filter(
                (t) =>
                  !victimChar ||
                  !t.includes(
                    String(victimChar.displayRoleTitle || victimChar.name || '').toLowerCase()
                  )
              );

            const targetTokens = titleTokens.length > 0 ? titleTokens : descTokens.slice(0, 2);

            const matched = fakeClues.filter(({ clue }) => {
              if (clue.subplot_id && sp.id && clue.subplot_id === sp.id) return true;
              const notesHeader = String(clue.internal_notes || '').toLowerCase();
              const hay = `${notesHeader} ${clue.generation_prompt || ''}`.toLowerCase();
              if (targetTokens.length > 0) {
                const hitCount = targetTokens.filter((tok) => hay.includes(tok)).length;
                if (hitCount >= Math.min(2, targetTokens.length)) return true;
              }
              return false;
            });

            if (matched.length > 0) return matched;
            return fakeClues.filter((_, i) => i % Math.max(1, subplots.length) === spIdx);
          };

          // 4. Solo Player Scorecard Metrics
          let correctKeyCount = 0;
          let totalKeyTagged = 0;
          let correctDecoyOrAlibiCount = 0;
          let totalDecoyOrAlibiTagged = 0;

          for (const { clue: c, isFake } of allOrderedClues) {
            const t = clueTags[c.id];
            if (!t) continue;
            if (t === 'key') {
              totalKeyTagged++;
              if (!isFake) correctKeyCount++;
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

          const roundPoints = [1, 2, 3].reduce((acc, rNum) => {
            const gId = guesses[rNum]?.suspectId;
            if (gId && killerChar && gId === killerChar.id) {
              return acc + (rNum === 1 ? 40 : rNum === 2 ? 30 : 50);
            }
            return acc;
          }, 0);
          const yourTotalScore = roundPoints + bonusPoints;

          // 5. Room Voting & Leaderboard Data
          const nonVictimSuspects = activeCharacters.filter((c) => !c.is_victim);
          const primaryDecoyA = innocentSuspects[0] || nonVictimSuspects[0];
          const primaryDecoyB = innocentSuspects[1] || primaryDecoyA;
          const primaryDecoyC = innocentSuspects[2] || primaryDecoyB;
          const primaryDecoyD = innocentSuspects[3] || primaryDecoyA;

          const yourR1Pick =
            getCharById(guesses[1]?.suspectId) || primaryDecoyA || killerChar;
          const yourR2Pick =
            getCharById(guesses[2]?.suspectId) || primaryDecoyB || killerChar;
          const yourR3Pick =
            getCharById(guesses[3]?.suspectId) || killerChar || primaryDecoyA;

          const simulatedTablePlayers = [
            {
              id: 'you-player',
              isYou: true,
              playerName: 'You',
              roleLabel: povChar?.displayName || 'Playtester',
              r1Suspect: yourR1Pick,
              r2Suspect: yourR2Pick,
              r3Suspect: yourR3Pick,
              tagAccuracy: accuracyPct ?? 78,
              clueBonus: bonusPoints > 0 ? bonusPoints : 65,
              totalScore:
                guesses[1]?.suspectId ||
                guesses[2]?.suspectId ||
                guesses[3]?.suspectId ||
                totalTagged > 0
                  ? yourTotalScore
                  : 145,
            },
            ...nonVictimSuspects.map((seatChar, sIdx) => {
              const r1Pick =
                sIdx % 3 === 0
                  ? primaryDecoyA
                  : sIdx % 3 === 1
                  ? primaryDecoyB
                  : primaryDecoyC;
              const r2Pick =
                sIdx === 0
                  ? killerChar
                  : sIdx % 2 === 0
                  ? primaryDecoyB
                  : primaryDecoyC;
              const r3Pick =
                sIdx === 0 || sIdx === 2 || sIdx === 4
                  ? killerChar
                  : sIdx === 1
                  ? primaryDecoyA
                  : primaryDecoyD;

              const seatRoundPts =
                (r1Pick?.id === killerChar?.id ? 40 : 0) +
                (r2Pick?.id === killerChar?.id ? 30 : 0) +
                (r3Pick?.id === killerChar?.id ? 50 : 0);
              const seatTagAcc = [88, 72, 81, 64, 75, 69][sIdx % 6];
              const seatClueBonus = [85, 55, 70, 45, 60, 50][sIdx % 6];

              return {
                id: `seat-${seatChar.id}`,
                isYou: false,
                playerName:
                  seatChar.assignedFriend?.name ||
                  seatChar.profile_data?.guest_name ||
                  seatChar.displayRoleTitle ||
                  seatChar.name,
                roleLabel: seatChar.displayRoleTitle || seatChar.name,
                r1Suspect: r1Pick,
                r2Suspect: r2Pick,
                r3Suspect: r3Pick,
                tagAccuracy: seatTagAcc,
                clueBonus: seatClueBonus,
                totalScore: seatRoundPts + seatClueBonus,
              };
            }),
          ].sort((a, b) => b.totalScore - a.totalScore);

          const totalPlayersCount = simulatedTablePlayers.length;

          const suspectVoteStats = nonVictimSuspects
            .map((susp) => {
              const r1Votes = simulatedTablePlayers.filter(
                (p) => p.r1Suspect?.id === susp.id
              ).length;
              const r2Votes = simulatedTablePlayers.filter(
                (p) => p.r2Suspect?.id === susp.id
              ).length;
              const r3Votes = simulatedTablePlayers.filter(
                (p) => p.r3Suspect?.id === susp.id
              ).length;
              const isTrueKiller = Boolean(killerChar && susp.id === killerChar.id);
              return {
                suspect: susp,
                r1Votes,
                r2Votes,
                r3Votes,
                r3Pct: Math.round((r3Votes / Math.max(1, totalPlayersCount)) * 100),
                isTrueKiller,
              };
            })
            .sort((a, b) => b.r3Votes - a.r3Votes);

          return (
            <div className="space-y-6">
              {/* =====================================================================
                  SECTION 1: THE VERDICT HERO (ONE SENTENCE EACH FOR WHO, WHY, HOW)
              ====================================================================== */}
              <div className="rounded-3xl bg-slate-950 text-white border border-emerald-500/40 shadow-xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    {killerPortrait && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedPortraitModal({
                            url: killerPortrait,
                            title: `🔪 Killer: ${killerChar?.displayName || 'Killer'}`,
                            subtitle: hydrate(killerChar?.profile_data?.outfit_advice || ''),
                          })
                        }
                        title="Click to enlarge Killer portrait"
                        className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-rose-500 shrink-0 cursor-zoom-in shadow-lg"
                      >
                        <img
                          src={killerPortrait}
                          alt={killerChar?.displayName || 'Killer'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-white text-[8px] font-black uppercase">
                          🔍
                        </span>
                      </button>
                    )}
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                        Official Case Solution
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white mt-0.5">
                        {killerChar?.displayName || 'Unknown Killer'} Killed{' '}
                        {victimChar?.displayName || 'The Victim'}
                      </h2>
                    </div>
                  </div>

                  {victimPortrait && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedPortraitModal({
                          url: victimPortrait,
                          title: `🩸 Victim: ${victimChar?.displayName || 'Victim'}`,
                          subtitle: hydrate(victimChar?.profile_data?.outfit_advice || ''),
                        })
                      }
                      title="Click to enlarge Victim portrait"
                      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 transition-colors cursor-zoom-in"
                    >
                      <img
                        src={victimPortrait}
                        alt={victimChar?.displayName || 'Victim'}
                        className="w-16 h-16 rounded-xl object-cover border border-pink-500/50"
                      />
                      <div className="text-left">
                        <div className="text-[9px] font-black uppercase tracking-widest text-pink-400">
                          🩸 Victim (Click to Enlarge)
                        </div>
                        <div className="text-sm font-black text-white">
                          {victimChar?.displayName}
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* 3 Clean Summary Rows: WHO / WHY / HOW */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-2xl bg-slate-900/90 border border-rose-500/30 p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-rose-400">
                      🔪 1. Who Killed
                    </div>
                    <div className="text-sm font-black text-white">
                      {killerChar?.displayName || 'Unknown Killer'} (Acted Alone)
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Cleared suspects:{' '}
                      {innocentSuspects.map((s) => s.displayName).join(', ')}.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900/90 border border-amber-500/30 p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                      💔 2. Why They Killed (Motive)
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {whyOneSentence}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900/90 border border-sky-500/30 p-4 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-widest text-sky-400">
                      ⚡ 3. How They Killed (Method &amp; Proof)
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed">
                      {howOneSentence}
                    </p>
                  </div>
                </div>
              </div>

              {/* =====================================================================
                  SECTION 2: THE 5 MURDER BEATS (+ CLICKABLE CLUE ROWS) & CLEARED SUBPLOTS
              ====================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT 7 COLS: THE 5 MAIN BEATS & CLICKABLE SUPPORTING CLUES */}
                <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                        🎯 True Murder Timeline • Click Any Clue to Open Full Card
                      </span>
                      <h3 className="text-base font-black uppercase text-slate-900">
                        The {plotBeats.length} Main Beats &amp; Supporting Clues
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-black">
                      {realClues.length} Real Clues
                    </span>
                  </div>

                  <div className="space-y-3">
                    {plotBeats.map((b: any) => {
                      const bNum = Number(b.beat_number);
                      const supportingClues = realClues.filter((rc) => rc.beatNum === bNum);

                      return (
                        <div
                          key={b.id || bNum}
                          className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <h4 className="text-sm font-black text-slate-900">
                              <span className="text-emerald-700 mr-1.5">Beat {bNum}:</span>
                              {hydrate(b.event_title || b.title)}
                            </h4>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {hydrate(b.description)}
                          </p>

                          {supportingClues.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              {supportingClues.map((rc) => {
                                const userTag = clueTags[rc.clue.id];
                                return (
                                  <button
                                    key={rc.clue.id}
                                    type="button"
                                    onClick={() => setSelectedRevealClue(rc.clue)}
                                    title="Click to open and view this full clue card"
                                    className="w-full text-left rounded-xl bg-white hover:bg-emerald-50/50 border border-emerald-200/80 hover:border-emerald-500 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs transition-all cursor-pointer group"
                                  >
                                    <div className="min-w-0 flex-1 flex items-center gap-2.5">
                                      {rc.clue.static_image_url && (
                                        <img
                                          src={rc.clue.static_image_url}
                                          alt=""
                                          className="w-11 h-8 rounded-md object-cover shrink-0 border border-slate-200"
                                        />
                                      )}
                                      <div className="min-w-0 flex-1">
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-black uppercase mr-2">
                                          R{rc.round} • #{rc.indexInRound}
                                        </span>
                                        <strong className="text-slate-900 group-hover:text-emerald-800 mr-1.5 underline decoration-emerald-400/60">
                                          {rc.cleanTitle}:
                                        </strong>
                                        <span className="text-slate-600">
                                          {rc.cleanProofText}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {userTag && (
                                        <span
                                          className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                            userTag === 'key'
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-rose-100 text-rose-800'
                                          }`}
                                        >
                                          {userTag === 'key' ? '🔑 Tagged Key ✅' : '❌ Missed'}
                                        </span>
                                      )}
                                      <span className="px-2 py-0.5 rounded bg-slate-100 group-hover:bg-emerald-700 text-slate-700 group-hover:text-white text-[9px] font-black uppercase transition-colors">
                                        👁️ View Clue
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* RIGHT 5 COLS: COMPACT RED-HERRING SUBPLOTS (R1/R2 BAIT -> R3 ALIBI) */}
                <div className="lg:col-span-5 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                        🎭 Red-Herring Subplots • Click Any Clue to View
                      </span>
                      <h3 className="text-base font-black uppercase text-slate-900">
                        Why The Other Suspects Were Cleared
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-black">
                      {fakeClues.length} Decoy Clues
                    </span>
                  </div>

                  <div className="space-y-4">
                    {subplots.map((sp: any, spIdx: number) => {
                      const spClues = getCluesForSubplot(sp, spIdx);
                      const baitClues = spClues.filter((fc) => fc.round < 3);
                      const alibiClues = spClues.filter((fc) => fc.round === 3);

                      return (
                        <div
                          key={sp.id || spIdx}
                          className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-black text-slate-900">
                              {hydrate(sp.title)}
                            </h4>
                            <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-black uppercase shrink-0">
                              🛡️ Cleared in R3
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            {hydrate(sp.description)}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            {baitClues.map((fc) => (
                              <button
                                key={fc.clue.id}
                                type="button"
                                onClick={() => setSelectedRevealClue(fc.clue)}
                                title="Click to open and view this full clue card"
                                className="w-full text-left rounded-xl bg-white hover:bg-rose-50/50 border border-rose-200 hover:border-rose-400 px-3 py-2 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {fc.clue.static_image_url && (
                                    <img
                                      src={fc.clue.static_image_url}
                                      alt=""
                                      className="w-10 h-8 rounded object-cover shrink-0 border border-slate-200"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px] font-black uppercase mr-2">
                                      R{fc.round} Bait
                                    </span>
                                    <strong className="text-slate-900 group-hover:text-rose-800 mr-1 underline decoration-rose-400/60">
                                      {fc.cleanTitle}:
                                    </strong>
                                    <span className="text-slate-600">{fc.cleanProofText}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-slate-100 group-hover:bg-rose-600 text-slate-700 group-hover:text-white text-[9px] font-black uppercase shrink-0 transition-colors">
                                  👁️ View
                                </span>
                              </button>
                            ))}

                            {alibiClues.map((fc) => (
                              <button
                                key={fc.clue.id}
                                type="button"
                                onClick={() => setSelectedRevealClue(fc.clue)}
                                title="Click to open and view this full alibi clue card"
                                className="w-full text-left rounded-xl bg-sky-50 hover:bg-sky-100/70 border border-sky-300 hover:border-sky-500 px-3 py-2 text-xs flex items-center justify-between gap-2 transition-all cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {fc.clue.static_image_url && (
                                    <img
                                      src={fc.clue.static_image_url}
                                      alt=""
                                      className="w-10 h-8 rounded object-cover shrink-0 border border-sky-200"
                                    />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <span className="px-1.5 py-0.5 rounded bg-sky-700 text-white text-[9px] font-black uppercase mr-2">
                                      🛡️ R3 Alibi
                                    </span>
                                    <strong className="text-slate-900 group-hover:text-sky-900 mr-1 underline decoration-sky-400/60">
                                      {fc.cleanTitle}:
                                    </strong>
                                    <span className="text-slate-700">{fc.cleanProofText}</span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-white group-hover:bg-sky-700 text-sky-800 group-hover:text-white text-[9px] font-black uppercase shrink-0 transition-colors">
                                  👁️ View
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* =====================================================================
                  SECTION 3 (UNDERNEATH): YOUR SCORECARD & COMBINED ROOM RESULTS
              ====================================================================== */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
                {/* CARD A (5 COLS): YOUR ACCUSATIONS & CLUE CHECKLIST */}
                <div className="lg:col-span-5 rounded-3xl bg-slate-900 text-white p-6 border border-slate-800 shadow-lg space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                        📓 Your Detective Scorecard
                      </span>
                      <h3 className="text-base font-black uppercase text-white">
                        How Your Picks &amp; Clues Stacked Up
                      </h3>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-amber-400/40 text-right">
                      <div className="text-[9px] font-black uppercase text-slate-400">
                        Your Score
                      </div>
                      <div className="text-sm font-black text-amber-300">
                        {yourTotalScore} Pts{' '}
                        {accuracyPct !== null ? `• ${accuracyPct}% Tags` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Compact 3-Round Guesses Strip */}
                  <div className="grid grid-cols-3 gap-2.5">
                    {[1, 2, 3].map((rNum) => {
                      const g = guesses[rNum];
                      const guessedChar = getCharById(g?.suspectId);
                      const isCorrect =
                        guessedChar && killerChar && guessedChar.id === killerChar.id;
                      return (
                        <div
                          key={rNum}
                          className={`rounded-xl p-3 border text-xs ${
                            !guessedChar
                              ? 'bg-slate-950 border-slate-800'
                              : isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/50'
                              : 'bg-rose-950/30 border-rose-500/40'
                          }`}
                        >
                          <div className="text-[9px] font-black uppercase text-slate-400">
                            Round {rNum}
                          </div>
                          <div className="font-black text-white mt-0.5 truncate">
                            {guessedChar ? guessedChar.displayName : 'No Pick'}
                          </div>
                          <div className="text-[10px] mt-0.5 font-bold">
                            {!guessedChar ? (
                              <span className="text-slate-500">—</span>
                            ) : isCorrect ? (
                              <span className="text-emerald-400">✅ Correct</span>
                            ) : (
                              <span className="text-rose-400">❌ Decoy</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Single-Line Clue Checklist (All 16 Clues - Clickable!) */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1">
                      <span>All {allOrderedClues.length} Clues vs. The Truth (Click to View)</span>
                      <span>
                        {totalCorrectTags}/{totalTagged} Tagged Right (+{bonusPoints} pts)
                      </span>
                    </div>

                    <div className="max-h-80 overflow-y-auto pr-1 space-y-1.5">
                      {allOrderedClues.map((item) => {
                        const { clue: c, round, indexInRound, isFake, cleanTitle, beatNum } = item;
                        const t = clueTags[c.id];
                        const tagWasCorrect =
                          t === 'key'
                            ? !isFake
                            : t === 'red_herring' || t === 'alibi'
                            ? isFake
                            : null;

                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setSelectedRevealClue(c)}
                            title="Click to inspect full clue card"
                            className="w-full text-left rounded-xl bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-brand-pink px-3 py-2 flex items-center justify-between gap-2 text-xs transition-all cursor-pointer group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase shrink-0">
                                R{round}#{indexInRound}
                              </span>
                              <span className="font-bold text-white group-hover:text-brand-pink truncate underline decoration-white/20">
                                {cleanTitle}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  isFake
                                    ? round === 3
                                      ? 'bg-sky-500/20 text-sky-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {isFake
                                  ? round === 3
                                    ? '🛡️ Alibi'
                                    : '🎭 Decoy'
                                  : `✓ Beat ${beatNum}`}
                              </span>

                              {t && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                                    tagWasCorrect
                                      ? 'bg-emerald-500 text-slate-950'
                                      : 'bg-rose-500 text-white'
                                  }`}
                                >
                                  {tagWasCorrect ? '✅' : '❌'}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* CARD B (7 COLS): COMBINED ROOM VOTING & PLAYER LEADERBOARD */}
                <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                        📊 All-Players Room Results
                      </span>
                      <h3 className="text-base font-black uppercase text-slate-900">
                        Who The Room Voted For &amp; Detective Leaderboard
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                      {totalPlayersCount} Players
                    </span>
                  </div>

                  {/* Compact Suspect Vote Bars */}
                  <div className="space-y-2.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Final Round 3 Suspect Vote Share
                    </div>
                    {suspectVoteStats.map((st) => (
                      <div key={st.suspect.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">
                              {st.suspect.displayName}
                            </span>
                            {st.isTrueKiller && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-black uppercase">
                                🔪 True Killer
                              </span>
                            )}
                          </div>
                          <span className="text-slate-600 font-bold">
                            R1: {st.r1Votes} • R2: {st.r2Votes} •{' '}
                            <strong className="text-slate-900">
                              Final: {st.r3Votes} ({st.r3Pct}%)
                            </strong>
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.isTrueKiller ? 'bg-emerald-600' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.max(st.r3Votes > 0 ? 6 : 2, st.r3Pct)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compact All-Players Leaderboard Table */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Player-by-Player Round Picks &amp; Final Score
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            <th className="py-2 pr-2">#</th>
                            <th className="py-2 px-2">Player</th>
                            <th className="py-2 px-2">R1</th>
                            <th className="py-2 px-2">R2</th>
                            <th className="py-2 px-2">R3 Final</th>
                            <th className="py-2 pl-2 text-right">Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {simulatedTablePlayers.map((p, idx) => {
                            const r1Right =
                              p.r1Suspect && killerChar && p.r1Suspect.id === killerChar.id;
                            const r2Right =
                              p.r2Suspect && killerChar && p.r2Suspect.id === killerChar.id;
                            const r3Right =
                              p.r3Suspect && killerChar && p.r3Suspect.id === killerChar.id;

                            return (
                              <tr
                                key={p.id}
                                className={p.isYou ? 'bg-amber-50/70 font-bold' : ''}
                              >
                                <td className="py-2.5 pr-2 font-black text-slate-500">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className="font-black text-slate-900">
                                    {p.playerName}
                                  </span>
                                  {p.isYou && (
                                    <span className="ml-1.5 px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 text-[9px] font-black uppercase">
                                      YOU
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className={r1Right ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                                    {p.r1Suspect?.displayName?.split(' (')[0] || '—'}{' '}
                                    {r1Right ? '✅' : '❌'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className={r2Right ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                                    {p.r2Suspect?.displayName?.split(' (')[0] || '—'}{' '}
                                    {r2Right ? '✅' : '❌'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-2">
                                  <span
                                    className={`px-2 py-0.5 rounded font-black text-[11px] ${
                                      r3Right
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : 'bg-rose-50 text-rose-800'
                                    }`}
                                  >
                                    {p.r3Suspect?.displayName?.split(' (')[0] || '—'}{' '}
                                    {r3Right ? '🔪✅' : '❌'}
                                  </span>
                                </td>
                                <td className="py-2.5 pl-2 text-right font-black text-slate-900">
                                  {p.totalScore} pts
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* STEP 6: 20x PRE-LAUNCH AUTOMATED STRESS-TEST & STABILITY REVIEW */}
      {step === 'qa_20x' && (
        <MysteryPreLaunchQaPanel
          mysteryId={mystery?.id}
          mysteryTitle={mystery?.title || 'Mystery Pack'}
        />
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

      {/* CLICKABLE REVEAL CLUE LIGHTBOX MODAL */}
      {selectedRevealClue && (() => {
        const cleanTitle =
          stripCustomerFacingTitle(selectedRevealClue.title) ||
          selectedRevealClue.title;
        const hydratedTitle = hydrate(cleanTitle);
        const hydratedDesc = hydrate(selectedRevealClue.description);
        const isFake =
          selectedRevealClue.evidence_status === 'fake' ||
          selectedRevealClue.implication_type === 'red_herring';
        const linkedBeat = plotBeats.find(
          (b: any) => b.id === selectedRevealClue.linked_plot_beat_id
        );
        const cleanNotes = hydrate(
          stripFormatTagFromNotes(selectedRevealClue.internal_notes)
        );

        return (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedRevealClue(null)}
          >
            <div
              className="relative bg-slate-900 border border-brand-pink/50 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedRevealClue(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer z-20"
              >
                ✕
              </button>

              <div className="pr-10 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase">
                    Round {selectedRevealClue.round_number || 1} Evidence
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isFake
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isFake
                      ? '🎭 Red Herring / Subplot'
                      : `✓ Real Canon${linkedBeat ? ` • Beat ${linkedBeat.beat_number}` : ''}`}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{hydratedTitle}</h3>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                <ClueRenderer
                  clue={{
                    ...selectedRevealClue,
                    title: hydratedTitle,
                    description: hydratedDesc,
                  }}
                  characters={activeCharacters}
                  compact={false}
                />
              </div>

              {cleanNotes && (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
                  <strong>🔬 Designer / QA Logic:</strong> {cleanNotes}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* FULL CHARACTER PORTRAIT LIGHTBOX MODAL */}
      {selectedPortraitModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPortraitModal(null)}
        >
          <div
            className="relative bg-slate-900 border border-brand-pink/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelectedPortraitModal(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <div className="pr-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Character Costume Portrait
              </span>
              <h3 className="text-xl font-black text-white">
                {selectedPortraitModal.title}
              </h3>
            </div>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border border-slate-800">
              <img
                src={selectedPortraitModal.url}
                alt={selectedPortraitModal.title}
                className="w-full h-full object-cover"
              />
            </div>
            {selectedPortraitModal.subtitle && (
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>👗 What to Wear:</strong> {selectedPortraitModal.subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
