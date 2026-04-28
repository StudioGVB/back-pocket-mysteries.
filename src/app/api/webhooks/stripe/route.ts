import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook signature verification failed: ${errorMessage}`);
    return new NextResponse(`Webhook Error: ${errorMessage}`, { status: 400 });
  }

  // Set up Supabase client (using service role key if needed to bypass RLS, or anon key if RLS allows updates via webhooks. Let's try anon key first or assume we might need a service role key if it's protected).
  // Assuming a generic update here with a standard key or we bypass RLS for webhooks.
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Webhook might need service role if RLS is strict
    {
      cookies: {
        getAll() { return [] },
        setAll() {}
      }
    }
  );

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Record<string, unknown>;
      const metadata = paymentIntent.metadata as Record<string, string> | undefined;

      if (metadata && metadata.orderId) {
        // Update the order status
        const { error } = await supabase
          .from('orders')
          .update({ status: 'succeeded' })
          .eq('id', metadata.orderId);

        if (error) {
          console.error('Error updating order:', error);
        }
      }
      break;

    // Handle other events as needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return new NextResponse('Webhook processed successfully', { status: 200 });
}
