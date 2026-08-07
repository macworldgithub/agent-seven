import { create } from 'zustand';
import { Conversation, Message } from '../types';

interface AgentState {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  isThinking: boolean;
  setConversations: (conversations: Conversation[]) => void;
  setCurrentConversation: (conversation: Conversation | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setThinking: (isThinking: boolean) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  conversations: [],
  currentConversation: null,
  messages: [],
  isThinking: false,
  setConversations: (conversations) => set({ conversations }),
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setThinking: (isThinking) => set({ isThinking }),
}));
