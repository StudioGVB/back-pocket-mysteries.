-- Create platform_settings table for storing global admin configurations
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read of platform_settings" ON public.platform_settings;
CREATE POLICY "Allow public read of platform_settings"
  ON public.platform_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated update of platform_settings" ON public.platform_settings;
CREATE POLICY "Allow authenticated update of platform_settings"
  ON public.platform_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
