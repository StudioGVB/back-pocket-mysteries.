'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  getGameSessionAction,
  updateHostGameControlAction,
  RoundSubmission,
} from '@/app/actions/customer-mystery';

interface HostRoundControllerProps {
  mysteryId: string;
  currentRound: number;
  initialSession?: any;
  totalPlayers?: number;
}

export function HostRoundController({
  mysteryId,
  currentRound: initialRound,
  initialSession,
  totalPlayers = 8,
}: HostRoundControllerProps) {
  const [localRound, setLocalRound] = useState<number>(
    initialSession?.currentRound ?? initialRound ?? 0
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
  const [showWhoSaidWho, setShowWhoSaidWho] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const refreshSession = useCallback(async () => {
    setIsUpdating(true);
    try {
      const latest = await getGameSessionAction(mysteryId);
      if (!('error' in latest)) {
        setLocalRound(latest.currentRound);
        setSubmissions(latest.submissions || []);
        setSharedTheoryRounds(latest.sharedTheoryRounds || []);
        setRevealMode(latest.revealMode || 'hidden');
        setDetectiveLeaderboard(latest.detectiveLeaderboard || []);
        setMostSuspectedList(latest.mostSuspectedList || []);
      }
    } finally {
      setIsUpdating(false);
    }
  }, [mysteryId]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const handleRoundChange = async (newRound: number) => {
    setLocalRound(newRound);
    setIsUpdating(true);
    try {
      const updated = await updateHostGameControlAction(mysteryId, {
        currentRound: newRound,
      });
      if (!('error' in updated)) {
        setLocalRound(updated.currentRound);
        setSubmissions(updated.submissions || []);
        setSharedTheoryRounds(updated.sharedTheoryRounds || []);
        setRevealMode(updated.revealMode || 'hidden');
        setDetectiveLeaderboard(updated.detectiveLeaderboard || []);
        setMostSuspectedList(updated.mostSuspectedList || []);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleShareRound = async (roundNum: number) => {
    setIsUpdating(true);
    try {
      const updated = await updateHostGameControlAction(mysteryId, {
        toggleShareRound: roundNum,
      });
      if (!('error' in updated)) {
        setSharedTheoryRounds(updated.sharedTheoryRounds || []);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetRevealMode = async (mode: 'hidden' | 'phone_free' | 'shared_with_guests') => {
    setIsUpdating(true);
    try {
      const updated = await updateHostGameControlAction(mysteryId, {
        currentRound: 5,
        revealMode: mode,
      });
      if (!('error' in updated)) {
        setLocalRound(5);
        setRevealMode(updated.revealMode || mode);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const rounds = [
    { value: 0, label: '0. Lobby (Pre-Game)' },
    { value: 1, label: 'Round 1' },
    { value: 2, label: 'Round 2' },
    { value: 3, label: 'Round 3' },
    { value: 4, label: 'Round 4 (Final Clues)' },
    { value: 5, label: '5. Final Stats & Reveal' },
  ];

  const activeVotingRound = Math.max(1, Math.min(4, localRound || 1));
  const roundSubs = submissions.filter(s => s.round === activeVotingRound);
  const isRoundShared = sharedTheoryRounds.includes(activeVotingRound);

  const tallyList = (() => {
    const map = new Map<string, { suspectCharId: string; suspectName: string; votes: number }>();
    for (const s of roundSubs) {
      const prev = map.get(s.suspectCharId) || {
        suspectCharId: s.suspectCharId,
        suspectName: s.suspectName,
        votes: 0,
      };
      prev.votes += 1;
      map.set(s.suspectCharId, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.votes - a.votes);
  })();

  return (
    <div className="space-y-6">
      {/* Top Round Controls */}
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
              Active Kahoot Game State • PIN: {pin.slice(0, 3)} {pin.slice(3)}
            </p>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {rounds.find(r => r.value === localRound)?.label || `Round ${localRound}`}
            </h4>
          </div>

          <button
            type="button"
            onClick={refreshSession}
            disabled={isUpdating}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-brand-pink text-white text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
          >
            {isUpdating ? '⏳ Syncing...' : '🔄 Refresh Guest Submissions'}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {rounds.map(r => {
            const isActive = localRound === r.value;
            return (
              <button
                key={r.value}
                disabled={isUpdating}
                onClick={() => handleRoundChange(r.value)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 border cursor-pointer ${
                  isActive
                    ? 'bg-brand-pink text-white border-brand-pink shadow-sm'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-800'
                } disabled:opacity-50`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Between-Round Suspect Vote Tally & Hide/Share Controls */}
      {localRound >= 1 && localRound <= 4 && (
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Round {activeVotingRound} Suspect Accusations
              </span>
              <h4 className="text-base font-black text-white">
                {roundSubs.length} / {totalPlayers} Guests Submitted Theories
              </h4>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowWhoSaidWho(prev => !prev)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer"
              >
                {showWhoSaidWho ? '🙈 Hide Who Said Who' : '👁️ View Who Said Who & Why'}
              </button>

              <button
                type="button"
                onClick={() => handleToggleShareRound(activeVotingRound)}
                className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                  isRoundShared
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-brand-pink text-white hover:opacity-95'
                }`}
              >
                {isRoundShared
                  ? '✓ Tally Shared to Guest Phones (Click to Hide)'
                  : '📢 Share Tally & Theories to Guests'}
              </button>
            </div>
          </div>

          {tallyList.length === 0 ? (
            <p className="text-xs text-slate-400 font-medium">
              Waiting for guests to lock in their Round {activeVotingRound} suspect and motive theory on their phones. Click <strong>Refresh Guest Submissions</strong> above to check for new votes!
            </p>
          ) : (
            <div className="space-y-2.5">
              {tallyList.map(item => {
                const pct = Math.round((item.votes / Math.max(1, roundSubs.length)) * 100);
                return (
                  <div key={item.suspectCharId} className="space-y-1">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-white">{item.suspectName}</span>
                      <span className="text-brand-pink">
                        {item.votes} {item.votes === 1 ? 'vote' : 'votes'} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-pink rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showWhoSaidWho && roundSubs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-white/10">
              {roundSubs.map(sub => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black text-white">{sub.voterName}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-brand-pink">
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

      {/* Round 5 Final Stats & Host Reveal Mode Selector */}
      {localRound === 5 && (
        <div className="p-6 bg-slate-900 text-white rounded-2xl border border-brand-pink/40 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                Round 5 • Final Solution &amp; Stats
              </span>
              <h4 className="text-base font-black text-white">
                Choose How to Reveal the Solution
              </h4>
              <p className="text-xs text-slate-400">
                Keep the reveal phone-free to read it aloud yourself, or push the solution packet to every guest&apos;s phone.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSetRevealMode('phone_free')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  revealMode === 'phone_free'
                    ? 'bg-amber-400 text-slate-950 shadow-lg'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                📵 Read Aloud (Phone-Free)
              </button>

              <button
                type="button"
                onClick={() => handleSetRevealMode('shared_with_guests')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  revealMode === 'shared_with_guests'
                    ? 'bg-emerald-400 text-slate-950 shadow-lg'
                    : 'bg-brand-pink text-white hover:opacity-95'
                }`}
              >
                📲 Share Solution to All Guests
              </button>
            </div>
          </div>

          {/* Quick Detective Accuracy Summary */}
          {detectiveLeaderboard.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                  🥇 Most Accurate Detective
                </span>
                <p className="text-sm font-black text-white mt-1">
                  {detectiveLeaderboard[0].voterName} ({detectiveLeaderboard[0].accuracyPercent}% accuracy)
                </p>
              </div>
              {mostSuspectedList[0] && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block">
                    🎯 Most Suspected All Night
                  </span>
                  <p className="text-sm font-black text-white mt-1">
                    {mostSuspectedList[0].suspectName} ({mostSuspectedList[0].count} votes)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
