// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Database } from '@/types/database';
import { updateClueAction, removeClueAction } from '../actions';
import { ClueEditor } from './ClueEditor';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueCardProps {
  clue: Clue;
  mysteryId: string;
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
}

export function ClueCard({ clue, mysteryId, beats, characters, subplots = [] }: ClueCardProps) {
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

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'found': return 'bg-brand-blue text-white';
      case 'analyzed': return 'bg-slate-900 text-white';
      default: return 'bg-slate-50 text-slate-400';
    }
  };

  const linkedBeat = beats.find(b => b.id === clue.linked_plot_beat_id);
  const linkedSubplotBeat = subplots?.flatMap(s => s.subplot_beats || []).find(b => b.id === clue.linked_subplot_beat_id);
  const linkedSubplotParent = linkedSubplotBeat ? subplots?.find(s => s.id === linkedSubplotBeat.subplot_id) : null;

  return (
    <>
      <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group flex flex-col h-[300px]">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
              {clue.clue_type === 'physical' ? '📦' : clue.clue_type === 'document' ? '📄' : '🔍'}
            </div>
            <div>
              <h4 className="text-lg font-black text-slate-900 leading-tight line-clamp-1">{clue.title}</h4>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {clue.clue_type || 'Unknown Type'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={async () => {
              await updateClueAction(mysteryId, clue.id, { is_essential: !clue.is_essential });
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              clue.is_essential ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-slate-200'
            }`}
            title={clue.is_essential ? 'Essential Clue' : 'Mark as Essential'}
          >
            ★
          </button>
        </div>

        <div className="flex-grow space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${getStatusColor(clue.evidence_status)}`}>
              {clue.evidence_status || 'hidden'}
            </span>
            {clue.implication_type && (
              <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-[8px] font-black uppercase tracking-widest border border-slate-100">
                {clue.implication_type.replace('_', ' ')}
              </span>
            )}
          </div>
          
          <div className="text-[10px] font-bold text-slate-400 flex items-center gap-2">
            <span className="shrink-0">📍 Link:</span>
            <span className="line-clamp-1 italic">
              {linkedBeat ? linkedBeat.event_title : 
               linkedSubplotBeat ? `Subplot: ${linkedSubplotParent?.title || 'Unknown'} (Beat ${linkedSubplotBeat.beat_number})` : 
               'No timeline link'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-50">
          <button 
            onClick={() => setIsEditing(true)}
            className="px-6 py-2 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-blue hover:text-white transition-all"
          >
            Edit Clue
          </button>
          
          <button 
            onClick={async () => {
              if (confirm('Delete this evidence record?')) {
                setIsDeleting(true);
                await removeClueAction(mysteryId, clue.id);
              }
            }}
            disabled={isDeleting}
            className="text-slate-300 hover:text-red-400 transition-colors text-xs font-bold disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
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
