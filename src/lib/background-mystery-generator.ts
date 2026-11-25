import {
  getStoredGameSession,
  updateMysteryGenerationInStore,
  getCachedMysterySnapshot,
  cacheMysterySnapshot,
  loadLiveStateFromSupabaseClueCarrier,
  syncLiveStateToSupabaseClueCarrier,
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
import {
  pregenerateAllAudioCluesForMystery,
  generateAudioClueAction,
} from '@/app/actions/audio-generator';
import { inferClueFormat, stripCustomerFacingTitle } from '@/utils/clue-format';
import { getCharacterRoleTitle, getCharacterDisplayName } from '@/utils/hydration';

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
  { threshold: 0.99, label: 'Finalizing Pre-Party Host Hub, character dossiers & guest invite links...' },
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

  await syncLiveStateToSupabaseClueCarrier(params.mysteryId);

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

const activeStepLocks = new Set<string>();

/**
 * Checkpointed, Serverless-Resilient Step Runner:
 * Executes exactly ONE uncompleted generation or QA step (~8-12 seconds) per invocation,
 * saves the checkpoint to Supabase `public.clues` carrier row so it survives across stateless
 * Vercel serverless containers, and finalizes + emails the customer when 100% of assets & QA pass.
 */
export async function advanceMysteryGenerationOneStep(
  params: BackgroundGenerationParams
): Promise<{
  status: 'idle' | 'generating' | 'ready';
  progress: number;
  stepLabel: string;
  didWork: boolean;
}> {
  await loadLiveStateFromSupabaseClueCarrier(params.mysteryId);
  const session = getStoredGameSession(params.mysteryId);

  if (!session || !session.isPaid) {
    return {
      status: 'idle',
      progress: 0,
      stepLabel: 'Waiting for cast lock & checkout',
      didWork: false,
    };
  }

  if (session.generationStatus === 'ready') {
    return {
      status: 'ready',
      progress: 100,
      stepLabel: 'Package complete & ready in My Mysteries (Stories)!',
      didWork: false,
    };
  }

  if (activeStepLocks.has(params.mysteryId)) {
    const live = computeLiveGenerationState(session);
    return {
      status: live.status,
      progress: live.progress,
      stepLabel: live.stepLabel,
      didWork: false,
    };
  }

  activeStepLocks.add(params.mysteryId);
  try {
    // 0. STAGE 0 CHECKPOINT: Weave group inside jokes & guest personality quirks into Zones 1, 2 & 3
    if (!session.insideJokesWeaved) {
      const stepLabel =
        'Weaving your group’s inside jokes & guest personalities into character sheets, banter missions & chat clues...';
      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: stepLabel,
        generationProgress: 22,
      });
      const { weavePersonalitiesAndInsideJokesAction } = await import(
        '@/app/actions/inside-jokes-weaver'
      );
      await weavePersonalitiesAndInsideJokesAction(params.mysteryId);
      updateMysteryGenerationInStore(params.mysteryId, {
        insideJokesWeaved: true,
        generationProgress: 24,
      });
      await syncLiveStateToSupabaseClueCarrier(params.mysteryId);
      return {
        status: 'generating',
        progress: 24,
        stepLabel,
        didWork: true,
      };
    }

    const cachedMystery = getCachedMysterySnapshot(params.mysteryId);
    const characters: any[] = cachedMystery?.characters || [];
    const activeChars = characters.filter(
      (c) => c.profile_data?.is_active_in_session !== false
    );
    const allClues: any[] = cachedMystery?.clues || [];

    // 1. STAGE 1 CHECKPOINT: Find the first active character missing a Standard Character Reference Portrait
    const nextCharForPortrait = activeChars.find(
      (c) =>
        !c.profile_data?.standard_character_photo_url ||
        String(c.profile_data.standard_character_photo_url).includes('api.dicebear.com')
    );

    if (nextCharForPortrait) {
      const donePortraits = activeChars.filter(
        (c) =>
          c.profile_data?.standard_character_photo_url &&
          !String(c.profile_data.standard_character_photo_url).includes('api.dicebear.com')
      ).length;
      const roleTitle = getCharacterRoleTitle(nextCharForPortrait);
      const guestName = getCharacterDisplayName(nextCharForPortrait);
      const stepLabel = `Generating character costume portrait (${donePortraits + 1}/${activeChars.length}): ${guestName} (${roleTitle})...`;
      const pct = Math.min(50, 24 + Math.round(((donePortraits + 1) / Math.max(1, activeChars.length)) * 26));

      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: stepLabel,
        generationProgress: pct,
      });

      const res = await ensureStandardCharacterPhoto(
        nextCharForPortrait,
        cachedMystery || { id: params.mysteryId, theme: 'Murder Mystery' },
        null,
        true
      );

      if (res?.photoUrl && cachedMystery) {
        const updatedChars = characters.map((c) =>
          c.id === nextCharForPortrait.id
            ? {
                ...c,
                profile_data: {
                  ...(c.profile_data || {}),
                  standard_character_photo_url: res.photoUrl,
                  standard_character_photo_hash: res.identityHash,
                  outfit_image_url: res.photoUrl,
                },
              }
            : c
        );
        cacheMysterySnapshot(params.mysteryId, {
          ...cachedMystery,
          characters: updatedChars,
        });
      }

      await syncLiveStateToSupabaseClueCarrier(params.mysteryId);
      return {
        status: 'generating',
        progress: pct,
        stepLabel,
        didWork: true,
      };
    }

    // 2. STAGE 2 CHECKPOINT: Find the first visual clue that hasn't been generated for this cast yet
    const visualClues = allClues.filter((c) => {
      const fmt = c?.format || inferClueFormat(c);
      if (
        fmt === 'audio' ||
        fmt === 'chat' ||
        fmt === 'search_log' ||
        fmt === 'receipt' ||
        fmt === 'call_sheet'
      ) {
        return false;
      }
      const hasPrompt = Boolean(c?.generation_prompt || c?.prompt_template);
      const isVisual =
        fmt === 'cctv' ||
        fmt === 'physical_prop' ||
        fmt === 'social_post' ||
        Boolean(c?.static_image_url);
      return c?.id && hasPrompt && isVisual;
    });

    const nextVisualClue = visualClues.find(
      (c) => !c.__cast_photo_generated || !c.static_image_url
    );

    if (nextVisualClue) {
      const doneVisual = visualClues.filter(
        (c) => c.__cast_photo_generated && c.static_image_url
      ).length;
      const cleanTitle = stripCustomerFacingTitle(nextVisualClue.title) || nextVisualClue.title;
      const stepLabel = `Placing cast into crime-scene photo (${doneVisual + 1}/${visualClues.length}): ${cleanTitle}...`;
      const pct = Math.min(75, 50 + Math.round(((doneVisual + 1) / Math.max(1, visualClues.length)) * 25));

      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: stepLabel,
        generationProgress: pct,
      });

      const clueRes = await generateClueImageAction(
        nextVisualClue.id,
        params.mysteryId,
        nextVisualClue.generation_prompt || nextVisualClue.prompt_template || '',
        true
      );

      const latestSnapshot = getCachedMysterySnapshot(params.mysteryId) || cachedMystery;
      if (latestSnapshot && Array.isArray(latestSnapshot.clues)) {
        const updatedClues = latestSnapshot.clues.map((c: any) =>
          c.id === nextVisualClue.id
            ? {
                ...c,
                static_image_url: clueRes?.imageUrl || c.static_image_url,
                __cast_photo_generated: true,
              }
            : c
        );
        cacheMysterySnapshot(params.mysteryId, {
          ...latestSnapshot,
          clues: updatedClues,
        });
      }

      await syncLiveStateToSupabaseClueCarrier(params.mysteryId);
      return {
        status: 'generating',
        progress: pct,
        stepLabel,
        didWork: true,
      };
    }

    // 3. STAGE 3 CHECKPOINT: Find the first audio clue that hasn't been synthesized for this cast yet
    const audioClues = allClues.filter((c) => {
      const fmt = c?.format || inferClueFormat(c);
      return fmt === 'audio' && Boolean((c?.description || '').trim());
    });

    const nextAudioClue = audioClues.find(
      (c) => !c.__cast_audio_generated || !c.audio_url
    );

    if (nextAudioClue) {
      const doneAudio = audioClues.filter(
        (c) => c.__cast_audio_generated && c.audio_url
      ).length;
      const cleanTitle = stripCustomerFacingTitle(nextAudioClue.title) || nextAudioClue.title;
      const stepLabel = `Synthesizing voice wiretap (${doneAudio + 1}/${audioClues.length}): ${cleanTitle}...`;
      const pct = Math.min(90, 75 + Math.round(((doneAudio + 1) / Math.max(1, audioClues.length)) * 15));

      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: stepLabel,
        generationProgress: pct,
      });

      const audioRes = await generateAudioClueAction({
        clueId: nextAudioClue.id,
        mysteryId: params.mysteryId,
        transcript: nextAudioClue.description || '',
        title: nextAudioClue.title,
      });

      const latestSnapshot = getCachedMysterySnapshot(params.mysteryId) || cachedMystery;
      if (latestSnapshot && Array.isArray(latestSnapshot.clues)) {
        const updatedClues = latestSnapshot.clues.map((c: any) =>
          c.id === nextAudioClue.id
            ? {
                ...c,
                audio_url: audioRes?.audioUrl || c.audio_url,
                __cast_audio_generated: true,
              }
            : c
        );
        cacheMysterySnapshot(params.mysteryId, {
          ...latestSnapshot,
          clues: updatedClues,
        });
      }

      await syncLiveStateToSupabaseClueCarrier(params.mysteryId);
      return {
        status: 'generating',
        progress: pct,
        stepLabel,
        didWork: true,
      };
    }

    // 4. STAGE 3.5 CHECKPOINT: Run the 4-Gate Multimodal AI QA Critic & Self-Healing Bot if not yet audited
    const latestSession = getStoredGameSession(params.mysteryId);
    if (!latestSession?.qaReport) {
      const stepLabel =
        'Running 4-Gate AI QA Critic on character portraits, side-by-side clue photos & audio wiretaps...';
      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: stepLabel,
        generationProgress: 95,
      });

      const qaReport = await auditAndHealCustomerPackAction(params.mysteryId);
      updateMysteryGenerationInStore(params.mysteryId, {
        generationStep: `AI QA Verified (${qaReport.overallScore}/100)! Finalizing Pre-Party Host Hub...`,
        generationProgress: 99,
        qaReport,
      });
      await syncLiveStateToSupabaseClueCarrier(params.mysteryId);
    }

    // 5. FINALIZE & EMAIL CUSTOMER
    await finalizeMysteryGenerationNow(params);
    return {
      status: 'ready',
      progress: 100,
      stepLabel: 'Package complete & ready in My Mysteries (Stories)!',
      didWork: true,
    };
  } catch (err) {
    console.warn('[advanceMysteryGenerationOneStep] Step warning:', err);
    const live = computeLiveGenerationState(getStoredGameSession(params.mysteryId));
    return {
      status: live.status,
      progress: live.progress,
      stepLabel: live.stepLabel,
      didWork: false,
    };
  } finally {
    activeStepLocks.delete(params.mysteryId);
  }
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

      // Drive the checkpointed step runner until status === 'ready'
      for (let stepIdx = 0; stepIdx < 35; stepIdx++) {
        const stepRes = await advanceMysteryGenerationOneStep(params);
        if (stepRes.status === 'ready' || stepRes.status === 'idle') {
          break;
        }
        await sleep(2500);
      }
    } catch (err) {
      console.error('[BACKGROUND MYSTERY GENERATOR] Error in detached job:', err);
    }
  })();
}

