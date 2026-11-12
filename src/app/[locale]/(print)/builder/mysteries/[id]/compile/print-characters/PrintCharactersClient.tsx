'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  getCharacterDisplayName,
  getCharacterRoleTitle,
  hydrateTextWithCharacters,
} from '@/utils/hydration';

export default function PrintCharactersClient({
  mystery,
  characterPages,
  locale,
  id
}: {
  mystery: any;
  characterPages: any[];
  locale: string;
  id: string;
}) {
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null);

  // Parse AI photo URL from guest avatar_url
  const getAiPhotoUrl = (avatarUrl: string | null) => {
    if (!avatarUrl) return null;
    try {
      const url = new URL(avatarUrl);
      const aiPhoto = url.searchParams.get('aiPhotoUrl');
      return aiPhoto || avatarUrl; // Fallback to original if no aiPhotoUrl
    } catch {
      // If not a valid URL (or missing http), try to extract from string
      if (avatarUrl.includes('aiPhotoUrl=')) {
        const match = avatarUrl.match(/aiPhotoUrl=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : avatarUrl;
      }
      return avatarUrl;
    }
  };

  return (
    <div className="bg-[#0a0a0a] text-slate-200 min-h-screen font-sans selection:bg-[#FF1493]/30 selection:text-white print:bg-white print:text-black">
      
      <div className="fixed bottom-6 right-6 z-50 flex gap-4 print:hidden">
        {activeCharacterId ? (
          <button 
            onClick={() => setActiveCharacterId(null)}
            className="px-6 py-3 bg-[#1a1a1a] text-slate-300 rounded-none font-medium uppercase tracking-widest text-xs border border-white/10 hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            ← Back to Cast
          </button>
        ) : (
          <Link 
            href={`/${locale}/builder/mysteries/${id}/compile`}
            className="px-6 py-3 bg-[#1a1a1a] text-slate-300 rounded-none font-medium uppercase tracking-widest text-xs border border-white/10 hover:bg-white hover:text-black transition-all flex items-center gap-2"
          >
            ← Studio
          </Link>
        )}
        <button 
          onClick={() => window.print()}
          className="px-6 py-3 bg-[#FF1493] text-white rounded-none font-medium uppercase tracking-widest text-xs hover:bg-[#FF3366] transition-all shadow-lg shadow-[#FF1493]/20 flex items-center gap-2"
        >
          Print PDF
        </button>
      </div>

      <div className="bg-gradient-to-r from-[#FF1493] to-[#4169E1] text-white px-8 py-3 text-center text-sm font-bold tracking-wide shadow-md print:hidden flex items-center justify-center gap-2">
        <span>✨ <strong>Print Preview Mode</strong> - This page is formatted specifically for A4/Letter printing. Press <strong>Cmd+P</strong> or <strong>Ctrl+P</strong> to save as PDF.</span>
      </div>

      {/* Cover Page - Hidden when viewing a specific character, but always prints */}
      <div className={`print:break-after-page min-h-[100dvh] flex-col justify-between p-6 sm:p-12 md:p-24 relative overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black print:bg-white print:text-black print:min-h-[297mm] print:m-0 print:p-[20mm] ${activeCharacterId ? 'hidden print:flex' : 'flex'}`}>
        <div className="absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-gradient-to-br from-[#FF1493]/10 to-[#4169E1]/10 rounded-full blur-[80px] md:blur-[120px] -z-10 print:hidden" />
        <div className="absolute bottom-0 left-0 w-[250px] md:w-[400px] h-[250px] md:h-[400px] bg-gradient-to-tr from-[#4169E1]/10 to-[#9370DB]/10 rounded-full blur-[60px] md:blur-[100px] -z-10 print:hidden" />
        
        <div className="flex justify-between items-center border-b border-slate-800 pb-6 print:border-slate-300">
          <div className="flex items-center gap-3">
            <span className="text-2xl print:text-xl">🕵️‍♂️</span>
            <span className="font-black tracking-widest text-xs uppercase text-slate-400 print:text-slate-600">Back Pocket Mysteries</span>
          </div>
          <span className="text-xs font-bold bg-slate-800 text-slate-300 px-3 py-1 rounded-full uppercase tracking-wider border border-slate-700 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
            Character Pack
          </span>
        </div>

        <div className="my-auto max-w-4xl py-12">
          <h1 className="text-5xl md:text-8xl font-black text-white tracking-tighter mb-2 md:mb-4 uppercase leading-none print:text-slate-900 print:text-5xl">
            {mystery.title}
          </h1>
          <h2 className="text-lg md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1493] to-[#4169E1] uppercase tracking-widest mb-8 md:mb-12 print:text-[#FF1493] print:text-lg">
            {mystery.theme || "A Reality Show Reunion Murder Mystery"}
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-3xl mt-6 md:mt-8">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Characters</span>
              <span className="text-xl font-bold text-white print:text-black">{characterPages.length} suspects</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 print:border-slate-300 print:bg-slate-50 print:p-4">
              <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Game Format</span>
              <span className="text-xl font-bold text-white print:text-black">Digital & Print</span>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-auto print:border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-3">
              <h3 className="text-sm font-black text-[#FF1493] uppercase tracking-widest">The Plot Synopsis</h3>
              <p className="text-xs text-slate-400 mt-1 print:text-slate-500">A high-stakes night of secrets and accusations.</p>
            </div>
            <div className="md:col-span-9">
              <p className="text-base md:text-xl font-medium leading-relaxed text-slate-300 print:text-slate-800 print:text-base">
                {mystery.description || "The stage is set for a night of drama, intrigue, and mystery. One of the guests harbors a deadly secret..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cast List Page - Hidden when viewing a specific character, but always prints */}
      <div className={`print:break-after-page min-h-[100dvh] p-6 sm:p-12 md:p-24 print:min-h-[297mm] print:m-0 print:p-[20mm] ${activeCharacterId ? 'hidden print:block' : 'block'}`}>
         <div className="mb-8 md:mb-16 border-b border-white/10 pb-6 print:border-black/20">
             <h1 className="text-4xl md:text-5xl font-light text-white tracking-tight print:text-black">The Cast List</h1>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 md:gap-y-12 gap-x-16">
            {characterPages.map((page, i) => {
                const guest = page.guest || {};
                const pres = page.presentation || {};
                const allChars = characterPages.map(p => p.character);
                
                // Prioritize guest name, then character display name (role title if uncast)
                const guestNameParts = (guest.name || '').split('|');
                const cleanName = guestNameParts[0]?.trim() || getCharacterDisplayName(page.character) || 'Unknown';
                const cleanTitle = getCharacterRoleTitle(page.character);
                const rawBioText = pres.bio || page.character.profile_data?.bio || guest.bio || '';
                const hydratedRawBio = hydrateTextWithCharacters(rawBioText, allChars, 'print');
                const bioSummary = hydratedRawBio
                    ? hydratedRawBio.length > 90 
                      ? hydratedRawBio.substring(0, 90).trim() + '...' 
                      : hydratedRawBio
                    : `${cleanName} is arriving at the reunion with secrets to hide.`;
                
                const photoUrl =
                  pres.outfit_image_url ||
                  page.character.profile_data?.outfit_image_url ||
                  page.character.profile_data?.standard_character_photo_url ||
                  getAiPhotoUrl(guest.avatar_url || page.character.profile_data?.avatar_url) ||
                  page.character.image_url;
                
                return (
                    <div 
                      key={`${page.character.id}-cast`} 
                      onClick={() => setActiveCharacterId(page.character.id)}
                      className="group flex gap-6 items-start p-4 -ml-4 rounded-none cursor-pointer hover:bg-white/5 transition-all print:bg-transparent print:p-0 print:m-0 print:cursor-default"
                    >
                        <div className="w-20 md:w-24 flex-shrink-0 relative bg-white p-2 pb-6 md:pb-8 shadow-xl rotate-[-3deg] group-hover:rotate-0 transition-all duration-300 print:shadow-none print:border print:border-black/20 print:rotate-0">
                            {photoUrl ? (
                              <div className="aspect-square w-full relative overflow-hidden bg-[#1a1a1a]">
                                <img src={photoUrl} alt={cleanName} className="object-cover w-full h-full" />
                              </div>
                            ) : (
                              <div className="aspect-square w-full bg-[#222]" />
                            )}
                        </div>
                        <div className="flex-1 border-b border-white/5 pb-6 pt-2 print:border-none print:pb-0 group-hover:border-transparent transition-all">
                            <h3 className="text-xl md:text-2xl font-bold text-white flex flex-col items-start gap-1 mb-2 print:text-black">
                                <span>{cleanName}</span>
                                <span className="text-[10px] md:text-xs font-medium text-[#FF1493] uppercase tracking-[0.2em] print:text-[#FF1493]">
                                    {cleanTitle}
                                </span>
                            </h3>
                            <p className="text-sm md:text-base font-light text-slate-400 leading-relaxed print:text-slate-600">
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
         const pres = page.presentation || {};
         const guest = page.guest || {};
         const allChars = characterPages.map(p => p.character);
         
         const guestNameParts = (guest.name || '').split('|');
         const cleanName = guestNameParts[0]?.trim() || getCharacterDisplayName(page.character) || 'Unknown';
         const cleanTitle = getCharacterRoleTitle(page.character);
         const rawBio = pres.bio || page.character.profile_data?.bio || guest.bio || `${cleanName} is arriving at the reunion with secrets to hide and motives to protect. Watch your back.`;
         const bio = hydrateTextWithCharacters(rawBio, allChars, 'print');

         const photoUrl =
           pres.outfit_image_url ||
           page.character.profile_data?.outfit_image_url ||
           page.character.profile_data?.standard_character_photo_url ||
           getAiPhotoUrl(guest.avatar_url || page.character.profile_data?.avatar_url) ||
           page.character.image_url;

         const isActive = activeCharacterId === page.character.id;

         return (
             <div 
               key={`${page.character.id}-${index}`} 
               className={`print:break-after-page min-h-[100dvh] relative flex-col m-0 p-6 sm:p-12 md:p-24 print:min-h-[297mm] print:m-0 print:p-[20mm] ${isActive ? 'flex' : 'hidden print:flex'}`}
             >
                 {page.character.gender === 'adaptable' && (
                     <div className="absolute top-6 md:top-24 right-6 md:right-24 text-slate-500 font-medium text-[10px] md:text-xs uppercase tracking-[0.2em] print:text-black print:right-[20mm] print:top-[20mm]">
                         {page.gender} Version
                     </div>
                 )}

                 {/* Content Grid */}
                 <div className="flex-grow mt-12 md:mt-0">
                    <div className="flex flex-col md:flex-row print:flex-row gap-8 md:gap-16 mb-10 md:mb-20 items-start">
                      <div className="flex-1 space-y-4 md:space-y-6">
                        <div className="border-b border-white/10 pb-6 md:pb-8 print:border-black/20">
                          <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight leading-none mb-3 md:mb-4 print:text-black">
                            {cleanName}
                          </h1>
                          <h2 className="text-sm md:text-lg font-medium text-[#FF1493] uppercase tracking-[0.2em] print:text-[#FF1493]">
                            {cleanTitle}
                          </h2>
                        </div>
                        <p className="text-base md:text-xl font-light text-slate-300 leading-relaxed pt-2 print:text-slate-800">
                          {bio}
                        </p>
                      </div>
                      
                      {photoUrl && (
                        <div className="w-full md:w-80 shrink-0 relative bg-white p-4 pb-16 md:p-6 md:pb-24 shadow-2xl rotate-[2deg] print:rotate-0 print:border print:border-black/20 print:shadow-none">
                          <div className="aspect-square w-full relative overflow-hidden bg-[#1a1a1a]">
                            <img 
                              src={photoUrl}
                              alt={cleanName}
                              className="object-cover w-full h-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-12 md:space-y-16 pb-24 md:pb-0">
                      {pres.outfit_advice && (
                        <div className="border-t border-white/10 pt-8 print:border-black/20">
                          <h3 className="text-sm md:text-base font-semibold text-[#FF1493] uppercase tracking-[0.2em] mb-4 md:mb-6 print:text-[#FF1493]">How to Dress</h3>
                          <p className="text-base md:text-xl font-light text-slate-300 leading-relaxed print:text-black mb-6">
                            {hydrateTextWithCharacters(pres.outfit_advice, allChars, 'print')}
                          </p>
                          {(() => {
                            const outfitRefs: string[] = (
                              Array.isArray(pres.outfit_reference_images) && pres.outfit_reference_images.filter(Boolean).length > 0
                                ? pres.outfit_reference_images
                                : Array.isArray(page.character.profile_data?.outfit_reference_images) &&
                                  page.character.profile_data.outfit_reference_images.filter(Boolean).length > 0
                                ? page.character.profile_data.outfit_reference_images
                                : []
                            ).slice(0, 3);

                            if (outfitRefs.length === 0) return null;

                            return (
                              <div className="grid grid-cols-3 gap-4 md:gap-6 mt-6">
                                {outfitRefs.map((refUrl: string, refIdx: number) => (
                                  <div
                                    key={refIdx}
                                    className="bg-white/5 border border-white/10 p-2.5 pb-4 print:bg-white print:border-black/20"
                                  >
                                    <div className="aspect-[3/4] w-full overflow-hidden bg-[#1a1a1a] mb-2">
                                      <img
                                        src={refUrl}
                                        alt={`${cleanTitle} Outfit Option ${refIdx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <span className="block text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 print:text-slate-700">
                                      Outfit Option {refIdx + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {(pres.act_summary || pres.act_bullets?.length > 0) && (
                        <div className="border-t border-white/10 pt-8 print:border-black/20">
                          <h3 className="text-sm md:text-base font-semibold text-[#FF1493] uppercase tracking-[0.2em] mb-4 md:mb-6 print:text-[#FF1493]">How to Act</h3>
                          {pres.act_summary && (
                            <p className="text-base md:text-xl font-light text-slate-300 leading-relaxed mb-6 md:mb-8 print:text-black">
                              {hydrateTextWithCharacters(pres.act_summary, allChars, 'print')}
                            </p>
                          )}
                          {pres.act_bullets && pres.act_bullets.length > 0 && (
                            <ul className="space-y-4 md:space-y-6">
                              {pres.act_bullets.map((bullet: string, i: number) => (
                                <li key={i} className="flex gap-4 md:gap-6 text-base md:text-xl font-light text-slate-300 items-start print:text-black">
                                  <span className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-none bg-[#FF1493] mt-2.5 md:mt-3 shrink-0 print:bg-black"></span>
                                  <span className="leading-relaxed">{hydrateTextWithCharacters(bullet, allChars, 'print')}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                 </div>
             </div>
         );
      })}
    </div>
  );
}
