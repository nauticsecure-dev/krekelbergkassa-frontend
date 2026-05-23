'use client';

import * as React from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus, Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { Pagination } from '@/components/admin/Pagination';
import { InvoiceStatusBadge } from '@/components/admin/StatusBadge';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { invoicesService } from '@/lib/services';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function InvoicesPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [source, setSource] = React.useState('');
  const [page, setPage] = React.useState(1);

  const invoices = useQuery([search, status, source, page], () =>
    invoicesService.list({
      search: search || undefined,
      status: status || undefined,
      source: source || undefined,
      page,
      per_page: 20,
    })
  );

  const createInvoice = useMutation(() =>
    invoicesService.create({
      customer_id: null,
      source: 'manual',
      lines: [
        {
          description: t('adminNew.invoices.defaultLineDescription'),
          quantity: 1,
          unit_price: 0,
          vat_rate: 21,
        },
      ],
    })
  );

  const handleCreate = async () => {
    try {
      const invoice = await createInvoice.mutate();
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.invoices.toasts.createFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const rows = invoices.data?.data ?? [];
  const openCount = rows.filter((invoice) => invoice.status === 'open').length;
  const overdueCount = rows.filter((invoice) => invoice.is_overdue).length;
  const paidCount = rows.filter((invoice) => invoice.is_fully_paid).length;
  const openBalance = rows.reduce(
    (sum, invoice) => sum + centsToEuro(invoice.outstanding_cents),
    0
  );

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.invoices.title')}
        subtitle={t('adminNew.invoices.subtitle')}
        rightSlot={
          <Button
            variant="gold"
            size="sm"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleCreate}
          >
            {t('adminNew.invoices.new')}
          </Button>
        }
      />

      <div className="space-y-4 px-4 py-6 sm:px-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label={t('adminNew.invoices.metrics.open')} value={String(openCount)} />
          <Metric label={t('adminNew.invoices.metrics.overdue')} value={String(overdueCount)} tone="warn" />
          <Metric label={t('adminNew.invoices.metrics.paid')} value={String(paidCount)} tone="ok" />
          <Metric
            label={t('adminNew.invoices.metrics.openBalance')}
            value={formatCurrency(openBalance, locale === 'en' ? 'en-GB' : 'nl-NL')}
          />
        </div>

        <Card className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_190px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t('adminNew.invoices.searchPlaceholder')}
                className="input-base pl-9"
              />
            </div>
            <select
              className="input-base"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.invoices.allStatuses')}</option>
              <option value="open">{t('adminNew.status.open')}</option>
              <option value="paid">{t('adminNew.status.paid')}</option>
              <option value="overdue">{t('adminNew.status.overdue')}</option>
              <option value="credited">{t('adminNew.status.credited')}</option>
              <option value="cancelled">{t('adminNew.status.cancelled')}</option>
              <option value="draft">{t('adminNew.status.draft')}</option>
            </select>
            <select
              className="input-base"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.invoices.allSources')}</option>
              <option value="kassa">{t('adminNew.invoices.source.kassa')}</option>
              <option value="stalling">{t('adminNew.invoices.source.stalling')}</option>
              <option value="manual">{t('adminNew.invoices.source.manual')}</option>
              <option value="calculator">{t('adminNew.invoices.source.calculator')}</option>
            </select>
          </div>
        </Card>

        <Card className="overflow-hidden">
          {invoices.loading ? (
            <LoadingState label={t('adminNew.invoices.loading')} variant="table" />
          ) : null}
          {!invoices.loading && invoices.error ? (
            <ErrorState message={invoices.error} onRetry={() => void invoices.refetch()} />
          ) : null}
          {!invoices.loading && !invoices.error && rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.invoices.emptyTitle')}
              message={t('adminNew.invoices.emptyMessage')}
            />
          ) : null}

          {!invoices.loading && !invoices.error && rows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.invoice')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.customer')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.source')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.amount')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.dueDate')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.paymentMethod')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.paidDate')}</th>
                      <th className="px-4 py-3">{t('adminNew.invoices.columns.status')}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {rows.map((invoice) => {
                      const firstMethod = invoice.payments?.[0]?.method ?? invoice.payments?.[0]?.provider;
                      return (
                        <tr key={invoice.id} className="hover:bg-sand-50">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-navy-900">{invoice.invoice_number}</div>
                            <div className="text-xs text-navy-500">{formatDate(invoice.created_at)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-navy-900">{invoice.customer?.name ?? '-'}</div>
                            <div className="text-xs text-navy-500">{invoice.customer?.email ?? '-'}</div>
                          </td>
                          <td className="px-4 py-3 capitalize">{invoice.source}</td>
                          <td className="px-4 py-3 font-semibold text-navy-900">
                            {formatCurrency(
                              invoice.total_amount_euros,
                              locale === 'en' ? 'en-GB' : 'nl-NL'
                            )}
                            {invoice.outstanding_cents > 0 ? (
                              <div className="text-xs font-medium text-amber-700">
                                {t('adminNew.invoices.openAmount')}:{' '}
                                {formatCurrency(
                                  centsToEuro(invoice.outstanding_cents),
                                  locale === 'en' ? 'en-GB' : 'nl-NL'
                                )}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3">{formatDate(invoice.due_date)}</td>
                          <td className="px-4 py-3">{firstMethod ?? '-'}</td>
                          <td className="px-4 py-3">{formatDate(invoice.paid_at)}</td>
                          <td className="px-4 py-3">
                            <InvoiceStatusBadge status={invoice.status} />
                            {invoice.is_overdue ? (
                              <div className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600">
                                <AlertTriangle className="h-3 w-3" />
                                {t('adminNew.status.overdue')}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/${locale}/admin/facturen/${invoice.id}`}
                              className="font-semibold text-marine-700 hover:text-marine-800"
                            >
                              {t('adminNew.invoices.details')}
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/50 px-4 py-3 text-xs text-navy-500">
                <span>
                  {t('adminNew.invoices.total', {
                    count: invoices.data?.meta?.total ?? rows.length,
                  })}
                </span>
                <Pagination meta={invoices.data?.meta} onChange={setPage} />
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </>
  );
}

function Metric({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warn' | 'ok';
}) {
  const toneClass: Record<string, string> = {
    default: 'text-navy-900',
    warn: 'text-amber-700',
    ok: 'text-emerald-700',
  };

  return (
    <Card className="p-4">
      <div className="text-[11px] uppercase tracking-wider text-navy-500">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${toneClass[tone]}`}>{value}</div>
    </Card>
  );
}
