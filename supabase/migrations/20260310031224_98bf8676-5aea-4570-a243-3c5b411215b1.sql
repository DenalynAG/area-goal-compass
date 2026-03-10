
-- Table: access_control (Control de Acceso Interno)
CREATE TABLE public.access_control (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  visitor_name text NOT NULL,
  document_id text NOT NULL,
  entry_datetime timestamptz NOT NULL DEFAULT now(),
  estimated_exit_time timestamptz,
  exit_datetime timestamptz,
  area_id uuid REFERENCES public.areas(id),
  subarea_id uuid REFERENCES public.subareas(id),
  companion_user_id uuid REFERENCES public.profiles(id),
  zone_requirement text NOT NULL DEFAULT '',
  arl text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_control ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access_control" ON public.access_control
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated read access_control" ON public.access_control
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert access_control" ON public.access_control
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Table: asset_movements (Control de Entrada y Salida de Activos)
CREATE TABLE public.asset_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid REFERENCES public.areas(id),
  subarea_id uuid REFERENCES public.subareas(id),
  collaborator_user_id uuid REFERENCES public.profiles(id),
  movement_type text NOT NULL CHECK (movement_type IN ('entrada', 'salida')),
  asset_type text NOT NULL,
  asset_serial text NOT NULL DEFAULT '',
  exit_datetime timestamptz,
  entry_datetime timestamptz,
  reason text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.asset_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full asset_movements" ON public.asset_movements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Authenticated read asset_movements" ON public.asset_movements
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated insert asset_movements" ON public.asset_movements
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
