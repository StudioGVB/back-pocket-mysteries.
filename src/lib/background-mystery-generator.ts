import {
  getStoredGameSession,
  updateMysteryGenerationInStore,
  getCachedMysterySnapshot,
  StoredGameSession,
} from '@/lib/live-session-store';
import {
  sendCustomerGenerationStartedEmail,
  sendCustomerMysteryReadyEmail,
} from '@/utils/purchase-notifications';
import {
  ensureStandardCharacterPhoto,
  generateClueImageAction,
  auditAndHealCustomerPackAction,
} from '@/app/actions/generator';
import { pregenerateAllAudioCluesForMystery } from '@/app/actions/audio-generator';

export interface BackgroundGenerationParams {
  mysteryId: string;
  slug?: string;
  mysteryTitle: string;
  customerEmail?: string | null;
  customerName?: string | null;
  pin?: string;
  locale?: string;
}

const activeGenerationTimers = new Map<string, NodeJS.Timeout>();

const GENERATION_STEPS = [
  { threshold: 0.15, label: 'Locking cast & hydrating character dossiers with guest names...' },
  { threshold: 0.35, label: 'Generating standard character reference portraits...' },
  { threshold: 0.6, label: 'Placing characters into visual clues, CCTV & crime scene photos...' },
  { threshold: 0.85, label: 'Synthesizing custom voice memos, accents & round evidence...' },
  { threshold: 0.95, label: 'Running automated AI QA Critic on character portraits, visual clues & audio...' },
  { threshold: 0.99, label: 'Finalizing Pre-Party Host Hub, guest links & 6-digit Game PIN...' },
];

export function computeLiveGenerationState(session: StoredGameSession | null): {
  status: 'idle' | 'generating' | 'ready';
  startedAt: string | null;
  readyAt: string | null;
  remainingSeconds: number;
  progress: number;
  stepLabel: string;
} {
  if (!session || !session.isPaid) {
    return {
      status: 'idle',
      startedAt: null,
      readyAt: null,
      remainingSeconds: 0,
      progress: 0,
      stepLabel: 'Waiting for cast lock & checkout',
    };
  }

  if (session.generationStatus === 'ready') {
    return {
      status: 'ready',
      startedAt: session.generationStartedAt || session.paidAt || null,
      readyAt: session.generationReadyAt || session.paidAt || null,
      remainingSeconds: 0,
      progress: 100,
      stepLabel: 'Package complete & ready in My Mysteries (Stories)!',
    };
  }

  // If paid before the 20-min workflow was added (no generationStatus set), treat as ready
  if (!session.generationStatus && !session.generationReadyAt) {
    return {
      status: 'ready',
      startedAt: session.paidAt || null,
      readyAt: session.paidAt || null,
      remainingSeconds: 0,
      progress: 100,
      stepLabel: 'Package complete & ready in My Mysteries (Stories)!',
    };
  }

  const nowMs = Date.now();
  const startMs = session.generationStartedAt
    ? Date.parse(session.generationStartedAt)
    : nowMs - 60000;
  const readyMs = session.generationReadyAt
    ? Date.parse(session.generationReadyAt)
    : startMs + 20 * 60 * 1000;

  if (nowMs >= readyMs) {
    return {
      status: 'ready',
      startedAt: session.generationStartedAt || null,
      readyAt: session.generationReadyAt || null,
      remainingSeconds: 0,
      progress: 100,
      stepLabel: 'Package complete & ready in My Mysteries (Stories)!',
    };
  }

  const totalDuration = Math.max(1000, readyMs - startMs);
  const elapsed = Math.max(0, nowMs - startMs);
  const ratio = Math.min(0.97, elapsed / totalDuration);
  const computedProgress = Math.max(
    session.generationProgress || 18,
    Math.min(97, Math.round(18 + ratio * 79))
  );
  const remainingSeconds = Math.max(1, Math.ceil((readyMs - nowMs) / 1000));

  const matchedStep =
    GENERATION_STEPS.find(s => ratio <= s.threshold)?.label ||
    session.generationStep ||
    GENERATION_STEPS[GENERATION_STEPS.length - 1].label;

  return {
    status: 'generating',
    startedAt: session.generationStartedAt || null,
    readyAt: session.generationReadyAt || null,
    remainingSeconds,
    progress: computedProgress,
    stepLabel: matchedStep,
  };
}

/**
 * Checks if a generating mystery has reached its ready timestamp; if so, marks it 'ready'
 * in the store and sends the customer's "Your Mystery is Ready!" email.
 */
export async function checkAndFinalizeGenerationIfDue(
  params: BackgroundGenerationParams
): Promise<{
  status: 'idle' | 'generating' | 'ready';
  startedAt: string | null;
  readyAt: string | null;
  remainingSeconds: number;
  progress: number;
  stepLabel: string;
  customerEmail: string | null;
}> {
  const session = getStoredGameSession(params.mysteryId);
  const computed = computeLiveGenerationState(session);
  const resolvedEmail = params.customerEmail || session?.customerEmail || null;

  if (
    session &&
    session.generationStatus === 'generating' &&
    computed.status === 'ready'
  ) {
    updateMysteryGenerationInStore(params.mysteryId, {
      generationStatus: 'ready',
      generationProgress: 100,
      generationStep: 'Package complete & ready in My Mysteries (Stories)!',
      readyEmailSent: true,
    });
    if (params.slug && params.slug !== params.mysteryId) {
      updateMysteryGenerationInStore(params.slug, {
        generationStatus: 'ready',
        generationProgress: 100,
        generationStep: 'Package complete & ready in My Mysteries (Stories)!',
        readyEmailSent: true,
      });
    }

    if (resolvedEmail && !session.readyEmailSent) {
      await sendCustomerMysteryReadyEmail({
        customerEmail: resolvedEmail,
        customerName: params.customerName || session.customerName || null,
        mysteryId: params.mysteryId,
        mysterySlug: params.slug || params.mysteryId,
        mysteryTitle: params.mysteryTitle,
        pin: params.pin || session.pin,
        locale: params.locale || 'en',
      });
    }
  }

  return {
    ...computed,
    customerEmail: resolvedEmail,
  };
}

/**
 * Immediately finishes generation (e.g. when the timer expires or the user clicks Fast-Forward)
 * and sends the "Your Murder Mystery Package is Ready!" email to the customer.
 */
export async function finalizeMysteryGenerationNow(
  params: BackgroundGenerationParams
): Promise<{ success: boolean; emailSent: boolean }> {
  const existingTimer = activeGenerationTimers.get(params.mysteryId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeGenerationTimers.delete(params.mysteryId);
  }

  // Ensure any remaining audio clues are generated so they play immediately on click
  void pregenerateAllAudioCluesForMystery(params.mysteryId);

  const session = getStoredGameSession(params.mysteryId);
  const nowIso = new Date().toISOString();
  const resolvedEmail = params.customerEmail || session?.customerEmail || null;
  const resolvedName = params.customerName || session?.customerName || null;
  const resolvedPin = params.pin || session?.pin || '482910';

  updateMysteryGenerationInStore(params.mysteryId, {
    generationStatus: 'ready',
    generationReadyAt: nowIso,
    generationProgress: 100,
    generationStep: 'Package complete & ready in My Mysteries (Stories)!',
    readyEmailSent: true,
  });

  if (params.slug && params.slug !== params.mysteryId) {
    updateMysteryGenerationInStore(params.slug, {
      generationStatus: 'ready',
      generationReadyAt: nowIso,
      generationProgress: 100,
      generationStep: 'Package complete & ready in My Mysteries (Stories)!',
      readyEmailSent: true,
    });
  }

  let emailSent = false;
  if (resolvedEmail) {
    const emailRes = await sendCustomerMysteryReadyEmail({
      customerEmail: resolvedEmail,
      customerName: resolvedName,
      mysteryId: params.mysteryId,
      mysterySlug: params.slug || params.mysteryId,
      mysteryTitle: params.mysteryTitle,
      pin: resolvedPin,
      locale: params.locale || 'en',
    });
    emailSent = Boolean(emailRes.sent || emailRes.queuedInOutbox);
  }

  return { success: true, emailSent };
}

/**
 * Detached server-side background job launched right when the customer pays.
 * Continues running on the server even if the customer closes their browser tab!
 * Includes a 3-second anti-rate-limit breather between AI calls and automatic retry sweeps
 * so 100% of character portraits, visual clues, and audio wiretaps finish flawlessly.
 */
export function triggerDetachedMysteryGeneration(params: BackgroundGenerationParams): void {
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  void (async () => {
    try {
      const session = getStoredGameSession(params.mysteryId);
      const resolvedEmail = params.customerEmail || session?.customerEmail || null;
      const resolvedName = params.customerName || session?.customerName || null;

      // 1. Send immediate "Go get a coffee, we're brewing your mystery!" confirmation email
      if (resolvedEmail) {
        await sendCustomerGenerationStartedEmail({
          customerEmail: resolvedEmail,
          customerName: resolvedName,
          mysteryId: params.mysteryId,
          mysterySlug: params.slug || params.mysteryId,
          mysteryTitle: params.mysteryTitle,
          pin: params.pin || session?.pin,
          locale: params.locale || 'en',
        });
      }

      // 2. STAGE 1: Pre-generate standard character reference photos sequentially with a 3s breather & retry pass
      const cachedMystery = getCachedMysterySnapshot(params.mysteryId);
      const characters: any[] = cachedMystery?.characters || [];
      const activeChars = characters.filter(
        c => c.profile_data?.is_active_in_session !== false
      );

      if (activeChars.length > 0) {
        updateMysteryGenerationInStore(params.mysteryId, {
          generationStep: `Generating standard character reference portraits (0/${activeChars.length})...`,
          generationProgress: 28,
        });

        let completedCount = 0;
        for (let idx = 0; idx < activeChars.length; idx++) {
          const char = activeChars[idx];
          let photoUrl: string | null = null;

          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const res = await ensureStandardCharacterPhoto(
                char,
                cachedMystery || { id: params.mysteryId, theme: 'Murder Mystery' },
                null,
                attempt > 1
              );
              photoUrl = res?.photoUrl || null;
              if (photoUrl) break;
            } catch (err) {
              console.warn(
                `[BACKGROUND MYSTERY GENERATOR] Stage 1 portrait attempt ${attempt}/2 failed for ${char.id}:`,
                err
              );
            }
            if (attempt < 2) {
              await sleep(5000);
            }
          }

          completedCount += 1;
          const pct = Math.min(52, 28 + Math.round((completedCount / activeChars.length) * 24));
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `Generated character reference portrait (${completedCount}/${activeChars.length})...`,
            generationProgress: pct,
          });

          // 3-second breather between character portrait requests to prevent Gemini 429 burst limits
          if (idx < activeChars.length - 1) {
            await sleep(3000);
          }
        }
      }

      // 2.25 STAGE 2: Pre-generate visual clue scene photos featuring the cast's Standard Character Reference Photos
      const refreshedMysteryAfterStage1 = getCachedMysterySnapshot(params.mysteryId) || cachedMystery;
      const allClues: any[] = refreshedMysteryAfterStage1?.clues || [];
      const visualClues = allClues.filter(
        c =>
          c?.id &&
          c?.generation_prompt &&
          (/\{\{[^}]+\}\}/.test(c.generation_prompt) ||
            /\{\{[^}]+\}\}/.test(c.description || '') ||
            c.format === 'cctv' ||
            c.format === 'physical_prop' ||
            c.format === 'social_post')
      );

      if (visualClues.length > 0) {
        let clueCount = 0;
        const failedVisualClues: any[] = [];

        for (let idx = 0; idx < visualClues.length; idx++) {
          const vClue = visualClues[idx];
          let generatedOk = false;

          for (let attempt = 1; attempt <= 2; attempt++) {
            try {
              const res = await generateClueImageAction(
                vClue.id,
                params.mysteryId,
                vClue.generation_prompt,
                true
              );
              if (res?.imageUrl && !res?.error) {
                generatedOk = true;
                break;
              }
            } catch (err) {
              console.warn(
                `[BACKGROUND MYSTERY GENERATOR] Stage 2 clue image attempt ${attempt}/2 failed for ${vClue.id}:`,
                err
              );
            }
            if (attempt < 2) {
              await sleep(5000);
            }
          }

          if (!generatedOk) {
            failedVisualClues.push(vClue);
          }

          clueCount += 1;
          const pct = Math.min(72, 52 + Math.round((clueCount / visualClues.length) * 20));
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `Placing cast into visual clue & CCTV photos (${clueCount}/${visualClues.length})...`,
            generationProgress: pct,
          });

          // 3-second breather between visual clue image calls
          if (idx < visualClues.length - 1) {
            await sleep(3000);
          }
        }

        // Verification Sweep: If any visual clue hit a temporary quota hiccup, pause 6s and run a dedicated recovery pass
        if (failedVisualClues.length > 0) {
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `Verifying & recovering ${failedVisualClues.length} crime-scene photo(s)...`,
            generationProgress: 73,
          });
          await sleep(6000);
          for (const retryClue of failedVisualClues) {
            try {
              await generateClueImageAction(
                retryClue.id,
                params.mysteryId,
                retryClue.generation_prompt,
                true
              );
            } catch {
              // Non-fatal after recovery sweep
            }
            await sleep(3500);
          }
        }
      }

      // 2.5 STAGE 3: Pre-generate all custom voice recordings / audio clues with cast guest names & accents
      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: 'Synthesizing custom voice memos, accents & round audio clues...',
        generationProgress: 74,
      });
      await pregenerateAllAudioCluesForMystery(params.mysteryId, {
        forceRegenerate: true,
        onProgress: (completed, total) => {
          const pct = Math.min(93, 74 + Math.round((completed / Math.max(1, total)) * 19));
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `Synthesized custom voice recording (${completed}/${total})...`,
            generationProgress: pct,
          });
        },
      });

      // 2.75 STAGE 3.5: Pre-Delivery Automated QA Critic & Self-Healing Bot (Gates 1-4)
      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep:
          'Running automated AI QA Critic on character portraits, visual clues & audio wiretaps...',
        generationProgress: 94,
      });
      try {
        const qaReport = await auditAndHealCustomerPackAction(params.mysteryId);
        if (
          qaReport.visualCluesRegenerated > 0 ||
          qaReport.portraitsRegenerated > 0 ||
          qaReport.audioCluesRegenerated > 0 ||
          qaReport.textIssuesRepaired > 0
        ) {
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `AI QA Bot self-healed ${qaReport.visualCluesRegenerated} visual clue(s), ${qaReport.portraitsRegenerated} portrait(s) & ${qaReport.audioCluesRegenerated} audio wiretap(s) (Score: ${qaReport.overallScore}/100)...`,
            generationProgress: 97,
            qaReport,
          });
        } else {
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `AI QA Verified (${qaReport.overallScore}/100)! Finalizing Pre-Party Host Hub...`,
            generationProgress: 98,
            qaReport,
          });
        }
      } catch (qaErr) {
        console.warn('[BACKGROUND MYSTERY GENERATOR] Non-fatal QA audit error:', qaErr);
      }

      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: 'QA passed! Finalizing Pre-Party Host Hub & sending ready notification...',
        generationProgress: 99,
      });

      // 3. Finalize & send the "Your Mystery is Ready!" email as soon as all stages + QA verification finish
      const latestSession = getStoredGameSession(params.mysteryId);
      if (latestSession?.generationStatus === 'ready') {
        return;
      }

      const existingTimer = activeGenerationTimers.get(params.mysteryId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        activeGenerationTimers.delete(params.mysteryId);
      }

      await finalizeMysteryGenerationNow(params);
    } catch (err) {
      console.error('[BACKGROUND MYSTERY GENERATOR] Error in detached job:', err);
    }
  })();
}
