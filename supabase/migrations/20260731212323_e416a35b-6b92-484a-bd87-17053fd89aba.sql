ALTER TABLE public.assessment_evaluations
  ADD COLUMN IF NOT EXISTS profession TEXT,
  ADD COLUMN IF NOT EXISTS university TEXT;