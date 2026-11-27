'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { deriveDiceBearTop } from '@/components/account/AvatarBuilder';
import {
  buildAvatarUrl,
  AvatarConfig,
  GUEST_ACCENT_OPTIONS,
  GUEST_AGE_OPTIONS,
  resolveDisplayAvatarUrl,
} from '@/utils/avatar';
import {
  PhotoTraitScanner,
  ScannedGuestTraits,
} from '@/components/account/PhotoTraitScanner';
import {
  generateLandingDemoGuestPortraitAction,
  generateLandingDemoCluePhotoAction,
} from '@/app/actions/ai-guests';
import { generateLandingDemoVoiceClueAction } from '@/app/actions/audio-generator';

export const PENDING_LANDING_GUEST_STORAGE_KEY = 'bpm_pending_landing_guest_v1';
const LANDING_DEMO_GEN_COUNT_KEY = 'bpm_landing_demo_gen_count_v1';
const MAX_FREE_DEMO_GENERATIONS = 5;

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
  cluePhotoUrl?: string;
  avatar_config: AvatarConfig;
  traits: string[];
  bio?: string;
  createdAt: string;
}

const SKIN_SWATCHES = [
  { name: 'Fair', hex: 'ffe0bd', display: '#ffe0bd' },
  { name: 'Light', hex: 'ffcd94', display: '#ffcd94' },
  { name: 'Medium', hex: 'eac086', display: '#eac086' },
  { name: 'Olive / Tan', hex: 'd08b5b', display: '#d08b5b' },
  { name: 'Brown', hex: 'ae5d29', display: '#ae5d29' },
  { name: 'Deep', hex: '614335', display: '#614335' },
];

const HAIR_COLOR_SWATCHES = [
  { name: 'Black', hex: '1b1b1b', display: '#1b1b1b' },
  { name: 'Dark Brown', hex: '4a3123', display: '#4a3123' },
  { name: 'Light Brown', hex: '8d5b3c', display: '#8d5b3c' },
  { name: 'Blonde', hex: 'e6c27a', display: '#e6c27a' },
  { name: 'Auburn / Red', hex: 'b55239', display: '#b55239' },
  { name: 'Silver / Grey', hex: 'b8b8b8', display: '#b8b8b8' },
];

const EYE_SWATCHES = [
  { name: 'Brown', display: '#5c3a21' },
  { name: 'Hazel', display: '#7e6334' },
  { name: 'Blue', display: '#3b75a8' },
  { name: 'Green', display: '#3f7a4d' },
];

const HAIR_LENGTH_LIST = ['Short', 'Medium', 'Long', 'Bald'] as const;
const HAIR_TEXTURE_LIST = ['Straight', 'Wavy', 'Curly', 'Coily'] as const;

const SAMPLE_QUIRKS = [
  'Obsessed with espresso martinis',
  'Always 20 minutes late with an iced latte',
  'Sends 4-minute voice notes treated like podcasts',
  'Still brings up their Euro summer trip in every conversation',
];

const DEFAULT_DEMO_PORTRAIT = '/generated-avatars/gabriella-blyth-front.jpg';
const DEFAULT_DEMO_CLUE_SCENE = '/generated-avatars/gabby-demo-clue-scene.jpg';

const OTHER_SUSPECTS = [
  {
    id: 'jason',
    name: 'Jason Vance',
    role: 'The Co-Worker',
    avatarUrl: '/generated-avatars/jason-dhillon-front.jpg',
    alibi:
      'Claimed he was refilling the ice bucket at 8:08 PM, right when the study safe alarm tripped.',
    clueTag: 'Embezzled $40k from the victim’s holiday bonus account',
    votePct: 38,
    isKiller: true,
  },
  {
    id: 'kiri',
    name: 'Kiri Smyth',
    role: 'The Secret Lover',
    avatarUrl: '/generated-avatars/kiri-smyth-front.jpg',
    alibi:
      'Spotted crying on the balcony at 7:55 PM after being cut out of the victim’s will.',
    clueTag: 'Gold lipstick stain matched the second champagne flute',
    votePct: 21,
    isKiller: false,
  },
  {
    id: 'matt',
    name: 'Matt Sterling',
    role: 'The Bestie',
    avatarUrl: '/generated-avatars/f460c1c6-4019-4c4f-a204-4f60f4c70ae9-matt-curly.jpg',
    alibi: 'Caught wiping his fingerprints off the crystal decanter at 8:11 PM.',
    clueTag: 'Owed the victim $18,000 in unpaid poker debts',
    votePct: 12,
    isKiller: false,
  },
];

function getStaticFallbackAudioUrl(gender: string, accent: string): string {
  const g = gender.toLowerCase();
  const isMale = g.includes('masc') || g === 'male';
  const genderKey = isMale ? 'male' : 'female';
  const a = accent.toLowerCase();
  let regionKey: 'au' | 'gb' | 'us' = 'au';
  if (
    a.includes('aus') ||
    a.includes('kiwi') ||
    a.includes('new zealand') ||
    a.includes('nz')
  ) {
    regionKey = 'au';
  } else if (
    a.includes('brit') ||
    a.includes('uk') ||
    a.includes('irish') ||
    a.includes('scot') ||
    a.includes('euro')
  ) {
    regionKey = 'gb';
  } else if (
    a.includes('amer') ||
    a === 'us' ||
    a.includes('(us)') ||
    a.includes('global')
  ) {
    regionKey = 'us';
  }
  return `/mystery-audio/landing-demo/${genderKey}-${regionKey}.mp3`;
}

function buildDefaultTranscript(firstName: string, trait: string): string {
  const cleanName = (firstName || 'Gabby').trim();
  const cleanTrait = (trait || 'obsessed with espresso martinis')
    .trim()
    .replace(/\.$/, '');
  const traitPhrase =
    cleanTrait.toLowerCase().startsWith('always ') ||
    cleanTrait.toLowerCase().startsWith('obsessed ') ||
    cleanTrait.toLowerCase().startsWith('secretly ') ||
    cleanTrait.toLowerCase().startsWith('never ')
      ? cleanTrait.charAt(0).toLowerCase() + cleanTrait.slice(1)
      : `known for "${cleanTrait}"`;
  return `Keep your voice down! It's ${cleanName}. Someone just saw me by the study safe at eight-oh-four—everyone at this table knows I'm ${traitPhrase}, and if they find that poisoned glass by the bar before dessert, I'm going down for this murder! Delete our texts right now!`;
}

export default function LandingGuestCreator({
  locale = 'en',
}: {
  locale?: string;
}) {
  // 4-step quiz state: 1 = Create Suspect, 2 = 3 Live Clues (Text, Photo, Voice), 3 = Table Vote, 4 = Killer Reveal & Save
  const [quizStep, setQuizStep] = useState<1 | 2 | 3 | 4>(1);
  const [activeClueTab, setActiveClueTab] = useState<'text' | 'photo' | 'voice'>(
    'voice'
  );

  // Guest form state
  const [firstName, setFirstName] = useState('Gabby');
  const [lastName, setLastName] = useState('Blyth');
  const [gender, setGender] = useState('Feminine');
  const [age, setAge] = useState<'young' | 'middle_aged' | 'old'>('young');
  const [accent, setAccent] = useState('Australian');
  const [ethnicity, setEthnicity] = useState('');
  const [trait, setTrait] = useState(SAMPLE_QUIRKS[0]);

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    seed: 'GuestDemo',
    top: 'straight01',
    hairLength: 'Long',
    hairTexture: 'Wavy',
    hairStyle: 'Layered Blowout',
    hairColor: '4a3123',
    skinColor: 'ffcd94',
    eyeColor: 'Brown',
    height: 'Average',
    build: 'Average',
    accent: 'Australian',
    age: 'young',
  });

  const [showPhotoScanner, setShowPhotoScanner] = useState(false);
  const [aiPhotoUrl, setAiPhotoUrl] = useState<string>(DEFAULT_DEMO_PORTRAIT);
  const [cluePhotoUrl, setCluePhotoUrl] = useState<string>(
    DEFAULT_DEMO_CLUE_SCENE
  );
  const [generatedFullAvatarUrl, setGeneratedFullAvatarUrl] =
    useState<string>('');
  const [hasCustomGenerated, setHasCustomGenerated] = useState(false);
  const [genCount, setGenCount] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCluePhoto, setIsGeneratingCluePhoto] = useState(false);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Voice clue state
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string>(() =>
    getStaticFallbackAudioUrl('Feminine', 'Australian')
  );
  const [voiceTranscript, setVoiceTranscript] = useState<string>(() =>
    buildDefaultTranscript('Gabby', SAMPLE_QUIRKS[0])
  );
  const [voiceLabel, setVoiceLabel] = useState<string>(
    'Emma · Dramatic Australian Female (18–29)'
  );
  const [isCustomVoiceAudio, setIsCustomVoiceAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Step 3 Vote state
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>('guest');

  const fullName = useMemo(
    () =>
      [firstName.trim() || 'Gabby', lastName.trim() || 'Blyth']
        .filter(Boolean)
        .join(' '),
    [firstName, lastName]
  );
  const displayFirstName = firstName.trim() || 'Gabby';
  const ageLabel =
    age === 'young' ? '18–29' : age === 'old' ? '50+' : '30–49';

  const hasGlasses =
    avatarConfig.accessories === 'prescription01' ||
    Boolean(avatarConfig.distinctiveFeatures?.includes('Glasses'));
  const hasBeard = Boolean(avatarConfig.facialHair);

  // Restore any previously created guest on the landing page from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedCount = parseInt(
        window.localStorage.getItem(LANDING_DEMO_GEN_COUNT_KEY) || '0',
        10
      );
      if (!Number.isNaN(savedCount)) setGenCount(savedCount);

      const rawSaved = window.localStorage.getItem(
        PENDING_LANDING_GUEST_STORAGE_KEY
      );
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
            setTrait(parsed.traits[0]);
          }
          if (parsed.avatar_config) {
            setAvatarConfig(parsed.avatar_config);
          }
          if (parsed.aiPhotoUrl) {
            setAiPhotoUrl(parsed.aiPhotoUrl);
            setHasCustomGenerated(true);
          }
          if (parsed.cluePhotoUrl) {
            setCluePhotoUrl(parsed.cluePhotoUrl);
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

  // Keep default transcript & static fallback audio in sync with form edits until custom voice is generated
  useEffect(() => {
    setVoiceTranscript(buildDefaultTranscript(displayFirstName, trait));
    if (!isCustomVoiceAudio) {
      setVoiceAudioUrl(getStaticFallbackAudioUrl(gender, accent));
      const isMale = gender === 'Masculine';
      setVoiceLabel(
        `${isMale ? 'Masculine' : 'Feminine'} · ${accent} Voice (${ageLabel})`
      );
    }
  }, [displayFirstName, trait, gender, accent, ageLabel, isCustomVoiceAudio]);

  const persistPendingGuestToStorage = (
    overrideAiPhotoUrl?: string,
    overrideFullAvatarUrl?: string,
    overrideCluePhotoUrl?: string
  ) => {
    if (typeof window === 'undefined') return;
    const cleanFirst = firstName.trim() || 'Gabby';
    const cleanLast = lastName.trim() || 'Blyth';
    const full = `${cleanFirst} ${cleanLast}`.trim();
    const activeAiPhoto = overrideAiPhotoUrl ?? aiPhotoUrl;
    const activeCluePhoto = overrideCluePhotoUrl ?? cluePhotoUrl;
    const builtUrl =
      overrideFullAvatarUrl ||
      generatedFullAvatarUrl ||
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
      eye_color: avatarConfig.eyeColor || 'Brown',
      height: avatarConfig.height || 'Average',
      avatar_url: builtUrl || activeAiPhoto || '',
      aiPhotoUrl: activeAiPhoto || undefined,
      cluePhotoUrl: activeCluePhoto || undefined,
      avatar_config: {
        ...avatarConfig,
        accent,
        age,
        ethnicity,
        aiPhotoUrl: activeAiPhoto || undefined,
      },
      traits: [trait.trim() || SAMPLE_QUIRKS[0]],
      bio: `Known for: ${trait.trim() || SAMPLE_QUIRKS[0]}`,
      createdAt: new Date().toISOString(),
    };

    try {
      window.localStorage.setItem(
        PENDING_LANDING_GUEST_STORAGE_KEY,
        JSON.stringify(payload)
      );
      window.dispatchEvent(
        new CustomEvent('bpm-landing-guest-updated', { detail: payload })
      );
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (hasCustomGenerated && aiPhotoUrl) {
      persistPendingGuestToStorage(aiPhotoUrl, undefined, cluePhotoUrl);
    }
  }, [
    firstName,
    lastName,
    gender,
    age,
    accent,
    trait,
    avatarConfig,
    aiPhotoUrl,
    cluePhotoUrl,
    hasCustomGenerated,
  ]);

  // Stop audio when changing steps
  useEffect(() => {
    if (quizStep !== 2 && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    }
  }, [quizStep]);

  const handleGenderChange = (newGender: string) => {
    setIsCustomVoiceAudio(false);
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

  const handlePhotoTraitsDetected = (traits: ScannedGuestTraits) => {
    setIsCustomVoiceAudio(false);
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
      top: deriveDiceBearTop(
        traits.hairLength,
        traits.hairTexture,
        traits.gender
      ),
      facialHair: traits.gender !== 'Feminine' ? traits.facialHair : undefined,
      eyeColor: traits.eyeColor,
      faceShape: traits.faceShape,
      build: traits.build,
      distinctiveFeatures: traits.distinctiveFeatures,
      likenessNotes: traits.likenessNotes || prev.likenessNotes,
      age: traits.age,
    }));
    setShowPhotoScanner(false);
  };

  const handleToggleAudio = async () => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlayingAudio) {
      el.pause();
      setIsPlayingAudio(false);
    } else {
      try {
        await el.play();
        setIsPlayingAudio(true);
      } catch (err) {
        console.warn('Audio playback prevented:', err);
      }
    }
  };

  const handleGenerateVoiceOnly = async () => {
    if (isGeneratingVoice) return;
    setIsGeneratingVoice(true);
    try {
      const voiceRes = await generateLandingDemoVoiceClueAction({
        firstName: displayFirstName,
        lastName: lastName.trim(),
        gender,
        age,
        accent,
        trait: trait.trim() || SAMPLE_QUIRKS[0],
      });
      if (voiceRes.success && voiceRes.audioUrl) {
        setVoiceAudioUrl(voiceRes.audioUrl);
        setVoiceTranscript(voiceRes.transcript);
        setVoiceLabel(voiceRes.voiceName);
        setIsCustomVoiceAudio(true);
      }
    } catch (err) {
      console.warn('Voice synthesis fallback:', err);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const handleGenerateCluePhotoOnly = async () => {
    if (isGeneratingCluePhoto) return;
    setIsGeneratingCluePhoto(true);
    try {
      const clueRes = await generateLandingDemoCluePhotoAction({
        referencePhotoUrl: aiPhotoUrl,
        name: fullName,
        gender,
      });
      if (clueRes.success && clueRes.cluePhotoUrl) {
        setCluePhotoUrl(clueRes.cluePhotoUrl);
        persistPendingGuestToStorage(
          aiPhotoUrl,
          generatedFullAvatarUrl,
          clueRes.cluePhotoUrl
        );
      }
    } catch (err) {
      console.warn('Clue photo synthesis fallback:', err);
    } finally {
      setIsGeneratingCluePhoto(false);
    }
  };

  const handleGenerateSuspectAndClues = async (advanceToClues = true) => {
    if (isGenerating) return;
    const cleanFirst = firstName.trim() || 'Gabby';
    const cleanLast = lastName.trim() || 'Blyth';
    const fullGuestName = `${cleanFirst} ${cleanLast}`;

    setErrorMsg(null);
    setIsGenerating(true);
    setIsGeneratingVoice(true);
    setIsGeneratingCluePhoto(true);

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

    try {
      const [portraitRes, voiceRes] = await Promise.all([
        genCount < MAX_FREE_DEMO_GENERATIONS
          ? generateLandingDemoGuestPortraitAction({
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
              traits: [trait.trim() || SAMPLE_QUIRKS[0]],
            })
          : Promise.resolve({
              success: true,
              aiPhotoUrl,
              cluePhotoUrl,
              publicUrl: generatedFullAvatarUrl || aiPhotoUrl,
              error: undefined,
            }),
        generateLandingDemoVoiceClueAction({
          firstName: cleanFirst,
          lastName: cleanLast,
          gender,
          age,
          accent,
          trait: trait.trim() || SAMPLE_QUIRKS[0],
        }),
      ]);

      if (voiceRes.success && voiceRes.audioUrl) {
        setVoiceAudioUrl(voiceRes.audioUrl);
        setVoiceTranscript(voiceRes.transcript);
        setVoiceLabel(voiceRes.voiceName);
        setIsCustomVoiceAudio(true);
      }

      if (portraitRes.success && (portraitRes.aiPhotoUrl || portraitRes.publicUrl)) {
        const freshPhotoUrl =
          portraitRes.aiPhotoUrl ||
          resolveDisplayAvatarUrl(portraitRes.publicUrl) ||
          aiPhotoUrl;
        const freshFullAvatarUrl = portraitRes.publicUrl || freshPhotoUrl;
        const freshCluePhotoUrl = portraitRes.cluePhotoUrl || cluePhotoUrl;

        setAiPhotoUrl(freshPhotoUrl);
        setCluePhotoUrl(freshCluePhotoUrl);
        setGeneratedFullAvatarUrl(freshFullAvatarUrl);
        setHasCustomGenerated(true);
        setAvatarConfig((prev) => ({
          ...prev,
          aiPhotoUrl: freshPhotoUrl,
        }));

        const nextCount = genCount + 1;
        setGenCount(nextCount);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            LANDING_DEMO_GEN_COUNT_KEY,
            String(nextCount)
          );
        }
        persistPendingGuestToStorage(
          freshPhotoUrl,
          freshFullAvatarUrl,
          freshCluePhotoUrl
        );
      } else if (portraitRes.error) {
        setErrorMsg(portraitRes.error);
      }

      if (advanceToClues) {
        setQuizStep(2);
        setActiveClueTab('photo');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error generating suspect.');
    } finally {
      setIsGenerating(false);
      setIsGeneratingVoice(false);
      setIsGeneratingCluePhoto(false);
    }
  };

  const signupSaveHref = `/${locale}/signup?saveGuest=1&next=${encodeURIComponent(
    `/${locale}/account/guests`
  )}`;

  const allSuspects = [
    {
      id: 'guest',
      name: fullName,
      role:
        gender === 'Masculine' ? 'The Brother-in-Law' : 'The Sister-in-Law',
      avatarUrl: aiPhotoUrl,
      alibi: `Caught on study hallway camera at 8:04 PM & recorded on a panicked 8:07 PM wiretap talking about being ${trait.toLowerCase()}.`,
      clueTag: 'Your Created Guest Suspect · 3 Red-Herring Clues',
      votePct: 29,
      isKiller: false,
      isUserGuest: true,
    },
    ...OTHER_SUSPECTS,
  ];

  const selectedSuspect =
    allSuspects.find((s) => s.id === selectedSuspectId) || allSuspects[0];

  const selectedSkinName =
    SKIN_SWATCHES.find((s) => s.hex === avatarConfig.skinColor)?.name ||
    'Light';
  const selectedHairColorName =
    HAIR_COLOR_SWATCHES.find((h) => h.hex === avatarConfig.hairColor)?.name ||
    'Dark Brown';

  return (
    <div id="try-guest-creator" className="w-full">
      {/* Hidden HTML5 Audio Element for the Dramatic Voice Wiretap Clue */}
      <audio
        ref={audioRef}
        src={voiceAudioUrl}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration > 0) {
            setAudioProgress(
              Math.min(100, (el.currentTime / el.duration) * 100)
            );
          }
        }}
        onPlay={() => setIsPlayingAudio(true)}
        onPause={() => setIsPlayingAudio(false)}
        onEnded={() => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        }}
      />

      {/* Unified Single-Screen Quiz Card */}
      <div className="bg-[#120914] text-white rounded-[1.75rem] border-2 border-white/15 shadow-[0_24px_70px_rgba(18,9,20,0.45)] overflow-hidden flex flex-col">
        {/* TOP QUIZ STEP PROGRESS BAR (~52px) */}
        <div className="bg-black/45 border-b border-white/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              { step: 1 as const, num: '1', label: 'Create Suspect' },
              {
                step: 2 as const,
                num: '2',
                label: '3 Clues (Text, Photo & Voice)',
              },
              { step: 3 as const, num: '3', label: 'Vote Killer' },
              { step: 4 as const, num: '4', label: 'Reveal & Save' },
            ].map((item, idx) => {
              const isActive = quizStep === item.step;
              const isCompleted = quizStep > item.step;
              return (
                <React.Fragment key={item.step}>
                  <button
                    type="button"
                    onClick={() => setQuizStep(item.step)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-brand-pink text-white shadow-[0_0_20px_rgba(254,4,198,0.45)] scale-[1.02]'
                        : isCompleted
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] flex items-center justify-center font-black ${
                        isActive
                          ? 'bg-white text-brand-dark'
                          : isCompleted
                            ? 'bg-emerald-400 text-brand-dark'
                            : 'bg-white/15 text-white/70'
                      }`}
                    >
                      {isCompleted ? '✓' : item.num}
                    </span>
                    <span>{item.label}</span>
                  </button>
                  {idx < 3 && (
                    <span className="text-white/25 text-xs font-black hidden sm:inline">
                      →
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right Suspect Chip + Save Link */}
          <div className="hidden md:flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
              <img
                src={aiPhotoUrl}
                alt={fullName}
                className="w-5 h-5 rounded-full object-cover border border-brand-pink"
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-white/90">
                {displayFirstName} · {accent}
              </span>
            </div>
            <Link
              href={signupSaveHref}
              onClick={() => persistPendingGuestToStorage()}
              className="px-3 py-1 rounded-full bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-brand-dark border border-emerald-400/40 text-[10px] font-black uppercase tracking-wider transition-all"
            >
              🔒 Save {displayFirstName} →
            </Link>
          </div>
        </div>

        {/* MAIN STAGE BODY — Engineered to fit on one desktop screen */}
        <div className="p-4 sm:p-5 lg:px-6 lg:py-4 relative">
          {/* Optional Photo Trait Scanner Popover Modal inside the card */}
          {showPhotoScanner && (
            <div className="absolute inset-0 z-30 bg-[#120914]/95 backdrop-blur-md p-6 flex flex-col items-center justify-center">
              <div className="max-w-md w-full bg-white/10 border border-white/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                    📷 1-Click Selfie Trait Auto-Fill
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPhotoScanner(false)}
                    className="px-2.5 py-1 rounded-lg bg-white/10 text-xs font-black hover:bg-white/20"
                  >
                    ✕ Close
                  </button>
                </div>
                <PhotoTraitScanner
                  onTraitsDetected={handlePhotoTraitsDetected}
                />
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 1: CREATE YOUR SUSPECT (COMPACT SINGLE-SCREEN BUILDER)          */}
          {/* ===================================================================== */}
          {quizStep === 1 && (
            <div className="grid lg:grid-cols-12 gap-4 lg:gap-5 items-stretch">
              {/* Left 8 Columns: Compact All-in-One Form */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-3 bg-white/[0.04] border border-white/10 rounded-2xl p-3.5 sm:p-4">
                {/* Top mini header + Selfie Scanner button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                      Step 1 of 4 · Build a Friend as a Murder Suspect
                    </span>
                    <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white leading-tight">
                      Enter their details, voice accent &amp; inside joke
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPhotoScanner(true)}
                    className="px-3 py-1.5 rounded-xl bg-brand-pink/15 hover:bg-brand-pink text-brand-pink hover:text-white border border-brand-pink/40 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>📷</span>
                    <span>Auto-Fill from Photo</span>
                  </button>
                </div>

                {/* Row 1: First Name, Last Name, Gender, Age, Voice Accent (5 compact cols) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Gabby"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Blyth"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/15 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => handleGenderChange(e.target.value)}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/15 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    >
                      <option value="Feminine" className="bg-[#120914]">
                        Feminine
                      </option>
                      <option value="Masculine" className="bg-[#120914]">
                        Masculine
                      </option>
                      <option value="Non-Binary" className="bg-[#120914]">
                        Neutral / Flex
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Age Bracket
                    </label>
                    <select
                      value={age}
                      onChange={(e) => {
                        const nextAge = e.target.value as
                          | 'young'
                          | 'middle_aged'
                          | 'old';
                        setIsCustomVoiceAudio(false);
                        setAge(nextAge);
                        setAvatarConfig((prev) => ({ ...prev, age: nextAge }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-black/50 border border-white/15 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    >
                      {GUEST_AGE_OPTIONS.map((a) => (
                        <option
                          key={a.value}
                          value={a.value}
                          className="bg-[#120914]"
                        >
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-[9px] font-black uppercase tracking-widest text-brand-pink mb-1">
                      🎙️ Voice Accent
                    </label>
                    <select
                      value={accent}
                      onChange={(e) => {
                        const nextAcc = e.target.value;
                        setIsCustomVoiceAudio(false);
                        setAccent(nextAcc);
                        setAvatarConfig((prev) => ({
                          ...prev,
                          accent: nextAcc,
                        }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg bg-brand-pink/15 border border-brand-pink/40 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    >
                      {GUEST_ACCENT_OPTIONS.map((acc) => (
                        <option
                          key={acc.value}
                          value={acc.value}
                          className="bg-[#120914]"
                        >
                          {acc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: Skin Tone Swatches + Hair Color Swatches + Eye Color */}
                <div className="grid sm:grid-cols-12 gap-3 items-center bg-black/30 rounded-xl p-2.5 border border-white/5">
                  {/* Skin Tone (4 cols) */}
                  <div className="sm:col-span-4">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1.5">
                      Skin:{' '}
                      <strong className="text-white">{selectedSkinName}</strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {SKIN_SWATCHES.map((tone) => (
                        <button
                          key={tone.hex}
                          type="button"
                          onClick={() =>
                            setAvatarConfig({
                              ...avatarConfig,
                              skinColor: tone.hex,
                            })
                          }
                          title={tone.name}
                          className={`w-6 h-6 rounded-full transition-all border cursor-pointer ${
                            avatarConfig.skinColor === tone.hex
                              ? 'border-brand-pink scale-110 ring-2 ring-brand-pink/40'
                              : 'border-white/20 opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: tone.display }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hair Color (5 cols) */}
                  <div className="sm:col-span-5">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1.5">
                      Hair Color:{' '}
                      <strong className="text-white">
                        {selectedHairColorName}
                      </strong>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {HAIR_COLOR_SWATCHES.map((color) => (
                        <button
                          key={color.hex}
                          type="button"
                          onClick={() =>
                            setAvatarConfig({
                              ...avatarConfig,
                              hairColor: color.hex,
                            })
                          }
                          title={color.name}
                          className={`w-6 h-6 rounded-full transition-all border cursor-pointer ${
                            avatarConfig.hairColor === color.hex
                              ? 'border-brand-pink scale-110 ring-2 ring-brand-pink/40'
                              : 'border-white/20 opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: color.display }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Eye Color (3 cols) */}
                  <div className="sm:col-span-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1.5">
                      Eyes:{' '}
                      <strong className="text-white">
                        {avatarConfig.eyeColor || 'Brown'}
                      </strong>
                    </span>
                    <div className="flex items-center gap-1.5">
                      {EYE_SWATCHES.map((eye) => (
                        <button
                          key={eye.name}
                          type="button"
                          onClick={() =>
                            setAvatarConfig({
                              ...avatarConfig,
                              eyeColor: eye.name,
                            })
                          }
                          title={eye.name}
                          className={`w-6 h-6 rounded-full transition-all border cursor-pointer ${
                            avatarConfig.eyeColor === eye.name
                              ? 'border-brand-pink scale-110 ring-2 ring-brand-pink/40'
                              : 'border-white/20 opacity-75 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: eye.display }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Row 3: Hair Length + Hair Texture + Accessories */}
                <div className="grid sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-5">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Hair Length
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {HAIR_LENGTH_LIST.map((len) => (
                        <button
                          key={len}
                          type="button"
                          onClick={() =>
                            setAvatarConfig((prev) => ({
                              ...prev,
                              hairLength: len,
                              top: deriveDiceBearTop(
                                len,
                                prev.hairTexture || 'Straight',
                                gender
                              ),
                            }))
                          }
                          className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer ${
                            avatarConfig.hairLength === len
                              ? 'bg-brand-pink text-white border-brand-pink'
                              : 'bg-black/40 text-white/65 border-white/10 hover:border-white/25'
                          }`}
                        >
                          {len === 'Medium' ? 'Med' : len}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-4">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Texture
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {HAIR_TEXTURE_LIST.map((tex) => (
                        <button
                          key={tex}
                          type="button"
                          onClick={() =>
                            setAvatarConfig((prev) => ({
                              ...prev,
                              hairTexture: tex,
                              top: deriveDiceBearTop(
                                prev.hairLength || 'Long',
                                tex,
                                gender
                              ),
                            }))
                          }
                          className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer ${
                            avatarConfig.hairTexture === tex
                              ? 'bg-brand-pink text-white border-brand-pink'
                              : 'bg-black/40 text-white/65 border-white/10 hover:border-white/25'
                          }`}
                        >
                          {tex}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <span className="block text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                      Details
                    </span>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAvatarConfig((prev) => ({
                            ...prev,
                            accessories: hasGlasses ? undefined : 'prescription01',
                          }))
                        }
                        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer ${
                          hasGlasses
                            ? 'bg-brand-pink text-white border-brand-pink'
                            : 'bg-black/40 text-white/65 border-white/10 hover:border-white/25'
                        }`}
                      >
                        👓 Glasses
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setAvatarConfig((prev) => ({
                            ...prev,
                            facialHair: hasBeard ? undefined : 'beardLight',
                          }))
                        }
                        className={`py-1 rounded-lg text-[10px] font-black uppercase transition-all border cursor-pointer ${
                          hasBeard
                            ? 'bg-brand-pink text-white border-brand-pink'
                            : 'bg-black/40 text-white/65 border-white/10 hover:border-white/25'
                        }`}
                      >
                        🧔 Beard
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 4: Inside Joke / Quirk (woven into Text & Voice Clues) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[9px] font-black uppercase tracking-widest text-brand-pink">
                      ✨ Inside Joke / Quirk (Woven into their Text &amp; Dramatic Voice Clues!)
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={trait}
                      onChange={(e) => {
                        setIsCustomVoiceAudio(false);
                        setTrait(e.target.value);
                      }}
                      placeholder="e.g. Obsessed with espresso martinis"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/50 border border-white/15 focus:border-brand-pink focus:outline-none text-xs font-bold text-white"
                    />
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {SAMPLE_QUIRKS.slice(0, 3).map((q, idx) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setIsCustomVoiceAudio(false);
                            setTrait(q);
                          }}
                          className={`px-2 py-1 rounded-lg text-[9px] font-bold shrink-0 border transition-all cursor-pointer ${
                            trait === q
                              ? 'bg-brand-pink/20 border-brand-pink text-brand-pink'
                              : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                          }`}
                        >
                          Idea #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right 4 Columns: Live Suspect Portrait Card + Generate & Next CTA */}
              <div className="lg:col-span-4 flex flex-col justify-between bg-gradient-to-b from-white/[0.08] to-white/[0.03] border border-white/15 rounded-2xl p-3.5 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Compact Suspect Portrait Thumbnail */}
                  <div className="relative w-24 sm:w-28 aspect-[4/5] rounded-xl overflow-hidden bg-black/60 border-2 border-brand-pink/50 shrink-0 shadow-lg">
                    <img
                      src={aiPhotoUrl}
                      alt={fullName}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        isGenerating
                          ? 'scale-105 blur-sm opacity-40'
                          : 'scale-100 opacity-100'
                      }`}
                    />
                    {isGenerating && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/65 p-2 text-center">
                        <div className="w-6 h-6 rounded-full border-2 border-brand-pink border-t-transparent animate-spin mb-1" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-brand-pink">
                          Painting &amp; Voicing...
                        </span>
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[7px] font-black uppercase tracking-widest text-emerald-300 text-center truncate">
                      {hasCustomGenerated
                        ? '✨ Custom AI Suspect'
                        : 'Sample AI Portrait'}
                    </span>
                  </div>

                  {/* Suspect Dossier Meta */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-brand-pink/20 border border-brand-pink/40 text-[9px] font-black uppercase tracking-widest text-brand-pink">
                      {gender === 'Masculine'
                        ? 'Role: The Brother-in-Law'
                        : 'Role: The Sister-in-Law'}
                    </span>
                    <h3 className="text-lg font-black uppercase tracking-tight text-white truncate">
                      {fullName}
                    </h3>
                    <p className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                      <span>🎙️</span>
                      <span className="truncate">
                        {gender} · {accent} ({ageLabel})
                      </span>
                    </p>
                    <p className="text-[10px] text-white/65 italic line-clamp-2 leading-snug">
                      &ldquo;{trait}&rdquo;
                    </p>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-lg px-2.5 py-1.5 mt-2">
                    {errorMsg}
                  </p>
                )}

                {/* Action Stack: Generate AI Portrait & Voice -> See in 3 Clues -> Save Guest */}
                <div className="space-y-2 mt-3 pt-2.5 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleGenerateSuspectAndClues(true)}
                    disabled={isGenerating}
                    className="w-full py-2.5 px-4 rounded-xl bg-brand-pink hover:bg-brand-pink/90 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs transition-all shadow-[0_10px_25px_rgba(254,4,198,0.35)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isGenerating ? (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>
                          Generating AI Photo &amp; {accent} Voice...
                        </span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Generate AI Suspect &amp; See 3 Clues →</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQuizStep(2)}
                      className="py-2 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-black uppercase tracking-wider text-[10px] transition-all text-center cursor-pointer"
                    >
                      Skip to 3 Clues →
                    </button>
                    <Link
                      href={signupSaveHref}
                      onClick={() => persistPendingGuestToStorage()}
                      className="py-2 px-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-brand-dark border border-emerald-400/30 font-black uppercase tracking-wider text-[10px] transition-all text-center"
                    >
                      🔒 Sign Up to Save
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 2: SEE YOUR CHARACTER APPEAR IN 3 CLUES (TEXT, PHOTO & VOICE)    */}
          {/* ===================================================================== */}
          {quizStep === 2 && (
            <div className="space-y-3">
              {/* Top sub-bar for Step 2 */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                    Step 2 of 4 · {fullName} Inside 3 Live Evidence Clues
                  </span>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                    1. Leaked Text · 2. Crime Scene Photo · 3. Dramatic {accent} Voice Wiretap
                  </h2>
                </div>

                {/* Mobile/Quick Clue Switcher Pills */}
                <div className="flex items-center gap-1.5">
                  {[
                    { id: 'text' as const, label: '1. 💬 Text Clue' },
                    { id: 'photo' as const, label: '2. 📸 Photo Clue' },
                    { id: 'voice' as const, label: '3. 🎙️ Voice Clue' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveClueTab(tab.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        activeClueTab === tab.id
                          ? 'bg-brand-pink text-white'
                          : 'bg-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3-Column Live Evidence Grid */}
              <div className="grid lg:grid-cols-3 gap-3.5 items-stretch">
                {/* CLUE 1: LEAKED TEXT THREAD */}
                <div
                  onClick={() => setActiveClueTab('text')}
                  className={`rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                    activeClueTab === 'text'
                      ? 'bg-white/[0.08] border-brand-pink shadow-[0_0_25px_rgba(254,4,198,0.2)]'
                      : 'bg-white/[0.04] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
                      <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[9px] font-black uppercase tracking-widest">
                        Clue #1 · 💬 Leaked Text
                      </span>
                      <span className="text-[9px] font-bold text-white/45">
                        8:02 PM
                      </span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="bg-white/10 rounded-xl rounded-tl-xs p-2.5 text-white/90">
                        <p className="text-[9px] font-black uppercase text-white/50 mb-0.5">
                          Arthur (The Victim)
                        </p>
                        <p className="font-medium leading-snug">
                          I saw you near the study safe,{' '}
                          <strong className="text-brand-pink">
                            {displayFirstName}
                          </strong>
                          . Everyone here knows you&apos;re{' '}
                          <span className="text-amber-300 underline decoration-amber-400/50">
                            {trait.toLowerCase()}
                          </span>
                          . Meet me at 8:04 PM or I tell the table what you
                          took.
                        </p>
                      </div>

                      <div className="bg-brand-pink/25 border border-brand-pink/40 rounded-xl rounded-tr-xs p-2.5 text-white ml-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <img
                            src={aiPhotoUrl}
                            alt={fullName}
                            className="w-4 h-4 rounded-full object-cover border border-brand-pink"
                          />
                          <span className="text-[9px] font-black uppercase text-brand-pink">
                            {fullName}
                          </span>
                        </div>
                        <p className="font-bold leading-snug">
                          Keep your voice down!! Put that folder back right now.
                          I&apos;m coming upstairs—don&apos;t pour the champagne
                          yet.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] font-bold text-white/50 mt-2.5 pt-2 border-t border-white/10">
                    ✓ Automatically weaves in{' '}
                    <strong className="text-white">
                      {displayFirstName}&apos;s
                    </strong>{' '}
                    name &amp; inside joke
                  </p>
                </div>

                {/* CLUE 2: CRIME SCENE PHOTO */}
                <div
                  onClick={() => setActiveClueTab('photo')}
                  className={`rounded-2xl p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                    activeClueTab === 'photo'
                      ? 'bg-white/[0.08] border-brand-pink shadow-[0_0_25px_rgba(254,4,198,0.2)]'
                      : 'bg-white/[0.04] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-widest">
                        Clue #2 · 📸 Caught on Camera
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateCluePhotoOnly();
                          }}
                          disabled={isGeneratingCluePhoto}
                          title="Generate a custom crime-scene photo featuring your guest portrait"
                          className="px-2 py-0.5 rounded bg-white/10 hover:bg-brand-pink text-[8px] font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                        >
                          {isGeneratingCluePhoto ? 'Shooting...' : '🔄 Sync Scene'}
                        </button>
                        <span className="text-[9px] font-bold text-rose-400 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                          REC 08:04 PM
                        </span>
                      </div>
                    </div>

                    <div className="relative h-44 rounded-xl overflow-hidden bg-black border border-white/15">
                      <img
                        src={cluePhotoUrl}
                        alt={`${fullName} caught on camera outside the study safe`}
                        className={`w-full h-full object-cover object-[50%_38%] transition-all duration-500 ${
                          isGeneratingCluePhoto ? 'blur-sm opacity-45 scale-105' : ''
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/75 border border-white/20 text-[8px] font-mono uppercase text-emerald-300">
                        CAM-04 · STUDY SAFE CORRIDOR
                      </div>
                      {/* Forensic Face Match Picture-in-Picture Badge */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-black/80 border border-brand-pink/50 backdrop-blur-xs">
                        <img
                          src={aiPhotoUrl}
                          alt={fullName}
                          className="w-5 h-5 rounded-md object-cover border border-brand-pink"
                        />
                        <div className="leading-none">
                          <p className="text-[7px] font-mono uppercase text-emerald-300 font-black">
                            99.4% MATCH
                          </p>
                          <p className="text-[8px] font-black uppercase text-white truncate max-w-[64px]">
                            {displayFirstName}
                          </p>
                        </div>
                      </div>
                      <div className="absolute bottom-2 left-2.5 right-2.5">
                        <p className="text-xs font-black uppercase text-white leading-tight">
                          {fullName} Caught Opening Study Safe
                        </p>
                        <p className="text-[10px] text-white/80 font-medium leading-tight mt-0.5">
                          Spotted holding a crystal coupe glass at the brass safe 11 mins before blackout.
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-[9px] font-bold text-white/50 mt-2.5 pt-2 border-t border-white/10">
                    ✓ Casts{' '}
                    <strong className="text-white">
                      {displayFirstName}&apos;s
                    </strong>{' '}
                    AI likeness directly into crime-scene evidence photos
                  </p>
                </div>

                {/* CLUE 3: DRAMATIC VOICE WIRETAP IN THEIR EXACT VOICE */}
                <div
                  onClick={() => setActiveClueTab('voice')}
                  className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                    activeClueTab === 'voice'
                      ? 'bg-gradient-to-b from-brand-pink/20 to-white/[0.06] border-brand-pink shadow-[0_0_30px_rgba(254,4,198,0.28)]'
                      : 'bg-white/[0.04] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <span className="px-2 py-0.5 rounded bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                        Clue #3 · 🎙️ Dramatic Voice Wiretap
                      </span>
                      <span className="text-[9px] font-bold text-amber-300">
                        8:07 PM
                      </span>
                    </div>

                    {/* Voice Profile Match Banner */}
                    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-black/50 border border-brand-pink/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={aiPhotoUrl}
                          alt={fullName}
                          className="w-7 h-7 rounded-full object-cover border border-brand-pink shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-[9px] font-black uppercase tracking-wider text-brand-pink truncate">
                            {displayFirstName}&apos;s Voice · {accent}
                          </p>
                          <p className="text-[10px] font-bold text-white truncate">
                            {voiceLabel}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateVoiceOnly();
                        }}
                        disabled={isGeneratingVoice}
                        title="Synthesize custom voice line with your latest edits"
                        className="px-2 py-1 rounded-lg bg-white/10 hover:bg-brand-pink text-[9px] font-black uppercase tracking-wider text-white shrink-0 transition-all cursor-pointer"
                      >
                        {isGeneratingVoice ? 'Voicing...' : '🔄 Sync Voice'}
                      </button>
                    </div>

                    {/* Playable Dramatic Audio Player */}
                    <div className="bg-black/60 rounded-xl p-2.5 border border-white/15 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAudio();
                        }}
                        className="w-10 h-10 rounded-full bg-brand-pink hover:bg-brand-pink/90 text-white flex items-center justify-center font-black shadow-[0_0_20px_rgba(254,4,198,0.5)] shrink-0 transition-transform active:scale-95 cursor-pointer"
                        aria-label={
                          isPlayingAudio
                            ? 'Pause Dramatic Voice Clue'
                            : 'Play Dramatic Voice Clue'
                        }
                      >
                        {isPlayingAudio ? '❚❚' : '▶'}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider mb-1">
                          <span className="text-white">
                            {isPlayingAudio
                              ? '🔊 Playing Wiretap...'
                              : '▶ Play Dramatic Audio'}
                          </span>
                          <span className="text-brand-pink">0:11 MP3</span>
                        </div>
                        {/* Waveform Bars */}
                        <div className="h-4 flex items-center gap-0.5">
                          {[
                            35, 65, 90, 50, 80, 100, 60, 85, 45, 95, 70, 55, 88,
                            62, 40, 75, 92, 50, 68, 45,
                          ].map((h, i) => {
                            const barPct = (i / 20) * 100;
                            const isPlayed =
                              isPlayingAudio && barPct <= audioProgress;
                            return (
                              <span
                                key={i}
                                className={`flex-1 rounded-full transition-all ${
                                  isPlayed
                                    ? 'bg-brand-pink'
                                    : isPlayingAudio
                                      ? 'bg-brand-pink/40 animate-pulse'
                                      : 'bg-white/25'
                                }`}
                                style={{ height: `${h}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Dramatic Spoken Transcript */}
                    <p className="text-[10px] text-white/85 italic leading-snug bg-white/[0.04] rounded-lg p-2 border border-white/5 line-clamp-3">
                      &ldquo;{voiceTranscript}&rdquo;
                    </p>
                  </div>

                  <p className="text-[9px] font-bold text-emerald-300 mt-2 pt-1.5 border-t border-white/10">
                    ✓ Synthesized in{' '}
                    <strong className="text-white">
                      {displayFirstName}&apos;s
                    </strong>{' '}
                    exact gender, age &amp; {accent} accent
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 3: THE TABLE VOTE ("WHO POISONED THE CHAMPAGNE?")               */}
          {/* ===================================================================== */}
          {quizStep === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-pink">
                    Step 3 of 4 · Round 3 Final Accusation Vote
                  </span>
                  <h2 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                    You&apos;ve seen {displayFirstName} in the clues — who do
                    you vote as the killer?
                  </h2>
                </div>
                <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  🗳️ Tap a Suspect to Select Your Vote
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {allSuspects.map((suspect) => {
                  const isSelected = selectedSuspectId === suspect.id;
                  return (
                    <div
                      key={suspect.id}
                      onClick={() => setSelectedSuspectId(suspect.id)}
                      className={`rounded-2xl p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-brand-pink/20 border-brand-pink shadow-[0_0_25px_rgba(254,4,198,0.3)] scale-[1.01]'
                          : 'bg-white/[0.04] border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <img
                            src={suspect.avatarUrl}
                            alt={suspect.name}
                            className="w-12 h-12 rounded-xl object-cover border-2 border-brand-pink/60 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="inline-block px-1.5 py-0.5 rounded bg-white/10 text-[8px] font-black uppercase tracking-widest text-brand-pink">
                              {suspect.role}
                            </span>
                            <h3 className="text-sm font-black uppercase text-white truncate">
                              {suspect.name}
                            </h3>
                            {(suspect as any).isUserGuest && (
                              <span className="text-[9px] font-black text-emerald-300">
                                ★ Your Created Guest
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-[10px] font-bold text-amber-300 mb-1.5 leading-snug">
                          ⚡ {suspect.clueTag}
                        </p>
                        <p className="text-[10px] text-white/70 leading-snug line-clamp-3">
                          {suspect.alibi}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-white/50">
                          Table Suspicion: {suspect.votePct}%
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase ${
                            isSelected
                              ? 'bg-brand-pink text-white'
                              : 'bg-white/10 text-white/70'
                          }`}
                        >
                          {isSelected ? '✓ Selected' : 'Vote'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* STEP 4: THE KILLER REVEAL + SIGN UP NOW TO SAVE GUEST                */}
          {/* ===================================================================== */}
          {quizStep === 4 && (
            <div className="grid lg:grid-cols-12 gap-4 items-stretch">
              {/* Left 7 Columns: The Killer Reveal & How Your Friend Was Framed */}
              <div className="lg:col-span-7 bg-white/[0.05] border border-white/15 rounded-2xl p-4 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        selectedSuspect.isKiller
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                          : 'bg-brand-pink/20 text-brand-pink border border-brand-pink/40'
                      }`}
                    >
                      {selectedSuspect.isKiller
                        ? '🎯 Bullseye! You Caught the Killer!'
                        : `🕵️ Plot Twist! You Voted ${selectedSuspect.name} (Red Herring!)`}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                      Case File Solved
                    </span>
                  </div>

                  <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white leading-tight">
                    The Killer Was{' '}
                    <span className="text-brand-pink">
                      Jason Vance (The Co-Worker)
                    </span>{' '}
                    — Who Framed {fullName}!
                  </h2>

                  <p className="text-xs text-white/80 leading-relaxed">
                    <strong className="text-white">{fullName}&apos;s</strong>{' '}
                    panicked 8:07 PM voice wiretap about being{' '}
                    <span className="text-amber-300 italic">
                      &ldquo;{trait.toLowerCase()}&rdquo;
                    </span>{' '}
                    was the ultimate red herring! While everyone interrogated{' '}
                    {displayFirstName} about the 8:04 PM hallway photo,{' '}
                    <strong className="text-white">Jason Vance</strong> slipped
                    the sedative into the victim&apos;s champagne coupe at 8:09
                    PM to cover up his $40,000 embezzlement.
                  </p>

                  <div className="grid sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <p className="text-[9px] font-black uppercase text-brand-pink">
                        1. Custom Cast
                      </p>
                      <p className="text-[10px] font-bold text-white/85 mt-0.5">
                        6–16 friends cast with custom AI portraits &amp; quirks
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <p className="text-[9px] font-black uppercase text-amber-300">
                        2. Multi-Format Clues
                      </p>
                      <p className="text-[10px] font-bold text-white/85 mt-0.5">
                        Texts, crime photos &amp; voice wiretaps in their accent
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-black/40 border border-white/10">
                      <p className="text-[9px] font-black uppercase text-emerald-300">
                        3. Spoiler-Free Host
                      </p>
                      <p className="text-[10px] font-bold text-white/85 mt-0.5">
                        You play &amp; vote alongside your guests without
                        spoilers
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizStep(1)}
                    className="text-[10px] font-black uppercase tracking-wider text-white/60 hover:text-white transition-colors cursor-pointer"
                  >
                    ↺ Test Another Friend&apos;s Look &amp; Voice
                  </button>
                  <Link
                    href={`/${locale}/themes`}
                    className="text-[10px] font-black uppercase tracking-wider text-brand-pink hover:underline"
                  >
                    Browse All Mystery Themes →
                  </Link>
                </div>
              </div>

              {/* Right 5 Columns: Save Your Created Guest CTA Card */}
              <div className="lg:col-span-5 bg-gradient-to-br from-brand-pink/25 via-brand-pink/10 to-emerald-500/10 border-2 border-brand-pink rounded-2xl p-4 flex flex-col justify-between shadow-[0_0_35px_rgba(254,4,198,0.25)]">
                <div className="flex items-center gap-3.5">
                  <img
                    src={aiPhotoUrl}
                    alt={fullName}
                    className="w-20 h-24 rounded-xl object-cover border-2 border-white shadow-lg shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="inline-block px-2 py-0.5 rounded bg-emerald-400 text-brand-dark text-[9px] font-black uppercase tracking-widest mb-1">
                      ✨ Suspect Ready to Save
                    </span>
                    <h3 className="text-lg font-black uppercase text-white truncate">
                      Save {fullName}?
                    </h3>
                    <p className="text-[11px] text-white/80 font-medium leading-snug mt-0.5">
                      Don&apos;t lose{' '}
                      <strong className="text-white">
                        {displayFirstName}&apos;s
                      </strong>{' '}
                      AI suspect portrait, {accent} voice setting &amp; inside
                      joke! Sign up free in 10 seconds to auto-import them into
                      your Host Guest List.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mt-3">
                  <Link
                    href={signupSaveHref}
                    onClick={() => persistPendingGuestToStorage()}
                    className="w-full py-3 px-4 rounded-xl bg-brand-pink hover:bg-white text-white hover:text-brand-dark font-black uppercase tracking-widest text-xs transition-all shadow-xl flex items-center justify-center gap-2 text-center"
                  >
                    <span>🔒</span>
                    <span>
                      Sign Up Now to Save {displayFirstName} to Your Cast →
                    </span>
                  </Link>
                  <p className="text-[10px] text-center text-white/60 font-bold">
                    Free account · Auto-imports {displayFirstName}&apos;s photo
                    &amp; traits · Packs from $19 (~$2.50/guest)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM QUIZ NAVIGATION FOOTER BAR (~52px) */}
        <div className="bg-black/50 border-t border-white/10 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {quizStep > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setQuizStep(
                    (prev) => Math.max(1, prev - 1) as 1 | 2 | 3 | 4
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                ← Back
              </button>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-white/45">
                Interactive Mini-Mystery · 4 Quick Steps
              </span>
            )}
          </div>

          {/* Persistent Save Guest Pill */}
          <Link
            href={signupSaveHref}
            onClick={() => persistPendingGuestToStorage()}
            className="text-[10px] font-black uppercase tracking-wider text-emerald-300 hover:text-white transition-colors"
          >
            🔒 Sign Up Free to Save {displayFirstName} &amp; Their AI Portrait →
          </Link>

          {/* Primary Quiz "Next →" Button */}
          <div>
            {quizStep === 1 && (
              <button
                type="button"
                onClick={() => setQuizStep(2)}
                className="px-4 py-1.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                Next: See {displayFirstName} in 3 Clues →
              </button>
            )}
            {quizStep === 2 && (
              <button
                type="button"
                onClick={() => setQuizStep(3)}
                className="px-4 py-1.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                Next: Cast Your Table Vote →
              </button>
            )}
            {quizStep === 3 && (
              <button
                type="button"
                onClick={() => setQuizStep(4)}
                className="px-4 py-1.5 rounded-xl bg-brand-pink hover:bg-brand-pink/90 text-white text-[11px] font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer"
              >
                Lock In Vote &amp; Reveal Killer →
              </button>
            )}
            {quizStep === 4 && (
              <Link
                href={signupSaveHref}
                onClick={() => persistPendingGuestToStorage()}
                className="px-4 py-1.5 rounded-xl bg-emerald-400 hover:bg-white text-brand-dark text-[11px] font-black uppercase tracking-wider transition-all shadow-lg inline-block"
              >
                Save {displayFirstName} &amp; Create Free Account →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
