'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { getUserDisplayAvatarUrl } from '@/utils/avatar';
import { formatDate } from '@/utils/date';
import { TransactionsRevenueChart } from '@/components/admin/TransactionsRevenueChart';
import {
  refundOrderAction,
  resendOrderAccessEmailAction,
} from '@/app/[locale]/(admin)/admin/transactions/actions';

type TimeframeFilter = 'all' | 'this_month' | '30d' | '7d' | 'uk_tax_year';
type StatusTabFilter = 'all' | 'paid' | 'party_active' | 'generating' | 'refunded';

function formatGbp(val: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

function getDateKey(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getUkTaxYearStart(): Date {
  const now = new Date();
  // UK tax year starts 6 April
  const thisYearApril6 = new Date(now.getFullYear(), 3, 6);
  if (now >= thisYearApril6) {
    return thisYearApril6;
  }
  return new Date(now.getFullYear() - 1, 3, 6);
}

export function AdminTransactionsClient({
  locale,
  initialTransactions,
}: {
  locale: string;
  initialTransactions: any[];
}) {
  const [transactions, setTransactions] = useState<any[]>(initialTransactions);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // 1. Filter by Timeframe first (feeds both the Chart and the Table)
  const timeframeTransactions = useMemo(() => {
    const now = new Date();
    let cutoff = new Date(0);
    if (timeframe === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'this_month') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeframe === 'uk_tax_year') {
      cutoff = getUkTaxYearStart();
    }

    return transactions.filter((tx) => {
      if (!tx.created_at) return true;
      const d = new Date(tx.created_at);
      return isNaN(d.getTime()) ? true : d >= cutoff;
    });
  }, [transactions, timeframe]);

  // 2. Filter for Table (applies selectedDateKey from Graph + Status Tab + Search Query)
  const filteredTableTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return timeframeTransactions.filter((tx) => {
      if (selectedDateKey) {
        const txDateKey = getDateKey(tx.created_at);
        if (txDateKey !== selectedDateKey) return false;
      }

      if (statusFilter === 'paid') {
        if (tx.status !== 'succeeded' && tx.status !== 'qa_verified') return false;
      } else if (statusFilter === 'party_active') {
        const hasPartyActivity =
          Boolean(tx.partyDate) ||
          Number(tx.currentRound) > 0 ||
          Number(tx.prepReadyCount) > 0 ||
          Number(tx.claimedCount) > 0;
        if (!hasPartyActivity) return false;
      } else if (statusFilter === 'generating') {
        if (tx.generationStatus !== 'generating') return false;
      } else if (statusFilter === 'refunded') {
        if (tx.status !== 'refunded') return false;
      }

      if (q) {
        const orderRef = String(tx.id || '').toLowerCase();
        const pinStr = String(tx.pin || '').toLowerCase();
        const custName = String(tx.profiles?.full_name || '').toLowerCase();
        const custEmail = String(tx.profiles?.email || '').toLowerCase();
        const mysTitle = String(tx.mysteries?.title || '').toLowerCase();
        const tierStr = String(tx.packageTier || '').toLowerCase();
        const partyLoc = String(tx.partyLocation || '').toLowerCase();

        const matches =
          orderRef.includes(q) ||
          pinStr.includes(q) ||
          custName.includes(q) ||
          custEmail.includes(q) ||
          mysTitle.includes(q) ||
          tierStr.includes(q) ||
          partyLoc.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [timeframeTransactions, selectedDateKey, statusFilter, searchQuery]);

  // Copy Customer Support Links & PIN block
  const handleCopySupportBundle = async (item: any) => {
    const mId = item.mystery_id || item.mysteries?.id || item.id;
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://backpocketmysteries.com';
    const hostHubUrl = `${origin}/${locale}/account/orders/${mId}`;
    const prepInviteUrl = `${origin}/${locale}/play/${mId}?prep=1`;
    const liveLobbyUrl = `${origin}/${locale}/play/${mId}`;
    const pinFormatted = item.pin
      ? `${String(item.pin).slice(0, 3)} ${String(item.pin).slice(3)}`
      : 'See Host Hub';

    const bundleText = [
      `Mystery Pack: ${item.mysteries?.title || 'Custom Mystery Pack'}`,
      `6-Digit Party PIN: ${pinFormatted}`,
      `Host Hub & Controls: ${hostHubUrl}`,
      `Pre-Party Guest Invite Link: ${prepInviteUrl}`,
      `Live Game Night Lobby: ${liveLobbyUrl}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(bundleText);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2400);
    } catch {
      // ignore
    }
  };

  // Resend Host Access & Party Links Email
  const handleResendEmail = async (item: any) => {
    setSendingEmailId(item.id);
    setToast(null);
    try {
      const res = await resendOrderAccessEmailAction({
        orderId: item.id,
        mysteryId: item.mystery_id || item.mysteries?.id || null,
        mysteryTitle: item.mysteries?.title || 'Custom Mystery Pack',
        customerName: item.profiles?.full_name || 'Host',
        customerEmail: item.profiles?.email || null,
        pin: item.pin || null,
        grossGbp: item.grossGbp,
      });
      if (res.success) {
        setToast({
          type: 'success',
          message: `Host Hub & Party PIN access email sent to ${res.sentTo}.`,
        });
      } else {
        setToast({
          type: 'error',
          message: res.error || 'Could not send access email.',
        });
      }
    } finally {
      setSendingEmailId(null);
    }
  };

  // Refund Order
  const handleRefundOrder = async (item: any) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(
        `Mark order #${String(item.id || '').slice(0, 8).toUpperCase()} (${
          item.mysteries?.title || 'Mystery Pack'
        }) as Refunded?`
      )
    ) {
      return;
    }
    setRefundingId(item.id);
    setToast(null);
    try {
      await refundOrderAction(item.id);
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === item.id
            ? { ...tx, status: 'refunded', netRevenueGbp: 0, marginPercent: 0 }
            : tx
        )
      );
      setToast({
        type: 'success',
        message: `Order #${String(item.id || '').slice(0, 8).toUpperCase()} marked as refunded.`,
      });
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message || 'Failed to refund order.',
      });
    } finally {
      setRefundingId(null);
    }
  };

  // Export CSV for Bookkeeping / Accountant
  const handleExportCsv = () => {
    if (typeof window === 'undefined') return;
    const headers = [
      'Date',
      'Order ID',
      'PIN',
      'Customer Name',
      'Customer Email',
      'Mystery Pack',
      'Package Tier',
      'Scheduled Party Date',
      'Party Stage',
      'Gross (GBP)',
      'Stripe Fee (GBP)',
      'AI Cost (GBP)',
      'Net Revenue (GBP)',
      'Margin %',
      'Status',
    ];

    const escapeCsv = (val: any) => {
      const s = String(val ?? '').replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = filteredTableTransactions.map((tx) => {
      const round = Number(tx.currentRound) || 0;
      const stage =
        round >= 5
          ? 'Completed (Reveal)'
          : round >= 1
            ? `Live Round ${Math.floor(round)}`
            : Number(tx.prepReadyCount) > 0
              ? `Pre-Party Prep (${tx.prepReadyCount}/${tx.totalCastCount || 6} Ready)`
              : 'Ready in Host Hub';

      return [
        getDateKey(tx.created_at),
        tx.id,
        tx.pin || '',
        tx.profiles?.full_name || 'Guest',
        tx.profiles?.email || '',
        tx.mysteries?.title || 'Custom Mystery Pack',
        tx.packageTier || 'Basic (4–6)',
        tx.partyDate ? `${tx.partyDate}${tx.arrivalTime ? ` ${tx.arrivalTime}` : ''}` : '',
        stage,
        Number(tx.grossGbp || 0).toFixed(2),
        Number(tx.stripeFeeGbp || 0).toFixed(2),
        Number(tx.aiCostGbp || 0).toFixed(2),
        Number(tx.netRevenueGbp || 0).toFixed(2),
        `${tx.marginPercent || 0}%`,
        tx.status,
      ].map(escapeCsv);
    });

    const csvContent = [headers.map(escapeCsv).join(','), ...rows.map((r) => r.join(','))].join(
      '\r\n'
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `back-pocket-mysteries-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Top Timeframe & CSV Export Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 sm:px-5 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '7d', label: 'Last 7 Days' },
              { id: 'uk_tax_year', label: 'UK Tax Year' },
            ] as Array<{ id: TimeframeFilter; label: string }>
          ).map((tf) => {
            const active = timeframe === tf.id;
            return (
              <button
                key={tf.id}
                type="button"
                onClick={() => {
                  setTimeframe(tf.id);
                  setSelectedDateKey(null);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-dark text-white shadow-xs'
                    : 'text-gray-500 hover:text-brand-dark hover:bg-slate-50'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:border-brand-dark text-brand-dark text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
          >
            📥 Export CSV ({filteredTableTransactions.length})
          </button>
        </div>
      </div>

      {/* Toast Feedback Banner */}
      {toast && (
        <div
          className={`rounded-2xl p-4 flex items-center justify-between gap-4 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <p className="text-sm font-bold">{toast.message}</p>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Daily Net Revenue Graph (Click any bar or day pill to filter table) */}
      <TransactionsRevenueChart
        transactions={timeframeTransactions}
        selectedDateKey={selectedDateKey}
        onSelectDateKey={setSelectedDateKey}
      />

      {/* Search & Status Filter Bar */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'all', label: `All (${timeframeTransactions.length})` },
                {
                  id: 'paid',
                  label: `Paid (${
                    timeframeTransactions.filter(
                      (t) => t.status === 'succeeded' || t.status === 'qa_verified'
                    ).length
                  })`,
                },
                {
                  id: 'party_active',
                  label: `Scheduled / Live Parties (${
                    timeframeTransactions.filter(
                      (t) =>
                        Boolean(t.partyDate) ||
                        Number(t.currentRound) > 0 ||
                        Number(t.prepReadyCount) > 0
                    ).length
                  })`,
                },
                {
                  id: 'generating',
                  label: `Generating (${
                    timeframeTransactions.filter((t) => t.generationStatus === 'generating')
                      .length
                  })`,
                },
                {
                  id: 'refunded',
                  label: `Refunded (${
                    timeframeTransactions.filter((t) => t.status === 'refunded').length
                  })`,
                },
              ] as Array<{ id: StatusTabFilter; label: string }>
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    active
                      ? 'bg-brand-pink text-white shadow-xs'
                      : 'bg-slate-50 text-gray-500 hover:text-brand-dark hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}

            {selectedDateKey && (
              <button
                type="button"
                onClick={() => setSelectedDateKey(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider hover:bg-brand-pink transition-colors cursor-pointer"
              >
                📅 Day: {selectedDateKey} ✕
              </button>
            )}
          </div>

          <div className="relative w-full lg:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, mystery, PIN, order ID..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-slate-50/70 focus:bg-white focus:border-brand-pink focus:outline-none text-xs font-bold text-brand-dark"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400 hover:text-brand-dark cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Order &amp; PIN
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Customer
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Mystery Pack &amp; Tier
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Party Status &amp; QA
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Date
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Unit Economics (GBP £)
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Payment
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Support &amp; QA Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTableTransactions.length > 0 ? (
                filteredTableTransactions.map((item, i) => {
                  const mysteryId = item.mystery_id || item.mysteries?.id;
                  const qa = item.qaReport;
                  const healedCount =
                    (qa?.portraitsRegenerated || 0) +
                    (qa?.visualCluesRegenerated || 0) +
                    (qa?.audioCluesRegenerated || 0) +
                    (qa?.textIssuesRepaired || 0);

                  const round = Number(item.currentRound) || 0;
                  const prepCount = Number(item.prepReadyCount) || 0;
                  const totalCast = Number(item.totalCastCount) || 6;

                  return (
                    <tr key={item.id || i} className="hover:bg-gray-50/80 transition-colors">
                      {/* Order ID & PIN */}
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-brand-dark font-mono">
                          #{String(item.id || '').slice(0, 8).toUpperCase()}
                        </p>
                        {item.pin && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-black font-mono text-slate-700">
                            PIN: {String(item.pin).slice(0, 3)} {String(item.pin).slice(3)}
                          </span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getUserDisplayAvatarUrl({
                              id: item.user_id || item.id,
                              ...item.profiles,
                            })}
                            alt={item.profiles?.full_name || 'Guest'}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 bg-slate-100 shrink-0"
                          />
                          <div className="min-w-0">
                            {item.user_id ? (
                              <Link
                                href={`/${locale}/admin/users/${item.user_id}`}
                                className="text-sm font-bold text-brand-dark hover:text-brand-pink transition-colors block truncate"
                              >
                                {item.profiles?.full_name || 'Guest'}
                              </Link>
                            ) : (
                              <p className="text-sm font-bold text-brand-dark truncate">
                                {item.profiles?.full_name || 'Guest'}
                              </p>
                            )}
                            {item.profiles?.email && (
                              <p className="text-[11px] text-gray-400 font-medium truncate max-w-[180px]">
                                {item.profiles.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Mystery Pack & Package Tier */}
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          {mysteryId ? (
                            <Link
                              href={`/${locale}/admin/transactions/${mysteryId}`}
                              className="text-sm font-black text-slate-900 hover:text-brand-pink transition-colors underline decoration-slate-200 hover:decoration-brand-pink block"
                            >
                              {item.mysteries?.title || 'Custom Mystery Pack'}
                            </Link>
                          ) : (
                            <p className="text-sm font-medium text-slate-600">
                              {item.mysteries?.title || 'Unknown'}
                            </p>
                          )}
                          <span className="inline-block px-2 py-0.5 rounded-md bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider">
                            {item.packageTier || 'Basic (4–6)'}
                          </span>
                        </div>
                      </td>

                      {/* Live Party Status & QA */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-start gap-1.5">
                          {/* Live Game Stage Badge */}
                          {round >= 5 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
                              🏆 Party Completed (Reveal)
                            </span>
                          ) : round >= 1 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black uppercase tracking-wider animate-pulse">
                              🔴 LIVE NOW • Round {Math.floor(round)}
                            </span>
                          ) : prepCount > 0 ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-black uppercase tracking-wider">
                              📋 Prep ({prepCount}/{totalCast} Guests Ready)
                            </span>
                          ) : null}

                          {/* Scheduled Party Date if set */}
                          {item.partyDate && (
                            <span className="text-[11px] font-bold text-slate-700">
                              📅 Party: {item.partyDate}
                              {item.arrivalTime ? ` @ ${item.arrivalTime}` : ''}
                            </span>
                          )}

                          {/* QA Badge */}
                          {qa ? (
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                qa.overallScore >= 82
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              🛡️ QA {qa.overallScore}/100{' '}
                              {qa.overallScore >= 82 ? '• Passed' : '• Review'}
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                              {item.generationStatus === 'generating'
                                ? `⏳ Generating (${item.generationProgress || 20}%)`
                                : '🛡️ Pack Ready'}
                            </span>
                          )}
                          {healedCount > 0 && (
                            <span className="text-[10px] font-bold text-emerald-600">
                              ⚡ Self-healed {healedCount} asset{healedCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-xs text-gray-700 font-bold">
                          {formatDate(item.created_at)}
                        </p>
                      </td>

                      {/* Unit Economics (Gross -> Fees -> AI -> Net) */}
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-emerald-600">
                              {formatGbp(item.netRevenueGbp)} net
                            </span>
                            {item.marginPercent > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-black">
                                {item.marginPercent}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-gray-500">
                            Gross {formatGbp(item.grossGbp)}
                          </p>
                          {(item.stripeFeeGbp > 0 || item.aiCostGbp > 0) && (
                            <p className="text-[10px] font-semibold text-gray-400">
                              Stripe -{formatGbp(item.stripeFeeGbp)}
                              {item.aiCostGbp > 0 ? ` • AI -${formatGbp(item.aiCostGbp)}` : ''}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Payment Status */}
                      <td className="px-6 py-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            item.status === 'succeeded' || item.status === 'qa_verified'
                              ? 'bg-green-100 text-green-600'
                              : item.status === 'pending'
                                ? 'bg-amber-100 text-amber-600'
                                : item.status === 'refunded'
                                  ? 'bg-slate-100 text-slate-400'
                                  : 'bg-red-100 text-red-600'
                          }`}
                        >
                          {item.status === 'qa_verified' ? 'Verified' : item.status}
                        </span>
                      </td>

                      {/* One-Click Support & QA Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopySupportBundle(item)}
                            title="Copy Host Hub URL, Guest Invite URL & 6-Digit PIN"
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                              copiedId === item.id
                                ? 'bg-emerald-500 text-white border-emerald-500'
                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {copiedId === item.id ? '✓ Copied Links' : '📋 Copy Links'}
                          </button>

                          <button
                            type="button"
                            disabled={sendingEmailId === item.id}
                            onClick={() => handleResendEmail(item)}
                            title="Resend Host Hub & Party PIN email to customer"
                            className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer"
                          >
                            {sendingEmailId === item.id ? 'Sending...' : '✉️ Email Links'}
                          </button>

                          {mysteryId && (
                            <Link
                              href={`/${locale}/admin/transactions/${mysteryId}`}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                            >
                              🔍 Inspect &amp; QA →
                            </Link>
                          )}

                          {item.status !== 'refunded' && item.status !== 'qa_verified' && (
                            <button
                              type="button"
                              disabled={refundingId === item.id}
                              onClick={() => handleRefundOrder(item)}
                              className="px-2 py-1.5 text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {refundingId === item.id ? '...' : 'Refund'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center space-y-2">
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                      No matching transactions found
                    </p>
                    {(selectedDateKey || searchQuery || statusFilter !== 'all') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDateKey(null);
                          setSearchQuery('');
                          setStatusFilter('all');
                        }}
                        className="text-xs font-black text-brand-pink hover:underline cursor-pointer"
                      >
                        Reset active filters
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
