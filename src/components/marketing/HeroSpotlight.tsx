'use client';

import React, { useState, useRef, useEffect } from 'react';

export default function HeroSpotlight({ children }: { children: React.ReactNode }) {
  const [lightsOn, setLightsOn] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Use CSS variables for extreme performance, bypassing React renders
    containerRef.current.style.setProperty('--mouse-x', `${x}px`);
    containerRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <section 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative pt-8 pb-12 lg:pt-16 lg:pb-20 overflow-hidden bg-white"
      style={{
        '--mouse-x': '50%',
        '--mouse-y': '50%'
      } as React.CSSProperties}
    >
      {/* Background Dim Overlay with Spotlight */}
      <div 
        className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-700 ${lightsOn ? 'opacity-0' : 'opacity-100'}`}
        style={{
          background: `radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 100%)`
        }}
      />

      {/* Pullable Light Switch */}
      <div className="absolute top-0 right-8 md:right-16 z-40 flex flex-col items-center group origin-top hover:rotate-3 transition-transform duration-300">
        {/* Cord */}
        <div className={`w-1 bg-gradient-to-b from-gray-300 to-gray-600 transition-all duration-500 shadow-sm ${lightsOn ? 'h-12' : 'h-24 group-hover:h-32'}`}></div>
        {/* Knob */}
        <button 
          onClick={() => setLightsOn(!lightsOn)}
          className="w-5 h-10 bg-brand-pink rounded-b-full rounded-t-sm cursor-pointer shadow-xl active:translate-y-4 active:scale-95 transition-transform hover:brightness-110 border-2 border-white/20"
          aria-label="Toggle Lights"
        />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10">
        {children}
      </div>
    </section>
  );
}
