import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { getSubplotsByMysteryId } from '@/services/subplots';
import { SubplotManager } from './_components/SubplotManager';

export default async function SubplotsPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  
  const [mystery, characters, subplots] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
    getSubplotsByMysteryId(id)
  ]);

  if (!mystery) return null;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-20">
      <div>
        <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">Subplots</h1>
        <p className="text-slate-500 font-medium text-sm">Add intricate layers and secondary objectives to your mystery.</p>
      </div>

      <SubplotManager 
        mysteryId={id} 
        characters={characters} 
        subplots={subplots} 
      />
    </div>
  );
}
