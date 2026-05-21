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
  "The Threatening Text Chain": {
    newTitle: "The Threatening Letter",
    description: `An unsigned blackmail letter slipped under {{Gabby}}'s dressing room door: "You don't deserve the win. Everyone sees what you really are. Time someone did something about it."\n\nThe sender's contact name in {{Gabby}}'s phone is "Don't answer."`,
    generation_prompt: 'A dramatic close-up photograph of a handwritten blackmail note lying on wet asphalt in a dark city street at night. The paper is crumpled and creased, catching a red and blue neon glow from a streetlamp. Raindrops glisten on the dark ink, making some letters bleed. Gritty noir aesthetic, cinematic shot, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "Sienna's Group Chat Drop": {
    newTitle: "Sienna's Torn Note",
    description: `A torn, crumpled note found in the dressing room wastebasket in {{Sienna}}'s handwriting: "Ik im an a**hole but thought you should know what your sister said..."\n\nUnderneath, {{Gabby}}'s sharp reply is scribbled: "As I said before, IDGAF. {{Sienna}} needs character building anyway."`,
    generation_prompt: 'A close-up photograph of a crumpled, torn slip of paper lying on the floor of a dimly lit dressing room. The paper has hurried, handwritten script in black ink under the warm glow of a vanity mirror. Out-of-focus background reveals scattered cosmetic brushes and a glass of champagne. Gritty noir aesthetic, highly detailed paper texture, sharp focus, 8k resolution.'
  },
  "Dane's Google Search History": {
    newTitle: "Dane's Scribbled Notepad",
    description: `A leaf torn from {{Dane}}'s private notepad:\n- "How to poison someone"\n- "How to spike a drink without taste"\n- "Do sedatives show up in blood test"\n- "Alcohol + sleeping pills dangerous?"\n- "{{Gabby}} Love on the Rocks cute edits"`,
    generation_prompt: 'A close-up photograph of a small black leather notebook lying open on a dark mahogany table. Under the soft green light of a desk lamp, the page shows a hand-drawn list in dark ink with small sketches. An open brown glass apothecary bottle sits nearby. Gritty noir aesthetic, highly detailed paper texture, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "The Leaked DM Thread": {
    newTitle: "The Leaked Love Letter",
    description: `A folded letter from {{Dane}} found in {{Gabby}}'s handbag:\n\n{{Dane}}: "Colt and I were together at the same time. I'm more devastated than you."\n\nOn the back, {{Gabby}}'s cold reply: "I can assure you, you're not."`,
    generation_prompt: 'A dramatic close-up of a folded, crease-marked letter resting on a dark leather armchair under a soft teal spotlight. The handwriting is in elegant, smudged ink. Gritty noir aesthetic, low-key lighting, atmospheric shadows, cinematic shot, shallow depth of field, 8k resolution.'
  },
  "The Seen-Zoned Warning": {
    newTitle: "The Warning Coaster",
    description: `A cardboard drink coaster found at the VIP bar, with a message from signature "RealFan_Milo": "The reunion's gonna set someone off."\n\nOn the back, {{Gabby}} has scrawled a single word in red lipstick: "SEEN".`,
    generation_prompt: 'A dramatic close-up of a circular cardboard drink coaster lying next to a half-empty champagne flute on a dark polished marble bar counter. The coaster has a message handwritten in blue ink, and red lipstick marks on the side. The scene is illuminated by pink and purple neon lights. Gritty noir aesthetic, moody lighting, shallow depth of field, 8k resolution.'
  },
  "Rikki's Side Chat": {
    newTitle: "Rikki's Secret Diary Entry",
    description: `A page from {{Rikki}}'s locked diary:\n\n"Should I just tell them? They're gonna find out at some point. You should be the one. {{Gabby}} would hate it."`,
    generation_prompt: 'A moody close-up photograph of a page from a small, elegant diary resting on a glass vanity shelf inside a dimly lit bathroom. Hurried handwriting in purple fountain pen ink is partially visible on the page. Out-of-focus cosmetic jars glow in the background. Gritty noir aesthetic, highly detailed paper texture, purple ambient lighting, cinematic shot, 8k resolution.'
  },
  "The Main Cast Group Chat": {
    newTitle: "The Main Cast Rehearsal Board",
    description: `The dressing room whiteboard, covered in scribbled cast notes:\n- "You couldn't keep your story straight, could you S"\n- "Oh f*** off. Why are we talking about this here"\n- "Actually, why are we talking about this at all."`,
    generation_prompt: 'A close-up photograph of a white board inside a messy dressing room. On the board, multiple lines are scribbled in blue and black dry-erase markers, with some sections smudged and erased. The board is lit by a soft blue glow from a neon sign off-camera. Gritty noir aesthetic, cinematic shot, dramatic low-key lighting, 8k resolution.'
  },
  "Rikki's Glam Mirror Note": {
    newTitle: "Rikki's Glam Mirror Note",
    description: `A sticky note found on the glam mirror:\n"FYI — there was white powder all over the corner of my makeup mirror. Pretty sure {{Dane}} used it while I stepped out. Handle it if you need to. Just don't put it on me. – {{Milo}}"`,
    generation_prompt: 'A high-quality, professional photograph of a square neon sticky note stuck to the corner of a dirty, smudge-filled dressing room mirror. The handwritten note has clean, organic-looking handwriting in black ink under dramatic, low-key warm vanity bulb lighting. In the background, makeup jars and brushes are out of focus. Gritty noir aesthetic, highly detailed paper texture, cinematic shot, sharp focus, 8k resolution.'
  },
  "The Glam Room Production Note": {
    newTitle: "The Glam Room Production Note",
    description: `Production log from the glam room:\n"{{Dane}} spiralling re: {{Gabby}} & {{Colt}}. {{Colt}} and {{Gabby}} were in wardrobe for AGES. {{Rikki}} still hovering. Watch them, seems unstable. You know what to do..."`,
    generation_prompt: 'A high-quality close-up photograph of a printed production log sheet lying on a clipboard. The clipboard is resting on a cluttered metal styling table under harsh spotlighting. A line of text is circled in red pen, with crisp, legible print. Out-of-focus background reveals clothes racks and camera gear. Gritty noir aesthetic, highly detailed paper texture, cinematic shot, sharp focus, 8k resolution.'
  },
  "The Unsigned Bar Note": {
    newTitle: "The Unsigned Bar Note",
    description: `A folded note found near the bar:\n"Try to get {{Sienna}} to talk to ___. [Name crossed out]. You know what to do."`,
    generation_prompt: 'A dramatic close-up photograph of a folded, creased piece of paper resting on a wet dark marble bar counter. The note has hurried, handwritten text in dark ink under warm, direct spotlighting. Condensation drops from a nearby cocktail glass are visible on the paper. Gritty noir aesthetic, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.'
  },
  "Dane's Rage Texts": {
    newTitle: "Dane's Scrawled Warning",
    description: `A piece of hotel stationery scrawled in {{Dane}}'s handwriting: "If I have to watch them stand next to {{Gabby}} again I'll lose it. The cameras are on. But I will. I'm done being quiet."`,
    generation_prompt: 'A dramatic close-up of hotel stationery lying next to an open green pill bottle on a dark table. The handwriting is hurried and violent in dark ink, casting long shadows under dim green ambient light. Gritty noir aesthetic, low-key lighting, green atmosphere, shallow depth of field, 8k resolution.'
  },
  "The Inner Circle Group Chat": {
    newTitle: "The Gossip Column Clipping",
    description: `A scrap of a gossip magazine article found in a guest's purse: "...{{Dane}} is in glam pacing like they're about to explode. They asked me if {{Gabby}} still talks about them. I saw them staring at the champagne bottles. Is {{Dane}} still on their meds...? I'm not tryna get roofied tonight."`,
    generation_prompt: 'A moody close-up photograph of a torn newspaper gossip column scrap resting inside a leather handbag. The newsprint texture is highly detailed, with bold print and a highlighted passage. Gritty noir aesthetic, dramatic low-key lighting, atmospheric shadows, cinematic shot, 8k resolution.'
  },
  "Milo's Cheat Sheet Warning": {
    newTitle: "Milo's Lipstick Warning",
    description: `A warning written in red lipstick on the vanity mirror, found by {{Rikki}}: "The reunion's gonna set someone off. If someone snaps, it won't be a surprise."`,
    generation_prompt: 'A dramatic close-up of a message written in bold red lipstick on a glossy mirror surface. Warm light from a vanity bulb casts a glowing reflection on the glass, with makeup palettes and powder brushes out of focus in the foreground. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "Gabby's Final Message": {
    newTitle: "Gabby's Unsent Letter",
    description: `An unsent letter from {{Gabby}} to {{Colt}} found on a backstage table: "You okay? I feel like something's off. Let's talk before the toast..."`,
    generation_prompt: 'A moody close-up of a piece of cream-colored stationery lying next to a golden microphone in a dark, empty backstage hallway. The letter is written in fine fountain pen script, with soft gold backlighting casting dramatic shadows. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "The Wardrobe Intercept Audio": {
    newTitle: "The Wardrobe Eavesdropping Log",
    description: `A page from {{Jeremy}}'s notebook:\n- "{{Rikki}} said they were in wardrobe for 25 minutes. Just them — {{Colt}} and {{Gabby}}."\n- {{Dane}}'s reply: "You're joking."\n- {{Jeremy}}: "I'm not. Might be good to get that on camera."\n- {{Dane}}: "You'll get something."`,
    generation_prompt: 'A professional, high-quality close-up photograph of a page from a reporter\'s notebook. Hurried handwriting in blue ink shows transcription logs with timestamp notes. Out-of-focus background shows studio lights and camera rigs in a dark room. Gritty noir aesthetic, low-key lighting, cinematic shot, sharp focus, 8k resolution.'
  },
  "Milo's Diary Entry": {
    newTitle: "Milo's Leather Journal",
    description: `An entry from {{Milo}}'s private leather journal:\n\n"Tonight felt kind of perfect. I actually think I'm happy — like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening..."`,
    generation_prompt: 'A dramatic close-up of a hand-bound leather journal lying open on a dark velvet bedspread. The handwriting is in neat fountain pen script. Warm orange light from a bedside lamp casts long, atmospheric shadows. Gritty noir aesthetic, low-key lighting, cinematic shot, shallow depth of field, 8k resolution.'
  },
  "The Deleted Security Camera File": {
    newTitle: "The Shredded Security Log",
    description: `A piece of paper retrieved from the shredder:\n- "Restored file metadata: SEC CAM_4B [Bar Area]"\n- "Time: 5:40–6:05PM"\n- "Status: Permanently Deleted"\n- "Actioned by: {{Jeremy}} (jordan.p@doatv.tv)"\n- {{Jeremy}}'s quote: "It was mostly {{Rikki}} ranting anyway — no good angles. Not worth a storyline."`,
    generation_prompt: 'A dramatic close-up photograph of shredded strips of paper lying on a dark desk inside a production booth. The strips show fragments of typed log details and the word "DELETED" highlighted in red ink. Glowing control lights from an out-of-focus editing board cast blue and red light on the paper strips. Gritty noir aesthetic, low-key lighting, cinematic shot, shallow depth of field, 8k resolution.'
  },
  "Sienna & Zayn's Plan": {
    newTitle: "Sienna & Zayn's Blueprint Map",
    description: `A floor plan map of the penthouse with scribbled notes in {{Sienna}}'s handwriting: "I cannot believe she said that. Especially after EVERYTHING I've done. I have an idea — let's give her a taste of her own medicine. We look exactly the same."`,
    generation_prompt: 'A close-up photograph of a hand-drawn architectural floor plan map lying next to a small makeup palette. The map has arrows and notes scribbled in red marker, lit by a soft pink and grey glow. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "The Burning Heart Thread": {
    newTitle: "The Burning Heart Letter",
    description: `A letter between {{Gabby}} and an unsaved contact:\n- Only heart-on-fire drawings remain on the envelope.\n- The final note is {{Gabby}}'s, sent at 5:52PM — eight minutes before the toast.\n- No reply.`,
    generation_prompt: 'A dramatic close-up of a black wax-sealed envelope lying on a dark metallic surface. The envelope has a row of tiny red hand-drawn burning heart symbols. Deep pink and red ambient light casts a dramatic glow on the scene. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.'
  },
  "Milo's Final Draft": {
    newTitle: "Milo's Torn Scrap of Stationery",
    description: `A torn piece of stationery found in {{Milo}}'s drafts box: "...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well… there's only one way this ends. –R"`,
    generation_prompt: 'A moody close-up photograph of a torn piece of stationery paper lying on a dark sheet of satin fabric. The handwriting is elegant in dark ink, casting a cool white light onto the dark folds of satin from a cold window light. Gritty noir aesthetic, dramatic low-key lighting, atmospheric shadows, shallow depth of field, 8k resolution.'
  },
  "Gabby's Cocktail Napkin": {
    newTitle: "Gabby's Cocktail Napkin",
    description: `A cocktail napkin with {{Gabby}}'s handwriting found near the bar:\n"If this goes wrong tonight — it was always going to. -S"\nThe ink is smudged at the edge.`,
    generation_prompt: 'A paper cocktail napkin lying on a dark, wet bar counter next to spilled champagne. On the napkin, short handwritten words are written in blue ballpoint ink, with the signature smudged at the edge. Gritty noir aesthetic, dramatic low-key lighting, highly detailed paper texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.'
  },
  "The Recorded Argument": {
    newTitle: "The Eavesdropped Argument Transcript",
    description: `A printed dialogue transcript from {{Zayn}}'s files:\n- "You think this is just content?! This is my life."\n- "You said to post it."\n- "They already think you hooked up anyway."\n- *Pause*\n- "I never want to see you again."\n- "You're so dramatic."\n- "You're both on camera."`,
    generation_prompt: 'A moody close-up photograph of a typed transcript sheet lying on a glossy tabletop. The page has a highlighted dialogue exchange. Reflective neon lights are visible on the table surface. Gritty noir aesthetic, dramatic low-key lighting, shallow depth of field, 8k resolution.'
  },
  "The Love Rejection Note": {
    newTitle: "The Love Rejection Note",
    description: `On hotel stationery, crumpled near the champagne table:\n"...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends."\nNo signature — but the handwriting matches {{Milo}}'s fan mail.`,
    generation_prompt: 'A high-quality, professional close-up photograph of a crumpled piece of cream-colored hotel stationery lying on a polished mahogany floor. Hurried, handwritten script in dark fountain pen ink is partially visible on the creases. Dramatic low-key spotlighting casts deep shadows in the paper folds. Gritty noir aesthetic, highly detailed paper texture, sharp focus, 8k resolution.'
  },
  "Rikki's Warning Voice Note": {
    newTitle: "Rikki's Urgently Scribbled Bar Note",
    description: `A message scribbled on hotel stationery: "Something isn't right. {{Milo}} was at the bar alone for two minutes when nobody was looking. Just standing there. Switching something. I thought it was their glass. {{Jeremy}}, call me back."`,
    generation_prompt: 'A moody close-up photograph of a piece of stationery paper resting on a fabric vanity stool. The handwriting is scribbled and messy, under low-key purple ambient lighting that casts deep shadows. Gritty noir aesthetic, shallow depth of field, 8k resolution.'
  },
  "The Glass Switch Photo": {
    newTitle: "The Glass Switch Polaroid",
    description: `A blurry Polaroid photo timestamped 6:03PM retrieved from a guest's pocket.\n\nIn the background: a figure in orange ({{Milo}}'s colour code) is seen moving two champagne flutes on the serving tray, swapping their positions.`,
    generation_prompt: 'A professional close-up photograph of a physical Polaroid snapshot lying on a wooden table. The photo shows a dark penthouse party room with guests in the foreground. In the distant, blurry background, a figure wearing a bright orange jacket is caught in motion near a cocktail tray. Gritty noir aesthetic, dramatic low-key lighting, cinematic shot, sharp focus on the Polaroid border, 8k resolution.'
  },
  "Milo's Confessional Voice Note": {
    newTitle: "Milo's Written Confession",
    description: `A handwritten letter on heavy, blood-red stationery: "I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came… I directed it to go exactly where it needed to. It's wild how things just fall into place. Some people live for the camera. Some people die for it. Either way… I'm part of the story now."`,
    generation_prompt: 'A dramatic close-up of a sheet of deep red stationery paper lying open on a dark glass desk. The handwriting is in neat black ink, casting long shadows. Cinematic moody lighting casts deep shadows on the glass table. Gritty noir aesthetic, sharp focus, 8k resolution.'
  },
  "The Producer's Smoking Gun Audio": {
    newTitle: "The Producer's Secret Tape Log",
    description: `A page from {{Rikki}}'s diary:\n\n{{Rikki}}: "I'm serious — {{Dane}} is not okay. They're twitchy, I'm pretty sure they mixed something into the drinks."\n\n{{Jeremy}}: "And you're telling me this like it's a problem?"\n\n{{Rikki}}: "It's a liability. What if they snap?"\n\n{{Jeremy}}: (laughs) "Then we get the footage. You want safe, go film MasterChef."`,
    generation_prompt: 'A moody close-up photograph of a spiral notebook resting inside a dark studio desk. The page displays a handwritten conversation script. A blue desk lamp glows in the background, casting light on the desk surface. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.'
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
    const update = CLUE_UPDATES[clue.title];
    if (update) {
      console.log(`Updating clue: "${clue.title}" to "${update.newTitle}"...`);
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
