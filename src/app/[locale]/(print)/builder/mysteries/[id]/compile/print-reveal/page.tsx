import React from 'react';
import { getMysteryById, getCluesByMysteryId, getCharactersByMysteryId, getPlotBeatsByMysteryId } from '@/services/mysteries';
import { getSubplotsByMysteryId } from '@/services/subplots';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PrintRevealPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const [mystery, clues, characters, plotBeats, subplots] = await Promise.all([
    getMysteryById(id),
    getCluesByMysteryId(id),
    getCharactersByMysteryId(id),
    getPlotBeatsByMysteryId(id),
    getSubplotsByMysteryId(id)
  ]);

  if (!mystery) return notFound();

  // Find crucial entities
  const victim = characters.find((c: any) => c.is_victim || c.plot_role === 'victim');
  const killer = characters.find((c: any) => c.plot_role === 'killer');
  const assistant = characters.find((c: any) => c.plot_role === 'assistant');

  // Map characters by ID for fast lookup
  const characterMap = new Map(characters.map((c: any) => [c.id, c]));

  // Get killer motive explanation
  const killerMotive = killer?.motives?.find((m: any) => m.linked_character_id === victim?.id) || killer?.motives?.[0];

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-[#FF1493] selection:text-white print:bg-white print:text-black">
      
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
          🖨️ Print Reveal Pack
        </button>
      </div>

      {/* Screen view layout helper notice */}
      <div className="bg-gradient-to-r from-red-600 to-[#FF1493] text-white px-8 py-3 text-center text-sm font-bold tracking-wide shadow-md print:hidden flex items-center justify-center gap-2">
        <span>🚨 <strong>SPOILER WARNING</strong> — This page contains the master solution to the mystery. Protect the secrets!</span>
      </div>

      {/* Title / Cover Page */}
      <div className="print:break-after-page min-h-screen flex flex-col justify-between p-12 md:p-24 relative overflow-hidden bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        {/* Aesthetic background glow (web only) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[140px] -z-10 print:hidden" />

        {/* Cover Header */}
        <div className="flex justify-between items-center border-b border-slate-900 pb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl print:text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-widest text-xs uppercase text-slate-500 print:text-slate-600">Back Pocket Mysteries</span>
          </div>
          <span className="text-xs font-bold bg-red-950 text-red-500 px-3 py-1 rounded-full uppercase tracking-wider border border-red-900/30 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
            Top Secret
          </span>
        </div>

        {/* Big centered warning & title section */}
        <div className="my-auto text-center max-w-3xl mx-auto py-12 space-y-8">
          <div className="inline-block px-6 py-2 bg-red-900/20 text-red-500 border border-red-900/40 rounded-full text-xs font-black uppercase tracking-widest print:bg-slate-100 print:text-slate-800 print:border-slate-300">
            ⚠️ DO NOT OPEN UNTIL ACCUSATIONS ARE MADE
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none print:text-slate-900 print:text-5xl">
            The Master Reveal & Solution
          </h1>
          
          <h2 className="text-xl md:text-2xl font-black text-slate-400 uppercase tracking-widest print:text-slate-600 print:text-base">
            {mystery.title}
          </h2>

          <div className="w-24 h-0.5 bg-red-600 mx-auto print:bg-slate-400"></div>

          <p className="text-slate-500 text-sm leading-relaxed max-w-xl mx-auto print:text-slate-700">
            This pack contains the step-by-step master breakdown connecting the clues to plot beats, revealing subplots and red herrings, and laying out the final solution of the mystery.
          </p>
        </div>

        {/* Instructions at the bottom */}
        <div className="border-t border-slate-900 pt-8 mt-auto print:border-slate-300 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Back Pocket Games</span>
          <span className="uppercase tracking-widest">Confidential Host Document</span>
        </div>
      </div>

      {/* The Master Reveal / Summary Page */}
      <div className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="flex justify-between items-end border-b border-slate-800 pb-6 print:border-slate-300">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">01. The Master Crime Solution</h2>
              <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">The core breakdown of the crime details and the actors behind it.</p>
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">The Core Solution</span>
          </div>

          {/* Victim, Killer, Assistant Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-black text-[#FF1493] uppercase tracking-widest block mb-2">🩸 The Victim</span>
              <h3 className="text-xl font-bold text-white mb-2 print:text-black">
                {victim ? (victim.name.split('|')[0] || victim.name) : "No victim assigned"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">
                {victim ? (victim.profile_data?.bio || victim.archetype || "The tragic focal point of the night.") : "Configure a victim in characters."}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 ring-2 ring-red-600/30 print:bg-slate-50 print:border-slate-300 print:ring-0">
              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest block mb-2">🔪 The Killer</span>
              <h3 className="text-xl font-bold text-white mb-2 print:text-black">
                {killer ? (killer.name.split('|')[0] || killer.name) : "No killer assigned"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">
                {killer ? (killer.profile_data?.bio || killer.archetype || "The perpetrator hiding in plain sight.") : "Configure a killer in characters."}
              </p>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 print:bg-slate-50 print:border-slate-300">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-2">🤝 The Accomplice / Key Witness</span>
              <h3 className="text-xl font-bold text-white mb-2 print:text-black">
                {assistant ? (assistant.name.split('|')[0] || assistant.name) : "None"}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">
                {assistant ? (assistant.profile_data?.bio || assistant.archetype || "Assisted in the cover-up or knows too much.") : "No secondary helper assigned."}
              </p>
            </div>
          </div>

          {/* Motive Details */}
          {killer && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 print:bg-slate-50 print:border-slate-300 print:p-6 space-y-4">
              <h4 className="text-lg font-black text-white uppercase tracking-tight print:text-black flex items-center gap-2">
                <span>💭</span> Killer Motive & Intent
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                <strong>{killer.name.split('|')[0] || killer.name}</strong> was driven to eliminate the victim due to:
              </p>
              {killerMotive ? (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl print:bg-white print:border-slate-300">
                  <span className="block text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">
                    {killerMotive.motive_type || 'SECRET GRUDGE'}
                  </span>
                  <p className="text-sm text-slate-200 italic print:text-slate-900">
                    &ldquo;{killerMotive.description}&rdquo;
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 print:text-slate-700 italic">No specific motive records found in the database. Rely on the character bio and story plot points.</p>
              )}
            </div>
          )}

          {/* Crime Details Narrative */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-white uppercase tracking-wider print:text-black">The Master Narrative</h4>
            <p className="text-sm text-slate-400 leading-relaxed print:text-slate-800">
              Below is the step-by-step master breakdown of how the crime unfolded, linking specific clues to timeline beats.
            </p>
          </div>

        </div>
      </div>

      {/* Main Plot Beats Walkthrough */}
      <div className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="flex justify-between items-end border-b border-slate-800 pb-6 print:border-slate-300">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">02. Plot Beats & Clue Beat Matrix</h2>
              <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">Chronological list of events and the evidence proving them.</p>
            </div>
            <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Story Steps</span>
          </div>

          <div className="space-y-10">
            {plotBeats.length > 0 ? (
              plotBeats.map((beat: any, idx: number) => {
                // Find clues linked to this beat
                const linkedClues = clues.filter(c => c.linked_plot_beat_id === beat.id);

                return (
                  <div key={beat.id} className="relative border-l-2 border-slate-850 pl-8 space-y-4 print:border-slate-300">
                    {/* Circle Node */}
                    <span className="absolute -left-[9px] top-1.5 w-4 h-4 rounded-full bg-red-600"></span>
                    
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">
                          Beat {beat.beat_number || (idx + 1)}
                        </span>
                        {beat.is_required && (
                          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[8px] font-bold uppercase tracking-widest rounded-md text-slate-400 print:bg-slate-100 print:border-slate-300 print:text-slate-700">
                            Essential
                          </span>
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-white print:text-black mt-1">
                        {beat.event_title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-2 leading-relaxed print:text-slate-700">
                        {beat.description}
                      </p>
                    </div>

                    {/* Involved Characters */}
                    {beat.characters_involved && beat.characters_involved.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Characters Involved:</span>
                        {beat.characters_involved.map((charId: string) => {
                          const char = characterMap.get(charId) as any;
                          if (!char) return null;
                          return (
                            <span 
                              key={charId} 
                              className="px-3 py-1 bg-slate-900 text-xs font-bold text-slate-300 rounded-lg border border-slate-850 print:bg-slate-100 print:border-slate-350 print:text-slate-900"
                            >
                              {char.name.split('|')[0] || char.name}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    {/* Linked Clues */}
                    {linkedClues.length > 0 && (
                      <div className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl space-y-3 print:bg-slate-50 print:border-slate-300 print:p-3">
                        <span className="block text-[10px] font-black text-red-500 uppercase tracking-widest">Linked Clues for this beat:</span>
                        <div className="grid grid-cols-1 gap-3">
                          {linkedClues.map(c => (
                            <div key={c.id} className="border-l-2 border-red-600 pl-4 space-y-1">
                              <strong className="text-sm text-white print:text-slate-900 block">{c.title}</strong>
                              <p className="text-xs text-slate-400 print:text-slate-600 leading-relaxed">{c.description}</p>
                              {c.internal_notes && (
                                <p className="text-[10px] italic text-[#FF1493] bg-slate-950 p-2 rounded-lg border border-slate-900/50 print:bg-white print:border-slate-200">
                                  <strong>Host note:</strong> {c.internal_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 print:text-slate-700 italic">No timeline beats mapped for this mystery yet.</p>
            )}
          </div>

        </div>
      </div>

      {/* Subplots & Red Herrings */}
      {subplots.length > 0 && (
        <div className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
          <div className="max-w-4xl mx-auto space-y-12">
            
            <div className="flex justify-between items-end border-b border-slate-800 pb-6 print:border-slate-300">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">03. Subplots & Red Herrings</h2>
                <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">The side drama and fake clues meant to deceive the investigators.</p>
              </div>
              <span className="text-[10px] font-black text-[#FF1493] uppercase tracking-widest">Red Herrings</span>
            </div>

            <div className="space-y-12">
              {subplots.map((sub: any) => {
                const pChar = characterMap.get(sub.primary_character_id) as any;
                const sChar = characterMap.get(sub.secondary_character_id) as any;
                
                // Find clues linked to beats of this subplot
                const subplotBeatIds = sub.subplot_beats?.map((b: any) => b.id) || [];
                const linkedClues = clues.filter(c => c.linked_subplot_beat_id && subplotBeatIds.includes(c.linked_subplot_beat_id));

                return (
                  <div key={sub.id} className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6 print:bg-slate-50 print:border-slate-300 print:p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-white print:text-black">{sub.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1 print:text-slate-700 uppercase tracking-wider">
                          Theme: {sub.theme || "Side Secret"}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold px-3 py-1 bg-red-950 text-red-500 border border-red-900/30 rounded-full uppercase tracking-wider print:bg-slate-100 print:text-slate-900 print:border-slate-300">
                        Fake Lead
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed print:text-slate-800">
                      {sub.description}
                    </p>

                    <div className="flex gap-4 items-center border-t border-slate-900 pt-4 print:border-slate-200">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Involved:</span>
                      {pChar && (
                        <span className="text-xs font-bold text-white print:text-slate-900">
                          {pChar.name.split('|')[0]}
                        </span>
                      )}
                      {sChar && (
                        <>
                          <span className="text-xs text-slate-600">&amp;</span>
                          <span className="text-xs font-bold text-white print:text-slate-900">
                            {sChar.name.split('|')[0]}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Subplot Beats */}
                    {sub.subplot_beats && sub.subplot_beats.length > 0 && (
                      <div className="space-y-3 mt-4">
                        <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Subplot Narrative Beats:</span>
                        <div className="space-y-2">
                          {sub.subplot_beats.map((beat: any) => (
                            <div key={beat.id} className="text-xs text-slate-400 print:text-slate-700 flex gap-2">
                              <span className="text-slate-600 font-bold">Beat {beat.beat_number}:</span>
                              <span>{beat.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fake Clues */}
                    {linkedClues.length > 0 && (
                      <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 space-y-4 print:bg-white print:border-slate-300 print:p-4">
                        <span className="block text-[10px] font-black text-[#FF1493] uppercase tracking-widest">
                          🚨 Fake Clues / Red Herring Cards:
                        </span>
                        <div className="grid grid-cols-1 gap-4">
                          {linkedClues.map(c => (
                            <div key={c.id} className="space-y-1">
                              <span className="text-xs font-bold text-white print:text-slate-900 block">{c.title}</span>
                              <p className="text-xs text-slate-400 print:text-slate-600 leading-relaxed">{c.description}</p>
                              {c.internal_notes && (
                                <p className="text-[10px] italic text-amber-500 print:text-slate-700">
                                  <strong>How this misleads:</strong> {c.internal_notes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

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
