'use client';

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
import { formatCurrency, formatDateTime } from '@/lib/format';
import { getApiErrorMessage } from '@/lib/api-error';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';

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
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editTarget, setEditTarget] = React.useState<PricingRule | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<TariffForm>(EMPTY_TARIFF);

  const rules = useQuery([productId, 'pricing-rules'], () =>
    pricingService.rules({ product_id: productId, per_page: 100 }).catch(() => null),
  );

  const createRule = useMutation((p: Record<string, unknown>) => pricingService.createRule(p));
  const updateRule = useMutation((a: { id: string; data: Record<string, unknown> }) =>
    pricingService.updateRule(a.id, a.data),
  );
  const deleteRule = useMutation((id: string) => pricingService.deleteRule(id));

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_TARIFF);
    setOpen(true);
  };

  const openEdit = (rule: PricingRule) => {
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
      push({ tone: 'success', title: 'Tarief opgeslagen' });
      setOpen(false);
      void rules.refetch();
    } catch {
      push({ tone: 'error', title: 'Opslaan mislukt' });
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRule.mutate(deleteTarget);
      push({ tone: 'success', title: 'Tarief verwijderd' });
      setDeleteTarget(null);
      void rules.refetch();
    } catch {
      push({ tone: 'error', title: 'Verwijderen mislukt' });
    }
  };

  const ruleList: PricingRule[] = (rules.data?.data ?? []).slice().sort(
    (a, b) => a.range_from_cm - b.range_from_cm,
  );
  const busy = createRule.loading || updateRule.loading;

  return (
    <>
      <AdminSectionCard
        title="Tarieven per lengteklasse"
        icon={Tag}
        action={
          <Button variant="outline" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            Tarief toevoegen
          </Button>
        }
      >
        {rules.loading ? (
          <p className="text-sm text-navy-500">Laden…</p>
        ) : ruleList.length === 0 ? (
          <p className="text-sm text-navy-500">{'Geen tarieven gevonden. Klik op "Tarief toevoegen".'}</p>
        ) : (
          <AdminTableCard>
            <AdminTable minWidth={500}>
              <AdminTableHead>
                <tr>
                  <AdminTableHeaderCell>Lengte</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Type</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Excl. BTW</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Incl. BTW</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Kanaal</AdminTableHeaderCell>
                  <AdminTableHeaderCell>Status</AdminTableHeaderCell>
                  <AdminTableHeaderCell>{''}</AdminTableHeaderCell>
                </tr>
              </AdminTableHead>
              <tbody>
                {ruleList.map((rule) => (
                  <AdminTableRow key={rule.id}>
                    <AdminTableCell className="font-mono text-sm">{rule.range_label}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone="neutral">{rule.price_type ?? 'fixed'}</Badge>
                    </AdminTableCell>
                    <AdminTableCell className="font-semibold">
                      {rule.price_excl_vat_euros != null
                        ? `€ ${rule.price_excl_vat_euros.toFixed(2)}`
                        : `€ ${eur(rule.price_excl_vat)}`}
                    </AdminTableCell>
                    <AdminTableCell className="font-semibold text-navy-900">
                      {rule.price_incl_vat_euros != null
                        ? `€ ${rule.price_incl_vat_euros.toFixed(2)}`
                        : `€ ${eur(rule.price_incl_vat)}`}
                    </AdminTableCell>
                    <AdminTableCell>{rule.channel}</AdminTableCell>
                    <AdminTableCell>
                      <Badge tone={rule.active ? 'success' : 'neutral'}>
                        {rule.active ? 'Actief' : 'Inactief'}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" leftIcon={<Pencil className="h-3.5 w-3.5" />} onClick={() => openEdit(rule)}>
                          Bewerk
                        </Button>
                        <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setDeleteTarget(rule.id)}
                          className="text-rose-600 hover:bg-rose-50">
                          Verwijder
                        </Button>
                      </div>
                    </AdminTableCell>
                  </AdminTableRow>
                ))}
              </tbody>
            </AdminTable>
          </AdminTableCard>
        )}
      </AdminSectionCard>

      {/* Edit / Create modal */}
      <Modal open={open} onClose={() => setOpen(false)} size="md">
        <AdminModalHeader title={editTarget ? 'Tarief bewerken' : 'Nieuw tarief'} />
        <AdminModalBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Van (meter)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.range_from_m}
                onChange={(e) => setForm((f) => ({ ...f, range_from_m: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Tot (meter, 999 = onbeperkt)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.range_to_m}
                onChange={(e) => setForm((f) => ({ ...f, range_to_m: e.target.value }))}
                placeholder="999"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Prijs incl. BTW (€)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price_incl_vat_euros}
                onChange={(e) => setForm((f) => ({ ...f, price_incl_vat_euros: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Prijs excl. BTW (€, optioneel)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price_excl_vat_euros}
                onChange={(e) => setForm((f) => ({ ...f, price_excl_vat_euros: e.target.value }))}
                placeholder="auto (incl ÷ 1.21)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Type</label>
              <select
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
                value={form.price_type}
                onChange={(e) => setForm((f) => ({ ...f, price_type: e.target.value }))}
              >
                <option value="fixed">Vast bedrag</option>
                <option value="per_meter">Per meter</option>
                <option value="manual">Handmatig</option>
                <option value="on_request">Op aanvraag</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-navy-500">Kanaal</label>
              <select
                className="w-full rounded-lg border border-navy-200 bg-white px-3 py-2 text-sm text-navy-900"
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
              >
                <option value="all">Alle</option>
                <option value="kassa">Kassa</option>
                <option value="portal">Portal</option>
                <option value="stalling">Stalling</option>
              </select>
            </div>
          </div>
        </AdminModalBody>
        <AdminModalFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Annuleren</Button>
          <Button variant="gold" onClick={onSave} disabled={busy || !form.range_to_m || !form.price_incl_vat_euros}>
            {busy ? 'Opslaan…' : 'Opslaan'}
          </Button>
        </AdminModalFooter>
      </Modal>

      <AdminConfirmModal
        open={!!deleteTarget}
        title="Tarief verwijderen"
        message="Weet u zeker dat u dit tarief wilt verwijderen? Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijder"
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
  const { locale, t } = useIntl();
  const { push } = useToast();
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

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
                  disabled={uploadImage.loading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadImage.loading ? t('adminNew.products.ai.uploading') : t('adminNew.products.ai.upload')}
                </Button>
                <Button
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
                    const changes = (entry.changes ?? entry.new_values ?? {}) as Record<string, unknown>;
                    const oldValues = (entry.old_values ?? {}) as Record<string, unknown>;
                    const changedFields = Object.keys(changes);
                    if (changedFields.length === 0) {
                      return (
                        <AdminTableRow key={String(entry.id)}>
                          <AdminTableCell className="font-mono text-xs text-navy-500">{String(entry.action ?? entry.event ?? 'update')}</AdminTableCell>
                          <AdminTableCell>—</AdminTableCell>
                          <AdminTableCell>—</AdminTableCell>
                          <AdminTableCell className="text-xs">{String((entry.user as Record<string, unknown>)?.name ?? entry.user_id ?? '—')}</AdminTableCell>
                          <AdminTableCell className="whitespace-nowrap text-xs text-navy-500">{formatDateTime(String(entry.created_at ?? ''), dateLocale)}</AdminTableCell>
                        </AdminTableRow>
                      );
                    }
                    return changedFields.map((field, i) => (
                      <AdminTableRow key={`${String(entry.id)}-${field}`}>
                        <AdminTableCell className="font-mono text-xs">{field}</AdminTableCell>
                        <AdminTableCell className="max-w-[160px] truncate text-xs text-navy-500">{oldValues[field] == null ? '—' : String(oldValues[field])}</AdminTableCell>
                        <AdminTableCell className="max-w-[160px] truncate text-xs text-navy-900">{changes[field] == null ? '—' : String(changes[field])}</AdminTableCell>
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

      <Modal open={showAi} onClose={() => setShowAi(false)} size="md">
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
