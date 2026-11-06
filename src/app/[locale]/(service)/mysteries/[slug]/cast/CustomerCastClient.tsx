'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestModal } from '@/components/account/GuestModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { Locale } from '@/lib/i18n-config';
import { getTierForPlayerCount, PLAYER_TIER_LIMITS } from '@/utils/localization';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { saveGuestAction } from '@/app/actions/guests';
import { saveCustomerCastAction } from '@/app/actions/customer-mystery';
import MysteryReadyHub from '@/components/mysteries/MysteryReadyHub';
import MysteryGeneratingScreen from '@/components/mysteries/MysteryGeneratingScreen';

interface GuestItem {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'adaptable' | string;
  accent?: string;
  eye_color?: string;
  height?: string;
  avatar_url?: string;
  traits?: string[];
  bio?: string;
  isLinked?: boolean;
}

interface CharacterItem {
  id: string;
  name: string;
  roleTitle: string;
  gender: 'male' | 'female' | 'adaptable';
  is_victim: boolean;
  is_mandatory: boolean;
  cleanBio: string;
  outfitAdvice: string;
  outfitFeminine?: string | null;
  outfitMasculine?: string | null;
  actBullets?: string[];
  characterPhotoUrl?: string | null;
  initialGuestId?: string | null;
}

interface CustomerCastClientProps {
  locale: string;
  mystery: {
    id: string;
    slug: string;
    title: string;
    theme: string | null;
    description: string | null;
    image_url: string | null;
    min_players: number;
    max_players: number;
  };
  characters: CharacterItem[];
  initialGuests: GuestItem[];
  initialPin: string;
  initialIsPaid?: boolean;
  justCheckedOut?: boolean;
  isEditMode?: boolean;
  customerEmail?: string | null;
  initialGenerationState?: {
    status: 'idle' | 'generating' | 'ready';
    startedAt: string | null;
    readyAt: string | null;
    remainingSeconds: number;
    progress: number;
    stepLabel: string;
  } | null;
  tier?: 'basic' | 'premium' | 'grand';
  initialViewMode?: 'cast' | 'generating' | 'ready';
}

function normalizeGender(g?: string | null): 'male' | 'female' | 'adaptable' {
  const val = (g || '').toLowerCase().trim();
  if (val === 'male' || val === 'masculine' || val === 'he/him' || val === 'man') return 'male';
  if (val === 'female' || val === 'feminine' || val === 'she/her' || val === 'woman') return 'female';
  return 'adaptable';
}

function formatGenderLabel(g?: string | null): {
  label: string;
  shortLabel: string;
  badgeClass: string;
} {
  const norm = normalizeGender(g);
  if (norm === 'male') {
    return {
      label: 'Masculine Role',
      shortLabel: 'Masculine',
      badgeClass: 'bg-sky-50 text-sky-600 border-sky-200',
    };
  }
  if (norm === 'female') {
    return {
      label: 'Feminine Role',
      shortLabel: 'Feminine',
      badgeClass: 'bg-pink-50 text-brand-pink border-pink-200',
    };
  }
  return {
    label: 'Adaptable (Any Gender)',
    shortLabel: 'Any Gender',
    badgeClass: 'bg-purple-50 text-purple-600 border-purple-200',
  };
}

/**
 * Seeded Mulberry32 shuffle so mandatory vs optional suspects are completely mixed
 * and every AI Re-Sort click produces a genuinely fresh permutation.
 */
function shuffleArray<T>(items: T[], seedOffset = 1): T[] {
  const arr = [...items];
  let state = (seedOffset * 2654435761) >>> 0;
  const nextRand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function CustomerCastClient({
  locale,
  mystery,
  characters,
  initialGuests,
  initialPin,
  initialIsPaid = false,
  justCheckedOut = false,
  isEditMode = false,
  customerEmail = null,
  initialGenerationState = null,
  tier = 'basic',
  initialViewMode = 'cast',
}: CustomerCastClientProps) {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestItem[]>(initialGuests);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cast' | 'generating' | 'ready'>(
    initialViewMode
  );

  const maxRoles = Math.min(
    characters.length,
    mystery.max_players || characters.length
  );
  // Minimum 5 characters must always be in the mystery so backstories & alibis tangle properly
  const minRoles = Math.min(Math.max(5, mystery.min_players || 5), maxRoles);

  // Play Mode: 'party' (5+ guests playing 1 character each, zero extra side characters)
  // vs 'casefile' (1–4 players solving all selected suspect dossiers together like a detective box)
  const [playMode, setPlayMode] = useState<'party' | 'casefile'>('party');

  // 1. Attending Guests / Selected Profiles (In or Out — minimum 5 characters for the story)
  const [attendingGuestIds, setAttendingGuestIds] = useState<string[]>(() => {
    // Check if characters already have assigned guests
    const preAssignedIds = characters
      .map(c => c.initialGuestId)
      .filter((id): id is string => Boolean(id) && initialGuests.some(g => g.id === id));

    if (preAssignedIds.length >= minRoles) {
      return Array.from(new Set(preAssignedIds)).slice(0, maxRoles);
    }
    return initialGuests.slice(0, Math.min(initialGuests.length, Math.max(minRoles, 6), maxRoles)).map(g => g.id);
  });

  // Identify Victim character vs all other characters
  const victimCharacter = useMemo(
    () => characters.find(c => c.is_victim) || characters[0],
    [characters]
  );

  const nonVictimCharacters = useMemo(
    () => characters.filter(c => c.id !== victimCharacter?.id),
    [characters, victimCharacter]
  );

  // Secretly select active non-victim characters based on attending guest count:
  // Always pull mandatory roles first (which includes Killer & core web), then optional roles,
  // and shuffle them so the host NEVER knows which roles are mandatory vs optional!
  const [shuffleSeed, setShuffleSeed] = useState(1);

  const activeSuspectCharacters = useMemo(() => {
    const targetSuspectCount = Math.max(
      0,
      Math.min(attendingGuestIds.length - 1, nonVictimCharacters.length)
    );
    const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
    const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);

    // Pick all mandatory first, then fill remaining slots from optional
    const combined = [...mandatoryPool, ...optionalPool].slice(0, targetSuspectCount);
    // Shuffle flat list with fixed seed (1) so card order doesn't leak mandatory vs optional
    return shuffleArray(combined, 1);
  }, [nonVictimCharacters, attendingGuestIds.length]);

  // Assignments map: characterId -> guestId
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const usedGuests = new Set<string>();

    // First honor any existing assignments
    for (const c of characters) {
      if (c.initialGuestId && initialGuests.some(g => g.id === c.initialGuestId)) {
        map[c.id] = c.initialGuestId;
        usedGuests.add(c.initialGuestId);
      }
    }

    // If none assigned, run initial smart sort
    if (Object.keys(map).length === 0 && initialGuests.length > 0 && victimCharacter) {
      const pool = initialGuests.slice(0, Math.min(initialGuests.length, maxRoles));
      const available = [...pool];

      // Match victim gender first if possible
      const vGender = normalizeGender(victimCharacter.gender);
      let vIdx =
        vGender !== 'adaptable'
          ? available.findIndex(g => normalizeGender(g.gender) === vGender)
          : 0;
      if (vIdx === -1) vIdx = 0;
      if (available[vIdx]) {
        map[victimCharacter.id] = available[vIdx].id;
        available.splice(vIdx, 1);
      }

      // Match remaining suspects
      const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
      const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);
      const activePool = [...mandatoryPool, ...optionalPool].slice(0, available.length);

      for (const char of activePool) {
        const cGender = normalizeGender(char.gender);
        let idx =
          cGender !== 'adaptable'
            ? available.findIndex(g => normalizeGender(g.gender) === cGender)
            : -1;
        if (idx === -1) idx = 0;
        if (available[idx]) {
          map[char.id] = available[idx].id;
          available.splice(idx, 1);
        }
      }
    }

    return map;
  });

  // Gender Mismatch Confirmation Modal State (specifically for Victim selection)
  const [pendingVictimMismatch, setPendingVictimMismatch] = useState<{
    guest: GuestItem;
    victimRoleGender: 'male' | 'female';
    guestGender: 'male' | 'female' | 'adaptable';
  } | null>(null);

  // Saving & Locked Lobby State
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lockedSession, setLockedSession] = useState<{
    pin: string;
    mysteryId: string;
  } | null>(() => (initialIsPaid ? { pin: initialPin, mysteryId: mystery.id } : null));
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (justCheckedOut) {
      const el = document.getElementById('step-4-lobby-ready');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [justCheckedOut]);

  const attendingGuests = useMemo(
    () => guests.filter(g => attendingGuestIds.includes(g.id)),
    [guests, attendingGuestIds]
  );

  // Toggle a guest In or Out
  const handleToggleGuestAttendance = (guestId: string) => {
    setLockedSession(null);
    setAttendingGuestIds(prev => {
      const isCurrentlyIn = prev.includes(guestId);
      let nextIds: string[];

      if (isCurrentlyIn) {
        nextIds = prev.filter(id => id !== guestId);
      } else {
        if (prev.length >= maxRoles) {
          return prev; // At character limit
        }
        nextIds = [...prev, guestId];
      }

      // Reconcile assignments with the updated attending guest list
      const nextAttendingObjs = guests.filter(g => nextIds.includes(g.id));
      reconcileAssignments(nextAttendingObjs);
      return nextIds;
    });
  };

  // Reconciles assignments when guests are toggled In/Out
  const reconcileAssignments = (nextAttending: GuestItem[], customSeed?: number) => {
    if (!victimCharacter) return;
    const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
    const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);
    const targetSuspects = [...mandatoryPool, ...optionalPool].slice(
      0,
      Math.max(0, nextAttending.length - 1)
    );
    const allActiveChars = [victimCharacter, ...targetSuspects];

    setAssignments(prev => {
      const nextMap: Record<string, string> = {};
      const usedGuestIds = new Set<string>();
      const validIds = new Set(nextAttending.map(g => g.id));

      // Keep existing valid assignments on active characters if not forcing a re-sort
      if (customSeed === undefined) {
        for (const char of allActiveChars) {
          const existingGuestId = prev[char.id];
          if (existingGuestId && validIds.has(existingGuestId) && !usedGuestIds.has(existingGuestId)) {
            nextMap[char.id] = existingGuestId;
            usedGuestIds.add(existingGuestId);
          }
        }
      } else {
        // Keep the host's chosen Victim locked during Re-Sort if still attending
        const existingVictimGuestId = prev[victimCharacter.id];
        if (existingVictimGuestId && validIds.has(existingVictimGuestId)) {
          nextMap[victimCharacter.id] = existingVictimGuestId;
          usedGuestIds.add(existingVictimGuestId);
        }
      }

      let remainingGuests = nextAttending.filter(g => !usedGuestIds.has(g.id));
      let charsToAssign = [...allActiveChars];
      if (customSeed !== undefined) {
        remainingGuests = shuffleArray(remainingGuests, customSeed);
        charsToAssign = [
          victimCharacter,
          ...shuffleArray(targetSuspects, customSeed + 101),
        ];
      }

      for (const char of charsToAssign) {
        if (nextMap[char.id]) continue;
        const charGender = normalizeGender(char.gender);
        let matchIdx = -1;
        if (charGender !== 'adaptable') {
          matchIdx = remainingGuests.findIndex(g => normalizeGender(g.gender) === charGender);
        }
        if (matchIdx === -1 && remainingGuests.length > 0) {
          matchIdx = 0;
        }
        if (matchIdx !== -1 && remainingGuests[matchIdx]) {
          nextMap[char.id] = remainingGuests[matchIdx].id;
          remainingGuests.splice(matchIdx, 1);
        }
      }

      return nextMap;
    });
  };

  // Trigger AI Re-Sort (keeps Victim locked, shuffles and gender-matches all Suspects)
  const handleAiResort = () => {
    setLockedSession(null);
    const nextSeed = shuffleSeed + 1;
    setShuffleSeed(nextSeed);
    reconcileAssignments(attendingGuests, nextSeed);
  };

  // Assign a guest to a character (with swap logic if that guest was already assigned elsewhere)
  const commitAssignment = (characterId: string, newGuestId: string) => {
    setLockedSession(null);
    setAssignments(prev => {
      const next = { ...prev };
      const previousGuestOnTarget = next[characterId];

      // Find if newGuestId is already assigned to another active character
      const otherCharId = Object.keys(next).find(
        cId => cId !== characterId && next[cId] === newGuestId
      );

      next[characterId] = newGuestId;
      if (otherCharId) {
        if (previousGuestOnTarget) {
          next[otherCharId] = previousGuestOnTarget;
        } else {
          delete next[otherCharId];
        }
      }
      return next;
    });
  };

  // Handler when the Host changes The Victim dropdown
  const handleSelectVictimGuest = (newGuestId: string) => {
    if (!victimCharacter || !newGuestId) return;
    const selectedGuest = guests.find(g => g.id === newGuestId);
    if (!selectedGuest) return;

    const currentVictimGuestId = assignments[victimCharacter.id];
    const currentVictimGuest = guests.find(g => g.id === currentVictimGuestId);
    const currentVictimGuestGender = currentVictimGuest
      ? normalizeGender(currentVictimGuest.gender)
      : 'adaptable';

    const writtenRoleGender = normalizeGender(victimCharacter.gender);
    const effectiveVictimGender: 'male' | 'female' | 'adaptable' =
      writtenRoleGender === 'male' || writtenRoleGender === 'female'
        ? writtenRoleGender
        : currentVictimGuestGender;

    const guestGender = normalizeGender(selectedGuest.gender);

    // Check if the Victim role (or current Victim) has a specific gender ('male' or 'female') and the new guest's gender doesn't match
    if (
      (effectiveVictimGender === 'male' || effectiveVictimGender === 'female') &&
      guestGender !== effectiveVictimGender
    ) {
      setPendingVictimMismatch({
        guest: selectedGuest,
        victimRoleGender: effectiveVictimGender,
        guestGender,
      });
      return;
    }

    commitAssignment(victimCharacter.id, newGuestId);
  };

  // Add a brand new guest on the fly
  const handleSaveNewGuest = async (guestData: any) => {
    const res = await saveGuestAction(guestData);
    if (res.guest) {
      const saved: GuestItem = {
        id: res.guest.id,
        name: res.guest.name,
        gender: res.guest.gender || 'adaptable',
        avatar_url: res.guest.avatar_url || '',
        traits: res.guest.traits || [],
        bio: res.guest.bio || '',
      };
      const updatedGuests = [saved, ...guests];
      setGuests(updatedGuests);

      if (attendingGuestIds.length < maxRoles) {
        const nextIds = [...attendingGuestIds, saved.id];
        setAttendingGuestIds(nextIds);
        reconcileAssignments(updatedGuests.filter(g => nextIds.includes(g.id)));
      }
    }
  };

  // Lock Cast & Proceed to Checkout (or save updates if editing from My Mysteries)
  const handleLockCast = async () => {
    if (!victimCharacter) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const allActiveCharIds = [
        victimCharacter.id,
        ...activeSuspectCharacters.map(c => c.id),
      ];

      const payload = allActiveCharIds.map(charId => {
        const gId = assignments[charId];
        const guestObj = guests.find(g => g.id === gId) || null;
        return {
          characterId: charId,
          guest: guestObj,
        };
      });

      const res = await saveCustomerCastAction(mystery.id, payload, allActiveCharIds);
      if (res.error) {
        setSaveError(res.error);
        setIsSaving(false);
        return;
      }

      if (isEditMode && initialIsPaid) {
        setLockedSession({
          pin: res.pin || initialPin,
          mysteryId: mystery.id,
        });
        router.push(`/${locale}/mysteries/${mystery.slug}/ready`);
        return;
      }

      // Linear workflow: Select Guests -> Lock In Cast -> Pay -> 20-Min Coffee Screen -> My Mysteries (Stories)
      router.push(
        `/${locale}/checkout/${mystery.id}?slug=${encodeURIComponent(mystery.slug)}&guests=${attendingGuests.length}`
      );
    } catch (err: any) {
      setSaveError(err.message || 'Failed to lock cast.');
      setIsSaving(false);
    }
  };

  const victimAssignedGuest = victimCharacter
    ? guests.find(g => g.id === assignments[victimCharacter.id])
    : null;

  const activeCastCharacters = useMemo(
    () => [...(victimCharacter ? [victimCharacter] : []), ...activeSuspectCharacters],
    [victimCharacter, activeSuspectCharacters]
  );

  const effectivePin = lockedSession?.pin || initialPin;

  return (
    <div className="space-y-8 pb-16 max-w-6xl mx-auto">
      {viewMode === 'generating' ? (
        <MysteryGeneratingScreen
          locale={locale}
          mysteryId={mystery.id}
          slug={mystery.slug}
          mysteryTitle={mystery.title}
          pin={effectivePin}
          customerEmail={customerEmail}
          initialStatus={
            initialGenerationState?.status === 'ready' ? 'ready' : 'generating'
          }
          initialRemainingSeconds={
            initialGenerationState?.remainingSeconds ?? 20 * 60
          }
          initialProgress={initialGenerationState?.progress ?? 18}
          initialStepLabel={
            initialGenerationState?.stepLabel ||
            'Locking cast & hydrating character dossiers with guest names...'
          }
          castCount={activeCastCharacters.length}
        />
      ) : viewMode === 'ready' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Link
              href={`/${locale}/account/orders`}
              className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-brand-pink transition-colors"
            >
              ← Back to My Mysteries (Stories)
            </Link>
          </div>
          <MysteryReadyHub
            locale={locale}
            mystery={mystery}
            pin={effectivePin}
            characters={activeCastCharacters}
            guests={guests}
            assignments={assignments}
            onEditCast={() => setViewMode('cast')}
          />
        </div>
      ) : (
        <>
          {/* Clean Linear 4-Stage Workflow Stepper */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-black uppercase tracking-widest">
            <span className="px-3.5 py-1.5 rounded-full bg-brand-pink text-white shadow-sm">
              1. Select Guests ({attendingGuestIds.length})
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white">
              2. Lock In Cast
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500">
              3. Pay &amp; Brew (~20 Mins)
            </span>
            <span className="text-slate-300">→</span>
            <span className="px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-500">
              4. Ready in My Mysteries (Stories)
            </span>
          </div>

          {/* Top Breadcrumb & Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <Link
                href={
                  isEditMode
                    ? `/${locale}/account/orders`
                    : `/${locale}/mysteries/${mystery.slug}`
                }
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-brand-pink transition-colors mb-3"
              >
                ← {isEditMode ? 'Back to My Mysteries (Stories)' : `Back to ${mystery.title}`}
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {isEditMode ? 'Edit Your Mystery Cast' : 'Cast Your Mystery'}
                </h1>
                <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-200">
                  🔒 100% Spoiler-Free Host View
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Pick who is coming tonight, choose your Victim, and lock in your cast. Once you pay, we&apos;ll generate your custom mystery package in ~20 minutes and email you when it&apos;s ready!
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {tier.toUpperCase()} Package ({PLAYER_TIER_LIMITS[tier].label})
                </span>
                <span className="text-sm font-black text-slate-900">
                  <PriceDisplay tier={tier} locale={locale as Locale} />{' '}
                  <span className="text-xs font-bold text-emerald-600">• Up to {maxRoles} players included</span>
                </span>
              </div>
            </div>
          </div>

      {/* PLAY FORMAT SELECTOR: PARTY ROLEPLAY VS CASE-FILE DETECTIVE MODE */}
      <section className="bg-slate-900 text-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-800 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
              How Are You Solving Tonight?
            </span>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Two Ways to Play Every Mystery Package
            </h2>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-white/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-white/10 shrink-0">
            ✓ Min {minRoles} Suspects Required in Story Web
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setPlayMode('party')}
            className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer ${
              playMode === 'party'
                ? 'border-brand-pink bg-brand-pink/15 shadow-lg'
                : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>🎭</span> Full-Cast Party Mode ({minRoles}–{maxRoles} Guests)
              </span>
              {playMode === 'party' && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                  Selected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              <strong>1 Character Per Guest — Zero Random Side Characters.</strong> Select the exact friends attending your party ({minRoles} to {maxRoles} people). We only include the exact number of characters you select so nobody is left unplayed.
            </p>
          </button>

          <button
            type="button"
            onClick={() => {
              setPlayMode('casefile');
              if (attendingGuestIds.length < minRoles && guests.length >= minRoles) {
                const autoIds = guests.slice(0, Math.min(guests.length, Math.max(minRoles, 6))).map(g => g.id);
                setAttendingGuestIds(autoIds);
                reconcileAssignments(guests.filter(g => autoIds.includes(g.id)));
              }
            }}
            className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer ${
              playMode === 'casefile'
                ? 'border-brand-pink bg-brand-pink/15 shadow-lg'
                : 'border-white/10 bg-white/5 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                <span>📁</span> Case-File Detective Mode (1–4 Players / Solo / Duo)
              </span>
              {playMode === 'casefile' && (
                <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                  Selected
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed">
              <strong>Solve It Together Like a Cold-Case Box — No Acting Needed!</strong> Playing solo, as a couple, or with 3–4 friends? Simply select {minRoles}–{maxRoles} profiles below to populate the story&apos;s suspect web, then inspect all character dossiers, texts &amp; audio clues together to catch the killer.
            </p>
          </button>
        </div>
      </section>

      {/* STEP 1: GUEST ATTENDANCE (IN OR OUT) */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
              Step 1 • {playMode === 'casefile' ? 'Populate Your Suspect File' : 'In or Out (1 Character Per Guest)'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {playMode === 'casefile'
                ? `Select ${minRoles}–${maxRoles} Profiles for the Story Web (${attendingGuestIds.length} / ${maxRoles} Selected)`
                : `Who's Playing Tonight? (${attendingGuestIds.length} / ${maxRoles} Selected — Min ${minRoles})`}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {playMode === 'casefile' ? (
                <>
                  Every mystery requires at least <strong>{minRoles} suspects</strong> so the alibis, backstories, and motives tangle properly. Pick {minRoles}–{maxRoles} friends/profiles below to star in your case file — you&apos;ll receive all of their booklets and clues to solve solo or with a friend!
                </>
              ) : (
                <>
                  Tap guests to mark them <strong>In</strong> or <strong>Out</strong> (minimum <strong>{minRoles}</strong> so the backstories and alibis interlock). We generate <strong>strictly {attendingGuestIds.length} characters</strong> — zero unplayed side characters!
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {attendingGuestIds.length < minRoles && guests.length >= minRoles && (
              <button
                type="button"
                onClick={() => {
                  const targetCount = Math.min(guests.length, Math.max(minRoles, 6), maxRoles);
                  const nextIds = guests.slice(0, targetCount).map(g => g.id);
                  setAttendingGuestIds(nextIds);
                  reconcileAssignments(guests.filter(g => nextIds.includes(g.id)));
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-brand-pink transition-colors cursor-pointer"
              >
                ⚡ Auto-Select {Math.min(guests.length, Math.max(minRoles, 6))} Suspects
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsGuestModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-pink/40 text-brand-pink text-xs font-black uppercase tracking-widest hover:bg-brand-pink/5 transition-colors cursor-pointer"
            >
              + Add Guest
            </button>
          </div>
        </div>

        {attendingGuestIds.length < minRoles && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs font-bold text-amber-800">
              ⚠️ Please select at least <strong>{minRoles} profiles</strong> ({minRoles - attendingGuestIds.length} more needed) so the murder mystery has enough interlocking suspects, alibis, and red herrings. Playing solo or in a duo? Switch to <strong>Case-File Mode</strong> above and keep {minRoles}+ suspects selected!
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {guests.map(guest => {
            const isIn = attendingGuestIds.includes(guest.id);
            const isDisabled = !isIn && attendingGuestIds.length >= maxRoles;
            const gBadge = formatGenderLabel(guest.gender);
            const guestAvatar = resolveDisplayAvatarUrl(guest.avatar_url);

            return (
              <button
                key={guest.id}
                type="button"
                disabled={isDisabled}
                onClick={() => handleToggleGuestAttendance(guest.id)}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${
                  isIn
                    ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                    : isDisabled
                    ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center border border-slate-200">
                  {guestAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={guestAvatar} alt={guest.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">👤</span>
                  )}
                </div>
                <div className="min-w-0 flex-grow">
                  <p className="text-sm font-black text-slate-900 truncate">{guest.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {gBadge.shortLabel}
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                    isIn
                      ? 'bg-brand-pink text-white'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {isIn ? 'IN' : 'OUT'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* STEP 2: PICK THE VICTIM (WITH GENDER MISMATCH MODAL GUARD) */}
      {victimCharacter && (
        <section className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-white/10 relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="space-y-4 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                  Step 2 • 💀 Choose The Victim
                </span>
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-slate-200 border border-white/10">
                  Written Role: {formatGenderLabel(victimCharacter.gender).label}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {victimCharacter.roleTitle}
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    📖 Character Blurb
                  </span>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {victimCharacter.cleanBio}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-400">
                    👗 What to Wear (Outfit Vibe)
                  </span>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    {victimAssignedGuest && normalizeGender(victimAssignedGuest.gender) === 'female' && victimCharacter.outfitFeminine
                      ? victimCharacter.outfitFeminine
                      : victimAssignedGuest && normalizeGender(victimAssignedGuest.gender) === 'male' && victimCharacter.outfitMasculine
                      ? victimCharacter.outfitMasculine
                      : victimCharacter.outfitAdvice}
                  </p>
                </div>
              </div>
            </div>

            {/* Victim Guest Selector Card */}
            <div className="bg-white/5 border border-white/15 rounded-3xl p-6 w-full lg:w-80 shrink-0 space-y-4 backdrop-blur-md">
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Who is getting murdered tonight?
              </label>

              {victimAssignedGuest && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 border border-white/10">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center">
                    {resolveDisplayAvatarUrl(victimAssignedGuest.avatar_url) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={resolveDisplayAvatarUrl(victimAssignedGuest.avatar_url)}
                        alt={victimAssignedGuest.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl">💀</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white truncate">
                      {victimAssignedGuest.name}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Assigned as {victimCharacter.roleTitle}
                    </p>
                  </div>
                </div>
              )}

              <CustomSelect
                value={assignments[victimCharacter.id] || ''}
                onChange={e => handleSelectVictimGuest(e.target.value)}
                variant="dark"
                placeholder="Select guest for Victim..."
                className="w-full bg-slate-900 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-brand-pink cursor-pointer"
              >
                <option value="" disabled>
                  Select guest for Victim...
                </option>
                {attendingGuests.map(g => {
                  const gNorm = normalizeGender(g.gender);
                  const vNorm = normalizeGender(victimCharacter.gender);
                  const isMismatch =
                    (vNorm === 'male' || vNorm === 'female') && gNorm !== vNorm;
                  return (
                    <option key={g.id} value={g.id}>
                      {g.name} ({formatGenderLabel(g.gender).shortLabel}
                      {isMismatch ? ' ⚠️ Gender Mismatch' : ''})
                    </option>
                  );
                })}
              </CustomSelect>

              <p className="text-[11px] text-slate-400 font-medium leading-snug">
                Tip: Great for the birthday guest, hen/stag, or yourself! Even the Victim still gets to play and guess who killed them.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* STEP 3: SPOILER-FREE SUSPECTS POOL & AI RE-SORT */}
      <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
              Step 3 • Blind Suspect Casting
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              Tonight&apos;s Suspect Lineup ({activeSuspectCharacters.length} Suspects)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Mandatory and optional roles are secretly mixed below so you have <strong>zero spoilers</strong> about who the killer is. Hit <strong>AI Re-Sort</strong> or swap anyone freely!
            </p>
          </div>

          <button
            type="button"
            onClick={handleAiResort}
            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <span>⚡</span> AI Re-Sort Suspects
          </button>
        </div>

        {activeSuspectCharacters.length < minRoles - 1 ? (
          <div className="p-12 text-center text-slate-500 font-bold text-sm border-2 border-dashed border-slate-200 rounded-3xl space-y-2">
            <p className="text-slate-900 font-black text-base">
              Select at least {minRoles} profiles in Step 1 to build your suspect lineup!
            </p>
            <p className="text-xs font-medium text-slate-500 max-w-lg mx-auto">
              Every mystery needs at least {minRoles} characters (1 Victim + {minRoles - 1} Suspects) so their alibis, motives, and backstories tangle together. Playing solo or in a duo? Use <strong>Case-File Detective Mode</strong> and select {minRoles}+ profiles to inspect all of their files!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSuspectCharacters.map(char => {
              const assignedGuestId = assignments[char.id] || '';
              const assignedGuest = guests.find(g => g.id === assignedGuestId);
              const genderBadge = formatGenderLabel(char.gender);
              const guestNormGender = assignedGuest ? normalizeGender(assignedGuest.gender) : 'adaptable';
              const resolvedOutfit =
                guestNormGender === 'female' && char.outfitFeminine
                  ? char.outfitFeminine
                  : guestNormGender === 'male' && char.outfitMasculine
                  ? char.outfitMasculine
                  : char.outfitAdvice;

              return (
                <div
                  key={char.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50/50 hover:bg-white p-6 flex flex-col justify-between transition-all hover:shadow-md"
                >
                  <div className="space-y-4">
                    {/* Top Spoiler-Free Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-white">
                        🕵️ Suspect
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${genderBadge.badgeClass}`}
                      >
                        {genderBadge.label}
                      </span>
                    </div>

                    {/* Role Title */}
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                      {char.roleTitle}
                    </h3>

                    {/* Clean Blurb Box */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        📖 The Blurb
                      </p>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {char.cleanBio}
                      </p>
                    </div>

                    {/* Clean Outfit Guide */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1.5 mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          👗 What to Wear
                        </p>
                        {assignedGuest && (char.outfitFeminine || char.outfitMasculine) && (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Matched for {assignedGuest.name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {resolvedOutfit}
                      </p>
                    </div>
                  </div>

                  {/* Guest Assignment / Swap Selector */}
                  <div className="pt-4 border-t border-slate-200/70 space-y-2.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Assigned Guest (Select to Swap)
                    </label>
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center border border-slate-300">
                        {resolveDisplayAvatarUrl(assignedGuest?.avatar_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveDisplayAvatarUrl(assignedGuest?.avatar_url)}
                            alt={assignedGuest?.name || 'Guest'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-sm">👤</span>
                        )}
                      </div>
                      <CustomSelect
                        value={assignedGuestId}
                        onChange={e => commitAssignment(char.id, e.target.value)}
                        variant="light"
                        className="flex-grow min-w-0 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 hover:border-slate-300 focus:outline-none focus:border-brand-pink cursor-pointer"
                      >
                        <option value="">Unassigned</option>
                        {attendingGuests.map(g => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({formatGenderLabel(g.gender).shortLabel})
                          </option>
                        ))}
                      </CustomSelect>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {saveError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
            {saveError}
          </div>
        )}

        {/* Lock Cast CTA */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-medium">
            {isEditMode && initialIsPaid ? (
              <>
                Need to adjust your lineup? Save changes to immediately update your <strong>Pre-Party Ready Hub</strong> and <strong>Guest Assignments</strong>.
              </>
            ) : (
              <>
                Happy with your lineup? Click <strong>Lock In Cast &amp; Pay</strong> (
                <strong className="text-slate-900 uppercase">
                  {tier} ({PLAYER_TIER_LIMITS[tier].label}):{' '}
                  <PriceDisplay tier={tier} locale={locale as Locale} />
                </strong>{' '}
                flat — up to {maxRoles} players included). Once paid, our site will generate your custom package in ~20 minutes and email you when it&apos;s ready in <strong>My Mysteries (Stories)</strong>!
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              disabled={isSaving || attendingGuests.length < minRoles}
              onClick={handleLockCast}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
              }}
            >
              {isSaving ? (
                isEditMode && initialIsPaid ? (
                  'Saving Cast Updates...'
                ) : (
                  'Locking In Cast & Opening Payment...'
                )
              ) : isEditMode && initialIsPaid ? (
                '✓ Save Updated Cast & Return to Ready Hub →'
              ) : (
                <>
                  🔒 Lock In Cast &amp; Pay (
                  <PriceDisplay tier={tier} locale={locale as Locale} />
                  ) →
                </>
              )}
            </button>
          </div>
        </div>
      </section>
        </>
      )}

      {/* GENDER MISMATCH CONFIRMATION POP-UP FOR VICTIM SELECTION */}
      {pendingVictimMismatch && victimCharacter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl">
              ⚠️
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                Gender Mismatch Heads-Up
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Proceed with {pendingVictimMismatch.guest.name} as The Victim?
              </h3>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                The victim role (<strong>{victimCharacter.roleTitle}</strong>) was written as a{' '}
                <strong>
                  {pendingVictimMismatch.victimRoleGender === 'female' ? 'feminine (she/her)' : 'masculine (he/him)'}
                </strong>{' '}
                character.
              </p>
              <p className="text-sm text-slate-600 font-medium leading-relaxed">
                If you assign <strong>{pendingVictimMismatch.guest.name}</strong> to this role, some pre-written clues, pronouns, or audio evidence in the mystery may misgender them. Are you happy to deal with the misgendering?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPendingVictimMismatch(null)}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  commitAssignment(victimCharacter.id, pendingVictimMismatch.guest.id);
                  setPendingVictimMismatch(null);
                }}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onSave={handleSaveNewGuest}
      />
    </div>
  );
}
