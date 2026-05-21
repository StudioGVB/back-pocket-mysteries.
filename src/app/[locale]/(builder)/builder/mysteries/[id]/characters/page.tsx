// @ts-nocheck
import React from 'react';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { AddCharacterQuickForm } from './_components/AddCharacterQuickForm';
import { CharacterCard } from './_components/CharacterCard';
import { CastingToolbar } from './_components/CastingToolbar';
import { Locale } from '@/lib/i18n-config';
import { createClient } from '@/utils/supabase/server';
import { getStaticMockGuests } from '@/utils/mock-guests';

export default async function MysteryCharactersPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Helper to construct avatar URLs from config
  const avatarUrlHelper = (config: any) => {
    if (!config) return null;
    const params = new URLSearchParams({
      seed: config.seed || 'player',
      top: config.top || 'shortFlat',
      topColor: config.hairColor || '282828',
      hairColor: config.hairColor || '282828',
      skinColor: config.skinColor || 'ffe0bd',
      ...(config.facialHair ? { facialHair: config.facialHair } : {}),
      backgroundColor: 'transparent',
    });
    return `https://api.dicebear.com/7.x/avataaars/svg?${params}`;
  };

  // 1. Fetch manual and linked guests for the user roster
  let guests: any[] = [];
  if (user) {
    // Fetch host profile
    const { data: hostProfileRaw } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    const hostProfile = hostProfileRaw as any;

    // Fetch manual guests
    const { data: manualGuests } = await supabase
      .from('guests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Fetch linked guests
    const { data: connections } = await supabase
      .from('guest_connections')
      .select(`
        id,
        guest_user_id,
        profiles!guest_user_id (
          bio,
          location,
          pronouns,
          avatar_config,
          dietary_needs,
          character_preferences
        )
      `)
      .eq('host_user_id', user.id) as any;

    const linkedGuestIds = (connections ?? []).map((c: any) => c.guest_user_id);
    let linkedGuestNames: Record<string, string> = {};
    if (linkedGuestIds.length > 0) {
      const { data: linkedProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', linkedGuestIds);
      (linkedProfiles ?? []).forEach((p: any) => {
        linkedGuestNames[p.id] = p.full_name || 'Guest';
      });
    }

    const fetchedGuests = [
      ...(manualGuests || []).map((mg: any) => ({
        id: mg.id,
        name: mg.name,
        gender: mg.gender || 'adaptable',
        eye_color: mg.eye_color || '',
        height: mg.height || '',
        avatar_url: mg.avatar_url || '',
        traits: mg.traits || [],
        bio: mg.bio || '',
        isLinked: false
      })),
      ...(connections || []).map((c: any) => ({
        id: c.guest_user_id,
        name: linkedGuestNames[c.guest_user_id] || 'Linked Guest',
        gender: c.profiles?.pronouns === 'he/him' ? 'male' : c.profiles?.pronouns === 'she/her' ? 'female' : 'adaptable',
        eye_color: '',
        height: '',
        avatar_url: avatarUrlHelper(c.profiles?.avatar_config) || '',
        traits: c.profiles?.character_preferences || [],
        bio: c.profiles?.bio || '',
        isLinked: true
      }))
    ];

    if (hostProfile) {
      fetchedGuests.push({
        id: hostProfile.id,
        name: hostProfile.full_name || 'Gabriella Blyth',
        gender: hostProfile.pronouns?.toLowerCase().includes('she') ? 'female' : hostProfile.pronouns?.toLowerCase().includes('he') ? 'male' : 'adaptable',
        eye_color: hostProfile.avatar_config?.eyeColor || 'Hazel',
        height: hostProfile.avatar_config?.height || 'Average',
        avatar_url: avatarUrlHelper(hostProfile.avatar_config) || '',
        traits: hostProfile.character_preferences || [],
        bio: hostProfile.bio || '',
        isLinked: false
      });
    }

    const hasActiveRoster = (manualGuests && manualGuests.length > 0) || (connections && connections.length > 0);

    if (hasActiveRoster) {
      guests = fetchedGuests;
    } else {
      // User has no guests: fallback to hello@studiogvb.com mock roster
      // First try via security definer RPC
      const { data: rpcGuests } = await supabase.rpc('get_mock_guests');
      
      // Also fetch Gabriella's own profile to append as the 12th guest ("plus me is 12")
      const { data: gvbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', '4903bd39-e54f-42e4-b679-2af5d128bb8f')
        .maybeSingle();

      if (rpcGuests && rpcGuests.length > 0) {
        guests = rpcGuests.map((rg: any) => ({
          id: rg.id,
          name: rg.name,
          gender: rg.gender || 'adaptable',
          eye_color: rg.eye_color || '',
          height: rg.height || '',
          avatar_url: rg.avatar_url || '',
          traits: rg.traits || [],
          bio: rg.bio || '',
          isLinked: false
        }));

        if (gvbProfile) {
          guests.push({
            id: gvbProfile.id,
            name: gvbProfile.full_name || 'Gabriella Blyth',
            gender: gvbProfile.pronouns?.toLowerCase().includes('she') ? 'female' : 'male',
            eye_color: gvbProfile.avatar_config?.eyeColor || 'Hazel',
            height: gvbProfile.avatar_config?.height || 'Average',
            avatar_url: avatarUrlHelper(gvbProfile.avatar_config) || '',
            traits: gvbProfile.character_preferences || [],
            bio: gvbProfile.bio || '',
            isLinked: false
          });
        }
      } else {
        // Absolute fallback: load static high-quality mock roster in code
        guests = getStaticMockGuests().map((sg: any) => ({
          id: sg.id,
          name: sg.name,
          gender: sg.gender,
          eye_color: sg.eye_color,
          height: sg.height,
          avatar_url: sg.avatar_url,
          traits: sg.traits,
          bio: sg.bio,
          isLinked: false
        }));
      }
    }
  }

  // 2. Fetch mystery details and character list
  const [mystery, characters] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id)
  ]);

  if (!mystery) return null;

  // 3. Smart check: If zero characters are casted, but we have unassigned guests, auto-cast on first render!
  const unassignedCount = characters.filter(c => !c.profile_data?.guest_id).length;
  const castCount = characters.length - unassignedCount;

  if (castCount === 0 && unassignedCount > 0 && guests.length > 0) {
    let availableGuests = [...guests];
    for (const char of characters) {
      const charGender = char.gender || 'adaptable';
      let matchedIndex = -1;

      if (charGender !== 'adaptable') {
        matchedIndex = availableGuests.findIndex(g => g.gender === charGender);
      }

      if (matchedIndex === -1 && availableGuests.length > 0) {
        matchedIndex = 0;
      }

      if (matchedIndex !== -1) {
        const guest = availableGuests[matchedIndex];
        availableGuests.splice(matchedIndex, 1);

        const profile = {
          ...(char.profile_data || {}),
          guest_id: guest.id,
          guest_name: guest.name,
          name: guest.name,
          gender: guest.gender,
          eye_color: guest.eye_color,
          height: guest.height,
          avatar_url: guest.avatar_url,
          traits: guest.traits,
          bio: guest.bio,
          is_linked: guest.isLinked
        };

        await supabase
          .from('characters')
          .update({ profile_data: profile })
          .eq('id', char.id);
      }
    }

    // Re-fetch characters to reflect the auto-assigned states instantly
    const refreshedChars = await getCharactersByMysteryId(id);
    characters.length = 0;
    characters.push(...refreshedChars);
  }

  // Group characters by importance and role
  const victim = characters.find(c => c.is_victim);
  const killer = characters.find(c => c.plot_role === 'killer' && !c.is_victim);
  const assistant = characters.find(c => c.plot_role === 'assistant' && !c.is_victim);

  const topCharacterIds = new Set([victim?.id, killer?.id, assistant?.id].filter(Boolean));

  const remainingMandatory = characters.filter(c => c.is_mandatory && !topCharacterIds.has(c.id));
  const remainingOptional = characters.filter(c => !c.is_mandatory && !topCharacterIds.has(c.id));

  const mandatoryCount = remainingMandatory.length + topCharacterIds.size;
  const optionalCount = remainingOptional.length;

  const maxCharacters = mystery.complexity === 'easy' ? 10 : mystery.complexity === 'medium' ? 12 : mystery.complexity === 'hard' ? 16 : 10;
  const isAtLimit = characters.length >= maxCharacters;

  const updatedUnassignedCount = characters.filter(c => !c.profile_data?.guest_id).length;
  const updatedCastCount = characters.length - updatedUnassignedCount;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Page Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Stage Crew</h1>
              <div className="flex gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-200 px-3 py-1 rounded-md">
                  {characters.length} / {maxCharacters} total
                </span>
                <span className="text-[9px] font-black text-brand-pink uppercase tracking-widest bg-brand-pink/5 px-3 py-1 rounded-md">
                  {mandatoryCount} mandatory
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">
                  {optionalCount} optional
                </span>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">Managing {characters.length} out of {maxCharacters} principal suspects and victims.</p>
          </div>
        </div>

        {/* Guest Casting Toolbar */}
        {guests.length > 0 && (
          <CastingToolbar
            mysteryId={id}
            totalCharacters={characters.length}
            castCount={updatedCastCount}
            rosterCount={guests.length}
          />
        )}

        {/* Action Bar / Quick Add */}
        {!isAtLimit ? (
          <div className="bg-slate-50/50 p-1 rounded-[2.5rem] border border-slate-100 shadow-inner">
            <AddCharacterQuickForm mysteryId={id} />
          </div>
        ) : (
          <div className="bg-red-50 p-6 rounded-[2rem] border border-red-100 text-center flex flex-col items-center justify-center">
             <div className="text-red-400 font-black text-xl mb-1">CAST FULL</div>
             <p className="text-red-500 font-bold text-xs uppercase tracking-widest">You've reached the maximum of {maxCharacters} cast members for this tier.</p>
          </div>
        )}
      </div>

      <div className="space-y-16 pb-20">
        {/* CORE ROLES SECTION */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">The Core Roles</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {victim && (
              <CharacterCard character={victim} mysteryId={id} allCharacters={characters} guests={guests} />
            )}
            {!victim && (
              <div className="bg-red-50/30 border border-dashed border-red-100 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center">
                <p className="text-red-400 font-black text-xs uppercase tracking-widest">No victim selected</p>
              </div>
            )}
            
            {killer && (
              <CharacterCard character={killer} mysteryId={id} allCharacters={characters} guests={guests} />
            )}
            {!killer && (
              <div className="border-2 border-dashed border-brand-pink/20 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center opacity-70">
                <p className="text-brand-pink font-black text-xs uppercase tracking-widest">No killer assigned</p>
              </div>
            )}

            {assistant && (
              <CharacterCard character={assistant} mysteryId={id} allCharacters={characters} guests={guests} />
            )}
            {!assistant && (
              <div className="border-2 border-dashed border-orange-500/20 rounded-[2.5rem] p-10 text-center flex flex-col items-center justify-center opacity-50">
                <p className="text-orange-500 font-black text-xs uppercase tracking-widest">No assistant assigned</p>
                <p className="text-orange-400/70 font-bold text-[9px] uppercase tracking-widest mt-2">(Optional)</p>
              </div>
            )}
          </div>
        </section>

        {/* OTHER MANDATORY CHARACTERS SECTION */}
        {remainingMandatory.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-brand-pink" />
               <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Other Mandatory Characters</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingMandatory.map((character) => (
                <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} guests={guests} />
              ))}
            </div>
          </section>
        )}

        {/* OPTIONAL CHARACTERS SECTION */}
        <section className="space-y-6">
           <div className="flex items-center gap-3">
             <span className="w-2 h-2 rounded-full bg-slate-300" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Optional Characters (5+ Players)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {remainingOptional.map((character) => (
              <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} guests={guests} />
            ))}
            <div className="border-2 border-dashed border-slate-50 rounded-[2rem] p-10 flex flex-col items-center justify-center text-center opacity-20 h-full min-h-[200px]">
               <span className="text-2xl mb-2">➕</span>
               <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Add suspect for larger parties</p>
            </div>
          </div>
        </section>
      </div>

      {characters.length === 0 && (
         /* Large Empty State */
         <div className="border-2 border-dashed border-slate-100 rounded-[3rem] p-24 flex flex-col items-center justify-center text-center opacity-50 bg-white/50">
           <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-4xl mb-6 shadow-sm">🎭</div>
           <h3 className="text-2xl font-black text-slate-900 mb-2">The Stage is Empty</h3>
           <p className="text-slate-500 font-medium max-w-sm mb-8 leading-relaxed">
             Every great mystery needs a cast of compelling characters. Start by adding your first mandatory suspect!
           </p>
         </div>
      )}
    </div>
  );
}
