import { Bell } from 'lucide-react';
import { useUnreadCount, useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useNotificationRealtime } from '@/hooks/useNotifications';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useGlobalUI } from '@/contexts/GlobalUIContext';
import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Volume2, VolumeX } from 'lucide-react';

interface Props {
  isExpanded: boolean;
}

export function NotificationBell({ isExpanded }: Props) {
  // Ativa o Realtime de Notificações
  useNotificationRealtime();
  
  const { data: unread = 0 } = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const { openNotificationHistory } = useGlobalUI();
  const navigate = useNavigate();
  
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('crm_notifications_muted') === 'true';
  });

  const toggleMute = () => {
    const newValue = !isMuted;
    setIsMuted(newValue);
    localStorage.setItem('crm_notifications_muted', String(newValue));
    toast.success(newValue ? 'Notificações silenciadas' : 'Sons de notificação ativados');
  };

  const handleNotificationClick = useCallback(async (n: { id: string, lead_id?: string | null }) => {
    await markRead.mutateAsync(n.id);
    if (n.lead_id) {
      navigate(`/leads/${n.lead_id}`);
    }
  }, [markRead, navigate]);

  const prevUnreadCount = useRef(unread);
  const audioContextReady = useRef(false);

  // Audio & Document Title Side Effects
  useEffect(() => {
    // 1. Som de Notificação & Toast
    if (unread > prevUnreadCount.current) {
      try {
        // Som moderno de "glass tap/pop"
        if (!isMuted) {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.volume = 0.4;
          audio.play().catch(e => console.warn("Browser blocked audio playback", e));
        }

        // Exibe Toast com a mensagem mais recente e ação de clique
        const latest = notifications[0];
        if (latest && !latest.read) {
          toast.info(latest.message, {
            description: "Clique para ver detalhes do lead.",
            duration: 8000,
            action: latest.lead_id ? {
              label: 'Ver Lead',
              onClick: () => handleNotificationClick(latest)
            } : undefined
          });
        }
      } catch (err) {
         console.warn("Notification error", err);
      }
    }
    prevUnreadCount.current = unread;

    // 2. Document Title (Guia do Site)
    if (unread > 0) {
      document.title = `(${unread}) JBR CRM - Avisos`;
    } else {
      document.title = "JBR CRM";
    }

    // Cleanup title on unmount
    return () => {
      document.title = "JBR CRM";
    };
  }, [unread, notifications, handleNotificationClick, isMuted]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="w-full flex items-center px-0 hover:bg-white/5 rounded-lg transition-colors group relative"
          title={!isExpanded ? "Notificações" : undefined}
        >
          <div className="flex items-center justify-center shrink-0 w-12 h-10 relative">
            <Bell className={cn(
              "h-5 w-5 text-sidebar-foreground/70 group-hover:text-sidebar-foreground transition-all duration-300",
              unread > 0 && "text-amber-500 group-hover:text-amber-400 animate-pulse"
            )} />
            {unread > 0 && (
              <Badge className="absolute top-1.5 right-2 h-4 min-w-[16px] px-1 flex items-center justify-center text-[10px] bg-red-500 text-white animate-bounce shadow-md">
                {unread}
              </Badge>
            )}
          </div>
          <span className={cn(
            "whitespace-nowrap transition-opacity duration-200 text-sm font-medium text-sidebar-foreground/80 group-hover:text-sidebar-foreground shrink-0 ml-2",
            isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            Avisos de Sistema
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 glass-panel border-white/20 shadow-2xl rounded-3xl overflow-hidden" side="right" align="start" sideOffset={15}>
        <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between bg-white/40 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <h4 className="font-heading font-extrabold text-lg text-foreground tracking-tight">Notificações</h4>
            <button 
              onClick={toggleMute} 
              className="text-muted-foreground hover:text-primary transition-all p-1.5 hover:bg-primary/5 rounded-full"
              title={isMuted ? "Ativar som" : "Desativar som"}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-[10px] h-7 font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:bg-amber-500/10 rounded-full px-3 gap-1.5"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                {markAllRead.isPending ? '...' : <><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> Limpar</>}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-[10px] h-7 font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/10 rounded-full px-3"
              onClick={() => openNotificationHistory()}
            >
              Histórico
            </Button>
          </div>
        </div>
        
        <ScrollArea className="h-[380px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <Bell className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Sua caixa está limpa!</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Avisaremos quando houver novidades.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-6 py-4 transition-all relative flex gap-4 group
                    ${!n.read ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.08] dark:bg-amber-500/[0.02]' : 'bg-transparent hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'}
                  `}
                >
                  <div className="mt-1 flex-shrink-0">
                    <div className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-110",
                      !n.read ? "bg-amber-500/10 text-amber-600" : "bg-muted/50 text-muted-foreground"
                    )}>
                      <Bell className="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-[13px] leading-relaxed break-words", 
                      !n.read ? "font-bold text-foreground" : "text-muted-foreground/80 font-medium"
                    )}>
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {unread > 0 && (
          <div className="px-6 py-4 border-t border-border/50 bg-white/40 dark:bg-black/20">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-10 font-bold rounded-xl border-white/20 hover:bg-primary/5 hover:text-primary transition-all shadow-sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              {markAllRead.isPending ? 'Processando...' : `✓ Marcar ${unread} como lidas`}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
