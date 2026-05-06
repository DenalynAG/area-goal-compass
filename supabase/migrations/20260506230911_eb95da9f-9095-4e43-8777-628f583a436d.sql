
-- 1) Add columns to activity_log
ALTER TABLE public.activity_log
  ADD COLUMN IF NOT EXISTS details jsonb,
  ADD COLUMN IF NOT EXISTS table_name text;

-- 2) Generic trigger function to audit changes
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_name text;
  v_action text;
  v_entity_id text;
  v_details jsonb;
  v_old jsonb;
  v_new jsonb;
  v_changed jsonb := '{}'::jsonb;
  v_key text;
BEGIN
  -- Resolve user
  BEGIN
    v_user_id := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user_id := NULL;
  END;

  IF v_user_id IS NOT NULL THEN
    SELECT COALESCE(name, email) INTO v_user_name FROM public.profiles WHERE id = v_user_id;
  END IF;
  v_user_name := COALESCE(v_user_name, 'Sistema');

  IF TG_OP = 'INSERT' THEN
    v_action := 'crear';
    v_new := to_jsonb(NEW);
    v_entity_id := COALESCE(v_new->>'id', '');
    v_details := jsonb_build_object('nuevo', v_new);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'editar';
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_entity_id := COALESCE(v_new->>'id', '');
    -- compute changed fields
    FOR v_key IN SELECT jsonb_object_keys(v_new) LOOP
      IF v_key IN ('updated_at','created_at') THEN CONTINUE; END IF;
      IF (v_old->v_key) IS DISTINCT FROM (v_new->v_key) THEN
        v_changed := v_changed || jsonb_build_object(v_key, jsonb_build_object('antes', v_old->v_key, 'despues', v_new->v_key));
      END IF;
    END LOOP;
    -- skip if nothing meaningful changed
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    v_details := jsonb_build_object('cambios', v_changed);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'eliminar';
    v_old := to_jsonb(OLD);
    v_entity_id := COALESCE(v_old->>'id', '');
    v_details := jsonb_build_object('eliminado', v_old);
  END IF;

  INSERT INTO public.activity_log (user_id, user_name, action, entity, entity_id, table_name, details)
  VALUES (v_user_id, v_user_name, v_action, TG_TABLE_NAME, v_entity_id, TG_TABLE_NAME, v_details);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 3) Helper to attach trigger
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'objectives','kpis','kpi_measurements','kpi_month_locks',
    'areas','subareas','positions','profiles','memberships','user_roles',
    'evaluations','evaluation_scores','evaluation_criteria',
    'audit_plans','audit_findings','audit_comments',
    'bpm_inspections','bpm_action_plan',
    'sampling_records','sampling_grid_rows',
    'access_control','asset_movements',
    'leader_pass_activities','leader_pass_records',
    'comfort_rooms','comfort_assignments',
    'newsletter_posts','newsletter_comments','recognition_posts',
    'system_parameters','menu_permissions','user_menu_overrides'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s_changes ON public.%1$I;', t);
    EXECUTE format(
      'CREATE TRIGGER audit_%1$s_changes
       AFTER INSERT OR UPDATE OR DELETE ON public.%1$I
       FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();',
      t
    );
  END LOOP;
END $$;
