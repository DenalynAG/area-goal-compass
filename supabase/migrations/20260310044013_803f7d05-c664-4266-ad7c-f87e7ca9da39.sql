INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT '/contraloria/devoluciones', role, true
FROM unnest(ARRAY['super_admin','admin_area','lider_subarea','colaborador','solo_lectura']::app_role[]) AS role
ON CONFLICT DO NOTHING;