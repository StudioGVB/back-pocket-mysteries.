'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArchitectSpiceLevel,
  ArchitectComplexity,
  CharacterPlotRole,
  BlueprintCharacterInput,
  BlueprintBeatInput,
  MysteryBlueprintInput,
  SuggestedClueCandidate,
  SuggestedRedHerringSubplot,
  AssembledFullMysteryBase,
  PitchedPlotHookOption,
  parseRawNotesIntoBlueprintAction,
  suggestCoreCluesForBlueprintAction,
  suggestRedHerringsAndBackstoriesAction,
  assembleAndProofreadFullBaseAction,
  transferBlueprintToDraftMysteryBaseAction,
  pitchThreePlotHooksAction,
  autoFixAssembledBaseIssuesAction,
  saveArchitectCloudWorkspaceAction,
  loadArchitectCloudWorkspaceAction,
  listDraftMysteryBasesForArchitectAction,
  loadExistingDraftIntoArchitectAction,
} from '@/app/actions/base-architect';
import { ClueFormat } from '@/utils/clue-format';
import {
  recommendDifficultyFromPlotAndClues,
  evaluateMurderTrailSolvability,
} from '@/utils/architect-difficulty-recommender';
import {
  hydrateTextWithCharacters,
  adaptRoleTitleForGuestGender,
  adaptOutfitForGuestGender,
} from '@/utils/hydration';

const SPICE_TIER_CARDS: {
  level: ArchitectSpiceLevel;
  badge: string;
  scoreRange: string;
  tagline: string;
  clueFlavor: string;
}[] = [
  {
    level: 'Clean',
    badge: '✨ Clean (SFW & Family)',
    scoreRange: '1.0 – 3.4 / 10',
    tagline: 'High-stakes murder, poison & financial blackmail',
    clueFlavor: '0 romantic affairs • 0 swearing/profanity in chats or audio',
  },
  {
    level: 'Mild',
    badge: '🌶️ Mild (Romantic Drama)',
    scoreRange: '3.5 – 5.5 / 10',
    tagline: 'Secret love affairs, jealous exes & betrayal',
    clueFlavor: 'Romantic scandal allowed • 100% clean PG-13 dialogue (0 cussing)',
  },
  {
    level: 'Spicy',
    badge: '🌶️🌶️ Spicy (Scandalous)',
    scoreRange: '5.6 – 8.2 / 10',
    tagline: 'Cussing, drink-throwing catfights & leaked tapes',
    clueFlavor: 'Sharp swearing (bitch, shit, wtf), boudoir blackmail & sugar daddies',
  },
  {
    level: 'Filthy',
    badge: '🔥🔥🔥 Filthy (18+ After-Dark)',
    scoreRange: '8.3 – 10.0 / 10',
    tagline: 'Unfiltered F-bombs, VIP debauchery & wild secrets',
    clueFlavor: 'Raw 18+ dialogue, party powder scandals & ruthless extortion',
  },
];

interface WorkspaceSlotState {
  slotId: string;
  slotLabel: string;
  step: 1 | 2 | 3 | 4 | 5;
  rawTemplateNotes: string;
  blueprint: MysteryBlueprintInput;
  coreClues: SuggestedClueCandidate[];
  subplots: SuggestedRedHerringSubplot[];
  assembled: AssembledFullMysteryBase | null;
  transferredMysteryId: string | null;
}

const DEFAULT_COLORS = [
  'Crimson Red',
  'Emerald Green',
  'Royal Purple',
  'Sapphire Blue',
  'Amber Gold',
  'Obsidian Black',
];

function createDefaultBlueprint(
  id: string,
  title: string,
  spiceLevel: ArchitectSpiceLevel,
  complexity: ArchitectComplexity
): MysteryBlueprintInput {
  const hasAssistant = complexity === 'hard';
  return {
    id,
    title,
    theme: '',
    settingDescription: '',
    spiceLevel,
    complexity,
    murderTimeWindow: '8:19 PM',
    murderWeaponAndMethod: '',
    killerHowAndWhySummary: '',
    insideJokesOrProps: '',
    characters: [
      {
        id: 'char-1',
        roleTitle: 'The Host',
        defaultGender: 'male',
        plotRole: 'victim',
        color: DEFAULT_COLORS[0],
        conceptNotes: '',
        motiveOrSecret: 'The victim found dead at the peak of the party.',
        outfitNotes: '',
      },
      {
        id: 'char-2',
        roleTitle: 'The Rival',
        defaultGender: 'female',
        plotRole: 'killer',
        color: DEFAULT_COLORS[1],
        conceptNotes: '',
        motiveOrSecret: '',
        outfitNotes: '',
      },
      {
        id: 'char-3',
        roleTitle: 'The Confidant',
        defaultGender: 'male',
        plotRole: hasAssistant ? 'assistant' : 'innocent',
        color: DEFAULT_COLORS[2],
        conceptNotes: '',
        motiveOrSecret: '',
        outfitNotes: '',
      },
      {
        id: 'char-4',
        roleTitle: 'The Heiress',
        defaultGender: 'female',
        plotRole: 'innocent',
        color: DEFAULT_COLORS[3],
        conceptNotes: '',
        motiveOrSecret: '',
        outfitNotes: '',
      },
      {
        id: 'char-5',
        roleTitle: 'The Insider',
        defaultGender: 'male',
        plotRole: 'innocent',
        color: DEFAULT_COLORS[4],
        conceptNotes: '',
        motiveOrSecret: '',
        outfitNotes: '',
      },
      {
        id: 'char-6',
        roleTitle: 'The Wildcard',
        defaultGender: 'female',
        plotRole: 'innocent',
        color: DEFAULT_COLORS[5],
        conceptNotes: '',
        motiveOrSecret: '',
        outfitNotes: '',
      },
    ],
    beats: [
      {
        beatNumber: 1,
        title: 'Arrival & Cocktails Tension',
        timeWindow: '7:30 PM',
        phase: 'pre_crime',
        description: '',
      },
      {
        beatNumber: 2,
        title: 'Heated Confrontation Behind Closed Doors',
        timeWindow: '8:00 PM',
        phase: 'pre_crime',
        description: '',
      },
      {
        beatNumber: 3,
        title: 'The Fatal Window (Murder Committed)',
        timeWindow: '8:19 PM',
        phase: 'crime',
        description: '',
      },
      {
        beatNumber: 4,
        title: 'Discovery of the Body & Lockdown',
        timeWindow: '8:30 PM',
        phase: 'investigation',
        description: '',
      },
    ],
  };
}

const INITIAL_SLOTS: WorkspaceSlotState[] = [
  {
    slotId: 'slot-1',
    slotLabel: 'Mystery #1 (Clean • Easy)',
    step: 1,
    rawTemplateNotes: '',
    blueprint: createDefaultBlueprint('bp-slot-1', 'New Clean Mystery #1', 'Clean', 'easy'),
    coreClues: [],
    subplots: [],
    assembled: null,
    transferredMysteryId: null,
  },
  {
    slotId: 'slot-2',
    slotLabel: 'Mystery #2 (Spicy • Medium)',
    step: 1,
    rawTemplateNotes: '',
    blueprint: createDefaultBlueprint('bp-slot-2', 'New Spicy Mystery #2', 'Spicy', 'medium'),
    coreClues: [],
    subplots: [],
    assembled: null,
    transferredMysteryId: null,
  },
  {
    slotId: 'slot-3',
    slotLabel: 'Mystery #3 (Filthy • Hard)',
    step: 1,
    rawTemplateNotes: '',
    blueprint: createDefaultBlueprint('bp-slot-3', 'New Filthy Mystery #3', 'Filthy', 'hard'),
    coreClues: [],
    subplots: [],
    assembled: null,
    transferredMysteryId: null,
  },
];

const STORAGE_KEY = 'bpm_og_base_architect_slots_v1';

const CLUE_FORMATS: { value: ClueFormat; label: string }[] = [
  { value: 'chat', label: '💬 Text / Chat Log' },
  { value: 'cctv', label: '📹 CCTV / Security Still' },
  { value: 'audio', label: '🎙️ Audio / Voicemail' },
  { value: 'receipt', label: '🧾 Receipt / Bar Tab' },
  { value: 'document', label: '📄 Official Document' },
  { value: 'handwritten_note', label: '✍️ Handwritten Note' },
  { value: 'physical_prop', label: '🔍 Physical / Forensic Prop' },
];

type GenderPreviewMode = 'raw' | '3m3f' | '6f' | '6m';

const SAMPLE_FEMALE_NAMES = ['Olivia', 'Chloe', 'Sophia', 'Maya', 'Emma', 'Zara'];
const SAMPLE_MALE_NAMES = ['James', 'Marcus', 'Liam', 'Noah', 'Ethan', 'Lucas'];

export function BaseArchitectClient({ locale }: { locale: string }) {
  const [slots, setSlots] = useState<WorkspaceSlotState[]>(INITIAL_SLOTS);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSyncedAt, setCloudSyncedAt] = useState<string | null>(null);

  // Loading & UI feedback states
  const [isParsingNotes, setIsParsingNotes] = useState(false);
  const [isPitchingHooks, setIsPitchingHooks] = useState(false);
  const [pitchedHooks, setPitchedHooks] = useState<PitchedPlotHookOption[]>([]);
  const [showPitchDrawer, setShowPitchDrawer] = useState(false);

  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [clueSteerDirection, setClueSteerDirection] = useState('');

  const [isGeneratingSubplots, setIsGeneratingSubplots] = useState(false);
  const [subplotSteerDirection, setSubplotSteerDirection] = useState('');

  const [isAssembling, setIsAssembling] = useState(false);
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Load Existing Draft Modal / Popover state
  const [showLoadDraftMenu, setShowLoadDraftMenu] = useState(false);
  const [draftBasesList, setDraftBasesList] = useState<
    { id: string; title: string; theme: string; spiceLevel: string; complexity: string; status: string }[]
  >([]);
  const [isLoadingDraftList, setIsLoadingDraftList] = useState(false);
  const [isLoadingSingleDraft, setIsLoadingSingleDraft] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [step4Tab, setStep4Tab] = useState<'clues' | 'characters' | 'relationships'>('clues');
  const [genderPreviewMode, setGenderPreviewMode] = useState<GenderPreviewMode>('raw');
  const [showRawPasteBox, setShowRawPasteBox] = useState<boolean>(false);

  // Load from localStorage first, or fallback to cloud workspace
  useEffect(() => {
    let loadedLocal = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setSlots(parsed);
          loadedLocal = true;
        }
      }
    } catch (e) {
      console.warn('Could not load saved OG Base Builder slots:', e);
    }

    if (!loadedLocal) {
      loadArchitectCloudWorkspaceAction()
        .then((res) => {
          if (res.success && Array.isArray(res.slots) && res.slots.length === 3) {
            setSlots(res.slots);
            if (res.savedAt) setCloudSyncedAt(res.savedAt);
          }
        })
        .catch(() => {});
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage immediately & debounce cloud sync
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch (e) {
      console.warn('Could not persist OG Base Builder slots:', e);
    }

    const timer = setTimeout(() => {
      saveArchitectCloudWorkspaceAction({ slotsJson: JSON.stringify(slots) })
        .then((res) => {
          if (res.success && res.savedAt) {
            setCloudSyncedAt(res.savedAt);
          }
        })
        .catch(() => {});
    }, 1500);

    return () => clearTimeout(timer);
  }, [slots, hydrated]);

  const currentSlot = slots[activeSlotIndex] || slots[0];
  const { blueprint, coreClues, subplots, assembled } = currentSlot;

  const activeTierRounds: 3 | 4 | 5 =
    blueprint.characters.length <= 6 ? 3 : blueprint.characters.length <= 10 ? 4 : 5;
  const activeTierName =
    blueprint.characters.length <= 6
      ? 'Basic Package (6 Characters • 3 Rounds)'
      : blueprint.characters.length <= 10
      ? 'Premium Package (10 Characters • 4 Rounds)'
      : 'Grand Package (16 Characters • 5 Rounds)';
  const activeTierRoundList = Array.from(
    { length: activeTierRounds },
    (_, idx) => (idx + 1) as 1 | 2 | 3 | 4 | 5
  );

  const updateCurrentSlot = (updater: (prev: WorkspaceSlotState) => WorkspaceSlotState) => {
    setSlots((prevSlots) =>
      prevSlots.map((s, idx) => (idx === activeSlotIndex ? updater(s) : s))
    );
  };

  const handleSetPackageTierCharCount = (targetCount: 6 | 10 | 16) => {
    const extraRolesPool = [
      'The Insider',
      'The Wildcard',
      'The Socialite',
      'The Accountant',
      'The Protege',
      'The Journalist',
      'The Fixer',
      'The Benefactor',
      'ThePublicist',
      'TheBodyguard',
      'The Heiress',
      'The Lawyer',
    ];
    updateCurrentSlot((prev) => {
      const existing = prev.blueprint.characters;
      let nextChars = [...existing];
      if (nextChars.length > targetCount) {
        nextChars = nextChars.slice(0, targetCount);
      } else {
        while (nextChars.length < targetCount) {
          const i = nextChars.length;
          const colorOpt = DEFAULT_COLORS[i % DEFAULT_COLORS.length];
          const fallbackTitle = extraRolesPool[i - 4] || `The Suspect ${i + 1}`;
          nextChars.push({
            id: `char-${i + 1}`,
            roleTitle: fallbackTitle.replace(/([a-z])([A-Z])/g, '$1 $2'),
            defaultGender: i % 2 === 0 ? 'female' : 'male',
            plotRole: 'innocent',
            color: colorOpt,
            conceptNotes: '',
            motiveOrSecret: '',
            outfitNotes: '',
          });
        }
      }
      const nextRounds = targetCount <= 6 ? 3 : targetCount <= 10 ? 4 : 5;
      setStatusToast(
        `📦 Switched Slot #${activeSlotIndex + 1} to ${
          targetCount === 6 ? 'Basic' : targetCount === 10 ? 'Premium' : 'Grand'
        } Tier (${targetCount} Characters • ${nextRounds} Investigation Rounds).`
      );
      return {
        ...prev,
        blueprint: {
          ...prev.blueprint,
          characters: nextChars,
        },
      };
    });
  };

  const updateBlueprint = (patch: Partial<MysteryBlueprintInput>) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      blueprint: {
        ...prev.blueprint,
        ...patch,
      },
    }));
  };

  const updateCharacter = (index: number, patch: Partial<BlueprintCharacterInput>) => {
    updateCurrentSlot((prev) => {
      const nextChars = prev.blueprint.characters.map((c, idx) =>
        idx === index ? { ...c, ...patch } : c
      );
      return {
        ...prev,
        blueprint: {
          ...prev.blueprint,
          characters: nextChars,
        },
      };
    });
  };

  const updateBeat = (index: number, patch: Partial<BlueprintBeatInput>) => {
    updateCurrentSlot((prev) => {
      const nextBeats = prev.blueprint.beats.map((b, idx) =>
        idx === index ? { ...b, ...patch } : b
      );
      return {
        ...prev,
        blueprint: {
          ...prev.blueprint,
          beats: nextBeats,
        },
      };
    });
  };

  const addBeat = () => {
    updateCurrentSlot((prev) => ({
      ...prev,
      blueprint: {
        ...prev.blueprint,
        beats: [
          ...prev.blueprint.beats,
          {
            beatNumber: prev.blueprint.beats.length + 1,
            title: 'New Timeline Beat',
            timeWindow: '8:25 PM',
            phase: 'investigation',
            description: '',
          },
        ],
      },
    }));
  };

  const removeBeat = (index: number) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      blueprint: {
        ...prev.blueprint,
        beats: prev.blueprint.beats
          .filter((_, idx) => idx !== index)
          .map((b, idx) => ({ ...b, beatNumber: idx + 1 })),
      },
    }));
  };

  const handleTemplateFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      updateCurrentSlot((prev) => ({ ...prev, rawTemplateNotes: text }));
      setShowRawPasteBox(true);
      setStatusToast(
        `Loaded "${file.name}" (${text.length.toLocaleString()} chars). Click "Auto-Fill Blueprint from Notes" to parse!`
      );
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to read template file.');
    }
  };

  const handleDownloadBlankTemplate = () => {
    const templateMd = `# OG MYSTERY BASE TEMPLATE (6 PLAYERS)

- **Title:** ${blueprint.title}
- **Theme:** ${blueprint.theme || 'e.g. Alpine Ski Chalet / VIP Yacht / Manor House'}
- **Spice Level:** ${blueprint.spiceLevel} (Clean | Mild | Spicy | Filthy)
- **Setting & Overview:**
${blueprint.settingDescription || 'Describe where the party takes place, what the occasion is, and why tensions are high.'}

## THE CRIME
- **Murder Time Window:** ${blueprint.murderTimeWindow}
- **Murder Weapon & Method:** ${blueprint.murderWeaponAndMethod || 'How the victim was killed and what physical/forensic trace was left behind.'}
- **True Killer (& Accomplice if Hard) — How & Why:**
${blueprint.killerHowAndWhySummary || 'Explain who committed the murder, their exact motive, and how they executed it.'}
- **Inside Jokes / Signature Props:** ${blueprint.insideJokesOrProps || 'Optional props or running gags.'}

## 6-PLAYER CHARACTER CAST
1. **{{The Host}}** (VICTIM • Default Gender: male)
   - *Who they are & dynamics:* 
   - *Why people wanted them dead:* 
   - *Outfit vibe:* 

2. **{{The Rival}}** (KILLER • Default Gender: female)
   - *Who they are & dynamics:* 
   - *Motive & secret:* 
   - *Outfit vibe:* 

3. **{{The Confidant}}** (${blueprint.complexity === 'hard' ? 'ASSISTANT / ACCOMPLICE' : 'INNOCENT SUSPECT'} • Default Gender: male)
   - *Who they are & dynamics:* 
   - *Motive & secret:* 
   - *Outfit vibe:* 

4. **{{The Heiress}}** (INNOCENT SUSPECT • Default Gender: female)
   - *Who they are & dynamics:* 
   - *Motive & secret:* 
   - *Outfit vibe:* 

5. **{{The Insider}}** (INNOCENT SUSPECT • Default Gender: male)
   - *Who they are & dynamics:* 
   - *Motive & secret:* 
   - *Outfit vibe:* 

6. **{{The Wildcard}}** (INNOCENT SUSPECT • Default Gender: female)
   - *Who they are & dynamics:* 
   - *Motive & secret:* 
   - *Outfit vibe:* 

## CORE TIMELINE BEATS
- **7:30 PM (Pre-Crime):** 
- **8:00 PM (Pre-Crime Escalation):** 
- **${blueprint.murderTimeWindow} (The Murder):** 
- **8:30 PM (Discovery & Investigation):** 
`;
    const blob = new Blob([templateMd], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${blueprint.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mystery'}-template.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // UPGRADE 5B: Open Load Existing Draft Base dropdown
  const handleToggleLoadDraftMenu = async () => {
    const nextOpen = !showLoadDraftMenu;
    setShowLoadDraftMenu(nextOpen);
    if (nextOpen && draftBasesList.length === 0) {
      setIsLoadingDraftList(true);
      try {
        const res = await listDraftMysteryBasesForArchitectAction();
        if (res.success && res.drafts) {
          setDraftBasesList(res.drafts);
        }
      } finally {
        setIsLoadingDraftList(false);
      }
    }
  };

  const handleLoadExistingDraft = async (mysteryId: string) => {
    setIsLoadingSingleDraft(true);
    setErrorMessage(null);
    try {
      const res = await loadExistingDraftIntoArchitectAction({ mysteryId });
      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Could not load draft mystery.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 1,
          blueprint: res.blueprint!,
          coreClues: res.coreClues || [],
          subplots: res.subplots || [],
          assembled: null,
          transferredMysteryId: mysteryId,
        }));
        setShowLoadDraftMenu(false);
        setStatusToast(
          `📂 Loaded "${res.blueprint.title}" into Slot #${activeSlotIndex + 1} (${
            res.coreClues?.length || 0
          } core clues, ${res.subplots?.[0]?.decoyClues.length || 0} decoy clues).`
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading draft mystery.');
    } finally {
      setIsLoadingSingleDraft(false);
    }
  };

  // UPGRADE 4: Pitch 3 Plot Hooks for the Selected Theme + Spice Level
  const handlePitchThreePlotHooks = async () => {
    setErrorMessage(null);
    setShowPitchDrawer(true);
    setIsPitchingHooks(true);
    try {
      const res = await pitchThreePlotHooksAction({
        themeOrIdea: blueprint.theme || blueprint.title || 'Luxury Dinner Party',
        spiceLevel: blueprint.spiceLevel,
      });
      if (!res.success || !res.options) {
        setErrorMessage(res.error || 'Failed to pitch plot hooks.');
      } else {
        setPitchedHooks(res.options);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error pitching plot hooks.');
    } finally {
      setIsPitchingHooks(false);
    }
  };

  const handleApplyPitchedHook = (hook: PitchedPlotHookOption) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      blueprint: {
        ...prev.blueprint,
        title: hook.title,
        theme: hook.theme,
        complexity: hook.targetDifficulty,
        settingDescription: hook.settingDescription,
        murderTimeWindow: hook.murderTimeWindow,
        murderWeaponAndMethod: hook.murderWeaponAndMethod,
        killerHowAndWhySummary: hook.killerHowAndWhySummary,
        insideJokesOrProps: hook.insideJokesOrProps,
        characters: hook.characters.length === 6 ? hook.characters : prev.blueprint.characters,
        beats: hook.beats.length > 0 ? hook.beats : prev.blueprint.beats,
      },
    }));
    setShowPitchDrawer(false);
    setStatusToast(`✨ Applied "${hook.title}" (${hook.targetDifficulty.toUpperCase()} plot hook)!`);
  };

  // STEP 1: Parse Raw Notes into Structured Blueprint
  const handleAutoParseRawNotes = async () => {
    if (!currentSlot.rawTemplateNotes.trim()) {
      setErrorMessage('Paste your template notes or upload a file first.');
      return;
    }
    setErrorMessage(null);
    setIsParsingNotes(true);
    try {
      const res = await parseRawNotesIntoBlueprintAction({
        rawNotes: currentSlot.rawTemplateNotes,
        currentBlueprint: blueprint,
      });
      if (!res.success || !res.blueprint) {
        setErrorMessage(res.error || 'Could not parse template notes.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          blueprint: res.blueprint!,
        }));
        setShowRawPasteBox(false);
        setStatusToast('✨ Blueprint auto-filled from your template notes!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error parsing notes.');
    } finally {
      setIsParsingNotes(false);
    }
  };

  // STEP 2: Generate or Refresh Core Murder Clues
  const handleGenerateCoreClues = async (
    isMoreOptions: boolean = false,
    overrideDirection?: string
  ) => {
    setErrorMessage(null);
    if (!blueprint.title.trim() || !blueprint.killerHowAndWhySummary.trim()) {
      setErrorMessage(
        'Please fill in the Mystery Title, Murder Weapon/Method, and Killer How & Why in Step 1 before generating clues.'
      );
      return;
    }
    setIsGeneratingClues(true);
    try {
      const directionToUse =
        overrideDirection !== undefined ? overrideDirection : clueSteerDirection;
      const res = await suggestCoreCluesForBlueprintAction({
        blueprint,
        existingClues: isMoreOptions ? coreClues : [],
        customDirection: directionToUse,
      });
      if (!res.success || !res.clues) {
        setErrorMessage(res.error || 'Failed to generate core clues.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 2,
          coreClues: res.clues!,
        }));
        setClueSteerDirection('');
        setStatusToast(
          isMoreOptions
            ? '✨ Replaced rejected clues with fresh Core Clue options!'
            : '✨ Generated Core Murder Clue candidates! Tick ✓ Yes or ✕ No on each clue.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating core clues.');
    } finally {
      setIsGeneratingClues(false);
    }
  };

  const setCoreClueDecision = (clueId: string, decision: 'yes' | 'no') => {
    updateCurrentSlot((prev) => ({
      ...prev,
      coreClues: prev.coreClues.map((c) => (c.id === clueId ? { ...c, decision } : c)),
    }));
  };

  const updateCoreClueField = (clueId: string, patch: Partial<SuggestedClueCandidate>) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      coreClues: prev.coreClues.map((c) => (c.id === clueId ? { ...c, ...patch } : c)),
    }));
  };

  const handleAddCustomCoreClue = () => {
    const newClue: SuggestedClueCandidate = {
      id: `custom-core-${Date.now()}`,
      title: 'Custom Core Murder Clue',
      format: 'physical_prop',
      roundNumber: 2,
      timestampLabel: blueprint.murderTimeWindow || '8:19 PM',
      description: 'Write the in-world clue text here using {{Role}} tokens...',
      generationPrompt:
        'Close-up forensic macro photograph of evidence on a dark surface, cinematic lighting, no text',
      pointsTo: 'Explains how this clue points toward the true killer.',
      involvedRoles: [],
      isRedHerring: false,
      decision: 'yes',
    };
    updateCurrentSlot((prev) => ({
      ...prev,
      coreClues: [newClue, ...prev.coreClues],
    }));
  };

  // STEP 3: Generate or Refresh Red-Herring Subplots & Backstories
  const handleGenerateRedHerrings = async (
    isMoreOptions: boolean = false,
    overrideDirection?: string
  ) => {
    setErrorMessage(null);
    const approvedCore = coreClues.filter((c) => c.decision === 'yes');
    if (approvedCore.length < 3) {
      setErrorMessage(
        'Please tick "✓ Yes" on at least 3 Core Murder Clues before generating Red-Herring Subplots.'
      );
      return;
    }
    setIsGeneratingSubplots(true);
    try {
      const directionToUse =
        overrideDirection !== undefined ? overrideDirection : subplotSteerDirection;
      const res = await suggestRedHerringsAndBackstoriesAction({
        blueprint,
        approvedCoreClues: approvedCore,
        existingSubplots: isMoreOptions ? subplots : [],
        customDirection: directionToUse,
      });
      if (!res.success || !res.subplots) {
        setErrorMessage(res.error || 'Failed to generate red-herring subplots.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 3,
          subplots: res.subplots!,
        }));
        setSubplotSteerDirection('');
        setStatusToast(
          isMoreOptions
            ? '✨ Generated fresh Red-Herring Subplots & Backstories!'
            : '✨ Generated Red-Herring Subplots & Innocent Backstories! Tick ✓ Yes or ✕ No.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error generating red-herring subplots.');
    } finally {
      setIsGeneratingSubplots(false);
    }
  };

  const setSubplotDecision = (subplotId: string, decision: 'yes' | 'no') => {
    updateCurrentSlot((prev) => ({
      ...prev,
      subplots: prev.subplots.map((s) => (s.id === subplotId ? { ...s, decision } : s)),
    }));
  };

  const updateSubplotField = (
    subplotId: string,
    patch: Partial<SuggestedRedHerringSubplot>
  ) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      subplots: prev.subplots.map((s) => (s.id === subplotId ? { ...s, ...patch } : s)),
    }));
  };

  const updateDecoyClueInSubplot = (
    subplotId: string,
    clueId: string,
    patch: Partial<SuggestedClueCandidate>
  ) => {
    updateCurrentSlot((prev) => ({
      ...prev,
      subplots: prev.subplots.map((s) =>
        s.id === subplotId
          ? {
              ...s,
              decoyClues: s.decoyClues.map((c) =>
                c.id === clueId ? { ...c, ...patch } : c
              ),
            }
          : s
      ),
    }));
  };

  // STEP 4: Assemble Full Gender-Flex Base, Auto-Cast Rounds 1-3 & Run 7-Check Proofreader
  const handleAssembleFullBase = async () => {
    setErrorMessage(null);
    const approvedCore = coreClues.filter((c) => c.decision === 'yes');
    const approvedSubs = subplots.filter((s) => s.decision === 'yes');
    if (approvedCore.length === 0) {
      setErrorMessage('Please approve at least 3 Core Clues in Step 2 first.');
      return;
    }
    if (approvedSubs.length === 0) {
      setErrorMessage('Please approve at least 1 Red-Herring Subplot in Step 3 first.');
      return;
    }
    setIsAssembling(true);
    try {
      const res = await assembleAndProofreadFullBaseAction({
        blueprint,
        approvedCoreClues: approvedCore,
        approvedSubplots: approvedSubs,
      });
      if (!res.success || !res.assembled) {
        setErrorMessage(res.error || 'Failed to assemble full mystery base.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 4,
          assembled: res.assembled!,
        }));
        setStatusToast(
          '✨ Full Mystery Base assembled, rounds auto-cast, and 7-Check Automated Proofreader complete!'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error assembling mystery base.');
    } finally {
      setIsAssembling(false);
    }
  };

  // UPGRADE 3: 1-Click Auto-Fix All Proofreader Warnings
  const handleAutoFixAssembledIssues = async () => {
    if (!assembled) return;
    setIsAutoFixing(true);
    setErrorMessage(null);
    try {
      const res = await autoFixAssembledBaseIssuesAction({ assembled });
      if (!res.success || !res.assembled) {
        setErrorMessage(res.error || 'Could not auto-fix proofreader issues.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          assembled: res.assembled!,
        }));
        setStatusToast(`🛠️ Auto-Fixed: ${(res.fixesApplied || []).join(' • ')}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error running auto-fixer.');
    } finally {
      setIsAutoFixing(false);
    }
  };

  // STEP 5: Transfer to Mystery Bases as Draft
  const handleTransferToDraftBases = async () => {
    if (!assembled) return;
    setErrorMessage(null);
    setIsTransferring(true);
    try {
      const res = await transferBlueprintToDraftMysteryBaseAction({
        assembled,
      });
      if (!res.success || !res.mysteryId) {
        setErrorMessage(res.error || 'Failed to transfer mystery to Drafts.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 5,
          transferredMysteryId: res.mysteryId!,
        }));
        setStatusToast('🎉 Transferred to Mystery Bases as a Draft!');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error transferring to Mystery Bases.');
    } finally {
      setIsTransferring(false);
    }
  };

  const approvedCoreCount = coreClues.filter((c) => c.decision === 'yes').length;
  const rejectedCoreCount = coreClues.filter((c) => c.decision === 'no').length;
  const approvedSubplotsCount = subplots.filter((s) => s.decision === 'yes').length;
  const approvedDecoyCluesCount = subplots
    .filter((s) => s.decision === 'yes')
    .reduce((acc, s) => acc + s.decoyClues.length, 0);

  const victimCount = blueprint.characters.filter((c) => c.plotRole === 'victim').length;
  const killerCount = blueprint.characters.filter((c) => c.plotRole === 'killer').length;
  const assistantCount = blueprint.characters.filter((c) => c.plotRole === 'assistant').length;

  // Live 5-Factor Difficulty Recommender based on Plot, Characters, Timeline Beats, Core Clues & Red Herrings
  const difficultyRec = useMemo(
    () =>
      recommendDifficultyFromPlotAndClues({
        blueprint,
        coreClues,
        subplots,
      }),
    [blueprint, coreClues, subplots]
  );

  // Live 4-Pillar Solvability & 6-Suspect Spotlight Report
  const solvabilityReport = useMemo(
    () =>
      evaluateMurderTrailSolvability({
        blueprint,
        coreClues,
        subplots,
      }),
    [blueprint, coreClues, subplots]
  );

  useEffect(() => {
    if (!hydrated) return;
    if (blueprint.complexity !== difficultyRec.recommendedTier) {
      updateBlueprint({ complexity: difficultyRec.recommendedTier });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyRec.recommendedTier, hydrated, activeSlotIndex]);

  // UPGRADE 3: Build mock character array for Gender-Flex Live Preview (`3m3f` | `6f` | `6m`)
  const previewMockCharacters = useMemo(() => {
    const charsSource = assembled?.characters || blueprint.characters;
    return charsSource.map((c, idx) => {
      const targetGender =
        genderPreviewMode === '6f'
          ? 'female'
          : genderPreviewMode === '6m'
            ? 'male'
            : c.defaultGender === 'female'
              ? 'female'
              : 'male';
      const guestName =
        targetGender === 'female'
          ? SAMPLE_FEMALE_NAMES[idx % SAMPLE_FEMALE_NAMES.length]
          : SAMPLE_MALE_NAMES[idx % SAMPLE_MALE_NAMES.length];
      return {
        name: c.roleTitle,
        guest_name: guestName,
        guest_gender: targetGender,
        gender: c.defaultGender,
      };
    });
  }, [assembled?.characters, blueprint.characters, genderPreviewMode]);

  const previewHydrate = (rawText: string) => {
    if (genderPreviewMode === 'raw' || !rawText) return rawText;
    return hydrateTextWithCharacters(rawText, previewMockCharacters, 'print');
  };

  const previewAdaptOutfit = (rawOutfit: string, charIdx: number) => {
    if (genderPreviewMode === 'raw' || !rawOutfit) return rawOutfit;
    const mockChar = previewMockCharacters[charIdx];
    const hydrated = hydrateTextWithCharacters(rawOutfit, previewMockCharacters, 'print');
    return adaptOutfitForGuestGender(hydrated, mockChar?.guest_gender);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & 3-Mystery Workspace Slot Switcher */}
      <div className="bg-gradient-to-br from-[#130d21] via-[#1c1330] to-[#271745] rounded-[32px] p-7 text-white shadow-xl border border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[11px] font-black uppercase tracking-widest">
                ✨ OG Base Builder • Guided Curation & Proofreading
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold">
                <span>☁️ Cloud Synced</span>
                {cloudSyncedAt && (
                  <span className="opacity-70">
                    ({new Date(cloudSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                  </span>
                )}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              OG Mystery Base Architect ({activeTierName})
            </h1>
            <p className="text-xs md:text-sm text-white/70 leading-relaxed">
              Select your <span className="text-white font-bold">Package Tier (Basic = 3 Rounds, Premium = 4 Rounds, Grand = 5 Rounds)</span> &amp;{' '}
              <span className="text-white font-bold">Spice Level</span> → tick{' '}
              <span className="text-emerald-400 font-bold">✓ Yes</span> or{' '}
              <span className="text-rose-400 font-bold">✕ No</span> on AI-suggested Core Clues &
              Red-Herring Subplots (while AI auto-recommends your{' '}
              <span className="text-amber-300 font-bold">Difficulty</span>) → auto-cast Rounds 1–{activeTierRounds}
              {' '}with live gender-flex preview → transfer to{' '}
              <span className="text-white font-bold">Mystery Bases</span> as a draft.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 relative">
            {/* Load Existing Draft Base Popover Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleLoadDraftMenu}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition flex items-center gap-1.5"
              >
                <span>📂 Load Existing Base</span>
              </button>

              {showLoadDraftMenu && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 p-3 z-50 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 px-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Load Base into Slot #{activeSlotIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLoadDraftMenu(false)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  {isLoadingDraftList ? (
                    <div className="p-4 text-center text-xs text-slate-500 font-bold">
                      ⏳ Loading mystery bases...
                    </div>
                  ) : draftBasesList.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">
                      No mystery bases found.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto space-y-1">
                      {draftBasesList.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          disabled={isLoadingSingleDraft}
                          onClick={() => handleLoadExistingDraft(d.id)}
                          className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 transition flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-black text-slate-900 truncate">
                              {d.title}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">
                              {d.spiceLevel} • {String(d.complexity).toUpperCase()} • {d.status}
                            </div>
                          </div>
                          <span className="text-[10px] font-black text-brand-pink shrink-0">
                            Load →
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleDownloadBlankTemplate}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition"
            >
              📥 Blank Template (.md)
            </button>
            <Link
              href={`/${locale}/admin/mysteries`}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white/90 transition"
            >
              Mystery Bases →
            </Link>
          </div>
        </div>

        {/* 3 Workspace Slots so user can build 3 mysteries side-by-side */}
        <div className="mt-6 pt-5 border-t border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {slots.map((slot, idx) => {
              const isActive = idx === activeSlotIndex;
              const slotApprovedClues = slot.coreClues.filter((c) => c.decision === 'yes').length;
              const slotApprovedSubs = slot.subplots.filter((s) => s.decision === 'yes').length;
              return (
                <button
                  key={slot.slotId}
                  type="button"
                  onClick={() => {
                    setActiveSlotIndex(idx);
                    setErrorMessage(null);
                    setStatusToast(null);
                  }}
                  className={`text-left p-3.5 rounded-2xl border transition-all ${
                    isActive
                      ? 'bg-white text-slate-900 border-brand-pink shadow-lg ring-2 ring-brand-pink/50'
                      : 'bg-white/5 hover:bg-white/10 text-white border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-brand-pink/15 text-brand-pink'
                          : 'bg-white/10 text-white/70'
                      }`}
                    >
                      Slot #{idx + 1} • {slot.blueprint.spiceLevel} • Auto:{' '}
                      {slot.blueprint.complexity.toUpperCase()}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        isActive ? 'text-slate-500' : 'text-white/50'
                      }`}
                    >
                      Step {slot.step}/5
                    </span>
                  </div>
                  <div className="font-black text-sm truncate">
                    {slot.blueprint.title || `Untitled Mystery #${idx + 1}`}
                  </div>
                  <div
                    className={`text-xs mt-1 flex items-center gap-2.5 ${
                      isActive ? 'text-slate-500' : 'text-white/60'
                    }`}
                  >
                    <span>✓ {slotApprovedClues} Clues</span>
                    <span>•</span>
                    <span>✓ {slotApprovedSubs} Red Herrings</span>
                    {slot.transferredMysteryId && (
                      <span className="text-emerald-500 font-bold">• Draft Saved</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5-Step Progress Stepper Bar */}
      <div className="bg-white rounded-[22px] p-3 border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {[
            {
              num: 1,
              title: '1. Core Blueprint',
              subtitle: `${blueprint.spiceLevel} • Auto: ${difficultyRec.recommendedTier.toUpperCase()}`,
            },
            {
              num: 2,
              title: '2. Core Murder Clues',
              subtitle: `Tick ✓ Yes / ✕ No (${approvedCoreCount} kept)`,
            },
            {
              num: 3,
              title: '3. Red Herrings & Backstories',
              subtitle: `Tick ✓ Yes / ✕ No (${approvedSubplotsCount} kept)`,
            },
            {
              num: 4,
              title: '4. Auto-Cast & Proofreader',
              subtitle: 'Rounds 1–3 + Gender-Flex QA',
            },
            {
              num: 5,
              title: '5. Transfer to Drafts',
              subtitle: 'Send to Mystery Bases',
            },
          ].map((item) => {
            const isCurrent = currentSlot.step === item.num;
            const isDone = currentSlot.step > item.num;
            return (
              <button
                key={item.num}
                type="button"
                onClick={() =>
                  updateCurrentSlot((prev) => ({
                    ...prev,
                    step: item.num as 1 | 2 | 3 | 4 | 5,
                  }))
                }
                className={`p-3 rounded-xl text-left transition border ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : isDone
                      ? 'bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
                      : 'bg-slate-50 text-slate-600 border-slate-200/60 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {item.title}
                  </span>
                  {isDone && (
                    <span className="text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px] font-black">
                      ✓
                    </span>
                  )}
                </div>
                <div
                  className={`text-[11px] mt-0.5 truncate ${
                    isCurrent ? 'text-white/75' : 'text-slate-500'
                  }`}
                >
                  {item.subtitle}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status Toast & Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-sm font-bold flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs font-black uppercase tracking-wider text-rose-600 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {statusToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-bold flex items-center justify-between gap-4">
          <span>{statusToast}</span>
          <button
            type="button"
            onClick={() => setStatusToast(null)}
            className="text-xs font-black uppercase tracking-wider text-emerald-700 hover:underline"
          >
            OK
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 1: CORE BLUEPRINT (TEMPLATE UPLOAD / PASTE + STRUCTURED FORM)    */}
      {/* ===================================================================== */}
      {currentSlot.step === 1 && (
        <div className="space-y-6">
          {/* Compact Top Action Bar: Template Upload / Paste OR 1-Click AI Plot Pitch */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Fast-Track Setup
                </span>
                <h2 className="text-base font-black text-slate-900">
                  Import Your Template Notes or Pitch 3 AI Plot Hooks
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition">
                  <span>📂 Upload .md / .txt</span>
                  <input
                    type="file"
                    accept=".md,.txt,.json"
                    onChange={handleTemplateFileUpload}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowRawPasteBox((prev) => !prev)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-black uppercase tracking-wider transition ${
                    showRawPasteBox
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {showRawPasteBox ? '✕ Close Paste Box' : '📋 Paste Raw Template Notes'}
                </button>

                <button
                  type="button"
                  disabled={isPitchingHooks}
                  onClick={handlePitchThreePlotHooks}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 text-xs font-black uppercase tracking-wider transition"
                >
                  {isPitchingHooks
                    ? '⏳ Pitching 3 Plots...'
                    : `🎲 Pitch 3 Plot Hooks (${blueprint.spiceLevel})`}
                </button>
              </div>
            </div>

            {/* Collapsible Raw Template Notes Paste Box */}
            {showRawPasteBox && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <textarea
                  rows={5}
                  value={currentSlot.rawTemplateNotes}
                  onChange={(e) =>
                    updateCurrentSlot((prev) => ({
                      ...prev,
                      rawTemplateNotes: e.target.value,
                    }))
                  }
                  placeholder="Paste everything from your template here (Theme, Victim, Murderer, how & why they did it, the 6 character archetypes, and timeline beats)..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-800 focus:bg-white focus:border-brand-pink focus:outline-none font-mono"
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isParsingNotes || !currentSlot.rawTemplateNotes.trim()}
                    onClick={handleAutoParseRawNotes}
                    className="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-md transition"
                  >
                    {isParsingNotes
                      ? '⏳ Parsing Your Template Notes...'
                      : '✨ Auto-Fill Blueprint Fields from Notes'}
                  </button>
                </div>
              </div>
            )}

            {/* Collapsible 3 Plot Hooks Drawer (Upgrade 4) */}
            {showPitchDrawer && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-900">
                    🎲 3 AI-Pitched Plot Hooks for {blueprint.spiceLevel} Spice (Easy, Medium & Hard)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPitchDrawer(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700"
                  >
                    Close ✕
                  </button>
                </div>
                {isPitchingHooks ? (
                  <div className="p-6 text-center text-xs font-bold text-slate-500">
                    ⏳ Designing 3 plot hooks (Easy, Medium & Hard) tailored to{' '}
                    {blueprint.spiceLevel} spice...
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pitchedHooks.map((hook) => (
                      <div
                        key={hook.id}
                        className="p-4 rounded-2xl border border-indigo-200 bg-indigo-50/30 flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-black uppercase">
                              {hook.targetDifficulty.toUpperCase()} Plot
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              Murder: {hook.murderTimeWindow}
                            </span>
                          </div>
                          <div className="text-sm font-black text-slate-900">{hook.title}</div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {hook.settingDescription}
                          </p>
                          <div className="text-[11px] text-rose-800 bg-rose-50/70 p-2 rounded-lg border border-rose-100">
                            <strong>Solution:</strong> {hook.killerHowAndWhySummary}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyPitchedHook(hook)}
                          className="w-full py-2 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-wider transition"
                        >
                          Use This Plot & 6 Cast →
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Core Setting, Spice Level Selector, Auto-Recommended Difficulty & Murder Truth */}
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                Section 1A • Select Your Spice Level & Let AI Recommend Difficulty
              </span>
              <h2 className="text-xl font-black text-slate-900">
                Core Setting, Spice Level & The Murder Truth
              </h2>
            </div>

            {/* 1. Prominent 4-Tier Spice Level Selector (Drives Clue & Subplot Generation) */}
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-800">
                  1. Select Your Target Spice Level (All Clues & Red Herrings Are Tailored to This) *
                </label>
                <span className="text-xs font-bold text-brand-pink">
                  Active Spice: {blueprint.spiceLevel}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SPICE_TIER_CARDS.map((card) => {
                  const isSelected = blueprint.spiceLevel === card.level;
                  return (
                    <button
                      key={card.level}
                      type="button"
                      onClick={() => updateBlueprint({ spiceLevel: card.level })}
                      className={`text-left p-4 rounded-2xl border-2 transition-all space-y-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-brand-pink shadow-md ring-2 ring-brand-pink/30'
                          : 'bg-slate-50/70 hover:bg-slate-100 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black">{card.badge}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-brand-pink text-white'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {card.scoreRange}
                        </span>
                      </div>
                      <div
                        className={`text-xs font-bold ${
                          isSelected ? 'text-white/90' : 'text-slate-700'
                        }`}
                      >
                        {card.tagline}
                      </div>
                      <div
                        className={`text-[11px] leading-snug ${
                          isSelected ? 'text-white/65' : 'text-slate-500'
                        }`}
                      >
                        {card.clueFlavor}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Compact AI Auto-Recommended Difficulty Strip (Based on Plot, Clues & Red Herrings) */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      🎯 Auto-Recommended Difficulty
                    </span>
                    <span className="text-xs font-bold text-slate-700">
                      {difficultyRec.headlineReason}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm ${
                      difficultyRec.recommendedTier === 'hard'
                        ? 'bg-rose-600 text-white'
                        : difficultyRec.recommendedTier === 'medium'
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {difficultyRec.badgeText}
                  </span>
                  {assistantCount === 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const firstInnocentIdx = blueprint.characters.findIndex(
                          (c) => c.plotRole === 'innocent'
                        );
                        if (firstInnocentIdx !== -1) {
                          updateCharacter(firstInnocentIdx, { plotRole: 'assistant' });
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 border border-indigo-200 text-indigo-900 text-[11px] font-black uppercase tracking-wider"
                    >
                      + Add Accomplice (For Hard)
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        updateCurrentSlot((prev) => ({
                          ...prev,
                          blueprint: {
                            ...prev.blueprint,
                            characters: prev.blueprint.characters.map((c) =>
                              c.plotRole === 'assistant' ? { ...c, plotRole: 'innocent' } : c
                            ),
                          },
                        }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider"
                    >
                      Remove Accomplice (Lone Killer)
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {difficultyRec.factors.map((f) => (
                  <div
                    key={f.id}
                    className="p-2.5 rounded-xl bg-white border border-slate-200/80 space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 truncate">
                        {f.name}
                      </span>
                      <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                        {f.pointsLabel}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 leading-tight">
                      {f.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Mystery Title *
                </label>
                <input
                  type="text"
                  value={blueprint.title}
                  onChange={(e) => updateBlueprint({ title: e.target.value })}
                  placeholder="e.g. Blood on the Black Diamond"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Theme & Era / Vibe *
                </label>
                <input
                  type="text"
                  value={blueprint.theme}
                  onChange={(e) => updateBlueprint({ theme: e.target.value })}
                  placeholder="e.g. Luxury Alpine Ski Chalet / Private Superyacht / Old-Money Vineyard"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-brand-pink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                  Exact Murder Time Window *
                </label>
                <input
                  type="text"
                  value={blueprint.murderTimeWindow}
                  onChange={(e) => updateBlueprint({ murderTimeWindow: e.target.value })}
                  placeholder="e.g. 8:19 PM"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-brand-pink focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Setting & Premise Overview *
              </label>
              <textarea
                rows={2}
                value={blueprint.settingDescription}
                onChange={(e) => updateBlueprint({ settingDescription: e.target.value })}
                placeholder="Where does the party take place, why has the victim gathered everyone tonight, and what makes the atmosphere electric?"
                className="w-full rounded-xl border border-slate-200 p-3.5 text-sm text-slate-800 focus:border-brand-pink focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-rose-700 mb-1.5">
                  Murder Weapon & Forensic Method *
                </label>
                <textarea
                  rows={3}
                  value={blueprint.murderWeaponAndMethod}
                  onChange={(e) => updateBlueprint({ murderWeaponAndMethod: e.target.value })}
                  placeholder="e.g. Poisoned reserve vintage decanter spiked with monkshood extract + blunt crystal decanter strike at 8:19 PM..."
                  className="w-full rounded-xl border border-rose-200 bg-rose-50/30 p-3.5 text-sm text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-rose-700 mb-1.5">
                  True Killer (& Accomplice if Hard) — How & Why They Did It *
                </label>
                <textarea
                  rows={3}
                  value={blueprint.killerHowAndWhySummary}
                  onChange={(e) => updateBlueprint({ killerHowAndWhySummary: e.target.value })}
                  placeholder="Explain which role is the Killer, their exact motive, how they executed the murder at the timestamp, and (if Hard) how the Accomplice helped tamper with the alibi/scene."
                  className="w-full rounded-xl border border-rose-200 bg-rose-50/30 p-3.5 text-sm text-slate-800 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Inside Jokes, Signature Props or Party Atmosphere Notes (Optional)
              </label>
              <input
                type="text"
                value={blueprint.insideJokesOrProps}
                onChange={(e) => updateBlueprint({ insideJokesOrProps: e.target.value })}
                placeholder="e.g. Custom wine labels, a locked vintage humidor, snowstorm power flicker at 8:18 PM..."
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:border-brand-pink focus:outline-none"
              />
            </div>
          </div>

          {/* Character Cast Builder & Package Tier / Round Selector */}
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                  Section 1B • {blueprint.characters.length}-Character Gender-Flex Cast ({activeTierRounds} Investigation Rounds)
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Package Tier, Character Roles &amp; Round Count
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-brand-pink/15 text-brand-pink">
                  🔍 {activeTierRounds} Rounds Required
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    victimCount === 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Victim: {victimCount}/1
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    killerCount === 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Killer: {killerCount}/1
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-100 text-indigo-800">
                  Accomplice: {assistantCount}
                </span>
              </div>
            </div>

            {/* 1-Click Package Tier & Round Count Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              {[
                {
                  count: 6 as const,
                  rounds: 3,
                  label: 'Basic Package',
                  sub: '6 Characters • 3 Investigation Rounds',
                },
                {
                  count: 10 as const,
                  rounds: 4,
                  label: 'Premium Package',
                  sub: '10 Characters • 4 Investigation Rounds',
                },
                {
                  count: 16 as const,
                  rounds: 5,
                  label: 'Grand Package',
                  sub: '16 Characters • 5 Investigation Rounds',
                },
              ].map((tierOpt) => {
                const isSelected =
                  (tierOpt.count === 6 && blueprint.characters.length <= 6) ||
                  (tierOpt.count === 10 &&
                    blueprint.characters.length > 6 &&
                    blueprint.characters.length <= 10) ||
                  (tierOpt.count === 16 && blueprint.characters.length > 10);
                return (
                  <button
                    key={tierOpt.count}
                    type="button"
                    onClick={() => handleSetPackageTierCharCount(tierOpt.count)}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-pink bg-white shadow-sm'
                        : 'border-slate-200 bg-white/60 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-black uppercase tracking-wider ${
                          isSelected ? 'text-brand-pink' : 'text-slate-900'
                        }`}
                      >
                        {tierOpt.label}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase">
                        {tierOpt.rounds} Rounds
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {tierOpt.sub}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {blueprint.characters.map((char, idx) => {
                const roleBadgeColor =
                  char.plotRole === 'victim'
                    ? 'bg-slate-900 text-white'
                    : char.plotRole === 'killer'
                      ? 'bg-rose-600 text-white'
                      : char.plotRole === 'assistant'
                        ? 'bg-amber-500 text-white'
                        : 'bg-indigo-50 text-indigo-800 border border-indigo-200';

                return (
                  <div
                    key={char.id}
                    className="rounded-2xl border border-slate-200 p-4 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Character #{idx + 1} • {`{{${char.roleTitle}}}`}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${roleBadgeColor}`}
                      >
                        {char.plotRole === 'assistant' ? 'Accomplice' : char.plotRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Role Title *
                        </label>
                        <input
                          type="text"
                          value={char.roleTitle}
                          onChange={(e) =>
                            updateCharacter(idx, { roleTitle: e.target.value })
                          }
                          placeholder="The ..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Plot Role *
                        </label>
                        <select
                          value={char.plotRole}
                          onChange={(e) =>
                            updateCharacter(idx, {
                              plotRole: e.target.value as CharacterPlotRole,
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        >
                          <option value="victim">💀 Victim</option>
                          <option value="killer">🔪 Killer</option>
                          <option value="assistant">🤝 Secret Accomplice</option>
                          <option value="innocent">🕵️ Innocent Suspect</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Default Gender
                        </label>
                        <select
                          value={char.defaultGender}
                          onChange={(e) =>
                            updateCharacter(idx, {
                              defaultGender: e.target.value as 'female' | 'male' | 'adaptable',
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                        >
                          <option value="female">Female (Flex)</option>
                          <option value="male">Male (Flex)</option>
                          <option value="adaptable">Adaptable</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Who They Are & Dynamics *
                      </label>
                      <textarea
                        rows={2}
                        value={char.conceptNotes}
                        onChange={(e) =>
                          updateCharacter(idx, { conceptNotes: e.target.value })
                        }
                        placeholder="Archetype, relationship to victim, and personality..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Motive or Dark Secret *
                        </label>
                        <input
                          type="text"
                          value={char.motiveOrSecret}
                          onChange={(e) =>
                            updateCharacter(idx, { motiveOrSecret: e.target.value })
                          }
                          placeholder="Why they wanted victim dead or secret..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Outfit Vibe (Expands to 3 Looks)
                        </label>
                        <input
                          type="text"
                          value={char.outfitNotes || ''}
                          onChange={(e) =>
                            updateCharacter(idx, { outfitNotes: e.target.value })
                          }
                          placeholder="e.g. Après-ski faux fur & gold goggles..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Timeline Beats */}
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                  Section 1C • Core Crime Timeline Beats
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Sequence of Events Leading Up to the Murder
                </h2>
              </div>
              <button
                type="button"
                onClick={addBeat}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider"
              >
                + Add Timeline Beat
              </button>
            </div>

            <div className="space-y-2.5">
              {blueprint.beats.map((beat, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center p-3 rounded-2xl border border-slate-200 bg-slate-50/50"
                >
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      value={beat.timeWindow}
                      onChange={(e) => updateBeat(idx, { timeWindow: e.target.value })}
                      placeholder="8:19 PM"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <select
                      value={beat.phase}
                      onChange={(e) =>
                        updateBeat(idx, {
                          phase: e.target.value as BlueprintBeatInput['phase'],
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900"
                    >
                      <option value="pre_crime">Pre-Crime</option>
                      <option value="crime">The Murder</option>
                      <option value="investigation">Investigation</option>
                      <option value="resolution">Resolution</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="text"
                      value={beat.title}
                      onChange={(e) => updateBeat(idx, { title: e.target.value })}
                      placeholder="Beat Title"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <input
                      type="text"
                      value={beat.description}
                      onChange={(e) => updateBeat(idx, { description: e.target.value })}
                      placeholder="What happened (use {{Role}} tokens)..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => removeBeat(idx)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Step 1 Next Action CTA */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Clues will be generated for <strong>{blueprint.spiceLevel}</strong> spice •
                Auto-Recommended Difficulty: <strong>{difficultyRec.badgeText}</strong>
              </div>
              <button
                type="button"
                disabled={isGeneratingClues}
                onClick={() => handleGenerateCoreClues(false)}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
              >
                {isGeneratingClues
                  ? '⏳ Generating Core Clue Suggestions...'
                  : '✨ Step 2: Generate Core Clue Suggestions (Tick Yes / No) →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: CORE MURDER CLUES (TICK YES / NO + STEERABLE MORE OPTIONS)    */}
      {/* ===================================================================== */}
      {currentSlot.step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                  Step 2 of 5 • Core Murder Trail Clues ({blueprint.spiceLevel} Spice)
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Tick <span className="text-emerald-600">✓ Yes</span> or{' '}
                  <span className="text-rose-600">✕ No</span> on Core Murder Clues
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                  ✓ {approvedCoreCount} Kept
                </span>
                <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
                  ✕ {rejectedCoreCount} Rejected
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    difficultyRec.recommendedTier === 'hard'
                      ? 'bg-rose-600 text-white'
                      : difficultyRec.recommendedTier === 'medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  🎯 Recommended: {difficultyRec.badgeText}
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomCoreClue}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider"
                >
                  + Custom Clue
                </button>
              </div>
            </div>

            {/* UPGRADE 1: Compact Single-Row 4-Pillar Solvability & 6-Suspect Spotlight HUD */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                  Murder Trail Pillars:
                </span>
                {solvabilityReport.pillars.map((p) => (
                  <span
                    key={p.id}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black ${
                      p.covered
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-white text-slate-400 border border-slate-200'
                    }`}
                  >
                    {p.covered ? '✓' : '○'} {p.label}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">
                  Cast Clues:
                </span>
                {solvabilityReport.characterCoverage.map((cc) => (
                  <span
                    key={cc.roleTitle}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      cc.underUsed
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {cc.roleTitle}: <strong>{cc.clueCount}</strong>
                  </span>
                ))}
              </div>
            </div>

            {/* UPGRADE 2: Clean Inline Steerable "Show Me More Options" Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: '+ Chat Logs', text: 'Include more scandalous text/chat log screenshots' },
                  { label: '+ CCTV / Audio', text: 'Include CCTV security stills or voicemail audio transcripts' },
                  { label: '+ R3 Smoking Gun', text: `Focus on a Round 3 Smoking Gun timestamp alibi breaker at ${blueprint.murderTimeWindow}` },
                  ...(solvabilityReport.underUsedRoles.length > 0
                    ? [
                        {
                          label: `+ Spotlight ${solvabilityReport.underUsedRoles[0]}`,
                          text: `Include clues involving ${solvabilityReport.underUsedRoles
                            .map((r) => `{{${r}}}`)
                            .join(' and ')}`,
                        },
                      ]
                    : []),
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() =>
                      setClueSteerDirection((prev) =>
                        prev ? `${prev}; ${chip.text}` : chip.text
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[11px] font-bold transition"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-w-[220px] flex items-center gap-2">
                <input
                  type="text"
                  value={clueSteerDirection}
                  onChange={(e) => setClueSteerDirection(e.target.value)}
                  placeholder="Optional direction for next clue batch (e.g. 'bar receipt at 8:15 PM')..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-brand-pink focus:outline-none"
                />
                <button
                  type="button"
                  disabled={isGeneratingClues}
                  onClick={() => handleGenerateCoreClues(true)}
                  className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shrink-0 shadow-sm"
                >
                  {isGeneratingClues ? '⏳ Generating...' : '✨ Show More Clue Options'}
                </button>
              </div>
            </div>
          </div>

          {coreClues.length === 0 ? (
            <div className="bg-white rounded-[28px] border border-slate-200 p-12 text-center space-y-4">
              <p className="text-sm text-slate-600 font-bold">
                No Core Murder Clues generated yet for {blueprint.title}.
              </p>
              <button
                type="button"
                disabled={isGeneratingClues}
                onClick={() => handleGenerateCoreClues(false)}
                className="px-6 py-3 rounded-2xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider"
              >
                {isGeneratingClues ? '⏳ Generating...' : '✨ Generate Core Clue Suggestions Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {coreClues.map((clue, idx) => {
                const isYes = clue.decision === 'yes';
                const isNo = clue.decision === 'no';
                return (
                  <div
                    key={clue.id}
                    className={`rounded-[22px] border-2 p-5 transition-all space-y-3 ${
                      isYes
                        ? 'bg-emerald-50/40 border-emerald-400 shadow-md'
                        : isNo
                          ? 'bg-rose-50/30 border-rose-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white text-[10px] font-black">
                          #{idx + 1}
                        </span>
                        <select
                          value={clue.roundNumber}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, {
                              roundNumber: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-black text-indigo-700"
                        >
                          {activeTierRoundList.map((rNum) => (
                            <option key={rNum} value={rNum}>
                              Round {rNum}
                            </option>
                          ))}
                        </select>
                        <select
                          value={clue.format}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, {
                              format: e.target.value as ClueFormat,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold text-slate-700"
                        >
                          {CLUE_FORMATS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCoreClueDecision(clue.id, 'yes')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            isYes
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          ✓ Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setCoreClueDecision(clue.id, 'no')}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            isNo
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          ✕ No
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          value={clue.title}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, { title: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-900"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={clue.timestampLabel}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, { timestampLabel: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={clue.description}
                      onChange={(e) =>
                        updateCoreClueField(clue.id, { description: e.target.value })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 leading-relaxed"
                    />

                    <div className="p-2.5 rounded-xl bg-slate-900/5 border border-slate-200/80">
                      <input
                        type="text"
                        value={clue.pointsTo}
                        onChange={(e) =>
                          updateCoreClueField(clue.id, { pointsTo: e.target.value })
                        }
                        className="w-full bg-transparent text-[11px] font-medium text-indigo-950 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Bar for Step 2 */}
          <div className="bg-white rounded-[22px] border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => updateCurrentSlot((prev) => ({ ...prev, step: 1 }))}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              ← Step 1 (Blueprint)
            </button>

            <button
              type="button"
              disabled={isGeneratingSubplots || approvedCoreCount < 3}
              onClick={() => handleGenerateRedHerrings(false)}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
            >
              {isGeneratingSubplots
                ? '⏳ Designing Red-Herring Subplots & Backstories...'
                : `✨ Step 3: Suggest Backstories & Red Herrings (${approvedCoreCount} Core Clues Kept) →`}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: RED HERRINGS & BACKSTORIES (TICK YES / NO + STEERABLE BAR)    */}
      {/* ===================================================================== */}
      {currentSlot.step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                  Step 3 of 5 • Entangled Red-Herring Subplots & Innocent Backstories
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Tick <span className="text-emerald-600">✓ Yes</span> or{' '}
                  <span className="text-rose-600">✕ No</span> on Red-Herring Subplots
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                  ✓ {approvedSubplotsCount} Subplots ({approvedDecoyCluesCount} Decoy Clues)
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    difficultyRec.recommendedTier === 'hard'
                      ? 'bg-rose-600 text-white'
                      : difficultyRec.recommendedTier === 'medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  🎯 Recommended: {difficultyRec.badgeText}
                </span>
              </div>
            </div>

            {/* Compact Cast Coverage & Steerable Red-Herring Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {solvabilityReport.underUsedRoles.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSubplotSteerDirection(
                      `Pair up under-used innocent suspects: ${solvabilityReport.underUsedRoles
                        .map((r) => `{{${r}}}`)
                        .join(' and ')}`
                    )
                  }
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition"
                >
                  + Spotlight Under-Used ({solvabilityReport.underUsedRoles.join(', ')})
                </button>
              )}
              <input
                type="text"
                value={subplotSteerDirection}
                onChange={(e) => setSubplotSteerDirection(e.target.value)}
                placeholder="Optional direction for next red-herring subplot (e.g. 'safe break-in at 8:18 PM')..."
                className="flex-1 min-w-[220px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 focus:border-brand-pink focus:outline-none"
              />
              <button
                type="button"
                disabled={isGeneratingSubplots}
                onClick={() => handleGenerateRedHerrings(true)}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shrink-0 shadow-sm"
              >
                {isGeneratingSubplots ? '⏳ Generating...' : '✨ Show More Red Herrings'}
              </button>
            </div>
          </div>

          {subplots.length === 0 ? (
            <div className="bg-white rounded-[28px] border border-slate-200 p-12 text-center space-y-4">
              <p className="text-sm text-slate-600 font-bold">
                No Red-Herring Subplots generated yet.
              </p>
              <button
                type="button"
                disabled={isGeneratingSubplots}
                onClick={() => handleGenerateRedHerrings(false)}
                className="px-6 py-3 rounded-2xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider"
              >
                {isGeneratingSubplots
                  ? '⏳ Generating...'
                  : '✨ Generate Red-Herring Subplots & Backstories'}
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {subplots.map((sub, idx) => {
                const isYes = sub.decision === 'yes';
                const isNo = sub.decision === 'no';
                return (
                  <div
                    key={sub.id}
                    className={`rounded-[26px] border-2 p-6 transition-all space-y-4 ${
                      isYes
                        ? 'bg-emerald-50/35 border-emerald-400 shadow-md'
                        : isNo
                          ? 'bg-rose-50/25 border-rose-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 pb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest">
                            Red Herring #{idx + 1}
                          </span>
                          {sub.involvedRoles.map((r) => (
                            <span
                              key={r}
                              className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-900 text-xs font-black"
                            >
                              {`{{${r.replace(/^\{\{|\}\}$/g, '')}}}`}
                            </span>
                          ))}
                        </div>
                        <input
                          type="text"
                          value={sub.title}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { title: e.target.value })
                          }
                          className="w-full text-base font-black text-slate-900 bg-transparent focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={sub.summary}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { summary: e.target.value })
                          }
                          className="w-full text-xs text-slate-600 bg-white/80 rounded-xl border border-slate-200 p-2"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSubplotDecision(sub.id, 'yes')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            isYes
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          ✓ Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setSubplotDecision(sub.id, 'no')}
                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            isNo
                              ? 'bg-rose-600 text-white shadow-md'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          ✕ No
                        </button>
                      </div>
                    </div>

                    {/* 3-Step Misdirection Arc */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                          Step 1 • Round 1 Trigger
                        </span>
                        <textarea
                          rows={2}
                          value={sub.step1TriggerR1}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step1TriggerR1: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                          Step 2 • Round 2 Escalation
                        </span>
                        <textarea
                          rows={2}
                          value={sub.step2EscalationR2}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step2EscalationR2: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Step 3 • Round 3 Alibi Hole ({blueprint.murderTimeWindow})
                        </span>
                        <textarea
                          rows={2}
                          value={sub.step3AlibiHoleR3}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step3AlibiHoleR3: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Attached Decoy Clues */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {sub.decoyClues.map((dClue) => (
                        <div
                          key={dClue.id}
                          className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={dClue.roundNumber}
                              onChange={(e) =>
                                updateDecoyClueInSubplot(sub.id, dClue.id, {
                                  roundNumber: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
                                })
                              }
                              className="rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-black text-amber-700 bg-amber-50"
                            >
                              {activeTierRoundList.map((rNum) => (
                                <option key={rNum} value={rNum}>
                                  Round {rNum}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] font-bold text-slate-400">
                              {dClue.format.toUpperCase()} • {dClue.timestampLabel}
                            </span>
                          </div>
                          <input
                            type="text"
                            value={dClue.title}
                            onChange={(e) =>
                              updateDecoyClueInSubplot(sub.id, dClue.id, {
                                title: e.target.value,
                              })
                            }
                            className="w-full text-xs font-black text-slate-900 border-b border-slate-100 pb-1 focus:outline-none"
                          />
                          <textarea
                            rows={2}
                            value={dClue.description}
                            onChange={(e) =>
                              updateDecoyClueInSubplot(sub.id, dClue.id, {
                                description: e.target.value,
                              })
                            }
                            className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3 Bottom Bar */}
          <div className="bg-white rounded-[22px] border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => updateCurrentSlot((prev) => ({ ...prev, step: 2 }))}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              ← Step 2 (Core Clues)
            </button>

            <button
              type="button"
              disabled={isAssembling || approvedSubplotsCount < 1}
              onClick={handleAssembleFullBase}
              className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
            >
              {isAssembling
                ? `⏳ Auto-Casting Rounds 1–${activeTierRounds} & Writing Gender-Flex Dossiers...`
                : `✨ Step 4: Auto-Cast Rounds 1–${activeTierRounds} & Build Full Gender-Flex Base (${
                    approvedCoreCount + approvedDecoyCluesCount
                  } Clues) →`}
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: AUTO-CAST ROUNDS 1–N, GENDER-FLEX PREVIEW & 7-CHECK QA        */}
      {/* ===================================================================== */}
      {currentSlot.step === 4 && (
        <div className="space-y-5">
          {!assembled ? (
            <div className="bg-white rounded-[28px] border border-slate-200 p-12 text-center space-y-4">
              <p className="text-sm font-bold text-slate-700">
                Ready to auto-cast your {approvedCoreCount} Core Clues + {approvedDecoyCluesCount}{' '}
                Red-Herring Clues into Rounds 1–{activeTierRounds} and build all {blueprint.characters.length} Gender-Flex Dossiers?
              </p>
              <button
                type="button"
                disabled={isAssembling}
                onClick={handleAssembleFullBase}
                className="px-6 py-3 rounded-2xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider"
              >
                {isAssembling
                  ? '⏳ Building Full Gender-Flex Base & Running Proofreader...'
                  : '✨ Run Auto-Cast & 7-Check Automated Proofreader Now'}
              </button>
            </div>
          ) : (
            <>
              {/* 7-Check Automated Proofreader Scorecard + 1-Click Auto-Fixer */}
              <div className="bg-white rounded-[26px] border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                      Step 4 of 5 • Flawless Pre-Transfer Proofreader
                    </span>
                    <h2 className="text-lg font-black text-slate-900">
                      7-Point Automated Proofreader & Calibration Report
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-black">
                      Recommended Difficulty: {assembled.complexity.toUpperCase()} (
                      {assembled.proofreadReport.estimatedComplexityScore}/10)
                    </span>
                    <span className="px-3.5 py-1.5 rounded-xl bg-brand-pink/15 text-brand-pink text-xs font-black">
                      Spice: {assembled.spiceLevel} ({assembled.proofreadReport.estimatedSpiceScore}
                      /10)
                    </span>
                    <button
                      type="button"
                      disabled={isAutoFixing}
                      onClick={handleAutoFixAssembledIssues}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-sm"
                    >
                      {isAutoFixing ? '⏳ Auto-Fixing...' : '🛠️ 1-Click Auto-Fix All'}
                    </button>
                    <button
                      type="button"
                      disabled={isAssembling}
                      onClick={handleAssembleFullBase}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      {isAssembling ? '⏳...' : '🔄 Re-Assemble'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {assembled.proofreadReport.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-3 rounded-2xl border ${
                        chk.passed
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-black leading-tight">{chk.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0 ${
                            chk.passed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {chk.passed ? 'PASS' : 'FIX'}
                        </span>
                      </div>
                      <p className="text-[10px] opacity-80 leading-snug">{chk.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Tabs + UPGRADE 3: Live Gender-Flex Hydration Preview Switcher */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setStep4Tab('clues')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        step4Tab === 'clues'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🗂️ Rounds 1–{activeTierRounds} ({assembled.clues.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep4Tab('characters')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        step4Tab === 'characters'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🎭 {assembled.characters.length} Dossiers &amp; 3 Outfits
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep4Tab('relationships')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        step4Tab === 'relationships'
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      🕸️ {assembled.relationships.length} Relationships
                    </button>
                  </div>

                  {/* Gender-Flex Live Preview Switcher */}
                  <div className="inline-flex items-center p-1 rounded-2xl bg-indigo-50 border border-indigo-200">
                    {(
                      [
                        { mode: 'raw', label: '🔧 Edit {{Tokens}}' },
                        { mode: '3m3f', label: '🥂 3M/3F Preview' },
                        { mode: '6f', label: '👗 6F Bachelorette' },
                        { mode: '6m', label: '🤵 6M All-Male' },
                      ] as const
                    ).map((gOpt) => (
                      <button
                        key={gOpt.mode}
                        type="button"
                        onClick={() => setGenderPreviewMode(gOpt.mode)}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition ${
                          genderPreviewMode === gOpt.mode
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-indigo-900 hover:bg-indigo-100'
                        }`}
                      >
                        {gOpt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={handleTransferToDraftBases}
                  className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
                >
                  {isTransferring
                    ? '⏳ Transferring to Mystery Bases...'
                    : '🚀 Step 5: Transfer to Mystery Bases as Draft →'}
                </button>
              </div>

              {/* TAB 1: Auto-Cast Rounds 1–N Clue Deck */}
              {step4Tab === 'clues' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {activeTierRoundList.map((roundNum) => {
                    const roundClues = assembled.clues.filter((c) => c.roundNumber === roundNum);
                    return (
                      <div
                        key={roundNum}
                        className="bg-white rounded-[26px] border border-slate-200 p-5 shadow-sm space-y-3"
                      >
                        <div className="border-b border-slate-100 pb-2.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                            {roundNum === 1
                              ? 'Round 1 • Misdirection & Motives'
                              : roundNum === activeTierRounds
                              ? `Round ${roundNum} • Final Alibi Holes & Smoking Gun`
                              : `Round ${roundNum} • Escalation & Forensic Means`}
                          </span>
                          <h3 className="text-base font-black text-slate-900">
                            Round {roundNum} ({roundClues.length} Clues)
                          </h3>
                        </div>

                        <div className="space-y-3">
                          {roundClues.map((c) => (
                            <div
                              key={c.id}
                              className={`p-3.5 rounded-2xl border space-y-2 ${
                                c.isRedHerring
                                  ? 'bg-amber-50/40 border-amber-200'
                                  : 'bg-emerald-50/30 border-emerald-200'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                    c.isRedHerring
                                      ? 'bg-amber-500 text-white'
                                      : 'bg-emerald-600 text-white'
                                  }`}
                                >
                                  {c.isRedHerring ? 'Red Herring' : 'Core Clue'}
                                </span>
                                <select
                                  value={c.roundNumber}
                                  onChange={(e) => {
                                    const nextR = Number(e.target.value) as 1 | 2 | 3 | 4 | 5;
                                    updateCurrentSlot((prev) => ({
                                      ...prev,
                                      assembled: prev.assembled
                                        ? {
                                            ...prev.assembled,
                                            clues: prev.assembled.clues.map((item) =>
                                              item.id === c.id
                                                ? { ...item, roundNumber: nextR }
                                                : item
                                            ),
                                          }
                                        : null,
                                    }));
                                  }}
                                  className="text-[11px] font-black border border-slate-200 rounded-lg px-2 py-0.5 bg-white"
                                >
                                  {activeTierRoundList.map((rOpt) => (
                                    <option key={rOpt} value={rOpt}>
                                      Round {rOpt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="text-xs font-black text-slate-900">
                                {previewHydrate(c.title)}{' '}
                                <span className="text-slate-400 font-bold">
                                  ({c.format} • {c.timestampLabel})
                                </span>
                              </div>
                              {genderPreviewMode === 'raw' ? (
                                <textarea
                                  rows={3}
                                  value={c.description}
                                  onChange={(e) => {
                                    const nextDesc = e.target.value;
                                    updateCurrentSlot((prev) => ({
                                      ...prev,
                                      assembled: prev.assembled
                                        ? {
                                            ...prev.assembled,
                                            clues: prev.assembled.clues.map((item) =>
                                              item.id === c.id
                                                ? { ...item, description: nextDesc }
                                                : item
                                            ),
                                          }
                                        : null,
                                    }));
                                  }}
                                  className="w-full text-xs text-slate-700 bg-white/90 rounded-xl border border-slate-200 p-2"
                                />
                              ) : (
                                <div className="text-xs text-slate-800 bg-white/90 rounded-xl border border-indigo-100 p-2.5 leading-relaxed">
                                  {previewHydrate(c.description)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: 6 Gender-Flex Character Dossiers & 3 Outfit Options */}
              {step4Tab === 'characters' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assembled.characters.map((char, idx) => {
                    const mockChar = previewMockCharacters[idx];
                    const adaptedTitle =
                      genderPreviewMode === 'raw'
                        ? `{{${char.roleTitle}}}`
                        : `${mockChar?.guest_name} as ${adaptRoleTitleForGuestGender(
                            char.roleTitle,
                            mockChar?.guest_gender
                          )}`;

                    return (
                      <div
                        key={char.id}
                        className="bg-white rounded-[26px] border border-slate-200 p-5 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                              Character #{idx + 1} •{' '}
                              {genderPreviewMode === 'raw'
                                ? `Default: ${char.defaultGender}`
                                : `Cast as ${mockChar?.guest_gender?.toUpperCase()}`}
                            </span>
                            <h3 className="text-base font-black text-slate-900">{adaptedTitle}</h3>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                            {char.plotRole}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            Backstory Bio
                          </label>
                          {genderPreviewMode === 'raw' ? (
                            <textarea
                              rows={4}
                              value={char.bio}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentSlot((prev) => ({
                                  ...prev,
                                  assembled: prev.assembled
                                    ? {
                                        ...prev.assembled,
                                        characters: prev.assembled.characters.map((c, cIdx) =>
                                          cIdx === idx ? { ...c, bio: val } : c
                                        ),
                                      }
                                    : null,
                                }));
                              }}
                              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 leading-relaxed"
                            />
                          ) : (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 text-xs text-slate-800 leading-relaxed">
                              {previewHydrate(char.bio)}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                            3 Outfit Options (Auto-Adapts to Guest Gender)
                          </label>
                          {genderPreviewMode === 'raw' ? (
                            <textarea
                              rows={3}
                              value={char.outfitAdvice}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCurrentSlot((prev) => ({
                                  ...prev,
                                  assembled: prev.assembled
                                    ? {
                                        ...prev.assembled,
                                        characters: prev.assembled.characters.map((c, cIdx) =>
                                          cIdx === idx ? { ...c, outfitAdvice: val } : c
                                        ),
                                      }
                                    : null,
                                }));
                              }}
                              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
                            />
                          ) : (
                            <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3 text-xs text-slate-800 leading-relaxed">
                              {previewAdaptOutfit(char.outfitAdvice, idx)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: 15 Pairwise Relationships Matrix */}
              {step4Tab === 'relationships' && (
                <div className="bg-white rounded-[26px] border border-slate-200 p-5 shadow-sm space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {assembled.relationships.map((rel, rIdx) => (
                      <div
                        key={`${rel.roleA}-${rel.roleB}-${rIdx}`}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
                      >
                        <div className="text-xs font-black text-indigo-950">
                          {previewHydrate(`{{${rel.roleA}}} ↔ {{${rel.roleB}}}`)}
                        </div>
                        {genderPreviewMode === 'raw' ? (
                          <textarea
                            rows={2}
                            value={rel.notes}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateCurrentSlot((prev) => ({
                                ...prev,
                                assembled: prev.assembled
                                  ? {
                                      ...prev.assembled,
                                      relationships: prev.assembled.relationships.map(
                                        (item, idx) =>
                                          idx === rIdx ? { ...item, notes: val } : item
                                      ),
                                    }
                                  : null,
                              }));
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2 text-xs text-slate-700"
                          />
                        ) : (
                          <div className="rounded-xl border border-indigo-100 bg-white p-2.5 text-xs text-slate-700 leading-relaxed">
                            {previewHydrate(rel.notes)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 5: TRANSFERRED TO MYSTERY BASES AS DRAFT                         */}
      {/* ===================================================================== */}
      {currentSlot.step === 5 && (
        <div className="bg-white rounded-[32px] border-2 border-emerald-400 p-10 text-center shadow-xl space-y-6 max-w-3xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mx-auto">
            🎉
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest">
              Draft Mystery Base Created in Supabase
            </span>
            <h2 className="text-2xl font-black text-slate-900">
              &ldquo;{blueprint.title}&rdquo; is Now in Mystery Bases as a Draft!
            </h2>
            <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              All 6 gender-flex character dossiers (with 3 outfit options each), 15 pairwise
              relationships, timeline beats, and {assembled?.clues.length || 0} round-cast clues have
              been transferred to your <strong>Mystery Bases</strong> library with{' '}
              <code>status = &apos;draft&apos;</code>.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {currentSlot.transferredMysteryId && (
              <Link
                href={`/${locale}/builder/mysteries/${currentSlot.transferredMysteryId}`}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
              >
                🛠️ Open in Studio Builder & Run 4-Pack Pre-Launch QA →
              </Link>
            )}
            <Link
              href={`/${locale}/admin/mysteries`}
              className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider shadow-md transition"
            >
              📚 View in Mystery Bases (/admin/mysteries) →
            </Link>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => updateCurrentSlot((prev) => ({ ...prev, step: 4 }))}
              className="text-xs font-bold text-slate-500 hover:text-slate-800"
            >
              ← Back to Step 4 (Inspect Dossiers & Clues)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
