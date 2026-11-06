'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import {
  DiscountRecord,
  DiscountType,
  DiscountAppliesTo,
  DiscountUsageLimitType,
  getDiscountComputedStatus,
  doesDiscountApplyToTarget,
} from '@/utils/discounts';

interface DiscountStoreData {
  initialized: boolean;
  discounts: Record<string, DiscountRecord>;
  deletedIds: string[];
}

const STORE_FILENAME = '.discounts-store.json';

function getStorePath(): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), STORE_FILENAME);
  try {
    fs.accessSync(process.cwd(), fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join('/tmp', STORE_FILENAME);
  }
}

function getDefaultSeedDiscount(): DiscountRecord {
  const now = new Date();
  const start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  return {
    id: 'early20-default-seed',
    name: 'Early Bird Newsletter Welcome',
    code: 'EARLY20-MOCK',
    auto_apply: false,
    discount_type: 'percentage',
    discount_value: 20,
    applies_to: 'all',
    target_packages: [],
    target_mysteries: [],
    starts_at: start,
    ends_at: null,
    usage_limit: 'one_per_customer',
    max_uses: null,
    times_used: 0,
    is_active: true,
    created_at: start,
    updated_at: start,
  };
}

function readLocalStore(): DiscountStoreData {
  const filePath = getStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        initialized: Boolean(parsed.initialized),
        discounts: parsed.discounts || {},
        deletedIds: Array.isArray(parsed.deletedIds) ? parsed.deletedIds : [],
      };
    }
  } catch {
    // Ignore corrupted file
  }

  const seed = getDefaultSeedDiscount();
  const initial: DiscountStoreData = {
    initialized: true,
    discounts: { [seed.id]: seed },
    deletedIds: [],
  };
  writeLocalStore(initial);
  return initial;
}

function writeLocalStore(data: DiscountStoreData): void {
  const filePath = getStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

function normalizeDbRow(row: any): DiscountRecord {
  return {
    id: String(row.id),
    name: String(row.name || row.code || 'Promotion'),
    code: row.code ? String(row.code).toUpperCase().trim() : null,
    auto_apply: Boolean(row.auto_apply),
    discount_type: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
    discount_value: Number(row.discount_value) || 0,
    applies_to: (['all', 'packages', 'mysteries', 'custom'].includes(row.applies_to)
      ? row.applies_to
      : 'all') as DiscountAppliesTo,
    target_packages: Array.isArray(row.target_packages) ? row.target_packages : [],
    target_mysteries: Array.isArray(row.target_mysteries) ? row.target_mysteries : [],
    starts_at: row.starts_at || new Date().toISOString(),
    ends_at: row.ends_at || null,
    usage_limit: (['unlimited', 'one_per_customer', 'max_uses'].includes(row.usage_limit)
      ? row.usage_limit
      : 'unlimited') as DiscountUsageLimitType,
    max_uses: typeof row.max_uses === 'number' ? row.max_uses : null,
    times_used: Number(row.times_used) || 0,
    is_active: row.is_active !== false,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetches all discounts from Supabase (if table exists) merged with the local JSON store.
 */
export async function getDiscountsAction(): Promise<DiscountRecord[]> {
  const local = readLocalStore();
  const deletedSet = new Set(local.deletedIds);
  const map = new Map<string, DiscountRecord>();

  for (const [id, item] of Object.entries(local.discounts)) {
    if (!deletedSet.has(id)) {
      map.set(id, item);
    }
  }

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('discounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const norm = normalizeDbRow(row);
        if (deletedSet.has(norm.id)) continue;
        const existing = map.get(norm.id);
        if (!existing || (norm.updated_at || '') >= (existing.updated_at || '')) {
          map.set(norm.id, norm);
        }
      }
    }
  } catch {
    // Table may not exist yet; local store handles everything seamlessly
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || '')
  );
}

/**
 * Returns only discounts that are currently within their active schedule window and enabled.
 */
export async function getActiveDiscountsAction(): Promise<DiscountRecord[]> {
  const all = await getDiscountsAction();
  const now = new Date();
  return all.filter((d) => getDiscountComputedStatus(d, now) === 'active');
}

export interface SaveDiscountPayload {
  id?: string;
  name: string;
  code?: string | null;
  auto_apply: boolean;
  discount_type: DiscountType;
  discount_value: number;
  applies_to: DiscountAppliesTo;
  target_packages: string[];
  target_mysteries: string[];
  starts_at: string;
  ends_at?: string | null;
  usage_limit: DiscountUsageLimitType;
  max_uses?: number | null;
  is_active?: boolean;
}

export async function saveDiscountAction(payload: SaveDiscountPayload): Promise<{
  success: boolean;
  discount?: DiscountRecord;
  error?: string;
}> {
  const cleanName = (payload.name || '').trim();
  const cleanCode = payload.code ? payload.code.trim().toUpperCase().replace(/\s+/g, '-') : null;

  if (!cleanName && !cleanCode) {
    return { success: false, error: 'Please provide a promotion name or discount code.' };
  }

  if (!payload.auto_apply && !cleanCode) {
    return {
      success: false,
      error: 'Please enter a promo code, or enable "Auto-Apply Package Discount" to apply it automatically.',
    };
  }

  const numericValue = Number(payload.discount_value);
  if (isNaN(numericValue) || numericValue <= 0) {
    return { success: false, error: 'Discount value must be greater than 0.' };
  }

  if (payload.discount_type === 'percentage' && numericValue > 100) {
    return { success: false, error: 'Percentage discount cannot exceed 100%.' };
  }

  const startDate = payload.starts_at ? new Date(payload.starts_at) : new Date();
  if (isNaN(startDate.getTime())) {
    return { success: false, error: 'Invalid start date and time.' };
  }

  let endIso: string | null = null;
  if (payload.ends_at) {
    const endDate = new Date(payload.ends_at);
    if (isNaN(endDate.getTime())) {
      return { success: false, error: 'Invalid end date and time.' };
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return { success: false, error: 'End date & time must be after the start date & time.' };
    }
    endIso = endDate.toISOString();
  }

  if (
    payload.applies_to === 'packages' &&
    (!payload.target_packages || payload.target_packages.length === 0)
  ) {
    return { success: false, error: 'Please select at least one package tier to discount.' };
  }

  if (
    payload.applies_to === 'mysteries' &&
    (!payload.target_mysteries || payload.target_mysteries.length === 0)
  ) {
    return { success: false, error: 'Please select at least one murder mystery to discount.' };
  }

  if (
    payload.applies_to === 'custom' &&
    (!payload.target_packages || payload.target_packages.length === 0) &&
    (!payload.target_mysteries || payload.target_mysteries.length === 0)
  ) {
    return {
      success: false,
      error: 'Please select at least one package tier or murder mystery for this promotion.',
    };
  }

  const nowIso = new Date().toISOString();
  const local = readLocalStore();
  const existing = payload.id ? local.discounts[payload.id] : undefined;

  const id =
    payload.id ||
    `disc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const record: DiscountRecord = {
    id,
    name: cleanName || cleanCode || 'Mystery Promotion',
    code: cleanCode,
    auto_apply: Boolean(payload.auto_apply),
    discount_type: payload.discount_type,
    discount_value: numericValue,
    applies_to: payload.applies_to,
    target_packages: payload.applies_to === 'all' ? [] : payload.target_packages || [],
    target_mysteries: payload.applies_to === 'all' ? [] : payload.target_mysteries || [],
    starts_at: startDate.toISOString(),
    ends_at: endIso,
    usage_limit: payload.usage_limit || 'unlimited',
    max_uses:
      payload.usage_limit === 'max_uses' && payload.max_uses
        ? Math.max(1, Number(payload.max_uses))
        : null,
    times_used: existing?.times_used ?? 0,
    is_active: payload.is_active !== undefined ? payload.is_active : existing?.is_active ?? true,
    created_at: existing?.created_at || nowIso,
    updated_at: nowIso,
  };

  // Save to local store
  local.discounts[id] = record;
  local.deletedIds = local.deletedIds.filter((dId) => dId !== id);
  writeLocalStore(local);

  // Best-effort save to Supabase if table is migrated
  try {
    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const dbPayload: any = {
      name: record.name,
      code: record.code,
      auto_apply: record.auto_apply,
      discount_type: record.discount_type,
      discount_value: record.discount_value,
      applies_to: record.applies_to,
      target_packages: record.target_packages,
      target_mysteries: record.target_mysteries,
      starts_at: record.starts_at,
      ends_at: record.ends_at,
      usage_limit: record.usage_limit,
      max_uses: record.max_uses,
      times_used: record.times_used,
      is_active: record.is_active,
      updated_at: record.updated_at,
    };
    if (isUuid) {
      dbPayload.id = id;
    }

    if (existing && isUuid) {
      await (supabase as any).from('discounts').upsert(dbPayload);
    } else {
      await (supabase as any).from('discounts').insert(dbPayload);
    }
  } catch {
    // Non-fatal if Supabase table is not migrated yet
  }

  revalidatePath('/', 'layout');
  return { success: true, discount: record };
}

export async function toggleDiscountActiveAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; discount?: DiscountRecord; error?: string }> {
  const local = readLocalStore();
  const all = await getDiscountsAction();
  const target = all.find((d) => d.id === id);
  if (!target) {
    return { success: false, error: 'Discount not found.' };
  }

  const updated: DiscountRecord = {
    ...target,
    is_active: isActive,
    updated_at: new Date().toISOString(),
  };

  local.discounts[id] = updated;
  writeLocalStore(local);

  try {
    const supabase = await createClient();
    await (supabase as any)
      .from('discounts')
      .update({ is_active: isActive, updated_at: updated.updated_at })
      .eq('id', id);
  } catch {
    // Non-fatal
  }

  revalidatePath('/', 'layout');
  return { success: true, discount: updated };
}

export async function deleteDiscountAction(id: string): Promise<{ success: boolean }> {
  const local = readLocalStore();
  delete local.discounts[id];
  if (!local.deletedIds.includes(id)) {
    local.deletedIds.push(id);
  }
  writeLocalStore(local);

  try {
    const supabase = await createClient();
    await (supabase as any).from('discounts').delete().eq('id', id);
  } catch {
    // Non-fatal
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

/**
 * Validates a promo code against active status, schedule window, target package/mystery,
 * friend referral rules ("Give 20%, Get 20%"), and anti-abuse per-customer usage limits.
 */
export async function validatePromoCodeAction(params: {
  code: string;
  tier?: string | null;
  mysteryId?: string | null;
  mysterySlug?: string | null;
  mysteryTitle?: string | null;
}): Promise<{
  valid: boolean;
  discount?: DiscountRecord;
  error?: string;
}> {
  const cleanCode = (params.code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, error: 'Please enter a promo code.' };
  }

  // Resolve current authenticated user for anti-abuse checks (self-referral, one-per-customer, first-order only)
  let currentUserId: string | null = null;
  let currentUserEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      currentUserId = user.id;
      currentUserEmail = user.email || null;
    }
  } catch {
    // ignore
  }

  const {
    validateReferralOrRewardCode,
    checkPromoUsageAbuse,
  } = await import('@/app/actions/referrals');

  // 1. Check if this is a Friend Referral Code ("Give 20%, Get 20%") or Referrer Reward Voucher
  const referralCheck = await validateReferralOrRewardCode({
    code: cleanCode,
    currentUserId,
    currentUserEmail,
  });

  if (referralCheck.matched) {
    if (!referralCheck.valid) {
      return { valid: false, error: referralCheck.error || 'Invalid referral code.' };
    }
    const nowIso = new Date().toISOString();
    const virtualDiscount: DiscountRecord = {
      id: `referral-${cleanCode}`,
      name: referralCheck.name || 'Friend Referral (20% Off)',
      code: cleanCode,
      auto_apply: false,
      discount_type: 'percentage',
      discount_value: referralCheck.discountPercent || 20,
      applies_to: 'all',
      target_packages: [],
      target_mysteries: [],
      starts_at: nowIso,
      ends_at: null,
      usage_limit: 'one_per_customer',
      max_uses: 1,
      times_used: 0,
      is_active: true,
      created_at: nowIso,
      updated_at: nowIso,
    };
    return { valid: true, discount: virtualDiscount };
  }

  // 2. Otherwise check standard Discounts Store
  const all = await getDiscountsAction();
  const match = all.find((d) => d.code && d.code.toUpperCase() === cleanCode);

  if (!match) {
    return { valid: false, error: 'Invalid discount or referral code.' };
  }

  const status = getDiscountComputedStatus(match, new Date());
  if (status === 'paused') {
    return { valid: false, error: 'This discount code is currently paused.' };
  }
  if (status === 'scheduled') {
    const startStr = new Date(match.starts_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    return { valid: false, error: `This promotion has not started yet (starts ${startStr}).` };
  }
  if (status === 'expired') {
    return { valid: false, error: 'This discount code has expired.' };
  }

  // 3. Enforce per-customer & max_uses anti-abuse limits
  const usageCheck = await checkPromoUsageAbuse({
    code: cleanCode,
    usageLimit: match.usage_limit,
    maxUses: match.max_uses,
    timesUsed: match.times_used,
    currentUserId,
    currentUserEmail,
  });
  if (!usageCheck.allowed) {
    return { valid: false, error: usageCheck.error || 'Promo code limit reached.' };
  }

  const applies = doesDiscountApplyToTarget(match, {
    tier: params.tier,
    mysteryId: params.mysteryId,
    mysterySlug: params.mysterySlug,
    mysteryTitle: params.mysteryTitle,
  });

  if (!applies) {
    return {
      valid: false,
      error: 'This discount code does not apply to the selected murder mystery package.',
    };
  }

  return { valid: true, discount: match };
}

