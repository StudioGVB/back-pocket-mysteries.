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
  VOICE_PROFILES,
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
import { isUserAdmin, requireAdmin } from '@/utils/admin-auth';
import { getCachedMysterySnapshot, getAllCachedMysteries } from '@/lib/live-session-store';
import {
  ClueVerificationStamp,
  embedClueVerificationStamp,
  extractClueVerificationStamp,
} from '@/utils/clue-verification';
import {
  verifyAndHealClueText,
  verifyGeneratedAudioMp3WithGemini,
} from '@/app/actions/clue-verifier';

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
  verificationStamp?: ClueVerificationStamp;
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
      supabase.from('mysteries').select('*').eq('id', mysteryId).maybeSingle(),
      supabase
        .from('characters')
        .select('id, name, gender, profile_data')
        .eq('mystery_id', mysteryId)
        .order('created_at', { ascending: true }),
      supabase.from('clues').select('id, title, internal_notes').eq('id', clueId).maybeSingle(),
      supabase.auth.getUser(),
    ]);

    const authUser = authData?.user || null;
    const isAdmin = await isUserAdmin(supabase, authUser);
    const cachedMystery = getCachedMysterySnapshot(mysteryId);
    const effectiveOwnerId = cachedMystery?.created_by || mystery?.created_by;

    if (authUser && !isAdmin && effectiveOwnerId && effectiveOwnerId !== authUser.id) {
      return { success: false, error: 'Forbidden: You do not have permission to generate audio for this mystery.' };
    }

    const hostUserId = effectiveOwnerId || authUser?.id;
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

    // Also harvest known guests from cached mysteries if guestRoster is empty (e.g. when RLS hides guests outside user session)
    if (guestRoster.length === 0) {
      const seenGuestKeys = new Set<string>();
      for (const cm of getAllCachedMysteries()) {
        if (effectiveOwnerId && cm?.created_by && cm.created_by !== effectiveOwnerId) continue;
        for (const cc of cm?.characters || []) {
          const pd = cc?.profile_data || {};
          const guestKey = String(pd.guest_id || pd.guest_name || '').trim();
          const detectedAccent = extractAccentFromAvatarUrl(pd.avatar_url) || pd.accent;
          if ((guestKey || detectedAccent) && !seenGuestKeys.has(guestKey || String(cc.id))) {
            seenGuestKeys.add(guestKey || String(cc.id));
            guestRoster.push({
              id: pd.guest_id || cc.id,
              name: pd.guest_name || pd.name,
              gender: pd.selected_gender || pd.gender || (cc.gender !== 'adaptable' ? cc.gender : 'male'),
              accent: detectedAccent,
              age: extractAgeFromAvatarUrl(pd.avatar_url) || pd.age,
              avatar_url: pd.avatar_url || '',
            });
          }
        }
      }
    }

    const guestById = new Map<string, any>();
    const guestByName = new Map<string, any>();
    for (const g of guestRoster) {
      if (g?.id) guestById.set(g.id, g);
      if (g?.name) guestByName.set(String(g.name).trim().toLowerCase(), g);
    }

    const rawCharacters =
      charactersData && charactersData.length > 0
        ? charactersData
        : cachedMystery?.characters || [];

    const usedGuestIds = new Set<string>();
    for (const ch of rawCharacters) {
      const pd = (ch.profile_data as any) || {};
      if (pd.guest_id && guestById.has(pd.guest_id)) {
        usedGuestIds.add(pd.guest_id);
      } else if (pd.guest_name && guestByName.has(String(pd.guest_name).trim().toLowerCase())) {
        usedGuestIds.add(guestByName.get(String(pd.guest_name).trim().toLowerCase()).id);
      }
    }

    // Hydrate characters with their assigned friend's live accent/age/gender from the guest roster.
    // For unassigned draft characters, inherit only accent & age from the host's guest roster (preserving Role Titles).
    const characters = rawCharacters.map((char: any) => {
      const charProfile = (char.profile_data as any) || {};
      const guestNameKey = String(charProfile.guest_name || charProfile.name || '')
        .trim()
        .toLowerCase();
      const explicitlyAssignedGuest =
        (charProfile.guest_id && guestById.get(charProfile.guest_id)) ||
        (guestNameKey && guestByName.get(guestNameKey)) ||
        null;

      if (explicitlyAssignedGuest) {
        const guestAvatarUrl = explicitlyAssignedGuest.avatar_url || charProfile.avatar_url || '';
        const liveAccent =
          extractAccentFromAvatarUrl(guestAvatarUrl) ||
          explicitlyAssignedGuest.accent ||
          extractAccentFromAvatarUrl(charProfile.avatar_url) ||
          charProfile.accent;
        const liveAge =
          extractAgeFromAvatarUrl(guestAvatarUrl) ||
          explicitlyAssignedGuest.age ||
          extractAgeFromAvatarUrl(charProfile.avatar_url) ||
          charProfile.age;

        return {
          ...char,
          gender: explicitlyAssignedGuest.gender || char.gender,
          profile_data: {
            ...charProfile,
            guest_id: explicitlyAssignedGuest.id,
            guest_name: charProfile.guest_name || explicitlyAssignedGuest.name,
            gender: explicitlyAssignedGuest.gender || charProfile.gender || char.gender,
            avatar_url: guestAvatarUrl,
            ...(liveAccent ? { accent: liveAccent } : {}),
            ...(liveAge ? { age: liveAge } : {}),
          },
        };
      }

      // If character has no assigned guest yet, match an unused guest from the user's roster by gender
      // to inherit their accent & age while keeping the character's Role Title intact.
      if (!charProfile.guest_id && guestRoster.length > 0) {
        const charGenderRaw = String(charProfile.gender || char.gender || '').toLowerCase();
        const wantsFemale =
          charGenderRaw === 'female' || charGenderRaw === 'f' || charGenderRaw.includes('fem');
        const wantsMale =
          charGenderRaw === 'male' || charGenderRaw === 'm' || charGenderRaw.includes('masc');

        const rosterMatch =
          guestRoster.find((g: any) => {
            if (usedGuestIds.has(g.id)) return false;
            const gGen = String(g.gender || '').toLowerCase();
            if (wantsFemale) return gGen === 'female' || gGen === 'f' || gGen.includes('fem');
            if (wantsMale) return gGen === 'male' || gGen === 'm' || gGen.includes('masc');
            return true;
          }) || null;

        if (rosterMatch) {
          usedGuestIds.add(rosterMatch.id);
          const rosterAvatarUrl = rosterMatch.avatar_url || '';
          const rosterAccent =
            extractAccentFromAvatarUrl(rosterAvatarUrl) || rosterMatch.accent || charProfile.accent;
          const rosterAge =
            extractAgeFromAvatarUrl(rosterAvatarUrl) || rosterMatch.age || charProfile.age;

          return {
            ...char,
            profile_data: {
              ...charProfile,
              ...(rosterAccent ? { accent: rosterAccent } : {}),
              ...(rosterAge ? { age: rosterAge } : {}),
            },
          };
        }
      }

      return char;
    });

    const cachedClue = cachedMystery?.clues?.find((c: any) => c.id === clueId);
    const resolvedRegion: VoiceRegion =
      voiceRegion || inferDefaultVoiceRegion((mystery || cachedMystery) as any);
    const resolvedTitle = title || clueRow?.title || cachedClue?.title || '';
    const resolvedInternalNotes =
      clueRow?.internal_notes || cachedClue?.internal_notes || null;

    // 0. PRE-SYNTHESIS TEXT, SPEAKER NAME & PRONOUN AUDIT:
    // Verify the wiretap transcript talks about the right cast characters, uses the right gender pronouns,
    // and does not fabricate non-existent people before spending ElevenLabs TTS credits.
    const textVerification = await verifyAndHealClueText({
      clueTitle: resolvedTitle,
      clueDescription: transcript,
      clueFormat: 'audio',
      mysteryTitle: mystery?.title || cachedMystery?.title,
      mysterySetting: mystery?.theme || (cachedMystery as any)?.setting || cachedMystery?.theme,
      characters,
      preserveTokens: transcript.includes('{{'),
    });
    const activeTranscript = textVerification.finalDescription || transcript;

    // 1. Parse transcript into ordered speaker lines & resolve distinct voice IDs per speaker
    const parsedLines = parseAudioTranscript(activeTranscript, {
      voiceRegion: resolvedRegion,
      title: resolvedTitle,
      internalNotes: resolvedInternalNotes,
      characters,
    });

    if (parsedLines.length === 0) {
      return {
        success: false,
        error:
          'No spoken dialogue lines detected in transcript. Format lines as "Name: dialogue" or "[00:04] Name: dialogue".',
      };
    }

    // Collect distinct speakers and verify their gender & accent lock against the cast roster
    const speakerMap = new Map<string, { speaker: string; voiceName: string; tone: string }>();
    const speakersVerified: Array<{
      speaker: string;
      gender: string;
      accent: string;
      voiceName: string;
    }> = [];

    for (const line of parsedLines) {
      const speakerLabel = line.speaker || line.displaySpeaker || line.rawSpeaker || 'Speaker';
      const key = speakerLabel.toLowerCase();
      if (!speakerMap.has(key)) {
        speakerMap.set(key, {
          speaker: speakerLabel,
          voiceName: line.voiceProfile.name,
          tone: line.voiceProfile.tone,
        });
        speakersVerified.push({
          speaker: speakerLabel,
          gender: line.voiceProfile.gender,
          accent: (line.voiceProfile as any).accent || resolvedRegion,
          voiceName: line.voiceProfile.name,
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
    let mergedMp3Buffer = concatenateMp3Buffers(lineBuffers, 350);

    if (mergedMp3Buffer.length === 0) {
      return {
        success: false,
        error: 'ElevenLabs returned an empty audio buffer.',
      };
    }

    // 3b. POST-SYNTHESIS MULTIMODAL AUDIO LISTEN CHECK & AUTO-RETRY LOOP:
    // Feed the generated MP3 buffer into Gemini 2.5 Flash to confirm the spoken dialogue matches the expected
    // speakers, gender voices, accents, and script lines with zero garbled/cut-off audio.
    let audioListenVerification = await verifyGeneratedAudioMp3WithGemini({
      mp3Buffer: mergedMp3Buffer,
      expectedTranscript: activeTranscript,
      speakersManifest: speakersVerified,
    });

    if (!audioListenVerification.passed) {
      console.warn(
        `[POST-GEN AUDIO VERIFIER] Audio clue ${clueId} flagged by listener ("${audioListenVerification.summary}"). Auto-retrying with alternate gender/accent-locked voice profiles...`
      );
      try {
        const allProfiles = Object.values(VOICE_PROFILES);
        const retryBuffers: ArrayBuffer[] = [];

        for (let i = 0; i < parsedLines.length; i++) {
          const line = parsedLines[i];
          const targetGender = line.voiceProfile.gender;
          const targetAccent = (line.voiceProfile as any).accent || resolvedRegion;
          const altVoice =
            allProfiles.find(
              (vp) =>
                vp.id !== line.voiceId &&
                vp.gender === targetGender &&
                vp.accent === targetAccent
            ) || line.voiceProfile;

          const cleanSpoken = String(line.spokenDialogue || line.dialogue || '')
            .replace(/\[[^\]]*\]/g, '')
            .replace(/\([^)]*\)/g, '')
            .replace(/\s+/g, ' ')
            .trim();

          const retryLineAudio = await synthesizeSpeechLine({
            voiceId: altVoice.id,
            text: cleanSpoken || line.dialogue,
            modelId,
          });
          retryBuffers.push(retryLineAudio);
        }

        const retriedMerged = concatenateMp3Buffers(retryBuffers, 350);
        if (retriedMerged.length > 200) {
          mergedMp3Buffer = retriedMerged;
          audioListenVerification = await verifyGeneratedAudioMp3WithGemini({
            mp3Buffer: mergedMp3Buffer,
            expectedTranscript: activeTranscript,
            speakersManifest: speakersVerified,
          });
        }
      } catch (retryAudioErr) {
        console.warn('[POST-GEN AUDIO VERIFIER] Audio retry fallback warning:', retryAudioErr);
      }
    }

    const existingStamp = extractClueVerificationStamp(resolvedInternalNotes);
    const verificationStamp: ClueVerificationStamp = {
      verifiedAt: new Date().toISOString(),
      passed: textVerification.passed && audioListenVerification.passed,
      textCheck: {
        passed: textVerification.passed,
        namesValid: textVerification.namesValid,
        pronounsValid: textVerification.pronounsValid,
        plotAligned: textVerification.plotAligned,
        healed: textVerification.healed,
        summary: textVerification.summary,
      },
      photoCheck: existingStamp?.photoCheck,
      audioCheck: {
        passed: audioListenVerification.passed,
        speakerIdentityMatch: audioListenVerification.speakerIdentityMatch,
        genderMatch: audioListenVerification.genderMatch,
        accentMatch: audioListenVerification.accentMatch,
        audioClear: audioListenVerification.audioClear,
        speakersVerified,
        summary: audioListenVerification.summary,
      },
    };
    const updatedInternalNotes = embedClueVerificationStamp(
      resolvedInternalNotes,
      verificationStamp
    );

    // 4. Save to local static file (`public/mystery-audio/{mysteryId}/{clueId}.mp3`) AND upload to Supabase Storage
    const storagePath = `${mysteryId}/${clueId}.mp3`;
    let publicUrl = '';
    const versionTs = Date.now();

    try {
      const publicAudioDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', 'mystery-audio', mysteryId);
      await fs.mkdir(publicAudioDir, { recursive: true });
      const localFilePath = path.join(/*turbopackIgnore: true*/ publicAudioDir, `${clueId}.mp3`);
      await fs.writeFile(localFilePath, mergedMp3Buffer);
      publicUrl = `/mystery-audio/${mysteryId}/${clueId}.mp3?v=${versionTs}`;
    } catch (fsErr) {
      console.warn('[AUDIO UPLOAD] Local filesystem write skipped:', fsErr);
    }

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
      if (!publicUrl) {
        publicUrl = `${urlData.publicUrl}?v=${versionTs}`;
      }
    } else {
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
        if (!publicUrl) {
          publicUrl = `${urlData.publicUrl}?v=${versionTs}`;
        }
      } else if (!publicUrl) {
        publicUrl = `data:audio/mpeg;base64,${mergedMp3Buffer.toString('base64')}`;
      }
    }

    // 5. Persist `clues.audio_url`, `voice_region`, healed transcript, and QA verification stamp
    if (!publicUrl.startsWith('data:')) {
      await updateClue(clueId, {
        audio_url: publicUrl,
        voice_region: resolvedRegion,
        format: 'audio',
        ...(textVerification.healed ? { description: activeTranscript } : {}),
        internal_notes: updatedInternalNotes,
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
      verificationStamp,
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { generatedCount: 0, totalAudioClues: 0 };
    }
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

      let succeeded = false;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const res = await generateAudioClueAction({
          clueId: clue.id,
          mysteryId,
          transcript: clue.description,
          voiceRegion: clue.voice_region || undefined,
          title: clue.title || undefined,
        });

        if (res.success && res.audioUrl) {
          succeeded = true;
          generatedCount += 1;
          break;
        }
        if (attempt < 2) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }

      if (!succeeded) {
        console.warn(`[pregenerateAllAudioCluesForMystery] Audio clue ${clue.id} did not succeed after 2 attempts.`);
      }

      options?.onProgress?.(i + 1, audioClues.length);
      if (i < audioClues.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
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
    const { supabase } = await requireAdmin();
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

export interface GenerateLandingDemoVoiceInput {
  firstName: string;
  lastName?: string;
  gender: string;
  age: string;
  accent: string;
  trait: string;
}

export interface GenerateLandingDemoVoiceResult {
  success: boolean;
  audioUrl: string;
  transcript: string;
  voiceName: string;
  voiceBadge: string;
  error?: string;
}

/**
 * Public landing page demo action: synthesizes a dramatic caught-on-mic wiretap audio clue
 * in the exact voice (Gender, Age, and Regional Accent) of the guest the visitor just created.
 */
export async function generateLandingDemoVoiceClueAction(
  input: GenerateLandingDemoVoiceInput
): Promise<GenerateLandingDemoVoiceResult> {
  const firstName = (input.firstName || 'Gabby').trim().slice(0, 32);
  const rawGender = (input.gender || 'Feminine').toLowerCase();
  const isMale = rawGender.includes('masc') || rawGender === 'male' || rawGender === 'm';
  const genderKey: 'male' | 'female' = isMale ? 'male' : 'female';

  const rawAge = (input.age || 'young').toLowerCase();
  const isYoung = rawAge === 'young' || rawAge.includes('18');

  const rawAccent = (input.accent || 'Australian').toLowerCase();
  let regionKey: 'au' | 'gb' | 'us' = 'au';
  if (rawAccent.includes('brit') || rawAccent.includes('uk') || rawAccent.includes('irish') || rawAccent.includes('scot') || rawAccent.includes('euro')) {
    regionKey = 'gb';
  } else if (rawAccent.includes('amer') || rawAccent.includes('us') || rawAccent.includes('global')) {
    regionKey = 'us';
  } else {
    regionKey = 'au';
  }

  const cleanTrait = (input.trait || 'obsessed with espresso martinis')
    .trim()
    .replace(/\.$/, '');
  const traitPhrase = cleanTrait.toLowerCase().startsWith('always ') ||
    cleanTrait.toLowerCase().startsWith('obsessed ') ||
    cleanTrait.toLowerCase().startsWith('secretly ') ||
    cleanTrait.toLowerCase().startsWith('never ')
    ? cleanTrait.charAt(0).toLowerCase() + cleanTrait.slice(1)
    : `known for "${cleanTrait}"`;

  const dramaticTranscript = `Keep your voice down! It's ${firstName}. Someone just saw me by the study safe at eight-oh-four—everyone at this table knows I'm ${traitPhrase}, and if they find that poisoned glass by the bar before dessert, I'm going down for this murder! Delete our texts right now!`;

  // Pick the most dramatic curated ElevenLabs voice matching Gender + Age + Accent
  const voiceMap: Record<string, { id: string; label: string }> = {
    'au:female:young': {
      id: 'HMsHSO9iPieho74ZXn8A',
      label: 'Emma · Dramatic Australian Female (18–29)',
    },
    'au:female:adult': {
      id: 'zMK1eWY5DTw3Jjb8efU8',
      label: 'Emily · Sharp Australian Female (30+)',
    },
    'au:male:young': {
      id: '9TTaZrP6m0Cc554HW1PP',
      label: 'Michael · Intense Australian Male (18–29)',
    },
    'au:male:adult': {
      id: 'UVXT2nskVOynYCONC3Iy',
      label: 'Ryan · Calculating Australian Male (30+)',
    },
    'gb:female:young': {
      id: 'pFZP5JQG7iQjIQuC4Bku',
      label: 'Lily · Dramatic British Female',
    },
    'gb:female:adult': {
      id: 'Xb7hH8MSUJpSbSDYk0k2',
      label: 'Alice · Poised British Female',
    },
    'gb:male:young': {
      id: 'JBFqnCBsd6RMkjVDRZzb',
      label: 'George · Captivating British Male',
    },
    'gb:male:adult': {
      id: 'onwK4e9ZLuTAKqWW03F9',
      label: 'Daniel · Formal British Male',
    },
    'us:female:young': {
      id: 'EXAVITQu4vr4xnSDxMaL',
      label: 'Sarah · Dramatic American Female (18–29)',
    },
    'us:female:adult': {
      id: 'XrExE9yKIg1WjnnlVkGX',
      label: 'Matilda · Sharp American Female (30+)',
    },
    'us:male:young': {
      id: 'TX3LPaxmHKxFdv7VOQHJ',
      label: 'Liam · Intense American Male (18–29)',
    },
    'us:male:adult': {
      id: 'pNInz6obpgDQGcFmaJgB',
      label: 'Adam · Dominant American Male (30+)',
    },
  };

  const ageBucket = isYoung ? 'young' : 'adult';
  const lookupKey = `${regionKey}:${genderKey}:${ageBucket}`;
  const selectedVoice = voiceMap[lookupKey] || voiceMap['au:female:young'];
  const ageLabel = rawAge === 'old' ? '50+' : isYoung ? '18–29' : '30–49';
  const voiceBadge = `${isMale ? 'Masculine' : 'Feminine'} · ${input.accent || 'Australian'} · ${ageLabel}`;
  const fallbackStaticUrl = `/mystery-audio/landing-demo/${genderKey}-${regionKey}.mp3`;

  try {
    const audioBuffer = await synthesizeSpeechLine({
      voiceId: selectedVoice.id,
      text: dramaticTranscript,
      modelId: DEFAULT_ELEVENLABS_MODEL,
      voiceSettings: {
        stability: 0.36,
        similarity_boost: 0.90,
        style: 0.45,
        use_speaker_boost: true,
      },
      previousText: '[panicked, hushed urgent whisper into a phone in a dark hallway after a murder]',
    });

    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    return {
      success: true,
      audioUrl: `data:audio/mpeg;base64,${base64Audio}`,
      transcript: dramaticTranscript,
      voiceName: selectedVoice.label,
      voiceBadge,
    };
  } catch (err: any) {
    console.warn('[generateLandingDemoVoiceClueAction] Falling back to pre-generated dramatic clip:', err?.message);
    return {
      success: true,
      audioUrl: fallbackStaticUrl,
      transcript: dramaticTranscript,
      voiceName: selectedVoice.label,
      voiceBadge,
    };
  }
}

