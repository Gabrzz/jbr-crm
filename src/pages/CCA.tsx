import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useCCALeads, useTakeCCALead } from '@/hooks/useLeads';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, User, UserPlus, Phone, BriefcaseBusiness, CalendarClock, ShieldAlert, Sparkles, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface LeadListCardProps {
  lead: Lead;
  profiles: Profile[];
  isNew: boolean;
  onClick: () => void;
  onTake: (e: React.MouseEvent) => void;
}


export default function CCA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: ccaLeads = [], isLoading } = useCCALeads();
  const { data: profiles = [] } = useProfiles();
  const takeLead = useTakeCCALead();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todos' | 'meus'>('todos');

  const handleTakeLead = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    if (!confirm('Deseja assumir o atendimento deste cliente de financiamento/documentação?')) return;
    takeLead.mutate(leadId, {
      onSuccess: () => {
        toast.success("Cliente atribuído a você com sucesso!");
      }
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
            <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Filtragem (Busca)
  const query = search.toLowerCase();
  let filtered = ccaLeads.filter(l => 
    l.name.toLowerCase().includes(query) ||
    (l.phone && l.phone.includes(query)) ||
    (l.cpf && l.cpf.includes(query)) ||
    (l.service_order_number && l.service_order_number.toLowerCase().includes(query))
  );

  // Filtragem (Meus / Todos)
  if (filterMode === 'meus') {
    filtered = filtered.filter(l => l.cca_assigned_to === user?.id);
  }

  // Divisão: Novos (Sem responsável) vs Em Andamento (Com responsável)
  // Mas sempre respeitando o filtro atual
  const novosLeads = filtered.filter(l => !l.cca_assigned_to);
  const andamentoLeads = filtered.filter(l => !!l.cca_assigned_to);

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-10 animate-fade-in pb-24 pt-10 px-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-border/40 dark:border-white/10">
          <div className="space-y-1">
            <h1 className="text-4xl font-heading font-black text-foreground italic uppercase tracking-tighter leading-none flex items-baseline gap-2">
              Painel Operacional <span className="text-amber-500/80 not-italic font-light text-2xl tracking-normal">CCA</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
              Gestão de Financiamentos e Desburocratização
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
              <Input 
                placeholder="Busca por nome, OS, CPF..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 pl-12 rounded-2xl bg-white/40 dark:bg-stone-950/40 border-border/40 dark:border-white/10 focus:ring-amber-500/20 font-bold"
              />
            </div>

            <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as 'todos' | 'meus')} className="w-full sm:w-auto">
              <TabsList className="h-14 p-1 rounded-2xl bg-white/40 dark:bg-stone-950/40 border border-border/40 dark:border-white/10">
                <TabsTrigger value="todos" className="rounded-xl h-12 px-6 data-[state=active]:bg-amber-500 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">Todos</TabsTrigger>
                <TabsTrigger value="meus" className="rounded-xl h-12 px-6 data-[state=active]:bg-amber-500 data-[state=active]:text-white font-black uppercase text-[10px] tracking-widest transition-all">Meus</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Listagem */}
        <div className="space-y-12">
          
          {/* Sessão Novos */}
          {novosLeads.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-2">
                <div className="flex items-center justify-center p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-heading font-black uppercase tracking-tight text-amber-600 dark:text-amber-500">
                  Fila de Espera <span className="opacity-60 text-sm">({novosLeads.length})</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <AnimatePresence>
                  {novosLeads.map(lead => (
                    <LeadListCard 
                      key={lead.id} 
                      lead={lead} 
                      profiles={profiles} 
                      isNew={true}
                      onClick={() => navigate(`/cca/${lead.id}`)}
                      onTake={(e) => handleTakeLead(e, lead.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {/* Sessão Andamento */}
          <div className="space-y-6">
             <div className="flex items-center gap-3 px-2">
                <div className="flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary">
                  <BriefcaseBusiness className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-heading font-black uppercase tracking-tight text-foreground">
                  Listagem de Clientes e Processos <span className="opacity-40 text-sm">({andamentoLeads.length})</span>
                </h2>
              </div>

              {andamentoLeads.length === 0 ? (
                 <div className="text-center py-20 bg-white/20 dark:bg-white/5 border border-dashed border-border/40 dark:border-white/10 rounded-[3rem]">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Nenhum cliente operando nesta visão.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                    {andamentoLeads.map(lead => (
                      <LeadListCard 
                        key={lead.id} 
                        lead={lead} 
                        profiles={profiles} 
                        isNew={false}
                        onClick={() => navigate(`/cca/${lead.id}`)}
                        onTake={(e) => handleTakeLead(e, lead.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}

// ------------------------------
// Componente CCALeadCard
// ------------------------------

function LeadListCard({ lead, profiles, isNew, onClick, onTake }: LeadListCardProps) {
  const corretor = lead.assigned_to ? profiles.find((p) => p.user_id === lead.assigned_to) : null;
  const ccaOwner = lead.cca_assigned_to ? profiles.find((p) => p.user_id === lead.cca_assigned_to) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        "group cursor-pointer glass-panel rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all duration-300 border bg-white/40 dark:bg-stone-950/40 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6",
        isNew ? "border-amber-500/50 dark:border-amber-500/40 shadow-amber-500/5" : "border-border/40 dark:border-white/10"
      )}
    >
      {/* Golden Glow if new */}
      {isNew && (
        <div className="absolute inset-y-0 left-0 w-1 bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
      )}

      {/* Info Group */}
      <div className="flex-1 flex flex-col md:flex-row items-start md:items-center gap-6 pl-2">
        <div className="h-16 w-16 rounded-[1.6rem] bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex flex-col items-center justify-center shrink-0 shadow-sm">
          <span className="text-[9px] font-black uppercase text-primary/60 tracking-tighter">os</span>
          <span className="text-sm font-black tracking-widest leading-none mt-0.5">{lead.service_order_number?.split('-')?.[1] || '0000'}</span>
        </div>

        <div className="space-y-1.5">
          <h3 className="font-heading font-black text-2xl italic text-foreground tracking-tighter leading-none group-hover:text-primary transition-colors">
            {lead.name}
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-bold">
            {lead.cpf && (
              <span className="bg-primary/5 px-2.5 py-1 rounded-lg text-primary/80 border border-primary/10">CPF: {lead.cpf}</span>
            )}
            {lead.phone && (
              <span className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 px-3 py-1 rounded-xl border border-emerald-500/20 font-black text-[11px] shadow-sm tracking-tight">
                <Phone className="h-3.5 w-3.5" /> {lead.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Responsables Sub-cards */}
      <div className="flex flex-wrap items-center gap-4 w-full md:w-auto shrink-0 mt-4 md:mt-0 pb-2 md:pb-0">
        
        {/* Sub-card: Corretor */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className={cn(
            "flex items-center gap-4 p-2.5 pr-6 rounded-[2.5rem] border shrink-0 transition-all shadow-sm",
            corretor 
              ? "border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 backdrop-blur-md" 
              : "border-border/40 bg-black/5 dark:bg-white/5 opacity-60"
          )}
        >
          <div className={cn(
            "h-14 w-14 rounded-[1.5rem] flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-0.5", 
            corretor ? "bg-rose-500/20" : "bg-black/10 dark:bg-white/10"
          )}>
            {corretor?.avatar_url ? (
              <img src={corretor.avatar_url} alt="" className="h-full w-full object-cover rounded-[1.4rem]" />
            ) : (
              <User className={cn("h-7 w-7", corretor ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")} />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{corretor ? 'Corretor' : 'Origem'}</span>
            <span className={cn("text-sm font-black italic uppercase tracking-tighter", corretor ? "text-rose-900 dark:text-rose-400" : "text-muted-foreground")}>
              {corretor ? corretor.name : 'S/ Corretor'}
            </span>
          </div>
        </motion.div>

        {/* Sub-card: CCA */}
        <motion.div 
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={!ccaOwner ? onTake : undefined}
          className={cn(
            "flex items-center gap-4 p-2.5 pr-6 rounded-[2.5rem] border shrink-0 group/cca transition-all shadow-sm",
            ccaOwner 
              ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/30 backdrop-blur-md" 
              : "border-border/60 bg-white/50 dark:bg-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 hover:shadow-lg hover:shadow-amber-500/10 cursor-pointer border-dashed"
          )}
        >
          <div className={cn(
            "h-14 w-14 rounded-[1.5rem] flex items-center justify-center overflow-hidden shrink-0 transition-colors shadow-inner p-0.5", 
            ccaOwner ? "bg-amber-500/20" : "bg-black/5 dark:bg-white/5 group-hover/cca:bg-amber-500/20"
          )}>
            {ccaOwner?.avatar_url ? (
              <img src={ccaOwner.avatar_url} alt="" className="h-full w-full object-cover rounded-[1.4rem]" />
            ) : (
              <UserPlus className={cn("h-7 w-7 transition-colors", ccaOwner ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground group-hover/cca:text-amber-500")} />
            )}
          </div>
          <div className="flex flex-col pr-2">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">{ccaOwner ? 'Responsável CCA' : 'Acionar Mesa'}</span>
            <span className={cn("text-sm font-black italic uppercase tracking-tighter transition-colors", ccaOwner ? "text-amber-700 dark:text-amber-500" : "text-muted-foreground group-hover/cca:text-amber-600 dark:group-hover/cca:text-amber-500")}>
              {ccaOwner ? ccaOwner.name : 'Assumir Processo'}
            </span>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
