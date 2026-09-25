CREATE OR REPLACE FUNCTION public.sync_leader_pass_orden_limpieza_area(_area_id uuid, _period text, _creator uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_activity_id uuid; v_user uuid; v_cnt int;
BEGIN
  SELECT id INTO v_activity_id FROM public.leader_pass_activities WHERE sort_order = 9 LIMIT 1;
  IF v_activity_id IS NULL OR _area_id IS NULL THEN RETURN; END IF;
  SELECT count(*) INTO v_cnt FROM public.mision_cerosh_reports r
   WHERE r.report_type = 'orden_aseo' AND r.area_id = _area_id
     AND to_char(r.report_date,'YYYY-MM') = _period
     AND (COALESCE(r.completed,false) OR COALESCE(r.count,0) > 0);
  IF v_cnt < 2 THEN RETURN; END IF;
  FOR v_user IN
    SELECT DISTINCT u FROM (
      SELECT a.leader_user_id AS u FROM public.areas a WHERE a.id = _area_id
      UNION SELECT s.leader_user_id FROM public.subareas s WHERE s.area_id = _area_id
      UNION SELECT _creator
    ) t WHERE u IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.leader_pass_records WHERE activity_id=v_activity_id AND user_id=v_user AND period=_period) THEN
      UPDATE public.leader_pass_records SET completed=true, completed_at=COALESCE(completed_at, now()), updated_at=now()
       WHERE activity_id=v_activity_id AND user_id=v_user AND period=_period AND completed=false;
    ELSE
      INSERT INTO public.leader_pass_records(activity_id,user_id,period,completed,completed_at) VALUES (v_activity_id,v_user,_period,true,now());
    END IF;
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.sync_leader_pass_orden_limpieza()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.report_type = 'orden_aseo'::mision_cerosh_report_type THEN
    PERFORM public.sync_leader_pass_orden_limpieza_area(NEW.area_id, to_char(NEW.report_date,'YYYY-MM'), NEW.created_by);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_leader_pass_orden_limpieza AFTER INSERT OR UPDATE ON public.mision_cerosh_reports
FOR EACH ROW EXECUTE FUNCTION public.sync_leader_pass_orden_limpieza();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT DISTINCT area_id, to_char(report_date,'YYYY-MM') p, created_by FROM public.mision_cerosh_reports WHERE report_type='orden_aseo' LOOP
    PERFORM public.sync_leader_pass_orden_limpieza_area(r.area_id, r.p, r.created_by);
  END LOOP;
END $$;