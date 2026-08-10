import React, { useState, useEffect } from 'react';
import { useAgent, useUpdateAgent } from '../hooks/useAgent';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Toggle } from '../components/ui/Toggle';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Bot, Save, Brain, Bell, AlertTriangle, Download, Trash2, User } from 'lucide-react';
import { Agent } from '../types';

const personalities = [
  { value: 'Professional', label: 'Professional', desc: 'Formal, direct' },
  { value: 'Friendly', label: 'Friendly', desc: 'Warm, helpful' },
  { value: 'Concise', label: 'Concise', desc: 'Brief, sharp' },
  { value: 'Detailed', label: 'Detailed', desc: 'Thorough, analytical' },
];

export function AgentConfig() {
  const { data: agent, isLoading } = useAgent();
  const updateMutation = useUpdateAgent();
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [charCount, setCharCount] = useState(0);

  const [formData, setFormData] = useState<Partial<Agent>>({
    name: '',
    spokenName: '',
    personalityPreset: 'Professional',
    morningBriefingEnabled: false,
    morningBriefingTime: '08:00',
    morningBriefingTimezone: 'UTC',
    driftDetectionEnabled: false,
    replyTrackingEnabled: false,
    watchlistEnabled: false,
    systemPromptAppendix: '',
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        spokenName: agent.spokenName || '',
        personalityPreset: agent.personalityPreset || 'Professional',
        morningBriefingEnabled: agent.morningBriefingEnabled || false,
        morningBriefingTime: agent.morningBriefingTime || '08:00',
        morningBriefingTimezone: agent.morningBriefingTimezone || 'UTC',
        driftDetectionEnabled: agent.driftDetectionEnabled || false,
        replyTrackingEnabled: agent.replyTrackingEnabled || false,
        watchlistEnabled: agent.watchlistEnabled || false,
        systemPromptAppendix: agent.systemPromptAppendix || '',
      });
      setCharCount((agent.systemPromptAppendix || '').length);
    }
  }, [agent]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === 'systemPromptAppendix') setCharCount(value.length);
  };

  const handleToggle = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const initials = (formData.name || 'A7')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="lg" className="text-[color:var(--color-brand)]" />
      </div>
    );
  }

  return (
    <div
      className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-5 animate-fade-in"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
            }}
          >
            Agent Settings
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Configure how Agent Seven behaves and interacts with you.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          leftIcon={<Save size={14} />}
          loading={updateMutation.isPending}
          onClick={handleSubmit}
        >
          Save Changes
        </Button>
      </div>

      {/* 1. Agent Identity */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-5">
          <User size={15} style={{ color: 'var(--color-brand-light)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Agent Identity
          </h3>
        </div>

        <div className="flex items-start gap-6 mb-6">
          {/* Avatar preview */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0 text-lg font-bold"
            style={{
              width: '64px',
              height: '64px',
              background: 'var(--color-brand-dim)',
              color: 'var(--color-brand-light)',
              border: '2px solid rgba(99,102,241,0.25)',
              letterSpacing: '-0.02em',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Agent Name"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Agent Seven"
            />
            <Input
              label="Spoken Name"
              name="spokenName"
              value={formData.spokenName || ''}
              onChange={handleChange}
              placeholder="Seven"
              hint="How you'll address the agent over voice"
            />
          </div>
        </div>

        {/* Personality */}
        <div>
          <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
            Personality
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {personalities.map((p) => {
              const isSelected = formData.personalityPreset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, personalityPreset: p.value }))}
                  className="rounded-xl p-3 text-center transition-all duration-150 cursor-pointer"
                  style={{
                    background: isSelected ? 'var(--color-brand-dim)' : 'var(--color-surface-2)',
                    border: `1px solid ${isSelected ? 'rgba(99,102,241,0.3)' : 'var(--color-border)'}`,
                    color: isSelected ? 'var(--color-brand-light)' : 'var(--color-text-muted)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{p.label}</div>
                  <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.7 }}>{p.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* 2. Morning Briefing */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-5">
          <Bell size={15} style={{ color: 'var(--color-warning)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Morning Briefing
          </h3>
        </div>

        <Toggle
          label="Enable Morning Briefing"
          description="Receive a daily summary of your schedule and important updates"
          checked={formData.morningBriefingEnabled || false}
          onChange={(c) => handleToggle('morningBriefingEnabled', c)}
        />

        {formData.morningBriefingEnabled && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5 pt-5 animate-fade-in"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <Input
              label="Briefing Time"
              name="morningBriefingTime"
              type="time"
              value={formData.morningBriefingTime || '08:00'}
              onChange={handleChange}
            />
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-text-secondary)',
                  marginBottom: '6px',
                }}
              >
                Timezone
              </label>
              <select
                name="morningBriefingTimezone"
                value={formData.morningBriefingTimezone || 'UTC'}
                onChange={handleChange}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '12px',
                  paddingRight: '32px',
                  background: 'var(--color-surface-2)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '8px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                }}
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="Asia/Karachi">Pakistan (PKT)</option>
              </select>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Proactive Behaviours */}
      <Card padding="md">
        <div className="flex items-center gap-2 mb-5">
          <Brain size={15} style={{ color: 'var(--color-brand-light)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Proactive Behaviours
          </h3>
        </div>

        <div className="space-y-5">
          <Toggle
            label="Drift Detection"
            description="Nudge me when action items go stale or projects drift off-track"
            checked={formData.driftDetectionEnabled || false}
            onChange={(c) => handleToggle('driftDetectionEnabled', c)}
          />
          <div style={{ height: '1px', background: 'var(--color-border)' }} />
          <Toggle
            label="Reply Tracking"
            description="Alert me when important emails go unanswered for too long"
            checked={formData.replyTrackingEnabled || false}
            onChange={(c) => handleToggle('replyTrackingEnabled', c)}
          />
          <div style={{ height: '1px', background: 'var(--color-border)' }} />
          <Toggle
            label="Watchlist Monitoring"
            description="Monitor specific topics, people, or projects and surface key updates"
            checked={formData.watchlistEnabled || false}
            onChange={(c) => handleToggle('watchlistEnabled', c)}
          />
        </div>
      </Card>

      {/* 4. System Prompt */}
      <Card padding="md">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bot size={15} style={{ color: 'var(--color-text-muted)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              System Prompt
            </h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
            {charCount} chars
          </span>
        </div>

        <textarea
          name="systemPromptAppendix"
          value={formData.systemPromptAppendix || ''}
          onChange={handleChange}
          rows={5}
          placeholder="e.g. Always format dates as YYYY-MM-DD. Never use emojis. Respond in bullet points where possible."
          className="font-mono"
          style={{
            width: '100%',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            padding: '12px',
            lineHeight: 1.6,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-brand)';
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99,102,241,0.2)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
          These rules are appended to the agent's base prompt. They override defaults.
        </p>
      </Card>

      {/* 5. Memory & Data (danger zone) */}
      <Card
        padding="md"
        style={{
          background: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245,158,11,0.15)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={15} style={{ color: 'var(--color-warning)' }} />
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-warning)' }}>
            Memory & Data
          </h3>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          Manage the memories Agent Seven has accumulated from your conversations and interactions.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" size="sm" leftIcon={<Download size={13} />}>
            Export Memories
          </Button>
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Trash2 size={13} />}
            onClick={() => setWipeModalOpen(true)}
          >
            Wipe All Memories
          </Button>
        </div>
      </Card>

      {/* Wipe confirmation modal */}
      <Modal
        isOpen={wipeModalOpen}
        onClose={() => setWipeModalOpen(false)}
        title="Wipe All Memories?"
        size="sm"
      >
        <div className="space-y-4">
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
            This will permanently delete all memories Agent Seven has learned about you — your
            preferences, habits, and context. This action cannot be undone.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={() => setWipeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="danger" size="sm" className="flex-1" leftIcon={<Trash2 size={13} />}>
              Wipe memories
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
