'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function PageViewDurationTracker() {
  const pathname = usePathname() || '/';
  const activeStartRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const currentPathRef = useRef<string>(pathname);

  useEffect(() => {
    const flushPathDuration = (targetPath: string) => {
      const now = Date.now();
      let totalMs = accumulatedMsRef.current;
      if (activeStartRef.current > 0 && document.visibilityState === 'visible') {
        totalMs += now - activeStartRef.current;
      }
      const durationSeconds = Math.round(totalMs / 1000);
      accumulatedMsRef.current = 0;
      activeStartRef.current = document.visibilityState === 'visible' ? Date.now() : 0;

      if (durationSeconds < 2 || durationSeconds > 1800) return;

      const payload = JSON.stringify({
        path: targetPath,
        durationSeconds,
      });

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
          const blob = new Blob([payload], { type: 'application/json' });
          navigator.sendBeacon('/api/analytics/view-duration', blob);
        } else {
          void fetch('/api/analytics/view-duration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true,
          });
        }
      } catch {
        // ignore network errors
      }
    };

    // If pathname changed, flush previous path's dwell time
    if (currentPathRef.current && currentPathRef.current !== pathname) {
      flushPathDuration(currentPathRef.current);
    }

    currentPathRef.current = pathname;
    accumulatedMsRef.current = 0;
    activeStartRef.current = document.visibilityState === 'visible' ? Date.now() : 0;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (activeStartRef.current > 0) {
          accumulatedMsRef.current += Date.now() - activeStartRef.current;
          activeStartRef.current = 0;
        }
        flushPathDuration(currentPathRef.current);
      } else if (document.visibilityState === 'visible') {
        activeStartRef.current = Date.now();
      }
    };

    const handlePageHide = () => {
      flushPathDuration(currentPathRef.current);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [pathname]);

  return null;
}
