import React from 'react';
import { Button } from '../ui/Button';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PermissionMatrix } from '../workspace/PermissionMatrix';

export function Step4Permissions({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: workspaces, isLoading } = useWorkspaces();
  const hasWorkspaces = workspaces && workspaces.length > 0;

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Configure Permissions
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Set boundaries for what Agent Seven is allowed to do on your behalf.
        </p>
      </div>

      <div className="flex-1 px-8 pb-4 overflow-y-auto">
        {!isLoading && !hasWorkspaces && (
          <div
            className="flex items-center justify-center py-12 text-center rounded-xl"
            style={{ border: '1px dashed var(--color-border)', color: 'var(--color-text-muted)', fontSize: '13px' }}
          >
            No workspaces connected. Skip this step or go back to connect one.
          </div>
        )}
        {!isLoading && hasWorkspaces && (
          <div className="space-y-8">
            {workspaces.map((ws) => (
              <div key={ws.id} className="space-y-3">
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{ws.name}</h3>
                <div
                  className="rounded-xl p-5"
                  style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
                >
                  <PermissionMatrix workspace={ws} onClose={() => {}} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-6 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={onBack}>Back</Button>
        <Button variant="primary" size="md" leftIcon={<ChevronRight size={14} />} onClick={onNext}>Next Step</Button>
      </div>
    </div>
  );
}
