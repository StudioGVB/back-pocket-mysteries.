'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { MysteryComplexity } from '@/types/database';

export async function saveWizardAction({
  title,
  complexity,
  guests,
  insideJokes,
}: {
  title: string;
  complexity: 'basic' | 'premium' | 'grand';
  guests: any[];
  insideJokes: string;
}) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    // Map tier to complexity
    const complexityMap: Record<string, MysteryComplexity> = {
      'basic': 'easy',
      'premium': 'medium',
      'grand': 'hard',
    };

    // 1. Create the Mystery
    const { data: mystery, error: mysteryError } = await supabase
      .from('mysteries')
      .insert({
        title,
        status: 'draft',
        min_players: guests.length,
        max_players: guests.length,
        complexity: complexityMap[complexity],
        created_by: user.id,
        inside_jokes: insideJokes,
      })
      .select()
      .single();

    if (mysteryError || !mystery) {
      console.error('Error creating mystery:', mysteryError);
      return { error: mysteryError?.message || 'Failed to create mystery' };
    }

    // 2. Create the Characters from Guests
    if (guests.length > 0) {
      const characterInserts: Database['public']['Tables']['characters']['Insert'][] = guests.map((guest, index) => ({
        mystery_id: mystery.id,
        name: guest.name,
        gender: (guest.gender?.toLowerCase() === 'masculine' ? 'male' : 
                guest.gender?.toLowerCase() === 'feminine' ? 'female' : 'adaptable') as 'male' | 'female' | 'adaptable',
        profile_data: {
          avatar_url: guest.avatar_url,
          eye_color: guest.eye_color,
          height: guest.height,
          traits: guest.traits,
          bio: guest.bio,
          guest_id: guest.id // Keep track of original guest
        },
        is_mandatory: true,
        // First character gets to be the victim for now to meet progress requirements
        is_victim: index === 0,
      }));

      const { error: charError } = await supabase
        .from('characters')
        .insert(characterInserts);

      if (charError) {
        console.error('Error creating characters:', charError);
        return { error: 'Mystery created, but failed to add characters: ' + charError.message };
      }
    }

    return { mysteryId: mystery.id };
  } catch (error: any) {
    console.error('Unexpected error in wizard save:', error);
    return { error: error.message || 'Unknown error' };
  }
}
