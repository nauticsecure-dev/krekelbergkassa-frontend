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
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useQuery } from '@/lib/hooks/useAsync';
import { useSyncStatus } from '@/lib/hooks/useSyncStatus';
import {
  invoicesService,
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

  const { data, loading } = useQuery([locale], async () => {
    const [invoices, stalling, sales, analytics, reminders, activity, closures, lowStock] = await Promise.all([
      invoicesService.list({ per_page: 100 }),
      stallingService.list({ per_page: 100 }),
      kassaService.recentSales().catch(() => []),
      kassaService.analytics().catch(() => null),
      adminService.remindersSummary().catch(() => null),
      // Trello #109: recent-activity feed for the dashboard.
      adminService.timelineFeed({ per_page: 10 }).catch(() => null),
      // Trello #85: today's cash difference from the latest cash closure.
      kassaService.cashClosures({ per_page: 1 }).catch(() => null),
      productsService.list({ low_stock: true, per_page: 1 }).catch(() => null),
    ]);

    const overdueInvoices = invoices.data.filter((x) => x.is_overdue).length;
    const openInvoices = invoices.data.filter((x) => !x.is_fully_paid).length;
    const overdueStalling = stalling.data.filter((x) => x.payment_status === 'overdue').length;
    const todayRevenue = sales.reduce((sum, sale) => {
      const raw =
        typeof sale.total_amount_cents === 'string'
          ? Number(sale.total_amount_cents)
          : sale.total_amount_cents;
      return sum + (Number.isFinite(raw) ? Number(raw) : 0);
    }, 0);

    const analyticsTotals = analytics?.totals as Record<string, number> | undefined;
    const reminderCounts = normalizeRemindersSummary(reminders);

    const activityItems = ((activity as { data?: Record<string, unknown>[] } | null)?.data ?? []).slice(0, 10);
    const closureRows = ((closures as { data?: Record<string, unknown>[] } | null)?.data ?? []);
    const cashDifference = closureRows.length
      ? Number(closureRows[0].difference_cents ?? 0)
      : null;

    const lowStockCount = (lowStock as { meta?: { total?: number } } | null)?.meta?.total ?? 0;

    return {
      overdueInvoices,
      openInvoices,
      overdueStalling,
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

  const syncLabel = !sync.online
    ? t('adminNew.sync.offline')
    : sync.failed > 0
      ? t('adminNew.sync.error')
      : sync.pending > 0
        ? t('adminNew.sync.pending')
        : t('adminNew.sync.online');

  return (
    <>
      <AdminPageHeader
        eyebrow={t('adminNew.dashboard.title')}
        title={t('adminNew.dashboard.heroTitle')}
        subtitle={t('adminNew.dashboard.subtitle')}
        rightSlot={
          <Badge tone="success" dot>
            {t('adminNew.dashboard.live')}
          </Badge>
        }
        stats={[
          {
            label: t('adminNew.dashboard.cards.openInvoices.title'),
            value: data?.openInvoices ?? 0,
            hint: t('adminNew.dashboard.cards.openInvoices.subtitle', {
              count: data?.overdueInvoices ?? 0,
            }),
            icon: CreditCard,
            tone: 'marine',
            loading,
            href: `/${locale}/admin/facturen?status=open`,
          },
          {
            label: t('adminNew.dashboard.cards.stallingActions.title'),
            value: data?.overdueStalling ?? 0,
            hint: t('adminNew.dashboard.cards.stallingActions.subtitle'),
            icon: Warehouse,
            tone: 'warning',
            loading,
            href: `/${locale}/admin/stalling`,
          },
          {
            label: t('adminNew.dashboard.cards.cashRevenue.title'),
            value: formatCurrency(centsToEuro(data?.todayRevenue ?? 0), dateLocale),
            hint: t('adminNew.dashboard.cards.cashRevenue.subtitle'),
            icon: Receipt,
            tone: 'success',
            loading,
            href: `/${locale}/admin/kassa`,
          },
          {
            label: t('adminNew.dashboard.cards.lowStock.title', { defaultValue: 'Lage voorraad' }),
            value: data?.lowStockCount ?? 0,
            hint: t('adminNew.dashboard.cards.lowStock.subtitle', { defaultValue: 'producten onder minimum' }),
            icon: Package,
            tone: (data?.lowStockCount ?? 0) > 0 ? 'warning' : 'success',
            loading,
            href: `/${locale}/admin/product-stats`,
          },
          {
            label: t('adminNew.dashboard.cards.syncStatus.title'),
            value: syncLabel,
            hint: sync.pending > 0 ? `${sync.pending} pending` : t('adminNew.dashboard.cards.syncStatus.noSync'),
            icon: AlertTriangle,
            tone: !sync.online ? 'warning' : sync.failed > 0 ? 'danger' : 'success',
            loading: sync.loading,
            href: `/${locale}/admin/sync`,
          },
        ]}
      />

      <AdminContent>
        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <AdminSectionCard
            title={t('adminNew.dashboard.quickActions')}
            description={t('adminNew.dashboard.subtitle')}
            icon={Sparkles}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminQuickAction
                href={`/${locale}/admin/kassa`}
                label={t('admin.sidebar.kassa')}
                icon={Receipt}
                tone="gold"
              />
              <AdminQuickAction
                href={`/${locale}/admin/stalling`}
                label={t('adminNew.dashboard.actions.stalling')}
                icon={Warehouse}
                tone="gold"
              />
              <AdminQuickAction
                href={`/${locale}/admin/facturen`}
                label={t('adminNew.dashboard.actions.invoices')}
                icon={CreditCard}
                tone="navy"
              />
              <AdminQuickAction
                href={`/${locale}/admin/calculator`}
                label={t('adminNew.dashboard.actions.calculator')}
                icon={Calculator}
                tone="success"
              />
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
                <Link href={`/${locale}/admin/calculator`}>
                  <Button variant="outline" size="sm">
                    {t('adminNew.dashboard.actions.calculator')} →
                  </Button>
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
            <AdminStatusStrip
              label={t('adminNew.reminders.invoiceDue')}
              value={data?.reminderCounts?.invoiceDue ?? 0}
              tone={(data?.reminderCounts?.invoiceDue ?? 0) > 0 ? 'warning' : 'success'}
            />
            <AdminStatusStrip
              label={t('adminNew.reminders.contractsExpiring')}
              value={data?.reminderCounts?.contractsExpiring ?? 0}
              tone={(data?.reminderCounts?.contractsExpiring ?? 0) > 0 ? 'gold' : 'marine'}
            />
            {showWorkOrders ? (
              <Link href={`/${locale}/admin/werkorders`} className="block">
                <AdminStatusStrip
                  label={t('adminNew.reminders.workOrdersDue')}
                  value={data?.reminderCounts?.workOrdersDue ?? 0}
                  tone={(data?.reminderCounts?.workOrdersDue ?? 0) > 0 ? 'danger' : 'navy'}
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
            ) : (data?.activityItems ?? []).length === 0 ? (
              <p className="text-sm text-navy-500">{t('adminNew.timeline.emptyMessage')}</p>
            ) : (
              <ol className="space-y-2">
                {(data?.activityItems ?? []).map((item, i) => {
                  const title = String(item.title ?? item.type ?? '—');
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
