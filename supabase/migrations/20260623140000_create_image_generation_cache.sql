CREATE TABLE IF NOT EXISTS public.image_generation_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_hash text NOT NULL UNIQUE,
  image_url text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.image_generation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to image_generation_cache"
  ON public.image_generation_cache FOR SELECT
  USING (true);

CREATE POLICY "Allow insert access to image_generation_cache"
  ON public.image_generation_cache FOR INSERT
  WITH CHECK (true);
