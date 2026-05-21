import React from 'react';
import { getMysteryById, getCluesByMysteryId, getCharactersByMysteryId } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { hydrateTextWithCharacters } from '@/utils/hydration';

export default async function PrintCluesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const [mystery, clues, characters] = await Promise.all([
    getMysteryById(id),
    getCluesByMysteryId(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return notFound();

  // Sort clues by round, placing unassigned clues in Round 1 by default
  const cluesByRound: { [key: number]: any[] } = { 1: [], 2: [], 3: [] };
  
  clues.forEach(clue => {
    const round = clue.round_number || 1;
    if (!cluesByRound[round]) {
      cluesByRound[round] = [];
    }
    cluesByRound[round].push(clue);
  });

  return (
    <div className="bg-slate-900 text-slate-100 min-h-screen font-sans selection:bg-[#FF1493] selection:text-white print:bg-white print:text-black">
      
      {/* Web-only floating control panel */}
      <div className="fixed bottom-6 right-6 z-50 flex gap-4 print:hidden">
        <Link 
          href={`/${locale}/builder/mysteries/${id}/compile`}
          className="px-6 py-3 bg-slate-800 text-slate-200 rounded-xl font-bold uppercase tracking-wider text-xs border border-slate-700 hover:bg-slate-700 transition-all shadow-xl flex items-center gap-2"
        >
          ← Back to Studio
        </Link>
        <button 
          className="px-6 py-3 bg-[#FF1493] text-white rounded-xl font-bold uppercase tracking-wider text-xs hover:bg-[#FF3366] transition-all shadow-xl shadow-[#FF1493]/20 flex items-center gap-2"
          id="web-print-btn"
        >
          🖨️ Print Clues Pack
        </button>
      </div>

      {/* Screen view layout helper notice */}
      <div className="bg-gradient-to-r from-[#FF1493] to-[#4169E1] text-white px-8 py-3 text-center text-sm font-bold tracking-wide shadow-md print:hidden flex items-center justify-center gap-2">
        <span>✨ <strong>Print Preview Mode</strong> — This page is formatted specifically for A4/Letter printing. Press <strong>Cmd+P</strong> or <strong>Ctrl+P</strong> to save as PDF.</span>
      </div>

      {/* Title / Cover Page */}
      <div className="print:break-after-page min-h-screen flex flex-col justify-between p-12 md:p-24 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        {/* Aesthetic background mesh (web only) */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-[#FF1493]/10 to-[#4169E1]/10 rounded-full blur-[120px] -z-10 print:hidden" />

        {/* Cover Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl print:text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-widest text-xs uppercase text-slate-400 print:text-slate-600">Back Pocket Mysteries</span>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
            Game Clue Cards
          </span>
        </div>

        {/* Big centered title section */}
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

        {/* Instructions at the bottom */}
        <div className="border-t border-slate-800 pt-8 mt-auto print:border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#FF1493] uppercase tracking-widest mb-2">1. Cut Out Clues</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Follow the dotted cut lines. Keeping the clues uniform makes distributing them easy and keeps secrets intact.</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#4169E1] uppercase tracking-widest mb-2">2. Group in Envelopes</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Sort cards into three separate envelopes: "Round 1 Clues", "Round 2 Clues", and "Round 3 Clues". Do not let players see clues early!</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-[#9370DB] uppercase tracking-widest mb-2">3. Distribute & Sleuth</span>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Give each player their clues at the start of each round. Encourage them to share the rumors, records, or statements with others.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clues for each Round */}
      {[1, 2, 3].map(roundNum => {
        const roundClues = cluesByRound[roundNum] || [];
        if (roundClues.length === 0) return null;

        return (
          <div key={roundNum} className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
            
            {/* Round Title Header */}
            <div className="flex justify-between items-end border-b border-slate-800 pb-6 mb-12 print:border-slate-300 print:mb-8">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">
                  Round {roundNum} Clue Cards
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">
                  {roundNum === 1 && "Initial discoveries and suspicious observations."}
                  {roundNum === 2 && "Hidden connections, secrets, and financial tracks."}
                  {roundNum === 3 && "Smoking guns, incriminating text leaks, and final evidence."}
                </p>
              </div>
              <span className="text-xs font-black text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full uppercase tracking-widest print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                {roundClues.length} Cards
              </span>
            </div>

            {/* Clue Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2">
              {roundClues.map((clue, idx) => {
                const colors = ['#FF1493', '#4169E1', '#9370DB', '#00CED1'];
                const cardColor = colors[idx % colors.length];

                return (
                  <div 
                    key={clue.id} 
                    className="relative border-2 border-dashed border-slate-700 rounded-3xl p-8 bg-slate-900/60 shadow-xl overflow-hidden flex flex-col justify-between print:border-slate-400 print:bg-white print:shadow-none print:rounded-2xl print:border-[1px] print:p-6"
                    style={{ minHeight: '360px' }}
                  >
                    {/* Dotted cutting outline (web-only help tag) */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-[9px] font-black uppercase text-slate-600 tracking-wider flex items-center gap-1 print:hidden select-none">
                      <span>✂️</span> <span>Cut Dotted Card Border</span> <span>✂️</span>
                    </div>

                    <div className="space-y-4 mt-2">
                      <div className="flex justify-between items-start">
                        <span 
                          className="text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-widest border"
                          style={{ 
                            color: cardColor, 
                            borderColor: cardColor,
                            backgroundColor: `${cardColor}08`
                          }}
                        >
                          {clue.clue_type ? clue.clue_type.toUpperCase() : 'EVIDENCE'}
                        </span>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider print:text-slate-400">
                          R{roundNum} • CARD {idx + 1}
                        </span>
                      </div>

                      <h3 className="text-xl font-black text-white tracking-tight leading-snug print:text-slate-900">
                        {hydrateTextWithCharacters(clue.title || '', characters, 'print')}
                      </h3>

                      <p className="text-sm font-medium text-slate-300 leading-relaxed print:text-slate-800 print:text-xs">
                        {hydrateTextWithCharacters(clue.description || '', characters, 'print') || "A suspicious piece of evidence has been recovered. It implies deeper connections, but who does it belong to?"}
                      </p>
                    </div>

                    {/* Card Footer detail */}
                    <div className="border-t border-slate-800/80 pt-4 mt-6 flex justify-between items-center text-[10px] font-black text-slate-500 print:border-slate-200">
                      <span className="uppercase tracking-widest">Back Pocket Mysteries</span>
                      {clue.is_essential && (
                        <span className="text-[#FF1493] tracking-widest uppercase">★ Essential Clue</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Auto-print script wired with window setup delay */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 1500);

          const btn = document.getElementById('web-print-btn');
          if (btn) {
            btn.onclick = function() {
              window.print();
            };
          }
        }
      ` }} />
    </div>
  );
}
