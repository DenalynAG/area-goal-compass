
-- Drop overly permissive policy that exposed sensitive columns on base table
DROP POLICY IF EXISTS "Directory read profiles" ON public.profiles;

-- Recreate the directory view with security_invoker = off so it can expose safe columns
-- to all authenticated users while the base table remains row-restricted.
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
