import React from 'react';
import { Button } from '../ui/Button';
import { ConnectWorkspace } from '../workspace/ConnectWorkspace';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { WorkspaceCard } from '../workspace/WorkspaceCard';

export function Step3ConnectWorkspace({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const hasWorkspaces = workspaces && workspaces.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Connect your Workspace
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Agent Seven needs access to your data to be useful. Connect a primary workspace to get started.
        </p>
      </div>

      <div className="flex-1 px-8 pb-4 overflow-y-auto">
        {!isLoading && !hasWorkspaces && <ConnectWorkspace />}
        {!isLoading && hasWorkspaces && (
          <div className="space-y-4">
            <div
              className="flex items-center gap-2 rounded-xl px-4 py-3"
              style={{ background: 'var(--color-accent-dim)', border: '1px solid rgba(16,185,129,0.2)', fontSize: '13px', color: 'var(--color-accent)' }}
            >
              <CheckCircle2 size={14} />
              Successfully connected {workspaces.length} workspace(s). You can continue.
            </div>
            {workspaces.map((ws) => (
              <WorkspaceCard key={ws.id} workspace={ws} onManagePermissions={() => {}} />
            ))}
          </div>
        )}
      </div>

      <div className="p-6 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={onBack}>Back</Button>
        <div className="flex gap-3">
          {!hasWorkspaces && (
            <Button variant="ghost" size="sm" onClick={onNext}>Skip</Button>
          )}
          <Button variant="primary" size="md" leftIcon={<ChevronRight size={14} />} onClick={onNext}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
