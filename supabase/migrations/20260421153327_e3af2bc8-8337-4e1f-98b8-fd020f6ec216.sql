-- Unify duplicate profiles for alberto@oshhotels.com
-- Keep: b5859c3b-96fc-42cf-b4a3-13f6e9914189 (linked to auth.users)
-- Remove: 70cec53b-b8fb-4750-ab2b-8bd99dd3262c (duplicate, no auth)

-- 1) Copy full profile data to the auth-linked profile
UPDATE public.profiles SET
  name = 'Cifuentes Espinosa Alberto Antonio',
  position = 'Líder de Compensación y Bienestar',
  identificacion = '14623307',
  avatar = COALESCE(NULLIF(avatar,''), (SELECT avatar FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  birthday = COALESCE(birthday, (SELECT birthday FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  phone = COALESCE(phone, (SELECT phone FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  correo_personal = COALESCE(correo_personal, (SELECT correo_personal FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  direccion = COALESCE(direccion, (SELECT direccion FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  municipio = COALESCE(municipio, (SELECT municipio FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  lugar_nacimiento = COALESCE(lugar_nacimiento, (SELECT lugar_nacimiento FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  sexo = COALESCE(sexo, (SELECT sexo FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  rh = COALESCE(rh, (SELECT rh FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  estado_civil = COALESCE(estado_civil, (SELECT estado_civil FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  nivel_educativo = COALESCE(nivel_educativo, (SELECT nivel_educativo FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  fecha_ingreso = COALESCE(fecha_ingreso, (SELECT fecha_ingreso FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  tipo_contrato = COALESCE(tipo_contrato, (SELECT tipo_contrato FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  jefe_inmediato = COALESCE(jefe_inmediato, (SELECT jefe_inmediato FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  arl = COALESCE(arl, (SELECT arl FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  entidad_salud = COALESCE(entidad_salud, (SELECT entidad_salud FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  fondo_pensiones = COALESCE(fondo_pensiones, (SELECT fondo_pensiones FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  fondo_cesantias = COALESCE(fondo_cesantias, (SELECT fondo_cesantias FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  talla_camisa = COALESCE(talla_camisa, (SELECT talla_camisa FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  talla_pantalon = COALESCE(talla_pantalon, (SELECT talla_pantalon FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c')),
  talla_zapatos = COALESCE(talla_zapatos, (SELECT talla_zapatos FROM public.profiles WHERE id='70cec53b-b8fb-4750-ab2b-8bd99dd3262c'))
WHERE id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189';

-- 2) Remove kept-profile rows that would conflict with reassignment from duplicate
DELETE FROM public.memberships WHERE user_id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189';
DELETE FROM public.user_roles  WHERE user_id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189';

-- 3) Reassign references from duplicate to kept profile
UPDATE public.memberships    SET user_id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189' WHERE user_id = '70cec53b-b8fb-4750-ab2b-8bd99dd3262c';
UPDATE public.user_roles     SET user_id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189' WHERE user_id = '70cec53b-b8fb-4750-ab2b-8bd99dd3262c';
UPDATE public.asset_movements SET collaborator_user_id = 'b5859c3b-96fc-42cf-b4a3-13f6e9914189' WHERE collaborator_user_id = '70cec53b-b8fb-4750-ab2b-8bd99dd3262c';

-- 4) Delete duplicate profile
DELETE FROM public.profiles WHERE id = '70cec53b-b8fb-4750-ab2b-8bd99dd3262c';