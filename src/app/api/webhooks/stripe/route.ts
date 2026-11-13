import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { headers } from 'next/headers';
import {
  markMysteryPaidInStore,
  deriveUserMysteryInstanceId,
} from '@/lib/live-session-store';
import { sendAdminPurchaseNotificationEmail } from '@/utils/purchase-notifications';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return new NextResponse('Webhook Error: Missing signature or webhook secret', {
      status: 400,
    });
  }

  let event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {},
      },
    }
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
    case 'checkout.session.completed':
    case 'customer.subscription.created': {
      const obj = event.data.object as unknown as Record<string, any>;
      const metadata = (obj.metadata as Record<string, string> | undefined) || {};
      const mysteryId = metadata.mysteryId;
      const slug = metadata.slug;
      const orderId = metadata.orderId;
      const userId = metadata.userId && metadata.userId !== 'anonymous' && metadata.userId !== 'guest'
        ? metadata.userId
        : null;
      const tier = metadata.tier || (obj.mode === 'subscription' || event.type === 'customer.subscription.created' ? 'subscribe' : 'basic');

      if (mysteryId && mysteryId !== 'subscription' && mysteryId !== 'new') {
        if (userId) {
          const isolatedId = deriveUserMysteryInstanceId(mysteryId, userId);
          markMysteryPaidInStore(isolatedId, orderId, {
            paidByUserId: userId,
          });
        }
        markMysteryPaidInStore(mysteryId, orderId, {
          paidByUserId: userId,
        });
        if (slug && slug !== mysteryId) {
          markMysteryPaidInStore(slug, orderId, {
            paidByUserId: userId,
          });
        }

        if (userId) {
          const { data: ownedMysteryRow } = await supabase
            .from('mysteries')
            .select('id, created_by')
            .eq('id', mysteryId)
            .eq('created_by', userId)
            .maybeSingle();

          if (ownedMysteryRow) {
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
                      paidAt: new Date().toISOString(),
                      paidByUserId: userId,
                      orderId: orderId || existingSession.orderId,
                    },
                  },
                })
                .eq('id', carrier.id);
            }
          }
        }
      }

      if (orderId) {
        const { error } = await supabase
          .from('orders')
          .update({ status: 'succeeded' })
          .eq('id', orderId);

        if (error) {
          console.error('Error updating order via webhook:', error);
        }
      }

      // Extract amount & customer info for the email to hello@backpocketgames.com
      const rawCents =
        typeof obj.amount_total === 'number'
          ? obj.amount_total
          : typeof obj.amount_received === 'number'
          ? obj.amount_received
          : typeof obj.amount === 'number'
          ? obj.amount
          : 0;
      const amountMajor = rawCents > 0 ? rawCents / 100 : tier === 'subscribe' ? 39 : 25;
      const currency = String(obj.currency || 'USD').toUpperCase();
      const customerEmail =
        obj.customer_details?.email ||
        obj.customer_email ||
        obj.receipt_email ||
        null;
      const customerName = obj.customer_details?.name || null;

      if (metadata.discountCode) {
        try {
          const { recordPromoOrReferralRedemptionOnPaidOrder } = await import(
            '@/app/actions/referrals'
          );
          await recordPromoOrReferralRedemptionOnPaidOrder({
            code: metadata.discountCode,
            buyerUserId: userId,
            buyerEmail: customerEmail,
            orderId: orderId || String(obj.id || ''),
            mysteryId: mysteryId || null,
          });
        } catch (err) {
          console.error('Error recording promo/referral redemption in webhook:', err);
        }
      }

      await sendAdminPurchaseNotificationEmail({
        dedupeKey: orderId || String(obj.id || ''),
        eventType: tier === 'subscribe' ? 'subscription_started' : 'mystery_purchase',
        customerName,
        customerEmail,
        userId,
        mysteryId: mysteryId || null,
        mysteryTitle: slug || mysteryId || null,
        tier,
        amount: amountMajor,
        currency,
        promoCode: metadata.discountCode || null,
        discountAmount: metadata.discountAmount ? Number(metadata.discountAmount) : undefined,
        orderId: orderId || String(obj.id || ''),
      });

      break;
    }

    default:
      break;
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}
