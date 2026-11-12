'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/admin-auth';
import { getAiCosts, getLiveAiProviderStatus } from '@/app/[locale]/(admin)/admin/admin-data';

export interface FinancialSettings {
  displayCurrency: 'GBP' | 'USD' | 'EUR' | 'AUD' | 'CAD';
  cardFeePercent: number; // e.g. 2.9% or 1.5%
  cardFeeFixed: number; // e.g. 0.30 or 0.20
  cardFeePreset: 'uk_stripe' | 'us_stripe' | 'intl_stripe' | 'custom';
  salesTaxName: string; // e.g. "VAT (UK)", "Sales Tax", "GST"
  salesTaxPercent: number; // e.g. 20, 10, 0
  salesTaxInclusive: boolean; // true if prices include VAT
  incomeTaxName: string; // e.g. "Corp / Income Tax Reserve"
  incomeTaxPercent: number; // e.g. 19
  updatedAt: string;
}

export type ExpenseCategory =
  | 'ai_credit_payment'
  | 'hosting_infra'
  | 'payment_processing'
  | 'tax_payment'
  | 'marketing_ads'
  | 'software_sub'
  | 'contractor_content'
  | 'other';

export interface LedgerEntry {
  id: string;
  type: 'income' | 'credit_payment' | 'operating_expense' | 'tax_remittance';
  category: ExpenseCategory | 'mystery_sale';
  title: string;
  vendorOrCustomer: string;
  amount: number;
  currency: string;
  date: string;
  status: 'settled' | 'pending' | 'refunded';
  notes?: string;
  isRecurring?: boolean;
  billingCycle?: 'monthly' | 'annual' | 'one_off';
}

interface StoredBalanceSheetData {
  settings: FinancialSettings;
  customEntries: LedgerEntry[];
}

export interface EnrichedOrderEconomics {
  id: string;
  customerName: string;
  customerEmail?: string;
  mysteryTitle: string;
  packageTier: string;
  createdAt: string;
  status: 'succeeded' | 'pending' | 'refunded' | 'failed';
  originalCurrency: string;
  originalAmount: number;
  grossAmount: number; // Converted to displayCurrency
  cardProcessingFee: number;
  salesTaxAmount: number;
  netAfterTaxAndFee: number;
  actualAiCost: number; // Only real logged AI cost tied to this mystery
  netOrderProfit: number;
  marginPercent: number;
  source: 'database' | 'manual_entry';
}

export interface RealAiLogItem {
  id: string;
  provider: 'Google AI (Gemini / Imagen)' | 'ElevenLabs Voice API';
  modelName: string;
  featureName: string;
  costUsd: number;
  costDisplay: number;
  createdAt: string;
}

export interface BalanceSheetReport {
  settings: FinancialSettings;
  orders: EnrichedOrderEconomics[];
  customEntries: LedgerEntry[];
  aiLogs: RealAiLogItem[];
  aiSummary: {
    googleSpendUsd: number;
    googleSpendDisplay: number;
    googleGenerationsCount: number;
    elevenLabsSpendUsd: number;
    elevenLabsSpendDisplay: number;
    elevenLabsGenerationsCount: number;
    elevenLabsNextInvoiceDisplay: number;
    elevenLabsOverageDisplay: number;
    totalAiSpendDisplay: number;
    totalGenerationsCount: number;
    googleConnected: boolean;
    elevenLabsConnected: boolean;
    elevenLabsTier: string;
    elevenLabsCharUsed: number;
    elevenLabsCharLimit: number;
  };
  mysteryNames: Array<{ id: string; title: string }>;
}

const STORE_FILENAME = '.balance-sheet-store.json';

const FX_FROM_USD: Record<string, number> = {
  USD: 1,
  GBP: 0.79,
  EUR: 0.92,
  AUD: 1.53,
  CAD: 1.38,
};

function convertSync(amount: number, fromCurrency: string, toCurrency: string): number {
  const from = (fromCurrency || 'GBP').toUpperCase();
  const to = (toCurrency || 'GBP').toUpperCase();
  if (from === to) return amount;
  const fromRate = FX_FROM_USD[from] || 1;
  const toRate = FX_FROM_USD[to] || 1;
  return (amount / fromRate) * toRate;
}

function getStorePath(): string {
  return path.join(/*turbopackIgnore: true*/ process.cwd(), STORE_FILENAME);
}

const DEFAULT_SETTINGS: FinancialSettings = {
  displayCurrency: 'GBP',
  cardFeePercent: 1.5,
  cardFeeFixed: 0.2,
  cardFeePreset: 'uk_stripe',
  salesTaxName: 'VAT',
  salesTaxPercent: 20,
  salesTaxInclusive: true,
  incomeTaxName: 'Corp / Income Tax',
  incomeTaxPercent: 19,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const SEEDED_FAKE_IDS = new Set([
  'credit-google-topup-1',
  'credit-elevenlabs-sub-1',
  'exp-supabase-vercel-1',
]);

async function readStore(): Promise<StoredBalanceSheetData> {
  try {
    const raw = await fs.readFile(getStorePath(), 'utf-8');
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed.customEntries)
      ? parsed.customEntries.filter((e: any) => !SEEDED_FAKE_IDS.has(e?.id))
      : [];
    return {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      customEntries: entries,
    };
  } catch {
    return {
      settings: DEFAULT_SETTINGS,
      customEntries: [],
    };
  }
}

async function writeStore(data: StoredBalanceSheetData): Promise<void> {
  try {
    await fs.writeFile(getStorePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write .balance-sheet-store.json:', err);
  }
}

function inferTierFromAmount(amount: number, currency: string): string {
  const gbpAmount = convertSync(amount, currency, 'GBP');
  if (gbpAmount >= 28) return 'Unlimited';
  if (gbpAmount >= 23) return 'Grand';
  if (gbpAmount >= 18) return 'Premium';
  return 'Basic';
}

export async function getBalanceSheetReportAction(): Promise<BalanceSheetReport> {
  await requireAdmin();
  const store = await readStore();
  const { settings, customEntries } = store;
  const targetCurr = settings.displayCurrency;

  const supabase = await createClient();

  // 1. Fetch mysteries for lookup
  const mysteriesMap: Record<string, string> = {};
  const mysteryNames: Array<{ id: string; title: string }> = [];
  try {
    const { data: mysteries } = await supabase.from('mysteries').select('id, title');
    for (const m of mysteries || []) {
      mysteriesMap[m.id] = m.title;
      mysteryNames.push({ id: m.id, title: m.title });
    }
    const { data: bases } = await (supabase as any).from('mystery_bases').select('id, title');
    for (const b of (bases as any[]) || []) {
      if (!mysteriesMap[b.id]) {
        mysteriesMap[b.id] = b.title;
        mysteryNames.push({ id: b.id, title: b.title });
      }
    }
  } catch {}

  // 2. Fetch profiles for lookup
  const profilesMap: Record<string, { name: string; email?: string }> = {};
  try {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email');
    for (const p of (profiles as any[]) || []) {
      profilesMap[p.id] = {
        name: p.full_name || p.email || 'Customer',
        email: p.email,
      };
    }
  } catch {}

  // 3. Fetch real AI usage logs & live provider subscription status
  const [rawAiLogs, providerStatus] = await Promise.all([
    getAiCosts(),
    getLiveAiProviderStatus(),
  ]);

  let googleSpendUsd = 0;
  let googleGenerationsCount = 0;
  let elevenLabsSpendUsd = 0;
  let elevenLabsGenerationsCount = 0;
  const aiCostByMysteryId: Record<string, number> = {};

  const aiLogs: RealAiLogItem[] = rawAiLogs.map((log) => {
    const costUsd = Number(log.cost_usd || 0);
    const isEleven =
      log.model_name.startsWith('elevenlabs:') || log.source === 'elevenlabs_api';
    if (isEleven) {
      elevenLabsSpendUsd += costUsd;
      elevenLabsGenerationsCount += 1;
    } else {
      googleSpendUsd += costUsd;
      googleGenerationsCount += 1;
    }
    if (log.mystery_id) {
      aiCostByMysteryId[log.mystery_id] = (aiCostByMysteryId[log.mystery_id] || 0) + costUsd;
    }
    return {
      id: log.id,
      provider: isEleven ? 'ElevenLabs Voice API' : 'Google AI (Gemini / Imagen)',
      modelName: log.model_name,
      featureName: log.feature_name,
      costUsd,
      costDisplay: convertSync(costUsd, 'USD', targetCurr),
      createdAt: log.created_at,
    };
  });

  const elevenNextInvoiceUsd =
    providerStatus.elevenStatus.nextInvoiceCents > 0
      ? providerStatus.elevenStatus.nextInvoiceCents / 100
      : 0;
  const elevenOverageUsd = Number(providerStatus.elevenStatus.overageUsd || 0);

  const googleSpendDisplay = convertSync(googleSpendUsd, 'USD', targetCurr);
  const elevenLabsSpendDisplay = convertSync(elevenLabsSpendUsd, 'USD', targetCurr);
  const elevenLabsNextInvoiceDisplay = convertSync(elevenNextInvoiceUsd, 'USD', targetCurr);
  const elevenLabsOverageDisplay = convertSync(elevenOverageUsd, 'USD', targetCurr);
  const totalAiSpendDisplay = googleSpendDisplay + elevenLabsSpendDisplay;

  // 4. Fetch ONLY real orders from Supabase `orders` table + user's manual income entries
  const rawOrders: Array<{
    id: string;
    customerName: string;
    customerEmail?: string;
    mysteryId?: string | null;
    mysteryTitle: string;
    packageTier: string;
    createdAt: string;
    status: 'succeeded' | 'pending' | 'refunded' | 'failed';
    currency: string;
    amount: number;
    source: 'database' | 'manual_entry';
  }> = [];

  try {
    const { data: dbOrders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    for (const o of (dbOrders as any[]) || []) {
      const profile = o.user_id ? profilesMap[o.user_id] : undefined;
      const mTitle =
        (o.mystery_id && mysteriesMap[o.mystery_id]) || 'Unknown Mystery';
      const curr = (o.currency || 'GBP').toUpperCase();
      const amt = Number(o.amount || 0);
      rawOrders.push({
        id: o.id,
        customerName: profile?.name || 'Guest',
        customerEmail: profile?.email,
        mysteryId: o.mystery_id,
        mysteryTitle: mTitle,
        packageTier: inferTierFromAmount(amt, curr),
        createdAt: o.created_at || new Date().toISOString(),
        status: (o.status as any) || 'succeeded',
        currency: curr,
        amount: amt,
        source: 'database',
      });
    }
  } catch (err) {
    console.warn('Error loading orders for balance sheet:', err);
  }

  for (const entry of customEntries) {
    if (entry.type === 'income') {
      rawOrders.push({
        id: entry.id,
        customerName: entry.vendorOrCustomer || 'Customer',
        mysteryTitle: entry.title,
        packageTier: inferTierFromAmount(entry.amount, entry.currency),
        createdAt: entry.date,
        status:
          entry.status === 'settled'
            ? 'succeeded'
            : entry.status === 'refunded'
              ? 'refunded'
              : 'pending',
        currency: entry.currency || targetCurr,
        amount: entry.amount,
        source: 'manual_entry',
      });
    }
  }

  // 5. Compute unit economics per real order
  const enrichedOrders: EnrichedOrderEconomics[] = rawOrders
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((o) => {
      const grossAmount = convertSync(o.amount, o.currency, targetCurr);
      const isSucceeded = o.status === 'succeeded';
      const isPending = o.status === 'pending';

      const fixedFeeInTarget = convertSync(
        settings.cardFeeFixed,
        settings.displayCurrency,
        targetCurr
      );
      const cardProcessingFee =
        grossAmount > 0 && (isSucceeded || isPending || o.status === 'refunded')
          ? (grossAmount * settings.cardFeePercent) / 100 + fixedFeeInTarget
          : 0;

      let salesTaxAmount = 0;
      if (isSucceeded && settings.salesTaxPercent > 0) {
        if (settings.salesTaxInclusive) {
          salesTaxAmount =
            grossAmount - grossAmount / (1 + settings.salesTaxPercent / 100);
        } else {
          salesTaxAmount = (grossAmount * settings.salesTaxPercent) / 100;
        }
      }

      // Strictly actual logged AI cost for this mystery (0 if none logged specifically to that mystery ID)
      const actualAiCost =
        o.mysteryId && aiCostByMysteryId[o.mysteryId]
          ? convertSync(aiCostByMysteryId[o.mysteryId], 'USD', targetCurr)
          : 0;

      const netAfterTaxAndFee = isSucceeded
        ? grossAmount - cardProcessingFee - salesTaxAmount
        : o.status === 'refunded'
          ? -cardProcessingFee
          : 0;

      const netOrderProfit = isSucceeded
        ? netAfterTaxAndFee - actualAiCost
        : o.status === 'refunded'
          ? -cardProcessingFee - actualAiCost
          : 0;

      const marginPercent =
        isSucceeded && grossAmount > 0 ? (netOrderProfit / grossAmount) * 100 : 0;

      return {
        id: o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        mysteryTitle: o.mysteryTitle,
        packageTier: o.packageTier,
        createdAt: o.createdAt,
        status: o.status,
        originalCurrency: o.currency,
        originalAmount: o.amount,
        grossAmount,
        cardProcessingFee,
        salesTaxAmount,
        netAfterTaxAndFee,
        actualAiCost,
        netOrderProfit,
        marginPercent,
        source: o.source,
      };
    });

  return {
    settings,
    orders: enrichedOrders,
    customEntries: customEntries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    aiLogs,
    aiSummary: {
      googleSpendUsd,
      googleSpendDisplay,
      googleGenerationsCount,
      elevenLabsSpendUsd,
      elevenLabsSpendDisplay,
      elevenLabsGenerationsCount,
      elevenLabsNextInvoiceDisplay,
      elevenLabsOverageDisplay,
      totalAiSpendDisplay,
      totalGenerationsCount: rawAiLogs.length,
      googleConnected: providerStatus.googleStatus.connected,
      elevenLabsConnected: providerStatus.elevenStatus.connected,
      elevenLabsTier: providerStatus.elevenStatus.tier,
      elevenLabsCharUsed: providerStatus.elevenStatus.characterCount,
      elevenLabsCharLimit: providerStatus.elevenStatus.characterLimit,
    },
    mysteryNames,
  };
}

export async function updateFinancialSettingsAction(
  partial: Partial<FinancialSettings>
): Promise<{ success: boolean; settings: FinancialSettings }> {
  await requireAdmin();
  const store = await readStore();
  const updated: FinancialSettings = {
    ...store.settings,
    ...partial,
    updatedAt: new Date().toISOString(),
  };
  await writeStore({
    ...store,
    settings: updated,
  });
  revalidatePath('/admin/balance-sheet');
  return { success: true, settings: updated };
}

export async function addLedgerEntryAction(
  entry: Omit<LedgerEntry, 'id'>
): Promise<{ success: boolean; entry: LedgerEntry }> {
  await requireAdmin();
  const store = await readStore();
  const newEntry: LedgerEntry = {
    ...entry,
    id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
  const updatedEntries = [newEntry, ...store.customEntries];
  await writeStore({
    ...store,
    customEntries: updatedEntries,
  });
  revalidatePath('/admin/balance-sheet');
  return { success: true, entry: newEntry };
}

export async function deleteLedgerEntryAction(
  id: string
): Promise<{ success: boolean }> {
  await requireAdmin();
  const store = await readStore();
  const updatedEntries = store.customEntries.filter((e) => e.id !== id);
  await writeStore({
    ...store,
    customEntries: updatedEntries,
  });
  revalidatePath('/admin/balance-sheet');
  return { success: true };
}
