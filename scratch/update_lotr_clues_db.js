const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.substring(1, val.length - 1);
    }
    env[match[1]] = val;
  }
});

const supabase = createClient(
  env['NEXT_PUBLIC_SUPABASE_URL'],
  env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
);

const CLUE_UPDATES = {
  "The Threatening Letter": {
    newTitle: "The Threatening Text Chain",
    description: `💬 PRIVATE DM THREAD\nSender: Unknown Number (Saved as: Don't answer.)\nRecipient: {{Gabby}}\n\n[5:42 PM] Unknown: "You don't deserve the win. Everyone sees what you really are. Time someone did something about it."\n\n(Status: SEEN 5:43 PM — No Reply)`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Gabby looking down at a glowing blank smartphone screen on a penthouse balcony at night. On the right: A mysterious dark silhouette looking down at a glowing phone screen in a dark corridor. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "Sienna's Torn Note": {
    newTitle: "Sienna's Group Chat Drop",
    description: `💬 CAST GROUP CHAT\nSender: {{Sienna}}\n\n[5:15 PM] {{Sienna}}: "Ik im an a**hole but thought you should know what your sister said..."\n[5:16 PM] {{Gabby}}: "As I said before, IDGAF. {{Sienna}} needs character building anyway."`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Sienna looking down at a glowing blank smartphone screen in a bright dressing room. On the right: Gabby looking down at a glowing blank smartphone screen on a penthouse balcony at night. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "Dane's Scribbled Notepad": {
    newTitle: "Dane's Google Search History",
    description: `🔍 MOBILE SEARCH HISTORY LOG\nDevice: EyeSpy monitoring dump ({{Dane}}'s phone)\n\n- "How to poison someone"\n- "How to spike a drink without taste"\n- "Do sedatives show up in blood test"\n- "Alcohol + sleeping pills dangerous?"\n- "{{Gabby}} Love on the Rocks cute edits"`,
    generation_prompt: `A dramatic, atmospheric close-up photograph of Dane looking down intensely at a blank, glowing smartphone screen in a dimly-lit penthouse lounge, the cool light of the screen illuminating their face. Gritty noir aesthetic, low-key lighting, moody, 8k.`
  },
  "The Leaked Love Letter": {
    newTitle: "The Leaked DM Thread",
    description: `💬 PRIVATE DM THREAD\nSender: {{Dane}}\nRecipient: {{Gabby}}\n\n[5:10 PM] {{Dane}}: "{{Colt}} and I were together at the same time. I'm more devastated than you."\n[5:12 PM] {{Gabby}}: "I can assure you, you're not."`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Dane looking down at a glowing blank smartphone screen in a dimly-lit lounge. On the right: Gabby looking down at a glowing blank smartphone screen in a hotel suite at night. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "The Warning Coaster": {
    newTitle: "The Seen-Zoned Warning",
    description: `💬 PRIVATE DM THREAD\nSender: RealFan_{{Milo}}\nRecipient: {{Gabby}}\n\n[5:02 PM] RealFan_{{Milo}}: "The reunion's gonna set someone off."\n\n(Status: SEEN 5:05 PM — No Reply)`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Milo (a young man with short orange hair and fair skin, wearing a bright orange jacket) looking down at a glowing blank smartphone screen in a dark hallway. On the right: Gabby looking down at a glowing blank smartphone screen on a penthouse balcony at night. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "Rikki's Secret Diary Entry": {
    newTitle: "Rikki's Side Chat",
    description: `💬 PRIVATE DM THREAD\nSender: {{Rikki}}\nRecipient: {{Ava}}\n\n[5:32 PM] {{Rikki}}: "Should I just tell them?"\n[5:33 PM] {{Ava}}: "They're gonna find out at some point. You should be the one. {{Gabby}} would hate it."`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Rikki looking down at a glowing blank smartphone screen in a dimly-lit bar lounge. On the right: Ava looking down at a glowing blank smartphone screen in a luxury bedroom. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "The Main Cast Rehearsal Board": {
    newTitle: "The Main Cast Group Chat",
    description: `💬 CAST GROUP CHAT (From {{Zayn}}'s phone)\n\n[5:22 PM] {{Ava}}: "You couldn't keep your story straight, could you S"\n[5:23 PM] {{Sienna}}: "Oh f*** off. Why are we talking about this in the main GC"\n[5:24 PM] {{Dane}}: "Actually, why are we talking about this at all."`,
    generation_prompt: `A grid-style photo collage divided into four separate equal quadrants. In each panel, a different character (Ava, Sienna, Dane, Zayn) is shown from the chest up looking down intensely at a glowing blank smartphone screen in their hand, with distinct backgrounds for each room (dressing room, lounge, balcony, bar). Gritty noir aesthetic, dramatic low-key lighting, 8k.`
  },
  "Rikki's Glam Mirror Note": {
    newTitle: "Rikki's Glam Mirror Note",
    description: `📌 STICKY NOTE
Location: Glam room mirror
Handwriting: Matches {{Milo}}'s handwriting

"FYI — there was white powder all over the corner of my makeup mirror. Pretty sure {{Dane}} used it while I stepped out. Handle it if you need to. Just don't put it on me. – {{Milo}}"`,
    generation_prompt: `A high-quality photograph of Rikki looking at her own reflection in a vanity mirror. In the corner of the mirror, a blank neon pink sticky note is stuck. Rikki is looking intensely at the blank sticky note with a concerned expression. The sticky note is completely blank with no writing, ink, or text on it. Out-of-focus background reveals clothes racks. Gritty noir aesthetic, dramatic low-key vanity bulbs lighting, sharp focus, 8k.`
  },
  "The Glam Room Production Note": {
    newTitle: "The Glam Room Production Note",
    description: `📋 PRODUCTION LOG SHEET
Location: Glam Room clipboard

"B spiralling re: S & C. C and S were in wardrobe for AGES. R still hovering. Watch them, seems unstable. You know what to do..."`,
    generation_prompt: `A dramatic close-up photograph of Jeremy holding a clipboard and looking down at a sheet of blank white production stationery with a concerned expression in a dark production booth. The page is completely blank with no text or writing on it, except for a red circle drawn on the blank page. Gritty noir aesthetic, low-key lighting, 8k.`
  },
  "The Unsigned Bar Note": {
    newTitle: "The Unsigned Bar Note",
    description: `📌 FOLDED NOTE
Location: Found near the bar

"Try to get S to talk to ___. [Name crossed out]. You know what to do."`,
    generation_prompt: `A dramatic close-up photograph of a folded, creased piece of blank cream-colored paper resting on a wet dark marble bar counter under warm, direct spotlighting. The paper is completely blank with no writing, ink, or text on it. Condensation drops from a nearby cocktail glass are visible on the paper. Gritty noir aesthetic, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k.`
  },
  "Dane's Scrawled Warning": {
    newTitle: "Dane's Rage Texts",
    description: `💬 PRIVATE DM THREAD\nSender: {{Dane}}\nRecipient: Unknown\n\n[5:44 PM] {{Dane}}: "If I have to watch them stand next to {{Gabby}} again I'll lose it. The cameras are on. But I will. I'm done being quiet."`,
    generation_prompt: `A dramatic close-up of Dane looking down intensely at a blank, glowing smartphone screen in a dimly-lit penthouse suite, their angry expression highlighted by the cool blue light of the screen. Gritty noir aesthetic, low-key lighting, moody, 8k.`
  },
  "The Gossip Column Clipping": {
    newTitle: "The Inner Circle Group Chat",
    description: `💬 CAST GROUP CHAT (From {{Jeremy}}'s phone)\n\n[5:38 PM] {{Rikki}}: "{{Dane}} is in glam pacing like they're about to explode. They deadass asked me if {{Gabby}} still talks about them."\n[5:39 PM] {{Ava}}: "I saw them staring at the champagne bottles. Is {{Dane}} still on their meds...?"\n[5:40 PM] {{Rikki}}: "I'm not tryna get roofied tonight."`,
    generation_prompt: `A split-screen photograph divided vertically into three separate vertical panels. In each panel, a different character (Rikki, Ava, Jeremy) is shown looking down intensely at a glowing blank smartphone screen in their hand, with distinct backgrounds for each panel (bar lounge, dressing room, production desk). Gritty noir aesthetic, dramatic low-key lighting, 8k.`
  },
  "Milo's Lipstick Warning": {
    newTitle: "Milo's Cheat Sheet Warning",
    description: `💬 PRIVATE DM THREAD\nSender: {{Milo}}\nRecipient: {{Rikki}}\n\n[5:36 PM] {{Milo}}: "The reunion's gonna set someone off. If someone snaps, it won't be a surprise."\n\n(Status: SEEN 5:37 PM — No Reply)`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Milo (a young man with short orange hair and fair skin, wearing a bright orange jacket) looking down at a glowing blank smartphone screen in a quiet hallway. On the right: Rikki looking down at a glowing blank smartphone screen in a dimly-lit VIP lounge. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "Gabby's Unsent Letter": {
    newTitle: "Gabby's Final Message",
    description: `💬 PRIVATE DM THREAD\nSender: {{Gabby}}\nRecipient: {{Colt}}\n\n[5:20 PM] {{Gabby}}: "You okay? I feel like something's off. Let's talk before the toast..."\n\n(Status: SEEN 5:21 PM — No Reply)`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Gabby looking down at a glowing blank smartphone screen in a luxury penthouse kitchen. On the right: Colt looking down at a glowing blank smartphone screen in a dimly-lit bathroom. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "The Wardrobe Eavesdropping Log": {
    newTitle: "The Wardrobe Intercept Audio",
    description: `🎙️ AUDIO RECORDING TRANSCRIPT\nSource: Backstage Wardrobe Intercept (Duration: 25s)\nSpeakers: {{Jeremy}} & {{Dane}}\n\n[00:08] {{Jeremy}}: "{{Rikki}} said they were in wardrobe for 25 minutes. Just them — {{Colt}} and {{Gabby}}."\n[00:12] {{Dane}}: "You're joking."\n[00:15] {{Jeremy}}: "I'm not. Might be good to get that on camera."\n[00:19] {{Dane}}: "You'll get something."\n\n(Audio cuts off — static)`,
    generation_prompt: `A premium matte-black podcasting microphone standing on a sleek glossy table, illuminated by a moody green spotlight from behind. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.`
  },
  "Milo's Leather Journal": {
    newTitle: "Milo's Diary Entry",
    description: `📓 PERSONAL NOTES LOG\nDevice: {{Milo}}'s phone\n\n[Entry dated: Tonight]\n"Tonight felt kind of perfect. I actually think I'm happy — like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening..."`,
    generation_prompt: `A dramatic close-up of Milo (a young man with short orange hair and fair skin, wearing a bright orange jacket) looking down at a blank, glowing smartphone screen in a quiet, dimly lit corner of a luxury suite. Gritty noir aesthetic, low-key lighting, moody, 8k.`
  },
  "The Shredded Security Log": {
    newTitle: "The Deleted Security Camera File",
    description: `💻 SECURITY SYSTEM LOG\nRestored metadata: SEC CAM_4B [Bar Area]\nTime Range: 5:40–6:05 PM\nStatus: Permanently Deleted\nActioned by: {{Jeremy}} (jordan.p@doatv.tv)\nReason: "corrupted audio, unusable"\n\n[Overheard: {{Jeremy}}'s quote]\n"It was mostly {{Rikki}} ranting anyway — no good angles. Not worth a storyline."`,
    generation_prompt: `A moody, dramatic shot of an empty television control booth with glowing, colorful buttons on the control panel, casting abstract light reflections in the dark room. Gritty noir aesthetic, low-key lighting, 8k.`
  },
  "Sienna & Zayn's Blueprint Map": {
    newTitle: "Sienna & Zayn's Plan",
    description: `💬 PRIVATE DM THREAD\nSender: {{Sienna}}\nRecipient: {{Zayn}}\n\n[5:25 PM] {{Sienna}}: "I cannot believe she said that. Especially after EVERYTHING I've done. I have an idea — let's give her a taste of her own medicine. We look exactly the same."\n[5:27 PM] {{Zayn}}: "God I think I'm in love with you."`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Sienna looking down at a glowing blank smartphone screen in a dressing room. On the right: Zayn looking down at a glowing blank smartphone screen on a dark penthouse balcony. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "The Burning Heart Letter": {
    newTitle: "The Burning Heart Thread",
    description: `💬 PRIVATE DM THREAD\nSender: {{Gabby}}\nRecipient: Unsaved Contact\n\n- Only heart-on-fire emojis remain in the chat thread.\n- The final message is {{Gabby}}'s, at 5:52 PM.\n- No reply.`,
    generation_prompt: `Split screen photograph with a clean vertical divide line in the middle. On the left: Gabby looking down at a glowing blank smartphone screen with a red neon heart light reflecting on her face. On the right: A mysterious dark silhouette looking down at a glowing phone screen in a dark corridor. Two distinct separate backgrounds separated by the vertical line. Gritty noir aesthetic, dramatic low-key lighting, text-free, no words, 8k.`
  },
  "Milo's Torn Scrap of Stationery": {
    newTitle: "Milo's Final Draft",
    description: `💬 UNSENT MESSAGE DRAFT\nSender: {{Milo}}\nRecipient: {{Gabby}}\n\n"...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well… there's only one way this ends. –R"`,
    generation_prompt: `A dramatic close-up of Milo (a young man with short orange hair and fair skin, wearing a bright orange jacket) looking down intensely at a blank, glowing smartphone screen in a dark, empty bedroom, their face lit by the screen. Gritty noir aesthetic, low-key lighting, moody, 8k.`
  },
  "Gabby's Cocktail Napkin": {
    newTitle: "Gabby's Cocktail Napkin",
    description: `📌 COCKTAIL NAPKIN
Location: Found near the bar

"If this goes wrong tonight — it was always going to. -S"

(The ink is smudged at the edge.)`,
    generation_prompt: `A paper cocktail napkin lying on a dark, wet bar counter next to spilled champagne. The napkin is completely blank and clean with no writing, text, signatures, or ink on it. Gritty noir aesthetic, dramatic low-key lighting, highly detailed paper texture, atmospheric shadows, cinematic shot, sharp focus, 8k.`
  },
  "The Eavesdropped Argument Transcript": {
    newTitle: "The Recorded Argument",
    description: `🎙️ AUDIO RECORDING TRANSCRIPT\nSource: Accidental recording ({{Zayn}}'s phone, 32s)\n\n[00:04] {{Sienna}}: "You think this is just content?! This is my life."\n[00:09] {{Zayn}}: "You said to post it."\n[00:13] {{Sienna}}: "They already think you hooked up anyway."\n[00:18] *Pause*\n[00:20] {{Sienna}}: "I never want to see you again."\n[00:24] {{Zayn}}: "You're so dramatic. We're both on camera."`,
    generation_prompt: `A moody close-up of a professional sound mixing board in a dimly lit audio suite, with small green and yellow indicator lights glowing in the dark. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.`
  },
  "The Love Rejection Note": {
    newTitle: "The Love Rejection Note",
    description: `📌 CRUMPLED NOTE
Location: Found near the champagne table
Handwriting: Matches {{Milo}}'s fan mail

"...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends."`,
    generation_prompt: `A high-quality, professional photograph of Gabby holding a crumpled piece of blank cream-colored hotel stationery in her hands, looking down at it with a shocked and distressed expression in a dimly lit penthouse corner. The paper is completely blank and text-free with no writing, ink, or words on it. Gritty noir aesthetic, dramatic low-key spotlighting, sharp focus, 8k.`
  },
  "Rikki's Urgently Scribbled Bar Note": {
    newTitle: "Rikki's Warning Voice Note",
    description: `🎙️ AUDIO RECORDING TRANSCRIPT\nSource: {{Rikki}}'s Voice Note (Duration: 32s)\nRecipient: {{Jeremy}}\n\n[6:01 PM] {{Rikki}}: "Something isn't right. {{Milo}} was at the bar alone for two minutes when nobody was looking. Just standing there. Switching something. I thought it was their glass. {{Jeremy}}, call me back."`,
    generation_prompt: `An empty bar lounge in the penthouse at twilight, a single champagne flute left behind, with long shadows stretching across the polished hardwood floor. Gritty noir aesthetic, moody lighting, shallow depth of field, 8k.`
  },
  "The Glass Switch Polaroid": {
    newTitle: "The Glass Switch Photo",
    description: `📸 POLAROID SNAPSHOT\nTimestamp: 6:03 PM (Found in guest's pocket)\n\n- In the distant background: A figure in orange ({{Milo}}'s color code) is seen moving two champagne flutes on the serving tray, swapping their positions.`,
    generation_prompt: `A professional close-up photograph of a physical Polaroid snapshot lying on a wooden table. The photo shows a dark penthouse party room with guests in the foreground. In the distant, blurry background, a figure wearing a bright orange jacket is caught in motion near a cocktail tray. Gritty noir aesthetic, dramatic low-key lighting, cinematic shot, sharp focus on the Polaroid border, 8k.`
  },
  "Milo's Written Confession": {
    newTitle: "Milo's Confessional Voice Note",
    description: `🎙️ AUDIO RECORDING TRANSCRIPT\nSource: {{Milo}}'s Voice Note (Duration: 45s)\n\n[00:10] {{Milo}}: "I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came… I directed it to go exactly where it needed to. It's wild how things just fall into place. Some people live for the camera. Some people die for it. Either way… I'm part of the story now."`,
    generation_prompt: `A vintage studio microphone sitting in a dark, empty recording booth, with a single purple spotlight illuminating the metallic mesh. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.`
  },
  "The Producer's Secret Tape Log": {
    newTitle: "The Producer's Smoking Gun Audio",
    description: `🎙️ AUDIO RECORDING TRANSCRIPT\nSource: Security camera audio recovery (5:52 PM, 38s)\nSpeakers: {{Rikki}} & {{Jeremy}}\n\n[00:06] {{Rikki}}: "I'm serious — {{Dane}} is not okay. They're twitchy, I'm pretty sure they mixed something into the drinks."\n[00:14] {{Jeremy}}: "And you're telling me this like it's a problem?"\n[00:18] {{Rikki}}: "It's a liability. What if they snap?"\n[00:23] {{Jeremy}}: (laughs) "Then we get the footage. You want safe, go film MasterChef."`,
    generation_prompt: `A closed metallic laptop resting on a glossy black desk in a dark, empty production office, reflecting yellow and blue window lights. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k.`
  }
};

async function run() {
  const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';
  
  console.log('Fetching active clues for mystery ID:', mysteryId);
  const { data: clues, error: fetchErr } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId);

  if (fetchErr) {
    console.error('Error fetching clues:', fetchErr.message);
    return;
  }

  console.log(`Found ${clues.length} clues in the database.`);
  
  let successCount = 0;
  let failCount = 0;

  for (const clue of clues) {
    let update = CLUE_UPDATES[clue.title];
    if (!update) {
      update = Object.values(CLUE_UPDATES).find(u => u.newTitle === clue.title);
    }
    if (update) {
      console.log(`Updating clue: "${clue.title}"...`);
      const { data, error: updateErr } = await supabase
        .from('clues')
        .update({
          title: update.newTitle,
          description: update.description,
          generation_prompt: update.generation_prompt
        })
        .eq('id', clue.id)
        .select();

      if (updateErr) {
        console.error(`Failed to update "${clue.title}":`, updateErr.message);
        failCount++;
      } else {
        console.log(`Successfully updated "${clue.title}"!`);
        successCount++;
      }
    } else {
      console.log(`⚠️ No update mapped for clue titled: "${clue.title}"`);
    }
  }

  console.log(`\nUpdate run completed!`);
  console.log(`Successfully updated: ${successCount}`);
  console.log(`Failed to update: ${failCount}`);
}

run();
