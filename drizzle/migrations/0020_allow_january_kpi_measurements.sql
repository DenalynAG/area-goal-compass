ALTER TABLE public.kpi_measurements DROP CONSTRAINT kpi_measurements_allowed_month;
ALTER TABLE public.kpi_measurements ADD CONSTRAINT kpi_measurements_allowed_month CHECK (EXTRACT(MONTH FROM period_date) BETWEEN 1 AND 11) NOT VALID;
ALTER TABLE public.kpi_measurements VALIDATE CONSTRAINT kpi_measurements_allowed_month;