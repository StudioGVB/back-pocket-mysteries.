import { createServerClient } from '@supabase/ssr'
import { Database } from './src/types/database';

const supabase = createServerClient<Database>('https://test', 'test', { cookies: {} as any });
const test = async () => {
    const { data } = await supabase.from('orders').select(`
      amount,
      status,
      created_at,
      profile:profiles!user_id(full_name),
      mystery:mysteries!mystery_id(title)
    `);
    const x = data?.[0].amount;
    return data;
};
