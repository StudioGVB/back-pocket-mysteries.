import fs from 'fs';
import path from 'path';
import { Database } from '@/types/database';
import { ensureChristmasNightmareCanon, replaceLegacyNamesWithRoleTokens } from '@/services/mysteries';
import { requireAdmin } from '@/utils/admin-auth';
import {
  getAllStoredGameSessions,
  getStoredGameSession,
  getCachedMysterySnapshot,
} from '@/lib/live-session-store';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

function readLightweightQaSummary(mysteryId: string) {
  try {
    const qaPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', 'mystery-qa-runs', `${mysteryId}.json`);
    if (!fs.existsSync(qaPath)) return null;
    const raw = JSON.parse(fs.readFileSync(qaPath, 'utf8'));
    const pr = raw?.performanceReview;
    if (!pr) return null;
    const checklist = Array.isArray(pr.preLaunchChecklist) ? pr.preLaunchChecklist : [];
    const passedBoxes = checklist.filter((b: any) => b.passed).length;
    return {
      overallReadinessScore: Number(pr.overallReadinessScore || 0),
      certificationStatus: pr.certificationStatus as 'certified' | 'needs_tuning' | 'blocked',
      passedBoxes,
      totalBoxes: checklist.length || 7,
      completedRunsCount: Number(raw.completedRunsCount || 0),
    };
  } catch {
    return null;
  }
}

export async function getMysteries() {
  const { supabase } = await requireAdmin();
  const { data, error } = (await supabase
    .from('mysteries')
    .select('id, title, theme, status, description, image_url, created_at, min_players, max_players, complexity, spice_level, created_by')
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching admin mysteries:', error);
    return [];
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
    if (customerInstanceIds.has(row.id)) continue;
    const titleKey = String(row.title || '').trim().toLowerCase();
    if (titleKey && seenBaseTitles.has(titleKey)) continue;
    if (titleKey) seenBaseTitles.add(titleKey);
    filteredRows.push(row);
  }

  return filteredRows.map((m: any) => {
    const upgraded = ensureChristmasNightmareCanon(m);
    const qaSummary = readLightweightQaSummary(upgraded.id);
    return {
      ...upgraded,
      qaSummary,
      description: upgraded.description
        ? replaceLegacyNamesWithRoleTokens(upgraded.description).replace(/\{\{([A-Za-z0-9\s'._&-]+)\}\}/g, '$1')
        : upgraded.description,
    };
  });
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

  return data;
}

export async function getTransactions() {
  const { supabase } = await requireAdmin();
  const { data, error } = (await supabase
    .from('orders')
    .select(`
      *,
      profiles:user_id (full_name, email),
      mysteries:mystery_id (id, title, theme)
    `)
    .order('created_at', { ascending: false })) as any;

  if (error) {
    console.error('Error fetching transactions:', error);
  }

  const dbOrders: any[] = Array.isArray(data) ? data : [];
  const seenMysteryIds = new Set<string>();

  const enrichedOrders = dbOrders.map((order: any) => {
    const mId = order.mystery_id || order.mysteries?.id || null;
    if (mId) seenMysteryIds.add(mId);
    const liveSession = mId ? getStoredGameSession(mId) : null;
    const cachedMystery = mId ? getCachedMysterySnapshot(mId) : null;

    return {
      ...order,
      mystery_id: mId,
      mysteries:
        order.mysteries ||
        (cachedMystery
          ? { id: mId, title: cachedMystery.title, slug: cachedMystery.slug || mId }
          : null),
      profiles: order.profiles || {
        full_name: liveSession?.customerName || 'Host',
        email: liveSession?.customerEmail || null,
      },
      generationStatus: liveSession?.generationStatus || 'ready',
      generationProgress: liveSession?.generationProgress ?? 100,
      pin: liveSession?.pin || null,
      qaReport: liveSession?.qaReport || null,
    };
  });

  // Also include any live paid or QA-audited mystery sessions from .live-game-sessions.json not yet in dbOrders
  const allLiveSessions = getAllStoredGameSessions();
  const extraSessions = allLiveSessions.filter(
    (s) => s.mysteryId && !seenMysteryIds.has(s.mysteryId) && (s.isPaid || s.qaReport)
  );

  const missingDbMysteryIds: string[] = [];
  for (const session of extraSessions) {
    if (!getCachedMysterySnapshot(session.mysteryId)) {
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
      dbMysteryTitlesMap.get(session.mysteryId) ||
      'Custom Mystery Pack';
    const mysterySlug = cachedMystery?.slug || session.mysteryId;

    enrichedOrders.push({
      id: session.orderId || session.mysteryId,
      mystery_id: session.mysteryId,
      user_id: session.paidByUserId || session.hostUserId || null,
      amount: 19,
      currency: 'USD',
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
    });
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

