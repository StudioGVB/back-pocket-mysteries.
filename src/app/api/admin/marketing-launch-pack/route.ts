import { NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/admin-auth";
import { ACTIVE_MYSTERIES } from "@/data/active-mysteries";
import { loadMarketingStore, saveMarketingStore } from "@/lib/marketing-store";
import { parseMysteryImageField } from "@/utils/moodboard";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://backpocketmysteries.com";
const SITE = `${BASE_URL}/en`;
const EMAIL_FONT_FAMILY = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildMysteryPackSocialCopy(pack: {
  slug: string;
  title: string;
  theme: string;
  minPlayers: number;
  maxPlayers: number;
  shortDesc: string;
  themeUrl: string;
}) {
  const tagTheme = pack.theme.replace(/[^a-zA-Z0-9]/g, "") || "MysteryParty";
  const tagTitle = pack.title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 24) || "NewMystery";
  const hashtags = [
    tagTitle,
    tagTheme,
    "MurderMysteryParty",
    "PartyHosting",
    "BackPocketMysteries",
  ];
  const hashtagLine = hashtags.map((h) => `#${h}`).join(" ");

  const igFb = `🕵️‍♀️ NEW MYSTERY BASE PACK LIVE: ${pack.title} (${pack.theme}) 🔥

${pack.shortDesc}

Built for ${pack.minPlayers} to ${pack.maxPlayers} suspects (sorted in 30 minutes with zero prep stress):
🎭 Custom character dossiers hydrated with your real guests' names & adaptable genders
📹 Personalized CCTV security camera stills & dark-mode recovered group chats
🎙️ Multi-speaker ElevenLabs audio wiretaps & voice memos on guests' phones
🥂 Spoiler-free Host Mode so the organiser can play & sip alongside the group

👇 Link in bio to explore the theme & build your party
${pack.themeUrl}

${hashtagLine}`;

  const linkedin = `Product Launch: Introducing "${pack.title}" (${pack.theme}), Our Newest Interactive Murder Mystery Base Pack for ${pack.minPlayers} to ${pack.maxPlayers} Players

Traditional boxed murder mystery games were built around a very rigid formula: fixed gender ratios, generic stock illustrations, and twenty-page paper scripts that take hours for an organiser to prepare before guests arrive. While classic tabletop whodunits have a loyal following, modern party hosts planning birthdays, corporate team socials, bachelorette weekends, and dinner parties have been asking for immersive themes where the evidence looks and sounds like real investigative artifacts.

Today we are excited to launch our newest Mystery Base Pack on Back Pocket Mysteries: ${pack.title}, a ${pack.theme.toLowerCase()} investigation engineered for ${pack.minPlayers} to ${pack.maxPlayers} suspects.

The Narrative Premise and Investigation Structure:
${pack.shortDesc} Across three progressive rounds of mingling, forensic discovery, and cross-examination, every guest in the room holds asymmetric clues required to reconstruct the timeline and unmask the killer before the final vote.

Four Core Engineering and Game-Design Innovations Inside ${pack.title}:
1. Diegetic Multimedia Evidence Formats: Instead of handing players dense paragraphs of exposition, ${pack.title} delivers clues as authentic in-world artifacts. As the host advances each round, players unlock high-angle grainy CCTV security camera stills stamped with camera metadata, dark-mode smartphone chat threads with recovered message badges, formatted forensic documents, and multi-speaker ElevenLabs audio wiretaps directly in their mobile Playroom or as printable Polaroid clue cards.
2. Dynamic Guest Personalization on the Final Mile: When a host sets up their event, they enter their guests' real first names, select adaptable character genders, and optionally upload guest selfies. Our hydration engine weaves every real guest's name directly into the character backstories, text message logs, and spoken audio dialogue while incorporating their likeness and costume style into the crime scene visual evidence.
3. Elastic Group Sizing (${pack.minPlayers} to ${pack.maxPlayers} Suspects): Anyone who has hosted a group dinner or work social knows that guest lists shift up until the afternoon of the party. ${pack.title} is architected with mandatory core roles that anchor the murder plot and expandable suspect roles that can be toggled on or off in seconds, ensuring a last-minute addition or cancellation never breaks a single alibi or clue chain.
4. Spoiler-Free Host Participation: In legacy downloadable kits, the person who buys and organises the mystery is forced to sit out as a non-playing referee because they have seen the killer reveal during setup. Our progressive mobile Playroom controller conceals the solution and round evidence behind timed host triggers, allowing the organiser to participate as a full suspect alongside their friends or colleagues.

What Is Included in Every Customised Kit:
- Personalised character dossiers, secret objectives, and costume moodboards for every guest.
- Three structured rounds of mingling prompts, alibis, and multimedia forensic clues.
- Theme-matched cocktail, mocktail, and make-ahead menu recommendations.
- Live mobile lobby for theory tracking, final suspect voting, and end-of-night superlative awards (Best Detective, Master Manipulator, and Best Dressed).

Whether you are hosting an intimate ${pack.minPlayers}-person dinner table or a full ${pack.maxPlayers}-person house party, ${pack.title} can be customised and ready to run in under 30 minutes.

Explore the ${pack.title} Mystery Base Pack and preview the character line-up:
${pack.themeUrl}

${hashtagLine}`;

  return { hashtags, igFb, linkedin };
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { mysteryId, scheduledAt } = body as {
      mysteryId: string;
      scheduledAt?: string;
    };

    if (!mysteryId) {
      return NextResponse.json({ error: "Missing mysteryId" }, { status: 400 });
    }

    let dbMystery: any = null;
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("mysteries")
        .select("*")
        .eq("id", mysteryId)
        .maybeSingle();
      if (data) dbMystery = data;
    } catch {
      // fallback to ACTIVE_MYSTERIES
    }

    const canonical =
      ACTIVE_MYSTERIES.find((m) => m.id === mysteryId || m.slug === mysteryId) || null;

    if (!dbMystery && !canonical) {
      return NextResponse.json({ error: "Mystery Base Pack not found" }, { status: 404 });
    }

    const title = dbMystery?.title || canonical?.title || "New Mystery Pack";
    const theme = dbMystery?.theme || canonical?.theme || "Interactive Whodunit";
    const slug = canonical?.slug || slugify(title);
    const minPlayers = Number(dbMystery?.min_players || canonical?.min_players || 5);
    const maxPlayers = Number(dbMystery?.max_players || canonical?.max_players || 12);
    const shortDesc =
      canonical?.shortDesc ||
      dbMystery?.description ||
      `Step inside "${title}", an immersive ${theme} murder mystery party where every guest is a suspect and nobody's alibi is safe.`;

    const parsedImages = parseMysteryImageField(dbMystery?.image_url || canonical?.coverUrl || null);
    const coverImage =
      parsedImages.coverUrl ||
      canonical?.coverUrl ||
      "/moodboards/love-on-the-rocks/main-cover.png";

    const themeUrl = `${SITE}/themes/${slug}`;
    const targetSchedule =
      scheduledAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { hashtags, igFb, linkedin } = buildMysteryPackSocialCopy({
      slug,
      title,
      theme,
      minPlayers,
      maxPlayers,
      shortDesc,
      themeUrl,
    });

    // Validate guardrails
    const igTags = (igFb.match(/#\w+/g) || []).length;
    if (igTags > 5) {
      throw new Error(`Generated IG/FB caption has ${igTags} hashtags (max 5)`);
    }

    const store = await loadMarketingStore();
    const nowIso = new Date().toISOString();
    const brief = `New Mystery Base Pack Launch: ${title} (${theme})`;
    const stat = {
      value: `${minPlayers}–${maxPlayers}`,
      label: `Suspects • ${theme} Murder Mystery Pack`,
    };

    const existingIdx = store.social_posts.findIndex((p) => p.brief === brief);
    const postId =
      existingIdx >= 0 ? store.social_posts[existingIdx].id : crypto.randomUUID();

    const socialRow = {
      id: postId,
      brief,
      status: "draft",
      scheduled_at: targetSchedule,
      timezone: "Australia/Sydney",
      posted_at: null,
      source_blog_id: null,
      content_type: "mystery_pack_launch",
      slide_content: { linkUrl: themeUrl, stat },
      error_message: null,
      created_at:
        existingIdx >= 0 ? store.social_posts[existingIdx].created_at : nowIso,
      updated_at: nowIso,
    };

    if (existingIdx >= 0) {
      store.social_posts[existingIdx] = socialRow;
    } else {
      store.social_posts.push(socialRow);
    }

    store.social_post_captions = store.social_post_captions.filter(
      (c) => c.post_id !== postId
    );
    store.social_post_captions.push(
      {
        id: crypto.randomUUID(),
        post_id: postId,
        platform: "linkedin",
        caption: linkedin,
        hashtags,
        media_urls: [],
        post_url: themeUrl,
        engagement_data: {},
        created_at: nowIso,
      },
      {
        id: crypto.randomUUID(),
        post_id: postId,
        platform: "instagram",
        caption: igFb,
        hashtags,
        media_urls: [`/api/social-card/${slug}`],
        post_url: themeUrl,
        engagement_data: {},
        created_at: nowIso,
      },
      {
        id: crypto.randomUUID(),
        post_id: postId,
        platform: "facebook",
        caption: igFb,
        hashtags,
        media_urls: [`/api/social-card/${slug}`],
        post_url: themeUrl,
        engagement_data: {},
        created_at: nowIso,
      }
    );

    // Inject Mystery Base Pack Spotlight into the upcoming draft Weekly EDM
    let edmUpdatedSubject: string | null = null;
    const draftEdm = store.edm_campaigns.find((e) => e.status === "draft");
    if (draftEdm && Array.isArray(draftEdm.blocks_json)) {
      const alreadyHasPack = draftEdm.blocks_json.some(
        (b: any) => b.id === `pack-text-${slug}`
      );
      if (!alreadyHasPack) {
        const utmUrl = `${themeUrl}?utm_source=edm&utm_medium=email&utm_campaign=mystery_pack_launch_${slug}`;
        const absImg = coverImage.startsWith("http")
          ? coverImage
          : `${BASE_URL}${coverImage}`;
        const included = canonical?.whatIsIncluded?.slice(0, 3) || [
          "Custom character dossiers named after your real guests",
          "Personalized CCTV stills, recovered chats & multi-speaker audio wiretaps",
          "Spoiler-free Host Mode so the organiser can play along",
        ];

        const packBlocks = [
          {
            id: `div-pack-${slug}`,
            type: "divider",
            data: {
              color: "#e8e8eb",
              style: "solid",
              margin: 24,
              thickness: 1,
              sectionStyles: {
                backgroundColor: "transparent",
                paddingTop: 4,
                paddingBottom: 4,
                paddingLeft: 16,
                paddingRight: 16,
              },
            },
          },
          {
            id: `pack-img-${slug}`,
            type: "image",
            data: {
              src: absImg,
              alt: title,
              width: "100%",
              align: "center",
              linkUrl: utmUrl,
              borderRadius: 8,
              sectionStyles: {
                backgroundColor: "transparent",
                paddingTop: 8,
                paddingBottom: 8,
                paddingLeft: 16,
                paddingRight: 16,
              },
            },
          },
          {
            id: `pack-text-${slug}`,
            type: "text",
            data: {
              content: `<span style='background-color:#1e191c;color:#fe04c6;font-size:11px;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:8px;'>🔥 NEW MYSTERY BASE PACK • ${theme.toUpperCase()}</span><h2 style='font-size:20px;font-weight:800;color:#1e191c;margin:4px 0 10px 0;line-height:1.3;'>${title} (${minPlayers}–${maxPlayers} Suspects)</h2><p style='margin:0 0 12px 0;color:#4b5563;font-size:15px;line-height:1.6;'>${shortDesc}</p><ul style='margin:0;padding-left:20px;color:#1e191c;line-height:1.7;'>${included
                .map((item) => `<li style='margin-bottom:6px;'><strong>Included:</strong> ${item}</li>`)
                .join("")}</ul>`,
              fontSize: 15,
              textAlign: "left",
              textColor: "#1e191c",
              lineHeight: 1.6,
              sectionStyles: {
                backgroundColor: "transparent",
                paddingTop: 12,
                paddingBottom: 8,
                paddingLeft: 16,
                paddingRight: 16,
              },
            },
          },
          {
            id: `pack-cta-${slug}`,
            type: "button",
            data: {
              text: `Explore New Mystery Pack: ${title} →`,
              url: utmUrl,
              backgroundColor: "#1e191c",
              textColor: "#ffffff",
              borderRadius: 6,
              align: "left",
              padding: { x: 24, y: 12 },
              sectionStyles: {
                backgroundColor: "transparent",
                paddingTop: 8,
                paddingBottom: 20,
                paddingLeft: 16,
                paddingRight: 16,
              },
            },
          },
        ];

        const footerIdx = draftEdm.blocks_json.findIndex(
          (b: any) => b.id === "footer-text"
        );
        draftEdm.blocks_json =
          footerIdx >= 0
            ? [
                ...draftEdm.blocks_json.slice(0, footerIdx),
                ...packBlocks,
                ...draftEdm.blocks_json.slice(footerIdx),
              ]
            : [...draftEdm.blocks_json, ...packBlocks];

        const renderBlock = (block: any) => {
          const s = block.data.sectionStyles || {};
          const sw = `background-color:${s.backgroundColor};padding-top:${s.paddingTop}px;padding-bottom:${s.paddingBottom}px;padding-left:${s.paddingLeft}px;padding-right:${s.paddingRight}px;`;
          const d = block.data;
          if (block.type === "text")
            return `<tr><td style="${sw}"><div style="color:${d.textColor};text-align:${d.textAlign};font-size:${d.fontSize}px;font-family:${EMAIL_FONT_FAMILY};line-height:${d.lineHeight};margin:0;">${d.content}</div></td></tr>`;
          if (block.type === "image")
            return `<tr><td style="${sw}" align="${d.align}"><a href="${d.linkUrl}" target="_blank" style="display:inline-block;width:100%;"><img src="${d.src}" alt="${d.alt}" style="width:${d.width};max-width:100%;height:auto;border-radius:${d.borderRadius}px;display:block;" /></a></td></tr>`;
          if (block.type === "button")
            return `<tr><td style="${sw}" align="${d.align}"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:${d.backgroundColor};border-radius:${d.borderRadius}px;padding:${d.padding.y}px ${d.padding.x}px;"><a href="${d.url}" target="_blank" style="display:inline-block;color:${d.textColor};font-weight:700;font-family:${EMAIL_FONT_FAMILY};font-size:15px;text-decoration:none;">${d.text}</a></td></tr></table></td></tr>`;
          if (block.type === "divider")
            return `<tr><td style="${sw}"><div style="padding:${d.margin}px 0;"><hr style="border:none;border-top:${d.thickness}px ${d.style} ${d.color};margin:0;" /></div></td></tr>`;
          return "";
        };

        draftEdm.html_content = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${EMAIL_FONT_FAMILY};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:20px 0;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;">${draftEdm.blocks_json
          .map(renderBlock)
          .join("")}</table></td></tr></table></body></html>`;
        draftEdm.updated_at = nowIso;
      }
      edmUpdatedSubject = draftEdm.subject;
    }

    await saveMarketingStore(store);

    return NextResponse.json({
      success: true,
      postId,
      slug,
      title,
      edmUpdatedSubject,
      message: `Queued IG/FB + LinkedIn launch drafts for "${title}" and added spotlight to Weekly EDM!`,
    });
  } catch (error: any) {
    console.error("[Marketing Launch Pack API Error]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to queue Mystery Base Pack launch marketing" },
      { status: 500 }
    );
  }
}
