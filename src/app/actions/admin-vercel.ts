"use server";

import crypto from 'crypto';
import { connection } from 'next/server';

const DEFAULT_PROJECT_ID = 'prj_yX4Yv8y3uN530Uo8OgZH4cvJmFyL';
const DEFAULT_TEAM_ID = 'team_SIqa9TXJlb8Y9i71BPgG9QRO';

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
        next: { revalidate: 900 },
      }
    );

    if (!res.ok) {
      console.error('Failed to fetch Vercel Analytics count:', await res.text());
      return { visitors: 0, pageViews: 0, isConnected: true, error: true };
    }

    const data = await res.json();
    return {
      visitors: data.visitors || 0,
      pageViews: data.pageviews || 0,
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
  data: Array<{ key: string; visitors: number; pageviews: number }>;
}> {
  await connection();
  const { token, projectId, teamId } = getVercelConfig();

  if (!token) {
    return { isConnected: false, data: [] };
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

    const res = await fetch(
      `https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 900 },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error('Failed to fetch Vercel Timeseries:', text);
      return { isConnected: true, error: `Vercel API returned ${res.status}`, data: [] };
    }

    const json = await res.json();

    if (json.data && Array.isArray(json.data)) {
      return {
        isConnected: true,
        data: json.data.map((item: any) => ({
          key: item.timestamp,
          visitors: item.visitors || 0,
          pageviews: item.pageviews || 0,
        })),
      };
    }

    return { isConnected: true, data: [] };
  } catch (err: any) {
    console.error('Vercel API Error (Timeseries):', err);
    return { isConnected: true, error: err?.message || 'Request failed', data: [] };
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
        next: { revalidate: 900 },
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
async function getGscAccessToken(): Promise<{ token: string | null; siteUrl: string | null }> {
  const siteUrl =
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ||
    process.env.GSC_SITE_URL ||
    null;

  if (process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN) {
    return { token: process.env.GOOGLE_SEARCH_CONSOLE_ACCESS_TOKEN, siteUrl };
  }

  let clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL || null;
  let privateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY
    ? process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : null;

  if (process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON);
      clientEmail = parsed.client_email || clientEmail;
      privateKey = parsed.private_key || privateKey;
    } catch {
      // ignore invalid JSON
    }
  }

  if (!clientEmail || !privateKey || !siteUrl) {
    return { token: null, siteUrl };
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
      next: { revalidate: 1800 },
    });

    if (!tokenRes.ok) {
      return { token: null, siteUrl };
    }

    const tokenData = await tokenRes.json();
    return { token: tokenData.access_token || null, siteUrl };
  } catch (err) {
    console.error('GSC JWT Auth Error:', err);
    return { token: null, siteUrl };
  }
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscStatsResult {
  isConnected: boolean;
  siteUrl: string | null;
  error?: string;
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
  topQueries: GscQueryRow[];
}

export async function getGoogleSearchConsoleStats(days = 30): Promise<GscStatsResult> {
  await connection();
  const { token, siteUrl } = await getGscAccessToken();

  if (!token || !siteUrl) {
    return {
      isConnected: false,
      siteUrl,
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
    };
  }

  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const res = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
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
          rowLimit: 15,
        }),
        next: { revalidate: 1800 },
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return {
        isConnected: true,
        siteUrl,
        error: `Search Console API returned ${res.status}: ${errText.slice(0, 140)}`,
        totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
        topQueries: [],
      };
    }

    const data = await res.json();
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const topQueries: GscQueryRow[] = rows.map((r: any) => ({
      query: r.keys?.[0] || '(not set)',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr || 0,
      position: r.position || 0,
    }));

    const totalClicks = topQueries.reduce((s, r) => s + r.clicks, 0);
    const totalImpressions = topQueries.reduce((s, r) => s + r.impressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPos =
      topQueries.length > 0
        ? topQueries.reduce((s, r) => s + r.position, 0) / topQueries.length
        : 0;

    return {
      isConnected: true,
      siteUrl,
      totals: {
        clicks: totalClicks,
        impressions: totalImpressions,
        ctr: avgCtr,
        position: avgPos,
      },
      topQueries,
    };
  } catch (err: any) {
    return {
      isConnected: true,
      siteUrl,
      error: err?.message || 'Failed to query Google Search Console',
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
    };
  }
}
