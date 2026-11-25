'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Bell, Users, Mail, Check, ArrowRight, Sparkles, Calendar } from 'lucide-react';
import { markAdminSectionSeenAction } from '@/app/[locale]/(admin)/admin/admin-data';

export interface PeriodCounts {
  today: number;
  week: number;
  month: number;
  quarter: number;
  year: number;
  allTime: number;
}

export interface UnseenCustomerPreview {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface UnseenLeadPreview {
  id: string;
  name: string;
  email: string;
  vip_rank?: number;
  country?: string | null;
  created_at: string;
}

interface DashboardSignupsWidgetProps {
  newUsersCount: number;
  newLeadsCount: number;
  unseenCustomers: UnseenCustomerPreview[];
  unseenLeads: UnseenLeadPreview[];
  customerPeriods: PeriodCounts;
  leadPeriods: PeriodCounts;
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'year' | 'allTime';

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string; shortLabel: string }> = [
  { key: 'week', label: 'This Week (7d)', shortLabel: 'This Week' },
  { key: 'month', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: 'quarter', label: 'Last 90 Days', shortLabel: '90 Days' },
  { key: 'year', label: 'This Year', shortLabel: 'This Year' },
  { key: 'allTime', label: 'All Time', shortLabel: 'All Time' },
];

function formatTimeAgo(iso?: string): string {
  if (!iso) return 'Recently';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'Recently';
  const diffMins = Math.max(1, Math.floor((Date.now() - ms) / 60000));
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function DashboardSignupsWidget({
  newUsersCount,
  newLeadsCount,
  unseenCustomers,
  unseenLeads,
  customerPeriods,
  leadPeriods,
}: DashboardSignupsWidgetProps) {
  const initialHasUrgency = newUsersCount > 0 || newLeadsCount > 0;
  const [isUrgent, setIsUrgent] = useState(initialHasUrgency);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('week');

  const persistDashboardSeen = useCallback(() => {
    const nowIso = new Date().toISOString();
    if (typeof window !== 'undefined') {
      const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `admin_dashboard_last_view=${encodeURIComponent(nowIso)};expires=${expires};path=/`;
      try {
        window.localStorage.setItem('bpm_admin_dashboard_last_view', nowIso);
      } catch {}
      window.dispatchEvent(
        new CustomEvent('bpm:admin-section-seen', { detail: { section: 'dashboard' } })
      );
    }
    markAdminSectionSeenAction('dashboard', nowIso).catch(() => {});
  }, []);

  // Automatically record that the dashboard has been viewed so next visit has 0 urgency,
  // and soften the urgency on-screen after the admin has had 8 seconds to read the alert
  useEffect(() => {
    const recordTimer = setTimeout(() => {
      persistDashboardSeen();
    }, 1200);

    let calmTimer: ReturnType<typeof setTimeout> | null = null;
    if (initialHasUrgency) {
      calmTimer = setTimeout(() => {
        setIsUrgent(false);
      }, 9000);
    }

    return () => {
      clearTimeout(recordTimer);
      if (calmTimer) clearTimeout(calmTimer);
    };
  }, [initialHasUrgency, persistDashboardSeen]);

  const handleDismissUrgency = () => {
    setIsUrgent(false);
    persistDashboardSeen();
  };

  const activePeriodMeta =
    PERIOD_OPTIONS.find((p) => p.key === selectedPeriod) || PERIOD_OPTIONS[0];

  return (
    <div
      className={`rounded-[32px] border transition-all duration-500 p-6 sm:p-8 ${
        isUrgent
          ? 'bg-gradient-to-br from-[#191022] via-[#1e1329] to-[#140d18] text-white border-brand-pink/50 shadow-xl shadow-brand-pink/10'
          : 'bg-white text-brand-dark border-gray-100 shadow-sm'
      }`}
    >
      {/* Top Header Row: Title + Urgent Alert Pill (or Calm Status) + Period Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-current/10">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {isUrgent ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-pink/30">
                <Bell className="w-3 h-3 animate-bounce" />
                New Sign-Up Activity
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                <Calendar className="w-3 h-3 text-brand-pink" />
                Community &amp; Newsletter Growth
              </span>
            )}

            {isUrgent && (
              <button
                type="button"
                onClick={handleDismissUrgency}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                Viewed · Clear Alert
              </button>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            {isUrgent ? (
              <>
                You Have{' '}
                <span className="text-brand-pink">
                  {newUsersCount + newLeadsCount} New Sign-Up
                  {newUsersCount + newLeadsCount === 1 ? '' : 's'}
                </span>{' '}
                Since Your Last Visit
              </>
            ) : (
              <>
                Customer Sign-Ups &amp;{' '}
                <span className="text-brand-pink italic">Newsletter Subscribers</span>
              </>
            )}
          </h3>
        </div>

        {/* Period Selector Pills (This Week, 30 Days, 90 Days, This Year, All Time) */}
        <div
          className={`inline-flex flex-wrap p-1 rounded-2xl border gap-1 self-start lg:self-center ${
            isUrgent
              ? 'bg-white/5 border-white/10'
              : 'bg-slate-50 border-slate-200/80'
          }`}
        >
          {PERIOD_OPTIONS.map((opt) => {
            const active = selectedPeriod === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setSelectedPeriod(opt.key);
                  if (isUrgent) handleDismissUrgency();
                }}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-pink text-white shadow-sm'
                    : isUrgent
                    ? 'text-slate-300 hover:text-white hover:bg-white/10'
                    : 'text-slate-500 hover:text-brand-dark hover:bg-white'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Urgent Recent Sign-Ups Strip (Automatically disappears once viewed) */}
      {isUrgent && (unseenCustomers.length > 0 || unseenLeads.length > 0) && (
        <div className="mt-5 p-4 rounded-2xl bg-white/[0.06] border border-brand-pink/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-pink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Just Joined Since You Last Checked the Dashboard
            </p>
            <span className="text-[10px] text-slate-400 font-semibold">
              Alert clears automatically after viewing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unseenCustomers.slice(0, 2).map((c) => (
              <Link
                key={c.id}
                href={`/en/admin/users/${c.id}`}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest">
                      New Account
                    </span>
                    <p className="text-xs font-black text-white truncate">{c.name}</p>
                  </div>
                  {c.email && (
                    <p className="text-[11px] text-slate-300 truncate mt-0.5">{c.email}</p>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(c.created_at)} →
                </span>
              </Link>
            ))}

            {unseenLeads.slice(0, 2).map((l) => (
              <Link
                key={l.id}
                href="/en/admin/leads"
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-brand-pink/25 text-brand-pink text-[9px] font-black uppercase tracking-widest">
                      {l.vip_rank && l.vip_rank <= 50 ? `VIP #${l.vip_rank}` : 'Newsletter'}
                    </span>
                    <p className="text-xs font-black text-white truncate">{l.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    {l.email} {l.country ? `· ${l.country}` : ''}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(l.created_at)} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-Side Growth Cards: Customer Sign-Ups vs Newsletter Subscribers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Card 1: Customer Account Sign-Ups */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isUrgent
              ? 'bg-white/[0.04] border-white/10'
              : 'bg-slate-50/70 border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isUrgent
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    isUrgent ? 'text-slate-400' : 'text-gray-400'
                  }`}
                >
                  Customer Account Sign-Ups
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black">
                    +{customerPeriods[selectedPeriod]}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isUrgent ? 'text-slate-400' : 'text-gray-500'
                    }`}
                  >
                    in {activePeriodMeta.label}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/en/admin/users"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                isUrgent && newUsersCount > 0
                  ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                  : isUrgent
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-white border border-gray-200 text-brand-dark hover:border-brand-pink hover:text-brand-pink'
              }`}
            >
              {isUrgent && newUsersCount > 0 ? `+${newUsersCount} Unseen` : 'View All'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* All Period Breakdown Chips (This Week, 30 Days, 90 Days, This Year, Total) */}
          <div className="grid grid-cols-5 gap-2 pt-3 border-t border-current/10">
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = selectedPeriod === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedPeriod(opt.key)}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? isUrgent
                        ? 'bg-white/15 ring-1 ring-emerald-400/50'
                        : 'bg-white shadow-sm ring-1 ring-brand-dark/10'
                      : isUrgent
                      ? 'hover:bg-white/5'
                      : 'hover:bg-white/60'
                  }`}
                >
                  <p
                    className={`text-[9px] font-black uppercase tracking-wider truncate ${
                      isUrgent ? 'text-slate-400' : 'text-gray-400'
                    }`}
                  >
                    {opt.shortLabel}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {opt.key === 'allTime'
                      ? customerPeriods[opt.key]
                      : `+${customerPeriods[opt.key]}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card 2: Newsletter & First 50 VIP Sign-Ups */}
        <div
          className={`p-6 rounded-2xl border transition-colors ${
            isUrgent
              ? 'bg-white/[0.04] border-white/10'
              : 'bg-slate-50/70 border-slate-100'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  isUrgent
                    ? 'bg-brand-pink/25 text-brand-pink'
                    : 'bg-brand-pink/10 text-brand-pink'
                }`}
              >
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p
                  className={`text-[10px] font-black uppercase tracking-widest ${
                    isUrgent ? 'text-slate-400' : 'text-gray-400'
                  }`}
                >
                  Newsletter &amp; First 50 VIPs
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black">
                    +{leadPeriods[selectedPeriod]}
                  </span>
                  <span
                    className={`text-xs font-bold ${
                      isUrgent ? 'text-slate-400' : 'text-gray-500'
                    }`}
                  >
                    in {activePeriodMeta.label}
                  </span>
                </div>
              </div>
            </div>

            <Link
              href="/en/admin/leads"
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
                isUrgent && newLeadsCount > 0
                  ? 'bg-brand-pink text-white hover:bg-brand-pink/90'
                  : isUrgent
                  ? 'bg-white/10 text-white hover:bg-white/20'
                  : 'bg-white border border-gray-200 text-brand-dark hover:border-brand-pink hover:text-brand-pink'
              }`}
            >
              {isUrgent && newLeadsCount > 0 ? `+${newLeadsCount} Unseen` : 'View All'}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {/* All Period Breakdown Chips (This Week, 30 Days, 90 Days, This Year, Total) */}
          <div className="grid grid-cols-5 gap-2 pt-3 border-t border-current/10">
            {PERIOD_OPTIONS.map((opt) => {
              const isSelected = selectedPeriod === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedPeriod(opt.key)}
                  className={`p-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? isUrgent
                        ? 'bg-white/15 ring-1 ring-brand-pink/50'
                        : 'bg-white shadow-sm ring-1 ring-brand-dark/10'
                      : isUrgent
                      ? 'hover:bg-white/5'
                      : 'hover:bg-white/60'
                  }`}
                >
                  <p
                    className={`text-[9px] font-black uppercase tracking-wider truncate ${
                      isUrgent ? 'text-slate-400' : 'text-gray-400'
                    }`}
                  >
                    {opt.shortLabel}
                  </p>
                  <p className="text-sm font-black mt-0.5">
                    {opt.key === 'allTime'
                      ? leadPeriods[opt.key]
                      : `+${leadPeriods[opt.key]}`}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
