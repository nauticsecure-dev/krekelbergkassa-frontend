'use client';

import * as React from 'react';
import Link from 'next/link';
import { LayoutGrid, List, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminSearchInput,
  AdminSelect,
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
import { Badge } from '@/components/ui/Badge';
import { productsService, productGroupsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency } from '@/lib/format';
import { productPriceInclEuros } from '@/lib/products';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ProductsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [groupFilter, setGroupFilter] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [view, setView] = React.useState<'table' | 'grid'>('table');

  const products = useQuery([query, groupFilter, page], () =>
    productsService.list({
      search: query || undefined,
      product_group_id: groupFilter || undefined,
      page,
      per_page: view === 'grid' ? 48 : 20,
    })
  );
  const groups = useQuery(['product-groups-list'], () => productGroupsService.list({ per_page: 100 }));
  const deleteProduct = useMutation(productsService.remove);

  const rows = products.data?.data ?? [];
  const groupRows = (groups.data as { data?: Array<Record<string, unknown>> })?.data
    ?? (Array.isArray(groups.data) ? (groups.data as Array<Record<string, unknown>>) : []);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const categoryLabel = (category: string | null | undefined) => {
    if (!category) return '—';
    const key = `adminNew.products.categories.${category}`;
    const label = t(key);
    return label === key ? category : label;
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
        message: getApiErrorMessage(err),
      });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.products.title')}
        subtitle={t('adminNew.products.subtitle')}
        rightSlot={
          <Link href={`/${locale}/admin/producten/nieuw`}>
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />}>
              {t('adminNew.products.new')}
            </Button>
          </Link>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.products.title')}
          description={t('adminNew.products.subtitle')}
          icon={Package}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AdminSearchInput
              placeholder={t('adminNew.products.searchPlaceholder')}
              value={query}
              onChange={(value) => { setQuery(value); setPage(1); }}
              className="flex-1"
            />
            <div className="w-48">
              <AdminSelect
                value={groupFilter}
                onChange={(v) => { setGroupFilter(v); setPage(1); }}
              >
                <option value="">{t('adminNew.products.allGroups', { defaultValue: 'Alle groepen' })}</option>
                {groupRows.map((g) => (
                  <option key={String(g.id)} value={String(g.id)}>
                    {String(g.name)}
                  </option>
                ))}
              </AdminSelect>
            </div>
            <div className="flex rounded-lg border border-navy-200 bg-white">
              <button
                type="button"
                onClick={() => setView('table')}
                className={`flex items-center gap-1.5 rounded-l-lg px-3 py-2 text-xs font-semibold transition ${view === 'table' ? 'bg-marine-600 text-white' : 'text-navy-500 hover:text-navy-800'}`}
              >
                <List className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setView('grid')}
                className={`flex items-center gap-1.5 rounded-r-lg px-3 py-2 text-xs font-semibold transition ${view === 'grid' ? 'bg-marine-600 text-white' : 'text-navy-500 hover:text-navy-800'}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {products.loading ? (
            <LoadingState label={t('adminNew.products.loading')} />
          ) : products.error ? (
            <ErrorState message={products.error} onRetry={() => void products.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title={t('adminNew.products.emptyTitle')} message={t('adminNew.products.emptyMessage')} />
          ) : view === 'grid' ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {rows.map((row) => {
                  const accentColor = row.color ?? row.group?.color ?? '#e2e8f0';
                  return (
                    <Link
                      key={row.id}
                      href={`/${locale}/admin/producten/${row.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-xl border border-navy-100 bg-white shadow-sm transition hover:shadow-md"
                    >
                      <div
                        className="h-1 w-full shrink-0"
                        style={{ backgroundColor: accentColor }}
                      />
                      {row.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.image_url}
                          alt={row.name}
                          className="aspect-square w-full object-cover"
                        />
                      ) : (
                        <div
                          className="flex aspect-square w-full items-center justify-center bg-sand-50 text-navy-200"
                          style={{ borderBottom: `2px solid ${accentColor}20` }}
                        >
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                      <div className="flex flex-1 flex-col gap-1 p-2.5">
                        <div className="line-clamp-2 text-xs font-semibold text-navy-900 leading-tight">
                          {row.name}
                        </div>
                        {row.group?.name ? (
                          <div className="text-[10px] text-navy-400">{String(row.group.name)}</div>
                        ) : null}
                        <div className="mt-auto pt-1 text-xs font-bold text-marine-700">
                          {formatCurrency(productPriceInclEuros(row), dateLocale)}
                        </div>
                      </div>
                      {!row.active ? (
                        <div className="absolute right-1.5 top-2.5">
                          <Badge tone="neutral" className="text-[10px]">{t('adminNew.products.inactive')}</Badge>
                        </div>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
              <div className="mt-4">
                <AdminTableFooter
                  summary={t('adminNew.products.total', { count: products.data?.meta?.total ?? rows.length })}
                  meta={products.data?.meta}
                  onPageChange={setPage}
                />
              </div>
            </>
          ) : (
            <AdminTableCard>
              <AdminTable>
                <AdminTableHead>
                  <AdminTableRow>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.name')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.code')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.fields.productGroup', { defaultValue: 'Groep' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.category')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.price')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.products.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                  </AdminTableRow>
                </AdminTableHead>
                <tbody>
                  {rows.map((row) => (
                    <AdminTableRow key={row.id}>
                      <AdminTableCell>
                        <Link
                          href={`/${locale}/admin/producten/${row.id}`}
                          className="flex items-center gap-2 font-semibold text-marine-700 hover:text-marine-800"
                        >
                          <span
                            className="h-3 w-3 shrink-0 rounded-full ring-1 ring-navy-100"
                            style={{ backgroundColor: row.color ?? row.group?.color ?? '#e2e8f0' }}
                          />
                          {row.name}
                        </Link>
                        {row.description ? (
                          <div className="mt-0.5 line-clamp-1 text-xs text-navy-500">{row.description}</div>
                        ) : null}
                      </AdminTableCell>
                      <AdminTableCell className="font-mono text-xs">{row.code}</AdminTableCell>
                      <AdminTableCell>
                        {row.group?.name ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-navy-700">
                            {row.group?.color ? (
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: String(row.group.color) }} />
                            ) : null}
                            {String(row.group.name)}
                          </span>
                        ) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>
                        {row.category ? (
                          <Badge tone="neutral">{categoryLabel(row.category)}</Badge>
                        ) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>{formatCurrency(productPriceInclEuros(row), dateLocale)}</AdminTableCell>
                      <AdminTableCell>
                        <Badge tone={row.active ? 'success' : 'neutral'}>
                          {row.active ? t('adminNew.products.active') : t('adminNew.products.inactive')}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex justify-end gap-1">
                          <Link href={`/${locale}/admin/producten/${row.id}`}>
                            <Button size="sm" variant="ghost" leftIcon={<Pencil className="h-3.5 w-3.5" />}>
                              {t('adminNew.common.view')}
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setDeleteTarget(row.id)}
                          >
                            {t('adminNew.common.delete')}
                          </Button>
                        </div>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
              <AdminTableFooter
                summary={t('adminNew.products.total', { count: products.data?.meta?.total ?? rows.length })}
                meta={products.data?.meta}
                onPageChange={setPage}
              />
            </AdminTableCard>
          )}
        </AdminSectionCard>
      </AdminContent>

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
