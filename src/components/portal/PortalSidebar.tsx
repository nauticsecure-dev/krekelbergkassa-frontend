'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import {
  Anchor,
  ArrowRight,
  Calendar,
  FileText,
  HelpCircle,
  LogOut,
  MessageCircle,
  Settings,
  Ship,
  Sparkles,
  Warehouse,
} from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';

interface Props {
  variant?: 'desktop' | 'mobile';
}

type PortalNavLink = {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
};

export function PortalSidebar({ variant = 'desktop' }: Props) {
  const { locale, t } = useIntl();
  const { user, signOut } = useAuth();
  const pathname = usePathname();

  const links: PortalNavLink[] = [
    { href: `/${locale}/feed`, icon: Sparkles, label: t('feed.title') },
    { href: `/${locale}/dashboard/afspraken`, icon: Calendar, label: t('login.yourAppointments') },
    { href: `/${locale}/dashboard/stalling`, icon: Warehouse, label: t('services.storage.title') },
    { href: `/${locale}/dashboard/boten`, icon: Ship, label: t('login.yourBoats') },
    { href: `/${locale}/dashboard/facturen`, icon: FileText, label: t('login.invoices') },
    { href: `/${locale}/dashboard/documenten`, icon: Anchor, label: t('portalSidebar.documents') },
    { href: `/${locale}/dashboard/berichten`, icon: MessageCircle, label: t('feed.messages') },
  ];

  const inner = (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3 scrollbar-thin">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || pathname?.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
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
              <span className="flex-1">{l.label}</span>
              {l.badge ? (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                    active
                      ? 'bg-gold-400/20 text-gold-200'
                      : 'bg-gold-500/15 text-gold-300'
                  )}
                >
                  {l.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
        <div className="my-3 h-px bg-white/5" />
        <Link
          href={`/${locale}/dashboard/settings`}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
            pathname === `/${locale}/dashboard/settings`
              ? 'bg-white/10 text-white'
              : 'text-sand-100/70 hover:bg-white/5 hover:text-white'
          )}
        >
          <Settings className="h-4 w-4 text-sand-100/50" /> {t('admin.sidebar.settings')}
        </Link>
        <Link
          href={`/${locale}/faq`}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sand-100/70 transition hover:bg-white/5 hover:text-white"
        >
          <HelpCircle className="h-4 w-4 text-sand-100/50" /> {t('admin.sidebar.help')}
        </Link>
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-tr from-gold-600 via-gold-500 to-amber-400 p-4 text-navy-900 shadow-elev">
          <Sparkles className="absolute -right-1 -top-1 h-10 w-10 text-white/30" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-navy-900/80">
              {t('feed.newsletter')}
            </div>
            <div className="mt-1 text-sm font-semibold leading-tight">
              {t('feed.newsletterDesc')}
            </div>
            <Link
              href={`/${locale}/kraanafspraak`}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-navy-950 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-900"
            >
              {t('feed.planAppointment')}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-lg px-2 py-2">
          <Avatar name={user?.name ?? 'Jan Jansen'} size="sm" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold text-white">
              {user?.name ?? 'Jan Jansen'}
            </div>
            <div className="truncate text-[11px] text-sand-100/50">
              {user?.email ?? 'jan@example.com'}
            </div>
          </div>
          <button
            onClick={() => void signOut()}
            className="text-sand-100/40 hover:text-white"
            aria-label={t('adminNew.common.logout')}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  if (variant === 'mobile') {
    return <div className="flex h-full flex-col bg-navy-950 text-sand-100">{inner}</div>;
  }

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col bg-navy-950 text-sand-100 lg:flex">
      <div className="border-b border-white/5 px-6 py-5">
        <Logo variant="light" />
      </div>
      {inner}
    </aside>
  );
}
