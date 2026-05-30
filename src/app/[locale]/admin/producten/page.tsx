'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, Package, Pencil } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
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
import { Badge } from '@/components/ui/Badge';
import { productsService } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { EmptyState, ErrorState, LoadingState } from '@/components/admin/DataState';
import { useIntl } from '@/i18n/IntlProvider';
import { formatCurrency } from '@/lib/format';
import { productPriceInclEuros } from '@/lib/products';
import { Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function ProductsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [query, setQuery] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const products = useQuery([query, page], () =>
    productsService.list({ search: query || undefined, page, per_page: 20 })
  );
  const deleteProduct = useMutation(productsService.remove);

  const rows = products.data?.data ?? [];
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
                      <AdminTableHeaderCell>{t('adminNew.products.columns.name')}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{t('adminNew.products.columns.code')}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{t('adminNew.products.columns.category')}</AdminTableHeaderCell>
                      <AdminTableHeaderCell>{t('adminNew.products.fields.serviceCode')}</AdminTableHeaderCell>
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
                          {row.category ? (
                            <Badge tone="neutral">{categoryLabel(row.category)}</Badge>
                          ) : '—'}
                        </AdminTableCell>
                        <AdminTableCell className="text-xs text-navy-600">{row.service_code ?? '—'}</AdminTableCell>
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
              </>
            )}
          </AdminTableCard>
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
