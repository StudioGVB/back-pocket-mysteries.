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
  searchParams: Promise<{
    char?: string;
    characterId?: string;
    host?: string;
    select?: string;
    prep?: string;
    mode?: string;
  }>;
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

  const rawCharacters: any[] = (mystery as any).characters || [];
  const rawClues: any[] = (mystery as any).clues || [];
  const isPrepMode =
    resolvedSearch?.prep === '1' ||
    resolvedSearch?.prep === 'true' ||
    resolvedSearch?.mode === 'prep';

  const verifiedIsHost = Boolean((initialSession as any)?.isHost);
  const currentRound = Number((initialSession as any)?.currentRound ?? (mystery as any).current_round ?? 0);
  const highestClueRound = rawClues.reduce(
    (acc: number, c: any) =>
      c?.round_number && Number(c.round_number) <= 5 ? Math.max(acc, Number(c.round_number)) : acc,
    3
  );
  const revealStageRound = highestClueRound >= 5 ? 6 : 5;
  const canRevealSpoilers =
    currentRound >= revealStageRound &&
    (verifiedIsHost || (initialSession as any)?.revealMode === 'shared_with_guests');

  // Server-side spoiler redaction: never serialize killer plot_role, secret motives, or locked clues into guest HTML/RSC payloads
  const safeCharacters = rawCharacters.map((c: any) => {
    const profile = { ...(c.profile_data || {}) };
    delete profile.__game_session;
    if (!canRevealSpoilers) {
      delete profile.secrets;
    }
    if (isPrepMode) {
      delete profile.roast_mission;
    }
    return {
      ...c,
      plot_role: canRevealSpoilers ? c.plot_role : c.is_victim ? 'victim' : 'suspect',
      motives: canRevealSpoilers ? c.motives : [],
      profile_data: profile,
    };
  });

  // In Pre-Party mode (?prep=1), never send any Round 1-3 clues or relationships over the network
  const safeClues = isPrepMode
    ? []
    : rawClues.map((clue: any) => {
        if (canRevealSpoilers) return clue;
        const copy = { ...clue };
        delete copy.evidence_status;
        delete copy.implication_type;
        return copy;
      });

  const safeRelationships = isPrepMode ? [] : relationships;
  const safeMystery = {
    ...(mystery as any),
    characters: undefined,
    clues: undefined,
    plot_beats: canRevealSpoilers ? (mystery as any).plot_beats : undefined,
  };

  return (
    <PlayroomClient
      locale={locale}
      mystery={safeMystery}
      characters={safeCharacters}
      relationships={safeRelationships}
      clues={safeClues}
      initialSession={initialSession as any}
      initialCharId={resolvedSearch?.char || resolvedSearch?.characterId || null}
      initialIsHost={verifiedIsHost}
      forceSelect={resolvedSearch?.select === '1'}
      initialPrepMode={isPrepMode}
    />
  );
}

