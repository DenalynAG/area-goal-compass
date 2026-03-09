-- Create storage bucket for newsletter images
INSERT INTO storage.buckets (id, name, public) VALUES ('newsletter', 'newsletter', true);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload newsletter" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'newsletter');

-- Public read access
CREATE POLICY "Public read newsletter" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'newsletter');

-- Super admin and admin_area can delete
CREATE POLICY "Admin delete newsletter" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'newsletter' AND (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area')));
