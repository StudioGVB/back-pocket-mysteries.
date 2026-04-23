// @ts-nocheck
import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { RelationshipGraphDynamic as RelationshipGraph } from './_components/RelationshipGraphDynamic';
import { RelationshipMatrix } from './_components/RelationshipMatrix';
import { AIGenerateButton } from './_components/AIGenerateButton';

export default async function MysteryRelationshipsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const [mystery, rowCharacters, relationships] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
    getRelationshipsByMysteryId(id)
  ]);

  if (!mystery) return null;

  // Syncing with Characters Page logic: Strip out hidden/duplicate victims or broken rows
  const victim = rowCharacters.find(c => c.is_victim);
  const mandatorySuspects = rowCharacters.filter(c => c.is_mandatory && !c.is_victim);
  const optionalSuspects = rowCharacters.filter(c => !c.is_mandatory && !c.is_victim);
  
  const activeCharacters = [
    ...(victim ? [victim] : []),
    ...mandatorySuspects,
    ...optionalSuspects
  ];

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      {/* 1. Summary Stats & AI Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">Relationship Map</h2>
          <p className="text-slate-400 font-medium text-sm">Mapping {activeCharacters.length} characters and their secrets.</p>
        </div>
        
        <div className="flex items-center gap-6">
           <AIGenerateButton mysteryId={id} />
           
           <div className="flex gap-4">
             <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] shadow-sm">
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total Bonds</div>
               <div className="text-2xl font-black text-slate-900 leading-none">
                 {relationships.filter(r => r.know_each_other).length}
               </div>
             </div>
             <div className="bg-white border border-slate-100 px-6 py-4 rounded-[2rem] shadow-sm">
               <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1 text-brand-pink">Lethal Motives</div>
               <div className="text-2xl font-black text-slate-900 leading-none">
                 {activeCharacters.reduce((acc, char) => acc + (char.motives?.length || 0), 0)}
               </div>
             </div>
           </div>
        </div>
      </div>

      {activeCharacters.length < 2 ? (
        <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🎭</div>
          <h3 className="text-2xl font-black text-slate-900 mb-2">Cast is Missing</h3>
          <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
            You need at least two characters to start mapping relationships. Head over to the Characters section to add more!
          </p>
        </div>
      ) : (
        <div className="space-y-24">
          
          {/* Split Layout: Graph (Left) / Matrix (Right) */}
          <div className="grid grid-cols-1 xl:grid-cols-[45%_55%] gap-12 items-start relative">
            
            {/* Left: Sticky Relationship Graph */}
            <div className="sticky top-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-brand-pink" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Relationship Web</h2>
              </div>
              <RelationshipGraph characters={activeCharacters} relationships={relationships} />
            </div>

            {/* Right: Scrollable Matrix */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-slate-300" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Relationship Actions</h2>
              </div>
              <RelationshipMatrix mysteryId={id} characters={activeCharacters} relationships={relationships} />
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
