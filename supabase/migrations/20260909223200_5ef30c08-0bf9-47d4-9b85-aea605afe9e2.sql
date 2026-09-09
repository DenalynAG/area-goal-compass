
CREATE OR REPLACE FUNCTION public.sync_leader_pass_mision_cerosh()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id uuid;
  v_period text;
  v_user uuid;
BEGIN
  IF NEW.report_type <> 'accion_preventiva'::mision_cerosh_report_type
     OR COALESCE(NEW.completed, false) = false
     OR NEW.evidence_url IS NULL
     OR NEW.evidence_url = '' THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_activity_id FROM public.leader_pass_activities WHERE sort_order = 7 LIMIT 1;
  IF v_activity_id IS NULL THEN RETURN NEW; END IF;

  v_period := to_char(NEW.report_date, 'YYYY-MM');

  FOR v_user IN
    SELECT DISTINCT u FROM (
      SELECT a.leader_user_id AS u FROM public.areas a WHERE a.id = NEW.area_id
      UNION
      SELECT s.leader_user_id FROM public.subareas s WHERE s.area_id = NEW.area_id
      UNION
      SELECT NEW.created_by
    ) t WHERE u IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.leader_pass_records r
               WHERE r.activity_id = v_activity_id AND r.user_id = v_user AND r.period = v_period) THEN
      UPDATE public.leader_pass_records
      SET completed = true, completed_at = COALESCE(completed_at, now()), updated_at = now()
      WHERE activity_id = v_activity_id AND user_id = v_user AND period = v_period AND completed = false;
    ELSE
      INSERT INTO public.leader_pass_records (activity_id, user_id, period, completed, completed_at)
      VALUES (v_activity_id, v_user, v_period, true, now());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_leader_pass_mision_cerosh ON public.mision_cerosh_reports;
CREATE TRIGGER trg_sync_leader_pass_mision_cerosh
AFTER INSERT OR UPDATE ON public.mision_cerosh_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_leader_pass_mision_cerosh();
