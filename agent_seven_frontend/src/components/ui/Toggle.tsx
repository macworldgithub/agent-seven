import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: ToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col min-w-0">
          {label && (
            <span
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: disabled
                  ? 'var(--color-text-muted)'
                  : 'var(--color-text-primary)',
              }}
            >
              {label}
            </span>
          )}
          {description && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                marginTop: '2px',
              }}
            >
              {description}
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative flex-shrink-0 inline-flex items-center rounded-full',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus-visible:ring-2',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{
          width: '36px',
          height: '20px',
          background: checked ? 'var(--color-brand)' : 'var(--color-surface-3)',
          border: checked
            ? '1px solid transparent'
            : '1px solid var(--color-border)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          style={{
            position: 'absolute',
            width: '14px',
            height: '14px',
            backgroundColor: 'white',
            borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
            transition: 'transform 200ms ease-in-out',
            transform: checked ? 'translateX(18px)' : 'translateX(2px)',
          }}
        />
      </button>
    </div>
  );
}
