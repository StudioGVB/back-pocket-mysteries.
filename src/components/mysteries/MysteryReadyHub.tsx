'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import {
  saveCustomerCastAction,
  getGameSessionAction,
  updatePartyEventDetailsAction,
  PartyEventDetails,
} from '@/app/actions/customer-mystery';

export const FOOD_VIBE_OPTIONS = [
  { id: 'full_dinner', label: '🍽️ Full Dinner Provided' },
  { id: 'cocktails_nibbles', label: '🥂 Cocktails & Finger Food / Grazing' },
  { id: 'potluck', label: '🍕 Potluck (Bring a Dish to Share)' },
  { id: 'byob', label: '🍷 BYOB Drinks & Snacks' },
] as const;

export const WHAT_TO_BRING_PRESETS = [
  '📱 Charged phone or device (50%+ battery)',
  '👗 Your character outfit & costume vibe',
  '🍷 BYOB / Your favorite drink',
  '🧀 A plate or nibbles to share',
  '🕶️ 1 fun character prop or accessory',
  '👓 Reading glasses (for fine-print clues!)',
];

export function formatPartyDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }
  return trimmed;
}

export function getFoodVibeDisplay(vibeId?: string): string {
  if (!vibeId) return '';
  const match = FOOD_VIBE_OPTIONS.find(o => o.id === vibeId);
  return match ? match.label : vibeId;
}

export interface ReadyHubCharacter {
  id: string;
  name: string;
  roleTitle: string;
  gender: 'male' | 'female' | 'adaptable';
  is_victim: boolean;
  is_mandatory: boolean;
  cleanBio: string;
  outfitAdvice: string;
  outfitFeminine?: string | null;
  outfitMasculine?: string | null;
  actBullets?: string[];
  characterPhotoUrl?: string | null;
  outfitReferenceImages?: string[];
}

export interface ReadyHubGuest {
  id: string;
  name: string;
  gender: string;
  accent?: string;
  avatar_url?: string;
}

interface MysteryReadyHubProps {
  locale: string;
  mystery: {
    id: string;
    slug: string;
    title: string;
    theme: string | null;
    description: string | null;
    image_url: string | null;
  };
  pin: string;
  characters: ReadyHubCharacter[];
  guests: ReadyHubGuest[];
  assignments: Record<string, string>;
  onEditCast?: () => void;
}

function normalizeGender(g: string | null | undefined): 'male' | 'female' | 'adaptable' {
  const clean = (g || '').toLowerCase().trim();
  if (clean === 'male' || clean === 'masculine' || clean === 'm') return 'male';
  if (clean === 'female' || clean === 'feminine' || clean === 'f') return 'female';
  return 'adaptable';
}

function getThemeVibeKit(theme: string | null, title: string) {
  const combined = `${theme || ''} ${title || ''}`.toLowerCase();

  if (combined.includes('reality') || combined.includes('love') || combined.includes('reunion')) {
    return {
      vibeName: 'Reality TV Reunion Glam',
      playlist: 'Search Spotify: "2000s Pop Icons", "Love Island Pool Party", or " RuPaul / Charli XCX Club Glam"',
      lighting: 'Warm pink/magenta LED accent lighting, ring light in the corner for a "Confessional Booth" photo spot, and dim lounge lamps.',
      signatureDrink: 'The Spicy Bombshell Margarita (Tequila, lime, agave, jalapeño slice & pink sugar rim)',
      mocktail: 'The Rose Ceremony Spritz (Sparkling rosé grape or cranberry fizz, lime, and edible glitter)',
      propTip: 'Set up a "Confessional Chair" in a quiet corner where guests can film 10-second dramatic reactions or listen to voice memos!',
    };
  }

  if (combined.includes('yacht') || combined.includes('sea') || combined.includes('alibi')) {
    return {
      vibeName: 'Superyacht Mediterranean Noir',
      playlist: 'Search Spotify: " Riviera Lounge House", "Monaco Sunset Chill", or "Glass Onion / White Lotus Soundtrack"',
      lighting: 'Candlelight on tables, deep ocean-blue or warm gold low-key lamp lighting.',
      signatureDrink: 'The Red Tide Negroni or Aperol Yacht Spritz',
      mocktail: 'Mediterranean Blood Orange & Rosemary Tonic',
      propTip: 'Serve drinks in coupe or champagne glasses and hand out sunglasses as arrival props.',
    };
  }

  if (combined.includes('manor') || combined.includes('inheritance') || combined.includes('estate')) {
    return {
      vibeName: 'Candlelit Country Manor Mystery',
      playlist: 'Search Spotify: "Dark Academia Classical", "Knives Out Jazz & Strings", or "Rainy Manor Jazz"',
      lighting: 'Warm table lamps, candlesticks, and dimmed overhead lights for a moody drawing-room atmosphere.',
      signatureDrink: 'The Old Money Old Fashioned (Bourbon, bitters, orange peel) or Mulled Spiced Red Wine',
      mocktail: 'Smoked Earl Grey & Blackberry Fizz',
      propTip: 'Place a sealed envelope labeled "LAST WILL & TESTAMENT - DO NOT OPEN" on the mantelpiece as a centerpiece.',
    };
  }

  return {
    vibeName: theme || 'VIP High-Society Mystery',
    playlist: 'Search Spotify: "Speakeasy Cocktail Jazz", "Noir Lounge Beats", or " Bond Villain Cocktail Hour"',
    lighting: 'Dim the main ceiling lights and use warm side lamps or candles to create a moody detective lounge.',
    signatureDrink: 'The Velvet Alibi Espresso Martini or Classic Dirty Martini',
    mocktail: 'Blackberry Ginger Noir Mule with fresh mint',
    propTip: 'Create a quick "Photo Mugshot Wall" by the entrance so guests can snap a photo in their character outfit when they arrive!',
  };
}

const PRE_PARTY_CHECKLIST = [
  {
    id: 'send-char-links',
    phase: '3–7 Days Before',
    title: 'Send each guest their Character Link & Outfit Guide',
    detail: 'Use the "Characters & Guest Links" tab below to copy each friend’s role, blurb, and costume guide.',
  },
  {
    id: 'drop-group-hype',
    phase: '3–7 Days Before',
    title: 'Drop the Group Chat Hype Message',
    detail: 'Post the teaser message in your group chat so everyone commits to their costume vibe.',
  },
  {
    id: 'speaker-check',
    phase: '1 Day Before',
    title: 'Have a Bluetooth speaker ready for Voice Memo clues',
    detail: 'Some rounds include AI voice recordings with your guests’ accents - playing them out loud to the room is a huge crowd moment!',
  },
  {
    id: 'phone-charge',
    phase: '1 Day Before',
    title: 'Remind guests to arrive with charged phones (50%+)',
    detail: 'Everyone views clues and submits their between-round suspect guesses on their phone browser (no app or login needed).',
  },
  {
    id: 'lighting-drinks',
    phase: '30 Mins Before',
    title: 'Dim the lights, start the playlist & prep welcome drinks',
    detail: 'Check the "Party Toolkit" tab for your mystery’s tailored playlist and signature drink.',
  },
  {
    id: 'open-lobby-pin',
    phase: 'When Guests Arrive',
    title: 'Display the 6-Digit Game PIN (or QR Poster) & mingle in Round 0 Lobby',
    detail: 'Keep the game in Lobby (Round 0) while everyone arrives, grabs a drink, and claims their character. Tap "Start Round 1" once everyone is settled!',
  },
];

export function MysteryReadyHub({
  locale,
  mystery,
  pin,
  characters,
  guests,
  assignments,
  onEditCast,
}: MysteryReadyHubProps) {
  const [activeTab, setActiveTab] = useState<'characters' | 'howtoplay' | 'setup' | 'toolkit'>('characters');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentCharIds, setSentCharIds] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);

  // Party Event Details & Custom "What to Bring" Checklist State
  const [partyDate, setPartyDate] = useState<string>('');
  const [arrivalTime, setArrivalTime] = useState<string>('7:00 PM');
  const [gameStartTime, setGameStartTime] = useState<string>('7:30 PM');
  const [location, setLocation] = useState<string>('');
  const [hostNotes, setHostNotes] = useState<string>('');
  const [foodAndDrinkVibe, setFoodAndDrinkVibe] = useState<string>('cocktails_nibbles');
  const [whatToBringItems, setWhatToBringItems] = useState<string[]>([
    '📱 Charged phone or device (50%+ battery)',
    '👗 Your character outfit & costume vibe',
  ]);
  const [customBringInput, setCustomBringInput] = useState<string>('');
  const [isSavingPartyDetails, setIsSavingPartyDetails] = useState<boolean>(false);
  const [partyDetailsSavedNotice, setPartyDetailsSavedNotice] = useState<boolean>(false);
  const [prepConfirmedCharacters, setPrepConfirmedCharacters] = useState<
    Record<string, { confirmedAt: string; guestName?: string }>
  >({});

  const hasSyncedCastRef = useRef(false);
  const hasLoadedPartyDetailsRef = useRef(false);

  // Load persisted host checklist, sent invite statuses & cached party details from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedSent = window.localStorage.getItem(`bpm_sent_invites_${mystery.id}`);
      if (savedSent) setSentCharIds(JSON.parse(savedSent));
      const savedChecks = window.localStorage.getItem(`bpm_host_checklist_${mystery.id}`);
      if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
      const savedParty = window.localStorage.getItem(`bpm_party_details_${mystery.id}`);
      if (savedParty) {
        const parsed = JSON.parse(savedParty) as PartyEventDetails;
        if (parsed.partyDate) setPartyDate(parsed.partyDate);
        if (parsed.arrivalTime) setArrivalTime(parsed.arrivalTime);
        if (parsed.gameStartTime) setGameStartTime(parsed.gameStartTime);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.hostNotes) setHostNotes(parsed.hostNotes);
        if (parsed.foodAndDrinkVibe) setFoodAndDrinkVibe(parsed.foodAndDrinkVibe);
        if (Array.isArray(parsed.whatToBringItems) && parsed.whatToBringItems.length > 0) {
          setWhatToBringItems(parsed.whatToBringItems);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, [mystery.id]);

  // Fetch and poll server session for partyDetails and live guest "I've Read My Role" confirmations
  useEffect(() => {
    let active = true;
    const syncFromServer = async () => {
      try {
        const res = await getGameSessionAction(mystery.id);
        if (!active || 'error' in res) return;
        if (res.prepConfirmedCharacters) {
          setPrepConfirmedCharacters(res.prepConfirmedCharacters);
        }
        if (!hasLoadedPartyDetailsRef.current && res.partyDetails) {
          hasLoadedPartyDetailsRef.current = true;
          const pd = res.partyDetails;
          if (pd.partyDate) setPartyDate(pd.partyDate);
          if (pd.arrivalTime) setArrivalTime(pd.arrivalTime);
          if (pd.gameStartTime) setGameStartTime(pd.gameStartTime);
          if (pd.location) setLocation(pd.location);
          if (pd.hostNotes) setHostNotes(pd.hostNotes);
          if (pd.foodAndDrinkVibe) setFoodAndDrinkVibe(pd.foodAndDrinkVibe);
          if (Array.isArray(pd.whatToBringItems) && pd.whatToBringItems.length > 0) {
            setWhatToBringItems(pd.whatToBringItems);
          }
        }
      } catch {
        // ignore
      }
    };
    void syncFromServer();
    const timer = setInterval(syncFromServer, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [mystery.id]);

  const handleSavePartyDetails = async (overrideItems?: string[], overrideVibe?: string) => {
    const itemsToSave = overrideItems ?? whatToBringItems;
    const vibeToSave = overrideVibe ?? foodAndDrinkVibe;
    const payload: PartyEventDetails = {
      partyDate: partyDate.trim(),
      arrivalTime: arrivalTime.trim(),
      gameStartTime: gameStartTime.trim(),
      location: location.trim(),
      hostNotes: hostNotes.trim(),
      foodAndDrinkVibe: vibeToSave,
      whatToBringItems: itemsToSave,
    };
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`bpm_party_details_${mystery.id}`, JSON.stringify(payload));
      } catch {
        // ignore
      }
    }
    setIsSavingPartyDetails(true);
    try {
      await updatePartyEventDetailsAction(mystery.id, payload);
      setPartyDetailsSavedNotice(true);
      setTimeout(() => setPartyDetailsSavedNotice(false), 3200);
    } finally {
      setIsSavingPartyDetails(false);
    }
  };

  const toggleBringPreset = (preset: string) => {
    const exists = whatToBringItems.includes(preset);
    const next = exists
      ? whatToBringItems.filter(i => i !== preset)
      : [...whatToBringItems, preset];
    setWhatToBringItems(next);
    void handleSavePartyDetails(next);
  };

  const handleAddCustomBringItem = () => {
    const clean = customBringInput.trim();
    if (!clean) return;
    if (!whatToBringItems.includes(clean)) {
      const next = [...whatToBringItems, clean];
      setWhatToBringItems(next);
      setCustomBringInput('');
      void handleSavePartyDetails(next);
    } else {
      setCustomBringInput('');
    }
  };

  const handleRemoveBringItem = (item: string) => {
    const next = whatToBringItems.filter(i => i !== item);
    setWhatToBringItems(next);
    void handleSavePartyDetails(next);
  };

  // Automatically sync the active cast assignments to the cross-container Supabase carrier
  // so that guest links (/play/[id]?select=1) always display the exact guest names and AI character portraits
  useEffect(() => {
    if (hasSyncedCastRef.current || !mystery?.id || !characters?.length) return;
    const assignedPayload = characters.map((c) => {
      const gId = assignments[c.id];
      const guestObj = guests.find((g) => g.id === gId) || null;
      return {
        characterId: c.id,
        guest: guestObj,
      };
    });
    if (assignedPayload.some((p) => Boolean(p.guest?.name))) {
      hasSyncedCastRef.current = true;
      void saveCustomerCastAction(
        mystery.id,
        assignedPayload,
        characters.map((c) => c.id)
      );
    }
  }, [mystery.id, characters, guests, assignments]);

  const toggleSentChar = useCallback(
    (charId: string, forceTrue = false) => {
      setSentCharIds(prev => {
        const exists = prev.includes(charId);
        const next = forceTrue
          ? exists
            ? prev
            : [...prev, charId]
          : exists
          ? prev.filter(id => id !== charId)
          : [...prev, charId];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`bpm_sent_invites_${mystery.id}`, JSON.stringify(next));
        }
        return next;
      });
    },
    [mystery.id]
  );

  const toggleChecklistItem = useCallback(
    (itemId: string) => {
      setCheckedItems(prev => {
        const next = prev.includes(itemId)
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`bpm_host_checklist_${mystery.id}`, JSON.stringify(next));
        }
        return next;
      });
    },
    [mystery.id]
  );

  const copyToClipboard = async (text: string, id: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Fallback copy');
      }
    } catch {
      if (typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch {
          // ignore
        }
        document.body.removeChild(textArea);
      }
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2400);
  };

  const getOrigin = () =>
    typeof window !== 'undefined' ? window.location.origin : '';

  const prepDirectoryUrl = `${getOrigin()}/${locale}/play/${mystery.id}?prep=1`;
  const lobbyUrl = `${getOrigin()}/${locale}/play/${mystery.id}?select=1`;
  const hostLobbyUrl = `/${locale}/play/${mystery.id}`;
  const formattedPin = `${pin.slice(0, 3)} ${pin.slice(3)}`;
  const vibeKit = getThemeVibeKit(mystery.theme, mystery.title);

  const markAllSent = () => {
    const allIds = characters.map(c => c.id);
    setSentCharIds(allIds);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`bpm_sent_invites_${mystery.id}`, JSON.stringify(allIds));
      }
    } catch {
      // ignore
    }
  };

  const buildPartyEventSummaryBlock = () => {
    const lines: string[] = [];
    const formattedDate = formatPartyDateDisplay(partyDate);
    if (formattedDate || arrivalTime) {
      const timePart = arrivalTime
        ? ` • Arrive at ${arrivalTime}${gameStartTime ? ` (Mystery starts ${gameStartTime})` : ''}`
        : '';
      lines.push(`📅 When: ${formattedDate || 'Party Night'}${timePart}`);
    }
    if (location.trim()) {
      lines.push(`📍 Where: ${location.trim()}`);
    }
    if (foodAndDrinkVibe) {
      lines.push(`🍽️ Food & Drinks: ${getFoodVibeDisplay(foodAndDrinkVibe)}`);
    }
    if (hostNotes.trim()) {
      lines.push(`📝 Host Note: ${hostNotes.trim()}`);
    }
    if (whatToBringItems.length > 0) {
      lines.push(`🎒 What to Bring:\n${whatToBringItems.map(i => `  • ${i}`).join('\n')}`);
    }
    return lines.length > 0 ? `\n${lines.join('\n')}\n` : '';
  };

  const buildGroupChatSelectInvite = () => {
    const url = `${getOrigin()}/${locale}/play/${mystery.id}?prep=1`;
    const partyBlock = buildPartyEventSummaryBlock();
    return `🕵️‍♀️ You're invited to our Murder Mystery party: "${mystery.title}"!${partyBlock}\n👗 Tap the Pre-Party "First Glance" link below, find your name, and open your character sheet to see Who You Are, Your 3 Outfit Reference Photos, and What to Bring (no login needed, and zero game-night spoilers!):\n${url}`;
  };

  const sentCount = characters.filter(c => sentCharIds.includes(c.id)).length;
  const confirmedReadyCount = characters.filter(c => Boolean(prepConfirmedCharacters[c.id])).length;
  const completedChecksCount = checkedItems.length;

  return (
    <div className="space-y-8">
      {/* 1. TOP HERO COMMAND CENTER */}
      <div className="bg-[#070b13] text-white rounded-[2.5rem] p-6 sm:p-10 shadow-2xl border border-brand-pink/30 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-pink/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ✓ Mystery Ready for Party Night
              </span>
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                🛡️ 100% QA-Tested Before Delivery
              </span>
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink/20 text-brand-pink border border-brand-pink/30">
                🔒 100% Spoiler-Free Host Hub
              </span>
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-slate-200 border border-white/10">
                🔓 Zero Login Required for Guests
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {mystery.title} - Pre-Party Host Hub
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              <strong>Two Separate Guest Portals:</strong> Enter your party date, arrival time &amp; &ldquo;What to Bring&rdquo; checklist below, then send your friends the <strong>📩 Pre-Party &ldquo;First Glance&rdquo; Sheet</strong> days before the event. On party night, launch the <strong>🕹️ &ldquo;Playing Now&rdquo; Live Game Portal</strong>!
            </p>

            {/* Quick Progress Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>🎭 Character Invites Sent:</span>
                <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black">
                  {sentCount} / {characters.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>✋ Guests Confirmed Ready:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black">
                  {confirmedReadyCount} / {characters.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('setup')}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>🛠️ Set-Up Checklist:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                  {completedChecksCount} / {PRE_PARTY_CHECKLIST.length}
                </span>
              </button>
            </div>
          </div>

          {/* Right: 6-Digit Kahoot PIN + QR Sign Button */}
          <div className="bg-white/5 border border-white/15 rounded-3xl p-6 text-center shrink-0 space-y-3 min-w-[260px]">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink">
              Party Night Game PIN
            </p>
            <div className="text-4xl sm:text-5xl font-black tracking-[0.18em] text-white font-mono">
              {formattedPin}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              On party night, guests join at{' '}
              <Link
                href={`/${locale}/play`}
                target="_blank"
                className="text-brand-pink underline font-bold"
              >
                /{locale}/play
              </Link>
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => copyToClipboard(pin, 'hero-pin')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-brand-pink text-[10px] font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
              >
                {copiedId === 'hero-pin' ? '✓ PIN Copied' : '📋 Copy PIN'}
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer"
              >
                📺 TV / QR Sign
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Action Bar in Hero: Clearly Split Pre-Party First Glance vs. Party Night Playing Now */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                copyToClipboard(buildGroupChatSelectInvite(), 'hero-group-invite');
                markAllSent();
              }}
              className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                copiedId === 'hero-group-invite'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/10 hover:bg-white/15 border border-white/15 text-white'
              }`}
            >
              {copiedId === 'hero-group-invite'
                ? '✓ Pre-Party First Glance Copied!'
                : '📩 1. Copy Pre-Party "First Glance" Invite (Send Days Ahead)'}
            </button>

            <Link
              href={`/${locale}/play/${mystery.id}?prep=1`}
              target="_blank"
              className="w-full sm:w-auto px-4 py-3.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-xs font-black uppercase tracking-wider text-center transition-colors"
            >
              👗 Preview First Glance Portal ↗
            </Link>
          </div>

          <Link
            href={hostLobbyUrl}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-black uppercase tracking-widest text-center transition-all shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
              boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
            }}
          >
            🕹️ 2. Party Night: Launch &ldquo;Playing Now&rdquo; Portal →
          </Link>
        </div>
      </div>

      {/* 2. NAVIGATION PILLS FOR THE 4 PRE-PARTY SECTIONS (Full Width 4-Column Grid, Zero Truncation) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-2 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          {
            id: 'characters' as const,
            label: '🎭 1. Cast & Invites',
            badge: `${sentCount}/${characters.length} Sent`,
          },
          {
            id: 'howtoplay' as const,
            label: '🕹️ 2. How to Play',
            badge: 'Run-Through',
          },
          {
            id: 'setup' as const,
            label: '🛠️ 3. Host Checklist',
            badge: `${completedChecksCount}/${PRE_PARTY_CHECKLIST.length} Done`,
          },
          {
            id: 'toolkit' as const,
            label: '✨ 4. Party Toolkit',
            badge: 'Extras',
          },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                  isActive
                    ? 'bg-brand-pink text-white'
                    : 'bg-slate-200/80 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: EACH CHARACTER (OUTLINE, OUTFIT, VIBE & SEND GUEST LINK)
         ===================================================================== */}
      {activeTab === 'characters' && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                Step 1 Before Party Night • Pre-Party &ldquo;First Glance&rdquo; Sheets (Round 1 Locked)
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Party Details, &ldquo;What to Bring&rdquo; Checklist &amp; Guest Invites
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl">
                Fill in your <strong>Party Date, Arrival Time, Location &amp; &ldquo;What to Bring&rdquo; Checklist</strong> below. It renders automatically on every guest&apos;s <strong>Pre-Party First Glance Sheet</strong> and inside your copy-and-paste invite messages!
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-right">
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                  Invites Sent
                </span>
                <span className="text-sm font-black text-slate-900">
                  {sentCount} / {characters.length}
                </span>
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right">
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-700">
                  ✋ Confirmed Ready
                </span>
                <span className="text-sm font-black text-emerald-900">
                  {confirmedReadyCount} / {characters.length}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================
              STEP 1A: PARTY DATE, TIME, LOCATION, FOOD VIBE & WHAT TO BRING BUILDER
             ================================================================== */}
          <div className="rounded-3xl border-2 border-brand-pink/25 bg-gradient-to-br from-slate-50 via-white to-pink-50/25 p-5 sm:p-7 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                    📅 Step 1A • Party Details &amp; Checklist
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                    ⚡ Renders Live on Guest Character Sheets
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 mt-1.5">
                  When &amp; Where to Arrive + Your Custom &ldquo;What to Bring&rdquo; Checklist
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {partyDetailsSavedNotice && (
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                    ✓ Synced to All Guest Sheets!
                  </span>
                )}
                <button
                  type="button"
                  disabled={isSavingPartyDetails}
                  onClick={() => void handleSavePartyDetails()}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  {isSavingPartyDetails ? 'Saving...' : '💾 Save Party Details'}
                </button>
              </div>
            </div>

            {/* Row 1: Date, Arrival Time, Mystery Kickoff Time, Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  📅 Party Date
                </label>
                <input
                  type="date"
                  value={partyDate}
                  onChange={e => setPartyDate(e.target.value)}
                  onBlur={() => void handleSavePartyDetails()}
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 outline-none focus:border-brand-pink"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  🥂 Arrival Time (Drinks &amp; Mingle)
                </label>
                <input
                  type="text"
                  value={arrivalTime}
                  onChange={e => setArrivalTime(e.target.value)}
                  onBlur={() => void handleSavePartyDetails()}
                  placeholder="e.g. 7:00 PM"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-pink"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  🔪 Mystery Round 1 Starts At
                </label>
                <input
                  type="text"
                  value={gameStartTime}
                  onChange={e => setGameStartTime(e.target.value)}
                  onBlur={() => void handleSavePartyDetails()}
                  placeholder="e.g. 7:30 PM (Don't be late!)"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-pink"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  📍 Location / Address
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  onBlur={() => void handleSavePartyDetails()}
                  placeholder="e.g. 42 Oxford St (Buzzer #4)"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            {/* Row 2: Food & Drink Vibe Selector + Host Note */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  🍽️ Food &amp; Drink Vibe (So Guests Know Whether to Eat Dinner First!)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {FOOD_VIBE_OPTIONS.map(opt => {
                    const isSelected = foodAndDrinkVibe === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setFoodAndDrinkVibe(opt.id);
                          void handleSavePartyDetails(undefined, opt.id);
                        }}
                        className={`px-3.5 py-2.5 rounded-xl text-xs font-black text-left border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <span className="text-brand-pink font-black">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-600">
                  📝 Optional Host Note / Parking or Entry Tip
                </label>
                <input
                  type="text"
                  value={hostNotes}
                  onChange={e => setHostNotes(e.target.value)}
                  onBlur={() => void handleSavePartyDetails()}
                  placeholder="e.g. Enter through the garden gate, welcome cocktails on arrival!"
                  className="w-full min-h-[42px] rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-pink"
                />
              </div>
            </div>

            {/* Row 3: Custom "What to Bring" Checklist Builder */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                    🎒 Interactive Guest &ldquo;What to Bring&rdquo; Checklist ({whatToBringItems.length}{' '}
                    {whatToBringItems.length === 1 ? 'Item' : 'Items'})
                  </span>
                  <p className="text-xs text-slate-500 font-medium">
                    Tap the presets below to toggle items on/off, or type any custom item for your guests to check off on their Character Sheet:
                  </p>
                </div>
              </div>

              {/* 1-Tap Preset Toggle Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {WHAT_TO_BRING_PRESETS.map(preset => {
                  const isAdded = whatToBringItems.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => toggleBringPreset(preset)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-black border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {isAdded ? `✓ ${preset}` : `+ ${preset}`}
                    </button>
                  );
                })}
              </div>

              {/* Current Checklist Items (with Remove X for any item) */}
              {whatToBringItems.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {whatToBringItems.map((item, idx) => (
                    <div
                      key={`${item}-${idx}`}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs font-bold text-slate-800"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-4 h-4 rounded bg-brand-pink/15 text-brand-pink text-[10px] font-black flex items-center justify-center shrink-0">
                          ✓
                        </span>
                        <span className="truncate">{item}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBringItem(item)}
                        className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0 cursor-pointer"
                        title="Remove from checklist"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Custom Item Input */}
              <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customBringInput}
                  onChange={e => setCustomBringInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomBringItem();
                    }
                  }}
                  placeholder="Add a custom item (e.g. Wrapped $15 Kris Kringle gift, Towel for hot tub...)"
                  className="flex-grow min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 focus:bg-white px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-brand-pink"
                />
                <button
                  type="button"
                  onClick={handleAddCustomBringItem}
                  className="min-h-[40px] px-4 py-2 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
                >
                  + Add Item
                </button>
              </div>
            </div>
          </div>

          {/* 1-CLICK GENERIC GROUP CHAT PRE-PARTY "FIRST GLANCE" LINK CARD */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-brand-pink/35 shadow-xl space-y-5">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                  📩 Send Days Before Party • Group Chat &ldquo;First Glance&rdquo; Link
                </span>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🔒 Round 1 Clues &amp; Live Game Locked
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Send One Pre-Party &ldquo;First Glance&rdquo; Link to the Group Chat (Party Details, Outfit &amp; What to Bring)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-3xl">
                Drop this single invite into your group chat before the party! It includes your <strong>Party Date, Arrival Time, Location &amp; What to Bring checklist</strong> and opens the <strong>Pre-Party First Glance Directory</strong> where each friend taps their name to see their <strong>Character Outline</strong> and <strong>3 Outfit Reference Photos</strong> - without opening the live Round 1 game portal early.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(buildGroupChatSelectInvite(), 'group-select-msg');
                  markAllSent();
                }}
                className={`px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                  copiedId === 'group-select-msg'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-brand-pink hover:opacity-95 text-white'
                }`}
              >
                {copiedId === 'group-select-msg'
                  ? '✓ Pre-Party Group Invite Copied!'
                  : '💬 Copy Pre-Party Group Chat Invite'}
              </button>

              <Link
                href={`/${locale}/play/${mystery.id}?prep=1`}
                target="_blank"
                className="px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                👗 Preview Pre-Party &ldquo;First Glance&rdquo; Page ↗
              </Link>
            </div>
          </div>

          {/* EXTRA GUEST PLAYERS / PLUS-ONES ("DETECTIVE [NAME]") BANNER */}
          <div className="p-5 sm:p-6 rounded-3xl bg-sky-50/70 border border-sky-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-sky-700 block">
                🕵️ Have More Than {characters.length} Guests Coming on Party Night (or Last-Minute Plus-Ones)?
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                No need to edit your cast! On party night, extra friends can scan your <strong>Party Night QR Code</strong> (or enter the 6-digit PIN) and tap <strong className="text-sky-700">&ldquo;Join as Detective [Your Name]&rdquo;</strong> at the bottom of the Live Game Lobby to get an official Detective Briefing, live clues, and round voting!
              </p>
            </div>
            <Link
              href={`/${locale}/play/${mystery.id}?select=1`}
              target="_blank"
              className="px-5 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-widest transition-colors shrink-0 text-center"
            >
              🕵️ Preview Party-Night Live Lobby ↗
            </Link>
          </div>

          {/* SOLO / DUO DETECTIVE CASE-FILE MODE BANNER */}
          <div className="p-5 sm:p-6 rounded-3xl bg-pink-50/50 border border-brand-pink/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                📁 Solving Solo or as a Duo (Case-File Detective Mode)?
              </span>
              <p className="text-xs sm:text-sm font-bold text-slate-900">
                No need to send individual character links! Open the <strong>All-Suspects Selection Hub</strong> and switch between any of the {characters.length} suspect dossiers as you unlock Rounds 1–3 in the Live Playroom.
              </p>
            </div>
            <Link
              href={`/${locale}/play/${mystery.id}?select=1`}
              target="_blank"
              className="px-5 py-3 rounded-2xl bg-slate-900 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest transition-colors shrink-0 text-center"
            >
              📁 Open Master Case File ({characters.length} Suspects) ↗
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {characters.map(char => {
              const guestId = assignments[char.id] || '';
              const guest = guests.find(g => g.id === guestId);
              const guestGender = guest ? normalizeGender(guest.gender) : 'adaptable';
              const outfitText =
                guestGender === 'female' && char.outfitFeminine
                  ? char.outfitFeminine
                  : guestGender === 'male' && char.outfitMasculine
                  ? char.outfitMasculine
                  : char.outfitAdvice;

              const isSent = sentCharIds.includes(char.id);
              const isConfirmedReady = Boolean(prepConfirmedCharacters[char.id]);
              const copyInviteKey = `invite-msg-${char.id}`;
              const guestAvatar = resolveDisplayAvatarUrl(char.characterPhotoUrl || guest?.avatar_url || undefined);

              const buildCharacterUrl = () =>
                `${getOrigin()}/${locale}/play/${mystery.id}?char=${char.id}&prep=1`;

              const buildInviteText = () => {
                const url = buildCharacterUrl();
                const vibeLine =
                  char.actBullets && char.actBullets.length > 0
                    ? `\n🎭 How to Play Them: ${char.actBullets.join(' • ')}`
                    : '';
                const partyBlock = buildPartyEventSummaryBlock();
                return `🕵️‍♀️ ${guest ? `Hey ${guest.name}! ` : ''}You're cast in our Murder Mystery party: "${mystery.title}"!${partyBlock}\n🎭 Your Role: ${char.roleTitle}\n📖 First Glance: ${char.cleanBio}${vibeLine}\n👗 What to Wear: ${outfitText}\n\n🔗 Tap to open your Pre-Party "First Glance" Character & Outfit Sheet (no login needed, zero game-night spoilers):\n${url}`;
              };

              return (
                <div
                  key={char.id}
                  className={`rounded-3xl border overflow-hidden flex flex-col justify-between transition-all ${
                    isSent || isConfirmedReady
                      ? 'bg-emerald-50/20 border-emerald-200'
                      : char.is_victim
                      ? 'bg-pink-50/25 border-pink-200'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  {/* Large Full-Width Character / Guest Portrait Header */}
                  <div className="relative w-full aspect-[4/5] sm:aspect-auto sm:h-96 bg-slate-900 overflow-hidden border-b border-slate-200">
                    {guestAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={guestAvatar}
                        alt={guest?.name || char.roleTitle}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl bg-slate-900 text-white">
                        {char.is_victim ? '💀' : '🕵️'}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent pointer-events-none" />

                    {/* Top Overlay Badges */}
                    <div className="absolute top-3.5 sm:top-4 inset-x-3.5 sm:inset-x-4 flex items-center justify-between gap-2 z-10">
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        <span
                          className={`px-2.5 sm:px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-md shrink-0 ${
                            char.is_victim
                              ? 'bg-brand-pink text-white'
                              : 'bg-slate-900/90 text-white border border-white/15 backdrop-blur-md'
                          }`}
                        >
                          {char.is_victim ? '💀 The Victim' : '🕵️ Suspect'}
                        </span>
                        {guest ? (
                          <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-md truncate max-w-[140px] sm:max-w-[200px]">
                            👤 {guest.name}
                          </span>
                        ) : (
                          <span className="px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-slate-950 shadow-md">
                            Unassigned
                          </span>
                        )}
                        {isConfirmedReady && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 shadow-md">
                            ✋ Guest Ready ✓
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSentChar(char.id)}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 cursor-pointer shadow-md backdrop-blur-md ${
                          isSent
                            ? 'bg-emerald-500 text-white border-emerald-400'
                            : 'bg-black/75 text-white border-white/20 hover:bg-brand-pink'
                        }`}
                      >
                        {isSent ? '✓ Sent' : 'Mark Sent'}
                      </button>
                    </div>

                    {/* Bottom Role Title on Portrait */}
                    <div className="absolute bottom-3.5 inset-x-4 sm:inset-x-5 z-10">
                      <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                        {char.roleTitle}
                      </h3>
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 space-y-4 flex-grow flex flex-col justify-between">
                    <div className="space-y-4">

                    {/* 1. Character Outline / Blurb */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-brand-pink">
                        📖 Character Outline
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {char.cleanBio}
                      </p>
                    </div>

                    {/* 2. Outfit & Dress Code */}
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-2.5">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600">
                        👗 Outfit &amp; Dress Code
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {outfitText}
                      </p>
                      {char.outfitReferenceImages && char.outfitReferenceImages.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 pt-1">
                          {char.outfitReferenceImages.slice(0, 3).map((refUrl, optIdx) => (
                            <div
                              key={optIdx}
                              className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col"
                            >
                              <div className="aspect-[3/4] w-full overflow-hidden bg-slate-100">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={refUrl}
                                  alt={`${char.roleTitle} Outfit Option ${optIdx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="py-1 text-center text-[8px] font-black uppercase tracking-widest text-slate-500 bg-white border-t border-slate-100">
                                Option {optIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 3. Vibe & How to Act */}
                    {char.actBullets && char.actBullets.length > 0 && (
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1.5">
                        <span className="block text-[9px] font-black uppercase tracking-widest text-purple-600">
                          🎭 Vibe &amp; How to Act
                        </span>
                        <ul className="space-y-1">
                          {char.actBullets.map((b, i) => (
                            <li
                              key={i}
                              className="text-xs text-slate-600 font-medium flex items-start gap-1.5 leading-snug"
                            >
                              <span className="text-brand-pink font-black">•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* 4. What to Bring (Live Synced with Host's Custom Checklist) */}
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1.5">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-sky-700">
                        🎒 What to Bring Checklist (Shown on Guest Sheet)
                      </span>
                      <ul className="space-y-1">
                        {whatToBringItems.map((item, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-slate-700 font-medium flex items-start gap-1.5 leading-snug"
                          >
                            <span className="text-sky-600 font-black">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Footer: Single Copy Invite Text Button + Preview Dossier */}
                  <div className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(buildInviteText(), copyInviteKey);
                        toggleSentChar(char.id, true);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                        copiedId === copyInviteKey
                          ? 'bg-emerald-500 text-white'
                          : 'bg-brand-pink hover:opacity-95 text-white'
                      }`}
                    >
                      {copiedId === copyInviteKey
                        ? '✓ Invite Text Copied!'
                        : `💬 Copy Text for ${guest ? guest.name.split(' ')[0] : char.roleTitle}`}
                    </button>

                    <Link
                      href={`/${locale}/play/${mystery.id}?char=${char.id}&prep=1`}
                      target="_blank"
                      className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      👗 Preview First Glance ↗
                    </Link>
                  </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: HOW TO PLAY RUN-THROUGH (ROUND-BY-ROUND FLOW & FAQ)
         ===================================================================== */}
      {activeTab === 'howtoplay' && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
              Zero-Stress Host Guide • ~2 to 2.5 Hours Total
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              How to Play: Your Party Night Run-Through
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl">
              You don&apos;t need to memorize rules or act as a game master on the sidelines. Your phone has a single <strong>&ldquo;Next →&rdquo;</strong> button in the top bar that paces the entire night while you play alongside your friends!
            </p>
          </div>

          {/* 4-Stage Visual Run-Through */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                step: 'Stage 1 • Arrival (15–20 Mins)',
                title: '🥂 The Pre-Game Lobby & Mingling',
                badge: 'Round 0 (Lobby)',
                points: [
                  'Guests arrive in their character outfits and grab a drink.',
                  'Everyone opens the Group Chat link or enters your 6-digit PIN at /play - zero login or app download needed.',
                  'Guests tap their name to claim their character and read their Full Backstory, How to Act tips, and Pre-Existing Relationships.',
                  'Encourage everyone to introduce themselves in character before the crime happens!',
                ],
              },
              {
                step: 'Stage 2 • The Investigation (4 Rounds × ~20 Mins)',
                title: '🔍 Evidence Drops & Interrogation',
                badge: 'Rounds 1, 2, 3 & 4',
                points: [
                  'When everyone is ready, tap "Next: Round 1 →" in your Host bar.',
                  'Every player’s phone immediately buzzes with Round 1 Evidence (leaked group chats, CCTV photos featuring your guests’ characters, receipts, and voice memos).',
                  'For Audio Clues: hit play on a Bluetooth speaker so the whole room hears the voice memo in your guests’ accents!',
                  'Players mingle, confront each other about the clues they just saw, and test alibis.',
                ],
              },
              {
                step: 'Stage 3 • Between-Round Voting (3 Mins Per Round)',
                title: '🗳️ "Who & Why" Suspect Guesses',
                badge: 'Guesses 1, 2, 3 & 4',
                points: [
                  'At the end of each clue round, tap "Next: Guess →" on your phone.',
                  'Every player gets a voting card on their phone: "Who do you think did it right now, and why?"',
                  'Your Host Console shows who is still voting so nobody gets left behind.',
                  'Each round’s votes secretly power the end-of-night Top Detective Leaderboard and Most Suspected Award!',
                ],
              },
              {
                step: 'Stage 4 • The Finale (15 Mins)',
                title: '🏆 Final Accusations & The Grand Reveal',
                badge: 'Round 5 (Finale)',
                points: [
                  'After Round 4’s final vote is locked in, gather everyone in the main room.',
                  'Tap "Next: Reveal →" to unveil the Detective Leaderboard (#1 Sleuth & Most Suspected Player).',
                  'When you’re ready for the truth, tap "Share Final Solution" to unseal the Killer, their Motive, and the complete Murder Timeline!',
                ],
              },
            ].map((stage, idx) => (
              <div
                key={idx}
                className="rounded-3xl border border-slate-200/80 bg-slate-50/50 p-6 space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                      {stage.step}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                      {stage.badge}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900">{stage.title}</h3>
                  <ul className="space-y-2.5 pt-1">
                    {stage.points.map((pt, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 font-medium leading-relaxed flex items-start gap-2"
                      >
                        <span className="w-4 h-4 rounded-full bg-brand-pink/15 text-brand-pink font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Host Pro-Tips & Edge Cases (Victim, Late Guests, Extra Guests) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
            <div className="p-5 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1.5">
              <p className="text-xs font-black text-slate-900">
                💀 How Does The Victim Play?
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                The Victim mingles in character during the Lobby, has a dramatic 30-second &ldquo;death&rdquo; when Round 1 starts, and immediately becomes the <strong>Ghost / Lead Detective</strong> - they still receive every clue and vote in every round!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1.5">
              <p className="text-xs font-black text-slate-900">
                🕵️‍♀️ Extra Friend Showed Up Last Minute?
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                No problem! At the bottom of the Lobby screen is a <strong>&ldquo;Join as Party Sleuth&rdquo;</strong> box. Any extra guest can type their name and get all live clues and voting rounds on their phone.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1.5">
              <p className="text-xs font-black text-slate-900">
                🔄 Someone Cancelled Last Minute?
              </p>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Simply open their Character Dossier from the <strong>Master Case File</strong> link during the party so the table can still inspect their backstory and alibi together!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: HOST SET-UP GUIDE & INTERACTIVE CHECKLIST
         ===================================================================== */}
      {activeTab === 'setup' && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-100 pb-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                15-Minute Party Prep • Zero Printing Required
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Host Set-Up Guide &amp; Pre-Party Checklist
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Check off each step below as you get ready for party night. Your progress is saved automatically.
              </p>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-right shrink-0">
              <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600">
                Checklist Progress
              </span>
              <span className="text-sm font-black text-emerald-900">
                {completedChecksCount} / {PRE_PARTY_CHECKLIST.length} Completed
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {PRE_PARTY_CHECKLIST.map(item => {
              const isDone = checkedItems.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleChecklistItem(item.id)}
                  className={`w-full p-5 rounded-2xl border text-left transition-all flex items-start gap-4 cursor-pointer ${
                    isDone
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-slate-50/60 hover:bg-white border-slate-200'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black shrink-0 mt-0.5 border transition-colors ${
                      isDone
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white text-transparent border-slate-300'
                    }`}
                  >
                    ✓
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-900 text-white">
                        {item.phase}
                      </span>
                      <h3
                        className={`text-sm sm:text-base font-black ${
                          isDone ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Physical Space & Pacing Tips */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-slate-100">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                🍽️ Dinner vs. Cocktail Pacing
              </span>
              <h4 className="text-sm font-black text-slate-900">
                When to Serve Food &amp; Drinks
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <strong>Cocktail / Finger Food:</strong> Keep drinks &amp; grazing boards out all night while guests mingle.<br />
                <strong>Sit-Down Dinner:</strong> Do the Lobby during starters, Rounds 1–2 during the main course, and Rounds 3–4 + Reveal over dessert &amp; drinks!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                🔊 Audio Clue Tip
              </span>
              <h4 className="text-sm font-black text-slate-900">
                Bluetooth Speaker for Voice Memos
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Connect your phone to a Bluetooth speaker! When a round includes a leaked voice recording, tap Play so the whole room hears the suspects’ accents together.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                🏆 End-of-Night Prizes
              </span>
              <h4 className="text-sm font-black text-slate-900">
                3 Fun Awards to Hand Out
              </h4>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Round 5 automatically calculates <strong>#1 Top Detective</strong> and <strong>Most Suspected Player</strong>. Grab a cheap bottle of prosecco or a silly trophy for <strong>Best Dressed</strong>!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 4: PARTY TOOLKIT (GROUP CHAT HYPE TEXTS, DRINKS & QR SIGN)
         ===================================================================== */}
      {activeTab === 'toolkit' && (
        <section className="bg-white rounded-[2.5rem] border border-slate-100 p-6 sm:p-10 shadow-sm space-y-8 animate-in fade-in duration-200">
          <div className="border-b border-slate-100 pb-6">
            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
              Extra Host Goodies • Set The Vibe
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Party Toolkit: Group Chat Texts, Drinks &amp; Ambience
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              Copy-and-paste group chat hype messages, plus tailored music, lighting, and drink ideas for <strong>{mystery.title}</strong>.
            </p>
          </div>

          {/* 1. Theme Ambience, Playlist & Signature Drink */}
          <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  ✨ Tailored Atmosphere Guide
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white mt-0.5">
                  {vibeKit.vibeName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="px-4 py-2.5 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider hover:opacity-95 transition-opacity cursor-pointer"
              >
                📺 Open Fullscreen TV / Printable QR Sign
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  🎵 Music &amp; Playlist Vibe
                </span>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {vibeKit.playlist}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  🕯️ Lighting &amp; Room Setup
                </span>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {vibeKit.lighting}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  🍸 Signature Cocktail &amp; Mocktail
                </span>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  <strong>Cocktail:</strong> {vibeKit.signatureDrink}
                  <br />
                  <strong>Zero-Proof:</strong> {vibeKit.mocktail}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                  📸 Easy Bonus Touch
                </span>
                <p className="text-xs text-slate-200 font-medium leading-relaxed">
                  {vibeKit.propTip}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Copy-and-Paste Group Chat Hype Templates */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              📱 Ready-to-Send Group Chat Messages
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  id: 'hype-week',
                  when: 'Send 1 Week Before',
                  title: '1. Pre-Party "First Glance" & Outfit Drop',
                  text: `🚨 OFFICIAL CAST ANNOUNCEMENT 🚨\nWe’re playing "${mystery.title}" for our Murder Mystery night!\n\nTap below to open our Pre-Party "First Glance" page, find your name, and check out your character outline, 3 outfit reference photos, and what to bring (zero game-night spoilers!):\n${prepDirectoryUrl} 🥂🕵️‍♀️`,
                },
                {
                  id: 'hype-day',
                  when: 'Send 24 Hours Before',
                  title: '2. Night-Before Reminder',
                  text: `🔪 TOMORROW NIGHT: "${mystery.title}"!\n\nQuick reminders:\n1️⃣ Come dressed in your character’s outfit vibe!\n2️⃣ Arrive with your phone charged (50%+) - all clues, leaked texts & suspect voting happen live on your phone.\n3️⃣ Trust nobody. See you all tomorrow! 🥂`,
                },
                {
                  id: 'hype-live',
                  when: 'Send When Guests Arrive',
                  title: '3. Doors Open / Lobby Link Drop',
                  text: `🥂 Welcome to "${mystery.title}"!\n\nTap below to enter the Live Game Lobby on your phone and claim your character (no login needed!):\n${lobbyUrl}\n\n🔢 Party PIN: ${formattedPin}`,
                },
              ].map(tpl => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-pink/10 text-brand-pink">
                      {tpl.when}
                    </span>
                    <h4 className="text-sm font-black text-slate-900">{tpl.title}</h4>
                    <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap bg-white p-3.5 rounded-2xl border border-slate-100 leading-relaxed">
                      {tpl.text}
                    </pre>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(tpl.text, tpl.id)}
                    className={`w-full py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      copiedId === tpl.id
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-900 hover:bg-brand-pink text-white'
                    }`}
                  >
                    {copiedId === tpl.id ? '✓ Copied to Clipboard!' : '📋 Copy Group Chat Text'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          FULLSCREEN TV / PRINTABLE QR CODE LOBBY SIGN MODAL
         ===================================================================== */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#070b13] text-white border border-brand-pink/40 rounded-[2.5rem] max-w-lg w-full p-8 text-center space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-black cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                🥂 Scan to Join The Mystery
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white pt-1">
                {mystery.title}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Point your phone camera at the QR code below or enter the 6-digit PIN at <strong>/{locale}/play</strong> (no login needed!)
              </p>
            </div>

            {/* Scannable QR Code */}
            <div className="bg-white p-5 rounded-3xl inline-block mx-auto shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  lobbyUrl
                )}`}
                alt="Lobby QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
              />
            </div>

            <div className="bg-white/5 border border-white/15 rounded-2xl py-4 px-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink mb-1">
                6-Digit Game PIN
              </p>
              <p className="text-4xl font-black tracking-[0.2em] font-mono text-white">
                {formattedPin}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-black uppercase tracking-wider text-white transition-colors cursor-pointer"
              >
                🖨️ Print Sign
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="px-6 py-3 rounded-xl bg-brand-pink hover:opacity-95 text-xs font-black uppercase tracking-wider text-white transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MysteryReadyHub;

