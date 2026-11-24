CREATE SEQUENCE IF NOT EXISTS public.recruitment_vacancy_seq;
CREATE SEQUENCE IF NOT EXISTS public.recruitment_candidate_seq;

CREATE TABLE public.recruitment_vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('VAC-' || lpad(nextval('public.recruitment_vacancy_seq')::text, 4, '0')),
  position text NOT NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  city text,
  vacancy_type text NOT NULL DEFAULT 'nueva' CHECK (vacancy_type IN ('nueva','reemplazo')),
  opening_date date NOT NULL DEFAULT CURRENT_DATE,
  requesting_leader_id uuid,
  positions_required integer NOT NULL DEFAULT 1 CHECK (positions_required > 0),
  status text NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','cerrada','pausada','cancelada')),
  closing_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_vacancies TO authenticated;
GRANT ALL ON public.recruitment_vacancies TO service_role;
GRANT USAGE ON SEQUENCE public.recruitment_vacancy_seq, public.recruitment_candidate_seq TO authenticated, service_role;
ALTER TABLE public.recruitment_vacancies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and super admin manage vacancies" ON public.recruitment_vacancies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));

CREATE TABLE public.recruitment_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT ('CAN-' || lpad(nextval('public.recruitment_candidate_seq')::text, 4, '0')),
  name text NOT NULL,
  vacancy_id uuid NOT NULL REFERENCES public.recruitment_vacancies(id) ON DELETE CASCADE,
  application_date date NOT NULL DEFAULT CURRENT_DATE,
  stage text,
  status text NOT NULL DEFAULT 'en_proceso' CHECK (status IN ('en_proceso','descartado','retirado','contratado')),
  hire_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruitment_candidates TO authenticated;
GRANT ALL ON public.recruitment_candidates TO service_role;
ALTER TABLE public.recruitment_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "HR and super admin manage recruitment candidates" ON public.recruitment_candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));

CREATE INDEX ON public.recruitment_candidates(vacancy_id);
CREATE TRIGGER trg_recruitment_vacancies_updated BEFORE UPDATE ON public.recruitment_vacancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_recruitment_candidates_updated BEFORE UPDATE ON public.recruitment_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();