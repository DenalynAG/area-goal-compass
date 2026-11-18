CREATE TABLE public.kpi_total_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  year integer NOT NULL,
  target numeric,
  actual numeric,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kpi_id, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kpi_total_overrides TO authenticated;
GRANT ALL ON public.kpi_total_overrides TO service_role;
ALTER TABLE public.kpi_total_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view total overrides" ON public.kpi_total_overrides FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admin inserts total overrides" ON public.kpi_total_overrides FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin updates total overrides" ON public.kpi_total_overrides FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin deletes total overrides" ON public.kpi_total_overrides FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));