'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { createCharacter, updateCharacter, deleteCharacter } from '@/services/mysteries';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';
import { getCharacterRoleTitle, getCharacterDisplayName, hydrateTextWithCharacters, stripEmDashes } from '@/utils/hydration';
import { generateStandardCharacterPhotoAction } from '@/app/actions/generator';
import crypto from 'crypto';

export async function addCharacterAction(mysteryId: string, formData: FormData) {
  const title = ((formData.get('title') as string) || '').trim();
  const base_name = ((formData.get('base_name') as string) || '').trim() || title;
  const prefix = ((formData.get('prefix') as string) || '').trim();
  const name = `${base_name}|${title}|${prefix}`;
  
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
      required: ['title', 'prefix', 'plot_role', 'gender', 'is_mandatory']
    };

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema,
      }
    });

    const existingTitles = characters.map((c: any) => getCharacterRoleTitle(c)).join(', ');
    const hasVictim = characters.some((c: any) => c.is_victim);
    const hasKiller = characters.some((c: any) => c.plot_role === 'killer');

    const prompt = `
      You are generating a new character role for a murder mystery party game.
      Theme: ${mystery?.theme || 'General Mystery'}
      
      Existing Character Roles: ${existingTitles || 'None yet'}
      
      RULES:
      1. NEVER invent a fake human first/last name. Characters are defined strictly by their iconic Role Title (e.g. "The Star", "The Sister", "The Ex", "The Producer", "The Chief Stew"). Real friend names are tagged later.
      2. Invent a unique, highly thematic 'title' based on the theme (e.g. "The Star", "The Sister", "The Ex", "The Superfan"). Do not reuse existing roles.
      3. Invent a 'prefix' that would appear before a guest's name if applicable (e.g. "Captain", "Doctor", "Detective"). If none makes sense, leave it as an empty string "".
      4. Assign a plot_role:
         - If there is no victim yet (${!hasVictim}), you MUST make them the 'victim'.
         - If there is a victim but no killer (${hasVictim && !hasKiller}), you MUST make them the 'killer'.
         - Otherwise, pick 'innocent' or 'assistant'.
      5. If they are the victim or killer, they MUST be mandatory (is_mandatory: true).
      6. Assign a gender ('male', 'female', or 'adaptable').
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

    return {
      ...parsed,
      name: parsed.title,
    };
    
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
      .map((c: any) => getCharacterRoleTitle(c))
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

    const characterRole = getCharacterRoleTitle(character);
    const roleStatus = character.is_victim ? 'The Victim' : (character.plot_role === 'killer' ? 'The Killer' : 'A Guest');
    const genderInstructions = isAdaptable 
      ? "CRITICAL: This character is 'adaptable' (gender-neutral). You MUST use They/Them pronouns. Keep the bio completely gender-neutral. Provide TWO SETS of advice: one tailored for a male guest playing the role (presentation_male), and one for a female guest playing the role (presentation_female)."
      : `CRITICAL: This character's gender is '${character.gender}'. Use appropriate pronouns and provide outfit/acting advice tailored to this gender.`;

    const prompt = `
      You are an expert murder mystery party game designer writing a character dossier.
      
      Mystery Theme: ${mystery?.theme || 'General Mystery'}
      Character Role/Title: ${characterRole}
      Status: ${roleStatus}
      
      ${genderInstructions}
      CRITICAL NAMING RULE: Do NOT invent any fake human first or last names! Address the player in second person ("You") or use the dynamic placeholder {{${characterRole}}}.
      CRITICAL PUNCTUATION RULE: NEVER use em dashes or spaced en dashes anywhere in the bio, outfit advice, acting summary, or bullet points. Use standard commas, periods, or colons instead.
      
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

    const parsed = JSON.parse(stripEmDashes(result.response.text()));
    
    return parsed;
  } catch (error) {
    console.error('Error generating character profile', error);
    throw new Error('Failed to generate profile');
  }
}

export async function updateCharacterProfileAction(mysteryId: string, characterId: string, profileData: any) {
  const supabase = await createClient();
  const { data: existingChar } = await supabase
    .from('characters')
    .select('profile_data')
    .eq('id', characterId)
    .maybeSingle();

  const mergedProfile = {
    ...((existingChar?.profile_data as any) || {}),
    ...(profileData || {}),
  };

  await updateCharacter(characterId, {
    profile_data: mergedProfile
  });
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/characters`);
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/characters/${characterId}`);
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/compile`);
}

export async function generateCharacterOutfitPhotoAction(mysteryId: string, characterId: string, outfitAdvice: string, characterTitle: string, theme: string) {
  try {
    const supabase = await createClient();

    // Ensure the latest outfit_advice from the editor is persisted on the character before generating the Standard Character Photo
    if (outfitAdvice && outfitAdvice.trim()) {
      const { data: existingChar } = await supabase
        .from('characters')
        .select('profile_data')
        .eq('id', characterId)
        .maybeSingle();

      const updatedProfile = {
        ...((existingChar?.profile_data as any) || {}),
        outfit_advice: outfitAdvice.trim(),
      };

      await supabase
        .from('characters')
        .update({ profile_data: updatedProfile })
        .eq('id', characterId);
    }

    const result = await generateStandardCharacterPhotoAction(mysteryId, characterId, true);
    if (result.error || !result.imageUrl) {
      throw new Error(result.error || 'Failed to generate standard character photo');
    }

    return result.imageUrl;
  } catch (err: any) {
    console.error('Error generating standard character photo', err);
    throw new Error(err.message || 'Failed to generate photo');
  }
}

export async function generateCharacterOutfitOptionsAction(
  mysteryId: string,
  characterId: string,
  outfitAdvice: string,
  characterTitle: string,
  theme: string,
  genderOption: 'male' | 'female' = 'female',
  singleOptionIndex?: number
): Promise<string[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const supabase = await createClient();
  const { data: existingChar } = await supabase
    .from('characters')
    .select('gender, profile_data')
    .eq('id', characterId)
    .maybeSingle();

  const isAdaptable = existingChar?.gender === 'adaptable';
  const genderNoun = genderOption === 'male' ? 'man' : 'woman';
  const genAI = new GoogleGenerativeAI(apiKey);
  const textModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const promptCount = typeof singleOptionIndex === 'number' ? 1 : 3;
  const variationPrompt = `You are a luxury fashion stylist creating ${promptCount} distinct outfit option lookbook descriptions for a guest playing "${characterTitle}" (${genderNoun}) at a "${theme || 'Murder Mystery'}" party.
Outfit Direction: "${outfitAdvice}"
Write ${promptCount} distinct, specific, head-to-toe outfit descriptions (clothing pieces, fabrics, colors, footwear, and accessories).
Return ONLY ${promptCount} lines separated by newlines, with no numbering, no bullets, and no em dashes.`;

  let outfitVariations: string[] = [];
  try {
    const textRes = await textModel.generateContent(variationPrompt);
    outfitVariations = textRes.response
      .text()
      .split('\n')
      .map((l) => l.replace(/^[\d\.\-\*\s]+/, '').trim())
      .filter((l) => l.length > 10)
      .slice(0, promptCount);
  } catch {
    // Fallback to variations of outfitAdvice
  }

  while (outfitVariations.length < promptCount) {
    outfitVariations.push(
      `${outfitAdvice} (Option ${outfitVariations.length + 1} styling variation)`
    );
  }

  const generateSingleLookbookImage = async (desc: string, idx: number): Promise<string | null> => {
    const imgPrompt = `High-fashion editorial wardrobe lookbook photograph (neck-down / cropped at chin, no eyes or upper face shown) at an atmospheric ${theme || 'evening'} party, warm cinematic lighting, 35mm film aesthetic, photorealistic, no text: a ${genderNoun} wearing ${desc}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: imgPrompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const b64 = imgPart?.inlineData?.data;
    if (!b64) return null;

    const fileBuffer = Buffer.from(b64, 'base64');
    const fileName = `outfit-options/${mysteryId}/${characterId}-${genderOption}-opt${idx + 1}-${Date.now()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('character-images')
      .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true });

    if (!uploadError) {
      const { data: pubData } = supabase.storage.from('character-images').getPublicUrl(fileName);
      if (pubData?.publicUrl) return pubData.publicUrl;
    }

    return `data:image/jpeg;base64,${b64}`;
  };

  const existingProfile = { ...((existingChar?.profile_data as any) || {}) };
  const presKey = genderOption === 'male' ? 'presentation_male' : 'presentation_female';
  const currentImages: string[] = isAdaptable
    ? [...(existingProfile[presKey]?.outfit_reference_images || existingProfile.outfit_reference_images || [])]
    : [...(existingProfile.outfit_reference_images || [])];

  let nextImages: string[] = [...currentImages];

  if (typeof singleOptionIndex === 'number') {
    const newUrl = await generateSingleLookbookImage(outfitVariations[0], singleOptionIndex);
    if (newUrl) {
      while (nextImages.length <= singleOptionIndex) nextImages.push('');
      nextImages[singleOptionIndex] = newUrl;
    }
  } else {
    const generatedUrls = await Promise.all(
      outfitVariations.map((desc, idx) => generateSingleLookbookImage(desc, idx))
    );
    nextImages = generatedUrls.map((u, idx) => u || currentImages[idx] || '').filter(Boolean);
  }

  if (isAdaptable) {
    existingProfile[presKey] = {
      ...(existingProfile[presKey] || {}),
      outfit_advice: outfitAdvice,
      outfit_reference_images: nextImages,
    };
    if (!existingProfile.outfit_reference_images || existingProfile.outfit_reference_images.length === 0) {
      existingProfile.outfit_reference_images = nextImages;
    }
  } else {
    existingProfile.outfit_advice = outfitAdvice;
    existingProfile.outfit_reference_images = nextImages;
  }

  await supabase
    .from('characters')
    .update({ profile_data: existingProfile })
    .eq('id', characterId);

  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/characters/${characterId}`);
  revalidatePath(`/[locale]/builder/mysteries/${mysteryId}/compile`);
  return nextImages;
}

export async function assignGuestToCharacterAction(mysteryId: string, characterId: string, guestId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
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
  const previousGuestId = profile.guest_id;

  if (!guestId) {
    // UNASSIGN GUEST: remove all guest keys from character.profile_data
    delete profile.guest_id;
    delete profile.guest_name;
    delete profile.name;
    delete profile.gender;
    delete profile.accent;
    delete profile.eye_color;
    delete profile.height;
    delete profile.build;
    delete profile.ethnicity;
    delete profile.avatar_url;
    delete profile.traits;
    delete profile.guest_bio;
    delete profile.is_linked;
    delete profile.standard_character_photo_url;
    delete profile.standard_character_photo_hash;
  } else {
    // Helper to construct avatar URLs from config
    const avatarUrlHelper = (config: any) => {
      if (!config) return null;
      const params = new URLSearchParams({
        seed: config.seed || 'player',
        top: config.top || 'shortFlat',
        topColor: config.hairColor || '282828',
        hairColor: config.hairColor || '282828',
        skinColor: config.skinColor || 'ffe0bd',
        ...(config.facialHair ? { facialHair: config.facialHair } : {}),
        ...(config.accent ? { accent: config.accent } : {}),
        backgroundColor: 'transparent',
      });
      return `https://api.dicebear.com/7.x/avataaars/svg?${params}`;
    };

    // ASSIGN GUEST: Fetch guest details (with static, database mock, and regular manual/linked fallbacks)
    let guest: any = null;

    // A. Check static mock guests list first
    const staticGuest = getStaticMockGuests().find(g => g.id === guestId);
    if (staticGuest) {
      guest = {
        id: staticGuest.id,
        name: staticGuest.name,
        gender: staticGuest.gender,
        accent: (staticGuest as any).accent || extractAccentFromAvatarUrl(staticGuest.avatar_url) || 'Australian',
        eye_color: staticGuest.eye_color,
        height: staticGuest.height,
        avatar_url: staticGuest.avatar_url,
        traits: staticGuest.traits,
        bio: staticGuest.bio,
        isLinked: false
      };
    } else {
      // B. Check standard manual guests table
      const { data: manualGuest } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .maybeSingle();

      if (manualGuest) {
        guest = {
          id: manualGuest.id,
          name: manualGuest.name,
          gender: manualGuest.gender || 'adaptable',
          accent: (manualGuest as any).accent || extractAccentFromAvatarUrl(manualGuest.avatar_url) || 'Australian',
          eye_color: manualGuest.eye_color || '',
          height: manualGuest.height || '',
          avatar_url: manualGuest.avatar_url || '',
          traits: manualGuest.traits || [],
          bio: manualGuest.bio || '',
          isLinked: false
        };
      } else {
        // C. Check database mock guests via RPC
        const { data: rpcGuests } = await (supabase as any).rpc('get_mock_guests');
        const dbMockGuest = ((rpcGuests as any) ?? []).find((rg: any) => rg.id === guestId);
        if (dbMockGuest) {
          guest = {
            id: dbMockGuest.id,
            name: dbMockGuest.name,
            gender: dbMockGuest.gender || 'adaptable',
            accent: dbMockGuest.accent || extractAccentFromAvatarUrl(dbMockGuest.avatar_url) || 'Australian',
            eye_color: dbMockGuest.eye_color || '',
            height: dbMockGuest.height || '',
            avatar_url: dbMockGuest.avatar_url || '',
            traits: dbMockGuest.traits || [],
            bio: dbMockGuest.bio || '',
            isLinked: false
          };
        } else {
          // D. Check host profile (either active user or Gabriella's mock profile ID)
          const targetProfileId = guestId === '4903bd39-e54f-42e4-b679-2af5d128bb8f'
            ? '4903bd39-e54f-42e4-b679-2af5d128bb8f'
            : (user && guestId === user.id ? user.id : null);

          if (targetProfileId) {
            const { data: profileRaw } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', targetProfileId)
              .maybeSingle();

            const profile = profileRaw as any;

            if (profile) {
              guest = {
                id: profile.id,
                name: profile.full_name || 'Gabriella Blyth',
                gender: profile.pronouns?.toLowerCase().includes('she') ? 'female' : profile.pronouns?.toLowerCase().includes('he') ? 'male' : 'adaptable',
                accent: profile.avatar_config?.accent || 'Australian',
                eye_color: profile.avatar_config?.eyeColor || 'Hazel',
                height: profile.avatar_config?.height || 'Average',
                avatar_url: avatarUrlHelper(profile.avatar_config) || '',
                traits: profile.character_preferences || [],
                bio: profile.bio || '',
                isLinked: false
              };
            }
          }

          if (!guest) {
            // E. Check linked guests
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
              .maybeSingle() as any;

            if (connection) {
              const { data: linkedProfile } = await supabase
                .from('profiles')
                .select('id, full_name')
                .eq('id', connection.guest_user_id)
                .single();

              guest = {
                id: connection.guest_user_id,
                name: linkedProfile?.full_name || 'Linked Guest',
                gender: connection.profiles?.pronouns === 'he/him' ? 'male' : connection.profiles?.pronouns === 'she/her' ? 'female' : 'adaptable',
                accent: connection.profiles?.avatar_config?.accent || 'Australian',
                eye_color: '',
                height: '',
                avatar_url: avatarUrlHelper(connection.profiles?.avatar_config) || '',
                traits: connection.profiles?.character_preferences || [],
                bio: connection.profiles?.bio || '',
                isLinked: true
              };
            }
          }
        }
      }
    }

    if (!guest) {
      throw new Error('Guest not found in database or static mock roster');
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
          delete siblingProfile.accent;
          delete siblingProfile.eye_color;
          delete siblingProfile.height;
          delete siblingProfile.build;
          delete siblingProfile.ethnicity;
          delete siblingProfile.avatar_url;
          delete siblingProfile.traits;
          delete siblingProfile.guest_bio;
          delete siblingProfile.is_linked;
          delete siblingProfile.standard_character_photo_url;
          delete siblingProfile.standard_character_photo_hash;
          await supabase
            .from('characters')
            .update({ profile_data: siblingProfile })
            .eq('id', sibling.id);
        }
      }
    }

    if (previousGuestId !== guest.id) {
      delete profile.standard_character_photo_url;
      delete profile.standard_character_photo_hash;
    }

    // Merge guest details into current character's profile_data
    profile.guest_id = guest.id;
    profile.guest_name = guest.name;
    profile.name = guest.name;
    profile.gender = guest.gender;
    profile.accent = guest.accent || extractAccentFromAvatarUrl(guest.avatar_url) || 'Australian';
    profile.age = guest.age || extractAgeFromAvatarUrl(guest.avatar_url) || 'young';
    profile.eye_color = guest.eye_color;
    profile.height = guest.height;
    profile.build = guest.build || profile.build || '';
    profile.ethnicity = guest.ethnicity || profile.ethnicity || '';
    profile.avatar_url = guest.avatar_url;
    profile.traits = guest.traits;
    profile.guest_bio = guest.bio;
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

  // Fetch host profile
  const { data: hostProfileRaw } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  const hostProfile = hostProfileRaw as any;

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
      ...(config.accent ? { accent: config.accent } : {}),
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
      accent: mg.accent || extractAccentFromAvatarUrl(mg.avatar_url) || 'Australian',
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
      accent: c.profiles?.avatar_config?.accent || 'Australian',
      eye_color: '',
      height: '',
      avatar_url: avatarUrlHelper(c.profiles?.avatar_config) || '',
      traits: c.profiles?.character_preferences || [],
      bio: c.profiles?.bio || '',
      isLinked: true
    }))
  ];

  if (hostProfile) {
    guests.push({
      id: hostProfile.id,
      name: hostProfile.full_name || 'Gabriella Blyth',
      gender: hostProfile.pronouns?.toLowerCase().includes('she') ? 'female' : hostProfile.pronouns?.toLowerCase().includes('he') ? 'male' : 'adaptable',
      accent: hostProfile.avatar_config?.accent || 'Australian',
      eye_color: hostProfile.avatar_config?.eyeColor || 'Hazel',
      height: hostProfile.avatar_config?.height || 'Average',
      avatar_url: avatarUrlHelper(hostProfile.avatar_config) || '',
      traits: hostProfile.character_preferences || [],
      bio: hostProfile.bio || '',
      isLinked: false
    });
  }

  const hasActiveRoster = (manualGuests && manualGuests.length > 0) || (connections && connections.length > 0);

  if (!hasActiveRoster) {
    // First try via security definer RPC
    const { data: rpcGuests } = await (supabase as any).rpc('get_mock_guests');
    
    // Also fetch Gabriella's own profile to append as the 12th guest ("plus me is 12")
    const { data: gvbProfileRaw } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', '4903bd39-e54f-42e4-b679-2af5d128bb8f')
      .maybeSingle();

    const gvbProfile = gvbProfileRaw as any;

    if (rpcGuests && (rpcGuests as any).length > 0) {
      let mappedGuests = (rpcGuests as any).map((rg: any) => ({
        id: rg.id,
        name: rg.name,
        gender: rg.gender || 'adaptable',
        accent: rg.accent || extractAccentFromAvatarUrl(rg.avatar_url) || 'Australian',
        eye_color: rg.eye_color || '',
        height: rg.height || '',
        avatar_url: rg.avatar_url || '',
        traits: rg.traits || [],
        bio: rg.bio || '',
        isLinked: false
      }));

      if (gvbProfile) {
        mappedGuests.push({
          id: gvbProfile.id,
          name: gvbProfile.full_name || 'Gabriella Blyth',
          gender: gvbProfile.pronouns?.toLowerCase().includes('she') ? 'female' : 'male',
          accent: gvbProfile.avatar_config?.accent || 'Australian',
          eye_color: gvbProfile.avatar_config?.eyeColor || 'Hazel',
          height: gvbProfile.avatar_config?.height || 'Average',
          avatar_url: avatarUrlHelper(gvbProfile.avatar_config) || '',
          traits: gvbProfile.character_preferences || [],
          bio: gvbProfile.bio || '',
          isLinked: false
        });
      }
      guests.length = 0;
      guests.push(...mappedGuests);
    } else {
      // Fall back to static mock guests
      const staticMockGuests = getStaticMockGuests().map((sg: any) => ({
        id: sg.id,
        name: sg.name,
        gender: sg.gender,
        accent: sg.accent || extractAccentFromAvatarUrl(sg.avatar_url) || 'Australian',
        eye_color: sg.eye_color,
        height: sg.height,
        avatar_url: sg.avatar_url,
        traits: sg.traits,
        bio: sg.bio,
        isLinked: false
      }));
      guests.length = 0;
      guests.push(...staticMockGuests);
    }
  }

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
        accent: guest.accent || extractAccentFromAvatarUrl(guest.avatar_url) || 'Australian',
        age: guest.age || extractAgeFromAvatarUrl(guest.avatar_url) || 'young',
        eye_color: guest.eye_color,
        height: guest.height,
        avatar_url: guest.avatar_url,
        traits: guest.traits,
        guest_bio: guest.bio,
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
      delete profile.guest_bio;
      delete profile.is_linked;

      await supabase
        .from('characters')
        .update({ profile_data: profile })
        .eq('id', char.id);
    }
  }

  revalidatePath(`/builder/mysteries/${mysteryId}`, 'layout');
}

export async function expandCharacterBioAction(mysteryId: string, character: any, currentBio: string, mysteryTitle: string) {
  try {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const allCharacters = await getCharactersByMysteryId(mysteryId);
    const roleTitle = getCharacterRoleTitle(character);
    const allRolesList = allCharacters.map((c: any) => getCharacterRoleTitle(c)).join(', ');
    const cleanInputBio = hydrateTextWithCharacters(currentBio || character.archetype || 'No background provided.', allCharacters, 'role');

    const prompt = `You are a master mystery writer. Expand the following character biography into a detailed, compelling 2-3 paragraph backstory. 
Make it dramatic, juicy, and fit for a murder mystery party titled "${mysteryTitle}". 
The character's role title is "${roleTitle}".
Other character roles in the cast: ${allRolesList}.
CRITICAL NAMING RULE: Do NOT invent or use any human first or last names! Address the player in second person ("You") or refer to characters strictly by their Role Titles (${allRolesList}).
CRITICAL PUNCTUATION RULE: NEVER use em dashes or spaced en dashes. Use standard commas, periods, or colons instead.
Here is their current short bio/background:
"${cleanInputBio}"

Focus on adding rich flavor, deep secrets, and dramatic flair. Do not change any fundamental facts given, just expand and embellish them beautifully. Return ONLY the expanded bio text.`;

    const result = await model.generateContent(prompt);
    const rawText = stripEmDashes(result.response.text().trim());
    const text = hydrateTextWithCharacters(rawText, allCharacters, 'role');

    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: 'expand_character_bio',
      mystery_id: mysteryId,
      usageMetadata: result.response.usageMetadata as any,
    });
    
    return text;
  } catch (error) {
    console.error('Failed to expand character bio:', error);
    throw new Error('Failed to expand character bio');
  }
}
