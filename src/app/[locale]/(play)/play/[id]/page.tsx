import React from 'react';
import { notFound } from 'next/navigation';
import { getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { PlayroomClient } from './_components/PlayroomClient';

export const unstable_instant = false;

export default async function PlayroomPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  
  const [mystery, relationships] = await Promise.all([
    getMysteryById(id),
    getRelationshipsByMysteryId(id),
  ]);

  if (!mystery) {
    return notFound();
  }

  const characters = (mystery as any).characters || [];
  const clues = (mystery as any).clues || [];

  return (
    <PlayroomClient
      mystery={mystery}
      characters={characters}
      relationships={relationships}
      clues={clues}
    />
  );
}
