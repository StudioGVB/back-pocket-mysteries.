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

  const { error } = await (supabase as any)
    .from('profiles')
    .upsert({ 
      id: user.id, 
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      ...data 
    }, { onConflict: 'id' });

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
