import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentService } from '../services/agent.service';
import { useAgentStore } from '../store/agentStore';
import { useEffect } from 'react';
import { Message } from '../types';

export function useAgent() {
  return useQuery({
    queryKey: ['agent-config'],
    queryFn: agentService.getAgent,
    staleTime: 1000 * 30, // 30 seconds — served from cache across onboarding step transitions
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: agentService.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-config'] });
    },
  });
}

export function useConversations() {
  const setConversations = useAgentStore((state) => state.setConversations);
  
  const query = useQuery({
    queryKey: ['conversations'],
    queryFn: agentService.getConversations,
  });

  useEffect(() => {
    if (query.data) {
      setConversations(query.data);
    }
  }, [query.data, setConversations]);

  return query;
}

export function useMessages(conversationId: string | null) {
  const setMessages = useAgentStore((state) => state.setMessages);
  
  const query = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: () => agentService.getMessages(conversationId!),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (query.data) {
      setMessages(query.data);
    }
  }, [query.data, setMessages]);

  return query;
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const addMessage = useAgentStore((state) => state.addMessage);
  const setThinking = useAgentStore((state) => state.setThinking);
  
  return useMutation({
    mutationFn: async ({ content, conversationId }: { content: string, conversationId?: string }) => {
      // Optimistic update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        conversationId: conversationId || 'temp-conv',
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      
      addMessage(optimisticMessage);
      setThinking(true);
      
      return agentService.sendMessage(content, conversationId);
    },
    onSuccess: (data, variables) => {
      if (!variables.conversationId && data.conversationId) {
        queryClient.invalidateQueries({ queryKey: ['conversations'] }).then(() => {
          const conversations = queryClient.getQueryData(['conversations']) as any[];
          const newConv = conversations?.find((c) => c.id === data.conversationId);
          if (newConv) {
            useAgentStore.getState().setCurrentConversation(newConv);
          } else {
            // fallback if query data isn't ready
            useAgentStore.getState().setCurrentConversation({
              id: data.conversationId,
              tenantId: '',
              title: 'New Conversation',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        });
      }
    },
    onSettled: () => {
      setThinking(false);
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
