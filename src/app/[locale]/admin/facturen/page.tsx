'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownUp, CalendarRange, FileText, Plus, Upload, X } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminFilterPill,
  AdminContent,
  AdminLinkButton,
  AdminSearchInput,
  AdminSectionCard,
  AdminSelect,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { InvoiceStatusBadge, PaymentStatusBadge } from '@/components/admin/StatusBadge';
import { useQuery } from '@/lib/hooks/useAsync';
import { invoicesService, paginatedRows, productGroupsService } from '@/lib/services';
import { centsToEuro, formatCurrency, formatDate, intlLocale } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useCreateMenuIntent } from '@/components/admin/useCreateMenuIntent';
import { invoiceProvenance } from '@/lib/invoice-provenance';

export default function InvoicesPageWrapper() {
  return (
    <React.Suspense fallback={<LoadingState label="…" variant="table" />}>
      <InvoicesPage />
    </React.Suspense>
  );
}

function InvoicesPage() {
  const { locale, t } = useIntl();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateLocale = intlLocale(locale);
  const search = searchParams.get('search') ?? '';
  const legacyStatus = searchParams.get('status') ?? '';
  const status = searchParams.get('invoice_status') ?? (['open', 'paid', 'partially_paid', 'overdue'].includes(legacyStatus) ? 'final' : legacyStatus === 'voided' ? 'cancelled' : legacyStatus);
  const direction = searchParams.get('direction') ?? '';
  const customerId = searchParams.get('customer_id') ?? '';
  const rawPaymentStatus = searchParams.get('payment_status') ?? (['paid', 'partially_paid', 'overdue'].includes(legacyStatus) ? legacyStatus : '');
  const paymentStatus = rawPaymentStatus === 'partially_paid' ? 'partial' : rawPaymentStatus;
  const source = searchParams.get('source') ?? '';
  const productGroup = searchParams.get('product_group') ?? '';
  const paymentMethod = searchParams.get('payment_method') ?? '';
  const dateFrom = searchParams.get('date_from') ?? '';
  const dateTo = searchParams.get('date_to') ?? '';
  const sortBy = searchParams.get('sort_by') ?? '';
  const sortDir = searchParams.get('sort_dir') === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const updateFilters = React.useCallback(
    (updates: Record<string, string | null>, history: 'push' | 'replace' = 'push') => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      const query = params.toString();
      router[history](query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  useCreateMenuIntent(() => router.push(`/${locale}/admin/facturen/nieuw`), 'create');

  const groups = useQuery(['invoice-product-groups'], () =>
    productGroupsService.list({ per_page: 100 }).catch(() => ({ data: [] as Record<string, unknown>[] }))
  );

  const invoices = useQuery(
    [search, status, direction, customerId, paymentStatus, source, productGroup, paymentMethod, dateFrom, dateTo, sortBy, sortDir, page],
    () =>
      invoicesService.list({
        search: search || undefined,
        invoice_status: status || undefined,
        direction: direction || undefined,
        customer_id: customerId || undefined,
        payment_status: paymentStatus || undefined,
        source: source || undefined,
        product_group: productGroup || undefined,
        payment_method: paymentMethod || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        sort_by: sortBy || undefined,
        sort_dir: sortBy ? sortDir : undefined,
        page,
        per_page: 20,
      })
  );

  const statFilters = {
    search: search || undefined,
    invoice_status: status || undefined,
        direction: direction || undefined,
        customer_id: customerId || undefined,
    source: source || undefined,
    product_group: productGroup || undefined,
    payment_method: paymentMethod || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };
  const summary = useQuery(
    ['invoice-register-summary', ...Object.values(statFilters)],
    () => invoicesService.summary(statFilters),
  );

  const rows = invoices.data?.data ?? [];
  const openCount = summary.data?.open_count;
  const overdueCount = summary.data?.overdue_count;
  const paidCount = summary.data?.paid_count;
  const openBalance = summary.data?.open_balance_cents ?? 0;
  const paymentFilterHref = (value: string, ledgerDirection?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('payment_status', value);
    else params.delete('payment_status');
    if (ledgerDirection) params.set('direction', ledgerDirection);
    params.delete('page');
    return `/${locale}/admin/facturen${params.size ? `?${params.toString()}` : ''}`;
  };
  const toggleSort = (column: string) => {
    updateFilters({
      sort_by: column,
      sort_dir: sortBy === column && sortDir === 'desc' ? 'asc' : 'desc',
      page: null,
    });
  };
  const sortHeader = (label: string, column: string) => (
    <button type="button" onClick={() => toggleSort(column)} className="inline-flex items-center gap-1.5">
      {label}
      <ArrowDownUp aria-hidden className={`h-3.5 w-3.5 ${sortBy === column ? 'text-marine-700' : 'text-navy-300'}`} />
    </button>
  );

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.invoices.title')}
        subtitle={t('adminNew.invoices.subtitle')}
        stats={[
          {
            label: t('adminNew.invoices.metrics.open'),
            value: summary.error ? '—' : openCount ?? '—',
            tone: 'marine',
            active: paymentStatus === 'open',
            loading: invoices.loading || summary.loading,
            href: paymentFilterHref('open'),
          },
          {
            label: t('adminNew.invoices.metrics.overdue'),
            value: summary.error ? '—' : overdueCount ?? '—',
            tone: 'danger',
            active: paymentStatus === 'overdue',
            loading: invoices.loading || summary.loading,
            href: paymentFilterHref('overdue'),
          },
          {
            label: t('adminNew.invoices.metrics.paid'),
            value: summary.error ? '—' : paidCount ?? '—',
            tone: 'success',
            active: paymentStatus === 'paid',
            loading: invoices.loading || summary.loading,
            href: paymentFilterHref('paid'),
          },
          {
            label: t('adminNew.invoices.metrics.openBalance'),
            value: summary.error ? '—' : formatCurrency(openBalance / 100, dateLocale),
            tone: 'gold',
            active: paymentStatus === 'outstanding',
            loading: summary.loading,
            href: paymentFilterHref('outstanding', 'sales'),
          },
          {
            label: t('adminNew.invoices.payableBalance', { defaultValue: 'Te betalen leveranciers' }),
            value: summary.error ? '—' : formatCurrency((summary.data?.payable_balance_cents ?? 0) / 100, dateLocale),
            tone: 'navy',
            loading: summary.loading,
            href: paymentFilterHref('outstanding', 'purchase'),
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.invoices.title')}
          description={t('adminNew.invoices.subtitle')}
          icon={FileText}
          action={
            <div className="flex gap-2">
              <Link href={`/${locale}/admin/facturen/import`}>
                <Button variant="outline" size="sm" leftIcon={<Upload className="h-4 w-4" />}>
                  {t('adminNew.invoiceImports.title')}
                </Button>
              </Link>
              <Link href={`/${locale}/admin/facturen/nieuw`}>
                <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
                  {t('adminNew.invoices.new')}
                </Button>
              </Link>
            </div>
          }
        >
        <div className="mb-4 space-y-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <AdminSearchInput
              value={search}
              onChange={(value) => {
                updateFilters({ search: value || null, page: null }, 'replace');
              }}
              placeholder={t('adminNew.invoices.searchPlaceholder')}
              className="lg:flex-1"
            />
            <div className="flex flex-wrap gap-2">
              {[
                { value: '', label: t('adminNew.invoices.allPaymentStatuses') },
                { value: 'outstanding', label: t('adminNew.invoices.metrics.openBalance') },
                { value: 'open', label: t('adminNew.status.open') },
                { value: 'partial', label: t('adminNew.status.partial', { defaultValue: 'Gedeeltelijk betaald' }) },
                { value: 'overdue', label: t('adminNew.status.overdue') },
                { value: 'paid', label: t('adminNew.status.paid') },
              ].map((pill) => (
                <AdminFilterPill
                  key={pill.value || 'all'}
                  active={paymentStatus === pill.value && paymentMethod !== 'on_account'}
                  onClick={() => {
                    updateFilters({ payment_status: pill.value || null, payment_method: null, page: null });
                  }}
                >
                  {pill.label}
                </AdminFilterPill>
              ))}
              <AdminFilterPill
                active={paymentMethod === 'on_account'}
                onClick={() => {
                  updateFilters({
                    payment_method: paymentMethod === 'on_account' ? null : 'on_account',
                    payment_status: null,
                    page: null,
                  });
                }}
              >
                {t('adminNew.invoices.onAccount', { defaultValue: 'Op rekening' })}
              </AdminFilterPill>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          <AdminSelect
            value={paymentStatus}
            onChange={(value) => updateFilters({ payment_status: value || null, page: null })}
          >
            <option value="">{t('adminNew.invoices.allPaymentStatuses', { defaultValue: 'Alle betaalstatussen' })}</option>
            <option value="outstanding">{t('adminNew.invoices.metrics.openBalance')}</option>
            <option value="open">{t('adminNew.status.open')}</option>
            <option value="partial">{t('adminNew.status.partial', { defaultValue: 'Gedeeltelijk betaald' })}</option>
            <option value="overdue">{t('adminNew.status.overdue')}</option>
            <option value="paid">{t('adminNew.status.paid')}</option>
          </AdminSelect>
          <AdminSelect
            value={status}
            onChange={(value) => {
              updateFilters({ invoice_status: value || null, status: null, page: null });
            }}
          >
            <option value="">{t('adminNew.invoices.invoiceStates', { defaultValue: 'Alle factuurstatussen' })}</option>
            <option value="final">{t('adminNew.status.final', { defaultValue: 'Definitief' })}</option>
            <option value="draft">{t('adminNew.status.draft')}</option>
            <option value="credited">{t('adminNew.status.credited')}</option>
            <option value="cancelled">{t('adminNew.status.cancelled')}</option>
          </AdminSelect>
          <AdminSelect value={direction} onChange={(value) => updateFilters({ direction: value || null, page: null })}>
            <option value="">{t('adminNew.invoices.allDirections', { defaultValue: 'Verkoop en inkoop' })}</option>
            <option value="sales">{t('adminNew.invoices.sales', { defaultValue: 'Verkoop' })}</option>
            <option value="purchase">{t('adminNew.invoices.purchase', { defaultValue: 'Inkoop' })}</option>
          </AdminSelect>
          <AdminSelect
            value={source}
            onChange={(value) => {
              updateFilters({ source: value || null, page: null });
            }}
          >
            <option value="">{t('adminNew.invoices.allSources')}</option>
            <option value="kassa">{t('adminNew.invoices.source.kassa')}</option>
            <option value="stalling">{t('adminNew.invoices.source.stalling')}</option>
            <option value="manual">{t('adminNew.invoices.source.manual')}</option>
            <option value="calculator">{t('adminNew.invoices.source.calculator')}</option>
            <option value="appointment">{t('adminNew.invoices.source.appointment', { defaultValue: 'Afspraak' })}</option>
            <option value="brokerage">{t('adminNew.invoices.source.brokerage', { defaultValue: 'Makelaardij' })}</option>
            <option value="import">{t('adminNew.invoices.source.import', { defaultValue: 'Import' })}</option>
          </AdminSelect>
          <AdminSelect
            value={productGroup}
            onChange={(value) => {
              updateFilters({ product_group: value || null, page: null });
            }}
          >
            <option value="">{t('adminNew.invoices.allGroups')}</option>
            {paginatedRows(groups.data).map((g) => {
              const code = String((g as Record<string, unknown>).code ?? '');
              const name = String((g as Record<string, unknown>).name ?? code);
              return code ? (
                <option key={code} value={code}>
                  {name}
                </option>
              ) : null;
            })}
          </AdminSelect>
          <AdminSelect
            value={paymentMethod}
            onChange={(value) => {
              updateFilters({ payment_method: value || null, page: null });
            }}
          >
            <option value="">{t('adminNew.invoices.allMethods')}</option>
            <option value="pin">{t('adminNew.invoiceDetail.paymentMethods.pin')}</option>
            <option value="cash">{t('adminNew.invoiceDetail.paymentMethods.cash')}</option>
            <option value="ideal">iDEAL</option>
            <option value="banktransfer">{t('adminNew.invoiceDetail.paymentMethods.banktransfer')}</option>
          </AdminSelect>
          <div className="flex h-10 items-center gap-1 rounded-lg border border-navy-200 bg-white px-2 text-sm text-navy-600">
            <CalendarRange className="h-4 w-4 shrink-0 text-navy-400" />
            <input
              type="date"
              aria-label={t('adminNew.invoices.dateFrom')}
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => {
                updateFilters({ date_from: e.target.value || null, page: null });
              }}
              className="w-[7.5rem] border-0 bg-transparent p-0 text-sm text-navy-700 focus:outline-none focus:ring-0"
            />
            <span className="text-navy-300">–</span>
            <input
              type="date"
              aria-label={t('adminNew.invoices.dateTo')}
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => {
                updateFilters({ date_to: e.target.value || null, page: null });
              }}
              className="w-[7.5rem] border-0 bg-transparent p-0 text-sm text-navy-700 focus:outline-none focus:ring-0"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                aria-label={t('adminNew.common.cancel')}
                onClick={() => {
                  updateFilters({ date_from: null, date_to: null, page: null });
                }}
                className="ml-0.5 rounded p-0.5 text-navy-400 hover:bg-sand-100 hover:text-navy-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          </div>
        </div>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.invoices.total', {
                  count: invoices.data?.meta?.total ?? rows.length,
                })}
                meta={invoices.data?.meta}
                onPageChange={(newPage) => updateFilters({ page: String(newPage) })}
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
                  <AdminTableHeaderCell>{sortHeader(t('adminNew.invoices.columns.invoice'), 'invoice_number')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{sortHeader(t('adminNew.invoices.columns.customer'), 'customer_name')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{sortHeader(t('adminNew.invoices.columns.source'), 'source')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{sortHeader(t('adminNew.invoices.columns.amount'), 'total_amount')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{sortHeader(t('adminNew.invoices.columns.dueDate'), 'due_date')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.paymentMethod')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.columns.paidDate')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.invoiceState', { defaultValue: 'Factuurstatus' })}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.invoices.paymentState', { defaultValue: 'Betaalstatus' })}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((invoice) => {
                  const firstMethod =
                    invoice.payments?.[0]?.method ?? invoice.payments?.[0]?.provider;
                  const provenance = invoiceProvenance(locale, invoice);
                  return (
                    <AdminTableRow key={invoice.id}>
                      <AdminTableCell>
                        <div className="font-semibold text-navy-900">{invoice.direction === 'purchase' ? invoice.reference || invoice.invoice_number : invoice.invoice_number}</div>
                        <div className="text-xs text-navy-500">{formatDate(invoice.created_at, dateLocale)}</div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="font-medium text-navy-900">{invoice.supplier_name ?? invoice.customer?.name ?? String(invoice.customer_snapshot?.name ?? '—')}</div>
                        <div className="text-xs text-navy-500">{invoice.customer?.email ?? '—'}</div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="capitalize">{invoice.source}</div><div className="text-xs text-navy-500">{invoice.direction === 'purchase' ? t('adminNew.invoices.purchase', { defaultValue: 'Inkoop' }) : t('adminNew.invoices.sales', { defaultValue: 'Verkoop' })}</div>
                        {provenance ? (
                          <Link href={provenance.href} className="mt-1 block text-sm font-medium text-marine-700 hover:underline">
                            {t('adminNew.invoices.provenanceLabel', { defaultValue: 'Bron' })}: {provenance.label}
                          </Link>
                        ) : null}
                      </AdminTableCell>
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
                        <InvoiceStatusBadge status={invoice.invoice_status ?? invoice.status} />
                      </AdminTableCell>
                      <AdminTableCell>
                        {invoice.payment_status ? <><PaymentStatusBadge status={invoice.payment_status} />{invoice.is_overdue && invoice.payment_status === 'partial' ? <PaymentStatusBadge status="overdue" /> : null}</> : '—'}
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
        </AdminSectionCard>
      </AdminContent>

    </>
  );
}
