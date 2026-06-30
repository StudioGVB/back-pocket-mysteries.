import React from 'react';
import { notFound } from 'next/navigation';
import { getMysteryById } from '@/services/mysteries';
import { CopyLinkButton } from './_components/CopyLinkButton';
import { HostRoundController } from './_components/HostRoundController';

export default async function CompilePage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  
  const mystery = await getMysteryById(id);

  if (!mystery) return notFound();
  
  const characters = (mystery as any).characters || [];
  
  const charactersReady = characters.length > 0 && characters.every((char: any) => {
    if (!char.profile_data) return false;
    const p = char.profile_data as any;
    if (!p.bio) return false;
    
    if (char.gender === 'adaptable') {
        return !!(p.presentation_male?.outfit_image_url || p.presentation_female?.outfit_image_url);
    }
    return !!p.outfit_image_url;
  });

  const guestPlayUrl = `/${locale}/play/${id}`;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[1600px] mx-auto w-full px-12 py-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">Compile & Play Room</h1>
        <p className="text-slate-500 font-medium text-sm">Package your mystery into printable formats or host a screen-friendly digital session.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns - Materials & Preparation */}
        <div className="lg:col-span-2 space-y-8">
            {/* Export Printables Card */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm w-full">
                <div className="flex items-center gap-4 mb-6 border-b pb-6">
                    <span className="text-3xl">🖨️</span>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Print & Play PDFs</h3>
                        <p className="text-sm font-medium text-slate-500">Generate customized, print-ready PDF packs for your guests.</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                    <a 
                        href={`/${locale}/builder/mysteries/${id}/compile/print-overview`} 
                        target="_blank" 
                        className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        📝 Host Overview
                    </a>
                    <a 
                        href={`/${locale}/builder/mysteries/${id}/compile/print-characters`} 
                        target="_blank" 
                        className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        🖨️ Print Character Pack
                    </a>
                    <a 
                        href={`/${locale}/builder/mysteries/${id}/compile/digital-characters`} 
                        target="_blank" 
                        className="w-full py-4 bg-white border-2 border-[#FF1493] text-[#FF1493] rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-[#FF1493] hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        📱 Digital Character Pack
                    </a>
                    <a 
                        href={`/${locale}/builder/mysteries/${id}/compile/print-clues`} 
                        target="_blank" 
                        className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        🔍 Clues Pack
                    </a>
                    <a 
                        href={`/${locale}/builder/mysteries/${id}/compile/print-reveal`} 
                        target="_blank" 
                        className="w-full py-4 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                        ✉️ Reveal & Solution
                    </a>
                </div>
            </div>

            {/* Package Readiness Check Card */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm w-full">
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4 border-b pb-4">Studio Readiness Check</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <div className={`flex items-center justify-between p-4 rounded-2xl border border-slate-50 ${!charactersReady ? 'bg-slate-50/50' : 'bg-emerald-50/30'}`}>
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">Suspects</span>
                            <span className="text-sm font-bold text-slate-700">Profiles & Images</span>
                        </div>
                        <span className={`text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider ${charactersReady ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                            {charactersReady ? 'READY' : 'PENDING'}
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-emerald-50/30">
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">Social Web</span>
                            <span className="text-sm font-bold text-slate-700">Relationships</span>
                        </div>
                        <span className="text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                            READY
                        </span>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-emerald-50/30">
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">Timeline</span>
                            <span className="text-sm font-bold text-slate-700">Main Plot beats</span>
                        </div>
                        <span className="text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-700 border border-emerald-200">
                            READY
                        </span>
                    </div>

                     <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-50 bg-slate-50/50 opacity-60">
                        <div className="flex flex-col">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-400 mb-0.5">Twists</span>
                            <span className="text-sm font-bold text-slate-700">Subplot Beats</span>
                        </div>
                        <span className="text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider bg-slate-200 text-slate-600 border border-slate-300">
                            PENDING
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column - Sharing Dashboard */}
        <div className="space-y-8 lg:sticky lg:top-8">
            <div className="bg-[#0b0f19] text-white rounded-[2.5rem] p-10 border border-white/5 shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink/5 rounded-full blur-3xl pointer-events-none" />
                
                <div className="flex items-center gap-3.5 mb-6">
                    <span className="text-3xl">📱</span>
                    <h3 className="text-lg font-black uppercase tracking-tight">Digital Playroom</h3>
                </div>
                
                <p className="text-slate-400 text-sm font-medium mb-8 leading-relaxed">
                    No printer? No problem. Text this guest pass link to your players. Everyone can choose their character, view their digital character guides, read secret materials, and review all clues directly on their phones during the party!
                </p>
                
                <div className="p-6 bg-white/5 rounded-2xl border border-white/5 mb-8">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Shareable Playroom URL</p>
                    <p className="text-xs font-bold text-brand-pink tracking-tight select-all truncate">
                        {guestPlayUrl}
                    </p>
                </div>

                <div className="space-y-4">
                    <CopyLinkButton url={guestPlayUrl} />
                    
                    <a 
                        href={guestPlayUrl}
                        target="_blank"
                        className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest text-center block transition-all hover:shadow-lg duration-300"
                    >
                        Preview Digital Lobby
                    </a>
                </div>

                <div className="border-t border-white/10 mt-8 pt-8 space-y-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Host Control Panel</h4>
                    <HostRoundController mysteryId={id} currentRound={mystery.current_round ?? 0} />
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Publish Status</p>
                <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    <span className="text-sm font-black text-slate-900 uppercase tracking-wider">Draft Mode</span>
                </div>
                <p className="text-xs font-medium text-slate-400 mt-2">Only visible to studio builders. Ready to compile.</p>
            </div>
        </div>
      </div>
    </div>
  );
}
