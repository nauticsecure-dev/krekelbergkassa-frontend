'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  Calculator,
  CreditCard,
  Receipt,
  Sparkles,
  Users,
  Warehouse,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminQuickAction,
  AdminSectionCard,
  AdminStatusStrip,
} from '@/components/admin/AdminUi';
import { Badge } from '@/components/ui/Badge';
import { useQuery } from '@/lib/hooks/useAsync';
import {
  adminService,
  customersService,
  invoicesService,
  kassaService,
  stallingService,
  syncService,
} from '@/lib/services';
import { centsToEuro, formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

export default function AdminDashboardPage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const { data, loading } = useQuery([locale], async () => {
    const [invoices, stalling, sales, syncStatus, portalSessions, reminders, customers] =
      await Promise.all([
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
      const raw =
        typeof sale.total_amount_cents === 'string'
          ? Number(sale.total_amount_cents)
          : sale.total_amount_cents;
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
            href: `/${locale}/admin/facturen`,
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
            label: t('adminNew.dashboard.cards.syncStatus.title'),
            value: data?.syncStatus?.status ?? t('adminNew.common.unknown'),
            hint: data?.syncStatus?.last_sync_at
              ? t('adminNew.dashboard.cards.syncStatus.lastSync', {
                  time: new Date(data.syncStatus.last_sync_at).toLocaleTimeString(dateLocale),
                })
              : t('adminNew.dashboard.cards.syncStatus.noSync'),
            icon: AlertTriangle,
            tone: 'navy',
            loading,
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
                href={`/${locale}/admin/klanten`}
                label={t('adminNew.dashboard.actions.customers')}
                icon={Users}
                tone="marine"
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
            title={t('adminNew.dashboard.portal.title')}
            description={t('adminNew.dashboard.portal.openPortal')}
            icon={Users}
            action={
              <Link
                href={`/${locale}/feed`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-marine-700 hover:text-marine-900"
              >
                {t('adminNew.dashboard.portal.openPortal')} →
              </Link>
            }
          >
            <div className="space-y-2">
              <AdminStatusStrip
                label={t('adminNew.dashboard.portal.activeSessions')}
                value={loading ? '…' : data?.activePortalSessions ?? 0}
                tone="marine"
              />
              <AdminStatusStrip
                label={t('adminNew.dashboard.portal.newQuestions')}
                value={loading ? '…' : data?.openCustomerQuestions ?? 0}
                tone={data?.openCustomerQuestions ? 'warning' : 'success'}
              />
              <AdminStatusStrip
                label={t('adminNew.dashboard.portal.totalCustomers')}
                value={loading ? '…' : data?.totalCustomers ?? 0}
                tone="navy"
              />
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-gradient-to-tr from-navy-950 to-marine-900 px-4 py-3 text-white">
              <Sparkles className="h-4 w-4 text-gold-300" />
              <span className="text-xs leading-relaxed text-sand-100/85">
                {t('adminNew.dashboard.portal.openPortal')}
              </span>
            </div>
          </AdminSectionCard>
        </div>
      </AdminContent>
    </>
  );
}
