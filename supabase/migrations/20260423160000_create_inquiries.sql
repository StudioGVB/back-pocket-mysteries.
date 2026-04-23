CREATE TABLE IF NOT EXISTS public.inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- Allow insert by anyone
CREATE POLICY "Allow anonymous inserts" ON public.inquiries FOR INSERT TO public WITH CHECK (true);

-- Only admins can view/update
CREATE POLICY "Allow admin select" ON public.inquiries FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Allow admin update" ON public.inquiries FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);
