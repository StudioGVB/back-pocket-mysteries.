import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateClueImageAction } from '@/app/actions/generator';
import { getMysteryById } from '@/services/mysteries';
import { isUserAdmin } from '@/utils/admin-auth';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mysteryId = searchParams.get('mysteryId') || '61196e53-09c3-427f-8862-30151f2ca75b';
  const mystery = await getMysteryById(mysteryId);
  return NextResponse.json({
    characters: (mystery?.characters || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      guest_id: c.profile_data?.guest_id,
      guest_name: c.profile_data?.guest_name,
      standard_character_photo_url: c.profile_data?.standard_character_photo_url,
      standard_character_photo_hash: c.profile_data?.standard_character_photo_hash,
      avatar_url: c.profile_data?.avatar_url,
    })),
  });
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mysteryId = searchParams.get('mysteryId');
    const targetClueId = searchParams.get('clueId');

    if (!mysteryId) {
      return NextResponse.json({ error: 'Missing mysteryId' }, { status: 400 });
    }

    const supabase = await createClient();
    const isLocalDev = process.env.NODE_ENV === 'development';

    if (!isLocalDev) {
      // Verify admin authentication in production
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !(await isUserAdmin(supabase, user))) {
        return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
    }

    // Ensure canonical mystery snapshot and character assignments are loaded/synced first
    await getMysteryById(mysteryId);

    // Get all clues for this mystery
    let query = supabase
      .from('clues')
      .select('id, title, description, generation_prompt, internal_notes')
      .eq('mystery_id', mysteryId);

    if (targetClueId) {
      query = query.eq('id', targetClueId);
    }

    const { data: clues, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clues || clues.length === 0) {
      return NextResponse.json({ success: true, message: 'No clues found to generate images for' });
    }

    // Generate photos sequentially ONLY for visual clues using their canonical generation_prompt
    let successCount = 0;
    const results: Array<{ clueId: string; title: string; imageUrl: string | null }> = [];
    for (const clue of clues) {
      try {
        const res = await generateClueImageAction(clue.id, mysteryId, clue.generation_prompt || '');
        if (res?.imageUrl) {
          successCount++;
        }
        results.push({
          clueId: clue.id,
          title: clue.title,
          imageUrl: res?.imageUrl || null,
        });
        // Sleep to avoid rate limits
        if (clues.length > 1) {
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (e) {
        console.error(`Failed to generate photo for clue ${clue.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, count: successCount, results });

  } catch (error: any) {
    console.error('Error in generate-mystery-clues:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
