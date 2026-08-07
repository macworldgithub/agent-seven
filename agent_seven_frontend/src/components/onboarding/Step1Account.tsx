import React from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { CheckCircle2, ChevronRight } from 'lucide-react';

export function Step1Account({ onNext }: { onNext: () => void }) {
  const { user, tenant } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div
          className="flex items-center justify-center rounded-full mb-6"
          style={{ width: '72px', height: '72px', background: 'var(--color-accent-dim)' }}
        >
          <CheckCircle2 size={32} style={{ color: 'var(--color-accent)' }} />
        </div>
        <h2
          style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' }}
        >
          Account Created!
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', maxWidth: '360px', marginBottom: '32px', lineHeight: 1.6 }}>
          Welcome to Agent Seven. Let's get your workspace set up and configure your AI assistant.
        </p>

        <div
          className="w-full max-w-sm rounded-xl p-5 text-left space-y-4"
          style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
        >
          <div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>
              User
            </span>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{user?.email}</div>
          </div>
          <div style={{ height: '1px', background: 'var(--color-border)' }} />
          <div>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '4px' }}>
              Workspace
            </span>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{tenant?.name}</div>
          </div>
        </div>
      </div>

      <div className="p-6 flex justify-end" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="primary" size="md" leftIcon={<ChevronRight size={14} />} onClick={onNext}>
          Continue
        </Button>
      </div>
    </div>
  );
}
