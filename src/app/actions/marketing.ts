'use server';

import { createClient } from '@/utils/supabase/server';

export async function submitEmailLead(email: string, fullName?: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('leads')
    .insert([{ email, full_name: fullName }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'This email is already registered.' };
    }
    console.error('Error inserting lead:', error);
    return { success: false, error: 'Failed to submit email. Please try again later.' };
  }

  // Generate a unique discount code, e.g. EARLY20-XXXX
  const uniqueCode = `EARLY20-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  return { success: true, uniqueCode };
}
