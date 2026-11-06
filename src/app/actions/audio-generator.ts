'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { updateClue } from '@/services/mysteries';
import { logAiUsage } from '@/utils/ai-logger';
import {
  synthesizeSpeechLine,
  concatenateMp3Buffers,
  DEFAULT_ELEVENLABS_MODEL,
  ElevenLabsModelId,
} from '@/lib/elevenlabs';
import {
  VoiceRegion,
  inferDefaultVoiceRegion,
  parseAudioTranscript,
} from '@/lib/voices';

export interface GenerateAudioClueInput {
  clueId: string;
  mysteryId: string;
  transcript: string;
  voiceRegion?: VoiceRegion;
  modelId?: ElevenLabsModelId;
  title?: string;
}

export interface GenerateAudioClueResult {
  success: boolean;
  audioUrl?: string;
  lineCount?: number;
  speakers?: Array<{ speaker: string; voiceName: string; tone: string }>;
  error?: string;
}

/**
 * Generates a multi-speaker stitched MP3 recording for an audio clue using ElevenLabs TTS,
 * uploads the combined MP3 buffer to Supabase Storage (`mystery-audio/{mysteryId}/{clueId}.mp3`),
 * and persists `audio_url` on the clue record.
 */
export async function generateAudioClueAction({
  clueId,
  mysteryId,
  transcript,
  voiceRegion,
  modelId = DEFAULT_ELEVENLABS_MODEL,
  title,
}: GenerateAudioClueInput): Promise<GenerateAudioClueResult> {
  try {
    if (!clueId || !mysteryId) {
      return { success: false, error: 'Missing clueId or mysteryId.' };
    }
    if (!transcript || !transcript.trim()) {
      return {
        success: false,
        error: 'Please enter a dialogue transcript in the Description field before generating audio.',
      };
    }

    const supabase = await createClient();

    // Fetch mystery & characters for region resolution and {{Character}} token hydration
    const [{ data: mystery }, { data: charactersData }, { data: clueRow }] = await Promise.all([
      supabase.from('mysteries').select('*').eq('id', mysteryId).single(),
      supabase.from('characters').select('id, name, gender, profile_data').eq('mystery_id', mysteryId),
      supabase.from('clues').select('id, title, internal_notes').eq('id', clueId).single(),
    ]);

    const characters = charactersData || [];
    const resolvedRegion: VoiceRegion =
      voiceRegion || inferDefaultVoiceRegion(mystery as any);
    const resolvedTitle = title || clueRow?.title || '';

    // 1. Parse transcript into ordered speaker lines & resolve distinct voice IDs per speaker
    const parsedLines = parseAudioTranscript(transcript, {
      voiceRegion: resolvedRegion,
      title: resolvedTitle,
      internalNotes: clueRow?.internal_notes,
      characters,
    });

    if (parsedLines.length === 0) {
      return {
        success: false,
        error:
          'No spoken dialogue lines detected in transcript. Format lines as "Name: dialogue" or "[00:04] Name: dialogue".',
      };
    }

    // Collect distinct speakers for metadata feedback
    const speakerMap = new Map<string, { speaker: string; voiceName: string; tone: string }>();
    for (const line of parsedLines) {
      const speakerLabel = line.speaker || line.displaySpeaker || line.rawSpeaker || 'Speaker';
      const key = speakerLabel.toLowerCase();
      if (!speakerMap.has(key)) {
        speakerMap.set(key, {
          speaker: speakerLabel,
          voiceName: line.voiceProfile.name,
          tone: line.voiceProfile.tone,
        });
      }
    }

    // 2. Sequential line generation via ElevenLabs TTS (with emotional acting guidance & conversational context)
    const lineBuffers: ArrayBuffer[] = [];
    let totalCharactersSynthesized = 0;

    for (let i = 0; i < parsedLines.length; i++) {
      const line = parsedLines[i];
      const textToSynthesize = line.spokenDialogue || line.dialogue;
      const prevLine = i > 0 ? parsedLines[i - 1]?.dialogue : undefined;
      const nextLine = i < parsedLines.length - 1 ? parsedLines[i + 1]?.dialogue : undefined;

      totalCharactersSynthesized += textToSynthesize.length;
      const lineAudio = await synthesizeSpeechLine({
        voiceId: line.voiceId,
        text: textToSynthesize,
        modelId,
        previousText: prevLine,
        nextText: nextLine,
      });
      lineBuffers.push(lineAudio);
    }

    // 3. Concatenate MP3 byte buffers sequentially with a 350ms silent gap between speaker turns
    const mergedMp3Buffer = concatenateMp3Buffers(lineBuffers, 350);

    if (mergedMp3Buffer.length === 0) {
      return {
        success: false,
        error: 'ElevenLabs returned an empty audio buffer.',
      };
    }

    // 4. Upload to Supabase Storage (`mystery-audio/{mysteryId}/{clueId}.mp3`)
    const storagePath = `${mysteryId}/${clueId}.mp3`;
    let publicUrl = '';

    const { error: primaryUploadErr } = await supabase.storage
      .from('mystery-audio')
      .upload(storagePath, mergedMp3Buffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (!primaryUploadErr) {
      const { data: urlData } = supabase.storage
        .from('mystery-audio')
        .getPublicUrl(storagePath);
      publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
    } else {
      console.warn(
        `[AUDIO UPLOAD] Primary bucket 'mystery-audio' unavailable (${primaryUploadErr.message}), falling back to 'character-images/mystery-audio/${storagePath}'`
      );
      const fallbackPath = `mystery-audio/${storagePath}`;
      const { error: fallbackUploadErr } = await supabase.storage
        .from('character-images')
        .upload(fallbackPath, mergedMp3Buffer, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (!fallbackUploadErr) {
        const { data: urlData } = supabase.storage
          .from('character-images')
          .getPublicUrl(fallbackPath);
        publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;
      } else {
        // Fallback to local static file in public/mystery-audio/{mysteryId}/{clueId}.mp3
        try {
          const publicAudioDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'mystery-audio', mysteryId);
          await fs.mkdir(publicAudioDir, { recursive: true });
          const localFilePath = path.join(/*turbopackIgnore: true*/ publicAudioDir, `${clueId}.mp3`);
          await fs.writeFile(localFilePath, mergedMp3Buffer);
          publicUrl = `/mystery-audio/${mysteryId}/${clueId}.mp3?v=${Date.now()}`;
        } catch (fsErr) {
          console.warn('[AUDIO UPLOAD] Local filesystem fallback unavailable, using inline data URI:', fsErr);
          publicUrl = `data:audio/mpeg;base64,${mergedMp3Buffer.toString('base64')}`;
        }
      }
    }

    // 5. Persist `clues.audio_url` and `voice_region` (with automatic fallback if column not yet migrated)
    if (!publicUrl.startsWith('data:')) {
      await updateClue(clueId, {
        audio_url: publicUrl,
        voice_region: resolvedRegion,
        format: 'audio',
        updated_at: new Date().toISOString(),
      });
    }

    // 6. Log AI usage
    await logAiUsage({
      model_name: `elevenlabs:${modelId}`,
      prompt_tokens: totalCharactersSynthesized,
      completion_tokens: parsedLines.length,
      feature_name: 'generate_audio_clue',
      mystery_id: mysteryId,
    });

    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    revalidatePath(`/play/${mysteryId}`);
    revalidatePath('/', 'layout');

    return {
      success: true,
      audioUrl: publicUrl,
      lineCount: parsedLines.length,
      speakers: Array.from(speakerMap.values()),
    };
  } catch (err: any) {
    console.error('[generateAudioClueAction] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to generate audio clue.',
    };
  }
}

/**
 * Deletes the generated audio file from Supabase Storage and clears `clues.audio_url`.
 */
export async function deleteAudioClueAction({
  clueId,
  mysteryId,
}: {
  clueId: string;
  mysteryId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const storagePath = `${mysteryId}/${clueId}.mp3`;

    await Promise.allSettled([
      supabase.storage.from('mystery-audio').remove([storagePath]),
      supabase.storage.from('character-images').remove([`mystery-audio/${storagePath}`]),
    ]);

    await updateClue(clueId, {
      audio_url: null,
      updated_at: new Date().toISOString(),
    });

    revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
    revalidatePath(`/play/${mysteryId}`);
    revalidatePath('/', 'layout');

    return { success: true };
  } catch (err: any) {
    console.error('[deleteAudioClueAction] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to delete audio recording.',
    };
  }
}
