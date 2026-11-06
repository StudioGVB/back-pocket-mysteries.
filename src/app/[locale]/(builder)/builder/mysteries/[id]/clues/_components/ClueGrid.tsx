'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Database, ClueFormat } from '@/types/database';
import { addClueAction, updateClueAction } from '../actions';
import { ClueCard } from './ClueCard';
import { generateClueImageAction, generateClueDescriptionAction } from '@/app/actions/generator';
import { generateAudioClueAction } from '@/app/actions/audio-generator';
import { hydrateTextWithCharacters, tokenizeTextWithCharacterRoles } from '@/utils/hydration';
import { CLUE_FORMAT_OPTIONS, inferClueFormat, stripCustomerFacingTitle } from '@/utils/clue-format';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueGridProps {
  mystery: Mystery;
  mysteryId: string;
  clues: Clue[];
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
}

export function ClueGrid({ mystery, mysteryId, clues, beats, characters, subplots = [] }: ClueGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [currentClues, setCurrentClues] = useState(clues);
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [expandedMenuRounds, setExpandedMenuRounds] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true,
  });
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingTargetCount, setRegeneratingTargetCount] = useState(0);
  const [regeneratedCount, setRegeneratedCount] = useState(0);
  const [currentlyGeneratingId, setCurrentlyGeneratingId] = useState<string | null>(null);
  const [currentlyGeneratingLabel, setCurrentlyGeneratingLabel] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    setCurrentClues(clues);
  }, [clues]);

  useEffect(() => {
    router.refresh();
  }, [router]);

  const handleStop = () => {
    stopRequestedRef.current = true;
  };

  // Clues that require external media synthesis (AI Photos for CCTV/Prop, ElevenLabs MP3 for Audio)
  const mediaClues = useMemo(() => {
    return currentClues.filter((clue) => {
      const fmt: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
      return fmt === 'cctv' || fmt === 'physical_prop' || fmt === 'audio';
    });
  }, [currentClues]);

  const resolveBeatTitleForClue = (clue: Clue): string => {
    if (clue.linked_plot_beat_id) {
      const beat = beats.find((b) => b.id === clue.linked_plot_beat_id);
      if (beat) return tokenizeTextWithCharacterRoles(beat.event_title, characters);
    }
    if (clue.linked_subplot_beat_id) {
      const sBeat = subplots
        ?.flatMap((s) => s.subplot_beats || [])
        .find((b: any) => b.id === clue.linked_subplot_beat_id);
      if (sBeat) return tokenizeTextWithCharacterRoles(sBeat.description, characters);
    }
    return mystery.title || 'A Mysterious Event';
  };

  // Format-aware generator for a single clue:
  // - 'cctv' / 'physical_prop' -> AI Photo (plus text if empty)
  // - 'audio' -> ElevenLabs Multi-Speaker Voice Note (plus transcript if empty)
  // - 'chat' / 'receipt' / 'document' / etc. -> Structured Text
  const regenerateClueByFormat = async (clue: Clue): Promise<{ shouldAbortBatch?: boolean }> => {
    const fmt: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
    const beatTitle = resolveBeatTitleForClue(clue);
    const rawPrompt =
      clue.generation_prompt?.trim() ||
      (clue.description ? `${clue.title}: ${clue.description}` : clue.title);
    const tokenizedPrompt = tokenizeTextWithCharacterRoles(rawPrompt, characters);
    const tokenizedTitle = tokenizeTextWithCharacterRoles(clue.title, characters);

    if (fmt === 'cctv' || fmt === 'physical_prop') {
      setCurrentlyGeneratingLabel('📸 Generating AI Photo...');

      let activeDescription = clue.description || '';
      if (!activeDescription.trim()) {
        const rawGeneratedDesc = await generateClueDescriptionAction(
          tokenizedTitle,
          beatTitle,
          tokenizedPrompt,
          fmt
        );
        const generatedDesc = tokenizeTextWithCharacterRoles(rawGeneratedDesc, characters);
        activeDescription = generatedDesc;
        await updateClueAction(mysteryId, clue.id, {
          description: generatedDesc,
          format: fmt,
        });
        setCurrentClues((prev) =>
          prev.map((c) => (c.id === clue.id ? { ...c, description: generatedDesc, format: fmt } : c))
        );
      }

      const res = await generateClueImageAction(clue.id, mysteryId, rawPrompt);
      if (res?.success && res.imageUrl) {
        setCurrentClues((prev) =>
          prev.map((c) => (c.id === clue.id ? { ...c, static_image_url: res.imageUrl } : c))
        );
      } else if (res?.error) {
        setGenerationError(`[${clue.title}] Photo Error: ${res.error}`);
        if (
          res.error.toLowerCase().includes('prepayment') ||
          res.error.toLowerCase().includes('credits') ||
          res.error.toLowerCase().includes('billing')
        ) {
          return { shouldAbortBatch: true };
        }
      }
      return {};
    }

    if (fmt === 'audio') {
      setCurrentlyGeneratingLabel('🎙️ Synthesizing Voice Note...');

      let transcript = clue.description || '';
      if (!transcript.trim()) {
        const rawTranscript = await generateClueDescriptionAction(
          tokenizedTitle,
          beatTitle,
          tokenizedPrompt,
          'audio'
        );
        transcript = tokenizeTextWithCharacterRoles(rawTranscript, characters);
        await updateClueAction(mysteryId, clue.id, {
          description: transcript,
          format: 'audio',
        });
        setCurrentClues((prev) =>
          prev.map((c) => (c.id === clue.id ? { ...c, description: transcript, format: 'audio' } : c))
        );
      }

      const audioRes = await generateAudioClueAction({
        clueId: clue.id,
        mysteryId,
        transcript,
        voiceRegion: (clue.voice_region as any) || undefined,
        title: clue.title,
      });

      if (audioRes.success && audioRes.audioUrl) {
        setCurrentClues((prev) =>
          prev.map((c) => (c.id === clue.id ? { ...c, audio_url: audioRes.audioUrl } : c))
        );
      } else if (audioRes.error) {
        setGenerationError(`[${clue.title}] Audio Error: ${audioRes.error}`);
      }
      return {};
    }

    // Text-driven digital containers ('chat', 'receipt', 'document', etc.)
    setCurrentlyGeneratingLabel('✨ Writing Clue Content...');
    const rawNewDescription = await generateClueDescriptionAction(
      tokenizedTitle,
      beatTitle,
      tokenizedPrompt,
      fmt
    );
    const newDescription = tokenizeTextWithCharacterRoles(rawNewDescription, characters);
    await updateClueAction(mysteryId, clue.id, {
      description: newDescription,
      format: fmt,
    });
    setCurrentClues((prev) =>
      prev.map((c) => (c.id === clue.id ? { ...c, description: newDescription, format: fmt } : c))
    );
    return {};
  };

  const handleRegenerateSingleClue = async (clue: Clue) => {
    if (isRegenerating || currentlyGeneratingId) return;
    setGenerationError(null);
    setCurrentlyGeneratingId(clue.id);
    try {
      await regenerateClueByFormat(clue);
      router.refresh();
    } catch (e: any) {
      console.error(`Error regenerating clue ${clue.id}:`, e);
      setGenerationError(e?.message || 'Unexpected error regenerating clue.');
    } finally {
      setCurrentlyGeneratingId(null);
      setCurrentlyGeneratingLabel('');
    }
  };

  const handleBatchRegenerate = async (mode: 'all' | 'media_only') => {
    if (isRegenerating) return;
    const targetClues = mode === 'media_only' && mediaClues.length > 0 ? mediaClues : currentClues;
    setIsRegenerating(true);
    setRegeneratingTargetCount(targetClues.length);
    setRegeneratedCount(0);
    setGenerationError(null);
    stopRequestedRef.current = false;

    for (let i = 0; i < targetClues.length; i++) {
      if (stopRequestedRef.current) {
        console.log('Clue generation stopped by user request.');
        break;
      }

      const clue = targetClues[i];
      setCurrentlyGeneratingId(clue.id);

      try {
        await regenerateClueByFormat(clue);
      } catch (e: any) {
        console.error(`Error generating for clue ${clue.id}:`, e);
        setGenerationError(e?.message || 'Unexpected error generating clue.');
      }

      setRegeneratedCount((prev) => prev + 1);
      await new Promise((r) => setTimeout(r, 1500));
    }

    setCurrentlyGeneratingId(null);
    setCurrentlyGeneratingLabel('');
    setIsRegenerating(false);
    stopRequestedRef.current = false;
    router.refresh();
  };

  const isClueFake = (clue: Clue) =>
    clue.evidence_status === 'fake' ||
    clue.implication_type === 'red_herring' ||
    (!clue.linked_plot_beat_id && !clue.linked_subplot_beat_id);

  const extractClueOrderCode = (clue: Clue): number => {
    const match = (clue.internal_notes || '').match(/\[CODE:R\d+-C(\d+)\]/i);
    return match ? parseInt(match[1], 10) : 999;
  };

  // Group clues by round number (1, 2, 3, 4, etc.) and sort by C1, C2...
  const cluesByRound = useMemo(() => {
    const grouped: Record<number, Clue[]> = { 1: [], 2: [], 3: [], 4: [] };
    currentClues.forEach((clue) => {
      const round = clue.round_number || 1;
      if (!grouped[round]) grouped[round] = [];
      grouped[round].push(clue);
    });
    Object.keys(grouped).forEach((r) => {
      grouped[Number(r)].sort((a, b) => extractClueOrderCode(a) - extractClueOrderCode(b));
    });
    return grouped;
  }, [currentClues]);

  const totalFakeCount = useMemo(
    () => currentClues.filter(isClueFake).length,
    [currentClues]
  );
  const totalRealCount = currentClues.length - totalFakeCount;

  const roundNumbers = useMemo(() => {
    const keys = Object.keys(cluesByRound)
      .map(Number)
      .filter((r) => (cluesByRound[r]?.length || 0) > 0 || r <= 4)
      .sort((a, b) => a - b);
    return keys.length > 0 ? keys : [1, 2, 3, 4];
  }, [cluesByRound]);

  const visibleRounds = selectedRound === 'all' ? roundNumbers : [selectedRound];

  const toggleMenuRound = (round: number) => {
    setExpandedMenuRounds((prev) => ({
      ...prev,
      [round]: !prev[round],
    }));
  };

  const scrollToClue = (clue: Clue) => {
    const round = clue.round_number || 1;
    if (selectedRound !== 'all' && selectedRound !== round) {
      setSelectedRound(round);
      setTimeout(() => {
        document.getElementById(`clue-card-${clue.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } else {
      document.getElementById(`clue-card-${clue.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const placeholders: { type: 'main' | 'subplot'; beatId: string; beatTitle: string }[] = [];

  const totalRealStorylineClues = clues.filter(
    c => c.evidence_status !== 'fake' && Boolean(c.linked_plot_beat_id) && c.implication_type !== 'red_herring'
  ).length;
  const hasFullMainEvidenceSet = beats.length > 0 && totalRealStorylineClues >= beats.length * 2;

  if (!hasFullMainEvidenceSet) {
    beats.forEach(beat => {
      const linkedCluesCount = clues.filter(c => c.linked_plot_beat_id === beat.id).length;
      const required = 2;
      const hydratedBeatTitle = hydrateTextWithCharacters(beat.event_title, characters, 'role');
      for (let i = linkedCluesCount; i < required; i++) {
        placeholders.push({
          type: 'main',
          beatId: beat.id,
          beatTitle: `Beat ${beat.beat_number}: ${hydratedBeatTitle}`,
        });
      }
    });
  }

  const totalSubplotBeats = subplots.reduce(
    (acc, sub) => acc + (sub.subplot_beats?.length || 0),
    0
  );
  const hasFullTotalClueSet =
    clues.length >= beats.length * 2 + totalSubplotBeats && hasFullMainEvidenceSet;

  if (!hasFullTotalClueSet) {
    subplots.forEach(subplot => {
      if (subplot.subplot_beats) {
        subplot.subplot_beats.forEach((sBeat: any) => {
          const linkedCluesCount = clues.filter(c => c.linked_subplot_beat_id === sBeat.id).length;
          const required = 1;
          const hydratedSubTitle = hydrateTextWithCharacters(
            `${subplot.title} - ${sBeat.description}`,
            characters,
            'role'
          );
          for (let i = linkedCluesCount; i < required; i++) {
            placeholders.push({
              type: 'subplot',
              beatId: sBeat.id,
              beatTitle: `Beat ${sBeat.beat_number}: ${hydratedSubTitle}`,
            });
          }
        });
      }
    });
  }

  return (
    <div className="space-y-10">
      {/* Quick Add Bar */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Discovery Log</h3>
          <div className="flex flex-wrap items-center gap-2.5">
            {isRegenerating && (
              <button
                type="button"
                onClick={handleStop}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm animate-pulse cursor-pointer"
              >
                🛑 Stop
              </button>
            )}
            {mediaClues.length > 0 && !isRegenerating && (
              <button
                type="button"
                onClick={() => handleBatchRegenerate('media_only')}
                disabled={isRegenerating || Boolean(currentlyGeneratingId)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Regenerates AI Photos for CCTV/Prop clues and ElevenLabs Audio for Voice Note clues without overwriting existing text threads"
              >
                ⚡ Regenerate Photos &amp; Audio ({mediaClues.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleBatchRegenerate('all')}
              disabled={isRegenerating || Boolean(currentlyGeneratingId)}
              id="gen-clues-btn"
              className={`px-4 py-2 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm cursor-pointer ${
                isRegenerating 
                  ? 'bg-brand-pink cursor-not-allowed opacity-80' 
                  : 'bg-slate-900 hover:bg-brand-blue active:scale-95'
              }`}
              title="Regenerates every clue using its format's generator: AI Photo for CCTV/Props, ElevenLabs Voice Audio for Voice Notes, and AI Structured Text for Chat/Receipt/Document clues"
            >
              {isRegenerating 
                ? `${currentlyGeneratingLabel || 'Generating...'} (${regeneratedCount}/${regeneratingTargetCount || currentClues.length})` 
                : `🔄 Regenerate All Clues (${currentClues.length})`}
            </button>
          </div>
        </div>
        {generationError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold flex items-center justify-between gap-4">
            <span>⚠️ Generation Error: {generationError}</span>
            <button onClick={() => setGenerationError(null)} className="text-red-400 hover:text-red-700 font-black">✕</button>
          </div>
        )}
        <form 
          ref={formRef}
          action={async (formData) => {
            setIsAdding(true);
            const result = await addClueAction(mysteryId, formData);
            formRef.current?.reset();
            setIsAdding(false);
            if (result?.clueId) {
              router.push(`${pathname}?edit=${result.clueId}`);
            }
          }}
          className="flex flex-col md:flex-row gap-4"
        >
          <div className="flex-grow">
            <input 
              name="title"
              required
              placeholder="Evidence Name (e.g. Bloody Knife, Ransom Note)"
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue outline-none font-bold transition-all"
            />
          </div>

          <button 
            disabled={isAdding}
            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10 active:scale-95 whitespace-nowrap disabled:opacity-50"
          >
            {isAdding ? 'Recording...' : '+ Add Evidence'}
          </button>
        </form>
      </div>

      {/* Required Evidence List */}
      {placeholders.length > 0 && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Missing Required Evidence</h3>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 font-bold text-xs rounded-full">{placeholders.length} Remaining</span>
          </div>
          <div className="space-y-3">
            {placeholders.map((ph, index) => (
              <form 
                key={`placeholder-${ph.beatId}-${index}`} 
                action={async (formData) => {
                  try {
                    formData.set('title', 'New Evidence');
                    formData.set('linked_beat', ph.type === 'main' ? `main_${ph.beatId}` : `sub_${ph.beatId}`);
                    const result = await addClueAction(mysteryId, formData);
                    if (result?.clueId) {
                      router.push(`${pathname}?edit=${result.clueId}`);
                    }
                  } catch (err) {
                    console.error('Failed to create clue:', err);
                    alert('Failed to create clue. Check console for details.');
                  }
                }}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${ph.type === 'main' ? 'border-slate-200 hover:border-brand-blue/60 bg-slate-50/50 hover:bg-brand-blue/5' : 'border-brand-pink/20 hover:border-brand-pink/60 bg-brand-pink/5 hover:bg-brand-pink/10'}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform shadow-sm ${ph.type === 'main' ? 'bg-white' : 'bg-white/60'}`}>
                    {ph.type === 'main' ? '🔍' : '🎭'}
                  </div>
                  <div className="text-left">
                    <p className={`font-bold text-xs uppercase tracking-widest mb-1 ${ph.type === 'main' ? 'text-slate-500 group-hover:text-brand-blue' : 'text-brand-pink/70 group-hover:text-brand-pink'}`}>
                      {ph.type === 'main' ? 'Real Storyline Requirement' : 'Subplot Requirement'}
                    </p>
                    <p className="text-slate-700 font-medium text-sm">
                      <span className="font-bold text-slate-900">{ph.beatTitle}</span>
                    </p>
                  </div>
                </div>
                <button type="submit" className={`px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all shrink-0 ${ph.type === 'main' ? 'bg-slate-200 text-slate-600 group-hover:bg-brand-blue group-hover:text-white' : 'bg-brand-pink/20 text-brand-pink group-hover:bg-brand-pink group-hover:text-white'}`}>
                  + Add Clue
                </button>
              </form>
            ))}
          </div>
        </div>
      )}

      {/* Main Split Layout: Left Side Rounds Menu + Right Side Round Clue Sections */}
      {currentClues.length > 0 && (
        <div className="flex flex-col lg:flex-row items-start gap-8">
          {/* Clean Left Side Menu Splitting Clues Across Rounds */}
          <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-32 bg-white border border-slate-100 rounded-[2rem] p-5 shadow-sm space-y-4 max-h-[calc(100vh-9rem)] overflow-y-auto custom-scrollbar">
            <div className="space-y-2 px-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                  Clues by Round
                </span>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {currentClues.length} Total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                  ✓ {totalRealCount} Real
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-100 text-rose-600">
                  🎭 {totalFakeCount} Fake
                </span>
              </div>
            </div>

            {/* All Rounds Button */}
            <button
              type="button"
              onClick={() => setSelectedRound('all')}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                selectedRound === 'all'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span>All Rounds</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  selectedRound === 'all'
                    ? 'bg-white/15 text-white'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {currentClues.length}
              </span>
            </button>

            {/* Round 1, Round 2, Round 3, Round 4 Sections */}
            <div className="space-y-3">
              {roundNumbers.map((roundNum) => {
                const roundClues = cluesByRound[roundNum] || [];
                const isSelected = selectedRound === roundNum;
                const isExpanded = expandedMenuRounds[roundNum] ?? true;

                return (
                  <div
                    key={roundNum}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isSelected
                        ? 'border-brand-pink/40 bg-brand-pink/5'
                        : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRound(isSelected ? 'all' : roundNum)
                        }
                        className="flex items-center gap-2.5 text-left flex-grow cursor-pointer"
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-brand-pink' : 'bg-slate-400'
                          }`}
                        />
                        <span
                          className={`text-xs font-black uppercase tracking-wider ${
                            isSelected ? 'text-brand-pink' : 'text-slate-900'
                          }`}
                        >
                          Round {roundNum}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            isSelected
                              ? 'bg-brand-pink text-white'
                              : 'bg-slate-200/80 text-slate-600'
                          }`}
                        >
                          {roundClues.length}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleMenuRound(roundNum)}
                        className="p-1 text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={isExpanded ? 'Collapse clue list' : 'Expand clue list'}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </div>

                    {isExpanded && roundClues.length > 0 && (
                      <div className="px-2 pb-2.5 pt-1 border-t border-slate-100/80 space-y-1">
                        {roundClues.map((clue, idx) => {
                          const resolvedFormat: ClueFormat =
                            (clue.format as ClueFormat) || inferClueFormat(clue);
                          const formatOption = CLUE_FORMAT_OPTIONS.find(
                            (o) => o.value === resolvedFormat
                          );
                          const cleanTitle =
                            stripCustomerFacingTitle(
                              hydrateTextWithCharacters(
                                clue.title || 'Evidence',
                                characters,
                                'role'
                              )
                            ) || 'Evidence';

                          const isFake =
                            clue.evidence_status === 'fake' ||
                            clue.implication_type === 'red_herring' ||
                            (!clue.linked_plot_beat_id && !clue.linked_subplot_beat_id);

                          return (
                            <button
                              key={clue.id}
                              type="button"
                              onClick={() => scrollToClue(clue)}
                              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-left hover:bg-white hover:shadow-xs transition-all group cursor-pointer"
                            >
                              <span className="text-[10px] font-mono font-bold text-slate-400 shrink-0 w-4">
                                {idx + 1}.
                              </span>
                              <span className="text-xs shrink-0">
                                {formatOption?.icon || '🔍'}
                              </span>
                              <span className="text-[11px] font-bold text-slate-700 group-hover:text-slate-950 truncate flex-grow">
                                {cleanTitle}
                              </span>
                              <span
                                className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md shrink-0 ${
                                  isFake
                                    ? 'bg-rose-100 text-rose-600'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {isFake ? 'Fake' : 'Real'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Right Side: Clue Cards Split by Round */}
          <div className="flex-1 min-w-0 space-y-12 w-full">
            {visibleRounds.map((roundNum) => {
              const roundClues = cluesByRound[roundNum] || [];
              if (roundClues.length === 0) return null;

              return (
                <section key={roundNum} id={`round-section-${roundNum}`} className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 px-1">
                    <div className="flex items-center gap-3">
                      <span className="px-3.5 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black uppercase tracking-widest">
                        Round {roundNum}
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {roundClues.length} {roundClues.length === 1 ? 'Clue' : 'Clues'}
                      </span>
                    </div>
                    {selectedRound !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setSelectedRound('all')}
                        className="text-xs font-bold text-brand-pink hover:underline cursor-pointer"
                      >
                        Show All Rounds
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {roundClues.map((clue) => (
                      <ClueCard 
                        key={clue.id} 
                        clue={clue} 
                        mysteryId={mysteryId} 
                        beats={beats}
                        characters={characters}
                        subplots={subplots}
                        isGenerating={currentlyGeneratingId === clue.id}
                        generatingLabel={currentlyGeneratingId === clue.id ? currentlyGeneratingLabel : undefined}
                        onRegenerateClue={handleRegenerateSingleClue}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
