'use server';

import { revalidatePath } from 'next/cache';
import { createSubplot, updateSubplot, deleteSubplot, updateSubplotBeat, createSubplotBeat } from '@/services/subplots';

export async function addSubplotAction(mysteryId: string, formData: FormData) {
  const title = formData.get('title') as string;
  const primaryCharacterId = formData.get('primary_character_id') as string;
  const secondaryCharacterId = formData.get('secondary_character_id') as string;
  const theme = formData.get('theme') as string;

  await createSubplot(mysteryId, title, primaryCharacterId, secondaryCharacterId, theme);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateSubplotAction(mysteryId: string, id: string, updates: any) {
  await updateSubplot(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function removeSubplotAction(mysteryId: string, id: string) {
  await deleteSubplot(id);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateBeatAction(mysteryId: string, beatId: string, updates: any) {
  await updateSubplotBeat(beatId, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function addSubplotBeatAction(mysteryId: string, subplotId: string, beatNumber: number) {
  await createSubplotBeat(subplotId, beatNumber);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

import { getMysteryById } from '@/services/mysteries';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';

export async function generateSubplotAction(mysteryId: string, characterId: string) {
  try {
    const supabase = await createClient();
    const mystery = await getMysteryById(mysteryId);
    if (!mystery) throw new Error('Mystery not found');

    const character = mystery.characters.find((c: any) => c.id === characterId);
    if (!character) throw new Error('Character not found');

    // Fetch existing subplots to see who is already entangled
    const existingSubplots = mystery.subplots || [];
    
    // Find eligible partners (mandatory, not victim/killer, not already in a subplot)
    const eligiblePartners = mystery.characters.filter((c: any) => 
      c.id !== characterId && 
      c.is_mandatory && 
      !c.is_victim && 
      c.plot_role !== 'killer' &&
      !existingSubplots.some((sp: any) => sp.primary_character_id === c.id || sp.secondary_character_id === c.id)
    );

    const eligiblePartnerNames = eligiblePartners.map((c: any) => c.name.split('|')[0].trim());

    // Retrieve motives
    const characterMotives = character.motives?.map((m: any) => m.notes || m.motive_type).join(', ') || 'General suspicion';

    // Format the main timeline beats so the AI knows the story progression
    const mainBeats = (mystery.plot_beats || []).sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((b: any) => `Beat ${b.beat_number}: ${b.event_title} - ${b.description}`)
      .join('\n');

    let spiceLevelRule = "";
    switch(mystery.spice_level) {
      case 'clean':
        spiceLevelRule = "SPICE LEVEL: Clean (PG). Tone is wholesome and family-friendly. Motives MUST be non-romantic. NO drugs, NO alcohol.";
        break;
      case 'mild':
        spiceLevelRule = "SPICE LEVEL: Mild (MA 15+). Tone is passionate. Mentions of drugs/alcohol are fine. Light sexual references okay, nothing graphic.";
        break;
      case 'spicy':
        spiceLevelRule = "SPICE LEVEL: Spicy (R 18+). Tone is intense passion, scandalous. Heavy use of drugs/alcohol. Explicit adult themes.";
        break;
      case 'filthy':
        spiceLevelRule = "SPICE LEVEL: Filthy (NC-17). Tone is completely over-the-top, unhinged, wild. Take it as far as safety filters allow. Wildly dramatic and OTT.";
        break;
      default:
        spiceLevelRule = "SPICE LEVEL: Clean (PG). Keep it wholesome.";
    }

    let assistantRule = "";
    if (character.plot_role === 'assistant') {
      assistantRule = "CRITICAL RULE: This character is the ASSISTANT/ACCOMPLICE to the murder. Their subplot MUST explicitly mention their involvement in the main murder plot, how they are helping the killer, or their role in the twist.";
    }

    let entangleRule = "";
    if (character.is_mandatory && eligiblePartnerNames.length > 0) {
      entangleRule = `CRITICAL RULE: Because this character is mandatory, you should strongly consider entwining their subplot with one of the following mandatory characters to share a red herring or alibi: [${eligiblePartnerNames.join(', ')}]. For example, they were secretly making out during the murder, or they are being blackmailed by the same person. If you choose to entangle them, return their exact name in the 'entangled_character_name' field.`;
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        title: { type: SchemaType.STRING },
        theme: { type: SchemaType.STRING },
        entangled_character_name: { 
          type: SchemaType.STRING, 
          description: "The name of the entangled character, or an empty string if none.",
          nullable: true 
        },
        beats: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              description: { type: SchemaType.STRING }
            },
            required: ['description']
          }
        }
      },
      required: ['title', 'theme', 'beats']
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const prompt = `
      You are an expert murder mystery party game designer.
      Generate a secondary subplot arc for a specific character. This subplot should add depth, secondary objectives, or red herrings without overshadowing the main murder.
      
      MYSTERY: ${mystery.theme || 'General'}
      SYNOPSIS: ${mystery.description || 'N/A'}
      
      MAIN TIMELINE BEATS:
      ${mainBeats}
      
      CHARACTER TO WRITE SUBPLOT FOR:
      Name: ${character.name}
      Archetype: ${character.archetype}
      Role in main plot: ${character.plot_role}
      Known Motives/Secrets: ${characterMotives}
      Is Mandatory: ${character.is_mandatory}
      
      RULES:
      1. ${spiceLevelRule}
      2. ${assistantRule}
      3. ${entangleRule}
      4. Create a short, punchy "title" (e.g., "The Secret Blackmail File") and a 1-2 word "theme" (e.g., "Blackmail").
      5. Create exactly 3 timeline beats for this subplot. These beats should slowly unravel or escalate alongside the main story beats.
    `;

    const result = await model.generateContent(prompt);
    let text = result.response.text();
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(text);

    if (!parsed.beats || parsed.beats.length !== 3) {
       throw new Error('AI did not generate exactly 3 beats');
    }

    let secondaryCharacterId = null;
    if (parsed.entangled_character_name) {
      const match = eligiblePartners.find((c: any) => c.name.toLowerCase().includes(parsed.entangled_character_name.toLowerCase()));
      if (match) {
        secondaryCharacterId = match.id;
      }
    }

    // 1. Create the subplot
    const { data: subplotData, error: subplotError } = await supabase.from('subplots').insert({
      mystery_id: mysteryId,
      primary_character_id: characterId,
      secondary_character_id: secondaryCharacterId,
      title: parsed.title,
      theme: parsed.theme,
    }).select().single();

    if (subplotError || !subplotData) throw new Error(subplotError?.message || 'Failed to create subplot');

    // 2. Create the beats
    const beatsToInsert = parsed.beats.map((b: any, idx: number) => ({
      subplot_id: subplotData.id,
      beat_number: idx + 1,
      description: b.description,
    }));

    const { error: beatsError } = await supabase.from('subplot_beats').insert(beatsToInsert);
    if (beatsError) throw new Error(beatsError.message);

    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
    return { success: true };
  } catch (error: any) {
    console.error('generateSubplotAction error:', error);
    return { success: false, error: error.message };
  }
}
