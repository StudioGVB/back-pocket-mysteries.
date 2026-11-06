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
    a: "We create personalized murder mystery party packs powered by human-crafted storylines and AI customization. Unlike generic kits with pre-set fictional names, our engine casts your real guests into iconic archetypes — weaving their real names, relationships, and inside jokes into a complete printable & live mobile mystery experience in ~30 minutes."
  },
  {
    category: "What We Do",
    q: "How is this different from a standard boxed kit?",
    a: "Standard kits force your friends to memorize pre-written strangers like 'Lord Bartholomew.' We cast your actual guests into dramatic roles (like 'The Star', 'The Ex', or 'The Producer') using their real names. The clues, motives, leaked group-chat texts, and audio wiretaps are generated specifically around your group dynamics."
  },
  {
    category: "What We Do",
    q: "How long does it take to get my customized pack?",
    a: "Once you input your guest details and complete checkout, your customized murder mystery pack and live interactive game room are generated and ready in ~30 minutes."
  },
  {
    category: "What We Do",
    q: "Do you write these from scratch every time?",
    a: "We start with human-crafted mystery architectures — like our flagship Reality TV Reunion mystery, Love On The Rocks — and our AI engine adapts the scripts, character booklets, alibis, and evidence around your specific guest roster."
  },
  {
    category: "What We Do",
    q: "Is this suitable for a dinner party?",
    a: "Absolutely! Our mysteries are structured into 3 dramatic rounds plus the Final Accusation & Reveal, which map seamlessly to arrival drinks, starter, main course, and dessert."
  },
  {
    category: "What We Do",
    q: "Can I use this for a corporate team-building event?",
    a: "Yes! Our mysteries are a huge hit for team offsites and work socials. You can also adjust the Spice Level to 'Mild (PG-13)' in the builder so the drama stays work-friendly while keeping everyone laughing and collaborating."
  },
  {
    category: "What We Do",
    q: "Do I need acting experience to play?",
    a: "Not at all. Your character booklet gives you clear round-by-round talking points, juicy secrets to hide, and questions to ask. You can lean into the roleplay as much or as little as you want."
  },
  {
    category: "What We Do",
    q: "Are these escape rooms?",
    a: "No. While there is forensic evidence, leaked messages, and timelines to piece together, this is a social deduction party game focused on conversation, accusations, and character interaction rather than physical padlocks."
  },
  {
    category: "What We Do",
    q: "Is it a script we just read out loud?",
    a: "No! While each round has structured prompts and dramatic reveals, the core of the game involves mingling, interrogating suspects, and catching the killer in a lie using the evidence drops."
  },
  {
    category: "What We Do",
    q: "Can I play this over Zoom or virtual calls?",
    a: "Yes! Since every mystery includes both downloadable PDFs and a live 6-digit Game PIN lobby that guests can join from any phone or laptop, it works brilliantly both in-person and on Zoom."
  },

  // Pricing & Purchasing
  {
    category: "Pricing & Purchasing",
    q: "How much does a custom mystery cost?",
    a: "We charge a single flat price per event based on your player count bracket: Basic (4–6 players), Premium (4–10 players), or Grand (4–16 players). Check our Pricing page for live regional pricing in your currency."
  },
  {
    category: "Pricing & Purchasing",
    q: "What is the difference between Basic, Premium, and Grand tiers?",
    a: "Every single-event tier includes 100% of our features — AI guest personalization, interactive text/audio clues, Kahoot-style live mobile lobby, Spoiler-Free Host Mode, and any complexity or spice level. The tiers simply scale the number of custom character booklets (4–6, 4–10, or 4–16 suspects) and expand the interlocking web of relationships, motives, and subplots to fit your party size."
  },
  {
    category: "Pricing & Purchasing",
    q: "Why are packages priced by player bracket?",
    a: "Larger groups require generating more custom character booklets, personalized alibis, and a wider conflict graph of interlocking relationships and subplots so every single guest in the room is deeply involved in the mystery."
  },
  {
    category: "Pricing & Purchasing",
    q: "Do you offer physical boxed sets?",
    a: "We are a 100% digital & print-ready platform. You get immediate access to both our Kahoot-style Live Mobile Playroom (guests join via a 6-digit PIN on their phones) and formatted PDF booklets you can print at home."
  },
  {
    category: "Pricing & Purchasing",
    q: "What if I need to change my guest list after I purchase?",
    a: "We know guest lists change! You can reassign guests on your Manage Cast page before Round 1 starts, or reach out to our support team within 24 hours if you need help updating your roster."
  },
  {
    category: "Pricing & Purchasing",
    q: "Can I buy a mystery as a gift for someone else?",
    a: "Yes! You can purchase a pack and pass the access or the final PDFs to the organizer. It makes a fantastic gift for birthdays or hens nights."
  },
  {
    category: "Pricing & Purchasing",
    q: "Do you offer refunds?",
    a: "Because our products are highly customized digital downloads generated immediately upon purchase, we generally cannot offer refunds once the pack is generated. However, if there is a technical issue with your pack, contact us and we will fix it immediately."
  },
  {
    category: "Pricing & Purchasing",
    q: "Are there any subscription options?",
    a: "Yes, we offer an 'Unlimited' subscription tier designed for event planners, venues, and professional hosts who want to generate multiple mysteries per month."
  },
  {
    category: "Pricing & Purchasing",
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards (Visa, Mastercard, Amex) as well as Apple Pay and Google Pay via our secure Stripe checkout."
  },
  {
    category: "Pricing & Purchasing",
    q: "Are there any hidden fees?",
    a: "None. The single flat package price you see on the Pricing page for your player count bracket is the final price."
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
    a: "Every mystery typically lasts 1.5 to 3 hours across 3 investigation rounds plus the Final Accusation & Reveal — regardless of whether you choose Basic (4–6 players), Premium (4–10 players), or Grand (4–16 players)."
  },
  {
    category: "Gameplay & Hosting",
    q: "What is the difficulty level like?",
    a: "In the builder, you can choose between Light (casual & social), Standard (balanced deduction), or Complex (deep alibis & layered red herrings) on any package tier."
  },
  {
    category: "Gameplay & Hosting",
    q: "How many rounds are there?",
    a: "Our games are structured into 3 investigation rounds plus the Final Reveal: Round 1 (Introductions, Motives & The Incident), Round 2 (Crime Scene & Leaked Evidence), Round 3 (Deep Secrets & Final Interrogations), and the Final Vote & Reveal."
  },
  {
    category: "Gameplay & Hosting",
    q: "Do players get eliminated if they are 'killed'?",
    a: "Nobody sits on the sidelines! The Story Catalyst / Victim plays a full Round 1 suspect role with secret objectives, and once the murder occurs at the end of Round 1, they immediately transition into leading the investigation alongside everyone else."
  },
  {
    category: "Gameplay & Hosting",
    q: "What if someone figures it out in the first 5 minutes?",
    a: "They won't! Critical evidence is gated behind the round structure. Even if they have a strong suspicion, they won't have the proof until the final rounds."
  },
  {
    category: "Gameplay & Hosting",
    q: "Is there a specific order we need to follow?",
    a: "The Host Guide provides a clear, step-by-step order for the rounds. Within the rounds, players can mingle and question each other in any order."
  },
  {
    category: "Gameplay & Hosting",
    q: "What if my guests are shy or don't want to roleplay?",
    a: "That's perfectly fine. Because they are playing stylized versions of themselves using their own names, they don't need to put on fake accents or memorize a script. They can focus on the clues and gossip."
  },
  {
    category: "Gameplay & Hosting",
    q: "Do we need costumes?",
    a: "Costumes are optional but highly recommended! Every character role comes with a tailored costume & prop suggestion (like gold-rimmed sunglasses, a headset, or a red-carpet look) to elevate the atmosphere."
  },
  {
    category: "Gameplay & Hosting",
    q: "Can players lie during the game?",
    a: "The murderer is the ONLY person allowed to lie outright. Everyone else must tell the truth, though they can be evasive or refuse to answer until pressured!"
  },

  // Customization
  {
    category: "Customization",
    q: "How much detail do I need to provide about my guests?",
    a: "Just their names and optional personality traits, quirks, or relationships (e.g., 'Sarah - Bride's sister, always loses her phone'). Characters don't have pre-set fictional names because your guests bring the roles to life!"
  },
  {
    category: "Customization",
    q: "What if I don't know everyone's relationships?",
    a: "That's okay! You can leave relationships blank or add guests later on your Manage Cast page. Our engine builds interlocking dynamics between the roles automatically."
  },
  {
    category: "Customization",
    q: "Can I make myself the murderer?",
    a: "Our engine assigns the killer role dynamically and locks it behind Spoiler-Free Host Mode so the ending remains a genuine surprise for everyone, including the host."
  },
  {
    category: "Customization",
    q: "Why don't the characters on the theme page have first names?",
    a: "Because your guests ARE the cast! Instead of forcing your friend to pretend his name is 'Chadwick,' he becomes 'Marco — The Ex' or 'Chloe — The Star.' Every role is an iconic archetype tailored around your real guest's name."
  },
  {
    category: "Customization",
    q: "How do you incorporate inside jokes?",
    a: "There is a dedicated field for 'Character Traits / Inside Jokes' in the Guest Roster. Our engine weaves these details directly into dialogue prompts, alibis, and leaked gossip."
  },
  {
    category: "Customization",
    q: "Can I customize guest avatars and visual appearances?",
    a: "Yes! On all package tiers, our Guest Roster & Avatar Builder lets you customize each guest's visual appearance (hair, features, style, and accessories) or upload a portrait for their suspect profile card."
  },
  {
    category: "Customization",
    q: "Can I adjust the maturity or 'Spice Level' of the mystery?",
    a: "Yes! You can choose between Mild (PG-13 work/family friendly), Spicy (scandalous reality-TV gossip & messy exes), or Extra Juicy (unhinged hens-night energy) in the builder."
  },
  {
    category: "Customization",
    q: "What if the AI generates something inaccurate about a guest?",
    a: "Because the game is a stylized fiction, exaggerated traits play off as hilarious alternate-universe drama. You can also edit or regenerate your mystery from your Host Dashboard."
  },
  {
    category: "Customization",
    q: "Can you make it a surprise party mystery?",
    a: "Yes! You can cast your guests privately in the dashboard and hand out the character envelopes or share the 6-digit Game PIN right when the party starts."
  },
  {
    category: "Customization",
    q: "Are more themes coming soon?",
    a: "Yes! We only display active, playtested packages on our Themes page — starting with our flagship Reality TV Reunion mystery, Love On The Rocks — and release new themes regularly."
  },

  // Delivery & Setup
  {
    category: "Delivery & Setup",
    q: "How is the mystery delivered?",
    a: "Inside your Host Dashboard in ~30 minutes! You get both a print-ready PDF kit (Host Guide, Character Booklets, Evidence Cards) AND a live Kahoot-style Game PIN lobby so guests can play directly on their phones."
  },
  {
    category: "Delivery & Setup",
    q: "Do I have to print everything?",
    a: "No! Guests can scan a QR code or enter your 6-digit Game PIN on their phones to view their secret round objectives, leaked group-chat clues, and audio wiretaps live — or you can print the PDF booklets if you love paper envelopes."
  },
  {
    category: "Delivery & Setup",
    q: "How much ink will printing this take?",
    a: "Our printable PDF booklets are cleanly formatted for standard home printers, or you can go 100% paperless using the Live Mobile Lobby."
  },
  {
    category: "Delivery & Setup",
    q: "How long does it take to set up before the party?",
    a: "If playing via the Live Mobile Lobby, setup is instant — just display or share your 6-digit Game PIN. If printing paper booklets, allow 15–20 minutes to print and slip them into envelopes."
  },
  {
    category: "Delivery & Setup",
    q: "Can I share character invites via WhatsApp or text?",
    a: "Absolutely! From your Manage Cast dashboard, you can copy personalized invite links or share character details directly via WhatsApp, iMessage, or email."
  },
  {
    category: "Delivery & Setup",
    q: "What devices work with the Live Mobile Lobby?",
    a: "Any smartphone, tablet, or laptop browser — no app download required. Plus, all downloadable files are standard PDFs."
  },
  {
    category: "Delivery & Setup",
    q: "Will I get to see the files before the party?",
    a: "Yes, as the host you have full access to your dashboard and materials, while Spoiler-Free Host Mode keeps the killer's identity hidden until the final reveal!"
  },

  // Themes & Content
  {
    category: "Themes & Content",
    q: "What is the age rating for your games?",
    a: "Our themes are rated 16+ by default. They contain references to murder, affairs, drinking, and adult drama, similar to a PG-13 or standard true crime podcast."
  },
  {
    category: "Themes & Content",
    q: "Are there content warnings or trigger warnings?",
    a: "Yes, each theme page lists specific content tags. We generally avoid graphic violence or sensitive real-world topics, keeping the tone fun and dramatic."
  },
  {
    category: "Themes & Content",
    q: "Can I request a milder or work-friendly (PG-13) version?",
    a: "Yes! While our themes are rated 16+ by default, you can select the 'Mild (PG-13)' Spice Level inside the builder to keep motives and gossip completely work-friendly and suitable for family/teen gatherings."
  },
  {
    category: "Gameplay & Hosting",
    q: "How does the Host PIN and live round controller work?",
    a: "When you are ready to start your party, unlock the Host Controls using your Host PIN. Advancing from Round 1 to Round 2 and Round 3 unlocks the corresponding clues, audio voice notes, and secret prompts for your guests in real time."
  },
  {
    category: "Customization",
    q: "Can I swap or reassign characters to different guests before the party starts?",
    a: "Yes! You can reassign guests to any character on your Manage Cast page anytime before Round 1 begins. You can also send updated digital invite links or print-ready character sheets straight from your dashboard."
  },
  {
    category: "Delivery & Setup",
    q: "Where do I go if I need help with my mystery or have a technical issue?",
    a: "You can raise a support ticket directly inside the Builder / Account Support Portal (complete with screenshots and severity priority) or email us anytime at hello@backpocketgames.com. Our team responds to all tickets within 48 hours."
  }
];

