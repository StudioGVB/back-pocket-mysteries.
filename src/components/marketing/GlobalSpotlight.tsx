'use client';
import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function GlobalSpotlight() {
  const pathname = usePathname();
  const isHomePage = pathname === '/en' || pathname === '/fr' || pathname === '/' || pathname === '';

  // Start dark on homepage from frame 0 so desktop never flashes bright->dark on hydration.
  // On mobile (<768px), CSS `hidden md:block` hides the overlay immediately from frame 0.
  const [lightsOn, setLightsOn] = useState(!isHomePage);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncViewportAndState = () => {
      const isDesktop = window.innerWidth >= 768;
      if (!isDesktop && !lightsOn) {
        setLightsOn(true);
        return;
      }
      const isDarkActive = isDesktop && !lightsOn && isHomePage;
      document.documentElement.dataset.lightsOff = isDarkActive ? 'true' : 'false';
      window.dispatchEvent(
        new CustomEvent('bpm:lights-change', { detail: { lightsOff: isDarkActive } })
      );
    };

    syncViewportAndState();
    window.addEventListener('resize', syncViewportAndState);
    return () => window.removeEventListener('resize', syncViewportAndState);
  }, [lightsOn, isHomePage]);

  useEffect(() => {
    if (lightsOn) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
        overlayRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [lightsOn]);

  useEffect(() => {
    if (lightsOn) return;

    const timer = setTimeout(() => {
      setLightsOn(true);
    }, 15000);

    return () => clearTimeout(timer);
  }, [lightsOn]);

  return (
    <>
      {/* Desktop-Only Dark Overlay (hidden on mobile from SSR frame 0 via `hidden md:block`) */}
      <div
        ref={overlayRef}
        className={`hidden md:block fixed inset-0 z-[100] pointer-events-none transition-opacity duration-700 ${
          lightsOn ? 'opacity-0' : 'opacity-100'
        }`}
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)`,
        }}
      />

      {!lightsOn && isHomePage && (
        <div className="hidden md:block fixed bottom-10 left-0 right-0 z-[101] text-center pointer-events-none opacity-50">
          <p className="text-white font-bold tracking-widest uppercase">
            Move your mouse to search in the dark
          </p>
        </div>
      )}

      {/* Desktop-Only Pull Cord Container (z-[110] so it sits behind modals at z-[200]) */}
      <div className="hidden md:flex fixed top-16 right-8 md:right-16 z-[110] items-start gap-4 pointer-events-none">
        {/* Helper Text */}
        {!lightsOn && isHomePage && (
          <div className="mt-8 flex items-center gap-3 text-white/90 font-medium tracking-[0.2em] uppercase text-sm pointer-events-none">
            <span>Turn on the light</span>
            <span className="text-2xl animate-pulse">→</span>
          </div>
        )}

        {/* Pull cord button */}
        <button
          onClick={() => setLightsOn((prev) => !prev)}
          className="flex flex-col items-center group origin-top hover:rotate-3 transition-transform duration-300 cursor-pointer pointer-events-auto outline-none"
          aria-label="Toggle Lights"
        >
          {/* Cord */}
          <div
            className={`w-1 bg-gradient-to-b from-gray-300 to-gray-600 transition-all duration-500 shadow-sm pointer-events-none ${
              lightsOn ? 'h-12' : 'h-24 group-hover:h-32'
            }`}
          />
          {/* Knob */}
          <div className="w-5 h-10 bg-brand-pink rounded-b-full rounded-t-sm shadow-xl group-active:translate-y-4 group-active:scale-95 transition-transform group-hover:brightness-110 border-2 border-white/20 pointer-events-none" />
        </button>
      </div>
    </>
  );
}


