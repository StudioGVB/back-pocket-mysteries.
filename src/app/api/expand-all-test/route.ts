import { NextResponse } from 'next/server';
import { requireAdmin } from '@/utils/admin-auth';
import { getMysteryById } from '@/services/mysteries';
import { expandCharacterBioAction } from '@/app/[locale]/(builder)/builder/mysteries/[id]/characters/actions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mysteryId = searchParams.get('mysteryId');

  if (!mysteryId) {
    return NextResponse.json({ error: 'Missing mysteryId parameter' }, { status: 400 });
  }

  try {
    const { supabase } = await requireAdmin();
    
    // 1. Verify access to the mystery
    const mystery = await getMysteryById(mysteryId);
    if (!mystery) {
      return NextResponse.json({ error: 'Mystery not found or you do not have permission' }, { status: 404 });
    }

    // 2. Fetch characters
    const { data: characters, error } = await supabase
      .from('characters')
      .select('*')
      .eq('mystery_id', mysteryId);

    if (error || !characters) {
      return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
    }

    const results = [];

    // 3. Loop through and expand bios
    for (const char of characters) {
      const profile_data = (char.profile_data as any) || {};
      const currentBio = profile_data.bio || char.archetype || 'No background provided.';
      
      try {
        console.log(`Expanding bio for ${char.name}...`);
        const expandedBio = await expandCharacterBioAction(mysteryId, char, currentBio, mystery.title);
        
        const newProfileData = { ...profile_data, bio: expandedBio };
        
        await supabase
          .from('characters')
          .update({ profile_data: newProfileData })
          .eq('id', char.id);
          
        results.push({ name: char.name, status: 'success' });
      } catch (err: any) {
        console.error(`Failed to expand bio for ${char.name}:`, err);
        results.push({ name: char.name, status: 'error', error: err.message });
      }
    }

    return NextResponse.json({
      message: `Successfully processed ${characters.length} characters.`,
      results
    });
    
  } catch (err: any) {
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
