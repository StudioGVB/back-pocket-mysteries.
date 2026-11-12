'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GscStatsResult,
  saveGoogleSearchConsoleConfigAction,
} from '@/app/actions/admin-vercel';

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
  const router = useRouter();
  const totalDeviceVisitors = devices.reduce((s, d) => s + (d.visitors || 0), 0);

  const [showSetupForm, setShowSetupForm] = useState(false);
  const [siteUrlInput, setSiteUrlInput] = useState(
    gsc?.siteUrl || 'sc-domain:backpocketmysteries.com'
  );
  const [jsonOrEmailInput, setJsonOrEmailInput] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [isSavingGsc, setIsSavingGsc] = useState(false);
  const [gscFormMsg, setGscFormMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const handleSaveGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGsc(true);
    setGscFormMsg(null);
    const res = await saveGoogleSearchConsoleConfigAction({
      siteUrl: siteUrlInput,
      serviceAccountJsonOrEmail: jsonOrEmailInput,
      privateKey: privateKeyInput,
    });
    setIsSavingGsc(false);
    if (res.ok) {
      setGscFormMsg({
        type: 'ok',
        text: 'Google Search Console credentials saved! Refreshing live search data...',
      });
      setShowSetupForm(false);
      router.refresh();
    } else {
      setGscFormMsg({
        type: 'err',
        text: res.error || 'Could not save credentials.',
      });
    }
  };

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
            <div className="flex items-center gap-2">
              {gsc.siteUrl && (
                <span className="text-xs font-mono font-bold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                  {gsc.siteUrl}
                </span>
              )}
              <button
                type="button"
                onClick={() => setShowSetupForm((v) => !v)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {gsc.isConnected && !gsc.error ? '⚙️ Update Credentials' : '🔌 Connect Search Console'}
              </button>
            </div>
          </div>

          {gscFormMsg && (
            <div
              className={`mb-6 p-4 rounded-2xl text-xs font-bold border ${
                gscFormMsg.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}
            >
              {gscFormMsg.text}
            </div>
          )}

          {(!gsc.isConnected || showSetupForm) && (
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-6 mb-6 space-y-5">
              <div>
                <p className="text-sm font-black text-brand-dark mb-1">
                  Connect Google Search Console (Takes 60 Seconds)
                </p>
                <p className="text-xs font-semibold text-gray-600 leading-relaxed">
                  Paste your Google Cloud Service Account JSON file below (or add <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON</code> in Vercel). Remember to add the Service Account&apos;s <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">client_email</code> as a <strong>Read-Only User</strong> in <strong>Google Search Console → Settings → Users and permissions</strong> for <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-gray-200">backpocketmysteries.com</code>.
                </p>
              </div>

              <form onSubmit={handleSaveGsc} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    1. Search Console Property URL
                  </label>
                  <input
                    type="text"
                    value={siteUrlInput}
                    onChange={(e) => setSiteUrlInput(e.target.value)}
                    placeholder="sc-domain:backpocketmysteries.com or https://backpocketmysteries.com/"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-brand-pink"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    2. Paste Full Service Account JSON (or Service Account Email)
                  </label>
                  <textarea
                    rows={4}
                    value={jsonOrEmailInput}
                    onChange={(e) => setJsonOrEmailInput(e.target.value)}
                    placeholder='Paste the entire {"type": "service_account", "client_email": "...", "private_key": "..."} JSON here...'
                    className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-pink"
                  />
                </div>

                {!jsonOrEmailInput.trim().startsWith('{') && jsonOrEmailInput.trim().length > 0 && (
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                      3. Private Key (only needed if you entered email instead of full JSON above)
                    </label>
                    <textarea
                      rows={3}
                      value={privateKeyInput}
                      onChange={(e) => setPrivateKeyInput(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----\n..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-brand-pink"
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  {showSetupForm && (
                    <button
                      type="button"
                      onClick={() => setShowSetupForm(false)}
                      className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-black uppercase tracking-widest cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSavingGsc || !jsonOrEmailInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-dark text-white text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingGsc ? 'Connecting...' : '✓ Save & Connect Search Console'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {gsc.isConnected && gsc.error ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-xs font-bold text-red-600">
              {gsc.error}
            </div>
          ) : gsc.isConnected ? (
            <div className="space-y-8">
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="overflow-x-auto">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark mb-3">
                    Top Organic Search Queries
                  </h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="py-3 pr-4">Search Query</th>
                        <th className="py-3 px-3 text-right">Clicks</th>
                        <th className="py-3 px-3 text-right">Impr.</th>
                        <th className="py-3 pl-3 text-right">Pos.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {gsc.topQueries.map((q, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 pr-4 font-bold text-gray-800">{q.query}</td>
                          <td className="py-2.5 px-3 text-right font-black text-brand-dark">{q.clicks}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-500">
                            {q.impressions.toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-bold text-brand-pink">
                            {q.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      {gsc.topQueries.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                            No search queries recorded in this date window yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="overflow-x-auto">
                  <h4 className="text-xs font-black uppercase tracking-widest text-brand-dark mb-3">
                    Top Organic Landing Pages
                  </h4>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <th className="py-3 pr-4">Landing Page</th>
                        <th className="py-3 px-3 text-right">Clicks</th>
                        <th className="py-3 px-3 text-right">Impr.</th>
                        <th className="py-3 pl-3 text-right">Pos.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 text-sm">
                      {(gsc.topPages || []).map((p, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 pr-4 font-mono text-xs font-bold text-gray-700 truncate max-w-[220px]">
                            {p.page.replace(/^https?:\/\/[^/]+/, '') || '/'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-brand-dark">{p.clicks}</td>
                          <td className="py-2.5 px-3 text-right font-semibold text-gray-500">
                            {p.impressions.toLocaleString()}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-bold text-brand-pink">
                            {p.position.toFixed(1)}
                          </td>
                        </tr>
                      ))}
                      {(!gsc.topPages || gsc.topPages.length === 0) && (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                            No organic page impressions recorded in this window yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
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
