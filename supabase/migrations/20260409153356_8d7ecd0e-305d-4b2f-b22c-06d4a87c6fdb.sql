ALTER TABLE public.access_control ADD COLUMN has_activity boolean DEFAULT false;
ALTER TABLE public.access_control ADD COLUMN arl_document_url text DEFAULT null;