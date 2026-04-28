UPDATE auth.users
SET encrypted_password = extensions.crypt('Cartagena$2026', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE email = 'daniela@oshhotels.com';