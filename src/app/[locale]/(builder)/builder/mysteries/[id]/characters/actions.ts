'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createCharacter, updateCharacter, deleteCharacter } from '@/services/mysteries';

export async function addCharacterAction(mysteryId: string, formData: FormData) {
  const base_name = formData.get('base_name') as string;
  const title = formData.get('title') as string;
  const prefix = formData.get('prefix') as string;
  const name = `${base_name || ''}|${title || ''}|${prefix || ''}`;
  
  const rawArchetype = formData.get('archetype');
  const archetype = (rawArchetype ? rawArchetype : null) as any;
  
  const rawPlotRole = formData.get('plot_role');
  const plot_role = (rawPlotRole ? rawPlotRole : null) as any;
  const gender = formData.get('gender') as any || 'adaptable';
  
  const is_mandatory = formData.get('importance') === 'mandatory';
  const is_victim = plot_role === 'victim';

  await createCharacter({
    mystery_id: mysteryId,
    name,
    archetype,
    plot_role,
    gender,
    is_mandatory: is_mandatory || is_victim, // Victims are always mandatory in this system
    is_victim
  });

    // Clear cache for the entire mystery studio
    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function updateCharacterAction(mysteryId: string, id: string, updates: any) {
  await updateCharacter(id, updates);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function removeCharacterAction(mysteryId: string, id: string) {
  await deleteCharacter(id);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function toggleVictimAction(mysteryId: string, id: string, isVictim: boolean) {
  await updateCharacter(id, { is_victim: isVictim });
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function addMotiveAction(mysteryId: string, characterId: string, formData: FormData) {
  const supabase = await createClient();
  const motive_type = formData.get('motive_type') as any;
  const linked_character_id = formData.get('linked_character_id') as string;
  const strength = formData.get('strength') as any;
  const notes = formData.get('notes') as string;

  const { error } = await (supabase
    .from('motives')
    .insert({
      mystery_id: mysteryId,
      character_id: characterId,
      motive_type,
      linked_character_id,
      strength,
      notes
    }) as any);

  if (error) throw new Error(error.message);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function removeMotiveAction(mysteryId: string, motiveId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('motives')
    .delete()
    .eq('id', motiveId);

  if (error) throw new Error(error.message);
  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';

export async function generateAICharacterAction(mysteryId: string) {
  try {
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing from environment variables.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        name: { type: SchemaType.STRING },
        title: { type: SchemaType.STRING },
        prefix: { type: SchemaType.STRING },
        plot_role: { 
          type: SchemaType.STRING, 
          enum: ['killer', 'assistant', 'innocent', 'victim'],
          format: 'enum'
        },
        gender: {
          type: SchemaType.STRING,
          enum: ['male', 'female', 'adaptable'],
          format: 'enum'
        },
        is_mandatory: { type: SchemaType.BOOLEAN }
      },
      required: ['name', 'title', 'prefix', 'plot_role', 'gender', 'is_mandatory']
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const existingNames = characters.map((c: any) => c.name.split('|')[0]).join(', ');
    const hasVictim = characters.some((c: any) => c.is_victim);
    const hasKiller = characters.some((c: any) => c.plot_role === 'killer');

    const prompt = `
      You are generating a new character for a murder mystery party game.
      Theme: ${mystery?.theme || 'General Mystery'}
      
      Existing Characters: ${existingNames || 'None yet'}
      
      RULES:
      1. Invent a unique name. CRITICAL: Analyze the 'Existing Characters' list. If the existing names are normal/modern (e.g. "Matt", "Gabby", "Luke"), generate a normal modern name (e.g. "Sarah", "David"). Match the tone perfectly! Do not reuse existing names.
      2. Invent a highly thematic 'title' or occupation based on the theme. For example, if the theme is "Yacht", you might generate "Chief Stew", "Primary Guest", "Chef", "Cheeky Friend", etc.
      3. Invent a 'prefix' that would appear before the guest's name if applicable (e.g. "Captain", "Doctor", "Mr.", "Mrs.", "Sir", "Lady", etc.). If none makes sense, leave it as an empty string.
      4. Assign a plot_role:
         - If there is no victim yet (${!hasVictim}), you MUST make them the 'victim'.
         - If there is a victim but no killer (${hasVictim && !hasKiller}), you MUST make them the 'killer'.
         - Otherwise, pick 'innocent' or 'assistant'.
      5. If they are the victim or killer, they MUST be mandatory (is_mandatory: true).
      6. Assign a gender ('male', 'female', or 'adaptable'). If 'adaptable', MUST generate a unisex name (e.g., Alex, Riley) and a gender-neutral title.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    return parsed;
    
  } catch (error) {
    console.error('Action Error: generateAICharacterAction', error);
    throw error;
  }
}

export async function generateRoleSuggestionsAction(mysteryId: string): Promise<string[]> {
  try {
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const responseSchema: Schema = {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "List of 5 unique character roles/titles."
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const existingTitles = characters
      .map((c: any) => c.name.includes('|') ? c.name.split('|')[1] : null)
      .filter(Boolean)
      .join(', ');

    const prompt = `
      You are an expert murder mystery party game designer. 
      The theme of the mystery is: ${mystery?.theme || 'General Mystery'}.
      
      Suggest exactly 5 unique, highly thematic character roles or titles for guests to play.
      (e.g., if the theme is "Yacht", roles might be "Chief Stew", "Primary Charter Guest", "Deckhand", etc.)
      
      CRITICAL RULE: DO NOT suggest any of these roles as they are already taken: ${existingTitles || 'None yet'}.
      
      Return a JSON array of exactly 5 strings. Each string should be the role/title.
    `;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    
    return parsed as string[];
  } catch (error) {
    console.error('Error generating role suggestions', error);
    return [];
  }
}

export async function generateCharacterProfileAIAction(mysteryId: string, character: any, mystery: any) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    
    const isAdaptable = character.gender === 'adaptable';

    const presentationSchema = {
      type: SchemaType.OBJECT,
      properties: {
        outfit_advice: {
          type: SchemaType.STRING,
          description: "Specific clothing suggestions matching the theme and their vibe."
        },
        act_summary: {
          type: SchemaType.STRING,
          description: "A short, 2-3 sentence summary of how they should act and behave in the room."
        },
        act_bullets: {
          type: SchemaType.ARRAY,
          items: { type: SchemaType.STRING },
          description: "3-5 specific, punchy bullet points on their demeanor (e.g. 'Speak slowly and deliberately', 'Never raise your voice')."
        }
      },
      required: ["outfit_advice", "act_summary", "act_bullets"]
    };

    const responseSchema = isAdaptable ? {
      type: SchemaType.OBJECT,
      properties: {
        bio: {
          type: SchemaType.STRING,
          description: "A compelling backstory and personality description (1-2 paragraphs)."
        },
        presentation_male: {
          ...presentationSchema,
          description: "Outfit and acting advice specifically tailored for a masculine/male guest playing the role."
        },
        presentation_female: {
          ...presentationSchema,
          description: "Outfit and acting advice specifically tailored for a feminine/female guest playing the role."
        }
      },
      required: ["bio", "presentation_male", "presentation_female"],
    } : {
      type: SchemaType.OBJECT,
      properties: {
        bio: {
          type: SchemaType.STRING,
          description: "A compelling backstory and personality description (1-2 paragraphs)."
        },
        outfit_advice: presentationSchema.properties.outfit_advice,
        act_summary: presentationSchema.properties.act_summary,
        act_bullets: presentationSchema.properties.act_bullets,
      },
      required: ["bio", "outfit_advice", "act_summary", "act_bullets"],
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema as any,
      }
    });

    const characterName = character.name.split('|')[0] || character.name;
    const characterRole = character.name.includes('|') ? character.name.split('|')[1] : 'Guest';
    const roleStatus = character.is_victim ? 'The Victim' : (character.plot_role === 'killer' ? 'The Killer' : 'A Guest');
    const genderInstructions = isAdaptable 
      ? "CRITICAL: This character is 'adaptable' (gender-neutral). You MUST use They/Them pronouns. Keep the bio completely gender-neutral. Provide TWO SETS of advice: one tailored for a male guest playing the role (presentation_male), and one for a female guest playing the role (presentation_female)."
      : `CRITICAL: This character's gender is '${character.gender}'. Use appropriate pronouns and provide outfit/acting advice tailored to this gender.`;

    const prompt = `
      You are an expert murder mystery party game designer writing a character dossier.
      
      Mystery Theme: ${mystery?.theme || 'General Mystery'}
      Character Name: ${characterName}
      Character Role/Title: ${characterRole}
      Status: ${roleStatus}
      
      ${genderInstructions}
      
      Generate a rich, immersive profile for this character that will be printed in their personal packet. 
      The tone should match the Noir/Cinematic style of the platform: sharp, dramatic, and engaging.
    `;

    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    
    return parsed;
  } catch (error) {
    console.error('Error generating character profile', error);
    throw new Error('Failed to generate profile');
  }
}

export async function updateCharacterProfileAction(mysteryId: string, characterId: string, profileData: any) {
  await updateCharacter(characterId, {
    profile_data: profileData
  });
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/characters`);
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/characters/${characterId}`);
}

