"use server";

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { connection } from 'next/server';

const DEFAULT_PROJECT_ID = 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
const DEFAULT_TEAM_ID = 'team_SIqa9TXJlb8Y9i71BPgG9QRO';
const GSC_STORE_PATH = path.join(process.cwd(), '.gsc-config.json');

interface StoredGscConfig {
  siteUrl: string;
  clientEmail: string;
  privateKey: string;
  updatedAt: string;
}

function readStoredGscConfig(): StoredGscConfig | null {
  try {
    if (fs.existsSync(GSC_STORE_PATH)) {
      const raw = fs.readFileSync(GSC_STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed?.clientEmail && parsed?.privateKey) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export async function saveGoogleSearchConsoleConfigAction(input: {
  siteUrl: string;
  serviceAccountJsonOrEmail: string;
  privateKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { requireAdmin } = await import('@/utils/admin-auth');
    await requireAdmin();

    let siteUrl = (input.siteUrl || 'sc-domain:backpocketmysteries.com').trim();
    if (!siteUrl) siteUrl = 'sc-domain:backpocketmysteries.com';

    let clientEmail = '';
    let privateKey = (input.privateKey || '').trim();

    const trimmedJson = (input.serviceAccountJsonOrEmail || '').trim();
    if (trimmedJson.startsWith('{')) {
      const parsed = JSON.parse(trimmedJson);
      clientEmail = (parsed.client_email || '').trim();
      privateKey = (parsed.private_key || '').trim();
    } else {
      clientEmail = trimmedJson;
    }

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!clientEmail || !privateKey.includes('PRIVATE KEY')) {
      return {
        ok: false,
        error:
          'Please paste either your full Google Service Account JSON file, or a valid Service Account Email and Private Key.',
      };
    }

    const payload: StoredGscConfig = {
      siteUrl,
      clientEmail,
      privateKey,
      updatedAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(GSC_STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch {
      // On read-only serverless filesystems, also keep in process memory for the warm instance
    }
    (globalThis as any).__BPM_GSC_CONFIG = payload;

    revalidatePath('/en/admin/analytics');
    revalidatePath('/fr/admin/analytics');
    revalidatePath('/en/admin');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save credentials' };
  }
}

const VERCEL_HISTORY_PATH = path.join(process.cwd(), 'data', 'vercel-analytics-history.json');

interface DailyTrafficEntry {
  visitors: number;
  pageviews: number;
}

function readVercelHistory(): Record<string, DailyTrafficEntry> {
  try {
    if (fs.existsSync(VERCEL_HISTORY_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(VERCEL_HISTORY_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {
    // ignore
  }
  return {};
}

function saveVercelHistory(points: Array<{ key: string; visitors: number; pageviews: number }>) {
  try {
    const store = readVercelHistory();
    let changed = false;
    for (const pt of points) {
      if (!pt.key) continue;
      const dateKey = pt.key.slice(0, 10);
      const prev = store[dateKey];
      const nextV = Math.max(prev?.visitors || 0, Number(pt.visitors) || 0);
      const nextP = Math.max(prev?.pageviews || 0, Number(pt.pageviews) || 0);
      if (!prev || prev.visitors !== nextV || prev.pageviews !== nextP) {
        store[dateKey] = { visitors: nextV, pageviews: nextP };
        changed = true;
      }
    }
    if (changed) {
      const dir = path.dirname(VERCEL_HISTORY_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(VERCEL_HISTORY_PATH, JSON.stringify(store, null, 2), 'utf8');
    }
  } catch {
    // ignore on read-only serverless filesystems
  }
}

function getVercelConfig() {
  const token = process.env.VERCEL_ACCESS_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID || DEFAULT_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID || DEFAULT_TEAM_ID;
  return { token, projectId, teamId };
}

export async function getVercelTraffic(days = 30) {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return {
      visitors: 0,
      pageViews: 0,
      isConnected: false,
    };
  }

  try {
    // Vercel Hobby API grants direct query access up to 31 days; clamp live query window to 30d
    const apiDays = Math.min(Math.max(1, Number(days) || 30), 30);
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - apiDays);

    const params = new URLSearchParams({
      teamId,
      projectId,
      since: fromDate.toISOString(),
      until: today.toISOString(),
      environment: 'production',
    });

    const res = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/count?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch Vercel Analytics count:', await res.text());
      return { visitors: 0, pageViews: 0, isConnected: true, error: true };
    }

    const json = await res.json();
    const payload = json?.data || json;
    return {
      visitors: payload?.visitors || 0,
      pageViews: payload?.pageviews || 0,
      isConnected: true,
    };
  } catch (err: any) {
    console.error('Vercel API Error:', err);
    return { visitors: 0, pageViews: 0, isConnected: true, error: true };
  }
}

export async function getAnalyticsTimeseries(days = 30): Promise<{
  isConnected: boolean;
  error?: string;
  totals: {
    visitors: number;
    pageviews: number;
    avgViewSeconds?: number;
    avgSessionSeconds?: number;
  };
  data: Array<{ key: string; visitors: number; pageviews: number }>;
}> {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return { isConnected: false, totals: { visitors: 0, pageviews: 0 }, data: [] };
  }

  try {
    const {
      getMergedViewDurationStore,
    } = await import('@/lib/view-duration-store');
    const requestedDays = Math.max(1, Number(days) || 30);
    const apiDays = Math.min(requestedDays, 30);
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - apiDays);

    const params = new URLSearchParams({
      teamId,
      projectId,
      since: fromDate.toISOString(),
      until: today.toISOString(),
      environment: 'production',
      by: 'day',
    });

    const [seriesRes, countRes, durationStore] = await Promise.all([
      fetch(
        `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 300 },
        }
      ),
      getVercelTraffic(apiDays),
      getMergedViewDurationStore(),
    ]);

    const computeGlobalAvgViewSec = (totVisitors: number, totViews: number) => {
      if (durationStore.global && durationStore.global.count >= 3) {
        return Math.max(15, Math.round(durationStore.global.totalSeconds / durationStore.global.count));
      }
      const ratio = totVisitors > 0 ? Math.min(5, Math.max(1, totViews / totVisitors)) : 1.5;
      const est = Math.round(86 * (0.9 + Math.min(0.4, (ratio - 1) * 0.18)));
      if (durationStore.global && durationStore.global.count > 0) {
        const recAvg = durationStore.global.totalSeconds / durationStore.global.count;
        const w = durationStore.global.count / 3;
        return Math.round(recAvg * w + est * (1 - w));
      }
      return est;
    };

    if (!seriesRes.ok) {
      const text = await seriesRes.text();
      console.error('Failed to fetch Vercel Timeseries:', text);
      const avgViewSeconds = computeGlobalAvgViewSec(countRes.visitors, countRes.pageViews);
      const pagesPerVisitor =
        countRes.visitors > 0 ? Math.max(1, countRes.pageViews / countRes.visitors) : 1;
      return {
        isConnected: true,
        error: `Vercel API returned ${seriesRes.status}`,
        totals: {
          visitors: countRes.visitors,
          pageviews: countRes.pageViews,
          avgViewSeconds,
          avgSessionSeconds: Math.round(avgViewSeconds * pagesPerVisitor),
        },
        data: [],
      };
    }

    const json = await seriesRes.json();

    if (json.data && Array.isArray(json.data)) {
      const mapped = json.data.map((item: any) => ({
        key: item.timestamp,
        visitors: item.visitors || 0,
        pageviews: item.pageviews || 0,
      }));

      // Archive daily datapoints locally so >30d views retain historical daily data over time
      saveVercelHistory(mapped);

      if (requestedDays <= 30) {
        const sumVisitors = mapped.reduce((acc: number, c: any) => acc + c.visitors, 0);
        const sumPageviews = mapped.reduce((acc: number, c: any) => acc + c.pageviews, 0);
        const finalVisitors = countRes.visitors > 0 ? countRes.visitors : sumVisitors;
        const finalViews = countRes.pageViews > 0 ? countRes.pageViews : sumPageviews;
        const avgViewSeconds = computeGlobalAvgViewSec(finalVisitors, finalViews);
        const pagesPerVisitor =
          finalVisitors > 0 ? Math.max(1, finalViews / finalVisitors) : 1;
        return {
          isConnected: true,
          totals: {
            visitors: finalVisitors,
            pageviews: finalViews,
            avgViewSeconds,
            avgSessionSeconds: Math.round(avgViewSeconds * pagesPerVisitor),
          },
          data: mapped,
        };
      }

      // Build full requestedDays timeline (e.g. 90d or 365d) combining archived history + live 30d data
      const historyMap = readVercelHistory();
      for (const pt of mapped) {
        if (!pt.key) continue;
        const dateKey = pt.key.slice(0, 10);
        historyMap[dateKey] = {
          visitors: pt.visitors || 0,
          pageviews: pt.pageviews || 0,
        };
      }

      const fullTimeline: Array<{ key: string; visitors: number; pageviews: number }> = [];
      for (let i = requestedDays; i >= 0; i--) {
        const d = new Date(today);
        d.setUTCDate(d.getUTCDate() - i);
        const dateKey = d.toISOString().slice(0, 10);
        const entry = historyMap[dateKey];
        fullTimeline.push({
          key: `${dateKey}T00:00:00.000Z`,
          visitors: entry?.visitors || 0,
          pageviews: entry?.pageviews || 0,
        });
      }

      const sumVisitors = fullTimeline.reduce((acc, c) => acc + c.visitors, 0);
      const sumPageviews = fullTimeline.reduce((acc, c) => acc + c.pageviews, 0);
      const finalVisitors = Math.max(countRes.visitors, sumVisitors);
      const finalViews = Math.max(countRes.pageViews, sumPageviews);
      const avgViewSeconds = computeGlobalAvgViewSec(finalVisitors, finalViews);
      const pagesPerVisitor =
        finalVisitors > 0 ? Math.max(1, finalViews / finalVisitors) : 1;

      return {
        isConnected: true,
        totals: {
          visitors: finalVisitors,
          pageviews: finalViews,
          avgViewSeconds,
          avgSessionSeconds: Math.round(avgViewSeconds * pagesPerVisitor),
        },
        data: fullTimeline,
      };
    }

    const avgViewSeconds = computeGlobalAvgViewSec(countRes.visitors, countRes.pageViews);
    return {
      isConnected: true,
      totals: {
        visitors: countRes.visitors,
        pageviews: countRes.pageViews,
        avgViewSeconds,
        avgSessionSeconds: avgViewSeconds,
      },
      data: [],
    };
  } catch (err: any) {
    console.error('Vercel API Error (Timeseries):', err);
    return {
      isConnected: true,
      error: err?.message || 'Request failed',
      totals: { visitors: 0, pageviews: 0 },
      data: [],
    };
  }
}

async function fetchVercelAggregateDimension(
  dimension: 'requestPath' | 'country' | 'referrerHostname' | 'deviceType' | 'browserName' | 'osName',
  days = 30
): Promise<Array<{ key: string; visitors: number; pageviews: number; avgViewSeconds?: number }>> {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();
  if (!token) return [];

  try {
    const apiDays = Math.min(Math.max(1, Number(days) || 30), 30);
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - apiDays);

    const params = new URLSearchParams({
      teamId,
      projectId,
      since: fromDate.toISOString(),
      until: today.toISOString(),
      environment: 'production',
      by: dimension,
    });

    const res = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 300 },
      }
    );

    if (!res.ok) {
      console.error(`Failed to fetch Vercel dimension ${dimension}:`, await res.text());
      return [];
    }

    const json = await res.json();
    if (json.data && Array.isArray(json.data)) {
      return json.data.map((item: any) => ({
        key: item[dimension] || (dimension === 'referrerHostname' ? 'Direct / None' : 'Unknown'),
        visitors: item.visitors || 0,
        pageviews: item.pageviews || 0,
      }));
    }
    return [];
  } catch (err) {
    console.error(`Error fetching Vercel dimension ${dimension}:`, err);
    return [];
  }
}

export async function getTopPaths(days = 30) {
  const [rows, store] = await Promise.all([
    fetchVercelAggregateDimension('requestPath', days),
    import('@/lib/view-duration-store').then((m) => m.getMergedViewDurationStore()),
  ]);
  const { resolvePathAvgViewSeconds } = await import('@/lib/view-duration-store');
  return rows.map((row) => ({
    ...row,
    avgViewSeconds: resolvePathAvgViewSeconds(row.key, row.visitors, row.pageviews, store),
  }));
}

export async function getTopCountries(days = 30) {
  const [rows, store] = await Promise.all([
    fetchVercelAggregateDimension('country', days),
    import('@/lib/view-duration-store').then((m) => m.getMergedViewDurationStore()),
  ]);
  const { resolveCountryAvgViewSeconds } = await import('@/lib/view-duration-store');
  return rows.map((row) => ({
    ...row,
    avgViewSeconds: resolveCountryAvgViewSeconds(row.key, row.visitors, row.pageviews, store),
  }));
}

export async function getTopReferrers(days = 30) {
  return fetchVercelAggregateDimension('referrerHostname', days);
}

export async function getDeviceBreakdown(days = 30) {
  return fetchVercelAggregateDimension('deviceType', days);
}

export async function getBrowserBreakdown(days = 30) {
  return fetchVercelAggregateDimension('browserName', days);
}

/**
 * Generates a short-lived Google OAuth2 access token from a Service Account JSON / env vars
 * for querying Google Search Console REST API directly without external SDK bloat.
 */
async function getGscAccessToken(): Promise<{
  token: string | null;
  siteUrl: string;
  clientEmail: string | null;
}> {
  const stored = (globalThis as any).__BPM_GSC_CONFIG || readStoredGscConfig();

  const siteUrl =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ||
    process.env.GSC_SITE_URL ||
    stored?.siteUrl ||
    'sc-domain:backpocketmysteries.com';

  if (process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) {
    return {
      token: process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN,
      siteUrl,
      clientEmail: stored?.clientEmail || process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || null,
    };
  }

  let clientEmail =
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || stored?.clientEmail || null;
  let privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
    ? process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : stored?.privateKey || null;

  if (process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON);
      clientEmail = parsed.client_email || clientEmail;
      privateKey = parsed.private_key ? parsed.private_key.replace(/\\n/g, '\n') : privateKey;
    } catch {
      // ignore invalid JSON
    }
  }

  if (!clientEmail || !privateKey) {
    return { token: null, siteUrl, clientEmail };
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/webmasters.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      })
    ).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(privateKey, 'base64url');
    const assertion = `${header}.${payload}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });

    if (!tokenRes.ok) {
      return { token: null, siteUrl, clientEmail };
    }

    const tokenData = await tokenRes.json();
    return { token: tokenData.access_token || null, siteUrl, clientEmail };
  } catch (err) {
    console.error('GSC JWT Auth Error:', err);
    return { token: null, siteUrl, clientEmail };
  }
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscStatsResult {
  isConnected: boolean;
  siteUrl: string | null;
  clientEmail?: string | null;
  error?: string;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: GscQueryRow[];
  topPages?: GscPageRow[];
}

export async function getGoogleSearchConsoleStats(days = 30): Promise<GscStatsResult> {
  await connection();
  const { token, siteUrl, clientEmail } = await getGscAccessToken();

  if (!token || !siteUrl) {
    return {
      isConnected: false,
      siteUrl,
      clientEmail,
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
      topPages: [],
    };
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Try primary siteUrl first; if 403/404 and it's sc-domain:, automatically try https://backpocketmysteries.com/ as fallback
    const candidateUrls = [
      siteUrl,
      siteUrl.startsWith('sc-domain:')
        ? `https://${siteUrl.replace('sc-domain:', '')}/`
        : `sc-domain:${siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
    ];

    let activeSiteUrl = siteUrl;
    let queryRes: Response | null = null;

    for (const candidate of candidateUrls) {
      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(candidate)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['query'],
            rowLimit: 25,
          }),
          cache: 'no-store',
        }
      );
      if (res.ok) {
        activeSiteUrl = candidate;
        queryRes = res;
        break;
      }
      if (!queryRes) queryRes = res;
    }

    if (!queryRes || !queryRes.ok) {
      const errText = queryRes ? await queryRes.text() : 'No response';
      return {
        isConnected: true,
        siteUrl: activeSiteUrl,
        clientEmail,
        error: `Search Console API returned ${queryRes?.status}: ${errText.slice(0, 180)}. Make sure ${clientEmail || 'your service account email'} is added as a User in Google Search Console -> Settings -> Users and permissions.`,
        totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        topQueries: [],
        topPages: [],
      };
    }

    // Also fetch site-wide aggregate totals (no dimensions, so anonymous/long-tail queries are included!) and top pages
    const [totalsRes, pagesRes] = await Promise.all([
      fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(activeSiteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
          }),
          cache: 'no-store',
        }
      ),
      fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(activeSiteUrl)}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            dimensions: ['page'],
            rowLimit: 15,
          }),
          cache: 'no-store',
        }
      ),
    ]);

    const data = await queryRes.json();
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const topQueries: GscQueryRow[] = rows.map((r: any) => ({
      query: r.keys?.[0] || '(not set)',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    let topPages: GscPageRow[] = [];
    if (pagesRes.ok) {
      const pagesJson = await pagesRes.json();
      const pageRows = Array.isArray(pagesJson.rows) ? pagesJson.rows : [];
      topPages = pageRows.map((r: any) => ({
        page: r.keys?.[0] || '/',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: r.ctr || 0,
        position: r.position || 0,
      }));
    }

    let totalClicks = topQueries.reduce((s, r) => s + r.clicks, 0);
    let totalImpressions = topQueries.reduce((s, r) => s + r.impressions, 0);
    let avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    let avgPos =
      topQueries.length > 0
        ? topQueries.reduce((s, r) => s + r.position, 0) / topQueries.length
        : 0;

    if (totalsRes.ok) {
      const totalsJson = await totalsRes.json();
      const aggRow = totalsJson?.rows?.[0];
      if (aggRow) {
        totalClicks = aggRow.clicks ?? totalClicks;
        totalImpressions = aggRow.impressions ?? totalImpressions;
        avgCtr = aggRow.ctr ?? avgCtr;
        avgPos = aggRow.position ?? avgPos;
      }
    }

    return {
      isConnected: true,
      siteUrl: activeSiteUrl,
      clientEmail,
      totals: {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPos,
      },
      topQueries,
      topPages,
    };
  } catch (err: any) {
    return {
      isConnected: true,
      siteUrl,
      clientEmail,
      error: err?.message || 'Failed to query Google Search Console',
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
      topPages: [],
    };
  }
}

// ============================================================================
// GOOGLE ANALYTICS 4 (GA4) REAL-TIME & GLOBAL GEO DATA API INTEGRATION
// ============================================================================

const GA4_STORE_PATH = path.join(process.cwd(), '.ga4-config.json');

export interface StoredGa4Config {
  measurementId: string; // e.g. G-XXXXXXXXXX
  propertyId: string; // numeric e.g. 482910384
  clientEmail: string;
  privateKey: string;
  updatedAt: string;
}

export interface Ga4RealtimeLocationRow {
  country: string;
  city: string;
  activeUsers: number;
}

export interface Ga4RealtimePageRow {
  screenName: string;
  activeUsers: number;
}

export interface Ga4CountryGeoRow {
  country: string;
  countryCode: string;
  activeUsers: number;
  sessions: number;
  pageviews: number;
}

export interface Ga4StatsResult {
  isConnected: boolean;
  hasTrackingTagOnly: boolean;
  measurementId: string;
  propertyId: string;
  clientEmail: string;
  error?: string;
  realtime: {
    activeUsersLast30Min: number;
    activeLocations: Ga4RealtimeLocationRow[];
    activePages: Ga4RealtimePageRow[];
    devices: { category: string; activeUsers: number }[];
  };
  historicalGeo: Ga4CountryGeoRow[];
  totals: {
    activeUsers: number;
    sessions: number;
    pageviews: number;
    avgEngagementSeconds: number;
  };
}

function readLocalGa4ConfigSync(): Partial<StoredGa4Config> | null {
  try {
    if ((globalThis as any).__BPM_GA4_CONFIG) {
      return (globalThis as any).__BPM_GA4_CONFIG;
    }
    if (fs.existsSync(GA4_STORE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(GA4_STORE_PATH, 'utf8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch {}
  return null;
}

async function loadMergedGa4Config(): Promise<StoredGa4Config> {
  const gscFallback = readStoredGscConfig();
  const localGa4 = readLocalGa4ConfigSync();

  let measurementId =
    localGa4?.measurementId ||
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
    'G-VW0PRLFNL4';
  let propertyId =
    localGa4?.propertyId ||
    process.env.GA4_PROPERTY_ID ||
    process.env.GOOGLE_ANALYTICS_PROPERTY_ID ||
    '534443990';
  let clientEmail =
    localGa4?.clientEmail ||
    process.env.GA4_CLIENT_EMAIL ||
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL ||
    gscFallback?.clientEmail ||
    '';
  let privateKey =
    localGa4?.privateKey ||
    (process.env.GA4_PRIVATE_KEY
      ? process.env.GA4_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '') ||
    (process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
      ? process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '') ||
    gscFallback?.privateKey ||
    '';

  // Also check Supabase platform_settings table so credentials persist on Vercel serverless
  try {
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    const { data } = await (supabase as any)
      .from('platform_settings')
      .select('config_json')
      .eq('id', 'global')
      .maybeSingle();

    const cfg = data?.config_json;
    if (cfg && typeof cfg === 'object') {
      if (cfg.googleAnalyticsId || cfg.gaMeasurementId) {
        measurementId = String(cfg.googleAnalyticsId || cfg.gaMeasurementId).trim();
      }
      if (cfg.ga4Config && typeof cfg.ga4Config === 'object') {
        const dbGa = cfg.ga4Config;
        if (dbGa.measurementId) measurementId = String(dbGa.measurementId).trim();
        if (dbGa.propertyId) propertyId = String(dbGa.propertyId).trim();
        if (dbGa.clientEmail) clientEmail = String(dbGa.clientEmail).trim();
        if (dbGa.privateKey) privateKey = String(dbGa.privateKey).replace(/\\n/g, '\n').trim();
      }
    }
  } catch {}

  // Clean numeric propertyId (strip "properties/" if user pasted "properties/123456")
  propertyId = (propertyId || '534443990').replace(/^properties\//i, '').trim();

  return {
    measurementId: (measurementId || 'G-VW0PRLFNL4').trim(),
    propertyId: propertyId || '534443990',
    clientEmail: clientEmail.trim(),
    privateKey: privateKey.trim(),
    updatedAt: localGa4?.updatedAt || '',
  };
}

export async function getActiveGaMeasurementId(): Promise<string> {
  const envId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '').trim();
  if (envId) return envId;
  const local = readLocalGa4ConfigSync();
  if (local?.measurementId) return local.measurementId.trim();
  try {
    const { getPlatformSettingsAction } = await import('@/app/actions/platform-settings');
    const settings = (await getPlatformSettingsAction()) as any;
    return (
      settings?.googleAnalyticsId ||
      settings?.gaMeasurementId ||
      'G-VW0PRLFNL4'
    ).trim();
  } catch {
    return 'G-VW0PRLFNL4';
  }
}

export async function saveGoogleAnalytics4ConfigAction(input: {
  measurementId: string;
  propertyId?: string;
  serviceAccountJsonOrEmail?: string;
  privateKey?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const { requireAdmin } = await import('@/utils/admin-auth');
    const { supabase, user } = await requireAdmin();

    const existing = await loadMergedGa4Config();
    const measurementId = (input.measurementId || existing.measurementId || '')
      .trim()
      .toUpperCase();
    const propertyId = (input.propertyId || existing.propertyId || '')
      .replace(/^properties\//i, '')
      .trim();

    if (!measurementId && !propertyId) {
      return {
        ok: false,
        error:
          'Please enter at least your GA4 Measurement ID (G-XXXXXXXXXX) or GA4 Property ID (e.g. 482910384).',
      };
    }

    let clientEmail = existing.clientEmail;
    let privateKey = (input.privateKey || '').trim() || existing.privateKey;

    const trimmedJson = (input.serviceAccountJsonOrEmail || '').trim();
    if (trimmedJson) {
      if (trimmedJson.startsWith('{')) {
        const parsed = JSON.parse(trimmedJson);
        clientEmail = (parsed.client_email || '').trim();
        privateKey = (parsed.private_key || '').trim();
      } else {
        clientEmail = trimmedJson;
      }
    }

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    const payload: StoredGa4Config = {
      measurementId,
      propertyId,
      clientEmail,
      privateKey,
      updatedAt: new Date().toISOString(),
    };

    try {
      fs.writeFileSync(GA4_STORE_PATH, JSON.stringify(payload, null, 2), 'utf8');
    } catch {}
    (globalThis as any).__BPM_GA4_CONFIG = payload;

    // Also update .env.local NEXT_PUBLIC_GA_MEASUREMENT_ID locally if writable
    if (measurementId) {
      try {
        const envPath = path.join(process.cwd(), '.env.local');
        if (fs.existsSync(envPath)) {
          let envText = fs.readFileSync(envPath, 'utf8');
          if (/^NEXT_PUBLIC_GA_MEASUREMENT_ID=/m.test(envText)) {
            envText = envText.replace(
              /^NEXT_PUBLIC_GA_MEASUREMENT_ID=.*$/m,
              `NEXT_PUBLIC_GA_MEASUREMENT_ID="${measurementId}"`
            );
          } else {
            envText += `\nNEXT_PUBLIC_GA_MEASUREMENT_ID="${measurementId}"\n`;
          }
          fs.writeFileSync(envPath, envText, 'utf8');
        }
      } catch {}
    }

    // Persist to Supabase platform_settings so Vercel production sees both the Measurement ID and GA4 Data API config
    try {
      const { data: row } = await (supabase as any)
        .from('platform_settings')
        .select('config_json')
        .eq('id', 'global')
        .maybeSingle();

      const prevCfg = row?.config_json && typeof row.config_json === 'object' ? row.config_json : {};
      await (supabase as any).from('platform_settings').upsert(
        {
          id: 'global',
          config_json: {
            ...prevCfg,
            gaMeasurementId: measurementId || prevCfg.gaMeasurementId || '',
            ga4Config: payload,
          },
          updated_at: payload.updatedAt,
          updated_by: user?.email || 'Super Admin',
        },
        { onConflict: 'id' }
      );
    } catch {}

    revalidatePath('/', 'layout');
    revalidatePath('/en/admin/analytics');
    revalidatePath('/en/admin/settings');
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to save Google Analytics config.' };
  }
}

async function getGa4AccessToken(config: StoredGa4Config): Promise<string | null> {
  if (!config.clientEmail || !config.privateKey || !config.privateKey.includes('PRIVATE KEY')) {
    return null;
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({
        iss: config.clientEmail,
        scope: 'https://www.googleapis.com/auth/analytics.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now,
      })
    ).toString('base64url');

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(`${header}.${payload}`);
    const signature = signer.sign(config.privateKey, 'base64url');
    const assertion = `${header}.${payload}.${signature}`;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      cache: 'no-store',
    });

    if (!tokenRes.ok) return null;
    const tokenData = await tokenRes.json();
    return tokenData.access_token || null;
  } catch {
    return null;
  }
}

export async function getGoogleAnalytics4RealtimeAndGeoStats(
  days = 30
): Promise<Ga4StatsResult> {
  await connection();
  const cfg = await loadMergedGa4Config();
  const token = await getGa4AccessToken(cfg);

  const emptyResult: Ga4StatsResult = {
    isConnected: false,
    hasTrackingTagOnly: Boolean(cfg.measurementId && (!cfg.propertyId || !token)),
    measurementId: cfg.measurementId,
    propertyId: cfg.propertyId,
    clientEmail: cfg.clientEmail,
    realtime: {
      activeUsersLast30Min: 0,
      activeLocations: [],
      activePages: [],
      devices: [],
    },
    historicalGeo: [],
    totals: {
      activeUsers: 0,
      sessions: 0,
      pageviews: 0,
      avgEngagementSeconds: 0,
    },
  };

  if (!cfg.propertyId || !token) {
    return emptyResult;
  }

  try {
    const baseUrl = `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(
      cfg.propertyId
    )}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const [rtLocRes, rtPagesRes, rtDevRes, geoReportRes, totalsReportRes] = await Promise.all([
      // 1. Realtime active users by Country + City (last 30 mins)
      fetch(`${baseUrl}:runRealtimeReport`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dimensions: [{ name: 'country' }, { name: 'city' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 25,
        }),
        cache: 'no-store',
      }),
      // 2. Realtime active pages
      fetch(`${baseUrl}:runRealtimeReport`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dimensions: [{ name: 'unifiedScreenName' }],
          metrics: [{ name: 'activeUsers' }],
          limit: 10,
        }),
        cache: 'no-store',
      }),
      // 3. Realtime devices
      fetch(`${baseUrl}:runRealtimeReport`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [{ name: 'activeUsers' }],
        }),
        cache: 'no-store',
      }),
      // 4. Historical Global Map Country Breakdown (N days)
      fetch(`${baseUrl}:runReport`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
          dimensions: [{ name: 'country' }, { name: 'countryId' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
          limit: 60,
        }),
        cache: 'no-store',
      }),
      // 5. Historical Aggregate Totals
      fetch(`${baseUrl}:runReport`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'userEngagementDuration' },
          ],
        }),
        cache: 'no-store',
      }),
    ]);

    if (!geoReportRes.ok && !rtLocRes.ok) {
      const errText = await geoReportRes.text();
      return {
        ...emptyResult,
        isConnected: true,
        error: `GA4 Data API returned ${geoReportRes.status}: ${errText.slice(
          0,
          200
        )}. Make sure 1) "Google Analytics Data API" is enabled in Google Cloud Console, and 2) ${
          cfg.clientEmail
        } is added as a Viewer in Google Analytics -> Admin -> Property Access Management.`,
      };
    }

    const activeLocations: Ga4RealtimeLocationRow[] = [];
    let activeUsersLast30Min = 0;

    if (rtLocRes.ok) {
      const rtLocJson = await rtLocRes.json();
      for (const row of rtLocJson.rows || []) {
        const country = row.dimensionValues?.[0]?.value || 'Unknown';
        const city = row.dimensionValues?.[1]?.value || '';
        const count = Number(row.metricValues?.[0]?.value) || 0;
        activeUsersLast30Min += count;
        activeLocations.push({ country, city, activeUsers: count });
      }
    }

    const activePages: Ga4RealtimePageRow[] = [];
    if (rtPagesRes.ok) {
      const rtPagesJson = await rtPagesRes.json();
      for (const row of rtPagesJson.rows || []) {
        activePages.push({
          screenName: row.dimensionValues?.[0]?.value || '/',
          activeUsers: Number(row.metricValues?.[0]?.value) || 0,
        });
      }
    }

    const devices: { category: string; activeUsers: number }[] = [];
    if (rtDevRes.ok) {
      const rtDevJson = await rtDevRes.json();
      for (const row of rtDevJson.rows || []) {
        devices.push({
          category: row.dimensionValues?.[0]?.value || 'desktop',
          activeUsers: Number(row.metricValues?.[0]?.value) || 0,
        });
      }
    }

    const historicalGeo: Ga4CountryGeoRow[] = [];
    if (geoReportRes.ok) {
      const geoJson = await geoReportRes.json();
      for (const row of geoJson.rows || []) {
        historicalGeo.push({
          country: row.dimensionValues?.[0]?.value || 'Unknown',
          countryCode: (row.dimensionValues?.[1]?.value || '').toUpperCase(),
          activeUsers: Number(row.metricValues?.[0]?.value) || 0,
          sessions: Number(row.metricValues?.[1]?.value) || 0,
          pageviews: Number(row.metricValues?.[2]?.value) || 0,
        });
      }
    }

    let totalUsers = historicalGeo.reduce((s, r) => s + r.activeUsers, 0);
    let totalSessions = historicalGeo.reduce((s, r) => s + r.sessions, 0);
    let totalViews = historicalGeo.reduce((s, r) => s + r.pageviews, 0);
    let avgEngagementSeconds = 0;

    if (totalsReportRes.ok) {
      const totJson = await totalsReportRes.json();
      const row0 = totJson.rows?.[0];
      if (row0) {
        totalUsers = Number(row0.metricValues?.[0]?.value) || totalUsers;
        totalSessions = Number(row0.metricValues?.[1]?.value) || totalSessions;
        totalViews = Number(row0.metricValues?.[2]?.value) || totalViews;
        const totalDur = Number(row0.metricValues?.[3]?.value) || 0;
        avgEngagementSeconds = totalUsers > 0 ? Math.round(totalDur / totalUsers) : 0;
      }
    }

    return {
      isConnected: true,
      hasTrackingTagOnly: false,
      measurementId: cfg.measurementId,
      propertyId: cfg.propertyId,
      clientEmail: cfg.clientEmail,
      realtime: {
        activeUsersLast30Min,
        activeLocations,
        activePages,
        devices,
      },
      historicalGeo,
      totals: {
        activeUsers: totalUsers,
        sessions: totalSessions,
        pageviews: totalViews,
        avgEngagementSeconds,
      },
    };
  } catch (err: any) {
    return {
      ...emptyResult,
      isConnected: true,
      error: err?.message || 'Failed to query Google Analytics 4 Data API.',
    };
  }
}

