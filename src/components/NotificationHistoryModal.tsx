import { Dialog, DialogContent, DialogTitle, DialogHeader } from '@/components/ui/dialog';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { useNotifications, useMarkNotificationRead } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationHistoryModal() {
  const { isNotificationHistoryOpen, closeNotificationHistory, openChat } = useGlobalUI();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();

  if (!isNotificationHistoryOpen) return null;

  const handleNotificationClick = (n: { id: string; read: boolean }) => {
    if (!n.read) {
      markRead.mutate(n.id);
    }
    
    // Simple heuristic: if message mentions "mensagem", try opening chat?
    // In Chatwoot CRM architecture, the backend should ideally send the conversation_id in notification metadata.
    // For now, if we detect conversation keywords we can close history, but we don't have the ID unless we parse it.
    // We'll leave it simple.
  };

  return (
    <Dialog open={isNotificationHistoryOpen} onOpenChange={(open) => !open && closeNotificationHistory()}>
      <DialogContent className="sm:max-w-2xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col glass-panel border-white/20 rounded-[2rem] shadow-2xl">
        <DialogHeader className="px-8 py-6 border-b border-white/10 shrink-0 bg-white/40 dark:bg-black/20">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-2xl text-primary shadow-inner">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="font-heading font-extrabold text-2xl tracking-tight text-foreground">
                Histórico de Notificações
              </DialogTitle>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                Acompanhe o registro de todas as interações e alertas do sistema.
              </p>
            </div>
          </div>
        </DialogHeader>
      
      <ScrollArea className="flex-1 p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/20 flex items-center justify-center mb-6 border border-white/10">
              <BellRing className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <p className="text-lg font-heading font-bold text-muted-foreground/60">Tudo em ordem por aqui.</p>
            <p className="text-sm text-muted-foreground/40 mt-2 max-w-[240px] mx-auto">Não há notificações registradas no momento.</p>
          </div>
        ) : (
          <div className="divide-y divide-border/30 px-2 pb-6">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => handleNotificationClick(n)}
                className={cn(
                  "px-6 py-5 flex gap-5 transition-all cursor-pointer rounded-2xl mx-2 my-1 group",
                  !n.read 
                    ? "bg-amber-500/[0.04] dark:bg-amber-500/[0.08] hover:bg-amber-500/[0.08]" 
                    : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                )}
              >
                <div className="mt-1 shrink-0 relative">
                  <div className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center shadow-sm transition-all group-hover:scale-105",
                    !n.read ? "bg-amber-500/10 text-amber-600" : "bg-muted/40 text-muted-foreground/50"
                  )}>
                    <BellRing className="h-6 w-6" />
                  </div>
                  {!n.read && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-background"></span>
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm leading-relaxed", 
                    !n.read ? "font-bold text-foreground" : "text-muted-foreground font-medium"
                  )}>
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/50 mt-2 uppercase tracking-widest font-extrabold flex items-center gap-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
