'use client';

import React, { useState } from 'react';
import { Database, TimelinePhase, BeatType } from '@/types/database';
import { updateBeatAction, removeBeatAction } from '../actions';
import { BeatInvolvement } from './BeatInvolvement';

type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface TimelineBeatCardProps {
  beat: Beat;
  mysteryId: string;
  allCharacters: Character[];
}

export function TimelineBeatCard({ beat, mysteryId, allCharacters }: TimelineBeatCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const beatTypes: BeatType[] = ['discovery', 'confrontation', 'clue_reveal', 'twist', 'conclusion'];
  const phases: TimelinePhase[] = ['pre_crime', 'crime', 'investigation', 'resolution'];

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
      <div className="flex justify-between items-start gap-6 mb-8">
        <div className="flex-grow space-y-4">
          <input 
            defaultValue={beat.event_title}
            onBlur={async (e) => {
              if (e.target.value !== beat.event_title) {
                await updateBeatAction(mysteryId, beat.id, { event_title: e.target.value });
              }
            }}
            placeholder="Event Title..."
            className="text-2xl font-black text-slate-900 bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-slate-100"
          />
          <textarea 
            defaultValue={beat.description || ''}
            onBlur={async (e) => {
              if (e.target.value !== beat.description) {
                await updateBeatAction(mysteryId, beat.id, { description: e.target.value });
              }
            }}
            placeholder="Describe what happens in this scene..."
            className="w-full text-slate-500 font-medium bg-transparent border-none outline-none focus:ring-0 resize-none min-h-[60px] placeholder:text-slate-200"
          />
        </div>

        <div className="flex flex-col gap-2 items-end shrink-0">
          <select 
            defaultValue={beat.beat_type || ''}
            onChange={async (e) => {
              await updateBeatAction(mysteryId, beat.id, { beat_type: e.target.value as BeatType });
            }}
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:ring-2 focus:ring-brand-pink/20"
          >
            {beatTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
          </select>
          
          <select 
            defaultValue={beat.timeline_phase || ''}
            onChange={async (e) => {
              await updateBeatAction(mysteryId, beat.id, { timeline_phase: e.target.value as TimelinePhase });
            }}
            className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:ring-2 focus:ring-brand-pink/20"
          >
            {phases.map(p => <option key={p} value={p}>{p.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
        {/* Character Involvement */}
        <div>
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Characters Present</h4>
          <BeatInvolvement 
            mysteryId={mysteryId}
            beatId={beat.id}
            involvedIds={beat.characters_involved || []}
            allCharacters={allCharacters}
          />
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-col justify-end items-end gap-3">
          <div className="flex gap-2">
             <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intensity</span>
                <input 
                  type="range" min="1" max="5" 
                  defaultValue={beat.intensity_level || 1}
                  onChange={async (e) => {
                    await updateBeatAction(mysteryId, beat.id, { intensity_level: parseInt(e.target.value) });
                  }}
                  className="w-20 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-pink"
                />
             </div>
             
             <button 
               onClick={async () => {
                 if (confirm('Delete this plot beat?')) {
                   setIsDeleting(true);
                   await removeBeatAction(mysteryId, beat.id);
                 }
               }}
               disabled={isDeleting}
               className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
             >
               ✕
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
