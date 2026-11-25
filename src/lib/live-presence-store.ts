import fs from 'fs';
import path from 'path';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';

export type VisitorStage =
  | 'browsing'
  | 'inspecting_mystery'
  | 'casting_or_prep'
  | 'live_playroom'
  | 'checkout';

export interface LiveVisitorSession {
  sessionId: string;
  path: string;
  stage: VisitorStage;
  stageLabel: string;
  countryCode: string;
  city: string;
  lat: number | null;
  lon: number | null;
  device: 'mobile' | 'tablet' | 'desktop';
  referrerSource: string;
  firstSeenAt: number;
  lastSeenAt: number;
}

export interface CityGeoPin {
  key: string; // e.g. "London, GB"
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  visitors: number;
  lastSeenAt: number;
}

export interface LivePresenceStoreData {
  sessions: Record<string, LiveVisitorSession>;
  cityPins: Record<string, CityGeoPin>;
  funnelCounts: {
    browsing: number;
    inspecting_mystery: number;
    checkout: number;
    casting_or_prep: number;
    live_playroom: number;
  };
  updatedAt: string;
}

const STORE_FILE = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  'data',
  'live-presence.json'
);

const LIVE_WINDOW_MS = 3 * 60 * 1000; // 3 minutes = actively on site right now
const RECENT_30M_WINDOW_MS = 30 * 60 * 1000; // 30 minutes = GA4 realtime window

function createEmptyStore(): LivePresenceStoreData {
  return {
    sessions: {},
    cityPins: {},
    funnelCounts: {
      browsing: 0,
      inspecting_mystery: 0,
      checkout: 0,
      casting_or_prep: 0,
      live_playroom: 0,
    },
    updatedAt: '',
  };
}

export function classifyPathStage(rawPath: string): {
  stage: VisitorStage;
  stageLabel: string;
} {
  const clean = (rawPath || '/').toLowerCase();
  if (/\/play\//.test(clean)) {
    return { stage: 'live_playroom', stageLabel: '🎲 Playing Live Mystery' };
  }
  if (/\/cast(\/|$)/.test(clean) || /prep=1/.test(clean)) {
    return { stage: 'casting_or_prep', stageLabel: '🎭 Casting & Guest Prep' };
  }
  if (/\/checkout|\/cart|\/subscribe/.test(clean)) {
    return { stage: 'checkout', stageLabel: '💳 In Checkout' };
  }
  if (/\/mysteries\/|\/themes|\/custom-murder-mystery/.test(clean)) {
    return { stage: 'inspecting_mystery', stageLabel: '🔍 Exploring Mystery Packs' };
  }
  return { stage: 'browsing', stageLabel: '📖 Browsing Site / Blog' };
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    return createSupabaseClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

function readLocalPresenceStore(): LivePresenceStoreData {
  try {
    if ((globalThis as any).__BPM_LIVE_PRESENCE_STORE) {
      return (globalThis as any).__BPM_LIVE_PRESENCE_STORE;
    }
    if (fs.existsSync(STORE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        return {
          sessions: parsed.sessions || {},
          cityPins: parsed.cityPins || {},
          funnelCounts: {
            browsing: parsed.funnelCounts?.browsing || 0,
            inspecting_mystery: parsed.funnelCounts?.inspecting_mystery || 0,
            checkout: parsed.funnelCounts?.checkout || 0,
            casting_or_prep: parsed.funnelCounts?.casting_or_prep || 0,
            live_playroom: parsed.funnelCounts?.live_playroom || 0,
          },
          updatedAt: parsed.updatedAt || '',
        };
      }
    }
  } catch {}
  return createEmptyStore();
}

function writeLocalPresenceStore(data: LivePresenceStoreData): void {
  (globalThis as any).__BPM_LIVE_PRESENCE_STORE = data;
  try {
    const dir = path.dirname(STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {}
}

export async function getMergedLivePresenceStore(): Promise<LivePresenceStoreData> {
  const local = readLocalPresenceStore();
  try {
    const srv = getServiceClient();
    const supabase = srv || (await createClient());
    const { data } = await (supabase as any)
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'live_presence_telemetry')
      .maybeSingle();

    const remote = data?.config_json as LivePresenceStoreData | undefined;
    if (!remote) return local;

    const merged: LivePresenceStoreData = {
      sessions: { ...(remote.sessions || {}), ...(local.sessions || {}) },
      cityPins: { ...(remote.cityPins || {}), ...(local.cityPins || {}) },
      funnelCounts: {
        browsing: Math.max(remote.funnelCounts?.browsing || 0, local.funnelCounts?.browsing || 0),
        inspecting_mystery: Math.max(
          remote.funnelCounts?.inspecting_mystery || 0,
          local.funnelCounts?.inspecting_mystery || 0
        ),
        checkout: Math.max(remote.funnelCounts?.checkout || 0, local.funnelCounts?.checkout || 0),
        casting_or_prep: Math.max(
          remote.funnelCounts?.casting_or_prep || 0,
          local.funnelCounts?.casting_or_prep || 0
        ),
        live_playroom: Math.max(
          remote.funnelCounts?.live_playroom || 0,
          local.funnelCounts?.live_playroom || 0
        ),
      },
      updatedAt:
        (remote.updatedAt || '') > (local.updatedAt || '')
          ? remote.updatedAt
          : local.updatedAt,
    };

    // Keep most recent lastSeenAt for sessions present in both
    for (const [sid, rSess] of Object.entries(remote.sessions || {})) {
      const lSess = local.sessions[sid];
      if (!lSess || (rSess?.lastSeenAt || 0) >= (lSess?.lastSeenAt || 0)) {
        merged.sessions[sid] = rSess;
      }
    }

    return merged;
  } catch {
    return local;
  }
}

export async function recordVisitorPresenceHeartbeat(input: {
  sessionId: string;
  path: string;
  countryCode: string;
  city: string;
  lat: number | null;
  lon: number | null;
  device: 'mobile' | 'tablet' | 'desktop';
  referrerSource: string;
}): Promise<void> {
  const now = Date.now();
  const store = await getMergedLivePresenceStore();

  // Prune sessions older than 2 hours to keep JSON payload tiny
  for (const [sid, sess] of Object.entries(store.sessions)) {
    if (now - (sess.lastSeenAt || 0) > 2 * 60 * 60 * 1000) {
      delete store.sessions[sid];
    }
  }

  const prev = store.sessions[input.sessionId];
  const { stage, stageLabel } = classifyPathStage(input.path);

  // Increment funnel stage counter the first time a session hits a stage
  if (!prev || prev.stage !== stage) {
    store.funnelCounts[stage] = (store.funnelCounts[stage] || 0) + 1;
  }

  store.sessions[input.sessionId] = {
    sessionId: input.sessionId,
    path: input.path || '/',
    stage,
    stageLabel,
    countryCode: (input.countryCode || 'GB').toUpperCase(),
    city: input.city || '',
    lat: input.lat ?? prev?.lat ?? null,
    lon: input.lon ?? prev?.lon ?? null,
    device: input.device || 'desktop',
    referrerSource: input.referrerSource || prev?.referrerSource || 'Direct',
    firstSeenAt: prev?.firstSeenAt || now,
    lastSeenAt: now,
  };

  if (
    input.city &&
    input.countryCode &&
    input.lat !== null &&
    input.lon !== null &&
    Number.isFinite(input.lat) &&
    Number.isFinite(input.lon)
  ) {
    const pinKey = `${input.city}, ${input.countryCode.toUpperCase()}`;
    const prevPin = store.cityPins[pinKey];
    const isNewSessionForPin = !prev;
    store.cityPins[pinKey] = {
      key: pinKey,
      city: input.city,
      countryCode: input.countryCode.toUpperCase(),
      lat: input.lat,
      lon: input.lon,
      visitors: (prevPin?.visitors || 0) + (isNewSessionForPin ? 1 : 0),
      lastSeenAt: now,
    };
  }

  store.updatedAt = new Date(now).toISOString();
  writeLocalPresenceStore(store);

  try {
    const srv = getServiceClient();
    const supabase = srv || (await createClient());
    await (supabase as any).from('platform_settings').upsert(
      {
        id: 'live_presence_telemetry',
        config_json: store,
        updated_at: store.updatedAt,
        updated_by: 'live-presence-tracker',
      },
      { onConflict: 'id' }
    );
  } catch {}
}

export interface LivePresenceSnapshot {
  activeRightNowCount: number; // last 3 mins
  activeLast30MinCount: number; // last 30 mins
  liveVisitors: LiveVisitorSession[];
  recentVisitors30m: LiveVisitorSession[];
  cityPins: CityGeoPin[];
  funnelCounts: LivePresenceStoreData['funnelCounts'];
}

export async function getLivePresenceSnapshot(): Promise<LivePresenceSnapshot> {
  const now = Date.now();
  const store = await getMergedLivePresenceStore();
  const allSessions = Object.values(store.sessions || {}).sort(
    (a, b) => (b.lastSeenAt || 0) - (a.lastSeenAt || 0)
  );

  const liveVisitors = allSessions.filter(
    (s) => now - (s.lastSeenAt || 0) <= LIVE_WINDOW_MS
  );
  const recentVisitors30m = allSessions.filter(
    (s) => now - (s.lastSeenAt || 0) <= RECENT_30M_WINDOW_MS
  );

  const cityPins = Object.values(store.cityPins || {}).sort(
    (a, b) => b.visitors - a.visitors
  );

  return {
    activeRightNowCount: liveVisitors.length,
    activeLast30MinCount: recentVisitors30m.length,
    liveVisitors,
    recentVisitors30m,
    cityPins,
    funnelCounts: store.funnelCounts,
  };
}
