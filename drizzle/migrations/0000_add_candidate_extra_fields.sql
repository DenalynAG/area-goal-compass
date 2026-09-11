ALTER TABLE public.assessment_candidates
  ADD COLUMN salario_aspiracion numeric,
  ADD COLUMN fecha_nacimiento date,
  ADD COLUMN nivel_ingles text,
  ADD COLUMN direccion text,
  ADD COLUMN anos_experiencia numeric;