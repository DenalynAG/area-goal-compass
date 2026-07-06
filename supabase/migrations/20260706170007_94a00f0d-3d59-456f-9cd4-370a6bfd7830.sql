
DROP POLICY IF EXISTS "Owner/participants read access_control" ON public.access_control;

CREATE POLICY "RBAC read access_control"
ON public.access_control
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_hr(auth.uid())
  OR created_by = auth.uid()
  OR requester_user_id = auth.uid()
  OR companion_user_id = auth.uid()
  OR (
    has_role(auth.uid(), 'admin_area'::app_role)
    AND area_id IS NOT NULL
    AND area_id = get_user_area_id(auth.uid())
  )
  OR (
    has_role(auth.uid(), 'lider_subarea'::app_role)
    AND subarea_id IS NOT NULL
    AND subarea_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "RBAC update access_control"
ON public.access_control
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR created_by = auth.uid()
  OR (
    has_role(auth.uid(), 'admin_area'::app_role)
    AND area_id IS NOT NULL
    AND area_id = get_user_area_id(auth.uid())
  )
  OR (
    has_role(auth.uid(), 'lider_subarea'::app_role)
    AND subarea_id IS NOT NULL
    AND subarea_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "RBAC delete access_control"
ON public.access_control
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR created_by = auth.uid()
  OR (
    has_role(auth.uid(), 'admin_area'::app_role)
    AND area_id IS NOT NULL
    AND area_id = get_user_area_id(auth.uid())
  )
);
