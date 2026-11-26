"use client";

import React, { useState } from "react";
import {
  Eye,
  Users,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MousePointerClick,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
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

function normalizeTextForMatch(text: string): string {
  return (text || "")
    .toLowerCase()
    .replace(/https?:\/\/[^\s]+/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 75);
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
  summary,
  posts,
  loading,
  onRefresh,
}: {
  title?: string;
  summary: PlatformAnalyticsSummary | null;
  posts: BufferPostItem[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const sentPosts = posts.filter((p) => p.status === "sent");

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-brand-pink/10 text-brand-pink">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                {title}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                ● Live via Buffer GraphQL
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Real-time impressions, reach, reactions, shares, saves, and engagement rate across your connected channels
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Metrics</span>
          </button>

          {sentPosts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-dark text-white hover:bg-brand-dark/90 text-xs font-bold cursor-pointer"
            >
              <span>
                {showHistory
                  ? "Hide Published Post History"
                  : `View Published Posts (${sentPosts.length})`}
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

      {/* Aggregate Traction KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Views / Impr.</span>
            <Eye className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {summary ? summary.totalViews.toLocaleString() : loading ? "…" : "0"}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            Across {summary?.sentCount || 0} published posts
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Unique Reach</span>
            <Users className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {summary ? summary.totalReach.toLocaleString() : loading ? "…" : "0"}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">Unique accounts reached</div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Likes / Reacts</span>
            <Heart className="h-3.5 w-3.5 text-brand-pink" />
          </div>
          <div className="text-xl font-black text-brand-pink">
            {summary ? summary.totalReactions.toLocaleString() : loading ? "…" : "0"}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            +{summary?.totalComments || 0} comments
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Shares &amp; Saves</span>
            <Share2 className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {summary
              ? (summary.totalShares + summary.totalSaves).toLocaleString()
              : loading
              ? "…"
              : "0"}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            {summary?.totalShares || 0} shares · {summary?.totalSaves || 0} saves
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-200/80 p-3">
          <div className="flex items-center justify-between text-gray-400 mb-1">
            <span className="text-[11px] font-bold uppercase">Clicks &amp; Follows</span>
            <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-brand-dark">
            {summary
              ? (summary.totalClicks + summary.totalFollows).toLocaleString()
              : loading
              ? "…"
              : "0"}
          </div>
          <div className="text-[10px] font-semibold text-gray-500">
            {summary?.totalClicks || 0} clicks · +{summary?.totalFollows || 0} follows
          </div>
        </div>

        <div className="rounded-xl bg-emerald-50/60 border border-emerald-200 p-3">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase">Avg. Eng. Rate</span>
            <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">
            {summary && summary.avgEngagementRate > 0
              ? `${summary.avgEngagementRate}%`
              : loading
              ? "…"
              : "0%"}
          </div>
          <div className="text-[10px] font-semibold text-emerald-700">
            Interactions per reach
          </div>
        </div>
      </div>

      {/* Expandable Published Post Performance Table */}
      {showHistory && sentPosts.length > 0 && (
        <div className="pt-3 border-t border-gray-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-500">
              Published Posts &amp; Live Post-Level Traction ({sentPosts.length})
            </h3>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-black uppercase tracking-wider text-gray-500">
                  <th className="py-2.5 px-3">Channel</th>
                  <th className="py-2.5 px-3">Published</th>
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
                {sentPosts.map((bp) => {
                  const m = bp.parsedMetrics;
                  const viewsVal = m.views > 0 ? m.views : m.impressions;
                  return (
                    <tr key={bp.id} className="hover:bg-gray-50/80">
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
                        {bp.sentAt ? format(new Date(bp.sentAt), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate font-medium text-brand-dark">
                        {bp.text.replace(/\s+/g, " ").slice(0, 85)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-brand-dark">
                        {viewsVal.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {m.reach.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-brand-pink">
                        {m.reactions.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {m.comments.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-gray-700">
                        {(m.shares + m.saves).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                        {m.engagementRate > 0 ? `${m.engagementRate.toFixed(1)}%` : "—"}
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
