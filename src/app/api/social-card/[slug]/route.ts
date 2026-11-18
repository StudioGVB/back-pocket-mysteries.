import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { getCardElement, TEMPLATE_COUNT } from "./card-component";
import { blogPosts } from "@/data/blog-posts";
import { ACTIVE_MYSTERIES } from "@/data/active-mysteries";
import { loadMarketingStore } from "@/lib/marketing-store";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Load font statically so Vercel bundles it
function getMontserratBold() {
  const fontPath = path.join(process.cwd(), "src", "assets", "Montserrat-Bold.woff");
  return fs.readFileSync(fontPath);
}
function getMontserratBlack() {
  const fontPath = path.join(process.cwd(), "src", "assets", "Montserrat-Black.woff");
  return fs.readFileSync(fontPath);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const cleanSlug = decodeURIComponent(slug)
      .replace(/\.jpg$/, "")
      .replace(/\.png$/, "")
      .replace(/^social-card-/, "");

    const supabase = getSupabase();
    const store = await loadMarketingStore();
    const cols = "id, title, featured_image_url, category, publish_date";

    // First try by exact slug in Supabase
    let blog: any = null;
    if (supabase) {
      const { data } = await supabase
        .from("blog_posts")
        .select(cols)
        .eq("slug", cleanSlug)
        .maybeSingle();
      if (data) blog = data;
    }

    // If not found by slug, it might be the short image filename. Try by featured_image_url
    if (!blog && supabase) {
      const { data: blogByImg } = await supabase
        .from("blog_posts")
        .select(cols)
        .or(
          `featured_image_url.eq./blog-images/${cleanSlug}.png,featured_image_url.eq./blog-images/${cleanSlug}.jpg,featured_image_url.eq./blog/${cleanSlug}.png,featured_image_url.eq./blog/${cleanSlug}.jpg`
        )
        .maybeSingle();
      if (blogByImg) blog = blogByImg;
    }

    // Fallback to marketing-store if table not yet migrated in Supabase
    if (!blog && store.blog_posts.length > 0) {
      blog =
        store.blog_posts.find(
          (p) =>
            p.slug === cleanSlug ||
            p.featured_image_url === `/blog/${cleanSlug}.png` ||
            p.featured_image_url === `/blog/${cleanSlug}.jpg` ||
            p.featured_image_url === `/blog-images/${cleanSlug}.png` ||
            p.featured_image_url === `/blog-images/${cleanSlug}.jpg`
        ) || null;
    }

    // Fallback to static blogPosts if not yet in DB
    const staticBlog = !blog
      ? blogPosts.find(
          (p) =>
            p.slug === cleanSlug ||
            p.image === `/blog/${cleanSlug}.png` ||
            p.image === `/blog/${cleanSlug}.jpg` ||
            p.image === `/blog-images/${cleanSlug}.png` ||
            p.image === `/blog-images/${cleanSlug}.jpg`
        )
      : null;

    // Fallback to Mystery Base Pack (ACTIVE_MYSTERIES) for new mystery pack launch cards
    const mysteryPack =
      !blog && !staticBlog
        ? ACTIVE_MYSTERIES.find((m) => m.slug === cleanSlug || m.id === cleanSlug) || null
        : null;

    const titleText =
      blog?.title ||
      staticBlog?.title ||
      (mysteryPack ? `${mysteryPack.title}: ${mysteryPack.theme} Murder Mystery` : null) ||
      cleanSlug.replace(/-/g, " ");
    const bgRelative =
      blog?.featured_image_url ||
      staticBlog?.image ||
      mysteryPack?.coverUrl ||
      mysteryPack?.image_url ||
      `/blog/hosting-guide.png`;

    // Resolve background image: prefer reading from public/ on disk as data URI for fast, reliable Satori rendering
    const origin = request.url.startsWith("http")
      ? new URL(request.url).origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://backpocketmysteries.com";
    let bgSrc = bgRelative.startsWith("http") ? bgRelative : `${origin}${bgRelative}`;

    if (bgRelative.startsWith("/")) {
      let localImgPath = path.join(process.cwd(), "public", bgRelative.replace(/^\//, ""));
      if (!fs.existsSync(localImgPath)) {
        localImgPath = path.join(process.cwd(), "public", "blog", "hosting-guide.png");
      }
      if (fs.existsSync(localImgPath)) {
        const buf = fs.readFileSync(localImgPath);
        const ext = path.extname(localImgPath).toLowerCase();
        const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
        bgSrc = `data:${mime};base64,${buf.toString("base64")}`;
      }
    }

    // Optional headline stat stored on the social post (slide_content.stat = { value, label })
    let stat: { value: string; label: string } | null = null;
    if (blog?.id) {
      let sp: any = null;
      if (supabase) {
        const { data } = await supabase
          .from("social_posts")
          .select("slide_content")
          .eq("source_blog_id", blog.id)
          .limit(1)
          .maybeSingle();
        if (data) sp = data;
      }
      if (!sp && store.social_posts.length > 0) {
        sp = store.social_posts.find((p) => p.source_blog_id === blog.id) || null;
      }
      const s = (sp?.slide_content as any)?.stat;
      if (s?.value && s?.label) stat = { value: String(s.value), label: String(s.label) };
    } else if (mysteryPack) {
      stat = {
        value: `${mysteryPack.min_players}–${mysteryPack.max_players}`,
        label: `Suspects • ${mysteryPack.theme} Mystery Pack`,
      };
    }

    // Template: ?t=0-7 override for previews (ignore cache-buster timestamps like ?t=Date.now()),
    // otherwise rotate by publish order so consecutive posts always use a different template.
    const tParam = new URL(request.url).searchParams.get("t");
    let templateIndex = 0;
    if (tParam !== null && !Number.isNaN(Number(tParam)) && Number(tParam) >= 0 && Number(tParam) < TEMPLATE_COUNT) {
      templateIndex = Number(tParam);
    } else if (blog?.publish_date) {
      let resolvedCount: number | null = null;
      if (supabase) {
        const { count, error: countErr } = await supabase
          .from("blog_posts")
          .select("id", { count: "exact", head: true })
          .lt("publish_date", blog.publish_date);
        if (!countErr && typeof count === "number") {
          resolvedCount = count;
        }
      }
      if (resolvedCount !== null) {
        templateIndex = resolvedCount % TEMPLATE_COUNT;
      } else {
        const localCount = store.blog_posts.filter(
          (p) => p.publish_date && p.publish_date < blog.publish_date
        ).length;
        templateIndex = localCount % TEMPLATE_COUNT;
      }
    } else if (staticBlog) {
      const idx = blogPosts.findIndex((p) => p.slug === staticBlog.slug);
      templateIndex = Math.max(0, idx) % TEMPLATE_COUNT;
    } else if (mysteryPack) {
      const idx = ACTIVE_MYSTERIES.findIndex((m) => m.slug === mysteryPack.slug);
      templateIndex = Math.max(0, idx) % TEMPLATE_COUNT;
    }

    const fontDataBold = getMontserratBold();
    const fontDataBlack = getMontserratBlack();

    return new ImageResponse(
      getCardElement(
        {
          bgSrc,
          title: titleText,
          category:
            blog?.category ||
            staticBlog?.tag ||
            (mysteryPack ? `New Mystery Pack • ${mysteryPack.theme}` : null),
          stat,
        },
        templateIndex
      ),
      {
        width: 1080,
        height: 1350,
        fonts: [
          {
            name: "Montserrat",
            data: fontDataBold,
            style: "normal",
            weight: 800,
          },
          {
            name: "Montserrat",
            data: fontDataBlack,
            style: "normal",
            weight: 900,
          },
        ],
      }
    );
  } catch (error: any) {
    console.error("Social card generation API error:", error);
    return new Response(`Failed to generate social card: ${error?.message || String(error)}`, { status: 500 });
  }
}
