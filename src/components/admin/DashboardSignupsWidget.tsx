'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  Users,
  Mail,
  MessageSquare,
  Star,
  LifeBuoy,
  Check,
  ArrowRight,
  Sparkles,
  Calendar,
} from 'lucide-react';
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

export interface UnseenEnquiryPreview {
  id: string;
  name: string;
  subject: string;
  created_at: string;
}

export interface UnseenReviewPreview {
  id: string;
  name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface UnseenTicketPreview {
  id: string;
  name: string;
  subject: string;
  created_at: string;
}

interface DashboardSignupsWidgetProps {
  newOrdersCount?: number;
  newUsersCount: number;
  newLeadsCount: number;
  newEnquiriesCount?: number;
  newReviewsCount?: number;
  newTicketsCount?: number;
  unseenCustomers: UnseenCustomerPreview[];
  unseenLeads: UnseenLeadPreview[];
  unseenEnquiries?: UnseenEnquiryPreview[];
  unseenReviews?: UnseenReviewPreview[];
  unseenTickets?: UnseenTicketPreview[];
  customerPeriods: PeriodCounts;
  leadPeriods: PeriodCounts;
  enquiryPeriods?: PeriodCounts;
  reviewPeriods?: PeriodCounts;
  ticketPeriods?: PeriodCounts;
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'year' | 'allTime';

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string; shortLabel: string }> = [
  { key: 'week', label: 'This Week (7d)', shortLabel: 'This Week' },
  { key: 'month', label: 'Last 30 Days', shortLabel: '30 Days' },
  { key: 'quarter', label: 'Last 90 Days', shortLabel: '90 Days' },
  { key: 'year', label: 'This Year', shortLabel: 'This Year' },
  { key: 'allTime', label: 'All Time', shortLabel: 'All Time' },
];

const EMPTY_PERIODS: PeriodCounts = {
  today: 0,
  week: 0,
  month: 0,
  quarter: 0,
  year: 0,
  allTime: 0,
};

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
  newOrdersCount = 0,
  newUsersCount,
  newLeadsCount,
  newEnquiriesCount = 0,
  newReviewsCount = 0,
  newTicketsCount = 0,
  unseenCustomers,
  unseenLeads,
  unseenEnquiries = [],
  unseenReviews = [],
  unseenTickets = [],
  customerPeriods,
  leadPeriods,
  enquiryPeriods = EMPTY_PERIODS,
  reviewPeriods = EMPTY_PERIODS,
  ticketPeriods = EMPTY_PERIODS,
}: DashboardSignupsWidgetProps) {
  const totalNewTraction =
    newOrdersCount +
    newUsersCount +
    newLeadsCount +
    newEnquiriesCount +
    newReviewsCount +
    newTicketsCount;

  const initialHasUrgency = totalNewTraction > 0;
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
  // and soften the urgency on-screen after 9 seconds
  useEffect(() => {
    const recordTimer = setTimeout(() => {
      persistDashboardSeen();
    }, 1200);

    let calmTimer: ReturnType<typeof setTimeout> | null = null;
    if (initialHasUrgency) {
      calmTimer = setTimeout(() => {
        setIsUrgent(false);
      }, 9500);
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

  const channels = [
    {
      id: 'customers',
      label: 'Customer Sign-Ups',
      href: '/en/admin/users',
      icon: <Users className="w-4 h-4" />,
      iconBg: isUrgent ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700',
      unseenCount: newUsersCount,
      periods: customerPeriods,
    },
    {
      id: 'leads',
      label: 'Newsletter & VIPs',
      href: '/en/admin/leads',
      icon: <Mail className="w-4 h-4" />,
      iconBg: isUrgent ? 'bg-brand-pink/25 text-brand-pink' : 'bg-brand-pink/10 text-brand-pink',
      unseenCount: newLeadsCount,
      periods: leadPeriods,
    },
    {
      id: 'enquiries',
      label: 'Contact Enquiries',
      href: '/en/admin/enquiries',
      icon: <MessageSquare className="w-4 h-4" />,
      iconBg: isUrgent ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-100 text-indigo-700',
      unseenCount: newEnquiriesCount,
      periods: enquiryPeriods,
    },
    {
      id: 'reviews',
      label: 'Customer Reviews',
      href: '/en/admin/reviews',
      icon: <Star className="w-4 h-4" />,
      iconBg: isUrgent ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700',
      unseenCount: newReviewsCount,
      periods: reviewPeriods,
    },
    {
      id: 'tickets',
      label: 'Support Tickets',
      href: '/en/admin/tickets',
      icon: <LifeBuoy className="w-4 h-4" />,
      iconBg: isUrgent ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-700',
      unseenCount: newTicketsCount,
      periods: ticketPeriods,
    },
  ];

  const hasUnseenPreviews =
    unseenCustomers.length > 0 ||
    unseenLeads.length > 0 ||
    unseenEnquiries.length > 0 ||
    unseenReviews.length > 0 ||
    unseenTickets.length > 0;

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
                New Traction Alert
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest">
                <Calendar className="w-3 h-3 text-brand-pink" />
                Traction &amp; Community Growth
              </span>
            )}

            {isUrgent && (
              <button
                type="button"
                onClick={handleDismissUrgency}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                <Check className="w-3 h-3 text-emerald-400" />
                Viewed · Clear Urgency
              </button>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            {isUrgent ? (
              <>
                <span className="text-brand-pink">+{totalNewTraction} New</span> Sign-Ups, Leads,
                Enquiries &amp; Reviews Since Your Last Visit
              </>
            ) : (
              <>
                Sign-Ups, Newsletter, Enquiries &amp;{' '}
                <span className="text-brand-pink italic">Reviews Breakdown</span>
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

      {/* Urgent Activity Feed (Automatically clears once viewed) */}
      {isUrgent && hasUnseenPreviews && (
        <div className="mt-5 p-4 rounded-2xl bg-white/[0.06] border border-brand-pink/30 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-brand-pink flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              New Traction Since You Last Checked the Dashboard
            </p>
            <span className="text-[10px] text-slate-400 font-semibold">
              Click any item to open · Urgency clears automatically after viewing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {unseenCustomers.slice(0, 2).map((c) => (
              <Link
                key={`cust-${c.id}`}
                href={`/en/admin/users/${c.id}`}
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-widest">
                      Sign-Up
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
                key={`lead-${l.id}`}
                href="/en/admin/leads"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-brand-pink/25 text-brand-pink text-[9px] font-black uppercase tracking-widest">
                      {l.vip_rank && l.vip_rank <= 50 ? `VIP #${l.vip_rank}` : 'Newsletter'}
                    </span>
                    <p className="text-xs font-black text-white truncate">{l.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">{l.email}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(l.created_at)} →
                </span>
              </Link>
            ))}

            {unseenEnquiries.slice(0, 2).map((e) => (
              <Link
                key={`enq-${e.id}`}
                href="/en/admin/enquiries"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-500/25 text-indigo-300 text-[9px] font-black uppercase tracking-widest">
                      Enquiry
                    </span>
                    <p className="text-xs font-black text-white truncate">{e.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">{e.subject}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(e.created_at)} →
                </span>
              </Link>
            ))}

            {unseenReviews.slice(0, 2).map((r) => (
              <Link
                key={`rev-${r.id}`}
                href="/en/admin/reviews"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-[9px] font-black uppercase tracking-widest">
                      ★ {r.rating}.0 Review
                    </span>
                    <p className="text-xs font-black text-white truncate">{r.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">
                    {r.comment || 'New customer review submitted'}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(r.created_at)} →
                </span>
              </Link>
            ))}

            {unseenTickets.slice(0, 2).map((t) => (
              <Link
                key={`tkt-${t.id}`}
                href="/en/admin/tickets"
                className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-sky-500/25 text-sky-300 text-[9px] font-black uppercase tracking-widest">
                      Ticket
                    </span>
                    <p className="text-xs font-black text-white truncate">{t.name}</p>
                  </div>
                  <p className="text-[11px] text-slate-300 truncate mt-0.5">{t.subject}</p>
                </div>
                <span className="text-[10px] font-bold text-slate-400 shrink-0">
                  {formatTimeAgo(t.created_at)} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 5 Traction Channels Grid (Customer Sign-Ups, Newsletter & VIPs, Enquiries, Reviews, Tickets) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mt-6">
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between ${
              isUrgent
                ? 'bg-white/[0.04] border-white/10'
                : 'bg-slate-50/70 border-slate-100'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${ch.iconBg}`}>
                  {ch.icon}
                </div>
                <Link
                  href={ch.href}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors ${
                    isUrgent && ch.unseenCount > 0
                      ? 'bg-brand-pink text-white'
                      : isUrgent
                      ? 'bg-white/10 text-white hover:bg-white/20'
                      : 'bg-white border border-gray-200 text-brand-dark hover:border-brand-pink hover:text-brand-pink'
                  }`}
                >
                  {isUrgent && ch.unseenCount > 0 ? `+${ch.unseenCount} New` : 'Open'}
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              </div>

              <p
                className={`text-[10px] font-black uppercase tracking-widest ${
                  isUrgent ? 'text-slate-400' : 'text-gray-400'
                }`}
              >
                {ch.label}
              </p>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-2xl font-black">
                  {selectedPeriod === 'allTime'
                    ? ch.periods[selectedPeriod]
                    : `+${ch.periods[selectedPeriod]}`}
                </span>
                <span
                  className={`text-[11px] font-bold ${
                    isUrgent ? 'text-slate-400' : 'text-gray-500'
                  }`}
                >
                  {activePeriodMeta.shortLabel}
                </span>
              </div>
            </div>

            {/* Mini Period Row (7d · 30d · 1y · Total) */}
            <div className="grid grid-cols-4 gap-1 pt-3 mt-4 border-t border-current/10 text-center">
              {(
                [
                  { k: 'week', l: '7d' },
                  { k: 'month', l: '30d' },
                  { k: 'year', l: '1y' },
                  { k: 'allTime', l: 'All' },
                ] as const
              ).map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setSelectedPeriod(p.k)}
                  className={`py-1 rounded-lg transition-colors cursor-pointer ${
                    selectedPeriod === p.k
                      ? isUrgent
                        ? 'bg-white/15 font-black'
                        : 'bg-white shadow-xs font-black'
                      : 'opacity-75 hover:opacity-100'
                  }`}
                >
                  <p
                    className={`text-[8px] font-black uppercase ${
                      isUrgent ? 'text-slate-400' : 'text-gray-400'
                    }`}
                  >
                    {p.l}
                  </p>
                  <p className="text-[11px] font-black">
                    {p.k === 'allTime' ? ch.periods[p.k] : `+${ch.periods[p.k]}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
