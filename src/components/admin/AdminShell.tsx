'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  ChevronDown,
  HelpCircle,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  X,
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';
import { ConnectionIndicator } from '@/components/sync/ConnectionIndicator';
import { useQuery } from '@/lib/hooks/useAsync';
import { adminService, invoicesService, stallingService } from '@/lib/services';

export function AdminShell({ children }: { children: React.ReactNode }) {
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
      {/* Desktop sidebar */}
      <AdminSidebar />

      {/* Mobile drawer */}
      <MobileDrawer open={open} onClose={() => setOpen(false)}>
        <AdminSidebar variant="mobile" />
      </MobileDrawer>

      <div className="flex min-w-0 flex-1 flex-col">
        <GlobalTopbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Global Topbar                                  */
/* -------------------------------------------------------------------------- */

function GlobalTopbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { t, locale } = useIntl();
  const { user, signOut } = useAuth();
  const [bell, setBell] = React.useState(false);
  const [menu, setMenu] = React.useState(false);
  const notifications = useQuery([locale], async () => {
    const [invoices, stalling, reminders] = await Promise.all([
      invoicesService.list({ per_page: 30 }).catch(() => ({ data: [] as Array<{ is_overdue?: boolean; is_fully_paid?: boolean }> })),
      stallingService.list({ per_page: 30 }).catch(() => ({ data: [] as Array<{ payment_status?: string }> })),
      adminService.reminders({ per_page: 1 }).catch(() => null),
    ]);

    const overdueInvoices = invoices.data.filter((item) => item.is_overdue && !item.is_fully_paid).length;
    const overdueStalling = stalling.data.filter((item) => item.payment_status === 'overdue').length;
    const pendingReminders = reminders?.meta?.total ?? reminders?.data.length ?? 0;

    const items: Array<{
      id: string;
      title: string;
      message: string;
      href: string;
      dot: string;
    }> = [];

    if (overdueInvoices > 0) {
      items.push({
        id: 'overdue-invoices',
        title: t('adminNew.dashboard.cards.openInvoices.title'),
        message: t('adminNew.dashboard.cards.openInvoices.subtitle', { count: overdueInvoices }),
        href: `/${locale}/admin/facturen`,
        dot: 'bg-rose-500',
      });
    }

    if (overdueStalling > 0) {
      items.push({
        id: 'overdue-stalling',
        title: t('adminNew.dashboard.cards.stallingActions.title'),
        message: t('adminNew.dashboard.cards.stallingActions.subtitle'),
        href: `/${locale}/admin/stalling`,
        dot: 'bg-amber-500',
      });
    }

    if (pendingReminders > 0) {
      items.push({
        id: 'pending-reminders',
        title: t('adminNew.dashboard.portal.newQuestions'),
        message: `${pendingReminders}`,
        href: `/${locale}/admin/facturen`,
        dot: 'bg-marine-500',
      });
    }

    return items;
  });

  const unreadCount = notifications.data?.length ?? 0;

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

      <Link href={`/${locale}/admin`} className="lg:hidden" aria-label="Krekelberg">
        <Logo />
      </Link>

      {/* Search */}
      <div className="relative hidden flex-1 lg:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
        <input
          type="search"
          placeholder={t('admin.common.search')}
          className="input-base w-full max-w-md pl-9"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-navy-100 bg-sand-50 px-1.5 py-0.5 text-[10px] font-semibold text-navy-500 sm:inline">
          ⌘ K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <Link
          href={`/${locale}/admin/kassa`}
          className="hidden md:inline-flex"
          aria-label={t('admin.sidebar.kassa')}
        >
          <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-gold-500 px-3 text-xs font-semibold text-white hover:bg-gold-600">
            <Plus className="h-3.5 w-3.5" />
            {t('admin.common.new')}
          </span>
        </Link>

        <LanguageSwitcher />
        <ConnectionIndicator />

        {/* Bell */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setBell((v) => !v)}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-700 hover:bg-sand-50"
            aria-label={t('adminNew.shell.notifications')}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            ) : null}
          </button>
          {bell ? (
            <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev">
              <div className="flex items-center justify-between border-b border-navy-100 px-4 py-3">
                <span className="font-semibold text-navy-900">{t('adminNew.shell.notifications')}</span>
                <Badge tone="gold">{unreadCount}</Badge>
              </div>
              {notifications.loading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border border-navy-100 px-3 py-2">
                      <span className="block h-3 w-32 animate-pulse rounded bg-navy-100" />
                      <span className="mt-2 block h-3 w-40 animate-pulse rounded bg-navy-100" />
                    </div>
                  ))}
                </div>
              ) : (
                <ul className="max-h-80 overflow-y-auto scrollbar-thin">
                  {unreadCount === 0 ? (
                    <li className="px-4 py-6 text-center text-sm text-navy-500">
                      {t('adminNew.states.emptyTitle')}
                    </li>
                  ) : (
                    notifications.data?.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={n.href}
                          className="flex items-start gap-3 border-b border-navy-50 px-4 py-3 hover:bg-sand-50"
                        >
                          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.dot)} />
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-navy-900">{n.title}</div>
                            <div className="truncate text-xs text-navy-500">{n.message}</div>
                          </div>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}
              <Link
                href={`/${locale}/admin`}
                className="block bg-sand-50 px-4 py-3 text-center text-sm font-semibold text-navy-900 hover:bg-sand-100"
              >
                {t('adminNew.shell.viewAllUpdates')}
              </Link>
            </div>
          ) : null}
        </div>

        {/* Profile */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-1.5 py-1.5 text-sm font-medium text-navy-700 hover:bg-sand-50"
          >
            <Avatar name={user?.name ?? 'Admin'} size="sm" />
            <ChevronDown className="hidden h-3.5 w-3.5 sm:inline" />
          </button>
          {menu ? (
            <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev">
              <div className="border-b border-navy-100 px-4 py-3">
                <div className="text-sm font-semibold text-navy-900">
                  {user?.name ?? 'Admin'}
                </div>
                <div className="truncate text-xs text-navy-400">
                  {user?.email ?? 'admin@krekelberg.nl'}
                </div>
              </div>
              <Link
                href={`/${locale}/admin/instellingen`}
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
              <Link
                href={`/${locale}/admin/sync`}
                className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-sand-50"
              >
                <Bell className="h-4 w-4" />
                {t('adminNew.sidebar.sync')}
              </Link>
              <button
                onClick={() => void signOut()}
                className="flex w-full items-center gap-2 border-t border-navy-100 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              >
                <LogOut className="h-4 w-4" />
                {t('adminNew.common.logout')}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                       Reusable mobile drawer + headers                      */
/* -------------------------------------------------------------------------- */

function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
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
        onClick={onClose}
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
              onClick={onClose}
              className="rounded-md p-2 text-sand-100/70 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AdminPageHeader({
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
