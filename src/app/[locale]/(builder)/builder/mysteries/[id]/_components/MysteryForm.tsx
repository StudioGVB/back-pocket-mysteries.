'use client';

import React, { useActionState } from 'react';
import { updateMysteryAction } from '../../actions';
import { AIGenerateDescriptionButton } from './AIGenerateDescriptionButton';
import { MysterySettings } from './MysterySettings';
import { SubmitButton } from './SubmitButton';

export function MysteryForm({ mystery, mysteryId }: { mystery: any; mysteryId: string }) {
  const updateWithId = updateMysteryAction.bind(null, mysteryId);
  const [state, formAction] = useActionState(updateWithId, null);

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
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Theme</label>
          <div className="relative">
            <select 
              name="theme"
              defaultValue={mystery.theme || ''}
              required
              className="w-full px-0 py-2 bg-transparent border-b-2 border-slate-200 focus:border-brand-pink outline-none font-black text-2xl transition-all appearance-none cursor-pointer text-slate-900"
            >
              <option value="" disabled>Select a theme...</option>
              <option value="1920s Speakeasy / Great Gatsby">1920s Speakeasy / Great Gatsby</option>
              <option value="Yacht / Luxury Cruise">Yacht / Luxury Cruise</option>
              <option value="Corporate Retreat">Corporate Retreat</option>
              <option value="Haunted Mansion">Haunted Mansion</option>
              <option value="Masquerade Ball">Masquerade Ball</option>
              <option value="Wild West Saloon">Wild West Saloon</option>
              <option value="Hollywood Premiere">Hollywood Premiere</option>
              <option value="80s Prom">80s Prom</option>
              <option value="Casino Royale">Casino Royale</option>
              <option value="Winter Chalet">Winter Chalet</option>
              <option value="Tropical Island Resort">Tropical Island Resort</option>
              <option value="Pirate Ship">Pirate Ship</option>
              <option value="High School Reunion">High School Reunion</option>
              <option value="Space Station">Space Station</option>
              <option value="Art Gallery Opening">Art Gallery Opening</option>
              <option value="Fantasy Kingdom">Fantasy Kingdom</option>
              <option value="Cyberpunk City">Cyberpunk City</option>
              <option value="Vintage Circus">Vintage Circus</option>
              <option value="Wedding Reception">Wedding Reception</option>
              <option value="Vineyard / Wine Tasting">Vineyard / Wine Tasting</option>
              <option value="Country Club Golf Tournament">Country Club Golf Tournament</option>
              <option value="Gothic Castle">Gothic Castle</option>
              <option value="Mafia / Mobster">Mafia / Mobster</option>
              <option value="Roaring 20s Jazz Club">Roaring 20s Jazz Club</option>
              <option value="Victorian London / Sherlock">Victorian London / Sherlock</option>
              <option value="Medieval Banquet">Medieval Banquet</option>
              <option value="Summer Camp">Summer Camp</option>
              <option value="Billionaire's Private Island">Billionaire's Private Island</option>
              <option value="Train Journey (Orient Express)">Train Journey (Orient Express)</option>
              <option value="Halloween Party">Halloween Party</option>
              <option value="Christmas Party">Christmas Party</option>
              <option value="Custom">Custom / Other</option>
            </select>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
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

      <MysterySettings 
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
