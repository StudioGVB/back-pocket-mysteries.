'use client';

import React, { useState } from 'react';
import { Database, ClueType, ImplicationType, EvidenceStatus } from '@/types/database';
import { updateClueAction } from '../actions';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueEditorProps {
  clue: Clue;
  mysteryId: string;
  beats: Beat[];
  characters: Character[];
  onClose: () => void;
}

export function ClueEditor({ clue, mysteryId, beats, characters, onClose }: ClueEditorProps) {
  const [isSaving, setIsSaving] = useState(false);

  const clueTypes: ClueType[] = ['physical', 'testimonial', 'scientific', 'document', 'hearsay', 'other'];
  const implications: ImplicationType[] = ['pointing_to', 'red_herring', 'innocent', 'motive_link', 'other'];
  const statuses: EvidenceStatus[] = ['hidden', 'found', 'analyzed'];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="p-10 flex-grow">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-black text-slate-900">Evidence File</h2>
            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
          </div>

          <form 
            action={async (formData) => {
              setIsSaving(true);
              const updates = {
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                internal_notes: formData.get('internal_notes') as string,
                clue_type: formData.get('clue_type') as ClueType,
                implication_type: formData.get('implication_type') as ImplicationType,
                evidence_status: formData.get('evidence_status') as EvidenceStatus,
                linked_plot_beat_id: formData.get('linked_plot_beat_id') as string || null,
                is_essential: formData.get('is_essential') === 'on',
                asset_mode: formData.get('asset_mode') as any,
                generation_prompt: formData.get('generation_prompt') as string,
                template_text: formData.get('template_text') as string,
              };
              await updateClueAction(mysteryId, clue.id, updates);
              setIsSaving(false);
              onClose();
            }}
            className="space-y-10"
          >
            {/* Core Info */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Identification</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Evidence Name</label>
                  <input 
                    name="title"
                    defaultValue={clue.title}
                    required
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Public Description</label>
                  <textarea 
                    name="description"
                    defaultValue={clue.description || ''}
                    rows={3}
                    placeholder="Physical appearance or content of the clue..."
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Classification */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Classification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Clue Type</label>
                  <select name="clue_type" defaultValue={clue.clue_type || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                    {clueTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Story Status</label>
                  <select name="evidence_status" defaultValue={clue.evidence_status || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                    {statuses.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                 <input 
                   type="checkbox" 
                   name="is_essential" 
                   defaultChecked={clue.is_essential}
                   className="w-6 h-6 rounded-lg accent-brand-blue"
                 />
                 <div>
                    <span className="block text-xs font-bold text-slate-900">Essential Evidence</span>
                    <span className="text-[10px] text-slate-400 font-medium italic">Is this required to solve the case?</span>
                 </div>
              </div>
            </div>

            {/* Narrative Connections */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Narrative Connections</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Reveal Point (Timeline Beat)</label>
                  <select name="linked_plot_beat_id" defaultValue={clue.linked_plot_beat_id || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                    <option value="">Not linked to timeline...</option>
                    {beats.map(b => <option key={b.id} value={b.id}>{b.event_title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">Implication</label>
                  <select name="implication_type" defaultValue={clue.implication_type || ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none">
                    {implications.map(i => <option key={i} value={i}>{i.replace('_', ' ').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Designer Notes */}
            <div className="space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-50 pb-2">Designer Notes</h3>
              <textarea 
                name="internal_notes"
                defaultValue={clue.internal_notes || ''}
                rows={3}
                placeholder="Internal clues, logic trails, or hidden details..."
                className="w-full px-6 py-4 bg-slate-900/5 border border-slate-100 rounded-2xl font-medium text-xs outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none italic"
              />
            </div>

            {/* AI Asset Generation */}
            <div className="space-y-6 bg-brand-pink/5 p-8 rounded-[2rem] border border-brand-pink/10">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink border-b border-brand-pink/10 pb-2 flex-grow">AI Asset Generation</h3>
                <div className="ml-4 flex gap-2">
                  <select 
                    name="asset_mode" 
                    defaultValue={clue.asset_mode || 'static'} 
                    className="px-3 py-1 bg-white border border-brand-pink/20 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none"
                  >
                    <option value="static">Static</option>
                    <option value="generated">Generated</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6 p-2">
                <div>
                  <label className="block text-xs font-bold text-brand-pink/60 mb-2">Generation Prompt</label>
                  <textarea 
                    name="generation_prompt"
                    defaultValue={clue.generation_prompt || ''}
                    rows={4}
                    placeholder="Specific instructions for the AI to generate this clue image or content..."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 font-medium italic">Describe the visual look, style, and key text that should appear on the clue.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-pink/60 mb-2">Template Content</label>
                  <textarea 
                    name="template_text"
                    defaultValue={clue.template_text || ''}
                    rows={3}
                    placeholder="Raw text for letters, documents, or newspapers..."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-10 flex gap-4">
               <button 
                 type="button" 
                 onClick={onClose}
                 className="flex-grow py-4 bg-slate-50 text-slate-500 rounded-2xl font-bold hover:bg-slate-100 transition-all"
               >
                 Cancel
               </button>
               <button 
                 type="submit"
                 disabled={isSaving}
                 className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50"
               >
                 {isSaving ? 'Updating...' : 'Save Evidence'}
               </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
