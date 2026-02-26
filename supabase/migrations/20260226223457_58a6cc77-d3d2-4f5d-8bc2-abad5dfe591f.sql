
-- Leader Pass activity definitions (predefined)
CREATE TABLE public.leader_pass_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  frequency text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.leader_pass_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read leader_pass_activities"
ON public.leader_pass_activities FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages leader_pass_activities"
ON public.leader_pass_activities FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert the 9 predefined activities
INSERT INTO public.leader_pass_activities (name, description, frequency, sort_order) VALUES
  ('One to One', 'Feedback Consciente', 'Mensual', 1),
  ('Evaluación de Performance', '', 'Diario / Anual', 2),
  ('Desarrollo del equipo', 'IDP admón. o Cronograma de Capacitación', 'Mensual', 3),
  ('People Review & Planes de Sucesión', '', 'Trimestral', 4),
  ('ADN OSH', '', 'Semanal / Mensual', 5),
  ('Upward Feedback', '', 'Semestral', 6),
  ('Misión CerOSH', '', 'Mensual', 7),
  ('Programa OSH People', '', 'Mensual', 8),
  ('Orden y Limpieza', '', 'Mensual', 9);

-- Leader Pass records (tracking completion)
CREATE TABLE public.leader_pass_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.leader_pass_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  period text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id, period)
);

ALTER TABLE public.leader_pass_records ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "Super admin full leader_pass_records"
ON public.leader_pass_records FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admin area can manage records for users in their area
CREATE POLICY "Admin area manages area leader_pass_records"
ON public.leader_pass_records FOR ALL
USING (
  has_role(auth.uid(), 'admin_area'::app_role) AND
  EXISTS (
    SELECT 1 FROM memberships m1, memberships m2
    WHERE m1.user_id = auth.uid() AND m2.user_id = leader_pass_records.user_id AND m1.area_id = m2.area_id
  )
);

-- Leaders can manage their own records
CREATE POLICY "Users manage own leader_pass_records"
ON public.leader_pass_records FOR ALL
USING (user_id = auth.uid());

-- Lider subarea can read records of their subarea members
CREATE POLICY "Lider subarea reads subarea leader_pass_records"
ON public.leader_pass_records FOR SELECT
USING (
  has_role(auth.uid(), 'lider_subarea'::app_role) AND
  EXISTS (
    SELECT 1 FROM memberships m1, memberships m2
    WHERE m1.user_id = auth.uid() AND m2.user_id = leader_pass_records.user_id AND m1.subarea_id = m2.subarea_id
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_leader_pass_records_updated_at
BEFORE UPDATE ON public.leader_pass_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
