'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { hydrateTextWithCharacters } from '@/utils/hydration';
import { stripCustomerFacingTitle } from '@/utils/clue-format';

// Helper function to format clue descriptions for printed cards
function formatClueDescriptionForPrint(hydratedText: string) {
  if (!hydratedText) return { header: 'EVIDENCE', meta: '', content: '' };
  
  const lines = hydratedText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^context(?:\s*\/\s*participants)?\s*:/i.test(l));
  
  let header = 'EVIDENCE';
  let meta = '';
  let contentLines: string[] = [];
  
  let currentLineIdx = 0;
  
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
    header = lines[0].replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '').trim().toUpperCase();
    currentLineIdx = 1;
  } else if (lines[0] && lines[0].toUpperCase() === lines[0] && lines[0].length < 40) {
    header = lines[0];
    currentLineIdx = 1;
  }
  
  const hasRecipient = lines.some(l => l.startsWith('Recipient:'));
  const metaLines: string[] = [];
  while (currentLineIdx < lines.length) {
    const line = lines[currentLineIdx];
    if (
      (hasRecipient && line.startsWith('Sender:')) || 
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
  
  contentLines = lines.slice(currentLineIdx).map(line => {
    let cleaned = line.replace(/^[A-Za-z0-9]{1,3}\s*\[([^\]]+)\]\s*:/, '$1:');
    if (/\[strikethrough\]/i.test(cleaned)) {
      cleaned = cleaned
        .replace(/^[•\-*]\s*/, '☑ ')
        .replace(/\s*\[strikethrough\]\s*/gi, ' (Done)');
    }
    return cleaned;
  });
  
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

interface PrintCluesClientProps {
  mystery: any;
  clues: any[];
  characters: any[];
  locale: string;
}

export function PrintCluesClient({ mystery, clues, characters, locale }: PrintCluesClientProps) {
  const [selectedClue, setSelectedClue] = useState<any | null>(null);

  // Sort clues by round
  const cluesByRound: { [key: number]: any[] } = { 1: [], 2: [], 3: [], 4: [] };
  clues.forEach(clue => {
    const round = clue.round_number || 1;
    if (!cluesByRound[round]) {
      cluesByRound[round] = [];
    }
    cluesByRound[round].push(clue);
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans selection:bg-[#FF1493] selection:text-white print:bg-white print:text-black">
      
      {/* Web-only floating control panel */}
      <div className="fixed bottom-6 right-6 z-50 flex gap-4 print:hidden">
        <Link 
          href={`/${locale}/builder/mysteries/${mystery.id}/compile`}
          className="px-6 py-3 bg-slate-800 text-slate-200 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-700 hover:bg-slate-700 transition-all shadow-xl flex items-center gap-2"
        >
          ← Back to Studio
        </Link>
        <button 
          onClick={handlePrint}
          className="px-6 py-3 bg-[#FF1493] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#FF3366] transition-all shadow-xl shadow-[#FF1493]/20 flex items-center gap-2"
        >
          🖨️ Print Clues Pack
        </button>
      </div>

      {/* Screen view layout helper notice */}
      <div className="bg-gradient-to-r from-[#FF1493] to-[#4169E1] text-white px-8 py-3 text-center text-sm font-bold tracking-wide shadow-md print:hidden flex items-center justify-center gap-2">
        <span>✨ <strong>Print Preview Mode</strong> — This page is formatted specifically for A4/Letter printing. Click any Polaroid to inspect clue details.</span>
      </div>

      {/* Title / Cover Page */}
      <div className="print:break-after-page min-h-screen flex flex-col justify-between p-12 md:p-24 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#FF1493]/10 to-[#4169E1]/10 rounded-full blur-[120px] -z-10 print:hidden" />

        <div className="flex justify-between items-center border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl print:text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-widest text-xs uppercase text-slate-400 print:text-slate-600">Back Pocket Mysteries</span>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
            Game Clue Cards
          </span>
        </div>

        <div className="my-auto max-w-4xl py-12">
          <span className="text-xs font-black tracking-widest text-[#FF1493] uppercase block mb-2">Mystery Materials</span>
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 uppercase leading-none print:text-slate-900 print:text-5xl">
            The Evidence Board
          </h1>
          <h2 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1493] to-[#4169E1] uppercase tracking-widest mb-6 print:text-[#FF1493] print:text-lg">
            {mystery.title}
          </h2>
          <p className="text-slate-400 text-base max-w-xl leading-relaxed print:text-slate-600 print:text-sm">
            This booklet contains all Clue Cards required for the game, sorted by Round. As the host, you should cut these cards out beforehand and distribute them at the beginning of each respective round.
          </p>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-auto print:border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#FF1493] uppercase tracking-widest mb-2">1. Cut Out Clues</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Follow the dotted cut lines. Keeping the clues uniform makes distributing them easy and keeps secrets intact.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#4169E1] uppercase tracking-widest mb-2">2. Group in Envelopes</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Sort cards into separate envelopes by round ("Round 1 Clues", "Round 2 Clues", etc.). Do not let players see clues early!</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#9370DB] uppercase tracking-widest mb-2">3. Distribute & Sleuth</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Give each player their clues at the start of each round. Encourage them to share the rumors, records, or statements with others.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clues for each Round */}
      {[1, 2, 3, 4].map(roundNum => {
        const roundClues = cluesByRound[roundNum] || [];
        if (roundClues.length === 0) return null;

        return (
          <div key={roundNum} className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
            
            <div className="flex justify-between items-end border-b border-slate-800 pb-6 mb-12 print:border-slate-300 print:mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">
                  Round {roundNum} Clue Cards
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">
                  {roundNum === 1 && "Initial discoveries and suspicious observations."}
                  {roundNum === 2 && "Hidden connections, secrets, and financial tracks."}
                  {roundNum === 3 && "Smoking guns, incriminating text leaks, and final evidence."}
                  {roundNum === 4 && "Final confessions and recovered smoking-gun recordings."}
                </p>
              </div>
              <span className="text-xs font-black text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-widest print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                {roundClues.length} Cards
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
              {roundClues.map((clue, idx) => {
                const colors = ['#FF1493', '#4169E1', '#9370DB', '#00CED1'];
                const cardColor = colors[idx % colors.length];

                const hydratedTitle = stripCustomerFacingTitle(
                  hydrateTextWithCharacters(clue.title || '', characters, 'print')
                );
                const hydratedDesc = hydrateTextWithCharacters(clue.description || '', characters, 'print');
                const formatted = formatClueDescriptionForPrint(hydratedDesc);
                
                const isAudio = isAudioClue(clue);
                const isCctv = isCctvOrVideoClue(clue) && !isAudio;
                const cctv = parseCctvMetadata(clue);

                return (
                  <div 
                    key={clue.id} 
                    className="relative border-2 border-dashed border-slate-700 rounded-3xl p-6 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col justify-between print:border-slate-400 print:bg-white print:shadow-none print:rounded-2xl print:border-[1px] print:p-6"
                    style={{ minHeight: '450px' }}
                  >
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1 print:hidden select-none">
                      <span>✂️</span> <span>Cut Dotted Card Border</span> <span>✂️</span>
                    </div>

                    <div className="flex flex-col h-full">
                      {/* Polaroid Wrapper */}
                      <div 
                        onClick={() => setSelectedClue(clue)}
                        className="bg-[#fcfbf9] p-3 pb-7 rounded-sm shadow-md border border-neutral-300/40 flex flex-col hover:scale-[1.02] transition-transform duration-300 cursor-pointer group select-none text-neutral-800 mb-4 shrink-0 print:shadow-none"
                      >
                        <div className="relative h-36 w-full bg-neutral-950 overflow-hidden border border-neutral-300/40">
                          {clue.static_image_url ? (
                            <div className="relative w-full h-full">
                              <img 
                                src={clue.static_image_url} 
                                alt={hydratedTitle} 
                                className="w-full h-full object-cover" 
                              />
                              {isCctv && (
                                <div className="absolute inset-0 bg-black/10 pointer-events-none flex flex-col justify-between p-2 select-none font-mono text-[8px] text-white z-10">
                                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-15" />
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-1 bg-black/55 px-1 rounded text-red-500 font-bold">
                                      <span className="w-1 h-1 rounded-full bg-red-500 inline-block animate-pulse"></span>
                                      <span>REC</span>
                                    </div>
                                    <div className="bg-black/55 px-1 rounded text-slate-300 font-bold">
                                      {cctv.camera}
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <div className="bg-black/55 px-1 rounded text-slate-300 font-bold">
                                      {cctv.timestamp}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-950 flex flex-col items-center justify-center gap-2 relative">
                              {isCctv ? (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-1.5 select-none">
                                  <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-20" />
                                  <span className="text-2xl filter animate-pulse z-10">📹</span>
                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest z-10">{cctv.camera}</span>
                                  <span className="text-[7px] font-mono text-slate-500 z-10">{cctv.timestamp}</span>
                                </div>
                              ) : isAudio ? (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-3 gap-2 select-none">
                                  <span className="text-2xl filter animate-pulse">🎙️</span>
                                  <div className="bg-slate-900 border border-white/5 rounded-lg p-1.5 flex items-center gap-1.5 w-full max-w-[140px] shadow-md">
                                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                                      <svg className="w-1.5 h-1.5 fill-current ml-0.5" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </div>
                                    <div className="flex-grow flex items-center gap-0.5 h-2">
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
                                  <span className="text-2xl filter grayscale">📷</span>
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">No photo generated</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Text under Polaroid photo */}
                        <div className="mt-2 flex flex-col items-center justify-center text-center px-1">
                          <span className="font-mono text-[7px] uppercase tracking-wider text-neutral-400">
                            Round {roundNum} • Clue {idx + 1}
                          </span>
                          <span className="font-serif italic text-neutral-800 text-[10px] mt-0.5 font-bold tracking-tight line-clamp-1">
                            {hydratedTitle}
                          </span>
                        </div>
                      </div>

                      {/* Header Details */}
                      <div className="space-y-1.5 shrink-0">
                        <div className="flex justify-between items-center">
                          <span 
                            className="text-[9px] font-black uppercase tracking-wider"
                            style={{ color: cardColor }}
                          >
                            {formatted.header}
                          </span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider print:text-slate-400">
                            R{roundNum} • CARD {idx + 1}
                          </span>
                        </div>
                        
                        {formatted.meta && (
                          <div className="text-[10px] font-black text-slate-400 print:text-slate-500 leading-tight">
                            {formatted.meta}
                          </div>
                        )}
                      </div>

                      {/* Clue Content */}
                      <div className="flex-grow my-4 overflow-hidden">
                        <p className="text-xs font-medium text-slate-300 print:text-slate-800 leading-relaxed whitespace-pre-line">
                          {formatted.content || hydratedDesc}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="border-t border-slate-800/80 pt-3 mt-auto flex justify-between items-center text-[9px] font-black text-slate-500 print:border-slate-200 shrink-0 select-none">
                        <span className="uppercase tracking-widest">Back Pocket Mysteries</span>
                        <span style={{ color: cardColor }} className="tracking-widest uppercase">
                          Clue {idx + 1} | Round {roundNum}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Clue Details Modal (Only shown on screen) */}
      {selectedClue && (() => {
        const hydratedTitle = stripCustomerFacingTitle(
          hydrateTextWithCharacters(selectedClue.title || 'Evidence', characters, 'print')
        );
        const hydratedDesc = hydrateTextWithCharacters(selectedClue.description || '', characters, 'print');
        const isCctv = isCctvOrVideoClue(selectedClue);
        const isAudio = isAudioClue(selectedClue);
        const cctv = parseCctvMetadata(selectedClue);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/85 backdrop-blur-[3px] animate-in fade-in duration-200 print:hidden">
            <div className="absolute inset-0" onClick={() => setSelectedClue(null)} />
            
            <div className="relative bg-[#0d131f] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] z-10 animate-in zoom-in-95 duration-200">
              
              {/* Image Frame */}
              <div className="relative aspect-[4/3] w-full bg-slate-950 shrink-0">
                {selectedClue.static_image_url ? (
                  <img
                    src={selectedClue.static_image_url}
                    alt={hydratedTitle}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex items-center justify-center">
                    {isCctv ? (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-2 select-none">
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_50%,rgba(0,0,0,0.15)_50%)] bg-[length:100%_4px] opacity-25" />
                        <span className="text-4xl filter animate-pulse z-10">📹</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest z-10">{cctv.camera}</span>
                        <span className="text-[10px] font-mono text-slate-500 z-10">{cctv.timestamp}</span>
                      </div>
                    ) : isAudio ? (
                      <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 gap-3 select-none">
                        <span className="text-4xl filter animate-pulse">🎙️</span>
                        <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex items-center gap-3 w-full max-w-[200px] shadow-lg">
                          <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0 animate-pulse">
                            <svg className="w-2.5 h-2.5 fill-current ml-0.5" viewBox="0 0 24 24">
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
                      <span className="text-4xl opacity-30">🔍</span>
                    )}
                  </div>
                )}
                {/* Close */}
                <button
                  onClick={() => setSelectedClue(null)}
                  className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 border border-white/10 text-white flex items-center justify-center text-sm font-bold transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 md:p-8 flex-grow overflow-y-auto flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-brand-pink/10 text-brand-pink border border-brand-pink/20">
                    Round {selectedClue.round_number || 1} Evidence
                  </span>
                  {selectedClue.clue_type && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {selectedClue.clue_type}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-black text-white tracking-tight uppercase mb-4 border-b border-white/5 pb-3">
                  {hydratedTitle}
                </h3>
                
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 text-sm font-semibold text-slate-300 leading-relaxed font-sans whitespace-pre-line overflow-y-auto">
                  {hydratedDesc}
                </div>
              </div>
              
            </div>
          </div>
        );
      })()}
    </div>
  );
}
