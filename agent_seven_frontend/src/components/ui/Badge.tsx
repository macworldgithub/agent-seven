import React from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    background: 'var(--color-accent-dim)',
    color: 'var(--color-accent)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  warning: {
    background: 'var(--color-warning-dim)',
    color: 'var(--color-warning)',
    border: '1px solid rgba(245, 158, 11, 0.2)',
  },
  error: {
    background: 'var(--color-danger-dim)',
    color: 'var(--color-danger)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
  },
  info: {
    background: 'var(--color-brand-dim)',
    color: 'var(--color-brand-light)',
    border: '1px solid rgba(99, 102, 241, 0.2)',
  },
  default: {
    background: 'var(--color-surface-3)',
    color: 'var(--color-text-secondary)',
    border: '1px solid var(--color-border)',
  },
};

export function Badge({ variant = 'default', children, className, style }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
        className
      )}
      style={{ ...variantStyles[variant], ...style }}
    >
      {children}
    </span>
  );
}
