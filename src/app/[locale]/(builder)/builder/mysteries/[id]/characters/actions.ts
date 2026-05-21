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
import { logAiUsage } from '@/utils/ai-logger';

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
    
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: result.response.usageMetadata?.promptTokenCount,
      completion_tokens: result.response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_ai_character',
      mystery_id: mysteryId
    });

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
    
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: result.response.usageMetadata?.promptTokenCount,
      completion_tokens: result.response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_role_suggestions',
      mystery_id: mysteryId
    });

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
    
    await logAiUsage({
      model_name: 'gemini-2.5-pro',
      prompt_tokens: result.response.usageMetadata?.promptTokenCount,
      completion_tokens: result.response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_character_profile',
      mystery_id: mysteryId
    });

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

export async function generateCharacterOutfitPhotoAction(mysteryId: string, characterId: string, outfitAdvice: string, characterTitle: string, theme: string) {
  try {
    const prompt = `A cinematic, moody noir WIDE ANGLE FULL BODY SHOT of an approximately 28 year old ${characterTitle} wearing: ${outfitAdvice}. The character is standing. Their entire body, from the very top of their head down to their shoes, MUST be fully visible in the frame. Zoomed out perspective. The aesthetic is ${theme}. Professional lighting, 8k resolution, highly detailed character concept art.`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${process.env.GOOGLE_GENERATIVE_AI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: "9:16" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Imagen API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Log Imagen request cost
    await logAiUsage({
      model_name: 'imagen-4.0-generate-001',
      feature_name: 'generate_character_photo',
      mystery_id: mysteryId
    });

    const base64Str = data.predictions?.[0]?.bytesBase64Encoded;
    
    if (!base64Str) {
      throw new Error('No image bytes returned from API');
    }
    
    const supabase = await createClient();
    const fileName = `${mysteryId}/${characterId}_${Date.now()}.png`;
    
    const imageBuffer = Buffer.from(base64Str, 'base64');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
      
    if (uploadError) {
      throw new Error(`Failed to upload to Supabase: ${uploadError.message}`);
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('character-images')
      .getPublicUrl(fileName);
      
    return publicUrl;
    
  } catch (err: any) {
    console.error('Error generating photo', err);
    throw new Error(err.message || 'Failed to generate photo');
  }
}

export async function assignGuestToCharacterAction(mysteryId: string, characterId: string, guestId: string | null) {
  const supabase = await createClient();
  
  // 1. Get the current character
  const { data: character, error: charErr } = await supabase
    .from('characters')
    .select('*')
    .eq('id', characterId)
    .single();
    
  if (charErr || !character) {
    throw new Error(charErr?.message || 'Character not found');
  }

  const profile = { ...((character.profile_data as any) || {}) } as any;

  if (!guestId) {
    // UNASSIGN GUEST: remove all guest keys from character.profile_data
    delete profile.guest_id;
    delete profile.guest_name;
    delete profile.name;
    delete profile.gender;
    delete profile.eye_color;
    delete profile.height;
    delete profile.avatar_url;
    delete profile.traits;
    delete profile.bio;
    delete profile.is_linked;
  } else {
    // ASSIGN GUEST: Fetch guest details (check manual guests table first)
    const { data: manualGuest } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .single();

    let guest: any = null;

    if (manualGuest) {
      guest = {
        id: manualGuest.id,
        name: manualGuest.name,
        gender: manualGuest.gender || 'adaptable',
        eye_color: manualGuest.eye_color || '',
        height: manualGuest.height || '',
        avatar_url: manualGuest.avatar_url || '',
        traits: manualGuest.traits || [],
        bio: manualGuest.bio || '',
        isLinked: false
      };
    } else {
      // Check linked guests
      const { data: connection } = await (supabase as any)
        .from('guest_connections')
        .select(`
          id,
          guest_user_id,
          profiles!guest_user_id (
            bio,
            location,
            pronouns,
            avatar_config,
            dietary_needs,
            character_preferences
          )
        `)
        .eq('guest_user_id', guestId)
        .single() as any;

      if (connection) {
        const { data: linkedProfile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', connection.guest_user_id)
          .single();

        const avatarUrlHelper = (config: any) => {
          if (!config) return null;
          const params = new URLSearchParams({
            seed: config.seed || 'player',
            top: config.top || 'shortFlat',
            topColor: config.hairColor || '282828',
            hairColor: config.hairColor || '282828',
            skinColor: config.skinColor || 'ffe0bd',
            ...(config.facialHair ? { facialHair: config.facialHair } : {}),
            backgroundColor: 'transparent',
          });
          return `https://api.dicebear.com/7.x/avataaars/svg?${params}`;
        };

        guest = {
          id: connection.guest_user_id,
          name: linkedProfile?.full_name || 'Linked Guest',
          gender: connection.profiles?.pronouns === 'he/him' ? 'male' : connection.profiles?.pronouns === 'she/her' ? 'female' : 'adaptable',
          eye_color: '',
          height: '',
          avatar_url: avatarUrlHelper(connection.profiles?.avatar_config) || '',
          traits: connection.profiles?.character_preferences || [],
          bio: connection.profiles?.bio || '',
          isLinked: true
        };
      }
    }

    if (!guest) {
      throw new Error('Guest not found in database');
    }

    // Unassign this guest from any other characters in this mystery to prevent double-casting!
    const { data: siblingCharacters } = await supabase
      .from('characters')
      .select('id, profile_data')
      .eq('mystery_id', mysteryId);

    if (siblingCharacters) {
      for (const sibling of siblingCharacters) {
        if (sibling.id !== characterId && (sibling.profile_data as any)?.guest_id === guestId) {
          const siblingProfile = { ...((sibling.profile_data as any) || {}) } as any;
          delete siblingProfile.guest_id;
          delete siblingProfile.guest_name;
          delete siblingProfile.name;
          delete siblingProfile.gender;
          delete siblingProfile.eye_color;
          delete siblingProfile.height;
          delete siblingProfile.avatar_url;
          delete siblingProfile.traits;
          delete siblingProfile.bio;
          delete siblingProfile.is_linked;
          await supabase
            .from('characters')
            .update({ profile_data: siblingProfile })
            .eq('id', sibling.id);
        }
      }
    }

    // Merge guest details into current character's profile_data
    profile.guest_id = guest.id;
    profile.guest_name = guest.name;
    profile.name = guest.name;
    profile.gender = guest.gender;
    profile.eye_color = guest.eye_color;
    profile.height = guest.height;
    profile.avatar_url = guest.avatar_url;
    profile.traits = guest.traits;
    profile.bio = guest.bio;
    profile.is_linked = guest.isLinked;
  }

  // 2. Save the updated character profile
  const { error: updateErr } = await supabase
    .from('characters')
    .update({ profile_data: profile })
    .eq('id', characterId);

  if (updateErr) {
    throw new Error(updateErr.message);
  }

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function autoAssignGuestsAction(mysteryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch manual guests
  const { data: manualGuests } = await supabase
    .from('guests')
    .select('*')
    .eq('user_id', user.id);

  // Fetch linked guests
  const { data: connections } = await (supabase as any)
    .from('guest_connections')
    .select(`
      id,
      guest_user_id,
      profiles!guest_user_id (
        bio,
        location,
        pronouns,
        avatar_config,
        dietary_needs,
        character_preferences
      )
    `)
    .eq('host_user_id', user.id) as any;

  const avatarUrlHelper = (config: any) => {
    if (!config) return null;
    const params = new URLSearchParams({
      seed: config.seed || 'player',
      top: config.top || 'shortFlat',
      topColor: config.hairColor || '282828',
      hairColor: config.hairColor || '282828',
      skinColor: config.skinColor || 'ffe0bd',
      ...(config.facialHair ? { facialHair: config.facialHair } : {}),
      backgroundColor: 'transparent',
    });
    return `https://api.dicebear.com/7.x/avataaars/svg?${params}`;
  };

  const linkedGuestIds = (connections ?? []).map((c: any) => c.guest_user_id);
  let linkedGuestNames: Record<string, string> = {};
  if (linkedGuestIds.length > 0) {
    const { data: linkedProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', linkedGuestIds);
    (linkedProfiles ?? []).forEach((p: any) => {
      linkedGuestNames[p.id] = p.full_name || 'Guest';
    });
  }

  const guests = [
    ...(manualGuests || []).map((mg: any) => ({
      id: mg.id,
      name: mg.name,
      gender: mg.gender || 'adaptable',
      eye_color: mg.eye_color || '',
      height: mg.height || '',
      avatar_url: mg.avatar_url || '',
      traits: mg.traits || [],
      bio: mg.bio || '',
      isLinked: false
    })),
    ...(connections || []).map((c: any) => ({
      id: c.guest_user_id,
      name: linkedGuestNames[c.guest_user_id] || 'Linked Guest',
      gender: c.profiles?.pronouns === 'he/him' ? 'male' : c.profiles?.pronouns === 'she/her' ? 'female' : 'adaptable',
      eye_color: '',
      height: '',
      avatar_url: avatarUrlHelper(c.profiles?.avatar_config) || '',
      traits: c.profiles?.character_preferences || [],
      bio: c.profiles?.bio || '',
      isLinked: true
    }))
  ];

  if (guests.length === 0) return { error: 'No guests saved in roster.' };

  const { data: characters, error: charErr } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (charErr || !characters) throw new Error(charErr?.message || 'Characters not found');

  let assignedIds = new Set<string>();
  let availableGuests = [...guests];

  // Lock already assigned guests
  for (const char of characters) {
    const existingGuestId = (char.profile_data as any)?.guest_id;
    if (existingGuestId) {
      const guestExists = guests.some(g => g.id === existingGuestId);
      if (guestExists) {
        assignedIds.add(existingGuestId);
        availableGuests = availableGuests.filter(g => g.id !== existingGuestId);
      }
    }
  }

  // Iterate to match unassigned characters
  for (const char of characters) {
    if ((char.profile_data as any)?.guest_id) continue;

    const charGender = char.gender || 'adaptable';
    let matchedIndex = -1;

    if (charGender !== 'adaptable') {
      matchedIndex = availableGuests.findIndex(g => g.gender === charGender);
    }

    if (matchedIndex === -1 && availableGuests.length > 0) {
      matchedIndex = 0;
    }

    if (matchedIndex !== -1) {
      const guest = availableGuests[matchedIndex];
      availableGuests.splice(matchedIndex, 1);
      assignedIds.add(guest.id);

      const profile = {
        ...((char.profile_data as any) || {}),
        guest_id: guest.id,
        guest_name: guest.name,
        name: guest.name,
        gender: guest.gender,
        eye_color: guest.eye_color,
        height: guest.height,
        avatar_url: guest.avatar_url,
        traits: guest.traits,
        bio: guest.bio,
        is_linked: guest.isLinked
      };

      await supabase
        .from('characters')
        .update({ profile_data: profile })
        .eq('id', char.id);
    }
  }

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
  return { success: true };
}

export async function clearAllCastingAction(mysteryId: string) {
  const supabase = await createClient();
  const { data: characters } = await supabase
    .from('characters')
    .select('id, profile_data')
    .eq('mystery_id', mysteryId);

  if (characters) {
    for (const char of characters) {
      const profile = { ...((char.profile_data as any) || {}) } as any;
      delete profile.guest_id;
      delete profile.guest_name;
      delete profile.name;
      delete profile.gender;
      delete profile.eye_color;
      delete profile.height;
      delete profile.avatar_url;
      delete profile.traits;
      delete profile.bio;
      delete profile.is_linked;

      await supabase
        .from('characters')
        .update({ profile_data: profile })
        .eq('id', char.id);
    }
  }

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

