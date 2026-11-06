import React from 'react';
import { GscStatsResult } from '@/app/actions/admin-vercel';

interface DimensionRow {
  key: string;
  visitors: number;
  pageviews?: number;
}

export function TrafficTables({
  topPaths,
  topCountries,
  topReferrers = [],
  devices = [],
  browsers = [],
  gsc,
}: {
  topPaths: DimensionRow[];
  topCountries: DimensionRow[];
  topReferrers?: DimensionRow[];
  devices?: DimensionRow[];
  browsers?: DimensionRow[];
  gsc?: GscStatsResult;
}) {
  const totalDeviceVisitors = devices.reduce((s, d) => s + (d.visitors || 0), 0);

  return (
    <div className="space-y-8 mt-8">
      {/* Row 1: Top Pages & Top Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Paths */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Top Pages</h3>
              <p className="text-xs font-bold text-gray-400">Live production paths from Vercel Web Analytics</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Visitors</span>
              <span>Views</span>
            </div>
          </div>
          <div className="space-y-3">
            {topPaths.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-700 truncate max-w-[65%] font-mono">
                  {item.key || '/'}
                </span>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-black text-brand-dark w-12 text-right">
                    {(item.visitors || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-400 w-12 text-right">
                    {(item.pageviews ?? item.visitors ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {topPaths.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No page traffic recorded in this window yet.</p>
            )}
          </div>
        </div>

        {/* Top Countries */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">Top Countries</h3>
              <p className="text-xs font-bold text-gray-400">Geographic breakdown of visitors</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
              <span>Visitors</span>
              <span>Views</span>
            </div>
          </div>
          <div className="space-y-3">
            {topCountries.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{getFlagEmoji(item.key)}</span>
                  <span className="text-sm font-bold text-gray-700">{item.key || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-black text-brand-dark w-12 text-right">
                    {(item.visitors || 0).toLocaleString()}
                  </span>
                  <span className="text-xs font-bold text-gray-400 w-12 text-right">
                    {(item.pageviews ?? item.visitors ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
            {topCountries.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No country traffic recorded in this window yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Referrers, Devices & Browsers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Referrers */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">Traffic Sources</h3>
          <p className="text-xs font-bold text-gray-400 mb-6">Referring domains &amp; direct visits</p>
          <div className="space-y-3">
            {topReferrers.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-700 truncate max-w-[70%]">
                  {item.key || 'Direct / Bookmark'}
                </span>
                <span className="text-sm font-black text-brand-dark">
                  {(item.visitors || 0).toLocaleString()}
                </span>
              </div>
            ))}
            {topReferrers.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No referrer data recorded yet.</p>
            )}
          </div>
        </div>

        {/* Devices (Mobile vs Desktop) */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">Devices</h3>
          <p className="text-xs font-bold text-gray-400 mb-6">Mobile vs. desktop player sessions</p>
          <div className="space-y-4">
            {devices.map((item, i) => {
              const pct =
                totalDeviceVisitors > 0
                  ? Math.round(((item.visitors || 0) / totalDeviceVisitors) * 100)
                  : 0;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-700 capitalize">{item.key || 'Unknown'}</span>
                    <span className="font-black text-brand-dark">
                      {item.visitors} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-pink rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {devices.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No device breakdown recorded yet.</p>
            )}
          </div>
        </div>

        {/* Browsers */}
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight mb-1">Browsers</h3>
          <p className="text-xs font-bold text-gray-400 mb-6">Client browsers across visitors</p>
          <div className="space-y-3">
            {browsers.map((item, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-sm font-bold text-gray-700 truncate max-w-[70%]">
                  {item.key || 'Unknown'}
                </span>
                <span className="text-sm font-black text-brand-dark">
                  {(item.visitors || 0).toLocaleString()}
                </span>
              </div>
            ))}
            {browsers.length === 0 && (
              <p className="text-sm text-gray-400 py-4">No browser data recorded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Google Search Console Organic SEO */}
      {gsc && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                  Google Search Console (Organic SEO)
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    gsc.isConnected && !gsc.error
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {gsc.isConnected && !gsc.error ? 'Live Connected' : 'Setup Needed'}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400 mt-1">
                Direct search queries, organic impressions, clicks &amp; ranking positions from Google
              </p>
            </div>
            {gsc.siteUrl && (
              <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                {gsc.siteUrl}
              </span>
            )}
          </div>

          {!gsc.isConnected ? (
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-6">
              <p className="text-sm font-black text-brand-dark mb-1">
                Google Search Console API credentials not detected
              </p>
              <p className="text-xs font-semibold text-gray-500 leading-relaxed mb-4">
                We never display fake search numbers. To stream live organic search queries, impressions, clicks, and average ranking position directly from Google Search Console, add your Service Account credentials to <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200 text-brand-dark">.env.local</code> or Vercel Environment Variables:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono bg-white p-4 rounded-xl border border-gray-200 text-slate-700">
                <div>
                  <span className="font-black text-brand-pink block mb-0.5">1. Site Property</span>
                  GOOGLE_SEARCH_CONSOLE_SITE_URL=&quot;sc-domain:backpocketmysteries.com&quot;
                </div>
                <div>
                  <span className="font-black text-brand-pink block mb-0.5">2. Service Account Email</span>
                  GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL=&quot;...@....iam.gserviceaccount.com&quot;
                </div>
                <div>
                  <span className="font-black text-brand-pink block mb-0.5">3. Private Key</span>
                  GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY=&quot;-----BEGIN PRIVATE KEY-----...&quot;
                </div>
              </div>
            </div>
          ) : gsc.error ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-xs font-bold text-red-600">
              {gsc.error}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Organic Clicks</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">
                    {gsc.totals.clicks.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Impressions</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">
                    {gsc.totals.impressions.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Average CTR</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">
                    {(gsc.totals.ctr * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Avg Position</p>
                  <p className="text-2xl font-black text-brand-dark mt-1">
                    {gsc.totals.position > 0 ? gsc.totals.position.toFixed(1) : '—'}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="py-3 pr-4">Search Query</th>
                      <th className="py-3 px-4 text-right">Clicks</th>
                      <th className="py-3 px-4 text-right">Impressions</th>
                      <th className="py-3 px-4 text-right">CTR</th>
                      <th className="py-3 pl-4 text-right">Avg Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm">
                    {gsc.topQueries.map((q, idx) => (
                      <tr key={idx}>
                        <td className="py-3 pr-4 font-bold text-gray-800">{q.query}</td>
                        <td className="py-3 px-4 text-right font-black text-brand-dark">{q.clicks}</td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-500">
                          {q.impressions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-gray-500">
                          {(q.ctr * 100).toFixed(1)}%
                        </td>
                        <td className="py-3 pl-4 text-right font-bold text-brand-pink">
                          {q.position.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                    {gsc.topQueries.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-400 text-sm">
                          No search queries recorded in this date window.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getFlagEmoji(countryCode: string) {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
