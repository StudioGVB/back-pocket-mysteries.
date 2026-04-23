'use server';

import { revalidatePath } from 'next/cache';
import { upsertRelationship, deleteRelationship, getRelationshipsByMysteryId } from '@/services/relationships';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';

export async function upsertRelationshipAction(mysteryId: string, relationship: any) {
  try {
    await upsertRelationship({
      ...relationship,
      mystery_id: mysteryId
    });
    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
  } catch (error) {
    console.error('Action Error: upsertRelationshipAction', error);
    throw error;
  }
}

export async function removeRelationshipAction(mysteryId: string, relationshipId: string) {
  try {
    await deleteRelationship(relationshipId);
    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
  } catch (error) {
    console.error('Action Error: removeRelationshipAction', error);
    throw error;
  }
}

export async function generateRelationshipsAction(mysteryId: string, overwrite: boolean) {
  try {
    // Fetch characters & mystery context
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    if (!characters || characters.length < 2) {
      throw new Error('Not enough characters to form relationships.');
    }

    // Build the AI/Mock payload
    const castData = characters.map((c: any) => ({
      id: c.id,
      name: c.name.split('|')[0],
      title_or_role: c.name.includes('|') ? c.name.split('|')[1] : null,
      archetype: c.archetype,
      plot_role: c.plot_role,
      is_mandatory: c.is_mandatory,
      is_victim: c.is_victim
    }));

    const USE_MOCK_AI = false; // Toggle this once billing is fixed
    let generatedRels: any[] = [];

    if (USE_MOCK_AI) {
      // Manual rules-based engine for local development testing
      const victim = castData.find((c: any) => c.is_victim) || castData[0];
      const mandatories = castData.filter((c: any) => c.is_mandatory && !c.is_victim);
      const dynamicsList = ["married", "secret affair", "business partners", "rivals", "best friends", "siblings", "co-workers", "boss", "competitors"];
      
      const getRandomDynamic = () => [dynamicsList[Math.floor(Math.random() * dynamicsList.length)]];

      // 1. Spoke mapping: Everyone knows the Victim
      for (const c of castData) {
        if (c.id !== victim.id) {
          generatedRels.push({
             source_character_id: victim.id,
             target_character_id: c.id,
             dynamics: getRandomDynamic(),
             notes: 'Developer Mock Data (Victim Spoke)'
          });
        }
      }

      // 2. Core Web: All mandatory suspects intermingle tightly
      for (let i = 0; i < mandatories.length; i++) {
        for (let j = i + 1; j < mandatories.length; j++) {
           generatedRels.push({
              source_character_id: mandatories[i].id,
              target_character_id: mandatories[j].id,
              dynamics: getRandomDynamic(),
              notes: 'Developer Mock Data (Core Web)'
           });
        }
      }

      // Add slight delay for realistic loading feel
      await new Promise(resolve => setTimeout(resolve, 1500));

    } else {
      // ======================================
      // ORIGINAL GEMINI API LOGIC
      // Restore this block once Google Cloud Billing / Quota is successfully linked.
      // ======================================
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error('Google Generative AI API Key is missing from environment variables.');
  
      const genAI = new GoogleGenerativeAI(apiKey);
      const responseSchema: Schema = {
        type: SchemaType.OBJECT,
        properties: {
          relationships: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                source_character_id: { type: SchemaType.STRING },
                target_character_id: { type: SchemaType.STRING },
                dynamics: { 
                  type: SchemaType.ARRAY, 
                  items: { type: SchemaType.STRING } 
                },
                notes: { type: SchemaType.STRING }
              },
              required: ['source_character_id', 'target_character_id', 'dynamics']
            }
          }
        },
        required: ['relationships']
      };
  
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema,
        }
      });
  
      const prompt = `
        You are a plot architect for a murder mystery party game.
        Theme: ${mystery?.theme || 'General Mystery'}
        
        I am providing a list of characters. You must return an array of compelling, dramatic relationships between them.
        
        RULES:
        1. Every relationship has two people. Use exact IDs provided. Do not invent IDs.
        2. Analyze the 'title_or_role' field for both characters. The 'dynamics' array you invent MUST logically match their occupations/titles. For example, if one is 'Captain' and the other is 'Charter Guest', they should have an 'employee-guest' dynamic, not 'business partners' or 'siblings' unless highly justified by the plot. If one is 'Maid' and the other 'Billionaire', their dynamic is 'employer-employee'. Do not start from scratch—use their explicit titles to determine their relationship!
        3. **No Floaters**: EVERY single character in the list MUST be connected to at least one other character. Do not leave anyone isolated.
        4. **The Core**: Mandatory/Primary characters (is_mandatory: true) MUST be connected to at least 2 other characters to form a tight web. Connect the VICTIM to almost everyone.
        5. **The Spokes**: If a character is NOT mandatory (e.g., is_mandatory = false), they should act as a dead-end spoke. They should only connect to the Victim or ONE other major character. They MUST NOT connect to multiple people. This ensures they can be removed from the game without breaking the core relationship web.
        
        CHARACTERS JSON:
        ${JSON.stringify(castData, null, 2)}
      `;
  
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);
  
      generatedRels = parsed.relationships || [];
    }

    // Clear existing if overwrite
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    if (overwrite) {
      await supabase.from('relationships').delete().eq('mystery_id', mysteryId);
    }

    // Insert new ones
    for (const rel of generatedRels) {
      // Ensure source != target
      if (rel.source_character_id !== rel.target_character_id) {
        await upsertRelationship({
          mystery_id: mysteryId,
          character_a_id: rel.source_character_id,
          character_b_id: rel.target_character_id,
          know_each_other: true,
          dynamics: rel.dynamics,
          notes: rel.notes || 'Generated by AI'
        });
      }
    }

    // Bust cache to update Matrix and Diagram
    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
    
  } catch (error) {
    console.error('Action Error: generateRelationshipsAction', error);
    throw error;
  }
}

export async function generateMotivesAction(mysteryId: string, overwrite: boolean) {
  try {
    const [mystery, characters, relationships] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId),
      getRelationshipsByMysteryId(mysteryId)
    ]);

    if (!characters || characters.length < 2) {
      throw new Error('Not enough characters to form motives.');
    }

    const victim = characters.find((c: any) => c.is_victim) || characters[0];

    // Build the AI payload context
    const castData = characters.map((c: any) => ({
      id: c.id,
      name: c.name.split('|')[0],
      title_or_role: c.name.includes('|') ? c.name.split('|')[1] : null,
      archetype: c.archetype,
      plot_role: c.plot_role,
      is_mandatory: c.is_mandatory,
      is_victim: c.is_victim
    }));

    const relationshipGraph = relationships.filter(r => r.know_each_other).map(r => {
      const charA = characters.find((c: any) => c.id === r.character_a_id)?.name.split('|')[0];
      const charB = characters.find((c: any) => c.id === r.character_b_id)?.name.split('|')[0];
      return `${charA} & ${charB}: ${r.dynamics?.join(', ') || 'Connected'}`;
    });

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing from environment variables.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const responseSchema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        motives: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              character_id: { type: SchemaType.STRING },
              motive_type: { 
                type: SchemaType.STRING, 
                enum: ['revenge', 'greed', 'love', 'fear', 'justice', 'power'],
                format: 'enum'
              },
              linked_character_id: { type: SchemaType.STRING },
              strength: { 
                type: SchemaType.STRING,
                enum: ['low', 'moderate', 'high', 'critical'],
                format: 'enum'
              },
              notes: { type: SchemaType.STRING }
            },
            required: ['character_id', 'motive_type', 'linked_character_id', 'strength', 'notes']
          }
        }
      },
      required: ['motives']
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const prompt = `
      You are writing murder motives for a mystery party game.
      Theme: ${mystery?.theme || 'General Mystery'}
      Victim: ${victim.name}

      I am providing a list of characters and their relationship dynamics.
      You must return an array of compelling motives for WHY these characters might want to murder the Victim (or rarely, someone else if they are covering up a crime or being blackmailed).

      RULES:
      1. Every character (except the victim) should ideally have ONE primary motive against the victim.
      2. If a character is the 'killer', give them a 'critical' or 'high' strength motive.
      3. If a character is 'innocent', give them a 'low' or 'moderate' strength motive (red herrings).
      4. Use the Relationship Graph to inform the notes. If two people are "rivals", mention it in the notes.
      5. motive_type MUST be one of: 'revenge', 'greed', 'love', 'fear', 'justice', 'power'.
      6. Use EXACT IDs provided in the Characters JSON.
      
      CHARACTERS JSON:
      ${JSON.stringify(castData, null, 2)}

      RELATIONSHIP GRAPH:
      ${JSON.stringify(relationshipGraph, null, 2)}
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);

    const generatedMotives = parsed.motives || [];

    const { createClient } = await import('@/utils/supabase/server');
    const supabase = await createClient();
    
    if (overwrite) {
      await supabase.from('motives').delete().eq('mystery_id', mysteryId);
    }

    // Insert new ones
    for (const mot of generatedMotives) {
      if (mot.character_id !== mot.linked_character_id) {
        await supabase.from('motives').insert({
          mystery_id: mysteryId,
          character_id: mot.character_id,
          motive_type: mot.motive_type,
          linked_character_id: mot.linked_character_id,
          strength: mot.strength,
          notes: mot.notes || 'Generated by AI'
        });
      }
    }

    revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
    
  } catch (error) {
    console.error('Action Error: generateMotivesAction', error);
    throw error;
  }
}
