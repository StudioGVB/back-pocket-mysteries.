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

export async function createMystery(mystery: MysteryInsert) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mysteries')
    .insert(mystery)
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating mystery: ${error.message}`);
  }

  return data;
}

export async function updateMystery(id: string, updates: Partial<Mystery>) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('mysteries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`Error updating mystery: ${error.message}`);
  }

  return data;
}

export async function getTransactions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      profiles:user_id (full_name),
      mysteries:mystery_id (title)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }

  return data;
}

export async function processRefund(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: 'refunded' })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

