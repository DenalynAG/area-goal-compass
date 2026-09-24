ALTER TABLE public.safe_moment_observations
  ADD COLUMN IF NOT EXISTS hotel_area text,
  ADD COLUMN IF NOT EXISTS process text,
  ADD COLUMN IF NOT EXISTS is_ambassador boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ambassador_at timestamptz;