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
const corporateTeam = `Corporate offsites and end-of-year celebrations have a well-documented engagement problem. Standard trivia nights favour the loudest table, trust falls make introverts check their watches, and unstructured bar tabs rarely help cross-functional teams connect. In 2026, workplace experience leads and people-and-culture managers are turning to **structured interactive murder mysteries** as one of the highest-rated team building formats for groups of 8 to 24 people.

When every participant receives a tailored character brief, interlocking objectives, and multimedia forensic clues on their phone, the dynamics shift immediately. Junior analysts have an excuse to interrogate the VP of Sales, remote colleagues who have only ever met on Zoom share secret alibis, and quieter analytical thinkers shine during the evidence-review rounds.

This guide breaks down the psychology of roleplay-based team building, the budget comparison against traditional corporate events, how to match personality types to character archetypes, and a step-by-step run sheet for an unforgettable 90-minute or 2-hour session.

## Why Traditional Corporate Team Building Falls Flat

Most workplace social events fail for one of two reasons: they require **too much vulnerability too fast**, or they provide **zero conversational scaffolding**.

| Event Format | Typical Cost per Head (AUD) | Participation Rate | Main Weakness |
|---|---|---|---|
| Open bar & finger food | $85–$140 | 40–50% (cliques form) | People only talk to their immediate desk neighbours |
| Escape room venue hire | $55–$75 | 60–70% | 1 or 2 dominant voices solve all puzzles while others watch |
| Facilitated improv workshop | $90–$160 | 35–50% | High social anxiety for introverted or analytical staff |
| Interactive Murder Mystery | $15–$35 (kit + food) | 95%+ | Every guest holds unique clues required to solve the case |

The secret of a well-architected mystery is **asymmetric information**. Because no single player holds all the facts, the group cannot solve the crime unless every person speaks up, shares their timeline, and compares evidence.

## How Asymmetric Clues Level the Workplace Hierarchy

In a normal meeting, seniority dictates airtime. In a murder mystery, the character packet dictates leverage.

1. **Built-in conversation starters.** Instead of awkward small talk about Q4 targets, every player has three specific questions they must ask three specific people in Round 1.
2. **Psychological safety through a persona.** Wearing a character name badge and speaking from a backstory removes personal ego. Negotiating a blackmail subplot as a corrupt art dealer or a rival vineyard heir is fun, low-stakes, and energizing.
3. **Dual-track gameplay for extroverts and introverts.** Theatrical team members can lean into dramatic accusations and costume props, while methodical thinkers gravitate toward timeline verification, CCTV timestamps, and forensic contradictions.
4. **Adaptable gender and group sizes.** Modern digital mystery kits let organisers toggle character genders and scale from 6 to 20+ players without breaking the underlying clue logic.

## The Cost Breakdown: Venue Hire vs In-Office Mystery Night

Running a hosted event in your boardroom, a private dining room, or a rented Airbnb cuts per-head costs by more than 60% compared with external corporate entertainment agencies.

| Budget Line (12-Person Team) | External Agency Event | DIY Interactive Mystery Night |
|---|---|---|
| Entertainment / game fee | $1,400–$2,200 | $49–$79 (complete digital + print kit) |
| Catering & drinks | $1,200 (venue minimum) | $450 (grazing platters + drinks) |
| Audio-visual / props | $300 | $0 (guests use their own smartphones + printed evidence) |
| **Total Event Cost** | **$2,900–$3,700** | **$499–$529** |

That saving allows team leads to run quarterly social events instead of waiting for a once-a-year Christmas budget.

## Step 1: Casting Your Colleagues Without HR Headaches

Good casting turns a good night into a legendary one. Follow these four principles when assigning roles five to seven days before the event:

- **Cast extroverts in high-drama suspect roles.** Every mystery has two or three louder archetypes with public rivalries. Give these to the team members who love the spotlight.
- **Give analytical thinkers evidence-heavy roles.** Investigators, forensic insiders, and characters with ledger or timeline secrets suit detail-oriented staff.
- **Cross-pollinate departments.** Pair people from engineering, marketing, and operations in shared subplots so they have a reason to collaborate in Round 1.
- **Keep workplace boundaries clean.** Choose themes centered on heist cover-ups, corporate espionage, luxury galas, or vintage train mysteries, and use adaptable character settings to ensure everyone is comfortable with their persona.

## Step 2: Using Mobile Audio & Visual Clues to Boost Immersion

Paper-only scripts can feel like homework after a long workday. Combining printed character badges with **mobile digital evidence** keeps energy high from the opening briefing to the final accusation.

When the host advances the game from Round 1 to Round 2, every player's phone unlocks:

- **CCTV security camera stills** showing suspects in the hallway near the time of the crime
- **Recovered chat logs and text threads** revealing secret alliances
- **Multi-speaker voice notes and wiretaps** that players can play out loud to the room
- **Forensic lab and toxicology reports** that narrow down the murder weapon

Because the evidence looks and sounds like real investigative artifacts, teams naturally huddle around tables comparing screenshots and timelines.

## Step 3: The 90-Minute Corporate Run Sheet

You do not need a four-hour dinner to run a complete mystery. Here is the proven 90-minute format used for Friday afternoon team socials:

| Time | Phase | What Happens |
|---|---|---|
| 00:00–00:15 | Arrival & Character Check-In | Guests grab a drink, scan the QR code to open their mobile dossier, and put on their name badge |
| 00:15–00:35 | Round 1: Mingling & Motives | Everyone circulates to complete their Round 1 prompts and establish alibis before the crime |
| 00:35–00:40 | The Crime Announcement | The host plays the emergency audio broadcast announcing the victim and locking down the room |
| 00:40–01:05 | Round 2: Forensic Investigation | Physical and mobile CCTV/audio clues unlock; suspects interrogate each other over grazing platters |
| 01:05–01:20 | Round 3: Final Statements & Voting | Each suspect gives a 30-second defence; everyone submits their official vote for Killer + Motive |
| 01:20–01:30 | The Reveal & Awards | The killer confesses, and awards are handed out for Best Detective, Best Actor, and Best Costume |

## A Worked Example: A 14-Person Product & Engineering Offsite

Consider a 14-person software and product team meeting in Sydney for their quarterly planning week. Half the team works remotely across Melbourne and Brisbane, and three new hires joined that month.

Instead of booking a noisy pub table, the team lead set up a 1920s speakeasy mystery in their coworking event space:

- **5 days prior:** Automated invite links went out so each team member could view their character overview and optional dress-code accessories (fedoras, pearl necklaces, bow ties).
- **During the game:** The quietest backend engineer noticed a 7-minute discrepancy between the victim's recovered text message and a suspect's CCTV timestamp, cracking the alibi wide open.
- **Post-event feedback:** 100% of attendees rated the session 5/5, and the team's Slack channel spent the next week referencing their character aliases.

## Common Mistakes to Avoid

- **Sending 15-page PDFs the week before.** Busy employees will not read a novel before Friday drinks. Use concise one-page character cards and progressive round-by-round mobile prompts.
- **Letting the host read the solution by accident.** Use a host-blind digital mode so the organiser can play alongside the team without spoiling the killer.
- **Skipping the awards ceremony.** Printing three simple certificates (Super Sleuth, Master Manipulator, Best Dressed) creates a great group photo moment at the end of the night.

## Frequently Asked Questions

**Can the team leader or organiser play without knowing who the killer is?**
Yes. Modern digital mystery platforms conceal the solution and round clues behind a progressive host controller, so the organiser can participate as a full suspect without seeing the final reveal until everyone votes.

**What if someone calls in sick on the day of the event?**
Core suspects hold essential clues, while flexible characters can be toggled off or reassigned in seconds so a last-minute absence never breaks the mystery logic.

**Do people have to act or put on accents?**
Not at all. Guests can play in the first person ("I was in the conservatory at 9:15 PM") using their normal voice, treating the night like a live-action strategy game.

## The Bottom Line

Corporate team building works best when it gives people a shared puzzle, a playful reason to talk to colleagues outside their immediate circle, and clear roles that reward both outgoing performers and quiet problem-solvers. An interactive murder mystery delivers all three at a fraction of the cost of traditional corporate venues.

### References

- Harvard Business Review – [The New Science of Building Great Teams](https://hbr.org/2012/04/the-new-science-of-building-great-teams)
- Safe Work Australia – [Positive workplace culture and team connection](https://www.safeworkaustralia.gov.au)
- Eventbrite – [Corporate Event Trends Report](https://www.eventbrite.com/blog/)
`;

// ---------------------------------------------------------------------------
// 2. AUDIO & MULTIMEDIA CLUES — Mon 23 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const audioClues = `For decades, at-home murder mystery parties relied on a single medium: slips of paper. Guests read paragraphs from a booklet, passed around printed clue cards, and tried to imagine a crime scene from blocks of text. In 2026, the biggest leap in dinner party immersion comes from **diegetic multimedia evidence**: overheard voice notes, wiretapped phone calls, grainy CCTV stills, and recovered text threads delivered straight to players' smartphones.

When a suspect taps play on their phone at the dinner table and the entire room hears a panicked voicemail mentioning **their actual friend's name**, the atmosphere in the room changes instantly. Paper games tell players a story; audio and visual artifacts make them feel like they are inside a live investigation.

This guide explores how multimedia clues work in a modern murder mystery party, why combining physical props with mobile audio creates the best social dynamic, and how to stage your clue reveals across three rounds.

## What Are Diegetic Clues (And Why Do They Work So Well)?

In film and game design, *diegetic* elements are things that exist inside the fictional world itself. Instead of a narrator card saying *"You learn that Victor argued with the victim at 10:30 PM,"* a diegetic clue gives the players the actual artifact from 10:30 PM.

| Clue Archetype | Traditional Paper Version | Multimedia Artifact Version | Impact on the Room |
|---|---|---|---|
| **Overheard Argument** | A paragraph describing what a witness heard | A 35-second multi-speaker audio recording with room reverb | Everyone stops talking and leans in to listen together |
| **Security Alibi** | Text stating who was in the corridor | High-angle grainy B&W CCTV still with ` + "`CAM 04 // 23:14:08`" + ` HUD | Players zoom in on outfits, objects, and timestamps |
| **Secret Affair / Bribe** | A summary of a rumour | Dark-mode smartphone chat bubbles with a *"Deleted Message Recovered"* badge | Instant screenshot comparisons across the table |
| **Forensic / Financial Proof** | Plain bullet points | Styled toxicology lab report, crumpled hotel receipt, or torn diary note | Tactile realism that feels like a true-crime box |

## Why Audio Clues Create Unforgettable Party Moments

Sound bypasses reading fatigue. By Round 2 of a dinner party, lighting is dim, drinks are flowing, and guests do not want to squint at dense paragraphs of text.

1. **Shared collective attention.** When one player unlocks an audio wiretap and plays it aloud, all 8 to 16 guests experience the twist at the exact same second.
2. **Vocal tone carries subtext.** Hesitation, a shaky alibi, or a whispered threat in a two-person dialogue recording gives players behavioural clues they can debate.
3. **Personalized guest hydration.** When the audio script is dynamically generated with the real guests' names assigned to each character, hearing *"Keep your voice down, Marcus is standing right outside the door!"* produces an immediate reaction around the room.
4. **Accessible in low light.** Candlelit dining rooms and neon noir party setups look atmospheric, but they make small print hard to read. Mobile audio and backlit chat screens solve that problem completely.

## The Hybrid Sweet Spot: Physical Polaroids + Mobile Playroom

One common fear hosts have about app-based games is that guests will sit silently staring at their phones all night. The solution is **hybrid staging**: using phones strictly as an investigative evidence locker while keeping all interrogation and deduction face-to-face.

| Game Element | Best Medium | Why It Works |
|---|---|---|
| Character name badge & core bio | Printed card / lanyard | Keeps everyone's character identity visible across the room |
| Round-by-round gossip prompts | Mobile Playroom or pocket card | Quick 2-sentence objectives that prompt face-to-face mingling |
| Crime scene physical evidence | Printed Polaroid cards hidden in the room | Gives guests a reason to search the mantelpiece, bar, or bookshelf |
| Wiretaps, voicemails & chat logs | Mobile Playroom (` + "`PlayroomClient`" + `) | Plays real audio and renders interactive chat bubbles on tap |

By limiting digital clues to 3 or 4 high-impact artifacts per round, phones become a prop—like a detective's walkie-talkie or case file—rather than a distraction.

## How to Stage Multimedia Clues Across Three Rounds

Pacing is everything in a whodunit. If you drop all your best audio and CCTV evidence in the first 15 minutes, the final hour loses momentum. Follow this three-act escalation structure:

### Round 1: Establish Motives & Relationships (Pre-Murder or Early Discovery)
- **Format:** Recovered text message threads (` + "`isScreenClue`" + `) and financial receipts.
- **Goal:** Expose who owes money, who is being blackmailed, and who had a secret grudge against the victim. Every suspect should look guilty of *something*, even if it is not murder.

### Round 2: Break the Alibis (Forensic & CCTV Investigation)
- **Format:** Grainy security camera footage (` + "`isCctvOrVideoClue`" + `) and physical crime scene objects.
- **Goal:** Contradict what suspects claimed in Round 1. If a suspect swore they never left the ballroom after 10:00 PM, a ` + "`CAM 02 // 22:18`" + ` corridor still forces them to explain what they were really doing.

### Round 3: The Smoking Gun Wiretap (Final Twist Before Voting)
- **Format:** Multi-speaker audio recording (` + "`isAudioClue`" + `) or toxicology report.
- **Goal:** Deliver the decisive timeline or method clue that clears the red herrings and lets observant detectives connect the killer's motive, means, and opportunity.

## A Worked Example: Staging the Round 3 Audio Reveal

Imagine hosting a 10-player Hollywood reunion mystery (*Love on the Rocks*). Throughout Rounds 1 and 2, three different suspects have strong motives to poison the victim's champagne flute:

1. **The Ex-Fiancé** (hiding a leaked NDA)
2. **The Showrunner** (facing a $2M lawsuit)
3. **The Rival Co-Star** (caught on CCTV near the bar at 23:05)

At the start of Round 3, the host taps **Advance to Round 3**. A recovered backstage voice recorder clip unlocks in the Playroom. When played over a Bluetooth speaker or phone, guests hear two voices arguing over the sound of clinking glasses—revealing that the Rival Co-Star was actually meeting the Showrunner to hand over a prop bottle, while a third person switched the champagne flute at 23:12.

Within thirty seconds, the entire table is cross-referencing the 23:12 timestamp against the Round 1 chat logs.

## Practical Tips for Hosts Using Audio Clues

- **Keep audio clips between 20 and 45 seconds.** Short, punchy dialogue with clear names and times works best in a lively party room.
- **Always include a collapsible transcript.** In a loud room, players love being able to listen to the voice note first and then skim the written transcript to verify exact times or numbers.
- **Connect a small Bluetooth speaker for the opening & closing broadcasts.** Playing the initial crime announcement over a room speaker sets the theatrical tone, while individual round clues can be played on guests' phones in small groups.

## Frequently Asked Questions

**Do guests need to download an app from the App Store?**
No. Guests simply scan a QR code or tap a link to open the mobile web Playroom in their browser—no app downloads or account passwords required.

**What if a guest wants to host a 100% unplugged, phone-free party?**
Every multimedia clue—including chat threads, CCTV stills, and audio transcripts—can also be compiled and printed as physical Polaroid and dossier cards from the print studio.

**How do personalized character images work on CCTV and chat clues?**
When guests upload an optional selfie before the party (or the host selects character archetypes), the image generator incorporates their likeness and costume style directly into the noir evidence photos.

## The Bottom Line

Multimedia clues transform a murder mystery from a reading exercise into a cinematic experience. By pairing dark-mode chat logs, authentic CCTV frames, and multi-speaker ElevenLabs voice notes with classic face-to-face interrogation, you give your guests a night they will talk about for months.

### References

- Nielsen Norman Group – [Multimedia and Audio Engagement in Interactive Storytelling](https://www.nngroup.com)
- Wired – [The Rise of Immersive Audio Games and Tabletop Companions](https://www.wired.com)
`;

// ---------------------------------------------------------------------------
// 3. SMALL GROUP & DINNER PARTY MYSTERIES (6-8 PLAYERS) — Thu 26 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const smallGroup = `One of the most common myths about hosting a murder mystery party is that you need a mansion and twenty theatrical friends to pull it off. In reality, some of the sharpest, funniest, and most suspenseful mystery nights happen around a single dining table with **6 to 8 players**.

Large 20-person parties are high-energy mingling events, but a 6-to-8-person dinner party is closer to *Knives Out* or *Glass Onion*: intimate, conversational, and impossible to hide in. Everyone hears every accusation, every alibi is tested in front of the whole table, and the host can serve a proper three-course meal without losing track of the plot.

This guide covers why small-group mysteries work so well, how to structure a seated dinner mystery, what to do if a guest cancels at the last minute, and a complete hosting checklist for 6 to 8 players.

## Small Dinner Party (6–8) vs Large Cocktail Party (12–20): How the Gameplay Differs

Understanding the structural difference between a seated dinner game and a standing cocktail mystery helps you pick the right format for your space.

| Feature | Seated Dinner Mystery (6–8 Players) | Standing Cocktail Mystery (12–20 Players) |
|---|---|---|
| **Primary Dynamic** | Whole-table interrogation & shared banter | 1-on-1 corner whispers & rotating cliques |
| **Food Format** | Seated 3-course dinner or shared banquet | Grazing boards, canapés & finger food |
| **Round Duration** | 25–30 minutes per course | 35–45 minutes of free-roaming mingling |
| **Clue Delivery** | Passed around the table or unlocked on phones between courses | Hidden around the room + mobile unlocks |
| **Host Workload** | Low (everyone stays in one room) | Medium (corralling 18 people for announcements) |

In a 6-to-8-player game, nobody ever feels left out of a subplot because the entire table shares the stage.

## How to Align Your 3 Mystery Rounds With a 3-Course Dinner

The easiest way to pace a small-group mystery is to tie each round of the investigation to a course of your meal. That keeps the kitchen schedule predictable and gives guests natural breaks to eat and talk in character.

1. **Pre-Dinner Drinks (20 mins): Character Introductions & Icebreakers.** Guests arrive in costume, grab a welcome cocktail, and introduce their character's public connection to the victim.
2. **Entrée / Starter (30 mins): Round 1 — Motives & Rumours.** As starters are served, each player shares their Round 1 prompts across the table. By the time plates are cleared, everyone has a reason to distrust their neighbour.
3. **The Murder & Main Course (40 mins): Round 2 — Forensic Evidence & Alibis.** Right before mains arrive, the crime occurs. Players unlock Round 2 CCTV stills, chat threads, and audio clips on their phones and interrogate each other over dinner.
4. **Dessert & Digestifs (25 mins): Round 3 — Smoking Gun, Final Accusations & Reveal.** Dessert is served alongside the final round of clues. Each suspect delivers a 60-second closing statement, votes are cast, and the killer is unmasked.

## How Flexible Player Counts Handle Last-Minute Dropouts

When you are hosting 18 people, losing two guests on the afternoon of the party barely registers. When you are hosting 7 people and a couple gets stuck with a babysitter emergency, a rigid box-set game can collapse if one of the missing guests was assigned the killer role or held a crucial clue.

Here is how to bulletproof a small-group party against last-minute changes:

| Scenario | Old Box-Set Problem | Modern Digital Solution |
|---|---|---|
| **1 guest cancels 2 hours before start** | Their printed booklet has a critical clue nobody else knows | Re-compile or toggle off the character so their essential clues redistribute automatically |
| **An extra partner joins last minute** | No spare character role in the 6-player box | Activate an expandable suspect role in 60 seconds and send their mobile Playroom link |
| **Gender ratio shifts** | Stuck with fixed male/female scripts | Toggle adaptable character genders (` + "`M / F`" + `) with one click so names, pronouns, and avatars match your guests |

## Setting the Table for Maximum Atmosphere (On a $50 Budget)

Because all the action happens around a single table, small visual details go a long way:

- **Use table lamps and candles instead of overhead downlights.** Turning off ceiling lights and placing warm lamps or LED candles down the centre of the table instantly creates a moody noir feel.
- **Place printed evidence envelopes at each place setting.** Even if guests use their phones for audio and CCTV clues, placing a sealed "CONFIDENTIAL DOSSIER" envelope on each napkin makes sitting down feel special.
- **Curate a 3-hour background playlist.** Keep volume at 25–30% so conversation flows effortlessly without anyone straining to hear across the table.
- **Serve family-style shared platters for the main course.** Passing bowls of pasta, roast meats, or sides around the table keeps the host seated with their guests instead of plating food in the kitchen during Round 2.

## A Worked Example: A 6-Player Birthday Dinner in a 1-Bedroom Apartment

You do not need a large house to host. Consider a 6-player birthday dinner hosted in a compact inner-city apartment:

- **Space used:** Just the 6-seater dining table and the sofa area for arrival drinks.
- **Prep time:** 20 minutes to set the table, dim the lights, and print six place-card QR codes.
- **Gameplay highlight:** Because all six players could hear every question, when two suspects tried to coordinate a fake alibi via eye contact across the table, the other four players caught them immediately—sparking ten minutes of non-stop laughter.

## Frequently Asked Questions

**What is the absolute minimum number of players for a good murder mystery?**
Six players is the sweet spot for a full whodunit where the killer is one of the guests at the table. With 6 suspects, there are enough red herrings and interlocking alibis that the killer cannot be guessed by simple process of elimination in Round 1.

**Should the host play as a suspect in a 6-to-8-person game?**
Yes! In a small group, having the host sit at the table as a full suspect keeps the circle intimate. Using the mobile Playroom controller allows the host to unlock rounds without seeing the solution ahead of time.

**How long does a 6–8 player game take from start to finish?**
Usually 2 to 2.5 hours when paired with dinner, or 90 minutes if played over drinks and grazing platters.

## The Bottom Line

A 6-to-8-person dinner party is the easiest, highest-impact way to host your first murder mystery. With everyone gathered around one table, zero crowd-herding stress, and multimedia clues delivered between courses, you can turn an ordinary Saturday dinner into the most memorable night of the year.

### References

- Bon Appétit – [How to Host a Stress-Free Dinner Party](https://www.bonappetit.com)
- Architectural Digest – [Dining Room Lighting Ideas for Entertaining](https://www.architecturaldigest.com)
`;

// ---------------------------------------------------------------------------
// 4. HOLIDAY & NEW YEAR'S EVE MYSTERY PARTIES — Mon 30 Nov 2026 (09:00:00Z)
// ---------------------------------------------------------------------------
const holidayParty = `Between late November and New Year's Eve, calendars fill up with festive catch-ups, Friendsmas dinners, and countdown parties that all start to blur together. By mid-December, guests have had the same conversations over mulled wine and grazing boards three weekends in a row. Hosting a **Holiday or New Year's Eve Murder Mystery Party** breaks that pattern immediately—giving your friend group or family a reason to dress up, put down their doomscrolling, and spend the night entangled in alibis and dramatic reveals.

New Year's Eve in particular has a notorious "10:30 PM slump"—that two-hour window after dinner finishes where everyone is waiting around for the midnight countdown. A three-round murder mystery solves the pacing of the night completely, building tension right up to a 11:45 PM killer reveal and a midnight champagne toast.

This guide covers how to time a New Year's Eve or Friendsmas mystery, the best themes for December entertaining, how to include relatives and mixed age groups, and a stress-free festive prep timeline.

## Why December & New Year's Eve Are Peak Murder Mystery Season

Search interest and party bookings for at-home mystery games spike by **more than 250% between November and January** each year. Three factors drive the surge:

1. **Everyone is already looking for an excuse to dress up.** Sequins, velvet jackets, black tie, and vintage glamour fit both festive parties and murder mystery themes naturally.
2. **Mixed friend groups need an icebreaker.** Holiday parties often bring together childhood friends, work colleagues, partners, and in-laws who do not know each other well. Character roles give everyone an instant topic of conversation.
3. **Staying in beats overpriced NYE venues.** Between surge-priced rideshares, $150 cover charges, and crowded bars, hosting 10 to 14 friends at home with great food and a structured game is both cheaper and far more memorable.

| NYE Option (10 Friends) | Typical Cost per Person | Energy at 11:00 PM | Memorable Factor |
|---|---|---|---|
| Ticketed bar / club night | $120–$220 + transport | Queuing for drinks in a loud room | Low |
| Unstructured house party | $40–$60 | The 10:30 PM couch slump sets in | Medium |
| Hosted NYE Murder Mystery | $45–$65 (food + game split) | Peak Round 3 accusations & voting | Unforgettable |

## The Perfect New Year's Eve Countdown Run Sheet

If you are hosting on December 31st, timing the final reveal to finish 15 minutes before midnight creates an incredible crescendo for the evening:

| Time | Stage | Host Action |
|---|---|---|
| **8:00 PM** | Doors Open & Red Carpet Arrival | Take polaroid or phone mugshots of every guest in costume for the evidence board |
| **8:45 PM** | Round 1: Pre-Murder Mingling | Unlock Round 1 on mobile; guests circulate with cocktails and establish their alibis |
| **9:30 PM** | Dinner & The Crime Broadcast | Play the breaking-news audio alert announcing the murder; serve main food platters |
| **10:15 PM** | Round 2: CCTV & Forensic Clues | Unlock Round 2 evidence (security cam stills, recovered texts); cross-examinations begin |
| **11:00 PM** | Round 3: Wiretap Reveal & Final Alibis | Play the smoking-gun audio clue; suspects make their final 60-second speeches |
| **11:30 PM** | Voting & The Killer's Confession | Tally votes, crown the Best Detective & Best Actor, and unmask the killer |
| **11:50 PM** | Switch to Countdown Broadcast | Pour champagne and ring in the New Year together |

## Choosing the Right Theme for Your Holiday Crowd

Not every December gathering has the same vibe. Match your theme to your guest list:

- **For Glamorous NYE Groups (20s–40s):** Choose a high-society gala, reality-TV reunion (*Love on the Rocks*), or roaring 1920s speakeasy where guests can wear cocktail dresses, tuxedos, and statement jewellery.
- **For Quirky Friendsmas Parties:** A vintage carnival (*Circus of Screams*) or eccentric billionaire mansion mystery lets guests lean into outrageous props and theatrical accusations.
- **For Multi-Generational Family Gatherings:** Pick a classic whodunit motif where parents, adult siblings, and cousins can play together without awkward subplots, focusing on inheritance feuds, stolen heirlooms, and clever timeline puzzles.

## How to Personalize the Night With Inside Jokes & Guest Photos

The difference between a generic boxed game and a custom-built mystery is how personal the evidence feels:

1. **Send the guest RSVP link 1 week early.** Let guests enter their name and upload a quick photo so their character dossier and crime scene evidence feature their likeness.
2. **Weave 2 or 3 real friend-group jokes into the prompts.** Mentioning a guest's real-life obsession with espresso martinis or their notorious lateness inside a character's alibi always gets a huge laugh when read aloud.
3. **Print physical award certificates for midnight.** Handing out *"Most Likely to Get Away With Murder in 2027"* and *"Sharpest Detective of the Year"* gives everyone a souvenir from the night.

## A 7-Day Stress-Free Holiday Host Checklist

| Day | Task | Time Required |
|---|---|---|
| **7 Days Out** | Choose your theme, enter guest names, and send digital character invites | 15 minutes |
| **4 Days Out** | Generate personalized CCTV/chat/audio clues and print name badges | 15 minutes |
| **2 Days Out** | Shop for make-ahead grazing platters, drinks, and a signature "Poisoned" mocktail/cocktail | 45 minutes |
| **Party Afternoon** | Arrange lighting, test Bluetooth speaker, and place printed evidence cards | 20 minutes |

## Frequently Asked Questions

**What if guests arrive late because of holiday traffic?**
Keep the first 45 minutes as an arrival and character check-in window. Only trigger Round 1 once your core group has arrived and has a drink in hand.

**Can we play with a mix of couples and solo friends?**
Yes. In fact, casting real-life couples as bitter rivals—or giving them completely separate subplots with other guests—is one of the best ways to get the whole room mingling.

**Do I need to print everything if my printer runs out of ink on December 30th?**
No. Because every guest can access their character sheet, round objectives, CCTV photos, chat threads, and audio clues on their phone via the mobile Playroom, you can run the entire party paper-free if needed.

## The Bottom Line

Instead of another forgettable holiday drinks night or a New Year's Eve spent watching the clock, a murder mystery turns your December gathering into an event people genuinely look forward to. With 30 minutes of prep and multimedia clues that keep the room buzzing until midnight, you will set the bar for every party in the new year.

### References

- Vogue – [How to Host an Unforgettable New Year's Eve Party at Home](https://www.vogue.com)
- Pinterest Predicts – [Trending Party and Entertaining Themes](https://business.pinterest.com/pinterest-predicts/)
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

for (const p of posts) {
  const { md, ...rest } = p;
  const words = md.split(/\s+/).filter(Boolean).length;
  console.log(`${rest.slug}: ${words} words`);
  if (words < 1000) throw new Error(`${rest.slug} is under 1000 words`);
}

const storePath = "data/.marketing-suite-store.json";
if (!fs.existsSync("data")) fs.mkdirSync("data", { recursive: true });
const store = fs.existsSync(storePath)
  ? JSON.parse(fs.readFileSync(storePath, "utf8"))
  : { blog_posts: [], social_posts: [], social_post_captions: [], edm_campaigns: [], edm_events: [] };

for (const p of posts) {
  const { md, ...rest } = p;
  const html = await marked(md);
  const nowIso = new Date().toISOString();
  const row = { ...rest, content: html, content_markdown: html, updated_at: nowIso };

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

