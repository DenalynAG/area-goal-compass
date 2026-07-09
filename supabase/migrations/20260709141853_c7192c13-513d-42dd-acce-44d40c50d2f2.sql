DROP POLICY IF EXISTS "Super admin full measurements" ON public.kpi_measurements;

CREATE POLICY "Super admin full measurements"
ON public.kpi_measurements
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));