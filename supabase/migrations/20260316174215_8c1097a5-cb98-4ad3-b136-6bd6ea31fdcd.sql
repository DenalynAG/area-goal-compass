
-- Recognition posts table for OSH People program
CREATE TABLE public.recognition_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  nominee_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  nominated_by UUID REFERENCES public.profiles(id),
  message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.recognition_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated read recognition_posts" ON public.recognition_posts
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

-- Users can insert their own nominations
CREATE POLICY "Users insert own recognition_posts" ON public.recognition_posts
  FOR INSERT TO authenticated WITH CHECK (nominated_by = auth.uid());

-- Super admin full access
CREATE POLICY "Super admin full recognition_posts" ON public.recognition_posts
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Admin area can manage recognition posts for their area members
CREATE POLICY "Admin area manages recognition_posts" ON public.recognition_posts
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin_area'::app_role) AND
    EXISTS (
      SELECT 1 FROM memberships m1, memberships m2
      WHERE m1.user_id = auth.uid()
        AND m2.user_id = recognition_posts.nominee_user_id
        AND m1.area_id = m2.area_id
    )
  );

-- Seed menu_permissions for /osh-people
INSERT INTO public.menu_permissions (menu_key, role, is_visible)
SELECT '/osh-people', r.role, true
FROM unnest(enum_range(NULL::app_role)) AS r(role)
ON CONFLICT DO NOTHING;
