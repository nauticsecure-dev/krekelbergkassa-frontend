import { cn } from '@/lib/cn';
import Image from 'next/image';

interface LogoProps {
  variant?: 'dark' | 'light';
  className?: string;
}

export function Logo({ variant = 'dark', className }: LogoProps) {
  const fg = variant === 'dark' ? 'text-navy-900' : 'text-white';
  const sub = variant === 'dark' ? 'text-navy-500' : 'text-sand-100/80';
  return (
    <div className={cn('flex items-center gap-2.5', className)} aria-label="Krekelberg Nautic">
      <Image
        src="/img/krekelberg.webp"
        alt="Krekelberg Nautic logo"
        width={54}
        height={76}
        priority={variant === 'dark'}
        className="h-11 w-auto shrink-0 object-contain"
      />
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
