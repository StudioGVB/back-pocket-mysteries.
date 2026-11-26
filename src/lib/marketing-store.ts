import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from "@/utils/supabase/server";
import bundledStoreJson from "../../data/.marketing-suite-store.json";
import bundledLeadsJson from "../../data/.leads-store.json";

export interface MarketingStoreData {
  blog_posts: any[];
  social_posts: any[];
  social_post_captions: any[];
  edm_campaigns: any[];
  edm_events: any[];
  leads: any[];
}

const STORE_FILENAME = ".marketing-suite-store.json";
const LEADS_FILENAME = ".leads-store.json";
const STORAGE_BUCKET = "character-images";
const STORAGE_PATH = "system/marketing-suite-store.json";
const VERSIONED_STORAGE_DIR = "system/marketing-store-v";

const globalForMarketing = globalThis as unknown as {
  __marketingStoreCache?: MarketingStoreData;
  __marketingStoreLoadedAt?: number;
  __marketingStoreInflight?: Promise<MarketingStoreData> | null;
};

function readBundledLeadsList(): any[] {
  const leadsObj = (bundledLeadsJson as any)?.leads;
  if (leadsObj && typeof leadsObj === "object") {
    return Object.values(leadsObj);
  }
  return [];
}

function readLeadsList(): any[] {
  if (process.env.NODE_ENV === "development") {
    try {
      const cwdLeads = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", LEADS_FILENAME);
      if (fs.existsSync(cwdLeads)) {
        const parsed = JSON.parse(fs.readFileSync(cwdLeads, "utf8"));
        if (parsed && parsed.leads && typeof parsed.leads === "object") {
          return Object.values(parsed.leads);
        }
      }
    } catch {
      // ignore
    }
  }
  return readBundledLeadsList();
}

function normalizeStore(parsed: any, leadsList: any[] = []): MarketingStoreData {
  return {
    blog_posts: Array.isArray(parsed?.blog_posts) ? parsed.blog_posts : [],
    social_posts: Array.isArray(parsed?.social_posts) ? parsed.social_posts : [],
    social_post_captions: Array.isArray(parsed?.social_post_captions)
      ? parsed.social_post_captions
      : [],
    edm_campaigns: Array.isArray(parsed?.edm_campaigns) ? parsed.edm_campaigns : [],
    edm_events: Array.isArray(parsed?.edm_events) ? parsed.edm_events : [],
    leads:
      leadsList.length > 0
        ? leadsList
        : Array.isArray(parsed?.leads)
        ? parsed.leads
        : [],
  };
}

function getRowTimestampMs(row: any): number {
  const ts = row?.updated_at || row?.created_at;
  if (!ts) return 0;
  const ms = new Date(ts).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function mergeById(baseRows: any[], overrideRows: any[], key = "id"): any[] {
  const map = new Map<string, any>();
  for (const r of baseRows) {
    if (r && r[key]) map.set(String(r[key]), r);
  }
  for (const r of overrideRows) {
    if (!r || !r[key]) continue;
    const idStr = String(r[key]);
    const existing = map.get(idStr);
    if (!existing) {
      map.set(idStr, r);
      continue;
    }
    const existingMs = getRowTimestampMs(existing);
    const incomingMs = getRowTimestampMs(r);
    // Keep whichever record has the newer updated_at timestamp so stale CDN snapshots can never overwrite a fresher edit
    if (existingMs > incomingMs) {
      map.set(idStr, { ...r, ...existing });
    } else {
      map.set(idStr, { ...existing, ...r });
    }
  }
  return Array.from(map.values());
}

function getLatestRowsTimestampMs(rows: any[]): number {
  let maxMs = 0;
  for (const r of rows || []) {
    const ms = getRowTimestampMs(r);
    if (ms > maxMs) maxMs = ms;
  }
  return maxMs;
}

function mergeStores(base: MarketingStoreData, override: MarketingStoreData): MarketingStoreData {
  const baseLatestSocialMs = getLatestRowsTimestampMs(base.social_posts);
  const overrideLatestSocialMs = getLatestRowsTimestampMs(override.social_posts);

  // Whichever snapshot was modified most recently defines the authoritative list of active social_posts IDs
  // (so deleting posts in either a newer git bundle or a newer Admin UI cloud snapshot never resurrects deleted rows).
  const authoritativeSocialPosts =
    baseLatestSocialMs > overrideLatestSocialMs && base.social_posts.length > 0
      ? base.social_posts
      : override.social_posts.length > 0
        ? override.social_posts
        : base.social_posts;

  const authoritativePostIdSet =
    authoritativeSocialPosts.length > 0
      ? new Set(authoritativeSocialPosts.map((p) => String(p.id)))
      : null;

  const filteredBaseSocialPosts = authoritativePostIdSet
    ? base.social_posts.filter((p) => authoritativePostIdSet.has(String(p.id)))
    : base.social_posts;
  const filteredOverrideSocialPosts = authoritativePostIdSet
    ? override.social_posts.filter((p) => authoritativePostIdSet.has(String(p.id)))
    : override.social_posts;

  const mergedSocialPosts = mergeById(
    filteredBaseSocialPosts,
    filteredOverrideSocialPosts,
    "id"
  );
  const mergedPostIds = new Set(mergedSocialPosts.map((p) => String(p.id)));

  const preferBaseCaptions = baseLatestSocialMs > overrideLatestSocialMs;
  const primaryCaptions = preferBaseCaptions
    ? base.social_post_captions
    : override.social_post_captions;
  const secondaryCaptions = preferBaseCaptions
    ? override.social_post_captions
    : base.social_post_captions;

  const primaryPostIdsWithCaptions = new Set(
    primaryCaptions.map((c) => String(c.post_id))
  );
  const keptSecondaryCaptions = secondaryCaptions.filter(
    (c) =>
      mergedPostIds.has(String(c.post_id)) &&
      !primaryPostIdsWithCaptions.has(String(c.post_id))
  );
  const mergedCaptions = [
    ...keptSecondaryCaptions,
    ...primaryCaptions.filter((c) => mergedPostIds.has(String(c.post_id))),
  ];

  return {
    blog_posts: mergeById(base.blog_posts, override.blog_posts, "id"),
    social_posts: mergedSocialPosts,
    social_post_captions: mergedCaptions,
    edm_campaigns: mergeById(base.edm_campaigns, override.edm_campaigns, "id"),
    edm_events: mergeById(base.edm_events, override.edm_events, "id"),
    leads: mergeById(base.leads, override.leads, "id"),
  };
}

export function readLocalMarketingStore(): MarketingStoreData {
  const leadsList = readLeadsList();
  let store = normalizeStore(bundledStoreJson as any, leadsList);

  if (globalForMarketing.__marketingStoreCache) {
    store = mergeStores(store, globalForMarketing.__marketingStoreCache);
  }

  if (process.env.NODE_ENV === "development") {
    try {
      const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", STORE_FILENAME);
      if (fs.existsSync(cwdPath)) {
        const parsed = normalizeStore(JSON.parse(fs.readFileSync(cwdPath, "utf8")), leadsList);
        store = mergeStores(store, parsed);
      }
    } catch {
      // ignore
    }
  }

  return store;
}

export function writeLocalMarketingStore(data: MarketingStoreData): void {
  globalForMarketing.__marketingStoreCache = data;
  globalForMarketing.__marketingStoreLoadedAt = Date.now();
  if (process.env.NODE_ENV === "development") {
    try {
      const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", STORE_FILENAME);
      fs.writeFileSync(cwdPath, JSON.stringify(data, null, 2), "utf8");
    } catch {
      // ignore
    }
  }
}

function getReadStorageSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

async function getWriteStorageSupabase() {
  try {
    const serverClient = await createServerSupabaseClient();
    if (serverClient) return serverClient;
  } catch {
    // outside request scope
  }
  return getReadStorageSupabase();
}

export async function loadMarketingStore(allowAuthCookies = false): Promise<MarketingStoreData> {
  const now = Date.now();
  if (
    globalForMarketing.__marketingStoreCache &&
    globalForMarketing.__marketingStoreLoadedAt &&
    now - globalForMarketing.__marketingStoreLoadedAt < 5_000
  ) {
    return readLocalMarketingStore();
  }

  if (globalForMarketing.__marketingStoreInflight) {
    return globalForMarketing.__marketingStoreInflight;
  }

  const inflight = (async (): Promise<MarketingStoreData> => {
    const local = readLocalMarketingStore();
    const sb = allowAuthCookies ? await getWriteStorageSupabase() : getReadStorageSupabase();
    if (sb) {
      try {
        // 1. Check versioned snapshot directory first via POST .list() (bypasses Cloudflare's 15-min path cache!)
        let targetDownloadPath = STORAGE_PATH;
        try {
          const { data: vFiles } = await sb.storage
            .from(STORAGE_BUCKET)
            .list(VERSIONED_STORAGE_DIR, {
              limit: 5,
              sortBy: { column: "name", order: "desc" },
            });
          const latestVersioned = (vFiles || []).find(
            (f: any) => f?.name && f.name.startsWith("store-") && f.name.endsWith(".json")
          );
          if (latestVersioned?.name) {
            targetDownloadPath = `${VERSIONED_STORAGE_DIR}/${latestVersioned.name}`;
          }
        } catch {
          // Fallback to STORAGE_PATH
        }

        const { data: blob } = await sb.storage.from(STORAGE_BUCKET).download(targetDownloadPath);
        if (blob) {
          const parsed = normalizeStore(JSON.parse(await blob.text()), local.leads);
          const localSocialMs = getLatestRowsTimestampMs(local.social_posts);
          const cloudSocialMs = getLatestRowsTimestampMs(parsed.social_posts);
          const merged = mergeStores(local, parsed);
          writeLocalMarketingStore(merged);
          if (allowAuthCookies && localSocialMs > cloudSocialMs) {
            saveMarketingStore(merged).catch(() => {});
          }
          return merged;
        }
      } catch {
        // ignore
      }
    }
    globalForMarketing.__marketingStoreLoadedAt = Date.now();
    return local;
  })();

  globalForMarketing.__marketingStoreInflight = inflight;
  try {
    return await inflight;
  } finally {
    globalForMarketing.__marketingStoreInflight = null;
  }
}

export async function saveMarketingStore(data: MarketingStoreData): Promise<void> {
  writeLocalMarketingStore(data);
  const sb = await getWriteStorageSupabase();
  if (sb) {
    const payloadBuf = Buffer.from(JSON.stringify(data, null, 2), "utf8");
    const versionedPath = `${VERSIONED_STORAGE_DIR}/store-${Date.now()}.json`;
    try {
      // 1. Upload to a unique timestamped path so Cloudflare CDN never serves a stale cached object
      await sb.storage.from(STORAGE_BUCKET).upload(versionedPath, payloadBuf, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });

      // 2. Also update the canonical path for legacy readers & prune old versioned snapshots
      await sb.storage.from(STORAGE_BUCKET).upload(STORAGE_PATH, payloadBuf, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });

      const { data: vFiles } = await sb.storage
        .from(STORAGE_BUCKET)
        .list(VERSIONED_STORAGE_DIR, {
          limit: 20,
          sortBy: { column: "name", order: "desc" },
        });
      const oldFiles = (vFiles || [])
        .filter((f: any) => f?.name && f.name.startsWith("store-") && f.name.endsWith(".json"))
        .slice(2)
        .map((f: any) => `${VERSIONED_STORAGE_DIR}/${f.name}`);
      if (oldFiles.length > 0) {
        await sb.storage.from(STORAGE_BUCKET).remove(oldFiles);
      }
    } catch {
      // non-fatal
    }
  }
}

export interface StoreOperation {
  table: keyof MarketingStoreData;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  selectColumns?: string;
  countExact?: boolean;
  headOnly?: boolean;
  filters?: Array<{
    type: "eq" | "neq" | "in" | "not_is_null" | "lt" | "or";
    column?: string;
    value?: any;
    orExpr?: string;
  }>;
  orders?: Array<{ column: string; ascending: boolean }>;
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  values?: any;
  onConflict?: string;
}

function matchesFilters(row: any, filters: StoreOperation["filters"] = []): boolean {
  for (const f of filters) {
    if (f.type === "eq" && f.column) {
      if (row[f.column] !== f.value) return false;
    } else if (f.type === "neq" && f.column) {
      if (row[f.column] === f.value) return false;
    } else if (f.type === "in" && f.column) {
      const arr = Array.isArray(f.value) ? f.value : [];
      if (!arr.includes(row[f.column])) return false;
    } else if (f.type === "not_is_null" && f.column) {
      if (row[f.column] === null || row[f.column] === undefined) return false;
    } else if (f.type === "lt" && f.column) {
      if (!row[f.column] || !(row[f.column] < f.value)) return false;
    } else if (f.type === "or" && f.orExpr) {
      // Parse simple PostgREST .or("col.eq.val1,col.eq.val2")
      const clauses = f.orExpr.split(",");
      const anyMatch = clauses.some((clause) => {
        const [col, op, ...rest] = clause.trim().split(".");
        const val = rest.join(".");
        if (op === "eq") return String(row[col] || "") === val;
        return false;
      });
      if (!anyMatch) return false;
    }
  }
  return true;
}

export async function executeStoreOperation(
  op: StoreOperation
): Promise<{ data: any; error: any; count?: number }> {
  const store = await loadMarketingStore(true);
  const tableRows = store[op.table];
  if (!Array.isArray(tableRows)) {
    return { data: null, error: { message: `Unknown marketing table: ${String(op.table)}` } };
  }

  const nowIso = new Date().toISOString();

  if (op.action === "select") {
    let rows = tableRows.filter((r) => matchesFilters(r, op.filters));

    // Attach nested social_post_captions if requested on social_posts
    if (
      op.table === "social_posts" &&
      op.selectColumns &&
      op.selectColumns.includes("social_post_captions")
    ) {
      rows = rows.map((r) => ({
        ...r,
        social_post_captions: store.social_post_captions.filter((c) => c.post_id === r.id),
      }));
    }

    if (op.orders && op.orders.length > 0) {
      rows = [...rows].sort((a, b) => {
        for (const ord of op.orders!) {
          const av = a[ord.column];
          const bv = b[ord.column];
          if (av === bv) continue;
          if (av === null || av === undefined) return 1;
          if (bv === null || bv === undefined) return -1;
          const cmp = av < bv ? -1 : 1;
          return ord.ascending ? cmp : -cmp;
        }
        return 0;
      });
    }

    const totalCount = rows.length;
    if (typeof op.limit === "number") {
      rows = rows.slice(0, op.limit);
    }

    if (op.headOnly) {
      return { data: null, error: null, count: totalCount };
    }
    if (op.single) {
      if (rows.length === 0) {
        return { data: null, error: { message: "Row not found" } };
      }
      return { data: rows[0], error: null, count: totalCount };
    }
    if (op.maybeSingle) {
      return { data: rows[0] || null, error: null, count: totalCount };
    }
    return { data: rows, error: null, count: totalCount };
  }

  if (op.action === "insert") {
    const items = Array.isArray(op.values) ? op.values : [op.values];
    const inserted = items.map((item) => ({
      id: item.id || crypto.randomUUID(),
      created_at: item.created_at || nowIso,
      updated_at: item.updated_at || nowIso,
      ...item,
    }));
    store[op.table].push(...inserted);
    await saveMarketingStore(store);

    if (op.single || op.maybeSingle) {
      return { data: inserted[0] || null, error: null };
    }
    return { data: inserted, error: null };
  }

  if (op.action === "upsert") {
    const items = Array.isArray(op.values) ? op.values : [op.values];
    const conflictKey = op.onConflict || "id";
    const upserted: any[] = [];

    for (const item of items) {
      const idx = store[op.table].findIndex(
        (r) => r[conflictKey] && item[conflictKey] && r[conflictKey] === item[conflictKey]
      );
      if (idx >= 0) {
        store[op.table][idx] = {
          ...store[op.table][idx],
          ...item,
          updated_at: nowIso,
        };
        upserted.push(store[op.table][idx]);
      } else {
        const created = {
          id: item.id || crypto.randomUUID(),
          created_at: item.created_at || nowIso,
          updated_at: item.updated_at || nowIso,
          ...item,
        };
        store[op.table].push(created);
        upserted.push(created);
      }
    }

    await saveMarketingStore(store);
    if (op.single || op.maybeSingle) {
      return { data: upserted[0] || null, error: null };
    }
    return { data: upserted, error: null };
  }

  if (op.action === "update") {
    const updated: any[] = [];
    store[op.table] = store[op.table].map((row) => {
      if (matchesFilters(row, op.filters)) {
        const next = { ...row, ...op.values, updated_at: op.values?.updated_at || nowIso };
        updated.push(next);
        return next;
      }
      return row;
    });
    await saveMarketingStore(store);
    if (op.single || op.maybeSingle) {
      return { data: updated[0] || null, error: null };
    }
    return { data: updated, error: null };
  }

  if (op.action === "delete") {
    const deleted: any[] = [];
    store[op.table] = store[op.table].filter((row) => {
      if (matchesFilters(row, op.filters)) {
        deleted.push(row);
        return false;
      }
      return true;
    });
    // Cascade delete social_post_captions when social_posts are deleted
    if (op.table === "social_posts" && deleted.length > 0) {
      const deletedIds = new Set(deleted.map((d) => d.id));
      store.social_post_captions = store.social_post_captions.filter(
        (c) => !deletedIds.has(c.post_id)
      );
    }
    await saveMarketingStore(store);
    return { data: deleted, error: null };
  }

  return { data: null, error: { message: "Unsupported operation" } };
}
