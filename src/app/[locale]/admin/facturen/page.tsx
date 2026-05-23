'use client';

import * as React from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminLinkButton,
  AdminSearchInput,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { InvoiceStatusBadge } from '@/components/admin/StatusBadge';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { invoicesService } from '@/lib/services';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

export default function InvoicesPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
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
  const openBalance = rows.reduce((sum, invoice) => sum + centsToEuro(invoice.outstanding_cents), 0);

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
        stats={[
          {
            label: t('adminNew.invoices.metrics.open'),
            value: openCount,
            tone: 'marine',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.invoices.metrics.overdue'),
            value: overdueCount,
            tone: 'danger',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.invoices.metrics.paid'),
            value: paidCount,
            tone: 'success',
            loading: invoices.loading,
          },
          {
            label: t('adminNew.invoices.metrics.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            tone: 'gold',
            loading: invoices.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminToolbar>
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('adminNew.invoices.searchPlaceholder')}
          />
          <AdminSelect
            value={status}
            onChange={(value) => {
              setStatus(value);
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
          </AdminSelect>
          <AdminSelect
            value={source}
            onChange={(value) => {
              setSource(value);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.invoices.allSources')}</option>
            <option value="kassa">{t('adminNew.invoices.source.kassa')}</option>
            <option value="stalling">{t('adminNew.invoices.source.stalling')}</option>
            <option value="manual">{t('adminNew.invoices.source.manual')}</option>
            <option value="calculator">{t('adminNew.invoices.source.calculator')}</option>
          </AdminSelect>
        </AdminToolbar>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.invoices.total', {
                  count: invoices.data?.meta?.total ?? rows.length,
                })}
                meta={invoices.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
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
            <AdminTable minWidth={1160}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.invoice')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.customer')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.source')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.amount')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.dueDate')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.paymentMethod')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.paidDate')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((invoice) => {
                  const firstMethod =
                    invoice.payments?.[0]?.method ?? invoice.payments?.[0]?.provider;
                  return (
                    <AdminTableRow key={invoice.id}>
                      <AdminTableCell>
                        <div className="font-semibold text-navy-900">{invoice.invoice_number}</div>
                        <div className="text-xs text-navy-500">{formatDate(invoice.created_at, dateLocale)}</div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="font-medium text-navy-900">{invoice.customer?.name ?? '—'}</div>
                        <div className="text-xs text-navy-500">{invoice.customer?.email ?? '—'}</div>
                      </AdminTableCell>
                      <AdminTableCell className="capitalize">{invoice.source}</AdminTableCell>
                      <AdminTableCell>
                        <div className="font-semibold text-navy-900">
                          {formatCurrency(invoice.total_amount_euros, dateLocale)}
                        </div>
                        {invoice.outstanding_cents > 0 ? (
                          <div className="text-xs font-medium text-amber-700">
                            {t('adminNew.invoices.openAmount')}:{' '}
                            {formatCurrency(centsToEuro(invoice.outstanding_cents), dateLocale)}
                          </div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell>{formatDate(invoice.due_date, dateLocale)}</AdminTableCell>
                      <AdminTableCell>{firstMethod ?? '—'}</AdminTableCell>
                      <AdminTableCell>{formatDate(invoice.paid_at, dateLocale)}</AdminTableCell>
                      <AdminTableCell>
                        <InvoiceStatusBadge status={invoice.status} />
                        {invoice.is_overdue ? (
                          <div className="mt-1 inline-flex items-center gap-1 text-xs text-rose-600">
                            <AlertTriangle className="h-3 w-3" />
                            {t('adminNew.status.overdue')}
                          </div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <AdminLinkButton href={`/${locale}/admin/facturen/${invoice.id}`}>
                          {t('adminNew.invoices.details')}
                        </AdminLinkButton>
                      </AdminTableCell>
                    </AdminTableRow>
                  );
                })}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
      </AdminContent>
    </>
  );
}
