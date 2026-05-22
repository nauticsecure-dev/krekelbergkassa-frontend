import type { Locale } from '@/i18n/config';
import { cn } from '@/lib/cn';

interface FlagProps {
  code: Locale;
  className?: string;
  rounded?: boolean;
}

export function Flag({ code, className, rounded = true }: FlagProps) {
  const radius = rounded ? 'rounded-[3px]' : '';
  const base = cn(
    'inline-block overflow-hidden ring-1 ring-black/10 shadow-sm shrink-0',
    radius,
    className
  );

  if (code === 'nl') {
    return (
      <svg viewBox="0 0 9 6" className={base} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="9" height="2" fill="#AE1C28" />
        <rect y="2" width="9" height="2" fill="#FFFFFF" />
        <rect y="4" width="9" height="2" fill="#21468B" />
      </svg>
    );
  }
  if (code === 'de') {
    return (
      <svg viewBox="0 0 5 3" className={base} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width="5" height="1" y="0" fill="#000000" />
        <rect width="5" height="1" y="1" fill="#DD0000" />
        <rect width="5" height="1" y="2" fill="#FFCE00" />
      </svg>
    );
  }
  // GB (used for the EN locale)
  return (
    <svg viewBox="0 0 60 30" className={base} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <clipPath id="gb-clip"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#gb-clip)" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  );
}
