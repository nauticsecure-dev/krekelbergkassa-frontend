'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  Droplets,
  Hammer,
  Menu,
  Phone,
  Ship,
  Sparkles,
  Warehouse,
  X,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { InstallButton } from '@/components/pwa/InstallButton';
import { cn } from '@/lib/cn';
import { companyInfo } from '@/lib/company';
import { useCms } from '@/components/cms/CmsProvider';

interface MegaItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  desc: string;
}

export function Header() {
  const { t, locale } = useIntl();
  const { getGlobal } = useCms();
  const phone = getGlobal('company.phone', t('footer.phone'));
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [hoveredMenu, setHoveredMenu] = React.useState<string | null>(null);
  const hoverTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  const servicesMega: MegaItem[] = [
    { href: `/${locale}/kraanafspraak`, icon: Ship, label: t('services.crane.title'), desc: t('services.crane.desc') },
    { href: `/${locale}/diensten/afspuiten`, icon: Droplets, label: t('services.wash.title'), desc: t('services.wash.desc') },
    { href: `/${locale}/diensten/winterstalling`, icon: Warehouse, label: t('services.storage.title'), desc: t('services.storage.desc') },
    { href: `/${locale}/diensten/zelf-werken`, icon: Hammer, label: t('services.diy.title'), desc: t('services.diy.desc') },
  ];

  const openMenu = (id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredMenu(id);
  };
  const closeMenu = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoveredMenu(null), 140);
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-40 w-full transition-all',
        scrolled
          ? 'border-b border-navy-100/80 bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/90'
          : 'border-b border-transparent bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/90'
      )}
    >
      {/* Sub-bar */}
      <div className="hidden border-b border-navy-100/60 bg-navy-900 text-white lg:block">
        <div className="container-wide flex h-9 items-center justify-between text-xs">
          <div className="flex items-center gap-5 text-sand-100/80">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-gold-300" />
              {t('nav.subnavCta')}
            </span>
          </div>
          <div className="flex items-center gap-5 text-sand-100/80">
            <Link href={`/${locale}/contact`} className="hover:text-white">
              {t('nav.subnavLocation')}
            </Link>
            <span className="opacity-30">·</span>
            <a href={companyInfo.phoneHref} className="inline-flex items-center gap-1.5 hover:text-white">
              <Phone className="h-3 w-3" /> {phone}
            </a>
            <span className="opacity-30">·</span>
            <a href="mailto:info@krekelberg-nautic.nl" className="hover:text-white">
              {t('footer.email')}
            </a>
          </div>
        </div>
      </div>

      {/* Main bar */}
      <div className="container-wide flex h-[72px] items-center justify-between gap-8">
        <Link href={`/${locale}`} aria-label="Krekelberg Nautic" className="shrink-0">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center lg:flex">
          <ul className="flex items-center gap-1">
            <li
              onMouseEnter={() => openMenu('services')}
              onMouseLeave={closeMenu}
              className="relative"
            >
              <NavLink
                href={`/${locale}/diensten`}
                active={
                  pathname.startsWith(`/${locale}/diensten`) ||
                  pathname.startsWith(`/${locale}/kraanafspraak`)
                }
                hasMenu
                expanded={hoveredMenu === 'services'}
              >
                {t('nav.services')}
              </NavLink>
              {hoveredMenu === 'services' ? (
                <MegaPanel
                  items={servicesMega}
                  locale={locale}
                  groupLabel={t('header.groupServices')}
                  onClose={() => setHoveredMenu(null)}
                  ctaText={t('nav.megaCta')}
                  actionText={t('nav.megaAction')}
                />
              ) : null}
            </li>
            <NavLink
              href={`/${locale}/verkoop`}
              active={pathname.startsWith(`/${locale}/verkoop`)}
            >
              {t('nav.salesLocation')}
            </NavLink>
            <NavLink
              href={`/${locale}/over-ons`}
              active={pathname === `/${locale}/over-ons`}
            >
              {t('nav.about')}
            </NavLink>
            <NavLink href={`/${locale}/contact`} active={pathname === `/${locale}/contact`}>
              {t('nav.contact')}
            </NavLink>
          </ul>
        </nav>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <InstallButton variant="header" className="hidden md:inline-flex" />
          <LanguageSwitcher />
          <Link href={`/${locale}/login`} className="hidden xl:inline-flex">
            <Button variant="ghost" size="md">
              {t('nav.login')}
            </Button>
          </Link>
          <Link href={`/${locale}/kraanafspraak`} className="hidden md:inline-flex">
            <Button variant="gold" size="md" rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t('nav.bookCrane')}
            </Button>
          </Link>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-navy-100 bg-white text-navy-700 transition hover:bg-sand-50 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={t('header.mainMenu')}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open ? (
        <div className="border-t border-navy-100 bg-white lg:hidden">
          <div className="container-wide grid gap-1 py-4">
            <MobileGroup label={t('header.groupServices')}>
              {servicesMega.map((m) => (
                <MobileSubLink key={m.href} href={m.href} icon={m.icon}>
                  {m.label}
                </MobileSubLink>
              ))}
            </MobileGroup>
            <MobileLink href={`/${locale}/verkoop`}>{t('nav.salesLocation')}</MobileLink>
            <MobileLink href={`/${locale}/over-ons`}>{t('nav.about')}</MobileLink>
            <MobileLink href={`/${locale}/contact`}>{t('nav.contact')}</MobileLink>
            <div className="my-3 h-px bg-navy-100" />
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/${locale}/login`}>
                <Button variant="outline" fullWidth>
                  {t('nav.login')}
                </Button>
              </Link>
              <Link href={`/${locale}/kraanafspraak`}>
                <Button variant="gold" fullWidth>
                  {t('nav.bookCrane')}
                </Button>
              </Link>
            </div>
            <div className="mt-2">
              <InstallButton variant="header" className="w-full justify-center" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}

function NavLink({
  href,
  active,
  hasMenu,
  expanded,
  children,
}: {
  href: string;
  active?: boolean;
  hasMenu?: boolean;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          'group inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition',
          active ? 'text-navy-900' : 'text-navy-700 hover:text-navy-900'
        )}
      >
        <span className="relative">
          {children}
          <span
            className={cn(
              'absolute -bottom-1.5 left-0 right-0 h-[2px] origin-center rounded-full bg-gold-500 transition-transform duration-200',
              active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
            )}
          />
        </span>
        {hasMenu ? (
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 text-navy-400 transition-transform',
              expanded && 'rotate-180'
            )}
          />
        ) : null}
      </Link>
    </li>
  );
}

function MobileGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="py-2">
      <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-navy-400">
        {label}
      </div>
      <div className="grid">{children}</div>
    </div>
  );
}

function MobileSubLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-navy-700 hover:bg-sand-50"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-marine-50 text-marine-700">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </Link>
  );
}

function MobileLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-3 text-sm font-semibold text-navy-800 hover:bg-sand-50"
    >
      {children}
    </Link>
  );
}

function MegaPanel({
  items,
  locale,
  groupLabel,
  ctaText,
  actionText,
  onClose,
}: {
  items: MegaItem[];
  locale: string;
  groupLabel: string;
  ctaText: string;
  actionText: string;
  onClose: () => void;
}) {
  return (
    <div
      className="anim-zoom absolute left-1/2 top-full z-50 mt-2 w-[680px] -translate-x-1/2 overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-elev ring-1 ring-black/5"
      onMouseLeave={onClose}
    >
      <div className="border-b border-navy-50 bg-sand-50/60 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-navy-500">
        {groupLabel}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className="group flex items-start gap-3 rounded-xl p-3 transition hover:bg-sand-50"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-marine-50 text-marine-700 transition group-hover:bg-marine-100">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-navy-900">
                  {it.label}
                </div>
                <div className="line-clamp-2 text-xs text-navy-500">
                  {it.desc}
                </div>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
            </Link>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/60 px-5 py-3">
        <div className="flex items-center gap-2 text-xs text-navy-500">
          <Calendar className="h-3.5 w-3.5" />
          {ctaText}
        </div>
        <Link
          href={`/${locale}/kraanafspraak`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:text-marine-700"
        >
          {actionText} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
