
-- Function to check if an objective belongs to Dirección General area
CREATE OR REPLACE FUNCTION public.is_direccion_general_objective(_scope_type text, _scope_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _scope_type = 'area' AND EXISTS (
    SELECT 1 FROM public.areas a
    WHERE a.id = _scope_id AND a.name = 'Dirección General'
  )
$$;

-- Allow any authenticated user to read Dirección General objectives
CREATE POLICY "Authenticated read direccion general objectives"
ON public.objectives
FOR SELECT
TO authenticated
USING (public.is_direccion_general_objective(scope_type, scope_id));
