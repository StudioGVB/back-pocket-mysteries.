'use client';

import React, { useState } from 'react';
import {
  BRAINSTORM_TIER_CONFIG,
  BrainstormPackageTier,
  generateBrainstormWorksheetPdfBytes,
} from '@/utils/brainstorm-pdf';

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
  const [isOpen, setIsOpen] = useState(false);
  const [tier, setTier] = useState<BrainstormPackageTier>(defaultTier);
  const [workingTitle, setWorkingTitle] = useState(defaultTitle);
  const [theme, setTheme] = useState(defaultTheme);
  const [victimRole, setVictimRole] = useState('');
  const [killerRole, setKillerRole] = useState('');
  const [murderMethod, setMurderMethod] = useState('');

  const activeConfig = BRAINSTORM_TIER_CONFIG[tier];

  const buildApiUrl = (inline: boolean) => {
    const params = new URLSearchParams({
      tier,
      ...(workingTitle.trim() ? { title: workingTitle.trim() } : {}),
      ...(theme.trim() ? { theme: theme.trim() } : {}),
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
        workingTitle: workingTitle.trim(),
        theme: theme.trim(),
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

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="bg-white rounded-[2.25rem] w-full max-w-4xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto text-slate-900 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                  Printable / GoodNotes Handwriting Template
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Download Mystery Brainstorming Worksheet (PDF)
                </h2>
                <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
                  Generates a clean printable worksheet with your <strong>Core 6 Relationship Web</strong>, <strong>Symbol Key</strong>, <strong>Main Story Beats</strong>, and <strong>Extension Character Groups</strong> so you can sketch it out and upload a photo back here!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-black shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 1. Select Package Tier */}
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                1. Choose Package Tier (Sets Round Count &amp; Extension Groups)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(['basic', 'premium', 'grand'] as BrainstormPackageTier[]).map((tKey) => {
                  const cfg = BRAINSTORM_TIER_CONFIG[tKey];
                  const isSelected = tier === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => setTier(tKey)}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                          : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-slate-900">{cfg.label}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isSelected
                                ? 'bg-brand-pink text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {cfg.rounds} Rounds
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-600 mt-1">{cfg.playersLabel}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-snug">
                        {cfg.extensionGroupsSummary}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Optional Pre-Fill Fields (Can also be left blank to handwrite!) */}
            <div className="space-y-2.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                2. Optional Pre-Fill Header (Leave blank if you want to handwrite them on the sheet)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">
                    Working Title
                  </span>
                  <input
                    type="text"
                    value={workingTitle}
                    onChange={(e) => setWorkingTitle(e.target.value)}
                    placeholder="e.g. Tangled in Tinsel"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-pink"
                  />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 mb-1">
                    Theme / Setting
                  </span>
                  <input
                    type="text"
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g. Family Christmas Dinner"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-pink"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-brand-pink"
                  />
                </div>
              </div>
            </div>

            {/* 3. Visual Worksheet Preview */}
            <div className="bg-slate-950 text-white rounded-3xl p-5 sm:p-6 space-y-4 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    Worksheet Layout Preview ({tier === 'basic' ? '2 Pages' : tier === 'premium' ? '3 Pages' : '4 Pages'} • Landscape A4)
                  </span>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {activeConfig.label} • {activeConfig.rounds} Rounds • {activeConfig.playersLabel}
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Built-in Relationship Key + Main Beats + Character Web
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Preview Left: Main Plot Beats & Rounds */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
                      Left Side: Main Beats (1–7) + {activeConfig.rounds} Rounds
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Core 6 Timeline</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300 font-medium">
                    <div className="py-1 border-b border-dashed border-white/15">
                      <strong>1)</strong> Affair / secret exposed...
                    </div>
                    <div className="py-1 border-b border-dashed border-white/15">
                      <strong>2)</strong> Murder weapon / prop goes missing...
                    </div>
                    <div className="py-1 border-b border-dashed border-white/15">
                      <strong>3)</strong> Argument overheard...
                    </div>
                    <div className="py-1 border-b border-dashed border-white/15">
                      <strong>4)</strong> Killer makes their fatal move...
                    </div>
                    <div className="py-1 border-b border-dashed border-white/15">
                      <strong>5)</strong> Victim found dead...
                    </div>
                  </div>
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {Array.from({ length: activeConfig.rounds }).map((_, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-brand-pink/15 border border-brand-pink/30 text-[10px] font-black text-brand-pink"
                      >
                        Round {idx + 1} Clues
                      </span>
                    ))}
                  </div>
                </div>

                {/* Preview Right: Core 6 Web + Symbol Legend */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Right Side: Core 6 Web + Symbol Key
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      1 Victim + 5 Suspects
                    </span>
                  </div>

                  {/* Mini Visual Web Diagram */}
                  <div className="relative h-36 bg-slate-900/90 rounded-xl border border-white/10 flex items-center justify-center">
                    <div className="px-3.5 py-1.5 rounded-full border-2 border-brand-pink bg-slate-950 text-[11px] font-black text-white z-10 shadow-lg">
                      #1 {victimRole || 'VICTIM'}
                    </div>
                    <div className="absolute top-2.5 left-6 px-2.5 py-1 rounded-full border border-white/40 text-[9px] font-bold text-slate-200">
                      #2 Suspect
                    </div>
                    <div className="absolute top-2.5 right-6 px-2.5 py-1 rounded-full border border-white/40 text-[9px] font-bold text-slate-200">
                      #3 Suspect
                    </div>
                    <div className="absolute bottom-7 right-4 px-2.5 py-1 rounded-full border border-white/40 text-[9px] font-bold text-slate-200">
                      #4 Suspect
                    </div>
                    <div className="absolute bottom-1.5 px-2.5 py-1 rounded-full border border-white/40 text-[9px] font-bold text-slate-200">
                      #5 Suspect
                    </div>
                    <div className="absolute bottom-7 left-4 px-2.5 py-1 rounded-full border border-white/40 text-[9px] font-bold text-slate-200">
                      #6 Suspect
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-300 font-mono">
                    <span>•—• Siblings</span>
                    <span>•♥• Married</span>
                    <span>z—z Work</span>
                    <span>┼—┼ Ex Bestie</span>
                    <span>╫—╫ Exes</span>
                    <span>N—N Affair</span>
                    <span>○—○ Friends</span>
                    <span>◄—► Family</span>
                    <span>■—■ Besties</span>
                  </div>
                </div>
              </div>

              {tier !== 'basic' && (
                <div className="p-3.5 rounded-2xl bg-brand-pink/10 border border-brand-pink/25 text-xs text-slate-200 flex items-center justify-between gap-3">
                  <div>
                    <strong className="text-white font-black uppercase tracking-wider mr-2">
                      + Extension Groups Page Included:
                    </strong>
                    <span>
                      {tier === 'premium'
                        ? 'Includes Page 3 with mini-webs for Pair (#7–8), Trio A (#9–11), and One-Sided Solo (#12).'
                        : 'Includes Pages 3 & 4 with mini-webs for Pair (#7–8), Trio A (#9–11), Solos (#12 & #13), and Trio B (#14–16).'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 font-medium">
                💡 Fill it out on paper or iPad, then upload a photo/screenshot in chat and I&apos;ll build the entire mystery for you!
              </p>
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end shrink-0">
                <a
                  href={buildApiUrl(true)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3.5 rounded-full border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-black uppercase tracking-wider transition-all"
                >
                  🖨️ Open / Print PDF
                </a>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="px-7 py-3.5 rounded-full bg-brand-pink hover:bg-brand-dark text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-pink/20 cursor-pointer"
                >
                  ⬇️ Download PDF Worksheet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
