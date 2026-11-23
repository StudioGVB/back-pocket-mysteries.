'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Smartphone, Monitor } from 'lucide-react';

export default function HowItWorksVideoShowcase() {
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoSrc =
    format === '16:9'
      ? '/videos/back-pocket-mysteries-how-it-works-16x9.mp4?v=3'
      : '/videos/back-pocket-mysteries-how-it-works-9x16.mp4?v=3';

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

  const handleSwitchFormat = (nextFormat: '16:9' | '9:16') => {
    if (nextFormat === format) return;
    setIsPlaying(false);
    setFormat(nextFormat);
  };

  return (
    <div className="mt-12 pt-10 border-t border-gray-200">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-pink text-white text-[10px] font-black uppercase tracking-[0.2em]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            45-Sec Video Walkthrough
          </span>
          <p className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-dark">
            Watch the 6 Steps + Custom Clue Engine Breakdown
          </p>
        </div>

        {/* Aspect Ratio Switcher + Direct Social MP4 Downloads */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => handleSwitchFormat('16:9')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                format === '16:9'
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-gray-600 hover:text-brand-dark'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              16:9 Website
            </button>
            <button
              type="button"
              onClick={() => handleSwitchFormat('9:16')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all ${
                format === '9:16'
                  ? 'bg-brand-dark text-white shadow-sm'
                  : 'text-gray-600 hover:text-brand-dark'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              9:16 Reels / TikTok
            </button>
          </div>

          <a
            href="/videos/back-pocket-mysteries-how-it-works-16x9.mp4?v=3"
            download="back-pocket-mysteries-how-it-works-16x9.mp4"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-pink" />
            16:9 MP4
          </a>

          <a
            href="/videos/back-pocket-mysteries-how-it-works-9x16.mp4?v=3"
            download="back-pocket-mysteries-how-it-works-9x16.mp4"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-pink" />
            9:16 Social MP4
          </a>
        </div>
      </div>

      {/* Neo-Brutalist Video Frame */}
      <div
        className={`relative mx-auto rounded-[2rem] border-2 border-brand-dark bg-brand-dark shadow-[10px_10px_0px_#fe04c6] overflow-hidden transition-all duration-300 ${
          format === '16:9' ? 'w-full aspect-video' : 'max-w-[380px] aspect-[9/16]'
        }`}
      >
        <video
          key={videoSrc}
          ref={videoRef}
          src={`${videoSrc}#t=0.5`}
          playsInline
          controls={isPlaying}
          preload="auto"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain bg-brand-dark"
        />

        {/* Large Center Play Overlay when Paused */}
        {!isPlaying && (
          <button
            type="button"
            onClick={handleTogglePlay}
            aria-label="Play 45-second walkthrough video"
            className="absolute inset-0 flex flex-col items-center justify-center bg-brand-dark/35 hover:bg-brand-dark/20 transition-colors group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-brand-pink text-white border-4 border-white shadow-[6px_6px_0px_#120914] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="mt-3 px-4 py-1.5 rounded-full bg-brand-dark text-white border border-white/20 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg">
              Click to Watch Walkthrough (0:45)
            </span>
          </button>
        )}

        {/* Quick Top-Right Audio Toggle Pill while Playing */}
        {isPlaying && (
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={handleToggleMute}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isMuted ? 'Unmute' : 'Sound On'}
            </button>
            <button
              type="button"
              onClick={handleTogglePlay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/90 text-white border border-white/20 text-[10px] font-black uppercase tracking-widest hover:bg-brand-pink transition-colors"
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
