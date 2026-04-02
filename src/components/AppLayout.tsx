import { ReactNode, useState } from 'react';
import { Navbar } from './Navbar';
import { cn } from '@/lib/utils';
import { ChatwootChat } from '@/components/ChatwootChat';
import { NotificationHistoryModal } from '@/components/NotificationHistoryModal';
import { WelcomeModal } from '@/components/WelcomeModal';

export function AppLayout({ children }: { children: ReactNode }) {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebar-pinned');
    return saved !== null ? saved === 'true' : true;
  });

  const togglePin = () => {
    const newState = !isPinned;
    setIsPinned(newState);
    localStorage.setItem('sidebar-pinned', String(newState));
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar isPinned={isPinned} onTogglePin={togglePin} />
      <main className={cn(
        "flex-1 p-6 transition-all duration-300 ease-in-out font-sans",
        isPinned ? "ml-[280px]" : "ml-[110px]"
      )}>
        {children}
      </main>
      <ChatwootChat />
      <NotificationHistoryModal />
      <WelcomeModal />
    </div>
  );
}
