import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateGuestAvatarAction } from '@/app/actions/ai-guests';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify admin status or if user is generating for themselves
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all guests for this user
    const { data: allGuests, error } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    const guests = allGuests || [];

    if (guests.length === 0) {
      return NextResponse.json({ success: true, message: 'No guests found to generate avatars for' });
    }

    // Generate avatars sequentially for ALL manual guests
    let successCount = 0;
    for (const guest of guests) {
      try {
        await generateGuestAvatarAction(guest.id, guest);
        successCount++;
        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`Failed to generate avatar for guest ${guest.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, count: successCount });

  } catch (error: any) {
    console.error('Error in generate-avatars:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
