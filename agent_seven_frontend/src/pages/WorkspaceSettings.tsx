import React, { useState } from 'react';
import { WorkspaceList } from '../components/workspace/WorkspaceList';
import { ConnectWorkspace } from '../components/workspace/ConnectWorkspace';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';

export function WorkspaceSettings() {
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  return (
    <div
      className="py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in"
    >
      {/* Header */}
      <div
        className="flex items-start sm:items-center justify-between gap-4 mb-8 pb-6"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Connected Workspaces
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Manage the apps and services Agent Seven can access on your behalf.
          </p>
        </div>
        <Button
          variant="primary"
          leftIcon={<Plus size={14} />}
          onClick={() => setIsConnectModalOpen(true)}
        >
          Connect New
        </Button>
      </div>

      <WorkspaceList />

      <Modal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        title="Connect New Workspace"
        size="lg"
      >
        <ConnectWorkspace />
      </Modal>
    </div>
  );
}
