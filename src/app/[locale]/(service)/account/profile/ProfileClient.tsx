'use client';

import React, { useState, useMemo } from 'react';
import { AvatarBuilder, deriveDiceBearTop } from '@/components/account/AvatarBuilder';
import { PhotoTraitScanner, ScannedGuestTraits } from '@/components/account/PhotoTraitScanner';
import {
  buildAvatarUrl,
  AvatarConfig,
  GUEST_ACCENT_OPTIONS,
  resolveDisplayAvatarUrl,
  computeAvatarPhysicalSignature,
} from '@/utils/avatar';
import { saveProfileAction } from '@/app/actions/profile';
import { generateProfileBioAction, generateProfileFunFactAction } from '@/app/actions/generator';

const DIETARY_OPTIONS = [
  'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free',
  'Nut Allergy', 'Halal', 'Kosher', 'No Restrictions',
];

const PRONOUNS = ['He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Any'];

const DEFAULT_AVATAR: AvatarConfig = {
  seed: 'Gabriella Blyth',
  top: 'straight01',
  hairLength: 'Long',
  hairTexture: 'Straight',
  hairColor: '282828',
  skinColor: 'ffcd94',
  eyeColor: 'Hazel',
  height: 'Average',
  build: 'Curvy',
  accessories: 'none',
  accent: 'Australian',
  aiPhotoUrl: '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-host.jpg',
};

interface ProfileClientProps {
  user: { name: string; email: string };
  profile: {
    full_name?: string | null;
    bio?: string | null;
    location?: string | null;
    pronouns?: string | null;
    avatar_url?: string | null;
    avatar_config?: AvatarConfig | null;
    dietary_needs?: string[] | null;
    character_preferences?: string[] | null;
    fun_facts?: string | null;
  } | null;
  onClose?: () => void;
  onSaved?: (updated: {
    full_name: string;
    bio: string;
    location: string;
    pronouns: string;
    fun_facts: string;
    dietary_needs: string[];
    character_preferences: string[];
    avatar_config: AvatarConfig;
    avatar_url?: string;
  }) => void;
}

export default function ProfileClient({ user, profile, onClose, onSaved }: ProfileClientProps) {
  const [fullName, setFullName] = useState(
    profile?.full_name?.trim() || user.name?.trim() || 'Gabriella Blyth'
  );
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [pronouns, setPronouns] = useState(profile?.pronouns ?? 'She/Her');
  const [funFacts, setFunFacts] = useState(profile?.fun_facts ?? '');
  const [dietary, setDietary] = useState<string[]>(profile?.dietary_needs ?? []);
  const [charPrefs] = useState<string[]>(profile?.character_preferences ?? []);
  const [gender, setGender] = useState<'Masculine' | 'Feminine'>(() =>
    profile?.pronouns?.toLowerCase().includes('he/him') ? 'Masculine' : 'Feminine'
  );

  const initialMergedAvatar: AvatarConfig = useMemo(() => {
    const raw = (profile?.avatar_config as AvatarConfig) ?? DEFAULT_AVATAR;
    const extractedAiFromUrl = resolveDisplayAvatarUrl(profile?.avatar_url);
    const hasRealAiUrl =
      raw.aiPhotoUrl ||
      (extractedAiFromUrl && !extractedAiFromUrl.includes('api.dicebear.com')
        ? extractedAiFromUrl
        : undefined) ||
      DEFAULT_AVATAR.aiPhotoUrl;
    return {
      ...DEFAULT_AVATAR,
      ...raw,
      aiPhotoUrl: hasRealAiUrl,
    };
  }, [profile]);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(initialMergedAvatar);
  const [savedPhysicalSig, setSavedPhysicalSig] = useState<string>(() =>
    computeAvatarPhysicalSignature({
      gender:
        profile?.pronouns?.toLowerCase().includes('he/him')
          ? 'male'
          : 'female',
      avatar_config: initialMergedAvatar,
    })
  );

  const currentPhysicalSig = useMemo(
    () =>
      computeAvatarPhysicalSignature({
        gender:
          gender === 'Masculine' || pronouns.toLowerCase().includes('he/him')
            ? 'male'
            : 'female',
        avatar_config: avatarConfig,
      }),
    [gender, pronouns, avatarConfig]
  );

  const hasPhysicalChanges = currentPhysicalSig !== savedPhysicalSig;

  const handleGenderChange = (g: 'Masculine' | 'Feminine') => {
    setGender(g);
    setAvatarConfig(prev => {
      const defaultLength = g === 'Feminine' ? 'Long' : 'Short';
      const length = prev.hairLength || defaultLength;
      const texture = prev.hairTexture || 'Straight';
      return {
        ...prev,
        hairLength: length,
        hairTexture: texture,
        top: deriveDiceBearTop(length, texture, g),
        facialHair: g === 'Masculine' ? prev.facialHair : undefined,
      };
    });
  };

  const [activeTab, setActiveTab] = useState<'info' | 'avatar'>('info');
  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [isGeneratingFunFact, setIsGeneratingFunFact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regeneratingOnly, setRegeneratingOnly] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const toggleChip = (arr: string[], setArr: (v: string[]) => void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
  };

  const handleSave = async (opts?: { forcePhoto?: boolean; closeAfterSave?: boolean }) => {
    const shouldForcePhoto = Boolean(opts?.forcePhoto || hasPhysicalChanges || !avatarConfig.aiPhotoUrl);
    if (opts?.forcePhoto) {
      setRegeneratingOnly(true);
    }
    setSaving(true);
    setError('');
    const cleanName = fullName.trim() || user.name || 'Gabriella Blyth';
    const result = await saveProfileAction({
      full_name: cleanName,
      bio,
      location,
      pronouns,
      fun_facts: funFacts,
      dietary_needs: dietary,
      character_preferences: charPrefs,
      avatar_config: avatarConfig as unknown as Record<string, unknown>,
      forceRegeneratePhoto: shouldForcePhoto,
    });
    setSaving(false);
    setRegeneratingOnly(false);

    if (result.error) {
      setError(result.error);
    } else {
      const updatedConfig: AvatarConfig = (result.avatar_config as AvatarConfig) || {
        ...avatarConfig,
        ...(result.aiPhotoUrl ? { aiPhotoUrl: result.aiPhotoUrl } : {}),
      };
      setAvatarConfig(updatedConfig);
      setSavedPhysicalSig(
        computeAvatarPhysicalSignature({
          gender:
            gender === 'Masculine' || pronouns.toLowerCase().includes('he/him')
              ? 'male'
              : 'female',
          avatar_config: updatedConfig,
        })
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onSaved?.({
        full_name: cleanName,
        bio,
        location,
        pronouns,
        fun_facts: funFacts,
        dietary_needs: dietary,
        character_preferences: charPrefs,
        avatar_config: updatedConfig,
        avatar_url: result.avatar_url || buildAvatarUrl(updatedConfig, cleanName),
      });
      if (opts?.closeAfterSave && onClose) {
        onClose();
      }
    }
  };

  const handleGenerateBio = async () => {
    setIsGeneratingBio(true);
    try {
      const generated = await generateProfileBioAction(fullName || user.name);
      setBio(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingBio(false);
    }
  };

  const handleGenerateFunFact = async () => {
    setIsGeneratingFunFact(true);
    try {
      const generated = await generateProfileFunFactAction(fullName || user.name);
      setFunFacts(generated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingFunFact(false);
    }
  };

  const inputClass = "w-full px-5 py-3.5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-brand-pink focus:ring-4 focus:ring-brand-pink/10 transition-all";
  const resolvedPreviewSrc = resolveDisplayAvatarUrl(
    buildAvatarUrl(avatarConfig, fullName || user.name)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2.5rem] w-full max-w-5xl relative shadow-2xl flex flex-col h-[92dvh] sm:h-auto sm:max-h-[90dvh] overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 sm:p-8 sm:pb-6 border-b border-slate-100 flex items-center justify-between bg-white z-10 flex-shrink-0">
          <div>
            <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none mb-1">Edit My Profile</h2>
            <p className="text-xs sm:text-sm font-bold text-slate-400">Update your physical traits &amp; preferences - saving physical changes regenerates your AI character photo</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center transition-colors shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-8 overflow-y-auto flex-1 min-h-0 relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-pink/5 rounded-bl-full -z-10" />

          {/* Save Status Banner */}
          <div className="mb-4 sm:mb-6 flex items-center gap-3">
            {saving && (
              <span className="text-xs font-bold text-brand-pink flex items-center gap-2">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {hasPhysicalChanges || regeneratingOnly
                  ? 'Regenerating your AI character headshot & saving profile...'
                  : 'Saving changes...'}
              </span>
            )}
            {saved && !saving && (
              <span className="text-xs font-bold text-emerald-600">
                ✓ Profile saved &amp; AI character photo synced!
              </span>
            )}
            {hasPhysicalChanges && !saving && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                ✨ Physical traits modified - click Save Profile below to regenerate your AI photo
              </span>
            )}
            {error && <span className="text-xs font-bold text-red-500">{error}</span>}
          </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-bold text-red-600">
          {error}
        </div>
      )}

      {/* Avatar Preview + Tab switch */}
      <div className="bg-white rounded-3xl sm:rounded-[2rem] border border-slate-100 overflow-hidden mb-6 sm:mb-8">
        <div className="p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border-b border-slate-50">
          <div className="flex items-center gap-4 sm:gap-6 min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-brand-pink/30 shadow-md" style={{ background: 'linear-gradient(135deg, #1e191c, #2d1f2b)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolvedPreviewSrc}
                  alt="Your AI character avatar"
                  className="w-full h-full object-cover object-top"
                />
                {saving && (hasPhysicalChanges || regeneratingOnly) && (
                  <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                    <svg className="animate-spin h-6 w-6 text-brand-pink mb-1" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white">AI Photo</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('avatar')}
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg cursor-pointer"
                style={{ background: '#fe04c6' }}
                title="Customize physical traits"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-black text-slate-900 text-base sm:text-lg truncate">{fullName || user.name || 'Your Name'}</p>
                <span className="px-2 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[9px] font-black uppercase tracking-widest shrink-0">
                  👑 Host
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium truncate">{user.email}</p>
              <p className="text-xs font-bold text-slate-400 mt-1 truncate">
                {[pronouns, avatarConfig.accent ? `🎙️ ${avatarConfig.accent}` : null].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave({ forcePhoto: true, closeAfterSave: false })}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 shrink-0 cursor-pointer self-start sm:self-center"
          >
            {saving && (hasPhysicalChanges || regeneratingOnly)
              ? '✨ Generating AI Photo...'
              : '✨ Regenerate AI Photo'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          {(['info', 'avatar'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-3.5 sm:py-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-colors"
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

        <div className="p-4 sm:p-8">
          {activeTab === 'info' ? (
            <div className="space-y-5 sm:space-y-6">
              {/* Basic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Your Full Name (Host)</label>
                  <input
                    className={inputClass}
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Gabriella Blyth"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Location</label>
                  <input className={inputClass} value={location} onChange={e => setLocation(e.target.value)} placeholder="London, UK" />
                </div>
              </div>

              {/* Ephemeral AI Photo-to-Trait Auto-Filler on Tab 1 */}
              <PhotoTraitScanner
                onTraitsDetected={(traits: ScannedGuestTraits) => {
                  const mappedGender = traits.gender === 'Feminine' ? 'Feminine' : 'Masculine';
                  setGender(mappedGender);
                  if (traits.gender === 'Feminine' && !pronouns) setPronouns('she/her');
                  if (traits.gender === 'Masculine' && !pronouns) setPronouns('he/him');
                  setAvatarConfig((prev) => ({
                    ...prev,
                    skinColor: traits.skinColor,
                    hairColor: traits.hairColor,
                    hairLength: traits.hairLength,
                    hairTexture: traits.hairTexture,
                    top: deriveDiceBearTop(traits.hairLength, traits.hairTexture, mappedGender),
                    facialHair: mappedGender === 'Masculine' ? traits.facialHair : undefined,
                    eyeColor: traits.eyeColor,
                    build: traits.build,
                    distinctiveFeatures: traits.distinctiveFeatures,
                    age: traits.age,
                  }));
                }}
                onJumpToAvatarTab={() => setActiveTab('avatar')}
                showJumpToAvatarButton={true}
              />

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

              {/* Accent (For Voice Clues) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                    Accent (For Voice Clues)
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">
                    🎙️ Matched to AI Audio Clues
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GUEST_ACCENT_OPTIONS.map((opt) => {
                    const currentAccent = avatarConfig.accent || 'Australian';
                    const isSelected = currentAccent === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAvatarConfig(prev => ({ ...prev, accent: opt.value }))}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold border-2 transition-all text-left flex items-center gap-2"
                        style={{
                          borderColor: isSelected ? '#fe04c6' : '#e2e8f0',
                          color: isSelected ? '#fe04c6' : '#64748b',
                          background: isSelected ? 'rgba(254,4,198,0.05)' : '#fff',
                        }}
                      >
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Bio</label>
                  <button
                    type="button"
                    onClick={handleGenerateBio}
                    disabled={isGeneratingBio}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-pink hover:text-brand-pink/70 transition-colors disabled:opacity-50"
                  >
                    <svg className={isGeneratingBio ? "animate-spin" : ""} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                    {isGeneratingBio ? 'Writing...' : 'AI Generate'}
                  </button>
                </div>
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
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Fun Facts</label>
                  <button
                    type="button"
                    onClick={handleGenerateFunFact}
                    disabled={isGeneratingFunFact}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-pink hover:text-brand-pink/70 transition-colors disabled:opacity-50"
                  >
                    <svg className={isGeneratingFunFact ? "animate-spin" : ""} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                    {isGeneratingFunFact ? 'Thinking...' : 'AI Generate'}
                  </button>
                </div>
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
          ) : (
            <div className="space-y-6">
              <PhotoTraitScanner
                onTraitsDetected={(traits: ScannedGuestTraits) => {
                  const mappedGender = traits.gender === 'Feminine' ? 'Feminine' : 'Masculine';
                  setGender(mappedGender);
                  setAvatarConfig((prev) => ({
                    ...prev,
                    skinColor: traits.skinColor,
                    hairColor: traits.hairColor,
                    hairLength: traits.hairLength,
                    hairTexture: traits.hairTexture,
                    top: deriveDiceBearTop(traits.hairLength, traits.hairTexture, mappedGender),
                    facialHair: mappedGender === 'Masculine' ? traits.facialHair : undefined,
                    eyeColor: traits.eyeColor,
                    build: traits.build,
                    distinctiveFeatures: traits.distinctiveFeatures,
                    age: traits.age,
                  }));
                }}
                compact={true}
              />

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

        {/* Pinned Footer Actions */}
        <div className="px-5 py-4 sm:px-8 sm:py-5 border-t border-slate-100 flex items-center justify-between gap-3 bg-slate-50 flex-shrink-0">
          <div className="text-xs font-bold text-slate-400 hidden sm:block">
            {hasPhysicalChanges
              ? '✨ Physical changes detected - saving will generate a new AI character photo'
              : 'All physical traits & preferences sync across your mysteries'}
          </div>
          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave({ forcePhoto: hasPhysicalChanges, closeAfterSave: true })}
              disabled={saving}
              className="flex-1 sm:flex-initial px-6 sm:px-8 py-3 sm:py-3.5 rounded-full font-black text-xs sm:text-sm text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 cursor-pointer"
              style={{ background: '#fe04c6', boxShadow: '0 8px 20px -8px rgba(254,4,198,0.5)' }}
            >
              {saving
                ? hasPhysicalChanges || regeneratingOnly
                  ? 'Generating AI Photo & Saving...'
                  : 'Saving...'
                : hasPhysicalChanges
                ? '✨ Save & Regenerate AI Photo'
                : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
