CREATE TABLE public.provider_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL,
  provider_name text NOT NULL,
  document_id text,
  asset_type text NOT NULL,
  brand text,
  serial_number text,
  quantity integer NOT NULL DEFAULT 1,
  entry_datetime timestamp with time zone NOT NULL DEFAULT now(),
  exit_datetime timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_assets TO authenticated;
GRANT ALL ON public.provider_assets TO service_role;

ALTER TABLE public.provider_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view provider assets"
ON public.provider_assets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert provider assets"
ON public.provider_assets FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update provider assets"
ON public.provider_assets FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Creators admins can delete provider assets"
ON public.provider_assets FOR DELETE TO authenticated
USING (created_by = auth.uid() OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_area'));

CREATE TRIGGER provider_assets_updated_at
BEFORE UPDATE ON public.provider_assets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();