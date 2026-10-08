ALTER TABLE public.safe_moment_observations
  ADD COLUMN IF NOT EXISTS activity_observed text,
  ADD COLUMN IF NOT EXISTS observation_type text,
  ADD COLUMN IF NOT EXISTS hazard text,
  ADD COLUMN IF NOT EXISTS intervention_options text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS intervention_comments text,
  ADD COLUMN IF NOT EXISTS action_required text;

COMMENT ON COLUMN public.safe_moment_observations.activity_observed IS 'Actividad que realizaba el colaborador al momento de la observación';
COMMENT ON COLUMN public.safe_moment_observations.observation_type IS 'Tipo de observación: comportamiento, condicion o ambos';
COMMENT ON COLUMN public.safe_moment_observations.hazard IS 'Peligro identificado (biomecanico, locativo, mecanico, etc.)';
COMMENT ON COLUMN public.safe_moment_observations.intervention_options IS 'Intervenciones realizadas durante el Momento Seguro';
COMMENT ON COLUMN public.safe_moment_observations.intervention_comments IS 'Comentarios de la intervención';
COMMENT ON COLUMN public.safe_moment_observations.action_required IS 'Acción requerida para la gestión y seguimiento';