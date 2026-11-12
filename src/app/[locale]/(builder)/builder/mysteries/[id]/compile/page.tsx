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
  const clues = (mystery as any).clues || [];
  const plotBeats = (mystery as any).plot_beats || [];

  const charactersReady =
    characters.length > 0 &&
    characters.every((char: any) => {
      if (!char.profile_data) return false;
      const p = char.profile_data as any;
      if (!p.bio) return false;

      const hasBaseRefImgs =
        Array.isArray(p.outfit_reference_images) && p.outfit_reference_images.filter(Boolean).length >= 3;

      if (char.gender === 'adaptable') {
        const hasMaleRefImgs =
          Array.isArray(p.presentation_male?.outfit_reference_images) &&
          p.presentation_male.outfit_reference_images.filter(Boolean).length >= 3;
        const hasFemaleRefImgs =
          Array.isArray(p.presentation_female?.outfit_reference_images) &&
          p.presentation_female.outfit_reference_images.filter(Boolean).length >= 3;
        return !!(
          hasBaseRefImgs ||
          (hasMaleRefImgs && hasFemaleRefImgs) ||
          p.outfit_image_url ||
          p.standard_character_photo_url ||
          p.presentation_male?.outfit_image_url ||
          p.presentation_female?.outfit_image_url
        );
      }
      return !!(hasBaseRefImgs || p.outfit_image_url || p.standard_character_photo_url);
    });

  const guestPlayUrl = `/${locale}/play/${id}`;
  const customerCastUrl = `/${locale}/mysteries/${id}/cast`;

  const overviewReady = !!mystery.description && characters.length > 0;
  const cluesReady = clues.length > 0;
  const revealReady = charactersReady && cluesReady && plotBeats.length > 0;

  const readinessItems = [
    {
      label: 'Story & Setting',
      detail: mystery.theme || 'Theme configured',
      ready: overviewReady,
      editHref: `/${locale}/builder/mysteries/${id}`,
    },
    {
      label: 'Digital Cast & Avatars',
      detail: `${characters.length} character roles`,
      ready: charactersReady,
      editHref: `/${locale}/builder/mysteries/${id}/characters`,
    },
    {
      label: 'Interactive Phone Clues',
      detail: `${clues.length} digital clues`,
      ready: cluesReady,
      editHref: `/${locale}/builder/mysteries/${id}/clues`,
    },
    {
      label: 'Timeline & Final Reveal',
      detail: `${plotBeats.length} plot beats`,
      ready: revealReady,
      editHref: `/${locale}/builder/mysteries/${id}/timeline`,
    },
  ];

  const backupPrintables = [
    {
      title: 'Host Script PDF',
      href: `/${locale}/builder/mysteries/${id}/compile/print-overview`,
      ready: overviewReady,
    },
    {
      title: 'Character Sheets PDF',
      href: `/${locale}/builder/mysteries/${id}/compile/print-characters`,
      ready: charactersReady,
    },
    {
      title: 'Evidence Cards PDF',
      href: `/${locale}/builder/mysteries/${id}/compile/print-clues`,
      ready: cluesReady,
    },
    {
      title: 'Final Solution PDF',
      href: `/${locale}/builder/mysteries/${id}/compile/print-reveal`,
      ready: revealReady,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest mb-2">
            <span>📱 Digital-First Experience</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Live Playroom &amp; Host Control
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            Test and run the live mobile playroom, share the 6-digit Kahoot Game PIN, and control rounds in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={customerCastUrl}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider transition-all"
          >
            👥 Guest Casting &amp; Invites →
          </Link>
          <Link
            href={guestPlayUrl}
            target="_blank"
            className="px-5 py-2.5 rounded-xl bg-brand-pink hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-brand-pink/20"
          >
            🚀 Launch Live Playroom ↗
          </Link>
        </div>
      </div>

      {/* 1. Digital Readiness Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {readinessItems.map((item) => (
          <Link
            key={item.label}
            href={item.editHref}
            className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-slate-300 shadow-xs flex items-center justify-between gap-3 transition-all group"
          >
            <div>
              <p className="text-xs font-black text-slate-900 group-hover:text-brand-pink transition-colors">
                {item.label}
              </p>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">{item.detail}</p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                item.ready
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {item.ready ? '✓ Ready' : 'Incomplete'}
            </span>
          </Link>
        ))}
      </div>

      {/* 2. Primary Digital Experience: Mobile Lobby PIN + Live Game Director Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Left: 6-Digit Kahoot PIN & Guest Mobile Join */}
        <div className="bg-brand-dark text-white rounded-3xl p-7 border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className="text-xs font-black uppercase tracking-widest text-brand-pink">
                Mobile Game Lobby
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                Live on Phones
              </span>
            </div>

            <div className="p-5 bg-white/[0.04] rounded-2xl border border-white/10 mb-4 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                6-Digit Game PIN
              </p>
              <p className="text-4xl font-black text-white tracking-[0.22em] font-mono">
                {pin.slice(0, 3)} {pin.slice(3)}
              </p>
              <p className="text-[11px] font-medium text-slate-400 mt-2">
                Guests join at <strong className="text-white">/{locale}/play</strong> or via direct link
              </p>
            </div>

            <div className="p-3.5 bg-white/[0.03] rounded-xl border border-white/10 mb-5">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Direct Mobile Lobby Link
              </p>
              <p className="text-xs font-bold text-brand-pink tracking-tight select-all truncate">
                {guestPlayUrl}
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            <CopyLinkButton url={guestPlayUrl} />
            <Link
              href={guestPlayUrl}
              target="_blank"
              className="block w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-center text-xs font-black uppercase tracking-widest transition-all"
            >
              Open Player Screen ↗
            </Link>
          </div>
        </div>

        {/* Right 2 Cols: Live Round & Voting Director */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-7 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-pink block mb-0.5">
                Real-Time Party Sync
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Live Round &amp; Voting Director
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Advance rounds on every guest&apos;s phone simultaneously, monitor suspect theories, and trigger the final reveal.
              </p>
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

      {/* 3. Optional Backup Printables (Secondary Compact Strip) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Optional Paper Backups (PDF / Print)
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              • Secondary to the digital mobile playroom
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Need physical handouts for a low-tech table? Open any printable packet below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {backupPrintables.map((item) => (
            <a
              key={item.title}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-all flex items-center gap-1.5"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  item.ready ? 'bg-emerald-500' : 'bg-amber-400'
                }`}
              />
              <span>{item.title}</span>
              <span className="text-slate-400 text-[10px]">↗</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
