import { ImageResponse } from "next/og";
import { getCardElement, TEMPLATE_COUNT } from "./card-component";
import { blogPosts } from "@/data/blog-posts";
import { ACTIVE_MYSTERIES } from "@/data/active-mysteries";
import { loadMarketingStore, readLocalMarketingStore, MarketingStoreData } from "@/lib/marketing-store";
import fs from "fs";
import path from "path";

// Load fonts, brand logos, and background data URIs statically (cached in module scope)
let cachedFontBold: Buffer | null = null;
let cachedFontBlack: Buffer | null = null;
let cachedLogoColor: string | undefined;
let cachedLogoWhite: string | undefined;
const cachedBgDataUris = new Map<string, string>();
const cachedCardBuffers = new Map<string, { buf: ArrayBuffer; at: number }>();

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

function getLocalBgDataUri(bgRelative: string): string | null {
  const cached = cachedBgDataUris.get(bgRelative);
  if (cached) return cached;

  let localImgPath = path.join(process.cwd(), "public", bgRelative.replace(/^\//, ""));
  if (!fs.existsSync(localImgPath)) {
    localImgPath = path.join(process.cwd(), "public", "blog", "hosting-guide.png");
  }
  if (!fs.existsSync(localImgPath)) return null;

  const buf = fs.readFileSync(localImgPath);
  const isJpeg = buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xd8;
  const mime = isJpeg ? "image/jpeg" : "image/png";
  const dataUri = `data:${mime};base64,${buf.toString("base64")}`;
  if (cachedBgDataUris.size > 48) {
    const firstKey = cachedBgDataUris.keys().next().value;
    if (firstKey) cachedBgDataUris.delete(firstKey);
  }
  cachedBgDataUris.set(bgRelative, dataUri);
  return dataUri;
}

function lookupSlugInStore(cleanSlug: string, store: MarketingStoreData) {
  const blog =
    store.blog_posts.find(
      (p) =>
        p.slug === cleanSlug ||
        p.featured_image_url === `/blog/${cleanSlug}.png` ||
        p.featured_image_url === `/blog/${cleanSlug}.jpg` ||
        p.featured_image_url === `/blog-images/${cleanSlug}.png` ||
        p.featured_image_url === `/blog-images/${cleanSlug}.jpg`
    ) || null;

  const standaloneSocialPost = !blog
    ? store.social_posts.find((p) => {
        const sc = (p.slide_content || {}) as any;
        if (sc.cardSlug === cleanSlug) return true;
        const cap = store.social_post_captions.find(
          (c) =>
            c.post_id === p.id &&
            Array.isArray(c.media_urls) &&
            c.media_urls.some((u: string) => u.includes(`/${cleanSlug}`))
        );
        return Boolean(cap);
      }) || null
    : null;

  return { blog, standaloneSocialPost };
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

    const searchParams = new URL(request.url).searchParams;
    const tParam = searchParams.get("t");

    // 1. Check fast in-memory / bundled local store FIRST (0ms, zero network round-trips)
    let store = readLocalMarketingStore();
    let { blog, standaloneSocialPost } = lookupSlugInStore(cleanSlug, store);

    const staticBlog = !blog
      ? blogPosts.find(
          (p) =>
            p.slug === cleanSlug ||
            p.image === `/blog/${cleanSlug}.png` ||
            p.image === `/blog/${cleanSlug}.jpg` ||
            p.image === `/blog-images/${cleanSlug}.png` ||
            p.image === `/blog-images/${cleanSlug}.jpg`
        ) || null
      : null;

    const mysteryPack =
      !blog && !staticBlog
        ? ACTIVE_MYSTERIES.find((m) => m.slug === cleanSlug || m.id === cleanSlug) || null
        : null;

    // Only sync from remote Storage if not found in local store OR if a specific ?t= isn't passed and we need latest templateIndex
    if (!blog && !staticBlog && !mysteryPack && !standaloneSocialPost) {
      store = await loadMarketingStore();
      const synced = lookupSlugInStore(cleanSlug, store);
      blog = synced.blog;
      standaloneSocialPost = synced.standaloneSocialPost;
    }

    const standaloneSc = (standaloneSocialPost?.slide_content || {}) as any;

    const titleText =
      blog?.title ||
      staticBlog?.title ||
      (mysteryPack ? `${mysteryPack.title}: ${mysteryPack.theme} Murder Mystery` : null) ||
      standaloneSc?.cardTitle ||
      standaloneSocialPost?.brief ||
      cleanSlug.replace(/-/g, " ");
    const bgRelative =
      searchParams.get("img") ||
      blog?.featured_image_url ||
      staticBlog?.image ||
      mysteryPack?.coverUrl ||
      mysteryPack?.image_url ||
      standaloneSc?.imageUrl ||
      (fs.existsSync(path.join(process.cwd(), "public", "blog-images", `${cleanSlug}.png`))
        ? `/blog-images/${cleanSlug}.png`
        : `/blog/hosting-guide.png`);

    const origin = request.url.startsWith("http")
      ? new URL(request.url).origin
      : process.env.NEXT_PUBLIC_SITE_URL || "https://backpocketmysteries.com";
    let bgSrc = bgRelative.startsWith("http") ? bgRelative : `${origin}${bgRelative}`;

    if (bgRelative.startsWith("/")) {
      const dataUri = getLocalBgDataUri(bgRelative);
      if (dataUri) bgSrc = dataUri;
    }

    let stat: { value: string; label: string } | null = null;
    let savedTemplateIndex: number | null = null;
    let ctaText: string | null = searchParams.get("cta");
    let kickerText: string | null = searchParams.get("kicker");

    if (blog?.id) {
      const sp = store.social_posts.find((p) => p.source_blog_id === blog.id) || null;
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

    let templateIndex = 0;
    if (tParam !== null && !Number.isNaN(Number(tParam)) && Number(tParam) >= 0 && Number(tParam) < TEMPLATE_COUNT) {
      templateIndex = Number(tParam);
    } else if (savedTemplateIndex !== null) {
      templateIndex = savedTemplateIndex;
    } else if (blog?.publish_date) {
      const localCount = store.blog_posts.filter(
        (p) => p.publish_date && p.publish_date < blog.publish_date
      ).length;
      templateIndex = localCount % TEMPLATE_COUNT;
    } else if (staticBlog) {
      const idx = blogPosts.findIndex((p) => p.slug === staticBlog.slug);
      templateIndex = Math.max(0, idx) % TEMPLATE_COUNT;
    } else if (mysteryPack) {
      const idx = ACTIVE_MYSTERIES.findIndex((m) => m.slug === mysteryPack.slug);
      templateIndex = Math.max(0, idx) % TEMPLATE_COUNT;
    }

    const finalTitle = searchParams.get("title") || titleText;
    const finalCategory =
      searchParams.get("category") ||
      blog?.category ||
      staticBlog?.tag ||
      (mysteryPack ? `New Mystery Pack • ${mysteryPack.theme}` : null) ||
      standaloneSc?.cardCategory ||
      null;

    // 2. Check rendered PNG buffer cache (instant <5ms response for repeated loads)
    const cacheKey = JSON.stringify({
      cleanSlug,
      templateIndex,
      finalTitle,
      finalCategory,
      bgRelative,
      stat,
      ctaText,
      kickerText,
    });
    const cachedPng = cachedCardBuffers.get(cacheKey);
    if (cachedPng && Date.now() - cachedPng.at < 300_000) {
      return new Response(cachedPng.buf, {
        status: 200,
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }

    const fontDataBold = getMontserratBold();
    const fontDataBlack = getMontserratBlack();
    const logoColorSrc = getLogoColorSrc();
    const logoWhiteSrc = getLogoWhiteSrc();

    const imgResponse = new ImageResponse(
      getCardElement(
        {
          bgSrc,
          title: finalTitle,
          category: finalCategory,
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

    const pngArrayBuffer = await imgResponse.arrayBuffer();
    if (cachedCardBuffers.size > 48) {
      const oldestKey = cachedCardBuffers.keys().next().value;
      if (oldestKey) cachedCardBuffers.delete(oldestKey);
    }
    cachedCardBuffers.set(cacheKey, { buf: pngArrayBuffer, at: Date.now() });

    return new Response(pngArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: any) {
    console.error("Social card generation API error:", error);
    return new Response(`Failed to generate social card: ${error?.message || String(error)}`, { status: 500 });
  }
}
