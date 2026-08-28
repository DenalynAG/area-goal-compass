UPDATE public.assessment_evaluations e
SET profession = c.profession
FROM public.assessment_candidates c
WHERE e.candidate_id = c.id
  AND e.profession IS NULL
  AND c.profession IS NOT NULL;