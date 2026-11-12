'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';
import { getCharacterDisplayName, getCharacterRoleTitle, hydrateTextWithCharacters } from '@/utils/hydration';
import { normalizePlotBeats } from '@/services/mysteries';
import {
  cacheMysterySnapshot,
  getCachedMysterySnapshot,
  getAllCachedMysteries,
  getStoredGameSession,
  saveStoredGameSession,
  updateCachedMysteryCharacters,
  StoredGuestReview,
} from '@/lib/live-session-store';
import {
  checkAndFinalizeGenerationIfDue,
  finalizeMysteryGenerationNow,
} from '@/lib/background-mystery-generator';

export interface RoundSubmission {
  id: string;
  round: number;
  voterCharId: string;
  voterName: string;
  suspectCharId: string;
  suspectName: string;
  reason: string;
  submittedAt: string;
}

export type GuestReviewItem = StoredGuestReview;

export interface GameSessionMeta {
  pin: string;
  currentRound?: number;
  activeCharacterIds: string[];
  claimedCharacters: Record<string, { token: string; claimedAt: string }>;
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

  const session: GameSessionMeta = {
    pin: stored?.pin || raw?.pin || defaultPin,
    currentRound: resolvedRound,
    activeCharacterIds:
      preferStored && Array.isArray(stored?.activeCharacterIds) && stored!.activeCharacterIds.length > 0
        ? stored!.activeCharacterIds
        : Array.isArray(raw?.activeCharacterIds) && raw!.activeCharacterIds.length > 0
        ? raw!.activeCharacterIds
        : activeFromFlags,
    claimedCharacters: mergedClaims,
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
    pin: session.pin,
    currentRound: resolvedRound,
    activeCharacterIds: session.activeCharacterIds,
    claimedCharacters: session.claimedCharacters,
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
    pin: updatedSession.pin,
    currentRound: updatedSession.currentRound ?? 0,
    activeCharacterIds: updatedSession.activeCharacterIds,
    claimedCharacters: updatedSession.claimedCharacters || {},
    submissions: updatedSession.submissions,
    sharedTheoryRounds: updatedSession.sharedTheoryRounds,
    revealMode: updatedSession.revealMode,
    reviews: updatedSession.reviews || [],
    updatedAt: now,
  });

  // 2. Also persist to Supabase JSONB when carrier character is available
  if (carrierCharacter && supabase) {
    const updatedProfileData = {
      ...(carrierCharacter.profile_data || {}),
      __game_session: updatedSession,
    };

    await supabase
      .from('characters')
      .update({ profile_data: updatedProfileData })
      .eq('id', carrierCharacter.id);
  }
}

/**
 * Looks up a mystery by its 6-digit Kahoot PIN.
 * Checks both Supabase and the server-side live session cache so unauthenticated guests can join by PIN.
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

  // 1. Check Supabase mysteries first
  const supabase = await createClient();
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

  // 2. Check server-side cached mysteries (for unauthenticated guest browsers)
  const cachedMysteries = getAllCachedMysteries();
  for (const cm of cachedMysteries) {
    if (!cm?.id) continue;
    const derivedPin = await generatePinFromMysteryId(cm.id);
    const stored = getStoredGameSession(cm.id);
    if (stored?.pin === cleanPin || derivedPin === cleanPin) {
      return { mysteryId: cm.id, title: cm.title || 'Murder Mystery Party' };
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
 * - Marks unused optional characters as inactive for this session (`is_active_in_session: false`)
 * - Resets round to 0 (Lobby) and initializes the Kahoot PIN session
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

  let { data: characters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (!characters || characters.length === 0) {
    const cachedMystery = getCachedMysterySnapshot(mysteryId);
    characters = cachedMystery?.characters || null;
  }

  if (!characters || characters.length === 0) {
    return { error: 'Could not load characters for this mystery.' };
  }

  const pin = await generatePinFromMysteryId(mysteryId);
  const existingStored = getStoredGameSession(mysteryId);
  const activeSet = new Set(activeCharacterIds);
  const assignmentMap = new Map(assignments.map(a => [a.characterId, a.guest]));

  const sessionMeta: GameSessionMeta = {
    pin,
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
      if (existingProfile.guest_id !== assignedGuest.id) {
        delete nextProfile.standard_character_photo_url;
        delete nextProfile.standard_character_photo_hash;
      }
      nextProfile.guest_id = assignedGuest.id;
      nextProfile.guest_name = assignedGuest.name;
      nextProfile.name = assignedGuest.name;
      nextProfile.gender = assignedGuest.gender || char.gender || 'adaptable';
      nextProfile.accent =
        assignedGuest.accent ||
        extractAccentFromAvatarUrl(assignedGuest.avatar_url || '') ||
        'Australian';
      nextProfile.age = extractAgeFromAvatarUrl(assignedGuest.avatar_url || '') || 'young';
      nextProfile.eye_color = assignedGuest.eye_color || '';
      nextProfile.height = assignedGuest.height || '';
      nextProfile.avatar_url = assignedGuest.avatar_url || existingProfile.avatar_url || '';
      nextProfile.traits = assignedGuest.traits || [];
      nextProfile.guest_bio = assignedGuest.bio || '';
      nextProfile.is_linked = Boolean(assignedGuest.isLinked);
    } else {
      delete nextProfile.guest_id;
      delete nextProfile.guest_name;
      delete nextProfile.name;
      delete nextProfile.standard_character_photo_url;
      delete nextProfile.standard_character_photo_hash;
    }

    if (char.id === carrierId) {
      nextProfile.__game_session = {
        ...(existingProfile.__game_session || {}),
        ...sessionMeta,
      };
    }

    updatedCharObjects.push({
      ...char,
      profile_data: nextProfile,
    });

    await supabase
      .from('characters')
      .update({ profile_data: nextProfile })
      .eq('id', char.id);
  }

  // Ensure mystery starts in Lobby (Round 0)
  await supabase
    .from('mysteries')
    .update({ current_round: 0 })
    .eq('id', mysteryId);

  // Sync server-side cache for unauthenticated guests
  saveStoredGameSession(mysteryId, {
    mysteryId,
    pin,
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

  revalidatePath(`/play/${mysteryId}`);
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let { data: mystery } = (await supabase
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
      plot_beats (*)
    `)
    .eq('id', mysteryId)
    .single()) as any;

  if (!mystery) {
    mystery = getCachedMysterySnapshot(mysteryId);
  }

  if (!mystery) {
    return { error: 'Mystery not found' };
  }

  const characters = mystery.characters || [];
  const { session, carrierCharacter } = await readSessionFromCharacters(
    characters,
    mysteryId,
    mystery.current_round
  );
  const isHost = Boolean(user);

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

  // Compute detective accuracy stats across rounds
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
    }
  >();

  const suspectVotesOverall = new Map<string, { suspectCharId: string; suspectName: string; count: number }>();

  for (const sub of session.submissions) {
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
    };

    existing.totalVotes += 1;
    existing.suspectsChosen.add(sub.suspectCharId);
    existing.uniqueSuspectsCount = existing.suspectsChosen.size;

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
    .map(({ suspectsChosen, ...rest }) => ({
      ...rest,
      accuracyPercent: rest.totalVotes > 0 ? Math.round((rest.correctVotes / rest.totalVotes) * 100) : 0,
    }))
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
  }

  session.claimedCharacters = claims;
  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  revalidatePath(`/play/${mysteryId}`);
  return {
    success: true,
    claimedCharacters: claims,
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

  const newEntry: RoundSubmission = {
    id: `${payload.round}-${payload.voterCharId}-${Date.now()}`,
    round: payload.round,
    voterCharId: payload.voterCharId,
    voterName: payload.voterName,
    suspectCharId: payload.suspectCharId,
    suspectName: payload.suspectName,
    reason: payload.reason.trim() || 'Acting suspicious!',
    submittedAt: new Date().toISOString(),
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

  if (!user) {
    return { error: 'Please log into your host account to control the game flow.' };
  }

  if (typeof updates.currentRound === 'number') {
    await supabase
      .from('mysteries')
      .update({ current_round: Math.floor(updates.currentRound) })
      .eq('id', mysteryId);
  }

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
    mysteryId,
    Math.floor(updates.currentRound ?? 0)
  );

  if (typeof updates.currentRound === 'number') {
    session.currentRound = updates.currentRound;
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
  }

  await writeSessionToCarrier(supabase, mysteryId, carrierCharacter, session);

  // Also keep cached mystery current_round updated
  const cachedMystery = getCachedMysterySnapshot(mysteryId);
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
}) {
  const supabase = await createClient();
  const cleanName = payload.playerName.trim() || 'Mystery Guest';
  const rating = Math.min(5, Math.max(1, Math.round(payload.rating || 5)));
  const cleanComment = payload.comment.trim();
  const commentText = cleanComment
    ? `[${payload.mysteryTitle}${payload.characterRole ? ` • Played ${payload.characterRole}` : ''}] ${cleanComment}`
    : `Played ${payload.mysteryTitle}${payload.characterRole ? ` as ${payload.characterRole}` : ''} - ${rating}/5 stars!`;

  const reviewEntry: GuestReviewItem = {
    id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mysteryId: payload.mysteryId,
    playerName: cleanName,
    characterRole: payload.characterRole || 'Sleuth',
    rating,
    comment: cleanComment || `Loved playing ${payload.mysteryTitle}!`,
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
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const state = await checkAndFinalizeGenerationIfDue({
    mysteryId: payload.mysteryId,
    slug: payload.slug || payload.mysteryId,
    mysteryTitle: payload.mysteryTitle,
    customerEmail: user?.email || null,
    customerName: (user?.user_metadata?.full_name as string) || null,
    locale: payload.locale || 'en',
  });

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

