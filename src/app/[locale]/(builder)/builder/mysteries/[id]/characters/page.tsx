// @ts-nocheck
import React from 'react';
import Link from 'next/link';
import { getCharactersByMysteryId, getMysteryById } from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { AddCharacterQuickForm } from './_components/AddCharacterQuickForm';
import { CharacterCard } from './_components/CharacterCard';
import { CastingToolbar } from './_components/CastingToolbar';
import { RelationshipGraph } from '../relationships/_components/RelationshipGraph';
import { HighlightedMysteryText, getCharacterPillStyle } from '@/components/builder/HighlightedMysteryText';
import { getCharacterRoleTitle } from '@/utils/hydration';
import { Locale } from '@/lib/i18n-config';
import { getPackageInfoForMaxPlayers } from '@/utils/localization';
import { createClient } from '@/utils/supabase/server';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { extractAccentFromAvatarUrl } from '@/utils/avatar';

export const unstable_instant = false;

export default async function MysteryCharactersPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Helper to construct avatar URLs from config
  const avatarUrlHelper = (config: any, fallbackAiPhotoUrl?: string) => {
    if (!config && !fallbackAiPhotoUrl) return null;
    const aiPhotoUrl = config?.aiPhotoUrl || fallbackAiPhotoUrl;
    const params = new URLSearchParams({
      seed: config?.seed || 'player',
      top: config?.top || 'straight01',
      topColor: config?.hairColor || '282828',
      hairColor: config?.hairColor || '282828',
      skinColor: config?.skinColor || 'ffcd94',
      ...(config?.facialHair ? { facialHair: config.facialHair } : {}),
      ...(config?.accent ? { accent: config.accent } : {}),
      ...(aiPhotoUrl ? { aiPhotoUrl } : {}),
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
        accent: mg.accent || extractAccentFromAvatarUrl(mg.avatar_url) || 'Australian',
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
        accent: c.profiles?.avatar_config?.accent || 'Australian',
        eye_color: '',
        height: '',
        avatar_url: avatarUrlHelper(c.profiles?.avatar_config) || '',
        traits: c.profiles?.character_preferences || [],
        bio: c.profiles?.bio || '',
        isLinked: true
      }))
    ];

    const resolvedHostName =
      hostProfile?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      'Gabriella Blyth';

    const hostGuest = {
      id: hostProfile?.id || user.id,
      name: resolvedHostName,
      gender: hostProfile?.pronouns?.toLowerCase().includes('she')
        ? 'female'
        : hostProfile?.pronouns?.toLowerCase().includes('he')
        ? 'male'
        : 'female',
      accent: hostProfile?.avatar_config?.accent || 'Australian',
      eye_color: hostProfile?.avatar_config?.eyeColor || 'Hazel',
      height: hostProfile?.avatar_config?.height || 'Average',
      avatar_url:
        (String(hostProfile?.avatar_url || '').includes('aiPhotoUrl=')
          ? hostProfile.avatar_url
          : '') ||
        avatarUrlHelper(
          hostProfile?.avatar_config,
          '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-host.jpg'
        ) ||
        getStaticMockGuests()[0]?.avatar_url ||
        '',
      traits:
        Array.isArray(hostProfile?.character_preferences) &&
        hostProfile.character_preferences.length > 0
          ? hostProfile.character_preferences
          : ['Cryptographer', 'Observant', 'Earl Grey Lover'],
      bio:
        hostProfile?.bio ||
        'Gabriella, an amateur cryptographer and professional cat whisperer, claims she can decipher any coded message, especially after a strong cup of Earl Grey and a good snoop.',
      isLinked: false,
      isHost: true,
    };

    const filteredFetched = fetchedGuests.filter(
      (fg: any) =>
        fg.id !== hostGuest.id &&
        String(fg.name || '').trim().toLowerCase() !== resolvedHostName.toLowerCase()
    );

    const hasActiveRoster =
      (manualGuests && manualGuests.length > 0) || (connections && connections.length > 0);

    if (hasActiveRoster) {
      guests = [hostGuest, ...filteredFetched];
    } else {
      // User has no guests: fallback to hello@studiogvb.com mock roster
      // First try via security definer RPC
      const { data: rpcGuests } = await supabase.rpc('get_mock_guests');

      if (rpcGuests && rpcGuests.length > 0) {
        const mappedRpc = rpcGuests
          .filter(
            (rg: any) =>
              rg.id !== hostGuest.id &&
              String(rg.name || '').trim().toLowerCase() !== resolvedHostName.toLowerCase()
          )
          .map((rg: any) => ({
            id: rg.id,
            name: rg.name,
            gender: rg.gender || 'adaptable',
            accent: rg.accent || extractAccentFromAvatarUrl(rg.avatar_url) || 'Australian',
            eye_color: rg.eye_color || '',
            height: rg.height || '',
            avatar_url: rg.avatar_url || '',
            traits: rg.traits || [],
            bio: rg.bio || '',
            isLinked: false,
            isHost: false,
          }));

        guests = [hostGuest, ...mappedRpc];
      } else {
        // Absolute fallback: load static high-quality mock roster in code
        guests = getStaticMockGuests().map((sg: any, idx: number) => ({
          id: sg.id,
          name: sg.name,
          gender: sg.gender,
          accent: sg.accent || extractAccentFromAvatarUrl(sg.avatar_url) || 'Australian',
          eye_color: sg.eye_color,
          height: sg.height,
          avatar_url: sg.avatar_url,
          traits: sg.traits,
          bio: sg.bio,
          isLinked: false,
          isHost: idx === 0,
        }));
      }
    }
  }

  // 2. Fetch mystery details, character list, and relationships
  const [mystery, characters, relationships] = await Promise.all([
    getMysteryById(id),
    getCharactersByMysteryId(id),
    getRelationshipsByMysteryId(id),
  ]);

  if (!mystery) return null;

  const totalMotivesCount = characters.reduce((acc, c) => acc + (c.motives?.length || 0), 0);

  // Group characters by importance and role
  const victim = characters.find(c => c.is_victim);
  const killer = characters.find(c => c.plot_role === 'killer' && !c.is_victim);
  const assistant = characters.find(c => c.plot_role === 'assistant' && !c.is_victim);

  const topCharacterIds = new Set([victim?.id, killer?.id, assistant?.id].filter(Boolean));

  const remainingMandatory = characters.filter(c => c.is_mandatory && !topCharacterIds.has(c.id));
  const remainingOptional = characters.filter(c => !c.is_mandatory && !topCharacterIds.has(c.id));

  const mandatoryCount = remainingMandatory.length + topCharacterIds.size;
  const optionalCount = remainingOptional.length;

  const pkgInfo = getPackageInfoForMaxPlayers(mystery.max_players);
  const maxCharacters = pkgInfo.requiredCharacters;
  const isAtLimit = characters.length >= maxCharacters;
  const missingCharacters = Math.max(0, maxCharacters - characters.length);

  const updatedUnassignedCount = characters.filter(c => !c.profile_data?.guest_id).length;
  const updatedCastCount = characters.length - updatedUnassignedCount;

  return (
    <div className="space-y-16 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Page Header */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-1">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Character &amp; Cast</h1>
              <div className="flex flex-wrap gap-2">
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest bg-slate-200 px-3 py-1 rounded-md">
                  {pkgInfo.label} ({pkgInfo.rangeLabel})
                </span>
                <span
                  className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-md ${
                    characters.length >= maxCharacters
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {characters.length} / {maxCharacters} required roles
                </span>
                <span className="text-[9px] font-black text-brand-pink uppercase tracking-widest bg-brand-pink/5 px-3 py-1 rounded-md">
                  {mandatoryCount} mandatory
                </span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-md">
                  {optionalCount} optional
                </span>
              </div>
            </div>
            <p className="text-slate-400 font-medium text-sm">
              Cast &amp; costumes, interactive relationship map, and murder motives generated in the OG Base Builder.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={`/${locale}/admin/mysteries/architect?load=${id}`}
              className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
            >
              ✨ Edit Story &amp; Motives in OG Builder ↗
            </Link>
            <Link
              href={`/${locale}/mysteries/${id}/cast`}
              className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
            >
              👥 Customer Spoiler-Free Cast View →
            </Link>
          </div>
        </div>

        {missingCharacters > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black text-amber-900 uppercase tracking-wide">
                ⚠️ {missingCharacters} More Character{missingCharacters === 1 ? '' : 's'} Needed to Publish ({characters.length}/{maxCharacters})
              </p>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                Because this mystery is set to the <strong>{pkgInfo.label} ({pkgInfo.rangeLabel})</strong>, you must create all <strong>{maxCharacters} characters</strong> before it can be posted live.
              </p>
            </div>
            <Link
              href={`/${locale}/builder/mysteries/${id}`}
              className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Change Package Tier →
            </Link>
          </div>
        )}

        {/* Host Profile Spotlight in Builder */}
        {(() => {
          const hostGuest = guests.find((g: any) => g.isHost);
          if (!hostGuest) return null;
          const assignedChar = characters.find(
            (c: any) => (c.profile_data as any)?.guest_id === hostGuest.id
          );
          return (
            <div className="p-5 rounded-3xl border border-brand-pink/30 bg-brand-pink/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border-2 border-brand-pink/40 shrink-0 flex items-center justify-center shadow-xs">
                  {hostGuest.avatar_url ? (
                    <img
                      src={hostGuest.avatar_url}
                      alt={hostGuest.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl">👑</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-pink text-white text-[9px] font-black uppercase tracking-widest">
                      👑 Host Profile (You)
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {hostGuest.gender}
                    </span>
                    {assignedChar && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wider">
                        ✓ Cast as {assignedChar.name}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-black text-slate-900 truncate mt-0.5">
                    {hostGuest.name}
                  </h3>
                  {hostGuest.bio && (
                    <p className="text-xs text-slate-600 font-medium line-clamp-1">
                      {hostGuest.bio}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/${locale}/account/profile`}
                className="shrink-0 px-4 py-2 rounded-xl bg-white hover:bg-brand-pink hover:text-white text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                ✎ View / Edit My Profile →
              </Link>
            </div>
          );
        })()}

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
          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-200 text-center flex flex-col items-center justify-center">
             <div className="text-emerald-700 font-black text-xl mb-1">✓ PACKAGE ROSTER COMPLETE ({characters.length}/{maxCharacters})</div>
             <p className="text-emerald-600 font-bold text-xs uppercase tracking-widest">
               All {maxCharacters} characters for this {pkgInfo.label} ({pkgInfo.rangeLabel}) have been created. Ready to publish!
             </p>
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
        {remainingOptional.length > 0 && (
          <section className="space-y-6">
             <div className="flex items-center gap-3">
               <span className="w-2 h-2 rounded-full bg-slate-300" />
               <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Optional Characters (5+ Players)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {remainingOptional.map((character) => (
                <CharacterCard key={character.id} character={character} mysteryId={id} allCharacters={characters} guests={guests} />
              ))}
            </div>
          </section>
        )}

        {/* SECTION 2: INTERACTIVE RELATIONSHIP MAP */}
        {characters.length >= 2 && (
          <section className="space-y-6 pt-6 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-blue" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
                    Interactive Relationship Map
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-widest">
                    {relationships.length} Bonds
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Visual social web connecting all {characters.length} characters. Hover or click any node to inspect their connections.
                </p>
              </div>
              <Link
                href={`/${locale}/admin/mysteries/architect?load=${id}`}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                ✏️ Edit Web in OG Builder ↗
              </Link>
            </div>

            <RelationshipGraph characters={characters} relationships={relationships} />
          </section>
        )}

        {/* SECTION 3: CHARACTER MOTIVES & MURDER SECRETS (GENERATED IN OG BUILDER) */}
        {characters.length >= 2 && (
          <section className="space-y-6 pt-6 border-t border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">
                    Character Motives &amp; Murder Secrets
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-brand-pink/10 text-brand-pink text-[10px] font-black uppercase tracking-widest">
                    {totalMotivesCount} Active Motives
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium">
                  Why every suspect wanted the victim dead (or what secret they are desperate to hide), synced from the OG Base Builder.
                </p>
              </div>
              <Link
                href={`/${locale}/admin/mysteries/architect?load=${id}`}
                className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-[10px] font-black uppercase tracking-widest transition-all"
              >
                ✏️ Edit Motives in OG Builder ↗
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {characters
                .filter((c) => !c.is_victim || (c.motives && c.motives.length > 0))
                .map((character) => {
                  const roleTitle = getCharacterRoleTitle(character);
                  const pillStyle = getCharacterPillStyle(characters, character);
                  const motives = character.motives || [];
                  const fallbackSecret =
                    (character.profile_data as any)?.secret ||
                    (character.profile_data as any)?.motive ||
                    character.secret_objective ||
                    '';

                  return (
                    <div
                      key={character.id}
                      className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs space-y-4 hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${pillStyle.bg} ${pillStyle.text} ${pillStyle.border}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${pillStyle.dot}`} />
                            {roleTitle}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              character.is_victim
                                ? 'bg-red-100 text-red-700'
                                : character.plot_role === 'killer'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : character.plot_role === 'assistant'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {character.is_victim
                              ? '💀 Victim'
                              : character.plot_role === 'killer'
                                ? '🔪 The Killer'
                                : character.plot_role === 'assistant'
                                  ? '🤝 Accomplice'
                                  : '🕵️ Suspect'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {motives.length} {motives.length === 1 ? 'Motive' : 'Motives'}
                        </span>
                      </div>

                      {motives.length > 0 ? (
                        <div className="space-y-3">
                          {motives.map((motive: any) => {
                            const targetChar = characters.find(
                              (c) => c.id === motive.linked_character_id
                            );
                            const targetRole = targetChar
                              ? getCharacterRoleTitle(targetChar)
                              : victim
                                ? getCharacterRoleTitle(victim)
                                : 'The Victim';
                            const targetStyle = getCharacterPillStyle(
                              characters,
                              targetChar || victim || targetRole
                            );

                            return (
                              <div
                                key={motive.id}
                                className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                                      {motive.motive_type || 'Motive'}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                      against
                                    </span>
                                    <span
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black border ${targetStyle.bg} ${targetStyle.text} ${targetStyle.border}`}
                                    >
                                      <span className={`w-1.5 h-1.5 rounded-full ${targetStyle.dot}`} />
                                      {targetRole}
                                    </span>
                                  </div>
                                  {motive.motive_strength && (
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
                                        motive.motive_strength === 'critical' ||
                                        motive.motive_strength === 'high'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-slate-200 text-slate-700'
                                      }`}
                                    >
                                      {motive.motive_strength} stakes
                                    </span>
                                  )}
                                </div>
                                {motive.notes && (
                                  <div className="text-xs text-slate-700 font-medium leading-relaxed">
                                    <HighlightedMysteryText
                                      text={motive.notes}
                                      characters={characters}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : fallbackSecret ? (
                        <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 text-xs text-slate-700 font-medium leading-relaxed">
                          <HighlightedMysteryText
                            text={fallbackSecret}
                            characters={characters}
                          />
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                          <p className="text-[11px] font-bold text-slate-400">
                            No motive recorded yet — generate or edit motives in the OG Base Builder.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}
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
