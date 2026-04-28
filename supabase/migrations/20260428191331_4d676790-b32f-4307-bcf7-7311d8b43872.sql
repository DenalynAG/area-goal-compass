CREATE TABLE public.bpm_action_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_date date,
  reported_by text DEFAULT '',
  assigned_to text DEFAULT '',
  company text DEFAULT '',
  audited_personnel text DEFAULT '',
  condition_type text DEFAULT '',
  finding_description text DEFAULT '',
  finding_evidence_url text DEFAULT '',
  action_plan text DEFAULT '',
  estimated_close_date date,
  real_close_date date,
  action_evidence_url text DEFAULT '',
  closure_status text DEFAULT 'pendiente',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bpm_action_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read bpm_action_plan"
  ON public.bpm_action_plan FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins insert bpm_action_plan"
  ON public.bpm_action_plan FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE POLICY "Admins update bpm_action_plan"
  ON public.bpm_action_plan FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE POLICY "Admins delete bpm_action_plan"
  ON public.bpm_action_plan FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE TRIGGER trg_bpm_action_plan_updated_at
  BEFORE UPDATE ON public.bpm_action_plan
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();