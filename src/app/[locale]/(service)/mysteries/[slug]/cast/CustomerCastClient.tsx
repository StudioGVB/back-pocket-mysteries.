'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GuestModal } from '@/components/account/GuestModal';
import ProfileClient from '@/app/[locale]/(service)/account/profile/ProfileClient';
import { CustomSelect } from '@/components/ui/CustomSelect';
import PriceDisplay from '@/components/marketing/PriceDisplay';
import { Locale } from '@/lib/i18n-config';
import { getTierForPlayerCount, PLAYER_TIER_LIMITS } from '@/utils/localization';
import { resolveDisplayAvatarUrl, buildAvatarUrl } from '@/utils/avatar';
import { saveGuestAction, updateGuestAction } from '@/app/actions/guests';
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
  isHost?: boolean;
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
  hostProfile?: any;
  hostUser?: { name: string; email: string };
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

const RANDOM_DETECTIVE_SUSPECT_POOL: GuestItem[] = [
  {
    id: 'random-suspect-julian',
    name: 'Julian Vance',
    gender: 'male',
    accent: 'British',
    eye_color: 'Blue',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=JulianVance&top=shortWaved&hairColor=282828&skinColor=ffcd94&eyeColor=Blue&height=Tall&hairLength=Short&hairTexture=Wavy&accent=British&age=middle_aged&aiPhotoUrl=%2Fgenerated-avatars%2F3f17dfda-9758-49fa-a3df-cdf4f6b25ef7-aa57451c4e53.jpg',
    traits: ['Calculating', 'Antique Collector', 'Sharp-Dressed'],
    bio: 'A silver-tongued financier with immaculate tailoring and a ledger full of unspoken debts.',
    isHost: false,
  },
  {
    id: 'random-suspect-clara',
    name: 'Clara Sterling',
    gender: 'female',
    accent: 'British',
    eye_color: 'Hazel',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=ClaraSterling&top=straight01&hairColor=4a3123&skinColor=ffcd94&eyeColor=Hazel&height=Average&hairLength=Long&hairTexture=Wavy&accent=British&age=young&aiPhotoUrl=%2Fgenerated-avatars%2F44d70cd0-9f04-408b-8ac9-e064eb5c31d0-6224c730c6c6.jpg',
    traits: ['Poised', 'Secretive', 'Observant'],
    bio: 'An effortlessly composed socialite who notices every whispered conversation across the room.',
    isHost: false,
  },
  {
    id: 'random-suspect-elena',
    name: 'Elena Rostova',
    gender: 'female',
    accent: 'European',
    eye_color: 'Brown',
    height: 'Petite',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=ElenaRostova&top=straight02&hairColor=282828&skinColor=eac086&eyeColor=Brown&height=Petite&hairLength=Long&hairTexture=Straight&accent=European&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fd1433643-ac1b-4689-af57-84bb77c2be33-b6a686975735.jpg',
    traits: ['Fiercely Loyal', 'Quick-Witted', 'Unforgiving'],
    bio: 'A sharp-eyed gallery curator with a long memory for anyone who crosses her inner circle.',
    isHost: false,
  },
  {
    id: 'random-suspect-seraphina',
    name: 'Seraphina Vale',
    gender: 'female',
    accent: 'Australian',
    eye_color: 'Green',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=SeraphinaVale&top=curly&hairColor=d6b370&skinColor=ffcd94&eyeColor=Green&height=Tall&hairLength=Long&hairTexture=Wavy&accent=Australian&age=young&aiPhotoUrl=%2Fgenerated-avatars%2F5f9b36e0-44ae-4c3d-9762-432c5bb17783-5518cb6b6215.jpg',
    traits: ['Glamorous', 'Ambitious', 'Magnetic'],
    bio: 'A magnetic executive who always seems to be in the exact wrong place at the exact right moment.',
    isHost: false,
  },
  {
    id: 'random-suspect-sebastian',
    name: 'Sebastian Cross',
    gender: 'male',
    accent: 'American',
    eye_color: 'Blue',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=SebastianCross&top=shortFlat&hairColor=e8b07d&skinColor=ffe0bd&eyeColor=Blue&height=Tall&hairLength=Short&hairTexture=Straight&accent=American&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fda18ef00-ecdc-41e7-8c71-97d78046e43b-486590f0918d.jpg',
    traits: ['Charismatic', 'Reckless', 'High-Stakes'],
    bio: 'A smooth-talking heir whose charming smile hides a tangle of high-stakes rivalries.',
    isHost: false,
  },
  {
    id: 'random-suspect-mateo',
    name: 'Mateo Cruz',
    gender: 'male',
    accent: 'American',
    eye_color: 'Brown',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=MateoCruz&top=shaved&hairColor=282828&skinColor=d08b5b&eyeColor=Brown&height=Average&hairLength=Short&hairTexture=Straight&accent=American&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Ff3187085-155b-4389-9bf2-58c6dcc26d1b-350718ea0c1e.jpg',
    traits: ['Easygoing', 'Resourceful', 'Protective'],
    bio: 'The loyal confidant who knows where every skeleton is buried and never misses a detail.',
    isHost: false,
  },
  {
    id: 'random-suspect-damon',
    name: 'Damon Ross',
    gender: 'male',
    accent: 'American',
    eye_color: 'Brown',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=DamonRoss&top=shortFlat&hairColor=282828&skinColor=614335&facialHair=beardLight&eyeColor=Brown&height=Tall&hairLength=Short&hairTexture=Curly&accent=American&age=middle_aged&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-da18ef00.jpg',
    traits: ['Methodical', 'Unflappable', 'Strategist'],
    bio: 'A calm crisis negotiator who treats every dinner party like a high-stakes chess board.',
    isHost: false,
  },
  {
    id: 'random-suspect-siobhan',
    name: "Siobhán O'Connor",
    gender: 'female',
    accent: 'Irish / Scottish',
    eye_color: 'Green',
    height: 'Petite',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=SiobhanOConnor&top=longButNotTooLong&hairColor=d95319&skinColor=ffe0bd&eyeColor=Green&height=Petite&hairLength=Long&hairTexture=Wavy&accent=Irish%20%2F%20Scottish&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-44d70cd0.jpg',
    traits: ['Witty', 'Investigative', 'Bold'],
    bio: 'An investigative journalist with copper curls, a razor-sharp tongue, and zero patience for alibis.',
    isHost: false,
  },
  {
    id: 'random-suspect-priya',
    name: 'Priya Sharma',
    gender: 'female',
    accent: 'British',
    eye_color: 'Brown',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=PriyaSharma&top=straight01&hairColor=282828&skinColor=ae5d29&eyeColor=Brown&height=Average&hairLength=Long&hairTexture=Straight&accent=British&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-d1433643.jpg',
    traits: ['Brilliant', 'Perfectionist', 'Guarded'],
    bio: 'A brilliant corporate counsel who drafts airtight contracts and keeps her own motives under lock and key.',
    isHost: false,
  },
  {
    id: 'random-suspect-maya',
    name: 'Maya Lin',
    gender: 'female',
    accent: 'American',
    eye_color: 'Brown',
    height: 'Petite',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=MayaLin&top=bob&hairColor=282828&skinColor=eac086&eyeColor=Brown&height=Petite&hairLength=Short&hairTexture=Straight&accent=American&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-5f9b36e0.jpg',
    traits: ['Cool-Headed', 'Architect', 'Detail-Obsessed'],
    bio: 'An award-winning architect who knows the floorplan, blind spots, and secret passages better than anyone.',
    isHost: false,
  },
  {
    id: 'random-suspect-jeanluc',
    name: 'Jean-Luc Moreau',
    gender: 'male',
    accent: 'European',
    eye_color: 'Grey',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=JeanLucMoreau&top=shortWaved&hairColor=e8e1e1&skinColor=ffcd94&accessories=prescription01&eyeColor=Grey&height=Tall&hairLength=Short&hairTexture=Wavy&accent=European&age=old&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-3f17dfda.jpg',
    traits: ['Distinguished', 'Connoisseur', 'Enigmatic'],
    bio: 'A distinguished private art dealer with tortoise-shell glasses and a taste for rare, dangerous secrets.',
    isHost: false,
  },
  {
    id: 'random-suspect-marcus',
    name: 'Marcus Chen',
    gender: 'male',
    accent: 'Australian',
    eye_color: 'Brown',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=MarcusChen&top=shortFlat&hairColor=282828&skinColor=eac086&accessories=prescription01&eyeColor=Brown&height=Average&hairLength=Short&hairTexture=Straight&accent=Australian&age=young&aiPhotoUrl=%2Fgenerated-avatars%2Fqa-pack2-f3187085.jpg',
    traits: ['Tech-Savvy', 'Analytical', 'Skeptical'],
    bio: 'A forensic data analyst who tracks every digital footprint while hiding a midnight alibi of his own.',
    isHost: false,
  },
  {
    id: 'random-suspect-victoria',
    name: 'Victoria Sterling',
    gender: 'female',
    accent: 'British',
    eye_color: 'Hazel',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=VictoriaSterling&top=straight01&hairColor=4a3123&skinColor=ffcd94&eyeColor=Hazel&height=Average&hairLength=Long&hairTexture=Straight&accent=British&age=middle_aged&aiPhotoUrl=%2Fgenerated-avatars%2F4903bd39-e54f-42e4-b679-2af5d128bb8f-b130e47b4cee2149a7aad02dfc972e91.jpg',
    traits: ['Commanding', 'Old-Money', 'Unforgiving'],
    bio: 'A formidable family matriarch who guards the estate reputation at any cost.',
    isHost: false,
  },
  {
    id: 'random-suspect-arthur',
    name: 'Arthur Pendelton',
    gender: 'male',
    accent: 'British',
    eye_color: 'Blue',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=ArthurPendelton&top=shortFlat&hairColor=a0785a&skinColor=ffe0bd&eyeColor=Blue&height=Tall&hairLength=Short&hairTexture=Straight&accent=British&age=middle_aged&aiPhotoUrl=%2Fgenerated-avatars%2F74ced342-5614-4f81-a5e1-a4dab75e9420-ace4735b76caad3973e124ac2a06e161.jpg',
    traits: ['Old-School', 'Diplomatic', 'Evasive'],
    bio: 'A polished family solicitor who knows every clause of the will and every secret amendment.',
    isHost: false,
  },
  {
    id: 'random-suspect-camille',
    name: 'Camille Laurent',
    gender: 'female',
    accent: 'European',
    eye_color: 'Green',
    height: 'Tall',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=CamilleLaurent&top=curly&hairColor=d6b370&skinColor=ffcd94&eyeColor=Green&height=Tall&hairLength=Long&hairTexture=Wavy&accent=European&age=young&aiPhotoUrl=%2Fgenerated-avatars%2F5f9b36e0-44ae-4c3d-9762-432c5bb17783-6eb3e5429ae1.jpg',
    traits: ['Dramatic', 'Sommelier', 'Insider'],
    bio: 'A celebrated sommelier who poured every glass tonight and heard every toast.',
    isHost: false,
  },
  {
    id: 'random-suspect-dominic',
    name: 'Dominic Thorne',
    gender: 'male',
    accent: 'Australian',
    eye_color: 'Brown',
    height: 'Average',
    avatar_url:
      'https://api.dicebear.com/7.x/avataaars/svg?seed=DominicThorne&top=shortWaved&hairColor=4a3123&skinColor=d08b5b&eyeColor=Brown&height=Average&hairLength=Short&hairTexture=Wavy&accent=Australian&age=middle_aged&aiPhotoUrl=%2Fgenerated-avatars%2Ff3187085-155b-4389-9bf2-58c6dcc26d1b-b39015a5c476.jpg',
    traits: ['Ambitious', 'Insider', 'Smooth'],
    bio: 'An ambitious business partner who stood to gain the most if tonight’s deal fell through.',
    isHost: false,
  },
];

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
  hostProfile: initialHostProfile = null,
  hostUser = { name: 'Gabriella Blyth', email: '' },
}: CustomerCastClientProps) {
  const router = useRouter();
  const [guests, setGuests] = useState<GuestItem[]>(initialGuests);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [editingCastGuest, setEditingCastGuest] = useState<GuestItem | null>(null);
  const [isHostProfileModalOpen, setIsHostProfileModalOpen] = useState(false);
  const [liveHostProfile, setLiveHostProfile] = useState<any>(initialHostProfile);
  const [viewMode, setViewMode] = useState<'cast' | 'generating' | 'ready'>(
    initialViewMode
  );

  // Lazily generate any missing guest AI headshots in the background after the page has rendered
  useEffect(() => {
    let cancelled = false;
    const missingAiGuests = initialGuests.filter(
      (g) =>
        !g.isLinked &&
        !g.id.startsWith('random-suspect-') &&
        !String(g.avatar_url || '').includes('aiPhotoUrl=')
    );
    if (missingAiGuests.length === 0) return;

    import('@/app/actions/ai-guests')
      .then(async ({ generateGuestAvatarAction }) => {
        for (const guest of missingAiGuests) {
          if (cancelled) break;
          try {
            const res = await generateGuestAvatarAction(guest.id, guest, {
              isHostProfile: Boolean(guest.isHost),
            });
            if (!cancelled && res?.publicUrl) {
              setGuests((prev) =>
                prev.map((item) =>
                  item.id === guest.id ? { ...item, avatar_url: res.publicUrl } : item
                )
              );
            }
          } catch {
            // ignore background avatar generation errors
          }
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initialGuests]);

  const maxRoles = Math.min(
    characters.length,
    mystery.max_players || characters.length
  );
  // Minimum 5 characters must always be in the mystery so backstories & alibis tangle properly
  const minRoles = Math.min(Math.max(5, mystery.min_players || 5), maxRoles);

  // Play Mode: 'party' (Dinner Party Roleplay — everyone plays a character)
  // vs 'casefile' (Couch Detective / Small Group — investigate all dossiers together)
  const [playMode, setPlayMode] = useState<'party' | 'casefile'>('party');

  // 4-Step Guided Quiz / Wizard State:
  // Step 1: How Are You Playing Tonight? (Dinner Party Roleplay vs Couch Detective / Small Group)
  // Step 2: Select Your Cast (All Real Friends, Hybrid: Friends + Fictional Strangers, or 100% Fictional Mystery Cast)
  // Step 3: Choose The Victim
  // Step 4: Review Spoiler-Free Suspect Lineup & Lock In
  const [castWizardStep, setCastWizardStep] = useState<1 | 2 | 3 | 4>(1);

  // Cast Source:
  // - 'friends': All Real Friends / Created Profiles
  // - 'hybrid': Mix of Selected Friends + Auto-Filled Fictional Mystery Suspects
  // - 'random': 100% Fictional Mystery Cast
  const [casefileCastSource, setCasefileCastSource] = useState<'friends' | 'hybrid' | 'random'>('friends');
  const [randomCastCount, setRandomCastCount] = useState<number>(() =>
    Math.min(maxRoles, Math.max(minRoles, 6))
  );

  // 1. Attending Guests / Selected Profiles (In or Out, minimum 5 characters for the story)
  // Ensure the Host is included at the front by default
  const [attendingGuestIds, setAttendingGuestIds] = useState<string[]>(() => {
    const hostGuest = initialGuests.find(g => g.isHost);
    const preAssignedIds = characters
      .map(c => c.initialGuestId)
      .filter((id): id is string => Boolean(id) && initialGuests.some(g => g.id === id));

    if (preAssignedIds.length >= minRoles) {
      const uniqueAssigned = Array.from(new Set(preAssignedIds));
      if (hostGuest && !uniqueAssigned.includes(hostGuest.id)) {
        return [hostGuest.id, ...uniqueAssigned.slice(0, maxRoles - 1)];
      }
      return uniqueAssigned.slice(0, maxRoles);
    }
    const defaultCount = Math.min(initialGuests.length, Math.max(minRoles, 6), maxRoles);
    return initialGuests.slice(0, defaultCount).map(g => g.id);
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

  // Assignments map: characterId -> guestId (strictly synced with attendingGuestIds)
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    const usedGuests = new Set<string>();
    const attendingSet = new Set(attendingGuestIds);

    // 1. Honor existing assignments that are in attendingGuestIds
    for (const c of characters) {
      if (
        c.initialGuestId &&
        attendingSet.has(c.initialGuestId) &&
        !usedGuests.has(c.initialGuestId)
      ) {
        map[c.id] = c.initialGuestId;
        usedGuests.add(c.initialGuestId);
      }
    }

    // 2. Fill any remaining active characters with unassigned attending guests (such as the Host)
    const remainingAttending = initialGuests.filter(
      g => attendingSet.has(g.id) && !usedGuests.has(g.id)
    );

    if (remainingAttending.length > 0 && victimCharacter) {
      const available = [...remainingAttending];

      if (!map[victimCharacter.id] && available.length > 0) {
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
      }

      const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
      const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);
      const targetSuspectCount = Math.max(
        0,
        Math.min(attendingGuestIds.length - 1, nonVictimCharacters.length)
      );
      const activePool = [...mandatoryPool, ...optionalPool].slice(0, targetSuspectCount);

      for (const char of activePool) {
        if (map[char.id] || available.length === 0) continue;
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

  const selectedRealFriendsCount = useMemo(
    () => attendingGuestIds.filter(id => !id.startsWith('random-suspect-')).length,
    [attendingGuestIds]
  );

  const selectedRandomStrangersCount = useMemo(
    () => attendingGuestIds.filter(id => id.startsWith('random-suspect-')).length,
    [attendingGuestIds]
  );

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

  // Helper that takes a list of selected real friend IDs and auto-fills remaining slots up to targetTotal with gender-matched Random Mystery Characters
  const applyHybridFriendsAndStrangers = (
    friendIdsToKeep: string[],
    targetTotalOverride?: number,
    seedOverride?: number
  ) => {
    if (!victimCharacter) return;
    setLockedSession(null);
    const targetTotal = Math.min(
      maxRoles,
      Math.max(minRoles, targetTotalOverride ?? randomCastCount, friendIdsToKeep.length)
    );
    setRandomCastCount(targetTotal);
    setCasefileCastSource('hybrid');

    const seed = seedOverride ?? shuffleSeed + 3;
    if (seedOverride !== undefined) {
      setShuffleSeed(seed);
    }

    // Ensure random pool is loaded in `guests`
    const currentNonRandom = guests.filter(g => !g.id.startsWith('random-suspect-'));
    const allAvailableGuests = [...currentNonRandom, ...RANDOM_DETECTIVE_SUSPECT_POOL];
    setGuests(allAvailableGuests);

    const selectedFriends = currentNonRandom.filter(g => friendIdsToKeep.includes(g.id));
    const slotsToFillWithStrangers = Math.max(0, targetTotal - selectedFriends.length);

    const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
    const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);
    const targetSuspects = [...mandatoryPool, ...optionalPool].slice(
      0,
      Math.max(0, targetTotal - 1)
    );
    const allActiveChars = [victimCharacter, ...targetSuspects];

    // First assign the selected real friends to gender-matched roles
    const nextMap: Record<string, string> = {};
    const assignedCharIds = new Set<string>();
    const remainingFriends = [...selectedFriends];

    for (const char of allActiveChars) {
      if (remainingFriends.length === 0) break;
      const charGender = normalizeGender(char.gender);
      if (charGender !== 'adaptable') {
        const fIdx = remainingFriends.findIndex(f => normalizeGender(f.gender) === charGender);
        if (fIdx !== -1) {
          nextMap[char.id] = remainingFriends[fIdx].id;
          assignedCharIds.add(char.id);
          remainingFriends.splice(fIdx, 1);
        }
      }
    }
    for (const char of allActiveChars) {
      if (remainingFriends.length === 0) break;
      if (assignedCharIds.has(char.id)) continue;
      nextMap[char.id] = remainingFriends[0].id;
      assignedCharIds.add(char.id);
      remainingFriends.shift();
    }

    // Now fill the remaining unassigned active roles with gender-matched Random Mystery Characters
    const shuffledStrangers = shuffleArray(RANDOM_DETECTIVE_SUSPECT_POOL, seed);
    const usedStrangerIds = new Set<string>();
    const chosenStrangers: GuestItem[] = [];

    for (const char of allActiveChars) {
      if (assignedCharIds.has(char.id)) continue;
      if (chosenStrangers.length >= slotsToFillWithStrangers) break;
      const charGender = normalizeGender(char.gender);
      let candidate = shuffledStrangers.find(
        g =>
          !usedStrangerIds.has(g.id) &&
          (charGender === 'adaptable' || normalizeGender(g.gender) === charGender)
      );
      if (!candidate) {
        candidate = shuffledStrangers.find(g => !usedStrangerIds.has(g.id));
      }
      if (candidate) {
        usedStrangerIds.add(candidate.id);
        chosenStrangers.push(candidate);
        nextMap[char.id] = candidate.id;
        assignedCharIds.add(char.id);
      }
    }

    const nextAttendingIds = [
      ...selectedFriends.map(f => f.id),
      ...chosenStrangers.map(s => s.id),
    ];
    setAttendingGuestIds(nextAttendingIds);
    setAssignments(nextMap);
  };

  // Toggle a guest In or Out
  // In Hybrid Mode, toggling a real friend In/Out automatically adjusts the number of Random Fictional Strangers so the total cast stays at targetTotal!
  const handleToggleGuestAttendance = (guestId: string) => {
    setLockedSession(null);

    if (casefileCastSource === 'hybrid' && !guestId.startsWith('random-suspect-')) {
      const currentFriendIds = attendingGuestIds.filter(id => !id.startsWith('random-suspect-'));
      const isCurrentlyIn = currentFriendIds.includes(guestId);
      let nextFriendIds: string[];
      if (isCurrentlyIn) {
        nextFriendIds = currentFriendIds.filter(id => id !== guestId);
      } else {
        if (currentFriendIds.length >= maxRoles) {
          nextFriendIds = [...currentFriendIds.slice(0, maxRoles - 1), guestId];
        } else {
          nextFriendIds = [...currentFriendIds, guestId];
        }
      }
      applyHybridFriendsAndStrangers(nextFriendIds, randomCastCount, shuffleSeed);
      return;
    }

    setAttendingGuestIds(prev => {
      const isCurrentlyIn = prev.includes(guestId);
      let nextIds: string[];

      if (isCurrentlyIn) {
        nextIds = prev.filter(id => id !== guestId);
      } else {
        if (prev.length >= maxRoles) {
          const hostObj = guests.find(g => g.isHost);
          const removableIds = prev.filter(id => id !== hostObj?.id);
          const idToDrop =
            removableIds.length > 0
              ? removableIds[removableIds.length - 1]
              : prev[prev.length - 1];
          nextIds = [...prev.filter(id => id !== idToDrop), guestId];
        } else {
          nextIds = [...prev, guestId];
        }
      }

      const nextAttendingObjs = guests.filter(g => nextIds.includes(g.id));
      reconcileAssignments(nextAttendingObjs);
      return nextIds;
    });
  };

  // Apply an instant 100% gender-matched Random Mystery Cast
  const handleApplyRandomDetectiveCast = (countOverride?: number, customSeed?: number) => {
    if (!victimCharacter) return;
    setLockedSession(null);
    const targetCount = Math.min(
      maxRoles,
      Math.max(minRoles, countOverride ?? randomCastCount)
    );
    setRandomCastCount(targetCount);
    setCasefileCastSource('random');

    const seed = customSeed ?? shuffleSeed + 7;
    if (customSeed !== undefined) {
      setShuffleSeed(seed);
    }

    const mandatoryPool = nonVictimCharacters.filter(c => c.is_mandatory);
    const optionalPool = nonVictimCharacters.filter(c => !c.is_mandatory);
    const targetSuspects = [...mandatoryPool, ...optionalPool].slice(
      0,
      Math.max(0, targetCount - 1)
    );
    const allActiveChars = [victimCharacter, ...targetSuspects];

    const shuffledPool = shuffleArray(RANDOM_DETECTIVE_SUSPECT_POOL, seed);
    const usedIds = new Set<string>();
    const chosenRandomGuests: GuestItem[] = [];
    const nextMap: Record<string, string> = {};

    for (const char of allActiveChars) {
      const charGender = normalizeGender(char.gender);
      let candidate = shuffledPool.find(
        g =>
          !usedIds.has(g.id) &&
          (charGender === 'adaptable' || normalizeGender(g.gender) === charGender)
      );
      if (!candidate) {
        candidate = shuffledPool.find(g => !usedIds.has(g.id));
      }
      if (candidate) {
        usedIds.add(candidate.id);
        chosenRandomGuests.push(candidate);
        nextMap[char.id] = candidate.id;
      }
    }

    setGuests(prev => {
      const existingNonRandom = prev.filter(g => !g.id.startsWith('random-suspect-'));
      return [...existingNonRandom, ...RANDOM_DETECTIVE_SUSPECT_POOL];
    });

    setAttendingGuestIds(chosenRandomGuests.map(g => g.id));
    setAssignments(nextMap);
  };

  // Switch to Hybrid Mode (defaults to Host + 1–2 friends, and fills the rest with Random Mystery Characters)
  const handleSwitchToHybridCast = () => {
    const friendOnlyGuests = guests.filter(g => !g.id.startsWith('random-suspect-'));
    const currentRealFriends = attendingGuestIds.filter(id => !id.startsWith('random-suspect-'));
    // If they had all 6 friends selected, default hybrid to Host + first friend (2 friends + 4 strangers) so they immediately see the hybrid mix
    let initialHybridFriends = currentRealFriends;
    if (initialHybridFriends.length === 0 || initialHybridFriends.length >= minRoles) {
      initialHybridFriends = friendOnlyGuests
        .slice(0, Math.min(2, friendOnlyGuests.length))
        .map(g => g.id);
    }
    applyHybridFriendsAndStrangers(
      initialHybridFriends,
      Math.min(maxRoles, Math.max(minRoles, 6)),
      shuffleSeed
    );
  };

  // Switch back to 100% the user's own Friends & Created Guest Profiles
  const handleRestoreFriendsCast = () => {
    setLockedSession(null);
    setCasefileCastSource('friends');
    const friendOnlyGuests = guests.filter(g => !g.id.startsWith('random-suspect-'));
    const targetCount = Math.min(friendOnlyGuests.length, Math.max(minRoles, 6), maxRoles);
    const nextIds = friendOnlyGuests.slice(0, targetCount).map(g => g.id);
    setAttendingGuestIds(nextIds);
    reconcileAssignments(friendOnlyGuests.filter(g => nextIds.includes(g.id)));
  };

  // Trigger AI Re-Sort (keeps Victim locked, shuffles and gender-matches all Suspects)
  const handleAiResort = () => {
    setLockedSession(null);
    const nextSeed = shuffleSeed + 1;
    setShuffleSeed(nextSeed);
    if (casefileCastSource === 'random') {
      handleApplyRandomDetectiveCast(randomCastCount, nextSeed);
      return;
    }
    if (casefileCastSource === 'hybrid') {
      const currentFriends = attendingGuestIds.filter(id => !id.startsWith('random-suspect-'));
      applyHybridFriendsAndStrangers(currentFriends, randomCastCount, nextSeed);
      return;
    }
    reconcileAssignments(attendingGuests, nextSeed);
  };

  // Assign a guest to a character (with swap logic if that guest was already assigned elsewhere, and auto-add if they were OUT)
  const commitAssignment = (characterId: string, newGuestId: string) => {
    setLockedSession(null);
    const previousGuestOnTarget = assignments[characterId];

    if (newGuestId && !attendingGuestIds.includes(newGuestId)) {
      setAttendingGuestIds(prev => {
        if (prev.includes(newGuestId)) return prev;
        if (prev.length >= maxRoles) {
          const dropId =
            previousGuestOnTarget && prev.includes(previousGuestOnTarget)
              ? previousGuestOnTarget
              : prev[prev.length - 1];
          return [...prev.filter(id => id !== dropId), newGuestId];
        }
        return [...prev, newGuestId];
      });
    }

    setAssignments(prev => {
      const next = { ...prev };
      const prevGuest = next[characterId];

      const otherCharId = Object.keys(next).find(
        cId => cId !== characterId && next[cId] === newGuestId
      );

      if (!newGuestId) {
        delete next[characterId];
        return next;
      }

      next[characterId] = newGuestId;
      if (otherCharId) {
        if (prevGuest) {
          next[otherCharId] = prevGuest;
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

  // Add a brand new guest or save physical/profile edits to an existing guest on the fly
  const handleSaveNewGuest = async (guestData: any) => {
    const payload = {
      ...guestData,
      avatar_url: guestData.avatarUrl || guestData.avatar_url,
      eye_color: guestData.eyeColor || guestData.eye_color,
    };

    if (editingCastGuest) {
      const res = await updateGuestAction(editingCastGuest.id, payload);
      if (res.guest) {
        const updatedItem: GuestItem = {
          ...editingCastGuest,
          id: res.guest.id,
          name: res.guest.name,
          gender: res.guest.gender || editingCastGuest.gender || 'adaptable',
          accent: guestData.accent || editingCastGuest.accent,
          eye_color: res.guest.eye_color || guestData.eyeColor || editingCastGuest.eye_color,
          height: res.guest.height || guestData.height || editingCastGuest.height,
          avatar_url: res.guest.avatar_url || payload.avatar_url || editingCastGuest.avatar_url,
          traits: res.guest.traits || editingCastGuest.traits || [],
          bio: res.guest.bio || editingCastGuest.bio || '',
        };
        setGuests(prev => prev.map(g => (g.id === editingCastGuest.id ? updatedItem : g)));
      }
      setEditingCastGuest(null);
      return;
    }

    const res = await saveGuestAction(payload);
    if (res.guest) {
      const saved: GuestItem = {
        id: res.guest.id,
        name: res.guest.name,
        gender: res.guest.gender || 'adaptable',
        accent: guestData.accent || 'Australian',
        eye_color: res.guest.eye_color || guestData.eyeColor || '',
        height: res.guest.height || guestData.height || '',
        avatar_url: res.guest.avatar_url || payload.avatar_url || '',
        traits: res.guest.traits || [],
        bio: res.guest.bio || '',
      };
      const hostObj = guests.find(g => g.isHost);
      const nonHostGuests = guests.filter(g => !g.isHost);
      const updatedGuests = hostObj ? [hostObj, saved, ...nonHostGuests] : [saved, ...guests];
      setGuests(updatedGuests);

      if (casefileCastSource === 'hybrid') {
        const currentFriendIds = attendingGuestIds.filter(id => !id.startsWith('random-suspect-'));
        applyHybridFriendsAndStrangers([...currentFriendIds, saved.id], randomCastCount, shuffleSeed);
      } else if (attendingGuestIds.length < maxRoles) {
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
        router.push(`/${locale}/account/orders/${mystery.id}`);
        return;
      }

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

  // Pool of guests shown in Step 3 (Victim) & Step 4 (Suspect swap) dropdowns:
  // Strictly limited to the cast already selected in Step 2 (attendingGuests)
  const dropdownPoolGuests = useMemo(
    () => guests.filter(g => attendingGuestIds.includes(g.id)),
    [guests, attendingGuestIds]
  );

  const goToStep = (step: 1 | 2 | 3 | 4) => {
    setCastWizardStep(step);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl mx-auto">
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
                Follow the 4 quick steps below to set up your cast for <strong>{mystery.title}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-right shadow-sm">
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {tier.toUpperCase()} Package ({PLAYER_TIER_LIMITS[tier].label})
                </span>
                <span className="text-sm font-black text-slate-900">
                  <PriceDisplay tier={tier} locale={locale as Locale} />{' '}
                  <span className="text-xs font-bold text-emerald-600">• {minRoles === maxRoles ? `${maxRoles} Characters` : `${minRoles}–${maxRoles} Characters`}</span>
                </span>
              </div>
            </div>
          </div>

          {/* CLICKABLE 4-STEP QUIZ PROGRESS BAR */}
          <div className="bg-white rounded-3xl border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  step: 1 as const,
                  label: '1. Play Style',
                  sub: playMode === 'party' ? 'Dinner Party' : 'Couch Detective',
                },
                {
                  step: 2 as const,
                  label: '2. Select Cast',
                  sub:
                    casefileCastSource === 'random'
                      ? `${attendingGuestIds.length} Fictional`
                      : casefileCastSource === 'hybrid'
                      ? `${selectedRealFriendsCount} Friends + ${selectedRandomStrangersCount} Random`
                      : `${attendingGuestIds.length} / ${maxRoles} Selected`,
                },
                {
                  step: 3 as const,
                  label: '3. The Victim',
                  sub: victimAssignedGuest?.name || 'Pick Victim',
                },
                {
                  step: 4 as const,
                  label: '4. Review & Pay',
                  sub: `${activeSuspectCharacters.length} Suspects`,
                },
              ].map(item => {
                const isCurrent = castWizardStep === item.step;
                const isCompleted = castWizardStep > item.step;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => goToStep(item.step)}
                    className={`p-3 rounded-2xl text-left transition-all cursor-pointer flex items-center justify-between gap-2 border ${
                      isCurrent
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                        : isCompleted
                        ? 'bg-brand-pink/5 text-slate-900 border-brand-pink/30 hover:bg-brand-pink/10'
                        : 'bg-slate-50 text-slate-500 border-slate-200/70 hover:bg-slate-100'
                    }`}
                  >
                    <div className="min-w-0">
                      <span
                        className={`block text-[10px] font-black uppercase tracking-widest truncate ${
                          isCurrent ? 'text-brand-pink' : isCompleted ? 'text-brand-pink' : 'text-slate-400'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span
                        className={`block text-xs font-bold truncate mt-0.5 ${
                          isCurrent ? 'text-white' : 'text-slate-700'
                        }`}
                      >
                        {item.sub}
                      </span>
                    </div>
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isCurrent
                          ? 'bg-brand-pink text-white'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isCompleted ? '✓' : item.step}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =====================================================================
              STEP 1 OF 4: HOW ARE YOU PLAYING TONIGHT?
          ===================================================================== */}
          {castWizardStep === 1 && (
            <section className="bg-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-slate-800 space-y-8 animate-in fade-in duration-200">
              <div className="space-y-2 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                    Step 1 of 4 • Quick Setup Quiz
                  </span>
                  <span className="px-3.5 py-1 rounded-full bg-white/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-white/10">
                    ✓ {minRoles === maxRoles ? `${maxRoles} Interlocking Characters` : `${minRoles}–${maxRoles} Interlocking Characters`}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  How Are You Playing Tonight?
                </h2>
                <p className="text-sm text-slate-300 font-medium leading-relaxed">
                  To keep the alibis, motives, and red herrings watertight, this mystery features{' '}
                  <strong className="text-white">
                    {minRoles === maxRoles ? `${maxRoles} characters` : `${minRoles} to ${maxRoles} characters`}
                  </strong>{' '}
                  (1 Victim + {minRoles - 1} Suspects). Choose how your group is playing:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* OPTION A: DINNER PARTY ROLEPLAY */}
                <button
                  type="button"
                  onClick={() => {
                    setPlayMode('party');
                  }}
                  className={`p-6 sm:p-7 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-5 ${
                    playMode === 'party'
                      ? 'border-brand-pink bg-brand-pink/15 shadow-xl'
                      : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-12 h-12 rounded-2xl bg-brand-pink/20 border border-brand-pink/40 flex items-center justify-center text-2xl">
                        🎭
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          playMode === 'party'
                            ? 'bg-brand-pink text-white'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {playMode === 'party' ? '✓ Selected' : `${minRoles === maxRoles ? `${maxRoles} Players` : `${minRoles}–${maxRoles} Players`}`}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Dinner Party Roleplay ({minRoles === maxRoles ? `${maxRoles}` : `${minRoles}–${maxRoles}`} Players)
                      </h3>
                      <p className="text-xs font-bold text-brand-pink uppercase tracking-wider mt-0.5">
                        Everyone Plays a Character Around the Table
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Hosting a party with {minRoles === maxRoles ? `${maxRoles}` : `${minRoles}–${maxRoles}`} people? Each guest gets their own custom character booklet, outfit guide, and secret alibi to act out across 3 rounds.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-white">
                    <span>Best for Birthdays, Dinner Parties &amp; Hosting</span>
                    <span className="text-brand-pink">→</span>
                  </div>
                </button>

                {/* OPTION B: COUCH DETECTIVE / SMALL GROUP */}
                <button
                  type="button"
                  onClick={() => {
                    setPlayMode('casefile');
                  }}
                  className={`p-6 sm:p-7 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-5 ${
                    playMode === 'casefile'
                      ? 'border-brand-pink bg-brand-pink/15 shadow-xl'
                      : 'border-white/15 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl">
                        🕵️‍♀️
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          playMode === 'casefile'
                            ? 'bg-brand-pink text-white'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {playMode === 'casefile' ? '✓ Selected' : `1–${Math.max(4, minRoles - 1)} Players`}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg sm:text-xl font-black text-white">
                        Couch Detective / Case-File Mode (1–{Math.max(4, minRoles - 1)} Players)
                      </h3>
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mt-0.5">
                        Solo, Date Night, or Small Group — No Acting Required!
                      </p>
                    </div>

                    <p className="text-xs text-slate-300 font-medium leading-relaxed">
                      Have fewer than {minRoles} people (or prefer solving without acting)? Cast your friends, a <strong>Hybrid mix of you + random suspects</strong>, or <strong>100% fictional characters</strong>, and inspect all {minRoles} dossiers &amp; clues together like a cold-case detective box!
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-white">
                    <span>Best for Solo, Couples &amp; Casual Game Nights</span>
                    <span className="text-emerald-400">→</span>
                  </div>
                </button>
              </div>

              {/* EXTRA GUEST DETECTIVES CALLOUT */}
              <div className="p-4 sm:p-5 rounded-3xl bg-sky-500/10 border border-sky-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 block">
                    🕵️ Have More Than {maxRoles} Guests Coming (or Last-Minute Plus-Ones)?
                  </span>
                  <p className="text-xs text-slate-200 font-medium leading-relaxed">
                    Everyone can play! You only need to cast the <strong className="text-white">{maxRoles} core character roles</strong> here — any extra friends can join the live Game PIN on party night as <strong className="text-sky-300">&ldquo;Detective [Their Name]&rdquo;</strong> at $0 extra, complete with an official Detective Briefing, suspect interrogation prompts, live clues, and round voting!
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-xl bg-sky-400/15 border border-sky-400/30 text-sky-300 text-[10px] font-black uppercase tracking-widest shrink-0 self-start sm:self-center">
                  + Unlimited Extra Detectives
                </span>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  Next: Choose Who Stars in Your Mystery →
                </button>
              </div>
            </section>
          )}

          {/* =====================================================================
              STEP 2 OF 4: WHO SHOULD STAR AS THE CHARACTERS? (FRIENDS / HYBRID / RANDOM)
          ===================================================================== */}
          {castWizardStep === 2 && (
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm space-y-7 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                    Step 2 of 4 • Cast Your {minRoles === maxRoles ? `${maxRoles}` : `${minRoles}–${maxRoles}`} Characters
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                    Who Should Star in Tonight&apos;s Mystery?
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Choose whether to cast <strong>All Real Friends</strong>, a <strong>Hybrid Mix (Friends + Fictional Strangers)</strong>, or a <strong>100% Fictional Mystery Cast</strong>.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition-colors self-start sm:self-auto shrink-0 cursor-pointer"
                >
                  ← Back to Play Style
                </button>
              </div>

              {/* 3 CASTING SOURCE TABS: ALL FRIENDS vs HYBRID vs 100% RANDOM */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* 1. ALL REAL FRIENDS */}
                <button
                  type="button"
                  onClick={handleRestoreFriendsCast}
                  className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    casefileCastSource === 'friends'
                      ? 'border-brand-pink bg-brand-pink/5 shadow-md'
                      : 'border-slate-200 bg-slate-50/60 hover:border-brand-pink/40 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-10 h-10 rounded-xl bg-brand-pink/15 text-brand-pink flex items-center justify-center text-lg">
                        👥
                      </span>
                      {casefileCastSource === 'friends' && (
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                          Active
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      1. All Friend Profiles ({minRoles === maxRoles ? `${maxRoles} Roles` : `${minRoles}–${maxRoles} Roles`})
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Cast real friends &amp; family into every role. Tap <strong>+ Add Friend Profile</strong> below to create profiles for anyone attending!
                    </p>
                  </div>
                </button>

                {/* 2. HYBRID (FRIENDS + RANDOM STRANGERS) */}
                <button
                  type="button"
                  onClick={handleSwitchToHybridCast}
                  className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    casefileCastSource === 'hybrid'
                      ? 'border-brand-pink bg-brand-pink/5 shadow-md'
                      : 'border-slate-200 bg-slate-50/60 hover:border-brand-pink/40 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg">
                        ✨
                      </span>
                      {casefileCastSource === 'hybrid' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-widest">
                          Great for 2–5 Players
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      2. Hybrid: Friends + Strangers
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Select just yourselves or a few friends (e.g. 2–4 people) and we&apos;ll <strong>auto-fill the remaining slots</strong> with fictional Mystery Suspects!
                    </p>
                  </div>
                </button>

                {/* 3. 100% RANDOM MYSTERY CAST */}
                <button
                  type="button"
                  onClick={() => handleApplyRandomDetectiveCast(randomCastCount)}
                  className={`p-5 rounded-3xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    casefileCastSource === 'random'
                      ? 'border-brand-pink bg-brand-pink/5 shadow-md'
                      : 'border-slate-200 bg-slate-50/60 hover:border-brand-pink/40 hover:bg-white'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg">
                        🎲
                      </span>
                      {casefileCastSource === 'random' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase tracking-widest">
                          Instant Setup
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
                      3. 100% Fictional Mystery Cast
                    </h3>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      Zero profile setup! Instantly populate all {minRoles} roles with ready-made fictional suspects, studio portraits &amp; voice accents.
                    </p>
                  </div>
                </button>
              </div>

              {/* STATUS & ACTION BAR FOR CURRENT CAST SOURCE */}
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                      {attendingGuestIds.length} / {maxRoles} Total Characters Active
                    </span>
                    {casefileCastSource === 'hybrid' && (
                      <span className="px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
                        👥 {selectedRealFriendsCount} Real Friends + 🎲 {selectedRandomStrangersCount} Fictional Suspects
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-medium">
                    {casefileCastSource === 'random'
                      ? 'Tap "🎲 Shuffle Fictional Suspects" to deal a fresh lineup of characters, or tap any suspect card below.'
                      : casefileCastSource === 'hybrid'
                      ? 'Tap your real friends below to toggle them IN or OUT — we automatically fill the remaining slots with Fictional Mystery Suspects!'
                      : `Tap friends below to mark them IN or OUT (minimum ${minRoles} required). Need more people? Click "+ Add Friend Profile" or switch to Hybrid Mode!`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {(casefileCastSource === 'random' || casefileCastSource === 'hybrid') && (
                    <button
                      type="button"
                      onClick={() => {
                        if (casefileCastSource === 'random') {
                          handleApplyRandomDetectiveCast(randomCastCount, shuffleSeed + 1);
                        } else {
                          const currentFriends = attendingGuestIds.filter(
                            id => !id.startsWith('random-suspect-')
                          );
                          applyHybridFriendsAndStrangers(
                            currentFriends,
                            randomCastCount,
                            shuffleSeed + 1
                          );
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <span>🎲</span> Shuffle Fictional Suspects
                    </button>
                  )}

                  {casefileCastSource !== 'random' && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsHostProfileModalOpen(true)}
                        className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                      >
                        👑 Edit Host
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCastGuest(null);
                          setIsGuestModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer shadow-md"
                      >
                        + Add Friend Profile
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* IF FEWER THAN MIN ROLES IN FRIENDS MODE, OFFER 1-CLICK HYBRID TOP-UP */}
              {attendingGuestIds.length < minRoles && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs font-bold text-amber-900 leading-relaxed">
                    ⚠️ You currently have <strong>{attendingGuestIds.length} of {minRoles} required characters</strong> selected. Select {minRoles - attendingGuestIds.length} more friend profile(s) below, or click <strong>✨ Auto-Fill Remaining {minRoles - attendingGuestIds.length} Slots with Fictional Suspects</strong>!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      const currentFriends = attendingGuestIds.filter(
                        id => !id.startsWith('random-suspect-')
                      );
                      applyHybridFriendsAndStrangers(
                        currentFriends,
                        Math.min(maxRoles, Math.max(minRoles, 6)),
                        shuffleSeed
                      );
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors shrink-0 cursor-pointer shadow-sm"
                  >
                    ✨ Auto-Fill {minRoles - attendingGuestIds.length} Random Suspects
                  </button>
                </div>
              )}

              {/* GUEST & SUSPECT SELECTION GRID (3 Columns on Desktop for Spacious Name Display) */}
              {casefileCastSource === 'hybrid' ? (
                <div className="space-y-6">
                  {/* SUB-SECTION A: YOUR REAL FRIENDS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                        👥 Your Real Friends &amp; Profiles ({selectedRealFriendsCount} Selected — Tap to Toggle In/Out)
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {guests
                        .filter(g => !g.id.startsWith('random-suspect-'))
                        .map(guest => {
                          const isIn = attendingGuestIds.includes(guest.id);
                          const gBadge = formatGenderLabel(guest.gender);
                          const guestAvatar = resolveDisplayAvatarUrl(guest.avatar_url);

                          return (
                            <div
                              key={guest.id}
                              onClick={() => handleToggleGuestAttendance(guest.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={e => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleToggleGuestAttendance(guest.id);
                                }
                              }}
                              className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                                isIn
                                  ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                                  : 'border-slate-200 hover:border-brand-pink/50 bg-white'
                              }`}
                            >
                              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center border border-slate-200 shadow-sm">
                                {guestAvatar ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={guestAvatar}
                                    alt={guest.name}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <span className="text-2xl">{guest.isHost ? '👑' : '👤'}</span>
                                )}
                              </div>
                              <div className="min-w-0 flex-grow space-y-1">
                                <p className="text-sm font-black text-slate-900 truncate leading-tight">
                                  {guest.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {guest.isHost && (
                                    <span className="px-1.5 py-0.5 rounded bg-brand-pink/15 text-brand-pink text-[9px] font-black uppercase tracking-wider shrink-0">
                                      You
                                    </span>
                                  )}
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {gBadge.shortLabel}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                                  isIn
                                    ? 'bg-brand-pink text-white'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {isIn ? 'IN' : 'OUT'}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  {/* SUB-SECTION B: AUTO-FILLED FICTIONAL MYSTERY SUSPECTS */}
                  {selectedRandomStrangersCount > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-700">
                          🎲 Auto-Filled Fictional Mystery Suspects ({selectedRandomStrangersCount} Slots Filled)
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            const currentFriends = attendingGuestIds.filter(
                              id => !id.startsWith('random-suspect-')
                            );
                            applyHybridFriendsAndStrangers(
                              currentFriends,
                              randomCastCount,
                              shuffleSeed + 1
                            );
                          }}
                          className="text-[11px] font-black uppercase tracking-widest text-brand-pink hover:underline cursor-pointer"
                        >
                          🎲 Swap Fictional Strangers
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {guests
                          .filter(
                            g =>
                              g.id.startsWith('random-suspect-') &&
                              attendingGuestIds.includes(g.id)
                          )
                          .map(stranger => {
                            const gBadge = formatGenderLabel(stranger.gender);
                            const strangerAvatar = resolveDisplayAvatarUrl(stranger.avatar_url);
                            return (
                              <div
                                key={stranger.id}
                                className="p-4 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/30 flex items-center gap-3.5 shadow-sm"
                              >
                                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center border border-emerald-200 shadow-sm">
                                  {strangerAvatar ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={strangerAvatar}
                                      alt={stranger.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  ) : (
                                    <span className="text-2xl">🕵️</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-grow space-y-1">
                                  <p className="text-sm font-black text-slate-900 truncate leading-tight">
                                    {stranger.name}
                                  </p>
                                  <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                    {gBadge.shortLabel}
                                    {stranger.accent ? ` • ${stranger.accent}` : ''}
                                  </p>
                                </div>
                                <span className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest shrink-0">
                                  NPC
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guests
                    .filter(g =>
                      casefileCastSource === 'random'
                        ? g.id.startsWith('random-suspect-') && attendingGuestIds.includes(g.id)
                        : !g.id.startsWith('random-suspect-')
                    )
                    .map(guest => {
                      const isIn = attendingGuestIds.includes(guest.id);
                      const gBadge = formatGenderLabel(guest.gender);
                      const guestAvatar = resolveDisplayAvatarUrl(guest.avatar_url);
                      const isRandomSuspect = guest.id.startsWith('random-suspect-');

                      return (
                        <div
                          key={guest.id}
                          onClick={() => handleToggleGuestAttendance(guest.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleToggleGuestAttendance(guest.id);
                            }
                          }}
                          className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3.5 cursor-pointer ${
                            isIn
                              ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                              : 'border-slate-200 hover:border-brand-pink/50 bg-white'
                          }`}
                        >
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center border border-slate-200 shadow-sm">
                            {guestAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={guestAvatar}
                                alt={guest.name}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <span className="text-2xl">{guest.isHost ? '👑' : '👤'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-grow space-y-1">
                            <p className="text-sm font-black text-slate-900 truncate leading-tight">
                              {guest.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {guest.isHost && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-pink/15 text-brand-pink text-[8px] font-black uppercase tracking-wider shrink-0">
                                  Host
                                </span>
                              )}
                              {isRandomSuspect && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase tracking-wider shrink-0">
                                  Fictional
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {gBadge.shortLabel}
                                {guest.accent ? ` • ${guest.accent}` : ''}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!isRandomSuspect && !guest.isLinked && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  if (guest.isHost) {
                                    setIsHostProfileModalOpen(true);
                                  } else {
                                    setEditingCastGuest(guest);
                                    setIsGuestModalOpen(true);
                                  }
                                }}
                                title={`Edit ${guest.name}`}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-brand-pink/15 text-slate-500 hover:text-brand-pink flex items-center justify-center text-xs transition-colors cursor-pointer"
                              >
                                ✎
                              </button>
                            )}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0 ${
                                isIn
                                  ? 'bg-brand-pink text-white'
                                  : 'bg-slate-100 text-slate-500 hover:bg-brand-pink/10 hover:text-brand-pink'
                              }`}
                            >
                              {isIn ? 'IN' : 'OUT'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* STEP 2 FOOTER NAVIGATION */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={attendingGuestIds.length < minRoles}
                  onClick={() => goToStep(3)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 disabled:opacity-50 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  Next: Choose Your Victim ({attendingGuestIds.length} Cast Selected) →
                </button>
              </div>
            </section>
          )}

          {/* =====================================================================
              STEP 3 OF 4: CHOOSE THE VICTIM
          ===================================================================== */}
          {castWizardStep === 3 && victimCharacter && (
            <section className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-white/10 relative overflow-hidden space-y-8 animate-in fade-in duration-200">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                <div className="space-y-4 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                      Step 3 of 4 • 💀 Choose The Victim
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
                        {victimAssignedGuest &&
                        normalizeGender(victimAssignedGuest.gender) === 'female' &&
                        victimCharacter.outfitFeminine
                          ? victimCharacter.outfitFeminine
                          : victimAssignedGuest &&
                            normalizeGender(victimAssignedGuest.gender) === 'male' &&
                            victimCharacter.outfitMasculine
                          ? victimCharacter.outfitMasculine
                          : victimCharacter.outfitAdvice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Victim Guest Selector Card */}
                <div className="bg-white/5 border border-white/15 rounded-3xl p-6 w-full lg:w-96 shrink-0 space-y-4 backdrop-blur-md">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    Who is getting murdered tonight?
                  </label>

                  {victimAssignedGuest && (
                    <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-white/10 border border-white/10">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center border border-white/15 shadow-lg">
                        {resolveDisplayAvatarUrl(victimAssignedGuest.avatar_url) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={resolveDisplayAvatarUrl(victimAssignedGuest.avatar_url)}
                            alt={victimAssignedGuest.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-3xl">💀</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-black text-white truncate">
                          {victimAssignedGuest.name}
                        </p>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300 mt-0.5">
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
                    {dropdownPoolGuests.map(g => {
                      const gNorm = normalizeGender(g.gender);
                      const vNorm = normalizeGender(victimCharacter.gender);
                      const isMismatch =
                        (vNorm === 'male' || vNorm === 'female') && gNorm !== vNorm;
                      const isRand = g.id.startsWith('random-suspect-');
                      return (
                        <option key={g.id} value={g.id}>
                          {g.isHost
                            ? `👑 ${g.name} (Host - You)`
                            : isRand
                            ? `🎲 ${g.name} (Fictional Suspect)`
                            : g.name}{' '}
                          ({formatGenderLabel(g.gender).shortLabel}
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

              <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                >
                  ← Back to Select Cast
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-white transition-all shadow-xl active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
                    boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
                  }}
                >
                  Next: Review {activeSuspectCharacters.length} Suspects &amp; Lock In →
                </button>
              </div>
            </section>
          )}

          {/* =====================================================================
              STEP 4 OF 4: SPOILER-FREE SUSPECT LINEUP & LOCK IN
          ===================================================================== */}
          {castWizardStep === 4 && (
            <section className="bg-white rounded-[2.5rem] border border-slate-100 p-8 sm:p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      Step 4 of 4 • Blind Suspect Casting
                    </span>
                    {victimAssignedGuest && victimCharacter && (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider">
                        💀 Victim: {victimAssignedGuest.name} ({victimCharacter.roleTitle})
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Tonight&apos;s Suspect Lineup ({activeSuspectCharacters.length} Suspects)
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Roles are secretly mixed below so you have <strong>zero spoilers</strong> about who the killer is. Hit <strong>AI Re-Sort</strong> or swap anyone freely before locking in!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    ← Change Victim
                  </button>
                  <button
                    type="button"
                    onClick={handleAiResort}
                    className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0 cursor-pointer"
                  >
                    <span>⚡</span> AI Re-Sort Suspects
                  </button>
                </div>
              </div>

              {activeSuspectCharacters.length < minRoles - 1 ? (
                <div className="p-12 text-center text-slate-500 font-bold text-sm border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
                  <p className="text-slate-900 font-black text-base">
                    You need at least {minRoles} characters in Step 2 to build your suspect lineup!
                  </p>
                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="px-6 py-3 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-widest cursor-pointer"
                  >
                    ← Go to Step 2: Select Cast
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {activeSuspectCharacters.map(char => {
                    const assignedGuestId = assignments[char.id] || '';
                    const assignedGuest = guests.find(g => g.id === assignedGuestId);
                    const genderBadge = formatGenderLabel(char.gender);
                    const guestNormGender = assignedGuest
                      ? normalizeGender(assignedGuest.gender)
                      : 'adaptable';
                    const resolvedOutfit =
                      guestNormGender === 'female' && char.outfitFeminine
                        ? char.outfitFeminine
                        : guestNormGender === 'male' && char.outfitMasculine
                        ? char.outfitMasculine
                        : char.outfitAdvice;
                    const suspectPhotoUrl = resolveDisplayAvatarUrl(
                      assignedGuest?.avatar_url || char.characterPhotoUrl || undefined
                    );
                    const isRandomSuspect = assignedGuest?.id.startsWith('random-suspect-');

                    return (
                      <div
                        key={char.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50/50 hover:bg-white overflow-hidden flex flex-col justify-between transition-all hover:shadow-md"
                      >
                        {/* Large Suspect / Assigned Guest Portrait Header */}
                        <div className="relative w-full aspect-[4/5] sm:aspect-auto sm:h-80 bg-slate-900 overflow-hidden border-b border-slate-200">
                          {suspectPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={suspectPhotoUrl}
                              alt={assignedGuest?.name || char.roleTitle}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl text-white">
                              🕵️
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent pointer-events-none" />

                          {/* Top Spoiler-Free Badges */}
                          <div className="absolute top-3.5 sm:top-4 inset-x-3.5 sm:inset-x-4 flex items-center justify-between gap-2 z-10">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900/90 text-white border border-white/15 backdrop-blur-md shrink-0">
                                🕵️ Suspect
                              </span>
                              {assignedGuest && (
                                <span
                                  className={`px-2.5 sm:px-3 py-1 rounded-full text-xs font-black text-white shadow-md truncate max-w-[160px] sm:max-w-[210px] ${
                                    isRandomSuspect ? 'bg-emerald-600' : 'bg-brand-pink'
                                  }`}
                                >
                                  {assignedGuest.isHost
                                    ? '👑'
                                    : isRandomSuspect
                                    ? '🎲'
                                    : '👤'}{' '}
                                  {assignedGuest.name}
                                </span>
                              )}
                            </div>
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm shrink-0 ${genderBadge.badgeClass}`}
                            >
                              {genderBadge.label}
                            </span>
                          </div>

                          {/* Role Title */}
                          <div className="absolute bottom-3.5 inset-x-4 sm:inset-x-5 z-10">
                            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                              {char.roleTitle}
                            </h3>
                          </div>
                        </div>

                        <div className="p-4 sm:p-6 flex flex-col justify-between flex-grow gap-4">
                          <div className="space-y-4">
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
                            <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1.5">
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
                              Assigned Suspect (Select to Swap)
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center border border-slate-300">
                                {resolveDisplayAvatarUrl(assignedGuest?.avatar_url) ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={resolveDisplayAvatarUrl(assignedGuest?.avatar_url)}
                                    alt={assignedGuest?.name || 'Guest'}
                                    className="w-full h-full object-cover object-top"
                                  />
                                ) : (
                                  <span className="text-base">👤</span>
                                )}
                              </div>
                              <CustomSelect
                                value={assignedGuestId}
                                onChange={e => commitAssignment(char.id, e.target.value)}
                                variant="light"
                                className="flex-grow min-w-0 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-slate-900 hover:border-slate-300 focus:outline-none focus:border-brand-pink cursor-pointer"
                              >
                                <option value="">Unassigned</option>
                                {dropdownPoolGuests.map(g => {
                                  const isRand = g.id.startsWith('random-suspect-');
                                  return (
                                    <option key={g.id} value={g.id}>
                                      {g.isHost
                                        ? `👑 ${g.name} (Host - You)`
                                        : isRand
                                        ? `🎲 ${g.name} (Fictional Suspect)`
                                        : g.name}{' '}
                                      ({formatGenderLabel(g.gender).shortLabel})
                                    </option>
                                  );
                                })}
                              </CustomSelect>
                            </div>
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

              {/* Peace-of-Mind QA Guarantee Banner */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm">
                    🛡️
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-emerald-900">
                      100% QA-Tested Before It Reaches You
                    </p>
                    <p className="text-xs text-emerald-800/90 font-medium leading-relaxed mt-0.5">
                      Every character portrait, crime-scene photo, and voice memo is automatically QA-inspected for accuracy before we email you that your mystery pack is ready.
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-white text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest shrink-0 self-start sm:self-center">
                  ✓ Verified Delivery
                </span>
              </div>

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
                      flat). Once unlocked, we&apos;ll tailor your mystery package and email you as soon as it&apos;s ready in <strong>My Mysteries (Stories)</strong>!
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
          )}
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

      {/* INLINE HOST PROFILE VIEWER & EDITOR MODAL */}
      {isHostProfileModalOpen && (
        <ProfileClient
          user={{
            name: guests.find(g => g.isHost)?.name || hostUser.name || 'Gabriella Blyth',
            email: hostUser.email || customerEmail || '',
          }}
          profile={liveHostProfile}
          onClose={() => setIsHostProfileModalOpen(false)}
          onSaved={updated => {
            setLiveHostProfile((prev: any) => ({ ...(prev || {}), ...updated }));
            setGuests(prev =>
              prev.map(g => {
                if (!g.isHost) return g;
                const nextGender = updated.pronouns?.toLowerCase().includes('she')
                  ? 'female'
                  : updated.pronouns?.toLowerCase().includes('he')
                  ? 'male'
                  : g.gender;
                return {
                  ...g,
                  name: updated.full_name || g.name,
                  gender: nextGender,
                  bio: updated.bio,
                  traits: updated.character_preferences || g.traits,
                  accent: updated.avatar_config?.accent || g.accent,
                  avatar_url:
                    updated.avatar_url ||
                    buildAvatarUrl(updated.avatar_config, updated.full_name || g.name),
                };
              })
            );
          }}
        />
      )}

      <GuestModal
        isOpen={isGuestModalOpen}
        onClose={() => {
          setIsGuestModalOpen(false);
          setEditingCastGuest(null);
        }}
        onSave={handleSaveNewGuest}
        initialData={editingCastGuest}
      />
    </div>
  );
}
