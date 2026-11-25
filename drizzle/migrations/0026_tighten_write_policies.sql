DROP POLICY IF EXISTS "Authenticated can create zones" ON public.hotel_zones;
CREATE POLICY "Authenticated can create zones" ON public.hotel_zones FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_seguridad_fisica(auth.uid()));

DROP POLICY IF EXISTS "Insert mision cerosh reports" ON public.mision_cerosh_reports;
CREATE POLICY "Insert mision cerosh reports" ON public.mision_cerosh_reports FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "sm_insert_authenticated" ON public.safe_moment_observations;
CREATE POLICY "sm_insert_authenticated" ON public.safe_moment_observations FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can insert candidate competencies" ON public.assessment_candidate_competencies;
CREATE POLICY "Authenticated can insert candidate competencies" ON public.assessment_candidate_competencies FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can update candidates" ON public.assessment_candidates;
CREATE POLICY "Authenticated can update candidates" ON public.assessment_candidates FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()) OR created_by = auth.uid())
WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated can update it asset inventory" ON public.it_asset_inventory;
CREATE POLICY "Authenticated can update it asset inventory" ON public.it_asset_inventory FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_area'))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'admin_area'));

DROP POLICY IF EXISTS "Authenticated can update recurring providers" ON public.recurring_providers;
CREATE POLICY "Authenticated can update recurring providers" ON public.recurring_providers FOR UPDATE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.is_seguridad_fisica(auth.uid()))
WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'super_admin') OR public.is_seguridad_fisica(auth.uid()));