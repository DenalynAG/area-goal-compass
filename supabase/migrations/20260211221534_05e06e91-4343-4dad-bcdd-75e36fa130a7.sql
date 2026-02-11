
-- Evaluation types enum
CREATE TYPE public.evaluation_type AS ENUM ('feedback', 'desempeno', 'performance', 'one_to_one');

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluator_user_id UUID NOT NULL,
  collaborator_user_id UUID NOT NULL,
  type evaluation_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  score INTEGER CHECK (score >= 1 AND score <= 5),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "Super admin full evaluations"
ON public.evaluations FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Admin area can manage evaluations for collaborators in their area
CREATE POLICY "Admin area manages area evaluations"
ON public.evaluations FOR ALL
USING (
  has_role(auth.uid(), 'admin_area') AND (
    EXISTS (
      SELECT 1 FROM memberships m1, memberships m2
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = evaluations.collaborator_user_id
        AND m1.area_id = m2.area_id
    )
  )
);

-- Evaluators can read/create their own evaluations
CREATE POLICY "Evaluators manage own evaluations"
ON public.evaluations FOR ALL
USING (evaluator_user_id = auth.uid());

-- Collaborators can read evaluations about themselves
CREATE POLICY "Collaborators read own evaluations"
ON public.evaluations FOR SELECT
USING (collaborator_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_evaluations_updated_at
BEFORE UPDATE ON public.evaluations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
