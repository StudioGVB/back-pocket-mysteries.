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
    a: "We create highly personalized murder mystery party packs using AI. Unlike generic kits where you just read a script, our engine takes your real guest list, their names, relationships, and inside jokes, and weaves them into a complete, print-ready mystery experience in under 20 minutes."
  },
  {
    category: "What We Do",
    q: "How is this different from a standard boxed kit?",
    a: "Standard kits have pre-written characters like 'Lord Bartholomew.' We build the characters around your actual guests. Your friends play stylized versions of themselves, and the clues, motives, and evidence are generated specifically to match your group dynamics."
  },
  {
    category: "What We Do",
    q: "How long does it take to get my customized pack?",
    a: "Once you input your guest details and checkout, your complete, customized murder mystery pack is generated and ready to download in under 20 minutes."
  },
  {
    category: "What We Do",
    q: "Do you write these from scratch every time?",
    a: "We use robust, human-written theme templates (like a 1920s Speakeasy or Gala Heist) as the foundation. Our AI engine then heavily modifies the script, clues, and character arcs to perfectly fit your guest list."
  },
  {
    category: "What We Do",
    q: "Is this suitable for a dinner party?",
    a: "Absolutely! Our mysteries are designed to be played across 4 structured rounds, which perfectly map to a welcome drink, starter, main course, and dessert."
  },
  {
    category: "What We Do",
    q: "Can I use this for a corporate team-building event?",
    a: "Yes. The 'Gala Heist' and 'The Inheritance' themes are highly popular for corporate groups. They provide great interaction and problem-solving without the awkwardness of traditional icebreakers."
  },
  {
    category: "What We Do",
    q: "Do I need acting experience to play?",
    a: "Not at all. The character packets give you exactly what to say and what secrets to hide. You can lean into the roleplay as much or as little as you want."
  },
  {
    category: "What We Do",
    q: "Are these escape rooms?",
    a: "No. While there are clues to solve, this is a social deduction game focused on conversation, accusations, and character interaction, rather than solving physical puzzles or locks."
  },
  {
    category: "What We Do",
    q: "Is it a script we just read out loud?",
    a: "No! While there are scripted 'confessions' or intro statements, the core of the game involves mingling, questioning other players, and deciding who is lying based on the evidence drops."
  },
  {
    category: "What We Do",
    q: "Can I play this over Zoom or virtual calls?",
    a: "Yes! Since all our materials are provided digitally, you can easily email or message the character packets to your guests and display the evidence clues via screen share."
  },

  // Pricing & Purchasing
  {
    category: "Pricing & Purchasing",
    q: "How much does a custom mystery cost?",
    a: "Prices start from our Basic tier which covers up to 6 players, with additional costs per extra player. Check our Pricing page for the most up-to-date regional pricing."
  },
  {
    category: "Pricing & Purchasing",
    q: "What is the difference between Basic, Premium, and Grand tiers?",
    a: "Basic is a 1-2 hour game for smaller groups. Premium extends the difficulty to 2-3 hours with more clues and custom evidence images. Grand is an epic 3-4 hour experience with maximum drama, evidence, and custom confessional prompts."
  },
  {
    category: "Pricing & Purchasing",
    q: "Why does the price increase with more guests?",
    a: "Every guest you add exponentially increases the complexity of the narrative web. Our engine has to generate unique motives, relationships, and clues for every single player to ensure they are deeply involved in the story."
  },
  {
    category: "Pricing & Purchasing",
    q: "Do you offer physical boxed sets?",
    a: "We are a fully digital platform. You will receive high-quality PDF files that you can easily print at home or at a local print shop, which allows us to deliver your customized game instantly."
  },
  {
    category: "Pricing & Purchasing",
    q: "What if I need to change my guest list after I purchase?",
    a: "We know guest lists change! Reach out to our support team within 24 hours of your download, and we'll help you re-generate your pack with the updated guest list."
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
    a: "None. The price you see on the calculator for your guest count and tier is the final price."
  },

  // Gameplay & Hosting
  {
    category: "Gameplay & Hosting",
    q: "Can the host play along as a character?",
    a: "Yes! The Host Guide is completely spoiler-free. It simply tells you when to read a specific prompt or hand out an evidence card, allowing you to play and guess the murderer alongside your friends."
  },
  {
    category: "Gameplay & Hosting",
    q: "How long does a game typically last?",
    a: "Basic games take 1-2 hours. Premium games take 2-3 hours. Grand games can take 3-4 hours. The duration largely depends on how much your group loves to debate and roleplay."
  },
  {
    category: "Gameplay & Hosting",
    q: "What is the difficulty level like?",
    a: "We balance the clues so the mystery is solvable if players share their information, but challenging enough that the murderer can successfully bluff. The Grand tier offers the most complex logic puzzles."
  },
  {
    category: "Gameplay & Hosting",
    q: "How many rounds are there?",
    a: "Our games are structured into 4 distinct rounds: Introductions & Motives, The Investigation (Clues), The Deep Secrets (More Clues), and Final Accusations & Reveal."
  },
  {
    category: "Gameplay & Hosting",
    q: "Do players get eliminated if they are 'killed'?",
    a: "In most of our themes, the victim is an NPC (Non-Player Character) whose death kicks off the event, ensuring all your guests get to play the entire game."
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
    a: "That's perfectly fine. Because they are playing stylized versions of themselves, they don't need to put on fake accents or act out of character. They can just focus on solving the puzzle."
  },
  {
    category: "Gameplay & Hosting",
    q: "Do we need costumes?",
    a: "Costumes are entirely optional but highly recommended! Dressing up to match the theme (e.g., 1920s flappers or black-tie gala) heavily elevates the atmosphere."
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
    a: "Just their names and a brief note on how they know each other (e.g., 'Sarah - Bride's sister, always arguing with Dave'). The more 'vibes' or inside jokes you provide, the better the output."
  },
  {
    category: "Customization",
    q: "What if I don't know everyone's relationships?",
    a: "That's okay! You can leave relationships blank or just specify 'Friend of host'. The engine will generate fun, plausible dynamics to fill the gaps."
  },
  {
    category: "Customization",
    q: "Can I make myself the murderer?",
    a: "Currently, our engine randomizes the murderer to keep it a surprise for everyone, including the host. It ensures the game is perfectly balanced."
  },
  {
    category: "Customization",
    q: "Can I customize the victim?",
    a: "The victim is usually an NPC integral to the theme (like the billionaire patriarch or the wedding planner), but they are heavily customized to fit the context of your guest list."
  },
  {
    category: "Customization",
    q: "How do you incorporate inside jokes?",
    a: "There is a specific field for 'Character Traits / Inside Jokes' when adding guests. Our engine will weave these details into their dialogue prompts and alibis."
  },
  {
    category: "Customization",
    q: "What is the 'Pro Customizer'?",
    a: "Available on higher tiers, the Pro Customizer allows you to dictate exact visual traits (hair color, style, glasses) so the AI-generated evidence images actually look like your friends."
  },
  {
    category: "Customization",
    q: "Can I upload photos of my guests for the evidence?",
    a: "To avoid privacy issues and deepfake concerns, we do not allow direct photo uploads. Instead, we use your text descriptions to generate stylized evidence that resembles your group."
  },
  {
    category: "Customization",
    q: "What if the AI generates something inaccurate about a guest?",
    a: "Because the game is a stylized fiction, mild inaccuracies usually play off as hilarious alternate-universe traits. If there's a major error, you can use our 24-hour regeneration guarantee."
  },
  {
    category: "Customization",
    q: "Can you make it a surprise party mystery?",
    a: "Yes! You can add notes indicating it's a surprise party, and the narrative can incorporate that element into the opening round."
  },
  {
    category: "Customization",
    q: "Can I request a completely custom theme not listed?",
    a: "We currently only support the themes listed in our library, as each one requires extensive structural programming. However, we release new themes regularly!"
  },

  // Delivery & Setup
  {
    category: "Delivery & Setup",
    q: "How is the mystery delivered?",
    a: "Immediately after generation, you will receive an email with a secure link to download your complete pack as a series of high-resolution PDFs."
  },
  {
    category: "Delivery & Setup",
    q: "Do I have to print everything?",
    a: "No. While printing adds a great physical element, you can easily host the entire game by sending guests their PDFs and displaying evidence on a TV or tablet."
  },
  {
    category: "Delivery & Setup",
    q: "How much ink will printing this take?",
    a: "We provide 'Print-Friendly' versions of the documents with white backgrounds to save your printer ink, alongside the full-color thematic versions."
  },
  {
    category: "Delivery & Setup",
    q: "How long does it take to set up before the party?",
    a: "If you are printing, expect to spend about 20-30 minutes printing the documents and placing the character sheets into envelopes. If playing digitally, setup is instant."
  },
  {
    category: "Delivery & Setup",
    q: "Can I just share the character sheets via WhatsApp?",
    a: "Absolutely. Many of our hosts simply send the individual character PDF to each guest via WhatsApp or email on the day of the party."
  },
  {
    category: "Delivery & Setup",
    q: "What format are the files in?",
    a: "All files are delivered as standard PDFs, ensuring they can be opened on any phone, tablet, or computer without special software."
  },
  {
    category: "Delivery & Setup",
    q: "Will I get to see the files before the party?",
    a: "Yes, as the host you have full access to all files. Just be careful not to read the 'Final Reveal' document if you want to remain unspoiled!"
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
    q: "Can I request a family-friendly (PG) version?",
    a: "Currently, our engine is tuned for the 16+ 'Cinematic Noir' and dramatic styles, so we do not offer strictly PG/children's versions at this time."
  }
];
