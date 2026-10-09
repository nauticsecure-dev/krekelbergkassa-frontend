'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  HelpCircle,
  Home,
  LogOut,
  Package,
  Receipt,
  Settings,
  Ship,
  ShoppingCart,
  Users,
  Warehouse,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Avatar } from '@/components/ui/Avatar';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/lib/auth-context';
import { useConfirmLogout } from '@/components/auth/ConfirmLogoutProvider';
import { cn } from '@/lib/cn';

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  matches?: string[];
  roles?: string[];
}

interface Props {
  variant?: 'desktop' | 'mobile';
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ variant = 'desktop', collapsed = false, onToggleCollapse }: Props) {
  const { t, locale } = useIntl();
  const pathname = usePathname();
  const { user } = useAuth();
  const { requestLogout } = useConfirmLogout();
  const role = user?.role ?? 'staff';
  const businessRoles = ['admin', 'manager'];

  const main: NavItem[] = [
    { href: `/${locale}/admin`, icon: Home, label: t('adminModules.nav.overview') },
    {
      href: `/${locale}/admin/planning`,
      icon: CalendarDays,
      label: t('adminModules.nav.planning'),
      roles: ['admin', 'manager', 'staff'],
      matches: [`/${locale}/admin/kalender`, `/${locale}/admin/afspraken`, `/${locale}/admin/werkorders`],
    },
    { href: `/${locale}/admin/kassa`, icon: ShoppingCart, label: t('adminModules.nav.pos'), roles: ['admin', 'manager', 'staff'] },
    { href: `/${locale}/admin/stalling`, icon: Warehouse, label: t('adminModules.nav.storage'), roles: ['admin', 'manager', 'staff'] },
    { href: `/${locale}/admin/klanten`, icon: Users, label: t('adminModules.nav.customers'), roles: ['admin', 'manager', 'staff'] },
    { href: `/${locale}/admin/boten`, icon: Ship, label: t('adminModules.nav.boats'), roles: ['admin', 'manager', 'staff'] },
    {
      href: `/${locale}/admin/makelaardij`,
      icon: Receipt,
      label: t('adminModules.nav.brokerage'),
      roles: businessRoles,
      matches: [`/${locale}/admin/verkopen`, `/${locale}/admin/tarieven/makelaardij`],
    },
    {
      href: `/${locale}/admin/financieel`,
      icon: CircleDollarSign,
      label: t('adminModules.nav.finance'),
      roles: businessRoles,
      matches: [
        `/${locale}/admin/facturen`,
        `/${locale}/admin/betalingen`,
        `/${locale}/admin/boekhouding`,
        `/${locale}/admin/rapportages`,
        `/${locale}/admin/leveranciers`,
      ],
    },
    {
      href: `/${locale}/admin/diensten-prijzen`,
      icon: Package,
      label: t('adminModules.nav.servicesPricing'),
      roles: businessRoles,
      matches: [
        `/${locale}/admin/producten`,
        `/${locale}/admin/product-groepen`,
        `/${locale}/admin/bundels`,
        `/${locale}/admin/calculator`,
        `/${locale}/admin/diensten`,
      ],
    },
    {
      href: `/${locale}/admin/beheer`,
      icon: Settings,
      label: t('adminModules.nav.management'),
      roles: ['admin'],
      matches: [
        `/${locale}/admin/gebruikers`,
        `/${locale}/admin/instellingen`,
        `/${locale}/admin/audit`,
        `/${locale}/admin/beveiliging`,
        `/${locale}/admin/api-credentials`,
        `/${locale}/admin/incidenten`,
        `/${locale}/admin/systeem`,
      ],
    },
  ];

  const visibleMain = main.filter((item) => !item.roles || item.roles.includes(role));

  const isActive = (item: NavItem) =>
    pathname === item.href ||
    item.matches?.some((prefix) => pathname === prefix || pathname?.startsWith(`${prefix}/`)) ||
    (item.href !== `/${locale}/admin` && pathname?.startsWith(`${item.href}/`));

  const nav = (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {visibleMain.map((item) => (
          <Item key={item.href} {...item} active={isActive(item)} collapsed={collapsed} />
        ))}
        <SectionDivider />
        <Item
          href={`/${locale}/faq`}
          icon={HelpCircle}
          label={t('admin.sidebar.help')}
          active={pathname === `/${locale}/faq`}
          collapsed={collapsed}
        />
      </nav>
      <UserFooter
        name={user?.name ?? 'Admin'}
        email={user?.email ?? 'admin@krekelberg.nl'}
        onSignOut={requestLogout}
        logoutLabel={t('adminNew.common.logout')}
      />
    </>
  );

  if (variant === 'mobile') {
    return <div className="flex h-full flex-col bg-navy-950 text-sand-100">{nav}</div>;
  }

  return (
    <aside
      className={cn(
        'hidden h-screen shrink-0 flex-col bg-navy-950 text-sand-100 transition-[width] duration-200 lg:flex',
        collapsed ? 'w-[4.5rem]' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-4">
        {!collapsed ? <Logo variant="light" /> : <span className="mx-auto text-xs font-bold text-gold-300">KN</span>}
        {onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="rounded-md p-1.5 text-sand-100/50 hover:bg-white/5 hover:text-white"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        ) : null}
      </div>
      {nav}
    </aside>
  );
}

function SectionDivider() {
  return <div className="my-3 h-px bg-white/5" />;
}

function UserFooter({
  name,
  email,
  onSignOut,
  logoutLabel,
}: {
  name: string;
  email: string;
  onSignOut: () => void;
  logoutLabel: string;
}) {
  return (
    <div className="border-t border-white/5 p-3">
      <div className="flex items-center gap-3 rounded-lg p-2">
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-semibold text-white">{name}</div>
          <div className="truncate text-[11px] text-sand-100/50">{email}</div>
        </div>
        <button
          onClick={onSignOut}
          className="text-sand-100/40 hover:text-white"
          aria-label={logoutLabel}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Item({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
        collapsed && 'justify-center px-2',
        active ? 'bg-white/10 text-white' : 'text-sand-100/70 hover:bg-white/5 hover:text-white'
      )}
    >
      {active ? <span aria-hidden className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold-400" /> : null}
      <Icon className={cn('h-4 w-4 transition', active ? 'text-gold-300' : 'text-sand-100/50 group-hover:text-white')} />
      <span className="flex-1">{!collapsed ? label : null}</span>
    </Link>
  );
}
