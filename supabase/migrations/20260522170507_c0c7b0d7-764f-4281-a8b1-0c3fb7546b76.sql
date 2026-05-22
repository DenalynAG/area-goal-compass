
-- Add a per-user flag granting global access to Quality module across all areas
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS calidad_global_access boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.has_calidad_global(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT calidad_global_access FROM public.profiles WHERE id = _user_id), false)
$$;

-- Grant cross-area access on Quality tables
DROP POLICY IF EXISTS "Calidad global full audit_plans" ON public.audit_plans;
CREATE POLICY "Calidad global full audit_plans"
ON public.audit_plans FOR ALL
USING (public.has_calidad_global(auth.uid()))
WITH CHECK (public.has_calidad_global(auth.uid()));

DROP POLICY IF EXISTS "Calidad global full audit_findings" ON public.audit_findings;
CREATE POLICY "Calidad global full audit_findings"
ON public.audit_findings FOR ALL
USING (public.has_calidad_global(auth.uid()))
WITH CHECK (public.has_calidad_global(auth.uid()));

DROP POLICY IF EXISTS "Calidad global full audit_comments" ON public.audit_comments;
CREATE POLICY "Calidad global full audit_comments"
ON public.audit_comments FOR ALL
USING (public.has_calidad_global(auth.uid()))
WITH CHECK (public.has_calidad_global(auth.uid()));
