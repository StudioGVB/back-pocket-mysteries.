import React from 'react';
import { getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { getSubplotsByMysteryId } from '@/services/subplots';
import { createClient } from '@/utils/supabase/server';
import { getAllCachedMysteries } from '@/lib/live-session-store';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { PackScreenerClient, FriendRosterItem } from './_components/PackScreenerClient';

function extractAiHeadshot(avatarUrl?: string | null, fallbackUrl?: string | null): string | null {
  if (!avatarUrl && !fallbackUrl) return null;
  const raw = String(avatarUrl || '');
  const match = raw.match(/[?&]aiPhotoUrl=([^&]+)/);
  if (match) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      // ignore
    }
  }
  if (
    raw.startsWith('/generated-avatars/') ||
    raw.includes('/storage/v1/object/public/') ||
    raw.startsWith('data:image/')
  ) {
    return raw;
  }
  return fallbackUrl || raw || null;
}

export default async function ScreenMysteryPackPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [mystery, relationships, subplots] = await Promise.all([
    getMysteryById(id),
    getRelationshipsByMysteryId(id),
    getSubplotsByMysteryId(id),
  ]);

  if (!mystery) return null;

  // Build the user's real friend roster from Supabase `guests` + cached mysteries + fallback roster
  const friendMap = new Map<string, FriendRosterItem>();

  if (user) {
    const { data: dbGuests } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    for (const g of dbGuests || []) {
      const key = String(g.id || g.name).toLowerCase();
      friendMap.set(key, {
        id: g.id,
        name: g.name,
        gender: String(g.gender || 'adaptable').toLowerCase(),
        avatar_url: g.avatar_url || '',
        photoUrl: extractAiHeadshot(g.avatar_url),
        bio: g.bio || '',
      });
    }
  }

  // Also harvest real friends & their AI headshots from cached mysteries (e.g. Gabby, Luke, Polly, Scarlett, Darren, Jason, Matt, Alex, Elia)
  for (const cm of getAllCachedMysteries()) {
    for (const cc of cm?.characters || []) {
      const pd = cc?.profile_data || {};
      const guestName = String(pd.guest_name || '').trim();
      if (!guestName) continue;
      const key = String(pd.guest_id || guestName).toLowerCase();
      const existing = friendMap.get(key);
      const photoUrl = extractAiHeadshot(
        pd.avatar_url,
        pd.standard_character_photo_url
      );
      const rawGender = String(pd.selected_gender || pd.gender || cc.gender || 'adaptable').toLowerCase();
      const normGender =
        rawGender.startsWith('f')
          ? 'female'
          : rawGender.startsWith('m')
          ? 'male'
          : 'adaptable';

      if (!existing || (!existing.photoUrl && photoUrl)) {
        friendMap.set(key, {
          id: pd.guest_id || key,
          name: guestName,
          gender: normGender,
          avatar_url: pd.avatar_url || existing?.avatar_url || '',
          photoUrl: photoUrl || existing?.photoUrl || null,
          bio: pd.bio || existing?.bio || '',
        });
      }
    }
  }

  // Fallback to static mock roster if fewer than 6 friends found
  if (friendMap.size < 6) {
    for (const sg of getStaticMockGuests()) {
      const key = sg.name.toLowerCase();
      if (!friendMap.has(key)) {
        friendMap.set(key, {
          id: sg.id,
          name: sg.name,
          gender: String(sg.gender || 'adaptable').toLowerCase(),
          avatar_url: sg.avatar_url,
          photoUrl: extractAiHeadshot(sg.avatar_url),
          bio: sg.bio || '',
        });
      }
    }
  }

  const friendRoster = Array.from(friendMap.values());

  return (
    <div className="animate-in fade-in duration-300 pb-20">
      <PackScreenerClient
        mystery={mystery}
        relationships={relationships || []}
        subplots={subplots || []}
        friendRoster={friendRoster}
      />
    </div>
  );
}
