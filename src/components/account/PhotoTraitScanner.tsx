'use client';

import React, { useRef, useState, useEffect } from 'react';

export interface ScannedGuestTraits {
  gender: 'Masculine' | 'Feminine' | 'Neutral';
  age: 'young' | 'middle_aged' | 'old';
  ethnicity: string;
  skinColor: string;
  skinToneLabel: string;
  hairColor: string;
  hairColorLabel: string;
  hairLength: string;
  hairTexture: string;
  hairStyle?: string;
  facialHair?: string;
  eyeColor: string;
  faceShape?: string;
  build: string;
  distinctiveFeatures: string[];
  likenessNotes?: string;
}

interface PhotoTraitScannerProps {
  onTraitsDetected: (traits: ScannedGuestTraits, summary: string) => void;
  onJumpToAvatarTab?: () => void;
  showJumpToAvatarButton?: boolean;
  compact?: boolean;
}

/**
 * Resizes an image file in browser RAM to max 512x512 JPEG (~25-35KB)
 * and immediately cleans up temporary DOM/Blob references.
 */
async function resizeFileToEphemeralBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      try {
        const MAX_DIM = 512;
        let width = img.naturalWidth || img.width || 512;
        let height = img.naturalHeight || img.height || 512;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not initialize image canvas.'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        URL.revokeObjectURL(objectUrl);
        canvas.width = 0;
        canvas.height = 0;

        resolve({ base64: dataUrl, mimeType: 'image/jpeg' });
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read the selected image file.'));
    };

    img.src = objectUrl;
  });
}

export function PhotoTraitScanner({
  onTraitsDetected,
  onJumpToAvatarTab,
  showJumpToAvatarButton = false,
}: PhotoTraitScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileCameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [scanSummary, setScanSummary] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const runEphemeralScan = async (base64DataUrl: string, mimeType: string) => {
    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch('/api/guests/scan-traits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64DataUrl,
          mimeType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success || !data?.traits) {
        throw new Error(data?.error || 'Could not detect appearance traits from this photo.');
      }

      setScanSummary(data.summary || 'Appearance traits auto-filled!');
      onTraitsDetected(data.traits, data.summary || '');
    } catch (err: any) {
      setScanError(err?.message || 'Failed to scan photo.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (mobileCameraInputRef.current) mobileCameraInputRef.current.value = '';
    }
  };

  const handleFileSelected = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setScanError('Please select a valid image file.');
      return;
    }

    try {
      setIsScanning(true);
      setScanError(null);
      const { base64, mimeType } = await resizeFileToEphemeralBase64(file);
      await runEphemeralScan(base64, mimeType);
    } catch (err: any) {
      setIsScanning(false);
      setScanError(err?.message || 'Could not process image.');
    }
  };

  const handleStartCamera = async () => {
    setScanError(null);
    const isMobile =
      typeof window !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (isMobile || !navigator.mediaDevices?.getUserMedia) {
      mobileCameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 50);
    } catch {
      mobileCameraInputRef.current?.click();
    }
  };

  const handleCaptureWebcamFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 512;
    const vh = video.videoHeight || 512;
    const minSide = Math.min(vw, vh);
    const sx = (vw - minSide) / 2;
    const sy = (vh - minSide) / 2;

    ctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, 512, 512);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    canvas.width = 0;
    canvas.height = 0;
    stopCameraStream();

    await runEphemeralScan(dataUrl, 'image/jpeg');
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer?.files?.[0];
        if (droppedFile) {
          handleFileSelected(droppedFile);
        }
      }}
      className={`rounded-xl border transition-all ${
        isDragOver
          ? 'border-brand-pink bg-brand-pink/5'
          : 'border-slate-200 bg-slate-50/80'
      } px-3.5 py-2.5`}
    >
      {/* Hidden File & Camera Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />
      <input
        ref={mobileCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFileSelected(e.target.files?.[0])}
      />

      {/* Responsive Bar: Stacked with 2-col button grid on iPhone (< sm), single horizontal row on sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-brand-pink/10 text-brand-pink flex items-center justify-center shrink-0">
            {isScanning ? (
              <svg className="animate-spin h-4 w-4 text-brand-pink" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 truncate">
                {isScanning ? 'Scanning photo traits...' : 'Auto-fill traits from photo'}
              </span>
              <span className="inline-block px-1.5 py-0.5 rounded bg-brand-pink/10 text-brand-pink text-[9px] font-black uppercase tracking-wider shrink-0">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              Scanned in memory &amp; immediately deleted (never stored)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            disabled={isScanning}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 sm:py-1.5 rounded-lg bg-slate-900 hover:bg-brand-pink text-white text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <span>Upload Photo</span>
          </button>
          <button
            type="button"
            disabled={isScanning}
            onClick={handleStartCamera}
            className="px-2.5 py-2 sm:py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            title="Take photo with camera"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>Camera</span>
          </button>
        </div>
      </div>

      {/* Live Webcam Viewfinder if opened on desktop */}
      {isCameraOpen && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-16 h-16 rounded-lg object-cover border border-brand-pink bg-slate-950 shrink-0"
            />
            <div className="text-[11px] text-slate-300 leading-snug">
              <div className="font-bold text-white">Camera Ready</div>
              Center face &amp; capture. Photo is discarded right after scan.
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={stopCameraStream}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCaptureWebcamFrame}
              className="px-3 py-1.5 rounded-lg bg-brand-pink text-white text-[10px] font-bold cursor-pointer"
            >
              Capture
            </button>
          </div>
        </div>
      )}

      {/* Compact Success Toast Row */}
      {!isScanning && scanSummary && (
        <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0 text-slate-700 font-medium truncate">
            <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">
              ✓
            </span>
            <span className="truncate">{scanSummary}</span>
          </div>
          {showJumpToAvatarButton && onJumpToAvatarTab && (
            <button
              type="button"
              onClick={onJumpToAvatarTab}
              className="shrink-0 text-[10px] font-black text-brand-pink hover:underline cursor-pointer"
            >
              Edit Avatar →
            </button>
          )}
        </div>
      )}

      {/* Error Message */}
      {!isScanning && scanError && (
        <div className="mt-2 pt-2 border-t border-red-100 text-[11px] font-bold text-red-600">
          {scanError}
        </div>
      )}
    </div>
  );
}
