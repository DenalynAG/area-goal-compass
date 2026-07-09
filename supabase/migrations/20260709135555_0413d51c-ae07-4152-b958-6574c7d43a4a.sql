
CREATE TABLE public.kpi_measurement_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid,
  kpi_id uuid NOT NULL,
  period_date date NOT NULL,
  field text NOT NULL CHECK (field IN ('value','target')),
  old_value numeric,
  new_value numeric,
  action text NOT NULL CHECK (action IN ('insert','update','delete')),
  changed_by uuid,
  changed_by_name text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kpi_measurement_history TO authenticated;
GRANT ALL ON public.kpi_measurement_history TO service_role;

ALTER TABLE public.kpi_measurement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read kpi history"
ON public.kpi_measurement_history
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_kpi_history_kpi_period ON public.kpi_measurement_history (kpi_id, period_date, changed_at DESC);

CREATE OR REPLACE FUNCTION public.log_kpi_measurement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
BEGIN
  BEGIN v_user_id := auth.uid(); EXCEPTION WHEN OTHERS THEN v_user_id := NULL; END;
  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(name, email) INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  END IF;
  v_user_name := COALESCE(v_user_name, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    IF NEW.value IS NOT NULL THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (NEW.id, NEW.kpi_id, NEW.period_date, 'value', NULL, NEW.value, 'insert', v_user_id, v_user_name);
    END IF;
    IF NEW.target IS NOT NULL THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (NEW.id, NEW.kpi_id, NEW.period_date, 'target', NULL, NEW.target, 'insert', v_user_id, v_user_name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.value IS DISTINCT FROM OLD.value THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (NEW.id, NEW.kpi_id, NEW.period_date, 'value', OLD.value, NEW.value, 'update', v_user_id, v_user_name);
    END IF;
    IF NEW.target IS DISTINCT FROM OLD.target THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (NEW.id, NEW.kpi_id, NEW.period_date, 'target', OLD.target, NEW.target, 'update', v_user_id, v_user_name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.value IS NOT NULL THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (OLD.id, OLD.kpi_id, OLD.period_date, 'value', OLD.value, NULL, 'delete', v_user_id, v_user_name);
    END IF;
    IF OLD.target IS NOT NULL THEN
      INSERT INTO public.kpi_measurement_history (measurement_id, kpi_id, period_date, field, old_value, new_value, action, changed_by, changed_by_name)
      VALUES (OLD.id, OLD.kpi_id, OLD.period_date, 'target', OLD.target, NULL, 'delete', v_user_id, v_user_name);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_kpi_measurement_change ON public.kpi_measurements;
CREATE TRIGGER trg_log_kpi_measurement_change
AFTER INSERT OR UPDATE OR DELETE ON public.kpi_measurements
FOR EACH ROW EXECUTE FUNCTION public.log_kpi_measurement_change();
