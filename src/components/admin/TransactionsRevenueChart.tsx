'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export interface TransactionChartInputItem {
  id: string;
  created_at: string;
  status: string;
  grossGbp: number;
  stripeFeeGbp: number;
  aiCostGbp: number;
  netRevenueGbp: number;
}

export interface DailyNetRevenuePoint {
  dateKey: string; // YYYY-MM-DD
  shortDate: string; // e.g. "24 Nov"
  fullDate: string; // e.g. "Tue, 24 Nov 2026"
  netRevenue: number;
  grossRevenue: number;
  feesAndCosts: number;
  ordersCount: number;
}

function formatGbp(val: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val || 0);
}

export function TransactionsRevenueChart({
  transactions,
  selectedDateKey = null,
  onSelectDateKey,
}: {
  transactions: TransactionChartInputItem[];
  selectedDateKey?: string | null;
  onSelectDateKey?: (dateKey: string | null) => void;
}) {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  // Group all paid/active transactions by calendar day (YYYY-MM-DD), sorted chronologically
  const dailyData = useMemo<DailyNetRevenuePoint[]>(() => {
    const map = new Map<string, DailyNetRevenuePoint>();

    for (const tx of transactions) {
      if (!tx.created_at) continue;
      const isPaid = tx.status === 'succeeded' || tx.status === 'qa_verified';
      if (!isPaid) continue;

      const d = new Date(tx.created_at);
      if (isNaN(d.getTime())) continue;

      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const existing = map.get(dateKey) || {
        dateKey,
        shortDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        fullDate: d.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        }),
        netRevenue: 0,
        grossRevenue: 0,
        feesAndCosts: 0,
        ordersCount: 0,
      };

      const gross = Number(tx.grossGbp) || 0;
      const net = Number(tx.netRevenueGbp) || 0;
      const costs = Number((Number(tx.stripeFeeGbp || 0) + Number(tx.aiCostGbp || 0)).toFixed(2));

      existing.netRevenue = Number((existing.netRevenue + net).toFixed(2));
      existing.grossRevenue = Number((existing.grossRevenue + gross).toFixed(2));
      existing.feesAndCosts = Number((existing.feesAndCosts + costs).toFixed(2));
      existing.ordersCount += 1;

      map.set(dateKey, existing);
    }

    return Array.from(map.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [transactions]);

  const summary = useMemo(() => {
    const totalNet = dailyData.reduce((acc, d) => acc + d.netRevenue, 0);
    const totalGross = dailyData.reduce((acc, d) => acc + d.grossRevenue, 0);
    const totalFees = dailyData.reduce((acc, d) => acc + d.feesAndCosts, 0);
    const totalOrders = dailyData.reduce((acc, d) => acc + d.ordersCount, 0);
    const bestDay =
      dailyData.length > 0
        ? [...dailyData].sort((a, b) => b.netRevenue - a.netRevenue)[0]
        : null;
    const avgNetPerActiveDay = dailyData.length > 0 ? totalNet / dailyData.length : 0;

    return {
      totalNet: Number(totalNet.toFixed(2)),
      totalGross: Number(totalGross.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      totalOrders,
      activeDays: dailyData.length,
      bestDay,
      avgNetPerActiveDay: Number(avgNetPerActiveDay.toFixed(2)),
    };
  }, [dailyData]);

  const handleToggleDay = (dateKey: string) => {
    if (!onSelectDateKey) return;
    onSelectDateKey(selectedDateKey === dateKey ? null : dateKey);
  };

  return (
    <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
      {/* Top KPI Summary Header */}
      <div className="p-6 sm:p-8 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              <span>Daily Net Earnings (GBP £)</span>
            </span>
            {selectedDateKey && (
              <button
                type="button"
                onClick={() => onSelectDateKey?.(null)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors cursor-pointer"
              >
                <span>Filtered to {selectedDateKey}</span>
                <span>✕</span>
              </button>
            )}
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight">
            Net Revenue by Transaction Day
          </h3>
          <p className="text-xs text-gray-400 font-semibold">
            Every calendar day with a transaction and your take-home Net Revenue (£). Click any bar or day pill to filter the table below to that day.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start lg:self-auto bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setChartType('bar')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              chartType === 'bar'
                ? 'bg-brand-dark text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bar Graph
          </button>
          <button
            type="button"
            onClick={() => setChartType('area')}
            className={`px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              chartType === 'area'
                ? 'bg-brand-pink text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Area Trend
          </button>
        </div>
      </div>

      {/* 4 KPI Strip Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 border-b border-gray-100 bg-slate-50/40">
        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Total Net Revenue
          </p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {formatGbp(summary.totalNet)}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
            After -{formatGbp(summary.totalFees)} Stripe &amp; AI costs
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Gross Sales Volume
          </p>
          <p className="text-2xl sm:text-3xl font-black text-brand-dark mt-1">
            {formatGbp(summary.totalGross)}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
            Across {summary.totalOrders} paid order{summary.totalOrders === 1 ? '' : 's'}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Best Transaction Day
          </p>
          <p className="text-2xl sm:text-3xl font-black text-brand-pink mt-1">
            {summary.bestDay ? formatGbp(summary.bestDay.netRevenue) : '£0.00'}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
            {summary.bestDay
              ? `${summary.bestDay.fullDate} (${summary.bestDay.ordersCount} order${
                  summary.bestDay.ordersCount === 1 ? '' : 's'
                })`
              : 'No active days yet'}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Active Sales Days
          </p>
          <p className="text-2xl sm:text-3xl font-black text-brand-dark mt-1">
            {summary.activeDays} {summary.activeDays === 1 ? 'Day' : 'Days'}
          </p>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
            Avg {formatGbp(summary.avgNetPerActiveDay)} net / active day
          </p>
        </div>
      </div>

      {/* Graph Canvas */}
      {dailyData.length > 0 ? (
        <div className="p-6 sm:p-8 space-y-6">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' ? (
                <BarChart
                  data={dailyData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  onClick={(state: any) => {
                    const clickedKey = state?.activePayload?.[0]?.payload?.dateKey;
                    if (clickedKey) handleToggleDay(clickedKey);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(254, 4, 198, 0.05)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as DailyNetRevenuePoint;
                      return (
                        <div className="rounded-2xl bg-slate-950 text-white p-4 shadow-2xl border border-slate-800 space-y-2 min-w-[220px]">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                            <span className="text-xs font-black text-white">{pt.fullDate}</span>
                            <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase">
                              {pt.ordersCount} {pt.ordersCount === 1 ? 'Order' : 'Orders'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Net Revenue:</span>
                              <span className="text-emerald-400 font-black text-sm">
                                {formatGbp(pt.netRevenue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Gross Sales:</span>
                              <span className="text-slate-200 font-bold">
                                {formatGbp(pt.grossRevenue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Stripe &amp; AI Costs:</span>
                              <span className="text-rose-400 font-bold">
                                -{formatGbp(pt.feesAndCosts)}
                              </span>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-400 pt-1 border-t border-white/10">
                            Click bar to filter transactions to this day
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="netRevenue"
                    name="Net Revenue (£)"
                    radius={[10, 10, 0, 0]}
                    maxBarSize={56}
                    className="cursor-pointer"
                  >
                    {dailyData.map((entry) => {
                      const isSelected = selectedDateKey === entry.dateKey;
                      const isDimmed = Boolean(selectedDateKey && !isSelected);
                      return (
                        <Cell
                          key={entry.dateKey}
                          fill={isSelected ? '#1e191c' : '#fe04c6'}
                          fillOpacity={isDimmed ? 0.35 : 1}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              ) : (
                <AreaChart
                  data={dailyData}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                  onClick={(state: any) => {
                    const clickedKey = state?.activePayload?.[0]?.payload?.dateKey;
                    if (clickedKey) handleToggleDay(clickedKey);
                  }}
                >
                  <defs>
                    <linearGradient id="netRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fe04c6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#fe04c6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="shortDate"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }}
                    tickFormatter={(v) => `£${v}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const pt = payload[0].payload as DailyNetRevenuePoint;
                      return (
                        <div className="rounded-2xl bg-slate-950 text-white p-4 shadow-2xl border border-slate-800 space-y-2 min-w-[220px]">
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
                            <span className="text-xs font-black text-white">{pt.fullDate}</span>
                            <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase">
                              {pt.ordersCount} {pt.ordersCount === 1 ? 'Order' : 'Orders'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Net Revenue:</span>
                              <span className="text-emerald-400 font-black text-sm">
                                {formatGbp(pt.netRevenue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Gross Sales:</span>
                              <span className="text-slate-200 font-bold">
                                {formatGbp(pt.grossRevenue)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 font-semibold">Stripe &amp; AI Costs:</span>
                              <span className="text-rose-400 font-bold">
                                -{formatGbp(pt.feesAndCosts)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netRevenue"
                    name="Net Revenue (£)"
                    stroke="#fe04c6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#netRevGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Scannable Day-by-Day Net Revenue Pills (Click to Filter Table) */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between gap-2 mb-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Transaction Days Breakdown ({dailyData.length} {dailyData.length === 1 ? 'Day' : 'Days'} • Click any day to filter table)
              </p>
              {selectedDateKey && (
                <button
                  type="button"
                  onClick={() => onSelectDateKey?.(null)}
                  className="text-[11px] font-black text-brand-pink hover:underline cursor-pointer"
                >
                  Show All Days ({summary.totalOrders} orders)
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2.5">
              {[...dailyData].reverse().map((day) => {
                const isSelected = selectedDateKey === day.dateKey;
                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    onClick={() => handleToggleDay(day.dateKey)}
                    className={`px-3.5 py-2 rounded-2xl border flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-brand-dark'
                    }`}
                  >
                    <div>
                      <p className={`text-xs font-black ${isSelected ? 'text-white' : 'text-brand-dark'}`}>
                        {day.fullDate}
                      </p>
                      <p className={`text-[10px] font-bold ${isSelected ? 'text-slate-300' : 'text-gray-400'}`}>
                        {day.ordersCount} {day.ordersCount === 1 ? 'transaction' : 'transactions'} • Gross{' '}
                        {formatGbp(day.grossRevenue)}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                        isSelected
                          ? 'bg-brand-pink text-white border-brand-pink'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      }`}
                    >
                      +{formatGbp(day.netRevenue)} net
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center space-y-2">
          <p className="text-sm font-black text-brand-dark uppercase tracking-widest">
            No Transaction Days in Selected Timeframe
          </p>
          <p className="text-xs text-gray-400 font-medium max-w-md mx-auto">
            As soon as orders are completed in this period, each day with a transaction and your daily take-home Net Revenue (£) will appear on this graph.
          </p>
        </div>
      )}
    </div>
  );
}
