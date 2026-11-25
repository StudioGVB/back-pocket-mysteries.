'use client';

import React, { useMemo, useState } from 'react';
import { ReviewActions } from '@/app/[locale]/(admin)/admin/reviews/ReviewActions';
import {
  bulkUpdateReviews,
  assignReviewMysteryBaseAction,
} from '@/app/actions/reviews';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/utils/date';

interface BaseReviewStat {
  title: string;
  count: number;
  avgRating: number;
  fiveStarCount: number;
  publishedCount: number;
  sharePercent: number;
}

export default function ReviewsTable({
  reviews,
  availableBases = [],
  totalCompletedOrders = 0,
}: {
  reviews: any[];
  availableBases?: string[];
  totalCompletedOrders?: number;
}) {
  const [selectedReview, setSelectedReview] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'published' | 'photos'>('all');
  const [starFilter, setStarFilter] = useState<number | null>(null);
  const [baseFilter, setBaseFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [savingBaseTag, setSavingBaseTag] = useState(false);
  const [isBaseDropdownOpen, setIsBaseDropdownOpen] = useState(false);
  const router = useRouter();

  // Compute full review analytics
  const analytics = useMemo(() => {
    const total = reviews.length;
    const publishedCount = reviews.filter((r) => r.status === 'published').length;
    const pendingCount = reviews.filter((r) => r.status !== 'published').length;
    const withPhotosCount = reviews.filter(
      (r) => Array.isArray(r.attachment_urls) && r.attachment_urls.length > 0
    ).length;

    const sumRating = reviews.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
    const avgRating = total > 0 ? Number((sumRating / total).toFixed(2)) : 0;

    const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalWords = 0;

    const baseMap = new Map<
      string,
      { count: number; sumRating: number; fiveStarCount: number; publishedCount: number }
    >();

    for (const r of reviews) {
      const rating = Math.min(5, Math.max(1, Math.round(Number(r.rating) || 5)));
      starCounts[rating] = (starCounts[rating] || 0) + 1;

      const words = String(r.review_text || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean).length;
      totalWords += words;

      const baseTitle = r.mysteryBaseTitle || 'General / Custom Mystery';
      const prev = baseMap.get(baseTitle) || {
        count: 0,
        sumRating: 0,
        fiveStarCount: 0,
        publishedCount: 0,
      };
      prev.count += 1;
      prev.sumRating += rating;
      if (rating === 5) prev.fiveStarCount += 1;
      if (r.status === 'published') prev.publishedCount += 1;
      baseMap.set(baseTitle, prev);
    }

    const fiveStarRate = total > 0 ? Math.round((starCounts[5] / total) * 100) : 0;
    const positiveRate =
      total > 0 ? Math.round(((starCounts[5] + starCounts[4]) / total) * 100) : 0;
    const avgWords = total > 0 ? Math.round(totalWords / total) : 0;
    const conversionRate =
      totalCompletedOrders > 0
        ? Number(Math.min(100, (total / totalCompletedOrders) * 100).toFixed(1))
        : total > 0
        ? 100
        : 0;

    const baseLeaderboard: BaseReviewStat[] = Array.from(baseMap.entries())
      .map(([title, stat]) => ({
        title,
        count: stat.count,
        avgRating: Number((stat.sumRating / stat.count).toFixed(2)),
        fiveStarCount: stat.fiveStarCount,
        publishedCount: stat.publishedCount,
        sharePercent: total > 0 ? Math.round((stat.count / total) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating);

    const mostReviewedBase = baseLeaderboard[0] || null;
    const highestRatedBase =
      [...baseLeaderboard].sort((a, b) => b.avgRating - a.avgRating || b.count - a.count)[0] ||
      null;

    return {
      total,
      publishedCount,
      pendingCount,
      withPhotosCount,
      avgRating,
      starCounts,
      fiveStarRate,
      positiveRate,
      avgWords,
      conversionRate,
      baseLeaderboard,
      mostReviewedBase,
      highestRatedBase,
    };
  }, [reviews, totalCompletedOrders]);

  // Filter reviews for table
  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      if (filter === 'pending' && review.status === 'published') return false;
      if (filter === 'published' && review.status !== 'published') return false;
      if (
        filter === 'photos' &&
        (!Array.isArray(review.attachment_urls) || review.attachment_urls.length === 0)
      ) {
        return false;
      }
      if (starFilter !== null && Math.round(Number(review.rating) || 5) !== starFilter) {
        return false;
      }
      if (baseFilter !== null && (review.mysteryBaseTitle || 'General / Custom Mystery') !== baseFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = String(review.name || '').toLowerCase().includes(q);
        const matchText = String(review.review_text || '').toLowerCase().includes(q);
        const matchBase = String(review.mysteryBaseTitle || '').toLowerCase().includes(q);
        if (!matchName && !matchText && !matchBase) return false;
      }
      return true;
    });
  }, [reviews, filter, starFilter, baseFilter, searchQuery]);

  const toggleSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredReviews.length && filteredReviews.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredReviews.map((r) => r.id)));
    }
  };

  const handleBulkAction = async (action: 'publish' | 'unpublish' | 'delete') => {
    setLoadingAction(action);
    await bulkUpdateReviews(Array.from(selectedIds), action);
    setSelectedIds(new Set());
    setLoadingAction(null);
    router.refresh();
  };

  const handlePublishAllPending = async () => {
    const pendingIds = reviews.filter((r) => r.status !== 'published').map((r) => r.id);
    if (pendingIds.length === 0) return;
    setLoadingAction('publish_all');
    await bulkUpdateReviews(pendingIds, 'publish');
    setLoadingAction(null);
    router.refresh();
  };

  const handleAssignBase = async (reviewId: string, nextBaseTitle: string) => {
    setIsBaseDropdownOpen(false);
    setSavingBaseTag(true);
    await assignReviewMysteryBaseAction(reviewId, nextBaseTitle);
    setSavingBaseTag(false);
    if (selectedReview && selectedReview.id === reviewId) {
      setSelectedReview({ ...selectedReview, mysteryBaseTitle: nextBaseTitle });
    }
    router.refresh();
  };

  const allBaseOptions = useMemo(() => {
    const deprecated = new Set([
      'ho ho homicide',
      'midnight at the manor',
      'testing',
      'test',
      'untitled mystery',
    ]);
    const set = new Set<string>([
      'Christmas Nightmare',
      'Love On The Rocks',
      ...availableBases.filter((b) => b && !deprecated.has(b.toLowerCase().trim())),
      ...analytics.baseLeaderboard
        .map((b) => b.title)
        .filter((b) => b && !deprecated.has(b.toLowerCase().trim())),
      'General / Custom Mystery',
    ]);
    return Array.from(set).filter(Boolean);
  }, [availableBases, analytics.baseLeaderboard]);

  return (
    <div className="space-y-6">
      {/* =====================================================================
          ROW 1: TOP 4 REVIEW INTELLIGENCE KPI CARDS
      ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Average Star Rating */}
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Average Star Rating
            </p>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-wider">
              {analytics.fiveStarRate}% 5-Star
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-3">
            <p className="text-4xl font-black text-brand-dark">
              {analytics.avgRating > 0 ? analytics.avgRating.toFixed(1) : '—'}
            </p>
            <div className="flex gap-0.5 text-brand-pink">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(analytics.avgRating || 5)
                      ? 'fill-current'
                      : 'text-gray-200 fill-current'
                  }`}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              ))}
            </div>
          </div>
          <p className="text-xs font-semibold text-gray-400">
            Across {analytics.total} customer {analytics.total === 1 ? 'review' : 'reviews'} ({analytics.positiveRate}% positive)
          </p>
        </div>

        {/* Card 2: Most Reviewed Mystery Base */}
        <div
          onClick={() => {
            if (analytics.mostReviewedBase) {
              setBaseFilter(
                baseFilter === analytics.mostReviewedBase.title
                  ? null
                  : analytics.mostReviewedBase.title
              );
            }
          }}
          className="bg-brand-dark text-white p-6 rounded-[28px] border border-brand-dark shadow-sm flex flex-col justify-between cursor-pointer hover:border-brand-pink transition-all group"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
              Most Reviewed Base
            </p>
            {analytics.mostReviewedBase && (
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-wider">
                ★ {analytics.mostReviewedBase.avgRating.toFixed(1)}
              </span>
            )}
          </div>
          <div className="my-2">
            <p className="text-xl font-black text-white leading-tight line-clamp-2 group-hover:text-brand-pink transition-colors">
              {analytics.mostReviewedBase ? analytics.mostReviewedBase.title : 'No Reviews Yet'}
            </p>
          </div>
          <p className="text-xs font-semibold text-gray-400">
            {analytics.mostReviewedBase
              ? `${analytics.mostReviewedBase.count} ${
                  analytics.mostReviewedBase.count === 1 ? 'review' : 'reviews'
                } (${analytics.mostReviewedBase.sharePercent}% of all reviews) • Click to filter`
              : 'Reviews will auto-group by Mystery Base'}
          </p>
        </div>

        {/* Card 3: Publishing & Moderation Queue */}
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Moderation Queue
            </p>
            {analytics.pendingCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider">
                {analytics.pendingCount} Pending
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                All Clear
              </span>
            )}
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className="text-4xl font-black text-emerald-600">{analytics.publishedCount}</p>
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">
              Live / {analytics.total} Total
            </span>
          </div>
          {analytics.pendingCount > 0 ? (
            <button
              type="button"
              disabled={loadingAction !== null}
              onClick={handlePublishAllPending}
              className="text-left text-xs font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
            >
              {loadingAction === 'publish_all'
                ? 'Publishing...'
                : `⚡ Publish All ${analytics.pendingCount} Pending →`}
            </button>
          ) : (
            <p className="text-xs font-semibold text-gray-400">
              100% of reviews published to public site
            </p>
          )}
        </div>

        {/* Card 4: Order-to-Review Conversion & UGC Depth */}
        <div className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Review Conversion &amp; UGC
            </p>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider">
              📸 {analytics.withPhotosCount} With Photos
            </span>
          </div>
          <div className="my-3 flex items-baseline gap-2">
            <p className="text-4xl font-black text-brand-dark">{analytics.conversionRate}%</p>
            <span className="text-xs font-bold text-gray-400">of orders reviewed</span>
          </div>
          <p className="text-xs font-semibold text-gray-400">
            Avg review length: <span className="font-black text-brand-dark">{analytics.avgWords} words</span>
          </p>
        </div>
      </div>

      {/* =====================================================================
          ROW 2: STAR RATING DISTRIBUTION + MYSTERY BASE LEADERBOARD
      ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Star Rating Distribution (5★ to 1★) */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Rating Breakdown
              </p>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                Star Distribution
              </h3>
            </div>
            {starFilter !== null && (
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline cursor-pointer"
              >
                Clear {starFilter}★ Filter ✕
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = analytics.starCounts[star] || 0;
              const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0;
              const isSelected = starFilter === star;
              return (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStarFilter(isSelected ? null : star)}
                  className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-pink/10 ring-1 ring-brand-pink'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="w-12 text-left text-xs font-black text-brand-dark flex items-center gap-1">
                    {star} <span className="text-brand-pink">★</span>
                  </span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        star >= 4
                          ? 'bg-brand-pink'
                          : star === 3
                          ? 'bg-amber-400'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-xs font-black text-gray-500">
                    {count} <span className="text-[10px] text-gray-400">({pct}%)</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Reviews by Mystery Base Leaderboard */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Reviews by Theme / Base
              </p>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                Mystery Base Review Leaderboard
              </h3>
            </div>
            {baseFilter !== null && (
              <button
                type="button"
                onClick={() => setBaseFilter(null)}
                className="text-[10px] font-black uppercase tracking-widest text-brand-pink hover:underline cursor-pointer"
              >
                Show All Bases ✕
              </button>
            )}
          </div>

          {analytics.baseLeaderboard.length > 0 ? (
            <div className="space-y-3">
              {analytics.baseLeaderboard.map((base, idx) => {
                const isSelected = baseFilter === base.title;
                return (
                  <button
                    key={base.title}
                    type="button"
                    onClick={() => setBaseFilter(isSelected ? null : base.title)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      isSelected
                        ? 'bg-brand-dark text-white border-brand-dark shadow-md'
                        : 'bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/70 text-brand-dark'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-xl text-[11px] font-black flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-brand-pink text-white'
                            : isSelected
                            ? 'bg-white/15 text-white'
                            : 'bg-white text-gray-500 border border-gray-200'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-black truncate ${
                            isSelected ? 'text-white' : 'text-brand-dark'
                          }`}
                        >
                          {base.title}
                        </p>
                        <p
                          className={`text-[11px] font-semibold ${
                            isSelected ? 'text-gray-300' : 'text-gray-400'
                          }`}
                        >
                          {base.count} {base.count === 1 ? 'review' : 'reviews'} •{' '}
                          {base.publishedCount} published • {base.sharePercent}% share
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-xl text-xs font-black ${
                          isSelected
                            ? 'bg-brand-pink text-white'
                            : 'bg-white border border-gray-200 text-brand-dark'
                        }`}
                      >
                        ★ {base.avgRating.toFixed(1)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs font-bold text-gray-400">
              No reviews recorded yet.
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          ROW 3: FILTER TABS + SEARCH BAR
      ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-gray-100 p-1 rounded-full">
            {[
              { id: 'all', label: `All (${analytics.total})` },
              { id: 'pending', label: `Pending (${analytics.pendingCount})` },
              { id: 'published', label: `Published (${analytics.publishedCount})` },
              { id: 'photos', label: `📸 With Photos (${analytics.withPhotosCount})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                  filter === f.id
                    ? 'bg-white text-brand-dark shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {starFilter !== null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
              {starFilter}★ Only
              <button
                type="button"
                onClick={() => setStarFilter(null)}
                className="ml-1 hover:opacity-80 cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}

          {baseFilter !== null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-widest">
              Base: {baseFilter}
              <button
                type="button"
                onClick={() => setBaseFilter(null)}
                className="ml-1 hover:opacity-80 cursor-pointer"
              >
                ✕
              </button>
            </span>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reviewer, base, or quote..."
            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-brand-dark outline-none focus:border-brand-pink"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-brand-dark"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          ROW 4: REVIEWS TABLE
      ===================================================================== */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-widest text-[10px]">
            <tr>
              <th className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === filteredReviews.length}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                />
              </th>
              <th className="px-4 py-4">Customer</th>
              <th className="px-4 py-4">Mystery Base</th>
              <th className="px-4 py-4">Rating</th>
              <th className="px-4 py-4">Review</th>
              <th className="px-4 py-4">Date</th>
              <th className="px-4 py-4">Status</th>
              <th className="px-4 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredReviews.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-400 font-medium">
                  No matching reviews found.
                </td>
              </tr>
            ) : (
              filteredReviews.map((review) => (
                <tr
                  key={review.id}
                  onClick={() => {
                    setIsBaseDropdownOpen(false);
                    setSelectedReview(review);
                  }}
                  className="hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(review.id)}
                      onChange={(e) => toggleSelection(review.id, e as any)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-pink focus:ring-brand-pink cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-4 font-bold text-brand-dark group-hover:text-brand-pink transition-colors">
                    {review.name}
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-black">
                      {review.mysteryBaseTitle || 'General / Custom Mystery'}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1 text-brand-pink">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${
                            i < review.rating ? 'fill-current' : 'text-gray-200 fill-current'
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-500 max-w-xs truncate" title={review.review_text}>
                      {review.review_text}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-400 font-medium whitespace-nowrap">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        review.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {review.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <ReviewActions review={review} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-10 z-40">
          <span className="text-sm font-black tracking-widest uppercase">
            <span className="text-brand-pink mr-2">{selectedIds.size}</span>
            Selected
          </span>
          <div className="w-px h-6 bg-gray-700"></div>
          <button
            onClick={() => handleBulkAction('publish')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest hover:text-brand-pink transition-colors"
          >
            {loadingAction === 'publish' ? 'Processing...' : 'Publish'}
          </button>
          <button
            onClick={() => handleBulkAction('unpublish')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest hover:text-white/70 transition-colors"
          >
            {loadingAction === 'unpublish' ? 'Processing...' : 'Unpublish'}
          </button>
          <button
            onClick={() => handleBulkAction('delete')}
            disabled={loadingAction !== null}
            className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors"
          >
            {loadingAction === 'delete' ? 'Processing...' : 'Delete'}
          </button>
        </div>
      )}

      {/* Review Detail & Mystery Base Assignment Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="absolute inset-0"
            onClick={() => {
              setIsBaseDropdownOpen(false);
              setSelectedReview(null);
            }}
          ></div>
          <div className="relative bg-white rounded-[32px] shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setIsBaseDropdownOpen(false);
                setSelectedReview(null);
              }}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-brand-pink hover:bg-brand-pink/10 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-brand-dark uppercase tracking-tight">
                  Customer Review
                </h3>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  {new Date(selectedReview.created_at).toLocaleString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Customer Name
                  </p>
                  <p className="text-base font-bold text-brand-dark">{selectedReview.name}</p>
                </div>

                <div className="relative">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    Assigned Mystery Base
                  </p>
                  <button
                    type="button"
                    disabled={savingBaseTag}
                    onClick={() => setIsBaseDropdownOpen((prev) => !prev)}
                    className={`min-w-[220px] px-3.5 py-2 rounded-xl bg-white border text-xs font-black text-brand-dark flex items-center justify-between gap-3 transition-all cursor-pointer shadow-2xs ${
                      isBaseDropdownOpen
                        ? 'border-brand-pink ring-2 ring-brand-pink/15'
                        : 'border-gray-200 hover:border-brand-pink/50'
                    } ${savingBaseTag ? 'opacity-60 cursor-wait' : ''}`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-brand-pink shrink-0" />
                      <span className="truncate">
                        {selectedReview.mysteryBaseTitle || 'General / Custom Mystery'}
                      </span>
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${
                        isBaseDropdownOpen ? 'rotate-180 text-brand-pink' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isBaseDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsBaseDropdownOpen(false)}
                      />
                      <div className="absolute left-0 top-full mt-2 w-64 rounded-2xl bg-white border border-gray-100 shadow-[0_20px_50px_rgba(15,23,42,0.16)] p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-50 mb-1">
                          Select Mystery Base
                        </div>
                        <div className="space-y-0.5 max-h-60 overflow-y-auto">
                          {allBaseOptions.map((base) => {
                            const currentVal =
                              selectedReview.mysteryBaseTitle || 'General / Custom Mystery';
                            const isSelected = currentVal === base;
                            return (
                              <button
                                key={base}
                                type="button"
                                onClick={() => handleAssignBase(selectedReview.id, base)}
                                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-brand-pink/10 text-brand-pink font-black'
                                    : 'text-brand-dark hover:bg-gray-50'
                                }`}
                              >
                                <span className="truncate">{base}</span>
                                {isSelected && (
                                  <svg
                                    className="w-4 h-4 text-brand-pink shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Rating
                  </p>
                  <div className="flex gap-1 text-brand-pink justify-end">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${
                          i < selectedReview.rating ? 'fill-current' : 'text-gray-200 fill-current'
                        }`}
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Review Content
                </p>
                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 relative">
                  <span className="text-6xl text-brand-pink/20 absolute top-4 left-4 font-serif">
                    &ldquo;
                  </span>
                  <p className="text-base text-gray-700 leading-relaxed relative z-10 italic">
                    {selectedReview.review_text}
                  </p>
                </div>
              </div>

              {selectedReview.attachment_urls && selectedReview.attachment_urls.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Attached Photos
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {selectedReview.attachment_urls.map((url: string, idx: number) => {
                      const isImage =
                        url.startsWith('data:image/') ||
                        url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null ||
                        url.includes('mock-storage');
                      return (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group relative block aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-brand-pink transition-colors"
                        >
                          {isImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={url}
                              alt={`Photo ${idx + 1}`}
                              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 group-hover:text-brand-pink transition-colors">
                              <svg
                                className="w-8 h-8 mb-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                />
                              </svg>
                              <span className="text-xs font-bold">Document</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 bg-white/90 text-brand-dark px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-sm shadow-sm transition-all scale-95 group-hover:scale-100">
                              View
                            </span>
                          </div>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 flex justify-end gap-3 items-center">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mr-auto ${
                  selectedReview.status === 'published'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                Current Status: {selectedReview.status}
              </span>
              <button
                onClick={() => setSelectedReview(null)}
                className="px-6 py-3 rounded-full font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <ReviewActions review={selectedReview} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
