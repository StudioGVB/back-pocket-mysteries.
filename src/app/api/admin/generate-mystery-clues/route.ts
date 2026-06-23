import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateClueImageAction } from '@/app/actions/generator';

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const mysteryId = searchParams.get('mysteryId');

    if (!mysteryId) {
      return NextResponse.json({ error: 'Missing mysteryId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all clues for this mystery
    const { data: clues, error } = await supabase
      .from('clues')
      .select('id, title, description')
      .eq('mystery_id', mysteryId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!clues || clues.length === 0) {
      return NextResponse.json({ success: true, message: 'No clues found to generate images for' });
    }

    // Generate avatars sequentially for ALL clues
    let successCount = 0;
    for (const clue of clues) {
      try {
        const prompt = clue.description ? `${clue.title}: ${clue.description}` : clue.title;
        await generateClueImageAction(clue.id, mysteryId, prompt);
        successCount++;
        // Sleep to avoid rate limits
        await new Promise(r => setTimeout(r, 2500));
      } catch (e) {
        console.error(`Failed to generate photo for clue ${clue.id}:`, e);
      }
    }

    return NextResponse.json({ success: true, count: successCount });

  } catch (error: any) {
    console.error('Error in generate-mystery-clues:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
