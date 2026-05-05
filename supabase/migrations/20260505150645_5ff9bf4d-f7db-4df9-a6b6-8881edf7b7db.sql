-- Set password for Cavadia Hernandez Carmen Liney and assign lider_subarea role
UPDATE auth.users
SET encrypted_password = crypt('Cartagena@2028', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '11b54099-6414-42de-ad13-d6568df977e9';

INSERT INTO public.user_roles (user_id, role)
VALUES ('11b54099-6414-42de-ad13-d6568df977e9', 'lider_subarea')
ON CONFLICT (user_id, role) DO NOTHING;