'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

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

export async function saveProfileAction(data: {
  full_name?: string;
  bio?: string;
  location?: string;
  pronouns?: string;
  avatar_config?: Record<string, unknown>;
  dietary_needs?: string[];
  character_preferences?: string[];
  fun_facts?: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const { data: existingProfile } = await (supabase as any)
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle();

  const resolvedFullName =
    (typeof data.full_name === 'string' && data.full_name.trim()) ||
    existingProfile?.full_name?.trim() ||
    inferFallbackHostName(user);

  const safePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    full_name: resolvedFullName,
  };
  if (data.bio !== undefined) safePayload.bio = data.bio;
  if (data.location !== undefined) safePayload.location = data.location;
  if (data.pronouns !== undefined) safePayload.pronouns = data.pronouns;
  if (data.avatar_config !== undefined) safePayload.avatar_config = data.avatar_config;
  if (data.dietary_needs !== undefined) safePayload.dietary_needs = data.dietary_needs;
  if (data.character_preferences !== undefined)
    safePayload.character_preferences = data.character_preferences;
  if (data.fun_facts !== undefined) safePayload.fun_facts = data.fun_facts;

  const { error } = await (supabase as any)
    .from('profiles')
    .upsert(safePayload, { onConflict: 'id' });

  if (error) return { error: error.message };

  revalidatePath('/en/account/profile');
  revalidatePath('/en/mysteries', 'layout');
  revalidatePath('/en/builder', 'layout');

  return { success: true, full_name: resolvedFullName };
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
