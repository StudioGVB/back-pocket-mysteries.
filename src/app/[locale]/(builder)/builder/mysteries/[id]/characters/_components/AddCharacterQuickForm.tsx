'use client';

import React, { useRef, useState } from 'react';
import { addCharacterAction } from '../actions';
import { Archetype, PlotRole } from '@/types/database';

interface AddCharacterQuickFormProps {
  mysteryId: string;
}

import { AIGenerateCharacterButton } from './AIGenerateCharacterButton';
import { RoleTitleInput } from './RoleTitleInput';
import { CustomSelect } from '@/components/ui/CustomSelect';

export function AddCharacterQuickForm({ mysteryId }: AddCharacterQuickFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, setIsPending] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [importance, setImportance] = useState('optional');
  const [plotRole, setPlotRole] = useState('innocent');
  const [gender, setGender] = useState('adaptable');

  const handleGenerated = (character: any) => {
    setPrefix(character.prefix || '');
    setName(character.name || '');
    setTitle(character.title || '');
    setImportance(character.is_mandatory ? 'mandatory' : 'optional');
    setPlotRole(character.plot_role || 'innocent');
    setGender(character.gender || 'adaptable');
  };

  return (
    <div className="bg-white p-1 rounded-[2.4rem] shadow-sm">
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-full bg-brand-pink/10 flex items-center justify-center">
            <span className="text-brand-pink text-xs">🎭</span>
          </div>
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-[0.2em]">Enroll New Cast Member</h3>
        </div>
        
        <AIGenerateCharacterButton mysteryId={mysteryId} onGenerated={handleGenerated} />
      </div>

      <form 
        ref={formRef}
        action={async (formData) => {
          setIsPending(true);
          try {
            await addCharacterAction(mysteryId, formData);
            setPrefix('');
            setName('');
            setTitle('');
            setImportance('optional');
            setPlotRole('innocent');
            setGender('adaptable');
          } finally {
            setIsPending(false);
          }
        }}
        className="p-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 bg-slate-50/50 p-6 rounded-[1.8rem] border border-slate-100">
          {/* Role / Title Field */}
          <div className="md:col-span-4">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Character Title / Role</label>
            <input type="hidden" name="base_name" value={title} />
            <RoleTitleInput 
              mysteryId={mysteryId}
              value={title}
              onChange={(val) => {
                setTitle(val);
                setName(val);
              }}
              inputClassName="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm placeholder:text-slate-300 shadow-sm"
            />
          </div>

          {/* Prefix Field */}
          <div className="md:col-span-2">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Prefix (Optional)</label>
            <input 
              name="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. Captain"
              className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm placeholder:text-slate-300 shadow-sm"
            />
          </div>
          
          {/* Importance Field */}
          <div className="md:col-span-2">
             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Importance</label>
             <CustomSelect 
               name="importance"
               required
               value={importance}
               onChange={(e) => setImportance(e.target.value)}
               className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm shadow-sm"
             >
               <option value="mandatory">Mandatory</option>
               <option value="optional">Optional</option>
             </CustomSelect>
          </div>

          {/* Plot Role Field */}
          <div className="md:col-span-2">
             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Plot Role</label>
             <CustomSelect 
               name="plot_role"
               required
               value={plotRole}
               onChange={(e) => setPlotRole(e.target.value)}
               className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm shadow-sm"
             >
               <option value="innocent">Innocent</option>
               <option value="killer">Killer</option>
               <option value="assistant">Assistant</option>
               <option value="victim">Victim</option>
             </CustomSelect>
          </div>

          {/* Gender Field */}
          <div className="md:col-span-2">
             <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Gender</label>
             <CustomSelect 
               name="gender"
               required
               value={gender}
               onChange={(e) => setGender(e.target.value)}
               className="w-full px-5 py-4 bg-white border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-brand-pink/10 focus:border-brand-pink outline-none font-bold transition-all text-sm shadow-sm"
             >
               <option value="adaptable">Adaptable ⚧</option>
               <option value="female">Female ♀</option>
               <option value="male">Male ♂</option>
             </CustomSelect>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-12 flex items-end">
            <button 
              disabled={isPending}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-pink transition-all shadow-xl shadow-slate-900/10 active:scale-95 disabled:opacity-50 h-[56px]"
            >
              {isPending ? 'Working...' : 'Create profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
