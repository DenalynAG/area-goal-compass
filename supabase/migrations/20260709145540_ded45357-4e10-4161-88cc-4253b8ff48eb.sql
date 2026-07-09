ALTER TABLE public.mision_cerosh_reports
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS evidence_url text;