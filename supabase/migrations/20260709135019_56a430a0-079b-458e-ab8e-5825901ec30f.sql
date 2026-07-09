
DROP POLICY IF EXISTS "Authenticated read evidence" ON public.evidences;
CREATE POLICY "Scoped read evidence" ON public.evidences
FOR SELECT TO authenticated
USING (
  uploaded_by = auth.uid()
  OR reviewed_by = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_area'::app_role)
  OR is_hr(auth.uid())
  OR has_calidad_global(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can read evidence" ON storage.objects;
CREATE POLICY "Scoped read evidence storage" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'evidencias'
  AND (
    owner = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_area'::app_role)
    OR is_hr(auth.uid())
    OR has_calidad_global(auth.uid())
  )
);
