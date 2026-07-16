
ALTER TABLE public.access_control
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS review_notes text;

CREATE OR REPLACE FUNCTION public.is_seguridad_fisica(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.subareas s ON s.id = m.subarea_id
    WHERE m.user_id = _user_id AND s.name = 'Seguridad Física'
  )
$$;

-- Extend SELECT: seguridad física ve todos los registros
DROP POLICY IF EXISTS "RBAC read access_control" ON public.access_control;
CREATE POLICY "RBAC read access_control" ON public.access_control FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_hr(auth.uid())
  OR is_seguridad_fisica(auth.uid())
  OR created_by = auth.uid()
  OR requester_user_id = auth.uid()
  OR companion_user_id = auth.uid()
  OR (has_role(auth.uid(), 'admin_area'::app_role) AND area_id IS NOT NULL AND area_id = get_user_area_id(auth.uid()))
  OR (has_role(auth.uid(), 'lider_subarea'::app_role) AND subarea_id IS NOT NULL AND subarea_id = get_user_subarea_id(auth.uid()))
);

-- Extend UPDATE: seguridad física puede aprobar/observar cualquier registro
DROP POLICY IF EXISTS "RBAC update access_control" ON public.access_control;
CREATE POLICY "RBAC update access_control" ON public.access_control FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_seguridad_fisica(auth.uid())
  OR created_by = auth.uid()
  OR (has_role(auth.uid(), 'admin_area'::app_role) AND area_id IS NOT NULL AND area_id = get_user_area_id(auth.uid()))
  OR (has_role(auth.uid(), 'lider_subarea'::app_role) AND subarea_id IS NOT NULL AND subarea_id = get_user_subarea_id(auth.uid()))
);
