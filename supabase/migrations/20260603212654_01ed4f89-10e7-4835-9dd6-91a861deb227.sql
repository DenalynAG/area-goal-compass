
-- 1) Storage: avatars — restrict UPDATE/DELETE to the owner (path prefix = user id)
DROP POLICY IF EXISTS "Users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete avatars" ON storage.objects;

CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'super_admin'))
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'super_admin'))
);

CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'super_admin'))
);

-- 2) Storage: evidencias — restrict INSERT to allowed roles (matches in-app canUpload)
DROP POLICY IF EXISTS "Authenticated users can upload evidence" ON storage.objects;
CREATE POLICY "Role-scoped upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'evidencias'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.has_role(auth.uid(), 'lider_subarea')
    OR public.has_role(auth.uid(), 'gestor_area')
  )
);

-- 3) Storage: newsletter — restrict INSERT to admin_area / super_admin
DROP POLICY IF EXISTS "Authenticated upload newsletter" ON storage.objects;
CREATE POLICY "Admin upload newsletter"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'newsletter'
  AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'))
);

-- 4) Evaluations: explicit WITH CHECK on INSERT/UPDATE so a collaborador can't target arbitrary users
DROP POLICY IF EXISTS "Evaluators manage own evaluations" ON public.evaluations;
CREATE POLICY "Evaluators manage own evaluations"
ON public.evaluations FOR ALL TO authenticated
USING (evaluator_user_id = auth.uid())
WITH CHECK (
  evaluator_user_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.has_role(auth.uid(), 'lider_subarea')
    OR public.has_role(auth.uid(), 'gestor_area')
  )
  AND EXISTS (
    SELECT 1 FROM public.memberships m1, public.memberships m2
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = evaluations.collaborator_user_id
      AND m1.area_id = m2.area_id
  )
);

-- 5) Fix mutable search_path on pgmq wrapper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;

-- 6) Revoke EXECUTE on SECURITY DEFINER internal helpers from anon/authenticated.
-- These are used inside RLS policies / triggers and should not be callable via the API.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_direccion_general_objective(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_area_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_subarea_id(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_calidad_global(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
