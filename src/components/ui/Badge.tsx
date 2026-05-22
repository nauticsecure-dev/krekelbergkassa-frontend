import * as React from 'react';
import { cn } from '@/lib/cn';

type Tone =
  | 'navy'
  | 'sand'
  | 'gold'
  | 'marine'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const tones: Record<Tone, string> = {
  navy: 'bg-navy-50 text-navy-700 ring-navy-200',
  sand: 'bg-sand-100 text-sand-800 ring-sand-200',
  gold: 'bg-gold-50 text-gold-700 ring-gold-200',
  marine: 'bg-marine-50 text-marine-700 ring-marine-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-rose-50 text-rose-700 ring-rose-200',
  neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
};

const dotTones: Record<Tone, string> = {
  navy: 'bg-navy-500',
  sand: 'bg-sand-500',
  gold: 'bg-gold-500',
  marine: 'bg-marine-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-500',
};

export function Badge({ children, tone = 'navy', size = 'sm', dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        tones[tone],
        className
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} />}
      {children}
    </span>
  );
}
