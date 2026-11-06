'use server';

import fs from 'fs';
import path from 'path';
import { createClient } from '@/utils/supabase/server';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';

export interface PackagePopularityItem {
  id: 'basic' | 'premium' | 'grand' | 'subscribe';
  name: string;
  rangeLabel: string;
  ordersCount: number;
  revenue: number;
  orderSharePercent: number;
  mysteryBasesCount: number;
}

export interface MysteryPerformanceItem {
  id: string;
  title: string;
  theme: string;
  status: string;
  packageLabel: string;
  maxPlayers: number;
  spiceLevel: string;
  complexity: string;
  ordersCount: number;
  revenue: number;
  avgRating: number | null;
  reviewsCount: number;
}

export async function getMysteriesAndPackagesAnalytics() {
  const supabase = await createClient();

  const [
    { data: mysteriesData },
    { data: ordersData },
    { data: reviewsData },
  ] = await Promise.all([
    supabase.from('mysteries').select('*').order('created_at', { ascending: false }),
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    (supabase as any).from('reviews').select('*'),
  ]);

  const mysteries = (mysteriesData || []) as any[];
  const orders = ((ordersData || []) as any[]).filter((o) => o.status !== 'refunded' && o.status !== 'cancelled');
  const reviews = (reviewsData || []) as any[];

  const mysteryById = new Map<string, any>();
  for (const m of mysteries) {
    mysteryById.set(m.id, m);
  }

  const packageBuckets: Record<
    'basic' | 'premium' | 'grand' | 'subscribe',
    PackagePopularityItem
  > = {
    basic: {
      id: 'basic',
      name: 'Basic Package',
      rangeLabel: '4–6 Players',
      ordersCount: 0,
      revenue: 0,
      orderSharePercent: 0,
      mysteryBasesCount: 0,
    },
    premium: {
      id: 'premium',
      name: 'Premium Package',
      rangeLabel: '4–10 Players',
      ordersCount: 0,
      revenue: 0,
      orderSharePercent: 0,
      mysteryBasesCount: 0,
    },
    grand: {
      id: 'grand',
      name: 'Grand Package',
      rangeLabel: '4–16 Players',
      ordersCount: 0,
      revenue: 0,
      orderSharePercent: 0,
      mysteryBasesCount: 0,
    },
    subscribe: {
      id: 'subscribe',
      name: 'Unlimited Monthly Pass',
      rangeLabel: 'Unlimited + Gift Pass',
      ordersCount: 0,
      revenue: 0,
      orderSharePercent: 0,
      mysteryBasesCount: 0,
    },
  };

  for (const m of mysteries) {
    const maxP = Number(m.max_players) || 16;
    if (maxP <= 6) packageBuckets.basic.mysteryBasesCount += 1;
    else if (maxP <= 10) packageBuckets.premium.mysteryBasesCount += 1;
    else packageBuckets.grand.mysteryBasesCount += 1;
  }

  const ordersByMystery = new Map<string, { count: number; revenue: number }>();
  const currencyBreakdown = new Map<string, { currency: string; count: number; revenue: number }>();

  for (const o of orders) {
    const amount = Number(o.amount) || 0;
    const currency = (o.currency || 'GBP').toUpperCase();
    const m = mysteryById.get(o.mystery_id);

    // Infer package tier from mystery max_players or order price points
    let tierId: 'basic' | 'premium' | 'grand' | 'subscribe' = 'grand';
    if (amount === 30 || amount === 39 || amount === 59 || amount === 36 || amount === 65) {
      tierId = 'subscribe';
    } else if (m) {
      const maxP = Number(m.max_players) || 16;
      if (maxP <= 6) tierId = 'basic';
      else if (maxP <= 10) tierId = 'premium';
      else tierId = 'grand';
    } else if (amount <= 19) {
      tierId = 'basic';
    } else if (amount <= 25) {
      tierId = 'premium';
    }

    packageBuckets[tierId].ordersCount += 1;
    packageBuckets[tierId].revenue += amount;

    if (o.mystery_id) {
      const prev = ordersByMystery.get(o.mystery_id) || { count: 0, revenue: 0 };
      prev.count += 1;
      prev.revenue += amount;
      ordersByMystery.set(o.mystery_id, prev);
    }

    const currPrev = currencyBreakdown.get(currency) || { currency, count: 0, revenue: 0 };
    currPrev.count += 1;
    currPrev.revenue += amount;
    currencyBreakdown.set(currency, currPrev);
  }

  const totalOrders = orders.length;
  for (const bucket of Object.values(packageBuckets)) {
    bucket.orderSharePercent =
      totalOrders > 0 ? Math.round((bucket.ordersCount / totalOrders) * 100) : 0;
  }

  // Ratings by mystery
  const reviewsByMystery = new Map<string, { sum: number; count: number }>();
  for (const r of reviews) {
    const mId = r.mystery_id;
    const rating = Number(r.rating) || 0;
    if (mId && rating > 0) {
      const prev = reviewsByMystery.get(mId) || { sum: 0, count: 0 };
      prev.sum += rating;
      prev.count += 1;
      reviewsByMystery.set(mId, prev);
    }
  }

  const mysteryLeaderboard: MysteryPerformanceItem[] = mysteries.map((m) => {
    const pkg = getPackageInfoForMaxPlayers(Number(m.max_players) || 16);
    const ord = ordersByMystery.get(m.id) || { count: 0, revenue: 0 };
    const rev = reviewsByMystery.get(m.id);
    return {
      id: m.id,
      title: m.title || 'Untitled Mystery',
      theme: m.theme || 'Unspecified',
      status: m.status || 'draft',
      packageLabel: `${pkg.label} (${pkg.rangeLabel})`,
      maxPlayers: Number(m.max_players) || 16,
      spiceLevel: m.spice_level || 'standard',
      complexity: m.complexity || 'medium',
      ordersCount: ord.count,
      revenue: ord.revenue,
      avgRating: rev && rev.count > 0 ? Number((rev.sum / rev.count).toFixed(1)) : null,
      reviewsCount: rev?.count || 0,
    };
  });

  mysteryLeaderboard.sort((a, b) => b.ordersCount - a.ordersCount || b.revenue - a.revenue);

  // Attribute distributions across mysteries
  const themeCounts = new Map<string, number>();
  const spiceCounts = new Map<string, number>();
  const complexityCounts = new Map<string, number>();
  const voiceCounts = new Map<string, number>();

  for (const m of mysteries) {
    const theme = (m.theme || 'Unspecified').trim();
    themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);

    const spice = (m.spice_level || 'Standard').toString();
    spiceCounts.set(spice, (spiceCounts.get(spice) || 0) + 1);

    const comp = (m.complexity || 'Standard').toString();
    complexityCounts.set(comp, (complexityCounts.get(comp) || 0) + 1);

    const voice = (m.voice_region || 'en-GB').toString();
    voiceCounts.set(voice, (voiceCounts.get(voice) || 0) + 1);
  }

  const toSortedList = (map: Map<string, number>) =>
    Array.from(map.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  const totalRevenue = orders.reduce((s, o) => s + (Number(o.amount) || 0), 0);

  return {
    summary: {
      totalMysteries: mysteries.length,
      publishedMysteries: mysteries.filter((m) => m.status === 'published').length,
      draftMysteries: mysteries.filter((m) => m.status === 'draft').length,
      totalOrders,
      totalRevenue,
    },
    packages: Object.values(packageBuckets),
    mysteryLeaderboard,
    themes: toSortedList(themeCounts),
    spiceLevels: toSortedList(spiceCounts),
    complexities: toSortedList(complexityCounts),
    voiceRegions: toSortedList(voiceCounts),
    currencies: Array.from(currencyBreakdown.values()).sort((a, b) => b.count - a.count),
  };
}

export async function getGameplayAnalytics() {
  const supabase = await createClient();

  const [
    { data: mysteriesData },
    { data: charactersData },
    { data: guestsData },
  ] = await Promise.all([
    supabase.from('mysteries').select('id, title, theme, status, current_round, min_players, max_players, created_at'),
    supabase.from('characters').select('id, mystery_id, name, plot_role, is_victim, profile_data'),
    supabase.from('guests').select('id, user_id, gender, created_at'),
  ]);

  const mysteries = (mysteriesData || []) as any[];
  const characters = (charactersData || []) as any[];
  const guests = (guestsData || []) as any[];

  // Also check local .mystery-sessions.json if any guest votes were written there
  let localSessions: Record<string, any> = {};
  try {
    const filePath = path.join(process.cwd(), 'data', '.mystery-sessions.json');
    if (fs.existsSync(filePath)) {
      localSessions = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch {
    // ignore
  }

  const charsByMystery = new Map<string, any[]>();
  for (const c of characters) {
    const list = charsByMystery.get(c.mystery_id) || [];
    list.push(c);
    charsByMystery.set(c.mystery_id, list);
  }

  const stageCounts = {
    lobby: 0,
    round1: 0,
    round2: 0,
    round3: 0,
    completed: 0,
  };

  let totalTheoriesSubmitted = 0;
  let totalCorrectGuesses = 0;
  let totalClaimedPlayers = 0;
  let activeSessionsCount = 0;

  const roundAccuracy = {
    round1: { total: 0, correct: 0 },
    round2: { total: 0, correct: 0 },
    round3: { total: 0, correct: 0 },
  };

  const sessionRows: Array<{
    mysteryId: string;
    title: string;
    stageLabel: string;
    currentRound: number;
    castCount: number;
    claimedCount: number;
    submissionsCount: number;
    solveRatePercent: number | null;
  }> = [];

  for (const m of mysteries) {
    const mChars = charsByMystery.get(m.id) || [];
    const killerChar = mChars.find((c) => c.plot_role === 'killer');

    // Find session carrier on characters or local session fallback
    let sessionObj: any = localSessions[m.id] || null;
    for (const c of mChars) {
      const gs = c.profile_data?.__game_session;
      if (gs && (!sessionObj || (gs.submissions?.length || 0) >= (sessionObj.submissions?.length || 0))) {
        sessionObj = gs;
      }
    }

    const round = Number(sessionObj?.currentRound ?? m.current_round ?? 0);

    if (round <= 0) stageCounts.lobby += 1;
    else if (round < 2) stageCounts.round1 += 1;
    else if (round < 3) stageCounts.round2 += 1;
    else if (round < 5) stageCounts.round3 += 1;
    else stageCounts.completed += 1;

    const claimedMap = sessionObj?.claimedCharacters || {};
    const assignedCount = mChars.filter(
      (c) => c.profile_data?.assigned_guest_id || c.profile_data?.assigned_guest_name
    ).length;
    const claimedCount = Math.max(Object.keys(claimedMap).length, assignedCount);
    totalClaimedPlayers += claimedCount;

    const submissions: any[] = Array.isArray(sessionObj?.submissions) ? sessionObj.submissions : [];
    let mysteryCorrect = 0;

    for (const sub of submissions) {
      totalTheoriesSubmitted += 1;
      const isCorrect = Boolean(killerChar && sub.suspectCharId === killerChar.id);
      if (isCorrect) {
        totalCorrectGuesses += 1;
        mysteryCorrect += 1;
      }
      const rNum = Number(sub.roundNumber) || 1;
      if (rNum <= 1.5) {
        roundAccuracy.round1.total += 1;
        if (isCorrect) roundAccuracy.round1.correct += 1;
      } else if (rNum <= 2.5) {
        roundAccuracy.round2.total += 1;
        if (isCorrect) roundAccuracy.round2.correct += 1;
      } else {
        roundAccuracy.round3.total += 1;
        if (isCorrect) roundAccuracy.round3.correct += 1;
      }
    }

    if (round > 0 || claimedCount > 0 || submissions.length > 0) {
      activeSessionsCount += 1;
    }

    const stageLabel =
      round <= 0
        ? 'Lobby'
        : round === 1
        ? 'Round 1'
        : round === 1.5
        ? 'Guess 1'
        : round === 2
        ? 'Round 2'
        : round === 2.5
        ? 'Guess 2'
        : round === 3
        ? 'Round 3'
        : round === 3.5 || round === 4
        ? 'Final Guess'
        : 'Revealed';

    sessionRows.push({
      mysteryId: m.id,
      title: m.title || 'Untitled Mystery',
      stageLabel,
      currentRound: round,
      castCount: mChars.length,
      claimedCount,
      submissionsCount: submissions.length,
      solveRatePercent:
        submissions.length > 0 ? Math.round((mysteryCorrect / submissions.length) * 100) : null,
    });
  }

  sessionRows.sort(
    (a, b) =>
      b.submissionsCount - a.submissionsCount ||
      b.currentRound - a.currentRound ||
      b.claimedCount - a.claimedCount
  );

  const avgCastSize =
    mysteries.length > 0 ? Number((characters.length / mysteries.length).toFixed(1)) : 0;
  const detectiveSolveRate =
    totalTheoriesSubmitted > 0
      ? Math.round((totalCorrectGuesses / totalTheoriesSubmitted) * 100)
      : 0;

  return {
    summary: {
      totalMysteries: mysteries.length,
      activeSessionsCount,
      completedGamesCount: stageCounts.completed,
      totalGuestsInAddressBook: guests.length,
      totalClaimedPlayers,
      avgCastSize,
      totalTheoriesSubmitted,
      detectiveSolveRate,
      killerEscapeRate: totalTheoriesSubmitted > 0 ? 100 - detectiveSolveRate : 0,
    },
    stageFunnel: [
      { stage: 'Lobby (Pre-Game)', count: stageCounts.lobby },
      { stage: 'Round 1 & Guess 1', count: stageCounts.round1 },
      { stage: 'Round 2 & Guess 2', count: stageCounts.round2 },
      { stage: 'Round 3 & Final Vote', count: stageCounts.round3 },
      { stage: 'Completed / Revealed', count: stageCounts.completed },
    ],
    roundAccuracy: [
      {
        round: 'Round 1 Guess',
        total: roundAccuracy.round1.total,
        correct: roundAccuracy.round1.correct,
        rate:
          roundAccuracy.round1.total > 0
            ? Math.round((roundAccuracy.round1.correct / roundAccuracy.round1.total) * 100)
            : 0,
      },
      {
        round: 'Round 2 Guess',
        total: roundAccuracy.round2.total,
        correct: roundAccuracy.round2.correct,
        rate:
          roundAccuracy.round2.total > 0
            ? Math.round((roundAccuracy.round2.correct / roundAccuracy.round2.total) * 100)
            : 0,
      },
      {
        round: 'Final Accusation',
        total: roundAccuracy.round3.total,
        correct: roundAccuracy.round3.correct,
        rate:
          roundAccuracy.round3.total > 0
            ? Math.round((roundAccuracy.round3.correct / roundAccuracy.round3.total) * 100)
            : 0,
      },
    ],
    sessions: sessionRows,
  };
}

export async function getConversionAndPromoAnalytics() {
  const supabase = await createClient();

  const [
    { data: leadsData },
    { data: profilesData },
    { data: ordersData },
    { data: discountsData },
  ] = await Promise.all([
    supabase.from('leads').select('*'),
    supabase.from('profiles').select('*'),
    supabase.from('orders').select('*'),
    (supabase as any).from('discounts').select('*').order('times_used', { ascending: false }),
  ]);

  const leads = (leadsData || []) as any[];
  const profiles = (profilesData || []) as any[];
  const paidOrders = ((ordersData || []) as any[]).filter(
    (o) => o.status !== 'refunded' && o.status !== 'cancelled'
  );

  // Merge Supabase discounts with .discounts-store.json fallback if used
  let discounts: any[] = Array.isArray(discountsData) ? discountsData : [];
  try {
    const filePath = path.join(process.cwd(), '.discounts-store.json');
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const localList = Object.values(parsed.discounts || {}) as any[];
      if (localList.length > discounts.length) {
        discounts = localList;
      }
    }
  } catch {
    // ignore
  }

  // Read referrals store
  let referralStore: {
    referralCodes: Record<string, any>;
    redemptions: any[];
    rewardVouchers: Record<string, any>;
    codeUsages: any[];
  } = {
    referralCodes: {},
    redemptions: [],
    rewardVouchers: {},
    codeUsages: [],
  };

  try {
    const refPath = path.join(process.cwd(), 'data', '.referrals-store.json');
    if (fs.existsSync(refPath)) {
      const parsed = JSON.parse(fs.readFileSync(refPath, 'utf8'));
      referralStore = {
        referralCodes: parsed.referralCodes || {},
        redemptions: Array.isArray(parsed.redemptions) ? parsed.redemptions : [],
        rewardVouchers: parsed.rewardVouchers || {},
        codeUsages: Array.isArray(parsed.codeUsages) ? parsed.codeUsages : [],
      };
    }
  } catch {
    // ignore
  }

  // Compute unique buyers & repeat hosts
  const ordersPerUser = new Map<string, number>();
  for (const o of paidOrders) {
    if (o.user_id) {
      ordersPerUser.set(o.user_id, (ordersPerUser.get(o.user_id) || 0) + 1);
    }
  }

  const uniquePayingCustomers = ordersPerUser.size;
  const repeatHostsCount = Array.from(ordersPerUser.values()).filter((c) => c >= 2).length;
  const repeatHostRate =
    uniquePayingCustomers > 0
      ? Math.round((repeatHostsCount / uniquePayingCustomers) * 100)
      : 0;

  const totalRevenue = paidOrders.reduce((s, o) => s + (Number(o.amount) || 0), 0);
  const avgOrderValue =
    paidOrders.length > 0 ? Number((totalRevenue / paidOrders.length).toFixed(2)) : 0;

  // Lead & signup discovery sources breakdown
  const leadSourcesMap = new Map<string, number>();
  for (const l of leads) {
    const src = (l.source || 'Website Lead Form').trim();
    leadSourcesMap.set(src, (leadSourcesMap.get(src) || 0) + 1);
  }
  for (const p of profiles) {
    if (p.how_found_us) {
      const src = String(p.how_found_us).trim();
      if (src) {
        leadSourcesMap.set(src, (leadSourcesMap.get(src) || 0) + 1);
      }
    }
  }
  const leadSources = Array.from(leadSourcesMap.entries())
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const vouchersList = Object.values(referralStore.rewardVouchers);
  const redeemedVouchersCount = vouchersList.filter((v: any) => v.used).length;

  return {
    funnel: {
      leadsCount: leads.length,
      registeredAccountsCount: profiles.length,
      marketingOptInCount: profiles.filter((p) => p.marketing_opt_in || p.onboarding_completed).length,
      uniquePayingCustomers,
      repeatHostsCount,
      repeatHostRate,
      totalPaidOrders: paidOrders.length,
      avgOrderValue,
    },
    leadSources,
    discounts: discounts.map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code || (d.auto_apply ? 'AUTO-APPLY' : '—'),
      discountType: d.discount_type,
      discountValue: Number(d.discount_value) || 0,
      appliesTo: d.applies_to || 'all',
      timesUsed: Number(d.times_used) || 0,
      isActive: Boolean(d.is_active),
    })),
    referrals: {
      activeHostCodes: Object.keys(referralStore.referralCodes).length,
      friendPurchasesCompleted: referralStore.redemptions.length,
      rewardVouchersIssued: vouchersList.length,
      rewardVouchersRedeemed: redeemedVouchersCount,
      totalPromoRedemptionsLogged: referralStore.codeUsages.length,
      recentRedemptions: referralStore.redemptions.slice(-10).reverse(),
    },
  };
}
