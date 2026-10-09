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
import { invoicesService, productGroupsService } from '@/lib/services';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useCreateMenuIntent } from '@/components/admin/useCreateMenuIntent';

export default function InvoicesPageWrapper() {
  return (
    <React.Suspense fallback={<LoadingState label="…" variant="table" />}>
      <InvoicesPage />
    </React.Suspense>
  );
}

function paymentStatusFor(invoice: {
  outstanding_cents: number;
  total_amount_cents: number;
  due_date: string | null;
  payment_status?: string | null;
}) {
  const outstanding = Number(invoice.outstanding_cents);
  const total = Number(invoice.total_amount_cents);
  if (outstanding <= 0) return 'paid';
  const today = new Date().toLocaleDateString('sv-SE');
  if (invoice.due_date && invoice.due_date.slice(0, 10) < today) return 'overdue';
  if (outstanding < total) return 'partial';
  return invoice.payment_status || 'open';
}

function InvoicesPage() {
  const { locale, t } = useIntl();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const paymentStatus = searchParams.get('payment_status') ?? '';
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
    productGroupsService.list().catch(() => [])
  );

  const invoices = useQuery(
    [search, status, paymentStatus, source, productGroup, paymentMethod, dateFrom, dateTo, sortBy, sortDir, page],
    () =>
      invoicesService.list({
        search: search || undefined,
        status: status || undefined,
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
    status: status || undefined,
    source: source || undefined,
    product_group: productGroup || undefined,
    payment_method: paymentMethod || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  };
  const openStats = useQuery(
    ['invoice-stats-open', ...Object.values(statFilters)],
    () =>
      invoicesService
        .list({
          ...statFilters,
          payment_status: 'open',
          per_page: 1,
        })
  );
  const overdueStats = useQuery(
    ['invoice-stats-overdue', ...Object.values(statFilters)],
    () =>
      invoicesService
        .list({
          ...statFilters,
          payment_status: 'overdue',
          per_page: 1,
        })
  );
  const paidStats = useQuery(
    ['invoice-stats-paid', ...Object.values(statFilters)],
    () => invoicesService.list({ ...statFilters, payment_status: 'paid', per_page: 1 })
  );
  const openBalanceStats = useQuery(
    ['invoice-stats-open-balance', ...Object.values(statFilters)],
    () => invoicesService.list({ ...statFilters, payment_status: 'open', per_page: 100 })
  );

  const rows = invoices.data?.data ?? [];
  const openCount = openStats.data?.meta?.total;
  const overdueCount = overdueStats.data?.meta?.total;
  const paidCount = paidStats.data?.meta?.total;
  const openBalanceRows = openBalanceStats.data?.data ?? [];
  const openBalanceTotal = openBalanceStats.data?.meta?.total;
  const openBalanceComplete = openBalanceTotal != null
    ? openBalanceTotal <= openBalanceRows.length
    : openBalanceRows.length < 100;
  const openBalance = openBalanceRows.reduce((sum, invoice) => sum + Number(invoice.outstanding_cents ?? 0), 0);
  const paymentFilterHref = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('payment_status', value);
    else params.delete('payment_status');
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
            value: openStats.error ? '—' : openCount ?? '—',
            tone: 'marine',
            active: paymentStatus === 'open',
            loading: invoices.loading || openStats.loading,
            href: paymentFilterHref('open'),
          },
          {
            label: t('adminNew.invoices.metrics.overdue'),
            value: overdueStats.error ? '—' : overdueCount ?? '—',
            tone: 'danger',
            active: paymentStatus === 'overdue',
            loading: invoices.loading || overdueStats.loading,
            href: paymentFilterHref('overdue'),
          },
          {
            label: t('adminNew.invoices.metrics.paid'),
            value: paidStats.error ? '—' : paidCount ?? '—',
            tone: 'success',
            active: paymentStatus === 'paid',
            loading: invoices.loading || paidStats.loading,
            href: paymentFilterHref('paid'),
          },
          {
            label: t('adminNew.invoices.metrics.openBalance'),
            value: openBalanceStats.error || !openBalanceComplete ? '—' : formatCurrency(openBalance / 100, dateLocale),
            tone: 'gold',
            active: paymentStatus === 'open',
            loading: openBalanceStats.loading,
            href: paymentFilterHref('open'),
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
            <option value="open">{t('adminNew.status.open')}</option>
            <option value="partial">{t('adminNew.status.partial', { defaultValue: 'Gedeeltelijk betaald' })}</option>
            <option value="overdue">{t('adminNew.status.overdue')}</option>
            <option value="paid">{t('adminNew.status.paid')}</option>
          </AdminSelect>
          <AdminSelect
            value={status}
            onChange={(value) => {
              updateFilters({ status: value || null, page: null });
            }}
          >
            <option value="">{t('adminNew.invoices.invoiceStates', { defaultValue: 'Alle factuurstatussen' })}</option>
            <option value="draft">{t('adminNew.status.draft')}</option>
            <option value="credited">{t('adminNew.status.credited')}</option>
            <option value="cancelled">{t('adminNew.status.cancelled')}</option>
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
            {(groups.data ?? []).map((g) => {
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
                      </AdminTableCell>
                      <AdminTableCell>
                        <PaymentStatusBadge
                          status={paymentStatusFor(invoice)}
                        />
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
