-- Ensure orders table has mystery_id column in case database is out of sync
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mystery_id UUID REFERENCES public.mysteries(id) ON DELETE SET NULL;

-- Add performance indexing on foreign keys to speed up builder and playroom joins
CREATE INDEX IF NOT EXISTS idx_characters_mystery_id ON public.characters(mystery_id);
CREATE INDEX IF NOT EXISTS idx_clues_mystery_id ON public.clues(mystery_id);
CREATE INDEX IF NOT EXISTS idx_plot_beats_mystery_id ON public.plot_beats(mystery_id);
CREATE INDEX IF NOT EXISTS idx_subplots_mystery_id ON public.subplots(mystery_id);
CREATE INDEX IF NOT EXISTS idx_relationships_mystery_id ON public.relationships(mystery_id);
CREATE INDEX IF NOT EXISTS idx_orders_mystery_id ON public.orders(mystery_id);
