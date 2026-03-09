-- Enum for finding severity
CREATE TYPE public.finding_severity AS ENUM ('critico', 'leve', 'bajo');

-- Enum for finding status
CREATE TYPE public.finding_status AS ENUM ('abierta', 'cerrada');

-- Enum for audit plan status
CREATE TYPE public.audit_plan_status AS ENUM ('pendiente', 'en_proceso', 'cumple', 'no_cumple', 'pendiente_cierre');

-- Audit plans table
CREATE TABLE public.audit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id UUID REFERENCES public.areas(id) ON DELETE CASCADE NOT NULL,
  responsible_user_id UUID NOT NULL,
  auditor_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  planned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.audit_plan_status NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_plans ENABLE ROW LEVEL SECURITY;

-- Super admin full access
CREATE POLICY "Super admin full audit_plans" ON public.audit_plans
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admin area manages own area audits
CREATE POLICY "Admin area manages audit_plans" ON public.audit_plans
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin_area') AND area_id = public.get_user_area_id(auth.uid()));

-- Authenticated read
CREATE POLICY "Authenticated read audit_plans" ON public.audit_plans
FOR SELECT TO authenticated
USING (
  area_id = public.get_user_area_id(auth.uid())
  OR responsible_user_id = auth.uid()
  OR auditor_user_id = auth.uid()
);

-- Audit findings table
CREATE TABLE public.audit_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_plan_id UUID REFERENCES public.audit_plans(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  action_description TEXT DEFAULT '',
  finding_type public.finding_status NOT NULL DEFAULT 'abierta',
  severity public.finding_severity NOT NULL DEFAULT 'leve',
  responsible_user_id UUID,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full audit_findings" ON public.audit_findings
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users access audit_findings via plan" ON public.audit_findings
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.audit_plans ap
  WHERE ap.id = audit_findings.audit_plan_id
  AND (
    public.has_role(auth.uid(), 'admin_area')
    OR ap.responsible_user_id = auth.uid()
    OR ap.auditor_user_id = auth.uid()
    OR ap.area_id = public.get_user_area_id(auth.uid())
  )
));

-- Audit comments table
CREATE TABLE public.audit_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES public.audit_findings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT DEFAULT '',
  role_label TEXT NOT NULL DEFAULT 'colaborador',
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full audit_comments" ON public.audit_comments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users access audit_comments via finding" ON public.audit_comments
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.audit_findings af
  JOIN public.audit_plans ap ON ap.id = af.audit_plan_id
  WHERE af.id = audit_comments.finding_id
  AND (
    ap.responsible_user_id = auth.uid()
    OR ap.auditor_user_id = auth.uid()
    OR ap.area_id = public.get_user_area_id(auth.uid())
    OR public.has_role(auth.uid(), 'admin_area')
  )
));

-- Update trigger for audit_plans
CREATE TRIGGER update_audit_plans_updated_at
  BEFORE UPDATE ON public.audit_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update trigger for audit_findings
CREATE TRIGGER update_audit_findings_updated_at
  BEFORE UPDATE ON public.audit_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();