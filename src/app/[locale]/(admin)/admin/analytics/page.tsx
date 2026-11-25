import React, { Suspense } from 'react';
import {
  getAnalyticsTimeseries,
  getTopPaths,
  getTopCountries,
  getTopReferrers,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getGoogleSearchConsoleStats,
  getGoogleAnalytics4RealtimeAndGeoStats,
} from '@/app/actions/admin-vercel';
import { TrafficChart } from '@/components/admin/TrafficChart';
import { TrafficTables } from '@/components/admin/TrafficTables';
import { Ga4LiveGlobalMapPanel } from '@/components/admin/Ga4LiveGlobalMapPanel';
import { AnalyticsNav } from '@/components/admin/AnalyticsNav';
import { AnalyticsDurationSelector } from '@/components/admin/AnalyticsDurationSelector';
import { parseAnalyticsDays } from '@/components/admin/analytics-duration-utils';
import { OwnerDeviceExclusionBanner } from '@/components/analytics/PageViewDurationTracker';
import { getLivePresenceSnapshot } from '@/lib/live-presence-store';

export const unstable_instant = false;

export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ days?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  const days = parseAnalyticsDays(sp?.days);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            Platform Intelligence
          </p>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
            Traffic &amp; SEO Analytics
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Live visitor telemetry from Google Analytics 4 (GA4), First-Party Geo Radar, Vercel Web Analytics &amp; Google Search Console
          </p>
        </div>
        <Suspense fallback={null}>
          <AnalyticsDurationSelector currentDays={days} />
        </Suspense>
      </div>

      <OwnerDeviceExclusionBanner />

      <AnalyticsNav locale={locale} />

      <Suspense
        key={days}
        fallback={
          <div className="space-y-6">
            <div className="h-[360px] bg-slate-100 animate-pulse rounded-[32px]" />
            <div className="h-[420px] bg-slate-100 animate-pulse rounded-[32px]" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-[280px] bg-slate-100 animate-pulse rounded-[32px]" />
              <div className="h-[280px] bg-slate-100 animate-pulse rounded-[32px]" />
            </div>
          </div>
        }
      >
        <AnalyticsData days={days} />
      </Suspense>
    </div>
  );
}

async function AnalyticsData({ days }: { days: number }) {
  const [
    timeseriesRes,
    topPaths,
    topCountries,
    topReferrers,
    devices,
    browsers,
    gsc,
    ga4,
    initialPresence,
  ] = await Promise.all([
    getAnalyticsTimeseries(days).catch(() => ({
      isConnected: false,
      totals: { visitors: 0, pageviews: 0 },
      data: [],
    })),
    getTopPaths(days).catch(() => []),
    getTopCountries(days).catch(() => []),
    getTopReferrers(days).catch(() => []),
    getDeviceBreakdown(days).catch(() => []),
    getBrowserBreakdown(days).catch(() => []),
    getGoogleSearchConsoleStats(days).catch(() => ({
      isConnected: false,
      siteUrl: 'sc-domain:backpocketmysteries.com',
      totals: { clicks: 0, impressions: 0, ctr: 0, position: 0 },
      topQueries: [],
      topPages: [],
    })),
    getGoogleAnalytics4RealtimeAndGeoStats(days).catch(() => ({
      isConnected: false,
      hasTrackingTagOnly: true,
      measurementId: 'G-VW0PRLFNL4',
      propertyId: '',
      clientEmail: '',
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
    })),
    getLivePresenceSnapshot().catch(() => ({
      activeRightNowCount: 0,
      activeLast30MinCount: 0,
      liveVisitors: [],
      recentVisitors30m: [],
      cityPins: [],
      funnelCounts: {
        browsing: 0,
        inspecting_mystery: 0,
        checkout: 0,
        casting_or_prep: 0,
        live_playroom: 0,
      },
    })),
  ]);

  return (
    <>
      {/* Global Visitor Map & GA4 / First-Party Real-Time Live Stream */}
      <Ga4LiveGlobalMapPanel
        ga4={ga4}
        vercelCountries={topCountries}
        initialPresence={initialPresence}
        days={days}
      />

      {!timeseriesRes.isConnected ? (
        <div className="bg-amber-50 border border-amber-200 rounded-[32px] p-8 text-amber-900">
          <h3 className="text-lg font-black uppercase tracking-tight mb-1">
            Vercel Web Analytics Token Not Configured
          </h3>
          <p className="text-xs font-semibold text-amber-800">
            Add <code className="font-mono bg-white px-1.5 py-0.5 rounded">VERCEL_ACCESS_TOKEN</code> to your environment variables to stream live production visitor metrics.
          </p>
        </div>
      ) : (
        <TrafficChart data={timeseriesRes.data} totals={timeseriesRes.totals} days={days} />
      )}

      <TrafficTables
        topPaths={topPaths}
        topCountries={topCountries}
        topReferrers={topReferrers}
        devices={devices}
        browsers={browsers}
        gsc={gsc}
      />
    </>
  );
}
