import React, { Suspense } from 'react';
import {
  getAnalyticsTimeseries,
  getTopPaths,
  getTopCountries,
  getTopReferrers,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getGoogleSearchConsoleStats,
} from '@/app/actions/admin-vercel';
import { TrafficChart } from '@/components/admin/TrafficChart';
import { TrafficTables } from '@/components/admin/TrafficTables';
import { AnalyticsNav } from '@/components/admin/AnalyticsNav';

export const unstable_instant = false;

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            Platform Intelligence
          </p>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">
            Traffic &amp; SEO Analytics
          </h1>
          <p className="text-xs font-semibold text-gray-400 mt-1">
            Live visitor telemetry from Vercel Web Analytics &amp; Google Search Console (zero synthetic data)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Production Data • 30d
          </span>
        </div>
      </div>

      <AnalyticsNav locale={locale} />

      <Suspense
        fallback={
          <div className="space-y-6">
            <div className="h-[420px] bg-slate-100 animate-pulse rounded-[32px]" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="h-[280px] bg-slate-100 animate-pulse rounded-[32px]" />
              <div className="h-[280px] bg-slate-100 animate-pulse rounded-[32px]" />
            </div>
          </div>
        }
      >
        <AnalyticsData />
      </Suspense>
    </div>
  );
}

async function AnalyticsData() {
  const [timeseriesRes, topPaths, topCountries, topReferrers, devices, browsers, gsc] =
    await Promise.all([
      getAnalyticsTimeseries(30),
      getTopPaths(30),
      getTopCountries(30),
      getTopReferrers(30),
      getDeviceBreakdown(30),
      getBrowserBreakdown(30),
      getGoogleSearchConsoleStats(30),
    ]);

  return (
    <>
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
        <TrafficChart data={timeseriesRes.data} totals={timeseriesRes.totals} />
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
