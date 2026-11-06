'use client';

import React, { useState, useMemo, useTransition } from 'react';
import {
  BalanceSheetReport,
  FinancialSettings,
  LedgerEntry,
  ExpenseCategory,
  updateFinancialSettingsAction,
  addLedgerEntryAction,
  deleteLedgerEntryAction,
} from '@/app/actions/balance-sheet';

interface Props {
  initialReport: BalanceSheetReport;
}

type TimeframeFilter = 'all' | 'this_month' | '30d' | '7d' | 'ytd';
type ActiveLedgerTab = 'orders' | 'ai_spend' | 'credits_expenses';

const CATEGORY_LABELS: Record<ExpenseCategory | 'mystery_sale', string> = {
  mystery_sale: 'Mystery Package Sale',
  ai_credit_payment: 'AI / API Credit Payment',
  hosting_infra: 'Cloud & Hosting Infra',
  payment_processing: 'Card / Stripe Fee Adjustment',
  tax_payment: 'Tax / VAT Remittance',
  marketing_ads: 'Marketing & Ad Spend',
  software_sub: 'Software Subscription',
  contractor_content: 'Content / Audio Production',
  other: 'General Operating Expense',
};

export function BalanceSheetClient({ initialReport }: Props) {
  const [settings, setSettings] = useState<FinancialSettings>(initialReport.settings);
  const [customEntries, setCustomEntries] = useState<LedgerEntry[]>(initialReport.customEntries);
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [activeTab, setActiveTab] = useState<ActiveLedgerTab>('orders');
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // New Ledger Entry Form State
  const [newEntryType, setNewEntryType] = useState<LedgerEntry['type']>('operating_expense');
  const [newEntryCategory, setNewEntryCategory] = useState<ExpenseCategory | 'mystery_sale'>('hosting_infra');
  const [newEntryTitle, setNewEntryTitle] = useState('');
  const [newEntryVendor, setNewEntryVendor] = useState('');
  const [newEntryAmount, setNewEntryAmount] = useState('');
  const [newEntryDate, setNewEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newEntryStatus, setNewEntryStatus] = useState<LedgerEntry['status']>('settled');
  const [newEntryNotes, setNewEntryNotes] = useState('');
  const [newEntryCycle, setNewEntryCycle] = useState<'monthly' | 'annual' | 'one_off'>('one_off');

  const formatMoney = (amount: number, currencyOverride?: string) => {
    const curr = currencyOverride || settings.displayCurrency || 'GBP';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Timeframe cutoff
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (timeframe === '7d') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (timeframe === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (timeframe === 'this_month') return new Date(now.getFullYear(), now.getMonth(), 1);
    if (timeframe === 'ytd') return new Date(now.getFullYear(), 0, 1);
    return new Date(0);
  }, [timeframe]);

  // Strictly real orders filtered by timeframe
  const activeOrders = useMemo(() => {
    return initialReport.orders
      .filter((o) => new Date(o.createdAt) >= cutoffDate)
      .map((o) => {
        const grossAmount = o.grossAmount;
        const isSucceeded = o.status === 'succeeded';
        const isPending = o.status === 'pending';

        const cardProcessingFee =
          grossAmount > 0 && (isSucceeded || isPending || o.status === 'refunded')
            ? (grossAmount * settings.cardFeePercent) / 100 + settings.cardFeeFixed
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

        const netAfterTaxAndFee = isSucceeded
          ? grossAmount - cardProcessingFee - salesTaxAmount
          : o.status === 'refunded'
            ? -cardProcessingFee
            : 0;

        const netOrderProfit = isSucceeded
          ? netAfterTaxAndFee - o.actualAiCost
          : o.status === 'refunded'
            ? -cardProcessingFee - o.actualAiCost
            : 0;

        const marginPercent =
          isSucceeded && grossAmount > 0 ? (netOrderProfit / grossAmount) * 100 : 0;

        return {
          ...o,
          cardProcessingFee,
          salesTaxAmount,
          netAfterTaxAndFee,
          netOrderProfit,
          marginPercent,
        };
      });
  }, [initialReport.orders, cutoffDate, settings]);

  // Real AI generation logs filtered by timeframe
  const filteredAiLogs = useMemo(() => {
    return initialReport.aiLogs.filter((log) => new Date(log.createdAt) >= cutoffDate);
  }, [initialReport.aiLogs, cutoffDate]);

  // User-logged custom entries filtered by timeframe
  const filteredCustomEntries = useMemo(() => {
    return customEntries.filter((e) => new Date(e.date) >= cutoffDate);
  }, [customEntries, cutoffDate]);

  // Core Financial Calculations (Strictly Real Data)
  const financials = useMemo(() => {
    const succeededOrders = activeOrders.filter((o) => o.status === 'succeeded');
    const pendingOrders = activeOrders.filter((o) => o.status === 'pending');
    const refundedOrders = activeOrders.filter((o) => o.status === 'refunded');

    // 1. Gross Income & Refunds
    const grossSales = succeededOrders.reduce((sum, o) => sum + o.grossAmount, 0);
    const pendingSales = pendingOrders.reduce((sum, o) => sum + o.grossAmount, 0);
    const refundedSales = refundedOrders.reduce((sum, o) => sum + o.grossAmount, 0);
    const totalBilledVolume = grossSales + refundedSales;

    // 2. Credit / Card Processing Fees (Stripe)
    const cardFeesOnSucceeded = succeededOrders.reduce((sum, o) => sum + o.cardProcessingFee, 0);
    const cardFeesOnRefunded = refundedOrders.reduce((sum, o) => sum + o.cardProcessingFee, 0);
    const extraPaymentFeeEntries = filteredCustomEntries
      .filter((e) => e.category === 'payment_processing' && e.status === 'settled')
      .reduce((sum, e) => sum + e.amount, 0);
    const totalCardProcessingFees =
      cardFeesOnSucceeded + cardFeesOnRefunded + extraPaymentFeeEntries;

    // 3. Sales Tax / VAT Collected on Succeeded Orders
    const totalSalesTax = succeededOrders.reduce((sum, o) => sum + o.salesTaxAmount, 0);

    // 4. Net Revenue after Card Fees & Sales Tax
    const netRevenueAfterTaxAndCard = grossSales - totalCardProcessingFees - totalSalesTax;

    // 5. Real AI Generation Costs & Separate Operating / Hosting / Domain Expenses
    const googleAiCost = filteredAiLogs
      .filter((l) => l.provider === 'Google AI (Gemini / Imagen)')
      .reduce((sum, l) => sum + l.costDisplay, 0);
    const elevenLabsUsageCost = filteredAiLogs
      .filter((l) => l.provider === 'ElevenLabs Voice API')
      .reduce((sum, l) => sum + l.costDisplay, 0);
    const liveAiUsageCost = googleAiCost + elevenLabsUsageCost;

    // Manually logged AI credit top-up payments vs. Operating / Hosting / Domain expenses
    const loggedCreditPayments = filteredCustomEntries
      .filter((e) => e.type === 'credit_payment' && e.status === 'settled')
      .reduce((sum, e) => sum + e.amount, 0);

    const settledOperatingEntries = filteredCustomEntries.filter(
      (e) => e.type === 'operating_expense' && e.status === 'settled'
    );
    const loggedOperatingExpenses = settledOperatingEntries.reduce(
      (sum, e) => sum + e.amount,
      0
    );
    const hostingInfraCost = settledOperatingEntries
      .filter((e) => e.category === 'hosting_infra')
      .reduce((sum, e) => sum + e.amount, 0);
    const otherOperatingCost = Math.max(0, loggedOperatingExpenses - hostingInfraCost);

    const remittedTaxes = filteredCustomEntries
      .filter((e) => e.type === 'tax_remittance' && e.status === 'settled')
      .reduce((sum, e) => sum + e.amount, 0);

    // Strictly AI & Voice API Spend (never includes domains/hosting)
    const totalAiSpend = liveAiUsageCost + loggedCreditPayments;

    // Combined AI + Operating Spend for EBIT calculation
    const totalCreditsAndOperatingCost = totalAiSpend + loggedOperatingExpenses;

    // 6. Operating Profit (EBIT) before Corp / Income Tax
    const operatingProfitBeforeIncomeTax =
      netRevenueAfterTaxAndCard - totalCreditsAndOperatingCost;

    // 7. Estimated Corporation / Income Tax Reserve (only on positive operating profit)
    const estimatedIncomeTaxReserve =
      operatingProfitBeforeIncomeTax > 0
        ? (operatingProfitBeforeIncomeTax * settings.incomeTaxPercent) / 100
        : 0;

    // Total Tax Burden (VAT/Sales Tax + Corp/Income Tax Reserve)
    const totalTaxBurden = totalSalesTax + estimatedIncomeTaxReserve;
    const unpaidTaxLiability = Math.max(0, totalTaxBurden - remittedTaxes);

    // Total All-In Costs across all 4 cost types
    const totalAllCosts =
      totalCardProcessingFees + totalTaxBurden + totalAiSpend + loggedOperatingExpenses;

    // 8. Bottom-Line Net Profit / Net Position
    const netTakeHomeProfit = operatingProfitBeforeIncomeTax - estimatedIncomeTaxReserve;
    const netMarginPercent =
      grossSales > 0 ? (netTakeHomeProfit / grossSales) * 100 : 0;

    // 9. Balance Sheet: Assets vs Liabilities & Equity
    const cashFromSalesLessFees = grossSales - totalCardProcessingFees;
    const cashOutflowsPaid =
      loggedCreditPayments + loggedOperatingExpenses + remittedTaxes;
    const netCashPosition = cashFromSalesLessFees - cashOutflowsPaid;
    const accountsReceivable = pendingSales;
    const totalAssets = netCashPosition + accountsReceivable;

    // Liabilities: Unpaid taxes + metered AI usage accrued + upcoming ElevenLabs invoice
    const accruedAiPayable =
      Math.max(0, liveAiUsageCost - loggedCreditPayments) +
      initialReport.aiSummary.elevenLabsNextInvoiceDisplay;
    const totalLiabilities = unpaidTaxLiability + accruedAiPayable;
    const ownersEquity = totalAssets - totalLiabilities;

    return {
      succeededCount: succeededOrders.length,
      pendingCount: pendingOrders.length,
      refundedCount: refundedOrders.length,
      avgOrderValue: succeededOrders.length > 0 ? grossSales / succeededOrders.length : 0,
      grossSales,
      pendingSales,
      refundedSales,
      totalBilledVolume,
      totalCardProcessingFees,
      effectiveCardFeeRate: grossSales > 0 ? (totalCardProcessingFees / grossSales) * 100 : 0,
      totalSalesTax,
      netRevenueAfterTaxAndCard,
      googleAiCost,
      elevenLabsUsageCost,
      liveAiUsageCost,
      loggedCreditPayments,
      totalAiSpend,
      loggedOperatingExpenses,
      operatingEntriesCount: settledOperatingEntries.length,
      hostingInfraCost,
      otherOperatingCost,
      remittedTaxes,
      totalCreditsAndOperatingCost,
      totalAllCosts,
      operatingProfitBeforeIncomeTax,
      estimatedIncomeTaxReserve,
      totalTaxBurden,
      unpaidTaxLiability,
      netTakeHomeProfit,
      netMarginPercent,
      netCashPosition,
      accountsReceivable,
      totalAssets,
      accruedAiPayable,
      totalLiabilities,
      ownersEquity,
    };
  }, [activeOrders, filteredAiLogs, filteredCustomEntries, initialReport.aiSummary, settings]);

  // Handle Preset Selection for Card Fees
  const handleSelectCardPreset = (preset: FinancialSettings['cardFeePreset']) => {
    if (preset === 'uk_stripe') {
      setSettings((prev) => ({
        ...prev,
        cardFeePreset: 'uk_stripe',
        cardFeePercent: 1.5,
        cardFeeFixed: 0.2,
      }));
    } else if (preset === 'us_stripe') {
      setSettings((prev) => ({
        ...prev,
        cardFeePreset: 'us_stripe',
        cardFeePercent: 2.9,
        cardFeeFixed: 0.3,
      }));
    } else if (preset === 'intl_stripe') {
      setSettings((prev) => ({
        ...prev,
        cardFeePreset: 'intl_stripe',
        cardFeePercent: 3.25,
        cardFeeFixed: 0.3,
      }));
    } else {
      setSettings((prev) => ({ ...prev, cardFeePreset: 'custom' }));
    }
  };

  const handleSaveSettings = () => {
    startTransition(async () => {
      const res = await updateFinancialSettingsAction(settings);
      if (res.success) {
        setSettings(res.settings);
        setShowSettingsDrawer(false);
        setStatusBanner('Tax & processing fee settings saved.');
        setTimeout(() => setStatusBanner(null), 3500);
      }
    });
  };

  const handleAddLedgerEntry = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(newEntryAmount);
    if (!newEntryTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) return;

    startTransition(async () => {
      const res = await addLedgerEntryAction({
        type: newEntryType,
        category: newEntryType === 'income' ? 'mystery_sale' : newEntryCategory,
        title: newEntryTitle.trim(),
        vendorOrCustomer:
          newEntryVendor.trim() ||
          (newEntryType === 'income' ? 'Customer' : 'Provider'),
        amount: numericAmount,
        currency: settings.displayCurrency,
        date: new Date(newEntryDate).toISOString(),
        status: newEntryStatus,
        notes: newEntryNotes.trim() || undefined,
        isRecurring: newEntryCycle !== 'one_off',
        billingCycle: newEntryCycle,
      });

      if (res.success) {
        setCustomEntries((prev) => [res.entry, ...prev]);
        setShowAddEntryModal(false);
        setNewEntryTitle('');
        setNewEntryVendor('');
        setNewEntryAmount('');
        setNewEntryNotes('');
        setStatusBanner(`Added "${res.entry.title}" to the Balance Sheet.`);
        setTimeout(() => setStatusBanner(null), 3500);
      }
    });
  };

  const handleDeleteLedgerEntry = (id: string) => {
    startTransition(async () => {
      const res = await deleteLedgerEntryAction(id);
      if (res.success) {
        setCustomEntries((prev) => prev.filter((item) => item.id !== id));
        setStatusBanner('Entry removed.');
        setTimeout(() => setStatusBanner(null), 3000);
      }
    });
  };

  const handleExportCsv = () => {
    const headers = [
      'Type',
      'Date',
      'Reference ID',
      'Description',
      'Party / Provider',
      'Status',
      `Gross Income (${settings.displayCurrency})`,
      `Card Fee (${settings.displayCurrency})`,
      `Tax (${settings.displayCurrency})`,
      `AI / Credit / Ops Cost (${settings.displayCurrency})`,
      `Net Impact (${settings.displayCurrency})`,
    ];

    const rows: string[][] = [];

    for (const o of activeOrders) {
      rows.push([
        'ORDER',
        new Date(o.createdAt).toISOString().slice(0, 10),
        o.id,
        `${o.mysteryTitle} (${o.packageTier})`,
        o.customerName,
        o.status.toUpperCase(),
        o.grossAmount.toFixed(2),
        (-o.cardProcessingFee).toFixed(2),
        (-o.salesTaxAmount).toFixed(2),
        (-o.actualAiCost).toFixed(2),
        o.netOrderProfit.toFixed(2),
      ]);
    }

    for (const l of filteredAiLogs) {
      rows.push([
        'AI_GENERATION_COST',
        new Date(l.createdAt).toISOString().slice(0, 10),
        l.id,
        l.featureName,
        `${l.provider} (${l.modelName})`,
        'METERED',
        '0.00',
        '0.00',
        '0.00',
        (-l.costDisplay).toFixed(2),
        (-l.costDisplay).toFixed(2),
      ]);
    }

    for (const c of filteredCustomEntries) {
      if (c.type === 'income') continue;
      rows.push([
        c.type.toUpperCase(),
        new Date(c.date).toISOString().slice(0, 10),
        c.id,
        c.title,
        c.vendorOrCustomer,
        c.status.toUpperCase(),
        '0.00',
        c.category === 'payment_processing' ? (-c.amount).toFixed(2) : '0.00',
        c.type === 'tax_remittance' ? (-c.amount).toFixed(2) : '0.00',
        c.type === 'credit_payment' || c.type === 'operating_expense'
          ? (-c.amount).toFixed(2)
          : '0.00',
        (-c.amount).toFixed(2),
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `back-pocket-mysteries-balance-sheet-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
              Live Verified Ledger
            </span>
          </div>
          <h2 className="text-2xl font-black text-brand-dark uppercase tracking-tight mt-1">
            Balance Sheet &amp; Profit / Loss Breakdown
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            Strictly live database orders, Stripe card fees, VAT/Tax reserves, and metered Google AI &amp; ElevenLabs spend
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center bg-gray-100 p-1 rounded-full">
            {(
              [
                { id: 'all', label: 'All Time' },
                { id: 'this_month', label: 'This Month' },
                { id: '30d', label: '30 Days' },
                { id: '7d', label: '7 Days' },
                { id: 'ytd', label: 'YTD' },
              ] as Array<{ id: TimeframeFilter; label: string }>
            ).map((tf) => (
              <button
                key={tf.id}
                onClick={() => setTimeframe(tf.id)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                  timeframe === tf.id
                    ? 'bg-brand-dark text-white shadow-sm'
                    : 'text-gray-500 hover:text-brand-dark'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* Tax & Fee Settings Button */}
          <button
            onClick={() => setShowSettingsDrawer((prev) => !prev)}
            className="px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-gray-200 text-brand-dark hover:border-brand-dark transition-all flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Tax &amp; Fee Rates
          </button>

          {/* Add Credit Payment / Expense */}
          <button
            onClick={() => setShowAddEntryModal(true)}
            className="px-5 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-brand-pink text-white hover:opacity-95 transition-all shadow-sm"
          >
            + Log Credit / Expense
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest bg-brand-dark text-white hover:bg-black transition-all"
          >
            Export CSV
          </button>
        </div>
      </div>

      {statusBanner && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-6 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between">
          <span>{statusBanner}</span>
          <button onClick={() => setStatusBanner(null)} className="text-emerald-600 font-black">
            ✕
          </button>
        </div>
      )}

      {/* Configurable Tax, Currency & Card Processing Fee Drawer */}
      {showSettingsDrawer && (
        <div className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl space-y-6 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight">
                Tax, Card Fee &amp; Currency Settings
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Configure how Stripe fees and taxes are calculated on your real orders.
              </p>
            </div>
            <button
              onClick={() => setShowSettingsDrawer(false)}
              className="text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white"
            >
              Close ✕
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Reporting Currency */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-brand-pink">
                1. Reporting Currency
              </label>
              <select
                value={settings.displayCurrency}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    displayCurrency: e.target.value as FinancialSettings['displayCurrency'],
                  }))
                }
                className="w-full bg-slate-800 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-bold text-white"
              >
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="AUD">AUD (A$) — Australian Dollar</option>
                <option value="CAD">CAD (C$) — Canadian Dollar</option>
              </select>
            </div>

            {/* Stripe / Card Processing Fees */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-indigo-400">
                2. Card / Stripe Processing Fee
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleSelectCardPreset('uk_stripe')}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase border ${
                    settings.cardFeePreset === 'uk_stripe'
                      ? 'bg-indigo-500 text-white border-indigo-400'
                      : 'bg-slate-800 text-gray-300 border-white/10'
                  }`}
                >
                  UK 1.5% + 20p
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCardPreset('us_stripe')}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase border ${
                    settings.cardFeePreset === 'us_stripe'
                      ? 'bg-indigo-500 text-white border-indigo-400'
                      : 'bg-slate-800 text-gray-300 border-white/10'
                  }`}
                >
                  US 2.9% + 30c
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectCardPreset('intl_stripe')}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-black uppercase border ${
                    settings.cardFeePreset === 'intl_stripe'
                      ? 'bg-indigo-500 text-white border-indigo-400'
                      : 'bg-slate-800 text-gray-300 border-white/10'
                  }`}
                >
                  Intl 3.25%
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Fee %</span>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.cardFeePercent}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        cardFeePreset: 'custom',
                        cardFeePercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Fixed Per Tx</span>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.cardFeeFixed}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        cardFeePreset: 'custom',
                        cardFeeFixed: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  />
                </div>
              </div>
            </div>

            {/* Indirect Tax: VAT / GST / Sales Tax */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-amber-400">
                3. VAT / GST / Sales Tax
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Tax Label</span>
                  <input
                    type="text"
                    value={settings.salesTaxName}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, salesTaxName: e.target.value }))
                    }
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Rate (%)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="50"
                    value={settings.salesTaxPercent}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        salesTaxPercent: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.salesTaxInclusive}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      salesTaxInclusive: e.target.checked,
                    }))
                  }
                  className="rounded accent-brand-pink"
                />
                <span>Prices are tax-inclusive</span>
              </label>
            </div>

            {/* Direct Tax: Corporate / Income Tax Reserve */}
            <div className="bg-white/5 p-5 rounded-2xl border border-white/10 space-y-3">
              <label className="block text-[10px] font-black uppercase tracking-widest text-rose-400">
                4. Income / Corp Tax Rate
              </label>
              <div>
                <span className="text-[10px] text-gray-400 block mb-1">Rate (% of Profit)</span>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="60"
                  value={settings.incomeTaxPercent}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      incomeTaxPercent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-sm font-bold text-white"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSettingsDrawer(false)}
              className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleSaveSettings}
              className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-brand-pink text-white hover:opacity-95"
            >
              {isPending ? 'Saving...' : 'Save Rates'}
            </button>
          </div>
        </div>
      )}

      {/* 3 Main Executive KPIs: Revenue, Cost, Profit */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main KPI 1: Revenue */}
          <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                  1. Total Revenue
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase">
                  Gross Income
                </span>
              </div>
              <div className="text-4xl font-black text-brand-dark tracking-tight">
                {formatMoney(financials.grossSales)}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1.5">
                {financials.succeededCount} succeeded{' '}
                {financials.succeededCount === 1 ? 'order' : 'orders'}
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
              <span className="text-amber-600">
                Pending: {formatMoney(financials.pendingSales)}
              </span>
              <span className="text-gray-400">
                Refunded: {formatMoney(financials.refundedSales)}
              </span>
            </div>
          </div>

          {/* Main KPI 2: Cost */}
          <div className="bg-white p-7 rounded-[28px] border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-rose-500">
                  2. Total Cost
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase">
                  All Expenses &amp; Fees
                </span>
              </div>
              <div className="text-4xl font-black text-rose-600 tracking-tight">
                {financials.totalAllCosts > 0
                  ? `-${formatMoney(financials.totalAllCosts)}`
                  : formatMoney(0)}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-1.5">
                Combined AI APIs, domains &amp; hosting, card fees &amp; taxes
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
              <span>AI: {formatMoney(financials.totalAiSpend)}</span>
              <span>Ops/Domains: {formatMoney(financials.loggedOperatingExpenses)}</span>
              <span>
                Fees/Tax:{' '}
                {formatMoney(
                  financials.totalCardProcessingFees + financials.totalTaxBurden
                )}
              </span>
            </div>
          </div>

          {/* Main KPI 3: Profit */}
          <div className="bg-brand-dark text-white p-7 rounded-[28px] shadow-md flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                  3. Net Profit
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    financials.netTakeHomeProfit >= 0
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {financials.netTakeHomeProfit >= 0 ? 'Profitable' : 'Net Spend'}
                </span>
              </div>
              <div
                className={`text-4xl font-black tracking-tight ${
                  financials.netTakeHomeProfit >= 0 ? 'text-white' : 'text-rose-400'
                }`}
              >
                {formatMoney(financials.netTakeHomeProfit)}
              </div>
              <p className="text-xs text-gray-400 font-medium mt-1.5">
                Total Revenue minus Total Cost (Take-Home Bottom Line)
              </p>
            </div>
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] font-bold text-gray-300">
              <span>Revenue: {formatMoney(financials.grossSales)}</span>
              <span className="text-rose-300">
                Total Cost: {formatMoney(financials.totalAllCosts)}
              </span>
            </div>
          </div>
        </div>

        {/* Mini KPIs Below: Cost Breakdown by Type */}
        <div>
          <div className="flex items-center justify-between px-1 mb-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cost Breakdown by Category
            </span>
            <span className="text-[10px] font-bold text-gray-400">
              Total Costs: {formatMoney(financials.totalAllCosts)}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Mini KPI A: AI & Voice API Spend (Strictly AI) */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    AI &amp; Voice API Cost
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-pink-50 text-brand-pink text-[10px] font-black">
                    {filteredAiLogs.length} API calls
                  </span>
                </div>
                <div className="text-2xl font-black text-brand-pink tracking-tight">
                  {financials.totalAiSpend > 0
                    ? `-${formatMoney(financials.totalAiSpend)}`
                    : formatMoney(0)}
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Metered Google AI &amp; ElevenLabs + AI credit top-ups
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-500">
                  Google AI: {formatMoney(financials.googleAiCost)}
                </span>
                <span className="text-brand-pink">
                  ElevenLabs: {formatMoney(financials.elevenLabsUsageCost)}
                </span>
              </div>
            </div>

            {/* Mini KPI B: Domains, Hosting & Operating Expenses */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                    Domains, Hosting &amp; Ops
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-black">
                    {financials.operatingEntriesCount}{' '}
                    {financials.operatingEntriesCount === 1 ? 'bill' : 'bills'}
                  </span>
                </div>
                <div className="text-2xl font-black text-sky-600 tracking-tight">
                  {financials.loggedOperatingExpenses > 0
                    ? `-${formatMoney(financials.loggedOperatingExpenses)}`
                    : formatMoney(0)}
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Domains, web hosting, software &amp; overhead bills
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-500">
                  Domains/Infra: {formatMoney(financials.hostingInfraCost)}
                </span>
                <span className="text-sky-600">
                  Other Ops: {formatMoney(financials.otherOperatingCost)}
                </span>
              </div>
            </div>

            {/* Mini KPI C: Card Processing Fees */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                    Card Processing Fees
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-black">
                    {settings.cardFeePercent}% + {formatMoney(settings.cardFeeFixed)}
                  </span>
                </div>
                <div className="text-2xl font-black text-indigo-600 tracking-tight">
                  {financials.totalCardProcessingFees > 0
                    ? `-${formatMoney(financials.totalCardProcessingFees)}`
                    : formatMoney(0)}
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Stripe gateway fees on succeeded orders
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                <span>Effective Rate</span>
                <span className="text-indigo-600 font-black">
                  {financials.effectiveCardFeeRate.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Mini KPI D: Tax Owed & Reserves */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                    Tax Owed &amp; Reserve
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black">
                    {settings.salesTaxPercent}% {settings.salesTaxName}
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-600 tracking-tight">
                  {financials.totalTaxBurden > 0
                    ? `-${formatMoney(financials.totalTaxBurden)}`
                    : formatMoney(0)}
                </div>
                <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                  Calculated on real revenue &amp; positive profit
                </p>
              </div>
              <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold">
                <span className="text-gray-500">
                  {settings.salesTaxName}: {formatMoney(financials.totalSalesTax)}
                </span>
                <span className="text-amber-700">
                  Corp Tax: {formatMoney(financials.estimatedIncomeTaxReserve)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Formal Statements: P&L Statement + Balance Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Income vs Deductions (Profit & Loss Statement) */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-7 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Statement A
              </span>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                Revenue vs. Cost Breakdown (Profit &amp; Loss)
              </h3>
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase">
              {settings.displayCurrency} Live
            </span>
          </div>

          <div className="p-7 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              {/* Section 1: Revenue */}
              <div className="space-y-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  1. Operating Income (Orders)
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-700">
                    Gross Mystery Orders ({financials.succeededCount} succeeded)
                  </span>
                  <span className="font-black text-brand-dark">
                    {formatMoney(financials.grossSales)}
                  </span>
                </div>
                {financials.pendingSales > 0 && (
                  <div className="flex justify-between items-center text-sm text-amber-600">
                    <span>Pending Checkout Orders ({financials.pendingCount})</span>
                    <span className="font-bold">{formatMoney(financials.pendingSales)}</span>
                  </div>
                )}
                {financials.refundedSales > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Refunded Orders ({financials.refundedCount})</span>
                    <span className="font-bold text-rose-500">
                      -{formatMoney(financials.refundedSales)}
                    </span>
                  </div>
                )}
              </div>

              {/* Section 2: Direct Transaction & Indirect Tax Deductions */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                  2. Card Processing &amp; Sales Tax
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    Stripe / Card Processing Fees ({settings.cardFeePercent}% +{' '}
                    {formatMoney(settings.cardFeeFixed)})
                  </span>
                  <span className="font-bold text-indigo-600">
                    {financials.totalCardProcessingFees > 0
                      ? `-${formatMoney(financials.totalCardProcessingFees)}`
                      : formatMoney(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    {settings.salesTaxName} ({settings.salesTaxPercent}%{' '}
                    {settings.salesTaxInclusive ? 'inclusive' : 'exclusive'})
                  </span>
                  <span className="font-bold text-amber-600">
                    {financials.totalSalesTax > 0
                      ? `-${formatMoney(financials.totalSalesTax)}`
                      : formatMoney(0)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                  <span className="font-black text-brand-dark">
                    Net Revenue After Card Fees &amp; {settings.salesTaxName}
                  </span>
                  <span className="font-black text-brand-dark">
                    {formatMoney(financials.netRevenueAfterTaxAndCard)}
                  </span>
                </div>
              </div>

              {/* Section 3A: AI & Voice API Costs */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  3. AI &amp; Voice API Costs
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    Google AI (Gemini &amp; Imagen — {initialReport.aiSummary.googleGenerationsCount} generations)
                  </span>
                  <span className="font-bold text-brand-pink">
                    -{formatMoney(financials.googleAiCost)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    ElevenLabs Voice API ({initialReport.aiSummary.elevenLabsGenerationsCount} syntheses)
                  </span>
                  <span className="font-bold text-brand-pink">
                    -{formatMoney(financials.elevenLabsUsageCost)}
                  </span>
                </div>
                {financials.loggedCreditPayments > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Logged AI / API Credit Top-Up Payments</span>
                    <span className="font-bold text-brand-pink">
                      -{formatMoney(financials.loggedCreditPayments)}
                    </span>
                  </div>
                )}
              </div>

              {/* Section 3B: Domains, Hosting & Operating Expenses */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-sky-600">
                  4. Domains, Hosting &amp; Operating Expenses
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>Domains &amp; Web Infrastructure</span>
                  <span className="font-bold text-sky-600">
                    {financials.hostingInfraCost > 0
                      ? `-${formatMoney(financials.hostingInfraCost)}`
                      : formatMoney(0)}
                  </span>
                </div>
                {financials.otherOperatingCost > 0 && (
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>Software, Marketing &amp; Other Operating Costs</span>
                    <span className="font-bold text-sky-600">
                      -{formatMoney(financials.otherOperatingCost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-100">
                  <span className="font-black text-brand-dark">
                    Operating Profit / Loss (Before Corp Tax)
                  </span>
                  <span className="font-black text-brand-dark">
                    {formatMoney(financials.operatingProfitBeforeIncomeTax)}
                  </span>
                </div>
              </div>

              {/* Section 5: Corporate / Income Tax Reserve */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  5. Income / Corporation Tax Reserve
                </div>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>
                    {settings.incomeTaxName} ({settings.incomeTaxPercent}% on positive profit)
                  </span>
                  <span className="font-bold text-amber-600">
                    {financials.estimatedIncomeTaxReserve > 0
                      ? `-${formatMoney(financials.estimatedIncomeTaxReserve)}`
                      : formatMoney(0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Line Net Profit */}
            <div className="p-5 rounded-2xl bg-brand-dark text-white flex items-center justify-between mt-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Net Bottom Line
                </div>
                <div className="text-sm font-bold text-gray-300">
                  Net Profit After All AI, Domain/Ops, Fees &amp; Taxes
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-black ${
                    financials.netTakeHomeProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatMoney(financials.netTakeHomeProfit)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Provider Credit Status & Balance Sheet */}
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-7 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Statement B
              </span>
              <h3 className="text-lg font-black text-brand-dark uppercase tracking-tight">
                Balance Sheet &amp; Live API Credit Status
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
              Live APIs Connected
            </span>
          </div>

          <div className="p-7 space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5">
              {/* ASSETS */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-brand-dark">
                    1. Assets &amp; Receivables
                  </span>
                  <span className="text-sm font-black text-emerald-600">
                    {formatMoney(financials.totalAssets)}
                  </span>
                </div>
                <div className="space-y-2 text-sm border-t border-gray-200/70 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      Settled Sales Cash (After Card Fees &amp; Logged Bills)
                    </span>
                    <span className="font-bold text-brand-dark">
                      {formatMoney(financials.netCashPosition)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      Pending Orders Receivable ({financials.pendingCount} orders)
                    </span>
                    <span className="font-bold text-brand-dark">
                      {formatMoney(financials.accountsReceivable)}
                    </span>
                  </div>
                </div>
              </div>

              {/* LIABILITIES & ACCRUED COSTS */}
              <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-amber-900">
                    2. Tax Liabilities &amp; Accrued API Costs
                  </span>
                  <span className="text-sm font-black text-amber-700">
                    {formatMoney(financials.totalLiabilities)}
                  </span>
                </div>
                <div className="space-y-2 text-sm border-t border-amber-200/60 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      {settings.salesTaxName} Owed on Real Sales
                    </span>
                    <span className="font-bold text-amber-700">
                      {formatMoney(financials.totalSalesTax)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      {settings.incomeTaxName} Reserve ({settings.incomeTaxPercent}%)
                    </span>
                    <span className="font-bold text-amber-700">
                      {formatMoney(financials.estimatedIncomeTaxReserve)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-medium">
                      Metered AI Usage Accrued (Google AI + ElevenLabs)
                    </span>
                    <span className="font-bold text-brand-pink">
                      {formatMoney(financials.liveAiUsageCost)}
                    </span>
                  </div>
                  {initialReport.aiSummary.elevenLabsNextInvoiceDisplay > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">
                        ElevenLabs Next Subscription Invoice Due
                      </span>
                      <span className="font-bold text-amber-700">
                        {formatMoney(initialReport.aiSummary.elevenLabsNextInvoiceDisplay)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE AI PROVIDER CREDIT TELEMETRY */}
              <div className="p-5 rounded-2xl bg-pink-50/40 border border-pink-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                    3. Live Provider Credit Telemetry
                  </span>
                  <span className="text-xs font-bold text-gray-500">
                     ElevenLabs Tier: <strong className="uppercase text-brand-dark">{initialReport.aiSummary.elevenLabsTier}</strong>
                  </span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-600">
                    <span>ElevenLabs Character Quota Used</span>
                    <span>
                      {initialReport.aiSummary.elevenLabsCharUsed.toLocaleString()} /{' '}
                      {initialReport.aiSummary.elevenLabsCharLimit.toLocaleString()} chars (
                      {initialReport.aiSummary.elevenLabsCharLimit > 0
                        ? (
                            (initialReport.aiSummary.elevenLabsCharUsed /
                              initialReport.aiSummary.elevenLabsCharLimit) *
                            100
                          ).toFixed(1)
                        : '0'}
                      %)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-pink-200">
                    <div
                      style={{
                        width: `${Math.min(
                          100,
                          initialReport.aiSummary.elevenLabsCharLimit > 0
                            ? (initialReport.aiSummary.elevenLabsCharUsed /
                                initialReport.aiSummary.elevenLabsCharLimit) *
                              100
                            : 0
                        )}%`,
                      }}
                      className="h-full bg-brand-pink rounded-full"
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[11px] font-bold text-gray-500 pt-1">
                  <span>
                    Google AI Studio: {initialReport.aiSummary.googleGenerationsCount} calls (
                    {formatMoney(initialReport.aiSummary.googleSpendDisplay)})
                  </span>
                  <span>
                    ElevenLabs: {initialReport.aiSummary.elevenLabsGenerationsCount} syntheses (
                    {formatMoney(initialReport.aiSummary.elevenLabsSpendDisplay)})
                  </span>
                </div>
              </div>
            </div>

            {/* Net Balance Sheet Equity */}
            <div className="p-5 rounded-2xl bg-indigo-950 text-white flex items-center justify-between mt-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-300">
                  Net Balance Sheet Equity (Assets − Liabilities)
                </div>
                <div className="text-sm font-bold text-gray-300">
                  Real Cash Position Less Taxes &amp; Accrued Costs
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-2xl font-black ${
                    financials.ownersEquity >= 0 ? 'text-white' : 'text-rose-400'
                  }`}
                >
                  {formatMoney(financials.ownersEquity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Tabbed Ledgers: Real Orders | Real Metered AI Spend | Logged Credit/Expense Entries */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 bg-gray-100 p-1.5 rounded-full w-fit">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'orders'
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              Orders Ledger ({activeOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('ai_spend')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'ai_spend'
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              Live Metered AI Costs ({filteredAiLogs.length})
            </button>
            <button
              onClick={() => setActiveTab('credits_expenses')}
              className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === 'credits_expenses'
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-gray-500 hover:text-brand-dark'
              }`}
            >
              Logged Credit / Expense Bills ({filteredCustomEntries.length})
            </button>
          </div>

          <button
            onClick={() => setShowAddEntryModal(true)}
            className="text-xs font-black uppercase tracking-widest text-brand-pink hover:underline"
          >
            + Log Credit Payment, Expense or Tax Remittance
          </button>
        </div>

        {/* TAB 1: Real Orders Ledger */}
        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Order ID &amp; Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Customer &amp; Mystery
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Gross Paid
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500 text-right">
                    Card Fee
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-amber-600 text-right">
                    {settings.salesTaxName}
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-pink text-right">
                    Logged AI Cost
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-right">
                    Net Order Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeOrders.length > 0 ? (
                  activeOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-5">
                        <div className="text-xs font-black text-brand-dark uppercase">
                          #{order.id.slice(0, 10)}
                        </div>
                        <div className="text-[11px] text-gray-400 font-medium">
                          {new Date(order.createdAt).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-brand-dark">
                          {order.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.mysteryTitle}{' '}
                          <span className="text-[10px] font-black uppercase text-brand-pink ml-1">
                            • {order.packageTier}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            order.status === 'succeeded'
                              ? 'bg-emerald-100 text-emerald-700'
                              : order.status === 'pending'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right font-black text-sm text-brand-dark">
                        {formatMoney(order.grossAmount)}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-sm text-indigo-600">
                        -{formatMoney(order.cardProcessingFee)}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-sm text-amber-600">
                        -{formatMoney(order.salesTaxAmount)}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-sm text-brand-pink">
                        {order.actualAiCost > 0
                          ? `-${formatMoney(order.actualAiCost)}`
                          : formatMoney(0)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div
                          className={`text-sm font-black ${
                            order.netOrderProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {formatMoney(order.netOrderProfit)}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-8 py-14 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                        No customer orders in the database yet (£0.00 income)
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: Live Metered AI & Voice API Spend */}
        {activeTab === 'ai_spend' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Provider
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Model
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Feature / Generation
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    USD Cost
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-brand-pink text-right">
                    Cost ({settings.displayCurrency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAiLogs.length > 0 ? (
                  filteredAiLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-gray-500">
                        {new Date(log.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            log.provider.startsWith('ElevenLabs')
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'bg-pink-50 text-brand-pink'
                          }`}
                        >
                          {log.provider}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-600">
                        {log.modelName}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-brand-dark">
                        {log.featureName}
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-gray-500">
                        ${log.costUsd.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-black text-brand-pink">
                        -{formatMoney(log.costDisplay)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-14 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                        No AI generations recorded in this timeframe
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: Manually Logged Credit Payments & Operating Expenses */}
        {activeTab === 'credits_expenses' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Category
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Description
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Vendor / Authority
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomEntries.length > 0 ? (
                  filteredCustomEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="px-6 py-5 text-xs font-bold text-gray-500">
                        {new Date(entry.date).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-5">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-brand-dark">
                          {CATEGORY_LABELS[entry.category] || entry.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-bold text-brand-dark">{entry.title}</div>
                        {entry.notes && (
                          <div className="text-xs text-gray-400 mt-0.5">{entry.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium text-gray-600">
                        {entry.vendorOrCustomer}
                      </td>
                      <td
                        className={`px-6 py-5 text-right text-sm font-black ${
                          entry.type === 'income' ? 'text-emerald-600' : 'text-brand-dark'
                        }`}
                      >
                        {entry.type === 'income' ? '+' : '-'}
                        {formatMoney(entry.amount, entry.currency)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDeleteLedgerEntry(entry.id)}
                          disabled={isPending}
                          className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-8 py-14 text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                        No manual credit top-ups or bills logged yet — click &quot;+ Log Credit / Expense&quot; to record a bill
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Log Credit Payment, Operating Expense, Tax Remittance, or Manual Sale */}
      {showAddEntryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-8 shadow-2xl space-y-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Balance Sheet Ledger
                </span>
                <h3 className="text-xl font-black text-brand-dark uppercase tracking-tight">
                  Record Credit Payment / Expense
                </h3>
              </div>
              <button
                onClick={() => setShowAddEntryModal(false)}
                className="text-gray-400 hover:text-brand-dark font-black text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddLedgerEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'operating_expense', label: 'Domains, Hosting & Ops' },
                    { id: 'credit_payment', label: 'AI / API Credit Payment' },
                    { id: 'tax_remittance', label: 'Tax / VAT Payment Made' },
                    { id: 'income', label: 'Manual Mystery Sale' },
                  ] as Array<{ id: LedgerEntry['type']; label: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setNewEntryType(t.id);
                      if (t.id === 'credit_payment') setNewEntryCategory('ai_credit_payment');
                      if (t.id === 'operating_expense') setNewEntryCategory('hosting_infra');
                      if (t.id === 'tax_remittance') setNewEntryCategory('tax_payment');
                      if (t.id === 'income') setNewEntryCategory('mystery_sale');
                    }}
                    className={`p-3 rounded-2xl text-xs font-black uppercase tracking-wider border text-left transition-all ${
                      newEntryType === t.id
                        ? 'bg-brand-dark text-white border-brand-dark'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-brand-dark'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {newEntryType === 'operating_expense' && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Operating Cost Category
                  </label>
                  <select
                    value={newEntryCategory}
                    onChange={(e) => setNewEntryCategory(e.target.value as LedgerEntry['category'])}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark bg-white"
                  >
                    <option value="hosting_infra">Domains &amp; Web Hosting (e.g. Squarespace, Vercel)</option>
                    <option value="software">Software &amp; SaaS Subscriptions</option>
                    <option value="marketing">Marketing &amp; Ads</option>
                    <option value="other_expense">Other Operating Expense</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Description / Title
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newEntryType === 'operating_expense'
                      ? 'e.g. Squarespace Domain or Web Hosting'
                      : 'e.g. ElevenLabs Subscription or Google Cloud Billing'
                  }
                  value={newEntryTitle}
                  onChange={(e) => setNewEntryTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Amount ({settings.displayCurrency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={newEntryAmount}
                    onChange={(e) => setNewEntryAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newEntryDate}
                    onChange={(e) => setNewEntryDate(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    {newEntryType === 'income' ? 'Customer Name' : 'Vendor / Tax Authority'}
                  </label>
                  <input
                    type="text"
                    placeholder="Vendor or Customer"
                    value={newEntryVendor}
                    onChange={(e) => setNewEntryVendor(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Frequency
                  </label>
                  <select
                    value={newEntryCycle}
                    onChange={(e) => setNewEntryCycle(e.target.value as any)}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-bold text-brand-dark bg-white"
                  >
                    <option value="one_off">One-Off Payment</option>
                    <option value="monthly">Monthly Recurring</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional reference..."
                  value={newEntryNotes}
                  onChange={(e) => setNewEntryNotes(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm font-medium text-gray-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddEntryModal(false)}
                  className="px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest text-gray-400 hover:text-brand-dark"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest bg-brand-pink text-white hover:opacity-95"
                >
                  {isPending ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
