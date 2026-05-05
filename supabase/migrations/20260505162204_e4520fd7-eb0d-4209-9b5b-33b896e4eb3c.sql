CREATE TABLE public.kpi_month_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  is_locked boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE(year, month)
);

ALTER TABLE public.kpi_month_locks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read kpi_month_locks"
ON public.kpi_month_locks FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages kpi_month_locks"
ON public.kpi_month_locks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));