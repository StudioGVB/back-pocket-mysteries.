"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type MysterySettingsProps = {
  mysteryId?: string;
  characterCount?: number;
  initialComplexity?: string;
  initialSpiceLevel?: string;
  initialStatus?: string;
  initialMinPlayers?: number;
  initialMaxPlayers?: number;
};

export function MysterySettings({
  mysteryId,
  characterCount = 0,
  initialComplexity = 'medium',
  initialSpiceLevel = 'clean',
  initialStatus = 'draft',
  initialMinPlayers = 4,
  initialMaxPlayers = 10,
}: MysterySettingsProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const normalizeBucketMax = (max?: number) => {
    if (!max) return 10;
    if (max <= 6) return 6;
    if (max <= 10) return 10;
    return 16;
  };

  const [complexity, setComplexity] = useState(initialComplexity);
  const [minPlayers] = useState(initialMinPlayers || 4);
  const [maxPlayers, setMaxPlayers] = useState(normalizeBucketMax(initialMaxPlayers));
  const [status, setStatus] = useState(initialStatus || 'draft');

  const packageBrackets = [
    { max: 6, name: 'Basic Package', label: 'Basic (4–6 Players)', sub: '$19 Base • Requires 6 Characters' },
    { max: 10, name: 'Premium Package', label: 'Premium (4–10 Players)', sub: '$25 Base • Requires 10 Characters' },
    { max: 16, name: 'Grand Package', label: 'Grand (4–16 Players)', sub: '$33 Base • Requires 16 Characters' },
  ];

  const selectedPkg = packageBrackets.find((p) => p.max === maxPlayers) || packageBrackets[0];
  const canPublish = characterCount >= maxPlayers;
  const missingCharacters = Math.max(0, maxPlayers - characterCount);

  const handleSelectPackage = (newMax: number) => {
    setMaxPlayers(newMax);
    if (status === 'published' && characterCount < newMax) {
      setStatus('draft');
    }
  };

  return (
    <>
      {/* Package Tier / Player Capacity Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Package Tier &amp; Player Limit (Determines Price &amp; Required Characters)
          </label>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              canPublish
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            {characterCount} / {maxPlayers} Characters Created
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {packageBrackets.map((pkg) => {
            const isSelected = maxPlayers === pkg.max;
            const meetsPkg = characterCount >= pkg.max;
            return (
              <button
                key={pkg.max}
                type="button"
                onClick={() => handleSelectPackage(pkg.max)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'border-brand-pink bg-brand-pink/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`text-xs font-black uppercase tracking-wider ${
                      isSelected ? 'text-brand-pink' : 'text-slate-900'
                    }`}
                  >
                    {pkg.label}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                      meetsPkg
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {characterCount}/{pkg.max} Roles
                  </span>
                </div>
                <div className="text-[11px] font-bold text-slate-400 mt-0.5">{pkg.sub}</div>
              </button>
            );
          })}
        </div>

        {!canPublish ? (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                ⚠️ Cannot Post / Publish Yet ({missingCharacters} More Character{missingCharacters === 1 ? '' : 's'} Needed)
              </p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                The <strong>{selectedPkg.name}</strong> allows up to {maxPlayers} players, so it must have all <strong>{maxPlayers} characters</strong> created before it can go live (currently has {characterCount}).
              </p>
            </div>
            {mysteryId && (
              <Link
                href={`/${locale}/builder/mysteries/${mysteryId}/characters`}
                className="shrink-0 px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Add Characters →
              </Link>
            )}
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <p className="text-xs font-bold text-emerald-800">
              ✓ Roster complete ({characterCount}/{maxPlayers} characters). This <strong>{selectedPkg.name}</strong> mystery meets the character requirement to be published!
            </p>
          </div>
        )}
      </div>

      {/* Independent Difficulty & Spice Level */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Story Complexity (Independent of Price)
          </label>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['easy', 'medium', 'hard'].map((level) => (
              <label key={level} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="complexity"
                  value={level}
                  checked={complexity === level}
                  onChange={() => setComplexity(level)}
                  className="peer hidden"
                />
                <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-slate-600 peer-checked:bg-slate-900 peer-checked:text-white transition-all">
                  {level}
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Spice Level (Independent of Price)
          </label>
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {['clean', 'mild', 'spicy', 'filthy'].map((level) => (
              <label key={level} className="flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="spice_level"
                  value={level}
                  defaultChecked={
                    initialSpiceLevel === level ||
                    (initialSpiceLevel === 'low' && level === 'clean')
                  }
                  className="peer hidden"
                />
                <div className="text-center py-2 text-xs font-bold uppercase tracking-wider text-slate-400 rounded-lg hover:text-brand-pink/50 peer-checked:bg-brand-pink peer-checked:text-white transition-all">
                  {level}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Status {!canPublish && <span className="text-amber-600">(Locked to Draft until {maxPlayers} roles added)</span>}
          </label>
          <input type="hidden" name="status" value={canPublish ? status : status === 'published' ? 'draft' : status} />
          <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            {[
              { value: 'draft', label: 'Draft', locked: false },
              { value: 'published', label: 'Published', locked: !canPublish },
              { value: 'archived', label: 'Archived', locked: false },
            ].map((opt) => {
              const effectiveStatus = canPublish ? status : status === 'published' ? 'draft' : status;
              const isSelected = effectiveStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.locked}
                  onClick={() => {
                    if (!opt.locked) setStatus(opt.value);
                  }}
                  title={
                    opt.locked
                      ? `Requires ${maxPlayers} characters to publish (currently has ${characterCount})`
                      : undefined
                  }
                  className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                    isSelected
                      ? opt.value === 'published'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-white'
                      : opt.locked
                      ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {opt.locked ? `🔒 ${opt.label}` : opt.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Min Players
          </label>
          <input
            name="min_players"
            value={minPlayers}
            readOnly
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold transition-all shadow-sm text-slate-500 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Max Players (Upper Cap)
          </label>
          <input
            name="max_players"
            value={maxPlayers}
            readOnly
            className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold transition-all shadow-sm text-slate-500 cursor-not-allowed"
          />
        </div>
      </div>
    </>
  );
}
