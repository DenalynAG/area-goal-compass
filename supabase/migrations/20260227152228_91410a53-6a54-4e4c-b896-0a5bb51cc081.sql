
-- Table to define evaluation criteria per position (cargo)
CREATE TABLE public.evaluation_criteria (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_name text NOT NULL,
  criterion_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_comment boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read evaluation_criteria"
  ON public.evaluation_criteria FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages evaluation_criteria"
  ON public.evaluation_criteria FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Table to store individual criterion scores per evaluation
CREATE TABLE public.evaluation_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  criterion_id uuid NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score integer CHECK (score >= 1 AND score <= 5),
  comment text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full evaluation_scores"
  ON public.evaluation_scores FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Evaluator manages own evaluation_scores"
  ON public.evaluation_scores FOR ALL
  USING (EXISTS (
    SELECT 1 FROM evaluations e WHERE e.id = evaluation_scores.evaluation_id AND e.evaluator_user_id = auth.uid()
  ));

CREATE POLICY "Collaborator reads own evaluation_scores"
  ON public.evaluation_scores FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM evaluations e WHERE e.id = evaluation_scores.evaluation_id AND e.collaborator_user_id = auth.uid()
  ));

CREATE POLICY "Admin area manages area evaluation_scores"
  ON public.evaluation_scores FOR ALL
  USING (has_role(auth.uid(), 'admin_area'::app_role) AND EXISTS (
    SELECT 1 FROM evaluations e
    JOIN memberships m1 ON m1.user_id = auth.uid()
    JOIN memberships m2 ON m2.user_id = e.collaborator_user_id AND m1.area_id = m2.area_id
    WHERE e.id = evaluation_scores.evaluation_id
  ));

CREATE INDEX idx_evaluation_criteria_position ON public.evaluation_criteria(position_name);
CREATE INDEX idx_evaluation_scores_evaluation ON public.evaluation_scores(evaluation_id);
