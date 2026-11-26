"use client";

import React, { useState, useMemo } from "react";
import {
  Eye,
  Users,
  Heart,
  Share2,
  MousePointerClick,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Clock,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";

export interface ParsedBufferMetrics {
  views: number;
  impressions: number;
  reach: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
  follows: number;
  engagementRate: number;
}

export interface BufferPostItem {
  id: string;
  status: string;
  channelService: string;
  channelId: string;
  dueAt: string | null;
  sentAt: string | null;
  externalLink: string | null;
  text: string;
  metricsUpdatedAt: string | null;
  parsedMetrics: ParsedBufferMetrics;
}

export interface PlatformAnalyticsSummary {
  sentCount: number;
  scheduledCount: number;
  totalViews: number;
  totalReach: number;
  totalReactions: number;
  totalComments: number;
  totalShares: number;
  totalSaves: number;
  totalClicks: number;
  totalFollows: number;
  avgEngagementRate: number;
}

export type BrandFilter = "bpm" | "prottack" | "all";
export type TimeRangeFilter = "7d" | "30d" | "all";

function normalizeTextForMatch(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 75);
}

/**
 * Classifies whether a Buffer post belongs to Back Pocket Mysteries ('bpm')
 * or Prottack / legacy channel history ('prottack').
 */
export function classifyBufferPostBrand(post: BufferPostItem): "bpm" | "prottack" {
  const text = (post.text || "").toLowerCase();
  const dateStr = post.sentAt || post.dueAt || "";
  const postYearMonth = dateStr.slice(0, 7); // e.g. "2026-11"

  const hasBpmKeywords =
    text.includes("back pocket mysteries") ||
    text.includes("#backpocketmysteries") ||
    text.includes("backpocketmysteries.com") ||
    text.includes("#freemurdermystery") ||
    text.includes("#murdermysteryparty") ||
    text.includes("murder mystery party") ||
    text.includes("custom murder mystery") ||
    text.includes("love on the rocks") ||
    text.includes("#loveontherocks") ||
    text.includes("christmas nightmare") ||
    text.includes("#christmasnightmare") ||
    text.includes("audio wiretap") ||
    text.includes("cctv") ||
    text.includes("crime scene") ||
    text.includes("spoiler-free host");

  // All Back Pocket Mysteries launch & ongoing campaign posts (Nov 2026+)
  if (hasBpmKeywords && (!postYearMonth || postYearMonth >= "2026-11")) {
    return "bpm";
  }

  return "prottack";
}

export function computeSummaryFromBufferPosts(
  posts: BufferPostItem[]
): PlatformAnalyticsSummary {
  const sentPosts = posts.filter((p) => p.status === "sent");
  const scheduledPosts = posts.filter(
    (p) => p.status === "scheduled" || p.status === "buffer" || p.status === "queued"
  );

  let totalViews = 0;
  let totalReach = 0;
  let totalReactions = 0;
  let totalComments = 0;
  let totalShares = 0;
  let totalSaves = 0;
  let totalClicks = 0;
  let totalFollows = 0;
  let engRateSum = 0;
  let engRateCount = 0;

  for (const p of sentPosts) {
    const m = p.parsedMetrics;
    totalViews += m.views > 0 ? m.views : m.impressions;
    totalReach += m.reach;
    totalReactions += m.reactions;
    totalComments += m.comments;
    totalShares += m.shares;
    totalSaves += m.saves;
    totalClicks += m.clicks;
    totalFollows += m.follows;
    if (m.engagementRate > 0) {
      engRateSum += m.engagementRate;
      engRateCount += 1;
    }
  }

  return {
    sentCount: sentPosts.length,
    scheduledCount: scheduledPosts.length,
    totalViews,
    totalReach,
    totalReactions,
    totalComments,
    totalShares,
    totalSaves,
    totalClicks,
    totalFollows,
    avgEngagementRate:
      engRateCount > 0 ? Number((engRateSum / engRateCount).toFixed(2)) : 0,
  };
}

export function filterBufferPostsByBrandAndTime(
  posts: BufferPostItem[],
  brand: BrandFilter,
  timeRange: TimeRangeFilter
): BufferPostItem[] {
  const nowMs = Date.now();
  const cutoffMs =
    timeRange === "7d"
      ? nowMs - 7 * 24 * 60 * 60 * 1000
      : timeRange === "30d"
      ? nowMs - 30 * 24 * 60 * 60 * 1000
      : 0;

  return posts.filter((p) => {
    if (brand !== "all") {
      const postBrand = classifyBufferPostBrand(p);
      if (postBrand !== brand) return false;
    }

    if (cutoffMs > 0) {
      // Always include future scheduled/queued posts; filter sent posts by cutoff
      if (p.status === "sent" && p.sentAt) {
        const sentMs = new Date(p.sentAt).getTime();
        if (!Number.isNaN(sentMs) && sentMs < cutoffMs) return false;
      }
    }

    return true;
  });
}

/**
 * Matches a local social_posts caption/brief against live Buffer posts
 */
export function matchBufferPostsForCaption(
  captionOrBrief: string,
  bufferPosts: BufferPostItem[],
  services?: string[]
): BufferPostItem[] {
  const normTarget = normalizeTextForMatch(captionOrBrief);
  if (!normTarget || normTarget.length < 15) return [];

  return bufferPosts.filter((bp) => {
    if (services && services.length > 0 && !services.includes(bp.channelService)) {
      return false;
    }
    const normBp = normalizeTextForMatch(bp.text);
    if (!normBp) return false;
    return (
      normBp.startsWith(normTarget.slice(0, 42)) ||
      normTarget.startsWith(normBp.slice(0, 42))
    );
  });
}

export function MatchedBufferMetricsBar({
  matchedPosts,
}: {
  matchedPosts: BufferPostItem[];
}) {
  if (!matchedPosts || matchedPosts.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50/50 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-800">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
          Live Buffer Traction &amp; Metrics
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {matchedPosts.map((mp) => (
            <span
              key={mp.id}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-gray-700"
            >
              <span className="uppercase font-black text-emerald-700">
                {mp.channelService === "instagram"
                  ? "IG"
                  : mp.channelService === "facebook"
                  ? "FB"
                  : "LinkedIn"}
              </span>
              <span>•</span>
              <span>
                {mp.status === "sent"
                  ? mp.sentAt
                    ? `Posted ${format(new Date(mp.sentAt), "MMM d, h:mm a")}`
                    : "Posted Live"
                  : mp.dueAt
                  ? `Queued ${format(new Date(mp.dueAt), "MMM d, h:mm a")}`
                  : mp.status}
              </span>
              {mp.externalLink && (
                <a
                  href={mp.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-brand-pink hover:underline font-black ml-1"
                >
                  View Post <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
        {(() => {
          let views = 0;
          let reach = 0;
          let reactions = 0;
          let comments = 0;
          let shares = 0;
          let savesOrClicks = 0;
          let maxEng = 0;

          for (const mp of matchedPosts) {
            const m = mp.parsedMetrics;
            views += m.views > 0 ? m.views : m.impressions;
            reach += m.reach;
            reactions += m.reactions;
            comments += m.comments;
            shares += m.shares;
            savesOrClicks += m.saves + m.clicks;
            if (m.engagementRate > maxEng) maxEng = m.engagementRate;
          }

          return (
            <>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Views / Impr.</div>
                <div className="text-sm font-black text-brand-dark">{views.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Unique Reach</div>
                <div className="text-sm font-black text-brand-dark">{reach.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Likes / Reacts</div>
                <div className="text-sm font-black text-pink-600">{reactions.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Comments</div>
                <div className="text-sm font-black text-brand-dark">{comments.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Shares / Saves</div>
                <div className="text-sm font-black text-brand-dark">
                  {(shares + savesOrClicks).toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg px-2.5 py-1.5 border border-emerald-200/80">
                <div className="text-[10px] font-bold text-gray-400 uppercase">Eng. Rate</div>
                <div className="text-sm font-black text-emerald-600">
                  {maxEng > 0 ? `${maxEng.toFixed(1)}%` : "—"}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}

export function BufferAnalyticsPanel({
  title = "Live Buffer Analytics & Traction",
  posts,
  loading,
  onRefresh,
  brandFilter: controlledBrand,
  onBrandFilterChange,
  timeRange: controlledTimeRange,
  onTimeRangeChange,
}: {
  title?: string;
  summary?: PlatformAnalyticsSummary | null;
  posts: BufferPostItem[];
  loading: boolean;
  onRefresh: () => void;
  brandFilter?: BrandFilter;
  onBrandFilterChange?: (b: BrandFilter) => void;
  timeRange?: TimeRangeFilter;
  onTimeRangeChange?: (t: TimeRangeFilter) => void;
}) {
  const [internalBrand, setInternalBrand] = useState<BrandFilter>("bpm");
  const [internalTimeRange, setInternalTimeRange] = useState<TimeRangeFilter>("all");
  const [showHistory, setShowHistory] = useState(false);

  const brandFilter = controlledBrand ?? internalBrand;
  const setBrandFilter = onBrandFilterChange ?? setInternalBrand;
  const timeRange = controlledTimeRange ?? internalTimeRange;
  const setTimeRange = onTimeRangeChange ?? setInternalTimeRange;

  const bpmCount = useMemo(
    () => posts.filter((p) => classifyBufferPostBrand(p) === "bpm").length,
    [posts]
  );
  const prottackCount = useMemo(
    () => posts.filter((p) => classifyBufferPostBrand(p) === "prottack").length,
    [posts]
  );

  const prottackBenchmarkSummary = useMemo(
    () =>
      computeSummaryFromBufferPosts(
        posts.filter((p) => classifyBufferPostBrand(p) === "prottack")
      ),
    [posts]
  );

  const filteredPosts = useMemo(
    () => filterBufferPostsByBrandAndTime(posts, brandFilter, timeRange),
    [posts, brandFilter, timeRange]
  );

  const activeSummary = useMemo(
    () => computeSummaryFromBufferPosts(filteredPosts),
    [filteredPosts]
  );

  const sentPosts = useMemo(
    () => filteredPosts.filter((p) => p.status === "sent"),
    [filteredPosts]
  );
  const queuedPosts = useMemo(
    () =>
      filteredPosts.filter(
        (p) => p.status === "scheduled" || p.status === "buffer" || p.status === "queued"
      ),
    [filteredPosts]
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-pink/10 text-brand-pink shrink-0">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                {title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Live via Buffer
              </span>
              {queuedPosts.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {queuedPosts.length} Queued Next in Buffer
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {brandFilter === "bpm"
                ? "Showing Back Pocket Mysteries campaign traction only (excluding historical Prottack posts)"
                : brandFilter === "prottack"
                ? "Showing Prottack card game posts on @backpocketgames_ & Back Pocket Games"
                : "Showing combined @backpocketgames_ channel history (Back Pocket Mysteries + Prottack)"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          {(sentPosts.length > 0 || queuedPosts.length > 0) && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-dark text-white hover:bg-brand-dark/90 text-xs font-bold cursor-pointer"
            >
              <span>
                {showHistory
                  ? "Hide Post Breakdown"
                  : `View Posts (${sentPosts.length} Live${
                      queuedPosts.length > 0 ? ` · ${queuedPosts.length} Queued` : ""
                    })`}
              </span>
              {showHistory ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar: Brand Scope (Back Pocket Mysteries vs Prottack vs All) + Time Window */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-gray-100">
        {/* Brand Filter Pills */}
        <div className="inline-flex flex-wrap items-center gap-1 bg-gray-100/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setBrandFilter("bpm")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              brandFilter === "bpm"
                ? "bg-brand-pink text-white shadow-xs"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            <span>🕵️‍♀️ Back Pocket Mysteries</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                brandFilter === "bpm"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {bpmCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBrandFilter("prottack")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              brandFilter === "prottack"
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            <span>🃏 Prottack</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                brandFilter === "prottack"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {prottackCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setBrandFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              brandFilter === "all"
                ? "bg-brand-dark text-white shadow-xs"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            <span>🌐 Combined Account</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                brandFilter === "all"
                  ? "bg-white/20 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {posts.length}
            </span>
          </button>
        </div>

        {/* Time Range Pills */}
        <div className="inline-flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl self-start sm:self-auto">
          {(
            [
              { id: "7d", label: "Last 7 Days" },
              { id: "30d", label: "Last 30 Days" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((tr) => (
            <button
              key={tr.id}
              type="button"
              onClick={() => setTimeRange(tr.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                timeRange === tr.id
                  ? "bg-white text-brand-dark shadow-2xs"
                  : "text-gray-500 hover:text-brand-dark"
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Traction KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Views / Impr.</span>
            <Eye className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {loading ? "…" : activeSummary.totalViews.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            {activeSummary.sentCount} live · {activeSummary.scheduledCount} queued
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Unique Reach</span>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {loading ? "…" : activeSummary.totalReach.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">Unique accounts reached</div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Likes / Reacts</span>
            <Heart className="h-3.5 w-3.5 text-brand-pink" />
          </div>
          <div className="text-xl font-black text-brand-pink">
            {loading ? "…" : activeSummary.totalReactions.toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            +{activeSummary.totalComments} comments
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Shares &amp; Saves</span>
            <Share2 className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {loading
              ? "…"
              : (activeSummary.totalShares + activeSummary.totalSaves).toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            {activeSummary.totalShares} shares · {activeSummary.totalSaves} saves
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Clicks &amp; Follows</span>
            <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {loading
              ? "…"
              : (activeSummary.totalClicks + activeSummary.totalFollows).toLocaleString()}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            {activeSummary.totalClicks} clicks · +{activeSummary.totalFollows} follows
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Avg. Eng. Rate</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {loading
              ? "…"
              : activeSummary.avgEngagementRate > 0
              ? `${activeSummary.avgEngagementRate}%`
              : "0%"}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700">
            {brandFilter === "bpm" && prottackBenchmarkSummary.avgEngagementRate > 0
              ? `vs. ${prottackBenchmarkSummary.avgEngagementRate}% Prottack avg`
              : "Interactions per reach"}
          </div>
        </div>
      </div>

      {/* Active Queued in Buffer Strip (so upcoming scheduled posts in Buffer are visible right away) */}
      {queuedPosts.length > 0 && (
        <div className="rounded-xl bg-amber-50/60 border border-amber-200/80 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-950">
            <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span>Upcoming in Buffer Queue ({queuedPosts.length}):</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {queuedPosts.slice(0, 4).map((qp) => (
              <span
                key={qp.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-bold text-gray-800"
              >
                <span className="uppercase font-black text-amber-700">{qp.channelService}</span>
                <span>•</span>
                <span>
                  {qp.dueAt ? format(new Date(qp.dueAt), "EEE, MMM d 'at' h:mm a") : "Queued"}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Expandable Published & Queued Post Performance Table */}
      {showHistory && filteredPosts.length > 0 && (
        <div className="pt-3 border-t border-gray-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
              {brandFilter === "bpm"
                ? `Back Pocket Mysteries Posts in Buffer (${filteredPosts.length})`
                : brandFilter === "prottack"
                ? `Prottack Posts in Buffer (${filteredPosts.length})`
                : `All Channel Posts in Buffer (${filteredPosts.length})`}
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-3">Brand</th>
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Status / Date</th>
                  <th className="py-2.5 px-3">Post Excerpt</th>
                  <th className="py-2.5 px-3 text-right">Views / Impr.</th>
                  <th className="py-2.5 px-3 text-right">Reach</th>
                  <th className="py-2.5 px-3 text-right">Likes</th>
                  <th className="py-2.5 px-3 text-right">Comments</th>
                  <th className="py-2.5 px-3 text-right">Shares/Saves</th>
                  <th className="py-2.5 px-3 text-right">Eng. Rate</th>
                  <th className="py-2.5 px-3 text-right">Live Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPosts.map((bp) => {
                  const m = bp.parsedMetrics;
                  const viewsVal = m.views > 0 ? m.views : m.impressions;
                  const postBrand = classifyBufferPostBrand(bp);
                  const isSent = bp.status === "sent";
                  return (
                    <tr key={bp.id} className="hover:bg-gray-50/80">
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black ${
                            postBrand === "bpm"
                              ? "bg-brand-pink/10 text-brand-pink border border-brand-pink/30"
                              : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          }`}
                        >
                          {postBrand === "bpm" ? "🕵️‍♀️ Mysteries" : "🃏 Prottack"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            bp.channelService === "instagram"
                              ? "bg-pink-100 text-pink-700"
                              : bp.channelService === "facebook"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-sky-100 text-sky-800"
                          }`}
                        >
                          {bp.channelService}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-gray-500 font-semibold">
                        {isSent ? (
                          <span>
                            {bp.sentAt ? format(new Date(bp.sentAt), "MMM d, yyyy") : "Sent"}
                          </span>
                        ) : (
                          <span className="text-amber-700 font-bold">
                            Queued:{" "}
                            {bp.dueAt ? format(new Date(bp.dueAt), "MMM d, h:mm a") : bp.status}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate font-medium text-brand-dark">
                        {bp.text.replace(/\s+/g, " ").slice(0, 80)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-brand-dark">
                        {isSent ? viewsVal.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {isSent ? m.reach.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-brand-pink">
                        {isSent ? m.reactions.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {isSent ? m.comments.toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {isSent ? (m.shares + m.saves).toLocaleString() : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        {isSent && m.engagementRate > 0 ? `${m.engagementRate.toFixed(1)}%` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        {bp.externalLink ? (
                          <a
                            href={bp.externalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-pink hover:underline font-bold"
                          >
                            Open <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
