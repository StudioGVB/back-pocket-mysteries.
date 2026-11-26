"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { blogPosts as staticBlogPosts } from "@/data/blog-posts";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  FileText,
  Star,
  TrendingUp,
  ImageIcon,
  Calendar,
  CalendarX,
  ArrowUpDown,
  RefreshCw,
  Database,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InlineDateTimeEditor } from "@/components/admin/InlineDateTimeEditor";

interface BlogPostRow {
  id: string;
  title: string;
  slug: string;
  category: string;
  tags: string[] | null;
  is_draft: boolean;
  is_featured: boolean;
  publish_date: string | null;
  created_at: string;
  view_count: number | null;
  featured_image_url: string | null;
  meta_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
}

type StatusFilter = "all" | "published" | "draft" | "scheduled";
type SortColumn = "title" | "views" | "date" | "status" | null;
type SortDirection = "asc" | "desc";

function getPostStatus(post: BlogPostRow): "Draft" | "Scheduled" | "Published" {
  if (post.is_draft) return "Draft";
  if (post.publish_date && new Date(post.publish_date) > new Date()) return "Scheduled";
  return "Published";
}

function getSeoScore(post: BlogPostRow): "complete" | "partial" | "missing" {
  const filled = [post.meta_title, post.seo_description, post.focus_keyword].filter(Boolean).length;
  if (filled === 3) return "complete";
  if (filled >= 1) return "partial";
  return "missing";
}

function SeoIndicator({
  score,
  className,
}: {
  score: "complete" | "partial" | "missing";
  className?: string;
}) {
  const config = {
    complete: { color: "bg-emerald-500", title: "SEO complete" },
    partial: { color: "bg-amber-400", title: "SEO partially filled" },
    missing: { color: "bg-red-500", title: "SEO fields missing" },
  }[score];
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${config.color} shrink-0 ${className ?? ""}`}
      title={config.title}
    />
  );
}

export default function AdminBlogPostsPage() {
  const supabase = useMemo(() => createClient() as any, []);
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id, title, slug, category, tags, is_draft, is_featured, publish_date, created_at, view_count, featured_image_url, meta_title, seo_description, focus_keyword"
        )
        .order("is_featured", { ascending: false })
        .order("publish_date", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setPosts((data as BlogPostRow[]) || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to load blog posts from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSyncStaticPosts = async () => {
    try {
      setSyncing(true);
      let count = 0;
      for (let i = 0; i < staticBlogPosts.length; i++) {
        const sp = staticBlogPosts[i];
        const parsedDate = sp.date ? new Date(sp.date) : new Date();
        const isoDate = Number.isNaN(parsedDate.getTime())
          ? new Date().toISOString()
          : parsedDate.toISOString();

        const row = {
          title: sp.title,
          slug: sp.slug,
          subtitle: sp.subtitle,
          excerpt: sp.excerpt,
          content: sp.content,
          content_markdown: sp.content,
          category: sp.tag || "Guides",
          tags: sp.seo?.keywords || [sp.tag || "Guides"],
          featured_image_url: sp.image,
          author_name: sp.author?.name || "Alex Sterling",
          author_role: sp.author?.role || "Lead Story Architect",
          read_time: sp.readTime || "8 min read",
          is_draft: false,
          is_featured: i === 0,
          publish_date: isoDate,
          meta_title: sp.seo?.title || sp.title,
          seo_description: sp.seo?.description || sp.excerpt,
          focus_keyword: sp.seo?.keywords?.[0] || sp.tag,
          secondary_keywords: sp.seo?.keywords?.slice(1) || [],
          og_title: sp.seo?.title || sp.title,
          og_description: sp.seo?.description || sp.excerpt,
          twitter_title: sp.seo?.title || sp.title,
          twitter_description: sp.seo?.description || sp.excerpt,
          updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
          .from("blog_posts")
          .upsert(row, { onConflict: "slug" });
        if (!error) count++;
      }
      toast.success(`Synced ${count} static blog post(s) into database!`);
      await fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "Failed to sync static posts");
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Delete this blog post permanently?")) return;
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", postId);
      if (error) throw error;
      toast.success("The blog post has been deleted.");
      fetchPosts();
    } catch {
      toast.error("Failed to delete the post");
    }
  };

  const handleUnschedule = async (postId: string) => {
    try {
      const { error } = await supabase
        .from("blog_posts")
        .update({
          is_draft: true,
          publish_date: null,
        })
        .eq("id", postId);
      if (error) throw error;
      toast.success("Post unscheduled and moved to Draft");
      fetchPosts();
    } catch {
      toast.error("Failed to unschedule post");
    }
  };

  const handleUpdatePublishDate = async (postId: string, newIsoDate: string) => {
    try {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, publish_date: newIsoDate } : p))
      );
      const { error } = await supabase
        .from("blog_posts")
        .update({
          publish_date: newIsoDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId);
      if (error) throw error;
      toast.success("Blog publish date & time updated!");
    } catch {
      toast.error("Failed to update blog publish date");
      fetchPosts();
    }
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const availableCategories = useMemo(() => {
    return Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort();
  }, [posts]);

  const statusCounts = useMemo(
    () => ({
      all: posts.length,
      published: posts.filter((p) => getPostStatus(p) === "Published").length,
      draft: posts.filter((p) => getPostStatus(p) === "Draft").length,
      scheduled: posts.filter((p) => getPostStatus(p) === "Scheduled").length,
    }),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    let result = posts.filter((post) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        (post.category || "").toLowerCase().includes(q) ||
        (post.tags || []).some((t) => t.toLowerCase().includes(q));

      const status = getPostStatus(post);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && status === "Published") ||
        (statusFilter === "draft" && status === "Draft") ||
        (statusFilter === "scheduled" && status === "Scheduled");

      const matchesCategory = categoryFilter === "all" || post.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    if (sortColumn) {
      result = [...result].sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        if (sortColumn === "title") {
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
        } else if (sortColumn === "views") {
          aVal = a.view_count || 0;
          bVal = b.view_count || 0;
        } else if (sortColumn === "date") {
          const aDate = a.publish_date || a.created_at;
          const bDate = b.publish_date || b.created_at;
          aVal = new Date(aDate).getTime();
          bVal = new Date(bDate).getTime();
        } else if (sortColumn === "status") {
          const order = { Published: 0, Scheduled: 1, Draft: 2 };
          aVal = order[getPostStatus(a)];
          bVal = order[getPostStatus(b)];
        } else {
          return 0;
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [posts, searchQuery, statusFilter, categoryFilter, sortColumn, sortDirection]);

  const statusFilterTabs: Array<{ value: StatusFilter; label: string; count: number }> = [
    { value: "all", label: "All", count: statusCounts.all },
    { value: "published", label: "Published", count: statusCounts.published },
    { value: "draft", label: "Draft", count: statusCounts.draft },
    { value: "scheduled", label: "Scheduled", count: statusCounts.scheduled },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-dark uppercase tracking-tighter leading-none mb-2">
            Blog <span className="text-brand-pink italic">Posts</span>
          </h1>
          <p className="text-gray-500 text-xs font-bold">
            Manage published articles, scheduled launches, SEO metadata, and social card previews
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleSyncStaticPosts}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark cursor-pointer shadow-xs"
          >
            <Database className="h-3.5 w-3.5 text-brand-pink" />
            {syncing ? "Syncing…" : "Sync Static Blogs"}
          </button>
          <Link
            href="/admin/social"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-brand-dark shadow-xs"
          >
            <Calendar className="h-3.5 w-3.5 text-brand-pink" />
            Overview
          </Link>
          <Link
            href="/admin/blog/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-dark hover:bg-brand-pink text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Post
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

      {/* Search + Category filter + count */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, category, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-brand-pink"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700"
          >
            <option value="all">All categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-xs text-gray-500 font-semibold">
            Showing <span className="font-bold text-brand-dark">{filteredPosts.length}</span> of{" "}
            <span className="font-bold text-brand-dark">{posts.length}</span>
          </div>
          <button
            type="button"
            onClick={fetchPosts}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/70 text-[11px] font-black uppercase tracking-wider text-gray-500">
                <th className="py-3.5 px-4 w-[52px]">Image</th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("title")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Title <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">
                  <button
                    type="button"
                    onClick={() => handleSort("views")}
                    className="inline-flex items-center gap-1 hover:text-brand-dark cursor-pointer"
                  >
                    Views <ArrowUpDown className="h-3 w-3" />
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
                  <td colSpan={7} className="text-center py-10 text-gray-500 font-semibold">
                    Loading blog posts...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 font-semibold text-sm">No blog posts found</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Click &ldquo;Sync Static Blogs&rdquo; above or run the batch blog script to populate.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => {
                  const status = getPostStatus(post);
                  const seoScore = getSeoScore(post);
                  const visibleTags = (post.tags || []).slice(0, 3);

                  return (
                    <tr key={post.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3.5 px-4">
                        {post.featured_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.featured_image_url}
                            alt=""
                            className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-[320px]">
                        <div className="flex items-start gap-2">
                          <SeoIndicator score={seoScore} className="mt-1.5" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {post.is_featured && (
                                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                              )}
                              <Link
                                href={`/admin/blog/${post.id}`}
                                className="font-bold text-brand-dark hover:text-brand-pink leading-tight line-clamp-2"
                              >
                                {post.title}
                              </Link>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5 truncate">
                              /blog/{post.slug}
                            </div>
                            {visibleTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {visibleTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {(post.tags || []).length > 3 && (
                                  <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                    +{(post.tags || []).length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-bold text-gray-700">
                        {post.category}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="font-bold text-brand-dark">
                            {(post.view_count || 0).toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            status === "Draft"
                              ? "bg-gray-100 text-gray-700"
                              : status === "Scheduled"
                              ? "border border-amber-400 bg-amber-50 text-amber-800"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs">
                        <InlineDateTimeEditor
                          value={post.publish_date || post.created_at}
                          onSave={(iso) => handleUpdatePublishDate(post.id, iso)}
                        >
                          {post.publish_date ? (
                            <div className="px-1.5 py-1 rounded-lg hover:bg-gray-100">
                              <div className="font-bold text-brand-dark flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                {format(new Date(post.publish_date), "MMM d, yyyy")}
                                <span className="text-[11px] font-normal text-gray-500">
                                  {format(new Date(post.publish_date), "h:mmaaa")}
                                </span>
                              </div>
                              <div className="text-[11px] text-gray-500">
                                {status === "Scheduled"
                                  ? "Scheduled launch (double-click to edit)"
                                  : status === "Draft"
                                  ? "Target date (double-click to edit)"
                                  : "Published (double-click to edit)"}
                              </div>
                            </div>
                          ) : (
                            <div className="px-1.5 py-1 rounded-lg hover:bg-gray-100">
                              <div className="font-bold text-brand-dark">
                                {format(new Date(post.created_at), "MMM d, yyyy")}
                              </div>
                              <div className="text-[11px] text-gray-400">
                                Created (double-click to set date)
                              </div>
                            </div>
                          )}
                        </InlineDateTimeEditor>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => router.push(`/admin/blog/${post.id}`)}
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-brand-dark cursor-pointer"
                            title="Edit Post"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <a
                            href={`/en/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-brand-dark"
                            title="View Live / Preview Direct URL"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          {status === "Scheduled" && (
                            <button
                              type="button"
                              onClick={() => handleUnschedule(post.id)}
                              className="p-1.5 rounded-lg border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 cursor-pointer"
                              title="Unschedule"
                            >
                              <CalendarX className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(post.id)}
                            className="p-1.5 rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-100 text-red-600 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
