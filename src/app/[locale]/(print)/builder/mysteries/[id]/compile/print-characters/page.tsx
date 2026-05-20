import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { notFound } from 'next/navigation';

export default async function PrintCharactersPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return notFound();

  // Create an array of character pages to render.
  const characterPages: any[] = [];
  
  characters.forEach((char: any) => {
    const profile = char.profile_data as any || {};
    
    if (char.gender === 'adaptable') {
       if (profile.presentation_female) {
           characterPages.push({ character: char, gender: 'Female', presentation: profile.presentation_female });
       }
       if (profile.presentation_male) {
           characterPages.push({ character: char, gender: 'Male', presentation: profile.presentation_male });
       }
    } else {
       characterPages.push({ character: char, gender: char.gender === 'female' ? 'Female' : 'Male', presentation: profile });
    }
  });

  return (
    <div className="bg-white text-black min-h-screen print:bg-white w-full">
      {/* Title Page */}
      <div className="print:break-after-page min-h-screen flex flex-col p-8">
        <div className="flex-grow flex flex-col items-center justify-center text-center px-16 relative">
            <div className="max-w-4xl z-10 w-full">
                <h1 className="text-7xl font-black mb-6 tracking-tighter text-slate-900" style={{ fontFamily: 'var(--font-geist-sans)' }}>{mystery.title}</h1>
                <h2 className="text-4xl font-bold text-[#FF1493] mb-16 uppercase tracking-widest">{mystery.theme || "A Reality Show Reunion Murder Mystery"}</h2>
                
                <div className="text-left text-2xl font-medium text-slate-800 space-y-6 flex gap-8">
                    <span className="font-black text-[#FF1493] shrink-0 uppercase tracking-widest">PLOT:</span> 
                    <p className="leading-relaxed">{mystery.description}</p>
                </div>
            </div>
        </div>
      </div>

      {/* Cast List Page */}
      <div className="print:break-after-page min-h-screen p-16">
         <div className="mb-16">
             <h1 className="text-6xl font-black text-slate-900 tracking-tighter">The Cast List</h1>
         </div>
         <div className="grid grid-cols-2 gap-y-12 gap-x-16">
            {characters.map((char: any, i: number) => {
                const colors = ['#FF1493', '#4169E1', '#32CD32', '#FFA500', '#9370DB', '#00CED1'];
                const color = colors[i % colors.length];
                
                // Parse the AI-generated name format (e.g. "Gabby|Primary Charter Guest|...")
                const nameParts = char.name.split('|');
                const cleanName = nameParts[0]?.trim() || char.name;
                const cleanTitle = (nameParts[1] || char.archetype || "Guest").trim();
                
                // Extract a short bio snippet for the Cast List
                const profile = char.profile_data as any || {};
                const bioSummary = profile.bio 
                    ? profile.bio.length > 80 ? profile.bio.substring(0, 80).trim() + '...' : profile.bio 
                    : "No description available.";
                
                return (
                    <div key={char.id} className="flex gap-6 items-start">
                        <div className="w-16 flex justify-center mt-2 flex-shrink-0">
                            {/* Simple colored person icon */}
                            <svg viewBox="0 0 24 24" fill={color} className="w-16 h-16">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 flex flex-col items-start gap-1 mb-2">
                                <span style={{ color: color }}>{cleanName}</span>
                                <span className="text-sm font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-widest border border-slate-200">
                                    {cleanTitle}
                                </span>
                            </h3>
                            <p className="text-lg font-medium text-slate-500 leading-snug">
                               {bioSummary}
                            </p>
                        </div>
                    </div>
                );
            })}
         </div>
      </div>

      {/* Character Sheets */}
      {characterPages.map((page, index) => {
         const pres = page.presentation;
         return (
             <div key={`${page.character.id}-${index}`} className="print:break-after-page min-h-screen relative flex flex-col border-[16px] border-[#FF1493] bg-white m-0 p-12 box-border">
                 
                 {/* Floating Name Tag */}
                 <div className="absolute top-8 right-8 bg-[#FF1493] text-white font-black text-4xl px-8 py-3 rounded-2xl shadow-xl z-20">
                     {page.character.name.split('|')[0]?.trim() || page.character.name}
                 </div>

                 {page.character.gender === 'adaptable' && (
                     <div className="absolute top-28 right-8 bg-slate-900 text-white font-black text-xl px-6 py-2 rounded-2xl shadow-xl z-20 uppercase tracking-widest">
                         {page.gender} Version
                     </div>
                 )}

                 {/* Content Grid */}
                 <div className="grid grid-cols-12 gap-12 flex-grow mt-8">
                    {/* Text Column */}
                    <div className={`col-span-12 ${pres.outfit_image_url ? 'md:col-span-7' : ''} space-y-10`}>
                        {pres.outfit_advice && (
                            <div>
                                <h3 className="text-3xl font-black text-[#FF1493] mb-4">Outfit Advice:</h3>
                                <p className="text-2xl font-medium text-slate-900 leading-relaxed">
                                    {pres.outfit_advice}
                                </p>
                            </div>
                        )}

                        {(pres.act_summary || pres.act_bullets?.length > 0) && (
                            <div>
                                <h3 className="text-3xl font-black text-[#FF1493] mb-4">How to Act:</h3>
                                {pres.act_summary && (
                                    <p className="text-2xl font-medium text-slate-900 leading-relaxed mb-6">
                                        {pres.act_summary}
                                    </p>
                                )}
                                {pres.act_bullets && pres.act_bullets.length > 0 && (
                                    <ul className="space-y-4">
                                        {pres.act_bullets.map((bullet: string, i: number) => (
                                            <li key={i} className="flex gap-4 text-2xl font-medium text-slate-900 items-start">
                                                <span className="w-3 h-3 rounded-full bg-slate-900 mt-3.5 flex-shrink-0"></span>
                                                <span className="leading-relaxed">{bullet}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Image Column */}
                    {pres.outfit_image_url && (
                        <div className="col-span-12 md:col-span-5 h-full flex flex-col pt-8">
                            <img 
                                src={pres.outfit_image_url} 
                                alt={`Outfit for ${page.character.name}`} 
                                className="w-full h-auto rounded-3xl object-contain shadow-2xl max-h-[800px]" 
                            />
                        </div>
                    )}
                 </div>
             </div>
         );
      })}

      {/* Auto-print script */}
      <script dangerouslySetInnerHTML={{ __html: `window.onload = function() { setTimeout(function() { window.print(); }, 1000); }` }} />
    </div>
  );
}
