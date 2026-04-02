import React, { createContext, useContext, useState, ReactNode } from 'react';

export type ChatMode = 'modal' | 'split';

interface ChatState {
  isOpen: boolean;
  conversationId?: string;
  contactName?: string;
  mode: ChatMode;
  onAttachFromChat?: (url: string, fileName: string, fileType: string) => void;
}

interface GlobalUIContextType {
  chatState: ChatState;
  openChat: (conversationId: string, contactName?: string) => void;
  openChatSplit: (
    conversationId: string,
    contactName: string,
    onAttachFromChat: (url: string, fileName: string, fileType: string) => void
  ) => void;
  closeChat: () => void;
  isNotificationHistoryOpen: boolean;
  openNotificationHistory: () => void;
  closeNotificationHistory: () => void;
}

const GlobalUIContext = createContext<GlobalUIContextType | undefined>(undefined);

export function GlobalUIProvider({ children }: { children: ReactNode }) {
  const [chatState, setChatState] = useState<ChatState>({ isOpen: false, mode: 'modal' });
  const [isNotificationHistoryOpen, setIsNotificationHistoryOpen] = useState(false);

  const openChat = (conversationId: string, contactName?: string) => {
    setChatState({ isOpen: true, conversationId, contactName, mode: 'modal' });
  };

  const openChatSplit = (
    conversationId: string,
    contactName: string,
    onAttachFromChat: (url: string, fileName: string, fileType: string) => void
  ) => {
    setChatState({ isOpen: true, conversationId, contactName, mode: 'split', onAttachFromChat });
  };

  const closeChat = () => {
    setChatState({ isOpen: false, mode: 'modal' });
  };

  const openNotificationHistory = () => setIsNotificationHistoryOpen(true);
  const closeNotificationHistory = () => setIsNotificationHistoryOpen(false);

  return (
    <GlobalUIContext.Provider
      value={{
        chatState,
        openChat,
        openChatSplit,
        closeChat,
        isNotificationHistoryOpen,
        openNotificationHistory,
        closeNotificationHistory,
      }}
    >
      {children}
    </GlobalUIContext.Provider>
  );
}

export function useGlobalUI() {
  const context = useContext(GlobalUIContext);
  if (context === undefined) {
    throw new Error('useGlobalUI must be used within a GlobalUIProvider');
  }
  return context;
}
