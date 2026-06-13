'use client';

import * as React from 'react';
import Link from 'next/link';
import { Anchor, MapPin, Plus, Ship, Trash2 } from 'lucide-react';
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
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { boatsService, customersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';

export default function BoatsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    customer_id: '',
    name: '',
    type: 'motor',
    length_cm: '',
    width_cm: '',
    location_code: '',
  });

  const boats = useQuery([query, statusFilter, page], () =>
    boatsService.list({ search: query || undefined, status: statusFilter || undefined, page, per_page: 20 })
  );
  const customers = useQuery(['boats-customers'], () => customersService.list({ per_page: 100 }));

  const createBoat = useMutation(boatsService.create);
  const deleteBoat = useMutation(boatsService.remove);

  const rows = boats.data?.data ?? [];

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoat.mutate({
        customer_id: form.customer_id,
        name: form.name,
        type: form.type,
        length_cm: form.length_cm ? Number(form.length_cm) : null,
        width_cm: form.width_cm ? Number(form.width_cm) : null,
        location_code: form.location_code || null,
      });
      setShowCreate(false);
      setForm({ customer_id: '', name: '', type: 'motor', length_cm: '', width_cm: '', location_code: '' });
      await boats.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.boats.toasts.createFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteBoat.mutate(id);
      await boats.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.deleted') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.boats.toasts.deleteFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.boats.title')}
        subtitle={t('adminNew.boats.subtitle')}
        stats={[
          {
            label: t('adminNew.boats.total', { count: boats.data?.meta?.total ?? rows.length }),
            value: boats.data?.meta?.total ?? rows.length,
            icon: Ship,
            tone: 'marine',
            loading: boats.loading,
          },
          {
            label: t('adminNew.boats.columns.location'),
            value: rows.filter((b) => b.location_code).length,
            icon: MapPin,
            tone: 'gold',
            loading: boats.loading,
          },
          {
            label: t('adminNew.boats.columns.type'),
            value: new Set(rows.map((b) => b.type)).size,
            icon: Anchor,
            tone: 'navy',
            loading: boats.loading,
          },
          {
            label: t('adminNew.boats.columns.length'),
            value: rows.length
              ? `${Math.round(rows.reduce((s, b) => s + Number(b.length_cm || 0), 0) / rows.length)} cm`
              : '—',
            tone: 'success',
            loading: boats.loading,
          },
        ]}
      />

      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.boats.title')}
          description={t('adminNew.boats.subtitle')}
          icon={Ship}
          action={
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.boats.new')}
            </Button>
          }
        >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <AdminSearchInput
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder={t('adminNew.boats.searchPlaceholder')}
            className="flex-1"
          />
          <AdminSelect
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
          >
            <option value="">{t('adminNew.boats.statusAll')}</option>
            <option value="in_storage">{t('adminNew.boats.statusInStorage')}</option>
            <option value="work_in_progress">{t('adminNew.boats.statusWorkInProgress')}</option>
            <option value="registered">{t('adminNew.boats.statusRegistered')}</option>
          </AdminSelect>
        </div>

        <AdminTableCard
          footer={
            rows.length > 0 ? (
              <AdminTableFooter
                summary={t('adminNew.boats.total', {
                  count: boats.data?.meta?.total ?? rows.length,
                })}
                meta={boats.data?.meta}
                onPageChange={setPage}
              />
            ) : undefined
          }
        >
          {boats.loading ? <LoadingState label={t('adminNew.boats.loading')} variant="table" /> : null}
          {!boats.loading && boats.error ? (
            <ErrorState message={boats.error} onRetry={() => void boats.refetch()} />
          ) : null}
          {!boats.loading && !boats.error && rows.length === 0 ? (
            <EmptyState title={t('adminNew.boats.emptyTitle')} message={t('adminNew.boats.emptyMessage')} />
          ) : null}

          {!boats.loading && !boats.error && rows.length > 0 ? (
            <AdminTable minWidth={880}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.boat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.owner')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.fields.brand')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.location')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {rows.map((boat) => (
                  <AdminTableRow key={boat.id}>
                    <AdminTableCell>
                      <div className="font-semibold text-navy-900">{boat.name}</div>
                      <div className="text-xs text-navy-500">{boat.registration_number ?? '—'}</div>
                    </AdminTableCell>
                    <AdminTableCell>
                      {boat.customer?.id ? (
                        <Link
                          className="font-semibold text-marine-700 hover:text-marine-900"
                          href={`/${locale}/admin/klanten/${boat.customer.id}`}
                        >
                          {boat.customer.name}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </AdminTableCell>
                    <AdminTableCell className="text-sm">
                      {String((boat as unknown as Record<string, unknown>).brand ?? '—')}
                      {(boat as unknown as Record<string, unknown>).model ? (
                        <div className="text-xs text-navy-400">{String((boat as unknown as Record<string, unknown>).model)}</div>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell className="capitalize">{boat.type}</AdminTableCell>
                    <AdminTableCell>
                      {(() => {
                        const cs = String((boat as unknown as Record<string, unknown>).current_status ?? '');
                        const key = `adminNew.boats.status${cs === 'in_storage' ? 'InStorage' : cs === 'work_in_progress' ? 'WorkInProgress' : cs === 'registered' ? 'Registered' : ''}`;
                        return cs ? t(key) : '—';
                      })()}
                    </AdminTableCell>
                    <AdminTableCell>{boat.location_code ?? '—'}</AdminTableCell>
                    <AdminTableCell className="text-right">
                      <Link href={`/${locale}/admin/boten/${boat.id}`}>
                        <Button variant="ghost" size="sm">
                          {t('adminNew.common.edit')}
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => setDeleteTarget(boat.id)}
                      >
                        {t('adminNew.common.delete')}
                      </Button>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.boats.new')} />
          <AdminModalBody>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.boats.columns.owner')}
              </label>
              <select
                className="input-base w-full"
                value={form.customer_id}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                required
              >
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(customers.data?.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label={t('adminNew.common.name')}
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.boats.columns.type')}
              </label>
              <select
                className="input-base w-full"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="motor">{t('adminNew.boats.type.motor')}</option>
                <option value="sail">{t('adminNew.boats.type.sail')}</option>
                <option value="rib">RIB</option>
                <option value="trailer">Trailer</option>
                <option value="other">{t('adminNew.boats.type.other')}</option>
              </select>
            </div>
            <Input
              label={t('adminNew.boats.fields.lengthCm')}
              value={form.length_cm}
              onChange={(e) => setForm((prev) => ({ ...prev, length_cm: e.target.value }))}
            />
            <Input
              label={t('adminNew.boats.fields.widthCm')}
              value={form.width_cm}
              onChange={(e) => setForm((prev) => ({ ...prev, width_cm: e.target.value }))}
            />
            <Input
              label={t('adminNew.boats.fields.locationCode')}
              value={form.location_code}
              onChange={(e) => setForm((prev) => ({ ...prev, location_code: e.target.value }))}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createBoat.loading}>
              {createBoat.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        title={t('adminNew.common.delete')}
        message={t('adminNew.boats.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Trash2}
        loading={deleteBoat.loading}
      />
    </>
  );
}
