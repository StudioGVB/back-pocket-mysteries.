import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMysteryById } from '@/services/mysteries';
import { getGameSessionAction, generatePinFromMysteryId } from '@/app/actions/customer-mystery';
import { CopyLinkButton } from './_components/CopyLinkButton';
import { HostRoundController } from './_components/HostRoundController';

export default async function CompilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;

  const [mystery, session, pin] = await Promise.all([
    getMysteryById(id),
    getGameSessionAction(id),
    generatePinFromMysteryId(id),
  ]);

  if (!mystery) return notFound();

  const characters = (mystery as any).characters || [];

  const charactersReady =
    characters.length > 0 &&
    characters.every((char: any) => {
      if (!char.profile_data) return false;
      const p = char.profile_data as any;
      if (!p.bio) return false;

      if (char.gender === 'adaptable') {
        return !!(
          p.outfit_image_url ||
          p.standard_character_photo_url ||
          p.presentation_male?.outfit_image_url ||
          p.presentation_female?.outfit_image_url
        );
      }
      return !!(p.outfit_image_url || p.standard_character_photo_url);
    });

  const guestPlayUrl = `/${locale}/play/${id}`;
  const customerCastUrl = `/${locale}/mysteries/${id}/cast`;

  const overviewReady = !!mystery.description && characters.length > 0;
  const cluesReady = mystery.clues && mystery.clues.length > 0;
  const revealReady =
    charactersReady && cluesReady && mystery.plot_beats && mystery.plot_beats.length > 0;

  const packs = [
    {
      title: 'Host Guide & Overview',
      desc: 'Your master script. Contains the full timeline, plot beats, setup instructions, and secrets.',
      icon: '📝',
      href: `/${locale}/builder/mysteries/${id}/compile/print-overview`,
      titleColor: 'text-indigo-600 group-hover:text-indigo-500',
      isReady: overviewReady,
    },
    {
      title: 'Character Pack',
      desc: 'Digital or printable guides for each guest containing their bio, secrets, relationship web, and outfit tips.',
      icon: '👤',
      href: `/${locale}/builder/mysteries/${id}/compile/print-characters`,
      titleColor: 'text-pink-600 group-hover:text-pink-500',
      isReady: charactersReady,
    },
    {
      title: 'Clues Board',
      desc: 'The clue database. Displays all physical and testimony evidence cards as they are unlocked by the host.',
      icon: '🔍',
      href: `/${locale}/builder/mysteries/${id}/compile/print-clues`,
      titleColor: 'text-amber-600 group-hover:text-amber-500',
      isReady: cluesReady,
    },
    {
      title: 'Reveal & Solution',
      desc: 'The final resolution packet. Unlocks the confession letter, true timeline, and host solution monologue.',
      icon: '✉️',
      href: `/${locale}/builder/mysteries/${id}/compile/print-reveal`,
      titleColor: 'text-emerald-600 group-hover:text-emerald-500',
      isReady: revealReady,
    },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[1600px] mx-auto w-full px-12 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">
            Host &amp; Play Control Room
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Access your interactive game packs, Kahoot PIN, and live round voting controls.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={customerCastUrl}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest transition-all"
          >
            👥 Customer Spoiler-Free Cast View →
          </Link>
          <Link
            href={guestPlayUrl}
            target="_blank"
            className="px-4 py-2 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-widest transition-all shadow-md"
          >
            🚀 Open Live Playroom →
          </Link>
        </div>
      </div>

      {/* Top Banner: Real-time Live Director & Invitation Share */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Share Guest Pass & 6-Digit Kahoot PIN */}
        <div className="bg-[#070b13] text-white rounded-[2rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-pink/5 rounded-full blur-3xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <h3 className="text-sm font-black uppercase tracking-tight text-white">
                  Kahoot Lobby &amp; Pass
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-brand-pink/20 text-brand-pink text-[10px] font-black font-mono">
                PIN: {pin.slice(0, 3)} {pin.slice(3)}
              </span>
            </div>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed mb-4">
              Guests can join at <strong>/{locale}/play</strong> with your 6-digit PIN, or click the direct lobby link below.
            </p>
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4 text-center">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                6-Digit Game PIN
              </p>
              <p className="text-3xl font-black text-white tracking-[0.2em] font-mono">
                {pin.slice(0, 3)} {pin.slice(3)}
              </p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-6">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Invite URL
              </p>
              <p className="text-xs font-bold text-brand-pink tracking-tight select-all truncate">
                {guestPlayUrl}
              </p>
            </div>
          </div>
          <CopyLinkButton url={guestPlayUrl} />
        </div>

        {/* Live Game Director Controls */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b pb-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎛️</span>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  Game Director Console (Live Rounds, Vote Tally &amp; Reveal)
                </h3>
                <p className="text-[10px] font-medium text-slate-500">
                  Advance rounds, refresh guest suspect theories, share vote tallies, and control the final reveal.
                </p>
              </div>
            </div>
          </div>
          <HostRoundController
            mysteryId={id}
            currentRound={mystery.current_round ?? 0}
            initialSession={session as any}
            totalPlayers={characters.length || 8}
          />
        </div>
      </div>

      {/* Main Game Packs: The 4 Grid Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packs.map(pack => (
          <a
            key={pack.title}
            href={pack.href}
            target="_blank"
            className="group relative block p-8 rounded-[2rem] border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer"
          >
            {/* Readiness Indicator */}
            <div className="absolute top-6 right-6 flex items-center gap-2">
              {pack.isReady ? (
                <>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Ready
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                </>
              ) : (
                <>
                  <span className="text-[9px] font-black text-red-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Missing Info
                  </span>
                  <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] animate-pulse"></span>
                </>
              )}
            </div>

            <div className="flex flex-col gap-4 items-start">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 bg-slate-50 border border-slate-200/60 text-slate-500 shadow-sm group-hover:scale-105 transition-transform duration-300">
                {pack.icon}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3
                    className={`text-xs font-black uppercase tracking-wider ${pack.titleColor} transition-colors`}
                  >
                    {pack.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 group-hover:translate-x-0.5 transition-transform duration-300">
                    →
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-slate-500 leading-relaxed font-sans">
                  {pack.desc}
                </p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
