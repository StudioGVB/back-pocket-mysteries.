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
import {
  inferClueFormat,
  extractFormatTagFromNotes,
  extractAudioUrlFromNotes,
  extractVoiceRegionFromNotes,
} from '@/utils/clue-format';
import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';

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

    // Fetch mystery, characters, clue, and the user's guest roster so live friend accents are always used
    const [
      { data: mystery },
      { data: charactersData },
      { data: clueRow },
      { data: authData },
    ] = await Promise.all([
      supabase.from('mysteries').select('*').eq('id', mysteryId).single(),
      supabase
        .from('characters')
        .select('id, name, gender, profile_data')
        .eq('mystery_id', mysteryId)
        .order('created_at', { ascending: true }),
      supabase.from('clues').select('id, title, internal_notes').eq('id', clueId).single(),
      supabase.auth.getUser(),
    ]);

    const hostUserId = mystery?.created_by || authData?.user?.id;
    let guestRoster: any[] = [];
    if (hostUserId) {
      const [{ data: guestsRows }, { data: hostProfile }] = await Promise.all([
        supabase.from('guests').select('*').eq('user_id', hostUserId),
        supabase.from('profiles').select('*').eq('id', hostUserId).maybeSingle(),
      ]);
      guestRoster = [...(guestsRows || [])];
      if (hostProfile) {
        const hp = hostProfile as any;
        guestRoster.push({
          id: hp.id,
          name: hp.full_name || 'Host',
          gender: hp.pronouns?.toLowerCase().includes('she')
            ? 'female'
            : hp.pronouns?.toLowerCase().includes('he')
            ? 'male'
            : 'adaptable',
          accent: hp.avatar_config?.accent,
          age: hp.avatar_config?.age,
          avatar_url: '',
        });
      }
    }

    const guestById = new Map<string, any>();
    const guestByName = new Map<string, any>();
    for (const g of guestRoster) {
      if (g?.id) guestById.set(g.id, g);
      if (g?.name) guestByName.set(String(g.name).trim().toLowerCase(), g);
    }

    const usedGuestIds = new Set<string>();
    const rawCharacters = charactersData || [];
    for (const ch of rawCharacters) {
      const pd = (ch.profile_data as any) || {};
      if (pd.guest_id && guestById.has(pd.guest_id)) {
        usedGuestIds.add(pd.guest_id);
      } else if (pd.guest_name && guestByName.has(String(pd.guest_name).trim().toLowerCase())) {
        usedGuestIds.add(guestByName.get(String(pd.guest_name).trim().toLowerCase()).id);
      }
    }

    // Hydrate characters with their assigned friend's live accent/age/gender from the guest roster
    // (or deterministically match unassigned draft characters against the user's guest roster by gender)
    const characters = rawCharacters.map((char: any) => {
      const charProfile = (char.profile_data as any) || {};
      const guestNameKey = String(charProfile.guest_name || charProfile.name || '')
        .trim()
        .toLowerCase();
      let matchedGuest =
        (charProfile.guest_id && guestById.get(charProfile.guest_id)) ||
        (guestNameKey && guestByName.get(guestNameKey)) ||
        null;

      if (!matchedGuest && guestRoster.length > 0) {
        const charGenderRaw = String(charProfile.gender || char.gender || '').toLowerCase();
        const wantsFemale = charGenderRaw === 'female' || charGenderRaw === 'f' || charGenderRaw.includes('fem');
        const wantsMale = charGenderRaw === 'male' || charGenderRaw === 'm' || charGenderRaw.includes('masc');

        matchedGuest =
          guestRoster.find((g: any) => {
            if (usedGuestIds.has(g.id)) return false;
            const gGen = String(g.gender || '').toLowerCase();
            if (wantsFemale) return gGen === 'female' || gGen === 'f' || gGen.includes('fem');
            if (wantsMale) return gGen === 'male' || gGen === 'm' || gGen.includes('masc');
            return true;
          }) || null;

        if (matchedGuest) {
          usedGuestIds.add(matchedGuest.id);
        }
      }

      if (matchedGuest) {
        const guestAvatarUrl = matchedGuest.avatar_url || charProfile.avatar_url || '';
        const liveAccent =
          extractAccentFromAvatarUrl(guestAvatarUrl) ||
          matchedGuest.accent ||
          extractAccentFromAvatarUrl(charProfile.avatar_url) ||
          charProfile.accent;
        const liveAge =
          extractAgeFromAvatarUrl(guestAvatarUrl) ||
          matchedGuest.age ||
          extractAgeFromAvatarUrl(charProfile.avatar_url) ||
          charProfile.age;

        return {
          ...char,
          gender: matchedGuest.gender || char.gender,
          profile_data: {
            ...charProfile,
            guest_id: matchedGuest.id,
            guest_name: charProfile.guest_name || matchedGuest.name,
            gender: matchedGuest.gender || charProfile.gender || char.gender,
            avatar_url: guestAvatarUrl,
            ...(liveAccent ? { accent: liveAccent } : {}),
            ...(liveAge ? { age: liveAge } : {}),
          },
        };
      }

      return char;
    });

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

    try {
      revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
      revalidatePath(`/play/${mysteryId}`);
      revalidatePath('/', 'layout');
    } catch {
      // Safe when invoked from detached background package generation
    }

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
 * Pre-generates all audio clues (`format === 'audio'`) for a mystery so that when the package
 * is ready and players open the Playroom, every voice recording plays out loud immediately on click.
 */
export async function pregenerateAllAudioCluesForMystery(
  mysteryId: string,
  options?: {
    forceRegenerate?: boolean;
    onProgress?: (completed: number, total: number) => void;
  }
): Promise<{ generatedCount: number; totalAudioClues: number }> {
  try {
    const supabase = await createClient();
    const { data: cluesData } = await supabase
      .from('clues')
      .select('*')
      .eq('mystery_id', mysteryId);

    const clues = (cluesData || []).map((c: any) => ({
      ...c,
      format: c.format || extractFormatTagFromNotes(c.internal_notes) || inferClueFormat(c),
      audio_url: c.audio_url || extractAudioUrlFromNotes(c.internal_notes) || null,
      voice_region: c.voice_region || extractVoiceRegionFromNotes(c.internal_notes) || null,
    }));

    const audioClues = clues.filter(
      (c: any) => c.format === 'audio' && c.description && String(c.description).trim().length > 0
    );

    let generatedCount = 0;
    for (let i = 0; i < audioClues.length; i++) {
      const clue = audioClues[i];
      if (!options?.forceRegenerate && clue.audio_url) {
        options?.onProgress?.(i + 1, audioClues.length);
        continue;
      }

      const res = await generateAudioClueAction({
        clueId: clue.id,
        mysteryId,
        transcript: clue.description,
        voiceRegion: clue.voice_region || undefined,
        title: clue.title || undefined,
      });

      if (res.success) {
        generatedCount += 1;
      }
      options?.onProgress?.(i + 1, audioClues.length);
    }

    return {
      generatedCount,
      totalAudioClues: audioClues.length,
    };
  } catch (err) {
    console.error('[pregenerateAllAudioCluesForMystery] Error:', err);
    return { generatedCount: 0, totalAudioClues: 0 };
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

    try {
      revalidatePath(`/builder/mysteries/${mysteryId}/clues`);
      revalidatePath(`/play/${mysteryId}`);
      revalidatePath('/', 'layout');
    } catch {
      // Safe when invoked outside request context
    }

    return { success: true };
  } catch (err: any) {
    console.error('[deleteAudioClueAction] Error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to delete audio recording.',
    };
  }
}
