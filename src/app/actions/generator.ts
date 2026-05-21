'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logAiUsage } from '@/utils/ai-logger';

export async function generateRandomQuirk(name: string, gender: string) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
  }

  const ai = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const characterDescription = name ? `${name} (Gender: ${gender})` : `a ${gender} character`;

  const prompt = `Generate a single, short, funny, and unique personality quirk, fun fact, or fear for ${characterDescription} in a murder mystery game. 
Keep it under 10 words. 
Examples: "Terrified of loose buttons", "Always carries a spare spoon", "Collects vintage lint", "Secretly loves pineapple on pizza".
Respond with ONLY the quirk itself, no quotes, no extra text, and do not include the character's name in the output if possible.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    await logAiUsage({
      model_name: 'gemini-1.5-flash',
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
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const systemInstruction = `You are a mystery game clue generator. Based on the provided prompt and template, generate the text for a single clue. Output ONLY the generated clue content, do not add any conversational fluff. Keep it concise, engaging, and in-character for a murder mystery.`;

  const fullPrompt = `${systemInstruction}\n\nPROMPT:\n${prompt}\n\nTEMPLATE / FORMAT (if provided):\n${templateText || 'None provided.'}`;

  try {
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    await logAiUsage({
      model_name: 'gemini-1.5-flash',
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
  const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
      model_name: 'gemini-1.5-flash',
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
