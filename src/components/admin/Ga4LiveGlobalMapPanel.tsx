'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Ga4StatsResult,
  saveGoogleAnalytics4ConfigAction,
} from '@/app/actions/admin-vercel';
import type { LivePresenceSnapshot } from '@/lib/live-presence-store';

interface VercelCountryRow {
  key: string; // ISO-2 e.g. 'GB', 'US', 'AU' or country name
  visitors: number;
  pageviews?: number;
}

interface CountryCoord {
  code: string;
  name: string;
  flag: string;
  lat: number;
  lon: number;
}

const COUNTRY_COORDS: Record<string, CountryCoord> = {
  GB: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lat: 54.0, lon: -2.0 },
  UK: { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lat: 54.0, lon: -2.0 },
  US: { code: 'US', name: 'United States', flag: '🇺🇸', lat: 38.0, lon: -97.0 },
  AU: { code: 'AU', name: 'Australia', flag: '🇦🇺', lat: -25.0, lon: 133.0 },
  CA: { code: 'CA', name: 'Canada', flag: '🇨🇦', lat: 56.0, lon: -106.0 },
  IE: { code: 'IE', name: 'Ireland', flag: '🇮🇪', lat: 53.0, lon: -8.0 },
  NZ: { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', lat: -41.0, lon: 174.0 },
  FR: { code: 'FR', name: 'France', flag: '🇫🇷', lat: 46.0, lon: 2.0 },
  DE: { code: 'DE', name: 'Germany', flag: '🇩🇪', lat: 51.0, lon: 10.0 },
  NL: { code: 'NL', name: 'Netherlands', flag: '🇳🇱', lat: 52.3, lon: 5.3 },
  ES: { code: 'ES', name: 'Spain', flag: '🇪🇸', lat: 40.0, lon: -4.0 },
  IT: { code: 'IT', name: 'Italy', flag: '🇮🇹', lat: 42.8, lon: 12.8 },
  SE: { code: 'SE', name: 'Sweden', flag: '🇸🇪', lat: 62.0, lon: 15.0 },
  NO: { code: 'NO', name: 'Norway', flag: '🇳🇴', lat: 61.0, lon: 8.0 },
  DK: { code: 'DK', name: 'Denmark', flag: '🇩🇰', lat: 56.0, lon: 10.0 },
  CH: { code: 'CH', name: 'Switzerland', flag: '🇨🇭', lat: 47.0, lon: 8.0 },
  BE: { code: 'BE', name: 'Belgium', flag: '🇧🇪', lat: 50.8, lon: 4.5 },
  AT: { code: 'AT', name: 'Austria', flag: '🇦🇹', lat: 47.5, lon: 14.5 },
  PT: { code: 'PT', name: 'Portugal', flag: '🇵🇹', lat: 39.5, lon: -8.0 },
  PL: { code: 'PL', name: 'Poland', flag: '🇵🇱', lat: 52.0, lon: 19.0 },
  SG: { code: 'SG', name: 'Singapore', flag: '🇸🇬', lat: 1.35, lon: 103.8 },
  AE: { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', lat: 24.0, lon: 54.0 },
  ZA: { code: 'ZA', name: 'South Africa', flag: '🇿🇦', lat: -29.0, lon: 24.0 },
  IN: { code: 'IN', name: 'India', flag: '🇮🇳', lat: 21.0, lon: 78.0 },
  JP: { code: 'JP', name: 'Japan', flag: '🇯🇵', lat: 36.0, lon: 138.0 },
  BR: { code: 'BR', name: 'Brazil', flag: '🇧🇷', lat: -14.0, lon: -51.0 },
  MX: { code: 'MX', name: 'Mexico', flag: '🇲🇽', lat: 23.0, lon: -102.0 },
  HK: { code: 'HK', name: 'Hong Kong', flag: '🇭🇰', lat: 22.3, lon: 114.2 },
  FI: { code: 'FI', name: 'Finland', flag: '🇫🇮', lat: 64.0, lon: 26.0 },
  GR: { code: 'GR', name: 'Greece', flag: '🇬🇷', lat: 39.0, lon: 22.0 },
};

const NAME_TO_CODE: Record<string, string> = Object.values(COUNTRY_COORDS).reduce(
  (acc, c) => {
    acc[c.name.toLowerCase()] = c.code;
    return acc;
  },
  {} as Record<string, string>
);

function resolveCountryCoord(codeOrName: string): CountryCoord | null {
  const clean = (codeOrName || '').trim();
  if (!clean) return null;
  const upper = clean.toUpperCase();
  if (COUNTRY_COORDS[upper]) return COUNTRY_COORDS[upper];
  const byName = NAME_TO_CODE[clean.toLowerCase()];
  if (byName && COUNTRY_COORDS[byName]) return COUNTRY_COORDS[byName];
  return null;
}

// Convert lat/lon to equirectangular SVG coordinates (viewBox 0 0 800 380)
function latLonToSvg(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 800;
  const y = ((90 - lat) / 180) * 380;
  return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
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
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

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

  // Total live people on site right now (max of first-party 3-min beacon stream and GA4 30-min realtime stream)
  const liveActiveRightNow = Math.max(
    presence.activeRightNowCount || 0,
    ga4.realtime?.activeUsersLast30Min || 0
  );
  const activeLast30Min = Math.max(
    presence.activeLast30MinCount || 0,
    ga4.realtime?.activeUsersLast30Min || 0
  );

  // Merge GA4 historicalGeo + Vercel topCountries + First-Party Live Sessions onto the World Map
  const mapPins = useMemo(() => {
    const byCode = new Map<
      string,
      {
        coord: CountryCoord;
        visitors: number;
        pageviews: number;
        liveNow: number;
      }
    >();

    // 1. Add GA4 historical geo if available
    for (const row of ga4.historicalGeo || []) {
      const coord =
        resolveCountryCoord(row.countryCode) || resolveCountryCoord(row.country);
      if (!coord) continue;
      const existing = byCode.get(coord.code);
      byCode.set(coord.code, {
        coord,
        visitors: Math.max(existing?.visitors || 0, row.activeUsers || 0),
        pageviews: Math.max(existing?.pageviews || 0, row.pageviews || 0),
        liveNow: existing?.liveNow || 0,
      });
    }

    // 2. Merge Vercel country telemetry
    for (const vRow of vercelCountries || []) {
      const coord = resolveCountryCoord(vRow.key);
      if (!coord) continue;
      const existing = byCode.get(coord.code);
      byCode.set(coord.code, {
        coord,
        visitors: Math.max(existing?.visitors || 0, vRow.visitors || 0),
        pageviews: Math.max(
          existing?.pageviews || 0,
          vRow.pageviews || vRow.visitors || 0
        ),
        liveNow: existing?.liveNow || 0,
      });
    }

    // 3. Overlay GA4 Realtime active users by country
    for (const rt of ga4.realtime?.activeLocations || []) {
      const coord = resolveCountryCoord(rt.country);
      if (!coord) continue;
      const existing = byCode.get(coord.code);
      byCode.set(coord.code, {
        coord,
        visitors: Math.max(existing?.visitors || 0, rt.activeUsers || 0),
        pageviews: existing?.pageviews || rt.activeUsers || 0,
        liveNow: (existing?.liveNow || 0) + (rt.activeUsers || 0),
      });
    }

    // 4. Overlay First-Party Live Visitors
    for (const lv of presence.liveVisitors || []) {
      const coord = resolveCountryCoord(lv.countryCode);
      if (!coord) continue;
      const existing = byCode.get(coord.code);
      byCode.set(coord.code, {
        coord,
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

  const totalGeoVisitors = mapPins.reduce((s, p) => s + p.visitors, 0);
  const maxCountryVisitors = Math.max(1, ...mapPins.map((p) => p.visitors));

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
    <div className="bg-gradient-to-br from-[#0e0a1a] via-[#151026] to-[#1d1433] rounded-[32px] p-7 text-white shadow-xl border border-white/10 space-y-6">
      {/* Top Bar: Live Active Users Indicator + GA4 Status & Setup Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {liveActiveRightNow} Live Right Now • {activeLast30Min} Active (Last 30m)
              </span>
            </span>

            <span className="px-2.5 py-1 rounded-full bg-white/10 text-white/90 text-[10px] font-black uppercase tracking-wider">
              ✓ GA4 Tag Active: {ga4.measurementId || 'G-VW0PRLFNL4'}
            </span>

            <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
              ⚡ First-Party Live Geo Radar Active (15s Refresh)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            Global Audience Map, Live Visitors &amp; Real-Time Journey Radar
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setShowSetupDrawer((prev) => !prev)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold transition flex items-center gap-2"
        >
          <span>{showSetupDrawer ? '✕ Close GA4 Settings' : '⚙️ GA4 API Settings'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between ${
            statusMsg.type === 'ok'
              ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
              : 'bg-rose-500/20 border border-rose-400/40 text-rose-200'
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

      {/* Optional Collapsible GA4 Property ID / Service Account Drawer */}
      {showSetupDrawer && (
        <div className="rounded-2xl bg-white/5 border border-white/15 p-6 space-y-4">
          <div className="text-xs text-white/80">
            Your <strong>GA4 Measurement ID ({ga4.measurementId || 'G-VW0PRLFNL4'})</strong> and{' '}
            <strong>First-Party Live Presence Radar</strong> are already active! Optionally add your
            numeric GA4 Property ID &amp; Service Account JSON if you also want to mirror historical
            GA4 Data API reports.
          </div>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5">
                  1. GA4 Measurement ID *
                </label>
                <input
                  type="text"
                  value={measurementIdInput}
                  onChange={(e) => setMeasurementIdInput(e.target.value)}
                  placeholder="G-VW0PRLFNL4"
                  className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-2.5 text-xs font-mono font-bold text-white focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5">
                  2. GA4 Numeric Property ID (Optional)
                </label>
                <input
                  type="text"
                  value={propertyIdInput}
                  onChange={(e) => setPropertyIdInput(e.target.value)}
                  placeholder="e.g. 482910384"
                  className="w-full rounded-xl bg-black/40 border border-white/20 px-4 py-2.5 text-xs font-mono font-bold text-white focus:border-brand-pink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/60 mb-1.5">
                3. Google Service Account JSON (Optional)
              </label>
              <textarea
                rows={3}
                value={serviceAccountInput}
                onChange={(e) => setServiceAccountInput(e.target.value)}
                placeholder='{"type": "service_account", "client_email": "...", "private_key": "..."}'
                className="w-full rounded-xl bg-black/40 border border-white/20 p-3 text-xs font-mono text-white/90 focus:border-brand-pink focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSetupDrawer(false)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg"
              >
                {isSaving ? 'Saving...' : 'Save Settings →'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Content Grid: Interactive Global World Map (Left 7 Cols) + Live Visitors & Country Leaderboard (Right 5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Interactive Global World Map */}
        <div className="lg:col-span-7 rounded-2xl bg-[#090612] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 z-10 mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
              Global Visitor Map ({days}d • {totalGeoVisitors.toLocaleString()} Visitors Across{' '}
              {mapPins.length} Countries)
            </span>
            {selectedCountryCode && (
              <button
                type="button"
                onClick={() => setSelectedCountryCode(null)}
                className="text-[10px] font-bold text-brand-pink hover:underline"
              >
                Reset Selection
              </button>
            )}
          </div>

          {/* Equirectangular World Map SVG with Latitude/Longitude Grid, Continent Silhouettes, Country Bubbles & Exact City Pins */}
          <div className="relative w-full aspect-[800/380] my-auto">
            <svg
              viewBox="0 0 800 380"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Subtle Lat/Lon Grid */}
              <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
                {[95, 190, 285].map((y) => (
                  <line key={`lat-${y}`} x1="0" y1={y} x2="800" y2={y} strokeDasharray="3 3" />
                ))}
                {[160, 320, 400, 480, 640].map((x) => (
                  <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="380" strokeDasharray="3 3" />
                ))}
              </g>

              {/* Stylized Continent Silhouettes */}
              <g fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.12)" strokeWidth="1">
                {/* North America */}
                <path d="M 65 45 L 220 35 L 275 85 L 235 155 L 185 180 L 145 160 L 95 110 Z" />
                {/* South America */}
                <path d="M 215 195 L 285 215 L 305 275 L 260 355 L 225 320 L 205 240 Z" />
                {/* Europe & UK */}
                <path d="M 370 55 L 475 45 L 495 110 L 435 128 L 372 118 Z" />
                {/* Africa */}
                <path d="M 375 140 L 465 140 L 505 210 L 470 315 L 420 315 L 395 230 L 362 185 Z" />
                {/* Asia */}
                <path d="M 495 45 L 710 55 L 735 145 L 655 195 L 560 185 L 500 130 Z" />
                {/* Australia & NZ */}
                <path d="M 635 245 L 730 245 L 745 315 L 665 325 L 630 290 Z" />
              </g>

              {/* Glowing Country Visitor Bubbles */}
              {mapPins.map((pin) => {
                const { x, y } = latLonToSvg(pin.coord.lat, pin.coord.lon);
                const ratio = pin.visitors / maxCountryVisitors;
                const radius = Math.max(5, Math.min(20, 6 + ratio * 14));
                const isSelected = selectedCountryCode === pin.coord.code;
                const hasLive = pin.liveNow > 0;

                return (
                  <g
                    key={pin.coord.code}
                    className="cursor-pointer group"
                    onClick={() =>
                      setSelectedCountryCode(isSelected ? null : pin.coord.code)
                    }
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={radius + 6}
                      fill={hasLive ? 'rgba(16, 185, 129, 0.28)' : 'rgba(255, 45, 85, 0.22)'}
                      className="animate-pulse"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r={radius}
                      fill={hasLive ? '#10b981' : '#ff2d55'}
                      stroke="#ffffff"
                      strokeWidth={isSelected ? 2.5 : 1.2}
                    />
                    <text
                      x={x}
                      y={y - radius - 5}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="800"
                    >
                      {pin.coord.code} ({pin.visitors})
                    </text>
                  </g>
                );
              })}

              {/* Exact City Geo-Pins (from Vercel Lat/Lon headers) */}
              {(presence.cityPins || []).slice(0, 15).map((cp) => {
                const { x, y } = latLonToSvg(cp.lat, cp.lon);
                return (
                  <g key={cp.key}>
                    <circle
                      cx={x}
                      cy={y}
                      r={3.5}
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth={1}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-white/60">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-pink inline-block" />
                <span>Country Visitors ({days}d)</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Live Active Visitors Right Now</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
                <span>City Lat/Lon Pins</span>
              </span>
            </div>
            <span>Click any country pin to inspect</span>
          </div>
        </div>

        {/* Right Column: Live Active Visitors Feed + Country Leaderboard */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Live Right Now Card */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                🟢 Live Visitors on Site (Real-Time Stream)
              </span>
              <span className="text-xl font-black text-white">
                {liveActiveRightNow} Live Now
              </span>
            </div>

            {presence.recentVisitors30m && presence.recentVisitors30m.length > 0 ? (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {presence.recentVisitors30m.slice(0, 6).map((v) => {
                  const coord = resolveCountryCoord(v.countryCode);
                  const isLiveNow = Date.now() - v.lastSeenAt <= 3 * 60 * 1000;
                  return (
                    <div
                      key={v.sessionId}
                      className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-white/5 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 font-bold text-white truncate">
                          <span>{coord?.flag || '🌍'}</span>
                          <span>
                            {v.city ? `${v.city}, ${v.countryCode}` : coord?.name || v.countryCode}
                          </span>
                          <span className="text-[10px] text-white/50">• {v.device}</span>
                          <span className="text-[10px] text-indigo-300">• {v.referrerSource}</span>
                        </div>
                        <div className="text-[11px] text-white/60 truncate font-mono">
                          {v.stageLabel} ({v.path})
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                          isLiveNow
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {isLiveNow ? '● LIVE' : formatTimeAgo(v.lastSeenAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : ga4.realtime?.activeLocations?.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {ga4.realtime.activeLocations.slice(0, 5).map((loc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0"
                  >
                    <span className="font-bold text-white/90 truncate">
                      {loc.city && loc.city !== '(not set)'
                        ? `${loc.city}, ${loc.country}`
                        : loc.country}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black">
                      {loc.activeUsers} live
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/60 leading-relaxed">
                Listening for live customer visits (your own admin device is excluded so only real
                customer sessions appear here in real time).
              </p>
            )}
          </div>

          {/* Top Global Countries Breakdown */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Top Countries ({days} Days)
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                Visitors &amp; Share
              </span>
            </div>

            {mapPins.length === 0 ? (
              <p className="text-xs text-white/50 py-6 text-center">
                No geographic visitor data recorded yet for this window.
              </p>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {mapPins.slice(0, 8).map((pin) => {
                  const pct =
                    totalGeoVisitors > 0
                      ? Math.round((pin.visitors / totalGeoVisitors) * 100)
                      : 0;
                  const isSelected = selectedCountryCode === pin.coord.code;
                  return (
                    <button
                      key={pin.coord.code}
                      type="button"
                      onClick={() =>
                        setSelectedCountryCode(isSelected ? null : pin.coord.code)
                      }
                      className={`w-full text-left p-2 rounded-xl transition flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-brand-pink/25 border border-brand-pink'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-base">{pin.coord.flag}</span>
                        <span className="text-xs font-bold text-white truncate">
                          {pin.coord.name}
                        </span>
                        {pin.liveNow > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                            {pin.liveNow} live
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-black text-white">
                          {pin.visitors.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-bold text-white/50 w-9 text-right">
                          {pct}%
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Strip: 5-Stage Customer Journey & Live Party Radar */}
      <div className="pt-4 border-t border-white/10">
        <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-2.5">
          Live Customer Journey &amp; Active Party Funnel
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {[
            {
              key: 'browsing',
              label: '1. Browsing & Blogs',
              sub: 'Landing, /blog & info',
              count: presence.funnelCounts?.browsing || 0,
            },
            {
              key: 'inspecting_mystery',
              label: '2. Exploring Packs',
              sub: '/themes & /mysteries',
              count: presence.funnelCounts?.inspecting_mystery || 0,
            },
            {
              key: 'checkout',
              label: '3. In Checkout',
              sub: '/checkout & /subscribe',
              count: presence.funnelCounts?.checkout || 0,
            },
            {
              key: 'casting_or_prep',
              label: '4. Casting & Prep',
              sub: '/cast & Guest Invites',
              count: presence.funnelCounts?.casting_or_prep || 0,
            },
            {
              key: 'live_playroom',
              label: '5. Live Mystery Parties',
              sub: '/play/[id] In Progress',
              count: presence.funnelCounts?.live_playroom || 0,
            },
          ].map((st) => {
            const liveInStage = (presence.liveVisitors || []).filter(
              (v) => v.stage === st.key
            ).length;
            return (
              <div
                key={st.key}
                className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black text-white">{st.label}</span>
                  {liveInStage > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black">
                      {liveInStage} live
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-[10px] text-white/50">{st.sub}</span>
                  <span className="text-sm font-black text-white/90">{st.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
