
DROP POLICY IF EXISTS "Authenticated can view assessments" ON public.assessment_evaluations;
CREATE POLICY "Restricted view assessments" ON public.assessment_evaluations
FOR SELECT USING (
  auth.uid() = created_by
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin_area'::app_role)
  OR is_hr(auth.uid())
);

DROP POLICY IF EXISTS "Authenticated read newsletter" ON public.newsletter_posts;
CREATE POLICY "Read newsletter with targeting" ON public.newsletter_posts
FOR SELECT USING (
  auth.uid() IS NOT NULL
  AND (
    target_user_id IS NULL
    OR target_user_id = auth.uid()
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_area'::app_role)
  )
);
