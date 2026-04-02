import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useLead } from '@/hooks/useLeads';
import { useClientFolder, useUpsertClientFolder, useSubmitClientFolder, useUploadDocument, useDownloadClientFolder } from '@/hooks/useClientFolder';
import type { ClientFolderData } from '@/hooks/useClientFolder';
import { ChatCore } from '@/components/ChatwootChat';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, ArrowRight, CheckCircle2, FolderOpen, UploadCloud, FileCheck, Loader2, AlertCircle, Download, FolderPlus, MessageSquare, PanelRightClose, PanelRightOpen, Eye, X, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: 'Dados Iniciais', icon: '📋' },
  { label: 'FGTS e Perfil', icon: '🏛️' },
  { label: 'Contatos e Rendas', icon: '💰' },
  { label: 'Documentos', icon: '📎' },
];

const MARITAL_OPTIONS = [
  { value: '1', label: '1 – Solteiro(a)' },
  { value: '2', label: '2 – Casado(a) comunhão bens' },
  { value: '3', label: '3 – Casado(a) comunhão parcial' },
  { value: '4', label: '4 – Casado(a) separação total' },
  { value: '5', label: '5 – Divorciado(a)' },
  { value: '6', label: '6 – Separado judicialmente' },
];

const EDUCATION_OPTIONS = [
  { value: '0', label: '0 – Não alfabetizado' },
  { value: '1', label: '1 – Ens. fundamental incompleto' },
  { value: '2', label: '2 – Ens. fundamental completo' },
  { value: '3', label: '3 – Ens. médio incompleto' },
  { value: '4', label: '4 – Ens. médio completo' },
  { value: '5', label: '5 – Superior incompleto' },
  { value: '6', label: '6 – Superior completo' },
  { value: '7', label: '7 – Especialização' },
];

const PROPERTY_TYPE_OPTIONS = [
  { value: '1', label: '1 – Casa' },
  { value: '2', label: '2 – Terreno' },
  { value: '3', label: '3 – Lote' },
  { value: '4', label: '4 – Chácara/Fazenda' },
  { value: '5', label: '5 – Apartamento' },
  { value: '6', label: '6 – Loja' },
  { value: '7', label: '7 – Sala' },
  { value: '8', label: '8 – Não possui' },
];

const FINANCING_OPTIONS = [
  'Minha Casa Minha Vida (MCMV)',
  'Financiamento FGTS',
  'Financiamento SBPE',
  'Pró-Cotista FGTS',
  'Carta de Crédito Individual',
  'Outro',
];

const REQUIRED_DOCS: { field: keyof ClientFolderData; label: string }[] = [
  { field: 'doc_cnh', label: 'CNH – Carteira Nacional de Habilitação' },
  { field: 'doc_bank_slip', label: 'Boleto Bancário / Fatura' },
  { field: 'doc_birth_cert', label: 'Certidão de Nascimento' },
  { field: 'doc_income_tax_receipt', label: 'Recibo de Entrega do IR (Imposto de Renda)' },
  { field: 'doc_income_tax_full', label: 'Declaração Completa do IR' },
  { field: 'doc_work_card', label: 'Carteira de Trabalho Digital + Extratos de Vínculos' },
  { field: 'doc_payslip', label: 'Demonstrativo de Pagamento / Holerite' },
  { field: 'doc_caixa_simulator', label: 'Simulador Habitacional CAIXA (Resultado Detalhado)' },
];

export default function ClientFolder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const leadId = id!;

  const { data: lead } = useLead(leadId);
  const { data: existingFolder, isLoading } = useClientFolder(leadId);
  const upsert = useUpsertClientFolder();
  const submit = useSubmitClientFolder();
  const uploadDoc = useUploadDocument();
  const downloadFolder = useDownloadClientFolder();
  const { closeChat } = useGlobalUI();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<ClientFolderData>>({});
  const [autoSaveTimer, setAutoSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  // Estado do painel split de chat
  const [splitChatOpen, setSplitChatOpen] = useState(false);
  // Usado para scroll automático até o campo de doc quando importado do chat
  const [highlightedDoc, setHighlightedDoc] = useState<string | null>(null);

  // Preview de arquivo
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('other');
  const [previewName, setPreviewName] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Seleção de destino ao importar arquivo do chat
  type PendingAttachment = { url: string; fileName: string; fileType: string };
  const [pendingChatAttachment, setPendingChatAttachment] = useState<PendingAttachment | null>(null);
  const [assigningField, setAssigningField] = useState<string | null>(null); // field sendo salvo

  // Carregar dados existentes quando a query resolver
  useEffect(() => {
    if (existingFolder) {
      setForm(existingFolder);
    } else if (lead) {
      setForm({
        lead_id: leadId,
        proponent_name: lead.name,
        phone_mobile: lead.phone,
        email_proponent: lead.email,
      });
    }
  }, [existingFolder, lead, leadId]);

  // AutoSave com debounce 1.5s
  const triggerSave = useCallback((updates: Partial<ClientFolderData>) => {
    const merged = { ...form, ...updates, lead_id: leadId };
    setForm(merged);

    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    const timer = setTimeout(() => {
      upsert.mutate(merged as ClientFolderData);
    }, 1500);
    setAutoSaveTimer(timer);
  }, [form, leadId, autoSaveTimer, upsert]);

  const update = (key: keyof ClientFolderData, value: unknown) => {
    triggerSave({ [key]: value });
  };

  // Validação de campos obrigatórios por step
  const validateStep = (stepIndex: number): boolean => {
    const f = form;
    switch (stepIndex) {
      case 0: return !!(f.property_value && f.financing_type && f.proponent_name && f.proponent_cpf && f.proponent_pis && (!f.has_participant || (f.participant_name && f.participant_cpf && f.participant_pis)));
      case 1: return f.fgts_three_years !== undefined && f.use_fgts !== undefined && !!(f.proponent_marital_status && f.proponent_education);
      case 2: {
        const baseContactValid = !!(f.phone_mobile && f.email_proponent && f.proponent_property_type);
        const propIncomeValid = !!((f.income_formal_pro_value && f.income_formal_pro_value > 0) || (f.income_informal_pro_value && f.income_informal_pro_value > 0));
        const parIncomeValid = !f.has_participant || !!((f.income_formal_par_value && f.income_formal_par_value > 0) || (f.income_informal_par_value && f.income_informal_par_value > 0));
        const depsValid = !f.has_dependents || !!(f.dependents_count && f.dependents_count > 0);
        return !!(baseContactValid && propIncomeValid && parIncomeValid && depsValid);
      }
      case 3: return REQUIRED_DOCS.every(d => !!f[d.field]);
      default: return false;
    }
  };

  // ===== Handler: arquivo importado do chat ====
  // Abre o dialog de seleção de destino para o usuário escolher em qual campo salvar.
  // O download via proxy (resolução de CORS) acontece apenas depois da escolha.
  const handleAttachFromChat = useCallback((url: string, fileName: string, fileType: string) => {
    setStep(3);
    setPendingChatAttachment({ url, fileName, fileType });
  }, []);

  // ===== Confirma a escolha do campo e faz o upload =====
  const handleAssignToField = useCallback(async (field: string) => {
    if (!pendingChatAttachment) return;
    const { url, fileName } = pendingChatAttachment;
    setAssigningField(field);

    try {
      // Usa proxy CORS autenticado
      const session = (await supabase.auth.getSession()).data.session;
      const proxyUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatwoot-api?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (!response.ok) throw new Error('Falha ao baixar arquivo');
      const blob = await response.blob();
      const file = new File([blob], fileName || `arquivo_chat_${Date.now()}`, { type: blob.type });

      uploadDoc.mutate(
        { leadId, field, file },
        {
          onSuccess: (path) => {
            const docLabel = REQUIRED_DOCS.find(d => d.field === field)?.label || field;
            setForm(prev => ({ ...prev, [field]: path }));
            setHighlightedDoc(field);
            setPendingChatAttachment(null);
            setAssigningField(null);
            toast.success(`Arquivo salvo em: ${docLabel}`);
            setTimeout(() => setHighlightedDoc(null), 3000);
          },
          onError: () => {
            setAssigningField(null);
            toast.error('Erro ao importar arquivo do chat.');
          },
        }
      );
    } catch {
      setAssigningField(null);
      toast.error('Não foi possível baixar o arquivo. Tente novamente.');
    }
  }, [pendingChatAttachment, leadId, uploadDoc]);

  // ===== Preview de arquivo já anexado =====
  const openPreview = useCallback(async (storagePath: string, label: string) => {
    setPreviewLoading(true);
    setPreviewName(label);
    setPreviewUrl(null);
    try {
      const { data } = await supabase.storage
        .from('client_documents')
        .createSignedUrl(storagePath, 300);
      if (!data?.signedUrl) throw new Error('URL não gerada');
      const lower = storagePath.toLowerCase();
      const type: 'image' | 'pdf' | 'other' =
        /\.(jpg|jpeg|png|gif|webp|bmp)$/.test(lower) ? 'image'
        : lower.endsWith('.pdf') ? 'pdf'
        : 'other';
      setPreviewType(type);
      setPreviewUrl(data.signedUrl);
    } catch {
      toast.error('Não foi possível gerar o link de visualização.');
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const allStepsValid = [0, 1, 2, 3].every(i => validateStep(i));
  const isCompleted = form.folder_status === 'completed';
  const hasChatwootChat = !!(lead?.chatwoot_conversation_id);

  const handleSubmit = async () => {
    if (!allStepsValid) return;

    // Gerar signed URLs para todos os documentos
    const signedUrls: Record<string, string> = {};
    for (const doc of REQUIRED_DOCS) {
      const path = form[doc.field] as string | null;
      if (path) {
        const { data } = await supabase.storage
          .from('client_documents')
          .createSignedUrl(path, 3600); // válida por 1h
        if (data?.signedUrl) {
          signedUrls[doc.field] = data.signedUrl;
        }
      }
    }

    submit.mutate(
      { folder: form as ClientFolderData, signedUrls },
      {
        onSuccess: () => {
          toast.success('Pasta do cliente criada com sucesso no servidor!');
          setForm(prev => ({ ...prev, folder_status: 'completed' }));
        },
        onError: (err) => {
          toast.error(err.message || 'Erro ao criar pasta. Verifique com o suporte.');
        }
      }
    );
  };

  if (isLoading) return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </AppLayout>
  );

  const inputCls = "h-12 rounded-2xl bg-white/60 dark:bg-stone-950/40 border-border/40 dark:border-white/10 font-bold text-foreground dark:text-white";
  const labelCls = "text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 ml-1";
  const sectionTitle = (text: string) => (
    <div className="border-b border-border/40 dark:border-white/5 pb-3 mb-6">
      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/60">{text}</h3>
    </div>
  );

  return (
    <>
    {/* ===== MODAL PREVIEW DE ARQUIVO ===== */}
    <Dialog open={!!previewUrl} onOpenChange={(o) => { if (!o) setPreviewUrl(null); }}>
      <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="flex flex-col h-full rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl">
          <DialogHeader className="px-6 py-4 border-b border-border/20 flex flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-foreground/70 truncate flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              {previewName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary/70 hover:text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-primary/5 border border-primary/20 hover:border-primary/40"
                >
                  <Download className="h-3.5 w-3.5" /> Baixar
                </a>
              )}
              <button
                onClick={() => setPreviewUrl(null)}
                className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center transition-colors group"
              >
                <X className="h-4 w-4 text-zinc-400 group-hover:text-red-500" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4">
            {previewType === 'image' && (
              <img src={previewUrl!} alt={previewName} className="max-h-full max-w-full object-contain rounded-xl shadow-xl" />
            )}
            {previewType === 'pdf' && (
              <iframe
                src={previewUrl!}
                title={previewName}
                className="w-full h-full rounded-xl border-0"
              />
            )}
            {previewType === 'other' && (
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="h-24 w-24 rounded-[2rem] bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <FileText className="h-12 w-12 text-amber-500" />
                </div>
                <div>
                  <p className="font-black text-foreground text-sm">{previewName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Este tipo de arquivo não pode ser visualizado aqui.</p>
                </div>
                <a
                  href={previewUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20"
                >
                  <Download className="h-4 w-4" /> Abrir / Baixar arquivo
                </a>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* ===== DIALOG: ESCOLHA DE DESTINO (chat → pasta) ===== */}
    <Dialog open={!!pendingChatAttachment} onOpenChange={(o) => { if (!o) setPendingChatAttachment(null); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden border-none bg-transparent shadow-none">
        <div className="rounded-[2rem] overflow-hidden bg-white dark:bg-zinc-900 shadow-2xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/20">
            <DialogTitle className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shrink-0">
                <FolderOpen className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-black text-foreground">Onde deseja salvar?</p>
                <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 truncate max-w-[300px]">
                  {pendingChatAttachment?.fileName}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
            {REQUIRED_DOCS.map((doc) => {
              const isFilled = !!form[doc.field];
              const isAssigning = assigningField === (doc.field as string);
              return (
                <button
                  key={doc.field as string}
                  disabled={!!assigningField}
                  onClick={() => handleAssignToField(doc.field as string)}
                  className={cn(
                    'w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all',
                    isAssigning
                      ? 'border-amber-500 bg-amber-500/10'
                      : isFilled
                      ? 'border-emerald-500/30 bg-emerald-500/5 hover:border-amber-500/50 hover:bg-amber-500/5'
                      : 'border-border/40 dark:border-white/10 hover:border-amber-500/50 hover:bg-amber-500/5',
                    !!assigningField && !isAssigning && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
                    isAssigning ? 'bg-amber-500/20' : isFilled ? 'bg-emerald-500/10' : 'bg-black/5 dark:bg-white/5'
                  )}>
                    {isAssigning
                      ? <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
                      : isFilled
                      ? <FileCheck className="h-4 w-4 text-emerald-600" />
                      : <UploadCloud className="h-4 w-4 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-[12px] font-bold truncate',
                      isAssigning ? 'text-amber-700 dark:text-amber-400' : isFilled ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                    )}>
                      {doc.label}
                    </p>
                    {isFilled && !isAssigning && (
                      <p className="text-[10px] text-muted-foreground/60">Já preenchido — será substituído</p>
                    )}
                    {isAssigning && (
                      <p className="text-[10px] text-amber-600 font-black">Salvando...</p>
                    )}
                  </div>
                  {!isAssigning && (
                    <span className={cn(
                      'text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border shrink-0',
                      isFilled ? 'border-amber-500/30 text-amber-600 bg-amber-500/5' : 'border-border/40 text-muted-foreground/50'
                    )}>
                      {isFilled ? 'Substituir' : 'Selecionar'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="px-4 pb-4">
            <button
              onClick={() => setPendingChatAttachment(null)}
              disabled={!!assigningField}
              className="w-full py-3 rounded-2xl border border-border/40 text-xs font-black uppercase tracking-widest text-muted-foreground hover:bg-muted/50 transition-all disabled:opacity-40"
            >
              Cancelar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    <AppLayout>
      {/* LAYOUT SPLIT: quando splitChatOpen=true o formulário ocupa 55% e o chat 45% */}
      <div className={cn(
        "flex transition-all duration-300",
        splitChatOpen ? "h-[calc(100vh-64px)]" : ""
      )}>

        {/* ===== PAINEL DO FORMULÁRIO ===== */}
        <div className={cn(
          "transition-all duration-300 overflow-y-auto",
          splitChatOpen
            ? "w-[55%] border-r border-border/40 dark:border-white/5"
            : "w-full"
        )}>
          <div className={cn(
            "mx-auto pb-24 pt-10 px-6 space-y-8 animate-fade-in",
            splitChatOpen ? "max-w-full" : "max-w-[900px]"
          )}>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <Button variant="ghost" onClick={() => navigate(-1)} className="h-12 w-12 rounded-2xl bg-white/40 dark:bg-white/5 border border-border/40 dark:border-white/10 shadow-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full">Pasta do Cliente</span>
                  {lead?.service_order_number && <span className="text-[9px] font-black tracking-widest text-muted-foreground/50">{lead.service_order_number}</span>}
                  {upsert.isPending && <span className="text-[9px] text-muted-foreground/40 animate-pulse">Salvando rascunho...</span>}
                </div>
                <h1 className="text-3xl font-heading font-black italic uppercase tracking-tighter text-foreground">
                  {lead?.name || 'Cliente'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Botão Chat Integrado */}
              {hasChatwootChat && (
                <Button
                  onClick={() => {
                    // Fecha o modal global caso esteja aberto em outro lugar
                    closeChat();
                    setSplitChatOpen(prev => !prev);
                  }}
                  className={cn(
                    "h-12 px-5 rounded-2xl gap-2 font-black text-xs uppercase tracking-widest border transition-all",
                    splitChatOpen
                      ? "bg-emerald-500 text-white border-emerald-500 shadow-xl shadow-emerald-500/20"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                  {splitChatOpen ? 'Fechar Chat' : 'Abrir Chat'}
                  {splitChatOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              )}

              {isCompleted && (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-500/10 px-4 py-2 rounded-2xl border border-emerald-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-xs font-black uppercase tracking-widest">Pasta Gerada</span>
                </div>
              )}
            </div>
          </div>

        {/* Step Indicators */}
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-4 px-3 transition-all border-b-2",
                step === i
                  ? "border-amber-500 text-amber-600"
                  : validateStep(i)
                  ? "border-emerald-500/50 text-emerald-600"
                  : "border-border/40 dark:border-white/5 text-muted-foreground/40"
              )}
            >
              <div className="flex items-center gap-2">
                <span>{s.icon}</span>
                {validateStep(i) && i !== step && <CheckCircle2 className="h-3 w-3" />}
              </div>
              <span className="text-[9px] font-black uppercase tracking-widest hidden sm:block">{s.label}</span>
              <span className="text-[8px] font-black uppercase tracking-widest sm:hidden">{i + 1}</span>
            </button>
          ))}
        </div>

        {/* Panel */}
        <div className="glass-panel rounded-[2.5rem] bg-white/40 dark:bg-stone-950/40 border border-border/40 dark:border-white/10 shadow-2xl overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="p-8 md:p-12 space-y-8"
            >
              {/* ===== STEP 0: Dados Iniciais + Dados Pessoais ===== */}
              {step === 0 && (
                <>
                  {sectionTitle('Dados Iniciais do Financiamento')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className={labelCls}>Valor do Imóvel *</Label>
                      <Input type="number" placeholder="R$ 0,00" className={inputCls} value={form.property_value || ''} onChange={e => update('property_value', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Tipo de Financiamento / Modalidade *</Label>
                      <Select value={form.financing_type || ''} onValueChange={v => update('financing_type', v)}>
                        <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {FINANCING_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Responsável</Label>
                      <Input className={inputCls} placeholder="Nome do responsável" value={form.responsible_name || ''} onChange={e => update('responsible_name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Contato</Label>
                      <Input className={inputCls} placeholder="Contato" value={form.contact || ''} onChange={e => update('contact', e.target.value)} />
                    </div>
                  </div>

                  {sectionTitle('Dados Pessoais – Proponente')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <Label className={labelCls}>Nome Proponente *</Label>
                      <Input className={inputCls} value={form.proponent_name || ''} onChange={e => update('proponent_name', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>CPF (Proponente) *</Label>
                      <Input className={inputCls} placeholder="000.000.000-00" value={form.proponent_cpf || ''} onChange={e => update('proponent_cpf', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Número de PIS (Proponente) *</Label>
                      <Input className={inputCls} placeholder="000.00000.00-0" value={form.proponent_pis || ''} onChange={e => update('proponent_pis', e.target.value)} />
                    </div>
                  </div>

                  {sectionTitle('Dados Pessoais – Participante')}
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/40 dark:border-white/5">
                    <Switch checked={!!form.has_participant} onCheckedChange={v => update('has_participant', v)} />
                    <div>
                      <Label className="text-sm font-bold text-foreground">Há Participante?</Label>
                      <p className="text-xs text-muted-foreground">Se sim, preencha os dados abaixo.</p>
                    </div>
                  </div>

                  {form.has_participant && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <Label className={labelCls}>Nome Participante *</Label>
                        <Input className={inputCls} value={form.participant_name || ''} onChange={e => update('participant_name', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>CPF (Participante) *</Label>
                        <Input className={inputCls} placeholder="000.000.000-00" value={form.participant_cpf || ''} onChange={e => update('participant_cpf', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label className={labelCls}>Número de PIS (Participante) *</Label>
                        <Input className={inputCls} placeholder="000.00000.00-0" value={form.participant_pis || ''} onChange={e => update('participant_pis', e.target.value)} />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ===== STEP 1: FGTS + Estado Civil + Grau de Instrução ===== */}
              {step === 1 && (
                <>
                  {sectionTitle('FGTS')}
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/40 dark:border-white/5">
                      <div>
                        <p className="font-bold text-sm">3 anos de trabalho sob regime FGTS? *</p>
                        <p className="text-xs text-muted-foreground">(somando todos os períodos trabalhados)</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={() => update('fgts_three_years', true)} className={cn("px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all border", form.fgts_three_years === true ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/30 dark:bg-white/5 border-border/40 dark:border-white/10 text-muted-foreground")}>SIM</button>
                        <button onClick={() => update('fgts_three_years', false)} className={cn("px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all border", form.fgts_three_years === false ? "bg-red-500 text-white border-red-500" : "bg-white/30 dark:bg-white/5 border-border/40 dark:border-white/10 text-muted-foreground")}>NÃO</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/40 dark:border-white/5">
                      <p className="font-bold text-sm">Uso do FGTS? *</p>
                      <div className="flex gap-4">
                        <button onClick={() => update('use_fgts', true)} className={cn("px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all border", form.use_fgts === true ? "bg-emerald-500 text-white border-emerald-500" : "bg-white/30 dark:bg-white/5 border-border/40 dark:border-white/10 text-muted-foreground")}>SIM</button>
                        <button onClick={() => update('use_fgts', false)} className={cn("px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all border", form.use_fgts === false ? "bg-red-500 text-white border-red-500" : "bg-white/30 dark:bg-white/5 border-border/40 dark:border-white/10 text-muted-foreground")}>NÃO</button>
                      </div>
                    </div>

                    {form.use_fgts && (
                      <div className="space-y-2">
                        <Label className={labelCls}>Valor do FGTS (R$)</Label>
                        <Input type="number" className={inputCls} placeholder="R$ 0,00" value={form.fgts_value || ''} onChange={e => update('fgts_value', Number(e.target.value))} />
                      </div>
                    )}
                  </div>

                  {sectionTitle('Estado Civil')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className={labelCls}>Proponente *</Label>
                      <Select value={form.proponent_marital_status || ''} onValueChange={v => update('proponent_marital_status', v)}>
                        <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {MARITAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.has_participant && (
                      <div className="space-y-2">
                        <Label className={labelCls}>Participante</Label>
                        <Select value={form.participant_marital_status || ''} onValueChange={v => update('participant_marital_status', v)}>
                          <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {MARITAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {sectionTitle('Grau de Instrução')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className={labelCls}>Proponente *</Label>
                      <Select value={form.proponent_education || ''} onValueChange={v => update('proponent_education', v)}>
                        <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          {EDUCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {form.has_participant && (
                      <div className="space-y-2">
                        <Label className={labelCls}>Participante</Label>
                        <Select value={form.participant_education || ''} onValueChange={v => update('participant_education', v)}>
                          <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {EDUCATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ===== STEP 2: Contatos + Rendas + Imóveis + Bancário ===== */}
              {step === 2 && (
                <>
                  {sectionTitle('Contatos')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className={labelCls}>Celular (DDD) *</Label>
                      <Input className={inputCls} placeholder="(00) 00000-0000" value={form.phone_mobile || ''} onChange={e => update('phone_mobile', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Telefone residencial (DDD)</Label>
                      <Input className={inputCls} placeholder="(00) 0000-0000" value={form.phone_residential || ''} onChange={e => update('phone_residential', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Telefone para recado (DDD)</Label>
                      <Input className={inputCls} placeholder="(00) 0000-0000" value={form.phone_message || ''} onChange={e => update('phone_message', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className={labelCls}>Email Proponente *</Label>
                      <Input type="email" className={inputCls} value={form.email_proponent || ''} onChange={e => update('email_proponent', e.target.value)} />
                    </div>
                    {form.has_participant && (
                      <div className="space-y-2">
                        <Label className={labelCls}>Email Participante</Label>
                        <Input type="email" className={inputCls} value={form.email_participant || ''} onChange={e => update('email_participant', e.target.value)} />
                      </div>
                    )}
                  </div>

                  {sectionTitle('Rendas – Proponente')}
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Renda Comprovada</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label className={labelCls}>Profissão / Função</Label><Input className={inputCls} value={form.income_formal_pro_job || ''} onChange={e => update('income_formal_pro_job', e.target.value)} /></div>
                        <div className="space-y-2"><Label className={labelCls}>Data de Início</Label><Input type="date" className={inputCls} value={form.income_formal_pro_start || ''} onChange={e => update('income_formal_pro_start', e.target.value)} /></div>
                        <div className="space-y-2"><Label className={labelCls}>Valor (R$)</Label><Input type="number" className={inputCls} value={form.income_formal_pro_value || ''} onChange={e => update('income_formal_pro_value', Number(e.target.value))} /></div>
                      </div>
                    </div>
                    <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Renda Informal</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2"><Label className={labelCls}>Profissão / Função</Label><Input className={inputCls} value={form.income_informal_pro_job || ''} onChange={e => update('income_informal_pro_job', e.target.value)} /></div>
                        <div className="space-y-2"><Label className={labelCls}>Data de Início</Label><Input type="date" className={inputCls} value={form.income_informal_pro_start || ''} onChange={e => update('income_informal_pro_start', e.target.value)} /></div>
                        <div className="space-y-2"><Label className={labelCls}>Valor (R$)</Label><Input type="number" className={inputCls} value={form.income_informal_pro_value || ''} onChange={e => update('income_informal_pro_value', Number(e.target.value))} /></div>
                      </div>
                    </div>
                  </div>

                  {form.has_participant && (
                    <>
                      {sectionTitle('Rendas – Participante')}
                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Renda Comprovada</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2"><Label className={labelCls}>Profissão / Função</Label><Input className={inputCls} value={form.income_formal_par_job || ''} onChange={e => update('income_formal_par_job', e.target.value)} /></div>
                            <div className="space-y-2"><Label className={labelCls}>Data de Início</Label><Input type="date" className={inputCls} value={form.income_formal_par_start || ''} onChange={e => update('income_formal_par_start', e.target.value)} /></div>
                            <div className="space-y-2"><Label className={labelCls}>Valor (R$)</Label><Input type="number" className={inputCls} value={form.income_formal_par_value || ''} onChange={e => update('income_formal_par_value', Number(e.target.value))} /></div>
                          </div>
                        </div>
                        <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
                          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60">Renda Informal</p>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2"><Label className={labelCls}>Profissão / Função</Label><Input className={inputCls} value={form.income_informal_par_job || ''} onChange={e => update('income_informal_par_job', e.target.value)} /></div>
                            <div className="space-y-2"><Label className={labelCls}>Data de Início</Label><Input type="date" className={inputCls} value={form.income_informal_par_start || ''} onChange={e => update('income_informal_par_start', e.target.value)} /></div>
                            <div className="space-y-2"><Label className={labelCls}>Valor (R$)</Label><Input type="number" className={inputCls} value={form.income_informal_par_value || ''} onChange={e => update('income_informal_par_value', Number(e.target.value))} /></div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {sectionTitle('Tipo de Imóvel Possuído *')}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className={labelCls}>Proponente *</Label>
                      <Select value={form.proponent_property_type || ''} onValueChange={v => update('proponent_property_type', v)}>
                        <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent className="rounded-2xl">{PROPERTY_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {form.has_participant && (
                      <div className="space-y-2">
                        <Label className={labelCls}>Participante</Label>
                        <Select value={form.participant_property_type || ''} onValueChange={v => update('participant_property_type', v)}>
                          <SelectTrigger className={inputCls}><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                          <SelectContent className="rounded-2xl">{PROPERTY_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {sectionTitle('Dados Bancários e Dependentes')}
                  <div className="space-y-6">
                    <div className="p-6 rounded-2xl bg-black/5 dark:bg-white/5 space-y-4">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 mb-4">Conta Corrente CAIXA</p>
                      <div className="flex gap-4 mb-4">
                        <button onClick={() => update('bank_account_holder', 'proponent')} className={cn("flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all", form.bank_account_holder === 'proponent' ? "bg-amber-500 text-white border-amber-500" : "border-border/40 dark:border-white/10 text-muted-foreground")}>Proponente</button>
                        <button onClick={() => update('bank_account_holder', 'participant')} className={cn("flex-1 py-3 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all", form.bank_account_holder === 'participant' ? "bg-amber-500 text-white border-amber-500" : "border-border/40 dark:border-white/10 text-muted-foreground")}>Participante</button>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className={labelCls}>Agência</Label><Input className={inputCls} value={form.bank_agency || ''} onChange={e => update('bank_agency', e.target.value)} /></div>
                        <div className="space-y-2"><Label className={labelCls}>Número da Conta</Label><Input className={inputCls} value={form.bank_account_number || ''} onChange={e => update('bank_account_number', e.target.value)} /></div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 p-5 rounded-2xl bg-white/50 dark:bg-white/5 border border-border/40 dark:border-white/5">
                      <Switch checked={!!form.has_dependents} onCheckedChange={v => update('has_dependents', v)} />
                      <div className="flex-1">
                        <Label className="text-sm font-bold text-foreground">Possui Dependentes?</Label>
                      </div>
                      {form.has_dependents && (
                        <div className="w-32">
                          <Input type="number" min={1} className={inputCls} placeholder="Nº" value={form.dependents_count || ''} onChange={e => update('dependents_count', Number(e.target.value))} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* ===== STEP 3: Documentos ===== */}
              {step === 3 && (
                <>
                  {sectionTitle('Documentos Obrigatórios – Todos os 8 são necessários')}
                  {splitChatOpen && (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 mb-2">
                      <MessageSquare className="h-5 w-5 text-emerald-600 shrink-0" />
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        💡 No chat ao lado, clique em <strong>"Uso na Pasta"</strong> abaixo de qualquer arquivo para importá-lo automaticamente aqui.
                      </p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {REQUIRED_DOCS.map((doc) => {
                      const uploaded = !!form[doc.field];
                      const isHighlighted = highlightedDoc === (doc.field as string);
                      const storagePath = form[doc.field] as string | null;
                      return (
                        <div key={doc.field as string} className={cn(
                          "flex items-center gap-4 p-5 rounded-2xl border transition-all duration-500",
                          isHighlighted
                            ? "border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30 scale-[1.01]"
                            : uploaded
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/40 dark:border-white/10 bg-white/30 dark:bg-white/5"
                        )}>
                          <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0", isHighlighted ? "bg-amber-500/10" : uploaded ? "bg-emerald-500/10" : "bg-black/5 dark:bg-white/5")}>
                            {uploaded ? <FileCheck className={cn("h-6 w-6", isHighlighted ? "text-amber-600" : "text-emerald-600")} /> : <UploadCloud className="h-6 w-6 text-muted-foreground/40" />}
                          </div>
                          <div className="flex-1">
                            <p className={cn("font-bold text-sm", isHighlighted ? "text-amber-700 dark:text-amber-400" : uploaded ? "text-emerald-700 dark:text-emerald-400" : "text-foreground")}>{doc.label}</p>
                            {uploaded && !isHighlighted && <p className="text-xs text-muted-foreground/60">✓ Arquivo enviado e salvo</p>}
                            {isHighlighted && <p className="text-xs font-black text-amber-600 animate-pulse">⬆ Importado do chat!</p>}
                          </div>
                          {/* Botão Visualizar */}
                          {uploaded && storagePath && (
                            <button
                              onClick={() => openPreview(storagePath, doc.label)}
                              disabled={previewLoading}
                              title="Visualizar arquivo"
                              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-3 py-2.5 rounded-xl border border-primary/20 text-primary/70 hover:bg-primary/5 hover:border-primary/40 hover:text-primary transition-all"
                            >
                              {previewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                              Ver
                            </button>
                          )}
                          {/* Botão Anexar / Substituir */}
                          <label className={cn(
                            "cursor-pointer text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl border transition-all",
                            isHighlighted
                              ? "border-amber-500 text-amber-600 bg-amber-500/10"
                              : uploaded
                              ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                              : "border-amber-500/40 text-amber-600 hover:bg-amber-500/10 bg-amber-500/5"
                          )}>
                            {uploaded ? 'Substituir' : 'Anexar'}
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.webp"
                              className="hidden"
                              disabled={isCompleted}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                uploadDoc.mutate(
                                  { leadId, field: doc.field as string, file },
                                  {
                                    onSuccess: (path) => {
                                      setForm(prev => ({ ...prev, [doc.field]: path }));
                                      toast.success('Documento salvo!');
                                    },
                                    onError: () => toast.error('Erro ao enviar documento.'),
                                  }
                                );
                              }}
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

            </motion.div>
          </AnimatePresence>

          {/* Navegação dos Steps */}
          <div className="px-8 md:px-12 pb-8 flex items-center justify-between border-t border-border/40 dark:border-white/5 pt-6">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep(s => s - 1)} className="gap-2 rounded-2xl">
              <ArrowLeft className="h-4 w-4" /> Anterior
            </Button>

            <div className="flex gap-2">
              {STEPS.map((_, i) => (
                <div key={i} className={cn("h-2 rounded-full transition-all", step === i ? "w-8 bg-amber-500" : validateStep(i) ? "w-2 bg-emerald-500" : "w-2 bg-border/40 dark:bg-white/10")} />
              ))}
            </div>

            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(s => s + 1)} className="gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest">
                Próximo <ArrowRight className="h-4 w-4" />
              </Button>
            ) : isCompleted ? (
              <Button
                onClick={() => downloadFolder.mutate(id!)}
                disabled={downloadFolder.isPending}
                className="gap-2 rounded-2xl font-black text-xs uppercase tracking-widest px-8 h-12 transition-all bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20"
              >
                {downloadFolder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Baixar Pasta
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!allStepsValid || submit.isPending}
                className={cn(
                  "gap-2 rounded-2xl font-black text-xs uppercase tracking-widest px-8 h-12 transition-all",
                  allStepsValid
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-600/20"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                )}
              >
                {submit.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Enviando (aguarde ~30s)...</>
                ) : (
                  <><FolderPlus className="h-4 w-4" /> Criar Pasta do Cliente</>
                )}
              </Button>
            )}
          </div>
        </div>

          {/* Aviso de progresso incompleto */}
          {step === 3 && !allStepsValid && (
            <div className="flex items-center gap-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p className="text-sm font-bold">Preencha todos os campos obrigatórios nas etapas anteriores e anexe todos os 8 documentos para habilitar o envio.</p>
            </div>
          )}

          </div>{/* fim inner div */}
        </div>{/* fim painel formulário */}

        {/* ===== PAINEL DO CHAT (Split) ===== */}
        <AnimatePresence>
          {splitChatOpen && lead?.chatwoot_conversation_id && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '45%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="h-full border-l border-border/40 dark:border-white/5 overflow-hidden shrink-0 bg-white dark:bg-stone-950 shadow-xl"
            >
              <ChatCore
                conversationId={lead.chatwoot_conversation_id}
                contactName={lead.name}
                isOpen={splitChatOpen}
                onClose={() => setSplitChatOpen(false)}
                onAttachFromChat={handleAttachFromChat}
                compact={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

      </div>{/* fim flex container split */}
    </AppLayout>
    </>
  );
}
