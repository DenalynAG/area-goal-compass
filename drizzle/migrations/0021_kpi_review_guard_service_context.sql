CREATE OR REPLACE FUNCTION public.guard_kpi_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.review_target IS DISTINCT FROM OLD.review_target
      OR NEW.review_actual IS DISTINCT FROM OLD.review_actual)
     AND auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'super_admin') OR public.is_hr(auth.uid())) THEN
    RAISE EXCEPTION 'Solo Super Admin o Recursos Humanos pueden modificar los campos de revisión';
  END IF;
  RETURN NEW;
END;
$$;