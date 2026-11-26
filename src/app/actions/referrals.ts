'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';
import {
  getSystemCustomerCreditInfo,
  applySystemCustomerCreditDeltaGbp,
  CreditLedgerEntry,
} from '@/app/actions/admin-users';
import { REFERRAL_CREDIT_GBP } from '@/utils/localization';

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
  friendCreditAwardedGbp?: number;
  referrerCreditAwardedGbp?: number;
  createdAt: string;
}

export interface ReferrerRewardVoucher {
  code: string;
  referrerUserId: string;
  referredEmail?: string;
  discountPercent: number;
  creditAmountGbp?: number;
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
  /** Maps canonical referralCode (e.g. "GABRIELLA5-4903") -> referrer user info */
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
  /** Tracks every completed referral redemption where a friend used a referrer's code */
  redemptions: ReferralRedemptionRecord[];
  /** Legacy reward vouchers */
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
 * Generates a deterministic, clean, unique "Give £5, Get £5" referral code for any host user:
 * e.g. "GABRIELLA5-4903"
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
  const shortSuffix = (userId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || '05';
  return `${cleanBase}5-${shortSuffix}`;
}

async function resolveReferrerEntryByCode(
  cleanCode: string,
  store: ReferralStoreData
): Promise<{
  code: string;
  userId: string;
  email: string;
  fullName: string;
  createdAt: string;
} | null> {
  if (store.referralCodes[cleanCode]) {
    return store.referralCodes[cleanCode];
  }

  // Match either new NAME5-XXXX or legacy NAME20-XXXX format
  const suffixMatch = cleanCode.match(/^([A-Z0-9]+?)(?:5|20)-([A-F0-9]{4})$/);
  if (!suffixMatch) return null;

  // Check if another key in store.referralCodes shares the same 4-char user ID suffix
  const existingBySuffix = Object.values(store.referralCodes).find((entry) =>
    (entry.userId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().startsWith(suffixMatch[2])
  );
  if (existingBySuffix) {
    store.referralCodes[cleanCode] = {
      ...existingBySuffix,
      code: cleanCode,
    };
    writeReferralStore(store);
    return store.referralCodes[cleanCode];
  }

  try {
    const supabase = await createClient();
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, email, full_name');
    const found = (profiles || []).find((p: any) =>
      (p.id || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().startsWith(suffixMatch[2])
    );
    if (found) {
      const entry = {
        code: cleanCode,
        userId: found.id,
        email: (found.email || '').toLowerCase(),
        fullName: found.full_name || 'A Friend',
        createdAt: new Date().toISOString(),
      };
      store.referralCodes[cleanCode] = entry;
      writeReferralStore(store);
      return entry;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Registers or retrieves the host's personal "Give £5, Get £5" referral code, credit balance, and wallet status.
 */
export async function getOrRegisterUserReferralWalletAction(): Promise<{
  referralCode: string;
  referralLink: string;
  creditBalanceGbp: number;
  creditLedger: CreditLedgerEntry[];
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
      referralCode: 'FRIEND5',
      referralLink: 'https://backpocketmysteries.com/en/login',
      creditBalanceGbp: 0,
      creditLedger: [],
      rewardVouchers: [],
      referralsCompletedCount: 0,
    };
  }

  const fullName = (user.user_metadata?.full_name as string) || '';
  const code = await buildUserReferralCode(user.id, fullName, user.email);
  const legacyCode = code.replace(/5-([A-F0-9]{4})$/, '20-$1');

  const store = readReferralStore();
  let changed = false;
  if (!store.referralCodes[code]) {
    store.referralCodes[code] = {
      code,
      userId: user.id,
      email: (user.email || '').toLowerCase(),
      fullName: fullName || user.email || 'Host',
      createdAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (!store.referralCodes[legacyCode]) {
    store.referralCodes[legacyCode] = {
      code: legacyCode,
      userId: user.id,
      email: (user.email || '').toLowerCase(),
      fullName: fullName || user.email || 'Host',
      createdAt: new Date().toISOString(),
    };
    changed = true;
  }
  if (changed) {
    writeReferralStore(store);
  }

  // If the user signed up with a friend's referral code in user_metadata.promo_code, ensure their £5 credit is claimed
  const signupPromo = ((user.user_metadata?.promo_code as string) || '').trim().toUpperCase();
  if (signupPromo && signupPromo !== code && signupPromo !== legacyCode) {
    const alreadyRedeemed = store.redemptions.some(
      (r) =>
        r.referredUserId === user.id ||
        (user.email && r.referredEmail === user.email.toLowerCase())
    );
    if (!alreadyRedeemed) {
      await claimFriendReferralCodeForCreditInternal({
        code: signupPromo,
        buyerUserId: user.id,
        buyerEmail: user.email || null,
      }).catch(() => {});
    }
  }

  const freshStore = readReferralStore();
  const myRewards = Object.values(freshStore.rewardVouchers).filter(
    (v) => v.referrerUserId === user.id
  );
  const myRedemptions = freshStore.redemptions.filter((r) => r.referrerUserId === user.id);
  const creditInfo = await getSystemCustomerCreditInfo(user.id);

  return {
    referralCode: code,
    referralLink: `https://backpocketmysteries.com/en/login?promo=${encodeURIComponent(code)}&step=signup`,
    creditBalanceGbp: creditInfo.creditBalanceGbp,
    creditLedger: creditInfo.creditLedger,
    rewardVouchers: myRewards,
    referralsCompletedCount: myRedemptions.length,
    appliedSignupPromo: (user.user_metadata?.promo_code as string) || null,
  };
}

/**
 * Claims a friend's "Give £5, Get £5" referral code for the signed-in customer:
 * - Credits +£5.00 to the customer's account balance
 * - Credits +£5.00 to the referring friend's ("Giver's") account balance
 */
export async function claimFriendReferralCodeForCreditAction(code: string): Promise<{
  matched: boolean;
  success: boolean;
  creditAddedGbp?: number;
  newCreditBalanceGbp?: number;
  referrerName?: string;
  message?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      matched: false,
      success: false,
      error: 'Please sign in to apply a referral code to your account.',
    };
  }

  return claimFriendReferralCodeForCreditInternal({
    code,
    buyerUserId: user.id,
    buyerEmail: user.email || null,
  });
}

async function claimFriendReferralCodeForCreditInternal({
  code,
  buyerUserId,
  buyerEmail,
  orderId,
  mysteryId,
}: {
  code: string;
  buyerUserId: string;
  buyerEmail?: string | null;
  orderId?: string;
  mysteryId?: string;
}): Promise<{
  matched: boolean;
  success: boolean;
  creditAddedGbp?: number;
  newCreditBalanceGbp?: number;
  referrerName?: string;
  message?: string;
  error?: string;
}> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return { matched: false, success: false };

  const validation = await validateReferralOrRewardCode({
    code: cleanCode,
    currentUserId: buyerUserId,
    currentUserEmail: buyerEmail,
  });

  if (!validation.matched) {
    return { matched: false, success: false };
  }

  if (!validation.valid) {
    return {
      matched: true,
      success: false,
      error: validation.error || 'This referral code cannot be applied.',
    };
  }

  const store = readReferralStore();
  const referrerEntry = await resolveReferrerEntryByCode(cleanCode, store);
  if (!referrerEntry) {
    return { matched: false, success: false };
  }

  const normalizedEmail = (buyerEmail || '').trim().toLowerCase();
  const referrerFirstName = (referrerEntry.fullName || 'Friend').split(' ')[0];

  // Check if this user already claimed a friend referral credit
  const existingRedemption = store.redemptions.find(
    (r) =>
      (buyerUserId && r.referredUserId === buyerUserId) ||
      (normalizedEmail && r.referredEmail === normalizedEmail)
  );

  if (existingRedemption) {
    const info = await getSystemCustomerCreditInfo(buyerUserId);
    return {
      matched: true,
      success: false,
      newCreditBalanceGbp: info.creditBalanceGbp,
      error: 'You have already claimed a £5 friend referral credit on your account.',
    };
  }

  // 1. Credit +£5.00 to the Friend (Receiver)
  const friendCreditRes = await applySystemCustomerCreditDeltaGbp({
    targetUserId: buyerUserId,
    deltaGbp: REFERRAL_CREDIT_GBP,
    type: 'referral_received',
    description: `Give £5, Get £5: Applied ${referrerFirstName}'s referral code (${cleanCode})`,
    relatedUserId: referrerEntry.userId,
    relatedEmail: referrerEntry.email,
    orderId,
  });

  // 2. Credit +£5.00 to the Giver (Referrer)
  await applySystemCustomerCreditDeltaGbp({
    targetUserId: referrerEntry.userId,
    deltaGbp: REFERRAL_CREDIT_GBP,
    type: 'referral_given',
    description: `Give £5, Get £5: Friend ${normalizedEmail || 'a friend'} used your referral code (${cleanCode})`,
    relatedUserId: buyerUserId,
    relatedEmail: normalizedEmail || undefined,
    orderId,
  });

  // 3. Record redemption in referral store
  const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const rewardTag = `CREDIT5-${randSuffix}`;

  store.redemptions.push({
    id: crypto.randomUUID(),
    referralCode: cleanCode,
    referrerUserId: referrerEntry.userId,
    referrerEmail: referrerEntry.email,
    referredUserId: buyerUserId,
    referredEmail: normalizedEmail || undefined,
    orderId,
    mysteryId,
    rewardCodeGenerated: rewardTag,
    friendCreditAwardedGbp: REFERRAL_CREDIT_GBP,
    referrerCreditAwardedGbp: REFERRAL_CREDIT_GBP,
    createdAt: new Date().toISOString(),
  });

  writeReferralStore(store);

  return {
    matched: true,
    success: true,
    creditAddedGbp: REFERRAL_CREDIT_GBP,
    newCreditBalanceGbp: friendCreditRes.creditBalanceGbp,
    referrerName: referrerFirstName,
    message: `£${REFERRAL_CREDIT_GBP}.00 referral credit added to your account! ${referrerFirstName} also received £${REFERRAL_CREDIT_GBP}.00 in credits.`,
  };
}

/**
 * Resolves a potential referral code ("Give £5, Get £5") or legacy reward voucher with strict anti-abuse checks:
 * 1. No Self-Referral: Referrer cannot use their own referral code (checked by userId and email).
 * 2. One Friend Referral Claim per Customer: Each customer can only claim 1 friend referral code.
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
  discountFixedGbp?: number;
  name?: string;
  referrerUserId?: string;
  error?: string;
}> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) return { matched: false, valid: false };

  const store = readReferralStore();
  const normalizedEmail = (currentUserEmail || '').trim().toLowerCase();

  // Case A: Is this a legacy single-use Referrer Reward Voucher (e.g. REWARD20-XXXX)?
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
      discountFixedGbp: rewardVoucher.creditAmountGbp || REFERRAL_CREDIT_GBP,
      discountPercent: rewardVoucher.discountPercent || 0,
      name: `Referral Reward (£${REFERRAL_CREDIT_GBP}.00 Credit)`,
      referrerUserId: rewardVoucher.referrerUserId,
    };
  }

  // Case B: Is this a Host's Referral Code (NAME5-XXXX or legacy NAME20-XXXX)?
  const referrerEntry = await resolveReferrerEntryByCode(cleanCode, store);
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
      error: 'You cannot use your own referral code. Share it with a friend to give £5 & get £5!',
    };
  }

  // Anti-Abuse 2: Check if this user/email has already claimed ANY friend referral code before
  const alreadyUsedReferral = store.redemptions.some(
    (r) =>
      (currentUserId && r.referredUserId === currentUserId) ||
      (normalizedEmail && r.referredEmail === normalizedEmail)
  );
  if (alreadyUsedReferral) {
    return {
      matched: true,
      valid: false,
      error: 'You have already claimed a £5 friend referral credit on your account.',
    };
  }

  const referrerFirstName = (referrerEntry.fullName || 'Friend').split(' ')[0];
  return {
    matched: true,
    valid: true,
    type: 'friend_referral',
    discountFixedGbp: REFERRAL_CREDIT_GBP,
    discountPercent: 0,
    name: `Friend Referral from ${referrerFirstName} (£${REFERRAL_CREDIT_GBP}.00 Credit)`,
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
 * Called when an order is paid/confirmed.
 * 1. Marks single-use promo/reward codes as used by this customer.
 * 2. If a friend referral code was used directly at checkout (and not yet claimed into credits),
 *    awards the referring host ("Giver") their +£5.00 account credit and logs the referral redemption.
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

  // 1. Was it a legacy Referrer Reward Voucher? Mark it used.
  if (store.rewardVouchers[cleanCode]) {
    store.rewardVouchers[cleanCode].used = true;
    store.rewardVouchers[cleanCode].usedAt = new Date().toISOString();
    store.rewardVouchers[cleanCode].usedOrderId = orderId || undefined;
    writeReferralStore(store);
    return {};
  }

  // 2. Was it a Friend Referral Code used directly at checkout?
  const referrerEntry = await resolveReferrerEntryByCode(cleanCode, store);
  if (referrerEntry && referrerEntry.userId !== buyerUserId) {
    const alreadyClaimed = store.redemptions.some(
      (r) =>
        (buyerUserId && r.referredUserId === buyerUserId) ||
        (normalizedEmail && r.referredEmail === normalizedEmail)
    );

    if (!alreadyClaimed) {
      await applySystemCustomerCreditDeltaGbp({
        targetUserId: referrerEntry.userId,
        deltaGbp: REFERRAL_CREDIT_GBP,
        type: 'referral_given',
        description: `Give £5, Get £5: Friend ${normalizedEmail || 'a friend'} redeemed your referral code (${cleanCode}) at checkout`,
        relatedUserId: buyerUserId || undefined,
        relatedEmail: normalizedEmail || undefined,
        orderId: orderId || undefined,
      });

      const randSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const rewardTag = `CREDIT5-${randSuffix}`;

      store.redemptions.push({
        id: crypto.randomUUID(),
        referralCode: cleanCode,
        referrerUserId: referrerEntry.userId,
        referrerEmail: referrerEntry.email,
        referredUserId: buyerUserId || undefined,
        referredEmail: normalizedEmail || undefined,
        orderId: orderId || undefined,
        mysteryId: mysteryId || undefined,
        rewardCodeGenerated: rewardTag,
        friendCreditAwardedGbp: REFERRAL_CREDIT_GBP,
        referrerCreditAwardedGbp: REFERRAL_CREDIT_GBP,
        createdAt: new Date().toISOString(),
      });

      writeReferralStore(store);
      return {
        rewardCodeIssued: rewardTag,
        referrerUserId: referrerEntry.userId,
      };
    }
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

/**
 * Returns aggregated referral stats for Admin Customers & Conversions pages.
 */
export async function getAdminReferralProgramStatsAction(): Promise<{
  totalReferralsCount: number;
  totalCreditsIssuedGbp: number;
  redemptions: ReferralRedemptionRecord[];
  referralsByUserId: Record<string, number>;
}> {
  const store = readReferralStore();
  const referralsByUserId: Record<string, number> = {};
  let totalCreditsIssuedGbp = 0;

  for (const r of store.redemptions) {
    if (r.referrerUserId) {
      referralsByUserId[r.referrerUserId] = (referralsByUserId[r.referrerUserId] || 0) + 1;
    }
    totalCreditsIssuedGbp +=
      (r.friendCreditAwardedGbp ?? REFERRAL_CREDIT_GBP) +
      (r.referrerCreditAwardedGbp ?? REFERRAL_CREDIT_GBP);
  }

  return {
    totalReferralsCount: store.redemptions.length,
    totalCreditsIssuedGbp,
    redemptions: store.redemptions,
    referralsByUserId,
  };
}
