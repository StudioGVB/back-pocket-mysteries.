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
  suggestCoreCluesForBlueprintAction,
  suggestRedHerringsAndBackstoriesAction,
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
  'Rose Gold',
  'Sapphire Blue',
  'Electric Cyan',
  'Cobalt Blue',
  'Emerald Green',
  'Royal Purple',
  'Amber Gold',
  'Obsidian Black',
];

const PACKAGE_TIERS = [
  { label: 'Basic (6 Players • 3 Rounds)', players: 6, rounds: 3 },
  { label: 'Premium (10 Players • 4 Rounds)', players: 10, rounds: 4 },
  { label: 'Grand (16 Players • 5 Rounds)', players: 16, rounds: 5 },
] as const;

const SPICE_OPTIONS: {
  level: ArchitectSpiceLevel;
  label: string;
  sub: string;
}[] = [
  { level: 'Clean', label: '✨ Clean', sub: 'SFW • 0 affairs, 0 swearing' },
  { level: 'Mild', label: '🌶️ Mild', sub: 'Affairs allowed • PG-13 dialogue' },
  { level: 'Spicy', label: '🌶️🌶️ Spicy', sub: 'Swearing, catfights & scandals' },
  { level: 'Filthy', label: '🔥🔥🔥 Filthy', sub: '18+ After-Dark & F-bombs' },
];

function getRoundsForCount(charCount: number): 3 | 4 | 5 {
  if (charCount <= 6) return 3;
  if (charCount <= 10) return 4;
  return 5;
}

/**
 * Exact preset from the user's "UNIBREAK AT THE CABIN" (FILTHY) relationship web diagram:
 * - 6 characters (3 Pink / Female: Leah [Prom queen], Stacy, Mia; 3 Blue / Male: Josh, Seb, James)
 * - All 15 connecting lines mapped with bidirectional {{Role}} tokens.
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
      'Heavy cast-iron fireplace poker from the upstairs balcony chiminea: {{The Co-Captain}} (Seb) struck the first non-fatal blow across {{The Prom Queen}}\'s temple at 11:18 PM in a blind panic over her phone, and {{The Girlfriend}} (Stacy) delivered the fatal blows to {{The Prom Queen_his}} skull at 11:28 PM before hurling {{The Prom Queen_him}} over the second-story balcony railing onto the stone patio below.',
    killerHowAndWhySummary:
      '{{The Prom Queen}} (Leah) strung {{The Co-Captain}} (Seb) along to steal his and {{The Teammate}} (James)\'s varsity sports-betting ledger, then laughed in {{The Co-Captain}}\'s face in front of his sibling {{The Girlfriend}} (Stacy) and revealed she was secretly sleeping with {{The Girlfriend}}\'s boyfriend {{The Teammate}}—threatening to leak both the explicit tape and the betting ledger at midnight. After {{The Co-Captain}} snapped on the balcony at 11:18 PM and knocked {{The Prom Queen}} unconscious with a cast-iron fireplace poker, {{The Girlfriend}} sent {{The Co-Captain}} inside for a living-room alibi, finished {{The Prom Queen}} off with the poker at 11:28 PM, threw {{The Prom Queen_him}} off the balcony, and staged the scene to frame {{The Teammate}} and {{The Bestie}} (Mia).',
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
          'Diagram: Leah (Prom queen). Siblings with {{The Brother}} (Josh). Best friends with {{The Bestie}} (Mia). Secret romance with {{The Teammate}} (James). Sworn enemies with {{The Girlfriend}} (Stacy). Object of {{The Co-Captain}} (Seb)\'s obsessive crush.',
        motiveOrSecret:
          'The Victim. Used {{The Co-Captain}}\'s crush on {{The Prom Queen_him}} to steal the varsity sports-betting ledger from {{The Co-Captain_his}} jacket, while secretly hooking up with {{The Girlfriend}}\'s boyfriend {{The Teammate}} and threatening to leak both at midnight.',
        outfitNotes: 'Faux-fur aprés-ski crop jacket, satin slip top & rhinestone tiara headband',
      },
      {
        id: 'char-2',
        roleTitle: 'The Girlfriend',
        defaultGender: 'female',
        plotRole: 'killer',
        color: 'Crimson Red',
        conceptNotes:
          'Diagram: Stacy. Dating {{The Teammate}} (James). Siblings with {{The Co-Captain}} (Seb). Sworn enemies with {{The Prom Queen}} (Leah). Friends with {{The Bestie}} (Mia) and {{The Brother}} (Josh).',
        motiveOrSecret:
          'The Killer. Found her sibling {{The Co-Captain}} panicking over a bleeding, semi-conscious {{The Prom Queen}} on the balcony at 11:25 PM; sent {{The Co-Captain}} inside for an alibi, delivered the fatal blows with the cast-iron poker at 11:28 PM, hurled {{The Prom Queen}} off the balcony, and framed her cheating boyfriend {{The Teammate}} and {{The Bestie}}.',
        outfitNotes: 'Sleek crimson velvet tracksuit, gold hoop earrings & dark berry lipstick',
      },
      {
        id: 'char-3',
        roleTitle: 'The Co-Captain',
        defaultGender: 'male',
        plotRole: 'assistant',
        color: 'Electric Cyan',
        conceptNotes:
          'Diagram: Seb. Co-captains of a sport team with {{The Teammate}} (James). Siblings with {{The Girlfriend}} (Stacy). Exes with {{The Bestie}} (Mia). Secretly has a huge crush on {{The Prom Queen}} (Leah). Friends with {{The Brother}} (Josh).',
        motiveOrSecret:
          'The Secret Accomplice. Cornered {{The Prom Queen}} on the upstairs balcony at 11:10 PM to get his stolen sports-betting ledger and phone video back; snapped at 11:18 PM and struck {{The Prom Queen}} with the cast-iron poker before his sibling {{The Girlfriend}} took over and finished the kill.',
        outfitNotes: 'Uni athletic team letterman bomber, compression shirt & silver whistle chain',
      },
      {
        id: 'char-4',
        roleTitle: 'The Teammate',
        defaultGender: 'male',
        plotRole: 'innocent',
        color: 'Cobalt Blue',
        conceptNotes:
          'Diagram: James. Dating {{The Girlfriend}} (Stacy) while having a filthy secret romance with {{The Prom Queen}} (Leah). Co-captains of a sport team with {{The Co-Captain}} (Seb). Besties with {{The Brother}} (Josh). Works together with {{The Bestie}} (Mia).',
        motiveOrSecret:
          'Secretly sleeping with {{The Prom Queen}} behind his girlfriend {{The Girlfriend}}\'s and bestie {{The Brother}}\'s backs, while also implicated in the varsity betting ledger with {{The Co-Captain}} and skimming cash at work with {{The Bestie}}.',
        outfitNotes: 'Open flannel overshirt, fitted black tee, gold watch & varsity ring',
      },
      {
        id: 'char-5',
        roleTitle: 'The Bestie',
        defaultGender: 'female',
        plotRole: 'innocent',
        color: 'Rose Gold',
        conceptNotes:
          'Diagram: Mia. Best friends with {{The Prom Queen}} (Leah). Exes with {{The Co-Captain}} (Seb). Works together with {{The Teammate}} (James). Friends with {{The Brother}} (Josh) and {{The Girlfriend}} (Stacy).',
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
          'Diagram: Josh. Siblings with {{The Prom Queen}} (Leah). Besties with {{The Teammate}} (James). Friends with {{The Bestie}} (Mia), {{The Co-Captain}} (Seb), and {{The Girlfriend}} (Stacy).',
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
          'When {{The Co-Captain}} and {{The Co-Captain_his}} sibling {{The Girlfriend}} confront {{The Prom Queen}} to get the ledger back, {{The Prom Queen}} laughs in {{The Co-Captain}}\'s face, reveals {{The Prom Queen_he}} has been secretly sleeping with {{The Girlfriend}}\'s partner {{The Teammate}}, and threatens to drop the explicit tape and betting ledger to the entire university at midnight.',
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
          '{{The Girlfriend}} steps onto the balcony and finds a blood-spattered {{The Co-Captain}} frozen as {{The Prom Queen}} begins groaning; to save {{The Girlfriend_his}} sibling and destroy {{The Girlfriend_his}} enemy, {{The Girlfriend}} sends {{The Co-Captain}} inside for a living-room alibi, delivers the fatal blows with the cast-iron poker, smashes the phone, and hurls {{The Prom Queen}} over the second-story railing onto the stone patio below.',
      },
    ],
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

const STORAGE_KEY = 'bpm_simple_og_architect_v3';

export function BaseArchitectClient({ locale }: { locale: string }) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [blueprint, setBlueprint] = useState<MysteryBlueprintInput>(() =>
    createUnibreakCabinBlueprint()
  );
  const [coreClues, setCoreClues] = useState<SuggestedClueCandidate[]>([]);
  const [subplots, setSubplots] = useState<SuggestedRedHerringSubplot[]>([]);
  const [assembled, setAssembled] = useState<AssembledFullMysteryBase | null>(null);
  const [transferredMysteryId, setTransferredMysteryId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Loading states
  const [isUploadingDiagram, setIsUploadingDiagram] = useState(false);
  const [isSuggestingBeats, setIsSuggestingBeats] = useState(false);
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [isGeneratingSubplots, setIsGeneratingSubplots] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Optional 1-line AI steering prompts
  const [cluePromptNote, setCluePromptNote] = useState('');
  const [subplotPromptNote, setSubplotPromptNote] = useState('');

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

  // Step 4 review tab
  const [reviewTab, setReviewTab] = useState<'clues' | 'characters' | 'relationships'>('clues');

  // Toast / Error banners
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Hydrate from localStorage if saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.blueprint?.title) {
          setBlueprint(parsed.blueprint);
          setCoreClues(parsed.coreClues || []);
          setSubplots(parsed.subplots || []);
          setAssembled(parsed.assembled || null);
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
          coreClues,
          subplots,
          assembled,
        })
      );
    } catch {
      // Ignore storage error
    }
  }, [step, blueprint, coreClues, subplots, assembled, hydrated]);

  const totalRounds = getRoundsForCount(blueprint.characters.length);

  // Keep difficulty badge synced quietly
  const difficultyRec = useMemo(
    () =>
      recommendDifficultyFromPlotAndClues({
        blueprint,
        coreClues,
        subplots,
      }),
    [blueprint, coreClues, subplots]
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

  // Load "Unibreak at the Cabin" preset in 1 click
  const handleLoadUnibreakPreset = () => {
    setBlueprint(createUnibreakCabinBlueprint());
    setCoreClues([]);
    setSubplots([]);
    setAssembled(null);
    setTransferredMysteryId(null);
    setStep(1);
    setErrorMessage(null);
    setStatusToast(
      '🌲 Loaded "Unibreak at the Cabin" (Filthy • 6 Players: Leah, Stacy, Mia, Josh, Seb & James + all 15 diagram relationships)!'
    );
  };

  const handleStartBlank = () => {
    setBlueprint(createBlankBlueprint());
    setCoreClues([]);
    setSubplots([]);
    setAssembled(null);
    setTransferredMysteryId(null);
    setStep(1);
    setErrorMessage(null);
    setStatusToast('Started a fresh 6-player mystery blueprint.');
  };

  // Upload diagram screenshot (PNG/JPG) and auto-extract characters + relationships
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
          `📷 Parsed diagram "${res.blueprint.title}" (${res.blueprint.characters.length} characters & relationships)!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to parse diagram image.');
    } finally {
      setIsUploadingDiagram(false);
      e.target.value = '';
    }
  };

  // Auto-Suggest Murder & 4 Story Beats from the Cast & Relationships
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
        setStatusToast('✨ Generated Murder Method & 4 Chronological Story Beats from your cast!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error suggesting story beats.');
    } finally {
      setIsSuggestingBeats(false);
    }
  };

  // Load existing draft base from Supabase
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
        setCoreClues(res.coreClues || []);
        setSubplots(res.subplots || []);
        setAssembled(null);
        setTransferredMysteryId(mysteryId);
        setShowLoadMenu(false);
        setStep(1);
        setStatusToast(`📂 Loaded "${res.blueprint.title}" into OG Base Builder.`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading mystery base.');
    } finally {
      setIsLoadingDrafts(false);
    }
  };

  // Step 1 -> Step 2: Generate Core Clues
  const handleGenerateCoreClues = async (isMoreOptions: boolean = false) => {
    setErrorMessage(null);
    if (!blueprint.title.trim()) {
      setErrorMessage('Please enter a Mystery Title first.');
      return;
    }
    if (!blueprint.killerHowAndWhySummary.trim()) {
      setErrorMessage(
        'Please fill in "How & Why the Killer Did It" (or click "✨ Auto-Suggest Murder & 4 Beats" first).'
      );
      return;
    }
    setIsGeneratingClues(true);
    try {
      const res = await suggestCoreCluesForBlueprintAction({
        blueprint: { ...blueprint, complexity: difficultyRec.recommendedTier },
        existingClues: isMoreOptions ? coreClues : [],
        customDirection: cluePromptNote.trim() || undefined,
      });
      if (!res.success || !res.clues) {
        setErrorMessage(res.error || 'Failed to generate core clues.');
      } else {
        setCoreClues(res.clues);
        setCluePromptNote('');
        setStep(2);
        setStatusToast(
          isMoreOptions
            ? '✨ Replaced skipped clues with fresh clue ideas!'
            : '✨ Generated Core Clues! Click ✓ Keep or ✕ Skip on each clue.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating core clues.');
    } finally {
      setIsGeneratingClues(false);
    }
  };

  // Step 2 -> Step 3: Generate Red Herrings
  const handleGenerateRedHerrings = async (isMoreOptions: boolean = false) => {
    setErrorMessage(null);
    const keptClues = coreClues.filter((c) => c.decision === 'yes');
    if (keptClues.length < 3) {
      setErrorMessage('Please keep (✓ Keep) at least 3 Core Clues before moving to Red Herrings.');
      return;
    }
    setIsGeneratingSubplots(true);
    try {
      const res = await suggestRedHerringsAndBackstoriesAction({
        blueprint: { ...blueprint, complexity: difficultyRec.recommendedTier },
        approvedCoreClues: keptClues,
        existingSubplots: isMoreOptions ? subplots : [],
        customDirection: subplotPromptNote.trim() || undefined,
      });
      if (!res.success || !res.subplots) {
        setErrorMessage(res.error || 'Failed to generate red herrings.');
      } else {
        setSubplots(res.subplots);
        setSubplotPromptNote('');
        setStep(3);
        setStatusToast(
          isMoreOptions
            ? '✨ Replaced skipped subplots with fresh Red Herring ideas!'
            : '✨ Generated Red-Herring Subplots for your innocent suspects!'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating red herrings.');
    } finally {
      setIsGeneratingSubplots(false);
    }
  };

  // Step 3 -> Step 4: Assemble Full Base
  const handleAssembleFullBase = async () => {
    setErrorMessage(null);
    const keptClues = coreClues.filter((c) => c.decision === 'yes');
    const keptSubplots = subplots.filter((s) => s.decision === 'yes');
    if (keptClues.length < 3) {
      setErrorMessage('Please keep at least 3 Core Clues in Step 2.');
      return;
    }
    if (keptSubplots.length < 1) {
      setErrorMessage('Please keep at least 1 Red-Herring Subplot in Step 3.');
      return;
    }
    setIsAssembling(true);
    try {
      const res = await assembleAndProofreadFullBaseAction({
        blueprint: { ...blueprint, complexity: difficultyRec.recommendedTier },
        approvedCoreClues: keptClues,
        approvedSubplots: keptSubplots,
      });
      if (!res.success || !res.assembled) {
        setErrorMessage(res.error || 'Failed to assemble full mystery base.');
      } else {
        setAssembled(res.assembled);
        setStep(4);
        setStatusToast(
          `✨ Assembled full ${totalRounds}-Round Mystery Base (${res.assembled.characters.length} character dossiers, ${res.assembled.clues.length} clues, ${res.assembled.relationships.length} relationship pairs)!`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error assembling mystery base.');
    } finally {
      setIsAssembling(false);
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
        setStatusToast(`🛠️ Fixed: ${(res.fixesApplied || []).join(' • ')}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error running auto-fix.');
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleSaveToMysteryBases = async () => {
    if (!assembled) return;
    setIsTransferring(true);
    setErrorMessage(null);
    try {
      const res = await transferBlueprintToDraftMysteryBaseAction({ assembled });
      if (!res.success || !res.mysteryId) {
        setErrorMessage(res.error || 'Failed to save to Mystery Bases.');
      } else {
        setTransferredMysteryId(res.mysteryId);
        setStatusToast('🎉 Saved to Mystery Bases as a Draft!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error saving to Mystery Bases.');
    } finally {
      setIsTransferring(false);
    }
  };

  const keptCoreCluesCount = coreClues.filter((c) => c.decision === 'yes').length;
  const keptSubplotsCount = subplots.filter((s) => s.decision === 'yes').length;
  const victimCount = blueprint.characters.filter((c) => c.plotRole === 'victim').length;
  const killerCount = blueprint.characters.filter((c) => c.plotRole === 'killer').length;

  return (
    <div className="min-h-screen bg-[#0b0a0e] text-stone-100 pb-24">
      {/* Top Bar */}
      <div className="border-b border-stone-800/80 bg-[#121017]/95 sticky top-0 z-30 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/admin/mysteries`}
              className="text-xs font-medium text-stone-400 hover:text-stone-200 px-2.5 py-1.5 rounded-lg border border-stone-800 hover:border-stone-700 transition"
            >
              ← Back to Mysteries
            </Link>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                <span>OG Base Builder</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Simple 4-Step Flow
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Presets & Diagram Upload */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleLoadUnibreakPreset}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-200 border border-pink-500/30 transition"
            >
              🌲 Load &ldquo;Unibreak at the Cabin&rdquo; Diagram
            </button>

            <label className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 transition">
              {isUploadingDiagram ? '📷 Reading Diagram...' : '📷 Upload Diagram Image'}
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
                className="text-xs font-medium px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition"
              >
                📂 Load Existing
              </button>
              {showLoadMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#181520] border border-stone-700 shadow-2xl p-2 z-40 max-h-80 overflow-y-auto">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 px-2 py-1">
                    Load Existing Base
                  </div>
                  {isLoadingDrafts ? (
                    <div className="text-xs text-stone-400 p-3">Loading bases...</div>
                  ) : draftList.length === 0 ? (
                    <div className="text-xs text-stone-400 p-3">No existing bases found.</div>
                  ) : (
                    draftList.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => handleLoadExistingBase(d.id)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-stone-800 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-stone-200 truncate">{d.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-800 text-stone-400">
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
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition"
            >
              Reset Blank
            </button>
          </div>
        </div>

        {/* Clean 4-Step Nav Bar */}
        <div className="max-w-5xl mx-auto px-6 pb-3 flex items-center gap-2 overflow-x-auto">
          {[
            { num: 1 as const, label: '1. Cast & Story Beats' },
            {
              num: 2 as const,
              label: `2. Core Clues${keptCoreCluesCount > 0 ? ` (${keptCoreCluesCount} kept)` : ''}`,
            },
            {
              num: 3 as const,
              label: `3. Red Herrings${keptSubplotsCount > 0 ? ` (${keptSubplotsCount} kept)` : ''}`,
            },
            { num: 4 as const, label: '4. Review & Save Base' },
          ].map((item) => {
            const active = step === item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() => setStep(item.num)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-stone-950 shadow-sm'
                    : 'bg-stone-900/90 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-5xl mx-auto px-6 pt-6 space-y-6">
        {/* Notifications */}
        {errorMessage && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-xs text-red-200 flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-300 hover:text-white ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {statusToast && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-200 flex items-center justify-between">
            <span>{statusToast}</span>
            <button
              type="button"
              onClick={() => setStatusToast(null)}
              className="text-emerald-300 hover:text-white ml-4 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 1: BASICS, CAST & 4 STORY BEATS                              */}
        {/* ================================================================= */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Card 1: Mystery Title, Package Size & Spice Level */}
            <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">1. Mystery Basics</h2>
                  <p className="text-xs text-stone-400">
                    Set the title, package size, and spice level.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-900 border border-stone-800 text-stone-300">
                  {blueprint.characters.length} Players • {totalRounds} Rounds • Auto-Difficulty:{' '}
                  <strong className="text-amber-300 uppercase">
                    {difficultyRec.recommendedTier}
                  </strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Mystery Title
                  </label>
                  <input
                    type="text"
                    value={blueprint.title}
                    onChange={(e) => updateBlueprint({ title: e.target.value })}
                    placeholder="e.g. Unibreak at the Cabin"
                    className="w-full rounded-xl bg-stone-900/90 border border-stone-700/80 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Setting / Theme Tagline
                  </label>
                  <input
                    type="text"
                    value={blueprint.theme}
                    onChange={(e) => updateBlueprint({ theme: e.target.value })}
                    placeholder="e.g. Rowdy Uni Break Ski & Hot-Tub Cabin Party"
                    className="w-full rounded-xl bg-stone-900/90 border border-stone-700/80 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Package Tier & Spice Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                    Package Size & Rounds
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PACKAGE_TIERS.map((tier) => {
                      const active = blueprint.characters.length === tier.players;
                      return (
                        <button
                          key={tier.players}
                          type="button"
                          onClick={() => handleSetPackagePlayerCount(tier.players)}
                          className={`px-3 py-2 rounded-xl text-left border transition ${
                            active
                              ? 'bg-amber-500/15 border-amber-500 text-amber-200'
                              : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{tier.players} Players</div>
                          <div className="text-[10px] opacity-80">{tier.rounds} Rounds</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1.5">
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
                          className={`px-2.5 py-2 rounded-xl text-left border transition ${
                            active
                              ? 'bg-pink-500/20 border-pink-500 text-pink-200'
                              : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <div className="text-xs font-bold">{sp.label}</div>
                          <div className="text-[10px] opacity-75 truncate">{sp.sub}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Characters & Relationship Web */}
            <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-white">
                    2. Characters & Relationship Web ({blueprint.characters.length})
                  </h2>
                  <p className="text-xs text-stone-400">
                    Use <code className="text-amber-300">{'{{The Role}}'}</code> tokens so every
                    character automatically gender-flexes to any guest group.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`px-2.5 py-1 rounded-full border ${
                      victimCount === 1
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-200'
                        : 'bg-red-500/20 border-red-500 text-red-200'
                    }`}
                  >
                    Victim: {victimCount}/1
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-full border ${
                      killerCount === 1
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-red-500/20 border-red-500 text-red-200'
                    }`}
                  >
                    Killer: {killerCount}/1
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {blueprint.characters.map((char, idx) => {
                  const isVictim = char.plotRole === 'victim';
                  const isKiller = char.plotRole === 'killer';
                  const isAssistant = char.plotRole === 'assistant';
                  const borderClass = isVictim
                    ? 'border-sky-500/60 bg-sky-950/15'
                    : isKiller
                      ? 'border-rose-500/60 bg-rose-950/15'
                      : isAssistant
                        ? 'border-amber-500/60 bg-amber-950/15'
                        : 'border-stone-800 bg-stone-900/50';

                  return (
                    <div
                      key={char.id}
                      className={`rounded-xl border p-4 space-y-3 transition ${borderClass}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-xs font-bold text-stone-400">#{idx + 1}</span>
                          <input
                            type="text"
                            value={char.roleTitle}
                            onChange={(e) =>
                              updateCharacter(char.id, { roleTitle: e.target.value })
                            }
                            placeholder="The Role Title"
                            className="flex-1 rounded-lg bg-stone-950/80 border border-stone-700/80 px-2.5 py-1.5 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        {/* Gender Pill */}
                        <select
                          value={char.defaultGender}
                          onChange={(e) =>
                            updateCharacter(char.id, {
                              defaultGender: e.target.value as 'female' | 'male' | 'adaptable',
                            })
                          }
                          className={`rounded-lg px-2 py-1.5 text-xs font-semibold border focus:outline-none ${
                            char.defaultGender === 'female'
                              ? 'bg-pink-500/20 border-pink-500/40 text-pink-200'
                              : char.defaultGender === 'male'
                                ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                                : 'bg-stone-800 border-stone-700 text-stone-200'
                          }`}
                        >
                          <option value="female">♀ Female</option>
                          <option value="male">♂ Male</option>
                          <option value="adaptable">⚧ Adaptable</option>
                        </select>

                        {/* Plot Role Pill */}
                        <select
                          value={char.plotRole}
                          onChange={(e) =>
                            updateCharacter(char.id, {
                              plotRole: e.target.value as CharacterPlotRole,
                            })
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold uppercase border focus:outline-none ${
                            isVictim
                              ? 'bg-sky-500/20 border-sky-500/50 text-sky-200'
                              : isKiller
                                ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                                : isAssistant
                                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                                  : 'bg-stone-800 border-stone-700 text-stone-300'
                          }`}
                        >
                          <option value="victim">💀 Victim</option>
                          <option value="killer">🔪 Killer</option>
                          <option value="innocent">🕵️ Suspect</option>
                          <option value="assistant">🤝 Accomplice</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                          Relationships & Connections (from diagram)
                        </label>
                        <textarea
                          rows={2}
                          value={char.conceptNotes}
                          onChange={(e) =>
                            updateCharacter(char.id, { conceptNotes: e.target.value })
                          }
                          placeholder="e.g. Siblings with {{The Brother}}. Exes with {{The Co-Captain}}..."
                          className="w-full rounded-lg bg-stone-950/70 border border-stone-800 px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                          Secret / Motive & Outfit Vibe
                        </label>
                        <input
                          type="text"
                          value={char.motiveOrSecret}
                          onChange={(e) =>
                            updateCharacter(char.id, { motiveOrSecret: e.target.value })
                          }
                          placeholder="Why they had a motive or what secret they're hiding..."
                          className="w-full rounded-lg bg-stone-950/70 border border-stone-800 px-2.5 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card 3: The Murder & 4 Story Beats */}
            <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    3. The Murder & 4 Story Beats
                  </h2>
                  <p className="text-xs text-stone-400">
                    Don&apos;t have beats yet? Click Auto-Suggest and AI will write the murder &
                    4 story beats from your relationship web.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSuggestBeats}
                  disabled={isSuggestingBeats}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition disabled:opacity-50"
                >
                  {isSuggestingBeats
                    ? '✨ Writing Beats from Cast...'
                    : '✨ Auto-Suggest Murder & 4 Story Beats'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Murder Time
                  </label>
                  <input
                    type="text"
                    value={blueprint.murderTimeWindow}
                    onChange={(e) => updateBlueprint({ murderTimeWindow: e.target.value })}
                    placeholder="11:45 PM"
                    className="w-full rounded-xl bg-stone-900 border border-stone-700/80 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Murder Weapon & Forensic Trace
                  </label>
                  <input
                    type="text"
                    value={blueprint.murderWeaponAndMethod}
                    onChange={(e) => updateBlueprint({ murderWeaponAndMethod: e.target.value })}
                    placeholder="How the victim was killed..."
                    className="w-full rounded-xl bg-stone-900 border border-stone-700/80 px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  How & Why the Killer Did It
                </label>
                <textarea
                  rows={2}
                  value={blueprint.killerHowAndWhySummary}
                  onChange={(e) => updateBlueprint({ killerHowAndWhySummary: e.target.value })}
                  placeholder="2 sentences explaining why the Killer murdered the Victim and how they did it..."
                  className="w-full rounded-xl bg-stone-900 border border-stone-700/80 px-3 py-2 text-xs text-white"
                />
              </div>

              {/* 4 Compact Story Beat Rows */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-stone-300">
                  4 Story Beats (Timeline)
                </label>
                {blueprint.beats.map((beat) => (
                  <div
                    key={beat.beatNumber}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-start rounded-xl bg-stone-900/60 border border-stone-800 p-3"
                  >
                    <div className="sm:col-span-2 flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-400">#{beat.beatNumber}</span>
                      <input
                        type="text"
                        value={beat.timeWindow}
                        onChange={(e) =>
                          updateBeat(beat.beatNumber, { timeWindow: e.target.value })
                        }
                        className="w-full rounded-lg bg-stone-950 border border-stone-800 px-2 py-1 text-xs text-stone-200"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <input
                        type="text"
                        value={beat.title}
                        onChange={(e) => updateBeat(beat.beatNumber, { title: e.target.value })}
                        placeholder="Beat title"
                        className="w-full rounded-lg bg-stone-950 border border-stone-800 px-2.5 py-1 text-xs font-semibold text-white"
                      />
                    </div>
                    <div className="sm:col-span-7">
                      <input
                        type="text"
                        value={beat.description}
                        onChange={(e) =>
                          updateBeat(beat.beatNumber, { description: e.target.value })
                        }
                        placeholder="What happens at this point in the night..."
                        className="w-full rounded-lg bg-stone-950 border border-stone-800 px-2.5 py-1 text-xs text-stone-300"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTA to Step 2 */}
              <div className="pt-2 flex items-center justify-end gap-3">
                {coreClues.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200"
                  >
                    View Existing Clues ({coreClues.length}) →
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleGenerateCoreClues(false)}
                  disabled={isGeneratingClues}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg transition disabled:opacity-50"
                >
                  {isGeneratingClues
                    ? '✨ Generating Core Clues...'
                    : 'Next: Generate Core Clues →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 2: PICK CORE CLUES (KEEP / SKIP)                             */}
        {/* ================================================================= */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Step 2: Pick Core Murder Clues ({keptCoreCluesCount} Kept)
                  </h2>
                  <p className="text-xs text-stone-400">
                    Keep at least 4–6 core clues across Rounds 1–{totalRounds} that point toward{' '}
                    <strong className="text-rose-300">
                      {blueprint.characters.find((c) => c.plotRole === 'killer')?.roleTitle ||
                        'the Killer'}
                    </strong>
                    .
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  ← Back to Cast & Beats
                </button>
              </div>

              {coreClues.length === 0 ? (
                <div className="rounded-xl bg-stone-900/70 border border-stone-800 p-8 text-center space-y-3">
                  <p className="text-sm text-stone-300">No core clues generated yet.</p>
                  <button
                    type="button"
                    onClick={() => handleGenerateCoreClues(false)}
                    disabled={isGeneratingClues}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950"
                  >
                    {isGeneratingClues ? 'Generating...' : '✨ Generate Core Clues Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {coreClues.map((clue) => {
                    const isKept = clue.decision === 'yes';
                    const isSkipped = clue.decision === 'no';
                    return (
                      <div
                        key={clue.id}
                        className={`rounded-xl border p-4 transition space-y-2.5 ${
                          isKept
                            ? 'bg-emerald-950/15 border-emerald-500/50'
                            : isSkipped
                              ? 'bg-stone-950/40 border-stone-800/60 opacity-55'
                              : 'bg-stone-900/60 border-stone-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                            <select
                              value={clue.roundNumber}
                              onChange={(e) =>
                                setCoreClues((prev) =>
                                  prev.map((c) =>
                                    c.id === clue.id
                                      ? {
                                          ...c,
                                          roundNumber: Number(
                                            e.target.value
                                          ) as ArchitectRoundNumber,
                                        }
                                      : c
                                  )
                                )
                              }
                              className="rounded-lg bg-stone-950 border border-stone-700 px-2 py-1 text-xs font-bold text-amber-300"
                            >
                              {Array.from({ length: totalRounds }, (_, i) => i + 1).map((r) => (
                                <option key={r} value={r}>
                                  Round {r}
                                </option>
                              ))}
                            </select>

                            <select
                              value={clue.format}
                              onChange={(e) =>
                                setCoreClues((prev) =>
                                  prev.map((c) =>
                                    c.id === clue.id
                                      ? { ...c, format: e.target.value as ClueFormat }
                                      : c
                                  )
                                )
                              }
                              className="rounded-lg bg-stone-950 border border-stone-700 px-2 py-1 text-xs text-stone-300"
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
                                setCoreClues((prev) =>
                                  prev.map((c) =>
                                    c.id === clue.id ? { ...c, title: e.target.value } : c
                                  )
                                )
                              }
                              className="flex-1 rounded-lg bg-stone-950/80 border border-stone-800 px-2.5 py-1 text-xs font-bold text-white"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setCoreClues((prev) =>
                                  prev.map((c) =>
                                    c.id === clue.id ? { ...c, decision: 'yes' } : c
                                  )
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isKept
                                  ? 'bg-emerald-500 text-stone-950'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              ✓ Keep
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCoreClues((prev) =>
                                  prev.map((c) =>
                                    c.id === clue.id ? { ...c, decision: 'no' } : c
                                  )
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isSkipped
                                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
                                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                              }`}
                            >
                              ✕ Skip
                            </button>
                          </div>
                        </div>

                        <textarea
                          rows={2}
                          value={clue.description}
                          onChange={(e) =>
                            setCoreClues((prev) =>
                              prev.map((c) =>
                                c.id === clue.id ? { ...c, description: e.target.value } : c
                              )
                            )
                          }
                          className="w-full rounded-lg bg-stone-950/70 border border-stone-800 px-2.5 py-1.5 text-xs text-stone-200"
                        />

                        {clue.pointsTo && (
                          <div className="text-[11px] text-stone-400">
                            🎯 <span className="text-stone-300">{clue.pointsTo}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Simple 1-line steer & Next CTA */}
              <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <input
                    type="text"
                    value={cluePromptNote}
                    onChange={(e) => setCluePromptNote(e.target.value)}
                    placeholder="Optional: ask for a specific clue idea (e.g. 'sauna keycard log' or 'spiked flask')..."
                    className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateCoreClues(true)}
                    disabled={isGeneratingClues}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 whitespace-nowrap"
                  >
                    {isGeneratingClues ? 'Generating...' : '🔄 Replace Skipped Clues'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateRedHerrings(false)}
                  disabled={isGeneratingSubplots || keptCoreCluesCount < 3}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg transition disabled:opacity-50"
                >
                  {isGeneratingSubplots
                    ? '✨ Generating Red Herrings...'
                    : 'Next: Pick Red Herrings →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 3: PICK RED HERRINGS (KEEP / SKIP)                           */}
        {/* ================================================================= */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Step 3: Pick Red-Herring Subplots ({keptSubplotsCount} Kept)
                  </h2>
                  <p className="text-xs text-stone-400">
                    Each subplot pairs 2 innocent suspects in a suspicious side-scandal so the
                    killer isn&apos;t obvious in Round 1. Keep 1–2 subplots.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-stone-400 hover:text-stone-200"
                >
                  ← Back to Core Clues
                </button>
              </div>

              {subplots.length === 0 ? (
                <div className="rounded-xl bg-stone-900/70 border border-stone-800 p-8 text-center space-y-3">
                  <p className="text-sm text-stone-300">No red-herring subplots generated yet.</p>
                  <button
                    type="button"
                    onClick={() => handleGenerateRedHerrings(false)}
                    disabled={isGeneratingSubplots}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-stone-950"
                  >
                    {isGeneratingSubplots ? 'Generating...' : '✨ Generate Red Herrings Now'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subplots.map((sub) => {
                    const isKept = sub.decision === 'yes';
                    const isSkipped = sub.decision === 'no';
                    return (
                      <div
                        key={sub.id}
                        className={`rounded-xl border p-4 space-y-3 transition ${
                          isKept
                            ? 'bg-emerald-950/15 border-emerald-500/50'
                            : isSkipped
                              ? 'bg-stone-950/40 border-stone-800/60 opacity-55'
                              : 'bg-stone-900/60 border-stone-800'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">{sub.title}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                {sub.involvedRoles.join(' ↔ ')}
                              </span>
                            </div>
                            <p className="text-xs text-stone-300 mt-1">{sub.summary}</p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setSubplots((prev) =>
                                  prev.map((s) =>
                                    s.id === sub.id ? { ...s, decision: 'yes' } : s
                                  )
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isKept
                                  ? 'bg-emerald-500 text-stone-950'
                                  : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                              }`}
                            >
                              ✓ Keep
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setSubplots((prev) =>
                                  prev.map((s) =>
                                    s.id === sub.id ? { ...s, decision: 'no' } : s
                                  )
                                )
                              }
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                                isSkipped
                                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50'
                                  : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                              }`}
                            >
                              ✕ Skip
                            </button>
                          </div>
                        </div>

                        {/* Decoy clues inside this subplot */}
                        <div className="space-y-2 pt-2 border-t border-stone-800/80">
                          <div className="text-[11px] font-semibold text-stone-400">
                            Decoy Clues Included ({sub.decoyClues.length}):
                          </div>
                          {sub.decoyClues.map((dc) => (
                            <div
                              key={dc.id}
                              className="rounded-lg bg-stone-950/70 border border-stone-800/90 p-2.5 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-amber-200">
                                  Round {dc.roundNumber} • {dc.format}: {dc.title}
                                </span>
                              </div>
                              <p className="text-stone-300">{dc.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom bar */}
              <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                  <input
                    type="text"
                    value={subplotPromptNote}
                    onChange={(e) => setSubplotPromptNote(e.target.value)}
                    placeholder="Optional: ask for a specific red herring idea..."
                    className="flex-1 rounded-xl bg-stone-900 border border-stone-700 px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleGenerateRedHerrings(true)}
                    disabled={isGeneratingSubplots}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-200 whitespace-nowrap"
                  >
                    {isGeneratingSubplots ? 'Generating...' : '🔄 Suggest More Red Herrings'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleAssembleFullBase}
                  disabled={isAssembling || keptSubplotsCount < 1}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg transition disabled:opacity-50"
                >
                  {isAssembling
                    ? '✨ Assembling Full Base...'
                    : 'Next: Assemble & Review Base →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* STEP 4: REVIEW & SAVE TO MYSTERY BASES                            */}
        {/* ================================================================= */}
        {step === 4 && (
          <div className="space-y-5">
            {!assembled ? (
              <div className="rounded-2xl bg-[#15131b] border border-stone-800 p-8 text-center space-y-3">
                <p className="text-sm text-stone-300">
                  Ready to assemble your full mystery base from your kept clues and subplots.
                </p>
                <button
                  type="button"
                  onClick={handleAssembleFullBase}
                  disabled={isAssembling}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 text-stone-950"
                >
                  {isAssembling ? '✨ Assembling...' : '✨ Assemble Full Base Now'}
                </button>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#15131b] border border-stone-800/90 p-6 space-y-5">
                {/* Header & Save Action */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-800">
                  <div>
                    <h2 className="text-lg font-bold text-white">{assembled.title}</h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {assembled.characters.length} Players • {totalRounds} Rounds •{' '}
                      {assembled.spiceLevel} • {assembled.clues.length} Total Clues •{' '}
                      {assembled.relationships.length} Relationships
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {assembled.proofreadReport.checks.some((c) => !c.passed) && (
                      <button
                        type="button"
                        onClick={handleAutoFixIssues}
                        disabled={isAutoFixing}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40"
                      >
                        {isAutoFixing ? '🛠️ Auto-Fixing...' : '🛠️ 1-Click Auto-Fix Warnings'}
                      </button>
                    )}

                    {transferredMysteryId ? (
                      <Link
                        href={`/${locale}/builder/mysteries/${transferredMysteryId}`}
                        className="px-6 py-3 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-lg transition"
                      >
                        🎉 Open in Mystery Builder →
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSaveToMysteryBases}
                        disabled={isTransferring}
                        className="px-6 py-3 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-lg transition disabled:opacity-50"
                      >
                        {isTransferring
                          ? '🚀 Saving to Mystery Bases...'
                          : '🚀 Save to Mystery Bases (Draft) →'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Compact Proofreader Pills */}
                <div className="flex flex-wrap gap-2">
                  {assembled.proofreadReport.checks.map((chk) => (
                    <span
                      key={chk.id}
                      title={chk.detail}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border ${
                        chk.passed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                          : 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      {chk.passed ? '✓' : '⚠️'} {chk.label}
                    </span>
                  ))}
                </div>

                {/* Review Tabs */}
                <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
                  {[
                    {
                      id: 'clues' as const,
                      label: `Clues by Round (${assembled.clues.length})`,
                    },
                    {
                      id: 'characters' as const,
                      label: `Character Dossiers (${assembled.characters.length})`,
                    },
                    {
                      id: 'relationships' as const,
                      label: `Relationships (${assembled.relationships.length})`,
                    },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setReviewTab(t.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                        reviewTab === t.id
                          ? 'bg-stone-800 text-white'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Tab 1: Clues by Round */}
                {reviewTab === 'clues' && (
                  <div className="space-y-4">
                    {Array.from({ length: totalRounds }, (_, i) => i + 1).map((rNum) => {
                      const roundClues = assembled.clues.filter(
                        (c) => c.roundNumber === rNum
                      );
                      return (
                        <div
                          key={rNum}
                          className="rounded-xl bg-stone-900/60 border border-stone-800 p-4 space-y-2.5"
                        >
                          <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                            Round {rNum} ({roundClues.length} Clues)
                          </div>
                          {roundClues.map((rc) => (
                            <div
                              key={rc.id}
                              className="rounded-lg bg-stone-950/70 border border-stone-800/80 p-3 text-xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white">
                                  {rc.title}{' '}
                                  <span className="text-stone-400 font-normal">({rc.format})</span>
                                </span>
                                <span
                                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                                    rc.isRedHerring
                                      ? 'bg-purple-500/20 text-purple-200'
                                      : 'bg-emerald-500/20 text-emerald-200'
                                  }`}
                                >
                                  {rc.isRedHerring ? 'Red Herring' : 'Core Clue'}
                                </span>
                              </div>
                              <p className="text-stone-300">{rc.description}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Characters */}
                {reviewTab === 'characters' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assembled.characters.map((ch) => (
                      <div
                        key={ch.id}
                        className="rounded-xl bg-stone-900/60 border border-stone-800 p-4 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{ch.roleTitle}</span>
                          <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-stone-800 text-amber-300">
                            {ch.plotRole} • {ch.defaultGender}
                          </span>
                        </div>
                        <p className="text-stone-300 leading-relaxed">{ch.bio}</p>
                        <div className="text-stone-400 pt-1">
                          <strong>Outfit:</strong> {ch.outfitAdvice}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tab 3: Relationships */}
                {reviewTab === 'relationships' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {assembled.relationships.map((rel, i) => (
                      <div
                        key={i}
                        className="rounded-xl bg-stone-900/60 border border-stone-800 p-3.5 text-xs space-y-1"
                      >
                        <div className="font-bold text-amber-300">
                          {rel.roleA} ↔ {rel.roleB}
                        </div>
                        <p className="text-stone-300">{rel.notes}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default BaseArchitectClient;

