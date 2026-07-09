-- Consolidate duplicate KPI monthly measurements before enforcing uniqueness.
-- Keep the most recent row for each KPI/month and preserve the best available target.
WITH ranked AS (
  SELECT
    km.id,
    km.kpi_id,
    km.period_date,
    km.value,
    km.target,
    km.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY km.kpi_id, km.period_date
      ORDER BY km.created_at DESC, km.id DESC
    ) AS rn,
    FIRST_VALUE(km.id) OVER (
      PARTITION BY km.kpi_id, km.period_date
      ORDER BY km.created_at DESC, km.id DESC
    ) AS keep_id,
    FIRST_VALUE(km.target) OVER (
      PARTITION BY km.kpi_id, km.period_date
      ORDER BY (km.target IS NOT NULL) DESC, km.created_at DESC, km.id DESC
    ) AS keep_target
  FROM public.kpi_measurements km
), merged AS (
  UPDATE public.kpi_measurements km
  SET target = COALESCE(km.target, ranked.keep_target)
  FROM ranked
  WHERE km.id = ranked.keep_id
    AND ranked.rn = 1
    AND ranked.keep_target IS NOT NULL
    AND km.target IS NULL
  RETURNING km.id
)
DELETE FROM public.kpi_measurements km
USING ranked
WHERE km.id = ranked.id
  AND ranked.rn > 1;

-- Guarantee there is only one measurement per KPI per month going forward.
CREATE UNIQUE INDEX IF NOT EXISTS kpi_measurements_kpi_id_period_date_key
ON public.kpi_measurements (kpi_id, period_date);