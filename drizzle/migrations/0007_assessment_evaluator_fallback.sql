DROP POLICY IF EXISTS "Evaluators update own competency scores" ON public.assessment_competency_scores;
CREATE POLICY "Evaluators update own competency scores" ON public.assessment_competency_scores
FOR UPDATE TO authenticated
USING (evaluator_user_id = auth.uid() OR (evaluator_user_id IS NULL AND EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = evaluation_id AND e.evaluator_user_id = auth.uid())))
WITH CHECK (evaluator_user_id = auth.uid() OR (evaluator_user_id IS NULL AND EXISTS (SELECT 1 FROM public.assessment_evaluations e WHERE e.id = evaluation_id AND e.evaluator_user_id = auth.uid())));