
DROP POLICY IF EXISTS "Calidad global read areas" ON public.areas;
CREATE POLICY "Calidad global read areas"
ON public.areas FOR SELECT
USING (public.has_calidad_global(auth.uid()));

DROP POLICY IF EXISTS "Calidad global read subareas" ON public.subareas;
CREATE POLICY "Calidad global read subareas"
ON public.subareas FOR SELECT
USING (public.has_calidad_global(auth.uid()));
