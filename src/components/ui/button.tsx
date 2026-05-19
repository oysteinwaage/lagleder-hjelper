import * as React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          {
            'bg-emerald-600 hover:bg-emerald-500 text-white': variant === 'default',
            'bg-slate-700 hover:bg-slate-600 text-slate-100': variant === 'secondary',
            'bg-red-700 hover:bg-red-600 text-white': variant === 'destructive',
            'hover:bg-slate-700/60 text-slate-300': variant === 'ghost',
            'border border-slate-600 bg-transparent hover:bg-slate-700 text-slate-200': variant === 'outline',
            'bg-green-600 hover:bg-green-500 text-white': variant === 'success',
          },
          {
            'text-xs px-2 py-1 gap-1': size === 'sm',
            'text-sm px-4 py-2 gap-2': size === 'md',
            'text-base px-6 py-3 gap-2': size === 'lg',
            'p-2': size === 'icon',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
