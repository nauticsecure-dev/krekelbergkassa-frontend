'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  Bell,
  Calculator,
  CreditCard,
  Package,
  Receipt,
  Sparkles,
  Warehouse,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminQuickAction,
  AdminSectionCard,
  AdminSelect,
  AdminStatusStrip,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
import {
  invoicesService,
  appointmentsService,
  customersService,
  kassaService,
  pricingService,
  productsService,
  stallingService,
  adminService,
} from '@/lib/services';
import { centsToEuro, formatCurrency } from '@/lib/format';
import { normalizeRemindersSummary } from '@/lib/reminders-summary';
import { useIntl } from '@/i18n/IntlProvider';
import { useMutation } from '@/lib/hooks/useAsync';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { pricingTotalInclEuros } from '@/lib/pricing-result';
import { useAuth } from '@/lib/auth-context';
import { canAccessWorkOrders } from '@/lib/auth-routes';

export default function AdminDashboardPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const { user } = useAuth();
  const showWorkOrders = canAccessWorkOrders(user?.role);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const sync = useSyncStatus();

  const [calcService, setCalcService] = React.useState('winterstalling');
  const [calcLength, setCalcLength] = React.useState('890');
  const [calcResult, setCalcResult] = React.useState<number | null>(null);

  const calculate = useMutation(pricingService.calculate);

  const { data, loading, refetch } = useQuery([locale], async () => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const [invoices, stalling, appointments, customers, analytics, reminders, activity, closures, lowStock] = await Promise.all([
      invoicesService.list({ per_page: 100 }).catch(() => null),
      stallingService.list({ per_page: 100 }).catch(() => null),
      appointmentsService.list({ date_from: today, date_to: today, per_page: 100 }).catch(() => null),
      customersService.list({ per_page: 100 }).catch(() => null),
      kassaService.analytics({ period: 'today' }).catch(() => null),
      adminService.remindersSummary().catch(() => null),
      // Trello #109: recent-activity feed for the dashboard.
      adminService.timelineFeed({ per_page: 10 }).catch(() => null),
      // Trello #85: today's cash difference from the latest cash closure.
      kassaService.cashClosures({ per_page: 1 }).catch(() => null),
      productsService.list({ low_stock: true, per_page: 1 }).catch(() => null),
    ]);

    const invoicesComplete = invoices?.meta?.last_page === 1;
    const stallingComplete = stalling?.meta?.last_page === 1;
    const appointmentsComplete = appointments?.meta?.last_page === 1;
    const customersComplete = customers?.meta?.last_page === 1;
    const overdueInvoices = invoicesComplete ? invoices.data.filter((x) => x.is_overdue).length : null;
    const openInvoices = invoicesComplete ? invoices.data.filter((x) => !x.is_fully_paid).length : null;
    const inThirtyDays = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30);
    const todayAppointments = appointmentsComplete ? appointments.data : null;
    const craneJobs = todayAppointments?.filter((item) =>
      item.service_codes?.some((code) => /crane|kraan/i.test(code))
    ).length;
    const activeStalling = stallingComplete ? stalling.data.filter((contract) =>
      !contract.is_expired &&
      !['cancelled', 'ended', 'checked_out'].includes(contract.status.toLowerCase())
    ).length : null;
    const expiringStalling = stallingComplete ? stalling.data.filter((contract) => {
      const end = new Date(`${contract.end_date}T00:00:00`);
      return !contract.is_expired && end >= now && end <= inThirtyDays;
    }).length : null;
    const newCustomers = customersComplete
      ? customers.data.filter((customer) => customer.created_at?.slice(0, 10) === today).length
      : null;

    const analyticsTotals = analytics?.totals as Record<string, number> | undefined;
    const todayRevenue = analyticsTotals?.turnover_cents ?? null;
    const reminderCounts = reminders ? normalizeRemindersSummary(reminders) : null;

    const activityRows = (activity as { data?: Record<string, unknown>[] } | null)?.data ?? null;
    const activityItems = activityRows
      ?.filter((item) => {
        const source = String(item.source ?? '').toLowerCase();
        const type = `${item.type ?? ''} ${item.event_type ?? ''} ${item.related_type ?? ''} ${item.title ?? ''}`.toLowerCase();
        const title = typeof item.title === 'string' ? item.title.trim() : '';
        return title.length > 0 &&
          source !== 'audit' &&
          !/(track.?event|page.?view|page.?changed|request.?id|\/api\/|^post\b)/i.test(type);
      })
      .slice(0, 10) ?? null;
    const closureRows = ((closures as { data?: Record<string, unknown>[] } | null)?.data ?? []);
    const cashDifference = closureRows.length
      ? Number(closureRows[0].difference_cents ?? 0)
      : null;

    const lowStockResponse = lowStock as { meta?: { total?: number }; data?: unknown[] } | null;
    const lowStockCount = lowStockResponse?.meta?.total ?? (lowStockResponse?.data?.length === 0 ? 0 : null);

    return {
      openInvoices,
      overdueInvoices,
      todayAppointments: todayAppointments?.length ?? null,
      craneJobs: craneJobs ?? null,
      activeStalling,
      expiringStalling,
      newCustomers,
      todayRevenue,
      analyticsTurnover: analyticsTotals?.turnover_cents ?? todayRevenue,
      reminderCounts,
      activityItems,
      cashDifference,
      lowStockCount,
    };
  });

  // Trello #109: short relative-time label for the activity feed.
  const timeAgo = React.useCallback(
    (iso: string): string => {
      const d = new Date(iso).getTime();
      if (!Number.isFinite(d)) return '';
      const mins = Math.round((Date.now() - d) / 60000);
      if (mins < 1) return t('adminNew.dashboard.recentActivity.justNow');
      if (mins < 60) return t('adminNew.dashboard.recentActivity.minutesAgo', { count: mins });
      const hours = Math.round(mins / 60);
      if (hours < 24) return t('adminNew.dashboard.recentActivity.hoursAgo', { count: hours });
      return t('adminNew.dashboard.recentActivity.daysAgo', { count: Math.round(hours / 24) });
    },
    [t]
  );

  const runQuickCalc = async () => {
    try {
      const res = await calculate.mutate({
        length_cm: Number(calcLength),
        services: [calcService === 'winterstalling' ? 'stalling' : calcService],
        contract_type: calcService === 'winterstalling' ? 'winter' : undefined,
        persist: false,
      });
      setCalcResult(pricingTotalInclEuros(res));
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.calculator.toasts.failed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const syncLabel = sync.error
    ? t('adminNew.sync.error')
    : !sync.online
    ? t('adminNew.sync.offline')
    : sync.failed > 0
      ? t('adminNew.sync.error')
      : sync.pending > 0
        ? t('adminNew.sync.pending')
        : t('adminNew.sync.online');

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminNew.dashboard.brand')}
        title={t('adminNew.dashboard.heroTitle')}
        subtitle={t('adminNew.dashboard.subtitle')}
        stats={[
          {
            label: t('adminNew.dashboard.cards.openInvoices.title'),
            value: data?.openInvoices ?? '—',
            hint: t('adminNew.dashboard.cards.openInvoices.subtitle', {
              count: data?.overdueInvoices ?? '—',
            }),
            hintHref: data?.overdueInvoices ? `/${locale}/admin/facturen?payment_status=overdue` : undefined,
            icon: CreditCard,
            tone: 'marine',
            loading,
            href: `/${locale}/admin/facturen?payment_status=open`,
          },
          {
            label: t('adminModules.overview.activeStorage'),
            value: data?.activeStalling ?? '—',
            hint: t('adminNew.dashboard.cards.expiringStorage', { count: data?.expiringStalling ?? '—' }),
            hintHref: data?.expiringStalling ? `/${locale}/admin/stalling?status=expiring` : undefined,
            icon: Warehouse,
            tone: 'marine',
            loading,
            href: `/${locale}/admin/stalling`,
          },
          {
            label: t('adminNew.dashboard.cards.cashRevenue.title'),
            value: data?.todayRevenue == null ? '—' : formatCurrency(centsToEuro(data.todayRevenue), dateLocale),
            hint: t('adminNew.dashboard.cards.today'),
            icon: Receipt,
            tone: 'success',
            loading,
            href: `/${locale}/admin/kassa`,
          },
          {
            label: t('adminNew.dashboard.cards.lowStock.title'),
            value: data?.lowStockCount ?? '—',
            hint: t('adminNew.dashboard.cards.lowStock.subtitle'),
            icon: Package,
            tone: data?.lowStockCount == null ? 'navy' : data.lowStockCount > 0 ? 'warning' : 'success',
            loading,
            href: `/${locale}/admin/producten?low_stock=1`,
          },
          {
            label: t('adminNew.dashboard.cards.syncStatus.title'),
            value: sync.error ? '—' : syncLabel,
            hint: sync.error
              ? syncLabel
              : sync.lastSyncAt
                ? t('adminNew.dashboard.cards.syncStatus.lastSync', {
                    time: new Date(sync.lastSyncAt).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }),
                  })
                : t('adminNew.dashboard.cards.syncStatus.noSync'),
            icon: AlertTriangle,
            tone: sync.error || sync.failed > 0 ? 'danger' : !sync.online || sync.pending > 0 ? 'warning' : 'success',
            loading: sync.loading,
            href: `/${locale}/admin/sync`,
          },
        ]}
      />

      <AdminContent>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Link href={`/${locale}/admin/afspraken`} className="block">
            <AdminStatusStrip label={t('adminModules.overview.todayAppointments')} value={data?.todayAppointments ?? '—'} tone="marine" />
          </Link>
          <Link href={`/${locale}/admin/afspraken`} className="block">
            <AdminStatusStrip label={t('adminModules.overview.craneJobs')} value={data?.craneJobs ?? '—'} tone="gold" />
          </Link>
          <Link href={`/${locale}/admin/stalling`} className="block">
            <AdminStatusStrip label={t('adminModules.overview.expiringStorage')} value={data?.expiringStalling ?? '—'} tone="warning" />
          </Link>
          <Link href={`/${locale}/admin/facturen?payment_status=overdue`} className="block">
            <AdminStatusStrip label={t('adminModules.overview.overdueInvoices')} value={data?.overdueInvoices ?? '—'} tone="danger" />
          </Link>
          <Link href={`/${locale}/admin/klanten`} className="block">
            <AdminStatusStrip label={t('adminModules.overview.newCustomers')} value={data?.newCustomers ?? '—'} tone="navy" />
          </Link>
          <Link href={`/${locale}/admin/makelaardij`} className="block">
            <AdminStatusStrip
              label={t('adminModules.overview.newBrokerageLeads')}
              value={t('adminModules.overview.leadsUnavailable')}
              tone="navy"
            />
          </Link>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <AdminSectionCard
            title={t('adminNew.dashboard.quickActions')}
            description={t('adminNew.dashboard.subtitle')}
            icon={Sparkles}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {user?.role === 'staff' ? (
                <>
                  <AdminQuickAction href={`/${locale}/planning?create=1`} label={t('adminModules.create.appointment')} icon={Receipt} tone="gold" />
                  <AdminQuickAction href={`/${locale}/admin/kassa`} label={t('admin.sidebar.kassa')} icon={Receipt} tone="gold" />
                  <AdminQuickAction href={`/${locale}/admin/stalling?new=1`} label={t('adminModules.create.stalling')} icon={Warehouse} tone="gold" />
                  <AdminQuickAction href={`/${locale}/admin/klanten`} label={t('adminModules.overview.customerSearch')} icon={CreditCard} tone="navy" />
                </>
              ) : (
                <>
                  <AdminQuickAction href={`/${locale}/admin/facturen?create=1`} label={t('adminModules.create.invoice')} icon={CreditCard} tone="gold" />
                  <AdminQuickAction href={`/${locale}/admin/betalingen`} label={t('adminModules.overview.registerPayment')} icon={Receipt} tone="navy" />
                  <AdminQuickAction href={`/${locale}/admin/klanten`} label={t('adminModules.overview.customerSearch')} icon={CreditCard} tone="marine" />
                  {user?.role === 'admin' ? (
                    <>
                      <AdminQuickAction href={`/${locale}/admin/boten?new=1`} label={t('adminModules.create.boat')} icon={Warehouse} tone="success" />
                      <AdminQuickAction href={`/${locale}/admin/verkopen`} label={t('adminModules.create.brokerage')} icon={Receipt} tone="gold" />
                      <AdminQuickAction href={`/${locale}/admin/financieel`} label={t('adminModules.nav.finance')} icon={CreditCard} tone="navy" />
                    </>
                  ) : null}
                </>
              )}
            </div>
          </AdminSectionCard>

          <AdminSectionCard
            title={t('adminNew.dashboard.calculatorCard.title')}
            description={t('adminNew.dashboard.calculatorCard.subtitle')}
            icon={Calculator}
          >
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
                  {t('adminNew.dashboard.calculatorCard.selectService')}
                </label>
                <AdminSelect value={calcService} onChange={setCalcService}>
                  <option value="winterstalling">{t('adminNew.stalling.type.winter')}</option>
                  <option value="kranen">Kranen</option>
                  <option value="afspuiten">Afspuiten</option>
                  <option value="stalling">{t('adminNew.stalling.title')}</option>
                </AdminSelect>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-500">
                  {t('adminNew.calculator.lengthCm')}
                </label>
                <input
                  type="number"
                  className="input-base w-full"
                  value={calcLength}
                  onChange={(e) => setCalcLength(e.target.value)}
                />
              </div>
              {calcResult !== null ? (
                <AdminStatusStrip
                  label={t('adminNew.calculator.result.totalPrice')}
                  value={formatCurrency(calcResult, dateLocale)}
                  tone="success"
                />
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="gold" size="sm" onClick={() => void runQuickCalc()} disabled={calculate.loading}>
                  {t('adminNew.calculator.calculate')}
                </Button>
                <Link href={`/${locale}/admin/calculator`} className="inline-flex items-center text-sm font-semibold text-marine-700 hover:text-marine-900">
                  {t('adminNew.dashboard.calculatorCard.openFull')} →
                </Link>
              </div>
            </div>
          </AdminSectionCard>
        </div>

        <AdminSectionCard
          title={t('adminNew.reminders.title')}
          description={t('adminNew.reminders.subtitle')}
          icon={Bell}
          className="mt-5"
        >
          <div className={`grid gap-3 ${showWorkOrders ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <Link href={`/${locale}/admin/facturen?payment_status=open`} className="block">
              <AdminStatusStrip
                label={t('adminNew.reminders.invoiceDue')}
                value={data?.reminderCounts?.invoiceDue ?? '—'}
                tone={data?.reminderCounts == null ? 'navy' : data.reminderCounts.invoiceDue > 0 ? 'warning' : 'success'}
              />
            </Link>
            <Link href={`/${locale}/admin/stalling?status=expiring`} className="block">
              <AdminStatusStrip
                label={t('adminNew.reminders.contractsExpiring')}
                value={data?.reminderCounts?.contractsExpiring ?? '—'}
                tone={data?.reminderCounts == null ? 'navy' : data.reminderCounts.contractsExpiring > 0 ? 'warning' : 'success'}
              />
            </Link>
            {showWorkOrders ? (
              <Link href={`/${locale}/admin/werkorders`} className="block">
                <AdminStatusStrip
                  label={t('adminNew.reminders.workOrdersDue')}
                value={data?.reminderCounts?.workOrdersDue ?? '—'}
                tone={data?.reminderCounts == null ? 'navy' : data.reminderCounts.workOrdersDue > 0 ? 'danger' : 'success'}
                />
              </Link>
            ) : null}
          </div>
        </AdminSectionCard>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          {/* Trello #109: live recent-activity feed */}
          <AdminSectionCard
            title={t('adminNew.dashboard.recentActivity.title')}
            description={t('adminNew.dashboard.recentActivity.subtitle')}
            icon={Activity}
            action={
              <Link href={`/${locale}/admin/timeline`}>
                <Button variant="ghost" size="sm">
                  {t('adminNew.timeline.open')} →
                </Button>
              </Link>
            }
          >
            {loading ? (
              <p className="text-sm text-navy-500">{t('adminNew.common.loading')}</p>
            ) : data?.activityItems == null ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm text-rose-700">{t('adminNew.dashboard.recentActivity.loadError')}</p>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  {t('adminNew.common.retry')}
                </Button>
              </div>
            ) : data.activityItems.length === 0 ? (
              <p className="text-sm text-navy-500">{t('adminNew.timeline.emptyMessage')}</p>
            ) : (
              <ol className="space-y-2">
                {(data?.activityItems ?? []).map((item, i) => {
                  const title = String(item.title);
                  const created = String(item.created_at ?? '');
                  return (
                    <li key={String(item.id ?? i)} className="flex items-start justify-between gap-3 border-b border-navy-50 pb-2 last:border-0">
                      <span className="text-sm text-navy-800">{title}</span>
                      <span className="shrink-0 text-xs text-navy-400">{created ? timeAgo(created) : ''}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </AdminSectionCard>

          {/* Trello #85: cash difference today */}
          <AdminSectionCard
            title={t('adminNew.dashboard.cashDifference.title')}
            description={t('adminNew.dashboard.cashDifference.subtitle')}
            icon={Receipt}
          >
            {data?.cashDifference == null ? (
              <p className="text-sm text-navy-500">{t('adminNew.dashboard.cashDifference.none')}</p>
            ) : (
              <AdminStatusStrip
                label={t('adminNew.dashboard.cashDifference.title')}
                value={formatCurrency(centsToEuro(data.cashDifference), dateLocale)}
                tone={data.cashDifference === 0 ? 'success' : Math.abs(data.cashDifference) < 500 ? 'warning' : 'danger'}
              />
            )}
            <Link href={`/${locale}/admin/kassa/dagafsluiting`} className="mt-3 inline-flex text-sm font-semibold text-marine-700 hover:text-marine-900">
              {t('adminNew.dashboard.cashDifference.openClosure')} →
            </Link>
          </AdminSectionCard>
        </div>
      </AdminContent>
    </>
  );
}
