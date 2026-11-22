'use client';

import React, { useActionState, useState, useCallback } from 'react';
import Link from 'next/link';
import { updatePublishingAction } from './actions';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';
import { MysteryPreLaunchQaPanel } from '@/components/builder/MysteryPreLaunchQaPanel';

interface PublishingFormProps {
  mystery: {
    id: string;
    status: string;
    title: string;
    min_players?: number | null;
    max_players?: number | null;
    sale_enabled?: boolean;
    sale_label?: string | null;
    sale_discount_pct?: number | null;
    sale_ends_at?: string | null;
  };
  characterCount?: number;
  locale?: string;
}

const STATUS_OPTIONS = [
  {
    value: 'draft',
    label: 'Draft',
    desc: 'Only visible to you. Not available for purchase.',
    dot: 'bg-slate-400',
    ring: 'ring-slate-400',
    text: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200',
    activeBg: 'bg-slate-900 border-slate-900',
    activeText: 'text-white',
  },
  {
    value: 'published',
    label: 'Live',
    desc: 'Publicly visible and available to purchase.',
    dot: 'bg-green-400',
    ring: 'ring-green-400',
    text: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
    activeBg: 'bg-green-600 border-green-600',
    activeText: 'text-white',
  },
  {
    value: 'archived',
    label: 'Archived',
    desc: 'Hidden from the public. Existing buyers retain access.',
    dot: 'bg-amber-400',
    ring: 'ring-amber-400',
    text: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-500 border-amber-500',
    activeText: 'text-white',
  },
];

export function PublishingForm({ mystery, characterCount = 0, locale = 'en' }: PublishingFormProps) {
  const boundAction = updatePublishingAction.bind(null, mystery.id);
  const [state, formAction, isPending] = useActionState(boundAction, null);

  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);
  const hasRequiredCharacters = characterCount >= pkgInfo.requiredCharacters;
  const missingCharacters = Math.max(0, pkgInfo.requiredCharacters - characterCount);

  const [isQaCertified, setIsQaCertified] = useState<boolean>(false);
  const [qaScore, setQaScore] = useState<number>(0);
  const [adminOverrideQaGate, setAdminOverrideQaGate] = useState<boolean>(false);

  const handleCertificationChange = useCallback((certified: boolean, score: number) => {
    setIsQaCertified(certified);
    setQaScore(score);
  }, []);

  const canPublish =
    hasRequiredCharacters &&
    (isQaCertified || adminOverrideQaGate || mystery.status === 'published');

  const [selectedStatus, setSelectedStatus] = useState(
    !hasRequiredCharacters && mystery.status === 'published' ? 'draft' : mystery.status || 'draft'
  );
  const [saleEnabled, setSaleEnabled] = useState(mystery.sale_enabled ?? false);
  const [marketingQueued, setMarketingQueued] = useState(false);
  const [isQueuingMarketing, setIsQueuingMarketing] = useState(false);
  const [marketingMsg, setMarketingMsg] = useState<string | null>(null);

  const isLiveNow =
    selectedStatus === 'published' && (mystery.status === 'published' || state?.success);

  const handleRunLaunchMarketing = async () => {
    try {
      setIsQueuingMarketing(true);
      setMarketingMsg(null);
      const res = await fetch('/api/admin/marketing-launch-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mysteryId: mystery.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to queue launch marketing');
      setMarketingQueued(true);
      setMarketingMsg(
        json.message ||
          `Queued IG/FB + LinkedIn launch drafts and added "${mystery.title}" to the Weekly EDM!`
      );
    } catch (err: any) {
      setMarketingMsg(`Error: ${err.message}`);
    } finally {
      setIsQueuingMarketing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 20x Pre-Launch Automated Stress-Test & Stability Review */}
      <MysteryPreLaunchQaPanel
        mysteryId={mystery.id}
        mysteryTitle={mystery.title}
        locale={locale}
        onCertificationChange={handleCertificationChange}
      />

      <form action={formAction} className="space-y-8">
        {/* Live Mystery Marketing Prompt Banner */}
        {isLiveNow && (
          <div className="p-6 rounded-2xl bg-gradient-to-r from-brand-dark via-slate-900 to-brand-dark text-white border-2 border-brand-pink shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                <span>📣 Mystery Pack Is Live</span>
              </div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                Run Launch Marketing for &ldquo;{mystery.title}&rdquo;?
              </h3>
              <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
                Automatically queue a draft <strong>Instagram &amp; Facebook 8-template social card post</strong>, a <strong>600–700 word LinkedIn product launch post</strong>, and inject the <strong>New Mystery Base Pack Spotlight</strong> into this week&apos;s Friday EDM for your review.
              </p>
              {marketingMsg && (
                <p
                  className={`text-xs font-bold pt-1 ${
                    marketingMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {marketingMsg}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {!marketingQueued ? (
                <button
                  type="button"
                  disabled={isQueuingMarketing}
                  onClick={handleRunLaunchMarketing}
                  className="px-5 py-3 rounded-xl bg-brand-pink hover:bg-pink-500 text-white text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50"
                >
                  {isQueuingMarketing ? 'Queuing Campaign…' : '🚀 Run Launch Marketing'}
                </button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/admin/social/instagram-facebook"
                    className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-wider"
                  >
                    Review IG/FB →
                  </Link>
                  <Link
                    href="/admin/social/linkedin"
                    className="px-3.5 py-2.5 rounded-xl bg-[#0A66C2] hover:bg-[#084e96] text-white text-[11px] font-black uppercase tracking-wider"
                  >
                    Review LinkedIn →
                  </Link>
                  <Link
                    href="/admin/edm"
                    className="px-3.5 py-2.5 rounded-xl bg-brand-pink hover:bg-pink-500 text-white text-[11px] font-black uppercase tracking-wider"
                  >
                    Review Weekly EDM →
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Visibility Status</h2>
              <p className="text-xs text-slate-400 mt-1">Control whether this mystery is publicly available.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                {pkgInfo.label} ({pkgInfo.rangeLabel}) • ${pkgInfo.baseUsd} Base
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  hasRequiredCharacters
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {characterCount} / {pkgInfo.requiredCharacters} Characters
              </span>
              <span
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                  isQaCertified
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {isQaCertified
                  ? `✅ 20× QA Certified (${qaScore}%)`
                  : qaScore > 0
                  ? `⚠️ 20× QA Score: ${qaScore}%`
                  : '🧪 20× QA Required'}
              </span>
            </div>
          </div>

          {!hasRequiredCharacters && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                  🔒 Publishing Locked - {missingCharacters} More Character{missingCharacters === 1 ? '' : 's'} Required
                </p>
                <p className="text-xs text-amber-700 font-medium mt-0.5">
                  This mystery is assigned to the <strong>{pkgInfo.label} ({pkgInfo.rangeLabel})</strong>, which requires all <strong>{pkgInfo.requiredCharacters} characters</strong> to be created before you can post it live (currently has {characterCount}).
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/${locale}/builder/mysteries/${mystery.id}`}
                  className="px-3.5 py-2 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Change Package
                </Link>
                <Link
                  href={`/${locale}/builder/mysteries/${mystery.id}/characters`}
                  className="px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  Add Characters →
                </Link>
              </div>
            </div>
          )}

          {hasRequiredCharacters && !isQaCertified && mystery.status !== 'published' && (
            <div className="mx-6 mt-6 p-4 rounded-xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                  🧪 Pre-Launch 20× QA Certification Gate
                </p>
                <p className="text-xs text-indigo-800 font-medium mt-0.5">
                  Run the <strong>20× Pre-Launch Stress Test</strong> above (90%+ Stability Score) to unlock the <strong>Live</strong> status, or tick the admin bypass to override.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-black text-indigo-950 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={adminOverrideQaGate}
                  onChange={(e) => setAdminOverrideQaGate(e.target.checked)}
                  className="rounded border-indigo-300 text-brand-pink focus:ring-brand-pink"
                />
                <span>Admin Override Gate</span>
              </label>
            </div>
          )}

          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STATUS_OPTIONS.map(opt => {
              const isLocked = opt.value === 'published' && !canPublish;
              const isActive = selectedStatus === opt.value && !isLocked;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isLocked}
                  onClick={() => {
                    if (!isLocked) setSelectedStatus(opt.value);
                  }}
                  className={`relative flex flex-col gap-2 p-5 rounded-xl border-2 text-left transition-all ${
                    isLocked
                      ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                      : isActive
                      ? `${opt.activeBg} ${opt.activeText} shadow-md`
                      : `${opt.bg} hover:shadow-sm`
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-white/80' : opt.dot}`} />
                    <span className={`text-sm font-black uppercase tracking-widest ${isActive ? opt.activeText : opt.text}`}>
                      {isLocked ? `🔒 ${opt.label}` : opt.label}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                    {isLocked
                      ? !hasRequiredCharacters
                        ? `Requires ${pkgInfo.requiredCharacters} characters (${missingCharacters} more needed) before going Live.`
                        : 'Requires 20× Pre-Launch Stress Test Certification (or Admin Override) before going Live.'
                      : opt.desc}
                  </p>
                  {isActive && (
                    <span className="absolute top-3 right-3 text-white text-sm">✓</span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Hidden input carrying the selected status value */}
          <input type="hidden" name="status" value={selectedStatus} />
        </div>

      {/* Sale Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Sale / Promotion</h2>
            <p className="text-xs text-slate-400 mt-1">Run a time-limited discount on this mystery.</p>
          </div>
          {/* Toggle */}
          <button
            type="button"
            onClick={() => setSaleEnabled(!saleEnabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              saleEnabled ? 'bg-brand-pink' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                saleEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <input type="hidden" name="sale_enabled" value={saleEnabled.toString()} />
        </div>

        {saleEnabled ? (
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Sale Label
              </label>
              <input
                type="text"
                name="sale_label"
                defaultValue={mystery.sale_label ?? ''}
                placeholder="e.g. Summer Sale, Launch Offer"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Discount %
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="sale_discount_pct"
                  defaultValue={mystery.sale_discount_pct ?? ''}
                  min={1}
                  max={90}
                  placeholder="e.g. 20"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50 pr-10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-slate-500 mb-2">
                Sale Ends At
              </label>
              <input
                type="datetime-local"
                name="sale_ends_at"
                defaultValue={mystery.sale_ends_at ? mystery.sale_ends_at.slice(0, 16) : ''}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 bg-slate-50"
              />
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">
            Toggle the switch above to configure a sale or promotional discount.
          </div>
        )}
      </div>

      {/* Save Button & Feedback */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="px-8 py-4 bg-slate-900 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>

        {state?.success && (
          <span className="text-sm text-green-600 font-bold flex items-center gap-1.5">
            <span>✓</span> Changes saved
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-500 font-bold">
            Error: {state.error}
          </span>
        )}
      </div>
    </form>
    </div>
  );
}
