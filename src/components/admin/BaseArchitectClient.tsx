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
} from '@/app/actions/base-architect';
import { ClueFormat, CLUE_FORMAT_OPTIONS } from '@/utils/clue-format';
import { recommendDifficultyFromPlotAndClues } from '@/utils/architect-difficulty-recommender';

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
 * Exact preset from the user's "UNIBREAK AT THE CABIN" (FILTHY) relationship web diagram:
 * - 6 characters converted from real names (Leah, Stacy, Seb, James, Mia, Josh) into Archetype Roles
 * - 5 Core Murder Plot Beats (strictly developing the true murder plot, 0 red-herring spoilers in the beats)
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
      'Heavy cast-iron fireplace poker from the upstairs balcony chiminea: {{The Co-Captain}} struck the first non-fatal blow across {{The Prom Queen}}\'s temple at 11:18 PM in a blind panic over {{The Prom Queen_his}} phone, and {{The Girlfriend}} delivered the fatal blows to {{The Prom Queen_his}} skull at 11:28 PM before hurling {{The Prom Queen_him}} over the second-story balcony railing onto the stone patio below.',
    killerHowAndWhySummary:
      '{{The Prom Queen}} strung {{The Co-Captain}} along to steal {{The Co-Captain_his}} and {{The Teammate}}\'s varsity sports-betting ledger, then laughed in {{The Co-Captain}}\'s face in front of {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} and revealed {{The Prom Queen_he}} was secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}—threatening to leak both the explicit tape and the betting ledger at midnight. After {{The Co-Captain}} snapped on the balcony at 11:18 PM and knocked {{The Prom Queen}} unconscious with a cast-iron fireplace poker, {{The Girlfriend}} sent {{The Co-Captain}} inside for a living-room alibi, finished {{The Prom Queen}} off with the poker at 11:28 PM, and threw {{The Prom Queen_him}} off the balcony.',
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
          'Found {{The Girlfriend_his}} {{The Co-Captain_sibling}} {{The Co-Captain}} panicking over a bleeding, semi-conscious {{The Prom Queen}} on the balcony at 11:25 PM; sent {{The Co-Captain}} inside for an alibi, delivered the fatal blows with the cast-iron poker at 11:28 PM, and hurled {{The Prom Queen}} off the balcony.',
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
          'Cornered {{The Prom Queen}} on the upstairs balcony at 11:10 PM to get {{The Co-Captain_his}} stolen sports-betting ledger and phone video back; snapped at 11:18 PM and struck {{The Prom Queen}} with the cast-iron poker before {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} took over and finished the kill.',
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
          '{{The Prom Queen}} uses {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to lure {{The Co-Captain_him}} into the upstairs cabin bedroom, secretly filming a humiliating 18+ video and stealing the varsity sports-betting ledger from {{The Co-Captain_his}} jacket.',
      },
      {
        beatNumber: 2,
        title: 'The Humiliation & Midnight Ultimatum',
        timeWindow: '10:15 PM',
        phase: 'pre_crime',
        description:
          'When {{The Co-Captain}} and {{The Co-Captain_his}} {{The Girlfriend_sibling}} {{The Girlfriend}} confront {{The Prom Queen}} to get the ledger back, {{The Prom Queen}} laughs in {{The Co-Captain}}\'s face, reveals {{The Prom Queen_he}} has been secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}, and threatens to drop the explicit tape and betting ledger to the entire university at midnight.',
      },
      {
        beatNumber: 3,
        title: 'The Upstairs Balcony Confrontation',
        timeWindow: '11:10 PM',
        phase: 'pre_crime',
        description:
          'Desperate to stop the midnight upload, {{The Co-Captain}} corners {{The Prom Queen}} out on the isolated second-story cabin balcony to wrestle {{The Prom Queen_his}} phone away, sparking a violent physical struggle when {{The Prom Queen}} claws {{The Co-Captain_his}} neck and queues the files to send.',
      },
      {
        beatNumber: 4,
        title: 'The First Strike With the Fireplace Poker',
        timeWindow: '11:18 PM',
        phase: 'crime',
        description:
          'In a blind panic, {{The Co-Captain}} grabs the heavy cast-iron fireplace poker beside the balcony chiminea and strikes {{The Prom Queen}} across the temple, knocking {{The Prom Queen_him}} bleeding and unconscious onto the timber deck while {{The Prom Queen_his}} phone locks.',
      },
      {
        beatNumber: 5,
        title: 'The Fatal Blow & Balcony Drop',
        timeWindow: '11:28 PM',
        phase: 'crime',
        description:
          '{{The Girlfriend}} steps onto the balcony and finds a blood-spattered {{The Co-Captain}} frozen as {{The Prom Queen}} begins groaning; to save {{The Girlfriend_his}} {{The Co-Captain_sibling}} and destroy {{The Girlfriend_his}} enemy, {{The Girlfriend}} sends {{The Co-Captain}} inside for a living-room alibi, delivers the fatal blows with the cast-iron poker, smashes the phone, and hurls {{The Prom Queen}} over the second-story railing onto the stone patio below.',
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

function createBlankBlueprint(): MysteryBlueprintInput {
  return {
    id: `base-${Date.now()}`,
    title: '',
    theme: '',
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

const STORAGE_KEY = 'bpm_clean_architect_v5';

export function BaseArchitectClient({ locale }: { locale: string }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [blueprint, setBlueprint] = useState<MysteryBlueprintInput>(() =>
    createUnibreakCabinBlueprint()
  );

  // Stage 2: Beat-by-Beat Core Clues map: beatNumber (1..5) -> SuggestedClueCandidate[]
  const [activeBeatNumber, setActiveBeatNumber] = useState<number>(1);
  const [beatCluesMap, setBeatCluesMap] = useState<Record<number, SuggestedClueCandidate[]>>({});
  const [beatCustomNote, setBeatCustomNote] = useState<string>('');

  // Stage 3: Red Herring Plotlines
  const [subplots, setSubplots] = useState<SuggestedRedHerringSubplot[]>([]);
  const [subplotCustomNote, setSubplotCustomNote] = useState<string>('');

  // Stage 4: Round sorting strategy & assembled full base
  const [roundStrategySummary, setRoundStrategySummary] = useState<Record<number, string>>({});
  const [assembled, setAssembled] = useState<AssembledFullMysteryBase | null>(null);
  const [transferredMysteryId, setTransferredMysteryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Loading states
  const [isUploadingDiagram, setIsUploadingDiagram] = useState(false);
  const [isSuggestingBeats, setIsSuggestingBeats] = useState(false);
  const [isGeneratingBeatClues, setIsGeneratingBeatClues] = useState(false);
  const [isGeneratingSubplots, setIsGeneratingSubplots] = useState(false);
  const [isSortingRounds, setIsSortingRounds] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Load existing draft base dropdown
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

  // Stage 4 review tab
  const [reviewTab, setReviewTab] = useState<'rounds' | 'characters' | 'relationships'>('rounds');

  // Toast / Error banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.blueprint?.title) {
          setBlueprint(parsed.blueprint);
          setBeatCluesMap(parsed.beatCluesMap || {});
          setSubplots(parsed.subplots || []);
          setAssembled(parsed.assembled || null);
          setRoundStrategySummary(parsed.roundStrategySummary || {});
          setStep(parsed.step || 1);
        }
      }
    } catch {
      // Ignore storage error
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          step,
          blueprint,
          beatCluesMap,
          subplots,
          assembled,
          roundStrategySummary,
        })
      );
    } catch {
      // Ignore storage error
    }
  }, [step, blueprint, beatCluesMap, subplots, assembled, roundStrategySummary, hydrated]);

  const totalRounds = getRoundsForCount(blueprint.characters.length);

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

  // Live 5-Factor Difficulty Recommender from the 16 clues & plot
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

  const handleLoadUnibreakPreset = () => {
    setBlueprint(createUnibreakCabinBlueprint());
    setBeatCluesMap({});
    setSubplots([]);
    setAssembled(null);
    setTransferredMysteryId(null);
    setActiveBeatNumber(1);
    setStep(1);
    setErrorMessage(null);
    setStatusToast(
      'Loaded "Unibreak at the Cabin" (Filthy • 6 Archetypes + 5 Locked Core Murder Beats).'
    );
  };

  const handleStartBlank = () => {
    setBlueprint(createBlankBlueprint());
    setBeatCluesMap({});
    setSubplots([]);
    setAssembled(null);
    setTransferredMysteryId(null);
    setActiveBeatNumber(1);
    setStep(1);
    setErrorMessage(null);
    setStatusToast('Started a fresh 6-player, 5-beat mystery blueprint.');
  };

  const handleDiagramUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

      const res = await parseDiagramImageIntoBlueprintAction({
        imageBase64,
        mimeType: file.type || 'image/png',
        currentBlueprint: blueprint,
      });

      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Could not parse diagram image.');
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
      'Locked 5-Beat Plot & converted all characters to {{The Archetype}} tokens! Now pick at least 2 clues for Beat #1.'
    );

    if (!beatCluesMap[1] || beatCluesMap[1].length === 0) {
      await handleSuggestCluesForBeat(1, scrubbedBlueprint);
    }
  };

  const handleSuggestCluesForBeat = async (
    targetBeatNum: number,
    overrideBlueprint?: MysteryBlueprintInput
  ) => {
    setErrorMessage(null);
    setIsGeneratingBeatClues(true);
    const bpToUse = overrideBlueprint || blueprint;
    try {
      const currentBeatClues = beatCluesMap[targetBeatNum] || [];
      const keptInThisBeat = currentBeatClues.filter((c) => c.decision === 'yes');

      const res = await suggestCluesForSingleBeatAction({
        blueprint: bpToUse,
        beatNumber: targetBeatNum,
        existingSelectedClues: selectedCoreClues,
        customDirection: beatCustomNote.trim() || undefined,
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
          `Suggested ${res.candidates.length} clues for Beat #${targetBeatNum} (${bpToUse.spiceLevel} spice). Select at least 2 clues.`
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

  const handleMoveToRedHerrings = async (forceRefresh: boolean = false) => {
    setErrorMessage(null);
    if (selectedCoreClues.length < 6) {
      setErrorMessage(
        `Please select at least 2 clues per beat (currently ${selectedCoreClues.length}/10 Core Clues selected) before building Red Herrings.`
      );
      return;
    }
    setStep(3);
    if (subplots.length > 0 && !forceRefresh) {
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
        setSubplots(res.subplots);
        setSubplotCustomNote('');
        setStatusToast(
          'Built 3 Red-Herring Plotlines with suspect motives, double-meaning ties to your real clues, and 6 pre-selected Red Herring clues.'
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
      setErrorMessage('Please select your Core Clues in Stage 2 first.');
      return;
    }
    if (selectedRedHerringClues.length === 0) {
      setErrorMessage('Please select your Red-Herring Clues in Stage 3 first.');
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

  const handleLoadExistingBase = async (mysteryId: string) => {
    setIsLoadingDrafts(true);
    setErrorMessage(null);
    try {
      const res = await loadExistingDraftIntoArchitectAction({ mysteryId });
      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Failed to load mystery base.');
      } else {
        setBlueprint(res.blueprint);
        const grouped: Record<number, SuggestedClueCandidate[]> = {};
        (res.coreClues || []).forEach((c, idx) => {
          const bNum = c.beatNumber || (idx % Math.max(1, res.blueprint!.beats.length)) + 1;
          if (!grouped[bNum]) grouped[bNum] = [];
          grouped[bNum].push({ ...c, beatNumber: bNum, decision: 'yes' });
        });
        setBeatCluesMap(grouped);
        setSubplots(res.subplots || []);
        setAssembled(null);
        setTransferredMysteryId(mysteryId);
        setShowLoadMenu(false);
        setStep(1);
        setStatusToast(`Loaded "${res.blueprint.title}" into OG Base Builder.`);
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

  const allSelectedClues = useMemo(
    () => [...selectedCoreClues, ...selectedRedHerringClues],
    [selectedCoreClues, selectedRedHerringClues]
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* On-Brand Clean Page Header */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <Link
                href={`/${locale}/admin/mysteries`}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 transition"
              >
                ← Mystery Bases
              </Link>
              <span className="text-slate-300">/</span>
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                OG Base Builder
              </span>
            </div>
            <h1 className="text-2xl font-black text-brand-dark tracking-tight mt-1">
              {blueprint.title || 'New Mystery Base'}
            </h1>
          </div>

          {/* Clean Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadUnibreakPreset}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-50 hover:bg-pink-100 text-brand-pink border border-pink-200 transition cursor-pointer"
            >
              Load &ldquo;Unibreak at the Cabin&rdquo;
            </button>

            <label className="cursor-pointer px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
              {isUploadingDiagram ? 'Reading Diagram...' : 'Upload Diagram Image'}
              <input
                type="file"
                accept="image/*"
                onChange={handleDiagramUpload}
                disabled={isUploadingDiagram}
                className="hidden"
              />
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={handleToggleLoadMenu}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition cursor-pointer"
              >
                Load Existing
              </button>
              {showLoadMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-slate-200 shadow-xl p-2 z-40 max-h-80 overflow-y-auto">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-3 py-1.5">
                    Existing Mystery Bases
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
                        onClick={() => handleLoadExistingBase(d.id)}
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
              onClick={handleStartBlank}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Clean 4-Step Segmented Stepper */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100">
          {[
            { num: 1 as const, title: '1. Plot & Archetypes', sub: '5 Core Beats & Cast' },
            {
              num: 2 as const,
              title: '2. Beat Clues',
              sub: `${selectedCoreClues.length} / 10 Core Clues`,
            },
            {
              num: 3 as const,
              title: '3. Red Herrings',
              sub: `${selectedRedHerringClues.length} / 6 Decoy Clues`,
            },
            {
              num: 4 as const,
              title: '4. Sort Rounds & Save',
              sub: `${totalSelectedCluesCount} / 16 Total Clues`,
            },
          ].map((item) => {
            const active = step === item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num)}
                className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                  active
                    ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                    : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/70'
                }`}
              >
                <div className="text-xs font-black tracking-tight">{item.title}</div>
                <div
                  className={`text-[11px] mt-0.5 ${
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
          {/* Section 1: Mystery Basics */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  1. Mystery Basics & Spice Level
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  The Spice Level sets the tone for all clue dialogue, drama, and AI evidence
                  photos.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {blueprint.characters.length} Players • {totalRounds} Rounds
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Mystery Title
                </label>
                <input
                  type="text"
                  value={blueprint.title}
                  onChange={(e) => updateBlueprint({ title: e.target.value })}
                  placeholder="e.g. Unibreak at the Cabin"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-pink"
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

          {/* Section 2: Character Archetypes */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  2. Character Archetypes ({blueprint.characters.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Characters are named by role archetype (e.g.{' '}
                  <code className="text-brand-pink font-semibold">{'{{The Prom Queen}}'}</code>) so
                  any real names used during brainstorming are replaced automatically.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  Victim: {victimCount}
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                  Killer: {killerCount}
                </span>
                {assistantCount > 0 && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Accomplice: {assistantCount}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blueprint.characters.map((char, idx) => {
                const isVictim = char.plotRole === 'victim';
                const isKiller = char.plotRole === 'killer';
                const isAssistant = char.plotRole === 'assistant';

                const cardBorder = isVictim
                  ? 'border-sky-200 bg-sky-50/30'
                  : isKiller
                    ? 'border-rose-200 bg-rose-50/30'
                    : isAssistant
                      ? 'border-amber-200 bg-amber-50/30'
                      : 'border-slate-200 bg-slate-50/50';

                return (
                  <div
                    key={char.id}
                    className={`rounded-2xl border p-4 space-y-3 transition ${cardBorder}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[160px]">
                        <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                        <input
                          type="text"
                          value={char.roleTitle}
                          onChange={(e) =>
                            updateCharacter(char.id, { roleTitle: e.target.value })
                          }
                          placeholder="The Archetype Role"
                          className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-brand-pink"
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
                          className={`rounded-xl px-2.5 py-1.5 text-xs font-bold border focus:outline-none ${
                            isVictim
                              ? 'bg-sky-100 border-sky-300 text-sky-800'
                              : isKiller
                                ? 'bg-rose-100 border-rose-300 text-rose-800'
                                : isAssistant
                                  ? 'bg-amber-100 border-amber-300 text-amber-800'
                                  : 'bg-white border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="victim">Victim</option>
                          <option value="killer">Killer</option>
                          <option value="assistant">Accomplice</option>
                          <option value="innocent">Suspect</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Relationships & Connections
                      </label>
                      <textarea
                        rows={2}
                        value={char.conceptNotes}
                        onChange={(e) =>
                          updateCharacter(char.id, { conceptNotes: e.target.value })
                        }
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-brand-pink"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Motive / Secret
                      </label>
                      <textarea
                        rows={2}
                        value={char.motiveOrSecret}
                        onChange={(e) =>
                          updateCharacter(char.id, { motiveOrSecret: e.target.value })
                        }
                        className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-brand-pink"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: How the Murder Went Down & 5 Core Plot Beats */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  3. The Murder & 5 Core Plot Beats
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lock in how the murder went down across 5 beats. In Step 2, you&apos;ll select 2
                  clues for each beat (10 Core Clues total).
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Murder Time
                </label>
                <input
                  type="text"
                  value={blueprint.murderTimeWindow}
                  onChange={(e) => updateBlueprint({ murderTimeWindow: e.target.value })}
                  placeholder="11:28 PM"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-brand-pink"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  Murder Weapon & Method
                </label>
                <input
                  type="text"
                  value={blueprint.murderWeaponAndMethod}
                  onChange={(e) => updateBlueprint({ murderWeaponAndMethod: e.target.value })}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                How & Why the Killer (& Accomplice) Did It
              </label>
              <textarea
                rows={2}
                value={blueprint.killerHowAndWhySummary}
                onChange={(e) => updateBlueprint({ killerHowAndWhySummary: e.target.value })}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs text-slate-800 leading-relaxed focus:bg-white focus:outline-none focus:border-brand-pink"
              />
            </div>

            {/* 5 Core Story Beat Cards */}
            <div className="space-y-3 pt-2">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400">
                5 Core Story Beats
              </label>
              {blueprint.beats.map((beat) => (
                <div
                  key={beat.beatNumber}
                  className="rounded-2xl bg-slate-50/80 border border-slate-200/80 p-4 space-y-2"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-2.5 py-1 rounded-lg bg-brand-pink/10 text-brand-pink text-xs font-black">
                      Beat #{beat.beatNumber}
                    </span>
                    <input
                      type="text"
                      value={beat.timeWindow}
                      onChange={(e) =>
                        updateBeat(beat.beatNumber, { timeWindow: e.target.value })
                      }
                      className="w-28 rounded-xl bg-white border border-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700"
                    />
                    <input
                      type="text"
                      value={beat.title}
                      onChange={(e) => updateBeat(beat.beatNumber, { title: e.target.value })}
                      placeholder="Beat title"
                      className="flex-1 min-w-[200px] rounded-xl bg-white border border-slate-200 px-3 py-1 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={beat.description}
                    onChange={(e) =>
                      updateBeat(beat.beatNumber, { description: e.target.value })
                    }
                    placeholder="What happens in this beat..."
                    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 leading-relaxed focus:outline-none focus:border-brand-pink"
                  />
                </div>
              ))}
            </div>

            {/* Bottom Approve CTA */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Approving locks your 5 beats, converts all names to archetype tokens, and starts
                Beat #1 clues.
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
      {/* STAGE 2: BEAT-BY-BEAT CORE CLUE PICKER (5 BEATS x 2 = 10 CLUES)   */}
      {/* ================================================================= */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  Step 2: Pick 2 Clues Per Beat ({selectedCoreClues.length} / 10 Selected)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a beat below, review the 5 suggested clues (written for{' '}
                  <strong className="text-brand-pink">{blueprint.spiceLevel}</strong> spice), and
                  pick at least <strong>2 clues</strong> per beat.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ← Back to 5-Beat Plot
              </button>
            </div>

            {/* 5 Beat Tabs */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
              {blueprint.beats.map((b) => {
                const cands = beatCluesMap[b.beatNumber] || [];
                const pickedCount = cands.filter((c) => c.decision === 'yes').length;
                const isCurrent = activeBeatNumber === b.beatNumber;
                const isComplete = pickedCount >= 2;

                return (
                  <button
                    key={b.beatNumber}
                    type="button"
                    onClick={() => handleSelectBeatTab(b.beatNumber)}
                    className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      isCurrent
                        ? 'border-brand-pink bg-pink-50/40'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300'
                          : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className={isCurrent ? 'text-brand-pink' : 'text-slate-800'}>
                        Beat #{b.beatNumber}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isComplete
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pickedCount}/2
                      </span>
                    </div>
                    <div className="text-xs font-bold truncate mt-1 text-slate-800">{b.title}</div>
                    <div className="text-[11px] text-slate-400">{b.timeWindow}</div>
                  </button>
                );
              })}
            </div>

            {/* Active Beat Summary Banner */}
            {activeBeat && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-brand-pink/10 text-brand-pink">
                      Beat #{activeBeat.beatNumber} • {activeBeat.timeWindow}
                    </span>
                    <h3 className="text-sm font-black text-slate-900">{activeBeat.title}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {activeBeat.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleSuggestCluesForBeat(activeBeat.beatNumber)}
                  disabled={isGeneratingBeatClues}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition whitespace-nowrap cursor-pointer"
                >
                  {isGeneratingBeatClues
                    ? `Suggesting Beat #${activeBeat.beatNumber} Clues...`
                    : `🔄 Suggest 5 Fresh Clues`}
                </button>
              </div>
            )}

            {/* Clue Candidates List */}
            {isGeneratingBeatClues && activeBeatCandidates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center space-y-2">
                <div className="text-sm font-black text-slate-800">
                  Writing 5 {blueprint.spiceLevel}-Spice Clues for Beat #{activeBeatNumber}...
                </div>
                <p className="text-xs text-slate-500">
                  Crafting dialogue, forensic details, double-meaning hooks, and photo prompts...
                </p>
              </div>
            ) : activeBeatCandidates.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-600">
                  No clues suggested for Beat #{activeBeatNumber} yet.
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
              <div className="space-y-3">
                {activeBeatCandidates.map((clue) => {
                  const isSelected = clue.decision === 'yes';
                  return (
                    <div
                      key={clue.id}
                      className={`rounded-2xl border-2 p-4 transition space-y-3 ${
                        isSelected
                          ? 'bg-emerald-50/40 border-emerald-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                          <select
                            value={clue.format}
                            onChange={(e) =>
                              updateBeatClueField(activeBeatNumber, clue.id, {
                                format: e.target.value as ClueFormat,
                              })
                            }
                            className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700"
                          >
                            {CLUE_FORMAT_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.shortLabel}
                              </option>
                            ))}
                          </select>

                          <input
                            type="text"
                            value={clue.title}
                            onChange={(e) =>
                              updateBeatClueField(activeBeatNumber, clue.id, {
                                title: e.target.value,
                              })
                            }
                            className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900 focus:bg-white"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleBeatClueSelection(activeBeatNumber, clue.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : '+ Select Clue'}
                        </button>
                      </div>

                      <textarea
                        rows={2}
                        value={clue.description}
                        onChange={(e) =>
                          updateBeatClueField(activeBeatNumber, clue.id, {
                            description: e.target.value,
                          })
                        }
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-800 leading-relaxed focus:bg-white"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-slate-600">
                          <span className="font-bold text-slate-800">How it explains Beat #{activeBeatNumber}:</span>{' '}
                          {clue.pointsTo}
                          {clue.doubleMeaningNote && (
                            <div className="mt-1 text-indigo-700 font-medium">
                              <strong>Double-Meaning Hook:</strong> {clue.doubleMeaningNote}
                            </div>
                          )}
                        </div>
                        <div className="rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 text-slate-500">
                          <span className="font-bold text-slate-700">
                            AI Evidence Photo Prompt ({blueprint.spiceLevel}):
                          </span>
                          <input
                            type="text"
                            value={clue.generationPrompt}
                            onChange={(e) =>
                              updateBeatClueField(activeBeatNumber, clue.id, {
                                generationPrompt: e.target.value,
                              })
                            }
                            className="w-full bg-transparent text-xs text-slate-600 focus:outline-none mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Bottom Navigation */}
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
                  + Suggest More
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                {activeBeatNumber < blueprint.beats.length && (
                  <button
                    type="button"
                    onClick={() => handleSelectBeatTab(activeBeatNumber + 1)}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      activeBeatSelectedCount >= 2
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Next: Beat #{activeBeatNumber + 1} →
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(false)}
                  disabled={isGeneratingSubplots || selectedCoreClues.length < 6}
                  className="px-6 py-3 rounded-2xl text-sm font-black bg-brand-pink hover:bg-pink-600 text-white shadow-sm transition disabled:opacity-40 cursor-pointer"
                >
                  {isGeneratingSubplots
                    ? 'Building Red Herrings...'
                    : `Next: Build Red Herrings (${selectedCoreClues.length}/10) →`}
                </button>
              </div>
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
                <h2 className="text-base font-black text-brand-dark uppercase tracking-tight">
                  Step 3: Red Herring Motives & Clues ({selectedRedHerringClues.length} / 6 Selected)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review each innocent suspect plotline, see how their motive hooks into your real
                  clues, and pick <strong>2 clues per plotline (6 total)</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                ← Back to Beat Clues
              </button>
            </div>

            {isGeneratingSubplots && subplots.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-12 text-center space-y-2">
                <div className="text-sm font-black text-slate-800">
                  Designing Entangled Red-Herring Plotlines & Double-Meaning Tie-Ins...
                </div>
                <p className="text-xs text-slate-500">
                  Connecting innocent suspect motives to your 10 Core Clues...
                </p>
              </div>
            ) : subplots.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-10 text-center space-y-3">
                <p className="text-sm font-semibold text-slate-600">
                  No red-herring plotlines generated yet.
                </p>
                <button
                  type="button"
                  onClick={() => handleMoveToRedHerrings(true)}
                  disabled={isGeneratingSubplots}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-brand-pink text-white cursor-pointer"
                >
                  ✨ Generate Red-Herring Plotlines & Clues
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {subplots.map((sub, sIdx) => {
                  const pickedInSub = sub.decoyClues.filter((dc) => dc.decision === 'yes').length;
                  return (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-slate-200">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Red Herring #{sIdx + 1}
                            </span>
                            <h3 className="text-sm font-black text-slate-900">{sub.title}</h3>
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                              {sub.involvedRoles.join(' ↔ ')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Suspect Motive & Scheme:</strong>{' '}
                            {sub.summary}
                          </p>

                          {sub.doubleMeaningCoreClueHook && (
                            <div className="rounded-xl bg-indigo-50/70 border border-indigo-200/80 px-3.5 py-2 text-xs text-indigo-900">
                              <strong>Double-Meaning Tie-In to Your Real Clues:</strong>{' '}
                              {sub.doubleMeaningCoreClueHook}
                            </div>
                          )}
                        </div>

                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full ${
                            pickedInSub >= 2
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {pickedInSub} Picked
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sub.decoyClues.map((dc) => {
                          const isPicked = dc.decision === 'yes';
                          return (
                            <div
                              key={dc.id}
                              className={`rounded-2xl border-2 p-4 space-y-2.5 transition ${
                                isPicked
                                  ? 'bg-white border-emerald-500 shadow-sm'
                                  : 'bg-white/70 border-slate-200 opacity-80 hover:opacity-100'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black text-slate-500 uppercase">
                                  {dc.format}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleRedHerringClueSelection(sub.id, dc.id)}
                                  className={`px-3.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                                    isPicked
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  }`}
                                >
                                  {isPicked ? '✓ Selected' : '+ Select'}
                                </button>
                              </div>

                              <input
                                type="text"
                                value={dc.title}
                                onChange={(e) =>
                                  updateRedHerringClueField(sub.id, dc.id, {
                                    title: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-900"
                              />

                              <textarea
                                rows={2}
                                value={dc.description}
                                onChange={(e) =>
                                  updateRedHerringClueField(sub.id, dc.id, {
                                    description: e.target.value,
                                  })
                                }
                                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 text-xs text-slate-700 leading-relaxed"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  {isGeneratingSubplots ? 'Regenerating...' : '🔄 Regenerate'}
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
      {/* STAGE 4: COMPLEXITY ROUND SORTER (16 CLUES) & TURN INTO BASE      */}
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
                        <div className="space-y-2">
                          {roundClues.map((rc) => (
                            <div
                              key={rc.id}
                              className="rounded-xl bg-white border border-slate-200 p-3.5 text-xs space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900">{rc.title}</span>
                                  <span className="text-slate-400">
                                    ({rc.format} • {rc.timestampLabel})
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
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
                              <p className="text-slate-600 leading-relaxed">{rc.description}</p>
                            </div>
                          ))}
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
                    <p className="text-slate-600 leading-relaxed">{ch.bio}</p>
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
                    className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs space-y-1"
                  >
                    <div className="font-black text-slate-900">
                      {rel.roleA} ↔ {rel.roleB}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{rel.notes}</p>
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
