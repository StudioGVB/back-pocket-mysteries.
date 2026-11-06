'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';

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
      propTip: 'Place a sealed envelope labeled "LAST WILL & TESTAMENT — DO NOT OPEN" on the mantelpiece as a centerpiece.',
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
    detail: 'Some rounds include AI voice recordings with your guests’ accents — playing them out loud to the room is a huge crowd moment!',
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

  // Load persisted host checklist & sent invite statuses from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedSent = window.localStorage.getItem(`bpm_sent_invites_${mystery.id}`);
      if (savedSent) setSentCharIds(JSON.parse(savedSent));
      const savedChecks = window.localStorage.getItem(`bpm_host_checklist_${mystery.id}`);
      if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
    } catch {
      // ignore storage errors
    }
  }, [mystery.id]);

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

  const buildGroupChatSelectInvite = () => {
    const url = `${getOrigin()}/${locale}/play/${mystery.id}?select=1`;
    return `🕵️‍♀️ You're invited to our Murder Mystery party: "${mystery.title}"!\n\n🎭 Tap the link below to open our Character Selection page — find your name and click into your character to see your Character Outline, Outfit & Dress Code, and Vibe (no login needed!):\n${url}\n\n📱 Party Night Reminder: Please bring a charged phone or device on the night so you can access live clues, voice memos, and vote on suspects each round!\n🔢 Game PIN: ${formattedPin}`;
  };

  const sentCount = characters.filter(c => sentCharIds.includes(c.id)).length;
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
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink/20 text-brand-pink border border-brand-pink/30">
                🔒 100% Spoiler-Free Host Hub
              </span>
              <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-white/10 text-slate-200 border border-white/10">
                🔓 Zero Login Required for Guests
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              {mystery.title} — Pre-Party Host Hub
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Everything you need before your guests arrive: send each friend their <strong>Character Link, Outfit &amp; Vibe</strong>, review the <strong>How to Play Run-Through</strong>, and check off your <strong>15-Minute Party Set-Up Guide</strong>.
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
                onClick={() => setActiveTab('setup')}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <span>🛠️ Set-Up Checklist:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black">
                  {completedChecksCount} / {PRE_PARTY_CHECKLIST.length}
                </span>
              </button>

              {onEditCast ? (
                <button
                  type="button"
                  onClick={onEditCast}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  ✏️ Swap / Edit Cast
                </button>
              ) : (
                <Link
                  href={`/${locale}/mysteries/${mystery.slug}/cast?edit=1`}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-300 hover:text-white transition-colors"
                >
                  ✏️ Swap / Edit Cast
                </Link>
              )}
            </div>
          </div>

          {/* Right: 6-Digit Kahoot PIN + QR Sign Button */}
          <div className="bg-white/5 border border-white/15 rounded-3xl p-6 text-center shrink-0 space-y-3 min-w-[260px]">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-pink">
              6-Digit Party PIN
            </p>
            <div className="text-4xl sm:text-5xl font-black tracking-[0.18em] text-white font-mono">
              {formattedPin}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              Guests join at{' '}
              <Link
                href={`/${locale}/play`}
                target="_blank"
                className="text-brand-pink underline font-bold"
              >
                /{locale}/play
              </Link>{' '}
              or via direct link
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

        {/* Bottom Action Bar in Hero */}
        <div className="relative z-10 mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                copyToClipboard(`${getOrigin()}/${locale}/play/${mystery.id}?select=1`, 'master-lobby');
              }}
              className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                copiedId === 'master-lobby'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
            >
              {copiedId === 'master-lobby'
                ? '✓ Group Chat Character Link Copied!'
                : '🔗 1-Click Copy Group Chat Link'}
            </button>

            <button
              type="button"
              onClick={() => {
                copyToClipboard(buildGroupChatSelectInvite(), 'hero-group-invite');
                markAllSent();
              }}
              className={`w-full sm:w-auto px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                copiedId === 'hero-group-invite'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200'
              }`}
            >
              {copiedId === 'hero-group-invite'
                ? '✓ Group Chat Invite + Link Copied!'
                : '💬 Copy Group Chat Message + Link'}
            </button>
          </div>

          <Link
            href={hostLobbyUrl}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-sm font-black uppercase tracking-widest text-center transition-all shadow-xl"
            style={{
              background: 'linear-gradient(135deg, #fe04c6 0%, #c026d3 100%)',
              boxShadow: '0 10px 25px -8px rgba(254,4,198,0.5)',
            }}
          >
            🚀 Launch Live Game Lobby &amp; Host Controls →
          </Link>
        </div>
      </div>

      {/* 2. NAVIGATION PILLS FOR THE 4 PRE-PARTY SECTIONS */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-2 shadow-sm flex flex-wrap items-center gap-2">
        {[
          {
            id: 'characters' as const,
            label: `🎭 1. Characters & Guest Links (${characters.length})`,
            badge: `${sentCount}/${characters.length} Sent`,
          },
          {
            id: 'howtoplay' as const,
            label: '🕹️ 2. How to Play Run-Through',
            badge: '4 Rounds + Reveal',
          },
          {
            id: 'setup' as const,
            label: '🛠️ 3. Host Set-Up Guide & Checklist',
            badge: `${completedChecksCount}/${PRE_PARTY_CHECKLIST.length} Done`,
          },
          {
            id: 'toolkit' as const,
            label: '✨ 4. Party Toolkit (Texts, Drinks & QR)',
            badge: 'Extras',
          },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-w-[200px] px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-between gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <span className="truncate">{tab.label}</span>
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
                Step 1 Before Party Night • Send Character Dossiers
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                Your Cast: Outline, Outfit, Vibe &amp; Direct Guest Links
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 max-w-2xl">
                Send the <strong>1-Click Group Chat Link</strong> so everyone can pick their character from one page, or send each guest their individual link below!
              </p>
            </div>

            <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 shrink-0 text-right">
              <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                Invite Progress
              </span>
              <span className="text-sm font-black text-slate-900">
                {sentCount} of {characters.length} Guests Sent
              </span>
            </div>
          </div>

          {/* 1-CLICK GENERIC GROUP CHAT CHARACTER SELECTION LINK CARD */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-brand-pink/35 shadow-xl space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                    ⚡ Fastest Option • 1-Click Group Chat Link
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    📱 Includes Charged Device Reminder
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  Send One Generic Link to the Group Chat (Guests Click Their Character)
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                  Don&apos;t want to text everyone individually? Drop this single link into your group chat! It opens a <strong>Character Selection Page</strong> where each guest finds their name and clicks into their character to see their <strong>Outline</strong>, <strong>Outfit &amp; Dress Code</strong>, <strong>Vibe</strong>, and a reminder to <strong>bring a charged phone/device</strong> on the night.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(buildGroupChatSelectInvite(), 'group-select-msg');
                    markAllSent();
                  }}
                  className={`px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                    copiedId === 'group-select-msg'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-brand-pink hover:opacity-95 text-white'
                  }`}
                >
                  {copiedId === 'group-select-msg'
                    ? '✓ Group Chat Message + Link Copied!'
                    : '💬 1-Click Copy Group Chat Invite'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(
                      `${getOrigin()}/${locale}/play/${mystery.id}?select=1`,
                      'group-select-url'
                    );
                    markAllSent();
                  }}
                  className={`px-4 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
                    copiedId === 'group-select-url'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-white/10 hover:bg-white/15 text-white border-white/15'
                  }`}
                >
                  {copiedId === 'group-select-url'
                    ? '✓ Generic Link Copied!'
                    : '🔗 Copy Link Only'}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const url = `${getOrigin()}/${locale}/play/${mystery.id}?select=1`;
                    if (typeof navigator !== 'undefined' && navigator.share) {
                      try {
                        await navigator.share({
                          title: `${mystery.title} — Pick Your Character`,
                          text: buildGroupChatSelectInvite(),
                          url,
                        });
                        markAllSent();
                        return;
                      } catch {
                        // fallback
                      }
                    }
                    copyToClipboard(buildGroupChatSelectInvite(), 'group-select-msg');
                    markAllSent();
                  }}
                  className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  📲 Share
                </button>

                <Link
                  href={`/${locale}/play/${mystery.id}?select=1`}
                  target="_blank"
                  className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/15 text-slate-200 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Preview Selection Page ↗
                </Link>
              </div>
            </div>
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
              const copyInviteKey = `invite-msg-${char.id}`;
              const copyUrlKey = `invite-url-${char.id}`;
              const guestAvatar = resolveDisplayAvatarUrl(guest?.avatar_url || char.characterPhotoUrl || undefined);

              const buildCharacterUrl = () =>
                `${getOrigin()}/${locale}/play/${mystery.id}?char=${char.id}`;

              const buildInviteText = () => {
                const url = buildCharacterUrl();
                const vibeLine =
                  char.actBullets && char.actBullets.length > 0
                    ? `\n🎭 How to Play Them: ${char.actBullets.join(' • ')}`
                    : '';
                return `🕵️‍♀️ ${guest ? `Hey ${guest.name}! ` : ''}You're cast in our Murder Mystery party: "${mystery.title}"!\n\n🎭 Your Role: ${char.roleTitle}\n📖 Character Outline: ${char.cleanBio}${vibeLine}\n👗 What to Wear: ${outfitText}\n📱 What to Bring: Please bring a charged phone or device on the night — you'll use it to access live clues, leaked messages, voice memos, and play along each round!\n\n🔗 Tap to open your Character Dossier (Game PIN: ${formattedPin} — no login needed):\n${url}`;
              };

              return (
                <div
                  key={char.id}
                  className={`rounded-3xl border p-6 flex flex-col justify-between gap-5 transition-all ${
                    isSent
                      ? 'bg-emerald-50/20 border-emerald-200'
                      : char.is_victim
                      ? 'bg-pink-50/25 border-pink-200'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Top Row: Guest + Role Badge + Sent Checkbox */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 flex items-center justify-center">
                          {guestAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={guestAvatar}
                              alt={guest?.name || char.roleTitle}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">{char.is_victim ? '💀' : '🕵️'}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                char.is_victim
                                  ? 'bg-brand-pink text-white'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              {char.is_victim ? '💀 The Victim' : '🕵️ Suspect'}
                            </span>
                            {guest ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                👤 {guest.name}
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Unassigned
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight mt-1 truncate">
                            {char.roleTitle}
                          </h3>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleSentChar(char.id)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all shrink-0 cursor-pointer ${
                          isSent
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {isSent ? '✓ Sent' : 'Mark Sent'}
                      </button>
                    </div>

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
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-100 space-y-1">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600">
                        👗 Outfit &amp; Dress Code
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {outfitText}
                      </p>
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

                    {/* 4. What to Bring (Device Reminder for Clues & Gameplay) */}
                    <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200/80 space-y-1">
                      <span className="block text-[9px] font-black uppercase tracking-widest text-sky-700">
                        📱 What to Bring Tonight
                      </span>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        Bring a <strong>charged phone or device</strong> to access your Character Dossier, receive live Round 1–4 clues, and vote on suspects each round.
                      </p>
                    </div>
                  </div>

                  {/* Action Footer: Copy Full Invite Text, Copy Direct Link, Native Share, Open Dossier */}
                  <div className="pt-4 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          copyToClipboard(buildInviteText(), copyInviteKey);
                          toggleSentChar(char.id, true);
                        }}
                        className={`px-3.5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                          copiedId === copyInviteKey
                            ? 'bg-emerald-500 text-white'
                            : 'bg-brand-pink hover:opacity-95 text-white'
                        }`}
                      >
                        {copiedId === copyInviteKey
                          ? '✓ Invite Text Copied!'
                          : `💬 Copy Text for ${guest ? guest.name.split(' ')[0] : char.roleTitle}`}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          copyToClipboard(buildCharacterUrl(), copyUrlKey);
                          toggleSentChar(char.id, true);
                        }}
                        className={`px-3 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
                          copiedId === copyUrlKey
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {copiedId === copyUrlKey ? '✓ Link Copied!' : '🔗 Copy Link Only'}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          const url = buildCharacterUrl();
                          if (typeof navigator !== 'undefined' && navigator.share) {
                            try {
                              await navigator.share({
                                title: `${char.roleTitle} — ${mystery.title}`,
                                text: buildInviteText(),
                                url,
                              });
                              toggleSentChar(char.id, true);
                              return;
                            } catch {
                              // fallback
                            }
                          }
                          copyToClipboard(buildInviteText(), copyInviteKey);
                          toggleSentChar(char.id, true);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 transition-colors cursor-pointer"
                        title="Share via phone message sheet"
                      >
                        📲 Share
                      </button>

                      <Link
                        href={`/${locale}/play/${mystery.id}?char=${char.id}`}
                        target="_blank"
                        className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        Preview ↗
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
                  'Everyone opens the Group Chat link or enters your 6-digit PIN at /play — zero login or app download needed.',
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
                The Victim mingles in character during the Lobby, has a dramatic 30-second &ldquo;death&rdquo; when Round 1 starts, and immediately becomes the <strong>Ghost / Lead Detective</strong> — they still receive every clue and vote in every round!
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
                Click <strong>✏️ Swap / Edit Cast</strong> at the top of this page to mark them Out or swap another friend into their role in 10 seconds — all clues update automatically!
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
                  title: '1. The Cast & Dress Code Teaser',
                  text: `🚨 OFFICIAL CAST ANNOUNCEMENT 🚨\nWe’re playing "${mystery.title}" for our Murder Mystery night!\n\nI’m texting each of you your personal Character Dossier link with your role, backstory, and what to wear. Check your DMs and start planning your outfit! 🥂🕵️‍♀️`,
                },
                {
                  id: 'hype-day',
                  when: 'Send 24 Hours Before',
                  title: '2. Night-Before Reminder',
                  text: `🔪 TOMORROW NIGHT: "${mystery.title}"!\n\nQuick reminders:\n1️⃣ Come dressed in your character’s outfit vibe!\n2️⃣ Arrive with your phone charged (50%+) — all clues, leaked texts & suspect voting happen live on your phone.\n3️⃣ Trust nobody. See you all tomorrow! 🥂`,
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

