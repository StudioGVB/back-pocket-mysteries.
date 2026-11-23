export type FAQCategory = 
  | "What We Do" 
  | "Pricing & Purchasing" 
  | "Gameplay & Hosting" 
  | "Customization" 
  | "Delivery & Setup" 
  | "Themes & Content";

export interface FAQ {
  q: string;
  a: string;
  category: FAQCategory;
}

export const faqsData: FAQ[] = [
  // What We Do
  {
    category: "What We Do",
    q: "What is Back Pocket Mysteries?",
    a: "We create personalized murder mystery party packs powered by human-crafted storylines and AI customization. Unlike generic kits with pre-set fictional names, our engine casts your real guests (or a hybrid/fictional cast) into iconic archetypes, weaving their real names, relationships, and inside jokes into a 100% online live mobile mystery experience in ~20 minutes."
  },
  {
    category: "What We Do",
    q: "How is this different from a standard boxed kit?",
    a: "Standard kits force your friends to memorize pre-written strangers like 'Lord Bartholomew.' We cast your actual guests into dramatic roles (like 'The Star', 'The Ex', or 'The Producer') using their real names. The clues, motives, leaked group-chat texts, visual CCTV stills, and audio wiretaps are generated specifically around your cast."
  },
  {
    category: "What We Do",
    q: "How long does it take to get my customized pack?",
    a: "Once you lock in your cast and complete checkout, your customized murder mystery pack and live interactive game room are generated and ready in ~20 minutes (we email you the moment it's ready!)."
  },
  {
    category: "What We Do",
    q: "Do you write these from scratch every time?",
    a: "Every core mystery plot, timeline, alibi, and clue chain is architected by a human mystery writer first so the logic is complex and 100% watertight. Our AI engine then tailors the character booklets, visual evidence, and voice wiretaps around your specific guest roster."
  },
  {
    category: "What We Do",
    q: "Is this suitable for a dinner party?",
    a: "Absolutely! Our mysteries are structured into 3 dramatic rounds plus the Final Accusation & Reveal, which map seamlessly to arrival drinks, starter, main course, and dessert."
  },
  {
    category: "What We Do",
    q: "Can I use this for a corporate team-building event?",
    a: "Yes! Our mysteries are a huge hit for team offsites and work socials. Each theme in our catalog clearly displays its Difficulty and Vibe/Spice rating so you can pick a work-friendly mystery that keeps everyone laughing and collaborating."
  },
  {
    category: "What We Do",
    q: "Can I solve a mystery solo, as a couple, or with just 2–4 friends (like a detective case file)?",
    a: "Yes! You can play any mystery in Couch Detective / Case-File Mode (1–5 players, zero acting required). Every mystery features at least 6 interlocking characters (1 Victim + 5 Suspects) so the alibis and motives tangle properly. In Case-File Mode, you can cast your real friends, use a Hybrid mix of yourselves + auto-filled fictional suspects, or generate a 100% Fictional Mystery Cast in one click, and inspect all character dossiers, texts, CCTV photos, and audio wiretaps together!"
  },
  {
    category: "What We Do",
    q: "What if we don't have enough friends for all 6+ character roles, or don't want to create profiles for everyone?",
    a: "Our 4-Step Casting Wizard gives you 3 flexible options: (1) All Friend Profiles (cast real friends into every role), (2) Hybrid Mode (pick just yourselves or 2–4 friends and we automatically fill the remaining slots with ready-made Fictional Mystery Suspects), or (3) 100% Fictional Mystery Cast (instant zero-prep setup with fictional characters, studio portraits, and accents)."
  },
  {
    category: "What We Do",
    q: "Do I need acting experience to play?",
    a: "Not at all. In Dinner Party Roleplay Mode, your character booklet gives you clear round-by-round talking points, juicy secrets to hide, and questions to ask. Or, if your group prefers zero acting, you can solve all the character files and clues together in Couch Detective / Case-File Mode!"
  },
  {
    category: "What We Do",
    q: "Are these escape rooms?",
    a: "No. While there is forensic evidence, leaked messages, and timelines to piece together, this is a social deduction and investigative mystery game focused on alibis, motives, and evidence rather than physical padlocks."
  },
  {
    category: "What We Do",
    q: "Is it a script we just read out loud?",
    a: "No! While each round has structured prompts and dramatic reveals, the core of the game involves mingling, interrogating suspects (or cross-referencing dossiers in Case-File Mode), and catching the killer in a lie using the evidence drops."
  },
  {
    category: "What We Do",
    q: "Can I play this over Zoom or virtual calls?",
    a: "Yes! Since every mystery runs in a 100% online live 6-digit Game PIN lobby that guests can join from any phone, tablet, or laptop browser, it works brilliantly both in-person and on Zoom."
  },

  // Pricing & Purchasing
  {
    category: "Pricing & Purchasing",
    q: "How much does a custom mystery cost?",
    a: "We charge a single flat one-time price per event based on the mystery's character cast bracket: Basic (up to 6 characters), Premium (up to 10 characters), or Grand (up to 16 characters). There are $0 per-player add-on fees and no subscriptions required."
  },
  {
    category: "Pricing & Purchasing",
    q: "What is the difference between Basic, Premium, and Grand tiers?",
    a: "Every tier includes 100% of our features — human-written plot architecture, AI guest personalization, interactive text/CCTV/audio clues, Kahoot-style live mobile lobby, and Spoiler-Free Host Mode. The tiers simply correspond to the number of character roles in the story: Basic (up to 6 characters), Premium (up to 10 characters), or Grand (up to 16 characters)."
  },
  {
    category: "Pricing & Purchasing",
    q: "Why does every mystery feature at least 6 characters in the story?",
    a: "To make a murder mystery genuinely challenging and impossible to guess in Round 1, the story needs at least 6 interlocking characters (1 Victim + 5 Suspects) so their timelines, alibis, and red herrings tangle together. If you have fewer than 6 people playing in the room, simply choose Hybrid Mode or Fictional Cast Mode during setup to fill the remaining suspect dossiers!"
  },
  {
    category: "Pricing & Purchasing",
    q: "Do you offer physical boxed sets?",
    a: "We are a 100% online digital platform — zero printing required! You get access to our Kahoot-style Live Mobile Playroom where guests join via a 6-digit PIN on their phones to view their character dossiers, CCTV evidence, and audio wiretaps."
  },
  {
    category: "Pricing & Purchasing",
    q: "What if I need to change my guest list after I purchase?",
    a: "We know guest lists change! You can reassign guests on your Manage Cast page before Round 1 starts, or reach out to our support team within 24 hours if you need help updating your roster."
  },
  {
    category: "Pricing & Purchasing",
    q: "Can I buy a mystery as a gift for someone else?",
    a: "Yes! You can purchase a pack and use the '🔁 Transfer Host' button inside My Mysteries to transfer full host ownership to the recipient's email address."
  },
  {
    category: "Pricing & Purchasing",
    q: "Do you offer refunds?",
    a: "Because our products are highly customized digital downloads generated specifically for your cast upon purchase, we generally cannot offer refunds once the pack is generated. However, if there is a technical issue with your pack, contact us and we will fix it immediately."
  },
  {
    category: "Pricing & Purchasing",
    q: "Do I need a monthly subscription to play?",
    a: "No! Every mystery package is a simple one-time purchase with lifetime access to your customized story in My Mysteries (Stories). You never get locked into a monthly subscription."
  },
  {
    category: "Pricing & Purchasing",
    q: "What payment methods do you accept?",
    a: "We accept all major credit and debit cards (Visa, Mastercard, Amex) as well as Apple Pay via our secure Stripe checkout, automatically formatted in your local currency (GBP, USD, AUD, EUR, CAD, NZD)."
  },
  {
    category: "Pricing & Purchasing",
    q: "Are there any hidden fees?",
    a: "None. The single flat package price you see on the Pricing page for your character cast bracket is the final price."
  },

  // Gameplay & Hosting
  {
    category: "Gameplay & Hosting",
    q: "Can the host play along as a character?",
    a: "Yes! Our Spoiler-Free Host Mode hides the killer's identity and secret solution behind a blur shield so you can cast yourself in a full suspect role and solve the murder alongside your guests."
  },
  {
    category: "Gameplay & Hosting",
    q: "How long does a game typically last?",
    a: "Every mystery typically lasts 1.5 to 3 hours across 3 investigation rounds plus the Final Accusation & Reveal - regardless of whether you choose Basic (up to 6 characters), Premium (up to 10 characters), or Grand (up to 16 characters)."
  },
  {
    category: "Gameplay & Hosting",
    q: "How do I know the difficulty and spice level of a mystery?",
    a: "Every mystery in our catalog displays its Difficulty rating (Easy, Medium, or Hard) and Vibe / Spice rating right on the story card so you can pick the exact tone that suits your group."
  },
  {
    category: "Gameplay & Hosting",
    q: "How many rounds are there?",
    a: "Our games are structured into 3 investigation rounds plus the Final Reveal: Round 1 (Introductions, Motives & The Incident), Round 2 (Crime Scene & Leaked Evidence), Round 3 (Deep Secrets & Final Interrogations), and the Final Vote & Reveal."
  },
  {
    category: "Gameplay & Hosting",
    q: "What if we have more than 6 guests (or extra friends / last-minute plus-ones show up on party night)?",
    a: "Everyone can play! Beyond the core character roles in your mystery, unlimited extra guests can join the live Game PIN on their phones as '🕵️ Detective [Their Name]' at $0 extra cost. They receive an official Detective Briefing with tailored interrogation questions for every suspect in the room, see every live clue drop on their phone, vote in every round, and compete on the final Detective Leaderboard!"
  },
  {
    category: "Gameplay & Hosting",
    q: "Do players get eliminated if they are 'killed'?",
    a: "Nobody sits on the sidelines! Even the Victim still participates in the investigation and submits their round-by-round theories to help catch their own killer."
  },
  {
    category: "Gameplay & Hosting",
    q: "What if someone figures it out in the first 5 minutes?",
    a: "They won't! Critical evidence is gated behind the 3-round structure. Even if they have a strong suspicion, they won't have the decisive forensic proof until Round 3."
  },
  {
    category: "Gameplay & Hosting",
    q: "Is there a specific order we need to follow?",
    a: "The Host Guide and Live Playroom provide a clear, step-by-step order for each round. Within the rounds, players can mingle and question each other in any order."
  },
  {
    category: "Gameplay & Hosting",
    q: "What if my guests are shy or don't want to roleplay?",
    a: "That's perfectly fine! Because they are playing stylized versions of themselves using their own names, they don't need to put on fake accents or memorize a script. Or you can choose Couch Detective / Case-File Mode where everyone investigates the files together with zero roleplay!"
  },
  {
    category: "Gameplay & Hosting",
    q: "Do we need costumes?",
    a: "Costumes are optional but highly recommended! Every character role comes with a tailored 'What to Wear' outfit guide (matched to your guest's gender) to elevate the atmosphere."
  },
  {
    category: "Gameplay & Hosting",
    q: "Can players lie during the game?",
    a: "The murderer is the ONLY person allowed to lie outright. Everyone else must tell the truth about their whereabouts, though they can be evasive about their secret subplots until confronted with evidence!"
  },

  // Customization
  {
    category: "Customization",
    q: "How much detail do I need to provide about my guests?",
    a: "As much or as little as you want! You can enter your friends' names, appearances, and inside jokes, or use our 1-click Fictional Mystery Cast if you want zero setup."
  },
  {
    category: "Customization",
    q: "What if I don't want to create profiles for 6 people?",
    a: "No problem! In Step 2 of our Casting Wizard, simply select Hybrid Mode (cast just yourself or 2–3 friends and let us auto-fill the rest with fictional suspects) or 100% Fictional Cast Mode."
  },
  {
    category: "Customization",
    q: "Can I make myself the murderer?",
    a: "Our engine assigns the suspect roles behind Spoiler-Free Host Mode so the killer's identity remains a genuine 100% surprise for everyone, including the host!"
  },
  {
    category: "Customization",
    q: "Why don't the characters on the theme page have pre-set first names?",
    a: "Because your cast brings the roles to life! Instead of forcing your friend to pretend his name is 'Chadwick,' he becomes 'Marco - The Ex' or 'Chloe - The Star' (or you can populate the roles with our ready-made Fictional Mystery Suspects)."
  },
  {
    category: "Customization",
    q: "How do you incorporate inside jokes?",
    a: "There is a dedicated field for 'Character Traits / Inside Jokes' in each Guest Profile. Our engine weaves these details directly into character dossiers and party prompts."
  },
  {
    category: "Customization",
    q: "Can I customize guest avatars and visual appearances?",
    a: "Yes! On all package tiers, our Guest Profile editor lets you customize each guest's physical traits (hair, eye color, height, ethnicity, build, and accent) so their AI costume portrait and CCTV crime-scene photos look just like them."
  },
  {
    category: "Customization",
    q: "How do the AI visual clues and voice wiretaps work?",
    a: "Once you lock in your cast, our AI generates head-to-toe era costume portraits for each character, places those exact characters into the crime-scene CCTV and visual evidence photos, and synthesizes multi-speaker audio wiretaps matched to each character's gender and regional accent!"
  },
  {
    category: "Customization",
    q: "What if I want to edit a friend's appearance before locking in the cast?",
    a: "You can click the edit button on any friend card right inside the Casting Wizard to update their hair, eye color, accent, or bio on the fly."
  },
  {
    category: "Customization",
    q: "Can you make it a surprise party mystery?",
    a: "Yes! You can cast your guests privately in your account and share their character links or the 6-digit Game PIN right when the party starts."
  },
  {
    category: "Customization",
    q: "Are more themes coming soon?",
    a: "Yes! We only display playtested, human-written packages on our Themes page and release new mystery themes regularly."
  },

  // Delivery & Setup
  {
    category: "Delivery & Setup",
    q: "How is the mystery delivered?",
    a: "Inside your My Mysteries (Stories) dashboard in ~15–20 minutes! We also send you an email with your direct Host Hub link the moment your custom portraits, visual clues, and audio wiretaps finish generating."
  },
  {
    category: "Delivery & Setup",
    q: "Do I have to print anything?",
    a: "No! Every mystery is 100% online and paperless. Guests simply enter your 6-digit Game PIN (or open their character link) on their phones to view their character dossiers, leaked group-chat clues, CCTV photos, and audio wiretaps live."
  },
  {
    category: "Delivery & Setup",
    q: "How long does it take to set up before the party?",
    a: "Setup is instant! You can text or WhatsApp your guests their spoiler-free character invite links before the party, and when everyone arrives, just click '🚀 Start Game' to open the live 6-digit PIN lobby."
  },
  {
    category: "Delivery & Setup",
    q: "Can I share character invites via WhatsApp or text?",
    a: "Absolutely! From your Ready Hub, you can copy personalized pre-party character links (with each guest's spoiler-free blurb and outfit guide) to drop straight into WhatsApp, iMessage, or email."
  },
  {
    category: "Delivery & Setup",
    q: "What devices work with the Live Mobile Lobby?",
    a: "Any smartphone, tablet, or laptop browser — no app download or guest account login required."
  },
  {
    category: "Delivery & Setup",
    q: "Will I get to see the files before the party?",
    a: "Yes, as the host you have full access to your Ready Hub and materials, while Spoiler-Free Host Mode keeps the killer's identity and Round 1–3 clues locked until you start the game!"
  },

  // Themes & Content
  {
    category: "Themes & Content",
    q: "What is the age and spice rating for your games?",
    a: "Every mystery is calibrated across 4 clear Spice Levels: Clean (Safe For Work & Family — full murder, revenge, and blackmail motives with zero romantic affairs and zero cussing), Mild (PG-13 romantic affairs and betrayal with 100% clean dialogue and zero cussing), Spicy (18+ cussing, catfights, and sex-tape scandal), and Filthy (18+ unfiltered after-dark chaos)."
  },
  {
    category: "Themes & Content",
    q: "Are there content warnings or trigger warnings?",
    a: "Yes, each theme page lists its Difficulty (Easy = 1 Killer / 1 Subplot, Medium = 1 Killer / Multi-Alibi Timestamps, Hard = Killer + Secret Accomplice) and its Spice Level badge so you know the exact dialogue and roleplay boundaries before booking."
  },
  {
    category: "Themes & Content",
    q: "Do you have work-friendly or family-friendly themes?",
    a: "Yes! Look for the Clean (Safe For Work & Family) badge—you still get a full high-stakes murder mystery with death, revenge, blackmail, and sabotage, without co-workers or family members ever having to roleplay a love affair or read profanity. For friend groups and couples who want romantic affairs without swearing, choose Mild."
  },
  {
    category: "Gameplay & Hosting",
    q: "How does the Host PIN and live round controller work?",
    a: "When you are ready to start your party, unlock the Host Controls using your Host PIN. Advancing from Round 1 to Round 2 and Round 3 unlocks the corresponding clues, audio voice notes, and secret prompts for your guests in real time."
  },
  {
    category: "Customization",
    q: "Can I swap or reassign characters to different guests before the party starts?",
    a: "Yes! You can reassign guests to any character on your Manage Cast page anytime before Round 1 begins, and send updated digital invite links straight from your Host Hub."
  },
  {
    category: "Delivery & Setup",
    q: "Where do I go if I need help with my mystery or have a technical issue?",
    a: "You can raise a support ticket directly inside the Builder / Account Support Portal (complete with screenshots and severity priority) or email us anytime at hello@backpocketgames.com. Our team responds to all tickets within 48 hours."
  }
];

