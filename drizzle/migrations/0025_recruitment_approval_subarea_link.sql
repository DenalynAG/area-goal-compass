ALTER TABLE public.recruitment_vacancies
  ADD COLUMN IF NOT EXISTS subarea_id uuid REFERENCES public.subareas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'aprobada' CHECK (approval_status IN ('pendiente','aprobada','rechazada')),
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

ALTER TABLE public.recruitment_candidates
  ADD COLUMN IF NOT EXISTS talent_candidate_id uuid UNIQUE REFERENCES public.talent_candidates(id) ON DELETE SET NULL;

ALTER TABLE public.talent_candidates
  ADD COLUMN IF NOT EXISTS recruitment_vacancy_id uuid REFERENCES public.recruitment_vacancies(id) ON DELETE SET NULL;

CREATE POLICY "Leaders request vacancies" ON public.recruitment_vacancies FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid() AND approval_status = 'pendiente'
  AND (public.has_role(auth.uid(),'admin_area') OR public.has_role(auth.uid(),'gestor_area') OR public.has_role(auth.uid(),'lider_subarea'))
);
CREATE POLICY "Leaders view own vacancy requests" ON public.recruitment_vacancies FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE OR REPLACE FUNCTION public.sync_talent_to_recruitment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.recruitment_vacancy_id IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.recruitment_candidates WHERE talent_candidate_id = NEW.id) THEN
    UPDATE public.recruitment_candidates SET name = NEW.full_name, vacancy_id = NEW.recruitment_vacancy_id
    WHERE talent_candidate_id = NEW.id;
  ELSE
    INSERT INTO public.recruitment_candidates (name, vacancy_id, application_date, stage, status, created_by, talent_candidate_id)
    VALUES (NEW.full_name, NEW.recruitment_vacancy_id, CURRENT_DATE, 'reclutamiento', 'en_proceso', NEW.created_by, NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_sync_talent_to_recruitment
AFTER INSERT OR UPDATE OF recruitment_vacancy_id, full_name ON public.talent_candidates
FOR EACH ROW EXECUTE FUNCTION public.sync_talent_to_recruitment();