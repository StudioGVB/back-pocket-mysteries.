import type {
  ArchitectComplexity,
  MysteryBlueprintInput,
  SuggestedClueCandidate,
  SuggestedRedHerringSubplot,
} from '@/app/actions/base-architect';

export interface DifficultyFactorBreakdown {
  id: string;
  name: string;
  pointsLabel: string;
  detail: string;
}

export interface DifficultyRecommendationResult {
  recommendedTier: ArchitectComplexity;
  score: number;
  badgeText: string;
  headlineReason: string;
  factors: DifficultyFactorBreakdown[];
  adjustmentTip: string;
}

/**
 * Evaluates a mystery's Plot Blueprint, Approved Core Clues, and Approved Red-Herring Subplots
 * across our 5-Factor Complexity Rubric to automatically recommend Easy, Medium, or Hard.
 */
export function recommendDifficultyFromPlotAndClues(params: {
  blueprint: MysteryBlueprintInput;
  coreClues?: SuggestedClueCandidate[];
  subplots?: SuggestedRedHerringSubplot[];
}): DifficultyRecommendationResult {
  const { blueprint, coreClues = [], subplots = [] } = params;

  const approvedCore = coreClues.filter((c) => c.decision === 'yes');
  const approvedSubplots = subplots.filter((s) => s.decision === 'yes');
  const approvedDecoyClues = approvedSubplots.flatMap((s) => s.decoyClues || []);
  const allApprovedClues = [...approvedCore, ...approvedDecoyClues];

  // 1. Factor 1: Conspiracy Structure (Lone Killer vs. Killer + Accomplice)
  const explicitAssistants = blueprint.characters.filter(
    (c) => c.plotRole === 'assistant'
  ).length;
  const plotMentionsAccomplice =
    /\b(accomplice|assistant|co-conspirator|partner in crime|helped tamper|two-person conspiracy|secretly helped)\b/i.test(
      `${blueprint.killerHowAndWhySummary} ${blueprint.murderWeaponAndMethod}`
    );
  const effectiveAssistantCount =
    explicitAssistants > 0 ? explicitAssistants : plotMentionsAccomplice ? 1 : 0;

  const factor1Pts =
    effectiveAssistantCount >= 2
      ? 2.4
      : effectiveAssistantCount === 1
        ? 1.8
        : 0.0;

  // 2. Factor 2: Red-Herring Subplot Entanglement
  // If user hasn't reached Step 3 yet, estimate from how many innocent characters have detailed motives/secrets & plot twists
  let effectiveSubplotsCount = approvedSubplots.length;
  let isEstimatedSubplots = false;
  if (subplots.length === 0) {
    isEstimatedSubplots = true;
    const innocentsWithDetailedSecrets = blueprint.characters.filter(
      (c) =>
        c.plotRole === 'innocent' &&
        c.motiveOrSecret.trim().length > 25 &&
        !/victim found dead/i.test(c.motiveOrSecret)
    ).length;
    if (effectiveAssistantCount >= 1 || innocentsWithDetailedSecrets >= 4) {
      effectiveSubplotsCount = 3;
    } else if (innocentsWithDetailedSecrets >= 2 || blueprint.beats.length >= 4) {
      effectiveSubplotsCount = 2;
    } else {
      effectiveSubplotsCount = 1;
    }
  }
  const factor2Pts = Math.min(2.7, effectiveSubplotsCount * 0.9);

  // 3. Factor 3: Timeline Micro-Window Timestamp Precision
  const allTextsForTimestamps = [
    blueprint.murderTimeWindow,
    blueprint.murderWeaponAndMethod,
    blueprint.killerHowAndWhySummary,
    ...blueprint.beats.map((b) => `${b.timeWindow} ${b.description}`),
    ...allApprovedClues.map((c) => `${c.timestampLabel} ${c.description}`),
  ].join(' ');

  const distinctTimestamps = new Set(
    (
      allTextsForTimestamps.match(/\b(1[0-2]|0?[1-9]):[0-5]\d\s*(?:AM|PM)\b/gi) || []
    ).map((t) => t.toUpperCase().replace(/\s+/g, ' '))
  );
  const tsCount = Math.max(distinctTimestamps.size, blueprint.beats.length);
  const factor3Pts = tsCount >= 6 ? 1.1 : tsCount >= 4 ? 0.75 : 0.4;

  // 4. Factor 4: Murder Method & Round 1 Misdirection Complexity
  const methodText = `${blueprint.murderWeaponAndMethod} ${blueprint.killerHowAndWhySummary}`;
  const isMultiStageMethod =
    /\b(staged|alibi|tamper|delayed|timer|blackout|switched|decoy|framed|locked room|poison.*strike|clock)\b/i.test(
      methodText
    ) || methodText.trim().length > 140;
  const factor4Pts = isMultiStageMethod ? 0.85 : 0.45;

  // 5. Factor 5: Forensic Clue Synthesis Load
  let totalClueCount = allApprovedClues.length;
  let r3ClueCount = allApprovedClues.filter((c) => c.roundNumber === 3).length;
  let isEstimatedClues = false;

  if (coreClues.length === 0) {
    isEstimatedClues = true;
    totalClueCount =
      effectiveAssistantCount >= 1
        ? 17
        : effectiveSubplotsCount >= 2 || isMultiStageMethod
          ? 13
          : 9;
    r3ClueCount = effectiveAssistantCount >= 1 ? 5 : effectiveSubplotsCount >= 2 ? 4 : 3;
  }

  const factor5Pts =
    Math.min(1.7, (totalClueCount / 16) * 1.45) + (r3ClueCount >= 4 ? 0.65 : 0.3);

  // Base 2.2 + 5 factors
  let rawScore = 2.2 + factor1Pts + factor2Pts + factor3Pts + factor4Pts + factor5Pts;

  // Enforce rubric guardrails:
  // - If 0 accomplices and <= 2 subplots and <= 15 clues, cap at 7.7 (Medium max)
  // - If >= 1 accomplice, floor at 8.1 (Hard)
  if (effectiveAssistantCount >= 1) {
    rawScore = Math.max(8.1, Math.min(9.7, rawScore));
  } else if (effectiveSubplotsCount <= 1 && totalClueCount <= 11) {
    rawScore = Math.min(5.1, Math.max(3.4, rawScore));
  } else if (effectiveAssistantCount === 0 && effectiveSubplotsCount < 3 && totalClueCount < 17) {
    rawScore = Math.min(7.7, Math.max(5.5, rawScore));
  } else {
    rawScore = Math.min(9.5, Math.max(3.5, rawScore));
  }

  const score = Number(rawScore.toFixed(1));
  const recommendedTier: ArchitectComplexity =
    score >= 8.0 ? 'hard' : score >= 5.3 ? 'medium' : 'easy';

  const factors: DifficultyFactorBreakdown[] = [
    {
      id: 'conspiracy',
      name: '1. Conspiracy Structure',
      pointsLabel: `+${factor1Pts.toFixed(1)} pts`,
      detail:
        effectiveAssistantCount >= 1
          ? `1 Killer + ${effectiveAssistantCount} Secret Accomplice(s) detected`
          : 'Lone-Wolf Killer (0 Accomplices)',
    },
    {
      id: 'red_herrings',
      name: '2. Red-Herring Entanglement',
      pointsLabel: `+${factor2Pts.toFixed(1)} pts`,
      detail: isEstimatedSubplots
        ? `~${effectiveSubplotsCount} projected decoy subplot(s) from cast secrets`
        : `${approvedSubplots.length} approved subplot(s) (${approvedDecoyClues.length} decoy clues)`,
    },
    {
      id: 'timestamps',
      name: '3. Timeline Micro-Windows',
      pointsLabel: `+${factor3Pts.toFixed(1)} pts`,
      detail: `${tsCount} distinct clock timestamps across beats & clues`,
    },
    {
      id: 'misdirection',
      name: '4. Method & Alibi Layering',
      pointsLabel: `+${factor4Pts.toFixed(1)} pts`,
      detail: isMultiStageMethod
        ? 'Multi-stage murder method / alibi manipulation'
        : 'Direct murder method & motive chain',
    },
    {
      id: 'forensic_load',
      name: '5. Forensic Synthesis Load',
      pointsLabel: `+${factor5Pts.toFixed(1)} pts`,
      detail: isEstimatedClues
        ? `~${totalClueCount} projected clues across Rounds 1–3`
        : `${totalClueCount} total approved clues (${approvedCore.length} core + ${approvedDecoyClues.length} decoy, ${r3ClueCount} in R3)`,
    },
  ];

  let headlineReason = '';
  let adjustmentTip = '';

  if (recommendedTier === 'hard') {
    headlineReason =
      effectiveAssistantCount >= 1
        ? `Recommended HARD (${score}/10) because your plot includes a 2-Person Conspiracy (Killer + Secret Accomplice) alongside ${totalClueCount} interlocking clues.`
        : `Recommended HARD (${score}/10) due to high forensic density (${totalClueCount} clues & ${effectiveSubplotsCount} entangled red-herring subplots).`;
    adjustmentTip =
      'Want Medium instead? Switch the Secret Accomplice to an Innocent Suspect and keep 2 Red-Herring Subplots.';
  } else if (recommendedTier === 'medium') {
    headlineReason = `Recommended MEDIUM (${score}/10) — Lone-Wolf Killer with ${
      isEstimatedSubplots ? `~${effectiveSubplotsCount}` : approvedSubplots.length
    } entangled Red-Herring Subplots and multi-timestamp alibi cross-referencing.`;
    adjustmentTip =
      'Want Hard? Assign 1 character as a Secret Accomplice (Assistant) or approve a 3rd Red-Herring Subplot. Want Easy? Keep only 1 Red-Herring Subplot and ~5 Core Clues.';
  } else {
    headlineReason = `Recommended EASY (${score}/10) — Clean Lone-Wolf Killer trail with ${
      isEstimatedSubplots ? '1 focused red herring' : `${approvedSubplots.length} red-herring subplot`
    } and ${totalClueCount} total clues (great for first-time groups).`;
    adjustmentTip =
      'Want Medium? Approve a 2nd Red-Herring Subplot and 7–8 Core Clues. Want Hard? Add a Secret Accomplice.';
  }

  return {
    recommendedTier,
    score,
    badgeText: `${recommendedTier.toUpperCase()} (${score}/10)`,
    headlineReason,
    factors,
    adjustmentTip,
  };
}
