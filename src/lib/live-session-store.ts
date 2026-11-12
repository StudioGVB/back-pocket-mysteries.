import fs from 'fs';
import path from 'path';

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

export interface StoredGameSession {
  mysteryId: string;
  pin: string;
  currentRound: number;
  activeCharacterIds: string[];
  claimedCharacters?: Record<string, { token: string; claimedAt: string }>;
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

export function saveStoredGameSession(
  mysteryId: string,
  session: StoredGameSession
): StoredGameSession {
  const store = readSessionsFile();
  const existing = store.sessions[mysteryId];
  store.sessions[mysteryId] = {
    ...session,
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
    >
  >
): StoredGameSession | null {
  if (!mysteryId) return null;
  const store = readSessionsFile();
  const existing = store.sessions[mysteryId];
  if (!existing) return null;
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
