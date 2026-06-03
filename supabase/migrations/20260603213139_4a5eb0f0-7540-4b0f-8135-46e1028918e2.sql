
-- Helper: is the user an HR member (belongs to area "Recursos Humanos")
CREATE OR REPLACE FUNCTION public.is_hr(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m
    JOIN public.areas a ON a.id = m.area_id
    WHERE m.user_id = _user_id AND a.name = 'Recursos Humanos'
  )
$$;

-- ============================================================
-- PROFILES: restrict SELECT to owner / privileged roles
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

CREATE POLICY "Owner reads own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Super admin reads all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "HR reads all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_hr(auth.uid()));

CREATE POLICY "Calidad global reads all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_calidad_global(auth.uid()));

CREATE POLICY "Admin area reads same area profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin_area')
  AND EXISTS (
    SELECT 1 FROM public.memberships m1, public.memberships m2
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = public.profiles.id
      AND m1.area_id = m2.area_id
  )
);

-- Safe directory view (excludes sensitive PII) for dropdowns / org chart
DROP VIEW IF EXISTS public.profiles_directory;
CREATE VIEW public.profiles_directory
WITH (security_invoker = off) AS
SELECT
  id, name, email, phone, position, avatar,
  is_active, jefe_inmediato, calidad_global_access,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_directory TO authenticated;
REVOKE ALL ON public.profiles_directory FROM anon;

-- ============================================================
-- ACCESS_CONTROL: restrict reads to owner / referenced parties
-- ============================================================
DROP POLICY IF EXISTS "Authenticated read access_control" ON public.access_control;

CREATE POLICY "Owner/participants read access_control"
ON public.access_control FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin')
  OR created_by = auth.uid()
  OR requester_user_id = auth.uid()
  OR companion_user_id = auth.uid()
);
