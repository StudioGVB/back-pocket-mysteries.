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
