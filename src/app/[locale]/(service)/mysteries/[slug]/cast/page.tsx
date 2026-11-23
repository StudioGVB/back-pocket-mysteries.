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
import { extractAccentFromAvatarUrl, buildAvatarUrl } from '@/utils/avatar';
import { generatePinFromMysteryId } from '@/app/actions/customer-mystery';
import { confirmMysteryOrderAction } from '@/app/actions/stripe';
import {
  getPaidMysteryIdsForUserInStore,
  getAllCachedMysteries,
  ensureIsolatedCustomerMysteryInstance,
} from '@/lib/live-session-store';
import { checkAndFinalizeGenerationIfDue } from '@/lib/background-mystery-generator';
import { getTierForPlayerCount } from '@/utils/localization';
import { getCleanCharacterPresentation } from '@/utils/character-display';
import { isUserAdmin } from '@/utils/admin-auth';
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

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

  // 1. Fetch authenticated user and mystery concurrently to cut initial latency in half
  const [
    {
      data: { user },
    },
    initialMysteryLookup,
  ] = await Promise.all([
    supabase.auth.getUser(),
    isUuid ? getMysteryById(slug) : getPublishedMysteryByIdOrSlug(slug),
  ]);

  // Host must be logged into their account to cast and start the game
  if (!user) {
    const nextUrl = `/${locale}/mysteries/${slug}/cast`;
    redirect(
      `/${locale}/login?next=${encodeURIComponent(nextUrl)}&message=${encodeURIComponent(
        'Please log into your account to cast and start your mystery as the host.'
      )}`
    );
  }

  let mystery: any = initialMysteryLookup;
  if (!mystery) {
    mystery = await getPublishedMysteryByIdOrSlug(slug);
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

  const templateMysteryId = String(mystery.template_mystery_id || mystery.id);
  const needsIsolatedClone = Boolean(user && mystery.created_by !== user.id);

  // 2. Load user's guest roster, admin status, paid orders, and (only if cloning) template relationships in parallel
  const [
    { data: hostProfileRaw },
    { data: manualGuests },
    { data: connections },
    templateRelationships,
    isAdmin,
    { data: paidOrder },
  ] = await Promise.all([
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
    needsIsolatedClone ? getRelationshipsByMysteryId(templateMysteryId) : Promise.resolve([]),
    isUserAdmin(supabase, user),
    supabase
      .from('orders')
      .select('id')
      .eq('user_id', user.id)
      .in('mystery_id', Array.from(new Set([String(mystery.id), templateMysteryId])))
      .eq('status', 'succeeded')
      .limit(1)
      .maybeSingle(),
  ]);

  if (needsIsolatedClone) {
    const isolated = ensureIsolatedCustomerMysteryInstance(
      mystery,
      templateRelationships,
      user.id
    );
    mystery = isolated.mystery;
  }

  let guests: any[] = [];
  let hostProfileForClient: any = null;
  let resolvedHostName = 'Gabriella Blyth';

  if (user) {
    const hostProfile = hostProfileRaw as any;
    hostProfileForClient = hostProfile;

    const isGabriella =
      user.id === '4903bd39-e54f-42e4-b679-2af5d128bb8f' ||
      String(user.email || '').toLowerCase().includes('studiogvb') ||
      String(user.email || '').toLowerCase().includes('gabriella');

    resolvedHostName =
      hostProfile?.full_name?.trim() ||
      user.user_metadata?.full_name?.trim() ||
      (isGabriella
        ? 'Gabriella Blyth'
        : user.email
            ?.split('@')[0]
            ?.replace(/[._-]+/g, ' ')
            ?.replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Gabriella Blyth');

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

    const cachedMysteries = getAllCachedMysteries();
    const cachedAvatarByGuestId = new Map<string, string>();
    for (const m of Object.values(cachedMysteries || {})) {
      for (const c of (m as any)?.characters || []) {
        const pd = c.profile_data || {};
        if (pd.guest_id && String(pd.avatar_url || '').includes('aiPhotoUrl=')) {
          cachedAvatarByGuestId.set(String(pd.guest_id), pd.avatar_url);
        }
        if (
          pd.guest_name &&
          String(pd.guest_name).toLowerCase() === resolvedHostName.toLowerCase() &&
          String(pd.avatar_url || '').includes('aiPhotoUrl=')
        ) {
          cachedAvatarByGuestId.set(user.id, pd.avatar_url);
        }
      }
    }

    // Never block SSR page load on Gemini AI image generation; use existing or cached avatar URLs immediately
    const { upgradeLegacyCloneAvatarUrl } = await import('@/utils/avatar');
    const hydratedManualGuests = (manualGuests || []).map((mg: any) => {
      let avatarUrl = mg.avatar_url || '';
      if (!avatarUrl.includes('aiPhotoUrl=')) {
        const cachedUrl = cachedAvatarByGuestId.get(mg.id);
        if (cachedUrl) {
          avatarUrl = cachedUrl;
        }
      }
      const upgradedUrl = upgradeLegacyCloneAvatarUrl({
        id: mg.id,
        name: mg.name,
        avatar_url: avatarUrl,
      });
      if (upgradedUrl && upgradedUrl !== mg.avatar_url) {
        avatarUrl = upgradedUrl;
        void supabase
          .from('guests')
          .update({ avatar_url: upgradedUrl })
          .eq('id', mg.id)
          .eq('user_id', user.id);
      }
      return {
        id: mg.id,
        name: mg.name,
        gender: mg.gender || 'adaptable',
        accent: mg.accent || extractAccentFromAvatarUrl(avatarUrl) || 'Australian',
        eye_color: mg.eye_color || '',
        height: mg.height || '',
        avatar_url: avatarUrl,
        traits: mg.traits || [],
        bio: mg.bio || '',
        isLinked: false,
        isHost: false,
      };
    });

    const hostId = hostProfile?.id || user.id;
    const hostGender = hostProfile?.pronouns?.toLowerCase().includes('she')
      ? 'female'
      : hostProfile?.pronouns?.toLowerCase().includes('he')
      ? 'male'
      : isGabriella
      ? 'female'
      : 'adaptable';
    const hostEyeColor = hostProfile?.avatar_config?.eyeColor || (isGabriella ? 'Hazel' : '');
    const hostHeight = hostProfile?.avatar_config?.height || (isGabriella ? 'Average' : '');

    const defaultGabriellaAiPhoto = '/generated-avatars/4903bd39-e54f-42e4-b679-2af5d128bb8f-host.jpg';
    const hostAvatarConfig = {
      seed: resolvedHostName,
      top: 'straight01',
      hairLength: 'Long',
      hairTexture: 'Straight',
      hairColor: '282828',
      skinColor: 'ffcd94',
      eyeColor: hostEyeColor || 'Hazel',
      height: hostHeight || 'Average',
      accessories: 'none',
      accent: 'Australian',
      ...(hostProfile?.avatar_config || {}),
      aiPhotoUrl:
        hostProfile?.avatar_config?.aiPhotoUrl ||
        (isGabriella ? defaultGabriellaAiPhoto : undefined),
    };

    let hostAvatarUrl =
      (String(hostProfile?.avatar_url || '').includes('aiPhotoUrl=')
        ? hostProfile.avatar_url
        : '') ||
      buildAvatarUrl(hostAvatarConfig, resolvedHostName) ||
      '';

    if (!hostAvatarUrl.includes('aiPhotoUrl=')) {
      const cachedHostUrl =
        cachedAvatarByGuestId.get(user.id) ||
        cachedAvatarByGuestId.get('4903bd39-e54f-42e4-b679-2af5d128bb8f') ||
        cachedAvatarByGuestId.get('mock-guest-gabriella');
      if (cachedHostUrl) {
        hostAvatarUrl = cachedHostUrl;
      }
    }

    const hostGuest = {
      id: hostId,
      name: resolvedHostName,
      gender: hostGender,
      accent: hostProfile?.avatar_config?.accent || 'Australian',
      eye_color: hostEyeColor,
      height: hostHeight,
      avatar_url: hostAvatarUrl,
      traits:
        Array.isArray(hostProfile?.character_preferences) &&
        hostProfile.character_preferences.length > 0
          ? hostProfile.character_preferences
          : isGabriella
          ? ['Cryptographer', 'Observant', 'Earl Grey Lover']
          : [],
      bio:
        hostProfile?.bio ||
        (isGabriella
          ? 'Gabriella, an amateur cryptographer and professional cat whisperer, claims she can decipher any coded message, especially after a strong cup of Earl Grey and a good snoop.'
          : ''),
      isLinked: false,
      isHost: true,
    };

    const otherGuests = [
      ...hydratedManualGuests.filter(
        (mg: any) =>
          mg.id !== hostGuest.id &&
          String(mg.name || '').trim().toLowerCase() !== resolvedHostName.toLowerCase()
      ),
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
        avatar_url: c.profiles?.avatar_config
          ? buildAvatarUrl(c.profiles.avatar_config, linkedGuestNames[c.guest_user_id] || 'Guest')
          : '',
        traits: c.profiles?.character_preferences || [],
        bio: c.profiles?.bio || '',
        isLinked: true,
        isHost: false,
      })),
    ];

    // Place the Host Profile FIRST (#1) so the host is always visible at the top and auto-selected
    guests = [hostGuest, ...otherGuests];
  }

  const ownedGuestIds = new Set(guests.map((g: any) => g.id));

  // 3. Format characters without leaking Killer / Mandatory / Optional metadata in UI labels
  const rawCharacters: any[] = mystery.characters || [];
  const formattedCharacters = rawCharacters.map((char: any) => {
    const profile = (char.profile_data || {}) as any;
    const pres = getCleanCharacterPresentation(char, rawCharacters, { mode: 'generic' });
    const effectiveGender = inferRoleGender(char, pres.shortBlurb);

    // Only pre-assign initialGuestId if that guest belongs to this customer's own roster
    const safeInitialGuestId =
      profile.guest_id && ownedGuestIds.has(profile.guest_id) ? profile.guest_id : null;

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
      outfitReferenceImages: pres.outfitReferenceImages,
      initialGuestId: safeInitialGuestId,
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
    redirect(`/${locale}/account/orders`);
  }

  const userPaidStoreIds = new Set(getPaidMysteryIdsForUserInStore(user.id, user.email));
  const cleanUserEmail = (user.email || '').trim().toLowerCase();

  const initialIsPaid =
    isAdmin ||
    Boolean(paidOrder) ||
    verifiedFromRedirect ||
    userPaidStoreIds.has(mystery.id) ||
    userPaidStoreIds.has(templateMysteryId) ||
    userPaidStoreIds.has(slug) ||
    rawCharacters.some((c: any) => {
      const sess = c.profile_data?.__game_session;
      if (!sess?.isPaid) return false;
      if (sess.paidByUserId && sess.paidByUserId === user.id) return true;
      if (
        cleanUserEmail &&
        typeof sess.customerEmail === 'string' &&
        sess.customerEmail.trim().toLowerCase() === cleanUserEmail
      ) {
        return true;
      }
      return false;
    });

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
      hostProfile={hostProfileForClient}
      hostUser={{ name: resolvedHostName, email: user?.email || '' }}
    />
  );
}
