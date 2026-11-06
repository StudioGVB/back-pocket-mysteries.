'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAiUsage } from '@/utils/ai-logger';
import { createClient } from '@/utils/supabase/server';
import {
  hydrateTextWithCharacters,
  getCharacterRoleTitle,
  getCharacterDisplayName,
  getGuestPhysicalDescription,
  getCharacterCandidateKeys,
  findInvolvedCharactersInText,
} from '@/utils/hydration';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { inferClueFormat } from '@/utils/clue-format';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

const CURATED_GUEST_QUIRKS = [
  'Obsessed with bananas',
  'Addicted to iced coffee',
  'Terrified of pigeons',
  'Puts hot sauce on everything',
  'Brings up their air fryer constantly',
  'Always losing their keys',
  'Thinks they can speak to cats',
  'Secretly loves cheesy 80s pop',
  'Never goes anywhere without chapstick',
  'Obsessed with sourdough bread',
  'Terrified of moths',
  'Orders the exact same meal every time',
  'Collects weird souvenir mugs',
  'Drinks way too much sparkling water',
  'Checks their horoscope every morning',
  'Always cold even in summer',
  'Refuses to eat green vegetables',
  'Obsessed with true crime podcasts',
  'Always carries emergency snacks',
  'Cannot resist a bargain bin',
  'Takes 50 photos of their food',
  'Constantly quoting 90s movies',
  'Has strong opinions about fonts',
  'Terrified of ventriloquist dummies',
  'Eats dessert before dinner',
  'Obsessed with houseplants',
  'Always chewing peppermint gum',
  'Convinced they saw a UFO once',
  'Loves terrible dad jokes',
  'Hoards hotel mini shampoos',
  'Leaves 47 browser tabs open',
  'Obsessed with pickle-flavored snacks',
  'Wears sunglasses indoors',
  'Can name every dog breed on sight',
  'Secretly afraid of the dark',
  'Addicted to crossword puzzles',
];

export async function generateRandomQuirk(name: string, gender: string, existingQuirks: string[] = []) {
  const normalizedExisting = new Set(existingQuirks.map(q => q.toLowerCase().trim()));
  const pickCuratedFallback = () => {
    const available = CURATED_GUEST_QUIRKS.filter(q => !normalizedExisting.has(q.toLowerCase()));
    const pool = available.length > 0 ? available : CURATED_GUEST_QUIRKS;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return pickCuratedFallback();
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const characterDescription = name ? `${name} (${gender})` : `a ${gender} guest`;
  const avoidClause = existingQuirks.length > 0
    ? `\nDo NOT repeat or closely resemble any of these already-selected quirks: ${existingQuirks.map(q => `"${q}"`).join(', ')}.`
    : '';

  const prompt = `Generate a single, short, funny, concrete personal obsession, food craving, irrational fear, or everyday habit for ${characterDescription} that can easily be woven into a murder mystery clue, text message, or dialogue line later (for example, if someone "Loves bananas", a text clue might say "What I would do for a banana right now").
Keep it between 3 and 6 words. Make it specific, concrete, and relatable — NOT a plot spoiler or vague personality label.
Great examples: "Obsessed with bananas", "Addicted to iced coffee", "Terrified of pigeons", "Puts hot sauce on everything", "Brings up their air fryer constantly", "Always losing their keys", "Thinks they can speak to cats", "Obsessed with sourdough bread".${avoidClause}
Respond with ONLY the quirk itself, no quotes, no period at the end, and do not include the person's name.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_random_quirk'
    });

    const cleaned = response.text().trim().replace(/^["']|["']$/g, '').replace(/\.$/, '').trim();
    if (!cleaned || normalizedExisting.has(cleaned.toLowerCase())) {
      return pickCuratedFallback();
    }
    return cleaned;
  } catch (error) {
    console.error('Error generating quirk:', error);
    return pickCuratedFallback();
  }
}

export async function generateCluePreview(prompt: string, templateText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const systemInstruction = `You are a mystery game clue generator. Based on the provided prompt and template, generate the text for a single clue. Output ONLY the generated clue content, do not add any conversational fluff. Keep it concise, engaging, and in-character for a murder mystery. NEVER invent fake person names; preserve any {{Role Title}} tokens.`;

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

  const prompt = `You are an expert murder mystery designer. The user needs to create an atmospheric AI photography prompt for a clue/evidence that reveals or relates to the following story beat:
"${beatTitle}"

Suggest exactly 2 distinct ideas for what this scene or physical evidence prop could be, and write them as detailed atmospheric visual prompts for an AI image generator.
Use the placeholder {{VICTIM}} and {{KILLER}} if appropriate.

CRITICAL ZERO-TEXT RULE: Visual prompts MUST NEVER request readable text, paper notes with ink, blank sheets of paper, phone screens, or paper receipts. The AI only provides atmospheric crime scene photography:
- For chat/conversation clues: describe cinematic scene atmosphere (e.g., "two people sitting in a moody cocktail lounge whispering, cinematic lighting, 35mm film grain").
- For receipt/document/evidence clues: describe physical crime scene props (e.g., "a crystal coupe glass with a dark red stain sitting on a vintage mahogany bar counter under warm amber lamplight").

Example Beat: "The affair is discovered"
Output:
1. A crystal coupe glass with a dark crimson lipstick stain sitting on a vintage mahogany bar counter under warm amber lamplight, shallow depth of field, 35mm film grain, 8k.
2. A cinematic photograph of {{KILLER}} and {{VICTIM}} sitting in a moody cocktail lounge whispering in the shadows under warm neon reflections, 35mm film grain, dramatic low-key lighting, 8k.

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
      suggestions.push("A crystal coupe glass with a dark red stain sitting on a vintage mahogany bar counter under warm amber lamplight, 35mm film grain.");
      if (suggestions.length < 2) suggestions.push("Two people sitting in a moody cocktail lounge whispering in the shadows, cinematic lighting, 35mm film grain.");
    }
    return suggestions;
  } catch (error) {
    console.error('Error suggesting clue prompts:', error);
    return [
      "A crystal coupe glass with a dark red stain sitting on a vintage mahogany bar counter under warm amber lamplight, 35mm film grain.",
      "Two people sitting in a moody cocktail lounge whispering in the shadows, cinematic lighting, 35mm film grain."
    ];
  }
}

export async function generateClueDescriptionAction(
  title: string,
  beatTitle: string,
  generationPrompt: string,
  format?: string
): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const resolvedFormat =
    format ||
    inferClueFormat({
      title,
      generation_prompt: generationPrompt,
    });

  let formatInstructions = `Write a concise, atmospheric 2 to 4 sentence forensic evidence description suitable for a physical crime scene prop.`;

  if (resolvedFormat === 'chat') {
    formatInstructions = `Format the output as an authentic 3 to 5 message SMS / DM thread using this exact line format:
[10:42 PM] {{The Ex}}: Message text here
[10:44 PM] {{The Sister}}: Reply text here
[Status: SEEN]
Keep the messages punchy, dramatic, and in-character.`;
  } else if (resolvedFormat === 'receipt') {
    formatInstructions = `Format the output as an itemized store/bar receipt using this exact line format:
Venue: THE VELVET LOUNGE
Date: 11:18 PM
1x Vintage Champagne $140.00
2x Midnight Espresso Martini $44.00
1x VIP Room Service Charge $35.00
Note: A brief 1-sentence forensic observation about which {{Role Title}} signed or left the receipt.`;
  } else if (resolvedFormat === 'document') {
    formatInstructions = `Format the output as an official forensic dossier, medical record, or recovered note using structured metadata lines followed by a short body:
SUBJECT: ${title}
DATE: 11:15 PM
STATUS: CONFIDENTIAL EXHIBIT
Write 2 to 3 sentences of damning investigative findings or recovered text.`;
  } else if (resolvedFormat === 'cctv') {
    formatInstructions = `Format the output as a security camera log using this exact structure:
Header: SECURITY CAM STILL • BACKSTAGE
Timestamp: 11:42 PM
Visual: Write 1 to 2 sentences describing the suspicious movement or confrontation captured on the grainy surveillance frame.`;
  } else if (resolvedFormat === 'audio') {
    formatInstructions = `Format the output as an intercepted multi-speaker voice recording transcript (2 to 4 spoken lines) so it can be synthesized into audio:
Recording Duration: 24.5 Seconds
{{The Ex}}: "First spoken dialogue line with tension..."
{{The Sister}}: "Sharp spoken response revealing a secret..."
{{The Ex}}: "Final damning line before the recording cuts."`;
  }

  const prompt = `You are a mystery game designer writing the structured content for a clue/evidence exhibit.
Clue Title: "${title}"
Clue Format: "${resolvedFormat}"
Story Beat: "${beatTitle}"
Context / Prompt: "${generationPrompt}"

${formatInstructions}

CRITICAL NAMING RULE: NEVER invent fake person names or nicknames. Always preserve and use the exact bracketed character tokens (e.g., {{The Sister}}, {{The Ex}}, {{The Reality TV Queen}}) present in the title, beat, or prompt.
CRITICAL: Output ONLY the raw clue content itself following the format above. No markdown code fences, no introduction, no conversational filler.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;

    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'generate_clue_description'
    });

    return response.text().trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
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

  // Check for any of the mystery's character role titles, guest names, or legacy names
  for (const char of characters) {
    const roleTitle = getCharacterRoleTitle(char);
    const cleanName = (char.name || '').split('|')[0]?.trim();
    const candidates = [roleTitle, cleanName].filter(Boolean);

    for (const candidate of candidates) {
      const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const tokenRegex = new RegExp(`\\{\\{${escaped}\\}\\}`, 'i');
      const wordRegex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (
        tokenRegex.test(title) || tokenRegex.test(desc) || tokenRegex.test(prompt) ||
        wordRegex.test(title) || wordRegex.test(desc) || wordRegex.test(prompt)
      ) {
        return true;
      }
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

function getCharacterOutfitDescription(char: any): string {
  const profile = char?.profile_data || {};
  const genderStr = (char?.gender || profile.gender || '').toLowerCase();
  let outfit = profile.outfit_advice || '';
  if (!outfit) {
    const pres = genderStr.includes('female') || genderStr === 'f'
      ? profile.presentation_female
      : profile.presentation_male;
    if (pres?.outfit_advice) {
      outfit = pres.outfit_advice;
    }
  }
  if (!outfit && profile.act_summary) {
    outfit = `attire fitting ${profile.act_summary}`;
  }
  return (outfit || 'tailored evening attire fitting their character persona').trim();
}

function getDeterministicFacialStructure(seedSource: string) {
  let seed = 0;
  for (let i = 0; i < seedSource.length; i++) {
    seed = ((seed << 5) - seed) + seedSource.charCodeAt(i);
    seed |= 0;
  }
  const absSeed = Math.abs(seed);
  const faceShapes = ['oval face shape', 'angular square jawline', 'heart-shaped face', 'defined diamond face structure', 'soft round facial structure', 'long sculpted face'];
  const jawlines = ['sharp defined jawline', 'softly tapered chin', 'strong prominent jaw', 'delicate chin and jaw'];
  const cheekbones = ['high prominent cheekbones', 'subtle natural cheekbones', 'broad cheekbones', 'sculpted cheekbones'];
  const noseShapes = ['straight bridge nose', 'subtle aquiline nose', 'broad nose bridge', 'upturned button nose', 'slender defined nose'];

  return {
    faceShape: faceShapes[absSeed % faceShapes.length],
    jawline: jawlines[(absSeed >> 3) % jawlines.length],
    cheekbones: cheekbones[(absSeed >> 6) % cheekbones.length],
    noseShape: noseShapes[(absSeed >> 9) % noseShapes.length],
  };
}

function computeCharacterIdentityHash(char: any, mystery?: any): string {
  const profile = char?.profile_data || {};
  const genderStr = char?.gender || profile.gender || '';
  const physicalDesc = getGuestPhysicalDescription(profile, genderStr);
  const outfit = getCharacterOutfitDescription(char);
  const roleTitle = getCharacterRoleTitle(char);
  const displayName = getCharacterDisplayName(char);
  const guestHeadshot = extractAiPhotoUrl(profile.avatar_url) || profile.avatar_url || '';
  const payload = JSON.stringify({
    charId: char?.id || '',
    roleTitle,
    displayName,
    genderStr,
    physicalDesc,
    outfit,
    guestHeadshot,
    theme: mystery?.theme || '',
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

async function hydrateCharactersWithGuests(characters: any[], hostId: string | null | undefined, supabase: any): Promise<any[]> {
  const guestMap = new Map<string, any>();

  // 1. Static mock guests
  for (const mg of getStaticMockGuests()) {
    guestMap.set(mg.id, mg);
  }

  // 2. Database mock guests
  try {
    const { data: rpcMocks } = await (supabase as any).rpc('get_mock_guests');
    if (Array.isArray(rpcMocks)) {
      for (const mg of rpcMocks) {
        guestMap.set(mg.id, mg);
      }
    }
  } catch {
    // ignore if RPC unavailable
  }

  // 3. Host's custom guests
  if (hostId) {
    const { data: guests } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', hostId);
    if (Array.isArray(guests)) {
      for (const guest of guests) {
        guestMap.set(guest.id, guest);
      }
    }
  }

  return characters.map(char => {
    const rawProfile = (char.profile_data as any) || {};
    const guestId = rawProfile.guest_id;
    const guest = guestId ? guestMap.get(guestId) : null;

    if (guest) {
      return {
        ...char,
        raw_profile_data: rawProfile,
        gender: guest.gender || char.gender || rawProfile.gender,
        profile_data: {
          ...rawProfile,
          avatar_url: guest.avatar_url || rawProfile.avatar_url,
          eye_color: guest.eye_color || rawProfile.eye_color,
          height: guest.height || rawProfile.height,
          build: guest.build || rawProfile.build,
          ethnicity: guest.ethnicity || rawProfile.ethnicity,
          age: guest.age || rawProfile.age,
          accent: guest.accent || rawProfile.accent,
          guest_name: guest.name || rawProfile.guest_name || rawProfile.name,
        },
      };
    }

    return {
      ...char,
      raw_profile_data: rawProfile,
    };
  });
}

/**
 * STAGE 1: Ensures a character has a canonical "Standard Character Reference Photo"
 * combining the assigned guest's physical traits + headshot with the character's role & outfit.
 * This standard photo is persisted on the character and reused as the visual reference in all clue scenes.
 */
export async function ensureStandardCharacterPhoto(
  char: any,
  mystery: any,
  supabase: any,
  forceRegenerate = false
): Promise<{
  photoUrl: string | null;
  identityHash: string;
  physicalDesc: string;
  outfit: string;
}> {
  const profile = char.profile_data || {};
  const rawProfile = char.raw_profile_data || profile;
  const genderStr = char.gender || profile.gender || 'unspecified';
  const physicalDesc = getGuestPhysicalDescription(profile, genderStr);
  const outfit = getCharacterOutfitDescription(char);
  const identityHash = computeCharacterIdentityHash(char, mystery);

  const existingStandardUrl = profile.standard_character_photo_url || rawProfile.standard_character_photo_url;
  const existingHash = profile.standard_character_photo_hash || rawProfile.standard_character_photo_hash;

  // Reuse existing standard character photo if it matches the current guest + character identity hash
  if (!forceRegenerate && existingStandardUrl && existingHash === identityHash) {
    return {
      photoUrl: existingStandardUrl,
      identityHash,
      physicalDesc,
      outfit,
    };
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return {
      photoUrl: existingStandardUrl || extractAiPhotoUrl(profile.avatar_url) || char.image_url || null,
      identityHash,
      physicalDesc,
      outfit,
    };
  }

  const roleTitle = getCharacterRoleTitle(char);
  const guestName = getCharacterDisplayName(char);
  const seedKey = `${profile.guest_id || char.id}-${guestName}-${roleTitle}`;
  const bones = getDeterministicFacialStructure(seedKey);

  // Check if the guest already has an AI face headshot we can pass as an inline reference
  const guestHeadshotUrl = extractAiPhotoUrl(profile.avatar_url);
  const referenceParts: any[] = [];
  if (guestHeadshotUrl && guestHeadshotUrl !== existingStandardUrl) {
    try {
      const headshotBase64 = await getBase64FromUrl(guestHeadshotUrl);
      referenceParts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: headshotBase64,
        },
      });
    } catch (err) {
      console.warn(`[STANDARD CHAR PHOTO] Could not fetch guest headshot for ${guestName}, using full physical trait synthesis:`, err);
    }
  }

  const mysteryTheme = mystery?.theme
    ? `${mystery.theme} (${mystery?.title || 'Murder Mystery'})`
    : mystery?.title || 'a classic noir murder mystery';

  const bioSnippet = profile.act_summary || profile.bio || '';

  const standardPortraitPrompt = `Create a canonical photorealistic STANDARD CHARACTER REFERENCE PORTRAIT (waist-up 3/4 studio character portrait) that will serve as the master visual identity reference for this character across all crime scene photos.

CHARACTER ROLE: "${roleTitle}" (played by ${guestName}) in ${mysteryTheme}.
${bioSnippet ? `CHARACTER VIBE / PERSONA: ${bioSnippet}` : ''}

STRICT PHYSICAL APPEARANCE (MUST MATCH EXACTLY):
- ${physicalDesc || `${genderStr} adult with distinctive natural facial features`}
- Facial structure: ${bones.faceShape}, ${bones.jawline}, ${bones.cheekbones}, ${bones.noseShape}
${referenceParts.length > 0 ? '- CRITICAL: An existing face photo of the guest is attached as Reference Image #1. Preserve the exact same person, facial identity, bone structure, skin tone, eye shape, and hair from the attached photo while dressing them in the character outfit below.' : ''}

SIGNATURE CHARACTER COSTUME & STYLING (MUST WEAR THIS EXACT OUTFIT):
- ${outfit}

PHOTOGRAPHY & FRAMING DIRECTIVES:
- Waist-up portrait facing the camera, natural poised expression in character, clear unobstructed view of their face, hair, accessories, and upper-body outfit.
- Atmospheric softly lit studio backdrop with subtle ${mystery?.theme || 'cinematic'} tones so the character's face and costume details are crystal clear.
- Shot on 85mm prime lens, f/2.8, photorealistic natural skin texture, 8k resolution.
- CRITICAL: Absolutely NO text, NO labels, NO character sheets, NO multiple panels, NO borders, NO illustrations, NO 3D CGI.`;

  console.log(`[STAGE 1: STANDARD CHAR PHOTO] Generating canonical reference photo for ${guestName} (${roleTitle})...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      {
        parts: [
          ...referenceParts,
          { text: standardPortraitPrompt },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['IMAGE'],
    },
  };

  let res: Response | undefined;
  let retries = 0;
  while (retries < 3) {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.status === 429 || res.status === 403) {
      retries++;
      await new Promise(r => setTimeout(r, 2000 * retries));
      continue;
    }
    break;
  }

  let base64Image = '';
  let usageMetadata: any = null;
  if (res && res.ok) {
    try {
      const data = await res.json();
      usageMetadata = data.usageMetadata || null;
      const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
      base64Image = imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
    } catch (e) {
      console.error('[STAGE 1: STANDARD CHAR PHOTO] Error parsing response:', e);
    }
  } else if (res) {
    console.error(`[STAGE 1: STANDARD CHAR PHOTO] Gemini error (${res.status}):`, await res.text());
  }

  if (!base64Image) {
    const fallbackUrl = existingStandardUrl || guestHeadshotUrl || char.image_url || null;
    return {
      photoUrl: fallbackUrl,
      identityHash,
      physicalDesc,
      outfit,
    };
  }

  await logAiUsage({
    model_name: 'gemini-2.5-flash-image',
    feature_name: 'generate_standard_character_photo',
    mystery_id: mystery?.id,
    usageMetadata,
  });

  // Upload to Supabase Storage (`character-images` bucket)
  const fileBuffer = Buffer.from(base64Image, 'base64');
  const fileName = `standard-characters/${mystery?.id || 'global'}/${char.id}-${identityHash.slice(0, 12)}-${Date.now()}.jpg`;
  let finalPhotoUrl = `data:image/jpeg;base64,${base64Image}`;

  const { error: uploadError } = await supabase.storage
    .from('character-images')
    .upload(fileName, fileBuffer, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (!uploadError) {
    const { data: publicUrlData } = supabase.storage
      .from('character-images')
      .getPublicUrl(fileName);
    if (publicUrlData?.publicUrl) {
      finalPhotoUrl = publicUrlData.publicUrl;
    }
  } else {
    console.warn('[STAGE 1: STANDARD CHAR PHOTO] Storage upload failed, falling back to data URI:', uploadError.message);
  }

  // Persist standard_character_photo_url and hash on the character record
  const updatedRawProfile = {
    ...rawProfile,
    standard_character_photo_url: finalPhotoUrl,
    standard_character_photo_hash: identityHash,
    outfit_image_url: finalPhotoUrl,
  };

  await supabase
    .from('characters')
    .update({
      image_url: finalPhotoUrl,
      profile_data: updatedRawProfile,
    })
    .eq('id', char.id);

  // Update in-memory character object for downstream clue scene generation
  char.image_url = finalPhotoUrl;
  char.raw_profile_data = updatedRawProfile;
  char.profile_data = {
    ...profile,
    standard_character_photo_url: finalPhotoUrl,
    standard_character_photo_hash: identityHash,
    outfit_image_url: finalPhotoUrl,
  };

  return {
    photoUrl: finalPhotoUrl,
    identityHash,
    physicalDesc,
    outfit,
  };
}

/**
 * Server Action to explicitly generate or refresh a character's Standard Character Reference Photo
 * from their assigned guest's physical description + character outfit.
 */
export async function generateStandardCharacterPhotoAction(
  mysteryId: string,
  characterId: string,
  forceRegenerate = true
): Promise<{ success?: boolean; imageUrl?: string | null; identityHash?: string; error?: string }> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured' };
  }

  try {
    const supabase = await createClient();

    const { data: mystery, error: mysteryError } = await supabase
      .from('mysteries')
      .select('id, created_by, title, theme, description')
      .eq('id', mysteryId)
      .single();

    if (mysteryError || !mystery) {
      return { error: mysteryError?.message || 'Mystery not found' };
    }

    const { data: charData, error: charError } = await supabase
      .from('characters')
      .select('id, name, gender, image_url, profile_data, is_victim, plot_role')
      .eq('id', characterId)
      .eq('mystery_id', mysteryId)
      .single();

    if (charError || !charData) {
      return { error: charError?.message || 'Character not found' };
    }

    const [hydratedChar] = await hydrateCharactersWithGuests([charData], mystery.created_by, supabase);
    const result = await ensureStandardCharacterPhoto(hydratedChar, mystery, supabase, forceRegenerate);

    if (!result.photoUrl) {
      return { error: 'Failed to generate standard character photo' };
    }

    revalidatePath(`/builder/mysteries/${mysteryId}/characters`);
    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    return {
      success: true,
      imageUrl: result.photoUrl,
      identityHash: result.identityHash,
    };
  } catch (err: any) {
    console.error('generateStandardCharacterPhotoAction error:', err);
    return { error: err.message || 'Unexpected error generating standard character photo' };
  }
}

function getInvolvedCharacters(clue: any, characters: any[], livePromptText?: string): any[] {
  const involved = new Set<any>();

  // 1. Scan the live visual prompt (or saved generation_prompt) first — this is the primary source of truth for what should be in the image
  const promptSource = [livePromptText, clue.generation_prompt, clue.title].filter(Boolean).join('\n');
  for (const char of findInvolvedCharactersInText(promptSource, characters)) {
    involved.add(char);
  }

  // 2. Check if there are active speaker/sender/recipient markers in the clue description
  const desc = clue.description || '';
  const activeTokens = new Set<string>();
  const lines = desc.split('\n').map((l: string) => l.trim());
  
  for (const line of lines) {
    const srMatch = line.match(/^(?:Sender|Recipient|Speakers|Handle|Account|Posted by):\s*(?:\{\{)?([^\}]+?)(?:\}\})?(?:\s*\||$)/i);
    if (srMatch) {
      activeTokens.add(srMatch[1].trim().toLowerCase());
    }

    const chatMatch = line.match(/^\[[^\]]+\]\s*(?:\{\{)?([^\}]+?)(?:\}\})?:\s*/i);
    if (chatMatch) {
      activeTokens.add(chatMatch[1].trim().toLowerCase());
    }
  }

  if (activeTokens.size > 0) {
    for (const char of characters) {
      const candidates = getCharacterCandidateKeys(char).map(k => k.toLowerCase());
      const matchesActive = Array.from(activeTokens).some(token =>
        candidates.some(c => c && (token === c || token.includes(c) || c.includes(token)))
      );
      if (matchesActive) {
        involved.add(char);
      }
    }
  }

  // 3. Also scan the description text for any mentioned characters if none were found yet or if it's a visual scene clue
  const descMatches = findInvolvedCharactersInText(desc, characters);
  if (involved.size === 0 || (clue.format !== 'chat' && clue.format !== 'audio')) {
    for (const char of descMatches) {
      involved.add(char);
    }
  }

  return Array.from(involved);
}

function buildCharDescription(char: any, refId?: number): string {
  const profile = char.profile_data || {};
  const guestName = getCharacterDisplayName(char);
  const roleTitle = getCharacterRoleTitle(char);
  const genderStr = char.gender || profile.gender || '';

  const desc = getGuestPhysicalDescription(profile, genderStr);
  const outfit = getCharacterOutfitDescription(char);

  let mergedDesc = desc;
  if (outfit) {
    mergedDesc = desc ? `${desc}, wearing their signature outfit: ${outfit}` : `wearing their signature outfit: ${outfit}`;
  }

  const refStr = refId !== undefined ? `MUST MATCH Reference Image #${refId} [subject ${refId}]` : '';

  let details = '';
  if (refStr && mergedDesc) {
    details = `(${refStr} — ${mergedDesc})`;
  } else if (refStr) {
    details = `(${refStr})`;
  } else if (mergedDesc) {
    details = `(${mergedDesc})`;
  }

  const label = guestName && guestName !== roleTitle ? `${guestName} (${roleTitle})` : guestName;
  return details ? `${label} ${details}` : label;
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
      .select('id, created_by, title, theme, description')
      .eq('id', mysteryId)
      .single();

    if (mysteryError || !mystery) {
      throw new Error(mysteryError?.message || 'Mystery not found');
    }

    const mysterySetting = mystery.theme
      ? `${mystery.theme} setting (${mystery.title || 'the mystery venue'})`
      : mystery.title || 'a moody luxury mystery setting';

    // Direct select of characters
    const { data: charactersData, error: charError } = await supabase
      .from('characters')
      .select('id, name, gender, image_url, profile_data, is_victim, plot_role')
      .eq('mystery_id', mysteryId);
    
    if (charError) {
      console.error('Error fetching characters directly in generator:', charError);
    }
    const characters = charactersData || [];

    // Hydrate characters with their assigned guest's physical traits & avatar
    const hydratedCharacters = await hydrateCharactersWithGuests(characters, mystery.created_by, supabase);
    
    // Fetch the full clue record to check its format
    const { data: clue, error: clueError } = await supabase
      .from('clues')
      .select('*')
      .eq('id', clueId)
      .single();

    if (clueError || !clue) {
      throw new Error(clueError?.message || 'Clue not found');
    }

    const clueFormat = (clue as any).format || inferClueFormat(clue);

    // Determine the base prompt to use (preferring the live promptText from editor if provided)
    let basePrompt = promptText?.trim() || clue.generation_prompt?.trim() || clue.title || '';
    // Clean up any quotes or text inside the base prompt
    basePrompt = basePrompt.replace(/"[^"]*"/g, '').replace(/'[^']*'/g, '').trim();
    // Strip words that might cause the AI to draw paper notes, receipts, text, or phone screens
    basePrompt = basePrompt
      .replace(/\b(receipt|bar tab|invoice|document|dossier|lab report|police report|handwritten|sticky note|crumpled note|note|letter|paper|stationery|text message|sms|screengrab|screenshot|smartphone|phone screen|written|writing|printed|text)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Replace victim/killer tokens with actual role title tokens so that they are hydrated properly
    const victim = hydratedCharacters.find(c => c.is_victim);
    const killer = hydratedCharacters.find(c => c.plot_role === 'killer');
    if (victim) {
      const victimTitle = getCharacterRoleTitle(victim);
      basePrompt = basePrompt.replace(/{{victim}}/gi, `{{${victimTitle}}}`);
    }
    if (killer) {
      const killerTitle = getCharacterRoleTitle(killer);
      basePrompt = basePrompt.replace(/{{killer}}/gi, `{{${killerTitle}}}`);
    }

    // Pre-wrap any literal character role titles, legacy names, or guest names in the basePrompt with curly braces
    for (const char of hydratedCharacters) {
      const roleTitle = getCharacterRoleTitle(char);
      const candidates = getCharacterCandidateKeys(char);
      for (const candidate of candidates) {
        const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!\\{\\{)\\b${escaped}\\b(?!\\}\\})`, 'gi');
        basePrompt = basePrompt.replace(regex, `{{${roleTitle}}}`);
      }
    }

    // Find involved characters in the clue (scanning live promptText + clue fields)
    const involvedCharacters = getInvolvedCharacters(clue, hydratedCharacters, promptText).slice(0, 4);

    // STAGE 1 -> STAGE 2 BRIDGE:
    // For every character in this scene, ensure their canonical Standard Character Photo exists first,
    // then download it to pass as an inline subject reference image to Gemini.
    const referenceImages: Array<{
      referenceId: number;
      referenceImage: { imageBytes: string };
      config: { referenceType: string };
      char: any;
      standardPhoto: {
        photoUrl: string | null;
        identityHash: string;
        physicalDesc: string;
        outfit: string;
      };
    }> = [];
    const charToRefIdMap = new Map<string, number>();
    let refIdCounter = 1;

    for (const char of involvedCharacters) {
      const roleTitle = getCharacterRoleTitle(char);
      const candidates = getCharacterCandidateKeys(char);
      if (!roleTitle && candidates.length === 0) continue;

      const standardPhoto = await ensureStandardCharacterPhoto(char, mystery, supabase, false);
      const refPhotoUrl = standardPhoto.photoUrl || extractAiPhotoUrl(char.profile_data?.avatar_url);

      if (refPhotoUrl) {
        try {
          console.log(`[STAGE 2: SCENE REFERENCE] Loading Standard Character Photo #${refIdCounter} for ${roleTitle} from ${refPhotoUrl.slice(0, 80)}...`);
          const base64Bytes = await getBase64FromUrl(refPhotoUrl);

          referenceImages.push({
            referenceId: refIdCounter,
            referenceImage: {
              imageBytes: base64Bytes,
            },
            config: {
              referenceType: 'SUBJECT',
            },
            char,
            standardPhoto,
          });

          if (roleTitle) charToRefIdMap.set(roleTitle, refIdCounter);
          for (const candidate of candidates) {
            charToRefIdMap.set(candidate, refIdCounter);
          }
          refIdCounter++;
        } catch (err) {
          console.error(`Failed to load standard character photo for ${roleTitle}:`, err);
        }
      }
    }

    // Hydrate the prompt with subject references if available
    const hydratedPrompt = hydrateTextWithCharacters(basePrompt, hydratedCharacters, 'ai', charToRefIdMap);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    let finalPrompt = '';
    const charCount = involvedCharacters.length;
    const zeroTextRule = `CRITICAL: The image MUST contain absolutely NO text, NO readable letters, NO numbers, NO paper notes, NO receipts, NO phone screens, NO timestamps, and NO overlays. Absolutely NO 3D renders, NO CGI, NO cartoons, NO illustrations, NO stylized art.`;

    const getRefId = (char: any) =>
      charToRefIdMap.get(getCharacterRoleTitle(char)) ??
      charToRefIdMap.get((char.name || '').split('|')[0]?.trim());

    // Build Strict Character Consistency Manifest binding each attached Standard Character Photo to its character in the scene
    const referenceManifest = referenceImages.length > 0
      ? `\n\nCHARACTER VISUAL CONSISTENCY LOCK (MANDATORY):
You are provided ${referenceImages.length} canonical Standard Character Reference Photo(s) attached in order. Every character depicted in this scene MUST look 100% identical to their attached Standard Character Reference Photo — preserve their exact facial identity, bone structure, age, skin tone, hair color/style, glasses/accessories, body build, and their exact signature costume:\n` +
        referenceImages.map(ref => {
          const name = getCharacterDisplayName(ref.char);
          const role = getCharacterRoleTitle(ref.char);
          return `- Attached Reference Image #${ref.referenceId} (subject [${ref.referenceId}]): ${name} (${role}) — Physical traits: ${ref.standardPhoto.physicalDesc || 'match reference photo exactly'}. Signature outfit: ${ref.standardPhoto.outfit}.`;
        }).join('\n')
      : '';

    if (clueFormat === 'audio' && charCount === 0) {
      const lowerPrompt = (clue.generation_prompt || clue.title || '').toLowerCase();
      let location = `resting on a vintage surface inside ${mysterySetting}`;
      if (lowerPrompt.includes('bar') || lowerPrompt.includes('counter')) {
        location = `resting on a dark bar counter next to an out-of-focus crystal glass inside ${mysterySetting}`;
      } else if (lowerPrompt.includes('desk') || lowerPrompt.includes('office')) {
        location = `resting on a polished mahogany desk in a shadowed corner of ${mysterySetting}`;
      }

      finalPrompt = `A cinematic, atmospheric crime scene close-up photograph of a sleek vintage brass and black metal microphone and analog tape reel ${location}. Moody low-key lighting, warm amber shadows, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}`;
    } else if (clueFormat === 'cctv') {
      if (charCount === 0) {
        finalPrompt = `An overhead security camera angle inside ${mysterySetting}, grainy surveillance still showing an atmospheric corridor or lounge area: ${hydratedPrompt || 'dimly lit crime scene area'}. Gritty noir aesthetic, low-key lighting, high contrast, atmospheric shadows, 8k resolution. ${zeroTextRule}`;
      } else if (charCount === 1) {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        finalPrompt = `An overhead security camera angle inside ${mysterySetting}, grainy surveillance footage still showing ${desc1} in the scene: ${hydratedPrompt}. Gritty noir surveillance aesthetic, high angle, low-key lighting, high contrast, atmospheric shadows, cinematic shot, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      } else if (charCount === 2) {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        const desc2 = buildCharDescription(involvedCharacters[1], getRefId(involvedCharacters[1]));
        finalPrompt = `An overhead security camera angle inside ${mysterySetting}, grainy surveillance footage still showing both ${desc1} and ${desc2} in the scene: ${hydratedPrompt}. Gritty noir surveillance aesthetic, high angle, low-key lighting, high contrast, atmospheric shadows, cinematic shot, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      } else {
        const count = Math.min(involvedCharacters.length, 4);
        const panelPrompts = involvedCharacters.slice(0, count).map((c, idx) => {
          const desc = buildCharDescription(c, getRefId(c));
          return `Subject ${idx + 1}: ${desc}`;
        }).join('; ');
        finalPrompt = `An overhead wide-angle security camera still inside ${mysterySetting} showing ${panelPrompts} in the scene: ${hydratedPrompt}. Gritty noir surveillance aesthetic, low-key lighting, high contrast, atmospheric shadows, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      }
    } else if (clueFormat === 'social_post') {
      if (charCount === 0) {
        finalPrompt = `A candid party photograph taken at ${mysterySetting}: ${hydratedPrompt || 'glamorous party scene with champagne glasses and moody lighting'}. Candid flash photography aesthetic, shallow depth of field, 35mm film grain, 8k resolution. ${zeroTextRule}`;
      } else if (charCount === 1) {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        finalPrompt = `A candid social media party photograph taken inside ${mysterySetting} featuring ${desc1}: ${hydratedPrompt}. Candid flash photography aesthetic, expressive in-character pose, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      } else {
        const charDescriptions = involvedCharacters.map(c => buildCharDescription(c, getRefId(c))).join(' and ');
        finalPrompt = `A candid social media party photograph taken inside ${mysterySetting} featuring ${charDescriptions}: ${hydratedPrompt}. Candid flash photography aesthetic, expressive in-character interaction, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      }
    } else if (clueFormat === 'chat') {
      if (charCount === 0) {
        finalPrompt = `A cinematic crime scene atmosphere photograph inside ${mysterySetting}: two people sitting in a moody cocktail lounge whispering in the shadows, cinematic lighting, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}`;
      } else if (charCount === 1) {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        finalPrompt = `A cinematic photograph of ${desc1} inside ${mysterySetting}: ${hydratedPrompt || 'sitting in a moody lounge glancing over their shoulder in secretive conversation'}. Cinematic lighting, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      } else {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        const desc2 = buildCharDescription(involvedCharacters[1], getRefId(involvedCharacters[1]));
        finalPrompt = `A cinematic photograph of ${desc1} and ${desc2} inside ${mysterySetting}: ${hydratedPrompt || 'whispering conspiratorially in a shadowed corner'}. Cinematic lighting, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      }
    } else if ((clueFormat === 'receipt' || clueFormat === 'document') && charCount === 0) {
      const propScene = hydratedPrompt && hydratedPrompt.length > 6
        ? `${hydratedPrompt}, alongside a crystal coupe glass with a dark red stain sitting on a vintage mahogany bar counter under warm amber lamplight`
        : 'a crystal coupe glass with a dark red stain sitting on a vintage mahogany bar counter under warm amber lamplight';
      finalPrompt = `A cinematic crime scene prop photograph inside ${mysterySetting}: ${propScene}. Gritty noir aesthetic, dramatic low-key lighting, 35mm film grain, shallow depth of field, 8k resolution. ${zeroTextRule}`;
    } else {
      // Physical prop clues, Polaroids, crime scene photos, or any clue with involved characters
      if (charCount === 0) {
        finalPrompt = `A professional close-up crime scene photograph of a physical prop inside ${mysterySetting}: ${hydratedPrompt || 'a mysterious vintage key and velvet glove on a dark mahogany table'}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. ${zeroTextRule}`;
      } else if (charCount === 1) {
        const desc1 = buildCharDescription(involvedCharacters[0], getRefId(involvedCharacters[0]));
        finalPrompt = `A cinematic crime scene photograph showing ${desc1} inside ${mysterySetting}: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      } else {
        const charDescriptions = involvedCharacters.map(c => buildCharDescription(c, getRefId(c))).join(' and ');
        finalPrompt = `A cinematic crime scene photograph showing ${charDescriptions} inside ${mysterySetting}: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution. ${zeroTextRule}${referenceManifest}`;
      }
    }

    const identityHashesKey = referenceImages.map(r => r.standardPhoto.identityHash).join(',');
    const promptHash = crypto.createHash('sha256').update(`${finalPrompt}|refs:${identityHashesKey}`).digest('hex');

    // Check cache first
    const { data: cached } = await supabase
      .from('image_generation_cache')
      .select('image_url')
      .eq('prompt_hash', promptHash)
      .single();

    let finalImageUrl: string | null = '';

    if (cached?.image_url) {
      finalImageUrl = cached.image_url;
    } else {
      console.log(`[STAGE 2: GEMINI SCENE IMAGE REQUEST] (${referenceImages.length} standard char refs) prompt: "${finalPrompt}"`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
      const parts: any[] = [
        ...referenceImages.map(ref => ({
          inlineData: {
            mimeType: 'image/jpeg',
            data: ref.referenceImage.imageBytes,
          },
        })),
        { text: finalPrompt },
      ];
      const payload = {
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      };
      
      let res;
      let retries = 0;
      while (retries < 3) {
        res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        if (res.status === 429 || res.status === 403) {
          retries++;
          await new Promise(r => setTimeout(r, 2000 * retries));
          continue;
        }
        break;
      }

      let base64Image = '';
      let apiErrorMsg = '';
      let imageUsageMetadata: any = null;

      if (res) {
        console.log(`[GEMINI IMAGE RESPONSE] status: ${res.status}`);
        const responseText = await res.text();
        if (res.ok) {
          try {
            const data = JSON.parse(responseText);
            imageUsageMetadata = data.usageMetadata || null;
            const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
            base64Image = imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
            if (!base64Image) {
              console.warn(`[GEMINI IMAGE WARNING] No base64 image in response:`, responseText);
            }
          } catch (e) {
            console.error(`[GEMINI IMAGE ERROR] Failed to parse JSON response:`, responseText);
          }
        } else {
          console.error(`[GEMINI IMAGE ERROR] Response not OK (${res.status})! Body:`, responseText);
          try {
            const errJson = JSON.parse(responseText);
            apiErrorMsg = errJson.error?.message || `API Error (${res.status})`;
          } catch {
            apiErrorMsg = `API Error (${res.status})`;
          }
        }
      } else {
        console.error(`[GEMINI IMAGE ERROR] Fetch returned undefined/null response!`);
      }

      if (base64Image) {
        // Upload scene photo to Supabase Storage for fast loading, with dataUri fallback
        const fileBuffer = Buffer.from(base64Image, 'base64');
        const fileName = `clue-images/${mysteryId}/${clueId}-${Date.now()}.jpg`;
        finalImageUrl = `data:image/jpeg;base64,${base64Image}`;

        const { error: uploadError } = await supabase.storage
          .from('character-images')
          .upload(fileName, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('character-images')
            .getPublicUrl(fileName);
          if (publicUrlData?.publicUrl) {
            finalImageUrl = publicUrlData.publicUrl;
          }
        }

        await logAiUsage({
          model_name: 'gemini-2.5-flash-image',
          feature_name: 'generate_clue_image',
          mystery_id: mysteryId,
          usageMetadata: imageUsageMetadata,
        });
        
        // Save to cache
        await supabase.from('image_generation_cache').insert({
          prompt_hash: promptHash,
          image_url: finalImageUrl,
        });
        console.log('Saved clue scene image to cache');
      } else {
        console.warn('Image generation failed or quota exceeded. Preserving existing image or setting to null for premium placeholder.');
        const currentUrl = clue.static_image_url || '';
        if (currentUrl.startsWith('data:image/') || currentUrl.includes('/storage/v1/object/public/')) {
          finalImageUrl = currentUrl;
        } else {
          finalImageUrl = null;
        }
        if (apiErrorMsg) {
          await supabase
            .from('clues')
            .update({ static_image_url: finalImageUrl, updated_at: new Date().toISOString() })
            .eq('id', clueId);
          return { error: apiErrorMsg, imageUrl: finalImageUrl };
        }
      }
    }

    // Update static_image_url in clues table
    const { error } = await supabase
      .from('clues')
      .update({ static_image_url: finalImageUrl, updated_at: new Date().toISOString() })
      .eq('id', clueId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    return {
      success: true,
      imageUrl: finalImageUrl,
      referencedCharacters: referenceImages.map(r => ({
        id: r.char.id,
        name: getCharacterDisplayName(r.char),
        roleTitle: getCharacterRoleTitle(r.char),
        standardPhotoUrl: r.standardPhoto.photoUrl,
      })),
    };
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
    const response = await result.response;
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: 'generate_guest_bio',
      usageMetadata: response.usageMetadata as any,
    });
    return response.text().trim().replace(/^["']|["']$/g, '');
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
    const response = await result.response;
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: 'generate_guest_fun_fact',
      usageMetadata: response.usageMetadata as any,
    });
    return response.text().trim().replace(/^["']|["']$/g, '');
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
    const isMasculine = gender.toLowerCase().includes('masc') || gender.toLowerCase().includes('man') || gender.toLowerCase() === 'male';
    if (avatarConfig.hairLength) {
      const hl = avatarConfig.hairLength;
      const ht = avatarConfig.hairTexture || 'Straight';
      if (hl === 'Bald') hairStr = 'who is bald';
      else if (['Hijab', 'Turban', 'Beanie'].includes(hl)) hairStr = `wearing a ${hl.toLowerCase()}`;
      else if (isMasculine && hl === 'Medium') hairStr = `with a men's medium-length barbershop haircut (cropped above the ears and collar, ${ht.toLowerCase()} texture, not long)`;
      else if (isMasculine && hl === 'Short') hairStr = `with a men's short cropped ${ht.toLowerCase()} haircut`;
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
