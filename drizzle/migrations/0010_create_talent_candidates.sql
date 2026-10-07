CREATE TABLE public.talent_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  document_id text,
  phone text,
  email text,
  profession text,
  university text,
  salario_aspiracion numeric,
  fecha_nacimiento date,
  nivel_ingles text,
  direccion text,
  anos_experiencia numeric,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.talent_candidates TO authenticated;
GRANT ALL ON public.talent_candidates TO service_role;
ALTER TABLE public.talent_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tc select" ON public.talent_candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "tc insert" ON public.talent_candidates FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));
CREATE POLICY "tc update" ON public.talent_candidates FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));
CREATE POLICY "tc delete" ON public.talent_candidates FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin') OR public.is_hr(auth.uid()));
CREATE TRIGGER trg_tc_updated BEFORE UPDATE ON public.talent_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();