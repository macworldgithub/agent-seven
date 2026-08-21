import React from 'react';
import {
  Mail,
  Calendar,
  CheckSquare,
  AlertTriangle,
  Target,
  Zap,
  Star,
} from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function getSectionIcon(heading: string) {
  const lower = heading.toLowerCase();
  if (lower.includes('email') || lower.includes('inbox')) return <Mail size={16} />;
  if (lower.includes('schedule') || lower.includes('calendar') || lower.includes('meeting'))
    return <Calendar size={16} />;
  if (lower.includes('action') || lower.includes('task') || lower.includes('todo'))
    return <CheckSquare size={16} />;
  if (
    lower.includes('attention') ||
    lower.includes('alert') ||
    lower.includes('urgent') ||
    lower.includes('needs')
  )
    return <AlertTriangle size={16} />;
  if (
    lower.includes('priority') ||
    lower.includes('focus') ||
    lower.includes('important')
  )
    return <Target size={16} />;
  if (lower.includes('briefing') || lower.includes('good morning') || lower.includes('morning'))
    return <Star size={16} />;
  return <Zap size={16} />;
}

function renderInline(text: string): React.ReactNode[] {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // H2 heading ##
    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      elements.push(
        <div
          key={key++}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: i === 0 ? 0 : '24px',
            marginBottom: '12px',
            color: 'var(--color-brand-light)',
          }}
        >
          <span style={{ color: 'var(--color-brand-light)' }}>{getSectionIcon(text)}</span>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              margin: 0,
            }}
          >
            {renderInline(text)}
          </h2>
        </div>,
      );
      continue;
    }

    // H3 heading ###
    if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      elements.push(
        <div
          key={key++}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '16px',
            marginBottom: '8px',
          }}
        >
          <span style={{ color: 'var(--color-warning)', flexShrink: 0 }}>
            {getSectionIcon(text)}
          </span>
          <h3
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
            }}
          >
            {renderInline(text)}
          </h3>
        </div>,
      );
      continue;
    }

    // Bullet point - or *
    if (line.match(/^(\s*[-*])\s/)) {
      const text = line.replace(/^\s*[-*]\s/, '').trim();
      // Check for overdue marker
      const isOverdue = text.includes('⚠️') || text.toLowerCase().includes('overdue');
      elements.push(
        <div
          key={key++}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '4px 0',
            fontSize: '14px',
            color: isOverdue ? 'var(--color-warning)' : 'var(--color-text-primary)',
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isOverdue ? 'var(--color-warning)' : 'var(--color-brand)',
              marginTop: '7px',
            }}
          />
          <span style={{ lineHeight: '1.5', flex: 1 }}>{renderInline(text)}</span>
        </div>,
      );
      continue;
    }

    // Horizontal rule ---
    if (line.match(/^---+$/)) {
      elements.push(
        <div
          key={key++}
          style={{
            height: '1px',
            background: 'var(--color-border)',
            margin: '16px 0',
          }}
        />,
      );
      continue;
    }

    // Empty line — add spacing
    if (line.trim() === '') {
      elements.push(<div key={key++} style={{ height: '4px' }} />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p
        key={key++}
        style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          lineHeight: '1.6',
          margin: '4px 0',
        }}
      >
        {renderInline(line)}
      </p>,
    );
  }

  return (
    <div
      className={className}
      style={{ fontFamily: 'inherit' }}
    >
      {elements}
    </div>
  );
}
