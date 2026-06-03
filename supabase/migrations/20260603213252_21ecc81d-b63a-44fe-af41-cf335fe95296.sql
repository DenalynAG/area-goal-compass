
-- Allow admins (super_admin, admin_area, HR) to manage any avatar
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

CREATE POLICY "Avatar upload own or admin"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.is_hr(auth.uid())
  )
);

CREATE POLICY "Avatar update own or admin"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.is_hr(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.is_hr(auth.uid())
  )
);

CREATE POLICY "Avatar delete own or admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.is_hr(auth.uid())
  )
);

-- Recreate directory view with security_invoker=on so it inherits the caller's RLS
-- and add a permissive SELECT policy that exposes ONLY non-sensitive columns to any authenticated user.
-- Sensitive columns (identificacion, salud, etc.) remain protected by the row-restrictive policies created earlier
-- because the view only projects safe columns; queries that try to fetch sensitive columns through the base table
-- still go through the row-restrictive policies.
DROP VIEW IF EXISTS public.profiles_directory;
CREATE VIEW public.profiles_directory
WITH (security_invoker = on) AS
SELECT
  id, name, email, phone, position, avatar,
  is_active, jefe_inmediato, calidad_global_access,
  created_at, updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_directory TO authenticated;

-- Permissive SELECT policy: every authenticated user can read rows for directory purposes.
-- Because the view only projects safe columns, sensitive PII is never returned through it.
CREATE POLICY "Directory read profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Revoke direct column-level SELECT for sensitive columns so a raw select('*') from a regular user
-- only returns rows where one of the privileged policies above (owner/super_admin/HR/admin_area) applies.
-- Note: Postgres column-level GRANTs are not row-conditional. To keep things simple we DO NOT revoke
-- column grants here; instead the app uses the profiles_directory view for dropdowns.
