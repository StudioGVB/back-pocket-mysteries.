-- Create table to track AI usage and costs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    model_name VARCHAR(255) NOT NULL,
    prompt_tokens INT NOT NULL DEFAULT 0,
    completion_tokens INT NOT NULL DEFAULT 0,
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,
    feature_name VARCHAR(255) NOT NULL,
    mystery_id UUID REFERENCES public.mysteries(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for querying by date and mystery
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_mystery_id ON public.ai_usage_logs(mystery_id);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Allow inserts from authenticated users (or service role)
CREATE POLICY "Allow authenticated users to insert AI logs"
    ON public.ai_usage_logs
    FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Only admins can select from AI logs
CREATE POLICY "Allow admins to view AI logs"
    ON public.ai_usage_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );
