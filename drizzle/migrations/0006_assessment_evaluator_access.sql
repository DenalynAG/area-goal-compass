CREATE OR REPLACE FUNCTION public.is_assessment_evaluator(_evaluation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = _evaluation_id AND e.evaluator_user_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.assessment_competency_scores s WHERE s.evaluation_id = _evaluation_id AND s.evaluator_user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_assessment_manager(_evaluation_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'super_admin') OR public.is_hr(_user_id)
      OR EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = _evaluation_id AND e.created_by = _user_id)
$$;

CREATE POLICY "Evaluators view assigned assessments" ON public.assessment_evaluations
FOR SELECT TO authenticated USING (public.is_assessment_evaluator(id, auth.uid()));

CREATE POLICY "Evaluators update assigned assessments" ON public.assessment_evaluations
FOR UPDATE TO authenticated USING (public.is_assessment_evaluator(id, auth.uid()))
WITH CHECK (public.is_assessment_evaluator(id, auth.uid()));

CREATE POLICY "Evaluators view assigned candidates" ON public.assessment_candidates
FOR SELECT TO authenticated USING (
  evaluator_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.assessment_evaluations e WHERE e.candidate_id = assessment_candidates.id AND public.is_assessment_evaluator(e.id, auth.uid())
  )
);

DROP POLICY IF EXISTS "Manage scores of accessible evaluations" ON public.assessment_competency_scores;

CREATE POLICY "Managers manage scores" ON public.assessment_competency_scores
FOR ALL TO authenticated
USING (public.is_assessment_manager(evaluation_id, auth.uid()))
WITH CHECK (public.is_assessment_manager(evaluation_id, auth.uid()));

CREATE POLICY "Evaluators update own competency scores" ON public.assessment_competency_scores
FOR UPDATE TO authenticated
USING (evaluator_user_id = auth.uid())
WITH CHECK (evaluator_user_id = auth.uid());

CREATE POLICY "Evaluators view own scores" ON public.assessment_competency_scores
FOR SELECT TO authenticated USING (public.is_assessment_evaluator(evaluation_id, auth.uid()));