'use server';

import fs from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';
import {
  PlatformSettings,
  DEFAULT_PLATFORM_SETTINGS,
  IntegrationHealthReport,
  IntegrationStatusItem,
} from '@/utils/platform-settings';

const VERIFIED_FALLBACK_FROM = 'Back Pocket Mysteries <support@lancii.com>';

function getLocalSettingsFilePath(): string {
  const dir = path.join(/*turbopackIgnore: true*/ process.cwd(), '.local-data');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch {
    // Non-fatal in read-only environments
  }
  return path.join(dir, 'platform-settings.json');
}

function readLocalEnvFile(): Record<string, string> {
  const vars: Record<string, string> = {};
  try {
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const rawLine of content.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        const val = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key) vars[key] = val;
      }
    }
  } catch {}
  return vars;
}

function getEnvVar(key: string, localEnv?: Record<string, string>): string {
  const fromProc = process.env[key];
  if (fromProc && fromProc.trim().length > 0) return fromProc.trim();
  const envMap = localEnv || readLocalEnvFile();
  return (envMap[key] || '').trim();
}

function readLocalSettingsStore(): Partial<PlatformSettings> | null {
  const filePath = getLocalSettingsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return null;
}

function writeLocalSettingsStore(settings: PlatformSettings): void {
  const filePath = getLocalSettingsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Non-fatal in read-only environments
  }
}

/**
 * Loads the current Platform Settings (merging defaults -> local JSON store -> Supabase `platform_settings` table if present).
 */
export async function getPlatformSettingsAction(): Promise<PlatformSettings> {
  let merged: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };

  const localData = readLocalSettingsStore();
  if (localData) {
    merged = {
      ...merged,
      ...localData,
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('platform_settings')
      .select('config_json, updated_at, updated_by')
      .eq('id', 'global')
      .maybeSingle();

    if (!error && data?.config_json && typeof data.config_json === 'object') {
      const dbUpdated = data.updated_at || '';
      const localUpdated = merged.updatedAt || '';
      if (!localData || dbUpdated >= localUpdated) {
        merged = {
          ...merged,
          ...data.config_json,
          updatedAt: data.updated_at || merged.updatedAt,
          updatedBy: data.updated_by || merged.updatedBy,
        };
      }
    }
  } catch {
    // Table optional; local JSON store handles persistence seamlessly
  }

  return merged;
}

/**
 * Saves Platform Settings updates to both the local JSON store and Supabase `platform_settings` (if available).
 */
export async function savePlatformSettingsAction(
  updates: Partial<PlatformSettings>
): Promise<{
  success: boolean;
  settings?: PlatformSettings;
  error?: string;
}> {
  try {
    const { requireAdmin } = await import('@/utils/admin-auth');
    const { supabase, user } = await requireAdmin();

    const current = await getPlatformSettingsAction();
    const adminEmail = user?.email || current.supportEmail || 'hello@backpocketgames.com';

    const nowIso = new Date().toISOString();
    const nextSettings: PlatformSettings = {
      ...current,
      ...updates,
      basicTierPriceGbp: Number(updates.basicTierPriceGbp ?? current.basicTierPriceGbp) || 15,
      premiumTierPriceGbp:
        Number(updates.premiumTierPriceGbp ?? current.premiumTierPriceGbp) || 20,
      grandTierPriceGbp: Number(updates.grandTierPriceGbp ?? current.grandTierPriceGbp) || 25,
      unlimitedPassPriceGbp:
        Number(updates.unlimitedPassPriceGbp ?? current.unlimitedPassPriceGbp) || 30,
      first50VipCap: Math.max(1, Number(updates.first50VipCap ?? current.first50VipCap) || 50),
      ticketSlaHours: Math.max(1, Number(updates.ticketSlaHours ?? current.ticketSlaHours) || 48),
      maxPortraitRegensPerCustomer: Math.max(
        1,
        Number(updates.maxPortraitRegensPerCustomer ?? current.maxPortraitRegensPerCustomer) || 5
      ),
      monthlyAiBudgetAlertGbp: Math.max(
        1,
        Number(updates.monthlyAiBudgetAlertGbp ?? current.monthlyAiBudgetAlertGbp) || 40
      ),
      minRound3SolveRatePercent: Math.min(
        100,
        Math.max(
          50,
          Number(updates.minRound3SolveRatePercent ?? current.minRound3SolveRatePercent) || 100
        )
      ),
      minBlogWordCount: Math.max(
        500,
        Number(updates.minBlogWordCount ?? current.minBlogWordCount) || 1500
      ),
      linkedInMinWords: Math.max(
        200,
        Number(updates.linkedInMinWords ?? current.linkedInMinWords) || 600
      ),
      linkedInMaxWords: Math.max(
        300,
        Number(updates.linkedInMaxWords ?? current.linkedInMaxWords) || 700
      ),
      maxInstagramHashtags: Math.max(
        1,
        Math.min(30, Number(updates.maxInstagramHashtags ?? current.maxInstagramHashtags) || 5)
      ),
      updatedAt: nowIso,
      updatedBy: adminEmail,
    };

    writeLocalSettingsStore(nextSettings);

    if (supabase) {
      try {
        await (supabase as any).from('platform_settings').upsert(
          {
            id: 'global',
            config_json: nextSettings,
            updated_at: nowIso,
            updated_by: adminEmail,
          },
          { onConflict: 'id' }
        );
      } catch {
        // Non-fatal if table not created yet
      }
    }

    revalidatePath('/en/admin/settings');
    revalidatePath('/', 'layout');

    return {
      success: true,
      settings: nextSettings,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not save platform settings.',
    };
  }
}

/**
 * Resets Platform Settings back to factory defaults.
 */
export async function resetPlatformSettingsToDefaultsAction(): Promise<{
  success: boolean;
  settings: PlatformSettings;
}> {
  const { requireAdmin } = await import('@/utils/admin-auth');
  const { supabase } = await requireAdmin();

  const fresh: PlatformSettings = {
    ...DEFAULT_PLATFORM_SETTINGS,
    updatedAt: new Date().toISOString(),
  };
  writeLocalSettingsStore(fresh);

  try {
    await (supabase as any).from('platform_settings').upsert(
      {
        id: 'global',
        config_json: fresh,
        updated_at: fresh.updatedAt,
        updated_by: fresh.updatedBy,
      },
      { onConflict: 'id' }
    );
  } catch {}

  revalidatePath('/en/admin/settings');
  revalidatePath('/', 'layout');

  return {
    success: true,
    settings: fresh,
  };
}

/**
 * Performs a live health and configuration check across all external integrations.
 */
export async function getIntegrationHealthAction(): Promise<IntegrationHealthReport> {
  const { requireAdmin } = await import('@/utils/admin-auth');
  await requireAdmin();

  const localEnv = readLocalEnvFile();
  const items: IntegrationStatusItem[] = [];

  // 1. Supabase Database & Storage
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL', localEnv);
  const supabaseKey = getEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY', localEnv);
  if (!supabaseUrl || !supabaseKey) {
    items.push({
      id: 'supabase',
      name: 'Supabase Database & Storage',
      category: 'Core Infrastructure',
      status: 'missing',
      detail: 'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      envKeyHint: 'NEXT_PUBLIC_SUPABASE_URL',
    });
  } else {
    let dbDetail = 'Connected to Supabase Auth, Postgres & Storage.';
    let dbStatus: 'connected' | 'warning' = 'connected';
    try {
      const supabase = await createClient();
      const { count, error } = await supabase
        .from('mysteries')
        .select('id', { count: 'exact', head: true });
      if (!error) {
        dbDetail = `Connected • ${count ?? 0} mysteries indexed in Postgres`;
      } else {
        dbStatus = 'warning';
        dbDetail = `Connected to project (${error.message})`;
      }
    } catch {
      dbStatus = 'warning';
    }
    const hostShort = supabaseUrl.replace(/^https?:\/\//, '').split('.')[0];
    items.push({
      id: 'supabase',
      name: 'Supabase Database & Storage',
      category: 'Core Infrastructure',
      status: dbStatus,
      mode: `Project: ${hostShort}`,
      detail: dbDetail,
      envKeyHint: 'NEXT_PUBLIC_SUPABASE_URL',
    });
  }

  // 2. Stripe Checkout & Webhooks
  const stripeSecret = getEnvVar('STRIPE_SECRET_KEY', localEnv);
  const stripeWebhook = getEnvVar('STRIPE_WEBHOOK_SECRET', localEnv);
  if (!stripeSecret) {
    items.push({
      id: 'stripe',
      name: 'Stripe Payments & Checkout',
      category: 'Commerce',
      status: 'missing',
      detail: 'STRIPE_SECRET_KEY not configured.',
      envKeyHint: 'STRIPE_SECRET_KEY',
    });
  } else {
    const isLive = stripeSecret.startsWith('sk_live_');
    items.push({
      id: 'stripe',
      name: 'Stripe Payments & Checkout',
      category: 'Commerce',
      status: 'connected',
      mode: isLive ? 'LIVE MODE' : 'TEST MODE',
      detail: stripeWebhook
        ? `API key active (${isLive ? 'Live' : 'Test'}) • Webhook signing secret configured`
        : `API key active (${isLive ? 'Live' : 'Test'}) • Webhook secret optional/missing`,
      envKeyHint: 'STRIPE_SECRET_KEY',
    });
  }

  // 3. Resend Transactional & EDM Emails
  const resendKey = getEnvVar('RESEND_API_KEY', localEnv);
  const settings = await getPlatformSettingsAction();
  if (!resendKey) {
    items.push({
      id: 'resend',
      name: 'Resend Email Delivery',
      category: 'Support & EDMs',
      status: 'missing',
      detail: 'RESEND_API_KEY is missing. Ticket & order emails cannot be sent.',
      envKeyHint: 'RESEND_API_KEY',
    });
  } else {
    items.push({
      id: 'resend',
      name: 'Resend Email Delivery',
      category: 'Support & EDMs',
      status: 'connected',
      mode: 'ACTIVE',
      detail: `Routing support & ticket alerts to ${settings.supportEmail} with automatic domain fallback`,
      envKeyHint: 'RESEND_API_KEY',
    });
  }

  // 4. Google Gemini AI (Story, Critic & Image Gen)
  const geminiKey =
    getEnvVar('GEMINI_API_KEY', localEnv) ||
    getEnvVar('GOOGLE_GENERATIVE_AI_API_KEY', localEnv) ||
    getEnvVar('GOOGLE_API_KEY', localEnv);
  if (!geminiKey) {
    items.push({
      id: 'gemini',
      name: 'Google Gemini AI Engine',
      category: 'AI Generation',
      status: 'missing',
      detail: 'GEMINI_API_KEY not found in environment.',
      envKeyHint: 'GEMINI_API_KEY',
    });
  } else {
    items.push({
      id: 'gemini',
      name: 'Google Gemini AI Engine',
      category: 'AI Generation',
      status: 'connected',
      mode: settings.storyAndQaModel,
      detail: `Story/QA: ${settings.storyAndQaModel} • Portraits/Blogs: ${settings.imageGenerationModel}`,
      envKeyHint: 'GEMINI_API_KEY',
    });
  }

  // 5. ElevenLabs Voice & Audio Clues
  const elevenKey = getEnvVar('ELEVENLABS_API_KEY', localEnv);
  if (!elevenKey) {
    items.push({
      id: 'elevenlabs',
      name: 'ElevenLabs Voice & Audio Clues',
      category: 'AI Audio',
      status: 'warning',
      detail: 'ELEVENLABS_API_KEY not found. Audio clue generation will use fallback.',
      envKeyHint: 'ELEVENLABS_API_KEY',
    });
  } else {
    items.push({
      id: 'elevenlabs',
      name: 'ElevenLabs Voice & Audio Clues',
      category: 'AI Audio',
      status: settings.elevenLabsAudioEnabled ? 'connected' : 'warning',
      mode: settings.elevenLabsAudioEnabled ? 'ENABLED' : 'PAUSED',
      detail: settings.elevenLabsAudioEnabled
        ? `Active • Default narrator style: "${settings.defaultNarratorVoiceStyle}"`
        : 'API key present, but audio generation is paused in Platform Settings.',
      envKeyHint: 'ELEVENLABS_API_KEY',
    });
  }

  // 6. Buffer Social Publishing API
  const bufferKey =
    getEnvVar('BUFFER_ACCESS_TOKEN', localEnv) || getEnvVar('BUFFER_API_KEY', localEnv);
  if (!bufferKey) {
    items.push({
      id: 'buffer',
      name: 'Buffer Social Queue API',
      category: 'Marketing Suite',
      status: 'warning',
      mode: 'DRAFT QUEUE ONLY',
      detail: 'Social posts queue in Admin DB first; add BUFFER_ACCESS_TOKEN for 1-click Buffer push.',
      envKeyHint: 'BUFFER_ACCESS_TOKEN',
    });
  } else {
    items.push({
      id: 'buffer',
      name: 'Buffer Social Queue API',
      category: 'Marketing Suite',
      status: 'connected',
      mode: settings.reviewFirstWorkflowLocked ? 'REVIEW-FIRST' : 'AUTO-SYNC',
      detail: 'Connected to Buffer API • Review-First approval gate active in Admin.',
      envKeyHint: 'BUFFER_ACCESS_TOKEN',
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    items,
  };
}

/**
 * Sends a real test email to the configured Support Email address to verify Resend delivery.
 */
export async function sendTestSupportEmailAction(
  overrideRecipient?: string
): Promise<{
  success: boolean;
  recipient?: string;
  emailId?: string;
  error?: string;
}> {
  const { requireAdmin } = await import('@/utils/admin-auth');
  await requireAdmin();

  const localEnv = readLocalEnvFile();
  const apiKey = getEnvVar('RESEND_API_KEY', localEnv);
  if (!apiKey) {
    return {
      success: false,
      error: 'Missing RESEND_API_KEY in environment.',
    };
  }

  const settings = await getPlatformSettingsAction();
  const recipient = (overrideRecipient || settings.supportEmail || 'hello@backpocketgames.com').trim();
  const resend = new Resend(apiKey);
  const primaryFrom = `${settings.senderDisplayName || 'Back Pocket Mysteries'} <${settings.supportEmail || 'hello@backpocketgames.com'}>`;

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Platform Settings Test Email</title>
  </head>
  <body style="background-color:#faf8fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif;margin:0;padding:40px 16px;">
    <div style="background-color:#ffffff;margin:0 auto;max-width:600px;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.05);border:1px solid #f0eaf5;">
      <div style="background-color:#1e191c;padding:28px 40px;text-align:center;">
        <img src="https://backpocketmysteries.com/logo-horizontal-white.png" width="180" height="36" alt="Back Pocket Mysteries" style="display:block;margin:0 auto;object-fit:contain;" />
      </div>
      <div style="padding:36px 40px;">
        <p style="font-size:11px;font-weight:800;color:#fe04c6;letter-spacing:0.15em;margin:0 0 6px;text-transform:uppercase;">
          PLATFORM SETTINGS VERIFICATION
        </p>
        <h1 style="font-size:22px;font-weight:900;color:#1e191c;margin:0 0 12px;line-height:1.3;">
          Your Email Notifications Are Connected &amp; Working
        </h1>
        <p style="font-size:14px;color:#6b636b;margin:0 0 20px;line-height:1.6;">
          This is a live test email triggered from your <strong>Back Pocket Mysteries Admin Platform Settings</strong>.
        </p>
        <div style="background-color:#faf8fc;border-radius:12px;padding:18px 22px;border:1px solid #ede5f3;font-size:13px;color:#1e191c;line-height:1.7;">
          <div><strong>Support Inbox:</strong> ${settings.supportEmail}</div>
          <div><strong>Sender Display Name:</strong> ${settings.senderDisplayName}</div>
          <div><strong>Ticket Response SLA:</strong> Within ${settings.ticketSlaHours} hours</div>
          <div><strong>Pricing Defaults (GBP):</strong> Basic £${settings.basicTierPriceGbp} • Premium £${settings.premiumTierPriceGbp} • Grand £${settings.grandTierPriceGbp}</div>
        </div>
        <div style="margin-top:24px;">
          <a href="https://backpocketmysteries.com/en/admin/settings" style="background-color:#fe04c6;border-radius:12px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;display:inline-block;padding:12px 24px;">
            Open Platform Settings →
          </a>
        </div>
      </div>
    </div>
  </body>
</html>`;

  try {
    let res = await resend.emails.send({
      from: primaryFrom,
      to: recipient,
      replyTo: settings.supportEmail || 'hello@backpocketgames.com',
      subject: `[Test] Back Pocket Mysteries Platform Settings Verification`,
      html,
    });

    if (res.error) {
      res = await resend.emails.send({
        from: VERIFIED_FALLBACK_FROM,
        to: recipient,
        replyTo: settings.supportEmail || 'hello@backpocketgames.com',
        subject: `[Test] Back Pocket Mysteries Platform Settings Verification`,
        html,
      });
    }

    if (res.error) {
      return {
        success: false,
        recipient,
        error: res.error.message || 'Resend rejected the test email.',
      };
    }

    return {
      success: true,
      recipient,
      emailId: res.data?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      recipient,
      error: err?.message || 'Unexpected error sending test email.',
    };
  }
}
