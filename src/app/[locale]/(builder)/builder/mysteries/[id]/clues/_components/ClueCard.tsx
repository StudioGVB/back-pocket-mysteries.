'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Database, ClueFormat } from '@/types/database';
import { updateClueAction, removeClueAction } from '../actions';
import { ClueEditor } from './ClueEditor';
import { hydrateTextWithCharacters } from '@/utils/hydration';
import { CLUE_FORMAT_OPTIONS, inferClueFormat, stripCustomerFacingTitle } from '@/utils/clue-format';
import { ChatClueView } from '@/components/clues/ChatClueView';
import { ReceiptClueView } from '@/components/clues/ReceiptClueView';
import { DocumentClueView } from '@/components/clues/DocumentClueView';
import { CctvClueView } from '@/components/clues/CctvClueView';
import { AudioClueView } from '@/components/clues/AudioClueView';
import { PropClueView } from '@/components/clues/PropClueView';
import { SearchLogClueView } from '@/components/clues/SearchLogClueView';
import { SocialClueView } from '@/components/clues/SocialClueView';
import { NoteClueView } from '@/components/clues/NoteClueView';
import { MedicalClueView } from '@/components/clues/MedicalClueView';
import { CallSheetClueView } from '@/components/clues/CallSheetClueView';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueCardProps {
  clue: Clue;
  mysteryId: string;
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
  isGenerating?: boolean;
  generatingLabel?: string;
  onRegenerateClue?: (clue: Clue) => void;
}

export function ClueCard({
  clue,
  mysteryId,
  beats,
  characters,
  subplots = [],
  isGenerating,
  generatingLabel,
  onRegenerateClue,
}: ClueCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === clue.id);

  useEffect(() => {
    if (searchParams.get('edit') === clue.id) {
      setIsEditing(true);
    }
  }, [searchParams, clue.id]);

  const handleCloseEditor = () => {
    setIsEditing(false);
    if (searchParams.get('edit') === clue.id) {
      router.replace(pathname);
    }
  };

  const linkedBeat = beats.find(b => b.id === clue.linked_plot_beat_id);
  const linkedSubplotBeat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === clue.linked_subplot_beat_id);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setIsEditing(true);
  };

  const resolvedFormat: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
  const formatOption = CLUE_FORMAT_OPTIONS.find(o => o.value === resolvedFormat);

  const regenActionLabel =
    resolvedFormat === 'cctv' || resolvedFormat === 'physical_prop'
      ? '📸 Regenerate AI Photo'
      : resolvedFormat === 'audio'
      ? '🎙️ Regenerate Voice Audio'
      : '✨ Regenerate Clue Text';

  const defaultGeneratingStatus =
    resolvedFormat === 'cctv' || resolvedFormat === 'physical_prop'
      ? '📸 Generating AI Photo...'
      : resolvedFormat === 'audio'
      ? '🎙️ Synthesizing Voice Note...'
      : '✨ Writing Clue Content...';

  // Hydrate title and description with Character Types for the Builder Studio
  const hydratedTitle = stripCustomerFacingTitle(
    hydrateTextWithCharacters(clue.title || 'Evidence', characters, 'role')
  ) || 'Evidence';
  const hydratedDesc = hydrateTextWithCharacters(clue.description || '', characters, 'role');

  const renderFormatView = () => {
    const viewProps = {
      clue,
      hydratedTitle,
      hydratedDescription: hydratedDesc,
      characters,
      compact: true,
      showImage: true,
    };

    switch (resolvedFormat) {
      case 'chat':
        return <ChatClueView {...viewProps} />;
      case 'receipt':
        return <ReceiptClueView {...viewProps} />;
      case 'document':
        return <DocumentClueView {...viewProps} />;
      case 'cctv':
        return <CctvClueView {...viewProps} />;
      case 'audio':
        return <AudioClueView {...viewProps} />;
      case 'search_log':
        return <SearchLogClueView {...viewProps} />;
      case 'social_post':
        return <SocialClueView {...viewProps} />;
      case 'handwritten_note':
        return <NoteClueView {...viewProps} />;
      case 'medical_rx':
        return <MedicalClueView {...viewProps} />;
      case 'call_sheet':
        return <CallSheetClueView {...viewProps} />;
      case 'physical_prop':
      default:
        return <PropClueView {...viewProps} />;
    }
  };

  return (
    <>
      <div 
        id={`clue-card-${clue.id}`}
        onClick={handleCardClick}
        className="bg-slate-950 rounded-[2.25rem] border border-slate-800/90 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden text-white p-4 scroll-mt-28"
      >
        {isGenerating && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px] z-30 flex flex-col items-center justify-center gap-3 px-4 text-center">
            <div className="w-10 h-10 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-brand-pink animate-pulse">
              {generatingLabel || defaultGeneratingStatus}
            </span>
          </div>
        )}

        {/* Top Bar: Format Badge + Regenerate/Edit/Essential Actions */}
        <div className="flex items-center justify-between gap-2 mb-3 px-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-1 bg-brand-pink/15 border border-brand-pink/30 rounded-full text-[9px] font-black uppercase tracking-widest text-brand-pink shrink-0">
              Round {clue.round_number || 1}
            </span>
            <span className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-full text-[9px] font-black uppercase tracking-widest text-slate-200 shrink-0">
              {formatOption?.label || '🔍 Physical Prop'}
            </span>
            <h4 className="text-xs font-black text-white truncate" title={hydratedTitle}>
              {hydratedTitle}
            </h4>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onRegenerateClue && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateClue(clue);
                }}
                disabled={isGenerating}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 hover:bg-brand-pink/20 border border-white/10 hover:border-brand-pink/40 text-slate-300 hover:text-brand-pink hover:scale-105 active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
                title={regenActionLabel}
              >
                <svg className="w-3.5 h-3.5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" />
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            )}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="w-8 h-8 flex items-center justify-center text-brand-pink hover:scale-105 active:scale-95 transition-all"
              title="Edit Details"
            >
              <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </button>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                await updateClueAction(mysteryId, clue.id, { is_essential: !clue.is_essential });
              }}
              className={`w-8 h-8 flex items-center justify-center transition-all ${
                clue.is_essential 
                  ? 'text-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                  : 'text-slate-500 hover:text-slate-200'
              }`}
              title={clue.is_essential ? 'Essential Clue' : 'Mark as Essential'}
            >
              <svg className="w-4 h-4 fill-current stroke-current" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Dedicated Format Renderer */}
        <div className="flex-grow flex flex-col">
          {renderFormatView()}
        </div>

        {/* Footer (Delete on left, Beat / Real vs Fake Status on right) */}
        <div className="flex flex-col gap-2 mt-4 pt-3 border-t border-slate-900 px-1">
          {clue.internal_notes && (() => {
            const cleanNote = hydrateTextWithCharacters(
              clue.internal_notes.replace(/\[CODE:[^\]]+\]\s*/gi, '').trim(),
              characters,
              'role'
            );
            if (!cleanNote) return null;
            return (
              <p className="text-[10px] text-slate-400 font-medium leading-snug line-clamp-2 italic">
                {cleanNote}
              </p>
            );
          })()}

          <div className="flex justify-between items-center">
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this evidence record?')) {
                  setIsDeleting(true);
                  await removeClueAction(mysteryId, clue.id);
                }
              }}
              disabled={isDeleting}
              className="text-[9px] font-black text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50 uppercase tracking-widest"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            
            {(() => {
              const isFake =
                clue.evidence_status === 'fake' ||
                clue.implication_type === 'red_herring' ||
                (!linkedBeat && !linkedSubplotBeat);

              if (isFake) {
                return (
                  <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest select-none">
                    🎭 Fake / Red Herring
                  </span>
                );
              }

              return (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[9px] font-black uppercase tracking-widest select-none">
                  ✓ Real • {linkedBeat ? `Beat ${linkedBeat.beat_number}` : linkedSubplotBeat ? `Subplot ${linkedSubplotBeat.beat_number}` : 'Canon'}
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      {isEditing && (
        <ClueEditor 
          clue={clue}
          mysteryId={mysteryId}
          beats={beats}
          characters={characters}
          subplots={subplots}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
}

