-- Criação da sequence para a Ordem de Serviço dos Leads
CREATE SEQUENCE IF NOT EXISTS lead_service_order_seq START 1;

-- Função que gera a OS (OS-0001, OS-0002, etc.) na inserção
CREATE OR REPLACE FUNCTION public.generate_lead_os()
RETURNS TRIGGER AS $$
BEGIN
  -- Só gera se o lead ainda não possuir OS e se o ID não for explicitamente preenchido com custom rules
  IF NEW.service_order_number IS NULL THEN
    NEW.service_order_number := 'OS-' || LPAD(NEXTVAL('lead_service_order_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparada ANTES da inserção. Ela rodará antes ou junto da 'trg_assign_lead_round_robin'
DROP TRIGGER IF EXISTS trg_generate_lead_os ON public.leads;
CREATE TRIGGER trg_generate_lead_os
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.generate_lead_os();
