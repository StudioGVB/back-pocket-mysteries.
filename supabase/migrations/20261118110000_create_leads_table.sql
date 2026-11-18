-- Create public.leads table for First 50 VIP Launch Waitlist & Newsletter Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  source VARCHAR(100) DEFAULT 'website',
  vip_rank INTEGER,
  qualifies_for_free_mystery BOOLEAN DEFAULT FALSE,
  free_mystery_code VARCHAR(100),
  code_sent_at TIMESTAMPTZ,
  marketing_consent BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
CREATE POLICY "Anyone can insert leads"
  ON public.leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage leads" ON public.leads;
CREATE POLICY "Admins can view and manage leads"
  ON public.leads
  FOR ALL
  TO authenticated
  USING (true);
