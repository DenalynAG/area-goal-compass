CREATE OR REPLACE FUNCTION public.sync_leader_pass_accidentes(_period text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_act uuid; r record; v_has boolean; v_user uuid;
BEGIN
  SELECT id INTO v_act FROM public.leader_pass_activities WHERE sort_order = 10 LIMIT 1;
  IF v_act IS NULL OR _period IS NULL OR _period > to_char(now(),'YYYY-MM') THEN RETURN; END IF;
  FOR r IN SELECT id FROM public.areas WHERE status = 'activo' LOOP
    SELECT EXISTS (SELECT 1 FROM public.mision_cerosh_reports m
      WHERE m.report_type = 'accidente_trabajo' AND m.area_id = r.id
        AND to_char(m.report_date,'YYYY-MM') = _period
        AND (COALESCE(m.count,0) > 0 OR COALESCE(m.completed,false))) INTO v_has;
    FOR v_user IN
      SELECT DISTINCT u FROM (
        SELECT a.leader_user_id u FROM public.areas a WHERE a.id = r.id
        UNION SELECT s.leader_user_id FROM public.subareas s WHERE s.area_id = r.id
      ) t WHERE u IS NOT NULL
    LOOP
      IF v_has THEN
        UPDATE public.leader_pass_records SET completed=false, completed_at=NULL, updated_at=now()
         WHERE activity_id=v_act AND user_id=v_user AND period=_period AND completed=true;
      ELSIF EXISTS (SELECT 1 FROM public.leader_pass_records WHERE activity_id=v_act AND user_id=v_user AND period=_period) THEN
        UPDATE public.leader_pass_records SET completed=true, completed_at=COALESCE(completed_at, now()), updated_at=now()
         WHERE activity_id=v_act AND user_id=v_user AND period=_period AND completed=false;
      ELSE
        INSERT INTO public.leader_pass_records(activity_id,user_id,period,completed,completed_at)
        VALUES (v_act,v_user,_period,true,now());
      END IF;
    END LOOP;
  END LOOP;
END; $$;

GRANT EXECUTE ON FUNCTION public.sync_leader_pass_accidentes(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_sync_leader_pass_accidentes_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') AND OLD.report_type = 'accidente_trabajo' THEN
    PERFORM public.sync_leader_pass_accidentes(to_char(OLD.report_date,'YYYY-MM'));
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.report_type = 'accidente_trabajo' THEN
    PERFORM public.sync_leader_pass_accidentes(to_char(NEW.report_date,'YYYY-MM'));
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_sync_leader_pass_accidentes
AFTER INSERT OR UPDATE OR DELETE ON public.mision_cerosh_reports
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_leader_pass_accidentes_fn();