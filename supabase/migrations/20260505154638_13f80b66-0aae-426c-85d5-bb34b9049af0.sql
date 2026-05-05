-- Tighten objectives SELECT: remove broad scope policy, allow only own + hierarchy
DROP POLICY IF EXISTS "Users read own scope objectives" ON public.objectives;

CREATE POLICY "Users read own objectives"
ON public.objectives
FOR SELECT
TO authenticated
USING (owner_user_id = auth.uid());

-- Tighten kpis SELECT: remove broad scope policy
DROP POLICY IF EXISTS "Users read kpis of visible objectives" ON public.kpis;

CREATE POLICY "Users read kpis of own objectives"
ON public.kpis
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.owner_user_id = auth.uid()
  )
);

-- Tighten kpi_measurements SELECT: remove broad scope policy
DROP POLICY IF EXISTS "Users read measurements of visible kpis" ON public.kpi_measurements;

CREATE POLICY "Users read measurements of own kpis"
ON public.kpi_measurements
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.owner_user_id = auth.uid()
  )
);