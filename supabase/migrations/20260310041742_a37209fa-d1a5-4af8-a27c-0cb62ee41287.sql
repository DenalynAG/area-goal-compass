
-- Table to store menu visibility per role
CREATE TABLE public.menu_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_key text NOT NULL,
  role public.app_role NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_key, role)
);

-- Enable RLS
ALTER TABLE public.menu_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read permissions (needed for sidebar filtering)
CREATE POLICY "Authenticated read menu_permissions"
  ON public.menu_permissions FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only super admin can manage
CREATE POLICY "Super admin manages menu_permissions"
  ON public.menu_permissions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- Seed default data: all menus visible for all roles
-- Menu keys match sidebar structure
INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT menu_key, role, true
FROM (
  VALUES 
    ('/'), ('/aplicaciones'),
    ('/ayb'), ('/ayb/colaboradores'), ('/ayb/objetivos'), ('/ayb/leader-pass'), ('/ayb/calidad'), ('/ayb/evaluaciones'),
    ('/comercial'), ('/comercial/colaboradores'), ('/comercial/comercial'), ('/comercial/hospitalidad'), ('/comercial/reservas'), ('/comercial/objetivos'), ('/comercial/leader-pass'), ('/comercial/calidad'), ('/comercial/evaluaciones'),
    ('/compras'), ('/compras/colaboradores'), ('/compras/objetivos'), ('/compras/leader-pass'), ('/compras/calidad'), ('/compras/evaluaciones'),
    ('/contraloria'), ('/contraloria/colaboradores'), ('/contraloria/objetivos'), ('/contraloria/leader-pass'), ('/contraloria/calidad'), ('/contraloria/evaluaciones'),
    ('/mercadeo'), ('/mercadeo/colaboradores'), ('/mercadeo/objetivos'), ('/mercadeo/leader-pass'), ('/mercadeo/calidad'), ('/mercadeo/evaluaciones'),
    ('/operaciones'), ('/operaciones/colaboradores'), ('/operaciones/glowingdesk'), ('/operaciones/housekeeping'), ('/operaciones/housekeeping/comfort-map'), ('/operaciones/mantenimiento'), ('/operaciones/seguridad'), ('/operaciones/seguridad/control-acceso'), ('/operaciones/seguridad/control-activos'), ('/operaciones/objetivos'), ('/operaciones/leader-pass'), ('/operaciones/calidad'), ('/operaciones/evaluaciones'),
    ('/rrhh'), ('/estructura'), ('/colaboradores'), ('/objetivos'), ('/leader-pass'), ('/calidad/auditorias'), ('/evaluaciones'),
    ('/tecnologia'), ('/tecnologia/colaboradores'), ('/tecnologia/objetivos'), ('/tecnologia/leader-pass'), ('/tecnologia/calidad'), ('/tecnologia/evaluaciones'),
    ('/organigrama'), ('/administracion')
) AS menus(menu_key),
(VALUES ('super_admin'::public.app_role), ('admin_area'), ('lider_subarea'), ('colaborador'), ('solo_lectura')) AS roles(role);
