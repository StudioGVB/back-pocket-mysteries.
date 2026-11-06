import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { notFound } from 'next/navigation';
import PrintCharactersClient from './PrintCharactersClient';
import { createClient } from '@/utils/supabase/server';
import { connection } from 'next/server';

export const unstable_instant = false;

export default async function PrintCharactersPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  await connection();
  const { id, locale } = await params;
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return notFound();

  // Fetch guests for the current user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let guests: any[] = [];
  if (user) {
    const { data: guestsData } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', user.id);
    if (guestsData) {
      guests = guestsData;
    }
  }

  // Create an array of character pages to render, mapping guests to characters
  const characterPages: any[] = [];
  
  characters.forEach((char: any) => {
    const profile = (char.profile_data as any) || {};
    
    // Find assigned guest if any
    const guestId = profile.guest_id;
    const guest = guestId ? guests.find(g => g.id === guestId) : null;
    
    if (char.gender === 'adaptable') {
       if (guest) {
           // If a guest is assigned, only push their specific presentation merged with base profile
           const guestGender = guest.gender?.toLowerCase() || 'neutral';
           if (guestGender.includes('female') || guestGender.includes('she')) {
               characterPages.push({ character: char, guest, gender: 'Female', presentation: { ...profile, ...(profile.presentation_female || {}) } });
           } else {
               characterPages.push({ character: char, guest, gender: 'Male', presentation: { ...profile, ...(profile.presentation_male || {}) } });
           }
       } else {
           // If no guest is assigned, push both if presentation_female/male exist, otherwise push base profile
           if (profile.presentation_female || profile.presentation_male) {
               if (profile.presentation_female) {
                   characterPages.push({ character: char, guest, gender: 'Female', presentation: { ...profile, ...profile.presentation_female } });
               }
               if (profile.presentation_male) {
                   characterPages.push({ character: char, guest, gender: 'Male', presentation: { ...profile, ...profile.presentation_male } });
               }
           } else {
               characterPages.push({ character: char, guest, gender: 'Adaptable', presentation: profile });
           }
       }
    } else {
       characterPages.push({ character: char, guest, gender: char.gender === 'female' ? 'Female' : 'Male', presentation: profile });
    }
  });

  return (
    <PrintCharactersClient 
      mystery={mystery}
      characterPages={characterPages}
      locale={locale}
      id={id}
    />
  );
}
