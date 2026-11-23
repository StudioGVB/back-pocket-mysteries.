import React from 'react';
import { requireAdmin } from '@/utils/admin-auth';
import {
  getStoredGameSession,
  getCachedMysterySnapshot,
} from '@/lib/live-session-store';
import {
  hydrateTextWithCharacters,
  getCharacterDisplayName,
  getCharacterRoleTitle,
  adaptOutfitForGuestGender,
} from '@/utils/hydration';
import { inferClueFormat } from '@/utils/clue-format';
import { formatDate } from '@/utils/date';
import AdminPackQaInspectorClient from './AdminPackQaInspectorClient';

export const unstable_instant = false;

function extractAudioUrlFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/\[AUDIO_URL:([^\]]+)\]/);
  return match ? match[1].trim() : null;
}

export default async function AdminTransactionMysteryInspectPage({
  params,
}: {
  params: Promise<{ locale: string; mysteryId: string }>;
}) {
  const { locale, mysteryId } = await params;
  const { supabase } = await requireAdmin();

  const liveSession = getStoredGameSession(mysteryId);
  const cachedMystery = getCachedMysterySnapshot(mysteryId);

  const { data: dbMystery } = await supabase
    .from('mysteries')
    .select('*')
    .eq('id', mysteryId)
    .maybeSingle();

  const mystery = dbMystery || cachedMystery;

  if (!mystery) {
    return (
      <div className="p-12 bg-white rounded-3xl border border-gray-100 text-center space-y-3">
        <h2 className="text-xl font-black text-slate-900">Mystery Pack Not Found</h2>
        <p className="text-xs text-slate-500">
          Could not locate mystery ID <code className="font-mono">{mysteryId}</code>.
        </p>
      </div>
    );
  }

  // Fetch matching order row if present
  const { data: orderRow } = await supabase
    .from('orders')
    .select('*, profiles:user_id (id, full_name, email)')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch creator profile if no order row profile
  const ownerUserId =
    (orderRow as any)?.user_id ||
    liveSession?.paidByUserId ||
    liveSession?.hostUserId ||
    mystery.created_by ||
    null;

  let customerProfile: any = (orderRow as any)?.profiles || null;
  if (!customerProfile && ownerUserId) {
    const { data: pRow } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', ownerUserId)
      .maybeSingle();
    customerProfile = pRow;
  }

  // Fetch characters & clues
  const { data: dbCharacters } = await supabase
    .from('characters')
    .select('*')
    .eq('mystery_id', mysteryId);

  const { data: dbClues } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('round_number', { ascending: true });

  const rawCharacters: any[] =
    dbCharacters && dbCharacters.length > 0
      ? dbCharacters
      : cachedMystery?.characters || [];

  const rawClues: any[] =
    dbClues && dbClues.length > 0 ? dbClues : cachedMystery?.clues || [];

  // Hydrate characters with owner's guest roster if available
  let guestRoster: any[] = [];
  if (ownerUserId) {
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', ownerUserId);
    if (Array.isArray(guestsData)) {
      guestRoster = guestsData;
    }
  }
  if (Array.isArray(liveSession?.detectiveGuests) && liveSession!.detectiveGuests.length > 0) {
    guestRoster = [...guestRoster, ...liveSession!.detectiveGuests];
  }

  const guestById = new Map(guestRoster.map(g => [g.id, g]));
  const guestByName = new Map(
    guestRoster
      .filter(g => g.name)
      .map(g => [String(g.name).trim().toLowerCase(), g])
  );

  const hydratedCharacters = rawCharacters.map(char => {
    const pd = (char.profile_data as any) || {};
    const gKey = String(pd.guest_name || pd.name || '').trim().toLowerCase();
    const matchedGuest =
      (pd.guest_id && guestById.get(pd.guest_id)) ||
      (gKey && guestByName.get(gKey)) ||
      null;

    if (!matchedGuest) return char;

    return {
      ...char,
      gender: matchedGuest.gender || pd.gender || char.gender,
      profile_data: {
        ...pd,
        guest_id: matchedGuest.id,
        guest_name: pd.guest_name || matchedGuest.name,
        gender: matchedGuest.gender || pd.gender || char.gender,
        avatar_url: matchedGuest.avatar_url || pd.avatar_url,
        accent: matchedGuest.accent || pd.accent,
      },
    };
  });

  const activeCharacters = hydratedCharacters.filter(
    (c: any) => c.profile_data?.is_active_in_session !== false
  );

  const inspectCharacters = activeCharacters.map((c: any) => {
    const pd = (c.profile_data as any) || {};
    const guestName = getCharacterDisplayName(c);
    const roleTitle = getCharacterRoleTitle(c);
    const gender = String(c.gender || pd.gender || 'adaptable');
    const rawBio = pd.act_summary || pd.bio || c.bio || '';
    const hydratedBio = hydrateTextWithCharacters(rawBio, hydratedCharacters, 'print');
    const rawOutfit =
      (gender.toLowerCase() === 'female' && pd.outfit_advice_feminine) ||
      (gender.toLowerCase() === 'male' && pd.outfit_advice_masculine) ||
      pd.outfit_advice ||
      pd.costume ||
      'Dress to impress in theme attire.';
    const outfitGuide = adaptOutfitForGuestGender(rawOutfit, gender);

    const plotRole: 'victim' | 'murderer' | 'assistant' | 'suspect' = c.is_victim
      ? 'victim'
      : c.plot_role === 'murderer' || pd.is_murderer
      ? 'murderer'
      : c.plot_role === 'assistant'
      ? 'assistant'
      : 'suspect';

    return {
      id: c.id,
      roleTitle,
      guestName,
      gender,
      accent: pd.accent || undefined,
      isVictim: Boolean(c.is_victim),
      plotRole,
      standardPortraitUrl: pd.standard_character_photo_url || pd.outfit_image_url || null,
      guestAvatarUrl: pd.avatar_url || null,
      hydratedBio,
      outfitGuide,
    };
  });

  const inspectClues = rawClues.map((c: any) => {
    const fmt = c.format || inferClueFormat(c);
    const audioUrl = c.audio_url || extractAudioUrlFromNotes(c.internal_notes) || null;
    const hydratedDescription = hydrateTextWithCharacters(
      c.description || '',
      hydratedCharacters,
      'print'
    );
    const hydratedTitle = hydrateTextWithCharacters(
      c.title || 'Evidence Clue',
      hydratedCharacters,
      'print'
    );

    return {
      id: c.id,
      title: hydratedTitle,
      roundNumber: c.round_number || 1,
      format: fmt,
      isFake: c.evidence_status === 'fake' || c.implication_type === 'red_herring',
      imageUrl: c.static_image_url || null,
      audioUrl,
      hydratedDescription,
      generationPrompt: c.generation_prompt || null,
    };
  });

  const rawAmount = (orderRow as any)?.amount ?? 19;
  const currency = (orderRow as any)?.currency || 'GBP';
  const amountFormatted = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
  }).format(rawAmount > 100 ? rawAmount / 100 : rawAmount);

  return (
    <AdminPackQaInspectorClient
      locale={locale}
      mystery={{
        id: mystery.id,
        slug: mystery.slug || mystery.id,
        title: mystery.title || 'Custom Mystery Pack',
        theme: mystery.theme || null,
        description: mystery.description || null,
      }}
      customer={{
        id: ownerUserId,
        name:
          customerProfile?.full_name ||
          liveSession?.customerName ||
          'Customer Host',
        email:
          customerProfile?.email ||
          liveSession?.customerEmail ||
          null,
      }}
      orderInfo={{
        orderId: String((orderRow as any)?.id || liveSession?.orderId || mystery.id),
        status: String((orderRow as any)?.status || (liveSession?.isPaid ? 'succeeded' : 'verified')),
        amountFormatted,
        createdAt: formatDate(
          (orderRow as any)?.created_at ||
            liveSession?.paidAt ||
            mystery.created_at ||
            new Date().toISOString()
        ),
        pin: liveSession?.pin || '482910',
        generationStatus: liveSession?.generationStatus || 'ready',
        generationProgress: liveSession?.generationProgress ?? 100,
      }}
      initialQaReport={liveSession?.qaReport || null}
      characters={inspectCharacters}
      clues={inspectClues}
    />
  );
}
