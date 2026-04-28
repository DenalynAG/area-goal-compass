DO $$
DECLARE
  v_user_id uuid;
  v_area_id uuid := '5fc84238-5c96-4ba8-aa3c-d91b7a408f83';
  v_subarea_id uuid := 'b21ae768-163d-439d-8e41-cdfba66115e0';
  v_email text := 'daniela@oshhotels.com';
  v_password text := 'Cartagena$2026';
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      v_email, crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Daniela"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  END IF;

  -- Profile (handle_new_user trigger may already create it; upsert just in case)
  INSERT INTO public.profiles (id, name, email)
  VALUES (v_user_id, 'Daniela', v_email)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email;

  -- Membership: Recursos Humanos / Calidad
  DELETE FROM public.memberships WHERE user_id = v_user_id;
  INSERT INTO public.memberships (user_id, area_id, subarea_id)
  VALUES (v_user_id, v_area_id, v_subarea_id);

  -- Role: lider_subarea
  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'lider_subarea');
END $$;