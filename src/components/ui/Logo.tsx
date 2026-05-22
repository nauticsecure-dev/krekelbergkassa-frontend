import { cn } from '@/lib/cn';

interface LogoProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export function Logo({ variant = 'dark', className }: LogoProps) {
  const fg = variant === 'dark' ? 'text-navy-900' : 'text-white';
  const sub = variant === 'dark' ? 'text-navy-400' : 'text-sand-200/80';
  const stroke = variant === 'dark' ? '#0f1b2a' : '#fbf8f3';
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="20" cy="20" r="19" stroke={stroke} strokeWidth="1.5" />
        <path
          d="M8 24c4-2 8-2 12 0s8 2 12 0"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M20 8v14"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M14 14l6-6 6 6"
          stroke={stroke}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="leading-tight">
        <div className={cn('font-display text-lg font-semibold tracking-tight', fg)}>
          KREKELBERG
        </div>
        <div className={cn('-mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em]', sub)}>
          Nautic · Jachtmakelaar
        </div>
      </div>
    </div>
  );
}
