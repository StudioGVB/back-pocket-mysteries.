-- Create a bucket for character images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('character-images', 'character-images', true)
ON CONFLICT (id) DO NOTHING;

-- Set up security policies
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'character-images' );

CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'character-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Update" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'character-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'character-images' AND auth.role() = 'authenticated' );
