'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

export interface ReferralRedemptionRecord {
  id: string;
  referralCode: string;
  referrerUserId: string;
  referrerEmail?: string;
  referredUserId?: string;
  referredEmail?: string;
  orderId?: string;
  mysteryId?: string;
  rewardCodeGenerated: string;
  createdAt: string;
}

export interface ReferrerRewardVoucher {
  code: string;
  referrerUserId: string;
  referredEmail?: string;
  discountPercent: number;
  used: boolean;
  usedAt?: string;
  usedOrderId?: string;
  createdAt: string;
}

export interface PromoCodeUsageEntry {
  code: string;
  userId?: string;
  email?: string;
  orderId?: string;
  mysteryId?: string;
  usedAt: string;
}

interface ReferralStoreData {
  /** Maps canonical referralCode (e.g. "REF-GABRIELLA-4903") -> referrer user info */
  referralCodes: Record<
    string,
    {
      code: string;
      userId: string;
      email: string;
      fullName: string;
      createdAt: string;
    }
  >;
  /** Tracks every completed referral purchase where a friend used a referrer's code */
  redemptions: ReferralRedemptionRecord[];
  /** Single-use 20% reward vouchers unlocked for the referrer AFTER their friend pays */
  rewardVouchers: Record<string, ReferrerRewardVoucher>;
  /** Tracks every promo/referral code redemption per user/email so one-per-customer & anti-abuse rules are enforced */
  codeUsages: Array<{
    code: string;
    userId?: string;
    email?: string;
    orderId?: string;
    mysteryId?: string;
    usedAt: string;
  }>;
}

const REFERRAL_STORE_FILENAME = '.referrals-store.json';

function getReferralStorePath(): string {
  const cwdPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data', REFERRAL_STORE_FILENAME);
  try {
    const dir = path.dirname(cwdPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    return cwdPath;
  } catch {
    return path.join('/tmp', REFERRAL_STORE_FILENAME);
  }
}

function readReferralStore(): ReferralStoreData {
  const filePath = getReferralStorePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      return {
        referralCodes: parsed.referralCodes || {},
        redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [],
        rewardVouchers: parsed.rewardVouchers || {},
        codeUsages: Array.isArray(parsed.codeUsages) ? parsed.codeUsages : [],
      };
    }
  } catch {
    // ignore
  }
  return {
    referralCodes: {},
    redemptions: [],
    rewardVouchers: {},
    codeUsages: [],
  };
}

function writeReferralStore(data: ReferralStoreData): void {
  const filePath = getReferralStorePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // ignore in read-only env
  }
}

/**
 * Generates a deterministic, clean, unique referral code for any host user:
 * e.g. "FRIEND-GABRIELLA-4903" or "GABRIELLA20-4903"
 */
export async function buildUserReferralCode(
  userId: string,
  fullName?: string | null,
  email?: string | null
): Promise<string> {
  const rawBase = (fullName?.split(' ')[0] || email?.split('@')[0] || 'HOST')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase()
    .slice(0, 10);
  const cleanBase = rawBase || 'HOST';
  const shortSuffix = (userId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || '20';
  return `${cleanBase}20-${shortSuffix}`;
}

/**
 * Registers or retrieves the host's personal "Give 20%, Get 20%" referral code and wallet status.
 */
export async function getOrRegisterUserReferralWalletAction(): Promise<{
  referralCode: string;
  referralLink: string;
  rewardVouchers: ReferrerRewardVoucher[];
  referralsCompletedCount: number;
  appliedSignupPromo?: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      referralCode: 'FRIEND20',
      referralLink: 'https://backpocketmysteries.com/en/login',
      rewardVouchers: [],
      referralsCompletedCount: 0,
    };
  }

  const fullName = (user.user_metadata?.full_name as string) || '';
  const code = await buildUserReferralCode(user.id, fullName, user.email);

  const store = readReferralStore();
  if (!store.referralCodes[code]) {
    store.referralCodes[code] = {
      code,
      userId: user.id,
      email: (user.email || '').toLowerCase(),
      fullName: fullName || user.email || 'Host',
      createdAt: new Date().toISOString(),
    };
    writeReferralStore(store);
  }

  const myRewards = Object.values(store.rewardVouchers).filter(
    (v) => v.referrerUserId === user.id
  );
  const myRedemptions = store.redemptions.filter((r) => r.referrerUserId === user.id);

  return {
    referralCode: code,
    referralLink: `https://backpocketmysteries.com/en/login?promo=${encodeURIComponent(code)}&step=signup`,
    rewardVouchers: myRewards,
    referralsCompletedCount: myRedemptions.length,
    appliedSignupPromo: (user.user_metadata?.promo_code as string) || null,
  };
}

/**
 * Resolves a potential referral code or referrer reward voucher with strict anti-abuse checks:
 *
 * ANTI-ABUSE SAFEGUARDS:
 * 1. No Self-Referral: Referrer cannot use their own referral code (checked by userId and email).
 * 2. First-Order Only (New Customers Only): A friend referral code ("Give 20% Off") can ONLY be used
 *    by a customer who has 0 prior completed orders and has never redeemed a referral code before.
 * 3. One-Time Use per Customer: Standard `one_per_customer` promo codes and referral codes cannot be
 *    reused by the same userId or email across multiple orders.
 * 4. Referrer Reward Only Unlocks After Friend's Paid Purchase: Referrer gets a unique single-use
 *    `REWARD20-XXXX` code only when their friend completes payment, and that reward code is locked
 *    exclusively to the referrer's account for 1 order.
 */
export async function validateReferralOrRewardCode({
  code,
  currentUserId,
  currentUserEmail,
}: {
  code: string;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
}): Promise<{
  matched: boolean;
  valid: boolean;
  type?: 'friend_referral' | 'referrer_reward';
  discountPercent?: number;
  name?: string;
  referrerUserId?: string;
  error?: string;
}> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return { matched: false, valid: false };

  const store = readReferralStore();
  const normalizedEmail = (currentUserEmail || '').trim().toLowerCase();

  // Case A: Is this a single-use Referrer Reward Voucher (e.g. REWARD20-XXXX)?
  const rewardVoucher = store.rewardVouchers[cleanCode];
  if (rewardVoucher) {
    if (rewardVoucher.used) {
      return {
        matched: true,
        valid: false,
        error: 'This referral reward voucher has already been used.',
      };
    }
    if (currentUserId && rewardVoucher.referrerUserId !== currentUserId) {
      return {
        matched: true,
        valid: false,
        error: 'This reward voucher belongs to another host account.',
      };
    }
    return {
      matched: true,
      valid: true,
      type: 'referrer_reward',
      discountPercent: rewardVoucher.discountPercent || 20,
      name: 'Referral Reward (20% Off)',
      referrerUserId: rewardVoucher.referrerUserId,
    };
  }

  // Case B: Is this a Host's Referral Code (either registered in store OR matching pattern NAME20-XXXX)?
  let referrerEntry = store.referralCodes[cleanCode];

  // If not yet in store, check if a profile in Supabase matches the 4-char ID suffix
  if (!referrerEntry) {
    const suffixMatch = cleanCode.match(/^([A-Z0-9]+)20-([A-F0-9]{4})$/);
    if (suffixMatch) {
      try {
        const supabase = await createClient();
        const { data: profiles } = await (supabase as any)
          .from('profiles')
          .select('id, email, full_name');
        const found = (profiles || []).find((p: any) =>
          (p.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().startsWith(suffixMatch[2])
        );
        if (found) {
          referrerEntry = {
            code: cleanCode,
            userId: found.id,
            email: (found.email || '').toLowerCase(),
            fullName: found.full_name || 'A Friend',
            createdAt: new Date().toISOString(),
          };
          store.referralCodes[cleanCode] = referrerEntry;
          writeReferralStore(store);
        }
      } catch {
        // ignore
      }
    }
  }

  if (!referrerEntry) {
    return { matched: false, valid: false };
  }

  // Anti-Abuse 1: Prevent Self-Referral (by User ID or Email)
  if (
    (currentUserId && referrerEntry.userId === currentUserId) ||
    (normalizedEmail && referrerEntry.email && referrerEntry.email === normalizedEmail)
  ) {
    return {
      matched: true,
      valid: false,
      error: 'You cannot use your own referral code. Share it with a friend to give 20% & get 20%!',
    };
  }

  // Anti-Abuse 2: Check if this user/email has already used ANY friend referral code before
  const alreadyUsedReferral = store.redemptions.some(
    (r) =>
      (currentUserId && r.referredUserId === currentUserId) ||
      (normalizedEmail && r.referredEmail === normalizedEmail)
  );
  if (alreadyUsedReferral) {
    return {
      matched: true,
      valid: false,
      error: 'Friend referral codes are valid for your first mystery order only.',
    };
  }

  // Anti-Abuse 3: Check if this user already has prior completed orders in Supabase
  if (currentUserId) {
    try {
      const supabase = await createClient();
      const { count } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUserId)
        .eq('status', 'succeeded');

      if (count && count > 0) {
        return {
          matched: true,
          valid: false,
          error: 'Friend referral codes are exclusively for new customers on their first order.',
        };
      }
    } catch {
      // ignore
    }
  }

  const referrerFirstName = (referrerEntry.fullName || 'Friend').split(' ')[0];
  return {
    matched: true,
    valid: true,
    type: 'friend_referral',
    discountPercent: 20,
    name: `Friend Referral from ${referrerFirstName} (20% Off First Mystery)`,
    referrerUserId: referrerEntry.userId,
  };
}

/**
 * Checks whether a standard discount code with `usage_limit === 'one_per_customer'` or `max_uses`
 * has already been redeemed by this user/email.
 */
export async function checkPromoUsageAbuse({
  code,
  usageLimit,
  maxUses,
  timesUsed,
  currentUserId,
  currentUserEmail,
}: {
  code: string;
  usageLimit: 'unlimited' | 'one_per_customer' | 'max_uses';
  maxUses: number | null;
  timesUsed: number;
  currentUserId?: string | null;
  currentUserEmail?: string | null;
}): Promise<{ allowed: boolean; error?: string }> {
  const cleanCode = (code || '').trim().toUpperCase();
  const store = readReferralStore();
  const normalizedEmail = (currentUserEmail || '').trim().toLowerCase();

  const totalRecordedUses = store.codeUsages.filter((u) => u.code === cleanCode).length;
  const effectiveUses = Math.max(timesUsed || 0, totalRecordedUses);

  if (usageLimit === 'max_uses' && maxUses !== null && effectiveUses >= maxUses) {
    return {
      allowed: false,
      error: 'This promo code has reached its maximum number of redemptions.',
    };
  }

  if (usageLimit === 'one_per_customer' && (currentUserId || normalizedEmail)) {
    const usedByCustomer = store.codeUsages.some(
      (u) =>
        u.code === cleanCode &&
        ((currentUserId && u.userId === currentUserId) ||
          (normalizedEmail && u.email === normalizedEmail))
    );
    if (usedByCustomer) {
      return {
        allowed: false,
        error: 'You have already used this promo code on a previous order (limit 1 per customer).',
      };
    }
  }

  return { allowed: true };
}

/**
 * Called ONLY when an order is actually paid/confirmed.
 * 1. Marks single-use promo/reward codes as used by this customer.
 * 2. If a friend referral code was used, generates a unique single-use 20% off reward voucher
 *    for the referring host ("Give 20%, Get 20%").
 */
export async function recordPromoOrReferralRedemptionOnPaidOrder({
  code,
  buyerUserId,
  buyerEmail,
  orderId,
  mysteryId,
}: {
  code?: string | null;
  buyerUserId?: string | null;
  buyerEmail?: string | null;
  orderId?: string | null;
  mysteryId?: string | null;
}): Promise<{ rewardCodeIssued?: string; referrerUserId?: string }> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return {};

  const store = readReferralStore();
  const normalizedEmail = (buyerEmail || '').trim().toLowerCase();

  // Deduplicate if this exact orderId was already recorded
  if (
    orderId &&
    store.codeUsages.some((u) => u.code === cleanCode && u.orderId === orderId)
  ) {
    return {};
  }

  store.codeUsages.push({
    code: cleanCode,
    userId: buyerUserId || undefined,
    email: normalizedEmail || undefined,
    orderId: orderId || undefined,
    mysteryId: mysteryId || undefined,
    usedAt: new Date().toISOString(),
  });

  // 1. Was it a Referrer Reward Voucher? Mark it used so it cannot be used a second time.
  if (store.rewardVouchers[cleanCode]) {
    store.rewardVouchers[cleanCode].used = true;
    store.rewardVouchers[cleanCode].usedAt = new Date().toISOString();
    store.rewardVouchers[cleanCode].usedOrderId = orderId || undefined;
    writeReferralStore(store);
    return {};
  }

  // 2. Was it a Friend Referral Code? Issue the referrer their 20% off reward voucher!
  const referralCheck = await validateReferralOrRewardCode({
    code: cleanCode,
    currentUserId: undefined,
    currentUserEmail: undefined,
  });

  const referrerEntry = store.referralCodes[cleanCode];
  if (referrerEntry && referrerEntry.userId !== buyerUserId) {
    const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
    const rewardCode = `REWARD20-${randSuffix}`;

    store.rewardVouchers[rewardCode] = {
      code: rewardCode,
      referrerUserId: referrerEntry.userId,
      referredEmail: normalizedEmail || undefined,
      discountPercent: 20,
      used: false,
      createdAt: new Date().toISOString(),
    };

    store.redemptions.push({
      id: crypto.randomUUID(),
      referralCode: cleanCode,
      referrerUserId: referrerEntry.userId,
      referrerEmail: referrerEntry.email,
      referredUserId: buyerUserId || undefined,
      referredEmail: normalizedEmail || undefined,
      orderId: orderId || undefined,
      mysteryId: mysteryId || undefined,
      rewardCodeGenerated: rewardCode,
      createdAt: new Date().toISOString(),
    });

    writeReferralStore(store);
    return {
      rewardCodeIssued: rewardCode,
      referrerUserId: referrerEntry.userId,
    };
  }

  // 3. Also increment times_used in the main discounts store if it's a standard discount code
  try {
    const discountsFile = path.join(process.cwd(), '.discounts-store.json');
    if (fs.existsSync(discountsFile)) {
      const parsed = JSON.parse(fs.readFileSync(discountsFile, 'utf8'));
      const discounts = parsed.discounts || {};
      for (const d of Object.values(discounts) as any[]) {
        if (d.code && String(d.code).toUpperCase() === cleanCode) {
          d.times_used = (Number(d.times_used) || 0) + 1;
        }
      }
      fs.writeFileSync(discountsFile, JSON.stringify(parsed, null, 2), 'utf8');
    }
  } catch {
    // ignore
  }

  writeReferralStore(store);
  return {};
}
