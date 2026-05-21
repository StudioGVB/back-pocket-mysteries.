import React from 'react';
import { getMysteryById, getCharactersByMysteryId } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PrintOverviewPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return notFound();

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
          🖨️ Print Overview Pack
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
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-brand-blue/10 to-[#9370DB]/10 rounded-full blur-[100px] -z-10 print:hidden" />

        {/* Cover Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl print:text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-widest text-xs uppercase text-slate-400 print:text-slate-600">Back Pocket Mysteries</span>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
            Host Game Kit
          </span>
        </div>

        {/* Big centered title section */}
        <div className="my-auto max-w-4xl py-12">
          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-4 uppercase leading-none print:text-slate-900 print:text-5xl">
            {mystery.title}
          </h1>
          <h2 className="text-xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1493] to-[#4169E1] uppercase tracking-widest mb-12 print:text-[#FF1493] print:text-lg">
            {mystery.theme || "A Custom Murder Mystery Experience"}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mt-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Players Required</span>
              <span className="text-xl font-bold text-white print:text-black">{mystery.min_players || characters.length} - {mystery.max_players || characters.length} guests</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Game Complexity</span>
              <span className="text-xl font-bold text-white capitalize print:text-black">{mystery.complexity || "Standard"}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Spice / Tone</span>
              <span className="text-xl font-bold text-white capitalize print:text-black">{mystery.spice_level || "Teens & Up"}</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Format</span>
              <span className="text-xl font-bold text-white print:text-black">Print-to-Play PDF</span>
            </div>
          </div>
        </div>

        {/* Plot Synopsis at the bottom of Cover page */}
        <div className="border-t border-slate-800 pt-8 mt-auto print:border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-3">
              <h3 className="text-sm font-black text-[#FF1493] uppercase tracking-widest">The Plot Synopsis</h3>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-500">A high-stakes night of secrets and accusations.</p>
            </div>
            <div className="md:col-span-9">
              <p className="text-lg md:text-xl font-medium leading-relaxed text-slate-300 print:text-slate-800 print:text-base">
                {mystery.description || "The stage is set for a night of drama, intrigue, and mystery. One of the guests harbors a deadly secret, and it will be up to your friends to piece together the clues, confront the suspects, and reveal the culprit before the night runs out."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Set Up Guide Page */}
      <div className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="flex justify-between items-end border-b border-slate-800 pb-6 print:border-slate-300">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">01. Host Setup Guide</h2>
              <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">Everything you need to do before your guests arrive.</p>
            </div>
            <span className="text-[10px] font-black text-[#4169E1] uppercase tracking-widest">Preparation</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-[#FF1493] uppercase tracking-wider">Printing & Materials</h3>
              <ul className="space-y-4">
                <li className="flex gap-4 items-start">
                  <span className="w-6 h-6 bg-slate-900 border border-slate-800 text-[#FF1493] font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-1 print:bg-slate-100 print:border-slate-300">1</span>
                  <div>
                    <strong className="text-white print:text-black block text-sm">Print all 4 Packs</strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Ensure you print this Overview, the Character Sheets, the Clue Cards, and the Reveal Solution booklet.</p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="w-6 h-6 bg-slate-900 border border-slate-800 text-[#FF1493] font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-1 print:bg-slate-100 print:border-slate-300">2</span>
                  <div>
                    <strong className="text-white print:text-black block text-sm">Prep the Character Sheets</strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Cut or separate the individual character sheets. Keep them face down and distribute them to guests beforehand (or as they arrive).</p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="w-6 h-6 bg-slate-900 border border-slate-800 text-[#FF1493] font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-1 print:bg-slate-100 print:border-slate-300">3</span>
                  <div>
                    <strong className="text-white print:text-black block text-sm">Cut the Clue Cards</strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Cut the clues along the dotted lines and place them in labeled envelopes for Round 1, Round 2, and Round 3.</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold text-[#4169E1] uppercase tracking-wider">Atmosphere & Hosting</h3>
              <ul className="space-y-4">
                <li className="flex gap-4 items-start">
                  <span className="w-6 h-6 bg-slate-900 border border-slate-800 text-[#4169E1] font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-1 print:bg-slate-100 print:border-slate-300">4</span>
                  <div>
                    <strong className="text-white print:text-black block text-sm">Set the Vibe</strong>
                    <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">
                      Decorate your venue to match the <strong>{mystery.theme || "Mystery"}</strong> theme. Play appropriate background music (e.g., retro, jazz, suspense) to set the mood.
                    </p>
                  </div>
                </li>
                <li className="flex gap-4 items-start">
                  <span className="w-6 h-6 bg-slate-900 border border-slate-800 text-[#4169E1] font-black rounded-lg flex items-center justify-center text-xs shrink-0 mt-1 print:bg-slate-100 print:border-slate-300">5</span>
                  <div>
                    <strong className="text-white print:text-black block text-sm">Inside Jokes & Customization</strong>
                    {mystery.inside_jokes ? (
                      <div className="mt-1">
                        <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Inject your configured jokes during conversations:</p>
                        <p className="text-xs italic text-[#4169E1] bg-slate-900 px-3 py-1.5 rounded-lg mt-1 border border-slate-800 print:bg-slate-100 print:text-slate-800 print:border-slate-300">
                          &ldquo;{mystery.inside_jokes}&rdquo;
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 leading-relaxed print:text-slate-700">Prepare some personal stories or shared jokes between friends to drop in naturally during mingling.</p>
                    )}
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Theme Specific Recommendations Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 mt-10 print:bg-slate-50 print:border-slate-300 print:p-6">
            <h4 className="text-lg font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2 print:text-black">
              <span>🎭</span> Theme Custom Recommendations
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="font-bold text-[#FF1493] block mb-1">Dress Code:</span>
                <p className="text-slate-400 text-xs leading-relaxed print:text-slate-700">Encourage guests to follow their assigned character wardrobes strictly to elevate photos and atmosphere.</p>
              </div>
              <div>
                <span className="font-bold text-[#4169E1] block mb-1">Welcome Toast:</span>
                <p className="text-slate-400 text-xs leading-relaxed print:text-slate-700">Start the evening with a dramatic champagne/mocktail toast introducing the setting and rules.</p>
              </div>
              <div>
                <span className="font-bold text-[#9370DB] block mb-1">The Confessional:</span>
                <p className="text-slate-400 text-xs leading-relaxed print:text-slate-700">Set up a corner room with a camera or phone on a tripod where guests can record secret "interviews" as their character throughout the night.</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* How to Play Page */}
      <div className="print:break-after-page min-h-screen p-12 md:p-24 bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        <div className="max-w-4xl mx-auto space-y-12">
          
          <div className="flex justify-between items-end border-b border-slate-800 pb-6 print:border-slate-300">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-white uppercase print:text-black">02. How to Play & Game Flow</h2>
              <p className="text-slate-400 text-sm font-medium mt-1 print:text-slate-600">The structure of your party and timeline for the evening.</p>
            </div>
            <span className="text-[10px] font-black text-[#9370DB] uppercase tracking-widest">Gameplay</span>
          </div>

          <div className="space-y-10">
            
            <div className="relative border-l-2 border-slate-800 pl-8 space-y-2 print:border-slate-300">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#FF1493]"></span>
              <span className="text-[10px] font-black text-[#FF1493] uppercase tracking-widest">Arrival & Character Setup (30 min)</span>
              <h3 className="text-lg font-bold text-white print:text-black">Welcome & Character Activation</h3>
              <p className="text-sm text-slate-400 leading-relaxed print:text-slate-700">
                Greet guests and hand them their specific Character Sheets. Give everyone 10–15 minutes to review their act instructions, dress details, and relationship lists. Kick off the night with a grand group photo!
              </p>
            </div>

            <div className="relative border-l-2 border-slate-800 pl-8 space-y-2 print:border-slate-300">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#4169E1]"></span>
              <span className="text-[10px] font-black text-[#4169E1] uppercase tracking-widest">Round 1: First Discoveries (45 min)</span>
              <h3 className="text-lg font-bold text-white print:text-black">Mingling & Initial Rumors</h3>
              <p className="text-sm text-slate-400 leading-relaxed print:text-slate-700">
                The crime has occurred (or is established)! Hand out the <strong>Round 1 Clue Cards</strong>. Guests should mingle, talk about their relationships, drop rumors, and share the discoveries on their clue cards dynamically with each other. Keep it light, funny, and dramatic.
              </p>
            </div>

            <div className="relative border-l-2 border-slate-800 pl-8 space-y-2 print:border-slate-300">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-[#9370DB]"></span>
              <span className="text-[10px] font-black text-[#9370DB] uppercase tracking-widest">Round 2: Deeper Secrets (45 min)</span>
              <h3 className="text-lg font-bold text-white print:text-black">The Plot Thickens & Motives</h3>
              <p className="text-sm text-slate-400 leading-relaxed print:text-slate-700">
                Distribute the <strong>Round 2 Clue Cards</strong>. Deeper secrets, suspicious financial records, and hidden relationships start coming to light. The pressure increases as characters are confronted about their hidden motives and connections to the crime.
              </p>
            </div>

            <div className="relative border-l-2 border-slate-800 pl-8 space-y-2 print:border-slate-300">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Round 3: The Accusation (30 min)</span>
              <h3 className="text-lg font-bold text-white print:text-black">Final Clues & Suspect Interrogations</h3>
              <p className="text-sm text-slate-400 leading-relaxed print:text-slate-700">
                Release the <strong>Round 3 Clue Cards</strong> (the smoking guns). Gather all guests. Each player has a final opportunity to query their prime suspects. Once the time is up, hand out pens and paper. Every guest must write down their accusation: **Who did it, why, and how?**
              </p>
            </div>

            <div className="relative border-l-2 border-slate-800 pl-8 space-y-2 print:border-slate-300">
              <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500"></span>
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">The Finale: Solution Reveal (15 min)</span>
              <h3 className="text-lg font-bold text-white print:text-black">Read the Master Conclusion</h3>
              <p className="text-sm text-slate-400 leading-relaxed print:text-slate-700">
                The host opens the <strong>Reveal Pack</strong>. Read the solution beats step-by-step to the crowd. Award certificates or special prizes (e.g. Best Actor, Best Dress, Most Accurate Sleuth)!
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* Review Request & Back Cover Page */}
      <div className="min-h-screen p-12 md:p-24 flex flex-col justify-between bg-slate-950 text-slate-100 print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm]">
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 print:border-slate-300">
          <span className="font-black tracking-widest text-xs uppercase text-slate-500">Back Pocket Mysteries</span>
          <span className="text-[10px] font-black text-[#FF1493] uppercase tracking-widest">Showtime</span>
        </div>

        <div className="my-auto max-w-2xl mx-auto text-center space-y-8">
          <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center text-4xl mx-auto shadow-xl print:bg-slate-100 print:border-slate-300">
            💖
          </div>
          <h2 className="text-4xl font-black text-white uppercase tracking-tight print:text-black">How did your party go?</h2>
          <p className="text-slate-400 text-lg leading-relaxed print:text-slate-700">
            We hope your murder mystery night was packed with drama, laughter, and brilliant sleuthing. As a small team, your feedback keeps us alive!
          </p>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-4 max-w-md mx-auto print:bg-slate-50 print:border-slate-300 print:p-6">
            <span className="block font-bold text-xs uppercase tracking-widest text-slate-400 print:text-slate-600">Review Us & Share Photos</span>
            <p className="text-xs text-slate-500 print:text-slate-700 leading-relaxed">
              Tag us at <strong>@backpocketgames</strong> or send us your best crime scene photos! Scan code or visit website to share your experience.
            </p>
            <div className="w-32 h-32 bg-white p-2 rounded-xl mx-auto border-2 border-slate-800 flex items-center justify-center">
              {/* Elegant placeholder mock QR Code using CSS */}
              <div className="grid grid-cols-5 gap-1 w-full h-full opacity-80">
                <div className="bg-slate-950 rounded-xs"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div>
                <div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div>
                <div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div>
                <div className="bg-slate-950 rounded-xs"></div><div className="bg-slate-950 rounded-xs"></div><div className="bg-white"></div><div className="bg-white"></div><div className="bg-slate-950 rounded-xs"></div>
              </div>
            </div>
            <span className="block text-[10px] font-black text-[#FF1493] uppercase tracking-widest mt-2">Get 20% OFF your next mystery!</span>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 mt-auto flex justify-between items-center text-xs text-slate-500 print:border-slate-300">
          <span>&copy; {new Date().getFullYear()} Back Pocket Games</span>
          <span>Ready to Host • Page 4</span>
        </div>
      </div>

      {/* Auto-print script wired with window setup delay */}
      <script dangerouslySetInnerHTML={{ __html: `
        window.onload = function() {
          // Auto click print in 1s for seamless user UX
          setTimeout(function() {
            window.print();
          }, 1500);

          // Setup manual click handler for screen-only button
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
