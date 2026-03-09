
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'comment',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users read own notifications" ON public.notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can insert notifications (for others)
CREATE POLICY "Authenticated insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (true);

-- Users can delete their own notifications
CREATE POLICY "Users delete own notifications" ON public.notifications
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Super admin full access
CREATE POLICY "Super admin full notifications" ON public.notifications
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));
