'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AvatarBuilder, AvatarConfig } from '@/components/account/AvatarBuilder';
import { saveProfileAction } from '@/app/actions/profile';

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut Allergy', 'Halal', 'Kosher', 'No Restrictions',
];

const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Any'];

const DEFAULT_AVATAR: AvatarConfig = {
  seed: 'player',
  top: 'shortFlat',
  hairColor: '282828',
  skinColor: 'ffe0bd',
};

function buildAvatarUrl(config: AvatarConfig, name?: string) {
  const isBald = config.top === 'none';
  return `https://api.dicebear.com/8.x/avataaars/svg?seed=${encodeURIComponent(name || config.seed)}${isBald ? '&topProbability=0' : `&top=${config.top}`}&hairColor=${config.hairColor}&hatColor=${config.hairColor}&facialHairColor=${config.hairColor}&skinColor=${config.skinColor}&eyes=default&eyebrows=default&mouth=smile&clothesColor=262e33&facialHairProbability=${config.facialHair ? '100' : '0'}${config.facialHair ? `&facialHair=${config.facialHair}` : ''}&backgroundColor=transparent`;
}

interface ProfileClientProps {
  user: { name: string; email: string };
  profile: {
    bio?: string | null;
    location?: string | null;
    pronouns?: string | null;
    avatar_config?: AvatarConfig | null;
    dietary_needs?: string[] | null;
    character_preferences?: string[] | null;
    fun_facts?: string | null;
  } | null;
}

export default function ProfileClient({ user, profile }: ProfileClientProps) {
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [pronouns, setPronouns] = useState(profile?.pronouns ?? '');
  const [funFacts, setFunFacts] = useState(profile?.fun_facts ?? '');
  const [dietary, setDietary] = useState<string[]>(profile?.dietary_needs ?? []);
  const [charPrefs, setCharPrefs] = useState<string[]>(profile?.character_preferences ?? []);
  const [gender, setGender] = useState<'Masculine' | 'Feminine'>('Feminine');

  const handleGenderChange = (g: 'Masculine' | 'Feminine') => {
    setGender(g);
    // Reset hair to a valid default for the new gender
    setAvatarConfig(prev => ({
      ...prev,
      top: g === 'Feminine' ? 'straight01' : 'shortFlat',
      facialHair: undefined,
    }));
  };
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(
    (profile?.avatar_config as AvatarConfig) ?? DEFAULT_AVATAR
  );
  const [activeTab, setActiveTab] = useState<'info' | 'avatar'>('info');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const toggleChip = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    const result = await saveProfileAction({
      bio, location, pronouns, fun_facts: funFacts,
      dietary_needs: dietary,
      character_preferences: charPrefs,
      avatar_config: avatarConfig as unknown as Record<string, unknown>,
    });
    setSaving(false);
    if (result.error) { setError(result.error); }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timeout = setTimeout(() => {
      handleSave();
    }, 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bio, location, pronouns, funFacts, dietary, charPrefs, avatarConfig]);

  const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all";

  return (
    <div className="w-full max-w-3xl">
      {/* Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-900 mb-1">My Profile</h1>
          <p className="text-slate-500 font-medium">
            How you appear to other hosts and in the mystery world.
          </p>
          <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-transparent max-w-2xl">
            <span className="text-brand-pink mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">
              <span className="font-bold text-slate-900">Good to know:</span> Your custom avatar and profile details are completely free to create and will always be saved to your account. However, these custom features will only appear in a host's mystery if they purchase a <span className="font-bold text-slate-900">Plus Plan</span>.
            </p>
          </div>
        </div>
        <div className="h-10 flex items-center justify-end min-w-[100px]">
          {saving && <span className="text-sm font-bold text-slate-400">Saving...</span>}
          {saved && !saving && <span className="text-sm font-bold text-emerald-500">Saved</span>}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Avatar Preview + Tab switch */}
      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden mb-8">
        <div className="p-8 flex items-center gap-6 border-b border-slate-50">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-24 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e191c, #2d1f2b)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildAvatarUrl(avatarConfig, user.name)}
                alt="Your avatar"
                className="w-full h-full object-cover scale-110"
              />
            </div>
            <button
              onClick={() => setActiveTab('avatar')}
              className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ background: '#fe04c6' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
          <div>
            <p className="font-black text-slate-900 text-lg">{user.name || 'Your Name'}</p>
            <p className="text-sm text-slate-400 font-medium">{user.email}</p>
            {pronouns && <p className="text-xs font-bold text-slate-400 mt-1">{pronouns}</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {(['info', 'avatar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-4 text-sm font-black uppercase tracking-widest transition-colors"
              style={{
                color: activeTab === tab ? '#fe04c6' : '#94a3b8',
                borderBottom: activeTab === tab ? '2px solid #fe04c6' : '2px solid transparent',
              }}
            >
              {tab === 'info' ? 'Profile Info' : (
                <span className="flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 22 22 7 12 2"/></svg>
                  Avatar Builder
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'info' ? (
            <div className="space-y-6">
              {/* Basic */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Location</label>
                  <input className={inputClass} value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Pronouns</label>
                  <div className="flex flex-wrap gap-2">
                    {PRONOUNS.map(p => (
                      <button
                        key={p}
                        onClick={() => setPronouns(p === pronouns ? '' : p)}
                        className="px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                        style={{
                          borderColor: pronouns === p ? '#fe04c6' : '#e2e8f0',
                          color: pronouns === p ? '#fe04c6' : '#94a3b8',
                          background: pronouns === p ? 'rgba(254,4,198,0.05)' : '#fff',
                        }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Bio
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="I love hosting mystery nights and absolutely refuse to be the killer..."
                />
              </div>

              {/* Fun Facts */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                  Fun Facts
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fe04c6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                </label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={funFacts}
                  onChange={e => setFunFacts(e.target.value)}
                  placeholder="I once guessed the murderer in 4 minutes flat. I will never let this go."
                />
                <p className="text-xs text-slate-400 mt-1.5">Used for character casting and adding personality to mystery nights.</p>
              </div>

              {/* Dietary */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Dietary Needs</label>
                <div className="flex flex-wrap gap-2">
                  {DIETARY_OPTIONS.map(opt => (
                    <button
                      key={opt}
                      onClick={() => toggleChip(dietary, setDietary, opt)}
                      className="px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all"
                      style={{
                        borderColor: dietary.includes(opt) ? '#fe04c6' : '#e2e8f0',
                        color: dietary.includes(opt) ? '#fe04c6' : '#94a3b8',
                        background: dietary.includes(opt) ? 'rgba(254,4,198,0.05)' : '#fff',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Gender selector for avatar */}
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Avatar Style</label>
                <div className="flex gap-3 mb-6">
                  {(['Feminine', 'Masculine'] as const).map(g => (
                    <button
                      key={g}
                      onClick={() => handleGenderChange(g)}
                      className="px-5 py-2.5 rounded-xl text-sm font-black border-2 transition-all"
                      style={{
                        borderColor: gender === g ? '#fe04c6' : '#e2e8f0',
                        color: gender === g ? '#fe04c6' : '#94a3b8',
                        background: gender === g ? 'rgba(254,4,198,0.05)' : '#fff',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <AvatarBuilder config={avatarConfig} onChange={setAvatarConfig} gender={gender} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
