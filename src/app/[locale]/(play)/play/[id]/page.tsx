import React from 'react';
import { notFound } from 'next/navigation';
import { getMysteryById, getPublishedMysteryByIdOrSlug } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import {
  findMysteryByPinAction,
  getGameSessionAction,
} from '@/app/actions/customer-mystery';
import { PlayroomClient } from './_components/PlayroomClient';

export const unstable_instant = false;

export default async function PlayroomPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams: Promise<{ char?: string; characterId?: string; host?: string; select?: string }>;
}) {
  const { id: rawId, locale } = await params;
  const resolvedSearch = await searchParams;

  let resolvedId = rawId;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  const isPin = /^\d{6}$/.test(rawId.replace(/\s+/g, ''));

  if (!isUuid) {
    if (isPin) {
      const pinRes = await findMysteryByPinAction(rawId);
      if (pinRes?.mysteryId) {
        resolvedId = pinRes.mysteryId;
      }
    } else {
      const bySlug = await getPublishedMysteryByIdOrSlug(rawId);
      if (bySlug?.id) {
        resolvedId = bySlug.id;
      }
    }
  }

  const [mystery, relationships, initialSession] = await Promise.all([
    getMysteryById(resolvedId),
    getRelationshipsByMysteryId(resolvedId),
    getGameSessionAction(resolvedId),
  ]);

  if (!mystery) {
    return notFound();
  }

  const characters = (mystery as any).characters || [];
  const clues = (mystery as any).clues || [];

  return (
    <PlayroomClient
      locale={locale}
      mystery={mystery}
      characters={characters}
      relationships={relationships}
      clues={clues}
      initialSession={initialSession as any}
      initialCharId={resolvedSearch?.char || resolvedSearch?.characterId || null}
      initialIsHost={Boolean((initialSession as any)?.isHost)}
      forceSelect={resolvedSearch?.select === '1'}
    />
  );
}

