UPDATE auth.users
SET encrypted_password = crypt('Cartagena$2026', gen_salt('bf')),
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('must_change_password', true),
    updated_at = now()
WHERE email = 'daniela@oshhotels.com';