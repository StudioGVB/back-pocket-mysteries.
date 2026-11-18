import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import crypto from "crypto";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const SITE = "https://backpocketmysteries.com/en";
const BASE_URL = "https://backpocketmysteries.com";
const EMAIL_FONT_FAMILY = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const SLUGS = {
  corporate: "corporate-team-building-murder-mystery-party-guide",
  audio: "multimedia-audio-cctv-clues-murder-mystery-party",
  smallGroup: "small-group-murder-mystery-dinner-party-6-to-8-players",
  holiday: "holiday-new-years-eve-murder-mystery-party-guide",
};
const url = (k) => `${SITE}/blog/${SLUGS[k]}`;

// Strict Content Guardrails:
// - Cadence: Blogs Mon & Thu 09:00:00Z; Socials Tue & Fri 09:00:00Z; Weekly EDM Fri 09:00:00Z.
// - Review-First Workflow: Always insert social_posts and edm_campaigns with status: "draft".
// - IG/FB: Same caption & cover photo (rendered with 8-template overlay via /api/social-card/[slug]),
//   punchy stat: { value, label } in slide_content.stat (no postCopy in slide_content),
//   scannable emoji bullets + "👇 Link in bio to read the full guide", max 5 hashtags.
// - LinkedIn: 600–700 words expert post validated before insert, structured subheadings, real numbers/tables,
//   no em-dashes, direct blog link at bottom, media_urls: [], trailing hashtags matching hashtags array.
// - EDM: Structured blocks_json + compiled table-based html_content featuring the week's 2 blogs.

const campaigns = [
  {
    key: "corporate",
    brief: "Corporate Team Building Murder Mysteries (8–24 Players)",
    schedule: "2026-11-20T09:00:00Z", // Fri – Thu 19 Nov blog
    image: "/blog/hosting-guide.png",
    stat: { value: "95%+", label: "team participation rate when every guest holds unique clues" },
    hashtags: ["TeamBuilding", "CorporateEvents", "WorkplaceCulture", "MurderMystery", "BackPocketMysteries"],
    igFb: `🕵️‍♀️ Tired of awkward corporate trust falls and noisy pub tables where you only talk to the person next to you?

Interactive murder mysteries are taking over workplace socials for groups of 8 to 24 people 🔥

Why they work so well:
🎭 Asymmetric clues mean every single person holds information the team needs
🧠 Introverts shine on CCTV timelines and forensic reports while extroverts lean into dramatic accusations
💸 Hosting in-office or in a private dining room costs ~60% less than external corporate entertainment agencies
⏱️ A complete 3-round investigation fits into a tight 90-minute Friday afternoon run sheet

Our latest guide breaks down how to cast your colleagues, how host-blind mode lets the organiser play along, and a minute-by-minute corporate run sheet.

👇 Link in bio to read the full guide
${url("corporate")}

#TeamBuilding #CorporateEvents #WorkplaceCulture #MurderMystery #BackPocketMysteries`,
    linkedin: `Corporate Team Building Murder Mysteries: How Asymmetric Information Solves the Workplace Social Problem

Corporate offsites, quarterly planning socials, and end-of-year celebrations suffer from a well-documented engagement gap. Standard pub trivia nights reward the loudest table, facilitated improv workshops create social anxiety for analytical staff, and unstructured bar tabs almost always result in people standing in the exact same three-person cliques they sit with every day. In 2026, workplace experience leads and people-and-culture managers are increasingly turning to structured interactive murder mysteries for groups of 8 to 24 participants.

Why Traditional Team Socials Fail Half the Room:
Most workplace social formats fail because they either demand too much personal vulnerability too quickly or provide zero conversational scaffolding. When you place fifteen colleagues in a noisy venue with no shared objective, seniority and extroversion dictate who speaks. Remote and hybrid team members who only interact on video calls struggle to break into established circles, and quieter analytical thinkers check their watches after the first forty-five minutes.

How Asymmetric Clues Level the Workplace Hierarchy:
In a well-architected mystery game, leverage comes from the character dossier rather than the company org chart. Every participant receives a tailored role, interlocking relationships, and round-by-round objectives:
1. Built-In Conversational Scaffolding: Instead of awkward small talk about quarterly targets, every player has three specific questions they must ask three specific colleagues in Round 1.
2. Psychological Safety Through Persona: Speaking from a character card removes personal ego. Negotiating a fictional blackmail subplot as a corrupt art dealer or a rival vineyard heir gives junior analysts a playful excuse to interrogate the VP of Sales.
3. Dual-Track Engagement for Extroverts and Introverts: Outgoing team members gravitate toward theatrical accusations and costume props, while methodical problem-solvers excel at cross-referencing CCTV timestamps, recovered chat threads, and forensic toxicology reports.
4. Host-Blind Digital Controls: Using a mobile Playroom controller allows the team lead or office manager to advance rounds without seeing the solution, so the organiser can participate as a full suspect alongside their team.

The Budget Comparison for a 12-Person Team:
Running an interactive mystery in your boardroom, a private dining room, or an offsite venue reduces per-head entertainment costs by more than 60% compared with external corporate event agencies:
- External agency facilitated event (12 staff): $1,400 to $2,200 entertainment fee plus $1,200 venue catering minimum, totaling $2,900 to $3,700.
- In-office interactive mystery night (12 staff): $49 to $79 complete digital and printable kit plus $450 grazing platters and drinks, totaling $499 to $529.

That unit-cost difference allows team leads to run memorable quarterly socials rather than waiting for a single annual holiday budget.

The 90-Minute Friday Afternoon Run Sheet:
You do not need a four-hour sit-down dinner to run a complete investigation. Our tested 90-minute corporate format breaks down into five clear stages:
- Minutes 00 to 15 (Arrival and Check-In): Colleagues grab a drink, scan a QR code to open their mobile dossier, and put on their character name badge.
- Minutes 15 to 35 (Round 1 Mingling and Motives): Players circulate to complete their initial prompts and establish alibis before the crime occurs.
- Minutes 35 to 40 (The Crime Broadcast): The host plays the emergency audio announcement locking down the room.
- Minutes 40 to 65 (Round 2 Forensic Investigation): Mobile CCTV stills, chat logs, and multi-speaker voice notes unlock while teams compare timelines over food.
- Minutes 65 to 90 (Round 3 Statements, Voting, and Awards): Suspects deliver 30-second defences, everyone votes on the killer and motive, and awards are handed out for Best Detective and Best Actor.

When a 14-person software and product team used this exact structure for their Sydney offsite, the quietest backend engineer cracked the case by spotting a 7-minute discrepancy between a recovered text message and a security camera timestamp.

Read the full guide, including casting rules and the complete corporate run sheet:
${url("corporate")}

#TeamBuilding #CorporateEvents #WorkplaceCulture #MurderMystery #BackPocketMysteries`,
  },
  {
    key: "audio",
    brief: "Audio Wiretaps, CCTV Stills & Chat Logs in Murder Mysteries",
    schedule: "2026-11-24T09:00:00Z", // Tue – Mon 23 Nov blog
    image: "/blog/ai-generator.png",
    stat: { value: "4 Formats", label: "Audio Wiretaps, CCTV Stills, Chat Logs & Forensic Docs" },
    hashtags: ["MurderMysteryParty", "AudioClues", "GameDesign", "PartyHosting", "BackPocketMysteries"],
    igFb: `🎙️ Imagine tapping play on your phone at a dinner party and hearing two suspects whispering your actual friend's name in a wiretapped voice note 👀

For decades, murder mystery games were just slips of paper. Now you can drop real multimedia forensic evidence into your guests' hands:

🎧 Multi-speaker audio wiretaps & voicemails with collapsible transcripts
📹 High-angle grainy CCTV security stills stamped with CAM 04 // REC metadata
💬 Dark-mode smartphone chat bubbles with "Deleted Message Recovered" badges
🧪 Styled toxicology lab reports, hotel receipts & handwritten notes

The best part? Phones act strictly as an evidence locker while all interrogation happens face-to-face around the table 🥂

👇 Link in bio to read the full guide
${url("audio")}

#MurderMysteryParty #AudioClues #GameDesign #PartyHosting #BackPocketMysteries`,
    linkedin: `Diegetic Audio Wiretaps, CCTV Stills, and Chat Logs: How Multimedia Clues Transform At-Home Murder Mystery Games

For decades, boxed and downloadable murder mystery parties relied on a single medium: slips of paper. Guests read paragraphs from a character booklet, passed around printed clue cards, and tried to picture a crime scene from dense blocks of text. In 2026, the biggest leap in dinner party immersion comes from diegetic multimedia evidence: overheard voice notes, wiretapped phone calls, grainy CCTV security stills, and recovered text threads delivered straight to players' smartphones.

What Diegetic Evidence Means for Tabletop and Party Design:
In film and interactive game design, diegetic elements are artifacts that exist inside the fictional world itself. Instead of a narrator card telling players that two suspects argued at 10:30 PM, a diegetic clue gives players the actual artifact from 10:30 PM:
- Overheard Arguments: Upgraded from a written witness summary to a 35-second multi-speaker audio recording where vocal hesitation and background clinking glasses carry real subtext.
- Corridor Alibis: Upgraded from a text bullet point to a high-angle grainy black-and-white security camera still stamped with camera metadata and timestamps.
- Secret Bribes and Affairs: Upgraded from plain prose to dark-mode smartphone chat bubbles displaying timestamps, avatars, and a Deleted Message Recovered indicator.
- Financial and Medical Proof: Upgraded from plain text to formatted toxicology reports, wire transfer receipts, and torn diary pages.

Why Audio Clues Solve Late-Round Reading Fatigue:
By Round 2 of an evening dinner party, room lighting is dim, drinks are flowing, and guests do not want to squint at long paragraphs of small print. Audio evidence solves this immediately across four dimensions:
1. Collective Room Attention: When one player unlocks a wiretap and taps play, all 8 to 16 guests stop talking and lean in to listen at the exact same moment.
2. Personalized Name Hydration: When the dialogue script is hydrated with the real guests' names assigned to each character archetype and synthesized via multi-speaker voice models, hearing a suspect whisper a real friend's name across the dinner table creates an unforgettable reaction.
3. Low-Light Accessibility: Candlelit dining tables and neon noir setups look atmospheric but make paper booklets hard to read. Backlit chat threads and playable audio clips work effortlessly in dark rooms.
4. Collapsible Transcripts for Verification: Pairing every 30-second audio clip with a collapsible written transcript lets players listen for dramatic tone first and then skim exact times and dollar figures during final deliberations.

Avoiding Screen Fatigue With the Hybrid Physical and Digital Model:
A common concern among party hosts is that mobile companion apps might leave guests staring silently at their phones. The solution is hybrid staging:
- Keep character badges, core bios, and hidden crime-scene Polaroid cards physical so identities stay visible and guests physically search the room.
- Reserve the mobile Playroom for round-by-round objective unlocks and three or four high-impact multimedia artifacts per round.

Staging Multimedia Reveals Across Three Acts:
Pacing your evidence formats keeps energy rising from arrival to the final vote:
- Round 1 (Motives and Rumours): Use recovered smartphone chat threads and financial receipts to expose who owes money or holds a grudge.
- Round 2 (Breaking Alibis): Drop grainy CCTV stills that contradict where suspects claimed they were standing during the crime window.
- Round 3 (The Smoking Gun): Unlock the multi-speaker audio wiretap and toxicology report that clear the red herrings and allow observant detectives to connect motive, means, and opportunity.

Case Study from a 10-Player Gala Mystery:
In our Love on the Rocks reunion mystery, three suspects hold strong motives to poison the victim's champagne flute. When the host triggers Round 3, a recovered backstage voice recording unlocks in the Playroom. Hearing the background clinking of glasses and a specific 23:12 timestamp allows observant players to cross-reference the Round 1 chat logs and unmask the killer in under ten minutes.

Read the full guide on staging audio and visual evidence for your next mystery night:
${url("audio")}

#MurderMysteryParty #AudioClues #GameDesign #PartyHosting #BackPocketMysteries`,
  },
  {
    key: "smallGroup",
    brief: "Hosting a Small Group Murder Mystery Dinner (6–8 Players)",
    schedule: "2026-11-27T09:00:00Z", // Fri – Thu 26 Nov blog
    image: "/blog/viral-themes.png",
    stat: { value: "6–8", label: "players around one dining table for peak Knives Out energy" },
    hashtags: ["DinnerPartyIdeas", "MurderMystery", "SmallGroupGames", "HostingTips", "BackPocketMysteries"],
    igFb: `🍷 Think you need 20 people and a mansion to host a murder mystery?

Some of the funniest, sharpest mystery nights happen around a single dining table with 6 to 8 friends 🕯️

Why 6–8 players is the ultimate dinner party sweet spot:
🍽️ Pair the 3 rounds of clues directly with Entrée, Main, and Dessert
👀 Nobody can hide in the corner—every accusation and alibi happens in front of the whole table
🏠 Works in a 1-bedroom apartment with zero crowd-herding stress
🔄 Flexible digital roles mean a last-minute cancellation never breaks the game

Our latest blog shares how to pace a 3-course seated mystery and set the mood on a $50 budget.

👇 Link in bio to read the full guide
${url("smallGroup")}

#DinnerPartyIdeas #MurderMystery #SmallGroupGames #HostingTips #BackPocketMysteries`,
    linkedin: `Small-Group Interactive Entertainment: How to Structure a Seated Murder Mystery Dinner Party for 6 to 8 Players

One of the most persistent misconceptions about hosting an at-home murder mystery party is that you need a sprawling house and twenty theatrical guests. In practice, some of the sharpest, funniest, and most engaging mystery nights happen around a single dining table with 6 to 8 players. While large 20-person events operate like high-energy cocktail mixers, a 6-to-8-person seated game feels like Knives Out or Glass Onion: intimate, conversational, and impossible to hide in.

Seated Dinner Mysteries (6 to 8 Players) vs Cocktail Mysteries (12 to 20 Players):
Understanding how group size changes social mechanics helps hosts design a smoother evening:
- Conversational Dynamic: In a 16-person standing party, players break into rotating pairs and whisper in corners. In a 6-to-8-person seated dinner, every accusation, alibi, and contradiction plays out in front of the entire table.
- Pacing and Food Service: Large groups require finger food and grazing platters so people can circulate. A small group can enjoy a proper three-course seated meal where each course aligns naturally with one round of the investigation.
- Host Workload: Managing eight people around one table eliminates crowd-herding stress and allows the host to play as a full suspect without leaving the room.

Aligning Three Investigation Rounds With a Three-Course Meal:
Tying clue progression to your kitchen schedule keeps the evening effortless:
1. Arrival Drinks (20 Minutes): Guests arrive in costume, scan their place-card QR code, and introduce their character's public connection to the victim.
2. Entree / Starter (30 Minutes, Round 1 Motives and Rumours): As starters are served, each player shares their Round 1 prompts across the table. By the time plates are cleared, every suspect has a clear motive.
3. Main Course (40 Minutes, Round 2 Forensic Evidence and Alibis): Right before mains hit the table, the crime broadcast plays. Guests unlock Round 2 CCTV stills and recovered chat logs on their phones and cross-examine each other over family-style platters.
4. Dessert and Digestifs (25 Minutes, Round 3 Smoking Gun and Reveal): Dessert arrives alongside the final audio wiretap clue. Every suspect delivers a 60-second closing defence, votes are cast, and the killer confesses.

Solving the Small-Group Dropout Risk With Dynamic Role Scaling:
In a 20-person party, losing a guest on the afternoon of the event barely affects the room. In a 7-person dinner party, a last-minute babysitter emergency or illness can derail a traditional boxed game if the absent guest was assigned the killer role or held a mandatory clue. Modern digital mystery builders solve this through three mechanisms:
- Automatic Clue Redistribution: Toggling off an absent guest's character redistributes their essential evidence so no plot thread goes missing.
- Instant Role Expansion: If a guest brings a partner last minute, an expandable suspect role can be activated in 60 seconds via a mobile Playroom link.
- One-Click Gender Adaptation: Hosts can toggle character genders between male and female so names, pronouns, and avatars match the exact guest list.

Creating Noir Atmosphere in a Compact Apartment on a $50 Budget:
Because all the action centres on a single dining table, small staging choices have outsized impact. Switching off overhead ceiling lights in favour of warm table lamps and LED candles, placing sealed confidential dossier envelopes on each napkin, curating a low-volume jazz or cinematic soundtrack at 25% volume, and serving shared platters rather than individually plated mains keeps the host seated at the centre of the drama all night. Even in a compact one-bedroom apartment, six friends around a single table can experience a complete three-act whodunit.

Read the full guide to hosting a 6 to 8 player murder mystery dinner party:
${url("smallGroup")}

#DinnerPartyIdeas #MurderMystery #SmallGroupGames #HostingTips #BackPocketMysteries`,
  },
  {
    key: "holiday",
    brief: "Holiday & New Year's Eve Murder Mystery Party Guide",
    schedule: "2026-12-01T09:00:00Z", // Tue – Mon 30 Nov blog
    image: "/blog/20s-costumes.png",
    stat: { value: "11:45 PM", label: "time the killer confession right before the NYE midnight toast" },
    hashtags: ["NewYearsEveParty", "HolidayPartyIdeas", "Friendsmas", "MurderMysteryParty", "BackPocketMysteries"],
    igFb: `🥂 We have all experienced the dreaded 10:30 PM New Year's Eve slump—when dinner is over and everyone is just waiting on the couch for midnight.

This year, time a 3-round Murder Mystery so the killer is unmasked at 11:45 PM, right before the champagne toast 🍾🕵️‍♀️

How the NYE Countdown Run Sheet works:
📸 8:00 PM — Red carpet arrival & suspect mugshots
🍸 8:45 PM — Round 1 mingling & alibis
🚨 9:30 PM — The crime broadcast & dinner platters
📹 10:15 PM — Round 2 CCTV & recovered text clues unlock
🎧 11:00 PM — Round 3 smoking-gun audio wiretap
🏆 11:30 PM — Final votes, awards & the killer's confession
🎆 11:55 PM — Pour the champagne for midnight!

👇 Link in bio to read the full guide
${url("holiday")}

#NewYearsEveParty #HolidayPartyIdeas #Friendsmas #MurderMysteryParty #BackPocketMysteries`,
    linkedin: `Seasonal Event Planning: How to Host a Holiday or New Year's Eve Murder Mystery That Beats the Midnight Slump

Between late November and December 31st, social calendars fill up with festive catch-ups, Friendsmas dinners, and end-of-year house parties that quickly start to feel identical. By mid-December, guests have had the exact same conversations over grazing boards three weekends in a row. Even worse, New Year's Eve house parties almost always hit the notorious 10:30 PM slump: that two-hour gap after dinner finishes where energy dips and everyone is simply waiting around for the midnight broadcast.

Why Murder Mystery Bookings Surge 250%+ Between November and January:
Interactive murder mysteries have become one of the fastest-growing at-home holiday entertainment formats for three practical reasons:
1. Built-In Dress Code Alignment: December is the one time of year when guests are already excited to wear sequins, velvet blazers, black tie, and vintage glamour.
2. Instant Icebreakers for Mixed Groups: Holiday gatherings frequently combine childhood friends, work colleagues, new partners, and extended family who do not know each other well. Character assignments give every guest an immediate reason to mingle.
3. Superior Value vs Ticketed Venues: Between $150 bar cover charges, long drink queues, and surge-priced rideshares on December 31st, hosting 10 to 14 friends at home for $45 to $65 per person (including food and the mystery kit) delivers a far better experience.

The Minute-by-Minute New Year's Eve Countdown Run Sheet:
When hosting on December 31st, anchoring your schedule backward from midnight keeps momentum building all evening:
- 8:00 PM (Doors Open and Mugshots): Snap smartphone or Polaroid mugshots of every guest in costume as they arrive and hand out welcome drinks.
- 8:45 PM (Round 1 Pre-Murder Mingling): Unlock Round 1 objectives in the mobile Playroom so guests establish their motives and alibis.
- 9:30 PM (The Crime Broadcast and Main Food): Play the emergency audio announcement revealing the victim, then serve make-ahead grazing platters.
- 10:15 PM (Round 2 CCTV and Chat Clues): Unlock security camera stills and recovered smartphone text threads; suspects interrogate each other in small groups.
- 11:00 PM (Round 3 Wiretap Reveal): Play the smoking-gun multi-speaker audio clue and hear each suspect's 60-second closing defence.
- 11:30 PM (Voting, Awards, and Confession): Tally votes, hand out Best Detective and Best Actor certificates, and unmask the killer at 11:45 PM.
- 11:50 PM (Countdown Transition): Pour champagne and switch on the midnight countdown with the entire room buzzing.

Matching the Theme to Your December Crowd:
- Glamorous NYE Groups: Reality-TV reunion mysteries (Love on the Rocks) or 1920s speakeasy galas pair naturally with cocktail attire and champagne towers.
- Quirky Friendsmas Dinners: Vintage carnival mysteries (Circus of Screams) reward theatrical props and bold character rivalries.
- Multi-Generational Family Gatherings: Classic manor or inheritance mysteries keep subplots accessible for parents, adult siblings, and cousins alike.

Personalizing the Night With Guest Photos and Inside Jokes:
Sending the digital RSVP link one week before the party lets guests enter their name and upload a quick photo so their crime scene evidence and character dossier feature their actual likeness. Weaving two or three real friend-group jokes into character alibis guarantees big laughs around the room, and printing award certificates for Most Likely to Get Away With Murder in 2027 gives every guest a keepsake at midnight.

A Stress-Free 7-Day Prep Timeline for Busy Hosts:
With digital RSVP links and mobile clue delivery, holiday hosts only need 30 minutes of game setup: choose your theme and send character links seven days out, generate personalized CCTV and audio clues four days out, and spend twenty minutes on party afternoon dimming the lights and testing your Bluetooth speaker. Even if your printer runs out of ink on December 30th, every dossier and clue works seamlessly on guests' phones.

Read the full New Year's Eve and Holiday hosting guide:
${url("holiday")}

#NewYearsEveParty #HolidayPartyIdeas #Friendsmas #MurderMysteryParty #BackPocketMysteries`,
  },
];

async function run() {
  const storePath = "data/.marketing-suite-store.json";
  if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
  const store = fs.existsSync(storePath)
    ? JSON.parse(fs.readFileSync(storePath, "utf8"))
    : { blog_posts: [], social_posts: [], social_post_captions: [], edm_campaigns: [], edm_events: [] };

  let { data: blogs, error } = await supabase
    .from("blog_posts")
    .select("id, slug, title")
    .in("slug", Object.values(SLUGS));

  const useStore = Boolean(error);
  if (useStore) {
    blogs = store.blog_posts.filter((b) => Object.values(SLUGS).includes(b.slug));
  }

  if (!blogs || blogs.length !== 4) {
    throw new Error("Could not load the 4 blogs. Run scripts/create-nov-dec-4-blogs.mjs first.");
  }
  const bySlug = Object.fromEntries(blogs.map((b) => [b.slug, b]));

  // Validate guardrails before writing anything
  for (const c of campaigns) {
    const igTags = (c.igFb.match(/#\w+/g) || []).length;
    if (igTags > 5) throw new Error(`${c.key}: IG/FB has ${igTags} hashtags (max 5)`);
    const liWords = c.linkedin.split(/\s+/).filter(Boolean).length;
    console.log(`${c.key}: IG/FB hashtags=${igTags}, LinkedIn words=${liWords}`);
    if (liWords < 600 || liWords > 700) {
      throw new Error(`${c.key}: LinkedIn is ${liWords} words (target 600–700)`);
    }
  }

  const nowIso = new Date().toISOString();

  for (const c of campaigns) {
    const blog = bySlug[SLUGS[c.key]];
    if (!useStore) {
      const { data: existing } = await supabase
        .from("social_posts")
        .select("id")
        .eq("source_blog_id", blog.id);

      if (existing?.length) {
        const postId = existing[0].id;
        const { error: uErr } = await supabase
          .from("social_posts")
          .update({
            brief: c.brief,
            status: "draft",
            scheduled_at: c.schedule,
            timezone: "Australia/Sydney",
            slide_content: { linkUrl: url(c.key), stat: c.stat },
          })
          .eq("id", postId);
        if (uErr) throw uErr;

        await supabase.from("social_post_captions").delete().eq("post_id", postId);
        const { error: cErr } = await supabase.from("social_post_captions").insert([
          {
            post_id: postId,
            platform: "linkedin",
            caption: c.linkedin,
            hashtags: c.hashtags,
            media_urls: [],
            post_url: url(c.key),
          },
          {
            post_id: postId,
            platform: "instagram",
            caption: c.igFb,
            hashtags: c.hashtags,
            media_urls: [c.image],
            post_url: url(c.key),
            engagement_data: {},
          },
          {
            post_id: postId,
            platform: "facebook",
            caption: c.igFb,
            hashtags: c.hashtags,
            media_urls: [c.image],
            post_url: url(c.key),
            engagement_data: {},
          },
        ]);
        if (cErr) throw cErr;
        console.log(`✓ updated draft social: ${c.brief} → ${c.schedule}`);
        continue;
      }

      const { data: post, error: pErr } = await supabase
        .from("social_posts")
        .insert({
          brief: c.brief,
          status: "draft",
          scheduled_at: c.schedule,
          timezone: "Australia/Sydney",
          source_blog_id: blog.id,
          content_type: "article_summary",
          slide_content: { linkUrl: url(c.key), stat: c.stat },
        })
        .select("id")
        .single();
      if (pErr) throw pErr;

      const { error: cErr } = await supabase.from("social_post_captions").insert([
        {
          post_id: post.id,
          platform: "linkedin",
          caption: c.linkedin,
          hashtags: c.hashtags,
          media_urls: [],
          post_url: url(c.key),
        },
        {
          post_id: post.id,
          platform: "instagram",
          caption: c.igFb,
          hashtags: c.hashtags,
          media_urls: [c.image],
          post_url: url(c.key),
          engagement_data: {},
        },
        {
          post_id: post.id,
          platform: "facebook",
          caption: c.igFb,
          hashtags: c.hashtags,
          media_urls: [c.image],
          post_url: url(c.key),
          engagement_data: {},
        },
      ]);
      if (cErr) throw cErr;
      console.log(`✓ draft social: ${c.brief} → ${c.schedule}`);
    } else {
      // Store sync
      const existingIdx = store.social_posts.findIndex((p) => p.source_blog_id === blog.id);
      const postId =
        existingIdx >= 0 ? store.social_posts[existingIdx].id : crypto.randomUUID();
      const postRow = {
        id: postId,
        brief: c.brief,
        status: "draft",
        scheduled_at: c.schedule,
        timezone: "Australia/Sydney",
        posted_at: null,
        source_blog_id: blog.id,
        content_type: "article_summary",
        slide_content: { linkUrl: url(c.key), stat: c.stat },
        error_message: null,
        created_at: existingIdx >= 0 ? store.social_posts[existingIdx].created_at : nowIso,
        updated_at: nowIso,
      };
      if (existingIdx >= 0) {
        store.social_posts[existingIdx] = postRow;
      } else {
        store.social_posts.push(postRow);
      }

      store.social_post_captions = store.social_post_captions.filter(
        (cap) => cap.post_id !== postId
      );
      store.social_post_captions.push(
        {
          id: crypto.randomUUID(),
          post_id: postId,
          platform: "linkedin",
          caption: c.linkedin,
          hashtags: c.hashtags,
          media_urls: [],
          post_url: url(c.key),
          engagement_data: {},
          created_at: nowIso,
        },
        {
          id: crypto.randomUUID(),
          post_id: postId,
          platform: "instagram",
          caption: c.igFb,
          hashtags: c.hashtags,
          media_urls: [c.image],
          post_url: url(c.key),
          engagement_data: {},
          created_at: nowIso,
        },
        {
          id: crypto.randomUUID(),
          post_id: postId,
          platform: "facebook",
          caption: c.igFb,
          hashtags: c.hashtags,
          media_urls: [c.image],
          post_url: url(c.key),
          engagement_data: {},
          created_at: nowIso,
        }
      );
      console.log(`✓ draft social: ${c.brief} → ${c.schedule}`);
    }
  }

  // ---------------- EDM: Fri 27 Nov – week's blogs (Mon 23 Audio Clues + Thu 26 Small Group 6-8)
  const subject = "Audio Wiretaps, CCTV Clues & Hosting for 6–8 Friends: The Mystery Gazette 🕵️‍♀️";
  const utm = "utm_source=edm&utm_medium=email&utm_campaign=weekly_gazette_nov27";
  const blocks = [
    {
      id: "hero",
      type: "text",
      data: {
        content:
          "<p style='font-size:12px;font-weight:700;letter-spacing:2px;color:#fe04c6;text-transform:uppercase;margin:0 0 12px 0;'>THE MYSTERY GAZETTE • WEEKLY ROUNDUP</p><h1 style='font-size:26px;font-weight:800;color:#ffffff;margin:0;line-height:1.25;'>Wiretapped Voice Notes & Intimate Dinner Mysteries</h1>",
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
          "<p style='margin:0 0 14px 0;'>Hi {{first_name}},</p><p style='margin:0;'>Welcome to this week's Back Pocket Mysteries briefing. We're looking at how diegetic audio wiretaps and CCTV stills transform dinner-table immersion, plus how to host a Knives Out-style seated mystery for a small group of 6 to 8 friends.</p>",
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
    {
      id: "div1",
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
      id: "blog1-img",
      type: "image",
      data: {
        src: `${BASE_URL}/blog/ai-generator.png`,
        alt: bySlug[SLUGS.audio].title,
        width: "100%",
        align: "center",
        linkUrl: `${url("audio")}?${utm}`,
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
      id: "blog1-text",
      type: "text",
      data: {
        content:
          "<span style='background-color:#fdf2f8;color:#fe04c6;font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px;'>BEHIND THE MYSTERY</span><h2 style='font-size:20px;font-weight:700;color:#1e191c;margin:4px 0 12px 0;line-height:1.3;'>1. Audio Wiretaps, CCTV Stills & Chat Logs</h2><ul style='margin:0;padding-left:20px;color:#1e191c;line-height:1.7;'><li style='margin-bottom:8px;'><strong style='color:#fe04c6;'>Multi-Speaker Voice Notes:</strong> Hear suspects whisper your real friends' names on tap.</li><li style='margin-bottom:8px;'><strong style='color:#fe04c6;'>CCTV & Dark-Mode Chats:</strong> High-angle security frames and recovered text threads replace dense paragraphs.</li><li style='margin-bottom:0;'><strong style='color:#fe04c6;'>Hybrid Staging:</strong> Phones act strictly as an evidence locker while interrogation stays face-to-face.</li></ul>",
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
      id: "blog1-cta",
      type: "button",
      data: {
        text: "Read Guide: Multimedia Audio & CCTV Clues →",
        url: `${url("audio")}?${utm}`,
        backgroundColor: "#fe04c6",
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
    {
      id: "div2",
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
      id: "blog2-img",
      type: "image",
      data: {
        src: `${BASE_URL}/blog/viral-themes.png`,
        alt: bySlug[SLUGS.smallGroup].title,
        width: "100%",
        align: "center",
        linkUrl: `${url("smallGroup")}?${utm}`,
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
      id: "blog2-text",
      type: "text",
      data: {
        content:
          "<span style='background-color:#eef2ff;color:#0d00ff;font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px;'>HOSTING GUIDES</span><h2 style='font-size:20px;font-weight:700;color:#1e191c;margin:4px 0 12px 0;line-height:1.3;'>2. Hosting a Small-Group Mystery Dinner (6–8 Players)</h2><ul style='margin:0;padding-left:20px;color:#1e191c;line-height:1.7;'><li style='margin-bottom:8px;'><strong style='color:#0d00ff;'>3 Courses, 3 Rounds:</strong> Align Entrée, Main, and Dessert with your clue unlocks.</li><li style='margin-bottom:8px;'><strong style='color:#0d00ff;'>One-Table Drama:</strong> Every accusation and alibi happens in front of the entire group.</li><li style='margin-bottom:0;'><strong style='color:#0d00ff;'>Dropout-Proof:</strong> Toggle flexible characters and adaptable genders in seconds.</li></ul>",
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
      id: "blog2-cta",
      type: "button",
      data: {
        text: "Read Guide: 6–8 Player Dinner Mysteries →",
        url: `${url("smallGroup")}?${utm}`,
        backgroundColor: "#0d00ff",
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
    {
      id: "footer-text",
      type: "text",
      data: {
        content:
          "<p style='margin:0 0 4px 0;font-size:16px;font-weight:900;letter-spacing:-0.5px;color:#ffffff;text-transform:uppercase;'>Back Pocket <span style='color:#fe04c6;'>Mysteries</span></p><p style='margin:0 0 16px 0;font-size:13px;color:#d1d5db;line-height:1.6;max-width:420px;display:inline-block;'>Custom-built murder mystery parties with personalized characters, CCTV evidence, and mobile audio clues — sorted in 30 minutes.</p>",
        fontSize: 13,
        textAlign: "center",
        textColor: "#d1d5db",
        lineHeight: 1.5,
        sectionStyles: {
          backgroundColor: "#1e191c",
          paddingTop: 28,
          paddingBottom: 28,
          paddingLeft: 32,
          paddingRight: 32,
        },
      },
    },
  ];

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
  const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html xmlns="http://www.w3.org/1999/xhtml"><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${EMAIL_FONT_FAMILY};"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:20px 0;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;max-width:600px;">${blocks
    .map(renderBlock)
    .join("")}</table></td></tr></table></body></html>`;

  const edmPayload = {
    subject,
    preheader:
      "This week on The Mystery Gazette: how audio wiretaps and CCTV stills transform your party, plus hosting for 6–8 friends.",
    status: "draft",
    scheduled_at: "2026-11-27T09:00:00Z",
    scheduled_at_tz: "Australia/Sydney",
    sent_at: null,
    audience_type: "group",
    audience_group_id: "67858376-44bc-4956-a899-354c9f65cbe8",
    from_name: "Gabby from Back Pocket Mysteries",
    from_email: "hello@backpocketmysteries.com",
    blocks_json: blocks,
    html_content: html,
    global_styles_json: {
      backgroundColor: "#f4f4f5",
      fontFamily: EMAIL_FONT_FAMILY,
      primaryColor: "#fe04c6",
      contentWidth: 600,
    },
    updated_at: nowIso,
  };

  if (!useStore) {
    const { data: dupe } = await supabase
      .from("edm_campaigns")
      .select("id")
      .eq("subject", subject);
    if (dupe?.length) {
      console.log("skip EDM: already exists");
      return;
    }
    const { data: edm, error: eErr } = await supabase
      .from("edm_campaigns")
      .insert(edmPayload)
      .select("id")
      .single();
    if (eErr) throw eErr;
    console.log(`✓ draft EDM ${edm.id} for Fri 27 Nov`);
  } else {
    const existingEdmIdx = store.edm_campaigns.findIndex((e) => e.subject === subject);
    const edmId =
      existingEdmIdx >= 0 ? store.edm_campaigns[existingEdmIdx].id : crypto.randomUUID();
    const row = {
      id: edmId,
      created_at:
        existingEdmIdx >= 0 ? store.edm_campaigns[existingEdmIdx].created_at : nowIso,
      ...edmPayload,
    };
    if (existingEdmIdx >= 0) {
      store.edm_campaigns[existingEdmIdx] = row;
    } else {
      store.edm_campaigns.push(row);
    }
    console.log(`✓ draft EDM ${edmId} for Fri 27 Nov`);

    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
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
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
