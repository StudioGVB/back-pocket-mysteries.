'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveMysteryAction, unarchiveMysteryAction, deleteMysteryAction } from '../actions';
import { formatDate } from '@/utils/date';
import { parseMysteryImageField } from '@/utils/moodboard';
import { MoodboardStudio } from '@/components/admin/MoodboardStudio';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';

interface MysteryCardProps {
  mystery: {
    id: string;
    title: string;
    theme: string | null;
    status: string;
    description: string | null;
    image_url: string | null;
    created_at: string | null;
    min_players: number;
    max_players: number;
  };
  locale: string;
}

export function MysteryCard({ mystery, locale }: MysteryCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isMoodboardOpen, setIsMoodboardOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(mystery.image_url);
  const [error, setError] = useState<string | null>(null);

  const parsedImages = parseMysteryImageField(rawImageUrl);
  const isArchived = mystery.status === 'archived';
  const hasImage = !!parsedImages.coverUrl;
  const moodCount = parsedImages.moodboardPhotos.length;
  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) return;
    router.push(`/${locale}/builder/mysteries/${mystery.id}`);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const res = await archiveMysteryAction(mystery.id);
      if (!res.success) {
        setError(res.error || 'Failed to archive mystery base');
      }
    });
  };

  const handleRestore = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const res = await unarchiveMysteryAction(mystery.id);
      if (!res.success) {
        setError(res.error || 'Failed to restore mystery base');
      }
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setError(null);
    startTransition(async () => {
      const res = await deleteMysteryAction(mystery.id);
      if (!res.success) {
        setError(res.error || 'Failed to delete mystery base');
        setShowConfirmDelete(false);
      }
    });
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'published':
        return 'text-emerald-300 border-emerald-400/40 bg-emerald-950/75 shadow-[0_0_12px_rgba(34,197,94,0.4)]';
      case 'archived':
        return 'text-slate-400 border-slate-500/20 bg-slate-950/60';
      default:
        return 'text-yellow-300 border-yellow-400/40 bg-yellow-950/75 shadow-[0_0_12px_rgba(250,204,21,0.4)]';
    }
  };

  const getCardGlowStyle = (status: string) => {
    switch (status) {
      case 'published':
        return 'border-emerald-500/60 ring-2 ring-emerald-400/35 shadow-[0_0_28px_4px_rgba(34,197,94,0.35)] hover:shadow-[0_0_38px_8px_rgba(34,197,94,0.5)]';
      case 'archived':
        return 'border-neutral-800 shadow-xl hover:shadow-2xl opacity-75 grayscale-[20%] brightness-90';
      default:
        return 'border-yellow-400/65 ring-2 ring-yellow-400/40 shadow-[0_0_28px_4px_rgba(250,204,21,0.4)] hover:shadow-[0_0_38px_8px_rgba(250,204,21,0.55)]';
    }
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className={`bg-black rounded-[2.5rem] border hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden text-white ${getCardGlowStyle(mystery.status)}`}
      >
        {/* 1. Cover Image Section */}
        <div className="relative w-full aspect-video bg-neutral-950 overflow-hidden">
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img 
              src={parsedImages.coverUrl!} 
              alt={mystery.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-neutral-900 to-neutral-950 flex flex-col items-center justify-center p-6 text-center select-none">
              <span className="text-3xl mb-2 opacity-40">🔎</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">No cover image</span>
            </div>
          )}

          {/* Status Badge (Top Left) */}
          <div className={`absolute top-4 left-4 px-3 py-1 border backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest z-20 ${getStatusStyle(mystery.status)}`}>
            {mystery.status}
          </div>

          {/* Package & Player Count Badge (Top Right) */}
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 border border-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-300 z-20">
            📦 {pkgInfo.label} • {pkgInfo.rangeLabel}
          </div>

          {/* Moodboard Photo Strip / Quick Button on Cover */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMoodboardOpen(true);
            }}
            className="absolute bottom-3 right-4 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-brand-pink text-white border border-white/15 backdrop-blur-md text-[10px] font-black uppercase tracking-widest z-20 flex items-center gap-1.5 transition-colors shadow-lg"
          >
            <span>📸</span>
            <span>{moodCount > 0 ? `Mood Board (${moodCount})` : '+ Mood Board'}</span>
          </button>

          {/* Fade-to-Black Gradient Overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/85 to-transparent pointer-events-none z-10" />
        </div>

        {/* 2. Text Content Area */}
        <div className="flex-grow flex flex-col p-6 pt-3 bg-black z-10 relative">
          {/* Theme Metadata */}
          <div className="text-[10px] font-black uppercase tracking-widest text-brand-pink mb-1">
            ✦ {mystery.theme || 'No theme'}
          </div>

          {/* Mystery Title */}
          <h3 className="text-lg font-black text-white mb-1.5 leading-tight group-hover:text-brand-pink transition-colors">
            {mystery.title}
          </h3>

          {/* Creation Date */}
          <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-4">
            Created {formatDate(mystery.created_at)}
          </div>

          {/* Description / Synopsis */}
          <p className="text-xs font-semibold text-slate-400 leading-relaxed mb-6 flex-grow line-clamp-3">
            {mystery.description || 'No description seeded yet. Deep-dive into the builder studio to begin crafting this mystery.'}
          </p>

          {/* Footer Actions */}
          <div className="flex justify-between items-center mt-auto pt-4 border-t border-neutral-900">
            {showConfirmDelete ? (
              <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest w-full justify-between">
                <span className="text-red-500 font-bold normal-case text-[10px]">Delete permanently?</span>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50 transition-colors"
                  >
                    {isPending ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                  <span className="text-neutral-800">|</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(false); }}
                    disabled={isPending}
                    className="text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest w-full justify-between">
                <div className="flex items-center space-x-3">
                  <a 
                    href={`/${locale}/builder/mysteries/${mystery.id}`}
                    className="text-brand-pink hover:text-pink-500 transition-colors"
                  >
                    Edit
                  </a>
                  <span className="text-neutral-800">|</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsMoodboardOpen(true);
                    }}
                    className="text-slate-300 hover:text-white transition-colors"
                  >
                    Photos ({moodCount})
                  </button>
                  <span className="text-neutral-800">|</span>
                  {isArchived ? (
                    <button
                      onClick={handleRestore}
                      disabled={isPending}
                      className="text-green-500 hover:text-green-400 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Restoring...' : 'Restore'}
                    </button>
                  ) : (
                    <button
                      onClick={handleArchive}
                      disabled={isPending}
                      className="text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-colors"
                    >
                      {isPending ? 'Archiving...' : 'Archive'}
                    </button>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowConfirmDelete(true); }}
                  disabled={isPending}
                  className="text-red-500/80 hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[10px] text-red-500 font-bold normal-case mt-2">{error}</p>
          )}
        </div>
      </div>

      {/* Mood Board Uploader Modal directly in Admin */}
      {isMoodboardOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={() => setIsMoodboardOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[92vh] overflow-y-auto bg-slate-50 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-pink">
                  Admin Mood Board Studio
                </p>
                <h2 className="text-2xl font-black text-slate-900">
                  {mystery.title} - Vibe &amp; Mood Board Photos
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMoodboardOpen(false)}
                className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center font-black transition-colors"
              >
                ✕
              </button>
            </div>

            <MoodboardStudio
              mysteryId={mystery.id}
              mysteryTitle={mystery.title}
              theme={mystery.theme}
              initialImageUrl={rawImageUrl}
              onUpdated={(nextSerialized) => setRawImageUrl(nextSerialized)}
            />
          </div>
        </div>
      )}
    </>
  );
}
