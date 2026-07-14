'use client';

import * as React from 'react';
import { Archive, Layers, Plus, Trash2 } from 'lucide-react';
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
import { productGroupsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

type Group = Record<string, unknown>;

const PRESET_COLORS = [
  '#2563eb', '#0ea5e9', '#059669', '#d97706',
  '#dc2626', '#7c3aed', '#475569', '#0f172a',
];

// Trello #80/#86: pick the group icon from a known Lucide set (resolved in the
// kassa via `import * as LucideIcons`), instead of free-text.
const ICON_OPTIONS = [
  'Anchor', 'Ship', 'Wrench', 'Package', 'Fuel', 'ShoppingCart', 'Star', 'Zap',
  'Droplet', 'Droplets', 'Warehouse', 'Waves', 'LifeBuoy', 'Sailboat', 'Container',
  'Wind', 'Sparkles', 'Tag', 'Box', 'Hammer', 'Cog', 'PaintRoller',
];

const emptyForm = {
  code: '',
  name: '',
  color: '#2563eb',
  icon: '',
  description: '',
  default_vat_rate: '21',
  vat_code: '',
  revenue_account: '',
  cost_center: '',
  profit_center: '',
  sort_order: '0',
  active: true,
  // Trello #100: public-facing group fields
  slug: '',
  public_description: '',
  is_public: false,
};

export default function ProductGroupsPage() {
  const { t } = useIntl();
  const { push } = useToast();
  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const groups = useQuery(['product-groups'], () => productGroupsService.list());
  const createGroup = useMutation((payload: Record<string, unknown>) =>
    productGroupsService.create(payload)
  );
  const updateGroup = useMutation((p: { id: string; data: Record<string, unknown> }) =>
    productGroupsService.update(p.id, p.data)
  );
  const deleteGroup = useMutation((id: string) => productGroupsService.remove(id));
  const archiveGroup = useMutation((id: string) => productGroupsService.archive(id));

  const rows = (groups.data ?? []) as Group[];

  const str = (g: Group, k: string) => (g[k] == null ? '' : String(g[k]));

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (g: Group) => {
    setEditId(String(g.id));
    setForm({
      code: str(g, 'code'),
      name: str(g, 'name'),
      color: str(g, 'color') || str(g, 'display_color') || '#2563eb',
      icon: str(g, 'icon') || str(g, 'display_icon'),
      description: str(g, 'description'),
      default_vat_rate: str(g, 'default_vat_rate') || '21',
      vat_code: str(g, 'vat_code'),
      revenue_account: str(g, 'revenue_account'),
      cost_center: str(g, 'cost_center'),
      profit_center: str(g, 'profit_center'),
      sort_order: str(g, 'sort_order') || '0',
      active: g.active !== false,
      slug: str(g, 'slug'),
      public_description: str(g, 'public_description'),
      is_public: g.is_public === true,
    });
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      code: form.code,
      name: form.name,
      color: form.color,
      icon: form.icon || null,
      description: form.description || null,
      default_vat_rate: form.default_vat_rate ? Number(form.default_vat_rate) : null,
      vat_code: form.vat_code || null,
      revenue_account: form.revenue_account || null,
      cost_center: form.cost_center || null,
      profit_center: form.profit_center || null,
      sort_order: form.sort_order ? Number(form.sort_order) : 0,
      active: form.active,
      // Trello #100: public-facing fields
      slug: form.slug.trim() || null,
      public_description: form.public_description.trim() || null,
      is_public: form.is_public,
    };
    try {
      if (editId) {
        await updateGroup.mutate({ id: editId, data: payload });
        push({ tone: 'success', title: t('adminNew.productGroups.toasts.updated') });
      } else {
        await createGroup.mutate(payload);
        push({ tone: 'success', title: t('adminNew.productGroups.toasts.created') });
      }
      setShowForm(false);
      await groups.refetch();
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onArchive = async (id: string) => {
    try {
      await archiveGroup.mutate(id);
      push({ tone: 'success', title: t('adminNew.productGroups.toasts.archived') });
      await groups.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteGroup.mutate(id);
      push({ tone: 'success', title: t('adminNew.productGroups.toasts.deleted') });
      await groups.refetch();
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
        title={t('adminNew.productGroups.title')}
        subtitle={t('adminNew.productGroups.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
            {t('adminNew.productGroups.new')}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.productGroups.title')}
          description={t('adminNew.productGroups.subtitle')}
          icon={Layers}
        >
          <AdminTableCard>
            {groups.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : groups.error ? (
              <ErrorState message={groups.error} onRetry={() => void groups.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.productGroups.emptyTitle')}
                message={t('adminNew.productGroups.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={760}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.productGroups.columns.group')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.productGroups.columns.code')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.productGroups.columns.vat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.productGroups.columns.products', { defaultValue: 'Producten' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.productGroups.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((g) => {
                    const color = str(g, 'color') || str(g, 'display_color') || '#e2e8f0';
                    return (
                      <AdminTableRow key={String(g.id)}>
                        <AdminTableCell>
                          <button
                            type="button"
                            onClick={() => openEdit(g)}
                            className="flex items-center gap-2.5 text-left font-semibold text-navy-900 hover:text-marine-700"
                          >
                            <span
                              className="h-4 w-4 shrink-0 rounded-md ring-1 ring-navy-200"
                              style={{ backgroundColor: color }}
                            />
                            {str(g, 'name') || str(g, 'code')}
                          </button>
                          {str(g, 'description') ? (
                            <div className="mt-0.5 line-clamp-1 text-xs text-navy-500">
                              {str(g, 'description')}
                            </div>
                          ) : null}
                        </AdminTableCell>
                        <AdminTableCell className="font-mono text-xs">{str(g, 'code') || '—'}</AdminTableCell>
                        <AdminTableCell className="text-sm text-navy-600">
                          {str(g, 'vat_code') ||
                            (str(g, 'default_vat_rate') ? `${str(g, 'default_vat_rate')}%` : '—')}
                        </AdminTableCell>
                        <AdminTableCell className="text-sm tabular-nums text-navy-700">
                          {g.products_count != null ? String(g.products_count) : '—'}
                        </AdminTableCell>
                        <AdminTableCell>
                          <Badge tone={g.active === false ? 'neutral' : 'success'}>
                            {g.active === false
                              ? t('adminNew.productGroups.inactive')
                              : t('adminNew.productGroups.active')}
                          </Badge>
                        </AdminTableCell>
                        <AdminTableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(g)}>
                              {t('adminNew.common.edit')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Archive className="h-3.5 w-3.5" />}
                              disabled={archiveGroup.loading}
                              onClick={() => void onArchive(String(g.id))}
                            >
                              {t('adminNew.productGroups.archive')}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                              onClick={() => setDeleteTarget(String(g.id))}
                            >
                              {t('adminNew.common.delete')}
                            </Button>
                          </div>
                        </AdminTableCell>
                      </AdminTableRow>
                    );
                  })}
                </tbody>
              </AdminTable>
            )}
          </AdminTableCard>
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showForm} onClose={() => setShowForm(false)} size="md">
        <form onSubmit={onSubmit}>
          <AdminModalHeader
            title={editId ? t('adminNew.productGroups.editTitle') : t('adminNew.productGroups.new')}
            subtitle={t('adminNew.productGroups.formSubtitle')}
          />
          <AdminModalBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('adminNew.productGroups.fields.code')}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
              <Input
                label={t('adminNew.productGroups.fields.name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.productGroups.fields.color')}
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border border-navy-200 bg-white p-1"
                  aria-label={t('adminNew.productGroups.fields.color')}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.productGroups.fields.icon')}
                </label>
                <select
                  className="input-base w-full"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                >
                  <option value="">{t('adminNew.productGroups.fields.iconNone')}</option>
                  {ICON_OPTIONS.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label={t('adminNew.productGroups.fields.sortOrder')}
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('adminNew.productGroups.fields.vatRate')}
                type="number"
                value={form.default_vat_rate}
                onChange={(e) => setForm({ ...form, default_vat_rate: e.target.value })}
              />
              <Input
                label={t('adminNew.productGroups.fields.vatCode')}
                value={form.vat_code}
                onChange={(e) => setForm({ ...form, vat_code: e.target.value })}
                placeholder="BTW21"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                label={t('adminNew.productGroups.fields.revenueAccount')}
                value={form.revenue_account}
                onChange={(e) => setForm({ ...form, revenue_account: e.target.value })}
                placeholder="8000"
              />
              <Input
                label={t('adminNew.productGroups.fields.costCenter')}
                value={form.cost_center}
                onChange={(e) => setForm({ ...form, cost_center: e.target.value })}
                placeholder="WERF"
              />
              <Input
                label={t('adminNew.productGroups.fields.profitCenter')}
                value={form.profit_center}
                onChange={(e) => setForm({ ...form, profit_center: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-navy-800">
                {t('adminNew.productGroups.fields.description')}
              </label>
              <textarea
                className="input-base min-h-20 w-full"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Trello #100: public-facing settings */}
            <div className="rounded-xl border border-navy-100 bg-sand-50/40 p-3">
              <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-navy-400">
                {t('adminNew.productGroups.fields.publicSection')}
              </h4>
              <label className="mb-3 flex items-center gap-2 text-sm text-navy-800">
                <input
                  type="checkbox"
                  checked={form.is_public}
                  onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
                  className="h-4 w-4 rounded border-navy-300"
                />
                {t('adminNew.productGroups.fields.isPublic')}
              </label>
              <Input
                label={t('adminNew.productGroups.fields.slug')}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="winterstalling"
              />
              <div className="mt-3">
                <label className="mb-1.5 block text-sm font-medium text-navy-800">
                  {t('adminNew.productGroups.fields.publicDescription')}
                </label>
                <textarea
                  className="input-base min-h-20 w-full"
                  value={form.public_description}
                  onChange={(e) => setForm({ ...form, public_description: e.target.value })}
                  placeholder={t('adminNew.productGroups.fields.publicDescriptionPlaceholder')}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-navy-800">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="h-4 w-4 rounded border-navy-300"
              />
              {t('adminNew.productGroups.fields.active')}
            </label>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createGroup.loading || updateGroup.loading}>
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
        message={t('adminNew.productGroups.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Trash2}
        loading={deleteGroup.loading}
      />
    </>
  );
}
