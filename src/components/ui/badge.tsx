import * as React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'secondary';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
        {
          'bg-slate-700 text-slate-300': variant === 'default',
          'bg-emerald-900/60 text-emerald-300': variant === 'success',
          'bg-amber-900/60 text-amber-300': variant === 'warning',
          'bg-red-900/60 text-red-300': variant === 'danger',
          'bg-slate-600 text-slate-200': variant === 'secondary',
        },
        className
      )}
      {...props}
    />
  );
}
