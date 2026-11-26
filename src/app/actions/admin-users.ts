'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireAdmin, ADMIN_EMAIL_ALLOWLIST, ADMIN_UID_ALLOWLIST } from '@/utils/admin-auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { saveDiscountAction, deleteDiscountAction } from '@/app/actions/discounts';
import { CORE_MYSTERY_PACKAGES } from '@/utils/discounts';

export interface CustomerPromo {
  id: string;
  discountStoreId?: string;
  code: string;
  discountType: 'percent' | 'fixed' | 'free_mystery';
  discountValue: number;
  note?: string;
  expiresAt?: string | null;
  used: boolean;
  createdAt: string;
}

export interface CustomerAdminNote {
  id: string;
  text: string;
  category: 'note' | 'gift' | 'refund' | 'membership' | 'promo' | 'security' | 'support';
  createdAt: string;
}

export interface CustomCustomerOrder {
  id: string;
  mystery_id: string | null;
  mystery_title: string;
  amount: number; // in cents to match orders table (or 0 for gifted)
  refunded_amount?: number; // in cents
  status: 'succeeded' | 'gifted' | 'refunded' | 'partial_refund';
  reason?: string;
  created_at: string;
}

export interface GiftedMysteryEntry {
  id: string;
  title: string;
  theme: string | null;
  status: 'published' | 'draft';
  min_players: number;
  max_players: number;
  current_round: number;
  created_at: string;
}

export interface OrderOverride {
  status: 'refunded' | 'partial_refund' | 'succeeded' | 'gifted';
  refundedAmountCents?: number;
  reason?: string;
  updatedAt: string;
}

export interface CreditLedgerEntry {
  id: string;
  userId: string;
  amountGbp: number; // +5 for earned referral credit, -5 for spent at checkout, +/- for admin adjustment
  type: 'referral_received' | 'referral_given' | 'checkout_redemption' | 'admin_adjustment';
  description: string;
  relatedUserId?: string;
  relatedEmail?: string;
  orderId?: string;
  createdAt: string;
}

export interface CustomerCrmRecord {
  userId: string;
  membership: {
    isActive: boolean; // Binary monthly membership: IN (true) or OUT (false)
    monthlyRateUsd: number;
    startedAt: string | null;
    renewsAt: string | null;
    updatedAt: string | null;
  };
  creditBalanceUsd: number; // Kept synced with creditBalanceGbp (£)
  creditBalanceGbp: number; // Canonical £ credit balance
  creditLedger: CreditLedgerEntry[];
  promos: CustomerPromo[];
  aiQuota: {
    baseImageLimit: number;
    bonusImageCredits: number;
    unlimitedAi: boolean;
    aiFrozen: boolean;
    customSpendCapUsd: number | null;
  };
  tags: string[];
  providedReview: boolean;
  accountSuspended: boolean;
  suspendedReason?: string;
  accountSoftDeleted?: boolean;
  accountDeleted?: boolean;
  deletedAt?: string;
  purgeAfter?: string;
  notes: CustomerAdminNote[];
  customOrders: CustomCustomerOrder[];
  giftedMysteries: GiftedMysteryEntry[];
  revokedMysteryIds: string[];
  mysteryRoundOverrides: Record<string, number>;
  orderOverrides: Record<string, OrderOverride>;
}

const LOCAL_CRM_PATH = path.join(process.cwd(), 'data', 'customer-crm.json');

function getDefaultCrmRecord(userId: string): CustomerCrmRecord {
  return {
    userId,
    membership: {
      isActive: false,
      monthlyRateUsd: 39,
      startedAt: null,
      renewsAt: null,
      updatedAt: null,
    },
    creditBalanceUsd: 0,
    creditBalanceGbp: 0,
    creditLedger: [],
    promos: [],
    aiQuota: {
      baseImageLimit: 25,
      bonusImageCredits: 0,
      unlimitedAi: false,
      aiFrozen: false,
      customSpendCapUsd: null,
    },
    tags: [],
    providedReview: false,
    accountSuspended: false,
    notes: [],
    customOrders: [],
    giftedMysteries: [],
    revokedMysteryIds: [],
    mysteryRoundOverrides: {},
    orderOverrides: {},
  };
}

function readAllLocalCrmSync(): Record<string, CustomerCrmRecord> {
  try {
    if (!fs.existsSync(LOCAL_CRM_PATH)) return {};
    const raw = fs.readFileSync(LOCAL_CRM_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAllLocalCrm(store: Record<string, CustomerCrmRecord>) {
  try {
    const dir = path.dirname(LOCAL_CRM_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_CRM_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not write local customer CRM file:', err);
  }
}

function loadCustomerCrmSync(userId: string): CustomerCrmRecord {
  const all = readAllLocalCrmSync();
  const existing = all[userId];
  const defaults = getDefaultCrmRecord(userId);
  if (!existing) return defaults;
  const resolvedBalance = Number(
    (
      typeof existing.creditBalanceGbp === 'number'
        ? existing.creditBalanceGbp
        : typeof existing.creditBalanceUsd === 'number'
        ? existing.creditBalanceUsd
        : 0
    ).toFixed(2)
  );
  return {
    ...defaults,
    ...existing,
    creditBalanceUsd: resolvedBalance,
    creditBalanceGbp: resolvedBalance,
    creditLedger: Array.isArray(existing.creditLedger) ? existing.creditLedger : [],
    membership: { ...defaults.membership, ...(existing.membership || {}) },
    aiQuota: { ...defaults.aiQuota, ...(existing.aiQuota || {}) },
    promos: Array.isArray(existing.promos) ? existing.promos : [],
    tags: Array.isArray(existing.tags) ? existing.tags : [],
    notes: Array.isArray(existing.notes) ? existing.notes : [],
    customOrders: Array.isArray(existing.customOrders) ? existing.customOrders : [],
    giftedMysteries: Array.isArray(existing.giftedMysteries) ? existing.giftedMysteries : [],
    revokedMysteryIds: Array.isArray(existing.revokedMysteryIds) ? existing.revokedMysteryIds : [],
    mysteryRoundOverrides: existing.mysteryRoundOverrides || {},
    orderOverrides: existing.orderOverrides || {},
  };
}

function saveCustomerCrm(userId: string, record: CustomerCrmRecord) {
  const all = readAllLocalCrmSync();
  all[userId] = record;
  writeAllLocalCrm(all);
}

function prependAuditNote(
  record: CustomerCrmRecord,
  text: string,
  category: CustomerAdminNote['category']
) {
  record.notes.unshift({
    id: crypto.randomUUID(),
    text,
    category,
    createdAt: new Date().toISOString(),
  });
}

export async function getCustomerCrmData(targetUserId: string): Promise<CustomerCrmRecord> {
  await requireAdmin();
  return loadCustomerCrmSync(targetUserId);
}

export async function getAllCustomerCrmData(): Promise<Record<string, CustomerCrmRecord>> {
  await requireAdmin();
  const all = readAllLocalCrmSync();
  const out: Record<string, CustomerCrmRecord> = {};
  for (const [uid, existing] of Object.entries(all)) {
    const defaults = getDefaultCrmRecord(uid);
    const resolvedBalance = Number(
      (
        typeof existing?.creditBalanceGbp === 'number'
          ? existing.creditBalanceGbp
          : typeof existing?.creditBalanceUsd === 'number'
          ? existing.creditBalanceUsd
          : 0
      ).toFixed(2)
    );
    out[uid] = {
      ...defaults,
      ...existing,
      creditBalanceUsd: resolvedBalance,
      creditBalanceGbp: resolvedBalance,
      creditLedger: Array.isArray(existing?.creditLedger) ? existing.creditLedger : [],
      membership: { ...defaults.membership, ...(existing?.membership || {}) },
      aiQuota: { ...defaults.aiQuota, ...(existing?.aiQuota || {}) },
      promos: Array.isArray(existing?.promos) ? existing.promos : [],
      tags: Array.isArray(existing?.tags) ? existing.tags : [],
      notes: Array.isArray(existing?.notes) ? existing.notes : [],
      customOrders: Array.isArray(existing?.customOrders) ? existing.customOrders : [],
      giftedMysteries: Array.isArray(existing?.giftedMysteries) ? existing.giftedMysteries : [],
      revokedMysteryIds: Array.isArray(existing?.revokedMysteryIds) ? existing.revokedMysteryIds : [],
      mysteryRoundOverrides: existing?.mysteryRoundOverrides || {},
      orderOverrides: existing?.orderOverrides || {},
    };
  }
  return out;
}

export async function adminUpdateProfile(
  targetUserId: string,
  data: {
    full_name?: string;
    email?: string;
    location?: string;
    country?: string;
    how_found_us?: string;
    bio?: string;
    fun_facts?: string;
    character_preferences?: string[];
    dietary_needs?: string[];
    avatar_config?: Record<string, unknown>;
  }
) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await (supabase as any)
      .from('profiles')
      .update(data)
      .eq('id', targetUserId);

    if (error) {
      console.error('Error in adminUpdateProfile:', error);
      return { error: error.message };
    }
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true };
  } catch (err: any) {
    console.error('adminUpdateProfile auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminAddGuest(
  targetUserId: string,
  guestData: {
    name: string;
    email?: string;
    gender?: string;
    eye_color?: string;
    height?: string;
    ethnicity?: string;
    avatar_url?: string;
    traits?: string[];
    bio?: string;
  }
) {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from('guests')
      .insert({
        user_id: targetUserId,
        ...guestData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error in adminAddGuest:', error);
      return { error: error.message };
    }

    let finalGuest = data;
    if (data && !(data.avatar_url || '').includes('aiPhotoUrl=')) {
      try {
        const { generateGuestAvatarAction } = await import('@/app/actions/ai-guests');
        const aiRes = await generateGuestAvatarAction(data.id, data);
        if (aiRes?.publicUrl) {
          finalGuest = { ...data, avatar_url: aiRes.publicUrl };
        }
      } catch (aiErr) {
        console.error('Auto AI avatar generation in adminAddGuest failed:', aiErr);
      }
    }

    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, guest: finalGuest };
  } catch (err: any) {
    console.error('adminAddGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminUpdateGuest(
  guestId: string,
  guestData: {
    name?: string;
    email?: string;
    gender?: string;
    eye_color?: string;
    height?: string;
    ethnicity?: string;
    avatar_url?: string;
    traits?: string[];
    bio?: string;
  }
) {
  try {
    const { supabase } = await requireAdmin();

    const { data, error } = await supabase
      .from('guests')
      .update(guestData)
      .eq('id', guestId)
      .select()
      .single();

    if (error) {
      console.error('Error in adminUpdateGuest:', error);
      return { error: error.message };
    }

    let finalGuest = data;
    if (data && !(data.avatar_url || '').includes('aiPhotoUrl=')) {
      try {
        const { generateGuestAvatarAction } = await import('@/app/actions/ai-guests');
        const aiRes = await generateGuestAvatarAction(data.id, data);
        if (aiRes?.publicUrl) {
          finalGuest = { ...data, avatar_url: aiRes.publicUrl };
        }
      } catch (aiErr) {
        console.error('Auto AI avatar generation in adminUpdateGuest failed:', aiErr);
      }
    }

    return { success: true, guest: finalGuest };
  } catch (err: any) {
    console.error('adminUpdateGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminDeleteGuest(guestId: string) {
  try {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) {
      console.error('Error in adminDeleteGuest:', error);
      return { error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('adminDeleteGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

// ============================================================================
// 1. MONTHLY MEMBERSHIP MANAGEMENT (Binary: IN / OUT on a monthly basis)
// ============================================================================

export async function adminManageMonthlyMembership(
  targetUserId: string,
  action: 'activate' | 'deactivate' | 'extend_month',
  monthlyRateUsd?: number
) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    const now = new Date();

    if (typeof monthlyRateUsd === 'number' && monthlyRateUsd >= 0) {
      record.membership.monthlyRateUsd = monthlyRateUsd;
    }

    if (action === 'activate') {
      const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      record.membership.isActive = true;
      record.membership.startedAt = record.membership.startedAt || now.toISOString();
      record.membership.renewsAt = nextMonth.toISOString();
      record.membership.updatedAt = now.toISOString();
      prependAuditNote(
        record,
        `Monthly Membership set to IN (Active @ $${record.membership.monthlyRateUsd}/mo). Renews ${nextMonth.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.`,
        'membership'
      );
    } else if (action === 'deactivate') {
      record.membership.isActive = false;
      record.membership.renewsAt = null;
      record.membership.updatedAt = now.toISOString();
      prependAuditNote(
        record,
        `Monthly Membership set to OUT (Inactive).`,
        'membership'
      );
    } else if (action === 'extend_month') {
      const baseDate =
        record.membership.renewsAt && new Date(record.membership.renewsAt) > now
          ? new Date(record.membership.renewsAt)
          : now;
      const extended = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      record.membership.isActive = true;
      record.membership.startedAt = record.membership.startedAt || now.toISOString();
      record.membership.renewsAt = extended.toISOString();
      record.membership.updatedAt = now.toISOString();
      prependAuditNote(
        record,
        `Extended Monthly Membership by +1 Month (new renewal: ${extended.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}).`,
        'membership'
      );
    }

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to update membership' };
  }
}

// ============================================================================
// 2. GIFT FREE MURDER MYSTERY & MYSTERY TROUBLESHOOTING
// ============================================================================

export async function adminGiftMystery(
  targetUserId: string,
  options: {
    sourceMysteryId?: string;
    note?: string;
  }
) {
  try {
    const { supabase, user: adminUser } = await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);

    if (!options.sourceMysteryId) {
      return { error: 'Please select a mystery to gift.' };
    }

    // Check if sourceMysteryId is in DB or in CORE_MYSTERY_PACKAGES
    let sourceMystery: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      options.sourceMysteryId
    );

    if (isUuid) {
      const { data } = await supabase
        .from('mysteries')
        .select('*')
        .eq('id', options.sourceMysteryId)
        .maybeSingle();
      sourceMystery = data;
    }

    if (!sourceMystery) {
      const coreMatch = CORE_MYSTERY_PACKAGES.find(
        m => m.id === options.sourceMysteryId || m.slug === options.sourceMysteryId
      );
      if (coreMatch) {
        sourceMystery = {
          id: null,
          title: coreMatch.title,
          theme: coreMatch.theme,
          description: `Complimentary edition of ${coreMatch.title} (${coreMatch.theme}).`,
          min_players: 8,
          max_players: 12,
          complexity: coreMatch.complexity || 'medium',
          spice_level: 'mild',
          image_url: null,
          inside_jokes: null,
        };
      }
    }

    if (!sourceMystery) {
      return { error: 'Selected mystery template not found.' };
    }

    // Attempt 1: Insert cloned mystery into public.mysteries with created_by = targetUserId
    const baseMysteryInsert = {
      title: sourceMystery.title,
      theme: sourceMystery.theme,
      description: sourceMystery.description,
      min_players: sourceMystery.min_players || 8,
      max_players: sourceMystery.max_players || 12,
      complexity: sourceMystery.complexity || 'medium',
      spice_level: sourceMystery.spice_level || 'mild',
      image_url: sourceMystery.image_url || null,
      inside_jokes: sourceMystery.inside_jokes || null,
      status: 'published' as const,
      current_round: 1,
    };

    let newMystery: any = null;
    const { data: directMystery, error: directErr } = await supabase
      .from('mysteries')
      .insert({
        ...baseMysteryInsert,
        created_by: targetUserId,
      })
      .select()
      .single();

    if (!directErr && directMystery) {
      newMystery = directMystery;
    } else {
      // Attempt 2: If RLS requires created_by = auth.uid(), insert under adminUser.id and link in CRM
      const { data: adminOwnedMystery } = await supabase
        .from('mysteries')
        .insert({
          ...baseMysteryInsert,
          created_by: adminUser.id,
        })
        .select()
        .single();

      newMystery = adminOwnedMystery || {
        id: sourceMystery.id || crypto.randomUUID(),
        ...baseMysteryInsert,
        created_by: targetUserId,
        created_at: new Date().toISOString(),
      };
    }

    // If sourceMystery had a real DB UUID and newMystery was inserted into DB with a new UUID, clone child rows
    if (sourceMystery.id && newMystery.id && newMystery.id !== sourceMystery.id) {
      try {
        const { data: sourceChars } = await supabase
          .from('characters')
          .select('*')
          .eq('mystery_id', sourceMystery.id);

        const charIdMap: Record<string, string> = {};
        if (sourceChars && sourceChars.length > 0) {
          for (const ch of sourceChars) {
            const { data: insertedChar } = await supabase
              .from('characters')
              .insert({
                mystery_id: newMystery.id,
                name: ch.name,
                gender: ch.gender,
                is_victim: ch.is_victim,
                plot_role: ch.plot_role,
                archetype: ch.archetype,
                is_mandatory: ch.is_mandatory,
                profile_data: ch.profile_data,
              })
              .select('id')
              .single();
            if (insertedChar) {
              charIdMap[ch.id] = insertedChar.id;
            }
          }
        }

        const { data: sourceBeats } = await supabase
          .from('plot_beats')
          .select('*')
          .eq('mystery_id', sourceMystery.id);

        const beatIdMap: Record<string, string> = {};
        if (sourceBeats && sourceBeats.length > 0) {
          for (const beat of sourceBeats) {
            const mappedChars = Array.isArray(beat.characters_involved)
              ? beat.characters_involved.map((cid: string) => charIdMap[cid] || cid)
              : [];
            const { data: insertedBeat } = await supabase
              .from('plot_beats')
              .insert({
                mystery_id: newMystery.id,
                beat_number: beat.beat_number,
                event_title: beat.event_title,
                description: beat.description,
                characters_involved: mappedChars,
                is_required: beat.is_required,
                beat_type: beat.beat_type,
                timeline_phase: beat.timeline_phase,
                story_function: beat.story_function,
                intensity_level: beat.intensity_level,
                suspect_pressure: beat.suspect_pressure,
                twist_weight: beat.twist_weight,
                recommended_clue_count: beat.recommended_clue_count,
                is_crime_adjacent: beat.is_crime_adjacent,
                sort_order: beat.sort_order,
              })
              .select('id')
              .single();
            if (insertedBeat) {
              beatIdMap[beat.id] = insertedBeat.id;
            }
          }
        }

        const { data: sourceClues } = await supabase
          .from('clues')
          .select('*')
          .eq('mystery_id', sourceMystery.id);

        if (sourceClues && sourceClues.length > 0) {
          const cluesPayload = sourceClues.map((c: any) => ({
            mystery_id: newMystery.id,
            title: c.title,
            description: c.description,
            clue_type: c.clue_type,
            implication_type: c.implication_type,
            evidence_status: c.evidence_status,
            reveal_phase: c.reveal_phase,
            is_red_herring: c.is_red_herring,
            points_to_character_id: c.points_to_character_id
              ? charIdMap[c.points_to_character_id] || null
              : null,
            discovered_by_character_id: c.discovered_by_character_id
              ? charIdMap[c.discovered_by_character_id] || null
              : null,
            linked_plot_beat_id: c.linked_plot_beat_id
              ? beatIdMap[c.linked_plot_beat_id] || null
              : null,
            notes: c.notes,
          }));
          await (supabase.from('clues') as any).insert(cluesPayload);
        }
      } catch (cloneErr) {
        console.warn('Non-fatal child entity clone warning:', cloneErr);
      }
    }

    // Record in giftedMysteries so getCustomerMysteries always includes it
    record.giftedMysteries.unshift({
      id: newMystery.id,
      title: newMystery.title,
      theme: newMystery.theme || null,
      status: 'published',
      min_players: newMystery.min_players || 8,
      max_players: newMystery.max_players || 12,
      current_round: 1,
      created_at: newMystery.created_at || new Date().toISOString(),
    });
    record.revokedMysteryIds = record.revokedMysteryIds.filter(id => id !== newMystery.id);

    // Record a $0 Gifted order in customOrders (and attempt DB orders insert)
    const giftOrderId = crypto.randomUUID();
    try {
      await supabase.from('orders').insert({
        id: giftOrderId,
        user_id: targetUserId,
        mystery_id: isUuid ? newMystery.id : null,
        amount: 0,
        status: 'succeeded',
      } as any);
    } catch {
      // Fallback to customOrders
    }

    record.customOrders.unshift({
      id: giftOrderId,
      mystery_id: newMystery.id,
      mystery_title: `${newMystery.title} (Gifted)`,
      amount: 0,
      status: 'gifted',
      reason: options.note || 'Complimentary mystery gifted by Admin',
      created_at: new Date().toISOString(),
    });

    prependAuditNote(
      record,
      `Gifted free murder mystery "${newMystery.title}"${options.note ? ` - Note: ${options.note}` : ''}.`,
      'gift'
    );

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, mystery: newMystery, crm: record };
  } catch (err: any) {
    console.error('adminGiftMystery error:', err);
    return { error: err.message || 'Failed to gift mystery' };
  }
}

export async function adminResetMysteryProgress(
  targetUserId: string,
  mysteryId: string,
  mysteryTitle: string
) {
  try {
    const { supabase } = await requireAdmin();
    await supabase
      .from('mysteries')
      .update({ current_round: 1, updated_at: new Date().toISOString() })
      .eq('id', mysteryId);

    const record = loadCustomerCrmSync(targetUserId);
    record.mysteryRoundOverrides[mysteryId] = 1;
    record.giftedMysteries = record.giftedMysteries.map(gm =>
      gm.id === mysteryId ? { ...gm, current_round: 1 } : gm
    );

    prependAuditNote(
      record,
      `Reset party progress for "${mysteryTitle}" back to Round 1.`,
      'support'
    );
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to reset mystery progress' };
  }
}

export async function adminRevokeMystery(
  targetUserId: string,
  mysteryId: string,
  mysteryTitle: string
) {
  try {
    const { supabase } = await requireAdmin();
    await supabase.from('mysteries').delete().eq('id', mysteryId);

    const record = loadCustomerCrmSync(targetUserId);
    record.giftedMysteries = record.giftedMysteries.filter(gm => gm.id !== mysteryId);
    if (!record.revokedMysteryIds.includes(mysteryId)) {
      record.revokedMysteryIds.push(mysteryId);
    }

    prependAuditNote(
      record,
      `Revoked & removed mystery "${mysteryTitle}" from customer account.`,
      'support'
    );
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to revoke mystery' };
  }
}

// ============================================================================
// 3. ORDER REFUNDS (Full or Partial Refund + Optional Mystery Revocation)
// ============================================================================

export async function adminRefundOrder(
  targetUserId: string,
  orderId: string,
  options: {
    refundType: 'full' | 'partial';
    refundAmountCents: number;
    originalAmountCents: number;
    reason?: string;
    revokeMysteryAccess?: boolean;
    mysteryId?: string | null;
    mysteryTitle?: string;
  }
) {
  try {
    const { supabase } = await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);

    const newStatus = options.refundType === 'full' ? 'refunded' : 'partial_refund';

    try {
      await supabase
        .from('orders')
        .update({ status: 'refunded' } as any)
        .eq('id', orderId);
    } catch {
      // Handled via orderOverrides
    }

    const customIdx = record.customOrders.findIndex(o => o.id === orderId);
    if (customIdx !== -1) {
      record.customOrders[customIdx].status = newStatus;
      record.customOrders[customIdx].refunded_amount = options.refundAmountCents;
      record.customOrders[customIdx].reason = options.reason;
    }

    record.orderOverrides[orderId] = {
      status: newStatus,
      refundedAmountCents: options.refundAmountCents,
      reason: options.reason || 'Admin refund',
      updatedAt: new Date().toISOString(),
    };

    if (options.revokeMysteryAccess && options.mysteryId) {
      await supabase.from('mysteries').delete().eq('id', options.mysteryId);
      record.giftedMysteries = record.giftedMysteries.filter(gm => gm.id !== options.mysteryId);
      if (!record.revokedMysteryIds.includes(options.mysteryId)) {
        record.revokedMysteryIds.push(options.mysteryId);
      }
    }

    const formattedAmt = `$${(options.refundAmountCents / 100).toFixed(2)}`;
    prependAuditNote(
      record,
      `Issued ${options.refundType.toUpperCase()} refund of ${formattedAmt} on "${options.mysteryTitle || 'Order'}"${options.reason ? ` - Reason: ${options.reason}` : ''}${options.revokeMysteryAccess ? ' (Mystery access revoked)' : ''}.`,
      'refund'
    );

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to refund order' };
  }
}

// ============================================================================
// 4. PROMOS, DISCOUNTS & STORE CREDIT BALANCE
// ============================================================================

export async function adminCreateCustomerPromo(
  targetUserId: string,
  promoInput: {
    code: string;
    discountType: 'percent' | 'fixed' | 'free_mystery';
    discountValue: number;
    note?: string;
    expiresAt?: string | null;
  }
) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);

    const cleanCode = promoInput.code.trim().toUpperCase().replace(/\s+/g, '-');
    if (!cleanCode) return { error: 'Promo code is required' };

    const discountStoreResult = await saveDiscountAction({
      name: promoInput.note
        ? `Customer Promo (${cleanCode}): ${promoInput.note}`
        : `Personal Customer Promo (${cleanCode})`,
      code: cleanCode,
      auto_apply: false,
      discount_type: promoInput.discountType === 'fixed' ? 'fixed' : 'percentage',
      discount_value:
        promoInput.discountType === 'free_mystery' ? 100 : promoInput.discountValue,
      applies_to: 'all',
      target_packages: [],
      target_mysteries: [],
      starts_at: new Date().toISOString(),
      ends_at: promoInput.expiresAt ? new Date(promoInput.expiresAt).toISOString() : null,
      usage_limit: 'one_per_customer',
      max_uses: 1,
      is_active: true,
    });

    const newPromo: CustomerPromo = {
      id: crypto.randomUUID(),
      discountStoreId: discountStoreResult.discount?.id,
      code: cleanCode,
      discountType: promoInput.discountType,
      discountValue: promoInput.discountType === 'free_mystery' ? 100 : promoInput.discountValue,
      note: promoInput.note,
      expiresAt: promoInput.expiresAt || null,
      used: false,
      createdAt: new Date().toISOString(),
    };

    record.promos.unshift(newPromo);

    const desc =
      newPromo.discountType === 'free_mystery'
        ? '100% OFF (Free Mystery)'
        : newPromo.discountType === 'percent'
        ? `${newPromo.discountValue}% OFF`
        : `$${newPromo.discountValue} OFF`;

    prependAuditNote(
      record,
      `Created personal promo code ${cleanCode} (${desc})${promoInput.note ? ` - ${promoInput.note}` : ''}.`,
      'promo'
    );

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to create promo code' };
  }
}

export async function adminDeleteCustomerPromo(targetUserId: string, promoId: string) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    const target = record.promos.find(p => p.id === promoId);
    record.promos = record.promos.filter(p => p.id !== promoId);
    if (target) {
      if (target.discountStoreId) {
        await deleteDiscountAction(target.discountStoreId).catch(() => {});
      }
      prependAuditNote(record, `Revoked promo code ${target.code}.`, 'promo');
    }
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete promo code' };
  }
}

export async function adminAdjustCreditBalance(
  targetUserId: string,
  deltaGbp: number,
  reason?: string
) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    const currentGbp = record.creditBalanceGbp ?? record.creditBalanceUsd ?? 0;
    const nextBalance = Math.max(0, Number((currentGbp + deltaGbp).toFixed(2)));
    record.creditBalanceGbp = nextBalance;
    record.creditBalanceUsd = nextBalance;

    const sign = deltaGbp >= 0 ? `+` : `-`;
    const description = `${reason || 'Admin credit adjustment'} (${sign}£${Math.abs(deltaGbp).toFixed(2)})`;
    record.creditLedger = [
      {
        id: crypto.randomUUID(),
        userId: targetUserId,
        amountGbp: Number(deltaGbp.toFixed(2)),
        type: 'admin_adjustment',
        description,
        createdAt: new Date().toISOString(),
      },
      ...(record.creditLedger || []),
    ];

    prependAuditNote(
      record,
      `Adjusted account store credit by ${sign}£${Math.abs(deltaGbp).toFixed(2)} (New balance: £${nextBalance.toFixed(2)})${reason ? ` - ${reason}` : ''}.`,
      'promo'
    );

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    revalidatePath(`/en/admin/users`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to adjust credit balance' };
  }
}

/**
 * System helper (callable from referral & checkout actions without requiring admin session)
 * to read a customer's current GBP credit balance and credit ledger.
 */
export async function getSystemCustomerCreditInfo(targetUserId: string): Promise<{
  creditBalanceGbp: number;
  creditLedger: CreditLedgerEntry[];
}> {
  if (!targetUserId) return { creditBalanceGbp: 0, creditLedger: [] };
  const record = loadCustomerCrmSync(targetUserId);
  return {
    creditBalanceGbp: Number((record.creditBalanceGbp ?? record.creditBalanceUsd ?? 0).toFixed(2)),
    creditLedger: record.creditLedger || [],
  };
}

/**
 * System helper (callable from referral & checkout actions) to add or deduct GBP credits
 * and record a full ledger entry + audit note in customer-crm.json.
 */
export async function applySystemCustomerCreditDeltaGbp({
  targetUserId,
  deltaGbp,
  type,
  description,
  relatedUserId,
  relatedEmail,
  orderId,
}: {
  targetUserId: string;
  deltaGbp: number;
  type: CreditLedgerEntry['type'];
  description: string;
  relatedUserId?: string;
  relatedEmail?: string;
  orderId?: string;
}): Promise<{ creditBalanceGbp: number; entry?: CreditLedgerEntry }> {
  if (!targetUserId || !deltaGbp) {
    const info = await getSystemCustomerCreditInfo(targetUserId);
    return { creditBalanceGbp: info.creditBalanceGbp };
  }
  const record = loadCustomerCrmSync(targetUserId);

  // Deduplicate if orderId + type already recorded
  if (
    orderId &&
    (record.creditLedger || []).some((e) => e.orderId === orderId && e.type === type)
  ) {
    return {
      creditBalanceGbp: Number((record.creditBalanceGbp ?? record.creditBalanceUsd ?? 0).toFixed(2)),
    };
  }

  const currentGbp = record.creditBalanceGbp ?? record.creditBalanceUsd ?? 0;
  const nextBalance = Math.max(0, Number((currentGbp + deltaGbp).toFixed(2)));
  record.creditBalanceGbp = nextBalance;
  record.creditBalanceUsd = nextBalance;

  const entry: CreditLedgerEntry = {
    id: crypto.randomUUID(),
    userId: targetUserId,
    amountGbp: Number(deltaGbp.toFixed(2)),
    type,
    description,
    relatedUserId,
    relatedEmail,
    orderId,
    createdAt: new Date().toISOString(),
  };

  record.creditLedger = [entry, ...(record.creditLedger || [])];
  const sign = deltaGbp >= 0 ? '+' : '-';
  prependAuditNote(
    record,
    `${description} (${sign}£${Math.abs(deltaGbp).toFixed(2)} • Balance: £${nextBalance.toFixed(2)})`,
    'promo'
  );

  saveCustomerCrm(targetUserId, record);
  return { creditBalanceGbp: nextBalance, entry };
}

// ============================================================================
// 5. AI QUOTA & COST CONTROLS
// ============================================================================

export async function adminUpdateAiQuota(
  targetUserId: string,
  update: {
    addBonusCredits?: number;
    resetBonusCredits?: boolean;
    unlimitedAi?: boolean;
    aiFrozen?: boolean;
    customSpendCapUsd?: number | null;
  }
) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);

    if (typeof update.addBonusCredits === 'number') {
      record.aiQuota.bonusImageCredits = Math.max(
        0,
        record.aiQuota.bonusImageCredits + update.addBonusCredits
      );
      prependAuditNote(
        record,
        `Granted +${update.addBonusCredits} bonus AI generation credits (Total bonus: ${record.aiQuota.bonusImageCredits}).`,
        'support'
      );
    }

    if (update.resetBonusCredits) {
      record.aiQuota.bonusImageCredits = 0;
      prependAuditNote(record, `Reset bonus AI generation credits to 0.`, 'support');
    }

    if (typeof update.unlimitedAi === 'boolean') {
      record.aiQuota.unlimitedAi = update.unlimitedAi;
      prependAuditNote(
        record,
        `${update.unlimitedAi ? 'Enabled' : 'Disabled'} Unlimited AI Generation for customer.`,
        'support'
      );
    }

    if (typeof update.aiFrozen === 'boolean') {
      record.aiQuota.aiFrozen = update.aiFrozen;
      prependAuditNote(
        record,
        `${update.aiFrozen ? 'FROZE' : 'Unfroze'} AI Generation access for customer.`,
        'security'
      );
    }

    if (update.customSpendCapUsd !== undefined) {
      record.aiQuota.customSpendCapUsd = update.customSpendCapUsd;
    }

    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to update AI quota' };
  }
}

// ============================================================================
// 6. CRM TAGS, PRIVATE ADMIN NOTES, REVIEW FLAG & ACCOUNT SECURITY
// ============================================================================

export async function adminAddNote(targetUserId: string, text: string) {
  try {
    await requireAdmin();
    if (!text.trim()) return { error: 'Note text is required' };
    const record = loadCustomerCrmSync(targetUserId);
    prependAuditNote(record, text.trim(), 'note');
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to add note' };
  }
}

export async function adminDeleteNote(targetUserId: string, noteId: string) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    record.notes = record.notes.filter(n => n.id !== noteId);
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to delete note' };
  }
}

export async function adminToggleTag(targetUserId: string, tag: string) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    if (record.tags.includes(tag)) {
      record.tags = record.tags.filter(t => t !== tag);
    } else {
      record.tags.push(tag);
    }
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to toggle tag' };
  }
}

export async function adminToggleProvidedReview(targetUserId: string, provided: boolean) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    record.providedReview = provided;
    prependAuditNote(
      record,
      `Marked "Provided Review" as ${provided ? 'YES' : 'NO'}.`,
      'note'
    );
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to update review status' };
  }
}

export async function adminToggleSuspendAccount(
  targetUserId: string,
  suspended: boolean,
  reason?: string
) {
  try {
    await requireAdmin();
    const record = loadCustomerCrmSync(targetUserId);
    record.accountSuspended = suspended;
    record.suspendedReason = suspended ? reason || 'Suspended by Admin' : undefined;
    if (suspended) {
      record.aiQuota.aiFrozen = true;
    }
    prependAuditNote(
      record,
      `${suspended ? `SUSPENDED customer account (${record.suspendedReason})` : 'Reactivated / unsuspended customer account'}.`,
      'security'
    );
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to update account suspension' };
  }
}

export async function adminSendPasswordReset(targetUserId: string, email: string) {
  try {
    const { supabase } = await requireAdmin();
    if (!email) return { error: 'Customer does not have an email address on file.' };

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3033';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/en/account`,
    });

    if (error) return { error: error.message };

    const record = loadCustomerCrmSync(targetUserId);
    prependAuditNote(record, `Sent password reset email to ${email}.`, 'security');
    saveCustomerCrm(targetUserId, record);
    revalidatePath(`/en/admin/users/${targetUserId}`);
    return { success: true, crm: record };
  } catch (err: any) {
    return { error: err.message || 'Failed to send password reset email' };
  }
}

export async function adminDeleteCustomerAccount(targetUserId: string) {
  try {
    const { supabase, user } = await requireAdmin();

    if (!targetUserId) {
      return { error: 'Target user ID is required.' };
    }

    if (user?.id === targetUserId) {
      return { error: 'You cannot delete your own admin account.' };
    }

    if (ADMIN_UID_ALLOWLIST.includes(targetUserId)) {
      return { error: 'Protected Super Admin accounts cannot be deleted.' };
    }

    const { data: targetProfile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_config')
      .eq('id', targetUserId)
      .maybeSingle();

    const targetEmail = String((targetProfile as any)?.email || '')
      .toLowerCase()
      .trim();

    if (targetEmail && ADMIN_EMAIL_ALLOWLIST.includes(targetEmail)) {
      return { error: 'Protected Super Admin accounts cannot be deleted.' };
    }

    // 1. Delete dependent customer data (guests, connections, invitations, custom mysteries, roles)
    await Promise.allSettled([
      supabase.from('guests').delete().eq('user_id', targetUserId),
      (supabase as any)
        .from('guest_connections')
        .delete()
        .or(`host_user_id.eq.${targetUserId},guest_user_id.eq.${targetUserId}`),
      (supabase as any)
        .from('guest_invitations')
        .delete()
        .or(`inviter_user_id.eq.${targetUserId},invited_user_id.eq.${targetUserId}`),
      (supabase as any).from('customer_mysteries').delete().eq('user_id', targetUserId),
      supabase.from('mysteries').delete().eq('created_by', targetUserId),
      supabase.from('user_roles').delete().eq('user_id', targetUserId),
    ]);

    // 2. If SUPABASE_SERVICE_ROLE_KEY is configured, hard-delete from auth.users & profiles
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await serviceClient.from('profiles').delete().eq('id', targetUserId);
        await serviceClient.auth.admin.deleteUser(targetUserId);
      } catch (srvErr) {
        console.warn('Service role deleteUser warning:', srvErr);
      }
    }

    // 3. Also attempt RPC / direct profile delete via authenticated admin session
    try {
      await (supabase as any).rpc('admin_delete_user_account', {
        target_user_id: targetUserId,
      });
    } catch {
      // RPC optional
    }

    try {
      await supabase.from('profiles').delete().eq('id', targetUserId);
    } catch {
      // ignore if blocked by FK or RLS
    }

    // 4. Guaranteed Scrub & Tombstone fallback on public.profiles (permitted via Admin FOR UPDATE RLS)
    //    Ensures that even if public.profiles row is retained by order FKs or anon-key RLS,
    //    all PII is wiped and avatar_config.is_deleted marks it deleted immediately across all queries.
    const nowIso = new Date().toISOString();
    try {
      const existingConfig =
        targetProfile &&
        typeof (targetProfile as any).avatar_config === 'object' &&
        (targetProfile as any).avatar_config !== null
          ? (targetProfile as any).avatar_config
          : {};

      await (supabase as any)
        .from('profiles')
        .update({
          full_name: '[Deleted Account]',
          email: null,
          bio: null,
          fun_facts: null,
          location: null,
          country: null,
          how_found_us: null,
          avatar_url: null,
          character_preferences: [],
          dietary_needs: [],
          avatar_config: {
            ...existingConfig,
            is_deleted: true,
            deleted_at: nowIso,
            deleted_by: user?.id || 'admin',
          },
        })
        .eq('id', targetUserId);
    } catch (scrubErr) {
      console.warn('Profile scrub fallback warning:', scrubErr);
    }

    // 5. Mark deleted in local CRM store as well
    const record = loadCustomerCrmSync(targetUserId);
    record.accountDeleted = true;
    record.accountSoftDeleted = false;
    record.accountSuspended = true;
    record.deletedAt = nowIso;
    record.membership.isActive = false;
    record.aiQuota.aiFrozen = true;
    prependAuditNote(
      record,
      `Account permanently DELETED by Admin (${user?.email || 'Admin'}).`,
      'security'
    );
    saveCustomerCrm(targetUserId, record);

    // Also remove any 60-day recovery snapshot from Supabase Storage
    await supabase.storage
      .from('character-images')
      .remove([`system/deleted-accounts/${targetUserId}.json`])
      .catch(() => {});

    revalidatePath('/en/admin/users');
    revalidatePath(`/en/admin/users/${targetUserId}`);
    revalidatePath('/en/admin');

    return { success: true };
  } catch (err: any) {
    console.error('adminDeleteCustomerAccount error:', err);
    return { error: err.message || 'Failed to delete customer account' };
  }
}

/**
 * System helper called when a customer self-deletes their account from /en/account/settings.
 * Marks the account as soft-deleted in a 60-day quarantine hold inside customer-crm.json.
 */
export async function recordSystemCustomerSoftDelete({
  targetUserId,
  deletedAt,
  purgeAfter,
  mysteriesCount,
  guestsCount,
}: {
  targetUserId: string;
  deletedAt: string;
  purgeAfter: string;
  mysteriesCount: number;
  guestsCount: number;
}) {
  if (!targetUserId) return;
  const record = loadCustomerCrmSync(targetUserId);
  record.accountSoftDeleted = true;
  record.accountDeleted = false;
  record.accountSuspended = true;
  record.deletedAt = deletedAt;
  record.purgeAfter = purgeAfter;
  record.aiQuota.aiFrozen = true;
  const purgeDateStr = new Date(purgeAfter).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  prependAuditNote(
    record,
    `Customer self-deleted account (60-day recovery quarantine until ${purgeDateStr} • ${mysteriesCount} mysteries, ${guestsCount} guests preserved).`,
    'security'
  );
  saveCustomerCrm(targetUserId, record);
}

/**
 * 1-Click Admin Account Reinstatement:
 * Restores a customer account from the 60-day soft-delete quarantine,
 * re-hydrates any missing profile/mystery/guest rows from the archived snapshot,
 * clears the soft_deleted flags, and sends a "Welcome Back" email to the customer.
 */
export async function adminReinstateCustomerAccount(targetUserId: string) {
  try {
    const { supabase, user } = await requireAdmin();

    if (!targetUserId) {
      return { error: 'Target user ID is required.' };
    }

    // 1. Download 60-day snapshot from Supabase Storage if available
    let snapshot: any = null;
    try {
      const { data: blob } = await supabase.storage
        .from('character-images')
        .download(`system/deleted-accounts/${targetUserId}.json`);
      if (blob) {
        snapshot = JSON.parse(await blob.text());
      }
    } catch {
      // Snapshot optional if DB rows are still intact
    }

    // 2. Fetch current profile row
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .maybeSingle();

    const existingConfig =
      currentProfile &&
      typeof (currentProfile as any).avatar_config === 'object' &&
      (currentProfile as any).avatar_config !== null
        ? { ...(currentProfile as any).avatar_config }
        : { ...(snapshot?.profile?.avatar_config || {}) };

    delete existingConfig.soft_deleted;
    delete existingConfig.is_deleted;
    delete existingConfig.deleted_at;
    delete existingConfig.purge_after;
    delete existingConfig.deletion_source;
    existingConfig.reinstated_at = new Date().toISOString();
    existingConfig.reinstated_by = user?.email || 'admin';

    const restoredEmail =
      (currentProfile as any)?.email || snapshot?.email || snapshot?.profile?.email || null;
    const restoredName =
      (currentProfile as any)?.full_name &&
      (currentProfile as any)?.full_name !== '[Deleted Account]'
        ? (currentProfile as any).full_name
        : snapshot?.fullName || snapshot?.profile?.full_name || 'Mystery Host';

    // 3. Restore profile row & clear soft_deleted flags
    await (supabase as any)
      .from('profiles')
      .update({
        full_name: restoredName,
        email: restoredEmail,
        bio: (currentProfile as any)?.bio ?? snapshot?.profile?.bio ?? null,
        country: (currentProfile as any)?.country ?? snapshot?.profile?.country ?? null,
        how_found_us:
          (currentProfile as any)?.how_found_us ?? snapshot?.profile?.how_found_us ?? null,
        avatar_config: existingConfig,
      })
      .eq('id', targetUserId);

    // 4. If service role key is configured, clear account_deleted on auth.users.user_metadata
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (supabaseUrl && serviceRoleKey) {
      try {
        const serviceClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        await serviceClient.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...(snapshot?.userMetadata || {}),
            full_name: restoredName,
            account_deleted: false,
            deleted_at: null,
            purge_after: null,
          },
        });
      } catch {
        // non-fatal
      }
    }

    // 5. Re-hydrate any missing guests, mysteries, characters, clues, or orders from the 60-day snapshot
    if (snapshot) {
      if (Array.isArray(snapshot.guests) && snapshot.guests.length > 0) {
        await supabase
          .from('guests')
          .upsert(snapshot.guests, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.mysteries) && snapshot.mysteries.length > 0) {
        await (supabase.from('mysteries') as any)
          .upsert(snapshot.mysteries, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.characters) && snapshot.characters.length > 0) {
        await supabase
          .from('characters')
          .upsert(snapshot.characters, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.clues) && snapshot.clues.length > 0) {
        await supabase
          .from('clues')
          .upsert(snapshot.clues, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.relationships) && snapshot.relationships.length > 0) {
        await supabase
          .from('relationships')
          .upsert(snapshot.relationships, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.motives) && snapshot.motives.length > 0) {
        await supabase
          .from('motives')
          .upsert(snapshot.motives, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.plotBeats) && snapshot.plotBeats.length > 0) {
        await supabase
          .from('plot_beats')
          .upsert(snapshot.plotBeats, { onConflict: 'id' });
      }
      if (Array.isArray(snapshot.orders) && snapshot.orders.length > 0) {
        await (supabase as any)
          .from('orders')
          .upsert(snapshot.orders, { onConflict: 'id' });
      }
    }

    // 6. Update CRM record to active
    const record = loadCustomerCrmSync(targetUserId);
    record.accountSoftDeleted = false;
    record.accountDeleted = false;
    record.accountSuspended = false;
    record.deletedAt = undefined;
    record.purgeAfter = undefined;
    record.aiQuota.aiFrozen = false;
    prependAuditNote(
      record,
      `Account & mysteries REINSTATED from 60-day recovery hold by Admin (${user?.email || 'Admin'}).`,
      'security'
    );
    saveCustomerCrm(targetUserId, record);

    // 7. Send "Welcome Back! Your Account Has Been Reinstated" email to the customer
    if (process.env.RESEND_API_KEY && restoredEmail) {
      try {
        const { Resend } = await import('resend');
        const { buildBrandedEmailShell } = await import('@/lib/branded-email-template');
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Back Pocket Mysteries <Hello@backpocketgames.com>',
          to: [restoredEmail],
          replyTo: 'Hello@backpocketgames.com',
          subject: `🎉 Welcome Back! Your Back Pocket Mysteries Account & Mysteries Are Restored`,
          html: buildBrandedEmailShell({
            preheader: `Your Back Pocket Mysteries account, purchased mysteries, and saved guest roster have been fully reinstated.`,
            kicker: 'ACCOUNT REINSTATED • ALL MYSTERIES RESTORED',
            headline: `Welcome Back, ${restoredName}!`,
            bodyHtml: `
              <p style="margin:0 0 16px 0;color:#1e191c;font-size:15px;line-height:1.6;">
                Great news — our team has restored your Back Pocket Mysteries account from our 60-day safety backup!
              </p>
              <div style="background-color:#141115;border:1px solid #27272a;border-left:4px solid #10b981;padding:18px 22px;border-radius:12px;margin-bottom:18px;">
                <p style="margin:0 0 6px 0;color:#10b981;font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">
                  FULLY RESTORED &amp; READY TO HOST
                </p>
                <p style="margin:0;color:#ffffff;font-size:14px;font-weight:600;line-height:1.6;">
                  ✓ All of your purchased mystery packs, AI character portraits, crime-scene clues, audio wiretaps, and saved guest profiles are active and waiting in your account.
                </p>
              </div>
              <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">
                Click below to sign back in and access your mysteries anytime.
              </p>
            `,
            ctaText: 'Sign In to My Mysteries →',
            ctaUrl: 'https://backpocketmysteries.com/en/login',
          }),
        });
      } catch {
        // non-fatal
      }
    }

    revalidatePath('/en/admin/users');
    revalidatePath(`/en/admin/users/${targetUserId}`);
    revalidatePath('/en/admin');

    return { success: true, crm: record };
  } catch (err: any) {
    console.error('adminReinstateCustomerAccount error:', err);
    return { error: err.message || 'Failed to reinstate customer account' };
  }
}


