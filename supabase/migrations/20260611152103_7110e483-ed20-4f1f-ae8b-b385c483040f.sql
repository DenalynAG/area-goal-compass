
-- 1) Fix SECURITY DEFINER view
ALTER VIEW public.profiles_directory SET (security_invoker = true);

-- 2) Restrict notifications INSERT
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin_area'::app_role)
    OR public.has_role(auth.uid(), 'gestor_area'::app_role)
    OR public.has_role(auth.uid(), 'lider_subarea'::app_role)
  )
);

-- 3) Add UPDATE policy on evidencias storage bucket
DROP POLICY IF EXISTS "Uploader or admin can update evidence" ON storage.objects;
CREATE POLICY "Uploader or admin can update evidence"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'evidencias'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
)
WITH CHECK (
  bucket_id = 'evidencias'
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'super_admin'::app_role))
);
