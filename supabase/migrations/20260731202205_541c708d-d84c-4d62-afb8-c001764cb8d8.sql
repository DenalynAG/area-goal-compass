ALTER TABLE public.assessment_evaluations
  ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES public.assessment_candidates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_evaluations_candidate_id
  ON public.assessment_evaluations(candidate_id);