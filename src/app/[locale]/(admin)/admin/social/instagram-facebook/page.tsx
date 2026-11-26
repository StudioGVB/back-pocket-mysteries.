"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  InstagramIcon as Instagram,
  FacebookIcon as Facebook,
} from "@/components/icons/SocialIcons";
import {
  Search,
  Calendar,
  Copy,
  Clock,
  Loader2,
  Check,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Square,
  Share2,
  Download,
  ArrowLeft,
  Sparkles,
  Maximize2,
  X,
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

const TEMPLATE_LABELS = [
  "1. Noir Editorial",
  "2. Framed Bento",
  "3. Stat Dark",
  "4. Colour Block",
  "5. Case Card",
  "6. Circle Spotlight",
  "7. Stat Light",
  "8. Gazette Cover",
];

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
    stat?: { value: string; label: string };
    templateIndex?: number | null;
    platform_statuses?: Record<string, string>;
  } | null;
  caption_data?: {
    caption?: string;
    hashtags?: string[];
    media_urls?: string[];
    post_url?: string;
    engagement_data?: any;
  } | null;
}

export default function InstagramFacebookManagementPage() {
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
      const res = await fetch("/api/admin/buffer/analytics?platform=instagram_facebook");
      const json = await res.json();
      if (json?.success) {
        setBufferPosts(json.posts || []);
        setBufferSummary(json.summaries?.instagram_facebook || null);
      }
    } catch (err) {
      console.error("Failed to fetch Buffer analytics:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchPosts = async () => {
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
        .in("platform", ["instagram", "facebook", "instagram_facebook"]);

      const captionMap = new Map<string, any>();
      (captionsData || []).forEach((c: any) => captionMap.set(c.post_id, c));

      const merged = (postsData || []).map((p: any) => {
        const cap = captionMap.get(p.id) || null;
        const pStatuses = p.slide_content?.platform_statuses || {};
        const igFbStatus =
          pStatuses.instagram_facebook ||
          cap?.status ||
          (pStatuses.linkedin ? "draft" : p.status);
        return {
          ...p,
          status: igFbStatus,
          caption_data: cap,
        };
      });

      setPosts(merged);
    } catch (err) {
      console.error("Error loading Instagram/Facebook posts:", err);
      toast.error("Failed to load Instagram/Facebook posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    fetchBufferAnalytics();
  }, []);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Instagram / Facebook caption copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleScheduled = async (
    postId: string,
    isCurrentlyScheduled: boolean,
    cleanCopy: string = "",
    imgSrc: string = ""
  ) => {
    try {
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      if (isCurrentlyScheduled) {
        const newStatus = "draft";
        const prevPlatformStatuses = post.slide_content?.platform_statuses || {};
        const nextPlatformStatuses = {
          ...prevPlatformStatuses,
          linkedin: prevPlatformStatuses.linkedin || "draft",
          instagram_facebook: newStatus,
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
          .in("platform", ["instagram", "facebook", "instagram_facebook"]);

        toast.info("Instagram/Facebook post moved back to To Schedule list.");
      } else {
        const loadingToast = toast.loading("Sending Instagram/Facebook post to Buffer...");

        const response = await fetch("/api/admin/buffer/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            postId,
            platform: "instagram_facebook",
            text: cleanCopy,
            mediaUrl: imgSrc,
            scheduledAt: post.scheduled_at,
            linkUrl: post.slide_content?.linkUrl || post.caption_data?.post_url,
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
          linkedin: prevPlatformStatuses.linkedin || "draft",
          instagram_facebook: "scheduled",
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
          .in("platform", ["instagram", "facebook", "instagram_facebook"]);

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
          result.message || "Instagram/Facebook post sent to Buffer! (LinkedIn kept separate)."
        );
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to send to Buffer");
      fetchPosts();
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
      fetchPosts();
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
      fetchPosts();
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
            Instagram &amp; Facebook <span className="text-brand-pink italic">Posts</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold">
            Schedule upcoming IG &amp; FB updates, preview 8-template social cards, copy captions without raw URLs, and push to Buffer
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
          <div className="p-2.5 rounded-lg bg-pink-500/10 text-pink-600">
            <Share2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Target Channels</p>
            <p className="text-base font-black text-brand-dark">@backpocketgames_ &amp; FB</p>
            <p className="text-[11px] text-emerald-600 font-bold">● Connected via Buffer (IG + FB Page)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 shadow-xs">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold">Card Generator</p>
            <p className="text-base font-black text-brand-dark">8 Templates (4:5)</p>
            <p className="text-[11px] text-gray-500">Max 5 Hashtags + Link in Bio</p>
          </div>
        </div>
      </div>

      {/* Live Buffer Analytics & Traction Panel */}
      <BufferAnalyticsPanel
        title="Instagram & Facebook Traction & Buffer Metrics"
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
            placeholder="Search IG/FB captions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-pink"
          />
        </div>
      </div>

      {/* Posts Sections */}
      {loading ? (
        <div className="flex items-center justify-center py-12 border border-gray-200 rounded-2xl bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-brand-pink mr-2" />
          <span className="text-sm text-gray-500 font-semibold">
            Loading Instagram &amp; Facebook posts...
          </span>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-12 p-6">
          <div className="flex justify-center items-center gap-2 mb-3">
            <Instagram className="h-8 w-8 text-pink-500 opacity-80" />
            <Facebook className="h-8 w-8 text-blue-600 opacity-80" />
          </div>
          <h3 className="text-lg font-bold mb-1">No Instagram or Facebook posts found</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            No social posts have been generated for Instagram/Facebook yet.
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
                    All Instagram &amp; Facebook posts are marked as scheduled in Buffer.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredToSchedule.map((post) => (
                    <IgFbPostCard
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
                        ["instagram", "facebook"]
                      )}
                      onSelectTemplate={async (postId, templateIndex) => {
                        const target = posts.find((p) => p.id === postId);
                        const nextSlideContent = {
                          ...(target?.slide_content || {}),
                          templateIndex,
                        };
                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === postId ? { ...p, slide_content: nextSlideContent } : p
                          )
                        );
                        await supabase
                          .from("social_posts")
                          .update({
                            slide_content: nextSlideContent,
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", postId);
                        toast.success(
                          templateIndex === null
                            ? "Set to Auto-Rotate template"
                            : `Saved template: ${TEMPLATE_LABELS[templateIndex]}`
                        );
                      }}
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
                    <IgFbPostCard
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
                        ["instagram", "facebook"]
                      )}
                      onSelectTemplate={async (postId, templateIndex) => {
                        const target = posts.find((p) => p.id === postId);
                        const nextSlideContent = {
                          ...(target?.slide_content || {}),
                          templateIndex,
                        };
                        setPosts((prev) =>
                          prev.map((p) =>
                            p.id === postId ? { ...p, slide_content: nextSlideContent } : p
                          )
                        );
                        await supabase
                          .from("social_posts")
                          .update({
                            slide_content: nextSlideContent,
                            updated_at: new Date().toISOString(),
                          })
                          .eq("id", postId);
                        toast.success(
                          templateIndex === null
                            ? "Set to Auto-Rotate template"
                            : `Saved template: ${TEMPLATE_LABELS[templateIndex]}`
                        );
                      }}
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

interface IgFbPostCardProps {
  post: SocialPostItem;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleScheduled: (
    postId: string,
    isScheduled: boolean,
    cleanCopy?: string,
    imgSrc?: string
  ) => void;
  onUpdateScheduledAt: (postId: string, newIsoDate: string) => Promise<void> | void;
  onRefreshPastDates?: () => Promise<void> | void;
  refreshingDates?: boolean;
  matchedBufferPosts?: BufferPostItem[];
  onSelectTemplate: (postId: string, templateIndex: number | null) => void;
}

function IgFbPostCard({
  post,
  copiedId,
  onCopy,
  onToggleScheduled,
  onUpdateScheduledAt,
  onRefreshPastDates,
  refreshingDates,
  matchedBufferPosts,
  onSelectTemplate,
}: IgFbPostCardProps) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const selectedTemplate =
    typeof post.slide_content?.templateIndex === "number"
      ? post.slide_content.templateIndex
      : null;

  const isScheduledOrPosted =
    post.status === "scheduled" || post.status === "posted" || post.status === "published";
  const isDraft = post.status === "draft";
  const isPastDue = isDraft && isScheduledDateInPast(post.scheduled_at);
  const rawCopy = post.caption_data?.caption || post.slide_content?.postCopy || post.brief;
  const initialImageUrl =
    (post.caption_data?.media_urls && post.caption_data.media_urls[0]) || "";

  const extractSlug = (url: string, postUrl?: string) => {
    const explicitSlug = (post.slide_content as any)?.cardSlug;
    if (explicitSlug) {
      return String(explicitSlug).replace(/\.jpg$/, "").replace(/\.png$/, "");
    }
    if (url && url.includes("/api/social-card/")) {
      return url
        .split("/api/social-card/")[1]
        .split("?")[0]
        .replace(/\.jpg$/, "")
        .replace(/\.png$/, "");
    }
    if (postUrl && postUrl.includes("/blog/")) {
      return postUrl.split("/blog/")[1].split("?")[0].replace(/\/$/, "");
    }
    if (postUrl && postUrl.includes("/themes/")) {
      const themeSlug = postUrl.split("/themes/")[1].split("?")[0].replace(/\/$/, "");
      if (themeSlug) return themeSlug;
    }
    if (url.includes("/blog-images/social-card-")) {
      return url
        .split("/blog-images/social-card-")[1]
        .replace(/\.jpg$/, "")
        .replace(/\.png$/, "");
    }
    if (url.startsWith("/blog-images/") || url.startsWith("/blog/")) {
      return url
        .replace(/^\/blog-images\//, "")
        .replace(/^\/blog\//, "")
        .replace(/\.jpg$/, "")
        .replace(/\.png$/, "");
    }
    return "diy-murder-mystery-party-guide";
  };

  const cardSlug = extractSlug(
    initialImageUrl,
    post.slide_content?.linkUrl || post.caption_data?.post_url
  );

  const scAny = (post.slide_content || {}) as Record<string, any>;
  const fallbackBgUrl =
    scAny.imageUrl ||
    (initialImageUrl && !initialImageUrl.includes("/api/social-card/")
      ? initialImageUrl
      : cardSlug === "christmas-nightmare"
      ? "/moodboard/christmas/main-christmas-cabin.jpg"
      : cardSlug === "love-on-the-rocks"
      ? "/moodboard/lotr/main-island-villa.jpg"
      : `/blog-images/${cardSlug}.png`);

  const buildCardUrl = (tIndex: number | null) => {
    const params = new URLSearchParams();
    if (typeof tIndex === "number") {
      params.set("t", String(tIndex));
    } else {
      params.set("v", "auto");
    }
    if (scAny.ctaText) params.set("cta", String(scAny.ctaText));
    if (scAny.kickerText) params.set("kicker", String(scAny.kickerText));
    if (scAny.stat?.value && scAny.stat?.label) {
      params.set("statValue", String(scAny.stat.value));
      params.set("statLabel", String(scAny.stat.label));
    }
    if (scAny.imageUrl) params.set("img", String(scAny.imageUrl));
    return `/api/social-card/${cardSlug}?${params.toString()}`;
  };

  const [imgSrc, setImgSrc] = useState(() => buildCardUrl(selectedTemplate));
  const [retriedOnce, setRetriedOnce] = useState(false);

  useEffect(() => {
    setRetriedOnce(false);
    setImgSrc(buildCardUrl(selectedTemplate));
  }, [cardSlug, selectedTemplate]);

  // Cap hashtags to a maximum of 5 for Instagram
  const hashtags = (post.caption_data?.hashtags || []).slice(0, 5);

  const handleCopyTitle = (title: string) => {
    navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    toast.success("Post title copied to clipboard!");
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  // Clean raw copy for Instagram & Facebook (strip raw URLs, enforce max 5 hashtags + "Link in bio")
  let cleanCopy = rawCopy
    .replace(/https?:\/\/[^\s]+/g, "")
    .replaceAll("—", ", ")
    .trim();

  if (!/link in (our |the )?bio/i.test(cleanCopy)) {
    cleanCopy += `\n\n👇 Link in bio to explore Back Pocket Mysteries!`;
  }

  const hashtagString = hashtags
    .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
  if (hashtagString && !cleanCopy.includes(hashtagString)) {
    cleanCopy += `\n\n${hashtagString}`;
  }

  const handleDownloadImage = (url: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `${cardSlug}${selectedTemplate !== null ? `-t${selectedTemplate}` : ""}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloading 1080×1350 social card PNG...");
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all border p-5 ${
        isScheduledOrPosted
          ? "bg-white/80 border-emerald-500/25"
          : "bg-white border-amber-500/35 shadow-xs"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
        {/* Featured 4:5 Social Card Thumbnail */}
        {imgSrc ? (
          <div className="w-full sm:w-56 h-[280px] self-start aspect-[4/5] rounded-xl overflow-hidden shrink-0 bg-gray-900 border border-gray-200 relative group shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={imgSrc}
              src={imgSrc}
              alt={post.brief}
              loading="eager"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover block"
              onError={() => {
                if (!retriedOnce) {
                  setRetriedOnce(true);
                  const base = buildCardUrl(selectedTemplate);
                  setImgSrc(`${base}&retry=1`);
                } else {
                  setImgSrc(fallbackBgUrl || "/blog/hosting-guide.png");
                }
              }}
            />
            <div className="absolute top-2.5 left-2.5 flex gap-1 z-10">
              <span className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold gap-1 px-1.5 py-0.5 rounded shadow-xs">
                <Instagram className="h-3 w-3" />
                IG
              </span>
              <span className="inline-flex items-center bg-[#1877F2] text-white text-[10px] font-bold gap-1 px-1.5 py-0.5 rounded shadow-xs">
                <Facebook className="h-3 w-3" />
                FB
              </span>
            </div>

            {/* Hover Overlay Actions */}
            <div className="absolute inset-0 z-10 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
              <button
                type="button"
                onClick={() => setShowGalleryModal(true)}
                className="w-full py-2 px-3 rounded-lg bg-brand-pink text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-md hover:bg-brand-pink/90"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                Compare All 8 Templates
              </button>
              <button
                type="button"
                onClick={() => handleDownloadImage(imgSrc)}
                className="w-full py-2 px-3 rounded-lg bg-white/95 text-brand-dark font-bold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer hover:bg-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download 1080×1350 PNG
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full sm:w-56 h-[280px] self-start aspect-[4/5] rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
            <ImageIcon className="h-8 w-8 text-gray-300" />
          </div>
        )}

        {/* Post Content */}
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

              {/* Target Date Banner (Double-click to edit) + Quick Refresh Button if Date Passed */}
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

              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-lg leading-snug text-brand-dark">
                  {post.brief}
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopyTitle(post.brief)}
                  title="Copy post title"
                  className="h-7 px-2 rounded-lg text-xs inline-flex items-center gap-1 text-gray-500 hover:text-brand-dark hover:bg-gray-100 shrink-0 cursor-pointer border border-transparent hover:border-gray-200"
                >
                  {copiedTitle ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-[11px] text-green-600 font-bold">Title Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-semibold">Copy Title</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons: Checkbox + Copy Caption + Download Image */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() =>
                  onToggleScheduled(post.id, isScheduledOrPosted, cleanCopy, imgSrc)
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
                onClick={() => onCopy(cleanCopy, post.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold bg-gradient-to-r from-purple-50 to-pink-50 text-pink-700 hover:from-purple-100 hover:to-pink-100 border-pink-200 shadow-xs cursor-pointer"
              >
                {copiedId === post.id ? (
                  <Check className="h-3.5 w-3.5 text-green-600" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedId === post.id ? "Copied!" : "Copy Caption"}
              </button>

              {imgSrc && (
                <button
                  type="button"
                  onClick={() => handleDownloadImage(imgSrc)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Download PNG</span>
                </button>
              )}
            </div>
          </div>

          {matchedBufferPosts && matchedBufferPosts.length > 0 && (
            <MatchedBufferMetricsBar matchedPosts={matchedBufferPosts} />
          )}

          {/* 8-Template Design Switcher Bar */}
          <div className="bg-gray-50/90 border border-gray-200/80 rounded-xl p-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1.5 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-brand-pink" />
              Card Template:
            </span>
            <button
              type="button"
              onClick={() => onSelectTemplate(post.id, null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                selectedTemplate === null
                  ? "bg-brand-dark text-white shadow-xs"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              Auto Rotate
            </button>
            {TEMPLATE_LABELS.map((label, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectTemplate(post.id, idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-all ${
                  selectedTemplate === idx
                    ? "bg-brand-pink text-white shadow-xs"
                    : "bg-white text-gray-700 border border-gray-200 hover:border-brand-pink/40"
                }`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowGalleryModal(true)}
              className="ml-auto px-2.5 py-1 rounded-lg text-[11px] font-bold bg-pink-50 text-brand-pink border border-pink-200 hover:bg-pink-100 cursor-pointer inline-flex items-center gap-1"
            >
              <Maximize2 className="h-3 w-3" />
              Compare All 8
            </button>
          </div>

          {/* Caption Text Preview Box */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs font-mono whitespace-pre-line text-gray-800 max-h-48 overflow-y-auto leading-relaxed select-all">
            {cleanCopy}
          </div>
        </div>
      </div>

      {/* 8-Template Comparison Lightbox Modal */}
      {showGalleryModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowGalleryModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-brand-dark">
                  8-Template Social Card Gallery — {post.brief}
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Click any template below to set it as the active 1080×1350 Instagram &amp; Facebook card for this post.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGalleryModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATE_LABELS.map((label, idx) => {
                const tUrl = `/api/social-card/${cardSlug}?t=${idx}`;
                const isSelected = selectedTemplate === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onSelectTemplate(post.id, idx);
                      setShowGalleryModal(false);
                    }}
                    className={`rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group flex flex-col ${
                      isSelected
                        ? "border-brand-pink ring-4 ring-brand-pink/15 shadow-lg"
                        : "border-gray-200 hover:border-brand-pink/60 hover:shadow-md"
                    }`}
                  >
                    <div className="aspect-[4/5] bg-gray-900 relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tUrl}
                        alt={label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 bg-white flex items-center justify-between">
                      <span className="text-xs font-extrabold text-brand-dark">{label}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? "bg-brand-pink text-white"
                            : "bg-gray-100 text-gray-600 group-hover:bg-pink-50 group-hover:text-brand-pink"
                        }`}
                      >
                        {isSelected ? "Active" : "Use Template"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
