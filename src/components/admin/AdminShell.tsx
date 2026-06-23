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
  Settings,
  X,
} from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminGlobalSearch, AdminSearchTrigger, useGlobalSearchShortcut } from './AdminGlobalSearch';
import { ImpersonationBanner } from '@/components/auth/ImpersonationBanner';
import { ConfirmLogoutProvider, useConfirmLogout } from '@/components/auth/ConfirmLogoutProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { LanguageSwitcher } from '@/components/site/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/auth-context';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';
import { ConnectionIndicator } from '@/components/sync/ConnectionIndicator';
import { useShellDropdowns } from '@/components/shell/useShellDropdowns';
import { PageHeaderStatsGrid, type PageHeaderStat } from '@/components/shell/PageHeaderStats';
import { useQuery } from '@/lib/hooks/useAsync';
import { adminService, invoicesService, stallingService } from '@/lib/services';
import { trackEvent } from '@/lib/track-event';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const pathname = usePathname();

  useGlobalSearchShortcut(() => setSearchOpen(true));

  React.useEffect(() => setOpen(false), [pathname]);
  // Trello #104 (Pillar 8): track admin navigation as journey events.
  React.useEffect(() => {
    trackEvent('page_changed', { metadata: { to: pathname } });
  }, [pathname]);
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <ConfirmLogoutProvider>
      <div className="flex h-screen overflow-hidden bg-sand-50">
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
      />

      <MobileDrawer open={open} onClose={() => setOpen(false)}>
        <AdminSidebar variant="mobile" />
      </MobileDrawer>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ImpersonationBanner />
        <GlobalTopbar
          onMenuClick={() => setOpen(true)}
          onSearchClick={() => setSearchOpen(true)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>

      <AdminGlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
    </ConfirmLogoutProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*                              Global Topbar                                  */
/* -------------------------------------------------------------------------- */

function GlobalTopbar({
  onMenuClick,
  onSearchClick,
}: {
  onMenuClick: () => void;
  onSearchClick: () => void;
}) {
  const { t, locale } = useIntl();
  const { user } = useAuth();
  const { requestLogout } = useConfirmLogout();
  const { bellOpen, menuOpen, toggleBell, toggleMenu, closeAll } = useShellDropdowns();
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

  return (
    <div className="sticky top-0 z-40 shrink-0 border-b border-navy-100 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5">
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
        <AdminSearchTrigger onClick={onSearchClick} />

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
          <div className="relative" data-shell-dropdown>
            <button
              type="button"
              onClick={toggleBell}
              aria-expanded={bellOpen}
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
            {bellOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev anim-zoom">
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
                            onClick={closeAll}
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
                  onClick={closeAll}
                  className="block bg-sand-50 px-4 py-3 text-center text-sm font-semibold text-navy-900 hover:bg-sand-100"
                >
                  {t('adminNew.shell.viewAllUpdates')}
                </Link>
              </div>
            ) : null}
          </div>

          {/* Profile */}
          <div className="relative" data-shell-dropdown>
            <button
              type="button"
              onClick={toggleMenu}
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-lg border border-navy-100 bg-white px-1.5 py-1.5 text-sm font-medium text-navy-700 hover:bg-sand-50"
            >
              <Avatar name={user?.name ?? 'Admin'} size="sm" />
              <ChevronDown className="hidden h-3.5 w-3.5 sm:inline" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-navy-100 bg-white shadow-elev anim-zoom">
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
                  onClick={closeAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-sand-50"
                >
                  <Settings className="h-4 w-4" />
                  {t('admin.sidebar.settings')}
                </Link>
                <Link
                  href={`/${locale}/faq`}
                  onClick={closeAll}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-navy-700 hover:bg-sand-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  {t('admin.sidebar.help')}
                </Link>
                <button
                  onClick={requestLogout}
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

export type AdminHeaderStat = PageHeaderStat;

export function AdminPageHeader({
  title,
  subtitle,
  rightSlot,
  children,
  eyebrow,
  stats,
}: {
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  eyebrow?: string;
  stats?: AdminHeaderStat[];
}) {
  return (
    <div className="bg-sand-50 px-4 pb-1 pt-3 sm:px-4 lg:px-6">
      <div className="mx-auto max-w-[1440px]">
        <div className="admin-hero-card px-5 py-4 sm:px-7 sm:py-5">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-marine-200/25 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-gold-200/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              {eyebrow ? <p className="admin-hero-eyebrow">{eyebrow}</p> : null}
              <h1 className={cn('admin-hero-title', eyebrow ? 'mt-1' : '')}>{title}</h1>
              {subtitle ? (
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-navy-500">{subtitle}</p>
              ) : null}
            </div>
            {rightSlot ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:pt-1">{rightSlot}</div>
            ) : null}
          </div>

          {stats?.length ? <PageHeaderStatsGrid stats={stats} /> : null}

          {children ? <div className="relative mt-3">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
