'use client';

import React, { useState } from 'react';
import { autoAssignGuestsAction, clearAllCastingAction } from '../actions';

interface CastingToolbarProps {
  mysteryId: string;
  totalCharacters: number;
  castCount: number;
  rosterCount: number;
}

export function CastingToolbar({ mysteryId, totalCharacters, castCount, rosterCount }: CastingToolbarProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAutoCast = async () => {
    if (rosterCount === 0) {
      alert("No guests found in your roster. Please add some guests under 'My Guests' first!");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await autoAssignGuestsAction(mysteryId);
      if (res && (res as any).error) {
        setError((res as any).error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to auto-assign guests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCast = async () => {
    if (confirm('Are you sure you want to clear all guest assignments for this mystery?')) {
      setIsLoading(true);
      setError(null);
      try {
        await clearAllCastingAction(mysteryId);
      } catch (err: any) {
        setError(err.message || 'Failed to clear casting');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-brand-pink/5 flex items-center justify-center text-xl">
          🎭
        </div>
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Guest Casting Studio</h4>
          <p className="text-xs text-slate-400 font-semibold mt-0.5">
            {castCount} of {totalCharacters} characters casted • {rosterCount} friends in roster
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {castCount > 0 && (
          <button
            onClick={handleClearCast}
            disabled={isLoading}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-50 transition-all font-sans"
          >
            Clear Cast
          </button>
        )}

        <button
          onClick={handleAutoCast}
          disabled={isLoading}
          className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-brand-pink disabled:opacity-50 transition-all shadow-md shadow-slate-900/10 flex items-center gap-2 font-sans"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin inline-block" />
              Casting...
            </>
          ) : (
            <>⚡ Auto-Cast Roster</>
          )}
        </button>
      </div>

      {error && (
        <div className="w-full md:w-auto text-xs text-red-500 font-bold bg-red-50 px-4 py-2 rounded-xl border border-red-100 mt-2 md:mt-0">
          {error}
        </div>
      )}
    </div>
  );
}
