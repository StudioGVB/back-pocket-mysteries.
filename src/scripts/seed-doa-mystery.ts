/**
 * DEAD ON ARRIVAL — A Reality TV Murder Mystery
 * Based on the structure of "Love On The Rocks" by Backpocket Games
 *
 * Setting: The cast reunion party for "Dead On Arrival" — a hit reality dating show.
 * Victim: Skye — the winner.
 * Killer: Rex — the obsessed superfan, who switches the poisoned drink.
 * Accomplice twist: Blaze (the ex) who originally prepared the poison for the host.
 *
 * Structure mirrors LOTR exactly:
 * - 8 characters (1 victim, 1 killer, 1 unintentional accomplice, 5 suspects)
 * - 4 rounds of clues (R1: 8, R2: 10, R3: 7, R4: 2)
 * - 8 plot beats
 * - Clue types: screenshots, voice notes, text threads, physical evidence, security cam
 * - Same twist: killer didn't plan to kill the victim — they wanted someone else dead
 */

// RUN WITH: npx ts-node src/scripts/seed-doa-mystery.ts
// OR trigger via the admin create form with title containing "dead on arrival" or theme "reality tv"

export const DOA_MYSTERY_SEED = {
  title: "Dead On Arrival",
  theme: "Reality TV Reunion",
  description: `The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of \"Dead On Arrival\" — Season 3's most-watched dating show — have reunited for the glitzy wrap party at a five-star hotel penthouse. Skye walked away with the crown, the following, and the guy. But in this room, everyone has a score to settle. When Skye collapses mid-champagne-toast, poisoned in front of fifty witnesses and a rolling camera, everyone becomes a suspect. One person planned to kill. Another switched the target. And now the story has a very different ending.`,
  inside_jokes: "Remember: the cameras are always on. Even when they shouldn't be.",
};

export const DOA_CHARACTERS = [
  {
    name: "Skye|The Winner|Victim",
    role: "Skye",
    color: "Pink",
    gender: "female" as const,
    plot_role: "victim" as const,
    archetype: "victim" as const,
    is_victim: true,
    is_mandatory: true,
    bio: "Skye won Dead On Arrival Season 3. Crowned queen of chaos, she had the most followers, the most airtime, and the most drama. She played the game flawlessly — sweet when the cameras rolled, ruthless when they didn't. Ask anyone in this room and you'll get a different version of Skye. To Brooke, she's the girl who stole her win. To Blaze, she's the one that got away. To the host? Complicated. Skye walks into the reunion like she's still the main character. She always knew how to keep her enemies close. That's why half the room still calls themselves her friend.",
    outfit_advice: "Elegant and effortless. Think a silky slip dress or bias-cut skirt in luxe neutrals or muted jewel tones — like someone who's used to being photographed and never tries too hard. Add soft waves, dewy makeup, and a killer heel.",
    act_summary: "You won the show and you're still the fan favourite — but you're aware that people want to see you fall. Smile sweetly, keep it composed, but never let them forget who came out on top.",
    act_bullets: ["Be effortlessly poised, like everything rolls off you", "Stay friendly, but always keep control of the room", "Laugh off shade — or casually mention your brand deals instead", "Let people talk… and then deliver the perfect mic-drop response", "Never raise your voice — just raise your eyebrows"],
    traits: ["Poised", "Strategic", "Charming", "Untouchable"]
  },
  {
    name: "Nova|The Sister|Suspect",
    role: "Nova",
    color: "Pink",
    gender: "female" as const,
    plot_role: "innocent" as const,
    archetype: "witness" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Nova was never supposed to be on Dead On Arrival — but she showed up to every red carpet, every finale taping, and every paparazzi moment like she was born for it. Half the fandom didn't even realise she wasn't a cast member. She's younger, louder, and tired of living in Skye's shadow. Nova was always just out of frame, just off set, not quite enough. Now she's finally got a seat at the table — and she's not wasting it. She says she's just here to support her sister. But that dress, that flirty laugh, and that weird tension with Zane? Feels more like she's here to make a name for herself.",
    outfit_advice: "Slinky, sultry, and just a little too polished for a reunion. Think soft clingy fabrics, neutral or warm tones, mini skirts or a maxi with a cutout — something you'd wear hoping it ends up on a gossip account. Pair with sunglasses (yes, indoors) and a smug little smirk.",
    act_summary: "Nova is always performing — for the cameras, for the group, for herself. She's charming until she's not, and every line should leave people guessing if she's serious.",
    act_bullets: ["Always has a comeback (even if it makes no sense)", "Drops gossip like it's casual conversation", "Jealousy? Masked as confidence", "Thinks she's the main character", "Flirts to cause chaos, not connection"],
    traits: ["Loud", "Ambitious", "Jealous", "Unpredictable"]
  },
  {
    name: "Blaze|The Ex|Suspect",
    role: "Blaze",
    color: "Green",
    gender: "adaptable" as const,
    plot_role: "assistant" as const,
    archetype: "villain" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Blaze was Dead On Arrival's poster person — gorgeous, magnetic, and completely toxic. They and Skye were the golden couple for most of Season 3… until Betrayal Week, when Blaze kissed another cast member 'for the challenge' and tried to gaslight their way out of it. The internet dragged them. They went dark for months, came back with a new look and an apology vlog. Now they're back in the same room as Skye, claiming to be chill and just here to reconnect. They're jittery, distracted, constantly checking their phone. Is it nerves — or something stronger? Blaze says they've found peace. But peace doesn't usually come in crushed-up capsules.",
    outfit_advice: "Something clean and curated — a white or beige button-up, relaxed pants, and a silver or leather chain. Like you're trying to look peaceful but still hot.",
    act_summary: "You've done the 'inner work' (aka watched a few TikToks on emotional maturity) and now you're convinced you're a new person. Speak in therapy buzzwords, act like everything's chill… until someone mentions Skye. Then the cracks show.",
    act_bullets: ["Pretend to be zen, even when you're clearly not", "Use phrases like 'I'm holding space' or 'That's your projection'", "Get passive-aggressive if people don't agree with you", "Act like Skye owes you something", "Snap if someone calls you out"],
    traits: ["Volatile", "Obsessive", "Charming", "Unstable"]
  },
  {
    name: "Cole|The Host|Suspect",
    role: "Cole",
    color: "None",
    gender: "adaptable" as const,
    plot_role: "innocent" as const,
    archetype: "witness" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Cole was the host of Dead On Arrival — smooth, flirty, and always camera-ready. They were supposed to stay neutral. Supposed to. Off-camera, they blurred a few lines, but fans forgave them — they made great TV. Everyone remembers the banter, the signature cocktail toasts, and that one moment they 'accidentally' kissed a contestant. It got edited out, of course — but the internet found the freeze-frame. No one ever confirmed who it was with. Now, they're back to host the reunion — and maybe settle a few rumours of their own.",
    outfit_advice: "Slick but low-effort. Go for a fitted shirt (buttoned one-too-few), nice dark jeans or chinos, and a statement accessory like a gold chain or flashy watch — like you're still trying to look bookable for a panel show.",
    act_summary: "You're not the drama — you just film it. You pretend to be neutral, but you know everything, and you've stirred the pot off-screen more than once. Stay smooth, funny, and never admit to anything.",
    act_bullets: ["Be charming and flirty with everyone", "Speak like you're still mic'd up", "Constantly steer conversations back to yourself", "Act above the drama — even if you're behind it", "Get cagey if someone brings up your 'after hours' relationships"],
    traits: ["Smooth", "Strategic", "Flirtatious", "Evasive"]
  },
  {
    name: "Rex|The Superfan|Killer",
    role: "Rex",
    color: "Orange",
    gender: "adaptable" as const,
    plot_role: "killer" as const,
    archetype: "villain" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Rex wasn't part of the original cast — they were the wildcard, a fan-voted entry for the reunion special. Their TikTok edits, Reddit theories, and obsessive posts made them a cult favourite before they ever stepped foot on set. When producers let the audience pick one 'superfan' to join the cast, Rex campaigned like their life depended on it. Because, in a way, it did. They're charming in a 'knows too much' kind of way. Obsessed with the show, and maybe a little more obsessed with Skye. Ask them anything about the franchise — they'll know the quote and timestamp. They say they're just here to experience it all… but they've been watching for years. Every move, every scandal, every deleted scene.",
    outfit_advice: "Bookish but curated. Think tucked-in shirts, jumpers over collars, wide-leg trousers or chinos — like they spent hours crafting an 'I'm Smart but Hot' outfit while hoping to get noticed. Bonus points for round glasses, neat hair.",
    act_summary: "You were chosen by the fans, and you've made that everyone's problem. You're obsessed with the show, obsessed with Skye, and convinced this is your big moment. Your energy is off — in a way that gets worse the more people ignore you.",
    act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention Skye in casual conversation… constantly", "Try to be everyone's best friend — especially hers", "Get weirdly intense if someone challenges your place here"],
    traits: ["Obsessive", "Intense", "Calculating", "Devoted"]
  },
  {
    name: "Jordan|The Producer Plant|Suspect",
    role: "Jordan",
    color: "Blue",
    gender: "adaptable" as const,
    plot_role: "innocent" as const,
    archetype: "investigator" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Jordan wasn't just a contestant on Dead On Arrival — they were a twist. A 'regular person' fan-favourite who came in mid-season and shook things up. But what the cast didn't know? Jordan was planted by production to stir drama. Every whisper, every fight, every 'accidental' reveal — Jordan was the match, and someone else was always the flame. They acted like they didn't know the cameras were there. They did. Every single time. Now, at the reunion, Jordan's off contract — and off the leash. But still taking notes, still keeping tabs, still pushing buttons.",
    outfit_advice: "Media bro/babe in disguise. Go for something that says 'creative but harmless' — like a tucked tee or button-up with rolled sleeves, relaxed blazer or cardigan, chinos or slacks, and a too-cool notebook.",
    act_summary: "You act like a casual friend, but you're calculating everything. You never raise your voice, never show your cards, and always know just a little too much. Stir the pot quietly and let others take the fall.",
    act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "Deny involvement while asking suspiciously good questions", "Act supportive but be vague with your answers", "If cornered, claim 'that's not really my role anymore'"],
    traits: ["Calculating", "Charming", "Secretive", "Manipulative"]
  },
  {
    name: "Brooke|The Runner-Up|Suspect",
    role: "Brooke",
    color: "Yellow",
    gender: "female" as const,
    plot_role: "innocent" as const,
    archetype: "hero" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Brooke made it to the final two of Season 3 — and then watched Skye get the crown and the guy. It was close. Too close. For weeks, the hashtags trended in her favour: #JusticeForBrooke, #WrongGirlWon. But the edit told a different story, and the world moved on. She didn't. Brooke's whole brand was 'girl-next-door with a backbone' — but behind the scenes, she and Skye were tight. Until they weren't. Brooke swears nothing happened, that Skye just stopped texting. Still, she showed up to this reunion polished, prepared, and one glass of wine away from a breakdown.",
    outfit_advice: "High-glam and high-stakes. Go for sequins, metallics, or anything body-hugging and eye-catching — the kind of outfit that says 'I'm fine' while setting the room on fire. Heels, glossy lips, too much bronzer.",
    act_summary: "You're here to be civil, mature, and definitely not bitter. But the second someone brings up Skye, your smile gets tight and your voice gets just a little too loud.",
    act_bullets: ["Overcompensate with confidence and sass", "Throw 'no shade' shade constantly", "Pretend not to care — while watching everything Skye does", "Insert yourself into convos that aren't about you", "Look for opportunities to steal back the spotlight"],
    traits: ["Bitter", "Polished", "Competitive", "Wounded"]
  },
  {
    name: "Zane|The Fan-Favourite Flameout|Suspect",
    role: "Zane",
    color: "Black",
    gender: "adaptable" as const,
    plot_role: "innocent" as const,
    archetype: "sidekick" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Zane came into Dead On Arrival bold, loud, and instantly iconic. They flirted with everyone, stirred the pot on purpose, and gave the kind of messy interviews that live forever on TikTok. They didn't win Skye or Brooke's hearts — but they won the internet's. At least, until the final cut. When the reunion special aired, most of Zane's scenes had been edited out. Suddenly, the drama king/queen was a footnote. Zane's been holding onto that rage ever since — tweeting cryptic quotes, posting thirst traps with bitter captions. Tonight, they've got a fresh spray tan, a vengeance arc, and nothing left to lose.",
    outfit_advice: "All black, all attitude. Think fitted tops, wide-leg pants, leather or layered textures — the kind of look that says 'I'm the drama' without having to raise your voice. Chunky rings, a crossbody strap, or boots you can storm out in.",
    act_summary: "You're flirty, shady, and deeply unserious… until someone brings up the edit. Then the façade slips. You want revenge, or at least a trending soundbite.",
    act_bullets: ["Flirt with everyone — especially people you shouldn't", "Stir up drama just to see what happens", "Drop snarky one-liners and play innocent", "Refer to 'the edit' constantly", "Snap if anyone downplays what you went through"],
    traits: ["Chaotic", "Magnetic", "Vengeful", "Theatrical"]
  },
  {
    name: "Mara|The Hair & Makeup Artist|Suspect",
    role: "Mara",
    color: "Purple",
    gender: "female" as const,
    plot_role: "innocent" as const,
    archetype: "witness" as const,
    is_victim: false,
    is_mandatory: true,
    bio: "Mara was the glam guru behind the scenes — head of hair and makeup for Dead On Arrival. She wasn't meant to be part of the drama, but reality TV doesn't stick to the script. She and Skye got close during filming, like late-night-spill-your-guts close. But after the finale, Skye stopped replying. No call. No 'thank you.' Just silence. Now Mara's been dragged into the reunion, touch-up kit in tow, pretending like it's just another job. She says she's just here to powder noses and sip champagne… but someone's been feeding behind-the-scenes tea to a certain someone else.",
    outfit_advice: "Vibrant, artsy, and emotionally layered — just like Mara. Think bold patterns, rainbow knits, playful textures, or anything vintage-inspired. Dopamine dressing with zero subtlety — you make colour look dangerous.",
    act_summary: "You know too much and you're not above letting it slip. You're sarcastic, cutting, and always one step ahead — but you pretend you're just here for the vibes.",
    act_bullets: ["Make everything sound like a joke… until it's not", "Give people compliments that feel like insults", "Watch everything, say nothing (until it matters)", "Be casually petty — especially toward Skye", "If someone accuses you of starting drama, say: 'I don't start it, I just retouch it'"],
    traits: ["Perceptive", "Petty", "Artistic", "Emotionally Guarded"]
  }
];

// 9 Characters total — matches LOTR's 8 + victim = 9 unique character roles
// Wait, LOTR had exactly 8 (Gabby=victim, Sienna, Dane, Colt, Milo, Jeremy, Ava, Zayn, Rikki) = 9 characters
// Let me re-check: Gabby, Sienna, Dane, Colt, Milo, Jeremy, Ava, Zayn, Rikki = 9 total
// Our DOA: Skye, Nova, Blaze, Cole, Rex, Jordan, Brooke, Zane, Mara = 9 total ✓

export const DOA_PLOT_BEATS = [
  {
    beat_number: 1,
    event_title: "The Reunion Kicks Off",
    description: "The cast arrives at the penthouse. Skye walks in last, commanding the room. Old tensions surface immediately — Brooke's smile doesn't reach her eyes, Blaze won't stop staring, and Rex already knows everyone's drink order by heart. Someone already knows they're here for more than just a catch-up.",
    timeline_phase: "pre_crime" as const,
    beat_type: "discovery" as const
  },
  {
    beat_number: 2,
    event_title: "Blaze Discovers The Betrayal",
    description: "Blaze discovers Skye has been secretly hooking up with Cole ever since the show ended. A string of leaked texts and group chat drama makes it impossible to ignore. Consumed by jealousy and fuelled by whatever's in their pocket, Blaze begins to spiral. They start Googling things they shouldn't.",
    timeline_phase: "pre_crime" as const,
    beat_type: "discovery" as const
  },
  {
    beat_number: 3,
    event_title: "Rex Knows Blaze's Plan",
    description: "Rex has been stalking — sorry, 'documenting' — everyone in the building. Through overheard conversations and suspicious note-taking, Rex pieces together that Blaze is planning to poison Cole's drink. Rex confesses their love to Skye one final time. Skye laughs it off. Rex goes very quiet.",
    timeline_phase: "crime" as const,
    beat_type: "twist" as const
  },
  {
    beat_number: 4,
    event_title: "Blaze Poisons The Drink",
    description: "High and heartbroken, Blaze slips sedatives mixed with a lethal dose into a glass intended for Cole during the pre-toast drinks set-up. Mara notices Blaze acting strangely near the bar and alerts Jordan. Jordan files it away as useful content rather than a crisis.",
    timeline_phase: "crime" as const,
    beat_type: "clue_reveal" as const
  },
  {
    beat_number: 5,
    event_title: "Rex Switches The Glasses",
    description: "Just before the champagne toast, Rex switches Skye's glass with Cole's poisoned one — a final, twisted act of devotion. 'If I can't have her story, I'll be the ending.' Nobody sees it happen. The cameras are pointed the wrong way.",
    timeline_phase: "crime" as const,
    beat_type: "twist" as const
  },
  {
    beat_number: 6,
    event_title: "Skye Collapses",
    description: "Mid-toast, Skye drinks the champagne. Within minutes, she's pale, then unconscious, then still. The room descends into chaos. Blaze stands frozen — they know what's in that glass. But they also know who was supposed to drink it.",
    timeline_phase: "crime" as const,
    beat_type: "discovery" as const
  },
  {
    beat_number: 7,
    event_title: "The Cover-Up Unravels",
    description: "Jordan, always filming, caught fragments of everything. Mara's notes from glam. Rex's too-calm demeanor. Blaze's Googling history. The pieces start fitting together in ways nobody wants them to. A deleted security camera file is recovered. Its timestamp is damning.",
    timeline_phase: "investigation" as const,
    beat_type: "clue_reveal" as const
  },
  {
    beat_number: 8,
    event_title: "The Confession",
    description: "Rex, believing they've become part of Skye's legacy forever, leaves a voice note. 'Some people live for the camera. Some people die for it. Either way… I'm part of the story now.' It's the most chilling thing anyone in the room has ever heard.",
    timeline_phase: "resolution" as const,
    beat_type: "twist" as const
  }
];

export const DOA_CLUE_STRUCTURE = {
  round1: [
    { title: "The Threatening Text Chain", type: "screenshot", implication: "circumstantial", note: "Skye's DMs with an unknown number: 'You don't deserve the win. Everyone sees what you really are. Time someone did something about it.' The sender? Still unknown — but the contact name in Skye's phone says 'Don't answer.'" },
    { title: "Nova's Group Chat Screenshot", type: "screenshot", implication: "red_herring", note: "Nova in the cast group chat: 'Ik im an a**hole but thought you should know what your sister said...' with Skye's reply: 'As I said before, IDGAF.'" },
    { title: "Blaze's Google Search History", type: "physical", implication: "direct", note: "EyeSpy monitoring software retrieved from Blaze's phone: 'How to poison someone', 'How to spike a drink without taste', 'Do sedatives show up in blood test', 'Alcohol + sleeping pills dangerous?', 'Skye DOA cute edits'" },
    { title: "The Leaked DM Thread", type: "screenshot", implication: "circumstantial", note: "Blaze messages Skye: 'Ik we aren't speaking but did you see the GC?' Skye: 'yeah. wtf.' Blaze: 'Cole and I were together at the same time. I'm more devastated than you.' Skye: 'I can assure you, you're not.'" },
    { title: "Rikki's Side Chat", type: "screenshot", implication: "circumstantial", note: "Mara DMs Brooke: 'Should I just tell them?' Brooke: 'Either way, they deserve to know. Babe, they're gonna find out at some point. You should be the one. G would hate it.'" },
    { title: "The Seen-Zoned Warning", type: "screenshot", implication: "red_herring", note: "A private message to Skye from 'RealFan_Rex': 'The reunion's gonna set someone off.' Skye's response: SEEN. No reply." },
    { title: "The Main Cast Group Chat", type: "screenshot", implication: "circumstantial", note: "The full cast GC blows up: 'Wow... you couldn't keep your legs crossed, could you S' / 'Oh f*** off. Why are we talking about this in the main GC' / 'Actually, why are we talking about this at all.' Recorded from Zane's phone." },
    { title: "Mara's 'Don't Quote Me' Note", type: "physical", implication: "direct", note: "A handwritten sticky note found in the glam mirror: 'FYI — there was powder all over the corner of my makeup mirror. Pretty sure B used it while I stepped out. Handle it if you need to. Just don't put it on me. – M'" }
  ],
  round2: [
    { title: "Mara's Glam Room Memo", type: "physical", implication: "direct", note: "A production note in the glam room log: 'B spiralling. re: S & C. C and S were in closet for AGES. R still hovering. Watch them, seems unstable. You know what to do...'" },
    { title: "The Unsigned Note", type: "physical", implication: "red_herring", note: "A folded note found in the bar area: 'Try to get S to talk to ___. [Name crossed out]. You know what to do.'" },
    { title: "Jordan's Secret Recording", type: "testimony", implication: "direct", note: "Blaze's text to Skye: 'If I have to watch them stand next to you again I'll lose it. They think I won't do anything because the cameras are on. But I will. I'm done being quiet.'" },
    { title: "The Real Ones Group Chat", type: "screenshot", implication: "circumstantial", note: "Inner circle group chat: 'Blaze is in glam pacing like they're about to propose or explode. They deadass asked ME if Skye still talks about them. I saw them staring at the champagne bottles. Is B still on their meds...? I'm not tryna get roofied tonight.'" },
    { title: "Rex's Cheat Sheet Warning", type: "screenshot", implication: "circumstantial", note: "A DM from Rex to Mara: 'The reunion's gonna set someone off. If someone snaps, it won't be a surprise.'" },
    { title: "Skye's Final Text", type: "screenshot", implication: "direct", note: "Skye to Cole at 5:20PM: 'You okay? I feel like something's off. Let's talk before the toast...' Message: SEEN. No reply." },
    { title: "The Wardrobe Intercept", type: "testimony", implication: "direct", note: "Recovered audio from Jordan's phone (25.04 seconds): J: 'Mara said they were in wardrobe for 25 minutes. Just them. Cole and Skye.' B: 'You're joking.' J: 'I'm not. Brooke's about to combust... Might be good to get that on camera.' B: 'You'll get something.' [Recording cuts]" },
    { title: "Rex's Diary Entry", type: "secret", implication: "circumstantial", note: "Rex's personal notes app: 'Tonight felt kind of perfect. I actually think I'm happy — like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening...'"},
    { title: "The Deleted Security File", type: "physical", implication: "direct", note: "File: SEC CAM_4B [Bar Area]. Time: 5:40PM–6:05PM. Status: Permanently Deleted. Actioned by: jordan.p@doatv.tv. Reason: 'corrupted audio, unusable'. Jordan's quote: 'I just cut the section. It was mostly Mara ranting anyway — no good angles. Not worth a storyline.'" },
    { title: "Sibling Betrayal Text", type: "screenshot", implication: "red_herring", note: "Nova messages Zane: 'God I cannot believe she actually said that... especially after EVERYTHING I've done for her. I have an idea. Let's give her a taste of her own medicine. We look exactly the same.' Zane replies: 'God I think I'm in love with you.'" }
  ],
  round3: [
    { title: "The Burning Heart Emoji Chain", type: "screenshot", implication: "circumstantial", note: "A thread of messages between Skye and an unsaved contact. Only emojis remain — heart on fire, repeated. The final message is from Skye, with no reply. Timestamp: 5:52PM — eight minutes before the toast." },
    { title: "Rex's Final Confession Draft", type: "secret", implication: "direct", note: "A note found in Rex's drafts: '...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well… there's only one way this ends. -R'" },
    { title: "Skye's Last Note", type: "physical", implication: "red_herring", note: "A cocktail napkin with Skye's handwriting found near the bar: 'If this goes wrong tonight — it was always going to. -S'. The ink is smudged at the edge." },
    { title: "The Recorded Argument", type: "testimony", implication: "direct", note: "A 32-second voice memo recovered from Zane's phone — recorded unintentionally. Multiple voices: 'You think this is just content?! This is my life.' / 'You said to post it. Don't backpedal now.' / 'They already think you hooked up anyway. This just confirms it.' / *Pause* / 'I never want to see you again.' / 'You're so dramatic.' / 'You're both on camera.'" },
    { title: "The Love Rejection Note", type: "secret", implication: "direct", note: "Handwritten on hotel stationery, found crumpled near the champagne table: '...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends.' — No signature, but the handwriting matches Rex's fan mail." },
    { title: "Mara's Witnessed Moment", type: "testimony", implication: "circumstantial", note: "Mara's voice note to Jordan (sent at 6:01PM, 3 minutes before the toast): 'Something isn't right. Rex was at the bar alone for like two minutes right when nobody was looking. Just standing there. Switching something. I thought it was their glass. Jordan, call me back.'" },
    { title: "The Glass Switch Photo", type: "physical", implication: "direct", note: "A blurry photo timestamped 6:03PM recovered from a guest's phone. In the background, barely visible: a figure in orange (Rex's colour code) moving two champagne flutes on the serving tray, swapping their positions." }
  ],
  round4: [
    { title: "Rex's Confessional Voice Note", type: "testimony", implication: "direct", note: "45.21 seconds. Rex's voice, calm and measured: 'I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came… I directed it to go exactly where it needed to. It's wild how things just fall into place. Some people live for the camera. Some people die for it. Either way… I'm part of the story now.'" },
    { title: "The Producer's Smoking Gun", type: "testimony", implication: "direct", note: "Recovered audio from Jordan's laptop (38.64 seconds — 5:52PM Security Cam Audio): Mara: 'I'm serious — Blaze is not okay. They're twitchy, muttering stuff, I'm pretty sure they mixed something into the drinks.' Jordan: 'And you're telling me this like it's a problem?' Mara: 'Yes, Jordan. It's a liability. What if they snap?' Jordan: (laughs) 'Then we get the footage. You want safe, go film MasterChef.'" }
  ]
};

export const DOA_RELATIONSHIPS = [
  { char1: "Skye", char2: "Nova", dynamics: ["family"], notes: "Sisters — but Nova lives entirely in Skye's shadow and resents every second of it." },
  { char1: "Skye", char2: "Blaze", dynamics: ["romantic", "rivals"], notes: "The ex. They were the golden couple of the show until Blaze kissed someone else 'for the challenge'." },
  { char1: "Skye", char2: "Cole", dynamics: ["romantic", "co-workers"], notes: "Secretly hooking up since the show ended. The catalyst for Blaze's breakdown." },
  { char1: "Skye", char2: "Rex", dynamics: ["co-workers"], notes: "Rex is obsessively devoted to Skye; Skye laughed off Rex's love confession an hour before dying." },
  { char1: "Skye", char2: "Jordan", dynamics: ["co-workers"], notes: "Jordan planted as a producer to stir drama around Skye; knows all her secrets." },
  { char1: "Skye", char2: "Brooke", dynamics: ["rivals", "besties"], notes: "Were close allies on the show — until Skye won and stopped texting back." },
  { char1: "Skye", char2: "Zane", dynamics: ["co-workers"], notes: "Skye's edit overshadowed Zane's best footage; Zane holds a low-grade grudge." },
  { char1: "Skye", char2: "Mara", dynamics: ["friends", "co-workers"], notes: "Skye ghosted Mara post-show despite a close friendship during filming." },
  { char1: "Blaze", char2: "Rex", dynamics: ["rivals"], notes: "Both obsessed with Skye but for very different reasons. Rex knows Blaze's plan." },
  { char1: "Blaze", char2: "Cole", dynamics: ["rivals"], notes: "Blaze discovered Cole and Skye's secret hookups — the trigger for the whole plot." },
  { char1: "Jordan", char2: "Mara", dynamics: ["co-workers"], notes: "Mara tried to alert Jordan about Blaze's behaviour; Jordan used it as entertainment." },
  { char1: "Brooke", char2: "Nova", dynamics: ["besties"], notes: "Bonded over being sidelined by Skye. Nova promised to 'handle it'." },
  { char1: "Zane", char2: "Nova", dynamics: ["romantic", "co-workers"], notes: "Flirtatious and chaotic; Nova suggested they 'give Skye a taste of her own medicine'." },
  { char1: "Cole", char2: "Jordan", dynamics: ["co-workers", "friends"], notes: "Jordan tipped Cole off about Blaze's behaviour — mainly for the footage." },
  { char1: "Rex", char2: "Mara", dynamics: ["co-workers"], notes: "Mara noticed Rex at the bar right before the toast and sent a warning to Jordan." },
  { char1: "Brooke", char2: "Mara", dynamics: ["friends"], notes: "Drinking buddies who gossip about cast drama and production secrets." }
];

export const DOA_MOTIVES = [
  { char: "Nova", type: "power", strength: "moderate", notes: "Tired of being Skye's shadow. Wants the spotlight — but murder wasn't on her mood board." },
  { char: "Blaze", type: "love", strength: "critical", notes: "Prepared the poison for Cole, not Skye — but their jealousy and drug use made them a puppet in Rex's hands." },
  { char: "Cole", type: "fear", strength: "low", notes: "Knew Blaze was unstable; said nothing because it made for good TV." },
  { char: "Rex", type: "love", strength: "critical", notes: "Rejected by Skye for the last time, Rex switched the glasses — a twisted act of 'being part of her story forever'." },
  { char: "Jordan", type: "greed", strength: "high", notes: "Deleted the security camera footage. Knew something was wrong and let it happen for the content." },
  { char: "Brooke", type: "revenge", strength: "high", notes: "Never forgave Skye for stealing the win and going silent. Had motive, opportunity, and a very convenient alibi." },
  { char: "Zane", type: "revenge", strength: "moderate", notes: "Had most of their footage cut from the reunion special. Came with a vengeance arc but no actual plan." },
  { char: "Mara", type: "revenge", strength: "moderate", notes: "Ghosted by Skye post-show after a deep friendship. Sent the warning — but too late." }
];
