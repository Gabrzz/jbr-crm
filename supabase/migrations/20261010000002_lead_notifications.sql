-- Function to handle lead assignment notification
CREATE OR REPLACE FUNCTION public.handle_lead_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se houver um corretor atribuído
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
    INSERT INTO public.notifications (user_id, message)
    VALUES (NEW.assigned_to, 'Um novo lead foi direcionado para você: ' || NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on the leads table
DROP TRIGGER IF EXISTS trg_notify_lead_assignment ON public.leads;
CREATE TRIGGER trg_notify_lead_assignment
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.handle_lead_notification();

-- Enable Realtime for the notifications table (if not already enabled)
-- Note: This requires the publication to exist, which it typically does in Supabase.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- In case supabase_realtime publication doesn't exist yet
    NULL;
END $$;
