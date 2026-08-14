CREATE TABLE public.recurring_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  nit TEXT,
  contact_name TEXT,
  full_name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  arl TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_providers TO authenticated;
GRANT ALL ON public.recurring_providers TO service_role;

ALTER TABLE public.recurring_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view recurring providers"
ON public.recurring_providers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert recurring providers"
ON public.recurring_providers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update recurring providers"
ON public.recurring_providers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete recurring providers"
ON public.recurring_providers FOR DELETE TO authenticated USING (true);

CREATE TRIGGER recurring_providers_updated_at
BEFORE UPDATE ON public.recurring_providers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();