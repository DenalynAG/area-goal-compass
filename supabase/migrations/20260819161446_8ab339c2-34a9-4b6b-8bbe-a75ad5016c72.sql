CREATE TABLE public.hotel_zones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  bloque text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotel_zones TO authenticated;
GRANT ALL ON public.hotel_zones TO service_role;
ALTER TABLE public.hotel_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view zones" ON public.hotel_zones FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create zones" ON public.hotel_zones FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated can update zones" ON public.hotel_zones FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Creators or admins can delete zones" ON public.hotel_zones FOR DELETE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'));
CREATE TRIGGER hotel_zones_updated_at BEFORE UPDATE ON public.hotel_zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();