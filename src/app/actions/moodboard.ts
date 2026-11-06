'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import {
  MoodboardPhoto,
  parseMysteryImageField,
  serializeMysteryImageField,
} from '@/utils/moodboard';
import { logAiUsage } from '@/utils/ai-logger';

async function uploadBufferToStorage(
  supabase: any,
  mysteryId: string,
  buffer: Buffer,
  contentType: string,
  ext: string
): Promise<string> {
  const fileId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const storagePath = `mystery-moodboards/${mysteryId}/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('character-images')
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
    });

  if (!uploadError) {
    const {
      data: { publicUrl },
    } = supabase.storage.from('character-images').getPublicUrl(storagePath);
    if (publicUrl) return publicUrl;
  }

  // Fallback to data URI if storage bucket upload fails for any reason
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

async function normalizeCoverIfNeeded(
  supabase: any,
  mysteryId: string,
  coverUrl: string | null
): Promise<string | null> {
  if (!coverUrl) return null;
  if (coverUrl.startsWith('data:image/')) {
    const match = coverUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (match) {
      const contentType = match[1];
      const base64Data = match[2];
      const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
      const buffer = Buffer.from(base64Data, 'base64');
      return await uploadBufferToStorage(supabase, mysteryId, buffer, contentType, ext);
    }
  }
  return coverUrl;
}

export async function uploadMysteryMoodboardPhotosAction(
  mysteryId: string,
  formData: FormData
): Promise<{
  success?: boolean;
  error?: string;
  coverUrl?: string | null;
  moodboardPhotos?: MoodboardPhoto[];
  serializedImageUrl?: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: mystery, error: fetchError } = await supabase
      .from('mysteries')
      .select('id, image_url')
      .eq('id', mysteryId)
      .single();

    if (fetchError || !mystery) {
      return { error: fetchError?.message || 'Mystery not found' };
    }

    const parsed = parseMysteryImageField(mystery.image_url);
    let currentCover = await normalizeCoverIfNeeded(supabase, mysteryId, parsed.coverUrl);
    const currentPhotos: MoodboardPhoto[] = [...parsed.moodboardPhotos];

    const defaultTag = ((formData.get('tag') as string) || '').trim() || 'The Vibe';
    const defaultCaption = ((formData.get('caption') as string) || '').trim();
    const setAsCover = formData.get('setAsCover') === 'true';

    const files = formData.getAll('files') as File[];
    const validFiles = files.filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);

    if (validFiles.length === 0) {
      return { error: 'Please select at least one photo to upload.' };
    }

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = file.type || 'image/jpeg';
      const ext = contentType.includes('png')
        ? 'png'
        : contentType.includes('webp')
        ? 'webp'
        : contentType.includes('gif')
        ? 'gif'
        : 'jpg';

      const publicUrl = await uploadBufferToStorage(supabase, mysteryId, buffer, contentType, ext);

      const newPhoto: MoodboardPhoto = {
        id: `mb-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
        url: publicUrl,
        tag: defaultTag,
        ...(defaultCaption ? { caption: defaultCaption } : {}),
      };

      currentPhotos.push(newPhoto);

      if (!currentCover || (setAsCover && i === 0)) {
        currentCover = publicUrl;
      }
    }

    const serialized = serializeMysteryImageField(currentCover, currentPhotos);

    const { error: updateError } = await supabase
      .from('mysteries')
      .update({
        image_url: serialized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mysteryId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath('/en/admin/mysteries');
    revalidatePath(`/en/builder/mysteries/${mysteryId}`);
    revalidatePath('/en/mysteries');
    revalidatePath(`/en/mysteries/${mysteryId}`);

    return {
      success: true,
      coverUrl: currentCover,
      moodboardPhotos: currentPhotos,
      serializedImageUrl: serialized,
    };
  } catch (err: any) {
    console.error('uploadMysteryMoodboardPhotosAction error:', err);
    return { error: err?.message || 'Failed to upload moodboard photos.' };
  }
}

export async function updateMysteryMoodboardAction(
  mysteryId: string,
  payload: {
    coverUrl?: string | null;
    photos: MoodboardPhoto[];
  }
): Promise<{
  success?: boolean;
  error?: string;
  coverUrl?: string | null;
  moodboardPhotos?: MoodboardPhoto[];
  serializedImageUrl?: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: mystery, error: fetchError } = await supabase
      .from('mysteries')
      .select('id, image_url')
      .eq('id', mysteryId)
      .single();

    if (fetchError || !mystery) {
      return { error: fetchError?.message || 'Mystery not found' };
    }

    const parsed = parseMysteryImageField(mystery.image_url);
    const targetCover =
      payload.coverUrl !== undefined
        ? payload.coverUrl
        : parsed.coverUrl || payload.photos[0]?.url || null;

    const normalizedCover = await normalizeCoverIfNeeded(supabase, mysteryId, targetCover);
    const serialized = serializeMysteryImageField(normalizedCover, payload.photos);

    const { error: updateError } = await supabase
      .from('mysteries')
      .update({
        image_url: serialized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mysteryId);

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath('/en/admin/mysteries');
    revalidatePath(`/en/builder/mysteries/${mysteryId}`);
    revalidatePath('/en/mysteries');
    revalidatePath(`/en/mysteries/${mysteryId}`);

    return {
      success: true,
      coverUrl: normalizedCover,
      moodboardPhotos: payload.photos,
      serializedImageUrl: serialized,
    };
  } catch (err: any) {
    console.error('updateMysteryMoodboardAction error:', err);
    return { error: err?.message || 'Failed to update moodboard.' };
  }
}

export async function generateAIMoodboardPhotoAction(
  mysteryId: string,
  vibeTag: string = 'The Setting',
  customPrompt?: string
): Promise<{
  success?: boolean;
  error?: string;
  coverUrl?: string | null;
  moodboardPhotos?: MoodboardPhoto[];
  serializedImageUrl?: string | null;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: mystery, error: fetchError } = await supabase
      .from('mysteries')
      .select('*')
      .eq('id', mysteryId)
      .single();

    if (fetchError || !mystery) {
      return { error: fetchError?.message || 'Mystery not found' };
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) return { error: 'Google Generative AI API Key is missing.' };

    const theme = mystery.theme || 'Glamorous Murder Mystery';
    const title = mystery.title || 'Mystery Party';
    const focusInstruction =
      customPrompt?.trim() ||
      (vibeTag === 'Dress Code Inspo'
        ? 'Editorial fashion & wardrobe moodboard shot showing stylish guests in evening attire from the waist or shoulders down / atmospheric party details, luxury fabrics, champagne glasses, and accessories matching the theme'
        : vibeTag === 'Cocktail Hour'
        ? 'Atmospheric close-up of signature cocktails, crystal glassware, candlelit table setting, and mysterious party details'
        : vibeTag === 'Crime Scene Vibe'
        ? 'Suspenseful cinematic detail shot of a luxury room after a dramatic incident — spilled champagne flute, velvet ropes, dramatic shadows, noir atmosphere'
        : 'Wide architectural & interior moodboard photograph of the venue setting with dramatic lighting, moody atmosphere, and immersive party ambiance');

    const prompt = `A high-end editorial lifestyle and moodboard photograph for a "${title}" (${theme}) murder mystery party. Visual focus: ${focusInstruction}. Rich colors, cinematic lighting, shallow depth of field, magazine-quality photography, 8k resolution, photorealistic DSLR shot, no text or watermarks.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { error: `AI Image Generation failed (${res.status}): ${errText.slice(0, 120)}` };
    }

    const data = await res.json();
    const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const base64Image = imgPart?.inlineData?.data || '';

    if (!base64Image) {
      return { error: 'AI did not return an image. Please try again.' };
    }

    await logAiUsage({
      model_name: 'gemini-2.5-flash-image',
      feature_name: 'generate_moodboard_image',
      mystery_id: mysteryId,
      usageMetadata: data.usageMetadata,
    });

    const buffer = Buffer.from(base64Image, 'base64');
    const publicUrl = await uploadBufferToStorage(supabase, mysteryId, buffer, 'image/jpeg', 'jpg');

    const parsed = parseMysteryImageField(mystery.image_url);
    const currentCover =
      (await normalizeCoverIfNeeded(supabase, mysteryId, parsed.coverUrl)) || publicUrl;

    const newPhoto: MoodboardPhoto = {
      id: `mb-ai-${Date.now()}`,
      url: publicUrl,
      tag: vibeTag,
      caption: customPrompt?.trim() || `${theme} · ${vibeTag}`,
    };

    const updatedPhotos = [...parsed.moodboardPhotos, newPhoto];
    const serialized = serializeMysteryImageField(currentCover, updatedPhotos);

    const { error: updateError } = await supabase
      .from('mysteries')
      .update({
        image_url: serialized,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mysteryId);

    if (updateError) return { error: updateError.message };

    revalidatePath('/en/admin/mysteries');
    revalidatePath(`/en/builder/mysteries/${mysteryId}`);
    revalidatePath('/en/mysteries');
    revalidatePath(`/en/mysteries/${mysteryId}`);

    return {
      success: true,
      coverUrl: currentCover,
      moodboardPhotos: updatedPhotos,
      serializedImageUrl: serialized,
    };
  } catch (err: any) {
    console.error('generateAIMoodboardPhotoAction error:', err);
    return { error: err?.message || 'Failed to generate AI moodboard photo.' };
  }
}
