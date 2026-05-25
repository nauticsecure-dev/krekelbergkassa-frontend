'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Calendar,
  CalendarClock,
  CreditCard,
  HelpCircle,
  Home,
  LogOut,
  Package,
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
}

export function AdminSidebar({ variant = 'desktop' }: Props) {
  const { t, locale } = useIntl();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const role = user?.role ?? 'staff';

  const main: NavItem[] = [
    { href: `/${locale}/admin`, icon: Home, label: t('admin.sidebar.dashboard') },
    { href: `/${locale}/admin/kassa`, icon: ShoppingCart, label: t('admin.sidebar.kassa'), badge: 'POS' },
    { href: `/${locale}/admin/afspraken`, icon: CalendarClock, label: t('admin.sidebar.appointments') },
    { href: `/${locale}/admin/calculator`, icon: Calendar, label: t('adminNew.sidebar.calculator') },
    { href: `/${locale}/admin/stalling`, icon: Warehouse, label: t('admin.sidebar.stalling') },
    { href: `/${locale}/admin/klanten`, icon: Users, label: t('admin.sidebar.customers') },
    { href: `/${locale}/admin/boten`, icon: Ship, label: t('admin.sidebar.boats') },
    { href: `/${locale}/admin/facturen`, icon: CreditCard, label: t('admin.sidebar.invoices') },
    { href: `/${locale}/admin/betalingen`, icon: CreditCard, label: t('admin.sidebar.payments') },
    { href: `/${locale}/admin/producten`, icon: Package, label: t('admin.sidebar.products') },
    // Template editor — no API yet; use /admin/stalling for live stalling contracts.
    // { href: `/${locale}/admin/contracten`, icon: FileText, label: t('admin.sidebar.contracts'), roles: ['admin', 'manager'] },
  ];

  const secondary: NavItem[] = [
    { href: `/${locale}/admin/kalender`, icon: Calendar, label: t('admin.sidebar.calendarAdmin') },
    { href: `/${locale}/admin/gebruikers`, icon: Users, label: t('admin.sidebar.users'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/audit`, icon: ShieldCheck, label: t('admin.sidebar.audit'), roles: ['admin', 'manager'] },
    { href: `/${locale}/admin/sync`, icon: BarChart3, label: t('adminNew.sidebar.sync') },
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
          <Item key={l.href} {...l} active={isActive(l.href)} />
        ))}
        <SectionDivider />
        {visibleSecondary.map((l) => (
          <Item key={l.href} {...l} active={isActive(l.href)} />
        ))}
      </nav>
      <UserFooter
        name={user?.name ?? 'Admin'}
        email={user?.email ?? 'admin@krekelberg.nl'}
        onSignOut={() => void signOut()}
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
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-navy-950 text-sand-100 lg:flex">
      <div className="border-b border-white/5 px-5 py-4">
        <Logo variant="light" />
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
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
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
      <span className="flex-1">{label}</span>
      {badge ? (
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
