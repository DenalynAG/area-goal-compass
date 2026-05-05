
-- ============ OBJECTIVES ============
-- Owner manages own
CREATE POLICY "Owner manages own objectives"
ON public.objectives
FOR ALL TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Admin de Área: edit/delete lower roles in same area
CREATE POLICY "Admin area updates lower role objectives"
ON public.objectives
FOR UPDATE TO authenticated
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

CREATE POLICY "Admin area deletes lower role objectives"
ON public.objectives
FOR DELETE TO authenticated
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

-- Líder de Subárea: edit/delete lower roles in same subárea
CREATE POLICY "Lider subarea updates lower role objectives"
ON public.objectives
FOR UPDATE TO authenticated
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

CREATE POLICY "Lider subarea deletes lower role objectives"
ON public.objectives
FOR DELETE TO authenticated
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

-- Gestor de Área: edit/delete colaborador in same area
CREATE POLICY "Gestor area updates colaborador objectives"
ON public.objectives
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'gestor_area'::app_role)
  AND owner_user_id IS NOT NULL
  AND get_user_area_id(owner_user_id) = get_user_area_id(auth.uid())
  AND has_role(owner_user_id, 'colaborador'::app_role)
);

CREATE POLICY "Gestor area deletes colaborador objectives"
ON public.objectives
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'gestor_area'::app_role)
  AND owner_user_id IS NOT NULL
  AND get_user_area_id(owner_user_id) = get_user_area_id(auth.uid())
  AND has_role(owner_user_id, 'colaborador'::app_role)
);

-- ============ KPIS ============
-- Owner (via parent objective) manages
CREATE POLICY "Owner manages kpis of own objectives"
ON public.kpis
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id AND o.owner_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id AND o.owner_user_id = auth.uid())
);

CREATE POLICY "Hierarchy updates kpis of lower role objectives"
ON public.kpis
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role))
      )
  )
);

CREATE POLICY "Hierarchy deletes kpis of lower role objectives"
ON public.kpis
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.objectives o
    WHERE o.id = kpis.objective_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role))
      )
  )
);

-- ============ KPI MEASUREMENTS ============
CREATE POLICY "Owner manages measurements of own kpis"
ON public.kpi_measurements
FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id AND o.owner_user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id AND o.owner_user_id = auth.uid())
);

CREATE POLICY "Hierarchy updates measurements of lower role kpis"
ON public.kpi_measurements
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role))
      )
  )
);

CREATE POLICY "Hierarchy deletes measurements of lower role kpis"
ON public.kpi_measurements
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.kpis k
    JOIN public.objectives o ON o.id = k.objective_id
    WHERE k.id = kpi_measurements.kpi_id
      AND o.owner_user_id IS NOT NULL
      AND (
        (has_role(auth.uid(), 'admin_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND (has_role(o.owner_user_id, 'lider_subarea'::app_role)
            OR has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'lider_subarea'::app_role)
          AND get_user_subarea_id(o.owner_user_id) IS NOT NULL
          AND get_user_subarea_id(o.owner_user_id) = get_user_subarea_id(auth.uid())
          AND (has_role(o.owner_user_id, 'gestor_area'::app_role)
            OR has_role(o.owner_user_id, 'colaborador'::app_role)))
        OR (has_role(auth.uid(), 'gestor_area'::app_role)
          AND get_user_area_id(o.owner_user_id) = get_user_area_id(auth.uid())
          AND has_role(o.owner_user_id, 'colaborador'::app_role))
      )
  )
);
