import React from 'react';
import { Button } from '../ui/Button';
import { useWorkspaces } from '../../hooks/useWorkspace';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ConnectWorkspace } from '../workspace/ConnectWorkspace';

export function Step5MoreWorkspaces({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: workspaces } = useWorkspaces();
  const connectedProviders = workspaces?.map((w) => w.provider) || [];
  const hasSlack = connectedProviders.includes('slack');
  const hasGoogle = connectedProviders.includes('google');

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Any more integrations?
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Agent Seven works best when it can connect the dots across all your tools.
        </p>
      </div>

      <div className="flex-1 px-8 pb-4 overflow-y-auto">
        {workspaces && workspaces.length > 0 && (
          <div
            className="rounded-xl p-4 mb-5"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Currently Connected:
            </p>
            <div className="flex flex-wrap gap-2">
              {workspaces.map((ws) => (
                <span
                  key={ws.id}
                  className="flex items-center rounded-full px-3 py-1"
                  style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)', background: 'var(--color-surface-3)', border: '1px solid var(--color-border)' }}
                >
                  {ws.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {(!hasSlack || !hasGoogle) && <ConnectWorkspace />}
      </div>

      <div className="p-6 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={onBack}>Back</Button>
        <Button variant="primary" size="md" leftIcon={<ChevronRight size={14} />} onClick={onNext}>Continue</Button>
      </div>
    </div>
  );
}
