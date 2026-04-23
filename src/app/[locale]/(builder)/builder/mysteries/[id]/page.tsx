import React from 'react';
import { getMysteryById } from '@/services/mysteries';
import { updateMysteryAction } from '../actions';
import { Locale } from '@/lib/i18n-config';
import { AIGenerateDescriptionButton } from './_components/AIGenerateDescriptionButton';

export default async function MysteryOverviewPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const mystery = await getMysteryById(id);

  if (!mystery) return null;

  const updateWithId = updateMysteryAction.bind(null, id);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Mystery Details</h1>
        <p className="text-slate-500 font-medium text-sm">Fill in the core details to define your mystery experience.</p>
      </div>

      <div className="max-w-4xl space-y-8">
        <form action={updateWithId} className="space-y-8">
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
              <AIGenerateDescriptionButton mysteryId={id} />
            </div>
            <textarea 
              name="description"
              defaultValue={mystery.description || ''}
              rows={6}
              className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-medium transition-all resize-none shadow-sm"
              placeholder="Brief synopsis..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</label>
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {['easy', 'medium', 'hard'].map(level => (
                  <label key={level} className="flex-1 cursor-pointer">
                    <input type="radio" name="complexity" value={level} defaultChecked={mystery.complexity === level || (!mystery.complexity && level === 'medium')} className="peer hidden" />
                    <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-slate-600 peer-checked:bg-slate-900 peer-checked:text-white transition-all">
                      {level}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Spice Level</label>
              <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                {['low', 'medium', 'high'].map(level => (
                  <label key={level} className="flex-1 cursor-pointer">
                    <input type="radio" name="spice_level" value={level} defaultChecked={mystery.spice_level === level || (!mystery.spice_level && level === 'low')} className="peer hidden" />
                    <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-brand-pink/50 peer-checked:bg-brand-pink peer-checked:text-white transition-all">
                      {level}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
              <select 
                name="status"
                defaultValue={mystery.status}
                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-bold transition-all appearance-none shadow-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Min Players</label>
              <select 
                name="min_players"
                defaultValue={mystery.min_players}
                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-bold transition-all appearance-none shadow-sm"
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Max Players</label>
              <select 
                name="max_players"
                defaultValue={mystery.max_players}
                className="w-full px-5 py-3 bg-white border border-slate-200 rounded-xl focus:border-brand-pink outline-none font-bold transition-all appearance-none shadow-sm"
              >
                {[5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-start pt-6">
            <button className="px-8 py-3 bg-brand-pink text-white rounded-xl font-black uppercase tracking-widest hover:bg-[#FF3366] transition-all shadow-lg shadow-brand-pink/20">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
