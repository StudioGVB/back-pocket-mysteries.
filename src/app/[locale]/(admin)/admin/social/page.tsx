"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { EdmCalendar, EdmCampaignCalendarItem } from "@/components/admin/edm/EdmCalendar";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  Mail,
  RefreshCw,
} from "lucide-react";
import {
  LinkedinIcon as Linkedin,
  InstagramIcon as Instagram,
  FacebookIcon as Facebook,
} from "@/components/icons/SocialIcons";
import Link from "next/link";
import { format } from "date-fns";
import {
  computeRefreshedFutureSchedule,
  isScheduledDateInPast,
} from "@/utils/marketing-schedule-refresh";
import {
  BufferAnalyticsPanel,
  BufferPostItem,
  PlatformAnalyticsSummary,
} from "@/components/admin/social/BufferAnalyticsPanel";

interface SocialPostItem {
  id: string;
  brief: string;
  status: string;
  scheduled_at: string | null;
  source_blog_id?: string;
  slide_content?: any;
}

interface BlogPostItem {
  id: string;
  title: string;
  is_draft?: boolean;
  publish_date?: string | null;
}

interface CaptionItem {
  id: string;
  post_id: string;
  platform: string;
  status?: string;
}

export default function SocialCalendarPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const [campaigns, setCampaigns] = useState<EdmCampaignCalendarItem[]>([]);
  const [socialPosts, setSocialPosts] = useState<SocialPostItem[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPostItem[]>([]);
  const [captions, setCaptions] = useState<CaptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDates, setRefreshingDates] = useState(false);
  const [bufferPosts, setBufferPosts] = useState<BufferPostItem[]>([]);
  const [bufferSummaries, setBufferSummaries] = useState<{
    all: PlatformAnalyticsSummary | null;
    instagram: PlatformAnalyticsSummary | null;
    facebook: PlatformAnalyticsSummary | null;
    linkedin: PlatformAnalyticsSummary | null;
  }>({
    all: null,
    instagram: null,
    facebook: null,
    linkedin: null,
  });
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const fetchBufferAnalytics = useCallback(async () => {
    try {
      setLoadingAnalytics(true);
      const res = await fetch("/api/admin/buffer/analytics?platform=all");
      const json = await res.json();
      if (json?.success) {
        setBufferPosts(json.posts || []);
        setBufferSummaries({
          all: json.summaries?.all || null,
          instagram: json.summaries?.instagram || null,
          facebook: json.summaries?.facebook || null,
          linkedin: json.summaries?.linkedin || null,
        });
      }
    } catch (err) {
      console.error("Failed to fetch Buffer analytics for Overview:", err);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      const [{ data: edmData }, { data: socialData }, { data: blogData }, { data: captionData }] =
        await Promise.all([
          supabase
            .from("edm_campaigns")
            .select("id, subject, status, sent_at, scheduled_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("social_posts")
            .select("id, brief, status, scheduled_at, source_blog_id, slide_content")
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("blog_posts")
            .select("id, title, is_draft, publish_date")
            .order("publish_date", { ascending: true }),
          supabase.from("social_post_captions").select("id, post_id, platform, status"),
        ]);

      setCampaigns((edmData as EdmCampaignCalendarItem[]) || []);
      setSocialPosts((socialData as SocialPostItem[]) || []);
      setBlogPosts((blogData as BlogPostItem[]) || []);
      setCaptions((captionData as CaptionItem[]) || []);
    } catch (err) {
      console.error("Failed to fetch data for social calendar KPIs:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCalendarData();
    fetchBufferAnalytics();
  }, [fetchCalendarData, fetchBufferAnalytics]);

  const pastDueDraftCount = useMemo(() => {
    const pastSocial = socialPosts.filter(
      (p) => p.status === "draft" && isScheduledDateInPast(p.scheduled_at)
    ).length;
    const pastEdm = campaigns.filter(
      (c) => c.status === "draft" && isScheduledDateInPast(c.scheduled_at)
    ).length;
    return pastSocial + pastEdm;
  }, [socialPosts, campaigns]);

  const handleRefreshAllPastDates = async () => {
    try {
      setRefreshingDates(true);
      const socialRefresh = computeRefreshedFutureSchedule(socialPosts);
      const edmRefresh = computeRefreshedFutureSchedule(
        campaigns.map((c) => ({
          id: c.id,
          status: c.status,
          scheduled_at: c.scheduled_at || null,
        }))
      );

      const totalUpdates = socialRefresh.updates.length + edmRefresh.updates.length;
      if (totalUpdates === 0) {
        toast.info("All draft social posts & EDM campaigns already have future dates!");
        return;
      }

      const nowIso = new Date().toISOString();

      for (const u of socialRefresh.updates) {
        await supabase
          .from("social_posts")
          .update({ scheduled_at: u.newScheduledAt, updated_at: nowIso })
          .eq("id", u.id);
      }

      for (const u of edmRefresh.updates) {
        await supabase
          .from("edm_campaigns")
          .update({ scheduled_at: u.newScheduledAt, updated_at: nowIso })
          .eq("id", u.id);
      }

      await fetchCalendarData();
      toast.success(
        `Reassigned ${totalUpdates} campaign item(s) to upcoming future dates!`
      );
    } catch (err) {
      console.error("Failed to refresh past dates:", err);
      toast.error("Failed to reassign past dates");
    } finally {
      setRefreshingDates(false);
    }
  };

  // Compute real dynamic KPIs based on actual database status
  const kpis = useMemo(() => {
    const today = new Date();

    // 1. Calculate Next Week window (next 7 days starting from today)
    const nextWeekStart = new Date(today);
    nextWeekStart.setHours(0, 0, 0, 0);

    const nextWeekEnd = new Date(nextWeekStart);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
    nextWeekEnd.setHours(23, 59, 59, 999);

    const getScheduledBlogsInRange = (start: Date, end: Date) => {
      return blogPosts.filter((b) => {
        if (b.is_draft) return false;
        if (!b.publish_date) return false;
        const d = new Date(b.publish_date);
        return d >= start && d <= end;
      });
    };

    const getScheduledEdmsInRange = (start: Date, end: Date) => {
      return campaigns.filter((c) => {
        if (c.status === "draft" || c.status === "archived") return false;
        const dStr = c.scheduled_at || c.sent_at;
        if (!dStr) return false;
        const d = new Date(dStr);
        return d >= start && d <= end;
      });
    };

    const isDoneStatus = (st?: string) =>
      st === "scheduled" || st === "posted" || st === "published";

    const getScheduledLinkedInInRange = (start: Date, end: Date) => {
      return socialPosts.filter((p) => {
        if (!p.scheduled_at) return false;
        const d = new Date(p.scheduled_at);
        if (d < start || d > end) return false;
        const liCap = captions.find((c) => c.post_id === p.id && c.platform === "linkedin");
        if (!liCap) return false;
        const pStatuses = p.slide_content?.platform_statuses || {};
        const liStatus =
          pStatuses.linkedin ||
          liCap.status ||
          (pStatuses.instagram_facebook ? "draft" : p.status);
        return isDoneStatus(liStatus);
      });
    };

    const getScheduledIgFbInRange = (start: Date, end: Date) => {
      return socialPosts.filter((p) => {
        if (!p.scheduled_at) return false;
        const d = new Date(p.scheduled_at);
        if (d < start || d > end) return false;
        const igCap = captions.find(
          (c) =>
            c.post_id === p.id &&
            (c.platform === "instagram" ||
              c.platform === "facebook" ||
              c.platform === "instagram_facebook")
        );
        if (!igCap) return false;
        const pStatuses = p.slide_content?.platform_statuses || {};
        const igFbStatus =
          pStatuses.instagram_facebook ||
          igCap.status ||
          (pStatuses.linkedin ? "draft" : p.status);
        return isDoneStatus(igFbStatus);
      });
    };

    // KPI 1: Next Week's Readiness
    const nextWeekBlogsList = getScheduledBlogsInRange(nextWeekStart, nextWeekEnd);
    const nextWeekEdmList = getScheduledEdmsInRange(nextWeekStart, nextWeekEnd);
    const nextWeekLinkedInList = getScheduledLinkedInInRange(nextWeekStart, nextWeekEnd);
    const nextWeekIgFbList = getScheduledIgFbInRange(nextWeekStart, nextWeekEnd);

    const nextWeekBlogs = Math.min(2, nextWeekBlogsList.length);
    const nextWeekEdm = Math.min(1, nextWeekEdmList.length);
    const nextWeekLinkedIn = Math.min(2, nextWeekLinkedInList.length);
    const nextWeekIgFb = Math.min(2, nextWeekIgFbList.length);

    const nextWeekRequired = 7;
    const nextWeekScheduledTotal =
      nextWeekBlogs + nextWeekEdm + nextWeekLinkedIn + nextWeekIgFb;
    const readinessPercent = Math.round((nextWeekScheduledTotal / nextWeekRequired) * 100);

    // KPI 2: Content Runway & Weeks Ahead
    let fullyScheduledWeeks = 0;
    let partialWeekFraction = 0;
    let furthestDate = new Date(today);
    let firstIncompleteWeekMessage = "";
    let firstIncompleteWeekLink = "/en/admin/social/linkedin";

    for (let w = 0; w < 12; w++) {
      const wStart = new Date(today);
      wStart.setDate(wStart.getDate() + w * 7);
      wStart.setHours(0, 0, 0, 0);

      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      wEnd.setHours(23, 59, 59, 999);

      const wBlogs = getScheduledBlogsInRange(wStart, wEnd).length;
      const wEdms = getScheduledEdmsInRange(wStart, wEnd).length;
      const wLinkedIn = getScheduledLinkedInInRange(wStart, wEnd).length;
      const wIgFb = getScheduledIgFbInRange(wStart, wEnd).length;

      // Required per week: 2 blogs, 1 edm, 2 linkedin, 2 ig/fb
      const isWeekComplete = wBlogs >= 2 && wEdms >= 1 && wLinkedIn >= 2 && wIgFb >= 2;

      if (isWeekComplete) {
        fullyScheduledWeeks++;
        furthestDate = wEnd;
      } else {
        partialWeekFraction =
          (Math.min(2, wBlogs) +
            Math.min(1, wEdms) +
            Math.min(2, wLinkedIn) +
            Math.min(2, wIgFb)) /
          7;
        if (!firstIncompleteWeekMessage) {
          const weekStr = format(wStart, "MMM d");
          if (wLinkedIn < 2) {
            firstIncompleteWeekMessage = `Action Needed: Mark ${
              2 - wLinkedIn
            } LinkedIn post(s) as scheduled for week of ${weekStr}.`;
            firstIncompleteWeekLink = "/en/admin/social/linkedin";
          } else if (wIgFb < 2) {
            firstIncompleteWeekMessage = `Action Needed: Mark ${
              2 - wIgFb
            } IG/FB post(s) as scheduled for week of ${weekStr}.`;
            firstIncompleteWeekLink = "/en/admin/social/instagram-facebook";
          } else if (wEdms < 1) {
            firstIncompleteWeekMessage = `Action Needed: Schedule 1 EDM campaign for week of ${weekStr}.`;
            firstIncompleteWeekLink = "/en/admin/edm";
          } else if (wBlogs < 2) {
            firstIncompleteWeekMessage = `Action Needed: Schedule / publish ${
              2 - wBlogs
            } blog post(s) for week of ${weekStr}.`;
            firstIncompleteWeekLink = "/en/admin/blog";
          }
        }
        break;
      }
    }

    const runwayWeeks = fullyScheduledWeeks + partialWeekFraction;
    const weeksAhead = runwayWeeks.toFixed(1);
    const sitBackEnabled = fullyScheduledWeeks >= 1;

    // KPI 3: Next Step / Action Item
    let nextStepMessage = "";
    let nextStepType: "success" | "warning" | "action" = "success";
    let nextStepLink = "/en/admin/social/linkedin";
    let nextStepLinkText = "Open Section";

    if (!sitBackEnabled) {
      nextStepMessage =
        firstIncompleteWeekMessage ||
        "Action Needed: Schedule all 7 assets (2 Blogs, 1 EDM, 2 LinkedIn, 2 IG/FB) to approve runway.";
      nextStepType = "warning";
      nextStepLink = firstIncompleteWeekLink;
      nextStepLinkText = "Resolve Issue";
    } else {
      nextStepMessage = `🎉 All ${
        fullyScheduledWeeks * 7
      } assets are 100% scheduled for the next ${fullyScheduledWeeks} week(s)! You are safe to sit back!`;
      nextStepType = "success";
      nextStepLink = "/en/admin/social/linkedin";
      nextStepLinkText = "View Schedule";
    }

    return {
      readinessPercent,
      nextWeekBlogs,
      nextWeekEdm,
      nextWeekLinkedIn,
      nextWeekIgFb,
      nextWeekScheduledTotal,
      nextWeekRequired,
      weeksAhead,
      sitBackEnabled,
      furthestDateFormatted:
        fullyScheduledWeeks > 0
          ? format(furthestDate, "EEEE, MMM d, yyyy")
          : "None fully queued",
      nextStepMessage,
      nextStepType,
      nextStepLink,
      nextStepLinkText,
    };
  }, [campaigns, socialPosts, blogPosts, captions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
            Marketing <span className="text-brand-pink italic">Command Center</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold">
            Visualize and manage your bi-weekly blogs, social queues, weekly EDMs, and promo codes in one place
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <button
            type="button"
            onClick={handleRefreshAllPastDates}
            disabled={refreshingDates}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50 ${
              pastDueDraftCount > 0
                ? "bg-brand-pink text-white hover:bg-brand-pink/90 shadow-brand-pink/20"
                : "bg-white border border-gray-200 text-brand-dark hover:bg-gray-50"
            }`}
            title="Reassign any past-due draft social posts & EDM campaigns to upcoming future dates"
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

      {/* 3 KPI DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: OVERALL READINESS FOR NEXT WEEK */}
        <div className="bg-white rounded-2xl border border-emerald-500/30 shadow-xs p-5 space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-brand-dark">Next Week&apos;s Readiness</h3>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs border border-emerald-500/40 bg-emerald-50 text-emerald-800 font-bold">
              {kpis.readinessPercent}% Ready
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-2xl font-black text-emerald-600">
                {kpis.nextWeekScheduledTotal} / {kpis.nextWeekRequired}
              </span>
              <span className="text-xs text-gray-500 font-semibold">Assets Scheduled</span>
            </div>

            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${kpis.readinessPercent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 pt-2 text-[11px] text-gray-500 border-t border-gray-100 font-semibold">
            <div className="text-center">
              <span className="block font-black text-brand-dark">{kpis.nextWeekBlogs}/2</span>
              <span>Blogs</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-brand-dark">{kpis.nextWeekEdm}/1</span>
              <span>EDM</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-brand-dark">{kpis.nextWeekLinkedIn}/2</span>
              <span>LinkedIn</span>
            </div>
            <div className="text-center">
              <span className="block font-black text-brand-dark">{kpis.nextWeekIgFb}/2</span>
              <span>IG / FB</span>
            </div>
          </div>
        </div>

        {/* KPI 2: CONTENT RUNWAY & WEEKS AHEAD */}
        <div
          className={`bg-white rounded-2xl shadow-xs p-5 space-y-3 relative overflow-hidden border ${
            kpis.sitBackEnabled ? "border-blue-500/30" : "border-amber-500/40"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  kpis.sitBackEnabled
                    ? "bg-blue-500/10 text-blue-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-brand-dark">Content Runway</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs border font-bold ${
                kpis.sitBackEnabled
                  ? "border-blue-500/40 bg-blue-50 text-blue-800"
                  : "border-amber-500/40 bg-amber-50 text-amber-900"
              }`}
            >
              {kpis.sitBackEnabled ? "Sit Back Enabled 🌴" : "Action Required ⚠️"}
            </span>
          </div>

          <div>
            <div className="flex items-baseline justify-between">
              <span
                className={`text-2xl font-black ${
                  kpis.sitBackEnabled ? "text-blue-600" : "text-amber-600"
                }`}
              >
                {kpis.weeksAhead} Weeks Ahead
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-700 mt-1">
              Fully cued until{" "}
              <span className="text-blue-600 font-bold">{kpis.furthestDateFormatted}</span>
            </p>
          </div>

          <p className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 leading-tight font-medium">
            {kpis.sitBackEnabled
              ? "All 7 required assets (2 Blogs, 1 EDM, 2 LinkedIn, 2 IG/FB) are scheduled per week."
              : "All 7 assets (2 Blogs, 1 EDM, 2 LinkedIn, 2 IG/FB) must be scheduled to approve runway."}
          </p>
        </div>

        {/* KPI 3: NEXT ACTION ITEM / WHAT'S MISSING */}
        <div
          className={`bg-white rounded-2xl shadow-xs p-5 space-y-3 relative overflow-hidden border ${
            kpis.nextStepType === "warning" ? "border-amber-500/40" : "border-purple-500/30"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg ${
                  kpis.nextStepType === "warning"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-purple-500/10 text-purple-600"
                }`}
              >
                {kpis.nextStepType === "warning" ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </div>
              <h3 className="font-bold text-sm text-brand-dark">Next Step &amp; Status</h3>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs border font-bold ${
                kpis.nextStepType === "warning"
                  ? "border-amber-400 bg-amber-50 text-amber-900"
                  : "border-purple-400 bg-purple-50 text-purple-900"
              }`}
            >
              {kpis.nextStepType === "warning" ? "Action Required" : "On Track"}
            </span>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-800 leading-relaxed">
              {kpis.nextStepMessage}
            </p>
          </div>

          <div className="pt-2 border-t border-gray-100 flex justify-end">
            <Link
              href={kpis.nextStepLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-brand-dark hover:bg-gray-50"
            >
              <span>{kpis.nextStepLinkText}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* CALENDAR VIEW */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px] border border-gray-200 rounded-2xl bg-white">
          <div className="flex flex-col items-center gap-2 text-sm text-gray-500 font-semibold">
            <Loader2 className="h-6 w-6 animate-spin text-brand-pink" />
            Loading calendar events...
          </div>
        </div>
      ) : (
        <EdmCalendar campaigns={campaigns} />
      )}
    </div>
  );
}
