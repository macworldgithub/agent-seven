import React from 'react';
import { Button } from '../ui/Button';
import { ChevronLeft, Download, Monitor } from 'lucide-react';

export function Step6Voice({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Enable Voice Mode
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Download the desktop app to interact with Agent Seven using your voice, anywhere on your Mac.
        </p>
      </div>

      <div className="flex-1 px-8 pb-4 overflow-y-auto flex items-center justify-center">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          {/* Desktop */}
          <div
            className="flex flex-col items-center text-center rounded-xl p-6"
            style={{ background: 'var(--color-brand-dim)', border: '1px solid rgba(99,102,241,0.3)', position: 'relative' }}
          >
            <span
              className="absolute top-3 right-3 rounded-full px-2 py-0.5"
              style={{ fontSize: '10px', fontWeight: 700, background: 'var(--color-brand)', color: 'white', letterSpacing: '0.05em' }}
            >
              RECOMMENDED
            </span>
            <div className="flex items-center justify-center rounded-full mb-4" style={{ width: '56px', height: '56px', background: 'rgba(99,102,241,0.15)' }}>
              <Download size={24} style={{ color: 'var(--color-brand-light)' }} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Desktop Client</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Global hotkey, voice interaction, and background processing.
            </p>
            <Button variant="primary" size="sm" className="w-full">Download for Mac</Button>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>Requires macOS 13.0+</p>
          </div>

          {/* Web */}
          <div
            className="flex flex-col items-center text-center rounded-xl p-6"
            style={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center justify-center rounded-full mb-4" style={{ width: '56px', height: '56px', background: 'var(--color-surface-3)' }}>
              <Monitor size={24} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Web Only</h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Continue using Agent Seven in your browser.
            </p>
            <Button variant="secondary" size="sm" className="w-full" onClick={onNext}>Use Web Version</Button>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>Some features limited</p>
          </div>
        </div>
      </div>

      <div className="p-6 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={onBack}>Back</Button>
        <Button variant="ghost" size="sm" onClick={onNext}>Skip</Button>
      </div>
    </div>
  );
}
