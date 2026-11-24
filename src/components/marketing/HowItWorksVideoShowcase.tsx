'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const VIDEO_SRC = '/videos/back-pocket-mysteries-what-it-is-16x9.mp4?v=2';
const VIDEO_DURATION = '1:17';

export default function HowItWorksVideoShowcase() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleTogglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  return (
    <div className="mt-10 lg:mt-12">
      <div className="relative mx-auto w-full aspect-video rounded-[2rem] border-2 border-brand-dark bg-brand-dark shadow-[10px_10px_0px_#fe04c6] overflow-hidden">
        <video
          ref={videoRef}
          src={`${VIDEO_SRC}#t=0.5`}
          playsInline
          controls={isPlaying}
          preload="metadata"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain bg-brand-dark"
        />

        {/* Center Play Overlay when Paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="Play How It Works video"
            className="absolute inset-0 flex flex-col items-center justify-center bg-brand-dark/30 hover:bg-brand-dark/15 transition-colors group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-brand-pink text-white border-4 border-white shadow-[6px_6px_0px_#120914] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="mt-3 px-4 py-1.5 rounded-full bg-brand-dark text-white border border-white/20 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg">
              Watch How It Works ({VIDEO_DURATION})
            </span>
          </button>
        )}

        {/* Quick Top-Right Audio & Pause Controls while Playing */}
        {isPlaying && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleToggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute' : 'Sound On'}
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

