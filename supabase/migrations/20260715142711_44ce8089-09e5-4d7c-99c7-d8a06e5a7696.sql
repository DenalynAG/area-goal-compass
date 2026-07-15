
CREATE POLICY "Authenticated read same area profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.memberships m1, public.memberships m2
    WHERE m1.user_id = auth.uid()
      AND m2.user_id = profiles.id
      AND m1.area_id = m2.area_id
  )
);
