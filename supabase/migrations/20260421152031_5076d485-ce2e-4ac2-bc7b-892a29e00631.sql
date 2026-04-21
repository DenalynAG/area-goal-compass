UPDATE auth.users
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('must_change_password', true)
WHERE email = 'alberto@oshhotels.com';