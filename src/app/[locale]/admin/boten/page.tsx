'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { boatsService, customersService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { Pagination } from '@/components/admin/Pagination';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';

export default function BoatsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    customer_id: '',
    name: '',
    type: 'motor',
    length_cm: '',
    width_cm: '',
    location_code: '',
  });

  const boats = useQuery([query, page], () => boatsService.list({ search: query || undefined, page, per_page: 20 }));
  const customers = useQuery(['boats-customers'], () => customersService.list({ per_page: 100 }));

  const createBoat = useMutation(boatsService.create);
  const deleteBoat = useMutation(boatsService.remove);

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
      push({ tone: 'error', title: t('adminNew.boats.toasts.createFailed'), message: err instanceof Error ? err.message : undefined });
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm(t('adminNew.boats.confirmDelete'))) return;
    try {
      await deleteBoat.mutate(id);
      await boats.refetch();
      push({ tone: 'success', title: t('adminNew.boats.toasts.deleted') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.boats.toasts.deleteFailed'), message: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.boats.title')}
        subtitle={t('adminNew.boats.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
            {t('adminNew.boats.new')}
          </Button>
        }
      />
      <div className="space-y-4 px-4 py-6 sm:px-6">
        <Card className="p-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              className="input-base pl-9"
              placeholder={t('adminNew.boats.searchPlaceholder')}
            />
          </div>
        </Card>

        <Card className="overflow-hidden">
          {boats.loading ? <LoadingState label={t('adminNew.boats.loading')} variant="table" /> : null}
          {!boats.loading && boats.error ? <ErrorState message={boats.error} onRetry={() => void boats.refetch()} /> : null}
          {!boats.loading && !boats.error && boats.data?.data.length === 0 ? (
            <EmptyState title={t('adminNew.boats.emptyTitle')} message={t('adminNew.boats.emptyMessage')} />
          ) : null}

          {!boats.loading && !boats.error && (boats.data?.data.length ?? 0) > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] text-sm">
                  <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-navy-500">
                    <tr>
                      <th className="px-4 py-3">{t('adminNew.boats.columns.boat')}</th>
                      <th className="px-4 py-3">{t('adminNew.boats.columns.owner')}</th>
                      <th className="px-4 py-3">{t('adminNew.boats.columns.type')}</th>
                      <th className="px-4 py-3">{t('adminNew.boats.columns.length')}</th>
                      <th className="px-4 py-3">{t('adminNew.boats.columns.location')}</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100">
                    {boats.data?.data.map((boat) => (
                      <tr key={boat.id} className="hover:bg-sand-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-navy-900">{boat.name}</div>
                          <div className="text-xs text-navy-500">{boat.registration_number ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          {boat.customer?.id ? (
                            <Link className="text-marine-700 hover:underline" href={`/${locale}/admin/klanten/${boat.customer.id}`}>
                              {boat.customer.name}
                            </Link>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="px-4 py-3 capitalize">{boat.type}</td>
                        <td className="px-4 py-3">{boat.length_cm ? `${boat.length_cm} cm` : '-'}</td>
                        <td className="px-4 py-3">{boat.location_code ?? '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => void onDelete(boat.id)}>
                            {t('adminNew.common.delete')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 bg-sand-50/40 px-4 py-3 text-xs text-navy-500">
                <span>{t('adminNew.boats.total', { count: boats.data?.meta?.total ?? boats.data?.data.length ?? 0 })}</span>
                <Pagination meta={boats.data?.meta} onChange={setPage} />
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate} className="p-6">
          <h2 className="text-lg font-semibold text-navy-900">{t('adminNew.boats.new')}</h2>
          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.columns.owner')}</label>
              <select
                className="input-base"
                value={form.customer_id}
                onChange={(e) => setForm((prev) => ({ ...prev, customer_id: e.target.value }))}
                required
              >
                <option value="">{t('adminNew.boats.selectCustomer')}</option>
                {(customers.data?.data ?? []).map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>
            <Input label={t('adminNew.common.name')} value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} required />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">{t('adminNew.boats.columns.type')}</label>
              <select className="input-base" value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
                <option value="motor">{t('adminNew.boats.type.motor')}</option>
                <option value="sail">{t('adminNew.boats.type.sail')}</option>
                <option value="rib">RIB</option>
                <option value="trailer">Trailer</option>
                <option value="other">{t('adminNew.boats.type.other')}</option>
              </select>
            </div>
            <Input label={t('adminNew.boats.fields.lengthCm')} value={form.length_cm} onChange={(e) => setForm((prev) => ({ ...prev, length_cm: e.target.value }))} />
            <Input label={t('adminNew.boats.fields.widthCm')} value={form.width_cm} onChange={(e) => setForm((prev) => ({ ...prev, width_cm: e.target.value }))} />
            <Input label={t('adminNew.boats.fields.locationCode')} value={form.location_code} onChange={(e) => setForm((prev) => ({ ...prev, location_code: e.target.value }))} />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createBoat.loading}>{createBoat.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
