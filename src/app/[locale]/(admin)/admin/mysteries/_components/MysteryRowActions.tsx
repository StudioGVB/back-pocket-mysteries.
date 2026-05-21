'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { archiveMysteryAction, unarchiveMysteryAction, deleteMysteryAction } from '../actions';

interface MysteryRowActionsProps {
  id: string;
  status: string;
  locale: string;
}

export function MysteryRowActions({ id, status, locale }: MysteryRowActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isArchived = status === 'archived';

  const handleArchive = () => {
    setError(null);
    startTransition(async () => {
      const res = await archiveMysteryAction(id);
      if (!res.success) {
        setError(res.error || 'Failed to archive mystery base');
      }
    });
  };

  const handleRestore = () => {
    setError(null);
    startTransition(async () => {
      const res = await unarchiveMysteryAction(id);
      if (!res.success) {
        setError(res.error || 'Failed to restore mystery base');
      }
    });
  };

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const res = await deleteMysteryAction(id);
      if (!res.success) {
        setError(res.error || 'Failed to delete mystery base');
        setShowConfirmDelete(false);
      }
    });
  };

  if (showConfirmDelete) {
    return (
      <div className="flex items-center space-x-3 text-xs font-black uppercase tracking-widest">
        <span className="text-red-500 font-bold normal-case">Delete permanently?</span>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Deleting...' : 'Yes, Delete'}
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={() => setShowConfirmDelete(false)}
          disabled={isPending}
          className="text-gray-400 hover:text-gray-600 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center space-x-4 text-xs font-black uppercase tracking-widest">
        <Link 
          href={`/${locale}/builder/mysteries/${id}`}
          className="text-brand-pink hover:text-pink-700 hover:underline transition-colors"
        >
          Edit
        </Link>
        <span className="text-gray-200">|</span>
        
        {isArchived ? (
          <button
            onClick={handleRestore}
            disabled={isPending}
            className="text-green-600 hover:text-green-800 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Restoring...' : 'Restore'}
          </button>
        ) : (
          <button
            onClick={handleArchive}
            disabled={isPending}
            className="text-gray-400 hover:text-brand-dark disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Archiving...' : 'Archive'}
          </button>
        )}

        <span className="text-gray-200">|</span>
        
        <button
          onClick={() => setShowConfirmDelete(true)}
          disabled={isPending}
          className="text-red-400 hover:text-red-600 disabled:opacity-50 transition-colors"
        >
          Delete
        </button>
      </div>
      
      {error && (
        <p className="text-[10px] text-red-500 font-bold normal-case mt-1">{error}</p>
      )}
    </div>
  );
}
