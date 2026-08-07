import React from 'react';
import { Spinner } from './Spinner';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  leftIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      children,
      leftIcon,
      ...props
    },
    ref
  ) => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none select-none cursor-pointer';

    const variants: Record<string, string> = {
      primary: [
        'text-white',
        'shadow-sm',
      ].join(' '),
      secondary: [
        'text-[var(--color-text-secondary)] border border-[var(--color-border)]',
        'hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]',
      ].join(' '),
      ghost: [
        'text-[var(--color-text-muted)]',
        'hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]',
      ].join(' '),
      danger: [
        'text-[var(--color-danger)] border border-[rgba(239,68,68,0.2)]',
        'hover:bg-[rgba(239,68,68,0.2)]',
      ].join(' '),
      outline: [
        'text-[var(--color-text-secondary)] border border-[var(--color-border)]',
        'hover:text-[var(--color-text-primary)] hover:border-[var(--color-border-light)]',
      ].join(' '),
    };

    const sizes: Record<string, string> = {
      sm: 'h-7 px-3 text-xs gap-1.5',
      md: 'h-9 px-4 text-sm gap-2',
      lg: 'h-11 px-6 text-base gap-2.5',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          base,
          sizes[size],
          variants[variant],
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          loading && 'cursor-wait',
          !isDisabled && 'active:scale-95',
          className
        )}
        style={
          variant === 'primary'
            ? {
                background: 'var(--color-brand)',
              }
            : variant === 'secondary' || variant === 'outline'
            ? {
                background: 'var(--color-surface-2)',
              }
            : variant === 'danger'
            ? {
                background: 'var(--color-danger-dim)',
              }
            : undefined
        }
        {...props}
      >
        {loading ? (
          <Spinner size="sm" />
        ) : leftIcon ? (
          <span className="flex items-center justify-center">{leftIcon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
