import React from 'react';
import fs from 'fs';
import path from 'path';
import { getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { getSubplotsByMysteryId } from '@/services/subplots';
import { createClient } from '@/utils/supabase/server';
import { getAllCachedMysteries } from '@/lib/live-session-store';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { resolveDisplayAvatarUrl } from '@/utils/avatar';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';
import { PackScreenerClient, FriendRosterItem } from './_components/PackScreenerClient';

function hasValidAiHeadshot(avatarUrl?: string | null): boolean {
  if (!avatarUrl) return false;
  const resolved = resolveDisplayAvatarUrl(avatarUrl);
  if (!resolved) return false;
  if (resolved.includes('api.dicebear.com')) return false;
  if (resolved.startsWith('/generated-avatars/')) {
    const cleanRel = resolved.split('?')[0].replace(/^\/+/, '');
    const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', cleanRel);
    return fs.existsSync(localPath);
  }
  return (
    resolved.includes('/storage/v1/object/public/') ||
    resolved.startsWith('data:image/') ||
    resolved.startsWith('http')
  );
}

function extractAiHeadshot(avatarUrl?: string | null, fallbackUrl?: string | null): string | null {
  if (!avatarUrl && !fallbackUrl) return null;
  const resolved = resolveDisplayAvatarUrl(avatarUrl);
  if (resolved) {
    if (resolved.startsWith('/generated-avatars/')) {
      const cleanRel = resolved.split('?')[0].replace(/^\/+/, '');
      const localPath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'public', cleanRel);
      if (!fs.existsSync(localPath)) {
        return fallbackUrl ? resolveDisplayAvatarUrl(fallbackUrl) : null;
      }
    }
    return resolved;
  }
  return fallbackUrl ? resolveDisplayAvatarUrl(fallbackUrl) : null;
}

export default async function ScreenMysteryPackPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [
    {
      data: { user },
    },
    mystery,
    relationships,
    subplots,
  ] = await Promise.all([
    supabase.auth.getUser(),
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
      const currentAvatarUrl = g.avatar_url || '';

      const key = String(g.id || g.name).toLowerCase();
      const rawGender = String(g.gender || 'adaptable').toLowerCase();
      const normGender =
        rawGender.startsWith('f')
          ? 'female'
          : rawGender.startsWith('m')
          ? 'male'
          : 'adaptable';

      friendMap.set(key, {
        id: g.id,
        name: g.name,
        gender: normGender,
        avatar_url: currentAvatarUrl,
        photoUrl: extractAiHeadshot(currentAvatarUrl),
        hasAiPhoto: hasValidAiHeadshot(currentAvatarUrl),
        eye_color: g.eye_color || '',
        height: g.height || '',
        ethnicity: g.ethnicity || '',
        bio: g.bio || '',
      });
    }
  }

  // Also harvest real friends & their AI headshots from cached mysteries
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

      if (!existing || (!existing.hasAiPhoto && photoUrl)) {
        friendMap.set(key, {
          id: pd.guest_id || key,
          name: guestName,
          gender: normGender,
          avatar_url: pd.avatar_url || existing?.avatar_url || '',
          photoUrl: photoUrl || existing?.photoUrl || null,
          hasAiPhoto: Boolean(photoUrl && !photoUrl.includes('api.dicebear.com')),
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
          hasAiPhoto: hasValidAiHeadshot(sg.avatar_url),
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
