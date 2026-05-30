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
  });
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  const rules = useQuery(['pricing-rules-admin'], () => pricingService.rules({ per_page: 200 }));
  const products = useQuery(['products-pricing'], () => productsService.list({ per_page: 200 }));
  const createRule = useMutation(pricingService.createRule);
  const deleteRule = useMutation(pricingService.deleteRule);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const price = Math.round(Number(form.price_incl_vat) * 100);
      await createRule.mutate({
        product_id: form.product_id,
        range_from_cm: Number(form.range_from_cm),
        range_to_cm: Number(form.range_to_cm),
        price_excl_vat: Math.round(price / 1.21),
        price_incl_vat: price,
        price_type: 'fixed',
        channel: 'all',
        active: true,
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
                    <AdminTableHeaderCell>&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((rule) => (
                    <AdminTableRow key={rule.id}>
                      <AdminTableCell>{rule.service_code ?? rule.product_id}</AdminTableCell>
                      <AdminTableCell>{rule.range_from_cm} – {rule.range_to_cm}</AdminTableCell>
                      <AdminTableCell>{formatCurrency(rule.price_incl_vat_euros, 'nl-NL')}</AdminTableCell>
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
            <select className="input-base w-full" value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} required>
              <option value="">{t('adminNew.calculator.pricing.selectProduct')}</option>
              {(products.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <Input label="Van (cm)" value={form.range_from_cm} onChange={(e) => setForm({ ...form, range_from_cm: e.target.value })} type="number" />
            <Input label="Tot (cm)" value={form.range_to_cm} onChange={(e) => setForm({ ...form, range_to_cm: e.target.value })} type="number" />
            <Input label="Prijs incl. BTW (€)" value={form.price_incl_vat} onChange={(e) => setForm({ ...form, price_incl_vat: e.target.value })} type="number" step="0.01" required />
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
