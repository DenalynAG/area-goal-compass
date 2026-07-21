
CREATE TABLE public.assessment_evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL,
  area_id UUID REFERENCES public.areas(id) ON DELETE SET NULL,
  subarea_id UUID REFERENCES public.subareas(id) ON DELETE SET NULL,
  position TEXT,
  score_creatividad SMALLINT CHECK (score_creatividad IN (0,1,3,5)),
  score_trabajo_equipo SMALLINT CHECK (score_trabajo_equipo IN (0,1,3,5)),
  score_pensamiento_analitico SMALLINT CHECK (score_pensamiento_analitico IN (0,1,3,5)),
  weighted_score NUMERIC(5,2),
  evaluator_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_evaluations TO authenticated;
GRANT ALL ON public.assessment_evaluations TO service_role;

ALTER TABLE public.assessment_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view assessments"
  ON public.assessment_evaluations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert assessments"
  ON public.assessment_evaluations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid()));

CREATE POLICY "Creator or admins can update assessments"
  ON public.assessment_evaluations FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid()));

CREATE POLICY "Creator or admins can delete assessments"
  ON public.assessment_evaluations FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid()));

CREATE TRIGGER update_assessment_evaluations_updated_at
  BEFORE UPDATE ON public.assessment_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_assessment_evaluations
  AFTER INSERT OR UPDATE OR DELETE ON public.assessment_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

INSERT INTO public.menu_permissions (menu_key, role, is_visible)
VALUES
  ('/seleccion-desarrollo', 'super_admin', true),
  ('/seleccion-desarrollo', 'admin_area', true)
ON CONFLICT DO NOTHING;
