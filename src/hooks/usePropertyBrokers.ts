/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type BrokerProfile = Database['public']['Tables']['profiles']['Row'] & {
  phone?: string;
  bio?: string;
};

// Fetch all the brokers available in the system
export function useBrokers() {
  return useQuery({
    queryKey: ['brokers'],
    queryFn: async () => {
      // Retorna admins, gerentes, corretores. Todos que estão na profiles se quiser.
      // Opcional: join com user_roles, mas se active = true basta.
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('active', true);
        
      if (error) throw error;
      return data as BrokerProfile[];
    },
  });
}

// Fetch the assigned broker for a specific WP property ID
export function usePropertyBroker(propertyId: number | undefined) {
  return useQuery({
    queryKey: ['property_broker', propertyId],
    queryFn: async () => {
      if (!propertyId) return null;
      
      // Cast supabase to any specifically for this table because it's not in the generated types yet
      const { data, error } = await (supabase as any)
        .from('property_brokers')
        .select(`
          broker_id,
          profiles (*)
        `)
        .eq('property_id', propertyId)
        .maybeSingle();
        
      if (error) {
        console.error('Error fetching property broker relation', error);
        return null;
      }
      
      return (data?.profiles as BrokerProfile | undefined) || null;
    },
    enabled: !!propertyId,
  });
}

// Mutate function to assign a broker to a property
export function useAssignPropertyBroker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ propertyId, brokerId }: { propertyId: number; brokerId: string | null }) => {
      if (!brokerId) {
        // Unassign by deleting the entry
        // Cast supabase to any
        const { error } = await (supabase as any)
          .from('property_brokers')
          .delete()
          .eq('property_id', propertyId);
        if (error) throw error;
        return;
      }

      // Upsert assignment
      // Cast supabase to any
      const { error } = await (supabase as any)
        .from('property_brokers')
        .upsert({
          property_id: propertyId,
          broker_id: brokerId,
        }, { onConflict: 'property_id' });
        
      if (error) throw error;
    },
    onSuccess: (_, { propertyId, brokerId }) => {
      qc.invalidateQueries({ queryKey: ['property_broker', propertyId] });
      if (brokerId) {
        qc.invalidateQueries({ queryKey: ['my_assigned_properties', brokerId] });
        qc.invalidateQueries({ queryKey: ['broker_stats', brokerId] });
      }
      qc.invalidateQueries({ queryKey: ['my_assigned_properties'] });
      qc.invalidateQueries({ queryKey: ['broker_stats'] });
    },
  });
}

// Fetch a broker full profile (for the popup card view)
export function useBrokerStats(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['broker_stats', brokerId],
    queryFn: async () => {
      if (!brokerId) return null;
      // Conta leads (assuming `assigned_to` links to the profile ID)
      const { count: leadCount, error: leadError } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', brokerId)
        .eq('is_archived', false);

      if (leadError) console.error(leadError);

      // Conta imóveis associados a esse corretor
      // Properties count (actual assigned properties)
      const { data: assignments, error: propertiesError } = await (supabase as any)
        .from('property_brokers')
        .select('property_id')
        .eq('broker_id', brokerId);

      if (propertiesError) throw propertiesError;

      return {
        leadsAssigned: leadCount || 0,
        propertiesAssigned: assignments?.length || 0,
        propertyIds: assignments?.map((a: any) => a.property_id) || []
      };
    },
    enabled: !!brokerId,
  });
}

// Fetch all property IDs assigned to a specific broker
export function useMyAssignedProperties(brokerId: string | undefined) {
  return useQuery({
    queryKey: ['my_assigned_properties', brokerId],
    queryFn: async () => {
      if (!brokerId) return [];
      
      // Cast supabase to any
      const { data, error } = await (supabase as any)
        .from('property_brokers')
        .select('property_id')
        .eq('broker_id', brokerId);

      if (error) {
        console.error('Error fetching assigned properties', error);
        return [];
      }

      return data.map((row: { property_id: number }) => row.property_id);
    },
    enabled: !!brokerId,
  });
}

// Fetch all property assignments for all brokers (useful for dashboard stats)
export function useAllAssignments() {
  return useQuery({
    queryKey: ['property_assignments_all'],
    queryFn: async () => {
      // Cast supabase to any
      const { data, error } = await (supabase as any)
        .from('property_brokers')
        .select('property_id, broker_id');

      if (error) {
        console.error('Error fetching all assignments', error);
        return [];
      }

      return data as { property_id: number; broker_id: string }[];
    },
  });
}
