import * as React from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input(
    { className, label, hint, error, leftIcon, rightSlot, id, ...rest },
    ref
  ) {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    return (
      <div className="w-full">
        {label ? (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-navy-800"
          >
            {label}
          </label>
        ) : null}
        <div className="relative">
          {leftIcon ? (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-400">
              {leftIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'input-base',
              leftIcon && 'pl-9',
              rightSlot && 'pr-12',
              error &&
                'border-rose-300 focus:border-rose-400 focus:ring-rose-200',
              className
            )}
            {...rest}
          />
          {rightSlot ? (
            <span className="absolute right-2 top-1/2 -translate-y-1/2">
              {rightSlot}
            </span>
          ) : null}
        </div>
        {hint && !error ? (
          <p className="mt-1 text-xs text-navy-400">{hint}</p>
        ) : null}
        {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
      </div>
    );
  }
);
