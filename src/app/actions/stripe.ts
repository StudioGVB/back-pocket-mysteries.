'use server'

import { getStripe } from '@/lib/stripe';
import {
  getRegionalPrice,
  getTierForPlayerCount,
  PriceTierKey,
  REGIONAL_PRICES,
  DEFAULT_CURRENCY,
  STRIPE_PRODUCT_IDS,
  STRIPE_PRICE_IDS,
} from '@/utils/localization';
import { Locale } from '@/lib/i18n-config';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { Database } from '@/types/database';
import { revalidatePath } from 'next/cache';
import { markMysteryPaidInStore } from '@/lib/live-session-store';
import { getActiveDiscountsAction, validatePromoCodeAction } from '@/app/actions/discounts';
import {
  findBestAutoDiscountForTarget,
  calculateDiscountedPrice,
} from '@/utils/discounts';
import { getMysteryById, getPublishedMysteryByIdOrSlug } from '@/services/mysteries';
import { sendAdminPurchaseNotificationEmail } from '@/utils/purchase-notifications';
import { triggerDetachedMysteryGeneration } from '@/lib/background-mystery-generator';

function isStripeLiveConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY || '';
  return (
    (key.startsWith('sk_test_') ||
      key.startsWith('sk_live_') ||
      key.startsWith('rk_test_') ||
      key.startsWith('rk_live_')) &&
    !key.includes('dummy') &&
    !key.includes('YOUR_') &&
    key.length > 20
  );
}

function sanitizeCurrency(currency?: string): string {
  const upper = (currency || DEFAULT_CURRENCY).toUpperCase().trim();
  return REGIONAL_PRICES[upper] ? upper : DEFAULT_CURRENCY;
}

/**
 * Resolves the authoritative pricing tier strictly from the mystery's upper player limit (`max_players`):
 * - Basic Mystery (max_players <= 6): 'basic' ($19 USD / $29 AUD)
 * - Premium Mystery (max_players <= 10): 'premium' ($25 USD / $39 AUD)
 * - Grand Mystery (max_players > 10): 'grand' ($33 USD / $49 AUD)
 * - Unlimited Monthly Pass: 'subscribe' ($39/mo USD / $59/mo AUD + 1 Free Monthly Gift Pass)
 */
async function resolveAuthoritativeTier(
  requestedTier: PriceTierKey,
  mysteryId?: string,
  slug?: string
): Promise<PriceTierKey> {
  if (requestedTier === 'subscribe') {
    return 'subscribe';
  }
  try {
    const lookupKey = mysteryId || slug;
    if (lookupKey) {
      const mystery =
        (await getPublishedMysteryByIdOrSlug(lookupKey)) ||
        (await getMysteryById(lookupKey));
      if (mystery) {
        const maxPlayers =
          (mystery as any).max_players ||
          (Array.isArray((mystery as any).characters)
            ? (mystery as any).characters.length
            : undefined);
        if (typeof maxPlayers === 'number' && maxPlayers > 0) {
          return getTierForPlayerCount(maxPlayers);
        }
      }
    }
  } catch {
    // Fallback to requestedTier if lookup fails
  }
  return requestedTier;
}

async function resolveDiscountForCheckout({
  subtotal,
  tier,
  mysteryId,
  mysterySlug,
  mysteryTitle,
  promoCode,
}: {
  subtotal: number;
  tier: PriceTierKey;
  mysteryId?: string;
  mysterySlug?: string;
  mysteryTitle?: string;
  promoCode?: string;
}): Promise<{
  discountAmount: number;
  discountLabel: string | null;
  discountCode: string | null;
  promoError?: string;
}> {
  if (promoCode && promoCode.trim()) {
    const validation = await validatePromoCodeAction({
      code: promoCode,
      tier,
      mysteryId,
      mysterySlug,
      mysteryTitle,
    });

    if (validation.valid && validation.discount) {
      const calc = calculateDiscountedPrice(subtotal, validation.discount);
      return {
        discountAmount: calc.discountAmount,
        discountLabel: `${validation.discount.name} (${validation.discount.code})`,
        discountCode: validation.discount.code,
      };
    }

    const activeDiscounts = await getActiveDiscountsAction();
    const autoMatch = findBestAutoDiscountForTarget(activeDiscounts, subtotal, {
      tier,
      mysteryId,
      mysterySlug,
      mysteryTitle,
    });
    return {
      discountAmount: autoMatch.discountAmount,
      discountLabel: autoMatch.discount ? autoMatch.discount.name : null,
      discountCode: autoMatch.discount?.code || null,
      promoError: validation.error || 'Invalid promo code.',
    };
  }

  const activeDiscounts = await getActiveDiscountsAction();
  const autoMatch = findBestAutoDiscountForTarget(activeDiscounts, subtotal, {
    tier,
    mysteryId,
    mysterySlug,
    mysteryTitle,
  });

  return {
    discountAmount: autoMatch.discountAmount,
    discountLabel: autoMatch.discount ? autoMatch.discount.name : null,
    discountCode: autoMatch.discount?.code || null,
  };
}

export async function createCheckoutSessionAction({
  tier: requestedTier,
  locale,
  currency: rawCurrency,
  mysteryId,
  slug,
  mysterySlug,
  mysteryTitle,
  guests,
  promoCode,
}: {
  tier: PriceTierKey;
  locale: Locale;
  currency: string;
  mysteryId?: string;
  slug?: string;
  mysterySlug?: string;
  mysteryTitle?: string;
  guests: number;
  promoCode?: string;
}) {
  try {
    const targetSlug = slug || mysterySlug || mysteryId || '';
    const currency = sanitizeCurrency(rawCurrency);
    const tier = await resolveAuthoritativeTier(requestedTier, mysteryId, targetSlug);
    const basePrice = getRegionalPrice(tier, currency);
    const subtotal = basePrice;
    const discountInfo = await resolveDiscountForCheckout({
      subtotal,
      tier,
      mysteryId,
      mysterySlug: targetSlug,
      mysteryTitle,
      promoCode,
    });

    const totalCost = Math.max(0.5, subtotal - discountInfo.discountAmount);
    const amountInCents = Math.round(totalCost * 100);

    const headersList = await headers();
    const origin =
      headersList.get('origin') ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000';

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignored in Server Components
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let orderId: string | undefined;
    if (user && mysteryId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          mystery_id: mysteryId,
          amount: totalCost,
          status: 'pending',
        } as any)
        .select()
        .single();

      if (!orderError && orderData) {
        orderId = orderData.id;
      }
    }

    const successUrl = targetSlug
      ? `${origin}/${locale}/mysteries/${targetSlug}/cast?checkout=success&session_id={CHECKOUT_SESSION_ID}&orderId=${orderId || ''}`
      : `${origin}/${locale}/account/orders?checkout=success&session_id={CHECKOUT_SESSION_ID}`;

    const cancelUrl = targetSlug
      ? `${origin}/${locale}/checkout/${mysteryId || targetSlug}?slug=${targetSlug}&guests=${guests}`
      : `${origin}/${locale}/pricing?checkout=cancelled`;

    if (!isStripeLiveConfigured()) {
      if (mysteryId) {
        await confirmMysteryOrderAction({
          mysteryId,
          slug: targetSlug,
          orderId,
          tier,
          amount: totalCost,
          currency,
        });
      }
      return { url: successUrl };
    }

    const isSubscription = tier === 'subscribe';
    const stripe = getStripe();
    const syncedPriceId = STRIPE_PRICE_IDS[tier]?.[currency];
    const syncedProductId = STRIPE_PRODUCT_IDS[tier];

    const lineItem =
      discountInfo.discountAmount === 0 && syncedPriceId
        ? {
            price: syncedPriceId,
            quantity: 1,
          }
        : {
            price_data: {
              currency: currency.toLowerCase(),
              ...(syncedProductId
                ? { product: syncedProductId }
                : {
                    product_data: {
                      name: isSubscription
                        ? 'Back Pocket Mysteries - Unlimited Monthly Pass (+ 1 Free Monthly Gift Pass)'
                        : `Murder Mystery Package (${tier.toUpperCase()})`,
                      description: isSubscription
                        ? 'Unlimited access to all murder mysteries (up to 16 players per event) + 1 Free Monthly Gift Pass every month.'
                        : `Flat package price, includes all ${guests} players, Kahoot live lobby & host controls${
                            discountInfo.discountLabel ? ` (${discountInfo.discountLabel} applied)` : ''
                          }.`,
                    },
                  }),
              unit_amount: amountInCents,
              ...(isSubscription ? { recurring: { interval: 'month' as const } } : {}),
            },
            quantity: 1,
          };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [lineItem],
      mode: isSubscription ? 'subscription' : 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: user?.email,
      metadata: {
        mysteryId: mysteryId || 'new',
        slug: targetSlug,
        userId: user?.id || 'anonymous',
        orderId: orderId || '',
        tier,
        guests: guests.toString(),
        stripeProductId: syncedProductId || '',
        stripePriceId: syncedPriceId || '',
        discountCode: discountInfo.discountCode || '',
        discountAmount: discountInfo.discountAmount.toString(),
      },
    });

    return { url: session.url };
  } catch (err: unknown) {
    console.error('Error creating checkout session:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createPaymentIntentAction({
  tier: requestedTier,
  locale: _locale,
  currency: rawCurrency,
  mysteryId,
  slug,
  mysterySlug,
  mysteryTitle,
  guests,
  promoCode,
}: {
  tier: PriceTierKey;
  locale: Locale;
  currency: string;
  mysteryId: string;
  slug?: string;
  mysterySlug?: string;
  mysteryTitle?: string;
  guests: number;
  promoCode?: string;
}) {
  try {
    const targetSlug = slug || mysterySlug || mysteryId;
    const currency = sanitizeCurrency(rawCurrency);
    const tier = await resolveAuthoritativeTier(requestedTier, mysteryId, targetSlug);
    const basePrice = getRegionalPrice(tier, currency);
    const subtotal = basePrice;
    const discountInfo = await resolveDiscountForCheckout({
      subtotal,
      tier,
      mysteryId,
      mysterySlug: targetSlug,
      mysteryTitle,
      promoCode,
    });

    const totalCost = Math.max(0, subtotal - discountInfo.discountAmount);
    const amountInCents = Math.max(50, Math.round(totalCost * 100));

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let orderId: string | undefined;

    if (user) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id')
        .eq('mystery_id', mysteryId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingOrder) {
        const { error: orderError } = await supabase
          .from('orders')
          .update({ amount: totalCost, status: 'pending' } as any)
          .eq('id', existingOrder.id);
        if (!orderError) orderId = existingOrder.id;
      } else {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            mystery_id: mysteryId,
            amount: totalCost,
            status: 'pending',
          } as any)
          .select()
          .single();
        if (!orderError && orderData) orderId = orderData.id;
      }
    }

    let clientSecret: string | null = null;
    let isMockGateway = true;

    if (isStripeLiveConfigured() && totalCost > 0) {
      try {
        const stripe = getStripe();
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents,
          currency: currency.toLowerCase(),
          description:
            tier === 'subscribe'
              ? 'Back Pocket Mysteries - Unlimited Monthly Pass (+ 1 Free Monthly Gift Pass)'
              : `Back Pocket Mysteries - ${tier.toUpperCase()} Package (${guests} Players)`,
          automatic_payment_methods: {
            enabled: true,
          },
          metadata: {
            mysteryId,
            slug: targetSlug,
            userId: user?.id || 'guest',
            orderId: orderId || '',
            tier,
            guests: guests.toString(),
            stripeProductId: STRIPE_PRODUCT_IDS[tier] || '',
            stripePriceId: STRIPE_PRICE_IDS[tier]?.[currency] || '',
            discountCode: discountInfo.discountCode || '',
            discountAmount: discountInfo.discountAmount.toString(),
          },
          receipt_email: user?.email,
        });
        if (paymentIntent.client_secret) {
          clientSecret = paymentIntent.client_secret;
          isMockGateway = false;
        }
      } catch (stripeErr) {
        console.error('Stripe PaymentIntent error:', stripeErr);
      }
    }

    return {
      mode: isMockGateway ? ('test_simulation' as const) : ('stripe' as const),
      clientSecret,
      isMockGateway,
      orderId,
      subtotal,
      totalCost,
      basePrice,
      discountAmount: discountInfo.discountAmount,
      discountLabel: discountInfo.discountLabel,
      discountCode: discountInfo.discountCode,
      promoError: discountInfo.promoError,
    };
  } catch (err: unknown) {
    console.error('Error creating payment intent:', err);
    return {
      mode: 'test_simulation' as const,
      clientSecret: null,
      isMockGateway: true,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

export async function confirmMysteryOrderAction({
  mysteryId,
  slug,
  orderId,
  paymentIntentId,
  sessionId,
  promoCode,
  tier,
  amount,
  currency = 'USD',
}: {
  mysteryId: string;
  slug?: string;
  orderId?: string;
  paymentIntentId?: string;
  sessionId?: string;
  promoCode?: string;
  tier?: PriceTierKey;
  amount?: number;
  currency?: string;
}): Promise<{ success: boolean; verified: boolean; error?: string }> {
  try {
    const cleanCurrency = sanitizeCurrency(currency);
    const authoritativeTier = await resolveAuthoritativeTier(tier || 'basic', mysteryId, slug);

    // When live Stripe keys are configured, strictly verify payment on the server
    // before unlocking the mystery (prevents URL spoofing via ?checkout=success).
    if (isStripeLiveConfigured()) {
      let verifiedWithStripe = false;
      const stripe = getStripe();

      if (paymentIntentId && paymentIntentId.startsWith('pi_')) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
          const metaMysteryId = pi.metadata?.mysteryId;
          const metaSlug = pi.metadata?.slug;
          const matchesMystery =
            !metaMysteryId ||
            metaMysteryId === mysteryId ||
            metaMysteryId === slug ||
            (Boolean(slug) && metaSlug === slug);

          if (pi.status === 'succeeded' && matchesMystery) {
            verifiedWithStripe = true;
          }
        } catch (err) {
          console.error('Failed to verify PaymentIntent with Stripe:', err);
        }
      }

      if (!verifiedWithStripe && sessionId && sessionId.startsWith('cs_')) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          const metaMysteryId = session.metadata?.mysteryId;
          const metaSlug = session.metadata?.slug;
          const matchesMystery =
            !metaMysteryId ||
            metaMysteryId === mysteryId ||
            metaMysteryId === slug ||
            (Boolean(slug) && metaSlug === slug);

          if (session.payment_status === 'paid' && matchesMystery) {
            verifiedWithStripe = true;
          }
        } catch (err) {
          console.error('Failed to verify Checkout Session with Stripe:', err);
        }
      }

      // Also allow 100%-off discount / promo codes verified server-side
      if (!verifiedWithStripe) {
        const basePrice = getRegionalPrice(authoritativeTier, cleanCurrency);
        const discountInfo = await resolveDiscountForCheckout({
          subtotal: basePrice,
          tier: authoritativeTier,
          mysteryId,
          mysterySlug: slug || mysteryId,
          promoCode,
        });
        if (basePrice - discountInfo.discountAmount <= 0) {
          verifiedWithStripe = true;
        }
      }

      if (!verifiedWithStripe) {
        return {
          success: false,
          verified: false,
          error: 'Payment has not been completed or verified with Stripe.',
        };
      }
    }

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const finalAmount = amount ?? getRegionalPrice(authoritativeTier, cleanCurrency);

    // Resolve mystery title & customer name
    let resolvedMysteryTitle = slug || mysteryId;
    try {
      const mysteryObj =
        (await getPublishedMysteryByIdOrSlug(mysteryId || slug || '')) ||
        (await getMysteryById(mysteryId));
      if (mysteryObj?.title) {
        resolvedMysteryTitle = mysteryObj.title;
      }
    } catch {
      // ignore
    }

    let customerName: string | null =
      (user?.user_metadata?.full_name as string) || null;
    if (user?.id && !customerName) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        if (prof?.full_name) customerName = prof.full_name;
      } catch {
        // ignore
      }
    }

    const storedSession = markMysteryPaidInStore(
      mysteryId,
      orderId || paymentIntentId || sessionId,
      {
        customerEmail: user?.email || null,
        customerName,
        durationMinutes: 20,
      }
    );
    if (slug && slug !== mysteryId) {
      markMysteryPaidInStore(slug, orderId || paymentIntentId || sessionId, {
        customerEmail: user?.email || null,
        customerName,
        durationMinutes: 20,
      });
    }

    let resolvedOrderId = orderId;
    if (orderId) {
      await supabase
        .from('orders')
        .update({ status: 'succeeded' })
        .eq('id', orderId);
    } else if (user) {
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .eq('mystery_id', mysteryId)
        .maybeSingle();

      if (existing) {
        resolvedOrderId = existing.id;
        await supabase
          .from('orders')
          .update({ status: 'succeeded' })
          .eq('id', existing.id);
      } else {
        const { data: insertedOrder } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            mystery_id: mysteryId,
            amount: finalAmount,
            status: 'succeeded',
          } as any)
          .select('id')
          .single();
        if (insertedOrder) {
          resolvedOrderId = insertedOrder.id;
        }
      }
    }

    // Also mark the carrier character's __game_session as paid & generating in Supabase
    const { data: chars } = await supabase
      .from('characters')
      .select('id, profile_data')
      .eq('mystery_id', mysteryId)
      .order('order_index', { ascending: true })
      .limit(1);

    if (chars && chars.length > 0) {
      const carrier = chars[0];
      const existingProfile = (carrier.profile_data as Record<string, any>) || {};
      const existingSession = existingProfile.__game_session || {};
      await supabase
        .from('characters')
        .update({
          profile_data: {
            ...existingProfile,
            __game_session: {
              ...existingSession,
              isPaid: true,
              paidAt: storedSession.paidAt,
              orderId: resolvedOrderId || paymentIntentId || sessionId || existingSession.orderId,
              generationStatus: storedSession.generationStatus || 'generating',
              generationStartedAt: storedSession.generationStartedAt,
              generationReadyAt: storedSession.generationReadyAt,
              generationStep: storedSession.generationStep,
              generationProgress: storedSession.generationProgress,
              customerEmail: user?.email || existingSession.customerEmail || null,
              customerName: customerName || existingSession.customerName || null,
            },
          },
        })
        .eq('id', carrier.id);
    }

    // Launch detached server-side 20-minute generation & email notification job
    // (runs on the server even if the user closes their browser window!)
    triggerDetachedMysteryGeneration({
      mysteryId,
      slug: slug || mysteryId,
      mysteryTitle: resolvedMysteryTitle,
      customerEmail: user?.email || null,
      customerName,
      pin: storedSession.pin,
      locale: 'en',
    });

    // If customer started a monthly subscription, mark their Monthly Membership as IN in CRM
    if (authoritativeTier === 'subscribe' && user?.id) {
      try {
        const fs = await import('fs');
        const path = await import('path');
        const crmPath = path.join(process.cwd(), 'data', 'customer-crm.json');
        const store = fs.existsSync(crmPath)
          ? JSON.parse(fs.readFileSync(crmPath, 'utf8'))
          : {};
        const now = new Date();
        const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const existingRec = store[user.id] || { userId: user.id };
        store[user.id] = {
          ...existingRec,
          membership: {
            ...(existingRec.membership || {}),
            isActive: true,
            monthlyRateUsd: finalAmount || 39,
            startedAt: existingRec.membership?.startedAt || now.toISOString(),
            renewsAt: nextMonth.toISOString(),
            updatedAt: now.toISOString(),
          },
        };
        if (!fs.existsSync(path.dirname(crmPath))) {
          fs.mkdirSync(path.dirname(crmPath), { recursive: true });
        }
        fs.writeFileSync(crmPath, JSON.stringify(store, null, 2), 'utf8');
      } catch {
        // non-fatal
      }
    }

    // Record promo/referral code redemption & unlock "Give 20%, Get 20%" referrer reward voucher if applicable
    if (promoCode) {
      try {
        const { recordPromoOrReferralRedemptionOnPaidOrder } = await import(
          '@/app/actions/referrals'
        );
        await recordPromoOrReferralRedemptionOnPaidOrder({
          code: promoCode,
          buyerUserId: user?.id || null,
          buyerEmail: user?.email || null,
          orderId: resolvedOrderId || paymentIntentId || sessionId || null,
          mysteryId,
        });
        cookieStore.delete('BPM_PROMO_CODE');
      } catch (err) {
        console.error('Error recording promo/referral redemption:', err);
      }
    }

    // Send email notification to hello@backpocketgames.com
    await sendAdminPurchaseNotificationEmail({
      dedupeKey:
        resolvedOrderId ||
        paymentIntentId ||
        sessionId ||
        `${user?.id || 'guest'}:${mysteryId}:${authoritativeTier}`,
      eventType:
        authoritativeTier === 'subscribe'
          ? 'subscription_started'
          : 'mystery_purchase',
      customerName,
      customerEmail: user?.email || null,
      userId: user?.id || null,
      mysteryId,
      mysteryTitle: resolvedMysteryTitle,
      tier: authoritativeTier,
      amount: finalAmount,
      currency: cleanCurrency,
      promoCode: promoCode || null,
      orderId: resolvedOrderId || paymentIntentId || sessionId || null,
    });

    revalidatePath(`/[locale]/mysteries`, 'layout');
    revalidatePath(`/[locale]/account/orders`, 'page');
    return { success: true, verified: true };
  } catch (err: unknown) {
    console.error('Error confirming mystery order:', err);
    return { success: false, verified: false, error: 'Failed to confirm order.' };
  }
}
