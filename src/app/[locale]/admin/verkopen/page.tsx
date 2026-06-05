'use client';

import * as React from 'react';
import Link from 'next/link';
import { CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminSearchInput,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { kassaService } from '@/lib/services';
import type { Sale } from '@/lib/api-types';
import { useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0);

function saleEuros(sale: Sale): number {
  return (
    num(sale.total_euros) ||
    num(sale.total_amount_euros) ||
    num(sale.total_amount_cents) / 100
  );
}

function saleHref(locale: string, sale: Sale): string | null {
  if (sale.invoice_url) return sale.invoice_url;
  if (sale.admin_url) return sale.admin_url;
  if (sale.invoice_id) return `/${locale}/admin/facturen/${sale.invoice_id}`;
  return null;
}

export default function SalesPage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [search, setSearch] = React.useState('');

  const sales = useQuery(['kassa-sales'], () => kassaService.recentSales({ per_page: 100 }));

  const rows = (sales.data ?? []) as Sale[];
  const filtered = search.trim()
    ? rows.filter((s) => {
        const q = search.trim().toLowerCase();
        return (
          (s.invoice_number ?? '').toLowerCase().includes(q) ||
          (s.customer_name ?? s.customer?.name ?? '').toLowerCase().includes(q)
        );
      })
    : rows;

  const totalToday = filtered.reduce((sum, s) => sum + saleEuros(s), 0);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.sales.title')}
        subtitle={t('adminNew.sales.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/kassa`}>
            <Button variant="gold" size="sm" leftIcon={<ShoppingCart className="h-4 w-4" />}>
              {t('admin.sidebar.kassa')}
            </Button>
          </Link>
        }
        stats={[
          {
            label: t('adminNew.sales.count', { count: filtered.length }),
            value: filtered.length,
            icon: Receipt,
            tone: 'marine',
            loading: sales.loading,
          },
          {
            label: t('adminNew.sales.total'),
            value: formatCurrency(totalToday, dateLocale),
            icon: CreditCard,
            tone: 'gold',
            loading: sales.loading,
          },
        ]}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.sales.listTitle')}
          description={t('adminNew.sales.listSubtitle')}
          icon={ShoppingCart}
        >
          <AdminSearchInput
            value={search}
            onChange={setSearch}
            placeholder={t('adminNew.sales.searchPlaceholder')}
            className="mb-4"
          />

          <AdminTableCard>
            {sales.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : sales.error ? (
              <ErrorState message={sales.error} onRetry={() => void sales.refetch()} />
            ) : filtered.length === 0 ? (
              <EmptyState
                title={t('adminNew.sales.emptyTitle')}
                message={t('adminNew.sales.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={860}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.invoice')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.customer')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.amount')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.method')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.sales.columns.date')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {filtered.map((sale) => {
                    const href = saleHref(locale, sale);
                    const methods = sale.payment_methods?.length
                      ? sale.payment_methods.join(', ')
                      : sale.payments?.map((p) => p.method).filter(Boolean).join(', ') || '—';
                    const when = sale.created_date
                      ? `${sale.created_date}${sale.created_time ? ` · ${sale.created_time}` : ''}`
                      : new Date(sale.created_at).toLocaleString(dateLocale);
                    return (
                      <AdminTableRow key={sale.id}>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {sale.invoice_number || sale.id.slice(0, 8)}
                        </AdminTableCell>
                        <AdminTableCell>
                          {sale.customer_name ?? sale.customer?.name ?? '—'}
                        </AdminTableCell>
                        <AdminTableCell className="font-semibold text-navy-900">
                          {formatCurrency(saleEuros(sale), dateLocale)}
                        </AdminTableCell>
                        <AdminTableCell className="capitalize text-sm text-navy-600">
                          {methods}
                        </AdminTableCell>
                        <AdminTableCell>
                          <PaymentStatusBadge status={sale.payment_status || sale.status} />
                        </AdminTableCell>
                        <AdminTableCell className="whitespace-nowrap text-sm text-navy-600">
                          {when}
                        </AdminTableCell>
                        <AdminTableCell className="text-right">
                          {href ? (
                            <Link href={href}>
                              <Button variant="ghost" size="sm">
                                {t('adminNew.sales.openInvoice')}
                              </Button>
                            </Link>
                          ) : (
                            <Badge tone="neutral">{t('adminNew.sales.noInvoice')}</Badge>
                          )}
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>
    </>
  );
}
