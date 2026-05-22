import * as React from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-300',
  secondary:
    'bg-sand-100 text-navy-900 hover:bg-sand-200 focus-visible:ring-sand-300',
  ghost:
    'bg-transparent text-navy-700 hover:bg-navy-50 focus-visible:ring-navy-200',
  outline:
    'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 focus-visible:ring-navy-200',
  gold:
    'bg-gold-500 text-white hover:bg-gold-600 focus-visible:ring-gold-300 shadow-sm',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && 'w-full',
          className
        )}
        {...rest}
      >
        {leftIcon ? <span className="-ml-0.5">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="-mr-0.5">{rightIcon}</span> : null}
      </button>
    );
  }
);
