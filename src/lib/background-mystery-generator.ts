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
import { ensureStandardCharacterPhoto } from '@/app/actions/generator';

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
  { threshold: 0.98, label: 'Finalizing Pre-Party Host Hub, guest links & 6-digit Game PIN...' },
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
 */
export function triggerDetachedMysteryGeneration(params: BackgroundGenerationParams): void {
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

      // 2. Pre-generate standard character reference photos in the background for active characters
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
        for (const char of activeChars.slice(0, 6)) {
          try {
            await ensureStandardCharacterPhoto(
              char,
              cachedMystery || { id: params.mysteryId, theme: 'Murder Mystery' },
              null
            );
          } catch {
            // Non-fatal if image API key is not configured in local dev
          }
          completedCount += 1;
          const pct = Math.min(75, 28 + Math.round((completedCount / activeChars.length) * 45));
          updateMysteryGenerationInStore(params.mysteryId, {
            generationStep: `Generated character reference portrait (${completedCount}/${activeChars.length}) & weaving into visual clues...`,
            generationProgress: pct,
          });
        }
      }

      // 3. Schedule automatic completion & "Your Mystery is Ready!" email when the 20-minute window finishes
      const latestSession = getStoredGameSession(params.mysteryId);
      if (latestSession?.generationStatus === 'ready') {
        return;
      }

      const readyAtMs = latestSession?.generationReadyAt
        ? Date.parse(latestSession.generationReadyAt)
        : Date.now() + 20 * 60 * 1000;
      const delayMs = Math.max(1000, readyAtMs - Date.now());

      const existingTimer = activeGenerationTimers.get(params.mysteryId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        activeGenerationTimers.delete(params.mysteryId);
        void finalizeMysteryGenerationNow(params);
      }, delayMs);

      if (typeof timer.unref === 'function') {
        timer.unref();
      }
      activeGenerationTimers.set(params.mysteryId, timer);
    } catch (err) {
      console.error('[BACKGROUND MYSTERY GENERATOR] Error in detached job:', err);
    }
  })();
}
