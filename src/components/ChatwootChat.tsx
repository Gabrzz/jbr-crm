import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send, MessageSquare, Mic, Paperclip, X, FileText, Smile,
  Square, Trash2, ZoomIn, Download, ExternalLink, Loader2, FolderInput
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chatwoot-api`;

interface Attachment {
  url: string;
  data_url?: string;
  file_type?: string;
  name?: string;
  thumb_url?: string;
}

interface Message {
  id: number;
  content: string | null;
  message_type: number;
  created_at: number;
  attachments?: Attachment[];
}

function getAttachmentType(att: Attachment): 'image' | 'audio' | 'file' {
  const ft = (att.file_type || '').toLowerCase();
  if (ft === 'image' || ft.startsWith('image/')) return 'image';
  if (ft === 'audio' || ft.startsWith('audio/')) return 'audio';
  if (ft === 'video/webm' || ft === 'application/octet-stream') {
    const hint = (att.url || att.name || '').toLowerCase();
    if (hint.includes('audio') || hint.endsWith('.webm') || hint.endsWith('.ogg')) return 'audio';
  }
  const url = (att.data_url || att.url || '').toLowerCase().split('?')[0];
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(url)) return 'image';
  if (/\.(ogg|mp3|wav|aac|opus|m4a|webm|flac|mpeg)$/.test(url)) return 'audio';
  return 'file';
}

function getBestUrl(att: Attachment): string {
  return att.data_url || att.url;
}

// ============================================================
// Componente de Anexo — com botão extra "Usar como Documento" no modo split
// ============================================================

function MessageAttachment({
  att,
  onAttachFromChat,
}: {
  att: Attachment;
  onAttachFromChat?: (url: string, fileName: string, fileType: string) => void;
}) {
  const type = getAttachmentType(att);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const fullSrc = getBestUrl(att);
  const fileName = att.name || `arquivo_${Date.now()}`;

  const attachButton = onAttachFromChat ? (
    <button
      title="Usar como documento na Pasta do Cliente"
      onClick={() => onAttachFromChat(fullSrc, fileName, att.file_type || 'application/octet-stream')}
      className="flex items-center gap-1.5 mt-2 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-lg transition-all"
    >
      <FolderInput className="h-3 w-3" /> Uso na Pasta
    </button>
  ) : null;

  if (type === 'image') {
    const thumbSrc = att.thumb_url || fullSrc;
    return (
      <>
        <div className="mt-1 space-y-1">
          <div className="relative group cursor-pointer inline-block" onClick={() => setLightboxOpen(true)}>
            <img src={thumbSrc} alt={att.name || 'Imagem'} className="max-w-[240px] rounded-xl object-cover hover:opacity-90 transition" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition rounded-xl flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition drop-shadow-lg" />
            </div>
          </div>
          {attachButton}
        </div>
        {lightboxOpen && (
          <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setLightboxOpen(false)}>
            <div className="relative max-w-5xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <div className="absolute -top-10 right-0 flex gap-2 z-10">
                <a href={fullSrc} download target="_blank" rel="noreferrer" className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition" title="Baixar">
                  <Download className="h-5 w-5" />
                </a>
                <button onClick={() => setLightboxOpen(false)} className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <img src={fullSrc} alt={att.name || 'Imagem'} className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl" />
            </div>
          </div>
        )}
      </>
    );
  }

  if (type === 'audio') {
    return (
      <div className="mt-1 space-y-1">
        <div className="bg-black/10 rounded-xl px-3 py-2 min-w-[200px] max-w-[300px]">
          <audio controls preload="metadata" className="w-full" style={{ height: 36 }}>
            <source src={fullSrc} />
          </audio>
          <a href={fullSrc} target="_blank" rel="noreferrer" className="block text-[10px] text-center mt-1 text-primary/70 hover:text-primary hover:underline">
            Não reproduz? Clique para abrir externamente
          </a>
        </div>
        {attachButton}
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      <a href={fullSrc} target="_blank" rel="noreferrer"
        className="flex items-center gap-2 bg-black/10 hover:bg-black/20 transition rounded-xl px-3 py-2 text-xs group">
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate flex-1">{att.name || 'Arquivo'}</span>
        <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-70 transition shrink-0" />
      </a>
      {attachButton}
    </div>
  );
}

// ============================================================
// Chat Core — conteúdo do chat sem o Dialog wrapper
// (pode ser renderizado em modo modal ou split)
// ============================================================

interface ChatCoreProps {
  conversationId: string;
  contactName?: string;
  isOpen: boolean;
  onClose: () => void;
  onAttachFromChat?: (url: string, fileName: string, fileType: string) => void;
  compact?: boolean; // true = menos padding, para o modo split
}

export function ChatCore({
  conversationId,
  contactName,
  isOpen,
  onClose,
  onAttachFromChat,
  compact = false,
}: ChatCoreProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg;codecs=opus';
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setRecordedAudio(blob);
          setRecordedAudioUrl(URL.createObjectURL(blob));
        }
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(250);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordedAudio(null);
      setRecordedAudioUrl(null);
      timerIntervalRef.current = setInterval(() => setRecordingTime((p) => p + 1), 1000);
    } catch {
      toast.error('Erro ao acessar microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    audioChunksRef.current = [];
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    setRecordedAudio(null);
    if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const onEmojiClick = (emojiData: EmojiClickData) => setInputText((p) => p + emojiData.emoji);

  const fetchMessages = useCallback(async (silent = false) => {
    if (!conversationId) return;
    if (!silent) setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatwoot-api', {
        method: 'POST',
        body: { action: 'get_messages', conversation_id: conversationId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const raw = data?.payload || data || [];
      const sorted = Array.isArray(raw) ? [...raw].sort((a, b) => a.created_at - b.created_at) : [];
      const filtered = sorted.filter((m: Message) =>
        m.message_type !== 2 && ((m.content && m.content.trim()) || (m.attachments && m.attachments.length > 0))
      );
      setMessages(filtered);
    } catch (err: unknown) {
      if (!silent) toast.error('Erro ao carregar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (!isOpen || !conversationId) return;
    isFirstLoad.current = true;
    fetchMessages(false);
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
  }, [conversationId, isOpen, fetchMessages]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: isFirstLoad.current ? 'auto' : 'smooth' });
    isFirstLoad.current = false;
  }, [messages]);

  useEffect(() => {
    return () => { if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl); };
  }, [recordedAudioUrl]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!inputText.trim() && !attachFile && !recordedAudio) || sending) return;
    setSending(true);
    const tempText = inputText;
    const tempFile = attachFile;
    const tempAudio = recordedAudio;
    setInputText('');
    setAttachFile(null);
    setRecordedAudio(null);
    if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); }

    let tempMsg: Message | null = null;
    if (tempText.trim() && !tempFile && !tempAudio) {
      tempMsg = { id: Date.now(), content: tempText, message_type: 1, created_at: Date.now() / 1000 };
      setMessages((p) => [...p, tempMsg!]);
    }

    try {
      if (tempFile || tempAudio) {
        const session = (await supabase.auth.getSession()).data.session;
        const formData = new FormData();
        formData.append('conversation_id', conversationId!);
        if (tempText.trim()) formData.append('content', tempText);
        if (tempFile) {
          formData.append('file', tempFile, tempFile.name);
        } else if (tempAudio) {
          const ext = tempAudio.type.includes('ogg') ? 'ogg' : 'webm';
          formData.append('file', tempAudio, `audio_${Date.now()}.${ext}`);
        }
        const res = await fetch(SUPABASE_FUNCTIONS_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${session?.access_token}`, 'x-action': 'send_file' },
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Erro no envio');
      } else {
        const { data, error } = await supabase.functions.invoke('chatwoot-api', {
          method: 'POST',
          body: { action: 'send_message', conversation_id: conversationId, content: tempText },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }
      await fetchMessages(true);
      if (tempMsg) setMessages((p) => p.filter((m) => m.id !== tempMsg!.id));
    } catch (err: unknown) {
      toast.error('Erro ao enviar: ' + (err instanceof Error ? err.message : String(err)));
      if (tempMsg) setMessages((p) => p.filter((m) => m.id !== tempMsg!.id));
      setInputText(tempText);
      setAttachFile(tempFile);
      if (tempAudio) setRecordedAudio(tempAudio);
    } finally {
      setSending(false);
    }
  };

  const px = compact ? 'px-4' : 'px-8';

  return (
    <div className="flex flex-col h-full bg-[#fafafa] overflow-hidden">
      {/* Header */}
      <div className={cn("bg-white border-b border-zinc-100 shrink-0", compact ? "px-4 py-4" : "px-8 py-7")}>
        <div className="flex justify-between items-center w-full">
          <div className="flex flex-col gap-1">
            <span className="flex items-center gap-2 text-[#4a0404] font-heading font-black text-lg uppercase tracking-tighter italic">
              <div className="h-8 w-8 rounded-xl bg-[#4a0404]/5 flex items-center justify-center border border-[#4a0404]/10">
                <MessageSquare className="h-4 w-4 text-[#4a0404]" />
              </div>
              {contactName || 'Lead'}
            </span>
            {onAttachFromChat && (
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-amber-600/70 ml-10">
                📎 Clique em "Uso na Pasta" nas mensagens para importar documentos
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5 uppercase border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> On-line
            </span>
            <button onClick={() => { cancelRecording(); onClose(); }}
              className="h-8 w-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors">
              <X className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Mensagens */}
      <ScrollArea className="flex-1 py-4 bg-[#fdfdfd]">
        <div className={cn("space-y-6", px)}>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <div className="h-10 w-10 rounded-full border-t-2 border-[#4a0404] animate-spin" />
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#4a0404]/40">Sincronizando...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-20">
              <div className="h-16 w-16 rounded-[2rem] bg-zinc-100 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 stroke-[1px]" />
              </div>
              <p className="text-[9px] font-black uppercase tracking-[0.4em]">Inicie a conversa</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAgent = msg.message_type === 1;
              return (
                <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'} group/msg`}>
                  <div className={`max-w-[80%] space-y-1 ${isAgent ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className={cn(
                      "rounded-[2rem] px-5 py-3 text-[13px] shadow-sm leading-relaxed",
                      isAgent
                        ? 'bg-[#4a0404] text-white rounded-tr-md font-medium shadow-xl shadow-[#4a0404]/10'
                        : 'bg-white border border-zinc-100 text-zinc-800 rounded-tl-md font-semibold'
                    )}>
                      {msg.content && <p className="whitespace-pre-wrap break-words">{msg.content}</p>}
                      {msg.attachments?.map((att, i) => (
                        <MessageAttachment key={i} att={att} onAttachFromChat={onAttachFromChat} />
                      ))}
                    </div>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest px-2", isAgent ? 'text-[#4a0404]/30' : 'text-zinc-300')}>
                      {new Date(msg.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Preview de arquivo */}
      {(attachFile || recordedAudio) && (
        <div className={cn("py-3 bg-white border border-zinc-100 flex items-center gap-3 text-xs mx-4 rounded-2xl mb-3 shadow-xl shadow-black/[0.02]", px)}>
          {attachFile ? (
            <>
              <div className="h-9 w-9 rounded-xl bg-[#4a0404]/5 flex items-center justify-center border border-[#4a0404]/10 shrink-0">
                <Paperclip className="h-4 w-4 text-[#4a0404]" />
              </div>
              <span className="truncate flex-1 font-black text-[#4a0404] text-[11px]">{attachFile.name}</span>
              <button onClick={() => setAttachFile(null)} className="h-8 w-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors group">
                <X className="h-3.5 w-3.5 text-zinc-300 group-hover:text-red-500" />
              </button>
            </>
          ) : recordedAudio && recordedAudioUrl ? (
            <>
              <div className="h-9 w-9 rounded-xl bg-[#4a0404]/5 flex items-center justify-center border border-[#4a0404]/10 shrink-0">
                <Mic className="h-4 w-4 text-[#4a0404]" />
              </div>
              <audio controls src={recordedAudioUrl} className="h-7 flex-1" preload="auto" />
              <button onClick={cancelRecording} className="h-8 w-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-colors group">
                <Trash2 className="h-3.5 w-3.5 text-zinc-300 group-hover:text-red-500" />
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Input */}
      <div className={cn("pb-6 pt-4 bg-white border-t border-zinc-50 shrink-0", px)}>
        <form onSubmit={handleSend} className="flex flex-col gap-4">
          {isRecording ? (
            <div className="flex items-center justify-between bg-[#4a0404]/5 rounded-2xl px-6 py-4 border border-[#4a0404]/10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-ping absolute opacity-20" />
                  <div className="h-3 w-3 rounded-full bg-red-600 relative border-2 border-white" />
                </div>
                <span className="text-lg font-heading font-black text-[#4a0404] tabular-nums">{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="ghost" size="sm" onClick={cancelRecording} className="text-zinc-400 hover:text-red-500 font-black uppercase text-[9px] tracking-widest h-10 px-4 rounded-xl">
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Descartar
                </Button>
                <Button type="button" size="sm" onClick={stopRecording} className="bg-[#4a0404] text-white font-black uppercase text-[9px] tracking-widest h-10 px-6 rounded-xl">
                  <Square className="h-3.5 w-3.5 mr-1.5 fill-white" /> Finalizar
                </Button>
              </div>
            </div>
          ) : (
            <div className="relative group">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as unknown as React.FormEvent); } }}
                placeholder="Escreva sua mensagem..."
                disabled={sending || !!recordedAudio}
                rows={1}
                className="resize-none border-none focus-visible:ring-0 bg-transparent text-sm font-bold text-zinc-800 py-2 px-0 min-h-[44px] max-h-32 placeholder:text-zinc-200"
              />
              <div className="h-[2px] w-full bg-zinc-100 group-focus-within:bg-[#4a0404]/20 transition-all duration-500" />
            </div>
          )}

          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center">
              {!isRecording && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-[#4a0404] hover:bg-[#4a0404]/5 rounded-xl transition-all" disabled={!!recordedAudio}>
                        <Smile className="h-5 w-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="w-auto p-0 border-none bg-transparent rounded-[2rem] overflow-hidden">
                      <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
                    </PopoverContent>
                  </Popover>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-zinc-400 hover:text-[#4a0404] hover:bg-[#4a0404]/5 rounded-xl transition-all"
                    disabled={!!recordedAudio} onClick={() => { fileInputRef.current!.accept = '*/*'; fileInputRef.current!.click(); }}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setAttachFile(e.target.files?.[0] || null)} />
                </>
              )}
            </div>
            {!isRecording && (
              <div className="flex items-center gap-3">
                {!inputText.trim() && !attachFile && !recordedAudio && (
                  <Button type="button" size="sm" onClick={startRecording} variant="ghost"
                    className="gap-2 rounded-xl h-10 px-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-[#4a0404] hover:bg-[#4a0404]/5 border border-zinc-100 hover:border-[#4a0404]/10">
                    <Mic className="h-4 w-4" /> Áudio
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={sending || (!inputText.trim() && !attachFile && !recordedAudio)}
                  className="gap-2 rounded-2xl h-12 px-7 bg-[#4a0404] hover:bg-[#630606] text-white shadow-xl shadow-[#4a0404]/30 disabled:grayscale disabled:opacity-20 font-black uppercase tracking-widest text-[10px] transition-all hover:scale-[1.03] active:scale-95">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {sending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// ChatwootChat — wrapper que renderiza ChatCore no modo correto
// ============================================================

export function ChatwootChat() {
  const { chatState, closeChat } = useGlobalUI();
  const { conversationId, contactName, isOpen, mode, onAttachFromChat } = chatState;

  if (!isOpen || !conversationId) return null;

  // Modo SPLIT: renderizado inline pelo ClientFolder, não aqui
  if (mode === 'split') return null;

  // Modo MODAL (padrão)
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeChat(); }}>
      <DialogContent className="sm:max-w-3xl h-[85vh] p-0 gap-0 overflow-hidden flex flex-col border-none bg-transparent shadow-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="flex-1 flex flex-col border border-white/60 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden m-4"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Chat com {contactName}</DialogTitle>
          </DialogHeader>
          <ChatCore
            conversationId={conversationId}
            contactName={contactName}
            isOpen={isOpen}
            onClose={closeChat}
            onAttachFromChat={onAttachFromChat}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
