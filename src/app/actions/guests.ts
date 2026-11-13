'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';
import { extractAccentFromAvatarUrl, extractAgeFromAvatarUrl } from '@/utils/avatar';
import { getAllCachedMysteries, updateCachedMysteryCharacters } from '@/lib/live-session-store';

export async function saveGuestAction(guestData: {
  name: string;
  email?: string;
  gender?: string;
  eye_color?: string;
  eyeColor?: string;
  height?: string;
  ethnicity?: string;
  avatar_url?: string;
  avatarUrl?: string;
  traits?: string[];
  bio?: string;
  [key: string]: any;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const insertPayload = {
      user_id: user.id,
      name: guestData.name,
      email: guestData.email,
      gender: guestData.gender,
      eye_color: guestData.eye_color ?? guestData.eyeColor,
      height: guestData.height,
      ethnicity: guestData.ethnicity,
      avatar_url: guestData.avatar_url ?? guestData.avatarUrl,
      traits: guestData.traits ? guestData.traits.slice(0, 3) : undefined,
      bio: guestData.bio,
    };

    const { data, error } = await supabase
      .from('guests')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Error saving guest:', error);
      return { error: error.message };
    }

    // Automatically generate AI standard profile photo as soon as a guest is created
    let finalGuest = data;
    if (data && !(data.avatar_url || '').includes('aiPhotoUrl=')) {
      try {
        const aiRes = await generateGuestAvatarAction(data.id, data);
        if (aiRes?.publicUrl) {
          finalGuest = { ...data, avatar_url: aiRes.publicUrl };
        }
      } catch (aiErr) {
        console.error('Auto AI avatar generation on saveGuestAction failed:', aiErr);
      }
    }

    return { guest: finalGuest };
  } catch (error: any) {
    console.error('Unexpected error saving guest:', error);
    return { error: error.message || 'Unknown error' };
  }
}

export async function updateGuestAction(id: string, guestData: {
  name?: string;
  email?: string;
  gender?: string;
  eye_color?: string;
  eyeColor?: string;
  height?: string;
  ethnicity?: string;
  avatar_url?: string;
  avatarUrl?: string;
  traits?: string[];
  bio?: string;
  [key: string]: any;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const updatePayload = {
      name: guestData.name,
      email: guestData.email,
      gender: guestData.gender,
      eye_color: guestData.eye_color ?? guestData.eyeColor,
      height: guestData.height,
      ethnicity: guestData.ethnicity,
      avatar_url: guestData.avatar_url ?? guestData.avatarUrl,
      traits: guestData.traits ? guestData.traits.slice(0, 3) : undefined,
      bio: guestData.bio,
    };

    const { data, error } = await supabase
      .from('guests')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return { error: error.message };
    }

    // Automatically generate AI standard profile photo if missing or appearance changed
    let finalGuest = data;
    if (data && !(data.avatar_url || '').includes('aiPhotoUrl=')) {
      try {
        const aiRes = await generateGuestAvatarAction(data.id, data);
        if (aiRes?.publicUrl) {
          finalGuest = { ...data, avatar_url: aiRes.publicUrl };
        }
      } catch (aiErr) {
        console.error('Auto AI avatar generation on updateGuestAction failed:', aiErr);
      }
    }

    // Always propagate the updated guest's accent, age, gender, name, and avatar_url to assigned characters
    try {
      const updatedUrl = finalGuest?.avatar_url || updatePayload.avatar_url || '';
      const resolvedAccent =
        guestData.accent ||
        extractAccentFromAvatarUrl(updatedUrl) ||
        undefined;
      const resolvedAge =
        guestData.age ||
        extractAgeFromAvatarUrl(updatedUrl) ||
        undefined;

      const { data: userMysteries } = await supabase
        .from('mysteries')
        .select('id')
        .eq('created_by', user.id);

      const mysteryIds = (userMysteries || []).map((m: any) => m.id);
      if (mysteryIds.length > 0) {
        const { data: allChars } = await supabase
          .from('characters')
          .select('id, mystery_id, profile_data')
          .in('mystery_id', mysteryIds);

        for (const ch of allChars || []) {
          const pd = (ch.profile_data as any) || {};
          if (
            pd.guest_id === id ||
            (finalGuest?.name &&
              pd.guest_name &&
              String(pd.guest_name).toLowerCase() === String(finalGuest.name).toLowerCase())
          ) {
            const nextPd = {
              ...pd,
              guest_id: id,
              guest_name: finalGuest?.name || pd.guest_name,
              name: finalGuest?.name || pd.name,
              avatar_url: updatedUrl || pd.avatar_url,
              ...(resolvedAccent ? { accent: resolvedAccent } : {}),
              ...(resolvedAge ? { age: resolvedAge } : {}),
              ...(finalGuest?.gender ? { gender: finalGuest.gender } : {}),
            };
            await supabase
              .from('characters')
              .update({ profile_data: nextPd })
              .eq('id', ch.id);
          }
        }
      }

      const allCached = getAllCachedMysteries();
      for (const cachedMystery of allCached || []) {
        const mId = cachedMystery?.id;
        if (!mId) continue;
        if (cachedMystery?.created_by && cachedMystery.created_by !== user.id) {
          continue;
        }
        const chars = cachedMystery?.characters || [];
        let changed = false;
        const nextChars = chars.map((c: any) => {
          const pd = c.profile_data || {};
          if (
            pd.guest_id === id ||
            (finalGuest?.name &&
              pd.guest_name &&
              String(pd.guest_name).toLowerCase() === String(finalGuest.name).toLowerCase())
          ) {
            changed = true;
            return {
              ...c,
              profile_data: {
                ...pd,
                guest_id: id,
                guest_name: finalGuest?.name || pd.guest_name,
                name: finalGuest?.name || pd.name,
                avatar_url: updatedUrl || pd.avatar_url,
                ...(resolvedAccent ? { accent: resolvedAccent } : {}),
                ...(resolvedAge ? { age: resolvedAge } : {}),
                ...(finalGuest?.gender ? { gender: finalGuest.gender } : {}),
              },
            };
          }
          return c;
        });
        if (changed) {
          updateCachedMysteryCharacters(mId, nextChars);
        }
      }
    } catch (propErr) {
      console.error('Error propagating guest accent update to characters:', propErr);
    }

    return { guest: finalGuest };
  } catch (error: any) {
    console.error('Unexpected error updating guest:', error);
    return { error: error.message || 'Unknown error' };
  }
}

export async function removeGuestAction(id: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error removing guest:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error removing guest:', error);
    return { error: error.message || 'Unknown error' };
  }
}
