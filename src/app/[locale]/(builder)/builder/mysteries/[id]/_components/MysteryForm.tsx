'use client';

import React, { useActionState, useState } from 'react';
import { updateMysteryAction } from '../../actions';
import { AIGenerateDescriptionButton } from './AIGenerateDescriptionButton';
import { AIGenerateCoverButton } from './AIGenerateCoverButton';
import { MysterySettings } from './MysterySettings';
import { SubmitButton } from './SubmitButton';
import { ThemeCombobox } from '@/components/ui/ThemeCombobox';
import { MoodboardStudio } from '@/components/admin/MoodboardStudio';

export function MysteryForm({ mystery, mysteryId }: { mystery: any; mysteryId: string }) {
  const updateWithId = updateMysteryAction.bind(null, mysteryId);
  const [state, formAction] = useActionState(updateWithId, null);
  const [themeValue, setThemeValue] = useState<string>(mystery.theme || '');

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
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
          <input 
            name="title"
            defaultValue={mystery.title}
            required
            className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-200 focus:border-brand-pink outline-none font-black text-2xl transition-all placeholder:text-slate-300"
            placeholder="e.g. Love on the Rocks"
          />
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
        <div className="flex justify-between items-end">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Description / Synopsis</label>
          <AIGenerateDescriptionButton mysteryId={mysteryId} />
        </div>
        <textarea 
          name="description"
          defaultValue={mystery.description || ''}
          rows={6}
          className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-medium transition-all resize-none shadow-sm"
          placeholder="Brief synopsis..."
        />
      </div>

      <div className="pt-2">
        <AIGenerateCoverButton mysteryId={mysteryId} currentImageUrl={mystery.image_url} />
      </div>

      {/* Mood Board & Multi-Photo Vibe Uploader */}
      <div className="pt-2">
        <MoodboardStudio
          mysteryId={mysteryId}
          mysteryTitle={mystery.title}
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
