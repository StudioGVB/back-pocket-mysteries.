import { createClient } from '@/utils/supabase/server';
import { Database } from '@/types/database';

type Mystery = Database['public']['Tables']['mysteries']['Row'];
type MysteryInsert = Database['public']['Tables']['mysteries']['Insert'];

export async function getMysteries() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mysteries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching mysteries:', error);
    return [];
  }

  return data;
}

export async function getUserMysteries() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return [];

  const { data, error } = await supabase
    .from('mysteries')
    .select('*')
    .eq('created_by', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user mysteries:', error);
    return [];
  }

  return data;
}

export async function createMystery(mystery: MysteryInsert) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('mysteries')
    .insert({
      ...mystery,
      created_by: user?.id
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mystery: ${error.message}`);
  }

  return data;
}

export async function getMysteryById(id: string) {
  const supabase = await createClient();
  const { data, error } = (await supabase
    .from('mysteries')
    .select(`
      *,
      characters (
        *,
        motives!motives_character_id_fkey (*)
      ),
      clues (*),
      plot_beats (*),
      subplots (*)
    `)
    .eq('id', id)
    .single()) as any;

  if (error) {
    if (error.code === '42703') {
      console.error('CRITICAL: Database column missing in mystery fetch. Please run character SQL migration.', error);
    } else {
      console.error('Error fetching mystery details:', error);
    }
    return null;
  }

  require('fs').appendFileSync('actions_log.txt', new Date().toISOString() + ' Mystery ' + id + ' created_by: ' + data.created_by + '\n');

  return data;
}

export async function getCharactersByMysteryId(mysteryId: string) {
  const supabase = await createClient();
  
  const { data, error } = (await supabase
    .from('characters')
    .select(`
      *,
      motives!motives_character_id_fkey (*)
    `)
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true })) as any;

  if (error) {
    if (error.code === 'PGRST201') {
      console.error('Join Error: Multiple relationships found. Using motives!motives_character_id_fkey');
      // If this fails, we can fall back or try the other key, but this is the primary one
    } else {
      console.error('Error fetching characters:', error);
    }
    return [];
  }

  return data;
}

export async function createCharacter(character: Database['public']['Tables']['characters']['Insert']) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('characters')
    .insert(character)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating character: ${error.message}`);
  }

  return data;
}

export async function updateCharacter(id: string, updates: Database['public']['Tables']['characters']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating character: ${error.message}`);
  }

  return data;
}

export async function deleteCharacter(id: string) {
  const supabase = await createClient();
  
  // 1. Delete motives where the character is the owner or the target
  await supabase.from('motives').delete().or(`character_id.eq.${id},linked_character_id.eq.${id}`);
  
  // 2. Delete relationships involving this character
  await supabase.from('relationships').delete().or(`character_a_id.eq.${id},character_b_id.eq.${id}`);

  // 3. Delete the character
  const { error } = await supabase
    .from('characters')
    .delete()
    .eq('id', id);
    
  if (error) {
    throw new Error(`Error deleting character: ${error.message}`);
  }
}

export async function getPlotBeatsByMysteryId(mysteryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching plot beats:', error);
    return [];
  }

  return data;
}

export async function createPlotBeat(beat: Database['public']['Tables']['plot_beats']['Insert']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .insert(beat)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating plot beat: ${error.message}`);
  }

  return data;
}

export async function updatePlotBeat(id: string, updates: Database['public']['Tables']['plot_beats']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('plot_beats')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating plot beat: ${error.message}`);
  }

  return data;
}

export async function deletePlotBeat(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('plot_beats')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting plot beat: ${error.message}`);
  }
}

export async function reorderPlotBeats(id: string, newSortOrder: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('plot_beats')
    .update({ sort_order: newSortOrder })
    .eq('id', id);

  if (error) {
    throw new Error(`Error reordering plot beat: ${error.message}`);
  }
}

export async function getCluesByMysteryId(mysteryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .select('*')
    .eq('mystery_id', mysteryId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching clues:', error);
    return [];
  }

  return data;
}

export async function createClue(clue: Database['public']['Tables']['clues']['Insert']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .insert(clue)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating clue: ${error.message}`);
  }

  return data;
}

export async function updateClue(id: string, updates: Database['public']['Tables']['clues']['Update']) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('clues')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating clue: ${error.message}`);
  }

  return data;
}

export async function deleteClue(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('clues')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`Error deleting clue: ${error.message}`);
  }
}
