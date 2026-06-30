-- Add current_round column to mysteries table to track active game rounds
ALTER TABLE public.mysteries ADD COLUMN IF NOT EXISTS current_round INT DEFAULT 0;
