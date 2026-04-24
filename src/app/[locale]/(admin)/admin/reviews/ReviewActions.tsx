'use client';

import React, { useState } from 'react';
import { toggleReviewStatus } from '@/app/actions/reviews';
import { useRouter } from 'next/navigation';

export function ReviewActions({ review }: { review: any }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await toggleReviewStatus(review.id, review.status);
      router.refresh();
    } catch (error) {
      console.error('Error toggling review status', error);
    } finally {
      setLoading(false);
    }
  };

  const isPublished = review.status === 'published';

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${
        isPublished 
          ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' 
          : 'bg-brand-pink text-white hover:bg-brand-dark'
      } disabled:opacity-50`}
    >
      {loading ? '...' : isPublished ? 'Unpublish' : 'Publish'}
    </button>
  );
}
