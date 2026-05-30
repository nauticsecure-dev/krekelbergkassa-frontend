'use client';

import * as React from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSearchInput,
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
import { productsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useToast } from '@/components/ui/ToastProvider';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency } from '@/lib/format';

export default function ProductsPage() {
  const { t } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [showCreate, setShowCreate] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    code: '',
    name: '',
    category: '',
    vat_rate: '21',
    price_excl_vat: '',
    active: true,
  });

  const products = useQuery([query, page], () =>
    productsService.list({ search: query || undefined, page, per_page: 20 })
  );
  const createProduct = useMutation(productsService.create);
  const deleteProduct = useMutation(productsService.remove);

  const rows = products.data?.data ?? [];

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct.mutate({
        code: form.code,
        name: form.name,
        category: form.category || null,
        vat_rate: form.vat_rate,
        price_excl_vat: Number(form.price_excl_vat),
        active: form.active,
      });
      setShowCreate(false);
      setForm({ code: '', name: '', category: '', vat_rate: '21', price_excl_vat: '', active: true });
      await products.refetch();
      push({ tone: 'success', title: t('adminNew.products.toasts.created') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.products.toasts.createFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteProduct.mutate(id);
      await products.refetch();
      push({ tone: 'success', title: t('adminNew.products.toasts.deleted') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.products.toasts.deleteFailed'),
        message: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.products.title')}
        subtitle={t('adminNew.products.subtitle')}
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.products.title')}
          description={t('adminNew.products.subtitle')}
          icon={Package}
          action={
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.products.new')}
            </Button>
          }
        >
        <AdminSearchInput
          placeholder={t('adminNew.products.searchPlaceholder')}
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          className="mb-4"
        />

        <AdminTableCard>
          {products.loading ? (
            <LoadingState label={t('adminNew.products.loading')} />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={() => void products.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.products.emptyTitle')} message={t('adminNew.products.emptyMessage')} />
          ) : (
            <>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.code')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.category')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.price')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.vat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={row.id}>
                      <AdminTableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-marine-600" />
                          {row.code}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>{row.name}</AdminTableCell>
                      <AdminTableCell>{row.category ?? '—'}</AdminTableCell>
                      <AdminTableCell>{formatCurrency(row.price_incl_vat_euros ?? row.price_incl_vat)}</AdminTableCell>
                      <AdminTableCell>{row.vat_rate}%</AdminTableCell>
                      <AdminTableCell>
                        <Badge tone={row.active ? 'success' : 'neutral'}>
                          {row.active ? t('adminNew.products.active') : t('adminNew.products.inactive')}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          onClick={() => setDeleteTarget(row.id)}
                        >
                          {t('adminNew.common.delete')}
                        </Button>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.products.total', {
                  count: products.data?.meta?.total ?? rows.length,
                })}
                meta={products.data?.meta}
                onPageChange={setPage}
              />
            </>
          )}
        </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)}>
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.products.modal.title')} subtitle={t('adminNew.products.modal.subtitle')} />
          <AdminModalBody>
            <div className="space-y-4">
            <Input label={t('adminNew.products.columns.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            <Input label={t('adminNew.products.columns.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label={t('adminNew.products.columns.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('adminNew.products.fields.priceExcl')} inputMode="decimal" value={form.price_excl_vat} onChange={(e) => setForm({ ...form, price_excl_vat: e.target.value })} required />
              <Input label={t('adminNew.products.columns.vat')} inputMode="decimal" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} required />
            </div>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createProduct.loading}>
              {createProduct.loading ? t('adminNew.common.saving') : t('adminNew.common.save')}
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
        message={t('adminNew.products.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Trash2}
        loading={deleteProduct.loading}
      />
    </>
  );
}
