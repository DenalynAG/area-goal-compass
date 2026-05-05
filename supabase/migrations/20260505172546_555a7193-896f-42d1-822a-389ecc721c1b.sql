CREATE POLICY "Authenticated read direccion general area"
ON public.areas
FOR SELECT
TO authenticated
USING (name = 'Dirección General');