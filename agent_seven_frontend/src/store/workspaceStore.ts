import { create } from 'zustand';
import { Workspace } from '../types';

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspace: Workspace | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (id: string, data: Partial<Workspace>) => void;
  removeWorkspace: (id: string) => void;
  setSelected: (workspace: Workspace | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  workspaces: [],
  selectedWorkspace: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (workspace) => set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  updateWorkspace: (id, data) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w)),
      selectedWorkspace: state.selectedWorkspace?.id === id ? { ...state.selectedWorkspace, ...data } as Workspace : state.selectedWorkspace
    })),
  removeWorkspace: (id) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== id),
      selectedWorkspace: state.selectedWorkspace?.id === id ? null : state.selectedWorkspace
    })),
  setSelected: (workspace) => set({ selectedWorkspace: workspace }),
}));
