'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { PortalSidebar } from './PortalSidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';

export function PortalShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setOpen(false), [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="flex h-screen overflow-hidden bg-sand-50">
      <PortalSidebar />

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity',
            open ? 'opacity-100' : 'opacity-0'
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            'absolute left-0 top-0 h-full w-72 bg-navy-950 text-sand-100 shadow-elev transition-transform duration-200',
            open ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
              <Logo variant="light" />
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-2 text-sand-100/70 hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <PortalSidebar variant="mobile" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalGlobalTopbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}

function PortalGlobalTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { t, locale } = useIntl();
  const { user, signOut, isDemo } = useAuth();
  const [bell, setBell] = React.useState(false);
  const [menu, setMenu] = React.useState(false);

  React.useEffect(() => {
    const close = () => {
      setBell(false);
      setMenu(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <div className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-white/80 sm:px-5">
      <button
        onClick={onMenuClick}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-navy-100 text-navy-700 hover:bg-sand-50 lg:hidden"
        aria-label={t('header.mainMenu')}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href={`/${locale}/feed`} className="lg:hidden" aria-label="Krekelberg">
        <Logo />
      </Link>

      <div className="relative hidden flex-1 lg:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <input
          type="search"
          placeholder={t('admin.common.search')}
          className="input-base w-full max-w-md pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {isDemo ? (
          <Badge tone="gold" className="hidden sm:inline-flex" dot>
            Demo
          </Badge>
        ) : null}

        <Link href={`/${locale}/kraanafspraak`} className="hidden md:inline-flex">
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-white hover:bg-gold-600">
            {t('nav.bookCrane')}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>

        <LanguageSwitcher />

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setBell((v) => !v)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-700 hover:bg-sand-50"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">
              3
            </span>
          </button>
          {bell ? (
            <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev">
              <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
                <span className="font-semibold text-navy-900">Meldingen</span>
                <Badge tone="gold">3</Badge>
              </div>
              <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                {[
                  { id: 1, title: 'Uw kraanafspraak is morgen', message: 'Aquila · 14 okt om 10:00', time: '2 u geleden', dot: 'bg-marine-500' },
                  { id: 2, title: 'Factuur #2026-104 staat open', message: 'Betalingstermijn verlopen', time: '1 dag geleden', dot: 'bg-rose-500' },
                  { id: 3, title: 'Winterstalling loopt af', message: 'Aquila · 31 maart', time: '2 dagen geleden', dot: 'bg-amber-500' },
                ].map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 border-b border-navy-50 px-4 py-3 hover:bg-sand-50"
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.dot)} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-navy-900">{n.title}</div>
                      <div className="truncate text-xs text-navy-500">{n.message}</div>
                      <div className="mt-1 text-[11px] text-navy-400">{n.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                href={`/${locale}/feed`}
                className="block bg-sand-50 px-4 py-3 text-center text-sm font-semibold text-navy-900 hover:bg-sand-100"
              >
                {t('feed.viewAll')}
              </Link>
            </div>
          ) : null}
        </div>

        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-1.5 py-1.5 text-sm font-medium text-navy-700 hover:bg-sand-50"
          >
            <Avatar name={user?.name ?? 'Jan Jansen'} size="sm" />
            <ChevronDown className="hidden h-3.5 w-3.5 sm:inline" />
          </button>
          {menu ? (
            <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev">
              <div className="border-b border-navy-100 px-4 py-3">
                <div className="text-sm font-semibold text-navy-900">
                  {user?.name ?? 'Jan Jansen'}
                </div>
                <div className="truncate text-xs text-navy-400">
                  {user?.email ?? 'jan@example.com'}
                </div>
              </div>
              <Link
                href={`/${locale}/dashboard/settings`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-sand-50"
              >
                <Settings className="h-4 w-4" />
                {t('admin.sidebar.settings')}
              </Link>
              <Link
                href={`/${locale}/faq`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-sand-50"
              >
                <HelpCircle className="h-4 w-4" />
                {t('admin.sidebar.help')}
              </Link>
              <button
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2 border-t border-navy-100 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                Uitloggen
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Same look & feel as AdminPageHeader — sticky below the global topbar. */
export function PortalPageHeader({
  title,
  subtitle,
  rightSlot,
  children,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b border-navy-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="heading-display text-2xl text-navy-900 sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-navy-500">{subtitle}</p>
          ) : null}
        </div>
        {rightSlot ? (
          <div className="flex flex-wrap items-center gap-2">{rightSlot}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
