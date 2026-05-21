import * as React from 'react';
import { cn } from '@/lib/utils';

// React 19 + TS6: JSX.Element is not assignable to ReactNode in strict IDE
// checking. Accept unknown children and cast at the render boundary.
type DivProps = Omit<React.ComponentProps<'div'>, 'children'> & { children?: unknown };
type H2Props = Omit<React.ComponentProps<'h2'>, 'children'> & { children?: unknown };

export function Card({ className, children, ...props }: DivProps) {
  return (
    <div
      className={cn('bg-slate-800 border border-slate-700 rounded-xl p-4', className)}
      {...props}
    >
      {children as React.ReactNode}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: DivProps) {
  return <div className={cn('mb-4', className)} {...props}>{children as React.ReactNode}</div>;
}

export function CardTitle({ className, children, ...props }: H2Props) {
  return <h2 className={cn('text-lg font-semibold text-slate-100', className)} {...props}>{children as React.ReactNode}</h2>;
}

export function CardContent({ className, children, ...props }: DivProps) {
  return <div className={cn('', className)} {...props}>{children as React.ReactNode}</div>;
}
