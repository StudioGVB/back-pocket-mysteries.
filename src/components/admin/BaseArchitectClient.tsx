'use client';

import React, { useState, useEffect } from 'react';
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
  parseRawNotesIntoBlueprintAction,
  suggestCoreCluesForBlueprintAction,
  suggestRedHerringsAndBackstoriesAction,
  assembleAndProofreadFullBaseAction,
  transferBlueprintToDraftMysteryBaseAction,
} from '@/app/actions/base-architect';
import { ClueFormat } from '@/utils/clue-format';
import { recommendDifficultyFromPlotAndClues } from '@/utils/architect-difficulty-recommender';

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

export function BaseArchitectClient({ locale }: { locale: string }) {
  const [slots, setSlots] = useState<WorkspaceSlotState[]>(INITIAL_SLOTS);
  const [activeSlotIndex, setActiveSlotIndex] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  // Loading & UI feedback states
  const [isParsingNotes, setIsParsingNotes] = useState(false);
  const [isGeneratingClues, setIsGeneratingClues] = useState(false);
  const [isGeneratingSubplots, setIsGeneratingSubplots] = useState(false);
  const [isAssembling, setIsAssembling] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [step4Tab, setStep4Tab] = useState<'clues' | 'characters' | 'relationships'>('clues');
  const [showRawPasteBox, setShowRawPasteBox] = useState<boolean>(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 3) {
          setSlots(parsed);
        }
      }
    } catch (e) {
      console.warn('Could not load saved OG Base Builder slots:', e);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    } catch (e) {
      console.warn('Could not persist OG Base Builder slots:', e);
    }
  }, [slots, hydrated]);

  const currentSlot = slots[activeSlotIndex] || slots[0];
  const { blueprint, coreClues, subplots, assembled } = currentSlot;

  const updateCurrentSlot = (updater: (prev: WorkspaceSlotState) => WorkspaceSlotState) => {
    setSlots((prevSlots) =>
      prevSlots.map((s, idx) => (idx === activeSlotIndex ? updater(s) : s))
    );
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
      setStatusToast(`Loaded "${file.name}" (${text.length.toLocaleString()} chars). Click "Auto-Fill Blueprint from Notes" to parse!`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to read template file.');
    }
  };

  const handleDownloadBlankTemplate = () => {
    const templateMd = `# OG MYSTERY BASE TEMPLATE (6 PLAYERS)

- **Title:** ${blueprint.title}
- **Theme:** ${blueprint.theme || 'e.g. Alpine Ski Chalet / VIP Yacht / Manor House'}
- **Spice Level:** ${blueprint.spiceLevel} (Clean | Mild | Spicy | Filthy)
- **Complexity:** ${blueprint.complexity.toUpperCase()} (Easy | Medium | Hard)
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
        setStatusToast('✨ Blueprint auto-filled from your template notes! Review the fields below.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error parsing notes.');
    } finally {
      setIsParsingNotes(false);
    }
  };

  // STEP 2: Generate or Refresh Core Murder Clues
  const handleGenerateCoreClues = async (isMoreOptions: boolean = false) => {
    setErrorMessage(null);
    if (!blueprint.title.trim() || !blueprint.killerHowAndWhySummary.trim()) {
      setErrorMessage(
        'Please fill in the Mystery Title, Murder Weapon/Method, and Killer How & Why in Step 1 before generating clues.'
      );
      return;
    }
    setIsGeneratingClues(true);
    try {
      const res = await suggestCoreCluesForBlueprintAction({
        blueprint,
        existingClues: isMoreOptions ? coreClues : [],
      });
      if (!res.success || !res.clues) {
        setErrorMessage(res.error || 'Failed to generate core clues.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 2,
          coreClues: res.clues!,
        }));
        setStatusToast(
          isMoreOptions
            ? '✨ Replaced rejected clues with fresh Core Clue options! Tick Yes or No on the new cards.'
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
      generationPrompt: 'Close-up forensic macro photograph of evidence on a dark surface, cinematic lighting, no text',
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
  const handleGenerateRedHerrings = async (isMoreOptions: boolean = false) => {
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
      const res = await suggestRedHerringsAndBackstoriesAction({
        blueprint,
        approvedCoreClues: approvedCore,
        existingSubplots: isMoreOptions ? subplots : [],
      });
      if (!res.success || !res.subplots) {
        setErrorMessage(res.error || 'Failed to generate red-herring subplots.');
      } else {
        updateCurrentSlot((prev) => ({
          ...prev,
          step: 3,
          subplots: res.subplots!,
        }));
        setStatusToast(
          isMoreOptions
            ? '✨ Generated fresh Red-Herring Subplots & Backstories! Tick Yes or No.'
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
  const difficultyRec = recommendDifficultyFromPlotAndClues({
    blueprint,
    coreClues,
    subplots,
  });

  useEffect(() => {
    if (!hydrated) return;
    if (blueprint.complexity !== difficultyRec.recommendedTier) {
      updateBlueprint({ complexity: difficultyRec.recommendedTier });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyRec.recommendedTier, hydrated, activeSlotIndex]);

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header & 3-Mystery Workspace Slot Switcher */}
      <div className="bg-gradient-to-br from-[#130d21] via-[#1c1330] to-[#271745] rounded-[32px] p-8 text-white shadow-xl border border-white/10">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[11px] font-black uppercase tracking-widest">
              <span>✨ OG Base Builder • Guided Curation & Proofreading Pipeline</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              OG Mystery Base Architect (Up to 6 Players)
            </h1>
            <p className="text-sm text-white/70 leading-relaxed">
              Upload or paste your theme, characters, and crime beats → tick{' '}
              <span className="text-emerald-400 font-bold">✓ Yes</span> or{' '}
              <span className="text-rose-400 font-bold">✕ No</span> on AI-suggested Core Clues &
              Red-Herring Subplots → auto-cast Rounds 1–3 with bidirectional gender-flex tokens →
              transfer to <span className="text-white font-bold">Mystery Bases</span> as a draft.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleDownloadBlankTemplate}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white transition flex items-center gap-2"
            >
              <span>📥 Download Blank 6-Player Template (.md)</span>
            </button>
            <Link
              href={`/${locale}/admin/mysteries`}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white/90 transition"
            >
              View Mystery Bases →
            </Link>
          </div>
        </div>

        {/* 3 Workspace Slots so user can build 3 mysteries side-by-side */}
        <div className="mt-7 pt-6 border-t border-white/10">
          <div className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-3">
            Active Mystery Workspace Slots (Auto-Saved in Browser)
          </div>
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
                  className={`text-left p-4 rounded-2xl border transition-all ${
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
                      Slot #{idx + 1} • {slot.blueprint.spiceLevel} •{' '}
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
                    className={`text-xs mt-1 flex items-center gap-3 ${
                      isActive ? 'text-slate-500' : 'text-white/60'
                    }`}
                  >
                    <span>✓ {slotApprovedClues} Core Clues</span>
                    <span>•</span>
                    <span>✓ {slotApprovedSubs} Red Herrings</span>
                    {slot.transferredMysteryId && (
                      <span className="text-emerald-500 font-bold">• Draft Created</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5-Step Progress Stepper Bar */}
      <div className="bg-white rounded-[24px] p-4 border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          {[
            {
              num: 1,
              title: '1. Core Blueprint',
              subtitle: 'Theme, 6 Cast & Crime Beats',
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
                className={`p-3.5 rounded-xl text-left transition border ${
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
                  className={`text-[11px] mt-0.5 ${
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
            <span className="text-lg">⚠️</span>
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
          <div className="flex items-center gap-2.5">
            <span>{statusToast}</span>
          </div>
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
        <div className="space-y-8">
          {/* Quick Template Upload / Raw Notes Auto-Fill Card */}
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                  Fast-Track Template Importer
                </span>
                <h2 className="text-lg font-black text-slate-900">
                  Upload or Paste Your Mystery Template Notes
                </h2>
                <p className="text-xs text-slate-500">
                  Paste your brainstorm worksheet, markdown template, or raw notes below and let AI
                  populate all the Step 1 blueprint fields automatically — or fill the form below
                  directly.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <label className="cursor-pointer px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider transition">
                  <span>📂 Upload .md / .txt / .json</span>
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
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  {showRawPasteBox ? 'Hide Paste Box' : 'Show Paste Box'}
                </button>
              </div>
            </div>

            {showRawPasteBox && (
              <div className="space-y-3 pt-2">
                <textarea
                  rows={6}
                  value={currentSlot.rawTemplateNotes}
                  onChange={(e) =>
                    updateCurrentSlot((prev) => ({
                      ...prev,
                      rawTemplateNotes: e.target.value,
                    }))
                  }
                  placeholder={`Paste everything from your template here (Theme, Victim, Murderer, how & why they did it, the 6 character archetypes, and timeline beats)...`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-800 focus:bg-white focus:border-brand-pink focus:outline-none font-mono"
                />
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    disabled={isParsingNotes || !currentSlot.rawTemplateNotes.trim()}
                    onClick={handleAutoParseRawNotes}
                    className="px-5 py-2.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-md transition flex items-center gap-2"
                  >
                    {isParsingNotes ? (
                      <span>⏳ Parsing Your Template Notes...</span>
                    ) : (
                      <span>✨ Auto-Fill Blueprint Fields from Notes</span>
                    )}
                  </button>
                </div>
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

            {/* 2. Live AI Auto-Recommended Difficulty Engine (Based on Plot, Clues & Red Herrings) */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-indigo-600 text-white">
                      🎯 Auto-Recommended Difficulty (5-Factor Rubric)
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      Updates live as you edit your plot, cast & ticked clues
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">
                    {difficultyRec.headlineReason}
                  </h3>
                </div>

                <div
                  className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider shadow-sm ${
                    difficultyRec.recommendedTier === 'hard'
                      ? 'bg-rose-600 text-white'
                      : difficultyRec.recommendedTier === 'medium'
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                  }`}
                >
                  Recommended: {difficultyRec.badgeText}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                {difficultyRec.factors.map((f) => (
                  <div
                    key={f.id}
                    className="p-3 rounded-xl bg-white border border-slate-200/90 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-black uppercase text-slate-500">
                        {f.name}
                      </span>
                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {f.pointsLabel}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-800 leading-snug">
                      {f.detail}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs text-slate-600">
                <span>💡 {difficultyRec.adjustmentTip}</span>
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
                    className="px-3 py-1.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 text-[11px] font-black uppercase tracking-wider"
                  >
                    + Add Secret Accomplice (Push to Hard)
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
                    className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-black uppercase tracking-wider"
                  >
                    Switch Accomplice to Innocent (Lone-Wolf Killer)
                  </button>
                )}
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
                rows={3}
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

          {/* 6-Player Character Cast Builder */}
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">
                  Section 1B • 6-Player Gender-Flex Character Cast
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Character Roles, Plot Assignments & Dynamics
                </h2>
                <p className="text-xs text-slate-500">
                  Use role titles starting with <code className="font-bold">&quot;The ...&quot;</code>{' '}
                  (e.g. <code className="font-bold">The Sommelier</code>,{' '}
                  <code className="font-bold">The Heiress</code>). Step 4 will automatically convert
                  all names, pronouns, and family nouns into bidirectional gender-flex tokens!
                </p>
              </div>

              {/* Cast Validation Pills */}
              <div className="flex flex-wrap items-center gap-2">
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
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black ${
                    blueprint.complexity === 'hard'
                      ? assistantCount >= 1
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                      : assistantCount === 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Accomplice: {assistantCount}{' '}
                  {blueprint.complexity === 'hard' ? '(1 Required for Hard)' : '(0 for Easy/Med)'}
                </span>
              </div>
            </div>

            {/* Warning if Hard complexity doesn't have an assistant or Easy/Medium has an assistant */}
            {blueprint.complexity === 'hard' && assistantCount === 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-amber-900">
                  💡 <strong>Hard Complexity (8.0–10.0/10) Rubric Requirement:</strong> Hard mysteries
                  require <strong>1 Secret Accomplice / Assistant</strong> (`plot_role = assistant`)
                  who tampers with an alibi or physical clue for the Killer.
                </div>
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
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-700"
                >
                  Assign Character #3 as Accomplice
                </button>
              </div>
            )}

            {blueprint.complexity !== 'hard' && assistantCount > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-bold text-amber-900">
                  💡 <strong>{blueprint.complexity.toUpperCase()} Complexity Rubric Note:</strong>{' '}
                  Easy and Medium mysteries use a <strong>Lone-Wolf Killer (0 Accomplices)</strong>.
                </div>
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
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-black uppercase tracking-wider hover:bg-amber-700"
                >
                  Switch Accomplice to Innocent Suspect
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    className="rounded-2xl border border-slate-200 p-5 bg-slate-50/40 space-y-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                        Character #{idx + 1} • Token: {`{{${char.roleTitle}}}`}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${roleBadgeColor}`}
                      >
                        {char.plotRole === 'assistant' ? 'Accomplice / Assistant' : char.plotRole}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-1">
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900"
                        >
                          <option value="victim">💀 Victim</option>
                          <option value="killer">🔪 Killer</option>
                          <option value="assistant">🤝 Secret Accomplice</option>
                          <option value="innocent">🕵️ Innocent Suspect</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                          Default Gender (Auto-Flex)
                        </label>
                        <select
                          value={char.defaultGender}
                          onChange={(e) =>
                            updateCharacter(idx, {
                              defaultGender: e.target.value as 'female' | 'male' | 'adaptable',
                            })
                          }
                          className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900"
                        >
                          <option value="female">Female (Flex-Ready)</option>
                          <option value="male">Male (Flex-Ready)</option>
                          <option value="adaptable">Adaptable / Neutral</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                        Who They Are & Dynamics with Victim / Others *
                      </label>
                      <textarea
                        rows={2}
                        value={char.conceptNotes}
                        onChange={(e) =>
                          updateCharacter(idx, { conceptNotes: e.target.value })
                        }
                        placeholder="Describe their archetype, relationship to the victim, and personality..."
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          placeholder="Why they wanted the victim dead or what they hide..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
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
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
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

            <div className="space-y-3">
              {blueprint.beats.map((beat, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-4 rounded-2xl border border-slate-200 bg-slate-50/50"
                >
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Clock Time
                    </label>
                    <input
                      type="text"
                      value={beat.timeWindow}
                      onChange={(e) => updateBeat(idx, { timeWindow: e.target.value })}
                      placeholder="8:19 PM"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Phase
                    </label>
                    <select
                      value={beat.phase}
                      onChange={(e) =>
                        updateBeat(idx, {
                          phase: e.target.value as BlueprintBeatInput['phase'],
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-900"
                    >
                      <option value="pre_crime">Pre-Crime</option>
                      <option value="crime">The Murder</option>
                      <option value="investigation">Investigation</option>
                      <option value="resolution">Resolution</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      Beat Title
                    </label>
                    <input
                      type="text"
                      value={beat.title}
                      onChange={(e) => updateBeat(idx, { title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                      What Happened (Use {'{{Role}}'} Tokens)
                    </label>
                    <input
                      type="text"
                      value={beat.description}
                      onChange={(e) => updateBeat(idx, { description: e.target.value })}
                      placeholder="Describe who saw or did what at this timestamp..."
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => removeBeat(idx)}
                      className="text-xs font-bold text-rose-500 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Step 1 Next Action CTA */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500">
                Ready for AI to suggest Core Murder Trail Clues pointing to your solution?
              </div>
              <button
                type="button"
                disabled={isGeneratingClues}
                onClick={() => handleGenerateCoreClues(false)}
                className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition flex items-center gap-2"
              >
                {isGeneratingClues ? (
                  <span>⏳ Generating Core Clue Suggestions...</span>
                ) : (
                  <span>✨ Step 2: Generate Core Clue Suggestions (Tick Yes / No) →</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: CORE MURDER CLUES (TICK YES / NO + SHOW MORE OPTIONS)         */}
      {/* ===================================================================== */}
      {currentSlot.step === 2 && (
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                  Step 2 of 5 • Core Murder Trail Clues (Tailored to {blueprint.spiceLevel} Spice)
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Tick <span className="text-emerald-600">✓ Yes</span> or{' '}
                  <span className="text-rose-600">✕ No</span> on Core Murder Clues
                </h2>
                <p className="text-xs text-slate-500">
                  Clues are generated for your chosen <strong>{blueprint.spiceLevel}</strong> spice
                  level. As you tick ✓ Yes or ✕ No, the AI updates its{' '}
                  <strong>Recommended Difficulty ({difficultyRec.badgeText})</strong> automatically!
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                  ✓ {approvedCoreCount} Approved
                </span>
                <span className="px-3.5 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black">
                  ✕ {rejectedCoreCount} Rejected
                </span>
                <button
                  type="button"
                  onClick={handleAddCustomCoreClue}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black uppercase tracking-wider"
                >
                  + Add Custom Clue
                </button>
                <button
                  type="button"
                  disabled={isGeneratingClues}
                  onClick={() => handleGenerateCoreClues(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  {isGeneratingClues
                    ? '⏳ Generating More Options...'
                    : '✨ Show Me More Clue Options'}
                </button>
              </div>
            </div>

            {/* Live Spice Level Switcher + Auto-Recommended Difficulty Bar */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">
                  Clue Spice Level:
                </span>
                {SPICE_TIER_CARDS.map((card) => (
                  <button
                    key={card.level}
                    type="button"
                    onClick={() => updateBlueprint({ spiceLevel: card.level })}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                      blueprint.spiceLevel === card.level
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {card.badge}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-slate-600 font-medium">
                  {difficultyRec.headlineReason}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {coreClues.map((clue, idx) => {
                const isYes = clue.decision === 'yes';
                const isNo = clue.decision === 'no';
                return (
                  <div
                    key={clue.id}
                    className={`rounded-[24px] border-2 p-6 transition-all space-y-4 ${
                      isYes
                        ? 'bg-emerald-50/40 border-emerald-400 shadow-md'
                        : isNo
                          ? 'bg-rose-50/30 border-rose-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    {/* Top Bar: Clue Number, Round, Format & YES / NO Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-black">
                          Clue #{idx + 1}
                        </span>
                        <select
                          value={clue.roundNumber}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, {
                              roundNumber: Number(e.target.value) as 1 | 2 | 3,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-indigo-700"
                        >
                          <option value={1}>Round 1 (Early Spark)</option>
                          <option value={2}>Round 2 (Means/Opportunity)</option>
                          <option value={3}>Round 3 (Smoking Gun)</option>
                        </select>
                        <select
                          value={clue.format}
                          onChange={(e) =>
                            updateCoreClueField(clue.id, {
                              format: e.target.value as ClueFormat,
                            })
                          }
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700"
                        >
                          {CLUE_FORMATS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tactile YES / NO Tick Buttons */}
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

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div className="sm:col-span-3">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          Clue Title
                        </label>
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
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          Timestamp
                        </label>
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

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                        In-World Evidence Description (Uses {'{{Role}}'} Gender-Flex Tokens)
                      </label>
                      <textarea
                        rows={3}
                        value={clue.description}
                        onChange={(e) =>
                          updateCoreClueField(clue.id, { description: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 leading-relaxed"
                      />
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/5 border border-slate-200/80 space-y-1">
                      <div className="text-[10px] font-black uppercase tracking-wider text-indigo-700">
                        🎯 Forensic Deduction (How This Points to the Murder Solution)
                      </div>
                      <input
                        type="text"
                        value={clue.pointsTo}
                        onChange={(e) =>
                          updateCoreClueField(clue.id, { pointsTo: e.target.value })
                        }
                        className="w-full bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Bar for Step 2 */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => updateCurrentSlot((prev) => ({ ...prev, step: 1 }))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              ← Back to Step 1 (Blueprint)
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isGeneratingClues}
                onClick={() => handleGenerateCoreClues(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider"
              >
                {isGeneratingClues ? '⏳ Generating...' : '✨ Show Me More Clue Options'}
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
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: RED HERRINGS & BACKSTORIES (TICK YES / NO + MORE OPTIONS)     */}
      {/* ===================================================================== */}
      {currentSlot.step === 3 && (
        <div className="space-y-6">
          <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-black uppercase tracking-widest text-brand-pink">
                  Step 3 of 5 • Entangled Red-Herring Subplots & Innocent Backstories
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  Tick <span className="text-emerald-600">✓ Yes</span> or{' '}
                  <span className="text-rose-600">✕ No</span> on Red-Herring Subplots
                </h2>
                <p className="text-xs text-slate-500">
                  Each subplot pairs innocent suspects in a high-stakes secret scheme (calibrated to{' '}
                  <strong>{blueprint.spiceLevel}</strong> spice) with a 3-step{' '}
                  <em>Trigger → Escalation → Alibi Hole at {blueprint.murderTimeWindow}</em> arc +
                  attached Decoy Clues.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-100 text-emerald-900 text-xs font-black">
                  ✓ {approvedSubplotsCount} Subplots Approved ({approvedDecoyCluesCount} Decoy Clues)
                </span>
                <button
                  type="button"
                  disabled={isGeneratingSubplots}
                  onClick={() => handleGenerateRedHerrings(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-sm"
                >
                  {isGeneratingSubplots
                    ? '⏳ Generating More Subplots...'
                    : '✨ Show Me More Red-Herring Options'}
                </button>
              </div>
            </div>

            {/* Live Spice Level + Auto-Recommended Difficulty Banner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 mr-1">
                  Subplot Spice Level:
                </span>
                {SPICE_TIER_CARDS.map((card) => (
                  <button
                    key={card.level}
                    type="button"
                    onClick={() => updateBlueprint({ spiceLevel: card.level })}
                    className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                      blueprint.spiceLevel === card.level
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {card.badge}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs text-slate-600 font-medium">
                  {difficultyRec.headlineReason}
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
            <div className="space-y-6">
              {subplots.map((sub, idx) => {
                const isYes = sub.decision === 'yes';
                const isNo = sub.decision === 'no';
                return (
                  <div
                    key={sub.id}
                    className={`rounded-[28px] border-2 p-7 transition-all space-y-5 ${
                      isYes
                        ? 'bg-emerald-50/35 border-emerald-400 shadow-md'
                        : isNo
                          ? 'bg-rose-50/25 border-rose-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 pb-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest">
                            Red-Herring Subplot #{idx + 1}
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
                          className="w-full text-lg font-black text-slate-900 bg-transparent focus:outline-none"
                        />
                        <textarea
                          rows={2}
                          value={sub.summary}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { summary: e.target.value })
                          }
                          className="w-full text-xs text-slate-600 bg-white/80 rounded-xl border border-slate-200 p-2.5"
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
                          ✓ Yes (Keep Subplot)
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
                          ✕ No (Reject)
                        </button>
                      </div>
                    </div>

                    {/* 3-Step Misdirection Arc */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">
                          Step 1 • Round 1 Suspicion Trigger
                        </span>
                        <textarea
                          rows={3}
                          value={sub.step1TriggerR1}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step1TriggerR1: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-orange-600">
                          Step 2 • Round 2 Compromising Escalation
                        </span>
                        <textarea
                          rows={3}
                          value={sub.step2EscalationR2}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step2EscalationR2: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                          Step 3 • Round 3 Alibi Hole at {blueprint.murderTimeWindow}
                        </span>
                        <textarea
                          rows={3}
                          value={sub.step3AlibiHoleR3}
                          onChange={(e) =>
                            updateSubplotField(sub.id, { step3AlibiHoleR3: e.target.value })
                          }
                          className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Suspect Backstory Additions */}
                    {Object.keys(sub.backstoryAdditions || {}).length > 0 && (
                      <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/70 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-800">
                          📖 Innocent Suspect Backstory Additions (Auto-Woven into Character Dossiers)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(sub.backstoryAdditions).map(([roleKey, paragraph]) => (
                            <div
                              key={roleKey}
                              className="p-3 rounded-xl bg-white border border-indigo-100 space-y-1"
                            >
                              <div className="text-xs font-black text-indigo-900">
                                {`{{${roleKey.replace(/^\{\{|\}\}$/g, '')}}}`}
                              </div>
                              <textarea
                                rows={2}
                                value={paragraph}
                                onChange={(e) =>
                                  updateSubplotField(sub.id, {
                                    backstoryAdditions: {
                                      ...sub.backstoryAdditions,
                                      [roleKey]: e.target.value,
                                    },
                                  })
                                }
                                className="w-full text-xs text-slate-700 bg-transparent focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attached Decoy Clues */}
                    <div className="space-y-2.5">
                      <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Attached Decoy Clues ({sub.decoyClues.length} Clues • Auto-Cast across
                        Rounds 1–3 when Subplot is Approved)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {sub.decoyClues.map((dClue) => (
                          <div
                            key={dClue.id}
                            className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <select
                                value={dClue.roundNumber}
                                onChange={(e) =>
                                  updateDecoyClueInSubplot(sub.id, dClue.id, {
                                    roundNumber: Number(e.target.value) as 1 | 2 | 3,
                                  })
                                }
                                className="rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-black text-amber-700 bg-amber-50"
                              >
                                <option value={1}>Round 1</option>
                                <option value={2}>Round 2</option>
                                <option value={3}>Round 3</option>
                              </select>
                              <span className="text-[10px] font-bold text-slate-500">
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
                              rows={3}
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
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 3 Bottom Bar */}
          <div className="bg-white rounded-[24px] border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => updateCurrentSlot((prev) => ({ ...prev, step: 2 }))}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50"
            >
              ← Back to Step 2 (Core Clues)
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={isGeneratingSubplots}
                onClick={() => handleGenerateRedHerrings(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-wider"
              >
                {isGeneratingSubplots ? '⏳ Generating...' : '✨ Show Me More Red-Herring Options'}
              </button>

              <button
                type="button"
                disabled={isAssembling || approvedSubplotsCount < 1}
                onClick={handleAssembleFullBase}
                className="px-6 py-3 rounded-2xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition"
              >
                {isAssembling
                  ? '⏳ Auto-Casting Rounds 1–3 & Writing Gender-Flex Dossiers...'
                  : `✨ Step 4: Auto-Cast Rounds & Build Full Gender-Flex Base (${
                      approvedCoreCount + approvedDecoyCluesCount
                    } Total Clues) →`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: AUTO-CAST ROUNDS 1–3, GENDER-FLEX DOSSIERS & 7-CHECK QA       */}
      {/* ===================================================================== */}
      {currentSlot.step === 4 && (
        <div className="space-y-6">
          {!assembled ? (
            <div className="bg-white rounded-[28px] border border-slate-200 p-12 text-center space-y-4">
              <p className="text-sm font-bold text-slate-700">
                Ready to auto-cast your {approvedCoreCount} Core Clues + {approvedDecoyCluesCount}{' '}
                Red-Herring Clues into Rounds 1–3 and build all 6 Gender-Flex Dossiers?
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
              {/* 7-Check Automated Proofreader Scorecard */}
              <div className="bg-white rounded-[28px] border border-slate-200 p-7 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                      Step 4 of 5 • Flawless Pre-Transfer Proofreader
                    </span>
                    <h2 className="text-xl font-black text-slate-900">
                      7-Point Automated Proofreader & Calibration Report
                    </h2>
                    <p className="text-xs text-slate-500">
                      Verifies zero broken tokens, bidirectional gender-flex pronouns, 15 pairwise
                      relationships, 3 outfit options per character, and 5-factor difficulty/spice
                      alignment.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-black">
                      Est. Complexity: {assembled.proofreadReport.estimatedComplexityScore}/10 (
                      {assembled.complexity.toUpperCase()})
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-brand-pink/15 text-brand-pink text-xs font-black">
                      Est. Spice: {assembled.proofreadReport.estimatedSpiceScore}/10 (
                      {assembled.spiceLevel})
                    </div>
                    <button
                      type="button"
                      disabled={isAssembling}
                      onClick={handleAssembleFullBase}
                      className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-black uppercase tracking-wider text-slate-700 hover:bg-slate-50"
                    >
                      {isAssembling ? '⏳ Re-Running...' : '🔄 Re-Run AI Assembly'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {assembled.proofreadReport.checks.map((chk) => (
                    <div
                      key={chk.id}
                      className={`p-3.5 rounded-2xl border ${
                        chk.passed
                          ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                          : 'bg-amber-50 border-amber-300 text-amber-950'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black">{chk.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            chk.passed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {chk.passed ? 'PASS' : 'CHECK'}
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 leading-snug">{chk.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-Tabs to Inspect / Edit Auto-Cast Clues, 6 Dossiers & 15 Relationships */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="inline-flex p-1.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setStep4Tab('clues')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      step4Tab === 'clues'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🗂️ Auto-Cast Rounds 1–3 Clues ({assembled.clues.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep4Tab('characters')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      step4Tab === 'characters'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🎭 6 Gender-Flex Dossiers & 3 Outfits
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep4Tab('relationships')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                      step4Tab === 'relationships'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    🕸️ 15 Pairwise Relationships
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isTransferring}
                  onClick={handleTransferToDraftBases}
                  className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider shadow-lg transition flex items-center gap-2"
                >
                  {isTransferring ? (
                    <span>⏳ Transferring to Mystery Bases as Draft...</span>
                  ) : (
                    <span>🚀 Step 5: Transfer to Mystery Bases as Draft →</span>
                  )}
                </button>
              </div>

              {/* TAB 1: Auto-Cast Rounds 1–3 Clue Deck */}
              {step4Tab === 'clues' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {([1, 2, 3] as const).map((roundNum) => {
                    const roundClues = assembled.clues.filter((c) => c.roundNumber === roundNum);
                    return (
                      <div
                        key={roundNum}
                        className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                              {roundNum === 1
                                ? 'Act I • Misdirection & Motives'
                                : roundNum === 2
                                  ? 'Act II • Escalation & Physical Traces'
                                  : 'Act III • Alibi Holes & Smoking Gun'}
                            </span>
                            <h3 className="text-lg font-black text-slate-900">
                              Round {roundNum} ({roundClues.length} Clues)
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {roundClues.map((c) => (
                            <div
                              key={c.id}
                              className={`p-4 rounded-2xl border space-y-2 ${
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
                                  {c.isRedHerring ? 'Red Herring' : 'Core Murder Clue'}
                                </span>
                                <select
                                  value={c.roundNumber}
                                  onChange={(e) => {
                                    const nextR = Number(e.target.value) as 1 | 2 | 3;
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
                                  <option value={1}>Move to R1</option>
                                  <option value={2}>Move to R2</option>
                                  <option value={3}>Move to R3</option>
                                </select>
                              </div>
                              <div className="text-xs font-black text-slate-900">
                                {c.title}{' '}
                                <span className="text-slate-400 font-bold">
                                  ({c.format} • {c.timestampLabel})
                                </span>
                              </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {assembled.characters.map((char, idx) => (
                    <div
                      key={char.id}
                      className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                            Character #{idx + 1} • Default: {char.defaultGender} (Auto-Flex)
                          </span>
                          <h3 className="text-lg font-black text-slate-900">
                            {`{{${char.roleTitle}}}`}
                          </h3>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                          {char.plotRole}
                        </span>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          Backstory Bio (Gender-Flex Tokenized)
                        </label>
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
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 leading-relaxed"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          3 Outfit Options (&quot;Option 1:... | Option 2:... | Option 3:...&quot;)
                        </label>
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
                          className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                          How to Act & Table Objectives
                        </label>
                        <textarea
                          rows={2}
                          value={char.actSummary}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateCurrentSlot((prev) => ({
                              ...prev,
                              assembled: prev.assembled
                                ? {
                                    ...prev.assembled,
                                    characters: prev.assembled.characters.map((c, cIdx) =>
                                      cIdx === idx ? { ...c, actSummary: val } : c
                                    ),
                                  }
                                : null,
                            }));
                          }}
                          className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: 15 Pairwise Relationships Matrix */}
              {step4Tab === 'relationships' && (
                <div className="bg-white rounded-[28px] border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-black text-slate-900">
                      Complete 15-Pair Relationship Matrix (All 6 Characters Connected)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Every pair of characters has a dedicated gossip/secret connection using
                      bidirectional gender-flex tokens.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assembled.relationships.map((rel, rIdx) => (
                      <div
                        key={`${rel.roleA}-${rel.roleB}-${rIdx}`}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2"
                      >
                        <div className="text-xs font-black text-indigo-950">
                          {`{{${rel.roleA}}}`} ↔ {`{{${rel.roleB}}}`}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {rel.dynamics.map((d, dIdx) => (
                            <span
                              key={dIdx}
                              className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold"
                            >
                              {d}
                            </span>
                          ))}
                        </div>
                        <textarea
                          rows={3}
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
