'use client';

import React, { useState } from 'react';
import { Database, ClueType, ImplicationType, EvidenceStatus } from '@/types/database';
import { updateClueAction } from '../actions';
import { generateCluePreview, suggestCluePrompts, generateClueDescriptionAction, generateClueImageAction } from '@/app/actions/generator';
import { hydrateTextWithCharacters } from '@/utils/hydration';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

function isCctvOrVideoClue(title: string, description: string, generationPrompt: string) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const p = generationPrompt.toLowerCase();
  return (
    t.includes('cctv') ||
    t.includes('video') ||
    t.includes('camera') ||
    t.includes('photo') ||
    t.includes('polaroid') ||
    d.includes('cctv') ||
    d.includes('security cam') ||
    d.includes('camera footage') ||
    d.includes('video footage') ||
    d.includes('metadata: sec cam') ||
    p.includes('cctv') ||
    p.includes('security camera') ||
    p.includes('surveillance')
  );
}

function isAudioClue(title: string, description: string, generationPrompt: string) {
  const t = title.toLowerCase();
  const d = description.toLowerCase();
  const p = generationPrompt.toLowerCase();
  return (
    t.includes('audio') ||
    t.includes('voice note') ||
    t.includes('recorded') ||
    t.includes('recording') ||
    t.includes('clip') ||
    t.includes('sound') ||
    d.includes('🎙️') ||
    d.includes('audio recording') ||
    d.includes('voice note') ||
    p.includes('microphone') ||
    p.includes('soundboard') ||
    p.includes('audio recorder')
  );
}

function parseCctvMetadata(title: string, description: string) {
  const desc = description || '';
  
  // Try to find Timestamp
  let timestamp = '06/23/2026 18:03:00';
  const timeMatch = desc.match(/Timestamp:\s*([^\n|)]+)/i);
  if (timeMatch) {
    const rawTime = timeMatch[1].trim();
    timestamp = `06/23/2026 ${rawTime}`;
  } else {
    const simpleTimeMatch = desc.match(/(\d{1,2}:\d{2}\s*(?:PM|AM))/i);
    if (simpleTimeMatch) {
      timestamp = `06/23/2026 ${simpleTimeMatch[1]}`;
    }
  }

  // Try to find Camera
  let camera = 'CAM 01';
  const camMatch = desc.match(/SEC CAM_([^\n\s|\]]+)/i);
  if (camMatch) {
    camera = `SEC CAM ${camMatch[1].toUpperCase()}`;
  } else if (desc.toLowerCase().includes('bar area')) {
    camera = 'CAM 02 - PENTHOUSE BAR';
  } else if (desc.toLowerCase().includes('lobby') || desc.toLowerCase().includes('hallway')) {
    camera = 'CAM 01 - CORRIDOR';
  } else if (title.toLowerCase().includes('switch')) {
    camera = 'CAM 03 - DRINK COUNTER';
  }

  return { timestamp, camera };
}

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
  const [title, setTitle] = useState(clue.title || '');
  const [description, setDescription] = useState(clue.description || '');
  const [generationPrompt, setGenerationPrompt] = useState(clue.generation_prompt || '');
  const [templateText, setTemplateText] = useState(clue.template_text || '');
  
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [imageUrl, setImageUrl] = useState<string | null>(clue.static_image_url || null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  
  const [focusedInput, setFocusedInput] = useState<'description' | 'generation_prompt'>('description');
  const [showDetails, setShowDetails] = useState(false);

  const defaultLinkedBeat = clue.evidence_status === 'fake' || (!clue.linked_plot_beat_id && !clue.linked_subplot_beat_id)
    ? 'fake'
    : clue.linked_plot_beat_id
    ? `main_${clue.linked_plot_beat_id}`
    : `sub_${clue.linked_subplot_beat_id}`;

  const [linkedBeatValue, setLinkedBeatValue] = useState(defaultLinkedBeat);

  const handleSuggestPrompts = async () => {
    setIsSuggesting(true);
    try {
      let activeBeatTitle = 'A Mysterious Event';
      if (linkedBeatValue && linkedBeatValue.startsWith('main_')) {
        const beatId = linkedBeatValue.replace('main_', '');
        const beat = beats.find(b => b.id === beatId);
        if (beat) activeBeatTitle = beat.event_title;
      } else if (linkedBeatValue && linkedBeatValue.startsWith('sub_')) {
        const beatId = linkedBeatValue.replace('sub_', '');
        const beat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === beatId);
        if (beat) activeBeatTitle = beat.description;
      } else if (linkedBeatValue === 'fake') {
        activeBeatTitle = 'Fake Clue / Unlinked to Story Timeline';
      }

      const results = await suggestCluePrompts(activeBeatTitle);
      setSuggestions(results);
    } catch (e: any) {
      console.error('Action Error:', e);
      alert('Failed to fetch suggestions: ' + (e?.message || String(e)));
    }
    setIsSuggesting(false);
  };

  const handleAutogenerateDescription = async () => {
    if (!title.trim()) {
      alert('Please enter an Evidence Name before generating a description.');
      return;
    }
    setIsGeneratingDescription(true);
    try {
      let activeBeatTitle = 'A Mysterious Event';
      if (linkedBeatValue && linkedBeatValue.startsWith('main_')) {
        const beatId = linkedBeatValue.replace('main_', '');
        const beat = beats.find(b => b.id === beatId);
        if (beat) activeBeatTitle = beat.event_title;
      } else if (linkedBeatValue && linkedBeatValue.startsWith('sub_')) {
        const beatId = linkedBeatValue.replace('sub_', '');
        const beat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === beatId);
        if (beat) activeBeatTitle = beat.description;
      } else if (linkedBeatValue === 'fake') {
        activeBeatTitle = 'Fake Clue / Unlinked to Story Timeline';
      }

      // Hydrate characters in prompt so the generated text has correct genders & attributes
      const hydratedPrompt = hydrateTextWithCharacters(generationPrompt, characters, 'ai');

      const result = await generateClueDescriptionAction(title, activeBeatTitle, hydratedPrompt);
      setDescription(result);
    } catch (e: any) {
      console.error('Description Gen Error:', e);
      alert('Failed to autogenerate description: ' + (e?.message || String(e)));
    }
    setIsGeneratingDescription(false);
  };

  const handleTestPrompt = async () => {
    setIsGeneratingPreview(true);
    try {
      const hydratedPrompt = hydrateTextWithCharacters(generationPrompt, characters, 'ai');
      const result = await generateCluePreview(hydratedPrompt, templateText);
      setTemplateText(result);
      if (!description) {
        setDescription(result);
      }
    } catch (e: any) {
      console.error('Preview Error:', e);
      alert('Failed to generate preview. Server said: ' + (e?.message || String(e)));
    }
    setIsGeneratingPreview(false);
  };

  const handleGenerateImage = async () => {
    if (!generationPrompt.trim()) {
      alert('Please enter an AI Image Description / Generation Prompt first.');
      return;
    }
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const res = await generateClueImageAction(clue.id, mysteryId, generationPrompt);
      if (res?.success && res.imageUrl) {
        setImageUrl(res.imageUrl);
      } else if (res?.error) {
        setImageError(res.error);
      }
    } catch (e: any) {
      console.error('Image Generation Error:', e);
      setImageError(e.message || 'An error occurred during image generation.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleInsertTag = (tag: string) => {
    const inputId = focusedInput === 'description' ? 'clue-description' : 'clue-generation-prompt';
    const textarea = document.getElementById(inputId) as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = before + tag + after;

    if (focusedInput === 'description') {
      setDescription(newText);
    } else {
      setGenerationPrompt(newText);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length;
    }, 50);
  };

  const isAudio = isAudioClue(title, description, generationPrompt);
  const isCctv = isCctvOrVideoClue(title, description, generationPrompt) && !isAudio;
  const cctv = parseCctvMetadata(title, description);

  const clueTypes: ClueType[] = ['physical', 'testimony', 'background', 'secret'];
  const implications: ImplicationType[] = ['direct', 'circumstantial', 'red_herring'];

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
              let evidence_status: EvidenceStatus = (formData.get('evidence_status') as EvidenceStatus) || 'real';

              if (beatSelection && beatSelection.startsWith('main_')) {
                linked_plot_beat_id = beatSelection.replace('main_', '');
                if (evidence_status === 'fake') evidence_status = 'real';
              } else if (beatSelection && beatSelection.startsWith('sub_')) {
                linked_subplot_beat_id = beatSelection.replace('sub_', '');
                if (evidence_status === 'fake') evidence_status = 'real';
              } else if (beatSelection === 'fake') {
                evidence_status = 'fake';
              }

              const updates = {
                title,
                description,
                generation_prompt: generationPrompt,
                template_text: templateText,
                linked_plot_beat_id,
                linked_subplot_beat_id,
                evidence_status,
                clue_type: (formData.get('clue_type') as ClueType) || clue.clue_type,
                implication_type: (formData.get('implication_type') as ImplicationType) || clue.implication_type,
                is_essential: formData.get('is_essential') === 'on',
                internal_notes: formData.get('internal_notes') as string,
                asset_mode: (formData.get('asset_mode') as any) || clue.asset_mode,
              };

              await updateClueAction(mysteryId, clue.id, updates);
              setIsSaving(false);
              onClose();
            }}
            className="space-y-8"
          >
            {/* Quick Overview Card at the Top */}
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-4 mb-6 select-none">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Evidence Record</span>
                  <h3 className="text-lg font-black leading-snug">{title || 'Unnamed Evidence'}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                  linkedBeatValue === 'fake' 
                    ? 'bg-rose-950/40 text-rose-450 border-rose-900/30' 
                    : 'bg-emerald-950/40 text-emerald-455 border-emerald-900/30'
                }`}>
                  {linkedBeatValue === 'fake' ? 'Fake Clue' : 'Real Clue'}
                </span>
              </div>

              {/* Beat Number or Fake */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-350 bg-slate-950/50 px-4 py-3 rounded-xl border border-slate-850">
                <span className="text-slate-500 shrink-0">📍 Link:</span>
                <span className="italic text-slate-200">
                  {linkedBeatValue === 'fake' ? '🚫 Fake Clue (Not on timeline)' : (
                    (() => {
                      if (linkedBeatValue.startsWith('main_')) {
                        const beatId = linkedBeatValue.replace('main_', '');
                        const beat = beats.find(b => b.id === beatId);
                        return beat ? `Beat ${beat.beat_number}: ${beat.event_title}` : 'Main Timeline Beat';
                      } else if (linkedBeatValue.startsWith('sub_')) {
                        const beatId = linkedBeatValue.replace('sub_', '');
                        const beat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === beatId);
                        return beat ? `Subplot Beat: ${beat.description}` : 'Subplot Beat';
                      }
                      return 'Timeline Linked';
                    })()
                  )}
                </span>
              </div>

              {/* The Image We Generated (with CCTV or Audio overlay!) */}
              <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-slate-950 border border-slate-855 shadow-inner group/preview flex items-center justify-center">
                {imageUrl ? (
                  <div className="absolute inset-0 w-full h-full">
                    <img 
                      src={imageUrl} 
                      alt={title} 
                      className="w-full h-full object-cover" 
                    />
                    {isCctv && (
                      <div className="absolute inset-0 bg-black/10 pointer-events-none flex flex-col justify-between p-3 font-mono text-[9px] text-white">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
                        <div className="flex justify-between items-center z-10">
                          <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded text-red-500 font-bold uppercase tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                            <span>REC</span>
                          </div>
                          <div className="bg-black/50 px-2 py-0.5 rounded text-slate-300 font-bold">
                            {cctv.camera}
                          </div>
                        </div>
                        <div className="flex justify-between items-end z-10">
                          <div className="bg-black/50 px-2 py-0.5 rounded text-slate-300 font-bold">
                            {cctv.timestamp}
                          </div>
                          <div className="bg-black/50 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                            4K 30FPS
                          </div>
                        </div>
                      </div>
                    )}
                    {isAudio && (
                      <div className="absolute inset-0 bg-black/25 pointer-events-none flex flex-col justify-end p-4">
                        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]" />
                        <div className="bg-slate-955/85 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md flex items-center gap-3.5 z-10 w-full shadow-lg">
                          <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-md shrink-0">
                            <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <div className="flex-grow flex items-center gap-0.5 h-5">
                            {[15, 30, 45, 20, 35, 55, 40, 25, 50, 60, 35, 20, 45, 30, 15, 25, 40, 50, 30, 20].map((height, i) => (
                              <div 
                                key={i} 
                                className="flex-grow rounded-full" 
                                style={{ 
                                  height: `${height}%`,
                                  backgroundColor: i < 7 ? '#3b82f6' : 'rgba(255, 255, 255, 0.25)'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Hover Overlay to Regenerate */}
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/preview:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 z-20">
                      <button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage}
                        className="px-4 py-2 bg-white text-slate-900 text-[11px] font-black uppercase tracking-wider rounded-xl hover:bg-brand-pink hover:text-white transition-all shadow-md active:scale-95 disabled:opacity-50"
                      >
                        ⚡ Regenerate Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center flex flex-col items-center justify-center space-y-3 select-none">
                    {isCctv ? (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />
                        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
                        <span className="text-3xl filter animate-pulse z-10">📹</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10">{cctv.camera}</span>
                        <span className="text-[9px] font-mono text-slate-500 z-10">{cctv.timestamp}</span>
                        <button
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage || !generationPrompt}
                          className="px-4 py-2 bg-brand-pink text-white rounded-xl text-[10px] font-bold hover:bg-brand-pink/80 transition-all shadow-md active:scale-95 disabled:opacity-50 z-10 mt-2"
                        >
                          Generate CCTV Frame
                        </button>
                      </div>
                    ) : isAudio ? (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 gap-3">
                        <span className="text-3xl filter animate-pulse">🎙️</span>
                        <div className="bg-slate-900 border border-white/5 rounded-xl p-2 flex items-center gap-2 w-full max-w-[200px] shadow-lg mb-2">
                          <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0">
                            <svg className="w-2 h-2 fill-current ml-0.5" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                          <div className="flex-grow flex items-center gap-0.5 h-3">
                            {[15, 35, 55, 20, 40, 50, 30, 20, 10, 25].map((height, i) => (
                              <div 
                                key={i} 
                                className="flex-grow rounded-full" 
                                style={{ 
                                  height: `${height}%`,
                                  backgroundColor: i < 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage || !generationPrompt}
                          className="px-4 py-2 bg-brand-pink text-white rounded-xl text-[10px] font-bold hover:bg-brand-pink/80 transition-all shadow-md active:scale-95 disabled:opacity-50 z-10"
                        >
                          Generate Audio Mockup
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-2xl filter grayscale mb-1">📦</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">No Photo Generated</span>
                        <button
                          type="button"
                          onClick={handleGenerateImage}
                          disabled={isGeneratingImage || !generationPrompt}
                          className="px-4 py-2 bg-brand-pink text-white rounded-xl text-[10px] font-bold hover:bg-brand-pink/80 transition-all shadow-md active:scale-95 disabled:opacity-50"
                        >
                          Generate Photo
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Loading Overlay */}
                {isGeneratingImage && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 animate-in fade-in duration-300 z-30">
                    <div className="relative flex items-center justify-center animate-bounce">
                      <div className="w-12 h-12 rounded-full border-4 border-brand-pink/20 border-t-brand-pink animate-spin"></div>
                      <svg className="w-5 h-5 text-brand-pink absolute animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-brand-pink animate-pulse">Gemini Imagen 4.0</p>
                      <p className="text-[10px] text-slate-350 font-bold mt-1">Fleshing out visual mystery details...</p>
                    </div>
                  </div>
                )}

                {/* Error Overlay */}
                {imageError && (
                  <div className="absolute inset-0 bg-red-950/90 p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in z-30">
                    <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-red-400">Generation Error</p>
                      <p className="text-[10px] text-red-200 mt-1 max-w-[220px] leading-relaxed mx-auto font-medium">{imageError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageError(null)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>

              {/* Guest Preview Line (Real-time Hydrated Description) */}
              <div className="bg-slate-955/40 border border-slate-800/80 p-4 rounded-2xl">
                <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                  👀 Player Clue Text (Guest Preview)
                </div>
                <p className="text-xs font-medium text-slate-200 leading-relaxed italic">
                  {description.trim() 
                    ? hydrateTextWithCharacters(description, characters, 'print')
                    : 'No description text provided yet.'}
                </p>
              </div>
            </div>

            {/* 1. Name */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Evidence Name</label>
              <input 
                name="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20"
                placeholder="e.g. Broken Wine Glass, Crumpled Receipt..."
              />
            </div>

            {/* 2. Reveal Point (Timeline Beat) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Reveal Point (Timeline Beat)</label>
              <select 
                name="linked_beat" 
                value={linkedBeatValue}
                onChange={e => setLinkedBeatValue(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="fake">🚫 Fake Clue (Not linked to timeline)</option>
                <optgroup label="Main Timeline Beats">
                  {beats.map(b => (
                    <option key={`main_${b.id}`} value={`main_${b.id}`}>
                      Beat {b.beat_number}: {b.event_title}
                    </option>
                  ))}
                </optgroup>
                {subplots.map(subplot => (
                  <optgroup key={`subgroup_${subplot.id}`} label={`Subplot: ${subplot.title}`}>
                    {subplot.subplot_beats?.map((sb: any) => (
                      <option key={`sub_${sb.id}`} value={`sub_${sb.id}`}>
                        Beat {sb.beat_number}: {sb.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 3. Internal Description */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-xs font-bold text-slate-500">Internal Description (Printed Card Text)</label>
                <button
                  type="button"
                  onClick={handleAutogenerateDescription}
                  disabled={isGeneratingDescription}
                  className="text-[10px] font-bold text-brand-pink hover:text-brand-pink/80 flex items-center gap-1 disabled:opacity-50"
                >
                  {isGeneratingDescription ? 'Writing...' : '✨ Autogenerate Card Text'}
                </button>
              </div>
              <textarea 
                id="clue-description"
                name="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                onFocus={() => setFocusedInput('description')}
                rows={4}
                placeholder="Write the public description players will read on the printed card..."
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none text-xs text-slate-700 leading-relaxed"
              />
            </div>

            {/* Dynamic Character Mention Tags */}
            <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-100">
               <p className="text-[10px] font-bold text-slate-400 mb-2.5 uppercase tracking-widest flex items-center gap-1.5">
                 👤 Mention Characters ({characters.length})
               </p>
               <div className="flex flex-wrap gap-2">
                 {characters.map(char => {
                   const cleanName = char.name.split('|')[0]?.trim() || char.name;
                   const tag = `{{${cleanName}}}`;
                   return (
                     <button
                       key={char.id}
                       type="button"
                       onClick={() => handleInsertTag(tag)}
                       className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:text-brand-pink hover:border-brand-pink hover:bg-brand-pink/5 transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
                     >
                       {tag}
                     </button>
                   );
                 })}
               </div>
               <p className="text-[9px] text-slate-400 mt-2 font-medium italic leading-relaxed">
                 Click a character name to insert at current cursor. Substitutions occur automatically at runtime (Guest names on prints, guest appearances in prompts).
               </p>
            </div>

            {/* 4. AI Image Description */}
            <div className="space-y-6 bg-brand-pink/5 p-8 rounded-[2rem] border border-brand-pink/10">
              <div className="flex justify-between items-center border-b border-brand-pink/10 pb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">AI Image Description</h3>
                <select 
                  name="asset_mode" 
                  defaultValue={clue.asset_mode || 'static'} 
                  className="px-3 py-1 bg-white border border-brand-pink/20 rounded-lg text-[10px] font-black uppercase tracking-widest outline-none"
                >
                  <option value="static">Manual Mode</option>
                  <option value="generated">AI Prompt Mode</option>
                </select>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-xs font-bold text-brand-pink/60">Generation Prompt</label>
                    <button
                      type="button"
                      onClick={handleSuggestPrompts}
                      disabled={isSuggesting}
                      className="text-[10px] font-bold text-brand-pink hover:text-brand-pink/80 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isSuggesting ? 'Thinking...' : '✨ Suggest Visual Ideas'}
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
                    id="clue-generation-prompt"
                    name="generation_prompt"
                    value={generationPrompt}
                    onChange={e => setGenerationPrompt(e.target.value)}
                    onFocus={() => setFocusedInput('generation_prompt')}
                    rows={4}
                    placeholder="Specific details for the illustration (e.g. {{Dane}}'s muddy fingerprint on a champagne bottle)..."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                  />
                  
                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <p className="text-[10px] text-slate-400 font-medium italic max-w-xs leading-relaxed">
                      Describes the visual settings and key details. Characters mentioned will match real guests.
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={handleTestPrompt}
                        disabled={isGeneratingPreview || !generationPrompt}
                        className="px-4 py-2 bg-white border border-brand-pink/20 text-brand-pink hover:bg-brand-pink/5 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {isGeneratingPreview ? 'Writing...' : 'Preview Text'}
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerateImage}
                        disabled={isGeneratingImage || !generationPrompt}
                        className="px-5 py-2 bg-brand-pink text-white rounded-xl text-xs font-bold hover:bg-brand-pink/80 transition-all shadow-lg shadow-brand-pink/20 disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isGeneratingImage ? (
                          <>
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Drawing...
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L28 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Generate Photo
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {templateText && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold text-brand-pink/60 mb-2">Clue Document / AI Text Preview</label>
                    <textarea 
                      name="template_text"
                      value={templateText}
                      onChange={e => setTemplateText(e.target.value)}
                      rows={4}
                      placeholder="Raw text to overlay in previews..."
                      className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Details Section */}
            <div className="border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between py-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span>⚙️ Additional Classification Details</span>
                <span>{showDetails ? '▲ Hide' : '▼ Show'}</span>
              </button>

              {showDetails && (
                <div className="space-y-6 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Clue Type</label>
                      <select 
                        name="clue_type" 
                        defaultValue={clue.clue_type || 'physical'} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none"
                      >
                        {clueTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Implication</label>
                      <select 
                        name="implication_type" 
                        defaultValue={clue.implication_type || 'circumstantial'} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs appearance-none"
                      >
                        {implications.map(i => <option key={i} value={i}>{i.replace('_', ' ').toUpperCase()}</option>)}
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

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">Designer Notes</label>
                    <textarea 
                      name="internal_notes"
                      defaultValue={clue.internal_notes || ''}
                      rows={3}
                      placeholder="Internal clues, logic trails, or hidden details..."
                      className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-xs outline-none focus:ring-2 focus:ring-brand-blue/20 resize-none italic"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 flex gap-4">
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
                 className="flex-grow py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-brand-blue transition-all shadow-xl shadow-slate-900/10 disabled:opacity-50 animate-in fade-in"
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
