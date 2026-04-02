import { Clock, MessageSquare, Briefcase, PhoneCall, ArrowUpRight, DollarSign, User, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@/lib/wpApi';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];

interface Props {
  lead: Lead;
  stageConfig: { key: string; label: string; colorHex?: string };
  brokerName: string;
  profiles: Record<string, string>;
  onReassign: (leadId: string, userId: string) => void;
  isDragging?: boolean;
}

export function KanbanCard({ lead, stageConfig, brokerName, profiles, onReassign, isDragging }: Props) {
  const { openChat } = useGlobalUI();
  const { role } = useAuth();
  
  const daysInStage = differenceInDays(new Date(), new Date(lead.last_activity_at));
  const hoursInStage = differenceInHours(new Date(), new Date(lead.last_activity_at)) % 24;
  const minutesInStage = differenceInMinutes(new Date(), new Date(lead.last_activity_at)) % 60;

  const timeString = daysInStage > 0 
    ? `${daysInStage}d ${hoursInStage}h`
    : `${hoursInStage}h ${minutesInStage}m`;

  const { data: properties = [] } = useQuery({
    queryKey: ['wp_properties_cache'],
    queryFn: () => fetchProperties({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!lead.property_code_ref,
  });

  const matchedProperty = lead.property_code_ref 
    ? properties.find(p => p.code_property === lead.property_code_ref) 
    : null;

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      className="group perspective"
    >
      <Card className={cn(
        'glass-panel rounded-[2.5rem] border border-border/60 dark:border-white/5 shadow-2xl transition-all relative overflow-hidden bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xl',
        isDragging ? "shadow-primary/30 border-primary/30 rotate-2" : "shadow-black/5 hover:shadow-primary/10"
      )}>
        {/* Visual Glow Layer */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-10 transition-all duration-700 pointer-events-none" 
          style={{ backgroundColor: stageConfig.colorHex }}
        />

        <CardContent className="p-6 space-y-5 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <Link to={`/leads/${lead.id}`} className="block overflow-hidden flex-1 group/link">
              <div className="flex items-center gap-2 mb-1.5 min-w-0">
                <h4 className="text-base font-heading font-black text-foreground tracking-tight truncate group-hover/link:text-primary transition-colors">
                  {lead.name}
                </h4>
                <ArrowUpRight className="h-3.5 w-3.5 text-primary/30 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="bg-primary/5 border-primary/10 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg text-primary/60">
                  {lead.origin}
                </Badge>
                {(lead.expected_value ?? 0) > 0 && (
                  <Badge variant="outline" className="bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg tabular-nums">
                    R$ {lead.expected_value.toLocaleString('pt-BR')}
                  </Badge>
                )}
              </div>
            </Link>
            
            {lead.chatwoot_conversation_id && (
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-emerald-600 dark:text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 transition-all rounded-2xl shadow-lg shadow-emerald-500/5 group-hover:shadow-emerald-500/20"
                onClick={(e) => {
                  e.preventDefault();
                  openChat(lead.chatwoot_conversation_id!, lead.name);
                }}
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Property Context */}
          {lead.property_code_ref && (
            <div className="p-4 rounded-[1.75rem] bg-black/[0.03] dark:bg-black/40 border border-border/40 dark:border-white/5 space-y-3 shadow-inner">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <div className="h-5 w-5 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                       <Sparkles className="h-2.5 w-2.5 text-primary" />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">Interesse Premium</span>
                 </div>
                 <span className="text-[9px] font-black text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full tabular-nums border border-primary/10">REF: {lead.property_code_ref}</span>
              </div>
              
              {matchedProperty ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
                  <p className="text-[11px] font-bold text-foreground/90 line-clamp-1">{matchedProperty.title?.rendered}</p>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest">
                    {matchedProperty.price_property ? `R$ ${Number(matchedProperty.price_property).toLocaleString('pt-BR')}` : 'Sob Consulta'}
                  </p>
                </motion.div>
              ) : (
                <div className="h-6 flex items-center gap-2 animate-pulse">
                  <div className="h-1 w-1 rounded-full bg-primary/40" />
                  <span className="text-[9px] font-bold text-muted-foreground/40">Sincronizando WP...</span>
                </div>
              )}
            </div>
          )}

          {/* Assignment & Metadata */}
          <div className="space-y-4">
             <div className="flex items-center justify-between bg-primary/[0.03] dark:bg-white/[0.03] border border-primary/5 dark:border-white/5 p-3 rounded-2xl">
                <div className="flex items-center gap-3">
                   <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary/40 to-primary/10 p-[1px]">
                      <div className="h-full w-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center">
                        <User className="h-3.5 w-3.5 text-primary/60" />
                      </div>
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest">Responsável</span>
                       {role === 'admin' ? (
                        <Select
                          value={lead.assigned_to || ''}
                          onValueChange={(val) => onReassign(lead.id, val)}
                        >
                          <SelectTrigger className="h-4 text-[11px] font-bold border-0 bg-transparent p-0 w-full shadow-none focus:ring-0 rounded-none text-foreground/70 hover:text-primary transition-colors">
                            <SelectValue placeholder={brokerName} />
                          </SelectTrigger>
                          <SelectContent className="glass-panel border-border/40 dark:border-white/10 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-2xl rounded-2xl shadow-3xl">
                            {Object.entries(profiles).map(([id, name]) => (
                              <SelectItem key={id} value={id} className="text-[10px] font-black uppercase tracking-widest text-foreground/50 dark:text-white/50 focus:bg-primary/20 focus:text-primary cursor-pointer py-3">
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-[11px] font-bold text-foreground/70 h-4 flex items-center">
                          {brokerName}
                        </span>
                      )}
                   </div>
                </div>
                
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/5 dark:bg-black/40 border border-primary/5 dark:border-white/5 text-[9px] font-black uppercase tracking-widest text-primary/60 transition-colors">
                  <Clock className="h-3 w-3" />
                  <span className="tabular-nums">{timeString}</span>
                </div>
             </div>
          </div>
        </CardContent>

        {/* Dynamic Interactive Shimmer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/transparent via-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Development Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-black/5 dark:bg-white/5 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((['novo_lead', 'contato', 'visita', 'proposta', 'negociacao', 'contrato', 'fechado'].indexOf(lead.stage || 'novo_lead') + 1) / 7) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: stageConfig.colorHex || '#3B5BDB' }}
            />
        </div>
      </Card>
    </motion.div>
  );
}
