'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveMysteryAction, unarchiveMysteryAction, deleteMysteryAction } from '../actions';
import { formatDate } from '@/utils/date';

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
  const [error, setError] = useState<string | null>(null);

  const isArchived = mystery.status === 'archived';
  const hasImage = !!mystery.image_url;

  const handleCardClick = (e: React.MouseEvent) => {
    // Avoid navigation if clicking any action buttons or links
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
        return 'text-green-400 border-green-500/20 bg-green-950/60';
      case 'archived':
        return 'text-amber-400 border-amber-500/20 bg-amber-950/60';
      default: // draft
        return 'text-slate-400 border-slate-500/20 bg-slate-950/60';
    }
  };

  return (
    <div 
      onClick={handleCardClick}
      className={`bg-black rounded-[2.5rem] border border-neutral-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden text-white ${
        isArchived ? 'opacity-75 grayscale-[20%] brightness-90' : ''
      }`}
    >
      {/* 1. Cover Image Section */}
      <div className="relative w-full aspect-video bg-neutral-950 overflow-hidden">
        {hasImage ? (
          <img 
            src={mystery.image_url!} 
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

        {/* Player Count Badge (Top Right) */}
        <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 border border-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-slate-300 z-20">
          👤 {mystery.min_players === mystery.max_players ? `${mystery.min_players} Players` : `${mystery.min_players}-${mystery.max_players} Players`}
        </div>

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
            <div className="flex items-center space-x-4 text-xs font-black uppercase tracking-widest w-full justify-between">
              <div className="flex items-center space-x-3">
                <a 
                  href={`/${locale}/builder/mysteries/${mystery.id}`}
                  className="text-brand-pink hover:text-pink-500 transition-colors"
                >
                  Edit
                </a>
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
  );
}
