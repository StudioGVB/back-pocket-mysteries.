'use client';

import React, { useState } from 'react';
import { Database, ClueType, ImplicationType, EvidenceStatus } from '@/types/database';
import { updateClueAction } from '../actions';
import { generateCluePreview, suggestCluePrompts } from '@/app/actions/generator';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

interface ClueEditorProps {
  clue: Clue;
  mysteryId: string;
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
  onClose: () => void;
}

export function ClueEditor({ clue, mysteryId, beats, characters, subplots = [], onClose }: ClueEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState(clue.generation_prompt || '');
  const [templateText, setTemplateText] = useState(clue.template_text || '');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const linkedBeat = beats.find(b => b.id === clue.linked_plot_beat_id);
  const linkedSubplotBeat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === clue.linked_subplot_beat_id);
  const beatTitle = (linkedBeat ? linkedBeat.event_title : linkedSubplotBeat ? linkedSubplotBeat.description : null) || 'A Mysterious Event';

  const handleSuggestPrompts = async () => {
    setIsSuggesting(true);
    try {
      const results = await suggestCluePrompts(beatTitle);
      setSuggestions(results);
    } catch (e: any) {
      console.error('Action Error:', e);
      alert('Failed to fetch suggestions: ' + (e?.message || String(e)));
    }
    setIsSuggesting(false);
  };

  const handleTestPrompt = async () => {
    setIsGeneratingPreview(true);
    try {
      const victim = characters.find(c => c.is_victim);
      const killer = characters.find(c => c.plot_role === 'killer');
      
      let hydratedPrompt = generationPrompt;
      hydratedPrompt = hydratedPrompt.replace(/{{VICTIM}}/g, victim?.name || 'John Doe (Victim)');
      hydratedPrompt = hydratedPrompt.replace(/{{KILLER}}/g, killer?.name || 'Jane Smith (Killer)');
      hydratedPrompt = hydratedPrompt.replace(/{{CLUE_TITLE}}/g, clue.title || 'Mysterious Note');
      hydratedPrompt = hydratedPrompt.replace(/{{BEAT_NAME}}/g, 'A Shocking Discovery');

      const result = await generateCluePreview(hydratedPrompt, templateText);
      setTemplateText(result);
    } catch (e: any) {
      console.error('Preview Error:', e);
      alert('Failed to generate preview. Server said: ' + (e?.message || String(e)) + '\\n\\n(Did you remember to restart the terminal server after saving .env.local?)');
    }
    setIsGeneratingPreview(false);
  };

  const clueTypes: ClueType[] = ['physical', 'testimony', 'background', 'secret'];
  const implications: ImplicationType[] = ['direct', 'circumstantial', 'red_herring'];
  const statuses: EvidenceStatus[] = ['real', 'fake', 'planted'];

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
              const beatSelection = formData.get('linked_beat') as string;
              let linked_plot_beat_id = null;
              let linked_subplot_beat_id = null;
              if (beatSelection && beatSelection.startsWith('main_')) {
                linked_plot_beat_id = beatSelection.replace('main_', '');
              } else if (beatSelection && beatSelection.startsWith('sub_')) {
                linked_subplot_beat_id = beatSelection.replace('sub_', '');
              }

              const updates = {
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                internal_notes: formData.get('internal_notes') as string,
                clue_type: formData.get('clue_type') as ClueType,
                implication_type: formData.get('implication_type') as ImplicationType,
                evidence_status: formData.get('evidence_status') as EvidenceStatus,
                linked_plot_beat_id,
                linked_subplot_beat_id,
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

            {/* AI Generator & Clue Content */}
            <div className="space-y-6 bg-brand-pink/5 p-8 rounded-[2rem] border border-brand-pink/10">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink border-b border-brand-pink/10 pb-2 flex-grow">AI Generator & Clue Content</h3>
                <div className="ml-4 flex gap-2">
                  <select 
                    name="asset_mode" 
                    defaultValue={clue.asset_mode || 'static'} 
                    className="px-3 py-1 bg-white border border-brand-pink/20 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none"
                  >
                    <option value="static">Manual</option>
                    <option value="generated">AI Generated</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6 p-2">
                <div className="mb-4">
                   <p className="text-[10px] font-bold text-brand-pink/60 mb-2 uppercase tracking-widest">Available Variables</p>
                   <div className="flex flex-wrap gap-2">
                     {['{{VICTIM}}', '{{KILLER}}', '{{CLUE_TITLE}}', '{{BEAT_NAME}}'].map(tag => (
                       <span key={tag} className="px-2 py-1 bg-white border border-brand-pink/20 rounded text-[9px] font-black text-brand-pink">
                         {tag}
                       </span>
                     ))}
                   </div>
                   <p className="text-[10px] text-brand-pink/60 mt-2 font-medium italic">Use these tags in your prompt. They will be automatically replaced with the mystery's characters during generation.</p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold text-brand-pink/60">Generation Prompt</label>
                    <button
                      type="button"
                      onClick={handleSuggestPrompts}
                      disabled={isSuggesting}
                      className="text-[10px] font-bold text-brand-pink hover:text-brand-pink/80 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSuggesting ? 'Thinking...' : '✨ Suggest Ideas'}
                    </button>
                  </div>

                  {suggestions.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setGenerationPrompt(suggestion)}
                          className="w-full text-left p-3 rounded-xl bg-white border border-brand-pink/20 hover:border-brand-pink hover:bg-brand-pink/5 transition-all group"
                        >
                          <span className="text-xs text-slate-600 font-medium group-hover:text-slate-900 leading-snug block">{suggestion}</span>
                          <span className="text-[9px] font-bold text-brand-pink mt-1 block uppercase tracking-widest">Use This Idea</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <textarea 
                    name="generation_prompt"
                    value={generationPrompt}
                    onChange={e => setGenerationPrompt(e.target.value)}
                    rows={4}
                    placeholder="Specific instructions for the AI to generate this clue image or content..."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                  />
                  <div className="mt-4 flex justify-between items-center">
                    <p className="text-[10px] text-slate-400 font-medium italic">Describe the visual look, style, and key text that should appear on the clue.</p>
                    <button
                      type="button"
                      onClick={handleTestPrompt}
                      disabled={isGeneratingPreview || !generationPrompt}
                      className="px-6 py-2 bg-brand-pink text-white rounded-xl text-xs font-bold hover:bg-brand-pink/80 transition-all shadow-lg shadow-brand-pink/20 disabled:opacity-50"
                    >
                      {isGeneratingPreview ? 'Generating...' : 'Test Prompt & Generate Content'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-pink/60 mb-2">Actual Clue Content / AI Output</label>
                  <textarea 
                    name="template_text"
                    value={templateText}
                    onChange={e => setTemplateText(e.target.value)}
                    rows={6}
                    placeholder="Raw text for letters, documents, or newspapers... The AI preview will appear here."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
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
                  <select 
                    name="linked_beat" 
                    defaultValue={clue.linked_plot_beat_id ? `main_${clue.linked_plot_beat_id}` : clue.linked_subplot_beat_id ? `sub_${clue.linked_subplot_beat_id}` : ''} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none"
                  >
                    <option value="">Not linked to timeline...</option>
                    <optgroup label="Main Timeline Beats">
                      {beats.map(b => <option key={`main_${b.id}`} value={`main_${b.id}`}>{b.event_title}</option>)}
                    </optgroup>
                    {subplots.map(subplot => (
                      <optgroup key={`subgroup_${subplot.id}`} label={`Subplot: ${subplot.title}`}>
                        {subplot.subplot_beats?.map((sb: any) => (
                          <option key={`sub_${sb.id}`} value={`sub_${sb.id}`}>Beat {sb.beat_number}: {sb.description}</option>
                        ))}
                      </optgroup>
                    ))}
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
