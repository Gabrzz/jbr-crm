import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';
import { KanbanBoard } from '@/components/KanbanBoard';
import { LeadForm } from '@/components/LeadForm';
import { useLeads, useCreateLead, useUpdateLead } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Plus, Users, Target, TrendingUp, Zap, Filter, LayoutGrid } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Tables']['user_roles']['Row'];


export default function Leads() {
  const [formOpen, setFormOpen] = useState(false);
  const { data: leads = [], isLoading } = useLeads();
  const { data: profilesList = [] } = useProfiles();
  const { user } = useAuth();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();

  const { data: userRoles = [] } = useQuery({
    queryKey: ['user_roles_kanban'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
  });

  const filteredStaff = useMemo(() => {
    return (profilesList as Profile[]).filter((p: Profile) => {
      const userRole = (userRoles as UserRole[]).find((r: UserRole) => r.user_id === p.user_id);
      if (!userRole) return false;
      return userRole.role === 'admin' || userRole.role === 'corretor';
    });
  }, [profilesList, userRoles]);


  const profilesMap = useMemo(() => {
    const map: Record<string, string> = {};
    profilesList.forEach((p: Profile) => {
      map[p.user_id] = p.name || p.email;
    });

    return map;
  }, [profilesList]);

  const filteredProfilesMap = useMemo(() => {
    const map: Record<string, string> = {};
    filteredStaff.forEach((p: Profile) => {
      map[p.user_id] = p.name || p.email;
    });

    return map;
  }, [filteredStaff]);

  const handleCreate = (data: LeadInsert) => {
    createLead.mutate({ ...data, assigned_to: data.assigned_to || user?.id });
  };

  const handleReassign = (leadId: string, userId: string) => {
    updateLead.mutate({ id: leadId, assigned_to: userId });
  };

  const [filterOrigin, setFilterOrigin] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterFolder, setFilterFolder] = useState<string>('all');

  const origins = useMemo(() => {
    const originSet = new Set<string>();
    leads.forEach(l => l.origin && originSet.add(l.origin));
    return Array.from(originSet).sort();
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (filterOrigin !== 'all' && lead.origin !== filterOrigin) return false;
      if (filterAssignee !== 'all' && lead.assigned_to !== filterAssignee) return false;
      if (filterFolder !== 'all') {
        const isCompleted = lead.folder_status === 'completed';
        if (filterFolder === 'completed' && !isCompleted) return false;
        if (filterFolder === 'pending' && isCompleted) return false;
      }
      return true;
    });
  }, [leads, filterOrigin, filterAssignee, filterFolder]);

  const totalValue = filteredLeads.reduce((acc, lead) => acc + (Number(lead.expected_value) || 0), 0);

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in px-2 md:px-6 py-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2lx bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-4xl font-heading font-black tracking-tight text-foreground uppercase italic leading-none">
                Funil <span className="text-muted-foreground/30 font-light not-italic">Vendas</span>
              </h1>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 ml-1">
              <span className="flex items-center gap-1.5"><Users className="h-3 w-3" /> {filteredLeads.length} Leads Ativos</span>
              <span className="h-3 w-[1px] bg-border/40" />
              <span className="flex items-center gap-1.5 text-primary"><TrendingUp className="h-3 w-3" /> R$ {totalValue.toLocaleString('pt-BR')} em Negócios</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center bg-black/5 dark:bg-white/5 border border-white/10 rounded-2xl p-1 gap-1">
               <button className="p-2.5 rounded-xl bg-white dark:bg-zinc-800 shadow-sm text-primary transition-all">
                  <LayoutGrid className="h-4 w-4" />
               </button>
               <Popover>
                 <PopoverTrigger asChild>
                   <button className={cn(
                     "p-2.5 rounded-xl transition-all relative",
                     (filterOrigin !== 'all' || filterAssignee !== 'all' || filterFolder !== 'all') 
                       ? "bg-primary/20 text-primary" 
                       : "text-muted-foreground/40 hover:text-white"
                   )}>
                     <Filter className="h-4 w-4" />
                     {(filterOrigin !== 'all' || filterAssignee !== 'all' || filterFolder !== 'all') && (
                       <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
                     )}
                   </button>
                 </PopoverTrigger>
                 <PopoverContent className="w-80 p-4 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-border/40 dark:border-white/10 rounded-2xl shadow-2xl glass-panel" align="end" sideOffset={10}>
                   <div className="space-y-4">
                     <div className="space-y-1 pb-2 border-b border-border/40 dark:border-white/5">
                       <h4 className="font-heading font-black text-sm uppercase tracking-widest text-foreground">Filtros Avançados</h4>
                       <p className="text-[10px] text-muted-foreground">Refine sua visualização de leads ativos</p>
                     </div>
                     
                     <div className="space-y-3">
                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Origem</Label>
                         <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                           <SelectTrigger className="w-full text-xs h-9 rounded-xl border border-border/40 dark:border-white/10 dark:bg-stone-950/50 hover:border-primary/50 transition-colors">
                             <SelectValue placeholder="Todas as origens" />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl border-border/40 dark:border-white/10 backdrop-blur-2xl glass-panel">
                             <SelectItem value="all" className="text-xs">Todas as origens</SelectItem>
                             {origins.map(origin => (
                               <SelectItem key={origin} value={origin} className="text-xs">{origin}</SelectItem>
                             ))}
                           </SelectContent>
                         </Select>
                       </div>

                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Corretor</Label>
                         <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                           <SelectTrigger className="w-full text-xs h-9 rounded-xl border border-border/40 dark:border-white/10 dark:bg-stone-950/50 hover:border-primary/50 transition-colors">
                             <SelectValue placeholder="Todos os corretores" />
                           </SelectTrigger>
                            <SelectContent className="rounded-2xl border-border/40 dark:border-white/10 backdrop-blur-2xl glass-panel">
                              <SelectItem value="all" className="text-xs">Todos os corretores</SelectItem>
                              {filteredStaff.map((p: Profile) => (
                                <SelectItem key={p.user_id} value={p.user_id} className="text-xs truncate max-w-[200px]">
                                  {p.name || p.email}
                                </SelectItem>
                              ))}

                            </SelectContent>
                         </Select>
                       </div>

                       <div className="space-y-1.5">
                         <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Status da Pasta</Label>
                         <Select value={filterFolder} onValueChange={setFilterFolder}>
                           <SelectTrigger className="w-full text-xs h-9 rounded-xl border border-border/40 dark:border-white/10 dark:bg-stone-950/50 hover:border-primary/50 transition-colors">
                             <SelectValue placeholder="Qualquer status" />
                           </SelectTrigger>
                           <SelectContent className="rounded-2xl border-border/40 dark:border-white/10 backdrop-blur-2xl glass-panel">
                             <SelectItem value="all" className="text-xs">Qualquer status</SelectItem>
                             <SelectItem value="completed" className="text-xs">Pasta Pronta</SelectItem>
                             <SelectItem value="pending" className="text-xs">Pasta Pendente</SelectItem>
                           </SelectContent>
                         </Select>
                       </div>
                     </div>

                     {(filterOrigin !== 'all' || filterAssignee !== 'all' || filterFolder !== 'all') && (
                       <Button 
                         variant="ghost" 
                         onClick={() => { setFilterOrigin('all'); setFilterAssignee('all'); setFilterFolder('all'); }}
                         className="w-full h-8 mt-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 rounded-xl transition-all"
                       >
                         Limpar Filtros
                       </Button>
                     )}
                   </div>
                 </PopoverContent>
               </Popover>
            </div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button 
                onClick={() => setFormOpen(true)} 
                className="h-12 px-6 bg-primary text-white text-xs font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 border border-white/10 transition-all gap-2"
              >
                <Plus className="h-4 w-4" /> Novo Lead
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
             <div className="relative">
                <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
                <Zap className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/40 animate-pulse">Sincronizando Ecossistema...</p>
          </div>
        ) : (
          <div className="relative rounded-[2.5rem] overflow-hidden -mx-4 md:mx-0">
             <KanbanBoard leads={filteredLeads} profiles={filteredProfilesMap} onReassign={handleReassign} />
          </div>
        )}

        <LeadForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreate}
          profiles={filteredProfilesMap}
        />
      </div>
    </AppLayout>
  );
}
