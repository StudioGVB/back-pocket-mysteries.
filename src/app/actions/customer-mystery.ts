'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';
import {
  getCharacterDisplayName,
  getCharacterRoleTitle,
  hydrateTextWithCharacters,
  adaptOutfitForGuestGender,
  adaptBioForGuestGender,
  adaptOutfitReferenceImagesForGuestGender,
} from '@/utils/hydration';
import { getMysteryById, normalizePlotBeats } from '@/services/mysteries';
import {
  cacheMysterySnapshot,
  getCachedMysterySnapshot,
  getAllCachedMysteries,
  getStoredGameSession,
  saveStoredGameSession,
  updateCachedMysteryCharacters,
  StoredGuestReview,
  StoredDetectiveGuest,
  StoredPartyEventDetails,
  StoredPendingHostTransfer,
  LIVE_CARRIER_CLUE_TITLE,
  isLiveCarrierClue,
  syncLiveStateToSupabaseClueCarrier,
  loadLiveStateFromSupabaseClueCarrier,
} from '@/lib/live-session-store';
import {
  checkAndFinalizeGenerationIfDue,
  finalizeMysteryGenerationNow,
  advanceMysteryGenerationOneStep,
} from '@/lib/background-mystery-generator';
import { pregenerateAllAudioCluesForMystery } from '@/app/actions/audio-generator';
import { isUserAdmin } from '@/utils/admin-auth';
import { sendHostOwnershipTransferInviteEmail } from '@/utils/purchase-notifications';
import crypto from 'crypto';

export interface RoundSubmission {
  id: string;
  round: number;
  voterCharId: string;
  voterName: string;
  suspectCharId: string;
  suspectName: string;
  reason: string;
  submittedAt: string;
  clueTags?: Record<string, 'key' | 'red_herring' | 'alibi'>;
}

export type GuestReviewItem = StoredGuestReview;
export type DetectiveGuestItem = StoredDetectiveGuest;
export type PartyEventDetails = StoredPartyEventDetails;

export interface GameSessionMeta {
  pin: string;
  hostUserId?: string;
  currentRound?: number;
  activeCharacterIds: string[];
  claimedCharacters: Record<string, { token: string; claimedAt: string }>;
  detectiveGuests?: DetectiveGuestItem[];
  partyDetails?: PartyEventDetails;
  prepConfirmedCharacters?: Record<string, { confirmedAt: string; guestName?: string }>;
  submissions: RoundSubmission[];
  sharedTheoryRounds: number[];
  revealMode: 'hidden' | 'phone_free' | 'shared_with_guests';
  reviews: GuestReviewItem[];
  updatedAt: string;
}

/**
 * Generates a deterministic 6-digit numeric PIN from a mystery UUID
 * so every mystery always has a Kahoot-style join code even before saving.
 */
export async function generatePinFromMysteryId(mysteryId: string): Promise<string> {
  const clean = (mysteryId || '').replace(/[^a-fA-F0-9]/g, '');
  if (!clean) return '482910';
  let hash = 0;
  for (let i = 0; i < clean.length; i++) {
    hash = (hash * 31 + clean.charCodeAt(i)) % 900000;
  }
  const pinNum = 100000 + Math.abs(hash % 900000);
  return String(pinNum);
}

/**
 * Merges submissions from DB and local live session store, keeping the newest entry per (round, voterCharId).
 */
function mergeSubmissions(a: RoundSubmission[] = [], b: RoundSubmission[] = []): RoundSubmission[] {
  const map = new Map<string, RoundSubmission>();
  for (const item of [...a, ...b]) {
    if (!item || !item.voterCharId || !item.round) continue;
    const key = `${item.round}::${item.voterCharId}`;
    const existing = map.get(key);
    if (!existing || (item.submittedAt || '') >= (existing.submittedAt || '')) {
      map.set(key, item);
    }
  }
  return Array.from(map.values()).sort((x, y) =>
    (x.submittedAt || '').localeCompare(y.submittedAt || '')
  );
}

function mergeReviews(a: GuestReviewItem[] = [], b: GuestReviewItem[] = []): GuestReviewItem[] {
  const map = new Map<string, GuestReviewItem>();
  for (const r of [...a, ...b]) {
    if (!r || !r.id) continue;
    map.set(r.id, r);
  }
  return Array.from(map.values()).sort((x, y) =>
    (y.createdAt || '').localeCompare(x.createdAt || '')
  );
}

function mergeDetectiveGuests(
  a: DetectiveGuestItem[] = [],
  b: DetectiveGuestItem[] = []
): DetectiveGuestItem[] {
  const map = new Map<string, DetectiveGuestItem>();
  for (const d of [...a, ...b]) {
    if (!d || !d.id) continue;
    map.set(d.id, d);
  }
  return Array.from(map.values()).sort((x, y) =>
    (x.joinedAt || '').localeCompare(y.joinedAt || '')
  );
}

/**
 * Helper to read and merge GameSessionMeta from both Supabase character JSONB and the server-side live session store.
 */
async function readSessionFromCharacters(
  characters: any[],
  mysteryId: string,
  dbCurrentRound?: number | null
): Promise<{
  session: GameSessionMeta;
  carrierCharacter: any | null;
}> {
  const defaultPin = await generatePinFromMysteryId(mysteryId);
  const sorted = [...(characters || [])].sort((a, b) => {
    if (a.is_victim !== b.is_victim) return a.is_victim ? -1 : 1;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });

  const carrier = sorted.find(c => c.profile_data?.__game_session) || sorted[0] || null;
  const raw = carrier?.profile_data?.__game_session as Partial<GameSessionMeta> | undefined;
  const stored = getStoredGameSession(mysteryId);

  const activeFromFlags = sorted
    .filter(c => c.profile_data?.is_active_in_session !== false)
    .map(c => c.id);

  // Determine which metadata snapshot is fresher for host-controlled flags
  const rawTime = raw?.updatedAt || '';
  const storedTime = stored?.updatedAt || '';
  const preferStored = Boolean(stored && storedTime >= rawTime);

  const resolvedRound = preferStored
    ? stored?.currentRound ?? raw?.currentRound ?? dbCurrentRound ?? 0
    : raw?.currentRound ?? stored?.currentRound ?? dbCurrentRound ?? 0;

  const mergedClaims: Record<string, { token: string; claimedAt: string }> = preferStored
    ? { ...(raw?.claimedCharacters || {}), ...(stored?.claimedCharacters || {}) }
    : { ...(stored?.claimedCharacters || {}), ...(raw?.claimedCharacters || {}) };

  const mergedDetectives = preferStored
    ? mergeDetectiveGuests(raw?.detectiveGuests || [], stored?.detectiveGuests || [])
    : mergeDetectiveGuests(stored?.detectiveGuests || [], raw?.detectiveGuests || []);

  const baseTemplateId = mysteryId.includes('__u_') ? mysteryId.split('__u_')[0] : null;
  const baseStoredParty = baseTemplateId
    ? getStoredGameSession(baseTemplateId)?.partyDetails
    : undefined;
  const rawPartyTime = raw?.partyDetails?.updatedAt || '';
  const storedPartyTime = stored?.partyDetails?.updatedAt || '';
  const mergedPartyDetails: PartyEventDetails | undefined =
    (storedPartyTime >= rawPartyTime
      ? stored?.partyDetails || raw?.partyDetails
      : raw?.partyDetails || stored?.partyDetails) || baseStoredParty;

  const mergedPrepConfirmed: Record<string, { confirmedAt: string; guestName?: string }> =
    preferStored
      ? { ...(raw?.prepConfirmedCharacters || {}), ...(stored?.prepConfirmedCharacters || {}) }
      : { ...(stored?.prepConfirmedCharacters || {}), ...(raw?.prepConfirmedCharacters || {}) };

  const session: GameSessionMeta = {
    pin: stored?.pin || raw?.pin || defaultPin,
    hostUserId: stored?.hostUserId || raw?.hostUserId || stored?.paidByUserId,
    currentRound: resolvedRound,
    activeCharacterIds:
      preferStored && Array.isArray(stored?.activeCharacterIds) && stored!.activeCharacterIds.length > 0
        ? stored!.activeCharacterIds
        : Array.isArray(raw?.activeCharacterIds) && raw!.activeCharacterIds.length > 0
        ? raw!.activeCharacterIds
        : activeFromFlags,
    claimedCharacters: mergedClaims,
    detectiveGuests: mergedDetectives,
    partyDetails: mergedPartyDetails,
    prepConfirmedCharacters: mergedPrepConfirmed,
    submissions: mergeSubmissions(raw?.submissions || [], stored?.submissions || []),
    sharedTheoryRounds: preferStored
      ? stored?.sharedTheoryRounds || []
      : Array.isArray(raw?.sharedTheoryRounds)
      ? raw!.sharedTheoryRounds
      : stored?.sharedTheoryRounds || [],
    revealMode: (preferStored ? stored?.revealMode : raw?.revealMode || stored?.revealMode) || 'hidden',
    reviews: mergeReviews(raw?.reviews || [], stored?.reviews || []),
    updatedAt: preferStored ? storedTime : rawTime || new Date().toISOString(),
  };

  // Keep server store synchronized
  saveStoredGameSession(mysteryId, {
    mysteryId,
    hostUserId: session.hostUserId,
    pin: session.pin,
    currentRound: resolvedRound,
    activeCharacterIds: session.activeCharacterIds,
    claimedCharacters: session.claimedCharacters,
    detectiveGuests: session.detectiveGuests || [],
    partyDetails: session.partyDetails,
    prepConfirmedCharacters: session.prepConfirmedCharacters || {},
    submissions: session.submissions,
    sharedTheoryRounds: session.sharedTheoryRounds,
    revealMode: session.revealMode,
    reviews: session.reviews,
    updatedAt: session.updatedAt,
  });

  return { session, carrierCharacter: carrier };
}

async function writeSessionToCarrier(
  supabase: any,
  mysteryId: string,
  carrierCharacter: any | null,
  session: GameSessionMeta
) {
  const now = new Date().toISOString();
  const updatedSession: GameSessionMeta = {
    ...session,
    updatedAt: now,
  };

  // 1. Always persist to server-side live session store (works for unauthenticated guests too)
  saveStoredGameSession(mysteryId, {
    mysteryId,
    hostUserId: updatedSession.hostUserId,
    pin: updatedSession.pin,
    currentRound: updatedSession.currentRound ?? 0,
    activeCharacterIds: updatedSession.activeCharacterIds,
    claimedCharacters: updatedSession.claimedCharacters || {},
    detectiveGuests: updatedSession.detectiveGuests || [],
    partyDetails: updatedSession.partyDetails,
    prepConfirmedCharacters: updatedSession.prepConfirmedCharacters || {},
    submissions: updatedSession.submissions,
    sharedTheoryRounds: updatedSession.sharedTheoryRounds,
    revealMode: updatedSession.revealMode,
    reviews: updatedSession.reviews || [],
    updatedAt: now,
  });

  // 2. Also persist to Supabase JSONB and cached mystery snapshot when carrier character is available
  if (carrierCharacter) {
    const updatedProfileData = {
      ...(carrierCharacter.profile_data || {}),
      __game_session: updatedSession,
    };
    carrierCharacter.profile_data = updatedProfileData;

    const cached = getCachedMysterySnapshot(mysteryId);
    if (cached && Array.isArray(cached.characters)) {
      cacheMysterySnapshot(mysteryId, {
        ...cached,
        current_round: updatedSession.currentRound ?? cached.current_round ?? 0,
        characters: cached.characters.map((c: any) =>
          c?.id === carrierCharacter.id ? { ...c, profile_data: updatedProfileData } : c
        ),
      });
    }

    if (supabase) {
      await supabase
        .from('characters')
        .update({ profile_data: updatedProfileData })
        .eq('id', carrierCharacter.id);
    }
  }

  // 3. Always sync to the cross-container `public.clues` carrier row so Incognito guests & all Vercel lambdas stay in sync
  await syncLiveStateToSupabaseClueCarrier(mysteryId, {
    supabase,
    session: updatedSession,
  });
}

/**
 * Looks up a mystery by its 6-digit Kahoot PIN.
 * Checks Supabase mysteries, the cross-container `public.clues` carrier rows, and local session cache.
 */
export async function findMysteryByPinAction(pinInput: string): Promise<{
  mysteryId?: string;
  title?: string;
  error?: string;
}> {
  const cleanPin = (pinInput || '').replace(/\D/g, '').trim();
  if (cleanPin.length !== 6) {
    return { error: 'Please enter a valid 6-digit Game PIN.' };
  }

  const supabase = await createClient();

  // 1. Check cross-container live carrier rows in `public.clues` (accessible to anon guests too!)
  try {
    const { data: carriers } = await supabase
      .from('clues')
      .select('id, description')
      .eq('title', LIVE_CARRIER_CLUE_TITLE);

    for (const row of carriers || []) {
      if (!row?.description) continue;
      try {
        const parsed = JSON.parse(row.description);
        const targetId = parsed?.mysteryId;
        if (!targetId) continue;
        const derivedPin = await generatePinFromMysteryId(targetId);
        const sessPin = parsed?.session?.pin;
        if (sessPin === cleanPin || derivedPin === cleanPin) {
          return {
            mysteryId: targetId,
            title: parsed?.title || 'Murder Mystery Party',
          };
        }
      } catch {
        // ignore malformed row
      }
    }
  } catch {
    // non-fatal
  }

  // 2. Check Supabase mysteries table
  const { data: mysteries } = await supabase
    .from('mysteries')
    .select('id, title, characters(id, is_victim, created_at, profile_data)')
    .order('created_at', { ascending: false });

  if (mysteries && mysteries.length > 0) {
    for (const m of mysteries as any[]) {
      const derivedPin = await generatePinFromMysteryId(m.id);
      const { session } = await readSessionFromCharacters(m.characters || [], m.id);
      if (session.pin === cleanPin || derivedPin === cleanPin) {
        return { mysteryId: m.id, title: m.title };
      }
    }
  }

  // 3. Check server-side cached mysteries
  const cachedMysteries = getAllCachedMysteries();
  for (const cm of cachedMysteries) {
    if (!cm?.id) continue;
    const derivedPin = await generatePinFromMysteryId(cm.id);
    const stored = getStoredGameSession(cm.id);
    if (stored?.pin === cleanPin || derivedPin === cleanPin) {
      return { mysteryId: cm.id, title: cm.title || 'Murder Mystery Party' };
    }
  }

  // 4. Check well-known canonical mystery IDs by deterministic PIN
  const KNOWN_IDS = [
    { id: '61196e53-09c3-427f-8862-30151f2ca75b', title: 'Christmas Nightmare' },
    { id: '616c3a73-5d81-40fa-afc8-e804733752e3', title: 'Christmas Nightmare' },
    { id: '69b65a91-1cc2-4267-94a4-59297428af28', title: 'Love On The Rocks' },
    { id: 'b944b8d9-f271-4d9e-9f31-717a53b8513f', title: "The Ringmaster's Last Bow" },
  ];
  for (const k of KNOWN_IDS) {
    const derivedPin = await generatePinFromMysteryId(k.id);
    if (derivedPin === cleanPin) {
      return { mysteryId: k.id, title: k.title };
    }
  }

  return {
    error: `No active mystery found with PIN ${cleanPin}. Double-check the 6-digit code with your host!`,
  };
}

/**
 * Saves the customer's spoiler-free cast:
 * - Updates victim character if the host picked a guest for the victim role
 * - Updates each selected active suspect character with the assigned guest's profile data
 * - Preserves rendered AI character costume portraits (`standard_character_photo_url`)
 * - Syncs cast & session to the cross-container `public.clues` carrier row so all guest phones & Incognito tabs get the exact cast names and photos
 */
export async function saveCustomerCastAction(
  mysteryId: string,
  assignments: {
    characterId: string;
    guest: {
      id: string;
      name: string;
      gender?: string;
      accent?: string;
      eye_color?: string;
      height?: string;
      avatar_url?: string;
      traits?: string[];
      bio?: string;
      isLinked?: boolean;
    } | null;
  }[],
  activeCharacterIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Please log into your host account to lock the cast and start the game.' };
  }

  const [isAdmin, liveCarrier] = await Promise.all([
    isUserAdmin(supabase, user),
    loadLiveStateFromSupabaseClueCarrier(mysteryId, supabase),
  ]);

  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  let resolvedMysteryObj: any = getCachedMysterySnapshot(mysteryId);
  if (!characters || characters.length === 0) {
    characters = resolvedMysteryObj?.characters || null;
  }

  if (!characters || characters.length === 0) {
    resolvedMysteryObj = await getMysteryById(mysteryId);
    characters = resolvedMysteryObj?.characters || null;
  }

  if (!characters || characters.length === 0) {
    return { error: 'Could not load characters for this mystery.' };
  }

  const existingStored = getStoredGameSession(mysteryId);
  const existingHostId =
    existingStored?.hostUserId ||
    existingStored?.paidByUserId ||
    liveCarrier?.session?.hostUserId ||
    liveCarrier?.session?.paidByUserId ||
    null;

  if (existingHostId && existingHostId !== user.id && !isAdmin) {
    return { error: 'Only the host who owns this mystery instance can modify its cast.' };
  }

  const pin = await generatePinFromMysteryId(mysteryId);
  const activeSet = new Set(activeCharacterIds);
  const assignmentMap = new Map(assignments.map(a => [a.characterId, a.guest]));

  const sessionMeta: GameSessionMeta = {
    pin,
    hostUserId: user.id,
    currentRound: 0,
    activeCharacterIds,
    claimedCharacters: {},
    submissions: [],
    sharedTheoryRounds: [],
    revealMode: 'hidden',
    reviews: existingStored?.reviews || [],
    updatedAt: new Date().toISOString(),
  };

  // Sort so victim or first character carries __game_session
  const sortedChars = [...characters].sort((a: any, b: any) => {
    if (a.is_victim !== b.is_victim) return a.is_victim ? -1 : 1;
    return (a.created_at || '').localeCompare(b.created_at || '');
  });
  const carrierId = sortedChars[0]?.id;

  const updatedCharObjects: any[] = [];

  for (const char of characters as any[]) {
    const isActive = activeSet.has(char.id);
    const assignedGuest = assignmentMap.get(char.id) || null;
    const existingProfile = (char.profile_data || {}) as Record<string, any>;

    const nextProfile: Record<string, any> = {
      ...existingProfile,
      is_active_in_session: isActive,
    };

    if (isActive && assignedGuest) {
      let resolvedGuestAvatarUrl =
        assignedGuest.avatar_url ||
        (existingProfile.guest_id === assignedGuest.id ? existingProfile.avatar_url : '') ||
        '';
      if (!resolvedGuestAvatarUrl.includes('aiPhotoUrl=')) {
        try {
          const { generateGuestAvatarAction } = await import('@/app/actions/ai-guests');
          const aiRes = await generateGuestAvatarAction(assignedGuest.id, {
            ...assignedGuest,
            avatar_url: resolvedGuestAvatarUrl,
          });
          if (aiRes?.publicUrl) {
            resolvedGuestAvatarUrl = aiRes.publicUrl;
          }
        } catch (aiErr) {
          console.error('Auto AI avatar generation during saveCustomerCastAction failed:', aiErr);
        }
      }
      const resolvedGender = assignedGuest.gender || char.gender || 'adaptable';
      nextProfile.guest_id = assignedGuest.id;
      nextProfile.guest_name = assignedGuest.name;
      nextProfile.name = assignedGuest.name;
      nextProfile.gender = resolvedGender;
      nextProfile.accent =
        assignedGuest.accent ||
        extractAccentFromAvatarUrl(resolvedGuestAvatarUrl) ||
        'Australian';
      nextProfile.age = extractAgeFromAvatarUrl(resolvedGuestAvatarUrl) || 'young';
      nextProfile.eye_color = assignedGuest.eye_color || '';
      nextProfile.height = assignedGuest.height || '';
      nextProfile.avatar_url = resolvedGuestAvatarUrl;
      nextProfile.traits = assignedGuest.traits || [];
      nextProfile.guest_bio = assignedGuest.bio || '';
      nextProfile.is_linked = Boolean(assignedGuest.isLinked);

      // Immediately adapt outfit_advice, outfit_reference_images, act_summary, act_bullets, and bio to match the cast guest's gender
      if (typeof nextProfile.outfit_advice === 'string' && nextProfile.outfit_advice.trim()) {
        nextProfile.outfit_advice = adaptOutfitForGuestGender(
          nextProfile.outfit_advice,
          resolvedGender
        );
      }
      if (
        typeof nextProfile.outfit_description === 'string' &&
        nextProfile.outfit_description.trim()
      ) {
        nextProfile.outfit_description = adaptOutfitForGuestGender(
          nextProfile.outfit_description,
          resolvedGender
        );
      }
      if (
        Array.isArray(nextProfile.outfit_reference_images) &&
        nextProfile.outfit_reference_images.length > 0
      ) {
        nextProfile.outfit_reference_images = adaptOutfitReferenceImagesForGuestGender(
          nextProfile.outfit_reference_images,
          resolvedGender
        );
      }
      if (typeof nextProfile.act_summary === 'string' && nextProfile.act_summary.trim()) {
        nextProfile.act_summary = adaptBioForGuestGender(
          nextProfile.act_summary,
          resolvedGender
        );
      }
      if (Array.isArray(nextProfile.act_bullets) && nextProfile.act_bullets.length > 0) {
        nextProfile.act_bullets = nextProfile.act_bullets.map((b: any) =>
          typeof b === 'string' ? adaptBioForGuestGender(b, resolvedGender) : b
        );
      }
      if (typeof nextProfile.bio === 'string' && nextProfile.bio.trim()) {
        nextProfile.bio = adaptBioForGuestGender(nextProfile.bio, resolvedGender);
      }
    } else {
      delete nextProfile.guest_id;
      delete nextProfile.guest_name;
      delete nextProfile.name;
    }

    if (char.id === carrierId) {
      nextProfile.__game_session = {
        ...(existingProfile.__game_session || {}),
        ...sessionMeta,
      };
    }

    const updatedCharGender = nextProfile.gender || char.gender || 'adaptable';

    updatedCharObjects.push({
      ...char,
      gender: updatedCharGender,
      profile_data: nextProfile,
    });

    await supabase
      .from('characters')
      .update({ gender: updatedCharGender, profile_data: nextProfile })
      .eq('id', char.id);
  }

  const templateMysteryId =
    resolvedMysteryObj?.template_mystery_id ||
    existingStored?.templateMysteryId ||
    null;

  // Ensure mystery starts in Lobby (Round 0)
  await supabase
    .from('mysteries')
    .update({ current_round: 0 })
    .eq('id', mysteryId);

  // Sync server-side cache and cross-container `public.clues` carrier for unauthenticated guests
  saveStoredGameSession(mysteryId, {
    mysteryId,
    templateMysteryId: templateMysteryId || undefined,
    pin,
    hostUserId: user.id,
    currentRound: 0,
    activeCharacterIds,
    claimedCharacters: {},
    submissions: [],
    sharedTheoryRounds: [],
    revealMode: 'hidden',
    reviews: sessionMeta.reviews,
    updatedAt: sessionMeta.updatedAt,
  });
  updateCachedMysteryCharacters(mysteryId, updatedCharObjects, 0);

  await syncLiveStateToSupabaseClueCarrier(mysteryId, {
    supabase,
    mystery: resolvedMysteryObj,
    characters: updatedCharObjects,
    session: {
      mysteryId,
      templateMysteryId: templateMysteryId || undefined,
      pin,
      hostUserId: user.id,
      currentRound: 0,
      activeCharacterIds,
      claimedCharacters: {},
      submissions: [],
      sharedTheoryRounds: [],
      revealMode: 'hidden',
      reviews: sessionMeta.reviews,
      updatedAt: sessionMeta.updatedAt,
    },
    templateMysteryId,
  });

  // Pre-generate all audio clues in the background with the newly locked cast names & accents
  void pregenerateAllAudioCluesForMystery(mysteryId, { forceRegenerate: true });

  revalidatePath(`/play/${mysteryId}`);
  if (templateMysteryId) {
    revalidatePath(`/play/${templateMysteryId}`);
  }
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');

  return {
    success: true,
    pin,
    mysteryId,
  };
}

/**
 * Fetches live session state (current round, PIN, submissions, shared flags, reviews, and solution if authorized).
 */
export async function getGameSessionAction(mysteryId: string) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data: dbMystery },
    liveCarrier,
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('mysteries')
      .select(`
        id,
        title,
        current_round,
        created_by,
        characters (
          *,
          motives!motives_character_id_fkey (*)
        ),
        clues (
          id,
          title,
          round_number,
          evidence_status,
          implication_type
        ),
        plot_beats (*)
      `)
      .eq('id', mysteryId)
      .single() as any,
    loadLiveStateFromSupabaseClueCarrier(mysteryId, supabase),
  ]);

  let mystery = dbMystery;
  const cachedSnapshot = getCachedMysterySnapshot(mysteryId);
  if (!mystery) {
    mystery = cachedSnapshot || (await getMysteryById(mysteryId));
  }

  if (!mystery) {
    return { error: 'Mystery not found' };
  }

  const characters =
    (Array.isArray(mystery.characters) && mystery.characters.length > 0
      ? mystery.characters
      : cachedSnapshot?.characters || liveCarrier?.characters) || [];
  const mysteryClues: any[] = (
    Array.isArray(mystery.clues) && mystery.clues.length > 0
      ? mystery.clues
      : cachedSnapshot?.clues || []
  ).filter((c: any) => !isLiveCarrierClue(c));
  const clueById = new Map<string, any>(mysteryClues.map((c: any) => [c.id, c]));

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters,
    mysteryId,
    liveCarrier?.session?.currentRound ?? mystery.current_round
  );
  const storedSession = getStoredGameSession(mysteryId);
  const isAdmin = user ? await isUserAdmin(supabase, user) : false;
  const isHost = Boolean(
    user &&
      (mystery.created_by === user.id ||
        session.hostUserId === user.id ||
        storedSession?.hostUserId === user.id ||
        storedSession?.paidByUserId === user.id ||
        isAdmin)
  );

  // If the host is polling and there are new guest submissions from the server store, sync them back to Supabase JSONB
  if (isHost && carrierCharacter) {
    const dbSubCount = carrierCharacter.profile_data?.__game_session?.submissions?.length || 0;
    const dbRevCount = carrierCharacter.profile_data?.__game_session?.reviews?.length || 0;
    if (
      session.submissions.length > dbSubCount ||
      (session.reviews?.length || 0) > dbRevCount
    ) {
      await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);
    }
  }

  const currentRound = session.currentRound ?? mystery.current_round ?? 0;
  const canViewSolution =
    currentRound >= 5 && (isHost || session.revealMode === 'shared_with_guests');

  const killerChar = characters.find((c: any) => c.plot_role === 'killer');
  const victimChar = characters.find((c: any) => c.is_victim || c.plot_role === 'victim');
  const assistantChar = characters.find((c: any) => c.plot_role === 'assistant');

  const killerMotive =
    killerChar?.motives?.find((m: any) => m.linked_character_id === victimChar?.id) ||
    killerChar?.motives?.[0] ||
    null;

  // Compute detective accuracy stats across rounds (including Clue Tagging bonus points & awards)
  const playerStatsMap = new Map<
    string,
    {
      voterCharId: string;
      voterName: string;
      totalVotes: number;
      correctVotes: number;
      earliestCorrectRound: number | null;
      finalGuessCorrect: boolean;
      finalSuspectName: string | null;
      uniqueSuspectsCount: number;
      suspectsChosen: Set<string>;
      accuracyScore: number;
      mergedClueTags: Record<string, 'key' | 'red_herring' | 'alibi'>;
    }
  >();

  const suspectVotesOverall = new Map<string, { suspectCharId: string; suspectName: string; count: number }>();

  const orderedSubmissions = [...session.submissions].sort((a, b) => {
    const ta = a.submittedAt ? Date.parse(a.submittedAt) : 0;
    const tb = b.submittedAt ? Date.parse(b.submittedAt) : 0;
    if (ta !== tb) return ta - tb;
    return (a.round || 0) - (b.round || 0);
  });

  for (const sub of orderedSubmissions) {
    const prevSus = suspectVotesOverall.get(sub.suspectCharId) || {
      suspectCharId: sub.suspectCharId,
      suspectName: sub.suspectName,
      count: 0,
    };
    prevSus.count += 1;
    suspectVotesOverall.set(sub.suspectCharId, prevSus);

    const existing = playerStatsMap.get(sub.voterCharId) || {
      voterCharId: sub.voterCharId,
      voterName: sub.voterName,
      totalVotes: 0,
      correctVotes: 0,
      earliestCorrectRound: null,
      finalGuessCorrect: false,
      finalSuspectName: null,
      uniqueSuspectsCount: 0,
      suspectsChosen: new Set<string>(),
      accuracyScore: 0,
      mergedClueTags: {},
    };

    existing.totalVotes += 1;
    existing.suspectsChosen.add(sub.suspectCharId);
    existing.uniqueSuspectsCount = existing.suspectsChosen.size;

    if (sub.clueTags && typeof sub.clueTags === 'object') {
      existing.mergedClueTags = { ...sub.clueTags };
    }

    const isCorrect = Boolean(killerChar && sub.suspectCharId === killerChar.id);
    if (isCorrect) {
      existing.correctVotes += 1;
      if (existing.earliestCorrectRound === null || sub.round < existing.earliestCorrectRound) {
        existing.earliestCorrectRound = sub.round;
      }
      const roundWeight = sub.round === 1 ? 40 : sub.round === 2 ? 30 : sub.round === 3 ? 25 : 35;
      existing.accuracyScore += roundWeight;
    }

    if (sub.round >= 4 || sub.round === currentRound) {
      existing.finalGuessCorrect = isCorrect;
      existing.finalSuspectName = sub.suspectName;
    }

    playerStatsMap.set(sub.voterCharId, existing);
  }

  const detectiveLeaderboard = Array.from(playerStatsMap.values())
    .map(({ suspectsChosen, mergedClueTags, ...rest }) => {
      let correctKeyClues = 0;
      let decoysSpotted = 0;
      let trickedByDecoys = 0;

      for (const [cId, tag] of Object.entries(mergedClueTags || {})) {
        const clueObj = clueById.get(cId);
        if (!clueObj || !tag) continue;
        const isFake =
          clueObj.evidence_status === 'fake' || clueObj.implication_type === 'red_herring';
        if (tag === 'key') {
          if (!isFake) correctKeyClues++;
          else trickedByDecoys++;
        } else if (tag === 'red_herring' || tag === 'alibi') {
          if (isFake) decoysSpotted++;
        }
      }

      const clueTagBonusPoints = correctKeyClues * 10 + decoysSpotted * 15;

      return {
        ...rest,
        correctKeyClues,
        decoysSpotted,
        trickedByDecoys,
        clueTagBonusPoints,
        accuracyScore: rest.accuracyScore + clueTagBonusPoints,
        accuracyPercent:
          rest.totalVotes > 0 ? Math.round((rest.correctVotes / rest.totalVotes) * 100) : 0,
      };
    })
    .sort((a, b) => {
      if (b.accuracyScore !== a.accuracyScore) return b.accuracyScore - a.accuracyScore;
      if (b.correctVotes !== a.correctVotes) return b.correctVotes - a.correctVotes;
      return (a.earliestCorrectRound ?? 99) - (b.earliestCorrectRound ?? 99);
    });

  const mostSuspectedList = Array.from(suspectVotesOverall.values()).sort((a, b) => b.count - a.count);

  const normalizedPlotBeats = normalizePlotBeats(mystery.plot_beats || [], mysteryId, supabase);

  const solutionData = canViewSolution
    ? {
        victim: victimChar
          ? {
              id: victimChar.id,
              name: getCharacterDisplayName(victimChar),
              role: getCharacterRoleTitle(victimChar),
              bio: hydrateTextWithCharacters(victimChar.profile_data?.bio || '', characters, 'print'),
            }
          : null,
        killer: killerChar
          ? {
              id: killerChar.id,
              name: getCharacterDisplayName(killerChar),
              role: getCharacterRoleTitle(killerChar),
              bio: hydrateTextWithCharacters(killerChar.profile_data?.bio || '', characters, 'print'),
              motiveType: killerMotive?.motive_type || 'Secret Grudge',
              motiveNotes: hydrateTextWithCharacters(
                killerMotive?.notes ||
                  killerMotive?.description ||
                  killerChar.profile_data?.secrets ||
                  '',
                characters,
                'print'
              ),
            }
          : null,
        assistant: assistantChar
          ? {
              id: assistantChar.id,
              name: getCharacterDisplayName(assistantChar),
              role: getCharacterRoleTitle(assistantChar),
              bio: hydrateTextWithCharacters(assistantChar.profile_data?.bio || '', characters, 'print'),
            }
          : null,
        plotBeats: normalizedPlotBeats
          .sort((a: any, b: any) => (a.sort_order ?? a.beat_number ?? 0) - (b.sort_order ?? b.beat_number ?? 0))
          .map((beat: any) => ({
            ...beat,
            event_title: hydrateTextWithCharacters(beat.event_title || '', characters, 'print'),
            description: hydrateTextWithCharacters(beat.description || '', characters, 'print'),
          })),
      }
    : null;

  return {
    currentRound,
    isHost,
    pin: session.pin,
    activeCharacterIds: session.activeCharacterIds,
    claimedCharacters: session.claimedCharacters || {},
    detectiveGuests: session.detectiveGuests || [],
    partyDetails: session.partyDetails || null,
    prepConfirmedCharacters: session.prepConfirmedCharacters || {},
    submissions: session.submissions,
    sharedTheoryRounds: session.sharedTheoryRounds,
    revealMode: session.revealMode,
    reviews: session.reviews || [],
    detectiveLeaderboard,
    mostSuspectedList,
    solutionData,
  };
}

/**
 * Host saves or updates Pre-Party Event Details (Date, Arrival Time, Location, Food/Drink Vibe & Custom "What to Bring" Checklist)
 * from the My Mysteries / Pre-Party Host Hub. Automatically renders on every guest's Pre-Party First Glance Sheet.
 */
export async function updatePartyEventDetailsAction(
  mysteryId: string,
  details: PartyEventDetails
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    characters = cached?.characters || [];
  }

  const [{ session, carrierCharacter }, isAdmin] = await Promise.all([
    readSessionFromCharacters(characters || [], mysteryId),
    user ? isUserAdmin(supabase, user) : Promise.resolve(false),
  ]);

  const storedSession = getStoredGameSession(mysteryId);
  const existingHostId =
    session.hostUserId ||
    storedSession?.hostUserId ||
    storedSession?.paidByUserId ||
    null;

  if (user && existingHostId && existingHostId !== user.id && !isAdmin) {
    return { error: 'Only the host who owns this mystery instance can update party details.' };
  }

  const cleanItems = Array.isArray(details.whatToBringItems)
    ? details.whatToBringItems.map(item => String(item || '').trim()).filter(Boolean)
    : session.partyDetails?.whatToBringItems || [
        '📱 Charged phone or device (50%+ battery)',
        '👗 Your character outfit & costume vibe',
      ];

  const updatedDetails: PartyEventDetails = {
    ...(session.partyDetails || {}),
    ...details,
    whatToBringItems: cleanItems,
    updatedAt: new Date().toISOString(),
  };

  session.partyDetails = updatedDetails;
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  // Also sync to the user's isolated instance ID or base ID so Checkout and My Mysteries stay 100% in sync
  const baseId = mysteryId.includes('__u_') ? mysteryId.split('__u_')[0] : mysteryId;
  const siblingIds = new Set<string>([baseId]);
  if (user?.id) {
    siblingIds.add(`${baseId}__u_${user.id}`);
  }
  for (const sibId of siblingIds) {
    if (sibId === mysteryId) continue;
    const sibStored = getStoredGameSession(sibId);
    if (sibStored) {
      saveStoredGameSession(sibId, {
        ...sibStored,
        partyDetails: updatedDetails,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const pin = await generatePinFromMysteryId(sibId);
      saveStoredGameSession(sibId, {
        mysteryId: sibId,
        hostUserId: user?.id || session.hostUserId,
        pin,
        currentRound: 0,
        activeCharacterIds: session.activeCharacterIds || [],
        claimedCharacters: {},
        detectiveGuests: [],
        partyDetails: updatedDetails,
        prepConfirmedCharacters: {},
        submissions: [],
        sharedTheoryRounds: [],
        revealMode: 'hidden',
        reviews: [],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    success: true,
    partyDetails: updatedDetails,
  };
}

/**
 * Guest clicks "I've Read My Role & Outfit - I'm Ready!" on their Pre-Party First Glance Sheet,
 * updating the Host's Pre-Party Hub live.
 */
export async function confirmCharacterPrepReadAction(
  mysteryId: string,
  characterId: string,
  guestName?: string
) {
  const supabase = await createClient();
  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    characters = cached?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters || [],
    mysteryId
  );

  const existing = { ...(session.prepConfirmedCharacters || {}) };
  existing[characterId] = {
    confirmedAt: new Date().toISOString(),
    guestName: guestName || existing[characterId]?.guestName,
  };

  session.prepConfirmedCharacters = existing;
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  return {
    success: true,
    prepConfirmedCharacters: existing,
  };
}

/**
 * Claims a character in the Lobby so no other player can select that character,
 * or releases the player's claim when characterId is null.
 */
export async function claimCharacterInLobbyAction(
  mysteryId: string,
  characterId: string | null,
  playerToken: string
) {
  const supabase = await createClient();
  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    characters = cached?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters || [],
    mysteryId
  );

  const claims = { ...(session.claimedCharacters || {}) };

  // Release any previous character claimed by this same player token
  for (const [cId, info] of Object.entries(claims)) {
    if (info.token === playerToken) {
      delete claims[cId];
    }
  }

  // Record the character selection if provided
  if (characterId) {
    claims[characterId] = {
      token: playerToken,
      claimedAt: new Date().toISOString(),
    };
    // If this player previously joined as a Guest Detective, remove their detective entry so they aren't double-counted
    session.detectiveGuests = (session.detectiveGuests || []).filter(
      d => d.token !== playerToken
    );
  }

  session.claimedCharacters = claims;
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  return {
    success: true,
    claimedCharacters: claims,
    detectiveGuests: session.detectiveGuests || [],
  };
}

/**
 * Registers an extra guest player who doesn't have an assigned character role as "Detective [Name]".
 * They appear in the Host's Lobby & Room Cast, receive all live clues, vote in every round,
 * and compete on the Final Detective Leaderboard without being a suspect in the murder plot.
 */
export async function registerDetectiveGuestAction(
  mysteryId: string,
  rawName: string,
  playerToken: string
) {
  const supabase = await createClient();
  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    characters = cached?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters || [],
    mysteryId
  );

  const stripped = (rawName || '')
    .replace(/^🕵️\s*/i, '')
    .replace(/^detective\s+/i, '')
    .trim();
  const cleanName = stripped || 'Guest';
  const displayName = `Detective ${cleanName}`;
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'guest';
  const detectiveId = playerToken ? `detective-${playerToken}` : `detective-${slug}`;

  // Release any character claim held by this playerToken
  const claims = { ...(session.claimedCharacters || {}) };
  if (playerToken) {
    for (const [cId, info] of Object.entries(claims)) {
      if (info.token === playerToken) {
        delete claims[cId];
      }
    }
  }
  session.claimedCharacters = claims;

  const existingList = (session.detectiveGuests || []).filter(
    d => d.id !== detectiveId && (!playerToken || d.token !== playerToken)
  );
  const detectiveGuest: DetectiveGuestItem = {
    id: detectiveId,
    name: cleanName,
    displayName,
    token: playerToken || detectiveId,
    joinedAt: new Date().toISOString(),
  };

  session.detectiveGuests = [...existingList, detectiveGuest];
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  return {
    success: true,
    detectiveGuest,
    detectiveGuests: session.detectiveGuests,
    claimedCharacters: session.claimedCharacters,
  };
}

/**
 * Guest submits "Who they think did it and Why" for a given round.
 */
export async function submitRoundTheoryAction(
  mysteryId: string,
  payload: {
    round: number;
    voterCharId: string;
    voterName: string;
    suspectCharId: string;
    suspectName: string;
    reason: string;
    clueTags?: Record<string, 'key' | 'red_herring' | 'alibi'>;
  }
) {
  const supabase = await createClient();
  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(mysteryId);
    characters = cached?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(characters || [], mysteryId);

  // Replace existing submission from the same voter in the same round, or append
  const filtered = session.submissions.filter(
    s => !(s.round === payload.round && s.voterCharId === payload.voterCharId)
  );

  const cleanTags: Record<string, 'key' | 'red_herring' | 'alibi'> = {};
  const hasClueTagsPayload = Boolean(payload.clueTags && typeof payload.clueTags === 'object');
  if (hasClueTagsPayload && payload.clueTags) {
    for (const [k, v] of Object.entries(payload.clueTags)) {
      if (v === 'key' || v === 'red_herring' || v === 'alibi') {
        cleanTags[k] = v;
      }
    }
  }

  const newEntry: RoundSubmission = {
    id: `${payload.round}-${payload.voterCharId}-${Date.now()}`,
    round: payload.round,
    voterCharId: payload.voterCharId,
    voterName: payload.voterName,
    suspectCharId: payload.suspectCharId,
    suspectName: payload.suspectName,
    reason: payload.reason.trim() || 'Acting suspicious!',
    submittedAt: new Date().toISOString(),
    ...(hasClueTagsPayload ? { clueTags: cleanTags } : {}),
  };

  session.submissions = [...filtered, newEntry];
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  revalidatePath(`/play/${mysteryId}`);
  return { success: true, submission: newEntry, submissions: session.submissions };
}

/**
 * Host controls: advance round, toggle sharing a round's theories with guests, or set Round 5 Reveal mode
 * ('phone_free' for host read-aloud vs 'shared_with_guests' to push to everyone's phone).
 */
export async function updateHostGameControlAction(
  mysteryId: string,
  updates: {
    currentRound?: number;
    toggleShareRound?: number;
    revealMode?: 'hidden' | 'phone_free' | 'shared_with_guests';
    resetClaimedCharacters?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: dbMystery } = (await supabase
    .from('mysteries')
    .select('id, created_by')
    .eq('id', mysteryId)
    .maybeSingle()) as any;
  const cachedMystery = getCachedMysterySnapshot(mysteryId);
  const storedSession = getStoredGameSession(mysteryId);
  const isAdmin = user ? await isUserAdmin(supabase, user) : false;

  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (!characters || characters.length === 0) {
    characters = cachedMystery?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters || [],
    mysteryId,
    Math.floor(updates.currentRound ?? 0)
  );

  const isAuthorizedHost = Boolean(
    user &&
      (!session.hostUserId ||
        dbMystery?.created_by === user.id ||
        cachedMystery?.created_by === user.id ||
        session.hostUserId === user.id ||
        storedSession?.hostUserId === user.id ||
        storedSession?.paidByUserId === user.id ||
        isAdmin)
  );

  if (!isAuthorizedHost) {
    return { error: 'Only the party host who owns this session can control the game flow.' };
  }

  if (typeof updates.currentRound === 'number') {
    await supabase
      .from('mysteries')
      .update({ current_round: Math.floor(updates.currentRound) })
      .eq('id', mysteryId);
  }

  if (typeof updates.currentRound === 'number') {
    session.currentRound = updates.currentRound;
    if (updates.currentRound >= 5 && !updates.revealMode) {
      session.revealMode = 'shared_with_guests';
    }
  }

  if (typeof updates.toggleShareRound === 'number') {
    const r = updates.toggleShareRound;
    if (session.sharedTheoryRounds.includes(r)) {
      session.sharedTheoryRounds = session.sharedTheoryRounds.filter(x => x !== r);
    } else {
      session.sharedTheoryRounds = [...session.sharedTheoryRounds, r];
    }
  }

  if (updates.revealMode) {
    session.revealMode = updates.revealMode;
  }

  if (updates.resetClaimedCharacters) {
    session.claimedCharacters = {};
    session.detectiveGuests = [];
  }

  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  // Also keep cached mystery current_round updated
  if (cachedMystery && typeof updates.currentRound === 'number') {
    cacheMysterySnapshot(mysteryId, {
      ...cachedMystery,
      current_round: updates.currentRound,
    });
  }

  revalidatePath(`/play/${mysteryId}`);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');

  return getGameSessionAction(mysteryId);
}

/**
 * Guest 5-star review submission right from the end of the mystery playroom.
 */
export async function submitGuestMysteryReviewAction(payload: {
  mysteryId: string;
  mysteryTitle: string;
  playerName: string;
  characterRole?: string;
  rating: number;
  comment: string;
  photoDataUrl?: string;
}) {
  const supabase = await createClient();
  const cleanName = payload.playerName.trim() || 'Mystery Guest';
  const rating = Math.min(5, Math.max(1, Math.round(payload.rating || 5)));
  const cleanComment = payload.comment.trim();
  const commentText = cleanComment
    ? `[${payload.mysteryTitle}${payload.characterRole ? ` • Played ${payload.characterRole}` : ''}] ${cleanComment}`
    : `Played ${payload.mysteryTitle}${payload.characterRole ? ` as ${payload.characterRole}` : ''} - ${rating}/5 stars!`;

  let resolvedPhotoUrl: string | undefined;
  const rawPhoto = (payload.photoDataUrl || '').trim();
  if (rawPhoto && rawPhoto.startsWith('data:image/')) {
    resolvedPhotoUrl = rawPhoto;
    try {
      const match = rawPhoto.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const filePath = `reviews/${fileName}`;
        const buffer = Buffer.from(base64Data, 'base64');

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, buffer, { contentType: mimeType, upsert: false });

        if (!uploadError && uploadData) {
          const {
            data: { publicUrl },
          } = supabase.storage.from('uploads').getPublicUrl(filePath);
          if (publicUrl) {
            resolvedPhotoUrl = publicUrl;
          }
        }
      }
    } catch {
      // Keep compressed data URL fallback
    }
  } else if (rawPhoto && (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://'))) {
    resolvedPhotoUrl = rawPhoto;
  }

  const reviewEntry: GuestReviewItem = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mysteryId: payload.mysteryId,
    playerName: cleanName,
    characterRole: payload.characterRole || 'Sleuth',
    rating,
    comment: cleanComment || `Loved playing ${payload.mysteryTitle}!`,
    ...(resolvedPhotoUrl ? { photoUrl: resolvedPhotoUrl } : {}),
    createdAt: new Date().toISOString(),
  };

  // 1. Save into live session & character JSONB so reviews always persist even if public.reviews table is unmigrated
  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', payload.mysteryId);

  if (!characters || characters.length === 0) {
    const cached = getCachedMysterySnapshot(payload.mysteryId);
    characters = cached?.characters || [];
  }

  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters || [],
    payload.mysteryId
  );
  session.reviews = [reviewEntry, ...(session.reviews || [])];
  await writeSessionToCarrier(supabase, payload.mysteryId, carrierCharacter, session);

  // 2. Best-effort insert into public.reviews if the table exists
  try {
    await (supabase as any).from('reviews').insert({
      name: cleanName,
      rating,
      review_text: commentText,
      status: 'pending',
      ...(resolvedPhotoUrl ? { attachment_urls: [resolvedPhotoUrl] } : {}),
    });
  } catch {
    // Non-fatal if public.reviews is not migrated
  }

  revalidatePath(`/play/${payload.mysteryId}`);
  return { success: true, review: reviewEntry, reviews: session.reviews };
}

/**
 * Polls the server-side 20-minute background generation status for a purchased mystery.
 * Automatically transitions to 'ready' and sends the customer email once the timer completes.
 */
export async function getMysteryGenerationStatusAction(payload: {
  mysteryId: string;
  slug?: string;
  mysteryTitle: string;
  locale?: string;
  advanceStep?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  await loadLiveStateFromSupabaseClueCarrier(payload.mysteryId, supabase);

  const params = {
    mysteryId: payload.mysteryId,
    slug: payload.slug || payload.mysteryId,
    mysteryTitle: payload.mysteryTitle,
    customerEmail: user?.email || null,
    customerName: (user?.user_metadata?.full_name as string) || null,
    locale: payload.locale || 'en',
  };

  if (payload.advanceStep !== false) {
    await advanceMysteryGenerationOneStep(params);
  }

  const state = await checkAndFinalizeGenerationIfDue(params);

  if (state.status === 'ready') {
    try {
      const { data: chars } = await supabase
        .from('characters')
        .select('id, profile_data')
        .eq('mystery_id', payload.mysteryId)
        .order('order_index', { ascending: true })
        .limit(1);

      if (chars && chars[0]) {
        const existingProfile = (chars[0].profile_data as Record<string, any>) || {};
        const existingSession = existingProfile.__game_session || {};
        if (existingSession.generationStatus !== 'ready') {
          await supabase
            .from('characters')
            .update({
              profile_data: {
                ...existingProfile,
                __game_session: {
                  ...existingSession,
                  isPaid: true,
                  generationStatus: 'ready',
                  generationProgress: 100,
                },
              },
            })
            .eq('id', chars[0].id);
        }
      }
    } catch {
      // non-fatal
    }
  }

  return state;
}

/**
 * Completes the background mystery generation immediately, marks the mystery as 'ready'
 * in "My Mysteries (Stories)", and sends the "Your Murder Mystery Package is Ready!" email.
 */
export async function finishMysteryGenerationNowAction(payload: {
  mysteryId: string;
  slug?: string;
  mysteryTitle: string;
  pin?: string;
  locale?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Authentication required to finalize mystery package generation.');
  }

  const res = await finalizeMysteryGenerationNow({
    mysteryId: payload.mysteryId,
    slug: payload.slug || payload.mysteryId,
    mysteryTitle: payload.mysteryTitle,
    customerEmail: user?.email || null,
    customerName: (user?.user_metadata?.full_name as string) || null,
    pin: payload.pin,
    locale: payload.locale || 'en',
  });

  try {
    const { data: chars } = await supabase
      .from('characters')
      .select('id, profile_data')
      .eq('mystery_id', payload.mysteryId)
      .order('order_index', { ascending: true })
      .limit(1);

    if (chars && chars[0]) {
      const existingProfile = (chars[0].profile_data as Record<string, any>) || {};
      const existingSession = existingProfile.__game_session || {};
      await supabase
        .from('characters')
        .update({
          profile_data: {
            ...existingProfile,
            __game_session: {
              ...existingSession,
              isPaid: true,
              generationStatus: 'ready',
              generationReadyAt: new Date().toISOString(),
              generationProgress: 100,
              readyEmailSent: true,
            },
          },
        })
        .eq('id', chars[0].id);
    }
  } catch {
    // non-fatal
  }

  revalidatePath(`/[locale]/account/orders`, 'page');
  revalidatePath(`/[locale]/mysteries/${payload.slug || payload.mysteryId}/cast`, 'page');
  revalidatePath(`/[locale]/mysteries/${payload.slug || payload.mysteryId}/ready`, 'page');

  return res;
}

/**
 * Step 1 of Accept-First Host Ownership Transfer:
 * Creates a pending transfer token for the recipient email/name, persists it in the session + Supabase carrier,
 * and sends the recipient an email invite. Ownership remains with the current host until the recipient logs in & accepts.
 */
export async function initiateHostTransferAction(payload: {
  mysteryId: string;
  mysteryTitle: string;
  toEmail: string;
  toName?: string;
  locale?: string;
}): Promise<{
  success: boolean;
  error?: string;
  pendingTransfer?: StoredPendingHostTransfer;
  claimUrl?: string;
  emailSent?: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Please log in to transfer Host ownership.' };
    }

    const cleanToEmail = (payload.toEmail || '').trim().toLowerCase();
    if (!cleanToEmail || !cleanToEmail.includes('@')) {
      return { success: false, error: 'Please enter a valid email address for the new host.' };
    }

    const currentUserEmail = (user.email || '').trim().toLowerCase();
    if (cleanToEmail === currentUserEmail) {
      return { success: false, error: 'You are already the Host of this mystery.' };
    }

    await loadLiveStateFromSupabaseClueCarrier(payload.mysteryId, supabase);
    let session = getStoredGameSession(payload.mysteryId);
    const pin = await generatePinFromMysteryId(payload.mysteryId);

    if (!session) {
      session = {
        mysteryId: payload.mysteryId,
        hostUserId: user.id,
        paidByUserId: user.id,
        customerEmail: user.email || undefined,
        pin,
        currentRound: 0,
        activeCharacterIds: [],
        submissions: [],
        sharedTheoryRounds: [],
        revealMode: 'hidden',
        reviews: [],
        isPaid: true,
        generationStatus: 'ready',
        updatedAt: new Date().toISOString(),
      };
    }

    const fromName =
      (user.user_metadata?.full_name as string) ||
      session.customerName ||
      user.email?.split('@')[0] ||
      'Current Host';

    const token = `ht_${crypto.randomBytes(12).toString('hex')}`;
    const pendingTransfer: StoredPendingHostTransfer = {
      token,
      mysteryId: payload.mysteryId,
      mysteryTitle: payload.mysteryTitle || 'Murder Mystery',
      fromUserId: user.id,
      fromEmail: user.email || '',
      fromName,
      toEmail: cleanToEmail,
      toName: (payload.toName || '').trim() || cleanToEmail.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    const updatedSession = {
      ...session,
      hostUserId: session.hostUserId || user.id,
      paidByUserId: session.paidByUserId || user.id,
      isPaid: true,
      pendingHostTransfer: pendingTransfer,
      updatedAt: new Date().toISOString(),
    };

    saveStoredGameSession(payload.mysteryId, updatedSession);
    await syncLiveStateToSupabaseClueCarrier(payload.mysteryId, {
      supabase,
      session: updatedSession,
    });

    const locale = payload.locale || 'en';
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://backpocketmysteries.com').replace(/\/$/, '');
    const claimUrl = `${siteUrl}/${locale}/account/orders?claimTransfer=${encodeURIComponent(token)}`;

    const emailRes = await sendHostOwnershipTransferInviteEmail({
      toEmail: cleanToEmail,
      toName: pendingTransfer.toName,
      fromName,
      fromEmail: user.email || null,
      mysteryId: payload.mysteryId,
      mysteryTitle: pendingTransfer.mysteryTitle,
      claimToken: token,
      locale,
    });

    revalidatePath(`/[locale]/account/orders`, 'page');
    return {
      success: true,
      pendingTransfer,
      claimUrl,
      emailSent: Boolean(emailRes.sent || emailRes.queuedInOutbox),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to initiate host ownership transfer.',
    };
  }
}

/**
 * Cancels an unaccepted pending Host ownership transfer so the current host keeps ownership.
 */
export async function cancelHostTransferAction(payload: {
  mysteryId: string;
  locale?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required.' };
    }

    await loadLiveStateFromSupabaseClueCarrier(payload.mysteryId, supabase);
    const session = getStoredGameSession(payload.mysteryId);
    if (!session) {
      return { success: false, error: 'Mystery session not found.' };
    }

    const updatedSession = {
      ...session,
      pendingHostTransfer: null,
      updatedAt: new Date().toISOString(),
    };

    saveStoredGameSession(payload.mysteryId, updatedSession);
    await syncLiveStateToSupabaseClueCarrier(payload.mysteryId, {
      supabase,
      session: updatedSession,
    });

    revalidatePath(`/[locale]/account/orders`, 'page');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to cancel transfer.' };
  }
}

/**
 * Step 2 of Accept-First Host Ownership Transfer:
 * Called when the invited recipient logs in and clicks "Accept & Become Host".
 * Atomically transfers ownership of the custom mystery instance to the new user and removes it from the previous host.
 */
export async function acceptHostTransferAction(payload: {
  mysteryId: string;
  token: string;
  locale?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Please log in to accept Host ownership.' };
    }

    await loadLiveStateFromSupabaseClueCarrier(payload.mysteryId, supabase);
    const session = getStoredGameSession(payload.mysteryId);
    const pending = session?.pendingHostTransfer;

    if (!session || !pending || pending.token !== payload.token) {
      return {
        success: false,
        error: 'This Host transfer invite is no longer active or has already been claimed.',
      };
    }

    const previousHostId = pending.fromUserId || session.hostUserId || session.paidByUserId || '';
    const prevIds = Array.from(
      new Set([
        ...(session.previousHostUserIds || []),
        ...(previousHostId && previousHostId !== user.id ? [previousHostId] : []),
      ].filter((id) => id !== user.id))
    );

    const newOwnerName =
      (user.user_metadata?.full_name as string) ||
      pending.toName ||
      user.email?.split('@')[0] ||
      'Host';

    const updatedSession = {
      ...session,
      isPaid: true,
      hostUserId: user.id,
      paidByUserId: user.id,
      customerEmail: user.email || pending.toEmail,
      customerName: newOwnerName,
      pendingHostTransfer: null,
      previousHostUserIds: prevIds,
      transferHistory: [
        ...(session.transferHistory || []),
        {
          fromUserId: previousHostId,
          fromEmail: pending.fromEmail,
          toUserId: user.id,
          toEmail: user.email || pending.toEmail,
          transferredAt: new Date().toISOString(),
        },
      ],
      updatedAt: new Date().toISOString(),
    };

    saveStoredGameSession(payload.mysteryId, updatedSession);

    // Update cached mystery snapshot owner so the new host owns this exact isolated instance
    const cachedMystery = getCachedMysterySnapshot(payload.mysteryId);
    if (cachedMystery) {
      cacheMysterySnapshot(payload.mysteryId, {
        ...cachedMystery,
        created_by: user.id,
      });
    }

    await syncLiveStateToSupabaseClueCarrier(payload.mysteryId, {
      supabase,
      mystery: cachedMystery
        ? { ...cachedMystery, created_by: user.id }
        : undefined,
      session: updatedSession,
    });

    // Best-effort update in Supabase orders table so DB queries reflect the new owner
    try {
      if (previousHostId) {
        await supabase
          .from('orders')
          .update({ user_id: user.id } as any)
          .eq('user_id', previousHostId)
          .eq('mystery_id', payload.mysteryId);
      }
    } catch {
      // non-fatal
    }

    revalidatePath(`/[locale]/account/orders`, 'page');
    revalidatePath(`/[locale]/mysteries/${payload.mysteryId}/ready`, 'page');
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to accept Host ownership transfer.',
    };
  }
}

/**
 * Declines an incoming Host ownership transfer invite so the original host retains ownership.
 */
export async function declineHostTransferAction(payload: {
  mysteryId: string;
  token: string;
  locale?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    await loadLiveStateFromSupabaseClueCarrier(payload.mysteryId, supabase);
    const session = getStoredGameSession(payload.mysteryId);
    if (!session || session.pendingHostTransfer?.token !== payload.token) {
      return { success: true };
    }

    const updatedSession = {
      ...session,
      pendingHostTransfer: null,
      updatedAt: new Date().toISOString(),
    };

    saveStoredGameSession(payload.mysteryId, updatedSession);
    await syncLiveStateToSupabaseClueCarrier(payload.mysteryId, {
      supabase,
      session: updatedSession,
    });

    revalidatePath(`/[locale]/account/orders`, 'page');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to decline transfer.' };
  }
}


