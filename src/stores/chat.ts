import { create } from 'zustand';
import type { Message, ChatSession } from '@/types';

interface ChatState {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  isLoading: boolean;
  addMessage: (message: Message) => void;
  createSession: () => void;
  setCurrentSession: (session: ChatSession | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isLoading: false,

  addMessage: (message) => {
    const { currentSession, sessions } = get();
    if (!currentSession) return;

    const updatedSession = {
      ...currentSession,
      messages: [...currentSession.messages, message],
      updatedAt: new Date(),
    };

    set({
      currentSession: updatedSession,
      sessions: sessions.map((s) =>
        s.id === currentSession.id ? updatedSession : s
      ),
    });
  },

  createSession: () => {
    const newSession: ChatSession = {
      id: crypto.randomUUID(),
      userId: '',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      currentSession: newSession,
    }));
  },

  setCurrentSession: (session) => set({ currentSession: session }),
  setLoading: (isLoading) => set({ isLoading }),
}));
