import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import crypto from "crypto";

if (fs.existsSync(".env")) process.loadEnvFile(".env");
if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const BASE_URL = "https://backpocketmysteries.com";
const SITE = "https://backpocketmysteries.com/en";
const EMAIL_FONT_FAMILY = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

/**
 * Reusable Mystery Theme Launch Script:
 * Queues:
 *   1. IG + FB Launch Post (draft, max 5 hashtags, rendered via /api/social-card/[slug])
 *   2. LinkedIn 600–700 Word Launch Post (draft, no photo, link preview card)
 *   3. Appends the New Mystery Theme Spotlight section into the latest draft Weekly EDM
 *
 * Usage:
 *   node scripts/queue-mystery-pack-launch.mjs [slug] [scheduledAtIso]
 */

const PACK_TEMPLATES = {
  "love-on-the-rocks": {
    slug: "love-on-the-rocks",
    title: "Love On The Rocks",
    theme: "Reality TV Reunion",
    players: "5–12",
    image: "/moodboards/love-on-the-rocks/main-cover.png",
    stat: { value: "5–12", label: "Suspects • Reality TV Reunion Murder Mystery Pack" },
    shortDesc:
      "The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of Season 3's biggest dating show reunites at a luxury penthouse, until The Star collapses mid-champagne-toast.",
    included: [
      "Custom Bombshell & VIP Character Booklets Named After Your Guests",
      "Personalized Group-Chat Threads, Leaked DMs & Fininsta Posts",
      "Backstage Audio Voice Memos, Paparazzi Stills & Call Sheets",
    ],
    hashtags: ["LoveOnTheRocks", "BacheloretteParty", "MurderMysteryParty", "GirlsNightIn", "BackPocketMysteries"],
    igFb: (themeUrl) => `🥂 NEW MYSTERY PACK DROP: Love On The Rocks 🏝️💔

The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of Season 3's biggest reality dating show reunites at a five-star penthouse, until The Star collapses mid-champagne-toast 🍾👀

Built for 5 to 12 players (perfect for Bachelorettes, 20s/30s Birthdays & Girls' Nights):
📱 Leaked DMs, group-chat threads & burner account receipts
🎙️ Backstage audio voice memos & paparazzi CCTV stills featuring your real friends' names
💅 Custom Bombshell & VIP roles with It-Girl outfit guides
🕵️‍♀️ Spoiler-free Host Mode so the host can sip & play along

👇 Link in bio to build your party in 30 minutes
${themeUrl}

#LoveOnTheRocks #BacheloretteParty #MurderMysteryParty #GirlsNightIn #BackPocketMysteries`,
    linkedin: (themeUrl) => `Product Launch: How We Designed "Love On The Rocks" to Modernize the At-Home Murder Mystery Format for 5 to 12 Players

Traditional boxed murder mystery games were built around a very specific formula: Victorian manor houses, rigid gender ratios, and twenty-page paper scripts that take hours for a host to prepare. While classic period mysteries still have a loyal audience, modern party hosts planning bachelorette weekends, 20s and 30s birthdays, and Friday night socials have been asking for contemporary settings where the evidence looks and sounds like the media they consume every day.

Today we are excited to launch our newest Mystery Theme on Back Pocket Mysteries: Love On The Rocks, an interactive reality-TV reunion whodunit engineered for 5 to 12 suspects.

The Premise and Narrative Architecture:
Six months after the finale of Season 3's most-watched dating show, the cast, showrunners, and sponsors reunite at a five-star penthouse for the official wrap party. The Star walked away with the crown, the brand deals, and the prize money, leaving a trail of broken alliances and leaked NDAs behind. When The Star collapses mid-champagne-toast in front of rolling cameras, the penthouse goes into lockdown. One suspect planned to kill, another switched the glass, and every guest in the room holds a piece of the timeline.

Four Design Innovations Inside the Pack:
1. Diegetic Modern Evidence Formats: Instead of handing players generic paragraphs of text, Love On The Rocks delivers clues in the exact formats a reality-TV scandal would produce. Players unlock dark-mode group-chat threads, leaked DM screenshots, backstage multi-speaker audio voice memos, paparazzi security camera stills, and production call sheets directly in their mobile Playroom or as printable Polaroid evidence cards.
2. Dynamic Guest Personalization: When a host sets up their party, they enter their guests' real names and optional selfies. Our story builder weaves every guest's name into the character bios, chat logs, and spoken ElevenLabs audio wiretaps, while incorporating their likeness into the crime scene visual evidence.
3. Flexible Player Scaling (5 to 12 Suspects): Group sizes for birthday dinners and bachelorette trips change constantly. Love On The Rocks is architected with five core mandatory roles (The Star, The Ex, The Showrunner, The Bombshell, and The Publicist) and seven expandable suspect roles so a last-minute addition or cancellation never breaks the clue logic.
4. Spoiler-Free Host Participation: In most party kits, the person who buys and organises the game is forced to act as a non-playing referee because they have seen the solution. Our progressive mobile Playroom controller conceals the killer and round reveals behind timed host triggers, allowing the organiser to play as a full suspect alongside their friends.

What Is Included in Every Customised Kit:
- Personalised character dossiers and outfit moodboards tailored to each guest.
- Three progressive rounds of gossip prompts, alibis, and multimedia forensic clues.
- Signature cocktail and mocktail recipes alongside a curated reunion party playlist guide.
- Live mobile lobby for theory tracking, final suspect voting, and end-of-night superlative awards (Best Detective, Master Manipulator, and Best Dressed).

Why Host Prep Time Matters for Modern Gatherings:
Our goal with every Back Pocket Mysteries pack is to eliminate the three-hour printing and cutting marathon that stops busy organisers from hosting interactive dinner parties. From entering your guest list to sending out spoiler-free character invites in the group chat, the entire setup takes less than 30 minutes and costs around $2.50 per guest. Whether you are hosting an intimate 6-person apartment dinner or a 12-person weekend away, the entire mystery adapts automatically to your table.

Explore the Love On The Rocks Mystery Theme and preview the character line-up:
${themeUrl}

#LoveOnTheRocks #BacheloretteParty #MurderMysteryParty #GirlsNightIn #BackPocketMysteries`,
  },
  "christmas-nightmare": {
    slug: "christmas-nightmare",
    title: "Christmas Nightmare",
    theme: "Holiday Dinner Party",
    players: "6",
    image: "/moodboards/christmas-cabin/main-cover.jpg",
    stat: { value: "6", label: "Suspects • Holiday Dinner Party Murder Mystery Pack" },
    shortDesc:
      "Two pairs of next-door childhood siblings grew up on the same street. Tonight, beneath the twinkling lights of their annual Christmas dinner party, secret affairs and broken marriages snap when a sudden 8:19 PM power surge plunges the house into darkness and The Husband is found dead in the Christmas tree corner.",
    included: [
      "Custom Holiday Character Booklets Named After Your Guests (Fits Any Group Mix)",
      "Intercepted Lock-Screen Texts, Smart-Home Power Surge Logs & Nursery-Monitor Audio Clips",
      "Crime Scene Reports, Hallway CCTV Stills & Childhood Polaroid Evidence",
    ],
    hashtags: [
      "ChristmasNightmare",
      "ChristmasMurderMystery",
      "FriendsmasParty",
      "MurderMysteryParty",
      "BackPocketMysteries",
    ],
    igFb: (themeUrl) => `🎄 NEW HOLIDAY MYSTERY PACK LIVE: Christmas Nightmare ⚡🍷

Two pairs of next-door childhood siblings grew up on the same street. Tonight, beneath the twinkling lights of their annual Christmas dinner party, secret affairs and broken marriages snap when an 8:19 PM power surge plunges the living room into darkness and The Husband is found dead in the Christmas tree corner 👀✨

Built for 6 players (from $19 / ~$3.15 per guest • flexible for any group mix for any group ratio):
📱 Intercepted lock-screen texts & smart-home 1,840W power surge logs
🎙️ Upstairs nursery-monitor audio fights & pocket voicemails on guests' phones
📸 Personalized hallway CCTV stills, safe break-ins & Polaroid evidence starring your real friends
🥂 Spoiler-free Host Mode so the host can sip mulled wine & play along

👇 Link in bio to customize your Christmas or Friendsmas party in 30 minutes
${themeUrl}

#ChristmasNightmare #ChristmasMurderMystery #FriendsmasParty #MurderMysteryParty #BackPocketMysteries`,
    linkedin: (themeUrl) => `Product Launch: How We Engineered "Christmas Nightmare" as a flexibleible, Multi-Layered Holiday Dinner Party Murder Mystery for 6 Players

Every December, hosts planning Friendsmas dinners, couples game nights, and holiday cabin weekends run into the same friction with legacy murder mystery kits. Most holiday-themed boxed games rely on campy caricatures, require an exact three-male and three-female guest ratio, and hand players static paper paragraphs that feel disconnected from how modern groups socialize around a dinner table.

Today we are excited to launch our newest Mystery Theme on Back Pocket Mysteries: Christmas Nightmare, a high-drama holiday dinner party whodunit architected specifically for a tight-knit table of 6 suspects.

The Narrative Premise and Table Dynamics:
They all grew up together on the same street: two pairs of next-door childhood siblings whose lives have been intertwined since high school. Tonight, beneath the twinkling lights of their annual Christmas dinner party, years of tangled history, secret affairs, and broken marriages finally snap. At 8:19:12 PM, a 1,840W electrical overload plunges the living room into darkness. When the lights come back on, The Husband is discovered dead in the Christmas tree corner amid a spilled crystal cup of spiced eggnog, a scorched wall outlet, and a tangled 25-foot coil of vintage red-and-green tree lights. Every person at the table is family, a childhood neighbour, a spouse, or a secret lover, and every single one of them is hiding a betrayal.

Four Architectural Innovations Inside Christmas Nightmare:
1. flexible role casting for Any Group Ratio: While the six canonical roles (The Husband, The Wife, The Sister-in-Law, The Mistress, The Co-Worker, and The Bestie) match a classic 3M/3F dinner table by default, real-world guest lists rarely stay balanced. Our story builder dynamically adapts every character title, pronoun, sibling and spouse relationship noun, and AI costume portrait so the exact same mystery plays seamlessly with 4F/2M, an all-female 6F Friendsmas group, or an all-male 6M table with zero pronoun conflicts.
2. Interlocking Three-Round Forensic Deduction (16 Clues): Across three progressive rounds, players cross-reference 16 distinct pieces of multimedia evidence. Round 1 introduces the coat-closet affair, the stocked-versus-empty utility closet shelves, and the 8:19:12 PM smart-home power log while launching two entangled red-herring subplots (an upstairs study safe heist and a spiked eggnog phone-wipe). Round 2 escalates suspicion with nursery-monitor audio recordings, torn bathroom place cards, and hallway breaker-panel CCTV stills. Round 3 delivers four interlocking alibi and coroner clues that cleanly exonerate the four innocent suspects at the exact 8:19:12 PM timestamp while locking in the true killer.
3. Personalised Visual and Audio Evidence on the Final Mile: When a host enters their six guests' names and optional selfies, our two-stage identity-locked pipeline generates custom costume portraits and crime-scene photographs featuring the actual players inside the upstairs study, at the kitchen bar, and on the hallway security cameras, paired with multi-speaker ElevenLabs audio clips.
4. Spoiler-Free Host Mode and Pre-Party Clarity: Pre-party character cards share only warm, spoiler-free childhood, high school, and workplace connections so no plot twists leak before dinner begins. During the party, our mobile Playroom conceals the solution behind timed round unlocks so the host can play as a full suspect.

What Is Included in Every Customised Kit:
- Six personalised holiday character dossiers with three festive outfit options per role.
- Sixteen progressive multimedia clues across chat threads, audio wiretaps, CCTV stills, smart-home logs, and forensic reports.
- Live mobile Playroom lobby with theory tracking, final suspect voting, and end-of-night superlative awards (Best Detective, Master Manipulator, and Best Dressed).

Designed for Zero-Stress Holiday Hosting:
From entering your six guests' names to dropping spoiler-free character invites into your group chat, the entire setup takes under 30 minutes and starts from $19 (roughly $3.15 per guest), replacing hours of paper cutting with an unforgettable two-to-three-hour holiday dinner table experience.

Explore the Christmas Nightmare Mystery Theme and preview the 6-suspect line-up:
${themeUrl}

#ChristmasNightmare #ChristmasMurderMystery #FriendsmasParty #MurderMysteryParty #BackPocketMysteries`,
  },
};

export async function queueMysteryPackLaunch(
  packSlug = process.argv[2] || "christmas-nightmare",
  scheduledAt = process.argv[3] || "2026-11-25T09:00:00Z"
) {
  const pack = PACK_TEMPLATES[packSlug] || PACK_TEMPLATES["christmas-nightmare"];
  const themeUrl = `${SITE}/themes/${pack.slug}`;
  const igFbCopy = pack.igFb(themeUrl);
  const liCopy = pack.linkedin(themeUrl);

  // Guardrail validation
  const igTags = (igFbCopy.match(/#\w+/g) || []).length;
  if (igTags > 5) throw new Error(`IG/FB has ${igTags} hashtags (max 5)`);
  if (liCopy.includes("—")) throw new Error("LinkedIn post contains an em-dash (—)");
  const liWords = liCopy.split(/\s+/).filter(Boolean).length;
  console.log(`Mystery Pack [${pack.slug}]: IG/FB hashtags=${igTags}, LinkedIn words=${liWords}`);
  if (liWords < 600 || liWords > 700) {
    throw new Error(`LinkedIn post is ${liWords} words (strictly required: 600–700)`);
  }

  const storePath = "data/.marketing-suite-store.json";
  if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
  const store = fs.existsSync(storePath)
    ? JSON.parse(fs.readFileSync(storePath, "utf8"))
    : { blog_posts: [], social_posts: [], social_post_captions: [], edm_campaigns: [], edm_events: [] };

  const nowIso = new Date().toISOString();
  const brief = `New Mystery Theme Launch: ${pack.title} (${pack.theme})`;

  const existingIdx = store.social_posts.findIndex((p) => p.brief === brief);
  const postId = existingIdx >= 0 ? store.social_posts[existingIdx].id : crypto.randomUUID();

  const socialRow = {
    id: postId,
    brief,
    status: "draft",
    scheduled_at: scheduledAt,
    timezone: "Australia/Sydney",
    posted_at: null,
    source_blog_id: null,
    content_type: "mystery_pack_launch",
    slide_content: { linkUrl: themeUrl, stat: pack.stat },
    error_message: null,
    created_at: existingIdx >= 0 ? store.social_posts[existingIdx].created_at : nowIso,
    updated_at: nowIso,
  };

  if (existingIdx >= 0) {
    store.social_posts[existingIdx] = socialRow;
  } else {
    store.social_posts.push(socialRow);
  }

  store.social_post_captions = store.social_post_captions.filter((c) => c.post_id !== postId);
  store.social_post_captions.push(
    {
      id: crypto.randomUUID(),
      post_id: postId,
      platform: "linkedin",
      caption: liCopy,
      hashtags: pack.hashtags,
      media_urls: [],
      post_url: themeUrl,
      engagement_data: {},
      created_at: nowIso,
    },
    {
      id: crypto.randomUUID(),
      post_id: postId,
      platform: "instagram",
      caption: igFbCopy,
      hashtags: pack.hashtags,
      media_urls: [`/api/social-card/${pack.slug}`],
      post_url: themeUrl,
      engagement_data: {},
      created_at: nowIso,
    },
    {
      id: crypto.randomUUID(),
      post_id: postId,
      platform: "facebook",
      caption: igFbCopy,
      hashtags: pack.hashtags,
      media_urls: [`/api/social-card/${pack.slug}`],
      post_url: themeUrl,
      engagement_data: {},
      created_at: nowIso,
    }
  );

  // Also inject into the latest draft EDM campaign if not already present
  const draftEdm = store.edm_campaigns.find((e) => e.status === "draft");
  if (draftEdm && Array.isArray(draftEdm.blocks_json)) {
    const alreadyHasPack = draftEdm.blocks_json.some((b) => b.id === `pack-text-${pack.slug}`);
    if (!alreadyHasPack) {
      const utmUrl = `${themeUrl}?utm_source=edm&utm_medium=email&utm_campaign=mystery_pack_launch`;
      const packBlocks = [
        {
          id: `div-pack-${pack.slug}`,
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
          id: `pack-img-${pack.slug}`,
          type: "image",
          data: {
            src: `${BASE_URL}${pack.image}`,
            alt: pack.title,
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
          id: `pack-text-${pack.slug}`,
          type: "text",
          data: {
            content: `<span style='background-color:#1e191c;color:#fe04c6;font-size:11px;font-weight:800;text-transform:uppercase;padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:8px;'>🔥 NEW MYSTERY THEME • ${pack.theme.toUpperCase()}</span><h2 style='font-size:20px;font-weight:800;color:#1e191c;margin:4px 0 10px 0;line-height:1.3;'>${pack.title} (${pack.players} Suspects)</h2><p style='margin:0 0 12px 0;color:#4b5563;font-size:15px;line-height:1.6;'>${pack.shortDesc}</p><ul style='margin:0;padding-left:20px;color:#1e191c;line-height:1.7;'>${pack.included.map((item) => `<li style='margin-bottom:6px;'><strong>Included:</strong> ${item}</li>`).join("")}</ul>`,
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
          id: `pack-cta-${pack.slug}`,
          type: "button",
          data: {
            text: `Explore New Mystery Pack: ${pack.title} →`,
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

      const footerIdx = draftEdm.blocks_json.findIndex((b) => b.id === "footer-text");
      draftEdm.blocks_json =
        footerIdx >= 0
          ? [
              ...draftEdm.blocks_json.slice(0, footerIdx),
              ...packBlocks,
              ...draftEdm.blocks_json.slice(footerIdx),
            ]
          : [...draftEdm.blocks_json, ...packBlocks];

      const renderBlock = (block) => {
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
      console.log(`✓ injected Mystery Pack spotlight (${pack.title}) into Weekly EDM: ${draftEdm.subject}`);
    }
  }

  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
  if (supabase) {
    await supabase.storage
      .from("character-images")
      .upload(
        "system/marketing-suite-store.json",
        Buffer.from(JSON.stringify(store, null, 2), "utf8"),
        {
          contentType: "application/json",
          upsert: true,
        }
      )
      .catch(() => {});
  }
  console.log(`✓ queued Mystery Theme launch socials for ${pack.title} → ${scheduledAt}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  queueMysteryPackLaunch().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
