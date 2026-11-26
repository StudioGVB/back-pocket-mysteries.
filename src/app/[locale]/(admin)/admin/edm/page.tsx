"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { duplicateCampaign } from "./duplicateCampaign";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Mail,
  Eye,
  Copy,
  Search,
  Archive,
  Calendar,
  CalendarX,
  Loader2,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InlineDateTimeEditor } from "@/components/admin/InlineDateTimeEditor";

type EdmStatus = "draft" | "scheduled" | "sending" | "sent" | "archived";
type StatusFilter = "all" | "draft" | "scheduled" | "sending" | "sent" | "archived";
type SortField = "subject" | "status" | "scheduled_for" | "date" | "sent_count" | "open_rate";
type SortDir = "asc" | "desc";

interface EdmCampaign {
  id: string;
  subject: string;
  status: EdmStatus;
  sent_at: string | null;
  scheduled_at: string | null;
  created_at: string;
  delivered_count?: number;
  failed_count?: number;
}

interface CampaignStats {
  total_sent: number;
  opened: number;
}

const statusBadge = (status: EdmStatus) => {
  switch (status) {
    case "draft":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
          Draft
        </span>
      );
    case "scheduled":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-brand-pink/40 bg-brand-pink/10 text-brand-pink">
          Scheduled
        </span>
      );
    case "sending":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-amber-400/40 bg-amber-50 text-amber-700">
          Sending…
        </span>
      );
    case "sent":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
          Sent
        </span>
      );
    case "archived":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400">
          Archived
        </span>
      );
  }
};

export default function EdmCampaignsPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EdmCampaign[]>([]);
  const [stats, setStats] = useState<Record<string, CampaignStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const fetchCampaigns = async (skipDueCheck = false) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("edm_campaigns")
        .select("id, subject, status, sent_at, scheduled_at, created_at, delivered_count, failed_count")
        .order("created_at", { ascending: false });

      if (error) throw error;
      const rows = (data as EdmCampaign[]) || [];
      setCampaigns(rows);

      if (!skipDueCheck) {
        const hasDueScheduled = rows.some(
          (c) =>
            c.status === "scheduled" &&
            c.scheduled_at &&
            new Date(c.scheduled_at).getTime() <= Date.now()
        );
        if (hasDueScheduled) {
          fetch("/api/cron/send-scheduled-edms")
            .then((r) => r.json())
            .then((res) => {
              if (res?.dueCount > 0) {
                toast.success(`Dispatched ${res.dueCount} scheduled EDM campaign(s)!`);
                fetchCampaigns(true);
              }
            })
            .catch(() => {});
        }
      }

      if (rows.length > 0) {
        const campaignIds = rows.map((c) => c.id);
        const { data: eventsData } = await supabase
          .from("edm_events")
          .select("campaign_id, status")
          .in("campaign_id", campaignIds);

        const statsMap: Record<string, CampaignStats> = {};
        for (const ev of eventsData || []) {
          if (!statsMap[ev.campaign_id]) {
            statsMap[ev.campaign_id] = { total_sent: 0, opened: 0 };
          }
          if (ev.status === "delivered") statsMap[ev.campaign_id].total_sent += 1;
          if (ev.status === "opened") statsMap[ev.campaign_id].opened += 1;
        }
        setStats(statsMap);
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const statusCounts = useMemo(
    () => ({
      all: campaigns.length,
      draft: campaigns.filter((c) => c.status === "draft").length,
      scheduled: campaigns.filter((c) => c.status === "scheduled").length,
      sending: campaigns.filter((c) => c.status === "sending").length,
      sent: campaigns.filter((c) => c.status === "sent").length,
      archived: campaigns.filter((c) => c.status === "archived").length,
    }),
    [campaigns]
  );

  const getOpenRateValue = (campaignId: string): number | null => {
    const s = stats[campaignId];
    const campaign = campaigns.find((c) => c.id === campaignId);
    const totalSent = s?.total_sent || campaign?.delivered_count || 0;
    const opened = s?.opened || 0;
    if (totalSent === 0) return null;
    return opened / totalSent;
  };

  const getOpenRateLabel = (campaignId: string): string => {
    const v = getOpenRateValue(campaignId);
    return v === null ? "—" : `${Math.round(v * 100)}%`;
  };

  const filteredCampaigns = useMemo(() => {
    let result = campaigns.filter((c) => {
      const matchesSearch =
        !searchQuery || c.subject.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        const mul = sortDir === "asc" ? 1 : -1;
        if (sortField === "subject") {
          return mul * a.subject.localeCompare(b.subject);
        }
        if (sortField === "status") {
          const statusRank: Record<string, number> = {
            sending: 1,
            scheduled: 2,
            draft: 3,
            sent: 4,
            archived: 5,
          };
          const rankA = statusRank[a.status] ?? 99;
          const rankB = statusRank[b.status] ?? 99;
          if (rankA !== rankB) return mul * (rankA - rankB);
          const dateA = a.sent_at ?? a.scheduled_at ?? a.created_at;
          const dateB = b.sent_at ?? b.scheduled_at ?? b.created_at;
          return mul * (new Date(dateB).getTime() - new Date(dateA).getTime());
        }
        if (sortField === "scheduled_for") {
          const dateA = a.scheduled_at ? new Date(a.scheduled_at).getTime() : 0;
          const dateB = b.scheduled_at ? new Date(b.scheduled_at).getTime() : 0;
          return mul * (dateA - dateB);
        }
        if (sortField === "date") {
          const dateA = a.sent_at ?? a.scheduled_at ?? a.created_at;
          const dateB = b.sent_at ?? b.scheduled_at ?? b.created_at;
          return mul * (new Date(dateA).getTime() - new Date(dateB).getTime());
        }
        if (sortField === "sent_count") {
          const aVal = stats[a.id]?.total_sent ?? 0;
          const bVal = stats[b.id]?.total_sent ?? 0;
          return mul * (aVal - bVal);
        }
        if (sortField === "open_rate") {
          const aVal = getOpenRateValue(a.id) ?? -1;
          const bVal = getOpenRateValue(b.id) ?? -1;
          return mul * (aVal - bVal);
        }
        return 0;
      });
    } else {
      if (statusFilter === "scheduled") {
        result = [...result].sort(
          (a, b) =>
            new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime()
        );
      } else if (statusFilter === "all") {
        const statusRank: Record<string, number> = {
          sending: 1,
          scheduled: 2,
          draft: 3,
          sent: 4,
          archived: 5,
        };
        result = [...result].sort((a, b) => {
          const rankA = statusRank[a.status] ?? 99;
          const rankB = statusRank[b.status] ?? 99;
          if (rankA !== rankB) return rankA - rankB;
          const dateA = a.sent_at ?? a.scheduled_at ?? a.created_at;
          const dateB = b.sent_at ?? b.scheduled_at ?? b.created_at;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
      }
    }

    return result;
  }, [campaigns, searchQuery, statusFilter, sortField, sortDir, stats]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredCampaigns.map((c) => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
    setSelectedIds(allSelected ? new Set() : new Set(visibleIds));
  };

  const handleScheduleApprove = async (campaign: EdmCampaign) => {
    try {
      const scheduledAt = campaign.scheduled_at || new Date(Date.now() + 86400000).toISOString();
      const { error } = await supabase
        .from("edm_campaigns")
        .update({
          status: "scheduled",
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaign.id);
      if (error) throw error;
      toast.success("Campaign marked as Scheduled!");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUnschedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("edm_campaigns")
        .update({ status: "draft", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Campaign returned to draft");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleUpdateScheduledAt = async (campaignId: string, newIsoDate: string) => {
    try {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaignId ? { ...c, scheduled_at: newIsoDate } : c))
      );
      const { error } = await supabase
        .from("edm_campaigns")
        .update({
          scheduled_at: newIsoDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      if (error) throw error;
      toast.success("EDM scheduled date & time updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update scheduled date");
      fetchCampaigns();
    }
  };

  const handleArchive = async (id: string) => {
    try {
      const { error } = await supabase
        .from("edm_campaigns")
        .update({ status: "archived", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Campaign archived");
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    try {
      const { error } = await supabase.from("edm_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success("Campaign deleted");
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      fetchCampaigns();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDuplicate = async (campaign: EdmCampaign) => {
    try {
      const newId = await duplicateCampaign(supabase, campaign.id);
      toast.success("Campaign duplicated! Redirecting to editor...");
      router.push(`/admin/edm/${newId}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to duplicate");
    }
  };

  const statusFilterTabs: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: statusCounts.all },
    { value: "draft", label: "Draft", count: statusCounts.draft },
    { value: "scheduled", label: "Scheduled", count: statusCounts.scheduled },
    { value: "sent", label: "Sent", count: statusCounts.sent },
    { value: "archived", label: "Archived", count: statusCounts.archived },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
            EDM <span className="text-brand-pink italic">Campaigns</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold">
            Create, review, and schedule weekly email marketing roundups for your VIP &amp; newsletter leads
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/social"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark shadow-xs"
          >
            <Calendar className="h-4 w-4 text-brand-pink" />
            View Calendar
          </Link>
          <Link
            href="/admin/edm/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-pink text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="inline-flex flex-wrap rounded-xl border border-gray-200 bg-white p-1 gap-1">
        {statusFilterTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer",
              statusFilter === tab.value
                ? "bg-brand-dark text-white"
                : "text-gray-600 hover:text-brand-dark"
            )}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search + Count */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-pink"
          />
        </div>
        <div className="text-xs text-gray-500 font-semibold">
          Showing <span className="font-bold text-brand-dark">{filteredCampaigns.length}</span> of{" "}
          <span className="font-bold text-brand-dark">{campaigns.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-3.5 px-4 w-[40px]">
                  <input
                    type="checkbox"
                    checked={
                      filteredCampaigns.length > 0 &&
                      filteredCampaigns.every((c) => selectedIds.has(c.id))
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("subject")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Subject <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("status")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("scheduled_for")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Scheduled <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("sent_count")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Sent <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("open_rate")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Open Rate <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("date")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Date <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin inline mr-2 text-brand-pink" />
                    Loading campaigns…
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <Mail className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold text-sm">
                      {campaigns.length === 0
                        ? "No EDM campaigns yet"
                        : "No campaigns match your filters"}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(campaign.id)}
                        onChange={() => toggleSelect(campaign.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/admin/edm/${campaign.id}`}
                        className="font-bold text-brand-dark hover:text-brand-pink transition-colors"
                      >
                        {campaign.subject}
                      </Link>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Created {format(new Date(campaign.created_at), "MMM d, yyyy")}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">{statusBadge(campaign.status)}</td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <InlineDateTimeEditor
                        value={campaign.scheduled_at || campaign.created_at}
                        onSave={(iso) => handleUpdateScheduledAt(campaign.id, iso)}
                      >
                        {campaign.scheduled_at ? (
                          <div className="px-1.5 py-1 rounded-lg hover:bg-gray-100">
                            <div className="flex items-center gap-1.5 text-sm font-bold text-brand-dark">
                              <Calendar
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0",
                                  campaign.status === "scheduled"
                                    ? "text-brand-pink"
                                    : "text-amber-500"
                                )}
                              />
                              <span>{format(new Date(campaign.scheduled_at), "MMM d, yyyy")}</span>
                              <span className="text-xs font-normal text-gray-500">
                                {format(new Date(campaign.scheduled_at), "h:mmaaa")}
                              </span>
                            </div>
                            <div className="text-[11px] text-amber-600 font-bold">
                              {campaign.status === "draft"
                                ? "Target (Double-click to edit)"
                                : "Double-click to edit"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 px-1.5 py-1 rounded-lg hover:bg-gray-100 inline-block">
                            — (Double-click to set)
                          </span>
                        )}
                      </InlineDateTimeEditor>
                    </td>
                    <td className="py-3.5 px-4 text-sm font-semibold">
                      {stats[campaign.id]?.total_sent != null &&
                      stats[campaign.id].total_sent > 0
                        ? stats[campaign.id].total_sent.toLocaleString()
                        : campaign.delivered_count != null && campaign.delivered_count > 0
                        ? campaign.delivered_count.toLocaleString()
                        : campaign.status === "sent"
                        ? "0"
                        : "—"}
                    </td>
                    <td className="py-3.5 px-4 text-sm font-semibold">
                      {getOpenRateLabel(campaign.id)}
                    </td>
                    <td className="py-3.5 px-4">
                      {campaign.status === "sent" && campaign.sent_at ? (
                        <div>
                          <div className="text-sm font-semibold">
                            {format(new Date(campaign.sent_at), "MMM d, yyyy")}{" "}
                            <span className="text-xs text-gray-400">
                              {format(new Date(campaign.sent_at), "h:mmaaa")}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">Sent</div>
                        </div>
                      ) : (
                        <InlineDateTimeEditor
                          value={campaign.scheduled_at || campaign.created_at}
                          onSave={(iso) => handleUpdateScheduledAt(campaign.id, iso)}
                        >
                          {campaign.status === "scheduled" && campaign.scheduled_at ? (
                            <div className="px-1.5 py-1 rounded-lg hover:bg-gray-100">
                              <div className="flex items-center gap-1 text-sm text-brand-pink font-bold">
                                <Calendar className="h-3.5 w-3.5 shrink-0" />
                                {format(new Date(campaign.scheduled_at), "MMM d, yyyy")}
                              </div>
                              <div className="text-xs text-gray-400">Scheduled (double-click)</div>
                            </div>
                          ) : (
                            <div className="px-1.5 py-1 rounded-lg hover:bg-gray-100">
                              <div className="text-sm font-semibold">
                                {format(new Date(campaign.created_at), "MMM d, yyyy")}
                              </div>
                              <div className="text-xs text-gray-400">Created (double-click)</div>
                            </div>
                          )}
                        </InlineDateTimeEditor>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {campaign.status === "draft" && (
                          <button
                            type="button"
                            onClick={() => handleScheduleApprove(campaign)}
                            title="Approve & Mark Scheduled"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-400 text-amber-900 hover:bg-amber-100 text-xs font-bold cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 text-amber-600" />
                            Schedule
                          </button>
                        )}
                        {campaign.status === "scheduled" && (
                          <button
                            type="button"
                            onClick={() => handleUnschedule(campaign.id)}
                            title="Unschedule back to Draft"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-400 text-emerald-800 hover:bg-emerald-100 text-xs font-bold cursor-pointer"
                          >
                            <CalendarX className="h-3.5 w-3.5" />
                            Unschedule
                          </button>
                        )}
                        <Link
                          href={`/admin/edm/${campaign.id}`}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-brand-dark"
                          title={campaign.status === "draft" ? "Edit" : "View"}
                        >
                          {campaign.status === "draft" ? (
                            <Edit className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(campaign)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-brand-dark cursor-pointer"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {campaign.status === "sent" && (
                          <button
                            type="button"
                            onClick={() => handleArchive(campaign.id)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-brand-dark cursor-pointer"
                            title="Archive"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(campaign.id)}
                          className="p-1.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100 text-red-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
