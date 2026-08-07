import React from 'react';
import { cn } from '../../lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

const sizes: Record<string, number> = {
  sm: 14,
  md: 20,
  lg: 28,
};

export function Spinner({ size = 'md', className, style }: SpinnerProps) {
  const px = sizes[size];
  const radius = (px - 4) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg
      className={cn('animate-spin', className)}
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, ...style }}
    >
      <circle
        cx={px / 2}
        cy={px / 2}
        r={radius}
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="2"
      />
      <circle
        cx={px / 2}
        cy={px / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75}
      />
    </svg>
  );
}
