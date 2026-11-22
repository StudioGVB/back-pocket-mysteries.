import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { getCardElement, TEMPLATE_COUNT } from "./card-component";
import { blogPosts } from "@/data/blog-posts";
import { ACTIVE_MYSTERIES } from "@/data/active-mysteries";
import { loadMarketingStore } from "@/lib/marketing-store";
import fs from "fs";
import path from "path";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Load fonts and brand logos statically (cached in module scope)
let cachedFontBold: Buffer | null = null;
let cachedFontBlack: Buffer | null = null;
let cachedLogoColor: string | undefined;
let cachedLogoWhite: string | undefined;

function getMontserratBold() {
  if (!cachedFontBold) {
    cachedFontBold = fs.readFileSync(path.join(process.cwd(), "src", "assets", "Montserrat-Bold.woff"));
  }
  return cachedFontBold;
}
function getMontserratBlack() {
  if (!cachedFontBlack) {
    cachedFontBlack = fs.readFileSync(path.join(process.cwd(), "src", "assets", "Montserrat-Black.woff"));
  }
  return cachedFontBlack;
}
function getLogoColorSrc() {
  if (!cachedLogoColor) {
    const p = path.join(process.cwd(), "public", "logo-horizontal.png");
    if (fs.existsSync(p)) {
      cachedLogoColor = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
  }
  return cachedLogoColor;
}
function getLogoWhiteSrc() {
  if (!cachedLogoWhite) {
    const p = path.join(process.cwd(), "public", "logo-horizontal-white.png");
    if (fs.existsSync(p)) {
      cachedLogoWhite = `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
    }
  }
  return cachedLogoWhite;
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

    // Fallback to standalone social_posts row (e.g. Soft-Launch Intro Post or custom announcements)
    const standaloneSocialPost =
      !blog && !staticBlog && !mysteryPack
        ? store.social_posts.find((p) => {
            const sc = (p.slide_content || {}) as any;
            if (sc.cardSlug === cleanSlug) return true;
            const cap = store.social_post_captions.find(
              (c) =>
                c.post_id === p.id &&
                Array.isArray(c.media_urls) &&
                c.media_urls.some((u: string) => u.includes(`/${cleanSlug}.`))
            );
            return Boolean(cap);
          }) || null
        : null;

    const standaloneSc = (standaloneSocialPost?.slide_content || {}) as any;

    const titleText =
      blog?.title ||
      staticBlog?.title ||
      (mysteryPack ? `${mysteryPack.title}: ${mysteryPack.theme} Murder Mystery` : null) ||
      standaloneSc?.cardTitle ||
      standaloneSocialPost?.brief ||
      cleanSlug.replace(/-/g, " ");
    const bgRelative =
      blog?.featured_image_url ||
      staticBlog?.image ||
      mysteryPack?.coverUrl ||
      mysteryPack?.image_url ||
      standaloneSc?.imageUrl ||
      (fs.existsSync(path.join(process.cwd(), "public", "blog-images", `${cleanSlug}.png`))
        ? `/blog-images/${cleanSlug}.png`
        : `/blog/hosting-guide.png`);

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

    // Optional headline stat, saved templateIndex, and commercial CTA overrides
    const searchParams = new URL(request.url).searchParams;
    let stat: { value: string; label: string } | null = null;
    let savedTemplateIndex: number | null = null;
    let ctaText: string | null = searchParams.get("cta");
    let kickerText: string | null = searchParams.get("kicker");

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
      const sc = sp?.slide_content as any;
      if (sc?.stat?.value && sc?.stat?.label) {
        stat = { value: String(sc.stat.value), label: String(sc.stat.label) };
      }
      if (!ctaText && sc?.ctaText) ctaText = String(sc.ctaText);
      if (!kickerText && sc?.kickerText) kickerText = String(sc.kickerText);
      if (typeof sc?.templateIndex === "number" && sc.templateIndex >= 0 && sc.templateIndex < TEMPLATE_COUNT) {
        savedTemplateIndex = sc.templateIndex;
      }
    } else if (mysteryPack) {
      const sp = store.social_posts.find((p) =>
        String((p.slide_content as any)?.linkUrl || "").includes(mysteryPack.slug)
      );
      const sc = sp?.slide_content as any;
      if (typeof sc?.templateIndex === "number" && sc.templateIndex >= 0 && sc.templateIndex < TEMPLATE_COUNT) {
        savedTemplateIndex = sc.templateIndex;
      }
      if (!ctaText) ctaText = sc?.ctaText ? String(sc.ctaText) : "BUILD YOUR PARTY";
      if (!kickerText) kickerText = sc?.kickerText ? String(sc.kickerText) : "INSTANT PARTY KIT";
      stat = {
        value: `${mysteryPack.min_players}–${mysteryPack.max_players}`,
        label: `Suspects • Ready to Play in 30 Mins`,
      };
    } else if (standaloneSocialPost) {
      if (standaloneSc?.stat?.value && standaloneSc?.stat?.label) {
        stat = {
          value: String(standaloneSc.stat.value),
          label: String(standaloneSc.stat.label),
        };
      }
      if (!ctaText && standaloneSc?.ctaText) ctaText = String(standaloneSc.ctaText);
      if (!kickerText && standaloneSc?.kickerText) kickerText = String(standaloneSc.kickerText);
      if (
        typeof standaloneSc?.templateIndex === "number" &&
        standaloneSc.templateIndex >= 0 &&
        standaloneSc.templateIndex < TEMPLATE_COUNT
      ) {
        savedTemplateIndex = standaloneSc.templateIndex;
      }
    }

    if (searchParams.get("statValue") && searchParams.get("statLabel")) {
      stat = {
        value: String(searchParams.get("statValue")),
        label: String(searchParams.get("statLabel")),
      };
    }

    // Template: ?t=0-7 override for previews (ignore cache-buster timestamps like ?t=Date.now()),
    // then savedTemplateIndex if manually chosen in Admin, otherwise rotate by publish order.
    const tParam = searchParams.get("t");
    let templateIndex = 0;
    if (tParam !== null && !Number.isNaN(Number(tParam)) && Number(tParam) >= 0 && Number(tParam) < TEMPLATE_COUNT) {
      templateIndex = Number(tParam);
    } else if (savedTemplateIndex !== null) {
      templateIndex = savedTemplateIndex;
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
    const logoColorSrc = getLogoColorSrc();
    const logoWhiteSrc = getLogoWhiteSrc();

    return new ImageResponse(
      getCardElement(
        {
          bgSrc,
          title: searchParams.get("title") || titleText,
          category:
            searchParams.get("category") ||
            blog?.category ||
            staticBlog?.tag ||
            (mysteryPack ? `New Mystery Pack • ${mysteryPack.theme}` : null) ||
            standaloneSc?.cardCategory ||
            null,
          stat,
          ctaText,
          kickerText,
          logoColorSrc,
          logoWhiteSrc,
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
