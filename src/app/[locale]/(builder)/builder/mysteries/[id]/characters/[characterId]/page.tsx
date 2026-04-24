import React from 'react';
import { notFound } from 'next/navigation';
import { getMysteryById, getCharactersByMysteryId } from '@/services/mysteries';
import { CharacterProfileClient } from './_components/CharacterProfileClient';
import Link from 'next/link';

export default async function CharacterProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string; characterId: string }>;
}) {
  const { locale, id, characterId } = await params;
  
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) notFound();

  const character = characters.find((c: any) => c.id === characterId);
  if (!character) notFound();

  // We need to pass all characters for color generation
  return (
    <div className="max-w-[1200px] mx-auto py-12 px-6">
      <div className="mb-8">
        <Link 
          href={`/${locale}/builder/mysteries/${id}/characters`}
          className="text-sm font-bold text-slate-400 hover:text-slate-900 transition-colors flex items-center gap-2 w-fit"
        >
          ← Back to Cast List
        </Link>
      </div>
      
      <CharacterProfileClient 
        mystery={mystery} 
        character={character} 
        allCharacters={characters}
      />
    </div>
  );
}
