CREATE TABLE public.assessment_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subtitle text,
  behavior text,
  position_name text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_competencies TO authenticated;
GRANT ALL ON public.assessment_competencies TO service_role;

ALTER TABLE public.assessment_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view competencies"
ON public.assessment_competencies FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage competencies"
ON public.assessment_competencies FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area') OR public.is_hr(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area') OR public.is_hr(auth.uid()));

CREATE TRIGGER trg_assessment_competencies_updated_at
BEFORE UPDATE ON public.assessment_competencies
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.assessment_competency_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.assessment_evaluations(id) ON DELETE CASCADE,
  competency_id uuid NOT NULL REFERENCES public.assessment_competencies(id) ON DELETE CASCADE,
  score integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluation_id, competency_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assessment_competency_scores TO authenticated;
GRANT ALL ON public.assessment_competency_scores TO service_role;

ALTER TABLE public.assessment_competency_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View scores of accessible evaluations"
ON public.assessment_competency_scores FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = evaluation_id));

CREATE POLICY "Manage scores of accessible evaluations"
ON public.assessment_competency_scores FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = evaluation_id))
WITH CHECK (EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = evaluation_id));

CREATE TRIGGER trg_assessment_competency_scores_updated_at
BEFORE UPDATE ON public.assessment_competency_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.assessment_competencies (name, subtitle, behavior, sort_order)
VALUES
('Creatividad', 'Experiencia WOW', 'Capacidad de generar nuevas ideas y conceptos a partir de asociaciones entre ideas y conceptos conocidos con el objetivo de dar nuevas soluciones a los retos, problemas y situaciones a afrontar. También se conoce como pensamiento divergente, asociativo o lateral.', 1),
('Trabajo en equipo y empatía', 'Empatía y colaboración', 'Participar activa y receptivamente en el equipo para la consecución de objetivos comunes. Transmitir información, compartir conocimientos y experiencia. Actuar con respeto frente a los compañeros. Estar disponible para ayudar y pedir ayuda. Anteponer las decisiones del equipo a las propias.', 2),
('Comunicación', 'Comunicación y análisis', 'Habilidad para comprender situaciones problema y plantear soluciones adecuadas. Compartir ideas, pensamientos, conocimientos e información de la forma que mejor se relaciona con el contexto.', 3);

INSERT INTO public.assessment_competency_scores (evaluation_id, competency_id, score)
SELECT e.id, c.id,
  CASE c.sort_order
    WHEN 1 THEN e.score_creatividad
    WHEN 2 THEN e.score_trabajo_equipo
    WHEN 3 THEN e.score_pensamiento_analitico
  END
FROM public.assessment_evaluations e
CROSS JOIN public.assessment_competencies c
WHERE c.sort_order IN (1,2,3)
  AND CASE c.sort_order
    WHEN 1 THEN e.score_creatividad
    WHEN 2 THEN e.score_trabajo_equipo
    WHEN 3 THEN e.score_pensamiento_analitico
  END IS NOT NULL
ON CONFLICT DO NOTHING;