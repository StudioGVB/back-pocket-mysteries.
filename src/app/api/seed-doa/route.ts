import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

// Helper to insert a character and throw if it fails
async function insertCharacter(supabase: any, payload: any): Promise<{ id: string }> {
  const { data, error } = await supabase.from('characters').insert(payload).select().single();
  if (error || !data) throw new Error(`Failed to insert character "${payload.name}": ${error?.message}`);
  return data;
}

// Deduplicate relationships by canonical key (smaller_id|larger_id)
function dedupeRelationships(rels: any[]): any[] {
  const seen = new Set<string>();
  return rels.filter(r => {
    const key = [r.character_a_id, r.character_b_id].sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    
    // 1. Get authenticated user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Unauthorized', 
          message: 'Please make sure you are logged into the Back Pocket Mysteries application first, then refresh this page!' 
        }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the mystery ID from URL search params
    const { searchParams } = new URL(request.url);
    const mysteryId = searchParams.get('id');

    if (!mysteryId) {
      return NextResponse.json({ success: false, error: 'Missing mystery ID parameter ?id=...' }, { status: 400 });
    }

    console.log(`API Seeder: Attempting to reset/seed mystery ID ${mysteryId} for user ${user.id}`);

    // Verify mystery exists and belongs to the user
    const { data: mystery, error: getMysteryErr } = await supabase
      .from('mysteries')
      .select('id')
      .eq('id', mysteryId)
      .eq('created_by', user.id)
      .single();

    if (getMysteryErr || !mystery) {
      console.error('API Seeder: Mystery not found or unauthorized:', getMysteryErr);
      return NextResponse.json({ 
        success: false, 
        error: 'Mystery not found or unauthorized', 
        message: 'Could not locate a mystery with that ID owned by your current account.' 
      }, { status: 404 });
    }

    // 2. Cascade delete existing dependent records for this specific mystery
    console.log(`API Seeder: Purging existing dependent records for mystery ${mysteryId}...`);
    
    await supabase.from('relationships').delete().eq('mystery_id', mysteryId);
    await supabase.from('motives').delete().eq('mystery_id', mysteryId);
    await supabase.from('clues').delete().eq('mystery_id', mysteryId);
    
    // Delete subplot beats first, then subplots
    const { data: subs } = await supabase.from('subplots').select('id').eq('mystery_id', mysteryId);
    if (subs && subs.length > 0) {
      const subIds = subs.map(s => s.id);
      await supabase.from('subplot_beats').delete().in('subplot_id', subIds);
    }
    await supabase.from('subplots').delete().eq('mystery_id', mysteryId);
    await supabase.from('plot_beats').delete().eq('mystery_id', mysteryId);
    await supabase.from('characters').delete().eq('mystery_id', mysteryId);

    // 3. Update the base mystery with Love On The Rocks metadata and 9 player constraints
    const { error: updateBaseErr } = await supabase
      .from('mysteries')
      .update({
        title: "Love On The Rocks",
        theme: "Reality TV Reunion",
        description: "The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of \"Love On The Rocks\" — Season 3's most-watched dating show — have reunited for the glitzy wrap party at a five-star hotel penthouse. Gabby walked away with the crown, the following, and the guy. But in this room, everyone has a score to settle. When Gabby collapses mid-champagne-toast, poisoned in front of fifty witnesses and a rolling camera, everyone becomes a suspect. One person planned to kill. Another switched the target. And now the story has a very different ending.",
        inside_jokes: "Remember: the cameras are always on. Even when they shouldn't be.",
        min_players: 9,
        max_players: 9,
        status: 'draft',
        complexity: 'medium',
        spice_level: 'mild'
      })
      .eq('id', mysteryId);

    if (updateBaseErr) {
      console.error('API Seeder: Failed to update base mystery:', updateBaseErr);
      throw new Error(`Failed to update base mystery: ${updateBaseErr.message}`);
    }

    // 4. Seed Characters (using correct real-world LOTR names)
    console.log(`API Seeder: Inserting new characters for mystery ${mysteryId}...`);
    
    const skye = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Gabby|The Star|Victim",
      gender: "female",
      is_victim: true,
      plot_role: "victim",
      archetype: "victim",
      is_mandatory: true,
      profile_data: {
        color: "Pink",
        bio: "Gabby won Love on the Rocks Season 4. Crowned queen of chaos, she had the most followers, the most airtime, and the most drama. She played the game flawlessly — sweet when the cameras rolled, ruthless when they didn't. Ask anyone in this room and you'll get a different version of Gabby. Gabby walks into the reunion like she's still the main character. She always knew how to keep her enemies close. That's why half the room still calls themselves her friend.",
        outfit_advice: "Elegant and effortless. Think a silky slip dress or bias-cut skirt in luxe neutrals or muted jewel tones — like someone used to being photographed. Add soft waves, dewy makeup, and a killer heel.",
        act_summary: "You won the show and you're still the fan favourite — but you know people want to see you fall. Smile sweetly, keep it composed, but never let them forget who came out on top.",
        act_bullets: ["Be effortlessly poised, like everything rolls off you", "Stay friendly, but always keep control of the room", "Laugh off shade — or casually mention your brand deals instead", "Never raise your voice — just raise your eyebrows"],
        traits: ["Poised", "Strategic", "Charming", "Untouchable"]
      }
    });

    const nova = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Sienna|The Sister|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Pink (lighter shade)",
        bio: "Sienna was never supposed to be on Love on the Rocks — but she showed up to every red carpet and finale taping like she was born for it. Half the fandom didn't realise she wasn't a cast member. She's younger, louder, and tired of living in Gabby's shadow. She says she's just here to support her sister. But that dress, that flirty laugh, and that weird tension with Zayn? Feels more like she's here to make a name for herself.",
        outfit_advice: "Slinky, sultry, and just a little too polished for a reunion. Soft clingy fabrics, neutral or warm tones, mini skirts or a maxi with a cutout. Sunglasses (yes, indoors) and a smug little smirk.",
        act_summary: "Sienna is always performing — for the cameras, for the group, for herself. She's charming until she's not.",
        act_bullets: ["Always has a comeback (even if it makes no sense)", "Drops gossip like it's casual conversation", "Jealousy masked as confidence", "Thinks she's the main character", "Flirts to cause chaos, not connection"],
        traits: ["Loud", "Ambitious", "Jealous", "Unpredictable"]
      }
    });

    const blaze = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Dane|The Ex|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "assistant",
      archetype: "villain",
      is_mandatory: true,
      profile_data: {
        color: "Green",
        bio: "Dane was Love on the Rocks' poster person — gorgeous, magnetic, and completely toxic. They and Gabby were the golden couple… until Betrayal Week, when Dane kissed another cast member 'for the challenge' and tried to gaslight their way out of it. Now they're back claiming to be chill. They're jittery, distracted, constantly checking their phone. Peace doesn't usually come in crushed-up capsules.",
        presentation_female: {
          bio: "She and Gabby were the golden couple of Season 3 until Betrayal Week. She's back, claiming inner peace — but her hands won't stop shaking.",
          outfit_advice: "Something clean and curated — white or beige button-up, relaxed pants, silver or leather chain — like you're trying to look peaceful but still hot.",
          act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions Gabby.",
          act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
        },
        presentation_male: {
          bio: "He and Gabby were the golden couple of Season 3 until Betrayal Week. He's back, claiming inner peace — but his hands won't stop shaking.",
          outfit_advice: "Something clean and curated — white or beige button-up, relaxed pants, silver or leather chain — like you're trying to look peaceful but still hot.",
          act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions Gabby.",
          act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
        },
        traits: ["Volatile", "Obsessive", "Charming", "Unstable"]
      }
    });

    const cole = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Colt|The Host|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Gold",
        bio: "Colt was the host of Love on the Rocks — smooth, flirty, and always camera-ready. Supposed to stay neutral. Off-camera, they blurred a few lines, but fans forgave them — great TV. Everyone remembers the banter, the cocktail toasts, and that one moment they 'accidentally' kissed a contestant. It got edited out, of course.",
        presentation_female: {
          bio: "She was the host of Love On The Rocks — smooth, flirty, camera-ready. Supposed to stay neutral. Didn't.",
          outfit_advice: "Slick but low-effort. A fitted shirt (one-too-few buttons), nice dark jeans, a statement gold necklace — like you're still trying to look bookable for a panel show.",
          act_summary: "You're not the drama — you just film it. Stay smooth, funny, and never admit to anything.",
          act_bullets: ["Be charming and flirty with everyone", "Speak like you're still mic'd up", "Act above the drama — even if you're behind it"]
        },
        presentation_male: {
          bio: "He was the host of Love On The Rocks — smooth, flirty, camera-ready. Supposed to stay neutral. Didn't.",
          outfit_advice: "Slick but low-effort. A fitted shirt (one-too-few buttons), nice dark jeans, a gold chain — like you're still trying to look bookable for a panel show.",
          act_summary: "You're not the drama — you just film it. Stay smooth, funny, and never admit to anything.",
          act_bullets: ["Be charming and flirty with everyone", "Speak like you're still mic'd up", "Act above the drama — even if you're behind it"]
        },
        traits: ["Smooth", "Strategic", "Flirtatious", "Evasive"]
      }
    });

    const rex = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Milo|The Superfan|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "killer",
      archetype: "villain",
      is_mandatory: true,
      profile_data: {
        color: "Orange",
        bio: "Milo wasn't part of the original cast — they were a fan-voted wildcard for the reunion special. Their TikTok edits, Reddit theories, and obsessive posts made them a cult favourite. Charming in a 'knows too much' kind of way. Obsessed with the show, and maybe a little more obsessed with Gabby. They say they're just here to experience it all… but they've been watching for years. Every move. Every scandal. Every deleted scene.",
        presentation_female: {
          bio: "She campaigned to join the reunion like her life depended on it. Because, in a way, it did. She's obsessed with Gabby — and convinced this is her big moment.",
          outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers — like she spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
          act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
          act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention Gabby in casual conversation… constantly"]
        },
        presentation_male: {
          bio: "He campaigned to join the reunion like his life depended on it. Because, in a way, it did. He's obsessed with Gabby — and convinced this is his big moment.",
          outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers — like he spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
          act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
          act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention Gabby in casual conversation… constantly"]
        },
        traits: ["Obsessive", "Intense", "Calculating", "Devoted"]
      }
    });

    const jordan = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Jeremy|The Producer Plant|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "investigator",
      is_mandatory: true,
      profile_data: {
        color: "Blue",
        bio: "Jeremy wasn't just a contestant — they were a twist. A 'regular person' fan-favourite who came in mid-season and shook things up. But what the cast didn't know? Jeremy was planted by production to stir drama. Every whisper, every fight, every 'accidental' reveal — Jeremy was the match. Off contract now, but still taking notes. Still pushing buttons. Why does Jeremy still know everything that happens off-camera?",
        presentation_female: {
          bio: "She was planted by production as a contestant. She knows everything that happens off-camera — and deleted the security footage that would have saved Gabby.",
          outfit_advice: "Creative but harmless — tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
          act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
          act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
        },
        presentation_male: {
          bio: "He was planted by production as a contestant. He knows everything that happens off-camera — and deleted the security footage that would have saved Gabby.",
          outfit_advice: "Creative but harmless — tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
          act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
          act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
        },
        traits: ["Calculating", "Charming", "Secretive", "Manipulative"]
      }
    });

    const brooke = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Ava|The Runner-Up|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "hero",
      is_mandatory: true,
      profile_data: {
        color: "Yellow",
        bio: "Ava made it to the final two — and then watched Gabby get the crown and the guy. It was close. Too close. For weeks the hashtags trended her way: #JusticeForAva, #WrongGirlWon. She and Gabby were tight. Until they weren't. Ava swears nothing happened, that Gabby just stopped texting. Still, she showed up to this reunion polished, prepared, and one glass of wine away from a breakdown.",
        outfit_advice: "High-glam and high-stakes. Sequins, metallics, or anything body-hugging and eye-catching — the outfit that says 'I'm fine' while setting the room on fire. Heels, glossy lips, too much bronzer.",
        act_summary: "You're here to be civil, mature, and definitely not bitter. But the second someone brings up Gabby, your smile gets tight and your voice gets just a little too loud.",
        act_bullets: ["Overcompensate with confidence and sass", "Throw 'no shade' shade constantly", "Pretend not to care — while watching everything Gabby does", "Look for opportunities to steal back the spotlight"],
        traits: ["Bitter", "Polished", "Competitive", "Wounded"]
      }
    });

    const zane = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Zayn|The Fan-Favourite Flameout|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "sidekick",
      is_mandatory: true,
      profile_data: {
        color: "Black",
        bio: "Zayn came into Love on the Rocks bold, loud, and instantly iconic. They flirted with everyone, stirred the pot on purpose, and gave the kind of messy interviews that live forever online. They didn't win — but they won the internet. At least until the final cut. Most of Zayn's scenes were edited out of the reunion special. Now Zayn's holding onto that rage — cryptic posts, bitter captions. Tonight: fresh spray tan, vengeance arc, nothing left to lose.",
        presentation_female: {
          bio: "She flirted with everyone, gave messy interviews, and won the internet — until production edited her out of the reunion. She's back. She's bitter. She's got nothing to lose.",
          outfit_advice: "All black, all attitude. Fitted tops, wide-leg pants, leather or layered textures. Chunky rings, a crossbody strap, boots you can storm out in.",
          act_summary: "You're flirty, shady, and deeply unserious… until someone brings up the edit. Then the façade slips.",
          act_bullets: ["Flirt with everyone — especially people you shouldn't", "Drop snarky one-liners and play innocent", "Refer to 'the edit' constantly"]
        },
        presentation_male: {
          bio: "He flirted with everyone, gave messy interviews, and won the internet — until production edited him out of the reunion. He's back. He's bitter. He's got nothing to lose.",
          outfit_advice: "All black, all attitude. Fitted tops, wide-leg pants, leather or layered textures. Chunky rings, a crossbody strap, boots you can storm out in.",
          act_summary: "You're flirty, shady, and deeply unserious… until someone brings up the edit. Then the façade slips.",
          act_bullets: ["Flirt with everyone — especially people you shouldn't", "Drop snarky one-liners and play innocent", "Refer to 'the edit' constantly"]
        },
        traits: ["Chaotic", "Magnetic", "Vengeful", "Theatrical"]
      }
    });

    const mara = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "Rikki|The Hair & Makeup Artist|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Purple",
        bio: "Rikki was the glam guru behind the scenes — head of hair and makeup for Love On The Rocks. She and Gabby got close during filming, late-night-spill-your-guts close. But after the finale, Gabby stopped replying. No call. No thank you. Just silence. Now Rikki's been dragged into the reunion, touch-up kit in tow. She says she's just here to powder noses and sip champagne… but someone's been feeding behind-the-scenes tea to a certain someone.",
        outfit_advice: "Vibrant, artsy, and emotionally layered. Bold patterns, rainbow knits, playful textures, or anything vintage-inspired. Dopamine dressing with zero subtlety — you make colour look dangerous.",
        act_summary: "You know too much and you're not above letting it slip. Sarcastic, cutting, always one step ahead — but you pretend you're just here for the vibes.",
        act_bullets: ["Make everything sound like a joke… until it's not", "Give compliments that feel like insults", "Watch everything, say nothing (until it matters)", "Be casually petty — especially toward Gabby", "If accused of drama: 'I don't start it, I just retouch it'"],
        traits: ["Perceptive", "Petty", "Artistic", "Emotionally Guarded"]
      }
    });

    // 5. Seed Motives
    console.log(`API Seeder: Inserting motives...`);
    const { error: doaMotErr } = await supabase.from('motives').insert([
      { mystery_id: mysteryId, character_id: nova.id, motive_type: 'power', strength: 'moderate', linked_character_id: skye.id, notes: "Tired of being Gabby's shadow. Wants the spotlight — but murder wasn't on her mood board." },
      { mystery_id: mysteryId, character_id: blaze.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Prepared the poison for Colt, not Gabby — but jealousy and drug use made them a puppet in Milo's hands." },
      { mystery_id: mysteryId, character_id: cole.id, motive_type: 'fear', strength: 'low', linked_character_id: skye.id, notes: "Knew Dane was unstable; said nothing because it made for good TV." },
      { mystery_id: mysteryId, character_id: rex.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Rejected by Gabby for the last time, Milo switched the glasses — a twisted act of 'being part of her story forever'." },
      { mystery_id: mysteryId, character_id: jordan.id, motive_type: 'greed', strength: 'high', linked_character_id: skye.id, notes: "Deleted the security footage. Knew something was wrong and let it happen for the content." },
      { mystery_id: mysteryId, character_id: brooke.id, motive_type: 'revenge', strength: 'high', linked_character_id: skye.id, notes: "Never forgave Gabby for stealing the win and going silent. Had motive, opportunity, and a very convenient alibi." },
      { mystery_id: mysteryId, character_id: zane.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Had most of their footage cut from the reunion special. Came with a vengeance arc but no actual plan." },
      { mystery_id: mysteryId, character_id: mara.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Ghosted by Gabby post-show after a deep friendship. Sent the warning — but too late." }
    ]);
    if (doaMotErr) throw new Error(`DOA motives failed: ${doaMotErr.message}`);

    // 6. Seed Relationships
    console.log(`API Seeder: Inserting relationships...`);
    const doaRawRels = [
      { char1: skye, char2: nova, dynamics: ['family'], notes: "Sisters — but Sienna lives entirely in Gabby's shadow and resents every second of it." },
      { char1: skye, char2: blaze, dynamics: ['romantic', 'rivals'], notes: "The ex. They were the golden couple until Dane kissed someone else 'for the challenge'." },
      { char1: skye, char2: cole, dynamics: ['romantic', 'co-workers'], notes: "Secretly hooking up since the show ended. The catalyst for Dane's breakdown." },
      { char1: skye, char2: rex, dynamics: ['co-workers'], notes: "Milo is obsessively devoted to Skye; Gabby laughed off Milo's love confession an hour before dying." },
      { char1: skye, char2: jordan, dynamics: ['co-workers'], notes: "Jeremy planted as a producer to stir drama around Skye; knows all her secrets." },
      { char1: skye, char2: brooke, dynamics: ['rivals', 'besties'], notes: "Were close allies on the show — until Gabby won and stopped texting back." },
      { char1: skye, char2: zane, dynamics: ['co-workers'], notes: "Gabby's edit overshadowed Zayn's best footage; Zayn holds a low-grade grudge." },
      { char1: skye, char2: mara, dynamics: ['friends', 'co-workers'], notes: "Gabby ghosted Rikki post-show despite a close friendship during filming." },
      { char1: blaze, char2: rex, dynamics: ['rivals'], notes: "Both obsessed with Gabby but for very different reasons. Milo knows Dane's plan." },
      { char1: blaze, char2: cole, dynamics: ['rivals'], notes: "Dane discovered Colt and Gabby's secret hookups — the trigger for the whole plot." },
      { char1: jordan, char2: mara, dynamics: ['co-workers'], notes: "Rikki tried to alert Jeremy about Dane's behaviour; Jeremy used it as entertainment." },
      { char1: brooke, char2: nova, dynamics: ['besties'], notes: "Bonded over being sidelined by Gabby. Sienna promised to 'handle it'." },
      { char1: zane, char2: nova, dynamics: ['romantic', 'co-workers'], notes: "Flirtatious and chaotic; Sienna suggested they 'give Gabby a taste of her own medicine'." },
      { char1: cole, char2: jordan, dynamics: ['co-workers', 'friends'], notes: "Jeremy tipped Colt off about Dane's behaviour — mainly for the footage." },
      { char1: rex, char2: mara, dynamics: ['co-workers'], notes: "Rikki noticed Milo at the bar right before the toast and sent a warning to Jeremy." },
      { char1: brooke, char2: mara, dynamics: ['friends'], notes: "Drinking buddies who gossip about cast drama and production secrets." }
    ];
    const doaSortedRels = dedupeRelationships(doaRawRels.map(rel => {
      const [a, b] = [rel.char1.id, rel.char2.id].sort();
      return { mystery_id: mysteryId, character_a_id: a, character_b_id: b, know_each_other: true, dynamics: rel.dynamics, notes: rel.notes };
    }));
    const { error: doaRelErr } = await supabase.from('relationships').insert(doaSortedRels);
    if (doaRelErr) throw new Error(`DOA relationships failed: ${doaRelErr.message}`);

    // 7. Seed Plot Beats
    console.log(`API Seeder: Inserting plot beats...`);
    const doaInsertBeat = async (payload: any) => {
      const { data, error } = await supabase.from('plot_beats').insert(payload).select().single();
      if (error || !data) throw new Error(`DOA beat insert failed: ${error?.message}`);
      return data;
    };
    const doaB1 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 1, sort_order: 1, event_title: "The Reunion Kicks Off", description: "The cast arrives at the penthouse. Gabby walks in last, commanding the room. Old tensions surface immediately — Ava's smile doesn't reach her eyes, Dane won't stop staring, and Milo already knows everyone's drink order by heart. Someone already knows they're here for more than just a catch-up.", characters_involved: [skye.id, brooke.id, blaze.id, rex.id, zane.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
    const doaB2 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 2, sort_order: 2, event_title: "Dane Discovers The Betrayal", description: "Dane discovers Gabby has been secretly hooking up with Colt since the show ended. A string of leaked texts and group chat drama makes it impossible to ignore. Consumed by jealousy and fuelled by whatever's in their pocket, Dane begins to spiral and starts Googling things they shouldn't.", characters_involved: [blaze.id, skye.id, cole.id, jordan.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
    const doaB3 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 3, sort_order: 3, event_title: "Milo Knows Dane's Plan", description: "Milo has been 'documenting' everyone in the building. Through overheard conversations and obsessive note-taking, Milo pieces together that Dane is planning to poison Colt's drink. Milo confesses their love to Gabby one final time. Gabby laughs it off. Milo goes very quiet.", characters_involved: [rex.id, blaze.id, skye.id], is_required: true, beat_type: 'twist', timeline_phase: 'crime' });
    const doaB4 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 4, sort_order: 4, event_title: "Dane Poisons The Drink", description: "High and heartbroken, Dane slips sedatives mixed with a lethal dose into a glass intended for Colt during the pre-toast drinks set-up. Rikki notices Dane acting strangely near the bar and alerts Jeremy. Jeremy files it away as useful content rather than a crisis.", characters_involved: [blaze.id, cole.id, mara.id, jordan.id], is_required: true, beat_type: 'clue_reveal', timeline_phase: 'crime' });
    const doaB5 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 5, sort_order: 5, event_title: "Milo Switches The Glasses", description: "Just before the champagne toast, Milo switches Gabby's glass with Colt's poisoned one — a final, twisted act of devotion. 'If I can't have her story, I'll be the ending.' Nobody sees it happen. The cameras are pointed the wrong way.", characters_involved: [rex.id, skye.id, cole.id], is_required: true, beat_type: 'twist', timeline_phase: 'crime' });
    const doaB6 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 6, sort_order: 6, event_title: "Gabby Collapses", description: "Mid-toast, Gabby drinks the champagne. Within minutes she's pale, then unconscious, then still. The room descends into chaos. Dane stands frozen — they know what's in that glass. But they also know who was supposed to drink it.", characters_involved: [skye.id, blaze.id, rex.id, mara.id, cole.id], is_required: true, beat_type: 'discovery', timeline_phase: 'crime' });
    const doaB7 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 7, sort_order: 7, event_title: "The Cover-Up Unravels", description: "Jeremy, always filming, caught fragments of everything. Rikki's notes from glam. Milo's too-calm demeanor. Dane's Google history. The pieces start fitting together in ways nobody wants them to. A deleted security camera file is recovered. Its timestamp is damning.", characters_involved: [jordan.id, mara.id, rex.id, blaze.id], is_required: true, beat_type: 'clue_reveal', timeline_phase: 'investigation' });
    const doaB8 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 8, sort_order: 8, event_title: "The Confession", description: "Milo, believing they've become part of Gabby's legacy forever, leaves a voice note: 'Some people live for the camera. Some people die for it. Either way… I'm part of the story now.' It's the most chilling thing anyone in the room has ever heard.", characters_involved: [rex.id], is_required: true, beat_type: 'twist', timeline_phase: 'resolution' });

    // 8. Seed Clues
    console.log(`API Seeder: Inserting clues...`);
    const { error: doaClueErr } = await supabase.from('clues').insert([
      // Round 1
      {
        mystery_id: mysteryId,
        title: "The Threatening Letter",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB1.id,
        description: `An unsigned blackmail letter slipped under {{Gabby}}'s dressing room door: "You don't deserve the win. Everyone sees what you really are. Time someone did something about it."\n\nThe sender's contact name in {{Gabby}}'s phone is "Don't answer."`,
        generation_prompt: `A dramatic close-up photograph of a handwritten blackmail note lying on wet asphalt in a dark city street at night. The paper is crumpled and creased, catching a red and blue neon glow from a streetlamp. Raindrops glisten on the dark ink, making some letters bleed. Gritty noir aesthetic, cinematic shot, low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Sienna's Torn Note",
        clue_type: 'secret',
        implication_type: 'red_herring',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB1.id,
        description: `A torn, crumpled note found in the dressing room wastebasket in {{Sienna}}'s handwriting: "Ik im an a**hole but thought you should know what your sister said..."\n\nUnderneath, {{Gabby}}'s sharp reply is scribbled: "As I said before, IDGAF. {{Sienna}} needs character building anyway."`,
        generation_prompt: `A close-up photograph of a crumpled, torn slip of paper lying on the floor of a dimly lit dressing room. The paper has hurried, handwritten script in black ink under the warm glow of a vanity mirror. Out-of-focus background reveals scattered cosmetic brushes and a glass of champagne. Gritty noir aesthetic, highly detailed paper texture, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Dane's Scribbled Notepad",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB2.id,
        description: `A leaf torn from {{Dane}}'s private notepad:\n- "How to poison someone"\n- "How to spike a drink without taste"\n- "Do sedatives show up in blood test"\n- "Alcohol + sleeping pills dangerous?"\n- "{{Gabby}} Love on the Rocks cute edits"`,
        generation_prompt: `A close-up photograph of a small black leather notebook lying open on a dark mahogany table. Under the soft green light of a desk lamp, the page shows a hand-drawn list in dark ink with small sketches. An open brown glass apothecary bottle sits nearby. Gritty noir aesthetic, highly detailed paper texture, low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Leaked Love Letter",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB2.id,
        description: `A folded letter from {{Dane}} found in {{Gabby}}'s handbag:\n\n{{Dane}}: "Colt and I were together at the same time. I'm more devastated than you."\n\nOn the back, {{Gabby}}'s cold reply: "I can assure you, you're not."`,
        generation_prompt: `A dramatic close-up of a folded, crease-marked letter resting on a dark leather armchair under a soft teal spotlight. The handwriting is in elegant, smudged ink. Gritty noir aesthetic, low-key lighting, atmospheric shadows, cinematic shot, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Warning Coaster",
        clue_type: 'secret',
        implication_type: 'red_herring',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB1.id,
        description: `A cardboard drink coaster found at the VIP bar, with a message from signature "RealFan_Milo": "The reunion's gonna set someone off."\n\nOn the back, {{Gabby}} has scrawled a single word in red lipstick: "SEEN".`,
        generation_prompt: `A dramatic close-up of a circular cardboard drink coaster lying next to a half-empty champagne flute on a dark polished marble bar counter. The coaster has a message handwritten in blue ink, and red lipstick marks on the side. The scene is illuminated by pink and purple neon lights. Gritty noir aesthetic, moody lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Rikki's Secret Diary Entry",
        clue_type: 'testimony',
        implication_type: 'circumstantial',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB4.id,
        description: `A page from {{Rikki}}'s locked diary:\n\n"Should I just tell them? They're gonna find out at some point. You should be the one. {{Gabby}} would hate it."`,
        generation_prompt: `A moody close-up photograph of a page from a small, elegant diary resting on a glass vanity shelf inside a dimly lit bathroom. Hurried handwriting in purple fountain pen ink is partially visible on the page. Out-of-focus cosmetic jars glow in the background. Gritty noir aesthetic, highly detailed paper texture, purple ambient lighting, cinematic shot, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Main Cast Rehearsal Board",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: doaB1.id,
        description: `The dressing room whiteboard, covered in scribbled cast notes:\n- "You couldn't keep your story straight, could you S"\n- "Oh f*** off. Why are we talking about this here"\n- "Actually, why are we talking about this at all."`,
        generation_prompt: `A close-up photograph of a white board inside a messy dressing room. On the board, multiple lines are scribbled in blue and black dry-erase markers, with some sections smudged and erased. The board is lit by a soft blue glow from a neon sign off-camera. Gritty noir aesthetic, cinematic shot, dramatic low-key lighting, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Rikki's Glam Mirror Note",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB4.id,
        description: `A sticky note found on the glam mirror:\n"FYI — there was white powder all over the corner of my makeup mirror. Pretty sure {{Dane}} used it while I stepped out. Handle it if you need to. Just don't put it on me. – {{Milo}}"`,
        generation_prompt: `A high-quality, professional photograph of a square neon sticky note stuck to the corner of a dirty, smudge-filled dressing room mirror. The handwritten note has clean, organic-looking handwriting in black ink under dramatic, low-key warm vanity bulb lighting. In the background, makeup jars and brushes are out of focus. Gritty noir aesthetic, highly detailed paper texture, cinematic shot, sharp focus, 8k resolution.`
      },

      // Round 2
      {
        mystery_id: mysteryId,
        title: "The Glam Room Production Note",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB4.id,
        description: `Production log from the glam room:\n"{{Dane}} spiralling re: {{Gabby}} & {{Colt}}. {{Colt}} and {{Gabby}} were in wardrobe for AGES. {{Rikki}} still hovering. Watch them, seems unstable. You know what to do..."`,
        generation_prompt: `A high-quality close-up photograph of a printed production log sheet lying on a clipboard. The clipboard is resting on a cluttered metal styling table under harsh spotlighting. A line of text is circled in red pen, with crisp, legible print. Out-of-focus background reveals clothes racks and camera gear. Gritty noir aesthetic, highly detailed paper texture, cinematic shot, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Unsigned Bar Note",
        clue_type: 'physical',
        implication_type: 'red_herring',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: doaB4.id,
        description: `A folded note found near the bar:\n"Try to get {{Sienna}} to talk to ___. [Name crossed out]. You know what to do."`,
        generation_prompt: `A dramatic close-up photograph of a folded, creased piece of paper resting on a wet dark marble bar counter. The note has hurried, handwritten text in dark ink under warm, direct spotlighting. Condensation drops from a nearby cocktail glass are visible on the paper. Gritty noir aesthetic, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Dane's Scrawled Warning",
        clue_type: 'secret',
        implication_type: 'direct',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB2.id,
        description: `A piece of hotel stationery scrawled in {{Dane}}'s handwriting: "If I have to watch them stand next to {{Gabby}} again I'll lose it. The cameras are on. But I will. I'm done being quiet."`,
        generation_prompt: `A dramatic close-up of hotel stationery lying next to an open green pill bottle on a dark table. The handwriting is hurried and violent in dark ink, casting long shadows under dim green ambient light. Gritty noir aesthetic, low-key lighting, green atmosphere, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Gossip Column Clipping",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: doaB4.id,
        description: `A scrap of a gossip magazine article found in a guest's purse: "...{{Dane}} is in glam pacing like they're about to explode. They asked me if {{Gabby}} still talks about them. I saw them staring at the champagne bottles. Is {{Dane}} still on their meds...? I'm not tryna get roofied tonight."`,
        generation_prompt: `A moody close-up photograph of a torn newspaper gossip column scrap resting inside a leather handbag. The newsprint texture is highly detailed, with bold print and a highlighted passage. Gritty noir aesthetic, dramatic low-key lighting, atmospheric shadows, cinematic shot, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Milo's Lipstick Warning",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: doaB3.id,
        description: `A warning written in red lipstick on the vanity mirror, found by {{Rikki}}: "The reunion's gonna set someone off. If someone snaps, it won't be a surprise."`,
        generation_prompt: `A dramatic close-up of a message written in bold red lipstick on a glossy mirror surface. Warm light from a vanity bulb casts a glowing reflection on the glass, with makeup palettes and powder brushes out of focus in the foreground. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Gabby's Unsent Letter",
        clue_type: 'secret',
        implication_type: 'direct',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB6.id,
        description: `An unsent letter from {{Gabby}} to {{Colt}} found on a backstage table: "You okay? I feel like something's off. Let's talk before the toast..."`,
        generation_prompt: `A moody close-up of a piece of cream-colored stationery lying next to a golden microphone in a dark, empty backstage hallway. The letter is written in fine fountain pen script, with soft gold backlighting casting dramatic shadows. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Wardrobe Eavesdropping Log",
        clue_type: 'testimony',
        implication_type: 'direct',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB2.id,
        description: `A page from {{Jeremy}}'s notebook:\n- "{{Rikki}} said they were in wardrobe for 25 minutes. Just them — {{Colt}} and {{Gabby}}."\n- {{Dane}}'s reply: "You're joking."\n- {{Jeremy}}: "I'm not. Might be good to get that on camera."\n- {{Dane}}: "You'll get something."`,
        generation_prompt: `A professional, high-quality close-up photograph of a page from a reporter's notebook. Hurried handwriting in blue ink shows transcription logs with timestamp notes. Out-of-focus background shows studio lights and camera rigs in a dark room. Gritty noir aesthetic, low-key lighting, cinematic shot, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Milo's Leather Journal",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: doaB3.id,
        description: `An entry from {{Milo}}'s private leather journal:\n\n"Tonight felt kind of perfect. I actually think I'm happy — like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening..."`,
        generation_prompt: `A dramatic close-up of a hand-bound leather journal lying open on a dark velvet bedspread. The handwriting is in neat fountain pen script. Warm orange light from a bedside lamp casts long, atmospheric shadows. Gritty noir aesthetic, low-key lighting, cinematic shot, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Shredded Security Log",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB7.id,
        description: `A piece of paper retrieved from the shredder:\n- "Restored file metadata: SEC CAM_4B [Bar Area]"\n- "Time: 5:40–6:05PM"\n- "Status: Permanently Deleted"\n- "Actioned by: {{Jeremy}} (jordan.p@doatv.tv)"\n- {{Jeremy}}'s quote: "It was mostly {{Rikki}} ranting anyway — no good angles. Not worth a storyline."`,
        generation_prompt: `A dramatic close-up photograph of shredded strips of paper lying on a dark desk inside a production booth. The strips show fragments of typed log details and the word "DELETED" highlighted in red ink. Glowing control lights from an out-of-focus editing board cast blue and red light on the paper strips. Gritty noir aesthetic, low-key lighting, cinematic shot, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Sienna & Zayn's Blueprint Map",
        clue_type: 'secret',
        implication_type: 'red_herring',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: doaB1.id,
        description: `A floor plan map of the penthouse with scribbled notes in {{Sienna}}'s handwriting: "I cannot believe she said that. Especially after EVERYTHING I've done. I have an idea — let's give her a taste of her own medicine. We look exactly the same."`,
        generation_prompt: `A close-up photograph of a hand-drawn architectural floor plan map lying next to a small makeup palette. The map has arrows and notes scribbled in red marker, lit by a soft pink and grey glow. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.`
      },

      // Round 3
      {
        mystery_id: mysteryId,
        title: "The Burning Heart Letter",
        clue_type: 'secret',
        implication_type: 'circumstantial',
        round_number: 3,
        is_essential: false,
        linked_plot_beat_id: doaB5.id,
        description: `A letter between {{Gabby}} and an unsaved contact:\n- Only heart-on-fire drawings remain on the envelope.\n- The final note is {{Gabby}}'s, sent at 5:52PM — eight minutes before the toast.\n- No reply.`,
        generation_prompt: `A dramatic close-up of a black wax-sealed envelope lying on a dark metallic surface. The envelope has a row of tiny red hand-drawn burning heart symbols. Deep pink and red ambient light casts a dramatic glow on the scene. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Milo's Torn Scrap of Stationery",
        clue_type: 'secret',
        implication_type: 'direct',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB8.id,
        description: `A torn piece of stationery found in {{Milo}}'s drafts box: "...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well… there's only one way this ends. –R"`,
        generation_prompt: `A moody close-up photograph of a torn piece of stationery paper lying on a dark sheet of satin fabric. The handwriting is elegant in dark ink, casting a cool white light onto the dark folds of satin from a cold window light. Gritty noir aesthetic, dramatic low-key lighting, atmospheric shadows, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Gabby's Cocktail Napkin",
        clue_type: 'physical',
        implication_type: 'red_herring',
        round_number: 3,
        is_essential: false,
        linked_plot_beat_id: doaB6.id,
        description: `A cocktail napkin with {{Gabby}}'s handwriting found near the bar:\n"If this goes wrong tonight — it was always going to. -S"\nThe ink is smudged at the edge.`,
        generation_prompt: `A paper cocktail napkin lying on a dark, wet bar counter next to spilled champagne. On the napkin, short handwritten words are written in blue ballpoint ink, with the signature smudged at the edge. Gritty noir aesthetic, dramatic low-key lighting, highly detailed paper texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Eavesdropped Argument Transcript",
        clue_type: 'testimony',
        implication_type: 'direct',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB6.id,
        description: `A printed dialogue transcript from {{Zayn}}'s files:\n- "You think this is just content?! This is my life."\n- "You said to post it."\n- "They already think you hooked up anyway."\n- *Pause*\n- "I never want to see you again."\n- "You're so dramatic."\n- "You're both on camera."`,
        generation_prompt: `A moody close-up photograph of a typed transcript sheet lying on a glossy tabletop. The page has a highlighted dialogue exchange. Reflective neon lights are visible on the table surface. Gritty noir aesthetic, dramatic low-key lighting, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Love Rejection Note",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB3.id,
        description: `On hotel stationery, crumpled near the champagne table:\n"...But when I told you I loved you, you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends."\nNo signature — but the handwriting matches {{Milo}}'s fan mail.`,
        generation_prompt: `A high-quality, professional close-up photograph of a crumpled piece of cream-colored hotel stationery lying on a polished mahogany floor. Hurried, handwritten script in dark fountain pen ink is partially visible on the creases. Dramatic low-key spotlighting casts deep shadows in the paper folds. Gritty noir aesthetic, highly detailed paper texture, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "Rikki's Urgently Scribbled Bar Note",
        clue_type: 'testimony',
        implication_type: 'circumstantial',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB5.id,
        description: `A message scribbled on hotel stationery: "Something isn't right. {{Milo}} was at the bar alone for two minutes when nobody was looking. Just standing there. Switching something. I thought it was their glass. {{Jeremy}}, call me back."`,
        generation_prompt: `A moody close-up photograph of a piece of stationery paper resting on a fabric vanity stool. The handwriting is scribbled and messy, under low-key purple ambient lighting that casts deep shadows. Gritty noir aesthetic, shallow depth of field, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Glass Switch Polaroid",
        clue_type: 'physical',
        implication_type: 'direct',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB5.id,
        description: `A blurry Polaroid photo timestamped 6:03PM retrieved from a guest's pocket.\n\nIn the background: a figure in orange ({{Milo}}'s colour code) is seen moving two champagne flutes on the serving tray, swapping their positions.`,
        generation_prompt: `A professional close-up photograph of a physical Polaroid snapshot lying on a wooden table. The photo shows a dark penthouse party room with guests in the foreground. In the distant, blurry background, a figure wearing a bright orange jacket is caught in motion near a cocktail tray. Gritty noir aesthetic, dramatic low-key lighting, cinematic shot, sharp focus on the Polaroid border, 8k resolution.`
      },

      // Round 4
      {
        mystery_id: mysteryId,
        title: "Milo's Written Confession",
        clue_type: 'testimony',
        implication_type: 'direct',
        round_number: 4,
        is_essential: true,
        linked_plot_beat_id: doaB8.id,
        description: `A handwritten letter on heavy, blood-red stationery: "I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came… I directed it to go exactly where it needed to. It's wild how things just fall into place. Some people live for the camera. Some people die for it. Either way… I'm part of the story now."`,
        generation_prompt: `A dramatic close-up of a sheet of deep red stationery paper lying open on a dark glass desk. The handwriting is in neat black ink, casting long shadows. Cinematic moody lighting casts deep shadows on the glass table. Gritty noir aesthetic, sharp focus, 8k resolution.`
      },
      {
        mystery_id: mysteryId,
        title: "The Producer's Secret Tape Log",
        clue_type: 'testimony',
        implication_type: 'direct',
        round_number: 4,
        is_essential: true,
        linked_plot_beat_id: doaB7.id,
        description: `A page from {{Rikki}}'s diary:\n\n{{Rikki}}: "I'm serious — {{Dane}} is not okay. They're twitchy, I'm pretty sure they mixed something into the drinks."\n\n{{Jeremy}}: "And you're telling me this like it's a problem?"\n\n{{Rikki}}: "It's a liability. What if they snap?"\n\n{{Jeremy}}: (laughs) "Then we get the footage. You want safe, go film MasterChef."`,
        generation_prompt: `A moody close-up photograph of a spiral notebook resting inside a dark studio desk. The page displays a handwritten conversation script. A blue desk lamp glows in the background, casting light on the desk surface. Gritty noir aesthetic, low-key lighting, shallow depth of field, 8k resolution.`
      }
    ]);
    if (doaClueErr) throw new Error(`DOA clues failed: ${doaClueErr.message}`);

    // 9. Seed Subplot
    console.log(`API Seeder: Inserting subplots...`);
    const { data: doaSubplot, error: doaSubErr } = await supabase.from('subplots').insert({
      mystery_id: mysteryId,
      title: "Sienna & Zayn's Revenge Pact",
      description: "Sienna and Zayn conspired to publicly humiliate Gabby by leaking old footage of her behaving badly — a red herring that makes them look guilty while Milo and Dane carry out the real crime.",
      primary_character_id: nova.id,
      secondary_character_id: zane.id,
      theme: "revenge"
    }).select().single();
    if (doaSubErr || !doaSubplot) throw new Error(`DOA subplot failed: ${doaSubErr?.message}`);

    const { error: doaSubBeatErr } = await supabase.from('subplot_beats').insert([
      { subplot_id: doaSubplot.id, beat_number: 1, description: "Sienna and Zayn discover they look similar enough to be confused for each other on camera. Sienna suggests impersonating Gabby to cause chaos. Zayn agrees — mostly because they're falling for Sienna.", linked_plot_beat_id: doaB1.id },
      { subplot_id: doaSubplot.id, beat_number: 2, description: "Zayn is caught near Gabby's bag. They claim they were grabbing their own phone. Jeremy watches. Says nothing. Files it away.", linked_plot_beat_id: doaB7.id }
    ]);
    if (doaSubBeatErr) throw new Error(`DOA subplot beats failed: ${doaSubBeatErr.message}`);

    console.log(`✅ API Seeder: Successfully re-seeded mystery ID ${mysteryId} with Love On The Rocks characters, clues, and motives!`);

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully re-seeded mystery with the correct "Love On The Rocks" character names, motives, clues, and plot beats!',
      mysteryId
    });

  } catch (error: any) {
    console.error('API Seeder Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Failed to re-seed mystery.' 
    }, { status: 500 });
  }
}
