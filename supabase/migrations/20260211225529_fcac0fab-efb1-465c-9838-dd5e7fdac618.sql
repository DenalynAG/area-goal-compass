
-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identificacion text DEFAULT '',
  ADD COLUMN IF NOT EXISTS sexo text DEFAULT '',
  ADD COLUMN IF NOT EXISTS municipio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS direccion text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS correo_personal text DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_contrato text DEFAULT '',
  ADD COLUMN IF NOT EXISTS talla_pantalon text DEFAULT '',
  ADD COLUMN IF NOT EXISTS talla_camisa text DEFAULT '',
  ADD COLUMN IF NOT EXISTS talla_zapatos text DEFAULT '',
  ADD COLUMN IF NOT EXISTS entidad_salud text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fondo_pensiones text DEFAULT '',
  ADD COLUMN IF NOT EXISTS fondo_cesantias text DEFAULT '';

-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
