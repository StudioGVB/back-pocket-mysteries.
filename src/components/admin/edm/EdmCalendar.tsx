"use client";

import { useMemo, useState, useEffect } from "react";
import {
  format,
  eachDayOfInterval,
  isSameDay,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { LinkedinIcon as Linkedin, InstagramIcon as Instagram } from "@/components/icons/SocialIcons";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export interface EdmCampaignCalendarItem {
  id: string;
  subject: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "archived";
  scheduled_at: string | null;
  sent_at: string | null;
}

interface EdmCalendarProps {
  campaigns: EdmCampaignCalendarItem[];
}

const statusColors: Record<string, string> = {
  scheduled:
    "border-blue-400 bg-blue-50/50 hover:bg-blue-50 text-blue-700",
  sending:
    "border-yellow-400 bg-yellow-50/50 hover:bg-yellow-50 text-yellow-700",
  sent:
    "border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700",
  draft:
    "border-amber-400 bg-amber-50/50 hover:bg-amber-50 text-amber-700",
};

export const EdmCalendar = ({ campaigns }: EdmCalendarProps) => {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [focusDate, setFocusDate] = useState<Date>(new Date());

  useEffect(() => {
    const savedViewMode = localStorage.getItem("edm_calendar_view_mode");
    const savedMinimized = localStorage.getItem("edm_calendar_minimized");
    if (savedViewMode === "month" || savedViewMode === "week") {
      setViewMode(savedViewMode);
    }
    if (savedMinimized !== null) {
      setIsMinimized(savedMinimized === "true");
    }
  }, []);

  const handleToggleViewMode = (mode: "month" | "week") => {
    setViewMode(mode);
    localStorage.setItem("edm_calendar_view_mode", mode);
  };

  const handleToggleMinimized = () => {
    setIsMinimized(!isMinimized);
    localStorage.setItem("edm_calendar_minimized", String(!isMinimized));
  };

  const [colors, setColors] = useState({
    draftItem: "#ca8a04", // Yellow / Amber for Drafts
    scheduledEdm: "#8b5cf6", // Purple for Scheduled EDMs
    automatedOnboarding: "#a855f7",
    initialOnboarding: "#3b82f6", // Blue for VIP Sign-Ups
    blogDraft: "#f97316", // Orange for Scheduled Blogs
    sentPosted: "#22c55e", // Green for Sent / Posted
    demoBooked: "#ef4444",
    socialPost: "#0a66c2", // LinkedIn Blue for Scheduled LinkedIn
    igFbPost: "#fe04c6", // Brand Pink for Scheduled IG/FB
  });

  useEffect(() => {
    const savedColors = localStorage.getItem("edm_calendar_custom_colors_v2");
    if (savedColors) {
      try {
        setColors((prev) => ({ ...prev, ...JSON.parse(savedColors) }));
      } catch (e) {
        console.error("Failed to parse saved calendar colors", e);
      }
    }
  }, []);

  const handleColorChange = (key: keyof typeof colors, value: string) => {
    const updated = { ...colors, [key]: value };
    setColors(updated);
    localStorage.setItem("edm_calendar_custom_colors_v2", JSON.stringify(updated));
  };

  const [blogPosts, setBlogPosts] = useState<any[]>([]);
  const [socialPosts, setSocialPosts] = useState<any[]>([]);
  const [vipLeads, setVipLeads] = useState<any[]>([]);
  const [showNewsletters, setShowNewsletters] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showBlogs, setShowBlogs] = useState(true);
  const [showSocial, setShowSocial] = useState(true);

  useEffect(() => {
    const supabase = createClient() as any;

    async function fetchBlogs() {
      try {
        const { data, error } = await supabase
          .from("blog_posts")
          .select("id, title, publish_date, is_draft")
          .not("publish_date", "is", null);
        if (!error && data) {
          setBlogPosts(data);
        }
      } catch (e) {
        console.error("Failed to fetch blog posts for calendar:", e);
      }
    }

    async function fetchSocialPosts() {
      try {
        const { data, error } = await supabase
          .from("social_posts")
          .select("id, brief, scheduled_at, status, social_post_captions(platform)")
          .not("scheduled_at", "is", null)
          .in("status", ["draft", "scheduled", "posted", "published"]);
        if (!error && data) {
          setSocialPosts(data);
        }
      } catch (e) {
        console.error("Failed to fetch social posts for calendar:", e);
      }
    }

    async function fetchVipLeads() {
      try {
        const { data, error } = await supabase
          .from("leads")
          .select("id, email, full_name, vip_rank, created_at")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data) {
          setVipLeads(data);
        }
      } catch {
        // ignore if leads not yet populated
      }
    }

    fetchBlogs();
    fetchSocialPosts();
    fetchVipLeads();
  }, []);

  const blogEvents = useMemo(() => {
    return blogPosts.map((post) => ({
      id: post.id,
      subject: post.title,
      type: "blog" as const,
      is_draft: post.is_draft,
      date: new Date(post.publish_date),
    }));
  }, [blogPosts]);

  const socialEvents = useMemo(() => {
    return socialPosts
      .filter(
        (post) =>
          post.status === "scheduled" ||
          post.status === "posted" ||
          post.status === "published" ||
          post.status === "draft"
      )
      .flatMap((post) => {
        const plats: string[] = (post.social_post_captions || []).map((c: any) => c.platform);
        const groups: Array<"linkedin" | "igfb"> = [];
        if (plats.length === 0 || plats.includes("linkedin")) groups.push("linkedin");
        if (plats.includes("instagram") || plats.includes("facebook") || plats.includes("instagram_facebook")) {
          groups.push("igfb");
        }
        return groups.map((platform) => ({
          id: `${post.id}-${platform}`,
          subject: post.brief,
          type: "social" as const,
          status: post.status,
          platform,
          date: new Date(post.scheduled_at),
        }));
      });
  }, [socialPosts]);

  const onboardingEvents = useMemo(() => {
    return vipLeads.slice(0, 15).map((lead) => ({
      id: `lead-${lead.id}`,
      subject: `${lead.full_name || lead.email} (VIP #${lead.vip_rank || "•"})`,
      type: "onboarding" as const,
      isOnboardingInitial: true,
      date: new Date(lead.created_at),
    }));
  }, [vipLeads]);

  const displayableCampaigns = useMemo(() => {
    return campaigns.filter(
      (c) =>
        c.status === "scheduled" ||
        c.status === "sent" ||
        c.status === "sending" ||
        (c.status === "draft" && !!c.scheduled_at)
    );
  }, [campaigns]);

  const getEventsForDay = (day: Date) => {
    const list: Array<{
      id: string;
      subject: string;
      type: "edm" | "onboarding" | "blog" | "social";
      status?: string;
      date: Date;
      campaignId?: string;
      isOnboardingInitial?: boolean;
      is_draft?: boolean;
      platform?: "linkedin" | "igfb";
    }> = [];

    if (showNewsletters) {
      displayableCampaigns.forEach((c) => {
        const dateStr = c.status === "sent" ? c.sent_at : c.scheduled_at;
        if (dateStr && isSameDay(new Date(dateStr), day)) {
          list.push({
            id: c.id,
            subject: c.subject,
            type: "edm",
            status: c.status,
            date: new Date(dateStr),
            campaignId: c.id,
          });
        }
      });
    }

    if (showOnboarding) {
      onboardingEvents.forEach((ev) => {
        if (isSameDay(ev.date, day)) {
          list.push({
            id: ev.id,
            subject: ev.subject,
            type: "onboarding",
            isOnboardingInitial: ev.isOnboardingInitial,
            date: ev.date,
          });
        }
      });
    }

    if (showBlogs) {
      blogEvents.forEach((ev) => {
        if (isSameDay(ev.date, day)) {
          list.push({
            id: ev.id,
            subject: ev.subject,
            type: "blog",
            is_draft: ev.is_draft,
            date: ev.date,
          });
        }
      });
    }

    if (showSocial) {
      socialEvents.forEach((ev) => {
        if (isSameDay(ev.date, day)) {
          list.push({
            id: ev.id,
            subject: ev.subject,
            type: "social",
            status: ev.status,
            platform: ev.platform,
            date: ev.date,
          });
        }
      });
    }

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const calendarDays = useMemo(() => {
    if (viewMode === "week") {
      const weekStart = startOfWeek(focusDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(focusDate, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: weekStart, end: weekEnd });
    } else {
      // Rolling 4 weeks starting from the week containing focusDate (defaults to today)
      const calendarStart = startOfWeek(focusDate, { weekStartsOn: 1 });
      const calendarEnd = endOfWeek(addWeeks(calendarStart, 3), { weekStartsOn: 1 });
      return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
    }
  }, [focusDate, viewMode]);

  const handlePrev = () => {
    setFocusDate(subWeeks(focusDate, 1));
  };

  const handleNext = () => {
    setFocusDate(addWeeks(focusDate, 1));
  };

  const getWeekRangeLabel = (date: Date) => {
    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`;
    } else if (start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
    } else {
      return `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
    }
  };

  const headerLabel = useMemo(() => {
    if (viewMode === "week") {
      return getWeekRangeLabel(focusDate);
    }
    const start = calendarDays[0];
    const end = calendarDays[calendarDays.length - 1];
    return start.getFullYear() === end.getFullYear()
      ? `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`
      : `${format(start, "MMM d, yyyy")} – ${format(end, "MMM d, yyyy")}`;
  }, [focusDate, viewMode, calendarDays]);

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const upcomingCount = useMemo(() => {
    return campaigns.filter((c) => c.status === "scheduled").length;
  }, [campaigns]);

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4 transition-all duration-200">
      {/* Calendar Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleMinimized}
            className="flex items-center gap-2 text-brand-dark hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Calendar className="h-5 w-5 text-brand-pink shrink-0" />
            <h2 className="text-lg font-black tracking-tight text-brand-dark uppercase">
              {isMinimized ? "Campaign Calendar" : headerLabel}
            </h2>
          </button>

          {isMinimized && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-gray-600 border border-gray-200 bg-gray-50">
              {upcomingCount} scheduled campaign{upcomingCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Calendar Event Filters */}
          {!isMinimized && (
            <div className="flex items-center gap-3 border border-gray-200 rounded-lg bg-white px-3 h-8 text-xs shrink-0 select-none">
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold hover:text-brand-dark text-gray-600">
                <input
                  type="checkbox"
                  checked={showNewsletters}
                  onChange={(e) => setShowNewsletters(e.target.checked)}
                  className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink h-3.5 w-3.5"
                />
                Newsletters
              </label>
              <div className="w-px h-4 bg-gray-200" />
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold hover:text-brand-dark text-gray-600">
                <input
                  type="checkbox"
                  checked={showOnboarding}
                  onChange={(e) => setShowOnboarding(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
                />
                VIP Leads
              </label>
              <div className="w-px h-4 bg-gray-200" />
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold hover:text-brand-dark text-gray-600">
                <input
                  type="checkbox"
                  checked={showBlogs}
                  onChange={(e) => setShowBlogs(e.target.checked)}
                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500 h-3.5 w-3.5"
                />
                Blogs
              </label>
              <div className="w-px h-4 bg-gray-200" />
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold hover:text-brand-dark text-gray-600">
                <input
                  type="checkbox"
                  checked={showSocial}
                  onChange={(e) => setShowSocial(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                />
                Socials
              </label>
            </div>
          )}

          {/* Week/Month Selector */}
          {!isMinimized && (
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white h-8 p-0.5 shrink-0">
              <button
                type="button"
                className={cn(
                  "h-full px-3 text-xs rounded-md transition-colors cursor-pointer",
                  viewMode === "month"
                    ? "bg-brand-dark text-white font-bold"
                    : "text-gray-500 hover:text-brand-dark font-semibold"
                )}
                onClick={() => handleToggleViewMode("month")}
              >
                4 Weeks
              </button>
              <button
                type="button"
                className={cn(
                  "h-full px-3 text-xs rounded-md transition-colors cursor-pointer",
                  viewMode === "week"
                    ? "bg-brand-dark text-white font-bold"
                    : "text-gray-500 hover:text-brand-dark font-semibold"
                )}
                onClick={() => handleToggleViewMode("week")}
              >
                Week
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          {!isMinimized && (
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                className="h-8 w-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="h-8 text-xs font-bold px-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setFocusDate(new Date())}
              >
                Today
              </button>
              <button
                type="button"
                className="h-8 w-8 border border-gray-200 rounded-lg flex items-center justify-center hover:bg-gray-50 cursor-pointer"
                onClick={handleNext}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Minimize/Maximize Button */}
          <button
            type="button"
            className="h-8 w-8 text-gray-500 hover:text-brand-dark flex items-center justify-center rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={handleToggleMinimized}
            title={isMinimized ? "Expand calendar" : "Collapse calendar"}
          >
            {isMinimized ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isMinimized && (
        <div className="space-y-4">
          {/* Color Customization Key */}
          <div className="flex flex-wrap gap-4 items-center justify-between p-3 border border-gray-200 rounded-xl bg-gray-50/70 text-xs">
            <div className="font-bold text-gray-600 flex items-center gap-1">
              <span>Calendar Color Key (Click color to change):</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.draftItem}
                  onChange={(e) => handleColorChange("draftItem", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Drafts (Needs Review)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.blogDraft}
                  onChange={(e) => handleColorChange("blogDraft", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Scheduled Blogs</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.scheduledEdm}
                  onChange={(e) => handleColorChange("scheduledEdm", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Scheduled EDMs</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.socialPost}
                  onChange={(e) => handleColorChange("socialPost", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Scheduled LinkedIn</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.igFbPost}
                  onChange={(e) => handleColorChange("igFbPost", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Scheduled IG / FB</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.sentPosted}
                  onChange={(e) => handleColorChange("sentPosted", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>Sent / Posted</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold hover:opacity-80 transition-opacity">
                <input
                  type="color"
                  value={colors.initialOnboarding}
                  onChange={(e) => handleColorChange("initialOnboarding", e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-gray-300 bg-transparent p-0 overflow-hidden"
                />
                <span>VIP Sign-Ups</span>
              </label>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="py-2 text-center text-xs font-bold text-gray-500 border-b border-gray-200 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-gray-200">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isPast = !isToday && day < new Date();

                return (
                  <div
                    key={idx}
                    className={cn(
                      viewMode === "week" ? "min-h-[150px]" : "min-h-[100px]",
                      "p-1.5 transition-colors relative flex flex-col justify-between",
                      isPast && "bg-gray-50/60",
                      isToday && "bg-brand-pink/10 ring-2 ring-inset ring-brand-pink z-10"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      {isToday ? (
                        <span className="text-[10px] font-black uppercase tracking-wide text-brand-pink">
                          Today
                        </span>
                      ) : (
                        <span />
                      )}
                      <div
                        className={cn(
                          "text-xs font-bold",
                          isToday
                            ? "bg-brand-pink text-white rounded-full min-w-6 h-6 px-1.5 flex items-center justify-center font-black shadow-sm"
                            : isPast
                            ? "text-gray-400"
                            : "text-gray-700"
                        )}
                      >
                        {day.getDate() === 1 || idx === 0 ? format(day, "MMM d") : format(day, "d")}
                      </div>
                    </div>

                    {/* Events list */}
                    <div className="space-y-1 flex-1 overflow-y-auto max-h-[105px]">
                      {dayEvents.slice(0, 4).map((event) => {
                        const isEdm = event.type === "edm";
                        const isBlog = event.type === "blog";
                        const isSocial = event.type === "social";
                        const isOnboarding = event.type === "onboarding";
                        const isIgFb = isSocial && event.platform === "igfb";
                        const socialLabel = isIgFb ? "IG / FB" : "LinkedIn";
                        const time =
                          (isEdm || isSocial) && event.date ? format(event.date, "h:mm a") : "";

                        let activeColor = "";
                        if (isEdm) {
                          if (event.status === "draft") {
                            activeColor = colors.draftItem;
                          } else if (event.status === "sent") {
                            activeColor = colors.sentPosted;
                          } else {
                            activeColor = colors.scheduledEdm;
                          }
                        } else if (isBlog) {
                          const isFuture = event.date > new Date();
                          if (event.is_draft) {
                            activeColor = colors.draftItem;
                          } else if (isFuture) {
                            activeColor = colors.blogDraft;
                          } else {
                            activeColor = colors.sentPosted;
                          }
                        } else if (isSocial) {
                          if (event.status === "draft") {
                            activeColor = colors.draftItem;
                          } else if (event.status === "posted" || event.status === "published") {
                            activeColor = colors.sentPosted;
                          } else {
                            activeColor = isIgFb ? colors.igFbPost : colors.socialPost;
                          }
                        } else if (isOnboarding) {
                          activeColor = colors.initialOnboarding;
                        }

                        const dynamicStyle = activeColor
                          ? {
                              borderLeftColor: activeColor,
                              backgroundColor: `${activeColor}18`,
                              color: activeColor,
                            }
                          : undefined;

                        return (
                          <button
                            key={`${event.type}-${event.id}`}
                            type="button"
                            title={`${event.subject} (${
                              isEdm
                                ? `EDM ${event.status}`
                                : isSocial
                                ? `${socialLabel} ${event.status}`
                                : isBlog
                                ? "Blog Post"
                                : "VIP Lead"
                            })`}
                            onClick={() => {
                              if (isEdm && event.campaignId) {
                                router.push(`/admin/edm/${event.campaignId}`);
                              } else if (isBlog) {
                                router.push(`/admin/blog/${event.id}`);
                              } else if (isSocial) {
                                router.push(
                                  isIgFb
                                    ? "/admin/social/instagram-facebook"
                                    : "/admin/social/linkedin"
                                );
                              } else {
                                router.push("/admin/leads");
                              }
                            }}
                            className={cn(
                              "text-[10px] p-1 rounded border-l-2 cursor-pointer w-full text-left transition-all",
                              "hover:scale-[1.02] active:scale-[0.98] flex flex-col gap-0.5 shadow-xs truncate",
                              !dynamicStyle &&
                                (isEdm
                                  ? statusColors[event.status || ""] || "border-gray-300 bg-gray-50"
                                  : "border-purple-400 bg-purple-50/50 text-purple-700")
                            )}
                            style={dynamicStyle}
                          >
                            <div className="flex items-center gap-1 text-[9px] font-bold opacity-90">
                              {isEdm ? (
                                <Mail
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: activeColor || undefined }}
                                />
                              ) : isBlog ? (
                                <BookOpen
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: activeColor || undefined }}
                                />
                              ) : isIgFb ? (
                                <Instagram
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: activeColor || undefined }}
                                />
                              ) : isSocial ? (
                                <Linkedin
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: activeColor || undefined }}
                                />
                              ) : (
                                <Sparkles
                                  className="h-2.5 w-2.5 shrink-0"
                                  style={{ color: activeColor || undefined }}
                                />
                              )}
                              <span className="truncate flex-1 font-extrabold">
                                {isEdm
                                  ? event.status === "draft"
                                    ? `EDM Draft (${time})`
                                    : `EDM (${time})`
                                  : isSocial
                                  ? `${socialLabel}${event.status === "draft" ? " Draft" : ""} (${time || "9:00 AM"})`
                                  : isBlog
                                  ? event.is_draft
                                    ? "Blog (Draft)"
                                    : event.date > new Date()
                                    ? "Blog (Scheduled)"
                                    : "Blog (Posted)"
                                  : "VIP Lead"}
                              </span>
                            </div>
                            <p className="truncate font-semibold leading-normal">{event.subject}</p>
                          </button>
                        );
                      })}

                      {dayEvents.length > 4 && (
                        <div className="text-[9px] font-bold text-gray-500 text-center mt-0.5">
                          +{dayEvents.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.draftItem,
                  backgroundColor: `${colors.draftItem}25`,
                }}
              />
              <span>Drafts (Needs Review)</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.blogDraft,
                  backgroundColor: `${colors.blogDraft}20`,
                }}
              />
              <span>Scheduled Blogs</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.scheduledEdm,
                  backgroundColor: `${colors.scheduledEdm}20`,
                }}
              />
              <span>Scheduled EDMs</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.socialPost,
                  backgroundColor: `${colors.socialPost}20`,
                }}
              />
              <span>Scheduled LinkedIn</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.igFbPost,
                  backgroundColor: `${colors.igFbPost}20`,
                }}
              />
              <span>Scheduled IG / FB</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.sentPosted,
                  backgroundColor: `${colors.sentPosted}20`,
                }}
              />
              <span>Sent / Published</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded border-l-2"
                style={{
                  borderLeftColor: colors.initialOnboarding,
                  backgroundColor: `${colors.initialOnboarding}20`,
                }}
              />
              <span>VIP Sign-Ups</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
