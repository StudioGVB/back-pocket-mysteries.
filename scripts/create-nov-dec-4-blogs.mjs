import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";
import fs from "fs";
import crypto from "crypto";

if (fs.existsSync(".env.local")) process.loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const shared = {
  author_name: "Alex Sterling",
  author_role: "Lead Story Architect",
  read_time: "12 min read",
  is_draft: false,
  cta_enabled: true,
  cta_type: "themes",
  no_index: false,
  no_follow: false,
  is_featured: false,
  ai_generated: true,
};

// ---------------------------------------------------------------------------
// 1. CORPORATE TEAM BUILDING MYSTERIES — Thu 19 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const corporateTeam = `Corporate offsites and end-of-year celebrations have a well-documented engagement problem. Standard trivia nights favour the loudest table, trust falls make introverts check their watches, and unstructured bar tabs rarely help cross-functional teams connect. According to [Gallup's State of the Global Workplace Report](https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx), teams with high social connectedness and peer trust see a **21% increase in profitability** and **41% lower absenteeism**, yet over **62% of employees** report that traditional corporate icebreakers feel forced or unproductive. In 2026, workplace experience leads and people-and-culture managers are turning to **structured interactive murder mysteries** as one of the highest-rated team building formats for groups of 8 to 24 people.

When every participant receives a tailored character brief, interlocking objectives, and multimedia forensic clues on their phone, the dynamics shift immediately. Junior analysts have an excuse to interrogate the VP of Sales, remote colleagues who have only ever met on Zoom share secret alibis, and quieter analytical thinkers shine during the evidence-review rounds.

This guide breaks down the psychology of roleplay-based team building, the budget comparison against traditional corporate events, how to match personality types to character archetypes, and a step-by-step run sheet for an unforgettable 90-minute or 2-hour session.

## Why Traditional Corporate Team Building Falls Flat

Most workplace social events fail for one of two reasons: they require **too much vulnerability too fast**, or they provide **zero conversational scaffolding**. Research published by the [MIT Human Dynamics Laboratory in Harvard Business Review](https://hbr.org/2012/04/the-new-science-of-building-great-teams) found that the single strongest predictor of a team's problem-solving performance is not individual IQ or seniority, but **equal conversational turn-taking and informal side-to-side communication across silos**.

| Event Format | Typical Cost per Head (AUD / USD) | Active Participation Rate | Cross-Silo Interaction | Primary Structural Weakness |
|---|---|---|---|---|
| Open bar & finger food | $85–$140 AUD ($55–$90 USD) | 40–50% (cliques form) | Low | People only talk to their immediate desk neighbours |
| Escape room venue hire | $55–$75 AUD ($38–$52 USD) | 60–70% | Medium | 1 or 2 dominant voices solve all puzzles while others watch |
| Facilitated improv workshop | $90–$160 AUD ($60–$110 USD) | 35–50% | Medium | High social anxiety for introverted or analytical staff |
| Corporate trivia night | $45–$80 AUD ($30–$55 USD) | 50–65% | Low (fixed tables) | Rewards general knowledge rather than cross-team collaboration |
| **Interactive Murder Mystery** | **$4–$35 AUD ($3–$25 USD)** | **95%+** | **Very High** | **Every guest holds unique clues required to solve the case** |

The secret of a well-architected mystery is **asymmetric information**. In game theory and organizational psychology, asymmetric information games—sometimes called "Hidden Profile Tasks" in [American Psychological Association (APA) group decision studies](https://www.apa.org/pubs/journals/psp)—require every participant to contribute unshared private information before the group can reach the correct conclusion. Because no single player holds all the facts, the team cannot unmask the killer unless every person speaks up, shares their timeline, and compares evidence.

## How Asymmetric Clues Level the Workplace Hierarchy

In a normal meeting, seniority dictates airtime. Studies by [SHRM (Society for Human Resource Management)](https://www.shrm.org/) note that in standard hybrid meetings, the top 20% most senior or vocal attendees account for nearly **70% of total speaking time**. In a murder mystery, the character packet dictates leverage rather than the org chart.

1. **Built-in conversation starters.** Instead of awkward small talk about Q4 targets, every player has three specific questions they must ask three specific people in Round 1. Even a brand-new graduate hire has a concrete reason to walk up to the Chief Financial Officer and say, *"I heard you were seen near the penthouse bar at 10:45 PM—what were you doing there?"*
2. **Psychological safety through a persona (The Alibi Shield).** Wearing a character name badge and speaking from a fictional backstory removes personal ego. Negotiating a blackmail subplot as a corrupt art dealer, a reality-TV producer, or a rival vineyard heir is fun, low-stakes, and energizing.
3. **Dual-track gameplay for extroverts and introverts.** Theatrical team members can lean into dramatic accusations and costume props, while methodical thinkers gravitate toward timeline verification, CCTV timestamps, and forensic contradictions.
4. **Adaptable gender and elastic group sizes.** Modern digital mystery kits on [Back Pocket Mysteries](https://backpocketmysteries.com/en/themes) let organisers toggle character genders and scale from 5 to 16+ suspects without breaking the underlying clue logic.

## The Cost Breakdown: External Agency Venue Hire vs In-Office Mystery Night

Running a hosted event in your boardroom, a private dining room, or a rented offsite Airbnb cuts per-head costs by **more than 80%** compared with external corporate entertainment agencies.

| Budget Line (12-Person Team) | External Corporate Event Agency | DIY Interactive Mystery Night (Back Pocket Mysteries) |
|---|---|---|
| Entertainment / game fee | $1,400–$2,200 (facilitator call-out fee) | $33–$49 total (complete digital + printable kit for up to 16 players) |
| Venue hire / minimum spend | $1,200 (private room minimum) | $0 (in-office boardroom, lounge, or existing offsite venue) |
| Catering & non-alcoholic/bar drinks | $960 ($80/head set menu) | $420 (artisan grazing platters, pizza, or shared banquet + drinks) |
| Audio-visual / printed props | $300 | $0 (guests use their own smartphones + home/office printer) |
| **Total Event Cost** | **$3,860–$4,660** | **$453–$469 (~$38 per employee all-in)** |

That saving allows team leads and office managers to run quarterly social events—or subscribe to an **Unlimited Monthly Pass**—instead of waiting for a once-a-year end-of-year budget.

## Step 1: Casting Your Colleagues Without HR Headaches

Good casting turns a good corporate social into a legendary one. Follow these four principles when assigning roles five to seven days before the event:

- **Cast extroverts in high-drama suspect roles.** Every mystery has two or three louder archetypes with public rivalries—such as *The Reality Star*, *The Showrunner*, or *The Celebrity Chef*. Give these to the team members who love holding court.
- **Give analytical thinkers evidence-heavy roles.** Investigators, forensic insiders, financial fixers, and characters with ledger or timeline secrets suit detail-oriented engineers, analysts, and finance staff.
- **Cross-pollinate departments intentionally.** Pair people from engineering, marketing, customer success, and operations in shared subplots so they have a structural reason to collaborate in Round 1.
- **Keep workplace boundaries clean and inclusive.** Choose themes centered on high-stakes heists, reality-TV wrap party drama, luxury galas, or snowed-in cabin thrillers, and use adaptable character gender settings so everyone is comfortable with their persona.

| Employee Personality Style | Ideal Mystery Archetype | How They Win the Room |
|---|---|---|
| **The Outgoing Storyteller** | The Prime Suspect / The Rival Star | Draws attention, creates hilarious public accusations, keeps energy high |
| **The Quiet Analyst** | The Accountant / The Insider Witness | Spots the 6-minute discrepancy between the CCTV still and the chat log |
| **The Diplomatic Connector** | The PR Fixer / The Confidant | Trades secrets across multiple small groups and brokers alliances |
| **The Competitive Strategist** | The Blackmailer / The Secret Accomplice | Accomplishes every secondary objective while deflecting suspicion |

## Step 2: Using Mobile Audio & Visual Clues to Boost Immersion

Paper-only scripts can feel like reading a compliance manual after a long workday. Combining printed character badges with **mobile digital evidence** keeps energy high from the opening briefing to the final accusation.

When the host advances the game from Round 1 to Round 2 using the live 6-digit Game PIN lobby, every player's phone unlocks:

- **CCTV security camera stills** showing suspects in the hallway near the time of the crime stamped with ` + "`CAM 04 // REC`" + ` metadata
- **Recovered chat logs and text threads** revealing secret alliances and deleted messages
- **Multi-speaker ElevenLabs voice notes and wiretaps** that players can play out loud to the room
- **Forensic lab and toxicology reports** that narrow down the poison or murder weapon

Because the evidence looks and sounds like real investigative artifacts—and is hydrated with your colleagues' actual first names—teams naturally huddle around tables comparing screenshots and timelines.

## Step 3: The 90-Minute Corporate Run Sheet

You do not need a four-hour evening to run a complete mystery. Here is the proven 90-minute format used for Friday afternoon team socials, quarterly offsites, and conference breakouts:

| Time | Phase | Facilitator / Host Action | Team Dynamic |
|---|---|---|---|
| **00:00–00:15** | Arrival & Character Check-In | Guests grab a drink, enter the 6-digit Game PIN to open their mobile dossier, and put on their badge | Instant laughter as colleagues see each other's character titles and props |
| **00:15–00:35** | Round 1: Mingling & Motives | Host unlocks Round 1; everyone circulates to complete 3 specific conversation prompts | Cross-departmental pairs form naturally across the room |
| **00:35–00:40** | The Crime Announcement | Host plays the emergency audio broadcast announcing the victim and locking down the room | Collective gasp and immediate transition into detective mode |
| **00:40–01:05** | Round 2: Forensic Investigation | Physical Polaroid clues and mobile CCTV/chat evidence unlock over grazing platters | Small groups compare timestamps, alibis, and recovered text messages |
| **01:05–01:20** | Round 3: Wiretap & Final Voting | Smoking-gun audio wiretap plays; each suspect gives a 30-second defence; votes submitted on phones | High-energy debate as analytical staff present the timeline proof |
| **01:20–01:30** | The Reveal & Superlative Awards | The killer confesses, and awards are presented for Best Detective, Master Manipulator, and Best Dressed | Group photo moment and weeks of inside jokes on Slack |

## How to Run Hybrid or Remote-First Team Mysteries

According to [Buffer's State of Remote Work Report](https://buffer.com/state-of-remote-work), **over 70% of distributed workers** say their biggest challenge during virtual socials is talking over one another on a single video grid. If your team is split across multiple cities or dialing in via Zoom or Microsoft Teams, you can run the exact same three-round mystery using two simple adaptations:

1. **Use the Mobile Playroom as the Dual-Screen Evidence Locker.** Players keep Zoom or Teams open on their laptop while using their smartphone (or a second browser tab) to view their secret character dossier, private objectives, and unlocked CCTV/audio clues.
2. **Rotate 6-Minute Breakout Rooms in Rounds 1 and 2.** Create 3 themed breakout rooms (for example, *The Penthouse Bar*, *The VIP Balcony*, and *The Producer's Office*) and allow participants to move between rooms to interrogate specific suspects before reconvening in the main room for the Round 3 audio wiretap and final vote.

## A Worked Example: A 14-Person Product & Engineering Offsite

Consider a 14-person software and product team meeting in Sydney for their quarterly planning week. Half the team works remotely across Melbourne, Brisbane, and Auckland, and three new hires joined that month.

Instead of booking a noisy pub table where only adjacent seats can talk, the team lead set up a custom mystery in their coworking event space:

- **5 days prior:** Automated invite links went out so each team member could view their character overview and optional dress-code accessories (sunglasses, faux fur, press badges, bow ties).
- **During the game:** The quietest backend engineer—who had barely spoken during the afternoon roadmap presentation—noticed a 7-minute discrepancy between the victim's recovered text message (` + "`23:05`" + `) and a suspect's CCTV corridor timestamp (` + "`23:12`" + `), cracking the killer's alibi wide open in front of the whole company.
- **Post-event feedback:** 100% of attendees rated the session 5/5 in the post-offsite pulse survey, and the team's Slack channel spent the next month referencing their character aliases.

## Common Mistakes to Avoid When Organising a Work Mystery

- **Sending 20-page PDF booklets the week before.** Busy employees will not read a novel before Friday drinks. Use concise one-page character cards and progressive round-by-round mobile prompts that take 90 seconds to skim.
- **Forcing the organiser to sit out as a non-playing referee.** In legacy downloadable kits, the person who buys the game has to read the solution during setup. Use Back Pocket Mysteries' **Spoiler-Free Host Mode** so the organiser can play alongside the team without knowing who the killer is.
- **Panicking over a last-minute sick day.** Always pick a system with elastic suspect roles so if someone calls in sick at 2:00 PM, you can toggle off their role in 30 seconds without breaking a single clue chain.
- **Skipping the awards ceremony.** Awarding three simple titles (*Sharpest Detective*, *Master Manipulator*, and *Best In-Character Commitment*) creates a shared memory and a great team photo.

## Frequently Asked Questions

**Can the team leader or office manager play without knowing who the killer is?**
Yes. Modern digital mystery platforms conceal the solution and round clues behind a progressive host controller, so the organiser can participate as a full suspect without seeing the final reveal until everyone votes.

**What if someone calls in sick on the day of the event?**
Core mandatory suspects anchor the murder plot, while expandable suspect roles can be toggled off or reassigned in seconds so a last-minute absence never breaks the mystery logic.

**Do employees have to act or put on theatrical accents?**
Not at all. Guests can play in the first person (*"I was in the VIP lounge at 9:15 PM"*) using their normal speaking voice, treating the session like a live-action strategy and deduction game.

## The Bottom Line

Corporate team building works best when it gives people a shared puzzle, a playful reason to talk to colleagues outside their immediate department, and clear roles that reward both outgoing performers and quiet problem-solvers. An interactive murder mystery delivers all three in 90 minutes at a fraction of the cost of traditional corporate venues.

### References & Further Reading

- Harvard Business Review – [The New Science of Building Great Teams (MIT Human Dynamics Lab)](https://hbr.org/2012/04/the-new-science-of-building-great-teams)
- Gallup – [State of the Global Workplace: Employee Engagement & Team Connection](https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx)
- American Psychological Association (APA) – [Information Sharing and Hidden Profiles in Group Decision-Making](https://www.apa.org/pubs/journals/psp)
- Safe Work Australia – [Positive Workplace Culture and Psychosocial Team Connection](https://www.safeworkaustralia.gov.au)
- Eventbrite – [Corporate Event & Team Social Trends Report](https://www.eventbrite.com/blog/)
`;

// ---------------------------------------------------------------------------
// 2. AUDIO & MULTIMEDIA CLUES — Mon 23 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const audioClues = `For decades, at-home murder mystery parties relied on a single medium: slips of paper. Guests read paragraphs from a stapled booklet, passed around printed clue cards, and tried to imagine a crime scene from dense blocks of exposition. In 2026, the biggest leap in dinner party immersion comes from **diegetic multimedia evidence**: overheard voice notes, wiretapped phone calls, grainy CCTV stills, and recovered text threads delivered straight to players' smartphones.

When a suspect taps play on their phone at the dinner table and the entire room hears a panicked voicemail mentioning **their actual friend's name**, the atmosphere in the room changes instantly. According to audio cognition research cited by [Edison Research's Infinite Dial Report](https://www.edisonresearch.com/the-infinite-dial/) and [Nielsen Norman Group's Multimedia UX Studies](https://www.nngroup.com/articles/), spoken dialogue and authentic visual artifacts increase information retention and emotional arousal by **over 65%** compared with plain text blocks in social environments. Paper games tell players a story; audio and visual artifacts make them feel like they are inside a live investigation.

This guide explores how multimedia clues work in a modern murder mystery party, why combining physical props with mobile audio creates the best social dynamic, and how to stage your clue reveals across three rounds.

## What Are Diegetic Clues (And Why Do They Work So Well)?

In film theory and interactive game design, *diegetic* elements are artifacts that exist inside the fictional world itself—things the characters themselves can see, touch, and hear. Instead of a third-person narrator card saying *"You learn that Victor argued with the victim at 10:30 PM,"* a diegetic clue hands the players the actual artifact recorded at 10:30 PM.

| Clue Archetype | Traditional 1990s Paper Version | Modern Diegetic Multimedia Version | Psychological Impact on the Room |
|---|---|---|---|
| **Overheard Argument** | A paragraph describing what a witness heard | A 35-second multi-speaker ElevenLabs audio recording with room reverb | Everyone stops talking and leans in to listen together |
| **Security Alibi** | Text stating who was in the corridor | High-angle grainy B&W CCTV still with ` + "`CAM 04 // 23:14:08`" + ` HUD | Players zoom in on outfits, background silhouettes, and timestamps |
| **Secret Affair / Bribe** | A summary of a rumour in a booklet | Dark-mode smartphone chat bubbles with a *"Deleted Message Recovered"* badge | Instant side-by-side screenshot comparisons across the table |
| **Forensic / Financial Proof** | Plain bullet points on an index card | Styled toxicology lab report, wire transfer receipt, or torn diary note | Tactile realism that feels like an authentic true-crime evidence box |

## Why Audio Clues Create Unforgettable Party Moments

Sound bypasses late-night reading fatigue. By Round 2 of a dinner party, room lighting is dim, drinks are flowing, and guests do not want to squint at 400-word paragraphs of 10-point font.

1. **Shared collective attention.** When one player unlocks an audio wiretap and plays it aloud, all 8 to 16 guests experience the twist at the exact same second. It creates a natural theatrical beat without anyone needing to deliver a memorized monologue.
2. **Vocal tone carries subtext.** Hesitation, a stammered alibi, background clinking glasses, or a whispered threat in a two-person dialogue recording gives players behavioural cues they can debate across the table.
3. **Personalized guest name hydration.** When the audio script is dynamically hydrated with the real guests' names assigned to each character archetype, hearing *"Keep your voice down, Marcus is standing right outside the penthouse door!"* produces an immediate eruption of laughter and accusations.
4. **Zero-squint accessibility in low-light rooms.** Candlelit dining rooms and neon noir party setups look atmospheric, but they make paper booklets difficult to read. Playable mobile audio clips and high-contrast backlit chat screens work effortlessly in dim rooms.

## The 4 Core Multimedia Evidence Templates Explained

To keep a mystery visually cohesive and easy to scan in the heat of an argument, every piece of evidence should fall into one of four distinct visual and audio templates:

| Template Category | Visual / Audio Signature | Best Used In Which Round? | What Players Look or Listen For |
|---|---|---|---|
| **1. Audio Wiretaps & Voicemails** | Close-up of a voice recorder or waveform player + 25–45s multi-speaker voice clip & collapsible transcript | Round 2 or Round 3 (Smoking Gun) | Background sounds, exact spoken timestamps, slipped names, vocal panic |
| **2. CCTV / Security Camera Stills** | High-angle grainy security footage stamped with camera ID and timestamp | Round 2 (Alibi Breaker) | Who is standing with whom, corridor location, time discrepancy vs Round 1 claims |
| **3. Recovered Screen & Chat Logs** | Dark-mode smartphone message bubbles with sender avatars, timestamps & recovered badges | Round 1 & Round 2 | Blackmail demands, secret meetings, financial motives, deleted threats |
| **4. Physical & Forensic Artifacts** | High-contrast noir close-up of physical evidence (poison vial, altered will, bar tab, backstage pass) | All 3 Rounds | Murder weapon match, handwriting, dosage timing, physical access |

## The Hybrid Sweet Spot: Physical Polaroids + Mobile Playroom

One common concern hosts have about digital-assisted games is that guests will sit silently staring at their phones all night. Research into hybrid tabletop gaming from the [Digital Games Research Association (DiGRA)](http://www.digra.org/) shows that the highest social engagement occurs when **digital devices act strictly as periodic "evidence drops"** while physical tokens anchor eye contact in the room.

| Game Element | Recommended Medium | Why This Balance Works |
|---|---|---|
| Character name badge & core persona | Printed badge or table place card | Keeps everyone's character identity visible across the room at a glance |
| Round-by-round conversation prompts | Mobile Playroom (` + "`PlayroomClient`" + `) or pocket card | Short 2-sentence objectives that immediately send players off to interrogate others |
| Crime scene physical evidence | Printed Polaroid clue cards hidden around the room | Gives guests a physical reason to inspect the bar cart, mantelpiece, or hallway |
| Wiretaps, voicemails, CCTV & chat logs | Mobile Playroom via 6-digit Game PIN | Plays real synthesized audio and renders crisp zoomable chat/CCTV artifacts on tap |

By limiting digital unlocks to **3 or 4 high-impact multimedia artifacts per round**, smartphones act like a detective's encrypted case tablet rather than a screen distraction.

## How to Stage Multimedia Clues Across Three Rounds

Pacing is everything in a whodunit. If you drop all your best audio and CCTV evidence in the first 15 minutes, the final hour loses momentum. Follow this three-act escalation structure:

### Round 1: Establish Motives & Relationships (Pre-Murder or Early Discovery)
- **Primary Formats:** Recovered text message threads (` + "`isScreenClue`" + `) and financial receipts.
- **Narrative Goal:** Expose who owes money, who is being blackmailed, and who had a secret grudge against the victim. Every suspect at the party should look guilty of *something* embarrassing or illicit, even if it is not murder.

### Round 2: Break the Alibis (Forensic & CCTV Investigation)
- **Primary Formats:** Grainy security camera footage (` + "`isCctvOrVideoClue`" + `) and physical crime scene objects.
- **Narrative Goal:** Contradict what suspects claimed in Round 1. If a suspect swore they never left the dining room after 10:00 PM, a ` + "`CAM 02 // 22:18`" + ` corridor still showing them near the locked study forces them to explain what they were really doing.

### Round 3: The Smoking Gun Wiretap (Final Twist Before Voting)
- **Primary Formats:** Multi-speaker audio recording (` + "`isAudioClue`" + `) paired with a final toxicology or forensic report.
- **Narrative Goal:** Deliver the decisive timeline or method clue that clears the loudest red herrings and lets observant detectives connect the killer's motive, means, and opportunity right before the final vote.

## A Worked Example: Staging the Round 3 Audio Reveal

Imagine hosting a 10-player Reality TV Reunion mystery ([*Love On The Rocks*](https://backpocketmysteries.com/en/themes/love-on-the-rocks)). Throughout Rounds 1 and 2, three different suspects have strong motives to poison the victim's champagne flute:

1. **The Bitter Ex** (hiding a leaked NDA and a secret text thread from 22:40)
2. **The Shady Producer** (facing a $2M contract dispute)
3. **The Rival Co-Star** (caught on a grainy CCTV still near the penthouse bar at 23:05)

At the start of Round 3, the host taps **Advance to Round 3** on their phone. A recovered backstage voice recorder clip unlocks in everyone's Playroom. When played over a Bluetooth speaker or phone, guests hear two voices arguing over the sound of clinking glasses—revealing that the Rival Co-Star was actually meeting the Producer to hand over a prop contract at 23:05, while a third suspect switched the champagne flute at **23:12** right before the toast.

Within thirty seconds, the entire dinner table is cross-referencing the 23:12 audio timestamp against the Round 1 chat logs to unmask the true killer.

## Practical Tips for Hosts Using Audio & Visual Clues

- **Keep audio clips between 20 and 45 seconds.** Short, punchy dialogue with clear character names, sound effects, and timestamps works best in a lively party room.
- **Always pair audio with a collapsible written transcript.** In a bustling room, players love listening to the voice note first for the dramatic vocal performance and then expanding the transcript to double-check exact times or dollar figures during final deliberations.
- **Use a small Bluetooth speaker for the opening & closing broadcasts.** Playing the initial crime announcement over a room speaker sets the theatrical tone, while individual round wiretaps can be played directly on guests' phones in small huddles.
- **Keep a printable backup ready.** On [Back Pocket Mysteries](https://backpocketmysteries.com/en/custom-murder-mystery), every multimedia clue—including chat threads, CCTV stills, and audio transcripts—can also be printed as physical Polaroid and dossier cards with a single click.

## Frequently Asked Questions

**Do guests need to download an app from the App Store or create accounts?**
No. Guests simply scan a QR code or enter a 6-digit Game PIN at ` + "`backpocketmysteries.com/join`" + ` to open the mobile web Playroom in their browser—no app downloads or passwords required.

**What if a host wants to run a 100% unplugged, phone-free party?**
Every multimedia clue—including dark-mode chat logs, CCTV stills, and full audio transcripts—automatically compiles into printable Polaroid evidence cards and dossier sheets in the Print Studio.

**How do personalized character names and photos work on CCTV and audio clues?**
When you enter your guests' real first names (and optional selfies) in the party setup wizard, the hydration engine weaves their names directly into the spoken ElevenLabs audio scripts, chat logs, and character dossiers while incorporating their likeness and costume style into the noir evidence visuals.

## The Bottom Line

Multimedia clues transform a murder mystery from a reading exercise into a cinematic investigation. By pairing dark-mode chat logs, authentic CCTV frames, and multi-speaker voice wiretaps with classic face-to-face interrogation, you give your guests an interactive night they will talk about for months.

### References & Further Reading

- Nielsen Norman Group – [Multimedia, Audio, and Visual Hierarchy in Interactive Storytelling](https://www.nngroup.com/articles/)
- Edison Research – [The Infinite Dial: Spoken Word Audio Engagement & Retention](https://www.edisonresearch.com/the-infinite-dial/)
- Digital Games Research Association (DiGRA) – [Hybrid Digital-Physical Tabletop Game Design](http://www.digra.org/)
- Wired – [The Rise of Immersive Audio Games and Tabletop Companions](https://www.wired.com)
`;

// ---------------------------------------------------------------------------
// 3. SMALL GROUP & DINNER PARTY MYSTERIES (6-8 PLAYERS) — Thu 26 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const smallGroup = `One of the most common myths about hosting a murder mystery party is that you need a sprawling mansion and twenty theatrical friends to pull it off. In reality, some of the sharpest, funniest, and most suspenseful mystery nights happen around a single dining table with **6 to 8 players**.

Large 20-person parties are high-energy standing events, but a 6-to-8-person dinner party is closer to *Knives Out*, *Glass Onion*, or Agatha Christie's *And Then There Were None*: intimate, conversational, and impossible to hide in. According to consumer entertaining data cited by [Eventbrite's Social Gathering Trends](https://www.eventbrite.com/blog/) and [OpenTable's Dining & At-Home Entertaining Insights](https://www.opentable.com/blog/), micro-gatherings of **6 to 8 guests** have become the #1 fastest-growing dinner party format in 2026—up **38% year-over-year**—because hosts want deeper conversation without the logistical stress and cost of catering for twenty people.

In a 6-to-8-player mystery, everyone hears every accusation, every alibi is tested in front of the whole table, and the host can serve a proper three-course meal while playing along as a suspect. This guide covers why small-group mysteries work so well, how to structure a seated dinner mystery, what to do if a guest cancels at the last minute, and a complete hosting checklist for 6 to 8 players.

## Small Dinner Party (6–8) vs Large Cocktail Party (12–20): How the Gameplay Differs

Understanding the structural difference between a seated dinner game and a standing cocktail mystery helps you pick the right format for your home or apartment.

| Feature | Seated Dinner Mystery (6–8 Players) | Standing Cocktail Mystery (12–20 Players) |
|---|---|---|
| **Primary Social Dynamic** | Whole-table interrogation, cross-talk & shared banter | 1-on-1 corner whispers & rotating 3-person cliques |
| **Ideal Food Format** | Seated 3-course dinner or shared family-style banquet | Grazing boards, canapés & standing finger food |
| **Round Duration** | 25–30 minutes per course | 35–45 minutes of free-roaming mingling |
| **Clue Delivery** | Passed around the table or unlocked on phones between courses | Hidden around multiple rooms + mobile unlocks |
| **Space Required** | Single dining table (works in a 1-bedroom apartment) | Large living room, patio, or multi-room house |
| **Host Workload** | Very Low (everyone stays seated at one table) | Medium (corralling 18 people for round announcements) |

In a 6-to-8-player game, nobody ever feels left out of a subplot because the entire table shares a single stage. When someone drops a bombshell accusation, all seven other pairs of eyes turn to the accused suspect at once.

## The Sociology of the Single-Table Whodunit: Why 6 to 8 Is the Sweet Spot

Sociologist Robin Dunbar's research on conversational group sizes—often cited in [ Harvard Business Review](https://hbr.org/) and [Scientific American](https://www.scientificamerican.com/)—demonstrates that a spontaneous conversation splits into two separate sub-conversations the moment a group exceeds **7 or 8 people**. That threshold has a profound effect on murder mystery design:

1. **Zero missed plot twists.** In a 6-to-8-person game, every player can stay in a single unified conversation during key reveals, while still leaning across the table for quick two-person side bargains while plates are cleared.
2. **Higher accountability for alibis.** In a 16-person room, a guilty killer can dodge a tough question by excusing themselves to refresh their drink across the room. Around a 6-person dinner table, there is nowhere to run—forcing hilarious improvisations and dramatic counter-accusations.
3. **Every character is a major character.** With 6 to 8 suspects, there are zero background roles. Every single guest at the table holds a direct conflict with the victim, a dark secret, and a vital piece of forensic evidence.

## How to Align Your 3 Mystery Rounds With a 3-Course Dinner

The easiest way to pace a small-group mystery is to tie each round of the investigation to a course of your meal. That keeps the kitchen schedule predictable and gives guests natural rhythms to eat, sip, and interrogate in character.

| Course & Timing | Mystery Phase | What Happens at the Table | Kitchen / Host Tip |
|---|---|---|---|
| **Pre-Dinner Drinks (20 mins)** | Arrival & Character Introductions | Guests arrive in costume, scan the Game PIN, and introduce their public connection to the victim | Serve a pre-batched welcome cocktail or mocktail on a tray |
| **Entrée / Starter (30 mins)** | Round 1: Motives, Rumours & Grudges | Each player shares their Round 1 gossip prompts across the table; secret alliances and rivalries surface | Choose a cold or plated no-cook starter (burrata, charcuterie, bruschetta) |
| **Main Course Transition (5 mins)** | The Crime Broadcast | Play the breaking-news audio alert announcing the murder; the table goes into lockdown | Trigger Round 2 on your phone right before bringing out the main platters |
| **Main Course (40 mins)** | Round 2: CCTV, Chats & Cross-Examination | Players inspect unlocked CCTV stills and recovered texts on their phones while debating over mains | Serve family-style shared dishes or a slow-braised one-pot main |
| **Dessert & Digestifs (25 mins)** | Round 3: Smoking Gun Wiretap, Voting & Reveal | Final audio wiretap plays aloud; each suspect gives a 60-second defence; votes are cast and the killer confesses | Serve make-ahead dessert platters or espresso martinis during final speeches |

## How Flexible Player Counts Handle Last-Minute Dropouts

When you are hosting 18 people, losing one guest on the afternoon of the party barely registers. When you are hosting 7 people and a friend gets stuck with a flight delay or a babysitter emergency, a rigid 1990s box-set game can collapse if the missing guest was assigned the killer role or held a mandatory clue.

Here is how modern digital mystery architecture on [Back Pocket Mysteries](https://backpocketmysteries.com/en/pricing) bulletproofing a small-group dinner against last-minute changes:

| Last-Minute Scenario | Traditional Boxed / PDF Kit Failure | Back Pocket Mysteries Solution |
|---|---|---|
| **1 guest cancels 2 hours before dinner** | Their printed booklet holds a mandatory clue nobody else knows | Toggle off the absent character so their essential clues redistribute automatically |
| **A guest brings a partner last minute** | Fixed 6-player script has no extra role | Activate an expandable suspect role in 60 seconds and share the 6-digit Game PIN |
| **Gender ratio shifts** | Stuck with rigid male/female character scripts | Toggle adaptable character genders (` + "`M / F / Adaptable`" + `) with one click so names and avatars match |
| **Host wants to play too** | Host saw the killer reveal while printing the PDFs | **Spoiler-Free Host Mode** hides the killer and round evidence behind progressive host unlocks |

## Setting the Table for Maximum Noir Atmosphere (On a $50 Budget)

Because all the action happens around a single dining table, small sensory details have an outsized impact:

- **Switch off overhead ceiling lights in favour of warm table lamps and candles.** Overhead downlights flatten the mood. Placing warm lamps on sideboards and clustering LED or tapered candles down the centre of the table instantly creates a cinematic *Knives Out* atmosphere.
- **Place sealed "CONFIDENTIAL DOSSIER" envelopes on each napkin.** Even when guests use their phones for audio wiretaps and CCTV stills, handing everyone a physical name badge and a sealed crime-scene envelope at their place setting makes sitting down feel special.
- **Curate a low-volume background soundtrack at 25% volume.** Instrumental jazz, dark academia strings, or vintage lounge tracks fill any brief pauses while guests read new clues without forcing anyone to shout across the table.
- **Keep a central "Evidence Tray" in the middle of the table.** As physical Polaroid clues or forensic reports are unlocked in Rounds 2 and 3, placing them on a central tray lets guests pass them left and right between bites.

## A Worked Example: A 6-Player Birthday Dinner in a 1-Bedroom Apartment

You do not need a large house or a separate dining room to host. Consider a 6-player 30th birthday dinner hosted in a compact inner-city apartment using the **Basic Tier ($19 USD / $29 AUD for 5–6 suspects)**:

- **Space used:** Just a 6-seater dining table and the living room sofa for arrival drinks (~$4.80 AUD / ~$3.15 USD per guest for the game).
- **Prep time:** 20 minutes to dim the lights, light candles, and place six printed character cards on the napkins.
- **Gameplay highlight:** Because all six players could hear every single question, when two suspects tried to coordinate a fake alibi via subtle eye contact across the pasta bowl, the other four friends caught them immediately—sparking ten minutes of non-stop laughter and a unanimous (and correct!) final vote.

## Frequently Asked Questions

**What is the minimum number of players for a full roleplay murder mystery?**
Five to six suspects is the sweet spot for an intimate dinner party whodunit where the killer is sitting at the table. On Back Pocket Mysteries, every kit includes a core 5–6 suspect web where backstories interlock tightly, and can also be played by 1–4 players in Detective Case-File Mode.

**Should the host play as a suspect in a 6-to-8-person game?**
Absolutely. In a small group, having the host sit at the table as a full suspect keeps the circle intimate and adds an extra suspect to interrogate. Using the Spoiler-Free Host Mode controller lets the host unlock Rounds 1, 2, and 3 on their phone without ever seeing who the killer is ahead of time.

**How long does a 6–8 player game take from start to finish?**
Typically **2 to 2.5 hours** when paced alongside a three-course dinner, or **90 minutes** if played after dinner over dessert, wine, and mocktails.

## The Bottom Line

A 6-to-8-person dinner party is the easiest, highest-impact way to host a murder mystery. With everyone gathered around one candlelit table, zero crowd-herding stress, and personalized audio and CCTV clues delivered between courses, you can turn an ordinary Saturday dinner into the most talked-about night of the year.

### References & Further Reading

- Bon Appétit – [How to Host a Stress-Free Dinner Party at Home](https://www.bonappetit.com)
- Architectural Digest – [Dining Room Lighting Ideas for Atmospheric Entertaining](https://www.architecturaldigest.com)
- OpenTable – [Dining & Small-Group Social Entertaining Trends](https://www.opentable.com/blog/)
- Scientific American – [Dunbar's Number and Why Conversations Split Above Seven People](https://www.scientificamerican.com/)
`;

// ---------------------------------------------------------------------------
// 4. HOLIDAY & NEW YEAR'S EVE MYSTERY PARTIES — Mon 30 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const holidayParty = `Between late November and New Year's Eve, calendars fill up with festive catch-ups, Friendsmas dinners, and countdown parties that all start to blur together. By mid-December, guests have had the exact same conversations over mulled wine and grazing boards three weekends in a row. Hosting a **Holiday or New Year's Eve Murder Mystery Party** breaks that pattern immediately—giving your friend group or family a reason to dress up, put down their doomscrolling, and spend the night entangled in alibis, leaked group chats, and dramatic midnight reveals.

New Year's Eve in particular suffers from a notorious **"10:30 PM slump"**—that two-hour window after dinner finishes where energy dips, people check the clock, and everyone waits around for the midnight countdown. A three-round murder mystery solves the pacing of the night completely, building suspense right up to an 11:45 PM killer confession and a midnight champagne toast.

This guide covers why December is peak mystery season, how to time a New Year's Eve or Friendsmas run sheet to the minute, the best themes for festive crowds, how to include mixed age groups, and a stress-free 7-day prep timeline.

## Why December & New Year's Eve Are Peak Murder Mystery Season

Search interest and at-home party game bookings spike by **more than 250% between late November and January 1st** each year, according to trend reports from [Pinterest Predicts](https://business.pinterest.com/pinterest-predicts/) and [Eventbrite's Holiday Entertaining Survey](https://www.eventbrite.com/blog/). Three structural factors drive the surge:

1. **Everyone is already looking for an excuse to dress up.** Sequins, velvet blazers, black tie, ugly Christmas sweaters, and vintage glamour fit both festive parties and murder mystery themes naturally.
2. **Mixed friend groups and extended families need a social bridge.** Holiday parties often combine childhood friends, work colleagues, new partners, and in-laws who barely know one another. Character dossiers give everyone an instant identity and three specific people to talk to in the first ten minutes.
3. **Staying in beats surge-priced NYE venues.** Between $150 cover charges, 3x rideshare surge pricing, and thirty-minute queues at crowded bars, hosting 8 to 16 friends at home with great food and an interactive game costs a fraction of a night out and creates far better memories.

| NYE / Holiday Option (10 Friends) | Typical Cost per Person (AUD / USD) | Group Energy at 11:00 PM | Inclusivity (Drinkers & Non-Drinkers) | Memorable Factor |
|---|---|---|---|---|
| Ticketed bar / club night | $140–$240 ($95–$160 USD) + rideshare | Queuing for drinks in a loud room | Low (centred strictly on alcohol) | Low |
| Restaurant set-menu booking | $130–$190 ($85–$130 USD) | Being ushered out for the next seating | Medium | Medium |
| Unstructured house party | $40–$60 ($25–$40 USD) | The 10:30 PM sofa slump sets in | Medium | Medium |
| **Hosted NYE Murder Mystery** | **$35–$55 ($25–$35 USD food + $2.50 game)** | **Peak Round 3 accusations & voting** | **Very High (activity-driven)** | **Unforgettable** |

## The Perfect New Year's Eve Countdown Run Sheet (8:00 PM to Midnight)

If you are hosting on December 31st, timing the final reveal to finish 15 minutes before midnight creates an incredible crescendo for the evening. Here is the battle-tested countdown schedule:

| Time | Stage | Host Action | What Guests Are Doing |
|---|---|---|---|
| **8:00 PM** | Doors Open & Red Carpet Mugshots | Snap phone or Polaroid mugshots of guests arriving in costume; hand out welcome drinks | Scanning the 6-digit Game PIN and reading their character's public bio |
| **8:45 PM** | Round 1: Pre-Murder Mingling | Unlock Round 1 in the mobile Playroom | Circulating with canapés to complete Round 1 gossip prompts and establish alibis |
| **9:30 PM** | Main Dinner & The Crime Broadcast | Play the breaking-news audio broadcast announcing the murder; bring out main food platters | Reacting to the murder twist and discovering how their character is implicated |
| **10:15 PM** | Round 2: CCTV & Forensic Evidence | Unlock Round 2 evidence (grainy CCTV stills, recovered text logs, toxicology reports) | Cross-examining suspects across the room and catching timeline contradictions |
| **11:00 PM** | Round 3: Smoking Gun Wiretap | Play the multi-speaker audio wiretap over the speaker; open final 60-second suspect defences | Huddling over phones and printed Polaroid clues to lock in final theories |
| **11:30 PM** | Official Voting & Killer Confession | Lock mobile voting; crown Best Detective & Best Actor; read the killer's dramatic confession | Cheering, gasping, and taking group photos with award certificates |
| **11:50 PM** | Midnight Champagne & Countdown | Switch the TV or speaker to the live midnight fireworks broadcast and pour the toast | Ringing in the New Year at peak energy with zero 10:30 PM slump |

*(Hosting a daytime or early-evening Friendsmas dinner instead? Simply shift the exact same 3.5-hour timeline to start at 6:30 PM for a 10:00 PM finish!)*

## Choosing the Right Theme for Your Holiday or NYE Crowd

Not every December gathering has the same energy. Match your mystery theme to your guest list:

| Party Vibe & Guest List | Recommended Theme Style | Dress Code Inspiration | Signature Drink Pairing |
|---|---|---|---|
| **Glamorous NYE Countdown (20s–40s)** | [*Love On The Rocks*](https://backpocketmysteries.com/en/themes/love-on-the-rocks) (Reality TV Penthouse Reunion) | Cocktail dresses, silk shirts, gold jewellery, press badges | The "Poisoned" Hibiscus Champagne Royale |
| **Cozy Friendsmas & December Dinner** | [*A Christmas Nightmare*](https://backpocketmysteries.com/en/themes/a-christmas-nightmare) (Snowed-In Festive Cabin Thriller) | Apres-ski chic, cable-knit sweaters, faux fur, festive velvet | Spiced Cranberry & Rosemary Gin/Zero-Proof Spritz |
| **Custom Inside-Joke Friend Group** | [Custom AI Murder Mystery Builder](https://backpocketmysteries.com/en/custom-murder-mystery) (Any setting you invent) | Tailored to your group's favourite trip, workplace, or era | Custom named after your group's favourite bar |

## How to Personalize the Night With Real Names, Inside Jokes & Photos

The difference between a generic $30 PDF kit and a custom mystery on **Back Pocket Mysteries** is how personal the evidence feels when guests open it:

1. **Hydrate the story with your guests' real first names.** Instead of forcing friends to memorize clunky fictional names all night, our builder weaves your actual guests' names directly into the character dossiers, leaked text message threads, and spoken ElevenLabs audio wiretaps.
2. **Weave 2 or 3 real friend-group jokes from the past year into the prompts.** Mentioning a guest's real-life obsession with Pilates, their infamous holiday travel delay, or their signature drink inside a character's alibi always gets the biggest laugh of the night.
3. **Use Spoiler-Free Host Mode so you never sit on the sidelines.** You already did the work of hosting and preparing the food—you deserve to play too. Our progressive mobile controller hides the killer and upcoming clues so the host plays as a full suspect.
4. **Hand out end-of-night superlative awards before midnight.** Awarding *"Sharpest Detective of 2026"*, *"Most Ruthless Alibi"*, and *"Best Red Carpet Costume"* gives everyone a photo moment before the fireworks start.

## A 7-Day Stress-Free Holiday Host Checklist

December is busy enough without spending four hours cutting out paper slips. Follow this 60-minute total prep plan:

| Day | Host Task | Time Required |
|---|---|---|
| **7 Days Out** | Pick your theme pack (or custom theme), enter guest names, and send digital character invites | 15 minutes |
| **4 Days Out** | Review generated CCTV/chat/audio clues in your dashboard and print optional character badges | 10 minutes |
| **2 Days Out** | Shop for make-ahead grazing platters, oven-ready finger food, and a batch cocktail + mocktail | 40 minutes |
| **Party Afternoon** | Dim overhead lights, set out candles, test your Bluetooth speaker, and display the 6-digit Game PIN | 15 minutes |

## Frequently Asked Questions

**What if guests arrive 30 minutes late because of New Year's Eve or holiday traffic?**
Keep the first 45 minutes (8:00 PM to 8:45 PM) as an arrival, welcome drink, and mugshot check-in window. Only tap **Start Round 1** on your host phone once your guests have arrived and settled in.

**What if someone cancels on December 31st or brings an unexpected plus-one?**
Unlike fixed boxed games where one absence ruins the script, Back Pocket Mysteries separates core mandatory roles from expandable suspect roles. You can toggle an extra character on or off in under 60 seconds so your clue chain stays 100% intact.

**Can we play with a mix of couples and solo friends?**
Yes! Casting real-life couples as dramatic rivals—or giving them completely separate alliances with other guests across the room—is one of the fastest ways to get everyone mingling.

**Do I need a working colour printer on December 30th?**
No. Because every guest can access their full character sheet, round objectives, CCTV photos, recovered group chats, and playable audio wiretaps on their smartphone via the 6-digit Game PIN, you can run the entire party 100% paper-free if your printer runs out of ink.

## The Bottom Line

Instead of another forgettable holiday drinks night or a New Year's Eve spent watching the clock between 10:00 PM and midnight, an interactive murder mystery turns your December gathering into the highlight of the social calendar. With 30 minutes of setup, personalized audio and CCTV clues, and a timed 11:45 PM reveal, you will ring in the new year at peak energy.

### References & Further Reading

- Vogue – [How to Host an Unforgettable New Year's Eve Party at Home](https://www.vogue.com)
- Pinterest Predicts – [Trending Party, Hosting, and Experiential Entertaining Themes](https://business.pinterest.com/pinterest-predicts/)
- Eventbrite – [Holiday & New Year's Eve Social Gathering Trends Report](https://www.eventbrite.com/blog/)
- Bon Appétit – [Make-Ahead New Year's Eve Finger Foods and Batch Cocktails](https://www.bonappetit.com)
`;

const posts = [
  {
    ...shared,
    title: "Corporate Team Building Murder Mysteries: How to Host an Unforgettable Work Social",
    slug: "corporate-team-building-murder-mystery-party-guide",
    subtitle: "Why asymmetric clues and roleplay beat awkward trust falls and noisy bar tabs.",
    excerpt: "Discover why interactive murder mysteries achieve 95%+ participation for teams of 8 to 24, with a complete 90-minute corporate run sheet and budget breakdown.",
    category: "Hosting Tips",
    publish_date: "2026-11-19T09:00:00Z", // Thu 19 Nov
    featured_image_url: "/blog/corporate-roi.png",
    meta_title: "Corporate Team Building Murder Mystery Guide | Back Pocket Mysteries",
    seo_description: "Plan a high-engagement corporate team building murder mystery for 8–24 staff. Includes cost comparisons, casting tips for introverts & extroverts, and a 90-minute run sheet.",
    focus_keyword: "corporate team building murder mystery",
    secondary_keywords: ["work party murder mystery", "team building ideas 10-20 people", "interactive office party games", "hybrid remote team social"],
    og_title: "Corporate Team Building Murder Mysteries: The Complete Organiser's Guide",
    og_description: "How asymmetric clues, mobile evidence, and roleplay turn awkward work socials into 5-star team events.",
    twitter_title: "Ditch the Awkward Trust Falls: Host an Office Murder Mystery",
    twitter_description: "95%+ participation, under $45/head, and a 90-minute run sheet that works for both introverts and extroverts.",
    tags: ["corporate events", "team building", "hosting tips", "work party", "group games"],
    md: corporateTeam,
  },
  {
    ...shared,
    title: "Audio Wiretaps, CCTV Stills & Chat Logs: How Multimedia Clues Transform Murder Mystery Parties",
    slug: "multimedia-audio-cctv-clues-murder-mystery-party",
    subtitle: "Move beyond slips of paper with diegetic voice notes, security cam frames, and recovered texts.",
    excerpt: "Learn how multi-speaker audio clues, grainy CCTV stills, and dark-mode chat logs turn a dining room into a live forensic investigation.",
    category: "Behind the Mystery",
    publish_date: "2026-11-23T09:00:00Z", // Mon 23 Nov
    featured_image_url: "/blog/interactive-clues-wiretaps.png",
    meta_title: "Audio & Multimedia Murder Mystery Clues | Back Pocket Mysteries",
    seo_description: "Discover how diegetic audio wiretaps, CCTV stills, and smartphone chat logs elevate at-home murder mystery parties without gluing guests to their screens.",
    focus_keyword: "murder mystery audio clues",
    secondary_keywords: ["interactive murder mystery app", "CCTV murder mystery clues", "printable and mobile mystery game", "diegetic party clues"],
    og_title: "How Audio Wiretaps & CCTV Clues Transform At-Home Murder Mysteries",
    og_description: "Why hearing your friend's name in a wiretapped voice note is the ultimate dinner party twist.",
    twitter_title: "Paper Slips vs Real Audio Wiretaps & CCTV Stills",
    twitter_description: "How to combine physical Polaroid props with mobile multimedia evidence across 3 rounds.",
    tags: ["audio clues", "CCTV evidence", "mobile playroom", "game design", "immersion"],
    md: audioClues,
  },
  {
    ...shared,
    title: "How to Host a Small Group Murder Mystery Dinner Party for 6 to 8 Players",
    slug: "small-group-murder-mystery-dinner-party-6-to-8-players",
    subtitle: "Intimate Knives Out energy around a single dining table.",
    excerpt: "You don't need 20 people or a mansion. Learn how to align a 3-round murder mystery with a 3-course dinner for 6 to 8 friends.",
    category: "Guides",
    publish_date: "2026-11-26T09:00:00Z", // Thu 26 Nov
    featured_image_url: "/blog/birthday-dinner.png",
    meta_title: "6–8 Player Murder Mystery Dinner Party Guide | Back Pocket Mysteries",
    seo_description: "Host an intimate 6 to 8 player murder mystery dinner party at home. Learn how to pair 3 clue rounds with a 3-course meal and handle last-minute guest changes.",
    focus_keyword: "murder mystery party 6 to 8 players",
    secondary_keywords: ["small group murder mystery game", "dinner party mystery 6 players", "seated murder mystery dinner", "apartment party ideas"],
    og_title: "How to Host a 6–8 Player Murder Mystery Dinner Party",
    og_description: "Pair 3 rounds of clues with a 3-course meal for an unforgettable intimate dinner party.",
    twitter_title: "Hosting 6–8 Friends? Turn Dinner Into a Knives Out Mystery",
    twitter_description: "The complete guide to small-group seated murder mystery dinners.",
    tags: ["small group", "6-8 players", "dinner party", "hosting guide", "apartments"],
    md: smallGroup,
  },
  {
    ...shared,
    title: "How to Host a Holiday or New Year's Eve Murder Mystery Party That Beats the Midnight Slump",
    slug: "holiday-new-years-eve-murder-mystery-party-guide",
    subtitle: "The ultimate Friendsmas and December 31st countdown run sheet.",
    excerpt: "Beat the 10:30 PM New Year's Eve slump with a timed countdown murder mystery that unmasks the killer 15 minutes before midnight.",
    category: "Party Themes",
    publish_date: "2026-11-30T09:00:00Z", // Mon 30 Nov
    featured_image_url: "/blog/costume-guide.png",
    meta_title: "New Year's Eve & Holiday Murder Mystery Party Guide | Back Pocket Mysteries",
    seo_description: "Plan an unforgettable New Year's Eve or Friendsmas murder mystery party. Includes the 8 PM to midnight countdown run sheet, theme pairings, and 7-day checklist.",
    focus_keyword: "New Years Eve murder mystery party",
    secondary_keywords: ["holiday murder mystery party", "Friendsmas party games", "NYE house party ideas", "countdown mystery game"],
    og_title: "How to Host a New Year's Eve or Holiday Murder Mystery Party",
    og_description: "Our minute-by-minute NYE run sheet times the killer's confession for 11:45 PM, right before the midnight toast.",
    twitter_title: "Beat the 10:30 PM NYE Slump With a Countdown Murder Mystery",
    twitter_description: "How to time a 3-round mystery so the killer is unmasked right before midnight.",
    tags: ["New Years Eve", "holiday party", "Friendsmas", "party themes", "hosting checklist"],
    md: holidayParty,
  },
];

async function ensureGeneratedBlogImage(slug, title, fallbackImage) {
  const dir = "public/blog-images";
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const targetPath = `${dir}/${slug}.png`;
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).size > 10000) {
    return `/blog-images/${slug}.png`;
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    try {
      console.log(`🎨 generating new AI cover image for ${slug}...`);
      const prompt = `Cinematic editorial photography for a murder mystery party guide titled "${title}", moody noir lighting with warm candlelight and subtle neon accents, well-dressed guests at an atmospheric dinner party examining clues, 8k photorealistic, zero text or letters.`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const imgPart = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
        const b64 = imgPart?.inlineData?.data;
        if (b64) {
          fs.writeFileSync(targetPath, Buffer.from(b64, "base64"));
          console.log(`✓ saved new AI blog image: /blog-images/${slug}.png`);
          return `/blog-images/${slug}.png`;
        }
      }
    } catch {
      // Fallback below
    }
  }
  return fallbackImage;
}

for (const p of posts) {
  const { md, ...rest } = p;
  const words = md.split(/\s+/).filter(Boolean).length;
  console.log(`${rest.slug}: ${words} words`);
  if (words < 1500) throw new Error(`${rest.slug} is under 1500 words (${words})`);
}

const storePath = "data/.marketing-suite-store.json";
if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
const store = fs.existsSync(storePath)
  ? JSON.parse(fs.readFileSync(storePath, "utf8"))
  : { blog_posts: [], social_posts: [], social_post_captions: [], edm_campaigns: [], edm_events: [] };

for (const p of posts) {
  const { md, ...rest } = p;
  const generatedImage = await ensureGeneratedBlogImage(
    rest.slug,
    rest.title,
    rest.featured_image_url
  );
  const html = await marked(md);
  const nowIso = new Date().toISOString();
  const row = {
    ...rest,
    featured_image_url: generatedImage,
    content: html,
    content_markdown: md,
    updated_at: nowIso,
  };

  // 1. Try Supabase Postgres table
  const { data: existing, error: selErr } = await supabase
    .from("blog_posts")
    .select("id")
    .eq("slug", rest.slug)
    .maybeSingle();

  if (!selErr) {
    const { error } = existing
      ? await supabase.from("blog_posts").update(row).eq("id", existing.id)
      : await supabase.from("blog_posts").insert(row);
    if (error) {
      console.error(rest.slug, error);
      process.exit(1);
    }
    console.log(existing ? "updated (supabase)" : "inserted (supabase)", rest.slug);
  } else {
    // 2. Sync into marketing-suite-store
    const idx = store.blog_posts.findIndex((b) => b.slug === rest.slug);
    if (idx >= 0) {
      store.blog_posts[idx] = { ...store.blog_posts[idx], ...row };
      console.log("updated", rest.slug);
    } else {
      store.blog_posts.push({
        id: crypto.randomUUID(),
        created_at: nowIso,
        view_count: 0,
        ...row,
      });
      console.log("inserted", rest.slug);
    }
  }
}

fs.writeFileSync(storePath, JSON.stringify(store, null, 2), "utf8");
await supabase.storage
  .from("character-images")
  .upload("system/marketing-suite-store.json", Buffer.from(JSON.stringify(store, null, 2), "utf8"), {
    contentType: "application/json",
    upsert: true,
  })
  .catch(() => {});

