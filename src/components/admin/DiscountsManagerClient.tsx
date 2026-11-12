'use client';

import React, { useState, useMemo } from 'react';
import {
  DiscountRecord,
  DiscountType,
  DiscountAppliesTo,
  DiscountUsageLimitType,
  PACKAGE_TIER_OPTIONS,
  CORE_MYSTERY_PACKAGES,
  MysteryPackageOption,
  getDiscountComputedStatus,
  calculateDiscountedPrice,
  slugifyMysteryTitle,
} from '@/utils/discounts';
import {
  saveDiscountAction,
  toggleDiscountActiveAction,
  deleteDiscountAction,
} from '@/app/actions/discounts';

interface DiscountsManagerClientProps {
  initialDiscounts: DiscountRecord[];
  dbMysteries: {
    id: string;
    title: string;
    theme: string | null;
    complexity: 'easy' | 'medium' | 'hard' | null;
    status?: string | null;
  }[];
}

function toDatetimeLocalValue(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function formatReadableDateTime(isoString: string | null | undefined): string {
  if (!isoString) return 'No End Date';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DiscountsManagerClient({
  initialDiscounts,
  dbMysteries,
}: DiscountsManagerClientProps) {
  const [discounts, setDiscounts] = useState<DiscountRecord[]>(initialDiscounts);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [autoApply, setAutoApply] = useState(true);
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('20');
  const [appliesTo, setAppliesTo] = useState<DiscountAppliesTo>('packages');
  const [targetPackages, setTargetPackages] = useState<string[]>(['premium']);
  const [targetMysteries, setTargetMysteries] = useState<string[]>([]);
  const [startsAtLocal, setStartsAtLocal] = useState<string>(() =>
    toDatetimeLocalValue(new Date().toISOString())
  );
  const [hasEndDate, setHasEndDate] = useState<boolean>(true);
  const [endsAtLocal, setEndsAtLocal] = useState<string>(() => {
    const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return toDatetimeLocalValue(d.toISOString());
  });
  const [usageLimit, setUsageLimit] = useState<DiscountUsageLimitType>('unlimited');
  const [maxUses, setMaxUses] = useState<string>('100');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);

  // Merge core mystery packages with database mysteries without duplicates
  const availableMysteries = useMemo<MysteryPackageOption[]>(() => {
    const map = new Map<string, MysteryPackageOption>();
    for (const core of CORE_MYSTERY_PACKAGES) {
      map.set(core.slug, core);
    }
    for (const m of dbMysteries) {
      const slug = slugifyMysteryTitle(m.title) || m.id;
      const existing = map.get(slug);
      if (existing) {
        // Keep DB UUID accessible too
        map.set(slug, {
          ...existing,
          id: m.id,
          slug,
          title: m.title || existing.title,
          theme: m.theme || existing.theme,
          complexity: m.complexity || existing.complexity,
        });
      } else {
        map.set(slug, {
          id: m.id,
          slug,
          title: m.title,
          theme: m.theme || 'Custom Mystery',
          complexity: m.complexity || 'medium',
        });
      }
    }
    return Array.from(map.values());
  }, [dbMysteries]);

  const mysteryNameByKey = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const m of availableMysteries) {
      lookup[m.id.toLowerCase()] = m.title;
      lookup[m.slug.toLowerCase()] = m.title;
    }
    return lookup;
  }, [availableMysteries]);

  const packageNameByKey = useMemo(() => {
    const lookup: Record<string, string> = {};
    for (const p of PACKAGE_TIER_OPTIONS) {
      lookup[p.id] = p.name;
    }
    return lookup;
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setAutoApply(true);
    setDiscountType('percentage');
    setDiscountValue('20');
    setAppliesTo('packages');
    setTargetPackages(['premium']);
    setTargetMysteries([]);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartsAtLocal(toDatetimeLocalValue(now.toISOString()));
    setHasEndDate(true);
    setEndsAtLocal(toDatetimeLocalValue(nextWeek.toISOString()));
    setUsageLimit('unlimited');
    setMaxUses('100');
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (d: DiscountRecord) => {
    setEditingId(d.id);
    setName(d.name);
    setCode(d.code || '');
    setAutoApply(d.auto_apply);
    setDiscountType(d.discount_type);
    setDiscountValue(String(d.discount_value));
    setAppliesTo(d.applies_to);
    setTargetPackages(d.target_packages || []);
    setTargetMysteries(d.target_mysteries || []);
    setStartsAtLocal(toDatetimeLocalValue(d.starts_at));
    setHasEndDate(Boolean(d.ends_at));
    setEndsAtLocal(
      d.ends_at
        ? toDatetimeLocalValue(d.ends_at)
        : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
    );
    setUsageLimit(d.usage_limit || 'unlimited');
    setMaxUses(d.max_uses ? String(d.max_uses) : '100');
    setIsActive(d.is_active);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleGenerateRandomCode = () => {
    const prefix =
      discountType === 'percentage'
        ? `MYSTERY${Math.round(Number(discountValue) || 20)}`
        : `SAVE${Math.round(Number(discountValue) || 10)}`;
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    setCode(`${prefix}-${suffix}`);
  };

  const applyDurationPreset = (hours: number) => {
    const base = startsAtLocal ? new Date(startsAtLocal) : new Date();
    const validBase = isNaN(base.getTime()) ? new Date() : base;
    const end = new Date(validBase.getTime() + hours * 60 * 60 * 1000);
    setHasEndDate(true);
    setEndsAtLocal(toDatetimeLocalValue(end.toISOString()));
  };

  const togglePackageSelection = (pkgId: string) => {
    setTargetPackages((prev) =>
      prev.includes(pkgId) ? prev.filter((id) => id !== pkgId) : [...prev, pkgId]
    );
  };

  const toggleMysterySelection = (mystery: MysteryPackageOption) => {
    const keys = Array.from(new Set([mystery.slug, mystery.id]));
    setTargetMysteries((prev) => {
      const isSelected = keys.some((k) => prev.includes(k));
      if (isSelected) {
        return prev.filter((k) => !keys.includes(k));
      }
      return Array.from(new Set([...prev, ...keys]));
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const startIso = startsAtLocal
        ? new Date(startsAtLocal).toISOString()
        : new Date().toISOString();
      const endIso =
        hasEndDate && endsAtLocal ? new Date(endsAtLocal).toISOString() : null;

      const res = await saveDiscountAction({
        id: editingId || undefined,
        name: name.trim() || code.trim() || 'Special Package Offer',
        code: code.trim() || null,
        auto_apply: autoApply,
        discount_type: discountType,
        discount_value: Number(discountValue),
        applies_to: appliesTo,
        target_packages:
          appliesTo === 'packages' || appliesTo === 'custom' ? targetPackages : [],
        target_mysteries:
          appliesTo === 'mysteries' || appliesTo === 'custom' ? targetMysteries : [],
        starts_at: startIso,
        ends_at: endIso,
        usage_limit: usageLimit,
        max_uses: usageLimit === 'max_uses' ? Number(maxUses) : null,
        is_active: isActive,
      });

      if (!res.success || !res.discount) {
        setFormError(res.error || 'Failed to save discount.');
      } else {
        const saved = res.discount;
        setDiscounts((prev) => {
          const exists = prev.some((d) => d.id === saved.id);
          if (exists) {
            return prev.map((d) => (d.id === saved.id ? saved : d));
          }
          return [saved, ...prev];
        });
        setIsModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleRowActive = async (d: DiscountRecord) => {
    setBusyRowId(d.id);
    try {
      const res = await toggleDiscountActiveAction(d.id, !d.is_active);
      if (res.success && res.discount) {
        setDiscounts((prev) => prev.map((item) => (item.id === d.id ? res.discount! : item)));
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleDeleteRow = async (d: DiscountRecord) => {
    setBusyRowId(d.id);
    try {
      const res = await deleteDiscountAction(d.id);
      if (res.success) {
        setDiscounts((prev) => prev.filter((item) => item.id !== d.id));
      }
    } finally {
      setBusyRowId(null);
    }
  };

  const handleCopyCode = async (codeText: string, id: string) => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopiedCodeId(id);
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch {
      // ignore
    }
  };

  // Counts & Filtered list
  const counts = useMemo(() => {
    const now = new Date();
    const c = { all: discounts.length, active: 0, scheduled: 0, expired: 0, paused: 0 };
    for (const d of discounts) {
      const status = getDiscountComputedStatus(d, now);
      c[status] += 1;
    }
    return c;
  }, [discounts]);

  const filteredDiscounts = useMemo(() => {
    const now = new Date();
    return discounts.filter((d) => {
      const status = getDiscountComputedStatus(d, now);
      if (filterTab !== 'all' && status !== filterTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchCode = (d.code || '').toLowerCase().includes(q);
        return matchName || matchCode;
      }
      return true;
    });
  }, [discounts, filterTab, searchQuery]);

  // Live preview of package prices in the modal
  const numericPreviewVal = Number(discountValue) || 0;
  const previewTiers = [
    { id: 'basic', label: 'Basic ($19)', price: 19 },
    { id: 'premium', label: 'Premium ($25)', price: 25 },
    { id: 'grand', label: 'Grand ($33)', price: 33 },
    { id: 'subscribe', label: 'Unlimited ($39)', price: 39 },
  ];

  const renderTargetsSummary = (d: DiscountRecord) => {
    if (d.applies_to === 'all') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-black uppercase tracking-wider">
          All Packages &amp; Mysteries
        </span>
      );
    }

    const pkgLabels = (d.target_packages || []).map((p) => packageNameByKey[p] || p);
    const mysLabels = Array.from(
      new Set(
        (d.target_mysteries || [])
          .map((m) => mysteryNameByKey[m.toLowerCase()])
          .filter(Boolean)
      )
    );

    const pills = [...pkgLabels, ...mysLabels];
    if (pills.length === 0) {
      return <span className="text-xs font-bold text-gray-400">All Packages</span>;
    }

    return (
      <div className="flex flex-wrap gap-1.5 max-w-xs">
        {pills.slice(0, 3).map((label, idx) => (
          <span
            key={idx}
            className="px-2.5 py-1 rounded-lg bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider"
          >
            {label}
          </span>
        ))}
        {pills.length > 3 && (
          <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-black">
            +{pills.length - 3} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-3">
            Discounts &amp; <span className="text-brand-pink italic">Promotions</span>
          </h1>
          <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Schedule automatic package sales, discount specific murder mysteries, and manage promo codes
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="bg-brand-pink text-white px-6 py-3.5 rounded-full font-black text-xs uppercase tracking-widest shadow-lg hover:bg-brand-dark transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Discount
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Active Promotions
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{counts.active}</span>
            <span className="text-xs font-bold text-gray-400">Live right now</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Scheduled Upcoming
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-500">{counts.scheduled}</span>
            <span className="text-xs font-bold text-gray-400">Queued by date/time</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Auto-Package Sales
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-pink">
              {discounts.filter((d) => d.auto_apply).length}
            </span>
            <span className="text-xs font-bold text-gray-400">Storefront markdowns</span>
          </div>
        </div>
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
            Promo Codes
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-brand-dark">
              {discounts.filter((d) => Boolean(d.code)).length}
            </span>
            <span className="text-xs font-bold text-gray-400">Checkout codes</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="inline-flex bg-gray-100 p-1.5 rounded-2xl overflow-x-auto">
          {(
            [
              { id: 'all', label: 'All', count: counts.all },
              { id: 'active', label: 'Active', count: counts.active },
              { id: 'scheduled', label: 'Scheduled', count: counts.scheduled },
              { id: 'paused', label: 'Paused', count: counts.paused },
              { id: 'expired', label: 'Expired', count: counts.expired },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] ${
                  filterTab === tab.id
                    ? 'bg-brand-pink/10 text-brand-pink'
                    : 'bg-gray-200/70 text-gray-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search promotion or code..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-brand-dark placeholder:text-gray-400 focus:outline-none focus:border-brand-pink"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2.5" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="2.5" />
          </svg>
        </div>
      </div>

      {/* Discounts Table */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        {filteredDiscounts.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-16 h-16 bg-brand-pink/10 text-brand-pink rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              🏷️
            </div>
            <h3 className="text-xl font-black text-brand-dark mb-2">No Discounts Found</h3>
            <p className="text-sm font-medium text-gray-500 max-w-md mx-auto mb-6">
              Create a scheduled sale for specific murder mystery packages or generate a custom promo code.
            </p>
            <button
              type="button"
              onClick={openCreateModal}
              className="bg-brand-pink text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-brand-dark transition-colors"
            >
              + Create First Discount
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-100">
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Promotion / Code
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Discount
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Applies To Packages
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Schedule (Start → End)
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDiscounts.map((d) => {
                  const status = getDiscountComputedStatus(d);
                  const isBusy = busyRowId === d.id;

                  return (
                    <tr key={d.id} className="hover:bg-gray-50/40 transition-colors">
                      {/* Promotion Name & Code */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-sm font-black text-brand-dark">{d.name}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            {d.code && (
                              <button
                                type="button"
                                onClick={() => handleCopyCode(d.code!, d.id)}
                                title="Click to copy promo code"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold hover:bg-brand-pink transition-colors cursor-pointer"
                              >
                                {d.code}
                                <span className="text-[10px] opacity-75">
                                  {copiedCodeId === d.id ? '✓' : '📋'}
                                </span>
                              </button>
                            )}
                            {d.auto_apply && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider">
                                ⚡ Auto-Sale on Site
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Value & Type */}
                      <td className="px-6 py-5">
                        <div className="inline-flex flex-col">
                          <span className="text-lg font-black text-brand-dark">
                            {d.discount_type === 'percentage'
                              ? `${d.discount_value}% OFF`
                              : `$${d.discount_value} OFF`}
                          </span>
                          <span className="text-[11px] font-bold text-gray-400 capitalize">
                            {d.discount_type === 'percentage'
                              ? 'Percentage Discount'
                              : 'Fixed Amount Off'}
                          </span>
                        </div>
                      </td>

                      {/* Target Packages / Mysteries */}
                      <td className="px-6 py-5">{renderTargetsSummary(d)}</td>

                      {/* Schedule */}
                      <td className="px-6 py-5">
                        <div className="text-xs font-bold text-slate-700 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 w-10">
                              Start:
                            </span>
                            <span>{formatReadableDateTime(d.starts_at)}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 w-10">
                              End:
                            </span>
                            <span className={d.ends_at ? 'text-slate-700' : 'text-gray-400 italic'}>
                              {formatReadableDateTime(d.ends_at)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col items-start gap-1">
                          {status === 'active' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                              Active
                            </span>
                          )}
                          {status === 'scheduled' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-amber-200">
                              <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                              Scheduled
                            </span>
                          )}
                          {status === 'paused' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest rounded-full">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                              Paused
                            </span>
                          )}
                          {status === 'expired' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-rose-200">
                              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                              Expired
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-gray-400">
                            {d.usage_limit === 'one_per_customer'
                              ? '1 per customer'
                              : d.usage_limit === 'max_uses' && d.max_uses
                              ? `${d.times_used} / ${d.max_uses} used`
                              : 'Unlimited uses'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleToggleRowActive(d)}
                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-colors cursor-pointer ${
                              d.is_active
                                ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {d.is_active ? 'Pause' : 'Enable'}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => openEditModal(d)}
                            className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 hover:bg-brand-pink hover:text-white transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteRow(d)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Discount"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DISCOUNT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 p-6 sm:p-10 my-8">
            <div className="flex items-start justify-between gap-4 pb-6 border-b border-gray-100 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink block mb-1">
                  {editingId ? 'Update Promotion' : 'New Package Discount'}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tight">
                  {editingId ? 'Edit Discount' : 'Create Package Discount'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {formError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                  {formError}
                </div>
              )}

              {/* 1. Promotion Name & How It Applies */}
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-brand-dark">
                  1. Promotion Name &amp; Type
                </label>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[11px] font-bold text-gray-500 mb-1.5">
                      Campaign / Sale Name
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Weekend Flash Sale, Hens Night Promo"
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark focus:outline-none focus:border-brand-pink"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-gray-500">
                        Promo Code {autoApply ? '(Optional)' : '(Required)'}
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateRandomCode}
                        className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
                      >
                        ✨ Generate Code
                      </button>
                    </div>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder={autoApply ? 'Leave blank for auto-sale or add code' : 'e.g. MYSTERY20'}
                      className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-mono font-bold uppercase text-brand-dark focus:outline-none focus:border-brand-pink"
                    />
                  </div>
                </div>

                {/* Auto-apply toggle */}
                <div
                  onClick={() => setAutoApply(!autoApply)}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between gap-4 ${
                    autoApply
                      ? 'border-brand-pink bg-brand-pink/5'
                      : 'border-gray-200 bg-gray-50/60'
                  }`}
                >
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-brand-dark">
                      ⚡ Automatically Discount Selected Packages on Site
                    </p>
                    <p className="text-xs font-medium text-gray-500 mt-0.5">
                      When enabled, the discounted price &amp; strike-through original price will automatically appear on the targeted packages between your start and end date/time.
                    </p>
                  </div>
                  <div
                    className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
                      autoApply ? 'bg-brand-pink' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        autoApply ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Discount Amount (Fixed vs Percentage) */}
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-brand-dark">
                  2. How Much to Discount By (% or Fixed Amount)
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Type Selector */}
                  <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setDiscountType('percentage')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        discountType === 'percentage'
                          ? 'bg-brand-dark text-white shadow-sm'
                          : 'text-gray-500 hover:text-brand-dark'
                      }`}
                    >
                      % Percentage
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType('fixed')}
                      className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        discountType === 'fixed'
                          ? 'bg-brand-dark text-white shadow-sm'
                          : 'text-gray-500 hover:text-brand-dark'
                      }`}
                    >
                      $ Fixed Amount
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-black text-brand-pink">
                      {discountType === 'percentage' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      max={discountType === 'percentage' ? 100 : 500}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="w-full pl-10 pr-16 py-3.5 rounded-2xl border-2 border-gray-200 text-lg font-black text-brand-dark focus:outline-none focus:border-brand-pink"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black uppercase tracking-wider text-gray-400">
                      {discountType === 'percentage' ? '% OFF' : 'OFF'}
                    </span>
                  </div>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">
                    Quick Pick:
                  </span>
                  {(discountType === 'percentage'
                    ? ['10', '15', '20', '25', '30', '50']
                    : ['5', '10', '15', '20', '25']
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDiscountValue(preset)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        discountValue === preset
                          ? 'bg-brand-pink text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {discountType === 'percentage' ? `${preset}%` : `$${preset}`}
                    </button>
                  ))}
                </div>

                {/* Live Price Preview */}
                {numericPreviewVal > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-900 text-white">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-2.5">
                      Live Package Price Preview (USD Base)
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {previewTiers.map((t) => {
                        const calc = calculateDiscountedPrice(t.price, {
                          discount_type: discountType,
                          discount_value: numericPreviewVal,
                        });
                        return (
                          <div
                            key={t.id}
                            className="p-2.5 rounded-xl bg-white/5 border border-white/10"
                          >
                            <p className="text-[10px] font-bold text-gray-400">{t.label}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                              <span className="text-xs line-through text-gray-500">
                                ${t.price}
                              </span>
                              <span className="text-base font-black text-emerald-400">
                                ${calc.finalPrice}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Choose Particular Murder Mystery Packages */}
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-brand-dark">
                  3. Which Murder Mystery Packages to Discount
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(
                    [
                      { id: 'all', title: 'All Packages', sub: 'Every tier & story' },
                      { id: 'packages', title: 'Package Tiers', sub: 'Basic, Premium, Grand…' },
                      { id: 'mysteries', title: 'Specific Mysteries', sub: 'Pick individual stories' },
                      { id: 'custom', title: 'Custom Mix', sub: 'Tiers + specific stories' },
                    ] as const
                  ).map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setAppliesTo(mode.id)}
                      className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        appliesTo === mode.id
                          ? 'border-brand-pink bg-brand-pink/5'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <p className="text-xs font-black uppercase tracking-tight text-brand-dark">
                        {mode.title}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5">{mode.sub}</p>
                    </button>
                  ))}
                </div>

                {/* Package Tiers Selector */}
                {(appliesTo === 'packages' || appliesTo === 'custom') && (
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand-dark">
                        Select Package Tiers
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTargetPackages(
                            targetPackages.length === PACKAGE_TIER_OPTIONS.length
                              ? []
                              : PACKAGE_TIER_OPTIONS.map((p) => p.id)
                          )
                        }
                        className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
                      >
                        {targetPackages.length === PACKAGE_TIER_OPTIONS.length
                          ? 'Clear All'
                          : 'Select All Tiers'}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {PACKAGE_TIER_OPTIONS.map((pkg) => {
                        const checked = targetPackages.includes(pkg.id);
                        return (
                          <div
                            key={pkg.id}
                            onClick={() => togglePackageSelection(pkg.id)}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              checked
                                ? 'border-brand-pink bg-white shadow-sm'
                                : 'border-gray-200 bg-white/60 hover:border-gray-300'
                            }`}
                          >
                            <div>
                              <p className="text-xs font-black text-brand-dark">{pkg.name}</p>
                              <p className="text-[10px] font-bold text-gray-400">{pkg.subtitle}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-black text-brand-pink">
                                {pkg.basePriceUsd}
                              </span>
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black ${
                                  checked
                                    ? 'bg-brand-pink text-white'
                                    : 'border border-gray-300 bg-white'
                                }`}
                              >
                                {checked && '✓'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Specific Murder Mysteries Selector */}
                {(appliesTo === 'mysteries' || appliesTo === 'custom') && (
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-widest text-brand-dark">
                        Select Particular Murder Mystery Packages ({availableMysteries.length} Available)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setTargetMysteries(
                            targetMysteries.length > 0
                              ? []
                              : Array.from(
                                  new Set(
                                    availableMysteries.flatMap((m) => [m.slug, m.id])
                                  )
                                )
                          )
                        }
                        className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
                      >
                        {targetMysteries.length > 0 ? 'Clear Selection' : 'Select All Mysteries'}
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                      {availableMysteries.map((mys) => {
                        const checked =
                          targetMysteries.includes(mys.slug) ||
                          targetMysteries.includes(mys.id);
                        return (
                          <div
                            key={mys.slug}
                            onClick={() => toggleMysterySelection(mys)}
                            className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between gap-3 ${
                              checked
                                ? 'border-brand-pink bg-white shadow-sm'
                                : 'border-gray-200 bg-white/60 hover:border-gray-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-black text-brand-dark truncate">
                                {mys.title}
                              </p>
                              <p className="text-[10px] font-bold text-gray-400 truncate">
                                {mys.theme} • {(mys.complexity || 'medium').toUpperCase()}
                              </p>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0 ${
                                checked
                                  ? 'bg-brand-pink text-white'
                                  : 'border border-gray-300 bg-white'
                              }`}
                            >
                              {checked && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Start Date & Time and End Date & Time */}
              <div className="space-y-4">
                <label className="block text-xs font-black uppercase tracking-widest text-brand-dark">
                  4. Schedule Start Date &amp; Time and End Date &amp; Time
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Start Date & Time */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-dark">
                        Start Date &amp; Time
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setStartsAtLocal(toDatetimeLocalValue(new Date().toISOString()))
                        }
                        className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
                      >
                        Start Right Now
                      </button>
                    </div>
                    <input
                      type="datetime-local"
                      required
                      value={startsAtLocal}
                      onChange={(e) => setStartsAtLocal(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-brand-dark focus:outline-none focus:border-brand-pink"
                    />
                  </div>

                  {/* End Date & Time */}
                  <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-brand-dark">
                        End Date &amp; Time
                      </span>
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasEndDate}
                          onChange={(e) => setHasEndDate(e.target.checked)}
                          className="rounded text-brand-pink focus:ring-brand-pink"
                        />
                        Set End Date
                      </label>
                    </div>
                    {hasEndDate ? (
                      <input
                        type="datetime-local"
                        required={hasEndDate}
                        value={endsAtLocal}
                        onChange={(e) => setEndsAtLocal(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold text-brand-dark focus:outline-none focus:border-brand-pink"
                      />
                    ) : (
                      <div className="px-3.5 py-2.5 rounded-xl border border-dashed border-gray-200 bg-white/60 text-xs font-bold text-gray-400">
                        No expiration, runs until manually paused
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Schedule Duration Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-1">
                    Quick Duration from Start:
                  </span>
                  {[
                    { label: '24 Hours', hours: 24 },
                    { label: '48 Hours', hours: 48 },
                    { label: '7 Days', hours: 24 * 7 },
                    { label: '14 Days', hours: 24 * 14 },
                    { label: '30 Days', hours: 24 * 30 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => applyDurationPreset(preset.hours)}
                      className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-brand-pink hover:text-white text-gray-600 text-[11px] font-black transition-colors cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setHasEndDate(false)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                      !hasEndDate
                        ? 'bg-brand-dark text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    No End Date
                  </button>
                </div>
              </div>

              {/* 5. Usage Limits */}
              <div className="space-y-3">
                <label className="block text-xs font-black uppercase tracking-widest text-brand-dark">
                  5. Usage Limits
                </label>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: 'unlimited', label: 'Unlimited Uses' },
                      { id: 'one_per_customer', label: '1 Per Customer' },
                      { id: 'max_uses', label: 'Max Total Redemptions' },
                    ] as const
                  ).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUsageLimit(u.id)}
                      className={`p-3 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        usageLimit === u.id
                          ? 'border-brand-pink bg-brand-pink/5 text-brand-pink'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </div>
                {usageLimit === 'max_uses' && (
                  <div className="pt-2 max-w-xs">
                    <span className="block text-[11px] font-bold text-gray-500 mb-1">
                      Maximum Number of Redemptions
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-brand-dark"
                    />
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-full bg-brand-pink text-white text-xs font-black uppercase tracking-widest shadow-lg hover:bg-brand-dark transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? 'Saving...'
                    : editingId
                    ? 'Save Changes'
                    : 'Create Discount'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
