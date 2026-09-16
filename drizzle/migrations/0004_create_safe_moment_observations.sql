CREATE TABLE public.safe_moment_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_date date NOT NULL DEFAULT CURRENT_DATE,
  observation_time text,
  area_id uuid REFERENCES public.areas(id),
  subarea_id uuid REFERENCES public.subareas(id),
  location text,
  observer_user_id uuid,
  observer_name text,
  observed_user_id uuid,
  observed_name text,
  observed_document text,
  observed_position text,
  category text NOT NULL DEFAULT 'comportamiento_seguro',
  behavior_category text,
  description text NOT NULL DEFAULT '',
  contributing_factors text[] NOT NULL DEFAULT '{}',
  associated_risk text,
  risk_level text NOT NULL DEFAULT 'bajo',
  evidence_urls text[] NOT NULL DEFAULT '{}',
  immediate_actions text,
  followup_required boolean NOT NULL DEFAULT false,
  followup_responsible_user_id uuid,
  followup_due_date date,
  followup_notes text,
  status text NOT NULL DEFAULT 'abierta',
  closed_at timestamptz,
  signature_observer text,
  signature_observed text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.safe_moment_observations TO authenticated;
GRANT ALL ON public.safe_moment_observations TO service_role;

ALTER TABLE public.safe_moment_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sm_select_authenticated" ON public.safe_moment_observations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sm_insert_authenticated" ON public.safe_moment_observations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sm_update_owner_or_admin" ON public.safe_moment_observations
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR observer_user_id = auth.uid()
    OR followup_responsible_user_id = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin_area')
    OR public.is_hr(auth.uid())
  );

CREATE POLICY "sm_delete_owner_or_admin" ON public.safe_moment_observations
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_hr(auth.uid())
  );

CREATE TRIGGER trg_safe_moment_updated_at
  BEFORE UPDATE ON public.safe_moment_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audit_safe_moment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.safe_moment_observations
  FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

CREATE INDEX idx_safe_moment_date ON public.safe_moment_observations (observation_date DESC);
CREATE INDEX idx_safe_moment_area ON public.safe_moment_observations (area_id);
