'use server';

import { createClient } from '@/utils/supabase/server';

export async function saveProfileAction(data: {
  bio?: string;
  location?: string;
  pronouns?: string;
  avatar_config?: Record<string, unknown>;
  dietary_needs?: string[];
  character_preferences?: string[];
  fun_facts?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Not authenticated' };

  const safePayload: Record<string, unknown> = {
    id: user.id,
    email: user.email,
    full_name: user.user_metadata?.full_name || '',
  };
  if (data.bio !== undefined) safePayload.bio = data.bio;
  if (data.location !== undefined) safePayload.location = data.location;
  if (data.pronouns !== undefined) safePayload.pronouns = data.pronouns;
  if (data.avatar_config !== undefined) safePayload.avatar_config = data.avatar_config;
  if (data.dietary_needs !== undefined) safePayload.dietary_needs = data.dietary_needs;
  if (data.character_preferences !== undefined) safePayload.character_preferences = data.character_preferences;
  if (data.fun_facts !== undefined) safePayload.fun_facts = data.fun_facts;

  const { error } = await (supabase as any)
    .from('profiles')
    .upsert(safePayload, { onConflict: 'id' });

  if (error) return { error: error.message };
  return { success: true };
}

export async function getProfileAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { profile: null };

  const { data } = await (supabase as any)
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { profile: data };
}
