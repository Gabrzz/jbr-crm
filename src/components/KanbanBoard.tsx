import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { KanbanCard } from './KanbanCard';
import { useUpdateLeadStage } from '@/hooks/useLeads';
import { Plus, LayoutGrid, Target, Sparkles, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'];
type LeadStage = Database['public']['Enums']['lead_stage'];

const STAGES: { key: LeadStage; label: string; colorHex: string; description: string }[] = [
  { key: 'novo_lead', label: 'Prospecção', colorHex: '#8b5cf6', description: 'Novas oportunidades' },
  { key: 'contato', label: 'Qualificação', colorHex: '#10b981', description: 'Em descoberta' },
  { key: 'visita', label: 'Visita', colorHex: '#f43f5e', description: 'Apresentação' },
  { key: 'proposta', label: 'Proposta', colorHex: '#f59e0b', description: 'Oferta enviada' },
  { key: 'negociacao', label: 'Negociação', colorHex: '#ec4899', description: 'Ajustes finais' },
  { key: 'contrato', label: 'Contrato', colorHex: '#0ea5e9', description: 'Jurídico/Assinatura' },
  { key: 'fechado', label: 'Sucesso', colorHex: '#22c55e', description: 'Venda concluída' },
];

interface Props {
  leads: Lead[];
  profiles: Record<string, string>;
  onReassign: (leadId: string, userId: string) => void;
}

export function KanbanBoard({ leads, profiles, onReassign }: Props) {
  const updateStage = useUpdateLeadStage();

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId as LeadStage;
    const leadId = result.draggableId;
    updateStage.mutate({ id: leadId, stage: newStage });
  };

  const grouped = STAGES.map((s) => ({
    ...s,
    items: leads.filter((l) => l.stage === s.key),
  }));

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div 
        className="flex gap-8 overflow-x-auto pb-12 pt-4 px-2 no-scrollbar"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {grouped.map((col, idx) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
            key={col.key} 
            className="flex-shrink-0 w-[340px] flex flex-col scroll-mt-4"
          >
            {/* Column Header */}
            <div className="relative mb-8 group/column cursor-default px-1">
              <div className="flex items-center justify-between mb-3 px-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor] border border-black/5 dark:border-white/20"
                      style={{ backgroundColor: col.colorHex, color: col.colorHex }}
                    />
                    <h3 className="font-heading font-black text-[13px] uppercase tracking-[0.25em] text-primary">
                      {col.label}
                    </h3>
                    <div className="bg-primary/10 border border-primary/20 rounded-full px-2.5 py-0.5 min-w-[24px] flex items-center justify-center">
                      <span className="text-[10px] font-black text-primary leading-none">{col.items.length}</span>
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest ml-5">
                    {col.description}
                  </p>
                </div>
                
                <motion.button 
                  whileHover={{ scale: 1.1, backgroundColor: "rgba(0,0,0,0.05)" }}
                  className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary transition-all opacity-0 group-hover/column:opacity-100 dark:bg-white/5 dark:border-white/10 dark:text-muted-foreground"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
              </div>
              
              {/* Animated Progress Bar under header */}
              <div className="h-[2px] w-full bg-primary/10 rounded-full overflow-hidden relative">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="h-full absolute left-0 opacity-10"
                  style={{ backgroundColor: col.colorHex }}
                />
                <motion.div 
                  className="h-full absolute left-0 rounded-full"
                  style={{ backgroundColor: col.colorHex, width: '40px' }}
                />
              </div>
            </div>

            <Droppable droppableId={col.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "flex-1 space-y-4 rounded-[2.5rem] p-3 transition-all duration-700 min-h-[500px]",
                    snapshot.isDraggingOver ? "bg-primary/[0.03] ring-1 ring-primary/10 shadow-[inner_0_20px_40px_rgba(0,0,0,0.05)]" : "bg-transparent"
                  )}
                >
                    {col.items.map((lead, index) => (
                      <Draggable key={lead.id} draggableId={lead.id} index={index}>
                        {(provided, snap) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "outline-none mb-4",
                              snap.isDragging ? "z-50 scale-105" : ""
                            )}
                            style={provided.draggableProps.style}
                          >
                            <KanbanCard
                              lead={lead}
                              stageConfig={col}
                              brokerName={lead.assigned_to ? profiles[lead.assigned_to] || 'Não atribuído' : 'Não atribuído'}
                              profiles={profiles}
                              onReassign={onReassign}
                              isDragging={snap.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                  
                  {col.items.length === 0 && !snapshot.isDraggingOver && (
                    <motion.div 
                      className="h-40 rounded-[2rem] border-2 border-dashed border-primary/10 flex items-center justify-center flex-col gap-3 group/empty transition-all hover:border-primary/30 hover:bg-primary/[0.02]"
                    >
                      <div className="h-12 w-12 rounded-2xl bg-primary/5 text-primary/20 flex items-center justify-center group-hover/empty:text-primary/40 transition-colors">
                        <LayoutGrid className="h-6 w-6 stroke-[1px]" />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/20 group-hover/empty:text-primary/40 transition-colors">Fila de espera vazia</span>
                    </motion.div>
                  )}
                </div>
              )}
            </Droppable>
          </motion.div>
        ))}
      </div>
    </DragDropContext>
  );
}
