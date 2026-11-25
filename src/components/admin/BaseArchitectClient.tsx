'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArchitectSpiceLevel,
  CharacterPlotRole,
  BlueprintCharacterInput,
  BlueprintBeatInput,
  MysteryBlueprintInput,
  SuggestedClueCandidate,
  SuggestedRedHerringSubplot,
  AssembledFullMysteryBase,
  ArchitectRoundNumber,
  ClueStrengthTier,
  suggestCluesForSingleBeatAction,
  suggestRedHerringPlotlinesWithCluesAction,
  sortCluesIntoRoundsByComplexityAction,
  assembleAndProofreadFullBaseAction,
  transferBlueprintToDraftMysteryBaseAction,
  autoFixAssembledBaseIssuesAction,
  listDraftMysteryBasesForArchitectAction,
  loadExistingDraftIntoArchitectAction,
  parseDiagramImageIntoBlueprintAction,
  suggestStoryBeatsForCastAction,
  saveArchitectCloudWorkspaceAction,
  loadArchitectCloudWorkspaceAction,
  suggestBetterMysteryTitlesAction,
  injectDoubleMeaningTwistIntoBeatClueAction,
  testRenderArchitectCluePhotoAction,
} from '@/app/actions/base-architect';
import { ClueFormat, CLUE_FORMAT_OPTIONS } from '@/utils/clue-format';
import { recommendDifficultyFromPlotAndClues } from '@/utils/architect-difficulty-recommender';
import { RelationshipGraph } from '@/app/[locale]/(builder)/builder/mysteries/[id]/relationships/_components/RelationshipGraph';
import { ClueRenderer } from '@/components/clues/ClueRenderer';

const DEFAULT_COLORS = [
  'Hot Pink',
  'Crimson Red',
  'Electric Cyan',
  'Cobalt Blue',
  'Rose Gold',
  'Sapphire Blue',
  'Emerald Green',
  'Royal Purple',
  'Amber Gold',
  'Obsidian Black',
];

const PACKAGE_TIERS = [
  { label: 'Basic Package', players: 6, rounds: 3, sub: '4–6 Players • 3 Rounds' },
  { label: 'Premium Package', players: 10, rounds: 4, sub: '4–10 Players • 4 Rounds' },
  { label: 'Grand Package', players: 16, rounds: 5, sub: '4–16 Players • 5 Rounds' },
] as const;

const SPICE_OPTIONS: {
  level: ArchitectSpiceLevel;
  label: string;
  sub: string;
}[] = [
  { level: 'Clean', label: '✨ Clean', sub: 'SFW • 0 affairs, 0 swearing' },
  { level: 'Mild', label: '🌶️ Mild', sub: 'Affairs • PG-13 dialogue' },
  { level: 'Spicy', label: '🌶️🌶️ Spicy', sub: 'Swearing & scandals' },
  { level: 'Filthy', label: '🔥🔥🔥 Filthy', sub: '18+ After-Dark & F-bombs' },
];

function getRoundsForCount(charCount: number): 3 | 4 | 5 {
  if (charCount <= 6) return 3;
  if (charCount <= 10) return 4;
  return 5;
}

/**
 * Distinct, high-contrast color badge styling per character so you can scan any paragraph
 * and immediately see who is talking / involved without getting a headache.
 */
const CHARACTER_PILL_STYLES: {
  bg: string;
  text: string;
  border: string;
  dot: string;
  hex: string;
}[] = [
  {
    bg: 'bg-pink-100',
    text: 'text-pink-900',
    border: 'border-pink-300',
    dot: 'bg-pink-500',
    hex: '#ec4899',
  },
  {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    border: 'border-rose-300',
    dot: 'bg-rose-600',
    hex: '#e11d48',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-950',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
    hex: '#f59e0b',
  },
  {
    bg: 'bg-blue-100',
    text: 'text-blue-900',
    border: 'border-blue-300',
    dot: 'bg-blue-600',
    hex: '#2563eb',
  },
  {
    bg: 'bg-purple-100',
    text: 'text-purple-900',
    border: 'border-purple-300',
    dot: 'bg-purple-600',
    hex: '#9333ea',
  },
  {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    border: 'border-emerald-300',
    dot: 'bg-emerald-600',
    hex: '#059669',
  },
  {
    bg: 'bg-cyan-100',
    text: 'text-cyan-900',
    border: 'border-cyan-300',
    dot: 'bg-cyan-600',
    hex: '#0891b2',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-900',
    border: 'border-indigo-300',
    dot: 'bg-indigo-600',
    hex: '#4f46e5',
  },
];

/**
 * Renders any text containing {{The Role}} or {{The Role_his}} / {{The Role_sibling}} tokens
 * with bold, color-coded character pills and clean human-readable pronouns!
 */
function HighlightedMysteryText({
  text,
  characters,
  className = '',
}: {
  text: string;
  characters: BlueprintCharacterInput[];
  className?: string;
}) {
  if (!text) return null;

  // Map normalized roleTitle -> character index & info
  const roleMap = new Map<
    string,
    { char: BlueprintCharacterInput; idx: number; style: (typeof CHARACTER_PILL_STYLES)[number] }
  >();
  characters.forEach((c, idx) => {
    const clean = c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase();
    roleMap.set(clean, {
      char: c,
      idx,
      style: CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length],
    });
  });

  // Split by {{...}} tokens
  const parts = text.split(/(\{\{[^}]+\}\})/g);

  return (
    <div className={`leading-relaxed ${className}`}>
      {parts.map((part, i) => {
        if (!part.startsWith('{{') || !part.endsWith('}}')) {
          return <React.Fragment key={i}>{part}</React.Fragment>;
        }

        const inner = part.slice(2, -2).trim();
        // Check if it has a suffix like _he, _him, _his, _himself, _sibling, _spouse, _inlaw
        const suffixMatch = inner.match(
          /^(.+?)_(he|him|his|himself|sibling|spouse|inlaw)$/i
        );

        if (suffixMatch) {
          const baseRole = suffixMatch[1].trim();
          const suffix = suffixMatch[2].toLowerCase();
          const entry = roleMap.get(baseRole.toLowerCase());
          const isFemale = entry?.char.defaultGender === 'female';

          let resolvedWord = inner;
          if (suffix === 'he') resolvedWord = isFemale ? 'she' : 'he';
          else if (suffix === 'him') resolvedWord = isFemale ? 'her' : 'him';
          else if (suffix === 'his') resolvedWord = isFemale ? 'her' : 'his';
          else if (suffix === 'himself') resolvedWord = isFemale ? 'herself' : 'himself';
          else if (suffix === 'sibling') resolvedWord = isFemale ? 'sister' : 'brother';
          else if (suffix === 'spouse') resolvedWord = isFemale ? 'wife' : 'husband';
          else if (suffix === 'inlaw')
            resolvedWord = isFemale ? 'sister-in-law' : 'brother-in-law';

          const style = entry?.style || CHARACTER_PILL_STYLES[0];
          return (
            <span
              key={i}
              title={`Gender-flex token: ${part} (${baseRole})`}
              className={`font-bold underline decoration-dotted underline-offset-2 ${style.text}`}
            >
              {resolvedWord}
            </span>
          );
        }

        const entry = roleMap.get(inner.toLowerCase());
        const style = entry?.style || {
          bg: 'bg-slate-200',
          text: 'text-slate-900',
          border: 'border-slate-300',
          dot: 'bg-slate-600',
          hex: '#475569',
        };

        const roleBadge =
          entry?.char.plotRole === 'victim'
            ? '💀'
            : entry?.char.plotRole === 'killer'
              ? '🔪'
              : entry?.char.plotRole === 'assistant'
                ? '🤝'
                : '';

        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 px-2 py-0.5 mx-0.5 rounded-md text-xs font-black border ${style.bg} ${style.text} ${style.border} shadow-2xs align-baseline`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            <span>{inner}</span>
            {roleBadge && <span className="text-[10px]">{roleBadge}</span>}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Rich Editable Field that renders easy-to-read color-coded character pills by default,
 * and expands into an auto-sized textarea when you click "Edit Text" (or click directly on it).
 */
function RichTokenEditableBox({
  value,
  onChange,
  characters,
  placeholder,
  minRows = 3,
}: {
  value: string;
  onChange: (nextVal: string) => void;
  characters: BlueprintCharacterInput[];
  placeholder?: string;
  minRows?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);

  // Calculate rows dynamically so the user never has to scroll inside a tiny box
  const computedRows = Math.max(
    minRows,
    Math.min(12, Math.ceil((value?.length || 0) / 85) + 1)
  );

  if (isEditing || !value?.trim()) {
    return (
      <div className="space-y-1.5">
        <textarea
          rows={computedRows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setIsEditing(false)}
          autoFocus={isEditing}
          placeholder={placeholder}
          className="w-full rounded-xl bg-white border-2 border-brand-pink/60 px-3.5 py-2.5 text-sm text-slate-800 leading-relaxed focus:outline-none shadow-xs"
        />
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            Tip: Use{' '}
            {characters.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(`${value} {{${c.roleTitle}}}`);
                }}
                className="inline-block mr-1 px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
              >
                +{c.roleTitle}
              </button>
            ))}
          </span>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="font-bold text-brand-pink hover:underline cursor-pointer"
          >
            ✓ Done Editing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      title="Click anywhere to edit text"
      className="group relative w-full rounded-xl bg-white border border-slate-200/90 hover:border-brand-pink/50 px-4 py-3 text-sm text-slate-800 cursor-text transition shadow-2xs"
    >
      <HighlightedMysteryText text={value} characters={characters} />
      <span className="opacity-0 group-hover:opacity-100 transition absolute top-2 right-2.5 px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600 border border-slate-200">
        ✎ Click to Edit
      </span>
    </div>
  );
}

/**
 * Automatically builds the live RelationshipGraph nodes & edges from the blueprint's characters
 * and their `conceptNotes` so the user gets their interactive character relationship web right on Stage 1!
 */
function buildLiveRelationshipGraphData(characters: BlueprintCharacterInput[]) {
  const graphCharacters = characters.map((c) => ({
    id: c.id,
    name: c.roleTitle,
    gender: c.defaultGender,
    is_victim: c.plotRole === 'victim',
    plot_role: c.plotRole,
    profile_data: {
      role_title: c.roleTitle,
      color: c.color,
      bio: c.conceptNotes,
    },
  }));

  const relationships: any[] = [];
  const pairSeen = new Set<string>();

  // Parse relationship phrases from conceptNotes between character A and any mentioned {{Character B}}
  for (const charA of characters) {
    const sentences = (charA.conceptNotes || '').split(/[.;\n]+/);
    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      for (const charB of characters) {
        if (charA.id === charB.id) continue;
        const cleanB = charB.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
        if (
          trimmed.toLowerCase().includes(`{{${cleanB.toLowerCase()}}}`) ||
          trimmed.toLowerCase().includes(cleanB.toLowerCase())
        ) {
          const id1 = charA.id < charB.id ? charA.id : charB.id;
          const id2 = charA.id < charB.id ? charB.id : charA.id;
          const key = `${id1}__${id2}`;

          // Extract the dynamic label from the sentence
          let dynamicLabel = 'Connected';
          const lower = trimmed.toLowerCase();
          if (lower.includes('sibling')) dynamicLabel = 'Siblings';
          else if (lower.includes('secret romance') || lower.includes('hooking up') || lower.includes('sleeping with'))
            dynamicLabel = 'Secret Romance';
          else if (lower.includes('dating')) dynamicLabel = 'Dating';
          else if (lower.includes('exes') || lower.includes('ex ')) dynamicLabel = 'Exes';
          else if (lower.includes('crush')) dynamicLabel = 'Secret Crush';
          else if (lower.includes('enemies') || lower.includes('enemy')) dynamicLabel = 'Sworn Enemies';
          else if (lower.includes('co-captain')) dynamicLabel = 'Team Co-Captains';
          else if (lower.includes('work together') || lower.includes('works together'))
            dynamicLabel = 'Work Together';
          else if (lower.includes('best friend') || lower.includes('besties'))
            dynamicLabel = 'Best Friends';
          else if (lower.includes('friend')) dynamicLabel = 'Friends';

          relationships.push({
            id: `rel-${key}-${relationships.length}`,
            character_a_id: charA.id,
            character_b_id: charB.id,
            know_each_other: true,
            dynamics: [dynamicLabel],
            notes: trimmed,
          });
          pairSeen.add(key);
        }
      }
    }
  }

  // Ensure every pair in a 6-player cast has a connection line if not already detected
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const id1 = characters[i].id < characters[j].id ? characters[i].id : characters[j].id;
      const id2 = characters[i].id < characters[j].id ? characters[j].id : characters[i].id;
      const key = `${id1}__${id2}`;
      if (!pairSeen.has(key)) {
        relationships.push({
          id: `rel-fallback-${key}`,
          character_a_id: characters[i].id,
          character_b_id: characters[j].id,
          know_each_other: true,
          dynamics: ['Friends'],
          notes: `{{${characters[i].roleTitle}}} and {{${characters[j].roleTitle}}} are part of the same inner circle.`,
        });
      }
    }
  }

  return { graphCharacters, relationships };
}

/**
 * Exact preset from the user's "UNIBREAK AT THE CABIN" (FILTHY) relationship web diagram
 */
export function createUnibreakCabinBlueprint(): MysteryBlueprintInput {
  return {
    id: 'unibreak-at-the-cabin',
    title: 'Unibreak at the Cabin',
    theme: 'Rowdy Uni Break Ski & Mountain Cabin Getaway',
    settingDescription:
      'Six uni friends rent an isolated two-story timber mountain cabin for a wild mid-semester break of tequila, secret hookups, and cutthroat campus rivalries. By 11:45 PM, a mountain storm traps everyone inside—and {{The Prom Queen}} is found dead on the stone patio below the second-story balcony.',
    spiceLevel: 'Filthy',
    complexity: 'hard',
    murderTimeWindow: '11:28 PM',
    murderWeaponAndMethod:
      'Heavy cast-iron fireplace poker from the upstairs balcony chiminea: {{The Co-Captain}} struck the first non-fatal blow across {{The Prom Queen}}\'s temple at 11:18 PM in a blind panic over {{The Prom Queen_his}} phone, and {{The Girlfriend}} delivered the fatal strike at 11:28 PM before pushing {{The Prom Queen_him}} over the second-story balcony railing onto the stone patio below.',
    killerHowAndWhySummary:
      '{{The Prom Queen}} strung {{The Co-Captain}} along to steal {{The Co-Captain_his}} and {{The Teammate}}\'s varsity sports-betting ledger, then laughed in {{The Co-Captain}}\'s face in front of {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} and revealed {{The Prom Queen_he}} was secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}—threatening to leak both the incriminating bedroom recording and the betting ledger at midnight. After {{The Co-Captain}} snapped on the balcony at 11:18 PM and knocked {{The Prom Queen}} unconscious with a cast-iron fireplace poker, {{The Girlfriend}} sent {{The Co-Captain}} inside for a living-room alibi, finished {{The Prom Queen}} off with the poker at 11:28 PM, and pushed {{The Prom Queen_him}} off the balcony.',
    insideJokesOrProps:
      'Cast-iron fireplace poker, varsity sports-betting ledger, cracked iPhone in the snowbank, ripped varsity chain on the balcony railing.',
    characters: [
      {
        id: 'char-1',
        roleTitle: 'The Prom Queen',
        defaultGender: 'female',
        plotRole: 'victim',
        color: 'Hot Pink',
        conceptNotes:
          'Siblings with {{The Brother}}. Best friends with {{The Bestie}}. Secret romance with {{The Teammate}}. Sworn enemies with {{The Girlfriend}}. Object of {{The Co-Captain}}\'s obsessive crush.',
        motiveOrSecret:
          'Used {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to steal the varsity sports-betting ledger from {{The Co-Captain_his}} jacket, while secretly hooking up with {{The Girlfriend}}\'s partner {{The Teammate}} and threatening to leak both at midnight.',
        outfitNotes: 'Faux-fur aprés-ski crop jacket, satin slip top & rhinestone tiara headband',
      },
      {
        id: 'char-2',
        roleTitle: 'The Girlfriend',
        defaultGender: 'female',
        plotRole: 'killer',
        color: 'Crimson Red',
        conceptNotes:
          'Dating {{The Teammate}}. Siblings with {{The Co-Captain}}. Sworn enemies with {{The Prom Queen}}. Friends with {{The Bestie}} and {{The Brother}}.',
        motiveOrSecret:
          'Found {{The Girlfriend_his}} {{The Co-Captain_sibling}} {{The Co-Captain}} panicking over a bleeding, semi-conscious {{The Prom Queen}} on the balcony at 11:25 PM; sent {{The Co-Captain}} inside for an alibi, delivered the fatal strike with the cast-iron poker at 11:28 PM, and pushed {{The Prom Queen}} off the balcony.',
        outfitNotes: 'Sleek crimson velvet tracksuit, gold hoop earrings & dark berry lipstick',
      },
      {
        id: 'char-3',
        roleTitle: 'The Co-Captain',
        defaultGender: 'male',
        plotRole: 'assistant',
        color: 'Electric Cyan',
        conceptNotes:
          'Co-captains of the varsity sport team with {{The Teammate}}. Siblings with {{The Girlfriend}}. Exes with {{The Bestie}}. Secretly has a huge crush on {{The Prom Queen}}. Friends with {{The Brother}}.',
        motiveOrSecret:
          'Cornered {{The Prom Queen}} on the upstairs balcony at 11:10 PM to get {{The Co-Captain_his}} stolen sports-betting ledger and phone recording back; snapped at 11:18 PM and struck {{The Prom Queen}} with the cast-iron poker before {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} took over and finished the kill.',
        outfitNotes: 'Uni athletic team letterman bomber, compression shirt & silver whistle chain',
      },
      {
        id: 'char-4',
        roleTitle: 'The Teammate',
        defaultGender: 'male',
        plotRole: 'innocent',
        color: 'Cobalt Blue',
        conceptNotes:
          'Dating {{The Girlfriend}} while having a filthy secret romance with {{The Prom Queen}}. Co-captains of the sport team with {{The Co-Captain}}. Besties with {{The Brother}}. Works together with {{The Bestie}}.',
        motiveOrSecret:
          'Secretly sleeping with {{The Prom Queen}} behind {{The Girlfriend}}\'s and {{The Brother}}\'s backs, implicated in the varsity betting ledger with {{The Co-Captain}}, and skimming cash at work with {{The Bestie}}.',
        outfitNotes: 'Open flannel overshirt, fitted black tee, gold watch & varsity ring',
      },
      {
        id: 'char-5',
        roleTitle: 'The Bestie',
        defaultGender: 'female',
        plotRole: 'innocent',
        color: 'Rose Gold',
        conceptNotes:
          'Best friends with {{The Prom Queen}}. Exes with {{The Co-Captain}}. Works together with {{The Teammate}}. Friends with {{The Brother}} and {{The Girlfriend}}.',
        motiveOrSecret:
          'Bitter that her best friend {{The Prom Queen}} toyed with her ex {{The Co-Captain}}, and terrified because {{The Prom Queen}} found receipts proving {{The Bestie}} and {{The Teammate}} skimmed $18,000 where they work together.',
        outfitNotes: 'Oversized metallic puffer vest, black bodycon mini dress & shearling boots',
      },
      {
        id: 'char-6',
        roleTitle: 'The Brother',
        defaultGender: 'male',
        plotRole: 'innocent',
        color: 'Sapphire Blue',
        conceptNotes:
          'Siblings with {{The Prom Queen}}. Besties with {{The Teammate}}. Friends with {{The Bestie}}, {{The Co-Captain}}, and {{The Girlfriend}}.',
        motiveOrSecret:
          'Secretly blew $25,000 from his and {{The Prom Queen}}\'s family cabin trust fund on underground bets and weekend party favors, and fought furiously with {{The Prom Queen}} when {{The Prom Queen_he}} threatened to cut him off.',
        outfitNotes: 'Vintage varsity fleece jacket, backwards cap & heavy silver chain',
      },
    ],
    beats: [
      {
        beatNumber: 1,
        title: 'The Bedroom Setup & Stolen Ledger',
        timeWindow: '9:15 PM',
        phase: 'pre_crime',
        description:
          '{{The Prom Queen}} uses {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to lure {{The Co-Captain_him}} into the upstairs cabin bedroom, recording an incriminating late-night confession and stealing the varsity sports-betting ledger from {{The Co-Captain_his}} jacket.',
      },
      {
        beatNumber: 2,
        title: 'The Humiliation & Midnight Ultimatum',
        timeWindow: '10:15 PM',
        phase: 'pre_crime',
        description:
          'When {{The Co-Captain}} and {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} confront {{The Prom Queen}} to get the ledger back, {{The Prom Queen}} laughs in {{The Co-Captain}}\'s face, reveals {{The Prom Queen_he}} has been secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}, and threatens to drop the bedroom recording and betting ledger to the entire university at midnight.',
      },
      {
        beatNumber: 3,
        title: 'The Upstairs Balcony Confrontation',
        timeWindow: '11:10 PM',
        phase: 'pre_crime',
        description:
          'Desperate to stop the midnight upload, {{The Co-Captain}} corners {{The Prom Queen}} out on the isolated second-story cabin balcony to wrestle {{The Prom Queen_his}} phone away, sparking a fierce physical struggle when {{The Prom Queen}} scratches {{The Co-Captain_his}} neck and queues the files to send.',
      },
      {
        beatNumber: 4,
        title: 'The First Strike With the Fireplace Poker',
        timeWindow: '11:18 PM',
        phase: 'crime',
        description:
          'In a blind panic, {{The Co-Captain}} grabs the heavy cast-iron fireplace poker beside the balcony chiminea and strikes {{The Prom Queen}} across the temple, knocking {{The Prom Queen_him}} unconscious onto the timber deck while {{The Prom Queen_his}} phone locks.',
      },
      {
        beatNumber: 5,
        title: 'The Fatal Blow & Balcony Drop',
        timeWindow: '11:28 PM',
        phase: 'crime',
        description:
          '{{The Girlfriend}} steps onto the balcony and finds a shaken {{The Co-Captain}} frozen as {{The Prom Queen}} begins groaning; to save {{The Girlfriend_his}} {{The Co-Captain_sibling}} and destroy {{The Girlfriend_his}} enemy, {{The Girlfriend}} sends {{The Co-Captain}} inside for a living-room alibi, delivers the fatal strike with the cast-iron poker, smashes the phone, and pushes {{The Prom Queen}} over the second-story railing onto the stone patio below.',
      },
    ],
  };
}

/**
 * Helper: Returns true ONLY for clue formats that actually generate an AI Evidence Photo ('physical_prop' or 'cctv').
 * All other formats ('chat', 'audio', 'receipt', 'handwritten_note', 'search_log', 'social_post', 'document', 'medical_rx', 'call_sheet')
 * render as native interactive UI templates or ElevenLabs voice notes and should NOT have an AI photo prompt!
 */
function isPhotoClueFormat(fmt: ClueFormat): boolean {
  return fmt === 'physical_prop' || fmt === 'cctv';
}

function getClueMediumCategory(fmt: ClueFormat): 'photo' | 'audio' | 'text' {
  if (fmt === 'physical_prop' || fmt === 'cctv') return 'photo';
  if (fmt === 'audio') return 'audio';
  return 'text';
}

function buildDefaultDetailedPhotoPrompt(clueTitle: string, clueDesc: string, spiceLevel: ArchitectSpiceLevel): string {
  const cleanTitle = clueTitle.replace(/\{\{[^}]+\}\}/g, 'the suspect');
  const cleanDesc = clueDesc.replace(/\{\{[^}]+\}\}/g, 'the suspect').slice(0, 140);
  const mood =
    spiceLevel === 'Filthy'
      ? 'Moody after-dark neon-noir rim lighting, deep crimson and amber shadows, sultry luxury party atmosphere, 35mm film grain'
      : spiceLevel === 'Spicy'
        ? 'High-contrast dramatic noir lighting, warm tungsten reflections and deep shadows, 35mm film grain'
        : 'Classic Agatha Christie detective tabletop lighting, warm amber lamplight, crisp forensic clarity, 35mm film grain';
  return `Close-up 50mm f/1.8 macro forensic crime-scene photograph of ${cleanTitle} (${cleanDesc}). Shot at a 45-degree tabletop angle with shallow depth of field focusing on the physical evidence texture and forensic trace. ${mood}, photorealistic 8k, strictly zero readable text or phone screens.`;
}

const UNIBREAK_BEAT_SUBFACTS: Record<number, [string, string, string]> = {
  1: [
    'Upstairs Bedroom Lure (9:15 PM)',
    'Stolen Varsity Betting Ledger From Jacket',
    '$42k Point-Shaving & $25k Debt Leverage',
  ],
  2: [
    '{{The Girlfriend}} Discovers Bedroom Hookup (10:15 PM)',
    'Sibling Cover-Up Pact ({{The Girlfriend}} & {{The Co-Captain}})',
    'Shared Target Shift Onto {{The Prom Queen}}',
  ],
  3: [
    'Isolated 2nd-Story Balcony Confrontation (11:10 PM)',
    'Physical Struggle & Ripped Gold Chain / Torn Velvet',
    'Live Blackmail Upload Threat by {{The Prom Queen}}',
  ],
  4: [
    'Cast-Iron Chiminea Poker First Strike (11:18 PM)',
    'Non-Fatal Temple Knockout (Victim Still Breathing)',
    "Victim's Phone Locks on Balcony Timber Deck",
  ],
  5: [
    '{{The Girlfriend}} Sends {{The Co-Captain}} Inside for Alibi',
    'Fatal Second Poker Strike & Smashed Phone (11:28 PM)',
    '2nd-Story Balcony Push Onto Stone Patio',
  ],
};

function getBeatSubFactsForBeat(
  beat: BlueprintBeatInput,
  blueprintId?: string,
  candidates?: SuggestedClueCandidate[]
): [string, string, string] {
  if (blueprintId === 'unibreak-at-the-cabin' && UNIBREAK_BEAT_SUBFACTS[beat.beatNumber]) {
    return UNIBREAK_BEAT_SUBFACTS[beat.beatNumber];
  }
  const uniqueFromCandidates: string[] = [];
  for (const c of candidates || []) {
    for (const pt of c.coveredBeatPoints || []) {
      const trimmed = pt.trim();
      if (
        trimmed &&
        !uniqueFromCandidates.some((u) => u.toLowerCase() === trimmed.toLowerCase())
      ) {
        uniqueFromCandidates.push(trimmed);
      }
    }
  }
  if (uniqueFromCandidates.length >= 3) {
    return [uniqueFromCandidates[0], uniqueFromCandidates[1], uniqueFromCandidates[2]];
  }
  if (UNIBREAK_BEAT_SUBFACTS[beat.beatNumber]) {
    return UNIBREAK_BEAT_SUBFACTS[beat.beatNumber];
  }
  return [
    `Timestamp & Presence (${beat.timeWindow})`,
    `Physical Action & Evidence (${beat.title})`,
    `Motive Escalation & Suspect Impact`,
  ];
}

function getClueCoverageMetadata(
  clue: SuggestedClueCandidate,
  optionIdx: number,
  subFacts: [string, string, string]
): {
  strengthTier: ClueStrengthTier;
  strengthBadgeStyle: string;
  strengthSummary: string;
  coveredSubFacts: string[];
  missingSubFacts: string[];
} {
  const isPhoto = isPhotoClueFormat(clue.format);
  const strengthTier: ClueStrengthTier =
    clue.strengthTier ||
    (isPhoto
      ? 'Forensic Anchor'
      : clue.format === 'audio'
        ? 'Timeline & Alibi Lock'
        : optionIdx % 2 === 0
          ? 'Motive & Escalation Proof'
          : 'Double-Meaning Misdirection');

  const strengthBadgeStyle =
    strengthTier === 'Forensic Anchor'
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : strengthTier === 'Timeline & Alibi Lock'
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : strengthTier === 'Motive & Escalation Proof'
          ? 'bg-amber-100 text-amber-900 border-amber-200'
          : 'bg-purple-100 text-purple-800 border-purple-200';

  // Determine which 2 of the 3 Beat Sub-Facts this option covers
  let coveredSubFacts: string[] = [];
  if (Array.isArray(clue.coveredBeatPoints) && clue.coveredBeatPoints.length > 0) {
    const matched = subFacts.filter((sf) =>
      clue.coveredBeatPoints!.some(
        (cp) =>
          cp.toLowerCase() === sf.toLowerCase() ||
          sf.toLowerCase().includes(cp.toLowerCase()) ||
          cp.toLowerCase().includes(sf.toLowerCase())
      )
    );
    if (matched.length > 0) {
      coveredSubFacts = matched;
    }
  }
  if (coveredSubFacts.length === 0) {
    // Deterministic 2-of-3 coverage pairing so complementary options cover 100% of the Beat:
    // Option #1 & #4 -> Sub-Fact 1 + Sub-Fact 2
    // Option #2 & #5 -> Sub-Fact 2 + Sub-Fact 3
    // Option #3      -> Sub-Fact 1 + Sub-Fact 3
    if (optionIdx % 3 === 0) {
      coveredSubFacts = [subFacts[0], subFacts[1]];
    } else if (optionIdx % 3 === 1) {
      coveredSubFacts = [subFacts[1], subFacts[2]];
    } else {
      coveredSubFacts = [subFacts[0], subFacts[2]];
    }
  }

  const missingSubFacts = subFacts.filter((sf) => !coveredSubFacts.includes(sf));

  const defaultStrengthSummary =
    strengthTier === 'Forensic Anchor'
      ? `Adds hard physical/visual forensic proof for ${coveredSubFacts.join(' & ')} at ${clue.timestampLabel}.`
      : strengthTier === 'Timeline & Alibi Lock'
        ? `Locks the exact ${clue.timestampLabel} timeline window and voices/presence for ${coveredSubFacts.join(' & ')}.`
        : strengthTier === 'Motive & Escalation Proof'
          ? `Exposes the direct motive and escalation behind ${coveredSubFacts.join(' & ')}.`
          : `Proves ${coveredSubFacts.join(' & ')} while casting strong double-meaning suspicion onto innocent suspects.`;

  return {
    strengthTier,
    strengthBadgeStyle,
    strengthSummary: clue.strengthSummary || defaultStrengthSummary,
    coveredSubFacts,
    missingSubFacts,
  };
}

function analyzeBeatSelectionCoverage(
  beat: BlueprintBeatInput,
  candidates: SuggestedClueCandidate[],
  blueprintId?: string
) {
  const subFacts = getBeatSubFactsForBeat(beat, blueprintId, candidates);
  const candidateMeta = candidates.map((c, idx) => ({
    clue: c,
    optionNum: idx + 1,
    ...getClueCoverageMetadata(c, idx, subFacts),
  }));

  const selectedMeta = candidateMeta.filter((m) => m.clue.decision === 'yes');

  const subFactStatuses = subFacts.map((fact) => {
    const coveredBySelectedOptionNums = selectedMeta
      .filter((m) => m.coveredSubFacts.includes(fact))
      .map((m) => m.optionNum);
    const coveredByAllOptionNums = candidateMeta
      .filter((m) => m.coveredSubFacts.includes(fact))
      .map((m) => m.optionNum);
    return {
      fact,
      isCoveredBySelected: coveredBySelectedOptionNums.length > 0,
      coveredBySelectedOptionNums,
      coveredByAllOptionNums,
      isPoolGap: coveredByAllOptionNums.length === 0,
    };
  });

  const coveredCount = subFactStatuses.filter((s) => s.isCoveredBySelected).length;
  const coveragePct = Math.round((coveredCount / subFacts.length) * 100);
  const uncoveredSubFacts = subFactStatuses
    .filter((s) => !s.isCoveredBySelected)
    .map((s) => s.fact);
  const poolGapSubFacts = subFactStatuses.filter((s) => s.isPoolGap).map((s) => s.fact);
  const isWholeBeatCovered = selectedMeta.length >= 2 && coveredCount === subFacts.length;

  // Find which unselected options cover the remaining uncovered sub-facts
  const complementaryOptions = candidateMeta.filter(
    (m) =>
      m.clue.decision !== 'yes' &&
      uncoveredSubFacts.some((uf) => m.coveredSubFacts.includes(uf))
  );

  // If 2+ clues are selected and there is STILL an uncovered sub-fact (meaning the user picked 2 overlapping clues),
  // compute a 1-click swap recommendation!
  let recommendedSwap: {
    dropClueId: string;
    dropOptionNum: number;
    addClueId: string;
    addOptionNum: number;
    addTitle: string;
    missingFact: string;
  } | null = null;

  if (selectedMeta.length >= 2 && uncoveredSubFacts.length > 0 && complementaryOptions.length > 0) {
    const redundantPick = selectedMeta[selectedMeta.length - 1];
    const bestReplacement = complementaryOptions[0];
    recommendedSwap = {
      dropClueId: redundantPick.clue.id,
      dropOptionNum: redundantPick.optionNum,
      addClueId: bestReplacement.clue.id,
      addOptionNum: bestReplacement.optionNum,
      addTitle: bestReplacement.clue.title,
      missingFact: uncoveredSubFacts.join(' & '),
    };
  }

  return {
    subFacts,
    candidateMeta,
    selectedMeta,
    subFactStatuses,
    coveredCount,
    coveragePct,
    uncoveredSubFacts,
    poolGapSubFacts,
    isWholeBeatCovered,
    complementaryOptions,
    recommendedSwap,
  };
}

/**
 * Pre-seeded Filthy Core Clues for Beats 1–5 of "Unibreak at the Cabin"
 * - Non-photo clues ('chat', 'audio', 'handwritten_note', 'search_log', 'social_post', 'document') have generationPrompt: ''
 * - Photo clues ('physical_prop', 'cctv') have rich 3-sentence forensic camera & lighting briefs
 */
function createUnibreakInitialBeatCluesMap(): Record<number, SuggestedClueCandidate[]> {
  return {
    1: [
      {
        id: 'uni-b1-c1',
        beatNumber: 1,
        title: 'Upstairs Bedroom Voice Memo Recording',
        format: 'audio',
        roundNumber: 1,
        timestampLabel: '9:18 PM',
        description:
          'Recording Duration: 21.5 Seconds\n{{The Prom Queen}}: "[laughs] {{The Co-Captain}} is such a gullible fucking puppy. Pour me another tequila shot while I try on your varsity jacket, babe."\n{{The Co-Captain}}: "[whispers] Wait—don\'t dig in the inside pocket, {{The Prom Queen}}, put that black notebook back!"\n{{The Prom Queen}}: "[sarcastic] Relax, your secret betting ledger is safe with me... for now."',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #1: {{The Prom Queen}} lured {{The Co-Captain}} upstairs at 9:15 PM and stole the varsity betting ledger from {{The Co-Captain_his}} jacket.',
        doubleMeaningNote:
          'Makes {{The Bestie}} (who is {{The Co-Captain}}\'s jealous ex) look furious that {{The Co-Captain}} was in {{The Prom Queen}}\'s bedroom.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Bestie'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b1-c2',
        beatNumber: 1,
        title: 'Torn Page From the Varsity Betting Ledger',
        format: 'handwritten_note',
        roundNumber: 1,
        timestampLabel: '9:20 PM',
        description:
          'A crumpled notebook page found tucked inside {{The Prom Queen}}\'s clutch: lists illegal point-shaving payouts totaling $42,000 signed with the initials of co-captains {{The Co-Captain}} and {{The Teammate}}, plus an unpaid $25,000 tab owed by {{The Brother}}.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #1: Confirms the exact varsity sports-betting ledger {{The Prom Queen}} stole from {{The Co-Captain}} in the upstairs bedroom.',
        doubleMeaningNote:
          'Directly implicates {{The Teammate}} and {{The Brother}} in massive illegal gambling debts, giving both innocent suspects a huge motive to kill {{The Prom Queen}}.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Teammate', 'The Brother'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b1-c3',
        beatNumber: 1,
        title: 'Panicked Text From {{The Co-Captain}} to {{The Teammate}}',
        format: 'chat',
        roundNumber: 1,
        timestampLabel: '9:32 PM',
        description:
          '[9:32 PM] {{The Co-Captain}}: Bro we are so fucked. I just left {{The Prom Queen}}\'s upstairs room and the black ledger is gone from my inside pocket.\n[9:33 PM] {{The Teammate}}: What the fuck were you doing in {{The Prom Queen_his}} room?! Get that fucking book back tonight or we\'re both expelled.\n[Status: SEEN]',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #1: {{The Co-Captain}} realized immediately after leaving the upstairs bedroom that {{The Prom Queen}} stole the ledger.',
        doubleMeaningNote:
          'Puts {{The Teammate}} on notice at 9:32 PM that {{The Teammate_his}} sports career is about to be destroyed too.',
        involvedRoles: ['The Co-Captain', 'The Teammate', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b1-c4',
        beatNumber: 1,
        title: 'Ransacked Varsity Letterman Jacket on the Master Bed',
        format: 'physical_prop',
        roundNumber: 1,
        timestampLabel: '9:15 PM',
        description:
          'Physical crime-scene exhibit on the upstairs master bed: {{The Co-Captain}}\'s blue varsity letterman bomber jacket turned inside-out on tangled silk sheets beside two crystal tequila shot glasses and a spilled rhinestone tiara headband.',
        generationPrompt:
          'Close-up 50mm f/1.8 forensic crime-scene photograph of a blue wool varsity letterman bomber jacket lying turned inside-out on rumpled charcoal silk bedsheets in a timber mountain cabin master bedroom. Beside the jacket sit two half-empty crystal tequila shot glasses with lime wedges and a sparkling rhinestone tiara headband. Moody after-dark neon-noir rim lighting with warm amber cabin lamp shadows and 35mm film grain, strictly zero text or phone screens.',
        pointsTo:
          'Proves Beat #1: Physical evidence of {{The Prom Queen}} luring {{The Co-Captain}} into the upstairs bedroom and rifling through {{The Co-Captain_his}} jacket pocket at 9:15 PM.',
        doubleMeaningNote:
          '{{The Teammate}} owns the exact same varsity co-captain letterman jacket.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Teammate'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b1-c5',
        beatNumber: 1,
        title: 'Cloud Folder Upload Queue Log',
        format: 'search_log',
        roundNumber: 1,
        timestampLabel: '9:25 PM',
        description:
          'Cabin Wi-Fi router device log for {{The Prom Queen}}\'s iPhone: created a shared folder titled "VARSITY_FIX_&_BEDROOM_CONFESSION" at 9:25 PM containing 14 high-res photos of the betting ledger and 1 audio file.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #1: Digital timestamp confirming {{The Prom Queen}} digitized the stolen ledger and bedroom recording by 9:25 PM.',
        doubleMeaningNote:
          'Shows 3 other cabin devices attempted to brute-force the folder password between 9:40 PM and 11:00 PM.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain'],
        isRedHerring: false,
        decision: 'pending',
      },
    ],
    2: [
      {
        id: 'uni-b2-c1',
        beatNumber: 2,
        title: 'Hallway Shouted Confrontation Captured on Smart Speaker',
        format: 'audio',
        roundNumber: 1,
        timestampLabel: '10:15 PM',
        description:
          'Recording Duration: 24.0 Seconds\n{{The Girlfriend}}: "[angry] Give my {{The Co-Captain_sibling}} {{The Co-Captain_his}} fucking ledger back right now, you little snake!"\n{{The Prom Queen}}: "[laughs] Ask your partner {{The Teammate}} how my bed feels first, bitch! At midnight the whole uni sees the ledger AND the receipts of me and {{The Teammate}}."\n{{The Co-Captain}}: "[angry] You won\'t make it to fucking midnight if you post that!"',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #2: {{The Co-Captain}} and {{The Girlfriend}} confronted {{The Prom Queen}} at 10:15 PM, and {{The Prom Queen}} exposed the affair with {{The Teammate}} plus the midnight leak ultimatum.',
        doubleMeaningNote:
          'Publicly humiliates {{The Teammate}} as a cheater right in front of {{The Girlfriend}}, giving {{The Teammate}} a desperate motive to silence {{The Prom Queen}}.',
        involvedRoles: ['The Prom Queen', 'The Girlfriend', 'The Co-Captain', 'The Teammate'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b2-c2',
        beatNumber: 2,
        title: 'Scheduled Midnight Blast Draft on {{The Prom Queen}}\'s iPad',
        format: 'social_post',
        roundNumber: 2,
        timestampLabel: '10:22 PM',
        description:
          'Scheduled campus-wide group post queued on {{The Prom Queen}}\'s iPad for 12:00 AM: "Happy Unibreak fuckers! Here is how {{The Co-Captain}} & {{The Teammate}} rigged the varsity season—and here is what {{The Girlfriend}}\'s partner {{The Teammate}} does when {{The Girlfriend_he}}\'s not looking."',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #2: Confirms the midnight deadline ultimatum that drove {{The Co-Captain}} and {{The Girlfriend}} into a corner.',
        doubleMeaningNote:
          'Names {{The Teammate}} in both the varsity betting scandal and the cheating scandal.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Girlfriend', 'The Teammate'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b2-c3',
        beatNumber: 2,
        title: 'Furious Text From {{The Girlfriend}} to {{The Teammate}}',
        format: 'chat',
        roundNumber: 1,
        timestampLabel: '10:19 PM',
        description:
          '[10:19 PM] {{The Girlfriend}}: You\'ve been fucking {{The Prom Queen}} behind my back?! And now {{The Prom Queen_he}}\'s using it to destroy my {{The Co-Captain_sibling}} {{The Co-Captain}} at midnight.\n[10:20 PM] {{The Girlfriend}}: Dead to me doesn\'t even fucking cover it.\n[Status: DELIVERED]',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #2: Shows {{The Girlfriend}}\'s explosive rage at 10:19 PM over both the affair and the threat to {{The Girlfriend_his}} sibling {{The Co-Captain}}.',
        doubleMeaningNote:
          'Sounds like {{The Girlfriend}} is threatening {{The Teammate}} as much as {{The Prom Queen}}.',
        involvedRoles: ['The Girlfriend', 'The Teammate', 'The Prom Queen', 'The Co-Captain'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b2-c4',
        beatNumber: 2,
        title: 'Shattered Tequila Glass Outside the Upstairs Study',
        format: 'physical_prop',
        roundNumber: 2,
        timestampLabel: '10:17 PM',
        description:
          'Broken crystal shot glass swept under the hallway rug outside the study, stained with dark berry lipstick matching {{The Girlfriend}} and a torn corner of a betting slip from {{The Co-Captain}}\'s ledger.',
        generationPrompt:
          'Low-angle 85mm macro forensic crime-scene photograph of shattered crystal shot-glass shards scattered across dark rustic pine floorboards beside a woven cabin hallway rug. One curved glass rim bears a distinct dark berry lipstick smudge next to a spilled puddle of amber tequila. Moody after-dark crimson and amber rim lighting with deep noir shadows and 35mm film grain, strictly zero text.',
        pointsTo:
          'Proves Beat #2: Physical evidence of the 10:15 PM confrontation between {{The Girlfriend}}, {{The Co-Captain}}, and {{The Prom Queen}}.',
        doubleMeaningNote:
          '{{The Bestie}} was wearing a similar dark lip gloss earlier in the evening.',
        involvedRoles: ['The Girlfriend', 'The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b2-c5',
        beatNumber: 2,
        title: 'Sibling Pact Text Between {{The Girlfriend}} & {{The Co-Captain}}',
        format: 'chat',
        roundNumber: 2,
        timestampLabel: '10:35 PM',
        description:
          '[10:35 PM] {{The Co-Captain}}: If {{The Prom Queen}} posts that ledger at midnight I\'m expelled and going to fucking prison.\n[10:36 PM] {{The Girlfriend}}: Get {{The Prom Queen_him}} out on the upstairs balcony before 11:15. We are NOT letting that bitch ruin this family.\n[Status: DELETED]',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #2: Directly links {{The Girlfriend}} and {{The Co-Captain}} in a coordinated plan to corner {{The Prom Queen}} on the balcony before midnight.',
        doubleMeaningNote:
          'Does not yet reveal who swung the murder weapon on the balcony.',
        involvedRoles: ['The Girlfriend', 'The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
    ],
    3: [
      {
        id: 'uni-b3-c1',
        beatNumber: 3,
        title: 'Snapped Silver Whistle Chain on the Balcony Railing',
        format: 'physical_prop',
        roundNumber: 2,
        timestampLabel: '11:12 PM',
        description:
          'A broken sterling-silver athletic whistle chain tangled in the iron lattice of the second-story balcony railing, alongside three acrylic nail tips belonging to {{The Prom Queen}}.',
        generationPrompt:
          'Extreme close-up 50mm macro forensic photograph of a snapped sterling-silver athletic whistle chain snagged on a snow-dusted black wrought-iron cabin balcony railing at night. Beside the broken chain links lie three hot-pink acrylic fingernail tips on the wet timber rail. Illuminated by a crisp angled detective flashlight beam against dark falling snow, 35mm film grain, zero text.',
        pointsTo:
          'Proves Beat #3: Places {{The Co-Captain}} in a violent physical struggle with {{The Prom Queen}} on the upstairs balcony at 11:10–11:12 PM.',
        doubleMeaningNote:
          'Both {{The Co-Captain}} and {{The Teammate}} wear identical varsity co-captain whistle chains.',
        involvedRoles: ['The Co-Captain', 'The Prom Queen', 'The Teammate'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b3-c2',
        beatNumber: 3,
        title: 'Fresh Fingernail Scratch Marks & Skin DNA Under {{The Prom Queen}}\'s Nails',
        format: 'document',
        roundNumber: 2,
        timestampLabel: '11:14 PM',
        description:
          'Preliminary forensic examination of {{The Prom Queen}}\'s right hand: three broken hot-pink acrylic nails containing fresh skin tissue and blue threads from a varsity letterman bomber collar, matching the three raw claw marks on {{The Co-Captain}}\'s neck.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #3: Forensically locks {{The Co-Captain}} as the person {{The Prom Queen}} clawed during the 11:10 PM balcony struggle for the phone.',
        doubleMeaningNote:
          '{{The Brother}} also wears a vintage blue varsity jacket, causing early table debate.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Brother'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b3-c3',
        beatNumber: 3,
        title: 'Aborted Emergency Upload Log at 11:14 PM',
        format: 'search_log',
        roundNumber: 2,
        timestampLabel: '11:14 PM',
        description:
          'System log recovered from {{The Prom Queen}}\'s iCloud sync: at 11:14:08 PM on the upstairs balcony Wi-Fi node, the user pressed "SEND NOW" on the blackmail folder—followed 6 seconds later by 3 failed FaceID unlock attempts from another angle.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #3: Confirms {{The Prom Queen}} queued the files to send during the balcony struggle and someone tried to force FaceID open at 11:14 PM.',
        doubleMeaningNote:
          'Anyone implicated in the folder ({{The Teammate}}, {{The Bestie}}, {{The Co-Captain}}) had reason to grab that phone.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b3-c4',
        beatNumber: 3,
        title: 'Second-Story Balcony Struggle Captured on Driveway CCTV',
        format: 'cctv',
        roundNumber: 2,
        timestampLabel: '11:11 PM',
        description:
          'Header: SECURITY CAM STILL • NORTH BALCONY\nTimestamp: 11:11:24 PM\nVisual: Grainy infrared frame looking up at the second-story balcony shows a figure in a varsity letterman bomber pinning {{The Prom Queen}} against the railing while wrestling for a glowing smartphone as patio chairs overturn.',
        generationPrompt:
          'High-angle infrared night-vision CCTV surveillance camera still looking up at a snow-covered second-story timber cabin balcony during a storm. Two silhouetted figures are locked in a tense struggle beside an overturned wrought-iron patio chair and a glowing outdoor chiminea, with a bright smartphone light between their hands. High-contrast monochrome green-tinted surveillance aesthetic with subtle scanlines, zero text overlays.',
        pointsTo:
          'Proves Beat #3: Visual CCTV proof of the 11:10–11:14 PM balcony struggle over the phone.',
        doubleMeaningNote:
          'Because the CCTV frame only shows a varsity sleeve silhouette, players initially suspect {{The Teammate}} or {{The Brother}} as well as {{The Co-Captain}}.',
        involvedRoles: ['The Co-Captain', 'The Prom Queen', 'The Teammate', 'The Brother'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b3-c5',
        beatNumber: 3,
        title: 'Muffled Balcony Shouting Captured on Patio Audio Mic',
        format: 'audio',
        roundNumber: 2,
        timestampLabel: '11:13 PM',
        description:
          'Recording Duration: 18.5 Seconds\n{{The Co-Captain}}: "[angry] Give me the fucking phone right now, {{The Prom Queen}}!"\n{{The Prom Queen}}: "[angry] Get your hands off me or I hit send to the whole fucking campus!"\n{{The Co-Captain}}: "[whispers] Stop scratching my neck—unlock it!"',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #3: Audio proof that {{The Prom Queen}} scratched {{The Co-Captain}}\'s neck while fighting over the phone on the balcony.',
        doubleMeaningNote:
          'Explains the fresh scratch marks on {{The Co-Captain}}\'s collar.',
        involvedRoles: ['The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
    ],
    4: [
      {
        id: 'uni-b4-c1',
        beatNumber: 4,
        title: 'Cast-Iron Chiminea Poker With Two Distinct Sets of Prints',
        format: 'physical_prop',
        roundNumber: 3,
        timestampLabel: '11:18 PM',
        description:
          'The heavy cast-iron fireplace poker from the upstairs balcony chiminea: forensic dusting reveals {{The Co-Captain}}\'s sweaty palm prints mid-shaft (consistent with a panic swing), overlaid at the top handle by crimson velvet fibers matching {{The Girlfriend}}\'s tracksuit sleeve.',
        generationPrompt:
          'Close-up 50mm f/1.8 forensic crime-scene photograph of a heavy black cast-iron fireplace poker lying diagonally across snow-dusted timber balcony floorboards beside a glowing outdoor iron chiminea. Clinging to the ornate top handle are vivid crimson crushed-velvet fibers and dark wood ash illuminated by an angled forensic UV and flashlight beam. Moody night noir atmosphere, 35mm film grain, zero text.',
        pointsTo:
          'Proves Beat #4 (& #5): Physical weapon linking {{The Co-Captain}}\'s first strike at 11:18 PM and {{The Girlfriend}} gripping the handle afterward.',
        doubleMeaningNote:
          'Early on, guests notice the poker came from the balcony outside the room where {{The Teammate}} left {{The Teammate_his}} flannel shirt.',
        involvedRoles: ['The Co-Captain', 'The Girlfriend', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b4-c2',
        beatNumber: 4,
        title: 'Apple Watch Heart-Rate & Fall-Detection Spike at 11:18 PM',
        format: 'document',
        roundNumber: 2,
        timestampLabel: '11:18 PM',
        description:
          'SUBJECT: APPLE WATCH BIOMETRIC TELEMETRY\nDATE: 11:18:12 PM\nSTATUS: FORENSIC EXHIBIT\nHealth telemetry recovered from {{The Prom Queen}}\'s Apple Watch records an impact hard-fall alert onto the second-story balcony deck at 11:18:12 PM, followed by 10 full minutes of a weak resting pulse (58 BPM) before cardiac arrest at 11:28 PM.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #4: Crucial forensic proof that the 11:18 PM strike by {{The Co-Captain}} only knocked {{The Prom Queen}} unconscious on the deck—{{The Prom Queen_he}} was still alive for 10 minutes until 11:28 PM!',
        doubleMeaningNote:
          'Anyone with an alibi at 11:18 PM (like {{The Girlfriend}}) is NOT cleared if they were on the balcony at 11:28 PM.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain', 'The Girlfriend'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b4-c3',
        beatNumber: 4,
        title: 'First-Impact Blood Pool on the Upstairs Balcony Timber Deck',
        format: 'physical_prop',
        roundNumber: 2,
        timestampLabel: '11:19 PM',
        description:
          'Crime-scene spatter exhibit on the second-story balcony floorboards: a shallow pool of coagulating blood beside the chiminea shows {{The Prom Queen}} lay unconscious on the upstairs deck for roughly 9–10 minutes before being lifted over the railing.',
        generationPrompt:
          'Overhead 35mm forensic crime-scene photograph of dark wet timber balcony floorboards beside a cast-iron chiminea base and snow-dusted railing at night. A dark crimson stain and scattered fireplace ash mark the deck floor beside a brass forensic scale ruler under cold blue moonlight and warm cabin window rim lighting. Cinematic detective noir, 35mm film grain, zero text or numbers.',
        pointsTo:
          'Proves Beat #4: Confirms the two-stage attack (knocked unconscious on the balcony at 11:18 PM, then finished and pushed off 10 minutes later).',
        doubleMeaningNote:
          'A boot impression in the melted snow near the door matches a common size-10 boot worn by both {{The Co-Captain}} and {{The Brother}}.',
        involvedRoles: ['The Co-Captain', 'The Prom Queen', 'The Girlfriend'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b4-c4',
        beatNumber: 4,
        title: 'Panicked 11:19 PM Text From {{The Co-Captain}} to {{The Girlfriend}}',
        format: 'chat',
        roundNumber: 3,
        timestampLabel: '11:19 PM',
        description:
          '[11:19 PM] {{The Co-Captain}}: Get up to the balcony right fucking now. I swung the poker to get the phone and {{The Prom Queen}} went down hard.\n[11:19 PM] {{The Co-Captain}}: There\'s blood on the deck—I don\'t know what the fuck to do.\n[Status: SEEN 11:20 PM]',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #4: Direct confession that {{The Co-Captain}} struck the first blow with the poker at 11:18 PM and summoned {{The Girlfriend}} to the balcony.',
        doubleMeaningNote:
          'Proves {{The Co-Captain}} panicked and stopped after the first blow rather than pushing {{The Prom Queen}} off the balcony.',
        involvedRoles: ['The Co-Captain', 'The Girlfriend', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b4-c5',
        beatNumber: 4,
        title: 'Soot & Ash Smudge on {{The Prom Queen}}\'s Faux-Fur Jacket Shoulder',
        format: 'physical_prop',
        roundNumber: 2,
        timestampLabel: '11:18 PM',
        description:
          'Wood-ash and cast-iron soot transferred across the left temple and faux-fur collar of {{The Prom Queen}}\'s jacket, matching the ash inside the upstairs balcony chiminea stand.',
        generationPrompt:
          'Macro 85mm forensic photograph of a luxury white faux-fur aprés-ski jacket collar resting on a dark examination table, heavily smudged with black cast-iron soot and grey wood ash along the left shoulder seam. Lit by a crisp side-angled forensic inspection lamp with deep noir shadows and 35mm film grain, zero text.',
        pointsTo:
          'Proves Beat #4: Confirms the murder weapon was the upstairs balcony chiminea poker.',
        doubleMeaningNote:
          '{{The Bestie}} was seen tending the downstairs fireplace earlier at 10:50 PM.',
        involvedRoles: ['The Prom Queen', 'The Co-Captain'],
        isRedHerring: false,
        decision: 'pending',
      },
    ],
    5: [
      {
        id: 'uni-b5-c1',
        beatNumber: 5,
        title: 'Crimson Velvet Tracksuit Fibers & Soot on the Balcony Railing',
        format: 'physical_prop',
        roundNumber: 3,
        timestampLabel: '11:28 PM',
        description:
          'Forensic tape-lift from the top bar of the second-story balcony railing directly above the patio impact site: contains crimson crushed-velvet microfibers from {{The Girlfriend}}\'s tracksuit sleeve mixed with chiminea poker soot and {{The Prom Queen}}\'s blood.',
        generationPrompt:
          'Extreme macro 100mm forensic photograph of a clear adhesive tape-lift pressed against a wet black wrought-iron cabin balcony railing at night, capturing vivid crimson crushed-velvet fabric fibers intertwined with black fireplace soot. Illuminated by a dramatic forensic UV and white ring-light against blurred falling snow, 35mm film grain, zero text.',
        pointsTo:
          'Proves Beat #5: Smoking-gun physical evidence that {{The Girlfriend}} wielded the poker for the final strike and pushed {{The Prom Queen}} over the balcony railing at 11:28 PM.',
        doubleMeaningNote:
          '{{The Girlfriend}} claimed {{The Girlfriend_he}} never stepped foot on the upstairs balcony after 10:30 PM.',
        involvedRoles: ['The Girlfriend', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b5-c2',
        beatNumber: 5,
        title: '11:26 PM Living-Room Smart-TV Alibi Staging & Balcony Door Log',
        format: 'search_log',
        roundNumber: 3,
        timestampLabel: '11:28 PM',
        description:
          'Cabin smart-home audit log: at 11:25 PM the balcony sliding door opened as {{The Co-Captain}} went downstairs to be seen pouring drinks in the living room, while {{The Girlfriend}}\'s phone remained connected to the upstairs balcony Wi-Fi repeater through 11:29 PM—the exact minute the patio motion floodlight triggered from the body falling.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #5: Proves {{The Girlfriend}} sent {{The Co-Captain}} downstairs at 11:25 PM to manufacture a living-room alibi while {{The Girlfriend}} stayed on the balcony to finish {{The Prom Queen}} at 11:28 PM.',
        doubleMeaningNote:
          'Shatters both {{The Co-Captain}}\'s and {{The Girlfriend}}\'s alibis simultaneously in the final round.',
        involvedRoles: ['The Girlfriend', 'The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b5-c3',
        beatNumber: 5,
        title: 'Smashed iPhone in the Snowbank With Dark Berry Lipstick on the Case',
        format: 'physical_prop',
        roundNumber: 3,
        timestampLabel: '11:29 PM',
        description:
          '{{The Prom Queen}}\'s iPhone recovered from the snowdrift beside the stone patio, crushed by the flat iron base of the fireplace poker; a smear of {{The Girlfriend}}\'s signature dark berry lipstick and a partial thumbprint are pressed onto the inside of the detached phone case.',
        generationPrompt:
          'Close-up 50mm forensic crime-scene photograph of a crushed pink-gold smartphone and its detached clear case half-buried in a fresh snowbank beside a wet flagstone cabin patio at night. A dark berry lipstick smudge and black iron soot mark the cracked back glass under warm amber cabin window light and cold blue snow shadows, 35mm film grain, zero text.',
        pointsTo:
          'Proves Beat #5: Confirms {{The Girlfriend}} smashed {{The Prom Queen}}\'s phone with the poker on the balcony at 11:28 PM before throwing it into the snowbank.',
        doubleMeaningNote:
          'The phone was found 4 feet from the basement door where {{The Teammate}} and {{The Bestie}} were arguing.',
        involvedRoles: ['The Girlfriend', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b5-c4',
        beatNumber: 5,
        title: 'Autopsy & Patio Impact Trajectory Report (11:28 PM)',
        format: 'document',
        roundNumber: 3,
        timestampLabel: '11:28 PM',
        description:
          'SUBJECT: PRELIMINARY CORONER & TRAJECTORY REPORT\nDATE: 11:55 PM\nSTATUS: CONFIDENTIAL\n{{The Prom Queen}} sustained two separate strikes from the cast-iron poker: a non-fatal stunning blow to the left temple (~11:18 PM) and a second, lethal high-velocity strike (~11:28 PM) delivered immediately before the body was pushed dead-weight over the balcony railing.',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #5: Medically confirms the 2-person Accomplice + Killer sequence ({{The Co-Captain}} struck first at 11:18 PM; {{The Girlfriend}} delivered the fatal blow at 11:28 PM).',
        doubleMeaningNote:
          'Proves the fall from the balcony was staged after the fatal poker strike.',
        involvedRoles: ['The Girlfriend', 'The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
      {
        id: 'uni-b5-c5',
        beatNumber: 5,
        title: '11:31 PM Upstairs Hallway Whispered Alibi Pact',
        format: 'audio',
        roundNumber: 3,
        timestampLabel: '11:31 PM',
        description:
          'Recording Duration: 19.0 Seconds\n{{The Girlfriend}}: "[whispers] Keep your voice down. {{The Prom Queen_he}} started waking up on the deck so I finished it with the poker and sent {{The Prom Queen_him}} over the rail."\n{{The Co-Captain}}: "[whispers] Holy fuck... did anyone see you?!"\n{{The Girlfriend}}: "[angry] No. Stick to the fucking story: you were downstairs by 11:25 and I was in the shower."',
        generationPrompt: '',
        pointsTo:
          'Proves Beat #5: Irrefutable final-round smoking gun unmasking {{The Girlfriend}} as the Killer and {{The Co-Captain}} as the Accomplice.',
        doubleMeaningNote:
          'Links directly back to the 11:19 PM panic text and the 11:26 PM smart-home log.',
        involvedRoles: ['The Girlfriend', 'The Co-Captain', 'The Prom Queen'],
        isRedHerring: false,
        decision: 'pending',
      },
    ],
  };
}

/**
 * Strips any leftover diagram real names (Leah, Stacy, Seb, James, Mia, Josh) and replaces them
 * with their canonical {{The Archetype}} tokens across all text fields.
 */
function convertRealNamesToArchetypeTokens(bp: MysteryBlueprintInput): MysteryBlueprintInput {
  const nameToTokenPairs: [RegExp, string][] = [
    [/\bLeah\s*\(Prom\s*queen\)/gi, '{{The Prom Queen}}'],
    [/\bLeah\b/gi, '{{The Prom Queen}}'],
    [/\bStacy\b/gi, '{{The Girlfriend}}'],
    [/\bSeb\b/gi, '{{The Co-Captain}}'],
    [/\bJames\b/gi, '{{The Teammate}}'],
    [/\bMia\b/gi, '{{The Bestie}}'],
    [/\bJosh\b/gi, '{{The Brother}}'],
  ];

  for (const ch of bp.characters) {
    const cleanRole = ch.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
    const m = ch.conceptNotes.match(/(?:Diagram|Archetype for):\s*([A-Za-z]+)/i);
    if (m && m[1] && m[1].length >= 3) {
      nameToTokenPairs.push([new RegExp(`\\b${m[1]}\\b`, 'gi'), `{{${cleanRole}}}`]);
    }
  }

  const scrub = (txt: string): string => {
    let out = txt || '';
    out = out.replace(/(?:Diagram|Archetype for):\s*[^.]+\.\s*/gi, '');
    for (const [rx, token] of nameToTokenPairs) {
      out = out.replace(rx, token);
    }
    out = out.replace(/(\{\{[^}]+\}\})\s*\(\1\)/g, '$1');
    return out.trim();
  };

  return {
    ...bp,
    settingDescription: scrub(bp.settingDescription),
    murderWeaponAndMethod: scrub(bp.murderWeaponAndMethod),
    killerHowAndWhySummary: scrub(bp.killerHowAndWhySummary),
    characters: bp.characters.map((c) => ({
      ...c,
      roleTitle: c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim(),
      conceptNotes: scrub(c.conceptNotes),
      motiveOrSecret: scrub(c.motiveOrSecret),
    })),
    beats: bp.beats.map((b) => ({
      ...b,
      description: scrub(b.description),
    })),
  };
}

function createBlankBlueprint(customTitle?: string): MysteryBlueprintInput {
  return {
    id: `base-${Date.now()}`,
    title: customTitle || 'Untitled OG Mystery',
    theme: 'Private Dinner Party & Secret Scandals',
    settingDescription: '',
    spiceLevel: 'Spicy',
    complexity: 'medium',
    murderTimeWindow: '11:28 PM',
    murderWeaponAndMethod: '',
    killerHowAndWhySummary: '',
    insideJokesOrProps: '',
    characters: Array.from({ length: 6 }, (_, idx) => ({
      id: `char-${idx + 1}`,
      roleTitle:
        idx === 0
          ? 'The Host'
          : idx === 1
            ? 'The Rival'
            : `The Suspect ${idx + 1}`,
      defaultGender: idx % 2 === 0 ? 'female' : 'male',
      plotRole: idx === 0 ? 'victim' : idx === 1 ? 'killer' : 'innocent',
      color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      conceptNotes: '',
      motiveOrSecret: '',
      outfitNotes: '',
    })),
    beats: [
      {
        beatNumber: 1,
        title: 'The Setup & Leverage',
        timeWindow: '9:15 PM',
        phase: 'pre_crime',
        description: '',
      },
      {
        beatNumber: 2,
        title: 'The Ultimatum & Confrontation',
        timeWindow: '10:15 PM',
        phase: 'pre_crime',
        description: '',
      },
      {
        beatNumber: 3,
        title: 'The Isolated Struggle',
        timeWindow: '11:10 PM',
        phase: 'pre_crime',
        description: '',
      },
      {
        beatNumber: 4,
        title: 'The Escalation / First Strike',
        timeWindow: '11:18 PM',
        phase: 'crime',
        description: '',
      },
      {
        beatNumber: 5,
        title: 'The Fatal Blow & Cover-Up',
        timeWindow: '11:28 PM',
        phase: 'crime',
        description: '',
      },
    ],
  };
}

export interface OgProjectWorkspace {
  id: string;
  updatedAt: string;
  step: 1 | 2 | 3 | 4;
  blueprint: MysteryBlueprintInput;
  beatCluesMap: Record<number, SuggestedClueCandidate[]>;
  subplots: SuggestedRedHerringSubplot[];
  lastRedHerringCoreSignature?: string;
  roundStrategySummary: Record<number, string>;
  assembled: AssembledFullMysteryBase | null;
  transferredMysteryId: string | null;
}

function createInitialUnibreakProject(): OgProjectWorkspace {
  return {
    id: 'og-proj-unibreak',
    updatedAt: new Date().toISOString(),
    step: 1,
    blueprint: createUnibreakCabinBlueprint(),
    beatCluesMap: createUnibreakInitialBeatCluesMap(),
    subplots: [],
    lastRedHerringCoreSignature: '',
    roundStrategySummary: {},
    assembled: null,
    transferredMysteryId: null,
  };
}

function normalizeProjectCluesMediaAndPrompts(proj: OgProjectWorkspace): OgProjectWorkspace {
  const spice = proj?.blueprint?.spiceLevel || 'Filthy';
  const freshUnibreakMap =
    proj?.blueprint?.id === 'unibreak-at-the-cabin' ? createUnibreakInitialBeatCluesMap() : null;
  const freshById = new Map<string, SuggestedClueCandidate>();
  if (freshUnibreakMap) {
    Object.values(freshUnibreakMap)
      .flat()
      .forEach((c) => freshById.set(c.id, c));
  }

  const rawMap =
    proj?.beatCluesMap && Object.keys(proj.beatCluesMap).length > 0
      ? proj.beatCluesMap
      : freshUnibreakMap || {};

  const nextBeatCluesMap: Record<number, SuggestedClueCandidate[]> = {};
  for (const [bKey, list] of Object.entries(rawMap)) {
    const bNum = Number(bKey);
    nextBeatCluesMap[bNum] = (list || []).map((c) => {
      const fresh = freshById.get(c.id);
      const baseClue = fresh ? { ...fresh, decision: c.decision, roundNumber: c.roundNumber } : c;
      const isPhoto = isPhotoClueFormat(baseClue.format);
      return {
        ...baseClue,
        generationPrompt: isPhoto
          ? baseClue.generationPrompt && baseClue.generationPrompt.length >= 90
            ? baseClue.generationPrompt
            : buildDefaultDetailedPhotoPrompt(baseClue.title, baseClue.description, spice)
          : '',
      };
    });
  }

  const nextSubplots: SuggestedRedHerringSubplot[] = (proj?.subplots || []).map((sub) => ({
    ...sub,
    decoyClues: (sub.decoyClues || []).map((dc) => {
      const isPhoto = isPhotoClueFormat(dc.format);
      return {
        ...dc,
        generationPrompt: isPhoto
          ? dc.generationPrompt && dc.generationPrompt.length >= 90
            ? dc.generationPrompt
            : buildDefaultDetailedPhotoPrompt(dc.title, dc.description, spice)
          : '',
      };
    }),
  }));

  return {
    ...proj,
    beatCluesMap: nextBeatCluesMap,
    subplots: nextSubplots,
  };
}

const STORAGE_KEY = 'bpm_og_projects_list_v3';

export function BaseArchitectClient({ locale }: { locale: string }) {
  const [projects, setProjects] = useState<OgProjectWorkspace[]>(() => [
    createInitialUnibreakProject(),
  ]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Active editor UI state
  const [activeBeatNumber, setActiveBeatNumber] = useState<number>(1);
  const [activeSubplotIndex, setActiveSubplotIndex] = useState<number>(0);
  const [beatCustomNote, setBeatCustomNote] = useState<string>('');
  const [subplotCustomNote, setSubplotCustomNote] = useState<string>('');
  const [reviewTab, setReviewTab] = useState<'rounds' | 'characters' | 'relationships'>('rounds');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRelationshipMap, setShowRelationshipMap] = useState<boolean>(true);

  // AI Title Renamer state
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<
    { title: string; theme: string; vibeTag: string }[]
  >([]);

  // Loading states
  const [isUploadingDiagram, setIsUploadingDiagram] = useState(false);
  const [isSuggestingBeats, setIsSuggestingBeats] = useState(false);
  const [isGeneratingBeatClues, setIsGeneratingBeatClues] = useState(false);
  const [isGeneratingSubplots, setIsGeneratingSubplots] = useState(false);
  const [isSortingRounds, setIsSortingRounds] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [previewingClueIds, setPreviewingClueIds] = useState<Record<string, boolean>>({});
  const [renderingPhotoClueId, setRenderingPhotoClueId] = useState<string | null>(null);
  const [injectingTwistClueId, setInjectingTwistClueId] = useState<string | null>(null);

  // Import existing base from Supabase dropdown
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [draftList, setDraftList] = useState<
    {
      id: string;
      title: string;
      theme: string;
      spiceLevel: string;
      complexity: string;
      status: string;
      createdAt: string;
    }[]
  >([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(false);

  // Toast / Error banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Load projects from localStorage + Cloud backup
  useEffect(() => {
    let loadedLocal = false;
    try {
      const saved =
        localStorage.getItem(STORAGE_KEY) || localStorage.getItem('bpm_og_projects_list_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hydratedList = parsed.map((p: OgProjectWorkspace) =>
            normalizeProjectCluesMediaAndPrompts(p)
          );
          setProjects(hydratedList);
          loadedLocal = true;
        }
      }
    } catch {
      // Ignore storage error
    }

    loadArchitectCloudWorkspaceAction()
      .then((res) => {
        if (!loadedLocal && res.success && Array.isArray(res.slots) && res.slots.length > 0) {
          const valid = res.slots
            .filter((p: any) => p?.blueprint?.title)
            .map((p: OgProjectWorkspace) => normalizeProjectCluesMediaAndPrompts(p));
          if (valid.length > 0) {
            setProjects(valid);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setHydrated(true);
      });
  }, []);

  // Persist projects to localStorage + Cloud backup
  useEffect(() => {
    if (!hydrated) return;
    try {
      const json = JSON.stringify(projects);
      localStorage.setItem(STORAGE_KEY, json);
      saveArchitectCloudWorkspaceAction({ slotsJson: json }).catch(() => {});
    } catch {
      // Ignore storage error
    }
  }, [projects, hydrated]);

  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) || null,
    [projects, activeProjectId]
  );

  const updateActiveProject = (updater: (prev: OgProjectWorkspace) => OgProjectWorkspace) => {
    if (!activeProjectId) return;
    setProjects((prevList) =>
      prevList.map((p) =>
        p.id === activeProjectId
          ? { ...updater(p), updatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const step = activeProject?.step || 1;
  const blueprint = activeProject?.blueprint || createUnibreakCabinBlueprint();
  const beatCluesMap = activeProject?.beatCluesMap || {};
  const subplots = activeProject?.subplots || [];
  const roundStrategySummary = activeProject?.roundStrategySummary || {};
  const assembled = activeProject?.assembled || null;
  const transferredMysteryId = activeProject?.transferredMysteryId || null;

  const setStep = (nextStep: 1 | 2 | 3 | 4) => {
    updateActiveProject((prev) => ({ ...prev, step: nextStep }));
  };

  const setBlueprint = (
    nextOrUpdater:
      | MysteryBlueprintInput
      | ((prevBp: MysteryBlueprintInput) => MysteryBlueprintInput)
  ) => {
    updateActiveProject((prev) => ({
      ...prev,
      blueprint:
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev.blueprint) : nextOrUpdater,
    }));
  };

  const setBeatCluesMap = (
    nextOrUpdater:
      | Record<number, SuggestedClueCandidate[]>
      | ((
          prevMap: Record<number, SuggestedClueCandidate[]>
        ) => Record<number, SuggestedClueCandidate[]>)
  ) => {
    updateActiveProject((prev) => ({
      ...prev,
      beatCluesMap:
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev.beatCluesMap) : nextOrUpdater,
    }));
  };

  const setSubplots = (
    nextOrUpdater:
      | SuggestedRedHerringSubplot[]
      | ((prevSubs: SuggestedRedHerringSubplot[]) => SuggestedRedHerringSubplot[])
  ) => {
    updateActiveProject((prev) => ({
      ...prev,
      subplots:
        typeof nextOrUpdater === 'function' ? nextOrUpdater(prev.subplots) : nextOrUpdater,
    }));
  };

  const setRoundStrategySummary = (nextSummary: Record<number, string>) => {
    updateActiveProject((prev) => ({
      ...prev,
      roundStrategySummary: nextSummary,
    }));
  };

  const setAssembled = (nextAssembled: AssembledFullMysteryBase | null) => {
    updateActiveProject((prev) => ({
      ...prev,
      assembled: nextAssembled,
    }));
  };

  const setTransferredMysteryId = (nextId: string | null) => {
    updateActiveProject((prev) => ({
      ...prev,
      transferredMysteryId: nextId,
    }));
  };

  const totalRounds = getRoundsForCount(blueprint.characters.length);

  // Live Interactive Relationship Map Data
  const { graphCharacters, relationships: graphRelationships } = useMemo(
    () => buildLiveRelationshipGraphData(blueprint.characters),
    [blueprint.characters]
  );

  // Flatten all selected ("yes") Core Clues across Beats 1..5
  const selectedCoreClues = useMemo(() => {
    const list: SuggestedClueCandidate[] = [];
    for (const b of blueprint.beats) {
      const cands = beatCluesMap[b.beatNumber] || [];
      for (const c of cands) {
        if (c.decision === 'yes') {
          list.push(c);
        }
      }
    }
    return list;
  }, [blueprint.beats, beatCluesMap]);

  // Flatten all selected ("yes") Red Herring Clues across all subplots
  const selectedRedHerringClues = useMemo(() => {
    const list: SuggestedClueCandidate[] = [];
    for (const sub of subplots) {
      if (sub.decision === 'no') continue;
      for (const dc of sub.decoyClues) {
        if (dc.decision === 'yes') {
          list.push(dc);
        }
      }
    }
    return list;
  }, [subplots]);

  const totalSelectedCluesCount = selectedCoreClues.length + selectedRedHerringClues.length;

  const difficultyRec = useMemo(
    () =>
      recommendDifficultyFromPlotAndClues({
        blueprint,
        coreClues: selectedCoreClues,
        subplots: subplots.map((s) => ({
          ...s,
          decision: 'yes',
          decoyClues: s.decoyClues.filter((dc) => dc.decision === 'yes'),
        })),
      }),
    [blueprint, selectedCoreClues, subplots]
  );

  // ============================================================================
  // HUB ACTIONS
  // ============================================================================
  const handleCreateNewBlankProject = () => {
    const newProj: OgProjectWorkspace = {
      id: `og-proj-${Date.now()}`,
      updatedAt: new Date().toISOString(),
      step: 1,
      blueprint: createBlankBlueprint(`New OG Mystery #${projects.length + 1}`),
      beatCluesMap: {},
      subplots: [],
      roundStrategySummary: {},
      assembled: null,
      transferredMysteryId: null,
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveBeatNumber(1);
    setErrorMessage(null);
    setStatusToast('Created a new blank OG Mystery project.');
  };

  const handleCreateUnibreakProject = () => {
    const existing = projects.find((p) => p.blueprint.id === 'unibreak-at-the-cabin');
    if (existing) {
      setActiveProjectId(existing.id);
      return;
    }
    const newProj = createInitialUnibreakProject();
    newProj.id = `og-proj-unibreak-${Date.now()}`;
    setProjects((prev) => [newProj, ...prev]);
    setActiveProjectId(newProj.id);
    setActiveBeatNumber(1);
  };

  const handleDeleteProject = (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProjects((prev) => prev.filter((p) => p.id !== projId));
    if (activeProjectId === projId) {
      setActiveProjectId(null);
    }
    setConfirmDeleteId(null);
  };

  const handleDiagramUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    createNewProjectOnParse: boolean = false
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    setIsUploadingDiagram(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image file.'));
      });
      reader.readAsDataURL(file);
      const imageBase64 = await base64Promise;

      const baseBp = createNewProjectOnParse ? createBlankBlueprint() : blueprint;
      const res = await parseDiagramImageIntoBlueprintAction({
        imageBase64,
        mimeType: file.type || 'image/png',
        currentBlueprint: baseBp,
      });

      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Could not parse diagram image.');
      } else if (createNewProjectOnParse || !activeProjectId) {
        const newProj: OgProjectWorkspace = {
          id: `og-proj-${Date.now()}`,
          updatedAt: new Date().toISOString(),
          step: 1,
          blueprint: res.blueprint,
          beatCluesMap: {},
          subplots: [],
          roundStrategySummary: {},
          assembled: null,
          transferredMysteryId: null,
        };
        setProjects((prev) => [newProj, ...prev]);
        setActiveProjectId(newProj.id);
        setActiveBeatNumber(1);
        setStatusToast(
          `Created "${res.blueprint.title}" from your diagram (${res.blueprint.characters.length} characters & relationships).`
        );
      } else {
        setBlueprint(res.blueprint);
        setStatusToast(
          `Parsed diagram "${res.blueprint.title}" (${res.blueprint.characters.length} characters & relationships).`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse diagram image.');
    } finally {
      setIsUploadingDiagram(false);
      e.target.value = '';
    }
  };

  // ============================================================================
  // EDITOR ACTIONS
  // ============================================================================
  const updateBlueprint = (patch: Partial<MysteryBlueprintInput>) => {
    setBlueprint((prev) => ({ ...prev, ...patch }));
  };

  const updateCharacter = (charId: string, patch: Partial<BlueprintCharacterInput>) => {
    setBlueprint((prev) => ({
      ...prev,
      characters: prev.characters.map((c) => (c.id === charId ? { ...c, ...patch } : c)),
    }));
  };

  const updateBeat = (beatNumber: number, patch: Partial<BlueprintBeatInput>) => {
    setBlueprint((prev) => ({
      ...prev,
      beats: prev.beats.map((b) => (b.beatNumber === beatNumber ? { ...b, ...patch } : b)),
    }));
  };

  const handleSetPackagePlayerCount = (targetCount: number) => {
    setBlueprint((prev) => {
      const current = [...prev.characters];
      if (current.length === targetCount) return prev;
      if (current.length > targetCount) {
        return { ...prev, characters: current.slice(0, targetCount) };
      }
      const added: BlueprintCharacterInput[] = [...current];
      for (let i = current.length; i < targetCount; i++) {
        added.push({
          id: `char-${i + 1}`,
          roleTitle: `The Suspect ${i + 1}`,
          defaultGender: i % 2 === 0 ? 'female' : 'male',
          plotRole: 'innocent',
          color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
          conceptNotes: '',
          motiveOrSecret: '',
          outfitNotes: '',
        });
      }
      return { ...prev, characters: added };
    });
  };

  // AI Mystery Renamer Action
  const handleSuggestBetterTitles = async () => {
    setErrorMessage(null);
    setIsRenamingTitle(true);
    try {
      const res = await suggestBetterMysteryTitlesAction({ blueprint });
      if (!res.success || !res.suggestions || res.suggestions.length === 0) {
        setErrorMessage(res.error || 'Could not generate title suggestions.');
      } else {
        setTitleSuggestions(res.suggestions);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error suggesting mystery titles.');
    } finally {
      setIsRenamingTitle(false);
    }
  };

  const handleSuggestBeats = async () => {
    setErrorMessage(null);
    setIsSuggestingBeats(true);
    try {
      const res = await suggestStoryBeatsForCastAction({ blueprint });
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to suggest story beats.');
      } else {
        setBlueprint((prev) => ({
          ...prev,
          settingDescription: res.settingDescription || prev.settingDescription,
          murderTimeWindow: res.murderTimeWindow || prev.murderTimeWindow,
          murderWeaponAndMethod: res.murderWeaponAndMethod || prev.murderWeaponAndMethod,
          killerHowAndWhySummary: res.killerHowAndWhySummary || prev.killerHowAndWhySummary,
          beats: res.beats && res.beats.length > 0 ? res.beats : prev.beats,
        }));
        setStatusToast('Generated Murder Method & 5 Core Murder Story Beats.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error suggesting story beats.');
    } finally {
      setIsSuggestingBeats(false);
    }
  };

  const handleApprovePlotAndStartBeatClues = async () => {
    setErrorMessage(null);
    if (!blueprint.title.trim()) {
      setErrorMessage('Please enter a Mystery Title first.');
      return;
    }
    const scrubbedBlueprint = convertRealNamesToArchetypeTokens(blueprint);
    setBlueprint(scrubbedBlueprint);
    setStep(2);
    setActiveBeatNumber(1);
    setStatusToast(
      'Locked 5-Beat Plot & converted all characters to {{The Archetype}} tokens! Now pick your 2 favorite clues for Beat #1.'
    );

    if (!beatCluesMap[1] || beatCluesMap[1].length === 0) {
      await handleSuggestCluesForBeat(1, scrubbedBlueprint);
    }
  };

  const handleSuggestCluesForBeat = async (
    targetBeatNum: number,
    overrideBlueprint?: MysteryBlueprintInput,
    customGapFocus?: string
  ) => {
    setErrorMessage(null);
    setIsGeneratingBeatClues(true);
    const bpToUse = overrideBlueprint || blueprint;
    try {
      const currentBeatClues = beatCluesMap[targetBeatNum] || [];
      const keptInThisBeat = currentBeatClues.filter((c) => c.decision === 'yes');
      const directionToUse =
        customGapFocus && customGapFocus.trim()
          ? `CRITICAL BEAT GAP TO COVER: Generate clues that specifically prove "${customGapFocus.trim()}" for Beat #${targetBeatNum}!`
          : beatCustomNote.trim() || undefined;

      const res = await suggestCluesForSingleBeatAction({
        blueprint: bpToUse,
        beatNumber: targetBeatNum,
        existingSelectedClues: selectedCoreClues,
        customDirection: directionToUse,
      });

      if (!res.success || !res.candidates) {
        setErrorMessage(res.error || `Failed to generate clues for Beat #${targetBeatNum}.`);
      } else {
        setBeatCluesMap((prev) => ({
          ...prev,
          [targetBeatNum]: [...keptInThisBeat, ...res.candidates!],
        }));
        setBeatCustomNote('');
        setStatusToast(
          customGapFocus
            ? `Generated ${res.candidates.length} fresh clues targeting the missing Beat #${targetBeatNum} gap ("${customGapFocus}")!`
            : `Suggested ${res.candidates.length} clues for Beat #${targetBeatNum} (${bpToUse.spiceLevel} spice). Select at least 2 clues.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating beat clues.');
    } finally {
      setIsGeneratingBeatClues(false);
    }
  };

  const handleSelectBeatTab = async (beatNum: number) => {
    setActiveBeatNumber(beatNum);
    if (!beatCluesMap[beatNum] || beatCluesMap[beatNum].length === 0) {
      await handleSuggestCluesForBeat(beatNum);
    }
  };

  const toggleBeatClueSelection = (beatNum: number, clueId: string) => {
    setBeatCluesMap((prev) => {
      const list = prev[beatNum] || [];
      return {
        ...prev,
        [beatNum]: list.map((c) =>
          c.id === clueId
            ? { ...c, decision: c.decision === 'yes' ? 'pending' : 'yes' }
            : c
        ),
      };
    });
  };

  const handleSwapBeatClueForCoverage = (
    beatNum: number,
    dropClueId: string,
    addClueId: string,
    missingFact: string
  ) => {
    setBeatCluesMap((prev) => {
      const list = prev[beatNum] || [];
      return {
        ...prev,
        [beatNum]: list.map((c) => {
          if (c.id === dropClueId) return { ...c, decision: 'pending' };
          if (c.id === addClueId) return { ...c, decision: 'yes' };
          return c;
        }),
      };
    });
    setStatusToast(
      `Swapped clues to cover "${missingFact}" — Beat #${beatNum} is now 100% covered!`
    );
  };

  const updateBeatClueField = (
    beatNum: number,
    clueId: string,
    patch: Partial<SuggestedClueCandidate>
  ) => {
    setBeatCluesMap((prev) => ({
      ...prev,
      [beatNum]: (prev[beatNum] || []).map((c) => (c.id === clueId ? { ...c, ...patch } : c)),
    }));
  };

  const selectedCoreSignature = useMemo(
    () => selectedCoreClues.map((c) => `${c.id}:${c.format}:${c.title}`).join('|'),
    [selectedCoreClues]
  );

  const handleMoveToRedHerrings = async (forceRefresh: boolean = false) => {
    setErrorMessage(null);
    if (selectedCoreClues.length < 6) {
      setErrorMessage(
        `Please select at least 2 clues per beat (currently ${selectedCoreClues.length}/10 Core Clues selected) before building Red Herrings.`
      );
      return;
    }
    setStep(3);
    setActiveSubplotIndex(0);
    const signatureChanged =
      !activeProject?.lastRedHerringCoreSignature ||
      activeProject.lastRedHerringCoreSignature !== selectedCoreSignature;
    if (subplots.length > 0 && !forceRefresh && !signatureChanged) {
      return;
    }
    setIsGeneratingSubplots(true);
    try {
      const res = await suggestRedHerringPlotlinesWithCluesAction({
        blueprint,
        selectedCoreClues,
        customDirection: subplotCustomNote.trim() || undefined,
      });
      if (!res.success || !res.subplots) {
        setErrorMessage(res.error || 'Failed to generate red-herring plotlines.');
      } else {
        updateActiveProject((prev) => ({
          ...prev,
          step: 3,
          subplots: res.subplots!,
          lastRedHerringCoreSignature: selectedCoreSignature,
        }));
        setSubplotCustomNote('');
        setStatusToast(
          `Freshly generated 3 Red-Herring Storylines from your ${selectedCoreClues.length} Real Clues! Review Part 1 (Real Clues & Double Meaning) and pick the new Fake Clue ideas in Part 2.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating red herrings.');
    } finally {
      setIsGeneratingSubplots(false);
    }
  };

  const toggleRedHerringClueSelection = (subplotId: string, clueId: string) => {
    setSubplots((prev) =>
      prev.map((s) =>
        s.id === subplotId
          ? {
              ...s,
              decoyClues: s.decoyClues.map((dc) =>
                dc.id === clueId
                  ? { ...dc, decision: dc.decision === 'yes' ? 'pending' : 'yes' }
                  : dc
              ),
            }
          : s
      )
    );
  };

  const updateRedHerringClueField = (
    subplotId: string,
    clueId: string,
    patch: Partial<SuggestedClueCandidate>
  ) => {
    setSubplots((prev) =>
      prev.map((s) =>
        s.id === subplotId
          ? {
              ...s,
              decoyClues: s.decoyClues.map((dc) =>
                dc.id === clueId ? { ...dc, ...patch } : dc
              ),
            }
          : s
      )
    );
  };

  const handleSortCluesIntoRoundsAndReview = async () => {
    setErrorMessage(null);
    if (selectedCoreClues.length === 0) {
      setErrorMessage('Please select your Core Clues in Step 2 first.');
      return;
    }
    if (selectedRedHerringClues.length === 0) {
      setErrorMessage('Please select your Red-Herring Clues in Step 3 first.');
      return;
    }
    setStep(4);
    setIsSortingRounds(true);
    try {
      const res = await sortCluesIntoRoundsByComplexityAction({
        blueprint: { ...blueprint, complexity: difficultyRec.recommendedTier },
        selectedCoreClues,
        selectedRedHerringClues,
      });

      if (!res.success || !res.sortedCoreClues || !res.sortedRedHerringClues) {
        setErrorMessage(res.error || 'Failed to sort clues into rounds.');
      } else {
        const roundById = new Map<string, ArchitectRoundNumber>();
        for (const c of [...res.sortedCoreClues, ...res.sortedRedHerringClues]) {
          roundById.set(c.id, c.roundNumber);
        }

        setBeatCluesMap((prev) => {
          const next: Record<number, SuggestedClueCandidate[]> = {};
          for (const [bNum, list] of Object.entries(prev)) {
            next[Number(bNum)] = list.map((c) =>
              roundById.has(c.id) ? { ...c, roundNumber: roundById.get(c.id)! } : c
            );
          }
          return next;
        });

        setSubplots((prev) =>
          prev.map((s) => ({
            ...s,
            decoyClues: s.decoyClues.map((dc) =>
              roundById.has(dc.id) ? { ...dc, roundNumber: roundById.get(dc.id)! } : dc
            ),
          }))
        );

        setRoundStrategySummary(res.roundStrategySummary || {});
        setStatusToast(
          `Sorted all ${selectedCoreClues.length + selectedRedHerringClues.length} clues across Rounds 1–${totalRounds} by investigative complexity. Recommended Complexity: ${difficultyRec.recommendedTier.toUpperCase()}.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error sorting clues into rounds.');
    } finally {
      setIsSortingRounds(false);
    }
  };

  const handleTurnIntoMysteryBase = async () => {
    setErrorMessage(null);
    setIsAssembling(true);
    try {
      const activeSubplots: SuggestedRedHerringSubplot[] = subplots
        .map((s) => ({
          ...s,
          decision: 'yes' as const,
          decoyClues: s.decoyClues.filter((dc) => dc.decision === 'yes'),
        }))
        .filter((s) => s.decoyClues.length > 0);

      const res = await assembleAndProofreadFullBaseAction({
        blueprint: { ...blueprint, complexity: difficultyRec.recommendedTier },
        approvedCoreClues: selectedCoreClues,
        approvedSubplots: activeSubplots,
      });

      if (!res.success || !res.assembled) {
        setErrorMessage(res.error || 'Failed to assemble full mystery base.');
        return;
      }

      setAssembled(res.assembled);

      setIsTransferring(true);
      const transferRes = await transferBlueprintToDraftMysteryBaseAction({
        assembled: res.assembled,
      });
      if (!transferRes.success || !transferRes.mysteryId) {
        setErrorMessage(transferRes.error || 'Assembled base, but failed to save to Mystery Bases.');
      } else {
        setTransferredMysteryId(transferRes.mysteryId);
        setStatusToast(
          `Created "${res.assembled.title}" (${difficultyRec.recommendedTier.toUpperCase()} • ${res.assembled.clues.length} clues) in Mystery Bases!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error turning blueprint into Mystery Base.');
    } finally {
      setIsAssembling(false);
      setIsTransferring(false);
    }
  };

  const handleAutoFixIssues = async () => {
    if (!assembled) return;
    setIsAutoFixing(true);
    setErrorMessage(null);
    try {
      const res = await autoFixAssembledBaseIssuesAction({ assembled });
      if (!res.success || !res.assembled) {
        setErrorMessage(res.error || 'Failed to auto-fix issues.');
      } else {
        setAssembled(res.assembled);
        setStatusToast(`Fixed: ${(res.fixesApplied || []).join(' • ')}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error running auto-fix.');
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleToggleLoadMenu = async () => {
    const next = !showLoadMenu;
    setShowLoadMenu(next);
    if (next && draftList.length === 0) {
      setIsLoadingDrafts(true);
      try {
        const res = await listDraftMysteryBasesForArchitectAction();
        if (res.success && res.drafts) {
          setDraftList(res.drafts);
        }
      } finally {
        setIsLoadingDrafts(false);
      }
    }
  };

  const handleImportExistingBaseAsProject = async (mysteryId: string) => {
    setIsLoadingDrafts(true);
    setErrorMessage(null);
    try {
      const res = await loadExistingDraftIntoArchitectAction({ mysteryId });
      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Failed to load mystery base.');
      } else {
        const grouped: Record<number, SuggestedClueCandidate[]> = {};
        (res.coreClues || []).forEach((c, idx) => {
          const bNum = c.beatNumber || (idx % Math.max(1, res.blueprint!.beats.length)) + 1;
          if (!grouped[bNum]) grouped[bNum] = [];
          grouped[bNum].push({ ...c, beatNumber: bNum, decision: 'yes' });
        });
        const importedProj: OgProjectWorkspace = {
          id: `og-proj-import-${mysteryId}`,
          updatedAt: new Date().toISOString(),
          step: 1,
          blueprint: res.blueprint,
          beatCluesMap: grouped,
          subplots: res.subplots || [],
          roundStrategySummary: {},
          assembled: null,
          transferredMysteryId: mysteryId,
        };
        setProjects((prev) => [
          importedProj,
          ...prev.filter((p) => p.id !== importedProj.id),
        ]);
        setActiveProjectId(importedProj.id);
        setShowLoadMenu(false);
        setStatusToast(`Imported "${res.blueprint.title}" into OG Base Builder.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading mystery base.');
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  const victimCount = blueprint.characters.filter((c) => c.plotRole === 'victim').length;
  const killerCount = blueprint.characters.filter((c) => c.plotRole === 'killer').length;
  const assistantCount = blueprint.characters.filter((c) => c.plotRole === 'assistant').length;

  const activeBeat =
    blueprint.beats.find((b) => b.beatNumber === activeBeatNumber) || blueprint.beats[0];
  const activeBeatCandidates = beatCluesMap[activeBeatNumber] || [];
  const activeBeatSelectedCount = activeBeatCandidates.filter((c) => c.decision === 'yes').length;
  const activeBeatCoverage = useMemo(
    () =>
      activeBeat
        ? analyzeBeatSelectionCoverage(activeBeat, activeBeatCandidates, blueprint.id)
        : null,
    [activeBeat, activeBeatCandidates, blueprint.id]
  );

  const activeSubplot = subplots[activeSubplotIndex] || subplots[0] || null;

  const allSelectedClues = useMemo(
    () => [...selectedCoreClues, ...selectedRedHerringClues],
    [selectedCoreClues, selectedRedHerringClues]
  );

  // ==========================================================================
  // IMPROVEMENTS 1–5 HELPERS & HANDLERS
  // ==========================================================================
  const togglePreviewClueUi = (clueId: string) => {
    setPreviewingClueIds((prev) => ({ ...prev, [clueId]: !prev[clueId] }));
  };

  const applyCluePatchEverywhere = (
    clue: SuggestedClueCandidate,
    patch: Partial<SuggestedClueCandidate>
  ) => {
    if (clue.isRedHerring && clue.subplotId) {
      updateRedHerringClueField(clue.subplotId, clue.id, patch);
    } else if (clue.beatNumber) {
      updateBeatClueField(clue.beatNumber, clue.id, patch);
    } else {
      // Fallback: scan beatCluesMap and subplots
      setBeatCluesMap((prev) => {
        const next: Record<number, SuggestedClueCandidate[]> = {};
        for (const [bKey, list] of Object.entries(prev)) {
          next[Number(bKey)] = (list || []).map((c) =>
            c.id === clue.id ? { ...c, ...patch } : c
          );
        }
        return next;
      });
      setSubplots((prev) =>
        prev.map((s) => ({
          ...s,
          decoyClues: s.decoyClues.map((dc) => (dc.id === clue.id ? { ...dc, ...patch } : dc)),
        }))
      );
    }
  };

  const handleTestRenderCluePhoto = async (clue: SuggestedClueCandidate) => {
    setErrorMessage(null);
    setRenderingPhotoClueId(clue.id);
    try {
      const promptToUse =
        clue.generationPrompt ||
        buildDefaultDetailedPhotoPrompt(clue.title, clue.description, blueprint.spiceLevel);
      const res = await testRenderArchitectCluePhotoAction({
        clueTitle: clue.title,
        generationPrompt: promptToUse,
        spiceLevel: blueprint.spiceLevel,
      });
      if (!res.success || !res.imageUrl) {
        setErrorMessage(res.error || 'Failed to test-render photo.');
      } else {
        applyCluePatchEverywhere(clue, {
          generationPrompt: promptToUse,
          previewImageUrl: res.imageUrl,
        });
        setPreviewingClueIds((prev) => ({ ...prev, [clue.id]: true }));
        setStatusToast(
          `Rendered live evidence photo for "${clue.title}"! This photo will automatically transfer when you Turn Into Mystery Base.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error rendering clue photo.');
    } finally {
      setRenderingPhotoClueId(null);
    }
  };

  const handleInjectDoubleMeaningSuspect = async (
    beatNum: number,
    clue: SuggestedClueCandidate,
    targetSuspectRole: string
  ) => {
    if (!targetSuspectRole) return;
    const beatObj =
      blueprint.beats.find((b) => b.beatNumber === beatNum) || blueprint.beats[0];
    if (!beatObj) return;

    setErrorMessage(null);
    setInjectingTwistClueId(clue.id);
    try {
      const res = await injectDoubleMeaningTwistIntoBeatClueAction({
        blueprint,
        beat: beatObj,
        clue,
        targetSuspectRole,
      });
      if (!res.success || !res.updatedClue) {
        setErrorMessage(res.error || 'Failed to inject double-meaning twist.');
      } else {
        updateBeatClueField(beatNum, clue.id, res.updatedClue);
        setStatusToast(
          `Wove a double-meaning twist into "${clue.title}" framing {{${targetSuspectRole}}} while keeping Beat #${beatNum} 100% intact!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error injecting double-meaning twist.');
    } finally {
      setInjectingTwistClueId(null);
    }
  };

  const getInvolvedNonVictimRolesForClue = (clue: SuggestedClueCandidate): string[] => {
    const foundRoles = new Set<string>();
    const nonVictims = blueprint.characters.filter((c) => c.plotRole !== 'victim');
    for (const r of clue.involvedRoles || []) {
      const clean = r.replace(/^\{\{|\}\}$/g, '').trim();
      const matched = nonVictims.find(
        (c) => c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === clean.toLowerCase()
      );
      if (matched) foundRoles.add(matched.roleTitle);
    }
    const textToScan = `${clue.title} ${clue.description} ${clue.pointsTo} ${clue.doubleMeaningNote || ''}`.toLowerCase();
    for (const ch of nonVictims) {
      const clean = ch.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
      if (textToScan.includes(clean.toLowerCase())) {
        foundRoles.add(ch.roleTitle);
      }
    }
    if (foundRoles.size === 0 && nonVictims.length > 0) {
      foundRoles.add(nonVictims[0].roleTitle);
    }
    return Array.from(foundRoles);
  };

  const getSyncedTalkingPointsForClue = (
    clue: SuggestedClueCandidate
  ): { roleTitle: string; plotRole: CharacterPlotRole; defensiveLine: string }[] => {
    const roles = getInvolvedNonVictimRolesForClue(clue);
    return roles.map((roleTitle) => {
      const charObj = blueprint.characters.find(
        (c) =>
          c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() ===
          roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase()
      );
      const plotRole: CharacterPlotRole = charObj?.plotRole || 'innocent';
      const custom = (clue.characterTalkingPoints || []).find(
        (tp) =>
          tp.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() ===
          roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase()
      );
      if (custom && custom.defensiveLine) {
        return { roleTitle, plotRole, defensiveLine: custom.defensiveLine };
      }

      const defaultLine =
        plotRole === 'killer'
          ? `When "${clue.title}" drops in Round ${clue.roundNumber}: Deny any fatal intent around ${clue.timestampLabel} and point out how this evidence actually matches your rival suspects' motive.`
          : plotRole === 'assistant'
            ? `When "${clue.title}" drops in Round ${clue.roundNumber}: Admit only the bare minimum about ${clue.timestampLabel} while protecting your secret cover-up pact.`
            : `When "${clue.title}" drops in Round ${clue.roundNumber}: Defend your alibi at ${clue.timestampLabel} — admit your private dispute with the victim, but insist someone else used it to frame you.`;

      return { roleTitle, plotRole, defensiveLine: defaultLine };
    });
  };

  const updateClueTalkingPoint = (
    clue: SuggestedClueCandidate,
    roleTitle: string,
    nextLine: string
  ) => {
    const currentList = getSyncedTalkingPointsForClue(clue);
    const updated = currentList.map((tp) =>
      tp.roleTitle === roleTitle
        ? { roleTitle: tp.roleTitle, defensiveLine: nextLine }
        : { roleTitle: tp.roleTitle, defensiveLine: tp.defensiveLine }
    );
    applyCluePatchEverywhere(clue, { characterTalkingPoints: updated });
  };

  const renderInlineClueUiPreview = (clue: SuggestedClueCandidate) => {
    const isPreviewOpen = Boolean(previewingClueIds[clue.id]);
    const isPhoto = isPhotoClueFormat(clue.format);
    const isRenderingThisPhoto = renderingPhotoClueId === clue.id;

    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => togglePreviewClueUi(clue.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
              isPreviewOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
            }`}
          >
            {isPreviewOpen ? '🙈 Hide Player UI Preview' : '👁️ Preview What Players See (Live UI)'}
          </button>

          {isPhoto && (
            <button
              type="button"
              onClick={() => handleTestRenderCluePhoto(clue)}
              disabled={isRenderingThisPhoto}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-pink-50 hover:bg-pink-100 text-brand-pink border border-pink-200 transition cursor-pointer disabled:opacity-50"
            >
              {isRenderingThisPhoto
                ? '⚡ Rendering Forensic Photo...'
                : clue.previewImageUrl
                  ? '🔄 Re-Render Test Photo'
                  : '⚡ Test Render AI Photo Now'}
            </button>
          )}

          {isPhoto && clue.previewImageUrl && (
            <span className="text-[11px] font-bold text-emerald-700">
              ✓ Live Photo Rendered (Will Carry Over to Mystery Base)
            </span>
          )}
        </div>

        {isPreviewOpen && (
          <div className="rounded-2xl bg-slate-900/95 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-slate-400">
              <span>👁️ Live Player-Facing Clue Card ({clue.format})</span>
              <span>Timestamp: {clue.timestampLabel}</span>
            </div>
            <div className="max-w-xl mx-auto">
              <ClueRenderer
                clue={{
                  id: clue.id,
                  title: clue.title,
                  description: clue.description,
                  format: clue.format,
                  round_number: clue.roundNumber,
                  static_image_url: clue.previewImageUrl || null,
                }}
                formatOverride={clue.format}
                hydratedTitle={clue.title}
                hydratedDescription={clue.description}
                showImage={true}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // IMPROVEMENT #5: Full-Mystery 5-Beat Coverage Summary Bar
  const renderFiveBeatCoverageSummaryBar = () => {
    const beatSummaries = blueprint.beats.map((b) => {
      const cands = beatCluesMap[b.beatNumber] || [];
      const cov = analyzeBeatSelectionCoverage(b, cands, blueprint.id);
      const pickedCount = cov.selectedMeta.length;
      return {
        beat: b,
        pickedCount,
        cov,
      };
    });

    const fullyCoveredBeatsCount = beatSummaries.filter(
      (bs) => bs.pickedCount >= 2 && bs.cov.isWholeBeatCovered
    ).length;

    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              🧩 Full-Mystery 5-Beat Coverage Health Strip ({fullyCoveredBeatsCount} /{' '}
              {blueprint.beats.length} Beats at 100%)
            </h3>
            <p className="text-[11px] text-slate-500">
              Check all 5 beats at a glance before generating Red Herrings. Click any beat below to
              inspect or fix gaps.
            </p>
          </div>
          {fullyCoveredBeatsCount === blueprint.beats.length && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✓ All 5 Beats 100% Covered ({selectedCoreClues.length} Clues)
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
          {beatSummaries.map(({ beat, pickedCount, cov }) => {
            const isFocused = activeBeatNumber === beat.beatNumber;
            const isFull = pickedCount >= 2 && cov.isWholeBeatCovered;
            const hasGap = pickedCount >= 2 && !cov.isWholeBeatCovered;

            return (
              <button
                key={beat.beatNumber}
                type="button"
                onClick={() => handleSelectBeatTab(beat.beatNumber)}
                className={`p-3 rounded-xl border-2 text-left transition cursor-pointer space-y-1 ${
                  isFocused
                    ? 'border-brand-pink bg-pink-50/50 shadow-xs'
                    : isFull
                      ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50'
                      : hasGap
                        ? 'border-amber-300 bg-amber-50/60 hover:bg-amber-50'
                        : 'border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-black uppercase text-slate-800">
                    Beat #{beat.beatNumber}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isFull
                        ? 'bg-emerald-600 text-white'
                        : hasGap
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isFull
                      ? '✓ 100%'
                      : hasGap
                        ? `⚠️ ${cov.coveragePct}%`
                        : `${pickedCount}/2`}
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-800 truncate">{beat.title}</div>
                <div className="text-[10px] text-slate-500">
                  {isFull
                    ? '3/3 Sub-Facts Covered'
                    : hasGap
                      ? `Gap: ${cov.uncoveredSubFacts[0] || '1 Missing Fact'}`
                      : `${cov.coveredCount}/3 Sub-Facts (${pickedCount}/2 Picked)`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to deterministically weave an under-featured character into existing Red Herring storylines & fake clues
  const handleAutoWeaveCharacterIntoRedHerrings = (targetRoleTitle: string) => {
    const cleanRole = targetRoleTitle.replace(/^\{\{|\}\}$/g, '').trim();
    const charObj = blueprint.characters.find(
      (c) =>
        c.roleTitle.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
    );
    const victimRole =
      blueprint.characters.find((c) => c.plotRole === 'victim')?.roleTitle || 'The Prom Queen';

    if (subplots.length === 0) {
      handleMoveToRedHerrings(true);
      return;
    }

    const doesClueHaveRole = (cl: SuggestedClueCandidate) => {
      const inList = (cl.involvedRoles || []).some(
        (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
      );
      const inText = `${cl.title} ${cl.description} ${cl.pointsTo} ${cl.doubleMeaningNote || ''}`
        .toLowerCase()
        .includes(cleanRole.toLowerCase());
      return inList || inText;
    };

    let currentCount = allSelectedClues.filter(doesClueHaveRole).length;
    const TARGET_MIN = 4;

    setSubplots((prev) =>
      prev.map((sub) => {
        if (currentCount >= TARGET_MIN) return sub;
        let updatedSub = { ...sub };
        if (
          !updatedSub.involvedRoles.some(
            (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
          )
        ) {
          updatedSub.involvedRoles = [...updatedSub.involvedRoles, cleanRole];
        }
        if (!updatedSub.summary.toLowerCase().includes(cleanRole.toLowerCase())) {
          updatedSub.summary = `${updatedSub.summary} {{${cleanRole}}} is also entangled in this secret (${
            charObj?.motiveOrSecret || `hiding a fierce motive against {{${victimRole}}}`
          }).`;
        }

        updatedSub.decoyClues = updatedSub.decoyClues.map((dc) => {
          if (currentCount >= TARGET_MIN || doesClueHaveRole(dc)) return dc;
          const nextRoles = Array.from(new Set([...(dc.involvedRoles || []), cleanRole]));
          const nextDesc =
            dc.format === 'chat'
              ? `${dc.description}\n[${dc.timestampLabel}] {{${cleanRole}}}: Keep my name out of this—if anyone finds out what {{${victimRole}}} had on us, we're all finished.`
              : dc.format === 'audio'
                ? `${dc.description}\n{{${cleanRole}}}: "[whispers] Delete that right now—nobody can know I was upstairs before {{${victimRole}}} fell."`
                : `${dc.description} Includes an incriminating margin note from {{${cleanRole}}} demanding they keep their alibis straight before {{${victimRole}}} exposes them.`;
          const nextPointsTo = `${dc.pointsTo} Directly implicates {{${cleanRole}}} in the cover-up.`;
          if (dc.decision === 'yes') {
            currentCount++;
          }
          return {
            ...dc,
            involvedRoles: nextRoles,
            description: nextDesc,
            pointsTo: nextPointsTo,
          };
        });

        return updatedSub;
      })
    );

    setStatusToast(
      `Balanced {{${cleanRole}}} into your Red-Herring storylines & fake clues (now featured in ${Math.max(
        TARGET_MIN,
        currentCount
      )}/${allSelectedClues.length} clues)!`
    );
  };

  // IMPROVEMENT #1: Suspect Heat & Table Spotlight Meter (Step 3 & Step 4)
  const renderSuspectHeatAndSpotlightPanel = (cluesPool: SuggestedClueCandidate[]) => {
    if (cluesPool.length === 0) return null;

    const MIN_BALANCED_CLUES = 4;

    const totalCluesInPool = Math.max(1, cluesPool.length);

    const charStats = blueprint.characters.map((ch, idx) => {
      const cleanRole = ch.roleTitle.replace(/^\{\{|\}\}$/g, '').trim();
      const matchingClues = cluesPool.filter((cl) => {
        const inList = (cl.involvedRoles || []).some(
          (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
        );
        const inText = `${cl.title} ${cl.description} ${cl.pointsTo} ${cl.doubleMeaningNote || ''}`
          .toLowerCase()
          .includes(cleanRole.toLowerCase());
        if (inList || inText) return true;

        // Also check if this Real Clue is linked via double-meaning to a Red Herring subplot involving this character
        if (!cl.isRedHerring && subplots.length > 0) {
          const isLinkedViaSubplot = subplots.some((sub) => {
            const subHasRole = (sub.involvedRoles || []).some(
              (r) => r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase() === cleanRole.toLowerCase()
            );
            if (!subHasRole) return false;
            return (sub.linkedCoreClueTitles || []).some((lt) => {
              const ltLow = lt.toLowerCase().trim();
              const clTitleLow = cl.title.toLowerCase().trim();
              return (
                ltLow === clTitleLow ||
                clTitleLow.includes(ltLow) ||
                ltLow.includes(clTitleLow)
              );
            });
          });
          if (isLinkedViaSubplot) return true;
        }
        return false;
      });

      const coreCount = matchingClues.filter((c) => !c.isRedHerring).length;
      const fakeCount = matchingClues.filter((c) => c.isRedHerring).length;
      const r1Count = matchingClues.filter((c) => c.roundNumber === 1).length;
      const r2Count = matchingClues.filter((c) => c.roundNumber === 2).length;
      const r3Count = matchingClues.filter((c) => c.roundNumber >= 3).length;

      return {
        character: ch,
        pillStyle: CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length],
        totalCount: matchingClues.length,
        coreCount,
        fakeCount,
        r1Count,
        r2Count,
        r3Count,
        matchingClues,
      };
    });

    const underFeaturedSuspects = charStats.filter(
      (cs) => cs.character.plotRole !== 'victim' && cs.totalCount < MIN_BALANCED_CLUES
    );
    const killerStat = charStats.find((cs) => cs.character.plotRole === 'killer');
    const r1Total = Math.max(1, cluesPool.filter((c) => c.roundNumber === 1).length);
    const killerTooHotInR1 =
      killerStat && killerStat.r1Count >= 3 && killerStat.r1Count / r1Total > 0.5;

    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              🕵️‍♂️ Primary Character Balance &amp; Table Spotlight ({cluesPool.length} Selected Clues)
            </h3>
            <p className="text-[11px] text-slate-500">
              Each bar shows a character&apos;s appearance across <strong>all {cluesPool.length} clues</strong> (Real Beat Clues + Fake Red-Herring Clues). Aim for <strong>at least {MIN_BALANCED_CLUES}–6 clues</strong> per character.
            </p>
          </div>
          {underFeaturedSuspects.length === 0 && !killerTooHotInR1 ? (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✓ All Primary Characters Balanced ({MIN_BALANCED_CLUES}+ Clues Each)
            </span>
          ) : (
            underFeaturedSuspects.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  for (const uf of underFeaturedSuspects) {
                    handleAutoWeaveCharacterIntoRedHerrings(uf.character.roleTitle);
                  }
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-brand-pink hover:bg-pink-600 text-white shadow-xs transition cursor-pointer"
              >
                ⚖️ 1-Click Balance All Characters to {MIN_BALANCED_CLUES}+ Clues
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {charStats.map((cs) => {
            const ch = cs.character;
            const isLow = ch.plotRole !== 'victim' && cs.totalCount < MIN_BALANCED_CLUES;
            const pct = Math.min(
              100,
              Math.round((cs.totalCount / totalCluesInPool) * 100)
            );
            const corePct = Math.min(
              100,
              Math.round((cs.coreCount / totalCluesInPool) * 100)
            );
            const fakePct = Math.max(0, Math.min(100 - corePct, pct - corePct));

            const primaryBarColor = isLow
              ? 'bg-amber-500'
              : ch.plotRole === 'killer'
                ? 'bg-rose-600'
                : ch.plotRole === 'assistant'
                  ? 'bg-amber-500'
                  : 'bg-indigo-600';

            const fakeBarColor = isLow
              ? 'bg-amber-300'
              : ch.plotRole === 'killer'
                ? 'bg-rose-300'
                : ch.plotRole === 'assistant'
                  ? 'bg-amber-300'
                  : 'bg-indigo-300';

            return (
              <div
                key={ch.id}
                className={`rounded-xl bg-white border p-3.5 space-y-2 ${
                  isLow ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black border ${cs.pillStyle.bg} ${cs.pillStyle.text} ${cs.pillStyle.border}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cs.pillStyle.dot}`} />
                    <span>{ch.roleTitle}</span>
                  </span>
                  <span
                    className={`text-xs font-black ${
                      isLow ? 'text-amber-800' : 'text-slate-800'
                    }`}
                  >
                    {cs.totalCount} / {cluesPool.length} Clues ({pct}%)
                  </span>
                </div>

                <div
                  className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden flex"
                  title={`${cs.totalCount} / ${cluesPool.length} Total Clues (${pct}%): ${cs.coreCount} Real Clues + ${cs.fakeCount} Fake Clues`}
                >
                  {corePct > 0 && (
                    <div
                      style={{ width: `${corePct}%` }}
                      className={`h-full transition-all ${primaryBarColor}`}
                    />
                  )}
                  {fakePct > 0 && (
                    <div
                      style={{ width: `${fakePct}%` }}
                      className={`h-full transition-all ${fakeBarColor}`}
                    />
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                  <span>
                    Real Clues: <strong>{cs.coreCount}</strong> • Fake Clues:{' '}
                    <strong className="text-indigo-700">+{cs.fakeCount}</strong>
                  </span>
                  <span>
                    R1: <strong>{cs.r1Count}</strong> • R2: <strong>{cs.r2Count}</strong> • R3:{' '}
                    <strong>{cs.r3Count}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Actionable Suspect Spotlight & Killer Heat Suggestions */}
        {(underFeaturedSuspects.length > 0 || killerTooHotInR1) && (
          <div className="space-y-2 pt-1">
            {underFeaturedSuspects.map((uf) => {
              const targetCoreClue =
                selectedCoreClues.find(
                  (c) => !(c.involvedRoles || []).includes(uf.character.roleTitle)
                ) || selectedCoreClues[0];

              return (
                <div
                  key={uf.character.id}
                  className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="text-xs font-semibold text-amber-950 flex-1">
                    💡 <strong>Character Balance Alert:</strong>{' '}
                    <strong>{uf.character.roleTitle}</strong> is only in{' '}
                    <strong>
                      {uf.totalCount}/{cluesPool.length} clues
                    </strong>{' '}
                    ({uf.coreCount} Real + {uf.fakeCount} Fake — target is {MIN_BALANCED_CLUES}+
                    clues). We suggest weaving <strong>{uf.character.roleTitle}</strong> into your
                    Red-Herring clues or adding a double-meaning twist!
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAutoWeaveCharacterIntoRedHerrings(uf.character.roleTitle)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-brand-pink hover:bg-pink-600 text-white transition cursor-pointer whitespace-nowrap"
                    >
                      ⚖️ Boost {uf.character.roleTitle} in Fake Clues (to {MIN_BALANCED_CLUES}+)
                    </button>
                    {targetCoreClue && (
                      <button
                        type="button"
                        onClick={() =>
                          handleInjectDoubleMeaningSuspect(
                            targetCoreClue.beatNumber || 1,
                            targetCoreClue,
                            uf.character.roleTitle
                          )
                        }
                        disabled={injectingTwistClueId === targetCoreClue.id}
                        className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-900 hover:bg-slate-800 text-white transition cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        {injectingTwistClueId === targetCoreClue.id
                          ? 'Weaving Twist...'
                          : `🎭 Tie Into Real Clue`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {killerTooHotInR1 && killerStat && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-semibold text-rose-950 flex-1">
                  ⚠️ <strong>Early Killer Heat Warning:</strong> True Killer{' '}
                  <strong>{killerStat.character.roleTitle}</strong> is implicated in{' '}
                  <strong>{killerStat.r1Count} Round 1 clues</strong>. We suggest moving one of
                  their Round 1 Core Clues to Round 2 or Round {totalRounds} so players don&apos;t
                  lock onto the Killer in Round 1.
                </div>
                {(() => {
                  const r1KillerClue = killerStat.matchingClues.find(
                    (c) => c.roundNumber === 1 && !c.isRedHerring
                  );
                  if (!r1KillerClue) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        applyCluePatchEverywhere(r1KillerClue, { roundNumber: 2 });
                        setStatusToast(
                          `Moved "${r1KillerClue.title}" from Round 1 to Round 2 to keep early heat off the Killer!`
                        );
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-rose-900 hover:bg-brand-pink text-white transition cursor-pointer whitespace-nowrap"
                    >
                      🔀 Move &ldquo;{r1KillerClue.title.slice(0, 22)}...&rdquo; to Round 2
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderMediaMixBreakdownPanel = (
    cluesPool: SuggestedClueCandidate[],
    stageTitle: string
  ) => {
    if (cluesPool.length === 0) return null;
    const total = Math.max(1, cluesPool.length);
    const photoClues = cluesPool.filter((c) => getClueMediumCategory(c.format) === 'photo');
    const audioClues = cluesPool.filter((c) => getClueMediumCategory(c.format) === 'audio');
    const textClues = cluesPool.filter((c) => getClueMediumCategory(c.format) === 'text');

    const photoPct = Math.round((photoClues.length / total) * 100);
    const audioPct = Math.round((audioClues.length / total) * 100);
    const textPct = Math.max(0, 100 - photoPct - audioPct);

    const suggestions: {
      id: string;
      message: string;
      buttonLabel: string;
      onApply: () => void;
    }[] = [];

    const applyFormatSwitch = (clue: SuggestedClueCandidate, nextFmt: ClueFormat) => {
      const nextIsPhoto = isPhotoClueFormat(nextFmt);
      const patch: Partial<SuggestedClueCandidate> = {
        format: nextFmt,
        generationPrompt: nextIsPhoto
          ? clue.generationPrompt && clue.generationPrompt.length >= 90
            ? clue.generationPrompt
            : buildDefaultDetailedPhotoPrompt(clue.title, clue.description, blueprint.spiceLevel)
          : '',
      };
      if (clue.isRedHerring && clue.subplotId) {
        updateRedHerringClueField(clue.subplotId, clue.id, patch);
      } else if (clue.beatNumber) {
        updateBeatClueField(clue.beatNumber, clue.id, patch);
      }
      setStatusToast(
        `Switched "${clue.title}" to ${nextFmt.toUpperCase()} for better pack balance!`
      );
    };

    if (photoPct < 25 && textClues.length > 0) {
      const candidate = textClues[0];
      const idxNum = cluesPool.findIndex((c) => c.id === candidate.id) + 1;
      suggestions.push({
        id: `to-photo-${candidate.id}`,
        message: `You only have ${photoClues.length} Photo clues (${photoPct}%). We suggest you switch Clue #${idxNum} ("${candidate.title}") from ${candidate.format} to a Photo for better balance.`,
        buttonLabel: `📸 Switch Clue #${idxNum} to Photo`,
        onApply: () => applyFormatSwitch(candidate, 'physical_prop'),
      });
    }

    if (photoPct > 45 && photoClues.length > 2) {
      const candidate = photoClues[photoClues.length - 1];
      const idxNum = cluesPool.findIndex((c) => c.id === candidate.id) + 1;
      suggestions.push({
        id: `from-photo-${candidate.id}`,
        message: `Your pack is heavy on Photo clues (${photoClues.length} photos / ${photoPct}%). We suggest you switch Clue #${idxNum} ("${candidate.title}") to a Forensic Document or Note so the pack isn't slammed with photos.`,
        buttonLabel: `📑 Switch Clue #${idxNum} to Document`,
        onApply: () => applyFormatSwitch(candidate, 'document'),
      });
    }

    if (audioClues.length === 0 || (cluesPool.length >= 8 && audioClues.length < 2)) {
      const candidate =
        textClues.find((c) => c.format === 'chat' || c.format === 'social_post') ||
        textClues[textClues.length - 1];
      if (candidate) {
        const idxNum = cluesPool.findIndex((c) => c.id === candidate.id) + 1;
        suggestions.push({
          id: `to-audio-${candidate.id}`,
          message: `You only have ${audioClues.length} Audio voice clue (${audioPct}%). We suggest you switch Clue #${idxNum} ("${candidate.title}") to an Audio Voice Note for better variety.`,
          buttonLabel: `🎙️ Switch Clue #${idxNum} to Audio Voice Note`,
          onApply: () => applyFormatSwitch(candidate, 'audio'),
        });
      }
    }

    if (textPct > 62 && textClues.length > 2) {
      const candidate = textClues[1] || textClues[0];
      const idxNum = cluesPool.findIndex((c) => c.id === candidate.id) + 1;
      suggestions.push({
        id: `text-heavy-${candidate.id}`,
        message: `Your pack is slammed with Text clues (${textClues.length} text / ${textPct}%). We suggest you switch Clue #${idxNum} ("${candidate.title}") to a CCTV or Physical Prop Photo to break up the reading load.`,
        buttonLabel: `📹 Switch Clue #${idxNum} to CCTV Photo`,
        onApply: () => applyFormatSwitch(candidate, 'cctv'),
      });
    }

    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              📊 {stageTitle} ({cluesPool.length} Clues Selected)
            </h3>
            <p className="text-[11px] text-slate-500">
              Target mix so packs aren&apos;t slammed with one medium: ~30–35% Photos • ~15–25%
              Audio • ~45–50% Text &amp; Digital UI
            </p>
          </div>
          {suggestions.length === 0 && (
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              ✓ Optimal Media Balance
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-white border border-pink-200 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black uppercase text-brand-pink">
                📸 Photos (Prop / CCTV)
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {photoClues.length} of {cluesPool.length} Clues (Uses AI Photo Prompt)
              </div>
            </div>
            <span className="text-xl font-black text-brand-pink">{photoPct}%</span>
          </div>

          <div className="rounded-xl bg-white border border-blue-200 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black uppercase text-blue-700">
                🎙️ Audio Voice Notes
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {audioClues.length} of {cluesPool.length} Clues (ElevenLabs Audio)
              </div>
            </div>
            <span className="text-xl font-black text-blue-700">{audioPct}%</span>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-black uppercase text-slate-700">
                💬 Text UI (Chat / Doc / Note)
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {textClues.length} of {cluesPool.length} Clues (No Photo Needed)
              </div>
            </div>
            <span className="text-xl font-black text-slate-800">{textPct}%</span>
          </div>
        </div>

        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden flex">
          <div
            style={{ width: `${photoPct}%` }}
            className="h-full bg-brand-pink transition-all"
            title={`Photos: ${photoPct}%`}
          />
          <div
            style={{ width: `${audioPct}%` }}
            className="h-full bg-blue-600 transition-all"
            title={`Audio: ${audioPct}%`}
          />
          <div
            style={{ width: `${textPct}%` }}
            className="h-full bg-slate-700 transition-all"
            title={`Text UI: ${textPct}%`}
          />
        </div>

        {suggestions.length > 0 && (
          <div className="space-y-2 pt-1">
            {suggestions.map((sug) => (
              <div
                key={sug.id}
                className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="text-xs font-semibold text-amber-950 flex-1">
                  💡 <strong>Balance Suggestion:</strong> {sug.message}
                </div>
                <button
                  type="button"
                  onClick={sug.onApply}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-900 hover:bg-brand-pink text-white transition cursor-pointer whitespace-nowrap"
                >
                  {sug.buttonLabel}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ==========================================================================
  // VIEW 1: OG BASE BUILDER PROJECTS HUB
  // ==========================================================================
  if (!activeProject) {
    return (
      <div className="space-y-8 pb-20">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-brand-dark uppercase tracking-tight">
              OG Base Builder
            </h2>
            <p className="text-gray-500 text-sm font-medium">
              Select a mystery project you&apos;re working on or start a new 5-beat blueprint
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider shadow-sm transition flex items-center gap-2">
              <span>{isUploadingDiagram ? 'Reading Diagram...' : '📷 New From Diagram Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleDiagramUpload(e, true)}
                disabled={isUploadingDiagram}
                className="hidden"
              />
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={handleToggleLoadMenu}
                className="px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-black uppercase tracking-wider shadow-sm transition cursor-pointer"
              >
                📂 Import Existing Base
              </button>
              {showLoadMenu && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-64 sm:w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-40 max-h-80 overflow-y-auto">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5">
                    Import Existing Mystery Base
                  </div>
                  {isLoadingDrafts ? (
                    <div className="text-xs text-slate-400 p-3">Loading...</div>
                  ) : draftList.length === 0 ? (
                    <div className="text-xs text-slate-400 p-3">No bases found.</div>
                  ) : (
                    draftList.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleImportExistingBaseAsProject(d.id)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 text-xs flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <span className="font-bold text-slate-800 truncate">{d.title}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {d.spiceLevel}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateNewBlankProject}
              className="px-4 sm:px-5 py-2.5 rounded-2xl bg-brand-pink hover:bg-pink-600 text-white text-xs font-black uppercase tracking-wider shadow-sm transition cursor-pointer"
            >
              + New OG Mystery
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3.5 text-xs font-medium text-red-700 flex items-center justify-between">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-500 hover:text-red-800 ml-4 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {statusToast && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3.5 text-xs font-medium text-emerald-800 flex items-center justify-between">
            <span>{statusToast}</span>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-emerald-600 hover:text-emerald-900 ml-4 font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="bg-white rounded-3xl sm:rounded-[32px] border border-gray-100 shadow-sm overflow-hidden p-8 sm:p-16 text-center space-y-4">
            <h3 className="text-lg font-black text-brand-dark">No Active OG Projects Yet</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto">
              Start a new mystery project from a relationship diagram or load the Unibreak at the
              Cabin 5-beat blueprint.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCreateUnibreakProject}
                className="px-5 py-2.5 rounded-2xl bg-pink-50 hover:bg-pink-100 text-brand-pink border border-pink-200 text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                Load &ldquo;Unibreak at the Cabin&rdquo;
              </button>
              <button
                type="button"
                onClick={handleCreateNewBlankProject}
                className="px-5 py-2.5 rounded-2xl bg-brand-pink hover:bg-pink-600 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
              >
                + Start Blank OG Mystery
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-8">
            {projects.map((proj) => {
              const bp = proj.blueprint;
              const roundsCount = getRoundsForCount(bp.characters.length);
              const coreCount = Object.values(proj.beatCluesMap || {})
                .flat()
                .filter((c) => c.decision === 'yes').length;
              const rhCount = (proj.subplots || [])
                .filter((s) => s.decision !== 'no')
                .flatMap((s) => s.decoyClues || [])
                .filter((dc) => dc.decision === 'yes').length;
              const totalClues = coreCount + rhCount;

              const killerChar = bp.characters.find((c) => c.plotRole === 'killer');
              const victimChar = bp.characters.find((c) => c.plotRole === 'victim');
              const accompliceChar = bp.characters.find((c) => c.plotRole === 'assistant');

              const stepLabels: Record<number, string> = {
                1: 'Step 1: Plot & 5 Beats',
                2: 'Step 2: Picking Beat Clues',
                3: 'Step 3: Red Herrings',
                4: 'Step 4: Ready to Save Base',
              };

              return (
                <div
                  key={proj.id}
                  onClick={() => {
                    setActiveProjectId(proj.id);
                    setActiveBeatNumber(1);
                  }}
                  className="bg-white rounded-3xl sm:rounded-[32px] border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-brand-pink/40 transition-all duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white relative">
                      <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/15 text-white backdrop-blur-sm">
                          {bp.characters.length} Players • {roundsCount} Rounds
                        </span>
                        <span className="px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                          {bp.spiceLevel}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black tracking-tight text-white group-hover:text-pink-200 transition">
                        {bp.title || 'Untitled OG Mystery'}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1 line-clamp-1">
                        {bp.theme || 'Custom OG Mystery Blueprint'}
                      </p>
                    </div>

                    <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-black text-brand-pink uppercase tracking-wider">
                          {stepLabels[proj.step] || 'Step 1: Plot & 5 Beats'}
                        </span>
                        <span className="font-bold text-slate-500">
                          {totalClues} / 16 Clues
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-brand-pink rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(15, (totalClues / 16) * 100))}%`,
                          }}
                        />
                      </div>

                      <div className="rounded-2xl bg-slate-50 border border-slate-200/70 p-3 sm:p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 font-bold shrink-0">Victim:</span>
                          <span className="font-bold text-slate-800 truncate">
                            {victimChar?.roleTitle || 'Not set'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 font-bold shrink-0">Killer:</span>
                          <span className="font-bold text-rose-700 truncate">
                            {killerChar?.roleTitle || 'Not set'}
                            {accompliceChar ? ` + ${accompliceChar.roleTitle}` : ''}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 font-bold shrink-0">Core Beats:</span>
                          <span className="font-bold text-slate-700 truncate">
                            {bp.beats.length} Beats • {coreCount}/10 Core • {rhCount}/6 Red Herring
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-1 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveProjectId(proj.id);
                        setActiveBeatNumber(1);
                      }}
                      className="flex-1 py-2.5 sm:py-3 rounded-2xl bg-slate-900 group-hover:bg-brand-pink text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                    >
                      Open in OG Builder →
                    </button>

                    {proj.transferredMysteryId && (
                      <Link
                        href={`/${locale}/builder/mysteries/${proj.transferredMysteryId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3.5 py-2.5 sm:py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-black uppercase tracking-wider transition"
                        title="Open saved Draft in Mystery Builder"
                      >
                        Base ↗
                      </Link>
                    )}

                    {confirmDeleteId === proj.id ? (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProject(proj.id, e)}
                        className="px-3 py-2.5 sm:py-3 rounded-2xl bg-red-600 text-white text-xs font-black uppercase cursor-pointer"
                      >
                        Confirm
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteId(proj.id);
                        }}
                        className="p-2.5 sm:p-3 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                        title="Delete project from OG Builder"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // VIEW 2: ACTIVE OG MYSTERY WORKSPACE (4-STAGE BEAT-BY-BEAT FLOW)
  // ==========================================================================
  return (
    <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6 pb-20">
      {/* On-Brand Clean Page Header */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveProjectId(null)}
                className="text-xs font-black uppercase tracking-wider text-brand-pink hover:underline flex items-center gap-1 cursor-pointer"
              >
                ← All OG Projects ({projects.length})
              </button>
              <span className="text-slate-300">/</span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-400">
                {blueprint.characters.length} Players • {totalRounds} Rounds • {blueprint.spiceLevel}{' '}
                Spice
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-brand-dark tracking-tight mt-1">
              {blueprint.title || 'New Mystery Base'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
              {isUploadingDiagram ? 'Reading Diagram...' : '📷 Update From Diagram'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleDiagramUpload(e, false)}
                disabled={isUploadingDiagram}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setActiveProjectId(null)}
              className="px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer"
            >
              Switch Project
            </button>
          </div>
        </div>

        {/* Character Color Legend Bar so you can always scan who is who */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-slate-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">
            Cast Legend:
          </span>
          {blueprint.characters.map((ch, idx) => {
            const st = CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length];
            const roleIcon =
              ch.plotRole === 'victim'
                ? '💀 Victim'
                : ch.plotRole === 'killer'
                  ? '🔪 Killer'
                  : ch.plotRole === 'assistant'
                    ? '🤝 Accomplice'
                    : '🕵️ Suspect';
            return (
              <span
                key={ch.id}
                className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-black border ${st.bg} ${st.text} ${st.border}`}
              >
                <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                <span>{ch.roleTitle}</span>
                <span className="text-[10px] opacity-75 font-bold">({roleIcon})</span>
              </span>
            );
          })}
        </div>

        {/* Clean 4-Step Segmented Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            { num: 1 as const, title: '1. Plot & Archetypes', sub: '5 Core Beats & Cast' },
            {
              num: 2 as const,
              title: '2. Beat-by-Beat Core Clues',
              sub: `${selectedCoreClues.length} / 10 Core Clues`,
            },
            {
              num: 3 as const,
              title: '3. Red Herrings & Motives',
              sub: `${selectedRedHerringClues.length} / 6 Decoy Clues`,
            },
            {
              num: 4 as const,
              title: '4. Sort Rounds & Save Base',
              sub: `${totalSelectedCluesCount} / 16 Total Clues`,
            },
          ].map((item) => {
            const active = step === item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => {
                  if (item.num === 3 && selectedCoreClues.length >= 6) {
                    handleMoveToRedHerrings(false);
                  } else {
                    setStep(item.num);
                  }
                }}
                className={`p-2.5 sm:p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                }`}
              >
                <div className="text-[11px] sm:text-xs font-black tracking-tight leading-snug">{item.title}</div>
                <div
                  className={`text-[10px] sm:text-[11px] mt-0.5 ${
                    active ? 'text-pink-100 font-medium' : 'text-slate-400'
                  }`}
                >
                  {item.sub}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMessage && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-5 py-3.5 text-xs font-medium text-red-700 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 ml-4 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {statusToast && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-5 py-3.5 text-xs font-medium text-emerald-800 flex items-center justify-between">
          <span>{statusToast}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-emerald-600 hover:text-emerald-900 ml-4 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 1: LOCK 5-BEAT PLOT & CONVERT REAL NAMES TO ARCHETYPES      */}
      {/* ================================================================= */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Section 1: Mystery Basics + AI Mystery Renamer */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  1. Mystery Title, Package & Spice Level
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Start with a working title or click <strong>✨ AI Rename Mystery</strong> to pitch
                  5 polished, high-converting titles.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSuggestBetterTitles}
                disabled={isRenamingTitle}
                className="px-4 py-2 rounded-xl text-xs font-black bg-pink-50 hover:bg-pink-100 text-brand-pink border border-pink-200 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>
                  {isRenamingTitle
                    ? '✨ Pitching 5 Better Titles...'
                    : '✨ AI Rename Mystery (5 Title Ideas)'}
                </span>
              </button>
            </div>

            {/* AI Title Suggestions Drawer */}
            {titleSuggestions.length > 0 && (
              <div className="rounded-2xl bg-pink-50/50 border border-pink-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-brand-pink">
                    ✨ Click Any AI Title Below to Apply It:
                  </span>
                  <button
                    type="button"
                    onClick={() => setTitleSuggestions([])}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Close ✕
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                  {titleSuggestions.map((sug, i) => {
                    const isCurrent = blueprint.title === sug.title;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          updateBlueprint({ title: sug.title, theme: sug.theme });
                          setStatusToast(`Renamed mystery to "${sug.title}"!`);
                        }}
                        className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                            : 'bg-white hover:border-brand-pink border-slate-200 text-slate-800'
                        }`}
                      >
                        <div>
                          <span
                            className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1.5 ${
                              isCurrent
                                ? 'bg-white/20 text-white'
                                : 'bg-pink-50 text-brand-pink'
                            }`}
                          >
                            {sug.vibeTag}
                          </span>
                          <div className="text-xs font-black leading-snug">{sug.title}</div>
                        </div>
                        <div
                          className={`text-[11px] mt-1.5 line-clamp-2 ${
                            isCurrent ? 'text-pink-100' : 'text-slate-500'
                          }`}
                        >
                          {sug.theme}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Mystery Title (Working or Final)
                </label>
                <input
                  type="text"
                  value={blueprint.title}
                  onChange={(e) => updateBlueprint({ title: e.target.value })}
                  placeholder="e.g. Unibreak at the Cabin"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-pink"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Setting / Theme Tagline
                </label>
                <input
                  type="text"
                  value={blueprint.theme}
                  onChange={(e) => updateBlueprint({ theme: e.target.value })}
                  placeholder="e.g. Rowdy Uni Break Ski & Mountain Cabin Getaway"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Package Size & Rounds
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {PACKAGE_TIERS.map((tier) => {
                    const active = blueprint.characters.length === tier.players;
                    return (
                      <button
                        key={tier.players}
                        type="button"
                        onClick={() => handleSetPackagePlayerCount(tier.players)}
                        className={`p-3 rounded-xl text-left border-2 transition cursor-pointer ${
                          active
                            ? 'border-brand-pink bg-pink-50/50 text-brand-pink'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black">{tier.players} Players</div>
                        <div className="text-[11px] text-slate-500">{tier.rounds} Rounds</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2">
                  Spice Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SPICE_OPTIONS.map((sp) => {
                    const active = blueprint.spiceLevel === sp.level;
                    return (
                      <button
                        key={sp.level}
                        type="button"
                        onClick={() => updateBlueprint({ spiceLevel: sp.level })}
                        className={`p-3 rounded-xl text-left border-2 transition cursor-pointer ${
                          active
                            ? 'border-brand-pink bg-pink-50/50 text-brand-pink'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-black">{sp.label}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">{sp.sub}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Interactive Character Relationship Map + Color-Coded Character Cards */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  2. Interactive Relationship Map & Character Archetypes ({blueprint.characters.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Every character has their own color badge so you can immediately spot who is
                  talking in any relationship, motive, or beat. Click any text box to edit.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRelationshipMap((v) => !v)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-slate-100 hover:bg-slate-200 text-slate-800 transition cursor-pointer"
                >
                  {showRelationshipMap
                    ? '🗺️ Hide Interactive Relationship Map'
                    : '🗺️ Show Interactive Relationship Map'}
                </button>
              </div>
            </div>

            {/* Interactive Character Relationship Map */}
            {showRelationshipMap && (
              <div className="rounded-3xl border border-slate-200 overflow-hidden">
                <RelationshipGraph
                  characters={graphCharacters}
                  relationships={graphRelationships}
                  variant="light"
                  revealPlotRoles={true}
                />
              </div>
            )}

            {/* Color-Coded Character Cards with Full-Size Readable Text Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {blueprint.characters.map((char, idx) => {
                const isVictim = char.plotRole === 'victim';
                const isKiller = char.plotRole === 'killer';
                const isAssistant = char.plotRole === 'assistant';
                const pillStyle = CHARACTER_PILL_STYLES[idx % CHARACTER_PILL_STYLES.length];

                const cardBorder = isVictim
                  ? 'border-sky-300 bg-sky-50/30'
                  : isKiller
                    ? 'border-rose-300 bg-rose-50/30'
                    : isAssistant
                      ? 'border-amber-300 bg-amber-50/30'
                      : 'border-slate-200 bg-slate-50/50';

                return (
                  <div
                    key={char.id}
                    className={`rounded-2xl border-2 p-5 space-y-4 transition ${cardBorder}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                        <span
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}
                        >
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={char.roleTitle}
                          onChange={(e) =>
                            updateCharacter(char.id, { roleTitle: e.target.value })
                          }
                          placeholder="The Archetype Role"
                          className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-900 focus:outline-none focus:border-brand-pink"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <select
                          value={char.defaultGender}
                          onChange={(e) =>
                            updateCharacter(char.id, {
                              defaultGender: e.target.value as 'female' | 'male' | 'adaptable',
                            })
                          }
                          className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-pink"
                        >
                          <option value="female">♀ Female</option>
                          <option value="male">♂ Male</option>
                          <option value="adaptable">⚧ Adaptable</option>
                        </select>

                        <select
                          value={char.plotRole}
                          onChange={(e) =>
                            updateCharacter(char.id, {
                              plotRole: e.target.value as CharacterPlotRole,
                            })
                          }
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-black border focus:outline-none ${
                            isVictim
                              ? 'bg-sky-100 border-sky-300 text-sky-900'
                              : isKiller
                                ? 'bg-rose-100 border-rose-300 text-rose-900'
                                : isAssistant
                                  ? 'bg-amber-100 border-amber-300 text-amber-900'
                                  : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="victim">💀 Victim</option>
                          <option value="killer">🔪 Killer</option>
                          <option value="assistant">🤝 Accomplice</option>
                          <option value="innocent">🕵️ Suspect</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Relationships & Connections
                      </label>
                      <RichTokenEditableBox
                        value={char.conceptNotes}
                        onChange={(val) => updateCharacter(char.id, { conceptNotes: val })}
                        characters={blueprint.characters}
                        minRows={3}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                        Motive / Secret
                      </label>
                      <RichTokenEditableBox
                        value={char.motiveOrSecret}
                        onChange={(val) => updateCharacter(char.id, { motiveOrSecret: val })}
                        characters={blueprint.characters}
                        minRows={3}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: How the Murder Went Down & 5 Core Plot Beats (Full Readable Boxes + Highlighted Character Pills) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  3. The Murder & 5 Core Plot Beats
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  All character mentions are color-coded and bolded so you can read the entire plot
                  at a glance. Click any box to edit.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSuggestBeats}
                disabled={isSuggestingBeats}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 transition disabled:opacity-50 cursor-pointer"
              >
                {isSuggestingBeats
                  ? 'Suggesting 5 Beats...'
                  : '✨ Auto-Suggest Murder & 5 Core Beats'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Murder Time
                </label>
                <input
                  type="text"
                  value={blueprint.murderTimeWindow}
                  onChange={(e) => updateBlueprint({ murderTimeWindow: e.target.value })}
                  placeholder="11:28 PM"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-sm font-black text-slate-900 focus:bg-white focus:outline-none focus:border-brand-pink"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Murder Weapon & Method
                </label>
                <RichTokenEditableBox
                  value={blueprint.murderWeaponAndMethod}
                  onChange={(val) => updateBlueprint({ murderWeaponAndMethod: val })}
                  characters={blueprint.characters}
                  minRows={3}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                How & Why the Killer (& Accomplice) Did It
              </label>
              <RichTokenEditableBox
                value={blueprint.killerHowAndWhySummary}
                onChange={(val) => updateBlueprint({ killerHowAndWhySummary: val })}
                characters={blueprint.characters}
                minRows={4}
              />
            </div>

            {/* 5 Core Story Beat Cards */}
            <div className="space-y-4 pt-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                5 Core Story Beats
              </label>
              {blueprint.beats.map((beat) => (
                <div
                  key={beat.beatNumber}
                  className="rounded-2xl bg-slate-50/90 border border-slate-200 p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-lg bg-brand-pink text-white text-xs font-black">
                      Beat #{beat.beatNumber}
                    </span>
                    <input
                      type="text"
                      value={beat.timeWindow}
                      onChange={(e) =>
                        updateBeat(beat.beatNumber, { timeWindow: e.target.value })
                      }
                      className="w-28 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700"
                    />
                    <input
                      type="text"
                      value={beat.title}
                      onChange={(e) => updateBeat(beat.beatNumber, { title: e.target.value })}
                      placeholder="Beat title"
                      className="flex-1 min-w-[220px] rounded-xl bg-white border border-slate-200 px-3.5 py-1.5 text-sm font-black text-slate-900"
                    />
                  </div>
                  <RichTokenEditableBox
                    value={beat.description}
                    onChange={(val) => updateBeat(beat.beatNumber, { description: val })}
                    characters={blueprint.characters}
                    minRows={3}
                  />
                </div>
              ))}
            </div>

            {/* Bottom Approve CTA */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Approving locks your 5 beats, converts all names to archetype tokens, and opens the
                Beat-by-Beat Clue Picker.
              </p>
              <button
                type="button"
                onClick={handleApprovePlotAndStartBeatClues}
                disabled={isGeneratingBeatClues}
                className="px-6 py-3 rounded-2xl text-sm font-black bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingBeatClues
                  ? 'Loading Beat #1 Clues...'
                  : 'Approve Plot & Pick Clues Beat-by-Beat →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 2: STRICT BEAT-BY-BEAT SPLIT WORKSPACE (1 BEAT AT A TIME)   */}
      {/* ================================================================= */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT RAIL: THE 5 BEATS PLAYLIST (4 Columns) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 space-y-4 lg:sticky lg:top-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Beat-by-Beat Playlist
                </div>
                <h2 className="text-base font-black text-brand-dark">
                  5 Core Story Beats
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-800">
                {selectedCoreClues.length} / 10 Picked
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Click a beat below to see its 5 suggested clues on the right. Pick at least{' '}
              <strong>2 clues per beat</strong>.
            </p>

            <div className="space-y-2.5">
              {blueprint.beats.map((b) => {
                const cands = beatCluesMap[b.beatNumber] || [];
                const pickedInBeat = cands.filter((c) => c.decision === 'yes');
                const pickedCount = pickedInBeat.length;
                const isCurrent = activeBeatNumber === b.beatNumber;
                const isComplete = pickedCount >= 2;
                const beatCov = analyzeBeatSelectionCoverage(b, cands, blueprint.id);

                return (
                  <button
                    key={b.beatNumber}
                    type="button"
                    onClick={() => handleSelectBeatTab(b.beatNumber)}
                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all cursor-pointer space-y-2 ${
                      isCurrent
                        ? 'border-brand-pink bg-pink-50/40 shadow-sm'
                        : isComplete && beatCov.isWholeBeatCovered
                          ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
                          : isComplete
                            ? 'border-amber-300 bg-amber-50/30 hover:border-amber-400'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          isCurrent ? 'text-brand-pink' : 'text-slate-700'
                        }`}
                      >
                        Beat #{b.beatNumber} • {b.timeWindow}
                      </span>
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                          isComplete && beatCov.isWholeBeatCovered
                            ? 'bg-emerald-600 text-white'
                            : isComplete
                              ? 'bg-amber-500 text-white'
                              : pickedCount === 1
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isComplete && beatCov.isWholeBeatCovered
                          ? `✓ 100% Covered (${pickedCount}/2)`
                          : isComplete
                            ? `⚠️ ${beatCov.uncoveredSubFacts.length} Gap (${pickedCount}/2)`
                            : `${pickedCount}/2 Picked`}
                      </span>
                    </div>

                    <div className="text-xs font-black text-slate-900">{b.title}</div>

                    {pickedInBeat.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200/70 space-y-1">
                        {pickedInBeat.map((pc) => (
                          <div
                            key={pc.id}
                            className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5 truncate"
                          >
                            <span>✓</span>
                            <span className="truncate">{pc.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <button
                type="button"
                onClick={() => handleMoveToRedHerrings(true)}
                disabled={isGeneratingSubplots || selectedCoreClues.length < 6}
                className="w-full py-3 rounded-2xl text-xs font-black uppercase tracking-wider bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-40 cursor-pointer"
              >
                {isGeneratingSubplots
                  ? 'Freshly Generating Red Herrings...'
                  : `Done Beats (${selectedCoreClues.length}/10): Fresh Build Red Herrings →`}
              </button>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ← Back to 5-Beat Plot
              </button>
            </div>
          </div>

          {/* RIGHT WORKSPACE: FOCUSED SINGLE-BEAT CLUE PICKER (8 Columns) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            {/* Pinned Beat Context Header + Live 2-Clue Beat Coverage & Gap Analyzer */}
            {activeBeat && (
              <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-brand-pink text-white">
                      Beat #{activeBeat.beatNumber} of {blueprint.beats.length}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-white border border-slate-200 text-slate-700">
                      {activeBeat.timeWindow}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-50 border border-pink-200 text-brand-pink">
                      {blueprint.spiceLevel} Spice
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      activeBeatSelectedCount >= 2 && activeBeatCoverage?.isWholeBeatCovered
                        ? 'bg-emerald-600 text-white'
                        : activeBeatSelectedCount >= 2
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {activeBeatSelectedCount} of 2 Clues Selected for Beat #{activeBeat.beatNumber}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-slate-900">{activeBeat.title}</h3>
                  <div className="mt-2 text-sm text-slate-800">
                    <HighlightedMysteryText
                      text={activeBeat.description}
                      characters={blueprint.characters}
                    />
                  </div>
                </div>

                {/* ========================================================= */}
                {/* LIVE 2-CLUE BEAT COVERAGE & GAP ANALYZER                  */}
                {/* ========================================================= */}
                {activeBeatCoverage && activeBeatCandidates.length > 0 && (
                  <div
                    className={`rounded-2xl border-2 p-4 space-y-3 transition ${
                      activeBeatCoverage.isWholeBeatCovered
                        ? 'bg-emerald-50/70 border-emerald-400'
                        : activeBeatSelectedCount >= 2
                          ? 'bg-amber-50/80 border-amber-400'
                          : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                          🧩 Beat #{activeBeat.beatNumber} Sub-Fact Coverage &amp; Gap Check
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            activeBeatCoverage.isWholeBeatCovered
                              ? 'bg-emerald-600 text-white'
                              : activeBeatSelectedCount >= 2
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {activeBeatCoverage.coveredCount} / {activeBeatCoverage.subFacts.length}{' '}
                          Beat Sub-Facts Covered ({activeBeatCoverage.coveragePct}%)
                        </span>
                      </div>

                      {activeBeatCoverage.poolGapSubFacts.length === 0 ? (
                        <span className="text-[11px] font-bold text-emerald-700">
                          ✓ All 3 Sub-Facts Covered Across the 5 Suggested Clues
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-amber-800">
                          ⚠️ Pool Gap: {activeBeatCoverage.poolGapSubFacts.join(', ')}
                        </span>
                      )}
                    </div>

                    {/* 3 Sub-Fact Checklist Pills */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {activeBeatCoverage.subFactStatuses.map((st, sIdx) => (
                        <div
                          key={st.fact}
                          className={`rounded-xl border px-3 py-2 text-xs flex flex-col justify-between gap-1 ${
                            st.isCoveredBySelected
                              ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-1.5 font-bold">
                            <span>{st.isCoveredBySelected ? '✅' : '⚪'}</span>
                            <span>
                              Part {sIdx + 1}:{' '}
                              <HighlightedMysteryText
                                text={st.fact}
                                characters={blueprint.characters}
                                className="inline"
                              />
                            </span>
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-wider pl-5">
                            {st.isCoveredBySelected ? (
                              <span className="text-emerald-800">
                                Covered by Your Pick (
                                {st.coveredBySelectedOptionNums
                                  .map((n) => `Option #${n}`)
                                  .join(' + ')}
                                )
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                Covered by{' '}
                                {st.coveredByAllOptionNums.map((n) => `Option #${n}`).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Combination Verdict & 1-Click Fix if 2 Clues Overlap and Leave a Gap */}
                    {activeBeatSelectedCount === 0 && (
                      <div className="text-xs text-slate-600 font-medium">
                        💡 Pick your first clue below. Each clue covers <strong>2 of the 3</strong>{' '}
                        parts of Beat #{activeBeat.beatNumber}, and we&apos;ll highlight which
                        second clue completes <strong>100% of the Beat</strong>.
                      </div>
                    )}

                    {activeBeatSelectedCount === 1 && (
                      <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 text-xs text-indigo-950 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          🎯 <strong>1 of 2 Clues Picked:</strong> Your first clue covers{' '}
                          <strong>{activeBeatCoverage.coveredCount}/3</strong> of Beat #
                          {activeBeat.beatNumber}. Remaining gap to cover:{' '}
                          <strong className="underline">
                            <HighlightedMysteryText
                              text={activeBeatCoverage.uncoveredSubFacts.join(' & ')}
                              characters={blueprint.characters}
                              className="inline"
                            />
                          </strong>
                          . Pair with{' '}
                          <strong>
                            {activeBeatCoverage.complementaryOptions
                              .map((o) => `Option #${o.optionNum}`)
                              .join(' or ')}
                          </strong>{' '}
                          for 100% Beat Coverage!
                        </div>
                      </div>
                    )}

                    {activeBeatSelectedCount >= 2 && activeBeatCoverage.isWholeBeatCovered && (
                      <div className="rounded-xl bg-emerald-600 text-white px-4 py-2.5 text-xs font-bold flex flex-wrap items-center justify-between gap-2">
                        <span>
                          ✅ Whole Beat Covered (100%): The combination of{' '}
                          {activeBeatCoverage.selectedMeta
                            .map((m) => `Option #${m.optionNum}`)
                            .join(' + ')}{' '}
                          covers every part of Beat #{activeBeat.beatNumber} with zero plot gaps!
                        </span>
                      </div>
                    )}

                    {activeBeatSelectedCount >= 2 && !activeBeatCoverage.isWholeBeatCovered && (
                      <div className="rounded-xl bg-amber-100 border border-amber-300 px-4 py-3 text-xs text-amber-950 space-y-2">
                        <div className="font-bold">
                          ⚠️ <strong>Beat Gap Detected in Your 2 Chosen Clues:</strong> Both{' '}
                          {activeBeatCoverage.selectedMeta
                            .map((m) => `Option #${m.optionNum}`)
                            .join(' and ')}{' '}
                          cover the same parts of the beat, leaving a gap:{' '}
                          <strong className="underline">
                            <HighlightedMysteryText
                              text={activeBeatCoverage.uncoveredSubFacts.join(' & ')}
                              characters={blueprint.characters}
                              className="inline"
                            />
                          </strong>{' '}
                          is not explained by this pair!
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {activeBeatCoverage.recommendedSwap && (
                            <button
                              type="button"
                              onClick={() =>
                                handleSwapBeatClueForCoverage(
                                  activeBeat.beatNumber,
                                  activeBeatCoverage.recommendedSwap!.dropClueId,
                                  activeBeatCoverage.recommendedSwap!.addClueId,
                                  activeBeatCoverage.recommendedSwap!.missingFact
                                )
                              }
                              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-900 hover:bg-brand-pink text-white transition cursor-pointer"
                            >
                              🔄 Swap Option #{activeBeatCoverage.recommendedSwap.dropOptionNum} →
                              Option #{activeBeatCoverage.recommendedSwap.addOptionNum} (Reaches
                              100% Beat Coverage)
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleSuggestCluesForBeat(
                                activeBeat.beatNumber,
                                undefined,
                                activeBeatCoverage.uncoveredSubFacts.join(' & ')
                              )
                            }
                            disabled={isGeneratingBeatClues}
                            className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-white hover:bg-amber-50 text-amber-950 border border-amber-300 transition cursor-pointer"
                          >
                            ✨ Generate Fresh Clue Specifically for This Gap
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    Select at least <strong>2 complementary clues below</strong> to cover 100% of
                    Beat #{activeBeat.beatNumber}.
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSuggestCluesForBeat(activeBeat.beatNumber)}
                    disabled={isGeneratingBeatClues}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                  >
                    {isGeneratingBeatClues
                      ? `Generating Beat #${activeBeat.beatNumber} Clues...`
                      : `🔄 Suggest 5 Fresh Clues for Beat #${activeBeat.beatNumber}`}
                  </button>
                </div>
              </div>
            )}

            {/* 5 Clue Cards for the Active Beat ONLY */}
            {isGeneratingBeatClues && activeBeatCandidates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center space-y-2">
                <div className="text-sm font-black text-slate-800">
                  Writing 5 {blueprint.spiceLevel}-Spice Clues Specifically for Beat #
                  {activeBeatNumber}...
                </div>
                <p className="text-xs text-slate-500">
                  Crafting in-world dialogue, forensic details, per-clue strength analysis, and
                  sub-fact coverage...
                </p>
              </div>
            ) : activeBeatCandidates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-600">
                  No clues generated for Beat #{activeBeatNumber} yet.
                </p>
                <button
                  type="button"
                  onClick={() => handleSuggestCluesForBeat(activeBeatNumber)}
                  disabled={isGeneratingBeatClues}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-brand-pink text-white cursor-pointer"
                >
                  ✨ Suggest 5 Clues for Beat #{activeBeatNumber}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeBeatCandidates.map((clue, cIdx) => {
                  const isSelected = clue.decision === 'yes';
                  const isPhotoFormat = isPhotoClueFormat(clue.format);
                  const mediumType = getClueMediumCategory(clue.format);
                  const covMeta =
                    activeBeatCoverage?.candidateMeta[cIdx] ||
                    (activeBeat
                      ? {
                          optionNum: cIdx + 1,
                          ...getClueCoverageMetadata(
                            clue,
                            cIdx,
                            getBeatSubFactsForBeat(activeBeat, blueprint.id, activeBeatCandidates)
                          ),
                        }
                      : null);

                  const isRecommendedComplementary =
                    !isSelected &&
                    activeBeatSelectedCount >= 1 &&
                    !activeBeatCoverage?.isWholeBeatCovered &&
                    Boolean(
                      activeBeatCoverage?.complementaryOptions.some((o) => o.clue.id === clue.id)
                    );

                  const complementaryOptionNumsForThisClue =
                    activeBeatCoverage && covMeta
                      ? activeBeatCoverage.candidateMeta
                          .filter(
                            (other) =>
                              other.clue.id !== clue.id &&
                              covMeta.missingSubFacts.some((mf) =>
                                other.coveredSubFacts.includes(mf)
                              )
                          )
                          .map((other) => other.optionNum)
                      : [];

                  return (
                    <div
                      key={clue.id}
                      className={`rounded-2xl border-2 p-5 transition space-y-3.5 ${
                        isSelected
                          ? 'bg-emerald-50/40 border-emerald-500 shadow-sm'
                          : isRecommendedComplementary
                            ? 'bg-indigo-50/30 border-indigo-400 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                          <span className="text-xs font-black text-slate-400">
                            Option #{cIdx + 1}
                          </span>
                          <select
                            value={clue.format}
                            onChange={(e) => {
                              const nextFmt = e.target.value as ClueFormat;
                              const nextIsPhoto = isPhotoClueFormat(nextFmt);
                              updateBeatClueField(activeBeatNumber, clue.id, {
                                format: nextFmt,
                                generationPrompt: nextIsPhoto
                                  ? clue.generationPrompt ||
                                    buildDefaultDetailedPhotoPrompt(
                                      clue.title,
                                      clue.description,
                                      blueprint.spiceLevel
                                    )
                                  : '',
                              });
                            }}
                            className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                          >
                            {CLUE_FORMAT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.shortLabel}
                              </option>
                            ))}
                          </select>

                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              mediumType === 'photo'
                                ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                : mediumType === 'audio'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {mediumType === 'photo'
                              ? '📸 AI Photo'
                              : mediumType === 'audio'
                                ? '🎙️ Audio Voice'
                                : '💬 Native Text UI'}
                          </span>

                          {covMeta && (
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${covMeta.strengthBadgeStyle}`}
                            >
                              💪 {covMeta.strengthTier}
                            </span>
                          )}

                          {isRecommendedComplementary && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-600 text-white shadow-xs">
                              ★ Recommended Pairing: Fills Remaining Beat Gap
                            </span>
                          )}

                          <input
                            type="text"
                            value={clue.title}
                            onChange={(e) =>
                              updateBeatClueField(activeBeatNumber, clue.id, {
                                title: e.target.value,
                              })
                            }
                            className="flex-1 min-w-[200px] rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-900 focus:bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleBeatClueSelection(activeBeatNumber, clue.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : isRecommendedComplementary
                                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                                : 'bg-slate-900 text-white hover:bg-brand-pink'
                          }`}
                        >
                          {isSelected
                            ? `✓ Selected for Beat #${activeBeatNumber}`
                            : isRecommendedComplementary
                              ? `+ Select to Complete 100% of Beat #${activeBeatNumber}`
                              : `+ Select for Beat #${activeBeatNumber}`}
                        </button>
                      </div>

                      {/* Rich Color-Coded Clue Description Box */}
                      <RichTokenEditableBox
                        value={clue.description}
                        onChange={(val) =>
                          updateBeatClueField(activeBeatNumber, clue.id, {
                            description: val,
                          })
                        }
                        characters={blueprint.characters}
                        minRows={3}
                      />

                      {/* Per-Clue Strength, Sub-Fact Coverage & Single-Clue Gap Analysis Box */}
                      {covMeta && (
                        <div className="rounded-xl bg-slate-50/90 border border-slate-200 px-3.5 py-2.5 text-xs space-y-2">
                          <div className="text-slate-800">
                            <span className="font-black text-slate-900">
                              💪 Investigative Strength This Clue Adds:
                            </span>{' '}
                            <HighlightedMysteryText
                              text={covMeta.strengthSummary}
                              characters={blueprint.characters}
                              className="inline"
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black text-emerald-800">
                              ✓ Beat Parts Covered ({covMeta.coveredSubFacts.length}/3):
                            </span>
                            {covMeta.coveredSubFacts.map((sf) => (
                              <span
                                key={sf}
                                className="px-2 py-0.5 rounded-md bg-emerald-100/80 border border-emerald-300 text-[11px] font-bold text-emerald-950"
                              >
                                ✓{' '}
                                <HighlightedMysteryText
                                  text={sf}
                                  characters={blueprint.characters}
                                  className="inline"
                                />
                              </span>
                            ))}
                          </div>

                          {covMeta.missingSubFacts.length > 0 && (
                            <div className="text-[11px] text-amber-900 pt-1 border-t border-slate-200/80">
                              <span className="font-black text-amber-800">
                                ⚠️ Gap in Beat #{activeBeatNumber} If Picked Alone:
                              </span>{' '}
                              Doesn&apos;t cover{' '}
                              <strong className="underline">
                                <HighlightedMysteryText
                                  text={covMeta.missingSubFacts.join(' & ')}
                                  characters={blueprint.characters}
                                  className="inline"
                                />
                              </strong>
                              {complementaryOptionNumsForThisClue.length > 0 && (
                                <>
                                  {' '}
                                  — pair with{' '}
                                  <strong>
                                    Option #
                                    {complementaryOptionNumsForThisClue.join(', Option #')}
                                  </strong>{' '}
                                  to cover the whole beat.
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <div
                        className={`grid grid-cols-1 ${
                          isPhotoFormat ? 'md:grid-cols-2' : ''
                        } gap-3 text-xs`}
                      >
                        <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-slate-700 space-y-1.5">
                          <div>
                            <span className="font-black text-slate-900">
                              How it explains Beat #{activeBeatNumber}:
                            </span>{' '}
                            <HighlightedMysteryText
                              text={clue.pointsTo}
                              characters={blueprint.characters}
                              className="inline"
                            />
                          </div>
                          {clue.doubleMeaningNote && (
                            <div className="pt-1 border-t border-slate-200/70 text-indigo-900">
                              <span className="font-black text-indigo-700">
                                🔗 Double-Meaning Hook:
                              </span>{' '}
                              <HighlightedMysteryText
                                text={clue.doubleMeaningNote}
                                characters={blueprint.characters}
                                className="inline"
                              />
                            </div>
                          )}

                          {/* IMPROVEMENT #2: 1-Click "Tie Double-Meaning Twist to Innocent Suspect" */}
                          <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-black text-indigo-800">
                              🎭 1-Click Tie Double-Meaning to Suspect:
                            </span>
                            {blueprint.characters
                              .filter((ch) => ch.plotRole !== 'victim' && ch.plotRole !== 'killer')
                              .map((ch) => {
                                const isSpinning = injectingTwistClueId === clue.id;
                                return (
                                  <button
                                    key={ch.id}
                                    type="button"
                                    disabled={isSpinning}
                                    onClick={() =>
                                      handleInjectDoubleMeaningSuspect(
                                        activeBeatNumber,
                                        clue,
                                        ch.roleTitle
                                      )
                                    }
                                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-200 text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
                                  >
                                    {isSpinning ? 'Weaving...' : `+ Frame ${ch.roleTitle}`}
                                  </button>
                                );
                              })}
                          </div>
                        </div>

                        {/* ONLY show AI Evidence Photo Prompt if this clue is actually a Photo Clue (physical_prop or cctv)! */}
                        {isPhotoFormat && (
                          <div className="rounded-xl bg-pink-50/40 border border-pink-200/80 px-3.5 py-2.5 text-slate-700 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-brand-pink">
                                📸 AI Evidence Photo Prompt ({blueprint.spiceLevel} Noir):
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBeatClueField(activeBeatNumber, clue.id, {
                                    generationPrompt: buildDefaultDetailedPhotoPrompt(
                                      clue.title,
                                      clue.description,
                                      blueprint.spiceLevel
                                    ),
                                  })
                                }
                                className="text-[10px] font-bold text-brand-pink hover:underline cursor-pointer"
                              >
                                ✨ Expand Prompt
                              </button>
                            </div>
                            <textarea
                              rows={4}
                              value={
                                clue.generationPrompt ||
                                buildDefaultDetailedPhotoPrompt(
                                  clue.title,
                                  clue.description,
                                  blueprint.spiceLevel
                                )
                              }
                              onChange={(e) =>
                                updateBeatClueField(activeBeatNumber, clue.id, {
                                  generationPrompt: e.target.value,
                                })
                              }
                              className="w-full rounded-lg bg-white border border-pink-200/70 px-2.5 py-2 text-xs text-slate-700 focus:outline-none leading-relaxed"
                            />
                          </div>
                        )}
                      </div>

                      {/* IMPROVEMENT #4: Live Player UI Preview + 1-Click Test Render Photo */}
                      {renderInlineClueUiPreview(clue)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* IMPROVEMENT #5: Full-Mystery 5-Beat Coverage Health Strip */}
            {renderFiveBeatCoverageSummaryBar()}

            {allSelectedClues.length >= 2 &&
              renderSuspectHeatAndSpotlightPanel(allSelectedClues)}

            {allSelectedClues.length >= 2 &&
              renderMediaMixBreakdownPanel(
                allSelectedClues,
                'Full Pack Media Mix & Rebalance Suggestions'
              )}

            {/* Bottom Single-Beat Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <input
                  type="text"
                  value={beatCustomNote}
                  onChange={(e) => setBeatCustomNote(e.target.value)}
                  placeholder={`Ask for a specific clue idea for Beat #${activeBeatNumber}...`}
                  className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:bg-white"
                />
                <button
                  type="button"
                  onClick={() => handleSuggestCluesForBeat(activeBeatNumber)}
                  disabled={isGeneratingBeatClues}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer"
                >
                  + Suggest More for Beat #{activeBeatNumber}
                </button>
              </div>

              {activeBeatNumber < blueprint.beats.length ? (
                <button
                  type="button"
                  onClick={() => handleSelectBeatTab(activeBeatNumber + 1)}
                  className={`px-6 py-3 rounded-2xl text-sm font-black transition cursor-pointer ${
                    activeBeatSelectedCount >= 2 && activeBeatCoverage?.isWholeBeatCovered
                      ? 'bg-brand-pink hover:bg-pink-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  Lock Beat #{activeBeatNumber} ({activeBeatSelectedCount}/2 •{' '}
                  {activeBeatCoverage?.coveragePct || 0}% Beat Covered) &amp; Continue to Beat #
                  {activeBeatNumber + 1} →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(true)}
                  disabled={isGeneratingSubplots || selectedCoreClues.length < 6}
                  className="px-6 py-3 rounded-2xl text-sm font-black bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-40 cursor-pointer"
                >
                  {isGeneratingSubplots
                    ? 'Freshly Generating Red Herrings From Your Clues...'
                    : `Finish Beats (${selectedCoreClues.length}/10) & Fresh Generate Red Herrings →`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 3: RED HERRINGS, MOTIVES & DOUBLE-MEANING CLUES (~6 CLUES)  */}
      {/* ================================================================= */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                    Step 3: Red Herring Motives &amp; Clues ({selectedRedHerringClues.length} / 6
                    Selected)
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                    🔗 Freshly Anchored to Your {selectedCoreClues.length} Selected Beat Clues
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Freshly generated from the exact Beat Clues you selected in Step 2. Select a
                  Red-Herring Plotline below to see the suspects&apos; motive, which selected Beat
                  Clues it hooks into via double meaning, and pick{' '}
                  <strong>2 clues per plotline (6 total)</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(true)}
                  disabled={isGeneratingSubplots}
                  className="px-3.5 py-2 rounded-xl text-xs font-black bg-pink-50 hover:bg-pink-100 text-brand-pink border border-pink-200 transition cursor-pointer"
                >
                  {isGeneratingSubplots
                    ? 'Freshly Generating...'
                    : `🔄 Fresh Generate From My ${selectedCoreClues.length} Beat Clues`}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  ← Back to Beat Clues
                </button>
              </div>
            </div>

            {isGeneratingSubplots && subplots.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center space-y-2">
                <div className="text-sm font-black text-slate-800">
                  Freshly Generating 3 Entangled Red-Herring Plotlines From Your{' '}
                  {selectedCoreClues.length} Selected Beat Clues...
                </div>
                <p className="text-xs text-slate-500">
                  Connecting innocent suspect motives to your selected Core Clues with{' '}
                  {blueprint.spiceLevel}-spice dialogue and balanced media formats...
                </p>
              </div>
            ) : subplots.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-600">
                  Ready to fresh-generate Red Herrings based on your {selectedCoreClues.length}{' '}
                  selected Beat Clues.
                </p>
                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(true)}
                  disabled={isGeneratingSubplots}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-brand-pink text-white cursor-pointer"
                >
                  ✨ Fresh Generate 3 Red-Herring Plotlines From My {selectedCoreClues.length} Beat
                  Clues
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Rail: 3 Red Herring Plotline Tabs */}
                <div className="lg:col-span-4 space-y-2.5">
                  {subplots.map((sub, sIdx) => {
                    const pickedInSub = sub.decoyClues.filter(
                      (dc) => dc.decision === 'yes'
                    ).length;
                    const isCurrent = activeSubplotIndex === sIdx;
                    const isComplete = pickedInSub >= 2;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setActiveSubplotIndex(sIdx)}
                        className={`w-full p-4 rounded-2xl border-2 text-left transition cursor-pointer space-y-1.5 ${
                          isCurrent
                            ? 'border-brand-pink bg-pink-50/40 shadow-sm'
                            : isComplete
                              ? 'border-emerald-200 bg-emerald-50/30'
                              : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase text-brand-pink">
                            Red Herring #{sIdx + 1}
                          </span>
                          <span
                            className={`text-[10px] px-2.5 py-0.5 rounded-full font-black ${
                              isComplete
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {pickedInSub}/2 Picked
                          </span>
                        </div>
                        <div className="text-xs font-black text-slate-900">
                          <HighlightedMysteryText
                            text={sub.title}
                            characters={blueprint.characters}
                          />
                        </div>
                        <div className="text-[11px] font-bold text-slate-500">
                          {sub.involvedRoles.join(' ↔ ')}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Panel: Focused Single Red Herring Plotline -> (1) Real Clues We Already Have & Double-Meaning Input -> (2) Unselected New Fake Clue Ideas */}
                {activeSubplot &&
                  (() => {
                    // Find which of the user's 10 Selected Real Clues tie into this Red Herring Storyline
                    const linkedTitlesLower = (activeSubplot.linkedCoreClueTitles || []).map((t) =>
                      t.toLowerCase().trim()
                    );
                    const subRolesLower = (activeSubplot.involvedRoles || []).map((r) =>
                      r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase()
                    );

                    const tiedRealClues = selectedCoreClues.filter((rc) => {
                      const titleMatch = linkedTitlesLower.some(
                        (lt) =>
                          lt === rc.title.toLowerCase().trim() ||
                          rc.title.toLowerCase().includes(lt) ||
                          lt.includes(rc.title.toLowerCase())
                      );
                      if (titleMatch) return true;

                      const roleMatch = (rc.involvedRoles || []).some((r) =>
                        subRolesLower.includes(
                          r.replace(/^\{\{|\}\}$/g, '').trim().toLowerCase()
                        )
                      );
                      const textMatch = subRolesLower.some((sr) =>
                        `${rc.title} ${rc.description} ${rc.doubleMeaningNote || ''}`
                          .toLowerCase()
                          .includes(sr)
                      );
                      return roleMatch || textMatch;
                    });

                    const realCluesToShow =
                      tiedRealClues.length > 0
                        ? tiedRealClues
                        : selectedCoreClues.slice(0, 2);

                    const unlinkedRealClues = selectedCoreClues.filter(
                      (rc) => !realCluesToShow.some((shown) => shown.id === rc.id)
                    );

                    const pickedInThisSubCount = activeSubplot.decoyClues.filter(
                      (dc) => dc.decision === 'yes'
                    ).length;

                    return (
                      <div className="lg:col-span-8 space-y-5">
                        {/* Storyline Motive Header */}
                        <div className="rounded-2xl bg-slate-50 border-2 border-slate-200 p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-pink text-white">
                              {activeSubplot.involvedRoles.join(' ↔ ')}
                            </span>
                            <span className="text-xs font-black text-slate-700">
                              {realCluesToShow.length} Linked Real Clues + {pickedInThisSubCount} New
                              Fake Clues Added
                            </span>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">
                            <HighlightedMysteryText
                              text={activeSubplot.title}
                              characters={blueprint.characters}
                            />
                          </h3>
                          <div className="text-sm text-slate-800 leading-relaxed">
                            <strong className="text-slate-900">
                              Suspect Motive &amp; Secret Scheme:
                            </strong>{' '}
                            <HighlightedMysteryText
                              text={activeSubplot.summary}
                              characters={blueprint.characters}
                              className="inline"
                            />
                          </div>
                          {activeSubplot.doubleMeaningCoreClueHook && (
                            <div className="rounded-xl bg-indigo-50 border border-indigo-200 px-3.5 py-2.5 text-xs text-indigo-950">
                              <strong className="text-indigo-800">
                                🔗 Overarching Double-Meaning Strategy:
                              </strong>{' '}
                              <HighlightedMysteryText
                                text={activeSubplot.doubleMeaningCoreClueHook}
                                characters={blueprint.characters}
                                className="inline"
                              />
                            </div>
                          )}
                        </div>

                        {/* ===================================================== */}
                        {/* PART 1: REAL CLUES WE ALREADY HAVE (DOUBLE MEANING)   */}
                        {/* ===================================================== */}
                        <div className="rounded-2xl bg-indigo-50/40 border-2 border-indigo-200 p-5 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-black uppercase">
                                  Part 1 • Existing Real Clues
                                </span>
                                <h4 className="text-sm font-black text-indigo-950">
                                  Real Clues You Already Selected That Feed This Red Herring (
                                  {realCluesToShow.length})
                                </h4>
                              </div>
                              <p className="text-xs text-indigo-900/80 mt-0.5">
                                These real Beat Clues are <strong>already in your 10-clue pack</strong>.
                                Edit their Double-Meaning Note below (or click{' '}
                                <strong>+ Frame Suspect</strong>) so they do double-duty for this Red
                                Herring storyline!
                              </p>
                            </div>

                            {unlinkedRealClues.length > 0 && (
                              <select
                                value=""
                                onChange={(e) => {
                                  const targetId = e.target.value;
                                  const found = selectedCoreClues.find((c) => c.id === targetId);
                                  if (!found) return;
                                  setSubplots((prev) =>
                                    prev.map((s, idx) =>
                                      idx === activeSubplotIndex
                                        ? {
                                            ...s,
                                            linkedCoreClueTitles: Array.from(
                                              new Set([
                                                ...(s.linkedCoreClueTitles || []),
                                                found.title,
                                              ])
                                            ),
                                          }
                                        : s
                                    )
                                  );
                                }}
                                className="rounded-xl bg-white border border-indigo-300 px-3 py-1.5 text-xs font-bold text-indigo-900 cursor-pointer"
                              >
                                <option value="">+ Link Another Real Clue to This Storyline...</option>
                                {unlinkedRealClues.map((uc) => (
                                  <option key={uc.id} value={uc.id}>
                                    Beat #{uc.beatNumber}: {uc.title}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="space-y-3">
                            {realCluesToShow.map((rc) => {
                              const bNum = rc.beatNumber || 1;
                              return (
                                <div
                                  key={rc.id}
                                  className="rounded-xl bg-white border border-indigo-200 p-4 space-y-2.5 shadow-2xs"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase">
                                        ✓ Real Clue (Beat #{bNum} • {rc.timestampLabel})
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                                        {rc.format}
                                      </span>
                                      <span className="text-sm font-black text-slate-900">
                                        {rc.title}
                                      </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                      {activeSubplot.involvedRoles.map((role) => (
                                        <button
                                          key={role}
                                          type="button"
                                          disabled={injectingTwistClueId === rc.id}
                                          onClick={() =>
                                            handleInjectDoubleMeaningSuspect(bNum, rc, role)
                                          }
                                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 text-indigo-900 hover:text-white border border-indigo-200 text-[11px] font-black transition cursor-pointer disabled:opacity-50"
                                        >
                                          {injectingTwistClueId === rc.id
                                            ? 'Weaving...'
                                            : `🎭 Weave ${role} Into This Real Clue`}
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Real Clue Text (Editable if you want to tweak the wording right here!) */}
                                  <div>
                                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                                      Real Clue Content (Click to Edit):
                                    </div>
                                    <RichTokenEditableBox
                                      value={rc.description}
                                      onChange={(val) =>
                                        updateBeatClueField(bNum, rc.id, { description: val })
                                      }
                                      characters={blueprint.characters}
                                      minRows={2}
                                    />
                                  </div>

                                  {/* Editable Double-Meaning Input for this Real Clue */}
                                  <div className="rounded-xl bg-indigo-50/70 border border-indigo-200 p-3 space-y-1.5">
                                    <div className="text-[11px] font-black text-indigo-900">
                                      🔗 Double-Meaning Input (How This Real Clue Also Points to{' '}
                                      {activeSubplot.involvedRoles.join(' & ')}):
                                    </div>
                                    <RichTokenEditableBox
                                      value={
                                        rc.doubleMeaningNote ||
                                        `Also looks suspicious toward ${activeSubplot.involvedRoles
                                          .map((r) => `{{${r}}}`)
                                          .join(' & ')} because of their secret motive.`
                                      }
                                      onChange={(val) =>
                                        updateBeatClueField(bNum, rc.id, {
                                          doubleMeaningNote: val,
                                        })
                                      }
                                      characters={blueprint.characters}
                                      minRows={2}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* ===================================================== */}
                        {/* PART 2: NEW FAKE RED-HERRING CLUE IDEAS (UNSELECTED)  */}
                        {/* ===================================================== */}
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-md bg-brand-pink text-white text-[10px] font-black uppercase">
                                  Part 2 • New Fake Clue Ideas
                                </span>
                                <h4 className="text-sm font-black text-slate-900">
                                  New Fake Red-Herring Clue Ideas to Add to This Storyline (
                                  {pickedInThisSubCount} / 2 Picked)
                                </h4>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                All new fake clue ideas below start unselected. Pick the ones you
                                want to add on top of your Real Clues above (aim for ~2 per
                                storyline, 6 total).
                              </p>
                            </div>

                            {pickedInThisSubCount > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setSubplots((prev) =>
                                    prev.map((s, idx) =>
                                      idx === activeSubplotIndex
                                        ? {
                                            ...s,
                                            decoyClues: s.decoyClues.map((dc) => ({
                                              ...dc,
                                              decision: 'pending',
                                            })),
                                          }
                                        : s
                                    )
                                  )
                                }
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                              >
                                ↺ Unselect All in This Storyline
                              </button>
                            )}
                          </div>

                          {activeSubplot.decoyClues.map((dc, dIdx) => {
                            const isPicked = dc.decision === 'yes';
                            const isPhotoFormat = isPhotoClueFormat(dc.format);
                            const mediumType = getClueMediumCategory(dc.format);
                            const rhStrengthTier: ClueStrengthTier =
                              dc.strengthTier || 'Double-Meaning Misdirection';

                            return (
                              <div
                                key={dc.id}
                                className={`rounded-2xl border-2 p-5 space-y-3 transition ${
                                  isPicked
                                    ? 'bg-emerald-50/40 border-emerald-500 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
                                    <span className="text-xs font-black text-slate-400">
                                      New Idea #{dIdx + 1}
                                    </span>
                                <select
                                  value={dc.format}
                                  onChange={(e) => {
                                    const nextFmt = e.target.value as ClueFormat;
                                    const nextIsPhoto = isPhotoClueFormat(nextFmt);
                                    updateRedHerringClueField(activeSubplot.id, dc.id, {
                                      format: nextFmt,
                                      generationPrompt: nextIsPhoto
                                        ? dc.generationPrompt ||
                                          buildDefaultDetailedPhotoPrompt(
                                            dc.title,
                                            dc.description,
                                            blueprint.spiceLevel
                                          )
                                        : '',
                                    });
                                  }}
                                  className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                                >
                                  {CLUE_FORMAT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.shortLabel}
                                    </option>
                                  ))}
                                </select>

                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                    mediumType === 'photo'
                                      ? 'bg-pink-100 text-pink-800 border border-pink-200'
                                      : mediumType === 'audio'
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {mediumType === 'photo'
                                    ? '📸 AI Photo'
                                    : mediumType === 'audio'
                                      ? '🎙️ Audio Voice'
                                      : '💬 Native Text UI'}
                                </span>

                                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                                  🎭 {rhStrengthTier}
                                </span>

                                <input
                                  type="text"
                                  value={dc.title}
                                  onChange={(e) =>
                                    updateRedHerringClueField(activeSubplot.id, dc.id, {
                                      title: e.target.value,
                                    })
                                  }
                                  className="flex-1 min-w-[180px] rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-sm font-black text-slate-900"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  toggleRedHerringClueSelection(activeSubplot.id, dc.id)
                                }
                                className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                                  isPicked
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-900 text-white hover:bg-brand-pink'
                                }`}
                              >
                                {isPicked ? '✓ Added to Storyline' : '+ Add Clue Idea to Storyline'}
                              </button>
                            </div>

                            <RichTokenEditableBox
                              value={dc.description}
                              onChange={(val) =>
                                updateRedHerringClueField(activeSubplot.id, dc.id, {
                                  description: val,
                                })
                              }
                              characters={blueprint.characters}
                              minRows={3}
                            />

                            <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3.5 py-2.5 text-xs text-slate-700 space-y-1">
                              <div>
                                <span className="font-black text-slate-900">
                                  💪 Misdirection Strength This Clue Adds:
                                </span>{' '}
                                <HighlightedMysteryText
                                  text={dc.strengthSummary || dc.pointsTo}
                                  characters={blueprint.characters}
                                  className="inline"
                                />
                              </div>
                            </div>

                            {/* ONLY show AI Evidence Photo Prompt when this clue is a Photo Clue (physical_prop or cctv) */}
                            {isPhotoFormat && (
                              <div className="rounded-xl bg-pink-50/40 border border-pink-200/80 px-3.5 py-2.5 text-xs text-slate-700 space-y-1">
                                <span className="font-black text-brand-pink">
                                  📸 AI Evidence Photo Prompt ({blueprint.spiceLevel} Noir):
                                </span>
                                <textarea
                                  rows={3}
                                  value={
                                    dc.generationPrompt ||
                                    buildDefaultDetailedPhotoPrompt(
                                      dc.title,
                                      dc.description,
                                      blueprint.spiceLevel
                                    )
                                  }
                                  onChange={(e) =>
                                    updateRedHerringClueField(activeSubplot.id, dc.id, {
                                      generationPrompt: e.target.value,
                                    })
                                  }
                                  className="w-full rounded-lg bg-white border border-pink-200/70 px-2.5 py-2 text-xs text-slate-700 focus:outline-none leading-relaxed"
                                />
                              </div>
                            )}

                            {/* IMPROVEMENT #4: Live Player UI Preview + 1-Click Test Render Photo */}
                            {renderInlineClueUiPreview(dc)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                    );
                  })()}
              </div>
            )}

            {/* IMPROVEMENT #1: Suspect Heat & Table Spotlight Meter */}
            {allSelectedClues.length > 0 &&
              renderSuspectHeatAndSpotlightPanel(allSelectedClues)}

            {allSelectedClues.length > 0 &&
              renderMediaMixBreakdownPanel(
                allSelectedClues,
                'Full Pack Media Mix & Rebalance Suggestions'
              )}

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <input
                  type="text"
                  value={subplotCustomNote}
                  onChange={(e) => setSubplotCustomNote(e.target.value)}
                  placeholder="Optional: ask for a specific red herring angle..."
                  className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-800"
                />
                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(true)}
                  disabled={isGeneratingSubplots}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap cursor-pointer"
                >
                  {isGeneratingSubplots ? 'Regenerating...' : '🔄 Regenerate Red Herrings'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleSortCluesIntoRoundsAndReview}
                disabled={isSortingRounds || selectedRedHerringClues.length < 2}
                className="px-6 py-3 rounded-2xl text-sm font-black bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {isSortingRounds
                  ? 'Sorting 16 Clues Into Rounds...'
                  : `Next: Sort All ${totalSelectedCluesCount} Clues Into Rounds →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* STAGE 4: COMPLEXITY ROUND SORTER, MEDIA BALANCE & TURN INTO BASE  */}
      {/* ================================================================= */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-lg font-black text-brand-dark">{blueprint.title}</h2>
                  <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                    Suggested Complexity: {difficultyRec.recommendedTier.toUpperCase()} (
                    {difficultyRec.score}/10)
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-pink-50 text-brand-pink border border-pink-200">
                    {blueprint.spiceLevel} Spice
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {selectedCoreClues.length} Core Clues + {selectedRedHerringClues.length} Red
                  Herring Clues = <strong>{totalSelectedCluesCount} Total Clues</strong> sorted
                  across <strong>{totalRounds} Rounds</strong> by investigative complexity.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleSortCluesIntoRoundsAndReview}
                  disabled={isSortingRounds}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {isSortingRounds ? 'Re-Sorting...' : '🔀 Re-Sort Rounds'}
                </button>

                {transferredMysteryId ? (
                  <Link
                    href={`/${locale}/builder/mysteries/${transferredMysteryId}`}
                    className="px-6 py-3 rounded-2xl text-sm font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
                  >
                    Open in Mystery Builder →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleTurnIntoMysteryBase}
                    disabled={isAssembling || isTransferring || totalSelectedCluesCount === 0}
                    className="px-6 py-3 rounded-2xl text-sm font-black bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
                  >
                    {isAssembling || isTransferring
                      ? 'Turning Into Mystery Base...'
                      : '🚀 Turn Into Mystery Base →'}
                  </button>
                )}
              </div>
            </div>

            {renderMediaMixBreakdownPanel(
              allSelectedClues,
              'Pack Media Mix & Pacing Breakdown'
            )}

            {/* IMPROVEMENT #1: Suspect Heat & Table Spotlight Meter */}
            {renderSuspectHeatAndSpotlightPanel(allSelectedClues)}

            {assembled && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {assembled.proofreadReport.checks.map((chk) => (
                    <span
                      key={chk.id}
                      title={chk.detail}
                      className={`text-[11px] font-semibold px-3 py-1 rounded-full border ${
                        chk.passed
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}
                    >
                      {chk.passed ? '✓' : '⚠️'} {chk.label}
                    </span>
                  ))}
                </div>
                {assembled.proofreadReport.checks.some((c) => !c.passed) && (
                  <button
                    type="button"
                    onClick={handleAutoFixIssues}
                    disabled={isAutoFixing}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-100 text-amber-900 cursor-pointer"
                  >
                    {isAutoFixing ? 'Fixing...' : '🛠️ 1-Click Auto-Fix'}
                  </button>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setReviewTab('rounds')}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  reviewTab === 'rounds'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Clues by Round ({totalSelectedCluesCount})
              </button>
              {assembled && (
                <>
                  <button
                    type="button"
                    onClick={() => setReviewTab('characters')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      reviewTab === 'characters'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Character Dossiers ({assembled.characters.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewTab('relationships')}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      reviewTab === 'relationships'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Relationships ({assembled.relationships.length})
                  </button>
                </>
              )}
            </div>

            {reviewTab === 'rounds' && (
              <div className="space-y-4">
                {Array.from({ length: totalRounds }, (_, i) => i + 1).map((rNum) => {
                  const roundClues = allSelectedClues.filter((c) => c.roundNumber === rNum);
                  return (
                    <div
                      key={rNum}
                      className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-black uppercase tracking-wider text-brand-pink">
                          Round {rNum} ({roundClues.length} Clues)
                        </div>
                        {roundStrategySummary[rNum] && (
                          <div className="text-xs text-slate-500">
                            {roundStrategySummary[rNum]}
                          </div>
                        )}
                      </div>

                      {roundClues.length === 0 ? (
                        <div className="text-xs text-slate-400">
                          No clues in Round {rNum} yet. Click &ldquo;Re-Sort Rounds&rdquo; above.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {roundClues.map((rc) => {
                            const globalIdx =
                              allSelectedClues.findIndex((c) => c.id === rc.id) + 1;
                            const isPhoto = isPhotoClueFormat(rc.format);
                            const medium = getClueMediumCategory(rc.format);
                            const syncedTalkingPoints = getSyncedTalkingPointsForClue(rc);

                            return (
                              <div
                                key={rc.id}
                                className="rounded-xl bg-white border border-slate-200 p-4 text-xs space-y-3"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-black">
                                      Clue #{globalIdx}
                                    </span>
                                    <span className="text-sm font-black text-slate-900">
                                      {rc.title}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                        medium === 'photo'
                                          ? 'bg-pink-100 text-pink-800'
                                          : medium === 'audio'
                                            ? 'bg-blue-100 text-blue-800'
                                            : 'bg-slate-100 text-slate-700'
                                      }`}
                                    >
                                      {medium === 'photo'
                                        ? '📸 Photo'
                                        : medium === 'audio'
                                          ? '🎙️ Audio'
                                          : '💬 Text UI'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                                        rc.isRedHerring
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      }`}
                                    >
                                      {rc.isRedHerring
                                        ? 'Red Herring'
                                        : `Core Beat #${rc.beatNumber || '?'}`}
                                    </span>

                                    <select
                                      value={rc.format}
                                      onChange={(e) => {
                                        const nextFmt = e.target.value as ClueFormat;
                                        const nextIsPhoto = isPhotoClueFormat(nextFmt);
                                        const patch: Partial<SuggestedClueCandidate> = {
                                          format: nextFmt,
                                          generationPrompt: nextIsPhoto
                                            ? rc.generationPrompt ||
                                              buildDefaultDetailedPhotoPrompt(
                                                rc.title,
                                                rc.description,
                                                blueprint.spiceLevel
                                              )
                                            : '',
                                        };
                                        if (rc.isRedHerring && rc.subplotId) {
                                          updateRedHerringClueField(rc.subplotId, rc.id, patch);
                                        } else if (rc.beatNumber) {
                                          updateBeatClueField(rc.beatNumber, rc.id, patch);
                                        }
                                      }}
                                      className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                                    >
                                      {CLUE_FORMAT_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                          {opt.shortLabel}
                                        </option>
                                      ))}
                                    </select>

                                    <select
                                      value={rc.roundNumber}
                                      onChange={(e) => {
                                        const newR = Number(
                                          e.target.value
                                        ) as ArchitectRoundNumber;
                                        if (rc.isRedHerring && rc.subplotId) {
                                          updateRedHerringClueField(rc.subplotId, rc.id, {
                                            roundNumber: newR,
                                          });
                                        } else if (rc.beatNumber) {
                                          updateBeatClueField(rc.beatNumber, rc.id, {
                                            roundNumber: newR,
                                          });
                                        }
                                      }}
                                      className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                                    >
                                      {Array.from({ length: totalRounds }, (_, idx) => idx + 1).map(
                                        (rOpt) => (
                                          <option key={rOpt} value={rOpt}>
                                            Round {rOpt}
                                          </option>
                                        )
                                      )}
                                    </select>
                                  </div>
                                </div>

                                <div className="text-sm text-slate-800">
                                  <HighlightedMysteryText
                                    text={rc.description}
                                    characters={blueprint.characters}
                                  />
                                </div>

                                {/* IMPROVEMENT #3: Auto-Synced Character Script Talking Points for This Clue */}
                                {syncedTalkingPoints.length > 0 && (
                                  <div className="rounded-xl bg-indigo-50/50 border border-indigo-200/80 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">
                                        🔗 Auto-Synced Round {rc.roundNumber} Character Script
                                        Talking Points:
                                      </span>
                                      <span className="text-[10px] font-semibold text-indigo-700">
                                        Injected into character booklets on export
                                      </span>
                                    </div>
                                    <div className="space-y-1.5">
                                      {syncedTalkingPoints.map((tp) => (
                                        <div
                                          key={tp.roleTitle}
                                          className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg border border-indigo-100 px-2.5 py-1.5"
                                        >
                                          <HighlightedMysteryText
                                            text={`{{${tp.roleTitle}}}`}
                                            characters={blueprint.characters}
                                            className="inline whitespace-nowrap"
                                          />
                                          <input
                                            type="text"
                                            value={tp.defensiveLine}
                                            onChange={(e) =>
                                              updateClueTalkingPoint(
                                                rc,
                                                tp.roleTitle,
                                                e.target.value
                                              )
                                            }
                                            className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {isPhoto && rc.generationPrompt && (
                                  <div className="rounded-lg bg-pink-50/50 border border-pink-200/70 px-3 py-2 text-[11px] text-slate-600">
                                    <strong className="text-brand-pink">
                                      📸 AI Photo Prompt:
                                    </strong>{' '}
                                    {rc.generationPrompt}
                                  </div>
                                )}

                                {/* IMPROVEMENT #4: Live Player UI Preview + 1-Click Test Render Photo */}
                                {renderInlineClueUiPreview(rc)}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {assembled && reviewTab === 'characters' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {assembled.characters.map((ch) => (
                  <div
                    key={ch.id}
                    className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">{ch.roleTitle}</span>
                      <span className="uppercase text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                        {ch.plotRole} • {ch.defaultGender}
                      </span>
                    </div>
                    <div className="text-sm text-slate-800">
                      <HighlightedMysteryText
                        text={ch.bio}
                        characters={blueprint.characters}
                      />
                    </div>
                    <div className="text-slate-500 pt-1">
                      <strong className="text-slate-700">Outfit:</strong> {ch.outfitAdvice}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {assembled && reviewTab === 'relationships' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assembled.relationships.map((rel, i) => (
                  <div
                    key={i}
                    className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1.5"
                  >
                    <div className="font-black text-slate-900">
                      {rel.roleA} ↔ {rel.roleB}
                    </div>
                    <div className="text-sm text-slate-800">
                      <HighlightedMysteryText
                        text={rel.notes}
                        characters={blueprint.characters}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BaseArchitectClient;
