'use client';

import React, { useState } from 'react';
import { generateNarrativePlotAction, generateBeatsFromNarrativeAction, savePlotBeatsBulkAction } from '../actions';

interface PlotGeneratorModalProps {
  mysteryId: string;
  currentCount: number;
  targetBeats: number;
  allCharacters: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function PlotGeneratorModal({ mysteryId, currentCount, targetBeats, allCharacters, onClose, onSuccess }: PlotGeneratorModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [userIdeas, setUserIdeas] = useState('');
  const [narrativePlot, setNarrativePlot] = useState('');
  const [generatedBeats, setGeneratedBeats] = useState<any[]>([]);
  
  const [isEditingNarrative, setIsEditingNarrative] = useState(false);
  const [isGeneratingNarrative, setIsGeneratingNarrative] = useState(false);
  const [isGeneratingBeats, setIsGeneratingBeats] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerateNarrative = async () => {
    setIsGeneratingNarrative(true);
    try {
      const story = await generateNarrativePlotAction(mysteryId, userIdeas);
      setNarrativePlot(story);
      setStep(2);
    } catch (err) {
      console.error(err);
      alert('Failed to generate plot narrative.');
    } finally {
      setIsGeneratingNarrative(false);
    }
  };

  const handleGenerateBeats = async () => {
    setIsGeneratingBeats(true);
    try {
      const beats = await generateBeatsFromNarrativeAction(mysteryId, currentCount, narrativePlot);
      setGeneratedBeats(beats);
      setStep(3);
    } catch (err) {
      console.error(err);
      alert('Failed to generate beats from narrative.');
    } finally {
      setIsGeneratingBeats(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await savePlotBeatsBulkAction(mysteryId, generatedBeats);
      if (!result?.success) {
        alert(result?.error || 'Failed to save plot beats.');
        return;
      }
      onSuccess();
    } catch (err: any) {
      console.error(err);
      alert('Failed: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBeatChange = (index: number, field: string, value: string) => {
    const updated = [...generatedBeats];
    updated[index] = { ...updated[index], [field]: value };
    setGeneratedBeats(updated);
  };

  const killer = allCharacters?.find(c => c.plot_role === 'killer');
  const victim = allCharacters?.find(c => c.is_victim || c.plot_role === 'victim');
  const assistant = allCharacters?.find(c => c.plot_role === 'assistant');

  const renderHighlightedNarrative = (text: string) => {
    if (!text) return null;
    
    // Extract first names
    const names = allCharacters?.map(c => c.name.split('|')[0].trim()).filter(Boolean) || [];
    if (names.length === 0) return <span className="whitespace-pre-wrap font-mono text-sm">{text}</span>;

    // Sort by length descending to match longest names first
    names.sort((a, b) => b.length - a.length);
    
    // Escape for regex
    const escapedNames = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedNames.join('|')})\\b`, 'gi');

    const parts = text.split(regex);
    
    return (
      <div className="whitespace-pre-wrap font-mono text-sm">
        {parts.map((part, i) => {
          // Check if part is one of the names (case-insensitive)
          const charMatch = allCharacters?.find(c => c.name.split('|')[0].trim().toLowerCase() === part.toLowerCase());
          if (charMatch) {
            let colorClass = 'text-brand-blue';
            if (charMatch.is_victim || charMatch.plot_role === 'victim') colorClass = 'text-brand-pink';
            else if (charMatch.plot_role === 'killer') colorClass = 'text-brand-red';
            
            return <strong key={i} className={colorClass}>{part}</strong>;
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              {step === 1 ? 'Step 1: Ideation' : step === 2 ? 'Step 2: Review Narrative Storyline' : 'Step 3: Review Plot Beats'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {step === 1 && `Give the AI some directives, or leave blank to let it decide.`}
              {step === 2 && `Edit the full storyline. Once perfect, we'll chop it into exactly ${targetBeats} game beats.`}
              {step === 3 && `Edit the discrete timeline events before cementing them into your mystery.`}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content Area */}
        <div className="flex flex-row overflow-hidden flex-grow">
          {/* Left Sidebar (Key Characters) */}
          <div className="w-1/3 bg-slate-50 border-r border-slate-100 p-8 overflow-y-auto hidden md:block">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Key Characters Context</h3>
            <div className="space-y-6">
              {[victim, killer, assistant].filter(Boolean).map((char, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      char.is_victim || char.plot_role === 'victim' ? 'bg-slate-100 text-slate-600' :
                      char.plot_role === 'killer' ? 'bg-brand-red/10 text-brand-red' :
                      'bg-slate-900 text-white'
                    }`}>
                      {char.plot_role || (char.is_victim ? 'victim' : 'unknown')}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-slate-900">
                    {char.name?.split('|').filter(Boolean).join(' ')}
                  </p>
                  
                  {char.archetype && (
                    <p className="text-xs text-slate-500 mt-1">{char.archetype}</p>
                  )}

                  {char.motives && char.motives.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Motive</p>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{char.motives[0].notes || char.motives[0].motive_type || 'No details provided.'}"
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full md:w-2/3 p-8 overflow-y-auto">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                    Ideas & Directives (Optional)
                  </label>
                  <textarea
                    value={userIdeas}
                    onChange={(e) => setUserIdeas(e.target.value)}
                    placeholder="E.g., I want the twist to involve a hidden trapdoor, and the victim's spouse should be the accomplice..."
                    className="w-full h-40 rounded-xl border border-slate-200 p-4 text-sm resize-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all"
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 h-full flex flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      Master Storyline Outline
                    </label>
                    <p className="text-xs text-slate-500 mb-4">
                      Review the direct outline of the plot. Names are color-coded based on their roles.
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsEditingNarrative(!isEditingNarrative)}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors flex-shrink-0"
                  >
                    {isEditingNarrative ? 'View Outline' : 'Edit Outline'}
                  </button>
                </div>
                
                {isEditingNarrative ? (
                  <textarea
                    value={narrativePlot}
                    onChange={(e) => setNarrativePlot(e.target.value)}
                    className="w-full flex-grow min-h-[300px] rounded-xl border border-slate-200 p-6 text-sm leading-relaxed resize-none focus:ring-2 focus:ring-brand-red focus:border-brand-red transition-all shadow-inner bg-slate-50 font-mono"
                  />
                ) : (
                  <div className="w-full flex-grow min-h-[300px] rounded-xl border border-slate-200 p-6 leading-relaxed bg-white overflow-y-auto">
                    {renderHighlightedNarrative(narrativePlot)}
                  </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {generatedBeats.map((beat, index) => (
                  <div key={index} className="p-6 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Beat {index + 1} • {beat.timeline_phase?.replace('_', ' ') || 'investigation'}
                      </span>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Event Title</label>
                      <input
                        type="text"
                        value={beat.event_title}
                        onChange={(e) => handleBeatChange(index, 'event_title', e.target.value)}
                        className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:ring-brand-red"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Description</label>
                      <textarea
                        value={beat.description}
                        onChange={(e) => handleBeatChange(index, 'description', e.target.value)}
                        className="w-full h-20 rounded-lg border border-slate-200 p-2 text-sm resize-none focus:ring-2 focus:ring-brand-red"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            {step === 1 && (
              <button
                onClick={handleGenerateNarrative}
                disabled={isGeneratingNarrative}
                className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {isGeneratingNarrative ? 'Writing Story...' : 'Write Storyline ✨'}
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  onClick={handleGenerateNarrative}
                  disabled={isGeneratingNarrative || isGeneratingBeats}
                  className="px-6 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isGeneratingNarrative ? 'Rewriting...' : 'Regenerate'}
                </button>
                <button
                  onClick={handleGenerateBeats}
                  disabled={isGeneratingBeats || isGeneratingNarrative || !narrativePlot.trim()}
                  className="px-8 py-3 rounded-xl font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {isGeneratingBeats ? 'Slicing into Beats...' : 'Extract Game Beats ⚡'}
                </button>
              </>
            )}

            {step === 3 && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-brand-pink to-brand-red shadow-lg hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {isSaving ? 'Saving...' : 'Cement Plot'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
