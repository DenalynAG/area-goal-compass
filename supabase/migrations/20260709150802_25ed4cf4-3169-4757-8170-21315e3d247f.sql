
ALTER TABLE public.mision_cerosh_reports
  ADD COLUMN IF NOT EXISTS evidence_status text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

ALTER TABLE public.mision_cerosh_reports
  DROP CONSTRAINT IF EXISTS mision_cerosh_reports_evidence_status_check;
ALTER TABLE public.mision_cerosh_reports
  ADD CONSTRAINT mision_cerosh_reports_evidence_status_check
  CHECK (evidence_status IN ('pendiente','aprobado','rechazado'));
