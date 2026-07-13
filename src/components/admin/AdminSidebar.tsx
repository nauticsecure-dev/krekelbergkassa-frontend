'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpen,
  Boxes,
  Building2,
  Calendar,
  CalendarClock,
  Coins,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  HelpCircle,
  Home,
  KeyRound,
  Layers,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Ship,
  Users,
  Warehouse,
  Wrench,
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
  badge?: string;
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

  const main: NavItem[] = [
    { href: `/${locale}/admin`, icon: Home, label: t('admin.sidebar.dashboard') },
    { href: `/${locale}/admin/kassa`, icon: ShoppingCart, label: t('admin.sidebar.kassa'), badge: 'POS' },
    { href: `/${locale}/admin/verkopen`, icon: Receipt, label: t('adminNew.sidebar.sales') },
    { href: `/${locale}/admin/afspraken`, icon: CalendarClock, label: t('admin.sidebar.appointments') },
    { href: `/${locale}/admin/calculator`, icon: Calendar, label: t('adminNew.sidebar.calculator') },
    { href: `/${locale}/admin/stalling`, icon: Warehouse, label: t('admin.sidebar.stalling') },
    { href: `/${locale}/admin/klanten`, icon: Users, label: t('admin.sidebar.customers') },
    { href: `/${locale}/admin/boten`, icon: Ship, label: t('admin.sidebar.boats') },
    { href: `/${locale}/admin/facturen`, icon: CreditCard, label: t('admin.sidebar.invoices') },
    { href: `/${locale}/admin/werkorders`, icon: Wrench, label: t('adminNew.sidebar.workOrders'), roles: ['staff', 'manager'] },
    { href: `/${locale}/admin/betalingen`, icon: CreditCard, label: t('admin.sidebar.payments') },
    { href: `/${locale}/admin/producten`, icon: Package, label: t('admin.sidebar.products') },
    { href: `/${locale}/admin/product-groepen`, icon: Layers, label: t('adminNew.sidebar.productGroups') },
    { href: `/${locale}/admin/bundels`, icon: Boxes, label: t('adminNew.sidebar.bundles') },
    { href: `/${locale}/admin/leveranciers`, icon: Building2, label: t('adminNew.sidebar.suppliers'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/boekhouding`, icon: BookOpen, label: t('adminNew.sidebar.accounting'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/rapportages`, icon: BarChart3, label: t('adminNew.sidebar.reports') },
    { href: `/${locale}/admin/tarieven/makelaardij`, icon: Coins, label: t('adminNew.sidebar.brokerage'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/reminders`, icon: BellRing, label: t('adminNew.sidebar.reminders'), roles: ['admin', 'manager'] },
    // Template editor — no API yet; use /admin/stalling for live stalling contracts.
    // { href: `/${locale}/admin/contracten`, icon: FileText, label: t('admin.sidebar.contracts'), roles: ['admin', 'manager'] },
  ];

  const secondary: NavItem[] = [
    { href: `/${locale}/admin/kalender`, icon: Calendar, label: t('admin.sidebar.calendarAdmin') },
    { href: `/${locale}/admin/gebruikers`, icon: Users, label: t('admin.sidebar.users'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/timeline`, icon: Activity, label: t('adminNew.sidebar.timeline'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/audit`, icon: ShieldCheck, label: t('admin.sidebar.audit'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/beveiliging`, icon: ShieldCheck, label: t('adminNew.sidebar.security'), roles: ['admin'] },
    { href: `/${locale}/admin/api-credentials`, icon: KeyRound, label: t('adminNew.sidebar.apiCredentials'), roles: ['admin'] },
    { href: `/${locale}/admin/incidenten`, icon: AlertTriangle, label: t('adminNew.sidebar.incidents'), roles: ['admin'] },
    { href: `/${locale}/admin/systeem`, icon: Wrench, label: t('admin.sidebar.system'), roles: ['admin'] },
    { href: `/${locale}/admin/instellingen`, icon: Settings, label: t('admin.sidebar.settings') },
    { href: `/${locale}/faq`, icon: HelpCircle, label: t('admin.sidebar.help') },
  ];

  const visibleMain = main.filter((item) => {
    if (!('roles' in item) || !item.roles) return true;
    return item.roles.includes(role);
  });
  const visibleSecondary = secondary.filter((item) => {
    if (!('roles' in item) || !item.roles) return true;
    return item.roles.includes(role);
  });

  const isActive = (href: string) =>
    pathname === href || (href !== `/${locale}/admin` && pathname?.startsWith(href + '/'));

  const nav = (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {visibleMain.map((l) => (
          <Item key={l.href} {...l} active={isActive(l.href)} collapsed={collapsed} />
        ))}
        <SectionDivider />
        {visibleSecondary.map((l) => (
          <Item key={l.href} {...l} active={isActive(l.href)} collapsed={collapsed} />
        ))}
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
    return (
      <div className="flex h-full flex-col bg-navy-950 text-sand-100">{nav}</div>
    );
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
  badge,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
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
        active
          ? 'bg-white/10 text-white'
          : 'text-sand-100/70 hover:bg-white/5 hover:text-white'
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-gold-400"
        />
      ) : null}
      <Icon
        className={cn(
          'h-4 w-4 transition',
          active ? 'text-gold-300' : 'text-sand-100/50 group-hover:text-white'
        )}
      />
      <span className="flex-1">{!collapsed ? label : null}</span>
      {badge && !collapsed ? (
        <span
          className={cn(
            'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
            active
              ? 'bg-gold-400/20 text-gold-200'
              : 'bg-white/5 text-sand-100/70'
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
