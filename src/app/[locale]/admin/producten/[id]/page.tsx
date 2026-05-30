'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Package,
  Pencil,
  ShoppingCart,
  Tag,
  Trash2,
  Wallet,
  Clock,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminSectionCard,
  AdminStatusStrip,
} from '@/components/admin/AdminUi';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductForm } from '@/components/admin/ProductForm';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { productsService } from '@/lib/services';
import {
  formToPayload,
  productPriceExclEuros,
  productPriceInclEuros,
  productToForm,
  type ProductFormState,
} from '@/lib/products';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-navy-50 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-widest text-navy-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 sm:text-right">{value ?? '—'}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [editing, setEditing] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormState | null>(null);

  const product = useQuery([id], () => productsService.get(id));
  const updateProduct = useMutation((payload: Record<string, unknown>) =>
    productsService.update(id, payload)
  );
  const deleteProduct = useMutation(productsService.remove);

  React.useEffect(() => {
    if (product.data) setForm(productToForm(product.data));
  }, [product.data]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    try {
      await updateProduct.mutate(formToPayload(form));
      setEditing(false);
      await product.refetch();
      push({ tone: 'success', title: t('adminNew.products.toasts.updated') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const onDelete = async () => {
    try {
      await deleteProduct.mutate(id);
      push({ tone: 'success', title: t('adminNew.products.toasts.deleted') });
      router.push(`/${locale}/admin/producten`);
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.products.toasts.deleteFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  const p = product.data;

  const categoryLabel = (category: string | null | undefined) => {
    if (!category) return '—';
    const key = `adminNew.products.categories.${category}`;
    const label = t(key);
    return label === key ? category : label;
  };

  return (
    <>
      <AdminPageHeader
        title={p?.name ?? t('adminNew.products.detailTitle')}
        subtitle={p?.code ?? t('adminNew.common.loading')}
        rightSlot={
          <div className="flex flex-wrap gap-2">
            <Link href={`/${locale}/admin/producten`}>
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.products.backToList')}
              </Button>
            </Link>
            {p ? (
              <>
                <Link href={`/${locale}/admin/kassa`}>
                  <Button variant="outline" size="sm" leftIcon={<ShoppingCart className="h-4 w-4" />}>
                    {t('adminNew.products.openInKassa')}
                  </Button>
                </Link>
                {!editing ? (
                  <Button
                    variant="gold"
                    size="sm"
                    leftIcon={<Pencil className="h-4 w-4" />}
                    onClick={() => setEditing(true)}
                  >
                    {t('adminNew.common.edit')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />

      <AdminContent>
        {product.loading ? <LoadingState label={t('adminNew.products.loading')} variant="detail" /> : null}
        {product.error ? (
          <ErrorState message={product.error} onRetry={() => void product.refetch()} />
        ) : null}

        {p && !editing ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="space-y-5 lg:col-span-2">
              <AdminSectionCard title={t('adminNew.products.sections.identity')} icon={Package}>
                <div
                  className="mb-4 rounded-xl border border-navy-100 p-4"
                  style={{
                    borderLeftWidth: 4,
                    borderLeftColor: p.color ?? p.group?.color ?? '#cbd5e1',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-navy-900">{p.name}</h2>
                      <p className="mt-1 font-mono text-sm text-navy-500">{p.code}</p>
                    </div>
                    <Badge tone={p.active ? 'success' : 'neutral'}>
                      {p.active ? t('adminNew.products.active') : t('adminNew.products.inactive')}
                    </Badge>
                  </div>
                  {p.description ? (
                    <p className="mt-3 text-sm leading-relaxed text-navy-600">{p.description}</p>
                  ) : null}
                </div>

                <dl>
                  <DetailRow
                    label={t('adminNew.products.columns.category')}
                    value={categoryLabel(p.category)}
                  />
                  <DetailRow label={t('adminNew.products.fields.serviceCode')} value={p.service_code} />
                  <DetailRow
                    label={t('adminNew.products.fields.tags')}
                    value={
                      p.tags?.length ? (
                        <span className="flex flex-wrap justify-end gap-1">
                          {p.tags.map((tag) => (
                            <Badge key={tag} tone="neutral">
                              {tag}
                            </Badge>
                          ))}
                        </span>
                      ) : '—'
                    }
                  />
                  <DetailRow label={t('adminNew.products.fields.aliases')} value={p.aliases?.join(', ') ?? '—'} />
                </dl>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.products.sections.pos')} icon={Tag}>
                <dl>
                  <DetailRow label={t('adminNew.products.fields.barcode')} value={p.barcode} />
                  <DetailRow label={t('adminNew.products.fields.searchCode')} value={p.search_code} />
                  <DetailRow label={t('adminNew.products.fields.sku')} value={p.sku} />
                  <DetailRow label={t('adminNew.products.fields.supplier')} value={p.supplier} />
                  <DetailRow
                    label={t('adminNew.products.fields.color')}
                    value={
                      p.color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-full ring-1 ring-navy-100"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.color}
                        </span>
                      ) : '—'
                    }
                  />
                </dl>
              </AdminSectionCard>
            </div>

            <div className="space-y-5">
              <AdminSectionCard title={t('adminNew.products.sections.pricing')} icon={Wallet}>
                <div className="space-y-3">
                  <AdminStatusStrip
                    label={t('adminNew.products.fields.priceExcl')}
                    value={formatCurrency(productPriceExclEuros(p), dateLocale)}
                    tone="navy"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.products.fields.priceIncl')}
                    value={formatCurrency(productPriceInclEuros(p), dateLocale)}
                    tone="gold"
                  />
                  <AdminStatusStrip
                    label={t('adminNew.products.columns.vat')}
                    value={`${p.vat_rate}%`}
                    tone="marine"
                  />
                </div>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.products.metaTitle')} icon={Clock}>
                <dl>
                  <DetailRow label={t('adminNew.products.fields.created')} value={formatDateTime(p.created_at, dateLocale)} />
                  <DetailRow label={t('adminNew.products.fields.updated')} value={formatDateTime(p.updated_at, dateLocale)} />
                </dl>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-rose-600 hover:text-rose-700"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => setDeleteOpen(true)}
                >
                  {t('adminNew.common.delete')}
                </Button>
              </AdminSectionCard>
            </div>
          </div>
        ) : null}

        {p && editing && form ? (
          <form onSubmit={onSave}>
            <AdminSectionCard title={t('adminNew.products.modal.editTitle')} icon={Package}>
              <ProductForm form={form} onChange={setForm} isEdit />
              <div className="mt-6 flex justify-end gap-2 border-t border-navy-100 pt-4">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setForm(productToForm(p));
                  }}
                >
                  {t('adminNew.common.cancel')}
                </Button>
                <Button type="submit" variant="gold" disabled={updateProduct.loading}>
                  {t('adminNew.common.save')}
                </Button>
              </div>
            </AdminSectionCard>
          </form>
        ) : null}
      </AdminContent>

      <AdminConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={onDelete}
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
