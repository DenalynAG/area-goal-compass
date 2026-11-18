ALTER TABLE public.kpis
  ADD COLUMN review_target numeric,
  ADD COLUMN review_actual numeric;

COMMENT ON COLUMN public.kpis.review_target IS 'Meta de revisión anual; se muestra solo en Total KPI';
COMMENT ON COLUMN public.kpis.review_actual IS 'Valor real de revisión anual; se muestra solo en Total KPI';

CREATE OR REPLACE FUNCTION public.guard_kpi_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.review_target IS DISTINCT FROM OLD.review_target
      OR NEW.review_actual IS DISTINCT FROM OLD.review_actual)
     AND NOT (public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid())) THEN
    RAISE EXCEPTION 'Solo Super Admin o Recursos Humanos pueden modificar los campos de revisión';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_kpi_review_fields
BEFORE UPDATE ON public.kpis
FOR EACH ROW EXECUTE FUNCTION public.guard_kpi_review_fields();