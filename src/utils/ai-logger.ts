import { createClient } from '@/utils/supabase/server';

export interface AiUsageData {
  model_name: string;
  prompt_tokens?: number;
  completion_tokens?: number;
  feature_name: string;
  mystery_id?: string;
  user_id?: string;
}

// Pricing as of May 2026 (per 1 million tokens)
const PRICING = {
  'gemini-1.5-flash': {
    input: 0.075,
    output: 0.30
  },
  'gemini-2.5-flash': {
    input: 0.075,
    output: 0.30
  },
  'gemini-1.5-pro': {
    input: 3.50,
    output: 10.50
  },
  'gemini-2.5-pro': {
    input: 3.50,
    output: 10.50
  },
  'imagen-4.0-generate-001': {
    image: 0.03 // $0.03 per image
  }
};

export async function logAiUsage(data: AiUsageData) {
  try {
    let cost_usd = 0;
    const model = data.model_name as keyof typeof PRICING;
    const rates = PRICING[model];

    if (rates) {
      if ('image' in rates) {
        // Imagen pricing is per request/image
        cost_usd = rates.image;
      } else {
        // Token based pricing
        const inputCost = (data.prompt_tokens || 0) * (rates.input / 1000000);
        const outputCost = (data.completion_tokens || 0) * (rates.output / 1000000);
        cost_usd = inputCost + outputCost;
      }
    }

    const supabase = await createClient();
    
    // Attempt to get user_id if not provided
    let userId = data.user_id;
    if (!userId) {
      const { data: authData } = await supabase.auth.getUser();
      userId = authData?.user?.id;
    }

    // Insert asynchronously without throwing error to avoid breaking generation
    const { error } = await supabase.from('ai_usage_logs').insert({
      model_name: data.model_name,
      prompt_tokens: data.prompt_tokens || 0,
      completion_tokens: data.completion_tokens || 0,
      cost_usd: cost_usd,
      feature_name: data.feature_name,
      mystery_id: data.mystery_id || null,
      user_id: userId || null
    });

    if (error) {
      console.error('Failed to log AI usage to database:', error);
    }
  } catch (err) {
    console.error('Error in logAiUsage utility:', err);
  }
}
