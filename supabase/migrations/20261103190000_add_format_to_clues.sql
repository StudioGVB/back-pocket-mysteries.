-- Add explicit format column to clues for Split-Architecture (Digital-First, Print-Safe)
ALTER TABLE public.clues
ADD COLUMN IF NOT EXISTS format text
CHECK (format IS NULL OR format IN ('chat', 'receipt', 'document', 'cctv', 'audio', 'physical_prop', 'search_log', 'social_post', 'handwritten_note', 'medical_rx', 'call_sheet'));
