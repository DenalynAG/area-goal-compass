
-- Add birthday column to profiles for the newsletter portal
ALTER TABLE public.profiles ADD COLUMN birthday date NULL;

-- Create a table for newsletter posts (recognitions, general news)
CREATE TABLE public.newsletter_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type text NOT NULL CHECK (type IN ('reconocimiento', 'cumpleanos', 'general')),
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text NULL,
  target_user_id uuid NULL,
  created_by uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read newsletter" ON public.newsletter_posts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Super admin manages newsletter" ON public.newsletter_posts
  FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin area manages newsletter" ON public.newsletter_posts
  FOR ALL USING (has_role(auth.uid(), 'admin_area'::app_role));
