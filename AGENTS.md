<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:marketing-automation-rules -->
# Bi-Weekly Marketing & Mystery Base Pack Launch Rules

Whenever the user asks to generate/queue a 2-week batch of blogs, socials, or EDMs, or announces a new Mystery Base Pack, strictly enforce these guardrails:

1. **Bi-Weekly Blog Batch (4 Blogs per 2 Weeks — Mondays & Thursdays at `09:00:00Z`)**
   - Research 4 trending, non-overlapping topics relevant to murder mystery parties, events, hosting, and interactive activities.
   - Include authoritative external backlinks/references, meaningful statistics, and markdown tables.
   - **Minimum 1,500 words per blog** (`if (words < 1500) throw new Error(...)`).
   - **Generate a brand-new AI cover image** (`gemini-2.5-flash-image`) saved to `public/blog-images/<slug>.png` for every scheduled blog.
   - Insert with `is_draft = false` and future `publish_date` (Mondays & Thursdays `09:00:00Z` starting from the next available slot after the last scheduled blog).
   - Scheduled blogs are viewable by direct URL (`/en/blog/[slug]` with `noindex` until `publish_date <= now()`) and hidden from `/en/blog` and `sitemap.ts` until `publish_date <= now()`.

2. **Bi-Weekly Socials & Weekly EDM Queue (Full Content Mix — Review-First)**
   - **Review-First Workflow:** Always insert `social_posts` and `edm_campaigns` with `status: "draft"`. Never auto-push to Buffer on script creation; wait for human review and clicking **Mark Scheduled** in Admin.
   - **Weekly Cadence (across each 2-week batch):**
     - **Tuesdays (`09:00:00Z`):** Blog #1 Authority Post (IG/FB + 600–700w LinkedIn) based on Monday's blog, ending with a **Blog-to-Buy bridge CTA** (`from $19 / ~$2.50 per guest`).
     - **Wednesdays (`09:00:00Z`):** Interactive Engagement / Group-Chat Viral Post (IG/FB) — rotating between *"Can You Spot the Lie?" Mini-Mystery Clue Puzzles* (CCTV/chat/audio hooks) and *"Send This to the Friend Who Would Play…" Character Archetype Spotlights*.
     - **Fridays (`09:00:00Z`):** Blog #2 Authority Post (IG/FB + 600–700w LinkedIn) based on Thursday's blog + **Friday Weekly EDM** featuring both of that week's blogs (Monday + Thursday) and a Mystery Pack / Custom Builder Buy Spotlight.
     - **Saturdays or Sundays (`09:00:00Z`):** Direct **"CTA to Buy" Commercial Post** (IG/FB + optional LinkedIn B2B Corporate/Team-Building angle) — rotating between *Theme Pack Shop Promos*, *"$2.50/Guest Dinner Party Math"*, *"Put Your Friends in the Crime Scene" Custom Builder*, and *"Old PDF Kits vs. Back Pocket Mysteries" Comparisons*.
   - **Instagram & Facebook (`platform: 'instagram'` & `'facebook'`):**
     - Same caption and cover image (`media_urls: [featured_image_url]`), rendered through `/api/social-card/[slug]` (8 rotating `1080x1350` templates, supporting commercial `ctaText` and `kickerText` in `slide_content`).
     - Include `stat: { value, label }` inside `social_posts.slide_content.stat` (never put `postCopy` in `slide_content`).
     - Scannable emoji bullets + Blog-to-Buy or Direct-to-Buy CTA + `"👇 Link in bio..."`.
     - **Maximum 5 hashtags (`#`)** — validate before inserting (`if (igTags > 5) throw new Error(...)`).
   - **LinkedIn (`platform: 'linkedin'`):**
     - **600–700 words** expert long-form post validated before inserting (`if (liWords < 600 || liWords > 700) throw new Error(...)`).
     - Structured subheadings, real numbers/worked examples from the blog, no em-dashes (`—`), direct blog/product link at the bottom, `media_urls: []`, and trailing hashtags matching the `hashtags` array column.
   - **Weekly EDM (`edm_campaigns`):**
     - Uses structured `blocks_json` + compiled table-based `html_content` (`hero` dark banner → `Hi {{first_name}},` `intro` → `divider` → Blog 1 image + category badge + 3-bullet summary + UTM button → `divider` → Blog 2 image + category badge + 3-bullet summary + UTM button → Mystery Base Pack / Custom Builder Buy Spotlight → branded `footer-text`).

3. **New Mystery Base Pack Launches (`scripts/queue-mystery-pack-launch.mjs` & `/api/admin/marketing-launch-pack`)**
   - **Proactive Prompt Mandate:** Whenever a new Mystery Base Pack is created, finalized, or set to Live (`status === 'published'`), **always proactively prompt the user** to run the launch marketing for it (*"Now that `<Mystery Title>` is live, would you like me to run the launch marketing for it (IG/FB social card, 600-word LinkedIn launch post, and Friday Weekly EDM spotlight)?"*).
   - Every time a new Mystery Base Pack goes live, queue a draft IG/FB post (rendered via `/api/social-card/<mystery-slug>`), a 600–700 word LinkedIn launch post, and include the **New Mystery Base Pack Spotlight** section in that week's Friday EDM.
<!-- END:marketing-automation-rules -->

<!-- BEGIN:mystery-architecture-and-qa-rules -->
# Mystery Base Pack Architecture, Gender-Flex Casting & Pre-Launch QA Rules

Whenever creating, editing, hydrating, or stress-testing any Mystery Base Pack, strictly enforce these architectural standards:

1. **Bidirectional Gender-Flex Casting & Hydration ("Default Gender First, Auto-Flex When Needed")**
   - Every character role has a **Default Gender** (`male`, `female`, or `adaptable`) used to match same-gender guests first (`3M/3F`). However, if a party has an uneven or single-gender group (e.g. `4F/2M`, `6F Bachelorette`, `6M`), **any role can seamlessly flex to any guest gender**:
     - **Canonical Role Token Preservation:** [`getBaseCharacterRoleTitle`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/utils/hydration.ts) preserves the canonical DB key (`{{The Sister-in-Law}}`, `{{The Husband}}`, `{{The Mistress}}`) for token lookup, while [`adaptRoleTitleForGuestGender`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/utils/hydration.ts) adapts user-facing display titles (`The Brother-in-Law`, `The Husband (Wife)`, `The Secret Lover`, etc.).
     - **Dynamic Pronoun & Relationship Tokens:** Never hardcode third-person pronouns (`he/she/him/her/his`) or gendered family nouns (`brother/sister/husband/wife/brother-in-law/sister-in-law`) when referring to another character in bios, motives, relationships, act bullets, or clues. Always use dynamic tokens resolved by [`hydrateTextWithCharacters`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/utils/hydration.ts):
       - `{{Role_he}}`, `{{Role_him}}`, `{{Role_his}}`, `{{Role_himself}}`
       - `{{Role_sibling}}` (`brother` / `sister`)
       - `{{Role_spouse}}` (`husband` / `wife`)
       - `{{Role_inlaw}}` (`brother-in-law` / `sister-in-law`)
     - **Bidirectional Outfit & AI Costume Portrait Adaptation:** [`adaptOutfitForGuestGender`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/utils/hydration.ts) (called inside [`getCharacterOutfitDescription`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/app/actions/generator.ts)) automatically adapts feminine dresses/gowns/heels/lipstick to tailored masculine equivalents when a male guest is cast, and masculine suits/tuxedos/ties to chic feminine equivalents when a female guest is cast.

2. **4-Tier Spice Level Rubric (SFW Roleplay Boundary vs. Dialogue Explicitness)**
   - **`clean` (`1.0 – 3.4 / 10` • ✨ Safe For Work & Family):** Full high-stakes adult murder mystery — **death, murder weapons, revenge, greed, financial blackmail, sabotage, and poisoned/spiked drinks are all allowed and expected**. Strictly enforces **ZERO romantic love-affair / cheating roleplay** between players (so co-workers or family members never have to roleplay lovers) and **100% clean dialogue (0 swearing/cussing)**.
   - **`mild` (`3.5 – 5.5 / 10` • 🌶️ Romantic Affairs • Clean Dialogue / No Cussing):** Adds **romantic betrayal, secret love affairs, cheating spouses, and jealous exes** alongside murder and blackmail (great for friend groups, couples, and dinner parties), while keeping the **dialogue 100% clean and PG-13 (ZERO swearing/cussing, ZERO bitch slaps/catfights, ZERO sex tapes — capped at `<= 4.8 / 10`)**.
   - **`spicy` (`5.6 – 8.2 / 10` • 🌶️🌶️ Cussing, Bitch Slaps & Sex Tapes):** Triggered when character dialogue, chat logs, or voicemails include **cussing/swearing** (`bitch`, `shit`, `bullshit`, `asshole`, `slut`, `wtf`, `stfu`), **bitch slaps / catfights / throwing drinks in faces**, or **sex tapes / leaked nudes / OnlyFans / sugar daddies**.
   - **`filthy` (`8.3 – 10.0 / 10` • 🔥🔥🔥 18+ Unfiltered After-Dark):** Triggered by heavy **F-bombs** (`fuck`, `motherfucker`), explicit sexual kinks/orgies/strippers, or hard drugs (`cocaine`, `snorting lines`).

3. **5-Factor Difficulty (`Complexity Level`) Rubric (`Easy` | `Medium` | `Hard`)**
   - Calibrated in [`src/lib/mystery-qa-store.ts`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/lib/mystery-qa-store.ts) across 5 signals:
     1. **Conspiracy Structure (`plot_role === 'assistant'`):** `0 Assistants` (Lone-Wolf Killer, `+0.0 pts`) vs. `1 Assistant/Accomplice` (2-Person Conspiracy, `+1.4 pts`) vs. `2+ Assistants` (`+2.2 pts`).
     2. **Red-Herring Subplot Entanglement:** `+0.9 pts` per overlapping decoy subplot arc (`is_fake: true` clues).
     3. **Timeline Micro-Window Timestamp Precision:** Distinct `HH:MM AM/PM` clock timestamps players must align (`5+ timestamps` = `+1.0 pt`).
     4. **Round 1 Misdirection Power:** `>= 75%` of early Round 1 table suspicion deflected onto decoys (`+0.8 pts`).
     5. **Forensic Synthesis Load:** Total clue volume (`(totalClues / 16) * 1.4`) + Round 3 interlocking evidence count (`4+ R3 clues` = `+0.7 pts`).
   - **Tier Boundaries:**
     - **`easy` (`1.0 – 5.2 / 10`):** `1` Lone Killer (`0` assistants), `8–11` clues, `1` simple red herring, minimal timestamp math.
     - **`medium` (`5.3 – 7.9 / 10`):** `1` Lone Killer (`0` assistants/accomplices — capped at `<= 7.7 / 10`), `12–16` clues, `2` entangled red-herring subplots, and multi-timestamp alibi cross-referencing.
     - **`hard` (`8.0 – 10.0 / 10`):** Features **`1 Killer + 1+ Secret Assistant/Accomplice` (`plot_role === 'assistant'`)** (or `3+` red-herring subplots / `18+` clues).

4. **Pre-Launch 4-Pack Stress-Test & 7-Box Certification Mandate**
   - Before any Mystery Base Pack goes live, it must pass the **4-Pack Deep AI Critic & Multimodal Vision Stress-Test** (`/api/admin/mystery-qa-runner` & [`MysteryPreLaunchQaPanel.tsx`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/src/components/builder/MysteryPreLaunchQaPanel.tsx)) across `Test Pack #1 (3M/3F Real Friends)`, `Test Pack #2 (Diverse Traits, Glasses/Beards & Punctuation)`, `Test Pack #3 (Lookalike Suspects Visual Collision)`, and `Test Pack #4 (All-Female 6F Bachelorette Group)` with **0 token leaks**, **0 gender/pronoun conflicts**, **100% Round 3 killer solve rate**, and **synced AI-Calibrated Complexity & Spice tags**.
<!-- END:mystery-architecture-and-qa-rules -->

<!-- BEGIN:vercel-deploy-batching-rules -->
# 30-Minute Vercel Deployment Batching & Quota Protection Rules

1. **Batch Remote Pushes to Once Every 30 Minutes (`<= 48 deploys/day`):**
   - Always commit code locally (`git add ... && git commit -m "..."`) and verify on `http://localhost:3033`.
   - `.git/hooks/pre-push` enforces a **30-minute cooldown (1,800s)** between remote `git push origin main` calls so Vercel Hobby never hits the `100 deployments / 24h` (`api-deployments-free-per-day`) limit.
   - If `.git/hooks/pre-push` reports that the 30-minute cooldown is active, do **not** bypass it unless the user explicitly asks to deploy live immediately (`FORCE_PUSH=1 git push origin main`).
2. **Single Production Branch (`main` Only):**
   - Never push to `v1-mvp-launch` (`git push origin main:v1-mvp-launch` is blocked by `.git/hooks/pre-push` and disabled in [`vercel.json`](file:///Users/gabriellablyth/Desktop/Coding/back-pocket-mysteries/vercel.json)).
<!-- END:vercel-deploy-batching-rules -->


