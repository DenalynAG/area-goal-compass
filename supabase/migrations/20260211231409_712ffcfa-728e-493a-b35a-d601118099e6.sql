
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read positions" ON public.positions FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admin manages positions" ON public.positions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admin area manages positions" ON public.positions FOR ALL USING (has_role(auth.uid(), 'admin_area'::app_role));

INSERT INTO public.positions (name) VALUES
  ('Director/a General'),
  ('Director/a de Alimentos y Bebidas'),
  ('Junta Directiva'),
  ('Gerente Comercial'),
  ('Director/a de Gestión Humana'),
  ('Gerente de Compras'),
  ('Líder de Tecnología');
