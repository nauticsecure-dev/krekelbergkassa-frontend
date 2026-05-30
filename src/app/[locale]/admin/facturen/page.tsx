'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, FilePlus2, Plus, Upload, User } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminFilterPill,
  AdminContent,
  AdminLinkButton,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
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
  AdminToolbar,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { InvoiceStatusBadge } from '@/components/admin/StatusBadge';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { customersService, invoicesService } from '@/lib/services';
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function InvoicesPageWrapper() {
  return (
    <React.Suspense fallback={<LoadingState label="…" variant="table" />}>
      <InvoicesPage />
    </React.Suspense>
  );
}

function InvoicesPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const searchParams = useSearchParams();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(searchParams.get('status') ?? '');
  const [paymentStatus, setPaymentStatus] = React.useState(searchParams.get('payment_status') ?? '');
  const [source, setSource] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [customerId, setCustomerId] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');

  const invoices = useQuery([search, status, paymentStatus, source, page], () =>
    invoicesService.list({
      search: search || undefined,
      status: status || undefined,
      payment_status: paymentStatus || undefined,
      source: source || undefined,
      page,
      per_page: 20,
    })
  );

  const customers = useQuery(
    [customerSearch],
    () =>
      customersService.list({
        search: customerSearch || undefined,
        per_page: 50,
      }),
    { immediate: false }
  );

  React.useEffect(() => {
    if (!showCreate) return;
    void customers.refetch();
  }, [showCreate, customerSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const createInvoice = useMutation((selectedCustomerId: string) =>
    invoicesService.create({
      customer_id: selectedCustomerId,
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

  const openCreateModal = () => {
    setCustomerId('');
    setCustomerSearch('');
    setShowCreate(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      push({ tone: 'error', title: t('adminNew.invoices.selectCustomer') });
      return;
    }
    try {
      const invoice = await createInvoice.mutate(customerId);
      setShowCreate(false);
      push({ tone: 'success', title: t('adminNew.invoices.toasts.created') });
      window.location.href = `/${locale}/admin/facturen/${invoice.id}`;
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.invoices.toasts.createFailed'),
        message: getApiErrorMessage(err),
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
        stats={[
          {
            label: t('adminNew.invoices.metrics.open'),
            value: openCount,
            tone: 'marine',
            loading: invoices.loading,
            href: `/${locale}/admin/facturen?payment_status=open`,
          },
          {
            label: t('adminNew.invoices.metrics.overdue'),
            value: overdueCount,
            tone: 'danger',
            loading: invoices.loading,
            href: `/${locale}/admin/facturen?payment_status=overdue`,
          },
          {
            label: t('adminNew.invoices.metrics.paid'),
            value: paidCount,
            tone: 'success',
            loading: invoices.loading,
            href: `/${locale}/admin/facturen?payment_status=paid`,
          },
          {
            label: t('adminNew.invoices.metrics.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            tone: 'gold',
            loading: invoices.loading,
            href: `/${locale}/admin/facturen?payment_status=open`,
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
              <Button
                variant="gold"
                size="sm"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={openCreateModal}
              >
                {t('adminNew.invoices.new')}
              </Button>
            </div>
          }
        >
        <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('adminNew.invoices.searchPlaceholder')}
          />
          <div className="flex flex-wrap gap-2">
            {[
              { value: '', label: t('adminNew.invoices.allStatuses') },
              { value: 'open', label: t('adminNew.status.open') },
              { value: 'overdue', label: t('adminNew.status.overdue') },
              { value: 'paid', label: t('adminNew.status.paid') },
            ].map((pill) => (
              <AdminFilterPill
                key={pill.value || 'all'}
                active={paymentStatus === pill.value}
                onClick={() => {
                  setPaymentStatus(pill.value);
                  setPage(1);
                }}
              >
                {pill.label}
              </AdminFilterPill>
            ))}
          </div>
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
                        <InvoiceStatusBadge status={invoice.status} isOverdue={invoice.is_overdue} />
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

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={handleCreate}>
          <AdminModalHeader
            title={t('adminNew.invoices.modal.title')}
            subtitle={t('adminNew.invoices.modal.subtitle')}
          />
          <AdminModalBody>
            <AdminSearchInput
              placeholder={t('adminNew.customers.searchPlaceholder')}
              value={customerSearch}
              onChange={setCustomerSearch}
            />
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-navy-800">
                <User className="h-4 w-4 text-marine-600" />
                {t('adminNew.invoices.columns.customer')}
              </label>
              {customers.loading ? (
                <LoadingState label={t('adminNew.customers.loading')} />
              ) : customers.error ? (
                <ErrorState message={customers.error} onRetry={() => void customers.refetch()} />
              ) : (
                <select
                  className="input-base w-full"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  required
                >
                  <option value="">{t('adminNew.invoices.selectCustomer')}</option>
                  {(customers.data?.data ?? []).map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.email ? ` · ${customer.email}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {!customers.loading && (customers.data?.data ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-navy-500">{t('adminNew.invoices.modal.noCustomers')}</p>
              ) : null}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="gold"
              leftIcon={<FilePlus2 className="h-4 w-4" />}
              disabled={createInvoice.loading || !customerId}
            >
              {createInvoice.loading ? t('adminNew.common.saving') : t('adminNew.invoices.new')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
