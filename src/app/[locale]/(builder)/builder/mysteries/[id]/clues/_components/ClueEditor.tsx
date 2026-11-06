'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database, ClueType, ClueFormat, ImplicationType, EvidenceStatus } from '@/types/database';
import { updateClueAction } from '../actions';
import {
  generateCluePreview,
  suggestCluePrompts,
  generateClueDescriptionAction,
  generateClueImageAction,
  generateStandardCharacterPhotoAction,
} from '@/app/actions/generator';
import { generateAudioClueAction, deleteAudioClueAction } from '@/app/actions/audio-generator';
import { VoiceRegion, VOICE_REGION_OPTIONS, parseAudioTranscript } from '@/lib/voices';
import { ElevenLabsModelId } from '@/lib/elevenlabs';
import {
  hydrateTextWithCharacters,
  tokenizeTextWithCharacterRoles,
  getCharacterRoleTitle,
  getCharacterDisplayName,
  findInvolvedCharactersInText,
  getGuestPhysicalDescription,
} from '@/utils/hydration';
import { CLUE_FORMAT_OPTIONS, inferClueFormat } from '@/utils/clue-format';
import { ClueRenderer } from '@/components/clues/ClueRenderer';
import { CustomSelect } from '@/components/ui/CustomSelect';

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
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(clue.title || '');
  const [description, setDescription] = useState(clue.description || '');
  const [generationPrompt, setGenerationPrompt] = useState(clue.generation_prompt || '');
  const [templateText, setTemplateText] = useState(clue.template_text || '');
  const [format, setFormat] = useState<ClueFormat>(
    (clue.format as ClueFormat) || inferClueFormat(clue)
  );
  
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [imageUrl, setImageUrl] = useState<string | null>(clue.static_image_url || null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [generatingStandardCharId, setGeneratingStandardCharId] = useState<string | null>(null);
  const [standardPhotosByCharId, setStandardPhotosByCharId] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const c of characters) {
      const profile = (c.profile_data as any) || {};
      const stdUrl = profile.standard_character_photo_url || profile.outfit_image_url || (c as any).image_url;
      if (stdUrl) {
        map[c.id] = stdUrl;
      }
    }
    return map;
  });

  const involvedCharactersForImage = findInvolvedCharactersInText(
    [generationPrompt, title, description].filter(Boolean).join('\n'),
    characters
  ).slice(0, 4);

  const handleGenerateStandardCharPhoto = async (characterId: string) => {
    setGeneratingStandardCharId(characterId);
    setImageError(null);
    try {
      const res = await generateStandardCharacterPhotoAction(mysteryId, characterId, true);
      if (res.success && res.imageUrl) {
        setStandardPhotosByCharId(prev => ({
          ...prev,
          [characterId]: res.imageUrl!,
        }));
        router.refresh();
      } else if (res.error) {
        setImageError(res.error);
      }
    } catch (e: any) {
      setImageError(e?.message || 'Failed to generate standard character photo');
    } finally {
      setGeneratingStandardCharId(null);
    }
  };

  // ElevenLabs Audio State
  const [audioUrl, setAudioUrl] = useState<string | null>(clue.audio_url || null);
  const [voiceRegion, setVoiceRegion] = useState<VoiceRegion>(
    (clue.voice_region as VoiceRegion) || 'en-AU'
  );
  const [audioModel, setAudioModel] = useState<ElevenLabsModelId>('eleven_v3');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isDeletingAudio, setIsDeletingAudio] = useState(false);
  const [audioElapsed, setAudioElapsed] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(true);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewCurrentTime, setPreviewCurrentTime] = useState(0);
  const [previewDuration, setPreviewDuration] = useState(0);

  useEffect(() => {
    if (!isGeneratingAudio) {
      setAudioElapsed(0);
      return;
    }
    const start = Date.now();
    const timer = setInterval(() => {
      setAudioElapsed(Number(((Date.now() - start) / 1000).toFixed(1)));
    }, 100);
    return () => clearInterval(timer);
  }, [isGeneratingAudio]);
  
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

      const tokenizedBeatTitle = tokenizeTextWithCharacterRoles(activeBeatTitle, characters);
      const results = await suggestCluePrompts(tokenizedBeatTitle);
      setSuggestions(results.map(r => tokenizeTextWithCharacterRoles(r, characters)));
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

      const tokenizedTitle = tokenizeTextWithCharacterRoles(title, characters);
      const tokenizedBeatTitle = tokenizeTextWithCharacterRoles(activeBeatTitle, characters);
      const tokenizedPrompt = tokenizeTextWithCharacterRoles(generationPrompt, characters);

      const rawResult = await generateClueDescriptionAction(
        tokenizedTitle,
        tokenizedBeatTitle,
        tokenizedPrompt,
        format
      );
      const result = tokenizeTextWithCharacterRoles(rawResult, characters);
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
      const tokenizedPrompt = tokenizeTextWithCharacterRoles(generationPrompt, characters);
      const rawResult = await generateCluePreview(tokenizedPrompt, templateText);
      const result = tokenizeTextWithCharacterRoles(rawResult, characters);
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
      // Persist current format & prompt first so generator uses the explicit format
      await updateClueAction(mysteryId, clue.id, {
        format,
        generation_prompt: generationPrompt,
      });
      const res: any = await generateClueImageAction(clue.id, mysteryId, generationPrompt);
      if (res?.success && res.imageUrl) {
        setImageUrl(res.imageUrl);
        if (Array.isArray(res.referencedCharacters)) {
          setStandardPhotosByCharId(prev => {
            const next = { ...prev };
            for (const rc of res.referencedCharacters) {
              if (rc.id && rc.standardPhotoUrl) {
                next[rc.id] = rc.standardPhotoUrl;
              }
            }
            return next;
          });
        }
        router.refresh();
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

  const handleGenerateAudio = async () => {
    if (!description.trim()) {
      alert('Please enter a dialogue transcript in the Internal Description field first.');
      return;
    }
    setIsGeneratingAudio(true);
    setAudioError(null);
    try {
      const res = await generateAudioClueAction({
        clueId: clue.id,
        mysteryId,
        transcript: description,
        voiceRegion,
        modelId: audioModel,
        title,
      });
      if (res.success && res.audioUrl) {
        setAudioUrl(res.audioUrl);
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
        router.refresh();
      } else {
        setAudioError(res.error || 'Failed to generate audio recording.');
      }
    } catch (e: any) {
      console.error('Audio Generation Error:', e);
      setAudioError(e?.message || 'An error occurred during audio generation.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleDeleteAudio = async () => {
    if (!confirm('Delete this generated audio recording?')) return;
    setIsDeletingAudio(true);
    setAudioError(null);
    try {
      const res = await deleteAudioClueAction({
        clueId: clue.id,
        mysteryId,
      });
      if (res.success) {
        if (previewAudioRef.current) {
          previewAudioRef.current.pause();
        }
        setIsPreviewPlaying(false);
        setPreviewCurrentTime(0);
        setPreviewDuration(0);
        setAudioUrl(null);
        router.refresh();
      } else {
        setAudioError(res.error || 'Failed to delete audio file.');
      }
    } catch (e: any) {
      setAudioError(e?.message || 'Failed to delete audio file.');
    } finally {
      setIsDeletingAudio(false);
    }
  };

  const formatAudioTime = (secs: number) => {
    const safe = Math.max(0, Math.floor(secs || 0));
    const mins = Math.floor(safe / 60);
    const rem = safe % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  const parsedAudioLines =
    format === 'audio'
      ? parseAudioTranscript(description, {
          voiceRegion,
          title,
          characters,
        })
      : [];

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

  const hydratedTitle = hydrateTextWithCharacters(title || 'Unnamed Evidence', characters, 'role');
  const hydratedDesc = description.trim()
    ? hydrateTextWithCharacters(description, characters, 'role')
    : '';

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

              const rawInternalNotes = (formData.get('internal_notes') as string) || '';
              const updates = {
                title: tokenizeTextWithCharacterRoles(title, characters) || title,
                description: tokenizeTextWithCharacterRoles(description, characters) || description,
                format,
                round_number: Number(formData.get('round_number')) || clue.round_number || 1,
                audio_url: audioUrl,
                voice_region: voiceRegion,
                generation_prompt: tokenizeTextWithCharacterRoles(generationPrompt, characters) || generationPrompt,
                template_text: tokenizeTextWithCharacterRoles(templateText, characters) || templateText,
                linked_plot_beat_id,
                linked_subplot_beat_id,
                evidence_status,
                clue_type: (formData.get('clue_type') as ClueType) || clue.clue_type,
                implication_type: (formData.get('implication_type') as ImplicationType) || clue.implication_type,
                is_essential: formData.get('is_essential') === 'on',
                internal_notes: rawInternalNotes ? tokenizeTextWithCharacterRoles(rawInternalNotes, characters) : rawInternalNotes,
                asset_mode: (formData.get('asset_mode') as any) || clue.asset_mode,
              };

              await updateClueAction(mysteryId, clue.id, updates);
              router.refresh();
              setIsSaving(false);
              onClose();
            }}
            className="space-y-8"
          >
            {/* Quick Overview & Live Format Preview Card at the Top */}
            <div className="bg-slate-900 text-white rounded-[2rem] p-6 shadow-xl border border-slate-800 space-y-4 mb-6">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    Live Digital Preview ({CLUE_FORMAT_OPTIONS.find(o => o.value === format)?.shortLabel})
                  </span>
                  <h3 className="text-lg font-black leading-snug">{hydratedTitle}</h3>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border shrink-0 ${
                  linkedBeatValue === 'fake' 
                    ? 'bg-rose-950/40 text-rose-400 border-rose-900/30' 
                    : 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                }`}>
                  {linkedBeatValue === 'fake' ? 'Fake Clue' : 'Real Clue'}
                </span>
              </div>

              {/* Beat Number or Fake */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-300 bg-slate-950/50 px-4 py-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 shrink-0">📍 Link:</span>
                <span className="italic text-slate-200">
                  {linkedBeatValue === 'fake' ? '🚫 Fake Clue (Not on timeline)' : (
                    (() => {
                      if (linkedBeatValue.startsWith('main_')) {
                        const beatId = linkedBeatValue.replace('main_', '');
                        const beat = beats.find(b => b.id === beatId);
                        return beat ? `Beat ${beat.beat_number}: ${hydrateTextWithCharacters(beat.event_title, characters, 'role')}` : 'Main Timeline Beat';
                      } else if (linkedBeatValue.startsWith('sub_')) {
                        const beatId = linkedBeatValue.replace('sub_', '');
                        const beat = subplots?.flatMap(s => s.subplot_beats || []).find((b: any) => b.id === beatId);
                        return beat ? `Subplot Beat: ${hydrateTextWithCharacters(beat.description, characters, 'role')}` : 'Subplot Beat';
                      }
                      return 'Timeline Linked';
                    })()
                  )}
                </span>
              </div>

              {/* Instant Live Format Preview Card */}
              <div className="relative rounded-2xl overflow-hidden">
                <ClueRenderer
                  clue={{
                    ...clue,
                    title,
                    description,
                    static_image_url: imageUrl,
                    audio_url: audioUrl,
                    voice_region: voiceRegion,
                    format,
                  }}
                  formatOverride={format}
                  hydratedTitle={hydratedTitle}
                  hydratedDescription={hydratedDesc || 'Enter description text below to preview hydrated clue content...'}
                  characters={characters}
                  compact={false}
                  showImage={true}
                />

                {/* Loading Overlay */}
                {isGeneratingImage && (
                  <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-4 animate-in fade-in duration-300 z-30 rounded-2xl">
                    <div className="relative flex items-center justify-center animate-bounce">
                      <div className="w-12 h-12 rounded-full border-4 border-brand-pink/20 border-t-brand-pink animate-spin"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-black uppercase tracking-widest text-brand-pink animate-pulse">Gemini 2.5 Flash Image</p>
                      <p className="text-[10px] text-slate-300 font-bold mt-1">Generating atmospheric crime scene photography...</p>
                    </div>
                  </div>
                )}

                {/* Error Overlay */}
                {imageError && (
                  <div className="absolute inset-0 bg-red-950/95 p-6 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in z-30 rounded-2xl">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-red-400">Generation Error</p>
                      <p className="text-[10px] text-red-200 mt-1 max-w-[260px] leading-relaxed mx-auto font-medium">{imageError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImageError(null)}
                      className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[10px] font-bold transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 1. Clue Format Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2.5">
                Clue Format (Digital Container & Print Layout)
              </label>
              <input type="hidden" name="format" value={format} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {CLUE_FORMAT_OPTIONS.map((opt) => {
                  const isSelected = format === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormat(opt.value)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/15 scale-[1.01]'
                          : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:border-brand-pink/40 hover:bg-brand-pink/5'
                      }`}
                    >
                      <span className="text-xs font-black tracking-tight">
                        {opt.label}
                      </span>
                      <span
                        className={`text-[9px] font-medium leading-tight ${
                          isSelected ? 'text-slate-300' : 'text-slate-400'
                        }`}
                      >
                        {opt.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Name & Round */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-2">Evidence Name</label>
                <input 
                  name="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-brand-blue/20"
                  placeholder="e.g. Direct Messages, LOTR GC..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Game Round</label>
                <CustomSelect
                  name="round_number"
                  defaultValue={String(clue.round_number || 1)}
                  className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-blue/20"
                >
                  <option value="1">Round 1</option>
                  <option value="2">Round 2</option>
                  <option value="3">Round 3</option>
                  <option value="4">Round 4</option>
                </CustomSelect>
              </div>
            </div>

            {/* 2. Reveal Point (Timeline Beat) */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Reveal Point (Timeline Beat)</label>
              <CustomSelect 
                name="linked_beat" 
                value={linkedBeatValue}
                onChange={e => setLinkedBeatValue(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                <option value="fake">🚫 Fake Clue (Not linked to timeline)</option>
                <optgroup label="Main Timeline Beats">
                  {beats.map(b => (
                    <option key={`main_${b.id}`} value={`main_${b.id}`}>
                      Beat {b.beat_number}: {hydrateTextWithCharacters(b.event_title, characters, 'role')}
                    </option>
                  ))}
                </optgroup>
                {subplots.map(subplot => (
                  <optgroup key={`subgroup_${subplot.id}`} label={`Subplot: ${hydrateTextWithCharacters(subplot.title || '', characters, 'role')}`}>
                    {subplot.subplot_beats?.map((sb: any) => (
                      <option key={`sub_${sb.id}`} value={`sub_${sb.id}`}>
                        Beat {sb.beat_number}: {hydrateTextWithCharacters(sb.description || '', characters, 'role')}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </CustomSelect>
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
                   const roleTitle = getCharacterRoleTitle(char);
                   const tag = `{{${roleTitle}}}`;
                   return (
                     <button
                       key={char.id}
                       type="button"
                       onClick={() => handleInsertTag(tag)}
                       className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:text-brand-pink hover:border-brand-pink hover:bg-brand-pink/5 transition-all shadow-sm flex items-center gap-1 active:scale-95 cursor-pointer"
                     >
                       <span>{tag}</span>
                     </button>
                   );
                 })}
               </div>
               <p className="text-[9px] text-slate-400 mt-2 font-medium italic leading-relaxed">
                 Click a character role to insert at current cursor. Automatically hydrates to the assigned friend&apos;s name (or role title if unassigned).
               </p>
            </div>

            {/* 3B. ElevenLabs Audio Voice Settings Drawer (When format === 'audio') */}
            {format === 'audio' && (
              <div className="bg-slate-950 text-white rounded-[2rem] border border-blue-500/30 shadow-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings((prev) => !prev)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-slate-900/90 border-b border-slate-800 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-sm">
                      🎙️
                    </span>
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 block">
                        Audio Voice Settings
                      </span>
                      <span className="text-[11px] font-bold text-slate-300">
                        ElevenLabs Multi-Speaker Pipeline • {parsedAudioLines.length} dialogue {parsedAudioLines.length === 1 ? 'line' : 'lines'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                    {showVoiceSettings ? '▲ Hide' : '▼ Configure'}
                  </span>
                </button>

                {showVoiceSettings && (
                  <div className="p-6 space-y-5 animate-in fade-in duration-200">
                    {/* Accent / Locale & Model Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Accent / Locale Pool
                        </label>
                        <CustomSelect
                          value={voiceRegion}
                          onChange={(e) => setVoiceRegion(e.target.value as VoiceRegion)}
                          variant="dark"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-400"
                        >
                          {VOICE_REGION_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.flag} {opt.label}
                            </option>
                          ))}
                        </CustomSelect>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Synthesis Model
                        </label>
                        <CustomSelect
                          value={audioModel}
                          onChange={(e) => setAudioModel(e.target.value as ElevenLabsModelId)}
                          variant="dark"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-blue-400"
                        >
                          <option value="eleven_v3">
                            Eleven v3 (Expressive Acting &amp; Emotion Guidance)
                          </option>
                          <option value="eleven_multilingual_v2">
                            Multilingual v2 (Classic Inflection)
                          </option>
                          <option value="eleven_turbo_v2_5">
                            Turbo v2.5 (50% Credit Cost • Fast)
                          </option>
                        </CustomSelect>
                      </div>
                    </div>

                    {/* Line-by-Line Speaker Mapping Preview */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Line-by-Line Speaker &amp; Tone Guidance Preview
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          +350ms pause between turns
                        </span>
                      </div>

                      {parsedAudioLines.length === 0 ? (
                        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 text-xs text-slate-400 italic">
                          No speaker lines detected yet. Add dialogue lines like{' '}
                          <code className="text-blue-300 font-mono">[00:04] &#123;&#123;The Producer&#125;&#125;: &quot;Dialogue line...&quot;</code>{' '}
                          in the Description box above.
                        </div>
                      ) : (
                        <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                          {parsedAudioLines.map((line) => (
                            <div
                              key={line.index}
                              className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/90 flex flex-col gap-1.5"
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-[10px] font-black uppercase tracking-wider text-blue-300 truncate">
                                    {line.displaySpeaker}
                                  </span>
                                  {line.timestamp && (
                                    <span className="text-[9px] font-mono text-slate-500">
                                      [{line.timestamp}]
                                    </span>
                                  )}
                                  {line.deliveryTag && (
                                    <span className="px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-700/50 text-[9px] font-mono font-bold text-purple-300">
                                      🎭 {line.deliveryTag}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-md shrink-0 capitalize">
                                  🔊 {line.voiceProfile.gender} voice • {line.voiceProfile.tone}
                                </span>
                              </div>
                              <p className="text-xs text-slate-200 font-medium leading-snug line-clamp-2">
                                &ldquo;{line.dialogue}&rdquo;
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-[9px] text-slate-400 italic leading-relaxed">
                        💡 Tip: Sentence tone is automatically inferred, or you can prefix any line with{' '}
                        <code className="text-purple-300 font-mono">[angry]</code>,{' '}
                        <code className="text-purple-300 font-mono">[whispers]</code>,{' '}
                        <code className="text-purple-300 font-mono">[sarcastic]</code>, or{' '}
                        <code className="text-purple-300 font-mono">[laughs]</code> to direct how it sounds.
                      </p>
                    </div>

                    {/* Error Message */}
                    {audioError && (
                      <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/70 text-red-200 text-xs font-bold flex items-center justify-between gap-2">
                        <span>⚠️ {audioError}</span>
                        <button
                          type="button"
                          onClick={() => setAudioError(null)}
                          className="text-red-400 hover:text-white font-black"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Playable Audio Preview Widget (when audioUrl exists) */}
                    {audioUrl && (
                      <div className="p-3.5 rounded-2xl bg-slate-900 border border-blue-500/30 space-y-2.5">
                        <audio
                          ref={previewAudioRef}
                          src={audioUrl}
                          preload="metadata"
                          onLoadedMetadata={(e) => {
                            const dur = e.currentTarget.duration;
                            if (dur && Number.isFinite(dur)) {
                              setPreviewDuration(dur);
                            }
                          }}
                          onTimeUpdate={(e) => {
                            setPreviewCurrentTime(e.currentTarget.currentTime);
                          }}
                          onPlay={() => setIsPreviewPlaying(true)}
                          onPause={() => setIsPreviewPlaying(false)}
                          onEnded={() => {
                            setIsPreviewPlaying(false);
                            setPreviewCurrentTime(0);
                          }}
                        />

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                            Cached CDN Recording Ready ($0.00 / play)
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {formatAudioTime(previewCurrentTime)} /{' '}
                            {formatAudioTime(previewDuration)}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={async () => {
                              const el = previewAudioRef.current;
                              if (!el) return;
                              if (isPreviewPlaying) {
                                el.pause();
                              } else {
                                await el.play();
                              }
                            }}
                            className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-md shrink-0 cursor-pointer"
                          >
                            {isPreviewPlaying ? '❚❚' : '▶'}
                          </button>

                          <input
                            type="range"
                            min={0}
                            max={previewDuration && Number.isFinite(previewDuration) ? previewDuration : 100}
                            step={0.1}
                            value={previewCurrentTime}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPreviewCurrentTime(val);
                              if (previewAudioRef.current) {
                                previewAudioRef.current.currentTime = val;
                              }
                            }}
                            className="flex-grow accent-blue-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                          />

                          <button
                            type="button"
                            onClick={handleDeleteAudio}
                            disabled={isDeletingAudio || isGeneratingAudio}
                            className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 border border-red-800/50 text-[10px] font-black uppercase tracking-wider text-red-300 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                          >
                            {isDeletingAudio ? 'Deleting...' : 'Delete File'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Generate / Re-generate Recording Button */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Stitches each character line with their regional voice and uploads once to Supabase CDN.
                      </p>
                      <button
                        type="button"
                        onClick={handleGenerateAudio}
                        disabled={isGeneratingAudio || parsedAudioLines.length === 0}
                        className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-blue-600/25 transition-all disabled:opacity-50 shrink-0 flex items-center gap-2 cursor-pointer"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            <span>Stitching... ({audioElapsed.toFixed(1)}s)</span>
                          </>
                        ) : (
                          <>
                            <span>🎙️</span>
                            <span>
                              {audioUrl ? 'Re-generate Recording' : 'Generate Recording'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. AI Image Description */}
            <div className="space-y-6 bg-brand-pink/5 p-8 rounded-[2rem] border border-brand-pink/10">
              <div className="flex justify-between items-center border-b border-brand-pink/10 pb-4">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">AI Image Description</h3>
                <CustomSelect 
                  name="asset_mode" 
                  defaultValue={clue.asset_mode || 'static'} 
                  className="px-3 py-1.5 bg-white border border-brand-pink/20 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none"
                >
                  <option value="static">Manual Mode</option>
                  <option value="generated">AI Prompt Mode</option>
                </CustomSelect>
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
                    placeholder="Specific details for the illustration (e.g. {{The Ex}}'s muddy fingerprint on a champagne bottle)..."
                    className="w-full px-6 py-4 bg-white border border-brand-pink/10 rounded-2xl font-bold text-xs outline-none focus:ring-2 focus:ring-brand-pink/20 resize-none"
                  />

                  {/* Character Visual Consistency Lock Panel */}
                  <div className="mt-3 p-4 rounded-2xl bg-white/90 border border-brand-pink/15 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                          Character Visual Consistency Lock
                        </span>
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-brand-pink bg-brand-pink/10 px-2 py-0.5 rounded-full">
                        {involvedCharactersForImage.length > 0
                          ? `${involvedCharactersForImage.length} Character${involvedCharactersForImage.length > 1 ? 's' : ''} Locked`
                          : 'Prop / Environment Only'}
                      </span>
                    </div>

                    {involvedCharactersForImage.length === 0 ? (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Mention any character role (e.g. <span className="font-bold text-slate-700">{`{{The Star}}`}</span>) in the prompt above to automatically generate their canonical <span className="font-bold text-slate-700">Standard Character Photo</span> from their guest description and lock their look into this scene.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                          Each character below uses their canonical <span className="font-bold text-slate-700">Standard Character Reference Photo</span> (built from their guest physical description + character costume) so they look identical across every visual clue:
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {involvedCharactersForImage.map((char, idx) => {
                            const roleTitle = getCharacterRoleTitle(char);
                            const profile = (char.profile_data as any) || {};
                            const physicalTraits = getGuestPhysicalDescription(profile, char.gender || profile.gender);
                            const stdPhotoUrl = standardPhotosByCharId[char.id] || profile.standard_character_photo_url || profile.outfit_image_url || (char as any).image_url;
                            const isGenThisChar = generatingStandardCharId === char.id;

                            return (
                              <div
                                key={char.id}
                                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70"
                              >
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300 flex items-center justify-center">
                                  {stdPhotoUrl ? (
                                    <img
                                      src={stdPhotoUrl}
                                      alt={roleTitle}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-[9px] font-black uppercase text-slate-400 text-center leading-tight px-1">
                                      Auto
                                    </span>
                                  )}
                                  <span className="absolute top-0.5 left-0.5 bg-slate-900/80 text-white text-[8px] font-black px-1 rounded">
                                    #{idx + 1}
                                  </span>
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-xs font-black text-slate-900 truncate">
                                      {roleTitle}
                                    </span>
                                    <span
                                      className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                        stdPhotoUrl
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'bg-amber-100 text-amber-700'
                                      }`}
                                    >
                                      {stdPhotoUrl ? 'Standard Photo Ready' : 'Auto-Creates First'}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                    {physicalTraits || 'Uses assigned guest appearance & character outfit'}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleGenerateStandardCharPhoto(char.id)}
                                  disabled={isGenThisChar || isGeneratingImage}
                                  title="Generate or refresh this character's canonical Standard Character Reference Photo"
                                  className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-brand-pink text-[10px] font-bold text-slate-700 hover:text-brand-pink transition-all disabled:opacity-50"
                                >
                                  {isGenThisChar
                                    ? 'Creating...'
                                    : stdPhotoUrl
                                    ? '↻ Refresh Base'
                                    : '✨ Create Base'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                    <p className="text-[10px] text-slate-400 font-medium italic max-w-xs leading-relaxed">
                      Describes the visual settings and key details. Characters mentioned will match their Standard Character Photo.
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
                            {involvedCharactersForImage.some(c => !standardPhotosByCharId[c.id])
                              ? 'Creating Base & Scene...'
                              : 'Drawing Scene...'}
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
                      <CustomSelect 
                        name="clue_type" 
                        defaultValue={clue.clue_type || 'physical'} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs"
                      >
                        {clueTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                      </CustomSelect>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">Implication</label>
                      <CustomSelect 
                        name="implication_type" 
                        defaultValue={clue.implication_type || 'circumstantial'} 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs"
                      >
                        {implications.map(i => <option key={i} value={i}>{i.replace('_', ' ').toUpperCase()}</option>)}
                      </CustomSelect>
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
                      defaultValue={hydrateTextWithCharacters(clue.internal_notes || '', characters, 'role')}
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
