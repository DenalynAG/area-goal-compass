-- Tabla de overrides de menú por usuario
CREATE TABLE IF NOT EXISTS public.user_menu_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  menu_key text NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_key)
);

ALTER TABLE public.user_menu_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own menu overrides"
  ON public.user_menu_overrides FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admin full menu overrides"
  ON public.user_menu_overrides FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER trg_user_menu_overrides_updated_at
  BEFORE UPDATE ON public.user_menu_overrides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Restricción específica para Daniela: solo Recursos Humanos > Calidad y Objetivos
-- Insertamos overrides que ocultan TODO excepto las claves permitidas
DO $$
DECLARE
  v_user_id uuid;
  v_key text;
  v_allowed text[] := ARRAY['/rrhh', '/objetivos', '/calidad/auditorias'];
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'daniela@oshhotels.com';
  IF v_user_id IS NULL THEN RETURN; END IF;

  -- Para cada menu_key existente del rol lider_subarea, crear override
  FOR v_key IN
    SELECT DISTINCT menu_key FROM public.menu_permissions WHERE role = 'lider_subarea'
  LOOP
    INSERT INTO public.user_menu_overrides (user_id, menu_key, is_visible)
    VALUES (v_user_id, v_key, v_key = ANY(v_allowed))
    ON CONFLICT (user_id, menu_key) DO UPDATE
      SET is_visible = EXCLUDED.is_visible, updated_at = now();
  END LOOP;
END $$;