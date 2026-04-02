-- Updating delete policy for leads
-- Allows deletion by admin, gerente, or the broker assigned to the lead
DROP POLICY IF EXISTS "Leads delete policy" ON public.leads;

CREATE POLICY "Leads delete policy" ON public.leads
  FOR DELETE TO authenticated USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'gerente')
    OR assigned_to = auth.uid()
  );
