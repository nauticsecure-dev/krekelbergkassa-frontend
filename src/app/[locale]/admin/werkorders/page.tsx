'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Wrench } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableFooter,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { boatsService, workOrdersService } from '@/lib/services';
import { getApiErrorMessage } from '@/lib/api-error';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatDate } from '@/lib/format';

export default function WorkOrdersPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    boat_id: '',
    type: '',
    priority: 'normal',
    description: '',
    due_date: '',
  });

  const orders = useQuery([page], () => workOrdersService.list({ page, per_page: 20 }));
  const boats = useQuery(['wo-boats'], () => boatsService.list({ per_page: 100 }));
  const createOrder = useMutation(workOrdersService.create);
  const updateOrder = useMutation((payload: { id: string; data: Record<string, unknown> }) =>
    workOrdersService.update(payload.id, payload.data)
  );

  const rows = orders.data?.data ?? [];
  const dateLocale = locale === 'en' ? 'en-GB' : 'nl-NL';

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createOrder.mutate({
        boat_id: form.boat_id,
        type: form.type,
        priority: form.priority,
        description: form.description,
        due_date: form.due_date || undefined,
      });
      setShowCreate(false);
      setForm({ boat_id: '', type: '', priority: 'normal', description: '', due_date: '' });
      await orders.refetch();
      push({ tone: 'success', title: t('adminNew.workOrders.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.workOrders.title')}
        subtitle={t('adminNew.workOrders.subtitle')}
        rightSlot={
          orders.errorStatus === 403 ? null : (
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.workOrders.new')}
            </Button>
          )
        }
      />
      <AdminContent>
        <AdminSectionCard title={t('adminNew.workOrders.title')} icon={Wrench}>
          {orders.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {orders.errorStatus === 403 ? (
            <ErrorState
              title={t('adminNew.workOrders.forbiddenTitle')}
              message={t('adminNew.workOrders.forbiddenMessage')}
            />
          ) : null}
          {orders.error && orders.errorStatus !== 403 ? (
            <ErrorState message={orders.error} onRetry={() => void orders.refetch()} />
          ) : null}
          {!orders.loading && !orders.error && rows.length === 0 ? (
            <EmptyState title={t('adminNew.workOrders.emptyTitle')} message={t('adminNew.workOrders.emptyMessage')} />
          ) : null}
          {!orders.loading && rows.length > 0 ? (
            <AdminTableCard
              footer={
                <AdminTableFooter
                  summary={t('adminNew.workOrders.total', { count: orders.data?.meta?.total ?? rows.length })}
                  meta={orders.data?.meta}
                  onPageChange={setPage}
                />
              }
            >
              <AdminTable minWidth={900}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.number')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.priority')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.workOrders.columns.due')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={String(row.id)}>
                      <AdminTableCell className="font-semibold">
                        <Link
                          href={`/${locale}/admin/werkorders/${row.id}`}
                          className="text-marine-700 hover:text-marine-900"
                        >
                          {String(row.number ?? row.id)}
                        </Link>
                      </AdminTableCell>
                      <AdminTableCell>{String(row.type ?? '—')}</AdminTableCell>
                      <AdminTableCell>
                        <select
                          className="input-base py-1 text-xs"
                          value={String(row.status ?? 'new')}
                          onChange={(e) =>
                            void updateOrder
                              .mutate({ id: String(row.id), data: { status: e.target.value } })
                              .then(() => orders.refetch())
                          }
                        >
                          <option value="new">{t('adminNew.workOrders.status.new')}</option>
                          <option value="in_progress">{t('adminNew.workOrders.status.inProgress')}</option>
                          <option value="done">{t('adminNew.workOrders.status.done')}</option>
                          <option value="cancelled">{t('adminNew.workOrders.status.cancelled')}</option>
                        </select>
                      </AdminTableCell>
                      <AdminTableCell>
                        <Badge tone="neutral">{String(row.priority ?? 'normal')}</Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        {row.due_date ? formatDate(String(row.due_date), dateLocale) : '—'}
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <Link
                          href={`/${locale}/admin/werkorders/${row.id}`}
                          className="text-sm font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.workOrders.detail.open')} →
                        </Link>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.workOrders.new')} subtitle={t('adminNew.workOrders.createSubtitle')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.title')}</label>
              <select className="input-base w-full" value={form.boat_id} onChange={(e) => setForm({ ...form, boat_id: e.target.value })} required>
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(boats.data?.data ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <Input label={t('adminNew.workOrders.columns.type')} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required />
            <Input label={t('adminNew.workOrders.columns.due')} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            <textarea className="input-base min-h-24 w-full" placeholder={t('adminNew.workOrders.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold">{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>
    </>
  );
}
