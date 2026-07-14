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
import { centsToEuro, formatCurrency, formatDate } from '@/lib/format';

export default function BoatsPage() {
  const { locale, t } = useIntl();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const emptyCreateForm = {
    customer_id: '',
    name: '',
    type: 'motor',
    length_cm: '',
    width_cm: '',
    location_code: '',
    brand: '',
    model: '',
    build_year: '',
    hull_material: '',
    draft_cm: '',
    weight_kg: '',
    fuel_type: '',
    engine_type: '',
    engine_brand: '',
    engine_power: '',
    mmsi_number: '',
    insurance_number: '',
  };
  const [form, setForm] = React.useState(emptyCreateForm);

  const boats = useQuery([query, statusFilter, page], () =>
    boatsService.list({ search: query || undefined, status: statusFilter || undefined, page, per_page: 20 })
  );
  const stats = useQuery(['boats-stats'], () => boatsService.aggregateStats());
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
        brand: form.brand || null,
        model: form.model || null,
        build_year: form.build_year ? Number(form.build_year) : null,
        hull_material: form.hull_material || null,
        draft_cm: form.draft_cm ? Number(form.draft_cm) : null,
        weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
        fuel_type: form.fuel_type || null,
        engine_type: form.engine_type || null,
        engine_brand: form.engine_brand || null,
        engine_power: form.engine_power || null,
        mmsi_number: form.mmsi_number || null,
        insurance_number: form.insurance_number || null,
      });
      setShowCreate(false);
      setForm(emptyCreateForm);
      await boats.refetch();
      await stats.refetch();
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
      await stats.refetch();
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
            label: t('adminNew.boats.stats.totalBoats'),
            value: Number(stats.data?.total_boats ?? boats.data?.meta?.total ?? rows.length),
            icon: Ship,
            tone: 'marine',
            loading: stats.loading,
          },
          {
            label: t('adminNew.boats.stats.boatsInStorage'),
            value: Number(stats.data?.boats_in_storage ?? 0),
            icon: MapPin,
            tone: 'gold',
            loading: stats.loading,
          },
          {
            label: t('adminNew.boats.stats.activeWorkOrders'),
            value: Number(stats.data?.active_work_orders ?? 0),
            icon: Anchor,
            tone: 'navy',
            loading: stats.loading,
          },
          {
            label: t('adminNew.boats.stats.openBalance'),
            value: formatCurrency(centsToEuro(Number(stats.data?.open_balance_cents ?? 0)), dateLocale),
            icon: Anchor,
            tone: 'success',
            loading: stats.loading,
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
            <AdminTable minWidth={1160}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.boat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.owner')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.fields.brand')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.length', { defaultValue: 'Lengte' })}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.currentStorageLocation')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('adminNew.boats.columns.lastActivity')}</AdminTableHeaderCell>
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
                    <AdminTableCell className="whitespace-nowrap text-sm">
                      {(boat as unknown as Record<string, unknown>).length_cm
                        ? `${String((boat as unknown as Record<string, unknown>).length_cm)} cm`
                        : '—'}
                    </AdminTableCell>
                    <AdminTableCell>{boat.location_code ?? '—'}</AdminTableCell>
                    <AdminTableCell className="text-sm text-navy-600">
                      {(() => {
                        const la = (boat as unknown as Record<string, unknown>).last_activity_at;
                        return la ? formatDate(String(la), dateLocale) : '—';
                      })()}
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-0.5 text-xs">
                        <Link
                          href={`/${locale}/admin/boten/${boat.id}?tab=storage`}
                          className="font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.boats.tabs.storage')}
                        </Link>
                        <Link
                          href={`/${locale}/admin/boten/${boat.id}?tab=financial`}
                          className="font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.boats.tabs.financial')}
                        </Link>
                        <Link
                          href={`/${locale}/admin/boten/${boat.id}?tab=workOrders`}
                          className="font-semibold text-marine-700 hover:text-marine-900"
                        >
                          {t('adminNew.boats.tabs.workOrders')}
                        </Link>
                      </div>
                      <div className="mt-1 flex items-center justify-end">
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
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          ) : null}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="lg">
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
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('adminNew.boats.fields.lengthCm')}
                type="number"
                value={form.length_cm}
                onChange={(e) => setForm((prev) => ({ ...prev, length_cm: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.widthCm')}
                type="number"
                value={form.width_cm}
                onChange={(e) => setForm((prev) => ({ ...prev, width_cm: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.locationCode')}
                value={form.location_code}
                onChange={(e) => setForm((prev) => ({ ...prev, location_code: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.brand')}
                value={form.brand}
                onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.model')}
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.buildYear')}
                type="number"
                value={form.build_year}
                onChange={(e) => setForm((prev) => ({ ...prev, build_year: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.hullMaterial')}
                value={form.hull_material}
                onChange={(e) => setForm((prev) => ({ ...prev, hull_material: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.draftCm')}
                type="number"
                value={form.draft_cm}
                onChange={(e) => setForm((prev) => ({ ...prev, draft_cm: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.weightKg')}
                type="number"
                value={form.weight_kg}
                onChange={(e) => setForm((prev) => ({ ...prev, weight_kg: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.fuelType')}
                value={form.fuel_type}
                onChange={(e) => setForm((prev) => ({ ...prev, fuel_type: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.engineBrand')}
                value={form.engine_brand}
                onChange={(e) => setForm((prev) => ({ ...prev, engine_brand: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.engineType')}
                value={form.engine_type}
                onChange={(e) => setForm((prev) => ({ ...prev, engine_type: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.enginePower')}
                value={form.engine_power}
                onChange={(e) => setForm((prev) => ({ ...prev, engine_power: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.mmsi')}
                value={form.mmsi_number}
                onChange={(e) => setForm((prev) => ({ ...prev, mmsi_number: e.target.value }))}
              />
              <Input
                label={t('adminNew.boats.fields.insuranceNumber')}
                value={form.insurance_number}
                onChange={(e) => setForm((prev) => ({ ...prev, insurance_number: e.target.value }))}
              />
            </div>
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
