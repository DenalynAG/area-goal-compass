CREATE TABLE public.newsletter_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES public.newsletter_posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  avatar TEXT DEFAULT '',
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.newsletter_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read comments
CREATE POLICY "Authenticated read newsletter_comments" ON public.newsletter_comments
FOR SELECT TO authenticated
USING (true);

-- Users can insert their own comments
CREATE POLICY "Users insert own newsletter_comments" ON public.newsletter_comments
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users delete own newsletter_comments" ON public.newsletter_comments
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Super admin full access
CREATE POLICY "Super admin full newsletter_comments" ON public.newsletter_comments
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));