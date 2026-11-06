-- Pricing Tiers table synced with Stripe Products & Multi-Currency Prices
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL,
  min_players integer NOT NULL DEFAULT 4,
  max_players integer NOT NULL DEFAULT 16,
  billing_period text NOT NULL DEFAULT 'event',
  monthly_gift_passes integer NOT NULL DEFAULT 0,
  stripe_product_id text,
  prices jsonb NOT NULL,
  stripe_price_ids jsonb NOT NULL,
  features jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pricing_tiers' AND policyname = 'Public read access for pricing_tiers'
  ) THEN
    CREATE POLICY "Public read access for pricing_tiers"
      ON public.pricing_tiers
      FOR SELECT
      USING (true);
  END IF;
END $$;

INSERT INTO public.pricing_tiers (id, name, tagline, min_players, max_players, billing_period, monthly_gift_passes, stripe_product_id, prices, stripe_price_ids, features, updated_at)
VALUES
  (
    'basic',
    'Basic Package',
    '4–6 Players • Intimate Party',
    4,
    6,
    'event',
    0,
    'prod_VZJreupMPp4aPD',
    '{"USD": 19, "GBP": 15, "AUD": 29, "EUR": 18, "CAD": 25, "NZD": 32}'::jsonb,
    '{"USD": "price_1UYBDmLci6gVVJa0bmmqxgeM", "GBP": "price_1UYBDmLci6gVVJa0OhATZAHS", "AUD": "price_1UYBDmLci6gVVJa0sLcC4Cfr", "EUR": "price_1UYBDnLci6gVVJa0WDhrCrwk", "CAD": "price_1UYBDnLci6gVVJa0C9XSxPRS", "NZD": "price_1UYBDnLci6gVVJa0c84fn8JB"}'::jsonb,
    '["4–6 players included — flat price ($0 extra guest fees)", "Any Complexity & Spice Level", "Interactive clues & Kahoot-style 6-digit Game PIN", "Print or play digitally on phones"]'::jsonb,
    now()
  ),
  (
    'premium',
    'Premium Package',
    '4–10 Players • The Main Event',
    4,
    10,
    'event',
    0,
    'prod_VZJrNTnOuWyTIx',
    '{"USD": 25, "GBP": 20, "AUD": 39, "EUR": 23, "CAD": 34, "NZD": 42}'::jsonb,
    '{"USD": "price_1UYBDoLci6gVVJa0hx8386Ca", "GBP": "price_1UYBDoLci6gVVJa05RA499vM", "AUD": "price_1UYBDoLci6gVVJa0riwENCyN", "EUR": "price_1UYBDoLci6gVVJa09yMvcp14", "CAD": "price_1UYBDpLci6gVVJa0kR2MJRPd", "NZD": "price_1UYBDpLci6gVVJa0Z7D7yxFB"}'::jsonb,
    '["4–10 players included — flat price ($0 extra guest fees)", "Any Complexity & Spice Level", "Interactive clues, audio wiretaps & Kahoot-style 6-digit Game PIN", "Print or play digitally on phones"]'::jsonb,
    now()
  ),
  (
    'grand',
    'Grand Package',
    '4–16 Players • Full House',
    4,
    16,
    'event',
    0,
    'prod_VZJrAUMODWZBdF',
    '{"USD": 33, "GBP": 25, "AUD": 49, "EUR": 30, "CAD": 45, "NZD": 55}'::jsonb,
    '{"USD": "price_1UYBDqLci6gVVJa0dbwI6vxp", "GBP": "price_1UYBDqLci6gVVJa01YumFi7Z", "AUD": "price_1UYBDqLci6gVVJa00oaq0cRi", "EUR": "price_1UYBDqLci6gVVJa0b3DGFsXT", "CAD": "price_1UYBDrLci6gVVJa0bCFzt3C3", "NZD": "price_1UYBDrLci6gVVJa0vvvKiRbs"}'::jsonb,
    '["4–16 players included — flat price ($0 extra guest fees)", "Any Complexity & Spice Level", "Full cast of up to 16 suspect roles, audio & subplots", "Print or play digitally on phones"]'::jsonb,
    now()
  ),
  (
    'subscribe',
    'Unlimited Monthly Pass',
    'Unlimited + 1 Monthly Gift Pass',
    4,
    16,
    'month',
    1,
    'prod_VZJrlaKesck9tc',
    '{"USD": 39, "GBP": 30, "AUD": 59, "EUR": 36, "CAD": 55, "NZD": 65}'::jsonb,
    '{"USD": "price_1UYBDsLci6gVVJa0cbXVCce4", "GBP": "price_1UYBDsLci6gVVJa0IkzdAXA6", "AUD": "price_1UYBDsLci6gVVJa0ffwibhoN", "EUR": "price_1UYBDsLci6gVVJa0LOtYjweN", "CAD": "price_1UYBDtLci6gVVJa0oSXFMk5y", "NZD": "price_1UYBDtLci6gVVJa02b54zUDv"}'::jsonb,
    '["Unlimited mystery events every month", "1 Free Monthly Gift Pass (gift any mystery to a friend)", "All group sizes included (4–16 players per mystery)", "Commercial event & venue use license"]'::jsonb,
    now()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  min_players = EXCLUDED.min_players,
  max_players = EXCLUDED.max_players,
  billing_period = EXCLUDED.billing_period,
  monthly_gift_passes = EXCLUDED.monthly_gift_passes,
  stripe_product_id = EXCLUDED.stripe_product_id,
  prices = EXCLUDED.prices,
  stripe_price_ids = EXCLUDED.stripe_price_ids,
  features = EXCLUDED.features,
  updated_at = now();
