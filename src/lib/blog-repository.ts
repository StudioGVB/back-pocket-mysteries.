import { createClient } from "@supabase/supabase-js";
import { blogPosts as staticBlogPosts, BlogPost } from "@/data/blog-posts";
import { loadMarketingStore } from "@/lib/marketing-store";
import { format } from "date-fns";

export interface HydratedBlogPost extends BlogPost {
  id?: string;
  publishDateIso?: string | null;
  isScheduled?: boolean;
  noIndex?: boolean;
  noFollow?: boolean;
  isFeatured?: boolean;
  ogTitle?: string | null;
  ogDescription?: string | null;
  twitterTitle?: string | null;
  twitterDescription?: string | null;
  canonicalUrl?: string | null;
}

function getAnonSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function mapDbRowToBlogPost(row: any): HydratedBlogPost {
  const publishDate = row.publish_date ? new Date(row.publish_date) : new Date(row.created_at || Date.now());
  const now = new Date();
  const isScheduled = Boolean(row.publish_date && publishDate > now);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || row.excerpt || "",
    excerpt: row.excerpt || row.seo_description || "",
    content: row.content_markdown || row.content || "",
    image: row.featured_image_url || "/blog/hosting-guide.png",
    date: format(publishDate, "MMM d, yyyy"),
    readTime: row.read_time || "10 min read",
    tag: row.category || "Guides",
    author: {
      name: row.author_name || "Alex Sterling",
      role: row.author_role || "Lead Story Architect",
    },
    seo: {
      title: row.meta_title || row.title,
      description: row.seo_description || row.excerpt || "",
      keywords: [
        ...(row.focus_keyword ? [row.focus_keyword] : []),
        ...(Array.isArray(row.secondary_keywords) ? row.secondary_keywords : []),
        ...(Array.isArray(row.tags) ? row.tags : []),
      ],
    },
    publishDateIso: row.publish_date || row.created_at,
    isScheduled,
    noIndex: Boolean(row.no_index || isScheduled),
    noFollow: Boolean(row.no_follow),
    isFeatured: Boolean(row.is_featured),
    ogTitle: row.og_title,
    ogDescription: row.og_description,
    twitterTitle: row.twitter_title,
    twitterDescription: row.twitter_description,
    canonicalUrl: row.canonical_url,
  };
}

/**
 * Returns all publicly visible blog posts (is_draft = false AND publish_date <= now()).
 * Scheduled future-dated posts are excluded from the public listing and sitemap.
 */
export async function getPublishedBlogPosts(): Promise<HydratedBlogPost[]> {
  const sb = getAnonSupabase();
  const store = await loadMarketingStore();
  const nowIso = new Date().toISOString();
  const dbPosts: HydratedBlogPost[] = [];
  const hiddenSlugs = new Set<string>();
  let rows: any[] = [];

  if (sb) {
    try {
      const { data, error } = await sb
        .from("blog_posts")
        .select("*")
        .order("is_featured", { ascending: false })
        .order("publish_date", { ascending: false, nullsFirst: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        rows = data;
      }
    } catch {
      // Fallback to store
    }
  }

  if (rows.length === 0 && store.blog_posts.length > 0) {
    rows = [...store.blog_posts].sort((a, b) =>
      String(b.publish_date || "").localeCompare(String(a.publish_date || ""))
    );
  }

  for (const row of rows) {
    if (row.is_draft || (row.publish_date && row.publish_date > nowIso)) {
      hiddenSlugs.add(row.slug);
    } else {
      dbPosts.push(mapDbRowToBlogPost(row));
    }
  }

  const dbSlugSet = new Set(dbPosts.map((p) => p.slug));
  const mergedStatic: HydratedBlogPost[] = staticBlogPosts
    .filter((sp) => !dbSlugSet.has(sp.slug) && !hiddenSlugs.has(sp.slug))
    .map((sp) => ({
      ...sp,
      publishDateIso: new Date(sp.date).toISOString(),
      isScheduled: false,
      noIndex: false,
      noFollow: false,
    }));

  return [...dbPosts, ...mergedStatic];
}

/**
 * Fetches a single blog post by slug.
 * Non-draft posts with a future publish_date ARE returned so they can be viewed by direct URL,
 * with `noIndex: true` until `publish_date <= now()`.
 */
export async function getBlogPostBySlug(slug: string): Promise<HydratedBlogPost | null> {
  const sb = getAnonSupabase();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_draft", false)
        .maybeSingle();

      if (!error && data) {
        return mapDbRowToBlogPost(data);
      }
    } catch {
      // Fallback
    }
  }

  const store = await loadMarketingStore();
  const storeMatch = store.blog_posts.find((p) => p.slug === slug && !p.is_draft);
  if (storeMatch) {
    return mapDbRowToBlogPost(storeMatch);
  }

  const staticMatch = staticBlogPosts.find((p) => p.slug === slug);
  if (!staticMatch) return null;

  return {
    ...staticMatch,
    publishDateIso: new Date(staticMatch.date).toISOString(),
    isScheduled: false,
    noIndex: false,
    noFollow: false,
  };
}
