
-- Create system_parameters table (key-value store for system config)
CREATE TABLE public.system_parameters (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.system_parameters ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated read parameters"
ON public.system_parameters FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only super_admin can modify
CREATE POLICY "Super admin manages parameters"
ON public.system_parameters FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Seed default values
INSERT INTO public.system_parameters (key, value, label) VALUES
  ('periodo_actual', '2026-Q1', 'Período actual'),
  ('frecuencia_revision', 'Mensual', 'Frecuencia de revisión'),
  ('prioridades', 'Alta, Media, Baja', 'Prioridades'),
  ('estados_objetivo', 'Borrador, Activo, En Riesgo, Cerrado', 'Estados de objetivo');
