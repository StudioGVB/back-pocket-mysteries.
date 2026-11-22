'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  inferClueFormat,
  stripCustomerFacingTitle,
  stripFormatTagFromNotes,
  shuffleRoundCluesDeterministically,
} from '@/utils/clue-format';
import {
  hydrateTextWithCharacters,
  getCharacterRoleTitle,
} from '@/utils/hydration';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { downloadFullMysteryPackHtml } from '@/utils/export-full-mystery-pack';
import type { FriendRosterItem } from '@/app/[locale]/(builder)/builder/mysteries/[id]/screen/_components/PackScreenerClient';

function buildDefaultFriendAssignments(
  rawCharacters: any[],
  friendRoster: FriendRosterItem[]
): Record<string, string> {
  const assignments: Record<string, string> = {};
  const usedFriendIds = new Set<string>();

  const maleFriends = friendRoster.filter(
    (f) => f.gender === 'male' || f.gender === 'masculine'
  );
  const femaleFriends = friendRoster.filter(
    (f) => f.gender === 'female' || f.gender === 'feminine'
  );

  for (const c of rawCharacters) {
    const existingName = String(c?.profile_data?.guest_name || '').trim().toLowerCase();
    const existingId = String(c?.profile_data?.guest_id || '').trim().toLowerCase();
    const match = friendRoster.find(
      (f) =>
        (existingId && String(f.id).toLowerCase() === existingId) ||
        (existingName && f.name.toLowerCase() === existingName)
    );
    if (match && !usedFriendIds.has(match.id)) {
      assignments[c.id] = match.id;
      usedFriendIds.add(match.id);
    }
  }

  for (const c of rawCharacters) {
    if (assignments[c.id]) continue;
    const g = String(c.gender || '').toLowerCase();
    const pool =
      g === 'male'
        ? [...maleFriends, ...friendRoster]
        : g === 'female'
        ? [...femaleFriends, ...friendRoster]
        : friendRoster;
    const chosen = pool.find((f) => !usedFriendIds.has(f.id)) || pool[0];
    if (chosen) {
      assignments[c.id] = chosen.id;
      usedFriendIds.add(chosen.id);
    }
  }

  return assignments;
}

export default function PrintAllMasterClient({
  mystery,
  relationships,
  subplots,
  friendRoster,
  locale,
}: {
  mystery: any;
  relationships: any[];
  subplots: any[];
  friendRoster: FriendRosterItem[];
  locale: string;
}) {
  const rawCharacters: any[] = mystery?.characters || [];
  const rawClues: any[] = mystery?.clues || [];
  const plotBeats: any[] = mystery?.plot_beats || [];

  const [useFriendNames, setUseFriendNames] = useState<boolean>(true);
  const [includeXRaySpoilers, setIncludeXRaySpoilers] = useState<boolean>(true);
  const [friendAssignments, setFriendAssignments] = useState<Record<string, string>>(() =>
    buildDefaultFriendAssignments(rawCharacters, friendRoster)
  );
  const [activeClueModal, setActiveClueModal] = useState<any | null>(null);
  const [activePortraitModal, setActivePortraitModal] = useState<{
    url: string;
    title: string;
    subtitle?: string;
  } | null>(null);

  // Sync any custom friend assignments selected in PackScreenerClient from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !mystery?.id) return;
    try {
      const saved = window.localStorage.getItem(`bpm_friend_assignments_${mystery.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          setFriendAssignments((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {
      // ignore
    }
  }, [mystery?.id]);

  const activeCharacters = useMemo(() => {
    return rawCharacters.map((c) => {
      const roleTitle = getCharacterRoleTitle(c) || c.name;
      const assignedFriendId = friendAssignments[c.id];
      const friend = friendRoster.find((f) => f.id === assignedFriendId);

      if (!useFriendNames || !friend) {
        return {
          ...c,
          assignedFriend: null,
          displayRoleTitle: roleTitle,
          displayName: roleTitle,
          profile_data: {
            ...(c.profile_data || {}),
            guest_name: '',
          },
        };
      }

      return {
        ...c,
        assignedFriend: friend,
        name: `${friend.name} | ${roleTitle}`,
        displayRoleTitle: roleTitle,
        displayName: `${friend.name} (${roleTitle})`,
        profile_data: {
          ...(c.profile_data || {}),
          guest_id: friend.id,
          guest_name: friend.name,
          avatar_url: friend.avatar_url || c.profile_data?.avatar_url,
          friend_photo_url: friend.photoUrl ? resolveDisplayAvatarUrl(friend.photoUrl) : null,
        },
      };
    });
  }, [rawCharacters, friendRoster, friendAssignments, useFriendNames]);

  const hydrate = (text?: string | null) => {
    if (!text) return '';
    return hydrateTextWithCharacters(
      text,
      activeCharacters,
      useFriendNames ? 'print' : 'role'
    );
  };

  const cluesByRound = useMemo(() => {
    const r1 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => (c.round_number || 1) === 1),
      1
    );
    const r2 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => c.round_number === 2),
      2
    );
    const r3 = shuffleRoundCluesDeterministically(
      rawClues.filter((c) => c.round_number === 3),
      3
    );
    return { 1: r1, 2: r2, 3: r3 };
  }, [rawClues]);

  const getPortraitUrl = (c: any) => {
    const pd = c?.profile_data || {};
    if (useFriendNames) {
      if (pd.standard_character_photo_url) return pd.standard_character_photo_url;
      if (pd.friend_photo_url) return pd.friend_photo_url;
    }
    return (
      pd.standard_character_photo_url ||
      pd.outfit_image_url ||
      pd.outfit_reference_images?.[0] ||
      pd.avatar_url ||
      null
    );
  };

  const victimChar = activeCharacters.find((c) => c.is_victim || c.plot_role === 'victim');
  const killerChar = activeCharacters.find((c) => c.plot_role === 'killer');

  const handleDownloadHtmlFile = () => {
    downloadFullMysteryPackHtml({
      mystery,
      activeCharacters,
      relationships,
      subplots,
      plotBeats,
      cluesByRound,
      useFriendNames,
      includeXRaySpoilers,
      getPortraitUrl,
    });
  };

  const fakeCluesList = useMemo(
    () =>
      rawClues.filter(
        (c) => c.evidence_status === 'fake' || c.implication_type === 'red_herring'
      ),
    [rawClues]
  );

  return (
    <div className="bg-[#090d16] text-slate-100 min-h-screen font-sans print:bg-white print:text-slate-900 pb-24 print:pb-0">
      {/* STICKY TOP BAR (Hidden when printing to PDF) */}
      <div className="sticky top-0 z-40 bg-[#090d16]/95 backdrop-blur-md border-b border-slate-800 px-6 py-3.5 print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/${locale}/builder/mysteries/${mystery.id}/screen`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider border border-slate-700 transition-all"
          >
            ← Screener
          </Link>
          <Link
            href={`/${locale}/builder/mysteries/${mystery.id}/compile`}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-black uppercase tracking-wider border border-slate-700 transition-all"
          >
            ← Compile Studio
          </Link>
          <div className="hidden md:flex items-center gap-1.5 ml-2 text-xs font-bold text-slate-400">
            <a href="#section-overview" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
              1. Cast Table
            </a>
            <a href="#section-characters" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
              2. Characters ({activeCharacters.length})
            </a>
            <a href="#section-round-1" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
              3. Round 1 ({cluesByRound[1].length})
            </a>
            <a href="#section-round-2" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
              4. Round 2 ({cluesByRound[2].length})
            </a>
            <a href="#section-round-3" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
              5. Round 3 ({cluesByRound[3].length})
            </a>
            {includeXRaySpoilers && (
              <a href="#section-solution" className="px-2.5 py-1.5 rounded-lg hover:bg-slate-800 hover:text-white">
                6. Master Reveal
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Friend Names Toggle */}
          <button
            type="button"
            onClick={() => setUseFriendNames((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              useFriendNames
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {useFriendNames ? '👥 Friends Cast: ON' : '🎭 Base Role Titles'}
          </button>

          {/* QA X-Ray Spoilers Toggle */}
          <button
            type="button"
            onClick={() => setIncludeXRaySpoilers((v) => !v)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer ${
              includeXRaySpoilers
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            {includeXRaySpoilers ? '🔬 QA X-Ray Spoilers: ON' : '🔒 Player-Safe Mode'}
          </button>

          {/* 1-Click Single-File HTML Download */}
          <button
            type="button"
            onClick={handleDownloadHtmlFile}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-white text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            📥 Download Offline File (.HTML)
          </button>

          {/* 1-Click Print / Save as PDF */}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-[#FF1493] hover:bg-[#ff2da0] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-[#FF1493]/25 cursor-pointer"
          >
            🖨️ Save Complete Pack as PDF
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-14 print:px-4 print:py-4 print:space-y-8">
        {/* SECTION 1: COVER & CAST ROSTER TABLE */}
        <section id="section-overview" className="space-y-8">
          <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 md:p-10 print:bg-white print:border-slate-300">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#FF1493] block mb-2">
              Back Pocket Mysteries • Complete All-in-One Hydrated Pack
            </span>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white print:text-slate-900 mb-3">
              {mystery.title}
            </h1>
            <p className="text-sm md:text-base text-slate-300 print:text-slate-700 leading-relaxed max-w-4xl">
              {hydrate(mystery.description)}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t border-slate-800 print:border-slate-200 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 print:bg-slate-100 print:text-slate-800">
                🎭 Theme: {mystery.theme || 'Custom'}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 print:bg-slate-100 print:text-slate-800">
                👥 Cast: {activeCharacters.length} Suspects
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 print:bg-slate-100 print:text-slate-800">
                🔍 Clues: {rawClues.length} Total (R1: {cluesByRound[1].length} • R2: {cluesByRound[2].length} • R3: {cluesByRound[3].length})
              </span>
              {includeXRaySpoilers && victimChar && (
                <span className="px-3 py-1.5 rounded-xl bg-pink-500/20 text-pink-300 border border-pink-500/30 print:bg-pink-50 print:text-pink-800">
                  🩸 Victim: {victimChar.displayName}
                </span>
              )}
              {includeXRaySpoilers && killerChar && (
                <span className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 print:bg-rose-50 print:text-rose-800">
                  🔪 Killer: {killerChar.displayName}
                </span>
              )}
            </div>
          </div>

          {/* At-a-Glance Cast Table */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 overflow-hidden print:bg-white print:border-slate-300">
            <div className="px-6 py-4 border-b border-slate-800 print:border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-black uppercase tracking-tight text-white print:text-slate-900">
                01. Friend Cast &amp; Character Assignment Table
              </h2>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493]">
                {useFriendNames ? 'Hydrated with Your Friends' : 'Base Role View'}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] print:bg-slate-100 print:text-slate-600">
                    <th className="py-3 px-4">Portrait</th>
                    <th className="py-3 px-4">Friend Name</th>
                    <th className="py-3 px-4">Character Role</th>
                    <th className="py-3 px-4">Plot Role</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Color</th>
                    <th className="py-3 px-4">Traits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
                  {activeCharacters.map((c) => {
                    const isVictim = c.is_victim || c.plot_role === 'victim';
                    const isKiller = c.plot_role === 'killer';
                    const pUrl = getPortraitUrl(c);
                    return (
                      <tr key={c.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          {pUrl ? (
                            <button
                              type="button"
                              onClick={() =>
                                setActivePortraitModal({
                                  url: pUrl,
                                  title: c.displayName,
                                  subtitle: hydrate(c.profile_data?.outfit_advice || ''),
                                })
                              }
                              title="Click to enlarge character portrait"
                              className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#FF1493] block cursor-zoom-in shadow-md"
                            >
                              <img
                                src={pUrl}
                                alt={c.displayName}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-xl">
                              🕵️
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-black text-sm text-white print:text-slate-900">
                          {useFriendNames && c.assignedFriend?.name ? c.assignedFriend.name : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-200 print:text-slate-800">
                          {c.displayRoleTitle}
                        </td>
                        <td className="py-3 px-4">
                          {isVictim ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-black uppercase print:bg-pink-100 print:text-pink-800">
                              🩸 Victim
                            </span>
                          ) : isKiller && includeXRaySpoilers ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase print:bg-rose-100 print:text-rose-800">
                              🔪 Killer
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-black uppercase print:bg-slate-100 print:text-slate-800">
                              🎭 Suspect
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 uppercase text-slate-400 print:text-slate-600">
                          {c.gender || 'Adaptable'}
                        </td>
                        <td className="py-3 px-4 text-slate-300 print:text-slate-700">
                          {c.profile_data?.color || 'Classic'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 print:text-slate-600">
                          {Array.isArray(c.profile_data?.traits)
                            ? c.profile_data.traits.join(' • ')
                            : ''}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* SECTION 2: COMPLETE CHARACTER DOSSIERS & RELATIONSHIPS (LARGE PORTRAITS!) */}
        <section id="section-characters" className="space-y-6 print:break-before-page">
          <div className="border-b border-slate-800 pb-4 print:border-slate-300 flex items-end justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block">
                Section 02 • Personalized Character Sheets
              </span>
              <h2 className="text-2xl font-black text-white print:text-slate-900">
                Complete Character Dossiers &amp; Relationship Web ({activeCharacters.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 print:hidden">
              💡 Click any character photo to view full-screen
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeCharacters.map((c) => {
              const pd = c.profile_data || {};
              const portraitUrl = getPortraitUrl(c);
              const charRels = relationships.filter(
                (r: any) => r.character_a_id === c.id || r.character_b_id === c.id
              );
              const motive = Array.isArray(c.motives) && c.motives[0] ? c.motives[0] : null;
              const isVictim = c.is_victim || c.plot_role === 'victim';
              const isKiller = c.plot_role === 'killer';

              return (
                <div
                  key={c.id}
                  className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 flex flex-col gap-5 print:bg-white print:border-slate-300 print:break-inside-avoid"
                >
                  <div className="flex flex-col sm:flex-row items-start gap-5 border-b border-slate-800 pb-5 print:border-slate-200">
                    {portraitUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setActivePortraitModal({
                            url: portraitUrl,
                            title: c.displayName,
                            subtitle: hydrate(pd.outfit_advice || ''),
                          })
                        }
                        title="Click to enlarge character portrait"
                        className="relative group w-full sm:w-52 aspect-square rounded-2xl overflow-hidden border-2 border-[#FF1493] shrink-0 bg-slate-950 shadow-xl cursor-zoom-in"
                      >
                        <img
                          src={portraitUrl}
                          alt={c.displayName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-lg bg-black/80 text-white text-[10px] font-black uppercase tracking-wider border border-white/20 print:hidden">
                          🔍 Enlarge
                        </span>
                      </button>
                    ) : (
                      <div className="w-full sm:w-52 aspect-square rounded-2xl bg-slate-800 flex items-center justify-center text-5xl shrink-0">
                        🕵️
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isVictim ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-black uppercase">
                            🩸 The Victim
                          </span>
                        ) : isKiller && includeXRaySpoilers ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-black uppercase">
                            🔪 The Killer
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-300 text-[10px] font-black uppercase">
                            🎭 Suspect
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold uppercase print:bg-slate-100 print:text-slate-700">
                          🎨 {pd.color || 'Signature'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-black text-white print:text-slate-900">
                        {c.displayName}
                      </h3>
                      {pd.act_summary && (
                        <p className="text-xs italic text-slate-300 print:text-slate-600">
                          {hydrate(pd.act_summary)}
                        </p>
                      )}
                      <div className="pt-1">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] mb-1">
                          📖 Backstory &amp; Bio
                        </h4>
                        <p className="text-xs text-slate-200 print:text-slate-800 leading-relaxed">
                          {hydrate(pd.bio)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {Array.isArray(pd.act_bullets) && pd.act_bullets.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] mb-1">
                        🎭 How to Act &amp; Party Prompts
                      </h4>
                      <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300 print:text-slate-800">
                        {pd.act_bullets.map((b: string, i: number) => (
                          <li key={i}>{hydrate(b)}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {pd.outfit_advice && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] mb-1">
                        👗 What to Wear
                      </h4>
                      <p className="text-xs text-slate-300 print:text-slate-800 leading-relaxed">
                        {hydrate(pd.outfit_advice)}
                      </p>
                    </div>
                  )}

                  {includeXRaySpoilers && motive && (
                    <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 print:bg-rose-50 print:border-rose-200">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-300 print:text-rose-800 mb-0.5">
                        🔥 Secret Motive ({String(motive.motive_type || 'motive').toUpperCase()} • {String(motive.strength || 'high').toUpperCase()})
                      </h4>
                      <p className="text-xs text-rose-100 print:text-rose-900">
                        {hydrate(motive.notes || motive.description || '')}
                      </p>
                    </div>
                  )}

                  {charRels.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] mb-1.5">
                        🕸️ Connections with Other Friends ({charRels.length})
                      </h4>
                      <div className="space-y-1.5">
                        {charRels.map((r: any, rIdx: number) => {
                          const otherId =
                            r.character_a_id === c.id ? r.character_b_id : r.character_a_id;
                          const otherChar = activeCharacters.find((ac) => ac.id === otherId);
                          const dynamics = Array.isArray(r.dynamics)
                            ? r.dynamics.join(' • ')
                            : r.relationship_type || 'Connected';
                          return (
                            <div
                              key={r.id || rIdx}
                              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs print:bg-slate-50 print:border-slate-200"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-white print:text-slate-900">
                                  ↔ {otherChar?.displayName || 'Suspect'}
                                </span>
                                <span className="text-[10px] font-black uppercase text-sky-400 print:text-sky-700">
                                  {dynamics}
                                </span>
                              </div>
                              {(r.notes || r.description) && (
                                <p className="text-[11px] text-slate-400 print:text-slate-600 mt-0.5">
                                  {hydrate(r.notes || r.description)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: ROUNDS 1, 2 & 3 CLUES */}
        {([1, 2, 3] as const).map((roundNum) => {
          const roundClues = cluesByRound[roundNum] || [];
          return (
            <section
              key={roundNum}
              id={`section-round-${roundNum}`}
              className="space-y-6 print:break-before-page"
            >
              <div className="border-b border-slate-800 pb-4 print:border-slate-300 flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493] block">
                    Section 03.{roundNum} • Evidence Deck
                  </span>
                  <h2 className="text-2xl font-black text-white print:text-slate-900">
                    Round {roundNum} Clues ({roundClues.length} Evidence Cards)
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {roundClues.map((clue: any, idx: number) => {
                  const fmt = clue.format || inferClueFormat(clue);
                  const cleanTitle = stripCustomerFacingTitle(clue.title) || clue.title;
                  const hydratedTitle = hydrate(cleanTitle);
                  const hydratedDesc = hydrate(clue.description || '');
                  const isFake =
                    clue.evidence_status === 'fake' || clue.implication_type === 'red_herring';
                  const linkedBeat = plotBeats.find(
                    (b: any) => b.id === clue.linked_plot_beat_id
                  );
                  const internalNotes = hydrate(stripFormatTagFromNotes(clue.internal_notes || ''));

                  return (
                    <div
                      key={clue.id || idx}
                      id={`clue-card-${clue.id}`}
                      onClick={() => setActiveClueModal(clue)}
                      className={`cursor-pointer rounded-2xl bg-slate-900/90 hover:bg-slate-900 border p-5 flex flex-col justify-between gap-3.5 transition-all print:bg-white print:break-inside-avoid ${
                        includeXRaySpoilers
                          ? isFake
                            ? 'border-rose-500/50 hover:border-rose-400 print:border-rose-300'
                            : 'border-emerald-500/50 hover:border-emerald-400 print:border-emerald-300'
                          : 'border-slate-800 hover:border-[#FF1493] print:border-slate-300'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#FF1493]">
                            R{roundNum} • Clue #{idx + 1} • {fmt.replace(/_/g, ' ')}
                          </span>
                          {includeXRaySpoilers && (
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isFake
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 print:bg-rose-100 print:text-rose-800'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 print:bg-emerald-100 print:text-emerald-800'
                              }`}
                            >
                              {isFake
                                ? '🎭 Red Herring'
                                : `✓ Real Canon${linkedBeat ? ` • Beat ${linkedBeat.beat_number}` : ''}`}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-black text-white print:text-slate-900">
                          {hydratedTitle}
                        </h3>

                        {clue.static_image_url && (
                          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 print:border-slate-200">
                            <img
                              src={clue.static_image_url}
                              alt={hydratedTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {clue.audio_url && (
                          <div className="print:hidden" onClick={(e) => e.stopPropagation()}>
                            <audio
                              controls
                              src={clue.audio_url}
                              className="w-full h-9"
                            />
                          </div>
                        )}

                        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 whitespace-pre-line leading-relaxed print:bg-slate-50 print:border-slate-200 print:text-slate-800">
                          {hydratedDesc.trim() ? (
                            hydratedDesc
                          ) : (
                            <span className="italic text-slate-400 print:text-slate-600">
                              Visual Crime Scene Exhibit — Inspect the photographic evidence above for physical items, locations, and suspect details.
                            </span>
                          )}
                        </div>
                      </div>

                      {includeXRaySpoilers && internalNotes && (
                        <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-[11px] text-sky-200 print:bg-sky-50 print:border-sky-200 print:text-sky-900">
                          <strong>🔬 QA Note:</strong> {internalNotes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* SECTION 4: MASTER REVEAL, TIMELINE & SUBPLOTS (CLICKABLE LINKED CLUES!) */}
        {includeXRaySpoilers && (
          <section id="section-solution" className="space-y-6 print:break-before-page">
            <div className="border-b border-slate-800 pb-4 print:border-slate-300 flex items-end justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 block">
                  Section 04 • Master Solution &amp; Story Architecture
                </span>
                <h2 className="text-2xl font-black text-white print:text-slate-900">
                  The Final Killer Reveal, Chronological Beats &amp; Subplots
                </h2>
              </div>
              <span className="text-xs text-emerald-400 font-bold print:hidden">
                💡 Click any linked clue below to inspect the full clue card &amp; photo
              </span>
            </div>

            <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-6 md:p-8 print:bg-rose-50 print:border-rose-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-3xl">
                <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 print:text-rose-700">
                  🚨 Master Solution
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white print:text-slate-900">
                  🔪 Killer: {killerChar?.displayName || 'Unassigned'} &nbsp;|&nbsp; 🩸 Victim:{' '}
                  {victimChar?.displayName || 'Unassigned'}
                </h3>
                {killerChar?.motives?.[0] && (
                  <p className="text-sm text-rose-100 print:text-rose-950 leading-relaxed">
                    <strong>True Motive:</strong>{' '}
                    {hydrate(
                      killerChar.motives[0].notes || killerChar.motives[0].description || ''
                    )}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {killerChar && getPortraitUrl(killerChar) && (
                  <button
                    type="button"
                    onClick={() =>
                      setActivePortraitModal({
                        url: getPortraitUrl(killerChar)!,
                        title: `🔪 Killer: ${killerChar.displayName}`,
                      })
                    }
                    className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-lg cursor-zoom-in"
                  >
                    <img
                      src={getPortraitUrl(killerChar)!}
                      alt={killerChar.displayName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
                {victimChar && getPortraitUrl(victimChar) && (
                  <button
                    type="button"
                    onClick={() =>
                      setActivePortraitModal({
                        url: getPortraitUrl(victimChar)!,
                        title: `🩸 Victim: ${victimChar.displayName}`,
                      })
                    }
                    className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-pink-500 shadow-lg cursor-zoom-in"
                  >
                    <img
                      src={getPortraitUrl(victimChar)!}
                      alt={victimChar.displayName}
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Main Plot Beats */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400 print:text-emerald-800">
                  ✓ Main Canon Timeline Beats ({plotBeats.length})
                </h3>
                {plotBeats.map((beat: any, idx: number) => {
                  const linked = rawClues.filter((c) => c.linked_plot_beat_id === beat.id);
                  return (
                    <div
                      key={beat.id || idx}
                      className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 print:bg-white print:border-slate-300 print:break-inside-avoid"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 print:text-emerald-700">
                          Beat {beat.beat_number || idx + 1} • {beat.timeline_phase}
                        </span>
                        <h4 className="text-base font-black text-white print:text-slate-900 mt-0.5">
                          {hydrate(beat.event_title)}
                        </h4>
                        <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed mt-1">
                          {hydrate(beat.description)}
                        </p>
                      </div>

                      {linked.length > 0 && (
                        <div className="pt-2.5 border-t border-slate-800 print:border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">
                            🔍 Proved by Clues (Click to View Full Clue):
                          </span>
                          <div className="space-y-1.5">
                            {linked.map((lc) => {
                              const cTitle = hydrate(
                                stripCustomerFacingTitle(lc.title) || lc.title
                              );
                              return (
                                <button
                                  key={lc.id}
                                  type="button"
                                  onClick={() => setActiveClueModal(lc)}
                                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-400/60 flex items-center justify-between gap-3 transition-all cursor-pointer group print:bg-slate-50 print:border-slate-200"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {lc.static_image_url ? (
                                      <img
                                        src={lc.static_image_url}
                                        alt=""
                                        className="w-12 h-9 rounded-lg object-cover shrink-0 border border-slate-700"
                                      />
                                    ) : (
                                      <div className="w-12 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">
                                        🔎
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-white group-hover:text-emerald-300 truncate print:text-slate-900">
                                        R{lc.round_number || 1}: {cTitle}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {hydrate(lc.description || stripFormatTagFromNotes(lc.internal_notes || ''))}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 text-[10px] font-black uppercase shrink-0 print:hidden">
                                    👁️ View Clue
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Red Herring Subplots */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-rose-400 print:text-rose-800">
                  🎭 Double-Duty Red Herring Subplots ({subplots.length})
                </h3>
                {subplots.map((sp: any, idx: number) => {
                  const steps = Array.isArray(sp.subplot_beats || sp.beats)
                    ? sp.subplot_beats || sp.beats
                    : [];
                  return (
                    <div
                      key={sp.id || idx}
                      className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 space-y-3 print:bg-white print:border-slate-300 print:break-inside-avoid"
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-400 print:text-rose-700">
                          Red Herring Arc #{idx + 1}
                        </span>
                        <h4 className="text-base font-black text-white print:text-slate-900 mt-0.5">
                          {hydrate(sp.title)}
                        </h4>
                        <p className="text-xs text-slate-300 print:text-slate-700 leading-relaxed mt-1">
                          {hydrate(sp.description)}
                        </p>
                      </div>

                      {steps.length > 0 && (
                        <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300 print:text-slate-700 pt-1">
                          {steps.map((st: any, sIdx: number) => (
                            <li key={sIdx}>{hydrate(st.description)}</li>
                          ))}
                        </ul>
                      )}

                      {fakeCluesList.length > 0 && (
                        <div className="pt-2.5 border-t border-slate-800 print:border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 block">
                            🎭 Linked Red Herring &amp; Alibi Clues (Click to View Full Clue):
                          </span>
                          <div className="space-y-1.5">
                            {fakeCluesList.map((fc) => {
                              const cTitle = hydrate(
                                stripCustomerFacingTitle(fc.title) || fc.title
                              );
                              return (
                                <button
                                  key={fc.id}
                                  type="button"
                                  onClick={() => setActiveClueModal(fc)}
                                  className="w-full text-left p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-rose-400/60 flex items-center justify-between gap-3 transition-all cursor-pointer group print:bg-slate-50 print:border-slate-200"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    {fc.static_image_url ? (
                                      <img
                                        src={fc.static_image_url}
                                        alt=""
                                        className="w-12 h-9 rounded-lg object-cover shrink-0 border border-slate-700"
                                      />
                                    ) : (
                                      <div className="w-12 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">
                                        🎭
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-white group-hover:text-rose-300 truncate print:text-slate-900">
                                        R{fc.round_number || 1}: {cTitle}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate">
                                        {hydrate(fc.description || stripFormatTagFromNotes(fc.internal_notes || ''))}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 text-[10px] font-black uppercase shrink-0 print:hidden">
                                    👁️ View Clue
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* FULL CLUE LIGHTBOX MODAL */}
      {activeClueModal && (() => {
        const fmt = activeClueModal.format || inferClueFormat(activeClueModal);
        const cTitle = hydrate(
          stripCustomerFacingTitle(activeClueModal.title) || activeClueModal.title
        );
        const cDesc = hydrate(activeClueModal.description || '');
        const isFake =
          activeClueModal.evidence_status === 'fake' ||
          activeClueModal.implication_type === 'red_herring';
        const linkedBeat = plotBeats.find(
          (b: any) => b.id === activeClueModal.linked_plot_beat_id
        );
        const notes = hydrate(
          stripFormatTagFromNotes(activeClueModal.internal_notes || '')
        );

        return (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
            onClick={() => setActiveClueModal(null)}
          >
            <div
              className="relative bg-slate-900 border border-[#FF1493]/50 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setActiveClueModal(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>

              <div className="pr-10 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#FF1493]/20 text-[#FF1493] text-[10px] font-black uppercase">
                    Round {activeClueModal.round_number || 1} • {fmt.replace(/_/g, ' ')}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isFake
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isFake
                      ? '🎭 Red Herring / Subplot'
                      : `✓ Real Canon${linkedBeat ? ` • Beat ${linkedBeat.beat_number}` : ''}`}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">{cTitle}</h3>
              </div>

              {activeClueModal.static_image_url && (
                <div className="w-full rounded-2xl overflow-hidden bg-black border border-slate-800">
                  <img
                    src={activeClueModal.static_image_url}
                    alt={cTitle}
                    className="w-full max-h-[420px] object-cover"
                  />
                </div>
              )}

              {activeClueModal.audio_url && (
                <div>
                  <audio controls src={activeClueModal.audio_url} className="w-full h-10" />
                </div>
              )}

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                {cDesc.trim() ? (
                  cDesc
                ) : (
                  <span className="italic text-slate-400">
                    Visual Crime Scene Exhibit — Inspect the photographic evidence above for physical items, locations, and suspect details.
                  </span>
                )}
              </div>

              {notes && (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200">
                  <strong>🔬 Designer / QA Logic:</strong> {notes}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* FULL CHARACTER PORTRAIT LIGHTBOX MODAL */}
      {activePortraitModal && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          onClick={() => setActivePortraitModal(null)}
        >
          <div
            className="relative bg-slate-900 border border-[#FF1493]/50 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActivePortraitModal(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-black flex items-center justify-center cursor-pointer"
            >
              ✕
            </button>
            <div className="pr-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF1493]">
                Character Costume Portrait
              </span>
              <h3 className="text-xl font-black text-white">{activePortraitModal.title}</h3>
            </div>
            <div className="w-full aspect-square rounded-2xl overflow-hidden bg-black border border-slate-800">
              <img
                src={activePortraitModal.url}
                alt={activePortraitModal.title}
                className="w-full h-full object-cover"
              />
            </div>
            {activePortraitModal.subtitle && (
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong>👗 What to Wear:</strong> {activePortraitModal.subtitle}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
