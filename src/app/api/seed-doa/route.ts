import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { isUserAdmin } from '@/utils/admin-auth';

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
  const supabase = await createClient();
  try {
    
    // 1. Get authenticated admin user session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !(await isUserAdmin(supabase, user))) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Forbidden', 
          message: 'Admin privileges required.' 
        }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
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
        description: "The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of \"Love On The Rocks\", Season 3's most-watched dating show, have reunited for the glitzy wrap party at a five-star hotel penthouse. {{The Star}} walked away with the crown, the following, and the guy. But in this room, everyone has a score to settle. When {{The Star}} collapses mid-champagne-toast, poisoned in front of fifty witnesses and a rolling camera, everyone becomes a suspect. One person planned to kill. Another switched the target. And now the story has a very different ending.",
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

    // 4. Seed Characters (defined solely by their Role Title, no fake placeholder names)
    console.log(`API Seeder: Inserting new characters for mystery ${mysteryId}...`);
    
    const skye = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Star|The Star|Victim",
      gender: "female",
      is_victim: true,
      plot_role: "victim",
      archetype: "victim",
      is_mandatory: true,
      profile_data: {
        color: "Pink",
        bio: "{{The Star}} won Love on the Rocks Season 3. Crowned queen of chaos, she had the most followers, the most airtime, and the most drama. She played the game flawlessly, sweet when the cameras rolled, ruthless when they didn't. Ask anyone in this room and you'll get a different version of {{The Star}}. {{The Star}} walks into the reunion like she's still the main character. She always knew how to keep her enemies close. That's why half the room still calls themselves her friend.",
        outfit_advice: "Elegant and effortless. Think a silky slip dress or bias-cut skirt in luxe neutrals or muted jewel tones, like someone used to being photographed. Add soft waves, dewy makeup, and a killer heel.",
        act_summary: "You won the show and you're still the fan favourite, but you know people want to see you fall. Smile sweetly, keep it composed, but never let them forget who came out on top.",
        act_bullets: ["Be effortlessly poised, like everything rolls off you", "Stay friendly, but always keep control of the room", "Laugh off shade, or casually mention your brand deals instead", "Never raise your voice, just raise your eyebrows"],
        traits: ["Poised", "Strategic", "Charming", "Untouchable"]
      }
    });

    const nova = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Sister|The Sister|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Pink (lighter shade)",
        bio: "{{The Sister}} was never supposed to be on Love on the Rocks, but she showed up to every red carpet and finale taping like she was born for it. Half the fandom didn't realise she wasn't a cast member. She's younger, louder, and tired of living in {{The Star}}'s shadow. She says she's just here to support her sister. But that dress, that flirty laugh, and that weird tension with {{The Fan-Favourite Flameout}}? Feels more like she's here to make a name for herself.",
        outfit_advice: "Slinky, sultry, and just a little too polished for a reunion. Soft clingy fabrics, neutral or warm tones, mini skirts or a maxi with a cutout. Sunglasses (yes, indoors) and a smug little smirk.",
        act_summary: "{{The Sister}} is always performing, for the cameras, for the group, for herself. She's charming until she's not.",
        act_bullets: ["Always has a comeback (even if it makes no sense)", "Drops gossip like it's casual conversation", "Jealousy masked as confidence", "Thinks she's the main character", "Flirts to cause chaos, not connection"],
        traits: ["Loud", "Ambitious", "Jealous", "Unpredictable"]
      }
    });

    const blaze = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Ex|The Ex|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "assistant",
      archetype: "villain",
      is_mandatory: true,
      profile_data: {
        color: "Green",
        bio: "{{The Ex}} was Love on the Rocks' poster person, gorgeous, magnetic, and completely toxic. They and {{The Star}} were the golden couple… until Betrayal Week, when {{The Ex}} kissed another cast member 'for the challenge' and tried to gaslight their way out of it. Now they're back claiming to be chill. They're jittery, distracted, constantly checking their phone. Peace doesn't usually come in crushed-up capsules.",
        presentation_female: {
          bio: "She and {{The Star}} were the golden couple of Season 3 until Betrayal Week. She's back, claiming inner peace, but her hands won't stop shaking.",
          outfit_advice: "Something clean and curated, white or beige button-up, relaxed pants, silver or leather chain, like you're trying to look peaceful but still hot.",
          act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions {{The Star}}.",
          act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
        },
        presentation_male: {
          bio: "He and {{The Star}} were the golden couple of Season 3 until Betrayal Week. He's back, claiming inner peace, but his hands won't stop shaking.",
          outfit_advice: "Something clean and curated, white or beige button-up, relaxed pants, silver or leather chain, like you're trying to look peaceful but still hot.",
          act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions {{The Star}}.",
          act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
        },
        traits: ["Volatile", "Obsessive", "Charming", "Unstable"]
      }
    });

    const cole = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Host|The Host|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Gold",
        bio: "{{The Host}} was the host of Love on the Rocks, smooth, flirty, and always camera-ready. Supposed to stay neutral. Off-camera, they blurred a few lines, but fans forgave them, great TV. Everyone remembers the banter, the cocktail toasts, and that one moment they 'accidentally' kissed a contestant. It got edited out, of course.",
        presentation_female: {
          bio: "She was the host of Love On The Rocks, smooth, flirty, camera-ready. Supposed to stay neutral. Didn't.",
          outfit_advice: "Slick but low-effort. A fitted shirt (one-too-few buttons), nice dark jeans, a statement gold necklace, like you're still trying to look bookable for a panel show.",
          act_summary: "You're not the drama, you just film it. Stay smooth, funny, and never admit to anything.",
          act_bullets: ["Be charming and flirty with everyone", "Speak like you're still mic'd up", "Act above the drama, even if you're behind it"]
        },
        presentation_male: {
          bio: "He was the host of Love On The Rocks, smooth, flirty, camera-ready. Supposed to stay neutral. Didn't.",
          outfit_advice: "Slick but low-effort. A fitted shirt (one-too-few buttons), nice dark jeans, a gold chain, like you're still trying to look bookable for a panel show.",
          act_summary: "You're not the drama, you just film it. Stay smooth, funny, and never admit to anything.",
          act_bullets: ["Be charming and flirty with everyone", "Speak like you're still mic'd up", "Act above the drama, even if you're behind it"]
        },
        traits: ["Smooth", "Strategic", "Flirtatious", "Evasive"]
      }
    });

    const rex = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Superfan|The Superfan|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "killer",
      archetype: "villain",
      is_mandatory: true,
      profile_data: {
        color: "Orange",
        bio: "{{The Superfan}} wasn't part of the original cast, they were a fan-voted wildcard for the reunion special. Their TikTok edits, Reddit theories, and obsessive posts made them a cult favourite. Charming in a 'knows too much' kind of way. Obsessed with the show, and maybe a little more obsessed with {{The Star}}. They say they're just here to experience it all… but they've been watching for years. Every move. Every scandal. Every deleted scene.",
        presentation_female: {
          bio: "She campaigned to join the reunion like her life depended on it. Because, in a way, it did. She's obsessed with {{The Star}}, and convinced this is her big moment.",
          outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers, like she spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
          act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
          act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention {{The Star}} in casual conversation… constantly"]
        },
        presentation_male: {
          bio: "He campaigned to join the reunion like his life depended on it. Because, in a way, it did. He's obsessed with {{The Star}}, and convinced this is his big moment.",
          outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers, like he spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
          act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
          act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention {{The Star}} in casual conversation… constantly"]
        },
        traits: ["Obsessive", "Intense", "Calculating", "Devoted"]
      }
    });

    const jordan = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Producer Plant|The Producer Plant|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "investigator",
      is_mandatory: true,
      profile_data: {
        color: "Blue",
        bio: "{{The Producer Plant}} wasn't just a contestant, they were a twist. A 'regular person' fan-favourite who came in mid-season and shook things up. But what the cast didn't know? {{The Producer Plant}} was planted by production to stir drama. Every whisper, every fight, every 'accidental' reveal - {{The Producer Plant}} was the match. Off contract now, but still taking notes. Still pushing buttons. Why does {{The Producer Plant}} still know everything that happens off-camera?",
        presentation_female: {
          bio: "She was planted by production as a contestant. She knows everything that happens off-camera - and deleted the security footage that would have saved {{The Star}}.",
          outfit_advice: "Creative but harmless, tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
          act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
          act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
        },
        presentation_male: {
          bio: "He was planted by production as a contestant. He knows everything that happens off-camera - and deleted the security footage that would have saved {{The Star}}.",
          outfit_advice: "Creative but harmless, tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
          act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
          act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
        },
        traits: ["Calculating", "Charming", "Secretive", "Manipulative"]
      }
    });

    const brooke = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Runner-Up|The Runner-Up|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "hero",
      is_mandatory: true,
      profile_data: {
        color: "Yellow",
        bio: "{{The Runner-Up}} made it to the final two, and then watched {{The Star}} get the crown and the guy. It was close. Too close. For weeks the hashtags trended her way: #WrongGirlWon. She and {{The Star}} were tight. Until they weren't. {{The Runner-Up}} swears nothing happened, that {{The Star}} just stopped texting. Still, she showed up to this reunion polished, prepared, and one glass of wine away from a breakdown.",
        outfit_advice: "High-glam and high-stakes. Sequins, metallics, or anything body-hugging and eye-catching - the outfit that says 'I'm fine' while setting the room on fire. Heels, glossy lips, too much bronzer.",
        act_summary: "You're here to be civil, mature, and definitely not bitter. But the second someone brings up {{The Star}}, your smile gets tight and your voice gets just a little too loud.",
        act_bullets: ["Overcompensate with confidence and sass", "Throw 'no shade' shade constantly", "Pretend not to care, while watching everything {{The Star}} does", "Look for opportunities to steal back the spotlight"],
        traits: ["Bitter", "Polished", "Competitive", "Wounded"]
      }
    });

    const zane = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Fan-Favourite Flameout|The Fan-Favourite Flameout|Suspect",
      gender: "adaptable",
      is_victim: false,
      plot_role: "innocent",
      archetype: "sidekick",
      is_mandatory: true,
      profile_data: {
        color: "Black",
        bio: "{{The Fan-Favourite Flameout}} came into Love on the Rocks bold, loud, and instantly iconic. They flirted with everyone, stirred the pot on purpose, and gave the kind of messy interviews that live forever online. They didn't win, but they won the internet. At least until the final cut. Most of {{The Fan-Favourite Flameout}}'s scenes were edited out of the reunion special. Now {{The Fan-Favourite Flameout}} is holding onto that rage, cryptic posts, bitter captions. Tonight: fresh spray tan, vengeance arc, nothing left to lose.",
        presentation_female: {
          bio: "She flirted with everyone, gave messy interviews, and won the internet, until production edited her out of the reunion. She's back. She's bitter. She's got nothing to lose.",
          outfit_advice: "All black, all attitude. Fitted tops, wide-leg pants, leather or layered textures. Chunky rings, a crossbody strap, boots you can storm out in.",
          act_summary: "You're flirty, shady, and deeply unserious… until someone brings up the edit. Then the façade slips.",
          act_bullets: ["Flirt with everyone, especially people you shouldn't", "Drop snarky one-liners and play innocent", "Refer to 'the edit' constantly"]
        },
        presentation_male: {
          bio: "He flirted with everyone, gave messy interviews, and won the internet, until production edited him out of the reunion. He's back. He's bitter. He's got nothing to lose.",
          outfit_advice: "All black, all attitude. Fitted tops, wide-leg pants, leather or layered textures. Chunky rings, a crossbody strap, boots you can storm out in.",
          act_summary: "You're flirty, shady, and deeply unserious… until someone brings up the edit. Then the façade slips.",
          act_bullets: ["Flirt with everyone, especially people you shouldn't", "Drop snarky one-liners and play innocent", "Refer to 'the edit' constantly"]
        },
        traits: ["Chaotic", "Magnetic", "Vengeful", "Theatrical"]
      }
    });

    const mara = await insertCharacter(supabase, {
      mystery_id: mysteryId,
      name: "The Hair & Makeup Artist|The Hair & Makeup Artist|Suspect",
      gender: "female",
      is_victim: false,
      plot_role: "innocent",
      archetype: "witness",
      is_mandatory: true,
      profile_data: {
        color: "Purple",
        bio: "{{The Hair & Makeup Artist}} was the glam guru behind the scenes, head of hair and makeup for Love On The Rocks. She and {{The Star}} got close during filming, late-night-spill-your-guts close. But after the finale, {{The Star}} stopped replying. No call. No thank you. Just silence. Now {{The Hair & Makeup Artist}} has been dragged into the reunion, touch-up kit in tow. She says she's just here to powder noses and sip champagne… but someone's been feeding behind-the-scenes tea to a certain someone.",
        outfit_advice: "Vibrant, artsy, and emotionally layered. Bold patterns, rainbow knits, playful textures, or anything vintage-inspired. Dopamine dressing with zero subtlety, you make colour look dangerous.",
        act_summary: "You know too much and you're not above letting it slip. Sarcastic, cutting, always one step ahead, but you pretend you're just here for the vibes.",
        act_bullets: ["Make everything sound like a joke… until it's not", "Give compliments that feel like insults", "Watch everything, say nothing (until it matters)", "Be casually petty, especially toward {{The Star}}", "If accused of drama: 'I don't start it, I just retouch it'"],
        traits: ["Perceptive", "Petty", "Artistic", "Emotionally Guarded"]
      }
    });

    // 5. Seed Motives
    console.log(`API Seeder: Inserting motives...`);
    const { error: doaMotErr } = await supabase.from('motives').insert([
      { mystery_id: mysteryId, character_id: nova.id, motive_type: 'power', strength: 'moderate', linked_character_id: skye.id, notes: "Tired of being {{The Star}}'s shadow. Wants the spotlight, but murder wasn't on her mood board." },
      { mystery_id: mysteryId, character_id: blaze.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Prepared the poison for {{The Host}}, not {{The Star}}, but jealousy and drug use made them a puppet in {{The Superfan}}'s hands." },
      { mystery_id: mysteryId, character_id: cole.id, motive_type: 'fear', strength: 'low', linked_character_id: skye.id, notes: "Knew {{The Ex}} was unstable; said nothing because it made for good TV." },
      { mystery_id: mysteryId, character_id: rex.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Rejected by {{The Star}} for the last time, {{The Superfan}} switched the glasses, a twisted act of 'being part of her story forever'." },
      { mystery_id: mysteryId, character_id: jordan.id, motive_type: 'greed', strength: 'high', linked_character_id: skye.id, notes: "Deleted the security footage. Knew something was wrong and let it happen for the content." },
      { mystery_id: mysteryId, character_id: brooke.id, motive_type: 'revenge', strength: 'high', linked_character_id: skye.id, notes: "Never forgave {{The Star}} for stealing the win and going silent. Had motive, opportunity, and a very convenient alibi." },
      { mystery_id: mysteryId, character_id: zane.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Had most of their footage cut from the reunion special. Came with a vengeance arc but no actual plan." },
      { mystery_id: mysteryId, character_id: mara.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Ghosted by {{The Star}} post-show after a deep friendship. Sent the warning, but too late." }
    ]);
    if (doaMotErr) throw new Error(`DOA motives failed: ${doaMotErr.message}`);

    // 6. Seed Relationships
    console.log(`API Seeder: Inserting relationships...`);
    const doaRawRels = [
      { char1: skye, char2: nova, dynamics: ['family'], notes: "Sisters - but {{The Sister}} lives entirely in {{The Star}}'s shadow and resents every second of it." },
      { char1: skye, char2: blaze, dynamics: ['romantic', 'rivals'], notes: "The ex. They were the golden couple until {{The Ex}} kissed someone else 'for the challenge'." },
      { char1: skye, char2: cole, dynamics: ['romantic', 'co-workers'], notes: "Secretly hooking up since the show ended. The catalyst for {{The Ex}}'s breakdown." },
      { char1: skye, char2: rex, dynamics: ['co-workers'], notes: "{{The Superfan}} is obsessively devoted to {{The Star}}; {{The Star}} laughed off {{The Superfan}}'s love confession an hour before dying." },
      { char1: skye, char2: jordan, dynamics: ['co-workers'], notes: "{{The Producer Plant}} planted as a producer to stir drama around {{The Star}}; knows all her secrets." },
      { char1: skye, char2: brooke, dynamics: ['rivals', 'besties'], notes: "Were close allies on the show, until {{The Star}} won and stopped texting back." },
      { char1: skye, char2: zane, dynamics: ['co-workers'], notes: "{{The Star}}'s edit overshadowed {{The Fan-Favourite Flameout}}'s best footage; {{The Fan-Favourite Flameout}} holds a low-grade grudge." },
      { char1: skye, char2: mara, dynamics: ['friends', 'co-workers'], notes: "{{The Star}} ghosted {{The Hair & Makeup Artist}} post-show despite a close friendship during filming." },
      { char1: blaze, char2: rex, dynamics: ['rivals'], notes: "Both obsessed with {{The Star}} but for very different reasons. {{The Superfan}} knows {{The Ex}}'s plan." },
      { char1: blaze, char2: cole, dynamics: ['rivals'], notes: "{{The Ex}} discovered {{The Host}} and {{The Star}}'s secret hookups, the trigger for the whole plot." },
      { char1: jordan, char2: mara, dynamics: ['co-workers'], notes: "{{The Hair & Makeup Artist}} tried to alert {{The Producer Plant}} about {{The Ex}}'s behaviour; {{The Producer Plant}} used it as entertainment." },
      { char1: brooke, char2: nova, dynamics: ['besties'], notes: "Bonded over being sidelined by {{The Star}}. {{The Sister}} promised to 'handle it'." },
      { char1: zane, char2: nova, dynamics: ['romantic', 'co-workers'], notes: "Flirtatious and chaotic; {{The Sister}} suggested they 'give {{The Star}} a taste of her own medicine'." },
      { char1: cole, char2: jordan, dynamics: ['co-workers', 'friends'], notes: "{{The Producer Plant}} tipped {{The Host}} off about {{The Ex}}'s behaviour, mainly for the footage." },
      { char1: rex, char2: mara, dynamics: ['co-workers'], notes: "{{The Hair & Makeup Artist}} noticed {{The Superfan}} at the bar right before the toast and sent a warning to {{The Producer Plant}}." },
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
    const doaB1 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 1, sort_order: 1, event_title: "{{The Ex}} Learns About The {{The Host}} Affair", description: "{{The Ex}} discovers {{The Star}} has been secretly hooking up with {{The Host}} off-camera. Leaked video clips, group chat explosions, and producer {{The Producer Plant}}'s backstage instigation confirm the betrayal and trigger {{The Ex}}'s motive to poison {{The Host}}.", characters_involved: [blaze.id, skye.id, cole.id, jordan.id, zane.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
    const doaB2 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 2, sort_order: 2, event_title: "{{The Ex}} Spirals & Researches Poison", description: "Consumed by jealousy, {{The Ex}} writes a bitter unsent note vowing not to stay quiet and searches online for sedatives, sleeping pills mixed with alcohol, and how to spike a drink without taste.", characters_involved: [blaze.id, skye.id, cole.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
    const doaB3 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 3, sort_order: 3, event_title: "{{The Superfan}} Tracks {{The Ex}}'s Poison Plot", description: "Through his stalking to-do list, iCloud hacking, and Eye Spy spyware on Device 269, {{The Superfan}} intercepts {{The Ex}}'s search history and realizes {{The Ex}} plans to poison {{The Host}}'s drink.", characters_involved: [rex.id, blaze.id], is_required: true, beat_type: 'twist', timeline_phase: 'pre_crime' });
    const doaB4 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 4, sort_order: 4, event_title: "{{The Superfan}}'s Rejected Confession to {{The Star}}", description: "Deluded into believing {{The Star}} shares his feelings, {{The Superfan}} confesses his love to her one final time. {{The Star}} laughs it off and rejects him. Humiliated and feeling invisible, {{The Superfan}} writes that there is 'only one way this ends'.", characters_involved: [rex.id, skye.id], is_required: true, beat_type: 'twist', timeline_phase: 'pre_crime' });
    const doaB5 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 5, sort_order: 5, event_title: "{{The Ex}} Poisons The Drink With Temazepam", description: "High on cocaine in glam and spiralling, {{The Ex}} uses his prescribed Temazepam sleep medication, fatal when mixed with alcohol, to spike a champagne glass intended for {{The Host}}. {{The Hair & Makeup Artist}} warns {{The Producer Plant}}, who ignores it for content.", characters_involved: [blaze.id, cole.id, mara.id, jordan.id], is_required: true, beat_type: 'clue_reveal', timeline_phase: 'crime' });
    const doaB6 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 6, sort_order: 6, event_title: "{{The Superfan}} Switches The Poisoned Glass", description: "At 5:38 PM backstage, a hooded {{The Superfan}} reaches across the drinks table and switches the spiked champagne glass so that {{The Star}}, not {{The Host}}, will drink the fatal dose.", characters_involved: [rex.id, skye.id, cole.id], is_required: true, beat_type: 'twist', timeline_phase: 'crime' });
    const doaB7 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 7, sort_order: 7, event_title: "{{The Star}} Collapses Mid-Toast", description: "During the reunion toast, {{The Star}} drinks from the switched champagne glass and collapses. Chaos erupts as the cast realizes the drink was poisoned.", characters_involved: [skye.id, blaze.id, rex.id, mara.id, cole.id], is_required: true, beat_type: 'discovery', timeline_phase: 'investigation' });
    const doaB8 = await doaInsertBeat({ mystery_id: mysteryId, beat_number: 8, sort_order: 8, event_title: "{{The Superfan}}'s Manifesto & Killer Confession", description: "Having drafted a viral social post ('Everything changes after tonight. They'll remember me'), {{The Superfan}} records a chilling voice confession admitting he watched {{The Ex}}'s plan and redirected the poisoned glass to become part of {{The Star}}'s story forever.", characters_involved: [rex.id], is_required: true, beat_type: 'twist', timeline_phase: 'resolution' });

    // 8. Seed Clues
    console.log(`API Seeder: Inserting clues...`);
    const { error: doaClueErr } = await supabase.from('clues').insert([
      // Round 1 (8 Clues)
      {
        mystery_id: mysteryId,
        title: "Anonymous Text Thread",
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R1-C1] Red Herring / Drama Noise - Shows {{The Fan-Favourite Flameout}}/{{The Sister}} tension regarding an unaired blackmail tape, but has zero connection to the poison plot.',
        description: `Sender: Unless you've got something juicier to give me, I'm dropping the tape.\n{{The Star}}: Post it. Why would I care. {{The Sister}} wants the attention anyway. God shes desperate.\nSender: Little Heartless {{The Star_Initial}}. The video leaves nothing to the imagination... {{The Sister_Initial}} would be fully exposed\n{{The Star}}: As i said before, IDGAF. {{The Sister}} needs character building anyway.\n[Sent 12:14PM]\nSender: Ik im an assh*le for filming but thought you should know what your sister said...`,
        generation_prompt: `A close-up shot of hands holding a dark cocktail glass against a glamorous, dimly lit party lounge background. (No text on screen).`
      },
      {
        mystery_id: mysteryId,
        title: "Direct Messages",
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R1-C2] Red Herring / Distraction - Designed to point suspicion toward {{The Runner-Up}}, though {{The Runner-Up}} did not plan or commit the poisoning.',
        description: `Sender: You don't deserve the win. Everyone sees what you really are. It's time someone did something about it. 🔥\n[Sent 12:14PM]`,
        generation_prompt: `Two glamorous figures seen in soft focus across a crowded VIP party, tension in the room. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "EYE SPY SOFTWARE - Device: 269",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB3.id,
        internal_notes: '[FORMAT:search_log] [CODE:R1-C3] REAL / CANON (Beat 2 & 3) - Documents searches on sedatives, poisoning, and getting away with murder. {{The Ex}} conducted these searches; {{The Superfan}} discovered them via spyware.',
        description: `EYE SPY SOFTWARE - Accessing Device: 269\nRecent Tabs / Search History:\n• Do sedatives show up in blood test\n• Alcohol + sleeping pills dangerous?\n• How to spike a drink without taste\n• How to Poison Someone\n• How to Get away with murder\n• {{The Star}} - Love On The Rocks\n• {{The Star}} + {{The Ex}} cute edits\n• Love On The Rocks`,
        generation_prompt: `A sleek laptop or tablet sitting on a modern dark desk with subtle blue backlighting, dimly lit room. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Direct Messages",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB1.id,
        internal_notes: '[FORMAT:chat] [CODE:R1-C4] REAL / CANON (Beat 1) - {{The Ex}} learns about {{The Host}} and {{The Star}}\'s post-show affair, which triggers {{The Ex_his}} motive to poison {{The Host}}.',
        description: `Sender: Ik we aren't speaking but did you see what I said in the GC\n{{The Ex}}: yeah. wtf. how do you know?\nSender: {{The Host}} and I were together at the same time. I'm more pissed than you.\n{{The Ex}}: I can assure you, you're not.`,
        generation_prompt: `A tense silhouette of a man in a doorway checking his watch in an upscale venue. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Direct Messages",
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R1-C5] Red Herring / Drama Noise - General romantic fallout between cast members; not tied to the murder mechanism.',
        description: `Sender: So that's it? Nothing even happened, right?\n[Status: SEEN]`,
        generation_prompt: `A moody shot of a half-empty champagne glass left abandoned on a marble ledge. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "{{The Runner-Up}} & {{The Hair & Makeup Artist}}",
        clue_type: 'testimony',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 1,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R1-C6] Red Herring / Drama Noise - Shows {{The Runner-Up}} dropping gossip to stir up trouble before the reunion, but neither {{The Runner-Up}} nor {{The Hair & Makeup Artist}} poisoned anyone.',
        description: `{{The Runner-Up}}: Should I just tell {{The Ex_him}}? Wait, maybe you should...lol\n{{The Runner-Up}}: Either way, i feel like {{The Ex_he}} deserves to know\n{{The Hair & Makeup Artist}}: Babe, {{The Ex_hes}} gonna find out at some point... You should be the one... you know {{The Star_Initial}} would hate it. {{The Runner-Up}}, take one for the team...\n{{The Runner-Up}}: Ok, i'll message now. But ONLY bc {{The Ex}} deserves to know... no other reasons...\n{{The Hair & Makeup Artist}}: HOLY... IN THE GC!? YOU. ARE. BRAVE\n[Status: SEEN]`,
        generation_prompt: `Makeup brushes, an open vanity mirror, and cosmetic powders scattered on a backstage dressing table. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "LOTR GC",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB1.id,
        internal_notes: '[FORMAT:chat] [CODE:R1-C7] REAL / CANON (Beat 1) - Publicly outs the affair in the cast group chat, confirming {{The Host}}\'s involvement and escalating {{The Ex}}\'s fury.',
        description: `{{The Runner-Up}}: Wow... You couldn't keep your legs closed, could u {{The Star_Initial}}\n{{The Star}}: Honestly... its none of your business {{The Runner-Up}}. Stop it.\nCast Member: Oh F*** off {{The Runner-Up}}. Why are we talking about this in the main GC.\nCast Member: Actually, why are we talking about this at all.\n{{The Host}}: Yikes, Drama... Save it for the Reunion tmr.`,
        generation_prompt: `A bustling party room viewed from a distance, glamorous guests laughing and holding drinks. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "IMG_4875.mov (0:13)",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 1,
        is_essential: true,
        linked_plot_beat_id: doaB1.id,
        static_image_url: '/clues/doa/cctv-r1-embrace.jpg',
        internal_notes: '[FORMAT:cctv] [CODE:R1-C8] REAL / Supporting Evidence (Beat 1) - Proves {{The Host}} and {{The Star}} were physically intimate off-camera, confirming the rumor that set {{The Ex}} off.',
        description: `File: IMG_4875.mov (0:13)\nSource: Recorded on {{The Fan-Favourite Flameout}}'s iPhone\nVisual: Video still capturing {{The Host}} and {{The Star}} together behind closed doors.`,
        generation_prompt: `A close, shadowy, intimate silhouette of a man and woman embracing in a private room.`
      },

      // Round 2 (10 Clues)
      {
        mystery_id: mysteryId,
        title: "CONFIDENTIAL - Love On The Rocks",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB5.id,
        internal_notes: '[FORMAT:call_sheet] [CODE:R2-C1] REAL / CANON (Beat 3 & 5) - Confirms {{The Ex}} used cocaine in glam, was twitchy and muttering threats about {{The Host}}, and notes {{The Superfan}} hovering suspiciously.',
        description: `CONFIDENTIAL - Love On The Rocks\n• Try Get {{The Star_Initial}} to talk to [REDACTED ████████]\n• {{The Runner-Up_Initial}} spiralling. re: {{The Star_Initial}} & {{The Host_Initial}}\n• {{The Host_Initial}} and {{The Star_Initial}} were in closet for AGES\n• {{The Superfan_Initial}} still hovering. Watch {{The Superfan_him}}, seems unstable\nYou know what to do...\n-----------------------------------------------\nHandwritten Note at Bottom:\n"FYI - There was coke all over the corner of my makeup mirror. Pretty sure {{The Ex_Initial}} used it while I stepped out. {{The Ex_Hes}} twitchy AF and muttering stuff about {{The Host_Initial}}. Handle it if you need to. Just don't put it on me.\n- {{The Hair & Makeup Artist_Initial}}"`,
        generation_prompt: `A wooden clipboard resting on a production sound case backstage next to coiled cables. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Prescription: Temazepam",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB5.id,
        internal_notes: '[FORMAT:medical_rx] [CODE:R2-C2] REAL / CANON (Beat 5 - Murder Weapon) - The exact sedative prescription used in the poisoning, with a medical warning that it is fatal when mixed with alcohol.',
        description: `Medication: Temazepam (For sleep disturbance)\nPrescribed to: {{The Ex}}\nIssue date: 3 weeks ago\nRef: 10-3-204\nWARNING: May cause drowsiness. Fatal when mixed with alcohol.`,
        generation_prompt: `A metallic tray or dark nightstand with scattered empty prescription blister foil next to a glass of water. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Real Ones - LOTR",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB6.id,
        internal_notes: '[FORMAT:chat] [CODE:R2-C3] REAL / CANON (Beat 5 & 6) - Eye-witness testimony that {{The Ex}} was pacing, staring intently at the champagne bottles, and acting erratic before the glass switch.',
        description: `Sender 1: {{The Ex}}'s in glam pacing like {{The Ex_hes}} about to propose or explode 😭\nSender 2: {{The Ex_He}} deadass asked ME if {{The Star}} still talks about {{The Ex_him}} 💀\nSender 2: I saw {{The Ex_him}} staring at the champagne bottles lol\nSender 1: I'm not tryna get roofied tonight someone talk to {{The Ex_him}}...\nSender 3: Is {{The Ex_he}} still on {{The Ex_his}} meds...?\nSender 4: 🧐📱🤓`,
        generation_prompt: `Dim backstage green room with leather sofas and illuminated mirror bulbs in background. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Crumpled Personal Note",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB2.id,
        internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C4] REAL / CANON (Beat 2) - {{The Ex}}\'s direct confession of intent to take action because {{The Ex_he}} cannot bear seeing {{The Host}} with {{The Star}}.',
        description: `"If I have to watch {{The Host_him}} stand next to her again I'll lose it.\n{{The Host_He}} thinks I won't do anything because the cameras are on.\nBut I will. I'm done being quiet."`,
        generation_prompt: `A crumpled paper page resting next to an empty glass on a wooden coffee table. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Notes - To Do Checklist",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB3.id,
        internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C5] REAL / CANON (Beat 3) - {{The Superfan}}\'s stalking checklist proving {{The Superfan_he}} accessed devices and uncovered {{The Ex}}\'s poison plot.',
        description: `Date: Today at 4:15 PM\nTo do:\n• Check {{The Ex_his}} iCloud (same recovery answers as last time? Try 08/11?) [strikethrough]\n• stalk insta DMs [strikethrough]\n• Go Through Camera Roll\n• Go through Safari history. [strikethrough]`,
        generation_prompt: `A dark workstation with notebooks, smartphone, and glasses resting beside a desk lamp. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Direct Message",
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R2-C6] Red Herring / Distraction - Cast gossip attempt before the toast; not part of the poison exchange.',
        description: `Sender: You okay? I feel like something's off. Let's talk before the toast...\n[Sent 5:20PM • Status: SEEN]`,
        generation_prompt: `An elegant velvet armchair in a quiet hotel corridor outside the party. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "New Recording 84 (5:12 PM)",
        clue_type: 'testimony',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB2.id,
        internal_notes: '[FORMAT:audio] [CODE:R2-C7] REAL / CANON (Beat 1 & 2) - {{The Producer Plant}} instigates {{The Ex}} about {{The Host}} and {{The Star}} being together in wardrobe for 25 minutes.',
        description: `Recording Duration: 25.04 Seconds\n{{The Producer Plant}}: "{{The Hair & Makeup Artist}} said they were in wardrobe for, like, 25 minutes. Just them. {{The Host}} and {{The Star}}."\n{{The Ex}}: "You're joking."\n{{The Producer Plant}}: "I'm not. {{The Runner-Up}}'s about to combust... Might be good to get that on camera..."\n{{The Ex}}: "You'll get something."\n[Recording cuts]`,
        generation_prompt: `A microphone pack and sound mixer console lit by subtle LED displays backstage. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Journal Entry",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 2,
        is_essential: true,
        linked_plot_beat_id: doaB4.id,
        internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C8] REAL / CANON (Beat 4) - Establishes {{The Superfan}}\'s delusion that {{The Star}} truly had feelings for {{The Superfan_him}} right before {{The Superfan_he}} confessed to her.',
        description: `"Tonight felt kind of perfect. I actually think I'm happy - like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening..."`,
        generation_prompt: `A fountain pen resting over an open journal under warm ambient light. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Shh",
        clue_type: 'secret',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:chat] [CODE:R2-C9] Red Herring / Petty Revenge - {{The Sister}} and {{The Fan-Favourite Flameout}} plan a public stunt or drama swap, but did not spike any drinks.',
        description: `{{The Sister}}: God you are an Ass. But WTF. I can't believe she actually said that...\n{{The Sister}}: Especially After EVERYTHING i've done for her\n{{The Fan-Favourite Flameout}}: Yeah Yikes.\n{{The Sister}}: I have an idea tho, Lets give her a taste of her own Medicine... we look the exact same\n{{The Fan-Favourite Flameout}}: God I think im in love with you`,
        generation_prompt: `Two figures whispering in an intimate, dimly lit alcove of a luxury venue. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Server Audit Log - SEC CAM_4B",
        clue_type: 'physical',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 2,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:search_log] [CODE:R2-C10] Red Herring / Producer Shenanigans - {{The Producer Plant}} deleting footage of {{The Hair & Makeup Artist}} ranting; emphasizes producer interference rather than murder prep.',
        description: `ERROR: FILE NOT FOUND\nFile: SEC CAM_4B [Green Room]\nTime: 5:40PM - 6:05PM\nStatus: Permanently Deleted\nActioned by: {{The Producer Plant}} (production@lotv.tv)\nReason: "corrupted audio, unusable"\nNote: "I just cut the section. It was mostly {{The Hair & Makeup Artist}} ranting anyway - no good angles. Not worth a storyline. No one needs to hear that."`,
        generation_prompt: `A dark broadcast control room with monitors and server rack lights. (No text).`
      },

      // Round 3 (7 Clues)
      {
        mystery_id: mysteryId,
        title: "Security Cam Still • Backstage",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB6.id,
        static_image_url: '/clues/doa/cctv-r2-hooded-table.jpg',
        internal_notes: '[FORMAT:cctv] [CODE:R3-C1] REAL / CANON (Beat 6) - Shows {{The Superfan}} backstage switching the glasses on the table so {{The Star}} receives the spiked champagne.',
        description: `Header: SECURITY CAM STILL • BACKSTAGE\nTimestamp: 5:38 PM\nVisual: A hooded figure is seen reaching over the table with champagne glasses and wine bottles.`,
        generation_prompt: `Overhead black-and-white surveillance angle of a round draped cocktail table with wine glasses and a wine bottle; a hooded figure with face blurred reaching toward a glass.`
      },
      {
        mystery_id: mysteryId,
        title: "Social Post Draft (6:12 PM)",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB8.id,
        internal_notes: '[FORMAT:social_post] [CODE:R3-C2] REAL / CANON (Beat 8) - {{The Superfan}} preparing {{The Superfan_his}} manifesto to go viral as the unforgettable figure tied to {{The Star}} forever.',
        description: `Post Draft (6:12 PM):\n"Everything changes after tonight.\nThey'll remember me.\nEven if it means they never look at her the same again."\nTags: #exclusive #truthhurts #watchthisspace\nLocation: The Grand Penthouse • VIP Reunion Lounge\nAudio selected: Reelin' In The Years`,
        generation_prompt: `A phone screen silhouette glowing against a dark room interior. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Notes App Entry",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB4.id,
        internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C3] REAL / CANON (Beat 4) - {{The Star}} records that {{The Superfan}} confessed {{The Superfan_his}} love, she rejected {{The Superfan_him}}, and {{The Superfan_he}} took it personally and hovered around her.',
        description: `Date: Today at 5:34 PM\n"They told me they are in love with me. They said it's always been me.\nI told them it's not like that. That it's never been like that.\nI think they took it personally. Now they're just... hovering.\nGod, they're all liars. Something's gonna happen. I have a bad feeling. I just don't think I'm the target?\nWish me luck\n- {{The Star_Initial}}"`,
        generation_prompt: `A luxury metallic clutch bag sitting open on a marble dressing vanity. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "New Recording 85 (Backstage)",
        clue_type: 'testimony',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 3,
        is_essential: false,
        linked_plot_beat_id: null,
        internal_notes: '[FORMAT:audio] [CODE:R3-C4] Red Herring / Content Drama - Cast members fighting over video leaks and reality TV screentime, recorded by production.',
        description: `Recording Duration: 32.25 Seconds\nSpeaker 1: "You think this is just content!? This is my life."\nSpeaker 2: "You said to post it. Don't backpedal now that it's not your **BLEEP** on the line."\nSpeaker 2: "They already think you hooked up with {{The Host_him}} anyway. This just confirms it."\n*Pause*\nSpeaker 1: "I never want to see you again, you're disgusting."\nSpeaker 2: "You're so dramatic."\nSpeaker 3: "You're both on camera."`,
        generation_prompt: `A sound recordist's boom microphone positioned above a backstage partition wall. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Security Cam Still • Backstage",
        clue_type: 'physical',
        implication_type: 'red_herring',
        evidence_status: 'fake',
        round_number: 3,
        is_essential: false,
        linked_plot_beat_id: null,
        static_image_url: '/clues/doa/cctv-r3-confrontation.jpg',
        internal_notes: '[FORMAT:cctv] [CODE:R3-C5] Red Herring / Relationship Fallout - {{The Host}} arguing about off-camera hookups, distracting players into thinking {{The Host}} did the deed.',
        description: `Header: SECURITY CAM STILL • BACKSTAGE\nTimestamp: 5:52 PM\nVisual: Two figures in formal evening wear in an intense face-to-face confrontation beside the drinks table.`,
        generation_prompt: `Grainy surveillance feed of a man in a dark suit gesturing aggressively across a table to a dark-haired woman in a sleeveless dress.`
      },
      {
        mystery_id: mysteryId,
        title: "Torn Unsent Note",
        clue_type: 'physical',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB7.id,
        internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C6] REAL / CANON (Beat 4 & 7) - Direct evidence of {{The Superfan}}\'s motive found backstage after {{The Star}} laughed at {{The Superfan_his}} confession: "Well... there\'s only one way this ends".',
        description: `"...But when I told you I loved you. you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends."`,
        generation_prompt: `A discarded, torn piece of black paper or card on the floor near stage curtains. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "Instagram - @{{The Star}}4ever_edits",
        clue_type: 'secret',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 3,
        is_essential: true,
        linked_plot_beat_id: doaB4.id,
        internal_notes: '[FORMAT:social_post] [CODE:R3-C7] REAL / CANON (Beat 4) - Proves {{The Superfan}}\'s obsessive stalking and fixation on {{The Star}} as {{The Superfan_his}} "#futurewife".',
        description: `Account: @{{The Star}}4ever_edits\nStats: 600 Posts • 65K Followers • 1 Following\nBio: "You only see the show. I see the soul. ❤️✨ #realLoveOnTheRocks"\nPost Grid Captions:\n• "The real winner. Always was. Always will be."\n• "One day she'll know the truth. #futurewife"\n• "You can't fake that look. She saw me."\n• "Fate works fast. Meeting her again."`,
        generation_prompt: `A smartphone propped up on a messy desk showing photo collages in the glow of a ring light. (No text).`
      },

      // Round 4 (2 Clues)
      {
        mystery_id: mysteryId,
        title: "Voice Memo Recording",
        clue_type: 'testimony',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 4,
        is_essential: true,
        linked_plot_beat_id: doaB8.id,
        internal_notes: '[FORMAT:audio] [CODE:R4-C1] REAL / CANON (Beat 6 & 8 - Killer Confession) - {{The Superfan}} confesses on tape to watching {{The Ex}}\'s plan and redirecting the poisoned drink to {{The Star}} so {{The Superfan_he}} could become "part of the story".',
        description: `Recording Duration: 45.21 Seconds\n"I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came... I directed it to go exactly where it needed to. It's wild how things just fall into place.\nSome people live for the camera. Some people die for it. Either way... I'm part of the story now."`,
        generation_prompt: `An audio voice recorder lying next to a pair of wire-rimmed glasses on a dark reflective surface. (No text).`
      },
      {
        mystery_id: mysteryId,
        title: "5:52PM - Recovered Security Cam Audio",
        clue_type: 'testimony',
        implication_type: 'direct',
        evidence_status: 'real',
        round_number: 4,
        is_essential: true,
        linked_plot_beat_id: doaB7.id,
        internal_notes: '[FORMAT:audio] [CODE:R4-C2] REAL / Supporting Evidence (Beat 5 & 7) - Confirms {{The Ex}} was high on cocaine and a loose cannon right before the 6:00 PM toast, while {{The Producer Plant}} refused to intervene for the sake of reality TV drama.',
        description: `Recording Duration: 38.64 Seconds\nHeader: 5:52PM - Recovered Security Cam Audio\n{{The Hair & Makeup Artist}}: "I'm serious - {{The Ex}}'s not okay. {{The Ex_Hes}} twitchy, {{The Ex_hes}} muttering shit, I'm pretty sure {{The Ex_he}} snorted a line off the f***ing mirror."\n{{The Producer Plant}}: "And you're telling me this like it's a problem?"\n{{The Hair & Makeup Artist}}: "Yes, {{The Producer Plant}}. It's a liability. {{The Ex_He}} needs help... What if {{The Ex_he}} snaps?"\n{{The Producer Plant}}: (laughs) "Then we get the footage. You want safe, go film MasterChef."`,
        generation_prompt: `Backstage audio monitors and headset hanging on a stand near the wings of the stage. (No text).`
      }
    ]);
    if (doaClueErr) throw new Error(`DOA clues failed: ${doaClueErr.message}`);

    // 9. Seed Subplot
    console.log(`API Seeder: Inserting subplots...`);
    const { data: doaSubplot, error: doaSubErr } = await supabase.from('subplots').insert({
      mystery_id: mysteryId,
      title: "{{The Sister}} & {{The Fan-Favourite Flameout}}'s Revenge Pact",
      description: "{{The Sister}} and {{The Fan-Favourite Flameout}} conspired to publicly humiliate {{The Star}} by leaking old footage of her behaving badly, a red herring that makes them look guilty while {{The Superfan}} and {{The Ex}} carry out the real crime.",
      primary_character_id: nova.id,
      secondary_character_id: zane.id,
      theme: "revenge"
    }).select().single();
    if (doaSubErr || !doaSubplot) throw new Error(`DOA subplot failed: ${doaSubErr?.message}`);

    const { error: doaSubBeatErr } = await supabase.from('subplot_beats').insert([
      { subplot_id: doaSubplot.id, beat_number: 1, description: "{{The Sister}} and {{The Fan-Favourite Flameout}} discover they look similar enough to be confused for each other on camera. {{The Sister}} suggests impersonating {{The Star}} to cause chaos. {{The Fan-Favourite Flameout}} agrees - mostly because they're falling for {{The Sister}}.", linked_plot_beat_id: doaB1.id },
      { subplot_id: doaSubplot.id, beat_number: 2, description: "{{The Fan-Favourite Flameout}} is caught near {{The Star}}'s bag. They claim they were grabbing their own phone. {{The Producer Plant}} watches. Says nothing. Files it away.", linked_plot_beat_id: doaB7.id }
    ]);
    if (doaSubBeatErr) throw new Error(`DOA subplot beats failed: ${doaSubBeatErr.message}`);

    console.log(`✅ API Seeder: Successfully re-seeded mystery ID ${mysteryId} with Love On The Rocks character role titles, clues, and motives!`);

    return NextResponse.json({ 
      success: true, 
      message: 'Successfully re-seeded mystery with "Love On The Rocks" character role titles, motives, clues, and plot beats!',
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
