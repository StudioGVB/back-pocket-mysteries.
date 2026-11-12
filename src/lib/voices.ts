import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';
import {
  getCharacterRoleTitle,
  getCharacterDisplayName,
  hydrateTextWithCharacters,
} from '@/utils/hydration';

export type VoiceRegion = 'en-US' | 'en-GB' | 'en-AU';
export type VoiceAge = 'young' | 'middle_aged' | 'old';

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  age: VoiceAge;
  accent: VoiceRegion;
  tone: string; // e.g. "raspy", "posh", "deep", "nervous"
}

/**
 * Universal fallback voice IDs when a speaker has no assigned guest or cannot be matched.
 */
export const FALLBACK_VOICE_ID = 'SAz9YHcvj6GT2YYXdXww';

export const FALLBACK_VOICE_BY_GENDER: Record<'male' | 'female' | 'neutral', string> = {
  female: 'EXAVITQu4vr4xnSDxMaL',
  male: 'cjVigY5qzO86Huf0OWal',
  neutral: 'SAz9YHcvj6GT2YYXdXww',
};

export interface VoiceRegionOption {
  value: VoiceRegion;
  label: string;
  flag: string;
  description: string;
}

export const VOICE_REGION_OPTIONS: VoiceRegionOption[] = [
  {
    value: 'en-AU',
    label: 'Australian (en-AU)',
    flag: '🇦🇺',
    description: 'Curated Australian & Reality TV cast voices',
  },
  {
    value: 'en-US',
    label: 'American (en-US)',
    flag: '🇺🇸',
    description: 'Curated American cinematic & drama voices',
  },
  {
    value: 'en-GB',
    label: 'British (en-GB)',
    flag: '🇬🇧',
    description: 'Curated British aristocratic & noir voices',
  },
];

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  // Australian Voices
  '7AT99iuMA9sXzwoSxG9H': {
    id: '7AT99iuMA9sXzwoSxG9H',
    name: 'Australian Female (Young)',
    gender: 'female',
    age: 'young',
    accent: 'en-AU',
    tone: 'soft, young Australian, composed',
  },
  IKne3meq5aSn9XLyUdCD: {
    id: 'IKne3meq5aSn9XLyUdCD',
    name: 'Australian Male (Young)',
    gender: 'male',
    age: 'young',
    accent: 'en-AU',
    tone: 'deep, confident, energetic Australian',
  },

  // British Voices
  JBFqnCBsd6RMkjVDRZzb: {
    id: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'British Male (Adult)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-GB',
    tone: 'warm, captivating British storyteller',
  },
  Xb7hH8MSUJpSbSDYk0k2: {
    id: 'Xb7hH8MSUJpSbSDYk0k2',
    name: 'British Female (Adult)',
    gender: 'female',
    age: 'middle_aged',
    accent: 'en-GB',
    tone: 'clear, sharp, poised British',
  },
  onwK4e9ZLuTAKqWW03F9: {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'British Male (Formal)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-GB',
    tone: 'steady, formal, calculating British',
  },
  pFZP5JQG7iQjIQuC4Bku: {
    id: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'British Female (Dramatic)',
    gender: 'female',
    age: 'middle_aged',
    accent: 'en-GB',
    tone: 'velvety, dramatic British actress',
  },

  // American & International Character Voices
  pNInz6obpgDQGcFmaJgB: {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'American Male (Intense)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'dominant, tense, intense',
  },
  EXAVITQu4vr4xnSDxMaL: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'American Female (Confident)',
    gender: 'female',
    age: 'young',
    accent: 'en-US',
    tone: 'polished, confident, dramatic',
  },
  FGY2WhTYpPnrIDTdsKH5: {
    id: 'FGY2WhTYpPnrIDTdsKH5',
    name: 'American Female (Young)',
    gender: 'female',
    age: 'young',
    accent: 'en-US',
    tone: 'sassy, quick, expressive',
  },
  N2lVS1w4EtoT3dr4eOWO: {
    id: 'N2lVS1w4EtoT3dr4eOWO',
    name: 'American Male (Husky)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'husky, bookish, intense',
  },
  TX3LPaxmHKxFdv7VOQHJ: {
    id: 'TX3LPaxmHKxFdv7VOQHJ',
    name: 'American Male (Young Energetic)',
    gender: 'male',
    age: 'young',
    accent: 'en-US',
    tone: 'charismatic, energetic, camera-ready',
  },
  bIHbv24MWmeRgasZH58o: {
    id: 'bIHbv24MWmeRgasZH58o',
    name: 'American Male (Young Relaxed)',
    gender: 'male',
    age: 'young',
    accent: 'en-US',
    tone: 'youthful, earnest, relaxed',
  },
  cgSgspJ2msm6clMCkdW9: {
    id: 'cgSgspJ2msm6clMCkdW9',
    name: 'American Female (Bright)',
    gender: 'female',
    age: 'young',
    accent: 'en-US',
    tone: 'playful, bright, magnetic',
  },
  cjVigY5qzO86Huf0OWal: {
    id: 'cjVigY5qzO86Huf0OWal',
    name: 'American Male (Smooth)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'calm, smooth, calculating',
  },
  XrExE9yKIg1WjnnlVkGX: {
    id: 'XrExE9yKIg1WjnnlVkGX',
    name: 'American Female (Adult)',
    gender: 'female',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'upbeat, bold, sharp',
  },
  hpp4J3VqNfWAUOO0d1Us: {
    id: 'hpp4J3VqNfWAUOO0d1Us',
    name: 'American Female (Warm)',
    gender: 'female',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'warm, poised, glamorous',
  },
  iP95p4xoKVk53GoZ742B: {
    id: 'iP95p4xoKVk53GoZ742B',
    name: 'American Male (Charming)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'charming, smooth host',
  },
  nPczCjzI2devNBz1zQrb: {
    id: 'nPczCjzI2devNBz1zQrb',
    name: 'American Male (Deep)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'deep, smooth, resonant',
  },
  CwhRBWXzGAHq8TQ4Fs17: {
    id: 'CwhRBWXzGAHq8TQ4Fs17',
    name: 'American Male (Resonant)',
    gender: 'male',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'laid-back, resonant, dry',
  },
  SOYHLrjzK2X1ezoPC6cr: {
    id: 'SOYHLrjzK2X1ezoPC6cr',
    name: 'American Male (Raspy)',
    gender: 'male',
    age: 'young',
    accent: 'en-US',
    tone: 'raspy, fierce, volatile',
  },
  SAz9YHcvj6GT2YYXdXww: {
    id: 'SAz9YHcvj6GT2YYXdXww',
    name: 'Neutral Fallback Voice',
    gender: 'neutral',
    age: 'middle_aged',
    accent: 'en-US',
    tone: 'calm, relaxed, neutral',
  },
  pqHfZKP75CvOlQylNhV4: {
    id: 'pqHfZKP75CvOlQylNhV4',
    name: 'Mature Male (50+)',
    gender: 'male',
    age: 'old',
    accent: 'en-US',
    tone: 'crisp, mature, authoritative',
  },
};

export const REGIONAL_VOICE_MAP: Record<VoiceRegion, Record<string, string>> = {
  'en-US': {
    // Love On The Rocks cast by Role Title (every character has a distinct voice ID)
    'the ex': 'pNInz6obpgDQGcFmaJgB',
    'the reality tv queen': 'cgSgspJ2msm6clMCkdW9',
    'the star': 'cgSgspJ2msm6clMCkdW9',
    'the bombshell': 'iP95p4xoKVk53GoZ742B',
    'the host': 'iP95p4xoKVk53GoZ742B',
    'the superfan': 'N2lVS1w4EtoT3dr4eOWO',
    'the hair & makeup artist': 'FGY2WhTYpPnrIDTdsKH5',
    'the hair and makeup artist': 'FGY2WhTYpPnrIDTdsKH5',
    'the producer': 'cjVigY5qzO86Huf0OWal',
    'the producer plant': 'cjVigY5qzO86Huf0OWal',
    'the runner-up': 'EXAVITQu4vr4xnSDxMaL',
    'the runner up': 'EXAVITQu4vr4xnSDxMaL',
    'the fan-favourite flameout': 'nPczCjzI2devNBz1zQrb',
    'the fan-favorite flameout': 'nPczCjzI2devNBz1zQrb',
    'the flameout': 'nPczCjzI2devNBz1zQrb',
    'the sister': 'XrExE9yKIg1WjnnlVkGX',

    // Legacy aliases
    dane: 'pNInz6obpgDQGcFmaJgB',       // Adam - dominant / intense ex
    gabby: 'cgSgspJ2msm6clMCkdW9',      // Jessica - glamorous winner
    colt: 'iP95p4xoKVk53GoZ742B',       // Chris - charismatic host
    milo: 'N2lVS1w4EtoT3dr4eOWO',       // Callum - bookish / intense superfan
    rikki: 'FGY2WhTYpPnrIDTdsKH5',      // Laura - sassy / quick glam artist
    jeremy: 'cjVigY5qzO86Huf0OWal',     // Eric - calm / calculating producer
    ava: 'EXAVITQu4vr4xnSDxMaL',        // Sarah - dramatic / polished runner-up
    zayn: 'nPczCjzI2devNBz1zQrb',       // Brian - deep / smooth
    sienna: 'XrExE9yKIg1WjnnlVkGX',     // Matilda - bold sister

    // Dead On Arrival aliases
    blaze: 'pNInz6obpgDQGcFmaJgB',
    skye: 'cgSgspJ2msm6clMCkdW9',
    cole: 'iP95p4xoKVk53GoZ742B',
    rex: 'N2lVS1w4EtoT3dr4eOWO',
    mara: 'FGY2WhTYpPnrIDTdsKH5',
    jordan: 'cjVigY5qzO86Huf0OWal',
    brooke: 'EXAVITQu4vr4xnSDxMaL',
    zane: 'nPczCjzI2devNBz1zQrb',
    nova: 'XrExE9yKIg1WjnnlVkGX',

    // Circus Noir cast
    barnaby: 'nPczCjzI2devNBz1zQrb',
    zara: 'pFZP5JQG7iQjIQuC4Bku',
    silas: 'N2lVS1w4EtoT3dr4eOWO',
    zephyr: 'SAz9YHcvj6GT2YYXdXww',
    jax: 'SOYHLrjzK2X1ezoPC6cr',
    gigi: 'EXAVITQu4vr4xnSDxMaL',
    lucius: 'cjVigY5qzO86Huf0OWal',
    seraphina: 'hpp4J3VqNfWAUOO0d1Us',

    // Generic speaker slots (all distinct)
    'speaker 1': 'XrExE9yKIg1WjnnlVkGX',
    'speaker 2': 'nPczCjzI2devNBz1zQrb',
    'speaker 3': 'cjVigY5qzO86Huf0OWal',
    'speaker 4': 'FGY2WhTYpPnrIDTdsKH5',
    narrator: 'SAz9YHcvj6GT2YYXdXww',
    default_female: 'EXAVITQu4vr4xnSDxMaL',
    default_male: 'iP95p4xoKVk53GoZ742B',
    default_neutral: 'SAz9YHcvj6GT2YYXdXww',
  },
  'en-GB': {
    // Love On The Rocks cast by Role Title (all distinct voices)
    'the ex': 'SOYHLrjzK2X1ezoPC6cr',
    'the reality tv queen': 'pFZP5JQG7iQjIQuC4Bku',
    'the star': 'pFZP5JQG7iQjIQuC4Bku',
    'the bombshell': 'JBFqnCBsd6RMkjVDRZzb',
    'the host': 'JBFqnCBsd6RMkjVDRZzb',
    'the superfan': 'N2lVS1w4EtoT3dr4eOWO',
    'the hair & makeup artist': 'Xb7hH8MSUJpSbSDYk0k2',
    'the hair and makeup artist': 'Xb7hH8MSUJpSbSDYk0k2',
    'the producer': 'onwK4e9ZLuTAKqWW03F9',
    'the producer plant': 'onwK4e9ZLuTAKqWW03F9',
    'the runner-up': 'EXAVITQu4vr4xnSDxMaL',
    'the runner up': 'EXAVITQu4vr4xnSDxMaL',
    'the fan-favourite flameout': 'nPczCjzI2devNBz1zQrb',
    'the fan-favorite flameout': 'nPczCjzI2devNBz1zQrb',
    'the flameout': 'nPczCjzI2devNBz1zQrb',
    'the sister': 'FGY2WhTYpPnrIDTdsKH5',

    // Legacy aliases
    dane: 'SOYHLrjzK2X1ezoPC6cr',       // Harry - tense, volatile ex
    gabby: 'pFZP5JQG7iQjIQuC4Bku',      // Lily - velvety British actress
    colt: 'JBFqnCBsd6RMkjVDRZzb',       // George - warm charismatic British host
    milo: 'N2lVS1w4EtoT3dr4eOWO',       // Callum - husky / intense superfan
    rikki: 'Xb7hH8MSUJpSbSDYk0k2',      // Alice - sharp, perceptive British
    jeremy: 'onwK4e9ZLuTAKqWW03F9',     // Daniel - formal, calculating British producer
    ava: 'EXAVITQu4vr4xnSDxMaL',        // Sarah - posh, dramatic runner-up
    zayn: 'nPczCjzI2devNBz1zQrb',       // Brian - deep, smooth
    sienna: 'FGY2WhTYpPnrIDTdsKH5',     // Laura - bold, sassy sister

    // Dead On Arrival aliases
    blaze: 'SOYHLrjzK2X1ezoPC6cr',
    skye: 'pFZP5JQG7iQjIQuC4Bku',
    cole: 'JBFqnCBsd6RMkjVDRZzb',
    rex: 'N2lVS1w4EtoT3dr4eOWO',
    mara: 'Xb7hH8MSUJpSbSDYk0k2',
    jordan: 'onwK4e9ZLuTAKqWW03F9',
    brooke: 'EXAVITQu4vr4xnSDxMaL',
    zane: 'nPczCjzI2devNBz1zQrb',
    nova: 'FGY2WhTYpPnrIDTdsKH5',

    // Circus Noir cast
    barnaby: 'JBFqnCBsd6RMkjVDRZzb',
    zara: 'pFZP5JQG7iQjIQuC4Bku',
    silas: 'N2lVS1w4EtoT3dr4eOWO',
    zephyr: 'Xb7hH8MSUJpSbSDYk0k2',
    jax: 'SOYHLrjzK2X1ezoPC6cr',
    gigi: 'EXAVITQu4vr4xnSDxMaL',
    lucius: 'onwK4e9ZLuTAKqWW03F9',
    seraphina: 'hpp4J3VqNfWAUOO0d1Us',

    // Generic speaker slots (all distinct)
    'speaker 1': 'pFZP5JQG7iQjIQuC4Bku',
    'speaker 2': 'JBFqnCBsd6RMkjVDRZzb',
    'speaker 3': 'onwK4e9ZLuTAKqWW03F9',
    'speaker 4': 'Xb7hH8MSUJpSbSDYk0k2',
    narrator: 'JBFqnCBsd6RMkjVDRZzb',
    default_female: 'Xb7hH8MSUJpSbSDYk0k2',
    default_male: 'onwK4e9ZLuTAKqWW03F9',
    default_neutral: 'JBFqnCBsd6RMkjVDRZzb',
  },
  'en-AU': {
    // Love On The Rocks cast by Role Title (all distinct voices)
    'the ex': 'IKne3meq5aSn9XLyUdCD',
    'the reality tv queen': 'pFZP5JQG7iQjIQuC4Bku',
    'the star': 'pFZP5JQG7iQjIQuC4Bku',
    'the bombshell': 'TX3LPaxmHKxFdv7VOQHJ',
    'the host': 'TX3LPaxmHKxFdv7VOQHJ',
    'the superfan': 'bIHbv24MWmeRgasZH58o',
    'the hair & makeup artist': 'FGY2WhTYpPnrIDTdsKH5',
    'the hair and makeup artist': 'FGY2WhTYpPnrIDTdsKH5',
    'the producer': 'CwhRBWXzGAHq8TQ4Fs17',
    'the producer plant': 'CwhRBWXzGAHq8TQ4Fs17',
    'the runner-up': 'EXAVITQu4vr4xnSDxMaL',
    'the runner up': 'EXAVITQu4vr4xnSDxMaL',
    'the fan-favourite flameout': 'nPczCjzI2devNBz1zQrb',
    'the fan-favorite flameout': 'nPczCjzI2devNBz1zQrb',
    'the flameout': 'nPczCjzI2devNBz1zQrb',
    'the sister': 'cgSgspJ2msm6clMCkdW9',

    // Legacy aliases
    dane: 'IKne3meq5aSn9XLyUdCD',       // Charlie (AU) - deep, confident Australian
    gabby: 'pFZP5JQG7iQjIQuC4Bku',      // Lily - dramatic lead star
    colt: 'TX3LPaxmHKxFdv7VOQHJ',       // Liam - charismatic host
    milo: 'bIHbv24MWmeRgasZH58o',       // Will - earnest / obsessive superfan
    rikki: 'FGY2WhTYpPnrIDTdsKH5',      // Laura - sassy / quick glam artist
    jeremy: 'CwhRBWXzGAHq8TQ4Fs17',     // Roger - dry, calculating producer
    ava: 'EXAVITQu4vr4xnSDxMaL',        // Sarah - polished / dramatic runner-up
    zayn: 'nPczCjzI2devNBz1zQrb',       // Brian - deep / smooth
    sienna: 'cgSgspJ2msm6clMCkdW9',     // Jessica - bright, bold sister

    // Dead On Arrival aliases
    blaze: 'IKne3meq5aSn9XLyUdCD',
    skye: 'pFZP5JQG7iQjIQuC4Bku',
    cole: 'TX3LPaxmHKxFdv7VOQHJ',
    rex: 'bIHbv24MWmeRgasZH58o',
    mara: 'FGY2WhTYpPnrIDTdsKH5',
    jordan: 'CwhRBWXzGAHq8TQ4Fs17',
    brooke: 'EXAVITQu4vr4xnSDxMaL',
    zane: 'nPczCjzI2devNBz1zQrb',
    nova: 'cgSgspJ2msm6clMCkdW9',

    // Circus Noir cast
    barnaby: 'IKne3meq5aSn9XLyUdCD',
    zara: 'pFZP5JQG7iQjIQuC4Bku',
    silas: 'N2lVS1w4EtoT3dr4eOWO',
    zephyr: 'hpp4J3VqNfWAUOO0d1Us',
    jax: 'SOYHLrjzK2X1ezoPC6cr',
    gigi: 'EXAVITQu4vr4xnSDxMaL',
    lucius: 'CwhRBWXzGAHq8TQ4Fs17',
    seraphina: 'cgSgspJ2msm6clMCkdW9',

    // Generic speaker slots (all distinct)
    'speaker 1': 'pFZP5JQG7iQjIQuC4Bku',
    'speaker 2': 'IKne3meq5aSn9XLyUdCD',
    'speaker 3': 'CwhRBWXzGAHq8TQ4Fs17',
    'speaker 4': 'FGY2WhTYpPnrIDTdsKH5',
    narrator: 'IKne3meq5aSn9XLyUdCD',
    default_female: 'pFZP5JQG7iQjIQuC4Bku',
    default_male: 'IKne3meq5aSn9XLyUdCD',
    default_neutral: 'SAz9YHcvj6GT2YYXdXww',
  },
};

const DISTINCT_FEMALE_VOICE_POOL = [
  'pFZP5JQG7iQjIQuC4Bku', // Lily
  'FGY2WhTYpPnrIDTdsKH5', // Laura
  'EXAVITQu4vr4xnSDxMaL', // Sarah
  'cgSgspJ2msm6clMCkdW9', // Jessica
  'Xb7hH8MSUJpSbSDYk0k2', // Alice (UK)
  'XrExE9yKIg1WjnnlVkGX', // Matilda
  'hpp4J3VqNfWAUOO0d1Us', // Bella
];

const DISTINCT_MALE_VOICE_POOL = [
  'IKne3meq5aSn9XLyUdCD', // Charlie (AU)
  'CwhRBWXzGAHq8TQ4Fs17', // Roger
  'nPczCjzI2devNBz1zQrb', // Brian
  'cjVigY5qzO86Huf0OWal', // Eric
  'N2lVS1w4EtoT3dr4eOWO', // Callum
  'pNInz6obpgDQGcFmaJgB', // Adam
  'iP95p4xoKVk53GoZ742B', // Chris
  'TX3LPaxmHKxFdv7VOQHJ', // Liam
  'bIHbv24MWmeRgasZH58o', // Will
  'JBFqnCBsd6RMkjVDRZzb', // George (UK)
  'onwK4e9ZLuTAKqWW03F9', // Daniel (UK)
  'SOYHLrjzK2X1ezoPC6cr', // Harry
];

const REGIONAL_FEMALE_VOICE_POOLS: Record<VoiceRegion, string[]> = {
  'en-AU': [
    'pFZP5JQG7iQjIQuC4Bku', // Lily
    'FGY2WhTYpPnrIDTdsKH5', // Laura
    'EXAVITQu4vr4xnSDxMaL', // Sarah
    'cgSgspJ2msm6clMCkdW9', // Jessica
    'Xb7hH8MSUJpSbSDYk0k2', // Alice (UK)
    'XrExE9yKIg1WjnnlVkGX', // Matilda
    'hpp4J3VqNfWAUOO0d1Us', // Bella
  ],
  'en-GB': [
    'pFZP5JQG7iQjIQuC4Bku', // Lily (UK)
    'Xb7hH8MSUJpSbSDYk0k2', // Alice (UK)
    'hpp4J3VqNfWAUOO0d1Us', // Bella
    'EXAVITQu4vr4xnSDxMaL', // Sarah
    'FGY2WhTYpPnrIDTdsKH5', // Laura
    'XrExE9yKIg1WjnnlVkGX', // Matilda
    'cgSgspJ2msm6clMCkdW9', // Jessica
  ],
  'en-US': [
    'cgSgspJ2msm6clMCkdW9', // Jessica (US)
    'EXAVITQu4vr4xnSDxMaL', // Sarah (US)
    'FGY2WhTYpPnrIDTdsKH5', // Laura (US)
    'XrExE9yKIg1WjnnlVkGX', // Matilda (US)
    'hpp4J3VqNfWAUOO0d1Us', // Bella (US)
    'pFZP5JQG7iQjIQuC4Bku', // Lily (UK)
    'Xb7hH8MSUJpSbSDYk0k2', // Alice (UK)
  ],
};

const REGIONAL_MALE_VOICE_POOLS: Record<VoiceRegion, string[]> = {
  'en-AU': [
    'IKne3meq5aSn9XLyUdCD', // Charlie (AU)
    'TX3LPaxmHKxFdv7VOQHJ', // Liam
    'CwhRBWXzGAHq8TQ4Fs17', // Roger
    'bIHbv24MWmeRgasZH58o', // Will
    'nPczCjzI2devNBz1zQrb', // Brian
    'cjVigY5qzO86Huf0OWal', // Eric
    'N2lVS1w4EtoT3dr4eOWO', // Callum
    'pNInz6obpgDQGcFmaJgB', // Adam
    'iP95p4xoKVk53GoZ742B', // Chris
    'JBFqnCBsd6RMkjVDRZzb', // George (UK)
    'onwK4e9ZLuTAKqWW03F9', // Daniel (UK)
    'SOYHLrjzK2X1ezoPC6cr', // Harry
  ],
  'en-GB': [
    'JBFqnCBsd6RMkjVDRZzb', // George (UK)
    'onwK4e9ZLuTAKqWW03F9', // Daniel (UK)
    'N2lVS1w4EtoT3dr4eOWO', // Callum (UK)
    'SOYHLrjzK2X1ezoPC6cr', // Harry
    'nPczCjzI2devNBz1zQrb', // Brian
    'CwhRBWXzGAHq8TQ4Fs17', // Roger
    'cjVigY5qzO86Huf0OWal', // Eric
    'IKne3meq5aSn9XLyUdCD', // Charlie (AU)
    'TX3LPaxmHKxFdv7VOQHJ', // Liam
    'pNInz6obpgDQGcFmaJgB', // Adam
    'iP95p4xoKVk53GoZ742B', // Chris
    'bIHbv24MWmeRgasZH58o', // Will
  ],
  'en-US': [
    'iP95p4xoKVk53GoZ742B', // Chris (US)
    'pNInz6obpgDQGcFmaJgB', // Adam (US)
    'cjVigY5qzO86Huf0OWal', // Eric (US)
    'nPczCjzI2devNBz1zQrb', // Brian (US)
    'CwhRBWXzGAHq8TQ4Fs17', // Roger (US)
    'TX3LPaxmHKxFdv7VOQHJ', // Liam (US)
    'bIHbv24MWmeRgasZH58o', // Will (US)
    'SOYHLrjzK2X1ezoPC6cr', // Harry (US)
    'N2lVS1w4EtoT3dr4eOWO', // Callum
    'IKne3meq5aSn9XLyUdCD', // Charlie (AU)
    'JBFqnCBsd6RMkjVDRZzb', // George (UK)
    'onwK4e9ZLuTAKqWW03F9', // Daniel (UK)
  ],
};

function extractAccentParamFromUrl(url?: string | null): string | undefined {
  if (!url || url.startsWith('data:')) return undefined;
  const match = url.match(/[?&]accent=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

export function mapGuestAccentToVoiceRegion(accent?: string | null): {
  region?: VoiceRegion;
  accentLabel?: string;
} {
  if (!accent) return {};
  const lower = accent.trim().toLowerCase();
  if (!lower) return {};

  if (lower.includes('australian') || lower === 'au' || lower === 'en-au' || lower.includes('aussie')) {
    return { region: 'en-AU', accentLabel: 'Australian' };
  }
  if (lower.includes('new zealand') || lower.includes('kiwi') || lower === 'nz') {
    return { region: 'en-AU', accentLabel: 'Kiwi / NZ' };
  }
  if (lower.includes('british') || lower === 'uk' || lower === 'en-gb' || lower.includes('english')) {
    return { region: 'en-GB', accentLabel: 'British' };
  }
  if (lower.includes('irish') || lower.includes('scottish')) {
    return { region: 'en-GB', accentLabel: 'Irish / Scottish' };
  }
  if (lower.includes('european') || lower === 'eu') {
    return { region: 'en-GB', accentLabel: 'European' };
  }
  if (lower.includes('american') || lower === 'us' || lower === 'en-us' || lower.includes('canadian')) {
    return { region: 'en-US', accentLabel: 'American' };
  }

  return { accentLabel: accent.trim() };
}

/**
 * Determines the default VoiceRegion for a mystery based on its explicit setting or theme/title.
 */
export function inferDefaultVoiceRegion(
  mystery?: {
    title?: string | null;
    theme?: string | null;
    description?: string | null;
    voice_region?: string | null;
  } | null
): VoiceRegion {
  if (
    mystery?.voice_region === 'en-US' ||
    mystery?.voice_region === 'en-GB' ||
    mystery?.voice_region === 'en-AU'
  ) {
    return mystery.voice_region;
  }

  const combined = `${mystery?.title || ''} ${mystery?.theme || ''} ${mystery?.description || ''}`.toLowerCase();

  if (
    combined.includes('love on the rocks') ||
    combined.includes('dead on arrival') ||
    combined.includes('reality') ||
    combined.includes('australia') ||
    combined.includes('melbourne')
  ) {
    return 'en-AU';
  }

  if (
    combined.includes('manor') ||
    combined.includes('aristocrat') ||
    combined.includes('british') ||
    combined.includes('london') ||
    combined.includes('circus') ||
    combined.includes('ringmaster')
  ) {
    return 'en-GB';
  }

  return 'en-AU';
}

export function normalizeGuestAge(rawAge?: string | number | null): VoiceAge | undefined {
  if (rawAge === undefined || rawAge === null) return undefined;
  if (typeof rawAge === 'number') {
    if (rawAge < 30) return 'young';
    if (rawAge < 50) return 'middle_aged';
    return 'old';
  }
  const lower = String(rawAge).trim().toLowerCase();
  if (!lower) return undefined;
  if (lower === 'young' || lower.includes('young') || lower.includes('18') || lower.includes('20s')) {
    return 'young';
  }
  if (lower === 'middle_aged' || lower.includes('middle') || lower.includes('adult') || lower.includes('30') || lower.includes('40')) {
    return 'middle_aged';
  }
  if (lower === 'old' || lower.includes('mature') || lower.includes('senior') || lower.includes('50') || lower.includes('60')) {
    return 'old';
  }
  return undefined;
}

/**
 * Normalizes a raw speaker label like "J [{{Jeremy}}]", "{{Mara}}", "RealFan_{{Rex}}", or "Speaker 1"
 * into a clean lookup key ("jeremy", "mara", "rex", "speaker 1"), display name, and the assigned
 * guest's genderHint, ageHint, and accent region.
 */
export function normalizeSpeakerLabel(
  rawSpeaker: string,
  characters?: any[]
): {
  speakerKey: string;
  displaySpeaker: string;
  genderHint?: 'male' | 'female' | 'neutral';
  ageHint?: VoiceAge;
  speakerRegion?: VoiceRegion;
  speakerAccent?: string;
  hasAssignedGuest?: boolean;
} {
  const trimmed = rawSpeaker.replace(/[*_]/g, '').trim();

  // 1. Check if there's an explicit {{CharacterName}} token inside the speaker label (e.g., "J [{{Jeremy}}]" or "{{Mara}}")
  const tokenMatch = trimmed.match(/\{\{([^}]+)\}\}/);
  const bracketMatch = trimmed.match(/^[A-Za-z0-9]{1,3}\s*\[([^\]]+)\]/);
  const extractedName = tokenMatch
    ? tokenMatch[1].trim()
    : bracketMatch
    ? bracketMatch[1].replace(/[\{\}]/g, '').trim()
    : trimmed.replace(/[\[\]\{\}]/g, '').trim();

  const lowerKey = extractedName.toLowerCase();

  // 2. Match against mystery characters (by Role Title, assigned guest name, or legacy base name)
  if (Array.isArray(characters) && characters.length > 0) {
    for (const char of characters) {
      const roleTitle = getCharacterRoleTitle(char);
      const roleLower = roleTitle.toLowerCase();
      const roleShortLower = roleLower.replace(/^the\s+/i, '').trim();
      const charBaseName = (char.name || '').split('|')[0]?.trim() || '';
      const charLower = charBaseName.toLowerCase();
      const profile = (char.profile_data as any) || {};
      const guestName = (
        profile.guest_name ||
        profile.guestName ||
        profile.name ||
        ''
      ).trim();
      const guestLower = guestName.toLowerCase();

      if (
        (roleLower && (lowerKey === roleLower || lowerKey.includes(roleLower))) ||
        (roleShortLower && roleShortLower.length >= 2 && (lowerKey === roleShortLower || lowerKey.includes(roleShortLower))) ||
        (guestLower && (lowerKey === guestLower || lowerKey.includes(guestLower))) ||
        (charLower && (lowerKey === charLower || lowerKey.includes(charLower)))
      ) {
        const effectiveGenderSource =
          profile.gender && profile.gender.toLowerCase() !== 'adaptable'
            ? profile.gender
            : char.gender || profile.gender || '';
        const genderRaw = effectiveGenderSource.toLowerCase();
        const genderHint: 'male' | 'female' | 'neutral' =
          genderRaw === 'female' || genderRaw === 'f' || genderRaw.includes('fem')
            ? 'female'
            : genderRaw === 'male' || genderRaw === 'm' || genderRaw.includes('masc')
            ? 'male'
            : 'neutral';

        const rawGuestAccent =
          profile.accent ||
          profile.avatar_config?.accent ||
          extractAccentFromAvatarUrl(profile.avatar_url) ||
          extractAccentParamFromUrl(profile.avatar_url);
        const { region: speakerRegion, accentLabel: speakerAccent } =
          mapGuestAccentToVoiceRegion(rawGuestAccent);

        const rawGuestAge =
          profile.age ||
          profile.avatar_config?.age ||
          extractAgeFromAvatarUrl(profile.avatar_url);
        const ageHint = normalizeGuestAge(rawGuestAge);

        const hasAssignedGuest = Boolean(profile.guest_id || guestName);
        const displaySpeaker = getCharacterDisplayName(char) || extractedName;

        return {
          speakerKey: roleLower || charLower || lowerKey,
          displaySpeaker,
          genderHint,
          ageHint,
          speakerRegion,
          speakerAccent,
          hasAssignedGuest,
        };
      }
    }
  }

  const hydratedFallback = Array.isArray(characters) && characters.length > 0
    ? hydrateTextWithCharacters(extractedName, characters, 'print')
    : extractedName;

  return {
    speakerKey: lowerKey,
    displaySpeaker: hydratedFallback || 'Narrator',
  };
}

/**
 * Resolves a speaker to the best-matching ElevenLabs voice ID and VoiceProfile by evaluating:
 *   1. The assigned guest's Gender (`male` | `female` | `neutral`)
 *   2. The assigned guest's Age (`young` | `middle_aged` | `old`)
 *   3. The assigned guest's Accent (`en-AU` | `en-GB` | `en-US`)
 * Falls back to `FALLBACK_VOICE_BY_GENDER` / `FALLBACK_VOICE_ID` when a speaker cannot be matched,
 * and guarantees distinct voices (`excludeVoiceIds`) when multiple people speak in the same clip.
 */
export function resolveSpeakerVoice(
  rawSpeaker: string,
  region: VoiceRegion = 'en-AU',
  characters?: any[],
  speakerTurnIndex = 0,
  excludeVoiceIds?: Set<string>
): {
  voiceId: string;
  profile: VoiceProfile;
  speakerKey: string;
  displaySpeaker: string;
} {
  const {
    speakerKey,
    displaySpeaker,
    genderHint,
    ageHint,
    speakerRegion,
    speakerAccent,
    hasAssignedGuest,
  } = normalizeSpeakerLabel(rawSpeaker, characters);

  const effectiveRegion: VoiceRegion = speakerRegion || region || 'en-AU';
  const regionMap =
    REGIONAL_VOICE_MAP[effectiveRegion] || REGIONAL_VOICE_MAP['en-AU'];
  const regionalFemalePool =
    REGIONAL_FEMALE_VOICE_POOLS[effectiveRegion] || DISTINCT_FEMALE_VOICE_POOL;
  const regionalMalePool =
    REGIONAL_MALE_VOICE_POOLS[effectiveRegion] || DISTINCT_MALE_VOICE_POOL;

  // 1. Check character's curated archetype voice in regional map
  let archetypeVoiceId = regionMap[speakerKey];
  if (!archetypeVoiceId) {
    for (const [k, v] of Object.entries(regionMap)) {
      if (k.startsWith('default_') || k.startsWith('speaker ')) continue;
      if (speakerKey.includes(k)) {
        archetypeVoiceId = v;
        break;
      }
    }
  }

  let voiceId = '';

  // 2. If the character has an assigned guest (or explicit gender/age/accent attributes),
  // score all voices in VOICE_PROFILES by (gender + accent + age + archetype affinity)
  if (hasAssignedGuest || ageHint || speakerRegion) {
    const targetGender =
      genderHint ||
      (archetypeVoiceId ? VOICE_PROFILES[archetypeVoiceId]?.gender : undefined) ||
      'neutral';
    const targetAge: VoiceAge =
      ageHint ||
      (archetypeVoiceId ? VOICE_PROFILES[archetypeVoiceId]?.age : undefined) ||
      'young';

    let bestScore = -Infinity;
    let bestVoiceId = '';

    // Deterministic tie-breaker offset based on speaker name + turn index
    let hash = speakerTurnIndex;
    for (let i = 0; i < speakerKey.length; i++) {
      hash = (hash * 31 + speakerKey.charCodeAt(i)) >>> 0;
    }

    const allProfiles = Object.values(VOICE_PROFILES);
    for (let idx = 0; idx < allProfiles.length; idx++) {
      const candidate = allProfiles[(idx + hash) % allProfiles.length];
      if (excludeVoiceIds && excludeVoiceIds.has(candidate.id)) {
        continue;
      }

      let score = 0;

      // A. Gender match (strictest requirement: +100 for match, -100 for mismatch)
      if (targetGender === 'neutral') {
        score += candidate.gender === 'neutral' ? 100 : 25;
      } else if (candidate.gender === targetGender) {
        score += 100;
      } else {
        score -= 100;
      }

      // B. Accent match (+50 for matching guest's accent/effectiveRegion)
      if (candidate.accent === effectiveRegion) {
        score += 50;
      }

      // C. Age match (+35 for exact age bracket match, +10 for adjacent age bracket)
      if (candidate.age === targetAge) {
        score += 35;
      } else if (
        (targetAge === 'young' && candidate.age === 'middle_aged') ||
        (targetAge === 'middle_aged' && candidate.age === 'young')
      ) {
        score += 10;
      }

      // D. Character archetype tie-breaker bonus (+15 if it's the character's signature voice)
      if (archetypeVoiceId && candidate.id === archetypeVoiceId) {
        score += 15;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVoiceId = candidate.id;
      }
    }

    if (bestVoiceId && bestScore > 0) {
      voiceId = bestVoiceId;
    }
  }

  // 3. If no guest-specific override picked a voice yet, use the character's regional archetype voice
  // (provided its gender doesn't conflict with genderHint)
  if (!voiceId && archetypeVoiceId) {
    const archetypeGender = VOICE_PROFILES[archetypeVoiceId]?.gender;
    const genderConflicts =
      (genderHint === 'female' || genderHint === 'male') &&
      archetypeGender &&
      archetypeGender !== genderHint;
    if (!genderConflicts) {
      voiceId = archetypeVoiceId;
    }
  }

  // 4. Fallback Model: If speaker couldn't be matched (or has no character mapping),
  // use the dedicated Fallback Voice Model (`FALLBACK_VOICE_BY_GENDER` / `FALLBACK_VOICE_ID`)
  if (!voiceId) {
    if (genderHint === 'female' || genderHint === 'male') {
      const pool = genderHint === 'female' ? regionalFemalePool : regionalMalePool;
      let hash = speakerTurnIndex;
      for (let i = 0; i < speakerKey.length; i++) {
        hash = (hash * 31 + speakerKey.charCodeAt(i)) >>> 0;
      }
      voiceId =
        pool[hash % pool.length] ||
        FALLBACK_VOICE_BY_GENDER[genderHint] ||
        FALLBACK_VOICE_ID;
    } else {
      voiceId =
        regionMap[speakerKey] ||
        FALLBACK_VOICE_BY_GENDER.neutral ||
        FALLBACK_VOICE_ID;
    }
  }

  // 5. Enforce distinct voices when multiple speakers talk in the same recording
  if (excludeVoiceIds && excludeVoiceIds.has(voiceId)) {
    const preferredGender =
      genderHint && genderHint !== 'neutral'
        ? genderHint
        : VOICE_PROFILES[voiceId]?.gender || 'neutral';
    const genderPool =
      preferredGender === 'female'
        ? [...regionalFemalePool, ...regionalMalePool, FALLBACK_VOICE_ID]
        : preferredGender === 'male'
        ? [...regionalMalePool, ...regionalFemalePool, FALLBACK_VOICE_ID]
        : [
            FALLBACK_VOICE_ID,
            ...regionalFemalePool,
            ...regionalMalePool,
          ];

    const unusedVoice = genderPool.find((candidate) => !excludeVoiceIds.has(candidate));
    if (unusedVoice) {
      voiceId = unusedVoice;
    }
  }

  const baseProfile: VoiceProfile = VOICE_PROFILES[voiceId] ||
    VOICE_PROFILES[FALLBACK_VOICE_ID] || {
      id: voiceId || FALLBACK_VOICE_ID,
      name: 'Fallback Voice',
      gender: genderHint || 'neutral',
      age: ageHint || 'middle_aged',
      accent: effectiveRegion,
      tone: 'natural, balanced',
    };

  const descriptorParts: string[] = [];
  if (speakerAccent) descriptorParts.push(`${speakerAccent} accent`);
  if (ageHint) {
    descriptorParts.push(
      ageHint === 'young'
        ? 'young adult'
        : ageHint === 'old'
        ? 'mature'
        : 'adult'
    );
  }
  descriptorParts.push(baseProfile.tone);

  const profile: VoiceProfile = {
    ...baseProfile,
    tone: descriptorParts.join(' • '),
  };

  return {
    voiceId,
    profile,
    speakerKey,
    displaySpeaker,
  };
}

export interface ParsedDialogueLine {
  index: number;
  timestamp?: string;
  speaker: string;
  rawSpeaker: string;
  speakerKey: string;
  displaySpeaker: string;
  dialogue: string;
  spokenDialogue?: string;
  deliveryTag?: string;
  voiceId: string;
  voiceProfile: VoiceProfile;
}

const METADATA_PREFIX_REGEX =
  /^(?:🎙️|Context:|Source:|Recipient:|Sender:|Speakers:|Recording Duration:|Duration:|Header:|File:|Visual:|Status:|Device:|Time Range:|Actioned by:|Reason:)/i;

const PURE_STAGE_DIRECTION_REGEX =
  /^(?:\*[^*]+\*|\[(?:recording|audio|pause|static|cuts|end)[^\]]*\]|\((?:audio|recording|pause|static|cuts)[^)]*\))$/i;

/**
 * Infers an expressive ElevenLabs v3 acting/delivery tag for a dialogue line so sentences
 * sound dramatic, emotionally inflected, and conversational rather than monotone.
 * Authors can also explicitly write `[angry]`, `[whispers]`, `[sarcastic]`, `[laughs]` at the start of a line.
 */
export function inferLineDeliveryDirection(
  rawText: string,
  cleanedText: string,
  speakerKey: string,
  isMonologue = false
): string {
  const raw = rawText.trim();
  const lower = cleanedText.toLowerCase();

  // 1. Honor explicit author-provided acting tag at start of line, e.g. `[whispering] Tell no one`
  const explicitBracketMatch = raw.match(/^\[([a-zA-Z\s,\-]+)\]\s*/);
  if (
    explicitBracketMatch &&
    !/^(?:recording|audio|pause|static|cuts|end)/i.test(explicitBracketMatch[1].trim())
  ) {
    return `[${explicitBracketMatch[1].trim().toLowerCase()}]`;
  }

  // 2. Stage directions in parentheses in raw transcript
  if (/^\((?:laughs|chuckling|chuckles)\)/i.test(raw)) {
    return '[laughs] [cynical, amused]';
  }
  if (/^\((?:sighs|groans)\)/i.test(raw)) {
    return '[sighs] [exasperated, weary]';
  }
  if (/whisper|hushed|under.*breath|quietly/i.test(raw)) {
    return '[whispers] [hushed, secretive]';
  }

  // 3. Monologue / late-night voice memo confession
  if (
    isMonologue ||
    lower.includes('always watching') ||
    lower.includes('into the shadows') ||
    lower.includes('my love')
  ) {
    return '[hushed, eerie, breathless confession]';
  }

  // 4. Urgent warnings, panic, or time-sensitive cover-ups
  if (
    lower.includes('shut up') ||
    lower.includes('right now') ||
    lower.includes('before anyone') ||
    lower.includes('get to the') ||
    lower.includes('hide') ||
    lower.includes('delete')
  ) {
    return '[urgent, hushed, anxious]';
  }

  // 5. Betrayal, fury, confrontation, or profanity
  if (
    /f\*{2,3}|freaking|hell|jerk|liar|betray|pathetic|ridiculous|disgusting|humiliat|dare you/i.test(
      raw
    ) ||
    cleanedText.endsWith('?!') ||
    (cleanedText.endsWith('!') && lower.includes('you'))
  ) {
    return '[angry, hurt, disbelief]';
  }

  // 6. Shocked realization or gasp
  if (
    /^(?:wait|what|oh my god|no way|hold on|are you serious)/i.test(cleanedText) &&
    (cleanedText.includes('?') || cleanedText.includes('!'))
  ) {
    return '[shocked, hushed disbelief]';
  }

  // 7. Cold, calculating threats or leverage
  if (
    lower.includes('ruined') ||
    lower.includes('destroy') ||
    lower.includes('contract') ||
    lower.includes('ratings') ||
    lower.includes('narrative') ||
    lower.includes('collateral') ||
    lower.includes('career')
  ) {
    return '[cold, calculating, low voice]';
  }

  // 8. Defensive / nervous denial or stammering
  if (
    lower.includes('i swear') ||
    lower.includes("i didn't") ||
    lower.includes('you have to believe') ||
    (cleanedText.includes('...') && !lower.includes('good'))
  ) {
    return '[nervous, defensive, hesitant]';
  }

  // 9. Sarcastic or dry remarks
  if (
    lower.includes('good.') ||
    lower.includes('sure,') ||
    lower.includes('obviously') ||
    lower.includes('adorable') ||
    speakerKey.includes('skeptic') ||
    speakerKey.includes('jeremy')
  ) {
    return '[deadpan, dry]';
  }

  // 10. Pointed questions
  if (cleanedText.endsWith('?')) {
    return '[suspicious, probing]';
  }

  // 11. Exclamations
  if (cleanedText.endsWith('!')) {
    return '[intense, emphatic]';
  }

  // 12. Character archetype defaults so no line is ever flat
  if (speakerKey.includes('producer') || speakerKey.includes('ava')) {
    return '[sharp, commanding, dramatic]';
  }
  if (speakerKey.includes('bombshell') || speakerKey.includes('gabby')) {
    return '[emotional, tense]';
  }
  if (speakerKey.includes('host') || speakerKey.includes('colt')) {
    return '[smooth, dramatic]';
  }

  return '[tense, dramatic]';
}

/**
 * Cleans spoken dialogue text by resolving {{Character}} tokens and removing stage direction brackets.
 */
export function cleanSpokenDialogue(text: string, characters?: any[]): string {
  let cleaned = text.trim();

  // Strip surrounding smart or straight quotes
  cleaned = cleaned.replace(/^[“"']+|[”"']+$/g, '').trim();

  // Strip leading explicit acting tags like `[angry]` or `[whispers]` from the printed display text
  cleaned = cleaned.replace(/^\[[a-zA-Z\s,\-]+\]\s*/, '').trim();

  // Replace inline stage directions like (laughs) or (sighs) with natural cues or strip them
  cleaned = cleaned
    .replace(/^\((?:laughs|chuckling|chuckles)\)\s*/i, '')
    .replace(/^\((?:sighs|groans)\)\s*/i, '')
    .replace(/\((?:laughs|sighs|pause|whispering|whispers|static|cuts off[^)]*)\)/gi, '')
    .replace(/\*pause\*/gi, '...')
    .replace(/\*\*BLEEP\*\*/gi, 'bleep')
    .replace(/f\*{2,3}ing/gi, 'freaking')
    .replace(/f\*{2,3}/gi, 'hell')
    .replace(/a\*{2}hole/gi, 'jerk');

  // Strip surrounding quotes again if stage direction preceded quotes: (laughs) "Then we..."
  cleaned = cleaned.replace(/^[“"']+|[”"']+$/g, '').trim();

  // Replace {{Character}} tokens and any legacy nicknames with display names (assigned friend name or Role Title)
  if (Array.isArray(characters) && characters.length > 0) {
    cleaned = hydrateTextWithCharacters(cleaned, characters, 'print');
  } else {
    cleaned = cleaned.replace(/\{\{([^}]+)\}\}/g, (_, rawName: string) => rawName.trim());
  }

  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Parses an audio clue transcript into ordered speaker lines with resolved, distinct ElevenLabs voices.
 */
export function parseAudioTranscript(
  transcript: string,
  options?: {
    voiceRegion?: VoiceRegion;
    title?: string;
    internalNotes?: string | null;
    characters?: any[];
  }
): ParsedDialogueLine[] {
  const region = options?.voiceRegion || 'en-AU';
  const characters = options?.characters;
  const rawLines = (transcript || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  let inferredMonoSpeaker: string | null = null;
  let inferredFromInternalOnly = false;

  // Scan visible headers/title first, then fall back to internalNotes for single-speaker voice memos (e.g. R4-C1)
  const visiblePool = [options?.title || '', ...rawLines.slice(0, 4)].join(' ');
  const tokenInVisible = visiblePool.match(/\{\{([^}]+)\}\}/);
  if (tokenInVisible) {
    inferredMonoSpeaker = `{{${tokenInVisible[1].trim()}}}`;
  } else {
    for (const known of Object.keys(REGIONAL_VOICE_MAP[region])) {
      if (known.startsWith('default_') || known.startsWith('speaker ')) continue;
      const re = new RegExp(`\\b${known}\\b`, 'i');
      if (re.test(visiblePool)) {
        inferredMonoSpeaker = known;
        break;
      }
    }
  }

  if (!inferredMonoSpeaker && options?.internalNotes) {
    const tokenInNotes = options.internalNotes.match(/\{\{([^}]+)\}\}/);
    if (tokenInNotes) {
      inferredMonoSpeaker = `{{${tokenInNotes[1].trim()}}}`;
      inferredFromInternalOnly = true;
    } else {
      for (const known of Object.keys(REGIONAL_VOICE_MAP[region])) {
        if (known.startsWith('default_') || known.startsWith('speaker ')) continue;
        const re = new RegExp(`\\b${known}\\b`, 'i');
        if (re.test(options.internalNotes)) {
          inferredMonoSpeaker = known;
          inferredFromInternalOnly = true;
          break;
        }
      }
    }
  }

  const parsedLines: ParsedDialogueLine[] = [];
  const unmatchedBodyLines: string[] = [];

  // Track speaker -> assigned voice within this clip so two distinct speakers NEVER share the same voice
  const speakerVoiceAssignment = new Map<
    string,
    { voiceId: string; profile: VoiceProfile; displaySpeaker: string }
  >();
  const usedVoiceIds = new Set<string>();

  for (const line of rawLines) {
    // Skip pure stage directions like *Pause* or [Recording cuts]
    if (PURE_STAGE_DIRECTION_REGEX.test(line)) {
      continue;
    }

    // Match optional [00:08] or [6:01 PM] timestamp, followed by Speaker, colon, and dialogue
    const dialogueMatch = line.match(
      /^(?:\[([^\]]+)\]\s*)?([A-Za-z0-9_.\s\{\}\[\]\-'*]{1,42}?):\s*(.+)$/
    );

    if (dialogueMatch) {
      const timestamp = dialogueMatch[1]?.trim();
      const candidateSpeaker = dialogueMatch[2].trim();
      const rawDialogue = dialogueMatch[3].trim();

      // Skip metadata headers like "Context:", "Source:", "Recording Duration:", etc.
      if (METADATA_PREFIX_REGEX.test(`${candidateSpeaker.replace(/[*_]/g, '')}:`)) {
        continue;
      }

      const cleanedDialogue = cleanSpokenDialogue(rawDialogue, characters);
      if (!cleanedDialogue) continue;

      const { speakerKey } = normalizeSpeakerLabel(candidateSpeaker, characters);
      let assigned = speakerVoiceAssignment.get(speakerKey);

      if (!assigned) {
        const resolved = resolveSpeakerVoice(
          candidateSpeaker,
          region,
          characters,
          speakerVoiceAssignment.size,
          usedVoiceIds
        );
        assigned = {
          voiceId: resolved.voiceId,
          profile: resolved.profile,
          displaySpeaker: resolved.displaySpeaker,
        };
        speakerVoiceAssignment.set(speakerKey, assigned);
        usedVoiceIds.add(resolved.voiceId);
      }

      const deliveryTag = inferLineDeliveryDirection(
        rawDialogue,
        cleanedDialogue,
        speakerKey,
        false
      );

      parsedLines.push({
        index: parsedLines.length,
        timestamp,
        speaker: assigned.displaySpeaker || candidateSpeaker,
        rawSpeaker: candidateSpeaker,
        speakerKey,
        displaySpeaker: assigned.displaySpeaker || candidateSpeaker,
        dialogue: cleanedDialogue,
        spokenDialogue: `${deliveryTag} ${cleanedDialogue}`,
        deliveryTag,
        voiceId: assigned.voiceId,
        voiceProfile: assigned.profile,
      });
      continue;
    }

    // If not a `Key: Value` metadata line, keep track in case this is a single-speaker monologue (like R4-C1)
    if (!METADATA_PREFIX_REGEX.test(line) && !line.startsWith('🎙️')) {
      unmatchedBodyLines.push(line);
    }
  }

  // Fallback for single-speaker voice memos where lines are quoted paragraphs without `Name:` prefixes
  if (parsedLines.length === 0 && unmatchedBodyLines.length > 0) {
    const monoSpeaker = inferredMonoSpeaker || 'Narrator';
    const resolved = resolveSpeakerVoice(monoSpeaker, region, characters, 0);
    const rawMonologue = unmatchedBodyLines.join(' ');
    const combinedMonologue = cleanSpokenDialogue(rawMonologue, characters);
    const publicSpeakerLabel = inferredFromInternalOnly
      ? 'Unknown Voice'
      : resolved.displaySpeaker || monoSpeaker;

    if (combinedMonologue) {
      const deliveryTag = inferLineDeliveryDirection(
        rawMonologue,
        combinedMonologue,
        resolved.speakerKey,
        true
      );
      parsedLines.push({
        index: 0,
        speaker: publicSpeakerLabel,
        rawSpeaker: monoSpeaker,
        speakerKey: resolved.speakerKey,
        displaySpeaker: publicSpeakerLabel,
        dialogue: combinedMonologue,
        spokenDialogue: `${deliveryTag} ${combinedMonologue}`,
        deliveryTag,
        voiceId: resolved.voiceId,
        voiceProfile: resolved.profile,
      });
    }
  }

  return parsedLines;
}
