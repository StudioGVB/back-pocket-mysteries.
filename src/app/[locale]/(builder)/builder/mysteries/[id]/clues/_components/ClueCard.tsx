// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Database } from '@/types/database';
import { updateClueAction, removeClueAction } from '../actions';
import { ClueEditor } from './ClueEditor';
import { hydrateTextWithCharacters } from '@/utils/hydration';

type Clue = Database['public']['Tables']['clues']['Row'];
type Beat = Database['public']['Tables']['plot_beats']['Row'];
type Character = Database['public']['Tables']['characters']['Row'];

function formatClueDescriptionForPrint(hydratedText: string) {
  if (!hydratedText) return { header: 'EVIDENCE', meta: '', content: '' };
  
  const lines = hydratedText.split('\n').map(l => l.trim()).filter(Boolean);
  
  let header = 'EVIDENCE';
  let meta = '';
  let contentLines: string[] = [];
  
  let currentLineIdx = 0;
  
  // 1. Detect header (usually starts with an emoji)
  if (lines[0] && (
    lines[0].startsWith('💬') || 
    lines[0].startsWith('🎙️') || 
    lines[0].startsWith('🔍') || 
    lines[0].startsWith('📋') || 
    lines[0].startsWith('📌') || 
    lines[0].startsWith('💻') || 
    lines[0].startsWith('📓') || 
    lines[0].startsWith('📸')
  )) {
    // Strip emojis/special characters and use as header
    header = lines[0].replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim().toUpperCase();
    currentLineIdx = 1;
  } else if (lines[0] && lines[0].toUpperCase() === lines[0] && lines[0].length < 40) {
    header = lines[0];
    currentLineIdx = 1;
  }
  
  // 2. Detect meta (Sender/Recipient lines or Device/Source)
  const metaLines: string[] = [];
  while (currentLineIdx < lines.length) {
    const line = lines[currentLineIdx];
    if (
      line.startsWith('Sender:') || 
      line.startsWith('Recipient:') || 
      line.startsWith('Device:') || 
      line.startsWith('Source:') || 
      line.startsWith('Speakers:') || 
      line.startsWith('Timestamp:') || 
      line.startsWith('Restored metadata:')
    ) {
      metaLines.push(line);
      currentLineIdx++;
    } else {
      break;
    }
  }
  
  if (metaLines.length > 0) {
    meta = metaLines.join(' | ');
  }
  
  // 3. The rest is content
  contentLines = lines.slice(currentLineIdx);
  
  return {
    header,
    meta,
    content: contentLines.join('\n')
  };
}

function isCctvOrVideoClue(clue: any) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('cctv') ||
    title.includes('video') ||
    title.includes('camera') ||
    title.includes('photo') ||
    title.includes('polaroid') ||
    desc.includes('cctv') ||
    desc.includes('security cam') ||
    desc.includes('camera footage') ||
    desc.includes('video footage') ||
    desc.includes('metadata: sec cam') ||
    prompt.includes('cctv') ||
    prompt.includes('security camera') ||
    prompt.includes('surveillance')
  );
}

function isAudioClue(clue: any) {
  const title = (clue.title || '').toLowerCase();
  const desc = (clue.description || '').toLowerCase();
  const prompt = (clue.generation_prompt || '').toLowerCase();
  return (
    title.includes('audio') ||
    title.includes('voice note') ||
    title.includes('recorded') ||
    title.includes('recording') ||
    title.includes('clip') ||
    title.includes('sound') ||
    desc.includes('🎙️') ||
    desc.includes('audio recording') ||
    desc.includes('voice note') ||
    prompt.includes('microphone') ||
    prompt.includes('soundboard') ||
    prompt.includes('audio recorder')
  );
}

function parseCctvMetadata(clue: any) {
  const desc = clue.description || '';
  
  // Try to find Timestamp
  let timestamp = '06/23/2026 18:03:00';
  const timeMatch = desc.match(/Timestamp:\s*([^\n|)]+)/i);
  if (timeMatch) {
    const rawTime = timeMatch[1].trim();
    timestamp = `06/23/2026 ${rawTime}`;
  } else {
    const simpleTimeMatch = desc.match(/(\d{1,2}:\d{2}\s*(?:PM|AM))/i);
    if (simpleTimeMatch) {
      timestamp = `06/23/2026 ${simpleTimeMatch[1]}`;
    }
  }

  // Try to find Camera
  let camera = 'CAM 01';
  const camMatch = desc.match(/SEC CAM_([^\n\s|\]]+)/i);
  if (camMatch) {
    camera = `SEC CAM ${camMatch[1].toUpperCase()}`;
  } else if (desc.toLowerCase().includes('bar area')) {
    camera = 'CAM 02 - PENTHOUSE BAR';
  } else if (desc.toLowerCase().includes('lobby') || desc.toLowerCase().includes('hallway')) {
    camera = 'CAM 01 - CORRIDOR';
  } else if (clue.title.toLowerCase().includes('switch')) {
    camera = 'CAM 03 - DRINK COUNTER';
  }

  return { timestamp, camera };
}

interface ClueCardProps {
  clue: Clue;
  mysteryId: string;
  beats: Beat[];
  characters: Character[];
  subplots?: any[];
  isGenerating?: boolean;
}

export function ClueCard({ clue, mysteryId, beats, characters, subplots = [], isGenerating }: ClueCardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(searchParams.get('edit') === clue.id);

  useEffect(() => {
    if (searchParams.get('edit') === clue.id) {
      setIsEditing(true);
    }
  }, [searchParams, clue.id]);

  const handleCloseEditor = () => {
    setIsEditing(false);
    if (searchParams.get('edit') === clue.id) {
      router.replace(pathname);
    }
  };

  const linkedBeat = beats.find(b => b.id === clue.linked_plot_beat_id);
  const linkedSubplotBeat = subplots?.flatMap(s => s.subplot_beats || []).find(b => b.id === clue.linked_subplot_beat_id);

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    setIsEditing(true);
  };

  const cctv = parseCctvMetadata(clue);
  const isAudio = isAudioClue(clue);
  const isCctv = isCctvOrVideoClue(clue) && !isAudio;

  const hydratedDesc = hydrateTextWithCharacters(clue.description || '', characters, 'print');
  const formatted = formatClueDescriptionForPrint(hydratedDesc);

  return (
    <>
      <div 
         onClick={handleCardClick}
         className="bg-black rounded-[2.5rem] border border-neutral-900 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden text-white"
      >
        {isGenerating && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-[3px] z-30 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-brand-pink border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-black uppercase tracking-widest text-brand-pink animate-pulse">Generating Photo...</span>
          </div>
        )}
        {/* 1. Clue Image Section (Edge-to-Edge) */}
        <div className="relative w-full aspect-square bg-slate-955 overflow-hidden group/img">
          {clue.static_image_url ? (
            <img
              src={clue.static_image_url}
              alt={clue.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center gap-2">
              {isCctv ? (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 select-none">
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />
                  <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]" />
                  <span className="text-3xl filter animate-pulse z-10">📹</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest z-10">{cctv.camera}</span>
                  <span className="text-[9px] font-mono text-slate-500 z-10">{cctv.timestamp}</span>
                </div>
              ) : isAudio ? (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 gap-3 select-none">
                  <span className="text-3xl filter animate-pulse">🎙️</span>
                  <div className="bg-slate-900 border border-white/5 rounded-xl p-2 flex items-center gap-2 w-full max-w-[200px] shadow-lg">
                    <div className="w-5 h-5 rounded-full bg-brand-blue flex items-center justify-center text-white shrink-0">
                      <svg className="w-2 h-2 fill-current ml-0.5" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    <div className="flex-grow flex items-center gap-0.5 h-3">
                      {[15, 35, 55, 20, 40, 50, 30, 20, 10, 25].map((height, i) => (
                        <div 
                          key={i} 
                          className="flex-grow rounded-full" 
                          style={{ 
                            height: `${height}%`,
                            backgroundColor: i < 3 ? '#3b82f6' : 'rgba(255, 255, 255, 0.2)'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <span className="text-3xl filter grayscale group-hover/img:scale-110 transition-transform duration-300">📷</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No photo generated</span>
                </>
              )}
            </div>
          )}

          {/* CCTV/Audio Overlays */}
          {clue.static_image_url && isCctv && (
            <div className="absolute inset-0 bg-black/10 pointer-events-none flex flex-col justify-between p-3 select-none font-mono text-[9px] text-white z-10">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />
              <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]" />
              <div className="flex justify-between items-center z-10">
                <div className="flex items-center gap-1.5 bg-black/50 px-2 py-0.5 rounded text-red-500 font-bold uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-pulse"></span>
                  <span>REC</span>
                </div>
                <div className="bg-black/50 px-2 py-0.5 rounded text-slate-300 font-bold">
                  {cctv.camera}
                </div>
              </div>
              <div className="flex justify-between items-end z-10">
                <div className="bg-black/50 px-2 py-0.5 rounded text-slate-300 font-bold">
                  {cctv.timestamp}
                </div>
                <div className="bg-black/50 px-2 py-0.5 rounded text-slate-400 font-bold uppercase tracking-wider">
                  4K 30FPS
                </div>
              </div>
            </div>
          )}

          {clue.static_image_url && isAudio && (
            <div className="absolute inset-0 bg-black/25 pointer-events-none flex flex-col justify-end p-4 select-none z-10">
              <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]" />
              <div className="bg-slate-950/85 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md flex items-center gap-3.5 z-10 w-full shadow-lg">
                <div className="w-7 h-7 rounded-full bg-brand-blue flex items-center justify-center text-white shadow-md shrink-0">
                  <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <div className="flex-grow flex items-center gap-0.5 h-5">
                  {[15, 30, 45, 20, 35, 55, 40, 25, 50, 60, 35, 20, 45, 30, 15, 25, 40, 50, 30, 20].map((height, i) => (
                    <div 
                      key={i} 
                      className="flex-grow rounded-full" 
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: i < 7 ? '#3b82f6' : 'rgba(255, 255, 255, 0.25)'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Fade-to-Black Gradient Overlay (Blends image into description) */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-none z-10" />

          {/* Clue Type Overlay (Top Left) */}
          <div className="absolute top-4 left-4 px-3 py-1 bg-black/60 border border-white/10 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest text-white z-20">
            {clue.clue_type || 'Evidence'}
          </div>

          {/* Edit & Star Action Overlays (Top Right) */}
          <div className="absolute top-4 right-4 flex items-center gap-1 z-20">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="w-8 h-8 flex items-center justify-center text-brand-pink hover:scale-105 active:scale-95 transition-all"
              title="Edit Details"
            >
              <svg className="w-5 h-5 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
              </svg>
            </button>
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                await updateClueAction(mysteryId, clue.id, { is_essential: !clue.is_essential });
              }}
              className={`w-8 h-8 flex items-center justify-center transition-all ${
                clue.is_essential 
                  ? 'text-yellow-500 filter drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={clue.is_essential ? 'Essential Clue' : 'Mark as Essential'}
            >
              <svg className="w-5 h-5 fill-current stroke-current" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 2. Text Content Area (Solid Black) */}
        <div className="flex-grow flex flex-col p-6 pt-3 bg-black z-10 relative">
          {/* Header Details */}
          {formatted.header && (
            <div className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-1">
              ✦ {formatted.header}
            </div>
          )}

          {/* Meta Details */}
          {formatted.meta && (
            <div className="text-xs font-bold text-white mb-2 leading-relaxed">
              {formatted.meta}
            </div>
          )}

          {/* Clue Content */}
          <div className="text-xs font-semibold text-white/95 leading-relaxed whitespace-pre-line mb-6 flex-grow select-text">
            {formatted.content || hydratedDesc}
          </div>

          {/* Footer (Delete on left, Beat / Status on right) */}
          <div className="flex justify-between items-center mt-auto pt-4 border-t border-neutral-900">
            <button 
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm('Delete this evidence record?')) {
                  setIsDeleting(true);
                  await removeClueAction(mysteryId, clue.id);
                }
              }}
              disabled={isDeleting}
              className="text-[9px] font-black text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50 uppercase tracking-widest"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
            
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-pink select-none text-right">
              {linkedBeat ? (
                `Beat ${linkedBeat.beat_number} | Real`
              ) : linkedSubplotBeat ? (
                `Subplot ${linkedSubplotBeat.beat_number} | Sub`
              ) : (
                'Fake Clue'
              )}
            </div>
          </div>
        </div>
      </div>

      {isEditing && (
        <ClueEditor 
          clue={clue}
          mysteryId={mysteryId}
          beats={beats}
          characters={characters}
          subplots={subplots}
          onClose={handleCloseEditor}
        />
      )}
    </>
  );
}
