'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OrdersGeneratingPoller({
  hasGeneratingStories,
}: {
  hasGeneratingStories: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasGeneratingStories) return;
    const interval = setInterval(() => {
      router.refresh();
    }, 15000);
    return () => clearInterval(interval);
  }, [hasGeneratingStories, router]);

  return null;
}
