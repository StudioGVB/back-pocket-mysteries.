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
  },
  {
    slug: 'ai-revolutionizing-murder-mystery-games',
    title: 'How AI is Revolutionizing Murder Mystery Games in 2026',
    subtitle: 'Say goodbye to generic scripts and hello to infinite personalization.',
    excerpt: 'The future of murder mystery parties is here. Learn how artificial intelligence is transforming off-the-shelf games into deeply personal, immersive experiences.',
    image: '/blog/ai-mystery.png',
    date: 'May 18, 2024',
    readTime: '6 min read',
    tag: 'Technology',
    author: {
      name: 'Julian Vance',
      role: 'Tech & Narrative Lead'
    },
    seo: {
      title: 'How AI Murder Mystery Games Work | Custom Generators 2026',
      description: 'Discover how AI is changing murder mystery parties. Learn how custom generators create personalized scripts, characters, and clues based on your actual guests.',
      keywords: ['AI murder mystery game', 'custom murder mystery generator', 'personalized mystery party']
    },
    content: `
      <h2>The Problem with Traditional Kits</h2>
      <p>For decades, hosting a murder mystery meant buying a boxed kit or downloading a PDF. The stories were fun, but they had glaring flaws: the characters were generic, the player counts were rigid, and if you played with the same group twice, the magic faded.</p>
      
      <h3>Enter the AI Custom Generator</h3>
      <p>Artificial intelligence isn't just for writing emails; it's a powerful storytelling engine. By feeding an AI the names, personalities, and inside jokes of your real-life friends, you can generate a <a href="/custom-murder-mystery" class="text-brand-pink font-bold hover:underline">100% custom murder mystery game</a> in seconds.</p>
      
      <div class="bg-brand-gray p-8 rounded-3xl border-l-4 border-brand-pink my-8">
        <h4 class="font-black text-brand-dark uppercase tracking-widest text-sm mb-2">Why Customisation Matters</h4>
        <p class="text-gray-600">Imagine a game where the motive for murder is that time your best friend stole your pizza in college. That level of personalization creates uncontrollable laughter and immediate immersion.</p>
      </div>

      <h3>Dynamic Scaling for Any Group Size</h3>
      <p>Ever had a guest drop out at the last minute and ruin a pre-written game? AI generators solve this. Our dynamic platform recalculates the plot, reassigns clues, and ensures the mystery works flawlessly whether you have 6 guests or 60.</p>

      <h3>Ready to Build Your Own?</h3>
      <p>Stop settling for generic stories. Experience the future of party games today. <a href="/custom-murder-mystery" class="inline-block mt-4 px-6 py-2 bg-brand-pink text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-dark transition-colors">Generate Your Custom Mystery</a></p>
    `
  },
  {
    slug: 'birthday-murder-mystery-dinner-plan',
    title: 'How to Plan an Unforgettable Birthday Murder Mystery Dinner',
    subtitle: 'Make your next milestone birthday criminally good.',
    excerpt: 'Step-by-step instructions for hosting a birthday murder mystery dinner that your friends will be talking about until you turn 100.',
    image: '/blog/birthday-dinner.png',
    date: 'May 20, 2024',
    readTime: '7 min read',
    tag: 'Guides',
    author: {
      name: 'Clara Hughes',
      role: 'Event Planning Expert'
    },
    seo: {
      title: 'How to Plan a Birthday Murder Mystery Dinner Party',
      description: 'The ultimate checklist for hosting a birthday murder mystery dinner. Menu ideas, pacing tips, and how to make the birthday guest the star of the show.',
      keywords: ['birthday murder mystery dinner', 'murder mystery dinner party', 'milestone birthday ideas']
    },
    content: `
      <h2>A Milestone to Die For</h2>
      <p>Dinner and drinks are fine, but a milestone birthday (30th, 40th, 50th) deserves an event. A murder mystery dinner party combines great food, outrageous costumes, and interactive theater into one unforgettable evening.</p>
      
      <h3>1. Make the Birthday Guest the Star (or the Victim!)</h3>
      <p>The best part of a birthday mystery is centering the plot around the guest of honor. Some love being the lead detective, while others find it hilarious to play the wealthy victim who gets "knocked off" before the appetizers. With a <a href="/custom-murder-mystery" class="text-brand-pink font-bold hover:underline">custom-built mystery</a>, you dictate exactly who plays what role.</p>
      
      <h3>2. The Perfect Murder Mystery Menu</h3>
      <p>Pacing is everything. You want food that is easy to eat while mingling and holding clue cards.</p>
      <ul class="list-disc pl-6 space-y-2 mb-8 text-gray-700">
        <li><strong>Act I (Arrival):</strong> Charcuterie boards and themed cocktails.</li>
        <li><strong>Act II (The Investigation):</strong> A buffet or family-style dinner. Avoid complex plated meals that trap guests in their seats.</li>
        <li><strong>Act III (The Reveal):</strong> The birthday cake (perhaps shaped like a magnifying glass or a skull) and coffee.</li>
      </ul>

      <div class="bg-brand-dark p-10 rounded-[2rem] text-center my-10">
        <h4 class="text-white text-2xl font-black uppercase tracking-tight mb-4">Need a Theme?</h4>
        <p class="text-gray-400 mb-6">From 1920s Gatsby to 80s Prom, we have themes to match any birthday era.</p>
        <a href="/themes" class="px-8 py-3 bg-white text-brand-dark rounded-full text-xs font-black uppercase tracking-widest hover:bg-brand-pink hover:text-white transition-colors">Browse Party Themes</a>
      </div>

      <h3>3. Invitations Set the Tone</h3>
      <p>Send your invitations out 3-4 weeks in advance. Include the guest's character assignment and costume suggestions so they have plenty of time to hit the thrift stores.</p>
    `
  },
  {
    slug: 'murder-mystery-host-mistakes',
    title: '5 Things Every Murder Mystery Host Forgets (And How to Fix Them)',
    subtitle: 'Don\'t let a missing clue ruin the crime scene.',
    excerpt: 'Hosting your first murder mystery? Learn the top 5 mistakes rookie hosts make and how to ensure your party runs smoothly.',
    image: '/blog/host-mistakes.png',
    date: 'May 22, 2024',
    readTime: '5 min read',
    tag: 'Tips',
    author: {
      name: 'Alex Sterling',
      role: 'Lead Story Architect'
    },
    seo: {
      title: '5 Murder Mystery Party Hosting Mistakes to Avoid',
      description: 'Learn the top mistakes people make when hosting a murder mystery party and how to avoid them for a flawless, fun event.',
      keywords: ['murder mystery host tips', 'how to host a murder mystery', 'murder mystery party mistakes']
    },
    content: `
      <h2>Learning from the Crime Scene</h2>
      <p>We've helped thousands of people host their first murder mystery party. While they are incredibly fun, there are a few common pitfalls that can trip up a first-time host.</p>
      
      <h3>Mistake 1: Trapping Guests at the Table</h3>
      <p>A sit-down dinner is great, but a mystery requires mingling. If your guests are glued to their chairs, they can't secretly interrogate the suspect across the room. <strong>The Fix:</strong> Serve buffet style, or intentionally build in "mingle breaks" between courses.</p>
      
      <h3>Mistake 2: Forgetting Name Tags</h3>
      <p>You know your friend Sarah, but tonight she's "Countess Von Diamond." If guests can't remember who is playing who, the investigation stalls. <strong>The Fix:</strong> Always provide clear, readable name tags.</p>

      <div class="bg-brand-pink/10 p-8 rounded-3xl border-2 border-brand-pink my-8">
        <h4 class="font-black text-brand-pink uppercase tracking-widest text-sm mb-2">Automated Hosting</h4>
        <p class="text-gray-700">Our platform automatically generates printable name tags, evidence files, and step-by-step host instructions so you never miss a detail. <a href="/how-it-works" class="font-bold underline hover:text-brand-pink">See how it works.</a></p>
      </div>

      <h3>Mistake 3: Giving Away the Ending</h3>
      <p>As the host, it's tempting to read the entire script beforehand. But if you know who the killer is, it's very hard not to accidentally drop hints! <strong>The Fix:</strong> Choose a game format where the host can play along blindly.</p>

      <h3>Mistake 4: Taking it Too Seriously</h3>
      <p>Someone will inevitably forget their accent, drop a clue, or accuse the wrong person for a silly reason. Lean into it! The laughter is the point.</p>
    `
  },
  {
    slug: 'what-to-expect-first-murder-mystery',
    title: 'What to Expect at Your First Murder Mystery Party',
    subtitle: 'A beginner\'s guide to surviving (and solving) the night.',
    excerpt: 'Invited to your first murder mystery party? Here is exactly what to expect, how to prepare, and how to get into character without feeling awkward.',
    image: '/blog/first-party.png',
    date: 'May 25, 2024',
    readTime: '4 min read',
    tag: 'Beginners',
    author: {
      name: 'Sasha Vain',
      role: 'Community Manager'
    },
    seo: {
      title: 'What to Expect at a Murder Mystery Party | Beginner Guide',
      description: 'Attending your first murder mystery party? Find out what to expect, how to play your character, and tips for solving the crime.',
      keywords: ['what to expect at a murder mystery party', 'how to play a murder mystery game', 'murder mystery beginner guide']
    },
    content: `
      <h2>So, You've Been Invited to a Murder...</h2>
      <p>Getting invited to a murder mystery party is thrilling, but if you've never been to one, it can also feel a bit intimidating. Will you have to act? What if you're the killer? Relax—here is exactly what will happen.</p>
      
      <h3>Before the Party</h3>
      <p>You will receive your character assignment. This usually includes a brief backstory, some costume suggestions, and a few secrets. <strong>Your only job right now is to find an outfit.</strong> You don't need to memorize a script; just get a feel for your character's vibe.</p>
      
      <h3>Arriving at the Party</h3>
      <p>When you walk in, you'll likely receive an envelope containing your "Round 1" objectives. These are simple goals like, "Find out why the Butler is angry," or "Tell everyone how rich you are." It gives you an immediate excuse to talk to people.</p>

      <div class="my-10 p-8 border-l-4 border-gray-800 bg-gray-50">
        <h4 class="font-black text-gray-800 uppercase tracking-widest text-sm mb-2">The Golden Rule</h4>
        <p class="text-gray-600 italic">"You cannot lie unless your character sheet explicitly tells you that you are the murderer. If you are innocent, you must answer questions truthfully (even if it makes you look suspicious!)."</p>
      </div>

      <h3>The Murder & The Investigation</h3>
      <p>Eventually, someone will "die" (usually dramatically). The host will present evidence—like a police report or a weapon. From there, it’s a free-for-all. You will gossip, accuse, and defend yourself.</p>

      <h3>Don't Worry About Being a Good Actor</h3>
      <p>You don't need an Oscar. Simply reading your clues with a terrible fake accent is usually the funniest part of the night. If you're ready to dive in, suggest a <a href="/compare" class="text-brand-pink font-bold hover:underline">modern, easy-to-play game format</a> to your host!</p>
    `
  },
  {
    slug: 'best-murder-mystery-large-groups',
    title: 'The Best Murder Mystery Party Games for Large Groups in 2026',
    subtitle: 'How to host 20, 50, or 100+ suspects without losing your mind.',
    excerpt: 'Hosting a massive event? Discover the best murder mystery formats and games designed specifically for large crowds and corporate events.',
    image: '/blog/large-groups.png',
    date: 'May 28, 2024',
    readTime: '6 min read',
    tag: 'Corporate',
    author: {
      name: 'Marcus Reed',
      role: 'Corporate Events Specialist'
    },
    seo: {
      title: 'Best Murder Mystery Games for Large Groups & Corporate',
      description: 'Find the best murder mystery party games for large groups of 20, 50, or 100+ people. Perfect for corporate events, fundraisers, and massive parties.',
      keywords: ['murder mystery for large groups', 'large group party games', 'murder mystery corporate event']
    },
    content: `
      <h2>Scaling the Suspense</h2>
      <p>Hosting a mystery for 8 people around a dinner table is easy. Hosting a mystery for 80 people in a rented hall is a completely different beast. Traditional boxed kits fall apart when the player count gets too high because they rely on everyone listening to one person read a script.</p>
      
      <h3>The "Mingle" Format is Mandatory</h3>
      <p>For large groups, you must use a "mingle" or "free-form" game. In this format, there is no central script. Instead, guests are given individual secrets and objectives, and they must roam the room to interrogate each other. It creates a chaotic, highly energetic atmosphere.</p>
      
      <h3>Primary vs. Secondary Characters</h3>
      <p>When you have 50 guests, not everyone can be the prime suspect. The best large-group games divide the room:</p>
      <ul class="list-disc pl-6 space-y-2 mb-8 text-gray-700">
        <li><strong>The Core Suspects (10-15 people):</strong> These are your outgoing guests who have direct motives and deep ties to the victim.</li>
        <li><strong>The Investigators (Everyone else):</strong> They form detective teams. They still get characters and costumes, but their primary goal is to interview the Core Suspects and solve the crime.</li>
      </ul>

      <div class="bg-brand-dark p-12 rounded-[3rem] text-white my-10 shadow-xl">
        <h4 class="text-3xl font-black mb-4 uppercase tracking-tighter">Custom Scaling to 100+ Guests</h4>
        <p class="text-gray-300 mb-8 font-bold">Our AI engine allows you to generate a mystery that perfectly fits your massive guest list. We create the Core Suspects and unlimited Investigator roles.</p>
        <a href="/pricing" class="inline-block px-8 py-3 bg-brand-pink rounded-full font-black uppercase tracking-widest text-xs hover:bg-white hover:text-brand-pink transition-colors">See Large Group Pricing</a>
      </div>

      <h3>Organizing the Evidence</h3>
      <p>With a massive crowd, passing around a single physical clue is impossible. Project evidence onto a screen, or use a platform that allows guests to access clues on their phones.</p>

      <h3>Conclusion</h3>
      <p>Large events require tools designed for scale. Explore our <a href="/custom-murder-mystery" class="text-brand-pink font-bold hover:underline">custom game builder</a> to see how we handle massive parties with ease.</p>
    `
  }
];
