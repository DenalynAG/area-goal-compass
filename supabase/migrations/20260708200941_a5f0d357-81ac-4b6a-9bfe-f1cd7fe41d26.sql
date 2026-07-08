
CREATE POLICY "Calidad global manages sampling_records" ON public.sampling_records
FOR ALL TO authenticated
USING (public.has_calidad_global(auth.uid()))
WITH CHECK (public.has_calidad_global(auth.uid()));

CREATE POLICY "Calidad global insert sampling_grid_rows" ON public.sampling_grid_rows
FOR INSERT TO authenticated
WITH CHECK (public.has_calidad_global(auth.uid()));

CREATE POLICY "Calidad global update sampling_grid_rows" ON public.sampling_grid_rows
FOR UPDATE TO authenticated
USING (public.has_calidad_global(auth.uid()))
WITH CHECK (public.has_calidad_global(auth.uid()));

CREATE POLICY "Calidad global delete sampling_grid_rows" ON public.sampling_grid_rows
FOR DELETE TO authenticated
USING (public.has_calidad_global(auth.uid()));
