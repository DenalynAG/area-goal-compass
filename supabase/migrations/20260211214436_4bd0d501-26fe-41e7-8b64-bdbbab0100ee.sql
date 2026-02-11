
-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin_area', 'lider_subarea', 'colaborador', 'solo_lectura');
CREATE TYPE public.entity_status AS ENUM ('activo', 'inactivo');
CREATE TYPE public.objective_status AS ENUM ('borrador', 'activo', 'en_riesgo', 'cerrado');
CREATE TYPE public.priority_level AS ENUM ('alta', 'media', 'baja');
CREATE TYPE public.kpi_frequency AS ENUM ('semanal', 'mensual', 'trimestral');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  position TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table (separate from profiles per security guidelines)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'colaborador',
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Areas
CREATE TABLE public.areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  leader_user_id UUID REFERENCES public.profiles(id),
  status entity_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- 5. Subareas
CREATE TABLE public.subareas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  leader_user_id UUID REFERENCES public.profiles(id),
  status entity_status NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.subareas ENABLE ROW LEVEL SECURITY;

-- 6. Memberships (user belongs to area/subarea)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES public.areas(id) ON DELETE CASCADE,
  subarea_id UUID REFERENCES public.subareas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 7. Objectives
CREATE TABLE public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL CHECK (scope_type IN ('area', 'subarea')),
  scope_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  period TEXT DEFAULT '',
  owner_user_id UUID REFERENCES public.profiles(id),
  start_date DATE,
  end_date DATE,
  priority priority_level NOT NULL DEFAULT 'media',
  status objective_status NOT NULL DEFAULT 'borrador',
  progress_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;

-- 8. KPIs
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition TEXT DEFAULT '',
  unit TEXT DEFAULT '',
  frequency kpi_frequency NOT NULL DEFAULT 'mensual',
  baseline NUMERIC NOT NULL DEFAULT 0,
  target NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  threshold_green NUMERIC NOT NULL DEFAULT 0,
  threshold_yellow NUMERIC NOT NULL DEFAULT 0,
  threshold_red NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;

-- 9. KPI Measurements
CREATE TABLE public.kpi_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id UUID NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  period_date DATE NOT NULL,
  value NUMERIC NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.kpi_measurements ENABLE ROW LEVEL SECURITY;

-- 10. Activity Log
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY DEFINER FUNCTIONS (avoid recursion)
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's area_id from membership
CREATE OR REPLACE FUNCTION public.get_user_area_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area_id FROM public.memberships WHERE user_id = _user_id LIMIT 1
$$;

-- Get user's subarea_id from membership
CREATE OR REPLACE FUNCTION public.get_user_subarea_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT subarea_id FROM public.memberships WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

-- PROFILES: everyone authenticated can read, only own profile can update
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- USER_ROLES: super_admin manages, everyone reads own
CREATE POLICY "Read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admin manages roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

-- AREAS: super_admin full, others read own area
CREATE POLICY "Super admin full access areas" ON public.areas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read own area" ON public.areas
  FOR SELECT TO authenticated USING (id = public.get_user_area_id(auth.uid()));

-- SUBAREAS: super_admin full, admin_area own area, others own area read
CREATE POLICY "Super admin full access subareas" ON public.subareas
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admin area manages subareas" ON public.subareas
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin_area') AND area_id = public.get_user_area_id(auth.uid())
  );
CREATE POLICY "Users read own area subareas" ON public.subareas
  FOR SELECT TO authenticated USING (area_id = public.get_user_area_id(auth.uid()));

-- MEMBERSHIPS: super_admin full, users read own
CREATE POLICY "Super admin full memberships" ON public.memberships
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read own membership" ON public.memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admin area reads area memberships" ON public.memberships
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin_area') AND area_id = public.get_user_area_id(auth.uid())
  );

-- OBJECTIVES: visibility by area/subarea
CREATE POLICY "Super admin full objectives" ON public.objectives
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read own scope objectives" ON public.objectives
  FOR SELECT TO authenticated USING (
    (scope_type = 'area' AND scope_id = public.get_user_area_id(auth.uid()))
    OR (scope_type = 'subarea' AND scope_id = public.get_user_subarea_id(auth.uid()))
  );
CREATE POLICY "Admin area manages area objectives" ON public.objectives
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin_area') AND scope_type = 'area' AND scope_id = public.get_user_area_id(auth.uid())
  );
CREATE POLICY "Lider subarea manages subarea objectives" ON public.objectives
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'lider_subarea') AND scope_type = 'subarea' AND scope_id = public.get_user_subarea_id(auth.uid())
  );

-- KPIS: inherit from objectives visibility
CREATE POLICY "Super admin full kpis" ON public.kpis
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read kpis of visible objectives" ON public.kpis
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.objectives o WHERE o.id = objective_id AND (
        (o.scope_type = 'area' AND o.scope_id = public.get_user_area_id(auth.uid()))
        OR (o.scope_type = 'subarea' AND o.scope_id = public.get_user_subarea_id(auth.uid()))
      )
    )
  );

-- KPI_MEASUREMENTS: same as kpis
CREATE POLICY "Super admin full measurements" ON public.kpi_measurements
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read measurements of visible kpis" ON public.kpi_measurements
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.kpis k
      JOIN public.objectives o ON o.id = k.objective_id
      WHERE k.id = kpi_id AND (
        (o.scope_type = 'area' AND o.scope_id = public.get_user_area_id(auth.uid()))
        OR (o.scope_type = 'subarea' AND o.scope_id = public.get_user_subarea_id(auth.uid()))
      )
    )
  );
CREATE POLICY "Authenticated insert measurements" ON public.kpi_measurements
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

-- ACTIVITY_LOG: super_admin reads all, others read own
CREATE POLICY "Super admin reads all logs" ON public.activity_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users read own logs" ON public.activity_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Authenticated insert logs" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
