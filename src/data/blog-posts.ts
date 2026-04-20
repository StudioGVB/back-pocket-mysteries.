export interface BlogPost {
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  image: string;
  date: string;
  readTime: string;
  tag: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'diy-murder-mystery-party-guide',
    title: 'How to Host an Unforgettable DIY Murder Mystery Party',
    subtitle: 'The ultimate guide for the Main Character Host.',
    excerpt: 'Hosting a murder mystery doesnt have to be a crime. From choosing your theme to the perfect playlist, here is everything you need to know.',
    image: '/blog/hosting-guide.png',
    date: 'May 15, 2024',
    readTime: '8 min read',
    tag: 'Guides',
    author: {
      name: 'Alex Sterling',
      role: 'Lead Story Architect'
    },
    seo: {
      title: 'How to Host a DIY Murder Mystery Party | Complete Guide 2024',
      description: 'Learn how to host a murder mystery party at home with our step-by-step DIY guide. Tips on themes, costumes, and hosting like a pro.',
      keywords: ['DIY murder mystery party guide', 'how to host a murder mystery at home', 'murder mystery party tips']
    },
    content: `
      <h2>The Secret to a Killer Party</h2>
      <p>Let’s be honest: most party hosts are time-poor but high-ambition. You want the drama, the laughs, and the "best night ever" compliments, but you don't want to spend three weeks writing scripts. That’s where a DIY Murder Mystery comes in.</p>
      
      <h3>1. Choose Your Vibe</h3>
      <p>Every great mystery starts with a setting. Are you feeling like a 1920s Gatsby-style <i>Speakeasy</i>? Or maybe a dark <i>Victorian Gothic</i> manor? The theme sets the dress code and the stakes. When choosing, consider your guest list—how many "actors" do you have versus "detectives"?</p>
      
      <div class="bg-brand-pink/10 p-8 rounded-3xl border-2 border-brand-pink my-10">
        <h4 class="font-black text-brand-pink uppercase tracking-widest text-sm mb-4">Pro Tip: Skip the Stress</h4>
        <p class="font-bold text-gray-700">Don't write it from scratch. Our ready-to-run themes are designed to be sorted in under 20 minutes with zero prep for the host. <a href="/themes" class="underline hover:text-brand-pink">Browse themes here.</a></p>
      </div>

      <h3>2. The Guest List & Characters</h3>
      <p>Assignments are key. Give the "Main Character" roles to your most dramatic friends. Send out character packets at least a week in advance so people can source their costumes. Remember: the more detail you give them about their motives and secrets, the better the improvisation will be.</p>

      <h3>3. Set the Scene (Literally)</h3>
      <p>Lighting is 90% of the atmosphere. Switch off the overhead lights and use neon strips, candles, or colored bulbs. Create "activity zones"—a bar for the suspects to gossip, and a "Crime Scene" where the clues are discovered.</p>

      <h3>Conclusion</h3>
      <p>The goal isn't perfection; it's personality. As long as there's a body, a motive, and a few drinks, your guests will have the time of their lives.</p>
    `
  },
  {
    slug: 'viral-murder-mystery-themes-2026',
    title: '7 Viral Murder Mystery Themes for Your Next Dinner Party',
    subtitle: 'From Cyberpunk Noir to Masquerade Mayhem.',
    excerpt: 'Tired of the same old "Clue" style parties? Discover 7 trending themes that will have your guests talking for months.',
    image: '/blog/viral-themes.png',
    date: 'May 12, 2024',
    readTime: '6 min read',
    tag: 'Trends',
    author: {
      name: 'Bella Noir',
      role: 'Creative Director'
    },
    seo: {
      title: '7 Best Murder Mystery Party Themes 2024 & 2026',
      description: 'Discover the most popular and trending murder mystery party themes. From 1920s jazz to futuristic cyberpunk, find your next theme.',
      keywords: ['murder mystery party themes', 'best murder mystery ideas', 'dinner party mystery themes']
    },
    content: `
      <h2>Beyond the Library</h2>
      <p>The classic "Colonel Mustard in the library" is a legend, but 2026 is about immersion. We’ve analyzed trending searches and party data to bring you the top 7 themes that are going viral this year.</p>
      
      <h3>1. The Neon Noir (Cyberpunk)</h3>
      <p>Think <i>Blade Runner</i> meets <i>Knives Out</i>. High-tech clues, futuristic aliases, and a mystery set in a neon-drenched city. This is perfect for groups who love sci-fi and dramatic lighting.</p>
      
      <h3>2. The Gilded Age Gala</h3>
      <p>Think <i>Bridgerton</i> but with a body count. It's all about corsets, complex social hierarchies, and secrets hidden behind silk fans. High elegance with a deadly twist.</p>

      <div class="my-12 text-center">
        <h4 class="text-2xl font-black mb-6 uppercase tracking-tight text-brand-dark">Which theme fits your group?</h4>
        <a href="/themes" class="inline-block px-10 py-4 bg-brand-pink text-white rounded-full font-black uppercase tracking-widest text-xs shadow-xl hover:translate-y-[-2px] transition-all">Take the Theme Quiz</a>
      </div>

      <h3>3. The Hollywood Premiere</h3>
      <p>Paparazzi, red carpets, and a fading starlet who just met her end. This theme allows your guests to go all-out on glamour and "diva" energy.</p>

      <h3>The Final Verdict</h3>
      <p>Choosing a theme is half the fun. Pick something that matches your friendship group's energy—whether they're goofy, serious, or ready for a costume contest.</p>
    `
  },
  {
    slug: 'corporate-team-building-mysteries',
    title: 'The ROI of Fun: Why Murder Mysteries are the Ultimate Team Building',
    subtitle: 'Move over trust falls, there’s a killer in the boardroom.',
    excerpt: 'Why boring team building is a waste of money, and how immersive mysteries actually build better teams.',
    image: '/blog/corporate-roi.png',
    date: 'May 08, 2024',
    readTime: '5 min read',
    tag: 'Corporate',
    author: {
      name: 'Marcus Reed',
      role: 'Corporate Events Specialist'
    },
    seo: {
      title: 'Murder Mystery Team Building | Corporate Event ROI',
      description: 'Why murder mystery games are the most effective team building activity. Improve communication, problem-solving, and employee engagement.',
      keywords: ['team building murder mystery', 'corporate team building ideas', 'office party games']
    },
    content: `
      <h2>The Problem with "Forced Fun"</h2>
      <p>We’ve all been there: a corporate retreat that involves building a bridge out of straws. It’s uninspired, and most employees dread it. But what if "team building" felt like an escape room on a grand scale?</p>
      
      <h3>Communication Under Pressure</h3>
      <p>In a murder mystery, information is currency. Teams must interview suspects, analyze clues, and—most importantly—communicate with each other to solve the crime. It naturally breaks down silos and encourages departments to work together in a fun, low-stakes environment.</p>

      <div class="bg-brand-dark p-12 rounded-[3rem] text-white my-12 shadow-2xl relative overflow-hidden">
        <div class="relative z-10">
          <h4 class="text-3xl font-black mb-6 uppercase tracking-tighter">Plan your next Offsite</h4>
          <p class="text-gray-400 mb-8 font-bold">We offer custom corporate packages for teams of 10 to 500. Let us handle the mystery while you enjoy the credit.</p>
          <a href="/pricing" class="inline-block px-10 py-4 bg-brand-pink rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-all">View Package Pricing</a>
        </div>
        <div class="absolute -right-20 -bottom-20 w-64 h-64 bg-brand-blue rounded-full blur-[80px] opacity-20"></div>
      </div>

      <h3>Identifying Natural Leaders</h3>
      <p>You’ll be surprised who steps up. Often, the quietest member of the team becomes the most astute detective. It’s a great way to see diverse personality types shine outside of their usual job descriptions.</p>

      <h3>The Bottom Line</h3>
      <p>Investing in your team's culture pays dividends in retention and productivity. A murder mystery isn't just a game; it's a shared memory that bonds your team long after the killer is caught.</p>
    `
  },
  {
    slug: 'writing-a-thrilling-murder-mystery',
    title: 'Secrets to Writing a Thrilling Murder Mystery (Pro Tips)',
    subtitle: 'From Red Herrings to the Big Reveal.',
    excerpt: 'Ever wondered how we craft our twisty plots? Our lead designer shares the 3 pillars of a perfect mystery script.',
    image: '/blog/writing-secrets.png',
    date: 'May 04, 2024',
    readTime: '10 min read',
    tag: 'Craft',
    author: {
      name: 'Alex Sterling',
      role: 'Lead Story Architect'
    },
    seo: {
      title: 'How to Write a Murder Mystery | Professional Plot Tips 2024',
      description: 'Discover the professional secrets to writing a compelling murder mystery. Learn about red herrings, pacing, and motive development.',
      keywords: ['how to write a murder mystery', 'mystery writing tips', 'plot a murder mystery']
    },
    content: `
      <h2>The Architecture of a Clue</h2>
      <p>Writing a mystery is like building a clock. If one gear is slightly off, the whole thing stops. At Back Pocket Mysteries, we use a three-pillar system to ensure every game is unsolvable until it’s perfectly solvable.</p>
      
      <h3>1. The "Why" is Greater Than the "How"</h3>
      <p>The mechanics of the murder (the weapon, the time) are secondary to the motive. Every character MUST have a reason to want the victim gone. This creates the "Red Herring" effect—every guest feels slightly guilty, keeping the suspicion alive.</p>

      <h3>2. The Trail of Crumbs</h3>
      <p>A good mystery shouldn't be a random guess. There should be a logical through-line of clues. We divide clues into "Hard Clues" (physical evidence) and "Soft Clues" (dialogue and behavior). The best detectives are the ones who can bridge the two.</p>

      <div class="my-10 p-10 border-l-8 border-brand-pink bg-brand-gray">
        <p class="italic text-xl font-medium text-gray-600">"A mystery is a contract between the writer and the audience. You must give them everything they need to solve it, but make them work for every piece."</p>
      </div>

      <h3>3. The Pacing of Reveal</h3>
      <p>Timing is everything. If the killer is caught in Phase 1, the party is over. We structure our games in "Rounds" to ensure the tension peaks at exactly the right moment before the final reveal.</p>

      <h3>See Our Plots in Action</h3>
      <p>Want to see these pillars in action? Every one of our themes uses this architecture to guarantee a thrilling night. <a href="/themes" class="text-brand-pink font-black underline">Check them out here.</a></p>
    `
  },
  {
    slug: 'costume-guide-for-mystery-nights',
    title: 'The Dress-Code Drama: Creative Costume Ideas for Mystery Events',
    subtitle: 'Dress to Kill, Literally.',
    excerpt: 'The difference between a good party and a great one is the costumes. Here is how to nail the look for any theme.',
    image: '/blog/costume-guide.png',
    date: 'May 01, 2024',
    readTime: '4 min read',
    tag: 'Costumes',
    author: {
      name: 'Sasha Vain',
      role: 'Costume & Prop Designer'
    },
    seo: {
      title: 'Murder Mystery Costume Ideas | Theme Outfits 2024',
      description: 'Get the best costume ideas for your murder mystery party. From Gatsby flappers to futuristic detectives, we have you covered.',
      keywords: ['murder mystery costume ideas', 'party outfit ideas', 'themed costumes']
    },
    content: `
      <h2>Character is a Costume</h2>
      <p>When you put on a wig or a vintage waistcoat, you stop being "Dave from accounting" and start being "The Disgruntled Butler." Immersion is the key to a successful mystery, and it starts with the wardrobe.</p>
      
      <h3>1. The 1920s: Feathers, Fringes, and Fedoras</h3>
      <p>You can’t go wrong with Speakeasy style. For women, flapper dresses and headbands are easy to find. For men, a sharp suit with a pocket watch or a suspender set does the trick. Don’t forget the plastic cigars and flasks!</p>

      <h3>2. Modern Chic: Sleek and Suspicious</h3>
      <p>For a contemporary mystery, think high-fashion with a dark twist. All-black outfits, dark sunglasses, and sleek accessories. It’s about looking like you have something to hide.</p>

      <div class="grid grid-cols-2 gap-4 my-10">
        <div class="bg-brand-gray p-6 rounded-2xl flex flex-col items-center text-center">
            <span class="text-3xl mb-3">🎩</span>
            <h5 class="font-black text-xs uppercase mb-2">The Host Kit</h5>
            <p class="text-[10px] text-gray-500">Every host gets a list of costume suggestions for every guest.</p>
        </div>
        <div class="bg-brand-gray p-6 rounded-2xl flex flex-col items-center text-center">
            <span class="text-3xl mb-3">🛍️</span>
            <h5 class="font-black text-xs uppercase mb-2">Easy Shopping</h5>
            <p class="text-[10px] text-gray-500">We link to easy Amazon/Etsy finds for your specific theme.</p>
        </div>
      </div>

      <h3>3. Pro Tip: Don’t Break the Bank</h3>
      <p>Hit the local thrift stores. Old wedding dresses, bulky trench coats, and costume jewelry are mystery gold mines. The more "extra" it is, the better!</p>

      <h3>Ready to Dress Up?</h3>
      <p>Pick your theme first, then start the hunt. Your character is waiting! <a href="/occasions" class="text-brand-pink font-black border-b-2 border-brand-pink">Find your occasion here.</a></p>
    `
  }
];
