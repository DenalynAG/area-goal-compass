
DROP POLICY IF EXISTS "Owner or super admin can update mision cerosh reports" ON public.mision_cerosh_reports;
DROP POLICY IF EXISTS "Owner or super admin can delete mision cerosh reports" ON public.mision_cerosh_reports;
DROP POLICY IF EXISTS "Auth users can insert mision cerosh reports" ON public.mision_cerosh_reports;

CREATE POLICY "Insert mision cerosh reports"
ON public.mision_cerosh_reports FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Update mision cerosh reports"
ON public.mision_cerosh_reports FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_mision_cerosh_admin(auth.uid())
);

CREATE POLICY "Delete mision cerosh reports"
ON public.mision_cerosh_reports FOR DELETE
USING (
  created_by = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_mision_cerosh_admin(auth.uid())
);
