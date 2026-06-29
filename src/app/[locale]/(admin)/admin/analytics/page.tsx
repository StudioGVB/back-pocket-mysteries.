import React, { Suspense } from 'react';
import { getAnalyticsTimeseries, getTopPaths, getTopCountries } from '@/app/actions/admin-vercel';
import { TrafficChart } from '@/components/admin/TrafficChart';
import { TrafficTables } from '@/components/admin/TrafficTables';
import Link from 'next/link';

export const unstable_instant = false;

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = (await params).locale;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/${locale}/admin`} className="text-sm font-bold text-gray-400 hover:text-brand-pink mb-2 inline-block transition-colors">← Back to Dashboard</Link>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tight">Traffic Analytics</h1>
        </div>
        <div className="bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm text-xs font-bold text-gray-400 uppercase tracking-widest">
          Last 30 Days
        </div>
      </div>

      <Suspense fallback={<div className="h-[400px] bg-slate-100 animate-pulse rounded-[32px]"></div>}>
        <AnalyticsData />
      </Suspense>
    </div>
  );
}

async function AnalyticsData() {
  const [timeseries, topPaths, topCountries] = await Promise.all([
    getAnalyticsTimeseries(30),
    getTopPaths(30),
    getTopCountries(30)
  ]);

  return (
    <>
      <TrafficChart data={timeseries} />
      <TrafficTables topPaths={topPaths} topCountries={topCountries} />
    </>
  );
}
