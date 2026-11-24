'use client';

import React, { useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Download, Smartphone, Monitor, Sparkles, ListOrdered } from 'lucide-react';

type VideoId = 'what-it-is' | 'how-it-works';

const PROMO_VIDEOS: Record<
  VideoId,
  {
    id: VideoId;
    badge: string;
    title: string;
    subtitle: string;
    durationLabel: string;
    src16x9: string;
    src9x16: string;
    file16x9: string;
    file9x16: string;
  }
> = {
  'what-it-is': {
    id: 'what-it-is',
    badge: 'Promo #1 • What It Is, What We Do & How It Looks',
    title: 'What Is It, What We Do & How It Looks',
    subtitle: 'Dual-Voice British Banter • Lookalike Suspects, Texts, Wiretaps & Live Party Reveal',
    durationLabel: '1:17',
    src16x9: '/videos/back-pocket-mysteries-what-it-is-16x9.mp4?v=2',
    src9x16: '/videos/back-pocket-mysteries-what-it-is-9x16.mp4?v=2',
    file16x9: 'back-pocket-mysteries-what-it-is-16x9.mp4',
    file9x16: 'back-pocket-mysteries-what-it-is-9x16.mp4',
  },
  'how-it-works': {
    id: 'how-it-works',
    badge: 'Promo #2 • 6-Step Host & Player Walkthrough',
    title: 'How It Works in 6 Simple Steps',
    subtitle: 'Full 6-Step Host Journey + 3-Part Custom Clue Engine Breakdown',
    durationLabel: '0:50',
    src16x9: '/videos/back-pocket-mysteries-how-it-works-16x9.mp4?v=3',
    src9x16: '/videos/back-pocket-mysteries-how-it-works-9x16.mp4?v=3',
    file16x9: 'back-pocket-mysteries-how-it-works-16x9.mp4',
    file9x16: 'back-pocket-mysteries-how-it-works-9x16.mp4',
  },
};

export default function HowItWorksVideoShowcase() {
  const [selectedVideo, setSelectedVideo] = useState<VideoId>('what-it-is');
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const activeVideo = PROMO_VIDEOS[selectedVideo];
  const videoSrc = format === '16:9' ? activeVideo.src16x9 : activeVideo.src9x16;

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

  const handleSwitchVideo = (nextVideo: VideoId) => {
    if (nextVideo === selectedVideo) return;
    setIsPlaying(false);
    setSelectedVideo(nextVideo);
  };

  return (
    <div className="mt-12 pt-10 border-t border-gray-200">
      {/* Top Promo Video Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="inline-flex flex-wrap p-1.5 rounded-2xl bg-gray-100 border-2 border-brand-dark gap-1.5">
          <button
            type="button"
            onClick={() => handleSwitchVideo('what-it-is')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedVideo === 'what-it-is'
                ? 'bg-brand-pink text-white shadow-[3px_3px_0px_#120914]'
                : 'text-brand-dark hover:bg-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Promo #1: What It Is, What We Do & How It Looks
          </button>
          <button
            type="button"
            onClick={() => handleSwitchVideo('how-it-works')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedVideo === 'how-it-works'
                ? 'bg-brand-pink text-white shadow-[3px_3px_0px_#120914]'
                : 'text-brand-dark hover:bg-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            Promo #2: How It Works in 6 Steps
          </button>
        </div>

        <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-dark text-white text-[10px] font-black uppercase tracking-[0.2em]">
          <span className="w-2 h-2 rounded-full bg-brand-pink animate-pulse" />
          {activeVideo.badge}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm sm:text-base font-black uppercase tracking-wider text-brand-dark">
            {activeVideo.title}
          </p>
          <p className="text-xs font-bold text-gray-500 mt-0.5">{activeVideo.subtitle}</p>
        </div>

        {/* Aspect Ratio Switcher + Direct Social MP4 Downloads */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 rounded-full bg-gray-100 border border-gray-200">
            <button
              type="button"
              onClick={() => handleSwitchFormat('16:9')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
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
            href={activeVideo.src16x9}
            download={activeVideo.file16x9}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-pink" />
            16:9 MP4
          </a>

          <a
            href={activeVideo.src9x16}
            download={activeVideo.file9x16}
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
            aria-label="Play promotional video"
            className="absolute inset-0 flex flex-col items-center justify-center bg-brand-dark/35 hover:bg-brand-dark/20 transition-colors group cursor-pointer"
          >
            <div className="w-20 h-20 rounded-full bg-brand-pink text-white border-4 border-white shadow-[6px_6px_0px_#120914] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Play className="w-8 h-8 fill-current ml-1" />
            </div>
            <span className="mt-3 px-4 py-1.5 rounded-full bg-brand-dark text-white border border-white/20 text-[11px] font-black uppercase tracking-[0.2em] shadow-lg">
              Click to Watch ({activeVideo.durationLabel})
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

