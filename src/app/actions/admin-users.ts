'use server';

import { createClient } from '@/utils/supabase/server';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check role
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle();

  const role = (roleData?.role as string || '').toLowerCase();
  const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role);
  const isAdminByEmail = user.email?.toLowerCase() === 'hello@studiogvb.com';

  if (!isAdminByRole && !isAdminByEmail) {
    throw new Error('Not authorized as admin');
  }
  return supabase;
}

export async function adminUpdateProfile(
  targetUserId: string,
  data: {
    full_name?: string;
    email?: string;
    location?: string;
    country?: string;
    how_found_us?: string;
    bio?: string;
    fun_facts?: string;
    character_preferences?: string[];
    dietary_needs?: string[];
    avatar_config?: Record<string, unknown>;
  }
) {
  try {
    const supabase = await verifyAdmin();

    const { error } = await (supabase as any)
      .from('profiles')
      .update(data)
      .eq('id', targetUserId);

    if (error) {
      console.error('Error in adminUpdateProfile:', error);
      return { error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('adminUpdateProfile auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminAddGuest(
  targetUserId: string,
  guestData: {
    name: string;
    email?: string;
    gender?: string;
    eye_color?: string;
    height?: string;
    ethnicity?: string;
    avatar_url?: string;
    traits?: string[];
    bio?: string;
  }
) {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('guests')
      .insert({
        user_id: targetUserId,
        ...guestData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error in adminAddGuest:', error);
      return { error: error.message };
    }
    return { success: true, guest: data };
  } catch (err: any) {
    console.error('adminAddGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminUpdateGuest(
  guestId: string,
  guestData: {
    name?: string;
    email?: string;
    gender?: string;
    eye_color?: string;
    height?: string;
    ethnicity?: string;
    avatar_url?: string;
    traits?: string[];
    bio?: string;
  }
) {
  try {
    const supabase = await verifyAdmin();

    const { data, error } = await supabase
      .from('guests')
      .update(guestData)
      .eq('id', guestId)
      .select()
      .single();

    if (error) {
      console.error('Error in adminUpdateGuest:', error);
      return { error: error.message };
    }
    return { success: true, guest: data };
  } catch (err: any) {
    console.error('adminUpdateGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}

export async function adminDeleteGuest(guestId: string) {
  try {
    const supabase = await verifyAdmin();

    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', guestId);

    if (error) {
      console.error('Error in adminDeleteGuest:', error);
      return { error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('adminDeleteGuest auth error:', err);
    return { error: err.message || 'Unauthorized' };
  }
}
