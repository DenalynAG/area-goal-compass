
CREATE POLICY "Calidad global insert bpm_inspections" ON public.bpm_inspections FOR INSERT TO authenticated WITH CHECK (public.has_calidad_global(auth.uid()));
CREATE POLICY "Calidad global update bpm_inspections" ON public.bpm_inspections FOR UPDATE TO authenticated USING (public.has_calidad_global(auth.uid())) WITH CHECK (public.has_calidad_global(auth.uid()));
CREATE POLICY "Calidad global delete bpm_inspections" ON public.bpm_inspections FOR DELETE TO authenticated USING (public.has_calidad_global(auth.uid()));

CREATE POLICY "Calidad global insert bpm_action_plan" ON public.bpm_action_plan FOR INSERT TO authenticated WITH CHECK (public.has_calidad_global(auth.uid()));
CREATE POLICY "Calidad global update bpm_action_plan" ON public.bpm_action_plan FOR UPDATE TO authenticated USING (public.has_calidad_global(auth.uid())) WITH CHECK (public.has_calidad_global(auth.uid()));
CREATE POLICY "Calidad global delete bpm_action_plan" ON public.bpm_action_plan FOR DELETE TO authenticated USING (public.has_calidad_global(auth.uid()));
