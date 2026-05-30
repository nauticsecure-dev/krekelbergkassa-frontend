'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BarChart3,
  Fingerprint,
  Hammer,
  MapPin,
  Share2,
  ShieldCheck,
  UserCircle2,
} from 'lucide-react';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { Logo } from '@/components/ui/Logo';
import { RedirectIfAuthed } from '@/components/auth/RedirectIfAuthed';
import {
  LOGIN_ROLES,
  coerceLoginRole,
  type LoginRole,
} from '@/components/auth/RoleTabs';
import { useIntl } from '@/i18n/IntlProvider';
import { cn } from '@/lib/cn';

interface VisualVariant {
  badge: string;
  title: string;
  subtitle: string;
  image: string;
  features: { icon: typeof ShieldCheck; title: string; desc: string }[];
}

type VariantKind = 'signin' | 'signup' | 'forgot';

function getVariantKind(pathname: string): VariantKind {
  if (pathname.endsWith('/signup')) return 'signup';
  if (pathname.endsWith('/forgot-password')) return 'forgot';
  return 'signin';
}

function buildVariant(kind: VariantKind, t: (key: string) => string): VisualVariant {
  if (kind === 'signup') {
    return {
      badge: t('authLayout.signupBadge'),
      title: t('authLayout.signupTitle'),
      subtitle: t('authLayout.signupSubtitle'),
      image: '/img/krek/verkoop-schip.webp',
      features: [
        { icon: ShieldCheck, title: t('authLayout.signupF1Title'), desc: t('authLayout.signupF1Desc') },
        { icon: Fingerprint, title: t('authLayout.signupF2Title'), desc: t('authLayout.signupF2Desc') },
        { icon: Share2, title: t('authLayout.signupF3Title'), desc: t('authLayout.signupF3Desc') },
      ],
    };
  }
  if (kind === 'forgot') {
    return {
      badge: t('authLayout.forgotBadge'),
      title: t('authLayout.forgotTitle'),
      subtitle: t('authLayout.forgotSubtitle'),
      image: '/img/krek/werf-hero.webp',
      features: [
        { icon: ShieldCheck, title: t('authLayout.forgotF1Title'), desc: t('authLayout.forgotF1Desc') },
        { icon: Fingerprint, title: t('authLayout.forgotF2Title'), desc: t('authLayout.forgotF2Desc') },
        { icon: Share2, title: t('authLayout.forgotF3Title'), desc: t('authLayout.forgotF3Desc') },
      ],
    };
  }
  return {
    badge: t('authLayout.signinBadge'),
    title: t('authLayout.signinTitle'),
    subtitle: t('authLayout.signinSubtitle'),
    image: '/img/krek/jachthaven.webp',
    features: [
      { icon: ShieldCheck, title: t('authLayout.signinF1Title'), desc: t('authLayout.signinF1Desc') },
      { icon: Fingerprint, title: t('authLayout.signinF2Title'), desc: t('authLayout.signinF2Desc') },
      { icon: Share2, title: t('authLayout.signinF3Title'), desc: t('authLayout.signinF3Desc') },
    ],
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useIntl();
  const pathname = usePathname();
  const kind = getVariantKind(pathname);
  const v = buildVariant(kind, t);
  const isSignup = kind === 'signup';
  const isForgot = kind === 'forgot';

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <Header />

      <main className="relative flex flex-1 flex-col justify-center overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${v.image})` }}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/75 to-navy-950/45 lg:from-navy-950/88 lg:via-navy-950/58 lg:to-navy-950/15"
        />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-8 px-5 py-12 sm:px-8 sm:py-14 lg:grid-cols-2 lg:gap-12 lg:py-16 xl:py-20">
          {/* Left info panel — desktop */}
          <section className="hidden text-white lg:block">
            <div className="rounded-3xl border border-white/10 bg-navy-950/50 p-8 shadow-elev backdrop-blur-md xl:p-10">
              <div className="mb-6 flex items-center justify-between">
                <Logo variant="light" />
                <span className="rounded-full border border-gold-300/40 bg-gold-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-200">
                  {v.badge}
                </span>
              </div>
              <h1 className="heading-display whitespace-pre-line text-4xl text-white xl:text-5xl">
                {v.title}
              </h1>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-sand-100/80">{v.subtitle}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {v.features.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.title}
                      className="rounded-2xl border border-white/10 bg-navy-950/60 p-4"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-300">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="mt-3 text-sm font-semibold text-white">{f.title}</div>
                      <p className="mt-1 text-[11px] leading-relaxed text-sand-100/65">{f.desc}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-950/60 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-500/15 text-gold-300">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sand-100/70">
                    {t('authLayout.physicalSupport')}
                  </div>
                  <div className="text-sm font-medium text-white">{t('authLayout.address')}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Form card */}
          <section
            className={cn(
              'relative mx-auto w-full max-w-[480px] overflow-hidden rounded-3xl',
              'bg-sand-50 shadow-elev ring-1 ring-navy-100/40',
            )}
          >
            {isSignup ? <SignupSigninTabs /> : null}
            {!isForgot && !isSignup ? (
              <React.Suspense fallback={<AuthTopTabsFallback label={t('loginRole.question')} />}>
                <LoginRoleTabs />
              </React.Suspense>
            ) : null}
            <div className="px-6 py-7 sm:px-8 sm:py-8">
              <React.Suspense
                fallback={
                  <div className="flex min-h-[280px] items-center justify-center">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-navy-200 border-t-navy-700" />
                  </div>
                }
              >
                <RedirectIfAuthed>{children}</RedirectIfAuthed>
              </React.Suspense>
            </div>
          </section>
        </div>
      </main>

      <Footer className="mt-0" />
    </div>
  );
}

function AuthTopTabsFallback({ label }: { label: string }) {
  return (
    <div className="border-b border-navy-100/60 bg-white px-4 py-3">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {label}
      </div>
      <div className="h-10 rounded-full bg-sand-100" />
    </div>
  );
}

function SignupSigninTabs() {
  const pathname = usePathname();
  const { t, locale } = useIntl();
  const isSignup = pathname.endsWith('/signup');

  return (
    <div className="border-b border-navy-100/60 bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 rounded-full bg-sand-100 p-1">
        <PageTabLink href={`/${locale}/signup`} active={isSignup} label={t('signup.title')} glyph="+" />
        <PageTabLink href={`/${locale}/login`} active={!isSignup} label={t('login.title')} glyph="→" />
      </div>
    </div>
  );
}

function LoginRoleTabs() {
  const searchParams = useSearchParams();
  const { t, locale } = useIntl();
  const role = coerceLoginRole(searchParams.get('role'));

  return (
    <div className="border-b border-navy-100/60 bg-white px-4 py-3">
      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-navy-500">
        {t('loginRole.question')}
      </div>
      <div className="flex items-center gap-1 rounded-full bg-sand-100 p-1">
        {LOGIN_ROLES.map((item) => (
          <RoleTabLink
            key={item.id}
            href={`/${locale}/login?role=${item.id}`}
            active={role === item.id}
            label={t(item.labelKey)}
            role={item.id}
          />
        ))}
      </div>
    </div>
  );
}

function PageTabLink({
  href,
  active,
  label,
  glyph,
}: {
  href: string;
  active: boolean;
  label: string;
  glyph: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition',
        active ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900',
      )}
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
          active ? 'bg-white/15 text-white' : 'bg-navy-200/60 text-navy-700',
        )}
        aria-hidden
      >
        {glyph}
      </span>
      {label}
    </Link>
  );
}

function RoleTabLink({
  href,
  active,
  label,
  role,
}: {
  href: string;
  active: boolean;
  label: string;
  role: LoginRole;
}) {
  const Icon =
    role === 'customer' ? UserCircle2 : role === 'staff' ? Hammer : BarChart3;

  return (
    <Link
      href={href}
      className={cn(
        'inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition',
        active ? 'bg-navy-900 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900',
      )}
    >
      <span
        className={cn(
          'inline-flex h-5 w-5 items-center justify-center rounded-full',
          active ? 'bg-white/15 text-white' : 'bg-navy-200/60 text-navy-700',
        )}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  );
}
