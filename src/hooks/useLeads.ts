import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];
type LeadStage = Database['public']['Enums']['lead_stage'];

export function useLeads() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['leads', user?.id, role],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('is_archived', false)
        // Corretor não enxerga lead que foi pro CCA na tela inicial
        .is('is_cca_lead', false)
        .order('created_at', { ascending: false });

      // Se for apenas um corretor ou assistente, só ve os seus leads
      // CCA não acessa essa query na rota de funil de vendas, pois foi restrito em App.tsx
      if (role && role !== 'admin' && role !== 'gerente') {
        if (!user) return [];
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && !!role,
  });
}

// ============== HOOKS CCA ==============

export function useCCALeads() {
  const { user, role } = useAuth();
  
  return useQuery({
    queryKey: ['cca_leads', user?.id, role],
    queryFn: async () => {
      const query = supabase
        .from('leads')
        .select('*')
        .eq('is_archived', false)
        .eq('is_cca_lead', true)
        .order('moved_to_cca_at', { ascending: false, nullsFirst: false });

      // Se a pessoa for do CCA e usar o filtro "meus clientes", deixaremos pro React tratar
      // O admin vai ver a lista inteira sempre e o painel terá a lógica de divisão
      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && !!role,
  });
}

export function useTakeCCALead() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { data, error } = await supabase
        .from('leads')
        .update({ cca_assigned_to: user.id })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cca_leads'] }),
  });
}

export function useSendToCCA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ 
          is_cca_lead: true, 
          moved_to_cca_at: new Date().toISOString(),
          // CCA pode reiniciar a contagem do stage se for desejado
          // stage: 'novo_lead' 
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Chama notificação para o time CCA
      await supabase.from('notifications').insert([{
        user_id: 'admin', // Aqui idealmente o trigger do banco de dados distribuiria notificacoes,
        message: `Lead ${data.name} (OS: ${data.service_order_number}) acabou de chegar no CCA.`,
        lead_id: id
      }]);
      
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['cca_leads'] });
    },
  });
}

// ===================================

export function useLead(id: string) {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['leads', id, user?.id, role],
    queryFn: async () => {
      let query = supabase.from('leads').select('*').eq('id', id);
      
      if (role && role !== 'admin' && role !== 'gerente' && role !== 'cca') {
        if (!user) throw new Error('Unauthenticated');
        // Para corretores normais
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query.single();
      if (error) throw error;
      return data as Lead;
    },
    enabled: !!id && !!user && !!role,
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInsert) => {
      const { data, error } = await supabase.from('leads').insert(lead).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: LeadUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ ...updates, last_activity_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}

export function useUpdateLeadStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: LeadStage }) => {
      const { data, error } = await supabase
        .from('leads')
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: ['leads'] });

      const previousLeadsQueries = qc.getQueriesData<Lead[]>({ queryKey: ['leads'] });

      qc.setQueriesData<Lead[]>({ queryKey: ['leads'] }, (oldData) => {
        if (!oldData) return oldData;
        return oldData.map((lead) => 
          lead.id === id ? { ...lead, stage } : lead
        );
      });

      return { previousLeadsQueries };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeadsQueries) {
        context.previousLeadsQueries.forEach(([queryKey, oldData]) => {
          qc.setQueryData(queryKey, oldData);
        });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['leads'] });
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  });
}
