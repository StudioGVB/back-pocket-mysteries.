import Stripe from 'stripe';

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2025-02-24.acacia' as any,
    appInfo: {
      name: 'Back Pocket Mysteries',
      url: 'https://backpocketgames.com',
    },
  });
}

export const stripe = getStripe();
