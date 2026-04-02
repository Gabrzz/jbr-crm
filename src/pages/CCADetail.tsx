import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useLead } from '@/hooks/useLeads';
import { useClientFolder, useDownloadClientFolder } from '@/hooks/useClientFolder';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, Building2, MessageSquare, Fingerprint, Target, ShieldAlert,
  FolderOpen, FolderPlus, Download, CheckCircle2, Loader2, Phone, Mail,
  BadgeDollarSign, BriefcaseBusiness, User, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@/lib/wpApi';

export default function CCADetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id!);
  const { data: folder } = useClientFolder(id!);
  const { openChat } = useGlobalUI();
  const downloadFolder = useDownloadClientFolder();

  const { data: properties = [] } = useQuery({
    queryKey: ['wp_properties_cache'],
    queryFn: () => fetchProperties({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!lead?.property_code_ref,
  });

  const matchedProperty = lead?.property_code_ref
    ? properties.find(p => p.code_property === lead.property_code_ref)
    : null;

  const folderCompleted = folder?.folder_status === 'completed' || lead?.folder_status === 'completed';

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-amber-500 animate-spin" />
          <Sparkles className="h-6 w-6 text-amber-500 absolute inset-0 m-auto animate-pulse" />
        </div>
      </div>
    </AppLayout>
  );

  if (!lead) return <AppLayout><div className="p-20 text-center font-bold">Cliente não encontrado.</div></AppLayout>;

  const sectionRow = (label: string, value: string | null | undefined) => value ? (
    <div className="flex items-start gap-3 py-2 border-b border-border/20 dark:border-white/5 last:border-0">
      <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="font-bold text-sm text-foreground">{value}</span>
    </div>
  ) : null;

  const MARITAL_MAP: Record<string, string> = {
    '1': 'Solteiro(a)', '2': 'Casado(a) – Comunhão Bens', '3': 'Casado(a) – Comunhão Parcial',
    '4': 'Casado(a) – Separação Total', '5': 'Divorciado(a)', '6': 'Separado Judicialmente',
  };
  const EDUCATION_MAP: Record<string, string> = {
    '0': 'Não Alfabetizado', '1': 'Ens. Fund. Incompleto', '2': 'Ens. Fund. Completo',
    '3': 'Ensino Médio Incompleto', '4': 'Ensino Médio Completo', '5': 'Superior Incompleto',
    '6': 'Superior Completo', '7': 'Especialização',
  };
  const PROPERTY_MAP: Record<string, string> = {
    '1': 'Casa', '2': 'Terreno', '3': 'Lote', '4': 'Chácara/Fazenda',
    '5': 'Apartamento', '6': 'Loja', '7': 'Sala', '8': 'Não Possui',
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in pb-24 pt-10 px-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-border/40 dark:border-white/10"
        >
          <div className="flex items-center gap-6">
            <Button variant="ghost" onClick={() => navigate('/cca')} className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-white/5 border border-border/40 shadow-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-600 border-none text-[8px] font-black uppercase tracking-[0.2em]">Processo CCA</Badge>
                {lead.service_order_number && (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">{lead.service_order_number}</span>
                )}
                {folderCompleted && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-3 w-3" /> Pasta Gerada
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-heading font-black text-foreground italic uppercase tracking-tighter">
                {lead.name}
              </h1>
            </div>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-3 flex-wrap">
            {!folderCompleted ? (
              <Button
                onClick={() => navigate(`/pasta/${id}`)}
                className="h-12 px-5 rounded-2xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 gap-2 font-black text-xs uppercase tracking-widest"
              >
                <FolderPlus className="h-4 w-4" /> Criar Pasta
              </Button>
            ) : (
              <Button
                onClick={() => downloadFolder.mutate(id!)}
                disabled={downloadFolder.isPending}
                className="h-12 px-5 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 gap-2 font-black text-xs uppercase tracking-widest"
              >
                {downloadFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar Pasta
              </Button>
            )}
          </div>
        </motion.div>

        {/* Layout 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLUNA ESQUERDA – Dados do Lead + Pasta */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel rounded-[2.5rem] bg-white/40 dark:bg-stone-950/40 border border-border/40 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <Accordion type="multiple" defaultValue={['dados-basicos', 'pasta']} className="w-full">

                {/* Bloco: Dados Básicos do Lead */}
                <AccordionItem value="dados-basicos" className="border-none">
                  <AccordionTrigger className="px-8 py-6 hover:no-underline hover:text-amber-600 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Fingerprint className="h-4 w-4 text-amber-600" /></div>
                      <span className="font-heading font-black text-base uppercase italic tracking-tight">Identificação</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-6 space-y-2">
                    {sectionRow('CPF', lead.cpf)}
                    {sectionRow('Telefone', lead.phone)}
                    {sectionRow('E-mail', lead.email)}
                    {sectionRow('Operação', lead.operation_type)}
                    {sectionRow('Interesse', lead.property_interest)}
                  </AccordionContent>
                </AccordionItem>

                {/* Bloco: Dados da Pasta (Ficha de Entrevista) */}
                {folder && (
                  <>
                    <AccordionItem value="pasta" className="border-t border-border/40 dark:border-white/5">
                      <AccordionTrigger className="px-8 py-6 hover:no-underline hover:text-amber-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><FolderOpen className="h-4 w-4 text-amber-600" /></div>
                          <span className="font-heading font-black text-base uppercase italic tracking-tight">Ficha de Entrevista</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-8 pb-6 space-y-2">
                        {sectionRow('Valor do Imóvel', folder.property_value ? `R$ ${folder.property_value.toLocaleString('pt-BR')}` : null)}
                        {sectionRow('Tipo de Financiamento', folder.financing_type)}
                        {sectionRow('Proponente', folder.proponent_name)}
                        {sectionRow('CPF Proponente', folder.proponent_cpf)}
                        {sectionRow('PIS Proponente', folder.proponent_pis)}
                        {folder.has_participant && sectionRow('Participante', folder.participant_name)}
                        {folder.has_participant && sectionRow('CPF Participante', folder.participant_cpf)}
                        {sectionRow('Estado Civil (Prop.)', folder.proponent_marital_status ? MARITAL_MAP[folder.proponent_marital_status] : null)}
                        {sectionRow('Grau Instrução (Prop.)', folder.proponent_education ? EDUCATION_MAP[folder.proponent_education] : null)}
                        {sectionRow('Celular', folder.phone_mobile)}
                        {sectionRow('Renda Formal', folder.income_formal_pro_value ? `R$ ${folder.income_formal_pro_value.toLocaleString('pt-BR')}` : null)}
                        {sectionRow('Renda Informal', folder.income_informal_pro_value ? `R$ ${folder.income_informal_pro_value.toLocaleString('pt-BR')}` : null)}
                        {sectionRow('Tipo Imóvel (Prop.)', folder.proponent_property_type ? PROPERTY_MAP[folder.proponent_property_type] : null)}
                        {sectionRow('FGTS', folder.use_fgts ? `Sim – R$ ${folder.fgts_value?.toLocaleString('pt-BR') || '0'}` : 'Não')}
                        {sectionRow('Dependentes', folder.has_dependents ? `${folder.dependents_count} dependente(s)` : 'Não possui')}
                      </AccordionContent>
                    </AccordionItem>
                  </>
                )}

                {!folder && (
                  <div className="px-8 py-8 flex items-center gap-4 border-t border-border/40 dark:border-white/5">
                    <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                      <ShieldAlert className="h-5 w-5 text-amber-600/60" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-muted-foreground">Ficha de Entrevista não preenchida</p>
                      <p className="text-xs text-muted-foreground/60">Clique em "Criar Pasta" para iniciar o preenchimento.</p>
                    </div>
                  </div>
                )}

              </Accordion>
            </motion.div>
          </div>

          {/* COLUNA DIREITA – Imóvel + Chat */}
          <div className="lg:col-span-5 space-y-6">

            {/* Chat */}
            {lead.chatwoot_conversation_id && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Button
                  onClick={() => openChat(lead.chatwoot_conversation_id!, lead.name)}
                  className="w-full h-20 rounded-[2.5rem] bg-emerald-500 text-white shadow-xl flex items-center justify-between group px-8 border border-white/20"
                >
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Status: Online</span>
                    <span className="text-lg font-heading font-black uppercase italic">Canal Direto <span className="opacity-40">Chat</span></span>
                  </div>
                  <div className="h-12 w-12 rounded-3xl bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-emerald-500 transition-all">
                    <MessageSquare className="h-6 w-6" />
                  </div>
                </Button>
              </motion.div>
            )}

            {/* Imóvel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass-panel border-border/40 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-xl bg-white/40 dark:bg-white/[0.02]">
                <div className="px-7 py-5 border-b border-border/40 dark:border-white/5 bg-amber-500/5 flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  <h3 className="font-heading font-black text-sm uppercase italic tracking-tight">Imóvel de Interesse</h3>
                </div>
                <div className="p-7">
                  {matchedProperty ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl overflow-hidden border border-border/40 dark:border-white/5 shadow-xl">
                        <img src={matchedProperty.resolved_images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80'} alt="Imóvel" className="w-full h-36 object-cover" />
                      </div>
                      <h4 className="font-heading font-black text-sm italic">{matchedProperty.title?.rendered}</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">{matchedProperty.district_property}</p>
                    </div>
                  ) : lead.property_code_ref ? (
                    <div className="text-center py-8 space-y-2">
                      <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto opacity-40" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">Consultando...</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/10 mx-auto mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20">Nenhum imóvel vinculado.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Status da Pasta */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <button
                onClick={() => navigate(`/pasta/${id}`)}
                className={cn(
                  "w-full p-6 rounded-[2.5rem] border flex items-center gap-4 transition-all hover:scale-[1.01] shadow-xl text-left",
                  folderCompleted
                    ? "border-emerald-500/30 bg-emerald-500/5 hover:shadow-emerald-500/10"
                    : "border-amber-500/30 bg-amber-500/5 hover:shadow-amber-500/10"
                )}
              >
                <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shrink-0", folderCompleted ? "bg-emerald-500/10" : "bg-amber-500/10")}>
                  {folderCompleted ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> : <FolderOpen className="h-7 w-7 text-amber-600" />}
                </div>
                <div>
                  <p className={cn("text-[10px] font-black uppercase tracking-widest mb-1", folderCompleted ? "text-emerald-600" : "text-amber-600")}>
                    {folderCompleted ? 'Pasta Gerada ✓' : 'Pasta Pendente'}
                  </p>
                  <p className="font-heading font-black text-lg italic text-foreground">
                    {folderCompleted ? 'Clique para ver detalhes' : 'Preencher Ficha de Entrevista'}
                  </p>
                </div>
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
