import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import Image from 'next/image';

export const unstable_instant = false;

export default async function DigitalCharactersPage({
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
    <div className="bg-slate-50 min-h-screen font-sans antialiased">
      <div className="max-w-3xl mx-auto py-12 px-6 space-y-24">
        {characterPages.map((page, index) => {
          const pres = page.presentation;
          
          // Parse the AI-generated name format (e.g. "Gabby|Primary Charter Guest|...")
          const nameParts = page.character.name.split('|');
          const cleanName = nameParts[0]?.trim() || page.character.name;
          const cleanTitle = (nameParts[1] || page.character.archetype || "Guest").trim();

          const bio = pres.bio || page.character.profile_data?.bio || "No description available.";

          return (
            <div key={`${page.character.id}-${index}`} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 md:p-12">
              <div className="flex flex-col md:flex-row gap-8 md:gap-12 mb-12">
                <div className="flex-1">
                  <h1 className="text-5xl md:text-6xl font-black text-[#FF1493] uppercase tracking-tighter leading-none mb-2">
                    {cleanName}
                  </h1>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight mb-6">
                    {cleanTitle}
                  </h2>
                  <p className="text-lg font-medium text-slate-600 leading-relaxed">
                    {bio}
                  </p>
                </div>
                
                {page.character.image_url && (
                  <div className="w-full md:w-64 h-64 md:h-80 shrink-0 relative rounded-[2rem] overflow-hidden bg-slate-100 border border-slate-100 shadow-inner">
                    <Image 
                      src={page.character.image_url}
                      alt={cleanName}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-10">
                {pres.outfit_advice && (
                  <div>
                    <h3 className="text-3xl font-black text-[#FF1493] mb-4">How to Dress</h3>
                    <p className="text-xl font-medium text-slate-700 leading-relaxed">
                      {pres.outfit_advice}
                    </p>
                  </div>
                )}

                {(pres.act_summary || pres.act_bullets?.length > 0) && (
                  <div>
                    <h3 className="text-3xl font-black text-[#FF1493] mb-4">How to Act</h3>
                    {pres.act_summary && (
                      <p className="text-xl font-medium text-slate-700 leading-relaxed mb-6">
                        {pres.act_summary}
                      </p>
                    )}
                    {pres.act_bullets && pres.act_bullets.length > 0 && (
                      <ul className="space-y-4">
                        {pres.act_bullets.map((bullet: string, i: number) => (
                          <li key={i} className="flex gap-4 text-xl font-medium text-slate-700 items-start">
                            <span className="w-2.5 h-2.5 rounded-full bg-slate-400 mt-2.5 shrink-0"></span>
                            <span className="leading-relaxed">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
