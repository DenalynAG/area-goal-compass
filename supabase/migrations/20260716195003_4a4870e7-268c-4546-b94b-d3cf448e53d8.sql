
INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT k, r::app_role, CASE WHEN r IN ('super_admin','admin_area','lider_subarea') THEN true ELSE false END
FROM (VALUES
  ('/ayb/control-acceso'),
  ('/comercial/control-acceso'),
  ('/compras/control-acceso'),
  ('/contraloria/control-acceso'),
  ('/mercadeo/control-acceso'),
  ('/operaciones/control-acceso'),
  ('/tecnologia/control-acceso'),
  ('/ayb/bar'),
  ('/ayb/bar/control-acceso'),
  ('/ayb/cocina'),
  ('/ayb/cocina/control-acceso'),
  ('/ayb/mesa'),
  ('/ayb/mesa/control-acceso'),
  ('/comercial/comercial/control-acceso'),
  ('/comercial/hospitalidad/control-acceso'),
  ('/comercial/reservas/control-acceso'),
  ('/operaciones/glowingdesk/control-acceso'),
  ('/operaciones/housekeeping/control-acceso'),
  ('/operaciones/mantenimiento/control-acceso')
) AS keys(k)
CROSS JOIN (VALUES
  ('super_admin'),('admin_area'),('lider_subarea'),
  ('gestor_area'),('colaborador'),('solo_lectura')
) AS roles(r)
ON CONFLICT (menu_key, role) DO NOTHING;
