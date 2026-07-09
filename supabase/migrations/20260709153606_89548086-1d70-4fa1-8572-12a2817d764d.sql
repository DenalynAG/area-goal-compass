ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS mision_cerosh_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_mision_cerosh_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT mision_cerosh_admin FROM public.profiles WHERE id = _user_id), false)
$$;