'use server'

import { stripe } from '@/lib/stripe';
import { getFormattedPrice, getRegionalPrice, getCurrencyForLocale } from '@/utils/localization';
import { Locale } from '@/lib/i18n-config';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/database';
import { headers } from 'next/headers';

export async function createCheckoutSessionAction({
  tier,
  isPro,
  locale,
  currency,
  mysteryId,
  guests,
}: {
  tier: 'basic' | 'premium' | 'grand';
  isPro: boolean;
  locale: Locale;
  currency: string;
  mysteryId?: string;
  guests: number;
}) {
  try {
    const limits = {
      basic: { included: 6, extraTier: 'basicExtra' as const },
      premium: { included: 8, extraTier: 'premiumExtra' as const },
      grand: { included: 10, extraTier: 'grandExtra' as const },
    };
    const currentLimit = limits[tier];
    
    const basePrice = getRegionalPrice(tier, currency);
    const extraGuests = Math.max(0, guests - currentLimit.included);
    const extraGuestFee = getRegionalPrice(currentLimit.extraTier, currency);
    const totalExtraGuestCost = extraGuests * extraGuestFee;
    const proCost = isPro ? getRegionalPrice('plusAddon', currency) : 0;
    
    const totalCost = basePrice + totalExtraGuestCost + proCost;
    const amountInCents = Math.round(totalCost * 100);

    const headersList = await headers();
    const origin = headersList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Store order in database first as pending
    let orderId: string | undefined;
    if (user && mysteryId) {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          mystery_id: mysteryId,
          amount: totalCost,
          currency: currency,
          status: 'pending',
        })
        .select()
        .single();
        
      if (!orderError && orderData) {
        orderId = orderData.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Mystery Package: ${tier.toUpperCase()}`,
              description: `Includes ${guests} guests${isPro ? ' + Pro Customizer' : ''}.`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/${locale}/builder/${mysteryId}?checkout=success`,
      cancel_url: `${origin}/${locale}/pricing?checkout=cancelled`,
      customer_email: user?.email,
      metadata: {
        mysteryId: mysteryId || 'new',
        userId: user?.id || 'anonymous',
        orderId: orderId || '',
        tier,
        guests: guests.toString(),
        isPro: isPro.toString(),
      },
    });

    return { url: session.url };
  } catch (err: unknown) {
    console.error('Error creating checkout session:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export async function createPaymentIntentAction({
  tier,
  isPro,
  locale,
  currency,
  mysteryId,
  guests,
}: {
  tier: 'basic' | 'premium' | 'grand';
  isPro: boolean;
  locale: Locale;
  currency: string;
  mysteryId: string;
  guests: number;
}) {
  try {
    const limits = {
      basic: { included: 6, extraTier: 'basicExtra' as const },
      premium: { included: 8, extraTier: 'premiumExtra' as const },
      grand: { included: 10, extraTier: 'grandExtra' as const },
    };
    const currentLimit = limits[tier];
    
    const basePrice = getRegionalPrice(tier, currency);
    const extraGuests = Math.max(0, guests - currentLimit.included);
    const extraGuestFee = getRegionalPrice(currentLimit.extraTier, currency);
    const totalExtraGuestCost = extraGuests * extraGuestFee;
    const proCost = isPro ? getRegionalPrice('plusAddon', currency) : 0;
    
    const totalCost = basePrice + totalExtraGuestCost + proCost;
    const amountInCents = Math.round(totalCost * 100);

    const cookieStore = await cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {}
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User must be logged in to checkout');
    }

    // Upsert order in database first as pending
    let orderId: string | undefined;
    
    // Check if an order already exists for this mystery
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('mystery_id', mysteryId)
      .eq('user_id', user.id)
      .single();

    if (existingOrder) {
      const { error: orderError } = await supabase
        .from('orders')
        .update({ amount: totalCost, currency: currency, status: 'pending' })
        .eq('id', existingOrder.id);
      if (!orderError) orderId = existingOrder.id;
    } else {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          mystery_id: mysteryId,
          amount: totalCost,
          currency: currency,
          status: 'pending',
        })
        .select()
        .single();
      if (!orderError && orderData) orderId = orderData.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata: {
        mysteryId,
        userId: user.id,
        orderId: orderId || '',
        tier,
        guests: guests.toString(),
        isPro: isPro.toString(),
      },
      // You can add receipt_email if needed
      receipt_email: user.email,
    });

    return { 
      clientSecret: paymentIntent.client_secret, 
      totalCost,
      basePrice,
      extraGuestCost: totalExtraGuestCost,
      proCost
    };
  } catch (err: unknown) {
    console.error('Error creating payment intent:', err);
    return { error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

