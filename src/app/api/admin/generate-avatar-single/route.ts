import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { guestId, userId } = body;

    if (!guestId || !userId) {
      return NextResponse.json({ error: 'Missing guestId or userId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const role = (userRole?.role as string || '').toLowerCase();
    const isAdminByRole = ['admin', 'superadmin', 'super_admin'].includes(role);
    const isAdminByEmail = user.email?.toLowerCase() === 'hello@studiogvb.com';

    if (!isAdminByRole && !isAdminByEmail) {
       return NextResponse.json({ error: 'Unauthorized (Not Admin)' }, { status: 403 });
    }

    // Get the specific guest
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('id', guestId)
      .eq('user_id', userId)
      .single();

    if (error || !guest) {
      return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
    }

    // Generate avatar
    const genResult = await generateGuestAvatarAction(guest.id, guest);
    require('fs').writeFileSync('/tmp/generate-avatar-success.txt', JSON.stringify(genResult));

    return NextResponse.json({ success: true, genResult });

  } catch (error: any) {
    console.error('Error in generate-avatar-single:', error);
    require('fs').writeFileSync('/tmp/generate-avatar-error.txt', JSON.stringify({ message: error.message, stack: error.stack }));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
