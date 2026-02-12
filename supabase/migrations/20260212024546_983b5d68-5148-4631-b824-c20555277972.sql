-- Allow super_admin to delete profiles
CREATE POLICY "Super admin can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));
