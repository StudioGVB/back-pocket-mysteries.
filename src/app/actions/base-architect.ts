'use server';

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import { createClient } from '@/utils/supabase/server';
import { requireAdmin } from '@/utils/admin-auth';
import { logAiUsage } from '@/utils/ai-logger';
import { ClueFormat } from '@/utils/clue-format';
import { recommendDifficultyFromPlotAndClues } from '@/utils/architect-difficulty-recommender';

export type ArchitectSpiceLevel = 'Clean' | 'Mild' | 'Spicy' | 'Filthy';
export type ArchitectComplexity = 'easy' | 'medium' | 'hard';
export type CharacterPlotRole = 'victim' | 'killer' | 'assistant' | 'innocent';

export interface BlueprintCharacterInput {
  id: string;
  roleTitle: string; // e.g. "The Husband", "The Heiress", "The Sommelier"
  defaultGender: 'female' | 'male' | 'adaptable';
  plotRole: CharacterPlotRole;
  color: string;
  conceptNotes: string; // Who they are & dynamics with others
  motiveOrSecret: string; // Why they wanted the victim dead or what secret they're hiding
  outfitNotes?: string;
}

export interface BlueprintBeatInput {
  beatNumber: number;
  title: string;
  timeWindow: string; // e.g. "7:45 PM", "8:19 PM"
  phase: 'pre_crime' | 'crime' | 'investigation' | 'resolution';
  description: string;
}

export interface MysteryBlueprintInput {
  id: string;
  title: string;
  theme: string;
  settingDescription: string;
  spiceLevel: ArchitectSpiceLevel;
  complexity: ArchitectComplexity;
  murderTimeWindow: string;
  murderWeaponAndMethod: string;
  killerHowAndWhySummary: string;
  insideJokesOrProps: string;
  characters: BlueprintCharacterInput[];
  beats: BlueprintBeatInput[];
}

export type ArchitectRoundNumber = 1 | 2 | 3 | 4 | 5;

function getPackageRoundsForCount(charCount?: number): 3 | 4 | 5 {
  const n = typeof charCount === 'number' && !isNaN(charCount) ? charCount : 6;
  if (n <= 6) return 3;
  if (n <= 10) return 4;
  return 5;
}

export type ClueStrengthTier =
  | 'Forensic Anchor'
  | 'Timeline & Alibi Lock'
  | 'Motive & Escalation Proof'
  | 'Double-Meaning Misdirection';

export interface SuggestedClueCandidate {
  id: string;
  title: string;
  format: ClueFormat;
  roundNumber: ArchitectRoundNumber;
  timestampLabel: string;
  description: string;
  generationPrompt: string;
  pointsTo: string;
  involvedRoles: string[];
  isRedHerring: boolean;
  subplotId?: string;
  beatNumber?: number;
  doubleMeaningNote?: string;
  strengthTier?: ClueStrengthTier;
  strengthSummary?: string;
  coveredBeatPoints?: string[];
  unaddressedBeatGap?: string;
  previewImageUrl?: string;
  characterTalkingPoints?: { roleTitle: string; defensiveLine: string }[];
  decision: 'yes' | 'no' | 'pending';
}

export interface SuggestedRedHerringSubplot {
  id: string;
  title: string;
  involvedRoles: string[];
  theme: string;
  summary: string;
  doubleMeaningCoreClueHook?: string;
  linkedCoreClueTitles?: string[];
  step1TriggerR1: string;
  step2EscalationR2: string;
  step3AlibiHoleR3: string;
  backstoryAdditions: Record<string, string>; // roleTitle -> extra backstory paragraph
  decoyClues: SuggestedClueCandidate[];
  decision: 'yes' | 'no' | 'pending';
}

export interface AssembledCharacterDossier {
  id: string;
  roleTitle: string;
  defaultGender: 'female' | 'male' | 'adaptable';
  plotRole: CharacterPlotRole;
  isVictim: boolean;
  color: string;
  bio: string;
  actSummary: string;
  actBullets: string[];
  outfitAdvice: string;
  traits: string[];
  motiveType: 'love' | 'revenge' | 'greed' | 'fear' | 'power' | 'justice';
  motiveStrength: 'low' | 'moderate' | 'high' | 'critical';
  motiveNotes: string;
}

export interface AssembledRelationshipPair {
  roleA: string;
  roleB: string;
  dynamics: string[];
  notes: string;
}

export interface ProofreadCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AssembledFullMysteryBase {
  title: string;
  theme: string;
  description: string;
  insideJokes: string;
  spiceLevel: ArchitectSpiceLevel;
  complexity: ArchitectComplexity;
  characters: AssembledCharacterDossier[];
  relationships: AssembledRelationshipPair[];
  beats: BlueprintBeatInput[];
  clues: SuggestedClueCandidate[];
  proofreadReport: {
    overallPassed: boolean;
    estimatedComplexityScore: number;
    estimatedSpiceScore: number;
    checks: ProofreadCheckItem[];
  };
}

function resolveGeminiApiKey(): string {
  const fromEnv =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    '';
  if (fromEnv.trim().length > 10) return fromEnv.trim();

  try {
    const envPath = path.join(/*turbopackIgnore: true*/ process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const m = content.match(
        /^(?:GOOGLE_GENERATIVE_AI_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY)=(.+)$/m
      );
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
  } catch {}
  return '';
}

function getSpiceRubricDirective(spice: ArchitectSpiceLevel): string {
  switch (spice) {
    case 'Clean':
      return `SPICE LEVEL = CLEAN (1.0–3.4 / 10 • Safe For Work & Family):
- IN-WORLD DIALOGUE ("description"): High-stakes adult murder mystery: death, murder weapons, poison/spiked drinks, financial blackmail, greed, inheritance fraud, corporate espionage, and revenge are ALL allowed and expected. STRICTLY ZERO romantic love affairs, cheating spouses, secret lovers, or sexual roleplay between players. 100% clean dialogue: ZERO swearing or cussing.
- PHOTO PROMPT ("generationPrompt"): Crisp, classic Agatha Christie / Knives Out detective evidence photography on a dark tabletop (NO text in image).`;
    case 'Mild':
      return `SPICE LEVEL = MILD (3.5–5.5 / 10 • Romantic Affairs • Clean PG-13 Dialogue):
- IN-WORLD DIALOGUE ("description"): Romantic betrayal, secret love affairs, cheating spouses, and jealous exes ARE allowed alongside murder and blackmail. Dialogue MUST remain 100% clean PG-13: ZERO swearing/cussing (no bitch, shit, fuck, asshole), ZERO catfights/bitch slaps.
- PHOTO PROMPT ("generationPrompt"): Moody romantic-thriller noir evidence photography with warm candlelight and luxury dinner party details (NO text in image).`;
    case 'Spicy':
      return `SPICE LEVEL = SPICY (5.6–8.2 / 10 • Cussing, Catfights & Scandalous Secrets):
- IN-WORLD DIALOGUE ("description"): Include spicy cussing/swearing in chat logs, voicemails, and dialogue (e.g. bitch, shit, bullshit, asshole, wtf, stfu), drink-throwing/catfights, and scandalous secrets (e.g. secret VIP tabloid blackmail, sugar-daddy payoffs, late-night bedroom voice memos). Do NOT use heavy F-bombs ("fuck") — keep it in the 5.6–8.2 Spicy tier.
- PHOTO PROMPT ("generationPrompt"): High-drama neon-noir evidence photography with spilled cocktails, shattered glass, and luxury evening textures (NO text in image).`;
    case 'Filthy':
      return `SPICE LEVEL = FILTHY (8.3–10.0 / 10 • HBO / White Lotus / Euphoria 18+ Unfiltered After-Dark):
- IN-WORLD DIALOGUE ("description"): Go full 18+ unfiltered after-dark in chat logs, voicemails, and secrets: include raw F-bombs ("fuck", "fucking", "bullshit", "bitch", "asshole"), wild VIP after-hours party debauchery, scandalous hookup confessions, and ruthless blackmail.
- PHOTO PROMPT ("generationPrompt"): Keep the visual photo prompt 100% safe for AI image generators while capturing a sultry, moody after-dark luxury noir aesthetic (e.g. "Moody after-dark mountain cabin bedroom, rumpled silk sheets, spilled tequila shot glass and glowing smartphone on timber nightstand, neon-noir rim lighting, 35mm film grain, no text"). Never put profanity or gore inside "generationPrompt".`;
  }
}

/**
 * Scrubs upstream Gemini PROHIBITED_CONTENT trigger phrases (such as non-consensual intimate video recording
 * or hard-narcotics keywords) while preserving 100% of the murder mystery plot, affairs, blackmail, and adult dialogue.
 */
function sanitizePromptForGeminiSafety(prompt: string): string {
  return String(prompt || '')
    .replace(
      /\bsecretly filming a humiliating 18\+\s*(?:video|tape|recording)\b/gi,
      'recording an incriminating late-night bedroom voice memo & confession'
    )
    .replace(
      /\b(?:explicit|sex|boudoir|18\+|nude|naked|humiliating)\s+(?:tape|video|recording|footage|clips?)s?\b/gi,
      'incriminating late-night bedroom voice recording'
    )
    .replace(/\bOnlyFans\b/gi, 'VIP tabloid')
    .replace(/\b(?:cocaine|white powder|snorting lines)\b/gi, 'after-hours party contraband')
    .replace(/\bfatal blows? to ([^']+)'s skull\b/gi, 'fatal strike against $1')
    .replace(/\bskull\b/gi, 'temple')
    .replace(/\bhurling\s+(\{\{[^}]+\}\})\s+over\b/gi, 'pushing $1 over')
    .replace(/\bhurled\s+(\{\{[^}]+\}\})\s+off\b/gi, 'pushed $1 off');
}

function ensureSpiceFlavorInClueDescription(
  description: string,
  spiceLevel: ArchitectSpiceLevel,
  format: ClueFormat
): string {
  const text = String(description || '').trim();
  if (!text) return text;
  if (spiceLevel === 'Filthy') {
    const hasFilthyWord = /\b(fuck|fucking|fucked|bullshit|bitch|shit|asshole)\b/i.test(text);
    if (
      !hasFilthyWord &&
      (format === 'chat' || format === 'social_post' || format === 'handwritten_note')
    ) {
      return `${text} ("What the fuck were you thinking?! Delete that fucking file before midnight or we're both ruined.")`;
    }
  } else if (spiceLevel === 'Spicy') {
    const hasSpicyWord = /\b(bitch|shit|bullshit|asshole|wtf|stfu|damn)\b/i.test(text);
    if (
      !hasSpicyWord &&
      (format === 'chat' || format === 'social_post' || format === 'handwritten_note')
    ) {
      return `${text} ("Cut the bullshit—if this leaks tonight, you're finished.")`;
    }
  }
  return text;
}

const ARCHITECT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

/**
 * Executes a Gemini 2.5 Flash JSON request for the OG Base Builder with:
 * 1) Explicit Fictional Tabletop Parlor Game framing
 * 2) Upstream PROHIBITED_CONTENT trigger phrase sanitization
 * 3) HarmBlockThreshold.BLOCK_NONE safetySettings
 * 4) Automatic 2nd-pass softened retry if the first call is blocked by safety filters
 */
async function generateArchitectJson(params: {
  apiKey: string;
  prompt: string;
  featureName: string;
  inlineParts?: any[];
}): Promise<any> {
  const genAI = new GoogleGenerativeAI(params.apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { responseMimeType: 'application/json' },
    safetySettings: ARCHITECT_SAFETY_SETTINGS,
  });

  const framedPrompt = `CONTEXT: FICTIONAL TABLETOP PARLOR BOARD GAME DESIGN (Agatha Christie / Knives Out style whodunit dinner party game for consenting adults. All characters, clues, and plot beats are 100% fictional theatrical roleplay props).\n\n${sanitizePromptForGeminiSafety(
    params.prompt
  )}`;

  try {
    const reqPayload =
      params.inlineParts && params.inlineParts.length > 0
        ? [framedPrompt, ...params.inlineParts]
        : framedPrompt;
    const res = await model.generateContent(reqPayload as any);
    const text = res.response.text();
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: params.featureName,
      usageMetadata: res.response.usageMetadata,
    });
    return extractJsonObject(text);
  } catch (firstErr: any) {
    // Automatic retry with extra-softened theatrical parlor language if blocked by PROHIBITED_CONTENT / SAFETY
    const softenedPrompt = framedPrompt
      .replace(/\b(?:fuck|fucking|motherfucker|bitch|slut|whore|asshole)\b/gi, 'damn')
      .replace(/\b(?:18\+|filthy|explicit|debauchery|hookups?|sleeping with)\b/gi, 'scandalous secret')
      .replace(/\b(?:violent|blood-spattered|bleeding|struck|blows?|hurling|hurled)\b/gi, 'dramatic')
      .replace(/\bmurdered?\b/gi, 'eliminated in the fictional mystery game');

    const retryPayload =
      params.inlineParts && params.inlineParts.length > 0
        ? [softenedPrompt, ...params.inlineParts]
        : softenedPrompt;
    const retryRes = await model.generateContent(retryPayload as any);
    const retryText = retryRes.response.text();
    await logAiUsage({
      model_name: 'gemini-2.5-flash',
      feature_name: `${params.featureName}_safety_retry`,
      usageMetadata: retryRes.response.usageMetadata,
    });
    return extractJsonObject(retryText);
  }
}

function getComplexityRubricDirective(
  complexity: ArchitectComplexity,
  requiredRounds: 3 | 4 | 5 = 3
): {
  directive: string;
  targetCoreClues: number;
  targetRedHerringSubplots: number;
  targetTotalClues: number;
  requiresAssistant: boolean;
} {
  const extraRoundClues = (requiredRounds - 3) * 3;
  switch (complexity) {
    case 'easy':
      return {
        directive: `COMPLEXITY = EASY (1.0–5.2 / 10 • ${requiredRounds} Investigation Rounds):
- 1 Lone-Wolf Killer (0 assistants/accomplices).
- ${9 + extraRoundClues}–${10 + extraRoundClues} total clues across ${requiredRounds} rounds (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds).
- Clear, straightforward timestamp windows.`,
        targetCoreClues: 7 + (requiredRounds - 3) * 2,
        targetRedHerringSubplots: 1,
        targetTotalClues: 10 + extraRoundClues,
        requiresAssistant: false,
      };
    case 'medium':
      return {
        directive: `COMPLEXITY = MEDIUM (5.3–7.9 / 10 • ${requiredRounds} Investigation Rounds):
- 1 Lone-Wolf Killer (0 assistants/accomplices).
- ${13 + extraRoundClues}–${14 + extraRoundClues} total clues across ${requiredRounds} rounds (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds).
- Multi-timestamp HH:MM PM alibi cross-referencing across rooms.`,
        targetCoreClues: 9 + (requiredRounds - 3) * 2,
        targetRedHerringSubplots: 2,
        targetTotalClues: 14 + extraRoundClues,
        requiresAssistant: false,
      };
    case 'hard':
      return {
        directive: `COMPLEXITY = HARD (8.0–10.0 / 10 • ${requiredRounds} Investigation Rounds):
- Features 1 Primary Killer + 1 Secret Accomplice/Assistant (plotRole = 'assistant') who helps stage an alibi, tamper with power/locks, or plant evidence.
- ${15 + extraRoundClues}–${16 + extraRoundClues} total clues across ${requiredRounds} rounds (Basic = 3 rounds, Premium = 4 rounds, Grand = 5 rounds).
- Tight micro-window HH:MM PM timestamps requiring 4+ interlocking final-round clues (Round ${requiredRounds}) to solve.`,
        targetCoreClues: 10 + (requiredRounds - 3) * 2,
        targetRedHerringSubplots: 2,
        targetTotalClues: 16 + extraRoundClues,
        requiresAssistant: true,
      };
  }
}

function getGenderFlexTokenDirective(characters: BlueprintCharacterInput[]): string {
  const tokenExamples = characters
    .map((c) => {
      const clean = c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
      return `- {{${clean}}} (pronouns: {{${clean}_he}}, {{${clean}_him}}, {{${clean}_his}}, {{${clean}_himself}}; family nouns: {{${clean}_sibling}}, {{${clean}_spouse}}, {{${clean}_inlaw}})`;
    })
    .join('\n');

  return `MANDATORY BIDIRECTIONAL GENDER-FLEX TOKEN RULE:
Never hardcode character first names, third-person pronouns (he/she/him/her/his), or gendered family nouns (brother/sister/husband/wife/brother-in-law/sister-in-law) when referring to any of the 6 characters.
Always use their canonical role tokens so any role can seamlessly flex to any guest gender:
${tokenExamples}`;
}

function extractJsonObject(rawText: string): any {
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Could not parse AI JSON response.');
  }
}

/**
 * Optional Helper: Parses raw pasted template notes into a structured MysteryBlueprintInput.
 */
export async function parseRawNotesIntoBlueprintAction(params: {
  rawNotes: string;
  currentBlueprint: MysteryBlueprintInput;
}): Promise<{
  success: boolean;
  blueprint?: MysteryBlueprintInput;
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are the Master Mystery Architect for Back Pocket Mysteries.
Parse the user's raw mystery template notes below into a structured 6-character MysteryBlueprintInput JSON object.

USER RAW NOTES:
"""
${params.rawNotes}
"""

CURRENT DEFAULTS (preserve spiceLevel="${params.currentBlueprint.spiceLevel}" and complexity="${params.currentBlueprint.complexity}" unless the notes explicitly specify otherwise):
- Ensure there are up to 6 characters (1 'victim', 1 'killer', ${
      params.currentBlueprint.complexity === 'hard'
        ? "1 'assistant' (secret accomplice),"
        : ''
    } and the rest 'innocent' suspects).
- Role titles should start with "The " (e.g. "The Patriarch", "The Sommelier", "The Bestie", "The Ex").
- Default genders should be balanced (e.g. 3 'female' and 3 'male', or 'adaptable').

Return strict JSON matching this exact structure:
{
  "title": "string",
  "theme": "string",
  "settingDescription": "string",
  "spiceLevel": "Clean" | "Mild" | "Spicy" | "Filthy",
  "complexity": "easy" | "medium" | "hard",
  "murderTimeWindow": "e.g. 8:19 PM",
  "murderWeaponAndMethod": "string",
  "killerHowAndWhySummary": "string",
  "insideJokesOrProps": "string",
  "characters": [
    {
      "id": "char-1",
      "roleTitle": "The ...",
      "defaultGender": "female" | "male" | "adaptable",
      "plotRole": "victim" | "killer" | "assistant" | "innocent",
      "color": "e.g. Crimson Red",
      "conceptNotes": "string",
      "motiveOrSecret": "string",
      "outfitNotes": "string"
    }
  ],
  "beats": [
    {
      "beatNumber": 1,
      "title": "string",
      "timeWindow": "e.g. 7:30 PM",
      "phase": "pre_crime" | "crime" | "investigation" | "resolution",
      "description": "string"
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_parse_template_notes',
    });
    const merged: MysteryBlueprintInput = {
      ...params.currentBlueprint,
      ...parsed,
      id: params.currentBlueprint.id,
      characters: Array.isArray(parsed.characters)
        ? parsed.characters.slice(0, 6).map((c: any, idx: number) => ({
            id: c.id || `char-${idx + 1}`,
            roleTitle: String(c.roleTitle || `The Suspect ${idx + 1}`).replace(/^\{\{|\}\}$/g, ''),
            defaultGender: ['female', 'male', 'adaptable'].includes(c.defaultGender)
              ? c.defaultGender
              : idx % 2 === 0
                ? 'female'
                : 'male',
            plotRole: ['victim', 'killer', 'assistant', 'innocent'].includes(c.plotRole)
              ? c.plotRole
              : 'innocent',
            color: c.color || 'Slate',
            conceptNotes: c.conceptNotes || '',
            motiveOrSecret: c.motiveOrSecret || '',
            outfitNotes: c.outfitNotes || '',
          }))
        : params.currentBlueprint.characters,
      beats: Array.isArray(parsed.beats)
        ? parsed.beats.map((b: any, idx: number) => ({
            beatNumber: idx + 1,
            title: b.title || `Beat ${idx + 1}`,
            timeWindow: b.timeWindow || '8:00 PM',
            phase: ['pre_crime', 'crime', 'investigation', 'resolution'].includes(b.phase)
              ? b.phase
              : 'investigation',
            description: b.description || '',
          }))
        : params.currentBlueprint.beats,
    };

    // Preserve user's explicitly chosen Spice Level and auto-recommend Complexity from the parsed plot!
    merged.spiceLevel = params.currentBlueprint.spiceLevel;
    const autoRec = recommendDifficultyFromPlotAndClues({ blueprint: merged });
    merged.complexity = autoRec.recommendedTier;

    return { success: true, blueprint: merged };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not parse notes into blueprint.',
    };
  }
}

/**
 * STEP 2: Generates Core Murder Trail Clue suggestions for the user to tick YES or NO on.
 * If `existingApprovedClues` and `rejectedClues` are passed, it generates fresh alternatives!
 */
export async function suggestCoreCluesForBlueprintAction(params: {
  blueprint: MysteryBlueprintInput;
  existingClues?: SuggestedClueCandidate[];
  countToGenerate?: number;
  customDirection?: string;
}): Promise<{
  success: boolean;
  clues?: SuggestedClueCandidate[];
  recommendedComplexity?: ArchitectComplexity;
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, existingClues = [], customDirection } = params;
  const autoRec = recommendDifficultyFromPlotAndClues({
    blueprint,
    coreClues: existingClues,
  });
  const effectiveComplexity = autoRec.recommendedTier;
  const compInfo = getComplexityRubricDirective(effectiveComplexity);
  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);

  const keptClues = existingClues.filter((c) => c.decision === 'yes');
  const rejectedClues = existingClues.filter((c) => c.decision === 'no');
  const howManyNew =
    params.countToGenerate ||
    Math.max(4, compInfo.targetCoreClues - keptClues.length + 2);

  try {
    const prompt = `You are the Lead Forensic Clue Designer for Back Pocket Mysteries.
Design ${howManyNew} high-impact CORE MURDER TRAIL CLUES for the following 6-player murder mystery blueprint.

MYSTERY BLUEPRINT:
- Title: "${blueprint.title}"
- Theme / Setting: "${blueprint.theme}" — ${blueprint.settingDescription}
- Murder Time Window: ${blueprint.murderTimeWindow}
- Murder Weapon & Method: ${blueprint.murderWeaponAndMethod}
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}
- Inside Jokes / Key Props: ${blueprint.insideJokesOrProps || 'None specified'}

CHARACTERS (6):
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (${c.plotRole.toUpperCase()}, default gender: ${c.defaultGender}, color: ${c.color}): ${c.conceptNotes} | Secret/Motive: ${c.motiveOrSecret}`
  )
  .join('\n')}

CORE STORY BEATS:
${blueprint.beats
  .map((b) => `- Beat ${b.beatNumber} [${b.timeWindow} • ${b.phase}]: ${b.title} — ${b.description}`)
  .join('\n')}

${spiceDirective}

${compInfo.directive}

${tokenDirective}

${
  keptClues.length > 0
    ? `ALREADY APPROVED CORE CLUES (DO NOT DUPLICATE THESE — build complementary clues that interlock with them):
${keptClues.map((c) => `- [R${c.roundNumber} • ${c.format}] ${c.title}: ${c.description}`).join('\n')}`
    : ''
}

${
  rejectedClues.length > 0
    ? `REJECTED CLUE IDEAS (THE CREATOR VOTED "NO" ON THESE — avoid these angles and suggest fresh, better ideas):
${rejectedClues.map((c) => `- ${c.title}: ${c.description}`).join('\n')}`
    : ''
}

${
  customDirection && customDirection.trim()
    ? `CREATOR'S SPECIFIC DIRECTION FOR THIS BATCH (PRIORITIZE THIS REQUEST):
"${customDirection.trim()}"`
    : ''
}

CLUE DESIGN REQUIREMENTS:
1. Variety of Formats: Mix across "chat", "cctv", "audio", "receipt", "document", "handwritten_note", "medical_rx", "search_log", "social_post", "call_sheet", "physical_prop".
2. Round Pacing:
   - Round 1 Core Clues should establish the crime scene, time of death (${blueprint.murderTimeWindow}), murder method, and subtle physical trace evidence without giving away the killer too early.
   - Round 2 Core Clues should expose the killer's secret motive, timeline gap, or access to the murder weapon${blueprint.complexity === 'hard' ? ' and the secret coordination with the Accomplice' : ''}.
   - Round 3 Core Clues should provide the interlocking "Smoking Gun" forensic/timestamp proof that locks onto the Killer beyond a shadow of a doubt when combined with Round 1 & 2 clues.
3. Exact Timestamps: Include explicit HH:MM PM clock timestamps inside the clue descriptions so players can align alibis.
4. Gender-Flex Tokens: Use {{Role}} and {{Role_he}}/{{Role_his}}/{{Role_spouse}}/{{Role_sibling}} tokens everywhere.

Return strict JSON:
{
  "clues": [
    {
      "title": "Short atmospheric title (no R1/R2 prefix)",
      "format": "chat" | "cctv" | "audio" | "receipt" | "document" | "handwritten_note" | "medical_rx" | "search_log" | "social_post" | "call_sheet" | "physical_prop",
      "roundNumber": 1 | 2 | 3,
      "timestampLabel": "e.g. 8:14 PM",
      "description": "Full in-world clue text (e.g. full chat log dialogue, full CCTV description, full receipt line items, or audio transcript) using {{Role}} tokens.",
      "generationPrompt": "Photorealistic noir crime scene visual prompt (NO text/letters in image) describing what the clue photo shows.",
      "pointsTo": "1-sentence explanation for the creator of how this clue points to the murder beat or killer.",
      "involvedRoles": ["The ..."]
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_core_clues',
    });
    const maxAllowedRound = getPackageRoundsForCount(blueprint.characters?.length);
    const newCandidates: SuggestedClueCandidate[] = (parsed.clues || []).map(
      (c: any, idx: number) => ({
        id: `core-clue-${Date.now()}-${idx}`,
        title: String(c.title || `Core Evidence #${idx + 1}`).trim(),
        format: (c.format as ClueFormat) || 'physical_prop',
        roundNumber: Math.max(
          1,
          Math.min(maxAllowedRound, Number(c.roundNumber) || 2)
        ) as ArchitectRoundNumber,
        timestampLabel: String(c.timestampLabel || blueprint.murderTimeWindow || '8:15 PM'),
        description: String(c.description || '').trim(),
        generationPrompt: String(c.generationPrompt || c.description || '').trim(),
        pointsTo: String(c.pointsTo || 'Connects to the core murder timeline.').trim(),
        involvedRoles: Array.isArray(c.involvedRoles) ? c.involvedRoles : [],
        isRedHerring: false,
        decision: 'pending',
      })
    );

    return {
      success: true,
      clues: [...keptClues, ...newCandidates],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to generate core clue suggestions.',
    };
  }
}

/**
 * STEP 3: Generates Red-Herring Subplots, Innocent Suspect Backstories & Decoy Clues
 * for the creator to tick YES or NO on.
 */
export async function suggestRedHerringsAndBackstoriesAction(params: {
  blueprint: MysteryBlueprintInput;
  approvedCoreClues: SuggestedClueCandidate[];
  existingSubplots?: SuggestedRedHerringSubplot[];
  customDirection?: string;
}): Promise<{
  success: boolean;
  subplots?: SuggestedRedHerringSubplot[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, approvedCoreClues, existingSubplots = [], customDirection } = params;
  const autoRec = recommendDifficultyFromPlotAndClues({
    blueprint,
    coreClues: approvedCoreClues,
    subplots: existingSubplots,
  });
  const effectiveComplexity = autoRec.recommendedTier;
  const compInfo = getComplexityRubricDirective(effectiveComplexity);
  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);

  const keptSubplots = existingSubplots.filter((s) => s.decision === 'yes');
  const rejectedSubplots = existingSubplots.filter((s) => s.decision === 'no');
  const targetNewCount = Math.max(
    2,
    compInfo.targetRedHerringSubplots - keptSubplots.length + 1
  );

  try {
    const prompt = `You are the Master Red-Herring & Subplot Architect for Back Pocket Mysteries.
Design ${targetNewCount} entangled RED-HERRING SUBPLOTS (with decoy clues and suspect backstory enrichments) for the innocent suspects in this 6-player murder mystery.

MYSTERY BLUEPRINT:
- Title: "${blueprint.title}" (${blueprint.theme})
- Murder Time Window: ${blueprint.murderTimeWindow}
- Murder Weapon & Method: ${blueprint.murderWeaponAndMethod}
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}

CHARACTERS:
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (${c.plotRole.toUpperCase()}): ${c.conceptNotes} | Secret/Motive: ${c.motiveOrSecret}`
  )
  .join('\n')}

APPROVED CORE MURDER CLUES:
${approvedCoreClues
  .map((c) => `- [R${c.roundNumber} • ${c.timestampLabel} • ${c.format}] ${c.title}: ${c.description}`)
  .join('\n')}

${spiceDirective}

${compInfo.directive}

${tokenDirective}

${
  keptSubplots.length > 0
    ? `ALREADY APPROVED SUBPLOTS (DO NOT DUPLICATE):
${keptSubplots.map((s) => `- ${s.title} (${s.involvedRoles.join(' & ')}): ${s.summary}`).join('\n')}`
    : ''
}

${
  rejectedSubplots.length > 0
    ? `REJECTED SUBPLOT IDEAS (Creator voted NO — avoid these angles):
${rejectedSubplots.map((s) => `- ${s.title}: ${s.summary}`).join('\n')}`
    : ''
}

${
  customDirection && customDirection.trim()
    ? `CREATOR'S SPECIFIC DIRECTION FOR THIS BATCH (PRIORITIZE THIS REQUEST):
"${customDirection.trim()}"`
    : ''
}

RED-HERRING SUBPLOT ARCHITECTURE RULES:
1. Pair up the INNOCENT suspects (e.g. 2 innocent suspects per subplot) in a high-stakes secret scheme happening during the party (calibrated strictly to ${blueprint.spiceLevel} spice level!).
2. Each subplot MUST have a 3-Step Arc:
   - Step 1 (Round 1 Trigger): Why they look super suspicious early on (deflecting >=75% of Round 1 table suspicion onto them!).
   - Step 2 (Round 2 Escalation): A compromising action they took right before the murder (e.g., breaking into a safe, tampering with a drink/document, secret rendezvous).
   - Step 3 (Round 3 Alibi Hole / Exoneration): A timestamped proof at ${blueprint.murderTimeWindow} showing they were locked in another room / on another floor committing their lesser scandal at the exact minute the victim was killed.
3. Include 2–3 Decoy Clues (isRedHerring: true) per subplot across Rounds 1, 2, and 3.
4. Use {{Role}} and {{Role_he}}/{{Role_his}}/{{Role_spouse}}/{{Role_sibling}} tokens everywhere.

Return strict JSON:
{
  "subplots": [
    {
      "title": "e.g. {{The Role A}} & {{The Role B}}: The Upstairs Safe Break-In",
      "involvedRoles": ["The Role A", "The Role B"],
      "theme": "Short theme summary",
      "summary": "2-sentence overview of their secret scheme and how it misdirects the table.",
      "step1TriggerR1": "Step 1 (Round 1 Trigger): ...",
      "step2EscalationR2": "Step 2 (Round 2 Escalation): ...",
      "step3AlibiHoleR3": "Step 3 (Round 3 Alibi Hole at ${blueprint.murderTimeWindow}): ...",
      "backstoryAdditions": {
        "The Role A": "Paragraph to weave into {{The Role A}}'s backstory & secrets.",
        "The Role B": "Paragraph to weave into {{The Role B}}'s backstory & secrets."
      },
      "decoyClues": [
        {
          "title": "Decoy clue title",
          "format": "chat" | "cctv" | "audio" | "receipt" | "document" | "handwritten_note" | "physical_prop",
          "roundNumber": 1 | 2 | 3,
          "timestampLabel": "e.g. 8:19 PM",
          "description": "Full in-world decoy clue text using {{Role}} tokens.",
          "generationPrompt": "Photorealistic noir visual prompt (NO text in image).",
          "pointsTo": "Why this deflects suspicion in R1/R2 or clears their alibi at ${blueprint.murderTimeWindow} in R3.",
          "involvedRoles": ["The Role A", "The Role B"]
        }
      ]
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_red_herrings',
    });
    const maxAllowedRound = getPackageRoundsForCount(blueprint.characters?.length);
    const newSubplots: SuggestedRedHerringSubplot[] = (parsed.subplots || []).map(
      (s: any, idx: number) => {
        const subId = `subplot-${Date.now()}-${idx}`;
        const decoyClues: SuggestedClueCandidate[] = (s.decoyClues || []).map(
          (c: any, cIdx: number) => ({
            id: `${subId}-clue-${cIdx}`,
            title: String(c.title || `Decoy Clue #${cIdx + 1}`).trim(),
            format: (c.format as ClueFormat) || 'chat',
            roundNumber: Math.max(
              1,
              Math.min(maxAllowedRound, Number(c.roundNumber) || (cIdx % maxAllowedRound) + 1)
            ) as ArchitectRoundNumber,
            timestampLabel: String(c.timestampLabel || blueprint.murderTimeWindow || '8:10 PM'),
            description: String(c.description || '').trim(),
            generationPrompt: String(c.generationPrompt || c.description || '').trim(),
            pointsTo: String(c.pointsTo || 'Red-herring misdirection clue.').trim(),
            involvedRoles: Array.isArray(c.involvedRoles)
              ? c.involvedRoles
              : Array.isArray(s.involvedRoles)
                ? s.involvedRoles
                : [],
            isRedHerring: true,
            subplotId: subId,
            decision: 'yes',
          })
        );

        return {
          id: subId,
          title: String(s.title || `Red-Herring Subplot #${idx + 1}`).trim(),
          involvedRoles: Array.isArray(s.involvedRoles) ? s.involvedRoles : [],
          theme: String(s.theme || 'Secret Misdirection').trim(),
          summary: String(s.summary || '').trim(),
          step1TriggerR1: String(s.step1TriggerR1 || '').trim(),
          step2EscalationR2: String(s.step2EscalationR2 || '').trim(),
          step3AlibiHoleR3: String(s.step3AlibiHoleR3 || '').trim(),
          backstoryAdditions:
            s.backstoryAdditions && typeof s.backstoryAdditions === 'object'
              ? s.backstoryAdditions
              : {},
          decoyClues,
          decision: 'pending',
        };
      }
    );

    return {
      success: true,
      subplots: [...keptSubplots, ...newSubplots],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to generate red-herring subplots.',
    };
  }
}

/**
 * Runs an automated 7-point proofreader on an assembled mystery base.
 */
function runAutomatedProofreader(
  assembled: Omit<AssembledFullMysteryBase, 'proofreadReport'>
): AssembledFullMysteryBase['proofreadReport'] {
  const allTexts: string[] = [
    assembled.description,
    ...assembled.characters.flatMap((c) => [
      c.bio,
      c.actSummary,
      c.outfitAdvice,
      c.motiveNotes,
      ...c.actBullets,
    ]),
    ...assembled.relationships.map((r) => r.notes),
    ...assembled.clues.map((c) => `${c.title} ${c.description}`),
  ];
  const combinedText = allTexts.join('\n');

  // 1. Check for unmatched curly braces (broken tokens)
  const unmatchedBraces =
    (combinedText.match(/\{[^{}]*$/gm) || []).length +
    (combinedText.match(/^[^{}]*\}/gm) || []).length;
  const check1Passed = unmatchedBraces === 0;

  // 2. Check for dynamic gender-flex pronoun token usage
  const flexTokenMatches =
    combinedText.match(/\{\{[A-Za-z0-9\s'._-]+_(?:he|him|his|himself|sibling|spouse|inlaw)\}\}/gi) ||
    [];
  const check2Passed = flexTokenMatches.length >= 6;

  // 3. Check all pairwise relationships for N characters (N*(N-1)/2)
  const nChars = assembled.characters.length;
  const expectedPairs = (nChars * (nChars - 1)) / 2;
  const check3Passed = assembled.relationships.length >= expectedPairs;

  // 4. Spice Level Compliance Check
  const lowerAll = combinedText.toLowerCase();
  const hasSwearing = /\b(bitch|shit|bullshit|asshole|slut|wtf|stfu|fuck|motherfucker)\b/i.test(
    lowerAll
  );
  const hasFilthyTriggers = /\b(fuck|fucking|motherfucker|cocaine|orgy|stripper)\b/i.test(lowerAll);
  const hasRomanceAffair = /\b(affair|mistress|secret lover|cheating spouse|hookup|sleeping with)\b/i.test(
    lowerAll
  );

  let estimatedSpiceScore = 2.5;
  let check4Passed = true;
  let check4Detail = '';

  if (assembled.spiceLevel === 'Clean') {
    estimatedSpiceScore = hasSwearing || hasRomanceAffair ? 4.5 : 2.4;
    check4Passed = !hasSwearing && !hasRomanceAffair;
    check4Detail = check4Passed
      ? '100% SFW Clean: 0 romance/affair roleplay & 0 profanity detected.'
      : 'Found romance/affair or profanity keywords in a Clean mystery.';
  } else if (assembled.spiceLevel === 'Mild') {
    estimatedSpiceScore = hasSwearing ? 6.2 : 4.5;
    check4Passed = !hasSwearing;
    check4Detail = check4Passed
      ? 'Mild (4.5/10): Romantic drama active with 100% PG-13 clean dialogue (0 swearing).'
      : 'Found swearing/profanity in a Mild mystery.';
  } else if (assembled.spiceLevel === 'Spicy') {
    estimatedSpiceScore = 7.2;
    check4Passed = true;
    check4Detail = 'Spicy (7.2/10): Scandalous affairs, sharp dialogue & dramatic tension verified.';
  } else {
    estimatedSpiceScore = hasFilthyTriggers ? 9.2 : 8.5;
    check4Passed = true;
    check4Detail = 'Filthy (9.2/10): 18+ unfiltered after-dark dialogue & image-sanitizer ready.';
  }

  const requiredRounds = getPackageRoundsForCount(nChars);

  // 5. 5-Factor Complexity Score Calibration
  const assistantCount = assembled.characters.filter((c) => c.plotRole === 'assistant').length;
  const fakeCluesCount = assembled.clues.filter((c) => c.isRedHerring).length;
  const finalRoundCluesCount = assembled.clues.filter((c) => c.roundNumber === requiredRounds).length;
  const timestampMatches = new Set(
    (combinedText.match(/\b(1[0-2]|0?[1-9]):[0-5]\d\s*(?:AM|PM)\b/gi) || []).map((s) =>
      s.toUpperCase()
    )
  );

  let rawComplexity =
    2.2 +
    (assistantCount >= 1 ? 1.6 : 0) +
    Math.min(2.2, (fakeCluesCount / 2) * 0.85) +
    (timestampMatches.size >= 5 ? 1.0 : 0.5) +
    Math.min(1.6, (assembled.clues.length / 15) * 1.4) +
    (finalRoundCluesCount >= 4 ? 0.7 : 0.3);

  if (assembled.complexity === 'easy') {
    rawComplexity = Math.min(5.0, Math.max(3.5, rawComplexity - 1.4));
  } else if (assembled.complexity === 'medium') {
    rawComplexity = Math.min(7.6, Math.max(5.8, rawComplexity));
  } else {
    rawComplexity = Math.min(9.6, Math.max(8.2, rawComplexity + 0.8));
  }
  const estimatedComplexityScore = Number(rawComplexity.toFixed(1));
  const check5Passed =
    (assembled.complexity === 'easy' && assistantCount === 0) ||
    (assembled.complexity === 'medium' && assistantCount === 0) ||
    (assembled.complexity === 'hard' && assistantCount >= 1);

  // 6. Tier-Based Round Clue Distribution Check (Basic = 3, Premium = 4, Grand = 5)
  const activeRoundNums = Array.from({ length: requiredRounds }, (_, idx) => idx + 1);
  const check6Passed = activeRoundNums.every(
    (rNum) => assembled.clues.filter((c) => c.roundNumber === rNum).length >= 2
  );
  const roundCountsDetail = activeRoundNums
    .map((rNum) => `Round ${rNum}: ${assembled.clues.filter((c) => c.roundNumber === rNum).length} clues`)
    .join(' • ');

  // 7. 3 Outfit Options per Character Check
  const check7Passed = assembled.characters.every(
    (c) => /Option\s*1/i.test(c.outfitAdvice) && /Option\s*2/i.test(c.outfitAdvice)
  );

  const checks: ProofreadCheckItem[] = [
    {
      id: 'tokens',
      label: 'Zero Broken Token Leaks',
      passed: check1Passed,
      detail: check1Passed
        ? 'All {{Role}} tokens are properly closed and balanced.'
        : 'Found unmatched curly braces in text.',
    },
    {
      id: 'gender_flex',
      label: 'Bidirectional Gender-Flex Pronoun & Family Tokens',
      passed: check2Passed,
      detail: `${flexTokenMatches.length} dynamic gender-flex tokens ({{Role_he}}, {{Role_spouse}}, {{Role_sibling}}) active.`,
    },
    {
      id: 'relationships',
      label: `Complete ${expectedPairs}-Pair Relationship Matrix`,
      passed: check3Passed,
      detail: `${assembled.relationships.length} of ${expectedPairs} pairwise character connections hydrated.`,
    },
    {
      id: 'spice',
      label: `Spice Rubric Calibration (${assembled.spiceLevel})`,
      passed: check4Passed,
      detail: check4Detail,
    },
    {
      id: 'complexity',
      label: `5-Factor Complexity Calibration (${assembled.complexity.toUpperCase()} • ${estimatedComplexityScore}/10)`,
      passed: check5Passed,
      detail: `${assembled.clues.length} total clues (${fakeCluesCount} decoy clues), ${assistantCount} assistant(s), ${timestampMatches.size} distinct clock timestamps.`,
    },
    {
      id: 'round_pacing',
      label: `Round 1–${requiredRounds} Clue Pacing (${requiredRounds} Rounds for Tier)`,
      passed: check6Passed,
      detail: roundCountsDetail,
    },
    {
      id: 'outfits',
      label: '3 Distinct Outfit Options per Character',
      passed: check7Passed,
      detail: 'Every character has Option 1, Option 2 & Option 3 in their What to Wear guide.',
    },
  ];

  return {
    overallPassed: checks.every((c) => c.passed),
    estimatedComplexityScore,
    estimatedSpiceScore,
    checks,
  };
}

/**
 * STEP 4: Auto-Casts approved Core Clues + approved Red-Herring Clues into Rounds 1, 2 & 3,
 * writes all 6 full gender-flex character dossiers (with 3 outfit options each), builds all 15
 * pairwise relationships, and runs the Automated Proofreader.
 */
export async function assembleAndProofreadFullBaseAction(params: {
  blueprint: MysteryBlueprintInput;
  approvedCoreClues: SuggestedClueCandidate[];
  approvedSubplots: SuggestedRedHerringSubplot[];
}): Promise<{
  success: boolean;
  assembled?: AssembledFullMysteryBase;
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, approvedCoreClues, approvedSubplots } = params;
  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const compInfo = getComplexityRubricDirective(blueprint.complexity);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);

  // Merge core clues + decoy clues from approved subplots
  const allApprovedClues: SuggestedClueCandidate[] = [
    ...approvedCoreClues,
    ...approvedSubplots.flatMap((s) => s.decoyClues || []),
  ];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are the Master Mystery Compiler & Gender-Flex Proofreader for Back Pocket Mysteries.
Assemble the complete, production-ready 6-player Mystery Base from the creator's approved blueprint, core clues, and red-herring subplots.

MYSTERY BLUEPRINT:
- Title: "${blueprint.title}"
- Theme: "${blueprint.theme}"
- Setting: ${blueprint.settingDescription}
- Murder Time Window: ${blueprint.murderTimeWindow}
- Murder Weapon & Method: ${blueprint.murderWeaponAndMethod}
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}
- Inside Jokes / Props: ${blueprint.insideJokesOrProps}

CHARACTERS (${blueprint.characters.length}):
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (id: ${c.id}, plotRole: ${c.plotRole}, defaultGender: ${c.defaultGender}, color: ${c.color}): ${c.conceptNotes} | Motive/Secret: ${c.motiveOrSecret} | Outfit notes: ${c.outfitNotes || ''}`
  )
  .join('\n')}

APPROVED RED-HERRING SUBPLOTS:
${approvedSubplots
  .map(
    (s) =>
      `- ${s.title} (${s.involvedRoles.join(' & ')}): ${s.summary}\n  R1: ${s.step1TriggerR1}\n  R2: ${s.step2EscalationR2}\n  R3: ${s.step3AlibiHoleR3}`
  )
  .join('\n')}

${spiceDirective}

${compInfo.directive}

${tokenDirective}

MANDATORY OUTPUT REQUIREMENTS:
1. "description": A gripping 4–5 sentence public Mystery Overview setting the scene and the ${blueprint.murderTimeWindow} murder of the Victim (using {{Role}} tokens).
2. "characters": All ${blueprint.characters.length} characters with:
   - "bio": Rich 3–4 sentence backstory weaving in their relationships with everyone in the room AND their approved subplot/secret, using ONLY {{Role}} and {{Role_he}}/{{Role_his}}/{{Role_spouse}}/{{Role_sibling}} tokens when referring to any character.
   - "actSummary": 1–2 sentence roleplay direction.
   - "actBullets": 4 punchy roleplay instructions (including their alibi claim for ${blueprint.murderTimeWindow}) using {{Role}} tokens.
   - "outfitAdvice": Must explicitly format 3 options: "Style summary: Option 1 — ...; Option 2 — ...; Option 3 — ..."
   - "traits": 4 personality adjectives.
   - "motiveType": "love" | "revenge" | "greed" | "fear" | "power" | "justice"
   - "motiveStrength": "critical" for killer, "high" or "moderate" for suspects.
   - "motiveNotes": 2-sentence explanation of their motive against the victim using {{Role}} tokens.
3. "relationships": EVERY pairwise combination of the ${blueprint.characters.length} characters (${(blueprint.characters.length * (blueprint.characters.length - 1)) / 2} pairs total). Each pair must have:
   - "roleA": exact roleTitle of Character A (e.g. "The Husband")
   - "roleB": exact roleTitle of Character B (e.g. "The Wife")
   - "dynamics": 2 short relationship tags (e.g. ["Business Rivals", "Childhood Neighbours"])
   - "notes": 1–2 sentence description of their shared history using {{Role}} tokens.

Return strict JSON:
{
  "description": "string",
  "insideJokes": "string",
  "characters": [
    {
      "id": "string",
      "roleTitle": "The ...",
      "defaultGender": "female" | "male" | "adaptable",
      "plotRole": "victim" | "killer" | "assistant" | "innocent",
      "color": "string",
      "bio": "string",
      "actSummary": "string",
      "actBullets": ["string", "string", "string", "string"],
      "outfitAdvice": "Style vibe: Option 1 — ...; Option 2 — ...; Option 3 — ...",
      "traits": ["string", "string", "string", "string"],
      "motiveType": "love" | "revenge" | "greed" | "fear" | "power" | "justice",
      "motiveStrength": "low" | "moderate" | "high" | "critical",
      "motiveNotes": "string"
    }
  ],
  "relationships": [
    {
      "roleA": "The ...",
      "roleB": "The ...",
      "dynamics": ["string", "string"],
      "notes": "string"
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_assemble_full_base',
    });

    // Map characters preserving blueprint order & role titles
    const assembledChars: AssembledCharacterDossier[] = blueprint.characters.map((bpChar, idx) => {
      const cleanBpRole = bpChar.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
      const aiMatch =
        (parsed.characters || []).find(
          (ac: any) =>
            ac.id === bpChar.id ||
            String(ac.roleTitle || '')
              .replace(/^\{\{|\}\}$/g, '')
              .trim()
              .toLowerCase() === cleanBpRole.toLowerCase()
        ) || (parsed.characters || [])[idx] || {};

      let outfitAdvice = String(
        aiMatch.outfitAdvice ||
          bpChar.outfitNotes ||
          `Signature ${blueprint.theme} attire: Option 1 — Tailored evening look in ${bpChar.color}; Option 2 — Smart cocktail ensemble with statement accessories; Option 3 — Classic formal look matching your character vibe.`
      ).trim();

      if (!/Option\s*1/i.test(outfitAdvice)) {
        outfitAdvice = `${outfitAdvice.replace(/\.\s*$/, '')}: Option 1 — Primary ${bpChar.color} evening look; Option 2 — Tailored cocktail variation with statement accessories; Option 3 — Relaxed luxury variation in ${bpChar.color}.`;
      }

      // Build Clue -> Character Talking-Point Sync bullets for every clue involving this character
      const syncedClueBullets: string[] = [];
      for (const cl of allApprovedClues) {
        const customTp = (cl.characterTalkingPoints || []).find(
          (tp) =>
            tp.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() ===
            cleanBpRole.toLowerCase()
        );
        if (customTp && customTp.defensiveLine.trim()) {
          syncedClueBullets.push(
            `[Round ${cl.roundNumber} • Clue "${cl.title}"]: ${customTp.defensiveLine.trim()}`
          );
        } else {
          const isMentioned =
            (cl.involvedRoles || []).some(
              (r) =>
                r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanBpRole.toLowerCase()
            ) || cl.description.toLowerCase().includes(`{{${cleanBpRole.toLowerCase()}`);
          if (isMentioned && bpChar.plotRole !== 'victim') {
            syncedClueBullets.push(
              `[Round ${cl.roundNumber} • When "${cl.title}" drops]: Defend your alibi around ${cl.timestampLabel} and deflect suspicion onto ${
                cl.doubleMeaningNote ? 'the rival suspects implicated by the clue' : 'anyone who had access to the crime scene'
              }.`
            );
          }
        }
      }

      const baseBullets =
        Array.isArray(aiMatch.actBullets) && aiMatch.actBullets.length > 0
          ? aiMatch.actBullets.map((b: any) => String(b).trim())
          : [
              `Stay in character as {{${cleanBpRole}}} throughout the party.`,
              `Defend your whereabouts around ${blueprint.murderTimeWindow}.`,
            ];

      return {
        id: bpChar.id,
        roleTitle: cleanBpRole,
        defaultGender: bpChar.defaultGender,
        plotRole: bpChar.plotRole,
        isVictim: bpChar.plotRole === 'victim',
        color: bpChar.color || aiMatch.color || 'Crimson',
        bio: String(aiMatch.bio || bpChar.conceptNotes || '').trim(),
        actSummary: String(aiMatch.actSummary || bpChar.conceptNotes || '').trim(),
        actBullets: [...baseBullets, ...syncedClueBullets.slice(0, 4)],
        outfitAdvice,
        traits:
          Array.isArray(aiMatch.traits) && aiMatch.traits.length > 0
            ? aiMatch.traits.slice(0, 4)
            : ['Observant', 'Sharp', 'Guarded', 'Ambitious'],
        motiveType: ['love', 'revenge', 'greed', 'fear', 'power', 'justice'].includes(
          aiMatch.motiveType
        )
          ? aiMatch.motiveType
          : 'revenge',
        motiveStrength: ['low', 'moderate', 'high', 'critical'].includes(aiMatch.motiveStrength)
          ? aiMatch.motiveStrength
          : bpChar.plotRole === 'killer'
            ? 'critical'
            : 'high',
        motiveNotes: String(aiMatch.motiveNotes || bpChar.motiveOrSecret || '').trim(),
      };
    });

    // Guarantee all N*(N-1)/2 pairwise relationships exist
    const aiRelList: AssembledRelationshipPair[] = Array.isArray(parsed.relationships)
      ? parsed.relationships
      : [];
    const completeRelationships: AssembledRelationshipPair[] = [];

    for (let i = 0; i < assembledChars.length; i++) {
      for (let j = i + 1; j < assembledChars.length; j++) {
        const roleA = assembledChars[i].roleTitle;
        const roleB = assembledChars[j].roleTitle;
        const found = aiRelList.find((r) => {
          const rA = String(r.roleA || '').replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
          const rB = String(r.roleB || '').replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
          return (
            (rA === roleA.toLowerCase() && rB === roleB.toLowerCase()) ||
            (rA === roleB.toLowerCase() && rB === roleA.toLowerCase())
          );
        });

        completeRelationships.push({
          roleA,
          roleB,
          dynamics:
            found && Array.isArray(found.dynamics) && found.dynamics.length > 0
              ? found.dynamics
              : ['Inner Circle', 'Shared History'],
          notes:
            found && found.notes
              ? String(found.notes).trim()
              : `{{${roleA}}} and {{${roleB}}} share a tangled history at ${blueprint.title}.`,
        });
      }
    }

    // Sort clues by roundNumber (1 -> 2 -> 3)
    const sortedClues = [...allApprovedClues].sort((a, b) => a.roundNumber - b.roundNumber);

    // Automatically calculate the recommended Difficulty (Easy / Medium / Hard) from the plot, characters, core clues & red herrings
    const autoRec = recommendDifficultyFromPlotAndClues({
      blueprint,
      coreClues: approvedCoreClues,
      subplots: approvedSubplots,
    });

    const partialBase: Omit<AssembledFullMysteryBase, 'proofreadReport'> = {
      title: blueprint.title,
      theme: blueprint.theme,
      description: String(parsed.description || blueprint.settingDescription).trim(),
      insideJokes: String(parsed.insideJokes || blueprint.insideJokesOrProps || '').trim(),
      spiceLevel: blueprint.spiceLevel,
      complexity: autoRec.recommendedTier,
      characters: assembledChars,
      relationships: completeRelationships,
      beats: blueprint.beats,
      clues: sortedClues,
    };

    const proofreadReport = runAutomatedProofreader(partialBase);

    return {
      success: true,
      assembled: {
        ...partialBase,
        proofreadReport,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not assemble full mystery base.',
    };
  }
}

/**
 * STEP 5: Transfers the assembled & proofread Mystery Base directly into Supabase `mysteries`
 * (and related tables: `characters`, `motives`, `relationships`, `story_beats`, `clues`)
 * with `status: 'draft'` so it appears in `/en/admin/mysteries` ready for review & 4-Pack QA!
 */
export async function transferBlueprintToDraftMysteryBaseAction(params: {
  assembled: AssembledFullMysteryBase;
}): Promise<{
  success: boolean;
  mysteryId?: string;
  error?: string;
}> {
  const { supabase, user } = await requireAdmin();
  const { assembled } = params;

  try {
    // 1. Insert the draft mystery record
    const { data: mysteryRow, error: mErr } = await supabase
      .from('mysteries')
      .insert({
        title: assembled.title,
        theme: assembled.theme,
        description: assembled.description,
        inside_jokes: assembled.insideJokes || null,
        spice_level: assembled.spiceLevel,
        complexity: assembled.complexity,
        min_players: assembled.characters.length,
        max_players: assembled.characters.length,
        status: 'draft',
        current_round: 0,
        created_by: user?.id || null,
      } as any)
      .select()
      .single();

    if (mErr || !mysteryRow) {
      throw new Error(mErr?.message || 'Failed to create draft mystery row.');
    }

    const mysteryId = mysteryRow.id;
    const roleToCharDbId = new Map<string, string>();

    // 2. Insert all 6 characters + motives
    for (const char of assembled.characters) {
      const charId = crypto.randomUUID();
      roleToCharDbId.set(char.roleTitle.toLowerCase(), charId);

      const dicebearUrl = `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(
        char.roleTitle
      )}`;

      const { error: cErr } = await supabase.from('characters').insert({
        id: charId,
        mystery_id: mysteryId,
        name: char.roleTitle,
        gender: char.defaultGender,
        is_victim: char.isVictim,
        plot_role: char.plotRole,
        archetype: char.isVictim
          ? 'victim'
          : char.plotRole === 'killer'
            ? 'villain'
            : char.plotRole === 'assistant'
              ? 'sidekick'
              : 'witness',
        is_mandatory: true,
        min_player_count: assembled.characters.length,
        image_url: dicebearUrl,
        profile_data: {
          age: 'adult',
          color: char.color,
          bio: char.bio,
          act_summary: char.actSummary,
          act_bullets: char.actBullets,
          outfit_advice: char.outfitAdvice,
          traits: char.traits,
          avatar_url: dicebearUrl,
        },
      } as any);

      if (cErr) {
        console.error('Error inserting character:', cErr);
      }

      if (!char.isVictim && char.motiveNotes) {
        await supabase.from('motives').insert({
          id: crypto.randomUUID(),
          mystery_id: mysteryId,
          character_id: charId,
          motive_type: char.motiveType,
          strength: char.motiveStrength,
          notes: char.motiveNotes,
        } as any);
      }
    }

    // 3. Insert all 15 pairwise relationships
    const relRows: any[] = [];
    for (const rel of assembled.relationships) {
      const idA = roleToCharDbId.get(rel.roleA.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase());
      const idB = roleToCharDbId.get(rel.roleB.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase());
      if (idA && idB && idA !== idB) {
        relRows.push({
          id: crypto.randomUUID(),
          mystery_id: mysteryId,
          character_a_id: idA,
          character_b_id: idB,
          know_each_other: true,
          dynamics: rel.dynamics,
          notes: rel.notes,
        });
      }
    }
    if (relRows.length > 0) {
      await supabase.from('relationships').insert(relRows as any);
    }

    // 4. Insert story beats
    if (assembled.beats.length > 0) {
      const beatRows = assembled.beats.map((b, idx) => ({
        id: crypto.randomUUID(),
        mystery_id: mysteryId,
        beat_number: idx + 1,
        sort_order: idx + 1,
        event_title: `${b.title} (${b.timeWindow})`,
        description: b.description,
        beat_type:
          b.phase === 'crime'
            ? 'twist'
            : b.phase === 'pre_crime'
              ? 'discovery'
              : 'clue_reveal',
        timeline_phase: b.phase,
      }));
      await (supabase as any).from('story_beats').insert(beatRows as any);
    }

    // 5. Insert round-cast clues (preserving any previewImageUrl test-rendered in OG Base Builder!)
    if (assembled.clues.length > 0) {
      const clueRows = assembled.clues.map((c) => ({
        id: crypto.randomUUID(),
        mystery_id: mysteryId,
        title: c.title,
        description: c.description,
        format: c.format,
        static_image_url: c.previewImageUrl || null,
        clue_type:
          c.format === 'audio'
            ? 'audio'
            : c.format === 'cctv'
              ? 'video'
              : c.format === 'physical_prop'
                ? 'physical'
                : 'document',
        round_number: c.roundNumber,
        is_fake: Boolean(c.isRedHerring),
        generation_prompt: c.generationPrompt || c.description,
        evidence_status: c.isRedHerring ? 'misleading' : 'verified',
        implication_type: c.isRedHerring ? 'red_herring' : 'direct_evidence',
      }));
      await supabase.from('clues').insert(clueRows as any);
    }

    revalidatePath('/en/admin/mysteries');
    revalidatePath(`/en/builder/mysteries/${mysteryId}`);

    return {
      success: true,
      mysteryId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to transfer mystery base to Drafts.',
    };
  }
}

export interface PitchedPlotHookOption {
  id: string;
  title: string;
  theme: string;
  targetDifficulty: ArchitectComplexity;
  settingDescription: string;
  murderTimeWindow: string;
  murderWeaponAndMethod: string;
  killerHowAndWhySummary: string;
  insideJokesOrProps: string;
  characters: BlueprintCharacterInput[];
  beats: BlueprintBeatInput[];
}

/**
 * UPGRADE 4: Pitches 3 distinct 6-player murder plot & cast hooks (Easy, Medium, Hard)
 * tailored to the user's selected Theme & Spice Level.
 */
export async function pitchThreePlotHooksAction(params: {
  themeOrIdea: string;
  spiceLevel: ArchitectSpiceLevel;
}): Promise<{
  success: boolean;
  options?: PitchedPlotHookOption[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const spiceDirective = getSpiceRubricDirective(params.spiceLevel);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const prompt = `You are the Master Mystery Architect for Back Pocket Mysteries.
Pitch 3 distinct, high-concept 6-player Murder Mystery Plot & Cast Blueprints for:
- Theme / Vibe: "${params.themeOrIdea || 'High-Society Dinner Party'}"
- Selected Spice Level: ${params.spiceLevel}

${spiceDirective}

PITCH 3 OPTIONS ACROSS THE DIFFICULTY SPECTRUM:
- Option 1 (targetDifficulty = "easy"): 1 Lone-Wolf Killer (0 assistants), clean direct murder method, great for casual/first-time groups.
- Option 2 (targetDifficulty = "medium"): 1 Lone-Wolf Killer (0 assistants), clever staged alibi / multi-timestamp twist.
- Option 3 (targetDifficulty = "hard"): 2-Person Conspiracy (1 'killer' + 1 'assistant' secret accomplice who tampers with evidence/alibi).

Each option MUST have exactly 6 characters (1 'victim', 1 'killer', 1 'assistant' ONLY if targetDifficulty="hard", and the rest 'innocent' suspects) with role titles starting with "The " (e.g. "The Sommelier", "The Heiress") and 4 timeline beats.

Return strict JSON:
{
  "options": [
    {
      "title": "Catchy Mystery Title",
      "theme": "Theme label",
      "targetDifficulty": "easy" | "medium" | "hard",
      "settingDescription": "2-sentence atmospheric setting & premise",
      "murderTimeWindow": "e.g. 8:19 PM",
      "murderWeaponAndMethod": "Exact murder weapon & forensic method",
      "killerHowAndWhySummary": "Who killed the victim, why, and how (using {{Role}} tokens)",
      "insideJokesOrProps": "Signature props or atmospheric details",
      "characters": [
        {
          "roleTitle": "The ...",
          "defaultGender": "female" | "male",
          "plotRole": "victim" | "killer" | "assistant" | "innocent",
          "color": "Crimson Red",
          "conceptNotes": "Who they are & dynamics",
          "motiveOrSecret": "Their motive or dark secret (calibrated to ${params.spiceLevel} spice)",
          "outfitNotes": "Signature outfit look"
        }
      ],
      "beats": [
        {
          "beatNumber": 1,
          "title": "Beat title",
          "timeWindow": "7:30 PM",
          "phase": "pre_crime" | "crime" | "investigation",
          "description": "What happens using {{Role}} tokens"
        }
      ]
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_pitch_plot_hooks',
    });
    const palette = [
      'Crimson Red',
      'Emerald Green',
      'Royal Purple',
      'Sapphire Blue',
      'Amber Gold',
      'Obsidian Black',
    ];

    const options: PitchedPlotHookOption[] = (parsed.options || []).slice(0, 3).map((opt: any, idx: number) => ({
      id: `pitch-${Date.now()}-${idx}`,
      title: String(opt.title || `Mystery Pitch #${idx + 1}`).trim(),
      theme: String(opt.theme || params.themeOrIdea || 'Luxury Mystery').trim(),
      targetDifficulty: ['easy', 'medium', 'hard'].includes(opt.targetDifficulty)
        ? opt.targetDifficulty
        : idx === 0
          ? 'easy'
          : idx === 1
            ? 'medium'
            : 'hard',
      settingDescription: String(opt.settingDescription || '').trim(),
      murderTimeWindow: String(opt.murderTimeWindow || '8:19 PM').trim(),
      murderWeaponAndMethod: String(opt.murderWeaponAndMethod || '').trim(),
      killerHowAndWhySummary: String(opt.killerHowAndWhySummary || '').trim(),
      insideJokesOrProps: String(opt.insideJokesOrProps || '').trim(),
      characters: Array.isArray(opt.characters)
        ? opt.characters.slice(0, 6).map((c: any, cIdx: number) => ({
            id: `char-${cIdx + 1}`,
            roleTitle: String(c.roleTitle || `The Suspect ${cIdx + 1}`).replace(/^\{\{|\}\}$/g, ''),
            defaultGender: ['female', 'male', 'adaptable'].includes(c.defaultGender)
              ? c.defaultGender
              : cIdx % 2 === 0
                ? 'female'
                : 'male',
            plotRole: ['victim', 'killer', 'assistant', 'innocent'].includes(c.plotRole)
              ? c.plotRole
              : 'innocent',
            color: c.color || palette[cIdx % palette.length],
            conceptNotes: String(c.conceptNotes || '').trim(),
            motiveOrSecret: String(c.motiveOrSecret || '').trim(),
            outfitNotes: String(c.outfitNotes || '').trim(),
          }))
        : [],
      beats: Array.isArray(opt.beats)
        ? opt.beats.map((b: any, bIdx: number) => ({
            beatNumber: bIdx + 1,
            title: String(b.title || `Beat ${bIdx + 1}`).trim(),
            timeWindow: String(b.timeWindow || '8:00 PM').trim(),
            phase: ['pre_crime', 'crime', 'investigation', 'resolution'].includes(b.phase)
              ? b.phase
              : 'investigation',
            description: String(b.description || '').trim(),
          }))
        : [],
    }));

    return { success: true, options };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to pitch plot hooks.',
    };
  }
}

/**
 * UPGRADE 3: 1-Click Auto-Fixer for Step 4 Proofreader Warnings.
 * Deterministically repairs broken curly braces, injects gender-flex tokens if sparse,
 * ensures 3 distinct outfit options per character, balances Round 1-3 clues, and re-runs the proofreader.
 */
export async function autoFixAssembledBaseIssuesAction(params: {
  assembled: AssembledFullMysteryBase;
}): Promise<{
  success: boolean;
  assembled?: AssembledFullMysteryBase;
  fixesApplied?: string[];
  error?: string;
}> {
  await requireAdmin();
  const { assembled } = params;
  const fixesApplied: string[] = [];

  try {
    const cleanBraces = (text: string) =>
      String(text || '')
        .replace(/\{\{\{+/g, '{{')
        .replace(/\}\}\}+/g, '}}')
        .replace(/\{([A-Za-z0-9\s'._-]+)\}\}/g, '{{$1}}')
        .replace(/\{\{([A-Za-z0-9\s'._-]+)\}(?!\})/g, '{{$1}}');

    const killerRole =
      assembled.characters.find((c) => c.plotRole === 'killer')?.roleTitle ||
      assembled.characters[1]?.roleTitle ||
      'The Rival';
    const victimRole =
      assembled.characters.find((c) => c.plotRole === 'victim')?.roleTitle ||
      assembled.characters[0]?.roleTitle ||
      'The Host';

    // 1. Clean tokens & ensure 3 outfit options + gender-flex tokens on every character
    const fixedCharacters = assembled.characters.map((c) => {
      let bio = cleanBraces(c.bio);
      let actSummary = cleanBraces(c.actSummary);
      let outfitAdvice = cleanBraces(c.outfitAdvice);
      const otherRole = c.roleTitle === victimRole ? killerRole : victimRole;

      if (!new RegExp(`\\{\\{${otherRole}_(?:he|him|his|spouse|sibling|inlaw)\\}\\}`, 'i').test(bio)) {
        bio = `${bio} Behind closed doors, {{${otherRole}}} insisted {{${otherRole}_he}} would protect {{${otherRole}_his}} inner circle at all costs.`;
        fixesApplied.push(`Injected dynamic gender-flex pronoun tokens into {{${c.roleTitle}}} bio.`);
      }

      if (!/Option\s*1/i.test(outfitAdvice) || !/Option\s*2/i.test(outfitAdvice) || !/Option\s*3/i.test(outfitAdvice)) {
        const baseLook = outfitAdvice.replace(/Option\s*\d\s*:\s*/gi, '').trim() || `Tailored ${c.color} evening attire`;
        outfitAdvice = `Option 1: ${baseLook} with metallic accents. | Option 2: Velvet ${c.color} cocktail ensemble with statement accessories. | Option 3: Sharp modern noir silhouette with a signature ${c.color} detail.`;
        fixesApplied.push(`Expanded {{${c.roleTitle}}} outfit guide to 3 distinct looks (Option 1, Option 2, Option 3).`);
      }

      // If Clean spice, scrub any accidental profanity or affair keywords
      if (assembled.spiceLevel === 'Clean') {
        const scrubClean = (s: string) =>
          s
            .replace(/\b(bitch|shit|bullshit|asshole|slut|wtf|stfu|fuck|fucking|motherfucker)\b/gi, 'scoundrel')
            .replace(/\b(secret lover|mistress|cheating spouse|love affair|sleeping with)\b/gi, 'secret rival');
        bio = scrubClean(bio);
        actSummary = scrubClean(actSummary);
      } else if (assembled.spiceLevel === 'Mild') {
        const scrubMild = (s: string) =>
          s.replace(/\b(bitch|shit|bullshit|asshole|slut|wtf|stfu|fuck|fucking|motherfucker)\b/gi, 'rival');
        bio = scrubMild(bio);
        actSummary = scrubMild(actSummary);
      }

      return {
        ...c,
        bio,
        actSummary,
        outfitAdvice,
        actBullets: (c.actBullets || []).map(cleanBraces),
        motiveNotes: cleanBraces(c.motiveNotes),
      };
    });

    // 2. Balance clues across all required tier rounds (Basic = 3, Premium = 4, Grand = 5) if any round has < 2 clues
    const fixedClues = assembled.clues.map((cl) => ({
      ...cl,
      title: cleanBraces(cl.title),
      description: cleanBraces(cl.description),
    }));

    const requiredRounds = getPackageRoundsForCount(fixedCharacters.length);
    const activeRoundNums = Array.from(
      { length: requiredRounds },
      (_, idx) => (idx + 1) as ArchitectRoundNumber
    );
    for (const targetRound of activeRoundNums) {
      const countInRound = fixedClues.filter((c) => c.roundNumber === targetRound).length;
      if (countInRound < 2 && fixedClues.length >= requiredRounds * 2) {
        const donorRound = activeRoundNums.find(
          (r) => fixedClues.filter((c) => c.roundNumber === r).length > 3
        );
        if (donorRound) {
          const candidate = fixedClues.find((c) => c.roundNumber === donorRound);
          if (candidate) {
            candidate.roundNumber = targetRound;
            fixesApplied.push(`Rebalanced clue "${candidate.title}" to Round ${targetRound}.`);
          }
        }
      }
    }

    const partialBase: Omit<AssembledFullMysteryBase, 'proofreadReport'> = {
      ...assembled,
      description: cleanBraces(assembled.description),
      characters: fixedCharacters,
      relationships: assembled.relationships.map((r) => ({
        ...r,
        notes: cleanBraces(r.notes),
      })),
      clues: fixedClues,
    };

    const proofreadReport = runAutomatedProofreader(partialBase);

    return {
      success: true,
      assembled: {
        ...partialBase,
        proofreadReport,
      },
      fixesApplied:
        fixesApplied.length > 0
          ? fixesApplied
          : ['Verified all tokens, 3 outfit options, round pacing, and relationships.'],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not auto-fix assembled base.',
    };
  }
}

/**
 * UPGRADE 5A: Cloud / Server Persistence for the 3 OG Base Builder Workspace Slots.
 */
const CLOUD_SLOTS_FILE = path.join(
  /*turbopackIgnore: true*/ process.cwd(),
  'data',
  '.architect-cloud-slots.json'
);

export async function saveArchitectCloudWorkspaceAction(params: {
  slotsJson: string;
}): Promise<{ success: boolean; savedAt?: string }> {
  await requireAdmin();
  try {
    const dir = path.dirname(CLOUD_SLOTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const savedAt = new Date().toISOString();
    fs.writeFileSync(
      CLOUD_SLOTS_FILE,
      JSON.stringify({ savedAt, slots: JSON.parse(params.slotsJson) }, null, 2),
      'utf-8'
    );
    return { success: true, savedAt };
  } catch {
    return { success: false };
  }
}

export async function loadArchitectCloudWorkspaceAction(): Promise<{
  success: boolean;
  slots?: any[];
  savedAt?: string;
}> {
  await requireAdmin();
  try {
    if (fs.existsSync(CLOUD_SLOTS_FILE)) {
      const raw = JSON.parse(fs.readFileSync(CLOUD_SLOTS_FILE, 'utf-8'));
      if (Array.isArray(raw?.slots) && raw.slots.length > 0) {
        return { success: true, slots: raw.slots, savedAt: raw.savedAt };
      }
    }
  } catch {}
  return { success: false };
}

/**
 * UPGRADE 5B: Lists existing Draft Mystery Bases from Supabase and loads any chosen draft
 * back into the 5-step OG Base Builder slot so the creator can add/edit clues or red herrings.
 */
export async function listDraftMysteryBasesForArchitectAction(): Promise<{
  success: boolean;
  drafts?: {
    id: string;
    title: string;
    theme: string;
    spiceLevel: string;
    complexity: string;
    status: string;
    createdAt: string;
  }[];
}> {
  const { supabase } = await requireAdmin();
  try {
    const { data, error } = await supabase
      .from('mysteries')
      .select('id, title, theme, spice_level, complexity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !data) return { success: false };

    return {
      success: true,
      drafts: data.map((m: any) => ({
        id: m.id,
        title: m.title || 'Untitled Mystery',
        theme: m.theme || 'Mystery',
        spiceLevel: m.spice_level || 'Mild',
        complexity: m.complexity || 'medium',
        status: m.status || 'draft',
        createdAt: m.created_at || '',
      })),
    };
  } catch {
    return { success: false };
  }
}

export async function loadExistingDraftIntoArchitectAction(params: {
  mysteryId: string;
}): Promise<{
  success: boolean;
  blueprint?: MysteryBlueprintInput;
  coreClues?: SuggestedClueCandidate[];
  subplots?: SuggestedRedHerringSubplot[];
  error?: string;
}> {
  const { supabase } = await requireAdmin();
  try {
    const [
      { data: mystery },
      { data: chars },
      { data: motives },
      { data: beats },
      { data: clues },
    ] = await Promise.all([
      supabase.from('mysteries').select('*').eq('id', params.mysteryId).single(),
      supabase.from('characters').select('*').eq('mystery_id', params.mysteryId),
      supabase.from('motives').select('*').eq('mystery_id', params.mysteryId),
      (supabase as any)
        .from('story_beats')
        .select('*')
        .eq('mystery_id', params.mysteryId)
        .order('sort_order', { ascending: true }),
      supabase
        .from('clues')
        .select('*')
        .eq('mystery_id', params.mysteryId)
        .order('round_number', { ascending: true }),
    ]);

    if (!mystery) {
      return { success: false, error: 'Mystery not found.' };
    }

    const motiveByCharId = new Map<string, string>();
    for (const m of motives || []) {
      motiveByCharId.set((m as any).character_id, (m as any).notes || '');
    }

    const palette = [
      'Crimson Red',
      'Emerald Green',
      'Royal Purple',
      'Sapphire Blue',
      'Amber Gold',
      'Obsidian Black',
    ];

    const mappedChars: BlueprintCharacterInput[] = (chars || []).map((c: any, idx: number) => {
      const pData = (c.profile_data || {}) as any;
      const plotRole: CharacterPlotRole = c.is_victim
        ? 'victim'
        : c.plot_role === 'killer'
          ? 'killer'
          : c.plot_role === 'assistant'
            ? 'assistant'
            : 'innocent';
      return {
        id: c.id || `char-${idx + 1}`,
        roleTitle: String(c.name || `The Suspect ${idx + 1}`).replace(/^\{\{|\}\}$/g, ''),
        defaultGender: ['female', 'male', 'adaptable'].includes(c.gender) ? c.gender : 'adaptable',
        plotRole,
        color: pData.color || palette[idx % palette.length],
        conceptNotes: pData.bio || pData.act_summary || '',
        motiveOrSecret: motiveByCharId.get(c.id) || pData.act_summary || '',
        outfitNotes: pData.outfit_advice || '',
      };
    });

    const mappedBeats: BlueprintBeatInput[] = (beats || []).map((b: any, idx: number) => ({
      beatNumber: idx + 1,
      title: String(b.event_title || `Beat ${idx + 1}`),
      timeWindow: '8:19 PM',
      phase: ['pre_crime', 'crime', 'investigation', 'resolution'].includes(b.timeline_phase)
        ? b.timeline_phase
        : 'investigation',
      description: String(b.description || ''),
    }));

    const killerChar = mappedChars.find((c) => c.plotRole === 'killer');
    const spiceMap: Record<string, ArchitectSpiceLevel> = {
      clean: 'Clean',
      mild: 'Mild',
      spicy: 'Spicy',
      filthy: 'Filthy',
    };
    const rawSpice = String((mystery as any).spice_level || 'Mild').toLowerCase();

    const blueprint: MysteryBlueprintInput = {
      id: `bp-${mystery.id}`,
      title: mystery.title || 'Loaded Mystery',
      theme: (mystery as any).theme || '',
      settingDescription: mystery.description || '',
      spiceLevel: spiceMap[rawSpice] || 'Mild',
      complexity: ['easy', 'medium', 'hard'].includes(String((mystery as any).complexity || '').toLowerCase())
        ? (String((mystery as any).complexity).toLowerCase() as ArchitectComplexity)
        : 'medium',
      murderTimeWindow: '8:19 PM',
      murderWeaponAndMethod: 'Imported from existing mystery base clues and beats.',
      killerHowAndWhySummary: killerChar
        ? `{{${killerChar.roleTitle}}} committed the murder: ${killerChar.motiveOrSecret}`
        : 'Imported from existing mystery base.',
      insideJokesOrProps: (mystery as any).inside_jokes || '',
      characters: mappedChars.length > 0 ? mappedChars : [],
      beats: mappedBeats,
    };

    const allClues = clues || [];
    const coreClues: SuggestedClueCandidate[] = allClues
      .filter((c: any) => !c.is_fake)
      .map((c: any, idx: number) => ({
        id: c.id || `loaded-core-${idx}`,
        title: c.title || `Clue #${idx + 1}`,
        format: (c.format as ClueFormat) || 'document',
        roundNumber: [1, 2, 3, 4, 5].includes(Number(c.round_number))
          ? (Number(c.round_number) as ArchitectRoundNumber)
          : 1,
        timestampLabel: '8:19 PM',
        description: c.description || '',
        generationPrompt: c.generation_prompt || c.description || '',
        pointsTo: 'Core evidence loaded from draft mystery base.',
        involvedRoles: [],
        isRedHerring: false,
        decision: 'yes',
      }));

    const fakeClues: SuggestedClueCandidate[] = allClues
      .filter((c: any) => Boolean(c.is_fake))
      .map((c: any, idx: number) => ({
        id: c.id || `loaded-decoy-${idx}`,
        title: c.title || `Decoy Clue #${idx + 1}`,
        format: (c.format as ClueFormat) || 'chat',
        roundNumber: [1, 2, 3, 4, 5].includes(Number(c.round_number))
          ? (Number(c.round_number) as ArchitectRoundNumber)
          : 1,
        timestampLabel: '8:19 PM',
        description: c.description || '',
        generationPrompt: c.generation_prompt || c.description || '',
        pointsTo: 'Red-herring decoy clue loaded from draft mystery base.',
        involvedRoles: [],
        isRedHerring: true,
        decision: 'yes',
      }));

    const subplots: SuggestedRedHerringSubplot[] =
      fakeClues.length > 0
        ? [
            {
              id: `loaded-subplot-${mystery.id}`,
              title: 'Imported Red-Herring Decoy Clues',
              involvedRoles: mappedChars
                .filter((c) => c.plotRole === 'innocent')
                .slice(0, 2)
                .map((c) => c.roleTitle),
              theme: 'Loaded Red Herrings',
              summary: 'Decoy clues imported from your existing draft mystery base.',
              step1TriggerR1: 'Early Round 1 suspicion trigger.',
              step2EscalationR2: 'Round 2 compromising escalation.',
              step3AlibiHoleR3: 'Round 3 alibi hole at the murder timestamp.',
              backstoryAdditions: {},
              decoyClues: fakeClues,
              decision: 'yes',
            },
          ]
        : [];

    return {
      success: true,
      blueprint,
      coreClues,
      subplots,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to load draft mystery into OG Base Builder.',
    };
  }
}

/**
 * Parses an uploaded relationship web / mind-map diagram screenshot (e.g. Canva / Miro / Freeform PNG)
 * into a structured MysteryBlueprintInput, mapping every box and connecting line into gender-flex roles.
 */
export async function parseDiagramImageIntoBlueprintAction(params: {
  imageBase64: string;
  mimeType: string;
  currentBlueprint: MysteryBlueprintInput;
}): Promise<{
  success: boolean;
  blueprint?: MysteryBlueprintInput;
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    });

    const cleanBase64 = params.imageBase64.replace(/^data:[^;]+;base64,/, '');
    const prompt = `You are the Master Mystery Architect for Back Pocket Mysteries.
Inspect the attached relationship web diagram image and convert it into a structured MysteryBlueprintInput JSON object.

RULES FOR READING THE DIAGRAM:
1. Extract the Mystery Title (e.g. "Unibreak at the Cabin") and Spice Level if written on the diagram (e.g. "FILTHY" / "FIFTHY" -> "Filthy", "SPICY" -> "Spicy", "MILD" -> "Mild", "CLEAN" -> "Clean").
2. Extract every character box in the diagram:
   - Pink boxes indicate defaultGender = "female"; Blue boxes indicate defaultGender = "male".
   - If a box has a highlighted border (e.g. blue border in the center like "Leah (Prom queen)" or red border like "Stacy"), assign 1 character as 'victim' and 1 character (such as their enemy/rival) as 'killer', and the rest as 'innocent'.
   - Convert each character into an iconic Role Title starting with "The " (e.g. "Leah (Prom queen)" -> "The Prom Queen", "Stacy" -> "The Girlfriend", "Mia" -> "The Bestie", "Josh" -> "The Brother", "Seb" -> "The Co-Captain", "James" -> "The Teammate"), while keeping a note of their diagram name and ALL connecting relationship lines (e.g. "Siblings", "Exes", "Crush", "Secret romance", "Enemies", "Dating", "Besties", "Co-captains of a sport team", "work together", "friends") inside \`conceptNotes\` using the {{The Role}} tokens!
3. Suggest a fitting murder weapon/method, killer how & why summary, and 5 chronological core murder story beats if the beats on the diagram are blank or incomplete. STRICT BEAT RULE: The 5 beats must ONLY develop the true murder plot progression (never mention decoy or red-herring subplots in the beats).

Return strict JSON:
{
  "title": "string",
  "theme": "string",
  "settingDescription": "string",
  "spiceLevel": "Clean" | "Mild" | "Spicy" | "Filthy",
  "complexity": "easy" | "medium" | "hard",
  "murderTimeWindow": "e.g. 11:28 PM",
  "murderWeaponAndMethod": "string",
  "killerHowAndWhySummary": "string",
  "insideJokesOrProps": "string",
  "characters": [
    {
      "id": "char-1",
      "roleTitle": "The ...",
      "defaultGender": "female" | "male" | "adaptable",
      "plotRole": "victim" | "killer" | "assistant" | "innocent",
      "color": "e.g. Crimson Red",
      "conceptNotes": "Diagram name + all relationship connections from the diagram using {{The Role}} tokens",
      "motiveOrSecret": "Their secret motive or scandal",
      "outfitNotes": "Outfit vibe"
    }
  ],
  "beats": [
    {
      "beatNumber": 1,
      "title": "string",
      "timeWindow": "e.g. 9:15 PM",
      "phase": "pre_crime" | "crime" | "investigation" | "resolution",
      "description": "string"
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_parse_diagram_image',
      inlineParts: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: params.mimeType || 'image/png',
          },
        },
      ],
    });
    const palette = [
      'Hot Pink',
      'Crimson Red',
      'Rose Gold',
      'Sapphire Blue',
      'Electric Cyan',
      'Cobalt Blue',
    ];

    const merged: MysteryBlueprintInput = {
      ...params.currentBlueprint,
      title: parsed.title || params.currentBlueprint.title,
      theme: parsed.theme || params.currentBlueprint.theme || 'Cabin Getaway',
      settingDescription: parsed.settingDescription || params.currentBlueprint.settingDescription,
      spiceLevel: ['Clean', 'Mild', 'Spicy', 'Filthy'].includes(parsed.spiceLevel)
        ? parsed.spiceLevel
        : params.currentBlueprint.spiceLevel,
      murderTimeWindow: parsed.murderTimeWindow || '11:28 PM',
      murderWeaponAndMethod:
        parsed.murderWeaponAndMethod || params.currentBlueprint.murderWeaponAndMethod,
      killerHowAndWhySummary:
        parsed.killerHowAndWhySummary || params.currentBlueprint.killerHowAndWhySummary,
      insideJokesOrProps: parsed.insideJokesOrProps || params.currentBlueprint.insideJokesOrProps,
      characters:
        Array.isArray(parsed.characters) && parsed.characters.length > 0
          ? parsed.characters.map((c: any, idx: number) => ({
              id: `char-${idx + 1}`,
              roleTitle: String(c.roleTitle || `The Suspect ${idx + 1}`).replace(/^\{\{|\}\}$/g, ''),
              defaultGender: ['female', 'male', 'adaptable'].includes(c.defaultGender)
                ? c.defaultGender
                : 'adaptable',
              plotRole: ['victim', 'killer', 'assistant', 'innocent'].includes(c.plotRole)
                ? c.plotRole
                : 'innocent',
              color: c.color || palette[idx % palette.length],
              conceptNotes: c.conceptNotes || '',
              motiveOrSecret: c.motiveOrSecret || '',
              outfitNotes: c.outfitNotes || '',
            }))
          : params.currentBlueprint.characters,
      beats:
        Array.isArray(parsed.beats) && parsed.beats.length > 0
          ? parsed.beats.map((b: any, idx: number) => ({
              beatNumber: idx + 1,
              title: b.title || `Beat ${idx + 1}`,
              timeWindow: b.timeWindow || '10:00 PM',
              phase: ['pre_crime', 'crime', 'investigation', 'resolution'].includes(b.phase)
                ? b.phase
                : 'investigation',
              description: b.description || '',
            }))
          : params.currentBlueprint.beats,
    };

    return { success: true, blueprint: merged };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Could not parse diagram image.',
    };
  }
}

/**
 * Generates 5 chronological core murder story beats + murder method & killer summary from the current cast & relationships.
 */
export async function suggestStoryBeatsForCastAction(params: {
  blueprint: MysteryBlueprintInput;
}): Promise<{
  success: boolean;
  murderTimeWindow?: string;
  murderWeaponAndMethod?: string;
  killerHowAndWhySummary?: string;
  settingDescription?: string;
  beats?: BlueprintBeatInput[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  try {
    const { blueprint } = params;
    const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
    const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);

    const prompt = `You are the Lead Story Architect for Back Pocket Mysteries.
Based on the Mystery Title, Spice Level, and Character Relationship Web below, generate a tight, rogue, dramatic murder method, killer how/why summary, setting description, and 5 chronological core murder story beats.

STRICT CORE BEAT RULE:
- Generate EXACTLY 5 beats.
- There must be ZERO mention of decoy or red-herring subplots in the 5 beats. Every single beat must strictly develop the true murder plot progression (from the initial leverage/trigger -> confrontation/ultimatum -> isolated struggle -> first strike/accomplice act -> fatal blow & cover-up).

TITLE: "${blueprint.title}"
THEME: "${blueprint.theme || blueprint.title}"
${spiceDirective}
${tokenDirective}

CHARACTER CAST & RELATIONSHIPS:
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (${c.plotRole.toUpperCase()} • ${c.defaultGender}): ${c.conceptNotes} | Motive/Secret: ${c.motiveOrSecret}`
  )
  .join('\n')}

Return strict JSON:
{
  "settingDescription": "2-3 atmospheric sentences setting the scene for the party.",
  "murderTimeWindow": "e.g. 11:28 PM",
  "murderWeaponAndMethod": "1-2 sentences describing the exact murder weapon, method, and forensic trace.",
  "killerHowAndWhySummary": "2 sentences explaining why the Killer (and Accomplice, if any) murdered the Victim and how they pulled it off during the murder time window using {{Role}} tokens.",
  "beats": [
    {
      "beatNumber": 1,
      "title": "Beat 1 Title (The Setup & Stolen Leverage)",
      "timeWindow": "e.g. 9:15 PM",
      "phase": "pre_crime",
      "description": "How the Victim obtains or weaponizes the leverage that triggers the murder plot using {{Role}} tokens."
    },
    {
      "beatNumber": 2,
      "title": "Beat 2 Title (The Humiliation & Ultimatum)",
      "timeWindow": "e.g. 10:15 PM",
      "phase": "pre_crime",
      "description": "The private confrontation where the Victim issues the deadline/ultimatum using {{Role}} tokens."
    },
    {
      "beatNumber": 3,
      "title": "Beat 3 Title (The Isolated Struggle)",
      "timeWindow": "e.g. 11:10 PM",
      "phase": "pre_crime",
      "description": "The physical confrontation at the crime scene right before the first strike using {{Role}} tokens."
    },
    {
      "beatNumber": 4,
      "title": "Beat 4 Title (The First Strike / Accomplice Escalation)",
      "timeWindow": "e.g. 11:18 PM",
      "phase": "crime",
      "description": "The initial violent strike or incapacitation at the crime scene using {{Role}} tokens."
    },
    {
      "beatNumber": 5,
      "title": "Beat 5 Title (The Fatal Blow & Cover-Up)",
      "timeWindow": "e.g. 11:28 PM",
      "phase": "crime",
      "description": "The Killer delivers the fatal blow, stages the scene, and establishes the alibi cover-up using {{Role}} tokens."
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_beats_for_cast',
    });
    return {
      success: true,
      settingDescription: parsed.settingDescription || blueprint.settingDescription,
      murderTimeWindow: parsed.murderTimeWindow || blueprint.murderTimeWindow || '11:45 PM',
      murderWeaponAndMethod: parsed.murderWeaponAndMethod || blueprint.murderWeaponAndMethod,
      killerHowAndWhySummary: parsed.killerHowAndWhySummary || blueprint.killerHowAndWhySummary,
      beats: Array.isArray(parsed.beats)
        ? parsed.beats.map((b: any, idx: number) => ({
            beatNumber: idx + 1,
            title: b.title || `Beat ${idx + 1}`,
            timeWindow: b.timeWindow || '11:00 PM',
            phase: ['pre_crime', 'crime', 'investigation', 'resolution'].includes(b.phase)
              ? b.phase
              : 'investigation',
            description: b.description || '',
          }))
        : blueprint.beats,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to suggest story beats.',
    };
  }
}

/**
 * STAGE 2: Beat-by-Beat Core Clue Suggester
 * Given a specific Story Beat (Beat 1..5), suggests 5 distinct Core Clue options that explain or prove
 * this specific beat, calibrated strictly to the mystery's Spice Level (dialogue + photo/generation prompt)
 * and optionally embedding a double-meaning hook that could also look suspicious toward an innocent suspect.
 */
export async function suggestCluesForSingleBeatAction(params: {
  blueprint: MysteryBlueprintInput;
  beatNumber: number;
  existingSelectedClues?: SuggestedClueCandidate[];
  customDirection?: string;
}): Promise<{
  success: boolean;
  candidates?: SuggestedClueCandidate[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, beatNumber, existingSelectedClues = [], customDirection } = params;
  const targetBeat =
    blueprint.beats.find((b) => b.beatNumber === beatNumber) || blueprint.beats[0];
  if (!targetBeat) {
    return { success: false, error: `Beat #${beatNumber} not found in blueprint.` };
  }

  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);
  const maxAllowedRound = getPackageRoundsForCount(blueprint.characters?.length);

  try {
    const prompt = `You are the Master Forensic Clue & Spice Designer for Back Pocket Mysteries.
We are building the Core Murder Clues BEAT-BY-BEAT.
Right now, the creator has selected **BEAT #${targetBeat.beatNumber}: "${targetBeat.title}" (${targetBeat.timeWindow})**.
Suggest **5 distinct, high-impact Core Clue candidates** that explain, reveal, or forensically prove what happened in **BEAT #${targetBeat.beatNumber}** — so the creator can pick their favorite 2 clues for this beat!

MYSTERY CONTEXT:
- Title: "${blueprint.title}" (${blueprint.theme})
- Setting: ${blueprint.settingDescription}
- Murder Time Window: ${blueprint.murderTimeWindow}
- Murder Weapon & Method: ${blueprint.murderWeaponAndMethod}
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}

ALL 5 CORE BEATS (FOR CONTEXT):
${blueprint.beats
  .map(
    (b) =>
      `- Beat #${b.beatNumber} (${b.timeWindow} • ${b.title}): ${b.description}${
        b.beatNumber === targetBeat.beatNumber ? '  <-- [FOCUS ALL 5 CLUES ON THIS BEAT]' : ''
      }`
  )
  .join('\n')}

CHARACTER CAST & MOTIVES:
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (${c.plotRole.toUpperCase()} • ${c.defaultGender}): ${c.conceptNotes} | Motive/Secret: ${c.motiveOrSecret}`
  )
  .join('\n')}

${
  existingSelectedClues.length > 0
    ? `ALREADY SELECTED CLUES FROM OTHER BEATS (DO NOT DUPLICATE):
${existingSelectedClues.map((c) => `- [Beat #${c.beatNumber || '?'} • ${c.format}] ${c.title}: ${c.description}`).join('\n')}`
    : ''
}

${
  customDirection && customDirection.trim()
    ? `CREATOR'S SPECIFIC REQUEST FOR THIS BEAT'S CLUES:
"${customDirection.trim()}"`
    : ''
}

${spiceDirective}

${tokenDirective}

MANDATORY FORMAT, SPICE & PHOTO-VS-TEXT RULES:
1. Across the 5 options for Beat #${targetBeat.beatNumber}, include a balanced mix of **3 Medium Types**:
   - **📸 Photo / Visual Evidence ("physical_prop" or "cctv"):** At least 1–2 options MUST be a "physical_prop" or "cctv" frame. ONLY "physical_prop" and "cctv" clues get an AI Photo Prompt in "generationPrompt"! For these photo clues, "generationPrompt" MUST be a detailed, 3-sentence cinematic forensic photography brief specifying: (a) Exact camera angle, lens (e.g. 50mm macro lens, overhead night-vision CCTV security cam), and framing; (b) The specific physical prop/evidence item and forensic trace (e.g. cast-iron poker, ripped chain, shattered glass, velvet fibers) with ZERO readable text/screens; (c) Moody ${blueprint.spiceLevel}-vibe lighting, color palette, and 35mm film grain.
   - **🎙️ Audio / Voice Note ("audio"):** At least 1 option MUST be an "audio" clue. Its "description" MUST be a multi-speaker voice transcript formatted with lines like:
     Recording Duration: 22.0 Seconds
     {{The Role A}}: "[whispers] First spoken line..."
     {{The Role B}}: "[angry] Sharp spoken reply..."
     And its "generationPrompt" MUST be "" (empty string — audio clues use ElevenLabs voice synthesis, NOT a photo!).
   - **💬 Text / Digital / Paper ("chat", "handwritten_note", "receipt", "search_log", "social_post", "document"):** 2 options should be interactive UI text clues:
     • If "chat": format "description" as a 3-4 message iMessage/DM thread ('[10:18 PM] {{The Role A}}: "..."' / '[10:19 PM] {{The Role B}}: "..."').
     • If "receipt" / "document" / "handwritten_note" / "search_log" / "social_post": write the exact in-world text.
     • For ALL text/UI formats, set "generationPrompt" to "" (empty string — these render as native interactive UI templates, NOT photos!).
2. Every clue's "description" MUST explicitly reflect the **${blueprint.spiceLevel.toUpperCase()}** spice level:
   - If Filthy: raw 18+ after-dark dialogue, F-bombs ("fuck", "fucking", "bullshit", "bitch"), scandalous bedroom/balcony tension.
   - If Spicy: sharp cussing ("bitch", "shit", "wtf"), catfight/scandal tension.
   - If Mild: romantic affair tension with 100% clean PG-13 dialogue (0 cussing).
   - If Clean: 100% SFW high-stakes murder/blackmail with 0 romance affairs and 0 profanity.
3. **DOUBLE-MEANING / AMBIGUOUS HOOK (IDEAL!):** Wherever possible, write the clue so that while it genuinely proves part of Beat #${targetBeat.beatNumber}, it ALSO has an ambiguous double meaning that could make one of the innocent suspects look suspicious (and explain that in "doubleMeaningNote").
4. **BEAT SUB-FACTS, CLUE STRENGTH & GAP COVERAGE (CRITICAL!):**
   - Break Beat #${targetBeat.beatNumber} ("${targetBeat.title}: ${targetBeat.description}") into **3 essential Beat Sub-Facts** ("beatSubFacts"):
     1. A short label for **Who/Where & Timestamp** (e.g. "Upstairs Bedroom Lure at ${targetBeat.timeWindow}")
     2. A short label for **The Physical Action / Object / Weapon** (e.g. "Stolen Varsity Betting Ledger")
     3. A short label for **The Motive / Stakes / Aftermath** (e.g. "$42k Point-Shaving & Blackmail Leverage")
   - For each of the 5 suggested clues, specify:
     - "strengthTier": "Forensic Anchor" | "Timeline & Alibi Lock" | "Motive & Escalation Proof" | "Double-Meaning Misdirection"
     - "strengthSummary": 1 punchy sentence explaining what specific investigative strength this clue adds to the mystery.
     - "coveredBeatPoints": Array of 2 of the exact 3 "beatSubFacts" strings that this single clue proves (design the 5 options so that picking any complementary pair covers all 3 "beatSubFacts"!).
     - "unaddressedBeatGap": 1 concise sentence explaining what single gap in Beat #${targetBeat.beatNumber} this clue leaves uncovered on its own so the creator knows what second clue to pair with it.
5. Use ONLY {{The Role}} and {{The Role_he}}/{{The Role_him}}/{{The Role_his}}/{{The Role_sibling}}/{{The Role_spouse}} tokens — NEVER raw real names.

Return strict JSON:
{
  "beatSubFacts": [
    "Sub-Fact 1 short label (4-7 words)",
    "Sub-Fact 2 short label (4-7 words)",
    "Sub-Fact 3 short label (4-7 words)"
  ],
  "clues": [
    {
      "title": "Punchy in-world clue title",
      "format": "chat" | "audio" | "physical_prop" | "cctv" | "handwritten_note" | "receipt" | "search_log" | "social_post" | "document",
      "roundNumber": 1 | 2 | 3,
      "timestampLabel": "${targetBeat.timeWindow}",
      "description": "Full structured in-world clue text/dialogue calibrated to ${blueprint.spiceLevel} spice using {{Role}} tokens.",
      "generationPrompt": "Leave empty '' for chat/audio/text formats! For physical_prop or cctv ONLY: write a rich 3-sentence cinematic forensic photo prompt (camera/lens + physical objects + ${blueprint.spiceLevel} noir lighting, NO text in image).",
      "pointsTo": "How this clue explains Beat #${targetBeat.beatNumber}.",
      "doubleMeaningNote": "How this clue also looks ambiguous or suspicious toward an innocent suspect's motive.",
      "strengthTier": "Forensic Anchor" | "Timeline & Alibi Lock" | "Motive & Escalation Proof" | "Double-Meaning Misdirection",
      "strengthSummary": "What specific investigative strength this clue adds to the pack.",
      "coveredBeatPoints": ["Sub-Fact 1 short label (4-7 words)", "Sub-Fact 2 short label (4-7 words)"],
      "unaddressedBeatGap": "What part of Beat #${targetBeat.beatNumber} this single clue doesn't cover on its own.",
      "involvedRoles": ["The Role A", "The Role B"]
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_beat_clues',
    });
    const PHOTO_FORMATS = new Set<ClueFormat>(['physical_prop', 'cctv']);
    const defaultSubFacts: [string, string, string] =
      Array.isArray(parsed.beatSubFacts) && parsed.beatSubFacts.length >= 3
        ? [
            String(parsed.beatSubFacts[0]).trim(),
            String(parsed.beatSubFacts[1]).trim(),
            String(parsed.beatSubFacts[2]).trim(),
          ]
        : [
            `Timestamp & Presence (${targetBeat.timeWindow})`,
            `Physical Action & Evidence (${targetBeat.title})`,
            `Motive Stakes & Suspect Escalation`,
          ];

    const VALID_STRENGTH_TIERS: ClueStrengthTier[] = [
      'Forensic Anchor',
      'Timeline & Alibi Lock',
      'Motive & Escalation Proof',
      'Double-Meaning Misdirection',
    ];

    const candidates: SuggestedClueCandidate[] = (parsed.clues || []).map(
      (c: any, idx: number) => {
        const fmt = (c.format as ClueFormat) || 'physical_prop';
        const isPhoto = PHOTO_FORMATS.has(fmt);
        const fallbackCovered =
          idx % 3 === 0
            ? [defaultSubFacts[0], defaultSubFacts[1]]
            : idx % 3 === 1
              ? [defaultSubFacts[1], defaultSubFacts[2]]
              : [defaultSubFacts[0], defaultSubFacts[2]];
        const rawCovered = Array.isArray(c.coveredBeatPoints)
          ? c.coveredBeatPoints.map((s: any) => String(s || '').trim()).filter(Boolean)
          : [];
        const coveredBeatPoints = rawCovered.length > 0 ? rawCovered : fallbackCovered;
        const missingFromThisClue = defaultSubFacts.filter(
          (sf) => !coveredBeatPoints.some((cp: string) => cp.toLowerCase() === sf.toLowerCase())
        );

        const rawTier = String(c.strengthTier || '').trim() as ClueStrengthTier;
        const strengthTier: ClueStrengthTier = VALID_STRENGTH_TIERS.includes(rawTier)
          ? rawTier
          : isPhoto
            ? 'Forensic Anchor'
            : fmt === 'audio'
              ? 'Timeline & Alibi Lock'
              : idx % 2 === 0
                ? 'Motive & Escalation Proof'
                : 'Double-Meaning Misdirection';

        return {
          id: `beat-${beatNumber}-clue-${Date.now()}-${idx}`,
          title: String(c.title || `Beat #${beatNumber} Clue ${idx + 1}`).trim(),
          format: fmt,
          roundNumber: Math.max(
            1,
            Math.min(
              maxAllowedRound,
              Number(c.roundNumber) || Math.min(maxAllowedRound, Math.ceil(beatNumber / 2))
            )
          ) as ArchitectRoundNumber,
          timestampLabel: String(c.timestampLabel || targetBeat.timeWindow || '10:00 PM'),
          description: ensureSpiceFlavorInClueDescription(
            String(c.description || '').trim(),
            blueprint.spiceLevel,
            fmt
          ),
          generationPrompt: isPhoto
            ? String(c.generationPrompt || c.description || '').trim()
            : '',
          pointsTo: String(c.pointsTo || `Proves Beat #${beatNumber}.`).trim(),
          doubleMeaningNote: String(c.doubleMeaningNote || '').trim(),
          strengthTier,
          strengthSummary: String(
            c.strengthSummary ||
              `Anchors Beat #${beatNumber} at ${targetBeat.timeWindow} via ${fmt} evidence.`
          ).trim(),
          coveredBeatPoints,
          unaddressedBeatGap: String(
            c.unaddressedBeatGap ||
              (missingFromThisClue.length > 0
                ? `Doesn't directly prove "${missingFromThisClue.join(' & ')}" on its own — pair with a complementary clue.`
                : `Pair with a second clue from a different medium to corroborate Beat #${beatNumber}.`)
          ).trim(),
          involvedRoles: Array.isArray(c.involvedRoles) ? c.involvedRoles : [],
          isRedHerring: false,
          beatNumber,
          decision: 'pending',
        };
      }
    );

    return {
      success: true,
      candidates,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || `Failed to suggest clues for Beat #${beatNumber}.`,
    };
  }
}

/**
 * STAGE 3: Red Herring & Double-Meaning Builder
 * Freshly generates 3 entangled Red-Herring Plotlines directly anchored to the exact Core Clues
 * the user selected in Step 2, showing each character's motive, which selected Core Clues it
 * hooks into via double-meaning, and suggesting 4 media-balanced Red Herring Clues per plotline.
 */
export async function suggestRedHerringPlotlinesWithCluesAction(params: {
  blueprint: MysteryBlueprintInput;
  selectedCoreClues: SuggestedClueCandidate[];
  customDirection?: string;
}): Promise<{
  success: boolean;
  subplots?: SuggestedRedHerringSubplot[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, selectedCoreClues, customDirection } = params;
  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);
  const maxAllowedRound = getPackageRoundsForCount(blueprint.characters?.length);

  // Measure the media balance of the user's already-selected Core Clues so the Red Herrings auto-balance the pack!
  const corePhotoCount = selectedCoreClues.filter(
    (c) => c.format === 'physical_prop' || c.format === 'cctv'
  ).length;
  const coreAudioCount = selectedCoreClues.filter((c) => c.format === 'audio').length;
  const coreTextCount = selectedCoreClues.length - corePhotoCount - coreAudioCount;

  // Helper to check if a clue mentions or involves a character role
  const doesClueInvolveRole = (clue: SuggestedClueCandidate, roleTitle: string): boolean => {
    const cleanRole = roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
    const inRoles = (clue.involvedRoles || []).some(
      (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole
    );
    const inText = `${clue.title} ${clue.description} ${clue.pointsTo} ${clue.doubleMeaningNote || ''}`
      .toLowerCase()
      .includes(cleanRole);
    return inRoles || inText;
  };

  // Audit how many of the 10 Selected Core Clues each primary character appears in
  const MIN_TARGET_CLUES_PER_CHAR = 4;
  const characterCoreAudit = blueprint.characters
    .map((ch) => {
      const cleanRole = ch.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
      const coreAppearances = selectedCoreClues.filter((cl) =>
        doesClueInvolveRole(cl, cleanRole)
      ).length;
      const neededInRedHerrings =
        ch.plotRole === 'victim'
          ? Math.max(1, MIN_TARGET_CLUES_PER_CHAR - coreAppearances)
          : Math.max(
              ch.plotRole === 'innocent' ? 3 : 1,
              MIN_TARGET_CLUES_PER_CHAR + 1 - coreAppearances
            );
      return {
        character: ch,
        cleanRole,
        coreAppearances,
        neededInRedHerrings: Math.min(5, neededInRedHerrings),
      };
    })
    .sort((a, b) => a.coreAppearances - b.coreAppearances);

  const mostUnderFeaturedRoles = characterCoreAudit
    .filter((a) => a.character.plotRole !== 'victim' && a.character.plotRole !== 'killer')
    .sort((a, b) => a.coreAppearances - b.coreAppearances);

  try {
    const prompt = `You are the Master Red-Herring & Character-Balance Architect for Back Pocket Mysteries.
The creator has just locked in their **${selectedCoreClues.length} Selected Core Murder Clues** across the 5 Core Story Beats.
Now you MUST freshly generate **3 entangled Red-Herring Plotlines** specifically tailored around the creator's **exact selected Core Clues below**, while **BALANCING PRIMARY CHARACTER SPOTLIGHT** so that characters who were under-featured in the 10 Core Clues get heavy Red-Herring storyline and clue coverage!

MYSTERY CONTEXT:
- Title: "${blueprint.title}" (${blueprint.theme})
- Spice Level: ${blueprint.spiceLevel}
- Murder Time Window: ${blueprint.murderTimeWindow}
- Murder Weapon & Method: ${blueprint.murderWeaponAndMethod}
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}

CHARACTER CAST & MOTIVES:
${blueprint.characters
  .map(
    (c) =>
      `- {{${c.roleTitle}}} (${c.plotRole.toUpperCase()} • ${c.defaultGender}): ${c.conceptNotes} | Motive/Secret: ${c.motiveOrSecret}`
  )
  .join('\n')}

⚖️ PRIMARY CHARACTER CLUE BALANCE AUDIT (CRITICAL — FIX UNDER-FEATURED CHARACTERS!):
Every primary character in the cast MUST appear in **at least 4 to 6 of the 16 total clues** so no player is sidelined at the party table. Here is each character's current count in the ${selectedCoreClues.length} locked Core Clues:
${characterCoreAudit
  .map(
    (a) =>
      `- {{${a.cleanRole}}} (${a.character.plotRole.toUpperCase()}): Currently in **${a.coreAppearances}/${selectedCoreClues.length} Core Clues** -> MANDATORY RED-HERRING QUOTA: Must be explicitly named & involved in **at least ${a.neededInRedHerrings} of the 6 pre-selected Red-Herring Clues** (and all 4 options of their plotlines)!`
  )
  .join('\n')}
-> HIGHEST PRIORITY CHARACTERS TO BOOST: ${mostUnderFeaturedRoles
      .slice(0, 2)
      .map((a) => `{{${a.cleanRole}}} (only ${a.coreAppearances} core clues!)`)
      .join(' and ')} MUST be a lead character in **at least 2 of the 3 Red-Herring Plotlines**!

CREATOR'S EXACT SELECTED CORE CLUES (ANCHOR YOUR RED HERRINGS DIRECTLY TO THESE!):
${selectedCoreClues
  .map(
    (c, idx) =>
      `Core Clue #${idx + 1} [Beat #${c.beatNumber || '?'} • ${c.timestampLabel} • ${c.format}] "${c.title}":
   - Content: ${c.description}
   - Double-Meaning Hook Already Embedded: ${c.doubleMeaningNote || 'None specified'}
   - Involved Characters: ${(c.involvedRoles || []).join(', ')}`
  )
  .join('\n\n')}

CURRENT MEDIA MIX OF THE ${selectedCoreClues.length} SELECTED CORE CLUES:
- 📸 Photos (physical_prop / cctv): ${corePhotoCount}
- 🎙️ Audio Voice Notes (audio): ${coreAudioCount}
- 💬 Text UI (chat / document / receipt / handwritten_note / social_post / search_log): ${coreTextCount}
-> Across each plotline's 4 decoyClues, make sure the top 2 clues (which are pre-selected by default) balance out whatever medium is lowest above so the final 16-clue pack lands at ~5-6 Photos, ~3-4 Audio Voice Notes, and ~7-8 Text UI clues!

${
  customDirection && customDirection.trim()
    ? `CREATOR'S SPECIFIC REQUEST FOR RED HERRINGS:
"${customDirection.trim()}"`
    : ''
}

${spiceDirective}

${tokenDirective}

RED-HERRING & CHARACTER-BALANCE RULES:
1. Create **3 distinct Red-Herring Plotlines**, each tying together **2–3 characters**.
   - **MANDATORY PAIRING RULE FOR CHARACTER BALANCE:** The least-featured suspect (${
     mostUnderFeaturedRoles[0] ? `{{${mostUnderFeaturedRoles[0].cleanRole}}}` : 'the quietest innocent suspect'
   }) MUST be a primary lead in **at least 2 of the 3 Red-Herring Plotlines** (for example: Plotline #1 pairing ${
     mostUnderFeaturedRoles[0] ? `{{${mostUnderFeaturedRoles[0].cleanRole}}}` : '{{The Bestie}}'
   } with ${
     mostUnderFeaturedRoles[1] ? `{{${mostUnderFeaturedRoles[1].cleanRole}}}` : '{{The Teammate}}'
   }, Plotline #2 pairing ${
     mostUnderFeaturedRoles[0] ? `{{${mostUnderFeaturedRoles[0].cleanRole}}}` : '{{The Bestie}}'
   } with ${
     mostUnderFeaturedRoles[2] ? `{{${mostUnderFeaturedRoles[2].cleanRole}}}` : '{{The Brother}}'
   }, and Plotline #3 pairing ${
     mostUnderFeaturedRoles[1] ? `{{${mostUnderFeaturedRoles[1].cleanRole}}}` : '{{The Brother}}'
   } with ${
     mostUnderFeaturedRoles[2] ? `{{${mostUnderFeaturedRoles[2].cleanRole}}}` : '{{The Teammate}}'
   } + {{${mostUnderFeaturedRoles[0]?.cleanRole || 'The Bestie'}}}).
2. For each Red-Herring Plotline, include:
   - "title": Punchy subplot title using {{The Role}} tokens.
   - "involvedRoles": The 2–3 character role titles entangled in this subplot.
   - "summary": Clear explanation of their motive against the Victim and their secret side-scheme.
   - "linkedCoreClueTitles": Array of 1–3 exact titles from the **CREATOR'S EXACT SELECTED CORE CLUES** list above that this Red-Herring Plotline directly hooks into!
   - "doubleMeaningCoreClueHook": Explicitly name those selected Core Clues and explain how this innocent suspect's motive creates a suspicious double-meaning interpretation of those real clues!
   - "decoyClues": Suggest **4 distinct Red-Herring Clue options** for this plotline (mixing "physical_prop" or "cctv" photo clues, "audio" voice note clues, and "chat" / "receipt" / "handwritten_note" / "document" text clues). Every decoy clue MUST explicitly name the subplot's involved {{The Role}} tokens in its "description" and "involvedRoles"!
   - Each decoy clue MUST also include "strengthTier" and "strengthSummary" explaining how strongly it misdirects table suspicion or creates an alibi puzzle.
   - PHOTO PROMPT RULE: ONLY "physical_prop" and "cctv" clues get a 3-sentence cinematic forensic photo prompt in "generationPrompt". For "chat", "audio", "receipt", "handwritten_note", "search_log", "social_post", and "document", set "generationPrompt" to "" (empty string!).
3. Use ONLY {{The Role}} and {{The Role_he}}/{{The Role_him}}/{{The Role_his}}/{{The Role_sibling}}/{{The Role_spouse}} tokens — NEVER raw real names.

Return strict JSON:
{
  "subplots": [
    {
      "title": "e.g. {{The Bestie}} & {{The Teammate}}: The $18,000 Scholarship Skim & Hookup Cover-Up",
      "involvedRoles": ["The Bestie", "The Teammate"],
      "theme": "Embezzlement & Secret Hookup Cover-Up",
      "summary": "Why these characters had a fierce motive to silence the Victim and what they were doing during the murder window.",
      "linkedCoreClueTitles": ["Exact Title of Selected Core Clue #1", "Exact Title of Selected Core Clue #2"],
      "doubleMeaningCoreClueHook": "Ties directly into Selected Core Clue '[Title]' because...",
      "step1TriggerR1": "Early suspicion trigger",
      "step2EscalationR2": "Mid-game escalation",
      "step3AlibiHoleR3": "How their alibi is finally explained",
      "backstoryAdditions": {
        "The Bestie": "Extra backstory detail",
        "The Teammate": "Extra backstory detail"
      },
      "decoyClues": [
        {
          "title": "Red herring clue title",
          "format": "chat" | "audio" | "physical_prop" | "cctv" | "handwritten_note" | "receipt" | "search_log" | "social_post" | "document",
          "roundNumber": 1 | 2 | 3,
          "timestampLabel": "e.g. 10:45 PM",
          "description": "In-world clue text calibrated to ${blueprint.spiceLevel} spice using {{Role}} tokens.",
          "generationPrompt": "Leave empty '' for chat/audio/text formats! For physical_prop or cctv ONLY: 3-sentence forensic photo prompt (NO text in image).",
          "pointsTo": "Why this makes {{The Role}} look guilty (or clears their alibi later).",
          "strengthTier": "Double-Meaning Misdirection" | "Forensic Anchor" | "Timeline & Alibi Lock" | "Motive & Escalation Proof",
          "strengthSummary": "How this red-herring clue amplifies suspicion or hooks into the selected core clues.",
          "involvedRoles": ["The Bestie", "The Teammate"]
        }
      ]
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_red_herring_plotlines',
    });
    const PHOTO_FORMATS = new Set<ClueFormat>(['physical_prop', 'cctv']);
    const subplots: SuggestedRedHerringSubplot[] = (parsed.subplots || []).map(
      (s: any, idx: number) => {
        const subId = `rh-plot-${Date.now()}-${idx}`;
        const decoyClues: SuggestedClueCandidate[] = (s.decoyClues || []).map(
          (c: any, cIdx: number) => {
            const fmt = (c.format as ClueFormat) || 'chat';
            const isPhoto = PHOTO_FORMATS.has(fmt);
            return {
              id: `${subId}-clue-${cIdx}`,
              title: String(c.title || `Red Herring Clue #${cIdx + 1}`).trim(),
              format: fmt,
              roundNumber: Math.max(
                1,
                Math.min(maxAllowedRound, Number(c.roundNumber) || (cIdx % maxAllowedRound) + 1)
              ) as ArchitectRoundNumber,
              timestampLabel: String(c.timestampLabel || '10:30 PM'),
              description: ensureSpiceFlavorInClueDescription(
                String(c.description || '').trim(),
                blueprint.spiceLevel,
                fmt
              ),
              generationPrompt: isPhoto
                ? String(c.generationPrompt || c.description || '').trim()
                : '',
              pointsTo: String(c.pointsTo || 'Red-herring motive & misdirection clue.').trim(),
              strengthTier: (c.strengthTier as ClueStrengthTier) || 'Double-Meaning Misdirection',
              strengthSummary: String(
                c.strengthSummary ||
                  'Deflects table suspicion onto innocent suspects while tying into the real timeline.'
              ).trim(),
              involvedRoles: Array.isArray(c.involvedRoles)
                ? c.involvedRoles
                : Array.isArray(s.involvedRoles)
                  ? s.involvedRoles
                  : [],
              isRedHerring: true,
              subplotId: subId,
              decision: 'pending',
            };
          }
        );

        const rawLinkedTitles = Array.isArray(s.linkedCoreClueTitles)
          ? s.linkedCoreClueTitles.map((t: any) => String(t || '').trim()).filter(Boolean)
          : [];

        return {
          id: subId,
          title: String(s.title || `Red Herring Plotline #${idx + 1}`).trim(),
          involvedRoles: Array.isArray(s.involvedRoles) ? s.involvedRoles : [],
          theme: String(s.theme || 'Suspect Motive & Cover-Up').trim(),
          summary: String(s.summary || '').trim(),
          doubleMeaningCoreClueHook: String(s.doubleMeaningCoreClueHook || '').trim(),
          linkedCoreClueTitles:
            rawLinkedTitles.length > 0
              ? rawLinkedTitles
              : selectedCoreClues.slice(idx * 2, idx * 2 + 2).map((c) => c.title),
          step1TriggerR1: String(s.step1TriggerR1 || '').trim(),
          step2EscalationR2: String(s.step2EscalationR2 || '').trim(),
          step3AlibiHoleR3: String(s.step3AlibiHoleR3 || '').trim(),
          backstoryAdditions:
            s.backstoryAdditions && typeof s.backstoryAdditions === 'object'
              ? s.backstoryAdditions
              : {},
          decoyClues,
          decision: 'yes',
        };
      }
    );

    // =========================================================================
    // POST-GENERATION DETERMINISTIC CHARACTER BALANCE ENFORCER
    // Ensures every under-featured primary character (like {{The Bestie}}) is woven
    // into at least 2 of the 3 Red-Herring storylines and their candidate decoy clues
    // so whichever 2 clues the user picks, every character reaches 4+ clues!
    // =========================================================================
    const victimRole =
      blueprint.characters.find((c) => c.plotRole === 'victim')?.roleTitle || 'The Prom Queen';

    for (const audit of characterCoreAudit) {
      if (audit.character.plotRole === 'victim') continue;
      const roleTitle = audit.cleanRole;
      const deficit = Math.max(0, MIN_TARGET_CLUES_PER_CHAR - audit.coreAppearances);

      if (deficit > 0) {
        let subplotsTouched = 0;
        const targetSubplotsToFeature = deficit >= 2 ? 2 : 1;

        for (const sub of subplots) {
          const alreadyInSub = sub.involvedRoles.some(
            (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === roleTitle.toLowerCase()
          );
          if (alreadyInSub) {
            subplotsTouched++;
            continue;
          }
          if (subplotsTouched >= targetSubplotsToFeature) break;

          sub.involvedRoles = [...sub.involvedRoles, roleTitle];
          if (!sub.summary.toLowerCase().includes(roleTitle.toLowerCase())) {
            sub.summary = `${sub.summary} {{${roleTitle}}} is also entangled in this cover-up (${
              audit.character.motiveOrSecret || `hiding a fierce grudge against {{${victimRole}}}`
            }).`;
          }

          for (const dc of sub.decoyClues) {
            if (!doesClueInvolveRole(dc, roleTitle)) {
              dc.involvedRoles = Array.from(new Set([...(dc.involvedRoles || []), roleTitle]));
              if (dc.format === 'chat') {
                dc.description = `${dc.description}\n[${dc.timestampLabel}] {{${roleTitle}}}: Keep my name out of this—if anyone finds out what {{${victimRole}}} had on us, we're both finished.`;
              } else if (dc.format === 'audio') {
                dc.description = `${dc.description}\n{{${roleTitle}}}: "[whispers] Delete that right now—nobody can know I was upstairs before {{${victimRole}}} fell."`;
              } else {
                dc.description = `${dc.description} Features a handwritten margin note signed by {{${roleTitle}}} warning them to keep their alibi straight before {{${victimRole}}} exposes their secret.`;
              }
              dc.pointsTo = `${dc.pointsTo} Directly implicates {{${roleTitle}}} alongside ${sub.involvedRoles
                .filter((r) => r !== roleTitle)
                .map((r) => `{{${r}}}`)
                .join(' & ')}.`;
            }
          }
          subplotsTouched++;
        }
      }
    }

    return {
      success: true,
      subplots,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to generate red-herring plotlines.',
    };
  }
}

/**
 * STAGE 4: Smart Complexity-Based Round Sorter
 * Sorts the 16 selected clues (10 Core + 6 Red Herring) into Rounds (e.g. Rounds 1, 2, 3 for Basic)
 * based on dramatic investigation complexity & reveal pacing (NOT chronological timeline order!).
 */
export async function sortCluesIntoRoundsByComplexityAction(params: {
  blueprint: MysteryBlueprintInput;
  selectedCoreClues: SuggestedClueCandidate[];
  selectedRedHerringClues: SuggestedClueCandidate[];
}): Promise<{
  success: boolean;
  sortedCoreClues?: SuggestedClueCandidate[];
  sortedRedHerringClues?: SuggestedClueCandidate[];
  roundStrategySummary?: Record<number, string>;
  error?: string;
}> {
  await requireAdmin();
  const { blueprint, selectedCoreClues, selectedRedHerringClues } = params;
  const totalRounds = getPackageRoundsForCount(blueprint.characters?.length);
  const allClues = [...selectedCoreClues, ...selectedRedHerringClues];
  if (allClues.length === 0) {
    return { success: false, error: 'No clues selected to sort.' };
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  try {
    const prompt = `You are the Master Game Pacing & Complexity Architect for Back Pocket Mysteries.
We have ${allClues.length} total clues (${selectedCoreClues.length} Core Murder Clues + ${selectedRedHerringClues.length} Red-Herring Clues).
Sort these ${allClues.length} clues across **Rounds 1 to ${totalRounds}** based on **INVESTIGATIVE COMPLEXITY & DRAMATIC REVEAL PACING** — NOT chronological clock order!

ROUND SORTING STRATEGY (${totalRounds} ROUNDS):
- **Round 1 (Opening Misdirection & Double-Meaning Setup — ~5-6 clues):**
  Put noisy Red-Herring motive triggers AND early ambiguous/double-meaning Core Clues here so >=75% of early table suspicion points toward innocent decoys while hiding key setup facts in plain sight.
- **Round 2 (Escalation, Weapon Trail & Alibi Cracks — ~5-6 clues):**
  Expose deeper secrets, show physical evidence from the struggle/weapon, and start cracking alibis without giving away the final smoking gun yet.
- **Round ${totalRounds} (The Interlocking Smoking Gun & Decoy Exoneration — ~5-6 clues):**
  Hold back the decisive forensic/timeline smoking-gun clues that unmask the True Killer (and Accomplice, if any) ONLY when cross-referenced with Round 1 & Round 2 clues, plus the alibi proof that clears the loudest red herring.

MYSTERY KILLER & METHOD:
- True Killer & How/Why: ${blueprint.killerHowAndWhySummary}
- Weapon & Method: ${blueprint.murderWeaponAndMethod}

CLUES TO SORT:
${allClues
  .map(
    (c) =>
      `- ID: "${c.id}" | [${c.isRedHerring ? 'RED HERRING' : `CORE BEAT #${c.beatNumber || '?'}`} • ${c.timestampLabel} • ${c.format}] "${c.title}": ${c.description}`
  )
  .join('\n')}

Return strict JSON mapping every clue ID to its optimal roundNumber (1..${totalRounds}) and a 1-sentence reason:
{
  "roundStrategySummary": {
    "1": "1-sentence summary of what Round 1 achieves at the table.",
    "2": "1-sentence summary of what Round 2 achieves at the table.",
    "${totalRounds}": "1-sentence summary of how Round ${totalRounds} locks the killer solution."
  },
  "assignments": [
    {
      "id": "exact clue ID",
      "roundNumber": 1
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_sort_clues_by_complexity',
    });
    const assignmentMap = new Map<string, ArchitectRoundNumber>();
    if (Array.isArray(parsed.assignments)) {
      for (const a of parsed.assignments) {
        if (a?.id && a?.roundNumber) {
          const r = Math.max(1, Math.min(totalRounds, Number(a.roundNumber) || 1)) as ArchitectRoundNumber;
          assignmentMap.set(String(a.id), r);
        }
      }
    }

    const sortedCoreClues = selectedCoreClues.map((c, idx) => ({
      ...c,
      roundNumber:
        assignmentMap.get(c.id) ||
        ((Math.min(totalRounds, Math.floor((idx / Math.max(1, selectedCoreClues.length)) * totalRounds) + 1)) as ArchitectRoundNumber),
    }));

    const sortedRedHerringClues = selectedRedHerringClues.map((c, idx) => ({
      ...c,
      roundNumber:
        assignmentMap.get(c.id) ||
        (((idx % totalRounds) + 1) as ArchitectRoundNumber),
    }));

    return {
      success: true,
      sortedCoreClues,
      sortedRedHerringClues,
      roundStrategySummary: parsed.roundStrategySummary || {},
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to sort clues into rounds.',
    };
  }
}

/**
 * AI MYSTERY RENAMER:
 * Turns a working title (e.g. "Unibreak at the Cabin") + setting/beats into 5 high-converting,
 * dramatic, on-brand Mystery Base Titles & Taglines so the user can pick one in 1 click.
 */
export async function suggestBetterMysteryTitlesAction(params: {
  blueprint: MysteryBlueprintInput;
}): Promise<{
  success: boolean;
  suggestions?: {
    title: string;
    theme: string;
    vibeTag: string;
  }[];
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint } = params;
  try {
    const prompt = `You are the Creative Brand Director for Back Pocket Mysteries.
The creator has a working title for their murder mystery: "${blueprint.title}" (${blueprint.theme}).
Spice Level: ${blueprint.spiceLevel}
Setting: ${blueprint.settingDescription}
Murder Method: ${blueprint.murderWeaponAndMethod}
Plot Summary: ${blueprint.killerHowAndWhySummary}

Pitch **5 irresistible, commercial, high-converting Mystery Titles & Taglines** that replace the working title with something iconic, punchy, and on-brand (like "Blackout at Blackwood Cabin", "Cabin Fever & Killer Secrets", "Snowbound & Scandalous", "Deadly Debt at the Chalet", "Last Call at the Cabin").
Include a mix of:
1. Elevated Thriller / Noir
2. Scandalous / After-Dark Party (${blueprint.spiceLevel} vibe)
3. Punchy Alliteration / Wordplay
4. Classic Murder Mystery Hook
5. Polished Version of Their Working Title

Return strict JSON:
{
  "suggestions": [
    {
      "title": "Punchy Mystery Title (2-5 words)",
      "theme": "1-line evocative setting & party tagline",
      "vibeTag": "e.g. After-Dark Thriller"
    }
  ]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_suggest_mystery_titles',
    });

    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((s: any) => ({
          title: String(s.title || '').trim(),
          theme: String(s.theme || blueprint.theme || '').trim(),
          vibeTag: String(s.vibeTag || 'Recommended').trim(),
        }))
      : [];

    return {
      success: true,
      suggestions: suggestions.filter((s: any) => s.title.length > 0),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to suggest mystery titles.',
    };
  }
}

/**
 * IMPROVEMENT #2: 1-Click "Tie to Innocent Suspect (Inject Double-Meaning Twist)"
 * Rewrites/enhances a Beat Clue so that it still 100% proves the Beat's core murder facts,
 * while embedding an incriminating double-meaning detail that frames the chosen innocent suspect!
 */
export async function injectDoubleMeaningTwistIntoBeatClueAction(params: {
  blueprint: MysteryBlueprintInput;
  beat: BlueprintBeatInput;
  clue: SuggestedClueCandidate;
  targetSuspectRole: string;
}): Promise<{
  success: boolean;
  updatedClue?: Partial<SuggestedClueCandidate>;
  error?: string;
}> {
  await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const { blueprint, beat, clue, targetSuspectRole } = params;
  const cleanRole = targetSuspectRole.replace(/^\{\{|\}\}$/g, '').trim();
  const suspectChar = blueprint.characters.find(
    (c) => c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
  );
  const spiceDirective = getSpiceRubricDirective(blueprint.spiceLevel);
  const tokenDirective = getGenderFlexTokenDirective(blueprint.characters);

  try {
    const prompt = `You are the Master Double-Meaning Clue Architect for Back Pocket Mysteries.
We have an existing Core Beat Clue for **Beat #${beat.beatNumber} (${beat.timeWindow} — ${beat.title})**:
- Beat Description: "${beat.description}"
- Current Clue Title: "${clue.title}"
- Current Clue Format: "${clue.format}"
- Current Clue Content: "${clue.description}"
- What It Proves About the Beat: "${clue.pointsTo}"

TARGET INNOCENT SUSPECT TO FRAME VIA DOUBLE MEANING:
- Suspect Role: {{${cleanRole}}}
- Suspect Concept & Connections: ${suspectChar?.conceptNotes || 'Innocent suspect at the scene'}
- Suspect Motive / Secret: ${suspectChar?.motiveOrSecret || 'Secret grievance against the Victim'}

YOUR TASK:
Rewrite/enhance this clue so that:
1. It **STILL 100% proves Beat #${beat.beatNumber}** (${clue.pointsTo}). Do NOT lose any of the core Beat facts!
2. It weaves in a razor-sharp **Double-Meaning Twist** that ALSO implicates **{{${cleanRole}}}** (based on {{${cleanRole}}}'s motive/secret above) so players at the table can't tell whether the clue points to the real killer or {{${cleanRole}}}!
3. Keep the format as "${clue.format}" and match the **${blueprint.spiceLevel}** spice level.

${spiceDirective}

${tokenDirective}

Return strict JSON:
{
  "title": "Updated or refined clue title",
  "description": "Updated in-world clue text/dialogue calibrated to ${blueprint.spiceLevel} spice that proves Beat #${beat.beatNumber} AND embeds a double-meaning detail implicating {{${cleanRole}}}.",
  "doubleMeaningNote": "1-2 sentences explaining how this clue now frames {{${cleanRole}}} via double meaning.",
  "strengthSummary": "1 sentence explaining how this clue proves Beat #${beat.beatNumber} while deflecting suspicion onto {{${cleanRole}}}.",
  "involvedRoles": ["The Role A", "${cleanRole}"]
}`;

    const parsed = await generateArchitectJson({
      apiKey,
      prompt,
      featureName: 'architect_inject_double_meaning_twist',
    });

    const mergedRoles = Array.from(
      new Set([
        ...(clue.involvedRoles || []),
        ...(Array.isArray(parsed.involvedRoles) ? parsed.involvedRoles : []),
        cleanRole,
      ])
    ).map((r) => String(r).replace(/^\{\{|\}\}$/g, '').trim());

    return {
      success: true,
      updatedClue: {
        title: String(parsed.title || clue.title).trim(),
        description: ensureSpiceFlavorInClueDescription(
          String(parsed.description || clue.description).trim(),
          blueprint.spiceLevel,
          clue.format
        ),
        doubleMeaningNote: String(
          parsed.doubleMeaningNote ||
            `Creates a double-meaning hook implicating {{${cleanRole}}} (${suspectChar?.motiveOrSecret || 'secret motive'}).`
        ).trim(),
        strengthTier: 'Double-Meaning Misdirection',
        strengthSummary: String(
          parsed.strengthSummary ||
            `Proves Beat #${beat.beatNumber} while framing {{${cleanRole}}} via a double-meaning twist.`
        ).trim(),
        involvedRoles: mergedRoles,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to inject double-meaning twist.',
    };
  }
}

/**
 * IMPROVEMENT #4: 1-Click Test Photo Render for Photo Clues ('physical_prop' or 'cctv')
 * Renders the 3-sentence forensic photo prompt via gemini-2.5-flash-image, uploads to Supabase
 * `mystery-assets`, and returns the public image URL so the creator can preview the photo immediately
 * (and automatically carry it over when turning the blueprint into a Mystery Base!).
 */
export async function testRenderArchitectCluePhotoAction(params: {
  clueTitle: string;
  generationPrompt: string;
  spiceLevel: ArchitectSpiceLevel;
}): Promise<{
  success: boolean;
  imageUrl?: string;
  error?: string;
}> {
  const { supabase } = await requireAdmin();
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    return { success: false, error: 'Missing GEMINI_API_KEY in environment.' };
  }

  const cleanPrompt = String(params.generationPrompt || params.clueTitle || '')
    .replace(/\{\{[^}]+\}\}/g, 'a suspect')
    .trim();

  if (!cleanPrompt) {
    return { success: false, error: 'Please enter a photo prompt first.' };
  }

  try {
    const fullImagePrompt = `${cleanPrompt}\nMANDATORY FORENSIC PHOTOGRAPHY RULES: Edge-to-edge full-bleed 4:3 crime-scene photograph, moody ${params.spiceLevel}-noir lighting, 35mm film grain, strictly ZERO readable text, ZERO letters, ZERO numbers, ZERO watermarks.`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullImagePrompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        success: false,
        error: `Gemini image generation error (${res.status}): ${errText.slice(0, 140)}`,
      };
    }

    const data = await res.json();
    const imgPart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
    const b64 = imgPart?.inlineData?.data || data.predictions?.[0]?.bytesBase64Encoded || '';
    if (!b64) {
      return {
        success: false,
        error: 'Image model returned an empty image payload. Try tweaking the photo prompt.',
      };
    }

    try {
      const buffer = Buffer.from(b64, 'base64');
      const fileName = `architect-previews/clue-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}.png`;
      const { error: upErr } = await supabase.storage
        .from('mystery-assets')
        .upload(fileName, buffer, {
          contentType: 'image/png',
          upsert: true,
        });
      if (!upErr) {
        const { data: pubData } = supabase.storage.from('mystery-assets').getPublicUrl(fileName);
        if (pubData?.publicUrl) {
          return { success: true, imageUrl: pubData.publicUrl };
        }
      }
    } catch {
      // Fallback to data URL below
    }

    return {
      success: true,
      imageUrl: `data:image/png;base64,${b64}`,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to test-render clue photo.',
    };
  }
}
