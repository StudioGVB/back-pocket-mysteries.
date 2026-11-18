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
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "to_schedule" | "scheduled">("all");

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

      const merged = (postsData || []).map((p: any) => ({
        ...p,
        caption_data: captionMap.get(p.id) || null,
      }));

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
      if (isCurrentlyScheduled) {
        const newStatus = "draft";
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: newStatus } : p))
        );
        const { error } = await supabase
          .from("social_posts")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", postId);
        if (error) throw error;
        toast.info("Moved back to To Schedule list.");
      } else {
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const loadingToast = toast.loading("Sending to Buffer...");

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

        await supabase
          .from("social_posts")
          .update({ status: "scheduled", updated_at: new Date().toISOString() })
          .eq("id", postId);
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, status: "scheduled" } : p))
        );
        toast.success(result.message || "Sent to Buffer successfully! Marked as scheduled.");
      }
    } catch (err: any) {
      console.error("Failed to update status:", err);
      toast.error(err.message || "Failed to send to Buffer");
      fetchPosts();
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
            <p className="text-base font-black text-brand-dark">Instagram &amp; Facebook</p>
            <p className="text-[11px] text-gray-500">Back Pocket Mysteries</p>
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
              <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <h2 className="font-bold text-base text-brand-dark flex items-center gap-2">
                    To Schedule
                    <span className="px-2 py-0.5 rounded-full text-xs border border-amber-500/50 text-amber-700 bg-amber-50">
                      {filteredToSchedule.length}
                    </span>
                  </h2>
                </div>
                <span className="text-xs text-gray-500 font-medium">
                  Click Mark Scheduled to push to Buffer and move down
                </span>
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
}

function IgFbPostCard({ post, copiedId, onCopy, onToggleScheduled }: IgFbPostCardProps) {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const isScheduledOrPosted =
    post.status === "scheduled" || post.status === "posted" || post.status === "published";
  const isDraft = post.status === "draft";
  const rawCopy = post.caption_data?.caption || post.slide_content?.postCopy || post.brief;
  const initialImageUrl =
    (post.caption_data?.media_urls && post.caption_data.media_urls[0]) || "";

  const resolveCardUrl = (url: string, postUrl?: string) => {
    let slug = "";
    if (postUrl && postUrl.includes("/blog/")) {
      slug = postUrl.split("/blog/")[1].split("?")[0].replace(/\/$/, "");
    } else if (postUrl && postUrl.includes("/themes/")) {
      slug = postUrl.split("/themes/")[1].split("?")[0].replace(/\/$/, "");
    }

    if (slug) {
      return `/api/social-card/${slug}?t=${Date.now()}`;
    }

    if (!url) return "/api/social-card/diy-murder-mystery-party-guide";
    if (url.includes("/blog-images/social-card-")) {
      const extracted = url
        .split("/blog-images/social-card-")[1]
        .replace(/\.jpg$/, "")
        .replace(/\.png$/, "");
      return `/api/social-card/${extracted}?t=${Date.now()}`;
    }
    if (url.startsWith("/blog-images/") || url.startsWith("/blog/")) {
      const extracted = url
        .replace(/^\/blog-images\//, "")
        .replace(/^\/blog\//, "")
        .replace(/\.jpg$/, "")
        .replace(/\.png$/, "");
      return `/api/social-card/${extracted}?t=${Date.now()}`;
    }
    return url;
  };

  const displayUrl = resolveCardUrl(
    initialImageUrl,
    post.slide_content?.linkUrl || post.caption_data?.post_url
  );
  const [imgSrc, setImgSrc] = useState(displayUrl);

  useEffect(() => {
    setImgSrc(
      resolveCardUrl(
        initialImageUrl,
        post.slide_content?.linkUrl || post.caption_data?.post_url
      )
    );
  }, [initialImageUrl, post.slide_content?.linkUrl, post.caption_data?.post_url]);

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

  if (!cleanCopy.toLowerCase().includes("link in bio")) {
    cleanCopy += `\n\n👇 Link in bio to read the full guide on Back Pocket Mysteries!`;
  }

  const hashtagString = hashtags
    .map((h: string) => (h.startsWith("#") ? h : `#${h}`))
    .join(" ");
  if (hashtagString && !cleanCopy.includes(hashtagString)) {
    cleanCopy += `\n\n${hashtagString}`;
  }

  const handleDownloadImage = (url: string, title: string) => {
    const slug = url.includes("/api/social-card/")
      ? url.split("/api/social-card/")[1].split("?")[0]
      : title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

    const downloadApiUrl = `/api/social-card/${slug}?download=true`;

    const link = document.createElement("a");
    link.href = downloadApiUrl;
    link.download = `${slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Downloading image...");
  };

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all border p-5 ${
        isScheduledOrPosted
          ? "bg-white/80 border-emerald-500/25"
          : "bg-white border-amber-500/35 shadow-xs"
      }`}
    >
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Featured Image Thumbnail */}
        {imgSrc ? (
          <div className="lg:w-48 h-60 rounded-xl overflow-hidden shrink-0 bg-gray-100 border border-gray-200 relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              className="w-full h-full object-cover"
              onError={() => {
                setImgSrc("/blog/hosting-guide.png");
              }}
            />
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[10px] font-bold gap-1 px-1.5 py-0.5 rounded">
                <Instagram className="h-3 w-3" />
                IG
              </span>
              <span className="inline-flex items-center bg-[#1877F2] text-white text-[10px] font-bold gap-1 px-1.5 py-0.5 rounded">
                <Facebook className="h-3 w-3" />
                FB
              </span>
            </div>

            {/* Hover Quick Download Button */}
            <button
              type="button"
              onClick={() => handleDownloadImage(imgSrc, post.brief)}
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white font-bold text-xs cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Download Image
            </button>
          </div>
        ) : (
          <div className="lg:w-48 h-48 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
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

                {post.scheduled_at && !isDraft && (
                  <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    Scheduled: {format(new Date(post.scheduled_at), "EEEE, MMM d, yyyy 'at' h:mm a")}
                  </span>
                )}
              </div>

              {/* Target Date Banner */}
              {post.scheduled_at && isDraft && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/50 text-amber-950 font-bold text-sm mb-2">
                  <Calendar className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    Target Date:{" "}
                    <span className="text-amber-900 font-extrabold">
                      {format(new Date(post.scheduled_at), "EEEE, MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </span>
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
                  onClick={() => handleDownloadImage(imgSrc, post.brief)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200 shadow-xs cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Download Image</span>
                </button>
              )}
            </div>
          </div>

          {/* Caption Text Preview Box */}
          <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 text-xs font-mono whitespace-pre-line text-gray-800 max-h-48 overflow-y-auto leading-relaxed select-all">
            {cleanCopy}
          </div>
        </div>
      </div>
    </div>
  );
}
