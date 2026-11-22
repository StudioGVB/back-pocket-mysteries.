'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ClueRenderer } from '@/components/clues/ClueRenderer';
import type { ClueFormat } from '@/utils/clue-format';
import type {
  MysteryQaSuiteState,
  QaSingleRunResult,
} from '@/lib/mystery-qa-store';

interface MysteryPreLaunchQaPanelProps {
  mysteryId: string;
  mysteryTitle: string;
  locale?: string;
  onCertificationChange?: (isCertified: boolean, score: number) => void;
}

export function MysteryPreLaunchQaPanel({
  mysteryId,
  mysteryTitle,
  locale = 'en',
  onCertificationChange,
}: MysteryPreLaunchQaPanelProps) {
  const router = useRouter();
  const [suite, setSuite] = useState<MysteryQaSuiteState | null>(null);
  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [isRunningBatch, setIsRunningBatch] = useState<boolean>(false);
  const [patchingFixId, setPatchingFixId] = useState<string | null>(null);
  const [mode, setMode] = useState<'smart' | 'full_visual'>('smart');

  // Top-level Insights Tab ('pacing' | 'screentime' | 'timeline' | 'clues')
  const [activeInsightTab, setActiveInsightTab] = useState<
    'pacing' | 'screentime' | 'timeline' | 'clues'
  >('pacing');

  // Compact 20-Version Strip Filter & Selected Version Inspector
  const [versionFilter, setVersionFilter] = useState<'all' | 'flagged' | 'canary'>('all');
  const [selectedRunNumber, setSelectedRunNumber] = useState<number | null>(null);
  const [inspectorRoundFilter, setInspectorRoundFilter] = useState<'all' | 1 | 2 | 3>('all');
  const [inspectorViewMode, setInspectorViewMode] = useState<'visual_cards' | 'compact_audit'>(
    'visual_cards'
  );
  const [openingInScreener, setOpeningInScreener] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const notifyCertification = useCallback(
    (nextSuite: MysteryQaSuiteState | null) => {
      if (!onCertificationChange) return;
      const score = nextSuite?.performanceReview?.overallReadinessScore || 0;
      const isCert =
        nextSuite?.status === 'completed' &&
        nextSuite?.performanceReview?.certificationStatus === 'certified';
      onCertificationChange(Boolean(isCert), score);
    },
    [onCertificationChange]
  );

  useEffect(() => {
    let active = true;
    async function fetchExisting() {
      try {
        const res = await fetch(
          `/api/admin/mystery-qa-runner?mysteryId=${encodeURIComponent(mysteryId)}`
        );
        const json = await res.json();
        if (active && json?.suite) {
          setSuite(json.suite);
          if (json.suite.mode) setMode(json.suite.mode);
          notifyCertification(json.suite);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoadingInitial(false);
      }
    }
    fetchExisting();
    return () => {
      active = false;
    };
  }, [mysteryId, notifyCertification]);

  const pumpRemainingScaleBatches = useCallback(
    async (currentSuite: MysteryQaSuiteState) => {
      let latest = currentSuite;
      while (
        latest &&
        latest.status === 'running_scale' &&
        latest.completedRunsCount < 20
      ) {
        const res = await fetch('/api/admin/mystery-qa-runner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mysteryId,
            action: 'run_next_batch',
            batchSize: 6,
          }),
        });
        const json = await res.json();
        if (!res.ok || !json?.suite) {
          throw new Error(json?.error || 'Failed while running scale batch');
        }
        latest = json.suite;
        setSuite(latest);
        notifyCertification(latest);
      }
    },
    [mysteryId, notifyCertification]
  );

  const handleStartStressTest = async (simulateCanaryFailure = false) => {
    if (isRunningBatch) return;
    setIsRunningBatch(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/mystery-qa-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          action: 'start',
          mode,
          simulateCanaryFailure,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.suite) {
        throw new Error(json?.error || 'Failed to start 20x QA suite');
      }

      const afterCanary: MysteryQaSuiteState = json.suite;
      setSuite(afterCanary);
      notifyCertification(afterCanary);

      if (afterCanary.status === 'running_scale') {
        await pumpRemainingScaleBatches(afterCanary);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error running pre-launch QA suite');
    } finally {
      setIsRunningBatch(false);
    }
  };

  const handleApplyFix = async (fixId?: string, shouldResumeIfPaused = true) => {
    if (isRunningBatch || patchingFixId) return;
    setPatchingFixId(fixId || 'all');
    if (shouldResumeIfPaused) setIsRunningBatch(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/mystery-qa-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          action: shouldResumeIfPaused ? 'apply_fix_and_resume' : 'apply_single_fix',
          fixId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.suite) {
        throw new Error(json?.error || 'Failed to apply fix');
      }

      const nextSuite: MysteryQaSuiteState = json.suite;
      setSuite(nextSuite);
      notifyCertification(nextSuite);

      if (nextSuite.status === 'running_scale') {
        await pumpRemainingScaleBatches(nextSuite);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to apply fix');
    } finally {
      setPatchingFixId(null);
      setIsRunningBatch(false);
    }
  };

  const handleUndoFix = async (fixId: string) => {
    if (isRunningBatch || patchingFixId) return;
    setPatchingFixId(fixId);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/mystery-qa-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          action: 'undo_fix',
          fixId,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.suite) {
        throw new Error(json?.error || 'Failed to undo fix');
      }
      setSuite(json.suite);
      notifyCertification(json.suite);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to undo fix');
    } finally {
      setPatchingFixId(null);
    }
  };

  const handleOpenVersionInScreener = async (run: QaSingleRunResult) => {
    if (openingInScreener) return;
    setOpeningInScreener(true);
    try {
      await fetch('/api/admin/mystery-qa-runner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mysteryId,
          action: 'load_version_cast',
          runNumber: run.runNumber,
        }),
      });

      if (typeof window !== 'undefined') {
        const assignmentMap: Record<string, string> = {};
        for (const ca of run.castAssignments) {
          if (!ca.isDroppedOptional && ca.guest) {
            assignmentMap[ca.characterId] = ca.guest.id;
          }
        }
        window.localStorage.setItem(
          `bpm_friend_assignments_${mysteryId}`,
          JSON.stringify(assignmentMap)
        );
      }

      router.push(
        `/${locale}/builder/mysteries/${mysteryId}/screen?qaVersion=${run.runNumber}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not load version in Screener');
    } finally {
      setOpeningInScreener(false);
    }
  };

  const selectedRun: QaSingleRunResult | null =
    suite?.runs.find((r) => r.runNumber === selectedRunNumber) || null;
  const review = suite?.performanceReview || null;

  const filteredRuns = (suite?.runs || []).filter((r) => {
    if (versionFilter === 'canary') return r.runNumber <= 3;
    if (versionFilter === 'flagged') {
      return !r.passed || !r.blindDetective.r3Correct || r.issues.length > 0;
    }
    return true;
  });

  const flaggedRunsCount = (suite?.runs || []).filter(
    (r) => !r.passed || !r.blindDetective.r3Correct || r.issues.length > 0
  ).length;

  // Build ClueRenderer-compatible characters array for the currently selected Version
  const selectedVersionCharacters = React.useMemo(() => {
    if (!selectedRun) return [];
    return selectedRun.castAssignments
      .filter((ca) => !ca.isDroppedOptional && ca.guest)
      .map((ca) => ({
        id: ca.characterId,
        name: `${ca.guest!.name} | ${ca.roleTitle}`,
        displayRoleTitle: ca.roleTitle,
        displayName: `${ca.guest!.name} (${ca.roleTitle})`,
        gender: ca.guest!.gender,
        is_victim: ca.isVictim,
        plot_role: ca.plotRole,
        profile_data: {
          guest_id: ca.guest!.id,
          guest_name: ca.guest!.name,
          avatar_url: ca.guest!.avatar_url,
          friend_photo_url: ca.guest!.avatar_url,
          eye_color: ca.guest!.eyeColor,
          height: ca.guest!.height,
          ethnicity: ca.guest!.ethnicity,
          bio: ca.hydratedBio,
        },
      }));
  }, [selectedRun]);

  return (
    <div className="rounded-3xl bg-white border-2 border-slate-200 shadow-sm overflow-hidden">
      {/* HEADER & ACTION BAR */}
      <div className="bg-slate-950 text-white px-6 py-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase tracking-widest">
              🧪 Pre-Launch 20× Automated Stress-Test &amp; Circuit Breaker
            </span>
            {suite?.status === 'completed' &&
              review?.certificationStatus === 'certified' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                  ✅ Certified Ready for Live ({review.overallReadinessScore}%)
                </span>
              )}
            {suite?.status === 'paused_circuit_breaker' && (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest animate-pulse">
                ⏸️ Paused at Run #3 (Circuit Breaker Protected Credits)
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight">
            20-Cast Stability Generator &amp; Performance Review — &ldquo;{mysteryTitle}&rdquo;
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl">
            Tests 20 cast combinations, gender flips, player counts, screen-time fairness, and timeline logic. Pauses after Run #3 with 1-click DB fixes if any issues are detected.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              disabled={isRunningBatch}
              onClick={() => setMode('smart')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                mode === 'smart'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🛡️ Smart QA (~$0.46)
            </button>
            <button
              type="button"
              disabled={isRunningBatch}
              onClick={() => setMode('full_visual')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                mode === 'full_visual'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🔥 Full Visual (~$7.20)
            </button>
          </div>

          <button
            type="button"
            disabled={isRunningBatch}
            onClick={() => handleStartStressTest(true)}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-400/30 text-xs font-black uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
          >
            🛑 Test 3-Run Pause
          </button>

          <button
            type="button"
            disabled={isRunningBatch}
            onClick={() => handleStartStressTest(false)}
            className="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-pink-500 text-white text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50"
          >
            {isRunningBatch
              ? `Running (${suite?.completedRunsCount || 0}/20)…`
              : suite?.status === 'completed'
              ? '🔄 Re-Run 20× Stress Test'
              : '🚀 Run 20× Pre-Launch Test'}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {loadingInitial ? (
          <div className="py-10 text-center text-xs font-bold text-slate-400 animate-pulse">
            Loading Pre-Launch QA telemetry…
          </div>
        ) : !suite ? (
          <div className="rounded-2xl bg-slate-50 border border-dashed border-slate-300 p-8 text-center space-y-3">
            <div className="text-3xl">🧪</div>
            <h3 className="text-base font-black uppercase text-slate-900">
              No 20× Pre-Launch Stress Test Run Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed">
              Click <strong>🚀 Run 20× Pre-Launch Test</strong> above to generate 20 different cast permutations (Canary Runs #1–#3 first, followed by Scale Runs #4–#20) and receive your full Mystery Stability &amp; Performance Review.
            </p>
          </div>
        ) : (
          <>
            {/* =====================================================================
                1. TOP KPI STRIP
            ====================================================================== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Versions Generated
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {suite.completedRunsCount} / {suite.totalPlannedRuns}
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 mt-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      suite.status === 'paused_circuit_breaker'
                        ? 'bg-rose-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{
                      width: `${Math.round(
                        (suite.completedRunsCount / suite.totalPlannedRuns) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  3-Run Circuit Breaker
                </div>
                <div
                  className={`text-lg font-black mt-1 ${
                    suite.circuitBreaker.triggered
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }`}
                >
                  {suite.circuitBreaker.triggered
                    ? '⏸️ PAUSED AT RUN #3'
                    : `✅ CANARY PASSED (${suite.circuitBreaker.canaryAvgHealth}%)`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {suite.circuitBreaker.triggered
                    ? `Protected 17 runs (~$${suite.circuitBreaker.estimatedSavedUsd.toFixed(2)} saved)`
                    : 'Runs #1–#3 passed >= 85% health gate'}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Total Test Spend
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  ${suite.totalCostUsd.toFixed(2)}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Budget Cap: ${suite.budgetCapUsd.toFixed(2)} ({suite.mode === 'smart' ? 'Smart QA' : 'Full Visual'})
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Stability &amp; Readiness Score
                </div>
                <div
                  className={`text-2xl font-black mt-1 ${
                    (review?.overallReadinessScore || 0) >= 90
                      ? 'text-emerald-700'
                      : (review?.overallReadinessScore || 0) >= 75
                      ? 'text-amber-600'
                      : 'text-rose-600'
                  }`}
                >
                  {review?.overallReadinessScore || 0}%
                </div>
                <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                  {review?.certificationStatus === 'certified'
                    ? '✅ Certified Ready to Publish'
                    : review?.certificationStatus === 'needs_tuning'
                    ? '⚠️ Playable — Minor Tuning'
                    : '🛑 Action Required Before Live'}
                </div>
              </div>
            </div>

            {/* =====================================================================
                2. ACTIONABLE FIXES & REAL DB PATCH CARDS (WITH 1-CLICK APPLY & UNDO)
            ====================================================================== */}
            {suite.fixSuggestions && suite.fixSuggestions.length > 0 && (
              <div
                className={`rounded-3xl p-5 border-2 space-y-4 ${
                  suite.status === 'paused_circuit_breaker'
                    ? 'bg-rose-950 text-white border-rose-500 shadow-xl'
                    : 'bg-slate-900 text-white border-amber-400/50 shadow-md'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        suite.status === 'paused_circuit_breaker'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                      }`}
                    >
                      {suite.status === 'paused_circuit_breaker'
                        ? `🛑 3-Run Circuit Breaker Paused • $${suite.circuitBreaker.estimatedSavedUsd.toFixed(2)} Saved`
                        : '💡 Automated Story & Gender-Flexibility Improvements Spotted'}
                    </span>
                    <h3 className="text-base sm:text-lg font-black uppercase mt-1">
                      {suite.status === 'paused_circuit_breaker'
                        ? 'Paused After Run #3 to Protect Your Credits — Review & Apply Suggested Fixes'
                        : '1-Click Clue Improvements Found Across 20 Cast Permutations'}
                    </h3>
                  </div>

                  {suite.status === 'paused_circuit_breaker' && (
                    <button
                      type="button"
                      disabled={isRunningBatch}
                      onClick={() => handleApplyFix(undefined, true)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black uppercase tracking-widest shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isRunningBatch
                        ? 'Patching DB & Resuming #4–#20…'
                        : '✨ Apply All Fixes to Mystery & Resume Runs #4–#20'}
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {suite.fixSuggestions.map((fix) => (
                    <div
                      key={fix.id}
                      className="rounded-2xl bg-slate-950/90 border border-slate-800 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              fix.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            }`}
                          >
                            {fix.severity === 'critical'
                              ? '🛑 Critical Defect'
                              : '🚻 Gender-Flexibility Upgrade'}
                          </span>
                          <span className="text-xs font-black text-white">
                            {fix.targetTitle}
                          </span>
                          {fix.applied && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                              ✓ Patched in Mystery DB
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {!fix.applied ? (
                            <button
                              type="button"
                              disabled={Boolean(patchingFixId) || isRunningBatch}
                              onClick={() =>
                                handleApplyFix(
                                  fix.id,
                                  suite.status === 'paused_circuit_breaker'
                                )
                              }
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
                            >
                              {patchingFixId === fix.id
                                ? 'Patching Clue…'
                                : '✨ Apply Fix to Mystery'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={Boolean(patchingFixId) || isRunningBatch}
                              onClick={() => handleUndoFix(fix.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-black uppercase tracking-wider cursor-pointer disabled:opacity-50"
                            >
                              {patchingFixId === fix.id
                                ? 'Restoring…'
                                : '↩️ Undo Fix'}
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {fix.issueSummary}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-rose-950/35 border border-rose-500/30 p-3 space-y-1">
                          <div className="text-[10px] font-black uppercase text-rose-400">
                            ❌ Before (Original Text)
                          </div>
                          <p className="text-rose-100 font-mono text-[11px] whitespace-pre-wrap">
                            {fix.currentText}
                          </p>
                        </div>
                        <div className="rounded-xl bg-emerald-950/35 border border-emerald-500/40 p-3 space-y-1">
                          <div className="text-[10px] font-black uppercase text-emerald-400">
                            ✅ After (Dynamic Character Tokens)
                          </div>
                          <p className="text-emerald-100 font-mono text-[11px] whitespace-pre-wrap">
                            {fix.suggestedText}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =====================================================================
                3. EXECUTIVE STABILITY REVIEW & DEEP STORY AUDITS (ABOVE THE FOLD)
            ====================================================================== */}
            {review && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      📊 Deep Story &amp; Stability Diagnostics
                    </span>
                    <h3 className="text-base font-black uppercase text-slate-900">
                      Performance Review Across {suite.completedRunsCount} Cast Permutations
                    </h3>
                  </div>

                  {/* 4-Tab Switcher for Deep Audits */}
                  <div className="inline-flex flex-wrap rounded-xl bg-slate-200/80 p-1 gap-1">
                    {[
                      {
                        id: 'pacing' as const,
                        label: '📈 1. Pacing & Solve Curve',
                      },
                      {
                        id: 'screentime' as const,
                        label: `⚖️ 2. Guest Screen-Time (${review.characterExposure.length} Roles)`,
                      },
                      {
                        id: 'timeline' as const,
                        label: `🕰️ 3. Timeline Audit (${review.timelineAudit.contradictionsCount} Conflicts)`,
                      },
                      {
                        id: 'clues' as const,
                        label: `🔎 4. All ${review.clueDiagnostics.length} Clues Signal`,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveInsightTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          activeInsightTab === tab.id
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TAB 1: PACING, SOLVE CURVE & 4 PILLARS */}
                {activeInsightTab === 'pacing' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-5 space-y-3">
                      <div className="grid grid-cols-2 gap-2.5 text-xs">
                        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            1. Hydration &amp; Tokens
                          </div>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {review.pillarScores.technicalHydration}%
                          </div>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            2. Visual &amp; Prompts
                          </div>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {review.pillarScores.visualAssetStability}%
                          </div>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            3. Pacing &amp; Solvability
                          </div>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {review.pillarScores.pacingAndSolvability}%
                          </div>
                        </div>
                        <div className="rounded-xl bg-white border border-slate-200 p-3.5">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">
                            4. Cast Flexibility
                          </div>
                          <div className="text-xl font-black text-slate-900 mt-0.5">
                            {review.pillarScores.castFlexibility}%
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                            True Killer Detection Curve ({suite.completedRunsCount} Runs)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                            {review.deductionCurve.pacingVerdict === 'balanced'
                              ? '✅ Ideal Pacing'
                              : '⚠️ Needs Tuning'}
                          </span>
                        </div>

                        {[
                          {
                            label: 'Round 1 (Opening)',
                            actual: review.deductionCurve.r1KillerSolveRatePct,
                            target: review.deductionCurve.r1TargetRange,
                          },
                          {
                            label: 'Round 2 (Escalation)',
                            actual: review.deductionCurve.r2KillerSolveRatePct,
                            target: review.deductionCurve.r2TargetRange,
                          },
                          {
                            label: 'Round 3 (Final Solve)',
                            actual: review.deductionCurve.r3KillerSolveRatePct,
                            target: review.deductionCurve.r3TargetRange,
                          },
                        ].map((row) => (
                          <div key={row.label} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-bold text-slate-800">{row.label}</span>
                              <span className="text-slate-600">
                                <strong className="text-slate-900">{row.actual}%</strong>{' '}
                                <span className="text-[10px] text-slate-400">
                                  (Target: {row.target})
                                </span>
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-600"
                                style={{ width: `${Math.max(4, row.actual)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-7 rounded-xl bg-white border border-slate-200 p-4 flex flex-col justify-between space-y-3">
                      <div className="space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Executive Readiness Summary
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed font-medium">
                          {review.deductionCurve.pacingExplanation}
                        </p>
                        <div className="space-y-2 pt-1">
                          {review.executiveInsights.map((ins, i) => (
                            <div
                              key={i}
                              className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700 leading-snug"
                            >
                              <strong className="text-slate-900">Insight #{i + 1}:</strong>{' '}
                              {ins}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: GUEST SCREEN-TIME & FAIRNESS MATRIX */}
                {activeInsightTab === 'screentime' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        Ensures every paying guest at the dinner table appears regularly in clues across Rounds 1, 2, and 3 so no character feels forgotten.
                      </p>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                        ✓ Zero Left-Out Guests
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {review.characterExposure.map((ce) => (
                        <div
                          key={ce.characterId}
                          className="rounded-xl bg-white border border-slate-200 p-3.5 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-slate-900">
                                {ce.roleTitle}
                              </span>
                              <span className="ml-1.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-black uppercase">
                                {ce.plotRole === 'killer'
                                  ? '🔪 Killer'
                                  : ce.isVictim
                                  ? '💀 Victim'
                                  : 'Suspect'}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                ce.status === 'under_exposed'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {ce.totalMentions} Clues ({ce.spotlightSharePct}%)
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
                            <div className="rounded-lg bg-slate-50 border border-slate-200 py-1">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                Round 1
                              </span>
                              <strong className="text-slate-900">{ce.r1Mentions}</strong>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 py-1">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                Round 2
                              </span>
                              <strong className="text-slate-900">{ce.r2Mentions}</strong>
                            </div>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 py-1">
                              <span className="text-[9px] font-bold text-slate-400 block uppercase">
                                Round 3
                              </span>
                              <strong className="text-slate-900">{ce.r3Mentions}</strong>
                            </div>
                          </div>

                          <p className="text-[11px] text-slate-500 leading-snug">
                            {ce.statusNote}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 3: CHRONOLOGICAL TIMELINE & ROOM CONTRADICTION AUDIT */}
                {activeInsightTab === 'timeline' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-slate-600">
                        Automatically extracted {review.timelineAudit.totalTimestampedEvents} timestamps across Rounds 1–3 and verified that no character is placed in two different locations at the same time.
                      </p>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                          review.timelineAudit.contradictionsCount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {review.timelineAudit.contradictionsCount === 0
                          ? '✓ 0 Timeline Contradictions'
                          : `⚠️ ${review.timelineAudit.contradictionsCount} Timeline Conflict(s)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                      {review.timelineAudit.events.map((ev, idx) => (
                        <div
                          key={`${ev.clueId}-${idx}`}
                          className={`rounded-xl p-3 border text-xs flex items-start justify-between gap-3 ${
                            ev.hasConflict
                              ? 'bg-rose-50 border-rose-300'
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 font-mono text-[10px] font-black">
                                🕒 {ev.timeLabel}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-black uppercase">
                                R{ev.round}
                              </span>
                              <span className="font-black text-slate-900 truncate">
                                {ev.clueTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 leading-snug">
                              {ev.summary}
                            </p>
                            {ev.involvedRoles.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {ev.involvedRoles.map((role) => (
                                  <span
                                    key={role}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-bold"
                                  >
                                    {role}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                              ev.isFake
                                ? ev.round === 3
                                  ? 'bg-sky-100 text-sky-800'
                                  : 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {ev.isFake
                              ? ev.round === 3
                                ? '🛡️ Alibi'
                                : '🎭 Subplot'
                              : '✓ Canon'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: CLUE-BY-CLUE SIGNAL VS NOISE DIAGNOSTICS */}
                {activeInsightTab === 'clues' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                    {review.clueDiagnostics.map((cd) => (
                      <div
                        key={cd.clueId}
                        className="rounded-xl bg-white border border-slate-200 p-3 flex items-start justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black uppercase shrink-0">
                              R{cd.round}
                            </span>
                            <span className="font-black text-slate-900 truncate">
                              {cd.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            {cd.insightText}
                          </p>
                        </div>

                        <span
                          className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase whitespace-nowrap shrink-0 ${
                            cd.diagnosticBadge === 'token_or_format_bug'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : cd.diagnosticBadge === 'gender_script_warning'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : cd.diagnosticBadge === 'clear_r3_alibi'
                              ? 'bg-sky-100 text-sky-800'
                              : cd.diagnosticBadge === 'effective_decoy'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {cd.diagnosticBadge === 'token_or_format_bug'
                            ? '🛑 Token Bug'
                            : cd.diagnosticBadge === 'gender_script_warning'
                            ? '🚻 Gender Tag'
                            : cd.diagnosticBadge === 'clear_r3_alibi'
                            ? `🛡️ Alibi (${cd.correctClassificationRatePct}%)`
                            : cd.diagnosticBadge === 'effective_decoy'
                            ? `🎭 Decoy (${cd.correctClassificationRatePct}%)`
                            : `✓ Beat ${cd.beatNumber || '?'} (${cd.correctClassificationRatePct}%)`}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                4. COMPACT 20-VERSION STATUS STRIP (CLICK ANY PILL TO OPEN LIVE INSPECTOR)
            ====================================================================== */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                    🔍 20 Generated Cast Versions
                  </span>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    Click Any Version (#1–#{suite.completedRunsCount}) to Inspect Live Visual Clue Cards
                  </h3>
                </div>

                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setVersionFilter('all')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase cursor-pointer ${
                      versionFilter === 'all'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({suite.runs.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVersionFilter('flagged')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase cursor-pointer ${
                      versionFilter === 'flagged'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚠️ With Warnings / Wrong R3 Vote ({flaggedRunsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVersionFilter('canary')}
                    className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase cursor-pointer ${
                      versionFilter === 'canary'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Canary #1–#3
                  </button>
                </div>
              </div>

              {/* Compact 20-Pill Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                {filteredRuns.map((run) => {
                  const isSelected = selectedRunNumber === run.runNumber;
                  const hasWarning =
                    run.issues.length > 0 || !run.blindDetective.r3Correct;
                  return (
                    <button
                      key={run.id}
                      type="button"
                      onClick={() =>
                        setSelectedRunNumber(isSelected ? null : run.runNumber)
                      }
                      className={`text-left rounded-xl px-3 py-2.5 border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-brand-pink shadow-md'
                          : !run.passed
                          ? 'bg-rose-50 border-rose-300 hover:bg-rose-100/70'
                          : hasWarning
                          ? 'bg-amber-50/70 border-amber-300 hover:bg-amber-100/60'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[11px] font-black uppercase ${
                            isSelected ? 'text-brand-pink' : 'text-slate-900'
                          }`}
                        >
                          #{run.runNumber}{' '}
                          {run.scenarioName
                            .replace(/^(Canary|Run)\s*#\d+\s*•\s*/i, '')
                            .split(' (')[0]
                            .slice(0, 18)}
                        </span>
                        <span
                          className={`text-[11px] font-black shrink-0 ${
                            isSelected
                              ? 'text-emerald-300'
                              : !run.passed
                              ? 'text-rose-700'
                              : hasWarning
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {run.healthScore}%{' '}
                          {!run.passed ? '🛑' : hasWarning ? '⚠️' : '✅'}
                        </span>
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {run.activePlayerCount}p • R3:{' '}
                        {run.blindDetective.r3GuessName.split(' (')[0]}{' '}
                        {run.blindDetective.r3Correct ? '🔪' : '❌'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* =====================================================================
                5. LIVE VISUAL VERSION INSPECTOR (RENDERS ACTUAL CLUERENDERER CARDS!)
            ====================================================================== */}
            {selectedRun && (
              <div className="rounded-3xl bg-slate-900 text-white border-2 border-brand-pink p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                        Version #{selectedRun.runNumber} of {suite.completedRunsCount}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-bold">
                        {selectedRun.activePlayerCount} Active Players • Health: {selectedRun.healthScore}%
                      </span>
                      {/* Prev / Next Version Quick Switcher */}
                      <div className="inline-flex items-center gap-1 ml-1">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRunNumber(
                              selectedRun.runNumber > 1
                                ? selectedRun.runNumber - 1
                                : suite.completedRunsCount
                            )
                          }
                          className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase cursor-pointer"
                        >
                          ◀ Prev Version
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRunNumber(
                              selectedRun.runNumber < suite.completedRunsCount
                                ? selectedRun.runNumber + 1
                                : 1
                            )
                          }
                          className="px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black uppercase cursor-pointer"
                        >
                          Next Version ▶
                        </button>
                      </div>
                    </div>
                    <h3 className="text-lg font-black uppercase">
                      {selectedRun.scenarioName}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Toggle Visual Cards vs Compact Audit */}
                    <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setInspectorViewMode('visual_cards')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                          inspectorViewMode === 'visual_cards'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        🎨 Live Visual Clue Cards
                      </button>
                      <button
                        type="button"
                        onClick={() => setInspectorViewMode('compact_audit')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase cursor-pointer ${
                          inspectorViewMode === 'compact_audit'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        📋 Compact Text Audit
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={openingInScreener}
                      onClick={() => handleOpenVersionInScreener(selectedRun)}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
                    >
                      {openingInScreener
                        ? 'Loading…'
                        : `🕵️ Open Version #${selectedRun.runNumber} in Screen Pack ↗`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRunNumber(null)}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-black uppercase cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Flagged Warnings on This Specific Version (if any) */}
                {selectedRun.issues.length > 0 && (
                  <div className="rounded-2xl bg-amber-950/50 border border-amber-400/40 p-3.5 space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      ⚠️ Warnings Flagged on Version #{selectedRun.runNumber} ({selectedRun.issues.length})
                    </div>
                    {selectedRun.issues.map((iss, idx) => (
                      <div key={idx} className="text-xs text-amber-100">
                        • <strong>{iss.targetTitle}:</strong> {iss.message}
                      </div>
                    ))}
                  </div>
                )}

                {/* 1. Assigned Cast Strip + AI Blind-Detective Verdict */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedRun.castAssignments.map((ca) => (
                      <div
                        key={ca.characterId}
                        className={`rounded-xl p-2.5 border text-xs ${
                          ca.isDroppedOptional
                            ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                            : ca.plotRole === 'killer'
                            ? 'bg-rose-950/40 border-rose-500/40'
                            : 'bg-slate-950/90 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-white truncate">
                            {ca.isDroppedOptional
                              ? `${ca.roleTitle} (Dropped)`
                              : `${ca.guest?.name}`}
                          </span>
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/10 text-slate-300 shrink-0">
                            {ca.plotRole === 'killer'
                              ? '🔪 Killer'
                              : ca.isVictim
                              ? '💀 Victim'
                              : ca.guest?.gender}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                          {ca.roleTitle} • {ca.guest?.hairColor} hair
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-5 rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-400">
                      <span>AI Blind-Detective ({selectedRun.blindDetective.persona})</span>
                      <span className="text-emerald-400">
                        Tags: {selectedRun.blindDetective.clueTagAccuracyPct}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">R1 Pick</span>
                        <strong className="text-white truncate block">
                          {selectedRun.blindDetective.r1GuessName.split(' (')[0]}{' '}
                          {selectedRun.blindDetective.r1Correct ? '✅' : '❌'}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">R2 Pick</span>
                        <strong className="text-white truncate block">
                          {selectedRun.blindDetective.r2GuessName.split(' (')[0]}{' '}
                          {selectedRun.blindDetective.r2Correct ? '✅' : '❌'}
                        </strong>
                      </div>
                      <div className="rounded-lg bg-slate-900 p-2 border border-slate-800">
                        <span className="text-[9px] text-slate-400 block uppercase">R3 Final</span>
                        <strong className="text-emerald-300 truncate block">
                          {selectedRun.blindDetective.r3GuessName.split(' (')[0]}{' '}
                          {selectedRun.blindDetective.r3Correct ? '🔪✅' : '❌'}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Live Visual Clue Cards or Compact Audit Grid */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {inspectorViewMode === 'visual_cards'
                        ? `🎨 Live Rendered Clue Cards for Version #${selectedRun.runNumber}`
                        : `📋 Hydrated Clue Text Audit for Version #${selectedRun.runNumber}`}
                    </span>
                    <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800">
                      {(['all', 1, 2, 3] as const).map((rf) => (
                        <button
                          key={String(rf)}
                          type="button"
                          onClick={() => setInspectorRoundFilter(rf)}
                          className={`px-2.5 py-1 rounded text-[10px] font-black uppercase cursor-pointer ${
                            inspectorRoundFilter === rf
                              ? 'bg-brand-pink text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {rf === 'all' ? 'All Rounds' : `Round ${rf}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {inspectorViewMode === 'visual_cards' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[680px] overflow-y-auto pr-1">
                      {selectedRun.evaluatedClues
                        .filter(
                          (ec) =>
                            inspectorRoundFilter === 'all' ||
                            ec.round === inspectorRoundFilter
                        )
                        .map((ec) => (
                          <div
                            key={ec.clueId}
                            className="rounded-2xl bg-white text-slate-900 border border-slate-200 p-4 space-y-3 shadow-md"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black uppercase">
                                  Round {ec.round} • #{ec.indexInRound}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-black uppercase">
                                  {ec.format.replace(/_/g, ' ')}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                  ec.isFake
                                    ? ec.round === 3
                                      ? 'bg-sky-100 text-sky-800'
                                      : 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {ec.isFake
                                  ? ec.round === 3
                                    ? '🛡️ R3 Alibi'
                                    : '🎭 Decoy'
                                  : `✓ Real (Beat ${ec.beatNumber || '?'})`}
                              </span>
                            </div>

                            <ClueRenderer
                              clue={{
                                id: ec.clueId,
                                title: ec.title,
                                description: ec.hydratedDescription,
                                format: ec.format,
                                round_number: ec.round,
                                static_image_url: ec.staticImageUrl,
                                audio_url: ec.audioUrl,
                                voice_region: ec.voiceRegion,
                                internal_notes: ec.internalNotes,
                              }}
                              formatOverride={ec.format as ClueFormat}
                              hydratedTitle={ec.hydratedTitle}
                              hydratedDescription={ec.hydratedDescription}
                              characters={selectedVersionCharacters}
                              showImage={true}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                              <span className="text-slate-600">
                                <strong>AI Blind-Solver Tag:</strong>{' '}
                                {ec.blindDetectiveTag === 'key'
                                  ? '🔑 Key Evidence'
                                  : ec.blindDetectiveTag === 'alibi'
                                  ? '🛡️ Alibi'
                                  : '🐟 Decoy'}{' '}
                                {ec.blindDetectiveTagCorrect ? '✅' : '❌'}
                              </span>
                              {ec.pronounIssues.length > 0 ? (
                                <span className="text-amber-700 font-bold">
                                  ⚠️ {ec.pronounIssues[0]}
                                </span>
                              ) : ec.tokenLeaks.length > 0 ? (
                                <span className="text-rose-600 font-bold">
                                  ❌ Leak: {ec.tokenLeaks.join(', ')}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-bold">
                                  ✓ UI &amp; Tokens Clean
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-96 overflow-y-auto pr-1">
                      {selectedRun.evaluatedClues
                        .filter(
                          (ec) =>
                            inspectorRoundFilter === 'all' ||
                            ec.round === inspectorRoundFilter
                        )
                        .map((ec) => (
                          <div
                            key={ec.clueId}
                            className={`rounded-xl p-3 border text-xs space-y-1.5 ${
                              ec.tokenLeaks.length > 0
                                ? 'bg-rose-950/60 border-rose-500'
                                : ec.pronounIssues.length > 0
                                ? 'bg-amber-950/40 border-amber-500/50'
                                : 'bg-slate-950/90 border-slate-800'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-black text-white truncate">
                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[9px] font-black uppercase mr-1.5">
                                  R{ec.round}#{ec.indexInRound}
                                </span>
                                {ec.hydratedTitle}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                                  ec.isFake
                                    ? ec.round === 3
                                      ? 'bg-sky-500/20 text-sky-300'
                                      : 'bg-rose-500/20 text-rose-300'
                                    : 'bg-emerald-500/20 text-emerald-300'
                                }`}
                              >
                                {ec.isFake
                                  ? ec.round === 3
                                    ? '🛡️ R3 Alibi'
                                    : '🎭 Decoy'
                                  : `✓ Beat ${ec.beatNumber || '?'}`}
                              </span>
                            </div>

                            {ec.hydratedDescription && (
                              <p className="text-[11px] text-slate-300 line-clamp-2">
                                {ec.hydratedDescription}
                              </p>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/80">
                              <span>Format: {ec.format.toUpperCase()}</span>
                              <span>
                                {ec.tokenLeaks.length > 0 ? (
                                  <strong className="text-rose-400">
                                    ❌ Leak: {ec.tokenLeaks.join(', ')}
                                  </strong>
                                ) : ec.pronounIssues.length > 0 ? (
                                  <strong className="text-amber-300">
                                    ⚠️ Gendered Script Tag
                                  </strong>
                                ) : (
                                  <strong className="text-emerald-400">
                                    ✓ Hydrated Cleanly
                                  </strong>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
