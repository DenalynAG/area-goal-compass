ALTER TABLE public.assessment_competency_scores
  ADD COLUMN IF NOT EXISTS evaluator_user_id uuid;