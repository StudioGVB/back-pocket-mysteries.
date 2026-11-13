'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { MysteryComplexity } from '@/types/database';
import { requireAdmin } from '@/utils/admin-auth';

export async function saveWizardAction({
  title,
  theme,
  complexity,
  spiceLevel,
  occasion,
  guests,
  insideJokes,
}: {
  title: string;
  theme?: string;
  complexity: 'basic' | 'premium' | 'grand';
  spiceLevel?: 'clean' | 'mild' | 'spicy' | 'filthy';
  occasion?: string;
  guests: any[];
  insideJokes: string;
}) {
  try {
    const { supabase, user } = await requireAdmin();

    // Map tier to complexity
    const complexityMap: Record<string, MysteryComplexity> = {
      'basic': 'easy',
      'premium': 'medium',
      'grand': 'hard',
    };

    // Combine occasion & inside jokes into description/inside_jokes context
    const fullInsideJokes = [
      occasion ? `Occasion: ${occasion}` : null,
      insideJokes ? `Inside Jokes & Notes: ${insideJokes}` : null,
    ].filter(Boolean).join('\n\n');

    // 1. Create the Mystery
    const { data: mystery, error: mysteryError } = await supabase
      .from('mysteries')
      .insert({
        title,
        theme: theme || null,
        status: 'draft',
        min_players: guests.length,
        max_players: guests.length,
        complexity: complexityMap[complexity],
        spice_level: spiceLevel || 'mild',
        created_by: user.id,
        inside_jokes: fullInsideJokes,
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
