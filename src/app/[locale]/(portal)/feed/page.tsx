'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Anchor,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  CreditCard,
  Droplets,
  FileText,
  Gift,
  MapPin,
  MessageCircle,
  Pause,
  Phone,
  Plus,
  Ship,
  Sparkles,
  Sun,
  TrendingUp,
  Warehouse,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

export default function TijdlijnPage() {
  const { t, locale } = useIntl();
  const { user } = useAuth();

  const firstName = (user?.name ?? 'Jan Jansen').split(' ')[0];
  const today = new Date();
  const greeting = greetingFor(today);

  return (
    <div className="bg-sand-50 pb-14">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Top — greeting hero + side wallet/invite */}
        <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
          {/* Greeting hero */}
          <Card className="relative overflow-hidden p-0">
            <div className="relative isolate min-h-[300px] overflow-hidden rounded-[inherit] bg-navy-950 p-7 text-white sm:min-h-[320px] sm:p-9">
              {/* Backdrop image */}
              <div
                aria-hidden
                className="absolute inset-0 bg-cover bg-center opacity-30"
                style={{ backgroundImage: 'url(/img/krek/jachthaven.webp)' }}
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-tr from-navy-950 via-navy-950/85 to-marine-900/60"
              />

              <div className="relative">
                <div className="flex items-center gap-2 text-xs font-medium text-sand-100/70">
                  <Sun className="h-3.5 w-3.5 text-gold-300" />
                  {greeting.date}
                </div>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl">
                  {greeting.salutation}, {firstName}{' '}
                  <span aria-hidden>👋</span>
                </h1>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-sand-100/85">
                  {t('feed.heroSubtitle')}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Pill icon={Sparkles}>{t('feed.pills.deals')}</Pill>
                  <Pill icon={Anchor}>{t('feed.pills.personalised')}</Pill>
                  <Pill icon={CheckCircle2}>{t('feed.pills.fast')}</Pill>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link href={`/${locale}/kraanafspraak`}>
                    <Button
                      variant="gold"
                      size="lg"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                    >
                      {t('feed.ctaPrimary')}
                    </Button>
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/afspraken`}
                    className="text-sm font-semibold text-sand-100/90 hover:text-white"
                  >
                    {t('feed.ctaSecondary')} →
                  </Link>
                </div>

                <div className="mt-8 grid grid-cols-2 max-w-md gap-6 border-t border-white/10 pt-5">
                  <Stat
                    big="3"
                    label={t('feed.statsAppointmentsLabel')}
                    accent="gold"
                  />
                  <Stat
                    big="€ 230,00"
                    label={t('feed.statsOpenLabel')}
                    accent="white"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Side: Wallet + Invite */}
          <div className="space-y-5">
            {/* Wallet */}
            <Card className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                    {t('feed.wallet.title')}
                  </div>
                  <div className="mt-1.5 text-3xl font-semibold text-emerald-600">
                    € 50,00
                  </div>
                </div>
                <Badge tone="success" dot>
                  {t('feed.wallet.activeShort')}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-navy-500">
                {t('feed.wallet.subtitle')}
              </p>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-navy-500">
                  <span>{t('feed.wallet.profileLabel')}</span>
                  <span>40%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600"
                    style={{ width: '40%' }}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/dashboard/facturen`}
                  className="inline-flex items-center gap-1 rounded-md border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-sand-100"
                >
                  {t('feed.wallet.viewInvoices')}
                </Link>
                <button className="inline-flex items-center gap-1 rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800">
                  {t('feed.wallet.completeProfile')}
                </button>
              </div>
            </Card>

            {/* Invite a friend */}
            <Card className="relative overflow-hidden p-0">
              <div className="relative isolate p-6 text-white">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{
                    backgroundImage: 'url(/img/krek/verkoop-schip.webp)',
                  }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-marine-800/85 to-marine-900/80"
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/70">
                        {t('feed.invite.title')}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {t('feed.invite.headline')}
                      </div>
                    </div>
                    <span className="rounded-full bg-gold-500 px-2.5 py-1 text-xs font-bold text-navy-900">
                      € 25,00
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-sand-100/80">
                    {t('feed.invite.subtitle')}
                  </p>
                  <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-navy-950 px-3 py-2 text-xs font-semibold text-white hover:bg-black">
                    {t('feed.invite.cta')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-mono text-sand-100 ring-1 ring-white/15">
                    KREK-{firstName.toUpperCase().slice(0, 4)}26
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Quick actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction
            icon={Ship}
            label={t('feed.quick.crane')}
            sub={t('feed.quick.craneSub')}
            href={`/${locale}/kraanafspraak`}
            tone="marine"
          />
          <QuickAction
            icon={Droplets}
            label={t('feed.quick.wash')}
            sub={t('feed.quick.washSub')}
            href={`/${locale}/diensten/afspuiten`}
            tone="gold"
          />
          <QuickAction
            icon={Warehouse}
            label={t('feed.quick.storage')}
            sub={t('feed.quick.storageSub')}
            href={`/${locale}/diensten/winterstalling`}
            tone="navy"
          />
          <QuickAction
            icon={MessageCircle}
            label={t('feed.quick.contact')}
            sub={t('feed.quick.contactSub')}
            href={`/${locale}/contact`}
            tone="sand"
          />
        </div>

        {/* Main grid: timeline + insights */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          {/* Timeline */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Badge tone="gold" className="mb-2" dot>
                  {t('feed.timelineBadge')}
                </Badge>
                <h2 className="heading-display text-2xl">
                  {t('feed.timelineTitle')}
                </h2>
                <p className="mt-1 text-sm text-navy-500">
                  {t('feed.timelineSubtitle')}
                </p>
              </div>
              <select className="input-base h-9 w-auto pr-9 text-sm">
                <option>{t('feed.filterAll')}</option>
                <option>{t('feed.filterAppointments')}</option>
                <option>{t('feed.filterInvoices')}</option>
                <option>{t('feed.filterStorage')}</option>
              </select>
            </div>

            <Section title={t('feed.groupToday')}>
              <TimelineItem
                icon={Calendar}
                tone="marine"
                title={t('feed.items.craneTomorrowTitle')}
                meta={t('feed.items.craneTomorrowMeta')}
                cta={t('feed.items.craneTomorrowCta')}
                href={`/${locale}/dashboard/afspraken`}
                unread
                priority="high"
              />
              <TimelineItem
                icon={CreditCard}
                tone="danger"
                title={t('feed.items.invoiceOpenTitle')}
                meta={t('feed.items.invoiceOpenMeta')}
                cta={t('feed.items.invoiceOpenCta')}
                href={`/${locale}/dashboard/facturen`}
                priority="urgent"
                unread
              />
            </Section>

            <Section title={t('feed.groupThisWeek')}>
              <TimelineItem
                icon={Warehouse}
                tone="warning"
                title={t('feed.items.storageExpiringTitle')}
                meta={t('feed.items.storageExpiringMeta')}
                cta={t('feed.items.storageExpiringCta')}
                href={`/${locale}/dashboard/stalling`}
                unread
                priority="high"
              />
              <TimelineItem
                icon={FileText}
                tone="navy"
                title={t('feed.items.quoteReadyTitle')}
                meta={t('feed.items.quoteReadyMeta')}
                cta={t('feed.items.quoteReadyCta')}
                href={`/${locale}/dashboard/documenten`}
              />
              <TimelineItem
                icon={Pause}
                tone="sand"
                title={t('feed.items.appointmentChangedTitle')}
                meta={t('feed.items.appointmentChangedMeta')}
                cta={t('feed.items.appointmentChangedCta')}
                href={`/${locale}/dashboard/afspraken`}
              />
            </Section>

            <Section title={t('feed.groupEarlier')}>
              <TimelineItem
                icon={CheckCircle2}
                tone="success"
                title={t('feed.items.paymentReceivedTitle')}
                meta={t('feed.items.paymentReceivedMeta')}
                cta={t('feed.items.paymentReceivedCta')}
                href={`/${locale}/dashboard/facturen`}
              />
              <TimelineItem
                icon={Ship}
                tone="marine"
                title={t('feed.items.workCompletedTitle')}
                meta={t('feed.items.workCompletedMeta')}
                cta={t('feed.items.workCompletedCta')}
                href={`/${locale}/dashboard/documenten`}
              />
              <TimelineItem
                icon={Gift}
                tone="gold"
                title={t('feed.items.welcomeTitle')}
                meta={t('feed.items.welcomeMeta')}
                cta={t('feed.items.welcomeCta')}
                href={`/${locale}/dashboard`}
              />
            </Section>

            <div className="text-center">
              <Link
                href="#"
                className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-marine-700"
              >
                {t('feed.viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right rail */}
          <aside className="space-y-5">
            {/* AI insights */}
            <Card className="overflow-hidden p-0">
              <div className="relative isolate bg-navy-950 p-6 text-white">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-navy-900 to-marine-900"
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold-300" />
                      <span className="text-sm font-semibold">
                        {t('feed.ai.title')}
                      </span>
                    </div>
                    <Badge tone="gold">AI</Badge>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    <InsightRow
                      label={t('feed.ai.openInvoices')}
                      value="€ 230,00"
                    />
                    <InsightRow
                      label={t('feed.ai.nextAppointment')}
                      value={t('feed.ai.tomorrow1000')}
                    />
                    <InsightRow
                      label={t('feed.ai.storageEnds')}
                      value="31 mrt 2026"
                    />
                    <InsightRow
                      label={t('feed.ai.savedThisYear')}
                      value="€ 92,50"
                      good
                    />
                  </ul>
                </div>
              </div>
            </Card>

            {/* Boat card */}
            <Card className="overflow-hidden p-0">
              <div
                className="aspect-[4/2] bg-cover bg-center"
                style={{ backgroundImage: 'url(/img/krek/verkoop-schip.webp)' }}
              />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                      {t('feed.boat.label')}
                    </div>
                    <div className="mt-1 text-base font-semibold text-navy-900">
                      Aquila · 8.90 m
                    </div>
                  </div>
                  <Badge tone="success" dot>
                    {t('feed.boat.statusActive')}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-navy-500">
                  <MapPin className="h-3 w-3" />
                  {t('feed.boat.location')}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/${locale}/dashboard/boten`}
                    className="inline-flex flex-1 items-center justify-center rounded-md border border-navy-100 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-sand-100"
                  >
                    {t('feed.boat.view')}
                  </Link>
                  <Link
                    href={`/${locale}/kraanafspraak`}
                    className="inline-flex flex-1 items-center justify-center rounded-md bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                  >
                    {t('feed.boat.plan')}
                  </Link>
                </div>
              </div>
            </Card>

            {/* Help */}
            <Card className="bg-gradient-to-tr from-sand-100 to-sand-50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-white">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-navy-900">
                    {t('feed.help.title')}
                  </div>
                  <a
                    href="tel:+31475322275"
                    className="text-xs font-medium text-marine-700 hover:underline"
                  >
                    0475 32 22 75
                  </a>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-navy-500">
                {t('feed.help.subtitle')}
              </p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function greetingFor(d: Date) {
  const h = d.getHours();
  const days = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'];
  const months = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];
  const date = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  const salutation =
    h < 6
      ? 'Goedenacht'
      : h < 12
        ? 'Goedemorgen'
        : h < 18
          ? 'Goedemiddag'
          : 'Goedenavond';
  return { salutation, date };
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-sand-100 ring-1 ring-white/15">
      <Icon className="h-3 w-3 text-gold-300" />
      {children}
    </span>
  );
}

function Stat({
  big,
  label,
  accent,
}: {
  big: string;
  label: string;
  accent: 'gold' | 'white';
}) {
  return (
    <div>
      <div
        className={cn(
          'text-xs font-semibold uppercase tracking-widest',
          accent === 'gold' ? 'text-gold-300' : 'text-sand-100/70'
        )}
      >
        {label}
      </div>
      <div className="text-2xl font-semibold text-white">{big}</div>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  sub,
  href,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  href: string;
  tone: 'marine' | 'gold' | 'navy' | 'sand';
}) {
  const tones: Record<string, string> = {
    marine: 'bg-marine-50 text-marine-700',
    gold: 'bg-gold-50 text-gold-700',
    navy: 'bg-navy-50 text-navy-700',
    sand: 'bg-sand-100 text-sand-800',
  };
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-sm"
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition',
          tones[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-navy-900">
          {label}
        </div>
        <div className="truncate text-[11px] text-navy-500">{sub}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
    </Link>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
          {title}
        </span>
        <span className="h-px flex-1 bg-navy-100" />
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function TimelineItem({
  icon: Icon,
  tone,
  title,
  meta,
  cta,
  href,
  priority,
  unread,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: 'marine' | 'gold' | 'navy' | 'sand' | 'success' | 'warning' | 'danger';
  title: string;
  meta: string;
  cta: string;
  href: string;
  priority?: 'normal' | 'high' | 'urgent';
  unread?: boolean;
}) {
  const map: Record<string, string> = {
    marine: 'bg-marine-50 text-marine-700',
    gold: 'bg-gold-50 text-gold-700',
    navy: 'bg-navy-50 text-navy-700',
    sand: 'bg-sand-100 text-sand-800',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
  };
  const accent: Record<string, string> = {
    normal: 'bg-transparent',
    high: 'bg-amber-500',
    urgent: 'bg-rose-500',
  };
  return (
    <article className="group relative flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-4 transition hover:border-navy-200 hover:shadow-sm">
      {/* Priority side accent */}
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-3 left-0 w-[3px] rounded-full',
          accent[priority ?? 'normal']
        )}
      />
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          map[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold text-navy-900">
            {title}
          </h3>
          {unread ? (
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-marine-500" aria-hidden />
          ) : null}
        </div>
        <p className="mt-0.5 text-xs leading-relaxed text-navy-500">{meta}</p>
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-900 hover:text-marine-700"
        >
          {cta} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}

function InsightRow({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good?: boolean;
}) {
  return (
    <li className="flex items-center justify-between border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
      <span className="text-sand-100/75">{label}</span>
      <span
        className={cn(
          'font-semibold',
          good ? 'text-emerald-300' : 'text-white'
        )}
      >
        {value}
      </span>
    </li>
  );
}
