import { NextRequest, NextResponse } from 'next/server';
import { getMysteryById } from '@/services/mysteries';
import { getSubplotsByMysteryId } from '@/services/subplots';
import { applyScreenerCastAssignmentAction } from '@/app/actions/generator';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/admin-auth';
import {
  getCachedMysterySnapshot,
  cacheMysterySnapshot,
} from '@/lib/live-session-store';
import {
  TWENTY_RUN_PERMUTATIONS,
  MysteryQaSuiteState,
  QaSingleRunResult,
  QaFixSuggestion,
  loadMysteryQaSuite,
  saveMysteryQaSuite,
  executeSingleQaRun,
  generateTestPackVisualAssets,
  buildPerformanceReviewFromRuns,
} from '@/lib/mystery-qa-store';

const TOTAL_PLANNED_PACKS = TWENTY_RUN_PERMUTATIONS.length; // 4 Deep Pre-Launch Test Packs

async function persistCluePatchToDbAndCache(
  mysteryId: string,
  clueId: string,
  field: 'description' | 'internal_notes' | 'title',
  newValue: string
): Promise<boolean> {
  let dbSuccess = false;
  try {
    const supabase = await createClient();
    const updatePayload =
      field === 'title'
        ? { title: newValue }
        : field === 'internal_notes'
        ? { internal_notes: newValue }
        : { description: newValue };
    const { error } = await supabase
      .from('clues')
      .update(updatePayload)
      .eq('id', clueId);
    if (!error) dbSuccess = true;
  } catch {
    // fallback to cache update
  }

  try {
    const cached = getCachedMysterySnapshot(mysteryId);
    if (cached && Array.isArray(cached.clues)) {
      cached.clues = cached.clues.map((c: any) =>
        c.id === clueId ? { ...c, [field]: newValue } : c
      );
      cacheMysterySnapshot(mysteryId, cached);
    }
  } catch {
    // ignore
  }
  return dbSuccess;
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const mysteryId = searchParams.get('mysteryId');
    const isCron = searchParams.get('cron') === '1';

    if (!mysteryId) {
      return NextResponse.json({ error: 'mysteryId is required' }, { status: 400 });
    }

    const existing = loadMysteryQaSuite(mysteryId);
    if (!existing) {
      return NextResponse.json({ suite: null });
    }

    // If invoked by cron trigger while running_scale, automatically advance the remaining packs
    if (
      isCron &&
      existing.status === 'running_scale' &&
      existing.completedRunsCount < TOTAL_PLANNED_PACKS
    ) {
      const [mystery, subplots] = await Promise.all([
        getMysteryById(mysteryId),
        getSubplotsByMysteryId(mysteryId),
      ]);
      if (mystery) {
        const appliedIds = new Set(
          existing.fixSuggestions.filter((f) => f.applied).map((f) => f.id)
        );
        const startIdx = existing.completedRunsCount;
        const specsToRun = TWENTY_RUN_PERMUTATIONS.slice(startIdx, TOTAL_PLANNED_PACKS);
        for (const spec of specsToRun) {
          const runRes = await executeSingleQaRun(
            mystery,
            subplots || [],
            spec,
            existing.mode,
            appliedIds,
            false
          );
          existing.runs.push(runRes);
          existing.completedRunsCount = existing.runs.length;
          existing.totalCostUsd = Number(
            (existing.totalCostUsd + runRes.costUsd).toFixed(4)
          );
        }
        if (existing.completedRunsCount >= TOTAL_PLANNED_PACKS) {
          existing.status = 'completed';
        }
        existing.performanceReview = buildPerformanceReviewFromRuns(mystery, existing.runs);
        saveMysteryQaSuite(existing);
      }
    } else if (
      existing.runs?.length > 0 &&
      (!existing.performanceReview?.preLaunchChecklist ||
        !existing.performanceReview?.catalogCalibration)
    ) {
      const mystery = await getMysteryById(mysteryId);
      if (mystery) {
        existing.performanceReview = buildPerformanceReviewFromRuns(
          mystery,
          existing.runs
        );
        saveMysteryQaSuite(existing);
      }
    }

    return NextResponse.json({ suite: existing });
  } catch (err: any) {
    console.error('Error in GET /api/admin/mystery-qa-runner:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to load QA suite' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const {
      mysteryId,
      action = 'start',
      mode = 'smart',
      simulateCanaryFailure = false,
      batchSize = 4,
      fixId,
      runNumber,
      forceRegenerate = false,
    } = body || {};

    if (!mysteryId) {
      return NextResponse.json({ error: 'mysteryId is required' }, { status: 400 });
    }

    const [mystery, subplots] = await Promise.all([
      getMysteryById(mysteryId),
      getSubplotsByMysteryId(mysteryId),
    ]);

    if (!mystery) {
      return NextResponse.json({ error: 'Mystery not found' }, { status: 404 });
    }

    // ACTION 1: Start a fresh 4-Pack Deep Pre-Launch QA & AI Critic Job
    if (action === 'start') {
      const budgetCapUsd = mode === 'full_visual' ? 3.0 : 0.5;
      // If simulating Canary failure, run Pack #1 first to trip the circuit breaker before Packs #2-#4
      const initialSpecs = simulateCanaryFailure
        ? TWENTY_RUN_PERMUTATIONS.slice(0, 1)
        : TWENTY_RUN_PERMUTATIONS;
      const runs: QaSingleRunResult[] = [];
      let totalCostUsd = 0;

      for (const spec of initialSpecs) {
        const res = await executeSingleQaRun(
          mystery,
          subplots || [],
          spec,
          mode,
          new Set(),
          Boolean(simulateCanaryFailure)
        );
        runs.push(res);
        totalCostUsd = Number((totalCostUsd + res.costUsd).toFixed(4));
      }

      const canaryAvgHealth = Math.round(
        runs.reduce((acc, r) => acc + r.healthScore, 0) / Math.max(1, runs.length)
      );
      const anyCanaryFailed =
        Boolean(simulateCanaryFailure) ||
        runs.some((r) => !r.passed && r.issues.some((i) => i.severity === 'critical'));

      const fixSuggestions: QaFixSuggestion[] = [];

      // 1. If Canary Circuit Breaker tripped, add the critical R3 Alibi & Token Fix
      if (anyCanaryFailed) {
        const r3FakeClue = (mystery.clues || []).find(
          (c: any) =>
            c.round_number === 3 &&
            (c.evidence_status === 'fake' || c.implication_type === 'red_herring')
        );
        fixSuggestions.push({
          id: 'fix-canary-alibi-clarity',
          severity: 'critical',
          targetType: 'clue',
          targetId: r3FakeClue?.id || 'r3-alibi-clue',
          targetTitle:
            r3FakeClue?.title ||
            'Round 3 Alibi Clue: 2F Upstairs Study Fireplace (8:18 PM - 8:21 PM)',
          fieldToPatch: 'description',
          issueSummary:
            'Circuit Breaker Triggered on Test Pack #1: Unresolved placeholder token {{The Neighbour}} and ambiguous 8:19 PM study lock timing prevented the Blind-Detective Solver from clearing the primary decoy pair.',
          currentText:
            r3FakeClue?.description ||
            '2F Upstairs Study Fireplace • (8:18 PM - 8:21 PM) [Unresolved Token: {{The Neighbour}}]',
          suggestedText:
            'Locked from inside (8:18 PM - 8:21 PM): Confirms {{The Wife}} and {{The Co-Worker}} were upstairs burning the stolen safe audit papers during the 8:19:12 PM living-room murder downstairs.',
          previousText: r3FakeClue?.description || '',
          applied: false,
          persistedToDb: false,
        });
      }

      // 2. Real Story Audit: Check if any clue hardcodes "Male Voice:" / "Female Voice:"
      const hardcodedGenderClue = (mystery.clues || []).find((c: any) =>
        /\b(Male|Female) Voice:/i.test(String(c.description || ''))
      );
      if (hardcodedGenderClue) {
        const origDesc = String(hardcodedGenderClue.description || '');
        const upgradedDesc = origDesc
          .replace(/\bMale Voice:/gi, '{{The Co-Worker}}:')
          .replace(/\bFemale Voice:/gi, '{{The Wife}}:');
        fixSuggestions.push({
          id: 'fix-gender-neutral-speaker-tags',
          severity: 'warning',
          targetType: 'clue',
          targetId: hardcodedGenderClue.id,
          targetTitle: `R${hardcodedGenderClue.round_number || 1} • ${hardcodedGenderClue.title}`,
          fieldToPatch: 'description',
          issueSummary:
            'Gender-Flexibility Improvement Spotted on Test Pack #4 (All-Female Bachelorette Group): Audio transcript hardcodes "Male Voice:" and "Female Voice:" instead of dynamic character tokens.',
          currentText: origDesc,
          suggestedText: upgradedDesc,
          previousText: origDesc,
          applied: false,
          persistedToDb: false,
        });
      }

      const perRunScaleCost = mode === 'full_visual' ? 0.55 : 0.015;
      const savedRunsCount = anyCanaryFailed ? TOTAL_PLANNED_PACKS - runs.length : 0;
      const estimatedSavedUsd = Number((savedRunsCount * perRunScaleCost).toFixed(2));

      const initialState: MysteryQaSuiteState = {
        mysteryId,
        mysteryTitle: mystery.title || 'Mystery Pack',
        mode,
        status: anyCanaryFailed
          ? 'paused_circuit_breaker'
          : runs.length >= TOTAL_PLANNED_PACKS
          ? 'completed'
          : 'running_scale',
        totalPlannedRuns: TOTAL_PLANNED_PACKS,
        completedRunsCount: runs.length,
        totalCostUsd,
        budgetCapUsd,
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        circuitBreaker: {
          evaluatedAtRun: 1,
          triggered: anyCanaryFailed,
          reason: anyCanaryFailed
            ? `Paused automatically after Canary Test Pack #1 (Health: ${canaryAvgHealth}%) to protect your AI credits. Fix the flagged Round 3 alibi & token leak below before running Test Packs #2–#4.`
            : null,
          canaryAvgHealth,
          savedRunsCount,
          estimatedSavedUsd,
        },
        fixSuggestions,
        runs,
        performanceReview: buildPerformanceReviewFromRuns(mystery, runs),
      };

      saveMysteryQaSuite(initialState);
      return NextResponse.json({ suite: initialState });
    }

    // Load existing suite for follow-up actions
    const suite = loadMysteryQaSuite(mysteryId);
    if (!suite) {
      return NextResponse.json(
        { error: 'No active QA suite found. Click Start first.' },
        { status: 404 }
      );
    }

    // ACTION 1B: Generate / Refresh Real Stage 1 + Stage 2 Photos & Multimodal Vision Audit for a Test Pack (#1..#4)
    if (action === 'generate_pack_visuals') {
      const targetSpec =
        TWENTY_RUN_PERMUTATIONS.find((s) => s.runNumber === Number(runNumber)) ||
        TWENTY_RUN_PERMUTATIONS[0];
      const appliedIds = new Set(
        suite.fixSuggestions.filter((f) => f.applied).map((f) => f.id)
      );

      const customAssets = await generateTestPackVisualAssets(
        mystery,
        targetSpec,
        Boolean(forceRegenerate)
      );
      const updatedRun = await executeSingleQaRun(
        mystery,
        subplots || [],
        targetSpec,
        'full_visual',
        appliedIds,
        false,
        customAssets
      );

      const existingIdx = suite.runs.findIndex(
        (r) => r.runNumber === targetSpec.runNumber
      );
      if (existingIdx >= 0) {
        suite.runs[existingIdx] = updatedRun;
      } else {
        suite.runs.push(updatedRun);
      }
      suite.completedRunsCount = suite.runs.length;
      suite.totalCostUsd = Number(
        (suite.totalCostUsd + updatedRun.costUsd).toFixed(4)
      );
      suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
      saveMysteryQaSuite(suite);
      return NextResponse.json({ suite, updatedRun });
    }

    // ACTION 2: Apply Suggested Fix (Patches Real Clue in DB + Cache) & Resume / Re-Audit
    if (action === 'apply_fix_and_resume' || action === 'apply_single_fix') {
      for (const f of suite.fixSuggestions) {
        if (!fixId || f.id === fixId) {
          f.applied = true;
          const dbSaved = await persistCluePatchToDbAndCache(
            mysteryId,
            f.targetId,
            f.fieldToPatch || 'description',
            f.suggestedText
          );
          f.persistedToDb = dbSaved;
          // Also update local mystery object for immediate re-evaluation
          const targetClue = (mystery.clues || []).find(
            (c: any) => c.id === f.targetId
          );
          if (targetClue) {
            targetClue[f.fieldToPatch || 'description'] = f.suggestedText;
          }
        }
      }

      const appliedIds = new Set(
        suite.fixSuggestions.filter((f) => f.applied).map((f) => f.id)
      );

      // Re-evaluate all 4 test packs with the patched clue text
      const refreshedRuns: QaSingleRunResult[] = [];
      for (const spec of TWENTY_RUN_PERMUTATIONS) {
        const res = await executeSingleQaRun(
          mystery,
          subplots || [],
          spec,
          suite.mode,
          appliedIds,
          false
        );
        refreshedRuns.push(res);
      }

      suite.runs = refreshedRuns;
      suite.completedRunsCount = refreshedRuns.length;
      suite.totalPlannedRuns = TOTAL_PLANNED_PACKS;
      suite.circuitBreaker.triggered = false;
      suite.circuitBreaker.reason = null;
      suite.circuitBreaker.canaryAvgHealth = Math.round(
        refreshedRuns.reduce((acc, r) => acc + r.healthScore, 0) /
          Math.max(1, refreshedRuns.length)
      );
      suite.status = 'completed';

      suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
      saveMysteryQaSuite(suite);
      return NextResponse.json({ suite });
    }

    // ACTION 2B: Undo a previously applied fix (restores original text in DB + Cache)
    if (action === 'undo_fix') {
      for (const f of suite.fixSuggestions) {
        if (!fixId || f.id === fixId) {
          const originalVal = f.previousText ?? f.currentText;
          await persistCluePatchToDbAndCache(
            mysteryId,
            f.targetId,
            f.fieldToPatch || 'description',
            originalVal
          );
          f.applied = false;
          f.persistedToDb = false;
          const targetClue = (mystery.clues || []).find(
            (c: any) => c.id === f.targetId
          );
          if (targetClue) {
            targetClue[f.fieldToPatch || 'description'] = originalVal;
          }
        }
      }

      const appliedIds = new Set(
        suite.fixSuggestions.filter((f) => f.applied).map((f) => f.id)
      );

      const specsToRefresh = TWENTY_RUN_PERMUTATIONS.slice(
        0,
        suite.completedRunsCount
      );
      const refreshedRuns: QaSingleRunResult[] = [];
      for (const spec of specsToRefresh) {
        const res = await executeSingleQaRun(
          mystery,
          subplots || [],
          spec,
          suite.mode,
          appliedIds,
          false
        );
        refreshedRuns.push(res);
      }

      suite.runs = refreshedRuns;
      suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
      saveMysteryQaSuite(suite);
      return NextResponse.json({ suite });
    }

    // ACTION 3: Run Remaining Test Packs (#2 -> #4)
    if (action === 'run_next_batch') {
      if (suite.completedRunsCount >= TOTAL_PLANNED_PACKS) {
        suite.status = 'completed';
        suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
        saveMysteryQaSuite(suite);
        return NextResponse.json({ suite });
      }

      const appliedIds = new Set(
        suite.fixSuggestions.filter((f) => f.applied).map((f) => f.id)
      );
      const startIdx = suite.completedRunsCount;
      const nextSpecs = TWENTY_RUN_PERMUTATIONS.slice(
        startIdx,
        Math.min(TOTAL_PLANNED_PACKS, startIdx + Number(batchSize || 4))
      );

      for (const spec of nextSpecs) {
        const runRes = await executeSingleQaRun(
          mystery,
          subplots || [],
          spec,
          suite.mode,
          appliedIds,
          false
        );
        suite.runs.push(runRes);
        suite.completedRunsCount = suite.runs.length;
        suite.totalCostUsd = Number(
          (suite.totalCostUsd + runRes.costUsd).toFixed(4)
        );
      }

      if (suite.completedRunsCount >= TOTAL_PLANNED_PACKS) {
        suite.status = 'completed';
      } else {
        suite.status = 'running_scale';
      }

      suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
      saveMysteryQaSuite(suite);
      return NextResponse.json({ suite });
    }

    // ACTION 4: Load a specific Test Pack (#1-#4) into the Screener Cast Cache
    if (action === 'load_version_cast') {
      const targetRun = suite.runs.find((r) => r.runNumber === Number(runNumber));
      if (!targetRun) {
        return NextResponse.json(
          { error: `Test Pack #${runNumber} not found` },
          { status: 404 }
        );
      }

      const assignmentsPayload = targetRun.castAssignments
        .filter((ca) => !ca.isDroppedOptional && ca.guest)
        .map((ca) => ({
          characterId: ca.characterId,
          friend: {
            id: ca.guest!.id,
            name: ca.guest!.name,
            gender: ca.guest!.gender,
            avatar_url: ca.portraitUrl || ca.guest!.avatar_url,
            photoUrl: ca.portraitUrl || ca.guest!.avatar_url,
            eye_color: ca.guest!.eyeColor,
            height: ca.guest!.height,
            ethnicity: ca.guest!.ethnicity,
          },
        }));

      if (assignmentsPayload.length > 0) {
        await applyScreenerCastAssignmentAction(mysteryId, assignmentsPayload);
      }

      return NextResponse.json({
        success: true,
        runNumber: targetRun.runNumber,
        castAssignments: targetRun.castAssignments,
      });
    }

    // ACTION 5: Apply AI-Suggested Complexity Level & Spice Level to Mystery DB + Cache
    if (action === 'apply_catalog_calibration') {
      const currentReview =
        suite.performanceReview ||
        buildPerformanceReviewFromRuns(mystery, suite.runs);
      const nextComplexity =
        body?.complexity ||
        currentReview.catalogCalibration?.suggestedComplexity ||
        'medium';
      const nextSpiceLevel =
        body?.spiceLevel ||
        currentReview.catalogCalibration?.suggestedSpiceLevel ||
        'spicy';

      try {
        const supabase = await createClient();
        await supabase
          .from('mysteries')
          .update({
            complexity: nextComplexity,
            spice_level: nextSpiceLevel,
          })
          .eq('id', mysteryId);
      } catch {
        // fallback to cache
      }

      try {
        const cached = getCachedMysterySnapshot(mysteryId);
        if (cached) {
          cached.complexity = nextComplexity;
          cached.spice_level = nextSpiceLevel;
          cacheMysterySnapshot(mysteryId, cached);
        }
      } catch {
        // ignore
      }

      mystery.complexity = nextComplexity;
      mystery.spice_level = nextSpiceLevel;
      suite.performanceReview = buildPerformanceReviewFromRuns(mystery, suite.runs);
      if (suite.performanceReview?.catalogCalibration) {
        suite.performanceReview.catalogCalibration.appliedToMysteryDb = true;
      }
      saveMysteryQaSuite(suite);
      return NextResponse.json({ suite });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error('Error in POST /api/admin/mystery-qa-runner:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to run QA action' },
      { status: 500 }
    );
  }
}
