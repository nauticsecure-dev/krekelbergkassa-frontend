'use client';

import {
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  Plus,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';
import { invoicesService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency, intlLocale } from '@/lib/format';

export default function FinanceHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.finance';
  const dateLocale = intlLocale(locale);
  const stats = useQuery([locale, 'finance-dashboard-stats'], () => invoicesService.stats());
  const money = (cents: number | undefined) =>
    stats.error
      ? t(`${prefix}.loadError`)
      : stats.data
        ? formatCurrency((cents ?? 0) / 100, dateLocale)
        : '…';

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      actionsLabel={t(`${prefix}.quickActions`)}
      actions={[
        {
          href: `/${locale}/admin/facturen?create=1`,
          label: t('adminModules.create.invoice'),
          description: t(`${prefix}.invoicesDesc`),
          icon: Plus,
        },
        {
          href: `/${locale}/admin/facturen/import`,
          label: t(`${prefix}.purchaseInvoices`),
          description: t(`${prefix}.purchaseInvoicesDesc`),
          icon: FileText,
        },
        {
          href: `/${locale}/admin/betalingen`,
          label: t('adminModules.overview.registerPayment'),
          description: t(`${prefix}.paymentsDesc`),
          icon: CreditCard,
        },
      ]}
      stats={[
        { label: t(`${prefix}.openAmount`), value: money(stats.data?.open_cents), hint: stats.error || t(`${prefix}.invoiceWindow`), icon: Receipt, tone: 'marine', loading: stats.loading, href: `/${locale}/admin/facturen` },
        { label: t(`${prefix}.overdueAmount`), value: money(stats.data?.overdue_cents), hint: stats.error || t(`${prefix}.invoiceWindow`), icon: CreditCard, tone: 'danger', loading: stats.loading, href: `/${locale}/admin/facturen?payment_status=overdue` },
        { label: t(`${prefix}.dueAmount`), value: money(stats.data?.due_cents), hint: stats.error || t(`${prefix}.invoiceWindow`), icon: Users, tone: 'warning', loading: stats.loading, href: `/${locale}/admin/facturen?payment_status=open` },
        { label: t(`${prefix}.revenueMonth`), value: money(stats.data?.revenue_month_cents), hint: stats.error || t(`${prefix}.invoiceWindow`), icon: TrendingUp, tone: 'success', loading: stats.loading, href: `/${locale}/admin/rapportages` },
        { label: t(`${prefix}.costsMonth`), value: money(stats.data?.costs_month_cents), hint: stats.error || t(`${prefix}.invoiceWindow`), icon: Building2, tone: 'navy', loading: stats.loading, href: `/${locale}/admin/leveranciers` },
      ]}
      groups={[
        {
          title: t(`${prefix}.overview`),
          links: [
            { href: `/${locale}/admin/facturen`, label: t(`${prefix}.invoices`), description: t(`${prefix}.invoicesDesc`), icon: Receipt },
            { href: `/${locale}/admin/betalingen`, label: t(`${prefix}.payments`), description: t(`${prefix}.paymentsDesc`), icon: CreditCard },
            { href: `/${locale}/admin/rapportages`, label: t(`${prefix}.reports`), description: t(`${prefix}.reportsDesc`), icon: TrendingUp },
          ],
        },
        {
          title: t(`${prefix}.accounting`),
          links: [
            { href: `/${locale}/admin/facturen/import`, label: t(`${prefix}.purchaseInvoices`), description: t(`${prefix}.purchaseInvoicesDesc`), icon: FileText },
            { href: `/${locale}/admin/leveranciers`, label: t(`${prefix}.suppliers`), description: t(`${prefix}.suppliersDesc`), icon: Building2 },
            { href: `/${locale}/admin/boekhouding`, label: t(`${prefix}.ledger`), description: t(`${prefix}.ledgerDesc`), icon: BookOpen },
            { href: `/${locale}/admin/klanten`, label: t(`${prefix}.debtors`), description: t(`${prefix}.debtorsDesc`), icon: Users },
          ],
        },
      ]}
    />
  );
}
