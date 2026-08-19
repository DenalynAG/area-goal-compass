CREATE TABLE public.access_status_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_id uuid NOT NULL REFERENCES public.access_control(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid,
  changed_by_name text,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_status_history_access_id ON public.access_status_history(access_id);

GRANT SELECT, INSERT ON public.access_status_history TO authenticated;
GRANT ALL ON public.access_status_history TO service_role;

ALTER TABLE public.access_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view access status history"
ON public.access_status_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert access status history"
ON public.access_status_history FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);