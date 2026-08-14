CREATE TABLE public.it_asset_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collaborator_name TEXT NOT NULL,
  position_name TEXT,
  asset_name TEXT NOT NULL,
  serial_number TEXT,
  osh_code TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.it_asset_inventory TO authenticated;
GRANT ALL ON public.it_asset_inventory TO service_role;

ALTER TABLE public.it_asset_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view it asset inventory"
ON public.it_asset_inventory FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert it asset inventory"
ON public.it_asset_inventory FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update it asset inventory"
ON public.it_asset_inventory FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated can delete it asset inventory"
ON public.it_asset_inventory FOR DELETE TO authenticated USING (true);

CREATE TRIGGER it_asset_inventory_updated_at
BEFORE UPDATE ON public.it_asset_inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();