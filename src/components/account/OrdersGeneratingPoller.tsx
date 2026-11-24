'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getMysteryGenerationStatusAction } from '@/app/actions/customer-mystery';

export default function OrdersGeneratingPoller({
  hasGeneratingStories,
  generatingStories = [],
  locale = 'en',
}: {
  hasGeneratingStories: boolean;
  generatingStories?: Array<{ id: string; title: string }>;
  locale?: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!hasGeneratingStories) return;
    let active = true;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (!active) return;
      try {
        for (const story of generatingStories) {
          if (!active) break;
          await getMysteryGenerationStatusAction({
            mysteryId: story.id,
            slug: story.id,
            mysteryTitle: story.title,
            locale,
            advanceStep: true,
          });
        }
      } catch {
        // ignore transient errors
      }
      if (active) {
        router.refresh();
        timerId = setTimeout(tick, 4000);
      }
    };

    timerId = setTimeout(tick, 1500);
    return () => {
      active = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [hasGeneratingStories, generatingStories, locale, router]);

  return null;
}
