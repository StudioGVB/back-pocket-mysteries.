CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow insert by anyone
CREATE POLICY "Allow anonymous inserts" ON public.reviews FOR INSERT TO public WITH CHECK (true);

-- Allow public to select ONLY published reviews
CREATE POLICY "Allow public select published" ON public.reviews FOR SELECT TO public USING (status = 'published');

-- Only admins can view all or update
CREATE POLICY "Allow admin select all" ON public.reviews FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Allow admin update" ON public.reviews FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);
