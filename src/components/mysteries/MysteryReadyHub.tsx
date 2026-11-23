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

  if (combined.includes('christmas') || combined.includes('holiday')) {
    return {
      vibeName: 'Cozy Candlelit Christmas Dinner Party',
      playlist: 'Search Spotify: "Cozy Christmas Jazz", "Vintage Holiday Crooners", or "Michael Bublé / Laufey Winter Lounge"',
      lighting: 'Warm fairy lights, Christmas tree glow, and table candles with main ceiling lights dimmed.',
      signatureDrink: 'Spiced Holiday Eggnog with Nutmeg & Cinnamon or Cranberry Prosecco Spritz',
      mocktail: 'Warm Mulled Apple Cider with Cinnamon Sticks & Star Anise',
      propTip: 'Set a few wrapped empty boxes and a strand of vintage tree lights near the drinks table to match the crime scene!',
    };
  }

  if (combined.includes('reality') || combined.includes('love') || combined.includes('reunion')) {
    return {
      vibeName: 'Reality TV Reunion Glam',
      playlist: 'Search Spotify: "2000s Pop Icons", "Love Island Pool Party", or "Charli XCX Club Glam"',
      lighting: 'Warm pink/magenta LED accent lighting, a ring light for photos, and dim lounge lamps.',
      signatureDrink: 'The Spicy Bombshell Margarita (Tequila, lime, agave, jalapeño slice & pink sugar rim)',
      mocktail: 'The Rose Ceremony Spritz (Sparkling rosé grape or cranberry fizz, lime, and edible glitter)',
      propTip: 'Set up a "Confessional Chair" in a quiet corner where guests can film 10-second reactions or listen to voice memos!',
    };
  }

  if (combined.includes('yacht') || combined.includes('sea') || combined.includes('alibi')) {
    return {
      vibeName: 'Superyacht Mediterranean Noir',
      playlist: 'Search Spotify: "Riviera Lounge House", "Monaco Sunset Chill", or "White Lotus Soundtrack"',
      lighting: 'Candlelight on tables, deep ocean-blue or warm gold low-key lamp lighting.',
      signatureDrink: 'The Red Tide Negroni or Aperol Yacht Spritz',
      mocktail: 'Mediterranean Blood Orange & Rosemary Tonic',
      propTip: 'Serve drinks in coupe or champagne glasses and hand out sunglasses as arrival props.',
    };
  }

  return {
    vibeName: theme || 'VIP High-Society Mystery',
    playlist: 'Search Spotify: "Speakeasy Cocktail Jazz", "Noir Lounge Beats", or "Knives Out Strings & Jazz"',
    lighting: 'Dim the main ceiling lights and use warm side lamps or candles to create a moody detective lounge.',
    signatureDrink: 'The Velvet Alibi Espresso Martini or Classic Dirty Martini',
    mocktail: 'Blackberry Ginger Noir Mule with fresh mint',
    propTip: 'Create a quick photo spot by the entrance so guests can snap a photo in their character outfit when they arrive!',
  };
}

const PRE_PARTY_CHECKLIST = [
  {
    id: 'send-char-links',
    phase: '3–7 Days Before',
    title: 'Share the Pre-Party Invite Link with your guests',
    detail: 'Drop the Group Invite link in your group chat (or copy individual invites) so everyone sees their outfit guide.',
  },
  {
    id: 'speaker-check',
    phase: '1 Day Before',
    title: 'Have a Bluetooth speaker ready for Voice Memo clues',
    detail: 'Playing the AI voice recordings out loud to the room is a huge crowd moment.',
  },
  {
    id: 'phone-charge',
    phase: '1 Day Before',
    title: 'Remind guests to arrive with charged phones (50%+)',
    detail: 'Everyone views clues and submits suspect guesses on their phone browser (zero app download or login needed).',
  },
  {
    id: 'lighting-drinks',
    phase: '30 Mins Before',
    title: 'Dim the lights, start the playlist & prep welcome drinks',
    detail: 'Check the "Menu & Ambience" tab for your mystery’s tailored playlist and signature drink.',
  },
  {
    id: 'start-game',
    phase: 'When Guests Arrive',
    title: 'Click "Start Game" when guests arrive to open the Live Lobby',
    detail: 'Your 6-digit Game PIN and scannable QR code will appear on the Start Game screen so everyone can join in seconds.',
  },
];

export function MysteryReadyHub({
  locale,
  mystery,
  characters,
  guests,
  assignments,
}: MysteryReadyHubProps) {
  const [activeTab, setActiveTab] = useState<'characters' | 'howtoplay' | 'toolkit'>('characters');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sentCharIds, setSentCharIds] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [expandedCharIds, setExpandedCharIds] = useState<string[]>([]);
  const [showPartyDetailsDrawer, setShowPartyDetailsDrawer] = useState<boolean>(false);

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
      const baseMysteryId = mystery.id.split('__u_')[0];
      const savedParty =
        window.localStorage.getItem(`bpm_party_details_${mystery.id}`) ||
        window.localStorage.getItem(`bpm_party_details_${baseMysteryId}`);
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

  // Fetch and poll server session for partyDetails and live guest confirmations
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

  const handleSavePartyDetails = async (
    overrideItems?: string[],
    overrideVibe?: string,
    overrideFields?: Partial<PartyEventDetails>
  ) => {
    const itemsToSave = overrideItems ?? whatToBringItems;
    const vibeToSave = overrideVibe ?? foodAndDrinkVibe;
    const payload: PartyEventDetails = {
      partyDate: (overrideFields?.partyDate ?? partyDate).trim(),
      arrivalTime: (overrideFields?.arrivalTime ?? arrivalTime).trim(),
      gameStartTime: (overrideFields?.gameStartTime ?? gameStartTime).trim(),
      location: (overrideFields?.location ?? location).trim(),
      hostNotes: (overrideFields?.hostNotes ?? hostNotes).trim(),
      foodAndDrinkVibe: vibeToSave,
      whatToBringItems: itemsToSave,
    };
    if (typeof window !== 'undefined') {
      try {
        const baseMysteryId = mystery.id.split('__u_')[0];
        window.localStorage.setItem(`bpm_party_details_${mystery.id}`, JSON.stringify(payload));
        window.localStorage.setItem(`bpm_party_details_${baseMysteryId}`, JSON.stringify(payload));
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

  // Sync cast assignments to cross-container carrier
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

  const toggleExpandChar = (charId: string) => {
    setExpandedCharIds(prev =>
      prev.includes(charId) ? prev.filter(id => id !== charId) : [...prev, charId]
    );
  };

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
  const hostLobbyUrl = `/${locale}/play/${mystery.id}?host=1`;
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
    return `🕵️‍♀️ You're invited to our Murder Mystery party: "${mystery.title}"!${partyBlock}\n👗 Tap the Pre-Party "First Glance" link below, find your name, and open your character sheet to see Who You Are, Your Outfit Guide, and What to Bring (no login needed, zero game-night spoilers!):\n${url}`;
  };

  const sentCount = characters.filter(c => sentCharIds.includes(c.id)).length;
  const confirmedReadyCount = characters.filter(c => Boolean(prepConfirmedCharacters[c.id])).length;
  const completedChecksCount = checkedItems.length;

  const formattedDateSummary = formatPartyDateDisplay(partyDate);

  return (
    <div className="space-y-6">
      {/* 1. CLEAN, MINIMAL TOP HEADER (Title + Metadata on Left, Single Start Game CTA on Right) */}
      <div className="bg-white border border-slate-200/80 rounded-[2rem] p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-200">
              ✓ Ready to Play
            </span>
            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-pink-50 text-brand-pink border border-pink-200">
              🔒 Spoiler-Free Host Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">
            {mystery.title}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500">
            {mystery.theme || 'Murder Mystery'} • {characters.length} Suspects Cast • Send invites ahead of time, then click Start Game on party night
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href={hostLobbyUrl}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl text-white text-xs sm:text-sm font-black uppercase tracking-widest text-center transition-all shadow-lg hover:opacity-95"
            style={{
              background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
              boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
            }}
          >
            🚀 Start Game →
          </Link>
        </div>
      </div>

      {/* 2. SIMPLE 3-TAB BAR */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-xs grid grid-cols-3 gap-1.5">
        {[
          {
            id: 'characters' as const,
            label: '👥 Cast & Invites',
            badge: `${sentCount}/${characters.length} Sent`,
          },
          {
            id: 'howtoplay' as const,
            label: '📖 How to Host',
            badge: `${completedChecksCount}/${PRE_PARTY_CHECKLIST.length} Prep`,
          },
          {
            id: 'toolkit' as const,
            label: '🍸 Menu & Ambience',
            badge: 'Extras',
          },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center sm:justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-transparent hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="truncate">{tab.label}</span>
              <span
                className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                  isActive
                    ? 'bg-brand-pink text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
          TAB 1: CAST & INVITES (CLEAN GROUP INVITE BAR + COMPACT CAST CARDS)
         ===================================================================== */}
      {activeTab === 'characters' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          {/* Compact Group Invite & Optional Party Details Bar */}
          <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    💌 Pre-Party Group Invite
                  </span>
                  {confirmedReadyCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black">
                      ✋ {confirmedReadyCount}/{characters.length} Guests Confirmed Ready
                    </span>
                  )}
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900">
                  Share the Pre-Party &ldquo;First Glance&rdquo; Link With Your Group
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {formattedDateSummary || location
                    ? `📅 ${formattedDateSummary || 'Party Night'}${arrivalTime ? ` at ${arrivalTime}` : ''}${location ? ` • 📍 ${location}` : ''}`
                    : 'Guests can tap their name to see their character blurb & outfit guide before party night (with Round 1 clues locked).'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPartyDetailsDrawer(prev => !prev)}
                  className={`px-4 py-3 rounded-xl border text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                    showPartyDetailsDrawer
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {showPartyDetailsDrawer ? '▴ Hide Party Details' : '📅 Party Date & Details'}
                </button>

                <Link
                  href={`/${locale}/play/${mystery.id}?prep=1`}
                  target="_blank"
                  className="px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider transition-colors"
                >
                  👀 Preview Guest Page ↗
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(buildGroupChatSelectInvite(), 'group-select-msg');
                    markAllSent();
                  }}
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                    copiedId === 'group-select-msg'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-brand-pink hover:opacity-95 text-white'
                  }`}
                >
                  {copiedId === 'group-select-msg'
                    ? '✓ Group Invite Copied!'
                    : '📋 Copy Group Invite'}
                </button>
              </div>
            </div>

            {/* Collapsible Party Details Drawer (Hidden by Default to Keep Page Clean!) */}
            {showPartyDetailsDrawer && (
              <div className="pt-5 border-t border-slate-100 space-y-5 animate-in fade-in duration-150">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      📅 Party Date
                    </label>
                    <input
                      type="date"
                      value={partyDate}
                      onChange={e => setPartyDate(e.target.value)}
                      onBlur={() => void handleSavePartyDetails()}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      🥂 Arrival Time
                    </label>
                    <input
                      type="text"
                      value={arrivalTime}
                      onChange={e => setArrivalTime(e.target.value)}
                      onBlur={() => void handleSavePartyDetails()}
                      placeholder="e.g. 7:00 PM"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      🔪 Game Starts At
                    </label>
                    <input
                      type="text"
                      value={gameStartTime}
                      onChange={e => setGameStartTime(e.target.value)}
                      onBlur={() => void handleSavePartyDetails()}
                      placeholder="e.g. 7:30 PM"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                      📍 Location / Address
                    </label>
                    <input
                      type="text"
                      value={location}
                      onChange={e => setLocation(e.target.value)}
                      onBlur={() => void handleSavePartyDetails()}
                      placeholder="e.g. 42 Oxford St"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-900 outline-none focus:border-brand-pink"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      🍽️ Food &amp; Drink Vibe
                    </label>
                    <div className="grid grid-cols-2 gap-2">
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
                            className={`px-3 py-2.5 rounded-xl text-[11px] font-bold text-left border transition-all cursor-pointer truncate ${
                              isSelected
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
                      🎒 What Guests Should Bring
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {WHAT_TO_BRING_PRESETS.map(preset => {
                        const isAdded = whatToBringItems.includes(preset);
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => toggleBringPreset(preset)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isAdded ? '✓ ' : '+ '}
                            {preset}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
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
                        placeholder="Add custom item (e.g. $15 Secret Santa gift)..."
                        className="h-9 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-brand-pink"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomBringItem}
                        className="h-9 px-3 rounded-lg bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <input
                    type="text"
                    value={hostNotes}
                    onChange={e => setHostNotes(e.target.value)}
                    onBlur={() => void handleSavePartyDetails()}
                    placeholder="Optional Host Note (e.g. Enter via garden gate, welcome drinks on arrival)..."
                    className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-medium text-slate-900 outline-none focus:border-brand-pink"
                  />
                  <button
                    type="button"
                    disabled={isSavingPartyDetails}
                    onClick={() => {
                      void handleSavePartyDetails();
                      setShowPartyDetailsDrawer(false);
                    }}
                    className="h-10 px-5 rounded-xl bg-brand-pink text-white text-xs font-black uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    {partyDetailsSavedNotice
                      ? '✓ Saved!'
                      : isSavingPartyDetails
                      ? 'Saving...'
                      : 'Save Details'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Clean 3-Column Cast Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
              const isExpanded = expandedCharIds.includes(char.id);
              const copyInviteKey = `invite-msg-${char.id}`;
              const guestAvatar = resolveDisplayAvatarUrl(
                char.characterPhotoUrl || guest?.avatar_url || undefined
              );

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
                  className="bg-white rounded-[1.75rem] border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Character Portrait */}
                    <div className="relative w-full aspect-[4/5] bg-slate-900 overflow-hidden">
                      {guestAvatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={guestAvatar}
                          alt={guest?.name || char.roleTitle}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-5xl bg-slate-900 text-white">
                          {char.is_victim ? '💀' : '🕵️'}
                        </div>
                      )}

                      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent pointer-events-none" />

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
                            char.is_victim
                              ? 'bg-brand-pink text-white'
                              : 'bg-slate-900/85 text-white border border-white/15 backdrop-blur-md'
                          }`}
                        >
                          {char.is_victim ? '💀 Victim' : '🕵️ Suspect'}
                        </span>

                        {isConfirmedReady ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                            ✋ Ready ✓
                          </span>
                        ) : isSent ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/90 text-white shadow-sm">
                            ✓ Sent
                          </span>
                        ) : null}
                      </div>

                      {/* Bottom Guest Name + Role Title */}
                      <div className="absolute bottom-3 inset-x-4 z-10">
                        <p className="text-xs font-black uppercase tracking-wider text-brand-pink truncate">
                          {guest ? guest.name : 'Unassigned'}
                        </p>
                        <h3 className="text-xl font-black text-white tracking-tight leading-tight truncate">
                          {char.roleTitle}
                        </h3>
                      </div>
                    </div>

                    {/* Compact Summary + Expand Toggle */}
                    <div className="p-4 space-y-3">
                      <p
                        className={`text-xs text-slate-600 font-medium leading-relaxed ${
                          isExpanded ? '' : 'line-clamp-2'
                        }`}
                      >
                        {char.cleanBio}
                      </p>

                      {isExpanded && (
                        <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs animate-in fade-in duration-150">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 block">
                              👗 Outfit Guide
                            </span>
                            <p className="text-slate-700 font-medium mt-0.5 leading-relaxed">
                              {outfitText}
                            </p>
                          </div>
                          {char.actBullets && char.actBullets.length > 0 && (
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 block">
                                🎭 How to Act
                              </span>
                              <p className="text-slate-600 font-medium mt-0.5 leading-relaxed">
                                {char.actBullets.join(' • ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpandChar(char.id)}
                        className="text-[11px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-wider cursor-pointer"
                      >
                        {isExpanded ? '▴ Hide Outfit & Bio' : '▾ View Outfit & Bio'}
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: 1-Click Copy Invite + Preview Link */}
                  <div className="px-4 pb-4 pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        copyToClipboard(buildInviteText(), copyInviteKey);
                        toggleSentChar(char.id, true);
                      }}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer truncate ${
                        copiedId === copyInviteKey
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-900 hover:bg-brand-pink text-white'
                      }`}
                    >
                      {copiedId === copyInviteKey
                        ? '✓ Invite Copied!'
                        : `📋 Copy Invite${guest ? ` (${guest.name.split(' ')[0]})` : ''}`}
                    </button>

                    <Link
                      href={`/${locale}/play/${mystery.id}?char=${char.id}&prep=1`}
                      target="_blank"
                      title="Preview Character Sheet"
                      className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition-colors shrink-0"
                    >
                      ↗
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 2: HOW TO HOST (3-STEP VISUAL FLOW + INTERACTIVE CHECKLIST)
         ===================================================================== */}
      {activeTab === 'howtoplay' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          {/* 3-Step Visual Party Flow */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                Zero-Stress Hosting • ~2 Hours Total
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                How the Night Runs in 3 Simple Steps
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  step: '1. Arrival & Lobby',
                  time: '15–20 Mins',
                  title: '🥂 Click "Start Game" & Mingle',
                  desc: 'When guests arrive in costume, click Start Game to display your 6-digit Game PIN & QR code. Friends scan in on their phone with zero login required.',
                },
                {
                  step: '2. The Investigation',
                  time: 'Rounds 1–3',
                  title: '🔍 Evidence Drops & Accusations',
                  desc: 'Tap "Next Round" on your phone when ready. Everyone’s phone receives the new clues, leaked texts, and audio voice memos to interrogate each other.',
                },
                {
                  step: '3. Final Vote & Reveal',
                  time: '15 Mins',
                  title: '🏆 Leaderboard & Killer Reveal',
                  desc: 'Players lock in their final suspect vote on their phones. Unveil the Top Detective Leaderboard, then unseal the Killer and complete Murder Timeline!',
                },
              ].map((st, i) => (
                <div
                  key={i}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-2"
                >
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <span className="text-brand-pink">{st.step}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {st.time}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900">{st.title}</h3>
                  <p className="text-xs text-slate-600 font-medium leading-relaxed">
                    {st.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* 3 Quick FAQ Callouts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-pink-50/50 border border-pink-100 space-y-1">
                <p className="text-xs font-black text-slate-900">
                  💀 How Does The Victim Play?
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  The Victim mingles in the Lobby, has a dramatic 30-second death when Round 1 starts, and becomes the <strong>Lead Detective</strong>—still getting every clue and voting every round!
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-1">
                <p className="text-xs font-black text-slate-900">
                  🕵️ Extra Plus-One Guests?
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Extra friends can join the Live Game Lobby as <strong>&ldquo;Detective [Name]&rdquo;</strong> to receive all live clues and vote alongside the cast.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                <p className="text-xs font-black text-slate-900">
                  📁 Solving Solo or as a Duo?
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  In Couch Detective mode, open the{' '}
                  <Link
                    href={`/${locale}/play/${mystery.id}?select=1`}
                    target="_blank"
                    className="text-brand-pink underline font-bold"
                  >
                    Master Case File ↗
                  </Link>{' '}
                  to inspect all {characters.length} suspect dossiers together.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Host Checklist */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                  15-Minute Prep
                </span>
                <h3 className="text-lg sm:text-xl font-black text-slate-900">
                  Host Pre-Party Checklist
                </h3>
              </div>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-800">
                {completedChecksCount} / {PRE_PARTY_CHECKLIST.length} Done
              </span>
            </div>

            <div className="space-y-2.5">
              {PRE_PARTY_CHECKLIST.map(item => {
                const isDone = checkedItems.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklistItem(item.id)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 cursor-pointer ${
                      isDone
                        ? 'bg-emerald-50/40 border-emerald-200'
                        : 'bg-slate-50/70 hover:bg-white border-slate-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5 border ${
                        isDone
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-transparent border-slate-300'
                      }`}
                    >
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-slate-900 text-white">
                          {item.phase}
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-black ${
                            isDone ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {item.detail}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================================
          TAB 3: MENU & AMBIENCE (DRINKS, PLAYLIST & GROUP CHAT REMINDERS)
         ===================================================================== */}
      {activeTab === 'toolkit' && (
        <section className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-1">
                Set The Mood
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                {vibeKit.vibeName}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                  🍸 Signature Cocktail &amp; Mocktail
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  <strong>Cocktail:</strong> {vibeKit.signatureDrink}
                  <br />
                  <strong>Zero-Proof:</strong> {vibeKit.mocktail}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  🎵 Music &amp; Playlist Vibe
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {vibeKit.playlist}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                  🕯️ Lighting &amp; Room Setup
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {vibeKit.lighting}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                  📸 Easy Bonus Touch
                </span>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  {vibeKit.propTip}
                </p>
              </div>
            </div>
          </div>

          {/* 2 Clean Group Chat Hype Templates (No PIN leak before game start!) */}
          <div className="bg-white rounded-[2rem] border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
            <h3 className="text-lg font-black text-slate-900">
              📱 Copy-and-Paste Group Chat Reminders
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'hype-week',
                  when: 'Send 3–7 Days Before',
                  title: '1. Pre-Party Character & Outfit Drop',
                  text: `🚨 OFFICIAL CAST ANNOUNCEMENT 🚨\nWe’re playing "${mystery.title}" for our Murder Mystery night!\n\nTap below to open our Pre-Party "First Glance" page, find your name, and check out your character outline and outfit guide (zero game-night spoilers!):\n${prepDirectoryUrl} 🥂🕵️‍♀️`,
                },
                {
                  id: 'hype-day',
                  when: 'Send 24 Hours Before',
                  title: '2. Night-Before Reminder',
                  text: `🔪 TOMORROW NIGHT: "${mystery.title}"!\n\nQuick reminders:\n1️⃣ Come dressed in your character’s outfit vibe!\n2️⃣ Arrive with your phone charged (50%+) - all clues, leaked texts & suspect voting happen live on your phone.\n3️⃣ Trust nobody. See you all tomorrow! 🥂`,
                },
              ].map(tpl => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-brand-pink/10 text-brand-pink">
                      {tpl.when}
                    </span>
                    <h4 className="text-sm font-black text-slate-900">{tpl.title}</h4>
                    <pre className="text-[11px] text-slate-600 font-sans whitespace-pre-wrap bg-white p-3.5 rounded-xl border border-slate-200/70 leading-relaxed">
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
                    {copiedId === tpl.id ? '✓ Copied!' : '📋 Copy Text'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default MysteryReadyHub;
