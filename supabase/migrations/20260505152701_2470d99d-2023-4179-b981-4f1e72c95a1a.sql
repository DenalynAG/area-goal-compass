
-- OBJECTIVES: hierarchy SELECT policies
CREATE POLICY "Admin area reads lower role objectives in area"
ON public.objectives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin_area'::app_role)
  AND owner_user_id IS NOT NULL
  AND get_user_area_id(owner_user_id) = get_user_area_id(auth.uid())
  AND (
    has_role(owner_user_id, 'lider_subarea'::app_role)
    OR has_role(owner_user_id, 'gestor_area'::app_role)
    OR has_role(owner_user_id, 'colaborador'::app_role)
  )
);

CREATE POLICY "Lider subarea reads lower role objectives in subarea"
ON public.objectives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role)
  AND owner_user_id IS NOT NULL
  AND get_user_subarea_id(owner_user_id) IS NOT NULL
  AND get_user_subarea_id(owner_user_id) = get_user_subarea_id(auth.uid())
  AND (
    has_role(owner_user_id, 'gestor_area'::app_role)
    OR has_role(owner_user_id, 'colaborador'::app_role)
  )
);

CREATE POLICY "Gestor area reads colaborador objectives in area"
ON public.objectives FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'gestor_area'::app_role)
  AND owner_user_id IS NOT NULL
  AND get_user_area_id(owner_user_id) = get_user_area_id(auth.uid())
  AND has_role(owner_user_id, 'colaborador'::app_role)
);

-- KPIS: hierarchy SELECT policy (via objective owner)
CREATE POLICY "Hierarchy reads kpis of lower role objectives"
ON public.kpis FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (
          has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (
            has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)
          )
        )
        OR (
          has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (
            has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)
          )
        )
        OR (
          has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role)
        )
      )
  )
);

-- KPI MEASUREMENTS: hierarchy SELECT policy
CREATE POLICY "Hierarchy reads measurements of lower role kpis"
ON public.kpi_measurements FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (
          has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (
            has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)
          )
        )
        OR (
          has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (
            has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)
          )
        )
        OR (
          has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role)
        )
      )
  )
);
