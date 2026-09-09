CREATE POLICY "Authenticated read leader_pass evidences" ON public.evidences FOR SELECT TO authenticated USING (entity_type = 'leader_pass');

CREATE POLICY "Authenticated read leader_pass evidence files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'evidencias' AND (storage.foldername(name))[1] = 'leader_pass');