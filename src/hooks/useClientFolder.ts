import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRef, useCallback } from 'react';

export interface ClientFolderData {
  id?: string;
  lead_id: string;
  folder_status?: 'draft' | 'completed';
  folder_created_at?: string | null;

  // Dados Iniciais
  property_value?: number | null;
  financing_type?: string | null;
  responsible_name?: string | null;
  contact?: string | null;

  // Proponente
  proponent_name?: string | null;
  proponent_cpf?: string | null;
  proponent_pis?: string | null;

  // Participante
  has_participant?: boolean;
  participant_name?: string | null;
  participant_cpf?: string | null;
  participant_pis?: string | null;

  // FGTS
  fgts_three_years?: boolean | null;
  use_fgts?: boolean | null;
  fgts_value?: number | null;

  // Estado Civil
  proponent_marital_status?: string | null;
  participant_marital_status?: string | null;

  // Grau de Instrução
  proponent_education?: string | null;
  participant_education?: string | null;

  // Contatos
  phone_mobile?: string | null;
  phone_residential?: string | null;
  phone_message?: string | null;
  email_proponent?: string | null;
  email_participant?: string | null;

  // Rendas
  income_formal_pro_job?: string | null;
  income_formal_pro_start?: string | null;
  income_formal_pro_value?: number | null;

  income_informal_pro_job?: string | null;
  income_informal_pro_start?: string | null;
  income_informal_pro_value?: number | null;

  income_formal_par_job?: string | null;
  income_formal_par_start?: string | null;
  income_formal_par_value?: number | null;

  income_informal_par_job?: string | null;
  income_informal_par_start?: string | null;
  income_informal_par_value?: number | null;

  // Imóveis
  proponent_property_type?: string | null;
  participant_property_type?: string | null;

  // Dados Bancários
  bank_account_holder?: string | null;
  bank_agency?: string | null;
  bank_account_number?: string | null;

  // Dependentes
  has_dependents?: boolean;
  dependents_count?: number;

  // Documentos (paths no Storage)
  doc_cnh?: string | null;
  doc_bank_slip?: string | null;
  doc_birth_cert?: string | null;
  doc_income_tax_receipt?: string | null;
  doc_income_tax_full?: string | null;
  doc_work_card?: string | null;
  doc_payslip?: string | null;
  doc_caixa_simulator?: string | null;
}

// === QUERY: buscar a pasta pelo lead_id ===
export function useClientFolder(leadId: string) {
  return useQuery({
    queryKey: ['client_folder', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_folders')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();
      if (error) throw error;
      return data as ClientFolderData | null;
    },
    enabled: !!leadId,
  });
}

// === MUTATION: upsert (cria ou atualiza a pasta) ===
export function useUpsertClientFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: ClientFolderData) => {
      const { lead_id, ...rest } = data;
      const { data: result, error } = await supabase
        .from('client_folders')
        .upsert({ lead_id, ...rest }, { onConflict: 'lead_id' })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['client_folder', result.lead_id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// === HOOK DEBOUNCED AUTOSAVE ===
// Chama automaticamente o upsert após 1.5s de inatividade
export function useDebouncedAutosave(leadId: string) {
  const upsert = useUpsertClientFolder();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback((data: Partial<ClientFolderData>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      upsert.mutate({ lead_id: leadId, ...data });
    }, 1500);
  }, [leadId, upsert]);

  return { save, isSaving: upsert.isPending };
}

// === MUTATION: enviar pasta para N8N e limpar storage ===
export function useSubmitClientFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ folder, signedUrls }: { folder: ClientFolderData; signedUrls: Record<string, string> }) => {
      // 1. Montar payload
      const payload = { ...folder, documents: signedUrls };

      // 2. Chamar webhook N8N
      const response = await fetch('https://n8n-comercial.aurabs.com.br/webhook/jbr-criar-pasta-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar para o servidor. Verifique com o suporte.');
      }

      // 3. Janela de segurança de 30 segundos para o N8N baixar os arquivos
      await new Promise(resolve => setTimeout(resolve, 30000));

      // 4. Deletar arquivos do Storage
      const docFields: (keyof ClientFolderData)[] = [
        'doc_cnh','doc_bank_slip','doc_birth_cert','doc_income_tax_receipt',
        'doc_income_tax_full','doc_work_card','doc_payslip','doc_caixa_simulator'
      ];
      const pathsToDelete = docFields
        .map(f => folder[f] as string | null)
        .filter(Boolean) as string[];

      if (pathsToDelete.length > 0) {
        await supabase.storage.from('client_documents').remove(pathsToDelete);
      }

      // 5. Atualizar status da pasta e apagar referências de arquivo no BD
      const clearDocs = Object.fromEntries(docFields.map(f => [f, null]));
      await supabase
        .from('client_folders')
        .update({ 
          folder_status: 'completed', 
          folder_created_at: new Date().toISOString(),
          ...clearDocs
        })
        .eq('lead_id', folder.lead_id);

      // 6. Atualizar folder_status no lead
      await supabase
        .from('leads')
        .update({ folder_status: 'completed' })
        .eq('id', folder.lead_id);

      return { success: true };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['client_folder', variables.folder.lead_id] });
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

// === MUTATION: baixar pasta do cliente ===
export function useDownloadClientFolder() {
  return useMutation({
    mutationFn: async (leadId: string) => {
      const response = await fetch('https://n8n-comercial.aurabs.com.br/webhook/jbr-baixar-pasta-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      });

      if (!response.ok) throw new Error('Não foi possível recuperar a pasta. Verifique com o suporte.');

      const data = await response.json();
      // N8N deve retornar { url: "https://..." } com o link do ZIP
      if (data?.url) {
        window.open(data.url, '_blank');
      } else {
        throw new Error('O servidor não retornou um link válido.');
      }

      return data;
    },
  });
}

// === HOOK: Upload documento para o storage ===
export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, field, file }: { leadId: string; field: string; file: File }) => {
      const ext = file.name.split('.').pop();
      const path = `${leadId}/${field}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('client_documents')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      // Salvar path no banco
      const { error: updateError } = await supabase
        .from('client_folders')
        .update({ [field]: path, folder_status: 'draft' })
        .eq('lead_id', leadId);
      if (updateError) throw updateError;

      return path;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['client_folder', vars.leadId] });
    },
  });
}
