ALTER TABLE public.evidences ADD COLUMN IF NOT EXISTS period text;
CREATE INDEX IF NOT EXISTS idx_evidences_entity_period ON public.evidences (entity_type, entity_id, period);