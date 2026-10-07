CREATE TABLE public.objective_monthly_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  period text NOT NULL,
  note text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (objective_id, period)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objective_monthly_notes TO authenticated;
GRANT ALL ON public.objective_monthly_notes TO service_role;
ALTER TABLE public.objective_monthly_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth read notes" ON public.objective_monthly_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors insert notes" ON public.objective_monthly_notes FOR INSERT TO authenticated WITH CHECK (NOT public.has_role(auth.uid(),'solo_lectura') AND NOT public.has_role(auth.uid(),'colaborador') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Editors update notes" ON public.objective_monthly_notes FOR UPDATE TO authenticated USING (NOT public.has_role(auth.uid(),'solo_lectura') AND NOT public.has_role(auth.uid(),'colaborador') OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Editors delete notes" ON public.objective_monthly_notes FOR DELETE TO authenticated USING (NOT public.has_role(auth.uid(),'solo_lectura') AND NOT public.has_role(auth.uid(),'colaborador') OR public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER trg_objective_monthly_notes_updated_at BEFORE UPDATE ON public.objective_monthly_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();