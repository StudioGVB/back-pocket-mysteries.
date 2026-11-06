import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import {
  getPublishedMysteryByIdOrSlug,
  getMysteryById,
  replacePlaceholderNamesWithRoles,
} from '@/services/mysteries';
import { getRelationshipsByMysteryId } from '@/services/relationships';
import { getStaticMockGuests } from '@/utils/mock-guests';
import { extractAccentFromAvatarUrl } from '@/utils/avatar';
import { generatePinFromMysteryId } from '@/app/actions/customer-mystery';
import { confirmMysteryOrderAction } from '@/app/actions/stripe';
import { isMysteryPaidInStore } from '@/lib/live-session-store';
import { checkAndFinalizeGenerationIfDue } from '@/lib/background-mystery-generator';
import { getTierForPlayerCount } from '@/utils/localization';
import { getCleanCharacterPresentation } from '@/utils/character-display';
import CustomerCastClient from './CustomerCastClient';

function inferRoleGender(char: any, rawBio: string): 'male' | 'female' | 'adaptable' {
  const direct = (char.gender || '').toLowerCase().trim();
  if (direct === 'male' || direct === 'female') return direct;

  const profile = (char.profile_data || {}) as any;
  const profileGender = (profile.gender || '').toLowerCase().trim();
  if (profileGender === 'male' || profileGender === 'female') return profileGender;

  const text = `${char.name || ''} ${rawBio || ''} ${profile.bio || ''}`;
  const femMatches = (text.match(/\b(she|her|hers|woman|sister|queen|bride|actress|starlet)\b/gi) || []).length;
  const mascMatches = (text.match(/\b(he|him|his|man|brother|king|groom|actor)\b/gi) || []).length;

  if (femMatches > mascMatches && femMatches > 0) return 'female';
  if (mascMatches > femMatches && mascMatches > 0) return 'male';

  return 'adaptable';
}

export const unstable_instant = false;

export default async function CustomerMysteryCastPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{
    checkout?: string;
    orderId?: string;
    payment_intent?: string;
    session_id?: string;
    view?: string;
    edit?: string;
  }>;
}) {
  const { locale, slug } = await params;
  const resolvedSearch = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Host must be logged into their account to cast and start the game
  if (!user) {
    const nextUrl = `/${locale}/mysteries/${slug}/cast`;
    redirect(
      `/${locale}/login?next=${encodeURIComponent(nextUrl)}&message=${encodeURIComponent(
        'Please log into your account to cast and start your mystery as the host.'
      )}`
    );
  }

  // 1. Resolve mystery by UUID or slug (loads full mystery snapshot into cache as well)
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  let mystery: any = isUuid
    ? await getMysteryById(slug)
    : await getPublishedMysteryByIdOrSlug(slug);

  if (!mystery) {
    mystery = await getPublishedMysteryByIdOrSlug(slug);
  }

  if (mystery?.id && (!mystery.clues || !mystery.plot_beats)) {
    const fullMystery = await getMysteryById(mystery.id);
    if (fullMystery) mystery = fullMystery;
  }

  // Fallback to the latest published or draft mystery in DB if a static showcase slug is clicked
  if (!mystery) {
    const { data: latestMysteries } = await supabase
      .from('mysteries')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);
    if (latestMysteries && latestMysteries[0]?.id) {
      mystery = await getMysteryById(latestMysteries[0].id);
    }
  }

  if (!mystery) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-16 text-center max-w-2xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl mx-auto mb-6">
          🕵️‍♀️
        </div>
        <h1 className="text-3xl font-black text-slate-900 mb-3">Mystery Not Found</h1>
        <p className="text-slate-500 font-medium mb-8">
          We couldn&apos;t find this mystery to cast right now.
        </p>
        <Link
          href={`/${locale}/mysteries`}
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-sm text-white transition-all hover:opacity-90"
          style={{ background: '#fe04c6' }}
        >
          ← Back to Browse Mysteries
        </Link>
      </div>
    );
  }

  // Ensure relationships snapshot is also warmed in disk cache so unauthenticated guests can open the copyable link immediately
  await getRelationshipsByMysteryId(mystery.id);

  // 2. Load user's guest roster (manual + linked + host profile, or fallback 12-person mock roster)
  const avatarUrlHelper = (config: any) => {
    if (!config) return '';
    const search = new URLSearchParams({
      seed: config.seed || 'player',
      top: config.top || 'shortFlat',
      topColor: config.hairColor || '282828',
      hairColor: config.hairColor || '282828',
      skinColor: config.skinColor || 'ffe0bd',
      ...(config.facialHair ? { facialHair: config.facialHair } : {}),
      ...(config.accent ? { accent: config.accent } : {}),
      backgroundColor: 'transparent',
    });
    return `https://api.dicebear.com/7.x/avataaars/svg?${search}`;
  };

  let guests: any[] = [];
  if (user) {
    const [{ data: hostProfileRaw }, { data: manualGuests }, { data: connections }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('guests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      (supabase as any)
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
        .eq('host_user_id', user.id),
    ]);

    const hostProfile = hostProfileRaw as any;
    const hasActiveRoster =
      (manualGuests && manualGuests.length > 0) || (connections && connections.length > 0);

    if (hasActiveRoster) {
      const linkedGuestIds = (connections ?? []).map((c: any) => c.guest_user_id);
      const linkedGuestNames: Record<string, string> = {};
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
          isLinked: false,
        })),
        ...(connections || []).map((c: any) => ({
          id: c.guest_user_id,
          name: linkedGuestNames[c.guest_user_id] || 'Linked Guest',
          gender:
            c.profiles?.pronouns === 'he/him'
              ? 'male'
              : c.profiles?.pronouns === 'she/her'
              ? 'female'
              : 'adaptable',
          accent: c.profiles?.avatar_config?.accent || 'Australian',
          eye_color: '',
          height: '',
          avatar_url: avatarUrlHelper(c.profiles?.avatar_config) || '',
          traits: c.profiles?.character_preferences || [],
          bio: c.profiles?.bio || '',
          isLinked: true,
        })),
      ];

      if (hostProfile) {
        fetchedGuests.push({
          id: hostProfile.id,
          name: hostProfile.full_name || user.user_metadata?.full_name || 'Host (You)',
          gender: hostProfile.pronouns?.toLowerCase().includes('she')
            ? 'female'
            : hostProfile.pronouns?.toLowerCase().includes('he')
            ? 'male'
            : 'adaptable',
          accent: hostProfile.avatar_config?.accent || 'Australian',
          eye_color: hostProfile.avatar_config?.eyeColor || '',
          height: hostProfile.avatar_config?.height || '',
          avatar_url: avatarUrlHelper(hostProfile.avatar_config) || '',
          traits: hostProfile.character_preferences || [],
          bio: hostProfile.bio || '',
          isLinked: false,
        });
      }

      guests = fetchedGuests;
    } else {
      // Fallback to RPC mock roster + host profile
      const { data: rpcGuests } = await (supabase as any).rpc('get_mock_guests');
      if (rpcGuests && (rpcGuests as any[]).length > 0) {
        guests = (rpcGuests as any[]).map((rg: any) => ({
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
        }));
        if (hostProfile) {
          guests.push({
            id: hostProfile.id,
            name: hostProfile.full_name || 'Gabriella Blyth',
            gender: hostProfile.pronouns?.toLowerCase().includes('she') ? 'female' : 'male',
            accent: hostProfile.avatar_config?.accent || 'Australian',
            eye_color: hostProfile.avatar_config?.eyeColor || 'Hazel',
            height: hostProfile.avatar_config?.height || 'Average',
            avatar_url: avatarUrlHelper(hostProfile.avatar_config) || '',
            traits: hostProfile.character_preferences || [],
            bio: hostProfile.bio || '',
            isLinked: false,
          });
        }
      }
    }
  }

  if (guests.length === 0) {
    guests = getStaticMockGuests().map((sg: any) => ({
      id: sg.id,
      name: sg.name,
      gender: sg.gender || 'adaptable',
      accent: sg.accent || extractAccentFromAvatarUrl(sg.avatar_url) || 'Australian',
      eye_color: sg.eye_color || '',
      height: sg.height || '',
      avatar_url: sg.avatar_url || '',
      traits: sg.traits || [],
      bio: sg.bio || '',
      isLinked: false,
    }));
  }

  // 3. Format characters without leaking Killer / Mandatory / Optional metadata in UI labels
  const rawCharacters: any[] = mystery.characters || [];
  const formattedCharacters = rawCharacters.map((char: any) => {
    const profile = (char.profile_data || {}) as any;
    const pres = getCleanCharacterPresentation(char, rawCharacters, { mode: 'generic' });
    const effectiveGender = inferRoleGender(char, pres.shortBlurb);

    return {
      id: char.id,
      name: char.name,
      roleTitle: pres.roleTitle,
      gender: effectiveGender,
      is_victim: pres.isVictim,
      is_mandatory: Boolean(char.is_mandatory),
      cleanBio: pres.shortBlurb,
      outfitAdvice: pres.outfitAdvice,
      outfitFeminine: pres.outfitVariants?.feminine || null,
      outfitMasculine: pres.outfitVariants?.masculine || null,
      actBullets: pres.actBullets.slice(0, 2),
      characterPhotoUrl: pres.characterPhotoUrl,
      initialGuestId: profile.guest_id || null,
    };
  });

  const initialPin = await generatePinFromMysteryId(mystery.id);
  const tier = getTierForPlayerCount(mystery.max_players || formattedCharacters.length);
  const checkoutParam = resolvedSearch?.checkout === 'success';

  let verifiedFromRedirect = false;
  if (checkoutParam) {
    const confirmRes = await confirmMysteryOrderAction({
      mysteryId: mystery.id,
      slug,
      orderId: resolvedSearch?.orderId,
      paymentIntentId: resolvedSearch?.payment_intent,
      sessionId: resolvedSearch?.session_id,
      tier,
    });
    verifiedFromRedirect = Boolean(confirmRes.verified);
  }

  let initialIsPaid =
    verifiedFromRedirect ||
    isMysteryPaidInStore(mystery.id) ||
    rawCharacters.some((c: any) => Boolean(c.profile_data?.__game_session?.isPaid));

  if (!initialIsPaid && user) {
    const { data: paidOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .eq('mystery_id', mystery.id)
      .eq('status', 'succeeded')
      .limit(1)
      .maybeSingle();

    if (paidOrder) {
      initialIsPaid = true;
    }
  }

  const justCheckedOut = checkoutParam && initialIsPaid;
  const isEditMode = resolvedSearch?.edit === '1' || resolvedSearch?.edit === 'true';

  const generationState = initialIsPaid
    ? await checkAndFinalizeGenerationIfDue({
        mysteryId: mystery.id,
        slug,
        mysteryTitle: mystery.title,
        customerEmail: user?.email || null,
        customerName: (user?.user_metadata?.full_name as string) || null,
        pin: initialPin,
        locale,
      })
    : null;

  const initialViewMode: 'cast' | 'generating' | 'ready' =
    resolvedSearch?.view === 'ready'
      ? 'ready'
      : justCheckedOut || resolvedSearch?.view === 'generating'
      ? 'generating'
      : 'cast';

  return (
    <CustomerCastClient
      locale={locale}
      mystery={{
        id: mystery.id,
        slug,
        title: mystery.title,
        theme: mystery.theme || null,
        description: mystery.description || null,
        image_url: mystery.image_url || null,
        min_players: mystery.min_players || 4,
        max_players: mystery.max_players || formattedCharacters.length || 12,
      }}
      characters={formattedCharacters}
      initialGuests={guests}
      initialPin={initialPin}
      initialIsPaid={initialIsPaid}
      justCheckedOut={justCheckedOut}
      isEditMode={isEditMode}
      customerEmail={user?.email || generationState?.customerEmail || null}
      initialGenerationState={generationState}
      tier={tier}
      initialViewMode={initialViewMode}
    />
  );
}
