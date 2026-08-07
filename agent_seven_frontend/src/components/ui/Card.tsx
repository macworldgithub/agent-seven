import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glow?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', hover = false, glow = false, children, style, ...props }, ref) => {
    const paddings: Record<string, string> = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-150',
          paddings[padding],
          hover && 'cursor-pointer',
          className
        )}
        style={{
          background: 'var(--color-surface)',
          border: `1px solid var(--color-border)`,
          boxShadow: glow ? 'var(--shadow-brand)' : undefined,
          ...style,
        }}
        onMouseEnter={
          hover
            ? (e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  'var(--color-border-light)';
              }
            : undefined
        }
        onMouseLeave={
          hover
            ? (e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  'var(--color-border)';
              }
            : undefined
        }
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
