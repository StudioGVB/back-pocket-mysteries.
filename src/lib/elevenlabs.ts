export const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export type ElevenLabsModelId =
  | 'eleven_v3'
  | 'eleven_multilingual_v2'
  | 'eleven_turbo_v2_5';

export const DEFAULT_ELEVENLABS_MODEL: ElevenLabsModelId = 'eleven_v3';

export interface ElevenLabsVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface SynthesizeSpeechOptions {
  voiceId: string;
  text: string;
  modelId?: ElevenLabsModelId;
  voiceSettings?: ElevenLabsVoiceSettings;
  previousText?: string;
  nextText?: string;
}

/**
 * Validates and returns the server-side ElevenLabs API key.
 */
export function getElevenLabsApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Missing ELEVENLABS_API_KEY environment variable. Add ELEVENLABS_API_KEY to .env.local and restart the dev server.'
    );
  }
  return apiKey;
}

/**
 * Calls the ElevenLabs Text-to-Speech API for a single dialogue line and returns the MP3 ArrayBuffer.
 * Uses `eleven_v3` by default so inline emotional acting tags (e.g. `[angry, disbelief]`, `[whispers]`, `[laughs]`)
 * guide vocal inflection, pacing, and emotion instead of sounding monotone.
 */
export async function synthesizeSpeechLine({
  voiceId,
  text,
  modelId = DEFAULT_ELEVENLABS_MODEL,
  voiceSettings,
  previousText,
  nextText,
}: SynthesizeSpeechOptions): Promise<ArrayBuffer> {
  const apiKey = getElevenLabsApiKey();
  const rawText = text.trim();

  if (!rawText) {
    throw new Error('Cannot synthesize empty dialogue line.');
  }

  // If a v2 model is selected instead of eleven_v3, strip inline [acting tags] from spoken text
  // so v2 doesn't read them aloud, and move them into previous_text as prosody context.
  const isV3 = modelId === 'eleven_v3';
  const cleanText = isV3
    ? rawText
    : rawText.replace(/\[[^\]]+\]\s*/g, '').trim() || rawText;

  const url = `${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`;

  const payload: Record<string, any> = {
    text: cleanText,
    model_id: modelId,
    voice_settings: {
      // Lower stability (0.30) + higher style (0.72) unlocks natural emotional pitch & urgency
      stability: voiceSettings?.stability ?? 0.30,
      similarity_boost: voiceSettings?.similarity_boost ?? 0.80,
      style: voiceSettings?.style ?? 0.72,
      use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
    },
  };

  if (!isV3 && previousText) {
    payload.previous_text = previousText;
  }
  if (!isV3 && nextText) {
    payload.next_text = nextText;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return await response.arrayBuffer();
    }

    if (response.status === 429 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }

    let detail = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      detail =
        errJson?.detail?.message ||
        errJson?.detail ||
        errJson?.error ||
        JSON.stringify(errJson);
    } catch {
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
    }

    if (response.status === 403 && voiceId !== 'pFZP5JQG7iQjIQuC4Bku') {
      console.warn(
        `[ElevenLabs] Voice ${voiceId} returned 403 (requires Creator tier); retrying with premade voice pFZP5JQG7iQjIQuC4Bku`
      );
      return synthesizeSpeechLine({
        voiceId: 'pFZP5JQG7iQjIQuC4Bku',
        text,
        modelId,
        voiceSettings,
        previousText,
        nextText,
      });
    }

    lastError = new Error(`ElevenLabs TTS failed (${response.status}): ${detail}`);
    break;
  }

  throw lastError || new Error('ElevenLabs TTS request failed.');
}

/**
 * Strips leading ID3v2 tags, initial Xing/Info VBR/CBR header frames, and trailing ID3v1 tags
 * from an MP3 buffer so multiple segments can be concatenated seamlessly with accurate HTML5 duration.
 */
export function stripMp3MetadataFrames(buffer: Buffer): Buffer {
  let offset = 0;
  let end = buffer.length;

  // 1. Strip leading ID3v2 tag ("ID3")
  if (
    end >= 10 &&
    buffer[0] === 0x49 && // 'I'
    buffer[1] === 0x44 && // 'D'
    buffer[2] === 0x33    // '3'
  ) {
    const flags = buffer[5];
    const footerSize = flags & 0x10 ? 10 : 0;
    const tagSize =
      ((buffer[6] & 0x7f) << 21) |
      ((buffer[7] & 0x7f) << 14) |
      ((buffer[8] & 0x7f) << 7) |
      (buffer[9] & 0x7f);
    const totalId3 = 10 + tagSize + footerSize;
    if (totalId3 < end) {
      offset = totalId3;
    }
  }

  // 2. Strip trailing ID3v1 tag ("TAG" in last 128 bytes)
  if (
    end - offset >= 128 &&
    buffer[end - 128] === 0x54 && // 'T'
    buffer[end - 127] === 0x41 && // 'A'
    buffer[end - 126] === 0x47    // 'G'
  ) {
    end -= 128;
  }

  // 3. Check if the first MPEG frame is a Xing / Info header frame (which would lock duration to only segment 1)
  if (end - offset >= 4 && buffer[offset] === 0xff && (buffer[offset + 1] & 0xe0) === 0xe0) {
    const padding = (buffer[offset + 2] >> 1) & 0x01;
    // Standard 44.1kHz 128kbps MPEG-1 Layer III frame is 417 + padding bytes
    const firstFrameLen = Math.min(end - offset, 417 + padding);
    const firstFrameSlice = buffer.subarray(offset, offset + firstFrameLen);
    if (
      firstFrameSlice.includes(Buffer.from('Info')) ||
      firstFrameSlice.includes(Buffer.from('Xing'))
    ) {
      offset += firstFrameLen;
    }
  }

  return buffer.subarray(offset, end);
}

/**
 * Generates a silent MPEG-1 Layer III (44.1kHz, 128kbps) buffer of the specified duration in ms.
 * Each frame is 417 bytes and spans ~26.122ms (1152 samples at 44,100Hz).
 */
export function createSilentMp3Buffer(durationMs = 350): Buffer {
  const frameDurationMs = (1152 / 44100) * 1000; // ~26.12245 ms
  const frameCount = Math.max(1, Math.round(durationMs / frameDurationMs));
  const frameSize = 417; // floor((144 * 128000) / 44100)

  const singleSilentFrame = Buffer.alloc(frameSize, 0x00);
  // MPEG-1 Layer 3, 128kbps, 44.1kHz, Joint Stereo/Mono silent frame header
  singleSilentFrame[0] = 0xff;
  singleSilentFrame[1] = 0xfb;
  singleSilentFrame[2] = 0x90;
  singleSilentFrame[3] = 0xc4;

  const frames: Buffer[] = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(singleSilentFrame);
  }
  return Buffer.concat(frames);
}

/**
 * Concatenates an array of raw MP3 ArrayBuffers sequentially, inserting a silent MP3 gap between turns.
 */
export function concatenateMp3Buffers(
  lineBuffers: ArrayBuffer[],
  gapDurationMs = 350
): Buffer {
  if (lineBuffers.length === 0) {
    return Buffer.alloc(0);
  }

  const silentGap = gapDurationMs > 0 ? createSilentMp3Buffer(gapDurationMs) : null;
  const chunks: Buffer[] = [];

  lineBuffers.forEach((ab, idx) => {
    const raw = Buffer.from(ab);
    const cleaned = stripMp3MetadataFrames(raw);
    if (cleaned.length > 0) {
      if (chunks.length > 0 && silentGap) {
        chunks.push(silentGap);
      }
      chunks.push(cleaned);
    } else if (raw.length > 0 && idx === 0) {
      chunks.push(raw);
    }
  });

  return Buffer.concat(chunks);
}
