-- Cria rotina de varredura para CCA abandonados
CREATE OR REPLACE FUNCTION public.assign_abandoned_cca_leads()
RETURNS void AS $$
DECLARE
  rec RECORD;
  v_assigned_user_id UUID;
BEGIN
  -- Percorre leads CCA (is_cca_lead = true) que estao sem responsavel ha mais de 1 hora
  FOR rec IN 
    SELECT id FROM public.leads 
    WHERE is_cca_lead = true 
      AND cca_assigned_to IS NULL 
      AND moved_to_cca_at < (NOW() - INTERVAL '1 hour')
  LOOP
    -- Achar o CCA ativo com menos leads para balanceamento
    SELECT p.user_id INTO v_assigned_user_id
    FROM public.profiles p
    JOIN public.user_roles r ON p.user_id = r.user_id
    WHERE r.role = 'cca' AND p.active = true AND p.is_cca_active = true
    ORDER BY (
      SELECT COUNT(*) FROM public.leads l WHERE l.cca_assigned_to = p.user_id
    ) ASC, p.created_at ASC
    LIMIT 1;

    -- Aplica caso tenha encontrado alguem
    IF v_assigned_user_id IS NOT NULL THEN
      UPDATE public.leads 
      SET cca_assigned_to = v_assigned_user_id 
      WHERE id = rec.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se a extensao pg_cron estiver habilitada, cadastra o job a cada 15 min. (Em Supabase o schema é 'cron')
DO $$
BEGIN
  IF EXISTS(SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Desagenda caso já exista para recriar
    EXECUTE 'SELECT cron.unschedule(''assign_abandoned_cca_job'')';
    -- Agenda a cada 15 minutos
    EXECUTE 'SELECT cron.schedule(''assign_abandoned_cca_job'', ''*/15 * * * *'', $sql$SELECT public.assign_abandoned_cca_leads()$sql$)';
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Pode falhar localmente ou se o usuário nao tiver permissão de cron. Ignora.
END $$;
