'use client';

import * as React from 'react';
import Link from 'next/link';
import { FilePlus2, Plus, Ship, ShieldCheck, Warehouse, XCircle } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
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
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { auditService, boatsService, customersService, stallingService } from '@/lib/services';
import { formatCurrency, formatDate } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function StallingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [type, setType] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [cancelTarget, setCancelTarget] = React.useState<string | null>(null);
  const [invoiceTarget, setInvoiceTarget] = React.useState<string | null>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({
    boat_id: '',
    customer_id: '',
    type: 'winter',
    start_date: '',
    end_date: '',
    paid_until: '',
  });

  const contracts = useQuery([search, status, type, page], () =>
    stallingService.list({
      search: search || undefined,
      status: status || undefined,
      type: type || undefined,
      page,
      per_page: 25,
    })
  );
  const auditLogs = useQuery(['stalling-audit'], () =>
    auditService.logs({ entity_type: 'stalling_contract', per_page: 15 })
  );
  const boats = useQuery(['stalling-boats'], () => boatsService.list({ per_page: 200 }));
  const customers = useQuery(['stalling-customers'], () => customersService.list({ per_page: 200 }));

  const createContract = useMutation(stallingService.create);
  const updateContract = useMutation((payload: { id: string; data: Record<string, unknown> }) =>
    stallingService.update(payload.id, payload.data)
  );
  const createInvoice = useMutation((id: string) => stallingService.generateInvoice(id));
  const cancelContract = useMutation((id: string) => stallingService.cancel(id, 'Cancelled by staff'));

  const execute = async (label: string, fn: () => Promise<unknown>, redirectInvoice = false) => {
    try {
      const result = await fn();
      push({ tone: 'success', title: label });
      await contracts.refetch();
      if (redirectInvoice && result && typeof result === 'object' && 'id' in result) {
        window.location.href = `/${locale}/admin/facturen/${(result as { id: string }).id}`;
      }
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createContract.mutate({
        boat_id: createForm.boat_id,
        customer_id: createForm.customer_id || undefined,
        type: createForm.type,
        start_date: createForm.start_date,
        end_date: createForm.end_date,
        paid_until: createForm.paid_until || undefined,
      });
      setShowCreate(false);
      setCreateForm({ boat_id: '', customer_id: '', type: 'winter', start_date: '', end_date: '', paid_until: '' });
      await contracts.refetch();
      push({ tone: 'success', title: t('adminNew.stalling.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const rows = contracts.data?.data ?? [];
  const overdue = rows.filter((c) => c.payment_status === 'overdue').length;
  const openBalance = rows.reduce((sum, c) => sum + (c.open_balance_cents ?? 0) / 100, 0);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.stalling.title')}
        subtitle={t('adminNew.stalling.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            {t('adminNew.stalling.new')}
          </Button>
        }
        stats={[
          {
            label: t('adminNew.stalling.contracts', { count: contracts.data?.meta?.total ?? rows.length }),
            value: contracts.data?.meta?.total ?? rows.length,
            icon: Warehouse,
            tone: 'marine',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.status.overdue'),
            value: overdue,
            icon: Ship,
            tone: overdue > 0 ? 'danger' : 'success',
            loading: contracts.loading,
          },
          {
            label: t('adminNew.stalling.columns.openBalance'),
            value: formatCurrency(openBalance, dateLocale),
            tone: 'gold',
            loading: contracts.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.stalling.title')}
          description={t('adminNew.stalling.subtitle')}
          icon={Warehouse}
        >
        <AdminToolbar className="mb-4 border-0 bg-transparent p-0 shadow-none">
          <AdminSearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={t('adminNew.stalling.searchPlaceholder')}
          />
          <label className="flex flex-col gap-1 lg:w-auto">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {t('adminNew.stalling.columns.status')}
            </span>
            <AdminSelect
              value={status}
              onChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.stalling.allStatuses')}</option>
              <option value="paid">{t('adminNew.status.paid')}</option>
              <option value="expiring">{t('adminNew.status.expiring')}</option>
              <option value="overdue">{t('adminNew.status.overdue')}</option>
              <option value="open">{t('adminNew.status.open')}</option>
              <option value="cancelled">{t('adminNew.status.cancelled')}</option>
            </AdminSelect>
          </label>
          <label className="flex flex-col gap-1 lg:w-auto">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-navy-400">
              {t('adminNew.stalling.columns.type')}
            </span>
            <AdminSelect
              value={type}
              onChange={(value) => {
                setType(value);
                setPage(1);
              }}
            >
              <option value="">{t('adminNew.stalling.allTypes')}</option>
              <option value="winter">{t('adminNew.stalling.type.winter')}</option>
              <option value="summer">{t('adminNew.stalling.type.summer')}</option>
              <option value="year">{t('adminNew.stalling.type.year')}</option>
              <option value="week">{t('adminNew.stalling.type.week')}</option>
            </AdminSelect>
          </label>
        </AdminToolbar>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.stalling.contracts', {
                  count: contracts.data?.meta?.total ?? rows.length,
                })}
                meta={contracts.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          {contracts.loading ? (
            <LoadingState label={t('adminNew.stalling.loading')} variant="table" />
          ) : null}
          {!contracts.loading && contracts.error ? (
            <ErrorState message={contracts.error} onRetry={() => void contracts.refetch()} />
          ) : null}
          {!contracts.loading && !contracts.error && rows.length === 0 ? (
            <EmptyState
              title={t('adminNew.stalling.emptyTitle')}
              message={t('adminNew.stalling.emptyMessage')}
            />
          ) : null}

          {!contracts.loading && !contracts.error && rows.length > 0 ? (
            <AdminTable minWidth={1100}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.boat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.customer')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.period')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.paidUntil')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.openBalance')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.stalling.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((contract) => (
                  <AdminTableRow key={contract.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-navy-900">{contract.boat?.name ?? '—'}</div>
                      <div className="text-xs text-navy-500">
                        {contract.boat?.length_cm ? `${contract.boat.length_cm} cm` : '—'}
                      </div>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="font-medium text-navy-900">{contract.customer?.name ?? '—'}</div>
                      {contract.customer?.id ? (
                        <Link
                          href={`/${locale}/admin/klanten/${contract.customer.id}`}
                          className="text-xs font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.stalling.openCustomer')}
                        </Link>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatDate(contract.start_date, dateLocale)} – {formatDate(contract.end_date, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell className="capitalize">{contract.type}</AdminTableCell>
                    <AdminTableCell>{formatDate(contract.paid_until, dateLocale)}</AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {formatCurrency(contract.open_balance_cents / 100, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <select
                        className="input-base py-1 text-xs"
                        value={contract.payment_status}
                        onChange={(e) =>
                          void updateContract
                            .mutate({ id: contract.id, data: { payment_status: e.target.value } })
                            .then(() => contracts.refetch())
                        }
                      >
                        <option value="paid">{t('adminNew.status.paid')}</option>
                        <option value="expiring">{t('adminNew.status.expiring')}</option>
                        <option value="overdue">{t('adminNew.status.overdue')}</option>
                        <option value="open">{t('adminNew.status.open')}</option>
                        <option value="cancelled">{t('adminNew.status.cancelled')}</option>
                      </select>
                    </AdminTableCell>
                    <AdminTableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<FilePlus2 className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => setInvoiceTarget(contract.id)}
                        >
                          {t('adminNew.stalling.invoice')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          leftIcon={<XCircle className="h-3.5 w-3.5" />}
                          disabled={createInvoice.loading || cancelContract.loading}
                          onClick={() => setCancelTarget(contract.id)}
                        >
                          {t('adminNew.stalling.cancel')}
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
        </AdminSectionCard>

        <AdminSectionCard
          title={t('adminNew.stalling.auditTitle')}
          description={t('adminNew.stalling.auditSubtitle')}
          icon={ShieldCheck}
          className="mt-5"
        >
          {auditLogs.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!auditLogs.loading && (auditLogs.data?.data ?? []).length === 0 ? (
            <EmptyState title={t('adminNew.stalling.auditEmpty')} message={t('adminNew.stalling.auditEmptyMessage')} />
          ) : null}
          {!auditLogs.loading && (auditLogs.data?.data ?? []).length > 0 ? (
            <AdminTable minWidth={700}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.time')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.actor')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.audit.columns.action')}</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {(auditLogs.data?.data ?? []).map((log) => (
                  <AdminTableRow key={log.id}>
                    <AdminTableCell className="whitespace-nowrap text-sm">
                      {formatDate(log.created_at, dateLocale)}
                    </AdminTableCell>
                    <AdminTableCell>{log.user?.name ?? '—'}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="neutral">{log.action}</Badge>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.stalling.new')} subtitle={t('adminNew.stalling.createSubtitle')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.boat')}</label>
              <select className="input-base w-full" value={createForm.boat_id} onChange={(e) => setCreateForm({ ...createForm, boat_id: e.target.value })} required>
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(boats.data?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.customer')}</label>
              <select className="input-base w-full" value={createForm.customer_id} onChange={(e) => setCreateForm({ ...createForm, customer_id: e.target.value })}>
                <option value="">{t('adminNew.kassa.selectCustomer')}</option>
                {(customers.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.stalling.columns.type')}</label>
              <select className="input-base w-full" value={createForm.type} onChange={(e) => setCreateForm({ ...createForm, type: e.target.value })}>
                <option value="winter">{t('adminNew.stalling.type.winter')}</option>
                <option value="summer">{t('adminNew.stalling.type.summer')}</option>
                <option value="year">{t('adminNew.stalling.type.year')}</option>
                <option value="week">{t('adminNew.stalling.type.week')}</option>
              </select>
            </div>
            <Input label={t('adminNew.stalling.fields.startDate')} type="date" value={createForm.start_date} onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })} required />
            <Input label={t('adminNew.stalling.fields.endDate')} type="date" value={createForm.end_date} onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })} required />
            <Input label={t('adminNew.stalling.columns.paidUntil')} type="date" value={createForm.paid_until} onChange={(e) => setCreateForm({ ...createForm, paid_until: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createContract.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={async () => {
          if (!cancelTarget) return;
          await execute(t('adminNew.stalling.cancelled'), () => cancelContract.mutate(cancelTarget));
          setCancelTarget(null);
        }}
        title={t('adminNew.stalling.cancel')}
        message={t('adminNew.stalling.confirmCancel')}
        confirmLabel={t('adminNew.stalling.cancel')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={XCircle}
        loading={cancelContract.loading}
      />

      <AdminConfirmModal
        open={!!invoiceTarget}
        onClose={() => setInvoiceTarget(null)}
        onConfirm={async () => {
          if (!invoiceTarget) return;
          await execute(
            t('adminNew.stalling.invoiceCreated'),
            () => createInvoice.mutate(invoiceTarget),
            true
          );
          setInvoiceTarget(null);
        }}
        title={t('adminNew.stalling.invoice')}
        message={t('adminNew.stalling.confirmCreateInvoice')}
        confirmLabel={t('adminNew.stalling.invoice')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="primary"
        icon={FilePlus2}
        loading={createInvoice.loading}
      />
    </>
  );
}

