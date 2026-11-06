import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ADMIN_EMAIL_ALLOWLIST, ADMIN_UID_ALLOWLIST } from '@/utils/admin-auth';

export async function GET() {
  const supabase = await createClient();
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    const email = (user.email || '').toLowerCase().trim();
    const isOwner =
      ADMIN_EMAIL_ALLOWLIST.includes(email) || ADMIN_UID_ALLOWLIST.includes(user.id);

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden: Only the platform owner can invoke this endpoint.' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('user_roles')
      .upsert({ user_id: user.id, role: 'superadmin' })
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to elevate: ' + error.message, user: user.id },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You are now a superadmin!',
      user: user.id,
      data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
