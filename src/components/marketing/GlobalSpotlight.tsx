'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function GlobalSpotlight() {
  const [lightsOn, setLightsOn] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (overlayRef.current && !lightsOn) {
        overlayRef.current.style.setProperty('--mouse-x', `${e.clientX}px`);
        overlayRef.current.style.setProperty('--mouse-y', `${e.clientY}px`);
      }
    };

    if (!lightsOn) {
      window.addEventListener('mousemove', handleMouseMove);
    }
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [lightsOn]);

  return (
    <>
      {/* Dark Overlay */}
      <div 
        ref={overlayRef}
        className={`fixed inset-0 z-[100] pointer-events-none transition-opacity duration-700 ${lightsOn ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: `radial-gradient(400px circle at var(--mouse-x, 50vw) var(--mouse-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.85) 100%)`
        }}
      />
      
      {/* Pull cord - fixed positioning dangling from top right */}
      <button 
        onClick={() => setLightsOn(prev => !prev)}
        className="fixed top-16 right-8 md:right-16 z-[9999] flex flex-col items-center group origin-top hover:rotate-3 transition-transform duration-300 cursor-pointer pointer-events-auto outline-none"
        aria-label="Toggle Lights"
      >
        {/* Cord */}
        <div className={`w-1 bg-gradient-to-b from-gray-300 to-gray-600 transition-all duration-500 shadow-sm pointer-events-none ${lightsOn ? 'h-12' : 'h-24 group-hover:h-32'}`}></div>
        {/* Knob */}
        <div 
          className="w-5 h-10 bg-brand-pink rounded-b-full rounded-t-sm shadow-xl group-active:translate-y-4 group-active:scale-95 transition-transform group-hover:brightness-110 border-2 border-white/20 pointer-events-none"
        />
      </button>
    </>
  );
}
