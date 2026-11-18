import fs from "fs";
import path from "path";
import crypto from "crypto";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export interface MarketingStoreData {
  blog_posts: any[];
  social_posts: any[];
  social_post_captions: any[];
  edm_campaigns: any[];
  edm_events: any[];
}

const STORE_FILENAME = ".marketing-suite-store.json";
const STORAGE_BUCKET = "character-images";
const STORAGE_PATH = "system/marketing-suite-store.json";

function getStorePath(): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "data", STORE_FILENAME);
  try {
    const dir = path.dirname(cwdPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join("/tmp", STORE_FILENAME);
  }
}

function emptyStore(): MarketingStoreData {
  return {
    blog_posts: [],
    social_posts: [],
    social_post_captions: [],
    edm_campaigns: [],
    edm_events: [],
  };
}

export function readLocalMarketingStore(): MarketingStoreData {
  const filePath = getStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);
      return {
        blog_posts: Array.isArray(parsed.blog_posts) ? parsed.blog_posts : [],
        social_posts: Array.isArray(parsed.social_posts) ? parsed.social_posts : [],
        social_post_captions: Array.isArray(parsed.social_post_captions)
          ? parsed.social_post_captions
          : [],
        edm_campaigns: Array.isArray(parsed.edm_campaigns) ? parsed.edm_campaigns : [],
        edm_events: Array.isArray(parsed.edm_events) ? parsed.edm_events : [],
      };
    }
  } catch {
    // ignore
  }
  return emptyStore();
}

export function writeLocalMarketingStore(data: MarketingStoreData): void {
  const filePath = getStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch {
    // ignore in read-only env
  }
}

function getStorageSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createSupabaseJsClient(url, key);
}

export async function loadMarketingStore(): Promise<MarketingStoreData> {
  const local = readLocalMarketingStore();
  if (
    local.blog_posts.length > 0 ||
    local.social_posts.length > 0 ||
    local.edm_campaigns.length > 0
  ) {
    return local;
  }

  // Fallback to Supabase Storage if local is empty (e.g. cold Vercel lambda)
  const sb = getStorageSupabase();
  if (sb) {
    try {
      const { data: blob } = await sb.storage.from(STORAGE_BUCKET).download(STORAGE_PATH);
      if (blob) {
        const parsed = JSON.parse(await blob.text());
        const hydrated: MarketingStoreData = {
          blog_posts: Array.isArray(parsed.blog_posts) ? parsed.blog_posts : [],
          social_posts: Array.isArray(parsed.social_posts) ? parsed.social_posts : [],
          social_post_captions: Array.isArray(parsed.social_post_captions)
            ? parsed.social_post_captions
            : [],
          edm_campaigns: Array.isArray(parsed.edm_campaigns) ? parsed.edm_campaigns : [],
          edm_events: Array.isArray(parsed.edm_events) ? parsed.edm_events : [],
        };
        writeLocalMarketingStore(hydrated);
        return hydrated;
      }
    } catch {
      // ignore
    }
  }

  return local;
}

export async function saveMarketingStore(data: MarketingStoreData): Promise<void> {
  writeLocalMarketingStore(data);
  const sb = getStorageSupabase();
  if (sb) {
    try {
      await sb.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_PATH, Buffer.from(JSON.stringify(data, null, 2), "utf8"), {
          contentType: "application/json",
          upsert: true,
        });
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
  const store = await loadMarketingStore();
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
