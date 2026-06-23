'use client';

import * as React from 'react';
import { Layers, Minus, Package, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminTable,
  AdminTableCard,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeaderCell,
  AdminTableRow,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { productsService, type ProductBundle } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const PRESET_COLORS = [
  '#2563eb', '#0ea5e9', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#475569', '#0f172a',
];

interface BundleItemForm {
  product_id: string;
  quantity: number;
}

interface BundleForm {
  name: string;
  description: string;
  color: string;
  items: BundleItemForm[];
}

const emptyForm: BundleForm = {
  name: '',
  description: '',
  color: '#2563eb',
  items: [],
};

export default function BundlesPage() {
  const { t } = useIntl();
  const { push } = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<BundleForm>(emptyForm);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const bundles = useQuery(['bundles'], () => productsService.bundles());
  const productsQuery = useQuery(['bundles-products'], () =>
    productsService.list({ per_page: 200, active: true })
  );

  const createBundle = useMutation((payload: Record<string, unknown>) =>
    productsService.createBundle(payload)
  );
  const updateBundle = useMutation((p: { id: string; data: Record<string, unknown> }) =>
    productsService.updateBundle(p.id, p.data)
  );
  const deleteBundle = useMutation((id: string) => productsService.deleteBundle(id));

  const rows = (bundles.data ?? []) as ProductBundle[];
  const products = productsQuery.data?.data ?? [];
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? id;

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (b: ProductBundle) => {
    setEditId(b.id);
    setForm({
      name: b.name ?? '',
      description: String((b as unknown as Record<string, unknown>).description ?? ''),
      color: b.color ?? '#2563eb',
      items: (b.items ?? []).map((it) => ({
        product_id: it.product_id,
        quantity: Math.max(1, it.quantity ?? 1),
      })),
    });
    setShowForm(true);
  };

  const addItem = () => {
    const first = products[0]?.id ?? '';
    setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: first, quantity: 1 }] }));
  };
  const removeFormItem = (idx: number) =>
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  const patchItem = (idx: number, patch: Partial<BundleItemForm>) =>
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      color: form.color,
      items: form.items
        .filter((it) => it.product_id)
        .map((it) => ({ product_id: it.product_id, quantity: Math.max(1, it.quantity) })),
    };
    try {
      if (editId) {
        await updateBundle.mutate({ id: editId, data: payload });
        push({ tone: 'success', title: t('adminNew.bundles.toasts.updated') });
      } else {
        await createBundle.mutate(payload);
        push({ tone: 'success', title: t('adminNew.bundles.toasts.created') });
      }
      setShowForm(false);
      await bundles.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteBundle.mutate(id);
      push({ tone: 'success', title: t('adminNew.bundles.toasts.deleted') });
      await bundles.refetch();
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
        title={t('adminNew.bundles.title')}
        subtitle={t('adminNew.bundles.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
            {t('adminNew.bundles.new')}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.bundles.title')}
          description={t('adminNew.bundles.subtitle')}
          icon={Layers}
        >
          <AdminTableCard>
            {bundles.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : bundles.error ? (
              <ErrorState message={bundles.error} onRetry={() => void bundles.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.bundles.emptyTitle')}
                message={t('adminNew.bundles.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={640}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.bundles.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.bundles.columns.items')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((b) => (
                    <AdminTableRow key={b.id}>
                      <AdminTableCell>
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="flex items-center gap-2.5 text-left font-semibold text-navy-900 hover:text-marine-700"
                        >
                          <span
                            className="h-4 w-4 shrink-0 rounded-md ring-1 ring-navy-200"
                            style={{ backgroundColor: b.color ?? '#e2e8f0' }}
                          />
                          {b.name}
                        </button>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex flex-wrap gap-1">
                          {(b.items ?? []).length === 0 ? (
                            <span className="text-sm text-navy-400">—</span>
                          ) : (
                            (b.items ?? []).map((it, i) => (
                              <Badge key={`${b.id}-${it.product_id}-${i}`} tone="neutral">
                                {(it.product?.name ?? productName(it.product_id))}
                                {it.quantity && it.quantity > 1 ? ` ×${it.quantity}` : ''}
                              </Badge>
                            ))
                          )}
                        </div>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(b)}>
                            {t('adminNew.common.edit')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleteTarget(b.id)}
                          >
                            {t('adminNew.common.delete')}
                          </Button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showForm} onClose={() => setShowForm(false)} size="md">
        <form onSubmit={onSubmit}>
          <AdminModalHeader
            title={editId ? t('adminNew.bundles.editTitle') : t('adminNew.bundles.new')}
            subtitle={t('adminNew.bundles.formSubtitle')}
          />
          <AdminModalBody>
            <Input
              label={t('adminNew.bundles.fields.name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.bundles.fields.color')}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-navy-200 bg-white p-1"
                  aria-label={t('adminNew.bundles.fields.color')}
                />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className="h-7 w-7 rounded-md ring-1 ring-inset ring-navy-200 transition hover:scale-110"
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.bundles.fields.description')}
              </label>
              <textarea
                className="input-base min-h-20 w-full"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-navy-800">
                  {t('adminNew.bundles.fields.items')}
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="h-3.5 w-3.5" />}
                  disabled={!products.length}
                  onClick={addItem}
                >
                  {t('adminNew.bundles.addItem')}
                </Button>
              </div>
              {form.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-navy-200 bg-sand-50/50 px-3 py-4 text-center text-sm text-navy-500">
                  {t('adminNew.bundles.noItems')}
                </p>
              ) : (
                <div className="space-y-2">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        className="input-base flex-1"
                        value={it.product_id}
                        onChange={(e) => patchItem(idx, { product_id: e.target.value })}
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => patchItem(idx, { quantity: Math.max(1, it.quantity - 1) })}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-navy-200 text-navy-600 hover:bg-sand-50"
                          aria-label="-"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-7 text-center text-sm tabular-nums">{it.quantity}</span>
                        <button
                          type="button"
                          onClick={() => patchItem(idx, { quantity: it.quantity + 1 })}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-navy-200 text-navy-600 hover:bg-sand-50"
                          aria-label="+"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFormItem(idx)}
                        className="rounded-md p-1.5 text-navy-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={t('adminNew.common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createBundle.loading || updateBundle.loading}>
              {t('adminNew.common.save')}
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
        message={t('adminNew.bundles.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Package}
        loading={deleteBundle.loading}
      />
    </>
  );
}
