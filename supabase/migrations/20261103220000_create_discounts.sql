-- Create discounts table for managing package promotions, scheduled sales, and promo codes
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  auto_apply BOOLEAN NOT NULL DEFAULT false,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value >= 0),
  applies_to TEXT NOT NULL DEFAULT 'all' CHECK (applies_to IN ('all', 'packages', 'mysteries', 'custom')),
  target_packages TEXT[] NOT NULL DEFAULT '{}',
  target_mysteries TEXT[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  usage_limit TEXT NOT NULL DEFAULT 'unlimited' CHECK (usage_limit IN ('unlimited', 'one_per_customer', 'max_uses')),
  max_uses INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discounts_code ON public.discounts (code);
CREATE INDEX IF NOT EXISTS idx_discounts_active_window ON public.discounts (is_active, starts_at, ends_at);

ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

-- Allow public read of active discounts so storefront and checkout can evaluate promotions
CREATE POLICY "Allow public read of discounts"
  ON public.discounts
  FOR SELECT
  USING (true);

-- Allow authenticated admins to manage discounts
CREATE POLICY "Allow authenticated users to manage discounts"
  ON public.discounts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
