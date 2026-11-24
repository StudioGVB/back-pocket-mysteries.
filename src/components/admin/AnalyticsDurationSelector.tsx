'use client';

import React, { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const ANALYTICS_DURATION_OPTIONS = [
  { days: 1, shortLabel: '24h', fullLabel: 'Last 24 Hours' },
  { days: 7, shortLabel: '7 Days', fullLabel: 'Last 7 Days' },
  { days: 14, shortLabel: '14 Days', fullLabel: 'Last 14 Days' },
  { days: 30, shortLabel: '30 Days', fullLabel: 'Last 30 Days' },
  { days: 90, shortLabel: '90 Days', fullLabel: 'Last 90 Days' },
  { days: 365, shortLabel: 'Last Year', fullLabel: 'Last Year (365d)' },
] as const;

export function parseAnalyticsDays(raw?: string | string[] | null): number {
  const val = Array.isArray(raw) ? raw[0] : raw;
  const num = Number(val);
  if ([1, 7, 14, 30, 90, 365].includes(num)) {
    return num;
  }
  return 30;
}

export function getDurationLabel(days: number): string {
  const found = ANALYTICS_DURATION_OPTIONS.find((o) => o.days === days);
  return found ? found.fullLabel : `Last ${days} Days`;
}

export function AnalyticsDurationSelector({ currentDays }: { currentDays: number }) {
  const router = useRouter();
  const pathname = usePathname() || '/en/admin/analytics';
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const activeDays = currentDays || parseAnalyticsDays(searchParams?.get('days'));
  const activeOption =
    ANALYTICS_DURATION_OPTIONS.find((o) => o.days === activeDays) ||
    ANALYTICS_DURATION_OPTIONS[3];

  const handleSelectDays = (days: number) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('days', String(days));
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
        <span
          className={`w-2 h-2 rounded-full bg-emerald-500 ${
            isPending ? 'animate-ping' : 'animate-pulse'
          }`}
        />
        Live Production Data • {activeOption.shortLabel}
      </span>

      <div className="inline-flex flex-wrap items-center gap-1 bg-white p-1.5 rounded-2xl border border-gray-200 shadow-sm">
        {ANALYTICS_DURATION_OPTIONS.map((opt) => {
          const isActive = opt.days === activeDays;
          return (
            <button
              key={opt.days}
              type="button"
              disabled={isPending}
              onClick={() => handleSelectDays(opt.days)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                isActive
                  ? 'bg-brand-pink text-white shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark hover:bg-gray-50'
              } ${isPending ? 'opacity-70' : ''}`}
            >
              {opt.shortLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
