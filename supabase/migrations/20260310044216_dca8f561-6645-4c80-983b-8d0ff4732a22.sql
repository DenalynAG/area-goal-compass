INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT key, role, true
FROM (VALUES ('/ayb/carta-digital'), ('/ayb/recogida-loza'), ('/comercial/hospitalidad/servicios')) AS keys(key)
CROSS JOIN unnest(ARRAY['super_admin','admin_area','lider_subarea','colaborador','solo_lectura']::app_role[]) AS role
ON CONFLICT DO NOTHING;