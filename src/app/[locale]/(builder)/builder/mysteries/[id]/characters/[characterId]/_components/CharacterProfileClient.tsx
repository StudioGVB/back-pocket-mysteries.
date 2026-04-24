'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateCharacterProfileAIAction, updateCharacterProfileAction, updateCharacterAction } from '../../actions';
import { getCharacterColor } from '@/utils/colors';

interface CharacterProfileClientProps {
  mystery: any;
  character: any;
  allCharacters: any[];
}

export function CharacterProfileClient({ mystery, character, allCharacters }: CharacterProfileClientProps) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const isAdaptable = character.gender === 'adaptable';
  const defaultPresentation = { outfit_advice: '', act_summary: '', act_bullets: ['', '', ''] };

  const [activeTab, setActiveTab] = useState<'male' | 'female'>('male');
  
  const [profileData, setProfileData] = useState<any>(() => {
    const data = character.profile_data || {};
    if (isAdaptable) {
      return {
        bio: data.bio || '',
        presentation_male: data.presentation_male || { 
          outfit_advice: data.outfit_advice || '', 
          act_summary: data.act_summary || '', 
          act_bullets: data.act_bullets || ['', '', ''] 
        },
        presentation_female: data.presentation_female || { ...defaultPresentation }
      };
    } else {
      return {
        bio: data.bio || '',
        outfit_advice: data.outfit_advice || '',
        act_summary: data.act_summary || '',
        act_bullets: data.act_bullets || ['', '', '']
      };
    }
  });

  const charColor = getCharacterColor({ 
    id: character.id, 
    is_victim: character.is_victim, 
    plot_role: character.plot_role 
  }, allCharacters);

  const characterName = character.name.split('|')[0] || 'Unknown';
  const characterTitle = character.name.includes('|') ? character.name.split('|')[1] : 'Guest';

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const generated = await generateCharacterProfileAIAction(mystery.id, character, mystery);
      setProfileData(generated);
      // Auto-save
      await updateCharacterProfileAction(mystery.id, character.id, generated);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to generate profile');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCharacterProfileAction(mystery.id, character.id, profileData);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    if (isAdaptable && field !== 'bio') {
      const presentationKey = activeTab === 'male' ? 'presentation_male' : 'presentation_female';
      setProfileData((prev: any) => ({
        ...prev,
        [presentationKey]: {
          ...(prev[presentationKey] || {}),
          [field]: value
        }
      }));
    } else {
      setProfileData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  const updateBullet = (index: number, value: string) => {
    if (isAdaptable) {
      const presentationKey = activeTab === 'male' ? 'presentation_male' : 'presentation_female';
      setProfileData((prev: any) => {
        const pres = prev[presentationKey] || {};
        const newBullets = [...(pres.act_bullets || [])];
        newBullets[index] = value;
        return { ...prev, [presentationKey]: { ...pres, act_bullets: newBullets } };
      });
    } else {
      const newBullets = [...(profileData.act_bullets || [])];
      newBullets[index] = value;
      setProfileData((prev: any) => ({ ...prev, act_bullets: newBullets }));
    }
  };

  const addBullet = () => {
    if (isAdaptable) {
      const presentationKey = activeTab === 'male' ? 'presentation_male' : 'presentation_female';
      setProfileData((prev: any) => {
        const pres = prev[presentationKey] || {};
        const newBullets = [...(pres.act_bullets || []), ''];
        return { ...prev, [presentationKey]: { ...pres, act_bullets: newBullets } };
      });
    } else {
      const newBullets = [...(profileData.act_bullets || []), ''];
      setProfileData((prev: any) => ({ ...prev, act_bullets: newBullets }));
    }
  };

  const removeBullet = (index: number) => {
    if (isAdaptable) {
      const presentationKey = activeTab === 'male' ? 'presentation_male' : 'presentation_female';
      setProfileData((prev: any) => {
        const pres = prev[presentationKey] || {};
        const newBullets = [...(pres.act_bullets || [])];
        newBullets.splice(index, 1);
        return { ...prev, [presentationKey]: { ...pres, act_bullets: newBullets } };
      });
    } else {
      const newBullets = [...(profileData.act_bullets || [])];
      newBullets.splice(index, 1);
      setProfileData((prev: any) => ({ ...prev, act_bullets: newBullets }));
    }
  };

  const currentPresentation = isAdaptable
    ? (profileData[activeTab === 'male' ? 'presentation_male' : 'presentation_female'] || {})
    : profileData;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div 
            className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner"
            style={{ backgroundColor: `${charColor}20`, color: charColor }}
          >
            {character.is_victim ? '💀' : '👤'}
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              {characterName}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-sm font-bold uppercase tracking-widest" style={{ color: charColor }}>
                {characterTitle}
              </p>
              <div className="w-1 h-1 rounded-full bg-slate-200"></div>
              <select
                value={character.gender || 'adaptable'}
                onChange={async (e) => {
                  const newGender = e.target.value;
                  await updateCharacterAction(mystery.id, character.id, { gender: newGender });
                  router.refresh();
                }}
                className="text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-200 rounded-full px-3 py-1 outline-none focus:ring-2 focus:ring-brand-pink/20 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="adaptable">Adaptable ⚧</option>
                <option value="female">Female ♀</option>
                <option value="male">Male ♂</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-6 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isGenerating ? 'Generating...' : '✨ Auto-Generate with AI'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isGenerating || showSuccess}
            className={`px-8 py-3 rounded-xl font-bold text-white transition-colors shadow-lg flex items-center justify-center min-w-[140px] ${
              showSuccess 
                ? 'bg-emerald-500 hover:bg-emerald-600' 
                : 'bg-slate-900 hover:bg-slate-800 disabled:opacity-50'
            }`}
          >
            {isSaving ? 'Saving...' : showSuccess ? '✓ Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Bio */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm h-full">
            <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: `${charColor}20`, color: charColor }}>
                1
              </span>
              The Backstory
            </h2>
            
            <div className="space-y-4">
              <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                Full Bio
              </label>
              <textarea
                value={profileData.bio || ''}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Write a compelling backstory here..."
                className="w-full h-64 rounded-xl border border-slate-200 p-4 text-sm resize-none focus:ring-2 focus:border-transparent transition-all"
                style={{ '--tw-ring-color': charColor } as any}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Persona & Vibe */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ backgroundColor: `${charColor}20`, color: charColor }}>
                  2
                </span>
                Visuals & Personality
              </h2>
              
              {isAdaptable && (
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setActiveTab('male')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === 'male' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Masculine
                  </button>
                  <button
                    onClick={() => setActiveTab('female')}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
                      activeTab === 'female' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    Feminine
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Outfit Advice
                </label>
                <textarea
                  value={currentPresentation.outfit_advice || ''}
                  onChange={(e) => updateField('outfit_advice', e.target.value)}
                  placeholder="Think money. Not flashy, not trendy..."
                  className="w-full h-24 rounded-xl border border-slate-200 p-4 text-sm resize-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': charColor } as any}
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  How to Act (Summary)
                </label>
                <textarea
                  value={currentPresentation.act_summary || ''}
                  onChange={(e) => updateField('act_summary', e.target.value)}
                  placeholder="You own the boat - and you act like it..."
                  className="w-full h-24 rounded-xl border border-slate-200 p-4 text-sm resize-none focus:ring-2 focus:border-transparent transition-all"
                  style={{ '--tw-ring-color': charColor } as any}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                    Behavioral Traits
                  </label>
                  <button onClick={addBullet} className="text-xs font-bold text-slate-500 hover:text-slate-900">
                    + Add Trait
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(currentPresentation.act_bullets || []).map((bullet: string, idx: number) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className="w-6 flex justify-center pt-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: charColor }} />
                      </div>
                      <input
                        type="text"
                        value={bullet}
                        onChange={(e) => updateBullet(idx, e.target.value)}
                        placeholder="e.g. Speak slowly and deliberately"
                        className="flex-grow rounded-lg border border-slate-200 p-2 text-sm focus:ring-2 focus:border-transparent transition-all"
                        style={{ '--tw-ring-color': charColor } as any}
                      />
                      <button 
                        onClick={() => removeBullet(idx)}
                        className="w-8 h-9 flex items-center justify-center text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
