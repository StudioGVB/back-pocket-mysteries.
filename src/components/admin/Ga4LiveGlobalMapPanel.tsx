'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ga4StatsResult,
  saveGoogleAnalytics4ConfigAction,
} from '@/app/actions/admin-vercel';
import type { LivePresenceSnapshot } from '@/lib/live-presence-store';

interface VercelCountryRow {
  key: string;
  visitors: number;
  pageviews?: number;
}

interface CountryMeta {
  code: string;
  name: string;
  flag: string;
  region: string;
}

const COUNTRY_META: Record<string, CountryMeta> = {
  GB: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  UK: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'Europe' },
  US: { code: 'US', name: 'United States', flag: '🇺🇸', region: 'North America' },
  AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', region: 'Oceania' },
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', region: 'North America' },
  IE: { code: 'IE', name: 'Ireland', flag: '🇮🇪', region: 'Europe' },
  NZ: { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', region: 'Oceania' },
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', region: 'Europe' },
  DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', region: 'Europe' },
  NL: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', region: 'Europe' },
  ES: { code: 'ES', name: 'Spain', flag: '🇪🇸', region: 'Europe' },
  IT: { code: 'IT', name: 'Italy', flag: '🇮🇹', region: 'Europe' },
  SE: { code: 'SE', name: 'Sweden', flag: '🇸🇪', region: 'Europe' },
  NO: { code: 'NO', name: 'Norway', flag: '🇳🇴', region: 'Europe' },
  DK: { code: 'DK', name: 'Denmark', flag: '🇩🇰', region: 'Europe' },
  CH: { code: 'CH', name: 'Switzerland', flag: '🇨🇭', region: 'Europe' },
  BE: { code: 'BE', name: 'Belgium', flag: '🇧🇪', region: 'Europe' },
  AT: { code: 'AT', name: 'Austria', flag: '🇦🇹', region: 'Europe' },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', region: 'Europe' },
  PL: { code: 'PL', name: 'Poland', flag: '🇵🇱', region: 'Europe' },
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', region: 'Asia-Pacific' },
  AE: { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', region: 'Middle East' },
  ZA: { code: 'ZA', name: 'South Africa', flag: '🇿🇦', region: 'Africa' },
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', region: 'Asia-Pacific' },
  JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', region: 'Asia-Pacific' },
  BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', region: 'South America' },
  MX: { code: 'MX', name: 'Mexico', flag: '🇲🇽', region: 'North America' },
  HK: { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', region: 'Asia-Pacific' },
  FI: { code: 'FI', name: 'Finland', flag: '🇫🇮', region: 'Europe' },
  GR: { code: 'GR', name: 'Greece', flag: '🇬🇷', region: 'Europe' },
};

const NAME_TO_CODE: Record<string, string> = Object.values(COUNTRY_META).reduce(
  (acc, c) => {
    acc[c.name.toLowerCase()] = c.code;
    return acc;
  },
  {} as Record<string, string>
);

function resolveCountryMeta(codeOrName: string): CountryMeta | null {
  const clean = (codeOrName || '').trim();
  if (!clean) return null;
  const upper = clean.toUpperCase();
  if (COUNTRY_META[upper]) return COUNTRY_META[upper];
  const byName = NAME_TO_CODE[clean.toLowerCase()];
  if (byName && COUNTRY_META[byName]) return COUNTRY_META[byName];
  return {
    code: upper.slice(0, 2),
    name: clean,
    flag: '🌍',
    region: 'International',
  };
}

function formatTimeAgo(ts: number): string {
  const sec = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const mins = Math.floor(sec / 60);
  return `${mins}m ago`;
}

export function Ga4LiveGlobalMapPanel({
  ga4,
  vercelCountries,
  initialPresence,
  days,
}: {
  ga4: Ga4StatsResult;
  vercelCountries: VercelCountryRow[];
  initialPresence: LivePresenceSnapshot;
  days: number;
}) {
  const router = useRouter();
  const [presence, setPresence] = useState<LivePresenceSnapshot>(initialPresence);
  const [showSetupDrawer, setShowSetupDrawer] = useState(false);

  const [measurementIdInput, setMeasurementIdInput] = useState(
    ga4.measurementId || 'G-VW0PRLFNL4'
  );
  const [propertyIdInput, setPropertyIdInput] = useState(
    ga4.propertyId || '534443990'
  );
  const [serviceAccountInput, setServiceAccountInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Auto-poll /api/analytics/presence every 15s for real-time live visitor stream
  useEffect(() => {
    const poll = () => {
      void fetch('/api/analytics/presence', { cache: 'no-store' })
        .then((r) => r.json())
        .then((res) => {
          if (res?.ok && res.snapshot) {
            setPresence(res.snapshot);
          }
        })
        .catch(() => {});
    };
    const interval = window.setInterval(poll, 15000);
    return () => window.clearInterval(interval);
  }, []);

  const liveActiveRightNow = Math.max(
    presence.activeRightNowCount || 0,
    ga4.realtime?.activeUsersLast30Min || 0
  );
  const activeLast30Min = Math.max(
    presence.activeLast30MinCount || 0,
    ga4.realtime?.activeUsersLast30Min || 0
  );

  const countriesList = useMemo(() => {
    const byCode = new Map<
      string,
      {
        meta: CountryMeta;
        visitors: number;
        pageviews: number;
        liveNow: number;
      }
    >();

    for (const row of ga4.historicalGeo || []) {
      const meta =
        resolveCountryMeta(row.countryCode) || resolveCountryMeta(row.country);
      if (!meta) continue;
      const existing = byCode.get(meta.code);
      byCode.set(meta.code, {
        meta,
        visitors: Math.max(existing?.visitors || 0, row.activeUsers || 0),
        pageviews: Math.max(existing?.pageviews || 0, row.pageviews || 0),
        liveNow: existing?.liveNow || 0,
      });
    }

    for (const vRow of vercelCountries || []) {
      const meta = resolveCountryMeta(vRow.key);
      if (!meta) continue;
      const existing = byCode.get(meta.code);
      byCode.set(meta.code, {
        meta,
        visitors: Math.max(existing?.visitors || 0, vRow.visitors || 0),
        pageviews: Math.max(
          existing?.pageviews || 0,
          vRow.pageviews || vRow.visitors || 0
        ),
        liveNow: existing?.liveNow || 0,
      });
    }

    for (const rt of ga4.realtime?.activeLocations || []) {
      const meta = resolveCountryMeta(rt.country);
      if (!meta) continue;
      const existing = byCode.get(meta.code);
      byCode.set(meta.code, {
        meta,
        visitors: Math.max(existing?.visitors || 0, rt.activeUsers || 0),
        pageviews: existing?.pageviews || rt.activeUsers || 0,
        liveNow: (existing?.liveNow || 0) + (rt.activeUsers || 0),
      });
    }

    for (const lv of presence.liveVisitors || []) {
      const meta = resolveCountryMeta(lv.countryCode);
      if (!meta) continue;
      const existing = byCode.get(meta.code);
      byCode.set(meta.code, {
        meta,
        visitors: Math.max(existing?.visitors || 0, 1),
        pageviews: Math.max(existing?.pageviews || 0, 1),
        liveNow: (existing?.liveNow || 0) + 1,
      });
    }

    return Array.from(byCode.values()).sort((a, b) => b.visitors - a.visitors);
  }, [
    ga4.historicalGeo,
    ga4.realtime?.activeLocations,
    vercelCountries,
    presence.liveVisitors,
  ]);

  const totalGeoVisitors = countriesList.reduce((s, p) => s + p.visitors, 0);
  const maxCountryVisitors = Math.max(1, ...countriesList.map((p) => p.visitors));

  // Group by region for a quick top summary bar
  const regionTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of countriesList) {
      map.set(c.meta.region, (map.get(c.meta.region) || 0) + c.visitors);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [countriesList]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await saveGoogleAnalytics4ConfigAction({
        measurementId: measurementIdInput,
        propertyId: propertyIdInput,
        serviceAccountJsonOrEmail: serviceAccountInput,
      });
      if (!res.ok) {
        setStatusMsg({
          type: 'err',
          text: res.error || 'Could not save Google Analytics settings.',
        });
      } else {
        setStatusMsg({
          type: 'ok',
          text: 'Google Analytics 4 settings saved!',
        });
        setShowSetupDrawer(false);
        router.refresh();
      }
    } catch (err: any) {
      setStatusMsg({
        type: 'err',
        text: err?.message || 'Error saving Google Analytics config.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-[32px] p-6 sm:p-8 border border-slate-200/80 shadow-sm space-y-6">
      {/* Clean Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                liveActiveRightNow > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  liveActiveRightNow > 0 ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                }`}
              />
              <span>
                {liveActiveRightNow} Live Now • {activeLast30Min} Active (Last 30m)
              </span>
            </span>

            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
              GA4: {ga4.measurementId || 'G-VW0PRLFNL4'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-brand-dark uppercase tracking-tight">
            Global Audience &amp; Real-Time Visitor Activity
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowSetupDrawer((prev) => !prev)}
          className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
        >
          {showSetupDrawer ? '✕ Close GA4 Settings' : '⚙️ GA4 Settings'}
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <span>{statusMsg.text}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="text-[10px] font-black uppercase underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Optional Collapsible GA4 Settings Drawer */}
      {showSetupDrawer && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 space-y-4">
          <div className="text-xs text-slate-600">
            Your <strong>GA4 Measurement ID ({ga4.measurementId || 'G-VW0PRLFNL4'})</strong> is active. Optionally add your numeric GA4 Property ID &amp; Service Account JSON if you want to pull historical GA4 Data API reports directly.
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  1. GA4 Measurement ID *
                </label>
                <input
                  type="text"
                  value={measurementIdInput}
                  onChange={(e) => setMeasurementIdInput(e.target.value)}
                  placeholder="G-VW0PRLFNL4"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  2. GA4 Numeric Property ID (Optional)
                </label>
                <input
                  type="text"
                  value={propertyIdInput}
                  onChange={(e) => setPropertyIdInput(e.target.value)}
                  placeholder="e.g. 534443990"
                  className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:border-brand-pink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                3. Google Service Account JSON (Optional)
              </label>
              <textarea
                rows={3}
                value={serviceAccountInput}
                onChange={(e) => setServiceAccountInput(e.target.value)}
                placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                className="w-full rounded-xl bg-white border border-slate-200 p-3 text-xs font-mono text-slate-800 focus:border-brand-pink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSetupDrawer(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-dark disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save Settings →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main 2-Column Layout: Clean Country Distribution Bars (Left 7 Cols) + Live Feed & Journey Funnel (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Visitors by Country & Region */}
        <div className="lg:col-span-7 rounded-2xl bg-slate-50/80 border border-slate-200/80 p-5 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                Geographic Reach ({days} Days)
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {totalGeoVisitors.toLocaleString()} Visitors Across {countriesList.length}{' '}
                {countriesList.length === 1 ? 'Country' : 'Countries'}
              </h3>
            </div>

            {/* Region summary pills */}
            {regionTotals.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {regionTotals.slice(0, 3).map(([region, count]) => {
                  const pct =
                    totalGeoVisitors > 0 ? Math.round((count / totalGeoVisitors) * 100) : 0;
                  return (
                    <span
                      key={region}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-700"
                    >
                      {region}: <strong className="text-slate-950">{pct}%</strong>
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {countriesList.length === 0 ? (
            <div className="py-10 text-center text-xs font-semibold text-slate-400">
              No geographic visitor data recorded yet for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {countriesList.slice(0, 8).map((item) => {
                const pct =
                  totalGeoVisitors > 0
                    ? Math.round((item.visitors / totalGeoVisitors) * 100)
                    : 0;
                const barWidth = Math.max(
                  6,
                  Math.round((item.visitors / maxCountryVisitors) * 100)
                );

                return (
                  <div
                    key={item.meta.code}
                    className="rounded-xl bg-white border border-slate-200/80 px-4 py-3 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-lg leading-none">{item.meta.flag}</span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.meta.name}
                        </span>
                        <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold">
                          {item.meta.region}
                        </span>
                        {item.liveNow > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                            ● {item.liveNow} live
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span className="text-xs font-black text-slate-900">
                          {item.visitors.toLocaleString()}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 w-9 text-right">
                          {pct}%
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-pink rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 5 Cols: Real-Time Active Visitors + 5-Stage Customer Journey Funnel */}
        <div className="lg:col-span-5 space-y-5">
          {/* Live Visitors Card */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                🟢 Live Customer Sessions
              </span>
              <span className="text-base font-black text-slate-900">
                {liveActiveRightNow} Live Now
              </span>
            </div>

            {presence.recentVisitors30m && presence.recentVisitors30m.length > 0 ? (
              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                {presence.recentVisitors30m.slice(0, 6).map((v) => {
                  const meta = resolveCountryMeta(v.countryCode);
                  const isLiveNow = Date.now() - v.lastSeenAt <= 3 * 60 * 1000;
                  return (
                    <div
                      key={v.sessionId}
                      className="rounded-xl bg-white border border-slate-200/80 p-3 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 truncate">
                          <span>{meta?.flag || '🌍'}</span>
                          <span>
                            {v.city ? `${v.city}, ${v.countryCode}` : meta?.name || v.countryCode}
                          </span>
                          <span className="text-[10px] text-slate-400">• {v.device}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate font-mono mt-0.5">
                          {v.stageLabel} ({v.path})
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isLiveNow
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isLiveNow ? '● LIVE' : formatTimeAgo(v.lastSeenAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl bg-white border border-slate-200/80 p-4 text-xs text-slate-500 font-medium leading-relaxed">
                No active customer sessions in the last 3 minutes. (Your own laptop and phone are excluded so only real customer visits appear here.)
              </div>
            )}
          </div>

          {/* 5-Stage Customer Journey Funnel */}
          <div className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Active Customer Journey Funnel (Last 30m)
              </span>
            </div>

            <div className="space-y-2">
              {[
                {
                  key: 'browsing',
                  label: '1. Browsing & Blogs',
                  sub: 'Homepage, /blog & info pages',
                  count: presence.funnelCounts?.browsing || 0,
                },
                {
                  key: 'inspecting_mystery',
                  label: '2. Exploring Mystery Themes',
                  sub: '/themes & /mysteries',
                  count: presence.funnelCounts?.inspecting_mystery || 0,
                },
                {
                  key: 'checkout',
                  label: '3. In Checkout',
                  sub: '/create & payment flow',
                  count: presence.funnelCounts?.checkout || 0,
                },
                {
                  key: 'casting_or_prep',
                  label: '4. Casting & Guest RSVPs',
                  sub: '/cast & Pre-Party Host Hub',
                  count: presence.funnelCounts?.casting_or_prep || 0,
                },
                {
                  key: 'live_playroom',
                  label: '5. Live Mystery Parties',
                  sub: '/play/[id] in progress',
                  count: presence.funnelCounts?.live_playroom || 0,
                },
              ].map((st) => {
                const liveInStage = (presence.liveVisitors || []).filter(
                  (v) => v.stage === st.key
                ).length;
                return (
                  <div
                    key={st.key}
                    className="rounded-xl bg-white border border-slate-200/80 px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-black text-slate-900">{st.label}</div>
                      <div className="text-[10px] font-medium text-slate-400">{st.sub}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {liveInStage > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                          {liveInStage} live
                        </span>
                      )}
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 text-xs font-black flex items-center justify-center">
                        {st.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
