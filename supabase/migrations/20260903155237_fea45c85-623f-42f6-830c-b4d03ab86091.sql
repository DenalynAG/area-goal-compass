-- Todos los usuarios autenticados pueden ver las evidencias de hallazgos de calidad
CREATE POLICY "Authenticated read finding evidences"
ON public.evidences
FOR SELECT
TO authenticated
USING (entity_type = 'audit_finding');

-- Lectura en storage de archivos de hallazgos para todos los autenticados
CREATE POLICY "Authenticated read finding evidence storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'evidencias' AND (storage.foldername(name))[1] = 'audit_finding');