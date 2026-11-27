'use client';

import React, { useState, useMemo, useEffect, KeyboardEvent } from 'react';
import Link from 'next/link';
import { AvatarBuilder, deriveDiceBearTop } from '@/components/account/AvatarBuilder';
import {
  buildAvatarUrl,
  AvatarConfig,
  GUEST_ACCENT_OPTIONS,
  GUEST_AGE_OPTIONS,
  resolveDisplayAvatarUrl,
} from '@/utils/avatar';
import { generateRandomQuirk } from '@/app/actions/generator';
import { generateLandingDemoGuestPortraitAction } from '@/app/actions/ai-guests';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { PhotoTraitScanner, ScannedGuestTraits } from '@/components/account/PhotoTraitScanner';

export const PENDING_LANDING_GUEST_STORAGE_KEY = 'bpm_pending_landing_guest_v1';
const LANDING_DEMO_GEN_COUNT_KEY = 'bpm_landing_demo_gen_count_v1';
const MAX_FREE_DEMO_GENERATIONS = 3;

export interface PendingLandingGuestPayload {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  gender: string;
  age: 'young' | 'middle_aged' | 'old';
  accent: string;
  ethnicity: string;
  eye_color?: string;
  height?: string;
  avatar_url: string;
  aiPhotoUrl?: string;
  avatar_config: AvatarConfig;
  traits: string[];
  bio?: string;
  createdAt: string;
}

export default function LandingGuestCreator({ locale = 'en' }: { locale?: string }) {
  const [activeTab, setActiveTab] = useState<'basics' | 'avatar' | 'personality'>('basics');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nameError, setNameError] = useState('');
  const [genError, setGenError] = useState('');
  const [gender, setGender] = useState('Feminine');
  const [age, setAge] = useState<'young' | 'middle_aged' | 'old'>('young');
  const [accent, setAccent] = useState('Australian');
  const [ethnicity, setEthnicity] = useState('');
  const [quirks, setQuirks] = useState<string[]>(['Addicted to iced coffee']);
  const [currentQuirk, setCurrentQuirk] = useState('');
  const [isGeneratingQuirk, setIsGeneratingQuirk] = useState(false);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [generatedAiPhotoUrl, setGeneratedAiPhotoUrl] = useState<string>('');
  const [generatedFullAvatarUrl, setGeneratedFullAvatarUrl] = useState<string>('');

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    seed: 'GuestDemo',
    top: 'straight01',
    hairLength: 'Long',
    hairTexture: 'Wavy',
    hairStyle: 'Layered Blowout',
    hairColor: '4a3123',
    skinColor: 'ffcd94',
    eyeColor: 'Hazel',
    height: 'Average',
    build: 'Average',
    accent: 'Australian',
    age: 'young',
  });

  const fullName = useMemo(
    () => [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
    [firstName, lastName]
  );
  const displayFirstName = firstName.trim() || 'Your Friend';

  // Restore any previously created guest on the landing page from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedCount = parseInt(window.localStorage.getItem(LANDING_DEMO_GEN_COUNT_KEY) || '0', 10);
      if (!Number.isNaN(savedCount)) setGenCount(savedCount);

      const rawSaved = window.localStorage.getItem(PENDING_LANDING_GUEST_STORAGE_KEY);
      if (rawSaved) {
        const parsed = JSON.parse(rawSaved) as PendingLandingGuestPayload;
        if (parsed && typeof parsed === 'object') {
          if (parsed.first_name) setFirstName(parsed.first_name);
          if (parsed.last_name) setLastName(parsed.last_name);
          if (parsed.gender) setGender(parsed.gender);
          if (parsed.age) setAge(parsed.age);
          if (parsed.accent) setAccent(parsed.accent);
          if (parsed.ethnicity !== undefined) setEthnicity(parsed.ethnicity);
          if (Array.isArray(parsed.traits) && parsed.traits.length > 0) {
            setQuirks(parsed.traits.slice(0, 3));
          }
          if (parsed.avatar_config) {
            setAvatarConfig(parsed.avatar_config);
          }
          if (parsed.aiPhotoUrl) {
            setGeneratedAiPhotoUrl(parsed.aiPhotoUrl);
          }
          if (parsed.avatar_url) {
            setGeneratedFullAvatarUrl(parsed.avatar_url);
          }
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const persistPendingGuestToStorage = (
    overrideAiPhotoUrl?: string,
    overrideFullAvatarUrl?: string
  ) => {
    if (typeof window === 'undefined') return;
    const cleanFirst = firstName.trim() || 'Mystery';
    const cleanLast = lastName.trim() || 'Guest';
    const full = `${cleanFirst} ${cleanLast}`.trim();
    const activeAiPhoto = overrideAiPhotoUrl ?? generatedAiPhotoUrl;
    const builtUrl =
      overrideFullAvatarUrl ||
      buildAvatarUrl(
        {
          ...avatarConfig,
          accent,
          age,
          ethnicity,
          aiPhotoUrl: activeAiPhoto || undefined,
        },
        full
      );

    const payload: PendingLandingGuestPayload = {
      id: `landing-guest-${Date.now()}`,
      name: full,
      first_name: cleanFirst,
      last_name: cleanLast,
      gender,
      age,
      accent,
      ethnicity,
      eye_color: avatarConfig.eyeColor || 'Hazel',
      height: avatarConfig.height || 'Average',
      avatar_url: builtUrl || '',
      aiPhotoUrl: activeAiPhoto || undefined,
      avatar_config: {
        ...avatarConfig,
        accent,
        age,
        ethnicity,
        aiPhotoUrl: activeAiPhoto || undefined,
      },
      traits: quirks.slice(0, 3),
      bio: quirks.length > 0 ? `Known for: ${quirks.join(' · ')}` : '',
      createdAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(PENDING_LANDING_GUEST_STORAGE_KEY, JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent('bpm-landing-guest-updated', { detail: payload }));
    } catch {
      // ignore
    }
  };

  const MAX_TRAITS = 3;
  const isAtTraitLimit = quirks.length >= MAX_TRAITS;

  const handleGenerateQuirk = async () => {
    if (quirks.length >= MAX_TRAITS) return;
    setIsGeneratingQuirk(true);
    try {
      const quirk = await generateRandomQuirk(fullName || 'Guest', gender, quirks);
      if (quirk && !quirks.includes(quirk) && quirks.length < MAX_TRAITS) {
        setQuirks([...quirks, quirk].slice(0, MAX_TRAITS));
      }
    } catch (error) {
      console.error('Failed to generate quirk:', error);
    } finally {
      setIsGeneratingQuirk(false);
    }
  };

  const handleAddQuirk = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentQuirk.trim() !== '') {
      e.preventDefault();
      if (quirks.length < MAX_TRAITS && !quirks.includes(currentQuirk.trim())) {
        setQuirks([...quirks, currentQuirk.trim()].slice(0, MAX_TRAITS));
      }
      setCurrentQuirk('');
    }
  };

  const removeQuirk = (indexToRemove: number) => {
    setQuirks(quirks.filter((_, idx) => idx !== indexToRemove));
  };

  const handleGenderChange = (newGender: string) => {
    setGender(newGender);
    setAvatarConfig((prev) => {
      const defaultLength = newGender === 'Feminine' ? 'Long' : 'Short';
      const length =
        prev.hairLength === 'Long' && newGender === 'Masculine'
          ? 'Short'
          : prev.hairLength === 'Short' && newGender === 'Feminine'
          ? 'Long'
          : prev.hairLength || defaultLength;
      const texture = prev.hairTexture || 'Straight';
      return {
        ...prev,
        hairLength: length,
        hairTexture: texture,
        top: deriveDiceBearTop(length, texture, newGender),
        facialHair: newGender === 'Masculine' ? prev.facialHair : undefined,
      };
    });
  };

  const handleAccentChange = (newAccent: string) => {
    setAccent(newAccent);
    setAvatarConfig((prev) => ({
      ...prev,
      accent: newAccent,
    }));
  };

  const handleAgeChange = (newAge: 'young' | 'middle_aged' | 'old') => {
    setAge(newAge);
    setAvatarConfig((prev) => ({
      ...prev,
      age: newAge,
    }));
  };

  const handlePhotoTraitsDetected = (traits: ScannedGuestTraits) => {
    setGender(traits.gender);
    setAge(traits.age);
    if (traits.ethnicity) {
      setEthnicity(traits.ethnicity);
    }
    setAvatarConfig((prev) => ({
      ...prev,
      skinColor: traits.skinColor,
      hairColor: traits.hairColor,
      hairLength: traits.hairLength,
      hairTexture: traits.hairTexture,
      hairStyle: traits.hairStyle || 'Natural / Classic',
      top: deriveDiceBearTop(traits.hairLength, traits.hairTexture, traits.gender),
      facialHair: traits.gender !== 'Feminine' ? traits.facialHair : undefined,
      eyeColor: traits.eyeColor,
      faceShape: traits.faceShape,
      build: traits.build,
      distinctiveFeatures: traits.distinctiveFeatures,
      likenessNotes: traits.likenessNotes || prev.likenessNotes,
      age: traits.age,
      aiPhotoUrl: undefined,
    }));
  };

  const diceBearFallbackUrl = useMemo(
    () =>
      buildAvatarUrl(
        {
          ...avatarConfig,
          accent,
          age,
          ethnicity,
          aiPhotoUrl: undefined,
        },
        fullName || 'Suspect'
      ),
    [avatarConfig, accent, age, ethnicity, fullName]
  );

  const previewPhotoUrl = generatedAiPhotoUrl
    ? resolveDisplayAvatarUrl(generatedAiPhotoUrl) || generatedAiPhotoUrl
    : diceBearFallbackUrl;

  const handleGenerateAiPortrait = async () => {
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!cleanFirst) {
      setActiveTab('basics');
      setNameError('Enter your guest’s first name so we can badge their Suspect Dossier!');
      return;
    }
    if (!cleanLast) {
      setActiveTab('basics');
      setNameError('Enter a last name too — just like in the host portal!');
      return;
    }
    setNameError('');
    setGenError('');

    if (genCount >= MAX_FREE_DEMO_GENERATIONS) {
      persistPendingGuestToStorage();
      setGenError(
        `You’ve used all ${MAX_FREE_DEMO_GENERATIONS} free landing-page test portraits! Click "Sign Up Now to Save ${cleanFirst}" to unlock unlimited guest portraits inside the free host portal.`
      );
      return;
    }

    const fullGuestName = `${cleanFirst} ${cleanLast}`;
    const baseAvatarUrl = buildAvatarUrl(
      {
        ...avatarConfig,
        accent,
        age,
        ethnicity,
        aiPhotoUrl: undefined,
      },
      fullGuestName
    );

    setIsGeneratingPhoto(true);
    try {
      const res = await generateLandingDemoGuestPortraitAction({
        id: `demo-${Date.now()}`,
        name: fullGuestName,
        first_name: cleanFirst,
        last_name: cleanLast,
        gender,
        age,
        accent,
        eye_color: avatarConfig.eyeColor,
        height: avatarConfig.height,
        build: avatarConfig.build,
        ethnicity,
        avatar_url: baseAvatarUrl,
        avatar_config: {
          ...avatarConfig,
          accent,
          age,
          ethnicity,
        },
        traits: quirks.slice(0, MAX_TRAITS),
      });

      if (!res.success || (!res.aiPhotoUrl && !res.publicUrl)) {
        setGenError(res.error || 'Could not generate AI portrait right now. Please try again.');
        return;
      }

      const freshPhotoUrl = res.aiPhotoUrl || resolveDisplayAvatarUrl(res.publicUrl) || '';
      const freshFullAvatarUrl = res.publicUrl || freshPhotoUrl;

      setGeneratedAiPhotoUrl(freshPhotoUrl);
      setGeneratedFullAvatarUrl(freshFullAvatarUrl);
      setAvatarConfig((prev) => ({
        ...prev,
        aiPhotoUrl: freshPhotoUrl,
      }));

      const nextCount = genCount + 1;
      setGenCount(nextCount);
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(LANDING_DEMO_GEN_COUNT_KEY, String(nextCount));
        } catch {
          // ignore
        }
      }

      persistPendingGuestToStorage(freshPhotoUrl, freshFullAvatarUrl);
    } catch (err: any) {
      setGenError(err?.message || 'Unexpected error generating AI portrait.');
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  const signupSaveUrl = `/${locale}/signup?saveGuest=1&next=${encodeURIComponent(`/${locale}/account/guests`)}`;
  const loginSaveUrl = `/${locale}/login?saveGuest=1&next=${encodeURIComponent(`/${locale}/account/guests`)}`;

  return (
    <section
      id="try-guest-creator"
      className="py-20 lg:py-28 bg-gradient-to-b from-slate-950 via-[#120914] to-slate-950 text-white relative overflow-hidden border-y-4 border-brand-pink"
    >
      {/* Subtle ambient glow */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-pink/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 max-w-6xl relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 lg:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-pink/15 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-[0.22em] mb-4">
            <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping" />
            Live AI Studio Demo · Test Our Likeness Engine
          </div>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight leading-[0.96] mb-4">
            Create a Guest.{' '}
            <span className="text-brand-pink italic">See Their AI Suspect Photo.</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base lg:text-lg font-medium leading-relaxed">
            Test how accurate our guest AI portraits are right now. Fill in the exact same traits you&apos;d enter in the host portal — or auto-scan traits from a quick selfie — and generate your friend&apos;s official suspect headshot in seconds.
          </p>
        </div>

        {/* Main 2-Column Studio Card */}
        <div className="bg-white text-slate-900 rounded-[2.25rem] shadow-2xl border-4 border-white/10 overflow-hidden grid lg:grid-cols-12">
          {/* Left Column (lg: 5 cols): Live Suspect Dossier Card + Sign Up CTA */}
          <div className="lg:col-span-5 bg-slate-900 text-white p-6 sm:p-8 lg:p-9 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800 relative">
            <div>
              {/* Top Dossier Header Bar */}
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-pink animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-[0.22em] text-brand-pink">
                    {generatedAiPhotoUrl ? '✓ AI Suspect Portrait Ready' : 'Live Suspect Dossier Preview'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {Math.max(0, MAX_FREE_DEMO_GENERATIONS - genCount)} Free Demo{MAX_FREE_DEMO_GENERATIONS - genCount === 1 ? '' : 's'} Left
                </span>
              </div>

              {/* Suspect Photo Frame */}
              <div className="relative w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-5 rounded-3xl bg-slate-800 border-4 border-white/15 shadow-2xl overflow-hidden flex items-center justify-center group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewPhotoUrl}
                  alt={fullName || 'Guest preview'}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />

                {!generatedAiPhotoUrl && !isGeneratingPhoto && (
                  <div className="absolute bottom-3 inset-x-3 px-3 py-1.5 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      Trait Avatar Preview · Click Generate for AI Photo
                    </p>
                  </div>
                )}

                {generatedAiPhotoUrl && !isGeneratingPhoto && (
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-lg">
                    ✨ AI Generated
                  </div>
                )}

                {isGeneratingPhoto && (
                  <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-5 text-center">
                    <svg className="animate-spin h-10 w-10 text-brand-pink mb-3" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <p className="text-xs font-black uppercase tracking-widest text-white mb-1">
                      Generating {displayFirstName}&apos;s AI Portrait...
                    </p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      Matching hair, eyes, facial structure &amp; studio lighting (~6s)
                    </p>
                  </div>
                )}
              </div>

              {/* Suspect Name & Badges */}
              <div className="text-center mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-1">
                  Suspect File #01
                </p>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate px-2">
                  {fullName || 'Enter Guest Name'}
                </h3>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-pink mt-1.5">
                  {gender} • 🎙️ {accent} Accent •{' '}
                  {age === 'young' ? '18–34' : age === 'middle_aged' ? '35–54' : '55+'}
                </p>

                {quirks.length > 0 && (
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {quirks.map((q, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-[10px] font-bold text-slate-200"
                      >
                        “{q}”
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prominent Sign-Up-to-Save Guest CTA Box */}
            <div
              className={`rounded-2xl p-5 transition-all ${
                generatedAiPhotoUrl
                  ? 'bg-gradient-to-br from-brand-pink/25 via-fuchsia-950/60 to-slate-900 border-2 border-brand-pink shadow-xl shadow-brand-pink/15'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                  {generatedAiPhotoUrl ? '🔒 Save This AI Portrait' : 'Save To Your Portal'}
                </span>
                <span className="text-[10px] font-bold text-slate-300">
                  100% Free Host Account
                </span>
              </div>
              <h4 className="text-base sm:text-lg font-black text-white leading-snug mb-1.5">
                {generatedAiPhotoUrl
                  ? `Don't lose ${displayFirstName}'s AI portrait!`
                  : `Want to save ${displayFirstName} to your cast?`}
              </h4>
              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-4">
                {generatedAiPhotoUrl
                  ? `Sign up now and we’ll automatically import ${fullName || displayFirstName} and this exact AI headshot straight into your My Guests portal.`
                  : `Sign up for a free host account to save ${fullName || 'your guest'} into your Guest Roster and cast them in any mystery theme.`}
              </p>

              <Link
                href={signupSaveUrl}
                onClick={() => persistPendingGuestToStorage()}
                className="w-full py-3.5 px-5 rounded-xl bg-brand-pink hover:bg-white hover:text-brand-dark text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg flex items-center justify-center gap-2 text-center"
              >
                <span>
                  Sign Up Now to Save {firstName.trim() ? firstName.trim() : 'This Guest'} →
                </span>
              </Link>

              <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <Link
                  href={loginSaveUrl}
                  onClick={() => persistPendingGuestToStorage()}
                  className="hover:text-brand-pink transition-colors underline underline-offset-2"
                >
                  Already have an account? Log in to save
                </Link>
                {generatedAiPhotoUrl && (
                  <a
                    href="#interactive-pack-preview"
                    className="text-brand-pink hover:underline"
                  >
                    See in sample clues ↓
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right Column (lg: 7 cols): Exact Portal 3-Tab Guest Form */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white">
            {/* Step Tabs Header */}
            <div className="px-6 sm:px-8 pt-6 border-b border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                    Same Controls As Our Host Portal
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Customize Your Guest&apos;s Details
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Step {activeTab === 'basics' ? '1' : activeTab === 'avatar' ? '2' : '3'} of 3
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-8">
                {[
                  { id: 'basics', label: '1. Basics & Photo Scan' },
                  { id: 'avatar', label: '2. Hair & Features' },
                  { id: 'personality', label: '3. Quirks & Inside Jokes' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-3.5 text-xs sm:text-sm font-black uppercase tracking-wider transition-colors relative text-center sm:text-left cursor-pointer ${
                      activeTab === tab.id
                        ? 'text-brand-pink'
                        : 'text-slate-400 hover:text-slate-700'
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

            {/* Tab Body */}
            <div className="p-6 sm:p-8 max-h-[540px] overflow-y-auto">
              {activeTab === 'basics' && (
                <div className="space-y-5">
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          First Name <span className="text-brand-pink">*</span>
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => {
                            setFirstName(e.target.value);
                            if (nameError) setNameError('');
                          }}
                          onPaste={(e) => {
                            const pasted = e.clipboardData?.getData('text')?.trim() || '';
                            if (!lastName && pasted.includes(' ') && pasted.split(/\s+/).length >= 2) {
                              e.preventDefault();
                              const parts = pasted.split(/\s+/);
                              setFirstName(parts[0]);
                              setLastName(parts.slice(1).join(' '));
                              if (nameError) setNameError('');
                            }
                          }}
                          placeholder="e.g. Sarah"
                          className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all ${
                            nameError && !firstName.trim()
                              ? 'border-red-400 bg-red-50/40'
                              : 'border-slate-200'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">
                          Last Name <span className="text-brand-pink">*</span>
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => {
                            setLastName(e.target.value);
                            if (nameError) setNameError('');
                          }}
                          placeholder="e.g. Jenkins"
                          className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-brand-pink/20 focus:border-brand-pink outline-none transition-all ${
                            nameError && !lastName.trim()
                              ? 'border-red-400 bg-red-50/40'
                              : 'border-slate-200'
                          }`}
                        />
                      </div>
                    </div>
                    {nameError ? (
                      <p className="text-xs font-bold text-red-500">{nameError}</p>
                    ) : (
                      <p className="text-[11px] font-semibold text-slate-400">
                        💡 Just like in the portal, we use both first &amp; last names to personalize their Suspect Dossier, Crime Scene Reports &amp; Clues.
                      </p>
                    )}
                  </div>

                  {/* Ephemeral Selfie Trait Scanner */}
                  <PhotoTraitScanner
                    onTraitsDetected={handlePhotoTraitsDetected}
                    onJumpToAvatarTab={() => setActiveTab('avatar')}
                    showJumpToAvatarButton={true}
                  />

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                      Gender / Presentation
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Masculine', 'Feminine', 'Neutral'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleGenderChange(option)}
                          className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                            gender === option
                              ? 'bg-brand-pink/10 border-brand-pink text-brand-pink shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Age Bracket
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {GUEST_AGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleAgeChange(opt.value)}
                            className={`px-2.5 py-2.5 rounded-xl border text-[11px] font-bold transition-all text-center cursor-pointer ${
                              age === opt.value
                                ? 'bg-brand-pink/10 border-brand-pink text-brand-pink shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Ethnicity
                      </label>
                      <CustomSelect
                        value={ethnicity}
                        onChange={(e) => setEthnicity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-900 hover:border-slate-300 transition-all"
                      >
                        <option value="">Unspecified</option>
                        <option value="Caucasian / White">Caucasian / White</option>
                        <option value="Black / African Descent">Black / African Descent</option>
                        <option value="East Asian">East Asian</option>
                        <option value="South Asian">South Asian</option>
                        <option value="Southeast Asian">Southeast Asian</option>
                        <option value="Hispanic / Latino">Hispanic / Latino</option>
                        <option value="Middle Eastern">Middle Eastern</option>
                        <option value="Native American / Indigenous">
                          Native American / Indigenous
                        </option>
                        <option value="Pacific Islander">Pacific Islander</option>
                        <option value="Mixed / Multiracial">Mixed / Multiracial</option>
                      </CustomSelect>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                        Voice Accent (For AI Audio Wiretaps)
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">
                        🎙️ Matched to Voice Clues
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {GUEST_ACCENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAccentChange(opt.value)}
                          className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2 cursor-pointer ${
                            accent === opt.value
                              ? 'bg-brand-pink/10 border-brand-pink text-brand-pink shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'avatar' && (
                <div className="space-y-6">
                  <PhotoTraitScanner onTraitsDetected={handlePhotoTraitsDetected} compact={true} />
                  <AvatarBuilder
                    config={avatarConfig}
                    onChange={setAvatarConfig}
                    gender={gender}
                  />
                </div>
              )}

              {activeTab === 'personality' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <label className="block text-xs font-black uppercase tracking-widest text-slate-400">
                            Traits &amp; Inside Jokes
                          </label>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isAtTraitLimit
                                ? 'bg-brand-pink/10 text-brand-pink'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {quirks.length} / {MAX_TRAITS}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Add up to 3 obsessions, habits, or inside jokes we can weave into their character&apos;s clues &amp; texts.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGenerateQuirk}
                        disabled={isGeneratingQuirk || isAtTraitLimit}
                        className="flex items-center gap-1.5 text-xs font-bold text-brand-pink bg-brand-pink/10 hover:bg-brand-pink/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 shrink-0 ml-3 cursor-pointer"
                      >
                        <span>✨</span>
                        {isGeneratingQuirk ? 'Generating...' : 'Random Quirk'}
                      </button>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:border-brand-pink focus-within:ring-2 focus-within:ring-brand-pink/20 transition-all flex flex-wrap gap-2">
                      {quirks.map((quirk, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 shadow-sm"
                        >
                          {quirk}
                          <button
                            type="button"
                            onClick={() => removeQuirk(idx)}
                            className="text-slate-400 hover:text-red-500 ml-1 cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {!isAtTraitLimit ? (
                        <input
                          type="text"
                          value={currentQuirk}
                          onChange={(e) => setCurrentQuirk(e.target.value)}
                          onKeyDown={handleAddQuirk}
                          placeholder="Type a quirk & press Enter (e.g. Always late with an iced latte)..."
                          className="flex-grow bg-transparent border-none outline-none text-sm font-medium min-w-[180px]"
                        />
                      ) : (
                        <span className="text-xs font-bold text-slate-400 py-1.5 px-1">
                          Maximum of 3 traits reached
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2.5">
                      Quick-Pick Quirks
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Obsessed with bananas',
                        'Addicted to iced coffee',
                        'Terrified of pigeons',
                        'Puts hot sauce on everything',
                        'Brings up their air fryer constantly',
                        'Always losing their keys',
                        'Thinks they can speak to cats',
                        'Secretly loves cheesy 80s pop',
                        'Obsessed with sourdough bread',
                        'Always carries emergency snacks',
                      ].map((suggestion) => {
                        const isSelected = quirks.includes(suggestion);
                        const isDisabled = !isSelected && isAtTraitLimit;
                        return (
                          <button
                            key={suggestion}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => {
                              if (isSelected) {
                                setQuirks(quirks.filter((q) => q !== suggestion));
                              } else if (quirks.length < MAX_TRAITS) {
                                setQuirks([...quirks, suggestion]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-brand-pink/10 border-brand-pink text-brand-pink'
                                : isDisabled
                                ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? `✓ ${suggestion}` : `+ ${suggestion}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Action Bar */}
            <div className="px-6 sm:px-8 py-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {activeTab !== 'basics' && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(activeTab === 'personality' ? 'avatar' : 'basics')
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    ← Back
                  </button>
                )}
                {activeTab !== 'personality' && (
                  <button
                    type="button"
                    onClick={() =>
                      setActiveTab(activeTab === 'basics' ? 'avatar' : 'personality')
                    }
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:border-brand-pink hover:text-brand-pink transition-colors cursor-pointer"
                  >
                    Next: {activeTab === 'basics' ? 'Hair & Look →' : 'Quirks →'}
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleGenerateAiPortrait}
                  disabled={isGeneratingPhoto}
                  className="px-7 py-3.5 rounded-full bg-brand-pink hover:bg-brand-dark text-white font-black uppercase tracking-widest text-xs sm:text-sm transition-all shadow-xl shadow-brand-pink/25 hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isGeneratingPhoto ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>Generating AI Portrait...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>
                        {generatedAiPhotoUrl
                          ? `Regenerate ${firstName.trim() || 'Guest'}'s AI Photo`
                          : `Generate ${firstName.trim() || 'Guest'}'s AI Suspect Photo`}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {genError && (
              <div className="px-6 sm:px-8 py-3 bg-amber-50 border-t border-amber-200 text-xs font-bold text-amber-900 flex flex-wrap items-center justify-between gap-2">
                <span>⚠️ {genError}</span>
                <Link
                  href={signupSaveUrl}
                  onClick={() => persistPendingGuestToStorage()}
                  className="px-3 py-1.5 rounded-lg bg-brand-pink text-white text-[11px] font-black uppercase tracking-wider"
                >
                  Sign Up Free to Save &amp; Continue →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
