import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { createClient } from '@/utils/supabase/server';

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
  candidatesTokensDetails?: Array<{
    modality?: string;
    tokenCount?: number;
  }>;
}

export interface AiUsageData {
  model_name: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  feature_name: string;
  mystery_id?: string;
  user_id?: string;
  usageMetadata?: GeminiUsageMetadata | null;
}

export interface StoredAiUsageLog {
  id: string;
  model_name: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  feature_name: string;
  mystery_id: string | null;
  user_id: string | null;
  created_at: string;
  source?: 'logged' | 'google_storage' | 'elevenlabs_api';
}

/**
 * Official Google AI Studio / Gemini API Paid Tier Pricing (USD per 1M tokens or per image)
 * & ElevenLabs Creator Tier Pricing (USD per 1,000 characters)
 */
export const AI_PRICING: Record<
  string,
  | { inputPer1M: number; outputPer1M: number; fallbackPerImage?: number }
  | { image: number }
  | { per1kChars: number }
> = {
  // Gemini 2.5 Flash (Text / Multimodal): $0.30 / 1M input, $2.50 / 1M output (incl. thinking tokens)
  'gemini-2.5-flash': {
    inputPer1M: 0.30,
    outputPer1M: 2.50,
  },
  // Gemini 2.5 Pro: $1.25 / 1M input, $10.00 / 1M output (incl. thinking tokens)
  'gemini-2.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 10.00,
  },
  // Gemini 2.5 Flash Image (Nano Banana): $0.30 / 1M input, $30.00 / 1M image output tokens (~1290 tokens = $0.0387/image)
  'gemini-2.5-flash-image': {
    inputPer1M: 0.30,
    outputPer1M: 30.00,
    fallbackPerImage: 0.039,
  },
  // Legacy Gemini 1.5
  'gemini-1.5-flash': {
    inputPer1M: 0.075,
    outputPer1M: 0.30,
  },
  'gemini-1.5-pro': {
    inputPer1M: 1.25,
    outputPer1M: 5.00,
  },
  // Imagen 4 / Imagen 3
  'imagen-4.0-generate-001': {
    image: 0.04,
  },
  'imagen-3.0-generate-002': {
    image: 0.03,
  },
  // ElevenLabs TTS Models
  'elevenlabs:eleven_v3': {
    per1kChars: 0.30,
  },
  'elevenlabs:eleven_multilingual_v2': {
    per1kChars: 0.30,
  },
  'elevenlabs:eleven_turbo_v2_5': {
    per1kChars: 0.15,
  },
};

const LOCAL_LOG_PATH = path.join(process.cwd(), 'data', 'ai-usage-logs.json');
const STORAGE_LOG_PATH = 'system/ai-usage-logs.json';

export function calculateAiCost(data: AiUsageData): {
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
} {
  const meta = data.usageMetadata;
  const promptTokens =
    data.prompt_tokens ?? meta?.promptTokenCount ?? 0;

  // Google bills thinking tokens (thoughtsTokenCount) at the output token rate
  const rawCompletion =
    data.completion_tokens ??
    ((meta?.candidatesTokenCount || 0) + (meta?.thoughtsTokenCount || 0));

  const rates = AI_PRICING[data.model_name];
  let costUsd = 0;

  if (rates) {
    if ('image' in rates) {
      costUsd = rates.image;
    } else if ('per1kChars' in rates) {
      costUsd = (promptTokens / 1000) * rates.per1kChars;
    } else {
      const inputCost = promptTokens * (rates.inputPer1M / 1_000_000);
      if (data.model_name === 'gemini-2.5-flash-image' && rawCompletion === 0) {
        // Default 1024x1024 image output = 1290 tokens (~$0.0387)
        costUsd = inputCost + (rates.fallbackPerImage ?? 0.039);
      } else {
        const outputCost = rawCompletion * (rates.outputPer1M / 1_000_000);
        costUsd = inputCost + outputCost;
      }
    }
  } else if (data.model_name.includes('image') || data.model_name.includes('imagen')) {
    costUsd = 0.039;
  } else if (data.model_name.startsWith('elevenlabs:')) {
    costUsd = (promptTokens / 1000) * 0.30;
  } else {
    // Default to Gemini 2.5 Flash rate
    costUsd =
      promptTokens * (0.30 / 1_000_000) + rawCompletion * (2.50 / 1_000_000);
  }

  return {
    promptTokens,
    completionTokens:
      data.model_name === 'gemini-2.5-flash-image' && rawCompletion === 0
        ? 1290
        : rawCompletion,
    costUsd,
  };
}

export async function readLocalAiLogs(): Promise<StoredAiUsageLog[]> {
  try {
    const raw = await fs.readFile(LOCAL_LOG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function appendLocalAiLog(entry: StoredAiUsageLog) {
  try {
    await fs.mkdir(path.dirname(LOCAL_LOG_PATH), { recursive: true });
    const existing = await readLocalAiLogs();
    existing.unshift(entry);
    await fs.writeFile(LOCAL_LOG_PATH, JSON.stringify(existing.slice(0, 1000), null, 2), 'utf8');
  } catch (err) {
    console.warn('Could not write local AI usage log:', err);
  }
}

export async function logAiUsage(data: AiUsageData) {
  try {
    const { promptTokens, completionTokens, costUsd } = calculateAiCost(data);
    const supabase = (await createClient()) as any;

    let userId = data.user_id;
    if (!userId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        userId = authData?.user?.id;
      } catch {}
    }

    const logEntry: StoredAiUsageLog = {
      id: crypto.randomUUID(),
      model_name: data.model_name,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      cost_usd: Number(costUsd.toFixed(6)),
      feature_name: data.feature_name,
      mystery_id: data.mystery_id || null,
      user_id: userId || null,
      created_at: new Date().toISOString(),
      source: 'logged',
    };

    // 1. Always persist to local JSON file so dev & node server always have immediate access
    await appendLocalAiLog(logEntry);

    // 2. Insert into Supabase table `ai_usage_logs`
    const { error } = await supabase.from('ai_usage_logs').insert({
      model_name: logEntry.model_name,
      prompt_tokens: logEntry.prompt_tokens,
      completion_tokens: logEntry.completion_tokens,
      cost_usd: logEntry.cost_usd,
      feature_name: logEntry.feature_name,
      mystery_id: logEntry.mystery_id,
      user_id: logEntry.user_id,
    });

    if (error) {
      console.warn('Supabase ai_usage_logs insert notice:', error.message);
    }

    // 3. Also sync to Supabase Storage (`character-images/system/ai-usage-logs.json`) if authenticated
    try {
      const existingLogs = await readLocalAiLogs();
      await supabase.storage
        .from('character-images')
        .upload(STORAGE_LOG_PATH, Buffer.from(JSON.stringify(existingLogs.slice(0, 500))), {
          contentType: 'application/json',
          upsert: true,
        });
    } catch {}
  } catch (err) {
    console.error('Error in logAiUsage utility:', err);
  }
}
