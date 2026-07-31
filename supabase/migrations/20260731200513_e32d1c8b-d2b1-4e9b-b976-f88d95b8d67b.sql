CREATE TABLE public.assessment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  document_id text,
  phone text,
  email text,
  position text,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  subarea_id uuid REFERENCES public.subareas(id) ON DELETE SET NULL,
  evaluator_user_id uuid,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'pendiente',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_candidates TO authenticated;
GRANT ALL ON public.assessment_candidates TO service_role;

ALTER TABLE public.assessment_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidates"
  ON public.assessment_candidates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert candidates"
  ON public.assessment_candidates FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update candidates"
  ON public.assessment_candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete candidates"
  ON public.assessment_candidates FOR DELETE TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_assessment_candidates_updated_at
  BEFORE UPDATE ON public.assessment_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

CREATE TABLE public.assessment_candidate_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.assessment_candidates(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.assessment_competencies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (candidate_id, competency_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_candidate_competencies TO authenticated;
GRANT ALL ON public.assessment_candidate_competencies TO service_role;

ALTER TABLE public.assessment_candidate_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view candidate competencies"
  ON public.assessment_candidate_competencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert candidate competencies"
  ON public.assessment_candidate_competencies FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can delete candidate competencies"
  ON public.assessment_candidate_competencies FOR DELETE TO authenticated USING (true);