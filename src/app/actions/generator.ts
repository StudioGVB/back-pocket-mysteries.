'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAiUsage } from '@/utils/ai-logger';
import { createClient } from '@/utils/supabase/server';
import { getCharactersByMysteryId } from '@/services/mysteries';
import { hydrateTextWithCharacters } from '@/utils/hydration';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export async function generateRandomQuirk(name: string, gender: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const characterDescription = name ? `${name} (Gender: ${gender})` : `a ${gender} character`;

  const prompt = `Generate a single, short, funny, and unique personality quirk, fun fact, or fear for ${characterDescription} in a murder mystery game. 
Keep it under 10 words. 
Examples: "Terrified of loose buttons", "Always carries a spare spoon", "Collects vintage lint", "Secretly loves pineapple on pizza".
Respond with ONLY the quirk itself, no quotes, no extra text, and do not include the character's name in the output if possible.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_random_quirk'
    });

    return response.text().trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating quirk:', error);
    return "Has a mysterious secret"; // Fallback
  }
}

export async function generateCluePreview(prompt: string, templateText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemInstruction = `You are a mystery game clue generator. Based on the provided prompt and template, generate the text for a single clue. Output ONLY the generated clue content, do not add any conversational fluff. Keep it concise, engaging, and in-character for a murder mystery.`;

  const fullPrompt = `${systemInstruction}\n\nPROMPT:\n${prompt}\n\nTEMPLATE / FORMAT (if provided):\n${templateText || 'None provided.'}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_clue_preview'
    });

    return response.text().trim();
  } catch (error) {
    console.error('Error generating clue preview:', error);
    throw new Error("Failed to generate clue preview.");
  }
}

export async function suggestCluePrompts(beatTitle: string): Promise<string[]> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are an expert murder mystery designer. The user needs to create an image generation prompt for a clue/evidence that reveals or relates to the following story beat:
"${beatTitle}"

Suggest exactly 2 distinct ideas for what this evidence could be, and write them as detailed visual prompts for an AI image generator (like Imagen) to create the physical scene.
Use the placeholder {{VICTIM}} and {{KILLER}} if appropriate.

CRITICAL RULE: Visual prompts MUST NOT request any text, writing, handwriting, ink, messages, or letters on any objects (such as notebooks, paper, coasters, sticky notes, or napkins). Instead, describe the object as completely blank with no text or writing on it (e.g. "a blank paper with no writing or text on it", "a blank coaster with no writing on it"). Screen/chat clues should be described face-down so no screen is visible (e.g. "a smartphone lying face-down, no screen is visible"). All text message contents will be rendered separately via HTML, not in the generated image. Keep the suggestions highly visual, atmospheric, and aligned with the gritty noir aesthetic.

Example Beat: "The affair is discovered"
Output:
1. A dramatic close-up of a crumpled piece of blank cream-colored hotel stationery lying inside {{VICTIM}}'s coat pocket. The paper is completely blank with no writing, ink, or text on it. Gritty noir aesthetic, moody lighting, shallow depth of field, 8k.
2. A blurry, atmospheric photograph of {{KILLER}} and {{VICTIM}} arguing furiously outside a motel room at twilight, under glowing neon signs. Gritty noir aesthetic, dramatic low-key lighting, shallow depth of field, 8k.

Return exactly 2 lines. Do not use numbers, bullet points, or any extra conversational text. Just the two raw suggestions separated by a newline.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'suggest_clue_prompts'
    });

    const text = response.text().trim();
    // Split by newline, remove any stray numbers/bullets at start, filter empties
    const suggestions = text.split('\n')
      .map(line => line.replace(/^[\d\.\-\*\s]+/, '').trim())
      .filter(line => line.length > 5)
      .slice(0, 2);
    
    // Ensure we always return exactly 2 items, even if parsing fails
    if (suggestions.length < 2) {
      suggestions.push("A handwritten note containing a cryptic warning.");
      if (suggestions.length < 2) suggestions.push("A suspicious receipt linking the suspect to the scene.");
    }
    return suggestions;
  } catch (error) {
    console.error('Error suggesting clue prompts:', error);
    return [
      "A mysterious letter hidden in a secret compartment.",
      "An unexpected financial document revealing hidden debts."
    ];
  }
}

export async function generateClueDescriptionAction(
  title: string,
  beatTitle: string,
  generationPrompt: string
): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `You are a mystery game designer writing the descriptive text for a clue/evidence card.
Clue Title: "${title}"
Story Beat: "${beatTitle}"
AI Description / Generation Prompt: "${generationPrompt}"

Your task is to write a single, rich, and highly atmospheric description of this clue. This description will be printed on the clue card itself, which the players will read during the game.
It should be highly thematic, detailed, and reveal crucial circumstantial or direct evidence related to the story beat.
Keep it between 2 to 4 sentences. Make it sound premium and engaging, matching a cinematic noir/suspense theme.
CRITICAL: Output ONLY the description itself. No introduction, no quotes, no conversational text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_clue_description'
    });

    return response.text().trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating clue description:', error);
    throw new Error("Failed to generate clue description.");
  }
}

function isCctvOrVideoClue(clue: any) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('cctv') ||
    title.includes('video') ||
    title.includes('camera') ||
    title.includes('photo') ||
    title.includes('polaroid') ||
    desc.includes('cctv') ||
    desc.includes('security cam') ||
    desc.includes('camera footage') ||
    desc.includes('video footage') ||
    desc.includes('metadata: sec cam') ||
    prompt.includes('cctv') ||
    prompt.includes('security camera') ||
    prompt.includes('surveillance')
  );
}

function isAudioClue(clue: any) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('audio') ||
    title.includes('voice note') ||
    title.includes('recorded') ||
    title.includes('recording') ||
    title.includes('clip') ||
    title.includes('sound') ||
    desc.includes('🎙️') ||
    desc.includes('audio recording') ||
    desc.includes('voice note') ||
    prompt.includes('microphone') ||
    prompt.includes('soundboard') ||
    prompt.includes('audio recorder')
  );
}

function isScreenClue(clue: any) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('smartphone') ||
    title.includes('phone') ||
    title.includes('text') ||
    title.includes('chat') ||
    title.includes('dm') ||
    title.includes('sms') ||
    title.includes('screen') ||
    title.includes('email') ||
    title.includes('message') ||
    title.includes('whatsapp') ||
    title.includes('imessage') ||
    desc.includes('chat thread') ||
    desc.includes('text message') ||
    desc.includes('dm thread') ||
    desc.includes('private dm') ||
    prompt.includes('phone') ||
    prompt.includes('screen') ||
    prompt.includes('chat') ||
    prompt.includes('message')
  );
}

export async function generateClueImageAction(clueId: string, mysteryId: string, promptText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  try {
    const supabase = await createClient();
    const characters = await getCharactersByMysteryId(mysteryId);
    
    // Fetch the full clue record to check its type
    const { data: clue, error: clueError } = await supabase
      .from('clues')
      .select('*')
      .eq('id', clueId)
      .single();

    if (clueError || !clue) {
      throw new Error(clueError?.message || 'Clue not found');
    }

    const isAudio = isAudioClue(clue);
    const isCctv = isCctvOrVideoClue(clue) && !isAudio;
    const isScreen = isScreenClue(clue) && !isAudio && !isCctv;

    // Determine the base prompt to use (avoiding sending the dialogue description)
    let basePrompt = clue.generation_prompt?.trim() || clue.title || '';
    // Clean up any quotes or text inside the base prompt
    basePrompt = basePrompt.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').trim();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    let finalPrompt = '';

    if (isAudio || isScreen) {
      const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
      finalPrompt = `A premium, dramatic, close-up photograph of a ${device} lying on a dark surface or held in a hand in a dimly lit room. The screen is completely black, dark, off, or showing only a simple generic dark lockscreen wallpaper with absolutely NO text, NO writing, NO letters, NO numbers, NO chat bubbles, and NO symbols. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
    } else if (isCctv) {
      const hydratedPrompt = hydrateTextWithCharacters(basePrompt, characters, 'ai');
      finalPrompt = `A high-quality, professional photograph of: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic. CRITICAL: Any people in the image MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. The image MUST contain absolutely NO text, NO writing, NO letters, NO numbers, and NO overlay graphics.`;
    } else {
      const hydratedPrompt = hydrateTextWithCharacters(basePrompt, characters, 'ai');
      finalPrompt = `A high-quality, professional photograph of a clue item in a murder mystery: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: This is a real, live-action photograph taken with a DSLR camera. The image MUST be highly photorealistic. CRITICAL: Any people in the image MUST look between 25 and 30 years old. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art, NO vector graphics. The image MUST contain absolutely NO text, NO writing, NO letters, NO numbers, and NO characters.`;
    }

    const promptHash = crypto.createHash('sha256').update(finalPrompt).digest('hex');

    // Check cache first
    const { data: cached } = await supabase
      .from('image_generation_cache')
      .select('image_url')
      .eq('prompt_hash', promptHash)
      .single();

    let dataUri = '';

    if (cached?.image_url) {
      dataUri = cached.image_url;
    } else {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
      const payload = {
        instances: [{ prompt: finalPrompt }],
        parameters: { 
          sampleCount: 1, 
          aspectRatio: "1:1", 
          outputOptions: { mimeType: "image/jpeg" },
          personGeneration: "allow_adult"
        }
      };

      let res;
      let retries = 0;
      let isRateLimited = false;
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

      if (res && res.ok) {
        const data = await res.json();
        base64Image = data.predictions?.[0]?.bytesBase64Encoded;
      }

      if (base64Image) {
        dataUri = `data:image/jpeg;base64,${base64Image}`;
        
        // Save to cache
        await supabase.from('image_generation_cache').insert({
          prompt_hash: promptHash,
          image_url: dataUri
        });
        console.log('Saved clue image to cache');
      } else {
        console.warn('Image generation failed or quota exceeded, using fallback placeholder');
        dataUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(clue.title || 'Clue')}&background=random&size=512`;
      }
    }

    // Update static_image_url in clues table
    const { error } = await supabase
      .from('clues')
      .update({ static_image_url: dataUri, updated_at: new Date().toISOString() })
      .eq('id', clueId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    return { success: true, imageUrl: dataUri };
  } catch (error: any) {
    console.error('generateClueImageAction error:', error);
    return { error: error.message };
  }
}

export async function generateProfileBioAction(name: string): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('API key not configured');
  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Write a short, fun, 1-2 sentence bio for a murder mystery party guest named ${name}. Make it slightly quirky and engaging. Respond ONLY with the bio text, no quotes.`;
  
  try {
    const result = await model.generateContent(prompt);
    return (await result.response).text().trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating bio:', error);
    throw new Error('Failed to generate bio');
  }
}

export async function generateProfileFunFactAction(name: string): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) throw new Error('API key not configured');
  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = `Write a single, hilarious, and highly specific fun fact about a murder mystery party guest named ${name}. Keep it under 15 words. Respond ONLY with the fun fact, no quotes.`;
  
  try {
    const result = await model.generateContent(prompt);
    return (await result.response).text().trim().replace(/^["']|["']$/g, '');
  } catch (error) {
    console.error('Error generating fun fact:', error);
    throw new Error('Failed to generate fun fact');
  }
}

/**
 * Utility function to convert a guest's database profile into a standardized
 * physical description block for Image Generation AI (like Imagen 4).
 * This ensures character consistency by injecting the exact same physical traits 
 * into every image prompt that includes this character.
 */
export async function buildCharacterPromptBlock(guest: any): Promise<string> {
  const name = guest.name || 'A character';
  const gender = guest.gender || (guest.profile?.pronouns?.toLowerCase().includes('she') ? 'feminine woman' : guest.profile?.pronouns?.toLowerCase().includes('he') ? 'masculine man' : 'person') || 'person';
  const traits = guest.traits || guest.profile?.character_preferences || [];
  
  // Extract physical traits from avatar config if available (Linked Guest)
  const avatarConfig = guest.profile?.avatar_config;
  let hairStr = '';
  let accessoriesStr = '';
  
  if (avatarConfig) {
    // Mapping dicebear values to prompt-friendly descriptors
    if (avatarConfig.top === 'none') hairStr = 'who is bald';
    else if (avatarConfig.top) hairStr = `with ${avatarConfig.top.replace(/([A-Z])/g, ' $1').toLowerCase()} hair`;
    
    if (avatarConfig.accessories && avatarConfig.accessories !== 'none') {
      const acc = avatarConfig.accessories.replace(/[0-9]/g, '');
      accessoriesStr = `, wearing ${acc === 'kurt' ? 'thick retro glasses' : acc === 'eyepatch' ? 'an eyepatch' : 'glasses'}`;
    }
  } else {
    // Fallbacks for manual guests that just have text fields
    const features = [];
    if (guest.eye_color) features.push(`${guest.eye_color} eyes`);
    hairStr = features.length > 0 ? `with ${features.join(' and ')}` : '';
  }

  const height = guest.height ? `who is ${guest.height.toLowerCase()}` : '';

  // Combine into a strict AI instruction block
  const block = `[CHARACTER PHYSICAL ANCHOR - ${name.toUpperCase()}]: A ${height} ${gender} ${hairStr}${accessoriesStr}.`;
  
  // Clean up double spaces
  return block.replace(/\s+/g, ' ').trim();
}
