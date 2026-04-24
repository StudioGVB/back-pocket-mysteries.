'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createPlotBeat, updatePlotBeat, deletePlotBeat, getMysteryById, getCharactersByMysteryId } from '@/services/mysteries';
import { TimelinePhase, BeatType } from '@/types/database';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

export async function addBeatAction(mysteryId: string, currentCount: number) {
  await createPlotBeat({
    mystery_id: mysteryId,
    event_title: 'New Story Beat',
    beat_number: currentCount + 1,
    sort_order: currentCount + 1,
    timeline_phase: 'investigation',
    beat_type: 'discovery',
    is_required: true,
  });

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateBeatAction(mysteryId: string, id: string, updates: any) {
  await updatePlotBeat(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function removeBeatAction(mysteryId: string, id: string) {
  await deletePlotBeat(id);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function reorderBeatsAction(mysteryId: string, beats: { id: string, sort_order: number }[]) {
  const supabase = await createClient();
  
  // Perform multiple updates (could be optimized with a single RPC if needed frequently)
  for (const beat of beats) {
    await supabase
      .from('plot_beats')
      .update({ sort_order: beat.sort_order })
      .eq('id', beat.id);
  }

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function generateNarrativePlotAction(mysteryId: string, userIdeas: string = "") {
  try {
    const supabase = await createClient();
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    let targetBeats = 4;
    let complexityRule = "COMPLEXITY: Easy (4 story beats). Keep the murder mechanics simple and straightforward. Do not overcomplicate it.";
    if (mystery.complexity === 'medium') {
      targetBeats = 6;
      complexityRule = "COMPLEXITY: Medium (6 story beats). You MUST include a distinct plot twist. For example: an accomplice betrayal, a red herring that goes wrong, or the victim not being the intended target.";
    } else if (mystery.complexity === 'hard') {
      targetBeats = 8;
      complexityRule = "COMPLEXITY: Hard (8 story beats). You MUST include a massive plot twist, multiple accomplices, or a completely unexpected hidden motive that flips the entire story upside down.";
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // Format rich character data to prevent hallucinations
    const charactersInfo = characters.map((c: any) => {
      let info = `- ${c.name}`;
      if (c.archetype) info += ` | Archetype: ${c.archetype}`;
      if (c.plot_role) info += ` | Role: ${c.plot_role}`;
      if (c.motives && c.motives.length > 0) {
        info += ` | Motive: ${c.motives[0].notes || c.motives[0].motive_type}`;
      }
      return info;
    }).join('\n');

    const prompt = `
      You are an expert murder mystery author.
      Theme: ${mystery.theme || 'General Mystery'}
      Synopsis/Context: ${mystery.description || 'N/A'}
      
      CHARACTERS:
      ${charactersInfo || 'None yet'}
      
      USER IDEAS / DIRECTIVES:
      ${userIdeas || 'None provided'}
      
      RULES:
      1. ${complexityRule}
      2. Write a highly concise, punchy "The Murder Explained" paragraph.
      3. You MUST include the Victim, the Killer, and the Assistant/Accomplice (if one is assigned). DO NOT reference the other innocent characters unless absolutely necessary for the murder mechanics.
      4. DO NOT write about the investigation or setup. ONLY explain the exact mechanism of the murder, the core motive, and the twist in 1-2 paragraphs.
      5. Strictly adhere to the character definitions provided. If a character is marked as "Role: assistant", they MUST be directly involved in the twist or the murder mechanics.
      6. TWIST GUIDELINES: Make sure the twist fundamentally changes the nature of the crime. Do not use weak twists like "the accomplice swapped the killer's poison for a different poison." Good twists include: "the victim was actually trying to kill someone else and it backfired," "the victim wasn't the intended target," "the killer chickened out, but the victim was killed by someone else simultaneously," or "the killer's trap was triggered accidentally by the victim."
      
      EXAMPLE FORMAT:
      The Murder Explained
      Gabby was poisoned during the champagne toast — but she wasn’t the original target. Dane discovered Gabby had been secretly hooking up with Colt. Consumed by jealousy and rage, he decided to kill Colt by spiking a drink. Milo, obsessively in love with Gabby, found out about Dane’s plan through stalking. After being rejected by Gabby one final time, Milo deliberately switched the glasses — letting her drink the poison instead. Gabby dies.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Action Error: generateNarrativePlotAction', error);
    throw error;
  }
}

export async function generateBeatsFromNarrativeAction(mysteryId: string, currentCount: number, narrative: string) {
  try {
    const supabase = await createClient();
    const mystery = await getMysteryById(mysteryId);
    if (!mystery) throw new Error('Mystery not found');

    let targetBeats = 4;
    if (mystery.complexity === 'medium') targetBeats = 6;
    else if (mystery.complexity === 'hard') targetBeats = 8;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const responseSchema: Schema = {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          event_title: { type: SchemaType.STRING },
          description: { type: SchemaType.STRING },
          beat_type: { 
            type: SchemaType.STRING, 
            enum: ['discovery', 'confrontation', 'clue_reveal', 'twist', 'conclusion'],
            format: 'enum'
          },
          timeline_phase: {
            type: SchemaType.STRING,
            enum: ['pre_crime', 'crime', 'investigation', 'resolution'],
            format: 'enum'
          },
          intensity_level: { type: SchemaType.INTEGER }
        },
        required: ['event_title', 'description', 'beat_type', 'timeline_phase', 'intensity_level']
      }
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const prompt = `
      You are an expert murder mystery party game designer. 
      Convert the following narrative plot into exactly ${targetBeats} discrete chronological timeline beats for the game flow.

      NARRATIVE PLOT:
      ${narrative}

      RULES:
      1. Generate exactly ${targetBeats} plot beats.
      2. PACE THE STORY SLOWLY. Dedicate the majority of the beats (at least the first 60-70%) to the "pre_crime" phase—the shifting motives, secret discoveries, stalkings, and setup BEFORE the murder weapon is even introduced. Do not rush to the murder in Beat 1 or 2.
      3. The final few beats should cover the execution of the crime itself and the twist.
      4. Use appropriate beat_types and timeline_phases (mostly pre_crime and crime). Since these beats represent the hidden backstory the guests will uncover, you likely won't need 'investigation' or 'resolution'.
      5. The beats MUST strictly follow the events described in the Narrative Plot. Do not invent new story elements that contradict it.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    const validBeatTypes = ['discovery', 'confrontation', 'clue_reveal', 'twist', 'conclusion'];
    const validPhases = ['pre_crime', 'crime', 'investigation', 'resolution'];

    const beatsToInsert = parsed.map((beat: any, i: number) => {
      let bType = (beat.beat_type || 'discovery').toLowerCase();
      if (!validBeatTypes.includes(bType)) bType = 'discovery';

      let tPhase = (beat.timeline_phase || 'investigation').toLowerCase();
      if (!validPhases.includes(tPhase)) tPhase = 'investigation';

      return {
        mystery_id: mysteryId,
        beat_number: currentCount + i + 1,
        sort_order: currentCount + i + 1,
        event_title: beat.event_title || 'New Story Beat',
        description: beat.description || '',
        beat_type: bType,
        timeline_phase: tPhase,
        intensity_level: Number(beat.intensity_level) || 5,
        characters_involved: [],
        is_required: true,
      };
    });

    return beatsToInsert;
  } catch (error) {
    console.error('Action Error: generateBeatsFromNarrativeAction', error);
    throw error;
  }
}

export async function savePlotBeatsBulkAction(mysteryId: string, beats: any[]) {
  try {
    const supabase = await createClient();
    
    // Clear any existing beats for this mystery to allow clean regeneration
    const { error: delError } = await supabase.from('plot_beats').delete().eq('mystery_id', mysteryId);
    if (delError) {
      return { success: false, error: `Delete failed: ${delError.message}` };
    }

    const { error } = await supabase.from('plot_beats').insert(beats);
    
    if (error) {
      return { success: false, error: `Insert failed: ${error.message}` };
    }
    
    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Exception: ${err.message}` };
  }
}
