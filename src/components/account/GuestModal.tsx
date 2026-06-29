'use client';

import React, { useState, KeyboardEvent } from 'react';
import { AvatarBuilder } from './AvatarBuilder';
import { buildAvatarUrl, AvatarConfig } from '@/utils/avatar';
import Image from 'next/image';
import { generateRandomQuirk } from '@/app/actions/generator';

interface GuestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (guestData: any) => Promise<void> | void;
  onDelete?: (id: string) => void;
  initialData?: any;
}

export function GuestModal({ isOpen, onClose, onSave, onDelete, initialData }: GuestModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'basics' | 'avatar' | 'personality'>('basics');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('Masculine');
  const [ethnicity, setEthnicity] = useState('');
  const [isEthnicityDropdownOpen, setIsEthnicityDropdownOpen] = useState(false);
  
  const [quirks, setQuirks] = useState<string[]>([]);
  const [currentQuirk, setCurrentQuirk] = useState('');
  const [bio, setBio] = useState('');
  const [isGeneratingQuirk, setIsGeneratingQuirk] = useState(false);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    seed: 'Felix',
    top: 'shortFlat',
    hairColor: '282828',
    skinColor: 'eac086',
    eyeColor: 'Brown',
    height: 'Average',
  });

  // Load initial data if provided
  React.useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setEmail(initialData.email || '');
        setGender(initialData.gender || 'Unspecified');
        setEthnicity(initialData.ethnicity || '');
        setQuirks(initialData.traits || []);
        setBio(initialData.bio || '');
        
        const isDataUri = initialData.avatar_url?.startsWith('data:image/');
        const baseTop = initialData.gender === 'Feminine' ? 'straight01' : 'shortFlat';
        
        let initialConfig: AvatarConfig = {
          seed: initialData.name || 'Felix',
          top: baseTop,
          hairColor: '282828',
          skinColor: 'ffe0bd',
          eyeColor: initialData.eye_color || 'Brown',
          height: initialData.height || 'Average',
        };

        if (initialData.avatar_url && !isDataUri) {
          try {
            const url = new URL(initialData.avatar_url);
            initialConfig = {
              seed: url.searchParams.get('seed') || initialData.name || 'Felix',
              top: url.searchParams.get('top') || baseTop,
              hairColor: url.searchParams.get('hairColor') || '282828',
              skinColor: url.searchParams.get('skinColor') || 'ffe0bd',
              eyeColor: initialData.eye_color || 'Brown',
              height: initialData.height || 'Average',
              facialHair: url.searchParams.get('facialHair') || undefined,
              accessories: url.searchParams.get('accessories') || undefined,
              build: url.searchParams.get('build') || undefined,
              distinctiveFeatures: url.searchParams.get('distinctiveFeatures') ? url.searchParams.get('distinctiveFeatures')!.split(',') : undefined,
            };
          } catch (e) {
            // Invalid URL, keep initialConfig
          }
        }
        
        setAvatarConfig(initialConfig);
      } else {
        // Reset
        setName('');
        setEmail('');
        setGender('Masculine');
        setEthnicity('');
        setQuirks([]);
        setBio('');
        setAvatarConfig({
          seed: 'Felix', top: 'shortFlat', hairColor: '282828', skinColor: 'ffe0bd', eyeColor: 'Brown', height: 'Average',
        });
      }
      setActiveTab('basics');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleGenerateQuirk = async () => {
    setIsGeneratingQuirk(true);
    try {
      const quirk = await generateRandomQuirk(name, gender);
      if (quirk && !quirks.includes(quirk)) {
        setQuirks([...quirks, quirk]);
      }
    } catch (error) {
      console.error('Failed to generate quirk:', error);
    } finally {
      setIsGeneratingQuirk(false);
    }
  };

  // DiceBear Avataaars API URL generator
  const avatarUrl = buildAvatarUrl(avatarConfig, name);

  const handleAddQuirk = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentQuirk.trim() !== '') {
      e.preventDefault();
      if (!quirks.includes(currentQuirk.trim())) {
        setQuirks([...quirks, currentQuirk.trim()]);
      }
      setCurrentQuirk('');
    }
  };

  const removeQuirk = (indexToRemove: number) => {
    setQuirks(quirks.filter((_, idx) => idx !== indexToRemove));
  };

  const handleGenderChange = (newGender: string) => {
    setGender(newGender);
    
    // Automatically adjust the avatar to give a starting point based on gender
    if (newGender === 'Feminine') {
      setAvatarConfig(prev => ({
        ...prev,
        top: 'straight01',
        facialHair: undefined
      }));
    } else if (newGender === 'Masculine') {
      setAvatarConfig(prev => ({
        ...prev,
        top: 'shortFlat',
      }));
    } else {
      setAvatarConfig(prev => ({
        ...prev,
        top: 'shortWaved',
        facialHair: undefined
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        id: initialData?.id || Date.now().toString(),
        name: name || 'Unknown Guest',
        email,
        gender,
        eyeColor: avatarConfig.eyeColor,
        height: avatarConfig.height,
        ethnicity,
        avatarUrl,
        traits: quirks,
        bio,
      });
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]">
        
        {/* Left Side: Avatar Preview */}
        <div className="w-full md:w-2/5 bg-slate-50 p-8 flex flex-col items-center justify-center border-r border-slate-100 relative">
          <div className="absolute top-6 left-6 flex gap-2">
             <div className="w-3 h-3 rounded-full bg-red-400"></div>
             <div className="w-3 h-3 rounded-full bg-amber-400"></div>
             <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
          </div>
          
          <div className="w-48 h-48 sm:w-64 sm:h-64 relative mb-8 drop-shadow-xl bg-white rounded-full border-4 border-white shadow-brand-pink/10 shadow-2xl overflow-hidden flex items-center justify-center">
            {/* The SVG from Dicebear */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={avatarUrl} 
              alt="Avatar preview" 
              className="w-full h-full object-cover" 
            />
          </div>
          
          <div className="text-center w-full">
            <h2 className="text-3xl font-black text-slate-900 truncate px-4">{name || 'New Guest'}</h2>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{gender}</p>
            
            <div className="mt-6 flex flex-wrap justify-center gap-2 px-4">
              {quirks.slice(0, 3).map((quirk, idx) => (
                <span key={idx} className="px-3 py-1 bg-white text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border border-slate-100">
                  {quirk}
                </span>
              ))}
              {quirks.length > 3 && (
                <span className="px-3 py-1 bg-brand-pink/10 text-brand-pink rounded-full text-[10px] font-black uppercase tracking-widest">
                  +{quirks.length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Editor */}
        <div className="w-full md:w-3/5 flex flex-col h-[60vh] md:h-[680px] max-h-[85vh]">
          {/* Header & Tabs */}
          <div className="px-8 pt-8 border-b border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-900">Create Profile</h3>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex gap-6">
              {[
                { id: 'basics', label: 'Basics' },
                { id: 'avatar', label: 'Avatar' },
                { id: 'personality', label: 'Personality' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-sm font-bold uppercase tracking-widest transition-colors relative ${
                    activeTab === tab.id ? 'text-brand-pink' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-brand-pink rounded-t-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Form Content */}
          <div className="flex-grow overflow-y-auto p-8">
            {activeTab === 'basics' && (
              <div className={`space-y-6 transition-all duration-200 ${isEthnicityDropdownOpen ? 'pb-52' : ''}`}>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Guest Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Uncle John"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Gender / Presentation</label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Masculine', 'Feminine', 'Neutral'].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleGenderChange(option)}
                        className={`px-4 py-3 rounded-xl border text-sm font-bold transition-all ${
                          gender === option 
                            ? 'bg-brand-pink/10 border-brand-pink text-brand-pink' 
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {option === 'Neutral' ? 'Neutral' : option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Ethnicity</label>
                  <div 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium cursor-pointer flex justify-between items-center transition-all hover:border-slate-300"
                    onClick={() => setIsEthnicityDropdownOpen(!isEthnicityDropdownOpen)}
                  >
                    <span className={ethnicity ? 'text-slate-900' : 'text-slate-400'}>
                      {ethnicity || 'Unspecified'}
                    </span>
                    <svg className={`w-4 h-4 text-slate-400 transition-transform ${isEthnicityDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                  
                  {isEthnicityDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsEthnicityDropdownOpen(false)}
                      />
                      <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl overflow-hidden py-2 max-h-60 overflow-y-auto">
                        {[
                          { value: '', label: 'Unspecified' },
                          { value: 'Caucasian / White', label: 'Caucasian / White' },
                          { value: 'Black / African Descent', label: 'Black / African Descent' },
                          { value: 'East Asian', label: 'East Asian' },
                          { value: 'South Asian', label: 'South Asian' },
                          { value: 'Southeast Asian', label: 'Southeast Asian' },
                          { value: 'Hispanic / Latino', label: 'Hispanic / Latino' },
                          { value: 'Middle Eastern', label: 'Middle Eastern' },
                          { value: 'Native American / Indigenous', label: 'Native American / Indigenous' },
                          { value: 'Pacific Islander', label: 'Pacific Islander' },
                          { value: 'Mixed / Multiracial', label: 'Mixed / Multiracial' },
                          { value: 'Other', label: 'Other' }
                        ].map((option) => (
                          <div
                            key={option.value}
                            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                              ethnicity === option.value ? 'bg-brand-pink/5 text-brand-pink font-bold' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                            onClick={() => {
                              setEthnicity(option.value);
                              setIsEthnicityDropdownOpen(false);
                            }}
                          >
                            {option.label}
                            {ethnicity === option.value && (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Email Address (Optional)</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="For sending character sheets later"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all"
                  />
                </div>
              </div>
            )}

            {activeTab === 'avatar' && (
              <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} gender={gender} />
            )}

            {activeTab === 'personality' && (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Traits & Quirks</label>
                      <p className="text-xs text-slate-500">Type a quirk and press Enter to add it. (e.g. "Loves gossip", "Scared of bugs")</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateQuirk}
                      disabled={isGeneratingQuirk}
                      className="flex items-center gap-2 text-xs font-bold text-brand-pink bg-brand-pink/10 hover:bg-brand-pink/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/></svg>
                      {isGeneratingQuirk ? 'Generating...' : 'Auto-Generate'}
                    </button>
                  </div>
                  
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:border-brand-pink focus-within:ring-2 focus-within:ring-brand-pink/20 transition-all flex flex-wrap gap-2">
                    {quirks.map((quirk, idx) => (
                      <span key={idx} className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                        {quirk}
                        <button onClick={() => removeQuirk(idx)} className="text-slate-400 hover:text-red-500 ml-1">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </span>
                    ))}
                    <input 
                      type="text" 
                      value={currentQuirk}
                      onChange={(e) => setCurrentQuirk(e.target.value)}
                      onKeyDown={handleAddQuirk}
                      placeholder="Add a quirk..."
                      className="flex-grow bg-transparent border-none outline-none text-sm font-medium min-w-[120px]"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Secret Bio (Optional)</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Any extra context about this person's vibe..."
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-slate-50 mt-auto">
            {onDelete && initialData?.id ? (
              <button 
                onClick={() => onDelete(initialData.id)}
                className="px-4 py-2 rounded-xl font-bold text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-2 text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6"/><path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                Delete Guest
              </button>
            ) : <div />}
            <div className="flex gap-3 w-full sm:w-auto mt-4 sm:mt-0">
              <button onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full font-black text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                style={{ background: '#fe04c6', boxShadow: '0 8px 20px -8px rgba(254,4,198,0.5)' }}
              >
                {isSaving ? 'Saving...' : 'Save Guest'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
