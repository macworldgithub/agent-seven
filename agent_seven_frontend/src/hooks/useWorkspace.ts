import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workspaceService } from '../services/workspace.service';
import { useWorkspaceStore } from '../store/workspaceStore';
import { useEffect } from 'react';

export function useWorkspaces() {
  const setWorkspaces = useWorkspaceStore((state) => state.setWorkspaces);
  
  const query = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getWorkspaces,
    staleTime: 1000 * 30, // 30 seconds — shared between Step3 & Step4 onboarding mounts
  });

  useEffect(() => {
    if (query.data) {
      setWorkspaces(query.data);
    }
  }, [query.data, setWorkspaces]);

  return query;
}

export function useTestConnection(id: string) {
  return useMutation({
    mutationFn: () => workspaceService.testConnection(id),
  });
}

export function useReconnectWorkspace(id: string) {
  return useMutation({
    mutationFn: () => workspaceService.reconnectWorkspace(id),
  });
}

export function useRevokeWorkspace(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => workspaceService.revokeWorkspace(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}

export function useUpdatePermissions(id: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (permissions: any[]) => workspaceService.updatePermissions(id, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
}
