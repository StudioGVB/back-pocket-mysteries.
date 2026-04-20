import React from 'react';
import { getMysteryById } from '@/services/mysteries';
import { updateMysteryAction } from '../actions';

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

      <div className="bg-white rounded-[2.5rem] p-0 border-0 space-y-8">
        <form action={updateWithId} className="space-y-10">
          <div className="grid grid-cols-1 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Title</label>
              <input 
                name="title"
                defaultValue={mystery.title}
                required
                className="w-full px-0 py-3 bg-transparent border-b-2 border-slate-100 focus:border-brand-pink outline-none font-bold text-2xl transition-all placeholder:text-slate-200"
                placeholder="e.g. Love on the Rocks"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Theme</label>
              <input 
                name="theme"
                defaultValue={mystery.theme || ''}
                required
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all"
                placeholder="e.g. 1920s Gatsby, Corporate Retreat"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Description</label>
            <textarea 
              name="description"
              defaultValue={mystery.description || ''}
              rows={5}
              className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all resize-none"
              placeholder="Brief synopsis..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Status</label>
              <select 
                name="status"
                defaultValue={mystery.status}
                className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all appearance-none"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex gap-4">
               <div className="flex-grow space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Min Players</label>
                <select 
                  name="min_players"
                  defaultValue={mystery.min_players}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all appearance-none"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-grow space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Max Players</label>
                <select 
                  name="max_players"
                  defaultValue={mystery.max_players}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none font-bold transition-all appearance-none"
                >
                  {[5, 6, 7, 8, 9, 10, 11, 12, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-start pt-4">
            <button className="px-10 py-4 bg-brand-pink text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-pink/90 transition-all shadow-xl shadow-brand-pink/20 active:scale-95">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
