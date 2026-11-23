'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  auditAndHealCustomerPackAction,
  CustomerPackQaGateResult,
} from '@/app/actions/generator';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';

interface InspectCharacterItem {
  id: string;
  roleTitle: string;
  guestName: string;
  gender: string;
  accent?: string;
  isVictim: boolean;
  plotRole: 'victim' | 'murderer' | 'assistant' | 'suspect';
  standardPortraitUrl: string | null;
  guestAvatarUrl: string | null;
  hydratedBio: string;
  outfitGuide: string;
}

interface InspectClueItem {
  id: string;
  title: string;
  roundNumber: number;
  format: string;
  isFake: boolean;
  imageUrl: string | null;
  audioUrl: string | null;
  hydratedDescription: string;
  generationPrompt: string | null;
}

interface AdminPackQaInspectorClientProps {
  locale: string;
  mystery: {
    id: string;
    slug: string;
    title: string;
    theme: string | null;
    description: string | null;
  };
  customer: {
    id?: string | null;
    name: string;
    email?: string | null;
  };
  orderInfo: {
    orderId: string;
    status: string;
    amountFormatted: string;
    createdAt: string;
    pin: string;
    generationStatus: string;
    generationProgress: number;
  };
  initialQaReport: CustomerPackQaGateResult | null;
  characters: InspectCharacterItem[];
  clues: InspectClueItem[];
}

export default function AdminPackQaInspectorClient({
  locale,
  mystery,
  customer,
  orderInfo,
  initialQaReport,
  characters,
  clues,
}: AdminPackQaInspectorClientProps) {
  const router = useRouter();
  const [qaReport, setQaReport] = useState<CustomerPackQaGateResult | null>(initialQaReport);
  const [isRunningQa, setIsRunningQa] = useState(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'qa' | 'pack'>('both');
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');

  const handleRunQaNow = async () => {
    if (isRunningQa) return;
    setIsRunningQa(true);
    setQaError(null);
    try {
      const report = await auditAndHealCustomerPackAction(mystery.id);
      setQaReport(report);
      router.refresh();
    } catch (err: any) {
      setQaError(err?.message || 'Failed to run 4-Gate AI QA Critic.');
    } finally {
      setIsRunningQa(false);
    }
  };

  const filteredClues =
    selectedRound === 'all'
      ? clues
      : clues.filter(c => c.roundNumber === selectedRound);

  const totalHealed =
    (qaReport?.portraitsRegenerated || 0) +
    (qaReport?.visualCluesRegenerated || 0) +
    (qaReport?.audioCluesRegenerated || 0) +
    (qaReport?.textIssuesRepaired || 0);

  return (
    <div className="space-y-8 pb-16">
      {/* Top Breadcrumb & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href={`/${locale}/admin/transactions`}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-brand-pink transition-colors"
        >
          ← Back to All Transactions &amp; Purchased Packs
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/${locale}/mysteries/${mystery.slug}/ready`}
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-brand-dark text-brand-dark text-[10px] font-black uppercase tracking-widest transition-all"
          >
            🕵️ Customer Pre-Party Host Hub ↗
          </Link>
          <Link
            href={`/${locale}/builder/mysteries/${mystery.id}/compile`}
            target="_blank"
            className="px-4 py-2.5 rounded-xl bg-white border border-gray-200 hover:border-brand-dark text-brand-dark text-[10px] font-black uppercase tracking-widest transition-all"
          >
            🖨️ Printable Dossiers &amp; Clues ↗
          </Link>
          <Link
            href={`/${locale}/builder/mysteries/${mystery.id}/clues`}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            🛠️ Edit in Mystery Builder →
          </Link>
        </div>
      </div>

      {/* Hero Order & QA Command Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white rounded-[2.5rem] p-8 sm:p-10 shadow-xl border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                Order #{orderInfo.orderId.slice(0, 8).toUpperCase()}
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-slate-200 border border-white/10">
                6-Digit Party PIN: {orderInfo.pin}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  orderInfo.generationStatus === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                }`}
              >
                {orderInfo.generationStatus === 'ready'
                  ? '✓ Pack Delivered & Unlocked'
                  : `⏳ Generating (${orderInfo.generationProgress}%)`}
              </span>
              {qaReport && (
                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    qaReport.overallScore >= 82
                      ? 'bg-emerald-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  🛡️ QA Score: {qaReport.overallScore}/100
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {mystery.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-medium">
              <div>
                <span className="text-slate-400">Customer:</span>{' '}
                {customer.id ? (
                  <Link
                    href={`/${locale}/admin/users/${customer.id}`}
                    className="font-black text-white underline hover:text-brand-pink"
                  >
                    {customer.name}
                  </Link>
                ) : (
                  <strong className="text-white">{customer.name}</strong>
                )}
                {customer.email ? ` (${customer.email})` : ''}
              </div>
              <span>•</span>
              <div>
                <span className="text-slate-400">Paid:</span>{' '}
                <strong className="text-white">{orderInfo.amountFormatted}</strong>
              </div>
              <span>•</span>
              <div>
                <span className="text-slate-400">Cast Size:</span>{' '}
                <strong className="text-white">{characters.length} Characters</strong>
              </div>
              <span>•</span>
              <div>
                <span className="text-slate-400">Evidence Pack:</span>{' '}
                <strong className="text-white">{clues.length} Clues</strong>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRunQaNow}
              disabled={isRunningQa}
              className={`px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 cursor-pointer ${
                isRunningQa
                  ? 'bg-emerald-600 text-white animate-pulse'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              {isRunningQa
                ? '🧪 Running 4-Gate AI QA & Self-Heal...'
                : qaReport
                ? '🧪 Re-Run 4-Gate AI QA & Self-Heal'
                : '🧪 Run 4-Gate AI QA & Self-Heal Now'}
            </button>
            <p className="text-[11px] text-slate-400 font-medium text-center lg:text-right max-w-xs">
              Audits all portraits, side-by-side clue photos, MP3 audio wiretaps, and pronouns; auto-regenerates any asset scoring &lt; 82.
            </p>
          </div>
        </div>
      </div>

      {qaError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center justify-between">
          <span>⚠️ QA Error: {qaError}</span>
          <button onClick={() => setQaError(null)} className="font-black">
            ✕
          </button>
        </div>
      )}

      {/* View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'both', label: '🛡️ Full View (QA Report + Generated Pack)' },
            { id: 'qa', label: `🧪 QA Testing Breakdown (${qaReport ? `${qaReport.overallScore}/100` : 'Not Run'})` },
            { id: 'pack', label: `📦 Generated Customer Pack (${characters.length} Cast • ${clues.length} Clues)` },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                activeTab === t.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* =====================================================================
          SECTION 1: 4-GATE PRE-DELIVERY QA TESTING REPORT
      ===================================================================== */}
      {(activeTab === 'both' || activeTab === 'qa') && (
        <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Stage 3.5 • Pre-Delivery Automated Quality Assurance
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                4-Gate Multimodal AI QA Report
              </h2>
            </div>

            {qaReport && (
              <div className="flex items-center gap-3">
                <div className="px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-700">
                    Overall Pack QA Score
                  </span>
                  <span className="text-xl font-black text-emerald-900">
                    {qaReport.overallScore} / 100
                  </span>
                </div>
                {totalHealed > 0 && (
                  <div className="px-4 py-2 rounded-2xl bg-amber-50 border border-amber-200 text-right">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-amber-700">
                      Auto-Healed Before Delivery
                    </span>
                    <span className="text-xl font-black text-amber-900">
                      ⚡ {totalHealed} Asset{totalHealed === 1 ? '' : 's'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {!qaReport ? (
            <div className="p-10 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-center space-y-4">
              <p className="text-sm font-black text-slate-800">
                No QA scorecard is stored for this pack yet.
              </p>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                All new customer purchases automatically run the 4-Gate QA Critic before sending the ready email. For older packs, click the button below to run the full 4-Gate QA &amp; Self-Healing audit now.
              </p>
              <button
                type="button"
                onClick={handleRunQaNow}
                disabled={isRunningQa}
                className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                {isRunningQa ? '🧪 Running 4-Gate AI QA...' : '🧪 Run 4-Gate AI QA & Self-Heal Now'}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Narrative Sanity Banner */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛡️</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Gate 1 Narrative, Pronoun &amp; Murderer Solvability Verdict
                    </p>
                    <p className="text-xs font-bold text-slate-800">
                      {qaReport.narrativeSanityNote}
                    </p>
                  </div>
                </div>
                {qaReport.auditedAt && (
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Audited {new Date(qaReport.auditedAt).toLocaleString()}
                  </span>
                )}
              </div>

              {/* 4 Gate Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gate 1 • Text &amp; Pronouns
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {qaReport.textIssuesRepaired === 0
                      ? '100% Clean'
                      : `${qaReport.textIssuesRepaired} Repaired`}
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    Zero leaked tokens or gender mismatches
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gate 2 • Costume Portraits
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {qaReport.portraitsAudited} Audited
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    {qaReport.portraitsRegenerated > 0
                      ? `⚡ ${qaReport.portraitsRegenerated} self-healed`
                      : '✓ All passed on first pass'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gate 3 • Visual Clues (Side-by-Side)
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {qaReport.visualCluesAudited} Audited
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    {qaReport.visualCluesRegenerated > 0
                      ? `⚡ ${qaReport.visualCluesRegenerated} self-healed`
                      : '✓ All passed side-by-side check'}
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Gate 4 • MP3 Audio Wiretaps
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-1">
                    {qaReport.audioCluesAudited ?? 0} Audited
                  </p>
                  <p className="text-[11px] text-emerald-600 font-bold mt-1">
                    {(qaReport.audioCluesRegenerated || 0) > 0
                      ? `⚡ ${qaReport.audioCluesRegenerated} re-synthesized`
                      : '✓ Clear speech & guest names'}
                  </p>
                </div>
              </div>

              {/* Per-Asset QA Scores Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gate 2 Portrait Scores */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                    🎭 Stage 1 Portrait QA ({qaReport.portraitScores?.length || 0})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(qaReport.portraitScores || []).map(ps => (
                      <div
                        key={ps.characterId}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {ps.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              ps.finalScore >= 82
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ps.regenerated
                              ? `⚡ Healed ${ps.initialScore}→${ps.finalScore}`
                              : `${ps.finalScore}/100`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{ps.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gate 3 Visual Clue Scores */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                    📸 Stage 2 Visual Clue QA ({qaReport.clueScores?.length || 0})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(qaReport.clueScores || []).map(cs => (
                      <div
                        key={cs.clueId}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-900 truncate">
                            {cs.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              cs.finalScore >= 82
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {cs.regenerated
                              ? `⚡ Healed ${cs.initialScore}→${cs.finalScore}`
                              : `${cs.finalScore}/100`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-snug">{cs.note}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gate 4 Audio Wiretap Scores */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                    🎙️ Stage 3 Audio Wiretap QA ({qaReport.audioScores?.length || 0})
                  </h3>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {(qaReport.audioScores || []).length > 0 ? (
                      (qaReport.audioScores || []).map(as => (
                        <div
                          key={as.clueId}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-900 truncate">
                              {as.title}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                as.finalScore >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {as.regenerated
                                ? `⚡ Healed ${as.initialScore}→${as.finalScore}`
                                : `${as.finalScore}/100`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{as.note}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4">
                        No audio wiretap clues in this pack.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          SECTION 2: GENERATED MYSTERY PACK (CHARACTERS + CLUES DELIVERED)
      ===================================================================== */}
      {(activeTab === 'both' || activeTab === 'pack') && (
        <div className="space-y-8">
          {/* 2A. Cast Roster & Stage 1 Costume Portraits */}
          <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Stage 1 Deliverables • Locked Cast &amp; Costume Portraits
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                  Generated Character Dossiers ({characters.length} Cast)
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map(char => {
                const displayPortrait =
                  char.standardPortraitUrl ||
                  resolveDisplayAvatarUrl(char.guestAvatarUrl || undefined);
                const portraitQa = qaReport?.portraitScores?.find(
                  p => p.characterId === char.id
                );

                return (
                  <div
                    key={char.id}
                    className="rounded-3xl border border-slate-200 overflow-hidden bg-slate-50/50 flex flex-col justify-between"
                  >
                    <div className="relative h-72 bg-slate-900 overflow-hidden border-b border-slate-200">
                      {displayPortrait ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={displayPortrait}
                          alt={char.guestName}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl text-white">
                          🕵️
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />

                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            char.plotRole === 'victim'
                              ? 'bg-rose-600 text-white'
                              : char.plotRole === 'murderer'
                              ? 'bg-amber-500 text-slate-950'
                              : char.plotRole === 'assistant'
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-900/90 text-white border border-white/15'
                          }`}
                        >
                          {char.plotRole === 'victim'
                            ? '💀 Victim'
                            : char.plotRole === 'murderer'
                            ? '🔪 Murderer'
                            : char.plotRole === 'assistant'
                            ? '🤝 Accomplice'
                            : '🕵️ Suspect'}
                        </span>

                        {portraitQa && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500 text-white shadow">
                            🛡️ QA {portraitQa.finalScore}/100
                          </span>
                        )}
                      </div>

                      <div className="absolute bottom-3 inset-x-4">
                        <p className="text-xs font-black uppercase tracking-widest text-brand-pink">
                          Played by {char.guestName} ({char.gender}
                          {char.accent ? ` • ${char.accent}` : ''})
                        </p>
                        <h3 className="text-xl font-black text-white leading-tight">
                          {char.roleTitle}
                        </h3>
                      </div>
                    </div>

                    <div className="p-5 space-y-3 text-xs">
                      <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                          Hydrated Character Bio
                        </span>
                        <p className="text-slate-700 font-medium leading-relaxed line-clamp-4">
                          {char.hydratedBio}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-200/70">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                          Adapted Costume Guide
                        </span>
                        <p className="text-slate-600 font-medium leading-relaxed line-clamp-3">
                          {char.outfitGuide}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 2B. Generated Clues, Crime-Scene Photos & Audio Wiretaps */}
          <section className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Stage 2 &amp; Stage 3 Deliverables • Visual Evidence, Chats &amp; Voice Wiretaps
                </span>
                <h2 className="text-2xl font-black text-slate-900 mt-0.5">
                  Generated Clues &amp; Evidence ({clues.length} Total)
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 1, 2, 3, 4] as const).map(r => (
                  <button
                    key={String(r)}
                    type="button"
                    onClick={() => setSelectedRound(r)}
                    className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      selectedRound === r
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r === 'all' ? `All (${clues.length})` : `Round ${r}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredClues.map(clue => {
                const visualQa = qaReport?.clueScores?.find(c => c.clueId === clue.id);
                const audioQa = qaReport?.audioScores?.find(a => a.clueId === clue.id);
                const badgeScore = visualQa || audioQa;

                return (
                  <div
                    key={clue.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50/40 overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Bar */}
                      <div className="px-5 py-3.5 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                            Round {clue.roundNumber}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                            {clue.format}
                          </span>
                          {clue.isFake && (
                            <span className="px-2.5 py-1 rounded-lg bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                              Red Herring
                            </span>
                          )}
                        </div>

                        {badgeScore && (
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                              badgeScore.finalScore >= 82
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {badgeScore.regenerated
                              ? `⚡ QA Healed ${badgeScore.initialScore}→${badgeScore.finalScore}`
                              : `🛡️ QA ${badgeScore.finalScore}/100`}
                          </span>
                        )}
                      </div>

                      {/* Clue Photo if present */}
                      {clue.imageUrl && (
                        <div className="relative h-64 bg-slate-950 border-b border-slate-200 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={clue.imageUrl}
                            alt={clue.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="p-5 space-y-3">
                        <h3 className="text-lg font-black text-slate-900 leading-snug">
                          {clue.title}
                        </h3>

                        {/* Audio Player if audio clue */}
                        {clue.audioUrl && (
                          <div className="p-3.5 rounded-2xl bg-slate-900 text-white space-y-2">
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-brand-pink">
                              <span>🎙️ Generated ElevenLabs Voice Wiretap</span>
                              {audioQa && <span>QA: {audioQa.finalScore}/100</span>}
                            </div>
                            <audio controls src={clue.audioUrl} className="w-full h-9" />
                          </div>
                        )}

                        {/* Hydrated Clue Text */}
                        <div className="p-4 rounded-2xl bg-white border border-slate-100 text-xs text-slate-700 font-medium whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                          {clue.hydratedDescription}
                        </div>

                        {badgeScore?.note && (
                          <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl font-bold">
                            🤖 AI QA Critic: &ldquo;{badgeScore.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
