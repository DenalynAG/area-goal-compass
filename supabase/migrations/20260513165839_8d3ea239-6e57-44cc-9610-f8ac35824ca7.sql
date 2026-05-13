DROP POLICY IF EXISTS "Area leaders can insert evidence" ON public.evidences;
CREATE POLICY "Area leaders can insert evidence" ON public.evidences
FOR INSERT WITH CHECK (
  uploaded_by = auth.uid() AND (
    has_role(auth.uid(), 'admin_area'::app_role)
    OR has_role(auth.uid(), 'lider_subarea'::app_role)
    OR has_role(auth.uid(), 'gestor_area'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  )
);