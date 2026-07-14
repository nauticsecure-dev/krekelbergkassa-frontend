'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Settings, Trash2 } from 'lucide-react';
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
import { LoadingState, EmptyState } from '@/components/admin/DataState';
import { AdminConfirmModal } from '@/components/admin/AdminConfirmModal';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { pricingService, productsService } from '@/lib/services';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

export default function CalculatorPricingPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const [showCreate, setShowCreate] = React.useState(false);
  const [form, setForm] = React.useState({
    product_id: '',
    range_from_cm: '0',
    range_to_cm: '900',
    price_incl_vat: '',
    vat_rate: '21',
    channel: 'all',
    price_type: 'fixed',
    active: true,
  });
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const rules = useQuery(['pricing-rules-admin'], () => pricingService.rules({ per_page: 200 }));
  const products = useQuery(['products-pricing'], () => productsService.list({ per_page: 200 }));
  const createRule = useMutation(pricingService.createRule);
  const deleteRule = useMutation(pricingService.deleteRule);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vatRate = Number(form.vat_rate) || 21;
      const price = Math.round(Number(form.price_incl_vat) * 100);
      await createRule.mutate({
        product_id: form.product_id,
        range_from_cm: Number(form.range_from_cm),
        range_to_cm: Number(form.range_to_cm),
        price_excl_vat: Math.round(price / (1 + vatRate / 100)),
        price_incl_vat: price,
        vat_rate: vatRate,
        price_type: form.price_type,
        channel: form.channel,
        active: form.active,
      });
      setShowCreate(false);
      await rules.refetch();
      push({ tone: 'success', title: t('adminNew.calculator.pricing.saved') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteRule.mutate(id);
      await rules.refetch();
      push({ tone: 'success', title: t('adminNew.calculator.pricing.deleted') });
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  const rows = rules.data?.data ?? [];

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
            <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              {t('adminNew.common.new')}
            </Button>
          </div>
        }
      />
      <AdminContent>
        <AdminSectionCard title={t('adminNew.calculator.pricing.title')} icon={Settings}>
          {rules.loading ? <LoadingState label={t('adminNew.common.loading')} variant="table" /> : null}
          {!rules.loading && rows.length === 0 ? (
            <EmptyState title={t('adminNew.states.emptyTitle')} message={t('adminNew.calculator.pricing.empty')} />
          ) : null}
          {!rules.loading && rows.length > 0 ? (
            <AdminTableCard>
              <AdminTable minWidth={800}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>Product</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Range (cm)</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Prijs incl. BTW</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Type</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Kanaal</AdminTableHeaderCell>
                    <AdminTableHeaderCell>Actief</AdminTableHeaderCell>
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((rule) => (
                    <AdminTableRow key={rule.id}>
                      <AdminTableCell>
                        <span className="text-sm font-medium text-navy-800">{rule.product_name ?? rule.service_code ?? rule.product_id}</span>
                        {rule.service_code ? <span className="ml-1 text-xs text-navy-400">({rule.service_code})</span> : null}
                      </AdminTableCell>
                      <AdminTableCell className="tabular-nums">{rule.range_from_cm} – {rule.range_to_cm} cm</AdminTableCell>
                      <AdminTableCell>{formatCurrency(rule.price_incl_vat_euros, 'nl-NL')}</AdminTableCell>
                      <AdminTableCell><span className="text-xs text-navy-500">{rule.price_type ?? '—'}</span></AdminTableCell>
                      <AdminTableCell><span className="text-xs text-navy-500">{rule.channel ?? 'all'}</span></AdminTableCell>
                      <AdminTableCell>
                        <span className={`text-xs font-semibold ${rule.active ? 'text-emerald-600' : 'text-navy-300'}`}>
                          {rule.active ? 'Ja' : 'Nee'}
                        </span>
                      </AdminTableCell>
                      <AdminTableCell className="text-right">
                        <button
                          type="button"
                          className="text-rose-600 hover:text-rose-800"
                          onClick={() => setDeleteTarget(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </AdminTableCell>
                    </AdminTableRow>
                  ))}
                </tbody>
              </AdminTable>
            </AdminTableCard>
          ) : null}
        </AdminSectionCard>
      </AdminContent>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} size="md">
        <form onSubmit={onCreate}>
          <AdminModalHeader title={t('adminNew.calculator.pricing.newRule')} />
          <AdminModalBody>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Product *</label>
                <select className="input-base w-full" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
                  <option value="">{t('adminNew.calculator.pricing.selectProduct')}</option>
                  {(products.data?.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} {p.code ? `(${p.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Van (cm)" value={form.range_from_cm} onChange={(e) => setForm({ ...form, range_from_cm: e.target.value })} type="number" />
                <Input label="Tot (cm)" value={form.range_to_cm} onChange={(e) => setForm({ ...form, range_to_cm: e.target.value })} type="number" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Prijs incl. BTW (€)" value={form.price_incl_vat} onChange={(e) => setForm({ ...form, price_incl_vat: e.target.value })} type="number" step="0.01" required />
                <Input label="BTW-tarief (%)" value={form.vat_rate} onChange={(e) => setForm({ ...form, vat_rate: e.target.value })} type="number" step="1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Type</label>
                  <select className="input-base w-full" value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value })}>
                    <option value="fixed">Vast bedrag</option>
                    <option value="per_meter">Per meter</option>
                    <option value="on_request">Op aanvraag</option>
                    <option value="manual">Handmatig</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-navy-400">Kanaal</label>
                  <select className="input-base w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="all">Alle kanalen</option>
                    <option value="kassa">Kassa</option>
                    <option value="public">Website</option>
                    <option value="portal">Klantportaal</option>
                    <option value="stalling">Stalling</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                Actief
              </label>
            </div>
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t('adminNew.common.cancel')}</Button>
            <Button type="submit" variant="gold">{t('adminNew.common.save')}</Button>
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
