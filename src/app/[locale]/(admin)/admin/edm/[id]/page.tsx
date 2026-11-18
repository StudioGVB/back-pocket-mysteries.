"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { duplicateCampaign } from "../duplicateCampaign";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  CalendarX,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  Save,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "archived";

const EMAIL_FONT_FAMILY = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

export function compileBlocksToHtml(blocks: any[]): string {
  const renderBlock = (block: any) => {
    const s = block.data?.sectionStyles || {};
    const sw = `background-color:${s.backgroundColor || "transparent"};padding-top:${
      s.paddingTop ?? 12
    }px;padding-bottom:${s.paddingBottom ?? 12}px;padding-left:${
      s.paddingLeft ?? 16
    }px;padding-right:${s.paddingRight ?? 16}px;`;
    const d = block.data || {};
    if (block.type === "text") {
      return `<tr><td style="${sw}"><div style="color:${d.textColor || "#1e191c"};text-align:${
        d.textAlign || "left"
      };font-size:${d.fontSize || 15}px;font-family:${EMAIL_FONT_FAMILY};line-height:${
        d.lineHeight || 1.6
      };margin:0;">${d.content || ""}</div></td></tr>`;
    }
    if (block.type === "image") {
      return `<tr><td style="${sw}" align="${d.align || "center"}"><a href="${
        d.linkUrl || "#"
      }" target="_blank" style="display:inline-block;width:100%;"><img src="${
        d.src || ""
      }" alt="${d.alt || ""}" style="width:${
        d.width || "100%"
      };max-width:100%;height:auto;border-radius:${
        d.borderRadius ?? 8
      }px;display:block;" /></a></td></tr>`;
    }
    if (block.type === "button") {
      return `<tr><td style="${sw}" align="${
        d.align || "left"
      }"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${
        d.backgroundColor || "#fe04c6"
      };border-radius:${d.borderRadius ?? 6}px;padding:${d.padding?.y ?? 12}px ${
        d.padding?.x ?? 24
      }px;"><a href="${d.url || "#"}" target="_blank" style="display:inline-block;color:${
        d.textColor || "#ffffff"
      };font-weight:700;font-family:${EMAIL_FONT_FAMILY};font-size:15px;text-decoration:none;">${
        d.text || "Read More"
      }</a></td></tr></table></td></tr>`;
    }
    if (block.type === "divider") {
      return `<tr><td style="${sw}"><div style="padding:${
        d.margin ?? 16
      }px 0;"><hr style="border:none;border-top:${d.thickness ?? 1}px ${
        d.style || "solid"
      } ${d.color || "#e8e8eb"};margin:0;" /></div></td></tr>`;
    }
    return "";
  };

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${EMAIL_FONT_FAMILY};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:20px 0;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;">${blocks
    .map(renderBlock)
    .join("")}</table></td></tr></table></body></html>`;
}

export default function EdmCampaignDetailPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<CampaignStatus>("draft");
  const [subject, setSubject] = useState("");
  const [preheader, setPreheader] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [fromName, setFromName] = useState("Gabby from Back Pocket Mysteries");
  const [fromEmail, setFromEmail] = useState("hello@backpocketmysteries.com");
  const [blocks, setBlocks] = useState<any[]>([]);
  const [htmlContent, setHtmlContent] = useState("");
  const [leadsCount, setLeadsCount] = useState<number>(0);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const { count } = await supabase
        .from("leads")
        .select("id", { count: "exact", head: true });
      setLeadsCount(count || 0);

      if (isNew) {
        const defaultBlocks = [
          {
            id: "hero",
            type: "text",
            data: {
              content:
                "<p style='font-size:12px;font-weight:700;letter-spacing:2px;color:#fe04c6;text-transform:uppercase;margin:0 0 12px 0;'>THE MYSTERY GAZETTE</p><h1 style='font-size:26px;font-weight:800;color:#ffffff;margin:0;line-height:1.25;'>Weekly Hosting Roundup</h1>",
              fontSize: 16,
              textAlign: "left",
              textColor: "#ffffff",
              lineHeight: 1.5,
              sectionStyles: {
                backgroundColor: "#1e191c",
                paddingTop: 40,
                paddingBottom: 32,
                paddingLeft: 32,
                paddingRight: 32,
              },
            },
          },
          {
            id: "intro",
            type: "text",
            data: {
              content:
                "<p style='margin:0 0 14px 0;'>Hi {{first_name}},</p><p style='margin:0;'>Welcome to this week's Back Pocket Mysteries roundup! Here are our two latest guides to help you host an unforgettable murder mystery night.</p>",
              fontSize: 16,
              textAlign: "left",
              textColor: "#1e191c",
              lineHeight: 1.7,
              sectionStyles: {
                backgroundColor: "transparent",
                paddingTop: 24,
                paddingBottom: 12,
                paddingLeft: 16,
                paddingRight: 16,
              },
            },
          },
        ];
        setBlocks(defaultBlocks);
        setHtmlContent(compileBlocksToHtml(defaultBlocks));
        return;
      }

      const { data, error } = await supabase
        .from("edm_campaigns")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      setStatus(data.status || "draft");
      setSubject(data.subject || "");
      setPreheader(data.preheader || "");
      setFromName(data.from_name || "Gabby from Back Pocket Mysteries");
      setFromEmail(data.from_email || "hello@backpocketmysteries.com");
      if (data.scheduled_at) {
        const d = new Date(data.scheduled_at);
        const pad = (n: number) => String(n).padStart(2, "0");
        setScheduledAt(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`
        );
      }
      const loadedBlocks = Array.isArray(data.blocks_json) ? data.blocks_json : [];
      setBlocks(loadedBlocks);
      setHtmlContent(
        data.html_content ||
          (loadedBlocks.length > 0 ? compileBlocksToHtml(loadedBlocks) : "")
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, supabase]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handleSave = async (nextStatus?: CampaignStatus) => {
    if (!subject.trim()) {
      toast.error("Please enter a campaign subject line.");
      return;
    }

    try {
      setSaving(true);
      const targetStatus = nextStatus || status;
      const compiledHtml =
        blocks.length > 0 ? compileBlocksToHtml(blocks) : htmlContent;

      const payload = {
        subject: subject.trim(),
        preheader: preheader.trim(),
        status: targetStatus,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        from_name: fromName,
        from_email: fromEmail,
        blocks_json: blocks,
        html_content: compiledHtml,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("edm_campaigns")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Campaign created!");
        router.push(`/admin/edm/${data.id}`);
      } else {
        const { error } = await supabase
          .from("edm_campaigns")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        setStatus(targetStatus);
        setHtmlContent(compiledHtml);
        toast.success(
          targetStatus === "scheduled"
            ? "Campaign scheduled!"
            : "Campaign saved!"
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (isNew) return;
    try {
      const newId = await duplicateCampaign(supabase, id);
      toast.success("Campaign duplicated!");
      router.push(`/admin/edm/${newId}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
        <Loader2 className="h-6 w-6 animate-spin text-brand-pink mr-2" />
        <span className="text-sm font-semibold text-gray-500">Loading campaign…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/edm"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-dark mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to EDM Campaigns
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none">
              {isNew ? "New EDM Campaign" : subject || "EDM Campaign"}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                status === "scheduled"
                  ? "bg-brand-pink text-white"
                  : status === "sent"
                  ? "bg-emerald-600 text-white"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={handleDuplicate}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" />
              Duplicate
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark cursor-pointer"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>

          {status === "scheduled" ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("draft")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer"
            >
              <CalendarX className="h-3.5 w-3.5" />
              Unschedule (Back to Draft)
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave("scheduled")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Mark Scheduled
            </button>
          )}
        </div>
      </div>

      {/* Editor + Live Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Campaign Settings & Blocks */}
        <div className="lg:col-span-6 space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark flex items-center gap-2">
              <Mail className="h-4 w-4 text-brand-pink" />
              1. Campaign Metadata &amp; Schedule
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., How to Host a DIY Murder Mystery & Viral Themes for 2026 🕵️‍♀️"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Preheader Text
                </label>
                <input
                  type="text"
                  value={preheader}
                  onChange={(e) => setPreheader(e.target.value)}
                  placeholder="Short preview text shown in the inbox next to the subject line"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    From Name
                  </label>
                  <input
                    type="text"
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    From Email
                  </label>
                  <input
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-brand-pink" />
                    Target / Scheduled Date &amp; Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-brand-pink" />
                    Target Audience
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-bold text-gray-700 flex items-center justify-between">
                    <span>All Newsletter &amp; VIP Leads</span>
                    <span className="px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink">
                      {leadsCount} subscribers
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HTML / Blocks Editor */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark">
                2. Email Blocks ({blocks.length} sections)
              </h2>
              {scheduledAt && (
                <span className="text-xs text-gray-500 font-semibold">
                  Target: {format(new Date(scheduledAt), "EEE, MMM d, yyyy h:mm a")}
                </span>
              )}
            </div>

            {blocks.length > 0 ? (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {blocks.map((block, idx) => (
                  <div
                    key={block.id || idx}
                    className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                      <span>
                        #{idx + 1} • {block.id} ({block.type})
                      </span>
                    </div>
                    {block.type === "text" && (
                      <textarea
                        value={block.data?.content || ""}
                        onChange={(e) => {
                          const updated = [...blocks];
                          updated[idx] = {
                            ...block,
                            data: { ...block.data, content: e.target.value },
                          };
                          setBlocks(updated);
                          setHtmlContent(compileBlocksToHtml(updated));
                        }}
                        className="w-full min-h-[90px] rounded-lg border border-gray-200 bg-white p-2.5 text-xs font-mono"
                      />
                    )}
                    {block.type === "button" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={block.data?.text || ""}
                          onChange={(e) => {
                            const updated = [...blocks];
                            updated[idx] = {
                              ...block,
                              data: { ...block.data, text: e.target.value },
                            };
                            setBlocks(updated);
                            setHtmlContent(compileBlocksToHtml(updated));
                          }}
                          placeholder="Button label"
                          className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-semibold"
                        />
                        <input
                          type="text"
                          value={block.data?.url || ""}
                          onChange={(e) => {
                            const updated = [...blocks];
                            updated[idx] = {
                              ...block,
                              data: { ...block.data, url: e.target.value },
                            };
                            setBlocks(updated);
                            setHtmlContent(compileBlocksToHtml(updated));
                          }}
                          placeholder="Button URL"
                          className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-mono"
                        />
                      </div>
                    )}
                    {block.type === "image" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={block.data?.src || ""}
                          onChange={(e) => {
                            const updated = [...blocks];
                            updated[idx] = {
                              ...block,
                              data: { ...block.data, src: e.target.value },
                            };
                            setBlocks(updated);
                            setHtmlContent(compileBlocksToHtml(updated));
                          }}
                          placeholder="Image URL"
                          className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={block.data?.linkUrl || ""}
                          onChange={(e) => {
                            const updated = [...blocks];
                            updated[idx] = {
                              ...block,
                              data: { ...block.data, linkUrl: e.target.value },
                            };
                            setBlocks(updated);
                            setHtmlContent(compileBlocksToHtml(updated));
                          }}
                          placeholder="Click-through URL"
                          className="rounded-lg border border-gray-200 bg-white p-2 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                placeholder="Paste or edit raw HTML email content..."
                className="w-full min-h-[360px] rounded-xl border border-gray-200 p-3 text-xs font-mono"
              />
            )}
          </div>
        </div>

        {/* Right Column: Live 600px Email Preview */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs sticky top-6">
            <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-brand-dark">
                  Live Email Preview (600px)
                </span>
                <p className="text-[11px] text-gray-500 truncate max-w-md">
                  {subject || "Untitled Subject"}
                </p>
              </div>
              <Send className="h-4 w-4 text-brand-pink" />
            </div>
            <div className="p-4 bg-gray-100">
              <iframe
                title="EDM Preview"
                srcDoc={htmlContent}
                className="w-full h-[680px] bg-white rounded-xl border border-gray-200 shadow-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
