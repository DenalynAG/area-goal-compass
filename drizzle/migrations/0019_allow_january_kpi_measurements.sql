ALTER TABLE public.kpi_measurements DROP CONSTRAINT kpi_measurements_allowed_month;
ALTER TABLE public.kpi_measurements ADD CONSTRAINT kpi_measurements_allowed_month CHECK (EXTRACT(month FROM period_date) >= 1 AND EXTRACT(month FROM period_date) <= 11);
UPDATE public.kpi_month_locks SET is_locked = false, updated_at = now() WHERE month = 1;