"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Calendar,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Save,
} from "lucide-react";
import {
  LinkedinIcon as Linkedin,
  InstagramIcon as Instagram,
  FacebookIcon as Facebook,
} from "@/components/icons/SocialIcons";

export type Platform = "linkedin" | "instagram" | "facebook" | "instagram_facebook";
export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "posting"
  | "posted"
  | "published"
  | "failed"
  | "partial_failed";

export interface SocialPost {
  id: string;
  brief: string;
  status: SocialPostStatus;
  scheduled_at: string | null;
  timezone: string;
  posted_at: string | null;
  error_message: string | null;
  created_at: string;
  source_blog_id?: string | null;
  content_type?: string | null;
}

export interface Caption {
  id: string;
  post_id: string;
  platform: Platform;
  caption: string;
  hashtags: string[];
  post_url: string | null;
  media_urls?: string[] | null;
}

interface PostDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: SocialPost | null;
  captions: Caption[];
  onUpdated?: () => void;
}

const platformIcons: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  instagram: Instagram,
  facebook: Facebook,
  instagram_facebook: Instagram,
};

const platformColors: Record<string, string> = {
  linkedin: "bg-[#0A66C2] text-white",
  instagram: "bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#E1306C] text-white",
  facebook: "bg-[#1877F2] text-white",
  instagram_facebook: "bg-gradient-to-r from-[#833AB4] via-[#C13584] to-[#E1306C] text-white",
};

const statusColors: Record<string, string> = {
  draft: "bg-amber-100 text-amber-800",
  scheduled: "bg-blue-100 text-blue-800",
  posting: "bg-yellow-100 text-yellow-800",
  posted: "bg-green-100 text-green-800",
  published: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  partial_failed: "bg-orange-100 text-orange-800",
};

export default function PostDetailSheet({
  open,
  onOpenChange,
  post,
  captions,
  onUpdated,
}: PostDetailSheetProps) {
  const supabase = createClient() as any;

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedBrief, setEditedBrief] = useState("");
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [editedScheduledAt, setEditedScheduledAt] = useState("");

  if (!open || !post) return null;

  const startEditing = () => {
    setEditedBrief(post.brief);
    setEditedScheduledAt(
      post.scheduled_at ? format(new Date(post.scheduled_at), "yyyy-MM-dd'T'HH:mm") : ""
    );
    const captionMap: Record<string, string> = {};
    captions.forEach((c) => {
      captionMap[c.id] = c.caption;
    });
    setEditedCaptions(captionMap);
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error: postError } = await supabase
        .from("social_posts")
        .update({
          brief: editedBrief,
          scheduled_at: editedScheduledAt ? new Date(editedScheduledAt).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (postError) throw postError;

      for (const [captionId, captionText] of Object.entries(editedCaptions)) {
        const { error: captionError } = await supabase
          .from("social_post_captions")
          .update({ caption: captionText })
          .eq("id", captionId);
        if (captionError) throw captionError;
      }

      toast.success("Post updated");
      setIsEditing(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this social post and all associated captions?")) return;
    try {
      setDeleting(true);
      const { error } = await supabase.from("social_posts").delete().eq("id", post.id);
      if (error) throw error;
      toast.success("Post deleted");
      onOpenChange(false);
      onUpdated?.();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
      <div className="bg-white w-full max-w-lg h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                  statusColors[post.status] || "bg-gray-100 text-gray-800"
                }`}
              >
                {post.status}
              </span>
              {post.content_type && (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-gray-200 text-gray-600">
                  {post.content_type}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Brief */}
            <div className="space-y-2">
              <label className="text-gray-500 text-xs font-bold uppercase tracking-wide block">
                Brief
              </label>
              {isEditing ? (
                <textarea
                  value={editedBrief}
                  onChange={(e) => setEditedBrief(e.target.value)}
                  className="w-full min-h-[80px] rounded-xl border border-gray-200 p-3 text-sm"
                />
              ) : (
                <p className="text-sm font-semibold text-brand-dark">{post.brief}</p>
              )}
            </div>

            {/* Schedule */}
            <div className="space-y-2">
              <label className="text-gray-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Scheduled
              </label>
              {isEditing ? (
                <input
                  type="datetime-local"
                  value={editedScheduledAt}
                  onChange={(e) => setEditedScheduledAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 p-2.5 text-sm"
                />
              ) : post.scheduled_at ? (
                <p className="text-sm font-bold text-gray-800">
                  {format(new Date(post.scheduled_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                </p>
              ) : (
                <p className="text-sm text-gray-400">Not scheduled</p>
              )}
            </div>

            {post.status === "posted" && post.posted_at && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-3 rounded-xl">
                <CheckCircle className="h-4 w-4" />
                Posted at {format(new Date(post.posted_at), "MMM d, yyyy h:mm a")}
              </div>
            )}

            {(post.status === "failed" || post.status === "partial_failed") &&
              post.error_message && (
                <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-xl">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{post.error_message}</span>
                </div>
              )}

            {/* Platform Captions */}
            <div className="space-y-4">
              <label className="text-gray-500 text-xs font-bold uppercase tracking-wide block">
                Platform Content
              </label>
              {captions.map((caption) => {
                const Icon = platformIcons[caption.platform] || Linkedin;
                return (
                  <div key={caption.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                          platformColors[caption.platform] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {caption.platform.charAt(0).toUpperCase() + caption.platform.slice(1)}
                      </span>
                      {caption.post_url && (
                        <a
                          href={caption.post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-pink hover:underline flex items-center gap-1 font-semibold"
                        >
                          View link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {isEditing ? (
                      <textarea
                        value={editedCaptions[caption.id] || ""}
                        onChange={(e) =>
                          setEditedCaptions((prev) => ({
                            ...prev,
                            [caption.id]: e.target.value,
                          }))
                        }
                        className="w-full min-h-[120px] rounded-xl border border-gray-200 p-3 text-sm font-mono"
                      />
                    ) : (
                      <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100">
                        <p className="text-xs whitespace-pre-wrap font-mono text-gray-800">
                          {caption.caption}
                        </p>
                        {caption.hashtags && caption.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {caption.hashtags.map((tag, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full bg-white border border-gray-200 text-[11px] font-semibold text-gray-600"
                              >
                                #{tag.replace(/^#/, "")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 mt-6 border-t border-gray-100">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 px-4 rounded-xl bg-brand-dark text-white text-xs font-bold hover:bg-brand-pink flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={startEditing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-bold hover:bg-gray-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="p-2.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
