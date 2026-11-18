"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { marked } from "marked";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Eye,
  Loader2,
  Save,
  Star,
  Image as ImageIcon,
  Search,
} from "lucide-react";
import Link from "next/link";

const DEFAULT_CATEGORIES = [
  "Guides",
  "Hosting Tips",
  "Party Themes",
  "Trends",
  "Comparisons",
  "Behind the Mystery",
];

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function AdminBlogPostEditorPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const params = useParams();
  const id = params.id as string;
  const isNew = id === "new";
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [category, setCategory] = useState("Guides");
  const [tags, setTags] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("/blog/hosting-guide.png");
  const [authorName, setAuthorName] = useState("Alex Sterling");
  const [authorRole, setAuthorRole] = useState("Lead Story Architect");
  const [readTime, setReadTime] = useState("10 min read");
  const [isDraft, setIsDraft] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [publishDate, setPublishDate] = useState("");

  // SEO fields
  const [metaTitle, setMetaTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [secondaryKeywords, setSecondaryKeywords] = useState("");
  const [ogTitle, setOgTitle] = useState("");
  const [ogDescription, setOgDescription] = useState("");
  const [twitterTitle, setTwitterTitle] = useState("");
  const [twitterDescription, setTwitterDescription] = useState("");
  const [noIndex, setNoIndex] = useState(false);
  const [noFollow, setNoFollow] = useState(false);

  const fetchPost = useCallback(async () => {
    if (isNew) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;

      setTitle(data.title || "");
      setSlug(data.slug || "");
      setSubtitle(data.subtitle || "");
      setExcerpt(data.excerpt || "");
      setContentMarkdown(data.content_markdown || data.content || "");
      setCategory(data.category || "Guides");
      setTags((data.tags || []).join(", "));
      setFeaturedImageUrl(data.featured_image_url || "/blog/hosting-guide.png");
      setAuthorName(data.author_name || "Alex Sterling");
      setAuthorRole(data.author_role || "Lead Story Architect");
      setReadTime(data.read_time || "10 min read");
      setIsDraft(Boolean(data.is_draft));
      setIsFeatured(Boolean(data.is_featured));
      if (data.publish_date) {
        const d = new Date(data.publish_date);
        const pad = (n: number) => String(n).padStart(2, "0");
        setPublishDate(
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
            d.getHours()
          )}:${pad(d.getMinutes())}`
        );
      }
      setMetaTitle(data.meta_title || "");
      setSeoDescription(data.seo_description || "");
      setFocusKeyword(data.focus_keyword || "");
      setSecondaryKeywords((data.secondary_keywords || []).join(", "));
      setOgTitle(data.og_title || "");
      setOgDescription(data.og_description || "");
      setTwitterTitle(data.twitter_title || "");
      setTwitterDescription(data.twitter_description || "");
      setNoIndex(Boolean(data.no_index));
      setNoFollow(Boolean(data.no_follow));
    } catch (err: any) {
      toast.error(err.message || "Failed to load blog post");
    } finally {
      setLoading(false);
    }
  }, [id, isNew, supabase]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Please enter a blog title.");
      return;
    }

    try {
      setSaving(true);
      const finalSlug = slug.trim() || generateSlug(title);
      const htmlContent = contentMarkdown.trim().startsWith("<")
        ? contentMarkdown
        : await marked(contentMarkdown);

      const payload = {
        title: title.trim(),
        slug: finalSlug,
        subtitle: subtitle.trim() || null,
        excerpt: excerpt.trim() || seoDescription.trim() || null,
        content: htmlContent,
        content_markdown: htmlContent,
        category: category || "Guides",
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        featured_image_url: featuredImageUrl.trim() || "/blog/hosting-guide.png",
        author_name: authorName.trim() || "Alex Sterling",
        author_role: authorRole.trim() || "Lead Story Architect",
        read_time: readTime.trim() || "10 min read",
        is_draft: isDraft,
        is_featured: isFeatured,
        publish_date: publishDate ? new Date(publishDate).toISOString() : new Date().toISOString(),
        meta_title: metaTitle.trim() || null,
        seo_description: seoDescription.trim() || null,
        focus_keyword: focusKeyword.trim() || null,
        secondary_keywords: secondaryKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        og_title: ogTitle.trim() || null,
        og_description: ogDescription.trim() || null,
        twitter_title: twitterTitle.trim() || null,
        twitter_description: twitterDescription.trim() || null,
        no_index: noIndex,
        no_follow: noFollow,
        updated_at: new Date().toISOString(),
      };

      if (isNew) {
        const { data, error } = await supabase
          .from("blog_posts")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Blog post created!");
        router.push(`/admin/blog/${data.id}`);
      } else {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
        toast.success("Blog post saved!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save blog post");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
        <Loader2 className="h-6 w-6 animate-spin text-brand-pink mr-2" />
        <span className="text-sm font-semibold text-gray-500">Loading blog post…</span>
      </div>
    );
  }

  const currentSlug = slug || generateSlug(title) || "diy-murder-mystery-party-guide";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-brand-dark mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Blog Posts
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none">
            {isNew ? "New Blog Post" : title || "Edit Blog Post"}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isNew && slug && (
            <a
              href={`/en/blog/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark"
            >
              <Eye className="h-3.5 w-3.5" />
              View Direct URL
            </a>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-pink text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Post
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Post Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (isNew && !slug) {
                      setSlug(generateSlug(e.target.value));
                    }
                  }}
                  placeholder="How to Host an Unforgettable DIY Murder Mystery Party"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-brand-pink"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="diy-murder-mystery-party-guide"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs font-bold"
                >
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Subtitle / Deck
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="The ultimate guide for the Main Character Host."
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Excerpt (Card Summary)
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                Article Content (Markdown or HTML)
              </label>
              <textarea
                value={contentMarkdown}
                onChange={(e) => setContentMarkdown(e.target.value)}
                rows={22}
                placeholder="Write or paste Markdown or HTML content here..."
                className="w-full rounded-xl border border-gray-200 p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-brand-pink"
              />
            </div>
          </div>

          {/* SEO & OpenGraph Card */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-pink" />
              SEO &amp; Social Metadata
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Focus Keyword
                </label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Secondary Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={secondaryKeywords}
                  onChange={(e) => setSecondaryKeywords(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  OG Title
                </label>
                <input
                  type="text"
                  value={ogTitle}
                  onChange={(e) => setOgTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Twitter Title
                </label>
                <input
                  type="text"
                  value={twitterTitle}
                  onChange={(e) => setTwitterTitle(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Publishing, Schedule & Social Card Preview */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand-pink" />
              Publishing &amp; Schedule
            </h2>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-brand-dark block">Draft Mode</span>
                  <span className="text-[11px] text-gray-500">
                    Uncheck to publish or schedule by date
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDraft}
                  onChange={(e) => setIsDraft(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-pink"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-brand-dark">Featured Post</span>
                </div>
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-pink"
                />
              </label>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Publish / Launch Date (Mon &amp; Thu 09:00 UTC)
                </label>
                <input
                  type="datetime-local"
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Future-dated non-draft posts are viewable via direct URL (with noindex) and go live automatically on launch date.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={featuredImageUrl}
                  onChange={(e) => setFeaturedImageUrl(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="murder mystery, hosting tips, party ideas"
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* 8-Template Social Card Live Preview */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3 shadow-xs">
            <h2 className="text-sm font-black uppercase tracking-wider text-brand-dark flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-brand-pink" />
              IG/FB Social Card Preview
            </h2>
            <div className="rounded-xl overflow-hidden border border-gray-200 bg-gray-100 aspect-[4/5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/social-card/${currentSlug}`}
                alt="Social card preview"
                className="w-full h-full object-cover"
              />
            </div>
            <p className="text-[11px] text-gray-500 text-center">
              Generated dynamically via <code>/api/social-card/{currentSlug}</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
