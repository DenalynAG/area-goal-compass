
DROP POLICY "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications" ON public.notifications
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());
