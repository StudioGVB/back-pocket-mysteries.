'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { getEffectiveCoverUrl, parseMysteryImageField } from '@/utils/moodboard';
import {
  hydrateTextWithCharacters,
  getCharacterDisplayName,
  getCharacterRoleTitle,
} from '@/utils/hydration';
import { getCleanCharacterPresentation } from '@/utils/character-display';
import {
  ClueFormat,
  CLUE_FORMAT_OPTIONS,
  inferClueFormat,
  stripCustomerFacingTitle,
} from '@/utils/clue-format';
import { ChatClueView } from '@/components/clues/ChatClueView';
import { ReceiptClueView } from '@/components/clues/ReceiptClueView';
import { DocumentClueView } from '@/components/clues/DocumentClueView';
import { CctvClueView } from '@/components/clues/CctvClueView';
import { AudioClueView } from '@/components/clues/AudioClueView';
import { PropClueView } from '@/components/clues/PropClueView';
import { SearchLogClueView } from '@/components/clues/SearchLogClueView';
import { SocialClueView } from '@/components/clues/SocialClueView';
import { NoteClueView } from '@/components/clues/NoteClueView';
import { MedicalClueView } from '@/components/clues/MedicalClueView';
import { CallSheetClueView } from '@/components/clues/CallSheetClueView';
import {
  getGameSessionAction,
  claimCharacterInLobbyAction,
  registerDetectiveGuestAction,
  submitRoundTheoryAction,
  updateHostGameControlAction,
  submitGuestMysteryReviewAction,
  confirmCharacterPrepReadAction,
  RoundSubmission,
  DetectiveGuestItem,
  PartyEventDetails,
} from '@/app/actions/customer-mystery';
import {
  formatPartyDateDisplay,
  getFoodVibeDisplay,
} from '@/components/mysteries/MysteryReadyHub';
import { RelationshipGraph } from '@/app/[locale]/(builder)/builder/mysteries/[id]/relationships/_components/RelationshipGraph';

interface Mystery {
  id: string;
  title: string;
  theme: string | null;
  description: string | null;
  image_url: string | null;
  current_round: number | null;
}

interface Character {
  id: string;
  name: string;
  archetype: string | null;
  gender: string;
  image_url: string | null;
  is_victim?: boolean;
  plot_role?: string | null;
  profile_data: any;
}

interface Relationship {
  id: string;
  character_a_id: string;
  character_b_id: string;
  know_each_other: boolean;
  dynamics: string[] | null;
  notes: string | null;
}

interface Clue {
  id: string;
  title: string;
  description: string | null;
  clue_type: string | null;
  format?: ClueFormat | null;
  static_image_url: string | null;
  audio_url?: string | null;
  voice_region?: string | null;
  round_number: number | null;
  evidence_status?: string | null;
  implication_type?: string | null;
}

interface PlayroomClientProps {
  locale?: string;
  mystery: Mystery;
  characters: Character[];
  relationships: Relationship[];
  clues: Clue[];
  initialSession?: any;
  initialCharId?: string | null;
  initialIsHost?: boolean;
  forceSelect?: boolean;
  initialPrepMode?: boolean;
}

export function PlayroomClient({
  locale = 'en',
  mystery,
  characters,
  relationships,
  clues,
  initialSession,
  initialCharId = null,
  initialIsHost = false,
  forceSelect = false,
  initialPrepMode = false,
}: PlayroomClientProps) {
  // Filter to active characters for tonight's session
  const activeCharacters = useMemo(() => {
    const filtered = characters.filter(c => c.profile_data?.is_active_in_session !== false);
    return filtered.length > 0 ? filtered : characters;
  }, [characters]);

  // Pre-Party "First Glance" Mode (Character Intro, What to Wear + 3 Outfit Photos & What to Bring)
  // vs. Live Game Night "Playing Now" Portal (Secret Cheat-Sheet, Connections, Round 1+ Clues & Voting)
  const [isPrepMode, setIsPrepMode] = useState<boolean>(initialPrepMode);
  const [prepTab, setPrepTab] = useState<'invite' | 'guests' | 'bring'>('invite');
  const [prepSheetTab, setPrepSheetTab] = useState<'character' | 'details' | 'guests'>('character');

  // Host-only mode (hides Console & Next buttons from regular guest phones)
  const [isHostMode, setIsHostMode] = useState<boolean>(() =>
    Boolean(initialIsHost || initialSession?.isHost)
  );

  // Persistent browser player token for character claiming
  const [playerToken, setPlayerToken] = useState<string>('');
  const [claimedCharacters, setClaimedCharacters] = useState<
    Record<string, { token: string; claimedAt: string }>
  >(initialSession?.claimedCharacters || {});
  const [detectiveGuests, setDetectiveGuests] = useState<DetectiveGuestItem[]>(
    initialSession?.detectiveGuests || []
  );
  const [isJoiningDetective, setIsJoiningDetective] = useState<boolean>(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaimingCharId, setIsClaimingCharId] = useState<string | null>(null);

  // Guard ref so initial forceSelect / localStorage hydration only runs once per mystery.id
  // and NEVER resets selectedCharId after a background server action or polling update
  const hasInitializedSelectionRef = useRef<string | null>(null);

  // Selected character (or 'sleuth-guest' if joining via PIN as Detective [Name])
  const [selectedCharId, setSelectedCharId] = useState<string | null>(() => {
    if (forceSelect) return null;
    if (initialCharId && characters.some(c => c.id === initialCharId)) {
      return initialCharId;
    }
    return null;
  });
  const [customSleuthName, setCustomSleuthName] = useState('');

  // Track which clues this player has viewed so we can badge unread clues
  const [viewedClueIds, setViewedClueIds] = useState<string[]>([]);
  // Personal Detective Notebook: Clue Tags ('key' | 'red_herring' | 'alibi') & Clue Notes persisted in localStorage
  const [clueTags, setClueTags] = useState<
    Record<string, 'key' | 'red_herring' | 'alibi' | undefined>
  >({});
  const [clueNotes, setClueNotes] = useState<Record<string, string>>({});
  const [clueSuspects, setClueSuspects] = useState<Record<string, string[]>>({});
  const [clueTagFilter, setClueTagFilter] = useState<
    'all' | 'key' | 'alibi' | 'red_herring' | 'untagged'
  >('all');
  const [stickyClueId, setStickyClueId] = useState<string | null>(null);
  const [notebookSortMode, setNotebookSortMode] = useState<'round' | 'timeline'>('round');
  const [notebookLoaded, setNotebookLoaded] = useState<boolean>(false);

  const toggleClueSuspect = useCallback((clueId: string, suspectId: string) => {
    setClueSuspects(prev => {
      const current = prev[clueId] || [];
      const next = current.includes(suspectId)
        ? current.filter(id => id !== suspectId)
        : [...current, suspectId];
      return { ...prev, [clueId]: next };
    });
  }, []);

  const toggleQuickNoteChip = useCallback((clueId: string, chip: string) => {
    setClueNotes(prev => {
      const current = prev[clueId] || '';
      const hasChip = current.includes(chip);
      const next = hasChip
        ? current
            .replace(chip, '')
            .replace(/;\s*;/g, ';')
            .replace(/^;\s*|\s*;\s*$/g, '')
            .trim()
        : current.trim()
        ? `${current.trim()}; ${chip}`
        : chip;
      return { ...prev, [clueId]: next };
    });
  }, []);

  const extractClueTimestampInfo = useCallback(
    (c: any): { label: string | null; sortMinutes: number } => {
      const raw = `${c?.title || ''} ${c?.description || ''}`;
      const match = raw.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(AM|PM)\b/i);
      if (!match) {
        return { label: null, sortMinutes: 99999 };
      }
      let hours = parseInt(match[1], 10);
      const minsStr = match[2] || '00';
      const mins = parseInt(minsStr, 10);
      const meridiem = (match[3] || 'PM').toUpperCase();
      if (meridiem === 'PM' && hours < 12) hours += 12;
      if (meridiem === 'AM' && hours === 12) hours = 0;
      const sortMinutes = hours < 6 ? (hours + 24) * 60 + mins : hours * 60 + mins;
      return {
        label: `${match[1]}:${minsStr} ${meridiem}`,
        sortMinutes,
      };
    },
    []
  );

  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Initialize playerToken, saved character, host mode, viewed clues, and detective notebook from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = `bpm_player_token_${mystery.id}`;
    let token = window.localStorage.getItem(storageKey);
    if (!token) {
      token = `plr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      window.localStorage.setItem(storageKey, token);
    }
    setPlayerToken(token);

    const savedHostMode = window.localStorage.getItem(`bpm_host_mode_${mystery.id}`);
    if (!initialIsHost) {
      // Unauthenticated guests are never the host
      setIsHostMode(false);
    } else if (savedHostMode === '0') {
      setIsHostMode(false);
    } else {
      setIsHostMode(true);
    }

    try {
      const savedViewed = window.localStorage.getItem(`bpm_viewed_clues_${mystery.id}`);
      if (savedViewed) {
        const parsed = JSON.parse(savedViewed);
        if (Array.isArray(parsed)) setViewedClueIds(parsed);
      }
      const savedTags = window.localStorage.getItem(`bpm_clue_tags_${mystery.id}`);
      if (savedTags) {
        const parsed = JSON.parse(savedTags);
        if (parsed && typeof parsed === 'object') setClueTags(parsed);
      }
      const savedNotes = window.localStorage.getItem(`bpm_clue_notes_${mystery.id}`);
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes);
        if (parsed && typeof parsed === 'object') setClueNotes(parsed);
      }
      const savedSuspects = window.localStorage.getItem(`bpm_clue_suspects_${mystery.id}`);
      if (savedSuspects) {
        const parsed = JSON.parse(savedSuspects);
        if (parsed && typeof parsed === 'object') setClueSuspects(parsed);
      }
    } catch {
      // Ignore
    } finally {
      setNotebookLoaded(true);
    }

    const savedDetectiveName = window.localStorage.getItem(`bpm_detective_name_${mystery.id}`);
    if (savedDetectiveName) {
      setCustomSleuthName(savedDetectiveName);
    }

    // Only initialize character selection ONCE per mystery.id on initial mount
    if (hasInitializedSelectionRef.current === mystery.id) {
      return;
    }
    hasInitializedSelectionRef.current = mystery.id;

    const savedCharKey = `bpm_selected_char_${mystery.id}`;
    if (forceSelect && !initialCharId) {
      setSelectedCharId(null);
      return;
    }
    if (initialCharId && characters.some(c => c.id === initialCharId)) {
      setSelectedCharId(initialCharId);
      return;
    }
    const savedCharId = window.localStorage.getItem(savedCharKey);
    if (!initialCharId && savedCharId) {
      if (savedCharId === 'sleuth-guest') {
        setSelectedCharId('sleuth-guest');
      } else if (characters.some(c => c.id === savedCharId)) {
        setSelectedCharId(savedCharId);
      }
    }
  }, [mystery.id, initialCharId, initialIsHost, forceSelect, characters]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_tags_${mystery.id}`, JSON.stringify(clueTags));
    } catch {
      // Non-fatal
    }
  }, [clueTags, notebookLoaded, mystery.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_notes_${mystery.id}`, JSON.stringify(clueNotes));
    } catch {
      // Non-fatal
    }
  }, [clueNotes, notebookLoaded, mystery.id]);

  useEffect(() => {
    if (!notebookLoaded || typeof window === 'undefined' || !mystery.id) return;
    try {
      window.localStorage.setItem(`bpm_clue_suspects_${mystery.id}`, JSON.stringify(clueSuspects));
    } catch {
      // Non-fatal
    }
  }, [clueSuspects, notebookLoaded, mystery.id]);

  const handleToggleHostMode = () => {
    if (!initialIsHost) return;
    setIsHostMode(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`bpm_host_mode_${mystery.id}`, next ? '1' : '0');
      }
      return next;
    });
  };

  // Live session state
  const [currentRound, setCurrentRound] = useState<number>(
    initialSession?.currentRound ?? mystery.current_round ?? 0
  );
  const [pin] = useState<string>(initialSession?.pin || '482910');
  const [partyDetails, setPartyDetails] = useState<PartyEventDetails | null>(
    initialSession?.partyDetails || null
  );
  const [prepConfirmedCharacters, setPrepConfirmedCharacters] = useState<
    Record<string, { confirmedAt: string; guestName?: string }>
  >(initialSession?.prepConfirmedCharacters || {});
  const [isConfirmingPrepRead, setIsConfirmingPrepRead] = useState<boolean>(false);
  const [guestBringChecked, setGuestBringChecked] = useState<string[]>([]);
  const [submissions, setSubmissions] = useState<RoundSubmission[]>(
    initialSession?.submissions || []
  );
  const [sharedTheoryRounds, setSharedTheoryRounds] = useState<number[]>(
    initialSession?.sharedTheoryRounds || []
  );
  const [revealMode, setRevealMode] = useState<'hidden' | 'phone_free' | 'shared_with_guests'>(
    initialSession?.revealMode || 'hidden'
  );
  const [detectiveLeaderboard, setDetectiveLeaderboard] = useState<any[]>(
    initialSession?.detectiveLeaderboard || []
  );
  const [mostSuspectedList, setMostSuspectedList] = useState<any[]>(
    initialSession?.mostSuspectedList || []
  );
  const [solutionData, setSolutionData] = useState<any>(initialSession?.solutionData || null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedBring = window.localStorage.getItem(`bpm_guest_bring_${mystery.id}`);
      if (savedBring) {
        const parsed = JSON.parse(savedBring);
        if (Array.isArray(parsed)) setGuestBringChecked(parsed);
      }
    } catch {
      // ignore
    }
  }, [mystery.id]);

  const handleToggleGuestBringItem = useCallback(
    (item: string) => {
      setGuestBringChecked(prev => {
        const next = prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item];
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(`bpm_guest_bring_${mystery.id}`, JSON.stringify(next));
          } catch {
            // ignore
          }
        }
        return next;
      });
    },
    [mystery.id]
  );

  const handleConfirmPrepRead = useCallback(
    async (charId: string, guestName?: string) => {
      setIsConfirmingPrepRead(true);
      setPrepConfirmedCharacters(prev => ({
        ...prev,
        [charId]: { confirmedAt: new Date().toISOString(), guestName },
      }));
      try {
        const res = await confirmCharacterPrepReadAction(mystery.id, charId, guestName);
        if (res.prepConfirmedCharacters) {
          setPrepConfirmedCharacters(res.prepConfirmedCharacters);
        }
      } finally {
        setIsConfirmingPrepRead(false);
      }
    },
    [mystery.id]
  );

  // Build Google Calendar & Apple/Outlook (.ics) event data from partyDetails
  const parseCalendarDates = useCallback(() => {
    const rawDate = (partyDetails?.partyDate || '').trim();
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    let day = new Date().getDate() + 3;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
      const parts = rawDate.split('-').map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }
    let startHour = 19;
    let startMin = 0;
    const rawTime = (partyDetails?.arrivalTime || '7:00 PM').trim();
    const tm = rawTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (tm) {
      let h = parseInt(tm[1], 10);
      const m = parseInt(tm[2] || '0', 10);
      const mer = (tm[3] || '').toUpperCase();
      if (mer === 'PM' && h < 12) h += 12;
      if (mer === 'AM' && h === 12) h = 0;
      startHour = h;
      startMin = m;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const startDt = new Date(year, month - 1, day, startHour, startMin, 0);
    const endDt = new Date(startDt.getTime() + 3 * 60 * 60 * 1000);
    const fmtLocal = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
        d.getMinutes()
      )}00`;
    return {
      startStr: fmtLocal(startDt),
      endStr: fmtLocal(endDt),
    };
  }, [partyDetails]);

  const buildGoogleCalendarUrl = useCallback(
    (roleLabel?: string) => {
      const { startStr, endStr } = parseCalendarDates();
      const title = `🕵️ Murder Mystery Party: ${mystery.title}${
        roleLabel ? ` (Playing ${roleLabel})` : ''
      }`;
      const bringList =
        partyDetails?.whatToBringItems && partyDetails.whatToBringItems.length > 0
          ? partyDetails.whatToBringItems
          : ['📱 Charged phone or device (50%+ battery)', '👗 Your character outfit & costume vibe'];
      const sheetUrl =
        typeof window !== 'undefined'
          ? window.location.href
          : `https://www.backpocketmysteries.com/${locale}/play/${mystery.id}?prep=1`;
      const descLines = [
        `Murder Mystery Party: ${mystery.title}`,
        roleLabel ? `Your Character Role: ${roleLabel}` : '',
        partyDetails?.arrivalTime
          ? `Arrival Time: ${partyDetails.arrivalTime}${
              partyDetails.gameStartTime ? ` (Mystery starts at ${partyDetails.gameStartTime})` : ''
            }`
          : '',
        partyDetails?.foodAndDrinkVibe
          ? `Food & Drinks: ${getFoodVibeDisplay(partyDetails.foodAndDrinkVibe)}`
          : '',
        partyDetails?.hostNotes ? `Host Note: ${partyDetails.hostNotes}` : '',
        `What to Bring:\n${bringList.map(i => `- ${i}`).join('\n')}`,
        `Party Game PIN: ${pin.slice(0, 3)} ${pin.slice(3)}`,
        `Your Pre-Party First Glance Sheet: ${sheetUrl}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: title,
        dates: `${startStr}/${endStr}`,
        details: descLines,
        location: partyDetails?.location || '',
      });
      return `https://calendar.google.com/calendar/render?${params.toString()}`;
    },
    [parseCalendarDates, mystery.title, mystery.id, locale, partyDetails, pin]
  );

  const handleDownloadIcsCalendar = useCallback(
    (roleLabel?: string) => {
      if (typeof window === 'undefined') return;
      const { startStr, endStr } = parseCalendarDates();
      const title = `Murder Mystery Party: ${mystery.title}${
        roleLabel ? ` (${roleLabel})` : ''
      }`;
      const bringList =
        partyDetails?.whatToBringItems && partyDetails.whatToBringItems.length > 0
          ? partyDetails.whatToBringItems
          : ['Charged phone or device (50%+ battery)', 'Your character outfit & costume vibe'];
      const desc = [
        `Murder Mystery Party: ${mystery.title}`,
        roleLabel ? `Your Role: ${roleLabel}` : '',
        partyDetails?.foodAndDrinkVibe
          ? `Food & Drinks: ${getFoodVibeDisplay(partyDetails.foodAndDrinkVibe)}`
          : '',
        partyDetails?.hostNotes ? `Host Note: ${partyDetails.hostNotes}` : '',
        `What to Bring: ${bringList.join(', ')}`,
        `Party Game PIN: ${pin.slice(0, 3)} ${pin.slice(3)}`,
        `Character Sheet: ${window.location.href}`,
      ]
        .filter(Boolean)
        .join('\\n');

      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Back Pocket Mysteries//Party Invite//EN',
        'BEGIN:VEVENT',
        `UID:bpm-${mystery.id}@backpocketmysteries.com`,
        `DTSTAMP:${startStr}Z`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${title.replace(/[,;]/g, ' ')}`,
        `LOCATION:${(partyDetails?.location || '').replace(/[,;]/g, ' ')}`,
        `DESCRIPTION:${desc}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${mystery.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-party.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    [parseCalendarDates, mystery.title, mystery.id, partyDetails, pin]
  );

  // Host Console Modal & Guardrail Confirmation State
  const [isHostPanelOpen, setIsHostPanelOpen] = useState<boolean>(false);
  const [pendingNextConfirm, setPendingNextConfirm] = useState<boolean>(false);
  const [hostShowWhoSaidWho, setHostShowWhoSaidWho] = useState<boolean>(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState<boolean>(false);
  const [isRoomCastOpen, setIsRoomCastOpen] = useState<boolean>(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [showHostScriptStrip, setShowHostScriptStrip] = useState<boolean>(true);

  // Kahoot-style Round Unlock Alert Toast for Guests
  const prevRoundRef = useRef<number>(currentRound);
  const [roundUnlockToast, setRoundUnlockToast] = useState<number | null>(null);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'relations' | 'clues' | 'reveal'>(
    currentRound >= 5 ? 'reveal' : currentRound >= 1 ? 'clues' : 'profile'
  );

  // Swipeable Clue Carousel / Grid State
  const [selectedClueRoundFilter, setSelectedClueRoundFilter] = useState<number | 'all'>(
    Math.max(1, Math.min(4, Math.floor(currentRound || 1)))
  );
  const [clueViewMode, setClueViewMode] = useState<'swipe' | 'grid'>('swipe');
  const [clueSlideIndex, setClueSlideIndex] = useState<number>(0);
  const [selectedClueModalIndex, setSelectedClueModalIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [expandedRevealBeats, setExpandedRevealBeats] = useState<number[]>([1]);
  const [revealSubPage, setRevealSubPage] = useState<'solution' | 'stats'>('solution');

  const toggleRevealBeat = useCallback((beatNum: number) => {
    setExpandedRevealBeats(prev =>
      prev.includes(beatNum) ? prev.filter(n => n !== beatNum) : [...prev, beatNum]
    );
  }, []);

  // Between-Round Theory ("Who & Why") Form State
  const [accusedCharId, setAccusedCharId] = useState<string>('');
  const [accusationReason, setAccusationReason] = useState<string>('');
  const [isSubmittingTheory, setIsSubmittingTheory] = useState<boolean>(false);
  const [theorySavedNotice, setTheorySavedNotice] = useState<boolean>(false);

  // 5-Star Guest Review Form & Review-Gated Stats Unlock State
  const [reviews, setReviews] = useState<any[]>(initialSession?.reviews || []);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewPhotoDataUrl, setReviewPhotoDataUrl] = useState<string>('');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState<boolean>(false);
  const reviewPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [reviewBonusEarned, setReviewBonusEarned] = useState<boolean>(false);
  const [copiedPromoCode, setCopiedPromoCode] = useState<boolean>(false);
  const [isStoryCardModalOpen, setIsStoryCardModalOpen] = useState<boolean>(false);
  const [isExportingStoryCard, setIsExportingStoryCard] = useState<boolean>(false);
  const [storyCardUsePartyPhoto, setStoryCardUsePartyPhoto] = useState<boolean>(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState<boolean>(false);

  const REVIEW_QUICK_PROMPTS = useMemo(
    () => [
      'Best plot twist',
      'Whole table was crying laughing',
      'Everyone went all-out on costumes',
      'Fooled until the final round',
      'Best dinner party night',
      'Stayed in character all night',
    ],
    []
  );

  const handleToggleQuickPrompt = useCallback((phrase: string) => {
    setReviewComment(prev => {
      const current = prev.trim();
      if (!current) return `${phrase}.`;
      if (current.toLowerCase().includes(phrase.toLowerCase())) {
        const regex = new RegExp(`\\s*${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?`, 'gi');
        return current.replace(regex, '').trim();
      }
      const sep = current.endsWith('.') || current.endsWith('!') ? ' ' : '. ';
      return `${current}${sep}${phrase}.`;
    });
  }, []);

  const handleCopyRewardPromoCode = useCallback(async () => {
    const code = 'SLEUTH15';
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
    } catch {
      // fallback
    }
    setCopiedPromoCode(true);
    setTimeout(() => setCopiedPromoCode(false), 2600);
  }, []);

  // Restore review-unlock status for this device/guest if they already left a review tonight
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('subpage') === 'stats') {
        setRevealSubPage('stats');
      }
      const unlocked = window.localStorage.getItem(`bpm_review_unlocked_${mystery.id}`);
      if (unlocked === '1' || params.get('unlocked') === '1') {
        setReviewSubmitted(true);
      }
      const bonus = window.localStorage.getItem(`bpm_review_bonus_${mystery.id}`);
      if (bonus === '1' || params.get('unlocked') === '1') {
        setReviewBonusEarned(true);
      }
      if (params.get('story') === '1') {
        setIsStoryCardModalOpen(true);
      }
    } catch {
      // ignore
    }
  }, [mystery.id]);

  // Client-side party photo compression so mobile camera shots upload fast
  const handleReviewPhotoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressingPhoto(true);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        setIsCompressingPhoto(false);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        try {
          const maxDim = 1000;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width >= height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.82);
            setReviewPhotoDataUrl(compressed);
          } else {
            setReviewPhotoDataUrl(dataUrl);
          }
        } catch {
          setReviewPhotoDataUrl(dataUrl);
        } finally {
          setIsCompressingPhoto(false);
        }
      };
      img.onerror = () => {
        setReviewPhotoDataUrl(dataUrl);
        setIsCompressingPhoto(false);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => setIsCompressingPhoto(false);
    reader.readAsDataURL(file);
  }, []);

  // Copy or native-share the clean guest lobby link (never requires login or sign-up)
  const handleShareOrCopyGuestLink = useCallback(
    async (preferNativeShare = false) => {
      const cleanGuestUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/${locale}/play/${mystery.id}`
          : `/${locale}/play/${mystery.id}`;

      if (preferNativeShare && typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: mystery.title,
            text: `You are invited to our murder mystery evening: ${mystery.title}. Open your character dossier and live game room below (Game PIN: ${pin.slice(0, 3)} ${pin.slice(3)} — no login required):`,
            url: cleanGuestUrl,
          });
          return;
        } catch {
          // Fallback to clipboard copy
        }
      }

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(cleanGuestUrl);
        } else {
          throw new Error('Fallback');
        }
      } catch {
        if (typeof document !== 'undefined') {
          const ta = document.createElement('textarea');
          ta.value = cleanGuestUrl;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          try {
            document.execCommand('copy');
          } catch {
            // ignore
          }
          document.body.removeChild(ta);
        }
      }
      setCopiedGuestLink(true);
      setTimeout(() => setCopiedGuestLink(false), 2400);
    },
    [locale, mystery.id, mystery.title, pin]
  );

  const selectedChar = useMemo(
    () => activeCharacters.find(c => c.id === selectedCharId) || null,
    [activeCharacters, selectedCharId]
  );
  const isClueOnlySleuth = selectedCharId === 'sleuth-guest';

  const parseCharacter = useCallback((char: Character) => {
    const displayName = getCharacterDisplayName(char);
    const roleTitle = getCharacterRoleTitle(char);
    const guestName =
      (char.profile_data?.guest_name || '').trim() ||
      (displayName.toLowerCase() !== roleTitle.toLowerCase() ? displayName : '');
    return {
      name: displayName,
      archetype: roleTitle,
      guestName,
    };
  }, []);

  // Refresh live session from server
  const refreshGameSession = useCallback(async () => {
    setIsRefreshingSession(true);
    try {
      const latest = await getGameSessionAction(mystery.id);
      if (!('error' in latest)) {
        setCurrentRound(latest.currentRound);
        setClaimedCharacters(latest.claimedCharacters || {});
        setDetectiveGuests(latest.detectiveGuests || []);
        if (latest.partyDetails) {
          setPartyDetails(latest.partyDetails);
        }
        if (latest.prepConfirmedCharacters) {
          setPrepConfirmedCharacters(latest.prepConfirmedCharacters);
        }
        setSubmissions(latest.submissions || []);
        setSharedTheoryRounds(latest.sharedTheoryRounds || []);
        setRevealMode(latest.revealMode || 'hidden');
        setReviews(latest.reviews || []);
        setDetectiveLeaderboard(latest.detectiveLeaderboard || []);
        setMostSuspectedList(latest.mostSuspectedList || []);
        if (latest.solutionData) {
          setSolutionData(latest.solutionData);
        }
      }
    } finally {
      setIsRefreshingSession(false);
    }
  }, [mystery.id]);

  // Poll every 6 seconds so guests see claimed characters, new rounds & shared tallies automatically
  useEffect(() => {
    const interval = setInterval(() => {
      refreshGameSession();
    }, 6000);
    return () => clearInterval(interval);
  }, [refreshGameSession]);

  // Toggle between Pre-Party "First Glance" Mode (?prep=1) and Live Game Night Portal
  const handleTogglePrepMode = useCallback(
    (nextPrep: boolean) => {
      setIsPrepMode(nextPrep);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.delete('select');
        if (nextPrep) {
          url.searchParams.set('prep', '1');
        } else {
          url.searchParams.delete('prep');
          url.searchParams.delete('mode');
        }
        if (selectedCharId && selectedCharId !== 'sleuth-guest') {
          url.searchParams.set('char', selectedCharId);
        }
        window.history.replaceState(null, '', url.pathname + url.search);
        window.scrollTo({ top: 0, behavior: 'instant' });
      }
    },
    [selectedCharId]
  );

  // Select a character from the Character Selection screen
  const handleSelectCharacterInLobby = async (charId: string) => {
    setClaimError(null);
    setSelectedCharId(charId);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`bpm_selected_char_${mystery.id}`, charId);
      // Strip ?select=1 from URL so refreshing or re-rendering never kicks back to the grid
      const url = new URL(window.location.href);
      url.searchParams.delete('select');
      url.searchParams.set('char', charId);
      if (isPrepMode) {
        url.searchParams.set('prep', '1');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // In Pre-Party "First Glance" mode, guests are just viewing their outfit & character sheet ahead of time
    // so we don't lock the live party seat yet.
    if (isPrepMode) {
      return;
    }

    const activeToken =
      playerToken ||
      `plr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    if (!playerToken) {
      setPlayerToken(activeToken);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`bpm_player_token_${mystery.id}`, activeToken);
      }
    }

    setIsClaimingCharId(charId);
    // Optimistically record selection and open character immediately
    setClaimedCharacters(prev => {
      const next = { ...prev };
      for (const [k, v] of Object.entries(next)) {
        if (v.token === activeToken) delete next[k];
      }
      next[charId] = { token: activeToken, claimedAt: new Date().toISOString() };
      return next;
    });

    // Always open on the player's Character Sheet ('profile') first when they claim their role
    setActiveTab('profile');

    try {
      const res = await claimCharacterInLobbyAction(mystery.id, charId, activeToken);
      if (res.claimedCharacters) {
        setClaimedCharacters(res.claimedCharacters);
      }
      if (res.detectiveGuests) {
        setDetectiveGuests(res.detectiveGuests);
      }
    } finally {
      setIsClaimingCharId(null);
    }
  };

  // Join the party as an Extra Guest ("Detective [Name]") without taking a suspect character slot
  const handleJoinAsDetective = async (nameInput?: string) => {
    const raw = (nameInput ?? customSleuthName)
      .replace(/^🕵️\s*/i, '')
      .replace(/^detective\s+/i, '')
      .trim();
    const cleanFirstName = raw || 'Guest';
    setCustomSleuthName(cleanFirstName);

    const activeToken =
      playerToken ||
      `plr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    if (!playerToken) {
      setPlayerToken(activeToken);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(`bpm_player_token_${mystery.id}`, activeToken);
      }
    }

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`bpm_detective_name_${mystery.id}`, cleanFirstName);
      window.localStorage.setItem(`bpm_selected_char_${mystery.id}`, 'sleuth-guest');
      const url = new URL(window.location.href);
      url.searchParams.delete('select');
      url.searchParams.delete('char');
      window.history.replaceState(null, '', url.pathname + url.search);
    }

    setSelectedCharId('sleuth-guest');
    setIsRoomCastOpen(false);
    if (currentRound >= 5) {
      setActiveTab('reveal');
    } else if (currentRound >= 1) {
      setActiveTab('clues');
    } else {
      setActiveTab('profile');
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }

    setIsJoiningDetective(true);
    try {
      const res = await registerDetectiveGuestAction(mystery.id, cleanFirstName, activeToken);
      if (res.detectiveGuests) {
        setDetectiveGuests(res.detectiveGuests);
      }
      if (res.claimedCharacters) {
        setClaimedCharacters(res.claimedCharacters);
      }
    } finally {
      setIsJoiningDetective(false);
    }
  };

  // Release character lock when switching character
  const handleSwitchCharacter = async () => {
    setSelectedCharId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`bpm_selected_char_${mystery.id}`);
      const url = new URL(window.location.href);
      url.searchParams.delete('char');
      url.searchParams.delete('characterId');
      window.history.replaceState(null, '', url.pathname + url.search);
    }
    if (!isPrepMode && playerToken) {
      setClaimedCharacters(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(next)) {
          if (v.token === playerToken) delete next[k];
        }
        return next;
      });
      const res = await claimCharacterInLobbyAction(mystery.id, null, playerToken);
      if (res.claimedCharacters) {
        setClaimedCharacters(res.claimedCharacters);
      }
    }
  };

  // Host action to unlock all claimed characters
  const handleHostResetClaims = async () => {
    setIsRefreshingSession(true);
    try {
      const updated = await updateHostGameControlAction(mystery.id, {
        resetClaimedCharacters: true,
      });
      if (!('error' in updated)) {
        setClaimedCharacters(updated.claimedCharacters || {});
        setDetectiveGuests(updated.detectiveGuests || []);
      }
    } finally {
      setIsRefreshingSession(false);
    }
  };

  // Half-step game flow helpers:
  // 0 = 1. Lobby
  // 1 = 2. Round 1 Clues, 1.5 = 3. Guess 1
  // 2 = 4. Round 2 Clues, 2.5 = 5. Guess 2
  // 3 = 6. Round 3 Clues, 3.5 = 7. Guess 3
  // 4 = 8. Round 4 Clues, 4.5 = 9. Guess 4 (only if maxClueRound === 4)
  // 5 = Reveal
  const maxClueRound = useMemo(() => {
    const highest = clues.reduce((acc, c) => Math.max(acc, c.round_number || 1), 3);
    return Math.max(3, Math.min(4, highest));
  }, [clues]);

  const availableClueRounds = useMemo(
    () => Array.from({ length: maxClueRound }, (_, i) => i + 1),
    [maxClueRound]
  );

  const unlockedClueRound = Math.floor(currentRound);
  const isGuessStep = Math.round((currentRound % 1) * 10) === 5;

  // Keep clue round filter synced & trigger Kahoot-style Unlock Alert when host advances round or opens Guess voting
  useEffect(() => {
    const prevUnlockedRound = Math.floor(prevRoundRef.current);
    const nextUnlockedRound = Math.floor(currentRound);
    const nextIsGuess = Math.round((currentRound % 1) * 10) === 5;

    if (currentRound > prevRoundRef.current && currentRound >= 1) {
      setRoundUnlockToast(currentRound);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(80);
        } catch {
          // Ignore
        }
      }
      const timer = setTimeout(() => setRoundUnlockToast(null), 8000);
      prevRoundRef.current = currentRound;

      if (nextUnlockedRound >= 1 && nextUnlockedRound <= maxClueRound) {
        setActiveTab('clues');
        setSelectedClueRoundFilter(nextUnlockedRound);
        if (!nextIsGuess && nextUnlockedRound > prevUnlockedRound) {
          setClueSlideIndex(0);
        }
        if (nextIsGuess && typeof document !== 'undefined') {
          setTimeout(() => {
            const el = document.getElementById('round-suspect-vote-box');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 150);
        }
      } else if (currentRound >= 5) {
        setActiveTab('reveal');
      }
      return () => clearTimeout(timer);
    }

    prevRoundRef.current = currentRound;
    if (nextUnlockedRound >= 1 && nextUnlockedRound <= maxClueRound) {
      setSelectedClueRoundFilter(nextUnlockedRound);
      if (!nextIsGuess && nextUnlockedRound !== prevUnlockedRound) {
        setClueSlideIndex(0);
      }
    }
    if (currentRound >= 5) {
      setActiveTab('reveal');
    }
  }, [currentRound, maxClueRound]);

  // Pre-fill existing submission for the active round when switching rounds
  const activeVotingRound = Math.max(1, Math.min(maxClueRound, unlockedClueRound || 1));
  const rawDetectiveFirstName = customSleuthName
    .replace(/^🕵️\s*/i, '')
    .replace(/^detective\s+/i, '')
    .trim();
  const formattedDetectiveName = rawDetectiveFirstName
    ? `Detective ${rawDetectiveFirstName}`
    : 'Detective Guest';
  const detectiveSlug =
    rawDetectiveFirstName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'guest';

  const voterId =
    selectedChar?.id ||
    (isClueOnlySleuth
      ? playerToken
        ? `detective-${playerToken}`
        : `detective-${detectiveSlug}`
      : '');
  const voterDisplayName = selectedChar
    ? parseCharacter(selectedChar).name
    : formattedDetectiveName;

  useEffect(() => {
    if (!voterId) return;
    const existing = submissions.find(
      s => s.round === activeVotingRound && s.voterCharId === voterId
    );
    if (existing) {
      setAccusedCharId(existing.suspectCharId);
      setAccusationReason(existing.reason);
    } else {
      setAccusedCharId('');
      setAccusationReason('');
    }
  }, [activeVotingRound, voterId, submissions]);

  // Pre-fill review name
  useEffect(() => {
    if (selectedChar && !reviewName) {
      setReviewName(parseCharacter(selectedChar).name);
    } else if (isClueOnlySleuth && !reviewName) {
      setReviewName(formattedDetectiveName);
    }
  }, [selectedChar, isClueOnlySleuth, formattedDetectiveName, parseCharacter, reviewName]);

  // Clues for the selected round filter (supports single round 1..4 OR 'all' unlocked rounds)
  const allUnlockedCluesForSelectedRound = useMemo(() => {
    if (unlockedClueRound <= 0) return [];
    const allUnlocked = clues.filter(
      c => (c.round_number || 1) <= Math.min(maxClueRound, unlockedClueRound)
    );
    if (selectedClueRoundFilter === 'all') {
      return allUnlocked;
    }
    const roundClues = clues.filter(c => (c.round_number || 1) === selectedClueRoundFilter);
    return roundClues.length > 0 ? roundClues : allUnlocked;
  }, [clues, unlockedClueRound, selectedClueRoundFilter, maxClueRound]);

  const unlockedCluesForSelectedRound = useMemo(() => {
    if (clueTagFilter === 'all') return allUnlockedCluesForSelectedRound;
    return allUnlockedCluesForSelectedRound.filter(c => {
      if (stickyClueId && c.id === stickyClueId) return true;
      const t = clueTags[c.id];
      if (clueTagFilter === 'untagged') return !t;
      return t === clueTagFilter;
    });
  }, [allUnlockedCluesForSelectedRound, clueTagFilter, clueTags, stickyClueId]);

  const safeSlideIndex = Math.min(
    clueSlideIndex,
    Math.max(0, unlockedCluesForSelectedRound.length - 1)
  );
  const currentSlideClue = unlockedCluesForSelectedRound[safeSlideIndex] || null;

  // Mark currentSlideClue as viewed when the player is on the Clues tab in an active round
  useEffect(() => {
    if (activeTab === 'clues' && unlockedClueRound >= 1 && currentSlideClue?.id) {
      setViewedClueIds(prev => {
        if (prev.includes(currentSlideClue.id)) return prev;
        const next = [...prev, currentSlideClue.id];
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(`bpm_viewed_clues_${mystery.id}`, JSON.stringify(next));
        }
        return next;
      });
    }
  }, [activeTab, unlockedClueRound, currentSlideClue?.id, mystery.id]);

  // Helper to count unread clues per round & overall
  const getUnreadCountForRound = useCallback(
    (rNum: number) => {
      if (unlockedClueRound < rNum) return 0;
      const roundClues = clues.filter(c => (c.round_number || 1) === rNum);
      return roundClues.filter(c => !viewedClueIds.includes(c.id)).length;
    },
    [clues, unlockedClueRound, viewedClueIds]
  );

  const totalUnreadUnlockedClues = useMemo(() => {
    if (unlockedClueRound <= 0) return 0;
    const allUnlocked = clues.filter(
      c => (c.round_number || 1) <= Math.min(maxClueRound, unlockedClueRound)
    );
    return allUnlocked.filter(c => !viewedClueIds.includes(c.id)).length;
  }, [clues, unlockedClueRound, viewedClueIds, maxClueRound]);

  const handlePrevClue = () => {
    setStickyClueId(null);
    if (unlockedCluesForSelectedRound.length <= 1) return;
    setClueSlideIndex(prev =>
      prev <= 0 ? unlockedCluesForSelectedRound.length - 1 : prev - 1
    );
  };

  const handleNextClue = () => {
    setStickyClueId(null);
    if (unlockedCluesForSelectedRound.length <= 1) return;
    setClueSlideIndex(prev =>
      prev >= unlockedCluesForSelectedRound.length - 1 ? 0 : prev + 1
    );
  };

  // Touch swipe handlers for clue deck
  const onTouchStartCard = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const onTouchEndCard = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (deltaX > 45) {
      handlePrevClue();
    } else if (deltaX < -45) {
      handleNextClue();
    }
    setTouchStartX(null);
  };

  // Submit Between-Round Theory ("Who & Why")
  const handleTheorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accusedCharId || !voterId) return;

    const suspectObj = activeCharacters.find(c => c.id === accusedCharId);
    if (!suspectObj) return;
    const { name: sName, archetype: sRole } = parseCharacter(suspectObj);

    const sanitizedClueTags: Record<string, 'key' | 'red_herring' | 'alibi'> = {};
    for (const [k, v] of Object.entries(clueTags)) {
      if (v === 'key' || v === 'red_herring' || v === 'alibi') {
        sanitizedClueTags[k] = v;
      }
    }

    setIsSubmittingTheory(true);
    setTheorySavedNotice(false);
    try {
      const res = await submitRoundTheoryAction(mystery.id, {
        round: activeVotingRound,
        voterCharId: voterId,
        voterName: voterDisplayName,
        suspectCharId: accusedCharId,
        suspectName: `${sName} (${sRole})`,
        reason: accusationReason || 'Acting suspicious!',
        clueTags: sanitizedClueTags,
      });
      if (res.submissions) {
        setSubmissions(res.submissions);
        setTheorySavedNotice(true);
        setTimeout(() => setTheorySavedNotice(false), 3500);
        void refreshGameSession();
      }
    } finally {
      setIsSubmittingTheory(false);
    }
  };

  // Host Control Actions
  const handleHostSetRound = async (newRound: number) => {
    // Optimistic stage & tab update for instant UI feedback
    setCurrentRound(newRound);
    const floorRound = Math.floor(newRound);
    if (floorRound >= 1 && floorRound <= maxClueRound) {
      setSelectedClueRoundFilter(floorRound);
      if (Math.round((newRound % 1) * 10) !== 5) {
        setClueSlideIndex(0);
      }
      setActiveTab('clues');
    } else if (newRound >= 5) {
      setActiveTab('reveal');
    }

    setIsRefreshingSession(true);
    try {
      const updated = await updateHostGameControlAction(mystery.id, {
        currentRound: newRound,
      });
      if (!('error' in updated)) {
        setCurrentRound(updated.currentRound);
        setClaimedCharacters(updated.claimedCharacters || {});
        setSubmissions(updated.submissions || []);
        setSharedTheoryRounds(updated.sharedTheoryRounds || []);
        setRevealMode(updated.revealMode || 'hidden');
        setDetectiveLeaderboard(updated.detectiveLeaderboard || []);
        setMostSuspectedList(updated.mostSuspectedList || []);
        if (updated.solutionData) setSolutionData(updated.solutionData);
      }
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleHostToggleShareRound = async (roundNum: number) => {
    setIsRefreshingSession(true);
    try {
      const updated = await updateHostGameControlAction(mystery.id, {
        toggleShareRound: roundNum,
      });
      if (!('error' in updated)) {
        setSharedTheoryRounds(updated.sharedTheoryRounds || []);
      }
    } finally {
      setIsRefreshingSession(false);
    }
  };

  const handleHostSetRevealMode = async (mode: 'hidden' | 'phone_free' | 'shared_with_guests') => {
    setIsRefreshingSession(true);
    try {
      const updated = await updateHostGameControlAction(mystery.id, {
        currentRound: 5,
        revealMode: mode,
      });
      if (!('error' in updated)) {
        setCurrentRound(5);
        setRevealMode(updated.revealMode || mode);
        if (updated.solutionData) setSolutionData(updated.solutionData);
      }
    } finally {
      setIsRefreshingSession(false);
    }
  };

  // Submit 5-Star Guest Review & Unlock Party Voting Stats
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const earnedBonus = Boolean(reviewComment.trim() || reviewPhotoDataUrl);
      const roleLabel = selectedChar ? parseCharacter(selectedChar).archetype : 'Sleuth';
      const res = await submitGuestMysteryReviewAction({
        mysteryId: mystery.id,
        mysteryTitle: mystery.title,
        playerName: reviewName || voterDisplayName,
        characterRole: roleLabel,
        rating: reviewRating,
        comment: reviewComment,
        ...(reviewPhotoDataUrl ? { photoDataUrl: reviewPhotoDataUrl } : {}),
      });
      if (res.reviews) {
        setReviews(res.reviews);
      }
      setReviewSubmitted(true);
      if (earnedBonus) {
        setReviewBonusEarned(true);
      }
      if (reviewPhotoDataUrl) {
        setStoryCardUsePartyPhoto(true);
      }
      setRevealSubPage('stats');
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`bpm_review_unlocked_${mystery.id}`, '1');
          if (earnedBonus) {
            window.localStorage.setItem(`bpm_review_bonus_${mystery.id}`, '1');
          }
        } catch {
          // ignore
        }
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Compute current player's personal Detective Wrapped summary for the Story Card
  const myDetectiveSummary = useMemo(() => {
    const myId = voterId;
    const myRankIndex = detectiveLeaderboard.findIndex(r => r.voterCharId === myId);
    const myRow =
      myRankIndex >= 0
        ? detectiveLeaderboard[myRankIndex]
        : detectiveLeaderboard[0] || null;
    const rankNum = myRankIndex >= 0 ? myRankIndex + 1 : 1;

    const parsedChar = selectedChar ? parseCharacter(selectedChar) : null;
    const playerName =
      reviewName.trim() ||
      voterDisplayName ||
      myRow?.voterName ||
      parsedChar?.name ||
      'Mystery Sleuth';
    const roleLabel = parsedChar?.archetype || 'Detective';
    const isPlayerKiller = Boolean(
      selectedChar && solutionData?.killer?.id && selectedChar.id === solutionData.killer.id
    );

    const charPres = selectedChar
      ? getCleanCharacterPresentation(selectedChar, characters, { mode: 'print' })
      : null;
    const portraitUrl = selectedChar
      ? resolveDisplayAvatarUrl(
          charPres?.characterPhotoUrl ||
            selectedChar.profile_data?.avatar_url ||
            selectedChar.image_url
        )
      : null;

    let awardLabel = 'DETECTIVE SCORECARD';
    if (isPlayerKiller) {
      awardLabel = 'THE TRUE KILLER';
    } else if (rankNum === 1 && (myRow?.correctVotes || 0) > 0) {
      awardLabel = 'MASTER DETECTIVE • #1';
    } else if (myRow?.earliestCorrectRound === 1) {
      awardLabel = 'CLOCKED KILLER IN ROUND 1';
    } else if ((myRow?.correctVotes || 0) > 0) {
      awardLabel = 'NAILED THE KILLER';
    } else if (myRow) {
      awardLabel = 'FOOLED BY THE ALIBI';
    }

    return {
      playerName,
      roleLabel,
      rankNum,
      awardLabel,
      correctVotes: myRow?.correctVotes ?? 0,
      totalVotes: myRow?.totalVotes ?? maxClueRound,
      accuracyScore: myRow?.accuracyScore ?? 0,
      accuracyPercent: myRow?.accuracyPercent ?? 0,
      earliestCorrectRound: myRow?.earliestCorrectRound ?? null,
      killerName: solutionData?.killer?.name || 'Classified',
      mostSuspectedName: mostSuspectedList[0]?.suspectName || 'The Suspects',
      portraitUrl,
      partyPhotoUrl:
        reviewPhotoDataUrl ||
        reviews.find((r: any) => r.photoUrl)?.photoUrl ||
        '',
    };
  }, [
    voterId,
    detectiveLeaderboard,
    selectedChar,
    parseCharacter,
    reviewName,
    voterDisplayName,
    solutionData,
    characters,
    maxClueRound,
    mostSuspectedList,
    reviewPhotoDataUrl,
    reviews,
  ]);

  // Generate a high-res 1080x1920 vertical PNG story card and trigger native share or file download
  const handleExportDetectiveStoryCard = useCallback(async () => {
    if (typeof document === 'undefined') return;
    setIsExportingStoryCard(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
      bgGrad.addColorStop(0, '#070b14');
      bgGrad.addColorStop(0.5, '#0f172a');
      bgGrad.addColorStop(1, '#090d16');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Subtle magenta top glow
      const glow = ctx.createRadialGradient(540, 260, 40, 540, 260, 540);
      glow.addColorStop(0, 'rgba(240, 40, 130, 0.28)');
      glow.addColorStop(1, 'rgba(240, 40, 130, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 900);

      // Border frame
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 3;
      ctx.strokeRect(48, 48, 984, 1824);

      // 2. Top Kicker & Mystery Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f02882';
      ctx.font = '900 24px system-ui, -apple-system, sans-serif';
      ctx.fillText('BACK POCKET MYSTERIES • CASE FILE CLOSED', 540, 130);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 54px system-ui, -apple-system, sans-serif';
      ctx.fillText(mystery.title.toUpperCase().slice(0, 32), 540, 205);

      // 3. Hero Image Box (620x680 centered)
      const imgX = 230;
      const imgY = 260;
      const imgW = 620;
      const imgH = 680;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 36);
      ctx.clip();

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(imgX, imgY, imgW, imgH);

      const chosenImageSrc =
        storyCardUsePartyPhoto && myDetectiveSummary.partyPhotoUrl
          ? myDetectiveSummary.partyPhotoUrl
          : myDetectiveSummary.portraitUrl || myDetectiveSummary.partyPhotoUrl;

      if (chosenImageSrc) {
        await new Promise<void>(resolve => {
          const img = new window.Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const scale = Math.max(imgW / img.width, imgH / img.height);
              const drawW = img.width * scale;
              const drawH = img.height * scale;
              const drawX = imgX + (imgW - drawW) / 2;
              const drawY = imgY + (imgH - drawH) / 2;
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
            } catch {
              // ignore
            }
            resolve();
          };
          img.onerror = () => resolve();
          img.src = chosenImageSrc;
        });
      }
      ctx.restore();

      // Portrait border
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(imgX, imgY, imgW, imgH, 36);
      ctx.stroke();

      // 4. Superlative Award Pill overlapping bottom of portrait
      ctx.fillStyle = '#f02882';
      ctx.beginPath();
      ctx.roundRect(250, 905, 580, 68, 34);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 26px system-ui, -apple-system, sans-serif';
      ctx.fillText(myDetectiveSummary.awardLabel, 540, 948);

      // 5. Player Name & Character Role
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 56px system-ui, -apple-system, sans-serif';
      ctx.fillText(myDetectiveSummary.playerName.slice(0, 28), 540, 1065);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '700 32px system-ui, -apple-system, sans-serif';
      ctx.fillText(`Played ${myDetectiveSummary.roleLabel}`, 540, 1120);

      // 6. 3-Stat Cards
      const cards = [
        {
          label: 'ROUNDS CORRECT',
          value: `${myDetectiveSummary.correctVotes} / ${myDetectiveSummary.totalVotes}`,
          sub: `${myDetectiveSummary.accuracyPercent}% Accuracy`,
        },
        {
          label: 'DETECTIVE SCORE',
          value: `${myDetectiveSummary.accuracyScore} PTS`,
          sub: `Rank #${myDetectiveSummary.rankNum} at the Table`,
        },
        {
          label: 'THE TRUE KILLER',
          value: myDetectiveSummary.killerName.slice(0, 22),
          sub: `Most Suspected: ${myDetectiveSummary.mostSuspectedName.slice(0, 18)}`,
        },
      ];

      cards.forEach((c, idx) => {
        const y = 1190 + idx * 175;
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(120, y, 840, 150, 24);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 22px system-ui, -apple-system, sans-serif';
        ctx.fillText(c.label, 165, y + 52);

        ctx.fillStyle = '#ffffff';
        ctx.font = '900 40px system-ui, -apple-system, sans-serif';
        ctx.fillText(c.value, 165, y + 108);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#f02882';
        ctx.font = '700 24px system-ui, -apple-system, sans-serif';
        ctx.fillText(c.sub, 915, y + 85);
      });

      // 7. Footer
      ctx.textAlign = 'center';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '800 26px system-ui, -apple-system, sans-serif';
      ctx.fillText('BACKPOCKETMYSTERIES.COM', 540, 1810);

      const blob: Blob | null = await new Promise(res => canvas.toBlob(res, 'image/png'));
      if (!blob) return;

      const fileName = `${mystery.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}-detective-scorecard.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({
            title: `${mystery.title} • Detective Scorecard`,
            text: `My Detective Scorecard from ${mystery.title}!`,
            files: [file],
          });
          return;
        } catch {
          // fall back to download
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsExportingStoryCard(false);
    }
  }, [mystery.title, myDetectiveSummary, storyCardUsePartyPhoto]);

  // Compute round submissions & vote tally for `activeVotingRound`
  const currentRoundSubmissions = useMemo(
    () => submissions.filter(s => s.round === activeVotingRound),
    [submissions, activeVotingRound]
  );

  const currentRoundTally = useMemo(() => {
    const counts = new Map<string, { suspectCharId: string; suspectName: string; votes: number }>();
    for (const sub of currentRoundSubmissions) {
      const existing = counts.get(sub.suspectCharId) || {
        suspectCharId: sub.suspectCharId,
        suspectName: sub.suspectName,
        votes: 0,
      };
      existing.votes += 1;
      counts.set(sub.suspectCharId, existing);
    }
    return Array.from(counts.values()).sort((a, b) => b.votes - a.votes);
  }, [currentRoundSubmissions]);

  const isCurrentRoundSharedWithGuests = sharedTheoryRounds.includes(activeVotingRound);

  // Helper to render a clue card in its dedicated format
  const renderClueFormatView = (clue: Clue, compact: boolean) => {
    const resolvedFormat: ClueFormat = (clue.format as ClueFormat) || inferClueFormat(clue);
    const hydratedTitle =
      stripCustomerFacingTitle(
        hydrateTextWithCharacters(clue.title || 'Evidence', characters, 'print')
      ) || 'Evidence';
    const hydratedDesc = hydrateTextWithCharacters(clue.description || '', characters, 'print');

    const viewProps = {
      clue,
      hydratedTitle,
      hydratedDescription: hydratedDesc,
      compact,
      showImage: true,
    };

    switch (resolvedFormat) {
      case 'chat':
        return <ChatClueView {...viewProps} />;
      case 'receipt':
        return <ReceiptClueView {...viewProps} />;
      case 'document':
        return <DocumentClueView {...viewProps} />;
      case 'cctv':
        return <CctvClueView {...viewProps} />;
      case 'audio':
        return <AudioClueView {...viewProps} />;
      case 'search_log':
        return <SearchLogClueView {...viewProps} />;
      case 'social_post':
        return <SocialClueView {...viewProps} />;
      case 'handwritten_note':
        return <NoteClueView {...viewProps} />;
      case 'medical_rx':
        return <MedicalClueView {...viewProps} />;
      case 'call_sheet':
        return <CallSheetClueView {...viewProps} />;
      case 'physical_prop':
      default:
        return <PropClueView {...viewProps} />;
    }
  };

  const suspectCharacters = useMemo(
    () => activeCharacters.filter(c => !c.is_victim),
    [activeCharacters]
  );

  const missingVotersForActiveRound = useMemo(() => {
    if (unlockedClueRound < 1 || unlockedClueRound > maxClueRound) return [];
    return suspectCharacters.filter(
      c => !currentRoundSubmissions.some(sub => sub.voterCharId === c.id)
    );
  }, [unlockedClueRound, maxClueRound, suspectCharacters, currentRoundSubmissions]);

  // Helper to format current stage pill label
  const currentStageLabel = useMemo(() => {
    if (currentRound <= 0) return 'Lobby';
    if (currentRound >= 5) return 'Reveal';
    if (isGuessStep) return `Guess ${unlockedClueRound}`;
    return `Round ${unlockedClueRound}`;
  }, [currentRound, isGuessStep, unlockedClueRound]);

  // Dynamic Guest Objective & Spoiler-Free Host Read-Aloud Script for the current half-step
  const stageGuidance = useMemo(() => {
    const roundClueCount = clues.filter(c => (c.round_number || 1) === unlockedClueRound).length;
    if (currentRound <= 0) {
      return {
        badge: '🥂 Stage 1 • Pre-Party Mingle',
        guestHeadline: 'Read Your Dossier & Mingle in Character',
        guestDetail:
          'Check your Character tab (secrets & how to act) and Connections tab (who you know in the room). When everyone is ready, the host will drop Round 1 clues!',
        timerLabel: '⏱️ 10–15 mins mingle',
        hostScript:
          '"Welcome everyone! Tap your character on your phone to read your secret backstory and connections—keep your secrets hidden! Mingle in character for a few minutes before our first evidence drop."',
      };
    }
    if (currentRound >= 5) {
      return {
        badge: '🏆 Final Stage • Grand Reveal',
        guestHeadline: 'Final Detective Leaderboard, Awards & True Timeline',
        guestDetail:
          'See who won Master Detective, The BS Detector, and Hook, Line & Sinker—and read the full step-by-step reconstruction of the crime!',
        timerLabel: '⏱️ Grand Finale',
        hostScript:
          '"All final votes are locked! Before I reveal the killer, let’s look at the Final Detective Leaderboard and Party Awards—then we’ll unveil the true killer, motive, and murder timeline!"',
      };
    }
    if (isGuessStep) {
      const isFinalGuess = unlockedClueRound >= maxClueRound;
      return {
        badge: `🗳️ Guess ${unlockedClueRound} • Voting Open`,
        guestHeadline: isFinalGuess
          ? `Lock In Your Final Guess ${unlockedClueRound} Accusation!`
          : `Lock In Your Round ${unlockedClueRound} Suspect Vote Below`,
        guestDetail: isFinalGuess
          ? 'This is your final accusation before the Grand Reveal! Review your 📓 Detective Notebook & Crime Timeline, pick your #1 suspect, and lock in your vote.'
          : `Scroll to the Voting Box below, check your 🔑 Key & 🛡️ Alibi badges on each suspect, and lock in who you suspect right now & why before Round ${unlockedClueRound + 1} drops!`,
        timerLabel: '⏱️ 2–3 mins to vote',
        hostScript: isFinalGuess
          ? `"Everyone open your phones—Final Guess ${unlockedClueRound} voting is now OPEN! Check your Detective Notebook and lock in your final accusation for who did it and how. Once all votes are in, we head to the Grand Reveal!"`
          : `"Round ${unlockedClueRound} voting is now OPEN on your phones! Scroll down to the Voting Box and lock in your #1 suspect right now and why. Once everyone has voted, I’ll drop Round ${unlockedClueRound + 1} evidence!"`,
      };
    }
    return {
      badge: `🔍 Round ${unlockedClueRound} of ${maxClueRound} • Evidence Live`,
      guestHeadline: `Inspect the ${roundClueCount} Round ${unlockedClueRound} Clues & Interrogate the Room`,
      guestDetail:
        'Swipe (or switch to 📋 Grid view), play any audio voice memos out loud, tag clues as 🔑 Key / 🐟 Decoy / 🛡️ Alibi, pin suspects, and question the other guests!',
      timerLabel: '⏱️ 12–15 mins investigation',
      hostScript:
        unlockedClueRound === 1
          ? `"A crime has been committed! Round 1 evidence (${roundClueCount} clues) just dropped on your phones. Swipe through the clues, play any voice memos, tag Key evidence or Decoys in your notebook, and start questioning each other!"`
          : `"Breaking news—Round ${unlockedClueRound} evidence (${roundClueCount} new clues) just dropped on everyone’s phones! Check the new timestamps against everyone’s alibis and confront your top suspects!"`,
    };
  }, [currentRound, isGuessStep, unlockedClueRound, maxClueRound, clues]);

  // Advance the game to the next logical half-step with one click ("Next" button)
  const nextStepInfo = useMemo(() => {
    const votedCount = currentRoundSubmissions.length;
    const totalSuspects = suspectCharacters.length;
    const voteBadge = totalSuspects > 0 ? ` (${votedCount}/${totalSuspects})` : '';

    if (currentRound <= 0) {
      return { label: 'Next: Round 1 →', fullLabel: 'Start Round 1 Clues →', canAdvance: true };
    }
    if (currentRound >= 1 && currentRound <= maxClueRound && !isGuessStep) {
      return {
        label: `Next: Guess ${unlockedClueRound} →`,
        fullLabel: `Open Guess ${unlockedClueRound} Voting →`,
        canAdvance: true,
      };
    }
    if (isGuessStep && unlockedClueRound < maxClueRound) {
      return {
        label: `Next: Round ${unlockedClueRound + 1}${voteBadge} →`,
        fullLabel: `Unlock Round ${unlockedClueRound + 1} Clues${voteBadge} →`,
        canAdvance: true,
      };
    }
    if (isGuessStep && unlockedClueRound >= maxClueRound) {
      return {
        label: `Next: Reveal${voteBadge} →`,
        fullLabel: `Go to Final Stats & Reveal${voteBadge} →`,
        canAdvance: true,
      };
    }
    if (currentRound >= 5 && revealMode === 'hidden') {
      return { label: 'Next: Solution →', fullLabel: 'Share Final Solution →', canAdvance: true };
    }
    return { label: '✓ Complete', fullLabel: 'Game Complete', canAdvance: false };
  }, [
    currentRound,
    maxClueRound,
    isGuessStep,
    unlockedClueRound,
    revealMode,
    currentRoundSubmissions.length,
    suspectCharacters.length,
  ]);

  const handleHostNextStep = async (force = false) => {
    if (isRefreshingSession) return;
    // Guardrail: when moving FROM a Guess step to the next Round/Reveal, warn if not everyone voted
    if (
      !force &&
      isGuessStep &&
      unlockedClueRound >= 1 &&
      unlockedClueRound <= maxClueRound &&
      missingVotersForActiveRound.length > 0
    ) {
      setPendingNextConfirm(true);
      return;
    }
    setPendingNextConfirm(false);

    if (currentRound <= 0) {
      await handleHostSetRound(1);
    } else if (isGuessStep && unlockedClueRound >= maxClueRound) {
      // Jump straight from the final Guess round (e.g. 3.5 on a 3-round mystery) to 5 (Reveal)
      await handleHostSetRound(5);
    } else if (currentRound >= 1 && currentRound < maxClueRound + 0.5) {
      const nextStep = Number((currentRound + 0.5).toFixed(1));
      await handleHostSetRound(nextStep);
    } else if (currentRound >= 5 && revealMode === 'hidden') {
      await handleHostSetRevealMode('shared_with_guests');
    } else {
      setIsHostPanelOpen(true);
    }
  };

  // Guardrail Confirmation Modal when Host taps "Next →" during a Guess step before all suspects have voted
  const renderNextConfirmModal = () => {
    if (!pendingNextConfirm) return null;
    const votedCount = currentRoundSubmissions.length;
    const totalSuspects = suspectCharacters.length;
    const nextStageLabel =
      activeVotingRound >= maxClueRound
        ? 'Final Stats & Reveal'
        : `Round ${activeVotingRound + 1} Clues`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="absolute inset-0" onClick={() => setPendingNextConfirm(false)} />
        <div className="relative z-10 w-full max-w-md rounded-2xl bg-slate-900 border border-amber-400/40 shadow-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                ⚠️ Guess {activeVotingRound} Votes Still Incoming
              </span>
              <h3 className="text-base font-black text-white">
                Only {votedCount} of {totalSuspects} Suspects Have Voted!
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPendingNextConfirm(false)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          {missingVotersForActiveRound.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-950/90 border border-white/10 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                Waiting on ({missingVotersForActiveRound.length}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {missingVotersForActiveRound.map(c => {
                  const { name, guestName } = parseCharacter(c);
                  return (
                    <span
                      key={c.id}
                      className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-bold text-slate-200"
                    >
                      {name}
                      {guestName ? ` (${guestName})` : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPendingNextConfirm(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Wait for Votes
            </button>
            <button
              type="button"
              onClick={() => handleHostNextStep(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shadow transition-all cursor-pointer"
            >
              Unlock {nextStageLabel} Anyway →
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Kahoot-Style Animated Banner when Host Unlocks a New Clue Round OR Opens a Guess Voting Step
  const renderRoundUnlockToast = () => {
    if (roundUnlockToast === null) return null;
    const isReveal = roundUnlockToast >= 5;
    const toastIsGuess = Math.round((roundUnlockToast % 1) * 10) === 5;
    const toastRoundNum = Math.floor(roundUnlockToast);

    return (
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md animate-in slide-in-from-top duration-300">
        <div className="rounded-2xl bg-gradient-to-r from-brand-pink via-rose-500 to-amber-500 p-0.5 shadow-2xl">
          <div className="rounded-[14px] bg-slate-950/95 px-4 py-3 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (isReveal) {
                  setActiveTab('reveal');
                } else {
                  setActiveTab('clues');
                  setSelectedClueRoundFilter(toastRoundNum);
                  if (!toastIsGuess) {
                    setClueSlideIndex(0);
                  } else if (typeof document !== 'undefined') {
                    setTimeout(() => {
                      const el = document.getElementById('round-suspect-vote-box');
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }
                }
                setRoundUnlockToast(null);
              }}
              className="flex items-center gap-2.5 text-left min-w-0 flex-grow cursor-pointer"
            >
              <span className="text-lg animate-bounce shrink-0">
                {isReveal ? '🏆' : toastIsGuess ? '🗳️' : '🚨'}
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  {isReveal
                    ? 'Grand Finale Live'
                    : toastIsGuess
                    ? `Guess ${toastRoundNum} Voting Open!`
                    : `Round ${toastRoundNum} Unlocked`}
                </p>
                <p className="text-xs font-black text-white truncate">
                  {isReveal
                    ? 'Tap to view Final Detective Stats & Reveal →'
                    : toastIsGuess
                    ? `Who do you think did it & why? Tap to submit Guess ${toastRoundNum} →`
                    : `New Round ${toastRoundNum} Evidence! Tap to swipe clues →`}
                </p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setRoundUnlockToast(null)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 flex items-center justify-center text-[10px] font-black shrink-0 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Full-Screen "Scan to Join Party" QR Code Modal
  const renderQrJoinModal = () => {
    if (!isQrModalOpen) return null;
    const guestUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/${locale}/play/${mystery.id}`
        : `https://www.backpocketmysteries.com/${locale}/play/${mystery.id}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(
      guestUrl
    )}`;

    return (
      <div
        className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={() => setIsQrModalOpen(false)}
      >
        <div
          className="relative w-full max-w-sm rounded-3xl bg-slate-950 border border-brand-pink/40 p-6 text-center space-y-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setIsQrModalOpen(false)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>

          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black uppercase tracking-widest">
              📲 Instant Party Join (No Login)
            </span>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              Scan With Phone Camera
            </h3>
            <p className="text-xs text-slate-400">
              Point any phone camera at this QR code to open the character lobby &amp; live clues.
            </p>
          </div>

          <div className="mx-auto w-60 h-60 rounded-2xl bg-white p-3 shadow-xl flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="Scan to join Murder Mystery Playroom"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="rounded-2xl bg-slate-900 border border-white/10 py-2.5 px-4">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Party Access PIN
            </div>
            <div className="text-xl font-black font-mono tracking-widest text-brand-pink mt-0.5">
              {pin.slice(0, 3)} {pin.slice(3)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleShareOrCopyGuestLink(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                copiedGuestLink
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              }`}
            >
              {copiedGuestLink ? '✓ Link Copied!' : '📋 Copy Link'}
            </button>
            <button
              type="button"
              onClick={() => handleShareOrCopyGuestLink(true)}
              className="flex-1 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              📲 Share Link
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Slide-Up / Modal "👥 Who's Who Tonight (Room Cast Directory)" — view all characters without unclaiming yours
  const renderRoomCastModal = () => {
    if (!isRoomCastOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
        onClick={() => setIsRoomCastOpen(false)}
      >
        <div
          className="relative w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/15 shadow-2xl p-4 sm:p-6 space-y-4"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                👥 Who&apos;s Who Tonight • Room Cast Directory
              </span>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">
                All {activeCharacters.length} Characters in the Room
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsRoomCastOpen(false)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center cursor-pointer shrink-0"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {activeCharacters.map(char => {
              const { name, archetype, guestName } = parseCharacter(char);
              const charPres = getCleanCharacterPresentation(char, characters, { mode: 'generic' });
              const charAvatarUrl = resolveDisplayAvatarUrl(
                charPres.characterPhotoUrl || char.profile_data?.avatar_url || char.image_url
              );
              const isMe = selectedChar?.id === char.id;
              const isClaimed = Boolean(claimedCharacters[char.id]);
              const isPinnedToCurrent =
                Boolean(currentSlideClue?.id) &&
                (clueSuspects[currentSlideClue!.id] || []).includes(char.id);

              return (
                <div
                  key={char.id}
                  className={`rounded-2xl border p-3 flex items-center gap-3.5 transition-all ${
                    isMe
                      ? 'bg-brand-pink/15 border-brand-pink/50'
                      : 'bg-slate-950/80 border-white/10'
                  }`}
                >
                  <div
                    onClick={() => {
                      if (charAvatarUrl) {
                        setLightboxPhoto({
                          url: charAvatarUrl,
                          title: charPres.roleTitle || archetype,
                          subtitle: guestName ? `Played by ${guestName}` : undefined,
                        });
                      }
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-900 border border-white/15 shrink-0 cursor-pointer relative"
                  >
                    {charAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={charAvatarUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {char.is_victim ? '💀' : '🕵️'}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          char.is_victim
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {char.is_victim ? '💀 Victim' : '🕵️ Suspect'}
                      </span>
                      {isMe && (
                        <span className="px-2 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase">
                          ★ You
                        </span>
                      )}
                      {!isMe && isClaimed && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                          ✓ In Room
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-black text-white truncate">
                      {charPres.roleTitle || archetype}
                    </h3>
                    {guestName && (
                      <p className="text-xs font-black text-emerald-400 truncate">
                        👤 Played by {guestName}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 line-clamp-2">{charPres.shortBlurb}</p>

                    {!char.is_victim && isGuessStep && unlockedClueRound >= 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setAccusedCharId(char.id);
                            setIsRoomCastOpen(false);
                            setActiveTab('clues');
                            if (typeof document !== 'undefined') {
                              setTimeout(() => {
                                const el = document.getElementById('round-suspect-vote-box');
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 120);
                            }
                          }}
                          className="px-2 py-0.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                          🗳️ Accuse in Vote
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Guest Detectives Section inside Room Cast Directory */}
          {detectiveGuests.length > 0 && (
            <div className="rounded-2xl bg-slate-950/80 border border-sky-400/30 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                  🕵️ Extra Guest Detectives in the Room ({detectiveGuests.length})
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  Airtight Alibi • Can Vote &amp; Win Top Detective
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectiveGuests.map(det => {
                  const isMeDet = isClueOnlySleuth && det.token === playerToken;
                  return (
                    <span
                      key={det.id}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 border ${
                        isMeDet
                          ? 'bg-sky-400/20 text-sky-200 border-sky-400'
                          : 'bg-white/5 text-slate-200 border-white/10'
                      }`}
                    >
                      <span>🕵️ {det.displayName}</span>
                      {isMeDet && (
                        <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-sky-400 text-slate-950 font-black">
                          You
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Need to switch your character or join as a Guest Detective?
            </span>
            <button
              type="button"
              onClick={() => {
                setIsRoomCastOpen(false);
                void handleSwitchCharacter();
              }}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-200 hover:text-rose-300 border border-white/10 text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
            >
              🔄 Switch Role (Return to Lobby)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Reusable Host Controls Modal Overlay ("Console" - Full Flow)
  const renderHostControlsModal = () => {
    if (!isHostPanelOpen) return null;
    const claimedCount = Object.keys(claimedCharacters).length;
    const flowSteps =
      maxClueRound === 3
        ? [
            { r: 0, label: '1. Lobby' },
            { r: 1, label: '2. Round 1' },
            { r: 1.5, label: '3. Guess 1' },
            { r: 2, label: '4. Round 2' },
            { r: 2.5, label: '5. Guess 2' },
            { r: 3, label: '6. Round 3' },
            { r: 3.5, label: '7. Guess 3' },
            { r: 5, label: '8. Reveal' },
          ]
        : [
            { r: 0, label: '1. Lobby' },
            { r: 1, label: '2. Round 1' },
            { r: 1.5, label: '3. Guess 1' },
            { r: 2, label: '4. Round 2' },
            { r: 2.5, label: '5. Guess 2' },
            { r: 3, label: '6. Round 3' },
            { r: 3.5, label: '7. Guess 3' },
            { r: 4, label: '8. Round 4' },
            { r: 4.5, label: '9. Guess 4' },
            { r: 5, label: '10. Reveal' },
          ];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="absolute inset-0" onClick={() => setIsHostPanelOpen(false)} />
        <div className="relative z-10 w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-slate-900 border border-brand-pink/40 shadow-2xl p-4 sm:p-6 space-y-4">
          {/* Modal Header with Console Title + Next Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="text-base">🎛️</span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-white">
                  Host Game Flow Console
                </h2>
                <p className="text-[11px] text-slate-400 font-medium">
                  PIN: <span className="font-mono font-bold text-brand-pink">{pin.slice(0, 3)} {pin.slice(3)}</span> • {claimedCount}/{activeCharacters.length} Claimed
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {nextStepInfo.canAdvance && (
                <button
                  type="button"
                  disabled={isRefreshingSession}
                  onClick={() => handleHostNextStep(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-[11px] font-black uppercase tracking-wider shadow transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isRefreshingSession ? '⏳...' : nextStepInfo.fullLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsHostPanelOpen(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Spoiler-Free Host Read-Aloud Announcement Box */}
          <div className="rounded-xl bg-amber-400/10 border border-amber-400/35 p-3.5 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                📢 Read Out Loud to the Room (Spoiler-Free MC Script)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[9px] font-black uppercase">
                {stageGuidance.timerLabel}
              </span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-white leading-relaxed italic">
              {stageGuidance.hostScript}
            </p>
          </div>

          {/* Dynamic Game Flow Stepper */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Full Game Flow ({flowSteps.length} Stages • Tap any step or use Next)
            </span>
            <div
              className={`grid grid-cols-2 ${
                maxClueRound === 3 ? 'sm:grid-cols-4' : 'sm:grid-cols-5'
              } gap-1.5`}
            >
              {flowSteps.map(step => (
                <button
                  key={step.r}
                  type="button"
                  onClick={() => handleHostSetRound(step.r)}
                  className={`py-2 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    currentRound === step.r
                      ? 'bg-brand-pink text-white shadow-md'
                      : currentRound > step.r
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {step.label}
                </button>
              ))}
            </div>
          </div>

          {/* Round Submissions & Vote Tally */}
          {unlockedClueRound >= 1 && unlockedClueRound <= maxClueRound && (
            <div className="bg-slate-950/90 border border-white/10 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                    {isGuessStep
                      ? `🗳️ Guess ${activeVotingRound} Voting Open`
                      : `🔍 Round ${activeVotingRound} Clues Live (Voting Next)`}
                  </span>
                  <h3 className="text-xs font-black text-white">
                    {currentRoundSubmissions.length} / {suspectCharacters.length} Suspects Submitted Guess {activeVotingRound}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {!isGuessStep && (
                    <button
                      type="button"
                      onClick={() => handleHostSetRound(activeVotingRound + 0.5)}
                      className="px-2.5 py-1.5 rounded-lg bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider hover:opacity-95 transition-all cursor-pointer"
                    >
                      🗳️ Open Guess {activeVotingRound} Now →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setHostShowWhoSaidWho(prev => !prev)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {hostShowWhoSaidWho ? '🙈 Hide Names' : '👁️ Who Said Who'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHostToggleShareRound(activeVotingRound)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isCurrentRoundSharedWithGuests
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-brand-pink/20 text-brand-pink border border-brand-pink/40 hover:bg-brand-pink hover:text-white'
                    }`}
                  >
                    {isCurrentRoundSharedWithGuests ? '✓ Shared to Phones' : '📢 Share Tally'}
                  </button>
                </div>
              </div>

              {currentRoundTally.length > 0 ? (
                <div className="space-y-1.5">
                  {currentRoundTally.map(item => {
                    const pct = Math.round(
                      (item.votes / Math.max(1, currentRoundSubmissions.length)) * 100
                    );
                    return (
                      <div key={item.suspectCharId} className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold">
                          <span className="text-white">{item.suspectName}</span>
                          <span className="text-brand-pink">
                            {item.votes} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-brand-pink rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 font-medium">
                  {isGuessStep
                    ? `Waiting for players to submit Guess ${activeVotingRound}...`
                    : `Players are reviewing Round ${activeVotingRound} clues. Tap "Next: Guess ${activeVotingRound} →" when ready for them to vote!`}
                </p>
              )}

              {hostShowWhoSaidWho && currentRoundSubmissions.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/10">
                  {currentRoundSubmissions.map(sub => (
                    <div
                      key={sub.id}
                      className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-white">{sub.voterName}</span>
                        <span className="text-[10px] font-black text-brand-pink">
                          → {sub.suspectName}
                        </span>
                      </div>
                      <p className="text-slate-300 italic">&ldquo;{sub.reason}&rdquo;</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Round 5 Reveal Mode Control */}
          {currentRound === 5 && (
            <div className="bg-slate-950/90 border border-brand-pink/40 rounded-xl p-4 space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Grand Reveal Mode
                </span>
                <h3 className="text-xs font-black text-white">
                  How do you want to reveal the Final Solution?
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleHostSetRevealMode('phone_free')}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    revealMode === 'phone_free'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  📵 Read Aloud (Phone-Free)
                </button>
                <button
                  type="button"
                  onClick={() => handleHostSetRevealMode('shared_with_guests')}
                  className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    revealMode === 'shared_with_guests'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-brand-pink text-white hover:opacity-95'
                  }`}
                >
                  📲 Share Solution to All Phones
                </button>
              </div>
            </div>
          )}

          {/* Quick Utility Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsHostPanelOpen(false);
                  setIsQrModalOpen(true);
                }}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-brand-pink text-white hover:opacity-95 transition-all cursor-pointer"
              >
                📷 Show QR Code
              </button>
              <button
                type="button"
                onClick={() => handleShareOrCopyGuestLink(false)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  copiedGuestLink
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-brand-pink/20 border border-brand-pink/40 text-brand-pink hover:bg-brand-pink hover:text-white'
                }`}
              >
                {copiedGuestLink ? '✓ Guest Link Copied!' : '📋 Copy Guest Link'}
              </button>
              <button
                type="button"
                onClick={refreshGameSession}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-emerald-400 transition-colors cursor-pointer"
              >
                {isRefreshingSession ? '⏳ Syncing...' : '🔄 Refresh Live Votes'}
              </button>
              <button
                type="button"
                onClick={handleHostResetClaims}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-amber-300 transition-colors cursor-pointer"
              >
                🔓 Unlock Characters ({claimedCount})
              </button>
            </div>
            <Link
              href={`/${locale}/mysteries/${mystery.id}/ready`}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 transition-colors"
            >
              📋 Host Hub & Invites
            </Link>
          </div>
        </div>
      </div>
    );
  };

  const renderPhotoLightboxModal = () => {
    if (!lightboxPhoto) return null;
    return (
      <div
        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        onClick={() => setLightboxPhoto(null)}
      >
        <div
          className="relative max-w-2xl w-full bg-slate-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 z-20 px-3.5 py-2 rounded-full bg-black/75 hover:bg-brand-pink text-white text-xs font-black uppercase tracking-widest border border-white/20 transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
          <div className="w-full max-h-[75vh] aspect-square bg-slate-900 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.title}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="p-5 bg-slate-950 border-t border-white/10 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-white">{lightboxPhoto.title}</h3>
              {lightboxPhoto.subtitle && (
                <p className="text-xs font-bold text-emerald-400">{lightboxPhoto.subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLightboxPhoto(null)}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 1. CHARACTER SELECTION LOBBY (CLEAN ARRIVAL HEADER & CHARACTER CLAIM CARDS)
  // ============================================================================
  const mysteryCoverUrl = getEffectiveCoverUrl(
    mystery.image_url,
    mystery.theme,
    mystery.title
  );
  const claimedCount = Object.keys(claimedCharacters).length;

  const stageTimelineSteps =
    maxClueRound === 3
      ? [
          { r: 0, short: 'Lobby', label: '1. Lobby' },
          { r: 1, short: 'R1 Clues', label: '2. Round 1' },
          { r: 1.5, short: 'Vote 1', label: '3. Vote 1' },
          { r: 2, short: 'R2 Clues', label: '4. Round 2' },
          { r: 2.5, short: 'Vote 2', label: '5. Vote 2' },
          { r: 3, short: 'R3 Clues', label: '6. Round 3' },
          { r: 3.5, short: 'Final Vote', label: '7. Final Vote' },
          { r: 5, short: 'Reveal', label: '8. Reveal' },
        ]
      : [
          { r: 0, short: 'Lobby', label: '1. Lobby' },
          { r: 1, short: 'R1', label: '2. Round 1' },
          { r: 1.5, short: 'Vote 1', label: '3. Vote 1' },
          { r: 2, short: 'R2', label: '4. Round 2' },
          { r: 2.5, short: 'Vote 2', label: '5. Vote 2' },
          { r: 3, short: 'R3', label: '6. Round 3' },
          { r: 3.5, short: 'Vote 3', label: '7. Vote 3' },
          { r: 4, short: 'R4', label: '8. Round 4' },
          { r: 4.5, short: 'Final Vote', label: '9. Final Vote' },
          { r: 5, short: 'Reveal', label: '10. Reveal' },
        ];

  // ============================================================================
  // 0. PRE-PARTY INVITATION & GUEST PORTAL (?prep=1)
  //    Clean, editorial invitation layout with tabs (Invitation | Guest List | What to Bring)
  // ============================================================================
  if (isPrepMode) {
    const resolvedWhatToBring =
      partyDetails?.whatToBringItems && partyDetails.whatToBringItems.length > 0
        ? partyDetails.whatToBringItems
        : [
            'Charged phone or device (50%+ battery)',
            'Your character outfit & costume vibe',
          ];

    const formattedPartyDate = partyDetails?.partyDate
      ? formatPartyDateDisplay(partyDetails.partyDate)
      : 'Date TBA';
    const arrivalTimeDisplay = partyDetails?.arrivalTime || '7:00 PM';
    const locationDisplay = partyDetails?.location || 'Host Residence';
    const foodVibeDisplay = partyDetails?.foodAndDrinkVibe
      ? getFoodVibeDisplay(partyDetails.foodAndDrinkVibe).replace(/^[^\w]+/, '')
      : 'Cocktails & Finger Food';
    const checkedBringCount = resolvedWhatToBring.filter(i => guestBringChecked.includes(i)).length;

    const renderGuestCardsGrid = (currentCharId?: string) => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCharacters.map(char => {
          const { name, archetype, guestName } = parseCharacter(char);
          const charPres = getCleanCharacterPresentation(char, characters, { mode: 'generic' });
          const roleTitle = charPres.roleTitle || archetype || name;
          const mainDisplayName = guestName || roleTitle;
          const charAvatarUrl = resolveDisplayAvatarUrl(
            charPres.characterPhotoUrl || char.profile_data?.avatar_url || char.image_url
          );
          const isPrepConfirmed = Boolean(prepConfirmedCharacters[char.id]);
          const isCurrent = currentCharId === char.id;

          return (
            <div
              key={char.id}
              onClick={() => {
                handleSelectCharacterInLobby(char.id);
                setPrepSheetTab('character');
              }}
              role="button"
              tabIndex={0}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelectCharacterInLobby(char.id);
                  setPrepSheetTab('character');
                }
              }}
              className={`group rounded-2xl overflow-hidden text-left transition-all flex flex-col justify-between border cursor-pointer ${
                isCurrent
                  ? 'bg-slate-900 border-brand-pink shadow-lg'
                  : 'bg-slate-900/70 border-white/10 hover:border-white/25 hover:bg-slate-900 shadow-md'
              }`}
            >
              <div className="relative w-full h-56 sm:h-64 bg-slate-950 overflow-hidden border-b border-white/10">
                {charAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={charAvatarUrl}
                    alt={mainDisplayName}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl bg-slate-950 text-slate-500">
                    {char.is_victim ? '💀' : '🕵️'}
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent pointer-events-none" />

                {/* Top Pills: Character Type / Role Title Pill on Left, Victim/Ready Status on Right */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2 z-10">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 text-white text-[11px] font-bold tracking-wide max-w-[72%] truncate shadow-sm">
                    {roleTitle}
                  </span>

                  {isPrepConfirmed ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shrink-0 shadow-sm">
                      ✓ Ready
                    </span>
                  ) : char.is_victim ? (
                    <span className="px-2.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm">
                      The Victim
                    </span>
                  ) : null}
                </div>

                {/* Bottom Overlay on Portrait: Guest Name as Main Header */}
                <div className="absolute bottom-3 inset-x-3.5 z-10">
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight truncate group-hover:text-brand-pink transition-colors">
                    {mainDisplayName}
                  </h3>
                  {guestName && (
                    <p className="text-xs font-semibold text-slate-300 truncate">
                      Playing {roleTitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between gap-3 flex-grow">
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {charPres.shortBlurb}
                </p>

                <div className="pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-400 truncate">
                    Character &amp; Outfit Guide
                  </span>
                  <span className="text-xs font-bold text-brand-pink group-hover:translate-x-0.5 transition-transform shrink-0">
                    Open →
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );

    const renderWhatToBringSection = () => (
      <div className="rounded-2xl bg-slate-900/70 border border-white/10 p-5 sm:p-7 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-white">
              What to Bring
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Tap items below to check them off as you get ready for the party.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold">
            {checkedBringCount} of {resolvedWhatToBring.length} packed
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resolvedWhatToBring.map((item, idx) => {
            const isChecked = guestBringChecked.includes(item);
            return (
              <button
                key={`${item}-${idx}`}
                type="button"
                onClick={() => handleToggleGuestBringItem(item)}
                className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-white/[0.03] border-white/10 hover:border-white/25 text-slate-200'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-md flex items-center justify-center text-xs font-black shrink-0 border transition-colors ${
                    isChecked
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-transparent text-transparent border-white/25'
                  }`}
                >
                  ✓
                </span>
                <span
                  className={`text-xs sm:text-sm font-semibold leading-snug ${
                    isChecked ? 'line-through text-slate-400' : 'text-white'
                  }`}
                >
                  {item}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );

    const hasHostStartedGame = currentRound >= 1;
    const rawMysteryOverview =
      (mystery.description || '').trim() ||
      `You are invited to an interactive evening of suspense, alibis, and hidden motives in ${mystery.title}. Arrive in character, mingle with the other suspects, and piece together the clues when the investigation begins.`;
    const hydratedMysteryOverview = hydrateTextWithCharacters(
      rawMysteryOverview,
      characters,
      'print'
    )
      .replace(/\{\{([A-Za-z0-9\s'._-]+)\}\}/g, '$1')
      .trim();

    const renderLiveGameStartedBanner = () => {
      if (!hasHostStartedGame) return null;
      return (
        <div className="rounded-3xl bg-gradient-to-r from-brand-pink via-rose-500 to-amber-500 p-0.5 shadow-2xl animate-in fade-in duration-300">
          <div className="rounded-[22px] bg-slate-950/95 px-5 py-4 sm:px-7 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <span className="relative flex h-3.5 w-3.5 mt-1 sm:mt-0 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-pink opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand-pink" />
              </span>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-brand-pink">
                  Party Night is Live • Round {unlockedClueRound} Active
                </p>
                <h2 className="text-base sm:text-lg font-black text-white leading-snug">
                  Your host has started the mystery! Enter the Live Game now to unlock your secret dossier &amp; clues.
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleTogglePrepMode(false)}
              className="px-6 py-3.5 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-lg shadow-brand-pink/30 transition-all shrink-0 cursor-pointer text-center"
            >
              Enter Live Party Game Now →
            </button>
          </div>
        </div>
      );
    };

    const renderMysteryOverviewSection = () => (
      <div className="p-5 sm:p-6 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-pink">
            The Story • Mystery Overview
          </span>
          {mystery.theme && (
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300">
              {mystery.theme}
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {hydratedMysteryOverview}
        </p>
      </div>
    );

    if (!selectedChar) {
      const attendingNames = activeCharacters
        .map(c => parseCharacter(c).guestName || getCleanCharacterPresentation(c, characters, { mode: 'generic' }).roleTitle)
        .filter(Boolean);

      return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans antialiased pb-16">
          {renderPhotoLightboxModal()}

          {/* Minimal Top Bar */}
          <header className="border-b border-white/10 bg-[#090d16]/90 sticky top-0 z-30 backdrop-blur-md">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {initialIsHost && (
                  <Link
                    href={`/${locale}/account/orders/${mystery.id}`}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold shrink-0 transition-colors"
                  >
                    ← Back to Host Hub
                  </Link>
                )}
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 truncate">
                  {mystery.title}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {hasHostStartedGame ? (
                  <button
                    type="button"
                    onClick={() => handleTogglePrepMode(false)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-pink/25 transition-all cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>Game is Live • Join Party Now →</span>
                  </button>
                ) : initialIsHost ? (
                  <button
                    type="button"
                    onClick={() => handleTogglePrepMode(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Open Game Night Portal →
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-10 space-y-6">
            {renderLiveGameStartedBanner()}

            {/* Editorial Invitation Hero Card */}
            <div className="rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl">
              {mysteryCoverUrl && (
                <div className="relative w-full h-48 sm:h-64 bg-slate-950 overflow-hidden border-b border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mysteryCoverUrl}
                    alt={mystery.title}
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent pointer-events-none" />
                </div>
              )}
              <div className="relative p-6 sm:p-8 text-center space-y-3 border-b border-white/10">
                <div className="relative z-10 space-y-2.5 max-w-2xl mx-auto">
                  <span className="inline-block text-[11px] font-bold uppercase tracking-[0.22em] text-brand-pink">
                    You&apos;re Invited • Murder Mystery Party
                  </span>
                  <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                    {mystery.title}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-300">
                    {formattedPartyDate} &nbsp;•&nbsp; Arrive at {arrivalTimeDisplay} &nbsp;•&nbsp; {locationDisplay}
                  </p>
                </div>
              </div>

              {/* Clean 3-Tab Navigation Bar */}
              <div className="bg-slate-950/60 px-3 sm:px-6 py-2.5 flex items-center justify-center gap-2 border-b border-white/10">
                {[
                  { id: 'invite' as const, label: 'Invitation' },
                  { id: 'guests' as const, label: `Guest List & Roles (${activeCharacters.length})` },
                  { id: 'bring' as const, label: `What to Bring (${resolvedWhatToBring.length})` },
                ].map(tab => {
                  const active = prepTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPrepTab(tab.id)}
                      className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-white text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: THE INVITATION */}
              {prepTab === 'invite' && (
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Mystery Overview Story Block */}
                  {renderMysteryOverviewSection()}

                  {/* 2x2 Clean Event Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Date
                      </span>
                      <p className="text-base font-bold text-white">
                        {formattedPartyDate}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Time
                      </span>
                      <p className="text-base font-bold text-white">
                        Arrive {arrivalTimeDisplay}
                        {partyDetails?.gameStartTime ? (
                          <span className="text-xs font-medium text-slate-400 ml-2">
                            (Mystery starts {partyDetails.gameStartTime})
                          </span>
                        ) : null}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Location
                      </span>
                      <p className="text-base font-bold text-white">
                        {locationDisplay}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Food &amp; Drinks
                      </span>
                      <p className="text-base font-bold text-white">
                        {foodVibeDisplay}
                      </p>
                    </div>
                  </div>

                  {partyDetails?.hostNotes && (
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
                        Note from Your Host
                      </span>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {partyDetails.hostNotes}
                      </p>
                    </div>
                  )}

                  {/* Attending Preview + CTA to Guest List */}
                  <div className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="flex -space-x-2.5 overflow-hidden shrink-0">
                        {activeCharacters.slice(0, 5).map(char => {
                          const charPres = getCleanCharacterPresentation(char, characters, { mode: 'generic' });
                          const url = resolveDisplayAvatarUrl(
                            charPres.characterPhotoUrl || char.profile_data?.avatar_url || char.image_url
                          );
                          return (
                            <div
                              key={char.id}
                              className="w-10 h-10 rounded-full border-2 border-slate-950 bg-slate-800 overflow-hidden shrink-0"
                            >
                              {url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={url} alt="" className="w-full h-full object-cover object-top" />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {attendingNames.slice(0, 3).join(', ')}
                          {attendingNames.length > 3 ? ` + ${attendingNames.length - 3} more` : ''}
                        </p>
                        <p className="text-xs text-slate-400">
                          Tap Guest List to find your name, character role &amp; outfit guide
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPrepTab('guests')}
                      className="px-5 py-3 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer shadow-md"
                    >
                      View Guest List &amp; Your Role →
                    </button>
                  </div>

                  {/* Subtle Calendar Links Footer */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs text-slate-400">
                    <span>Add this party to your calendar:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildGoogleCalendarUrl()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        + Google Calendar
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadIcsCalendar()}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        + Apple / Outlook (.ics)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: GUEST LIST & ROLES */}
              {prepTab === 'guests' && (
                <div className="p-6 sm:p-8 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-white">
                        Guest List &amp; Character Assignments
                      </h2>
                      <p className="text-xs text-slate-400">
                        Tap your name below to view your character outline, costume guide &amp; 3 outfit options.
                      </p>
                    </div>
                  </div>
                  {renderGuestCardsGrid()}
                </div>
              )}

              {/* TAB 3: WHAT TO BRING */}
              {prepTab === 'bring' && (
                <div className="p-6 sm:p-8 space-y-5">
                  {renderWhatToBringSection()}
                </div>
              )}
            </div>
          </main>
        </div>
      );
    }

    // Selected Character's Dedicated Pre-Party Sheet (?prep=1&char=...)
    const prepCharPres = getCleanCharacterPresentation(selectedChar, characters, { mode: 'print' });
    const prepPortraitUrl =
      prepCharPres.characterPhotoUrl ||
      resolveDisplayAvatarUrl(selectedChar.profile_data?.avatar_url || selectedChar.image_url);
    const isThisCharConfirmed = Boolean(prepConfirmedCharacters[selectedChar.id]);
    const mainGuestTitle = prepCharPres.guestName || prepCharPres.roleTitle;
    const outfitOptionsCount = Math.max(
      prepCharPres.outfitReferenceImages?.length || 0,
      prepCharPres.outfitOptions?.length || 0,
      3
    );

    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans antialiased pb-16">
        {renderPhotoLightboxModal()}

        {/* Minimal Top Header */}
        <header className="bg-[#090d16]/90 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
          <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  handleSwitchCharacter();
                  setPrepTab('guests');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold shrink-0 transition-colors cursor-pointer"
              >
                ← Back to Invite &amp; Guest List
              </button>
              <span className="text-xs font-semibold text-slate-400 truncate hidden sm:inline">
                {mystery.title}
              </span>
            </div>

            {hasHostStartedGame ? (
              <button
                type="button"
                onClick={() => handleTogglePrepMode(false)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-brand-pink/25 transition-all cursor-pointer"
              >
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>Game is Live • Join Party Now →</span>
              </button>
            ) : initialIsHost ? (
              <button
                type="button"
                onClick={() => handleTogglePrepMode(false)}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold cursor-pointer"
              >
                Open Game Night Portal →
              </button>
            ) : null}
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
          {renderLiveGameStartedBanner()}

          {/* Character Invite Card with Tabs */}
          <div className="rounded-3xl bg-slate-900/75 border border-white/10 overflow-hidden shadow-2xl">
            {/* Top Identity Banner: Guest Name as Main Header, Character Role as Pill */}
            <div className="p-6 sm:p-8 border-b border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div
                onClick={() => {
                  if (prepPortraitUrl) {
                    setLightboxPhoto({
                      url: prepPortraitUrl,
                      title: mainGuestTitle,
                      subtitle: prepCharPres.roleTitle,
                    });
                  }
                }}
                className="w-32 h-40 sm:w-40 sm:h-52 rounded-2xl overflow-hidden border border-white/15 bg-slate-950 shrink-0 relative group cursor-pointer shadow-lg"
              >
                {prepPortraitUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={prepPortraitUrl}
                    alt={mainGuestTitle}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl">
                    🕵️
                  </div>
                )}
              </div>

              <div className="space-y-3 flex-1 min-w-0 text-center sm:text-left">
                {/* Pills: Character Type Pill + Victim/Suspect status */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-brand-pink text-white shadow-xs">
                    {prepCharPres.roleTitle}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-300">
                    {prepCharPres.isVictim ? 'The Victim' : 'Suspect Role'}
                  </span>
                  {isThisCharConfirmed && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950">
                      ✓ Ready for Party Night
                    </span>
                  )}
                </div>

                {/* Main Heading: Guest Name */}
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                    {mainGuestTitle}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-slate-400 mt-1">
                    {formattedPartyDate} &nbsp;•&nbsp; Arrive at {arrivalTimeDisplay} &nbsp;•&nbsp; {locationDisplay}
                  </p>
                </div>

                {/* First Glance Summary */}
                <div className="pt-1 space-y-2 text-xs sm:text-sm text-slate-200 leading-relaxed text-left">
                  {prepCharPres.blurbParagraphs && prepCharPres.blurbParagraphs.length > 0 ? (
                    prepCharPres.blurbParagraphs.map((para, idx) => <p key={idx}>{para}</p>)
                  ) : (
                    <p>{prepCharPres.shortBlurb}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Clean Sub-Tabs on the Guest's Sheet */}
            <div className="bg-slate-950/60 px-3 sm:px-6 py-2.5 flex items-center justify-center sm:justify-start gap-2 border-b border-white/10">
              {[
                { id: 'character' as const, label: 'Outfit & Character Guide' },
                { id: 'details' as const, label: 'Party Details & What to Bring' },
                { id: 'guests' as const, label: `Guest List (${activeCharacters.length})` },
              ].map(tab => {
                const active = prepSheetTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPrepSheetTab(tab.id)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-white text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              {prepSheetTab === 'character' && (
                <>
                  {/* What to Wear & 3 Outfit Reference Options */}
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          What to Wear ({Math.min(3, outfitOptionsCount)} Outfit Options)
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1">
                          {prepCharPres.outfitAdvice}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-1">
                      {Array.from({ length: Math.min(3, outfitOptionsCount) }, (_, optIdx) => {
                        const refUrl = prepCharPres.outfitReferenceImages?.[optIdx] || null;
                        const optionCaption = prepCharPres.outfitOptions?.[optIdx] || null;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => {
                              if (refUrl) {
                                setLightboxPhoto({
                                  url: refUrl,
                                  title: `${mainGuestTitle} (${prepCharPres.roleTitle}) - Look ${optIdx + 1}`,
                                  subtitle: optionCaption || undefined,
                                });
                              }
                            }}
                            className={`rounded-2xl overflow-hidden border border-white/10 bg-slate-950 shadow-md flex flex-col justify-between ${
                              refUrl ? 'cursor-pointer group/img hover:border-brand-pink/50 transition-all' : ''
                            }`}
                          >
                            {refUrl && (
                              <div className="aspect-[3/4] w-full overflow-hidden bg-slate-900">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={refUrl}
                                  alt={`Look ${optIdx + 1}`}
                                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                                />
                              </div>
                            )}
                            <div className="p-3.5 bg-slate-900/95 border-t border-white/10 space-y-1 flex-grow flex flex-col justify-center">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-black uppercase tracking-wider text-brand-pink">
                                  Look {optIdx + 1}
                                </span>
                                {refUrl && (
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    Tap to enlarge
                                  </span>
                                )}
                              </div>
                              {optionCaption && (
                                <p className="text-xs font-medium text-slate-200 leading-snug">
                                  {optionCaption}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* How to Act */}
                  {(prepCharPres.actSummary || prepCharPres.actBullets.length > 0) && (
                    <div className="pt-5 border-t border-white/10 space-y-3">
                      <h2 className="text-lg font-bold text-white">
                        How to Play {prepCharPres.roleTitle}
                      </h2>
                      {prepCharPres.actSummary && (
                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                          {prepCharPres.actSummary}
                        </p>
                      )}
                      {prepCharPres.actBullets.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {prepCharPres.actBullets.map((bullet, idx) => (
                            <div
                              key={idx}
                              className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5 text-xs sm:text-sm text-slate-200 leading-snug"
                            >
                              <span className="text-brand-pink font-bold shrink-0">•</span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Confirm Ready CTA */}
                  <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-white">
                        {isThisCharConfirmed
                          ? `You're confirmed ready for party night${prepCharPres.guestName ? `, ${prepCharPres.guestName}` : ''}!`
                          : 'Let your host know you have read your role & outfit guide'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {isThisCharConfirmed
                          ? 'Your host can see that you have reviewed your character sheet.'
                          : 'Round 1 clues remain locked until everyone arrives at the party.'}
                      </p>
                    </div>

                    {!isThisCharConfirmed && (
                      <button
                        type="button"
                        disabled={isConfirmingPrepRead}
                        onClick={() =>
                          void handleConfirmPrepRead(
                            selectedChar.id,
                            prepCharPres.guestName || undefined
                          )
                        }
                        className="px-5 py-3 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer shrink-0"
                      >
                        {isConfirmingPrepRead ? 'Confirming...' : "I've Read My Role & Outfit ✓"}
                      </button>
                    )}
                  </div>
                </>
              )}

              {prepSheetTab === 'details' && (
                <div className="space-y-6">
                  {renderMysteryOverviewSection()}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Date
                      </span>
                      <p className="text-base font-bold text-white mt-0.5">{formattedPartyDate}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Time
                      </span>
                      <p className="text-base font-bold text-white mt-0.5">
                        Arrive {arrivalTimeDisplay}
                        {partyDetails?.gameStartTime ? ` (Starts ${partyDetails.gameStartTime})` : ''}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Location
                      </span>
                      <p className="text-base font-bold text-white mt-0.5">{locationDisplay}</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Food &amp; Drinks
                      </span>
                      <p className="text-base font-bold text-white mt-0.5">{foodVibeDisplay}</p>
                    </div>
                  </div>

                  {renderWhatToBringSection()}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 text-xs text-slate-400">
                    <span>Add to your calendar:</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={buildGoogleCalendarUrl(prepCharPres.roleTitle)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold"
                      >
                        + Google Calendar
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDownloadIcsCalendar(prepCharPres.roleTitle)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
                      >
                        + Apple / Outlook (.ics)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {prepSheetTab === 'guests' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Everyone attending {mystery.title} and their character assignments:
                  </p>
                  {renderGuestCardsGrid(selectedChar.id)}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!selectedChar && !isClueOnlySleuth) {
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased">
        {renderHostControlsModal()}
        {renderNextConfirmModal()}
        {renderRoundUnlockToast()}
        {renderPhotoLightboxModal()}
        {renderQrJoinModal()}
        {renderRoomCastModal()}

        {/* Clean Lobby Top Header */}
        <header className="relative border-b border-white/10 bg-slate-950/95 sticky top-0 z-30 backdrop-blur-md">
          {mysteryCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mysteryCoverUrl}
              alt={mystery.title}
              className="absolute inset-0 w-full h-full object-cover opacity-10 blur-[2px] pointer-events-none"
            />
          )}
          <div className="relative z-10 max-w-6xl mx-auto px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center justify-between sm:justify-start gap-2.5 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={
                    initialIsHost
                      ? `/${locale}/builder/mysteries/${mystery.id.split('__u_')[0]}`
                      : `/${locale}/account/orders`
                  }
                  title="Exit Playroom"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-[10px] font-black uppercase tracking-wider shrink-0 transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Exit</span>
                </Link>
                <h1 className="text-sm sm:text-lg font-black uppercase tracking-tight text-white truncate">
                  {mystery.title}
                </h1>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/15 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-mono shrink-0">
                PIN {pin.slice(0, 3)} {pin.slice(3)}
              </span>
            </div>

            {isHostMode && (
              <div className="flex items-center justify-between sm:justify-end gap-1.5 sm:gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="min-h-[34px] text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all cursor-pointer"
                  >
                    📲 Invite / QR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleShareOrCopyGuestLink(false)}
                    className={`min-h-[34px] text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      copiedGuestLink
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : 'bg-white/5 text-slate-200 border-white/15 hover:border-brand-pink/50'
                    }`}
                  >
                    {copiedGuestLink ? '✓ Copied' : '📋 Copy Link'}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isRefreshingSession || !nextStepInfo.canAdvance}
                  onClick={() => handleHostNextStep(false)}
                  className="min-h-[34px] text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl bg-brand-pink text-white hover:opacity-95 transition-all shadow disabled:opacity-40 cursor-pointer"
                >
                  {isRefreshingSession ? '⏳...' : nextStepInfo.label}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Character Selection Grid */}
        <div className="flex-grow max-w-6xl mx-auto w-full px-3 sm:px-6 py-3.5 sm:py-5 space-y-3.5 sm:space-y-5">
          {/* Single Compact Welcome Bar */}
          <div className="rounded-2xl bg-slate-900/80 border border-white/10 px-3.5 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest shrink-0">
                🎭 Choose Your Character
              </span>
              <div className="flex items-center gap-1.5 sm:hidden">
                <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[10px] font-black text-emerald-400">
                  👥 {claimedCount}/{activeCharacters.length} Cast
                </span>
                {detectiveGuests.length > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-sky-400/15 border border-sky-400/30 text-[10px] font-black text-sky-300">
                    🕵️ +{detectiveGuests.length} Detective{detectiveGuests.length === 1 ? '' : 's'}
                  </span>
                )}
                {isHostMode && (claimedCount > 0 || detectiveGuests.length > 0) && (
                  <button
                    type="button"
                    onClick={handleHostResetClaims}
                    className="px-2 py-0.5 rounded-lg bg-white/5 text-[9px] font-black uppercase text-amber-300 border border-amber-400/30 cursor-pointer"
                  >
                    🔓 Reset
                  </button>
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold text-slate-200 w-full sm:w-auto">
                Find your name below and tap your card — or join at the bottom as <strong className="text-sky-300">🕵️ Detective [Your Name]</strong> if you&apos;re an extra guest!
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-black text-emerald-400">
                👥 {claimedCount}/{activeCharacters.length} Cast Joined
              </span>
              {detectiveGuests.length > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-sky-400/15 border border-sky-400/30 text-[11px] font-black text-sky-300">
                  🕵️ +{detectiveGuests.length} Detective{detectiveGuests.length === 1 ? '' : 's'}
                </span>
              )}
              {isHostMode && (claimedCount > 0 || detectiveGuests.length > 0) && (
                <button
                  type="button"
                  onClick={handleHostResetClaims}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase text-amber-300 border border-amber-400/30 cursor-pointer"
                >
                  🔓 Reset Claims
                </button>
              )}
            </div>
          </div>

          {claimError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-bold text-center">
              ⚠️ {claimError}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {activeCharacters.map(char => {
              const { name, archetype, guestName } = parseCharacter(char);
              const charPres = getCleanCharacterPresentation(char, characters, { mode: 'generic' });
              const charAvatarUrl = resolveDisplayAvatarUrl(
                charPres.characterPhotoUrl || char.profile_data?.avatar_url || char.image_url
              );
              const claimInfo = claimedCharacters[char.id];
              const isClaimedByMe = Boolean(
                claimInfo && playerToken && claimInfo.token === playerToken
              );
              const isClaimedByOther = Boolean(
                claimInfo && (!playerToken || claimInfo.token !== playerToken)
              );
              const isClaimingThis = isClaimingCharId === char.id;

              return (
                <div
                  key={char.id}
                  onClick={() => {
                    if (!isClaimingThis) {
                      handleSelectCharacterInLobby(char.id);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isClaimingThis) {
                      e.preventDefault();
                      handleSelectCharacterInLobby(char.id);
                    }
                  }}
                  className={`group rounded-2xl sm:rounded-3xl overflow-hidden text-left transition-all flex flex-col justify-between border relative cursor-pointer ${
                    isClaimedByMe
                      ? 'bg-brand-pink/15 border-brand-pink shadow-[0_0_25px_rgba(254,4,198,0.25)]'
                      : 'bg-slate-900/75 border-white/15 hover:border-brand-pink/70 hover:bg-slate-900 shadow-lg'
                  }`}
                >
                  {/* Character Portrait */}
                  <div className="relative w-full h-44 sm:h-72 bg-slate-950 overflow-hidden border-b border-white/10">
                    {charAvatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={charAvatarUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-gradient-to-br from-slate-900 to-slate-950">
                        {char.is_victim ? '💀' : '🕵️'}
                      </div>
                    )}

                    <div className="absolute inset-x-0 bottom-0 h-16 sm:h-24 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent pointer-events-none" />

                    {/* Top Overlay: Character Type Pill on Left, Victim/Claimed Status on Right */}
                    <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-center justify-between gap-1.5 z-10">
                      <span className="inline-flex items-center px-2.5 sm:px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-white/15 text-white text-[10px] sm:text-xs font-bold tracking-wide max-w-[72%] truncate shadow-sm">
                        {charPres.roleTitle || archetype || name}
                      </span>

                      {char.is_victim && (
                        <span className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-brand-pink text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0 shadow-sm">
                          The Victim
                        </span>
                      )}
                    </div>

                    {(isClaimedByMe || isClaimedByOther) && (
                      <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-10">
                        <span
                          className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md ${
                            isClaimedByMe
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-black/85 text-emerald-300 border border-emerald-400/40'
                          }`}
                        >
                          {isClaimedByMe ? '✓ Yours' : '✓ Joined'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body: Guest Name as Main Header */}
                  <div className="p-3 sm:p-4 flex flex-col justify-between gap-2 sm:gap-3 flex-grow">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <h3 className="text-sm sm:text-xl font-black text-white leading-snug group-hover:text-brand-pink transition-colors truncate">
                          {guestName || charPres.roleTitle || archetype}
                        </h3>
                      </div>
                      {guestName && (
                        <p className="text-[11px] font-semibold text-brand-pink truncate">
                          Playing {charPres.roleTitle || archetype}
                        </p>
                      )}
                      <p className="text-[11px] sm:text-xs text-slate-300 line-clamp-2 leading-snug sm:leading-relaxed">
                        {charPres.shortBlurb}
                      </p>
                    </div>

                    <div className="pt-2 sm:pt-2.5 border-t border-white/10 flex items-center justify-between gap-1.5">
                      <span className="hidden sm:inline text-[11px] font-bold text-slate-400 truncate">
                        {guestName ? `For ${guestName}` : 'Tap to claim'}
                      </span>
                      <span
                        className={`w-full sm:w-auto text-center text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-1.5 rounded-xl shrink-0 ${
                          isClaimedByMe
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-brand-pink text-white group-hover:opacity-95'
                        }`}
                      >
                        {isClaimingThis
                          ? 'Opening...'
                          : isClaimedByMe
                          ? 'Enter →'
                          : 'Claim Role →'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Prominent Extra Friend / Guest Detective Card ("Detective [Your Name]") */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-sky-950/35 to-slate-900 border-2 border-sky-400/40 p-4 sm:p-5 shadow-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[10px] font-black uppercase tracking-widest">
                    🕵️ Extra Guest Player
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-300 text-[10px] font-black uppercase tracking-wider">
                    Play as &ldquo;{formattedDetectiveName}&rdquo;
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-black text-white">
                  Extra Friend Joining the Party Without an Assigned Character?
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter your name below to join as <strong className="text-sky-300">🕵️ Detective [Your Name]</strong> — you&apos;ll get an official Detective Briefing to interrogate the suspects, see every live clue on your phone, vote in every round, and compete on the leaderboard!
                </p>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  void handleJoinAsDetective();
                }}
                className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 w-full sm:w-auto shrink-0"
              >
                <input
                  type="text"
                  value={customSleuthName}
                  onChange={e => setCustomSleuthName(e.target.value)}
                  placeholder="Your Name (e.g. Sarah)"
                  className="flex-grow sm:w-48 min-h-[42px] bg-slate-950 border border-sky-400/40 rounded-xl px-3.5 py-2 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-sky-400"
                />
                <button
                  type="submit"
                  disabled={isJoiningDetective}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-lg shrink-0 cursor-pointer"
                >
                  {isJoiningDetective
                    ? 'Joining...'
                    : `🕵️ Join as ${formattedDetectiveName} →`}
                </button>
              </form>
            </div>

            {detectiveGuests.length > 0 && (
              <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-300 mr-1">
                  🕵️ Guest Detectives Joined ({detectiveGuests.length}):
                </span>
                {detectiveGuests.map(det => (
                  <span
                    key={det.id}
                    className="px-2.5 py-0.5 rounded-full bg-sky-400/15 border border-sky-400/30 text-sky-200 text-[11px] font-black"
                  >
                    🕵️ {det.displayName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ACTIVE PLAYROOM (CLEAN HEADER + HOST STAGE BAR + FOCUSED TABS)
  // ============================================================================
  const selectedName = selectedChar ? parseCharacter(selectedChar).name : formattedDetectiveName;
  const selectedArchetype = selectedChar ? parseCharacter(selectedChar).archetype : 'Official Guest Detective';
  const selectedCharAvatar = selectedChar
    ? resolveDisplayAvatarUrl(
        getCleanCharacterPresentation(selectedChar, characters, { mode: 'print' })
          .characterPhotoUrl ||
          selectedChar.profile_data?.avatar_url ||
          selectedChar.image_url
      )
    : '';

  const charConnections = selectedChar
    ? (relationships
        .filter(
          r =>
            r.know_each_other &&
            (r.character_a_id === selectedChar.id || r.character_b_id === selectedChar.id)
        )
        .map(r => {
          const otherId =
            r.character_a_id === selectedChar.id ? r.character_b_id : r.character_a_id;
          const otherChar = characters.find(c => c.id === otherId);
          return { relationship: r, character: otherChar };
        })
        .filter(conn => conn.character !== undefined) as {
        relationship: Relationship;
        character: Character;
      }[])
    : [];

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased pb-20 sm:pb-0">
      {renderHostControlsModal()}
      {renderNextConfirmModal()}
      {renderRoundUnlockToast()}
      {renderPhotoLightboxModal()}
      {renderQrJoinModal()}
      {renderRoomCastModal()}

      {/* ========================================================================
          CLEAN STICKY HEADER: IDENTITY LEFT • STAGE TIMELINE CENTER • HOST CTA RIGHT
      ========================================================================= */}
      <header className="bg-slate-950/95 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-2.5 flex items-center justify-between gap-2.5">
          {/* Left: Exit + Active Character Pill + Room Cast Drawer Trigger */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={
                initialIsHost
                  ? `/${locale}/builder/mysteries/${mystery.id.split('__u_')[0]}`
                  : `/${locale}/account/orders`
              }
              title="Exit Playroom"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 text-[10px] font-black uppercase tracking-wider shrink-0 transition-all"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="hidden xs:inline">Exit</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsRoomCastOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer min-w-0"
              title="Tap to view all characters in the room or switch character"
            >
              {selectedChar && selectedCharAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCharAvatar}
                  alt={selectedName}
                  className="w-7 h-7 rounded-lg object-cover object-top shrink-0"
                />
              ) : (
                <span className="text-sm">🕵️</span>
              )}
              <div className="text-left min-w-0">
                <div className="text-xs font-black text-white truncate max-w-[130px] sm:max-w-[180px]">
                  {selectedName}
                </div>
                <div className="text-[9px] font-bold text-slate-400 truncate">
                  👥 Cast ({activeCharacters.length}) • Switch
                </div>
              </div>
            </button>
          </div>

          {/* Center (Host Laptop Only): Visual Stage Progress Timeline */}
          {isHostMode && (
            <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-white/10 rounded-xl p-1">
              {stageTimelineSteps.map(st => {
                const isCurrent = currentRound === st.r;
                const isPast = currentRound > st.r;
                return (
                  <button
                    key={st.r}
                    type="button"
                    onClick={() => handleHostSetRound(st.r)}
                    title={`Jump to ${st.label}`}
                    className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-brand-pink text-white shadow'
                        : isPast
                        ? 'text-emerald-400 hover:bg-white/5'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {isPast ? `✓ ${st.short}` : st.short}
                  </button>
                );
              })}
            </div>
          )}

          {/* Right: Invite/QR + Host Controls (Host Only — Hidden on Guest Phones) */}
          {isHostMode && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-200 cursor-pointer"
                title="Show Game PIN & Invite QR Code"
              >
                📲 Invite / QR
              </button>
              <button
                type="button"
                onClick={() => setIsHostPanelOpen(true)}
                className="min-h-[34px] px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-300 cursor-pointer"
                title="Open Full Host Stage Console"
              >
                🎛️
              </button>
              <button
                type="button"
                disabled={isRefreshingSession || !nextStepInfo.canAdvance}
                onClick={() => handleHostNextStep(false)}
                className="min-h-[34px] px-3 py-1.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-[10px] font-black uppercase tracking-wider shadow transition-all disabled:opacity-40 cursor-pointer"
              >
                {isRefreshingSession ? '⏳...' : nextStepInfo.label}
              </button>
            </div>
          )}
        </div>

        {/* Row 2: Clean Desktop Tab Bar */}
        <div className="hidden sm:block border-t border-white/5 bg-slate-950/80">
          <div className="max-w-5xl mx-auto w-full px-3 sm:px-5 py-1.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {!isClueOnlySleuth ? (
                <>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      activeTab === 'profile'
                        ? 'bg-brand-pink text-white border-brand-pink shadow-xs'
                        : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    👤 My Role &amp; Cheat-Sheet
                  </button>
                  <button
                    onClick={() => setActiveTab('relations')}
                    className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                      activeTab === 'relations'
                        ? 'bg-brand-pink text-white border-brand-pink shadow-xs'
                        : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🕸️ Connections ({charConnections.length})
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-sky-400 text-slate-950 border-sky-400 shadow-xs'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  🕵️ Detective Briefing &amp; Suspects ({activeCharacters.length})
                </button>
              )}

              <button
                onClick={() => setActiveTab('clues')}
                className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'clues'
                    ? 'bg-brand-pink text-white border-brand-pink shadow-xs'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <span>
                  {isGuessStep
                    ? `🗳️ Vote (Round ${unlockedClueRound})`
                    : unlockedClueRound >= 1
                    ? `🔍 Clues (Round ${unlockedClueRound})`
                    : '🔒 Clues (Round 1 Locked)'}
                </span>
                {totalUnreadUnlockedClues > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                    {totalUnreadUnlockedClues} NEW
                  </span>
                )}
              </button>

              {unlockedClueRound >= maxClueRound && (
                <button
                  onClick={() => setActiveTab('reveal')}
                  className={`px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                    activeTab === 'reveal'
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs'
                      : 'text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/15'
                  }`}
                >
                  🏆 Final Reveal &amp; Score
                </button>
              )}
            </div>

            {isHostMode && (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Host Stage: <strong className="text-brand-pink">{currentStageLabel}</strong>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow max-w-5xl mx-auto w-full px-3 sm:px-5 py-3 sm:py-4 space-y-3.5 sm:space-y-4">
        {/* =====================================================================
            HOST-ONLY MC COMMAND BAR (HIDDEN FROM ALL GUEST PHONES)
        ====================================================================== */}
        {isHostMode && (
          <div className="rounded-2xl bg-slate-900/90 border border-amber-400/35 p-3 sm:p-4 space-y-2.5 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                  🎛️ Host Controls • {stageGuidance.badge}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[9px] sm:text-[10px] font-bold">
                  {stageGuidance.timerLabel}
                </span>
                {unlockedClueRound >= 1 && unlockedClueRound <= maxClueRound && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[9px] sm:text-[10px] font-black">
                    🗳️ {currentRoundSubmissions.length}/{suspectCharacters.length + detectiveGuests.length} Votes In
                    {detectiveGuests.length > 0
                      ? ` (${detectiveGuests.length} Detective${detectiveGuests.length === 1 ? '' : 's'})`
                      : ''}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {!isGuessStep && unlockedClueRound >= 1 && unlockedClueRound <= maxClueRound && (
                  <button
                    type="button"
                    disabled={isRefreshingSession}
                    onClick={() => handleHostSetRound(unlockedClueRound + 0.5)}
                    className="px-2.5 py-1 rounded-lg bg-brand-pink hover:opacity-95 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow cursor-pointer"
                  >
                    🗳️ Open Round {unlockedClueRound} Voting for Guests →
                  </button>
                )}

                {unlockedClueRound >= 1 &&
                  unlockedClueRound <= maxClueRound &&
                  currentRoundSubmissions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleHostToggleShareRound(activeVotingRound)}
                      className={`px-2 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isCurrentRoundSharedWithGuests
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      {isCurrentRoundSharedWithGuests ? '✓ Tally Shared' : '📢 Share Tally'}
                    </button>
                  )}

                {currentRound === 5 && (
                  <button
                    type="button"
                    onClick={() =>
                      handleHostSetRevealMode(
                        revealMode === 'shared_with_guests'
                          ? 'phone_free'
                          : 'shared_with_guests'
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                      revealMode === 'shared_with_guests'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-brand-pink text-white'
                    }`}
                  >
                    {revealMode === 'shared_with_guests'
                      ? '✓ Solution Shared'
                      : '📲 Push Solution'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowHostScriptStrip(prev => !prev)}
                  className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-amber-200 text-[9px] sm:text-[10px] font-black uppercase tracking-wider cursor-pointer"
                >
                  {showHostScriptStrip ? 'Hide Script ▲' : '📢 MC Script ▼'}
                </button>
              </div>
            </div>

            {showHostScriptStrip && (
              <div className="rounded-xl bg-slate-950/90 border border-amber-400/30 p-2.5 sm:p-3 space-y-1">
                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-amber-300">
                  📢 Read Out Loud to the Room (Spoiler-Free MC Script):
                </div>
                <p className="text-xs sm:text-sm font-bold text-amber-50 italic leading-snug sm:leading-relaxed">
                  {stageGuidance.hostScript}
                </p>
              </div>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 1A: GUEST DETECTIVE BRIEFING & SUSPECT INTERROGATION LINEUP
        ====================================================================== */}
        {activeTab === 'profile' && isClueOnlySleuth && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 1. Guest Detective Hero Card */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 border-2 border-sky-400/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-row items-start gap-4 shadow-xl">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-2xl bg-sky-400/15 border-2 border-sky-400/50 flex items-center justify-center text-3xl sm:text-5xl shrink-0 shadow-lg">
                🕵️
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-400 text-slate-950 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                    🕵️ Official Guest Detective
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
                    ✓ Airtight Alibi • Not a Suspect
                  </span>
                </div>
                <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                  {formattedDetectiveName}
                </h2>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                  You are an official Guest Investigator at tonight&apos;s party! Because you aren&apos;t one of the suspects, your mission is to roam the room, grill the suspects below using your interrogation prompts, inspect every live clue drop, and vote in every round to catch the killer.
                </p>
              </div>
            </div>

            {/* 2. Interactive Suspect Interrogation Lineup */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-widest text-sky-300">
                    💬 Suspect Interrogation Lineup ({activeCharacters.length} Cast Members)
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Walk up to anyone below during the party and ask them their interrogation question
                  </p>
                </div>
                {unlockedClueRound >= 1 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('clues')}
                    className="px-3 py-1.5 rounded-xl bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0"
                  >
                    {isGuessStep
                      ? `🗳️ Go to Round ${unlockedClueRound} Vote →`
                      : `🔍 View Round ${unlockedClueRound} Clues →`}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeCharacters.map((char, charIdx) => {
                  const { name, archetype, guestName } = parseCharacter(char);
                  const charPres = getCleanCharacterPresentation(char, characters, { mode: 'print' });
                  const charAvatarUrl = resolveDisplayAvatarUrl(
                    charPres.characterPhotoUrl || char.profile_data?.avatar_url || char.image_url
                  );
                  const roleLabel = charPres.roleTitle || archetype || name;
                  const victimChar = activeCharacters.find(c => c.is_victim);
                  const victimName = victimChar ? parseCharacter(victimChar).name : 'the victim';
                  const suspectQuestions = [
                    `"Ask ${name} (${roleLabel}) what their last private conversation with ${victimName} was really about — and who else overheard it."`,
                    `"Ask ${name} (${roleLabel}) to walk you through their exact alibi timeline tonight and who in the room can actually vouch for them."`,
                    `"Ask ${name} (${roleLabel}) what secret or grudge they think ${victimName} was holding over someone at this party."`,
                    `"Ask ${name} (${roleLabel}) who they saw acting suspiciously near ${victimName} earlier — and why they haven't spoken up yet."`,
                    `"Ask ${name} (${roleLabel}) what they stand to gain or lose after tonight, and which guest they trust the least right now."`,
                  ];
                  const interrogationPrompt = char.is_victim
                    ? `"Ask ${name} (${roleLabel}) who in the room has been acting tense, defensive, or secretive around them tonight."`
                    : suspectQuestions[charIdx % suspectQuestions.length];

                  return (
                    <div
                      key={char.id}
                      className="rounded-2xl bg-slate-950/80 border border-white/10 p-3.5 flex flex-col justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          onClick={() => {
                            if (charAvatarUrl) {
                              setLightboxPhoto({
                                url: charAvatarUrl,
                                title: charPres.roleTitle || archetype,
                                subtitle: guestName ? `Played by ${guestName}` : undefined,
                              });
                            }
                          }}
                          className="w-14 h-16 sm:w-16 sm:h-20 rounded-xl overflow-hidden bg-slate-900 border border-white/15 shrink-0 cursor-pointer"
                        >
                          {charAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={charAvatarUrl}
                              alt={name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl">
                              {char.is_victim ? '💀' : '🕵️'}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                char.is_victim
                                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  : 'bg-white/10 text-slate-300'
                              }`}
                            >
                              {char.is_victim ? '💀 Victim' : '🕵️ Suspect'}
                            </span>
                            {guestName && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                                👤 {guestName}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-white truncate">
                            {charPres.roleTitle || archetype}
                          </h4>
                          <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                            {charPres.shortBlurb}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="rounded-xl bg-sky-400/10 border border-sky-400/25 px-3 py-2 text-[11px] text-slate-200 italic leading-snug">
                          <strong className="text-sky-300 not-italic uppercase text-[9px] tracking-wider mr-1">
                            🕵️ Ask them:
                          </strong>
                          {interrogationPrompt}
                        </div>

                        {!char.is_victim && isGuessStep && unlockedClueRound >= 1 && (
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setAccusedCharId(char.id);
                                setActiveTab('clues');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider cursor-pointer"
                            >
                              🗳️ Vote for {name} →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 1: MY ROLE & PARTY CHEAT-SHEET (BUILT FOR DURING THE PARTY)
        ====================================================================== */}
        {activeTab === 'profile' && selectedChar && (() => {
          const charPres = getCleanCharacterPresentation(selectedChar, characters, { mode: 'print' });
          const heroPortraitUrl =
            charPres.characterPhotoUrl ||
            resolveDisplayAvatarUrl(
              selectedChar.profile_data?.avatar_url || selectedChar.image_url
            );

          return (
            <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
              {/* 1. COMPACT CHARACTER HERO CARD (HORIZONTAL ON MOBILE & DESKTOP) */}
              <div className="bg-slate-900/80 border border-white/15 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 flex flex-row items-start gap-3.5 sm:gap-5 shadow-xl">
                <div
                  onClick={() => {
                    if (heroPortraitUrl) {
                      setLightboxPhoto({
                        url: heroPortraitUrl,
                        title: charPres.roleTitle,
                        subtitle: charPres.guestName ? `Played by ${charPres.guestName}` : undefined,
                      });
                    }
                  }}
                  className="w-20 h-24 sm:w-36 sm:h-44 rounded-xl sm:rounded-2xl overflow-hidden border-2 border-brand-pink/50 bg-slate-950 shrink-0 relative group cursor-pointer shadow-lg"
                >
                  {heroPortraitUrl ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={heroPortraitUrl}
                        alt={charPres.roleTitle}
                        className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 px-1.5 sm:px-2 py-0.5 rounded-full bg-black/75 text-white text-[8px] sm:text-[9px] font-black uppercase">
                        🔍
                      </span>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">
                      🕵️
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 sm:space-y-2.5 text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                        {charPres.isVictim ? '💀 Story Catalyst / Victim' : '🕵️ Suspect Cheat-Sheet'}
                      </span>
                      {charPres.guestName && (
                        <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">
                          👤 {charPres.guestName}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePrepMode(true)}
                      className="px-2.5 py-1 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-300 text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      👗 Pre-Party Outfit &amp; First Glance Sheet →
                    </button>
                  </div>

                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight leading-tight">
                    {charPres.roleTitle}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-200 leading-snug sm:leading-relaxed">
                    {charPres.shortBlurb}
                  </p>
                </div>
              </div>

              {/* 2. TWO-COLUMN PARTY ACTION CHEAT-SHEET (HOW TO ACT + SECRETS | WHO TO TALK TO FIRST) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* LEFT 6 COLS: HOW TO PLAY YOUR ROLE & YOUR HIDDEN SECRET */}
                <div className="lg:col-span-6 space-y-4">
                  {/* How to Play Your Role */}
                  {(charPres.actSummary || charPres.actBullets.length > 0) && (
                    <div className="bg-slate-900/60 border border-brand-pink/30 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-brand-pink">
                          🎭 How to Play Your Role Tonight
                        </h3>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-brand-pink/15 text-brand-pink">
                          Roleplay Cues
                        </span>
                      </div>

                      {charPres.actSummary && (
                        <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                          {charPres.actSummary}
                        </p>
                      )}

                      {charPres.actBullets.length > 0 && (
                        <div className="space-y-2 pt-1">
                          {charPres.actBullets.map((bullet, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2 text-xs text-slate-200 leading-snug"
                            >
                              <span className="text-brand-pink font-black shrink-0">✦</span>
                              <span>{bullet}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Hidden Secret & Personal Motivation (At Eye Level!) */}
                  {charPres.secrets && (
                    <div className="bg-rose-950/35 border border-rose-500/35 rounded-2xl p-4 sm:p-5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-xs font-black uppercase tracking-widest text-rose-400">
                          🤫 Your Hidden Secret &amp; Motivation
                        </h3>
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                          Keep Guarded
                        </span>
                      </div>
                      <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                        {charPres.secrets}
                      </p>
                    </div>
                  )}
                </div>

                {/* RIGHT 6 COLS: WHO TO TALK TO FIRST (DIRECT CONNECTIONS & ICEBREAKERS) */}
                <div className="lg:col-span-6 bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">
                          💬 Who to Talk to First ({charConnections.length})
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          Your key relationships and conversation starters for tonight
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('relations')}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[10px] font-black uppercase tracking-wider cursor-pointer shrink-0"
                      >
                        Full View →
                      </button>
                    </div>

                    {charConnections.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">
                        Tap the Connections tab or Room Cast to explore everyone in the room.
                      </p>
                    ) : (
                      <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                        {charConnections.map(conn => {
                          const {
                            name: otherName,
                            archetype: otherArch,
                            guestName: otherGuest,
                          } = parseCharacter(conn.character);
                          const dynamics = conn.relationship.dynamics;
                          const notes = conn.relationship.notes;
                          const dynJoin = (dynamics || []).join(' ').toLowerCase();
                          const icebreakerPrompt =
                            dynJoin.includes('affair') ||
                            dynJoin.includes('lover') ||
                            dynJoin.includes('ex') ||
                            dynJoin.includes('roman')
                              ? `"Keep your voice low and ask ${otherName} if anyone else in the room found out about the two of you before tonight."`
                              : dynJoin.includes('rival') ||
                                  dynJoin.includes('blackmail') ||
                                  dynJoin.includes('debt') ||
                                  dynJoin.includes('feud')
                                ? `"Corner ${otherName} and ask what they were doing in the 20 minutes before the victim was found—and whether they're still hiding what they owe."`
                                : `"Pull ${otherName} aside, bring up your shared history, and ask who they saw acting nervous around the victim tonight."`;

                          return (
                            <div
                              key={conn.character.id}
                              className="rounded-xl bg-slate-950/80 border border-white/10 p-3 space-y-1.5"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-1.5">
                                <span className="text-xs font-black text-white">
                                  {otherName}{' '}
                                  <span className="text-[10px] font-bold text-slate-400">
                                    ({otherArch})
                                  </span>
                                </span>
                                {otherGuest && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                                    👤 {otherGuest}
                                  </span>
                                )}
                              </div>

                              {notes && (
                                <p className="text-[11px] text-slate-300 leading-snug">
                                  {hydrateTextWithCharacters(notes, characters, 'print')}
                                </p>
                              )}

                              <div className="rounded-lg bg-brand-pink/10 border border-brand-pink/25 px-2.5 py-1.5 text-[11px] text-slate-200 italic">
                                <strong className="text-brand-pink not-italic uppercase text-[9px] tracking-wider mr-1">
                                  Ask them:
                                </strong>
                                {icebreakerPrompt}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. COLLAPSIBLE ACCORDIONS FOR FULL BACKSTORY & PRE-PARTY OUTFIT REFERENCE */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accordion 1: Full Backstory */}
                <details className="group bg-slate-900/45 border border-white/10 rounded-2xl overflow-hidden">
                  <summary className="px-4 py-3.5 cursor-pointer list-none flex items-center justify-between gap-2 hover:bg-white/5 transition-colors">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                      <span>📖</span> Read Your Full Backstory
                    </span>
                    <span className="text-[10px] font-black uppercase text-brand-pink group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-2.5 text-slate-200 text-xs sm:text-sm leading-relaxed">
                    {charPres.blurbParagraphs.map((para, idx) => (
                      <p key={idx}>{para}</p>
                    ))}
                  </div>
                </details>

                {/* Accordion 2: Pre-Party Outfit & Costume Reference */}
                <details className="group bg-slate-900/45 border border-emerald-500/20 rounded-2xl overflow-hidden">
                  <summary className="px-4 py-3.5 cursor-pointer list-none flex items-center justify-between gap-2 hover:bg-white/5 transition-colors">
                    <span className="text-xs font-black uppercase tracking-widest text-emerald-300 flex items-center gap-2">
                      <span>👗</span> Costume &amp; Outfit Reference Guide
                    </span>
                    <span className="text-[10px] font-black uppercase text-emerald-400 group-open:rotate-180 transition-transform">
                      ▼
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 border-t border-white/10 space-y-3">
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      {charPres.outfitAdvice}
                    </p>
                    {charPres.outfitReferenceImages && charPres.outfitReferenceImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2.5">
                        {charPres.outfitReferenceImages.slice(0, 3).map((refUrl, optIdx) => (
                          <div
                            key={optIdx}
                            onClick={() =>
                              setLightboxPhoto({
                                url: refUrl,
                                title: `${charPres.roleTitle} - Outfit Option ${optIdx + 1}`,
                              })
                            }
                            className="rounded-xl overflow-hidden border border-white/15 bg-slate-950 cursor-pointer group/img"
                          >
                            <div className="aspect-[3/4] w-full overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={refUrl}
                                alt={`Outfit ${optIdx + 1}`}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: RELATIONSHIPS */}
        {activeTab === 'relations' && selectedChar && (
          <div className="space-y-3.5 animate-in fade-in duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900/50 border border-white/10 px-4 py-2.5">
              <div>
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  🕸️ Your Direct Connections ({charConnections.length})
                </h2>
                <p className="text-[11px] text-slate-400">
                  Walk up to these people first to spark drama and test their alibis!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoomCastOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-brand-pink/20 hover:bg-brand-pink text-brand-pink hover:text-white border border-brand-pink/30 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                👥 View All {activeCharacters.length} Room Characters →
              </button>
            </div>

            {charConnections.length === 0 ? (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
                You don&apos;t have any seeded connections with other characters. Tap &ldquo;View All Room Characters&rdquo; above to see everyone in the room!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {charConnections.map(conn => {
                  const {
                    name: otherName,
                    archetype: otherArch,
                    guestName: otherGuest,
                  } = parseCharacter(conn.character);
                  const otherPres = getCleanCharacterPresentation(conn.character, characters, {
                    mode: 'generic',
                  });
                  const otherAvatarUrl = resolveDisplayAvatarUrl(
                    otherPres.characterPhotoUrl ||
                      conn.character.profile_data?.avatar_url ||
                      conn.character.image_url
                  );
                  const dynamics = conn.relationship.dynamics;
                  const notes = conn.relationship.notes;
                  const dynJoin = (dynamics || []).join(' ').toLowerCase();
                  const icebreakerPrompt = dynJoin.includes('affair') ||
                    dynJoin.includes('lover') ||
                    dynJoin.includes('ex') ||
                    dynJoin.includes('roman')
                    ? `"Keep your voice low and ask ${otherName} if anyone else in the room found out about the two of you before tonight."`
                    : dynJoin.includes('rival') ||
                      dynJoin.includes('blackmail') ||
                      dynJoin.includes('debt') ||
                      dynJoin.includes('feud')
                    ? `"Corner ${otherName} and ask what they were doing in the 20 minutes before the victim was found—and whether they're still hiding what they owe."`
                    : `"Pull ${otherName} aside, bring up your shared history, and ask who they saw acting nervous around the victim tonight."`;

                  let keyCount = 0;
                  let alibiCount = 0;
                  let decoyCount = 0;
                  let pinCount = 0;
                  for (const c of clues.filter(
                    rc => (rc.round_number || 1) <= Math.min(maxClueRound, unlockedClueRound)
                  )) {
                    if ((clueSuspects[c.id] || []).includes(conn.character.id)) {
                      pinCount++;
                      const t = clueTags[c.id];
                      if (t === 'key') keyCount++;
                      else if (t === 'alibi') alibiCount++;
                      else if (t === 'red_herring') decoyCount++;
                    }
                  }

                  return (
                    <div
                      key={conn.character.id}
                      className="p-4 sm:p-5 bg-slate-900/40 border border-white/10 rounded-2xl flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 border-b border-white/5 pb-3.5">
                          <div
                            onClick={() => {
                              if (otherAvatarUrl) {
                                setLightboxPhoto({
                                  url: otherAvatarUrl,
                                  title: otherName,
                                  subtitle: otherArch,
                                });
                              }
                            }}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-white/15 relative bg-slate-950 shrink-0 shadow-lg cursor-pointer"
                          >
                            {otherAvatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={otherAvatarUrl}
                                alt={otherName}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-3xl">
                                👤
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  conn.character.is_victim
                                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {conn.character.is_victim ? '💀 Victim' : '🕵️ Suspect'}
                              </span>
                              {otherGuest && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[9px] font-black uppercase">
                                  👤 Played by {otherGuest}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-black text-white truncate">
                              {otherName}
                            </h3>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-400 truncate">
                              {otherArch}
                            </p>
                            {(keyCount > 0 || alibiCount > 0 || decoyCount > 0 || pinCount > 0) && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                {keyCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase">
                                    🔑 {keyCount} Key
                                  </span>
                                )}
                                {alibiCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-400/20 text-sky-300 text-[9px] font-black uppercase">
                                    🛡️ {alibiCount} Alibi
                                  </span>
                                )}
                                {decoyCount > 0 && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-black uppercase">
                                    🐟 {decoyCount} Decoy
                                  </span>
                                )}
                                {keyCount === 0 &&
                                  alibiCount === 0 &&
                                  decoyCount === 0 &&
                                  pinCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[9px] font-black uppercase">
                                      📌 {pinCount} Clues
                                    </span>
                                  )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          {dynamics && dynamics.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {dynamics.map((d, i) => (
                                <span
                                  key={i}
                                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-brand-pink/15 text-brand-pink"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                          {notes && (
                            <p className="text-slate-200 text-xs leading-relaxed">
                              {hydrateTextWithCharacters(notes, characters, 'print')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-white/10 space-y-2">
                        <div className="rounded-xl bg-brand-pink/10 border border-brand-pink/25 px-3 py-2 space-y-0.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink block">
                            💬 Icebreaker / Ask Them Tonight:
                          </span>
                          <p className="text-[11px] text-slate-200 italic leading-snug">
                            {icebreakerPrompt}
                          </p>
                        </div>

                        {!conn.character.is_victim && isGuessStep && unlockedClueRound >= 1 && (
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setAccusedCharId(conn.character.id);
                                setActiveTab('clues');
                                if (typeof document !== 'undefined') {
                                  setTimeout(() => {
                                    const el = document.getElementById('round-suspect-vote-box');
                                    if (el)
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }, 120);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-brand-pink text-slate-200 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                            >
                              🗳️ Accuse {otherName} in Vote →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CLEAN CLUES & HOST-CONTROLLED VOTING */}
        {activeTab === 'clues' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* 1. WHEN HOST OPENS VOTING FOR THIS ROUND (isGuessStep), SHOW VOTE BOX AT TOP */}
            {isGuessStep && unlockedClueRound >= 1 && unlockedClueRound <= maxClueRound && (
              <div
                id="round-suspect-vote-box"
                className="rounded-3xl bg-slate-900/90 border-2 border-brand-pink p-4 sm:p-6 shadow-2xl space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                      🗳️ Round {activeVotingRound} Suspect Vote Open
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white mt-1">
                      Who Do You Think Did It &amp; Why?
                    </h3>
                  </div>
                  {theorySavedNotice && (
                    <span className="text-xs font-black text-emerald-300 bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 rounded-xl">
                      ✓ Round {activeVotingRound} Vote Locked!
                    </span>
                  )}
                </div>

                <form onSubmit={handleTheorySubmit} className="space-y-3.5">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {activeCharacters
                      .filter(c => !c.is_victim)
                      .map(char => {
                        const { name, archetype } = parseCharacter(char);
                        const isChosen = accusedCharId === char.id;

                        return (
                          <button
                            key={char.id}
                            type="button"
                            onClick={() => setAccusedCharId(char.id)}
                            className={`min-h-[54px] p-3 rounded-2xl border text-left transition-all flex items-center justify-between gap-2 active:scale-95 cursor-pointer ${
                              isChosen
                                ? 'border-brand-pink bg-brand-pink/25 text-white ring-1 ring-brand-pink shadow-md'
                                : 'border-white/10 bg-slate-950/70 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-xs sm:text-sm font-black truncate">{name}</p>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                {archetype}
                              </p>
                            </div>
                            {isChosen && (
                              <span className="w-5 h-5 rounded-full bg-brand-pink text-white text-xs font-black flex items-center justify-center shrink-0">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      value={accusationReason}
                      onChange={e => setAccusationReason(e.target.value)}
                      placeholder="Why do you suspect them? (e.g. alibi gap at 8:19 PM...)"
                      className="flex-grow min-h-[44px] bg-slate-950 border border-white/15 focus:border-brand-pink rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!accusedCharId || isSubmittingTheory}
                      className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      {isSubmittingTheory ? 'Saving...' : `🗳️ Lock Round ${activeVotingRound} Vote`}
                    </button>
                  </div>
                </form>

                {/* Shared Round Tally (when Host shares to phones) */}
                {isCurrentRoundSharedWithGuests && currentRoundSubmissions.length > 0 && (
                  <div className="pt-3.5 border-t border-white/10 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        📢 Live Round {activeVotingRound} Room Vote Tally
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {currentRoundSubmissions.length} Votes
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {currentRoundTally.map(item => {
                        const pct = Math.round(
                          (item.votes / Math.max(1, currentRoundSubmissions.length)) * 100
                        );
                        return (
                          <div key={item.suspectCharId} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-white">{item.suspectName}</span>
                              <span className="text-brand-pink">
                                {item.votes} ({pct}%)
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand-pink rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SIMPLE UNLOCKED ROUND SWITCHER (ONLY SHOWN ONCE ROUND 2+ IS UNLOCKED BY THE HOST) */}
            {unlockedClueRound >= 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {availableClueRounds
                  .filter(rNum => rNum <= unlockedClueRound)
                  .map(rNum => {
                    const isSelected = selectedClueRoundFilter === rNum;
                    const unreadInRound = getUnreadCountForRound(rNum);
                    return (
                      <button
                        key={rNum}
                        type="button"
                        onClick={() => {
                          setStickyClueId(null);
                          setSelectedClueRoundFilter(rNum);
                          setClueSlideIndex(0);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isSelected
                            ? 'bg-brand-pink text-white shadow'
                            : 'bg-slate-900/80 text-slate-300 hover:bg-white/10 border border-white/10'
                        }`}
                      >
                        <span>Round {rNum}</span>
                        {unreadInRound > 0 && (
                          <span
                            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                              isSelected ? 'bg-white text-brand-pink' : 'bg-brand-pink text-white'
                            }`}
                          >
                            {unreadInRound}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            )}

            {/* 3. CLEAN SWIPEABLE EVIDENCE CARD */}
            {unlockedClueRound <= 0 ? (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-8 text-center space-y-2">
                <div className="text-2xl">🔒</div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Clues Locked Until Round 1 Starts
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Once the host unlocks Round 1, your evidence deck will appear here.
                </p>
              </div>
            ) : unlockedCluesForSelectedRound.length === 0 ? (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-8 text-center space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  No clues found for this round.
                </div>
              </div>
            ) : (
              currentSlideClue && (
                <div
                  onTouchStart={onTouchStartCard}
                  onTouchEnd={onTouchEndCard}
                  className="bg-slate-900/60 border border-white/15 rounded-3xl p-4 sm:p-5 shadow-xl space-y-3.5 relative select-none touch-pan-y transition-all"
                >
                  {/* Clean 1-Line Card Top Bar */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink border border-brand-pink/30 text-[10px] font-black uppercase tracking-wider">
                        Round {currentSlideClue.round_number || 1} • Clue {safeSlideIndex + 1} of{' '}
                        {unlockedCluesForSelectedRound.length}
                      </span>
                      {extractClueTimestampInfo(currentSlideClue).label && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                          🕒 {extractClueTimestampInfo(currentSlideClue).label}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedClueModalIndex(safeSlideIndex)}
                      className="min-h-[28px] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
                    >
                      🔍 Expand
                    </button>
                  </div>

                  {/* Clue Body */}
                  <div
                    onClick={() => setSelectedClueModalIndex(safeSlideIndex)}
                    className="cursor-pointer"
                  >
                    {renderClueFormatView(currentSlideClue, false)}
                  </div>

                  {/* Subtle Optional 1-Line Personal Note */}
                  <div className="pt-2 border-t border-white/10">
                    <input
                      type="text"
                      value={clueNotes[currentSlideClue.id] || ''}
                      onChange={e =>
                        setClueNotes(prev => ({
                          ...prev,
                          [currentSlideClue.id]: e.target.value,
                        }))
                      }
                      placeholder="✍️ Personal detective note on this clue (optional)..."
                      className="w-full min-h-[36px] bg-slate-950/90 border border-white/15 focus:border-brand-pink rounded-xl px-3 py-1 text-xs text-slate-200 placeholder:text-slate-500 outline-none"
                    />
                  </div>

                  {/* Prev / Next Navigation Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handlePrevClue}
                      className="min-h-[40px] px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                    >
                      ← Prev
                    </button>

                    <div className="flex items-center gap-1.5">
                      {unlockedCluesForSelectedRound.map((c, idx) => {
                        const isUnread = !viewedClueIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setClueSlideIndex(idx)}
                            className={`h-2 rounded-full transition-all cursor-pointer ${
                              idx === safeSlideIndex
                                ? 'w-5 bg-brand-pink'
                                : isUnread
                                ? 'w-2.5 bg-brand-pink/60 ring-2 ring-brand-pink/30 animate-pulse'
                                : 'w-2 bg-white/20 hover:bg-white/40'
                            }`}
                          />
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextClue}
                      className="min-h-[40px] px-4 py-1.5 rounded-xl bg-brand-pink hover:opacity-95 text-[11px] font-black uppercase tracking-wider text-white transition-all cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* TAB 4: FINAL SOLUTION REVEAL & REVIEW-GATED PARTY VOTING STATS */}
        {activeTab === 'reveal' && (
          <div id="finale-reveal-top" className="space-y-6 animate-in fade-in duration-200">
            {/* 2-Page Finale Switcher: Page 1 (The Grand Reveal) -> Page 2 (Review-Gated Voting Stats & Who Voted For Who) */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg">
              <button
                type="button"
                onClick={() => setRevealSubPage('solution')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  revealSubPage === 'solution'
                    ? 'bg-brand-pink text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>1. The Murder Reveal &amp; Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setRevealSubPage('stats')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all cursor-pointer ${
                  revealSubPage === 'stats'
                    ? 'bg-brand-pink text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>2. Voting Stats &amp; Who Voted For Who</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    reviewSubmitted
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : revealSubPage === 'stats'
                      ? 'bg-white/20 text-white'
                      : 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {reviewSubmitted ? '✓ Unlocked' : '🔒 Leave Review'}
                </span>
              </button>
            </div>

            {revealSubPage === 'solution' ? (
              <div className="space-y-6">
                {/* 1. EDITORIAL CASE SOLUTION: KILLER PORTRAIT HERO + CHRONOLOGICAL TIMELINE */}
                <section className="bg-slate-900/75 border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7">
                  {solutionData ? (
                (() => {
                  const realMurderClues = clues.filter(
                    c => c.evidence_status !== 'fake' && c.implication_type !== 'red_herring'
                  );
                  const decoyClues = clues.filter(
                    c => c.evidence_status === 'fake' || c.implication_type === 'red_herring'
                  );
                  const beatsList: any[] = Array.isArray(solutionData.plotBeats)
                    ? solutionData.plotBeats
                    : [];

                  const killerCharObj =
                    characters.find(c => c.id === solutionData.killer?.id) ||
                    characters.find(c => (c as any).plot_role === 'killer') ||
                    null;
                  const killerPres = killerCharObj
                    ? getCleanCharacterPresentation(killerCharObj, characters, { mode: 'print' })
                    : null;
                  const killerPhotoUrl = killerCharObj
                    ? resolveDisplayAvatarUrl(
                        killerPres?.characterPhotoUrl ||
                          killerCharObj.profile_data?.avatar_url ||
                          killerCharObj.image_url
                      )
                    : null;

                  const executionBeat =
                    beatsList.find(b => Number(b.beat_number) === 4) ||
                    beatsList[beatsList.length - 1] ||
                    null;

                  return (
                    <div className="space-y-7">
                      {/* Editorial Killer Hero Banner */}
                      <div className="flex flex-col md:flex-row items-center md:items-stretch gap-6 pb-7 border-b border-white/10">
                        {/* Killer Portrait */}
                        <div className="w-40 h-52 sm:w-48 sm:h-60 rounded-2xl overflow-hidden bg-slate-950 border border-white/15 shrink-0 relative shadow-xl">
                          {killerPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={killerPhotoUrl}
                              alt={solutionData.killer?.name || 'The Killer'}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl text-slate-600">
                              🕵️
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />
                          <div className="absolute top-3 left-3">
                            <span className="px-2.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest shadow">
                              The Killer
                            </span>
                          </div>
                          <div className="absolute bottom-2.5 inset-x-3">
                            <div className="text-sm font-black text-white truncate">
                              {solutionData.killer?.name || 'The Killer'}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-300 truncate">
                              {solutionData.killer?.role}
                            </div>
                          </div>
                        </div>

                        {/* Headline + Motive & Method */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between space-y-4 text-center md:text-left">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-pink">
                                Case Solved • The Final Reveal
                              </span>
                              {solutionData.victim && (
                                <span className="text-xs text-slate-400 font-medium">
                                  • Victim: <strong className="text-slate-200">{solutionData.victim.name}</strong> ({solutionData.victim.role})
                                </span>
                              )}
                              {solutionData.assistant && (
                                <span className="text-xs text-slate-400 font-medium">
                                  • Accomplice: <strong className="text-slate-200">{solutionData.assistant.name}</strong> ({solutionData.assistant.role})
                                </span>
                              )}
                            </div>

                            <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                              {solutionData.killer?.name || 'The Killer'} Murdered{' '}
                              {solutionData.victim?.name || 'The Victim'}
                            </h2>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-left">
                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                The Motive
                              </span>
                              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                {hydrateTextWithCharacters(
                                  solutionData.killer?.motiveNotes ||
                                    beatsList.find(b => Number(b.beat_number) === 3)?.description ||
                                    beatsList[0]?.description ||
                                    'Committed to protect their secret and settle a deep personal betrayal.',
                                  characters,
                                  'print'
                                )}
                              </p>
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                                How It Happened
                              </span>
                              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                {executionBeat
                                  ? hydrateTextWithCharacters(
                                      executionBeat.description || '',
                                      characters,
                                      'print'
                                    )
                                  : 'Used a pre-staged weapon during an alibi window and was caught by physical forensic trace in the final round.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* CHRONOLOGICAL TIMELINE OF THE CRIME (CLICKABLE BEATS + FULL SUPPORTING CLUES) */}
                      {beatsList.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <h3 className="text-base sm:text-lg font-bold text-white">
                                How the Night Unfolded
                              </h3>
                              <p className="text-xs text-slate-400">
                                Tap any step below to read what happened and inspect the clues that pointed to it
                              </p>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
                                {realMurderClues.length} Real Clues • {decoyClues.length} Red Herrings
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const allBeatNums = beatsList.map((b: any, i: number) =>
                                    Number(b.beat_number || i + 1)
                                  );
                                  if (expandedRevealBeats.length === allBeatNums.length) {
                                    setExpandedRevealBeats([]);
                                  } else {
                                    setExpandedRevealBeats(allBeatNums);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
                              >
                                {expandedRevealBeats.length === beatsList.length
                                  ? 'Collapse All'
                                  : 'Expand All Steps'}
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {beatsList.map((beat: any, idx: number) => {
                              const bNum = Number(beat.beat_number || idx + 1);
                              const isBeatExpanded = expandedRevealBeats.includes(bNum);
                              const matchedBeatClues = realMurderClues.filter(c => {
                                const ca = c as any;
                                if (
                                  ca.linked_plot_beat_id &&
                                  beat.id &&
                                  ca.linked_plot_beat_id === beat.id
                                ) {
                                  return true;
                                }
                                if (Number(ca.beatNumber || ca.beat_number) === bNum) return true;
                                const m = String(ca.internal_notes || '').match(/Beat\s*(\d+)/i);
                                if (m && Number(m[1]) === bNum) return true;
                                return false;
                              });
                              const beatClues =
                                matchedBeatClues.length > 0
                                  ? matchedBeatClues
                                  : realMurderClues.filter(c => {
                                      const r = c.round_number || 1;
                                      if (bNum <= 2) return r === 1;
                                      if (bNum <= 4) return r === 2;
                                      return r === 3;
                                    });

                              const hydratedBeatTitle = hydrateTextWithCharacters(
                                beat.event_title || beat.title || '',
                                characters,
                                'print'
                              );
                              const hydratedBeatDesc = hydrateTextWithCharacters(
                                beat.description || '',
                                characters,
                                'print'
                              );

                              return (
                                <div
                                  key={beat.id || idx}
                                  className={`rounded-2xl border transition-all overflow-hidden ${
                                    isBeatExpanded
                                      ? 'bg-slate-950/75 border-brand-pink/40 shadow-lg'
                                      : 'bg-white/[0.02] border-white/10 hover:border-white/25 hover:bg-white/[0.04]'
                                  }`}
                                >
                                  {/* Clickable Beat Header */}
                                  <button
                                    type="button"
                                    onClick={() => toggleRevealBeat(bNum)}
                                    className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left cursor-pointer"
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      <span
                                        className={`w-7 h-7 rounded-full text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                                          isBeatExpanded
                                            ? 'bg-brand-pink text-white'
                                            : 'bg-white/10 text-white'
                                        }`}
                                      >
                                        {bNum}
                                      </span>
                                      <div className="min-w-0">
                                        <h4 className="text-sm sm:text-base font-bold text-white truncate">
                                          {hydratedBeatTitle}
                                        </h4>
                                        {!isBeatExpanded && (
                                          <p className="text-xs text-slate-400 truncate mt-0.5">
                                            {hydratedBeatDesc}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      <span
                                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
                                          isBeatExpanded
                                            ? 'bg-brand-pink/15 border-brand-pink/40 text-brand-pink'
                                            : 'bg-white/5 border-white/10 text-slate-300'
                                        }`}
                                      >
                                        {beatClues.length}{' '}
                                        {beatClues.length === 1 ? 'Clue' : 'Clues'}
                                      </span>
                                      <svg
                                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                          isBeatExpanded ? 'rotate-180 text-brand-pink' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="2.5"
                                          d="M19 9l-7 7-7-7"
                                        />
                                      </svg>
                                    </div>
                                  </button>

                                  {/* Expanded Beat Explanation + Actual Clues That Point to This Beat */}
                                  {isBeatExpanded && (
                                    <div className="px-4 sm:px-6 pb-5 pt-1 border-t border-white/10 space-y-4 animate-in fade-in duration-150">
                                      <div className="p-3.5 sm:p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-1">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-brand-pink block">
                                          What Happened
                                        </span>
                                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                          {hydratedBeatDesc}
                                        </p>
                                      </div>

                                      {beatClues.length > 0 && (
                                        <div className="space-y-2.5">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                              Clues That Pointed to This ({beatClues.length})
                                            </span>
                                            <span className="text-[11px] text-slate-500">
                                              Tap any clue card to zoom in
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                                            {beatClues.map(bc => {
                                              const rawTitle = hydrateTextWithCharacters(
                                                stripCustomerFacingTitle(bc.title) || bc.title,
                                                characters,
                                                'print'
                                              ).trim();
                                              const cTitle =
                                                rawTitle.length <= 4
                                                  ? `Recovered Text Thread (${rawTitle})`
                                                  : rawTitle;
                                              const rawProofNote = String(
                                                (bc as any).internal_notes || ''
                                              )
                                                .replace(/^\[CODE:[^\]]+\]\s*/i, '')
                                                .replace(/^(REAL|FAKE)\s*\/\s*(CANON|RED\s*HERRING)\s*/i, '')
                                                .replace(/^\(?Beat\s*\d+[^)]*\)?\s*[-:–—]?\s*/i, '')
                                                .replace(/^\[?Beat\s*\d+[^\]]*\]?\s*[-:–—]?\s*/i, '')
                                                .replace(/^[-:–—]\s*/, '')
                                                .trim();
                                              const hydratedProofNote = rawProofNote
                                                ? hydrateTextWithCharacters(
                                                    rawProofNote,
                                                    characters,
                                                    'print'
                                                  )
                                                : '';

                                              return (
                                                <div
                                                  key={bc.id}
                                                  onClick={() => {
                                                    setSelectedClueRoundFilter('all');
                                                    const allIdx = clues.findIndex(
                                                      c => c.id === bc.id
                                                    );
                                                    if (allIdx >= 0) {
                                                      setSelectedClueModalIndex(allIdx);
                                                    }
                                                  }}
                                                  className="rounded-2xl bg-slate-900/90 border border-white/10 hover:border-brand-pink/40 p-3.5 space-y-3 transition-all cursor-pointer"
                                                >
                                                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                      <span className="px-2 py-0.5 rounded-md bg-brand-pink/15 text-brand-pink border border-brand-pink/30 text-[10px] font-bold uppercase shrink-0">
                                                        Round {bc.round_number || 1}
                                                      </span>
                                                      <span className="text-xs font-bold text-white truncate">
                                                        {cTitle}
                                                      </span>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-slate-400 shrink-0">
                                                      Inspect ↗
                                                    </span>
                                                  </div>

                                                  {/* Rendered Clue Card (SMS chat, CCTV photo, receipt, audio memo, etc.) */}
                                                  <div className="pointer-events-none">
                                                    {renderClueFormatView(bc, true)}
                                                  </div>

                                                  {hydratedProofNote && (
                                                    <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-300 leading-snug">
                                                      <strong className="text-white">
                                                        How this pointed to Step {bNum}:
                                                      </strong>{' '}
                                                      {hydratedProofNote}
                                                    </div>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-6 space-y-2">
                  <div className="text-3xl">📵</div>
                  <h3 className="text-base font-black uppercase tracking-tight text-white">
                    Phones Down for the Grand Reveal!
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Your host is revealing the killer live to the room!
                  </p>
                </div>
              )}
                </section>

                {/* NEXT PAGE CTA BANNER AT BOTTOM OF PAGE 1 */}
                <div className="rounded-3xl bg-gradient-to-r from-brand-pink/20 via-slate-900 to-amber-500/15 border border-brand-pink/35 p-5 sm:p-7 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 border border-brand-pink/40 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                        Page 2 of 2 • Party Receipts
                      </span>
                      <span className="text-xs font-semibold text-amber-300">
                        {reviewSubmitted ? '✓ Unlocked' : '🔒 Leave a 5-Star Review to Unlock'}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                      Who Voted For Who &amp; Why? See Tonight&apos;s Party Voting Stats
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                      Unlock the Suspect Vote Distribution, Party Superlatives (Master Detective &amp; Most Suspected), and every player&apos;s round-by-round accusations and theories.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setRevealSubPage('stats');
                      if (typeof document !== 'undefined') {
                        document
                          .getElementById('finale-reveal-top')
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    className="w-full sm:w-auto shrink-0 px-6 py-3.5 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl transition-all cursor-pointer"
                  >
                    {reviewSubmitted
                      ? 'View Party Voting Stats →'
                      : '⭐ Leave Review & Unlock Stats →'}
                  </button>
                </div>
              </div>
            ) : !reviewSubmitted ? (
              /* PAGE 2 (LOCKED): 5-STAR REVIEW GATE WALL (WITH OPTIONAL COMMENT & PARTY PHOTO) */
              <section className="bg-slate-900/85 border border-brand-pink/35 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-7">
                {/* Locked Stats Teaser Preview */}
                <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 sm:p-5 space-y-4 relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                        🔒 Locked Party Metrics
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {submissions.length > 0
                          ? `${submissions.length} Player Votes & Written Theories Ready`
                          : 'All Round Votes, Superlatives & Player Theories'}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Unlocks instantly below ↓
                    </span>
                  </div>

                  {/* Blurred Teaser Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 select-none">
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/15 to-slate-900 border border-amber-400/25 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                        🥇 Master Detective
                      </span>
                      <div className="text-sm font-black text-white/80 blur-[4px]">
                        Top Sleuth Winner
                      </div>
                      <p className="text-[11px] text-slate-400">🔒 Rate below to reveal</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-brand-pink/15 to-slate-900 border border-brand-pink/25 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink">
                        🎯 Most Suspected
                      </span>
                      <div className="text-sm font-black text-white/80 blur-[4px]">
                        Top Accused Suspect
                      </div>
                      <p className="text-[11px] text-slate-400">🔒 Rate below to reveal</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/15 to-slate-900 border border-purple-400/25 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
                        💬 Who Voted For Who &amp; Why
                      </span>
                      <div className="text-sm font-black text-white/80 blur-[4px]">
                        Round 1–{maxClueRound} Receipts
                      </div>
                      <p className="text-[11px] text-slate-400">🔒 Rate below to reveal</p>
                    </div>
                  </div>
                </div>

                {/* Review Gate Form */}
                <div className="max-w-xl mx-auto space-y-5">
                  <div className="text-center space-y-2">
                    <span className="px-3 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                      ⭐ Quick 5-Star Review Gate
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                      Rate Tonight&apos;s Mystery to Unlock the Party Stats
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Tap a star rating out of 5 below (with an optional comment or party photo) to unlock everyone&apos;s round-by-round votes, theories, and the final Detective Leaderboard.
                    </p>
                  </div>

                  <form
                    onSubmit={handleReviewSubmit}
                    className="rounded-2xl bg-slate-950/90 border border-white/10 p-5 sm:p-6 space-y-5 shadow-xl"
                  >
                    {/* 1. Star Rating Out of 5 (Required) */}
                    <div className="space-y-2 text-center">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-300">
                        1. Your Rating Out of 5 Stars <span className="text-brand-pink">*</span>
                      </label>
                      <div className="flex items-center justify-center gap-2 py-1">
                        {[1, 2, 3, 4, 5].map(star => {
                          const active = (reviewHoverRating || reviewRating) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onMouseEnter={() => setReviewHoverRating(star)}
                              onMouseLeave={() => setReviewHoverRating(0)}
                              onClick={() => setReviewRating(star)}
                              className={`w-12 h-12 rounded-2xl border text-2xl flex items-center justify-center transition-all cursor-pointer ${
                                active
                                  ? 'bg-amber-400/15 border-amber-400/60 text-amber-400 scale-105 shadow-lg shadow-amber-500/10'
                                  : 'bg-white/[0.03] border-white/10 text-slate-700 hover:text-slate-500'
                              }`}
                            >
                              ★
                            </button>
                          );
                        })}
                      </div>
                      <div className="text-xs font-bold text-amber-300">
                        {reviewRating === 5
                          ? '5 / 5 Stars — Loved It!'
                          : reviewRating === 4
                          ? '4 / 5 Stars — Great Night!'
                          : reviewRating === 3
                          ? '3 / 5 Stars — Fun Party'
                          : `${reviewRating} / 5 Stars`}
                      </div>
                    </div>

                    {/* 2. Player Name */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Your Name
                      </label>
                      <input
                        type="text"
                        value={reviewName}
                        onChange={e => setReviewName(e.target.value)}
                        placeholder={voterDisplayName || 'Your Name'}
                        className="w-full min-h-[44px] bg-slate-900 border border-white/15 focus:border-brand-pink rounded-xl px-3.5 py-2.5 text-sm font-bold text-white placeholder:text-slate-500 outline-none"
                      />
                    </div>

                    {/* Bonus Reward Callout for Adding a Comment or Party Photo */}
                    <div className="p-3.5 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                          Guest-to-Host Bonus Reward
                        </div>
                        <p className="text-xs text-slate-200 font-semibold">
                          Add a comment or party photo below to unlock <strong className="text-amber-300">15% OFF</strong> your next mystery night.
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider shrink-0">
                        {reviewComment.trim() || reviewPhotoDataUrl ? '✓ 15% Unlocked' : '+15% Off'}
                      </span>
                    </div>

                    {/* 3. Optional Comment + One-Tap Quick-Prompt Chips (Zero Emojis) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          2. Leave a Comment
                        </label>
                        <span className="text-[10px] font-semibold text-slate-500">
                          Optional • Tap a quick tag or write your own
                        </span>
                      </div>

                      {/* Emoji-Free Quick-Prompt Chips */}
                      <div className="flex flex-wrap gap-1.5">
                        {REVIEW_QUICK_PROMPTS.map(phrase => {
                          const isSelected = reviewComment
                            .toLowerCase()
                            .includes(phrase.toLowerCase());
                          return (
                            <button
                              key={phrase}
                              type="button"
                              onClick={() => handleToggleQuickPrompt(phrase)}
                              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10 hover:border-white/25'
                              }`}
                            >
                              {phrase}
                            </button>
                          );
                        })}
                      </div>

                      <textarea
                        rows={3}
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        placeholder="Favorite plot twist, funniest accusation, or best costume tonight? (Optional)"
                        className="w-full bg-slate-900 border border-white/15 focus:border-brand-pink rounded-xl p-3.5 text-sm text-white placeholder:text-slate-500 outline-none resize-none"
                      />
                    </div>

                    {/* 4. Optional Party Photo Upload */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          3. Add a Party Photo
                        </label>
                        <span className="text-[10px] font-semibold text-slate-500">Optional</span>
                      </div>

                      <input
                        ref={reviewPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleReviewPhotoChange}
                        className="hidden"
                      />

                      {reviewPhotoDataUrl ? (
                        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-emerald-500/40">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={reviewPhotoDataUrl}
                              alt="Party Photo Preview"
                              className="w-14 h-14 rounded-lg object-cover border border-white/15 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-emerald-300">
                                ✓ Party Photo Attached (+15% Off Bonus Unlocked)
                              </div>
                              <p className="text-[11px] text-slate-400 truncate">
                                Ready to include with your review &amp; Detective Scorecard
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setReviewPhotoDataUrl('');
                              if (reviewPhotoInputRef.current) {
                                reviewPhotoInputRef.current.value = '';
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-slate-300 shrink-0 cursor-pointer"
                          >
                            Remove ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => reviewPhotoInputRef.current?.click()}
                          disabled={isCompressingPhoto}
                          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800/90 border border-dashed border-white/20 hover:border-brand-pink/50 text-xs font-bold text-slate-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <span>📷</span>
                          <span>
                            {isCompressingPhoto
                              ? 'Processing photo...'
                              : 'Snap or Upload a Party Photo (Optional)'}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Submit & Unlock CTA */}
                    <button
                      type="submit"
                      disabled={isSubmittingReview || isCompressingPhoto}
                      className="w-full min-h-[50px] px-6 py-3.5 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-sm font-black uppercase tracking-wider transition-all shadow-xl cursor-pointer"
                    >
                      {isSubmittingReview
                        ? 'Unlocking Party Stats...'
                        : '⭐ Submit Review & Unlock Party Voting Stats →'}
                    </button>
                  </form>
                </div>
              </section>
            ) : (
              /* PAGE 2 (UNLOCKED): PARTY VOTING STATISTICS, DETECTIVE WRAPPED STORY CARD & 15% OFF REWARD */
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Top Action Bar: Unlocked Confirmation + Shareable Detective Wrapped Scorecard + 15% OFF Next-Host Reward */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left: Shareable "Detective Wrapped" Story Card Trigger */}
                  <div className="lg:col-span-7 p-5 rounded-3xl bg-gradient-to-br from-brand-pink/20 via-slate-900 to-slate-950 border border-brand-pink/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      {myDetectiveSummary.portraitUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={myDetectiveSummary.portraitUrl}
                          alt={myDetectiveSummary.playerName}
                          className="w-14 h-14 rounded-2xl object-cover object-top border border-white/20 shrink-0 shadow-md"
                        />
                      )}
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest">
                            {myDetectiveSummary.awardLabel}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {myDetectiveSummary.correctVotes}/{myDetectiveSummary.totalVotes} Rounds Right
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-white truncate">
                          {myDetectiveSummary.playerName}&apos;s Detective Wrapped
                        </h3>
                        <p className="text-xs text-slate-300">
                          Save or share your vertical Story Card to the group chat or Instagram.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsStoryCardModalOpen(true)}
                      className="w-full sm:w-auto shrink-0 px-4 py-3 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      📲 Share My Scorecard
                    </button>
                  </div>

                  {/* Right: 15% OFF Guest-to-Next-Host Reward Code (SLEUTH15) */}
                  <div className="lg:col-span-5 p-5 rounded-3xl bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 border border-amber-400/35 shadow-xl flex flex-col justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                          {reviewBonusEarned ? '✓ 15% Off Reward Unlocked' : 'Next-Host Reward'}
                        </span>
                        <Link
                          href={`/${locale}/mysteries`}
                          className="text-[11px] font-black text-amber-300 hover:underline"
                        >
                          Browse Mysteries ↗
                        </Link>
                      </div>
                      <h3 className="text-sm sm:text-base font-black text-white">
                        Want to Host Your Group&apos;s Next Mystery Night?
                      </h3>
                      <p className="text-xs text-slate-300">
                        Use code <strong className="text-amber-300 font-mono">SLEUTH15</strong> at checkout for 15% off any mystery pack.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-amber-400/30 font-mono text-sm font-black tracking-widest text-amber-300 text-center">
                        SLEUTH15
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyRewardPromoCode}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                          copiedPromoCode
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                        }`}
                      >
                        {copiedPromoCode ? '✓ Copied!' : 'Copy Code'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* FULL-SCREEN DETECTIVE WRAPPED STORY CARD MODAL (9:16 VERTICAL PREVIEW + 1080x1920 PNG DOWNLOAD) */}
                {isStoryCardModalOpen && (
                  <div
                    className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setIsStoryCardModalOpen(false)}
                  >
                    <div
                      className="relative w-full max-w-md rounded-3xl bg-slate-950 border border-white/15 p-5 sm:p-6 space-y-4 shadow-2xl max-h-[94vh] overflow-y-auto"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                            9:16 Story &amp; Group-Chat Card
                          </span>
                          <h3 className="text-base font-black text-white">
                            Your Detective Scorecard
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsStoryCardModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black flex items-center justify-center cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Optional Toggle Between Character Portrait & Uploaded Party Photo */}
                      {myDetectiveSummary.partyPhotoUrl && myDetectiveSummary.portraitUrl && (
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/10">
                          <button
                            type="button"
                            onClick={() => setStoryCardUsePartyPhoto(false)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              !storyCardUsePartyPhoto
                                ? 'bg-brand-pink text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Character Portrait
                          </button>
                          <button
                            type="button"
                            onClick={() => setStoryCardUsePartyPhoto(true)}
                            className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              storyCardUsePartyPhoto
                                ? 'bg-brand-pink text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Our Party Photo
                          </button>
                        </div>
                      )}

                      {/* Live 9:16 Story Card Visual Preview */}
                      <div className="mx-auto w-full max-w-[330px] rounded-[28px] bg-gradient-to-b from-[#070b14] via-[#0f172a] to-[#090d16] border border-white/15 p-5 text-center space-y-4 shadow-2xl relative overflow-hidden">
                        <div className="space-y-1">
                          <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-pink">
                            Back Pocket Mysteries • Case Closed
                          </div>
                          <div className="text-lg font-black text-white uppercase tracking-tight">
                            {mystery.title}
                          </div>
                        </div>

                        {/* Hero Portrait / Party Photo */}
                        <div className="relative mx-auto w-44 h-48 rounded-2xl overflow-hidden bg-slate-900 border border-white/20 shadow-xl">
                          {storyCardUsePartyPhoto && myDetectiveSummary.partyPhotoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={myDetectiveSummary.partyPhotoUrl}
                              alt="Party Photo"
                              className="w-full h-full object-cover"
                            />
                          ) : myDetectiveSummary.portraitUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={myDetectiveSummary.portraitUrl}
                              alt={myDetectiveSummary.playerName}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl text-slate-600">
                              🕵️
                            </div>
                          )}
                        </div>

                        {/* Earned Award Pill */}
                        <div className="-mt-6 relative z-10">
                          <span className="inline-block px-3.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest shadow-lg">
                            {myDetectiveSummary.awardLabel}
                          </span>
                        </div>

                        {/* Player Name & Role */}
                        <div className="space-y-0.5">
                          <div className="text-lg font-black text-white">
                            {myDetectiveSummary.playerName}
                          </div>
                          <div className="text-xs font-bold text-slate-300">
                            Played {myDetectiveSummary.roleLabel}
                          </div>
                        </div>

                        {/* 3-Stat Boxes */}
                        <div className="space-y-2 text-left">
                          <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Rounds Correct
                              </div>
                              <div className="text-sm font-black text-white">
                                {myDetectiveSummary.correctVotes} / {myDetectiveSummary.totalVotes}
                              </div>
                            </div>
                            <span className="text-xs font-black text-brand-pink">
                              {myDetectiveSummary.accuracyPercent}% Accuracy
                            </span>
                          </div>

                          <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Detective Score
                              </div>
                              <div className="text-sm font-black text-white">
                                {myDetectiveSummary.accuracyScore} PTS
                              </div>
                            </div>
                            <span className="text-xs font-black text-amber-300">
                              Rank #{myDetectiveSummary.rankNum} at Table
                            </span>
                          </div>

                          <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-between">
                            <div>
                              <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                The True Killer
                              </div>
                              <div className="text-sm font-black text-white">
                                {myDetectiveSummary.killerName}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-300">
                              Case Solved
                            </span>
                          </div>
                        </div>

                        <div className="pt-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          backpocketmysteries.com
                        </div>
                      </div>

                      {/* Download / Native Share CTA */}
                      <button
                        type="button"
                        onClick={handleExportDetectiveStoryCard}
                        disabled={isExportingStoryCard}
                        className="w-full py-3.5 px-5 rounded-2xl bg-brand-pink hover:opacity-95 text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-xl transition-all cursor-pointer"
                      >
                        {isExportingStoryCard
                          ? 'Generating 1080×1920 Story Image...'
                          : '📲 Save / Share Story Image (PNG)'}
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. ALL-PLAYERS VOTING STATISTICS, SUSPECT ACCUSATION BREAKDOWN & WHO VOTED FOR WHO */}
                <section className="bg-slate-900/75 border border-white/10 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-brand-pink">
                        Party Voting Statistics &amp; Receipts
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-0.5">
                        How Everyone Voted &amp; Who Accused Who
                      </h2>
                    </div>
                    <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Total Votes Cast
                      </div>
                      <div className="text-sm sm:text-base font-black text-white">
                        {submissions.length} {submissions.length === 1 ? 'Accusation' : 'Accusations'}
                      </div>
                    </div>
                  </div>

                  {detectiveLeaderboard.length === 0 && submissions.length === 0 ? (
                    <p className="text-xs text-slate-400 font-medium py-4">
                      No round votes were recorded during this session yet.
                    </p>
                  ) : (
                    <>
                      {/* Party Awards & Superlatives */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                        {detectiveLeaderboard[0] && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-950 border border-amber-400/35 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                              🥇 Master Detective
                            </span>
                            <h3 className="text-base font-black text-white">
                              {detectiveLeaderboard[0].voterName}
                            </h3>
                            <p className="text-xs text-slate-300">
                              {detectiveLeaderboard[0].correctVotes}/
                              {detectiveLeaderboard[0].totalVotes} rounds right (
                              {detectiveLeaderboard[0].accuracyPercent}% accuracy •{' '}
                              {detectiveLeaderboard[0].accuracyScore} pts)
                            </p>
                          </div>
                        )}

                        {mostSuspectedList[0] && (
                          <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-pink/20 to-slate-950 border border-brand-pink/35 space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                              🎯 Most Suspected
                            </span>
                            <h3 className="text-base font-black text-white">
                              {mostSuspectedList[0].suspectName}
                            </h3>
                            <p className="text-xs text-slate-300">
                              Accused {mostSuspectedList[0].count}{' '}
                              {mostSuspectedList[0].count === 1 ? 'time' : 'times'} across the night
                            </p>
                          </div>
                        )}

                        {(() => {
                          const wildest = [...detectiveLeaderboard].sort(
                            (a, b) => b.uniqueSuspectsCount - a.uniqueSuspectsCount
                          )[0];
                          if (!wildest) return null;
                          return (
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-slate-950 border border-purple-400/35 space-y-1">
                              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300">
                                🌀 Wildest Sleuth
                              </span>
                              <h3 className="text-base font-black text-white">
                                {wildest.voterName}
                              </h3>
                              <p className="text-xs text-slate-300">
                                Pointed the finger at {wildest.uniqueSuspectsCount} different suspects
                              </p>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Chart A: Suspect Accusation Distribution (Who got voted for & by whom) */}
                      {mostSuspectedList.length > 0 && (
                        <div className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 sm:p-5 space-y-4">
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-white">
                              Suspect Vote Breakdown (Who Got Accused the Most)
                            </h3>
                            <p className="text-xs text-slate-400">
                              Percentage of total accusations cast against each suspect across all rounds
                            </p>
                          </div>

                          <div className="space-y-3.5">
                            {mostSuspectedList.map((item, sIdx) => {
                              const resolvedSuspectId =
                                (item as any).suspectCharId || item.suspectId || `${item.suspectName}-${sIdx}`;
                              const totalCastVotes = Math.max(
                                1,
                                mostSuspectedList.reduce((acc, s) => acc + s.count, 0)
                              );
                              const pct = Math.round((item.count / totalCastVotes) * 100);
                              const isTrueKiller =
                                solutionData?.killer?.id &&
                                resolvedSuspectId === solutionData.killer.id;
                              const votersForSuspect = submissions.filter(
                                s => s.suspectCharId === resolvedSuspectId
                              );

                              return (
                                <div
                                  key={resolvedSuspectId}
                                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2"
                                >
                                  <div className="flex items-center justify-between text-xs sm:text-sm">
                                    <span className="font-black text-white flex items-center gap-2 flex-wrap">
                                      <span>{item.suspectName}</span>
                                      {isTrueKiller && (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase">
                                          🔪 True Killer
                                        </span>
                                      )}
                                    </span>
                                    <span className="text-slate-200 font-black">
                                      {item.count} {item.count === 1 ? 'vote' : 'votes'} ({pct}%)
                                    </span>
                                  </div>
                                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${
                                        isTrueKiller ? 'bg-emerald-500' : 'bg-brand-pink'
                                      }`}
                                      style={{ width: `${Math.max(6, pct)}%` }}
                                    />
                                  </div>
                                  {votersForSuspect.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                        Accused by:
                                      </span>
                                      {votersForSuspect.map(v => (
                                        <span
                                          key={v.id}
                                          className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] text-slate-300 font-semibold"
                                        >
                                          {v.voterName} (R{v.round})
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Round-by-Round: Who Voted For Who & Why */}
                      {submissions.length > 0 && (
                        <div className="space-y-4 pt-2">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-pink">
                              Round-by-Round Theories
                            </span>
                            <h3 className="text-base sm:text-lg font-bold text-white mt-0.5">
                              Who Everyone Voted For &amp; Why
                            </h3>
                            <p className="text-xs text-slate-400">
                              Every guest&apos;s exact accusation and written theory from Round 1 through the Final Guess
                            </p>
                          </div>

                          <div className="space-y-4">
                            {availableClueRounds.map(roundNum => {
                              const roundSubs = submissions.filter(s => s.round === roundNum);
                              if (roundSubs.length === 0) return null;
                              const isFinalRound = roundNum === maxClueRound;
                              const correctInRound = roundSubs.filter(
                                s =>
                                  Boolean(solutionData?.killer?.id) &&
                                  s.suspectCharId === solutionData?.killer?.id
                              ).length;

                              return (
                                <div
                                  key={roundNum}
                                  className="rounded-2xl bg-slate-950/80 border border-white/10 p-4 sm:p-5 space-y-3.5"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="px-3 py-1 rounded-full bg-brand-pink/15 border border-brand-pink/30 text-brand-pink text-[11px] font-black uppercase tracking-widest">
                                      {isFinalRound
                                        ? `Round ${roundNum} • Final Accusations (${roundSubs.length})`
                                        : `Round ${roundNum} Votes & Theories (${roundSubs.length})`}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-400">
                                      {correctInRound} of {roundSubs.length} clocked the killer in Round {roundNum}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {roundSubs.map(sub => {
                                      const guessedKiller =
                                        Boolean(solutionData?.killer?.id) &&
                                        sub.suspectCharId === solutionData?.killer?.id;
                                      return (
                                        <div
                                          key={sub.id}
                                          className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                                            guessedKiller
                                              ? 'bg-emerald-950/30 border-emerald-500/40'
                                              : 'bg-white/[0.03] border-white/10'
                                          }`}
                                        >
                                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                                            <span className="font-black text-white text-xs sm:text-sm">
                                              {sub.voterName}
                                            </span>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-brand-pink">
                                                voted {sub.suspectName}
                                              </span>
                                              {guessedKiller ? (
                                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-black uppercase">
                                                  ✓ Correct
                                                </span>
                                              ) : (
                                                <span className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 text-[9px] font-bold uppercase">
                                                  ✗ Fooled
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="p-2.5 rounded-lg bg-slate-950/70 border border-white/5 text-slate-200 italic leading-relaxed">
                                            &ldquo;{sub.reason}&rdquo;
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Full Player Detective Leaderboard */}
                      <div className="space-y-2.5 pt-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">
                          Final Detective Leaderboard
                        </h3>
                        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-slate-950/80 overflow-hidden">
                          {detectiveLeaderboard.map((row, idx) => (
                            <div
                              key={row.voterCharId}
                              className="px-4 py-3 flex items-center justify-between gap-3 text-xs sm:text-sm"
                            >
                              <div className="flex items-center gap-3 flex-wrap">
                                <span
                                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                                    idx === 0
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-white/10 text-white'
                                  }`}
                                >
                                  {idx + 1}
                                </span>
                                <span className="font-black text-white">{row.voterName}</span>
                                {row.earliestCorrectRound && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-bold text-emerald-300">
                                    Clocked killer in R{row.earliestCorrectRound}
                                  </span>
                                )}
                                {(row.clueTagBonusPoints || 0) > 0 && (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-bold">
                                    +{row.clueTagBonusPoints} clue pts
                                  </span>
                                )}
                              </div>
                              <div className="shrink-0">
                                <span className="font-black text-brand-pink">
                                  {row.accuracyScore} pts
                                </span>
                                <span className="text-slate-400 ml-1.5 text-xs">
                                  ({row.correctVotes}/{row.totalVotes} right)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </section>

                {/*Tonight's Submitted Reviews & Party Photos */}
                {reviews.length > 0 && (
                  <section className="bg-slate-900/60 border border-white/10 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">
                      ⭐ Tonight&apos;s Guest Reviews ({reviews.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {reviews.map((rev: any) => (
                        <div
                          key={rev.id}
                          className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-white">
                              {rev.playerName}
                            </span>
                            <span className="text-xs font-black text-amber-400">
                              {'★'.repeat(Math.max(1, Math.min(5, rev.rating || 5)))}
                            </span>
                          </div>
                          {rev.comment && (
                            <p className="text-xs text-slate-300 leading-relaxed">
                              &ldquo;{rev.comment}&rdquo;
                            </p>
                          )}
                          {rev.photoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={rev.photoUrl}
                              alt={`Party photo by ${rev.playerName}`}
                              className="w-full max-h-48 object-cover rounded-xl border border-white/10 mt-1"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FULL-SCREEN CLUE INSPECTION MODAL (WITH SWIPE PREV/NEXT) */}
      {selectedClueModalIndex !== null && unlockedCluesForSelectedRound[selectedClueModalIndex] && (() => {
        const modalClue = unlockedCluesForSelectedRound[selectedClueModalIndex];
        const resolvedFormat: ClueFormat =
          (modalClue.format as ClueFormat) || inferClueFormat(modalClue);
        const formatOption = CLUE_FORMAT_OPTIONS.find(o => o.value === resolvedFormat);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setSelectedClueModalIndex(null)} />

            <div
              onTouchStart={onTouchStartCard}
              onTouchEnd={e => {
                if (touchStartX === null) return;
                const dx = e.changedTouches[0].clientX - touchStartX;
                if (dx > 45) {
                  setSelectedClueModalIndex(prev =>
                    prev === null
                      ? null
                      : prev <= 0
                      ? unlockedCluesForSelectedRound.length - 1
                      : prev - 1
                  );
                } else if (dx < -45) {
                  setSelectedClueModalIndex(prev =>
                    prev === null
                      ? null
                      : prev >= unlockedCluesForSelectedRound.length - 1
                      ? 0
                      : prev + 1
                  );
                }
                setTouchStartX(null);
              }}
              className="relative bg-[#0d131f] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-white/10 bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-brand-pink/15 text-brand-pink border border-brand-pink/30 shrink-0">
                    Round {modalClue.round_number || 1} ({selectedClueModalIndex + 1}/
                    {unlockedCluesForSelectedRound.length})
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 shrink-0">
                    {formatOption?.label || '🔍 Physical Prop'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (clueTagFilter !== 'all') setStickyClueId(modalClue.id);
                      setClueTags(prev => ({
                        ...prev,
                        [modalClue.id]: prev[modalClue.id] === 'key' ? undefined : 'key',
                      }));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      clueTags[modalClue.id] === 'key'
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    🔑 Key
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (clueTagFilter !== 'all') setStickyClueId(modalClue.id);
                      setClueTags(prev => ({
                        ...prev,
                        [modalClue.id]:
                          prev[modalClue.id] === 'red_herring' ? undefined : 'red_herring',
                      }));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      clueTags[modalClue.id] === 'red_herring'
                        ? 'bg-rose-500 text-white font-black'
                        : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    🐟 Decoy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (clueTagFilter !== 'all') setStickyClueId(modalClue.id);
                      setClueTags(prev => ({
                        ...prev,
                        [modalClue.id]: prev[modalClue.id] === 'alibi' ? undefined : 'alibi',
                      }));
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                      clueTags[modalClue.id] === 'alibi'
                        ? 'bg-sky-400 text-slate-950 font-black'
                        : 'bg-white/5 text-slate-300 hover:text-white'
                    }`}
                  >
                    🛡️ Alibi
                  </button>
                  <button
                    onClick={() => {
                      setStickyClueId(null);
                      setSelectedClueModalIndex(null);
                    }}
                    className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-grow space-y-2.5">
                {renderClueFormatView(modalClue, false)}
                <input
                  type="text"
                  value={clueNotes[modalClue.id] || ''}
                  onChange={e =>
                    setClueNotes(prev => ({
                      ...prev,
                      [modalClue.id]: e.target.value,
                    }))
                  }
                  placeholder="✍️ Your detective note on this clue (e.g. 'Matches Shelf B lights at 7:52 PM')..."
                  className="w-full min-h-[38px] bg-slate-950/90 border border-white/15 focus:border-brand-pink rounded-xl px-3 py-1.5 text-base sm:text-xs text-slate-200 placeholder:text-slate-500 outline-none"
                />
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mr-0.5">
                    ⚡ 1-Tap Note:
                  </span>
                  {[
                    '⏱️ Timeline Gap',
                    '💔 Affair Motive',
                    '💰 Money / Blackmail',
                    '🔪 Murder Weapon',
                    '🤥 Fake Alibi',
                  ].map(chip => {
                    const currentNote = clueNotes[modalClue.id] || '';
                    const hasChip = currentNote.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleQuickNoteChip(modalClue.id, chip)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                          hasChip
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                            : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 mr-0.5">
                    📌 Pin Suspect:
                  </span>
                  {activeCharacters
                    .filter(ch => !ch.is_victim)
                    .map(ch => {
                      const { name: sName } = parseCharacter(ch);
                      const isPinned = (clueSuspects[modalClue.id] || []).includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => toggleClueSuspect(modalClue.id, ch.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            isPinned
                              ? 'bg-brand-pink text-white shadow'
                              : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                          }`}
                        >
                          {isPinned ? '📌 ' : ''}
                          {sName}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() => {
                    setStickyClueId(null);
                    setSelectedClueModalIndex(prev =>
                      prev === null
                        ? null
                        : prev <= 0
                        ? unlockedCluesForSelectedRound.length - 1
                        : prev - 1
                    );
                  }}
                  className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white cursor-pointer"
                >
                  ← Prev Clue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStickyClueId(null);
                    setSelectedClueModalIndex(prev =>
                      prev === null
                        ? null
                        : prev >= unlockedCluesForSelectedRound.length - 1
                        ? 0
                        : prev + 1
                    );
                  }}
                  className="text-xs font-black uppercase tracking-widest text-brand-pink hover:opacity-90 cursor-pointer"
                >
                  Next Clue →
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* THUMB-FRIENDLY MOBILE BOTTOM NAVIGATION BAR (< 640px) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-slate-950/95 border-t border-white/10 backdrop-blur-lg px-2 py-1.5 flex items-center justify-around">
        {!isClueOnlySleuth ? (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'text-brand-pink bg-brand-pink/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-sm leading-none">👤</span>
              <span className="text-[9px] font-black uppercase tracking-wider">Role</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('relations')}
              className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
                activeTab === 'relations'
                  ? 'text-brand-pink bg-brand-pink/15'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="text-sm leading-none">🕸️</span>
              <span className="text-[9px] font-black uppercase tracking-wider">
                Links ({charConnections.length})
              </span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'text-sky-300 bg-sky-400/15'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-sm leading-none">🕵️</span>
            <span className="text-[9px] font-black uppercase tracking-wider">Briefing</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsRoomCastOpen(true)}
          className="flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all text-slate-400 hover:text-slate-200 cursor-pointer"
        >
          <span className="text-sm leading-none">👥</span>
          <span className="text-[9px] font-black uppercase tracking-wider">
            Cast ({activeCharacters.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clues')}
          className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all relative cursor-pointer ${
            activeTab === 'clues'
              ? 'text-brand-pink bg-brand-pink/15'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-sm leading-none">{isGuessStep ? '🗳️' : '🔍'}</span>
          <span className="text-[9px] font-black uppercase tracking-wider">
            {isGuessStep
              ? `Guess ${unlockedClueRound}`
              : unlockedClueRound >= 1 && unlockedClueRound <= maxClueRound
              ? `Clues R${unlockedClueRound}`
              : 'Clues'}
          </span>
          {(totalUnreadUnlockedClues > 0 || isGuessStep) && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-brand-pink animate-ping" />
          )}
        </button>

        {unlockedClueRound >= maxClueRound && (
          <button
            type="button"
            onClick={() => setActiveTab('reveal')}
            className={`flex-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${
              activeTab === 'reveal'
                ? 'text-emerald-400 bg-emerald-500/15'
                : 'text-emerald-400/75 hover:text-emerald-300'
            }`}
          >
            <span className="text-sm leading-none">🏆</span>
            <span className="text-[9px] font-black uppercase tracking-wider">Reveal</span>
          </button>
        )}
      </nav>

      <footer className="py-4 px-4 border-t border-white/5 flex flex-wrap items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-950/20">
        <span>Back Pocket Games Studio Playroom • PIN: {pin.slice(0, 3)} {pin.slice(3)}</span>
        {initialIsHost && (
          <button
            type="button"
            onClick={handleToggleHostMode}
            className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
              isHostMode
                ? 'border-brand-pink/40 text-brand-pink bg-brand-pink/10'
                : 'border-white/10 text-slate-500 hover:text-slate-300'
            }`}
          >
            🎛️ Host Controls: {isHostMode ? 'ON' : 'OFF'}
          </button>
        )}
      </footer>
    </div>
  );
}

