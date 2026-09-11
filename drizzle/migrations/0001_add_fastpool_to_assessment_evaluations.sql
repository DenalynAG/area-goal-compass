ALTER TABLE public.assessment_evaluations
  ADD COLUMN IF NOT EXISTS is_fastpool boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fastpool_marked_at timestamp with time zone;