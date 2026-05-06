
-- Admin area: full visibility of objectives whose scope (area or subarea) belongs to their area
CREATE POLICY "Admin area reads area scoped objectives"
ON public.objectives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND (
    (scope_type = 'area' AND scope_id = get_user_area_id(auth.uid()))
    OR (scope_type = 'subarea' AND EXISTS (
      SELECT 1 FROM public.subareas s
      WHERE s.id = objectives.scope_id AND s.area_id = get_user_area_id(auth.uid())
    ))
  )
);

CREATE POLICY "Admin area updates area scoped subarea objectives"
ON public.objectives FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND scope_type = 'subarea' AND EXISTS (
    SELECT 1 FROM public.subareas s
    WHERE s.id = objectives.scope_id AND s.area_id = get_user_area_id(auth.uid())
  )
);

CREATE POLICY "Admin area deletes area scoped subarea objectives"
ON public.objectives FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND scope_type = 'subarea' AND EXISTS (
    SELECT 1 FROM public.subareas s
    WHERE s.id = objectives.scope_id AND s.area_id = get_user_area_id(auth.uid())
  )
);

-- KPIs: admin_area read for kpis whose objective scope is in their area
CREATE POLICY "Admin area reads area scoped kpis"
ON public.kpis FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id AND (
      (o.scope_type = 'area' AND o.scope_id = get_user_area_id(auth.uid()))
      OR (o.scope_type = 'subarea' AND EXISTS (
        SELECT 1 FROM public.subareas s WHERE s.id = o.scope_id AND s.area_id = get_user_area_id(auth.uid())
      ))
    )
  )
);

CREATE POLICY "Admin area updates area scoped kpis"
ON public.kpis FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id AND (
      (o.scope_type = 'area' AND o.scope_id = get_user_area_id(auth.uid()))
      OR (o.scope_type = 'subarea' AND EXISTS (
        SELECT 1 FROM public.subareas s WHERE s.id = o.scope_id AND s.area_id = get_user_area_id(auth.uid())
      ))
    )
  )
);

-- KPI measurements: admin_area read for measurements of kpis in their area scope
CREATE POLICY "Admin area reads area scoped measurements"
ON public.kpi_measurements FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id AND (
      (o.scope_type = 'area' AND o.scope_id = get_user_area_id(auth.uid()))
      OR (o.scope_type = 'subarea' AND EXISTS (
        SELECT 1 FROM public.subareas s WHERE s.id = o.scope_id AND s.area_id = get_user_area_id(auth.uid())
      ))
    )
  )
);

CREATE POLICY "Admin area updates area scoped measurements"
ON public.kpi_measurements FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id AND (
      (o.scope_type = 'area' AND o.scope_id = get_user_area_id(auth.uid()))
      OR (o.scope_type = 'subarea' AND EXISTS (
        SELECT 1 FROM public.subareas s WHERE s.id = o.scope_id AND s.area_id = get_user_area_id(auth.uid())
      ))
    )
  )
);

-- Subareas: admin_area should read subareas of their area
CREATE POLICY "Admin area reads area subareas"
ON public.subareas FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND area_id = get_user_area_id(auth.uid())
);
