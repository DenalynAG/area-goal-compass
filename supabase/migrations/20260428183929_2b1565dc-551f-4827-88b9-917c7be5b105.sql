CREATE TABLE public.bpm_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  zone TEXT NOT NULL,
  percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (year, month, zone)
);

ALTER TABLE public.bpm_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view BPM inspections"
ON public.bpm_inspections FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert BPM inspections"
ON public.bpm_inspections FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'));

CREATE POLICY "Admins can update BPM inspections"
ON public.bpm_inspections FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'));

CREATE POLICY "Admins can delete BPM inspections"
ON public.bpm_inspections FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'));

CREATE TRIGGER update_bpm_inspections_updated_at
BEFORE UPDATE ON public.bpm_inspections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();