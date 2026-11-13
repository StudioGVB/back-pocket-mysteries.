'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BRAINSTORM_COMPLEXITY_OPTIONS,
  BRAINSTORM_SPICE_OPTIONS,
  BRAINSTORM_TIER_CONFIG,
  BrainstormComplexity,
  BrainstormPackageTier,
  BrainstormSpiceLevel,
  generateBrainstormWorksheetPdfBytes,
} from '@/utils/brainstorm-pdf';
import { ThemeCombobox } from '@/components/ui/ThemeCombobox';

interface BrainstormWorksheetButtonProps {
  variant?: 'admin-pill' | 'builder-pill' | 'sidebar-item';
  defaultTitle?: string;
  defaultTheme?: string;
  defaultTier?: BrainstormPackageTier;
}

export function BrainstormWorksheetButton({
  variant = 'admin-pill',
  defaultTitle = '',
  defaultTheme = '',
  defaultTier = 'basic',
}: BrainstormWorksheetButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState<BrainstormPackageTier>(defaultTier);
  const [spiceLevel, setSpiceLevel] = useState<BrainstormSpiceLevel>('');
  const [complexity, setComplexity] = useState<BrainstormComplexity>('');
  const [workingTitle, setWorkingTitle] = useState(defaultTitle);
  const [theme, setTheme] = useState(defaultTheme);
  const [settingVibe, setSettingVibe] = useState('');
  const [victimRole, setVictimRole] = useState('');
  const [killerRole, setKillerRole] = useState('');
  const [murderMethod, setMurderMethod] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeConfig = BRAINSTORM_TIER_CONFIG[tier];
  const totalPages = tier === 'basic' ? 3 : tier === 'premium' ? 4 : 5;

  const buildApiUrl = (inline: boolean) => {
    const params = new URLSearchParams({
      tier,
      ...(spiceLevel ? { spice: spiceLevel } : {}),
      ...(complexity ? { complexity } : {}),
      ...(workingTitle.trim() ? { title: workingTitle.trim() } : {}),
      ...(theme.trim() ? { theme: theme.trim() } : {}),
      ...(settingVibe.trim() ? { vibe: settingVibe.trim() } : {}),
      ...(victimRole.trim() ? { victim: victimRole.trim() } : {}),
      ...(killerRole.trim() ? { killer: killerRole.trim() } : {}),
      ...(murderMethod.trim() ? { method: murderMethod.trim() } : {}),
      ...(inline ? { inline: '1' } : {}),
    });
    return `/api/admin/brainstorm-worksheet?${params.toString()}`;
  };

  const handleDownloadPdf = () => {
    try {
      const bytes = generateBrainstormWorksheetPdfBytes({
        tier,
        spiceLevel,
        complexity,
        workingTitle: workingTitle.trim(),
        theme: theme.trim(),
        settingVibe: settingVibe.trim(),
        victimRole: victimRole.trim(),
        killerRole: killerRole.trim(),
        murderMethod: murderMethod.trim(),
      });
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const slug = workingTitle.trim()
        ? workingTitle
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
        : 'mystery';
      const a = document.createElement('a');
      a.href = url;
      a.download = `${slug}-brainstorm-${tier}-${activeConfig.rounds}rounds.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch {
      window.location.href = buildApiUrl(false);
    }
  };

  return (
    <>
      {variant === 'sidebar-item' ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-[13px] font-bold text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer text-left"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
          <span>Brainstorm PDF Sheet</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-6 py-4 bg-white border-2 border-slate-200 hover:border-brand-pink text-slate-900 hover:text-brand-pink rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-sm flex items-center gap-2 cursor-pointer"
        >
          <span>📝</span>
          <span>Brainstorm PDF Template</span>
        </button>
      )}

      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <div className="bg-white rounded-[2rem] w-full max-w-4xl max-h-[90vh] shadow-2xl border border-slate-200 text-slate-900 flex flex-col overflow-hidden">
              {/* Pinned Top Modal Header */}
              <div className="flex items-center justify-between gap-4 px-6 py-4 bg-white border-b border-slate-100 shrink-0">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                    Printable / GoodNotes Handwriting Template ({totalPages} Pages • Landscape A4)
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                    Download Mystery Brainstorming Worksheet (PDF)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close modal"
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-black shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Middle Body */}
              <div className="px-6 py-4 overflow-y-auto space-y-4">
                {/* 1. Select Package Tier */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    1. Choose Package Tier (Sets Round Count, Character Groups &amp; Final Master Web)
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {(['basic', 'premium', 'grand'] as BrainstormPackageTier[]).map((tKey) => {
                      const cfg = BRAINSTORM_TIER_CONFIG[tKey];
                      const isSelected = tier === tKey;
                      return (
                        <button
                          key={tKey}
                          type="button"
                          onClick={() => setTier(tKey)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                            isSelected
                              ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                              : 'border-slate-200 bg-slate-50/70 hover:border-slate-300'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs sm:text-sm font-black text-slate-900">
                                {cfg.label}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  isSelected
                                    ? 'bg-brand-pink text-white'
                                    : 'bg-slate-200 text-slate-700'
                                }`}
                              >
                                {cfg.rounds} Rounds
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                              {cfg.playersLabel}
                            </p>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-snug">
                            {cfg.extensionGroupsSummary}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Spice Level & 3. Story Complexity */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-7 space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      2. Spice Level (Pre-check or leave blank to circle on sheet)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {BRAINSTORM_SPICE_OPTIONS.map((sp) => {
                        const isSelected = spiceLevel === sp.value;
                        return (
                          <button
                            key={sp.value || 'blank'}
                            type="button"
                            onClick={() => setSpiceLevel(sp.value)}
                            className={`px-2.5 py-2 rounded-xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-brand-pink bg-brand-pink text-white shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <div className="text-[10px] font-black leading-tight">{sp.label}</div>
                            <div
                              className={`text-[9px] mt-0.5 leading-tight ${
                                isSelected ? 'text-white/85' : 'text-slate-400'
                              }`}
                            >
                              {sp.sub}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-1.5">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                      3. Story Complexity / Difficulty
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {BRAINSTORM_COMPLEXITY_OPTIONS.map((cp) => {
                        const isSelected = complexity === cp.value;
                        return (
                          <button
                            key={cp.value || 'blank'}
                            type="button"
                            onClick={() => setComplexity(cp.value)}
                            className={`px-2 py-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                : 'border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-700'
                            }`}
                          >
                            <span className="text-[10px] font-black leading-tight">{cp.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. Theme / Setting + Optional Pre-Fill Header */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    4. Theme, Setting &amp; Optional Pre-Fills (Leave blank to handwrite on the sheet)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Theme / Setting (Preset or Custom)
                      </span>
                      <ThemeCombobox
                        name="brainstorm_theme"
                        value={theme}
                        onChange={setTheme}
                        required={false}
                        variant="compact"
                        placeholder="Pick preset or leave blank..."
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Working Title
                      </span>
                      <input
                        type="text"
                        value={workingTitle}
                        onChange={(e) => setWorkingTitle(e.target.value)}
                        placeholder="e.g. Tangled in Tinsel"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Vibe / Era / Dress Code
                      </span>
                      <input
                        type="text"
                        value={settingVibe}
                        onChange={(e) => setSettingVibe(e.target.value)}
                        placeholder="e.g. Chaotic Family Christmas"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Center Victim Role (#1)
                      </span>
                      <input
                        type="text"
                        value={victimRole}
                        onChange={(e) => setVictimRole(e.target.value)}
                        placeholder="e.g. Husband / The Host"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Killer Role (#__)
                      </span>
                      <input
                        type="text"
                        value={killerRole}
                        onChange={(e) => setKillerRole(e.target.value)}
                        placeholder="e.g. #4 Sister (or leave blank)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 mb-1">
                        Murder Weapon / Method
                      </span>
                      <input
                        type="text"
                        value={murderMethod}
                        onChange={(e) => setMurderMethod(e.target.value)}
                        placeholder="e.g. Vintage Christmas Lights"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Compact Pages & Full-Page Master Web Preview */}
                <div className="bg-slate-950 text-white rounded-2xl p-4 space-y-3 border border-slate-800">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                        Included Pages ({totalPages} Pages • Landscape A4)
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        {activeConfig.label} • {activeConfig.rounds} Rounds • {activeConfig.playersLabel}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-black uppercase">
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                        Theme: {theme || 'Write-in'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink">
                        Spice: {spiceLevel ? spiceLevel.toUpperCase() : 'Checkboxes'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-200">
                        Complexity: {complexity ? complexity.toUpperCase() : 'Checkboxes'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="text-[10px] font-black uppercase text-brand-pink">
                        Page 1 • Main Beats &amp; Core 6 Web
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        Plot Beats (1–7), {activeConfig.rounds}-Round clue pacing, Core 6 web, Victim Shorthand (`V—#`), and Relationship Line Key.
                      </p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                      <div className="text-[10px] font-black uppercase text-emerald-400">
                        Page 2 {tier !== 'basic' ? `& ${tier === 'premium' ? 'Page 3' : 'Pages 3–4'}` : ''} • Character Cards
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {tier === 'basic'
                          ? '6 structured role cards (#1 Victim + #2–#6 Suspects) with F/M/Adapt gender, motives, and alibis.'
                          : tier === 'premium'
                          ? 'Core 6 role cards + Page 3 mini-webs for Pair (#7–8), Trio A (#9–11), and Solo A (#12).'
                          : 'Core 6 role cards + Pages 3–4 mini-webs for Pair (#7–8), Trio A (#9–11), Solos (#12–13), and Trio B (#14–16).'}
                      </p>
                    </div>

                    <div className="bg-brand-pink/15 border border-brand-pink/40 rounded-xl p-3 space-y-1 sm:col-span-2 lg:col-span-1">
                      <div className="text-[10px] font-black uppercase text-white flex items-center justify-between">
                        <span>Page {totalPages} • Full-Page Master Web</span>
                        <span className="px-1.5 py-0.5 rounded bg-brand-pink text-[8px]">WHOLE PAGE</span>
                      </div>
                      <p className="text-[11px] text-slate-200 leading-snug">
                        {tier === 'basic'
                          ? 'Full-page oversized 6-character web with extra room to link everyone across the whole page.'
                          : tier === 'premium'
                          ? 'Full-page web with Core 6 in center surrounded by clustered Pair (#7–8), Trio A (#9–11), and Solo (#12) groups.'
                          : 'Full-page 16-character web with Core 6 in center surrounded by Pair (#7–8), Trio A (#9–11), Solos (#12–13), and Trio B (#14–16) clusters!'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pinned Sticky Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0">
                <p className="text-[11px] text-slate-500 font-medium">
                  💡 Fill it out on paper or iPad, then upload a screenshot here and I&apos;ll build the mystery for you!
                </p>
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
                  <a
                    href={buildApiUrl(true)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-3 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                  >
                    🖨️ Open / Print PDF
                  </a>
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="px-6 py-3 rounded-full bg-brand-pink hover:bg-brand-dark text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-pink/25 cursor-pointer"
                  >
                    ⬇️ Download PDF Worksheet
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
