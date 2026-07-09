
DO $$ BEGIN
  CREATE TYPE public.mision_cerosh_report_type AS ENUM ('orden_aseo','accion_preventiva','accidente_trabajo');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.mision_cerosh_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type public.mision_cerosh_report_type NOT NULL,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  subarea_id UUID REFERENCES public.subareas(id) ON DELETE SET NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mision_cerosh_reports_type_date ON public.mision_cerosh_reports(report_type, report_date);
CREATE INDEX idx_mision_cerosh_reports_area ON public.mision_cerosh_reports(area_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mision_cerosh_reports TO authenticated;
GRANT ALL ON public.mision_cerosh_reports TO service_role;

ALTER TABLE public.mision_cerosh_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view mision cerosh reports"
  ON public.mision_cerosh_reports FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Auth users can insert mision cerosh reports"
  ON public.mision_cerosh_reports FOR INSERT
  TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or super admin can update mision cerosh reports"
  ON public.mision_cerosh_reports FOR UPDATE
  TO authenticated USING (
    created_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Owner or super admin can delete mision cerosh reports"
  ON public.mision_cerosh_reports FOR DELETE
  TO authenticated USING (
    created_by = auth.uid() OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE TRIGGER update_mision_cerosh_reports_updated_at
  BEFORE UPDATE ON public.mision_cerosh_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT '/mision-cerosh', r.role, (r.role IN ('super_admin','admin_area'))
FROM unnest(enum_range(NULL::app_role)) AS r(role)
ON CONFLICT DO NOTHING;
