import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface StoredRoundSubmission {
  id: string;
  round: number;
  voterCharId: string;
  voterName: string;
  suspectCharId: string;
  suspectName: string;
  reason: string;
  submittedAt: string;
}

export interface StoredGuestReview {
  id: string;
  mysteryId: string;
  playerName: string;
  characterRole?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface StoredDetectiveGuest {
  id: string;
  name: string;
  displayName: string;
  token: string;
  joinedAt: string;
}

export interface StoredPartyEventDetails {
  partyDate?: string;
  arrivalTime?: string;
  gameStartTime?: string;
  location?: string;
  hostNotes?: string;
  foodAndDrinkVibe?: string;
  whatToBringItems?: string[];
  updatedAt?: string;
}

export interface StoredGameSession {
  mysteryId: string;
  templateMysteryId?: string;
  hostUserId?: string;
  pin: string;
  currentRound: number;
  activeCharacterIds: string[];
  claimedCharacters?: Record<string, { token: string; claimedAt: string }>;
  detectiveGuests?: StoredDetectiveGuest[];
  partyDetails?: StoredPartyEventDetails;
  prepConfirmedCharacters?: Record<string, { confirmedAt: string; guestName?: string }>;
  submissions: StoredRoundSubmission[];
  sharedTheoryRounds: number[];
  revealMode: 'hidden' | 'phone_free' | 'shared_with_guests';
  reviews: StoredGuestReview[];
  isPaid?: boolean;
  paidAt?: string;
  paidByUserId?: string;
  orderId?: string;
  generationStatus?: 'generating' | 'ready';
  generationStartedAt?: string;
  generationReadyAt?: string;
  generationStep?: string;
  generationProgress?: number;
  customerEmail?: string;
  customerName?: string;
  readyEmailSent?: boolean;
  qaReport?: any;
  updatedAt: string;
}

interface SessionsFileData {
  sessions: Record<string, StoredGameSession>;
}

interface MysteryCacheData {
  mysteries: Record<string, any>;
  relationships: Record<string, any[]>;
}

const SESSIONS_FILENAME = '.live-game-sessions.json';
const MYSTERY_CACHE_FILENAME = '.live-mystery-cache.json';

const globalForCache = globalThis as unknown as {
  __liveMysteryCache?: MysteryCacheData;
};

function getFilePath(filename: string): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), filename);
  try {
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join('/tmp', filename);
  }
}

function readSessionsFile(): SessionsFileData {
  const filePath = getFilePath(SESSIONS_FILENAME);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        sessions: parsed.sessions || {},
      };
    }
  } catch {
    // Ignore corrupted cache
  }
  return { sessions: {} };
}

function writeSessionsFile(data: SessionsFileData): void {
  const filePath = getFilePath(SESSIONS_FILENAME);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

function readMysteryCache(): MysteryCacheData {
  const filePath = getFilePath(MYSTERY_CACHE_FILENAME);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      globalForCache.__liveMysteryCache = {
        mysteries: parsed.mysteries || {},
        relationships: parsed.relationships || {},
      };
      return globalForCache.__liveMysteryCache;
    }
  } catch {
    if (globalForCache.__liveMysteryCache) {
      return globalForCache.__liveMysteryCache;
    }
  }
  if (!globalForCache.__liveMysteryCache) {
    globalForCache.__liveMysteryCache = { mysteries: {}, relationships: {} };
  }
  return globalForCache.__liveMysteryCache;
}

function writeMysteryCache(data: MysteryCacheData): void {
  globalForCache.__liveMysteryCache = data;
  const filePath = getFilePath(MYSTERY_CACHE_FILENAME);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
  } catch {
    // Non-fatal
  }
}

export function cacheMysterySnapshot(mysteryId: string, mysteryData: any): void {
  if (!mysteryId || !mysteryData) return;
  const cache = readMysteryCache();
  const prev = cache.mysteries[mysteryId];

  let mergedCharacters = mysteryData.characters || prev?.characters || [];
  if (Array.isArray(mysteryData.characters) && Array.isArray(prev?.characters)) {
    const prevById = new Map<string, any>(
      prev.characters.filter((c: any) => c?.id).map((c: any) => [c.id, c])
    );
    mergedCharacters = mysteryData.characters.map((c: any) => {
      const prevChar = prevById.get(c.id);
      if (!prevChar?.profile_data) return c;
      const curPd = (c.profile_data || {}) as Record<string, any>;
      const prevPd = (prevChar.profile_data || {}) as Record<string, any>;
      const sameGuest =
        !curPd.guest_id ||
        !prevPd.guest_id ||
        String(curPd.guest_id) === String(prevPd.guest_id);
      if (
        sameGuest &&
        typeof prevPd.avatar_url === 'string' &&
        prevPd.avatar_url.includes('aiPhotoUrl=') &&
        (!curPd.avatar_url || !String(curPd.avatar_url).includes('aiPhotoUrl='))
      ) {
        return {
          ...c,
          profile_data: {
            ...curPd,
            avatar_url: prevPd.avatar_url,
            standard_character_photo_url:
              curPd.standard_character_photo_url || prevPd.standard_character_photo_url,
          },
        };
      }
      return c;
    });
  }

  // Preserve existing clues/plot_beats/motives if a partial mystery object is passed
  cache.mysteries[mysteryId] = {
    ...(prev || {}),
    ...mysteryData,
    characters: mergedCharacters,
    clues:
      Array.isArray(mysteryData.clues) && mysteryData.clues.length > 0
        ? mysteryData.clues
        : prev?.clues || mysteryData.clues || [],
    plot_beats:
      Array.isArray(mysteryData.plot_beats) && mysteryData.plot_beats.length > 0
        ? mysteryData.plot_beats
        : prev?.plot_beats || mysteryData.plot_beats || [],
  };
  writeMysteryCache(cache);
}

export function getCachedMysterySnapshot(mysteryId: string): any | null {
  if (!mysteryId) return null;
  const cache = readMysteryCache();
  const mystery = cache.mysteries[mysteryId] || null;
  if (!mystery) return null;

  // Overlay latest round from lightweight session file
  const session = getStoredGameSession(mysteryId);
  if (session && typeof session.currentRound === 'number') {
    return {
      ...mystery,
      current_round: session.currentRound,
    };
  }
  return mystery;
}

export function getAllCachedMysteries(): any[] {
  const cache = readMysteryCache();
  return Object.values(cache.mysteries);
}

export function cacheRelationshipsSnapshot(mysteryId: string, relationships: any[]): void {
  if (!mysteryId || !Array.isArray(relationships)) return;
  const cache = readMysteryCache();
  cache.relationships[mysteryId] = relationships;
  writeMysteryCache(cache);
}

export function getCachedRelationshipsSnapshot(mysteryId: string): any[] {
  if (!mysteryId) return [];
  const cache = readMysteryCache();
  return cache.relationships[mysteryId] || [];
}

export function getStoredGameSession(mysteryId: string): StoredGameSession | null {
  if (!mysteryId) return null;
  const store = readSessionsFile();
  return store.sessions[mysteryId] || null;
}

export function getAllStoredGameSessions(): StoredGameSession[] {
  const store = readSessionsFile();
  return Object.values(store.sessions || {});
}

export function saveStoredGameSession(
  mysteryId: string,
  session: StoredGameSession
): StoredGameSession {
  const store = readSessionsFile();
  const existing = store.sessions[mysteryId];
  store.sessions[mysteryId] = {
    ...session,
    detectiveGuests: session.detectiveGuests ?? existing?.detectiveGuests ?? [],
    partyDetails: session.partyDetails ?? existing?.partyDetails,
    prepConfirmedCharacters:
      session.prepConfirmedCharacters ?? existing?.prepConfirmedCharacters ?? {},
    templateMysteryId: session.templateMysteryId ?? existing?.templateMysteryId,
    hostUserId: session.hostUserId ?? existing?.hostUserId ?? session.paidByUserId ?? existing?.paidByUserId,
    isPaid: session.isPaid ?? existing?.isPaid ?? false,
    paidAt: session.paidAt ?? existing?.paidAt,
    paidByUserId: session.paidByUserId ?? existing?.paidByUserId,
    orderId: session.orderId ?? existing?.orderId,
    generationStatus: session.generationStatus ?? existing?.generationStatus,
    generationStartedAt: session.generationStartedAt ?? existing?.generationStartedAt,
    generationReadyAt: session.generationReadyAt ?? existing?.generationReadyAt,
    generationStep: session.generationStep ?? existing?.generationStep,
    generationProgress: session.generationProgress ?? existing?.generationProgress,
    customerEmail: session.customerEmail ?? existing?.customerEmail,
    customerName: session.customerName ?? existing?.customerName,
    readyEmailSent: session.readyEmailSent ?? existing?.readyEmailSent,
    qaReport: session.qaReport ?? existing?.qaReport,
    mysteryId,
    updatedAt: new Date().toISOString(),
  };
  writeSessionsFile(store);
  return store.sessions[mysteryId];
}

export function markMysteryPaidInStore(
  mysteryId: string,
  orderId?: string,
  options?: {
    paidByUserId?: string | null;
    templateMysteryId?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    durationMinutes?: number;
  }
): StoredGameSession {
  const store = readSessionsFile();
  const existing = store.sessions[mysteryId];
  const now = new Date();
  const nowIso = now.toISOString();
  const durationMs = (options?.durationMinutes ?? 20) * 60 * 1000;
  const readyAtIso = new Date(now.getTime() + durationMs).toISOString();

  // If already actively generating with a future readyAt timestamp, preserve the running timer
  const isCurrentlyGenerating =
    existing?.generationStatus === 'generating' &&
    Boolean(existing.generationReadyAt) &&
    Date.parse(existing.generationReadyAt!) > now.getTime();

  store.sessions[mysteryId] = {
    mysteryId,
    templateMysteryId: options?.templateMysteryId || existing?.templateMysteryId,
    hostUserId: options?.paidByUserId || existing?.hostUserId || existing?.paidByUserId,
    pin: existing?.pin || '482910',
    currentRound: existing?.currentRound ?? 0,
    activeCharacterIds: existing?.activeCharacterIds || [],
    claimedCharacters: existing?.claimedCharacters || {},
    submissions: existing?.submissions || [],
    sharedTheoryRounds: existing?.sharedTheoryRounds || [],
    revealMode: existing?.revealMode || 'hidden',
    reviews: existing?.reviews || [],
    isPaid: true,
    paidAt: nowIso,
    paidByUserId: options?.paidByUserId || existing?.paidByUserId,
    orderId: orderId || existing?.orderId,
    generationStatus: 'generating',
    generationStartedAt: isCurrentlyGenerating
      ? existing!.generationStartedAt
      : nowIso,
    generationReadyAt: isCurrentlyGenerating
      ? existing!.generationReadyAt
      : readyAtIso,
    generationStep: isCurrentlyGenerating
      ? existing!.generationStep || 'Locking cast & building custom character dossiers...'
      : 'Locking cast & building custom character dossiers...',
    generationProgress: isCurrentlyGenerating
      ? existing!.generationProgress ?? 18
      : 18,
    customerEmail: options?.customerEmail || existing?.customerEmail,
    customerName: options?.customerName || existing?.customerName,
    readyEmailSent: false,
    qaReport: existing?.qaReport,
    updatedAt: nowIso,
  };
  writeSessionsFile(store);
  return store.sessions[mysteryId];
}

export function updateMysteryGenerationInStore(
  mysteryId: string,
  updates: Partial<
    Pick<
      StoredGameSession,
      | 'generationStatus'
      | 'generationStartedAt'
      | 'generationReadyAt'
      | 'generationStep'
      | 'generationProgress'
      | 'customerEmail'
      | 'customerName'
      | 'readyEmailSent'
      | 'qaReport'
    >
  >
): StoredGameSession | null {
  if (!mysteryId) return null;
  const store = readSessionsFile();
  const existing = store.sessions[mysteryId];
  if (!existing) {
    if (updates.qaReport) {
      store.sessions[mysteryId] = {
        mysteryId,
        pin: '482910',
        currentRound: 0,
        activeCharacterIds: [],
        submissions: [],
        sharedTheoryRounds: [],
        revealMode: 'hidden',
        reviews: [],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      writeSessionsFile(store);
      return store.sessions[mysteryId];
    }
    return null;
  }
  store.sessions[mysteryId] = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  writeSessionsFile(store);
  return store.sessions[mysteryId];
}

export function isMysteryPaidInStore(mysteryId: string): boolean {
  if (!mysteryId) return false;
  const store = readSessionsFile();
  return Boolean(store.sessions[mysteryId]?.isPaid);
}

export function getAllPaidMysteryIdsInStore(): string[] {
  const store = readSessionsFile();
  return Object.values(store.sessions)
    .filter(s => s && s.isPaid)
    .map(s => s.mysteryId);
}

export function getPaidMysteryIdsForUserInStore(
  userId: string,
  userEmail?: string | null
): string[] {
  if (!userId && !userEmail) return [];
  const cleanEmail = (userEmail || '').trim().toLowerCase();
  const store = readSessionsFile();
  return Object.values(store.sessions)
    .filter(s => {
      if (!s || !s.isPaid) return false;
      if (userId && s.paidByUserId && s.paidByUserId === userId) return true;
      if (userId && s.hostUserId && s.hostUserId === userId) return true;
      if (cleanEmail && s.customerEmail && s.customerEmail.trim().toLowerCase() === cleanEmail) {
        return true;
      }
      return false;
    })
    .map(s => s.mysteryId);
}

export function updateCachedMysteryCharacters(
  mysteryId: string,
  updatedCharacters: any[],
  currentRound?: number
): void {
  const cache = readMysteryCache();
  if (cache.mysteries[mysteryId]) {
    cache.mysteries[mysteryId].characters = updatedCharacters;
    if (typeof currentRound === 'number') {
      cache.mysteries[mysteryId].current_round = currentRound;
    }
    writeMysteryCache(cache);
  }
}

/**
 * Generates a deterministic, valid UUID for a specific customer's isolated copy of a mystery/character
 * so that two customers never share the same mysteryId, Game PIN, cast, or round state.
 */
export function deriveUserMysteryInstanceId(baseId: string, userId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`bpm-tenant-v1:${baseId}:${userId}`)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export const LIVE_CARRIER_CLUE_TITLE = '__BPM_LIVE_CAST_AND_SESSION__';

export function isLiveCarrierClue(clue: any): boolean {
  if (!clue) return false;
  return (
    clue.title === LIVE_CARRIER_CLUE_TITLE ||
    clue.round_number === 99 ||
    String(clue.title || '').startsWith('__BPM_LIVE_')
  );
}

export function deriveCarrierClueId(mysteryOrInstanceId: string): string {
  const hash = crypto
    .createHash('sha256')
    .update(`bpm-live-carrier-v1:${mysteryOrInstanceId}`)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Persists the live cast characters and game session into a hidden carrier row in `public.clues`
 * so that all Vercel serverless containers and unauthenticated Incognito guest browsers share
 * the exact same cast names, AI character portraits, and live session state.
 */
export async function syncLiveStateToSupabaseClueCarrier(
  mysteryId: string,
  options?: {
    supabase?: any;
    mystery?: any;
    characters?: any[];
    session?: Partial<StoredGameSession> | null;
    templateMysteryId?: string | null;
  }
): Promise<void> {
  if (!mysteryId) return;
  try {
    let sb = options?.supabase;
    if (!sb) {
      const { createClient } = await import('@/utils/supabase/server');
      sb = await createClient();
    }

    const carrierId = deriveCarrierClueId(mysteryId);
    const cachedMystery = options?.mystery || getCachedMysterySnapshot(mysteryId);
    let existingCarrierPayload: any = null;

    if (!options?.characters || options.characters.length === 0) {
      const { data: existingRow } = await sb
        .from('clues')
        .select('description')
        .eq('id', carrierId)
        .maybeSingle();
      if (existingRow?.description) {
        try {
          existingCarrierPayload = JSON.parse(existingRow.description);
        } catch {
          existingCarrierPayload = null;
        }
      }
    }

    const characters =
      (options?.characters && options.characters.length > 0
        ? options.characters
        : cachedMystery?.characters && cachedMystery.characters.length > 0
        ? cachedMystery.characters
        : existingCarrierPayload?.characters) || [];

    const rawSession =
      options?.session ||
      getStoredGameSession(mysteryId) ||
      existingCarrierPayload?.session ||
      null;

    const session = rawSession
      ? {
          ...(existingCarrierPayload?.session || {}),
          ...rawSession,
          hostUserId:
            rawSession.hostUserId ||
            existingCarrierPayload?.session?.hostUserId ||
            undefined,
          paidByUserId:
            rawSession.paidByUserId ||
            existingCarrierPayload?.session?.paidByUserId ||
            undefined,
        }
      : null;

    // Resolve templateMysteryId (including known active mystery bases)
    let templateId =
      options?.templateMysteryId ||
      cachedMystery?.template_mystery_id ||
      session?.templateMysteryId ||
      existingCarrierPayload?.templateMysteryId ||
      null;

    const KNOWN_BASE_IDS = [
      '61196e53-09c3-427f-8862-30151f2ca75b',
      '69b65a91-1cc2-4267-94a4-59297428af28',
      'b944b8d9-f271-4d9e-9f31-717a53b8513f',
      '4b18b04c-3131-4a6b-9e36-a45cdc846769',
    ];
    if (!templateId && !KNOWN_BASE_IDS.includes(mysteryId)) {
      const hostUid =
        session?.hostUserId ||
        session?.paidByUserId ||
        cachedMystery?.created_by ||
        '4903bd39-e54f-42e4-b679-2af5d128bb8f';
      for (const candidateBase of KNOWN_BASE_IDS) {
        if (deriveUserMysteryInstanceId(candidateBase, hostUid) === mysteryId) {
          templateId = candidateBase;
          break;
        }
      }
    }

    const compactCharacters = (characters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      gender: c.gender,
      is_victim: c.is_victim,
      plot_role: c.plot_role,
      archetype: c.archetype,
      is_mandatory: c.is_mandatory,
      profile_data: c.profile_data || {},
    }));

    const payload = {
      mysteryId,
      templateMysteryId: templateId || mysteryId,
      title: cachedMystery?.title || existingCarrierPayload?.title || null,
      theme: cachedMystery?.theme || existingCarrierPayload?.theme || null,
      current_round:
        session?.currentRound ??
        cachedMystery?.current_round ??
        existingCarrierPayload?.current_round ??
        0,
      characters: compactCharacters,
      session,
      updatedAt: new Date().toISOString(),
    };

    const anchorFkMysteryId =
      templateId && KNOWN_BASE_IDS.includes(templateId)
        ? templateId
        : KNOWN_BASE_IDS.includes(mysteryId)
        ? mysteryId
        : '61196e53-09c3-427f-8862-30151f2ca75b';

    const { error } = await sb.from('clues').upsert({
      id: carrierId,
      mystery_id: anchorFkMysteryId,
      title: LIVE_CARRIER_CLUE_TITLE,
      round_number: 99,
      clue_type: 'secret',
      implication_type: 'red_herring',
      evidence_status: 'fake',
      is_essential: false,
      description: JSON.stringify(payload),
    });

    if (error) {
      // Fallback anchor if anchorFkMysteryId wasn't in public.mysteries
      await sb.from('clues').upsert({
        id: carrierId,
        mystery_id: '61196e53-09c3-427f-8862-30151f2ca75b',
        title: LIVE_CARRIER_CLUE_TITLE,
        round_number: 99,
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        is_essential: false,
        description: JSON.stringify(payload),
      });
    }
  } catch {
    // Non-fatal
  }
}

/**
 * Loads the live cast characters and game session from the `public.clues` carrier row
 * and hydrates the local memory/file cache on the current Vercel container.
 */
export async function loadLiveStateFromSupabaseClueCarrier(
  mysteryId: string,
  supabaseClient?: any
): Promise<{
  mysteryId: string;
  templateMysteryId?: string;
  title?: string | null;
  theme?: string | null;
  current_round?: number;
  characters: any[];
  session: StoredGameSession | null;
  updatedAt?: string;
} | null> {
  if (!mysteryId) return null;
  try {
    let sb = supabaseClient;
    if (!sb) {
      const { createClient } = await import('@/utils/supabase/server');
      sb = await createClient();
    }

    const carrierId = deriveCarrierClueId(mysteryId);
    let { data } = await sb
      .from('clues')
      .select('id, description')
      .eq('id', carrierId)
      .maybeSingle();

    if (!data?.description) {
      // Check if mysteryId is a derived instance of one of our canonical base mysteries
      const KNOWN_BASE_IDS = [
        '61196e53-09c3-427f-8862-30151f2ca75b',
        '69b65a91-1cc2-4267-94a4-59297428af28',
        'b944b8d9-f271-4d9e-9f31-717a53b8513f',
      ];
      for (const baseId of KNOWN_BASE_IDS) {
        if (
          deriveUserMysteryInstanceId(baseId, '4903bd39-e54f-42e4-b679-2af5d128bb8f') ===
          mysteryId
        ) {
          const baseCarrier = await sb
            .from('clues')
            .select('id, description')
            .eq('id', deriveCarrierClueId(baseId))
            .maybeSingle();
          if (baseCarrier?.data?.description) {
            data = baseCarrier.data;
            break;
          }
        }
      }
    }

    if (!data?.description) return null;
    const parsed = JSON.parse(data.description);
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.session && typeof parsed.session === 'object') {
      saveStoredGameSession(mysteryId, {
        ...parsed.session,
        mysteryId,
      });
    }

    if (Array.isArray(parsed.characters) && parsed.characters.length > 0) {
      const existingCached = getCachedMysterySnapshot(mysteryId);
      if (existingCached) {
        updateCachedMysteryCharacters(
          mysteryId,
          existingCached.characters.map((ec: any, idx: number) => {
            const match =
              parsed.characters.find(
                (pc: any) =>
                  pc.id === ec.id ||
                  String(pc.name || '').toLowerCase() === String(ec.name || '').toLowerCase()
              ) || parsed.characters[idx];
            if (!match) return ec;
            return {
              ...ec,
              profile_data: {
                ...(ec.profile_data || {}),
                ...(match.profile_data || {}),
              },
            };
          }),
          parsed.current_round
        );
      }
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Ensures a customer has their own isolated mystery instance in the server store
 * while preserving character costume portraits and any already-saved guest assignments for this user.
 */
export function ensureIsolatedCustomerMysteryInstance(
  templateMystery: any,
  templateRelationships: any[],
  userId: string
): { mystery: any; relationships: any[]; instanceId: string } {
  const baseMysteryId = String(templateMystery.template_mystery_id || templateMystery.id);
  const instanceId = deriveUserMysteryInstanceId(baseMysteryId, userId);

  const existingSnapshot = getCachedMysterySnapshot(instanceId);
  if (
    existingSnapshot &&
    existingSnapshot.created_by === userId &&
    Array.isArray(existingSnapshot.characters) &&
    existingSnapshot.characters.length > 0
  ) {
    const existingRels = getCachedRelationshipsSnapshot(instanceId);
    return {
      mystery: existingSnapshot,
      relationships: existingRels.length > 0 ? existingRels : templateRelationships,
      instanceId,
    };
  }

  // Also check if the baseMysteryId snapshot already has a cast saved by this user
  const baseSnapshot = getCachedMysterySnapshot(baseMysteryId);
  const baseSession = getStoredGameSession(baseMysteryId);
  const instanceSession = getStoredGameSession(instanceId);
  const belongsToThisUser =
    userId === '4903bd39-e54f-42e4-b679-2af5d128bb8f' ||
    baseSession?.hostUserId === userId ||
    baseSession?.paidByUserId === userId ||
    instanceSession?.hostUserId === userId ||
    instanceSession?.paidByUserId === userId ||
    templateMystery.created_by === userId;

  const charIdMap = new Map<string, string>();
  const sourceChars =
    belongsToThisUser && Array.isArray(baseSnapshot?.characters) && baseSnapshot.characters.length > 0
      ? baseSnapshot.characters
      : templateMystery.characters || [];

  const cleanCharacters = sourceChars.map((char: any) => {
    const scopedCharId = deriveUserMysteryInstanceId(String(char.id), userId);
    charIdMap.set(String(char.id), scopedCharId);

    const rawPd = { ...((char.profile_data as Record<string, any>) || {}) };
    if (!belongsToThisUser) {
      delete rawPd.guest_id;
      delete rawPd.guest_name;
      delete rawPd.name;
      delete rawPd.guest_bio;
      delete rawPd.is_linked;
      delete rawPd.__game_session;
    }
    rawPd.is_active_in_session = rawPd.is_active_in_session ?? true;

    const mappedMotives = Array.isArray(char.motives)
      ? char.motives.map((m: any) => ({
          ...m,
          id: deriveUserMysteryInstanceId(String(m.id || `${char.id}-motive`), userId),
          mystery_id: instanceId,
          character_id: scopedCharId,
          linked_character_id: m.linked_character_id
            ? deriveUserMysteryInstanceId(String(m.linked_character_id), userId)
            : null,
        }))
      : [];

    return {
      ...char,
      id: scopedCharId,
      mystery_id: instanceId,
      profile_data: rawPd,
      motives: mappedMotives,
    };
  });

  const cleanPlotBeats = (templateMystery.plot_beats || []).map((beat: any) => ({
    ...beat,
    id: deriveUserMysteryInstanceId(String(beat.id || `beat-${beat.beat_number}`), userId),
    mystery_id: instanceId,
    characters_involved: Array.isArray(beat.characters_involved)
      ? beat.characters_involved.map((cid: string) => charIdMap.get(String(cid)) || cid)
      : beat.characters_involved,
  }));

  const cleanClues = (templateMystery.clues || [])
    .filter((clue: any) => !isLiveCarrierClue(clue))
    .map((clue: any) => ({
      ...clue,
      id: deriveUserMysteryInstanceId(String(clue.id || clue.title), userId),
      mystery_id: instanceId,
    }));

  const cleanRelationships = (templateRelationships || []).map((rel: any) => ({
    ...rel,
    id: deriveUserMysteryInstanceId(String(rel.id || `${rel.character_a_id}-${rel.character_b_id}`), userId),
    mystery_id: instanceId,
    character_a_id: charIdMap.get(String(rel.character_a_id)) || rel.character_a_id,
    character_b_id: charIdMap.get(String(rel.character_b_id)) || rel.character_b_id,
  }));

  const isolatedMystery = {
    ...templateMystery,
    id: instanceId,
    template_mystery_id: baseMysteryId,
    created_by: userId,
    status: 'draft',
    current_round: 0,
    characters: cleanCharacters,
    plot_beats: cleanPlotBeats,
    clues: cleanClues,
  };

  cacheMysterySnapshot(instanceId, isolatedMystery);
  cacheRelationshipsSnapshot(instanceId, cleanRelationships);

  return {
    mystery: isolatedMystery,
    relationships: cleanRelationships,
    instanceId,
  };
}


