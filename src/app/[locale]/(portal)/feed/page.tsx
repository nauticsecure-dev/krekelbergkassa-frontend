'use client';

import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  Anchor,
  ArrowRight,
  CheckCircle2,
  Droplets,
  MapPin,
  MessageCircle,
  Phone,
  Ship,
  Sparkles,
  Sun,
  Warehouse,
} from 'lucide-react';
import { useIntl } from '@/i18n/IntlProvider';
import { companyInfo } from '@/lib/company';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, LoadingState } from '@/components/admin/DataState';
import { PortalSectionLabel } from '@/components/portal/PortalUi';
import { cn } from '@/lib/cn';
import { useQuery } from '@/lib/hooks/useAsync';
import { portalService } from '@/lib/services';
import type { PortalBoat, PortalTimelineItem } from '@/lib/api-types';
import {
  centsToEuro,
  formatCurrency,
  formatDate,
  formatDateTime,
} from '@/lib/format';
import {
  filterTimelineItems,
  groupFeedTimeline,
  isTimelineUnread,
  nearestContractEnd,
  nextUpcomingAppointment,
  parseWalletBalance,
  profileCompletion,
  salutationForHour,
  timelinePresentation,
} from '@/lib/portal-feed';

type TypeFilter =
  | ''
  | 'appointments'
  | 'invoices'
  | 'payments'
  | 'storage'
  | 'contracts'
  | 'work_orders'
  | 'photos'
  | 'documents';

export default function FeedPage() {
  const { t, locale } = useIntl();
  const { user } = useAuth();
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('');
  const [search, setSearch] = React.useState('');

  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const firstName = (user?.name ?? 'Jan').split(' ')[0];
  const today = new Date();
  const greetingDate = new Intl.DateTimeFormat(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today);
  const salutation = salutationForHour(today.getHours(), t);

  const feed = useQuery([locale], async () => {
    const [
      me,
      timeline,
      notifications,
      appointments,
      invoices,
      boats,
      contracts,
      walletRaw,
    ] = await Promise.all([
      portalService.me().catch(() => null),
      portalService.timeline({ per_page: 30 }).catch(() => ({
        items: [],
        pagination: { page: 1, per_page: 30, total: 0, has_more: false, unread_count: 0 },
      })),
      portalService.notifications().catch(() => ({ unread_count: 0, latest: [] })),
      portalService.appointments({ per_page: 20 }).catch(() => ({
        data: [],
        total: 0,
        has_more: false,
      })),
      portalService.invoices({ per_page: 50 }).catch(() => ({ data: [], meta: undefined })),
      portalService.boats().catch(() => [] as PortalBoat[]),
      portalService.contracts().catch(() => []),
      portalService.wallet().catch(() => null),
    ]);

    return { me, timeline, notifications, appointments, invoices, boats, contracts, walletRaw };
  });

  const wallet = parseWalletBalance(feed.data?.walletRaw);
  const me = feed.data?.me;
  const invoiceRows = feed.data?.invoices?.data ?? [];
  const openBalance =
    me?.summary?.open_balance_cents != null
      ? centsToEuro(me.summary.open_balance_cents)
      : invoiceRows.reduce((sum, inv) => sum + centsToEuro(inv.outstanding_cents), 0);
  const upcomingCount =
    feed.data?.appointments.data.filter((a) => {
      const d = new Date(`${a.appointment_date}T${a.start_time ?? '00:00'}`);
      return !Number.isNaN(d.getTime()) && d >= new Date();
    }).length ?? 0;
  const profilePct = profileCompletion([
    me?.customer?.name,
    me?.customer?.email,
    me?.customer?.phone,
    me?.customer?.preferred_locale,
  ]);
  const filteredTimeline = filterTimelineItems(feed.data?.timeline.items ?? [], typeFilter, search);
  const groupedTimeline = groupFeedTimeline(filteredTimeline);
  const nextAppt = nextUpcomingAppointment(feed.data?.appointments.data ?? []);
  const nextContract = nearestContractEnd(feed.data?.contracts ?? []);
  const primaryBoat = feed.data?.boats?.[0];
  const unreadTimeline = feed.data?.timeline.pagination.unread_count ?? 0;
  const unreadNotifications = feed.data?.notifications.unread_count ?? 0;

  const groupTitle = (key: 'today' | 'week' | 'earlier') => {
    if (key === 'today') return t('feed.groupToday');
    if (key === 'week') return t('feed.groupThisWeek');
    return t('feed.groupEarlier');
  };

  return (
    <div className="pb-14">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {feed.loading ? (
          <div className="mb-6">
            <LoadingState label={t('feed.loading')} />
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
          <Card className="relative overflow-hidden p-0">
            <div className="relative isolate min-h-[300px] overflow-hidden rounded-[inherit] bg-navy-950 p-7 text-white sm:min-h-[320px] sm:p-9">
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
                  {greetingDate}
                </div>
                <h1 className="heading-display mt-3 text-4xl text-white sm:text-5xl">
                  {salutation}, {firstName} <span aria-hidden>👋</span>
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

                <div className="mt-8 grid max-w-md grid-cols-2 gap-6 border-t border-white/10 pt-5">
                  <Stat
                    big={feed.loading ? '—' : String(upcomingCount)}
                    label={t('feed.statsAppointmentsLabel')}
                    accent="gold"
                  />
                  <Stat
                    big={
                      feed.loading
                        ? '—'
                        : formatCurrency(openBalance, dateLocale)
                    }
                    label={t('feed.statsOpenLabel')}
                    accent="white"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-5">
            <Card className="surface-float-hover p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                    {t('feed.wallet.title')}
                  </div>
                  <div className="mt-1.5 text-3xl font-semibold text-emerald-600">
                    {formatCurrency(wallet.balance, dateLocale)}
                  </div>
                </div>
                <Badge tone={wallet.active ? 'success' : 'sand'} dot={wallet.active}>
                  {wallet.active ? t('feed.wallet.activeShort') : '—'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-navy-500">{t('feed.wallet.subtitle')}</p>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-navy-500">
                  <span>{t('feed.wallet.profileLabel')}</span>
                  <span>{profilePct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-sand-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500"
                    style={{ width: `${profilePct}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/${locale}/dashboard/facturen`}
                  className="inline-flex items-center gap-1 rounded-lg border border-navy-100/70 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:border-navy-200 hover:bg-white"
                >
                  {t('feed.wallet.viewInvoices')}
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800"
                >
                  {t('feed.wallet.completeProfile')}
                </Link>
              </div>
            </Card>

            <Card className="relative overflow-hidden p-0">
              <div className="relative isolate p-6 text-white">
                <div
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center opacity-30"
                  style={{ backgroundImage: 'url(/img/krek/verkoop-schip.webp)' }}
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-br from-navy-900/95 via-marine-800/85 to-marine-900/80"
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-sand-100/70">
                        {t('feed.messages')}
                      </div>
                      <div className="mt-1 text-xl font-semibold">
                        {unreadNotifications + unreadTimeline > 0
                          ? t('feed.notificationsUnread', {
                              count: unreadNotifications + unreadTimeline,
                            })
                          : t('adminNew.portal.messages.empty')}
                      </div>
                    </div>
                    <Badge tone="gold">{unreadNotifications}</Badge>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {(feed.data?.notifications.latest ?? []).slice(0, 3).map((n, idx) => (
                      <li
                        key={String(n.id ?? idx)}
                        className="rounded-lg bg-white/10 px-3 py-2 text-xs text-sand-100/90 ring-1 ring-white/10"
                      >
                        <div className="font-semibold text-white">{n.title}</div>
                        <div className="mt-0.5 truncate text-sand-100/70">{n.message}</div>
                      </li>
                    ))}
                    {!feed.data?.notifications.latest?.length ? (
                      <li className="text-xs text-sand-100/70">{t('feed.emptyTimeline')}</li>
                    ) : null}
                  </ul>
                  <Link
                    href={`/${locale}/dashboard/berichten`}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy-950 px-3 py-2 text-xs font-semibold text-white transition hover:bg-black"
                  >
                    {t('feed.viewAll')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>

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
            href={`/${locale}/dashboard/stalling`}
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

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.65fr_1fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Badge tone="gold" className="mb-2" dot>
                  {t('feed.timelineBadge')}
                </Badge>
                <h2 className="heading-display text-2xl">{t('feed.timelineTitle')}</h2>
                <p className="mt-1 text-sm text-navy-500">{t('feed.timelineSubtitle')}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="search"
                  className="input-base h-9 w-44 text-sm"
                  placeholder={t('feed.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="input-base h-9 w-auto pr-9 text-sm"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                >
                  <option value="">{t('feed.filterAll')}</option>
                  <option value="appointments">{t('feed.filterAppointments')}</option>
                  <option value="invoices">{t('feed.filterInvoices')}</option>
                  <option value="payments">{t('feed.filterPayments')}</option>
                  <option value="storage">{t('feed.filterStorage')}</option>
                  <option value="contracts">{t('feed.filterContracts')}</option>
                  <option value="work_orders">{t('feed.filterWorkOrders')}</option>
                  <option value="photos">{t('feed.filterPhotos')}</option>
                  <option value="documents">{t('feed.filterDocuments')}</option>
                </select>
              </div>
            </div>

            {feed.loading ? (
              <LoadingState label={t('feed.loading')} />
            ) : groupedTimeline.length === 0 ? (
              <EmptyState title={t('feed.emptyTimeline')} />
            ) : (
              groupedTimeline.map((group) => (
                <div key={group.key}>
                  <PortalSectionLabel>{groupTitle(group.key)}</PortalSectionLabel>
                  <div className="space-y-2.5">
                    {group.items.map((item) => (
                      <FeedTimelineItem
                        key={item.id}
                        item={item}
                        locale={locale}
                        dateLocale={dateLocale}
                        t={t}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}

            <div className="text-center">
              <Link
                href={`/${locale}/dashboard/berichten`}
                className="inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition hover:text-marine-700"
              >
                {t('feed.viewAll')}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <aside className="space-y-5">
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
                      <span className="text-sm font-semibold">{t('feed.ai.title')}</span>
                    </div>
                    <Badge tone="gold">Live</Badge>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    <InsightRow
                      label={t('feed.ai.openInvoices')}
                      value={formatCurrency(openBalance, dateLocale)}
                    />
                    <InsightRow
                      label={t('feed.ai.nextAppointment')}
                      value={
                        nextAppt
                          ? `${formatDate(nextAppt.appointment_date, dateLocale)} · ${nextAppt.start_time?.slice(0, 5) ?? ''}`
                          : '—'
                      }
                    />
                    <InsightRow
                      label={t('feed.ai.storageEnds')}
                      value={
                        nextContract
                          ? formatDate(nextContract.end_date, dateLocale)
                          : '—'
                      }
                    />
                    <InsightRow
                      label={t('feed.wallet.title')}
                      value={formatCurrency(wallet.balance, dateLocale)}
                      good={wallet.balance > 0}
                    />
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="surface-float-hover overflow-hidden p-0">
              {primaryBoat?.photo_url ? (
                <div
                  className="aspect-[4/2] bg-cover bg-center"
                  style={{ backgroundImage: `url(${primaryBoat.photo_url})` }}
                />
              ) : (
                <div
                  className="aspect-[4/2] bg-cover bg-center"
                  style={{ backgroundImage: 'url(/img/krek/verkoop-schip.webp)' }}
                />
              )}
              <div className="p-5">
                {primaryBoat ? (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-navy-400">
                          {t('feed.boat.label')}
                        </div>
                        <div className="mt-1 text-base font-semibold text-navy-900">
                          {primaryBoat.name}
                          {primaryBoat.length_metres
                            ? ` · ${primaryBoat.length_metres} m`
                            : primaryBoat.length_cm
                              ? ` · ${Number(primaryBoat.length_cm) / 100} m`
                              : ''}
                        </div>
                      </div>
                      <Badge tone="success" dot>
                        {t('feed.boat.statusActive')}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-navy-500">
                      <MapPin className="h-3 w-3" />
                      {primaryBoat.location_code || t('feed.boat.location')}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-sm font-semibold text-navy-900">{t('feed.noBoat')}</div>
                    <p className="mt-1 text-xs text-navy-500">{t('feed.noBoatDesc')}</p>
                  </>
                )}
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/${locale}/dashboard/boten`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg border border-navy-100/70 px-3 py-1.5 text-xs font-semibold text-navy-700 transition hover:bg-sand-50"
                  >
                    {t('feed.boat.view')}
                  </Link>
                  <Link
                    href={`/${locale}/kraanafspraak`}
                    className="inline-flex flex-1 items-center justify-center rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800"
                  >
                    {t('feed.boat.plan')}
                  </Link>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-tr from-sand-100 to-sand-50 p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-900 text-white">
                  <Phone className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-navy-900">{t('feed.help.title')}</div>
                  <a
                    href={companyInfo.phoneHref}
                    className="text-xs font-medium text-marine-700 hover:underline"
                  >
                    {companyInfo.phone}
                  </a>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-navy-500">{t('feed.help.subtitle')}</p>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function FeedTimelineItem({
  item,
  locale,
  dateLocale,
  t,
}: {
  item: PortalTimelineItem;
  locale: string;
  dateLocale: string;
  t: (key: string) => string;
}) {
  const presentation = timelinePresentation(item, locale);
  const Icon = presentation.icon;
  const title = item.title ?? t('adminNew.portal.messages.item');
  const meta =
    item.body ??
    item.message ??
    formatDateTime(item.created_at, dateLocale);
  const unread = isTimelineUnread(item);
  // Trello #89: ACTION REQUIRED — backend supplies cta_label/cta_url
  // (e.g. "Pay now", "Renew contract") on actionable items.
  const cta = (item as { cta_label?: string; cta_url?: string });
  const isHigh = (item.priority === 'high' || item.priority === 'urgent') && !!cta.cta_url;

  return (
    <TimelineItem
      icon={Icon}
      tone={isHigh ? 'gold' : presentation.tone}
      title={isHigh ? `${t('feed.actionRequired')} · ${title}` : title}
      meta={meta}
      cta={cta.cta_label ?? t('feed.openItem')}
      href={cta.cta_url ?? presentation.href}
      priority={presentation.priority}
      unread={unread}
    />
  );
}

function Pill({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
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
  icon: LucideIcon;
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
      className="surface-float surface-float-hover group flex items-center gap-3 p-4"
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl transition',
          tones[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-navy-900">{label}</div>
        <div className="truncate text-[11px] text-navy-500">{sub}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-navy-300 transition group-hover:translate-x-0.5 group-hover:text-navy-700" />
    </Link>
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
  icon: LucideIcon;
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
    <article className="surface-float surface-float-hover group relative flex items-start gap-4 p-4">
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
          <h3 className="truncate text-sm font-semibold text-navy-900">{title}</h3>
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
      <span className={cn('font-semibold', good ? 'text-emerald-300' : 'text-white')}>
        {value}
      </span>
    </li>
  );
}
