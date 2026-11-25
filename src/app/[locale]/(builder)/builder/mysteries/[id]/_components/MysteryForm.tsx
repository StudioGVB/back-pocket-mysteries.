'use client';

import React, { useActionState, useState } from 'react';
import {
  updateMysteryAction,
  suggestMysteryTitlesAction,
  SuggestedTitleOption,
} from '../../actions';
import { AIGenerateDescriptionButton } from './AIGenerateDescriptionButton';
import { AIGenerateCoverButton } from './AIGenerateCoverButton';
import { MysterySettings } from './MysterySettings';
import { SubmitButton } from './SubmitButton';
import { ThemeCombobox } from '@/components/ui/ThemeCombobox';
import { MoodboardStudio } from '@/components/admin/MoodboardStudio';

export function MysteryForm({ mystery, mysteryId }: { mystery: any; mysteryId: string }) {
  const updateWithId = updateMysteryAction.bind(null, mysteryId);
  const [state, formAction] = useActionState(updateWithId, null);
  const [titleValue, setTitleValue] = useState<string>(mystery.title || '');
  const [themeValue, setThemeValue] = useState<string>(mystery.theme || '');
  const [descriptionValue, setDescriptionValue] = useState<string>(mystery.description || '');
  const [descError, setDescError] = useState<string | null>(null);

  // 3-Option AI Title Generator State
  const [titleSuggestions, setTitleSuggestions] = useState<SuggestedTitleOption[]>([]);
  const [seenTitles, setSeenTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState<boolean>(false);
  const [titleError, setTitleError] = useState<string | null>(null);

  const handleSuggestTitles = async () => {
    setIsGeneratingTitles(true);
    setTitleError(null);
    try {
      const res = await suggestMysteryTitlesAction({
        workingTitle: titleValue,
        theme: themeValue,
        spiceLevel: mystery.spice_level || 'mild',
        description: descriptionValue,
        previousTitles: seenTitles,
      });
      if (!res.success || !res.options || res.options.length === 0) {
        setTitleError(res.error || 'Could not generate title suggestions.');
      } else {
        setTitleSuggestions(res.options);
        setSeenTitles((prev) => [
          ...prev,
          ...res.options!.map((o) => o.title),
        ]);
      }
    } catch (err: any) {
      setTitleError(err?.message || 'Error generating title suggestions.');
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-200 font-medium">
          Error saving: {state.error}
          {state.error.includes('schema cache') && (
            <p className="mt-2 text-xs opacity-80">Did you forget to run the SQL migration in your Supabase dashboard?</p>
          )}
        </div>
      )}
      {state?.success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl border border-green-200 font-medium flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          Saved successfully!
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Title
            </label>
            <button
              type="button"
              onClick={handleSuggestTitles}
              disabled={isGeneratingTitles}
              className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-brand-pink hover:text-brand-blue transition-colors disabled:opacity-50 cursor-pointer"
            >
              <span className={isGeneratingTitles ? 'animate-spin' : ''}>✨</span>
              {isGeneratingTitles
                ? 'Brainstorming 3 Titles...'
                : titleSuggestions.length > 0
                  ? '🔄 Refresh 3 More Titles'
                  : 'Suggest 3 Creative Titles'}
            </button>
          </div>
          <input
            name="title"
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            required
            className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-200 focus:border-brand-pink outline-none font-black text-2xl transition-all placeholder:text-slate-300"
            placeholder="e.g. Love on the Rocks"
          />

          {titleError && (
            <p className="text-xs font-bold text-red-500">{titleError}</p>
          )}

          {titleSuggestions.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  ✨ Pick a Title ({(mystery.spice_level || 'mild').toUpperCase()} Spice • {themeValue || 'Custom Theme'})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSuggestTitles}
                    disabled={isGeneratingTitles}
                    className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline cursor-pointer"
                  >
                    {isGeneratingTitles ? 'Refreshing...' : '🔄 Refresh 3'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTitleSuggestions([])}
                    className="text-[10px] font-black text-slate-400 hover:text-slate-700 cursor-pointer px-1"
                    title="Close suggestions"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {titleSuggestions.map((opt, idx) => {
                  const isCurrent =
                    titleValue.trim().toLowerCase() === opt.title.trim().toLowerCase();
                  return (
                    <button
                      key={`${opt.title}-${idx}`}
                      type="button"
                      onClick={() => setTitleValue(opt.title)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isCurrent
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white hover:bg-pink-50/60 text-slate-900 border-slate-200 hover:border-brand-pink/40'
                      }`}
                    >
                      <span className="text-xs font-black tracking-tight">{opt.title}</span>
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          isCurrent
                            ? 'bg-brand-pink text-white'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isCurrent ? '✓ Selected' : opt.vibeTag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Theme
            </label>
            <span className="text-[10px] font-bold text-slate-400">
              Pick from list or type any custom theme
            </span>
          </div>
          <ThemeCombobox
            name="theme"
            value={themeValue}
            onChange={setThemeValue}
            required
            variant="underline"
            placeholder="Select a theme or type your own..."
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap justify-between items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Description / Synopsis
            </label>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
              🔒 Spoiler-Guardrailed (Scene, Background &amp; Vibe Only)
            </span>
          </div>
          <AIGenerateDescriptionButton
            mysteryId={mysteryId}
            title={titleValue}
            theme={themeValue}
            spiceLevel={mystery.spice_level}
            onGenerated={(nextDesc) => setDescriptionValue(nextDesc)}
            onError={(err) => setDescError(err)}
          />
        </div>
        {descError && (
          <div className="text-red-500 text-xs font-bold bg-red-50 p-2.5 rounded-lg border border-red-200">
            {descError}
          </div>
        )}
        <textarea
          name="description"
          value={descriptionValue}
          onChange={(e) => setDescriptionValue(e.target.value)}
          rows={6}
          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-medium transition-all resize-none shadow-sm"
          placeholder="Brief synopsis..."
        />
      </div>

      {/* Single Unified Photos & Primary Cover Section */}
      <div className="pt-2">
        <MoodboardStudio
          mysteryId={mysteryId}
          mysteryTitle={titleValue || mystery.title}
          theme={themeValue || mystery.theme}
          initialImageUrl={mystery.image_url}
        />
      </div>

      <MysterySettings
        mysteryId={mysteryId}
        characterCount={Array.isArray(mystery.characters) ? mystery.characters.length : 0}
        initialComplexity={mystery.complexity || 'medium'}
        initialSpiceLevel={mystery.spice_level || 'low'}
        initialStatus={mystery.status}
        initialMinPlayers={mystery.min_players}
        initialMaxPlayers={mystery.max_players}
      />

      <div className="flex justify-start pt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
