import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(7)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--color-text-secondary)',
              marginBottom: '6px',
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div
              className="absolute inset-y-0 left-0 flex items-center pointer-events-none"
              style={{ paddingLeft: '12px', color: 'var(--color-text-muted)' }}
            >
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'block w-full rounded-lg text-sm transition-all duration-150',
              'focus:outline-none',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            style={{
              height: '40px',
              paddingLeft: leftIcon ? undefined : '12px',
              paddingRight: rightIcon ? undefined : '12px',
              background: 'var(--color-surface-2)',
              border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border)'}`,
              color: 'var(--color-text-primary)',
              fontSize: '14px',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = error
                ? 'var(--color-danger)'
                : 'var(--color-brand)';
              e.currentTarget.style.boxShadow = error
                ? '0 0 0 2px rgba(239,68,68,0.2)'
                : '0 0 0 2px rgba(99,102,241,0.2)';
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = error
                ? 'var(--color-danger)'
                : 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
              props.onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon && (
            <div
              className="absolute inset-y-0 right-0 flex items-center pointer-events-none"
              style={{ paddingRight: '12px', color: 'var(--color-text-muted)' }}
            >
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color: 'var(--color-danger)',
            }}
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            style={{
              marginTop: '4px',
              fontSize: '12px',
              color: 'var(--color-text-muted)',
            }}
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
