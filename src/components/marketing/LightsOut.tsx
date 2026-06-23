'use client';

import React, { useState, useEffect } from 'react';

export default function LightsOut() {
  const [lightsOn, setLightsOn] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Start with the mouse roughly in the middle top (where the text is)
    setMousePos({ x: window.innerWidth / 3, y: window.innerHeight / 3 });

    const handleMouseMove = (e: MouseEvent) => {
      if (!lightsOn) {
        setMousePos({ x: e.clientX, y: e.clientY });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [lightsOn]);

  if (lightsOn) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] overflow-hidden pointer-events-none transition-opacity duration-1000 ease-in-out"
      style={{
        background: `radial-gradient(circle 300px at ${mousePos.x}px ${mousePos.y}px, transparent 0%, rgba(0, 0, 0, 0.8) 80%, rgba(0, 0, 0, 0.95) 100%)`
      }}
    >
      <div className="absolute top-8 right-8 pointer-events-auto">
        <button 
          onClick={() => setLightsOn(true)}
          className="group flex items-center gap-3 bg-brand-dark text-white px-6 py-3 rounded-full font-black uppercase tracking-widest hover:bg-brand-pink transition-colors shadow-2xl border-2 border-white/10"
        >
          <span className="text-xl">💡</span>
          Turn Lights On
        </button>
      </div>
      
      <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none opacity-50">
        <p className="text-white font-bold tracking-widest uppercase">Move your mouse to search in the dark</p>
      </div>
    </div>
  );
}
