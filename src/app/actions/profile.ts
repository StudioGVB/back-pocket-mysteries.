'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  buildAvatarUrl,
  computeAvatarPhysicalSignature,
  stripAiPhotoFromAvatarUrl,
} from '@/utils/avatar';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';

function inferFallbackHostName(user: any): string {
  const metaName = user?.user_metadata?.full_name?.trim();
  if (metaName) return metaName;

  const email = String(user?.email || '').toLowerCase();
  if (
    user?.id === '4903bd39-e54f-42e4-b679-2af5d128bb8f' ||
    email.includes('studiogvb') ||
    email.includes('gabriella')
  ) {
    return 'Gabriella Blyth';
  }

  if (email.includes('@')) {
    const prefix = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (prefix) {
      return prefix.replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return 'Gabriella Blyth';
}

function pronounsToGender(pronouns?: string | null): string {
  const p = String(pronouns || '').toLowerCase();
  if (p.includes('she')) return 'female';
  if (p.includes('he')) return 'male';
  if (p.includes('they') || p === 'any') return 'neutral';
  return 'female';
}

export async function saveProfileAction(data: {
  full_name?: string;
  bio?: string;
  location?: string;
  pronouns?: string;
  avatar_config?: Record<string, unknown>;
  dietary_needs?: string[];
  character_preferences?: string[];
  fun_facts?: string;
  forceRegeneratePhoto?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: existingProfile } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedFullName =
    (typeof data.full_name === 'string' && data.full_name.trim()) ||
    existingProfile?.full_name?.trim() ||
    inferFallbackHostName(user);

  const resolvedPronouns =
    data.pronouns !== undefined ? data.pronouns : existingProfile?.pronouns || 'She/Her';
  const resolvedGender = pronounsToGender(resolvedPronouns);

  const prevConfig = (existingProfile?.avatar_config || {}) as Record<string, any>;
  const incomingConfig = (data.avatar_config || prevConfig || {}) as Record<string, any>;

  const prevSig =
    prevConfig.aiPhotoSig ||
    computeAvatarPhysicalSignature(prevConfig as any, {
      gender: pronounsToGender(existingProfile?.pronouns),
      eyeColor: prevConfig.eyeColor,
      height: prevConfig.height,
      ethnicity: prevConfig.ethnicity,
    });

  const nextSig = computeAvatarPhysicalSignature(incomingConfig as any, {
    gender: resolvedGender,
    eyeColor: incomingConfig.eyeColor,
    height: incomingConfig.height,
    ethnicity: incomingConfig.ethnicity,
  });

  const hasExistingAiPhoto = Boolean(
    incomingConfig.aiPhotoUrl ||
      prevConfig.aiPhotoUrl ||
      String(existingProfile?.avatar_url || '').includes('aiPhotoUrl=')
  );
  const physicalChanged = prevSig !== nextSig;
  const shouldRegeneratePhoto =
    Boolean(data.forceRegeneratePhoto) || !hasExistingAiPhoto || physicalChanged;

  const mergedConfig: Record<string, any> = {
    ...prevConfig,
    ...incomingConfig,
    aiPhotoSig: nextSig,
  };

  if (shouldRegeneratePhoto) {
    delete mergedConfig.aiPhotoUrl;
  }

  let baseAvatarUrl =
    buildAvatarUrl(mergedConfig, resolvedFullName, {
      includeAiPhoto: !shouldRegeneratePhoto,
    }) || '';

  let finalAiPhotoUrl: string | undefined = mergedConfig.aiPhotoUrl;

  if (shouldRegeneratePhoto) {
    try {
      const strippedUrl = stripAiPhotoFromAvatarUrl(baseAvatarUrl);
      const aiRes = await generateGuestAvatarAction(
        user.id,
        {
          id: user.id,
          name: resolvedFullName,
          gender: resolvedGender,
          pronouns: resolvedPronouns,
          eye_color: mergedConfig.eyeColor || 'Hazel',
          height: mergedConfig.height || 'Average',
          ethnicity: mergedConfig.ethnicity || '',
          age: mergedConfig.age || 'young',
          avatar_config: mergedConfig,
          avatar_url: strippedUrl,
        },
        {
          forceRegenerate: physicalChanged || Boolean(data.forceRegeneratePhoto),
          isHostProfile: true,
        }
      );
      if (aiRes?.publicUrl) {
        baseAvatarUrl = aiRes.publicUrl;
      }
      if (aiRes?.aiPhotoUrl) {
        finalAiPhotoUrl = aiRes.aiPhotoUrl;
        mergedConfig.aiPhotoUrl = aiRes.aiPhotoUrl;
      }
    } catch (aiErr) {
      console.error('Host profile AI photo generation failed:', aiErr);
    }
  }

  const safePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    full_name: resolvedFullName,
    avatar_config: mergedConfig,
    avatar_url: baseAvatarUrl,
  };
  if (data.bio !== undefined) safePayload.bio = data.bio;
  if (data.location !== undefined) safePayload.location = data.location;
  if (data.pronouns !== undefined) safePayload.pronouns = data.pronouns;
  if (data.dietary_needs !== undefined) safePayload.dietary_needs = data.dietary_needs;
  if (data.character_preferences !== undefined)
    safePayload.character_preferences = data.character_preferences;
  if (data.fun_facts !== undefined) safePayload.fun_facts = data.fun_facts;

  const { error } = await (supabase as any)
    .from('profiles')
    .upsert(safePayload, { onConflict: 'id' });

  if (error) return { error: error.message };

  // Propagate updated Host Profile avatar_url & traits to any characters where the Host is cast
  // and clear stale standard_character_photo_url if the host's physical photo was regenerated
  try {
    const { getAllCachedMysteries, updateCachedMysteryCharacters } = await import(
      '@/lib/live-session-store'
    );
    const { splitGuestNameParts } = await import('@/utils/hydration');
    const parsedHostName = splitGuestNameParts(resolvedFullName);
    const hostNameLower = resolvedFullName.toLowerCase();

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
          pd.guest_id === user.id ||
          (pd.guest_name && String(pd.guest_name).trim().toLowerCase() === hostNameLower)
        ) {
          const nextPd: Record<string, any> = {
            ...pd,
            guest_id: user.id,
            guest_name: parsedHostName.fullName || resolvedFullName,
            name: parsedHostName.fullName || resolvedFullName,
            first_name: parsedHostName.firstName,
            last_name: parsedHostName.lastName,
            avatar_url: baseAvatarUrl || pd.avatar_url,
            gender: resolvedGender,
            eye_color: mergedConfig.eyeColor || pd.eye_color,
            height: mergedConfig.height || pd.height,
            ethnicity: mergedConfig.ethnicity || pd.ethnicity,
          };
          if (shouldRegeneratePhoto) {
            delete nextPd.standard_character_photo_url;
            delete nextPd.standard_character_photo_hash;
            delete nextPd.outfit_image_url;
          }
          await supabase.from('characters').update({ profile_data: nextPd }).eq('id', ch.id);
        }
      }
    }

    const allCached = getAllCachedMysteries();
    for (const cachedMystery of allCached || []) {
      const mId = cachedMystery?.id;
      if (!mId) continue;
      if (cachedMystery?.created_by && cachedMystery.created_by !== user.id) continue;
      const chars = cachedMystery?.characters || [];
      let changed = false;
      const nextChars = chars.map((c: any) => {
        const pd = c.profile_data || {};
        if (
          pd.guest_id === user.id ||
          (pd.guest_name && String(pd.guest_name).trim().toLowerCase() === hostNameLower)
        ) {
          changed = true;
          const nextPd: Record<string, any> = {
            ...pd,
            guest_id: user.id,
            guest_name: parsedHostName.fullName || resolvedFullName,
            name: parsedHostName.fullName || resolvedFullName,
            first_name: parsedHostName.firstName,
            last_name: parsedHostName.lastName,
            avatar_url: baseAvatarUrl || pd.avatar_url,
            gender: resolvedGender,
            eye_color: mergedConfig.eyeColor || pd.eye_color,
            height: mergedConfig.height || pd.height,
            ethnicity: mergedConfig.ethnicity || pd.ethnicity,
          };
          if (shouldRegeneratePhoto) {
            delete nextPd.standard_character_photo_url;
            delete nextPd.standard_character_photo_hash;
            delete nextPd.outfit_image_url;
          }
          return { ...c, profile_data: nextPd };
        }
        return c;
      });
      if (changed) {
        updateCachedMysteryCharacters(mId, nextChars);
      }
    }
  } catch (propErr) {
    console.warn('Could not propagate host profile update to characters:', propErr);
  }

  revalidatePath('/en/account/profile');
  revalidatePath('/en/mysteries', 'layout');
  revalidatePath('/en/builder', 'layout');

  return {
    success: true,
    full_name: resolvedFullName,
    avatar_url: baseAvatarUrl,
    aiPhotoUrl: finalAiPhotoUrl,
    avatar_config: mergedConfig,
    regeneratedPhoto: shouldRegeneratePhoto,
  };
}

export async function getProfileAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { profile: null };

  const { data } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return { profile: data };
}
