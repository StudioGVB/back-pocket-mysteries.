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
