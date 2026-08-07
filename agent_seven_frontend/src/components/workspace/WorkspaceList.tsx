import React, { useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { WorkspaceCard } from './WorkspaceCard';
import { Workspace } from '../../types';
import { Spinner } from '../ui/Spinner';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PermissionMatrix } from './PermissionMatrix';
import { Globe, Plus } from 'lucide-react';

interface WorkspaceListProps {
  onConnectClick?: () => void;
}

export function WorkspaceList({ onConnectClick }: WorkspaceListProps) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" style={{ color: 'var(--color-brand)' } as any} />
      </div>
    );
  }

  if (!workspaces || workspaces.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-xl"
        style={{
          border: '1px dashed var(--color-border)',
          background: 'var(--color-surface)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-2xl mb-5"
          style={{
            width: '64px',
            height: '64px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Globe size={28} style={{ color: 'var(--color-text-muted)' }} />
        </div>
        <h3
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            marginBottom: '8px',
          }}
        >
          No workspaces connected
        </h3>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--color-text-muted)',
            maxWidth: '360px',
            marginBottom: '24px',
            lineHeight: 1.6,
          }}
        >
          Connect your Google Workspace or Slack to give Agent Seven access to your
          emails, calendar, documents, and messages.
        </p>

        <div className="flex items-center gap-3">
          {onConnectClick && (
            <Button
              variant="primary"
              leftIcon={<Plus size={14} />}
              onClick={onConnectClick}
            >
              Connect Workspace
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workspaces.map((workspace) => (
        <WorkspaceCard
          key={workspace.id}
          workspace={workspace}
          onManagePermissions={setSelectedWorkspace}
        />
      ))}

      <Modal
        isOpen={!!selectedWorkspace}
        onClose={() => setSelectedWorkspace(null)}
        title={`Permissions — ${selectedWorkspace?.name}`}
        size="lg"
      >
        {selectedWorkspace && (
          <PermissionMatrix
            workspace={selectedWorkspace}
            onClose={() => setSelectedWorkspace(null)}
          />
        )}
      </Modal>
    </div>
  );
}
