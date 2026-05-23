import * as React from 'react';
import { cn } from '@/lib/cn';

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-xl2 border border-navy-100/60 bg-white/95 shadow-float backdrop-blur-sm transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pt-6 pb-4 border-b border-navy-100/70', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

export function CardFooter({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-navy-100/70 bg-sand-50/40 rounded-b-xl2', className)}>
      {children}
    </div>
  );
}
