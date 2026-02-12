-- Allow super_admin to update any profile
CREATE POLICY "Super admin can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super_admin to insert profiles
CREATE POLICY "Super admin can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));