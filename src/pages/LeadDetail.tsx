import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useLead, useUpdateLead, useDeleteLead, useSendToCCA } from '@/hooks/useLeads';
import { useClientFolder, useDownloadClientFolder } from '@/hooks/useClientFolder';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft, Trash2, Save, Building2, MessageSquare, Target, Sparkles,
  Fingerprint, CalendarDays, ShieldAlert, Send, FolderOpen, FolderPlus,
  Download, CheckCircle2, Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '@/lib/wpApi';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Database } from '@/integrations/supabase/types';

type LeadStage = Database['public']['Enums']['lead_stage'];
type LeadOrigin = Database['public']['Enums']['lead_origin'];

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: lead, isLoading } = useLead(id!);
  const { data: folder } = useClientFolder(id!);
  const { data: profilesList = [] } = useProfiles();
  const { role } = useAuth();
  const { openChat } = useGlobalUI();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const sendToCCA = useSendToCCA();
  const downloadFolder = useDownloadClientFolder();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    stage: 'novo_lead' as LeadStage,
    origin: 'site' as LeadOrigin,
    property_interest: '',
    operation_type: '',
    property_code_ref: '',
    assigned_to: '',
    notes: '',
    followup_at: '',
    expected_value: 0,
  });

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        cpf: lead.cpf || '',
        stage: lead.stage,
        origin: lead.origin,
        property_interest: lead.property_interest || '',
        operation_type: lead.operation_type || '',
        property_code_ref: lead.property_code_ref || '',
        assigned_to: lead.assigned_to || '',
        notes: lead.notes || '',
        followup_at: lead.followup_at ? lead.followup_at.slice(0, 16) : '',
        expected_value: lead.expected_value || 0,
      });
    }
  }, [lead]);

  const handleSave = () => {
    updateLead.mutate(
      { id: id!, ...form, followup_at: form.followup_at || null, assigned_to: form.assigned_to || null },
      { onSuccess: () => toast.success('Dados sincronizados!') }
    );
  };

  const handleDelete = () => {
    if (!confirm('Esta ação é irreversível. Deseja deletar este lead permanentemente?')) return;
    deleteLead.mutate(id!, { onSuccess: () => navigate('/leads') });
  };

  const handleSendToCCA = () => {
    if (!confirm('Enviar esse lead para o CCA? Ele passará para a equipe financeira.')) return;
    sendToCCA.mutate(id!, {
      onSuccess: () => { toast.success('Lead encaminhado ao CCA!'); navigate('/leads'); }
    });
  };

  const { data: properties = [] } = useQuery({
    queryKey: ['wp_properties_cache'],
    queryFn: () => fetchProperties({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
    enabled: !!form.property_code_ref,
  });

  const matchedProperty = form.property_code_ref
    ? properties.find(p => p.code_property === form.property_code_ref)
    : null;

  const folderCompleted = folder?.folder_status === 'completed' || lead?.folder_status === 'completed';

  if (isLoading) return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-t-2 border-primary animate-spin" />
          <Sparkles className="h-6 w-6 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
      </div>
    </AppLayout>
  );

  if (!lead) return <AppLayout><div className="p-20 text-center text-foreground font-black uppercase tracking-widest">Protocolo Não Encontrado.</div></AppLayout>;

  const inputCls = "h-12 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-bold";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-primary ml-1";

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
            <Button variant="ghost" onClick={() => navigate('/leads')} className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-white/5 border border-border/40 shadow-xl">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase tracking-[0.2em]">Ficha de Dados</Badge>
                {lead.service_order_number && (
                  <span className="text-[10px] font-black text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">{lead.service_order_number}</span>
                )}
                {folderCompleted && (
                  <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded">
                    <CheckCircle2 className="h-3 w-3" /> Pasta Gerada
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-heading font-black text-foreground italic uppercase tracking-tighter leading-none">
                {form.name || 'Protocolo Sem Nome'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="ghost" size="icon" onClick={handleDelete}
              className="h-12 w-12 rounded-2xl bg-red-500/5 text-red-500/40 hover:bg-red-500 hover:text-white border border-red-500/10 shadow-xl opacity-60 hover:opacity-100 transition-all">
              <Trash2 className="h-4 w-4" />
            </Button>

            {/* Botão Pasta do Cliente */}
            {!folderCompleted ? (
              <Button
                onClick={() => navigate(`/pasta/${id}`)}
                className="h-12 px-5 rounded-2xl bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 gap-2 font-black text-xs uppercase tracking-widest transition-all"
              >
                <FolderPlus className="h-4 w-4" /> Criar Pasta
              </Button>
            ) : (
              <Button
                onClick={() => downloadFolder.mutate(id!)}
                disabled={downloadFolder.isPending}
                className="h-12 px-5 rounded-2xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 gap-2 font-black text-xs uppercase tracking-widest transition-all"
              >
                {downloadFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar Pasta
              </Button>
            )}

            {/* Botão Enviar para CCA – bloqueado se pasta não estiver completa */}
            {!lead.is_cca_lead && (
              <Button
                onClick={folderCompleted ? handleSendToCCA : () => {
                  toast.warning('Crie e envie a Pasta do Cliente antes de encaminhar ao CCA.');
                  navigate(`/pasta/${id}`);
                }}
                className={cn(
                  "h-12 px-5 rounded-2xl gap-2 font-black text-xs uppercase tracking-widest transition-all border",
                  folderCompleted
                    ? "bg-rose-900/10 text-rose-900 dark:text-rose-400 hover:bg-rose-900 hover:text-white border-rose-900/20"
                    : "bg-muted/50 text-muted-foreground border-border/40 cursor-not-allowed opacity-60"
                )}
              >
                <Send className="h-4 w-4" />
                Enviar CCA
                {!folderCompleted && ' 🔒'}
              </Button>
            )}

            <Button onClick={handleSave}
              className="h-12 px-6 rounded-2xl bg-primary text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all gap-2">
              <Save className="h-4 w-4" /> Salvar
            </Button>
          </div>
        </motion.div>

        {/* Layout 2 colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* COLUNA ESQUERDA – Dados do Lead */}
          <div className="lg:col-span-7 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-panel rounded-[2.5rem] bg-white/40 dark:bg-stone-950/40 border border-border/40 dark:border-white/10 shadow-2xl overflow-hidden"
            >
              <Accordion type="multiple" defaultValue={['dados-basicos']} className="w-full">

                {/* Bloco 1: Identificação */}
                <AccordionItem value="dados-basicos" className="border-none">
                  <AccordionTrigger className="px-8 py-6 hover:no-underline hover:text-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Fingerprint className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-heading font-black text-base uppercase italic tracking-tight">Identificação</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2 md:col-span-2">
                        <Label className={labelCls}>Nome Completo</Label>
                        <Input className={inputCls} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>CPF</Label>
                        <Input className={inputCls} placeholder="000.000.000-00" value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Telefone</Label>
                        <Input className={inputCls} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label className={labelCls}>E-mail</Label>
                        <Input type="email" className={inputCls} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Bloco 2: Pipeline */}
                <AccordionItem value="pipeline" className="border-t border-border/40 dark:border-white/5">
                  <AccordionTrigger className="px-8 py-6 hover:no-underline hover:text-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Target className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-heading font-black text-base uppercase italic tracking-tight">Funil</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className={labelCls}>Status na Pipeline</Label>
                        <Select value={form.stage} onValueChange={v => setForm({ ...form, stage: v as LeadStage })}>
                          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="novo_lead">Novo Lead</SelectItem>
                            <SelectItem value="contato">Qualificação</SelectItem>
                            <SelectItem value="visita">Visita Técnica</SelectItem>
                            <SelectItem value="proposta">Proposta Formal</SelectItem>
                            <SelectItem value="negociacao">Negociação</SelectItem>
                            <SelectItem value="contrato">Contrato</SelectItem>
                            <SelectItem value="fechado">Sucesso JBR</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Corretor Titular</Label>
                        {role === 'admin' ? (
                          <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                            <SelectTrigger className={inputCls}><SelectValue placeholder="Atribuir..." /></SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {profilesList.map(p => <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className={cn(inputCls, "flex items-center px-4 bg-muted/20")}>
                            {profilesList.find(p => p.user_id === form.assigned_to)?.name || 'Não atribuído'}
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Origem do Lead</Label>
                        <Select value={form.origin} onValueChange={v => setForm({ ...form, origin: v as LeadOrigin })}>
                          <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value="site">Site Institucional</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                            <SelectItem value="portal">Portal Imobiliário</SelectItem>
                            <SelectItem value="outro">Outros Canais</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Modelo de Operação</Label>
                        <Input className={inputCls} value={form.operation_type} onChange={e => setForm({ ...form, operation_type: e.target.value })} placeholder="Compra / Aluguel" />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Valor do Negócio (R$)</Label>
                        <Input type="number" className={inputCls} value={form.expected_value} onChange={e => setForm({ ...form, expected_value: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Próximo Follow-up</Label>
                        <div className="relative">
                          <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 pointer-events-none" />
                          <Input type="datetime-local" className={cn(inputCls, "pl-10")} value={form.followup_at} onChange={e => setForm({ ...form, followup_at: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Bloco 3: Notas */}
                <AccordionItem value="notas" className="border-t border-border/40 dark:border-white/5 border-b-0">
                  <AccordionTrigger className="px-8 py-6 hover:no-underline hover:text-primary transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <MessageSquare className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-heading font-black text-base uppercase italic tracking-tight">Notas e Observações</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-8 pb-8">
                    <Textarea
                      className="min-h-[140px] rounded-[2rem] bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 text-foreground dark:text-white font-medium p-6 leading-relaxed focus:ring-primary/20"
                      value={form.notes}
                      onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="Descreva os pontos-chave desta negociação..."
                    />
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </motion.div>
          </div>

          {/* COLUNA DIREITA – Imóvel + Ações */}
          <div className="lg:col-span-5 space-y-6">

            {/* Chat Button */}
            {lead.chatwoot_conversation_id && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Button
                  onClick={() => openChat(lead.chatwoot_conversation_id!, form.name)}
                  className="w-full h-20 rounded-[2.5rem] bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20 hover:shadow-emerald-500/40 hover:scale-[1.02] transition-all flex items-center justify-between group overflow-hidden border border-white/20 px-8"
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

            {/* Referência de Imóvel */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <div className="glass-panel border-border/40 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl bg-white/40 dark:bg-white/[0.02]">
                <div className="px-7 py-5 border-b border-border/40 dark:border-white/5 bg-primary/5 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-heading font-black text-sm text-foreground uppercase italic tracking-tight">Imóvel de Interesse</h3>
                </div>

                <div className="p-7 space-y-5">
                  <div className="space-y-2">
                    <Label className={labelCls}>Código do Imóvel (WP)</Label>
                    <div className="relative">
                      <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60 pointer-events-none" />
                      <Input className={cn(inputCls, "pl-10")} value={form.property_code_ref} onChange={e => setForm({ ...form, property_code_ref: e.target.value })} placeholder="COD123" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className={labelCls}>Pretensão / Interesse</Label>
                    <Input className={inputCls} value={form.property_interest} onChange={e => setForm({ ...form, property_interest: e.target.value })} placeholder="Descrição..." />
                  </div>

                  {matchedProperty ? (
                    <div className="rounded-2xl overflow-hidden border border-border/40 dark:border-white/5 shadow-xl">
                      <img
                        src={matchedProperty.resolved_images?.[0] || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&q=80'}
                        alt="Imóvel"
                        className="w-full h-36 object-cover"
                      />
                      <div className="p-4 space-y-1">
                        <h4 className="font-heading font-black text-sm italic">{matchedProperty.title?.rendered}</h4>
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">{matchedProperty.district_property}</p>
                      </div>
                    </div>
                  ) : form.property_code_ref ? (
                    <div className="text-center py-8 space-y-2">
                      <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto opacity-40" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 animate-pulse">Consultando banco de dados...</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/10 mx-auto mb-2" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/20">Digite um código para visualizar o imóvel aqui.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Pasta do Cliente – Status Card */}
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
                    {folderCompleted ? 'Pasta do Cliente' : 'Pasta do Cliente Pendente'}
                  </p>
                  <p className="font-heading font-black text-lg italic text-foreground">
                    {folderCompleted ? 'Concluída e Enviada ✓' : 'Clique para Preencher'}
                  </p>
                  {!folderCompleted && <p className="text-xs text-muted-foreground/60 mt-1">Necessária para encaminhar ao CCA</p>}
                </div>
              </button>
            </motion.div>

          </div>
        </div>
      </div>
    </AppLayout>
  );
}
