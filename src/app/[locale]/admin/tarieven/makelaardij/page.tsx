'use client';

import * as React from 'react';
import { Coins, Plus, XCircle } from 'lucide-react';
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
import { pricingService, type BrokerageTariff } from '@/lib/services';
import { useMutation, useQuery } from '@/lib/hooks/useAsync';
import { formatCurrency } from '@/lib/format';
import { useIntl } from '@/i18n/IntlProvider';
import { useToast } from '@/components/ui/ToastProvider';
import { getApiErrorMessage } from '@/lib/api-error';

const emptyForm = { min_length_cm: '', max_length_cm: '', price_per_month: '', active_from: '', notes: '' };

export default function BrokerageTariffsPage() {
  const { locale, t } = useIntl();
  const { push } = useToast();
  const dateLocale = locale === 'en' ? 'en-GB' : locale === 'de' ? 'de-DE' : 'nl-NL';

  const [showForm, setShowForm] = React.useState(false);
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(emptyForm);
  const [deactivateTarget, setDeactivateTarget] = React.useState<string | null>(null);

  const tariffs = useQuery(['brokerage-tariffs'], () => pricingService.brokerageTariffs());
  const createT = useMutation((p: Record<string, unknown>) => pricingService.createBrokerageTariff(p));
  const updateT = useMutation((a: { id: string; data: Record<string, unknown> }) =>
    pricingService.updateBrokerageTariff(a.id, a.data)
  );
  const deactivateT = useMutation((id: string) => pricingService.deactivateBrokerageTariff(id));

  const rows = (tariffs.data ?? []) as BrokerageTariff[];

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm);
    setShowForm(true);
  };
  const openEdit = (tf: BrokerageTariff) => {
    setEditId(tf.id);
    setForm({
      min_length_cm: String(tf.min_length_cm ?? ''),
      max_length_cm: String(tf.max_length_cm ?? ''),
      price_per_month: tf.price_per_month != null ? (tf.price_per_month / 100).toFixed(2) : '',
      active_from: tf.active_from ? String(tf.active_from).slice(0, 10) : '',
      notes: tf.notes ?? '',
    });
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      min_length_cm: Number(form.min_length_cm),
      max_length_cm: Number(form.max_length_cm),
      price_per_month: Math.round(parseFloat(form.price_per_month.replace(',', '.') || '0') * 100),
      active_from: form.active_from || undefined,
      notes: form.notes || undefined,
    };
    try {
      if (editId) {
        await updateT.mutate({ id: editId, data: payload });
        push({ tone: 'success', title: t('adminNew.brokerage.toasts.updated') });
      } else {
        await createT.mutate(payload);
        push({ tone: 'success', title: t('adminNew.brokerage.toasts.created') });
      }
      setShowForm(false);
      await tariffs.refetch();
    } catch (err) {
      push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t('adminNew.brokerage.title')}
        subtitle={t('adminNew.brokerage.subtitle')}
        rightSlot={
          <Button variant="gold" size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={openNew}>
            {t('adminNew.brokerage.new')}
          </Button>
        }
      />
      <AdminContent>
        <AdminSectionCard
          title={t('adminNew.brokerage.title')}
          description={t('adminNew.brokerage.intro')}
          icon={Coins}
        >
          <AdminTableCard>
            {tariffs.loading ? (
              <LoadingState label={t('adminNew.common.loading')} variant="table" />
            ) : tariffs.error ? (
              <ErrorState message={tariffs.error} onRetry={() => void tariffs.refetch()} />
            ) : rows.length === 0 ? (
              <EmptyState
                title={t('adminNew.brokerage.emptyTitle')}
                message={t('adminNew.brokerage.emptyMessage')}
              />
            ) : (
              <AdminTable minWidth={680}>
                <AdminTableHead>
                  <tr>
                    <AdminTableHeaderCell>{t('adminNew.brokerage.columns.range')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.brokerage.columns.perMonth')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.brokerage.columns.activeFrom')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell>{t('adminNew.brokerage.columns.status')}</AdminTableHeaderCell>
                    <AdminTableHeaderCell className="text-right">&nbsp;</AdminTableHeaderCell>
                  </tr>
                </AdminTableHead>
                <tbody>
                  {rows.map((tf) => (
                    <AdminTableRow key={tf.id}>
                      <AdminTableCell className="font-semibold text-navy-900">
                        {tf.range_label ?? `${tf.min_length_cm}–${tf.max_length_cm} cm`}
                      </AdminTableCell>
                      <AdminTableCell className="font-semibold">
                        {formatCurrency(
                          tf.price_per_month_euros ?? tf.price_per_month / 100,
                          dateLocale
                        )}
                      </AdminTableCell>
                      <AdminTableCell className="text-sm text-navy-600">
                        {tf.active_from ? String(tf.active_from).slice(0, 10) : '—'}
                      </AdminTableCell>
                      <AdminTableCell>
                        <Badge tone={tf.active === false ? 'neutral' : 'success'}>
                          {tf.active === false
                            ? t('adminNew.brokerage.inactive')
                            : t('adminNew.brokerage.active')}
                        </Badge>
                      </AdminTableCell>
                      <AdminTableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(tf)}>
                            {t('adminNew.common.edit')}
                          </Button>
                          {tf.active !== false ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              leftIcon={<XCircle className="h-3.5 w-3.5" />}
                              onClick={() => setDeactivateTarget(tf.id)}
                            >
                              {t('adminNew.brokerage.deactivate')}
                            </Button>
                          ) : null}
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
            title={editId ? t('adminNew.brokerage.editTitle') : t('adminNew.brokerage.new')}
            subtitle={t('adminNew.brokerage.formSubtitle')}
          />
          <AdminModalBody>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label={t('adminNew.brokerage.fields.minLength')}
                type="number"
                value={form.min_length_cm}
                onChange={(e) => setForm({ ...form, min_length_cm: e.target.value })}
                required
              />
              <Input
                label={t('adminNew.brokerage.fields.maxLength')}
                type="number"
                value={form.max_length_cm}
                onChange={(e) => setForm({ ...form, max_length_cm: e.target.value })}
                required
              />
            </div>
            <Input
              label={t('adminNew.brokerage.fields.perMonth')}
              type="number"
              step="0.01"
              value={form.price_per_month}
              onChange={(e) => setForm({ ...form, price_per_month: e.target.value })}
              leftIcon={<span className="text-navy-400">€</span>}
              required
            />
            <Input
              label={t('adminNew.brokerage.fields.activeFrom')}
              type="date"
              value={form.active_from}
              onChange={(e) => setForm({ ...form, active_from: e.target.value })}
            />
            <Input
              label={t('adminNew.brokerage.fields.notes')}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </AdminModalBody>
          <AdminModalFooter>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
              {t('adminNew.common.cancel')}
            </Button>
            <Button type="submit" variant="gold" disabled={createT.loading || updateT.loading}>
              {t('adminNew.common.save')}
            </Button>
          </AdminModalFooter>
        </form>
      </Modal>

      <AdminConfirmModal
        open={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={async () => {
          if (!deactivateTarget) return;
          try {
            await deactivateT.mutate(deactivateTarget);
            push({ tone: 'success', title: t('adminNew.brokerage.toasts.deactivated') });
            await tariffs.refetch();
          } catch (err) {
            push({ tone: 'error', title: t('adminNew.common.operationFailed'), message: getApiErrorMessage(err) });
          }
          setDeactivateTarget(null);
        }}
        title={t('adminNew.brokerage.deactivate')}
        message={t('adminNew.brokerage.confirmDeactivate')}
        confirmLabel={t('adminNew.brokerage.deactivate')}
        cancelLabel={t('adminNew.common.cancel')}
        variant="danger"
        icon={XCircle}
        loading={deactivateT.loading}
      />
    </>
  );
}
