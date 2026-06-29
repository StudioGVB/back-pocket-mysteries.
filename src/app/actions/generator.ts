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

function checkHasKnownCharacter(clue: any, characters: any[]) {
  if (!characters) return false;
  const title = clue.title || '';
  const desc = clue.description || '';
  const prompt = clue.generation_prompt || '';

  // Check for victim/killer tokens
  const victimRegex = /{{victim}}/i;
  const killerRegex = /{{killer}}/i;
  if (
    victimRegex.test(title) || victimRegex.test(desc) || victimRegex.test(prompt) ||
    killerRegex.test(title) || killerRegex.test(desc) || killerRegex.test(prompt)
  ) {
    return true;
  }

  // Check for any of the mystery's character names (as whole words) or tokens
  for (const char of characters) {
    const rawName = char.name || '';
    const cleanName = rawName.split('|')[0]?.trim();
    if (!cleanName) continue;

    const tokenRegex = new RegExp(`\\{\\{${cleanName}\\}\\}`, 'i');
    const wordRegex = new RegExp(`\\b${cleanName}\\b`, 'i');
    if (
      tokenRegex.test(title) || tokenRegex.test(desc) || tokenRegex.test(prompt) ||
      wordRegex.test(title) || wordRegex.test(desc) || wordRegex.test(prompt)
    ) {
      return true;
    }
  }

  return false;
}

function extractAiPhotoUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    if (url.includes('aiPhotoUrl=')) {
      const match = url.match(/[?&]aiPhotoUrl=([^&]+)/);
      if (match) {
        return decodeURIComponent(match[1]);
      }
    }
    if (url.startsWith('data:image/') || url.includes('/storage/v1/object/public/')) {
      return url;
    }
  } catch (e) {
    console.error('Error parsing aiPhotoUrl:', e);
  }
  return null;
}

async function getBase64FromUrl(url: string): Promise<string> {
  if (url.startsWith('data:image/')) {
    const commaIndex = url.indexOf(',');
    return url.substring(commaIndex + 1);
  }
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${url}, status: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

function getInvolvedCharacters(clue: any, characters: any[]): any[] {
  const title = (clue.title || '').toLowerCase().replace(/[_\-\/\\()]/g, ' ');
  const desc = clue.description || '';
  const descNormalized = desc.toLowerCase().replace(/[_\-\/\\()]/g, ' ');
  const prompt = (clue.generation_prompt || '').toLowerCase().replace(/[_\-\/\\()]/g, ' ');

  const involved = new Set<any>();

  // 1. Check if there are active speaker/sender/recipient markers in the description
  const activeNames = new Set<string>();
  const lines = desc.split('\n').map((l: string) => l.trim());
  
  for (const line of lines) {
    // Match "Sender: {{Name}}" or "Sender: Name" or "Recipient: {{Name}}" or "Recipient: Name" or "Speakers: {{Name}}"
    const srMatch = line.match(/^(?:Sender|Recipient|Speakers):\s*(?:\{\{)?([^\}]+?)(?:\}\})?(?:\s*\||$)/i);
    if (srMatch) {
      const names = srMatch[1]
        .replace(/[_\-\/\\()]/g, ' ')
        .split(/[\s,&]+/)
        .map((n: string) => n.trim().toLowerCase());
      names.forEach((n: string) => {
        if (n) activeNames.add(n);
      });
    }

    // Match "[time] {{Name}}:" or "[time] Name:"
    const chatMatch = line.match(/^\[[^\]]+\]\s*(?:\{\{)?([^\}]+?)(?:\}\})?:\s*/i);
    if (chatMatch) {
      const names = chatMatch[1]
        .replace(/[_\-\/\\()]/g, ' ')
        .split(/[\s,&]+/)
        .map((n: string) => n.trim().toLowerCase());
      names.forEach((n: string) => {
        if (n) activeNames.add(n);
      });
    }
  }

  // If we found any active participants, we only involve characters who are active participants
  if (activeNames.size > 0) {
    for (const char of characters) {
      const rawName = char.name || '';
      const cleanName = rawName.split('|')[0]?.trim().toLowerCase();
      if (!cleanName) continue;

      const profile = char.profile_data || {};
      const guestName = (profile.name || profile.guest_name || profile.guestName || '').toLowerCase();

      if (
        activeNames.has(cleanName) || 
        (guestName && activeNames.has(guestName)) ||
        Array.from(activeNames).some(activeWord => activeWord === cleanName || (guestName && activeWord === guestName))
      ) {
        involved.add(char);
      }
    }
  } else {
    // Fall back to scanning the entire text
    for (const char of characters) {
      const rawName = char.name || '';
      const cleanName = rawName.split('|')[0]?.trim();
      if (!cleanName) continue;

      const tokenRegex = new RegExp(`\\{\\{${cleanName}\\}\\}`, 'i');
      const wordRegex = new RegExp(`\\b${cleanName}\\b`, 'i');

      const profile = char.profile_data || {};
      const guestName = profile.name || profile.guest_name || profile.guestName || '';
      const guestTokenRegex = guestName ? new RegExp(`\\{\\{${guestName}\\}\\}`, 'i') : null;
      const guestWordRegex = guestName ? new RegExp(`\\b${guestName}\\b`, 'i') : null;

      if (
        tokenRegex.test(title) || tokenRegex.test(descNormalized) || tokenRegex.test(prompt) ||
        wordRegex.test(title) || wordRegex.test(descNormalized) || wordRegex.test(prompt) ||
        (guestTokenRegex && (guestTokenRegex.test(title) || guestTokenRegex.test(descNormalized) || guestTokenRegex.test(prompt))) ||
        (guestWordRegex && (guestWordRegex.test(title) || guestWordRegex.test(descNormalized) || guestWordRegex.test(prompt)))
      ) {
        involved.add(char);
      }
    }
  }

  const victim = characters.find(c => c.is_victim);
  if (victim && activeNames.size === 0) {
    const victimRegex = /{{victim}}/i;
    if (victimRegex.test(title) || victimRegex.test(descNormalized) || victimRegex.test(prompt)) {
      involved.add(victim);
    }
  }

  const killer = characters.find(c => c.plot_role === 'killer');
  if (killer && activeNames.size === 0) {
    const killerRegex = /{{killer}}/i;
    if (killerRegex.test(title) || killerRegex.test(descNormalized) || killerRegex.test(prompt)) {
      involved.add(killer);
    }
  }

  return Array.from(involved);
}

function buildCharDescription(char: any, refId?: number): string {
  const profile = char.profile_data || {};
  const cleanName = (char.name || '').split('|')[0]?.trim();
  const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
  const genderStr = char.gender || profile.gender || '';

  const eyeColor = profile.eye_color || profile.eyeColor;

  const url = profile.avatar_url || profile.avatarUrl;

  const hairHex = (function() {
    if (!url) return null;
    const match = url.match(/[&?]hairColor=([^&]+)/);
    return match ? match[1] : null;
  })();

  const hairColor = (function() {
    if (!hairHex) return '';
    const cleanHex = hairHex.replace('#', '').toLowerCase();
    const mapping: Record<string, string> = {
      '282828': 'black',
      '4a3123': 'dark brown',
      'a0785a': 'light brown',
      'a55728': 'auburn',
      'c2a67e': 'ash blonde',
      'e8b07d': 'strawberry blonde',
      'd6b370': 'golden blonde',
      'f4f0e6': 'white blonde',
      'd95319': 'orange red',
      'ca4444': 'cherry red',
      'e8e1e1': 'silver / white',
      'f59797': 'pastel pink',
      'e84393': 'hot pink',
      '4b0082': 'indigo',
      '00a8ff': 'bright blue',
      '00b894': 'mint green'
    };
    return mapping[cleanHex] || '';
  })();

  const hairLength = (function() {
    if (!url) return null;
    const match = url.match(/[&?]hairLength=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

  const hairTexture = (function() {
    if (!url) return null;
    const match = url.match(/[&?]hairTexture=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  })();

  const parts: string[] = [];
  
  if (hairColor) {
    if (hairLength && hairLength !== 'Bald') {
      if (['Hijab', 'Turban', 'Beanie'].includes(hairLength)) {
        parts.push(`${hairColor.toLowerCase()} hair under a ${hairLength.toLowerCase()}`);
      } else {
        const textureStr = hairTexture ? ` ${hairTexture.toLowerCase()}` : ' straight';
        parts.push(`${hairLength.toLowerCase()} length,${textureStr} texture ${hairColor.toLowerCase()} hair`);
      }
    } else if (hairLength === 'Bald') {
      parts.push('bald / no hair');
    } else {
      parts.push(`${hairColor} hair`);
    }
  } else if (hairLength === 'Bald') {
    parts.push('bald / no hair');
  }

  if (eyeColor) parts.push(`${eyeColor.toLowerCase()} eyes`);
  if (genderStr) parts.push(genderStr.toLowerCase());
  const desc = parts.join(', ');

  let outfit = profile.outfit_advice || '';
  if (!outfit) {
    const pres = (genderStr || '').toLowerCase().includes('female') || (genderStr || '').toLowerCase() === 'f'
      ? profile.presentation_female 
      : profile.presentation_male;
    if (pres) {
      outfit = pres.outfit_advice || '';
    }
  }

  let mergedDesc = desc;
  if (outfit) {
    mergedDesc = desc ? `${desc}, styled like: ${outfit}` : `styled like: ${outfit}`;
  }

  const refStr = refId !== undefined ? `matching subject [${refId}]` : '';

  let details = '';
  if (refStr && mergedDesc) {
    details = `(${refStr}, ${mergedDesc})`;
  } else if (refStr) {
    details = `(${refStr})`;
  } else if (mergedDesc) {
    details = `(${mergedDesc})`;
  }

  return details ? `${guestName} ${details}` : guestName;
}

export async function generateClueImageAction(clueId: string, mysteryId: string, promptText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  try {
    const supabase = await createClient();

    // Fetch the mystery first to get the creator's user_id
    const { data: mystery, error: mysteryError } = await supabase
      .from('mysteries')
      .select('created_by')
      .eq('id', mysteryId)
      .single();

    if (mysteryError || !mystery) {
      throw new Error(mysteryError?.message || 'Mystery not found');
    }

    // Direct select of characters
    const { data: charactersData, error: charError } = await supabase
      .from('characters')
      .select('id, name, gender, profile_data, is_victim, plot_role')
      .eq('mystery_id', mysteryId);
    
    if (charError) {
      console.error('Error fetching characters directly in generator:', charError);
    }
    const characters = charactersData || [];

    const hostId = mystery.created_by;
    if (!hostId) {
      throw new Error('Mystery creator (host ID) is missing');
    }

    // Fetch all guests created by this mystery's creator
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', hostId);

    if (guestsError) {
      console.error('Error fetching guests in generator:', guestsError);
    }

    // Map guests by ID
    const guestMap = new Map<string, any>();
    if (guests) {
      for (const guest of guests) {
        guestMap.set(guest.id, guest);
      }
    }

    // Hydrate characters with their latest guest avatar URL and metadata
    const hydratedCharacters = characters.map(char => {
      const charProfile = (char.profile_data as any) || {};
      const guestId = charProfile.guest_id;
      if (guestId && guestMap.has(guestId)) {
        const guest = guestMap.get(guestId);
        return {
          ...char,
          gender: guest.gender || char.gender,
          profile_data: {
            ...charProfile,
            avatar_url: guest.avatar_url,
            eye_color: guest.eye_color || charProfile.eye_color,
            height: guest.height || charProfile.height,
            ethnicity: guest.ethnicity || charProfile.ethnicity,
            guest_name: guest.name,
          }
        };
      }
      return char;
    });
    
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
    // Normalize underscores and hyphens in base prompt to make name boundary checks match
    basePrompt = basePrompt.replace(/[_\-]/g, ' ');
    // Replace victim/killer tokens with actual name tokens so that they are hydrated properly
    const victim = hydratedCharacters.find(c => c.is_victim);
    const killer = hydratedCharacters.find(c => c.plot_role === 'killer');
    if (victim) {
      const victimName = (victim.name || '').split('|')[0]?.trim();
      basePrompt = basePrompt.replace(/{{victim}}/gi, `{{${victimName}}}`);
    }
    if (killer) {
      const killerName = (killer.name || '').split('|')[0]?.trim();
      basePrompt = basePrompt.replace(/{{killer}}/gi, `{{${killerName}}}`);
    }

    // Pre-wrap any literal character names or guest names in the basePrompt with curly braces
    for (const char of hydratedCharacters) {
      const rawName = char.name || '';
      const cleanName = rawName.split('|')[0]?.trim();
      if (!cleanName) continue;

      const profile = (char.profile_data as any) || {};
      const guestName = profile.name || profile.guest_name || profile.guestName || '';

      const charNameRegex = new RegExp(`(?<!\\{\\{)\\b${cleanName}\\b(?!\\}\\})`, 'gi');
      basePrompt = basePrompt.replace(charNameRegex, `{{${cleanName}}}`);

      if (guestName && guestName.toLowerCase() !== cleanName.toLowerCase()) {
        const guestNameRegex = new RegExp(`(?<!\\{\\{)\\b${guestName}\\b(?!\\}\\})`, 'gi');
        basePrompt = basePrompt.replace(guestNameRegex, `{{${cleanName}}}`);
      }
    }

    // Find involved characters in the clue
    const involvedCharacters = getInvolvedCharacters(clue, hydratedCharacters);

    // Download reference images and construct map
    const referenceImages: any[] = [];
    const charToRefIdMap = new Map<string, number>();
    let refIdCounter = 1;

    for (const char of involvedCharacters) {
      const cleanName = (char.name || '').split('|')[0]?.trim();
      if (!cleanName) continue;

      const aiUrl = extractAiPhotoUrl(char.profile_data?.avatar_url);
      if (aiUrl) {
        try {
          console.log(`[DOWNLOAD REFERENCE] Downloading avatar for ${cleanName} from ${aiUrl}...`);
          const base64Bytes = await getBase64FromUrl(aiUrl);
          
          referenceImages.push({
            referenceId: refIdCounter,
            referenceImage: {
              imageBytes: base64Bytes
            },
            config: {
              referenceType: 'SUBJECT'
            }
          });

          charToRefIdMap.set(cleanName, refIdCounter);
          refIdCounter++;
        } catch (err) {
          console.error(`Failed to fetch/convert avatar url for character ${cleanName}:`, err);
        }
      }
    }

    // Hydrate the prompt with subject references if available
    const hydratedPrompt = hydrateTextWithCharacters(basePrompt, hydratedCharacters, 'ai', charToRefIdMap);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    let finalPrompt = '';
    const charCount = involvedCharacters.length;

    if (isAudio) {
      const lowerPrompt = basePrompt.toLowerCase();
      let device = 'portable digital voice recorder';
      if (lowerPrompt.includes('laptop') || lowerPrompt.includes('computer')) {
        device = 'closed laptop';
      } else if (lowerPrompt.includes('tape') || lowerPrompt.includes('cassette')) {
        device = 'vintage cassette tape recorder';
      }

      let location = 'lying on a dark surface in a dimly lit room';
      if (lowerPrompt.includes('wardrobe') || lowerPrompt.includes('closet')) {
        location = 'partially hidden among clothes inside a dark backstage wardrobe';
      } else if (lowerPrompt.includes('bar') || lowerPrompt.includes('counter')) {
        location = 'resting on a dark, wet bar counter next to an out-of-focus glass';
      } else if (lowerPrompt.includes('dressing') || lowerPrompt.includes('vanity') || lowerPrompt.includes('mirror')) {
        location = 'placed on a cluttered vanity table with lights reflecting off its casing';
      } else if (lowerPrompt.includes('bedroom') || lowerPrompt.includes('bed')) {
        location = 'lying on a bedside table in a dimly lit, moody bedroom';
      } else if (lowerPrompt.includes('desk') || lowerPrompt.includes('office')) {
        location = 'resting on a polished wooden desk in a dark office';
      }

      finalPrompt = `A premium, dramatic, close-up photograph of a ${device} ${location}. The device screen is completely black, dark, off, with absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
    } else if (isCctv) {
      if (charCount === 0) {
        finalPrompt = `A grainy, high-angle CCTV security camera footage frame showing a dimly lit empty corridor, room, backstage area, or alleyway. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO timestamps, NO overlays, and NO writing. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 1) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        finalPrompt = `A grainy, high-angle CCTV security camera footage frame showing ${desc1} in a dimly lit backstage room or hallway: ${hydratedPrompt}. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, cinematic shot, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO timestamps, NO overlays, and NO writing. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 2) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        const cleanName2 = (involvedCharacters[1].name || '').split('|')[0]?.trim();
        const refId2 = charToRefIdMap.get(cleanName2);
        const desc2 = buildCharDescription(involvedCharacters[1], refId2);
        finalPrompt = `A grainy, high-angle CCTV security camera footage frame showing both ${desc1} and ${desc2} in a dimly lit backstage room or hallway: ${hydratedPrompt}. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, cinematic shot, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO timestamps, NO overlays, and NO writing. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else {
        const count = Math.min(involvedCharacters.length, 4);
        let panelPrompts = involvedCharacters.slice(0, count).map((c, idx) => {
          const cleanName = (c.name || '').split('|')[0]?.trim();
          const refId = charToRefIdMap.get(cleanName);
          const desc = buildCharDescription(c, refId);
          return `Panel ${idx + 1} shows a different character: ${desc}`;
        }).join(', ');
        finalPrompt = `A grainy, high-angle CCTV security camera footage frame divided into exactly ${count} separate panels side-by-side. Each panel shows a different character: ${panelPrompts} together in a dimly lit backstage room or hallway: ${hydratedPrompt}. There must be absolutely NO repeated characters, NO duplicate people, and NO extra panels. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, cinematic shot, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO timestamps, NO overlays, and NO writing. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      }
    } else if (isScreen) {
      if (charCount === 0) {
        const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
        finalPrompt = `A premium, dramatic, close-up photograph of a ${device} lying face-down on a dark surface in a dimly lit room, with no screen visible. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 1) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
        finalPrompt = `A professional photograph of ${desc1} looking down at a ${device} held in their hand in a dimly lit room. The ${device} screen is completely black, dark, off, with absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 2) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        const cleanName2 = (involvedCharacters[1].name || '').split('|')[0]?.trim();
        const refId2 = charToRefIdMap.get(cleanName2);
        const desc2 = buildCharDescription(involvedCharacters[1], refId2);
        const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
        finalPrompt = `A professional photograph showing a vertical split-screen. On the left side: a close-up of ${desc1} looking at a ${device} in a dimly lit room. On the right side: a close-up of ${desc2} looking at a ${device} in a dimly lit room. Both ${device} screens are completely black, dark, off, with absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else {
        const count = Math.min(involvedCharacters.length, 4);
        let panelPrompts = involvedCharacters.slice(0, count).map((c, idx) => {
          const cleanName = (c.name || '').split('|')[0]?.trim();
          const refId = charToRefIdMap.get(cleanName);
          const desc = buildCharDescription(c, refId);
          const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
          return `Panel ${idx + 1} shows a different character: ${desc} looking down at a ${device}`;
        }).join('. ');
        const device = basePrompt.toLowerCase().includes('laptop') ? 'laptop' : 'smartphone';
        finalPrompt = `A professional photograph showing a multi-panel collage divided into exactly ${count} separate panels side-by-side. ${panelPrompts}. All ${device} screens are completely black, dark, off, with absolutely NO text, NO writing, NO letters, NO numbers, and NO symbols. Each panel must feature a different character, with absolutely NO repeated characters, NO duplicate people, and NO extra panels. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      }
    } else {
      // General clues
      if (charCount === 0) {
        finalPrompt = `A professional close-up photograph of a clue item: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO writing, NO letters, NO numbers, and NO people. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 1) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        finalPrompt = `A professional photograph of ${desc1} in a dimly lit, moody scene with a clue: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO writing, NO letters, and NO numbers. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else if (charCount === 2) {
        const cleanName1 = (involvedCharacters[0].name || '').split('|')[0]?.trim();
        const refId1 = charToRefIdMap.get(cleanName1);
        const desc1 = buildCharDescription(involvedCharacters[0], refId1);
        const cleanName2 = (involvedCharacters[1].name || '').split('|')[0]?.trim();
        const refId2 = charToRefIdMap.get(cleanName2);
        const desc2 = buildCharDescription(involvedCharacters[1], refId2);
        finalPrompt = `A professional photograph showing a vertical split-screen. On the left side: ${desc1} in a dimly lit scene. On the right side: ${desc2} in a dimly lit scene. The scenes relate to: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO writing, NO letters, and NO numbers. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      } else {
        const count = Math.min(involvedCharacters.length, 4);
        let panelPrompts = involvedCharacters.slice(0, count).map((c, idx) => {
          const cleanName = (c.name || '').split('|')[0]?.trim();
          const refId = charToRefIdMap.get(cleanName);
          const desc = buildCharDescription(c, refId);
          return `Panel ${idx + 1} shows a different character: ${desc} in a dimly lit scene`;
        }).join('. ');
        finalPrompt = `A professional photograph showing a multi-panel collage divided into exactly ${count} separate panels side-by-side. ${panelPrompts}. The scenes relate to: ${hydratedPrompt}. Each panel must feature a different character, with absolutely NO repeated characters, NO duplicate people, and NO extra panels. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. CRITICAL: The image MUST contain absolutely NO text, NO writing, NO letters, and NO numbers. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;
      }
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
      console.log(`[IMAGEN REQUEST] prompt: "${finalPrompt}"`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${apiKey}`;
      const payload = {
        instances: [
          {
            prompt: finalPrompt,
            ...(referenceImages.length > 0 ? { reference_images: referenceImages } : {})
          }
        ],
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

      if (res) {
        console.log(`[IMAGEN RESPONSE] status: ${res.status}`);
        const responseText = await res.text();
        if (res.ok) {
          try {
            const data = JSON.parse(responseText);
            base64Image = data.predictions?.[0]?.bytesBase64Encoded;
            if (!base64Image) {
              console.warn(`[IMAGEN WARNING] No base64 image in predictions! Response:`, responseText);
            }
          } catch (e) {
            console.error(`[IMAGEN ERROR] Failed to parse JSON response:`, responseText);
          }
        } else {
          console.error(`[IMAGEN ERROR] Response not OK! Body:`, responseText);
        }
      } else {
        console.error(`[IMAGEN ERROR] Fetch returned undefined/null response!`);
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
    if (avatarConfig.hairLength) {
      const hl = avatarConfig.hairLength;
      const ht = avatarConfig.hairTexture || 'Straight';
      if (hl === 'Bald') hairStr = 'who is bald';
      else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) hairStr = `wearing a ${hl.toLowerCase()}`;
      else hairStr = `with ${hl.toLowerCase()} length, ${ht.toLowerCase()} texture hair`;
    } else {
      if (avatarConfig.top === 'none') hairStr = 'who is bald';
      else if (avatarConfig.top) hairStr = `with ${avatarConfig.top.replace(/([A-Z])/g, ' $1').toLowerCase()} hair`;
    }
    
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
