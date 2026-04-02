-- ===================================================
-- TABELA: client_folders
-- Armazena todos os dados da Ficha de Entrevista do Cliente
-- Conectada 1:1 com a tabela leads
-- ===================================================

CREATE TABLE IF NOT EXISTS public.client_folders (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id                     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW(),

  -- Status da pasta
  folder_status               TEXT DEFAULT 'draft' CHECK (folder_status IN ('draft', 'completed')),
  folder_created_at           TIMESTAMPTZ,

  -- Dados Iniciais
  property_value              NUMERIC(15,2),
  financing_type              TEXT,  -- Tipo de financiamento/modalidade
  responsible_name            TEXT,
  contact                     TEXT,

  -- Dados Pessoais - Proponente
  proponent_name              TEXT,
  proponent_cpf               TEXT,
  proponent_pis               TEXT,

  -- Dados Pessoais - Participante
  has_participant             BOOLEAN DEFAULT FALSE,
  participant_name            TEXT,
  participant_cpf             TEXT,
  participant_pis             TEXT,

  -- FGTS
  fgts_three_years            BOOLEAN,
  use_fgts                    BOOLEAN,
  fgts_value                  NUMERIC(15,2),

  -- Estado Civil (1-6 conforme tabela)
  proponent_marital_status    TEXT,
  participant_marital_status  TEXT,

  -- Grau de Instrução (0-7 conforme tabela)
  proponent_education         TEXT,
  participant_education       TEXT,

  -- Contatos
  phone_mobile                TEXT,
  phone_residential           TEXT,
  phone_message               TEXT,
  email_proponent             TEXT,
  email_participant           TEXT,

  -- Rendas - Comprovada Proponente
  income_formal_pro_job       TEXT,
  income_formal_pro_start     DATE,
  income_formal_pro_value     NUMERIC(15,2),

  -- Rendas - Informal Proponente
  income_informal_pro_job     TEXT,
  income_informal_pro_start   DATE,
  income_informal_pro_value   NUMERIC(15,2),

  -- Rendas - Comprovada Participante
  income_formal_par_job       TEXT,
  income_formal_par_start     DATE,
  income_formal_par_value     NUMERIC(15,2),

  -- Rendas - Informal Participante
  income_informal_par_job     TEXT,
  income_informal_par_start   DATE,
  income_informal_par_value   NUMERIC(15,2),

  -- Imóveis
  proponent_property_type     TEXT,   -- 1-8 conforme tabela
  participant_property_type   TEXT,

  -- Dados Bancários
  bank_account_holder         TEXT,   -- 'proponent' | 'participant'
  bank_agency                 TEXT,
  bank_account_number         TEXT,

  -- Dependentes
  has_dependents              BOOLEAN DEFAULT FALSE,
  dependents_count            INTEGER DEFAULT 0,

  -- Documentos - paths no Storage (null = não enviado ainda)
  doc_cnh                     TEXT,
  doc_bank_slip               TEXT,
  doc_birth_cert              TEXT,
  doc_income_tax_receipt      TEXT,
  doc_income_tax_full         TEXT,
  doc_work_card               TEXT,
  doc_payslip                 TEXT,
  doc_caixa_simulator         TEXT
);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_client_folder_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_client_folder_updated_at
  BEFORE UPDATE ON public.client_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_client_folder_timestamp();

-- Index para busca por lead_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_folders_lead_id ON public.client_folders(lead_id);

-- ===================================================
-- RLS Policies
-- ===================================================

ALTER TABLE public.client_folders ENABLE ROW LEVEL SECURITY;

-- Admins e gerentes enxergam tudo
CREATE POLICY "admin_gerente_full_access_folders"
  ON public.client_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'gerente')
    )
  );

-- Corretores veem apenas pastas cujo lead lhes é atribuído
CREATE POLICY "corretor_see_own_folders"
  ON public.client_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = client_folders.lead_id
        AND l.assigned_to = auth.uid()
    )
  );

-- CCA vê qualquer pasta de lead que seja cca_lead
CREATE POLICY "cca_see_cca_folders"
  ON public.client_folders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'cca'
    )
    AND
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = client_folders.lead_id AND l.is_cca_lead = TRUE
    )
  );

-- ===================================================
-- Coluna folder_status na tabela leads (para bloqueio de UI)
-- ===================================================
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS folder_status TEXT DEFAULT 'none'
  CHECK (folder_status IN ('none', 'draft', 'completed'));

-- ===================================================
-- Storage Bucket: client_documents
-- ===================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client_documents',
  'client_documents',
  FALSE,  -- Privado - acesso via signed URLs
  52428800, -- 50MB por arquivo
  ARRAY['application/pdf','image/jpeg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas do Storage
CREATE POLICY "authenticated_upload_documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'client_documents');

CREATE POLICY "authenticated_read_documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'client_documents');

CREATE POLICY "authenticated_delete_documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'client_documents');
