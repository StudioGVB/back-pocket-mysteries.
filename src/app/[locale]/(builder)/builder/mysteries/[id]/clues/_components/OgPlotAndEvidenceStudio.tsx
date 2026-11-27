'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { Database, ClueFormat } from '@/types/database';
import {
  HighlightedMysteryText,
  getCharacterPillStyle,
} from '@/components/builder/HighlightedMysteryText';
import {
  getCharacterRoleTitle,
  hydrateTextWithCharacters,
  tokenizeTextWithCharacterRoles,
} from '@/utils/hydration';
import {
  CLUE_FORMAT_OPTIONS,
  inferClueFormat,
  stripCustomerFacingTitle,
} from '@/utils/clue-format';
import { ClueRenderer } from '@/components/clues/ClueRenderer';
import { generateClueImageAction } from '@/app/actions/generator';
import { generateAudioClueAction } from '@/app/actions/audio-generator';
import {
  extractClueVerificationStamp,
  embedClueVerificationStamp,
} from '@/utils/clue-verification';
import { verifySingleClueCompleteAction } from '@/app/actions/clue-verifier';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface OgPlotAndEvidenceStudioProps {
  mystery: Mystery;
  mysteryId: string;
  clues: Clue[];
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
}

export function OgPlotAndEvidenceStudio({
  mystery,
  mysteryId,
  clues: initialClues,
  beats,
  characters,
  subplots = [],
}: OgPlotAndEvidenceStudioProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const [clues, setClues] = useState<Clue[]>(initialClues);
  const [activeSection, setActiveSection] = useState<
    'all' | 'plot_beats' | 'red_herrings' | 'evidence_deck'
  >('all');
  const [selectedRound, setSelectedRound] = useState<number | 'all'>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<
    'all' | 'real' | 'decoy' | 'media'
  >('all');
  const [generatingClueId, setGeneratingClueId] = useState<string | null>(null);
  const [verifyingClueId, setVerifyingClueId] = useState<string | null>(null);
  const [isBatchVerifying, setIsBatchVerifying] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState<string>('');
  const [isBatchGeneratingMedia, setIsBatchGeneratingMedia] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number }>({
    done: 0,
    total: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sortedBeats = useMemo(
    () =>
      [...beats].sort(
        (a, b) =>
          (a.sort_order ?? a.beat_number ?? 0) -
          (b.sort_order ?? b.beat_number ?? 0)
      ),
    [beats]
  );

  const isFakeOrRedHerring = (clue: Clue) =>
    clue.evidence_status === 'fake' ||
    clue.implication_type === 'red_herring' ||
    Boolean(clue.linked_subplot_beat_id && !clue.linked_plot_beat_id);

  const realClues = useMemo(
    () => clues.filter((c) => !isFakeOrRedHerring(c)),
    [clues]
  );
  const decoyClues = useMemo(
    () => clues.filter((c) => isFakeOrRedHerring(c)),
    [clues]
  );

  const mediaClues = useMemo(
    () =>
      clues.filter((c) => {
        const fmt = (c.format as ClueFormat) || inferClueFormat(c);
        return fmt === 'cctv' || fmt === 'physical_prop' || fmt === 'audio';
      }),
    [clues]
  );

  const availableRounds = useMemo(() => {
    const rSet = new Set<number>([1, 2, 3]);
    clues.forEach((c) => {
      if (c.round_number) rSet.add(c.round_number);
    });
    return Array.from(rSet).sort((a, b) => a - b);
  }, [clues]);

  const handleVerifySingleClue = async (clue: Clue) => {
    if (verifyingClueId || generatingClueId || isBatchVerifying || isBatchGeneratingMedia) return;
    setErrorMsg(null);
    setVerifyingClueId(clue.id);
    setGeneratingStatus(`🛡️ Auditing Clue Details (Cast, Outfits, Names, Accent & Logic): ${clue.title}...`);
    try {
      const res = await verifySingleClueCompleteAction(mysteryId, clue.id);
      if (res.success && res.stamp) {
        setClues((prev) =>
          prev.map((c) =>
            c.id === clue.id
              ? {
                  ...c,
                  ...(res.healedDescription ? { description: res.healedDescription } : {}),
                  internal_notes: embedClueVerificationStamp(c.internal_notes, res.stamp!),
                }
              : c
          )
        );
        router.refresh();
      } else if (res.error) {
        setErrorMsg(`[${clue.title}] ${res.error}`);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Verification failed.');
    } finally {
      setVerifyingClueId(null);
      setGeneratingStatus('');
    }
  };

  const handleBatchVerifyAllClues = async () => {
    if (isBatchVerifying || isBatchGeneratingMedia || generatingClueId || verifyingClueId) return;
    setIsBatchVerifying(true);
    setErrorMsg(null);
    setBatchProgress({ done: 0, total: clues.length });

    try {
      for (let i = 0; i < clues.length; i++) {
        const clue = clues[i];
        setVerifyingClueId(clue.id);
        setGeneratingStatus(`🛡️ (${i + 1}/${clues.length}) Auditing Clue: ${clue.title}`);
        const res = await verifySingleClueCompleteAction(mysteryId, clue.id);
        if (res.success && res.stamp) {
          setClues((prev) =>
            prev.map((c) =>
              c.id === clue.id
                ? {
                    ...c,
                    ...(res.healedDescription ? { description: res.healedDescription } : {}),
                    internal_notes: embedClueVerificationStamp(c.internal_notes, res.stamp!),
                  }
                : c
            )
          );
        }
        setBatchProgress({ done: i + 1, total: clues.length });
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Batch verification interrupted.');
    } finally {
      setVerifyingClueId(null);
      setGeneratingStatus('');
      setIsBatchVerifying(false);
    }
  };

  const handleRegenerateMedia = async (clue: Clue) => {
    if (generatingClueId || isBatchGeneratingMedia || verifyingClueId) return;
    const fmt: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
    setErrorMsg(null);
    setGeneratingClueId(clue.id);

    try {
      if (fmt === 'cctv' || fmt === 'physical_prop') {
        setGeneratingStatus('📸 Generating & Rescanning AI Clue Photo (Checking Cast & Profile Outfits)...');
        const rawPrompt =
          clue.generation_prompt?.trim() ||
          (clue.description ? `${clue.title}: ${clue.description}` : clue.title);
        const res = await generateClueImageAction(clue.id, mysteryId, rawPrompt);
        if (res?.success && res.imageUrl) {
          setClues((prev) =>
            prev.map((c) =>
              c.id === clue.id
                ? {
                    ...c,
                    static_image_url: res.imageUrl!,
                    ...((res as any).verificationStamp
                      ? {
                          internal_notes: embedClueVerificationStamp(
                            c.internal_notes,
                            (res as any).verificationStamp
                          ),
                        }
                      : {}),
                  }
                : c
            )
          );
          router.refresh();
        } else if (res?.error) {
          setErrorMsg(`[${clue.title}] ${res.error}`);
        }
      } else if (fmt === 'audio') {
        setGeneratingStatus('🎙️ Synthesizing & Rescanning Voice Wiretap (Checking Accent, Gender & Speaker)...');
        const transcript = clue.description || clue.generation_prompt || clue.title;
        const audioRes = await generateAudioClueAction({
          clueId: clue.id,
          mysteryId,
          transcript,
          voiceRegion: (clue.voice_region as any) || undefined,
          title: clue.title,
        });
        if (audioRes?.success && audioRes.audioUrl) {
          setClues((prev) =>
            prev.map((c) =>
              c.id === clue.id
                ? {
                    ...c,
                    audio_url: audioRes.audioUrl!,
                    ...(audioRes.verificationStamp
                      ? {
                          internal_notes: embedClueVerificationStamp(
                            c.internal_notes,
                            audioRes.verificationStamp
                          ),
                        }
                      : {}),
                  }
                : c
            )
          );
          router.refresh();
        } else if (audioRes?.error) {
          setErrorMsg(`[${clue.title}] ${audioRes.error}`);
        }
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to regenerate media asset.');
    } finally {
      setGeneratingClueId(null);
      setGeneratingStatus('');
    }
  };

  const handleBatchSynthesizeMedia = async () => {
    if (isBatchGeneratingMedia || generatingClueId || mediaClues.length === 0) return;
    setIsBatchGeneratingMedia(true);
    setErrorMsg(null);
    setBatchProgress({ done: 0, total: mediaClues.length });

    try {
      for (let i = 0; i < mediaClues.length; i++) {
        const clue = mediaClues[i];
        const fmt: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
        setGeneratingClueId(clue.id);

        if (fmt === 'cctv' || fmt === 'physical_prop') {
          setGeneratingStatus(`📸 (${i + 1}/${mediaClues.length}) Photo + Vision Rescan: ${clue.title}`);
          const rawPrompt =
            clue.generation_prompt?.trim() ||
            (clue.description ? `${clue.title}: ${clue.description}` : clue.title);
          const res = await generateClueImageAction(clue.id, mysteryId, rawPrompt);
          if (res?.success && res.imageUrl) {
            setClues((prev) =>
              prev.map((c) =>
                c.id === clue.id
                  ? {
                      ...c,
                      static_image_url: res.imageUrl!,
                      ...((res as any).verificationStamp
                        ? {
                            internal_notes: embedClueVerificationStamp(
                              c.internal_notes,
                              (res as any).verificationStamp
                            ),
                          }
                        : {}),
                    }
                  : c
              )
            );
          }
        } else if (fmt === 'audio') {
          setGeneratingStatus(`🎙️ (${i + 1}/${mediaClues.length}) Audio + Accent/Gender Check: ${clue.title}`);
          const transcript = clue.description || clue.generation_prompt || clue.title;
          const audioRes = await generateAudioClueAction({
            clueId: clue.id,
            mysteryId,
            transcript,
            voiceRegion: (clue.voice_region as any) || undefined,
            title: clue.title,
          });
          if (audioRes?.success && audioRes.audioUrl) {
            setClues((prev) =>
              prev.map((c) =>
                c.id === clue.id
                  ? {
                      ...c,
                      audio_url: audioRes.audioUrl!,
                      ...(audioRes.verificationStamp
                        ? {
                            internal_notes: embedClueVerificationStamp(
                              c.internal_notes,
                              audioRes.verificationStamp
                            ),
                          }
                        : {}),
                    }
                  : c
              )
            );
          }
        }
        setBatchProgress({ done: i + 1, total: mediaClues.length });
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Batch media synthesis interrupted.');
    } finally {
      setGeneratingClueId(null);
      setGeneratingStatus('');
      setIsBatchGeneratingMedia(false);
    }
  };

  const renderClueCard = (clue: Clue, compact = false) => {
    const fmt: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
    const fmtMeta =
      CLUE_FORMAT_OPTIONS.find((o) => o.value === fmt) || CLUE_FORMAT_OPTIONS[0];
    const isDecoy = isFakeOrRedHerring(clue);
    const isGeneratingThis = generatingClueId === clue.id;
    const isVerifyingThis = verifyingClueId === clue.id;
    const isPhotoClue = fmt === 'cctv' || fmt === 'physical_prop';
    const isAudioClue = fmt === 'audio';
    const verificationStamp = extractClueVerificationStamp(clue.internal_notes);

    const linkedBeat = clue.linked_plot_beat_id
      ? sortedBeats.find((b) => b.id === clue.linked_plot_beat_id)
      : null;

    const hydratedTitle =
      stripCustomerFacingTitle(
        hydrateTextWithCharacters(clue.title || 'Evidence', characters, 'role')
      ) || 'Evidence';
    const hydratedDesc = hydrateTextWithCharacters(
      clue.description || '',
      characters,
      'role'
    );

    return (
      <div
        key={clue.id}
        className={`rounded-3xl border transition-all bg-white shadow-xs overflow-hidden flex flex-col justify-between ${
          isDecoy
            ? 'border-amber-200/90 hover:border-amber-300'
            : 'border-slate-200/90 hover:border-slate-300'
        }`}
      >
        <div className="p-5 sm:p-6 space-y-4">
          {/* Top Metadata Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                Round {clue.round_number || 1}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                {fmtMeta.icon} {fmtMeta.label}
              </span>
              <span
                className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                  isDecoy
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                {isDecoy ? '🐟 Red-Herring Decoy' : '🎯 Real Murder Clue'}
              </span>
              {clue.is_essential && (
                <span className="px-2 py-0.5 rounded-md bg-brand-pink/10 text-brand-pink text-[9px] font-black uppercase tracking-widest border border-brand-pink/20">
                  ★ Essential
                </span>
              )}
            </div>

            {/* Media Asset Status Badge */}
            {isPhotoClue && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  clue.static_image_url
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {clue.static_image_url ? '✓ AI Photo Ready' : '⚠️ Missing Photo'}
              </span>
            )}
            {isAudioClue && (
              <span
                className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  clue.audio_url
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}
              >
                {clue.audio_url ? '✓ Voice MP3 Ready' : '⚠️ Missing Voice MP3'}
              </span>
            )}
          </div>

          {/* Clue Title & Linked Beat */}
          <div>
            <h4 className="text-base font-black text-slate-900 leading-snug">
              <HighlightedMysteryText text={clue.title} characters={characters} />
            </h4>
            {linkedBeat && !compact && (
              <div className="mt-1.5 text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                <span className="text-emerald-600 font-black uppercase tracking-wider">
                  Linked Plot Beat:
                </span>
                <HighlightedMysteryText
                  text={linkedBeat.event_title}
                  characters={characters}
                />
              </div>
            )}
          </div>

          {/* RENDERED CLUE VIEW (Dark Slate-950 Frame - Chat, Receipt, CCTV, Audio, Document, Prop) */}
          <div className="rounded-3xl bg-slate-950 text-white p-4 border border-slate-800/90 shadow-lg relative overflow-hidden">
            {(isGeneratingThis || isVerifyingThis) && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2 p-4 text-center">
                <div className="w-8 h-8 border-3 border-brand-pink border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  {generatingStatus || 'Auditing Clue Details...'}
                </span>
              </div>
            )}
            <ClueRenderer
              clue={clue as any}
              hydratedTitle={hydratedTitle}
              hydratedDescription={hydratedDesc}
              characters={characters}
              compact={true}
              showImage={true}
            />
          </div>

          {/* AI POST-GENERATION VERIFICATION RECEIPT */}
          {verificationStamp && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-900 flex items-center gap-1.5">
                  🛡️ AI Post-Gen Audit Passed (0 Fabrications)
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  {verificationStamp.textCheck && (
                    <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">
                      ✓ Names &amp; Pronouns
                    </span>
                  )}
                  {verificationStamp.photoCheck && (
                    <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">
                      ✓ Cast &amp; Profile Outfits
                    </span>
                  )}
                  {verificationStamp.audioCheck && (
                    <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 border border-emerald-200 text-[9px] font-black uppercase tracking-wider">
                      ✓ Accent, Gender &amp; Voice
                    </span>
                  )}
                </div>
              </div>
              <div className="text-[11px] font-medium text-emerald-900 space-y-1">
                {verificationStamp.photoCheck?.summary && (
                  <p>📸 <strong>Photo Rescan:</strong> {verificationStamp.photoCheck.summary}</p>
                )}
                {verificationStamp.audioCheck?.summary && (
                  <p>🎙️ <strong>Audio Rescan:</strong> {verificationStamp.audioCheck.summary}</p>
                )}
                {verificationStamp.textCheck?.summary && (
                  <p>📝 <strong>Text &amp; Plot Fact-Check:</strong> {verificationStamp.textCheck.summary}</p>
                )}
              </div>
            </div>
          )}

          {/* OG Blueprint Tokenized Script / Evidence Copy with Color-Coded Character Pills */}
          {clue.description && (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                OG Blueprint Tokenized Script (Color-Coded Roles)
              </div>
              <div className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-wrap">
                <HighlightedMysteryText
                  text={clue.description}
                  characters={characters}
                />
              </div>
            </div>
          )}

          {/* Visual / Audio Prompt if present */}
          {clue.generation_prompt && (isPhotoClue || isAudioClue) && (
            <div className="p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1">
              <div className="text-[9px] font-black uppercase tracking-widest text-indigo-500">
                {isPhotoClue ? '📸 AI Visual Prompt' : '🎙️ Voice Synthesis Prompt'}
              </div>
              <div className="text-[11px] text-slate-700 font-medium leading-relaxed">
                <HighlightedMysteryText
                  text={clue.generation_prompt}
                  characters={characters}
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Bar: Media Regeneration + Per-Clue Verifier + OG Builder Link */}
        <div className="px-5 py-3.5 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {isPhotoClue ? (
              <button
                type="button"
                disabled={Boolean(generatingClueId) || isBatchGeneratingMedia || Boolean(verifyingClueId)}
                onClick={() => handleRegenerateMedia(clue)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-brand-pink disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                {isGeneratingThis
                  ? '⏳ Rendering & Auditing Photo...'
                  : clue.static_image_url
                    ? '🎨 Regenerate Clue Photo'
                    : '📸 Generate AI Clue Photo'}
              </button>
            ) : isAudioClue ? (
              <button
                type="button"
                disabled={Boolean(generatingClueId) || isBatchGeneratingMedia || Boolean(verifyingClueId)}
                onClick={() => handleRegenerateMedia(clue)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                {isGeneratingThis
                  ? '⏳ Synthesizing & Auditing Voice...'
                  : clue.audio_url
                    ? '🔊 Regenerate Voice Wiretap'
                    : '🎙️ Synthesize Voice Wiretap'}
              </button>
            ) : null}

            <button
              type="button"
              disabled={Boolean(verifyingClueId) || Boolean(generatingClueId) || isBatchVerifying || isBatchGeneratingMedia}
              onClick={() => handleVerifySingleClue(clue)}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
            >
              {isVerifyingThis
                ? '⏳ Auditing Clue...'
                : verificationStamp
                  ? '🛡️ Re-Verify Clue'
                  : '🛡️ Verify Clue Details'}
            </button>
          </div>

          <Link
            href={`/${locale}/admin/mysteries/architect?load=${mysteryId}`}
            className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-brand-pink transition-colors"
          >
            ✏️ Edit Text in OG Builder ↗
          </Link>
        </div>
      </div>
    );
  };

  const filteredDeckClues = useMemo(() => {
    return clues.filter((c) => {
      if (selectedRound !== 'all' && (c.round_number || 1) !== selectedRound) {
        return false;
      }
      if (evidenceFilter === 'real' && isFakeOrRedHerring(c)) return false;
      if (evidenceFilter === 'decoy' && !isFakeOrRedHerring(c)) return false;
      if (evidenceFilter === 'media') {
        const fmt = (c.format as ClueFormat) || inferClueFormat(c);
        if (fmt !== 'cctv' && fmt !== 'physical_prop' && fmt !== 'audio') return false;
      }
      return true;
    });
  }, [clues, selectedRound, evidenceFilter]);

  return (
    <div className="space-y-10 pb-20">
      {/* OG Base Builder Source-of-Truth Banner & Character Legend */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                🔒 Story Synced with OG Base Builder
              </span>
              <span className="text-xs font-bold text-slate-500">
                {sortedBeats.length} Main Plot Beats • {subplots.length} Red-Herring Subplots •{' '}
                {clues.length} Total Clues ({realClues.length} Real / {decoyClues.length} Decoys)
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Every generated clue runs an automatic <strong>Post-Generation AI Audit</strong> (rescanning photos against profile portraits &amp; outfits, checking guest names/pronouns, and verifying audio accents &amp; speaker gender).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isBatchVerifying || isBatchGeneratingMedia || Boolean(generatingClueId) || Boolean(verifyingClueId)}
              onClick={handleBatchVerifyAllClues}
              className="px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xs cursor-pointer"
            >
              {isBatchVerifying
                ? `⏳ Auditing All Clues (${batchProgress.done}/${batchProgress.total})...`
                : `🛡️ Audit All Clues (${clues.length})`}
            </button>
            {mediaClues.length > 0 && (
              <button
                type="button"
                disabled={isBatchGeneratingMedia || isBatchVerifying || Boolean(generatingClueId) || Boolean(verifyingClueId)}
                onClick={handleBatchSynthesizeMedia}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xs cursor-pointer"
              >
                {isBatchGeneratingMedia
                  ? `⏳ Synthesizing Media (${batchProgress.done}/${batchProgress.total})...`
                  : `🎨 Synthesize All Media Clues (${mediaClues.length})`}
              </button>
            )}
            <Link
              href={`/${locale}/admin/mysteries/architect?load=${mysteryId}`}
              className="px-4 py-2.5 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-xs"
            >
              ✨ Edit Plot &amp; Clues in OG Base Builder ↗
            </Link>
          </div>
        </div>

        {/* Color-Coded Character Pill Key (Same as OG Base Builder) */}
        {characters.length > 0 && (
          <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">
              Cast Color Key:
            </span>
            {characters.map((char) => {
              const roleTitle = getCharacterRoleTitle(char);
              const style = getCharacterPillStyle(characters, char);
              const roleBadge = char.is_victim
                ? '💀 Victim'
                : char.plot_role === 'killer'
                  ? '🔪 Killer'
                  : char.plot_role === 'assistant'
                    ? '🤝 Accomplice'
                    : '';
              return (
                <span
                  key={char.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${style.bg} ${style.text} ${style.border}`}
                >
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span>{roleTitle}</span>
                  {roleBadge && (
                    <span className="text-[10px] opacity-85 ml-0.5">({roleBadge})</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {generatingStatus && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs font-black text-indigo-900 flex items-center justify-between">
            <span>{generatingStatus}</span>
            {isBatchGeneratingMedia && (
              <span>
                {batchProgress.done} / {batchProgress.total}
              </span>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">
            ⚠️ {errorMsg}
          </div>
        )}
      </div>

      {/* View Switcher Bar (Mirrors OG Base Builder Steps) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: '✨ Full OG Blueprint View' },
            {
              id: 'plot_beats',
              label: `1. Main Murder Plot & Clues (${sortedBeats.length} Beats)`,
            },
            {
              id: 'red_herrings',
              label: `2. Red-Herring Subplots (${subplots.length} Arcs • ${decoyClues.length} Decoys)`,
            },
            {
              id: 'evidence_deck',
              label: `3. Round-by-Round Evidence Deck (${clues.length} Clues)`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSection(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeSection === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: MAIN MURDER PLOT TIMELINE & LINKED REAL CLUES */}
      {(activeSection === 'all' || activeSection === 'plot_beats') && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-slate-900">
                  1. Main Murder Plot Timeline &amp; Linked Clues
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Chronological chain of real murder events and the forensic clues that prove each beat.
              </p>
            </div>
            <Link
              href={`/${locale}/admin/mysteries/architect?load=${mysteryId}`}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              ✏️ Edit Plot Beats in OG Builder ↗
            </Link>
          </div>

          {sortedBeats.length === 0 ? (
            <div className="p-12 rounded-3xl bg-white border border-dashed border-slate-200 text-center space-y-2">
              <p className="text-sm font-black text-slate-700">No Main Plot Beats Found</p>
              <p className="text-xs text-slate-500">
                Open this mystery in the OG Base Builder to author the chronological murder timeline.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedBeats.map((beat, idx) => {
                const beatClues = clues.filter(
                  (c) => c.linked_plot_beat_id === beat.id
                );
                const beatTimestamp =
                  (beat as any).time_marker || (beat as any).timestamp || null;

                return (
                  <div
                    key={beat.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-slate-100 pb-5">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest">
                            Plot Beat #{idx + 1}
                          </span>
                          {beatTimestamp && (
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-widest border border-slate-200">
                              🕒 {beatTimestamp}
                            </span>
                          )}
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-200">
                            {beatClues.length} Linked {beatClues.length === 1 ? 'Clue' : 'Clues'}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900">
                          <HighlightedMysteryText
                            text={beat.event_title}
                            characters={characters}
                          />
                        </h3>
                        {beat.description && (
                          <div className="text-sm text-slate-700 font-medium leading-relaxed">
                            <HighlightedMysteryText
                              text={beat.description}
                              characters={characters}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Clues Proving This Plot Beat */}
                    {beatClues.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Forensic Evidence Linked to Beat #{idx + 1}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {beatClues.map((clue) => renderClueCard(clue, true))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs font-bold text-slate-400">
                        No clues directly linked to this beat ID — see full evidence deck below.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* SECTION 2: RED-HERRING SUBPLOTS & DECOY CLUES */}
      {(activeSection === 'all' || activeSection === 'red_herrings') && (
        <section className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-slate-900">
                  2. Red-Herring Subplots &amp; Decoy Clues
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Suspicious side scandals and decoy evidence that deflect early suspicion away from the true killer.
              </p>
            </div>
            <Link
              href={`/${locale}/admin/mysteries/architect?load=${mysteryId}`}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              ✏️ Edit Red Herrings in OG Builder ↗
            </Link>
          </div>

          {subplots.length > 0 ? (
            <div className="space-y-6">
              {subplots.map((sub: any, sIdx: number) => {
                const subBeats = Array.isArray(sub.subplot_beats)
                  ? sub.subplot_beats
                  : [];
                const subBeatIds = new Set(subBeats.map((sb: any) => sb.id));
                const linkedDecoys = clues.filter(
                  (c) =>
                    c.linked_subplot_beat_id &&
                    subBeatIds.has(c.linked_subplot_beat_id)
                );

                return (
                  <div
                    key={sub.id || sIdx}
                    className="bg-white rounded-3xl border border-amber-200/90 p-6 sm:p-8 shadow-xs space-y-6"
                  >
                    <div className="space-y-2 border-b border-amber-100 pb-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                          🐟 Red-Herring Subplot #{sIdx + 1}
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 text-[10px] font-black uppercase tracking-widest border border-amber-200">
                          {subBeats.length} Subplot Beats • {linkedDecoys.length} Linked Decoy Clues
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-900">
                        <HighlightedMysteryText
                          text={sub.title}
                          characters={characters}
                        />
                      </h3>
                      {sub.synopsis && (
                        <div className="text-sm text-slate-700 font-medium leading-relaxed">
                          <HighlightedMysteryText
                            text={sub.synopsis}
                            characters={characters}
                          />
                        </div>
                      )}
                    </div>

                    {subBeats.length > 0 && (
                      <div className="space-y-2.5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Subplot Narrative Beats
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {subBeats.map((sb: any, bIdx: number) => (
                            <div
                              key={sb.id || bIdx}
                              className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs text-slate-800 font-medium leading-relaxed"
                            >
                              <span className="font-black text-amber-900 mr-1.5">
                                Beat #{bIdx + 1}:
                              </span>
                              <HighlightedMysteryText
                                text={sb.description}
                                characters={characters}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {linkedDecoys.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                          Decoy Clues Linked to Subplot #{sIdx + 1}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                          {linkedDecoys.map((clue) => renderClueCard(clue, true))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Also display any standalone decoy clues not linked to a specific subplot beat ID */}
          {(() => {
            const allSubBeatIds = new Set(
              subplots.flatMap((s: any) =>
                (s.subplot_beats || []).map((sb: any) => sb.id)
              )
            );
            const unlinkedDecoys = decoyClues.filter(
              (c) => !c.linked_subplot_beat_id || !allSubBeatIds.has(c.linked_subplot_beat_id)
            );
            if (unlinkedDecoys.length === 0) return null;
            return (
              <div className="space-y-4">
                <div className="text-xs font-black uppercase tracking-widest text-amber-800">
                  🐟 Decoy &amp; Red-Herring Clues ({unlinkedDecoys.length})
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {unlinkedDecoys.map((clue) => renderClueCard(clue))}
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* SECTION 3: ROUND-BY-ROUND EVIDENCE DECK */}
      {(activeSection === 'all' || activeSection === 'evidence_deck') && (
        <section className="space-y-6 pt-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-pink" />
                <h2 className="text-base font-black uppercase tracking-[0.15em] text-slate-900">
                  3. Round-by-Round Evidence Deck ({filteredDeckClues.length} Clues)
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Inspect every clue card by investigation round, preview the live player UI, and regenerate AI photos or voice wiretaps.
              </p>
            </div>

            {/* Round & Type Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setSelectedRound('all')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    selectedRound === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  All Rounds ({clues.length})
                </button>
                {availableRounds.map((r) => {
                  const rCount = clues.filter(
                    (c) => (c.round_number || 1) === r
                  ).length;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedRound(r)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                        selectedRound === r
                          ? 'bg-brand-pink text-white'
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      Round {r} ({rCount})
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1">
                {[
                  { id: 'all', label: 'All Types' },
                  { id: 'real', label: `🎯 Real (${realClues.length})` },
                  { id: 'decoy', label: `🐟 Decoys (${decoyClues.length})` },
                  { id: 'media', label: `🎨 Photo/Audio (${mediaClues.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEvidenceFilter(f.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      evidenceFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredDeckClues.map((clue) => renderClueCard(clue))}
          </div>
        </section>
      )}
    </div>
  );
}
