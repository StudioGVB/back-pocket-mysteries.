// @ts-nocheck
'use server';

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { cache } from 'react';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { readLocalAiLogs, StoredAiUsageLog } from '@/utils/ai-logger';
import { requireAdmin, ADMIN_EMAIL_ALLOWLIST, ADMIN_UID_ALLOWLIST } from '@/utils/admin-auth';

const FX_TO_GBP: Record<string, number> = {
  GBP: 1,
  USD: 0.79,
  EUR: 0.86,
  AUD: 0.52,
  CAD: 0.57,
  NZD: 0.47,
};

function normalizeOrderAmountToGbp(rawAmount: any, rawCurrency?: any): number {
  const num = Number(rawAmount) || 0;
  const major = num > 100 ? num / 100 : num;
  const curr = String(rawCurrency || 'GBP').toUpperCase();
  const rate = FX_TO_GBP[curr] ?? 1;
  return Number((major * rate).toFixed(2));
}

function isProfileDeleted(profile: any, crm?: any): boolean {
  if (!profile) return true;
  if (profile.full_name === '[Deleted Account]') return true;
  if (profile.avatar_config && typeof profile.avatar_config === 'object' && profile.avatar_config.is_deleted) {
    return true;
  }
  if (crm?.accountDeleted) return true;
  return false;
}

export interface AdminNotificationsSeenState {
  dashboard?: string;
  customers?: string;
  leads?: string;
}

function getLocalNotificationsSeenPath(): string {
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), '.local-data');
  try {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  } catch {}
  return path.join(dir, 'admin-notifications-seen.json');
}

async function loadAdminNotificationsSeen(supabase: any): Promise<AdminNotificationsSeenState> {
  const result: AdminNotificationsSeenState = {};

  // 1. Read local JSON file
  try {
    const filePath = getLocalNotificationsSeenPath();
    if (fsSync.existsSync(filePath)) {
      const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        Object.assign(result, parsed);
      }
    }
  } catch {}

  // 2. Read platform_settings.config_json.adminNotificationsLastSeen
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'global')
      .maybeSingle();
    const dbSeen = data?.config_json?.adminNotificationsLastSeen;
    if (dbSeen && typeof dbSeen === 'object') {
      for (const key of ['dashboard', 'customers', 'leads'] as const) {
        const val = dbSeen[key];
        if (typeof val === 'string' && (!result[key] || val > result[key]!)) {
          result[key] = val;
        }
      }
    }
  } catch {}

  return result;
}

async function saveAdminNotificationsSeen(
  supabase: any,
  updates: Partial<AdminNotificationsSeenState>
): Promise<AdminNotificationsSeenState> {
  const current = await loadAdminNotificationsSeen(supabase);
  const next: AdminNotificationsSeenState = {
    ...current,
    ...updates,
  };

  try {
    const filePath = getLocalNotificationsSeenPath();
    fsSync.writeFileSync(filePath, JSON.stringify(next, null, 2), 'utf-8');
  } catch {}

  try {
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'global')
      .maybeSingle();
    const prevConfig =
      existing?.config_json && typeof existing.config_json === 'object'
        ? existing.config_json
        : {};
    await supabase.from('platform_settings').upsert(
      {
        id: 'global',
        config_json: {
          ...prevConfig,
          adminNotificationsLastSeen: next,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {}

  return next;
}

function resolveBaselineCutoff(cookieIso?: string | null, storedIso?: string | null): string {
  // Pick the most recent seen timestamp if either exists; otherwise default to 7 days ago
  const candidates = [cookieIso, storedIso].filter(
    (s): s is string => typeof s === 'string' && s.length > 0 && !Number.isNaN(Date.parse(s))
  );
  if (candidates.length > 0) {
    return candidates.sort().reverse()[0];
  }
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

export async function markAdminSectionSeenAction(
  section: 'dashboard' | 'customers' | 'leads',
  timestampIso?: string
): Promise<{ success: boolean; timestamp: string }> {
  const { supabase } = await requireAdmin();
  const ts = timestampIso || new Date().toISOString();
  await saveAdminNotificationsSeen(supabase, { [section]: ts });
  return { success: true, timestamp: ts };
}

export async function getAdminSidebarNotificationCountsAction(cookiesOverride?: {
  dashboard?: string | null;
  customers?: string | null;
  leads?: string | null;
}): Promise<{
  unseenCustomersCount: number;
  unseenLeadsCount: number;
  unseenDashboardCount: number;
}> {
  try {
    const { supabase } = await requireAdmin();
    const { getAllCustomerCrmData } = await import('@/app/actions/admin-users');
    const { getAllMarketingLeadsAction } = await import('@/app/actions/marketing');

    const [profilesRes, crmMap, leads, seenState] = await Promise.all([
      supabase.from('profiles').select('id, full_name, avatar_config, created_at'),
      getAllCustomerCrmData(),
      getAllMarketingLeadsAction(),
      loadAdminNotificationsSeen(supabase),
    ]);

    const activeProfiles = (profilesRes.data || []).filter(
      (p: any) => !isProfileDeleted(p, crmMap[p.id])
    );

    const customersCutoff = resolveBaselineCutoff(
      cookiesOverride?.customers,
      seenState.customers
    );
    const leadsCutoff = resolveBaselineCutoff(cookiesOverride?.leads, seenState.leads);
    const dashboardCutoff = resolveBaselineCutoff(
      cookiesOverride?.dashboard,
      seenState.dashboard
    );

    const unseenCustomersCount = activeProfiles.filter(
      (p: any) => p.created_at && p.created_at > customersCutoff
    ).length;

    const unseenLeadsCount = (leads || []).filter(
      (l: any) => l.created_at && l.created_at > leadsCutoff
    ).length;

    const unseenDashCustomers = activeProfiles.filter(
      (p: any) => p.created_at && p.created_at > dashboardCutoff
    ).length;
    const unseenDashLeads = (leads || []).filter(
      (l: any) => l.created_at && l.created_at > dashboardCutoff
    ).length;

    return {
      unseenCustomersCount,
      unseenLeadsCount,
      unseenDashboardCount: unseenDashCustomers + unseenDashLeads,
    };
  } catch {
    return {
      unseenCustomersCount: 0,
      unseenLeadsCount: 0,
      unseenDashboardCount: 0,
    };
  }
}

export const getAdminStats = cache(async (lastViewStr?: string) => {
  const { supabase } = await requireAdmin();
  const { getAllCustomerCrmData } = await import('@/app/actions/admin-users');
  const { getAllMarketingLeadsAction } = await import('@/app/actions/marketing');

  const [ordersRes, profilesRes, crmMap, leadsList, seenState] = await Promise.all([
    supabase
      .from('orders')
      .select('amount, currency, status')
      .eq('status', 'succeeded'),
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_config, created_at')
      .order('created_at', { ascending: false }),
    getAllCustomerCrmData(),
    getAllMarketingLeadsAction(),
    loadAdminNotificationsSeen(supabase),
  ]);

  const orders = ordersRes.data;
  const activeProfiles = (profilesRes.data || []).filter(
    (p: any) => !isProfileDeleted(p, crmMap[p.id])
  );
  const safeLeads = Array.isArray(leadsList) ? leadsList : [];

  const dashboardCutoff = resolveBaselineCutoff(lastViewStr, seenState.dashboard);

  const unseenCustomers = activeProfiles.filter(
    (p: any) => p.created_at && p.created_at > dashboardCutoff
  );
  const unseenLeads = safeLeads
    .filter((l: any) => l.created_at && l.created_at > dashboardCutoff)
    .sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''));

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const countWithinDays = (items: any[], days: number) => {
    const cutoffMs = nowMs - days * dayMs;
    return items.filter((item) => {
      if (!item?.created_at) return false;
      const t = Date.parse(item.created_at);
      return !Number.isNaN(t) && t >= cutoffMs;
    }).length;
  };

  const customerPeriods = {
    today: countWithinDays(activeProfiles, 1),
    week: countWithinDays(activeProfiles, 7),
    month: countWithinDays(activeProfiles, 30),
    quarter: countWithinDays(activeProfiles, 90),
    year: countWithinDays(activeProfiles, 365),
    allTime: activeProfiles.length,
  };

  const leadPeriods = {
    today: countWithinDays(safeLeads, 1),
    week: countWithinDays(safeLeads, 7),
    month: countWithinDays(safeLeads, 30),
    quarter: countWithinDays(safeLeads, 90),
    year: countWithinDays(safeLeads, 365),
    allTime: safeLeads.length,
  };

  const totalRevenue =
    orders?.reduce(
      (acc, order) => acc + normalizeOrderAmountToGbp(order.amount, (order as any).currency),
      0
    ) || 0;
  const salesCount = orders?.length || 0;
  const avgOrderVal = salesCount > 0 ? totalRevenue / salesCount : 0;

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    salesCount,
    activeUsers: activeProfiles.length,
    newUsersCount: unseenCustomers.length,
    totalLeads: safeLeads.length,
    newLeadsCount: unseenLeads.length,
    avgOrderVal,
    dashboardCutoff,
    unseenCustomers: unseenCustomers.slice(0, 5).map((u: any) => ({
      id: u.id,
      name: u.full_name || u.email || 'New Customer',
      email: u.email || null,
      created_at: u.created_at,
    })),
    unseenLeads: unseenLeads.slice(0, 5).map((l: any) => ({
      id: l.id,
      name: l.full_name || l.email?.split('@')[0] || 'Subscriber',
      email: l.email,
      vip_rank: l.vip_rank,
      country: l.country || null,
      created_at: l.created_at,
    })),
    customerPeriods,
    leadPeriods,
  };
});

export const getRecentTransactions = cache(async () => {
  const { supabase } = await requireAdmin();

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, amount, currency, status, created_at, user_id, mystery_id')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching recent orders:', error);
    return [];
  }

  const safeOrders = orders || [];
  if (safeOrders.length === 0) return [];

  const userIds = [...new Set(safeOrders.map(o => o.user_id).filter(Boolean))];
  const mysteryIds = [...new Set(safeOrders.map(o => o.mystery_id).filter(Boolean))];

  const [profilesRes, mysteriesRes] = await Promise.all([
    userIds.length > 0
      ? supabase.from('profiles').select('id, full_name, avatar_url, avatar_config').in('id', userIds)
      : Promise.resolve({ data: [] as any[] }),
    mysteryIds.length > 0
      ? supabase.from('mysteries').select('id, title').in('id', mysteryIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  let profilesMap: Record<string, any> = {};
  if (profilesRes.data) {
    profilesMap = profilesRes.data.reduce((acc: any, p: any) => ({ ...acc, [p.id]: p }), {});
  }

  let mysteriesMap: Record<string, string> = {};
  if (mysteriesRes.data && mysteriesRes.data.length > 0) {
    mysteriesMap = mysteriesRes.data.reduce((acc: any, m: any) => ({ ...acc, [m.id]: m.title }), {});
  } else if (mysteryIds.length > 0) {
    const { data: bases } = await supabase.from('mystery_bases').select('id, title').in('id', mysteryIds);
    if (bases) mysteriesMap = bases.reduce((acc: any, b: any) => ({ ...acc, [b.id]: b.title }), {});
  }

  return safeOrders.map(o => ({
    ...o,
    amount: normalizeOrderAmountToGbp(o.amount, (o as any).currency),
    profile: profilesMap[o.user_id as string] || { full_name: 'Unknown User' },
    mystery: { title: mysteriesMap[o.mystery_id as string] || 'Unknown Mystery' }
  }));
});

export const getTopMysteries = cache(async () => {
  const { supabase } = await requireAdmin();

  const [{ data: sales }, { data: mysteries }] = await Promise.all([
    supabase
      .from('orders')
      .select('mystery_id')
      .eq('status', 'succeeded'),
    supabase
      .from('mysteries')
      .select('id, title')
      .eq('status', 'published'),
  ]);

  // Aggregate sales
  const salesMap = sales?.reduce((acc, s) => {
    acc[s.mystery_id] = (acc[s.mystery_id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return mysteries?.map(m => ({
    name: m.title,
    sales: salesMap[m.id] || 0
  })).sort((a, b) => b.sales - a.sales).slice(0, 4) || [];
});

export async function getLeads() {
  await requireAdmin();
  const { getAllMarketingLeadsAction } = await import('@/app/actions/marketing');
  return getAllMarketingLeadsAction();
}

function computeNewSignupMeta(createdAt?: string | null) {
  if (!createdAt) {
    return {
      isNewSignup: false,
      isNewToday: false,
      newSignupBadge: null as string | null,
      signupAgeLabel: null as string | null,
    };
  }
  const createdMs = new Date(createdAt).getTime();
  if (Number.isNaN(createdMs)) {
    return {
      isNewSignup: false,
      isNewToday: false,
      newSignupBadge: null as string | null,
      signupAgeLabel: null as string | null,
    };
  }
  const ageHours = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60));
  const isNewToday = ageHours <= 24;
  const isNewSignup = ageHours <= 24 * 7; // Last 7 days

  if (!isNewSignup) {
    return {
      isNewSignup: false,
      isNewToday: false,
      newSignupBadge: null as string | null,
      signupAgeLabel: null as string | null,
    };
  }

  let signupAgeLabel = 'This week';
  if (ageHours < 1) {
    signupAgeLabel = 'Just now';
  } else if (ageHours <= 24) {
    signupAgeLabel = `${Math.max(1, Math.floor(ageHours))}h ago`;
  } else if (ageHours <= 48) {
    signupAgeLabel = 'Yesterday';
  } else {
    signupAgeLabel = `${Math.floor(ageHours / 24)}d ago`;
  }

  return {
    isNewSignup: true,
    isNewToday,
    newSignupBadge: isNewToday ? 'New Sign-Up Today' : 'New Customer Sign-Up',
    signupAgeLabel,
  };
}

export const getCustomers = cache(async () => {
  const { supabase, user } = await requireAdmin();
  const { getAllCustomerCrmData } = await import('@/app/actions/admin-users');

  // Fetch all profiles, admin roles, and CRM records in parallel
  const [{ data, error }, { data: rolesData }, crmMap] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }) as any,
    supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'superadmin', 'super_admin']),
    getAllCustomerCrmData(),
  ]);

  if (error) {
    console.error('Error fetching customers:', error);
    return [];
  }

  const roleByUserId: Record<string, string> = {};
  for (const r of rolesData || []) {
    if (r?.user_id && r?.role) {
      roleByUserId[r.user_id] = String(r.role).toLowerCase().trim();
    }
  }

  const currentUserId = user?.id || '';
  const currentUserEmail = (user?.email || '').toLowerCase().trim();

  return (data || [])
    .filter((p: any) => !isProfileDeleted(p, crmMap[p.id]))
    .map((p: any) => {
      const emailLower = (p.email || '').toLowerCase().trim();
      const dbRole = roleByUserId[p.id] || '';
      const isAllowlistedOwner =
        ADMIN_UID_ALLOWLIST.includes(p.id) ||
        (emailLower && ADMIN_EMAIL_ALLOWLIST.includes(emailLower));
      const isSuperAdmin =
        isAllowlistedOwner || dbRole === 'superadmin' || dbRole === 'super_admin';
      const isAdmin = isSuperAdmin || dbRole === 'admin';
      const isCurrentUser = Boolean(
        (currentUserId && p.id === currentUserId) ||
          (currentUserEmail && emailLower && emailLower === currentUserEmail)
      );
      const signupMeta = computeNewSignupMeta(p.created_at);

      return {
        ...p,
        isCurrentUser,
        isSuperAdmin,
        isAdmin,
        adminRoleLabel: isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : null,
        ...signupMeta,
      };
    });
});

export interface InvitedSuperAdminEntry {
  email: string;
  name?: string;
  role: 'superadmin' | 'admin';
  userId?: string | null;
  invitedAt: string;
  invitedBy?: string;
}

function getLocalSuperAdminInvitesPath(): string {
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), '.local-data');
  try {
    if (!fsSync.existsSync(dir)) {
      fsSync.mkdirSync(dir, { recursive: true });
    }
  } catch {}
  return path.join(dir, 'super-admin-invites.json');
}

function readLocalEnvVar(key: string): string {
  const fromProc = process.env[key];
  if (fromProc && fromProc.trim()) return fromProc.trim();
  try {
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');
    if (fsSync.existsSync(envPath)) {
      const content = fsSync.readFileSync(envPath, 'utf-8');
      const regex = new RegExp(`^${key}=(.+)$`, 'm');
      const m = content.match(regex);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
}

function getServiceRoleClient() {
  const url = readLocalEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = readLocalEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return null;
  try {
    return createSupabaseClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

async function loadInvitedSuperAdmins(supabase: any): Promise<InvitedSuperAdminEntry[]> {
  const byEmail = new Map<string, InvitedSuperAdminEntry>();

  // 1. Read local JSON backup
  try {
    const filePath = getLocalSuperAdminInvitesPath();
    if (fsSync.existsSync(filePath)) {
      const parsed = JSON.parse(fsSync.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const em = String(item?.email || '').toLowerCase().trim();
          if (em) byEmail.set(em, { ...item, email: em });
        }
      }
    }
  } catch {}

  // 2. Read platform_settings.config_json.invitedSuperAdmins
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'global')
      .maybeSingle();

    const dbList = data?.config_json?.invitedSuperAdmins;
    if (Array.isArray(dbList)) {
      for (const item of dbList) {
        const em = String(item?.email || '').toLowerCase().trim();
        if (em) byEmail.set(em, { ...item, email: em });
      }
    }
  } catch {}

  return Array.from(byEmail.values());
}

async function saveInvitedSuperAdmins(
  supabase: any,
  list: InvitedSuperAdminEntry[],
  updatedByEmail?: string
): Promise<void> {
  // 1. Save to local JSON
  try {
    const filePath = getLocalSuperAdminInvitesPath();
    fsSync.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}

  // 2. Save inside platform_settings.config_json.invitedSuperAdmins
  try {
    const { data: existing } = await supabase
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'global')
      .maybeSingle();

    const prevConfig =
      existing?.config_json && typeof existing.config_json === 'object'
        ? existing.config_json
        : {};

    await supabase.from('platform_settings').upsert(
      {
        id: 'global',
        config_json: {
          ...prevConfig,
          invitedSuperAdmins: list,
        },
        updated_at: new Date().toISOString(),
        updated_by: updatedByEmail || 'Super Admin',
      },
      { onConflict: 'id' }
    );
  } catch {}
}

async function sendSuperAdminInvitationEmail(params: {
  toEmail: string;
  recipientName?: string;
  invitedByEmail?: string;
}): Promise<{ sent: boolean; error?: string }> {
  const resendKey = readLocalEnvVar('RESEND_API_KEY');
  if (!resendKey) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  const siteUrl =
    readLocalEnvVar('NEXT_PUBLIC_SITE_URL') ||
    readLocalEnvVar('NEXT_PUBLIC_APP_URL') ||
    'https://www.backpocketmysteries.com';
  const adminLoginUrl = `${siteUrl.replace(/\/$/, '')}/en/login?next=/en/admin`;

  const resend = new Resend(resendKey);
  const greetingName = params.recipientName?.trim() || params.toEmail.split('@')[0];

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0f0a1c; color: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255,255,255,0.12);">
      <div style="padding: 36px 32px; background: linear-gradient(135deg, #160f29 0%, #261447 100%); border-bottom: 1px solid rgba(255,255,255,0.1);">
        <div style="display: inline-block; padding: 4px 12px; border-radius: 999px; background: rgba(255, 45, 85, 0.2); color: #ff2d55; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 12px;">
          Super Admin Invitation
        </div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.02em; color: #ffffff;">
          Welcome to Back Pocket Mysteries Admin
        </h1>
      </div>
      <div style="padding: 32px; background: #ffffff; color: #1e293b; line-height: 1.6; font-size: 15px;">
        <p style="margin-top: 0; font-weight: 700; color: #0f172a;">Hi ${greetingName},</p>
        <p>
          You have been invited by <strong>${params.invitedByEmail || 'Back Pocket Mysteries'}</strong> to join <strong>Back Pocket Mysteries</strong> as a <strong>Super Admin</strong>.
        </p>
        <p>
          Your Super Admin access includes full permissions across the Internal Admin Portal, OG Mystery Base Builder, Studio Builder, Marketing Suite, and Customer Management.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${adminLoginUrl}" style="display: inline-block; padding: 14px 28px; border-radius: 999px; background: #ff2d55; color: #ffffff; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; text-decoration: none;">
            Accept Invite &amp; Open Admin Portal &rarr;
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b; background: #f8fafc; padding: 14px 16px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <strong>How to sign in:</strong> Simply log in (or create your account) using <strong>${params.toEmail}</strong>. Your Super Admin privileges are pre-activated for this email address automatically.
        </p>
      </div>
    </div>
  `;

  try {
    const primaryFrom =
      readLocalEnvVar('RESEND_FROM_EMAIL') || 'Back Pocket Mysteries <support@lancii.com>';
    let sendRes = await resend.emails.send({
      from: primaryFrom,
      to: [params.toEmail],
      subject: "You've been invited as a Super Admin on Back Pocket Mysteries",
      html,
    });

    if (sendRes.error) {
      sendRes = await resend.emails.send({
        from: 'Back Pocket Mysteries <support@lancii.com>',
        to: [params.toEmail],
        subject: "You've been invited as a Super Admin on Back Pocket Mysteries",
        html,
      });
    }

    if (sendRes.error) {
      return { sent: false, error: sendRes.error.message };
    }
    return { sent: true };
  } catch (err: any) {
    return { sent: false, error: err?.message || 'Failed to send invite email' };
  }
}

export async function getAdmins() {
  const { supabase, user } = await requireAdmin();
  const serviceClient = getServiceRoleClient();
  const dbClient = serviceClient || supabase;

  const [{ data: rolesData, error: rolesError }, invitedList] = await Promise.all([
    dbClient
      .from('user_roles')
      .select('user_id, role')
      .in('role', ['admin', 'superadmin', 'super_admin']),
    loadInvitedSuperAdmins(supabase),
  ]);

  if (rolesError) {
    console.error('Error fetching admin roles:', rolesError);
  }

  // Optional: Map auth user emails from serviceClient if available
  const authEmailByUid = new Map<string, string>();
  const authNameByUid = new Map<string, string>();
  if (serviceClient) {
    try {
      const { data: usersPage } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
      for (const au of usersPage?.users || []) {
        if (au.id && au.email) {
          authEmailByUid.set(au.id, au.email.toLowerCase());
        }
        if (au.id && au.user_metadata?.full_name) {
          authNameByUid.set(au.id, au.user_metadata.full_name);
        }
      }
    } catch {}
  }

  const adminUserIds = [...new Set([
    ...(rolesData?.map((r: any) => r.user_id).filter(Boolean) || []),
    ...ADMIN_UID_ALLOWLIST,
  ])];

  let data: any[] = [];
  if (adminUserIds.length > 0) {
    const { data: profilesData, error: profilesError } = await dbClient
      .from('profiles')
      .select('*')
      .in('id', adminUserIds)
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching admin profiles:', profilesError);
    } else if (profilesData) {
      data = profilesData.map((p: any) => {
        const matchedRole = rolesData?.find((r: any) => r.user_id === p.id)?.role;
        const resolvedEmail =
          p.email ||
          authEmailByUid.get(p.id) ||
          invitedList.find((inv) => inv.userId === p.id)?.email ||
          (ADMIN_UID_ALLOWLIST.includes(p.id) ? ADMIN_EMAIL_ALLOWLIST[0] : '');
        const isProtectedOwner =
          ADMIN_UID_ALLOWLIST.includes(p.id) ||
          (resolvedEmail && ADMIN_EMAIL_ALLOWLIST.includes(resolvedEmail.toLowerCase()));

        return {
          ...p,
          email: resolvedEmail || null,
          full_name:
            p.full_name ||
            authNameByUid.get(p.id) ||
            invitedList.find((inv) => inv.email === resolvedEmail)?.name ||
            resolvedEmail ||
            'Super Admin',
          status: 'active',
          isPendingInvite: false,
          isProtectedOwner,
          user_roles: [{ role: isProtectedOwner ? 'superadmin' : matchedRole || 'superadmin' }],
        };
      });
    }
  }

  const admins = data || [];

  if (user) {
    const isAlreadyListed = admins.some((a: any) => a.id === user.id);
    if (!isAlreadyListed) {
      const { data: profile } = await dbClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const userEmailLower = (user.email || '').toLowerCase();
      const isProtectedOwner =
        ADMIN_UID_ALLOWLIST.includes(user.id) ||
        ADMIN_EMAIL_ALLOWLIST.includes(userEmailLower);

      if (profile) {
        admins.unshift({
          ...profile,
          email: user.email || profile.email || null,
          status: 'active',
          isPendingInvite: false,
          isProtectedOwner,
          user_roles: [{ role: 'superadmin' }],
        });
      } else {
        admins.unshift({
          id: user.id,
          email: user.email || ADMIN_EMAIL_ALLOWLIST[0],
          full_name: user.user_metadata?.full_name || user.email || 'Gabriella Blyth',
          created_at: new Date().toISOString(),
          status: 'active',
          isPendingInvite: false,
          isProtectedOwner,
          user_roles: [{ role: 'superadmin' }],
        });
      }
    }
  }

  // Merge any invited Super Admin emails that haven't appeared in the active profiles list yet
  const listedEmails = new Set(
    admins.map((a: any) => String(a.email || '').toLowerCase().trim()).filter(Boolean)
  );
  const listedIds = new Set(admins.map((a: any) => a.id));

  for (const inv of invitedList) {
    const em = inv.email.toLowerCase().trim();
    if (listedEmails.has(em) || (inv.userId && listedIds.has(inv.userId))) {
      continue;
    }
    admins.push({
      id: inv.userId || `invite-${em}`,
      email: em,
      full_name: inv.name || em.split('@')[0],
      created_at: inv.invitedAt,
      invitedAt: inv.invitedAt,
      invitedBy: inv.invitedBy || 'Super Admin',
      status: 'pending',
      isPendingInvite: true,
      isProtectedOwner: ADMIN_EMAIL_ALLOWLIST.includes(em),
      user_roles: [{ role: inv.role || 'superadmin' }],
    });
  }

  return admins;
}

export async function grantAdminStatus(userIdOrEmail: string, role: string = 'superadmin') {
  const res = await inviteSuperAdminByEmailAction({
    emailOrId: userIdOrEmail,
    role: role === 'admin' ? 'admin' : 'superadmin',
  });
  if (!res.success) {
    throw new Error(res.error || 'Failed to grant Super Admin access.');
  }
  return res;
}

export async function inviteSuperAdminByEmailAction(params: {
  emailOrId: string;
  name?: string;
  role?: 'superadmin' | 'admin';
}): Promise<{
  success: boolean;
  status?: 'active' | 'pending';
  emailSent?: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await requireAdmin();
    const serviceClient = getServiceRoleClient();
    const dbClient = serviceClient || supabase;

    const rawInput = String(params.emailOrId || '').trim();
    if (!rawInput) {
      return { success: false, error: 'Please enter an email address.' };
    }

    const targetRole = params.role || 'superadmin';
    const isEmail = rawInput.includes('@');

    if (!isEmail) {
      // Legacy fallback if someone pasted a User UUID
      const { error } = await dbClient
        .from('user_roles')
        .upsert({ user_id: rawInput, role: targetRole }, { onConflict: 'user_id' });
      if (error) return { success: false, error: error.message };
      revalidatePath('/en/admin/settings');
      revalidatePath('/en/admin/admins');
      return {
        success: true,
        status: 'active',
        message: 'Super Admin role granted to user ID.',
      };
    }

    const cleanEmail = rawInput.toLowerCase();
    let matchedUserId: string | null = null;
    let matchedName: string = params.name?.trim() || '';

    // 1. Check if this email already exists in auth.users via service role
    if (serviceClient) {
      try {
        const { data: usersPage } = await serviceClient.auth.admin.listUsers({ perPage: 200 });
        const foundAuth = (usersPage?.users || []).find(
          (u: any) => String(u.email || '').toLowerCase().trim() === cleanEmail
        );
        if (foundAuth) {
          matchedUserId = foundAuth.id;
          if (!matchedName && foundAuth.user_metadata?.full_name) {
            matchedName = foundAuth.user_metadata.full_name;
          }
        }
      } catch {}
    }

    // 2. If found an existing user account, immediately upsert user_roles = 'superadmin'
    if (matchedUserId) {
      await dbClient
        .from('user_roles')
        .upsert({ user_id: matchedUserId, role: targetRole }, { onConflict: 'user_id' });
    }

    // 3. Save email in invitedSuperAdmins list (both platform_settings and local store)
    const currentInvites = await loadInvitedSuperAdmins(supabase);
    const filtered = currentInvites.filter((i) => i.email !== cleanEmail);
    filtered.unshift({
      email: cleanEmail,
      name: matchedName || cleanEmail.split('@')[0],
      role: targetRole,
      userId: matchedUserId,
      invitedAt: new Date().toISOString(),
      invitedBy: user?.email || 'Super Admin',
    });
    await saveInvitedSuperAdmins(supabase, filtered, user?.email);

    // 4. Send branded Super Admin invitation email via Resend
    const emailRes = await sendSuperAdminInvitationEmail({
      toEmail: cleanEmail,
      recipientName: matchedName,
      invitedByEmail: user?.email || 'Back Pocket Mysteries',
    });

    revalidatePath('/en/admin/settings');
    revalidatePath('/en/admin/admins');

    const status = matchedUserId ? 'active' : 'pending';
    const message = matchedUserId
      ? `${cleanEmail} is now an active Super Admin${emailRes.sent ? ' and an email notification was sent!' : '!'}`
      : `Invited ${cleanEmail} as a Super Admin! ${
          emailRes.sent
            ? 'An invitation email has been sent — as soon as they log in or sign up, they will have full Super Admin access.'
            : 'Their email is pre-authorized for full Super Admin access as soon as they sign in.'
        }`;

    return {
      success: true,
      status,
      emailSent: emailRes.sent,
      message,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to invite Super Admin.',
    };
  }
}

export async function resendSuperAdminInviteEmailAction(email: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await requireAdmin();
    const cleanEmail = String(email || '').toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Valid email address required.' };
    }

    const invites = await loadInvitedSuperAdmins(supabase);
    const found = invites.find((i) => i.email === cleanEmail);

    const res = await sendSuperAdminInvitationEmail({
      toEmail: cleanEmail,
      recipientName: found?.name,
      invitedByEmail: user?.email || 'Back Pocket Mysteries',
    });

    if (!res.sent) {
      return { success: false, error: res.error || 'Could not send invitation email.' };
    }

    return {
      success: true,
      message: `Resent Super Admin invitation email to ${cleanEmail}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to resend invitation email.',
    };
  }
}

export async function revokeSuperAdminAccessAction(params: {
  userId?: string;
  email?: string;
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const { supabase, user } = await requireAdmin();
    const serviceClient = getServiceRoleClient();
    const dbClient = serviceClient || supabase;

    const cleanEmail = String(params.email || '').toLowerCase().trim();
    const targetUserId = String(params.userId || '').trim();

    if (
      (targetUserId && ADMIN_UID_ALLOWLIST.includes(targetUserId)) ||
      (cleanEmail && ADMIN_EMAIL_ALLOWLIST.includes(cleanEmail))
    ) {
      return {
        success: false,
        error: 'The primary owner Super Admin account cannot be revoked.',
      };
    }

    if (targetUserId && targetUserId === user?.id) {
      return {
        success: false,
        error: 'You cannot revoke your own Super Admin access.',
      };
    }

    if (targetUserId && !targetUserId.startsWith('invite-')) {
      await dbClient.from('user_roles').delete().eq('user_id', targetUserId);
    }

    const currentInvites = await loadInvitedSuperAdmins(supabase);
    const nextInvites = currentInvites.filter((inv) => {
      if (cleanEmail && inv.email === cleanEmail) return false;
      if (targetUserId && inv.userId === targetUserId) return false;
      return true;
    });
    await saveInvitedSuperAdmins(supabase, nextInvites, user?.email);

    revalidatePath('/en/admin/settings');
    revalidatePath('/en/admin/admins');

    return {
      success: true,
      message: `Revoked Super Admin access for ${cleanEmail || targetUserId}.`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to revoke Super Admin access.',
    };
  }
}

export async function getEnquiries() {
  const { supabase } = await requireAdmin();

  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching enquiries:', error);
    return [];
  }

  return data || [];
}

let cachedProviderStatusResult: { timestamp: number; data: any } | null = null;
const PROVIDER_STATUS_CACHE_TTL_MS = 60_000;

export async function getLiveAiProviderStatus() {
  await requireAdmin();
  if (cachedProviderStatusResult && Date.now() - cachedProviderStatusResult.timestamp < PROVIDER_STATUS_CACHE_TTL_MS) {
    return cachedProviderStatusResult.data;
  }

  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || '';
  const elevenKey = process.env.ELEVENLABS_API_KEY?.trim() || '';

  const maskKey = (k: string) =>
    k && k.length > 10 ? `${k.slice(0, 6)}••••${k.slice(-4)}` : k ? 'Configured' : 'Missing';

  const googleStatus = {
    connected: false,
    maskedKey: maskKey(googleKey),
    modelsCount: 0,
    activeModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.5-flash-image'],
    error: null as string | null,
  };

  const elevenStatus = {
    connected: false,
    maskedKey: maskKey(elevenKey),
    tier: 'unknown',
    characterCount: 0,
    characterLimit: 0,
    nextInvoiceCents: 0,
    overageUsd: 0,
    nextResetUnix: null as number | null,
    error: null as string | null,
  };

  await Promise.all([
    (async () => {
      if (!googleKey) {
        googleStatus.error = 'Missing GOOGLE_GENERATIVE_AI_API_KEY';
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${googleKey}`,
          { signal: controller.signal, next: { revalidate: 120 } }
        );
        if (res.ok) {
          const data = await res.json();
          googleStatus.connected = true;
          googleStatus.modelsCount = data.models?.length || 0;
        } else {
          googleStatus.error = `HTTP ${res.status}`;
        }
      } catch (e: any) {
        googleStatus.error = e?.message || 'Connection failed';
      } finally {
        clearTimeout(timeout);
      }
    })(),
    (async () => {
      if (!elevenKey) {
        elevenStatus.error = 'Missing ELEVENLABS_API_KEY';
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: { 'xi-api-key': elevenKey },
          signal: controller.signal,
          next: { revalidate: 120 },
        });
        if (res.ok) {
          const sub = await res.json();
          elevenStatus.connected = true;
          elevenStatus.tier = sub.tier || 'creator';
          elevenStatus.characterCount = sub.character_count || 0;
          elevenStatus.characterLimit = sub.character_limit || 0;
          elevenStatus.nextInvoiceCents = sub.next_invoice?.amount_due_cents || 0;
          elevenStatus.overageUsd = Number(sub.current_overage?.amount || 0);
          elevenStatus.nextResetUnix = sub.next_character_count_reset_unix || null;
        } else {
          elevenStatus.error = `HTTP ${res.status}`;
        }
      } catch (e: any) {
        elevenStatus.error = e?.message || 'Connection failed';
      } finally {
        clearTimeout(timeout);
      }
    })(),
  ]);

  const result = { googleStatus, elevenStatus };
  cachedProviderStatusResult = { timestamp: Date.now(), data: result };
  return result;
}

let cachedAiCostsResult: { timestamp: number; logs: StoredAiUsageLog[] } | null = null;
const AI_COSTS_CACHE_TTL_MS = 60_000;

export async function getAiCosts(): Promise<StoredAiUsageLog[]> {
  const { supabase } = await requireAdmin();

  if (cachedAiCostsResult && Date.now() - cachedAiCostsResult.timestamp < AI_COSTS_CACHE_TTL_MS) {
    return cachedAiCostsResult.logs;
  }

  const mergedMap = new Map<string, StoredAiUsageLog>();

  const addLog = (key: string, entry: StoredAiUsageLog) => {
    if (!mergedMap.has(key)) {
      mergedMap.set(key, entry);
    }
  };

  // Run local file read, Supabase table read, root storage listing, and ElevenLabs history in parallel
  const [localLogs, dbRes, rootStorageRes, elevenHistoryRes] = await Promise.all([
    readLocalAiLogs(),
    supabase
      .from('ai_usage_logs')
      .select('id, model_name, prompt_tokens, completion_tokens, cost_usd, feature_name, mystery_id, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then((r: any) => r, () => ({ data: null, error: true })),
    supabase.storage
      .from('character-images')
      .list('', { limit: 200 })
      .then((r: any) => r, () => ({ data: null })),
    (async () => {
      const elevenKey = process.env.ELEVENLABS_API_KEY?.trim();
      if (!elevenKey) return null;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);
      try {
        const res = await fetch('https://api.elevenlabs.io/v1/history?page_size=100', {
          headers: { 'xi-api-key': elevenKey },
          signal: controller.signal,
          next: { revalidate: 120 },
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })(),
  ]);

  // 1. Local persistent JSON log file (`data/ai-usage-logs.json`)
  for (const log of localLogs) {
    addLog(`local:${log.id}`, log);
  }

  // 2. Supabase `ai_usage_logs` table
  if (!dbRes?.error && Array.isArray(dbRes?.data)) {
    for (const row of dbRes.data) {
      addLog(`db:${row.id}`, {
        id: row.id,
        model_name: row.model_name,
        prompt_tokens: Number(row.prompt_tokens || 0),
        completion_tokens: Number(row.completion_tokens || 0),
        cost_usd: Number(row.cost_usd || 0),
        feature_name: row.feature_name,
        mystery_id: row.mystery_id || null,
        user_id: row.user_id || null,
        created_at: row.created_at,
        source: 'logged',
      });
    }
  }

  // 3. Root-level generated guest avatars in Supabase Storage `character-images`
  for (const item of rootStorageRes?.data || []) {
    if (item.id && (item.name.endsWith('.jpg') || item.name.endsWith('.png') || item.name.endsWith('.webp'))) {
      addLog(`storage-avatar:${item.name}`, {
        id: `storage-${item.id}`,
        model_name: 'gemini-2.5-flash-image',
        prompt_tokens: 185,
        completion_tokens: 1290,
        cost_usd: 0.039,
        feature_name: 'generate_guest_avatar',
        mystery_id: null,
        user_id: null,
        created_at: item.created_at || new Date().toISOString(),
        source: 'google_storage',
      });
    }
  }

  // 4. Local generated Moodboard & Clue images in `public/moodboard` and `public/clues`
  const localAssetDirs: Array<{ dir: string; feature: string }> = [
    { dir: path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'moodboard', 'lotr'), feature: 'generate_moodboard_image' },
    { dir: path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'clues', 'doa'), feature: 'generate_clue_image' },
  ];
  for (const { dir, feature } of localAssetDirs) {
    try {
      const files = await fs.readdir(/*turbopackIgnore: true*/ dir);
      for (const file of files) {
        if (file.endsWith('.jpg') || file.endsWith('.png') || file.endsWith('.webp')) {
          const stat = await fs.stat(path.join(/*turbopackIgnore: true*/ dir, file));
          const label = file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
          addLog(`public-img:${feature}:${file}`, {
            id: `public-${feature}-${file}`,
            model_name: 'gemini-2.5-flash-image',
            prompt_tokens: 240,
            completion_tokens: 1290,
            cost_usd: 0.039,
            feature_name: `${feature} (${label})`,
            mystery_id: null,
            user_id: null,
            created_at: stat.mtime.toISOString(),
            source: 'google_storage',
          });
        }
      }
    } catch {}
  }

  // 5. ElevenLabs synthesis history
  if (elevenHistoryRes && Array.isArray(elevenHistoryRes.history)) {
    const groups: Array<{
      id: string;
      model: string;
      chars: number;
      lines: number;
      dateUnix: number;
    }> = [];

    for (const item of elevenHistoryRes.history) {
      const chars = Math.max(
        0,
        (item.character_count_change_to || 0) - (item.character_count_change_from || 0)
      );
      const model = item.model_id || 'eleven_v3';
      const dateUnix = item.date_unix || Math.floor(Date.now() / 1000);
      const prev = groups[groups.length - 1];

      if (prev && prev.model === model && Math.abs(prev.dateUnix - dateUnix) <= 45) {
        prev.chars += chars;
        prev.lines += 1;
      } else {
        groups.push({
          id: item.history_item_id,
          model,
          chars,
          lines: 1,
          dateUnix,
        });
      }
    }

    for (const g of groups) {
      const ratePer1k = g.model === 'eleven_turbo_v2_5' ? 0.15 : 0.30;
      const cost = (g.chars / 1000) * ratePer1k;
      addLog(`elevenlabs:${g.id}`, {
        id: `el-${g.id}`,
        model_name: `elevenlabs:${g.model}`,
        prompt_tokens: g.chars,
        completion_tokens: g.lines,
        cost_usd: Number(cost.toFixed(6)),
        feature_name: `generate_audio_clue (${g.lines} ${g.lines === 1 ? 'line' : 'lines'})`,
        mystery_id: null,
        user_id: null,
        created_at: new Date(g.dateUnix * 1000).toISOString(),
        source: 'elevenlabs_api',
      });
    }
  }

  const sorted = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  cachedAiCostsResult = { timestamp: Date.now(), logs: sorted };
  return sorted;
}

// --- Customer Profile View Data ---

export async function getCustomerProfile(userId: string) {
  const { supabase, user } = await requireAdmin();
  const { getCustomerCrmData } = await import('@/app/actions/admin-users');
  const [{ data, error }, { data: roleData }, crm] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle(),
    getCustomerCrmData(userId),
  ]);

  if (error) console.error('Error fetching customer profile:', error);
  if (!data || isProfileDeleted(data, crm)) return null;

  const emailLower = ((data as any).email || '').toLowerCase().trim();
  const dbRole = String((roleData as any)?.role || '').toLowerCase().trim();
  const isAllowlistedOwner =
    ADMIN_UID_ALLOWLIST.includes((data as any).id) ||
    (emailLower && ADMIN_EMAIL_ALLOWLIST.includes(emailLower));
  const isSuperAdmin =
    isAllowlistedOwner || dbRole === 'superadmin' || dbRole === 'super_admin';
  const isAdmin = isSuperAdmin || dbRole === 'admin';
  const currentUserId = user?.id || '';
  const currentUserEmail = (user?.email || '').toLowerCase().trim();
  const isCurrentUser = Boolean(
    (currentUserId && (data as any).id === currentUserId) ||
      (currentUserEmail && emailLower && emailLower === currentUserEmail)
  );

  const signupMeta = computeNewSignupMeta((data as any).created_at);

  return {
    ...(data as any),
    isCurrentUser,
    isSuperAdmin,
    isAdmin,
    adminRoleLabel: isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : null,
    ...signupMeta,
  };
}

export async function getCustomerOrders(userId: string) {
  const { supabase } = await requireAdmin();
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, amount, status, created_at, mystery_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching customer orders:', error);
    return [];
  }

  const safeOrders = orders || [];
  
  if (safeOrders.length === 0) return [];

  // Fetch mysteries manually to avoid PGRST200 join errors
  const mysteryIds = [...new Set(safeOrders.map(o => o.mystery_id).filter(Boolean))];
  
  let mysteriesMap: Record<string, string> = {};
  if (mysteryIds.length > 0) {
    // Try mysteries first
    const { data: mysteries } = await supabase
      .from('mysteries')
      .select('id, title')
      .in('id', mysteryIds);
      
    if (mysteries && mysteries.length > 0) {
      mysteriesMap = mysteries.reduce((acc, m) => ({...acc, [m.id]: m.title}), {});
    } else {
      // Fallback to mystery_bases if they are buying bases
      const { data: bases } = await supabase
        .from('mystery_bases')
        .select('id, title')
        .in('id', mysteryIds);
      if (bases) {
        mysteriesMap = bases.reduce((acc, b) => ({...acc, [b.id]: b.title}), {});
      }
    }
  }

  // Attach title back to orders
  return safeOrders.map(o => ({
    ...o,
    mystery: { title: mysteriesMap[o.mystery_id as string] || 'Unknown Mystery' }
  }));
}

export async function getCustomerMysteries(userId: string) {
  const { supabase } = await requireAdmin();
  const { getCustomerCrmData } = await import('@/app/actions/admin-users');
  const [{ data, error }, crm] = await Promise.all([
    supabase
      .from('mysteries')
      .select('id, title, theme, status, min_players, max_players, current_round, created_at')
      .eq('created_by', userId)
      .order('created_at', { ascending: false }),
    getCustomerCrmData(userId),
  ]);

  if (error) console.error('Error fetching customer mysteries:', error);

  const revokedSet = new Set(crm.revokedMysteryIds || []);
  const roundOverrides = crm.mysteryRoundOverrides || {};
  const map = new Map<string, any>();

  for (const m of (data as any[]) || []) {
    if (revokedSet.has(m.id)) continue;
    map.set(m.id, {
      ...m,
      current_round: roundOverrides[m.id] ?? m.current_round ?? 1,
    });
  }

  for (const gm of crm.giftedMysteries || []) {
    if (revokedSet.has(gm.id)) continue;
    if (!map.has(gm.id)) {
      map.set(gm.id, {
        ...gm,
        current_round: roundOverrides[gm.id] ?? gm.current_round ?? 1,
      });
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function getGiftableCatalogMysteries() {
  const { supabase } = await requireAdmin();
  const { CORE_MYSTERY_PACKAGES } = await import('@/utils/discounts');
  const { data, error } = await supabase
    .from('mysteries')
    .select('id, title, theme, status, min_players, max_players')
    .order('status', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching giftable catalog mysteries:', error);
  }

  // Deduplicate by title, preferring published DB mysteries first, then CORE_MYSTERY_PACKAGES
  const seenTitles = new Set<string>();
  const unique: any[] = [];
  for (const m of data || []) {
    const key = (m.title || '').trim().toLowerCase();
    if (!key || seenTitles.has(key)) continue;
    seenTitles.add(key);
    unique.push(m);
  }

  for (const pkg of CORE_MYSTERY_PACKAGES) {
    const key = pkg.title.trim().toLowerCase();
    if (seenTitles.has(key)) continue;
    seenTitles.add(key);
    unique.push({
      id: pkg.id,
      title: pkg.title,
      theme: pkg.theme,
      status: 'published',
      min_players: 8,
      max_players: 12,
    });
  }

  return unique;
}

export async function getCustomerGuests(userId: string) {
  const { supabase } = await requireAdmin();
  
  const [{ data: manualGuests }, { data: linkedConnections }] = await Promise.all([
    supabase
      .from('guests')
      .select('*')
      .eq('user_id', userId),
    (supabase as any)
      .from('guest_connections')
      .select(`
        id,
        profiles!guest_user_id (
          full_name, email, pronouns, avatar_url, avatar_config, character_preferences, bio
        )
      `)
      .eq('host_user_id', userId),
  ]);

  return {
    manual: (manualGuests as any[]) || [],
    linked: (linkedConnections as any[]) || []
  };
}

export async function getCustomerAiUsage(userId: string) {
  const { supabase } = await requireAdmin();
  const [localLogs, customerMysteries] = await Promise.all([
    readLocalAiLogs(),
    supabase.from('mysteries').select('id').eq('created_by', userId),
  ]);

  const ownedMysteryIds = new Set((customerMysteries.data || []).map((m: any) => m.id));
  const userLogs = localLogs.filter(
    (log: any) =>
      log.user_id === userId || (log.mystery_id && ownedMysteryIds.has(log.mystery_id))
  );

  const totalPrompt = userLogs.reduce((sum: number, log: any) => sum + (log.prompt_tokens || 0), 0);
  const totalCompletion = userLogs.reduce((sum: number, log: any) => sum + (log.completion_tokens || 0), 0);
  const totalTokens = totalPrompt + totalCompletion;
  const estimatedCost = userLogs.reduce((sum: number, log: any) => sum + (Number(log.cost_usd) || 0), 0);

  return {
    generationsCount: userLogs.length,
    totalTokens,
    estimatedCost,
  };
}
