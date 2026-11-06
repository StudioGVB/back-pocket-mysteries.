'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { finishMysteryGenerationNowAction } from '@/app/actions/customer-mystery';

export default function FinishGenerationButton({
  mysteryId,
  slug,
  mysteryTitle,
  pin,
  locale,
}: {
  mysteryId: string;
  slug?: string;
  mysteryTitle: string;
  pin?: string;
  locale: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      await finishMysteryGenerationNowAction({
        mysteryId,
        slug: slug || mysteryId,
        mysteryTitle,
        pin,
        locale,
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      disabled={loading}
      onClick={handleFinish}
      className="px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
    >
      {loading ? 'Finishing & Sending Email...' : '⚡ Finish Now (Skip 20m Wait)'}
    </button>
  );
}
