'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, CreditCard, Receipt, Warehouse } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@/lib/hooks/useAsync';
import { adminService, customersService, invoicesService, kassaService, stallingService, syncService } from '@/lib/services';
import { centsToEuro, formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function AdminDashboardPage() {
  const { locale, t } = useIntl();

  const { data, loading } = useQuery([locale], async () => {
    const [invoices, stalling, sales, syncStatus, portalSessions, reminders, customers] = await Promise.all([
      invoicesService.list({ per_page: 100 }),
      stallingService.list({ per_page: 100 }),
      kassaService.recentSales().catch(() => []),
      syncService.status().catch(() => null),
      adminService.portalSessions({ per_page: 1 }).catch(() => null),
      adminService.reminders({ per_page: 1 }).catch(() => null),
      customersService.list({ per_page: 1 }).catch(() => null),
    ]);

    const overdueInvoices = invoices.data.filter((x) => x.is_overdue).length;
    const openInvoices = invoices.data.filter((x) => !x.is_fully_paid).length;
    const overdueStalling = stalling.data.filter((x) => x.payment_status === 'overdue').length;
    const activePortalSessions = portalSessions?.meta?.total ?? portalSessions?.data.length ?? 0;
    const openCustomerQuestions = reminders?.meta?.total ?? reminders?.data.length ?? 0;
    const totalCustomers = customers?.meta?.total ?? customers?.data.length ?? 0;
    const todayRevenue = sales.reduce((sum, sale) => {
      const raw = typeof sale.total_amount_cents === 'string' ? Number(sale.total_amount_cents) : sale.total_amount_cents;
      return sum + (Number.isFinite(raw) ? Number(raw) : 0);
    }, 0);

    return {
      overdueInvoices,
      openInvoices,
      overdueStalling,
      todayRevenue,
      syncStatus,
      activePortalSessions,
      openCustomerQuestions,
      totalCustomers,
    };
  });

  const cards = [
    {
      title: t('adminNew.dashboard.cards.openInvoices.title'),
      value: String(data?.openInvoices ?? 0),
      subtitle: loading ? t('adminNew.common.loading') : t('adminNew.dashboard.cards.openInvoices.subtitle', { count: data?.overdueInvoices ?? 0 }),
      icon: CreditCard,
      href: `/${locale}/admin/facturen`,
      tone: 'marine' as const,
    },
    {
      title: t('adminNew.dashboard.cards.stallingActions.title'),
      value: String(data?.overdueStalling ?? 0),
      subtitle: t('adminNew.dashboard.cards.stallingActions.subtitle'),
      icon: Warehouse,
      href: `/${locale}/admin/stalling`,
      tone: 'warning' as const,
    },
    {
      title: t('adminNew.dashboard.cards.cashRevenue.title'),
      value: formatCurrency(centsToEuro(data?.todayRevenue ?? 0), locale === 'en' ? 'en-GB' : 'nl-NL'),
      subtitle: t('adminNew.dashboard.cards.cashRevenue.subtitle'),
      icon: Receipt,
      href: `/${locale}/admin/kassa`,
      tone: 'success' as const,
    },
    {
      title: t('adminNew.dashboard.cards.syncStatus.title'),
      value: data?.syncStatus?.status ?? t('adminNew.common.unknown'),
      subtitle: loading
        ? t('adminNew.common.loading')
        : data?.syncStatus?.last_sync_at
          ? t('adminNew.dashboard.cards.syncStatus.lastSync', { time: new Date(data.syncStatus.last_sync_at).toLocaleTimeString() })
          : t('adminNew.dashboard.cards.syncStatus.noSync'),
      icon: AlertTriangle,
      href: `/${locale}/admin/sync`,
      tone: 'navy' as const,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.dashboard.title')}
        subtitle={t('adminNew.dashboard.subtitle')}
        rightSlot={
          <Badge tone="success" dot>
            {t('adminNew.dashboard.live')}
          </Badge>
        }
      />
      <div className="space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href}>
                <Card className="h-full p-5 transition hover:shadow-elev">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-widest text-navy-500">
                        {card.title}
                      </div>
                      <div className="mt-2 text-2xl font-semibold text-navy-900">
                        {loading ? <span className="block h-8 w-20 animate-pulse rounded-md bg-navy-100" /> : card.value}
                      </div>
                      <div className="mt-1 text-xs text-navy-500">
                        {loading ? <span className="block h-3 w-32 animate-pulse rounded bg-navy-100" /> : card.subtitle}
                      </div>
                    </div>
                    <span className="rounded-lg bg-sand-100 p-2 text-navy-700">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-3 text-sm font-semibold text-navy-900">{t('adminNew.dashboard.quickActions')}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Action href={`/${locale}/admin/klanten`} label={t('adminNew.dashboard.actions.customers')} />
              <Action href={`/${locale}/admin/stalling`} label={t('adminNew.dashboard.actions.stalling')} />
              <Action href={`/${locale}/admin/facturen`} label={t('adminNew.dashboard.actions.invoices')} />
              <Action href={`/${locale}/admin/calculator`} label={t('adminNew.dashboard.actions.calculator')} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-navy-900">{t('adminNew.dashboard.portal.title')}</div>
              <Link href={`/${locale}/feed`} className="text-xs font-medium text-marine-700 hover:underline">
                {t('adminNew.dashboard.portal.openPortal')}
              </Link>
            </div>
            <div className="space-y-2 text-sm text-navy-700">
              <div className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2">
                <span>{t('adminNew.dashboard.portal.activeSessions')}</span>
                <span className="font-semibold text-navy-900">
                  {loading ? <span className="block h-3 w-10 animate-pulse rounded bg-navy-100" /> : data?.activePortalSessions ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2">
                <span>{t('adminNew.dashboard.portal.newQuestions')}</span>
                <span className="font-semibold text-navy-900">
                  {loading ? <span className="block h-3 w-10 animate-pulse rounded bg-navy-100" /> : data?.openCustomerQuestions ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2">
                <span>{t('adminNew.dashboard.portal.totalCustomers')}</span>
                <span className="font-semibold text-navy-900">
                  {loading ? <span className="block h-3 w-10 animate-pulse rounded bg-navy-100" /> : data?.totalCustomers ?? 0}
                </span>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <Action href={`/${locale}/admin/klanten`} label={t('adminNew.dashboard.actions.customers')} />
              <Action href={`/${locale}/admin/facturen`} label={t('adminNew.dashboard.actions.invoices')} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-between rounded-lg border border-navy-100 px-3 py-2 text-sm text-navy-700 transition hover:bg-sand-50"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}
