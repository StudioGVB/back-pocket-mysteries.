'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getCharactersByMysteryId, getMysteryById, getPlotBeatsByMysteryId } from '@/services/mysteries';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function createMysteryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;

  const { data, error } = await supabase
    .from('mysteries')
    .insert({
      title,
      theme,
      created_by: user.id,
      status: 'draft',
      min_players: 5,
      max_players: 12
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating mystery:', error);
    throw new Error(error.message);
  }

  revalidatePath('/builder/mysteries');
  redirect(`/builder/mysteries/${data.id}`);
}

export async function updateMysteryAction(id: string, prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;
  const description = formData.get('description') as string;
  const min_players = parseInt(formData.get('min_players') as string);
  const max_players = parseInt(formData.get('max_players') as string);
  const complexity = formData.get('complexity') as any;
  const spice_level = formData.get('spice_level') as any;
  const status = formData.get('status') as any;

  const { error } = await supabase
    .from('mysteries')
    .update({
      title,
      theme,
      description,
      min_players,
      max_players,
      complexity,
      spice_level,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating mystery:', error);
    require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' ERROR: ' + JSON.stringify(error) + '\n');
    return { error: error.message };
  }
  
  require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' SUCCESS updating ' + id + '\n');

  revalidatePath(`/builder/mysteries/${id}`);
  revalidatePath(`/builder/mysteries/${id}/core`);
  
  return { success: true };
}

export async function generateDescriptionAction(mysteryId: string) {
  try {
    const [mystery, characters, plotBeats] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId),
      getPlotBeatsByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    const victim = characters.find((c: any) => c.is_victim);
    const killer = characters.find((c: any) => c.plot_role === 'killer');

    if (!victim || !killer) {
      throw new Error('You must assign a Victim and a Killer in the Characters tab before generating a synopsis.');
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    const prompt = `
      Write a gripping, suspenseful 3-4 sentence murder mystery synopsis (like the back of a novel or a game box).
      Theme: ${mystery.theme || 'General Mystery'}
      Title: ${mystery.title}

      Requirements:
      1. Explicitly name the victim: ${victim.name} (${victim.archetype || 'Victim'}).
      2. Explicitly name the murderer/killer: ${killer.name} (${killer.archetype || 'Killer'}).
      3. Set the scene and explain that someone has been murdered, and mention the killer by name as the true culprit in a dramatic way.
      4. Incorporate the following plot beats into the narrative flow:
      ${plotBeats.map((b, i) => `${i + 1}. ${b.description}`).join('\n')}
      
      Do not output any JSON or formatting, just plain text paragraphs. Make it punchy and dramatic.
    `;

    const result = await model.generateContent(prompt);
    const synopsis = result.response.text().trim();

    const supabase = await createClient();
    const { error } = await supabase
      .from('mysteries')
      .update({ description: synopsis, updated_at: new Date().toISOString() })
      .eq('id', mysteryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}`);
  } catch (error) {
    console.error('generateDescriptionAction error:', error);
    throw error;
  }
}

export async function generateMysteryCoverAction(mysteryId: string) {
  try {
    const [mystery, characters] = await Promise.all([
      getMysteryById(mysteryId),
      getCharactersByMysteryId(mysteryId)
    ]);

    if (!mystery) throw new Error('Mystery not found');

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google Generative AI API Key is missing.');

    const characterNames = characters.map((c: any) => c.name).join(', ');
    const theme = mystery.theme || 'Cinematic Noir Mystery';
    const description = mystery.description || 'A dramatic murder mystery.';
    
    // We use a highly descriptive prompt to ensure the output matches the "Cinematic Noir" style.
    // Explicitly ask for diversity and younger adults (20-40) based on user preference.
    const prompt = `A highly cinematic, gritty noir photograph. 5 characters standing together at the scene of the crime. Wide angle shot, full body or medium-full framing, leave plenty of headroom above the characters so no heads are cropped out. Theme: ${theme}. Context: ${description}. Characters: ${characterNames}. The characters are young adults (ages 20 to 40) and feature a highly diverse mix of ethnicities (e.g., Black, Asian, Hispanic, White). Dramatic low-key lighting, deep shadows, sepia or desaturated tones, mystery, suspense. Professional photography, sharp focus, 8k resolution.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`;
    const payload = {
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: "16:9", outputOptions: { mimeType: "image/jpeg" } }
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

    const supabase = await createClient();
    const { error } = await supabase
      .from('mysteries')
      .update({ image_url: dataUri, updated_at: new Date().toISOString() })
      .eq('id', mysteryId);

    if (error) throw new Error(error.message);

    revalidatePath(`/builder/mysteries/${mysteryId}`);
    return { success: true };
  } catch (error: any) {
    console.error('generateMysteryCoverAction error:', error);
    return { error: error.message };
  }
}
