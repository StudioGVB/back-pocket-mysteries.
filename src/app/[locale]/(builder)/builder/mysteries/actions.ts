'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import crypto from 'crypto';
import { getCharactersByMysteryId, getMysteryById, getPlotBeatsByMysteryId } from '@/services/mysteries';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { logAiUsage } from '@/utils/ai-logger';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';

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

export async function createMysteryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;
  const isAdmin = formData.get('isAdmin') === 'true';
  const locale = (formData.get('locale') as string) || 'en';
  const rawMaxPlayers = parseInt((formData.get('max_players') as string) || '6', 10);
  const pkgInfo = getPackageInfoForMaxPlayers(rawMaxPlayers);
  const targetCharCount = pkgInfo.requiredCharacters;

  // 1. Insert the initial draft mystery base with the selected package tier's player cap
  const { data: mystery, error } = await supabase
    .from('mysteries')
    .insert({
      title,
      theme,
      created_by: user.id,
      status: 'draft',
      min_players: 4,
      max_players: targetCharCount,
      complexity: 'medium',
      spice_level: 'mild'
    })
    .select()
    .single();

  if (error || !mystery) {
    console.error('Error creating mystery:', error);
    throw new Error(error?.message || 'Failed to create mystery base');
  }

  // 2. Perform automatic seeding / generation pipeline
  const titleLower = title.toLowerCase();
  const themeLower = theme.toLowerCase();
  const isCircus = titleLower.includes('circus') || titleLower.includes('ringmaster') || themeLower.includes('circus') || themeLower.includes('carnival');
  const isDOA = titleLower.includes('love on the rocks') || titleLower.includes('lotr') || titleLower.includes('dead on arrival') || titleLower.includes('doa') || themeLower.includes('reality tv') || themeLower.includes('reality show') || themeLower.includes('dead on arrival') || themeLower.includes('doa');


  // Update player count for 9-character DOA mystery
  if (isDOA) {
    await supabase.from('mysteries').update({ min_players: 9, max_players: 9 }).eq('id', mystery.id);
  }

  // NOTE: No try/catch here, errors must surface so we can debug them
  if (true) {  // scope block
    if (isDOA) {
      console.log('Seeding Love On The Rocks mystery for ID:', mystery.id);

      await supabase.from('mysteries').update({
        title: "Love On The Rocks",
        theme: "Reality TV Reunion",
        description: "The cameras stopped rolling six months ago, but the drama never did. Tonight, the cast of \"Love On The Rocks\", Season 3's most-watched dating show, have reunited for the glitzy wrap party at a five-star hotel penthouse. Gabby walked away with the crown, the following, and the guy. But in this room, everyone has a score to settle. When Gabby collapses mid-champagne-toast, poisoned in front of fifty witnesses and a rolling camera, everyone becomes a suspect. One person planned to kill. Another switched the target. And now the story has a very different ending.",
        inside_jokes: "Remember: the cameras are always on. Even when they shouldn't be."
      }).eq('id', mystery.id);

      // ── CHARACTERS ─────────────────────────────────────────────────────────
      const skye = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Gabby|The Star|Victim",
        gender: "female",
        is_victim: true,
        plot_role: "victim",
        archetype: "victim",
        is_mandatory: true,
        profile_data: {
          color: "Pink",
          bio: "Gabby won Love on the Rocks Season 3. Crowned queen of chaos, she had the most followers, the most airtime, and the most drama. She played the game flawlessly, sweet when the cameras rolled, ruthless when they didn't. Ask anyone in this room and you'll get a different version of Gabby. Gabby walks into the reunion like she's still the main character. She always knew how to keep her enemies close. That's why half the room still calls themselves her friend.",
          outfit_advice: "Elegant and effortless. Think a silky slip dress or bias-cut skirt in luxe neutrals or muted jewel tones, like someone used to being photographed. Add soft waves, dewy makeup, and a killer heel.",
          act_summary: "You won the show and you're still the fan favourite, but you know people want to see you fall. Smile sweetly, keep it composed, but never let them forget who came out on top.",
          act_bullets: ["Be effortlessly poised, like everything rolls off you", "Stay friendly, but always keep control of the room", "Laugh off shade, or casually mention your brand deals instead", "Never raise your voice, just raise your eyebrows"],
          traits: ["Poised", "Strategic", "Charming", "Untouchable"]
        }
      });

      const nova = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Sienna|The Sister|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          color: "Pink (lighter shade)",
          bio: "Sienna was never supposed to be on Love on the Rocks, but she showed up to every red carpet and finale taping like she was born for it. Half the fandom didn't realise she wasn't a cast member. She's younger, louder, and tired of living in Gabby's shadow. She says she's just here to support her sister. But that dress, that flirty laugh, and that weird tension with Zayn? Feels more like she's here to make a name for herself.",
          outfit_advice: "Slinky, sultry, and just a little too polished for a reunion. Soft clingy fabrics, neutral or warm tones, mini skirts or a maxi with a cutout. Sunglasses (yes, indoors) and a smug little smirk.",
          act_summary: "Sienna is always performing, for the cameras, for the group, for herself. She's charming until she's not.",
          act_bullets: ["Always has a comeback (even if it makes no sense)", "Drops gossip like it's casual conversation", "Jealousy masked as confidence", "Thinks she's the main character", "Flirts to cause chaos, not connection"],
          traits: ["Loud", "Ambitious", "Jealous", "Unpredictable"]
        }
      });

      const blaze = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Dane|The Ex|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "assistant",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          color: "Green",
          bio: "Dane was Love on the Rocks' poster person, gorgeous, magnetic, and completely toxic. They and Gabby were the golden couple… until Betrayal Week, when Dane kissed another cast member 'for the challenge' and tried to gaslight their way out of it. Now they're back claiming to be chill. They're jittery, distracted, constantly checking their phone. Peace doesn't usually come in crushed-up capsules.",
          presentation_female: {
            bio: "She and Gabby were the golden couple of Season 3 until Betrayal Week. She's back, claiming inner peace, but her hands won't stop shaking.",
            outfit_advice: "Something clean and curated, white or beige button-up, relaxed pants, silver or leather chain, like you're trying to look peaceful but still hot.",
            act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions Gabby.",
            act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
          },
          presentation_male: {
            bio: "He and Gabby were the golden couple of Season 3 until Betrayal Week. He's back, claiming inner peace, but his hands won't stop shaking.",
            outfit_advice: "Something clean and curated, white or beige button-up, relaxed pants, silver or leather chain, like you're trying to look peaceful but still hot.",
            act_summary: "Speak in therapy buzzwords. Act like everything's chill… until someone mentions Gabby.",
            act_bullets: ["Pretend to be zen even when you're clearly not", "Use phrases like 'I'm holding space'", "Get passive-aggressive if people don't agree with you"]
          },
          traits: ["Volatile", "Obsessive", "Charming", "Unstable"]
        }
      });

      const cole = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Colt|The Host|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          color: "Gold",
          bio: "Colt was the host of Love on the Rocks, smooth, flirty, and always camera-ready. Supposed to stay neutral. Off-camera, they blurred a few lines, but fans forgave them, great TV. Everyone remembers the banter, the cocktail toasts, and that one moment they 'accidentally' kissed a contestant. It got edited out, of course.",
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
        mystery_id: mystery.id,
        name: "Milo|The Superfan|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "killer",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          color: "Orange",
          bio: "Milo wasn't part of the original cast, they were a fan-voted wildcard for the reunion special. Their TikTok edits, Reddit theories, and obsessive posts made them a cult favourite. Charming in a 'knows too much' kind of way. Obsessed with the show, and maybe a little more obsessed with Gabby. They say they're just here to experience it all… but they've been watching for years. Every move. Every scandal. Every deleted scene.",
          presentation_female: {
            bio: "She campaigned to join the reunion like her life depended on it. Because, in a way, it did. She's obsessed with Gabby, and convinced this is her big moment.",
            outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers, like she spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
            act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
            act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention Gabby in casual conversation… constantly"]
          },
          presentation_male: {
            bio: "He campaigned to join the reunion like his life depended on it. Because, in a way, it did. He's obsessed with Gabby, and convinced this is his big moment.",
            outfit_advice: "Bookish but curated. Tucked-in shirts, jumpers over collars, wide-leg trousers, like he spent hours crafting an 'I'm Smart but Hot' outfit. Round glasses, neat hair.",
            act_summary: "You were chosen by the fans, and you've made that everyone's problem. Get weirdly intense if someone challenges your place here.",
            act_bullets: ["Overshare show trivia like it's normal conversation", "Stare a little too long; smile a little too wide", "Mention Gabby in casual conversation… constantly"]
          },
          traits: ["Obsessive", "Intense", "Calculating", "Devoted"]
        }
      });

      const jordan = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Jeremy|The Producer Plant|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "investigator",
        is_mandatory: true,
        profile_data: {
          color: "Blue",
          bio: "Jeremy wasn't just a contestant, they were a twist. A 'regular person' fan-favourite who came in mid-season and shook things up. But what the cast didn't know? Jeremy was planted by production to stir drama. Every whisper, every fight, every 'accidental' reveal - Jeremy was the match. Off contract now, but still taking notes. Still pushing buttons. Why does Jeremy still know everything that happens off-camera?",
          presentation_female: {
            bio: "She was planted by production as a contestant. She knows everything that happens off-camera - and deleted the security footage that would have saved Gabby.",
            outfit_advice: "Creative but harmless, tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
            act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
            act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
          },
          presentation_male: {
            bio: "He was planted by production as a contestant. He knows everything that happens off-camera - and deleted the security footage that would have saved Gabby.",
            outfit_advice: "Creative but harmless, tucked tee, rolled-sleeve blazer, chinos, and a too-cool notebook. The vibe is 'I'm just here to observe'... but you're controlling the narrative.",
            act_summary: "Act like a casual friend while calculating everything. Never raise your voice, never show your cards.",
            act_bullets: ["Smile like you're in on something", "Drop passive little bombs, then walk away", "If cornered, claim 'that's not really my role anymore'"]
          },
          traits: ["Calculating", "Charming", "Secretive", "Manipulative"]
        }
      });

      const brooke = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Ava|The Runner-Up|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "hero",
        is_mandatory: true,
        profile_data: {
          color: "Yellow",
          bio: "Ava made it to the final two, and then watched Gabby get the crown and the guy. It was close. Too close. For weeks the hashtags trended her way: #JusticeForAva, #WrongGirlWon. She and Gabby were tight. Until they weren't. Ava swears nothing happened, that Gabby just stopped texting. Still, she showed up to this reunion polished, prepared, and one glass of wine away from a breakdown.",
          outfit_advice: "High-glam and high-stakes. Sequins, metallics, or anything body-hugging and eye-catching - the outfit that says 'I'm fine' while setting the room on fire. Heels, glossy lips, too much bronzer.",
          act_summary: "You're here to be civil, mature, and definitely not bitter. But the second someone brings up Gabby, your smile gets tight and your voice gets just a little too loud.",
          act_bullets: ["Overcompensate with confidence and sass", "Throw 'no shade' shade constantly", "Pretend not to care, while watching everything Gabby does", "Look for opportunities to steal back the spotlight"],
          traits: ["Bitter", "Polished", "Competitive", "Wounded"]
        }
      });

      const zane = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Zayn|The Fan-Favourite Flameout|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "sidekick",
        is_mandatory: true,
        profile_data: {
          color: "Black",
          bio: "Zayn came into Love on the Rocks bold, loud, and instantly iconic. They flirted with everyone, stirred the pot on purpose, and gave the kind of messy interviews that live forever online. They didn't win, but they won the internet. At least until the final cut. Most of Zayn's scenes were edited out of the reunion special. Now Zayn's holding onto that rage, cryptic posts, bitter captions. Tonight: fresh spray tan, vengeance arc, nothing left to lose.",
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
        mystery_id: mystery.id,
        name: "Rikki|The Hair & Makeup Artist|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          color: "Purple",
          bio: "Rikki was the glam guru behind the scenes, head of hair and makeup for Love On The Rocks. She and Gabby got close during filming, late-night-spill-your-guts close. But after the finale, Gabby stopped replying. No call. No thank you. Just silence. Now Rikki's been dragged into the reunion, touch-up kit in tow. She says she's just here to powder noses and sip champagne… but someone's been feeding behind-the-scenes tea to a certain someone.",
          outfit_advice: "Vibrant, artsy, and emotionally layered. Bold patterns, rainbow knits, playful textures, or anything vintage-inspired. Dopamine dressing with zero subtlety, you make colour look dangerous.",
          act_summary: "You know too much and you're not above letting it slip. Sarcastic, cutting, always one step ahead, but you pretend you're just here for the vibes.",
          act_bullets: ["Make everything sound like a joke… until it's not", "Give compliments that feel like insults", "Watch everything, say nothing (until it matters)", "Be casually petty, especially toward Gabby", "If accused of drama: 'I don't start it, I just retouch it'"],
          traits: ["Perceptive", "Petty", "Artistic", "Emotionally Guarded"]
        }
      });

      // ── MOTIVES ─────────────────────────────────────────────────────────────
      const { error: doaMotErr } = await supabase.from('motives').insert([
        { mystery_id: mystery.id, character_id: nova.id, motive_type: 'power', strength: 'moderate', linked_character_id: skye.id, notes: "Tired of being Gabby's shadow. Wants the spotlight, but murder wasn't on her mood board." },
        { mystery_id: mystery.id, character_id: blaze.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Prepared the poison for Colt, not Gabby, but jealousy and drug use made them a puppet in Milo's hands." },
        { mystery_id: mystery.id, character_id: cole.id, motive_type: 'fear', strength: 'low', linked_character_id: skye.id, notes: "Knew Dane was unstable; said nothing because it made for good TV." },
        { mystery_id: mystery.id, character_id: rex.id, motive_type: 'love', strength: 'critical', linked_character_id: skye.id, notes: "Rejected by Gabby for the last time, Milo switched the glasses, a twisted act of 'being part of her story forever'." },
        { mystery_id: mystery.id, character_id: jordan.id, motive_type: 'greed', strength: 'high', linked_character_id: skye.id, notes: "Deleted the security footage. Knew something was wrong and let it happen for the content." },
        { mystery_id: mystery.id, character_id: brooke.id, motive_type: 'revenge', strength: 'high', linked_character_id: skye.id, notes: "Never forgave Gabby for stealing the win and going silent. Had motive, opportunity, and a very convenient alibi." },
        { mystery_id: mystery.id, character_id: zane.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Had most of their footage cut from the reunion special. Came with a vengeance arc but no actual plan." },
        { mystery_id: mystery.id, character_id: mara.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: skye.id, notes: "Ghosted by Gabby post-show after a deep friendship. Sent the warning, but too late." }
      ]);
      if (doaMotErr) throw new Error(`DOA motives failed: ${doaMotErr.message}`);

      // ── RELATIONSHIPS ───────────────────────────────────────────────────────
      const doaRawRels = [
        { char1: skye, char2: nova, dynamics: ['family'], notes: "Sisters - but Sienna lives entirely in Gabby's shadow and resents every second of it." },
        { char1: skye, char2: blaze, dynamics: ['romantic', 'rivals'], notes: "The ex. They were the golden couple until Dane kissed someone else 'for the challenge'." },
        { char1: skye, char2: cole, dynamics: ['romantic', 'co-workers'], notes: "Secretly hooking up since the show ended. The catalyst for Dane's breakdown." },
        { char1: skye, char2: rex, dynamics: ['co-workers'], notes: "Milo is obsessively devoted to Skye; Gabby laughed off Milo's love confession an hour before dying." },
        { char1: skye, char2: jordan, dynamics: ['co-workers'], notes: "Jeremy planted as a producer to stir drama around Skye; knows all her secrets." },
        { char1: skye, char2: brooke, dynamics: ['rivals', 'besties'], notes: "Were close allies on the show, until Gabby won and stopped texting back." },
        { char1: skye, char2: zane, dynamics: ['co-workers'], notes: "Gabby's edit overshadowed Zayn's best footage; Zayn holds a low-grade grudge." },
        { char1: skye, char2: mara, dynamics: ['friends', 'co-workers'], notes: "Gabby ghosted Rikki post-show despite a close friendship during filming." },
        { char1: blaze, char2: rex, dynamics: ['rivals'], notes: "Both obsessed with Gabby but for very different reasons. Milo knows Dane's plan." },
        { char1: blaze, char2: cole, dynamics: ['rivals'], notes: "Dane discovered Colt and Gabby's secret hookups, the trigger for the whole plot." },
        { char1: jordan, char2: mara, dynamics: ['co-workers'], notes: "Rikki tried to alert Jeremy about Dane's behaviour; Jeremy used it as entertainment." },
        { char1: brooke, char2: nova, dynamics: ['besties'], notes: "Bonded over being sidelined by Gabby. Sienna promised to 'handle it'." },
        { char1: zane, char2: nova, dynamics: ['romantic', 'co-workers'], notes: "Flirtatious and chaotic; Sienna suggested they 'give Gabby a taste of her own medicine'." },
        { char1: cole, char2: jordan, dynamics: ['co-workers', 'friends'], notes: "Jeremy tipped Colt off about Dane's behaviour, mainly for the footage." },
        { char1: rex, char2: mara, dynamics: ['co-workers'], notes: "Rikki noticed Milo at the bar right before the toast and sent a warning to Jeremy." },
        { char1: brooke, char2: mara, dynamics: ['friends'], notes: "Drinking buddies who gossip about cast drama and production secrets." }
      ];
      const doaSortedRels = dedupeRelationships(doaRawRels.map(rel => {
        const [a, b] = [rel.char1.id, rel.char2.id].sort();
        return { mystery_id: mystery.id, character_a_id: a, character_b_id: b, know_each_other: true, dynamics: rel.dynamics, notes: rel.notes };
      }));
      const { error: doaRelErr } = await supabase.from('relationships').insert(doaSortedRels);
      if (doaRelErr) throw new Error(`DOA relationships failed: ${doaRelErr.message}`);

      // ── PLOT BEATS ──────────────────────────────────────────────────────────
      const doaInsertBeat = async (payload: any) => {
        const { data, error } = await supabase.from('plot_beats').insert(payload).select().single();
        if (error || !data) throw new Error(`DOA beat insert failed: ${error?.message}`);
        return data;
      };
      const doaB1 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 1, sort_order: 1, event_title: "Dane Learns About The Colt Affair", description: "Dane discovers Gabby has been secretly hooking up with Colt off-camera. Leaked video clips, group chat explosions, and producer Jeremy's backstage instigation confirm the betrayal and trigger Dane's motive to poison Colt.", characters_involved: [blaze.id, skye.id, cole.id, jordan.id, zane.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
      const doaB2 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 2, sort_order: 2, event_title: "Dane Spirals & Researches Poison", description: "Consumed by jealousy, Dane writes a bitter unsent note vowing not to stay quiet and searches online for sedatives, sleeping pills mixed with alcohol, and how to spike a drink without taste.", characters_involved: [blaze.id, skye.id, cole.id], is_required: true, beat_type: 'discovery', timeline_phase: 'pre_crime' });
      const doaB3 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 3, sort_order: 3, event_title: "Milo Tracks Dane's Poison Plot", description: "Through his stalking to-do list, iCloud hacking, and Eye Spy spyware on Device 269, Milo intercepts Dane's search history and realizes Dane plans to poison Colt's drink.", characters_involved: [rex.id, blaze.id], is_required: true, beat_type: 'twist', timeline_phase: 'pre_crime' });
      const doaB4 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 4, sort_order: 4, event_title: "Milo's Rejected Confession to Gabby", description: "Deluded into believing Gabby shares his feelings, Milo confesses his love to her one final time. Gabby laughs it off and rejects him. Humiliated and feeling invisible, Milo writes that there is 'only one way this ends'.", characters_involved: [rex.id, skye.id], is_required: true, beat_type: 'twist', timeline_phase: 'pre_crime' });
      const doaB5 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 5, sort_order: 5, event_title: "Dane Poisons The Drink With Temazepam", description: "High on cocaine in glam and spiralling, Dane uses his prescribed Temazepam sleep medication, fatal when mixed with alcohol, to spike a champagne glass intended for Colt. Rikki warns Jeremy, who ignores it for content.", characters_involved: [blaze.id, cole.id, mara.id, jordan.id], is_required: true, beat_type: 'clue_reveal', timeline_phase: 'crime' });
      const doaB6 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 6, sort_order: 6, event_title: "Milo Switches The Poisoned Glass", description: "At 5:38 PM backstage, a hooded Milo reaches across the drinks table and switches the spiked champagne glass so that Gabby, not Colt, will drink the fatal dose.", characters_involved: [rex.id, skye.id, cole.id], is_required: true, beat_type: 'twist', timeline_phase: 'crime' });
      const doaB7 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 7, sort_order: 7, event_title: "Gabby Collapses Mid-Toast", description: "During the reunion toast, Gabby drinks from the switched champagne glass and collapses. Chaos erupts as the cast realizes the drink was poisoned.", characters_involved: [skye.id, blaze.id, rex.id, mara.id, cole.id], is_required: true, beat_type: 'discovery', timeline_phase: 'investigation' });
      const doaB8 = await doaInsertBeat({ mystery_id: mystery.id, beat_number: 8, sort_order: 8, event_title: "Milo's Manifesto & Killer Confession", description: "Having drafted a viral social post ('Everything changes after tonight. They'll remember me'), Milo records a chilling voice confession admitting he watched Dane's plan and redirected the poisoned glass to become part of Gabby's story forever.", characters_involved: [rex.id], is_required: true, beat_type: 'twist', timeline_phase: 'resolution' });

      // ── CLUES ───────────────────────────────────────────────────────────────
      const { error: doaClueErr } = await supabase.from('clues').insert([
        // Round 1 (8 Clues)
        {
          mystery_id: mystery.id,
          title: "Anonymous Text Thread",
          clue_type: 'secret',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 1,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:chat] [CODE:R1-C1] Red Herring / Drama Noise - Shows {{Zayn}}/{{Sienna}} tension regarding an unaired blackmail tape, but has zero connection to the poison plot.',
          description: `Sender: Unless you've got something juicier to give me, I'm dropping the tape.\n{{Gabby}}: Post it. Why would I care. {{Sienna}} wants the attention anyway. God shes desperate.\nSender: Little Heartless {{Gabby_Initial}}. The video leaves nothing to the imagination... {{Sienna_Initial}} would be fully exposed\n{{Gabby}}: As i said before, IDGAF. {{Sienna}} needs character building anyway.\n[Sent 12:14PM]\nSender: Ik im an assh*le for filming but thought you should know what your sister said...`,
          generation_prompt: `A close-up shot of hands holding a dark cocktail glass against a glamorous, dimly lit party lounge background. (No text on screen).`
        },
        {
          mystery_id: mystery.id,
          title: "Direct Messages",
          clue_type: 'secret',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 1,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:chat] [CODE:R1-C2] Red Herring / Distraction - Designed to point suspicion toward runner-up {{Ava}}, though {{Ava}} did not plan or commit the poisoning.',
          description: `Sender: You don't deserve the win. Everyone sees what you really are. It's time someone did something about it. 🔥\n[Sent 12:14PM]`,
          generation_prompt: `Two glamorous figures seen in soft focus across a crowded VIP party, tension in the room. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "EYE SPY SOFTWARE - Device: 269",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 1,
          is_essential: true,
          linked_plot_beat_id: doaB3.id,
          internal_notes: '[FORMAT:search_log] [CODE:R1-C3] REAL / CANON (Beat 2 & 3) - Documents searches on sedatives, poisoning, and getting away with murder. {{Dane}} conducted these searches; {{Milo}} discovered them via spyware.',
          description: `EYE SPY SOFTWARE - Accessing Device: 269\nRecent Tabs / Search History:\n• Do sedatives show up in blood test\n• Alcohol + sleeping pills dangerous?\n• How to spike a drink without taste\n• How to Poison Someone\n• How to Get away with murder\n• {{Gabby}} - Love On The Rocks\n• {{Gabby}} + {{Dane}} cute edits\n• Love On The Rocks`,
          generation_prompt: `A sleek laptop or tablet sitting on a modern dark desk with subtle blue backlighting, dimly lit room. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Direct Messages",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 1,
          is_essential: true,
          linked_plot_beat_id: doaB1.id,
          internal_notes: '[FORMAT:chat] [CODE:R1-C4] REAL / CANON (Beat 1) - {{Dane}} learns about {{Colt}} and {{Gabby}}\'s post-show affair, which triggers {{Dane_his}} motive to poison {{Colt}}.',
          description: `Sender: Ik we aren't speaking but did you see what I said in the GC\n{{Dane}}: yeah. wtf. how do you know?\nSender: {{Colt}} and I were together at the same time. I'm more pissed than you.\n{{Dane}}: I can assure you, you're not.`,
          generation_prompt: `A tense silhouette of a man in a doorway checking his watch in an upscale venue. (No text).`
        },
        {
          mystery_id: mystery.id,
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
          mystery_id: mystery.id,
          title: "{{Ava}} & {{Rikki}}",
          clue_type: 'testimony',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 1,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:chat] [CODE:R1-C6] Red Herring / Drama Noise - Shows {{Ava}} dropping gossip to stir up trouble before the reunion, but neither {{Ava}} nor {{Rikki}} poisoned anyone.',
          description: `{{Ava}}: Should I just tell {{Dane_him}}? Wait, maybe you should...lol\n{{Ava}}: Either way, i feel like {{Dane_he}} deserves to know\n{{Rikki}}: Babe, {{Dane_hes}} gonna find out at some point... You should be the one... you know {{Gabby_Initial}} would hate it. {{Ava}}, take one for the team...\n{{Ava}}: Ok, i'll message now. But ONLY bc {{Dane}} deserves to know... no other reasons...\n{{Rikki}}: HOLY... IN THE GC!? YOU. ARE. BRAVE\n[Status: SEEN]`,
          generation_prompt: `Makeup brushes, an open vanity mirror, and cosmetic powders scattered on a backstage dressing table. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "LOTR GC",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 1,
          is_essential: true,
          linked_plot_beat_id: doaB1.id,
          internal_notes: '[FORMAT:chat] [CODE:R1-C7] REAL / CANON (Beat 1) - Publicly outs the affair in the cast group chat, confirming {{Colt}}\'s involvement and escalating {{Dane}}\'s fury.',
          description: `{{Ava}}: Wow... You couldn't keep your legs closed, could u {{Gabby_Initial}}\n{{Gabby}}: Honestly... its none of your business {{Ava}}. Stop it.\nCast Member: Oh F*** off {{Ava}}. Why are we talking about this in the main GC.\nCast Member: Actually, why are we talking about this at all.\n{{Colt}}: Yikes, Drama... Save it for the Reunion tmr.`,
          generation_prompt: `A bustling party room viewed from a distance, glamorous guests laughing and holding drinks. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "IMG_4875.mov (0:13)",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 1,
          is_essential: true,
          linked_plot_beat_id: doaB1.id,
          internal_notes: '[FORMAT:cctv] [CODE:R1-C8] REAL / Supporting Evidence (Beat 1) - Proves {{Colt}} and {{Gabby}} were physically intimate off-camera, confirming the rumor that set {{Dane}} off.',
          description: `File: IMG_4875.mov (0:13)\nSource: Recorded on {{Zayn}}'s iPhone\nVisual: Video still capturing {{Colt}} and {{Gabby}} together behind closed doors.`,
          generation_prompt: `A close, shadowy, intimate silhouette of a man and woman embracing in a private room.`
        },

        // Round 2 (10 Clues)
        {
          mystery_id: mystery.id,
          title: "CONFIDENTIAL - Love On The Rocks",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB5.id,
          internal_notes: '[FORMAT:call_sheet] [CODE:R2-C1] REAL / CANON (Beat 3 & 5) - Confirms {{Dane}} used cocaine in glam, was twitchy and muttering threats about {{Colt}}, and notes {{Milo}} hovering suspiciously.',
          description: `CONFIDENTIAL - Love On The Rocks\n• Try Get {{Gabby_Initial}} to talk to [REDACTED ████████]\n• {{Ava_Initial}} spiralling. re: {{Gabby_Initial}} & {{Colt_Initial}}\n• {{Colt_Initial}} and {{Gabby_Initial}} were in closet for AGES\n• {{Milo_Initial}} still hovering. Watch {{Milo_him}}, seems unstable\nYou know what to do...\n-----------------------------------------------\nHandwritten Note at Bottom:\n"FYI - There was coke all over the corner of my makeup mirror. Pretty sure {{Dane_Initial}} used it while I stepped out. {{Dane_Hes}} twitchy AF and muttering stuff about {{Colt_Initial}}. Handle it if you need to. Just don't put it on me.\n- {{Rikki_Initial}}"`,
          generation_prompt: `A wooden clipboard resting on a production sound case backstage next to coiled cables. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Prescription: Temazepam",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB5.id,
          internal_notes: '[FORMAT:medical_rx] [CODE:R2-C2] REAL / CANON (Beat 5 - Murder Weapon) - The exact sedative prescription used in the poisoning, with a medical warning that it is fatal when mixed with alcohol.',
          description: `Medication: Temazepam (For sleep disturbance)\nPrescribed to: {{Dane}}\nIssue date: 3 weeks ago\nRef: 10-3-204\nWARNING: May cause drowsiness. Fatal when mixed with alcohol.`,
          generation_prompt: `A metallic tray or dark nightstand with scattered empty prescription blister foil next to a glass of water. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Real Ones - LOTR",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB6.id,
          internal_notes: '[FORMAT:chat] [CODE:R2-C3] REAL / CANON (Beat 5 & 6) - Eye-witness testimony that {{Dane}} was pacing, staring intently at the champagne bottles, and acting erratic before the glass switch.',
          description: `Sender 1: {{Dane}}'s in glam pacing like {{Dane_hes}} about to propose or explode 😭\nSender 2: {{Dane_He}} deadass asked ME if {{Gabby}} still talks about {{Dane_him}} 💀\nSender 2: I saw {{Dane_him}} staring at the champagne bottles lol\nSender 1: I'm not tryna get roofied tonight someone talk to {{Dane_him}}...\nSender 3: Is {{Dane_he}} still on {{Dane_his}} meds...?\nSender 4: 🧐📱🤓`,
          generation_prompt: `Dim backstage green room with leather sofas and illuminated mirror bulbs in background. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Crumpled Personal Note",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB2.id,
          internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C4] REAL / CANON (Beat 2) - {{Dane}}\'s direct confession of intent to take action because {{Dane_he}} cannot bear seeing {{Colt}} with {{Gabby}}.',
          description: `"If I have to watch {{Colt_him}} stand next to her again I'll lose it.\n{{Colt_He}} thinks I won't do anything because the cameras are on.\nBut I will. I'm done being quiet."`,
          generation_prompt: `A crumpled paper page resting next to an empty glass on a wooden coffee table. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Notes - To Do Checklist",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB3.id,
          internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C5] REAL / CANON (Beat 3) - {{Milo}}\'s stalking checklist proving {{Milo_he}} accessed devices and uncovered {{Dane}}\'s poison plot.',
          description: `Date: Today at 4:15 PM\nTo do:\n• Check {{Dane_his}} iCloud (same recovery answers as last time? Try 08/11?) [strikethrough]\n• stalk insta DMs [strikethrough]\n• Go Through Camera Roll\n• Go through Safari history. [strikethrough]`,
          generation_prompt: `A dark workstation with notebooks, smartphone, and glasses resting beside a desk lamp. (No text).`
        },
        {
          mystery_id: mystery.id,
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
          mystery_id: mystery.id,
          title: "New Recording 84 (5:12 PM)",
          clue_type: 'testimony',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB2.id,
          internal_notes: '[FORMAT:audio] [CODE:R2-C7] REAL / CANON (Beat 1 & 2) - Producer {{Jeremy}} instigates {{Dane}} about {{Colt}} and {{Gabby}} being together in wardrobe for 25 minutes.',
          description: `Recording Duration: 25.04 Seconds\n{{Jeremy}}: "{{Rikki}} said they were in wardrobe for, like, 25 minutes. Just them. {{Colt}} and {{Gabby}}."\n{{Dane}}: "You're joking."\n{{Jeremy}}: "I'm not. {{Ava}}'s about to combust... Might be good to get that on camera..."\n{{Dane}}: "You'll get something."\n[Recording cuts]`,
          generation_prompt: `A microphone pack and sound mixer console lit by subtle LED displays backstage. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Journal Entry",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 2,
          is_essential: true,
          linked_plot_beat_id: doaB4.id,
          internal_notes: '[FORMAT:handwritten_note] [CODE:R2-C8] REAL / CANON (Beat 4) - Establishes {{Milo}}\'s delusion that {{Gabby}} truly had feelings for {{Milo_him}} right before {{Milo_he}} confessed to her.',
          description: `"Tonight felt kind of perfect. I actually think I'm happy - like, the real kind. You looked at me like you meant it this time. Maybe this is it? Maybe it's finally happening..."`,
          generation_prompt: `A fountain pen resting over an open journal under warm ambient light. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Shh",
          clue_type: 'secret',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 2,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:chat] [CODE:R2-C9] Red Herring / Petty Revenge - {{Sienna}} and {{Zayn}} plan a public stunt or drama swap, but did not spike any drinks.',
          description: `{{Sienna}}: God you are an Ass. But WTF. I can't believe she actually said that...\n{{Sienna}}: Especially After EVERYTHING i've done for her\n{{Zayn}}: Yeah Yikes.\n{{Sienna}}: I have an idea tho, Lets give her a taste of her own Medicine... we look the exact same\n{{Zayn}}: God I think im in love with you`,
          generation_prompt: `Two figures whispering in an intimate, dimly lit alcove of a luxury venue. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Server Audit Log - SEC CAM_4B",
          clue_type: 'physical',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 2,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:search_log] [CODE:R2-C10] Red Herring / Producer Shenanigans - {{Jeremy}} deleting footage of {{Rikki}} ranting; emphasizes producer interference rather than murder prep.',
          description: `ERROR: FILE NOT FOUND\nFile: SEC CAM_4B [Green Room]\nTime: 5:40PM - 6:05PM\nStatus: Permanently Deleted\nActioned by: jeremy.p@lotv.tv\nReason: "corrupted audio, unusable"\nNote: "I just cut the section. It was mostly {{Rikki}} ranting anyway - no good angles. Not worth a storyline. No one needs to hear that."`,
          generation_prompt: `A dark broadcast control room with monitors and server rack lights. (No text).`
        },

        // Round 3 (7 Clues)
        {
          mystery_id: mystery.id,
          title: "Security Cam Still • Backstage",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: doaB6.id,
          internal_notes: '[FORMAT:cctv] [CODE:R3-C1] REAL / CANON (Beat 6) - Shows {{Milo}} backstage switching the glasses on the table so {{Gabby}} receives the spiked champagne.',
          description: `Header: SECURITY CAM STILL • BACKSTAGE\nTimestamp: 5:38 PM\nVisual: A hooded figure is seen reaching over the table with champagne glasses and wine bottles.`,
          generation_prompt: `Overhead black-and-white surveillance angle of a round draped cocktail table with wine glasses and a wine bottle; a hooded figure with face blurred reaching toward a glass.`
        },
        {
          mystery_id: mystery.id,
          title: "Social Post Draft (6:12 PM)",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: doaB8.id,
          internal_notes: '[FORMAT:social_post] [CODE:R3-C2] REAL / CANON (Beat 8) - {{Milo}} preparing {{Milo_his}} manifesto to go viral as the unforgettable figure tied to {{Gabby}} forever.',
          description: `Post Draft (6:12 PM):\n"Everything changes after tonight.\nThey'll remember me.\nEven if it means they never look at her the same again."\nTags: #exclusive #truthhurts #watchthisspace\nLocation: The Grand Penthouse • VIP Reunion Lounge\nAudio selected: Reelin' In The Years`,
          generation_prompt: `A phone screen silhouette glowing against a dark room interior. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Notes App Entry",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: doaB4.id,
          internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C3] REAL / CANON (Beat 4) - {{Gabby}} records that {{Milo}} confessed {{Milo_his}} love, she rejected {{Milo_him}}, and {{Milo_he}} took it personally and hovered around her.',
          description: `Date: Today at 5:34 PM\n"They told me they are in love with me. They said it's always been me.\nI told them it's not like that. That it's never been like that.\nI think they took it personally. Now they're just... hovering.\nGod, they're all liars. Something's gonna happen. I have a bad feeling. I just don't think I'm the target?\nWish me luck\n- {{Gabby_Initial}}"`,
          generation_prompt: `A luxury metallic clutch bag sitting open on a marble dressing vanity. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "New Recording 85 (Backstage)",
          clue_type: 'testimony',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 3,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:audio] [CODE:R3-C4] Red Herring / Content Drama - Cast members fighting over video leaks and reality TV screentime, recorded by production.',
          description: `Recording Duration: 32.25 Seconds\nSpeaker 1: "You think this is just content!? This is my life."\nSpeaker 2: "You said to post it. Don't backpedal now that it's not your **BLEEP** on the line."\nSpeaker 2: "They already think you hooked up with {{Colt_him}} anyway. This just confirms it."\n*Pause*\nSpeaker 1: "I never want to see you again, you're disgusting."\nSpeaker 2: "You're so dramatic."\nSpeaker 3: "You're both on camera."`,
          generation_prompt: `A sound recordist's boom microphone positioned above a backstage partition wall. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Security Cam Still • Backstage",
          clue_type: 'physical',
          implication_type: 'red_herring',
          evidence_status: 'fake',
          round_number: 3,
          is_essential: false,
          linked_plot_beat_id: null,
          internal_notes: '[FORMAT:cctv] [CODE:R3-C5] Red Herring / Relationship Fallout - {{Colt}} arguing about off-camera hookups, distracting players into thinking {{Colt}} did the deed.',
          description: `Header: SECURITY CAM STILL • BACKSTAGE\nTimestamp: 5:52 PM\nVisual: Two figures in formal evening wear in an intense face-to-face confrontation beside the drinks table.`,
          generation_prompt: `Grainy surveillance feed of a man in a dark suit gesturing aggressively across a table to a dark-haired woman in a sleeveless dress.`
        },
        {
          mystery_id: mystery.id,
          title: "Torn Unsent Note",
          clue_type: 'physical',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: doaB7.id,
          internal_notes: '[FORMAT:handwritten_note] [CODE:R3-C6] REAL / CANON (Beat 4 & 7) - Direct evidence of {{Milo}}\'s motive found backstage after {{Gabby}} laughed at {{Milo_his}} confession: "Well... there\'s only one way this ends".',
          description: `"...But when I told you I loved you. you laughed. Like I didn't exist. You made me feel invisible. Well... there's only one way this ends."`,
          generation_prompt: `A discarded, torn piece of black paper or card on the floor near stage curtains. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "Instagram - @{{Gabby}}4ever_edits",
          clue_type: 'secret',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 3,
          is_essential: true,
          linked_plot_beat_id: doaB4.id,
          internal_notes: '[FORMAT:social_post] [CODE:R3-C7] REAL / CANON (Beat 4) - Proves {{Milo}}\'s obsessive stalking and fixation on {{Gabby}} as {{Milo_his}} "#futurewife".',
          description: `Account: @{{Gabby}}4ever_edits\nStats: 600 Posts • 65K Followers • 1 Following\nBio: "You only see the show. I see the soul. ❤️✨ #realLoveOnTheRocks"\nPost Grid Captions:\n• "The real winner. Always was. Always will be."\n• "One day she'll know the truth. #futurewife"\n• "You can't fake that look. She saw me."\n• "Fate works fast. Meeting her again."`,
          generation_prompt: `A smartphone propped up on a messy desk showing photo collages in the glow of a ring light. (No text).`
        },

        // Round 4 (2 Clues)
        {
          mystery_id: mystery.id,
          title: "Voice Memo Recording",
          clue_type: 'testimony',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 4,
          is_essential: true,
          linked_plot_beat_id: doaB8.id,
          internal_notes: '[FORMAT:audio] [CODE:R4-C1] REAL / CANON (Beat 6 & 8 - Killer Confession) - {{Milo}} confesses on tape to watching {{Dane}}\'s plan and redirecting the poisoned drink to {{Gabby}} so {{Milo_he}} could become "part of the story".',
          description: `Recording Duration: 45.21 Seconds\n"I tried to be quiet. I really did. I watched the whole thing happen. And when the moment came... I directed it to go exactly where it needed to. It's wild how things just fall into place.\nSome people live for the camera. Some people die for it. Either way... I'm part of the story now."`,
          generation_prompt: `An audio voice recorder lying next to a pair of wire-rimmed glasses on a dark reflective surface. (No text).`
        },
        {
          mystery_id: mystery.id,
          title: "5:52PM - Recovered Security Cam Audio",
          clue_type: 'testimony',
          implication_type: 'direct',
          evidence_status: 'real',
          round_number: 4,
          is_essential: true,
          linked_plot_beat_id: doaB7.id,
          internal_notes: '[FORMAT:audio] [CODE:R4-C2] REAL / Supporting Evidence (Beat 5 & 7) - Confirms {{Dane}} was high on cocaine and a loose cannon right before the 6:00 PM toast, while {{Jeremy}} refused to intervene for the sake of reality TV drama.',
          description: `Recording Duration: 38.64 Seconds\nHeader: 5:52PM - Recovered Security Cam Audio\n{{Rikki}}: "I'm serious - {{Dane}}'s not okay. {{Dane_Hes}} twitchy, {{Dane_hes}} muttering shit, I'm pretty sure {{Dane_he}} snorted a line off the f***ing mirror."\n{{Jeremy}}: "And you're telling me this like it's a problem?"\n{{Rikki}}: "Yes, {{Jeremy}}. It's a liability. {{Dane_He}} needs help... What if {{Dane_he}} snaps?"\n{{Jeremy}}: (laughs) "Then we get the footage. You want safe, go film MasterChef."`,
          generation_prompt: `Backstage audio monitors and headset hanging on a stand near the wings of the stage. (No text).`
        }
      ]);
      if (doaClueErr) throw new Error(`DOA clues failed: ${doaClueErr.message}`);

      // ── SUBPLOT ─────────────────────────────────────────────────────────────
      const { data: doaSubplot, error: doaSubErr } = await supabase.from('subplots').insert({
        mystery_id: mystery.id,
        title: "Sienna & Zayn's Revenge Pact",
        description: "Sienna and Zayn conspired to publicly humiliate Gabby by leaking old footage of her behaving badly, a red herring that makes them look guilty while Milo and Dane carry out the real crime.",
        primary_character_id: nova.id,
        secondary_character_id: zane.id,
        theme: "revenge"
      }).select().single();
      if (doaSubErr || !doaSubplot) throw new Error(`DOA subplot failed: ${doaSubErr?.message}`);

      const { error: doaSubBeatErr } = await supabase.from('subplot_beats').insert([
        { subplot_id: doaSubplot.id, beat_number: 1, description: "Sienna and Zayn discover they look similar enough to be confused for each other on camera. Sienna suggests impersonating Gabby to cause chaos. Zayn agrees, mostly because they're falling for Sienna.", linked_plot_beat_id: doaB1.id },
        { subplot_id: doaSubplot.id, beat_number: 2, description: "Zayn is caught near Gabby's bag. They claim they were grabbing their own phone. Jeremy watches. Says nothing. Files it away.", linked_plot_beat_id: doaB7.id }
      ]);
      if (doaSubBeatErr) throw new Error(`DOA subplot beats failed: ${doaSubBeatErr.message}`);

      console.log('✅ Seeded Love On The Rocks mystery successfully! 9 characters, 16 relationships, 8 motives, 8 beats, 27 clues, 1 subplot.');

    } else if (isCircus) {
      console.log('Seeding curated premium circus mystery base for ID:', mystery.id);
      
      // Update mystery record with premium curated text
      await supabase.from('mysteries').update({
        title: "The Ringmaster's Last Bow",
        theme: "Retro Circus Noir",
        description: "Under the striped canvas of the Grand Pavilion Circus, the lights are bright, but the shadows are deadly. Tonight, the domineering ringmaster Barnaby Frost was found dead inside the lion's cage, but the lion wasn't the killer. One of the tight-knit circus performers has blood on their hands, and the show must not go on until the truth is revealed.",
        inside_jokes: "Remember: never trust a mime, and always watch your pockets!"
      }).eq('id', mystery.id);

      // Seed 12 Curated Characters
      
      // 1. Barnaby (Victim)
      const barnaby = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Barnaby Frost|The Ringmaster|Victim",
        gender: "male",
        is_victim: true,
        plot_role: "victim",
        archetype: "victim",
        is_mandatory: true,
        profile_data: {
          bio: "The towering, loud, and domineering Ringmaster of the Grand Pavilion Circus. He ruled with a gold-tipped cane and an unyielding greed, running the circus into massive debt while shortchanging the performers. He was found dead in the lion's cage just before the midnight gala.",
          outfit_advice: "A magnificent red tailcoat with gold brocade, tall velvet top hat, high leather riding boots, and a gleaming gold-tipped cane.",
          act_summary: "Be domineering, speak in a deep booming voice, and constantly demand perfection from everyone in the cast.",
          act_bullets: [
            "Wield your gold-tipped cane with dramatic sweeps.",
            "Demand that 'the show must go on' no matter what.",
            "Look down your nose at anyone who questions your authority."
          ],
          traits: ["Domineering", "Greedy", "Charismatic", "Ruthless"]
        }
      });

      // 2. Zara (Killer)
      const zara = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Madame Zara|The Fortune Teller|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "killer",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          bio: "The enigmatic, velvet-draped Fortune Teller. Beneath her heavy gold rings and silk scarves lies a deep-seated grievance: she was once Barnaby's romantic partner, but he stole her life savings to buy out the circus and abandoned her to the sidelines. Tonight, she took her ultimate revenge.",
          outfit_advice: "Flowing velvet robes in deep purple and emerald, silk turbans, layered gold bead necklaces, and heavy rings on every finger.",
          act_summary: "Speak in low, cryptic whispers. Frequently look at hands and speak of doom.",
          act_bullets: [
            "Dramatically shuffle a deck of tarot cards.",
            "Stare into people's eyes as if peering into their souls.",
            "Speak of 'the threads of fate' and impending catastrophe."
          ],
          traits: ["Cryptic", "Enigmatic", "Resentful", "Mysterious"]
        }
      });

      // 3. Silas (Accomplice)
      const silas = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Silas|The Sad Clown|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "assistant",
        archetype: "sidekick",
        is_mandatory: true,
        profile_data: {
          bio: "The sorrowful, silent white-faced clown. Secretly, he is Barnaby's younger half-brother, forced to perform humiliating slapstick while Barnaby kept all the profit and fame. Out of bitter jealousy, Silas helped Madame Zara cover up the crime by locking the lion's cage and hiding the key.",
          outfit_advice: "A baggy, oversized black-and-white polka dot jumpsuit, a ruffled white neck collar, white face paint with a single painted tear.",
          act_summary: "Exude a quiet, melancholic sadness. Speak slowly and sigh often.",
          act_bullets: [
            "Carry a single wilted daisy and look at it sorrowfully.",
            "Perform small, silent shrugs or sad gestures instead of shouting.",
            "Sigh heavily before answering questions."
          ],
          traits: ["Melancholic", "Observant", "Loyal", "Bitter"]
        }
      });

      // 4. Zephyr (Adaptable Trapeze)
      const zephyr = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Zephyr|The Trapeze Star|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "hero",
        is_mandatory: true,
        profile_data: {
          bio: "The breathtaking, gravity-defying Trapeze Star who performs without a net. Behind the glamorous jumpsuits is a dark secret: Barnaby has been blackmailing them about a tragic rigging accident in their past. They lived in constant fear of their career ending.",
          presentation_female: {
            bio: "The breathtaking, gravity-defying Trapeze Empress. Barnaby blackmailed her over a rigging accident, holding her career in his hands.",
            outfit_advice: "A shimmering silver sequined leotard, glittery hair accessories, and athletic wraps on wrists.",
            act_summary: "Exude elegant grace but show visible anxiety when Barnaby is mentioned.",
            act_bullets: [
              "Adopt straight, athletic postures.",
              "Nervously check the wraps on your wrists.",
              "Fidget with hair accessories when under pressure."
            ]
          },
          presentation_male: {
            bio: "The breathtaking, gravity-defying Trapeze Emperor. Barnaby blackmailed him over a rigging accident, holding his career in his hands.",
            outfit_advice: "A shimmering silver sequined aerialist unitard, white wrist wraps, and sleek athletic slippers.",
            act_summary: "Exude elegant athletic grace but show visible anxiety when Barnaby is mentioned.",
            act_bullets: [
              "Adopt proud, straight postures.",
              "Nervously tighten the wraps on your wrists.",
              "Pace back and forth with athletic elegance when under pressure."
            ]
          },
          traits: ["Graceful", "Anxious", "Determined", "Athletic"]
        }
      });

      // 5. Jax (Fire Juggler)
      const jax = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Jax|The Fire Juggler|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "investigator",
        is_mandatory: true,
        profile_data: {
          bio: "The hot-headed, daredevil Fire Juggler who thrives on danger. Barnaby cut his pay in half and gave his prime time-slot away. Jax was heard screaming at Barnaby earlier that night, threatening to 'burn the circus to the ground.'",
          outfit_advice: "A sleeveless black leather vest with flame motifs, charcoal-stained trousers, leather fingerless gloves, and protective goggles.",
          act_summary: "Be energetic, fiery, and impatient. Speak quickly and tap your fingers.",
          act_bullets: [
            "Constantly twirl or toss a small juggling prop.",
            "Glower at authority figures and speak passionately.",
            "Mention how things would be better if they 'just burned it all down.'"
          ],
          traits: ["Hot-headed", "Rebellious", "Daredevil", "Impatient"]
        }
      });

      // 6. Gigi (Strongwoman)
      const gigi = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Beatrix 'Gigi' Laurent|The Strongwoman|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The circus Strongwoman, famous for bending iron bars. She suffered a severe shoulder injury when a poorly maintained rigging rope snapped. Barnaby refused to pay for her medical treatment, leaving her desperate and filled with greed to secure a buyout.",
          outfit_advice: "A leopard-print sash over a strong canvas jumpsuit, heavy leather wrist cuffs, and simulated iron weights.",
          act_summary: "Exude immense physical confidence and speak in a direct, blunt tone.",
          act_bullets: [
            "Occasionally flex your shoulders or adjust your wrist cuffs.",
            "Refuse to take nonsense from anyone.",
            "Constantly mention how physical strength solves problems."
          ],
          traits: ["Strong", "Blunt", "Proud", "Desperate"]
        }
      });

      // 7. Lucius (Magician)
      const lucius = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Lucius Vane|The Magician|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The slick, charismatic Illusionist and escape artist. Known for his lock-picking stunts, he was caught by Barnaby earlier tonight right outside the ringmaster's private safe. Barnaby threatened to expose him as a common thief and fraud.",
          outfit_advice: "A sharp black tuxedo with velvet lapels, a black bow tie, a white pocket square, and a hidden deck of cards in your sleeves.",
          act_summary: "Be charming, smooth, and slightly theatrical. Speak with a refined cadence.",
          act_bullets: [
            "Dramatically perform small coin tricks or card flourishes.",
            "Smile mysteriously and dodge direct questions.",
            "Adjust your cuffs and lapels with theatrical poise."
          ],
          traits: ["Slick", "Charismatic", "Theatrical", "Clever"]
        }
      });

      // 8. Seraphina (Lion Tamer)
      const seraphina = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Seraphina Gray|The Lion Tamer|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "hero",
        is_mandatory: true,
        profile_data: {
          bio: "The fierce and compassionate Lion Tamer. Highly animal-loving, she was absolutely disgusted by Barnaby's cruel training methods and neglect of the big cats. She was determined to seek justice and free the animals from his tyranny.",
          outfit_advice: "A green military-style jacket with brass buttons, high riding boots, and a decorative leather whip slung over your shoulder.",
          act_summary: "Be bold, fierce, and protective. Speak with absolute authority.",
          act_bullets: [
            "Hold a decorative whip and tap it against your boot.",
            "Glare coldly at anyone who behaves cruelly.",
            "Speak passionately about animal welfare and justice."
          ],
          traits: ["Fierce", "Bold", "Compassionate", "Protective"]
        }
      });

      // 9. Thaddeus (Circus Doctor)
      const thaddeus = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Professor Thaddeus|The Circus Doctor|Suspect",
        gender: "male",
        is_victim: false,
        plot_role: "innocent",
        archetype: "investigator",
        is_mandatory: true,
        profile_data: {
          bio: "The eccentric, nervous Circus Doctor and apothecary. Barnaby discovered Thaddeus was writing illegal prescriptions for sleeping drafts to support his chemistry experiments. Barnaby blackmailed Thaddeus into supplying him with rare poison extracts.",
          outfit_advice: "A dusty tweed suit, round wire-rimmed glasses, a stethoscope peeking out of a pocket, and a leather doctor's satchel filled with bottles.",
          act_summary: "Be nervous, intellectual, and constantly mutter scientific names.",
          act_bullets: [
            "Nervously push your glasses up your nose.",
            "Clutch your satchel as if protecting its contents.",
            "Mutter about dosages, symptoms, and chemicals when asked questions."
          ],
          traits: ["Eccentric", "Nervous", "Intellectual", "Paranoid"]
        }
      });

      // 10. Penny (Acrobat)
      const penny = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Penelope 'Penny' Lane|The Acrobat|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "sidekick",
        is_mandatory: true,
        profile_data: {
          bio: "A young, naive acrobatic dancer. Barnaby manipulated her with promises of putting her name in lights, leading her to believe he was in love with her. Tonight, she found out he was engaged to be married to his wealthy ex-wife, breaking her heart.",
          outfit_advice: "A bright pink ruffled tutu, ballet satin slippers with laces wrapped up the ankles, and glittery face makeup.",
          act_summary: "Be bubbly and naive, but occasionally burst into tragic sniffling.",
          act_bullets: [
            "Nervously spin or stand on your tiptoes.",
            "Look around wide-eyed and speak in a soft, high-pitched voice.",
            "Dab your eyes with a lace handkerchief when distressed."
          ],
          traits: ["Naive", "Bubbly", "Heartbroken", "Expressive"]
        }
      });

      // 11. Rory (Adaptable Barker)
      const rory = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Rory Vance|The Ring Barker|Suspect",
        gender: "adaptable",
        is_victim: false,
        plot_role: "innocent",
        archetype: "witness",
        is_mandatory: true,
        profile_data: {
          bio: "The booming, loud Ring Barker who calls guests into the show. They discovered Barnaby was systematically skimming the circus's pension fund, leaving the retired performers penniless.",
          presentation_female: {
            bio: "The booming Ring Barker who discovered Barnaby's embezzlement of the pension fund, leaving her furious.",
            outfit_advice: "A striped waistcoat, a brass megaphone, black bowler hat, and a pocket watch.",
            act_summary: "Speak with a loud, theatrical voice, treating every conversation like a show.",
            act_bullets: [
              "Speak using grandiose showman adjectives.",
              "Nervously check your pocket watch.",
              "Point dramatically when making an accusation."
            ]
          },
          presentation_male: {
            bio: "The booming Ring Barker who discovered Barnaby's embezzlement of the pension fund, leaving him furious.",
            outfit_advice: "A striped waistcoat, a brass megaphone, black bowler hat, and a pocket watch.",
            act_summary: "Speak with a loud, theatrical voice, treating every conversation like a show.",
            act_bullets: [
              "Speak using grandiose showman adjectives.",
              "Nervously check your pocket watch.",
              "Point dramatically when making an accusation."
            ]
          },
          traits: ["Loud", "Theatrical", "Observant", "Righteous"]
        }
      });

      // 12. Mimi (High-Wire Star)
      const mimi = await insertCharacter(supabase, {
        mystery_id: mystery.id,
        name: "Mimi Le Grand|The High-Wire Star|Suspect",
        gender: "female",
        is_victim: false,
        plot_role: "innocent",
        archetype: "villain",
        is_mandatory: true,
        profile_data: {
          bio: "The glamorous, calculating High-Wire walker. Barnaby's ex-wife and co-owner. Tonight, she confronted him with divorce papers demanding sole ownership of the circus, threatening to expose his financial crimes if he didn't sign.",
          outfit_advice: "A gorgeous silk robe with feather trim, a diamond tiara, high-heeled velvet slippers, and a feathered hand fan.",
          act_summary: "Be incredibly glamorous, haughty, and demanding. Treat others as your servants.",
          act_bullets: [
            "Fan yourself slowly with a feathered hand fan.",
            "Speak with a slow, bored drawl.",
            "Look down at other people's clothes with disapproval."
          ],
          traits: ["Glamorous", "Calculating", "Haughty", "Demanding"]
        }
      });

      // Insert motives, all 11 suspects linked to the victim
      const { error: motErr } = await supabase.from('motives').insert([
        { mystery_id: mystery.id, character_id: zara.id, motive_type: 'revenge', strength: 'critical', linked_character_id: barnaby.id, notes: "Barnaby stole her savings to buy out the circus and abandoned her romantic partnership years ago. Tonight was her final vengeance." },
        { mystery_id: mystery.id, character_id: silas.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: barnaby.id, notes: "Tired of being forced to perform humiliating slapstick for no pay while Barnaby took all the credit and fame." },
        { mystery_id: mystery.id, character_id: zephyr.id, motive_type: 'fear', strength: 'critical', linked_character_id: barnaby.id, notes: "Barnaby discovered she was responsible for the past rigging accident and blackmailed her, threatening to destroy her aerial career." },
        { mystery_id: mystery.id, character_id: jax.id, motive_type: 'revenge', strength: 'moderate', linked_character_id: barnaby.id, notes: "Barnaby cut his salary in half and gave his prime time-slot away. Jax sought revenge to restore his financial security." },
        { mystery_id: mystery.id, character_id: gigi.id, motive_type: 'greed', strength: 'high', linked_character_id: barnaby.id, notes: "Needs cash to pay for her severe shoulder injury medical bills, which Barnaby refused to pay despite snapping his ropes." },
        { mystery_id: mystery.id, character_id: lucius.id, motive_type: 'fear', strength: 'moderate', linked_character_id: barnaby.id, notes: "Barnaby caught Lucius near his private safe, threatening to expose him as a lock-picking thief and fraud to the entire cast." },
        { mystery_id: mystery.id, character_id: seraphina.id, motive_type: 'justice', strength: 'high', linked_character_id: barnaby.id, notes: "Determined to stop Barnaby's cruel training whips and poor care of the circus's big cats, seeking justice for the animals." },
        { mystery_id: mystery.id, character_id: thaddeus.id, motive_type: 'fear', strength: 'moderate', linked_character_id: barnaby.id, notes: "Barnaby blackmailed Thaddeus over illegal apothecary prescriptions, forcing him to supply chemical formulas and poisons." },
        { mystery_id: mystery.id, character_id: penny.id, motive_type: 'love', strength: 'high', linked_character_id: barnaby.id, notes: "Felt manipulated and heartbroken when she discovered that Barnaby was secretly proposing to reunite with his wealthy ex-wife." },
        { mystery_id: mystery.id, character_id: rory.id, motive_type: 'justice', strength: 'moderate', linked_character_id: barnaby.id, notes: "Discovered Barnaby was systematically stealing the pension fund of the retired performers, leaving them penniless." },
        { mystery_id: mystery.id, character_id: mimi.id, motive_type: 'power', strength: 'critical', linked_character_id: barnaby.id, notes: "Wanted sole ownership and full control of the Grand Pavilion Circus, demanding Barnaby sign over all his shares." }
      ]);
      if (motErr) throw new Error(`Failed to insert motives: ${motErr.message}`);

      // Insert relationships alphabetically sorted + deduplicated
      const rawRelationships = [
        { char1: barnaby, char2: zara, dynamics: ['romantic', 'rivals'], notes: "Secret past lovers; now bitter enemies due to Barnaby's greed." },
        { char1: barnaby, char2: silas, dynamics: ['family', 'rivals'], notes: "Biological half-brothers; Silas is bitter about being forced into slapstick." },
        { char1: barnaby, char2: zephyr, dynamics: ['co-workers'], notes: "Barnaby blackmails Zephyr over her past trapeze rigging accident." },
        { char1: barnaby, char2: jax, dynamics: ['co-workers', 'rivals'], notes: "Barnaby skimmed Jax's juggler ticket revenues, causing massive screaming matches." },
        { char1: barnaby, char2: gigi, dynamics: ['co-workers'], notes: "Barnaby refused Gigi's injury medical coverage after a rope snapped." },
        { char1: barnaby, char2: lucius, dynamics: ['co-workers'], notes: "Barnaby caught Lucius near his safe, threatening to brand him a thief." },
        { char1: barnaby, char2: seraphina, dynamics: ['co-workers', 'rivals'], notes: "Seraphina despised Barnaby's cruel whip training and treatment of lions." },
        { char1: barnaby, char2: thaddeus, dynamics: ['friends', 'co-workers'], notes: "Thaddeus is his personal doctor, blackmailed into prescribing chemical drugs." },
        { char1: barnaby, char2: penny, dynamics: ['romantic', 'co-workers'], notes: "Barnaby manipulated Penny into believing he loved her to keep her performing." },
        { char1: barnaby, char2: rory, dynamics: ['co-workers'], notes: "Rory found out Barnaby was embezzling the retired performer pensions." },
        { char1: barnaby, char2: mimi, dynamics: ['married', 'rivals'], notes: "Ex-spouses and co-owners; Mimi demanded sole ownership of the circus." },
        { char1: zara, char2: silas, dynamics: ['besties'], notes: "Silas confides in Zara, who predicts a dark fate for his brother." },
        { char1: zara, char2: jax, dynamics: ['co-workers'], notes: "Zara reads tarot cards to Jax and guides his risky stunts." },
        { char1: jax, char2: gigi, dynamics: ['besties'], notes: "Lifting partners; Jax fire-proofed Gigi's weights." },
        { char1: lucius, char2: mimi, dynamics: ['co-workers', 'rivals'], notes: "Showmanship rivals; they constantly fight over the spotlight." },
        { char1: seraphina, char2: silas, dynamics: ['friends'], notes: "They share a quiet love for the animals and hate Barnaby's whip." },
        { char1: rory, char2: thaddeus, dynamics: ['besties'], notes: "Drinking buddies who gossip about circus finances and health." },
        { char1: penny, char2: zephyr, dynamics: ['besties'], notes: "Zephyr mentors Penny in acrobatic grace; Penny trusts Zephyr completely." }
      ];

      const sortedRelationships = dedupeRelationships(
        rawRelationships.map(rel => {
          const [a, b] = [rel.char1.id, rel.char2.id].sort();
          return {
            mystery_id: mystery.id,
            character_a_id: a,
            character_b_id: b,
            know_each_other: true,
            dynamics: rel.dynamics,
            notes: rel.notes
          };
        })
      );

      const { error: relErr } = await supabase.from('relationships').insert(sortedRelationships);
      if (relErr) throw new Error(`Failed to insert relationships: ${relErr.message}`);

      // Plot Beats, check each for errors
      const insertBeat = async (payload: any) => {
        const { data, error } = await supabase.from('plot_beats').insert(payload).select().single();
        if (error || !data) throw new Error(`Failed to insert beat "${payload.event_title}": ${error?.message}`);
        return data;
      };

      const beat1 = await insertBeat({
        mystery_id: mystery.id,
        beat_number: 1,
        sort_order: 1,
        event_title: "The Grand Entrance Feast",
        description: "The circus performers gather in the dining pavilion. Barnaby Frost makes a booming announcement that he is selling off the circus animals, causing massive outrage and bitter fights across the cast.",
        characters_involved: [barnaby.id, mimi.id, seraphina.id, zara.id, silas.id],
        is_required: true,
        beat_type: 'discovery',
        timeline_phase: 'pre_crime'
      });

      const beat2 = await insertBeat({
        mystery_id: mystery.id,
        beat_number: 2,
        sort_order: 2,
        event_title: "A Scream in the Starlight",
        description: "At midnight, a terrifying scream echoes from the animal tents. Jax and Silas run to investigate and discover Barnaby Frost's lifeless body locked inside the lion's cage, but the lion is sleeping quietly in the corner.",
        characters_involved: [barnaby.id, jax.id, silas.id, seraphina.id],
        is_required: true,
        beat_type: 'discovery',
        timeline_phase: 'crime'
      });

      const beat3 = await insertBeat({
        mystery_id: mystery.id,
        beat_number: 3,
        sort_order: 3,
        event_title: "The Poisoned Brandy Decanter",
        description: "Professor Thaddeus examines the body, noticing the sharp scent of bitter almonds (cyanide). Nearby, Lucius Vane discovers a shattered crystal decanter smelling of the exact same chemicals.",
        characters_involved: [thaddeus.id, lucius.id, zara.id],
        is_required: true,
        beat_type: 'clue_reveal',
        timeline_phase: 'investigation'
      });

      const beat4 = await insertBeat({
        mystery_id: mystery.id,
        beat_number: 4,
        sort_order: 4,
        event_title: "The Burning Ledger Scraps",
        description: "Ring Barker Rory Vance spots Zephyr burning papers in a metal tin behind the trapeze rigging. Rory retrieves a charred fragment, it is a portion of Barnaby's private financial ledgers showing massive debt skimming.",
        characters_involved: [rory.id, zephyr.id, penny.id, gigi.id],
        is_required: true,
        beat_type: 'twist',
        timeline_phase: 'resolution'
      });

      // Clues
      const { error: clueErr } = await supabase.from('clues').insert([
        { mystery_id: mystery.id, title: "The Oiled Lion Cage Key", clue_type: 'physical', implication_type: 'circumstantial', round_number: 1, is_essential: true, linked_plot_beat_id: beat2.id, description: "A heavy iron key smeared with aerialist silk grease, found stuffed inside the bottom of the sad clown's makeup trunk." },
        { mystery_id: mystery.id, title: "The Tarot Card of Death", clue_type: 'secret', implication_type: 'red_herring', round_number: 2, is_essential: false, linked_plot_beat_id: beat1.id, description: "A card of Death tucked inside Barnaby's vest pocket, with Madame Zara's cryptic handwriting on the back: 'Tonight, the final curtain falls.'" },
        { mystery_id: mystery.id, title: "The Shattered Brandy Decanter", clue_type: 'physical', implication_type: 'direct', round_number: 2, is_essential: true, linked_plot_beat_id: beat3.id, description: "Crystal fragments smelling strongly of bitter almonds (cyanide). Thaddeus was blackmailed into extracting this poison from peach kernels." },
        { mystery_id: mystery.id, title: "The Burnt Ledger Fragment", clue_type: 'physical', implication_type: 'direct', round_number: 3, is_essential: true, linked_plot_beat_id: beat4.id, description: "Charred paper scraps showing Barnaby's skimming of performer pensions and the payouts relating to Zephyr's past rigging accident." },
        { mystery_id: mystery.id, title: "The Broken Safe Lockbox", clue_type: 'physical', implication_type: 'red_herring', round_number: 1, is_essential: false, linked_plot_beat_id: beat3.id, description: "Barnaby's safe was pried open. Lucius Vane's signature lockpick was found bent nearby, but the money envelopes inside were left completely untouched." },
        { mystery_id: mystery.id, title: "A Torn Feather Boa Trim", clue_type: 'physical', implication_type: 'circumstantial', round_number: 3, is_essential: false, linked_plot_beat_id: beat2.id, description: "A fancy scrap of white feather trim caught on the lion cage lock, matching the glamorous boa Mimi Le Grand wore during her argument." }
      ]);
      if (clueErr) throw new Error(`Failed to insert clues: ${clueErr.message}`);

      // Subplot
      const { data: subplot, error: subErr } = await supabase.from('subplots').insert({
        mystery_id: mystery.id,
        title: "The Safe-Cracking Pact",
        description: "Jax and Lucius Vane conspired to crack Barnaby's desk safe during the midnight show to recover the fire juggling ticket ledger and Lucius's pawned escape handcuffs.",
        primary_character_id: jax.id,
        secondary_character_id: lucius.id,
        theme: "greed"
      }).select().single();
      if (subErr || !subplot) throw new Error(`Failed to insert subplot: ${subErr?.message}`);

      const { error: subBeatErr } = await supabase.from('subplot_beats').insert([
        { subplot_id: subplot.id, beat_number: 1, description: "Jax asks Lucius to pick the safe lock. Lucius agrees but gets cold feet when he hears footsteps near the pavilion.", linked_plot_beat_id: beat1.id },
        { subplot_id: subplot.id, beat_number: 2, description: "Lucius is caught near the desk safe. Jax covers for him, claiming Lucius was performing a magic prop inspection.", linked_plot_beat_id: beat3.id }
      ]);
      if (subBeatErr) throw new Error(`Failed to insert subplot beats: ${subBeatErr.message}`);

      console.log('✅ Seeded curated premium circus mystery successfully! All 12 characters, 18 relationships, 11 motives, 4 beats, 6 clues, 1 subplot.');

    } else {
      console.log('Orchestrating AI generation pipeline for dynamic mystery base with title/theme:', title, theme);
      
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured in the environment.');

      const genAI = new GoogleGenerativeAI(apiKey);
      const suspectCount = Math.max(3, targetCharCount - 1);
      const innocentCount = Math.max(1, targetCharCount - 3);
      const maxCharIndex = targetCharCount - 1;
      
      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          description: { type: SchemaType.STRING },
          characters: {
            type: SchemaType.ARRAY,
            description: `Exactly ${targetCharCount} unique characters. Exactly 1 victim, exactly 1 killer, exactly 1 accomplice, exactly ${innocentCount} suspects.`,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                name: { type: SchemaType.STRING },
                title: { type: SchemaType.STRING },
                prefix: { type: SchemaType.STRING, description: "Honorific (e.g. Captain, Madame, Doctor, Lady). Return empty string if not applicable." },
                gender: { type: SchemaType.STRING, enum: ['male', 'female', 'adaptable'], format: 'enum' },
                plot_role: { type: SchemaType.STRING, enum: ['victim', 'killer', 'assistant', 'innocent'], format: 'enum' },
                archetype: { type: SchemaType.STRING, enum: ['victim', 'villain', 'hero', 'witness', 'sidekick', 'investigator'], format: 'enum' },
                bio: { type: SchemaType.STRING },
                outfit_advice: { type: SchemaType.STRING },
                act_summary: { type: SchemaType.STRING },
                act_bullets: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                traits: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
              },
              required: ['name', 'title', 'prefix', 'gender', 'plot_role', 'archetype', 'bio', 'outfit_advice', 'act_summary', 'act_bullets', 'traits']
            }
          },
          relationships: {
            type: SchemaType.ARRAY,
            description: `A list of relationships between characters. The victim MUST connect to all other ${suspectCount} characters. Include 4-8 inter-suspect connections.`,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                char1_index: { type: SchemaType.INTEGER, description: `Index of the first character in the characters array (0 to ${maxCharIndex})` },
                char2_index: { type: SchemaType.INTEGER, description: `Index of the second character in the characters array (0 to ${maxCharIndex})` },
                dynamics: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
                notes: { type: SchemaType.STRING }
              },
              required: ['char1_index', 'char2_index', 'dynamics', 'notes']
            }
          },
          motives: {
            type: SchemaType.ARRAY,
            description: `Exactly ${suspectCount} motives (one for each suspect, linked to the victim).`,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                char_index: { type: SchemaType.INTEGER, description: `Index of the suspect in the characters array (0 to ${maxCharIndex}, cannot be the victim index)` },
                motive_type: { type: SchemaType.STRING, enum: ['revenge', 'greed', 'love', 'fear', 'justice', 'power'], format: 'enum' },
                strength: { type: SchemaType.STRING, enum: ['low', 'moderate', 'high', 'critical'], format: 'enum' },
                notes: { type: SchemaType.STRING }
              },
              required: ['char_index', 'motive_type', 'strength', 'notes']
            }
          },
          plot_beats: {
            type: SchemaType.ARRAY,
            description: "Exactly 4 chronological plot beats.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                beat_number: { type: SchemaType.INTEGER, description: "1 to 4" },
                event_title: { type: SchemaType.STRING },
                description: { type: SchemaType.STRING }
              },
              required: ['beat_number', 'event_title', 'description']
            }
          },
          clues: {
            type: SchemaType.ARRAY,
            description: "Exactly 6 clues linked to the plot beats.",
            items: {
              type: SchemaType.OBJECT,
              properties: {
                title: { type: SchemaType.STRING },
                clue_type: { type: SchemaType.STRING, enum: ['physical', 'testimony', 'background', 'secret'], format: 'enum' },
                implication_type: { type: SchemaType.STRING, enum: ['direct', 'circumstantial', 'red_herring'], format: 'enum' },
                round_number: { type: SchemaType.INTEGER, description: "Round of the game: 1, 2, or 3" },
                is_essential: { type: SchemaType.BOOLEAN },
                description: { type: SchemaType.STRING },
                beat_index: { type: SchemaType.INTEGER, description: "Index of the linked plot beat in the plot_beats array (0 to 3)" }
              },
              required: ['title', 'clue_type', 'implication_type', 'round_number', 'is_essential', 'description', 'beat_index']
            }
          },
          subplot: {
            type: SchemaType.OBJECT,
            description: "Exactly 1 secondary subplot arc involving 2 suspects.",
            properties: {
              title: { type: SchemaType.STRING },
              description: { type: SchemaType.STRING },
              primary_char_index: { type: SchemaType.INTEGER },
              secondary_char_index: { type: SchemaType.INTEGER },
              theme: { type: SchemaType.STRING },
              beats: {
                type: SchemaType.ARRAY,
                description: "Exactly 2 subplot beats.",
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    beat_number: { type: SchemaType.INTEGER },
                    description: { type: SchemaType.STRING },
                    linked_plot_beat_index: { type: SchemaType.INTEGER }
                  },
                  required: ['beat_number', 'description', 'linked_plot_beat_index']
                }
              }
            },
            required: ['title', 'description', 'primary_char_index', 'secondary_char_index', 'theme', 'beats']
          }
        },
        required: ['description', 'characters', 'relationships', 'motives', 'plot_beats', 'clues', 'subplot']
      };

      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        }
      });

      const promptText = `
        You are an expert murder mystery party game designer.
        The user wants to create a new murder mystery base for the ${pkgInfo.label} (${pkgInfo.rangeLabel}).
        Title: "${title}"
        Theme: "${theme}"

        Your job is to generate a fully complete, premium murder mystery base in a single JSON response matching the theme perfectly.

        CRITICAL CONSTRAINTS:
        1. **EXACTLY ${targetCharCount} CHARACTERS**: You must generate exactly ${targetCharCount} unique characters. No more, no less.
        2. **PLOT ROLES**: Assign exactly:
           - 1 Victim (plot_role: 'victim', is_victim: true, is_mandatory: true, archetype: 'victim')
           - 1 Killer (plot_role: 'killer', is_victim: false, is_mandatory: true, archetype: 'villain')
           - 1 Assistant/Accomplice (plot_role: 'assistant', is_victim: false, is_mandatory: true, archetype: 'sidekick' or 'villain')
           - ${innocentCount} Innocents (plot_role: 'innocent', is_victim: false, is_mandatory: a mix of true and false, archetypes like 'hero', 'witness', 'investigator')
        3. **VICTIM RELATIONSHIP**: The victim MUST have a direct relationship to EVERY SINGLE suspect (the other ${suspectCount} characters). No floaters!
        4. **INTER-SUSPECT RELATIONSHIPS**: Add at least 4 other interesting relationships between suspects to make a rich social web.
        5. **MOTIVES**: Every suspect (${suspectCount} characters, excluding the victim) MUST have exactly ONE primary motive targeting the victim. The motive strength for the Killer must be 'critical' or 'high'. The accomplice must have 'high' or 'moderate'. Innocents must have 'low' or 'moderate' (red herrings). Motive types MUST be strictly one of: 'revenge', 'greed', 'love', 'fear', 'justice', 'power'.
        6. **PLOT BEATS**: Generate exactly 4 chronological narrative beats covering:
           - Beat 1: The gathering and initial tensions before the murder.
           - Beat 2: The discovery of the murder.
           - Beat 3: Key evidence or alibi cracks.
           - Beat 4: The climax / twist and resolution.
        7. **CLUES**: Generate exactly 6 clue cards linked to the plot beats. Clue types must be strictly one of: 'physical', 'testimony', 'background', 'secret'. Implication types must be strictly one of: 'direct', 'circumstantial', 'red_herring'.
        8. **SUBPLOT**: Generate exactly 1 secondary subplot arc involving 2 suspects (indexes 0-${maxCharIndex}, must not be the victim). Include 2 subplot beats linked to the plot beats.
        9. **ADAPTABLE GENDERS**: At least 2 characters should have gender 'adaptable', and you must write their name and bio gender-neutrally.

        Ensure the theme and setting are fully integrated into all characters, names, outfits, and clues. Use realistic, engaging, and atmospheric details.
      `;

      const result = await model.generateContent(promptText);
      const generatedData = JSON.parse(result.response.text());

      await logAiUsage({
        model_name: 'gemini-2.5-flash',
        feature_name: 'generate_full_mystery',
        mystery_id: mystery.id,
        usageMetadata: result.response.usageMetadata as any,
      });

      // Insert dynamic overview description
      await supabase.from('mysteries').update({
        description: generatedData.description || `A compelling ${targetCharCount}-character murder mystery base centered around the theme of ${theme}.`
      }).eq('id', mystery.id);

      // Insert Characters
      const charIdMap: string[] = [];
      const victimIndex = generatedData.characters.findIndex((c: any) => c.plot_role === 'victim' || c.is_victim === true);
      const activeVictimIndex = victimIndex !== -1 ? victimIndex : 0;

      for (let i = 0; i < generatedData.characters.length; i++) {
        const char = generatedData.characters[i];
        const dbName = `${char.name}|${char.title}|${char.prefix || ''}`;
        const isVictim = i === activeVictimIndex;
        const finalPlotRole = isVictim ? 'victim' : (char.plot_role === 'victim' ? 'innocent' : char.plot_role);

        const isAdaptable = char.gender === 'adaptable';
        const profile_data: any = {
          bio: char.bio,
          traits: char.traits || []
        };

        if (isAdaptable) {
          profile_data.presentation_male = { outfit_advice: char.outfit_advice, act_summary: char.act_summary, act_bullets: char.act_bullets };
          profile_data.presentation_female = { outfit_advice: char.outfit_advice, act_summary: char.act_summary, act_bullets: char.act_bullets };
        } else {
          profile_data.outfit_advice = char.outfit_advice;
          profile_data.act_summary = char.act_summary;
          profile_data.act_bullets = char.act_bullets;
        }

        const { data: insertedChar, error: charErr } = await supabase
          .from('characters')
          .insert({
            mystery_id: mystery.id,
            name: dbName,
            archetype: isVictim ? 'victim' : char.archetype,
            plot_role: finalPlotRole,
            gender: char.gender,
            is_mandatory: isVictim ? true : char.is_mandatory,
            is_victim: isVictim,
            profile_data
          })
          .select()
          .single();

        if (charErr || !insertedChar) {
          console.error("Error inserting character:", charErr);
          throw new Error(charErr?.message || "Failed to insert character");
        }

        charIdMap.push(insertedChar.id);
      }

      // Insert Motives
      const victimId = charIdMap[activeVictimIndex];
      const motivesToInsert = generatedData.motives.map((mot: any) => {
        const suspectId = charIdMap[mot.char_index];
        return {
          mystery_id: mystery.id,
          character_id: suspectId,
          motive_type: mot.motive_type,
          strength: mot.strength,
          linked_character_id: victimId,
          notes: mot.notes
        };
      }).filter((m: any) => m.character_id !== victimId);

      const { error: motErr } = await supabase.from('motives').insert(motivesToInsert);
      if (motErr) {
        console.error("Error inserting motives:", motErr);
        throw new Error(motErr.message);
      }

      // Insert Relationships alphabetically sorted
      const relsToInsert = generatedData.relationships.map((rel: any) => {
        const id1 = charIdMap[rel.char1_index];
        const id2 = charIdMap[rel.char2_index];
        if (id1 === id2 || !id1 || !id2) return null;
        
        const [a, b] = [id1, id2].sort();
        return {
          mystery_id: mystery.id,
          character_a_id: a,
          character_b_id: b,
          know_each_other: true,
          dynamics: rel.dynamics,
          notes: rel.notes
        };
      }).filter(Boolean);

      const { error: relErr } = await supabase.from('relationships').insert(relsToInsert);
      if (relErr) {
        console.error("Error inserting relationships:", relErr);
        throw new Error(relErr.message);
      }

      // Insert Plot Beats
      const beatIdMap: string[] = [];
      for (let i = 0; i < generatedData.plot_beats.length; i++) {
        const beat = generatedData.plot_beats[i];
        const { data: insertedBeat, error: beatErr } = await supabase
          .from('plot_beats')
          .insert({
            mystery_id: mystery.id,
            beat_number: beat.beat_number,
            sort_order: beat.beat_number,
            event_title: beat.event_title,
            description: beat.description,
            is_required: true,
            beat_type: i === 3 ? 'twist' : 'discovery',
            timeline_phase: i === 0 ? 'pre_crime' : (i === 1 ? 'crime' : 'investigation'),
            characters_involved: []
          })
          .select()
          .single();

        if (beatErr || !insertedBeat) {
          console.error("Error inserting beat:", beatErr);
          throw new Error(beatErr?.message || "Failed to insert plot beat");
        }
        beatIdMap.push(insertedBeat.id);
      }

      // Insert Clues
      const cluesToInsert = generatedData.clues.map((clue: any) => {
        return {
          mystery_id: mystery.id,
          title: clue.title,
          clue_type: clue.clue_type,
          implication_type: clue.implication_type,
          round_number: clue.round_number,
          is_essential: clue.is_essential,
          description: clue.description,
          linked_plot_beat_id: beatIdMap[clue.beat_index] || beatIdMap[0]
        };
      });

      const { error: clueErr } = await supabase.from('clues').insert(cluesToInsert);
      if (clueErr) {
        console.error("Error inserting clues:", clueErr);
        throw new Error(clueErr.message);
      }

      // Insert Subplot
      const sp = generatedData.subplot;
      const primarySubChar = charIdMap[sp.primary_char_index];
      const secondarySubChar = charIdMap[sp.secondary_char_index];
      
      if (primarySubChar && secondarySubChar && primarySubChar !== secondarySubChar) {
        const { data: insertedSubplot, error: subErr } = await supabase
          .from('subplots')
          .insert({
            mystery_id: mystery.id,
            title: sp.title,
            description: sp.description,
            primary_character_id: primarySubChar,
            secondary_character_id: secondarySubChar,
            theme: sp.theme
          })
          .select()
          .single();

        if (subErr || !insertedSubplot) {
          console.error("Error inserting subplot:", subErr);
        } else {
          const subplotBeatsToInsert = sp.beats.map((beat: any) => {
            return {
              subplot_id: insertedSubplot.id,
              beat_number: beat.beat_number,
              description: beat.description,
              linked_plot_beat_id: beatIdMap[beat.linked_plot_beat_index] || beatIdMap[0]
            };
          });

          const { error: subBeatsErr } = await supabase.from('subplot_beats').insert(subplotBeatsToInsert);
          if (subBeatsErr) {
            console.error("Error inserting subplot beats:", subBeatsErr);
          }
        }
      }

      console.log('✅ AI dynamic generation completed successfully!');
    }
  }  // end scope block

  revalidatePath(`/${locale}/admin/mysteries`);
  revalidatePath(`/${locale}/builder/mysteries`);

  if (isAdmin) {
    redirect(`/${locale}/admin/mysteries`);
  } else {
    redirect(`/${locale}/builder/mysteries/${mystery.id}`);
  }
}


export async function updateMysteryAction(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;
  const description = formData.get('description') as string;
  const min_players = parseInt(formData.get('min_players') as string) || 4;
  const max_players = parseInt(formData.get('max_players') as string) || 6;
  const complexity = formData.get('complexity') as any;
  const spice_level = formData.get('spice_level') as any;
  const status = formData.get('status') as any;

  const pkgInfo = getPackageInfoForMaxPlayers(max_players);

  // Enforce package character requirement before allowing status = 'published'
  if (status === 'published') {
    const { count: charCount } = await supabase
      .from('characters')
      .select('id', { count: 'exact', head: true })
      .eq('mystery_id', id);

    const actualChars = charCount ?? 0;
    if (actualChars < pkgInfo.requiredCharacters) {
      return {
        error: `Cannot publish this ${pkgInfo.label} (${pkgInfo.rangeLabel}) mystery: it requires ${pkgInfo.requiredCharacters} characters, but currently has ${actualChars}. Please add ${pkgInfo.requiredCharacters - actualChars} more character(s) in the Characters tab before publishing.`,
      };
    }
  }

  const { error } = await supabase
    .from('mysteries')
    .update({
      title,
      theme,
      description,
      min_players,
      max_players: pkgInfo.requiredCharacters,
      complexity,
      spice_level,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating mystery:', error);
    return { error: error.message };
  }

  revalidatePath(`/builder/mysteries/${id}`);
  revalidatePath(`/builder/mysteries/${id}/core`);
  revalidatePath(`/builder/mysteries/${id}/characters`);
  revalidatePath(`/builder/mysteries/${id}/status`);
  revalidatePath('/', 'layout');
  
  return { success: true };
}

export async function generateDescriptionAction(mysteryId: string) {
  try {
    const [mystery, characters, plotBeats] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId),
      getPlotBeatsByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    const victim = characters.find((c: any) => c.is_victim);
    const killer = characters.find((c: any) => c.plot_role === 'killer');

    if (!victim || !killer) {
      throw new Error('You must assign a Victim and a Killer in the Characters tab before generating a synopsis.');
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    const prompt = `
      Write a gripping, suspenseful 3-4 sentence murder mystery synopsis (like the back of a novel or a game box).
      Theme: ${mystery.theme || 'General Mystery'}
      Title: ${mystery.title}

      Requirements:
      1. Explicitly name the victim: ${victim.name} (${victim.archetype || 'Victim'}).
      2. Explicitly name the murderer/killer: ${killer.name} (${killer.archetype || 'Killer'}).
      3. Set the scene and explain that someone has been murdered, and mention the killer by name as the true culprit in a dramatic way.
      4. Incorporate the following plot beats into the narrative flow:
      ${plotBeats.map((b, i) => `${i + 1}. ${b.description}`).join('\n')}
      
      Do not output any JSON or formatting, just plain text paragraphs. Make it punchy and dramatic.
    `;

    const result = await model.generateContent(prompt);
    const synopsis = result.response.text().trim();

    await logAiUsage({
      model_name: 'gemini-2.5-pro',
      feature_name: 'generate_mystery_synopsis',
      mystery_id: mysteryId,
      usageMetadata: result.response.usageMetadata as any,
    });

    const supabase = await createClient();
    const { error } = await supabase
      .from('mysteries')
      .update({ description: synopsis, updated_at: new Date().toISOString() })
      .eq('id', mysteryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}`);
  } catch (error) {
    console.error('generateDescriptionAction error:', error);
    throw error;
  }
}

export async function generateMysteryCoverAction(mysteryId: string) {
  try {
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const characterNames = characters.map((c: any) => c.name).join(', ');
    const theme = mystery.theme || 'Cinematic Noir Mystery';
    const description = mystery.description || 'A dramatic murder mystery.';
    
    // We use a highly descriptive prompt to ensure the output matches the "Cinematic Noir" style.
    // Explicitly ask for diversity and younger adults (20-40) based on user preference.
    const prompt = `A highly cinematic, gritty noir photograph. 5 characters standing together at the scene of the crime. Wide angle shot, full body or medium-full framing, leave plenty of headroom above the characters so no heads are cropped out. Theme: ${theme}. Context: ${description}. Characters: ${characterNames}. The characters are young adults (ages 20 to 40) and feature a highly diverse mix of ethnicities (e.g., Black, Asian, Hispanic, White). Dramatic low-key lighting, deep shadows, sepia or desaturated tones, mystery, suspense. Professional photography, sharp focus, 8k resolution.`;

    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex');
    const supabase = await createClient();

    // Check cache first safely
    let dataUri = '';
    let cached = null;
    try {
      const { data } = await supabase
        .from('image_generation_cache')
        .select('image_url')
        .eq('prompt_hash', promptHash)
        .single();
      cached = data;
    } catch (cacheErr) {
      console.warn('Cache lookup skipped/failed:', cacheErr);
    }

    if (cached?.image_url) {
      dataUri = cached.image_url;
    } else {

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] }
      };

      let res;
      let isRateLimited = false;
      let retries = 0;
      while (retries < 3) {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (res.status === 429 || res.status === 403) {
          isRateLimited = true;
          retries++;
          await new Promise(r => setTimeout(r, 2000 * retries)); // Exponential backoff
          continue;
        }
        break;
      }

      let base64Image = '';
      let coverUsageMetadata: any = null;

      if (res && res.ok) {
        const data = await res.json();
        coverUsageMetadata = data.usageMetadata || null;
        const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
        base64Image = imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
      } else if (res) {
        const errorText = await res.text();
        console.error('Imagen API generation failed:', errorText);
        throw new Error(`Imagen API error (${res.status}): ${errorText}`);
      } else {
        throw new Error('No response from Imagen API.');
      }


      if (base64Image) {
        dataUri = `data:image/jpeg;base64,${base64Image}`;

        await logAiUsage({
          model_name: 'gemini-2.5-flash-image',
          feature_name: 'generate_mystery_cover',
          mystery_id: mysteryId,
          usageMetadata: coverUsageMetadata,
        });
        
        // Save to cache safely
        try {
          await supabase.from('image_generation_cache').insert({
            prompt_hash: promptHash,
            image_url: dataUri
          });
          console.log('Saved cover to cache');
        } catch (cacheInsertErr) {
          console.warn('Failed to insert into cache:', cacheInsertErr);
        }
      } else {
        console.warn('Image generation failed or quota exceeded, using fallback placeholder');
        dataUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(theme)}&background=random&size=1024`;
      }
    }

    const { parseMysteryImageField, serializeMysteryImageField } = await import('@/utils/moodboard');
    const existingParsed = parseMysteryImageField(mystery.image_url);
    const serializedImageUrl = serializeMysteryImageField(dataUri, existingParsed.moodboardPhotos);

    const { error } = await supabase
      .from('mysteries')
      .update({ image_url: serializedImageUrl, updated_at: new Date().toISOString() })
      .eq('id', mysteryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}`);
    return { success: true };
  } catch (error: any) {
    console.error('generateMysteryCoverAction error:', error);
    return { error: error.message };
  }
}
