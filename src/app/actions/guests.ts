'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';

export async function saveGuestAction(guestData: {
  name: string;
  email?: string;
  gender?: string;
  eye_color?: string;
  height?: string;
  avatar_url?: string;
  traits?: string[];
  bio?: string;
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

    const { data, error } = await supabase
      .from('guests')
      .insert({
        user_id: user.id,
        ...guestData
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving guest:', error);
      return { error: error.message };
    }

    return { guest: data };
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
  height?: string;
  avatar_url?: string;
  traits?: string[];
  bio?: string;
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

    const { data, error } = await supabase
      .from('guests')
      .update(guestData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating guest:', error);
      return { error: error.message };
    }

    return { guest: data };
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
