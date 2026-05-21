'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAiUsage } from '@/utils/ai-logger';
import { createClient } from '@/utils/supabase/server';
import { getCharactersByMysteryId } from '@/services/mysteries';
import { hydrateTextWithCharacters } from '@/utils/hydration';
import { revalidatePath } from 'next/cache';

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

  const prompt = `You are an expert murder mystery designer. The user needs to create a clue/evidence that reveals or relates to the following story beat:
"${beatTitle}"

Suggest exactly 2 distinct ideas for what this evidence could be, and write them as instructional prompts that an AI could use to generate the actual content of the clue.
Use the placeholder {{VICTIM}} and {{KILLER}} if appropriate.

Example Beat: "The affair is discovered"
Output:
1. A crumpled love letter found in {{VICTIM}}'s coat pocket, passionately written but unsigned, mentioning a secret rendezvous at the old docks.
2. A blurry photograph of {{KILLER}} and {{VICTIM}} arguing furiously outside a motel room, dated two days before the murder.

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

async function optimizeScreenCluePrompt(promptText: string, characters: any[]): Promise<string> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Map characters to their actual assigned guest names for the prompt refiner
  let characterMapping = characters.map(c => {
    const rawName = c.name || '';
    const cleanName = rawName.split('|')[0]?.trim() || '';
    const profile = c.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    return `- ${cleanName} (token: {{${cleanName}}}) is played by "${guestName}"`;
  }).join('\n');

  const victim = characters.find(c => c.is_victim);
  const killer = characters.find(c => c.plot_role === 'killer');

  if (victim) {
    const rawName = victim.name || '';
    const cleanName = rawName.split('|')[0]?.trim() || '';
    const profile = victim.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    characterMapping += `\n- VICTIM (token: {{VICTIM}}) is played by "${guestName}"`;
  }
  if (killer) {
    const rawName = killer.name || '';
    const cleanName = rawName.split('|')[0]?.trim() || '';
    const profile = killer.profile_data || {};
    const guestName = profile.name || profile.guest_name || profile.guestName || cleanName;
    characterMapping += `\n- KILLER (token: {{KILLER}}) is played by "${guestName}"`;
  }

  const systemInstruction = `You are an expert prompt engineer for Imagen 4.0. Your task is to rewrite a murder mystery game clue prompt involving a digital screen (like a smartphone screen, text message/DM thread, email, or chat conversation) into a highly optimized, extremely concise, and visually sharp prompt for image generation.

Here is the casting mapping for the game guests:
${characterMapping}

User's raw prompt containing placeholders:
"${promptText}"

CRITICAL RULES for Screen/Chat Clues:
1. Replace all character tokens (e.g. {{CharacterName}}, {{VICTIM}}, {{KILLER}}) with their actual cast guest names.
2. Clear Sender/Recipient Distinction: The owner of the device (the recipient of the text/email, e.g. {{Gabby}} -> "Gabriella") is holding or viewing the phone. Their name or physical description MUST NOT appear at the top header or as the sender of the incoming messages.
3. Header Placement: The contact/sender name of the person sending the message (e.g. "Don't answer", an unknown number, or another guest) MUST be positioned clearly at the very top of the screen as a header.
4. Message Legibility & Spelling: State clearly that the text inside the bubbles must be perfectly spelled, sharp, and highly legible. Use a clean, default mobile sans-serif font.
5. Do NOT include physical descriptions of the recipient (e.g., hazel eyes, hair color) as text inside the chat thread or header. These physical traits should only be used to describe the hands holding the phone if appropriate, but keep it minimal to prevent confusing the AI.
6. CHAT LAYOUT & GIBBERISH PREVENTION:
   - If the user's prompt describes a single-sided incoming message, render ONLY that single incoming message in a grey/white bubble below the contact header. Explicitly state in the prompt that "the screen is entirely dark, blank, and empty below this single message bubble, with no other text bubbles or elements."
   - If the user's prompt describes a two-way dialogue or back-and-forth conversation (e.g. 'Dane to Ava: ... Ava: ...' or dialogue lines), render it as a real dialogue on the screen: incoming messages from the contact header in grey/white bubbles on the left, and outgoing replies from the device owner in blue/green bubbles on the right.
   - CRITICAL: Every bubble must contain ONLY the exact, literal dialogue text specified in the user's prompt. There must be absolutely NO AI-invented replies, NO placeholder text, and NO gibberish words. Every word on the screen must be exactly from the user's prompt. Specify that "there must be absolutely no other text, no gibberish, and no AI-invented messages on the screen".
7. CONCISENESS & SHARPNESS: Keep the final output prompt very concise, direct, and under 120 words. Verbose prompts degrade the text rendering capabilities of Imagen. Focus purely on spatial placement, the header, bubble colors, and the exact literal text strings to render in quotes.
8. The overall scene should be a premium, dramatic, close-up photograph of a smartphone screen lying on a surface or held in a hand. Use the "gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution" style.
9. Return ONLY the final optimized prompt text. Do not include any introduction, explanations, quotes, or markdown code blocks.`;

  try {
    const result = await model.generateContent(systemInstruction);
    const response = await result.response;
    
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      prompt_tokens: response.usageMetadata?.promptTokenCount,
      completion_tokens: response.usageMetadata?.candidatesTokenCount,
      feature_name: 'optimize_screen_clue_prompt'
    });

    let text = response.text().trim();
    // Strip markdown code blocks if any
    if (text.startsWith('```')) {
      text = text.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
    }
    // Strip surrounding quotes
    text = text.replace(/^["']|["']$/g, '').trim();
    return text;
  } catch (error) {
    console.error('Error in optimizeScreenCluePrompt:', error);
    // Fallback if AI fails
    const hydratedPrompt = hydrateTextWithCharacters(promptText, characters, 'ai');
    return `A high-quality, professional photograph of a smartphone screen showing a text message conversation: ${hydratedPrompt}. CRITICAL: The sender's name must be at the top header, and the text messages below. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.`;
  }
}

export async function generateClueImageAction(clueId: string, mysteryId: string, promptText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  try {
    const supabase = await createClient();
    const characters = await getCharactersByMysteryId(mysteryId);
    
    // Robust detection for text chains, chats, screen, DMs, email, or dialogue format
    const lowercasePrompt = promptText.toLowerCase();
    const hasScreenKeywords = 
      lowercasePrompt.includes('smartphone') || 
      lowercasePrompt.includes('phone screen') || 
      lowercasePrompt.includes('text message') || 
      lowercasePrompt.includes('text chain') || 
      lowercasePrompt.includes('chat thread') || 
      lowercasePrompt.includes('sms') || 
      lowercasePrompt.includes('screen') ||
      lowercasePrompt.includes('dm') ||
      lowercasePrompt.includes('direct message') ||
      lowercasePrompt.includes('text bubble') ||
      lowercasePrompt.includes('email') ||
      lowercasePrompt.includes('inbox') ||
      lowercasePrompt.includes('chat history') ||
      lowercasePrompt.includes('message chain') ||
      lowercasePrompt.includes('whatsapp') ||
      lowercasePrompt.includes('imessage');

    // Detect dialogue script format, e.g. {{Dane}} to {{Ava}} or {{Dane}}:
    const hasDialogueFormat = 
      /\{\{[^}]+\}\}\s*to\s*\{\{[^}]+\}\}/i.test(promptText) ||
      /\{\{[^}]+\}\}\s*:/i.test(promptText) ||
      /\{\{[^}]+\}\}\s+DMs/i.test(promptText) ||
      /\{\{[^}]+\}\}\s+says/i.test(promptText);

    const isScreenClue = hasScreenKeywords || hasDialogueFormat;

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    let finalPrompt = '';

    if (isScreenClue) {
      // Use Gemini to optimize and rewrite the screen-based prompt
      finalPrompt = await optimizeScreenCluePrompt(promptText, characters);
    } else {
      // Hydrate the promptText with character information for visual description
      const hydratedPrompt = hydrateTextWithCharacters(promptText, characters, 'ai');
      // Enhance prompt for highest dynamic photo quality & consistent noir theme
      finalPrompt = `A high-quality, professional photograph of a clue item in a murder mystery: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.`;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt: finalPrompt }],
      parameters: { sampleCount: 1, aspectRatio: "1:1", outputOptions: { mimeType: "image/jpeg" } }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.predictions || !data.predictions[0]) {
      throw new Error('Failed to generate image: ' + JSON.stringify(data.error || data));
    }

    const base64Image = data.predictions[0].bytesBase64Encoded;
    const dataUri = `data:image/jpeg;base64,${base64Image}`;

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
