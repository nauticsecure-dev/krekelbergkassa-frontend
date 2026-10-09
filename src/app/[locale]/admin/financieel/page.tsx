'use client';

import {
  BookOpen,
  Building2,
  CreditCard,
  FileText,
  Receipt,
  TrendingUp,
  Users,
} from 'lucide-react';
import { AdminModuleHub } from '@/components/admin/AdminModuleHub';
import { useIntl } from '@/i18n/IntlProvider';
import { invoicesService } from '@/lib/services';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency } from '@/lib/format';

export default function FinanceHubPage() {
  const { locale, t } = useIntl();
  const prefix = 'adminModules.hubs.finance';
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const invoices = useQuery([locale, 'finance-overview'], () =>
    invoicesService.list({ per_page: 100 })
  );
  const rows = invoices.data?.data ?? [];
  const completeInvoiceWindow = invoices.data?.meta?.last_page === 1;
  const outstanding = rows.filter((invoice) => !invoice.is_fully_paid);
  const overdueCents = outstanding
    .filter((invoice) => invoice.is_overdue)
    .reduce((sum, invoice) => sum + Number(invoice.outstanding_cents ?? 0), 0);
  const dueCents = outstanding
    .filter((invoice) => !invoice.is_overdue)
    .reduce((sum, invoice) => sum + Number(invoice.outstanding_cents ?? 0), 0);
  const month = new Date().toISOString().slice(0, 7);
  const revenueCents = rows
    .filter((invoice) => invoice.paid_at?.slice(0, 7) === month)
    .reduce((sum, invoice) => sum + Number(invoice.total_amount_cents ?? 0), 0);

  return (
    <AdminModuleHub
      title={t(`${prefix}.title`)}
      subtitle={t(`${prefix}.subtitle`)}
      stats={[
        { label: t(`${prefix}.openAmount`), value: invoices.error ? t(`${prefix}.loadError`) : completeInvoiceWindow ? formatCurrency((overdueCents + dueCents) / 100, dateLocale) : '—', hint: invoices.error || t(`${prefix}.invoiceWindow`), icon: Receipt, tone: 'marine', loading: invoices.loading, href: `/${locale}/admin/facturen` },
        { label: t(`${prefix}.overdueAmount`), value: invoices.error ? t(`${prefix}.loadError`) : completeInvoiceWindow ? formatCurrency(overdueCents / 100, dateLocale) : '—', hint: invoices.error || t(`${prefix}.invoiceWindow`), icon: CreditCard, tone: 'danger', loading: invoices.loading, href: `/${locale}/admin/facturen?payment_status=overdue` },
        { label: t(`${prefix}.dueAmount`), value: invoices.error ? t(`${prefix}.loadError`) : completeInvoiceWindow ? formatCurrency(dueCents / 100, dateLocale) : '—', hint: invoices.error || t(`${prefix}.invoiceWindow`), icon: Users, tone: 'warning', loading: invoices.loading, href: `/${locale}/admin/facturen?payment_status=open` },
        { label: t(`${prefix}.revenueMonth`), value: invoices.error ? t(`${prefix}.loadError`) : completeInvoiceWindow ? formatCurrency(revenueCents / 100, dateLocale) : '—', hint: invoices.error || t(`${prefix}.invoiceWindow`), icon: TrendingUp, tone: 'success', loading: invoices.loading, href: `/${locale}/admin/rapportages` },
        { label: t(`${prefix}.costsMonth`), value: '—', hint: t(`${prefix}.costsUnavailable`), icon: Building2, tone: 'navy' },
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
