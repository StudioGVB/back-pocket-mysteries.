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
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

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
  totals: { visitors: number; pageviews: number };
  data: Array<{ key: string; visitors: number; pageviews: number }>;
}> {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return { isConnected: false, totals: { visitors: 0, pageviews: 0 }, data: [] };
  }

  try {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

    const params = new URLSearchParams({
      teamId,
      projectId,
      since: fromDate.toISOString(),
      until: today.toISOString(),
      environment: 'production',
      by: 'day',
    });

    const [seriesRes, countRes] = await Promise.all([
      fetch(
        `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          next: { revalidate: 300 },
        }
      ),
      getVercelTraffic(days),
    ]);

    if (!seriesRes.ok) {
      const text = await seriesRes.text();
      console.error('Failed to fetch Vercel Timeseries:', text);
      return {
        isConnected: true,
        error: `Vercel API returned ${seriesRes.status}`,
        totals: { visitors: countRes.visitors, pageviews: countRes.pageViews },
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
      const sumVisitors = mapped.reduce((acc: number, c: any) => acc + c.visitors, 0);
      const sumPageviews = mapped.reduce((acc: number, c: any) => acc + c.pageviews, 0);
      return {
        isConnected: true,
        totals: {
          visitors: countRes.visitors > 0 ? countRes.visitors : sumVisitors,
          pageviews: countRes.pageViews > 0 ? countRes.pageViews : sumPageviews,
        },
        data: mapped,
      };
    }

    return {
      isConnected: true,
      totals: { visitors: countRes.visitors, pageviews: countRes.pageViews },
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
): Promise<Array<{ key: string; visitors: number; pageviews: number }>> {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();
  if (!token) return [];

  try {
    const today = new Date();
    const fromDate = new Date();
    fromDate.setDate(today.getDate() - days);

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
  return fetchVercelAggregateDimension('requestPath', days);
}

export async function getTopCountries(days = 30) {
  return fetchVercelAggregateDimension('country', days);
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
