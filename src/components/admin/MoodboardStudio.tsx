'use client';

import React, { useState, useRef } from 'react';
import {
  MoodboardPhoto,
  parseMysteryImageField,
  getEffectiveMoodboardPhotos,
} from '@/utils/moodboard';
import {
  uploadMysteryMoodboardPhotosAction,
  updateMysteryMoodboardAction,
  generateAIMoodboardPhotoAction,
} from '@/app/actions/moodboard';
import { MysteryMoodboard } from '@/components/mysteries/MysteryMoodboard';

const VIBE_TAG_PRESETS = [
  'The Setting',
  'Dress Code Inspo',
  'Cocktail Hour',
  'Crime Scene Vibe',
  'Party Atmosphere',
  'The Cast',
];

interface MoodboardStudioProps {
  mysteryId: string;
  mysteryTitle: string;
  theme?: string | null;
  initialImageUrl?: string | null;
  onUpdated?: (serializedImageUrl: string | null) => void;
}

export function MoodboardStudio({
  mysteryId,
  mysteryTitle,
  theme,
  initialImageUrl,
  onUpdated,
}: MoodboardStudioProps) {
  const initialParsed = parseMysteryImageField(initialImageUrl);
  const [coverUrl, setCoverUrl] = useState<string | null>(initialParsed.coverUrl);
  const [photos, setPhotos] = useState<MoodboardPhoto[]>(initialParsed.moodboardPhotos);

  const [selectedTag, setSelectedTag] = useState<string>('The Setting');
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [pasteUrl, setPasteUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const flashStatus = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const filesArray = Array.from(fileList).filter((f) => f.type.startsWith('image/') || f.size > 0);
    if (filesArray.length === 0) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('tag', selectedTag);
    if (uploadCaption.trim()) {
      formData.append('caption', uploadCaption.trim());
    }
    filesArray.forEach((f) => formData.append('files', f));

    const res = await uploadMysteryMoodboardPhotosAction(mysteryId, formData);
    setIsUploading(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.moodboardPhotos) {
      setPhotos(res.moodboardPhotos);
    }
    if (res.coverUrl !== undefined) {
      setCoverUrl(res.coverUrl);
    }
    setUploadCaption('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onUpdated?.(res.serializedImageUrl ?? null);
    flashStatus(`Uploaded ${filesArray.length} photo${filesArray.length > 1 ? 's' : ''} to Mood Board!`);
  };

  const handleAddByUrl = async () => {
    const clean = pasteUrl.trim();
    if (!clean) return;

    setIsSavingOrder(true);
    setError(null);

    const newPhoto: MoodboardPhoto = {
      id: `mb-url-${Date.now()}`,
      url: clean,
      tag: selectedTag,
      ...(uploadCaption.trim() ? { caption: uploadCaption.trim() } : {}),
    };

    const nextPhotos = [...photos, newPhoto];
    const nextCover = coverUrl || clean;

    const res = await updateMysteryMoodboardAction(mysteryId, {
      coverUrl: nextCover,
      photos: nextPhotos,
    });
    setIsSavingOrder(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setPhotos(res.moodboardPhotos || nextPhotos);
    setCoverUrl(res.coverUrl ?? nextCover);
    setPasteUrl('');
    setUploadCaption('');
    onUpdated?.(res.serializedImageUrl ?? null);
    flashStatus('Added photo URL to Mood Board!');
  };

  const handleAIGenerate = async () => {
    setIsGeneratingAI(true);
    setError(null);

    const res = await generateAIMoodboardPhotoAction(
      mysteryId,
      selectedTag,
      uploadCaption.trim() || undefined
    );
    setIsGeneratingAI(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    if (res.moodboardPhotos) setPhotos(res.moodboardPhotos);
    if (res.coverUrl !== undefined) setCoverUrl(res.coverUrl);
    setUploadCaption('');
    onUpdated?.(res.serializedImageUrl ?? null);
    flashStatus(`Generated "${selectedTag}" mood photo!`);
  };

  const persistPhotoChanges = async (
    nextPhotos: MoodboardPhoto[],
    nextCover: string | null = coverUrl,
    message = 'Mood Board updated!'
  ) => {
    setPhotos(nextPhotos);
    setCoverUrl(nextCover);
    setIsSavingOrder(true);
    setError(null);

    const res = await updateMysteryMoodboardAction(mysteryId, {
      coverUrl: nextCover,
      photos: nextPhotos,
    });
    setIsSavingOrder(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    onUpdated?.(res.serializedImageUrl ?? null);
    flashStatus(message);
  };

  const handleRemovePhoto = async (id: string) => {
    const removed = photos.find((p) => p.id === id);
    const nextPhotos = photos.filter((p) => p.id !== id);
    const nextCover =
      removed && coverUrl === removed.url ? nextPhotos[0]?.url || null : coverUrl;
    await persistPhotoChanges(nextPhotos, nextCover, 'Removed photo from Mood Board.');
  };

  const handleMovePhoto = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= photos.length) return;
    const copy = [...photos];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    await persistPhotoChanges(copy, coverUrl, 'Reordered Mood Board photos.');
  };

  const handleSetMainCover = async (url: string) => {
    await persistPhotoChanges(photos, url, 'Updated main mystery cover photo!');
  };

  const handleUpdatePhotoMeta = async (
    id: string,
    field: 'tag' | 'caption',
    value: string
  ) => {
    const nextPhotos = photos.map((p) => (p.id === id ? { ...p, [field]: value } : p));
    setPhotos(nextPhotos);
  };

  const handleSaveMetaBlur = async () => {
    await persistPhotoChanges(photos, coverUrl, 'Saved photo caption & tag!');
  };

  const previewPhotos =
    photos.length > 0
      ? photos
      : getEffectiveMoodboardPhotos(coverUrl, theme, mysteryTitle);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(254,4,198,0.1)', color: '#fe04c6' }}
            >
              📸 Visual Vibe Builder
            </span>
            <span className="text-[11px] font-bold text-slate-400">
              {photos.length} Custom Photo{photos.length === 1 ? '' : 's'} Uploaded
            </span>
          </div>
          <h3 className="text-lg font-black text-slate-900">
            Mystery Mood Board &amp; Gallery Photos
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Upload photos of the setting, dress code inspiration, cocktails, and atmosphere. They automatically assemble into a visual mood board on the mystery page.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLivePreview((v) => !v)}
          className="px-4 py-2 rounded-xl text-xs font-black border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all self-start sm:self-auto shrink-0"
        >
          {showLivePreview ? 'Hide Mood Board Preview' : 'Show Mood Board Preview'}
        </button>
      </div>

      {/* Vibe Tag & Optional Caption for New Uploads */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            1. Vibe Tag for Next Upload
          </label>
          <div className="flex flex-wrap gap-1.5">
            {VIBE_TAG_PRESETS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border ${
                  selectedTag === tag
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                style={selectedTag === tag ? { background: '#fe04c6' } : undefined}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="md:col-span-7">
          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
            2. Optional Caption / Scene Note
          </label>
          <input
            type="text"
            value={uploadCaption}
            onChange={(e) => setUploadCaption(e.target.value)}
            placeholder="e.g. Champagne tower on the penthouse terrace before Round 1..."
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:border-[#fe04c6] outline-none"
          />
        </div>
      </div>

      {/* Upload Dropzone + AI Generate + URL Paste */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Multi-file Drag & Drop Upload Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files?.length) {
              handleFilesSelected(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:col-span-7 border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#fe04c6] bg-pink-50/40'
              : 'border-slate-200 hover:border-[#fe04c6] bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          />
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 text-white shadow-sm"
            style={{ background: '#fe04c6' }}
          >
            {isUploading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            )}
          </div>
          <p className="text-sm font-black text-slate-900">
            {isUploading ? 'Uploading Photos to Mood Board...' : 'Click or Drag & Drop Photos Here'}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Select multiple JPG, PNG, or WebP images at once to build your mood board
          </p>
        </div>

        {/* Right Side: AI Generate + Paste Image URL */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Or Generate a Vibe Shot with AI
            </p>
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={isGeneratingAI || isUploading}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {isGeneratingAI ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-[#fe04c6]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating &ldquo;{selectedTag}&rdquo;...
                </>
              ) : (
                <>
                  <span style={{ color: '#fe04c6' }}>✦</span> AI Generate &ldquo;{selectedTag}&rdquo; Photo
                </>
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200/70">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
              Or Paste an Image URL
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={pasteUrl}
                onChange={(e) => setPasteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#fe04c6]"
              />
              <button
                type="button"
                onClick={handleAddByUrl}
                disabled={!pasteUrl.trim() || isSavingOrder}
                className="px-3.5 py-2 rounded-xl text-xs font-black text-white shrink-0 disabled:opacity-40"
                style={{ background: '#fe04c6' }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
          {error}
        </div>
      )}
      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black flex items-center gap-2">
          <span>✓</span> {statusMsg}
        </div>
      )}

      {/* Uploaded Photos Management Grid */}
      {photos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Uploaded Mood Board Photos ({photos.length}) - Drag order, edit captions, or set as main cover
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {photos.map((photo, idx) => {
              const isMainCover = coverUrl === photo.url;
              return (
                <div
                  key={photo.id || idx}
                  className={`rounded-2xl border p-3 bg-slate-50/70 flex flex-col gap-2.5 transition-all ${
                    isMainCover ? 'border-[#fe04c6] ring-2 ring-[#fe04c6]/15 bg-white' : 'border-slate-200'
                  }`}
                >
                  <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.tag || 'Moodboard photo'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 flex gap-1.5">
                      {isMainCover ? (
                        <span
                          className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-white shadow-sm"
                          style={{ background: '#fe04c6' }}
                        >
                          ★ Main Cover
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetMainCover(photo.url)}
                          className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-black/70 hover:bg-black text-white backdrop-blur-sm transition-colors"
                        >
                          Set as Cover
                        </button>
                      )}
                    </div>

                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleMovePhoto(idx, -1)}
                        disabled={idx === 0}
                        className="w-6 h-6 rounded-lg bg-black/65 hover:bg-black text-white text-xs flex items-center justify-center disabled:opacity-30"
                        title="Move Earlier"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMovePhoto(idx, 1)}
                        disabled={idx === photos.length - 1}
                        className="w-6 h-6 rounded-lg bg-black/65 hover:bg-black text-white text-xs flex items-center justify-center disabled:opacity-30"
                        title="Move Later"
                      >
                        →
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="w-6 h-6 rounded-lg bg-red-600/85 hover:bg-red-600 text-white text-xs flex items-center justify-center"
                        title="Remove Photo"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={photo.tag || ''}
                      onChange={(e) => handleUpdatePhotoMeta(photo.id, 'tag', e.target.value)}
                      onBlur={handleSaveMetaBlur}
                      placeholder="Vibe Tag (e.g. Dress Code Inspo)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-black text-slate-800 outline-none focus:border-[#fe04c6]"
                    />
                    <input
                      type="text"
                      value={photo.caption || ''}
                      onChange={(e) => handleUpdatePhotoMeta(photo.id, 'caption', e.target.value)}
                      onBlur={handleSaveMetaBlur}
                      placeholder="Short caption..."
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-medium text-slate-600 outline-none focus:border-[#fe04c6]"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Mood Board Preview */}
      {showLivePreview && (
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Live Customer Page Mood Board Preview {photos.length === 0 ? '(Showing Default Theme Vibe Until You Upload)' : ''}
            </span>
          </div>
          <MysteryMoodboard
            photos={previewPhotos}
            mysteryTitle={mysteryTitle || 'Your Mystery'}
            theme={theme}
            compact
          />
        </div>
      )}
    </div>
  );
}
