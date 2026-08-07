import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useUpdateAgent, useAgent } from '../../hooks/useAgent';
import { Bot, ChevronLeft, ChevronRight } from 'lucide-react';

export function Step2NameAgent({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: agent } = useAgent();
  const updateMutation = useUpdateAgent();
  const [name, setName] = useState(agent?.name || 'Agent Seven');
  const [spokenName, setSpokenName] = useState(agent?.spokenName || 'Seven');

  const handleNext = async () => {
    await updateMutation.mutateAsync({ name, spokenName });
    onNext();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-8 pb-4">
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px', letterSpacing: '-0.02em' }}>
          Name your Assistant
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
          Give your agent a name. This is how you'll interact via text and voice.
        </p>
      </div>

      <div className="flex-1 px-8 pb-8 overflow-y-auto">
        <div className="max-w-md space-y-5">
          <Input label="Agent Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Agent Seven, Jarvis, Alisa" />
          <Input label="Spoken Name (Optional)" value={spokenName} onChange={(e) => setSpokenName(e.target.value)} placeholder="e.g. Seven" hint="A phonetic or simpler version for voice commands." />

          <div
            className="flex items-start gap-4 rounded-xl p-4"
            style={{ background: 'var(--color-brand-dim)', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: '36px', height: '36px', background: 'var(--color-brand)', }}>
              <Bot size={16} color="white" />
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-brand-light)' }}>
                Hi, I'm {name || 'your agent'}.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                I'll be helping you manage workspaces, emails, and your schedule.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 flex justify-between" style={{ borderTop: '1px solid var(--color-border)' }}>
        <Button variant="ghost" size="sm" leftIcon={<ChevronLeft size={14} />} onClick={onBack}>Back</Button>
        <Button variant="primary" size="md" leftIcon={<ChevronRight size={14} />} loading={updateMutation.isPending} disabled={!name.trim()} onClick={handleNext}>Next Step</Button>
      </div>
    </div>
  );
}
