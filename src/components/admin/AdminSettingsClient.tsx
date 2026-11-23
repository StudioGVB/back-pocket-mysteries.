'use client';

import React, { useState } from 'react';
import {
  PlatformSettings,
  SupportedCurrency,
  IntegrationHealthReport,
} from '@/utils/platform-settings';
import {
  savePlatformSettingsAction,
  resetPlatformSettingsToDefaultsAction,
  getIntegrationHealthAction,
  sendTestSupportEmailAction,
} from '@/app/actions/platform-settings';

interface AdminSettingsClientProps {
  initialSettings: PlatformSettings;
  initialHealth: IntegrationHealthReport;
}

type SectionTab =
  | 'all'
  | 'storefront'
  | 'support'
  | 'ai'
  | 'marketing'
  | 'seo'
  | 'integrations';

function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  badge,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  badge?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-slate-900">{label}</span>
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink/10 text-brand-pink">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 font-medium leading-relaxed">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked ? 'bg-brand-pink' : 'bg-slate-300'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function AdminSettingsClient({
  initialSettings,
  initialHealth,
}: AdminSettingsClientProps) {
  const [settings, setSettings] = useState<PlatformSettings>(initialSettings);
  const [savedSnapshot, setSavedSnapshot] = useState<PlatformSettings>(initialSettings);
  const [health, setHealth] = useState<IntegrationHealthReport>(initialHealth);
  const [activeTab, setActiveTab] = useState<SectionTab>('all');

  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const [toast, setToast] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const hasUnsavedChanges =
    JSON.stringify({ ...settings, updatedAt: '', updatedBy: '' }) !==
    JSON.stringify({ ...savedSnapshot, updatedAt: '', updatedBy: '' });

  const updateField = <K extends keyof PlatformSettings>(
    key: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setToast(null);
    try {
      const res = await savePlatformSettingsAction(settings);
      if (res.success && res.settings) {
        setSettings(res.settings);
        setSavedSnapshot(res.settings);
        setToast({
          type: 'success',
          message: 'All platform settings saved and published across Back Pocket Mysteries.',
        });
      } else {
        setToast({
          type: 'error',
          message: res.error || 'Failed to save settings.',
        });
      }
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err?.message || 'Unexpected error while saving settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    setIsResetting(true);
    setToast(null);
    try {
      const res = await resetPlatformSettingsToDefaultsAction();
      if (res.success && res.settings) {
        setSettings(res.settings);
        setSavedSnapshot(res.settings);
        setToast({
          type: 'success',
          message: 'Platform settings restored to factory defaults.',
        });
      }
    } finally {
      setIsResetting(false);
    }
  };

  const handleRefreshHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const nextHealth = await getIntegrationHealthAction();
      setHealth(nextHealth);
      setToast({
        type: 'success',
        message: 'Live integration health checks refreshed.',
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleSendTestEmail = async () => {
    setIsSendingTestEmail(true);
    setToast(null);
    try {
      // Save current support email first if changed
      if (hasUnsavedChanges) {
        const saved = await savePlatformSettingsAction(settings);
        if (saved.success && saved.settings) {
          setSettings(saved.settings);
          setSavedSnapshot(saved.settings);
        }
      }
      const res = await sendTestSupportEmailAction(settings.supportEmail);
      if (res.success) {
        setToast({
          type: 'success',
          message: `Test verification email sent to ${res.recipient}${
            res.emailId ? ` (Resend ID: ${res.emailId})` : ''
          }.`,
        });
      } else {
        setToast({
          type: 'error',
          message: res.error || 'Could not send test email.',
        });
      }
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  const navTabs: Array<{ id: SectionTab; label: string; count?: string }> = [
    { id: 'all', label: 'All Settings' },
    { id: 'storefront', label: '1. Storefront & Pricing' },
    { id: 'support', label: '2. Support & Email' },
    { id: 'ai', label: '3. AI & QA Controls' },
    { id: 'marketing', label: '4. Marketing Rules' },
    { id: 'seo', label: '5. SEO & Socials' },
    {
      id: 'integrations',
      label: '6. Integrations Health',
      count: `${health.items.filter((i) => i.status === 'connected').length}/${health.items.length}`,
    },
  ];

  const showSection = (sec: Exclude<SectionTab, 'all'>) =>
    activeTab === 'all' || activeTab === sec;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header & Global Action Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl sm:text-4xl font-black text-brand-dark uppercase tracking-tighter leading-none">
              Platform <span className="text-brand-pink italic">Settings</span>
            </h1>
            {hasUnsavedChanges ? (
              <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-black uppercase tracking-widest">
                ● Unsaved Changes
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-widest">
                ✓ All Changes Saved
              </span>
            )}
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">
            Global configurations, Pricing, Support SLA, AI Engines, Marketing Guardrails &amp; SEO
          </p>
          {savedSnapshot.updatedAt && (
            <p className="text-xs text-slate-400 font-medium">
              Last saved {new Date(savedSnapshot.updatedAt).toLocaleString()} by{' '}
              <span className="font-bold text-slate-600">{savedSnapshot.updatedBy}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={isSendingTestEmail}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:border-brand-pink hover:text-brand-pink text-slate-700 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {isSendingTestEmail ? 'Sending Test...' : '✉ Send Test Email'}
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isResetting}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
          >
            {isResetting ? 'Resetting...' : 'Reset Defaults'}
          </button>
          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="px-7 py-3 rounded-2xl bg-brand-pink hover:bg-slate-900 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-pink/20 disabled:opacity-50"
          >
            {isSaving ? 'Saving Settings...' : 'Save All Settings →'}
          </button>
        </div>
      </div>

      {/* Toast Feedback Banner */}
      {toast && (
        <div
          className={`rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 border ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-black text-sm shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            >
              {toast.type === 'success' ? '✓' : '!'}
            </span>
            <p className="text-sm font-bold">{toast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-black uppercase tracking-widest opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        {navTabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    active
                      ? 'bg-brand-pink text-white'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 6 (or Top Overview): LIVE INTEGRATIONS HEALTH */}
      {showSection('integrations') && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-2">
                <span>Live System Diagnostics</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900">
                External Integrations &amp; API Health
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Real-time connection status for your database, Stripe checkout, Resend email
                delivery, Gemini AI, ElevenLabs audio, and Buffer social queue.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshHealth}
              disabled={isCheckingHealth}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-900 text-xs font-black uppercase tracking-widest text-slate-700 transition-all shrink-0 self-start sm:self-auto"
            >
              {isCheckingHealth ? 'Checking...' : '↻ Re-Test Connections'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {health.items.map((item) => {
              const badgeStyles =
                item.status === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : item.status === 'warning'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200';
              const dotColor =
                item.status === 'connected'
                  ? 'bg-emerald-500'
                  : item.status === 'warning'
                    ? 'bg-amber-500'
                    : 'bg-rose-500';

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {item.category}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${badgeStyles}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                        {item.mode || item.status}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>ENV: {item.envKeyHint}</span>
                    <span className="font-sans font-bold text-slate-500">
                      {item.status === 'connected'
                        ? 'Ready'
                        : item.status === 'warning'
                          ? 'Optional / Fallback'
                          : 'Action Needed'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* SECTION 1: STOREFRONT, PRICING & ANNOUNCEMENTS */}
        {showSection('storefront') && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Section 01 • Commerce &amp; Conversion
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                Storefront, Pricing &amp; Announcements
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Manage default tier pricing, VIP waitlist limits, and site-wide promo banners.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Base Pack ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.basePackPriceUsd}
                  onChange={(e) => updateField('basePackPriceUsd', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Custom Builder ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.customBuilderPriceUsd}
                  onChange={(e) => updateField('customBuilderPriceUsd', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Bespoke VIP ($)
                </label>
                <input
                  type="number"
                  min={1}
                  value={settings.bespokePartyPriceUsd}
                  onChange={(e) => updateField('bespokePartyPriceUsd', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default Currency
                </label>
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) =>
                    updateField('defaultCurrency', e.target.value as SupportedCurrency)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                >
                  <option value="USD">USD ($)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="CAD">CAD (CA$)</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <ToggleSwitch
                checked={settings.first50WaitlistEnabled}
                onChange={(v) => updateField('first50WaitlistEnabled', v)}
                label="First 50 VIP Waitlist Banner & Popup"
                badge={`Cap: ${settings.first50VipCap} VIPs`}
                description="Displays the 'First 50 VIP Launch List' countdown banner and 3-second welcome modal on the public marketing site."
              />

              {settings.first50WaitlistEnabled && (
                <div className="pl-4 border-l-2 border-brand-pink/30">
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    VIP Free Mystery Cap (Spots)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={settings.first50VipCap}
                    onChange={(e) => updateField('first50VipCap', Number(e.target.value))}
                    className="w-40 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                  />
                </div>
              )}

              <ToggleSwitch
                checked={settings.announcementBannerEnabled}
                onChange={(v) => updateField('announcementBannerEnabled', v)}
                label="Custom Top Promo Announcement Bar"
                description="Show a custom promotional announcement bar across the top of the storefront."
              />

              {settings.announcementBannerEnabled && (
                <div className="p-4 rounded-2xl border border-brand-pink/20 bg-brand-pink/5 space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-1.5">
                      Announcement Copy
                    </label>
                    <input
                      type="text"
                      value={settings.announcementBannerText}
                      onChange={(e) => updateField('announcementBannerText', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-1.5">
                        CTA Button Label
                      </label>
                      <input
                        type="text"
                        value={settings.announcementBannerCtaLabel}
                        onChange={(e) => updateField('announcementBannerCtaLabel', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-600 mb-1.5">
                        CTA Target Link
                      </label>
                      <input
                        type="text"
                        value={settings.announcementBannerCtaHref}
                        onChange={(e) => updateField('announcementBannerCtaHref', e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900"
                      />
                    </div>
                  </div>
                  {/* Live Preview */}
                  <div className="rounded-xl bg-slate-950 text-white px-4 py-2.5 text-xs flex flex-wrap items-center justify-center gap-3">
                    <span className="font-bold">{settings.announcementBannerText}</span>
                    <span className="px-2.5 py-1 rounded-full bg-brand-pink text-white font-black uppercase tracking-wider text-[10px]">
                      {settings.announcementBannerCtaLabel}
                    </span>
                  </div>
                </div>
              )}

              <ToggleSwitch
                checked={settings.checkoutPaused}
                onChange={(v) => updateField('checkoutPaused', v)}
                label="Pause New Storefront Checkouts (Maintenance Mode)"
                description="Temporarily pause new Stripe checkouts while keeping active live game lobbies running."
              />
            </div>
          </div>
        )}

        {/* SECTION 2: SUPPORT, TICKETING & EMAIL NOTIFICATIONS */}
        {showSection('support') && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Section 02 • Customer Care &amp; Alerts
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-1">
                  Support, Ticketing &amp; Email Routing
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Configure your official support inbox, customer SLA response promise, and
                  automated email triggers.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Primary Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateField('supportEmail', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Sender Display Name
                </label>
                <input
                  type="text"
                  value={settings.senderDisplayName}
                  onChange={(e) => updateField('senderDisplayName', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Ticket Response SLA Promise (Hours)
                </label>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={settings.ticketSlaHours}
                  onChange={(e) => updateField('ticketSlaHours', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  CC Alert Emails (Optional, comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="team@backpocketgames.com"
                  value={settings.ccNotificationEmails}
                  onChange={(e) => updateField('ccNotificationEmails', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-3">
              <ToggleSwitch
                checked={settings.autoFaqReminderInTicketEmails}
                onChange={(v) => updateField('autoFaqReminderInTicketEmails', v)}
                label="Include 48h SLA & Public FAQ Callout in Customer Ticket Emails"
                badge="Active"
                description="Automatically sends the customer a branded copy of their ticket stating you will respond within the SLA window and linking to /en/faq."
              />
              <ToggleSwitch
                checked={settings.notifyOnNewTicket}
                onChange={(v) => updateField('notifyOnNewTicket', v)}
                label="Email Admin on New Support Ticket"
                description={`Send an instant branded copy + attachments to ${settings.supportEmail} whenever a customer raises a ticket.`}
              />
              <ToggleSwitch
                checked={settings.notifyOnCustomerTicketReply}
                onChange={(v) => updateField('notifyOnCustomerTicketReply', v)}
                label="Email Admin on Customer Ticket Thread Reply"
                description="Notify your inbox whenever a customer replies or uploads new files to an existing ticket."
              />
              <ToggleSwitch
                checked={settings.notifyOnNewEnquiry}
                onChange={(v) => updateField('notifyOnNewEnquiry', v)}
                label="Email Admin on Public Contact Enquiry"
                description="Send an email notification when a visitor submits the public contact/bespoke event form."
              />
              <ToggleSwitch
                checked={settings.notifyOnNewOrder}
                onChange={(v) => updateField('notifyOnNewOrder', v)}
                label="Email Admin on New Mystery Purchase"
                description="Receive an instant order confirmation summary whenever a customer completes checkout."
              />
            </div>
          </div>
        )}

        {/* SECTION 3: AI MYSTERY & MEDIA GENERATION CONTROLS */}
        {showSection('ai') && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Section 03 • AI Engines &amp; Pre-Launch QA
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                AI Mystery, Vision &amp; Audio Controls
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Control model selection, customer portrait regeneration caps, budget alerts, and
                4-pack pre-launch QA certification gates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Story &amp; 4-Pack QA Critic Model
                </label>
                <select
                  value={settings.storyAndQaModel}
                  onChange={(e) =>
                    updateField(
                      'storyAndQaModel',
                      e.target.value as 'gemini-2.5-flash' | 'gemini-2.5-pro'
                    )
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                >
                  <option value="gemini-2.5-flash">gemini-2.5-flash (Fast &amp; Low Cost)</option>
                  <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Reasoning)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Character Portrait &amp; Blog Image Model
                </label>
                <input
                  type="text"
                  value={settings.imageGenerationModel}
                  readOnly
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-100 text-sm font-black text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Max Portrait Regens / Pack
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.maxPortraitRegensPerCustomer}
                  onChange={(e) =>
                    updateField('maxPortraitRegensPerCustomer', Number(e.target.value))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Monthly AI Budget Alert ($)
                </label>
                <input
                  type="number"
                  min={5}
                  value={settings.monthlyAiBudgetAlertUsd}
                  onChange={(e) => updateField('monthlyAiBudgetAlertUsd', Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Required R3 Solve Rate (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={settings.minRound3SolveRatePercent}
                  onChange={(e) =>
                    updateField('minRound3SolveRatePercent', Number(e.target.value))
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-black text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                Default Narrator Voice Direction (ElevenLabs TTS)
              </label>
              <input
                type="text"
                value={settings.defaultNarratorVoiceStyle}
                onChange={(e) => updateField('defaultNarratorVoiceStyle', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
              />
            </div>

            <div className="space-y-3">
              <ToggleSwitch
                checked={settings.requirePreLaunchQaCertification}
                onChange={(v) => updateField('requirePreLaunchQaCertification', v)}
                label="Enforce 4-Pack Pre-Launch QA & 7-Box Certification Before Publishing"
                badge="Mandated"
                description="Requires 0 token leaks, 0 gender-flex pronoun conflicts, and 100% Round 3 solve rate across all 4 stress-test packs (including 6F Bachelorette) before a Mystery Base Pack goes live."
              />
              <ToggleSwitch
                checked={settings.elevenLabsAudioEnabled}
                onChange={(v) => updateField('elevenLabsAudioEnabled', v)}
                label="Enable ElevenLabs Voice & Audio Clue Generation"
                description="Generate dramatized voiceover audio intros and spoken audio clues inside the Mystery Builder."
              />
            </div>
          </div>
        )}

        {/* SECTION 4: MARKETING & SOCIAL AUTOMATION CADENCE */}
        {showSection('marketing') && (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Section 04 • Content &amp; Launch Guardrails
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-1">
                Marketing, Blog &amp; Social Automation
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Guardrails for bi-weekly blogs, IG/FB social cards, 600–700w LinkedIn posts, and
                Friday Weekly EDMs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Blog Publish Days
                </label>
                <input
                  type="text"
                  value={settings.blogPublishDays}
                  onChange={(e) => updateField('blogPublishDays', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Publish Slot Time (UTC)
                </label>
                <input
                  type="text"
                  value={settings.blogPublishTimeUtc}
                  onChange={(e) => updateField('blogPublishTimeUtc', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Min Blog Words
                </label>
                <input
                  type="number"
                  min={500}
                  value={settings.minBlogWordCount}
                  onChange={(e) => updateField('minBlogWordCount', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  LinkedIn Min W
                </label>
                <input
                  type="number"
                  min={200}
                  value={settings.linkedInMinWords}
                  onChange={(e) => updateField('linkedInMinWords', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  LinkedIn Max W
                </label>
                <input
                  type="number"
                  min={300}
                  value={settings.linkedInMaxWords}
                  onChange={(e) => updateField('linkedInMaxWords', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-black text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                  Max IG Hashtags
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.maxInstagramHashtags}
                  onChange={(e) => updateField('maxInstagramHashtags', Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/60 text-sm font-black text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default Blog-to-Buy Bridge CTA
                </label>
                <input
                  type="text"
                  value={settings.defaultBlogToBuyCta}
                  onChange={(e) => updateField('defaultBlogToBuyCta', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default Friday EDM UTM Campaign
                </label>
                <input
                  type="text"
                  value={settings.defaultEdmUtmCampaign}
                  onChange={(e) => updateField('defaultEdmUtmCampaign', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
            </div>

            <ToggleSwitch
              checked={settings.reviewFirstWorkflowLocked}
              onChange={(v) => updateField('reviewFirstWorkflowLocked', v)}
              label="Enforce Review-First Draft Workflow (No Auto-Push to Buffer/Resend)"
              badge="Safety Lock"
              description="All generated social posts and Friday EDMs are inserted as 'draft' first and wait for human approval before scheduling."
            />
          </div>
        )}
      </div>

      {/* SECTION 5: SEO, METADATA & SOCIAL PROFILES */}
      {showSection('seo') && (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
              Section 05 • Discovery &amp; Attribution
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-1">
              SEO Metadata, Social Links &amp; Tracking Pixels
            </h2>
            <p className="text-sm text-slate-500 font-medium">
              Configure default search metadata, OpenGraph preview image, social profile URLs, and
              analytics IDs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default Site Title
                </label>
                <input
                  type="text"
                  value={settings.defaultSiteTitle}
                  onChange={(e) => updateField('defaultSiteTitle', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={settings.defaultMetaDescription}
                  onChange={(e) => updateField('defaultMetaDescription', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-medium text-slate-900 leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                  Default OpenGraph Share Image URL (og:image)
                </label>
                <input
                  type="text"
                  value={settings.ogImageUrl}
                  onChange={(e) => updateField('ogImageUrl', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Instagram Profile URL
                  </label>
                  <input
                    type="url"
                    value={settings.instagramUrl}
                    onChange={(e) => updateField('instagramUrl', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Facebook Page URL
                  </label>
                  <input
                    type="url"
                    value={settings.facebookUrl}
                    onChange={(e) => updateField('facebookUrl', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    LinkedIn Company URL
                  </label>
                  <input
                    type="url"
                    value={settings.linkedinUrl}
                    onChange={(e) => updateField('linkedinUrl', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    TikTok Profile URL
                  </label>
                  <input
                    type="url"
                    value={settings.tiktokUrl}
                    onChange={(e) => updateField('tiktokUrl', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Google Analytics 4 ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="G-XXXXXXXXXX"
                    value={settings.googleAnalyticsId}
                    onChange={(e) => updateField('googleAnalyticsId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">
                    Meta Pixel ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="123456789012345"
                    value={settings.metaPixelId}
                    onChange={(e) => updateField('metaPixelId', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-brand-pink focus:outline-none text-sm font-mono text-slate-900"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Save Bar when there are unsaved changes */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 left-6 md:left-80 z-40 max-w-4xl mx-auto bg-slate-950 text-white rounded-2xl p-4 sm:px-6 shadow-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-pink animate-pulse" />
            <p className="text-xs sm:text-sm font-bold">
              You have unsaved changes in Platform Settings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettings(savedSnapshot)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-200 transition-all"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => handleSaveAll()}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-widest transition-all"
            >
              {isSaving ? 'Saving...' : 'Save All Changes →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
