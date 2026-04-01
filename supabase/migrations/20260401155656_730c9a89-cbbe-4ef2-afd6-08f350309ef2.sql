
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS lugar_nacimiento text DEFAULT '',
  ADD COLUMN IF NOT EXISTS rh text DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado_civil text DEFAULT '',
  ADD COLUMN IF NOT EXISTS nivel_educativo text DEFAULT '',
  ADD COLUMN IF NOT EXISTS arl text DEFAULT '',
  ADD COLUMN IF NOT EXISTS jefe_inmediato text DEFAULT '';
