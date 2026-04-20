'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createMysteryAction(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;

  const { data, error } = await supabase
    .from('mysteries')
    .insert({
      title,
      theme,
      created_by: user.id,
      status: 'draft',
      min_players: 5,
      max_players: 12
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating mystery:', error);
    throw new Error(error.message);
  }

  revalidatePath('/builder/mysteries');
  redirect(`/builder/mysteries/${data.id}`);
}

export async function updateMysteryAction(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error('Unauthorized');

  const title = formData.get('title') as string;
  const theme = formData.get('theme') as string;
  const description = formData.get('description') as string;
  const min_players = parseInt(formData.get('min_players') as string);
  const max_players = parseInt(formData.get('max_players') as string);
  const complexity = formData.get('complexity') as any;
  const spice_level = formData.get('spice_level') as any;
  const status = formData.get('status') as any;

  const { error } = await supabase
    .from('mysteries')
    .update({
      title,
      theme,
      description,
      min_players,
      max_players,
      complexity,
      spice_level,
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) {
    console.error('Error updating mystery:', error);
    throw new Error(error.message);
  }

  revalidatePath(`/builder/mysteries/${id}`);
  revalidatePath(`/builder/mysteries/${id}/core`);
}
