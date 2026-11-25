import fs from 'fs';
import path from 'path';
import { Database } from '@/types/database';
import { replaceLegacyNamesWithRoleTokens } from '@/services/mysteries';
import {
  CHRISTMAS_NIGHTMARE_DESCRIPTION,
  CHRISTMAS_NIGHTMARE_THEME,
  CHRISTMAS_NIGHTMARE_TITLE,
  isChristmasNightmareMystery,
} from '@/data/christmas-nightmare';
import {
  CHRISTMAS_CABIN_MOODBOARD,
  CHRISTMAS_MAIN_COVER_URL,
  serializeMysteryImageField,
} from '@/utils/moodboard';
import { requireAdmin } from '@/utils/admin-auth';
import {
  getAllStoredGameSessions,
  getStoredGameSession,
  getCachedMysterySnapshot,
} from '@/lib/live-session-store';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

const qaSummaryMemoryCache = new Map<string, { mtimeMs: number; summary: any }>();

function readLightweightQaSummary(mysteryId: string) {
  try {
    const qaPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'mystery-qa-runs', `${mysteryId}.json`);
    const stat = fs.statSync(qaPath);
    const cached = qaSummaryMemoryCache.get(mysteryId);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return cached.summary;
    }
    const raw = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const pr = raw?.performanceReview;
    if (!pr) return null;
    const checklist = Array.isArray(pr.preLaunchChecklist) ? pr.preLaunchChecklist : [];
    const passedBoxes = checklist.filter((b: any) => b.passed).length;
    const summary = {
      overallReadinessScore: Number(pr.overallReadinessScore || 0),
      certificationStatus: pr.certificationStatus as 'certified' | 'needs_tuning' | 'blocked',
      passedBoxes,
      totalBoxes: checklist.length || 7,
      completedRunsCount: Number(raw.completedRunsCount || 0),
    };
    qaSummaryMemoryCache.set(mysteryId, { mtimeMs: stat.mtimeMs, summary });
    return summary;
  } catch {
    return null;
  }
}

function normalizeMysteryCardSummary(m: any, supabase?: any) {
  if (!m) return m;

  if (isChristmasNightmareMystery(m.title, m.theme)) {
    const needsImageUpgrade =
      !m.image_url ||
      String(m.image_url).startsWith('data:image/') ||
      !String(m.image_url).includes('#moodboard=');
    const nextImageUrl = needsImageUpgrade
      ? serializeMysteryImageField(CHRISTMAS_MAIN_COVER_URL, CHRISTMAS_CABIN_MOODBOARD)
      : m.image_url;
    if (needsImageUpgrade && supabase && m.id && nextImageUrl) {
      void supabase.from('mysteries').update({ image_url: nextImageUrl }).eq('id', m.id);
    }
    return {
      ...m,
      title: CHRISTMAS_NIGHTMARE_TITLE,
      theme: CHRISTMAS_NIGHTMARE_THEME,
      description: CHRISTMAS_NIGHTMARE_DESCRIPTION,
      min_players: 6,
      max_players: 6,
      complexity: 'medium',
      spice_level: 'mild',
      image_url: nextImageUrl,
    };
  }

  // Strip multi-hundred-KB inline base64 data:image/ cover strings (e.g. Ringmaster 800KB base64)
  // and permanently replace them in Supabase so neither Postgres nor RSC serializes 800KB per request.
  if (typeof m.image_url === 'string' && m.image_url.startsWith('data:image/')) {
    const combined = `${m.title || ''} ${m.theme || ''}`.toLowerCase();
    const cleanCoverUrl =
      combined.includes('ringmaster') || combined.includes('circus')
        ? '/moodboard/circus/main-cover.jpg'
        : combined.includes('love on the rocks') || combined.includes('reality')
        ? '/moodboard/lotr/main-promo-murder.jpg'
        : '/hero/05-masquerade.png';

    if (supabase && m.id) {
      void supabase.from('mysteries').update({ image_url: cleanCoverUrl }).eq('id', m.id);
    }
    return {
      ...m,
      image_url: cleanCoverUrl,
    };
  }

  return m;
}

let cachedAdminMysteries: { data: any[]; fetchedAt: number } | null = null;
const ADMIN_MYSTERIES_CACHE_TTL_MS = 15_000;

export function invalidateAdminMysteriesCache(): void {
  cachedAdminMysteries = null;
}

export async function getMysteries() {
  const { supabase } = await requireAdmin();
  const now = Date.now();
  if (cachedAdminMysteries && now - cachedAdminMysteries.fetchedAt < ADMIN_MYSTERIES_CACHE_TTL_MS) {
    return cachedAdminMysteries.data;
  }

  const { data, error } = (await supabase
    .from('mysteries')
    .select('id, title, theme, status, description, image_url, created_at, min_players, max_players, complexity, spice_level, created_by')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching admin mysteries:', error);
    return cachedAdminMysteries?.data || [];
  }

  // Deduplicate canonical Mystery Bases so customer-cloned instances do not clutter the Studio bases grid
  const allLiveSessions = getAllStoredGameSessions();
  const customerInstanceIds = new Set(
    allLiveSessions
      .filter((s) => s.templateMysteryId && s.mysteryId !== s.templateMysteryId)
      .map((s) => s.mysteryId)
  );

  const seenBaseTitles = new Set<string>();
  const filteredRows: any[] = [];
  // Prefer published bases first when deduplicating by title
  const sortedRows = [...(data || [])].sort((a, b) => {
    if (a.status === 'published' && b.status !== 'published') return -1;
    if (b.status === 'published' && a.status !== 'published') return 1;
    return 0;
  });

  for (const row of sortedRows) {
    if (!row?.id || String(row.id).includes('__u_') || customerInstanceIds.has(row.id)) continue;
    const titleKey = String(row.title || '').trim().toLowerCase();
    if (titleKey && seenBaseTitles.has(titleKey)) continue;
    if (titleKey) seenBaseTitles.add(titleKey);
    filteredRows.push(row);
  }

  const result = filteredRows.map((m: any) => {
    const upgraded = normalizeMysteryCardSummary(m, supabase);
    const qaSummary = readLightweightQaSummary(upgraded.id);
    return {
      ...upgraded,
      qaSummary,
      description: upgraded.description
        ? replaceLegacyNamesWithRoleTokens(upgraded.description).replace(/\{\{([A-Za-z0-9\s'._&-]+)\}\}/g, '$1')
        : upgraded.description,
    };
  });

  cachedAdminMysteries = { data: result, fetchedAt: now };
  return result;
}

export async function createMystery(mystery: MysteryInsert) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('mysteries')
    .insert(mystery)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mystery: ${error.message}`);
  }

  invalidateAdminMysteriesCache();
  return data;
}

export async function updateMystery(id: string, updates: Partial<Mystery>) {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from('mysteries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating mystery: ${error.message}`);
  }

  invalidateAdminMysteriesCache();
  return data;
}

const FX_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
  AUD: 0.52,
  CAD: 0.57,
  NZD: 0.47,
};

function convertToGbp(rawAmount: any, rawCurrency?: any): number {
  const num = Number(rawAmount) || 0;
  const major = num > 100 ? num / 100 : num;
  const curr = String(rawCurrency || 'GBP').toUpperCase();
  const rate = FX_TO_GBP[curr] ?? 1;
  return Number((major * rate).toFixed(2));
}

export async function getTransactions() {
  const { supabase } = await requireAdmin();
  const { data: rawOrders, error } = (await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching transactions:', error);
  }

  const dbOrders: any[] = Array.isArray(rawOrders) ? rawOrders : [];

  // Fetch profiles, mysteries, and AI usage logs in parallel without brittle FK join syntax
  const userIds = [...new Set(dbOrders.map((o) => o.user_id).filter(Boolean))];
  const mysteryIds = [...new Set(dbOrders.map((o) => o.mystery_id).filter(Boolean))];

  const [profilesRes, mysteriesRes, aiLogsRes] = await Promise.all([
    userIds.length > 0
      ? supabase
          .from('profiles')
          .select('id, full_name, avatar_url, avatar_config')
          .in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    mysteryIds.length > 0
      ? supabase.from('mysteries').select('id, title, theme').in('id', mysteryIds)
      : Promise.resolve({ data: [] as any[] }),
    (supabase as any)
      .from('ai_usage_logs')
      .select('mystery_id, cost_usd')
      .then((r: any) => r)
      .catch(() => ({ data: [] as any[] })),
  ]);

  const profilesMap = new Map<string, any>();
  for (const p of profilesRes.data || []) {
    profilesMap.set(p.id, p);
  }

  const mysteriesMap = new Map<string, any>();
  for (const m of mysteriesRes.data || []) {
    mysteriesMap.set(m.id, m);
  }

  const aiCostGbpByMystery = new Map<string, number>();
  for (const log of aiLogsRes?.data || []) {
    if (log?.mystery_id) {
      const prev = aiCostGbpByMystery.get(log.mystery_id) || 0;
      aiCostGbpByMystery.set(log.mystery_id, prev + Number(log.cost_usd || 0) * 0.79);
    }
  }

  const seenMysteryIds = new Set<string>();

  const inferPackageTierLabel = (grossGbp: number): string => {
    if (grossGbp >= 28) return 'Unlimited Pass';
    if (grossGbp >= 23) return 'Grand (4–16)';
    if (grossGbp >= 18) return 'Premium (4–10)';
    return 'Basic (4–6)';
  };

  const enrichWithEconomics = (item: any, liveSession?: any, cachedMystery?: any) => {
    const grossGbp = convertToGbp(item.amount, item.currency);
    const isPaid = item.status === 'succeeded' || item.status === 'qa_verified';
    // UK Stripe processing fee default: 1.5% + £0.20 on paid orders
    const stripeFeeGbp =
      isPaid && grossGbp > 0 ? Number((grossGbp * 0.015 + 0.2).toFixed(2)) : 0;
    const aiCostGbp = Number(
      (item.mystery_id ? aiCostGbpByMystery.get(item.mystery_id) || 0 : 0).toFixed(2)
    );
    const netRevenueGbp = isPaid
      ? Number(Math.max(0, grossGbp - stripeFeeGbp - aiCostGbp).toFixed(2))
      : 0;
    const marginPercent =
      isPaid && grossGbp > 0 ? Math.round((netRevenueGbp / grossGbp) * 100) : 0;

    const partyDetails = liveSession?.partyDetails || null;
    const currentRound = Number(liveSession?.currentRound ?? item.mysteries?.current_round ?? 0);
    const prepReadyCount = Object.keys(liveSession?.prepConfirmedCharacters || {}).length;
    const claimedCount = Object.keys(liveSession?.claimedCharacters || {}).length;
    const totalCastCount = Array.isArray(cachedMystery?.characters)
      ? cachedMystery.characters.length
      : 6;

    return {
      ...item,
      grossGbp,
      stripeFeeGbp,
      aiCostGbp,
      netRevenueGbp,
      marginPercent,
      packageTier: inferPackageTierLabel(grossGbp),
      partyDate: partyDetails?.partyDate || null,
      arrivalTime: partyDetails?.arrivalTime || null,
      partyLocation: partyDetails?.location || null,
      currentRound,
      prepReadyCount,
      claimedCount,
      totalCastCount,
    };
  };

  const enrichedOrders = dbOrders.map((order: any) => {
    const mId = order.mystery_id || null;
    if (mId) seenMysteryIds.add(mId);
    const liveSession = mId ? getStoredGameSession(mId) : null;
    const cachedMystery = mId ? getCachedMysterySnapshot(mId) : null;
    const dbProfile = order.user_id ? profilesMap.get(order.user_id) : null;
    const dbMystery = mId ? mysteriesMap.get(mId) : null;

    return enrichWithEconomics(
      {
        ...order,
        mystery_id: mId,
        mysteries:
          dbMystery ||
          (cachedMystery
            ? { id: mId, title: cachedMystery.title, slug: cachedMystery.slug || mId }
            : null),
        profiles: dbProfile
          ? {
              ...dbProfile,
              email: dbProfile.email || liveSession?.customerEmail || null,
            }
          : {
              full_name: liveSession?.customerName || 'Host',
              email: liveSession?.customerEmail || null,
            },
        generationStatus: liveSession?.generationStatus || 'ready',
        generationProgress: liveSession?.generationProgress ?? 100,
        pin: liveSession?.pin || null,
        qaReport: liveSession?.qaReport || null,
      },
      liveSession,
      cachedMystery
    );
  });

  // Also include any live paid or QA-audited mystery sessions from .live-game-sessions.json not yet in dbOrders
  const allLiveSessions = getAllStoredGameSessions();
  const extraSessions = allLiveSessions.filter(
    (s) => s.mysteryId && !seenMysteryIds.has(s.mysteryId) && (s.isPaid || s.qaReport)
  );

  const missingDbMysteryIds: string[] = [];
  for (const session of extraSessions) {
    if (!getCachedMysterySnapshot(session.mysteryId) && !mysteriesMap.has(session.mysteryId)) {
      missingDbMysteryIds.push(session.mysteryId);
    }
  }

  const dbMysteryTitlesMap = new Map<string, string>();
  if (missingDbMysteryIds.length > 0) {
    const { data: mRows } = (await supabase
      .from('mysteries')
      .select('id, title')
      .in('id', missingDbMysteryIds)) as any;
    for (const row of mRows || []) {
      dbMysteryTitlesMap.set(row.id, row.title);
    }
  }

  for (const session of extraSessions) {
    const cachedMystery = getCachedMysterySnapshot(session.mysteryId);
    const mysteryTitle =
      cachedMystery?.title ||
      mysteriesMap.get(session.mysteryId)?.title ||
      dbMysteryTitlesMap.get(session.mysteryId) ||
      'Custom Mystery Pack';
    const mysterySlug = cachedMystery?.slug || session.mysteryId;

    enrichedOrders.push(
      enrichWithEconomics(
        {
          id: session.orderId || session.mysteryId,
          mystery_id: session.mysteryId,
          user_id: session.paidByUserId || session.hostUserId || null,
          amount: 15,
          currency: 'GBP',
          status: session.isPaid ? 'succeeded' : 'qa_verified',
          created_at: session.paidAt || session.updatedAt || new Date().toISOString(),
          profiles: {
            full_name: session.customerName || 'Host',
            email: session.customerEmail || null,
          },
          mysteries: {
            id: session.mysteryId,
            title: mysteryTitle,
            slug: mysterySlug,
          },
          generationStatus: session.generationStatus || 'ready',
          generationProgress: session.generationProgress ?? 100,
          pin: session.pin || null,
          qaReport: session.qaReport || null,
        },
        session,
        cachedMystery
      )
    );
  }

  return enrichedOrders.sort(
    (a, b) => Date.parse(b.created_at || '') - Date.parse(a.created_at || '')
  );
}

export async function processRefund(id: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

