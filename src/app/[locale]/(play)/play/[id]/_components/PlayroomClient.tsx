'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { parseMysteryImageField } from '@/utils/moodboard';
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
  submitRoundTheoryAction,
  updateHostGameControlAction,
  submitGuestMysteryReviewAction,
  RoundSubmission,
} from '@/app/actions/customer-mystery';

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
}: PlayroomClientProps) {
  // Filter to active characters for tonight's session
  const activeCharacters = useMemo(() => {
    const filtered = characters.filter(c => c.profile_data?.is_active_in_session !== false);
    return filtered.length > 0 ? filtered : characters;
  }, [characters]);

  // Host-only mode (hides Console & Next buttons from regular guest phones)
  const [isHostMode, setIsHostMode] = useState<boolean>(() =>
    Boolean(initialIsHost || initialSession?.isHost)
  );

  // Persistent browser player token for character claiming
  const [playerToken, setPlayerToken] = useState<string>('');
  const [claimedCharacters, setClaimedCharacters] = useState<
    Record<string, { token: string; claimedAt: string }>
  >(initialSession?.claimedCharacters || {});
  const [claimError, setClaimError] = useState<string | null>(null);
  const [isClaimingCharId, setIsClaimingCharId] = useState<string | null>(null);

  // Selected character (or 'sleuth-guest' if joining via PIN for clues/voting only)
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

  // Initialize playerToken, saved character, host mode, and viewed clues from localStorage
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
    } catch {
      // Ignore
    }

    const savedCharKey = `bpm_selected_char_${mystery.id}`;
    if (forceSelect) {
      setSelectedCharId(null);
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
  }, [mystery.id, initialCharId, initialIsHost, characters, initialSession, forceSelect]);

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

  // Host Console Modal & Guardrail Confirmation State
  const [isHostPanelOpen, setIsHostPanelOpen] = useState<boolean>(false);
  const [pendingNextConfirm, setPendingNextConfirm] = useState<boolean>(false);
  const [hostShowWhoSaidWho, setHostShowWhoSaidWho] = useState<boolean>(false);
  const [isRefreshingSession, setIsRefreshingSession] = useState<boolean>(false);

  // Kahoot-style Round Unlock Alert Toast for Guests
  const prevRoundRef = useRef<number>(currentRound);
  const [roundUnlockToast, setRoundUnlockToast] = useState<number | null>(null);

  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'relations' | 'clues' | 'reveal'>(
    currentRound >= 5 ? 'reveal' : currentRound >= 1 ? 'clues' : 'profile'
  );

  // Swipeable Clue Carousel State
  const [selectedClueRoundFilter, setSelectedClueRoundFilter] = useState<number>(
    Math.max(1, Math.min(4, Math.floor(currentRound || 1)))
  );
  const [clueSlideIndex, setClueSlideIndex] = useState<number>(0);
  const [selectedClueModalIndex, setSelectedClueModalIndex] = useState<number | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Between-Round Theory ("Who & Why") Form State
  const [accusedCharId, setAccusedCharId] = useState<string>('');
  const [accusationReason, setAccusationReason] = useState<string>('');
  const [isSubmittingTheory, setIsSubmittingTheory] = useState<boolean>(false);
  const [theorySavedNotice, setTheorySavedNotice] = useState<boolean>(false);

  // 5-Star Guest Review Form State
  const [reviews, setReviews] = useState<any[]>(initialSession?.reviews || []);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewName, setReviewName] = useState<string>('');
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitted, setReviewSubmitted] = useState<boolean>(false);
  const [copiedGuestLink, setCopiedGuestLink] = useState<boolean>(false);

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
            title: `Join ${mystery.title}`,
            text: `Tap to join our Murder Mystery party! (PIN: ${pin.slice(0, 3)} ${pin.slice(3)} - No login needed)`,
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

  // Select a character from the Character Selection screen
  const handleSelectCharacterInLobby = async (charId: string) => {
    setClaimError(null);
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

    setSelectedCharId(charId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`bpm_selected_char_${mystery.id}`, charId);
    }
    if (currentRound >= 5) {
      setActiveTab('reveal');
    } else if (currentRound >= 1) {
      setActiveTab('clues');
    } else {
      setActiveTab('profile');
    }

    try {
      const res = await claimCharacterInLobbyAction(mystery.id, charId, activeToken);
      if (res.claimedCharacters) {
        setClaimedCharacters(res.claimedCharacters);
      }
    } finally {
      setIsClaimingCharId(null);
    }
  };

  // Release character lock when switching character
  const handleSwitchCharacter = async () => {
    setSelectedCharId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(`bpm_selected_char_${mystery.id}`);
    }
    if (playerToken) {
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
  // 4 = 8. Round 4 Clues, 4.5 = 9. Guess 4
  // 5 = 10. Reveal
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

      if (nextUnlockedRound >= 1 && nextUnlockedRound <= 4) {
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
    if (nextUnlockedRound >= 1 && nextUnlockedRound <= 4) {
      setSelectedClueRoundFilter(nextUnlockedRound);
      if (!nextIsGuess && nextUnlockedRound !== prevUnlockedRound) {
        setClueSlideIndex(0);
      }
    }
    if (currentRound >= 5) {
      setActiveTab('reveal');
    }
  }, [currentRound]);

  // Pre-fill existing submission for the active round when switching rounds
  const activeVotingRound = Math.max(1, Math.min(4, unlockedClueRound || 1));
  const voterId = selectedChar?.id || (isClueOnlySleuth ? `sleuth-${customSleuthName || 'guest'}` : '');
  const voterDisplayName = selectedChar
    ? parseCharacter(selectedChar).name
    : customSleuthName || 'Party Sleuth';

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
    } else if (customSleuthName && !reviewName) {
      setReviewName(customSleuthName);
    }
  }, [selectedChar, customSleuthName, parseCharacter, reviewName]);

  // Clues for the selected round filter
  const unlockedCluesForSelectedRound = useMemo(() => {
    if (unlockedClueRound <= 0) return [];
    const roundClues = clues.filter(c => (c.round_number || 1) === selectedClueRoundFilter);
    return roundClues.length > 0
      ? roundClues
      : clues.filter(c => (c.round_number || 1) <= unlockedClueRound);
  }, [clues, unlockedClueRound, selectedClueRoundFilter]);

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
    const allUnlocked = clues.filter(c => (c.round_number || 1) <= Math.min(4, unlockedClueRound));
    return allUnlocked.filter(c => !viewedClueIds.includes(c.id)).length;
  }, [clues, unlockedClueRound, viewedClueIds]);

  const handlePrevClue = () => {
    if (unlockedCluesForSelectedRound.length <= 1) return;
    setClueSlideIndex(prev =>
      prev <= 0 ? unlockedCluesForSelectedRound.length - 1 : prev - 1
    );
  };

  const handleNextClue = () => {
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
      });
      if (res.submissions) {
        setSubmissions(res.submissions);
        setTheorySavedNotice(true);
        setTimeout(() => setTheorySavedNotice(false), 3500);
      }
    } finally {
      setIsSubmittingTheory(false);
    }
  };

  // Host Control Actions
  const handleHostSetRound = async (newRound: number) => {
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
        const floorRound = Math.floor(newRound);
        if (floorRound >= 1 && floorRound <= 4) {
          setSelectedClueRoundFilter(floorRound);
          if (Math.round((newRound % 1) * 10) !== 5) {
            setClueSlideIndex(0);
          }
          setActiveTab('clues');
        } else if (newRound >= 5) {
          setActiveTab('reveal');
        }
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

  // Submit 5-Star Guest Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReview(true);
    try {
      const roleLabel = selectedChar ? parseCharacter(selectedChar).archetype : 'Sleuth';
      const res = await submitGuestMysteryReviewAction({
        mysteryId: mystery.id,
        mysteryTitle: mystery.title,
        playerName: reviewName || voterDisplayName,
        characterRole: roleLabel,
        rating: reviewRating,
        comment: reviewComment,
      });
      if (res.reviews) {
        setReviews(res.reviews);
      }
      setReviewSubmitted(true);
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
    if (unlockedClueRound < 1 || unlockedClueRound > 4) return [];
    return suspectCharacters.filter(
      c => !currentRoundSubmissions.some(sub => sub.voterCharId === c.id)
    );
  }, [unlockedClueRound, suspectCharacters, currentRoundSubmissions]);

  // Helper to format current stage pill label
  const currentStageLabel = useMemo(() => {
    if (currentRound <= 0) return 'Lobby';
    if (currentRound >= 5) return 'Reveal';
    if (isGuessStep) return `Guess ${unlockedClueRound}`;
    return `Round ${unlockedClueRound}`;
  }, [currentRound, isGuessStep, unlockedClueRound]);

  // Advance the game to the next logical half-step with one click ("Next" button)
  const nextStepInfo = useMemo(() => {
    const votedCount = currentRoundSubmissions.length;
    const totalSuspects = suspectCharacters.length;
    const voteBadge = totalSuspects > 0 ? ` (${votedCount}/${totalSuspects})` : '';

    if (currentRound <= 0) {
      return { label: 'Next: Round 1 →', fullLabel: 'Start Round 1 Clues →', canAdvance: true };
    }
    if (currentRound === 1) {
      return {
        label: 'Next: Guess 1 →',
        fullLabel: 'Open Guess 1 Voting →',
        canAdvance: true,
      };
    }
    if (currentRound === 1.5) {
      return {
        label: `Next: Round 2${voteBadge} →`,
        fullLabel: `Unlock Round 2 Clues${voteBadge} →`,
        canAdvance: true,
      };
    }
    if (currentRound === 2) {
      return {
        label: 'Next: Guess 2 →',
        fullLabel: 'Open Guess 2 Voting →',
        canAdvance: true,
      };
    }
    if (currentRound === 2.5) {
      return {
        label: `Next: Round 3${voteBadge} →`,
        fullLabel: `Unlock Round 3 Clues${voteBadge} →`,
        canAdvance: true,
      };
    }
    if (currentRound === 3) {
      return {
        label: 'Next: Guess 3 →',
        fullLabel: 'Open Guess 3 Voting →',
        canAdvance: true,
      };
    }
    if (currentRound === 3.5) {
      return {
        label: `Next: Round 4${voteBadge} →`,
        fullLabel: `Unlock Round 4 Clues${voteBadge} →`,
        canAdvance: true,
      };
    }
    if (currentRound === 4) {
      return {
        label: 'Next: Guess 4 →',
        fullLabel: 'Open Final Guess 4 Voting →',
        canAdvance: true,
      };
    }
    if (currentRound === 4.5) {
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
  }, [currentRound, revealMode, currentRoundSubmissions.length, suspectCharacters.length]);

  const handleHostNextStep = async (force = false) => {
    if (isRefreshingSession) return;
    // Guardrail: when moving FROM a Guess step (1.5, 2.5, 3.5, 4.5) to the next Round/Reveal, warn if not everyone voted
    if (
      !force &&
      isGuessStep &&
      unlockedClueRound >= 1 &&
      unlockedClueRound <= 4 &&
      missingVotersForActiveRound.length > 0
    ) {
      setPendingNextConfirm(true);
      return;
    }
    setPendingNextConfirm(false);

    if (currentRound <= 0) {
      await handleHostSetRound(1);
    } else if (currentRound >= 1 && currentRound < 5) {
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
      activeVotingRound >= 4 ? 'Final Stats & Reveal' : `Round ${activeVotingRound + 1} Clues`;

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

  // Reusable Host Controls Modal Overlay ("Console" - Full Flow)
  const renderHostControlsModal = () => {
    if (!isHostPanelOpen) return null;
    const claimedCount = Object.keys(claimedCharacters).length;

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

          {/* Full 10-Stage Game Flow Stepper (Lobby -> Round 1 -> Guess 1 -> Round 2 -> Guess 2...) */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
              Full Game Flow (Tap any step or use Next)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
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
              ].map(step => (
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

          {/* Round Submissions & Vote Tally (Rounds 1..4.5) */}
          {unlockedClueRound >= 1 && unlockedClueRound <= 4 && (
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
                onClick={() => handleShareOrCopyGuestLink(false)}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  copiedGuestLink
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-brand-pink/20 border border-brand-pink/40 text-brand-pink hover:bg-brand-pink hover:text-white'
                }`}
              >
                {copiedGuestLink ? '✓ Guest Link Copied (No Login)!' : '📋 Copy Guest Link (No Login)'}
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
              href={`/${locale}/mysteries/${mystery.id}/cast`}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 transition-colors"
            >
              👥 Edit Cast / Victim
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // 1. CHARACTER SELECTION LOBBY (COMPACT & EXCLUSIVE CLAIMING)
  // ============================================================================
  const { coverUrl: mysteryCoverUrl } = parseMysteryImageField(mystery.image_url);
  const claimedCount = Object.keys(claimedCharacters).length;

  if (!selectedChar && !isClueOnlySleuth) {
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-100 flex flex-col font-sans antialiased">
        {renderHostControlsModal()}
        {renderNextConfirmModal()}
        {renderRoundUnlockToast()}

        {/* Compact Lobby Header */}
        <header className="relative border-b border-white/10 bg-slate-950/90 overflow-hidden sticky top-0 z-30 backdrop-blur-md">
          {mysteryCoverUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mysteryCoverUrl}
              alt={mystery.title}
              className="absolute inset-0 w-full h-full object-cover opacity-15 blur-[2px] pointer-events-none"
            />
          )}
          <div className="relative z-10 max-w-4xl mx-auto px-3.5 sm:px-6 py-3 flex items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-brand-pink bg-brand-pink/10 px-2 py-0.5 rounded-full border border-brand-pink/20">
                  {mystery.theme || 'Murder Mystery'}
                </span>
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/15 font-mono">
                  🔑 PIN {pin.slice(0, 3)} {pin.slice(3)}
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white truncate">
                {mystery.title}
              </h1>
            </div>

            {/* 2-Button Host Controls ([Console] + [Next]) ONLY when isHostMode is true */}
            {isHostMode ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsHostPanelOpen(true)}
                  className="min-h-[38px] text-[10px] font-black uppercase tracking-wider px-2.5 sm:px-3 py-2 rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:border-brand-pink/50 hover:text-white transition-all cursor-pointer"
                >
                  🎛️ Console
                </button>
                <button
                  type="button"
                  disabled={isRefreshingSession || !nextStepInfo.canAdvance}
                  onClick={() => handleHostNextStep(false)}
                  className="min-h-[38px] text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-xl bg-brand-pink text-white hover:opacity-95 transition-all shadow disabled:opacity-40 cursor-pointer"
                >
                  {isRefreshingSession ? '⏳...' : nextStepInfo.label}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShareOrCopyGuestLink(true)}
                  className={`min-h-[36px] text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    copiedGuestLink
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-white/5 text-slate-200 border-white/15 hover:border-brand-pink/50'
                  }`}
                >
                  {copiedGuestLink ? '✓ Copied' : '📲 Invite'}
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Character Selection Grid (Opened from Generic Group Chat Link) */}
        <div className="flex-grow max-w-4xl mx-auto w-full px-3.5 sm:px-6 py-4 sm:py-5 space-y-4">
          {/* Top Selection Banner + Device Reminder */}
          <div className="bg-slate-900/70 border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-brand-pink text-white">
                    🎭 Character Selection
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    🔓 No Login Required
                  </span>
                </div>
                <h2 className="text-sm sm:text-base font-black text-white">
                  Find Your Name &amp; Tap Your Character to View Your Dossier
                </h2>
                <p className="text-slate-300 text-xs font-medium">
                  Tap your assigned character below to see your <strong>Character Outline</strong>, <strong>Outfit &amp; Dress Code</strong>, and <strong>How to Act</strong>!
                </p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleShareOrCopyGuestLink(false)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                    copiedGuestLink
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  {copiedGuestLink ? '✓ Link Copied!' : '📋 Copy Group Link'}
                </button>
              </div>
            </div>

            {/* Device Reminder Strip */}
            <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/25 flex items-center gap-2.5 text-xs text-sky-200 font-medium">
              <span className="text-base shrink-0">📱</span>
              <span>
                <strong>Party Night Reminder:</strong> Bring a <strong>charged phone or device</strong> on the night! You&apos;ll use this page to receive live clues, voice memos, and vote on suspects each round.
              </span>
            </div>
          </div>

          {claimError && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs font-bold text-center">
              ⚠️ {claimError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
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
              const isClaimingThis = isClaimingCharId === char.id;

              return (
                <button
                  key={char.id}
                  type="button"
                  disabled={isClaimingThis}
                  onClick={() => handleSelectCharacterInLobby(char.id)}
                  className={`rounded-2xl p-4 text-left transition-all flex flex-col justify-between gap-3 border relative cursor-pointer ${
                    isClaimedByMe
                      ? 'bg-brand-pink/15 border-brand-pink shadow-lg'
                      : 'bg-slate-900/60 border-white/12 hover:border-brand-pink/60 hover:bg-slate-900/90 active:scale-[0.99]'
                  }`}
                >
                  <div className="space-y-3 w-full">
                    {/* Top Badges: Assigned Guest Name + Role Type */}
                    <div className="flex items-center justify-between gap-2">
                      {guestName ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider max-w-[70%] truncate shadow-sm">
                          👤 {guestName}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[9px] font-bold uppercase tracking-wider text-slate-300">
                          Cast Role
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-300 shrink-0">
                        {char.is_victim ? '💀 Victim' : '🕵️ Suspect'}
                      </span>
                    </div>

                    {/* Avatar + Role Title */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/15 bg-slate-950 flex items-center justify-center relative shrink-0">
                        {charAvatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={charAvatarUrl} alt={name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">{char.is_victim ? '💀' : '🕵️'}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm sm:text-base font-black text-white leading-tight">
                          {charPres.roleTitle || archetype}
                        </h3>
                        {guestName && (
                          <p className="text-[11px] font-bold text-emerald-400 truncate mt-0.5">
                            Played by {guestName}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Short Character Teaser Blurb */}
                    <p className="text-xs text-slate-300 font-medium line-clamp-2 leading-relaxed">
                      {charPres.shortBlurb}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 w-full flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      👗 Outfit + 🎭 Vibe Inside
                    </span>
                    <span
                      className={`inline-block text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl ${
                        isClaimedByMe
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-brand-pink/20 text-brand-pink border border-brand-pink/30'
                      }`}
                    >
                      {isClaimingThis
                        ? 'Opening...'
                        : isClaimedByMe
                        ? '✓ Your Character →'
                        : 'View Character →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Compact Quick Join for Extra Guests (Clues & Voting Only) */}
          <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">
                Playing Without an Assigned Character?
              </h3>
              <p className="text-[11px] text-slate-400">
                Join as a Party Sleuth to view live clues and vote each round.
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={customSleuthName}
                onChange={e => setCustomSleuthName(e.target.value)}
                placeholder="Your Name"
                className="flex-grow sm:w-44 min-h-[42px] bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-base sm:text-xs font-bold text-white placeholder:text-slate-600 outline-none focus:border-brand-pink"
              />
              <button
                type="button"
                onClick={() => {
                  if (!customSleuthName.trim()) setCustomSleuthName('Guest Sleuth');
                  setSelectedCharId('sleuth-guest');
                  if (typeof window !== 'undefined') {
                    window.localStorage.setItem(`bpm_selected_char_${mystery.id}`, 'sleuth-guest');
                  }
                  setActiveTab('clues');
                }}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-pink text-white text-[11px] font-black uppercase tracking-wider hover:opacity-95 transition-all shrink-0 cursor-pointer"
              >
                Join →
              </button>
            </div>
          </div>
        </div>

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

  // ============================================================================
  // 2. ACTIVE PLAYROOM (CHARACTER OR SLEUTH ACTIVE)
  // ============================================================================
  const selectedName = selectedChar ? parseCharacter(selectedChar).name : customSleuthName || 'Party Sleuth';
  const selectedArchetype = selectedChar ? parseCharacter(selectedChar).archetype : 'Investigator';
  const profile = selectedChar?.profile_data || {};
  const selectedCharAvatar = resolveDisplayAvatarUrl(
    selectedChar?.profile_data?.avatar_url || selectedChar?.image_url
  );
  const outfitUrl =
    selectedChar?.gender === 'adaptable'
      ? profile.presentation_female?.outfit_image_url || profile.presentation_male?.outfit_image_url
      : profile.outfit_image_url;

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

      {/* Compact Sticky Player & Navigation Bar */}
      <header className="bg-slate-950/90 border-b border-white/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-3xl mx-auto w-full px-3 sm:px-5 py-2 flex items-center justify-between gap-2">
          {/* Left: Compact Player Identity + Switch Role */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/15 relative bg-slate-900 shrink-0">
              {selectedChar && selectedCharAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selectedCharAvatar}
                  alt={selectedName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs">🕵️</div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs sm:text-sm font-black text-white tracking-tight truncate max-w-[125px] sm:max-w-none">
                  {selectedName}
                </h1>
                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-pink/15 text-brand-pink border border-brand-pink/30 shrink-0">
                  {currentStageLabel}
                </span>
                <button
                  type="button"
                  onClick={handleSwitchCharacter}
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 ml-0.5 shrink-0 cursor-pointer transition-colors"
                >
                  ← All Characters
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 truncate">
                {selectedArchetype} • <span className="font-mono">PIN {pin.slice(0, 3)} {pin.slice(3)}</span>
              </p>
            </div>
          </div>

          {/* Right: 2-Button Host Controls ([🎛️ Console] + [Next →]) ONLY when isHostMode is true */}
          {isHostMode && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsHostPanelOpen(true)}
                className="min-h-[34px] text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border bg-white/5 text-slate-200 border-white/10 hover:border-brand-pink/50 hover:text-white transition-all cursor-pointer flex items-center gap-1"
              >
                <span>🎛️</span>
                <span className="hidden xs:inline">Console</span>
              </button>

              <button
                type="button"
                disabled={isRefreshingSession || !nextStepInfo.canAdvance}
                onClick={() => handleHostNextStep(false)}
                className="min-h-[34px] text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg bg-brand-pink text-white hover:opacity-95 transition-all shadow disabled:opacity-40 cursor-pointer"
              >
                {isRefreshingSession ? '⏳...' : nextStepInfo.label}
              </button>
            </div>
          )}
        </div>

        {/* Desktop/Tablet Slim Tab Navigation Strip (Hidden on Mobile Phones in favor of Thumb Bottom Nav Bar) */}
        <div className="hidden sm:block border-t border-white/5 bg-slate-950/60">
          <div className="max-w-3xl mx-auto w-full px-3 sm:px-5 py-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {!isClueOnlySleuth && (
              <>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                    activeTab === 'profile'
                      ? 'bg-brand-pink/15 text-brand-pink border-brand-pink/30'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  👤 Character
                </button>
                <button
                  onClick={() => setActiveTab('relations')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                    activeTab === 'relations'
                      ? 'bg-brand-pink/15 text-brand-pink border-brand-pink/30'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  🕸️ Relations ({charConnections.length})
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('clues')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'clues'
                  ? 'bg-brand-pink/15 text-brand-pink border-brand-pink/30'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <span>
                {isGuessStep ? '🗳️' : '🔍'} Clues &amp; Vote{' '}
                {unlockedClueRound >= 1 && unlockedClueRound <= 4
                  ? isGuessStep
                    ? `(Guess ${unlockedClueRound})`
                    : `(R${unlockedClueRound})`
                  : ''}
              </span>
              {totalUnreadUnlockedClues > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-brand-pink text-white text-[8px] font-black animate-pulse">
                  {totalUnreadUnlockedClues} NEW
                </span>
              )}
            </button>

            {unlockedClueRound >= 4 && (
              <button
                onClick={() => setActiveTab('reveal')}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border shrink-0 cursor-pointer ${
                  activeTab === 'reveal'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'text-emerald-400/70 border-transparent hover:text-emerald-300'
                }`}
              >
                🏆 Reveal &amp; Stats
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Compact Main Content Area */}
      <main className="flex-grow max-w-3xl mx-auto w-full px-3 sm:px-5 py-4 space-y-4">
        {/* Slim Status Strip (When in Lobby or when Clues/Guess are live on another tab) */}
        {currentRound <= 0 && (
          <div className="bg-brand-pink/10 border border-brand-pink/25 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-200 font-medium">
              <strong className="text-white font-black uppercase tracking-wider mr-1.5">
                🥂 Pre-Game Lobby:
              </strong>
              Mingle in character! Clues unlock when the host starts Round 1.
            </p>
          </div>
        )}

        {unlockedClueRound >= 1 && unlockedClueRound <= 4 && activeTab !== 'clues' && (
          <div className="bg-brand-pink/15 border border-brand-pink/35 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-brand-pink animate-ping shrink-0" />
              <p className="text-xs font-bold text-white truncate">
                {isGuessStep
                  ? `🗳️ Guess ${unlockedClueRound} Voting is Open! Submit who & why!`
                  : `🔍 Round ${unlockedClueRound} Clues are live!`}
                {totalUnreadUnlockedClues > 0 ? ` (${totalUnreadUnlockedClues} unread)` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('clues')}
              className="px-3 py-1 rounded-lg bg-brand-pink text-white text-[10px] font-black uppercase tracking-wider hover:opacity-95 transition-all shrink-0 cursor-pointer"
            >
              {isGuessStep ? `Vote Guess ${unlockedClueRound} →` : 'View Clues →'}
            </button>
          </div>
        )}

        {/* TAB 1: CHARACTER PROFILE (CLEAN STRUCTURED DOSSIER) */}
        {activeTab === 'profile' && selectedChar && (() => {
          const charPres = getCleanCharacterPresentation(selectedChar, characters, { mode: 'print' });
          const heroPortraitUrl =
            charPres.characterPhotoUrl ||
            resolveDisplayAvatarUrl(
              selectedChar.profile_data?.avatar_url || selectedChar.image_url
            );

          return (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* 1. Hero Character Identity & Quick Hook Card */}
              <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-white/15 rounded-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 shadow-lg">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-brand-pink/30 bg-slate-950 shrink-0 flex items-center justify-center shadow-md">
                  {heroPortraitUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={heroPortraitUrl}
                      alt={charPres.roleTitle}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">🕵️</span>
                  )}
                </div>

                <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-brand-pink text-white">
                      {charPres.isVictim ? '💀 The Story Catalyst' : '🕵️ Suspect Dossier'}
                    </span>
                    {charPres.guestName && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                        👤 Cast: {charPres.guestName}
                      </span>
                    )}
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {charPres.roleTitle}
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                    {charPres.shortBlurb}
                  </p>
                </div>
              </div>

              {/* 2. What to Wear (Your Costume & Style Vibe) */}
              <div className="bg-slate-900/50 border border-emerald-500/25 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                    <span>👗</span> What to Wear Tonight
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Costume &amp; Look
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <p className="text-slate-100 text-sm font-medium leading-relaxed">
                      {charPres.outfitAdvice}
                    </p>

                    {charPres.outfitVariants && !charPres.guestName && (
                      <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-brand-pink mb-0.5">
                            ♀ Feminine Option
                          </span>
                          <span>{charPres.outfitVariants.feminine}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white/5">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-sky-400 mb-0.5">
                            ♂ Masculine Option
                          </span>
                          <span>{charPres.outfitVariants.masculine}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {charPres.characterPhotoUrl && (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border border-white/15 bg-slate-950 shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={charPres.characterPhotoUrl}
                        alt={`${charPres.roleTitle} Outfit Reference`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. How to Act Tonight (Vibe Summary & Roleplay Bullets) */}
              {(charPres.actSummary || charPres.actBullets.length > 0) && (
                <div className="bg-slate-900/50 border border-brand-pink/25 rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-pink flex items-center gap-1.5">
                      <span>🎭</span> How to Play Your Role
                    </h3>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-pink/15 text-brand-pink border border-brand-pink/25">
                      In-Character Vibe
                    </span>
                  </div>

                  {charPres.actSummary && (
                    <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                      {charPres.actSummary}
                    </p>
                  )}

                  {charPres.actBullets.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {charPres.actBullets.map((bullet, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-2 text-xs text-slate-200 leading-snug"
                        >
                          <span className="text-brand-pink font-black shrink-0">✦</span>
                          <span>{bullet}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 4. Full Backstory & Blurb */}
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <span>📖</span> Your Full Backstory
                </h3>
                <div className="space-y-3 text-slate-200 text-sm leading-relaxed">
                  {charPres.blurbParagraphs.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </div>

              {/* 5. Secrets & Hidden Motivation */}
              {charPres.secrets && (
                <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 sm:p-5 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-1.5">
                    <span>🤫</span> Secrets &amp; Hidden Motivation
                  </h3>
                  <p className="text-slate-200 text-sm leading-relaxed">
                    {charPres.secrets}
                  </p>
                </div>
              )}

              {/* 6. What to Bring Tonight (Charged Phone / Device for Live Clues & Voting) */}
              <div className="bg-sky-500/10 border border-sky-400/25 rounded-2xl p-4 sm:p-5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-black uppercase tracking-widest text-sky-400 flex items-center gap-1.5">
                    <span>📱</span> What to Bring Tonight: A Charged Device
                  </h3>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-400/25">
                    Live Clues &amp; Voting
                  </span>
                </div>
                <p className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                  Bring your <strong>charged phone or device</strong> to the party! You&apos;ll use this exact page throughout the night to receive live Round 1–4 evidence drops (leaked text threads, voice memos &amp; crime scene photos) and lock in your suspect votes each round.
                </p>
              </div>
            </div>
          );
        })()}

        {/* TAB 2: RELATIONSHIPS */}
        {activeTab === 'relations' && selectedChar && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {charConnections.length === 0 ? (
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-6 text-center text-slate-400 text-xs font-medium">
                You don&apos;t have any seeded connections with other characters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {charConnections.map(conn => {
                  const { name: otherName, archetype: otherArch } = parseCharacter(conn.character);
                  const otherAvatarUrl = resolveDisplayAvatarUrl(
                    conn.character.profile_data?.avatar_url || conn.character.image_url
                  );
                  const dynamics = conn.relationship.dynamics;
                  const notes = conn.relationship.notes;

                  return (
                    <div
                      key={conn.character.id}
                      className="p-4 bg-slate-900/40 border border-white/10 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 relative bg-slate-950 shrink-0">
                          {otherAvatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={otherAvatarUrl}
                              alt={otherName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">
                              👤
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-black text-white truncate">{otherName}</h3>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">
                            {otherArch}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
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
                          <p className="text-slate-300 text-xs leading-relaxed">
                            {hydrateTextWithCharacters(notes, characters, 'print')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SWIPEABLE CLUES + BETWEEN-ROUND "WHO & WHY" VOTING */}
        {activeTab === 'clues' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Compact Round Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/40 border border-white/10 rounded-2xl px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-white">
                  Evidence Deck
                </h2>
                {unlockedCluesForSelectedRound.length > 0 && unlockedClueRound > 0 && (
                  <span className="text-[10px] font-bold text-slate-400">
                    • Swipe or use arrows
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(rNum => {
                  const isUnlocked = unlockedClueRound >= rNum;
                  const isSelected = selectedClueRoundFilter === rNum;
                  const unreadInRound = isUnlocked ? getUnreadCountForRound(rNum) : 0;

                  return (
                    <button
                      key={rNum}
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => {
                        setSelectedClueRoundFilter(rNum);
                        setClueSlideIndex(0);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                        !isUnlocked
                          ? 'bg-slate-950/50 text-slate-600 border border-white/5 cursor-not-allowed'
                          : isSelected
                          ? 'bg-brand-pink text-white shadow'
                          : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      <span>{isUnlocked ? `R${rNum}` : `🔒 R${rNum}`}</span>
                      {unreadInRound > 0 && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[8px] font-black ${
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
            </div>

            {/* SWIPEABLE CLUE CAROUSEL */}
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
              <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-8 text-center text-slate-400 text-xs font-medium">
                No clues found for Round {selectedClueRoundFilter}.
              </div>
            ) : (
              currentSlideClue && (
                <div
                  onTouchStart={onTouchStartCard}
                  onTouchEnd={onTouchEndCard}
                  className="bg-slate-900/50 border border-white/15 rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-3.5 relative select-none touch-pan-y"
                >
                  {/* Compact Card Top Bar with Prev/Next + Expand */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/20 text-brand-pink border border-brand-pink/30 text-[10px] font-black uppercase tracking-wider">
                      Round {selectedClueRoundFilter} • Clue {safeSlideIndex + 1}/
                      {unlockedCluesForSelectedRound.length}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedClueModalIndex(safeSlideIndex)}
                        className="min-h-[32px] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                      >
                        🔍 Expand
                      </button>
                    </div>
                  </div>

                  {/* Clue Format Body */}
                  <div
                    onClick={() => setSelectedClueModalIndex(safeSlideIndex)}
                    className="cursor-pointer"
                  >
                    {renderClueFormatView(currentSlideClue, false)}
                  </div>

                  {/* Prev / Next Swipe Navigation Footer */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/10">
                    <button
                      type="button"
                      onClick={handlePrevClue}
                      className="min-h-[42px] px-4 py-2 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-[11px] font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer"
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

                    {safeSlideIndex === unlockedCluesForSelectedRound.length - 1 &&
                    isGuessStep &&
                    unlockedClueRound >= 1 &&
                    unlockedClueRound <= 4 ? (
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('round-suspect-vote-box');
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="min-h-[42px] px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-black uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        🗳️ Vote Guess {activeVotingRound} ↓
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleNextClue}
                        className="min-h-[42px] px-4 py-2 rounded-xl bg-brand-pink hover:opacity-95 text-[11px] font-black uppercase tracking-wider text-white transition-all active:scale-95 cursor-pointer"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )
            )}

            {/* HALF-STEP GUESS VOTING BOX ("GUESS 1..4: WHO & WHY") */}
            {unlockedClueRound >= 1 && unlockedClueRound <= 4 && (
              <div
                id="round-suspect-vote-box"
                className={`rounded-2xl p-4 sm:p-5 shadow-lg space-y-4 transition-all ${
                  isGuessStep
                    ? 'bg-slate-900/60 border border-brand-pink/40'
                    : 'bg-slate-900/35 border border-white/10'
                }`}
              >
                {!isGuessStep ? (
                  /* Locked during Clue Review step (1, 2, 3, 4); Host unlocks Guess step (1.5, 2.5, 3.5, 4.5) next */
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        ⏳ Next Half-Step • Guess {activeVotingRound}
                      </span>
                      <h3 className="text-xs sm:text-sm font-black text-white">
                        🔒 Guess {activeVotingRound} Voting Opens After Clue Review
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Swipe through the Round {activeVotingRound} clues and question the other suspects! Your host will unlock Guess {activeVotingRound} voting next.
                      </p>
                    </div>
                    {isHostMode && (
                      <button
                        type="button"
                        disabled={isRefreshingSession}
                        onClick={() => handleHostNextStep(false)}
                        className="min-h-[42px] px-4 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-[10px] font-black uppercase tracking-wider shadow shrink-0 cursor-pointer"
                      >
                        🗳️ Open Guess {activeVotingRound} Voting →
                      </button>
                    )}
                  </div>
                ) : (
                  /* Unlocked during Guess Half-Step (1.5, 2.5, 3.5, 4.5) */
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink">
                          🗳️ Guess {activeVotingRound} • Suspect Vote Open
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-white">
                          Who Do You Think Did It &amp; Why?
                        </h3>
                      </div>
                      {theorySavedNotice && (
                        <span className="text-[11px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
                          ✓ Guess {activeVotingRound} Locked!
                        </span>
                      )}
                    </div>

                    <form onSubmit={handleTheorySubmit} className="space-y-3.5">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                                className={`min-h-[48px] p-2.5 sm:p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-1.5 active:scale-95 cursor-pointer ${
                                  isChosen
                                    ? 'border-brand-pink bg-brand-pink/20 text-white shadow'
                                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                                }`}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-black truncate">{name}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate">
                                    {archetype}
                                  </p>
                                </div>
                                {isChosen && (
                                  <span className="w-4 h-4 rounded-full bg-brand-pink text-white text-[10px] font-black flex items-center justify-center shrink-0">
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
                          placeholder="Why do you suspect them? (e.g. alibi doesn't match...)"
                          className="flex-grow min-h-[44px] bg-slate-950/90 border border-white/15 focus:border-brand-pink rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-slate-500 outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!accusedCharId || isSubmittingTheory}
                          className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer"
                        >
                          {isSubmittingTheory ? 'Saving...' : `🗳️ Lock Guess ${activeVotingRound}`}
                        </button>
                      </div>
                    </form>
                  </>
                )}

                {/* SHARED ROUND TALLY & THEORIES (WHEN HOST CLICKS SHARE TO GUESTS) */}
                {isCurrentRoundSharedWithGuests && currentRoundSubmissions.length > 0 && (
                  <div className="pt-3.5 border-t border-white/10 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        📢 Live Guess {activeVotingRound} Vote Tally
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {currentRoundSubmissions.map(sub => (
                        <div
                          key={sub.id}
                          className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-0.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-white">{sub.voterName}</span>
                            <span className="text-[10px] font-black text-brand-pink">
                              → {sub.suspectName}
                            </span>
                          </div>
                          <p className="text-slate-300 italic text-[11px]">
                            &ldquo;{sub.reason}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FINAL STATS, SOLUTION REVEAL & 5-STAR GUEST REVIEW */}
        {activeTab === 'reveal' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* 1. DETECTIVE ACCURACY STATS & LEADERBOARD */}
            <section className="bg-slate-900/50 border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  End of Mystery Superlatives
                </span>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                  🏆 Final Detective Stats
                </h2>
              </div>

              {detectiveLeaderboard.length === 0 ? (
                <p className="text-xs text-slate-500 font-medium">
                  No round votes were recorded during this session yet.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {detectiveLeaderboard[0] && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-400/30 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                          🥇 Master Detective
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {detectiveLeaderboard[0].voterName}
                        </h3>
                        <p className="text-[11px] text-slate-300">
                          {detectiveLeaderboard[0].correctVotes}/
                          {detectiveLeaderboard[0].totalVotes} right (
                          {detectiveLeaderboard[0].accuracyPercent}%)
                        </p>
                      </div>
                    )}

                    {mostSuspectedList[0] && (
                      <div className="p-3.5 rounded-xl bg-gradient-to-br from-brand-pink/20 to-slate-900 border border-brand-pink/30 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink">
                          🎯 Most Suspected
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {mostSuspectedList[0].suspectName}
                        </h3>
                        <p className="text-[11px] text-slate-300">
                          Accused {mostSuspectedList[0].count}{' '}
                          {mostSuspectedList[0].count === 1 ? 'time' : 'times'}
                        </p>
                      </div>
                    )}

                    {(() => {
                      const wildest = [...detectiveLeaderboard].sort(
                        (a, b) => b.uniqueSuspectsCount - a.uniqueSuspectsCount
                      )[0];
                      if (!wildest) return null;
                      return (
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-slate-900 border border-purple-400/30 space-y-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-purple-300">
                            🌀 Wildest Sleuth
                          </span>
                          <h3 className="text-sm font-black text-white">{wildest.voterName}</h3>
                          <p className="text-[11px] text-slate-300">
                            {wildest.uniqueSuspectsCount} different suspects
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
                    {detectiveLeaderboard.map((row, idx) => (
                      <div
                        key={row.voterCharId}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center font-black text-[10px] text-white">
                            {idx + 1}
                          </span>
                          <span className="font-black text-white">{row.voterName}</span>
                          {row.earliestCorrectRound && (
                            <span className="text-[10px] font-bold text-emerald-400">
                              • R{row.earliestCorrectRound}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="font-black text-brand-pink">
                            {row.accuracyScore} pts
                          </span>
                          <span className="text-slate-500 ml-1.5 text-[11px]">
                            ({row.correctVotes}/{row.totalVotes})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* 2. THE GRAND REVEAL */}
            <section className="bg-slate-900/60 border border-red-500/30 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              {solutionData ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-400">
                        Official Solution
                      </span>
                      <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white">
                        🔪 The Killer &amp; Timeline
                      </h2>
                    </div>
                    {revealMode === 'phone_free' && (
                      <span className="px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-black uppercase tracking-widest">
                        📵 Host Read-Aloud View
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {solutionData.victim && (
                      <div className="p-3.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-brand-pink">
                          🩸 Victim
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {solutionData.victim.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          {solutionData.victim.role}
                        </p>
                      </div>
                    )}

                    {solutionData.killer && (
                      <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/40 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                          🔪 Killer
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {solutionData.killer.name}
                        </h3>
                        <p className="text-[10px] font-bold text-red-200">
                          {solutionData.killer.role}
                        </p>
                      </div>
                    )}

                    {solutionData.assistant && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                          🤝 Accomplice
                        </span>
                        <h3 className="text-sm font-black text-white">
                          {solutionData.assistant.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400">
                          {solutionData.assistant.role}
                        </p>
                      </div>
                    )}
                  </div>

                  {solutionData.killer?.motiveNotes && (
                    <div className="p-3.5 rounded-xl bg-slate-950 border border-white/10 space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                        💭 Motive ({solutionData.killer.motiveType})
                      </span>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                        {hydrateTextWithCharacters(
                          solutionData.killer.motiveNotes,
                          characters,
                          'print'
                        )}
                      </p>
                    </div>
                  )}

                  {Array.isArray(solutionData.plotBeats) && solutionData.plotBeats.length > 0 && (
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Step-by-Step Reconstruction
                      </h4>
                      <div className="space-y-2.5 border-l-2 border-red-500/40 pl-4">
                        {solutionData.plotBeats.map((beat: any, idx: number) => (
                          <div key={beat.id} className="space-y-0.5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-400">
                              Step {beat.beat_number || idx + 1}
                            </span>
                            <h5 className="text-xs font-black text-white">
                              {hydrateTextWithCharacters(beat.event_title, characters, 'print')}
                            </h5>
                            <p className="text-xs text-slate-300 leading-relaxed">
                              {hydrateTextWithCharacters(
                                beat.description || '',
                                characters,
                                'print'
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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

            {/* 3. 5-STAR GUEST REVIEW & COMMENT CARD */}
            <section className="bg-slate-900/50 border border-brand-pink/30 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Rate Tonight&apos;s Mystery
                </span>
                <h2 className="text-lg font-black text-white">⭐ Leave a 5-Star Review</h2>
              </div>

              {reviewSubmitted ? (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center space-y-1">
                  <h3 className="text-sm font-black text-emerald-300">
                    🎉 Thank You for Your {reviewRating}-Star Review!
                  </h3>
                  <p className="text-xs text-slate-300">
                    Saved for {mystery.title}.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleReviewSubmit} className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map(star => {
                      const active = (reviewHoverRating || reviewRating) >= star;
                      return (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setReviewHoverRating(star)}
                          onMouseLeave={() => setReviewHoverRating(0)}
                          onClick={() => setReviewRating(star)}
                          className={`text-2xl transition-transform hover:scale-110 cursor-pointer ${
                            active ? 'text-amber-400' : 'text-slate-700'
                          }`}
                        >
                          ★
                        </button>
                      );
                    })}
                    <span className="ml-2 text-xs font-black uppercase tracking-widest text-amber-400">
                      {reviewRating} / 5
                    </span>
                  </div>

                  <input
                    type="text"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full sm:w-64 min-h-[42px] bg-slate-950 border border-white/15 focus:border-brand-pink rounded-xl px-3.5 py-2 text-base sm:text-xs font-bold text-white placeholder:text-slate-600 outline-none"
                  />

                  <textarea
                    rows={2}
                    value={reviewComment}
                    onChange={e => setReviewComment(e.target.value)}
                    placeholder="Favorite moment, costume, or plot twist tonight? (Optional)"
                    className="w-full bg-slate-950 border border-white/15 focus:border-brand-pink rounded-xl p-3 text-base sm:text-xs text-white placeholder:text-slate-600 outline-none resize-none"
                  />

                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="w-full sm:w-auto min-h-[44px] px-6 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow cursor-pointer"
                  >
                    {isSubmittingReview ? 'Submitting...' : 'Submit Review →'}
                  </button>
                </form>
              )}

              {reviews.length > 0 && (
                <div className="pt-4 border-t border-white/10 space-y-2">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tonight&apos;s Reviews ({reviews.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {reviews.map((rev: any) => (
                      <div
                        key={rev.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1"
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
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
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
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 bg-slate-950/60 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-brand-pink/15 text-brand-pink border border-brand-pink/30 shrink-0">
                    Round {modalClue.round_number || 1} ({selectedClueModalIndex + 1}/
                    {unlockedCluesForSelectedRound.length})
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10 shrink-0">
                    {formatOption?.label || '🔍 Physical Prop'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedClueModalIndex(null)}
                  className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-white flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto flex-grow">
                {renderClueFormatView(modalClue, false)}
              </div>

              <div className="flex items-center justify-between px-4 py-3 border-t border-white/10 bg-slate-950/60">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClueModalIndex(prev =>
                      prev === null
                        ? null
                        : prev <= 0
                        ? unlockedCluesForSelectedRound.length - 1
                        : prev - 1
                    )
                  }
                  className="text-xs font-black uppercase tracking-widest text-slate-300 hover:text-white cursor-pointer"
                >
                  ← Prev Clue
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedClueModalIndex(prev =>
                      prev === null
                        ? null
                        : prev >= unlockedCluesForSelectedRound.length - 1
                        ? 0
                        : prev + 1
                    )
                  }
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
        {!isClueOnlySleuth && (
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
        )}

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
              : unlockedClueRound >= 1 && unlockedClueRound <= 4
              ? `Clues R${unlockedClueRound}`
              : 'Clues'}
          </span>
          {(totalUnreadUnlockedClues > 0 || isGuessStep) && (
            <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-brand-pink animate-ping" />
          )}
        </button>

        {unlockedClueRound >= 4 && (
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

