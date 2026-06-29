import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateClueImageAction } from '@/app/actions/generator';

export async function GET(request: Request) {
  const supabase = await createClient();
  try {
    const mysteryId = '69b65a91-1cc2-4267-94a4-59297428af28';
    const clueId = 'bb0b3590-1766-4b5f-b109-2a494d411588'; // Milo's Final Draft

    console.log(`\n--- SIMULATING GENERATION FOR CLUE: ${clueId} ---`);
    
    // Fetch the clue
    const { data: clue, error: clueError } = await supabase
      .from('clues')
      .select('*')
      .eq('id', clueId)
      .single();

    if (clueError || !clue) {
      return NextResponse.json({ error: 'Clue not found: ' + clueError?.message });
    }

    const prompt = clue.generation_prompt?.trim() || (clue.description ? `${clue.title}: ${clue.description}` : clue.title);
    
    const result = await generateClueImageAction(clueId, mysteryId, prompt);

    return NextResponse.json({
      success: result.success,
      imageUrl: result.imageUrl,
      error: result.error
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
