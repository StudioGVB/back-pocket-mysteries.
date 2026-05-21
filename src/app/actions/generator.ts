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

export async function generateClueImageAction(clueId: string, mysteryId: string, promptText: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  try {
    const supabase = await createClient();
    const characters = await getCharactersByMysteryId(mysteryId);
    
    // Hydrate the promptText with character information for visual description
    const hydratedPrompt = hydrateTextWithCharacters(promptText, characters, 'ai');
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    
    // Enhance prompt for highest dynamic photo quality & consistent noir theme
    const finalPrompt = `A high-quality, professional photograph of a clue item in a murder mystery: ${hydratedPrompt}. Gritty noir aesthetic, dramatic low-key lighting, highly detailed texture, atmospheric shadows, cinematic shot, sharp focus, 8k resolution.`;

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
