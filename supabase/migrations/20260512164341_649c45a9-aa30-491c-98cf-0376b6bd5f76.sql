UPDATE auth.users u
SET email = LOWER(p.email),
    email_confirmed_at = COALESCE(u.email_confirmed_at, now()),
    updated_at = now()
FROM public.profiles p
WHERE u.id = p.id
  AND p.email IS NOT NULL
  AND LOWER(p.email) IS DISTINCT FROM LOWER(u.email)
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u2
    WHERE u2.id <> u.id AND LOWER(u2.email) = LOWER(p.email)
  );