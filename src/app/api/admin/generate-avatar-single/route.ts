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

    // Verify admin status or if user is generating for themselves
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    await generateGuestAvatarAction(guest.id, guest);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Error in generate-avatar-single:', error);
    require('fs').writeFileSync('/tmp/generate-avatar-error.txt', JSON.stringify({ message: error.message, stack: error.stack }));
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
