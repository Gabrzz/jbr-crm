-- Add lead_id to notifications for actionable alerts
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE;

-- Updated trigger function to include lead_id
CREATE OR REPLACE FUNCTION public.handle_lead_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Só notifica se houver um corretor atribuído
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)) THEN
    INSERT INTO public.notifications (user_id, message, lead_id)
    VALUES (NEW.assigned_to, 'Um novo lead foi direcionado para você: ' || NEW.name, NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
