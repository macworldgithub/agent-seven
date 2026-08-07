import React from 'react';
import { Bell } from 'lucide-react';
import { useAgentStore } from '../../store/agentStore';
import { useAuth } from '../../hooks/useAuth';
import { SidebarToggle } from './Sidebar';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

function AgentStatusPill() {
  const isThinking = useAgentStore((s) => s.isThinking);

  const status = isThinking ? 'THINKING' : 'IDLE';

  const styles: Record<
    string,
    { bg: string; border: string; text: string; dot: string; pulse: boolean }
  > = {
    IDLE: {
      bg: 'var(--color-accent-dim)',
      border: 'rgba(16,185,129,0.2)',
      text: 'var(--color-accent)',
      dot: 'var(--color-accent)',
      pulse: false,
    },
    THINKING: {
      bg: 'var(--color-warning-dim)',
      border: 'rgba(245,158,11,0.2)',
      text: 'var(--color-warning)',
      dot: 'var(--color-warning)',
      pulse: true,
    },
    EXECUTING: {
      bg: 'var(--color-brand-dim)',
      border: 'rgba(99,102,241,0.2)',
      text: 'var(--color-brand-light)',
      dot: 'var(--color-brand)',
      pulse: true,
    },
  };

  const s = styles[status] || styles.IDLE;

  return (
    <div
      className="flex items-center gap-2 px-3 rounded-full"
      style={{
        height: '28px',
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.text,
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      <span
        className={s.pulse ? 'animate-pulse' : ''}
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: s.dot,
          flexShrink: 0,
        }}
      />
      {status}
    </div>
  );
}

export function TopBar({ title, onMenuClick }: TopBarProps) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <header
      className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 flex-shrink-0"
      style={{
        height: '64px',
        background: 'rgba(17, 19, 24, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <SidebarToggle onClick={onMenuClick} />
        <h1
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <AgentStatusPill />

        {/* Bell */}
        <button
          className="flex items-center justify-center rounded-lg p-2 transition-all duration-150"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              'var(--color-text-primary)';
            (e.currentTarget as HTMLButtonElement).style.background =
              'var(--color-surface-2)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              'var(--color-text-muted)';
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
          }}
        >
          <Bell size={16} />
        </button>

        {/* Avatar */}
        <div
          className="flex items-center justify-center rounded-full text-xs font-bold"
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--color-brand-dim)',
            color: 'var(--color-brand-light)',
            border: '1px solid rgba(99,102,241,0.2)',
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
