
CREATE TABLE public.sampling_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_name TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  indicator_name TEXT NOT NULL,
  sampling_type TEXT NOT NULL DEFAULT 'microbiologico',
  period TEXT NOT NULL,
  numeric_value NUMERIC NULL,
  unit TEXT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'conforme',
  notes TEXT NULL DEFAULT '',
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sampling_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full sampling_records" ON public.sampling_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin area manages sampling_records" ON public.sampling_records
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_area'::app_role));

CREATE POLICY "Authenticated read sampling_records" ON public.sampling_records
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert sampling_records" ON public.sampling_records
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
