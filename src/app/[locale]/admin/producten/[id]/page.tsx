'use client';
import { tEnum } from '@/i18n/admin-enums';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  EyeOff,
  History,
  Image as ImageIcon,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Wallet,
  Clock,
} from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import {
  AdminContent,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminSectionCard,
  AdminStatusStrip,
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
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ProductForm } from '@/components/admin/ProductForm';
import { ErrorState, LoadingState } from '@/components/admin/DataState';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { productsService, pricingService } from '@/lib/services';
import type { PricingRule } from '@/lib/api-types';
import {
  formToPayload,
  productPriceExclEuros,
  productPriceInclEuros,
  productToForm,
  type ProductFormState,
} from '@/lib/products';
import { formatCurrency, formatDateTime, intlLocale } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { usePermission } from '@/lib/permissions';

// ── Tariff helpers ────────────────────────────────────────────────────────────

const EMPTY_TARIFF = {
  range_from_m: '',
  range_to_m: '',
  price_incl_vat_euros: '',
  price_excl_vat_euros: '',
  vat_rate: '21',
  price_type: 'fixed',
  channel: 'all',
};
type TariffForm = typeof EMPTY_TARIFF;

function cm(m: string) { return Math.round(parseFloat(m) * 100); }
function eur(cents: number) { return (cents / 100).toFixed(2); }
function centsOf(s: string) { return Math.round(parseFloat(s) * 100); }

function TariffSection({ productId }: { productId: string }) {
  const { t, locale } = useIntl();
  const priceTypes: Record<string, string> = { fixed: t('globalUx.pricing.fixed'), per_meter: t('globalUx.pricing.per_meter'), on_request: t('globalUx.pricing.on_request'), manual: t('globalUx.pricing.manual') };
  const channels: Record<string, string> = { all: t('globalUx.pricing.all'), kassa: t('globalUx.pricing.kassa'), portal: t('globalUx.pricing.portal'), stalling: t('globalUx.pricing.stalling') };
  const { can } = usePermission();
  const canUpdatePricing = can('pricing.update');
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PricingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<TariffForm>(EMPTY_TARIFF);

  const rules = useQuery([productId, 'pricing-rules'], () =>
    pricingService.rules({ product_id: productId, per_page: 100 }),
  );

  const createRule = useMutation((p: Record<string, unknown>) => pricingService.createRule(p));
  const updateRule = useMutation((a: { id: string; data: Record<string, unknown> }) =>
    pricingService.updateRule(a.id, a.data),
  );
  const deleteRule = useMutation((id: string) => pricingService.deleteRule(id));

  const openCreate = () => {
    if (!canUpdatePricing) return;
    setEditTarget(null);
    setForm(EMPTY_TARIFF);
    setOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
    if (!canUpdatePricing) return;
    setEditTarget(rule);
    setForm({
      range_from_m: (rule.range_from_cm / 100).toString(),
      range_to_m: rule.range_to_cm >= 99999 ? '999' : (rule.range_to_cm / 100).toString(),
      price_incl_vat_euros: eur(rule.price_incl_vat),
      price_excl_vat_euros: eur(rule.price_excl_vat),
      vat_rate: '21',
      price_type: rule.price_type ?? 'fixed',
      channel: rule.channel ?? 'all',
    });
    setOpen(true);
  };

  const onSave = async () => {
    if (!canUpdatePricing) return;
    const rangeFrom = cm(form.range_from_m || '0');
    const rangeTo = form.range_to_m === '999' || parseFloat(form.range_to_m) >= 999
      ? 99999
      : cm(form.range_to_m);
    const inclVat = centsOf(form.price_incl_vat_euros);
    const exclVat = form.price_excl_vat_euros
      ? centsOf(form.price_excl_vat_euros)
      : Math.round(inclVat / 1.21);

    try {
      if (editTarget) {
        await updateRule.mutate({
          id: editTarget.id,
          data: {
            range_from_cm: rangeFrom,
            range_to_cm: rangeTo,
            price_incl_vat: inclVat,
            price_excl_vat: exclVat,
            price_type: form.price_type,
            channel: form.channel,
          },
        });
      } else {
        await createRule.mutate({
          product_id: productId,
          range_from_cm: rangeFrom,
          range_to_cm: rangeTo,
          price_incl_vat: inclVat,
          price_excl_vat: exclVat,
          price_type: form.price_type,
          vat_rate: parseFloat(form.vat_rate),
          channel: form.channel,
        });
      }
      push({ tone: 'success', title: t('adminNew.calculator.pricing.saved') });
      setOpen(false);
      void rules.refetch().catch(() => undefined);
    } catch {
      push({ tone: 'error', title: t('adminNew.common.operationFailed') });
    }
  };

  const onDelete = async () => {
    if (!canUpdatePricing || !deleteTarget) return;
    try {
      await deleteRule.mutate(deleteTarget);
      push({ tone: 'success', title: t('adminNew.calculator.pricing.deleted') });
      setDeleteTarget(null);
      void rules.refetch().catch(() => undefined);
    } catch {
      push({ tone: 'error', title: t('adminNew.common.operationFailed') });
    }
  };

  const ruleList: PricingRule[] = (rules.data?.data ?? []).slice().sort(
    (a, b) => a.range_from_cm - b.range_from_cm,
  );
  const busy = createRule.loading || updateRule.loading;

  return (
    <>
      <AdminSectionCard
        title={t('globalUx.pricing.tariffTitle')}
        icon={Tag}
        action={canUpdatePricing ? (
          <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            {t('globalUx.pricing.addTariff')}</Button>
        ) : null}
      >
        {rules.loading ? (
          <p className="text-sm text-navy-500">{t('adminNew.common.loading')}</p>
        ) : rules.error ? (<ErrorState message={rules.error} onRetry={() => void rules.refetch().catch(() => undefined)} />) : ruleList.length === 0 ? (
          <p className="text-sm text-navy-500">{t('globalUx.pricing.emptyTariffs')}</p>
        ) : (
          <AdminTableCard>
            <AdminTable minWidth={500}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>{t('globalUx.pricing.length')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('globalUx.pricing.type')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('globalUx.pricing.exclVat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('globalUx.pricing.inclVat')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('globalUx.pricing.channel')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{t('globalUx.pricing.status')}</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {ruleList.map((rule) => (
                  <AdminTableRow key={rule.id}>
                    <AdminTableCell className="font-mono text-sm">{rule.range_label}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="neutral">{priceTypes[rule.price_type ?? 'fixed'] ?? rule.price_type}</Badge>
                    </AdminTableCell>
                    <AdminTableCell className="font-semibold">
                      {formatCurrency(productPriceExclEuros(rule), intlLocale(locale))}
                    </AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {formatCurrency(productPriceInclEuros(rule), intlLocale(locale))}
                    </AdminTableCell>
                    <AdminTableCell>{channels[rule.channel ?? 'all'] ?? rule.channel}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone={rule.active ? 'success' : 'neutral'}>
                        {rule.active ? t('globalUx.pricing.active') : t('globalUx.pricing.inactive')}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      {canUpdatePricing ? <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(rule)}>
                          {t('adminNew.common.edit')}</Button>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleteTarget(rule.id)}
                          className="text-rose-600 hover:bg-rose-50">
                          {t('adminNew.common.delete')}</Button>
                      </div> : null}
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        )}
      </AdminSectionCard>

      {/* Edit / Create modal */}
      <Modal open={canUpdatePricing && open} onClose={() => setOpen(false)} size="md">
        <form onSubmit={(event) => { event.preventDefault(); void onSave(); }}>
        <AdminModalHeader title={editTarget ? t('globalUx.pricing.editTariff') : t('globalUx.pricing.newTariff')} />
        <AdminModalBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.fromMeters')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                aria-label={t('globalUx.pricing.fromMeters')} value={form.range_from_m}
                onChange={(e) => setForm((f) => ({ ...f, range_from_m: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.toMeters')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                aria-label={t('globalUx.pricing.toMeters')} required value={form.range_to_m}
                onChange={(e) => setForm((f) => ({ ...f, range_to_m: e.target.value }))}
                placeholder="999"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.priceEuro')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                aria-label={t('globalUx.pricing.priceEuro')} required value={form.price_incl_vat_euros}
                onChange={(e) => setForm((f) => ({ ...f, price_incl_vat_euros: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.priceExclOptional')}</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                aria-label={t('globalUx.pricing.priceExclOptional')} value={form.price_excl_vat_euros}
                onChange={(e) => setForm((f) => ({ ...f, price_excl_vat_euros: e.target.value }))}
                placeholder={t('globalUx.pricing.autoVat')}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.type')}</label>
              <SearchSelect
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
                value={form.price_type}
                onChange={(e) => setForm((f) => ({ ...f, price_type: e.target.value }))}
              >
                <option value="fixed">{t('globalUx.pricing.fixed')}</option>
                <option value="per_meter">{t('globalUx.pricing.per_meter')}</option>
                <option value="manual">{t('globalUx.pricing.manual')}</option>
                <option value="on_request">{t('globalUx.pricing.on_request')}</option>
              </SearchSelect>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('globalUx.pricing.channel')}</label>
              <SearchSelect
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
              >
                <option value="all">{t('globalUx.pricing.all')}</option>
                <option value="kassa">{t('globalUx.pricing.kassa')}</option>
                <option value="portal">{t('globalUx.pricing.portal')}</option>
                <option value="stalling">{t('globalUx.pricing.stalling')}</option>
              </SearchSelect>
            </div>
          </div>
        </AdminModalBody>
        <AdminModalFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>{t('adminNew.common.cancel')}</Button>
          <Button variant="gold" type="submit" disabled={busy || !form.range_to_m || !form.price_incl_vat_euros}>
            {busy ? t('globalUx.pricing.saving') : t('adminNew.common.save')}
          </Button>
        </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={canUpdatePricing && !!deleteTarget}
        title={t('globalUx.pricing.deleteTariff')}
        message={t('globalUx.pricing.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        onConfirm={onDelete}
        onClose={() => setDeleteTarget(null)}
        loading={deleteRule.loading}
      />
    </>
  );
}

// ── Product detail ────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-navy-50 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-widest text-navy-400">{label}</dt>
      <dd className="text-sm font-medium text-navy-900 sm:text-right">{value ?? '—'}</dd>
    </div>
  );
}

export default function ProductDetailPage() {
  const { can } = usePermission();
  const canWrite = can('products.write');
  const { locale, t } = useIntl();
  const { push } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = intlLocale(locale);

  const [editing, setEditing] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [form, setForm] = React.useState<ProductFormState | null>(null);
  const [showAi, setShowAi] = React.useState(false);
  const [aiPrompt, setAiPrompt] = React.useState('');

  const product = useQuery([id], () => productsService.get(id));
  const stats = useQuery([id, 'stats'], () => productsService.stats(id).catch(() => null));
  const [auditPage, setAuditPage] = React.useState(1);
  const auditLog = useQuery([id, 'audit', auditPage], () =>
    productsService.auditLog(id, { page: auditPage, per_page: 15 }).catch(() => null)
  );
  const updateProduct = useMutation((payload: Record<string, unknown>) =>
    productsService.update(id, payload)
  );
  const deleteProduct = useMutation(productsService.remove);
  const generateImage = useMutation((prompt: string) =>
    productsService.generateImage(id, { prompt, quality: 'low' })
  );
  // Trello #86: multipart image upload from local device.
  const uploadImage = useMutation((file: File) => {
    const fd = new FormData();
    fd.append('image', file);
    return productsService.uploadImage(id, fd);
  });
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const onUploadImage = async (file: File | undefined) => {
    if (!canWrite) return;
    if (!file) return;
    try {
      await uploadImage.mutate(file);
      await product.refetch();
      push({ tone: 'success', title: t('adminNew.products.ai.uploaded') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onGenerateImage = async () => {
    if (!canWrite) return;
    try {
      await generateImage.mutate(aiPrompt.trim() || `POS tile image for ${product.data?.name ?? 'product'}`);
      setShowAi(false);
      await product.refetch();
      push({ tone: 'success', title: t('adminNew.products.ai.done') });
    } catch (err) {
      push({
        tone: 'error',
        title: t('adminNew.common.operationFailed'),
        message: getApiErrorMessage(err),
      });
    }
  };

  React.useEffect(() => {
    if (product.data) setForm(productToForm(product.data));
  }, [product.data]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;
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
    if (!canWrite) return;
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
    const label = tEnum(t, 'adminNew.products.categories', category);
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
                  <Button disabled={!canWrite}
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
                  {p.group ? (
                    <DetailRow
                      label={t('adminNew.products.fields.productGroup', { defaultValue: 'Productgroep' })}
                      value={
                        <span className="inline-flex items-center gap-2">
                          {p.group.color ? (
                            <span
                              className="h-3.5 w-3.5 shrink-0 rounded-md ring-1 ring-navy-100"
                              style={{ backgroundColor: String(p.group.color) }}
                            />
                          ) : null}
                          <Link
                            href={`/${locale}/admin/product-groepen`}
                            className="font-semibold text-marine-700 hover:text-marine-900"
                          >
                            {String(p.group.name ?? '')}
                          </Link>
                          {p.group.code ? (
                            <span className="font-mono text-xs text-navy-400">{String(p.group.code)}</span>
                          ) : null}
                        </span>
                      }
                    />
                  ) : null}
                  <DetailRow
                    label={t('adminNew.products.columns.category')}
                    value={categoryLabel(p.category)}
                  />
                  <DetailRow label={t('adminNew.products.fields.serviceCode')} value={p.service_code} />
                  <DetailRow
                    label={t('adminNew.products.sections.visibility', { defaultValue: 'Zichtbaarheid' })}
                    value={
                      <span className="flex flex-wrap justify-end gap-1">
                        {([
                          ['show_in_kassa', 'Kassa'],
                          ['show_in_public', 'Website'],
                          ['show_in_calculator', 'Calculator'],
                          ['show_in_booking', 'Boekingen'],
                        ] as [string, string][]).map(([field, label]) => {
                          const raw = p as unknown as Record<string, unknown>;
                          const on = raw[field] !== false;
                          return (
                            <span key={field} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${on ? 'bg-success-50 text-success-700' : 'bg-navy-100 text-navy-400'}`}>
                              {on ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {label}
                            </span>
                          );
                        })}
                      </span>
                    }
                  />
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

              <AdminSectionCard title={t('adminNew.products.ai.imageTitle')} icon={ImageIcon}>
                <div className="overflow-hidden rounded-xl border border-navy-100 bg-sand-50/50">
                  {p.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-navy-300">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void onUploadImage(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="mt-3"
                  leftIcon={<ImageIcon className="h-4 w-4" />}
                  disabled={!canWrite || (uploadImage.loading)}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadImage.loading ? t('adminNew.products.ai.uploading') : t('adminNew.products.ai.upload')}
                </Button>
                <Button disabled={!canWrite}
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="mt-2"
                  leftIcon={<Sparkles className="h-4 w-4" />}
                  onClick={() => {
                    setAiPrompt('');
                    setShowAi(true);
                  }}
                >
                  {t('adminNew.products.ai.generate')}
                </Button>
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.products.statsTitle')} icon={BarChart3}>
                {(() => {
                  // Trello #86: low-stock warning badge.
                  const sd = (stats.data ?? {}) as Record<string, unknown>;
                  const pr = (p ?? {}) as unknown as Record<string, unknown>;
                  const qty = Number(sd.stock_quantity ?? pr.stock_quantity);
                  const min = Number(sd.stock_minimum ?? pr.stock_minimum);
                  const lowStock =
                    sd.stock_low === true ||
                    pr.stock_low === true ||
                    (Number.isFinite(qty) && Number.isFinite(min) && min > 0 && qty <= min);
                  return lowStock ? (
                    <div className="mb-3">
                      <Badge tone="danger">{t('adminNew.products.stats.lowStock')}</Badge>
                    </div>
                  ) : null;
                })()}
                {stats.data ? (
                  <div className="space-y-3">
                    <AdminStatusStrip
                      label={t('adminNew.products.stats.timesSold')}
                      value={String((stats.data as Record<string, unknown>).times_sold ?? 0)}
                      tone="marine"
                    />
                    <AdminStatusStrip
                      label={t('adminNew.products.stats.revenue')}
                      value={formatCurrency(
                        Number((stats.data as Record<string, unknown>).revenue_incl_vat ?? (stats.data as Record<string, unknown>).revenue_cents ?? 0) / 100,
                        dateLocale
                      )}
                      tone="gold"
                    />
                    {(stats.data as Record<string, unknown>).margin_cents != null ? (
                      <AdminStatusStrip
                        label={t('adminNew.products.stats.margin')}
                        value={`${formatCurrency(
                          Number((stats.data as Record<string, unknown>).margin_cents ?? 0) / 100,
                          dateLocale
                        )}${
                          (stats.data as Record<string, unknown>).margin_percent != null
                            ? ` · ${Number((stats.data as Record<string, unknown>).margin_percent).toFixed(1)}%`
                            : ''
                        }`}
                        tone="success"
                      />
                    ) : null}
                    <AdminStatusStrip
                      label={t('adminNew.products.stats.lastSale')}
                      value={
                        (stats.data as Record<string, unknown>).last_sale_date
                          ? formatDateTime(
                              String((stats.data as Record<string, unknown>).last_sale_date),
                              dateLocale
                            )
                          : '—'
                      }
                      tone="navy"
                    />
                  </div>
                ) : (
                  <p className="text-sm text-navy-500">{t('adminNew.products.stats.empty')}</p>
                )}
              </AdminSectionCard>

              <AdminSectionCard title={t('adminNew.products.metaTitle')} icon={Clock}>
                <dl>
                  <DetailRow label={t('adminNew.products.fields.created')} value={formatDateTime(p.created_at, dateLocale)} />
                  <DetailRow label={t('adminNew.products.fields.updated')} value={formatDateTime(p.updated_at, dateLocale)} />
                </dl>
                <Button disabled={!canWrite}
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

        {p && !editing ? <TariffSection productId={id} /> : null}

        {p && !editing && auditLog.data && auditLog.data.data.length > 0 ? (
          <AdminSectionCard
            title={t('adminNew.products.auditLog', { defaultValue: 'Wijzigingslog' })}
            icon={History}
          >
            <AdminTableCard footer={
              <AdminTableFooter
                summary={`${auditLog.data.meta?.total ?? auditLog.data.data.length} wijzigingen`}
                meta={auditLog.data.meta}
                onPageChange={setAuditPage}
              />
            }>
              <AdminTable minWidth={600}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.auditLog.columns.field', { defaultValue: 'Veld' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.auditLog.columns.oldValue', { defaultValue: 'Oud' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.auditLog.columns.newValue', { defaultValue: 'Nieuw' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.auditLog.columns.user', { defaultValue: 'Door' })}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.auditLog.columns.at', { defaultValue: 'Datum' })}</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {auditLog.data.data.map((entry) => {
                    const changeRows = Array.isArray(entry.changes)
                      ? (entry.changes as Array<{ field_name?: string; old_value?: unknown; new_value?: unknown }>).map((change) => ({
                          field: String(change.field_name ?? ''),
                          oldValue: change.old_value,
                          newValue: change.new_value,
                        }))
                      : Object.keys((entry.changes ?? entry.new_values ?? {}) as Record<string, unknown>).map((field) => ({
                          field,
                          oldValue: (entry.old_values as Record<string, unknown> | undefined)?.[field],
                          newValue: ((entry.changes ?? entry.new_values ?? {}) as Record<string, unknown>)[field],
                        }));
                    if (changeRows.length === 0) {
                      return (
                        <AdminTableRow key={String(entry.id)}>
                          <AdminTableCell className="font-mono text-xs text-navy-500">{String(entry.title ?? entry.action ?? entry.event ?? 'update')}</AdminTableCell>
                          <AdminTableCell>—</AdminTableCell>
                          <AdminTableCell>—</AdminTableCell>
                          <AdminTableCell className="text-xs">{String((entry.user as Record<string, unknown>)?.name ?? entry.user_id ?? '—')}</AdminTableCell>
                          <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(String(entry.created_at ?? ''), dateLocale)}</AdminTableCell>
                        </AdminTableRow>
                      );
                    }
                    return changeRows.map((change, i) => (
                      <AdminTableRow key={`${String(entry.id)}-${change.field}`}>
                        <AdminTableCell className="font-mono text-xs">{change.field}</AdminTableCell>
                        <AdminTableCell className="max-w-[160px] truncate text-xs text-navy-500">{change.oldValue == null ? '—' : String(change.oldValue)}</AdminTableCell>
                        <AdminTableCell className="max-w-[160px] truncate text-xs text-navy-900">{change.newValue == null ? '—' : String(change.newValue)}</AdminTableCell>
                        {i === 0 ? (
                          <>
                            <AdminTableCell className="text-xs">{String((entry.user as Record<string, unknown>)?.name ?? entry.user_id ?? '—')}</AdminTableCell>
                            <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(String(entry.created_at ?? ''), dateLocale)}</AdminTableCell>
                          </>
                        ) : (
                          <>
                            <AdminTableCell>{''}</AdminTableCell>
                            <AdminTableCell>{''}</AdminTableCell>
                          </>
                        )}
                      </AdminTableRow>
                    ));
                  })}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          </AdminSectionCard>
        ) : null}

        {p && editing && form ? (
          <form onSubmit={onSave}>
            <AdminSectionCard title={t('adminNew.products.modal.editTitle')} icon={Package}>
              <ProductForm form={form} onChange={setForm} isEdit productId={id} />
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

      <Modal open={showAi && canWrite} onClose={() => setShowAi(false)} size="md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onGenerateImage();
          }}
        >
          <AdminModalHeader
            title={t('adminNew.products.ai.generate')}
            subtitle={t('adminNew.products.ai.subtitle')}
          />
          <AdminModalBody>
            <Input
              label={t('adminNew.products.ai.prompt')}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={p ? `POS tile image for ${p.name}` : ''}
            />
            <p className="text-xs text-navy-400">{t('adminNew.products.ai.hint')}</p>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowAi(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={generateImage.loading}>
              {generateImage.loading ? t('adminNew.products.ai.generating') : t('adminNew.products.ai.generate')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={deleteOpen && canWrite}
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
