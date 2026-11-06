-- 1. Add audio_url and voice_region columns to clues and mysteries
ALTER TABLE public.clues
ADD COLUMN IF NOT EXISTS audio_url text;

ALTER TABLE public.clues
ADD COLUMN IF NOT EXISTS voice_region text
CHECK (voice_region IS NULL OR voice_region IN ('en-US', 'en-GB', 'en-AU'));

ALTER TABLE public.mysteries
ADD COLUMN IF NOT EXISTS voice_region text
CHECK (voice_region IS NULL OR voice_region IN ('en-US', 'en-GB', 'en-AU'));

-- 2. Create public storage bucket for mystery audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('mystery-audio', 'mystery-audio', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up RLS policies for mystery-audio bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Access mystery-audio'
  ) THEN
    CREATE POLICY "Public Access mystery-audio"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'mystery-audio' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Insert mystery-audio'
  ) THEN
    CREATE POLICY "Auth Insert mystery-audio"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'mystery-audio' AND auth.role() = 'authenticated' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Update mystery-audio'
  ) THEN
    CREATE POLICY "Auth Update mystery-audio"
    ON storage.objects FOR UPDATE
    USING ( bucket_id = 'mystery-audio' AND auth.role() = 'authenticated' );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Auth Delete mystery-audio'
  ) THEN
    CREATE POLICY "Auth Delete mystery-audio"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'mystery-audio' AND auth.role() = 'authenticated' );
  END IF;
END $$;
