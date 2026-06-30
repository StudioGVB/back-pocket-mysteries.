"use client";

import React, { useState, useTransition } from 'react';
import { updateMysteryRoundAction } from '../../status/actions';

interface HostRoundControllerProps {
  mysteryId: string;
  currentRound: number;
}

export function HostRoundController({ mysteryId, currentRound }: HostRoundControllerProps) {
  const [isPending, startTransition] = useTransition();
  const [localRound, setLocalRound] = useState(currentRound);

  const handleRoundChange = (newRound: number) => {
    setLocalRound(newRound);
    startTransition(async () => {
      const res = await updateMysteryRoundAction(mysteryId, newRound);
      if (res?.error) {
        alert(`Error updating round: ${res.error}`);
        setLocalRound(currentRound); // revert on error
      }
    });
  };

  const rounds = [
    { value: 0, label: 'Lobby (Pre-Game)' },
    { value: 1, label: 'Round 1' },
    { value: 2, label: 'Round 2' },
    { value: 3, label: 'Round 3' },
    { value: 4, label: 'Round 4' },
    { value: 5, label: 'Reveal & Solution' }
  ];

  return (
    <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Active Game State</p>
          <h4 className="text-sm font-black text-white uppercase tracking-wider">
            {rounds.find(r => r.value === localRound)?.label || `Round ${localRound}`}
          </h4>
        </div>
        {isPending && (
          <span className="text-xs text-brand-pink font-black animate-pulse uppercase tracking-wider">
            Updating...
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {rounds.map(r => {
          const isActive = localRound === r.value;
          return (
            <button
              key={r.value}
              disabled={isPending}
              onClick={() => handleRoundChange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 border ${
                isActive
                  ? 'bg-brand-pink/25 text-brand-pink border-brand-pink/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400 border-transparent hover:text-slate-200'
              } disabled:opacity-50`}
            >
              {r.value === 0 ? 'Lobby' : `R${r.value}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
