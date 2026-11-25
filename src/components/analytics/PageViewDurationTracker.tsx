'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Analytics } from '@vercel/analytics/react';
import { createClient } from '@/utils/supabase/client';

export const OWNER_ANALYTICS_STORAGE_KEY = 'bpm_owner_exclude_analytics';
export const OWNER_ANALYTICS_COOKIE_NAME = 'bpm_owner_exclude';

const OWNER_EMAILS = new Set(['g.v.blyth@gmail.com']);

export function isOwnerAnalyticsExcluded(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.localStorage.getItem(OWNER_ANALYTICS_STORAGE_KEY) === '1') {
      return true;
    }
    if (typeof document !== 'undefined' && document.cookie.includes(`${OWNER_ANALYTICS_COOKIE_NAME}=1`)) {
      return true;
    }
  } catch {
    // ignore storage errors
  }
  return false;
}

export function setOwnerAnalyticsExcluded(excluded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-VW0PRLFNL4';
    if (excluded) {
      window.localStorage.setItem(OWNER_ANALYTICS_STORAGE_KEY, '1');
      document.cookie = `${OWNER_ANALYTICS_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
      if (gaId) {
        (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
      }
    } else {
      window.localStorage.removeItem(OWNER_ANALYTICS_STORAGE_KEY);
      document.cookie = `${OWNER_ANALYTICS_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
      if (gaId) {
        (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = false;
      }
    }
    window.dispatchEvent(new CustomEvent('bpm-owner-analytics-changed'));
  } catch {
    // ignore storage errors
  }
}

export function PageViewDurationTracker() {
  const pathname = usePathname() || '/';
  const activeStartRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const currentPathRef = useRef<string>(pathname);

  // Force browser tabs (Chrome/Safari) to drop any stale cached cards favicon and repaint the new magnifying glass favicon immediately
  useEffect(() => {
    try {
      const head = document.head;
      if (!head) return;
      const existingIcons = head.querySelectorAll('link[rel*="icon"]');
      existingIcons.forEach((el) => {
        const href = el.getAttribute('href') || '';
        if (!href.includes('favicon-v3') && !href.includes('apple-touch-icon-v3')) {
          el.parentNode?.removeChild(el);
        }
      });
      let primaryIcon = head.querySelector('link#bpm-live-favicon') as HTMLLinkElement | null;
      if (!primaryIcon) {
        primaryIcon = document.createElement('link');
        primaryIcon.id = 'bpm-live-favicon';
        primaryIcon.rel = 'icon';
        primaryIcon.type = 'image/png';
        primaryIcon.sizes = '48x48';
        primaryIcon.href = '/favicon-v3-48x48.png?v=4';
        head.appendChild(primaryIcon);
      }
    } catch {
      // ignore DOM errors
    }
  }, [pathname]);

  // Auto-detect owner device via URL query (?exclude_me=1), /admin or /builder route, or signed-in owner email
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('exclude_me') === '1') {
        setOwnerAnalyticsExcluded(true);
      } else if (sp.get('exclude_me') === '0') {
        setOwnerAnalyticsExcluded(false);
        return;
      }

      if (/^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(pathname)) {
        setOwnerAnalyticsExcluded(true);
      }

      if (isOwnerAnalyticsExcluded()) {
        const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-VW0PRLFNL4';
        if (gaId) {
          (window as unknown as Record<string, unknown>)[`ga-disable-${gaId}`] = true;
        }
        return;
      }

      // Also check once if logged into Supabase as owner/admin
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => {
        const email = data?.user?.email?.toLowerCase()?.trim();
        const role = data?.user?.user_metadata?.role;
        if ((email && OWNER_EMAILS.has(email)) || role === 'admin' || role === 'super_admin') {
          setOwnerAnalyticsExcluded(true);
        }
      });
    } catch {
      // ignore
    }
  }, [pathname]);

  useEffect(() => {
    const flushPathDuration = (targetPath: string) => {
      // Never record view durations for excluded owner devices or admin/builder pages
      if (
        isOwnerAnalyticsExcluded() ||
        /^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(targetPath)
      ) {
        accumulatedMsRef.current = 0;
        activeStartRef.current = document.visibilityState === 'visible' ? Date.now() : 0;
        return;
      }

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

  // Real-time live presence heartbeat (every 25s while tab is visible) for the Admin Global Map & Live People stream
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      isOwnerAnalyticsExcluded() ||
      /^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(pathname)
    ) {
      return;
    }

    let sessionId = '';
    try {
      sessionId = window.sessionStorage.getItem('bpm_visitor_sid') || '';
      if (!sessionId) {
        sessionId = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
        window.sessionStorage.setItem('bpm_visitor_sid', sessionId);
      }
    } catch {
      sessionId = `v_${Math.random().toString(36).slice(2, 10)}`;
    }

    const detectDevice = (): 'mobile' | 'tablet' | 'desktop' => {
      const ua = navigator.userAgent || '';
      if (/ipad|tablet|playbook|silk/i.test(ua)) return 'tablet';
      if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) return 'mobile';
      return 'desktop';
    };

    const sendHeartbeat = () => {
      if (document.visibilityState !== 'visible' || isOwnerAnalyticsExcluded()) return;
      void fetch('/api/analytics/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          path: pathname + (window.location.search || ''),
          device: detectDevice(),
          referrer: document.referrer || '',
        }),
        keepalive: true,
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 25000);
    return () => window.clearInterval(interval);
  }, [pathname]);

  return (
    <Analytics
      beforeSend={(event) => {
        if (isOwnerAnalyticsExcluded()) {
          return null;
        }
        try {
          const url = new URL(event.url);
          if (/^\/(en|es|fr|de|it)?\/?(admin|builder)(\/|$)/.test(url.pathname)) {
            return null;
          }
        } catch {
          // ignore
        }
        return event;
      }}
    />
  );
}

export function OwnerDeviceExclusionBanner() {
  const [excluded, setExcluded] = useState<boolean>(true);
  const [copiedPhoneLink, setCopiedPhoneLink] = useState<boolean>(false);

  useEffect(() => {
    // Visiting /admin/analytics automatically marks this device as excluded unless explicitly toggled off
    setExcluded(isOwnerAnalyticsExcluded());
    const sync = () => setExcluded(isOwnerAnalyticsExcluded());
    window.addEventListener('bpm-owner-analytics-changed', sync);
    return () => window.removeEventListener('bpm-owner-analytics-changed', sync);
  }, []);

  const handleToggle = () => {
    const next = !excluded;
    setOwnerAnalyticsExcluded(next);
    setExcluded(next);
  };

  const handleCopyPhoneLink = async () => {
    const link = 'https://backpocketmysteries.com/?exclude_me=1';
    try {
      await navigator.clipboard.writeText(link);
      setCopiedPhoneLink(true);
      setTimeout(() => setCopiedPhoneLink(false), 3000);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
        excluded
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : 'bg-amber-50 border-amber-200 text-amber-950'
      }`}
    >
      <div className="flex items-start sm:items-center gap-3">
        <span className="text-lg leading-none mt-0.5 sm:mt-0">
          {excluded ? '🛡️' : '⚠️'}
        </span>
        <div>
          <div className="text-xs font-black uppercase tracking-wider">
            {excluded
              ? 'This Device is Excluded from Analytics (GA4 + Vercel + Internal)'
              : 'Owner Analytics Exclusion is Paused on This Device'}
          </div>
          <p className="text-[11px] font-medium opacity-80 mt-0.5">
            {excluded
              ? 'Your visits on this browser will never inflate your Google Analytics, Vercel Web Analytics, or page dwell times—even on 5G or logged out.'
              : 'Your page views on this browser are currently being counted. Click "Exclude This Device" to hide your own visits.'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleCopyPhoneLink}
          title="Open this link once on your phone's Safari/Chrome to permanently exclude your phone without even logging in"
          className="px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
        >
          {copiedPhoneLink ? '✓ Copied Phone Opt-Out Link!' : '📱 Copy Phone Opt-Out Link'}
        </button>

        <button
          type="button"
          onClick={handleToggle}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all cursor-pointer ${
            excluded
              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              : 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800'
          }`}
        >
          {excluded ? '✓ Device Excluded' : 'Exclude This Device'}
        </button>
      </div>
    </div>
  );
}

