
-- Fix overly permissive insert policies
DROP POLICY "System can insert notifications" ON public.notifications;
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY "Lead history insertable by authenticated" ON public.lead_history;
CREATE POLICY "Lead history insertable by authenticated" ON public.lead_history
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
