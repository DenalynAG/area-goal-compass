
-- Create storage bucket for evidence files
INSERT INTO storage.buckets (id, name, public) VALUES ('evidencias', 'evidencias', false);

-- Storage policies: upload by authenticated users
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'evidencias' AND auth.uid() IS NOT NULL);

-- Read: authenticated users can read evidence files
CREATE POLICY "Authenticated users can read evidence"
ON storage.objects FOR SELECT
USING (bucket_id = 'evidencias' AND auth.uid() IS NOT NULL);

-- Delete: only super_admin can delete evidence files
CREATE POLICY "Super admin can delete evidence"
ON storage.objects FOR DELETE
USING (bucket_id = 'evidencias' AND has_role(auth.uid(), 'super_admin'::app_role));

-- Create evidence tracking table
CREATE TABLE public.evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('objective', 'kpi')),
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size bigint,
  uploaded_by uuid NOT NULL,
  uploaded_by_name text,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobada', 'rechazada')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evidences ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "Super admin full evidences"
ON public.evidences FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admin area and lider subarea can insert evidence
CREATE POLICY "Area leaders can insert evidence"
ON public.evidences FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND (
    has_role(auth.uid(), 'admin_area'::app_role) OR
    has_role(auth.uid(), 'lider_subarea'::app_role)
  )
);

-- Users can read evidence for their visible objectives/kpis
CREATE POLICY "Authenticated read evidence"
ON public.evidences FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can delete their own pending evidence
CREATE POLICY "Users delete own pending evidence"
ON public.evidences FOR DELETE
USING (uploaded_by = auth.uid() AND status = 'pendiente');
