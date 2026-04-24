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

export async function generatePlotAIAction(mysteryId: string, currentCount: number, userIdeas: string = "") {
  try {
    const supabase = await createClient();
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    let targetBeats = 4;
    let complexityRule = "Make it a simple 4-beat story. Straightforward mystery.";
    if (mystery.complexity === 'medium') {
      targetBeats = 6;
      complexityRule = "Make it a 6-beat story. Include an accomplice and a small twist.";
    } else if (mystery.complexity === 'hard') {
      targetBeats = 8;
      complexityRule = "Make it an 8-beat story. Include a big twist, or two twists and an accomplice.";
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing from environment variables.');

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
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const charactersInfo = characters.map((c: any) => `${c.name.split('|')[0]} (${c.plot_role || 'unknown'})`).join(', ');

    const prompt = `
      You are an expert murder mystery party game designer mapping out the plot for:
      Theme: ${mystery.theme || 'General Mystery'}
      Description: ${mystery.description || 'N/A'}
      
      Characters available: ${charactersInfo || 'None yet'}
      
      User Ideas / Directives: ${userIdeas || 'None provided'}
      
      RULES:
      1. ${complexityRule}
      2. Generate exactly ${targetBeats} plot beats.
      3. Use appropriate beat_types (discovery, confrontation, clue_reveal, twist, conclusion) and timeline_phases (pre_crime, crime, investigation, resolution).
      4. Ensure the story makes logical sense from setup to reveal.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    const beatsToInsert = parsed.map((beat: any, i: number) => ({
      mystery_id: mysteryId,
      beat_number: currentCount + i + 1,
      sort_order: currentCount + i + 1,
      event_title: beat.event_title || 'New Story Beat',
      description: beat.description || '',
      beat_type: beat.beat_type || 'discovery',
      timeline_phase: beat.timeline_phase || 'investigation',
      intensity_level: beat.intensity_level || 5,
      characters_involved: [],
      is_required: true,
    }));

    return beatsToInsert;
    
  } catch (error) {
    console.error('Action Error: generatePlotAIAction', error);
    throw error;
  }
}

export async function savePlotBeatsBulkAction(mysteryId: string, beats: any[]) {
  const supabase = await createClient();
  const { error } = await supabase.from('plot_beats').insert(beats);
  
  if (error) throw new Error(`Error saving plot beats: ${error.message}`);
  
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}
