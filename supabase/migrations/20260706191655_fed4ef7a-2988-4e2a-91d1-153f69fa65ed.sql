
-- Broaden audit_comments so all roles who can see the finding can respond
DROP POLICY IF EXISTS "Users access audit_comments via finding" ON public.audit_comments;

CREATE POLICY "Users access audit_comments via finding"
ON public.audit_comments
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.audit_findings af
    JOIN public.audit_plans ap ON ap.id = af.audit_plan_id
    WHERE af.id = audit_comments.finding_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin_area'::app_role)
        OR has_role(auth.uid(), 'lider_subarea'::app_role)
        OR has_role(auth.uid(), 'colaborador'::app_role)
        OR has_role(auth.uid(), 'gestor_area'::app_role)
        OR has_calidad_global(auth.uid())
        OR ap.responsible_user_id = auth.uid()
        OR ap.auditor_user_id = auth.uid()
        OR af.responsible_user_id = auth.uid()
        OR ap.area_id = get_user_area_id(auth.uid())
      )
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.audit_findings af
    JOIN public.audit_plans ap ON ap.id = af.audit_plan_id
    WHERE af.id = audit_comments.finding_id
      AND (
        has_role(auth.uid(), 'super_admin'::app_role)
        OR has_role(auth.uid(), 'admin_area'::app_role)
        OR has_role(auth.uid(), 'lider_subarea'::app_role)
        OR has_role(auth.uid(), 'colaborador'::app_role)
        OR has_role(auth.uid(), 'gestor_area'::app_role)
        OR has_calidad_global(auth.uid())
        OR ap.responsible_user_id = auth.uid()
        OR ap.auditor_user_id = auth.uid()
        OR af.responsible_user_id = auth.uid()
        OR ap.area_id = get_user_area_id(auth.uid())
      )
  )
);

-- Allow any authenticated user to attach evidence they own (needed so colaboradores can upload finding support)
DROP POLICY IF EXISTS "Area leaders can insert evidence" ON public.evidences;

CREATE POLICY "Authenticated users can insert own evidence"
ON public.evidences
FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());
