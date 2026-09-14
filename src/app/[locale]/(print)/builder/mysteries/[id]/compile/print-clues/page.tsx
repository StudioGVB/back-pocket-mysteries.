import React from 'react';
import { getMysteryById, getCluesByMysteryId, getCharactersByMysteryId } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import { PrintCluesClient } from './_components/PrintCluesClient';
import { connection } from 'next/server';

export const unstable_instant = false;

export default async function PrintCluesPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await connection();
  const { id, locale } = await params;
  const [mystery, clues, characters] = await Promise.all([
    getMysteryById(id),
    getCluesByMysteryId(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return notFound();

  return (
    <PrintCluesClient
      mystery={mystery}
      clues={clues}
      characters={characters}
      locale={locale}
    />
  );
}
