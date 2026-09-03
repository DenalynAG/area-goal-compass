
CREATE POLICY "Lider subarea reads kpis of own subarea"
ON public.kpis FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "Lider subarea updates kpis of own subarea"
ON public.kpis FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "Lider subarea reads measurements of own subarea"
ON public.kpi_measurements FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "Lider subarea updates measurements of own subarea"
ON public.kpi_measurements FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
);

CREATE POLICY "Lider subarea deletes measurements of own subarea"
ON public.kpi_measurements FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.scope_type = 'subarea'
      AND o.scope_id = get_user_subarea_id(auth.uid())
  )
);
