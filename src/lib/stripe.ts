import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: '2025-02-24.acacia' as any, // Updated to match valid Stripe API versions or removed completely
  appInfo: {
    name: 'Back Pocket Mysteries',
    url: 'https://backpocketgames.com',
  },
});

