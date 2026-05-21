import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get current user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    // Attempt to upsert superadmin role
    const { data, error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'superadmin' })
      .select();
      
    if (error) {
       // If RLS blocks it, we might have to use a different approach
       return NextResponse.json({ error: 'Failed to elevate: ' + error.message, user: user.id }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'You are now a superadmin!', user: user.id, data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
