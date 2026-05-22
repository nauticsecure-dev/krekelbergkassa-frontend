'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Check, ChevronDown } from 'lucide-react';
import Cookies from 'js-cookie';
import { Locale, localeLabels, locales } from '@/i18n/config';
import { useIntl } from '@/i18n/IntlProvider';
import { Flag } from '@/components/ui/Flag';
import { cn } from '@/lib/cn';

interface Props {
  className?: string;
  variant?: 'dark' | 'light';
  size?: 'sm' | 'md';
}

export function LanguageSwitcher({
  className,
  variant = 'dark',
  size = 'sm',
}: Props) {
  const { locale } = useIntl();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const change = (target: Locale) => {
    Cookies.set('krek_locale', target, { expires: 365, sameSite: 'lax', path: '/' });
    const parts = pathname.split('/');
    parts[1] = target;
    router.push(parts.join('/') || `/${target}`);
    setOpen(false);
  };

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const trigger =
    variant === 'dark'
      ? 'border-navy-100 bg-white text-navy-800 hover:border-navy-200'
      : 'border-white/15 bg-white/5 text-sand-100 hover:bg-white/10';

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border transition',
          size === 'sm' ? 'h-9 pl-1.5 pr-2.5 text-sm' : 'h-10 pl-2 pr-3 text-sm',
          trigger
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Flag code={locale as Locale} className="h-4 w-5" />
        <span className="font-medium uppercase">{locale}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            open && 'rotate-180'
          )}
        />
      </button>
      {open ? (
        <div className="anim-zoom absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev ring-1 ring-black/5">
          <div className="border-b border-navy-50 bg-sand-50/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-navy-500">
            Taal · Sprache · Language
          </div>
          <ul role="listbox" className="py-1">
            {locales.map((l) => {
              const active = l === locale;
              return (
                <li key={l}>
                  <button
                    onClick={() => change(l)}
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-sm transition',
                      active
                        ? 'bg-marine-50/70 text-navy-900'
                        : 'text-navy-700 hover:bg-sand-50'
                    )}
                  >
                    <Flag code={l} className="h-4 w-6" />
                    <span className="flex-1 text-left font-medium">
                      {localeLabels[l]}
                    </span>
                    <span className="text-[11px] uppercase text-navy-400">
                      {l}
                    </span>
                    {active ? (
                      <Check className="h-4 w-4 text-marine-600" />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
