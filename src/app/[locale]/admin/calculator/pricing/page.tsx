'use client';
import { SearchSelect } from '@/components/ui/SearchSelect';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Pencil, Plus, Settings, Trash2 } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminShell';
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
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { LoadingState, EmptyState, ErrorState } from '@/components/admin/DataState';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { pricingService, productsService } from '@/lib/services';
import type { PricingRule, Product } from '@/lib/api-types';
import { formatCurrency, intlLocale } from '@/lib/format';
import { productPriceInclEuros } from '@/lib/products';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';
import { usePermission } from '@/lib/permissions';

export default function CalculatorPricingPage() {
  const { can } = usePermission();
  const canUpdatePricing = can('pricing.update');
  const { locale, t } = useIntl();
  const priceTypeLabels: Record<string, string> = { fixed: t('globalUx.pricing.fixed'), per_meter: t('globalUx.pricing.per_meter'), on_request: t('globalUx.pricing.on_request'), manual: t('globalUx.pricing.manual') };
  const channelLabels: Record<string, string> = { all: t('globalUx.pricing.all'), kassa: t('globalUx.pricing.kassa'), portal: t('globalUx.pricing.portal'), stalling: t('globalUx.pricing.stalling') };
  const { push } = useToast();
  const searchParams = useSearchParams();
  const productFilter = searchParams.get('product') ?? undefined;
  const serviceCodeFilter = searchParams.get('service_code') ?? undefined;
  const ruleIdParam = searchParams.get('rule_id');
  const deepLinkHandled = React.useRef(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [editingRule, setEditingRule] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    product_id: '',
    range_from_cm: '0',
    range_to_cm: '900',
    price_incl_vat: '',
    vat_rate: '21',
    channel: 'all',
    price_type: 'fixed',
    active: true,
    valid_from: '',
    valid_to: '',
    duration_minutes: '0',
    included_service_codes: '',
  });
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const rules = useQuery(
    ['pricing-rules-admin', productFilter ?? '', serviceCodeFilter ?? ''],
    () =>
      pricingService.rules({
        per_page: 200,
        include_inactive: true,
        ...(productFilter ? { product: productFilter } : {}),
        ...(serviceCodeFilter && !productFilter ? { service_code: serviceCodeFilter } : {}),
      }),
  );
  const [productSearch, setProductSearch] = React.useState('');
  const [productTerm, setProductTerm] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<Product | null>(null);
  React.useEffect(() => {
    const timer = setTimeout(() => setProductTerm(productSearch.trim()), 250);
    return () => clearTimeout(timer);
  }, [productSearch]);
  const products = useQuery(['products-pricing', productTerm, productFilter ?? ''], () =>
    productsService.list({ per_page: 25, search: productTerm || productFilter }));
  const productList = React.useMemo(() => products.data?.data ?? [], [products.data]);
  const productOptions = selectedProduct && !productList.some((p) => p.id === selectedProduct.id)
    ? [selectedProduct, ...productList] : productList;
  const activeFilterLabel = productFilter ?? serviceCodeFilter;

  React.useEffect(() => {
    if (!productFilter || form.product_id || editingRule) return;
    const match = productList.find(
      (p) => p.code?.toLowerCase() === productFilter.toLowerCase(),
    );
    if (match) { setSelectedProduct(match); setForm((prev) => ({ ...prev, product_id: match.id })); }
  }, [productFilter, productList, form.product_id, editingRule]);
  const createRule = useMutation(pricingService.createRule);
  const updateRule = useMutation(
    ({ id, ...payload }: Record<string, unknown> & { id: string }) =>
      pricingService.updateRule(id, payload),
  );
  const deleteRule = useMutation(pricingService.deleteRule);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdatePricing) return;
    try {
      const vatRate = Number(form.vat_rate);
      const price = Math.round(Number(form.price_incl_vat) * 100);
      const payload = {
        range_from_cm: Number(form.range_from_cm),
        range_to_cm: Number(form.range_to_cm),
        price_excl_vat: Math.round(price / (1 + vatRate / 100)),
        price_incl_vat: price,
        vat_rate: vatRate,
        price_type: form.price_type,
        channel: form.channel,
        active: form.active,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        duration_minutes: Number(form.duration_minutes),
        included_service_codes: form.included_service_codes.split(',').map((code) => code.trim()).filter(Boolean),
      };
      if (editingRule) {
        await updateRule.mutate({ id: editingRule, ...payload });
      } else {
        await createRule.mutate({ product_id: form.product_id, ...payload });
      }
      setShowCreate(false);
      setEditingRule(null);
      await rules.refetch();
      push({ tone: 'success', title: t('adminNew.calculator.pricing.saved') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const openEdit = (rule: PricingRule) => {
    if (!canUpdatePricing) return;
    setEditingRule(rule.id);
    setForm({
      product_id: rule.product_id,
      range_from_cm: String(rule.range_from_cm),
      range_to_cm: String(rule.range_to_cm),
      price_incl_vat: (rule.price_incl_vat / 100).toFixed(2),
      vat_rate: String(rule.vat_rate ?? 21),
      channel: rule.channel ?? 'all',
      price_type: rule.price_type ?? 'fixed',
      active: rule.active,
      valid_from: rule.valid_from ?? '',
      valid_to: rule.valid_to ?? '',
      duration_minutes: String(rule.duration_minutes ?? 0),
      included_service_codes: (rule.included_service_codes ?? []).join(', '),
    });
    setShowCreate(true);
  };

  const onDelete = async (id: string) => {
    if (!canUpdatePricing) return;
    try {
      await deleteRule.mutate(id);
      await rules.refetch();
      push({ tone: 'success', title: t('adminNew.calculator.pricing.deleted') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const rows = React.useMemo(() => rules.data?.data ?? [], [rules.data]);

  React.useEffect(() => {
    if (!canUpdatePricing || deepLinkHandled.current || !ruleIdParam || rules.loading || rows.length === 0) return;
    const rule = rows.find((item) => item.id === ruleIdParam);
    if (!rule) return;
    deepLinkHandled.current = true;
    setEditingRule(rule.id);
    setForm({
      product_id: rule.product_id,
      range_from_cm: String(rule.range_from_cm),
      range_to_cm: String(rule.range_to_cm),
      price_incl_vat: (rule.price_incl_vat / 100).toFixed(2),
      vat_rate: String(rule.vat_rate ?? 21),
      channel: rule.channel ?? 'all',
      price_type: rule.price_type ?? 'fixed',
      active: rule.active,
      valid_from: rule.valid_from ?? '',
      valid_to: rule.valid_to ?? '',
      duration_minutes: String(rule.duration_minutes ?? 0),
      included_service_codes: (rule.included_service_codes ?? []).join(', '),
    });
    setShowCreate(true);
  }, [canUpdatePricing, ruleIdParam, rules.loading, rows]);

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.calculator.pricing.title')}
        subtitle={t('adminNew.calculator.pricing.subtitle')}
        rightSlot={
          <div className="flex gap-2">
            <Link href={`/${locale}/admin/calculator`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                {t('adminNew.common.back')}
              </Button>
            </Link>
            {canUpdatePricing ? <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => { setEditingRule(null); setShowCreate(true); }}>
              {t('adminNew.common.new')}
            </Button> : null}
          </div>
        }
      />
      <AdminContent>
        {activeFilterLabel ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-navy-100 bg-sand-50 px-3 py-2 text-sm text-navy-700">
            <span>
              {t('adminNew.calculator.pricing.filtered')}:{' '}
              <span className="font-semibold">{activeFilterLabel}</span>
            </span>
            <Link
              href={`/${locale}/admin/calculator/pricing`}
              className="text-xs font-semibold text-navy-500 underline-offset-2 hover:text-navy-800 hover:underline"
            >
              {t('adminNew.calculator.pricing.clearFilter')}
            </Link>
          </div>
        ) : null}
        <AdminSectionCard title={t('adminNew.calculator.pricing.title')} icon={Settings}>
          {rules.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!rules.loading && rules.error ? (
            <ErrorState message={rules.error} onRetry={() => void rules.refetch()} />
          ) : null}
          {!rules.loading && !rules.error && rows.length === 0 ? (
            <EmptyState title={t('adminNew.states.emptyTitle')} message={t('adminNew.calculator.pricing.empty')} />
          ) : null}
          {!rules.loading && !rules.error && rows.length > 0 ? (
            <AdminTableCard>
              <AdminTable minWidth={800}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('globalUx.pricing.product')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.range')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.price')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.vat')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.type')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.channel')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('globalUx.pricing.active')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((rule) => (
                    <AdminTableRow key={rule.id}>
                      <AdminTableCell>
                        <span className="text-sm font-medium text-navy-800">{rule.product_name ?? rule.service_code ?? rule.product_id}</span>
                        {rule.service_code ? <span className="ml-1 text-xs text-navy-400">({rule.service_code})</span> : null}
                        {rule.valid_from || rule.valid_to ? <div className="text-xs text-navy-500">{rule.valid_from ?? '…'} – {rule.valid_to ?? '…'}</div> : null}
                        {rule.included_service_codes?.length ? <div className="text-xs text-navy-500">Inbegrepen: {rule.included_service_codes.join(', ')}</div> : null}
                      </AdminTableCell>
                      <AdminTableCell className="tabular-nums">{rule.range_from_cm} – {rule.range_to_cm} cm</AdminTableCell>
                      <AdminTableCell>{formatCurrency(productPriceInclEuros(rule), intlLocale(locale))}</AdminTableCell>
                      <AdminTableCell className="tabular-nums text-sm text-navy-600">
                        {rule.vat_rate != null ? `${rule.vat_rate}%` : '—'}
                      </AdminTableCell>
                      <AdminTableCell><span className="text-xs text-navy-500">{rule.price_type ? (priceTypeLabels[rule.price_type] ?? rule.price_type) : '—'}</span></AdminTableCell>
                      <AdminTableCell><span className="text-xs text-navy-500">{(channelLabels[rule.channel ?? 'all'] ?? rule.channel)}</span></AdminTableCell>
                      <AdminTableCell>
                        <span className={`text-xs font-semibold ${rule.active ? 'text-emerald-600' : 'text-navy-300'}`}>
                          {t(rule.active ? 'globalUx.pricing.yes' : 'globalUx.pricing.no')}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        {canUpdatePricing ? <>
                        <button
                          type="button"
                          className="mr-3 text-navy-500 hover:text-navy-800"
                          onClick={() => openEdit(rule)}
                          aria-label={t('adminNew.common.edit')}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={t('adminNew.common.delete')} className="text-rose-600 hover:text-rose-800"
                          onClick={() => setDeleteTarget(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        </> : null}
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal
        open={canUpdatePricing && showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditingRule(null);
        }}
        size="md"
      >
        <form onSubmit={onCreate}>
          <AdminModalHeader title={editingRule ? t('adminNew.common.edit') : t('adminNew.calculator.pricing.newRule')} />
          <AdminModalBody>
            <div className="space-y-3">
              {!editingRule ? <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">{t('globalUx.pricing.product')} *</label>
                <SearchSelect aria-label={t('globalUx.pricing.product')} className="input-base w-full" value={form.product_id}
                  onSearchChange={setProductSearch} loading={products.loading || productSearch.trim() !== productTerm}
                  error={products.error ? t('globalUx.searchFailed') : null}
                  onChange={(e) => { setSelectedProduct(productOptions.find((p) => p.id === e.target.value) ?? null); setForm({ ...form, product_id: e.target.value }); }} required>
                  <option value="">{t('adminNew.calculator.pricing.selectProduct')}</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                  ))}
                </SearchSelect>
              </div> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={t('globalUx.pricing.from')} value={form.range_from_cm} onChange={(e) => setForm({ ...form, range_from_cm: e.target.value })} type="number" min={0} required />
                <Input label={t('globalUx.pricing.to')} value={form.range_to_cm} onChange={(e) => setForm({ ...form, range_to_cm: e.target.value })} type="number" min={1} required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label={t('globalUx.pricing.priceEuro')} value={form.price_incl_vat} onChange={(e) => setForm({ ...form, price_incl_vat: e.target.value })} type="number" step="0.01" required />
                <Input label={t('globalUx.pricing.vatRate')} value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} type="number" step="1" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">{t('globalUx.pricing.type')}</label>
                  <SearchSelect aria-label={t('globalUx.pricing.type')} className="input-base w-full" value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value })}>
                    <option value="fixed">{t('globalUx.pricing.fixed')}</option>
                    <option value="per_meter">{t('globalUx.pricing.per_meter')}</option>
                    <option value="on_request">{t('globalUx.pricing.on_request')}</option>
                    <option value="manual">{t('globalUx.pricing.manual')}</option>
                  </SearchSelect>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">{t('globalUx.pricing.channel')}</label>
                  <SearchSelect aria-label={t('globalUx.pricing.channel')} className="input-base w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="all">{t('globalUx.pricing.all')}</option>
                    <option value="kassa">{t('globalUx.pricing.kassa')}</option>
                    <option value="portal">{t('globalUx.pricing.portal')}</option>
                    <option value="stalling">{t('globalUx.pricing.stalling')}</option>
                  </SearchSelect>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Geldig vanaf" type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                <Input label="Geldig tot en met" type="date" min={form.valid_from || undefined} value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} />
              </div>
              <Input label="Duur compleet pakket / dienst (minuten)" type="number" min={0} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
              <Input label="Inbegrepen dienstcodes (komma gescheiden)" value={form.included_service_codes} onChange={(e) => setForm({ ...form, included_service_codes: e.target.value })} placeholder="kranen, afspuiten" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t('globalUx.pricing.active')}
              </label>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold" disabled={createRule.loading || updateRule.loading}>{t('adminNew.common.save')}</Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={canUpdatePricing && !!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return;
          await onDelete(deleteTarget);
          setDeleteTarget(null);
        }}
        title={t('adminNew.common.delete')}
        message={t('adminNew.calculator.pricing.confirmDelete')}
        confirmLabel={t('adminNew.common.delete')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={Trash2}
        loading={deleteRule.loading}
      />
    </>
  );
}
