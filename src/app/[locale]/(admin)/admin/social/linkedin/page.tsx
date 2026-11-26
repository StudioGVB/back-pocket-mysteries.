"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { LinkedinIcon as Linkedin } from "@/components/icons/SocialIcons";
import {
  Search,
  Calendar,
  ExternalLink,
  Copy,
  Clock,
  Loader2,
  Check,
  FileText,
  Building2,
  CheckCircle2,
  Square,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { InlineDateTimeEditor } from "@/components/admin/InlineDateTimeEditor";
import {
  computeRefreshedFutureSchedule,
  isScheduledDateInPast,
} from "@/utils/marketing-schedule-refresh";
import {
  BufferAnalyticsPanel,
  MatchedBufferMetricsBar,
  matchBufferPostsForCaption,
  BufferPostItem,
  PlatformAnalyticsSummary,
} from "@/components/admin/social/BufferAnalyticsPanel";

interface SocialPostItem {
  id: string;
  brief: string;
  status: string;
  scheduled_at: string | null;
  posted_at: string | null;
  created_at: string;
  slide_content: {
    postCopy?: string;
    linkUrl?: string;
    slidesCopy?: string;
  } | null;
  caption_data?: {
    caption?: string;
    hashtags?: string[];
    media_urls?: string[];
    post_url?: string;
    engagement_data?: any;
  } | null;
}

export default function LinkedInManagementPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDates, setRefreshingDates] = useState(false);
  const [bufferPosts, setBufferPosts] = useState<BufferPostItem[]>([]);
  const [bufferSummary, setBufferSummary] = useState<PlatformAnalyticsSummary | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "to_schedule" | "scheduled">("all");

  const fetchBufferAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/admin/buffer/analytics?platform=linkedin");
      const json = await res.json();
      if (json?.success) {
        setBufferPosts(json.posts || []);
        setBufferSummary(json.summaries?.linkedin || null);
      }
    } catch (err) {
      console.error("Failed to fetch Buffer analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchLinkedInPosts = async () => {
    try {
      setLoading(true);
      const { data: postsData, error: postsError } = await supabase
        .from("social_posts")
        .select("*")
        .order("scheduled_at", { ascending: true, nullsFirst: false });

      if (postsError) throw postsError;

      const { data: captionsData } = await supabase
        .from("social_post_captions")
        .select("*")
        .eq("platform", "linkedin");

      const captionMap = new Map<string, any>();
      (captionsData || []).forEach((c: any) => captionMap.set(c.post_id, c));

      const merged = (postsData || []).map((p: any) => {
        const cap = captionMap.get(p.id) || null;
        const pStatuses = p.slide_content?.platform_statuses || {};
        const liStatus =
          pStatuses.linkedin ||
          cap?.status ||
          (pStatuses.instagram_facebook ? "draft" : p.status);
        return {
          ...p,
          status: liStatus,
          caption_data: cap,
        };
      });

      setPosts(merged);
    } catch (err) {
      console.error("Error loading LinkedIn posts:", err);
      toast.error("Failed to load LinkedIn posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLinkedInPosts();
    fetchBufferAnalytics();
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Post copy copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleScheduled = async (
    postId: string,
    isCurrentlyScheduled: boolean,
    cleanCopy: string = "",
    linkUrl: string = ""
  ) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (isCurrentlyScheduled) {
        const newStatus = "draft";
        const prevPlatformStatuses = post.slide_content?.platform_statuses || {};
        const nextPlatformStatuses = {
          ...prevPlatformStatuses,
          instagram_facebook: prevPlatformStatuses.instagram_facebook || "draft",
          linkedin: newStatus,
        };
        const nextSlideContent = {
          ...(post.slide_content || {}),
          platform_statuses: nextPlatformStatuses,
        };

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, status: newStatus, slide_content: nextSlideContent }
              : p
          )
        );
        const { error } = await supabase
          .from("social_posts")
          .update({
            status:
              nextPlatformStatuses.linkedin === "scheduled" &&
              nextPlatformStatuses.instagram_facebook === "scheduled"
                ? "scheduled"
                : "draft",
            slide_content: nextSlideContent,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);
        if (error) throw error;

        await supabase
          .from("social_post_captions")
          .update({ status: newStatus })
          .eq("post_id", postId)
          .eq("platform", "linkedin");

        toast.info("LinkedIn post moved back to To Schedule list.");
      } else {
        const loadingToast = toast.loading("Sending LinkedIn post to Buffer...");

        const response = await fetch("/api/admin/buffer/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            platform: "linkedin",
            text: cleanCopy,
            linkUrl: linkUrl,
            scheduledAt: post.scheduled_at,
          }),
        });

        const result = await response.json();
        toast.dismiss(loadingToast);

        if (!response.ok) {
          throw new Error(result.error || "Failed to schedule with Buffer");
        }

        const effectiveScheduledAt = result.scheduledAt || post.scheduled_at;
        const prevPlatformStatuses = post.slide_content?.platform_statuses || {};
        const nextPlatformStatuses = {
          ...prevPlatformStatuses,
          instagram_facebook: prevPlatformStatuses.instagram_facebook || "draft",
          linkedin: "scheduled",
        };
        const nextSlideContent = {
          ...(post.slide_content || {}),
          platform_statuses: nextPlatformStatuses,
        };

        await supabase
          .from("social_posts")
          .update({
            status:
              nextPlatformStatuses.linkedin === "scheduled" &&
              nextPlatformStatuses.instagram_facebook === "scheduled"
                ? "scheduled"
                : "draft",
            slide_content: nextSlideContent,
            scheduled_at: effectiveScheduledAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", postId);

        await supabase
          .from("social_post_captions")
          .update({ status: "scheduled" })
          .eq("post_id", postId)
          .eq("platform", "linkedin");

        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  status: "scheduled",
                  slide_content: nextSlideContent,
                  scheduled_at: effectiveScheduledAt,
                }
              : p
          )
        );
        toast.success(
          result.message || "LinkedIn post sent to Buffer! (Instagram/Facebook kept separate)."
        );
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to send to Buffer");
      fetchLinkedInPosts();
    }
  };

  const handleUpdateScheduledAt = async (postId: string, newIsoDate: string) => {
    try {
      setPosts((prev) =>
        [...prev]
          .map((p) => (p.id === postId ? { ...p, scheduled_at: newIsoDate } : p))
          .sort((a, b) =>
            (a.scheduled_at || "9999").localeCompare(b.scheduled_at || "9999")
          )
      );
      const { error } = await supabase
        .from("social_posts")
        .update({ scheduled_at: newIsoDate, updated_at: new Date().toISOString() })
        .eq("id", postId);
      if (error) throw error;
      toast.success("Posting date & time updated!");
    } catch (err: any) {
      console.error("Failed to update scheduled_at:", err);
      toast.error("Failed to update posting date & time");
      fetchLinkedInPosts();
    }
  };

  const pastDueDraftCount = useMemo(() => {
    return posts.filter(
      (p) => p.status === "draft" && isScheduledDateInPast(p.scheduled_at)
    ).length;
  }, [posts]);

  const handleRefreshPastDates = async () => {
    try {
      setRefreshingDates(true);
      const { updates, pastDueCount } = computeRefreshedFutureSchedule(posts);
      if (updates.length === 0) {
        toast.info("All To Schedule posts already have future target dates!");
        return;
      }

      const updateMap = new Map(updates.map((u) => [u.id, u.newScheduledAt]));
      const nowIso = new Date().toISOString();

      setPosts((prev) =>
        [...prev]
          .map((p) =>
            updateMap.has(p.id)
              ? { ...p, scheduled_at: updateMap.get(p.id) || p.scheduled_at }
              : p
          )
          .sort((a, b) =>
            (a.scheduled_at || "9999").localeCompare(b.scheduled_at || "9999")
          )
      );

      for (const u of updates) {
        const { error } = await supabase
          .from("social_posts")
          .update({
            scheduled_at: u.newScheduledAt,
            updated_at: nowIso,
          })
          .eq("id", u.id);
        if (error) throw error;
      }

      const firstNewDate = updates[0]?.newScheduledAt
        ? format(new Date(updates[0].newScheduledAt), "EEE, MMM d 'at' h:mm a")
        : "";
      toast.success(
        `Reassigned ${updates.length} post date(s) to the future${
          pastDueCount > 0 ? ` (${pastDueCount} past-due)` : ""
        }${firstNewDate ? ` — starting ${firstNewDate}` : ""}!`
      );
    } catch (err: any) {
      console.error("Failed to refresh past dates:", err);
      toast.error("Failed to reassign past dates");
      fetchLinkedInPosts();
    } finally {
      setRefreshingDates(false);
    }
  };

  const toSchedulePosts = useMemo(() => {
    return posts.filter((p) => p.status === "draft");
  }, [posts]);

  const scheduledDonePosts = useMemo(() => {
    return posts.filter(
      (p) => p.status === "scheduled" || p.status === "posted" || p.status === "published"
    );
  }, [posts]);

  const filterBySearch = (list: SocialPostItem[]) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.brief.toLowerCase().includes(q) ||
        (p.slide_content?.postCopy && p.slide_content.postCopy.toLowerCase().includes(q)) ||
        (p.caption_data?.caption && p.caption_data.caption.toLowerCase().includes(q))
    );
  };

  const filteredToSchedule = filterBySearch(toSchedulePosts);
  const filteredScheduledDone = filterBySearch(scheduledDonePosts);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/social"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-dark mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Campaign Calendar
          </Link>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
            LinkedIn Posts &amp; <span className="text-[#0A66C2] italic">Performance</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold">
            Review long-form LinkedIn updates, copy text, and push to Buffer when ready
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={handleRefreshPastDates}
            disabled={refreshingDates || toSchedulePosts.length === 0}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              pastDueDraftCount > 0
                ? "bg-brand-pink text-white hover:bg-brand-pink/90 shadow-brand-pink/20"
                : "bg-white border border-gray-200 text-brand-dark hover:bg-gray-50"
            }`}
            title="Reassign any past-due target dates to upcoming future dates in chronological order"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshingDates ? "animate-spin" : ""}`} />
            <span>
              {refreshingDates
                ? "Reassigning Dates..."
                : pastDueDraftCount > 0
                ? `Refresh Past Dates (${pastDueDraftCount})`
                : "Refresh Past Dates"}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-amber-500/30 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">To Schedule</p>
            <p className="text-2xl font-black text-amber-600">{toSchedulePosts.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-emerald-500/30 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Scheduled in Buffer</p>
            <p className="text-2xl font-black text-emerald-600">{scheduledDonePosts.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Target Channel</p>
            <p className="text-base font-black text-brand-dark">Back Pocket Games</p>
            <p className="text-[11px] text-emerald-600 font-bold">● Connected via Buffer (LinkedIn Page)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Format</p>
            <p className="text-base font-black text-brand-dark">600–700 Words</p>
            <p className="text-[11px] text-gray-500">Link Preview Card (No Photo)</p>
          </div>
        </div>
      </div>

      {/* Live Buffer Analytics & Traction Panel */}
      <BufferAnalyticsPanel
        title="LinkedIn Page Traction & Buffer Metrics"
        summary={bufferSummary}
        posts={bufferPosts}
        loading={loadingAnalytics}
        onRefresh={fetchBufferAnalytics}
      />

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              activeTab === "all"
                ? "bg-brand-dark text-white"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            All ({posts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("to_schedule")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "to_schedule"
                ? "bg-brand-dark text-white"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            <Clock className="h-3.5 w-3.5 text-amber-500" />
            To Schedule ({toSchedulePosts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scheduled")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeTab === "scheduled"
                ? "bg-brand-dark text-white"
                : "text-gray-600 hover:text-brand-dark"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Scheduled / Posted ({scheduledDonePosts.length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search LinkedIn post copy..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-pink"
          />
        </div>
      </div>

      {/* Posts Section */}
      {loading ? (
        <div className="flex items-center justify-center py-12 border border-gray-200 rounded-2xl bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-brand-pink mr-2" />
          <span className="text-sm text-gray-500 font-semibold">Loading LinkedIn posts...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-12 p-6">
          <Linkedin className="h-10 w-10 text-[#0A66C2] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold mb-1">No LinkedIn posts found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            No LinkedIn posts have been queued yet. Run the batch content script to populate drafts.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: TO SCHEDULE */}
          {(activeTab === "all" || activeTab === "to_schedule") && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <h2 className="font-bold text-base text-brand-dark flex items-center gap-2">
                    To Schedule
                    <span className="px-2 py-0.5 rounded-full text-xs border border-amber-500/50 text-amber-700 bg-amber-50">
                      {filteredToSchedule.length}
                    </span>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {pastDueDraftCount > 0 && (
                    <button
                      type="button"
                      onClick={handleRefreshPastDates}
                      disabled={refreshingDates}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-black transition-colors cursor-pointer disabled:opacity-50"
                      title="Reassign all past-due dates to upcoming future dates"
                    >
                      <RefreshCw className={`h-3 w-3 ${refreshingDates ? "animate-spin" : ""}`} />
                      <span>Reassign {pastDueDraftCount} Past Date(s) to Future</span>
                    </button>
                  )}
                  <span className="text-xs text-gray-500 font-medium">
                    Click Mark Scheduled to push to Buffer and move down
                  </span>
                </div>
              </div>

              {filteredToSchedule.length === 0 ? (
                <div className="p-6 border border-gray-200 rounded-2xl border-dashed bg-amber-50/20 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                  <p className="text-sm font-bold text-brand-dark">
                    All caught up! No posts waiting to be scheduled.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    All posts are currently marked as scheduled in Buffer.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredToSchedule.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      copiedId={copiedId}
                      onCopy={handleCopyText}
                      onToggleScheduled={handleToggleScheduled}
                      onUpdateScheduledAt={handleUpdateScheduledAt}
                      onRefreshPastDates={handleRefreshPastDates}
                      refreshingDates={refreshingDates}
                      matchedBufferPosts={matchBufferPostsForCaption(
                        post.caption_data?.caption || post.slide_content?.postCopy || post.brief,
                        bufferPosts,
                        ["linkedin"]
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: SCHEDULED / POSTED */}
          {(activeTab === "all" || activeTab === "scheduled") && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <h2 className="font-bold text-base text-brand-dark flex items-center gap-2">
                    Scheduled in Buffer / Posted
                    <span className="px-2 py-0.5 rounded-full text-xs border border-emerald-500/50 text-emerald-700 bg-emerald-50">
                      {filteredScheduledDone.length}
                    </span>
                  </h2>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Scheduled posts ready for automatic publishing
                </span>
              </div>

              {filteredScheduledDone.length === 0 ? (
                <div className="p-6 border border-gray-200 rounded-2xl border-dashed text-center bg-white">
                  <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-brand-dark">No scheduled posts yet.</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Tick a post above once you have reviewed it to push it to Buffer.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredScheduledDone.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      copiedId={copiedId}
                      onCopy={handleCopyText}
                      onToggleScheduled={handleToggleScheduled}
                      onUpdateScheduledAt={handleUpdateScheduledAt}
                      onRefreshPastDates={handleRefreshPastDates}
                      refreshingDates={refreshingDates}
                      matchedBufferPosts={matchBufferPostsForCaption(
                        post.caption_data?.caption || post.slide_content?.postCopy || post.brief,
                        bufferPosts,
                        ["linkedin"]
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PostCardProps {
  post: SocialPostItem;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleScheduled: (
    postId: string,
    isScheduled: boolean,
    cleanCopy?: string,
    linkUrl?: string
  ) => void;
  onUpdateScheduledAt: (postId: string, newIsoDate: string) => Promise<void> | void;
  onRefreshPastDates?: () => Promise<void> | void;
  refreshingDates?: boolean;
  matchedBufferPosts?: BufferPostItem[];
}

function PostCard({
  post,
  copiedId,
  onCopy,
  onToggleScheduled,
  onUpdateScheduledAt,
  onRefreshPastDates,
  refreshingDates,
  matchedBufferPosts,
}: PostCardProps) {
  const isScheduledOrPosted =
    post.status === "scheduled" || post.status === "posted" || post.status === "published";
  const isDraft = post.status === "draft";
  const isPastDue = isDraft && isScheduledDateInPast(post.scheduled_at);
  const rawCopy = post.caption_data?.caption || post.slide_content?.postCopy || post.brief;
  const linkUrl = post.slide_content?.linkUrl || post.caption_data?.post_url || "";
  const hashtags = post.caption_data?.hashtags || [];

  let fullFormattedCopy = rawCopy.replaceAll("—", ", ").trim();
  const hashtagString = hashtags.map((h: string) => (h.startsWith("#") ? h : `#${h}`)).join(" ");
  if (hashtagString && !fullFormattedCopy.includes(hashtagString)) {
    if (linkUrl && !fullFormattedCopy.includes(linkUrl)) {
      fullFormattedCopy += `\n\nRead the full article:\n${linkUrl}`;
    }
    fullFormattedCopy += `\n\n${hashtagString}`;
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all border p-5 ${
        isScheduledOrPosted
          ? "bg-white/80 border-emerald-500/25"
          : "bg-white border-amber-500/35 shadow-xs"
      }`}
    >
      <div className="flex-1 space-y-3 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isDraft
                    ? "border border-amber-500 text-amber-800 bg-amber-50"
                    : post.status === "scheduled"
                    ? "bg-emerald-600 text-white"
                    : "bg-blue-600 text-white"
                }`}
              >
                {isDraft
                  ? "To Schedule"
                  : post.status === "scheduled"
                  ? "Scheduled in Buffer"
                  : "Published"}
              </span>

              {isPastDue && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-rose-100 text-rose-700 border border-rose-300">
                  Date Passed
                </span>
              )}

              {!isDraft && (
                <InlineDateTimeEditor
                  value={post.scheduled_at}
                  onSave={(iso) => onUpdateScheduledAt(post.id, iso)}
                >
                  <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold px-2 py-0.5 rounded-lg hover:bg-emerald-50">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    {post.scheduled_at
                      ? `Scheduled: ${format(new Date(post.scheduled_at), "EEEE, MMM d, yyyy 'at' h:mm a")}`
                      : "Double-click to set date & time"}
                  </span>
                </InlineDateTimeEditor>
              )}
            </div>

            {isDraft && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <InlineDateTimeEditor
                  value={post.scheduled_at}
                  onSave={(iso) => onUpdateScheduledAt(post.id, iso)}
                >
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-950 font-bold text-sm hover:bg-amber-500/25 transition-colors">
                    <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      Target Date:{" "}
                      <span className="text-amber-900 font-extrabold">
                        {post.scheduled_at
                          ? format(new Date(post.scheduled_at), "EEEE, MMM d, yyyy 'at' h:mm a")
                          : "Double-click to set date & time"}
                      </span>
                    </span>
                    <span className="text-[10px] font-bold text-amber-700/80 ml-1">
                      (Double-click to edit)
                    </span>
                  </div>
                </InlineDateTimeEditor>

                {isPastDue && onRefreshPastDates && (
                  <button
                    type="button"
                    onClick={onRefreshPastDates}
                    disabled={refreshingDates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-pink hover:bg-brand-pink/90 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title="Reassign past dates to upcoming future slots"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${refreshingDates ? "animate-spin" : ""}`} />
                    <span>Refresh to Future Date</span>
                  </button>
                )}
              </div>
            )}

            <h3 className="font-bold text-base sm:text-lg leading-snug text-brand-dark">
              {post.brief}
            </h3>
          </div>

          {/* Checkbox Tick Button & Copy Button */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              type="button"
              onClick={() =>
                onToggleScheduled(post.id, isScheduledOrPosted, fullFormattedCopy, linkUrl)
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold cursor-pointer transition-all shadow-xs ${
                isScheduledOrPosted
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "border-amber-500 bg-amber-50 text-amber-900 hover:bg-amber-100"
              }`}
            >
              {isScheduledOrPosted ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Scheduled</span>
                </>
              ) : (
                <>
                  <Square className="h-4 w-4 text-amber-600" />
                  <span>Mark Scheduled</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onCopy(fullFormattedCopy, post.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200 shadow-xs cursor-pointer"
            >
              {copiedId === post.id ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedId === post.id ? "Copied!" : "Copy Copy"}
            </button>
          </div>
        </div>

        {matchedBufferPosts && matchedBufferPosts.length > 0 && (
          <MatchedBufferMetricsBar matchedPosts={matchedBufferPosts} />
        )}

        {/* Copy preview */}
        <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs font-mono whitespace-pre-line text-gray-800 max-h-48 overflow-y-auto leading-relaxed select-all">
          {fullFormattedCopy}
        </div>

        {/* External Link */}
        {linkUrl && (
          <div className="flex justify-end pt-1">
            <a
              href={linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-brand-pink hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              {linkUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
