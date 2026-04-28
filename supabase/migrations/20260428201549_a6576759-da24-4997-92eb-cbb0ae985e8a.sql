CREATE TABLE public.sampling_grid_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  area_name TEXT NOT NULL,
  zone_name TEXT NOT NULL,
  indicator_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sampling_grid_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read sampling_grid_rows"
ON public.sampling_grid_rows FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins insert sampling_grid_rows"
ON public.sampling_grid_rows FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE POLICY "Admins update sampling_grid_rows"
ON public.sampling_grid_rows FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE POLICY "Admins delete sampling_grid_rows"
ON public.sampling_grid_rows FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin_area'::app_role));

CREATE TRIGGER set_updated_at_sampling_grid_rows
BEFORE UPDATE ON public.sampling_grid_rows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default rows
INSERT INTO public.sampling_grid_rows (area_name, zone_name, indicator_name, sort_order) VALUES
('Alimentos y Bebidas','Cocina','Alimentos',10),
('Alimentos y Bebidas','Cocina','Patógenos',20),
('Alimentos y Bebidas','Cocina','Superficies',30),
('Alimentos y Bebidas','Cocina','Ambiente',40),
('Alimentos y Bebidas','Cocina','Manipuladores',50),
('Alimentos y Bebidas','Cocina','Superficies #2',60),
('Alimentos y Bebidas','Cocina','Ambiente #2',70),
('Alimentos y Bebidas','Bar','Bebidas',110),
('Alimentos y Bebidas','Bar','Alimentos',120),
('Alimentos y Bebidas','Bar','Hielo',130),
('Alimentos y Bebidas','Bar','Manipuladores',140),
('Operaciones','Mantenimiento','Piscina 1',210),
('Operaciones','Mantenimiento','Piscina 5',220),
('Operaciones','Mantenimiento','Agua potable grifos',230);