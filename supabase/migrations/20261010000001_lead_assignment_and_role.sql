-- 1. Add 'cca' role to the app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'cca';

-- 2. Create the round robin assignment function
CREATE OR REPLACE FUNCTION public.assign_lead_round_robin()
RETURNS TRIGGER AS $$
DECLARE
  v_assigned_user_id UUID;
BEGIN
  -- Se o lead já vier com corretor, ignoramos
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Achar o corretor para receber o lead (Lógica Round Robin Simples: Quem tem menos leads associados hoje)
  -- Pega APENAS corretores ATIVOS.
  SELECT p.user_id INTO v_assigned_user_id
  FROM public.profiles p
  JOIN public.user_roles r ON p.user_id = r.user_id
  WHERE r.role = 'corretor' AND p.active = true
  ORDER BY (
    SELECT COUNT(*) FROM public.leads l WHERE l.assigned_to = p.user_id
  ) ASC, p.created_at ASC
  LIMIT 1;

  -- Se encontrou, atribui.
  IF v_assigned_user_id IS NOT NULL THEN
    NEW.assigned_to := v_assigned_user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trg_assign_lead_round_robin ON public.leads;
CREATE TRIGGER trg_assign_lead_round_robin
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.assign_lead_round_robin();
