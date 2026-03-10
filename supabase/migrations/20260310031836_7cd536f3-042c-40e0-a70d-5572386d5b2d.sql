
-- Rooms catalog per tower/floor
CREATE TABLE public.comfort_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tower text NOT NULL CHECK (tower IN ('A', 'B', 'C')),
  floor integer NOT NULL CHECK (floor BETWEEN 1 AND 5),
  room_number text NOT NULL,
  status text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo', 'inactivo')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tower, room_number)
);

ALTER TABLE public.comfort_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read comfort_rooms" ON public.comfort_rooms
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin full comfort_rooms" ON public.comfort_rooms
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Generate rooms: Tower A/B/C, Floors 1-5, 20 rooms per floor
INSERT INTO public.comfort_rooms (tower, floor, room_number)
SELECT t.tower, f.floor, t.tower || LPAD(f.floor::text || LPAD(r.num::text, 2, '0'), 3, '0')
FROM (VALUES ('A'), ('B'), ('C')) AS t(tower)
CROSS JOIN generate_series(1, 5) AS f(floor)
CROSS JOIN generate_series(1, 20) AS r(num);

-- Daily assignment map
CREATE TABLE public.comfort_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_date date NOT NULL DEFAULT CURRENT_DATE,
  room_id uuid NOT NULL REFERENCES public.comfort_rooms(id),
  assigned_user_id uuid REFERENCES public.profiles(id),
  task_type text NOT NULL CHECK (task_type IN ('limpieza', 'checkout', 'inspeccion')),
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_progreso', 'completada')),
  notes text DEFAULT '',
  created_by uuid REFERENCES public.profiles(id),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_date, room_id, task_type)
);

ALTER TABLE public.comfort_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read comfort_assignments" ON public.comfort_assignments
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin full comfort_assignments" ON public.comfort_assignments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users insert comfort_assignments" ON public.comfort_assignments
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "Assigned user update comfort_assignments" ON public.comfort_assignments
  FOR UPDATE TO authenticated USING (assigned_user_id = auth.uid());
