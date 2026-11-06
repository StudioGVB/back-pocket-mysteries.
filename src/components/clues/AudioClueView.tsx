'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ClueViewProps } from './ChatClueView';
import { stripCustomerFacingTitle } from '@/utils/clue-format';
import { parseAudioTranscript, VoiceRegion } from '@/lib/voices';
import { generateAudioClueAction } from '@/app/actions/audio-generator';

const WAVEFORM_BARS = [
  24, 48, 72, 36, 60, 88, 52, 30, 68, 95, 76, 42, 58, 84, 46, 32, 64, 90, 54,
  38, 70, 50, 28, 62, 80, 44, 34, 56,
];

export function AudioClueView({
  clue,
  hydratedTitle,
  hydratedDescription,
  characters = [],
  compact = false,
  showImage = true,
}: ClueViewProps) {
  const rawTitle = hydratedTitle || clue.title || 'Intercepted Voice Note';
  const title = stripCustomerFacingTitle(rawTitle) || rawTitle;
  const rawTranscript = (hydratedDescription ?? clue.description ?? '').trim();

  // Strip internal "Context: ..." or "Recording Duration: ..." lines and clean "J [Jeremy]:" -> "Jeremy:" for customer display
  const transcript = rawTranscript
    .split('\n')
    .filter(
      (line) =>
        !/^(?:Context|Recording Duration|Duration|Header):\s*/i.test(line.trim())
    )
    .map((line) =>
      line.replace(/^[A-Za-z0-9]{1,3}\s*\[([^\]]+)\]\s*:/, '$1:')
    )
    .join('\n')
    .trim();

  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(
    clue.audio_url || null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const pendingAutoPlayRef = useRef(false);

  useEffect(() => {
    setLocalAudioUrl(clue.audio_url || null);
  }, [clue.audio_url]);

  const hasAudio = Boolean(localAudioUrl);

  // Detect named characters/guests speaking in the transcript (never expose internal ElevenLabs voice actor names)
  const parsedSpeakers = useMemo(() => {
    const region: VoiceRegion = (clue.voice_region as VoiceRegion) || 'en-AU';
    const lines = parseAudioTranscript(rawTranscript, {
      voiceRegion: region,
      title: rawTitle,
      characters,
    });
    const unique = new Map<string, { speaker: string }>();
    for (const line of lines) {
      const speakerLabel = (
        line.displaySpeaker ||
        line.speaker ||
        line.rawSpeaker ||
        ''
      ).trim();
      const key = speakerLabel.toLowerCase();
      // Only show real character/guest names on customer-facing UI (skip generic Speaker 1/2/3 or Narrator)
      const isGenericPlaceholder =
        !speakerLabel ||
        /^speaker\s*\d*$/i.test(speakerLabel) ||
        /^narrator$/i.test(speakerLabel) ||
        /^unknown/i.test(speakerLabel) ||
        /^voice\s*\d*$/i.test(speakerLabel);

      if (!isGenericPlaceholder && !unique.has(key)) {
        unique.set(key, { speaker: speakerLabel });
      }
    }
    return Array.from(unique.values());
  }, [rawTranscript, rawTitle, clue.voice_region, characters]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [eqTick, setEqTick] = useState(0);

  // Keep transcript drawer open by default when not in compact mode or when no audio is cached yet
  const [showTranscript, setShowTranscript] = useState<boolean>(
    !hasAudio || !compact
  );

  const durationMatch =
    rawTranscript.match(/Recording Duration:\s*(\d+(?:\.\d+)?)\s*s/i) ||
    rawTranscript.match(/Duration:\s*(\d+(?:\.\d+)?)\s*s/i);
  const fallbackSeconds = durationMatch
    ? Math.max(1, Math.round(parseFloat(durationMatch[1])))
    : 32;

  const totalSeconds =
    audioDuration && Number.isFinite(audioDuration) && audioDuration > 0
      ? Math.max(1, Math.round(audioDuration))
      : fallbackSeconds;

  // Reset playback state when localAudioUrl changes, or auto-play if newly generated from Play click
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);

    if (localAudioUrl && pendingAutoPlayRef.current) {
      pendingAutoPlayRef.current = false;
      const timer = setTimeout(() => {
        const el = audioRef.current;
        if (el) {
          el.play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.error('Auto-play after generation failed:', err);
              setIsPlaying(false);
            });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [localAudioUrl]);

  // Animate CSS waveform equalizer bars while playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setEqTick((prev) => (prev + 1) % 100);
    }, 180);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setGenError(null);

    if (isGenerating) return;

    // If audio is already available, play or pause immediately
    if (localAudioUrl && audioRef.current) {
      const el = audioRef.current;
      if (isPlaying) {
        el.pause();
        setIsPlaying(false);
        return;
      } else {
        try {
          await el.play();
          setIsPlaying(true);
          return;
        } catch (err) {
          console.warn('Cached audio playback failed, regenerating audio...', err);
          setIsPlaying(false);
          // Fall through to regenerate audio on the fly if the existing URL failed to load
        }
      }
    }

    // If no audio_url has been generated yet (or cached URL failed), synthesize it on the fly and play immediately!
    if (!clue.id || !clue.mystery_id || !rawTranscript) {
      setGenError('No transcript available to synthesize.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateAudioClueAction({
        clueId: clue.id,
        mysteryId: clue.mystery_id,
        transcript: rawTranscript,
        voiceRegion: (clue.voice_region as VoiceRegion) || undefined,
        title: rawTitle,
      });

      if (res.success && res.audioUrl) {
        pendingAutoPlayRef.current = true;
        setLocalAudioUrl(res.audioUrl);
      } else {
        setGenError(res.error || 'Could not generate audio.');
      }
    } catch (err: any) {
      setGenError(err?.message || 'Error synthesizing audio.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const el = audioRef.current;
    if (!el || !hasAudio) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickRatio = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const targetDuration =
      el.duration && Number.isFinite(el.duration) ? el.duration : totalSeconds;
    const newTime = clickRatio * targetDuration;
    el.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const effectiveDuration =
    audioDuration && Number.isFinite(audioDuration) && audioDuration > 0
      ? audioDuration
      : totalSeconds;
  const progressPct =
    effectiveDuration > 0
      ? Math.min(100, (currentTime / effectiveDuration) * 100)
      : 0;

  const formatTime = (secs: number) => {
    const safeSecs = Math.max(0, Math.floor(secs));
    const mins = Math.floor(safeSecs / 60);
    const rem = safeSecs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-[#0c1220] border border-slate-800 shadow-xl text-slate-100 font-sans">
      {localAudioUrl && (
        <audio
          ref={audioRef}
          src={localAudioUrl}
          preload="metadata"
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (dur && Number.isFinite(dur)) {
              setAudioDuration(dur);
            }
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
          }}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Optional Atmospheric Photo Header */}
      {showImage && clue.static_image_url && (
        <div
          className={`relative w-full ${
            compact ? 'h-28' : 'h-40'
          } overflow-hidden border-b border-slate-800`}
        >
          <img
            src={clue.static_image_url}
            alt={title}
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c1220] via-[#0c1220]/40 to-transparent" />
          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-center justify-between gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[9px] font-black uppercase tracking-widest text-blue-300 backdrop-blur-md">
              🎙️ Voice Memo Recording
            </span>
            {hasAudio ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[8px] font-black uppercase tracking-widest text-emerald-300 backdrop-blur-md">
                🔊 Audio Ready
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/30 text-[8px] font-black uppercase tracking-widest text-blue-200 backdrop-blur-md">
                ▶️ Tap Play to Listen
              </span>
            )}
          </div>
        </div>
      )}

      {/* Voice Memo Player & Transcript Card */}
      <div className="p-4 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-widest text-blue-400 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying
                    ? 'bg-emerald-400 animate-ping'
                    : isGenerating
                    ? 'bg-amber-400 animate-ping'
                    : hasAudio
                    ? 'bg-emerald-400'
                    : 'bg-blue-400'
                }`}
              />
              <span>
                {isGenerating
                  ? 'SYNTHESIZING MULTI-SPEAKER AUDIO...'
                  : isPlaying
                  ? 'AUDIO EXHIBIT • PLAYING...'
                  : hasAudio
                  ? 'AUDIO EXHIBIT • READY TO PLAY'
                  : 'AUDIO EXHIBIT • TAP PLAY'}
              </span>
            </div>
            <div className="text-xs font-black text-white truncate mt-0.5">
              {title}
            </div>
          </div>

          <span className="text-[11px] font-mono font-bold text-slate-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
            {formatTime(currentTime)} / {formatTime(totalSeconds)}
          </span>
        </div>

        {/* Character / Guest Names Only (never show internal voice model names) */}
        {parsedSpeakers.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-0.5">
              {parsedSpeakers.length > 1 ? 'Speakers:' : 'Speaker:'}
            </span>
            {parsedSpeakers.map((sp, idx) => (
              <span
                key={`${sp.speaker}-${idx}`}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-[10px] font-bold text-slate-200"
              >
                <span className="text-blue-400">🎙️</span>
                <span>{sp.speaker}</span>
              </span>
            ))}
          </div>
        )}

        {/* Sleek HTML5 Audio Player Widget — Always visible so user can always click Play */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              disabled={isGenerating}
              aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 fill-current ml-0.5"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Animated CSS Waveform Equalizer + Scrubber */}
            <div
              onClick={hasAudio ? handleSeek : togglePlay}
              className="flex-grow flex items-center gap-1 h-9 cursor-pointer select-none"
              title={hasAudio ? 'Click to seek audio' : 'Click to play audio'}
            >
              {WAVEFORM_BARS.map((height, i) => {
                const barPct = (i / WAVEFORM_BARS.length) * 100;
                const isPlayed = barPct <= progressPct;
                const activeHeight = isPlaying
                  ? Math.max(
                      18,
                      ((height + i * 19 + eqTick * 29) % 85) + 15
                    )
                  : height;

                return (
                  <div
                    key={i}
                    className="flex-grow rounded-full transition-all duration-150"
                    style={{
                      height: `${activeHeight}%`,
                      backgroundColor: isPlayed
                        ? '#3b82f6'
                        : isPlaying
                        ? 'rgba(96, 165, 250, 0.45)'
                        : 'rgba(148, 163, 184, 0.28)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* Linear Progress Scrubber Bar */}
          <div
            onClick={hasAudio ? handleSeek : togglePlay}
            className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer relative"
          >
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-100"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {genError && (
            <div className="text-[10px] font-semibold text-rose-400 pt-1">
              ⚠️ {genError}
            </div>
          )}
        </div>

        {/* Collapsible "Read Transcript" Drawer */}
        <div className="border-t border-slate-800/80 pt-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowTranscript((prev) => !prev);
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800 text-[11px] font-black uppercase tracking-widest text-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>📝</span>
              <span>Read Transcript</span>
            </span>
            <span className="text-blue-400 text-[10px]">
              {showTranscript ? '▲ Hide' : '▼ Expand'}
            </span>
          </button>

          {showTranscript && (
            <div className="mt-2.5 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 text-xs font-medium text-slate-200 leading-relaxed whitespace-pre-line animate-in fade-in duration-200">
              {transcript || rawTranscript || 'No audio transcript available.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
